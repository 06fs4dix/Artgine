import {CVec3} from "../geometry/CVec3.js"
import {CMat} from "../geometry/CMat.js"
import {CMath} from "../geometry/CMath.js"
import {CRay} from "../geometry/CRay.js"
import {CPlane} from "../geometry/CPlane.js"
import {CPreferences} from "../basic/CPreferences.js"
import {CVec4} from "../geometry/CVec4.js"
import {CBound} from "../geometry/CBound.js"

import {CConsol} from "../basic/CConsol.js"
import {CVec2} from "../geometry/CVec2.js"
import {CObject, CPointer} from "../basic/CObject.js"
import { CUpdate } from "../basic/Basic.js"
import {CUtilMath} from "../geometry/CUtilMath.js"
import {CPoolGeo} from "../geometry/CPoolGeo.js"

var g_offset=1024;
export interface ICamCon
{
	InitCamera(_cam);
	Update(_delay);
	SetRotKey(_key);
	SetPosKey(_key);
	SetRotXLock(_enable);
	SetRotYLock(_enable);
	SetKeyboard(_enable);
	SetPosSensitivity(_sensitivity);
	SetRotSensitivity(_sensitivity);
	SetZoomSensitivity(_sensitivity);
	SetInput(_input);
}
export interface ICamShake
{
	InitCamera(_cam : CCamera);
	Update(_delay : number);
	GetEye();
	GetLook();
	Shake(_duration : number);
	SetKey(_key);
	Set2D(_magnitude : number);
	Set3D(_magnitude : number, _rot : number);
}
export class CCamera extends CObject
{
	//public m_offset : number;
	public mEye : CVec3;
	public mLook : CVec3;
	public mUp : CVec3;
	public mView : CVec3;
	public mCross : CVec3;
	public mViewMat : CMat;
	public mProjMat : CMat;
	//public m_VPMat : CMat;
	public mProjFar : number;
	public mProjNear : number;
	public mOrthographic : boolean;
	
	public mPF : CPreferences;
	public mBillboardMat : CMat;
	public mScreenWidthBase : boolean;//width기준으로 할건지 묻는거 w기반이면 화면 width 축소시 그대로 유지
	public mFov : number;
	public mPlane : CPlane;

	public mViewPort : CVec4=null;
	public mUpdateMat : number=CUpdate.eType.Updated;
	public mViewMatComp : CMat=null;
	public mReset : boolean=false;
	public mWidth : number=0;
	public mHeight : number=0;
	public mZoom : number=1;
	//파싱문제로 주석
	public mRCS : boolean=true;

	//shake Camera
	public mCamShake : ICamShake = null;



	//이제 이건 
	//뷰포트를 변경된 화면 사이즈에 맞춘다. 끄면 최초 설정된 사이즈로 고정됌.뷰포트는 실제 렌더링될 사각 사이즈
	//public m_updateViewPort=false;
	//카메라 화각을 사이즈에 맞게 조정. 끄면 화면비가 안맞는다. 
	//public m_updateSize=false;
	public mCamCon : ICamCon = null;
	constructor(_pf : CPreferences)
	{
		super();
		this.mPF=_pf;
		if(this.mPF==null)
			this.mPF=new CPreferences();
		

		this.mEye=new CVec3(0,0,0);
		this.mEye.NewWASM();
		this.mLook=new CVec3();
		this.mUp=new CVec3(0,1,0);
		this.mView=new CVec3();
		this.mCross=new CVec3();
		this.mViewMat=new CMat();
		this.mProjMat=new CMat();
		
		this.mProjFar=0;
		this.mProjNear=0;
		this.mOrthographic=false;

		this.mBillboardMat=new CMat();
		this.mFov=3.14/4;
		this.mScreenWidthBase=false;
		
		this.mPlane=new CPlane();
		this.mPlane.NewWASM();
	
	}
	IsShould(_member: string, _type: CObject.eShould): boolean 
	{
		let should = [
			"mView", "mCross",
			"mViewMat", "mProjMat", "mPF", "mBillboad", 
			"mPlane", "mUpdateMat", "mViewMatComp", "mReset",
			"mShakeMagnitude", "mShakeDuration", "mShakeDamping", "mShakeDistance",
			"mRCS"
		];
		if(should.indexOf(_member) != -1) 
			return false;

		return super.IsShould(_member,_type);
	}
	
	
	GetOrthographic()	{	return this.mOrthographic;	}
	GetZoom()	{	return this.mZoom;	}
	SetViewPort(_v : CVec4)
	{
		this.mViewPort=_v.Export();
	}
	SetSize(_width,_height)
	{
		this.mWidth=_width;
		this.mHeight=_height;
	}
	SetCamCon(_camCon : ICamCon)	
	{
		this.mCamCon=_camCon;
		if(this.mCamCon!=null)
			this.mCamCon.InitCamera(this);
		return this.mCamCon;
	}
	SetCamShake(_camShake : ICamShake)
	{
		this.mCamShake=_camShake;
		if(this.mCamShake!=null)
			this.mCamShake.InitCamera(this);
	}
	GetCamCon()	{	return this.mCamCon;	}
	GetCamShake() { return this.mCamShake;}
	Set2DZoom(_val)	{	
		this.mZoom=_val;	
		this.mReset=true;
		this.mUpdateMat=CUpdate.eType.Updated;
	}
	
	GetViewPort()
	{	
		return this.mViewPort;	
	}
	GetEye()	{	return this.mEye;	}
	GetLook()	{	return this.mLook;	}
	GetUp()	{	return this.mUp;	}
	GetView()	: CVec3 {	return this.mView;	}
	GetCross()	{	return this.mCross;	}
	GetFront()	{	return CMath.V3Cross(this.mCross,this.mUp);	}
	GetBillBoardMat()	{	return this.mBillboardMat;	}
	
	SetFov(_val : number)	{	this.mFov=_val;	}
	SetFar(_val) { this.mProjFar = _val; }
	SetNear(_val) { this.mProjNear = _val; }
	SetScreenWidthBase(_val) { this.mScreenWidthBase = _val; }
	SetEye(pa_vec)	{	this.mEye.Import(pa_vec);	}
	SetLook(pa_vec)	{	this.mLook=pa_vec;	}
	SetUp(pa_vec)	{	this.mUp=pa_vec;	}

	GetFar() { return this.mProjFar;	 }
	GetViewMat()	{	return this.mViewMat;	}
	GetProjMat()	{	return this.mProjMat;	}
	//GetVPMat()	{	return this.m_VPMat;	}
	
	SetProjMat(_mat : any)
	{
		this.mProjMat.Import(_mat);
	}
	SetViewMat(_mat : any)
	{
		this.mViewMat.Import(_mat);
	}
	Init(pa_eye : CVec3,pa_look : CVec3,_up=new CVec3(0,1,0)) : boolean
	{
		if(pa_eye.Equals(this.mEye) && pa_look.Equals(this.mLook) && _up.Equals(this.mUp))
			return false;
		this.mEye.Import(pa_eye);
		this.mLook.Import(pa_look);
		this.mUp=_up;
		this.ViewAndCrossVector3Set();
		//this.mUpdateMat=CState.eUpdate.Not;
		this.mReset=true;
		return true;
	}
	BillboardSet()
	{
		if(this.GetView().y>0.99 || this.GetView().y<-0.99)
		{
			this.mBillboardMat=new CMat();
			this.mBillboardMat.SetUnit(false);
			this.mBillboardMat.mF32A[0]=0;
			this.mBillboardMat.mF32A[5]=0;
			this.mBillboardMat.mF32A[10]=0;
			
		}
		var inMat = CMath.MatInvert(this.GetViewMat());
		var rote = CMath.MatRotExport(inMat, true, true, true);
	
		var rot = CMath.MatRotation(new CVec3(0, 0, 0));
		CMath.MatMul(rot, rote,this.mBillboardMat);
	}
	ResetPerspective() : void
	{
		if(this.mProjNear==0)	this.mProjNear=1;
		if(this.mProjFar==0)	this.mProjFar=100000;

		var width=this.mWidth;
		var height=this.mHeight;
		if(width==0)
		{
			width=this.mPF.mWidth;
		}
		if(height==0)
		{
			height=this.mPF.mHeight;
		}

		var eye = this.GetEye();
		var look = this.GetLook();
		if(this.mCamShake != null) {
			this.mCamShake.InitCamera(this);
			eye = this.mCamShake.GetEye();
			look = this.mCamShake.GetLook();
		}
		
		//this.m_screenWidthBase=true;
		if(this.mRCS)
		{
			this.mViewMat=CUtilMath.CameraLookAtRH(eye,look,this.mUp);
			if(this.mScreenWidthBase)
				this.mProjMat=CUtilMath.CameraPerspectiveFovRH(this.mFov, width / height,this.mProjNear,this.mProjFar,true);
			else
				this.mProjMat=CUtilMath.CameraPerspectiveFovRH(this.mFov, height/width,this.mProjNear,this.mProjFar,false);
				//this.m_projMat=CMath.CameraPerspectiveRH(1,height/ width,this.m_projectNear,this.m_projectFar);
		}
		else
		{
			this.mViewMat=CUtilMath.CameraLookAtLH(eye,look,this.mUp);
			if(this.mScreenWidthBase)
				this.mProjMat=CUtilMath.CameraPerspectiveFovLH(this.mFov, width / height,this.mProjNear,this.mProjFar,true);
			else
				this.mProjMat=CUtilMath.CameraPerspectiveFovLH(this.mFov, height / width,this.mProjNear,this.mProjFar,false);
		}
		
		this.mOrthographic=false;
		this.ViewAndCrossVector3Set();
		this.BillboardSet();
		this.PlaneSet();
		this.mReset=false;
		
	}
	Update(_delay)
	{
		if(this.mReset)
		{
			if(this.mOrthographic)	this.ResetOrthographic(); else this.ResetPerspective();
		}
			
		if(this.mViewMatComp==null)
			this.mViewMatComp=this.mViewMat.Export();
		var len=0;
		for(var i=0;i<16;++i)
		{
			len+=Math.abs(this.mViewMat.mF32A[i]-this.mViewMatComp.mF32A[i]);
		}

		if(len>0.001)
			this.mUpdateMat=CUpdate.eType.Updated;
		else if(this.mUpdateMat == CUpdate.eType.Already)//0=OFF, 1=ON, 2=ON->OFF
			this.mUpdateMat=CUpdate.eType.Not;
		else if(this.mUpdateMat==CUpdate.eType.Updated)
		{	
			this.mUpdateMat=CUpdate.eType.Already;
		}
		this.mViewMatComp.Import(this.mViewMat);
		if(this.mCamCon!=null)
		{
			this.mCamCon.InitCamera(this);
			this.mCamCon.Update(_delay);
		}
		if(this.mCamShake!=null)
		{
			this.mCamShake.InitCamera(this);
			this.mCamShake.Update(_delay);
		}
	}
	ResetOrthographic() : void
	{
		var width=this.mWidth;
		var height=this.mHeight;

		if(width==0)
		{
			width=this.mPF.mWidth;
		}
		if(height==0)
		{
			height=this.mPF.mHeight;
		}
		width *= this.mZoom;
		height *= this.mZoom;

		var eye = this.GetEye();
		var look = this.GetLook();
		if(this.mCamShake != null) {
			this.mCamShake.InitCamera(this);
			eye = this.mCamShake.GetEye();
			look = this.mCamShake.GetLook();
		}

		if(this.mProjNear==0)	this.mProjNear=0.01;
		if(this.mProjFar==0)	this.mProjFar=100000;

		if(this.mRCS)
		{
			this.mViewMat=CUtilMath.CameraLookAtRH(eye,look,this.mUp);
			this.mProjMat=CUtilMath.CameraOrthoRH(width,height, this.mProjNear, this.mProjFar);
		}
		else
		{
			this.mViewMat=CUtilMath.CameraLookAtLH(eye,look,this.mUp);
			this.mProjMat=CUtilMath.CameraOrthoLH(width,height, this.mProjNear, this.mProjFar);
		}
		//this.m_VPMat=CMath.MatMul(this.m_viewMat,this.m_projMat);
		this.mOrthographic=true;
		this.ViewAndCrossVector3Set();
		this.BillboardSet();
		this.PlaneSet();
		this.mReset=false;
		//this.mUpdateMat=CState.eUpdate.Updated;
	}
	ViewAndCrossVector3Set() : void
	{
		var eye = this.GetEye();
		var look = this.GetLook();
		if(this.mCamShake != null) {
			this.mCamShake.InitCamera(this);
			eye = this.mCamShake.GetEye();
			look = this.mCamShake.GetLook();
		}
		CMath.V3SubV3(look,eye,this.mView);
		CMath.V3Nor(this.mView,this.mView);
		CMath.V3Cross(this.mUp, this.mView,this.mCross);
		if(this.mCross.IsZero())
			this.mCross=new CVec3(1,0,0);
		CMath.V3Nor(this.mCross,this.mCross);
	}
	Pitch(pa_radian : number)
	{
		this.XAxisRotation(pa_radian);
	}
	Yaw(pa_radian : number)
	{
		this.YAxisRotation(pa_radian);
	}
	Roll(pa_radian : number)
	{
		this.ZAxisRotation(pa_radian);
	}
	XAxisRotation(pa_radian : number)
	{
		let rotMat=CPoolGeo.ProductMat();
		CMath.MatAxisToRotation(this.mCross, pa_radian,rotMat);
		var L_look = CMath.V3SubV3(this.mLook, this.mEye);
		L_look = CMath.V3MulMatCoordi(L_look, rotMat);
		CPoolGeo.RecycleMat(rotMat);


		var newCro = CMath.V3Cross(this.mUp, this.mCross);

		var len = CMath.V3Dot(newCro, CMath.V3Nor(L_look));
		if (len>0)
			return;
		this.mLook = CMath.V3AddV3(L_look, this.mEye);
		
		this.ViewAndCrossVector3Set();
		this.mReset=true;
	}
	YAxisRotation(pa_radian : number)
	{
		//var L_temp=new CMat();
		let rotMat=CPoolGeo.ProductMat();
		CMath.MatAxisToRotation(this.mUp, pa_radian,rotMat);
		var L_look=CMath.V3SubV3(this.mLook, this.mEye);
		L_look = CMath.V3MulMatCoordi(L_look, rotMat);
		CPoolGeo.RecycleMat(rotMat);

		CMath.V3AddV3(L_look, this.mEye,this.mLook);
		this.mReset=true;
	}
	ZAxisRotation(pa_radian : number)
	{
		//var L_temp=new CMat();
		let rotMat=CPoolGeo.ProductMat();
		CMath.MatAxisToRotation(this.mView, pa_radian,rotMat);
		var L_look=new CVec3();
		this.mUp = CMath.V3MulMatCoordi(this.mUp, rotMat);
		CPoolGeo.RecycleMat(rotMat);
		this.mReset=true;
	}
	DirToXYRot(pa_eye, pa_look, _x, _y)
	{
		this.Init(pa_eye,pa_look);
		this.YAxisRotation(_y);
	}
	FrontMove(_val)
	{
		var L_move = new CVec3(0, 0, 0);

		var newCro=CMath.V3Cross(this.mUp, this.mCross);
		CMath.V3MulFloat(newCro, _val,L_move);

		CMath.V3AddV3(this.mEye,L_move,this.mEye);
		CMath.V3AddV3(this.mLook, L_move,this.mLook);
		this.mReset=true;
	}
	CrossMove(_val)
	{
		var L_move = CMath.V3MulFloat(this.mCross, _val);

		CMath.V3AddV3(this.mEye, L_move,this.mEye);
		CMath.V3AddV3(this.mLook, L_move,this.mLook);
		this.mReset=true;
	}
	UpMove(_val)
	{
		this.mEye.y+=_val;	
		this.mLook.y+=_val;
	}
	EyeMoveAndViewCac(pa_newEye : CVec3)
	{
		this.mEye.Import(pa_newEye);
		CMath.V3AddV3(this.mEye,this.mView,this.mLook);
		this.mReset=true;
	}
	ZAxisZoom(pa_radian)
	{
		var L_temp = this.mView;
		L_temp=CMath.V3MulFloat(L_temp, pa_radian);

		CMath.V3AddV3(this.mEye, L_temp,this.mEye);
		CMath.V3AddV3(this.mLook, L_temp,this.mLook);
		this.mReset=true;
	}
	GetRay(_x : number,_y : number)
	{
		var width=this.mWidth;
		var height=this.mHeight;
		if(this.mWidth==0)
		{
			width=this.mPF.mWidth;
			height=this.mPF.mHeight;
		}
		width*=this.mZoom;
		height*=this.mZoom;
		
		var ray=new CRay();

		var left=0;
		var top = 0;

		if(this.mViewPort==null)
		{
			_x=_x*(width/this.mPF.mWidth);
			_y=_y*(height/this.mPF.mHeight);
		}
		else
		{
			_x=_x*(width/this.mViewPort.z);
			_y=_y*(height/this.mViewPort.w);
		}
		//윈도우 프로그래밍에서 타이틀바 때문에 이렇게 했는데 나중에 참고해라!
		
		var right = width;
		var bottom = height;

		var L_vec=new CVec3();
		if(this.mRCS)
			L_vec.z = -1.0;
		else
			L_vec.z = 1.0;
				
		if (this.mOrthographic == false)
		{
			L_vec.x = ((((_x - left)* 2.0) / right - 1.0) - this.mProjMat.mF32A[8]) / this.mProjMat.mF32A[0];//클리피과 뷰포트는 안빼버렸음
			L_vec.y = ((((_y - top)* 2.0) / bottom - 1.0) - this.mProjMat.mF32A[9]) / this.mProjMat.mF32A[5];
			

			let L_inView=CMath.MatInvert(this.mViewMat);

			ray.SetDirect(new CVec3(L_vec.x * L_inView.mF32A[0] + L_vec.y * L_inView.mF32A[4] + L_vec.z * L_inView.mF32A[8],
				L_vec.x * L_inView.mF32A[1] + L_vec.y * L_inView.mF32A[5] + L_vec.z * L_inView.mF32A[9],
				L_vec.x * L_inView.mF32A[2] + L_vec.y * L_inView.mF32A[6] + L_vec.z * L_inView.mF32A[10]));
			
			ray.SetDirect(CMath.V3Nor(ray.GetDirect()));

			ray.SetOriginal(new CVec3(L_inView.mF32A[12], L_inView.mF32A[13], L_inView.mF32A[14]));
			
		}
		else
		{
			//직교


			L_vec.x = ((((_x - left)* 2.0) / right - 1.0) - this.mProjMat.mF32A[8]) / this.mProjMat.mF32A[0];//클리피과 뷰포트는 안빼버렸음
			L_vec.y = ((((_y - top)* 2.0) / bottom - 1.0) - this.mProjMat.mF32A[9]) / this.mProjMat.mF32A[5];
			//L_vec.z = -1.0;

			//var L_d = L_vec.toCopy();
			var L_o = L_vec.Export();
			L_o.z = 0;
			
		
			let L_mi=CMath.MatInvert(this.mViewMat);

			ray.SetDirect(CMath.V3MulMatCoordi(L_vec, L_mi));
			ray.SetOriginal(CMath.V3MulMatCoordi(L_o, L_mi));
			ray.SetDirect(CMath.V3SubV3(ray.GetDirect(),ray.GetOriginal()));
		}

		return ray;
	}
	GetDragBoxBound(_bound : CBound)
	{
		let lbRay=this.GetRay(_bound.mMin.x,_bound.mMin.y);
		let rtRay=this.GetRay(_bound.mMax.x,_bound.mMax.y);
		let rbRay=this.GetRay(_bound.mMax.x,_bound.mMin.y);
		let ltRay=this.GetRay(_bound.mMin.x,_bound.mMax.y);
		let bound=new CBound();
		bound.SetType(CBound.eType.Polytope);
		bound.InitBound(CMath.V3AddV3(lbRay.GetOriginal(),CMath.V3MulFloat(lbRay.GetDirect(),this.mProjNear)));
		bound.InitBound(CMath.V3AddV3(lbRay.GetOriginal(),CMath.V3MulFloat(lbRay.GetDirect(),this.mProjFar)));
		bound.InitBound(CMath.V3AddV3(rtRay.GetOriginal(),CMath.V3MulFloat(rtRay.GetDirect(),this.mProjNear)));
		bound.InitBound(CMath.V3AddV3(rtRay.GetOriginal(),CMath.V3MulFloat(rtRay.GetDirect(),this.mProjFar)));
		bound.InitBound(CMath.V3AddV3(rbRay.GetOriginal(),CMath.V3MulFloat(rbRay.GetDirect(),this.mProjNear)));
		bound.InitBound(CMath.V3AddV3(rbRay.GetOriginal(),CMath.V3MulFloat(rbRay.GetDirect(),this.mProjFar)));
		bound.InitBound(CMath.V3AddV3(ltRay.GetOriginal(),CMath.V3MulFloat(ltRay.GetDirect(),this.mProjNear)));
		bound.InitBound(CMath.V3AddV3(ltRay.GetOriginal(),CMath.V3MulFloat(ltRay.GetDirect(),this.mProjFar)));
		
		return bound;
	}
	ScreenToWorld2DPoint(_mouseX,_mouseY)
	{
		let piMat=CMath.MatInvert(this.mProjMat);
		let viMat=CMath.MatInvert(this.mViewMat);

		let mpos=new CVec3(_mouseX,_mouseY);
		mpos.x=mpos.x*2/this.mPF.mWidth-1;
		mpos.y=mpos.y*2/this.mPF.mHeight-1;

		mpos=CMath.V3MulMatCoordi(mpos,piMat);
		mpos=CMath.V3MulMatCoordi(mpos,viMat);
		mpos.z=0;

		return mpos;
	}
	ScreenToWorld3DPoint(_mouseX,_mouseY,_dist)
	{
		let ray=this.GetRay(_mouseX,_mouseY);
		let mpos=ray.GetOriginal();
		CMath.V3AddV3(mpos,CMath.V3MulFloat(ray.GetDirect(),_dist),mpos);
		return mpos;
	}
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);
		if(_child==false)	return;
		if(_pointer.IsRef(this.mEye) || _pointer.IsRef(this.mLook))
		{
			this.mReset=true;
		}


		
	}
	PlaneSet()
	{
		// let start = performance.now();
		// for(let index = 0; index < 10000; index++) {
		let width=this.mWidth;
		let height=this.mHeight;
		if(width==0)	width=this.mPF.mWidth;
		if(height==0)	height=this.mPF.mHeight;
		width*=this.mZoom;
		height*=this.mZoom;
		
		let aspect : number = width / height;
		let halfVSide = 0;
		let halfHSide = 0;
		if(this.mOrthographic) {
			halfVSide = height / 2;
			halfHSide = width / 2;
		}
		else if(this.mScreenWidthBase) {
			halfVSide = this.mProjFar * Math.tan(this.mFov * 0.5);
			halfHSide = halfVSide * aspect;
		}
		else {
			halfHSide = this.mProjFar * Math.tan(this.mFov * 0.5);
			halfVSide = halfHSide / aspect;
		}
		let farMulView = CPoolGeo.ProductV3();
		CMath.V3MulFloat(this.mView, this.mProjFar, farMulView);
		//let plane=CMMgr.CVec4();
		let vertex=CPoolGeo.ProductV3();
		let normal=CPoolGeo.ProductV3();
		let up = CPoolGeo.ProductV3();
		CMath.V3Cross(this.mView, this.mCross, up);

		if(this.mOrthographic) {
			CMath.V3MulFloat(this.mView, this.mProjNear, vertex)
			CMath.V3AddV3(this.mEye, vertex, vertex);
			CMath.NormalAndVertexFromPlane(this.mView, vertex,this.mPlane,CPlane.eDir.Near);

			CMath.V3AddV3(this.mEye, farMulView, vertex);
			CMath.V3MulFloat(this.mView, -1, normal);
			CMath.NormalAndVertexFromPlane(normal, vertex,this.mPlane,CPlane.eDir.Far);

			CMath.V3MulFloat(this.mCross, -1, normal);
			CMath.V3MulFloat(this.mCross, halfHSide, vertex);
			CMath.V3AddV3(this.mEye, vertex, vertex);
			CMath.NormalAndVertexFromPlane(normal, vertex,this.mPlane,CPlane.eDir.Left);

			CMath.V3MulFloat(this.mCross, halfHSide, vertex);
			CMath.V3SubV3(this.mEye, vertex, vertex);
			CMath.NormalAndVertexFromPlane(this.mCross, vertex,this.mPlane,CPlane.eDir.Right);

			CMath.V3MulFloat(up, halfVSide, vertex);
			CMath.V3SubV3(this.mEye, vertex, vertex);
			CMath.NormalAndVertexFromPlane(up, vertex,this.mPlane,CPlane.eDir.Top);

			CMath.V3MulFloat(up, -1, normal);
			CMath.V3MulFloat(up, halfVSide, vertex);
			CMath.V3AddV3(this.mEye, vertex, vertex);
			CMath.NormalAndVertexFromPlane(normal, vertex,this.mPlane,CPlane.eDir.Bottom);
		}
		else {
			CMath.V3MulFloat(this.mView, this.mProjNear, vertex);
			CMath.V3AddV3(this.mEye, vertex, vertex);
			CMath.NormalAndVertexFromPlane(this.mView, vertex,this.mPlane,CPlane.eDir.Near);
			
			CMath.V3AddV3(this.mEye, farMulView, vertex);
			CMath.V3MulFloat(this.mView, -1, normal);
			CMath.NormalAndVertexFromPlane(normal, vertex,this.mPlane,CPlane.eDir.Far);

			CMath.V3MulFloat(this.mCross, halfHSide, vertex);
			CMath.V3SubV3(farMulView, vertex, vertex);
			CMath.V3Cross(up, vertex, normal);
			CMath.V3Nor(normal, normal);
			CMath.NormalAndVertexFromPlane(normal, this.mEye,this.mPlane,CPlane.eDir.Right);

			CMath.V3MulFloat(this.mCross, halfHSide, vertex);
			CMath.V3AddV3(farMulView, vertex, vertex);
			CMath.V3Cross(vertex, up, normal);
			CMath.V3Nor(normal, normal);
			CMath.NormalAndVertexFromPlane(normal, this.mEye,this.mPlane,CPlane.eDir.Left);

			CMath.V3MulFloat(up, halfVSide, vertex);
			CMath.V3AddV3(farMulView, vertex, vertex);
			CMath.V3Cross(this.mCross, vertex, normal);
			CMath.V3Nor(normal, normal);
			CMath.NormalAndVertexFromPlane(normal, this.mEye,this.mPlane,CPlane.eDir.Bottom);

			CMath.V3MulFloat(up, halfVSide, vertex);
			CMath.V3SubV3(farMulView, vertex, vertex);
			CMath.V3Cross(vertex, this.mCross, normal);
			CMath.V3Nor(normal, normal);
			CMath.NormalAndVertexFromPlane(normal, this.mEye,this.mPlane,CPlane.eDir.Top);
		}
		
		CPoolGeo.RecycleV3(farMulView);
		CPoolGeo.RecycleV3(vertex);
		CPoolGeo.RecycleV3(normal);
		CPoolGeo.RecycleV3(up);
	
	}
	GetPlane()
	{
		return this.mPlane;
	}
	CharacterByRotation(pa_chaPos,pa_xAxisRadian,pa_yAxisRadian,pa_zome)
	{
		
		if (pa_xAxisRadian != 0)
		{
			this.XAxisRotation(pa_xAxisRadian);
			this.ViewAndCrossVector3Set();
		}
			
		if (pa_yAxisRadian != 0)
		{
			this.YAxisRotation(pa_yAxisRadian);
			this.ViewAndCrossVector3Set();
		}
			


		this.mEye.Import(pa_chaPos);
		this.mLook = CMath.V3AddV3(this.mEye, this.mView);

		//this.ResetPerspective();
		this.ViewAndCrossVector3Set();

		this.ZAxisZoom(-pa_zome);
	}
}

