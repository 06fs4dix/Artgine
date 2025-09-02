
import {CMat} from "../../../geometry/CMat.js"
import {CVec3} from "../../../geometry/CVec3.js"
import {CVec4} from "../../../geometry/CVec4.js"

import {CBound} from "../../../geometry/CBound.js"
import {CMath} from "../../../geometry/CMath.js"
import {CMeshDrawNode} from "../../../render/CMeshDrawNode.js"
import {CShader} from "../../../render/CShader.js"
import {CMeshCreateInfo} from "../../../render/CMeshCreateInfo.js"

import {CRenderPass} from "../../../render/CRenderPass.js"
import {CTexture} from "../../../render/CTexture.js"
import {CShaderAttr} from "../../../render/CShaderAttr.js"
import {CJSON} from "../../../basic/CJSON.js"
import {CDevice} from "../../../render/CDevice.js"
import { CBatch } from "../../../render/CBatchMgr.js"
import {CH5Canvas} from "../../../render/CH5Canvas.js"

import {CWASM} from "../../../basic/CWASM.js"
import { SDF } from "../../../z_file/SDF.js"
import {CComponent} from "../CComponent.js"
import {CSubject} from "../../subject/CSubject.js"
import {CColor,  CAlpha, CColorVFX } from "../CColor.js"
import {CHash} from "../../../basic/CHash.js"
import { CCamera } from "../../../render/CCamera.js"
import { CLoaderOption } from "../../../util/CLoader.js"
import { CObject, CPointer } from "../../../basic/CObject.js"
import { CUtilObj } from "../../../basic/CUtilObj.js"
import { CPoolGeo } from "../../../geometry/CPoolGeo.js"
import { CUtilMath } from "../../../geometry/CUtilMath.js"
import { CClass } from "../../../basic/CClass.js"
import { CAlert } from "../../../basic/CAlert.js"
import { CRPAuto } from "../../CRPMgr.js"
import { CVec1 } from "../../../geometry/CVec1.js"

export class CRenPaint
{
    public mRenInfoKey : string = null;
    public mCam : CCamera=null;
    public mShow=0;
    public mPaint : CPaint;

    public mTexHash : number;
    public mDistance : number = null;
    public mAlpha : number=null;
}
/*
[Texture]
2D 텍스쳐는 텍스쳐 넣는 순서로 조정
-[0] : 디퓨즈
-[1] : 노말

3D는 파싱시 ref로 조정된다. 수동은 아래와 같음
-texOff.x 디퓨즈 오프셋
-texOff.y 노말
-texOff.z 특수

=노말 정보
RGB : XYZ
A : 깊이(페럴렉스용)

=특수 정보
R : AO(ambient occlusion)
G : 매끄러움->거칠음(roughness
B : 비금속->금속 (metallic
A : emisive
[Material]
AO(1),roughness(-1),metalric(-1),emisive(1)

-1 : 텍스쳐 사용(기본값은 1로 세팅됌)
0~1 :  직접 사용



*/
export class CPaint extends CComponent 
{

	protected mFMat : CMat;//= new CMat();
	protected mLMat : CMat;//= new CMat();

	protected mShaderAttrMap=new Map<string,CShaderAttr>();
	protected mColorModel  : CColor;
	protected mAlphaModel  : CAlpha;
	protected mColorVFX  : CColorVFX;

	public mAutoRPUpdate=true;
	public mCamCullUpdate=true;
	
	protected mBound = new CBound();
	
	protected mBoundFMat : CBound;// = new CBound();
	public mBoundFMatC : CVec3;
	public mBoundFMatR = 0;

	protected mRenderPass=new Array<CRenderPass>();
	mRenPT=new Array<CRenPaint>();

	protected mTexture=new Array<string>();
	public mMaterial=new CVec4(1,-1,-1,1);
	
	protected mUpdateLMat=true;
	protected mUpdateFMat=true;
	private mDefaultAttr=new Set<string>();
	public mTag=new Set<string>();
	public mTagKey=null;
	public mBatchMap=new Map<string,Array<CBatch>>();
	//public mBatchLastArr : Array<CBatch>=null;
	//public mBatchLastVF : string=null;
	public mAutoLoad=new CLoaderOption();
	
	//public m_init=false;
	
	public mAlphaTex : boolean = false;

	constructor()
	{
		super();
		this.mSysc=CComponent.eSysn.Paint;
		this.mShaderAttrMap.set("colorModel",new CShaderAttr("colorModel",new CColor(0,0,0,SDF.eColorModel.None)));
		this.mShaderAttrMap.set("alphaModel",new CShaderAttr("alphaModel",new CAlpha(0,SDF.eAlphaModel.None)));
		//this.m_shaderAttrMap.set("CVLS",new CShaderAttr("CVLS",new CVec4(0,0,0,0,this)));
		this.mColorModel=this.mShaderAttrMap.get("colorModel").mData;
		this.mAlphaModel=this.mShaderAttrMap.get("alphaModel").mData;
		
		this.mColorVFX=null;
		
		this.mBoundFMatC=new CVec3(0,0,0);
		this.mBoundFMatC.NewWASM();
		this.mFMat=new CMat(null);
		this.mFMat.NewWASM();
		this.mLMat=new CMat(null);
		this.mLMat.NewWASM();
		
		this.mBoundFMat=new CBound();
		this.mBoundFMat.NewWASM();
		this.mBound=new CBound();
		this.mBound.NewWASM();
	}
	SetEnable(_val: boolean): void {
		super.SetEnable(_val);
		this.BatchClear();
	}
	GetColorModel(){	return this.mColorModel;	}
	GetAlphaModel(){	return this.mAlphaModel;	}
	Icon(){		return "bi bi-paint-bucket";	}
	RegistHeap(_F32A : Float32Array)
	{
		//this.m_heap.Push(_F32A);
	}
	Destroy(): void {
		super.Destroy();
		this.mBoundFMatC.ReleaseWASM();
		this.mFMat.ReleaseWASM();
		this.mLMat.ReleaseWASM();
		this.mBoundFMat.DeleteWASM();
		this.mBound.DeleteWASM();
		this.BatchClear();
	}
	//GetBillboad()	{	return this.m_billboad;	}


	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_type==CObject.eShould.Editer && this.IsProxy()==false)
		{
			if(_member=="mColorModel" || _member=="mAlphaModel" || _member=="mColorVFX" )
					return true;
		}

		
	

		
		if(_member=="mFMat" ||  _member=="mUpdateLMat" || _member=="mUpdateFMat" ||
			 _member=="mRenPT"  || _member=="mTagKey" ||
			_member=="mDefaultAttr" || _member=="mBatchMap" || _member=="mBatchLastArr" || _member=="mBatchLastVF" || 
			_member=="mBoundFMat" || _member=="mBoundFMatC" || _member=="mBoundFMatR" ||
			_member=="mAutoRPUpdate" || _member=="mCamCullUpdate" ||
			_member=="mColorModel" || _member=="mAlphaModel" || _member=="mColorVFX" )
				return false;
		// if(_type==CObject.eShould.Proxy)
		// {
		// 	if(_member=="mTexture" || _member=="mLMat")
		// 		return false;
		// }
		
		return super.IsShould(_member,_type);
	}
	BatchClear()
	{
		for(let ren of this.mRenPT)
		{
			if(ren!=null)
			{
				ren.mDistance=-0x7f000000;
				ren.mShow=null;
			}
				
		}

		this.mRenPT=[];
		for(let key of this.mBatchMap.keys())
		{
			this.mBatchMap.set(key,null);
		}
		this.mCamCullUpdate=true;
		//this.mBatchLastVF=null;
	}
	IsUpdateFMat()	{	return this.mUpdateFMat;}
	UpdateFMat()	{	this.mUpdateFMat=true;	}
	
	
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		if(_pointer.member=="mColorVFX" && this.mColorVFX==null)
		{
			let btn=document.createElement("button");
			btn.innerText="생성";
			btn.onclick=()=>{
				this.mShaderAttrMap.set("colorVFX",new CShaderAttr("colorVFX",new CColorVFX([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])));
				this.mColorVFX=this.mShaderAttrMap.get("colorVFX").mData;
				this.PushTag("vfx");
				this.BatchClear();
				this.EditRefresh();
			};
			_body.append(btn);
		}
		else if(_pointer.member=="mTexture" || _pointer.member=="mTag")
		{
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[""],true);
			if(_pointer.member=="mTag")
			{
				_body.append(CUtilObj.ArrayAddButton(_pointer,"Light","light"));
			}
		}
		
	}
	SetOwner(_obj :CSubject)
	{
		super.SetOwner(_obj);
		this.ClearCRPAuto();
		this.SetTexture(this.mTexture);
	}
	//public m_material=new CVec4(1,0,0,0);
	SetMaterial(roughness=-1, metalric=-1,emissive=1,ambientOcclusion=1)
	{
		this.mMaterial.x=ambientOcclusion;
		this.mMaterial.y=roughness;
		this.mMaterial.z=metalric;
		this.mMaterial.w=emissive;
	}
	AlphaState()
	{
		if(this.mAlphaTex || (this.mAlphaModel.y==0 && this.mAlphaModel.x!=0) || 
						(this.mAlphaModel.y>0.5 && this.mAlphaModel.x!=1))
			return true;
		return false;
	}
	
	UpdateRenPt()
	{
		for(let i=0;i<this.mRenPT.length;++i)
		{
			let ren=this.mRenPT[i];
			if(ren.mShow==2)
				ren.mShow=0;
		
			if(this.mOwner.IsEnable()==false || this.IsEnable()==false)
			{
				ren.mShow=2;
				ren.mDistance=-0x70000000;
			}	
			//중간 배치 삭제하면 컬링 갱신안되는 버그가 있다
			//카메라를 움직이면 정산이됌
			else if(ren.mDistance==0 || ren.mCam.mUpdateMat!=0 || this.mUpdateFMat || this.mOwner.GetFrame().Win().IsResize())
			{
				let cam=ren.mCam;
				let plane=ren.mCam.GetPlane();

				if(ren.mDistance!=null)
				{
					let eye=ren.mCam.GetEye();
					let pos=CPoolGeo.ProductV3();
					if(this.mRenderPass[i].mSort==CRenderPass.eSort.None)
					{
						ren.mDistance=null;
					}
					else if(cam.GetView().z<-0.98) 
					{
						ren.mDistance = eye.z - this.mFMat.z;
					}
					else 
					{
						pos.mF32A[0]=this.mFMat.mF32A[12];
						pos.mF32A[1]=this.mFMat.mF32A[13];
						pos.mF32A[2]=this.mFMat.mF32A[14];
						ren.mDistance = CMath.V3DistancePseudo(eye, pos);
						
					}
					CPoolGeo.RecycleV3(pos);
					
				}
				
			
				//let camOff=_cam.Offset();
				//강제로 모든 오브젝트는 컬링을 처리하게 함
				if(CUtilMath.PlaneSphereInside(plane,this.mBoundFMatC,this.mBoundFMatR,null) || this.mRenderPass[i].mCullFrustum==false)
					ren.mShow=0;
				else
				{
					ren.mShow=1;
					ren.mDistance=-0x70000000;
				}
					
			}
		}
	}
	
	//이 함수에 목적을 모르겟음.....
	Refresh()
	{
		
		//this.m_shaderAttrMap.set("colorModel",new CShaderAttr("colorModel",new CColor(0,0,0,SDF.eColorModel.None,this)));
		//this.m_shaderAttrMap.set("alphaModel",new CShaderAttr("alphaModel",new CAlpha(0,SDF.eAlphaModel.None,this)));
		
		this.mColorModel=this.mShaderAttrMap.get("colorModel").mData;
		this.mAlphaModel=this.mShaderAttrMap.get("alphaModel").mData;

		if(this.mColorModel.mModel!=SDF.eColorModel.None)
			this.PushTag("color");
		if(this.mColorModel.mModel!=SDF.eAlphaModel.None)
			this.PushTag("color");


		if(this.mShaderAttrMap.get("colorVFX")!=null)
			this.mColorVFX=this.mShaderAttrMap.get("colorVFX").mData;

		
		//this.m_alphaCut=this.m_shaderAttrMap.get("alphaCut");
		
	}
	//내꺼를 내보냄 export
	override Export(_copy=true,_resetKey=true)	: this
	{	
		let dummy=CClass.New(this) as CPaint;
		dummy.Import(this);

		if(_copy==false)
		{
			for(let key of dummy.mShaderAttrMap.keys())
			{
				dummy.mShaderAttrMap.get(key).mData=this.mShaderAttrMap.get(key).mData;
			}
			for(let i=0;i<this.mRenderPass.length;++i)
			{
				for(let j=0;j<this.mRenderPass[i].mShaderAttr.length;++j)
				{
					dummy.mRenderPass[i].mShaderAttr[j].mData=this.mRenderPass[i].mShaderAttr[j].mData;
				}
			}
			
		}
		
		
		dummy.Refresh();
		return dummy as this;
	}
	SetAutoLoad(_option : boolean|CLoaderOption)
	{
		if(typeof _option=="boolean")
		{
			if(_option)
				this.mAutoLoad=new CLoaderOption();
			else
				this.mAutoLoad=null;
		}
		else
			this.mAutoLoad=_option;
	}
	//target에 값을 복사함 import
	override Import(_target : CObject)
	{
		super.Import(_target);
		this.Refresh();
	}
	
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);

		if(_pointer.IsRef(this.mTexture))
		{
			this.SetTexture(this.mTexture);
			this.BatchClear();
			//this.ClearCRPAuto();
			//this.WTRefresh();
		}
		else if(_pointer.IsRef(this.mTag))
		{
			this.mTagKey=null;
			this.BatchClear();
			//this.ClearCRPAuto();
			//this.WTRefresh();
		}
		else if(_pointer.member=="mColorModel" || _pointer.member=="mAlphaModel")
		{
			this.PushTag("color");
			this.BatchClear();
		}
		else if(_child)
		{
			if(_pointer.IsRef(this.mRenderPass))
			{
				
				//this.BatchClear();
				this.ClearCRPAuto();
				if(_pointer.Get() instanceof CRenderPass)
					_pointer.target.Reset();
				else
					CAlert.E("CRPAuto는 페인트 내에서 수정 불가합니다.");
				
			}
			else if(_pointer.IsRef(this.mAlphaModel))
			{
				
				this.PushTag("color");
				this.ClearCRPAuto();
			}
			else if(_pointer.IsRef(this.mColorModel))
			{
				this.PushTag("color");
				this.ClearCRPAuto();
			}
			else if(_pointer.IsRef(this.mColorVFX))
			{
				this.PushTag("vfx");
				
			}
		}
	}
	
	PushCRPAuto(_rpc : CRPAuto)
	{

		var pChk=true;
		for(var rp of this.mRenderPass)
		{
			if(rp.Key()==_rpc.Key())
				pChk=false;
		}	
		if(pChk)
		{
			if(_rpc.mCopy==false)
				this.mRenderPass.push(_rpc);
			else
			{
				this.mRenderPass.push(_rpc.Export());
			}
			this.mRenPT.push(null);
			//return true;
		}
			
		//return false;
	}
	ClearCRPAuto()
	{
		this.BatchClear();
		for(var i=0;i<this.mRenderPass.length;++i)
		{
			if(this.mRenderPass[i] instanceof CRPAuto)
			{
				this.mRenderPass.splice(i,1);
				i--;
			}
				
		}
		
		this.mAutoRPUpdate=true;
	}
	EmptyRPChk()
	{

	}

	ClassEqual(_type)	{	return _type == CPaint;	}
	//GetCamera()	{	return this.m_cam;	}
	GetTag()	{	return this.mTag;	}
	PushTag(_tag : string)	
	{
		this.mTag.add(_tag);
		this.mTagKey=null;
	}
	RemoveTag(_tag : string)	
	{
		this.mTag.delete(_tag);
		this.mTagKey=null;
	}
	GetDrawMesh(_meshKey : string,_shader : CShader,_ci : CMeshCreateInfo)
	{
		var drawMesh = this.mOwner.GetFrame().Res().Find(_meshKey+ _shader.ObjHash()) as CMeshDrawNode;
		if (drawMesh == null)
		{
			drawMesh=new CMeshDrawNode();
		
			this.mOwner.GetFrame().Ren().BuildMeshDrawNodeAutoFix(drawMesh, _shader,_ci);
			this.mOwner.GetFrame().Res().Push(_meshKey + _shader.ObjHash(),drawMesh);
		}
		
		return drawMesh;
	}
	GetTagKey()	
	{
		if(this.mTagKey==null)
		{
			let key="";
			let sortedArr = Array.from(this.mTag);
			sortedArr.sort();
			this.mTag = new Set(sortedArr);
			for(var each0 of this.mTag)
			{
				if(each0=="")	continue;
				key+=each0+"/";
			}
			this.mTagKey=key;
		}
		

		return this.mTagKey;	
	}
	Light()	
	{	
		this.PushTag("light");
	}
	Shadow()	
	{	
		this.PushTag("shadow");
	}
	AlphaCut()	
	{	
		this.PushTag("alphaCut");
	}
	

	
	GetRenderPass()	{	return this.mRenderPass;	}
	PushRenderPass(_rp : CRenderPass);
	PushRenderPass(_rp : Array<CRenderPass>);
	PushRenderPass(_rp : Array<CRenderPass>,_copy : boolean);
	PushRenderPass(_rp : CRenderPass,_copy : boolean);
	PushRenderPass(_rp : any,_copy=true)
	{
		this.mDefaultAttr=new Set<string>();
		this.mRenderPass=new Array();	

		this.BatchClear();
		if(_rp instanceof Array)
		{
			for(let each0 of _rp as Array<CRenderPass>)
			{
				if(_copy)
					this.mRenderPass.push(each0.Export());
				else
					this.mRenderPass.push(each0);
					
			}
			return this.mRenderPass;
		}
		else
		{
			var rp : CRenderPass=null;
			if(_copy)
				rp=_rp.Export(_copy);				
			else
				rp=_rp;
			
			this.mRenderPass.push(rp);
			return this.mRenderPass[this.mRenderPass.length-1];
		}
		
		
		return null;	
	}

	PushCShaderAttr(_sa : CShaderAttr)
	{
		let attr=this.mShaderAttrMap.get(_sa.mKey);
		if(attr==null)
		{
			this.BatchClear();
			this.mShaderAttrMap.set(_sa.mKey,_sa);
		}
		else
			attr.Import(_sa);
		
		
	}
	FindCShaderAttr(_key : string)
	{
		return this.mShaderAttrMap.get(_key);
	}
	// SetRGBA(r : number,g : number,b : number,a : number);
	SetRGBA(_rgba : CVec4)
	{
		this.mColorModel.mF32A[0]=_rgba.mF32A[0];
		this.mColorModel.mF32A[1]=_rgba.mF32A[1];
		this.mColorModel.mF32A[2]=_rgba.mF32A[2];
		this.mColorModel.mF32A[3]=SDF.eColorModel.RGBAdd;
		this.mAlphaModel.mF32A[0]=_rgba.mF32A[3];
		this.mAlphaModel.mF32A[1]=SDF.eAlphaModel.Add;
		if(this.mTag.has("color")==false)
			this.BatchClear();
		this.PushTag("color");
	}
	SetColorModel(_color : CColor)
	{
		this.mColorModel.mF32A[0]=_color.mF32A[0];
		this.mColorModel.mF32A[1]=_color.mF32A[1];
		this.mColorModel.mF32A[2]=_color.mF32A[2];
		this.mColorModel.mF32A[3]=_color.mF32A[3];

		if(this.mTag.has("color")==false)
			this.BatchClear();
		this.PushTag("color");
	}
	SetAlphaModel(_alpha : CAlpha)
	{
		let as=this.AlphaState();
		this.mAlphaModel.mF32A[0]=_alpha.mF32A[0];
		this.mAlphaModel.mF32A[1]=_alpha.mF32A[1];
		if(as!=this.AlphaState())
			this.ClearCRPAuto();
		if(this.mTag.has("color")==false)
			this.BatchClear();
		this.PushTag("color");
	}
	
	
	SetColorVFX(_offset : number,_v : CVec4);
	SetColorVFX(_vfx : CColorVFX);
	SetColorVFX(_a : any,_b : any=null)
	{
		if(this.mColorVFX==null)
		{
			this.mShaderAttrMap.set("colorVFX",new CShaderAttr("colorVFX",new CColorVFX([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])));
			this.mColorVFX=this.mShaderAttrMap.get("colorVFX").mData;
			this.PushTag("vfx");
			this.BatchClear();
		}
		if(_a instanceof CColorVFX)
		{
			this.mColorVFX.Import(_a);
		}
		else
		{
			let cv=this.mColorVFX;
			cv.SetV4(_a,_b);
		}
		this.PushTag("vfx");
	}
	GetColorVFX(_offset : number)
	{
		if(this.mColorVFX==null)
		{
			this.mShaderAttrMap.set("colorVFX",new CShaderAttr("colorVFX",new CColorVFX([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])));
			this.mColorVFX=this.mShaderAttrMap.get("colorVFX").mData;
			this.PushTag("vfx");
			this.BatchClear();
		}
		let cv=this.mColorVFX;
		return cv.GetV4(_offset);
	}
	
	GetRGBA() : CVec4
	{
		return new CVec4(this.mColorModel.x, this.mColorModel.y, this.mColorModel.z, this.mAlphaModel.x);
	}
	
	GetLMat() {	return this.mLMat;	};
	SetLMat(_mat : CMat)	{	this.mLMat.Import(_mat);	this.mUpdateLMat=true;}
	
	CacBound()
	{
		if(this.mFMat.Ptr()==null)
		{
			
			this.mBoundFMat.mMin.mF32A[0]=this.mBound.mMin.mF32A[0]*this.mFMat.mF32A[0];
			this.mBoundFMat.mMin.mF32A[1]=this.mBound.mMin.mF32A[1]*this.mFMat.mF32A[5];
			this.mBoundFMat.mMin.mF32A[2]=this.mBound.mMin.mF32A[2]*this.mFMat.mF32A[10];
			this.mBoundFMat.mMax.mF32A[0]=this.mBound.mMax.mF32A[0]*this.mFMat.mF32A[0];
			this.mBoundFMat.mMax.mF32A[1]=this.mBound.mMax.mF32A[1]*this.mFMat.mF32A[5];
			this.mBoundFMat.mMax.mF32A[2]=this.mBound.mMax.mF32A[2]*this.mFMat.mF32A[10];
			
			
			

			this.mBoundFMat.mMin.mF32A[0]+=this.mFMat.mF32A[12];
			this.mBoundFMat.mMin.mF32A[1]+=this.mFMat.mF32A[13];
			this.mBoundFMat.mMin.mF32A[2]+=this.mFMat.mF32A[14];

			this.mBoundFMat.mMax.mF32A[0]+=this.mFMat.mF32A[12];
			this.mBoundFMat.mMax.mF32A[1]+=this.mFMat.mF32A[13];
			this.mBoundFMat.mMax.mF32A[2]+=this.mFMat.mF32A[14];

			
			


			this.mBoundFMat.GetCenter(this.mBoundFMatC);

			
			var maxX = Math.abs(this.mBoundFMat.mMax.mF32A[0] - this.mBoundFMatC.mF32A[0]);
			var maxY = Math.abs(this.mBoundFMat.mMax.mF32A[1] - this.mBoundFMatC.mF32A[1]);
			var maxZ = Math.abs(this.mBoundFMat.mMax.mF32A[2] - this.mBoundFMatC.mF32A[2]);

			var maxAll=CMath.Max(CMath.Max(maxX, maxY), maxZ);
			this.mBoundFMatR=maxAll;
		}
		else
		{
			this.mBoundFMatR=CWASM.BoundMulMat(this.mBoundFMat.mMin.Ptr(),this.mBoundFMat.mMax.Ptr(),this.mBound.mMin.Ptr(),this.mBound.mMax.Ptr(),
			this.mFMat.Ptr(),this.mBoundFMatC.Ptr());
		}
	
		this.mBoundFMatR*=1.5;
	}
	Prefab(_owner : CSubject)
	{
		if(this.mAutoLoad!=null)
		{
			for(let texKey of this.mTexture)
			{
				if(texKey.indexOf(".atl")!=-1)	continue;
				_owner.GetFrame().Load().Load(texKey,this.mAutoLoad);
			}
		}
	}
	Start()
	{
		this.InitPaint();
		if(this.mTexture.length>0)
			this.SetTexture(this.mTexture);
	}
	Update(_delay)
	{
		
		if(this.mUpdateFMat)	this.mUpdateFMat=false;
		if(this.mUpdateLMat || this.mOwner.mUpdateMat!=0 || this.mBoundFMatR==0)
		{
			CMath.MatMul(this.mLMat,this.mOwner.GetWMat(),this.mFMat);
			this.CacBound();
			this.mUpdateFMat=true;
		}

		this.mUpdateLMat=false;
	}
	SetFMat(_fmat)
	{
		this.mFMat.Import(_fmat);
	}
	GetFMat()	{	return this.mFMat;	}
	SetToolCPaint(_input,_type)
	{
		
	}	
	Common(_vf : CShader)
	{
		
		if(this.mDefaultAttr.has(_vf.mKey)==false)
		{
			for(let each0 of _vf.mDefault)
			{
				var type=_vf.mUniform.get(each0.mKey).type;
				if(each0.mTag==null || each0.mTag!="paint")
					continue;

 
				if(this.mShaderAttrMap.get(each0.mKey)==null)
					this.mOwner.GetFrame().BMgr().SetBatchSA(each0);
			}
			this.mDefaultAttr.add(_vf.mKey);
		}
		for(let each0 of this.mShaderAttrMap.values())
		{
			this.mOwner.GetFrame().BMgr().SetBatchSA(each0);
		}	
		
		
	}
	
	
	GetBound()
	{
		return this.mBound;
	}
	GetBoundFMat()
	{
		return this.mBoundFMat;
	}
	SetBound(_bound)
	{
		this.mBound=_bound;
		this.mBoundFMatR=0;
	}
	Render(_vf : CShader)	{} 
	RenderBatch(_vf : CShader,_count=1)
	{
		let bcm=this.mOwner.GetFrame().BMgr().IsBatchMap();
		// if(this.mBatchLastVF==_vf.mKey && bcm)
		// 	return this.mOwner.GetFrame().BMgr().BatchPushArr(this.mBatchLastArr);
		var barr=this.mBatchMap.get(_vf.mKey);
		if(barr==null)
		{
			barr=new Array<CBatch>(_count);
			this.mBatchMap.set(_vf.mKey,barr);
			barr.length=_count;
			// this.mBatchLastArr=barr;
			// this.mBatchLastVF=_vf.mKey;
		}
		else if(bcm==false){}
		else if(barr.length>0)
		{
			return this.mOwner.GetFrame().BMgr().BatchPushArr(barr);
		}
		return barr;
	} 
	
	SetTexture(_a : Array<string>);
	SetTexture(_a : string);
	SetTexture(_a : string,_b : string);
	SetTexture(_a : string,_b : string,_c : string);
	SetTexture(_a : string,_b : string,_c : string,_d : string);
	SetTexture(_a : string,_b : string,_c : string,_d : string,_e : string);
	SetTexture(_a,_b=null,_c=null,_d=null,_e=null)
	{
		if(_a instanceof Array)
		{
			if(_a != this.mTexture)
			{
				this.mTexture.length=0;
				for(var i=0;i<_a.length;++i)
					this.mTexture.push(_a[i]);
			}
			
		}
		else
		{
			//this.m_texture=new Array();
			this.mTexture.length=0;
			this.mTexture.push(_a);
			if(_b!=null)	this.mTexture.push(_b);
			if(_c!=null)	this.mTexture.push(_c);
			if(_d!=null)	this.mTexture.push(_d);
			if(_e!=null)	this.mTexture.push(_e);
		}
		for(let each0 of this.mBatchMap.values())
		{
			if(each0!=null)
			{
				for(let i=0;i<each0.length;++i)
				{
					let bh=each0[i];
					//배치에 키만 재생성
					if(bh!=null)	bh.CreateKey();
				}
			}
			
			
		}

		if(this.mAutoLoad!=null && this.mOwner!=null && this.mOwner.GetFrame()!=null)
		{
			for(let texKey of this.mTexture)
			{
				if(texKey.indexOf(".atl")!=-1 || texKey.indexOf("base64")!=-1 ||texKey.indexOf(".tex")!=-1)	continue;
				
				let tex=this.mOwner.GetFrame().Res().Find(texKey);
				if(tex!=null && tex instanceof CTexture)
				{
					if(tex.GetAlpha()) {
						this.mAlphaTex = true;
					}
					continue;
				}

				if(this.mOwner.GetFrame().Load().IsLoad(texKey)==false)
					this.mOwner.GetFrame().Load().Load(texKey,this.mAutoLoad);
			}
		}
		
	}
	GetTexture() {	return this.mTexture;	}
	GetTexHash() 
	{
		let str="";
		let hash=0;
		for(let texKey of this.mTexture)
		{
			str+=texKey;
		}
		hash=CHash.HashCode(str);
		// 특정 비트 영역만 유지 (0x000fffff 마스킹) 
		hash = 0xffff & hash;

		let floatHash = hash * 0.000000001; // 예: 0.000065535

		const precision = 1e9; // 9자리 정밀도
		return Math.floor(floatHash * precision) / precision;
	}

	InitPaint()
	{
		this.mColorModel=this.mShaderAttrMap.get("colorModel").mData;
		this.mAlphaModel=this.mShaderAttrMap.get("alphaModel").mData;
		if(this.mShaderAttrMap.get("colorVFX")!=null)
			this.mColorVFX=this.mShaderAttrMap.get("colorVFX").mData;
	
	}
}
