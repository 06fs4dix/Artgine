
import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import { CClass } from "../../../basic/CClass.js";
import { CDOM } from "../../../basic/CDOM.js";
import { CHash } from "../../../basic/CHash.js";
import { CObject, CPointer } from "../../../basic/CObject.js";
import { CUtil } from "../../../basic/CUtil.js";
import { CWASM } from "../../../basic/CWASM.js";
import {CBound} from "../../../geometry/CBound.js";
import { CMat } from "../../../geometry/CMat.js";
import {CMath} from "../../../geometry/CMath.js";
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
import {CVec1} from "../../../geometry/CVec1.js";
import {CVec2} from "../../../geometry/CVec2.js";
import {CVec3} from "../../../geometry/CVec3.js";
import {CVec4} from "../../../geometry/CVec4.js";
import { CMesh } from "../../../render/CMesh.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../../render/CMeshDataNode.js";
import {CRenderPass} from "../../../render/CRenderPass.js";

import {CShader, CVertexFormat} from "../../../render/CShader.js";
import {CShaderAttr} from "../../../render/CShaderAttr.js";
import {CTexture} from "../../../render/CTexture.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import {CAtlas} from "../../../util/CAtlas.js";
import { CFontRef } from "../../../util/CFont.js";
import { CFrame } from "../../../util/CFrame.js";
import { CRPAuto } from "../../canvas/CRPMgr.js";
import {CSubject} from "../../subject/CSubject.js";
import { CClipCoodi } from "../CAnimation.js";
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
	protected mPos : CVec3;
	protected mSca : CVec2;
	protected mPivot : CVec3;
	
	//protected mRot : CVec4;
	
	
	
	//2d y-sort
	public mYSort : boolean = false;
	public mYSortOrigin : number = 0;

	//2d y-sort 공용
	public static YSortRange : CVec2 = new CVec2(-10000, 10000);
	//0~100까지 Z값 나옴
	public static YSortZShift : number = 100;
	
	//m_mat34=new Float32Array(12);


	public mBeforePos=new CVec3;
	public mStopPos=new CVec3();
	public mRemoveSpeed=1;
	public mRevers=new CVec2(1,1);

	//X는 크기,Y는 꼬리
	public mPosList : Array<CVec3>=null;
	mTMat : CMat;
	//public mWMatMul=true;
	public mLastHide=true;

	public mWindInfluence : CVec1 = new CVec1(0.0);
	//mMargin=0.2;

	
	
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
		this.mSca=new CVec2(1,1)
		
		
		
		//this.mTexCodi =new CVec4(1, 1, 0, 0);
		this.mTMat=new CMat();
		

		this.mBound.mMin.x = -CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMin.y = -CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMin.z = -0.5;

		this.mBound.mMax.x = CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMax.y = CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMax.z = 0.5;

		
		
		//if(_size!=null)
			this.mBound.mType=CBound.eType.Box;
		
		this.MatUpdate();
		
		
		this.mShaderAttrMap.set("billboard",new CShaderAttr("billboard",new CVec1(0)));
		this.PushTag("codi");
	}
	override Reset()
	{
		super.Reset();
		this.mPivot.Zero();
		this.mPos.Zero();
		
		//this.mTexCodi.x=1;this.mTexCodi.y=1;this.mTexCodi.z=0;this.mTexCodi.w=0;
		
		this.mShaderAttrMap.set("billboard",new CShaderAttr("billboard",new CVec1(0)));
		this.mBound.mMin.x = -CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMin.y = -CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMin.z = -0.5;

		this.mBound.mMax.x = CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMax.y = CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMax.z = 0.5;
		
		//if(_size!=null)
		this.mBound.mType=CBound.eType.Box;
		
		
	}
	PushNormalMap(_tex : string)
	{
		if(this.mTextureKey.length==1)
			this.mTextureKey.push(_tex);
		else if(this.mTextureKey.length==2)
		{
			this.mTextureKey[1]=_tex;
		}
		this.ClearBatch();
		this.PushTag("normalMap");
	}
	override EditDrop(_object: CObject): void 
	{
		if(_object instanceof CTexture)
		{
			this.SetTexture(_object.Key());
		}
	}
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		super.EditForm(_pointer,_body,_input);
		if(_pointer.member=="mSize" && this.mSize==null)
		{
			let btn=CDOM.TagToDom("button");
			btn.innerText="생성";
			btn.onclick=()=>{
				this.mSize=new CVec2();
				this.EditRefresh();
			};
			_body.append(btn);
		}
	}
	override EditHTMLInit(_div: HTMLDivElement, _pointer?: CPointer): void {
		
		super.EditHTMLInit(_div,_pointer);

		var button=CDOM.TagToDom("button");
		button.className="btn btn-primary btn-sm";
		button.innerText="TexcodiModif";
		button.onclick=()=>{
			if(this.mTextureKey.length>0)
			{
				let ani=CClass.New("CAnimation");
				if(this.mTexCodi.Equals(new CVec4(1,1,0,0))==false)
				{
					
						
					// 현재 텍스처 좌표를 절대좌표로 변환
					const absCoords = this.GetLeftTopRightBottom(this.mOwner.GetFrame());
					if(absCoords==null)	return;
					
					// CClipCoodi에 절대좌표 전달 (startX, startY, endX, endY)
					ani.Push(new CClipCoodi(0, 0, absCoords.x, absCoords.y, absCoords.z, absCoords.w));	
					
					
				}
				window["AniTool"](ani,this.mTextureKey[0]);
				window["AniToolTexcodiEvent"](this, ()=>{

					
					this.EditRefresh();
					this.ClearBatch();
				});
			}
			
			
		};
		
		_div.append(button);
		
		
	}
	// SetMargin(_val : number)
	// {
	// 	gMargine=_val;
	// }
	SetBillBoard(_enabel : boolean)
	{
		this.mShaderAttrMap.get("billboard").mData.mF32A[0]=_enabel?1.0:0.0;
		this.PushTag("billboard");
		this.ClearCRPAuto();
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
	override InitChk()
	{
		super.InitChk();

		this.SizeCac();
		if(this.mSize==null)
			this.mInit=false;

	}
	override FMatUpdate()
	{
		super.FMatUpdate();
		if(this.mYSort == true)
		{
			const yVal = this.mFMat.mF32A[13] + this.mYSortOrigin;
			let yRatio = (CPaint2D.YSortRange.y - yVal) / (CPaint2D.YSortRange.y - CPaint2D.YSortRange.x);
			this.mFMat.mF32A[14] += yRatio * CPaint2D.YSortZShift;
			this.mBW.mPos.mF32A[2]+=yRatio * CPaint2D.YSortZShift;
		}
	}
	override Update(_update : CUpdate)
	{
		super.Update(_update);
		
		
		if(this.mUpdateFMat == false)
		{
			return;
		}
		

		
		if(this.mTag.has("tail")==false || _update.DeltaTime()>1)	return;

		
		//if(this.mUpdateFMat == false) return;

		if(this.mTag.has("billboard") && this.mPosList == null)
		{
			if(this.mRenPT.length == 0) return;

			let pos=CPoolGeo.ProductV3();
			let vec=CPoolGeo.ProductV3();
			pos.mF32A[0]=this.GetFMat().mF32A[12];
			pos.mF32A[1]=this.GetFMat().mF32A[13];
			pos.mF32A[2]=this.GetFMat().mF32A[14];

			// 포지션 0이면 업데이트 중단
			if(pos.IsZero())	
			{
				CPoolGeo.RecycleV3(pos);
				CPoolGeo.RecycleV3(vec);

				return;
			}
			if(this.mBeforePos.IsZero())
				this.mBeforePos.Import(pos);
			// pos와 mBeforePos만 CPU 업데이트, 나머지 계산은 GPU로 이전
			CMath.V3SubV3(pos,this.mBeforePos,vec);
			var len=CMath.V3Len(vec);

			// 거리가 사이즈보다 크면 사이즈 크기로 리사이즈
			if(len>this.mSize.y)
			{
				CMath.V3AddV3(pos,CMath.V3MulFloat(vec,-this.mSize.y/len,vec),this.mBeforePos);
			}

			// 거리가 너무 가까우면 사이즈 0으로 줄임
			else if(len<0.001)
			{
				this.mBeforePos.Import(pos);
			}

			// 멈춰있다면 서서히 lerp
			else if(this.mStopPos.Equals(pos))
			{
				CMath.V3AddV3(
					CMath.V3MulFloat(pos,_update.DeltaTime()*this.mRemoveSpeed),
					CMath.V3MulFloat(this.mBeforePos,1-_update.DeltaTime()*this.mRemoveSpeed),
					this.mBeforePos
				);
			}
			this.mStopPos.Import(pos);

			this.mTMat.SetV3(0,pos);
			this.mTMat.SetV3(1,this.mBeforePos);
			this.mTMat.mF32A[8] = this.mSize.x;
			this.mTMat.mF32A[9] = this.mSize.y;
			this.mTMat.SetV3(3,this.mPos);

			if(this.mLastHide)
			{
				this.mTMat.mF32A[3]=1;
				this.mTMat.mF32A[7]=1;
				this.mTMat.mF32A[11]=0;
				this.mTMat.mF32A[15]=0;
			}
			else
			{
				this.mTMat.mF32A[3]=1;
				this.mTMat.mF32A[7]=1;
				this.mTMat.mF32A[11]=1;
				this.mTMat.mF32A[15]=1;
			}
			CPoolGeo.RecycleV3(pos);
			CPoolGeo.RecycleV3(vec);
			
		}
		else
		{
			if(this.mTag.has("billboard") && this.mShaderAttrMap.get("billboard").mData.mF32A[0] != 2.0) {
				this.mShaderAttrMap.get("billboard").mData.mF32A[0] = 2.0;
				this.ClearCRPAuto();
			}

			let pos=CPoolGeo.ProductV3();
			pos.mF32A[0]=this.GetFMat().mF32A[12];
			pos.mF32A[1]=this.GetFMat().mF32A[13];
			pos.mF32A[2]=this.GetFMat().mF32A[14];
			//let pos = this.GetFMat().xyz;
			
			let v=CPoolGeo.ProductV3();
			for(let i=0;i<4;++i)
			{
				CMath.V3AddV3(this.mPosList[i], pos, v);
				this.mTMat.SetV3(i,v);
			}
			

			this.mTMat.mF32A[3]=1;
			this.mTMat.mF32A[7]=1;
			this.mTMat.mF32A[11]=1;
			this.mTMat.mF32A[15]=1;
			CPoolGeo.RecycleV3(pos);
			CPoolGeo.RecycleV3(v);

		
		}//else

		
		
		
	}
	

	override Prefab(_owner : CSubject)
	{
		super.Prefab(_owner);
		this.SizeCac();
	}
	
	SizeCac()
	{
		if((this.mSize==null || this.mSize.IsZero())  && this.mOwner!=null && this.mTextureKey.length>0)
		{
			var tex=this.mOwner.GetFrame().Res().Find(this.mTextureKey[0]);
			if(tex instanceof CTexture)
			{
				if(tex==null || (tex.GetWidth()==1 && tex.GetHeight()==1))	return;
				this.SetSize(new CVec2(tex.GetWidth(),tex.GetHeight()));
				this.MatUpdate();
				this.EditRefresh();
			}
			else if(tex instanceof CAtlas)
			{
				if(this.mTexCodi.x != 1 || this.mTexCodi.y != 1 || this.mTexCodi.z != 0 || this.mTexCodi.w != 0) {
					let width = Math.round(tex.GetWidth() * this.mTexCodi.x);
					let height = Math.round(tex.GetHeight() * this.mTexCodi.y);
					this.SetSize(new CVec2(width, height));
					this.EditRefresh();
				}
			}
			
		}
	}
	
	override EmptyRPChk()
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
		if(this.mTextureKey.length==0)
		{
			this.SetTexture(this.GetOwner().GetFrame().Pal().GetBlackTex());
		}
		// if(rp.mCullFace==null)
		// {

		// }
			//rp.mCullFace = CRenderPass.eCull.None;
	}

	//Wind() {this.PushTag("wind"); }
	
	
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);
		if(_pointer.member == "mYSort" || _pointer.member == "mYSortOrigin") 
		{
			if(_pointer.member == "mYSort")
			{
				this.SetYSort(this.mYSort);
			}
				
			this.MatUpdate();
		}
		else if(_pointer.IsRef(this.mWindInfluence))
		{
			this.Wind(this.mWindInfluence.x);
		}
		else if(_child)
		{
			if(_pointer.IsRef(this.mPos) ||
			_pointer.IsRef(this.mSize) || _pointer.IsRef(this.mPivot))
			{
				this.MatUpdate();	
			}
		}
	}
	
	

	
	MatUpdate()
	{
		if(this.mSize==null)
			return;

		
		this.mBound.mMin.x = -CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMin.y = -CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMin.z = -0.5;

		this.mBound.mMax.x = CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMax.y = CUtilRender.Mesh2DSize * 0.5;
		this.mBound.mMax.z = 0.5;
		
		let bSca = this.GetScale();
		let lpos=this.mPos.Export();
		lpos.x += this.mBound.mMax.x*bSca.x*this.mPivot.x;
		lpos.y += this.mBound.mMax.y*bSca.y*this.mPivot.y;
		
		CMath.MatScale(bSca,this.mLMat);
	
		this.mLMat.mF32A[12] = lpos.x;
		this.mLMat.mF32A[13] = lpos.y;
		this.mLMat.mF32A[14] = lpos.z;
		
		this.mLMat.UnitCheck();
	

		


		this.mBound.MatCoordi(this.mLMat);

		this.mBound.mMax.z=this.mBound.GetOutRadius();
		this.mBound.mMin.z=-this.mBound.mMax.z;
	


		this.mBW.mRadian=0;


		
		this.mUpdateLMat=true;
	}
	GetHalf()
	{
		var pos=new CVec3((this.mSize.x * 0.5)*this.mPivot.x, (this.mSize.y * 0.5)*this.mPivot.y, 0);
		pos = CMath.V3MulMatNormal(pos, this.mOwner.GetMat());
		return pos;
	}
	GetScale()
	{
		return new CVec3(this.mSize.x / CUtilRender.Mesh2DSize*this.mRevers.x*this.mSca.x, this.mSize.y / CUtilRender.Mesh2DSize*this.mRevers.y*this.mSca.y, 1);
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
	GetMesh() : CMesh
	{
		return null;
	}
	override Start(): void {
		super.Start();

		this.MatUpdate();
		if(this.mPosList!=null)
		{
			this.mBound.Reset();
			this.mBound.InitBound(this.mPosList);
			this.mBound.SetType(CBound.eType.Box);
			
		}
		else if(this.mTag.has("tail"))
		{
			this.mBound.Reset();
			this.mBound.InitBound(this.mSize.y);
			this.mBound.SetType(CBound.eType.Box);
		}
		
	}
	// //left,top,right,bottom
	// override GetLeftTopRightBottom(_frame : CFrame) 
	// {
	// 	const tex = _frame.Res().Find(this.mTextureKey[0]) as CTexture;
	// 	if(tex==null || (tex.GetWidth()==1 && tex.GetHeight()==1))	return null;
	// 	const imgW = tex.GetWidth();
	// 	const imgH = tex.GetHeight();

	// 	const uv = this.mTexCodi;

	// 	// // 역변환: tex = (left, top, right, bottom) in px
	// 	// const width = uv.x * imgW;
	// 	// const height = uv.y * imgH;
	// 	// const left = uv.z * imgW;
	// 	// const top = (1 - uv.w - uv.y) * imgH;
	// 	// const right = left + width;
	// 	// const bottom = top + height;
		
	// 	const startX = Math.round((this.mTexCodi.z - (gMargin*0.5)/imgW) * imgW);
	// 	const startY = Math.round((1 - this.mTexCodi.w - this.mTexCodi.y - (gMargin*0.5)/imgH) * imgH);
		
	// 	const endX = Math.round((this.mTexCodi.z + this.mTexCodi.x + gMargin/imgW) * imgW);
	// 	const endY = Math.round((1 - this.mTexCodi.w + gMargin/imgH) * imgH);
		
	// 	return new CVec4(startX, startY, endX, endY);


	// }
	override Render(_vf : CShader)
	{

		

		var barr=this.RenderBatch(_vf,1);
		if(barr==null)	return;

		if(this.mSize==null || this.mTextureKey.length==0)
		{
			this.mBatchMap.clear();
			//this.mBatchLastVF=null;
			return;
		}
			
		
			

		this.mOwner.GetFrame().BMgr().BatchOn();
		this.Common(_vf);
		if(this.mTag.has("tail"))
		{
			let wsa=new CShaderAttr("worldMat", this.mTMat);
			this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
		}
		else
		{
			let wsa=new CShaderAttr("worldMat", this.GetFMat());
			switch(this.mWorldMatType)
			{
			
				case CMat.eType.Short2D:	wsa.mKey="worldMatShort";	break;
			}
			wsa.mType=this.mWorldMatType;
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType",new CVec1(this.mWorldMatType)));
			this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
			//let wsa=new CShaderAttr("worldMat", this.GetFMat());
			//this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
		}
		
		
		if(_vf.mUniform.get("windInfluence")!=null)
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));
		this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
		var dm=this.GetDrawMesh("Artgine/DM/2D",_vf,this.mOwner.GetFrame().Pal().MCI2D());
		this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);

		barr[0]=this.mOwner.GetFrame().BMgr().BatchOff();
		
	}
	
	// override SetTexCodi(_uv : CVec4) : void;
	// override SetTexCodi(_uv : CVec4,_margin : number) : void;
	// override SetTexCodi(_stX : number,_stY : number,_edX : number,_edY : number,_imgW : number,_imgH : number) : void;
	// override SetTexCodi(_stX : number,_stY : number,_edX : number,_edY : number,_imgW : number,_imgH : number,_margin : number) : void;
	// override SetTexCodi(_stX : any,_stY =null,_edX =null,_edY =null,_imgW =null,_imgH =null,_margin=gMargin)
	// {
	// 	if(this.PushTag("codi"))
	// 		this.ClearBatch();
	// 	if(_stX==null)
	// 	{
	// 		this.mTexCodi.x=1-_stY;
	// 		this.mTexCodi.y=1-_stY;
	// 		this.mTexCodi.z=_stY*0.5;
	// 		this.mTexCodi.w=_stY*0.5;
	// 	}
	// 	else if(_stX instanceof CVec4)
	// 	{
	// 		//this.mTexCodi.Import(_stX);
	// 		if(_stY==null)	_stY=0;
	// 		this.mTexCodi.x=_stX.x-_stY;
	// 		this.mTexCodi.y=_stX.y-_stY;
	// 		this.mTexCodi.z=_stX.z+_stY*0.5;
	// 		this.mTexCodi.w=_stX.w+_stY*0.5;
	// 	}
	// 	else
	// 	{
	// 		this.mTexCodi.x = (_edX - _stX) / _imgW-_margin/_imgW;
	// 		this.mTexCodi.y = (_edY - _stY) / _imgH-_margin/_imgH;

	// 		this.mTexCodi.z = (_stX) / _imgW+(_margin*0.5)/_imgW;
	// 		this.mTexCodi.w = 1-(_stY / _imgH)-this.mTexCodi.y-(_margin*0.5)/_imgH;
	// 	}
	// }

	// // 텍스처 사이즈를 이용해서 절대좌표 구하기 (보정값 반영)
	// AbsoluteCoordsFromTexCodi(_imgW : number, _imgH : number) : CVec4
	// {
	// 	const startX = Math.round((this.mTexCodi.z - (gMargine*0.5)/_imgW) * _imgW);
	// 	const startY = Math.round((1 - this.mTexCodi.w - this.mTexCodi.y - (gMargine*0.5)/_imgH) * _imgH);
		
		
	// 	const endX = Math.round((this.mTexCodi.z + this.mTexCodi.x + gMargine/_imgW) * _imgW);
	// 	const endY = Math.round((1 - this.mTexCodi.w + gMargine/_imgH) * _imgH);
		
	// 	return new CVec4(startX, startY, endX, endY);
	// }

	// // 절대좌표를 텍스처 좌표로 변환 (보정값 반영)
	// static TexCodiFromAbsoluteCoords(_startX : number, _startY : number, _endX : number, _endY : number, _imgW : number, _imgH : number) : CVec4
	// {
	// 	// 절대좌표를 텍스처 좌표로 변환 (SetTexCodi와 동일한 보정값 적용)
	// 	const widthRatio = (_endX - _startX) / _imgW - 0.2/_imgW;
	// 	const heightRatio = (_endY - _startY) / _imgH - 0.2/_imgH;
	// 	const startXRatio = _startX / _imgW + 0.1/_imgW;
	// 	const startYRatio = 1 - (_startY / _imgH) - heightRatio - 0.1/_imgH;
		
	// 	return new CVec4(widthRatio, heightRatio, startXRatio, startYRatio);
	// }
	SetPivot(_pivot : CVec3)
	{
		this.mPivot = _pivot;
		this.MatUpdate();
	}
	SetSize(_size : CVec2)
	{
		
		if(_size!=null && _size.IsZero())
			this.mSize=null;
		else if(this.mSize==null)
		{
			this.mSize=new CVec2();
			this.mSize.Import(_size);
		}
		else
			this.mSize.Import(_size);
		this.MatUpdate();
	}
	SetPos(_pos : CVec3)
	{
		this.mPos = _pos;
		this.MatUpdate();
	}
	SetSca(_sca : CVec2)
	{
		if(this.mSca.Equals(_sca))	return;
		this.mSca = _sca;
		this.MatUpdate();
	}
	// SetRot(_rot : CVec3|CVec4)
	// {
	// 	if(_rot instanceof CVec4)
	// 		this.mRot.Import(_rot);
	// 	else
	// 		this.mRot.Import(CMath.EulerToQut(_rot));
	
	// 	this.PRSReset();
	// }
	SetReverse(_x : boolean,_y : boolean)
	{
		if(_x)	this.mRevers.x=-1;
		else	this.mRevers.x=1;

		if(_y)	this.mRevers.y=-1;
		else	this.mRevers.y=1;
		this.MatUpdate();
		
		
		
		
	}
	


	Tail()
	{
		if(this.mTag.has("tail")==false)
		{
			this.PushTag("tail");
			this.ClearBatch();
			this.mUpdateLMat=true;
		}
		
		
	}
	Wind(_influence: number) 
	{
		this.Tail();

		this.PushTag("wind");
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
			if(this.mTMat==null)
				this.mTMat=new CMat();
			this.Tail();
			this.mPosList=_array;

			this.mBound.Reset();
			this.mBound.InitBound(this.mPosList);
			this.mBound.SetType(CBound.eType.Box);
			this.mBW.mRadian=0;
			this.mLMat.Unit();
		
		}
			
	}
	override ResetDecal(_slot: number, _pos: CVec3 = null, _size: CVec3 = null, _dir: CVec3 = new CVec3(0, 0, -1), _imageRot: number = 0): void {
		super.ResetDecal(_slot, _pos, _size, _dir, _imageRot);
	}
	// CacBound()
	// {
	// 	if(this.mTag.has("tail") && this.mSize!=null)
	// 	{
	// 		this.mBoundFMat.Import(this.mBound);
	// 		this.mBoundFMat.GetCenter(this.mBoundFMatC);
	// 		this.mBoundFMatR=this.mSize.x>this.mSize.y?this.mSize.x:this.mSize.y;
	// 		this.mBoundFMatR*=1.5;
	// 	}
	// 	else
	// 	{
	// 		super.CacBound();
	// 	}
		
	// }
	// Camera()
	// {
	// 	if(this.mPosList!=null)
	// 	{
	// 		this.mBound.Reset();
	// 		this.mBound.InitBound(this.mPosList);
	// 		this.mBound.SetType(CBound.eType.Box);



	// 		if(this.mUpdateFMat == false) return;

	// 		if(this.mWMatMul==false)
	// 		{
	// 			this.GetFMat().SetV3(0,this.mPosList[0]);
	// 			this.GetFMat().SetV3(1,this.mPosList[1]);
	// 			this.GetFMat().SetV3(2,this.mPosList[2]);
	// 			this.GetFMat().SetV3(3,this.mPosList[3]);
				
	// 		}
	// 		else
	// 		{
	// 			let v0=CPoolGeo.ProductV3();
	// 			let v1=CPoolGeo.ProductV3();
	// 			let v2=CPoolGeo.ProductV3();
	// 			let v3=CPoolGeo.ProductV3();

	// 			let vd=CPoolGeo.ProductV3();
				

	// 			let pos = this.GetFMat().xyz;
				
	// 			this.mFMat.mF32A[0]=1;
	// 			this.mFMat.mF32A[5]=1;
	// 			this.mFMat.mF32A[10]=1;
	// 			this.CacBound();
	// 			CMath.V3AddV3(this.mPosList[0], pos, v0);
	// 			CMath.V3AddV3(this.mPosList[1], pos, v1);
	// 			CMath.V3AddV3(this.mPosList[2], pos, v2);
	// 			CMath.V3AddV3(this.mPosList[3], pos, v3);

	// 			this.GetFMat().SetV3(0,v0);
	// 			this.GetFMat().SetV3(1,v1);
	// 			this.GetFMat().SetV3(2,v2);
	// 			this.GetFMat().SetV3(3,v3);
				
	// 			CPoolGeo.RecycleV3(v0);
	// 			CPoolGeo.RecycleV3(v1);
	// 			CPoolGeo.RecycleV3(v2);
	// 			CPoolGeo.RecycleV3(v3);
	// 			CPoolGeo.RecycleV3(vd);


			
				
	// 		}
	// 		this.mFMat.mF32A[3]=1;
	// 		this.mFMat.mF32A[7]=1;
	// 		this.mFMat.mF32A[11]=1;
	// 		this.mFMat.mF32A[15]=1;

	// 		return;
	// 	}




	// 	if(this.mRenPT.length==0)	return;
	// 	var L_nor=new CVec3();
	// 	var st=new CVec3(), ed=new CVec3();
	
	// 	// if(this.mTag.has("billboard"))
	// 	// {
	// 	// 	//일반 꼬리는 빌보드 기본이라서 다시 넣으면 중복 적용
	// 	// 	CAlert.W("tail billboard not!");
	// 	// }
	// 	st=this.GetFMat().xyz;
	// 	CMath.V3AddV3(this.mPos,st,st);
	// 	ed=this.mBeforePos;
	// 	CMath.V3AddV3(this.mPos,ed,ed);
		
	// 	L_nor=CMath.V3Cross(this.mRenPT[0].mCam.GetView(),CMath.V3Nor(CMath.V3SubV3(st, this.mBeforePos)));
	// 	//L_nor=new CVec3(1,0,0);//CMath.V3Nor(CMath.V3SubV3(st, this.mBeforePos));
	// 	//this.PushTag("billboard");
	// 	let v0=CMath.V3SubV3(st, CMath.V3MulFloat(L_nor, (this.mSize.x / 2)));
	// 	let v1=CMath.V3AddV3(st, CMath.V3MulFloat(L_nor, (this.mSize.x / 2)));
	// 	let v2=CMath.V3SubV3(ed, CMath.V3MulFloat(L_nor, (this.mSize.x / 2)));
	// 	let v3=CMath.V3AddV3(ed, CMath.V3MulFloat(L_nor, (this.mSize.x / 2)));


	// 	this.GetFMat().SetV3(0,v0);
	// 	this.GetFMat().SetV3(1,v1);
	// 	this.GetFMat().SetV3(2,v2);
	// 	this.GetFMat().SetV3(3,v3);


	// 	if(this.mLastHide)
	// 	{
	// 		this.mFMat.mF32A[3]=1;
	// 		this.mFMat.mF32A[7]=1;
	// 		this.mFMat.mF32A[11]=0;
	// 		this.mFMat.mF32A[15]=0;
	// 	}
	// 	else
	// 	{
	// 		this.mFMat.mF32A[3]=1;
	// 		this.mFMat.mF32A[7]=1;
	// 		this.mFMat.mF32A[11]=1;
	// 		this.mFMat.mF32A[15]=1;
	// 	}
		

	// 	this.mBound.Reset();
	// 	this.mBound.InitBound(CUtilRender.Mesh2DSize);
	// 	this.mBound.SetType(CBound.eType.Box);
	// 	this.mUpdateLMat=true;

	// }
	
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
			this.mParent=CDOM.PaintDiv();
		else
		{
			this.mParent=_parent;
			//this.m_parent.style.pointerEvents="none";
			this.mParent.style.position="relative";
			this.mParent.style.overflow="hidden";
		}
			
	}
	override StartChk(): boolean {
		super.StartChk();

		this.mStartChk=false;
		return true;
	}
	override SetEnable(_val: boolean)
	{
		super.SetEnable(_val);
		this.mElement.hidden=!_val;
	}
	override SetPos(_pos : CVec3)
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
	override UpdateRenPt()
	{
		for(let i=0;i<this.mRenPT.length;++i)
		{
			let ren=this.mRenPT[i];
			ren.mShow=2;
			ren.mDistance=0x7FFFFE00;
		}
	}
	override SetSize(_size: CVec2): void {
		this.mSize=_size;
		this.mUpdateFMat=true;
		this.mAttach=false;	
	}
	GetElement()
	{
		return this.mElement;
	}
	// ClearCRPAuto()
	// {
	// 	if(this.GetOwner()==null)	return;
	// 	this.mElement.hidden=!this.GetOwner().IsEnable();
	// }
	override EmptyRPChk()
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
	override Update(_delay)
	{
		if(this.mRenPT.length==0 || this.mElement==null)	return;
		if(this.mRenPT[0].mCam.mUpdateMat!=0 || this.mOwner.mUpdateMat!=0 || this.mOwner.GetFrame().Win().IsResize() || this.mUpdateFMat==true || this.mElement.clientWidth!=this.mOrgSize.x){}
		else return;

		//if(this.GetOwner().IsDestroy())this.mElement.remove();
		//this.MatUpdate();
		//this.CacBound();
		
		this.mUpdateFMat=false;
		
		if(this.mAttach==false)
		{
			this.mParent.appendChild(this.mElement);
			// if(this.mParent==CDOM.CanvasDiv())
			// 	this.mElement.style.zIndex=900+"";
			this.mElement.style.position="absolute";
			//if(this.mElement.style.pointerEvents=='')
			//	this.mElement.style.pointerEvents="none";
			this.mAttach=true;	
		}

		
		let zoom = 1 / this.mRenPT[0].mCam.mZoom;
		let pos=this.GetOwner().GetMat().xyz;
		
		// pos.x*=zoom;
		// pos.y*=zoom;
		//this.mBound.SetType(CBound.eType.Box);
		
		
		

		if(this.mElement.offsetWidth != 0)
		{
			// DOM 크기가 바뀌었을 때만 바운딩 박스 갱신
			if (this.mOrgSize.x != this.mElement.clientWidth || this.mOrgSize.y != this.mElement.clientHeight)
			{
				this.mOrgSize.x = this.mElement.clientWidth;
				this.mOrgSize.y = this.mElement.clientHeight;

				// 명시적인 mSize가 없을 때 DOM 실제 크기를 바운딩 박스에 반영
				if (this.mSize == null)
				{
					this.mBound.mMin.x = -this.mOrgSize.x * 0.5;
					this.mBound.mMin.y = -this.mOrgSize.y * 0.5;
					this.mBound.mMax.x = this.mOrgSize.x * 0.5;
					this.mBound.mMax.y = this.mOrgSize.y * 0.5;

					// 부모 CUI가 있다면 앵커 재계산 트리거
					if (this.mOwner && (this.mOwner as any).mUpdateAnchor !== undefined)
					{
						(this.mOwner as any).mUpdateAnchor = true;
					}
				}
			}
		}
		let pivotX=0;
		let pivotY=0;
		if(this.mSize!=null)
		{
			//let sizeX=this.mSize.x*this.GetOwner().GetMat().mF32A[0];
			//let sizeX=this.mSize.x*this.GetOwner().GetMat().mF32A[0];
			pos.x+=this.mPivot.x*this.mSize.x*0.5;
			pos.y+=this.mPivot.y*this.mSize.y*0.5;
			if(this.mSize.x!=0)
				this.mElement.style.width=this.mSize.x+"px";
			if(this.mSize.y!=0)
				this.mElement.style.height=this.mSize.y+"px";
			//this.m_html.style.scale="scale("+zoom+","+zoom+")";
			this.mElement.style.transform = "scale(" + (zoom*this.GetOwner().GetMat().mF32A[0]) + "," + (zoom*this.GetOwner().GetMat().mF32A[5]) + ")";
			pivotX=this.mOrgSize.x*0.5;
			pivotY=this.mOrgSize.y*0.5;
		}
		else
		{
			pivotX=this.mOrgSize.x*(this.mPivot.x*0.5+0.5);
			pivotY=this.mOrgSize.y*(this.mPivot.y*0.5+0.5);
		}
		
	
		// let winX=this.mRenPT[0].mCam.mWidth;
		// let winY=this.mRenPT[0].mCam.mHeight;
		// if(winX==0)	winX=this.mOwner.GetFrame().PF().mWidth;
		// if(winY==0)	winY=this.mOwner.GetFrame().PF().mHeight;
		// winX/=this.mOwner.GetFrame().PF().mWidth;
		// winY/=this.mOwner.GetFrame().PF().mHeight;
		
		pos=CMath.V3MulMatCoordi(pos,this.mRenPT[0].mCam.GetViewMat());
		pos=CMath.V3MulMatCoordi(pos,this.mRenPT[0].mCam.GetProjMat());
		var x=(pos.x+1)/2.0;
		var y=(-pos.y+1)/2.0;

		var left=this.GetOwner().GetFrame().PF().mLeft;
		var top=this.GetOwner().GetFrame().PF().mTop;
		left+=x*this.mOwner.GetFrame().PF().mWidth-pivotX+this.mPos.x;
		top+=y*this.mOwner.GetFrame().PF().mHeight-pivotY-this.mPos.y;
		left=Math.trunc(left);
		top=Math.trunc(top);
		this.mElement.style.left=left+"px";
		this.mElement.style.top=top+"px";


		
	}

	override Destroy(): void 
	{
		super.Destroy();
		if(this.mElement!=null)
			this.mElement.remove();
	}
}

// 한가지 텍스쳐만 사용( 셰이더 공유하기 위함 )
export class CPaint2DMerge extends CPaint
{
	mMatList : Array<CMat>;
    mCodiList : Array<CVec4>;
    mTexSize : CVec2=null;

	mMeshDataNode : CMeshDataNode;
	mHash : string;

	mYSort : boolean = false;
	mWindInfluence : CVec1 = new CVec1(0.0);

	constructor(_texture : CFontRef|string, _matList : Array<CMat>, _codiList : Array<CVec4> = [])
	{
		super();

		this.mMatList = _matList;
		this.mCodiList=_codiList;
		if(_texture!=null)
		{
			if(_texture instanceof CFontRef)
				this.SetTexture(_texture.mKey);
			else
				this.SetTexture(_texture);
		}

        this.PushTag("merge");
	}

    override InitChk()
	{
		super.InitChk();
		
		if(this.mTexSize==null)
		{
			if(this.mOwner!=null && this.mTextureKey.length>0)
			{
				var tex=this.mOwner.GetFrame().Res().Find(this.mTextureKey[0]);
				if(tex==null)
				{
					this.mInit=false;
					return;
				}
				else if(tex instanceof CTexture)
				{
					if(tex==null || (tex.GetWidth()==1 && tex.GetHeight()==1))	return;
					this.mTexSize=new CVec2(tex.GetWidth(),tex.GetHeight());
					
				}
				else if(tex instanceof CAtlas)
				{
					this.mTexSize=new CVec2(tex.GetWidth(),tex.GetHeight());
				}
				else
				{
					CAlert.E("나올수 없다!");
				}
				
			}
		}
		

	}

	override Start(): void {
		this.mMeshDataNode = new CMeshDataNode();
		this.mMeshDataNode.ci = new CMeshCreateInfo();

		this.mBound.Reset();
		this.mBound.SetType(CBound.eType.Box);

		this.mHash = "";
		this.Merge();
	}

	override Render(_vf: CShader): void {
		var barr=this.RenderBatch(_vf,1);
		if(barr==null)	return;

		this.mOwner.GetFrame().BMgr().BatchOn();
		this.Common(_vf);

		let wsa=new CShaderAttr("worldMat", this.GetFMat());
		switch(this.mWorldMatType)
		{
			case CMat.eType.Short2D:	wsa.mKey="worldMatShort";	break;
		}
		wsa.mType=this.mWorldMatType;
		this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType",new CVec1(this.mWorldMatType)));
		this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);

		if(_vf.mUniform.get("windInfluence")!=null)
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));
		this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
		var dm=this.GetDrawMesh("Artgine/DM/2DM"+this.mHash,_vf,this.mMeshDataNode.ci);
		this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);

		barr[0]=this.mOwner.GetFrame().BMgr().BatchOff();
	}

	Wind(_influence: number) 
	{
		this.PushTag("wind");
		this.mWindInfluence.x = _influence;
	}

	SetYSort(_enable : boolean) {
		this.mYSort = _enable;
	}

	Merge() {
        let GetTexCodiedUV=(_uv : CVec2, _texCodi : CVec4) : CVec2 =>{
			let result : CVec2 = new CVec2(0.0,0.0);
		
			result.x = _uv.x*_texCodi.x+_texCodi.z;
			result.y = _uv.y*_texCodi.y+_texCodi.w;
		
			result.x=Math.abs(result.x);
			result.y=Math.abs(result.y);
			return result;
		}

		let posb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Position);
		let uvb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.UV);
		let norb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Normal);
		let inb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Index);
		if(posb.length == 0) {
			this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.Position);   // pos
            this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.Position);   // sca
			posb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Position);
		}
		if(uvb.length == 0) {
			this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.UV);
			uvb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.UV);
		}
		if(norb.length == 0) {
			this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.Normal);
			norb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Normal);
		}
		if(inb.length == 0) {
			this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.Index);
			inb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Index);
		}

		const rtDir = new CVec3(0.5, 0.5, 0);
		const lbDir = new CVec3(-0.5, -0.5, 0);
		const ltDir = new CVec3(-0.5, 0.5, 0);
		const rbDir = new CVec3(0.5, -0.5, 0);

        const uv0 = new CVec2(0, 0);
        const uv1 = new CVec2(1, 0);
        const uv2 = new CVec2(1, 1);
        const uv3 = new CVec2(0, 1);

		const nor = new CVec3(0, 0, 1);

        const scaB = new CVec3();
        const scaT = new CVec3();

		for(let i = posb[0].bufF.Size(3); i < this.mMatList.length; i++)
		{
			const pMat = this.mMatList[i];

            scaB.x = CMath.V3Len(pMat.GetV3(0));
            scaB.y = CMath.V3Len(pMat.GetV3(1));
            scaB.z = CMath.V3Len(pMat.GetV3(2));

            scaT.x = -scaB.x;
            scaT.y = -scaB.y;
            scaT.z = -scaB.z;

			if(this.mYSort) {
				const ySortOrigin = -0.5 * scaB.y + 1;
				const yVal = pMat.mF32A[13] + ySortOrigin;
				const yRatio = (CPaint2D.YSortRange.y - yVal) / (CPaint2D.YSortRange.y - CPaint2D.YSortRange.x);
				pMat.mF32A[14] += yRatio * CPaint2D.YSortZShift;
			}
			this.mHash+=pMat.ToStr();

            // posb
			const lb = CMath.V3MulMatCoordi(lbDir, pMat);
			const rb = CMath.V3MulMatCoordi(rbDir, pMat);
			const rt = CMath.V3MulMatCoordi(rtDir, pMat);
			const lt = CMath.V3MulMatCoordi(ltDir, pMat);
			posb[0].bufF.Push(lb);
			posb[0].bufF.Push(rb);
			posb[0].bufF.Push(rt);
			posb[0].bufF.Push(lt);
            posb[1].bufF.Push(scaB);
            posb[1].bufF.Push(scaB);
            posb[1].bufF.Push(scaT);
            posb[1].bufF.Push(scaT);
			this.mBound.InitBound(lb);
			this.mBound.InitBound(rb);
			this.mBound.InitBound(rt);
			this.mBound.InitBound(lt);

            // uvb
            let codi  : CVec4=new CVec4(1, 1, 0, 0);;;
			if(this.mCodiList[i]!=null)
			{
				const v = this.mCodiList[i];
				if(v.x <= 1 && v.y <= 1 && v.z <= 1 && v.w <= 1)
				{
					// mTexCodi UV 포맷: (scaleX, scaleY, offsetX, offsetY)
					codi.Import(v);
				}
				else
				{
					// 픽셀 좌표 포맷: (x1, y1, x2, y2)
                	codi.x = (v.z - v.x) / this.mTexSize.x;
					codi.y = (v.w - v.y) / this.mTexSize.y;
					codi.z = v.x / this.mTexSize.x;
					codi.w = 1-(v.y / this.mTexSize.x)-codi.y;
				}

				//codi.y = (this.mCodiList[i].w - this.mCodiList[i].y - gMargin) / this.mTexSize.y;

				// codi.z = (this.mCodiList[i].x + gMargin * 0.5) / this.mTexSize.x;
				// codi.w = 1-(this.mCodiList[i].y + gMargin * 0.5) / this.mTexSize.y;

				// this.mTexCodi.x = (_edX - _stX) / _imgW-_margin/_imgW;
				// this.mTexCodi.y = (_edY - _stY) / _imgH-_margin/_imgH;

				// this.mTexCodi.z = (_stX) / _imgW+(_margin*0.5)/_imgW;
				// this.mTexCodi.w = 1-(_stY / _imgH)-this.mTexCodi.y-(_margin*0.5)/_imgH;

			}
		
            let uvLB = GetTexCodiedUV(uv0, codi);
            let uvRB = GetTexCodiedUV(uv1, codi);
            let uvRT = GetTexCodiedUV(uv2, codi);
            let uvLT = GetTexCodiedUV(uv3, codi);

            // L과 B만 음수로 변환
            uvLB.x = -uvLB.x;
            uvLB.y = -uvLB.y;
            uvRB.x =  uvRB.x;
            uvRB.y = -uvRB.y;
            uvRT.x =  uvRT.x;
            uvRT.y =  uvRT.y;
            uvLT.x = -uvLT.x;
            uvLT.y =  uvLT.y;
			
			uvb[0].bufF.Push(uvLB);
			uvb[0].bufF.Push(uvRB);
			uvb[0].bufF.Push(uvRT);
			uvb[0].bufF.Push(uvLT);

            // norb
			const rotatedNor = CMath.V3MulMatNormal(nor, pMat);
			norb[0].bufF.Push(rotatedNor);
			norb[0].bufF.Push(rotatedNor);
			norb[0].bufF.Push(rotatedNor);
			norb[0].bufF.Push(rotatedNor);

			inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 0);
			inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 1);
			inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 2);
			inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 2);
			inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 3);
			inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 0);

			this.mMeshDataNode.ci.vertexCount += 4;
			this.mMeshDataNode.ci.indexCount += 6;
		}

		this.mBound.mMin.z -= 0.5;
		this.mBound.mMax.z += 0.5;

		this.mHash = CHash.HashCode(this.mHash) + "";
	}

	override EmptyRPChk(): void {
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
		if(this.mTextureKey.length==0)
		{
			this.SetTexture(this.GetOwner().GetFrame().Pal().GetBlackTex());
		}
	}
}