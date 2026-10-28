
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
import { CPaintMerge } from "./CPaintMerge.js";



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
    override Icon(){ return "bi bi-image"; }
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

	//크기/피벗/위치/반전/스케일은 메시 정점에 구워져 있다. 이 값이 바뀌면 다른 메시를 쓴다
	mMeshKey="";
	//피벗 오프셋이 포함된 로컬 위치. 메시에 구워진 값이며 tail 모드에서만 직접 쓴다
	mLPos=new CVec3();
	protected mLocalMat : CMat=null;

	//X는 크기,Y는 꼬리
	public mPosList : Array<CVec3>=null;
	mTMat : CMat;
	//public mWMatMul=true;
	public mLastHide=true;

	public mWindInfluence : CVec1 = new CVec1(0.0);
	//mMargin=0.2;

	
	
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mMeshKey" || _member=="mLPos" || _member=="mLocalMat")	return false;
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
		this.mLPos.Zero();
		this.mMeshKey="";
		
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
		if(this.mTag.has("normalMap"))
			this.mTextureKey[1]=_tex;
		else
		{
			this.mTextureKey.splice(1,0,_tex);
			this.PushTag("normalMap");
		}
		this.ClearBatch();
	}
	// R:AO G:roughness B:metallic A:emissive. mMaterial의 해당 값이 -1일 때만 텍스쳐 값을 쓴다(CPaint.ts 주석 참고)
	PushMaterialMap(_tex : string)
	{
		this.mTextureKey[this.mTag.has("normalMap")?2:1]=_tex;
		this.ClearBatch();
		this.PushTag("materialMap");
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
		this.ClearBatch();
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
	override FMatUpdate()	{}
	override Update(_update : CUpdate)	{}
	

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
	
	

	
	MatUpdate()	{}
	//메시에 구워진 크기/피벗/위치를 행렬로 되돌려 준다(머지 슬롯과 도구용). 매번 새로 계산한다
	override GetMat() : CMat	{	return null;	}
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
	override Render(_vf : CShader)	{}
	
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
			this.mUpdateReq=true;
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
			this.mLPos.Zero();
		
		}
			
	}
	override ResetDecal(_slot: number, _pos: CVec3 = null, _size: CVec3 = null, _dir: CVec3 = new CVec3(0, 0, -1), _imageRot: number = 0): void {
		super.ResetDecal(_slot, _pos, _size, _dir, _imageRot);
	}
	
	
}

/*
바디에 붙어서 작동한다
*/
export class CPaintHTML extends CPaint2D
{
    override Icon(){ return "bi bi-filetype-html"; }
	
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
	override UpdateRenPt()	{}
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
	override Update(_delay)	{}

	override Destroy(): void 
	{
		super.Destroy();
		if(this.mElement!=null)
			this.mElement.remove();
	}
}

// 한가지 텍스쳐만 사용( 셰이더 공유하기 위함 )
export class CPaint2DMerge extends CPaintMerge
{
    override Icon(){ return "bi bi-images"; }
	mMatList : Array<CMat>;
	mCodiList : Array<CVec4>;
	mTexSize : CVec2=null;

	mYSort : boolean = false;
	mWindInfluence : CVec1 = new CVec1(0.0);

	protected mSlotCodi=new Float32Array(0);
	protected mSlotCodiUse=new Uint8Array(0);
	//슬롯 알파는 정점 sca 채널의 z로 올라가 셰이더에서 to_uv.z로 알파에 곱해진다
	protected mSlotAlpha=new Float32Array(0);
	protected mSlotAlphaInit=new Array<number>();

	constructor(_texture : CFontRef|string, _matList : Array<CMat>=[], _codiList : Array<CVec4> = [])
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
		this.BuildSlot();
		for(let i=0;i<this.mMatList.length;++i)
			this.PushSlot(this.mMatList[i],this.mCodiList[i],this.mSlotAlphaInit[i]??1);
	}

	Push(_mat : CMat,_codi : CVec4=null,_alpha=1) : number
	{
		if(this.mSlotReady==false)
		{
			this.mMatList.push(_mat);
			this.mCodiList[this.mMatList.length-1]=_codi;
			this.mSlotAlphaInit[this.mMatList.length-1]=_alpha;
			return this.mMatList.length-1;
		}
		return this.PushSlot(_mat,_codi,_alpha);
	}
	//시작 전에는 Push가 돌려준 번호가 목록 번호라서 그 자리의 초기 알파를 바꾼다
	ModifyAlpha(_slot : number,_alpha : number)
	{
		if(this.mSlotReady==false)
		{
			if(_slot>=0 && _slot<this.mMatList.length)	this.mSlotAlphaInit[_slot]=_alpha;
			return;
		}
		if(this.IsUse(_slot)==false || this.mSlotAlpha[_slot]==_alpha)	return;
		this.mSlotAlpha[_slot]=_alpha;
		const s=this.F32(CVertexFormat.eIdentifier.Position,1);
		const vs=this.mSlotVS[_slot];
		for(let k=0;k<4;++k)
			s[(vs+k)*3+2]=_alpha;
		this.Dirty(_slot);
	}
	override Modify(_slot : number,_mat : CMat,_codi : CVec4=undefined)
	{
		if(_codi===undefined)
		{
			super.Modify(_slot,_mat);
			return;
		}
		if(this.IsUse(_slot)==false)	return;
		this.SetSlotMat(_slot,_mat);
		this.SetSlotCodi(_slot,_codi);
		this.WriteSlot(_slot,true);
		this.Dirty(_slot);
	}
	//YSort z는 슬롯을 쓸 때 CPaint2D.YSortRange 기준으로 구워진다. 범위를 옮겼으면 이걸로 다시 굽는다
	RebuildYSort()
	{
		if(this.mYSort==false)	return;
		for(let i=0;i<this.mSlotSize;++i)
		{
			if(this.mSlotUse[i]==0)	continue;
			this.WriteSlot(i,false);
			this.DirtyPos(i);
		}
	}

	protected override RenderAttr(_vf: CShader): void {
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
	}

	Wind(_influence: number)
	{
		this.PushTag("wind");
		this.mWindInfluence.x = _influence;
	}

	SetYSort(_enable : boolean) {
		this.mYSort = _enable;
	}

	private PushSlot(_mat : CMat,_codi : CVec4,_alpha=1) : number
	{
		const slot=this.NewSlot("");
		this.SetSlotMat(slot,_mat);
		this.SetSlotCodi(slot,_codi);
		this.mSlotAlpha[slot]=_alpha;
		this.WriteSlot(slot,true);
		this.Dirty(slot);
		return slot;
	}
	private SetSlotCodi(_slot : number,_codi : CVec4)
	{
		if(_codi==null)
		{
			this.mSlotCodiUse[_slot]=0;
			return;
		}
		this.mSlotCodiUse[_slot]=1;
		this.mSlotCodi.set(_codi.mF32A,_slot*4);
	}
	protected override GrowSlotData(_cap: number): void {
		const codi=new Float32Array(_cap*4);	codi.set(this.mSlotCodi);	this.mSlotCodi=codi;
		const use=new Uint8Array(_cap);	use.set(this.mSlotCodiUse);	this.mSlotCodiUse=use;
		const alpha=new Float32Array(_cap).fill(1);	alpha.set(this.mSlotAlpha);	this.mSlotAlpha=alpha;
	}
	protected override CreateChannel(): void {
		const ci=this.mMeshDataNode.ci;
		ci.Create(CVertexFormat.eIdentifier.Position);   // pos
		ci.Create(CVertexFormat.eIdentifier.Position);   // sca
		ci.Create(CVertexFormat.eIdentifier.UV);
		ci.Create(CVertexFormat.eIdentifier.Normal);
	}
	protected override SlotVertex(_key: string): number	{	return 4;	}
	protected override SlotIndex(_key: string): number	{	return 6;	}
	protected override WriteIndex(_key: string, _iStart: number, _vStart: number): void {
		const ib=this.Buf(CVertexFormat.eIdentifier.Index).bufI;
		ib[_iStart+0]=_vStart+0;
		ib[_iStart+1]=_vStart+1;
		ib[_iStart+2]=_vStart+2;
		ib[_iStart+3]=_vStart+2;
		ib[_iStart+4]=_vStart+3;
		ib[_iStart+5]=_vStart+0;
	}
	//YSort z 보정은 y에 비례하므로 y 이동량만큼 z도 같이 옮긴다(WriteSlot의 dz와 같은 식)
	protected override TranslateSlot(_slot: number, _dx: number, _dy: number, _dz: number): void {
		let dz=_dz;
		if(this.mYSort)
			dz-=_dy/(CPaint2D.YSortRange.y-CPaint2D.YSortRange.x)*CPaint2D.YSortZShift;
		const p=this.F32(CVertexFormat.eIdentifier.Position);
		const vs=this.mSlotVS[_slot];
		for(let i=vs*3,e=(vs+4)*3;i<e;i+=3)
		{
			p[i]+=_dx;	p[i+1]+=_dy;	p[i+2]+=dz;
			this.BoundPush(p[i],p[i+1],p[i+2]-0.5);
			this.BoundPush(p[i],p[i+1],p[i+2]+0.5);
		}
	}
	protected override WriteSlot(_slot: number,_static: boolean): void {
		const I=CVertexFormat.eIdentifier;
		const p=this.F32(I.Position), s=this.F32(I.Position,1);
		const uv=this.F32(I.UV);
		const nor=this.F32(I.Normal);
		const m=this.mSlotMat, o=_slot*16;
		const vs=this.mSlotVS[_slot];

		const sx=Math.sqrt(m[o]*m[o]+m[o+1]*m[o+1]+m[o+2]*m[o+2]);
		const sy=Math.sqrt(m[o+4]*m[o+4]+m[o+5]*m[o+5]+m[o+6]*m[o+6]);

		let dz=0;
		if(this.mYSort)
		{
			const ySortOrigin = -0.5 * sy + 1;
			const yVal = m[o+13] + ySortOrigin;
			const yRatio = (CPaint2D.YSortRange.y - yVal) / (CPaint2D.YSortRange.y - CPaint2D.YSortRange.x);
			dz = yRatio * CPaint2D.YSortZShift;
		}

		let cx=1, cy=1, cz=0, cw=0;
		if(this.mSlotCodiUse[_slot]==1)
		{
			const c=this.mSlotCodi, co=_slot*4;
			if(c[co] <= 1 && c[co+1] <= 1 && c[co+2] <= 1 && c[co+3] <= 1)
			{
				// mTexCodi UV 포맷: (scaleX, scaleY, offsetX, offsetY)
				cx=c[co]; cy=c[co+1]; cz=c[co+2]; cw=c[co+3];
			}
			else if(this.mTexSize!=null)
			{
				// 픽셀 좌표 포맷: (x1, y1, x2, y2)
				cx = (c[co+2] - c[co]) / this.mTexSize.x;
				cy = (c[co+3] - c[co+1]) / this.mTexSize.y;
				cz = c[co] / this.mTexSize.x;
				cw = 1-(c[co+1] / this.mTexSize.x)-cy;
			}
		}
		const u0=Math.abs(cz), u1=Math.abs(cx+cz);
		const v0=Math.abs(cw), v1=Math.abs(cy+cw);

		// lb, rb, rt, lt 순서. UV는 L과 B만 음수로 넣는다
		const dirX=CPaint2DMerge.sDirX, dirY=CPaint2DMerge.sDirY;
		for(let k=0;k<4;++k)
		{
			const x=dirX[k], y=dirY[k];
			const w=m[o+3]*x+m[o+7]*y+m[o+15];
			const px=(m[o]*x+m[o+4]*y+m[o+12])/w;
			const py=(m[o+1]*x+m[o+5]*y+m[o+13])/w;
			const pz=(m[o+2]*x+m[o+6]*y+m[o+14]+dz)/w;
			const v3=(vs+k)*3, v2=(vs+k)*2;
			p[v3]=px; p[v3+1]=py; p[v3+2]=pz;
			s[v3]=x<0?-sx:sx; s[v3+1]=y<0?-sy:sy; s[v3+2]=this.mSlotAlpha[_slot];
			if(_static)	{	uv[v2]=x<0?-u0:u1; uv[v2+1]=y<0?-v0:v1;	}
			nor[v3]=m[o+8]; nor[v3+1]=m[o+9]; nor[v3+2]=m[o+10];
			this.BoundPush(px,py,pz-0.5);
			this.BoundPush(px,py,pz+0.5);
		}

		const t=this.F32(I.Tangent);
		if(t!=null)
		{
			let tx=m[o], ty=m[o+1], tz=m[o+2];
			const len=Math.sqrt(tx*tx+ty*ty+tz*tz);
			if(len>0)	{	tx/=len; ty/=len; tz/=len;	}
			for(let k=0;k<4;++k)
			{
				const v4=(vs+k)*4;
				t[v4]=tx; t[v4+1]=ty; t[v4+2]=tz; t[v4+3]=1;
			}
			this.WriteBinormal(vs,4);
		}
	}
	private static sDirX=[-0.5, 0.5, 0.5, -0.5];
	private static sDirY=[-0.5, -0.5, 0.5, 0.5];
}

import CPaint2D_imple from "../../../app_imple/component/paint/CPaint2D.js";
CPaint2D_imple();
