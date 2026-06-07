

import {CMeshCreateInfo} from "../render/CMeshCreateInfo.js"
import {CVec4} from "../geometry/CVec4.js"
import {CPath} from "../basic/CPath.js"
import {CTexture,  CTextureInfo } from "../render/CTexture.js"
import {CVec2} from "../geometry/CVec2.js"
import {CH5Canvas} from "../render/CH5Canvas.js"
import { CShaderList } from "../render/CShader.js"
import { CFrame } from "./CFrame.js"
import { CUtilRender } from "../render/CUtilRender.js"
import { CUtil } from "../basic/CUtil.js"
import { CLoaderOption } from "./CLoader.js"
import { CVec3 } from "../geometry/CVec3.js"
import { CImgPro } from "../render/CImgPro.js"
import { SDF } from "../z_file/SDF.js"
import { CDevice } from "../render/CDevice.js"
import { CConsol } from "../basic/CConsol.js"
import { CString } from "../basic/CString.js"

var gNoneImg="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";

var gSl2DKey;
var	gSl3DKey;
var	gSlPostKey;
var	gSlCubeKey;
var	gSlVoxelKey;
var	gSlTerrainKey;
var gNoneTex;


var gLUT=[];
var gNoise=[];
export class CPalette
{
	public mMCI2D=new CMeshCreateInfo();
	public mTerrain=new CMeshCreateInfo();

	public mSL3D : CShaderList=null;
	public mSL2D : CShaderList=null;
	public mSLPost : CShaderList=null;
	public mSLCube : CShaderList=null;
	public mSLVoxel : CShaderList=null;
	public mSLTerrain : CShaderList=null;

	constructor()
	{

	}

	async Load(_fw : CFrame)
	{
		if(_fw.Ren()==null)	return;
		
		let upFolder=CPath.WebRootArtgineUrl();
		if(_fw.PF().mGitHub)
			upFolder="https://06fs4dix.github.io/Artgine/";
		gNoneTex="Artgine/none.png"//upFolder+"artgine/z_file/none.png";
		await _fw.Load().LoadSwitch(gNoneTex,CUtil.Base64ToArray(gNoneImg),new CLoaderOption());

		// gSl2DKey=upFolder+"artgine/z_file/2D.ts";
		// gSl3DKey=upFolder+"artgine/z_file/3D.ts";
		// gSlPostKey=upFolder+"artgine/z_file/Post.ts";
		// gSlCubeKey=upFolder+"artgine/z_file/Cube.ts";
		// gSlVoxelKey=upFolder+"artgine/z_file/Voxel.ts";
		// gSlTerrainKey=upFolder+"artgine/z_file/Terrain.ts";

		let Sl2DKey=upFolder+"artgine/z_file/2D.ts";
		let Sl3DKey=upFolder+"artgine/z_file/3D.ts";
		let SlPostKey=upFolder+"artgine/z_file/Post.ts";
		let SlCubeKey=upFolder+"artgine/z_file/Cube.ts";
		let SlVoxelKey=upFolder+"artgine/z_file/Voxel.ts";
		let SlTerrainKey=upFolder+"artgine/z_file/Terrain.ts";

		gSl2DKey="Artgine/2D.sl";
		gSl3DKey="Artgine/3D.sl";
		gSlPostKey="Artgine/Post.sl";
		gSlCubeKey="Artgine/Cube.sl";
		gSlVoxelKey="Artgine/Voxel.sl";
		gSlTerrainKey="Artgine/Terrain.sl";


		gLUT[0]=upFolder+"artgine/z_file/LUT/apollo.png";
		gLUT[1]=upFolder+"artgine/z_file/LUT/blessing.png";
		gLUT[2]=upFolder+"artgine/z_file/LUT/borkfest.png";
		gLUT[3]=upFolder+"artgine/z_file/LUT/flatter.png";
		gLUT[4]=upFolder+"artgine/z_file/LUT/pokemon.png";
		gLUT[5]=upFolder+"artgine/z_file/LUT/twilight.png";

		let option=new CLoaderOption();
		option.mGPU=false;
		for(let i=0;i<6;++i)
			await _fw.Load().Exe(gLUT[i],option);
		


		//console.time("A");
		for(let i=0;i<6;++i)
		{
			let tex=_fw.Res().Find(gLUT[i]) as CTexture;
			_fw.Res().Remove(gLUT[i]);
			gLUT[i]=CString.ReplaceAll(gLUT[i],upFolder+"artgine","Artgine");
			_fw.Res().Push(gLUT[i],tex);
			
		}
			
		gNoise[0]=upFolder+"artgine/z_file/Noise/perlin128.png";
		gNoise[1]=upFolder+"artgine/z_file/Noise/water128.png";
		gNoise[2]=upFolder+"artgine/z_file/Noise/cloud96.png";
		gNoise[3]=upFolder+"artgine/z_file/Noise/blue64.png";

		for(let i=0;i<gNoise.length;++i)
			await _fw.Load().Exe(gNoise[i],option);

		for(let i=0;i<gNoise.length;++i)
		{
			let tex=_fw.Res().Find(gNoise[i]) as CTexture;
			_fw.Res().Remove(gNoise[i]);
			gNoise[i]=CString.ReplaceAll(gNoise[i],upFolder+"artgine","Artgine");
			tex.SetKey(gNoise[i]);
			_fw.Res().Push(gNoise[i],tex);
		}


		await _fw.Load().Exe(Sl2DKey);
		await _fw.Load().Exe(Sl3DKey);
		await _fw.Load().Exe(SlPostKey);
		await _fw.Load().Exe(SlCubeKey);
		await _fw.Load().Exe(SlVoxelKey);
		await _fw.Load().Exe(SlTerrainKey);

		//console.timeEnd("A");
		
		
		
		this.mSL2D=_fw.Res().Find(Sl2DKey);
		this.mSL3D=_fw.Res().Find(Sl3DKey);
		this.mSLPost=_fw.Res().Find(SlPostKey);
		this.mSLCube=_fw.Res().Find(SlCubeKey);
		this.mSLVoxel=_fw.Res().Find(SlVoxelKey);
		this.mSLTerrain=_fw.Res().Find(SlTerrainKey);

		
		_fw.Res().Remove(Sl2DKey);
		this.mSL2D.mKey=gSl2DKey;
		_fw.Res().Push(gSl2DKey,this.mSL2D);

		_fw.Res().Remove(Sl3DKey);
		this.mSL3D.mKey=gSl3DKey;
		_fw.Res().Push(gSl3DKey,this.mSL3D);

		_fw.Res().Remove(SlPostKey);
		this.mSLPost.mKey=gSlPostKey;
		_fw.Res().Push(gSlPostKey,this.mSLPost);

		_fw.Res().Remove(SlCubeKey);
		this.mSLCube.mKey=gSlCubeKey;
		_fw.Res().Push(gSlCubeKey,this.mSLCube);


		_fw.Res().Remove(SlVoxelKey);
		this.mSLVoxel.mKey=gSlVoxelKey;
		_fw.Res().Push(gSlVoxelKey,this.mSLVoxel);

		_fw.Res().Remove(SlTerrainKey);
		this.mSLTerrain.mKey=gSlTerrainKey;
		_fw.Res().Push(gSlTerrainKey,this.mSLTerrain);

		
	}
	Init(_fw : CFrame)
	{
		if(_fw.Ren()==null)	return;

        _fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)],new CVec2(1, 1),this.GetMainFrameTex());
		
		CH5Canvas.Init(2,2);
		var para=[CH5Canvas.Cmd("fillStyle","black"),CH5Canvas.Cmd("fillRect",[0,0,2,2])];
		CH5Canvas.Draw(para);
		let tex=CH5Canvas.GetNewTex();
		_fw.Ren().BuildTexture(tex);
		_fw.Res().Push(this.GetBlackTex(),tex);
		

		var mesh = CUtilRender.CMeshCreateInfoToCMesh(CUtilRender.GetPlane(new CVec4(0,0,1,CUtilRender.Mesh2DSize / 2.0)),this.GetBlackTex());
		_fw.Res().Push(this.GetPlaneMesh(), mesh);
		this.mMCI2D=mesh.meshTree.mData.ci;
		CUtilRender.MeshBoundUpdate(mesh);
		
		var mesh = CUtilRender.CMeshCreateInfoToCMesh(CUtilRender.GetBox(100),this.GetBlackTex());
		_fw.Res().Push(this.GetBoxMesh(), mesh);
		CUtilRender.MeshBoundUpdate(mesh);

		var mesh = CUtilRender.CMeshCreateInfoToCMesh(CUtilRender.GetDevBox(100),this.GetBlackTex());
		_fw.Res().Push(this.GetDevBoxMesh(), mesh);
		CUtilRender.MeshBoundUpdate(mesh);
	
		//mesh = CUtilRender.CMeshCreateInfoToCMesh(CUtilRender.GetSphereUVEach(100, 32),this.GetBlackTex());
		mesh = CUtilRender.CMeshCreateInfoToCMesh(CUtilRender.GetSphere(new CVec3(100,100,100),16,16,100,100),this.GetBlackTex());
		_fw.Res().Push(this.GetSphereMesh(), mesh);
		CUtilRender.MeshBoundUpdate(mesh);
		
		mesh = CUtilRender.CMeshCreateInfoToCMesh(CUtilRender.GetTerrain(new CVec2(64, 64), 0),this.GetBlackTex());
		this.mTerrain=mesh.meshTree.mData.ci;
		CUtilRender.MeshBoundUpdate(mesh);
        this.mTerrain.bound.mMin.y = 0;
        this.mTerrain.bound.mMax.y = 10000;

		
		
		//var half = CUtilRender.Mesh2DSize / 2.0;
		//this.mMCI2D= CUtilRender.GetPlane(new CVec4(0, 0, 1, half));
		
		//if(_fw.Dev().BenchmarkScore())
		_fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array,CTexture.eFormat.RGBA32F,1)],new CVec2(512, 512),this.GetShadowWriteTex());
		//_fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array,CTexture.eFormat.RGBA32F,6)],new CVec2(2048, 2048),this.GetShadowWriteTex());
		let stex=_fw.Res().Find(this.GetShadowWriteTex()) as CTexture;


		let fa=new Float32Array(CDevice.GetProperty(CDevice.eProperty.Sam2DSize)*4);
		for(let j=0;j<6;++j)
		{
			tex=CImgPro.ExtractColorPalette(_fw.Res().Find(gLUT[j]),new CVec2(32,32));
			for(let i=0;i<tex.GetWidth()*tex.GetHeight();++i)
			{
				fa[i*4+0]=tex.GetBuf()[0][i*4+0]/0xff;
				fa[i*4+1]=tex.GetBuf()[0][i*4+1]/0xff;
				fa[i*4+2]=tex.GetBuf()[0][i*4+2]/0xff;
				fa[i*4+3]=tex.GetBuf()[0][i*4+3]/0xff;

			}
			_fw.Ren().RebuildTexture(_fw.Ren().mUniToSam2dArr,0,SDF.eUni.V4LookUpTable0+j,32*32,1,fa);
			_fw.Res().Remove(gLUT[j]);
		}

		// Perlin
		fa = new Float32Array(2048 * 256 * 4);
		tex = _fw.Res().Find(gNoise[0]);
		for(let dstY = 0; dstY < 256; dstY++) {
			for(let dstX = 0; dstX < 2048; dstX++) {
				for(let k = 0; k < 4; k++) {
					const idx = (dstY * 2048 + dstX) * 4 + k;
					fa[idx] = tex.GetBuf()[0][idx] / 0xFF;
				}
			}
		}
		_fw.Ren().RebuildTexture(_fw.Ren().mUniToSam2dArr,  0, 0, 2048, 256, fa,SDF.eNoise.Perlin);
		_fw.Res().Remove(gNoise[0]);

		// Water
		tex = _fw.Res().Find(gNoise[1]);
		for(let dstY = 0; dstY < 256; dstY++) {
			for(let dstX = 0; dstX < 2048; dstX++) {
				for(let k = 0; k < 4; k++) {
					const idx = (dstY * 2048 + dstX) * 4 + k;
					fa[idx] = tex.GetBuf()[0][idx] / 0xFF;
				}
			}
		}
		//_fw.Ren().RebuildTexture(_fw.Ren().mUniToSam2d,  0, SDF.eNoise.PerlinNormal, 2048, 256, fa);
		_fw.Ren().RebuildTexture(_fw.Ren().mUniToSam2dArr,  0, 0, 2048, 256, fa,SDF.eNoise.PerlinNormal);
		_fw.Res().Remove(gNoise[1]);

		// Cloud
		tex = _fw.Res().Find(gNoise[2]);
		for(let dstY = 0; dstY < 256; dstY++) {
			for(let dstX = 0; dstX < 2048; dstX++) {
				for(let k = 0; k < 4; k++) {
					const idx = (dstY * 2048 + dstX) * 4 + k;
					fa[idx] = tex.GetBuf()[0][idx] / 0xFF;
				}
			}
		}
		//_fw.Ren().RebuildTexture(_fw.Ren().mUniToSam2d,  0, SDF.eNoise.PerlinFBM3, 2048, 256, fa);
		_fw.Ren().RebuildTexture(_fw.Ren().mUniToSam2dArr,  0, 0, 2048, 256, fa,SDF.eNoise.PerlinFBM3);
		_fw.Res().Remove(gNoise[2]);

		// Blue Noise
		fa = new Float32Array(2048 * 1 * 4);
		tex = _fw.Res().Find(gNoise[3]);
		for(let y = 0; y < 64; y++)
		{
			for(let x = 0; x < 64; x++)
			{
				let index = y * 64 + x;
				let isX = true;
				if(index >= 2048) {
					isX = false;
				}
				let srcIndex = index * 4;
				let dstIndex = (index % 2048) * 4;
				
				if(isX) fa[dstIndex + 0] = tex.GetBuf()[0][srcIndex] / 0xFF;
				else fa[dstIndex + 1] = tex.GetBuf()[0][srcIndex] / 0xFF;
			}
		}
		//_fw.Ren().RebuildTexture(_fw.Ren().mUniToSam2d,  0, SDF.eNoise.Blue, 2048, 1, fa);
		_fw.Ren().RebuildTexture(_fw.Ren().mUniToSam2dArr,  0, 0, 2048, 1, fa,SDF.eNoise.Blue);
		_fw.Res().Remove(gNoise[3]);



	}
	

	Sl2D() : CShaderList	{		return this.mSL2D;	}
	Sl3D() : CShaderList	{		return this.mSL3D;	}
	SlPost() : CShaderList	{		return this.mSLPost;	}
	SlCube() : CShaderList	{		return this.mSLCube;	}
	SlVoxel() : CShaderList	{		return this.mSLVoxel;	}
	SlTerrain() : CShaderList	{		return this.mSLTerrain;	}
	


	Sl2DKey()	{		return gSl2DKey;	}
	Sl3DKey() 	{		return gSl3DKey;	}
	SlPostKey() 	{		return gSlPostKey;	}
	SlCubeKey() 	{		return gSlCubeKey;	}
	SlVoxelKey() 	{		return gSlVoxelKey;	}
	SlTerrainKey() 	{		return gSlTerrainKey;	}
	

	
	
	MCI2D()
	{
		return this.mMCI2D;
	}
	
	Terrain()
    {
        return this.mTerrain;
    }
	

	GetNoneTex()
	{
		return gNoneTex;
	}

	GetBlackTex()
	{
		return "Artgine/Black.tex";
	}
	GetBoxMesh()
	{
		return "Artgine/box.mesh";
	}
	GetDevBoxMesh()
	{
		return "Artgine/devBox.mesh";
	}
	GetSphereMesh()
	{
		return "Artgine/sphere.mesh";
	}
	GetPlaneMesh()
	{
		return "Artgine/plane.mesh";
	}
	
	
	GetShadowWriteTex()
	{
		return "Artgine/shadowWrite.tex";
	}
	GetShadowReadTex()
	{
		return "Artgine/shadowRead.tex";
	}
	
    GetMainFrameTex()
    {
        return "Artgine/MainFrame.tex";
    }
    GetDefaultFrameBuffer()
    {
        return "Artgine/DefaultFrame.tex";
    }
}

