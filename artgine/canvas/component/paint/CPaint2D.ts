
import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import { CClass } from "../../../basic/CClass.js";
import { CObject, CPointer } from "../../../basic/CObject.js";
import {CBound} from "../../../geometry/CBound.js";
import {CMath} from "../../../geometry/CMath.js";
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
import {CVec1} from "../../../geometry/CVec1.js";
import {CVec2} from "../../../geometry/CVec2.js";
import {CVec3} from "../../../geometry/CVec3.js";
import {CVec4} from "../../../geometry/CVec4.js";
import {CRenderPass} from "../../../render/CRenderPass.js";

import {CShader} from "../../../render/CShader.js";
import {CShaderAttr} from "../../../render/CShaderAttr.js";
import {CTexture} from "../../../render/CTexture.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import {CAtlas} from "../../../util/CAtlas.js";
import { CFontRef } from "../../../util/CFont.js";
import { CFrame } from "../../../util/CFrame.js";
import { CRPAuto } from "../../CRPMgr.js";
import {CSubject} from "../../subject/CSubject.js";
import {CLight} from "../CLight.js";
import {CPaint} from "./CPaint.js";



/*
3가지 모드가 있따
일반적인 2D
Tail 스태틱
ㄴ정적인 위치를 지정한다. 그림자,윈드에 활용

Tail
ㄴ트레일이랑 비슷하지만 시작,끝 두지점만 있다.
성능상 더 빠르지만 표현이 부족하다



*/
export class CPaint2D extends CPaint
{
	protected mSize : CVec2;
	protected mPivot : CVec3;
	protected mPos : CVec3;
	protected mRot : CVec4;
	
	protected mTexCodi : CVec4;
	
	//2d y-sort
	public mYSort : boolean = false;
	public mYSortOrigin : number = 0;

	//2d y-sort 공용
	public static mYSortRange : CVec2 = new CVec2(-10000, 10000);
	//0~100까지 Z값 나옴
	public static mYSortZShift : number = 100;
	
	//m_mat34=new Float32Array(12);


	public mBeforePos=new CVec3;
	public mStopPos=new CVec3();
	public mRemoveSpeed=1;

	//X는 크기,Y는 꼬리
	public mPosList : Array<CVec3>=null;
	public mWMatMul=true;
	public mLastHide=true;

	public mWindInfluence : CVec1 = new CVec1(0.0);


	
	
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		return super.IsShould(_member,_type);
	}
	constructor(_texture : string|CFontRef=null,_size : CVec2=null)
	{
		super();
		
		if(_size != null && (_size instanceof CVec2)==false)
			CAlert.E("CPaint2D 인자 잘못 넣음");
		else
		{
			this.mSize=_size;
			if(_texture!=null)
			{
				if(_texture instanceof CFontRef)
				{
					this.SetTexture(_texture.mKey);
				}
					
					//this.m_texture.push(_texture.m_key);
				else
					this.SetTexture(_texture);
				// if(this.m_size==null)
				// 	this.SizeCac();
			}
				
		}
		
		this.mPivot=new CVec3();
		this.mPos=new CVec3();
		this.mRot=new CVec4();
		
		
		this.mTexCodi =new CVec4(1, 1, 0, 0);
		

		this.mBound.mMin.x = -CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMin.y = -CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMin.z = -0.5;

		this.mBound.mMax.x = CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMax.y = CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMax.z = 0.5;
		this.mBoundFMatR=0;
		//if(_size!=null)
		this.mBound.mType=CBound.eType.Box;
		
		this.PRSReset();
		
		this.mShaderAttrMap.set("reverse",new CShaderAttr("reverse",new CVec2(0,0)));
		this.mShaderAttrMap.set("billboard",new CShaderAttr("billboard",new CVec1(0)));
		//this.m_reverse=this.m_shaderAttrMap.get("reverse");
		//this.m_shaderAttrMap.set("reverse",new CShaderAttr("reverse",new CVec2(0,0)));
		//this.SizeCac();
	}
	PushNormalMap(_tex : string)
	{
		if(this.mTexture.length==1)
			this.mTexture.push(_tex);
		else if(this.mTexture.length==2)
		{
			this.mTexture[1]=_tex;
		}
		this.BatchClear();
		this.PushTag("normalMap");
	}
	EditDrop(_object: CObject): void 
	{
		if(_object instanceof CTexture)
		{
			this.SetTexture(_object.Key());
		}
	}
	EditForm(_pointer : CPointer,_div : HTMLDivElement,_input : HTMLInputElement)
	{
		super.EditForm(_pointer,_div,_input);
		if(_pointer.member=="mSize" && this.mSize==null)
		{
			let btn=document.createElement("button");
			btn.innerText="생성";
			btn.onclick=()=>{
				this.mSize=new CVec2();
				this.EditRefresh();
			};
			_div.append(btn);
		}
	}
	EditHTMLInit(_div: HTMLDivElement, _pointer?: CPointer): void {
		
		super.EditHTMLInit(_div,_pointer);

		var button=document.createElement("button");
		button.innerText="TexcodiModif";
		button.onclick=()=>{
			if(this.mTexture.length>0)
			{
				let ani=CClass.New("CAnimation");
				window["AniTool"](ani,this.mTexture[0]);
				window["AniToolTexcodiEvent"](this, ()=>{

					
					this.EditRefresh();
					this.BatchClear();
				});
			}
			
			
		};
		
		_div.append(button);
		
		
	}
	SetBillBoard(_enabel : boolean)
	{
		this.mShaderAttrMap.get("billboard").mData.mF32A[0]=_enabel?1.0:0.0;
		this.PushTag("billboard");
	}
	
	
	SetYSort(_enable : boolean) {
		this.mYSort = _enable;
		if(this.mYSort && this.GetSize() != null) {
			this.mYSortOrigin = -0.5 * this.GetSize().y+1;
		}
	}
	SetYSortOrigin(_origin : number)
	{
		this.mYSortOrigin = _origin;
	}

	Update(_delay)
	{
		this.SizeCac();
		super.Update(_delay);

		//ysort
		if(this.mUpdateFMat == true && this.mYSort == true) {
			const yVal = this.mFMat.mF32A[13] + this.mYSortOrigin;
			let yRatio = (CPaint2D.mYSortRange.y - yVal) / (CPaint2D.mYSortRange.y - CPaint2D.mYSortRange.x);
			this.mFMat.mF32A[14] += yRatio * CPaint2D.mYSortZShift;
		}

		if(_delay>1000 || this.mTag.has("tail")==false)	return;


		this.Camera();

		var pos=this.mOwner.GetWMat().xyz;
		
		var v0=CMath.V3SubV3(pos,this.mBeforePos);
		if(v0.IsZero())	return;

		var len=CMath.V3Len(v0);
		if(len>this.mSize.y)
			this.mBeforePos=CMath.V3AddV3(pos,CMath.V3MulFloat(CMath.V3Nor(v0),-this.mSize.y));
		if(len<0.001)
		{
			this.mBeforePos=pos;
		}
		else if(this.mStopPos.Equals(pos))
		{
			this.mBeforePos=CMath.V3AddV3(CMath.V3MulFloat(pos,_delay/100*this.mRemoveSpeed),
				CMath.V3MulFloat(this.mBeforePos,1-_delay/100*this.mRemoveSpeed));
		}	
		
		this.mStopPos=pos;
	}
	

	Prefab(_owner : CSubject)
	{
		super.Prefab(_owner);
		this.SizeCac();
	}
	
	SizeCac()
	{
		if((this.mSize==null || this.mSize.IsZero())  && this.mOwner!=null && this.mTexture.length>0)
		{
			var tex=this.mOwner.GetFrame().Res().Find(this.mTexture[0]);
			if(tex instanceof CTexture)
			{
				if(tex==null || (tex.GetWidth()==1 && tex.GetHeight()==1))	return;
				this.SetSize(new CVec2(tex.GetWidth(),tex.GetHeight()));
				this.PRSReset();
				this.EditRefresh();
			}
			else if(tex instanceof CAtlas)
			{
				if(this.mTexCodi.x != 1 || this.mTexCodi.y != 1 || this.mTexCodi.z != 0 || this.mTexCodi.w != 0) {
					let width = Math.round(tex.mWidth * this.mTexCodi.x);
					let height = Math.round(tex.mHeight * this.mTexCodi.y);
					this.SetSize(new CVec2(width, height));
					this.EditRefresh();
				}
			}
			
		}
	}
	
	EmptyRPChk()
	{
		if(this.mRenderPass.length==0)
		{
			var rp=new CRPAuto(this.mOwner.GetFrame().Pal().Sl2D().mKey);
			//2D에 경우 컬링 뒷면을 신경쓰는 경우가 없으므로 꺼버렸다.
			rp.mCullFace = CRenderPass.eCull.None;
			this.mRenderPass=[rp];
		}
		else if(this.mRenderPass[0].mShader=="")
		{
			this.mRenderPass[0].mShader=this.mOwner.GetFrame().Pal().Sl2D().mKey;
		}
	}

	Wind() {this.PushTag("wind"); }
	
	
	override EditChange(_pointer : CPointer,_childe : boolean)
	{
		super.EditChange(_pointer,_childe);
		if(_pointer.member == "mYSort" || _pointer.member == "mYSortOrigin") 
		{
			if(_pointer.member == "mYSort")
			{
				this.SetYSort(this.mYSort);
			}
				
			this.PRSReset();
		}
		else if(_pointer.IsRef(this.mWindInfluence))
		{
			this.SetWindInfluence(this.mWindInfluence.x);
		}
		else if(_childe)
		{
			if(_pointer.IsRef(this.mPos) ||_pointer.IsRef(this.mRot) ||
			_pointer.IsRef(this.mSize) || _pointer.IsRef(this.mPivot))
			{
				this.PRSReset();	
			}
		}
	}
	
	

	
	PRSReset()
	{
		if(this.mSize==null)
			return;

		
		var bSca = this.GetScale();

		var lpos=this.mPos.Export();
		lpos.x += this.mBound.mMax.x*bSca.x*this.mPivot.x;
		lpos.y += this.mBound.mMax.y*bSca.y*this.mPivot.y;
		
		var t0=CPoolGeo.ProductMat();
		var t1=CPoolGeo.ProductMat();
		CMath.MatScale(bSca,t0);
		CMath.QutToMat(this.mRot,t1);

		CMath.MatMul(t0, t1,this.mLMat);
		CPoolGeo.RecycleMat(t0);
		CPoolGeo.RecycleMat(t1);
		//CMat mat;
		this.mLMat.mF32A[12] = lpos.x;
		this.mLMat.mF32A[13] = lpos.y;
		this.mLMat.mF32A[14] = lpos.z;
		
		this.mLMat.UnitCheck();
	

		this.mUpdateLMat=true;
	}
	GetHalf()
	{
		var pos=new CVec3((this.mSize.x * 0.5)*this.mPivot.x, (this.mSize.y * 0.5)*this.mPivot.y, 0);
		pos = CMath.V3MulMatNormal(pos, this.mOwner.GetWMat());
		return pos;
	}
	GetScale()
	{
		return new CVec3(this.mSize.x / CUtilRender.Mesh2DSize, this.mSize.y / CUtilRender.Mesh2DSize, 1);
	}
	
	GetSize() 
	{ 
		return this.mSize;	 
	};
	GetPos()
	{
		return this.mPos;
	}
	GetPivot()	{	return this.mPivot;	}
	GetTexCodi() {
		return this.mTexCodi;
	}
	//left,top,right,bottom
	GetLeftTopRightBottom(_frame : CFrame) 
	{
		const tex = _frame.Res().Find(this.mTexture[0]) as CTexture;
		const imgW = tex.GetWidth();
		const imgH = tex.GetHeight();

		const uv = this.mTexCodi;

		// 역변환: tex = (left, top, right, bottom) in px
		const width = uv.x * imgW;
		const height = uv.y * imgH;
		const left = uv.z * imgW;
		const top = (1 - uv.w - uv.y) * imgH;
		const right = left + width;
		const bottom = top + height;
		
		return new CVec4(left,top,right,bottom);
	}
	Render(_vf : CShader)
	{

		

		var barr=this.RenderBatch(_vf,1);
		if(barr==null)	return;

		if(this.mSize==null || this.mTexture.length==0)
		{
			this.mBatchMap.clear();
			//this.mBatchLastVF=null;
			return;
		}
			
		
			

		this.mOwner.GetFrame().BMgr().BatchOn();
		this.Common(_vf);

		// this.m_mat23[0]=this.m_fMat.m_F32A[0];this.m_mat23[1]=this.m_fMat.m_F32A[1];
		// this.m_mat23[2]=this.m_fMat.m_F32A[4];this.m_mat23[3]=this.m_fMat.m_F32A[5];
		// this.m_mat23[4]=this.m_fMat.m_F32A[12];this.m_mat23[5]=this.m_fMat.m_F32A[13];
		// this.m_owner.GetFW().Ren().BMgr().SetValueFloat(_vf, "worldMat", this.m_mat23,6);

		// this.m_mat34[0]=this.m_fMat.m_F32A[0];this.m_mat34[1]=this.m_fMat.m_F32A[1];this.m_mat34[2]=this.m_fMat.m_F32A[2];
		// this.m_mat34[3]=this.m_fMat.m_F32A[4];this.m_mat34[4]=this.m_fMat.m_F32A[5];this.m_mat34[5]=this.m_fMat.m_F32A[6];
		// this.m_mat34[6]=this.m_fMat.m_F32A[8];this.m_mat34[7]=this.m_fMat.m_F32A[9];this.m_mat34[8]=this.m_fMat.m_F32A[10];
		// this.m_mat34[9]=this.m_fMat.m_F32A[12];this.m_mat34[10]=this.m_fMat.m_F32A[13];this.m_mat34[11]=this.m_fMat.m_F32A[14];
		// this.m_owner.GetFW().Ren().BMgr().SetValueFloat(_vf, "worldMat", this.m_mat34,12);
		
		this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMat", this.GetFMat()));
		this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("texCodi", this.mTexCodi));
		if(_vf.mUniform.get("windInfluence")!=null)
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));
		this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTexture );
		var dm=this.GetDrawMesh("CPaint2D",_vf,this.mOwner.GetFrame().Pal().MCI2D());
		this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);

		barr[0]=this.mOwner.GetFrame().BMgr().BatchOff();
		
	}

	SetTexCodi(_uv : CVec4) : void;
	SetTexCodi(_stX : number,_stY : number,_edX : number,_edY : number,_imgW : number,_imgH : number) : void;
	SetTexCodi(_stX : any,_stY =null,_edX =null,_edY =null,_imgW =null,_imgH =null)
	{
		if(_stX instanceof CVec4)
		{
			this.mTexCodi.Import(_stX);
		}
		else
		{
			this.mTexCodi.x = (_edX - _stX) / _imgW-0.2/_imgW;
			this.mTexCodi.y = (_edY - _stY) / _imgH-0.2/_imgH;

			this.mTexCodi.z = (_stX) / _imgW+0.1/_imgW;
			this.mTexCodi.w = 1-(_stY / _imgH)-this.mTexCodi.y-0.1/_imgH;
		}
	}
	SetPivot(_pivot : CVec3)
	{
		this.mPivot = _pivot;
		this.PRSReset();
	}
	SetSize(_size : CVec2)
	{
		this.mBoundFMatR=0;
		if(_size!=null && _size.IsZero())
			this.mSize=null;
		else
			this.mSize = _size;
		this.PRSReset();
	}
	SetPos(_pos : CVec3)
	{
		this.mPos = _pos;
		this.PRSReset();
	}
	SetRot(_rot : CVec3|CVec4)
	{
		if(_rot instanceof CVec4)
			this.mRot.Import(_rot);
		else
			this.mRot.Import(CMath.EulerToQut(_rot));
	
		this.PRSReset();
	}
	SetReverse(_x : boolean,_y : boolean)
	{
		let rev=this.mShaderAttrMap.get("reverse");
		if(_x)
			rev.mData.x=1.0;
		else
			rev.mData.x=0.0;
		if(_y)
			rev.mData.y=1.0;
		else
			rev.mData.y=0.0;
	}
	// SetTexture(_a: Array<string>);
	// SetTexture(_a: string);
	// SetTexture(_a: string, _b: string);
	// SetTexture(_a: string, _b: string, _c: string);
	// SetTexture(_a: string, _b: string, _c: string, _d: string);
	// SetTexture(_a: string, _b: string, _c: string, _d: string, _e: string);
	// SetTexture(_a: any, _b?: any, _c?: any, _d?: any, _e?: any): void {
	// 	super.SetTexture(_a,_b,_c,_d,_e);
	// 	if(this.mTexture.length>0 && this.mOwner!=null && this.mOwner.GetFrame()!=null)
	// 	{
	// 		let tex=this.mOwner.GetFrame().Res().Find(this.mTexture[0]) as CTexture;
	// 		if(tex!=null)
	// 		{
	// 			this.SetTexCodi(0,0,tex.GetWidth(),tex.GetHeight(),tex.GetWidth(),tex.GetHeight());
	// 		}
			
	// 	}
	// }
	


	Tail()
	{
		if(this.mTag.has("tail")==false)
		{
			this.PushTag("tail");
			this.BatchClear();
			this.mUpdateLMat=true;
		}
		
		
	}
	SetWindInfluence(_influence: number) 
	{
		this.Tail()

		this.Wind();
		this.mLastHide=false;
		this.mWindInfluence.x = _influence;
		this.mPosList=[
			new CVec3(-this.mSize.x * 0.5,  this.mSize.y * 0.5, 0),  // 좌상단
			new CVec3( this.mSize.x * 0.5,  this.mSize.y * 0.5, 0),  // 우상단
			new CVec3(-this.mSize.x * 0.5, -this.mSize.y * 0.5, 0),  // 좌하단
			new CVec3( this.mSize.x * 0.5, -this.mSize.y * 0.5, 0)   // 우하단
		];
	}
	SetPosList(_array : Array<CVec3>)
	{

		if(_array.length>=4)
		{
			this.Tail()
			this.mPosList=_array;

			this.mBound.Reset();
			this.mBound.InitBound(this.mPosList);
			this.mBound.SetType(CBound.eType.Box);
		
		}
			
	}
	CacBound()
	{
		if(this.mTag.has("tail"))
		{
			this.mBoundFMat.Import(this.mBound);
			this.mBoundFMat.GetCenter(this.mBoundFMatC);
			this.mBoundFMatR=this.mSize.x>this.mSize.y?this.mSize.x:this.mSize.y;
			this.mBoundFMatR*=1.5;
		}
		else
		{
			super.CacBound();
		}
		
	}
	Camera()
	{
		if(this.mPosList!=null)
		{
			if(this.mUpdateFMat == false) return;

			if(this.mWMatMul==false)
			{
				this.GetFMat().SetV3(0,this.mPosList[0]);
				this.GetFMat().SetV3(1,this.mPosList[1]);
				this.GetFMat().SetV3(2,this.mPosList[2]);
				this.GetFMat().SetV3(3,this.mPosList[3]);

			}
			else
			{
				let v0=CPoolGeo.ProductV3();
				let v1=CPoolGeo.ProductV3();
				let v2=CPoolGeo.ProductV3();
				let v3=CPoolGeo.ProductV3();

				let vd=CPoolGeo.ProductV3();
				

				let pos = this.GetFMat().xyz;
				CMath.V3AddV3(this.mPosList[0], pos, v0);
				CMath.V3AddV3(this.mPosList[1], pos, v1);
				CMath.V3AddV3(this.mPosList[2], pos, v2);
				CMath.V3AddV3(this.mPosList[3], pos, v3);

				this.mBound.Reset();
				this.mBound.InitBound(v0);
				this.mBound.InitBound(v1);
				this.mBound.InitBound(v2);
				this.mBound.InitBound(v3);

				this.GetFMat().SetV3(0,v0);
				this.GetFMat().SetV3(1,v1);
				this.GetFMat().SetV3(2,v2);
				this.GetFMat().SetV3(3,v3);
				this.mBound.SetType(CBound.eType.Box);
				CPoolGeo.RecycleV3(v0);
				CPoolGeo.RecycleV3(v1);
				CPoolGeo.RecycleV3(v2);
				CPoolGeo.RecycleV3(v3);
				CPoolGeo.RecycleV3(vd);

				this.CacBound();
			}
			this.mFMat.mF32A[3]=1;
			this.mFMat.mF32A[7]=1;
			this.mFMat.mF32A[11]=1;
			this.mFMat.mF32A[15]=1;

			return;
		}




		if(this.mRenPT.length==0)	return;
		var L_nor=new CVec3();
		var st=new CVec3(), ed=new CVec3();
	
		if(this.mTag.has("billboard"))
		{
			//일반 꼬리는 빌보드 기본이라서 다시 넣으면 중복 적용
			CAlert.W("tail billboard not!");
		}
		st=this.GetFMat().xyz;
		CMath.V3AddV3(this.mPos,st,st);
		ed=this.mBeforePos;
		CMath.V3AddV3(this.mPos,ed,ed);
		
		L_nor=CMath.V3Cross(this.mRenPT[0].mCam.GetView(),CMath.V3Nor(CMath.V3SubV3(st, this.mBeforePos)));
		//L_nor=new CVec3(1,0,0);//CMath.V3Nor(CMath.V3SubV3(st, this.mBeforePos));

		let v0=CMath.V3SubV3(st, CMath.V3MulFloat(L_nor, (this.mSize.x / 2)));
		let v1=CMath.V3AddV3(st, CMath.V3MulFloat(L_nor, (this.mSize.x / 2)));
		let v2=CMath.V3SubV3(ed, CMath.V3MulFloat(L_nor, (this.mSize.x / 2)));
		let v3=CMath.V3AddV3(ed, CMath.V3MulFloat(L_nor, (this.mSize.x / 2)));


		this.GetFMat().SetV3(0,v0);
		this.GetFMat().SetV3(1,v1);
		this.GetFMat().SetV3(2,v2);
		this.GetFMat().SetV3(3,v3);


		if(this.mLastHide)
		{
			this.mFMat.mF32A[3]=1;
			this.mFMat.mF32A[7]=1;
			this.mFMat.mF32A[11]=0;
			this.mFMat.mF32A[15]=0;
		}
		else
		{
			this.mFMat.mF32A[3]=1;
			this.mFMat.mF32A[7]=1;
			this.mFMat.mF32A[11]=1;
			this.mFMat.mF32A[15]=1;
		}
		

		this.mBound.Reset();
		this.mBound.InitBound(v0);
		this.mBound.InitBound(v1);
		this.mBound.InitBound(v2);
		this.mBound.InitBound(v3);
		this.mBound.SetType(CBound.eType.Box);
		this.mUpdateLMat=true;

	}
	
}

/*
바디에 붙어서 작동한다
*/
export class CPaintHTML extends CPaint2D
{
	
	public mElement : HTMLElement=null;
	public mOrgSize=new CVec2();
	public mParent : HTMLElement=null;
	public mAttach=false;
	mZoomScale=false;

	//public m_click=true;
	//overflow hidden있으면 넘으면 안보임
	//사이즈가 있으면 그 사이즈를 넘을수 없다
	constructor(_html : HTMLElement,_size : CVec2=null,_parent : HTMLElement=null)
	{
		super(null,_size);
		this.mElement=_html as HTMLElement;
		if(_parent==null)
			this.mParent=document.body;
		else
		{
			this.mParent=_parent;
			//this.m_parent.style.pointerEvents="none";
			this.mParent.style.position="relative";
			this.mParent.style.overflow="hidden";
		}
			
	}
	SetEnable(_val: boolean)
	{
		super.SetEnable(_val);
		this.mElement.hidden=!_val;
	}
	SetPos(_pos : CVec3)
	{
		this.mPos=_pos.Export();
		this.mUpdateFMat=true;
	}
	// Reset(_html : HTMLElement|DocumentFragment)
	// {
	// 	if(this.mElement!=null)
	// 		this.mElement.remove();
	// 	this.mElement=_html as HTMLElement;
	// 	this.mAttach=false;	
	// }
	SetSize(_size: CVec2): void {
		this.mSize=_size;
		this.mUpdateFMat=true;
		this.mAttach=false;	
	}
	GetElement()
	{
		return this.mElement;
	}
	Update(_delay)
	{
		if(this.mRenPT.length==0 || this.mElement==null)	return;
		if(this.mRenPT[0].mCam.mUpdateMat!=0 || this.mOwner.mUpdateMat!=0 || this.mOwner.GetFrame().Win().IsResize() || this.mUpdateFMat==true){}
		else return;
		this.mUpdateFMat=false;

		if(this.mAttach==false)
		{
			this.mParent.appendChild(this.mElement);
			this.mElement.style.position="absolute";
			if(this.mElement.style.pointerEvents=='')
				this.mElement.style.pointerEvents="none";
			this.mAttach=true;	
		}

		
		let zoom = 1 / this.mRenPT[0].mCam.mZoom;
		let pos=this.GetOwner().GetWMat().xyz;
		
		// pos.x*=zoom;
		// pos.y*=zoom;
		this.mBound.SetType(CBound.eType.Box);
		
		if(this.mSize!=null)
		{
			pos.x+=this.mPivot.x*this.mSize.x*0.5;
			pos.y+=this.mPivot.y*this.mSize.y*0.5;
			if(this.mSize.x!=0)
				this.mElement.style.width=this.mSize.x+"px";
			if(this.mSize.y!=0)
				this.mElement.style.height=this.mSize.y+"px";
			//this.m_html.style.scale="scale("+zoom+","+zoom+")";
			this.mElement.style.transform = "scale(" + zoom + "," + zoom + ")";
		}
		if(this.mElement.offsetWidth!=0)
		{
			this.mOrgSize.x=this.mElement.clientWidth;
			this.mOrgSize.y=this.mElement.clientHeight;
		}

		
		pos=CMath.V3MulMatCoordi(pos,this.mRenPT[0].mCam.GetViewMat());
		pos=CMath.V3MulMatCoordi(pos,this.mRenPT[0].mCam.GetProjMat());
		var x=(pos.x+1)/2.0;
		var y=(-pos.y+1)/2.0;

		var left=this.GetOwner().GetFrame().PF().mLeft;
		var top=this.GetOwner().GetFrame().PF().mTop;
		left+=x*this.mOwner.GetFrame().PF().mWidth-(this.mOrgSize.x)*0.5+this.mPos.x;
		top+=y*this.mOwner.GetFrame().PF().mHeight-(this.mOrgSize.y)*0.5-this.mPos.y;
		left=Math.trunc(left);
		top=Math.trunc(top);
		this.mElement.style.left=left+"px";
		this.mElement.style.top=top+"px";


		
	}

	Destroy(): void {
		super.Destroy();
		if(this.mElement!=null)
			this.mElement.remove();
	}
}
