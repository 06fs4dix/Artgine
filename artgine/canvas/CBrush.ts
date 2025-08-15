
import {CJSON} from "../basic/CJSON.js";
import {CVec3} from "../geometry/CVec3.js";
import {CVec4} from "../geometry/CVec4.js";
import {CCamera} from "../render/CCamera.js";
import {CDevice} from "../render/CDevice.js";
import { CCamCon, CCamCon2DFollow, CCamCon2DFreeMove, CCamCon3DFirstPerson, CCamCon3DThirdPerson } from "../util/CCamCon.js";
import { CObject } from "../basic/CObject.js";
import { CClass } from "../basic/CClass.js";
import { CUpdate, IAutoUpdate } from "../basic/Basic.js";
import { CFrame } from "../util/CFrame.js";
import { CRenderPass } from "../render/CRenderPass.js";
import { CTimer } from "../system/CTimer.js";
import { CArray } from "../basic/CArray.js";
import { CRenPaint } from "./component/paint/CPaint.js";
import { IFile } from "../system/System.js";
import { CFile } from "../system/CFile.js";
import { CRPAuto } from "./CRPMgr.js";

export class CRenInfo
{
    public mRP : CRenderPass = null;
    public mCam : CCamera=null;
    public mCycle : CTimer=null;
    public mTag =new Set<string>();
    //public m_performance=0;
    public mShow=true;
    public mShader=null;
}
export class CRenPriority
{
    mAlphaList=new CArray<CRenPaint>();
    mDistanceList=new CArray<CRenPaint>();
    mPriority : number=0;
    static CompareDistance(a : CRenPaint,b : CRenPaint)
    {
        return (b.mDistance+b.mTexHash)-(a.mDistance+a.mTexHash);
    }

    static CompareAlpha(a : CRenPaint,b : CRenPaint)
    {
        return (b.mAlpha+b.mDistance)-(a.mAlpha+a.mDistance);
    }
}


export class CBrush extends CObject implements IAutoUpdate,IFile
{
	constructor(_frame : CFrame)
	{
		super();
		this.SetKey("Brush");
		this.mFrame=_frame;
		var size=CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX);
		this.mLightDir = new Float32Array(4*size);
		this.mLightColor = new Float32Array(4*size);
		this.mLightCount=0;
		for(var i=0;i<8;++i)
			this.mShadowView.push(new Float32Array(4*size));
		this.mWindDir = new Float32Array(4*size);
		this.mWindPos = new Float32Array(4*size);
		this.mWindInfo = new Float32Array(4*size);
		this.mWindCount = 0;
		if(_frame.PF().mIAuto)	_frame.PushIAuto(this);
	}
	async SaveJSON(_file: string=null) 
	{
		CFile.Save(this.ToStr(),_file);
	}
	async LoadJSON(_file: string=null) 
	{
		let buf=await CFile.Load(_file);
		if(buf==null)
			return true;
		this.mCameraMap.clear();
		this.ImportCJSON(new CJSON(buf));
		for(let cam of this.mCameraMap.values())
		{
			cam.mPF=this.mFrame.PF();
			if(cam.mCamCon!=null)
				cam.mCamCon.SetInput(this.mFrame.Input());
		}

		this.mCam3d=this.GetCamera("3D");
		this.mCam2d=this.GetCamera("2D");
		this.mCamDev=this.GetCamera("Dev");
		return false;
	}
	
	IsPause(): boolean {
		return this.mPause;
	}
	SetPause(_pause : boolean)
	{
		this.mPause=_pause;
	}
	public mFrame : CFrame=null;
	protected mCam2d : CCamera=null;
	protected mCam3d : CCamera=null;
	protected mCamDev : CCamera=null;
	mDoubleChk=new Set<any>();
	public mLightDir : Float32Array=null;
	public mLightColor : Float32Array=null;
	public mLightCount : number;
	public mShadowView=new Array<Float32Array>();
	//public m_shadowCamera=new Map<string,CCamera>();
	public mShadowCount=0;

	//mWindChk=new Set<any>();
	public mWindDir : Float32Array=null;
	public mWindPos : Float32Array=null;
	public mWindInfo : Float32Array=null;
	public mWindCount=0;

	//autoRP는 삭제하면 에러난다. 맵이 늘어나는 체크만 하지 줄어들거나 변경은 인식 못하게 만듬
	private mAutoRPMap=new Map<string,CRPAuto>();
	public mAutoRPUpdate=CUpdate.eType.Not;
	public mShadowRead=new Map<number,CVec4>();

	public mCameraMap=new Map<string,CCamera>();
	public mPause=false;
	public mRenPriMap=new Map<number,CRenPriority>();
	public mRenInfoMap=new Map<string,CRenInfo>();

	
	override IsShould(_member: string, _type: CObject.eShould): boolean 
	{
		if(_member=="mCameraMap")
			return true;
		else
			return false;
		return super.IsShould(_member,_type);
	}
	ClearRen()
	{
		

		for(let value of this.mRenPriMap.values())
		{
			for(let i=0;i<value.mAlphaList.Size();++i)
			{
				value.mAlphaList.Find(i).mPaint.BatchClear();
			}
			for(let i=0;i<value.mDistanceList.Size();++i)
			{
				value.mDistanceList.Find(i).mPaint.BatchClear();
			}
		
		}
		
		this.mRenInfoMap.clear();
		this.mRenPriMap.clear();
	}
	//protected m_camShadow : CCamera=null;
	RemoveAutoRP(_key : string)
	{
		//this.m_autoRPMap.clear();
		this.mAutoRPMap.delete(_key);
		this.mAutoRPUpdate=CUpdate.eType.Updated;
	}
	SetAutoRP(_key : string,_val : CRPAuto)
	{
		this.mAutoRPMap.set(_key,_val);
		this.mAutoRPUpdate=CUpdate.eType.Updated;
	}
	GetAutoRP(_key : string)
	{
		return this.mAutoRPMap.get(_key);
	}
	AutoRP()	{	return this.mAutoRPMap;	}
	
	GetCamera(_key)
	{
		//this.m_shadowRP.
		let cam=this.mCameraMap.get(_key);
		if(cam==null)
		{
			cam=new CCamera(this.mFrame.PF());
			this.mCameraMap.set(_key,cam);
			cam.SetKey(_key);
		}
		
		return cam;
	}
	public m_2DCamDisplayReset=false;

	GetCam3D(){	return this.mCam3d;	}
	GetCam2D(){	return this.mCam2d;	}
	GetCamDev(){	return this.mCamDev;	}
	InitCamera(_displayReset=false)
	{
		if(this.mCam3d==null)
		{
			this.mCam3d=this.GetCamera("3D");
			this.mCam3d.SetKey("3D");
			//this.m_cam3d.m_updateSize=true;
			//this.m_cam3d.m_updateViewPort=true;
		}
			
		if(this.mCam2d==null)
		{
			this.mCam2d=this.GetCamera("2D");
			this.mCam2d.SetKey("2D");
			//this.m_cam2d.m_updateSize=true;
			//this.m_cam2d.m_updateViewPort=true;
		}
		if(this.mCamDev==null)
		{
			this.mCamDev=this.GetCamera("Dev");
			this.mCamDev.SetKey("Dev");
			//this.m_cam2d.m_updateSize=true;
			//this.m_cam2d.m_updateViewPort=true;
		}
		
		this.m_2DCamDisplayReset=_displayReset;
		if(this.mCam3d!=null)
		{
			this.mCam3d.Init(new CVec3(0, 1000, 1),new CVec3(0, 0, 0));
			this.mCam3d.ResetPerspective();
		}
		if(this.mCam2d!=null)
		{
			if(this.m_2DCamDisplayReset)
			{
				var stx = this.mCam2d.mWidth*0.5;
				var sty = this.mCam2d.mHeight*0.5;
				this.mCam2d.Init(new CVec3(stx, sty, 100),new CVec3(stx, sty, 0));
			}
			else
			{
				this.mCam2d.Init(new CVec3(0, 0.1, 100),new CVec3(0, 0.1, 0));
			}
			
			this.mCam2d.ResetOrthographic();
		}
	}
	Update(_delay)
	{
		if(this.mPause!=true) {
			if(this.mAutoRPUpdate==CUpdate.eType.Updated)
				this.mAutoRPUpdate=CUpdate.eType.Already;
			else if(this.mAutoRPUpdate==CUpdate.eType.Already)
				this.mAutoRPUpdate=CUpdate.eType.Not;

			this.mLightCount=0;
			this.mShadowCount=0;
			this.mShadowRead.clear();

			this.mWindCount=0;
			this.mDoubleChk.clear();
		}

		for(var cam of this.mCameraMap.values())
		{
			if(this.mFrame.Win().IsResize())
			{
				cam.mReset=true;
			}
			cam.Update(_delay);
		}

		if(this.mCam2d!=null)
		{
			if(this.mFrame.Win().IsResize())
			{				
				if(this.m_2DCamDisplayReset)
				{
					var stx = this.mCam2d.mWidth*0.5;
					var sty = this.mCam2d.mHeight*0.5;
					this.mCam2d.Init(new CVec3(stx, sty, 100),new CVec3(stx, sty, 0));
					this.mCam2d.ResetOrthographic();
				}	
				
				
			}		
		}

	}
	Icon(): string {
		return "bi-brush";
	}
}