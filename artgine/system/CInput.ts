import {CMouse} from "../system/CMouse.js"
import {CRay} from "../geometry/CRay.js";
import {CVec3} from "../geometry/CVec3.js";
import {CPreferences} from "../basic/CPreferences.js";
import {CBound} from "../geometry/CBound.js";

export class CInput
{
	static eKey={
		Num0 : 0x30,
		Num1 : 0x31,
		Num2 : 0x32,
		Num3 : 0x33,
		Num4 : 0x34,
		Num5 : 0x35,
		Num6 : 0x36,
		Num7 : 0x37,
		Num8 : 0x38,
		Num9 : 0x39,
		A : 0x41,
		B : 0x42,
		C : 0x43,
		D : 0x44,
		E : 0x45,
		F : 0x46,
		G : 0x47,
		H : 0x48,
		I : 0x49,
		J : 0x4A,
		K : 0x4B,
		L : 0x4C,
		M : 0x4D,
		N : 0x4E,
		O : 0x4F,
		P : 0x50,
		Q : 0x51,
		R : 0x52,
		S : 0x53,
		T : 0x54,
		U : 0x55,
		V : 0x56,
		W : 0x57,
		X : 0x58,
		Y : 0x59,
		Z : 0x5A,
		Semicolon:186,
		F1 : 112,
		F2 : 113,
		F3 : 114,
		F4 : 115,
		F5 : 116,
		F6 : 117,
		F7 : 118,
		F8 : 119,
		F9 : 120,
		F10 : 121,
		Left : 0x25,
		Right : 0x27,
		Up : 0x26,
		Down : 0x28,
		LButton : 0x01,
		RButton : 0x02,
		MiddleButton : 0x03,
		Esc : 0x1B,
		Space : 0x20,
		PgUp : 0x21,
		PgDown : 0x22,
		End : 0x23,
		Home : 0x24,
		Shift : 16,
		LControl : 17,
		RControl : 25,
		LAlt : 18,
		RAlt : 21,
		BackSpace : 0x08,
		Tap : 0x09,
		Enter : 0x0D,
		Insert : 0x2D,
		Delete : 0x2E,
		Wheel: 0x2F,
		Tilde: 0xC0,
		PadRight0 : 0xC8,
		PadRight1 : 0xC9,
		PadRight2 : 0xCA,
		PadRight3 : 0xCB,
		PadFront0 : 0xCC,
		PadFront1 : 0xCD,
		PadFront2 : 0xCE,
		PadFront3 : 0xCF,
		PadCenter0 : 0xD0,
		PadCenter1 : 0xD1,
		PadCenter2 : 0xD2,
		PadLeft0 : 0xD3,
		PadLeft1 : 0xD4,
		PadLeft2 : 0xD5,
		PadLeft3 : 0xD6,
		PadLeftAxes : 0xD7,
		PadRightAxes : 0xD8,
		
		

		Null : 0x00,

		
	};
	static eDragState={
		None:-1,
		Move:0,
		Stop:1,
	};
	static sKeyPress=new Array(256);
	public mPF : CPreferences;
	public mKeyPress=new Array(256);
	public mKey=new Array(256);
	public mUpkey=new Array(256);
	public mFirstKey=new Array(256);

	public mWheel=0;
	// public mTouchPosX=[0,0,0,0,0,0,0,0,0,0];
	// public mTouchPosY=[0,0,0,0,0,0,0,0,0,0];
	// public mTouchCount=0;
	public mMouseArr : Array<CMouse>=new Array();
	public mMouseOff=2;
	public mMouseRemove=new Array();
	//static g_mouseLast=-1;
	public mTouchLbtn=0;
	public mDragMouse =new  CMouse();
	public mDragState=CInput.eDragState.None;
	public mRay : Array<CRay>=new Array();
	public mFocus=true;
	public mPadAxes = [new CVec3(), new CVec3()];
	public mDragBox : HTMLDivElement=null;
	public mHandle : HTMLElement=null;

	constructor(_pf : CPreferences,_handle : HTMLElement)
	{
		this.mPF=_pf;
		this.mHandle=_handle;
		
		for (var i = 0; i < 256; ++i)
		{
			this.mKeyPress[i]=false;
			this.mKey[i]=false;
			this.mUpkey[i]=false;
			this.mFirstKey[i]=false;
		}
		
	}
	SetDragBox(_enable : boolean) : void
	{
		if(!_enable) {
			if(this.mDragBox) {
				this.mDragBox.remove();
				this.mDragBox = null;
			}
			return;
		}
		if(this.mDragBox!=null)
			return;

		let div=document.createElement("div");
		div.style.pointerEvents="none";
		this.mDragBox=div;
		div.className="border border-dark bg-light";
		div.style.position="absolute";
		div.style.opacity="30%";
		div.style.zIndex="30000";
		document.body.append(div);
	}
	GetDragBox()
	{
		return this.mDragBox;
	}
	GetDragBound()
	{
		let bound=new CBound();
		bound.InitBound(new CVec3(this.mDragMouse.x,this.mDragMouse.y));
		bound.InitBound(new CVec3(this.Mouse().x,this.Mouse().y));
		return bound;
	}
	SetFocus(_focus : boolean){	
		if(this.mFocus!=_focus)
			this.mFocus=_focus;	
	}
	SetRay(_rayArray : Array<CRay>)	{	this.mRay=_rayArray;}
	Ray()	{	return this.mRay;	}
	TouchRefrash(_posX,_posY,_inOut)
	{

	}
	TouchClear(){}

	Update(_delay)
	{
		
	}
	GetAxes(_offset = 0) : CVec3
	{
		return this.mPadAxes[_offset];
	}
	
	DragState()
	{
		return this.mDragState;
	}
	static Key(_key)
	{
		return CInput.sKeyPress[_key];
	}
	KeyDown(_key,_first=false)
	{
		if(this.mFocus==false)
			return false;
		if (_first)
		{
			if (this.mKey[_key] && this.mFirstKey[_key] == true)
			{
				return true;
			}
			else
				return false;
			
		}
		return this.mKey[_key];
	}
	KeyUp(_key)
	{
		if(this.mFocus==false)
			return false;
		return this.mUpkey[_key];
	}
	GetMouseKey(_key)
	{
		for(let i=0;i<this.mMouseArr.length;++i)
		{
			if(this.mMouseArr[i].key==_key)
			{
				return this.mMouseArr[i];
			}
		}
		return null;
	}
	MouseVec()
	{
		return this.mMouseArr;
	}
	Mouse()
	{
		if(this.mMouseArr.length==0)
		{
			var mo=new CMouse();
			// mo.x=this.mTouchPosX[0];
			// mo.y=this.mTouchPosY[0];
			mo.press=false;
			return mo;
		}
		return this.mMouseArr[0];
	}
	
	
	Wheel()
	{
		return this.mWheel;
	}
	SetWheel(_val)
	{
		this.mKey[CInput.eKey.Wheel] = true;
		this.mWheel = _val;
	}
	GetGyro()
	{
		if(g_gyChk==false && window.DeviceOrientationEvent)
		{
			//alert("GetGyro");
			window.addEventListener('deviceorientation',GyroEvent);
			document.onclick=GyroChk;
			g_gyChk=true;
		}
		
		
		return { 
			alpha:g_gyAlpha,	beta:g_gyBeta,	gamma:g_gyGamma
		};
	}
}


import CInput_imple from "../system_imple/CInput.js";

CInput_imple();

var g_gyChk=false;
var g_gyAlpha=0;
var g_gyBeta=0;
var g_gyGamma=0;


function GyroEvent(_event: DeviceOrientationEvent) {
	const absolute = _event.absolute;
	g_gyAlpha = _event.alpha;
	g_gyBeta = _event.beta;
	g_gyGamma = _event.gamma;
}
//https에서만 작동된다!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
function GyroChk()
{
	//alert("GyroChk0");
	if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') 
	{
		//alert("GyroChk1");
		(DeviceOrientationEvent as any).requestPermission().then(permissionState=>
		{
			//alert("GyroChk2");
			//alert(permissionState);
			if (permissionState === 'granted') 
			{
				//alert("GyroChk3");
				window.addEventListener('deviceorientation',GyroEvent);
			}
			else
				alert("ios https!"+permissionState);
		});
	}
	
	document.onclick=null;
	
}




