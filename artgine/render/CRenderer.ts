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
import {CDevice} from "./CDevice.js";
import {CH5Canvas,  CH5CMDList } from "./CH5Canvas.js";
import {CImgPro} from "./CImgPro.js";
import {CMesh} from "./CMesh.js";
import {CMeshCreateInfo} from "./CMeshCreateInfo.js";
import {CMeshDataNode} from "./CMeshDataNode.js";
import {CMeshDrawNode} from "./CMeshDrawNode.js";
import {CShader,  CShaderList, CVertexFormat } from "./CShader.js";
import {CShaderAttr} from "./CShaderAttr.js";
import { CShaderInterpret } from "./CShaderInterpret.js";
import {CTexture,  CTextureInfo } from "./CTexture.js";
import { CUniform } from "./CUniform.js";
import {CUtilRender} from "./CUtilRender.js";
import { CModal } from "../basic/CModal.js";
import { CUtilWeb } from "../util/CUtilWeb.js";
import { CDOM } from "../basic/CDOM.js";

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
		this.mUniToSam2dArr.SetFilter(CTexture.eFilter.Linear);
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
		CH5Canvas.Draw(_ch5json.mCMD);
		let tex=CH5Canvas.GetNewTex();
		this.mRes.Push(_ch5json.mKey+".tex",tex);
		this.BuildTexture(tex);

		return _ch5json.mKey+".tex";
	}
	BlitDepth(_read : CTexture,_draw : CTexture=null){	}
	BlitColor(_read : CTexture,_draw : CTexture=null){}
	Begin(_tex : CTexture=null,_surface=false,_rtUse:Set<number>=null,_rtLevel=0){	return false;	}
	End(_tex : CTexture=null,_rtUse :Set<number>=null,_rtLevel=0){}
	
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
	override End(_tex : CTexture=null,_rtUse :Set<number>,_rtLevel=0)
	{
		
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
		function TOW_POWER_CHK(pa_x, pa_y)
		{
			switch (pa_x)
			{
			case 1:case 2:case 4:case 8:case 16:case 32:case 64:case 128:case 256:
			case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:
				break;
			default:
				return true;
			}
			switch (pa_y)
			{
			case 1:case 2:case 4:case 8:case 16:case 32:case 64:case 128:case 256:
			case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:
				break;
			default:
				return true;
			}
			return false;
			//return ((pa_x%2)==0 && (pa_y%2)==0)?false:true;
		}
        pa_tex.mUpdate.clear();
        var internalformat = Number(this.mDev.GL().RGBA8);
        var fmt1 = Number(this.mDev.GL().RGBA);
        var fmt2 = Number(this.mDev.GL().UNSIGNED_BYTE);
        
        if (TOW_POWER_CHK(pa_tex.GetWidth(), pa_tex.GetHeight()) && pa_tex.GetWrap() != CTexture.eWrap.Clamp)
        {
            //pa_tex.SetWrap(CTexture.eWrap.Clamp)
            //pa_tex.SetMipMap(CTexture.eMipmap.None);
            CAlert.W("2제곱 텍스쳐가 아니면 클램프로 지정해주세요!(d_TexWClamp)");
        }
        var info=pa_tex.GetInfo();
        var gbufArr : Array<any>=pa_tex.GetGBuf();
        
        for(var i=0;i<info.length;++i)
        {
            if(info[i].mCount>1 && info[i].mTarget==CTexture.eTarget.Sigle)
            {
                    CAlert.E("CTex target single count miss!");
            }
            if (info[i].mFormat == CTexture.eFormat.RGBA32F)
            {
                if(typeof this.mDev.GL().RGB32F == 'undefined')
                {
                    alert("RGBA32F not support");
                }
    
                if (CDevice.GetProperty(CDevice.eProperty.FloatTex32)==0 || this.mPF.mTexture16f)
                {
                    internalformat = this.mDev.GL().RGBA16F; fmt1 = this.mDev.GL().RGBA; fmt2 = Number(this.mDev.GL().FLOAT);
                    
                }
                else
                {
                    internalformat = this.mDev.GL().RGBA32F; fmt1 = this.mDev.GL().RGBA; fmt2 = Number(this.mDev.GL().FLOAT);
                }
                //없어도 될거 같은데, 이상한 값넣어서 실수할까봐 넣어둠
                //if(pa_tex.GetBuf() instanceof Uint8Array)
                //	pa_tex.SetBuf(null);
                
                
            }
            else
            {
                internalformat = Number(this.mDev.GL().RGBA8);fmt1 = Number(this.mDev.GL().RGBA);fmt2 = Number(this.mDev.GL().UNSIGNED_BYTE);
            }
            
        
            if(gbufArr.length<=i)
            {
                gbufArr.push(this.mDev.GL().createTexture());
            }
                
            
            var type=Number(this.mDev.GL().TEXTURE_2D);
            if(info[i].mTarget==CTexture.eTarget.Array)
                type=this.mDev.GL().TEXTURE_2D_ARRAY;
            else if(info[i].mTarget==CTexture.eTarget.Cube)
                type=this.mDev.GL().TEXTURE_CUBE_MAP;
            
                

            this.mDev.GL().bindTexture(type, gbufArr[i]);
            var buf=null;
            if(pa_tex.GetBuf().length>=i && pa_tex.GetBuf().length>i)
                buf=pa_tex.GetBuf()[i];

            if(info[i].mTarget==CTexture.eTarget.Array)
            {
                this.mDev.GL().texImage3D(type, 0, internalformat, pa_tex.GetWidth(), pa_tex.GetHeight(),
                    info[i].mCount,0, fmt1, fmt2,buf);
            }
            else if(info[i].mTarget==CTexture.eTarget.Cube)
            {
                if(pa_tex.GetYFlip())   this.mDev.GL().pixelStorei(this.mDev.GL().UNPACK_FLIP_Y_WEBGL, true);
                if(pa_tex.GetWidth()!=pa_tex.GetHeight())
                {
                    CAlert.E("CTexture.eTarget.Cube Size Diffent!");
                }
                for(var j=0;j<6;++j)
                {
                    this.mDev.GL().texImage2D(this.mDev.GL().TEXTURE_CUBE_MAP_POSITIVE_X+j, 0, internalformat, 
                        pa_tex.GetWidth(), pa_tex.GetHeight(), 0, fmt1, fmt2, pa_tex.GetBuf()[j]);
                }
                if(pa_tex.GetYFlip())   this.mDev.GL().pixelStorei(this.mDev.GL().UNPACK_FLIP_Y_WEBGL, false);
            }
            else
            {
                if(pa_tex.GetYFlip())   this.mDev.GL().pixelStorei(this.mDev.GL().UNPACK_FLIP_Y_WEBGL, true);
                if(buf instanceof Image || buf instanceof HTMLVideoElement)
                    this.mDev.GL().texImage2D(type, 0, internalformat, fmt1, fmt2,buf);
                else
                    this.mDev.GL().texImage2D(type, 0, internalformat, pa_tex.GetWidth(), pa_tex.GetHeight(), 0, fmt1, fmt2,buf);
                if(pa_tex.GetYFlip())   this.mDev.GL().pixelStorei(this.mDev.GL().UNPACK_FLIP_Y_WEBGL, false);
            }
            
                
            
            if (TOW_POWER_CHK(pa_tex.GetWidth(), pa_tex.GetHeight())==false && pa_tex.GetMipMap()!=0)
            {
            
                
                if(pa_tex.GetMipMap()==CTexture.eMipmap.AlphaCac && pa_tex.GetWidth()==pa_tex.GetHeight())
                {
                    var mcount=1;
                    var ntex : CTexture=pa_tex;
                    while(true)
                    {
                        if(ntex.GetBuf()[0] instanceof Image)
                        {
                            let img=ntex.GetBuf()[0] as HTMLImageElement;
                            CH5Canvas.Init(img.width,img.height);
                            CH5Canvas.Draw(CH5Canvas.DrawImage(img,0,0));
                            ntex=CH5Canvas.GetNewTex();
                        }
                    
                        var w=ntex.GetWidth();
                        var h=ntex.GetHeight();
                        var buf2=ntex.GetBuf()[0];
                        if(w<=1 || h<=1)
                            break;
                        ntex=CImgPro.SqurEnlargedReduced(w,h,buf2,0.5,0.5,9);
                        this.mDev.GL().texImage2D(type, mcount, internalformat, ntex.GetWidth(), ntex.GetHeight(), 0, fmt1, fmt2,ntex.GetBuf()[0]);
                        mcount++;
                    }
                    


                }

                else if(pa_tex.GetMipMap()==CTexture.eMipmap.EnvFilter && pa_tex.GetWidth()==pa_tex.GetHeight() && info[i].mTarget == CTexture.eTarget.Cube)
                {
                    this.mDev.GL().generateMipmap(type);
                    if (pa_tex.GetBuf().length != 0) {
                        var ntex = pa_tex;
                        if (ntex.GetBuf()[0] instanceof Image) {
                            let img = ntex.GetBuf()[0];
                            CH5Canvas.Init(img.width, img.height);
                            CH5Canvas.Draw(CH5Canvas.DrawImage(img, 0, 0));
                            ntex = CH5Canvas.GetNewTex();
                            for (let face = 1; face < 6; face++) {
                                img = ntex.GetBuf()[face];
                                CH5Canvas.Init(img.width, img.height);
                                CH5Canvas.Draw(CH5Canvas.DrawImage(img, 0, 0));
                                ntex.GetBuf().push(CH5Canvas.GetNewTex().GetBuf()[0]);
                            }
                        }
                        const nTexArr = CImgPro.SphericalGaussianBlur(ntex);
                        for (let mip = 0; mip < Math.floor(Math.log2(pa_tex.GetWidth())) - 3; mip++) {
                            const w = ntex.GetWidth() >> mip;
                            const h = ntex.GetHeight() >> mip;
                            for (let face = 0; face < 6; face++) {
                                this.mDev.GL().texImage2D(this.mDev.GL().TEXTURE_CUBE_MAP_POSITIVE_X + face, mip, internalformat, w, h, 0, fmt1, fmt2, nTexArr[mip].GetBuf()[face]);
                            }
                        }
                    }
                    
                    
                }
                
                else
                    this.mDev.GL().generateMipmap(type);
            }
                
            else
                pa_tex.SetMipMap(CTexture.eMipmap.None);
            this.BindTexture(pa_tex,i);
            this.mDev.GL().bindTexture(type, null);

        }//for
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
	SetTexGBuf(_vf : CShader,_tex : CTexture,_btu : CTexUse,_offset : number=null,_texAtt : Array<boolean>=null) 
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
import CRenderer_imple from "../render_imple/CRenderer.js";
CRenderer_imple();