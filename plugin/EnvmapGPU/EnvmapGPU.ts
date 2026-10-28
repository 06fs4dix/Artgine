import { CCanvas, CCanvasPlugin } from "../../artgine/app/canvas/CCanvas.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CMeshDrawNode } from "../../artgine/render/CMeshDrawNode.js";
import { CRenderer } from "../../artgine/render/CRenderer.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShader, CShaderList } from "../../artgine/render/CShader.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CPlugin } from "../../artgine/util/CPlugin.js";
import { SDF } from "../../artgine/z_file/SDF.js";

/**
 * 환경맵 블러를 GPU 셰이더로 처리하는 플러그인 (three.js PMREMGenerator 방식).
 * canvas.PushPlugin 으로 받았을 때만 그 캔버스 프레임 렌더러의 BlurEnvmap 이 GPU 버전으로 교체되고, Destroy 하면 원복된다.
 * 셰이더 로딩이 끝나기 전에는 원래 BlurEnvmap 으로 처리한다.
 * LOD0 에서 시작해 LOD i-1 을 위도/경도 2패스 가우시안으로 LOD i 에 순차 블러한다.
 */
export class CCanvasPluginEnvmapGPU extends CCanvasPlugin
{
	private static readonly sTmpKey = "EnvmapGPU/tmp.tex";
	private static readonly sTag = ["envblur"];
	private static readonly sMaxTaps = 12;
	private static readonly sMinBlurSize = 4;
	private static readonly sAxes = (() => {
		const phi = (1 + Math.sqrt(5)) / 2;
		const inv = 1 / phi;
		return [new CVec3(-phi, inv, 0), new CVec3(phi, inv, 0), new CVec3(-inv, 0, phi), new CVec3(inv, 0, phi), new CVec3(0, phi, -inv),
			new CVec3(0, phi, inv), new CVec3(-1, 1, -1), new CVec3(1, 1, -1), new CVec3(-1, 1, 1), new CVec3(1, 1, 1)];
	})();

	private mRen : CRenderer = null;
	private mOrg : CRenderer["BlurEnvmap"] = null;
	private mShaderKey = "";
	private mMesh : CMeshDrawNode = null;
	private mRP : CRenderPass = null;

	override SetCanvas(_canvas : CCanvas)
	{
		super.SetCanvas(_canvas);
		const fw = _canvas.GetFrame();
		this.mShaderKey = CPlugin.FindPath("EnvmapGPU") + "EnvmapGPUShader.ts";
		fw.Load().Exe(this.mShaderKey);

		this.mRen = fw.Ren();
		const org = this.mOrg = this.mRen.BlurEnvmap;
		this.mRen.BlurEnvmap = (_texKey : string, _updatedLayers : Set<number>) => {
			if(this.Blur(_texKey, _updatedLayers) == false)
				org.call(this.mRen, _texKey, _updatedLayers);
		};
	}
	override Destroy()
	{
		super.Destroy();
		if(this.mRen != null)
		{
			this.mRen.BlurEnvmap = this.mOrg;
			this.mRen = null;
		}
	}

	private Sigma(_lod : number, _size : number, _roughLods : number)
	{
		if(_lod == 0)
			return 0;
		const t = Math.min(1, _lod / _roughLods);
		return CMath.FloatInterpolate(1 / (_size >> _lod), t * 0.582, t);
	}

	/** 처리하지 못하면 false (원래 BlurEnvmap 으로 넘어간다) */
	private Blur(_texKey : string, _updatedLayers : Set<number>) : boolean
	{
		const ren = this.mRen;
		const fw = this.mCanvas.GetFrame();
		const tex = ren.mRes.Find(_texKey) as CTexture;
		const list = ren.mRes.Find(this.mShaderKey) as CShaderList;
		if(tex == null || list == null || tex.GetGBuf().length == 0)
			return false;
		const shader = list.GetShader(CCanvasPluginEnvmapGPU.sTag) as CShader;
		if(shader == null)
			return false;

		const info = tex.GetInfo()[0];
		const size = tex.GetWidth();
		const lodMax = Math.floor(Math.log2(size));
		const lodCount = lodMax + 1;
		if(lodCount < 2 || _updatedLayers.size == 0)
			return true;

		const cubeLayers : number[] = [];
		for(let layer = 0; layer + 6 <= info.mCount; layer += 6)
		{
			for(let face = 0; face < 6; face++)
			{
				if(_updatedLayers.has(layer + face))
				{
					cubeLayers.push(layer);
					break;
				}
			}
		}
		if(cubeLayers.length == 0)
			return true;

		//LOD 마다 한 레벨짜리 임시 RT 를 따로 둔다. 밉 레벨이 있는 RT 는 첫 바인드 전엔 LOD1 이상이 없어 Begin 이 실패한다
		const tmps : CTexture[] = [];
		for(let lod = 1; lod < lodCount; lod++)
		{
			const key = CCanvasPluginEnvmapGPU.sTmpKey + lod;
			let tmp = ren.mRes.Find(key) as CTexture;
			if(tmp != null && (tmp.GetWidth() != (size >> lod) || tmp.GetInfo()[0].mFormat != info.mFormat))
			{
				ren.ReleaseTexture(tmp);
				ren.mRes.Remove(key);
				tmp = null;
			}
			if(tmp == null)
			{
				ren.BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array, info.mFormat, 6)], new CVec2(size >> lod, size >> lod), key);
				tmp = ren.mRes.Find(key) as CTexture;
				tmp.SetAutoResize(false);
				tmp.SetFilter(CTexture.eFilter.Linear);
			}
			tmps[lod] = tmp;
		}
		//BuildRenderTarget 직후엔 GPU 텍스처가 아직 없어 Begin 이 실패한다. 준비될 때까지 원래 BlurEnvmap 으로 처리
		for(let lod = 1; lod < lodCount; lod++)
		{
			if(tmps[lod].GetGBuf().length == 0)
				return false;
		}
		if(this.mMesh == null)
		{
			this.mMesh = new CMeshDrawNode();
			ren.BuildMeshDrawNodeAutoFix(this.mMesh, shader, fw.Pal().MCI2D());
			this.mRP = new CRenderPass(this.mShaderKey);
			this.mRP.mDepthTest = false;
			this.mRP.mDepthWrite = false;
			this.mRP.mAlpha = false;
		}

		const pf = fw.PF();
		const roughLods = Math.max(1, lodMax - 4);
		let ok = true;
		const Pass = (_srcKey : string, _srcLayer : number, _srcLod : number, _srcSize : number, _dstTex : CTexture, _dstLayer : number, _dstLod : number, _dstSize : number,
			_sigma : number, _pole : CVec3, _lat : boolean, _copy : boolean) => {
			const radPerPx = Math.PI / (2 * Math.max(1, _srcSize - 1));
			const sigmaPx = _copy ? 1 : Math.max(_sigma / radPerPx, 0.0001);
			const stride = _copy ? 1 : Math.max(1, Math.ceil(3 * sigmaPx / (CCanvasPluginEnvmapGPU.sMaxTaps - 1)));
			const count = _copy ? 1 : 1 + Math.floor(3 * sigmaPx / stride);

			if(ren.UseShader(shader))
			{
				ok = false;
				return;
			}
			ren.SendGPU(shader, [fw.Pal().GetNoneTex()] as any);
			const before = ren.mDev.ChangeRenderPass(this.mRP);
			ren.mDev.SetClearColor(false);
			ren.mDev.SetClearDepth(false);
			ren.SendGPU(shader, new CShaderAttr(SDF.eTexSlot.ArrEnvmap, _srcKey));
			ren.SendGPU(shader, _dstSize, "ebSize");
			ren.SendGPU(shader, _srcLayer, "ebLayer");
			ren.SendGPU(shader, _srcLod, "ebSrcLod");
			ren.SendGPU(shader, count, "ebCount");
			ren.SendGPU(shader, radPerPx, "ebRadPerPx");
			ren.SendGPU(shader, sigmaPx, "ebSigmaPx");
			ren.SendGPU(shader, stride, "ebStride");
			ren.SendGPU(shader, _lat ? 1 : 0, "ebLat");
			ren.SendGPU(shader, _pole, "ebPole");
			for(let face = 0; face < 6; face++)
			{
				const rtUse = new Set<number>([_dstLayer + face]);
				ren.mDev.ViewPort(0, 0, _dstSize, _dstSize);
				if(ren.Begin(_dstTex, false, rtUse, _dstLod))
				{
					ok = false;
					continue;
				}
				ren.SendGPU(shader, face, "ebFace");
				ren.MeshDrawNodeRender(shader, this.mMesh);
				ren.End(_dstTex, rtUse, _dstLod);
			}
			ren.TexBindReset();
			ren.mDev.ChangeRenderPass(before);
			ren.mDev.ViewPort(0, 0, pf.mWidth, pf.mHeight);
		};

		const axes = CCanvasPluginEnvmapGPU.sAxes;
		for(const layer of cubeLayers)
		{
			for(let lod = 1; lod < lodCount; lod++)
			{
				const sigma = Math.sqrt(Math.max(0, this.Sigma(lod, size, roughLods) ** 2 - this.Sigma(lod - 1, size, roughLods) ** 2));
				const pole = axes[(lodCount - lod - 1) % axes.length];
				const copy = (size >> lod) <= CCanvasPluginEnvmapGPU.sMinBlurSize;
				Pass(_texKey, layer, lod - 1, size >> (lod - 1), tmps[lod], 0, 0, size >> lod, sigma, pole, true, copy);
				Pass(CCanvasPluginEnvmapGPU.sTmpKey + lod, 0, 0, size >> lod, tex, layer, lod, size >> lod, sigma, pole, false, copy);
			}
		}
		return ok;
	}
}
CClass.Push(CCanvasPluginEnvmapGPU);
