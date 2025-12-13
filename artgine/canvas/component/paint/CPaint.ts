
import { CMat, IMat } from "../../../geometry/CMat.js"
import { CVec3 } from "../../../geometry/CVec3.js"
import { CVec4 } from "../../../geometry/CVec4.js"

import { CBound } from "../../../geometry/CBound.js"
import { CMath } from "../../../geometry/CMath.js"
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js"
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js"
import { CShader } from "../../../render/CShader.js"

import { CBatch } from "../../../render/CBatchMgr.js"
import { CRenderPass } from "../../../render/CRenderPass.js"
import { CShaderAttr } from "../../../render/CShaderAttr.js"
import { CTexture } from "../../../render/CTexture.js"

import { CUpdate } from "../../../basic/Basic.js"
import { CAlert } from "../../../basic/CAlert.js"
import { CClass } from "../../../basic/CClass.js"
import { CDOM } from "../../../basic/CDOM.js"
import { CHash } from "../../../basic/CHash.js"
import { CObject, CPointer } from "../../../basic/CObject.js"
import { CUniqueID } from "../../../basic/CUniqueID.js"
import { CUtil } from "../../../basic/CUtil.js"
import { CUtilObj } from "../../../basic/CUtilObj.js"

import { CPoolGeo } from "../../../geometry/CPoolGeo.js"
import { CUtilMath } from "../../../geometry/CUtilMath.js"
import { CCamera } from "../../../render/CCamera.js"
import { CAtlas } from "../../../util/CAtlas.js"
import { CLoaderOption } from "../../../util/CLoader.js"
import { SDF } from "../../../z_file/SDF.js"
import { CRPAuto } from "../../CRPMgr.js"
import { CSubject } from "../../subject/CSubject.js"
import { CAlpha, CColor, CColorVFX } from "../CColor.js"
import { CComponent } from "../CComponent.js"
import { CJSON } from "../../../basic/CJSON.js"
import { CWASM } from "../../../basic/CWASM.js"
import { CBoundWorld, CBoundWorldPaint } from "../CBoundWorld.js"
import { CFrame } from "../../../util/CFrame.js"
import { CH5Canvas } from "../../../render/CH5Canvas.js"


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
var gBoundDummy=new CBound();
var gPosDummy=new CVec3();
gPosDummy.NewWASM();
export class CPaint extends CComponent implements IMat
{

	static eTag={
		Light:"light",
		//ShadowRead:"ShadowRead",
		//ShadowWrite:"ShadowWrite",
		ShadowReadOnly:"shadowReadOnly",
		Shadow:"shadow",
		Wind:"Wind",
		Parallax:"parallax",
		

	};

	mBW=new CBoundWorldPaint();
	protected mFMat : CMat;//= new CMat();
	protected mLMat : CMat;//= new CMat();

	protected mShaderAttrMap=new Map<string,CShaderAttr>();
	protected mColorModel  : CColor;
	protected mAlphaModel  : CAlpha;
	protected mColorVFX  : CColorVFX;
	protected mTexCodi : CVec4;

	public mAutoRPUpdate=true;
	public mCamCullUpdate=true;
	
	protected mBound = new CBound();
	//protected mBoundFMat : CBound;// = new CBound();

	//public mBoundFMatC : CVec3;
	//public mBoundFMatR = 0;

	protected mRenderPass=new Array<CRenderPass>();
	mRenPT=new Array<CRenPaint>();

	protected mTextureKey=new Array<string>();
	public mMaterial=new CVec4(1,-1,-1,1);
	
	protected mUpdateLMat=true;
	protected mUpdateFMat=true;
	private mDefaultAttr=new Set<string>();
	public mTag=new Set<string>();
	public mTagKey=null;
	public mBatchMap=new Map<CShader,Array<CBatch>>();
	//public mBatchLastArr : Array<CBatch>=null;
	//public mBatchLastVF : string=null;
	public mAutoLoad=new CLoaderOption();
	
	public mInit=false;
	
	public mAlphaTex : boolean = false;
	protected mWorldMatType=CMat.eType.PRS;

	constructor()
	{
		super();
		this.mSysc=CComponent.eSysn.Paint;
		this.mTexCodi=new CVec4(1,1,0,0);
		this.mShaderAttrMap.set("texCodi",new CShaderAttr("texCodi",this.mTexCodi));
		this.mShaderAttrMap.set("colorModel",new CShaderAttr("colorModel",new CColor(0,0,0,SDF.eColorModel.None)));
		this.mShaderAttrMap.set("alphaModel",new CShaderAttr("alphaModel",new CAlpha(0,SDF.eAlphaModel.None)));
		//this.m_shaderAttrMap.set("CVLS",new CShaderAttr("CVLS",new CVec4(0,0,0,0,this)));
		this.mColorModel=this.mShaderAttrMap.get("colorModel").mData;
		this.mAlphaModel=this.mShaderAttrMap.get("alphaModel").mData;
		
		
		this.mColorVFX=null;
		
		//this.mBW.m
		//this.mBoundFMatC=new CVec3(0,0,0);
		//this.mBoundFMatC.NewWASM();
		this.mFMat=new CMat(null);
		this.mFMat.NewWASM();
		this.mLMat=new CMat(null);
		this.mLMat.NewWASM();
		this.mBW.mPos.NewWASM();
		
		// this.mBoundFMat=new CBound();
		// this.mBoundFMat.NewWASM();
		this.mBound=new CBound();
		this.mBound.NewWASM();

		this.PushTag("alphaCut");
		if(gPosDummy.Ptr()==null)
			gPosDummy.NewWASM();
		
	}
	SetWorldType(_type)
	{
		this.mWorldMatType=_type;
		this.PushTag("worldType");
	}
	SetEnable(_val: boolean): void {
		super.SetEnable(_val);
		this.ClearCRPAuto();
	}
	GetColorModel(){	return this.mColorModel;	}
	GetAlphaModel(){	return this.mAlphaModel;	}
	Icon(){		return "bi bi-paint-bucket";	}
	RegistHeap(_F32A : Float32Array)
	{
		//this.m_heap.Push(_F32A);
	}
	SetTexCodi(_codi : CVec4) : void
	{
		if(this.PushTag("codi"))
			this.ClearBatch();
	
		this.mTexCodi.Import(_codi);
	}
	// GetMesh() : string
	// {
	// 	return null;
	// }
	Destroy(): void {

		if(this.GetRecycleType()!=null)
		{
			this.Recycle();
			this.Reset();
			return;
		}

		super.Destroy();

		

		//this.mBoundFMatC.ReleaseWASM();
		this.mBW.mPos.ReleaseWASM();
		this.mFMat.ReleaseWASM();
		this.mLMat.ReleaseWASM();
		//this.mBoundFMat.DeleteWASM();
		this.mBound.DeleteWASM();
		this.ClearBatch();
		
	}
	Reset()
	{
		super.Reset();
		this.mFMat.Unit();
		this.mLMat.Unit();
		this.ClearBatch();
		this.mTextureKey.length=0;
		//this.mBoundFMat.Reset();
		this.mBound.Reset();
		this.mBound.SetType(CBound.eType.Box);
		this.mBW.mBound.Reset();
		this.mBW.mRadian=0;
		this.mShaderAttrMap.delete("mColorVFX");
		this.mColorVFX=null;
		this.mTag.clear();
		this.mInit=false;
		this.PushTag("alphaCut");
		this.mBatchMap.clear();

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
			_member=="mBoundFMat" || _member=="mBoundFMatC" || _member=="mBoundFMatR" || _member=="mBound" ||
			_member=="mAutoRPUpdate" || _member=="mCamCullUpdate" || _member=="mBW" ||
			_member=="mColorModel" || _member=="mAlphaModel" || _member=="mColorVFX" )
				return false;
		// if(_type==CObject.eShould.Proxy)
		// {
		// 	if(_member=="mTexture" || _member=="mLMat")
		// 		return false;
		// }
		
		return super.IsShould(_member,_type);
	}
	ClearBatch()
	{
		for(let ren of this.mRenPT)
		{
			if(ren!=null)
			{
				ren.mDistance=0x7FFFFF00;
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
	UpdateLMat()	{	this.mUpdateLMat=true;	}
	
	override EditHTMLInit(_div: HTMLDivElement, _pointer?: CPointer): void {
		super.EditHTMLInit(_div,_pointer);

		var button=document.createElement("button");
		button.className="btn btn-primary btn-sm";
		button.innerText="Refresh";
		button.onclick=()=>{
			this.ClearCRPAuto();
		};
		_div.append(button);
	}
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
				this.ClearBatch();
				this.EditRefresh();
			};
			_body.append(btn);
		}
		else if(_pointer.member=="mTextureKey" || _pointer.member=="mTag")
		{
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[""],true);
			// if(_pointer.member=="mTag")
			// {
			// 	_body.append(CUtilObj.ArrayAddButton(_pointer,"Light","light"));
			// }
		}
		else if(_pointer.member=="mShaderAttrMap")
		{
			var subList=new Array();
			subList.push({"<>":"option","text":"CVec1","value":"CVec1"});
			subList.push({"<>":"option","text":"CVec2","value":"CVec2"});
			subList.push({"<>":"option","text":"CVec3","value":"CVec3"});
			subList.push({"<>":"option","text":"CVec4","value":"CVec4"});
			subList.push({"<>":"option","text":"CMat","value":"CMat"});

			let ukey=CUniqueID.GetHash();
			var pushDiv={"<>":"div","html":[
				{"<>":"input","id":ukey+"_txt","class":"form-control"},
				{"<>":"div","class":"row","html":[
					{"<>":"div","class":"col-8","html":[
						{"<>":"select","class":"form-select","id":ukey+"subPush","html":subList},
					]},
					{"<>":"div","class":"col-4","html":[
						{"<>":"button","type":"button","class":"btn btn-primary","text":"Add",
							"onclick":()=>{
								let sel=CDOM.IDValue(ukey+"subPush");
								let key=CDOM.IDValue(ukey+"_txt");
								if(key=="")
								{
									CAlert.E("key 설정");	
									return;
								}
								let newObj  =new CShaderAttr(key,CClass.New(sel));
								this.PushCShaderAttr(newObj);
								this.EditRefresh();
								
							}
						}
					]},
				]}
			]};
			
			
			;
			
			_input.prepend(CDOM.DataToDom(pushDiv));
			
		}
		
		
	}
	
	SetOwner(_obj :CSubject)
	{
		super.SetOwner(_obj);
		this.ClearCRPAuto();
		this.SetTexture(this.mTextureKey);
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
		if(this.mAlphaTex || (this.mAlphaModel.y==CAlpha.eModel.Add && this.mAlphaModel.x!=0) || 
						(this.mAlphaModel.y==CAlpha.eModel.Mul && this.mAlphaModel.x!=1))
			return true;
		return false;
	}
	
	UpdateRenPt()
	{
		//let pos=gPosDummy;

		for(let i=0;i<this.mRenPT.length;++i)
		{
			let ren=this.mRenPT[i];
			
			//중간 배치 삭제하면 컬링 갱신안되는 버그가 있다
			//카메라를 움직이면 정산이됌
			if(ren.mDistance==null || ren.mCam.mUpdateMat!=0 || this.mUpdateFMat || this.mOwner.GetFrame().Win().IsResize())
			{
				let cam=ren.mCam;
				let plane=ren.mCam.GetPlane();
				// pos.mF32A[0]=this.mFMat.mF32A[12]+this.mBoundFMatC.mF32A[0];
				// pos.mF32A[1]=this.mFMat.mF32A[13]+this.mBoundFMatC.mF32A[1];
				// pos.mF32A[2]=this.mFMat.mF32A[14]+this.mBoundFMatC.mF32A[2];
			
				
				if(this.mRenderPass[i].mZEarly)
				{
					let eye=ren.mCam.GetEye();
					

					//한축 정렬 되면
					//2D란 의미다. 
					if(cam.GetView().z<-0.98) 
					{
						//리니어일경우 주변 퍼짐으로 반대로 정렬한다.
						if(this.mAutoLoad.mFilter==CTexture.eFilter.Linear)
							ren.mDistance = -(eye.z - this.mFMat.z);
						else
							ren.mDistance = eye.z - this.mFMat.z;

					}
					else 
					{
						
						ren.mDistance = CMath.V3Distance(eye, this.mBW.mPos);
						
					}
					ren.mDistance=Math.trunc(ren.mDistance*128)<<9;
					
				}
				else
					ren.mDistance=0;
				
				
				
				
			
				//let camOff=_cam.Offset();
				//강제로 모든 오브젝트는 컬링을 처리하게 함
				if(CUtilMath.PlaneSphereInside(plane,this.mBW.mPos,this.mBW.mRadian,null) || this.mRenderPass[i].mCullFrustum==false)
					ren.mShow=0;
				else
				{
					ren.mShow=1;
					ren.mDistance=0x7FFFFE00;
				}
					
			}
		}
		//CPoolGeo.RecycleV3(pos);
	}
	
	//이 함수에 목적을 모르겟음.....
	Refresh()
	{
		
		//this.m_shaderAttrMap.set("colorModel",new CShaderAttr("colorModel",new CColor(0,0,0,SDF.eColorModel.None,this)));
		//this.m_shaderAttrMap.set("alphaModel",new CShaderAttr("alphaModel",new CAlpha(0,SDF.eAlphaModel.None,this)));
		
		if(this.mShaderAttrMap.get("texCodi")==null)		
			this.mShaderAttrMap.set("texCodi",new CShaderAttr("texCodi",this.mTexCodi));
		this.mColorModel=this.mShaderAttrMap.get("colorModel").mData;
		this.mAlphaModel=this.mShaderAttrMap.get("alphaModel").mData;

		if(this.mColorModel.mModel!=SDF.eColorModel.None)
			this.PushTag("CAModel");
		if(this.mColorModel.mModel!=SDF.eAlphaModel.None)
			this.PushTag("CAModel");


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
	// ImportCJSON(_json: CJSON): this {

	// 	if(_json.Get("mTexture")!=null)
	// 		_json.Set("mTextureKey",_json.Get("mTexture"));

	// 	return super.ImportCJSON(_json);
	// }
	
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);

		if(_pointer.IsRef(this.mTextureKey))
		{
			this.SetTexture(this.mTextureKey);
			this.ClearBatch();
			//this.ClearCRPAuto();
			//this.WTRefresh();
		}
		else if(_pointer.IsRef(this.mTag))
		{
			this.mTagKey=null;
			//this.BatchClear();
			this.ClearCRPAuto();
			//this.WTRefresh();
		}
		else if(_pointer.member=="mColorModel" || _pointer.member=="mAlphaModel")
		{
			this.PushTag("CAModel");
			//this.BatchClear();
			this.ClearCRPAuto();
		}
		else if(_child)
		{
			if(_pointer.IsRef(this.mRenderPass))
			{
				
				//this.BatchClear();
				this.ClearCRPAuto();
				if(_pointer.target instanceof CRenderPass)
					_pointer.target.Reset();
				else
					CAlert.E("CRPAuto는 페인트 내에서 수정 불가합니다.");
				
			}
			else if(_pointer.IsRef(this.mAlphaModel))
			{
				
				this.PushTag("CAModel");
				this.ClearCRPAuto();
			}
			else if(_pointer.IsRef(this.mColorModel))
			{
				this.PushTag("CAModel");
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
		this.ClearBatch();
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
		if(this.mTag.has(_tag))	return false;


		// if(_tag=="Shadow")
		// {
		// 	this.mTag.add(CPaint.eTag.ShadowRead);
		// 	this.mTag.add(CPaint.eTag.ShadowWrite);
		// }
		// else
			this.mTag.add(_tag);


		this.mTagKey=null;
		this.ClearCRPAuto();

		return true;
	}
	RemoveTag(_tag : string)	
	{
		this.mTag.delete(_tag);
		this.mTagKey=null;
		this.ClearCRPAuto();
	}
	GetDrawMesh(_meshKey : string,_shader : CShader,_ci : CMeshCreateInfo)
	{
		var drawMesh = this.mOwner.GetFrame().Res().Find(_meshKey+ _shader.ObjHash()) as CMeshDrawNode;
		if (drawMesh == null)
		{
			drawMesh=new CMeshDrawNode();
		
			this.mOwner.GetFrame().Ren().BuildMeshDrawNodeAutoFix(drawMesh, _shader,_ci);
			this.mOwner.GetFrame().Res().Push(_meshKey + _shader.ObjHash(),drawMesh);
			drawMesh.SetKey(_meshKey + _shader.ObjHash());
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
	// Light()	
	// {	
	// 	this.PushTag("light");
	// 	this.ClearCRPAuto();
	// }
	// Shadow()	
	// {	
	// 	this.PushTag("shadow");
	// 	this.ClearCRPAuto();
	// }
	// AlphaCut()	
	// {	
	// 	this.PushTag("alphaCut");
	// 	this.ClearCRPAuto();
	// }
	

	
	GetRenderPass()	{	return this.mRenderPass;	}
	PushRenderPass(_rp : CRenderPass);
	PushRenderPass(_rp : Array<CRenderPass>);
	PushRenderPass(_rp : Array<CRenderPass>,_copy : boolean);
	PushRenderPass(_rp : CRenderPass,_copy : boolean);
	PushRenderPass(_rp : any,_copy=true)
	{
		this.mDefaultAttr=new Set<string>();
		this.mRenderPass=new Array();	

		this.ClearBatch();
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
			this.ClearBatch();
			this.mShaderAttrMap.set(_sa.mKey,_sa);
		}
		else
			attr.Import(_sa);
		
		
	}
	FindCShaderAttr(_key : string | number)
	{
		if(typeof _key =="string")
			return this.mShaderAttrMap.get(_key);
		
		for(let sa of this.mShaderAttrMap.values())
		{
			if(sa.mEach==_key)
				return sa;
		}
		return null;
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
		if(this.mTag.has("CAModel")==false)
			this.ClearBatch();
		this.PushTag("CAModel");
	}
	SetColorModel(_color : CColor)
	{
		this.mColorModel.mF32A[0]=_color.mF32A[0];
		this.mColorModel.mF32A[1]=_color.mF32A[1];
		this.mColorModel.mF32A[2]=_color.mF32A[2];
		this.mColorModel.mF32A[3]=_color.mF32A[3];

		if(this.mTag.has("CAModel")==false)
			this.ClearBatch();
		this.PushTag("CAModel");
	}
	SetAlphaModel(_alpha : CAlpha)
	{
		let as=this.AlphaState();
		this.mAlphaModel.mF32A[0]=_alpha.mF32A[0];
		this.mAlphaModel.mF32A[1]=_alpha.mF32A[1];
		if(as!=this.AlphaState())
			this.ClearCRPAuto();
		if(this.mTag.has("CAModel")==false)
			this.ClearBatch();
		this.PushTag("CAModel");
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
			this.ClearBatch();
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
			this.ClearBatch();
		}
		let cv=this.mColorVFX;
		return cv.GetV4(_offset);
	}
	
	GetRGBA() : CVec4
	{
		return new CVec4(this.mColorModel.x, this.mColorModel.y, this.mColorModel.z, this.mAlphaModel.x);
	}
	SetMat(_mat: CMat) {
		
	}
	GetMat() {	return this.mLMat;	};
	SetLMat(_mat : CMat)	{	this.mLMat.Import(_mat);	this.mUpdateLMat=true;}
	
	CacBound()
	{
		if(this.GetOwner().mUpdateRS!=CUpdate.eType.Not || this.mBW.mRadian==0)
		{
			if(this.mTag.has("tail"))
				this.mBW.Init(this.mBound,null);
			else
				this.mBW.Init(this.mBound,this.mOwner.GetMat());
			
		}

		
		// if(this.mTag.has("tail"))
		// {

		// 	this.mBoundFMat.mMin.mF32A[0]=this.mBound.mMin.mF32A[0];
		// 	this.mBoundFMat.mMin.mF32A[1]=this.mBound.mMin.mF32A[1];
		// 	this.mBoundFMat.mMin.mF32A[2]=this.mBound.mMin.mF32A[2];
		// 	this.mBoundFMat.mMax.mF32A[0]=this.mBound.mMax.mF32A[0];
		// 	this.mBoundFMat.mMax.mF32A[1]=this.mBound.mMax.mF32A[1];
		// 	this.mBoundFMat.mMax.mF32A[2]=this.mBound.mMax.mF32A[2];

			

		

		// 	this.mBoundFMat.GetCenter(this.mBoundFMatC);
			
		// 	// this.mBoundFMatC.mF32A[0]+=this.mFMat.mF32A[12];
		// 	// this.mBoundFMatC.mF32A[1]+=this.mFMat.mF32A[13];
		// 	// this.mBoundFMatC.mF32A[2]+=this.mFMat.mF32A[14];
			

			
		// 	var maxX = Math.abs(this.mBoundFMat.mMax.mF32A[0] - this.mBoundFMatC.mF32A[0]);
		// 	var maxY = Math.abs(this.mBoundFMat.mMax.mF32A[1] - this.mBoundFMatC.mF32A[1]);
		// 	var maxZ = Math.abs(this.mBoundFMat.mMax.mF32A[2] - this.mBoundFMatC.mF32A[2]);

		// 	var maxAll=CMath.Max(CMath.Max(maxX, maxY), maxZ);
		// 	this.mBoundFMatR=maxAll;
		// }
		// else if(this.mFMat.Ptr()==null)
		// {
			
		// 	this.mBoundFMat.mMin.mF32A[0]=this.mBound.mMin.mF32A[0]*this.mFMat.mF32A[0];
		// 	this.mBoundFMat.mMin.mF32A[1]=this.mBound.mMin.mF32A[1]*this.mFMat.mF32A[5];
		// 	this.mBoundFMat.mMin.mF32A[2]=this.mBound.mMin.mF32A[2]*this.mFMat.mF32A[10];
		// 	this.mBoundFMat.mMax.mF32A[0]=this.mBound.mMax.mF32A[0]*this.mFMat.mF32A[0];
		// 	this.mBoundFMat.mMax.mF32A[1]=this.mBound.mMax.mF32A[1]*this.mFMat.mF32A[5];
		// 	this.mBoundFMat.mMax.mF32A[2]=this.mBound.mMax.mF32A[2]*this.mFMat.mF32A[10];
			
			
			

		// 	// this.mBoundFMat.mMin.mF32A[0]+=this.mFMat.mF32A[12];
		// 	// this.mBoundFMat.mMin.mF32A[1]+=this.mFMat.mF32A[13];
		// 	// this.mBoundFMat.mMin.mF32A[2]+=this.mFMat.mF32A[14];

		// 	// this.mBoundFMat.mMax.mF32A[0]+=this.mFMat.mF32A[12];
		// 	// this.mBoundFMat.mMax.mF32A[1]+=this.mFMat.mF32A[13];
		// 	// this.mBoundFMat.mMax.mF32A[2]+=this.mFMat.mF32A[14];

			
			


		// 	this.mBoundFMat.GetCenter(this.mBoundFMatC);

			
		// 	var maxX = Math.abs(this.mBoundFMat.mMax.mF32A[0] - this.mBoundFMatC.mF32A[0]);
		// 	var maxY = Math.abs(this.mBoundFMat.mMax.mF32A[1] - this.mBoundFMatC.mF32A[1]);
		// 	var maxZ = Math.abs(this.mBoundFMat.mMax.mF32A[2] - this.mBoundFMatC.mF32A[2]);

		// 	var maxAll=CMath.Max(CMath.Max(maxX, maxY), maxZ);
		// 	this.mBoundFMatR=maxAll;
		// }
		// else
		// {
		
		// 	this.mBoundFMatR=CWASM.BoundMulMat(this.mBoundFMat.mMin.Ptr(),this.mBoundFMat.mMax.Ptr(),this.mBound.mMin.Ptr(),this.mBound.mMax.Ptr(),
		// 	this.mFMat.Ptr(),this.mBoundFMatC.Ptr());
		// }
	
		//this.mBoundFMatR*=1.5;
	}

	Prefab(_owner : CSubject)
	{
		if(this.mAutoLoad!=null)
		{
			for(let texKey of this.mTextureKey)
			{
				if(texKey.indexOf(".atl")!=-1)	continue;
				_owner.GetFrame().Load().Exe(texKey,this.mAutoLoad);
			}
		}
	}
	Start()
	{
		
		this.ClearCRPAuto();
		//this.InitPaint();
		
	}
	StartChk(): boolean 
	{
		this.InitChk();
		if(this.mStartChk==true && this.mInit==true)
		{
			this.mStartChk=false;
			return true;
		}
		
		return false;
			
	}
	Update(_update : CUpdate)
	{
		
		
		if(this.mUpdateFMat)	this.mUpdateFMat=false;
		if(this.mUpdateLMat || this.mOwner.mUpdateMat!=0)// || this.mBoundFMatR==0)
		{
			
			CMath.MatMul(this.mLMat,this.mOwner.GetMat(),this.mFMat,true);
			//this.mFMat.mF32A[12]=this.mOwner.GetMat()[12]+this.mLMat.mF32A[12]*;
			//this.mLMat.IsUnit()
			this.CacBound();
			this.mBW.UpdateMat(this.mOwner.GetMat());

			this.mUpdateFMat=true;
		}
		this.UpdateRenPt();

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
		gBoundDummy.Import(this.mBW.mBound);
		//let bound=this.mBoundFMat.Export();
		gBoundDummy.mMax=CMath.V3AddV3(gBoundDummy.mMax,this.GetFMat().xyz,gBoundDummy.mMax);
		gBoundDummy.mMin=CMath.V3AddV3(gBoundDummy.mMin,this.GetFMat().xyz,gBoundDummy.mMin);


		return gBoundDummy;
	}
	// SetBound(_bound)
	// {
	// 	this.mBound=_bound;
	// 	this.mBoundFMatR=0;
	// }
	Render(_shader : CShader)	{} 
	RenderBatch(_shader : CShader,_count=1)
	{
		let bcm=this.mOwner.GetFrame().BMgr().IsBatchMap();
	
		let barr=this.mBatchMap.get(_shader);
		if(barr==null)
		{
			barr=new Array<CBatch>(_count);
			this.mBatchMap.set(_shader,barr);
			barr.length=_count;
			
		}
		else if(bcm==false){}
		else if(barr.length>0)
		{
			return this.mOwner.GetFrame().BMgr().BatchPushArr(barr);
		}
		return barr;
	} 
	BatchKeySet(_nodeOff : number,_key=null)
	{
		for(let batchArr of this.mBatchMap.values())
		{
			if(batchArr==null)	continue;
			if(_key==null)
				batchArr[_nodeOff].CreateKey();
			else
				batchArr[_nodeOff].mKey=_key;
		}
		
	}
	
	SetTexture(_a : Array<string>);
	SetTexture(_a : string);
	SetTexture(_a : string,_b : string);
	SetTexture(_a : string,_b : string,_c : string);
	SetTexture(_a : string,_b : string,_c : string,_d : string);
	SetTexture(_a : string,_b : string,_c : string,_d : string,_e : string);
	SetTexture(_a,_b=null,_c=null,_d=null,_e=null)
	{
		let change=false;
		if(_a instanceof Array)
		{
			if(_a != this.mTextureKey)
			{
				//this.mTexture.length=0;
				for(var i=0;i<_a.length;++i)
				{
					if(_a[i]!=this.mTextureKey[i])
					{
						change=true;
						this.mTextureKey[i]=_a[i];
					}
					
				}
					
			}
			
		}
		else
		{
			//this.m_texture=new Array();
			if(_a!=this.mTextureKey[0])
			{
				change=true;
				this.mTextureKey[0]=_a;
			}
			if(_b!=this.mTextureKey[1])
			{
				change=true;
				this.mTextureKey[1]=_b;
			}
			if(_c!=this.mTextureKey[2])
			{
				change=true;
				this.mTextureKey[2]=_c;
			}
			if(_d!=this.mTextureKey[3])
			{
				change=true;
				this.mTextureKey[3]=_d;
			}
			if(_e!=this.mTextureKey[4])
			{
				change=true;
				this.mTextureKey[4]=_e;
			}
		}
		
		//let texList=new Array();
		if(this.mAutoLoad!=null && this.mOwner!=null && this.mOwner.GetFrame()!=null)
		{
			for(let i=0;i<this.mTextureKey.length;++i)
			{
				let texKey=this.mTextureKey[i];
				if(texKey.indexOf(".atl")!=-1 || texKey.indexOf("base64")!=-1 ||texKey.indexOf(".tex")!=-1 || 
					texKey=="" || texKey==null)	continue;
				
				let tex=this.mOwner.GetFrame().Res().Find(texKey);
				//texList.push(tex);
				if(tex!=null && tex instanceof CTexture && i==0)
				{
					if(tex.GetAlpha()) this.mAlphaTex = true;
					
					continue;
				}
				if(tex==null)	this.mInit=false;

				if(this.mOwner.GetFrame().Load().IsLoad(texKey)==false)
				{
					
					this.mOwner.GetFrame().Load().Exe(texKey,this.mAutoLoad);
				}
					
			}
		}
		if(change)
		{
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
		}

		
		
	}
	// GetResTexture(_off : Array<number>=[],_texArr : Array<CTexture>=null) 
	// {	
	// 	if(_texArr==null)	_texArr=new Array<CTexture>();
		
	// 	if(_off.length==0)
	// 	{
	// 		for(let i=0;i<this.mTextureKey.length;++i)
	// 		{
	// 			_off.push(i);
	// 		}
	// 	}
		
	// 	for(let i=0;i<_off.length;++i)
	// 	{
	// 		if(_off[i]==-1)	
	// 		{
	// 			_texArr.push(null);
	// 			continue;
	// 		}
				
	// 		let tex=this.GetOwner().GetFrame().Res().Find(this.mTextureKey[_off[i]]);
	// 		if(tex instanceof CAtlas)
	// 		{
				
	// 			if(tex.mBase64.mData==null || tex.GetTex()==null)
	// 			{
	// 				if(tex.GetTex()==null)
	// 					tex.CreateTex();
					
				
	// 			}
	// 			else if(tex.GetTex().GetGBuf().length==0)
	// 			{
	// 				this.GetOwner().GetFrame().Ren().BuildTexture(tex.GetTex());
	// 			}
				
	// 			tex=tex.GetTex();
	// 		}
	// 		_texArr.push(tex);
	// 	}

	// 	return _texArr;	
	// }
	GetTexture() {	return this.mTextureKey;	}
	GetTexHash() 
	{
		let str="";
		let hash=0;
		for(let texKey of this.mTextureKey)
		{
			str+=texKey;
		}
		hash=CHash.HashCode(str);
		// 특정 비트 영역만 유지 (0x000fffff 마스킹) 
		hash = 0xff & hash;

		// let floatHash = hash * 0.000000001; // 예: 0.000065535

		// const precision = 1e9; // 9자리 정밀도
		return hash;
	}

	InitChk()
	{
		this.mInit=true;

		//임시 코딩
		if(this.mShaderAttrMap.get("texCodi")==null)		
			this.mShaderAttrMap.set("texCodi",new CShaderAttr("texCodi",this.mTexCodi));
		
		
		this.mColorModel=this.mShaderAttrMap.get("colorModel").mData;
		this.mAlphaModel=this.mShaderAttrMap.get("alphaModel").mData;
		if(this.mShaderAttrMap.get("colorVFX")!=null)
			this.mColorVFX=this.mShaderAttrMap.get("colorVFX").mData;
		if(this.mTextureKey.length>0)
			this.SetTexture(this.mTextureKey);
	}
	CaptureTextureToDataURL() : string
	{
		if(this.mTextureKey.length==0 || this.GetOwner().GetFrame()==null)	return "";

		let tex=this.GetOwner().GetFrame().Res().Find(this.mTextureKey[0]) as CTexture;
		
		let codi=this.GetLeftTopRightBottom(this.GetOwner().GetFrame());
		CH5Canvas.Init(codi.z-codi.x,codi.w-codi.y);
		let cmd=CH5Canvas.DrawBuf(tex.GetBuf()[0],0,0,tex.GetWidth(),tex.GetHeight(),codi);
		CH5Canvas.Draw(cmd);

		let durl=CH5Canvas.GetDataURL();
		//CAlert.Info(`<img src='${durl}' />`);
		return durl;
	}
	GetLeftTopRightBottom(_frame : CFrame) 
	{
		const tex = _frame.Res().Find(this.mTextureKey[0]) as CTexture;
		if(tex==null || (tex.GetWidth()==1 && tex.GetHeight()==1))	return null;
		const imgW = tex.GetWidth();
		const imgH = tex.GetHeight();

		const uv = this.mTexCodi;


		const gMargin=1;
		const startX = Math.round((this.mTexCodi.z) * imgW);
		const startY = Math.round((1 - this.mTexCodi.w - this.mTexCodi.y) * imgH);
		
		const endX = Math.round((this.mTexCodi.z + this.mTexCodi.x) * imgW);
		const endY = Math.round((1 - this.mTexCodi.w) * imgH);
		
		return new CVec4(startX, startY, endX, endY);


	}
}

