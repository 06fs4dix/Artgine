import { CUpdate, IAutoUpdate } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CJSON } from "../../basic/CJSON.js";
import { CObject } from "../../basic/CObject.js";
import { CMat } from "../../geometry/CMat.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CCamera } from "../../render/CCamera.js";
import { CDevice } from "../../render/CDevice.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CFile } from "../../system/CFile.js";
import { CSleep } from "../../util/CSleep.js";
import { CTimer } from "../../system/CTimer.js";
import { IFile } from "../../system/System.js";
import { CFrame } from "../../util/CFrame.js";
import { CRenPaint } from "../component/paint/CPaint.js";
import { CRPAuto } from "./CRPMgr.js";
import { CCondition } from "../../util/CCondition.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { SDF } from "../../z_file/SDF.js";
import { CPreferences } from "../../basic/CPreferences.js";

export class CRenInfo
{
    public mRP : CRenderPass = null;
    public mCam : CCamera=null;
    //mRP.mCycle이 0보다 클 때만 RenderFinish가 만든다
    public mSleep : CSleep=null;
    //처음이거나 셰이더를 다시 써야 할 때 켜진다. 다음 RenderFinish가 전체 mSleep을 다시 맞춘다.
    public mSleepReset=true;
    public mTag =new Set<string>();
    //public m_performance=0;
    public mShow=true;
    public mShader=null;
}
export class CRenPriority
{
    mAlphaList=new CArray<CRenPaint>();
    mDistanceList=new CArray<CRenPaint>();
	mRAlphaList=new CArray<CRenPaint>();
    mPriority : number=0;
    // static CompareDistance(a : CRenPaint,b : CRenPaint)
    // {
    //     return (b.mDistance+b.mTexHash)-(a.mDistance+a.mTexHash);
    // }

    // static CompareAlpha(a : CRenPaint,b : CRenPaint)
    // {
    //     return (b.mAlpha+b.mDistance)-(a.mAlpha+a.mDistance);
    // }
	static CompareNormal(a : CRenPaint,b : CRenPaint)
    {
        return (a.mDistance+a.mTexHash)-(b.mDistance+b.mTexHash);
    }
	static CompareReverse(a : CRenPaint,b : CRenPaint)
    {
        return (b.mDistance+b.mTexHash)-(a.mDistance+a.mTexHash);
    }
}


export class CBrush extends CObject implements IAutoUpdate,IFile
{
	constructor(_frame : CFrame)
	{
		super();
		this.SetKey("Brush");
		this.mFrame=_frame;
		var size=CDevice.GetProperty(CDevice.eProperty.Sam2DSize);
		this.mLightDir = new Float32Array(4*size);
		this.mLightColor = new Float32Array(4*size);
		this.mLightMask = new Float32Array(4*size);
		this.mLightCount=0;
		// for(var i=0;i<8;++i)
		// 	this.mShadowView.push(new Float32Array(4*size));
		this.mWindDir = new Float32Array(4*size);
		this.mWindPos = new Float32Array(4*size);
		this.mWindInfo = new Float32Array(4*size);
		this.mWindCount = 0;
		this.mEnvmapPos = new Float32Array(4*size);
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
	protected mTimer=new CTimer();
	public mDelay=0;
	protected mCam2d : CCamera=null;
	protected mCam3d : CCamera=null;
	protected mCamDev : CCamera=null;
	mDoubleChk=new Set<any>();
	public mLightDir : Float32Array=null;
	public mLightColor : Float32Array=null;
	public mLightMask : Float32Array=null;
	public mLightCount : number;

	//CDayCycle 기본 테이블과 같은 값(Cube.ts 주석 참고)
	public mSkyTable : Array<CMat>=[
		new CMat([0.24, 0.27, 0.30, 0.34, 0.38, 0.43, 0.50, 0.58, 0.56, 0.53, 0.50, 0.48, 0.47, 0.47, 0.47, 0.47]),
		new CMat([0.47, 0.52, 0.56, 0.60, 0.64, 0.68, 0.73, 0.78, 0.75, 0.71, 0.67, 0.64, 0.63, 0.63, 0.63, 0.63]),
		new CMat([0.84, 0.87, 0.90, 0.92, 0.94, 0.95, 0.96, 0.96, 0.92, 0.87, 0.82, 0.78, 0.76, 0.76, 0.76, 0.76]),
	];
	public mSunTable : Array<CMat>=[
		new CMat([1.00, 0.76, 0.62, 0.54, 0.50, 0.46, 0.44, 0.42, 0.42, 0.44, 0.47, 0.49, 0.50, 0.50, 0.50, 0.50]),
		new CMat([0.68, 0.74, 0.66, 0.61, 0.58, 0.55, 0.53, 0.51, 0.50, 0.49, 0.49, 0.48, 0.48, 0.48, 0.48, 0.48]),
		new CMat([0.36, 0.72, 0.72, 0.71, 0.70, 0.68, 0.67, 0.66, 0.66, 0.64, 0.62, 0.59, 0.57, 0.56, 0.55, 0.55]),
	];
        
        
	protected mShadowView : Array<Float32Array>=new Array<Float32Array>();
	//public m_shadowCamera=new Map<string,CCamera>();
	public mShadowCount=0;
    public mShadowTexOff=0;

	public mEnvmapCount=0;
	public mEnvmapTexOff=0;
	//mEnvmapCount 번째 envmap 정보. xyz=위치, w=구 반사 반지름(0이면 무한거리). 레이어 시작은 인덱스*6
	public mEnvmapPos : Float32Array=null;

	//mWindChk=new Set<any>();
	public mWindDir : Float32Array=null;
	public mWindPos : Float32Array=null;
	public mWindInfo : Float32Array=null;
	public mWindCount=0;

	//autoRP는 삭제하면 에러난다. 맵이 늘어나는 체크만 하지 줄어들거나 변경은 인식 못하게 만듬
	private mAutoRPMap=new Map<string,CRPAuto>();
	public mAutoRPUpdate=CUpdate.eType.Not;
	private mDefaultRPInit=false;

	public mCameraMap=new Map<string,CCamera>();
	public mPause=false;
	public mRenPriMap=new Map<number,CRenPriority>();
	public mRenInfoMap=new Map<string,CRenInfo>();
	mUpdateRenInfo=false;
	mUpdateShadow=CUpdate.eType.Updated;
	mUpdateLight=CUpdate.eType.Updated;
	mUpdateEnv=CUpdate.eType.Updated;
	mUpdateLUT=false;
	public mLUT=[new Float32Array(32*32),new Float32Array(32*32),new Float32Array(32*32),
		new Float32Array(32*32),new Float32Array(32*32),new Float32Array(32*32)];

	GetShadowView()
	{
		if(this.mShadowView.length==0)
		{
			var size=CDevice.GetProperty(CDevice.eProperty.Sam2DSize);
			for(var i=0;i<7;++i)
				this.mShadowView.push(new Float32Array(4*size));
		}
			
		return	this.mShadowView;
	}
	override IsShould(_member: string, _type: CObject.eShould): boolean 
	{
		if(_member=="mCameraMap" || _member=="mAutoRPMap")
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
				value.mAlphaList.Find(i).mPaint.ClearBatch(false);
			}
			for(let i=0;i<value.mDistanceList.Size();++i)
			{
				value.mDistanceList.Find(i).mPaint.ClearBatch(false);
			}
			for(let i=0;i<value.mRAlphaList.Size();++i)
			{
				value.mRAlphaList.Find(i).mPaint.ClearBatch(false);
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
	PushAutoRP(_key : string,_val : CRPAuto)
	{
		this.mAutoRPMap.set(_key,_val);
		this.mAutoRPUpdate=CUpdate.eType.Updated;
		return _val;
	}
	FindAutoRP(_key : string)
	{
		return this.mAutoRPMap.get(_key);
	}
	AutoRP()	{	return this.mAutoRPMap;	}
	//각 CPaint 타입이 RenderPass를 하나도 안 받은 채로 쓰일 때의 기본값.
	//paint별 EmptyRPChk() override로 흩어져 있던걸 여기로 모았다 - PTUpdate 진입 시 1회만 등록.
	EnsureDefaultRP()
	{
		if(this.mDefaultRPInit)	return;
		this.mDefaultRPInit=true;

		let pal=this.mFrame.Pal();
		
		// -----------------------------------------------
		// 포워드 관련 RP
		// -----------------------------------------------
		{
			// -----------------------------------------------
			// 디폴트
			// -----------------------------------------------
			const rpSurface=this.PushAutoRP("Forward_Surface",new CRPAuto(pal.Sl2DKey()));
			rpSurface.SetKey("Forward_Surface");
			rpSurface.mPriority=CRenderPass.ePriority.Surface;
			rpSurface.mTag.add("blit");
			rpSurface.PushOr([
				new CCondition("class","==","CPaintSurface","Paint_OR_Group")
			]);
			rpSurface.PushAnd(new CCondition("mRenderPass.length","==",0));

			const rp2D=this.PushAutoRP("Forward_2D",new CRPAuto(pal.Sl2DKey()));
			rp2D.SetKey("Forward_2D");
			rp2D.mCullFace=CRenderPass.eCull.None;//2D에 경우 컬링 뒷면을 신경쓰는 경우가 없으므로 꺼버렸다.
			rp2D.PushOr([
				new CCondition("class","==","CPaint2D","Paint_OR_Group"), 
				new CCondition("class","==","CPaintHTML","Paint_OR_Group"), 
				new CCondition("class","==","CPaint2DMerge","Paint_OR_Group"),
				new CCondition("class","==","CPaintTrail","Paint_OR_Group")
			]);
			rp2D.PushAnd(new CCondition("mRenderPass.length","==",0));
			rp2D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));//그림자리드텍스쳐

			const rp3D=this.PushAutoRP("Forward_3D",new CRPAuto(pal.Sl3DKey()));
			rp3D.SetKey("Forward_3D");
			rp3D.PushOr([
				new CCondition("class","==","CPaint3D","Paint_OR_Group"),
				new CCondition("class","==","CPaint3DMerge","Paint_OR_Group")
			]);
			rp3D.PushAnd(new CCondition("mRenderPass.length","==",0));
			rp3D.PushAnd(new CCondition("mTag[shadow]","==",false));
			rp3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));//그림자리드텍스쳐
			rp3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));//환경맵텍스쳐
			
			const rpVoxel=this.PushAutoRP("Forward_Voxel",new CRPAuto(pal.SlVoxelKey()));
			rpVoxel.SetKey("Forward_Voxel");
			rpVoxel.mPriority=CRenderPass.ePriority.BackGround;
			rpVoxel.PushOr([
				new CCondition("class","==","CPaintVoxel","Paint_OR_Group")
			]);
			rpVoxel.PushAnd(new CCondition("mRenderPass.length","==",0));
			rpVoxel.PushOr([
				new CCondition("mTag[shadow]","==",false),
				new CCondition("FindCShaderAttr(voxelCount).mData.z","==",1)
			]);
			rpVoxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));//그림자리드텍스쳐
			rpVoxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));//환경맵텍스쳐

			const rpTerrain=this.PushAutoRP("Forward_Terrain",new CRPAuto(pal.SlTerrainKey()));
			rpTerrain.SetKey("Forward_Terrain");
			rpTerrain.PushOr([
				new CCondition("class","==","CPaintTerrain","Paint_OR_Group")
			]);
			rpTerrain.PushAnd(new CCondition("mRenderPass.length","==",0));
			rpTerrain.PushAnd(new CCondition("mTag[shadow]","==",false));
			rpTerrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));//그림자리드텍스쳐
			rpTerrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));//환경맵텍스쳐

			// -----------------------------------------------
			// 디폴트(그림자 있을 때)
			// -----------------------------------------------
			const rpShadow_3D=this.PushAutoRP("Forward_Shadow_3D",new CRPAuto(pal.Sl3DKey()));
			rpShadow_3D.SetKey("Forward_Shadow_3D");
			rpShadow_3D.PushOr([
				new CCondition("class","==","CPaint3D","Paint_OR_Group"),
				new CCondition("class","==","CPaint3DMerge","Paint_OR_Group")
			]);
			rpShadow_3D.PushAnd(new CCondition("mRenderPass.length","==",0));
			rpShadow_3D.PushAnd(new CCondition("mTag[shadow]"));
			rpShadow_3D.mShaderAttr.push(new CShaderAttr("shadowOn", 1));
			rpShadow_3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));//그림자리드텍스쳐
			rpShadow_3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));//환경맵텍스쳐


			const rpShadow_Voxel=this.PushAutoRP("Forward_Shadow_Voxel",new CRPAuto(pal.SlVoxelKey()));
			rpShadow_Voxel.SetKey("Forward_Shadow_Voxel");
			rpShadow_Voxel.PushOr([
				new CCondition("class","==","CPaintVoxel","Paint_OR_Group")
			]);
			rpShadow_Voxel.PushAnd(new CCondition("mRenderPass.length","==",0));
			rpShadow_Voxel.PushAnd(new CCondition("mTag[shadow]"));
			rpShadow_Voxel.mShaderAttr.push(new CShaderAttr("shadowOn", 1));
			rpShadow_Voxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));//그림자리드텍스쳐
			rpShadow_Voxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));//환경맵텍스쳐

			const rpShadow_Terrain=this.PushAutoRP("Forward_Shadow_Terrain",new CRPAuto(pal.SlTerrainKey()));
			rpShadow_Terrain.SetKey("Forward_Shadow_Terrain");
			rpShadow_Terrain.PushOr([
				new CCondition("class","==","CPaintTerrain","Paint_OR_Group")
			]);
			rpShadow_Terrain.PushAnd(new CCondition("mRenderPass.length","==",0));
			rpShadow_Terrain.PushAnd(new CCondition("FindCShaderAttr(voxelCount).mData.z","!=",1));
			rpShadow_Terrain.PushAnd(new CCondition("mTag[shadow]"));
			rpShadow_Terrain.mShaderAttr.push(new CShaderAttr("shadowOn", 1));
			rpShadow_Terrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));//그림자리드텍스쳐
			rpShadow_Terrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));//환경맵텍스쳐

			// -----------------------------------------------
			// 하늘
			// -----------------------------------------------
			{
				const rpCube=this.PushAutoRP("Forward_Cube",new CRPAuto(pal.SlCubeKey()));
				rpCube.SetKey("Forward_Cube");
				//맨 끝에 그리면 알파컷 가장자리가 빈 배경(알파 0) 위에 먼저 섞이고 깊이를 차지해 하늘이 못 채운다.
				//알파가 1 미만으로 남아 캔버스 합성 때 외곽선이 생기므로 가장 먼저 그린다
				rpCube.mPriority=CRenderPass.ePriority.BackGround-100;
				rpCube.mCullFace=CRenderPass.eCull.None;
				rpCube.mCullFrustum=false;
				rpCube.PushOr([
					new CCondition("class","==","CPaintCube","Paint_OR_Group")
				]);
				rpCube.PushAnd(new CCondition("mRenderPass.length","==",0));
			}
			
			// -----------------------------------------------
			// 그림자
			// -----------------------------------------------
			{
				const rpShadowRead3D=this.PushAutoRP("ShadowRead_3D",new CRPAuto(pal.Sl3DKey()));
				rpShadowRead3D.SetKey("ShadowRead_3D");
				rpShadowRead3D.mRenderTarget = pal.GetShadowReadTex();//그림자리드텍스쳐
				rpShadowRead3D.mAlpha=false;
				rpShadowRead3D.mTag.add("shadowRead");
				rpShadowRead3D.mPriority=CRenderPass.ePriority.BackGround;
				rpShadowRead3D.PushOr([
					new CCondition("class","==","CPaint3D","Paint_OR_Group"),
					new CCondition("class","==","CPaint3DMerge","Paint_OR_Group")
				]);
				rpShadowRead3D.PushAnd(new CCondition("mRenderPass.length","==",1));
				rpShadowRead3D.PushAnd(new CCondition("mTag[shadow]"));
				rpShadowRead3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, pal.GetShadowWriteTex()));//그림자라이트텍스쳐


				const rpShadowReadVoxel=this.PushAutoRP("ShadowRead_Voxel",new CRPAuto(pal.SlVoxelKey()));
				rpShadowReadVoxel.SetKey("ShadowRead_Voxel");
				rpShadowReadVoxel.mRenderTarget = pal.GetShadowReadTex();//그림자리드텍스쳐
				rpShadowReadVoxel.mAlpha=false;
				rpShadowReadVoxel.mTag.add("shadowRead");
				rpShadowReadVoxel.mPriority=CRenderPass.ePriority.BackGround;
				rpShadowReadVoxel.PushOr([
					new CCondition("class","==","CPaintVoxel","Paint_OR_Group")
				]);
				rpShadowReadVoxel.PushAnd(new CCondition("FindCShaderAttr(voxelCount).mData.z","!=",1));
				rpShadowReadVoxel.PushAnd(new CCondition("mRenderPass.length","==",1));
				rpShadowReadVoxel.PushAnd(new CCondition("mTag[shadow]"));
				rpShadowReadVoxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, pal.GetShadowWriteTex()));//그림자라이트텍스쳐

				const rpShadowReadTerrain=this.PushAutoRP("ShadowRead_Terrain",new CRPAuto(pal.SlTerrainKey()));
				rpShadowReadTerrain.SetKey("ShadowRead_Terrain");
				rpShadowReadTerrain.mRenderTarget = pal.GetShadowReadTex();//그림자리드텍스쳐
				rpShadowReadTerrain.mAlpha=false;
				rpShadowReadTerrain.mTag.add("shadowRead");
				rpShadowReadTerrain.mPriority=CRenderPass.ePriority.BackGround;
				rpShadowReadTerrain.PushOr([
					new CCondition("class","==","CPaintTerrain","Paint_OR_Group")
				]);
				rpShadowReadTerrain.PushAnd(new CCondition("mRenderPass.length","==",1));
				rpShadowReadTerrain.PushAnd(new CCondition("mTag[shadow]"));
				rpShadowReadTerrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, pal.GetShadowWriteTex()));//그림자라이트텍스쳐
			}
		}

	}

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
	Update(_update : CUpdate)
	{
		this.mDelay=this.mTimer.Delay();
		if(this.mPause!=true) {
			if(this.mAutoRPUpdate==CUpdate.eType.Updated)
				this.mAutoRPUpdate=CUpdate.eType.Already;
			else if(this.mAutoRPUpdate==CUpdate.eType.Already)
				this.mAutoRPUpdate=CUpdate.eType.Not;
			if(this.mUpdateEnv==CUpdate.eType.Updated)
			{
				//envmap RP는 mCycle이 커서 한 번만 그려진다. 슬립을 다시 맞추게 해서 이번 프레임에 전부 다시 그린다.
				//Updated는 이전 프레임 컴포넌트 업데이트 중에 켜지므로, 그 프레임에 먼저 처리된 envmap까지 여기서 한 번에 처리된다
				const envTex=this.mFrame.Pal().GetEnvMapTex();
				for(const ri of this.mRenInfoMap.values())
				{
					if(ri.mRP!=null && ri.mRP.mRenderTarget==envTex)
						ri.mSleepReset=true;
				}
				this.mUpdateEnv=CUpdate.eType.Already;
			}
			else if(this.mUpdateEnv==CUpdate.eType.Already)
				this.mUpdateEnv=CUpdate.eType.Not;

			this.mLightCount=0;
			this.mShadowCount=0;
            this.mShadowTexOff=0;
			this.mEnvmapCount=0;
			this.mEnvmapTexOff=0;

			this.mWindCount=0;
			this.mDoubleChk.clear();
		}

		for(var cam of this.mCameraMap.values())
		{
			if(this.mFrame.Win().IsResize())
			{
				cam.mReset=true;
			}
			cam.Update(_update);
		}

		if(this.mCam2d!=null)
		{
			if(this.mFrame.Win().IsResize())
			{				
				if(this.m_2DCamDisplayReset)
				{
					var stx = this.mCam2d.mWidth*0.5;
					var sty = this.mCam2d.mHeight*0.5;
					this.mCam2d.Init(new CVec3(stx, sty, 200),new CVec3(stx, sty, 0));
					this.mCam2d.ResetOrthographic();
				}	
				
				
			}		
		}

	}
	override Icon(): string {
		return "bi-brush";
	}
}