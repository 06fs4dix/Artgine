import {CAlert} from "../basic/CAlert.js";
import {CEvent} from "../basic/CEvent.js";
import {CPreferences} from "../basic/CPreferences.js";
import {CTree} from "../basic/CTree.js";
import {CUniqueID} from "../basic/CUniqueID.js";
import {CUtil} from "../basic/CUtil.js";
import {CFloat32Mgr} from "../geometry/CFloat32Mgr.js";
import {CMat} from "../geometry/CMat.js";
import {CMath} from "../geometry/CMath.js";
import {CVec1} from "../geometry/CVec1.js";
import {CVec2} from "../geometry/CVec2.js";
import {CVec3} from "../geometry/CVec3.js";
import {CVec4} from "../geometry/CVec4.js";
import {CRes} from "../system/CRes.js";
import {CDevice, CDeviceGPU} from "./CDevice.js";
import {CH5Canvas,  CH5CMDList } from "./CH5Canvas.js";
import {CImgPro} from "./CImgPro.js";
import {CMesh} from "./CMesh.js";
import {CMeshCreateInfo} from "./CMeshCreateInfo.js";
import {CMeshDataNode} from "./CMeshDataNode.js";
import {CMeshDrawNode} from "./CMeshDrawNode.js";
import {CShader,  CShaderList, CVertexFormat } from "./CShader.js";
import {CShaderAttr} from "./CShaderAttr.js";
import { CShaderInterpret, CShaderInterpretGPU } from "./CShaderInterpret.js";
import {CTexture,  CTextureInfo } from "./CTexture.js";
import { CUniform } from "./CUniform.js";
import {CUtilRender} from "./CUtilRender.js";
import { CModal } from "../basic/CModal.js";
import { CUtilWeb } from "../util/CUtilWeb.js";
import { CDOM } from "../basic/CDOM.js";
import { CConsol } from "../basic/CConsol.js";

export class CTexUse
{
	mSum=0;
	mSingle=0;
	mArray=0;
	mCube=0;
}
var gRTOff = 0;
//build타입 리턴값이 string 이면 내부 리소스 자동 등록임
export class CRenderer
{
    public mDev : CDevice=null;
    public mRes : CRes=null;
    public mLoadSet : Set<any>=null;
    public mPF : CPreferences;
	public mShaderInterpret : CShaderInterpret;
	mTexUse=new CTexUse();
	mTexBind=new Array<number>();

	// public mUniToSam2d : CTexture;
	// public mUniToSam2dKey="Artgine/uniToSam2dKey";
	public mUniTexLastOff=-1;
	//mUniWriteSet=new Set<number>();

	public mUniToSam2dArr : CTexture;
	public mUniToSam2dArrKey="Artgine/uniToSam2dArrKey";

	
	public mMainFrameTex : CTexture;
	mFrameBufStack=new Array();
	public mLastShader=null;
	constructor(_Dev : CDevice,_sInter:CShaderInterpret,_Res : CRes,_PF : CPreferences)
	{
		this.mDev=_Dev;
		this.mShaderInterpret=_sInter;
		this.mRes=_Res;
		this.mPF=_PF;

		// this.mUniToSam2d=new CTexture();
		// //this.mUniToSam2d.SetSize(CDevice.GetProperty(CDevice.eProperty.Sam2DSize),CDevice.GetProperty(CDevice.eProperty.Sam2DSize)/2);
		// this.mUniToSam2d.SetSize(2048,1024);
		// this.mUniToSam2d.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA32F)]);
		// this.mUniToSam2d.SetFilter(CTexture.eFilter.Linear);
		// this.mUniToSam2d.SetMipMap(CTexture.eMipmap.None);
		// this.mUniToSam2d.CreateBuf();
		// this.mUniToSam2d.mReadPixelEvent=new CEvent(this.ReadPixel,this);
		// this.BuildTexture(this.mUniToSam2d);
		// this.mUniToSam2d.GetBuf().length=0;
		// this.mRes.Push(this.mUniToSam2dKey,this.mUniToSam2d);


		this.mUniToSam2dArr=new CTexture();
		this.mUniToSam2dArr.SetSize(2048,256);
		this.mUniToSam2dArr.PushInfo([new CTextureInfo(CTexture.eTarget.Array,CTexture.eFormat.RGBA32F,5)]);
		this.mUniToSam2dArr.SetFilter(CTexture.eFilter.Nearest);
		this.mUniToSam2dArr.SetMipMap(CTexture.eMipmap.None);
		this.mUniToSam2dArr.CreateBuf();
		this.mUniToSam2dArr.mReadPixelEvent=new CEvent(this.ReadPixel,this);
		this.BuildTexture(this.mUniToSam2dArr);
		this.mUniToSam2dArr.GetBuf().length=0;
		this.mRes.Push(this.mUniToSam2dArrKey,this.mUniToSam2dArr);
	}
	SInter()	{	return this.mShaderInterpret;	}
    async BuildH5CMDList(_ch5json:CH5CMDList)
	{
		CH5Canvas.Init(_ch5json.mSize.x,_ch5json.mSize.y);
		await CH5Canvas.Draw(_ch5json.mCMD);
		let tex=CH5Canvas.GetNewTex();
		this.mRes.Push(_ch5json.mKey+".tex",tex);
		this.BuildTexture(tex);

		return _ch5json.mKey+".tex";
	}
	BlitDepth(_read : CTexture,_draw : CTexture=null){	}
	BlitColor(_read : CTexture,_draw : CTexture=null){}
	Begin(_tex : CTexture=null,_surface=false,_rtUse:Set<number>=null,_rtLevel=0){	return false;	}
	End(_tex : CTexture=null,_rtUse :Set<number>=null,_rtLevel=0){}

	/** _updatedLayers : 갱신된 배열 레이어 번호. 큐브(6레이어) 단위로 하나라도 포함되면 그 큐브만 다시 블러한다 */
	BlurEnvmap(_texKey : string,_updatedLayers : Set<number>,_cube : CTexture=null)
	{
		const tex = this.mRes.Find(_texKey) as CTexture;
		if(this.mDev.GL() == null || tex == null || tex.GetGBuf().length == 0 || _updatedLayers.size == 0)
			return;
		if(_cube != null && _cube.GetBuf().length < 6)
			return;

		const info = tex.GetInfo()[0];
		const isFloat = info.mFormat == CTexture.eFormat.RGBA32F;
		const type = isFloat ? this.mDev.GL().FLOAT : this.mDev.GL().UNSIGNED_BYTE;
		const size = tex.GetWidth();
		const lodCount = Math.floor(Math.log2(size)) + 1;
		if(lodCount < 2)
			return;

		const gTex = tex.GetGBuf()[0];
		const fb = this.mDev.GL().createFramebuffer();
		this.mDev.GL().bindFramebuffer(this.mDev.GL().FRAMEBUFFER, fb);
		this.mDev.GL().bindTexture(this.mDev.GL().TEXTURE_2D_ARRAY, gTex);

		if(_cube != null)
		{
			const layers = Array.from(_updatedLayers).sort((a,b)=>a-b);
			for(let face = 0; face < 6; face++)
			{
				const img = CImgPro.SqurEnlargedReduced(_cube.GetWidth(), _cube.GetHeight(), _cube.GetBuf()[face == 2 ? 3 : face == 3 ? 2 : face], size / _cube.GetWidth(), size / _cube.GetHeight(), 4);
				const src = img.GetBuf()[0] as Uint8Array;
				const buf = new Uint8Array(src.length);
				const w = img.GetWidth(), h = img.GetHeight();
				const side = face != 2 && face != 3;
				for(let y = 0; y < h; y++)
				{
					for(let x = 0; x < w; x++)
					{
						const sx = side ? w - 1 - x : x;
						let sy = side ? h - 1 - y : y;
						if(!_cube.GetYFlip()) sy = h - 1 - sy;
						buf.set(src.subarray((sy * w + sx) * 4, (sy * w + sx) * 4 + 4), (y * w + x) * 4);
					}
				}
				this.mDev.GL().texSubImage3D(this.mDev.GL().TEXTURE_2D_ARRAY, 0, 0, 0, layers[face], w, h, 1, this.mDev.GL().RGBA, this.mDev.GL().UNSIGNED_BYTE, buf);
			}

			const drawFb = this.mDev.GL().createFramebuffer();
			for(let lod = 1; lod < lodCount; lod++)
			{
				const s = size >> lod;
				const ps = size >> (lod - 1);
				for(let face = 0; face < 6; face++)
				{
					this.mDev.GL().bindFramebuffer(this.mDev.GL().READ_FRAMEBUFFER, fb);
					this.mDev.GL().framebufferTextureLayer(this.mDev.GL().READ_FRAMEBUFFER, this.mDev.GL().COLOR_ATTACHMENT0, gTex, lod - 1, layers[face]);
					this.mDev.GL().bindFramebuffer(this.mDev.GL().DRAW_FRAMEBUFFER, drawFb);
					this.mDev.GL().framebufferTextureLayer(this.mDev.GL().DRAW_FRAMEBUFFER, this.mDev.GL().COLOR_ATTACHMENT0, gTex, lod, layers[face]);
					this.mDev.GL().blitFramebuffer(0, 0, ps, ps, 0, 0, s, s, this.mDev.GL().COLOR_BUFFER_BIT, this.mDev.GL().LINEAR);
				}
			}
			this.mDev.GL().bindFramebuffer(this.mDev.GL().FRAMEBUFFER, fb);
			this.mDev.GL().deleteFramebuffer(drawFb);
		}

		const mips : (Uint8Array|Float32Array)[][] = [];
		const cubeLayers : number[] = [];
		for(let layer = 0; layer + 6 <= info.mCount; layer += 6)
		{
			let dirty = false;
			for(let face = 0; face < 6 && !dirty; face++)
				dirty = _updatedLayers.has(layer + face);
			if(!dirty)
				continue;
			cubeLayers.push(layer);
			const faces : (Uint8Array|Float32Array)[] = [];
			for(let lod = 0; lod < lodCount; lod++)
			{
				const s = size >> lod;
				for(let face = 0; face < 6; face++)
				{
					const buf = isFloat ? new Float32Array(s * s * 4) : new Uint8Array(s * s * 4);
					this.mDev.GL().framebufferTextureLayer(this.mDev.GL().FRAMEBUFFER, this.mDev.GL().COLOR_ATTACHMENT0, gTex, lod, layer + face);
					this.mDev.GL().readPixels(0, 0, s, s, this.mDev.GL().RGBA, type, buf);
					faces.push(buf);
				}
			}
			mips[layer / 6] = faces;
		}

		if(cubeLayers.length > 0)
		{
			const blurred = CImgPro.SphericalGaussianBlur(tex, _updatedLayers, mips);
			for(let lod = 0; lod < blurred.length; lod++)
			{
				const s = size >> lod;
				const bufs = blurred[lod].GetBuf();
				for(let i = 0; i < bufs.length; i++)
				{
					const layer = cubeLayers[Math.floor(i / 6)] + i % 6;
					this.mDev.GL().texSubImage3D(this.mDev.GL().TEXTURE_2D_ARRAY, lod, 0, 0, layer, s, s, 1, this.mDev.GL().RGBA, type, bufs[i] as ArrayBufferView);
				}
			}
		}

		this.mDev.GL().bindTexture(this.mDev.GL().TEXTURE_2D_ARRAY, null);
		this.mDev.GL().bindFramebuffer(this.mDev.GL().FRAMEBUFFER, null);
		this.mDev.GL().deleteFramebuffer(fb);
	}

	GetMainFrameTex() {
		return this.mMainFrameTex;
	}
	async BuildTexture(_tex : CTexture) 
	{

	}
	ReleaseTexture(pa_tex : CTexture)
	{
	}
	ReadPixel(_tex : CTexture){	}
	
	BuildRenderTarget() : string
	BuildRenderTarget(_info : Array<CTextureInfo>) : string
	BuildRenderTarget(_info : Array<CTextureInfo>,_size : CVec2) : string
	BuildRenderTarget(_info : Array<CTextureInfo>,_size : CVec2, _key : string) : string
	BuildRenderTarget(_info : Array<CTextureInfo>=null,_size : CVec2=null,_key : string=null) : string
	{
		return "";
	}
	//원본 사이즈 -> 실제 픽셀 크기. RTScale는 여기서 단 한번만 적용한다.
	//원본이 0~1이면 화면 대비 비율, 1 초과면 절대 픽셀(화면과 무관하게 고정)
	RTOrgToSize(_orgW : number,_orgH : number) : CVec2
	{
		if(_orgW>=0 && _orgW<=1 && _orgH>=0 && _orgH<=1)
			return new CVec2(Math.trunc(_orgW*this.mPF.mRTScaleW*this.mPF.mWidth),Math.trunc(_orgH*this.mPF.mRTScaleH*this.mPF.mHeight));
		return new CVec2(Math.trunc(_orgW*this.mPF.mRTScaleW),Math.trunc(_orgH*this.mPF.mRTScaleH));
	}
	/*
	GL_TEXTURE_CUBE_MAP_POSITIVE_X 	오른쪽
	GL_TEXTURE_CUBE_MAP_NEGATIVE_X 	왼쪽
	GL_TEXTURE_CUBE_MAP_POSITIVE_Y 	아래
	GL_TEXTURE_CUBE_MAP_NEGATIVE_Y 	위
	GL_TEXTURE_CUBE_MAP_POSITIVE_Z 	앞
	GL_TEXTURE_CUBE_MAP_NEGATIVE_Z 	뒤
	*/
	BuildCubeMap(_texList : Array<CTexture>,_mipmap=true,_key=null)	: string{	return null;	}

	//텍스쳐,등록할 샘플러 슬롯,시작점xy,버퍼사이즈xy,버퍼,어레이일 경우 몇번째
	RebuildTexture(_tex : CTexture,_xOff : number,_yOff : number,_width : number,_height : number,_fa : ArrayBufferView,_arrOff=0)
	{

	}
	BuildVideo(_video : HTMLVideoElement,_key : string=null)  : string
	{
		return null;
	}
	//Mesh----------------------------------------------------
	RebuildMeshDrawNode(_mesh : CMeshDrawNode,_gBufOff : number,_bufStartOff : number,_buf : Float32Array)
	{
		
	}
	BuildMeshDrawNode(_mesh : CMeshDrawNode,_info : CMeshCreateInfo,_shader : CShader)
	{
		
		
	}
	ReleaseMeshDrawNode(_mesh : CMeshDrawNode)
	{

	}

	ShaderComplie(_shader : CShader)
	{

	}
	/**
	 * 컴퓨트 셰이더를 쓸 수 있는 백엔드인가. WebGL2 에는 컴퓨트가 없어 false 다.
	 */
	ComputeSupport() : boolean	{	return false;	}
	/**
	 * 컴퓨트 커널을 실행한다. 입력은 전부 SendGPU 로 먼저 걸어둔다
	 * (스토리지인지 유니폼인지는 셰이더 선언이 정하므로 호출부는 구분하지 않는다).
	 * @param _count 스레드 수. 워크그룹 수는 백엔드가 나눈다
	 */
	ComputeDispatch(_shader : CShader,_count : number) : boolean	{	return false;	}
	BuildMeshAutoFix(mesh : CMesh,_drawTree : CTree<CMeshDrawNode>,_shader : CShader){}
	BuildMeshDrawNodeAutoFix(_meshDraw : CMeshDrawNode,_shader : CShader,_info : CMeshCreateInfo){}


	SendGPU(_shader : CShader,_value : CMat,pa_text : string);
	SendGPU(_shader : CShader,_value : CVec3,pa_text : string);
	SendGPU(_shader : CShader,_value : CVec2,pa_text : string);
	SendGPU(_shader : CShader,_value : CVec4,pa_text : string);
	SendGPU(_shader : CShader,_value : CVec1,pa_text : string);
	SendGPU(_shader : CShader,_value : number,pa_text : string);
	SendGPU(_shader : CShader,_value : Float32Array,pa_text : string,_each : number);
	SendGPU(_shader : CShader,_value : CShaderAttr);
	SendGPU(_shader : CShader,_texture : Array<string>,_textureOff : Array<number>,_attach : Array<number>,_off : number) : void;
	SendGPU(_shader : CShader,_texture : Array<string>,_textureOff : Array<number>,_attach : Array<number>) : void;
	SendGPU(_shader : CShader,_texture : Array<string>,_textureOff : Array<number>) : void;
	SendGPU(_shader : CShader,_texture : Array<string>) : void;
	SendGPU(_shader : CShader,pa_text : string) : void;
	SendGPU(_shader : CShader,_value : any,_keyOff : any=null,_eachAttach=null,_off=null){}


	
	
	MeshDrawNodeRender(_shader : CShader,_mesh : CMeshDrawNode,_insCount : number=0,_bind=true){}
	UseShader(_shader : CShader) : boolean{	return false;}
	VertexArrayBind(_shader : CShader,_meshDraw : CMeshDrawNode){}
	TexBindReset(){	}
	/** 텍스처를 셰이더 슬롯에 건다. 배정 규칙은 백엔드가 같아야 한다 */
	SetTexGBuf(_vf : CShader,_tex : CTexture,_btu : CTexUse,_offset : number=null,_texAtt : Array<boolean>=null){}
	/** GPU 전용: 텍스처그룹을 실제로 세팅한다(GL 은 SetTexGBuf 가 그 자리에서 다 함) */
	SetTexBindGroup(_shader : CShader){}
	TexUseReset()
	{
		this.mTexUse.mSum=0;
		this.mTexUse.mSingle=0;
		this.mTexUse.mArray=0;
		this.mTexUse.mCube=0;
	}
   //x:어떤 텍스쳐,y:uv(u)시작 위치,z:몇개 사용중인지
	SetUniToSam2D(_vf : CShader,_key : string,_buf : Float32Array)
	{

	}
	
	static ShaderErrorModal(_wgsl,_error)
	{
		let modal=new CModal();
		modal.SetHeader("Error");
		
		let id=CUniqueID.Get();
		id+="_div";
		modal.SetTitle(CModal.eTitle.TextClose);
		modal.SetBody("<div style='height:85%;min-height:320px;min-width:640px;'><textarea style='width:100%;height:128px;'>"+_error+"</textarea><div id='"+id+"' style='width:100%;height:100%;'></div></div>");
		modal.SetZIndex(CModal.eSort.Top);
		modal.Open(CModal.ePos.Center);
		modal.Focus(CModal.eAction.Shake);

		CUtilWeb.MonacoEditer(CDOM.ID(id),_wgsl,"wgsl");
	}
}
export class CRendererGL extends CRenderer
{
	public mXRFrame=null;
	public mXREye=-1;
	public mXRSize=new CVec2();

	//x:어떤 텍스쳐,y:uv(u)시작 위치,z:몇개 사용중인지
	override SetUniToSam2D(_vf : CShader,_key : string,_buf : Float32Array)
	{

	}
	override TexBindReset()
	{
		
	}
	override BlitDepth(_read : CTexture,_draw : CTexture=null)
	{
		
	}
	override BlitColor(_read : CTexture,_draw : CTexture=null)
	{
		
	}
	override Begin(_tex : CTexture=null,_2d=false,_rtUse:Set<number>=null,_rtLevel=0)
	{	
		
		return false;	
	}
	override End(_tex : CTexture=null,_rtUse :Set<number> = null,_rtLevel=0)
    {
        this.mDev.mClearColor=true;
		this.mDev.mClearDepth=true;
        this.mFrameBufStack.pop();
		let last=null;
		if(this.mFrameBufStack.length>0)
			last=this.mFrameBufStack[this.mFrameBufStack.length-1];
			
		//xrFrame가 있으면 그걸로 재초기화 시켜줌
		if (_tex != null)
		{
			_tex.BindFrame(false);
			if(last==null)
			{
				if(_tex.GetAnti()>0)
				{
					this.mDev.GL().bindFramebuffer(this.mDev.GL().READ_FRAMEBUFFER, _tex.mFrameBuf[_rtLevel]);
					this.mDev.GL().bindFramebuffer(this.mDev.GL().DRAW_FRAMEBUFFER, _tex.mAntiBuf[_rtLevel]);
					//this.mDev.GL().clearBufferfv(this.mDev.GL().COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
					this.mDev.GL().blitFramebuffer(0, 0, _tex.GetWidth(), _tex.GetHeight(),
				                     0, 0, _tex.GetWidth(), _tex.GetHeight(),
				                     this.mDev.GL().COLOR_BUFFER_BIT, this.mDev.GL().LINEAR);
				                     
				    //this.mDev.GL().bindFramebuffer(this.mDev.GL().READ_FRAMEBUFFER, null);
					//this.mDev.GL().bindFramebuffer(this.mDev.GL().DRAW_FRAMEBUFFER, null);
				}
				
				
			                     
				
				this.mDev.GL().bindFramebuffer(this.mDev.GL().FRAMEBUFFER, this.mXRFrame);
			}
			else
				this.mDev.GL().bindFramebuffer(this.mDev.GL().FRAMEBUFFER, last.mFrameBuf[0]);
		}
		//xrFrame가 있으면 데이터 최종은 webxr에서 처리해야함
		else if(this.mXRFrame==null)
			this.mDev.GL().flush();
		this.mDev.ViewPort(0, 0, this.mPF.mWidth, this.mPF.mHeight);


		
		if(_tex!=null)// && _tex.GetInfo()[0].m_target==CTexture.eTarget.Cube)
		{
			var info=_tex.GetInfo();
			for(var i=0;i<info.length;++i)
			{
				if(_tex.GetMipMap()!=CTexture.eMipmap.None)
				{
					
					
					var type=Number(this.mDev.GL().TEXTURE_2D);
					if(info[i].mTarget==CTexture.eTarget.Array)
						type=this.mDev.GL().TEXTURE_2D_ARRAY;
					else if(info[i].mTarget==CTexture.eTarget.Cube)
						type=this.mDev.GL().TEXTURE_CUBE_MAP;
					this.mDev.GL().bindTexture(type, _tex.GetGBuf()[i]);
					this.mDev.GL().generateMipmap(type);
					this.mDev.GL().bindTexture(type, null);
				}

			}

		}
    }
	override GetMainFrameTex() {		return this.mMainFrameTex;	}
	SetXR(_frame,_eye)
	{
		this.mXRFrame=_frame;
		this.mXREye=_eye;
	}
	CreateFrameBuffer(_tex : CTexture,_rtUse:Set<number>,_rtLevel)
	{
		
	}
	ModifyFrameBuffer(_tex : CTexture,_rtUse:Set<number>,_rtLevel)
	{
		
	}
	//Texture==========================================================================
	override async BuildTexture(pa_tex : CTexture)
	{
		
	}
	override ReleaseTexture(pa_tex : CTexture)
	{
		
	}
	override ReadPixel(_tex : CTexture)
	{
		
	}
	override BuildRenderTarget(_info : Array<CTextureInfo>=null,_size : CVec2=null,_key : string=null) : string
	{
		return "";
	}
	override BuildCubeMap(_texList : Array<CTexture>,_mipmap)	: string
	{	
		return "";
	}
	override RebuildTexture(_tex : CTexture,_xOff : number,_yOff : number,_width : number,_height : number,_fa : ArrayBufferView,_arrOff=0)
	{
		
	}
	RebuildVideo(_video : HTMLVideoElement,_key : string=null)  : string
	{
		return "";
	}
	//Mesh----------------------------------------------------
	GLBufferSet(_mesh,vfd,_arr : CFloat32Mgr,_vnum : number,_type)
	{

	}

	override RebuildMeshDrawNode(_mesh : CMeshDrawNode,_gBufOff : number,_bufStartOff : number,_buf : Float32Array)
	{
		
	}
	override BuildMeshDrawNode(_mesh : CMeshDrawNode,_info : CMeshCreateInfo,_vf : CShader)
	{

		
	}
	override ReleaseMeshDrawNode(_mesh : CMeshDrawNode)
	{

	}
	override BuildMeshAutoFix(mesh : CMesh,_drawTree : CTree<CMeshDrawNode>,_vf : CShader)
	{
		
	}
	override BuildMeshDrawNodeAutoFix(_meshDraw : CMeshDrawNode,_vf : CShader,_info : CMeshCreateInfo)
	{
	
	}
	//shader===================================================================================================
	override ShaderComplie(_shader : CShader)
	{
		
	}
	//Render==================================================
	override SetTexGBuf(_vf : CShader,_tex : CTexture,_btu : CTexUse,_offset : number=null,_texAtt : Array<boolean>=null)
	{
		
	}
	BindTexture(_tex : CTexture,_off : number)
	{
		
	}

	override SendGPU(_vf : CShader,_value : any,_keyOff : any=null,_eachAttach=null,_off=null)
	{
		
		
	}

	override VertexArrayBind(_vf : CShader,_meshDraw : CMeshDrawNode)
    {
		
    }
	override MeshDrawNodeRender(_vf : CShader,_mesh : CMeshDrawNode,_insCount : number=0,_bind=true)
	{
		
	}
	override UseShader(_vf : CShader)
	{
		return false;
	}
	
}

export class CRendererGPU extends CRenderer
{
	Dev()	{	return this.mDev as CDeviceGPU;	}

	/** 파이프라인 캐시. 키 = 셰이더키 + 렌더패스상태 + 정점레이아웃 */
	mPipeline=new Map<string,GPURenderPipeline>();
	
	mUniRing=new Array<{chunk:Array<{buf:GPUBuffer,bg:GPUBindGroup,cpu:Float32Array,slot:number}>,
		ci:number,cur:number,stride:number,size:number}>();
	/** GetUniSlot 결과. 드로우마다 객체를 새로 만들지 않으려고 필드로 받는다 */
	mSlotBG : GPUBindGroup=null;
	mSlotCPU : Float32Array=null;
	mSlotOff=0;
	mSlotFOff=0;
	/** 유니폼이 없는 셰이더용 빈 group(0). 이것도 드로우마다 만들면 같은 병목이 된다 */
	mUniBGEmpty=new Map<string,GPUBindGroup>();
	/** 동적 오프셋 정렬(minUniformBufferOffsetAlignment). 디바이스가 정하고 보통 256 이다 */
	mUniAlign=0;
	/** setBindGroup 에 넘길 동적 오프셋. 드로우마다 배열을 새로 만들지 않으려고 돌려 쓴다 */
	mDynOff=new Uint32Array(1);
	/** GetPipeline 캐시 키의 "셰이더+태그" 부분. 매 드로우 배열 스프레드+join 으로
	 * 다시 만들 필요 없이 셰이더당 한 번만 만든다(RPHash/RTFormat 은 붙는 쪽에서 그때그때 이어붙인다) */
	mShaderTagKey=new Map<CShader,string>();
	/**
	 * 직전 드로우에서 바인딩한 텍스처그룹. 파이프라인/정점·인덱스버퍼는 이제 배치매니져가
	 * 그룹(같은 셰이더+메시)당 한 번 VertexArrayBind 로 미리 해두므로 여기서 더 이상
	 * 판단할 필요가 없다. 텍스처그룹만 uniAtt(유니폼->텍스처
	 * 배열 슬롯)가 그룹 안 첫 오브젝트에서야 확정되는 경우가 있어 매 드로우 확인한다.
	 * 렌더패스가 새로 열릴 때마다(OpenPass) 반드시 비워야 한다 - WebGPU 는 패스가
	 * 바뀌면 이전 패스의 바인딩이 하나도 안 남는다
	 */
	mLastBindTexGroup : GPUBindGroup=null;
	/** 슬롯이 비었을 때 채울 더미 */
	mDummy2D : GPUTexture=null;
	mDummyArr : GPUTexture=null;
	mDummyCube : GPUTexture=null;
	mSampler : GPUSampler=null;
	/**
	 * 텍스처 옵션별 샘플러 모음. GL 의 texParameteri 자리다.
	 * WebGPU 는 샘플러가 텍스처와 분리된 객체라 옵션 조합마다 하나씩 만들어 돌려 쓴다.
	 */
	mSamplerCache=new Map<string,GPUSampler>();
	/** 밉 레벨 생성용 파이프라인(형식별). 생성에는 샘플러를 쓰지 않는다 */
	mMipPipe=new Map<string,GPURenderPipeline>();

	/**
	 * 지금 여는 패스의 대상 정보(renderTarget/viewPort 예약 유니폼 값).
	 *
	 * 유니폼 버퍼는 셰이더가 들고 있는데(CShader.mUniCPU) 이 둘은 셰이더가 아니라
	 * 패스에 딸린 값이다. 그래서 Begin/End 에서 여기에 한 번 정해두고,
	 * 셰이더를 바꿀 때마다(UseShader) 그 셰이더 버퍼로 옮겨 적는다
	 */
	mPassFlip=new Float32Array([1]);
	mPassSize=new Float32Array(2);
	/** 이번 드로우에 쓸 텍스처 슬롯 */
	/**
	 * 이번 드로우의 텍스처 슬롯. 키는 "종류|번호" 다.
	 *
	 * GL 은 텍스처 유닛 대역이 종류별로 갈려 있어(2D 0~, 어레이 16~, 큐브 20~)
	 * 같은 번호에 2D 와 어레이가 동시에 올 수 있다. 번호만으로 키를 잡으면
	 * 나중에 온 것이 앞의 것을 지워버린다(터레인이 이 경우였다).
	 */
	mTexSlot=new Map<string,{tex:CTexture,gi:number}>();
	/** mTexSlot 이 실제로 바뀔 때마다(SetTexGBuf/TexBindReset) 증가한다.
	 * GetTexBindGroup 이 "지난번과 슬롯 구성이 같은지"를 16칸 배열을 매번 새로 만들어
	 * 비교하지 않고 정수 하나 비교로 끝내는 데 쓴다 */
	mTexSlotVersion=0;
	/**
	 * 텍스처 뷰 캐시. GL 은 bindTexture 만 하면 되지만 WebGPU 는 GPUTextureView 객체를
	 * 만들어야 해서, 매 드로우 새로 만들면 그 자체가 비용이다. RebuildTexture 는 같은
	 * GPUTexture 객체를 그대로 재사용하므로(texSubImage 자리) 객체 참조로 캐시해도 안전하다.
	 */
	mTexViewCache=new WeakMap<GPUTexture,Map<string,GPUTextureView>>();
	/**
	 * group(1) 바인드그룹 캐시(셰이더별 1개). WebGPU 는 GL 의 glBindTexture 처럼 슬롯
	 * 하나만 갈아 끼우는 API 가 없어 바인드그룹을 통째로 새로 만들어야 하지만, 슬롯에
	 * 걸린 실제 GPUTexture 구성이 직전 드로우와 같으면 다시 만들 필요가 없다.
	 */
	mTexBGCache=new Map<CShader,{ver:number,gts:Array<GPUTexture>,bg:GPUBindGroup}>();
	InitGPU()
	{
	}

	// ---- 프레임/렌더타겟 -----------------------------------------------------
	//
	// GL 은 프레임버퍼를 다시 바인딩해서 대상을 바꾸지만 WebGPU 는 대상마다 렌더패스를
	// 새로 열어야 한다. 그래서 중첩 구조를 이렇게 다룬다.
	//   가장 바깥 Begin  : 인코더 생성
	//   Begin/End 마다   : 패스 열고 닫기(안쪽에서 나오면 바깥 대상 패스를 다시 연다)
	//   가장 바깥 End    : 큐에 제출
	// 다시 열린 패스는 loadOp=load 라 앞서 그린 내용이 남는다(OpenPass 의 _clear=false).

	/** 지금 패스의 색상 포맷. 파이프라인의 타겟과 반드시 일치해야 한다 */
	mRTFormat=new Array<GPUTextureFormat>();
	RTDepth(_tex : CTexture) : GPUTextureView
	{
		return null;
	}
	RTViews(_tex : CTexture,_rtUse : Set<number>,_rtLevel=0) : Array<GPUTextureView>
	{
		return null;
	}
	OpenPass(_tex : CTexture,_rtUse : Set<number>,_rtLevel=0,_clear=true)
	{
	}
	SetPassTarget(_tex : CTexture,_w : number,_h : number)
	{
	}
	WritePassUni(_shader : CShader)
	{
	}
	UniWrite(_shader : CShader,_key : string,_fa : Float32Array)
	{
	}
	override Begin(_tex : CTexture=null,_surface=false,_rtUse:Set<number>=null,_rtLevel=0) : boolean
	{
		return false;
	}
	override End(_tex : CTexture=null,_rtUse :Set<number>=null,_rtLevel=0)
	{
	}
	override BuildRenderTarget(_info : Array<CTextureInfo>=null,_size : CVec2=null,_key : string=null) : string
	{
		return "";
	}
	override BlitDepth(_read : CTexture,_draw : CTexture=null)
	{
	}
	override TexBindReset()
	{
	}
	override BlitColor(_read : CTexture,_draw : CTexture=null)
	{
	}
	override ShaderComplie(_shader : CShader)
	{
	}
	async CheckShader(_shader : CShader,_vs : GPUShaderModule,_ps : GPUShaderModule)
	{
	}
	UniCPUReady(_shader : CShader)
	{
	}
	override UseShader(_shader : CShader) : boolean
	{
		return false;
	}
	override SetTexGBuf(_vf : CShader,_tex : CTexture,_btu : CTexUse,_offset : number=null,_texAtt : Array<boolean>=null)
	{
	}
	override BuildMeshDrawNode(_mesh : CMeshDrawNode,_info : CMeshCreateInfo,_shader : CShader)
	{
	}
	override RebuildMeshDrawNode(_mesh : CMeshDrawNode,_gBufOff : number,_bufStartOff : number,_buf : Float32Array)
	{
	}
	override ReleaseMeshDrawNode(_mesh : CMeshDrawNode)
	{
	}
	FlipRows(_buf : ArrayBufferView,_rowBytes : number,_height : number,_layers=1) : ArrayBufferView
	{
		return null;
	}
	override async ReadPixel(_tex : CTexture)
	{
	}
	override BuildCubeMap(_texList : Array<CTexture>,_mipmap=true,_key=null) : string
	{
		return "";
	}
	override async BuildTexture(_tex : CTexture)
	{
	}
	override ReleaseTexture(_tex : CTexture)
	{
	}
	override RebuildTexture(_tex : CTexture,_xOff : number,_yOff : number,_width : number,_height : number,
		_fa : ArrayBufferView,_arrOff=0)
	{
	}
	override SendGPU(_shader : CShader,_value : any,_keyOff : any=null,_eachAttach=null,_off=null)
	{
	}
	/** number 하나를 넘길 때마다 Float32Array 를 새로 만들면 할당이 쌓인다 */
	mNumFA=new Float32Array(1);
	NumFA(_v : number) : Float32Array
	{
		return null;
	}
	VertexLayout(_shader : CShader) : Array<GPUVertexBufferLayout>
	{
		return null;
	}
	ShaderTagKey(_shader : CShader) : string
	{
		return "";
	}
	TexLayout(d : GPUDevice,_vis : number) : GPUBindGroupLayout
	{
		return null;
	}
	BuildLayout(_shader : CShader,d : GPUDevice) : {uni:GPUBindGroupLayout,tex:GPUBindGroupLayout,pl:GPUPipelineLayout}
	{
		return null;
	}
	GetPipeline(_shader : CShader) : GPURenderPipeline
	{
		return null;
	}
	UniSize(_shader : CShader) : number
	{
		return 0;
	}
	GetUniSlot(_shader : CShader) : boolean
	{
		return false;
	}
	UniFlush()
	{
	}
	GetUniBGEmpty(_shader : CShader) : GPUBindGroup
	{
		return null;
	}
	override VertexArrayBind(_shader : CShader,_mesh : CMeshDrawNode)
	{
	}
	override SetTexBindGroup(_shader : CShader)
	{
	}
	override MeshDrawNodeRender(_shader : CShader,_mesh : CMeshDrawNode,_insCount : number=0,_bind=true)
	{
	}

	// ---- 컴퓨트 -------------------------------------------------------------
	override ComputeSupport() : boolean	{	return true;	}
	/**
	 * 셰이더별 스토리지 버퍼 자리.
	 *
	 * 유니폼처럼 드로우마다 자리를 옮기지 않는다 - 값을 걸어두고 곧바로 디스패치하는
	 * 구조라(텍스처를 SetTexGBuf 로 걸어두고 그리는 것과 같다) 한 벌이면 된다.
	 *   buf : 바인딩 번호별 GPUBuffer
	 *   own : 그 버퍼를 우리가 만들었는가(정점 버퍼처럼 남의 것이면 건드리면 안 된다)
	 */
	mStorage=new WeakMap<CShader,{buf:Array<GPUBuffer>,own:Array<boolean>,bg:GPUBindGroup}>();
	StorageSlot(_shader : CShader) : {buf:Array<GPUBuffer>,own:Array<boolean>,bg:GPUBindGroup}
	{
		return null;
	}
	StorageWrite(_shader : CShader,_uni : CUniform,_value : any)
	{
	}
	BuildComputeLayout(_shader : CShader,d : GPUDevice) :
		{uni:GPUBindGroupLayout,tex:GPUBindGroupLayout,st:GPUBindGroupLayout,stN:number,pl:GPUPipelineLayout}
	{
		return null;
	}
	override ComputeDispatch(_shader : CShader,_count : number) : boolean
	{
		return false;
	}
	override SetUniToSam2D(_vf : CShader,_key : string,_buf : Float32Array)
	{
	}
	GetMipPipeline(_format : GPUTextureFormat) : GPURenderPipeline
	{
		return null;
	}
	GenMipmap(_gt : GPUTexture,_format : GPUTextureFormat,_levels : number,_layers : number)
	{
	}
	//GL End의 generateMipmap 자리. 프레임 인코더가 제출된 뒤에 만들어야 이번 프레임 내용이 들어간다
	mRTMipSet=new Set<CTexture>();
	mEnvBlurBusy=false;
	mEnvBlurAgain=false;
	//프레임 제출 전에 읽으면 이번 프레임에 그린 환경맵이 아직 반영되지 않아서, 요청만 받아두고 End 에서 제출 뒤에 돌린다
	mEnvBlurKey : string=null;
	//읽는 동안 환경맵이 다시 그려지면 이미 읽은 옛 내용으로 만든 블러가 새 내용을 덮어쓰지 않도록 세대를 센다
	mEnvBlurSerial=0;
	override BlurEnvmap(_texKey : string,_updatedLayers : Set<number>)
	{
	}
	BlurEnvmapRun(_texKey : string)
	{
	}
	async BlurEnvmapAsync(_tex : CTexture)
	{
	}
	GetSampler(_tex : CTexture) : GPUSampler
	{
		return null;
	}
	TexKind(_target : number) : string
	{
		return "";
	}
	GetTexView(_gt : GPUTexture,_dim : GPUTextureViewDimension) : GPUTextureView
	{
		return null;
	}
	TexGts(_shader : CShader) : Array<GPUTexture>
	{
		return null;
	}
	/** group(1) 항목과, 바인드그룹 재사용 여부를 가를 지문(슬롯별 실제 GPUTexture)을 같이 만든다 */
	TexEntries(_shader : CShader) : {entries:Array<GPUBindGroupEntry>,gts:Array<GPUTexture>}
	{
		return null;
	}
	GetTexBindGroup(_shader : CShader,_layout : GPUBindGroupLayout) : GPUBindGroup
	{
		return null;
	}
}

import CRenderer_imple from "../render_imple/CRenderer.js";
CRenderer_imple();
