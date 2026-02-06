
import { CUpdate } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CConsol } from "../../basic/CConsol.js";
import {CDOM} from "../../basic/CDOM.js";
import {CEvent} from "../../basic/CEvent.js";
import {CJSON} from "../../basic/CJSON.js";
import { CObject } from "../../basic/CObject.js";
import {CBound} from "../../geometry/CBound.js";
import {CMath} from "../../geometry/CMath.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CVec4} from "../../geometry/CVec4.js";
import { CAlpha } from "../../render/CAlpha.js";
import { CColor } from "../../render/CColor.js";
import {CRenderPass} from "../../render/CRenderPass.js";
import {CFont,  CFontOption } from "../../util/CFont.js";
import { CFrame } from "../../util/CFrame.js";



import {CCollider} from "../component/CCollider.js";
import { CPaint2D, CPaintHTML } from "../component/paint/CPaint2D.js";
import { CRayMouse } from "../CRayMouse.js";
import {CSubject} from "./CSubject.js";


var gToolMode=false;
var gUIPDepth=new Array<CUI>();
var gMainFrame : CFrame=null;
var gPickList=new CArray<{ui:CUI,pick:CRayMouse,z:number}>();

var gUIRP=new CRenderPass();
gUIRP.mPriority=CRenderPass.ePriority.Ui;
//g_uiRP.m_depthTest = false;
gUIRP.mDepthTest = false;
gUIRP.mDepthWrite = false;


export class CUI extends CSubject
{
	static eAnchor={
		Min:-1,
		Center:0,
		Max:1,
		Null:null,
	};

	public mPick : CRayMouse=null;
	public mLastPickMouse : CRayMouse=null;
	public mPressPos :CVec3=new CVec3();
	mFirstRayMs : CRayMouse=null;
	mPressTraking=false;
	//mOverlay=false;
	mBoundScale=1;
	mDbClick=0;
	mDbTime=0;
	mDbOn=false;
	//mSkipZTest : boolean = false;
	
	//public m_hotkey=-1;
	public mMove=false;
	public mUpdate=true;
	
	
	public mEvent = CEvent.eType.Null;
	public mLastEvent = CEvent.eType.Null;
	public mUIPT : CPaint2D = null;
	public mUICL : CCollider = null;
	public mSize : CVec2=null;
	public mRGBA : CVec4=null;
	public mClickEvent=new CEvent();
	public mPressEvent=new CEvent();
	
	public mCamZoomResize=false;//

	public mAnchorXType=CUI.eAnchor.Null;
	public mAnchorYType=CUI.eAnchor.Null;
	public mAnchorXLen=0;
	public mAnchorYLen=0;
	public mUpdateAnchor=true;
	public mUpdateScale=false;
	
	public mPivot : CVec3 = null;
	public mFocusCount=0;
	public mDebugMode=new Array();

	static ToolMode(_enable){	gToolMode=_enable;}
	static SetMainFrame(_frame)	{	gMainFrame=_frame;	}
	


	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mPick" || _member=="mLastPickMouse" || _member=="mLastEvent" || 
			_member=="mUpdateAnchor" || _member=="mUpdate" || _member=="mUpdateScale")
			return true;
			
		return super.IsShould(_member,_type);
	}
	
	public override ImportCJSON(_json: CJSON) 
	{
		var wt=super.ImportCJSON(_json);
		//this.m_update=false;

		var ptVec=this.FindComps(CPaint2D);
		if(ptVec.length>0)
			this.mUIPT=ptVec[0];

		var clVec=this.FindComps(CCollider) as Array<CCollider>;
		if(clVec.length>0)
			this.mUICL=clVec[0];

		//꺼진상태로 저장해서 그상태를 다시 돌릴려고 넣음
		for(let i=0;i<this.mComArr.length;++i)
		{
			if(this.mDebugMode!=null && this.mDebugMode.length>i)
				this.mComArr[i].SetEnable(this.mDebugMode[i]);
			// else
			// 	this.m_comVec[i].SetEnable(true);
		}

		
		

		return wt;
	}
	public override Export(_copy=true,_resetKey=true): this 
	{
		var wt=super.Export(_copy,_resetKey);

		var ptVec=wt.FindComps(CPaint2D) as Array<CPaint2D>;
		if(ptVec.length>0)
			wt.mUIPT=ptVec[0];	

		var clVec=wt.FindComps(CCollider) as Array<CCollider>;
		if(clVec.length>0)
			wt.mUICL=clVec[0];

		return wt;
	}
	constructor()
	{
		super();
	}
	SetCamZoomResize(_enable : boolean)
	{
		this.mCamZoomResize=_enable;
	}
	SetPressTraking(_enable : boolean)
	{
		this.mPressTraking=_enable;
	}
	
	SetDebugMode(_enable : boolean)
	{
		if(_enable)
			this.mDebugMode=new Array();
		else
		{
			this.mDebugMode=null;
		}
			
	}
	SetAnchorX(_type : number,_len : number=0)
	{
		
		this.mAnchorXType=_type;
		this.mAnchorXLen=_len;
		this.mUpdateAnchor=true;
		//this.m_camResize=true;
	}
	SetAnchorY(_type : number,_len : number=0)
	{
		this.mAnchorYType=_type;
		this.mAnchorYLen=_len;
		this.mUpdateAnchor=true;
		//this.m_camResize=true;
	}
	override SetEnable(_show)
	{
		super.SetEnable(_show);
		//this.SetEnable(_show);
	}
	GetPt() { return this.mUIPT;}
	GetCl() { return this.mUICL;}
	
	GetPressPos()	{	return this.mPressPos; }
	
	
	GetPick() { return this.mPick;	 }
	//GetPick2DPos() { return this.m_pick2DPos;	 }
	GetLastEvent() { return this.mLastEvent; }
	// static MoveMode(_enable)
	// {
	// 	g_moveMode = _enable;
	// 	if (g_moveMode)
	// 	{
	// 		g_eventLock = false;
	// 		//g_ScaPlus
	// 	}		
	// 	else
	// 		g_eventLock = true;
	// 	//this.AddCCollider();
	// }
	SetMove(_enable)
	{
		this.mMove = _enable;
		this.AddCCollider();
	}
	

	AddCCollider()
	{
		if (this.mUIPT == null)
			return;
		var bound = this.mUIPT.GetBound();
		if (bound.GetType() == CBound.eType.Null) {
			return;
		}
		if (this.mUICL != null)
		{
			this.mUICL.InitBound(this.mUIPT);
			this.mUICL.mBound.mMin.x*=this.mBoundScale;
			this.mUICL.mBound.mMin.y*=this.mBoundScale;
			this.mUICL.mBound.mMax.x*=this.mBoundScale;
			this.mUICL.mBound.mMax.y*=this.mBoundScale;
			this.mUICL.mBound.mMax.z = 0.1;
			this.mUICL.mBound.mMin.z = -0.1;
			return;
		}
			
		this.mUICL = new CCollider(this.mUIPT);
		//this.m_uiCl.SetLayer("ui");
		this.mUICL.SetPickMouse(true);
		this.mUICL.SetBoundType(CBound.eType.Box);
		//2d인데 ortho안쓰는 경우 있음
		this.mUICL.mBound.mMin.x*=this.mBoundScale;
		this.mUICL.mBound.mMin.y*=this.mBoundScale;
		this.mUICL.mBound.mMax.x*=this.mBoundScale;
		this.mUICL.mBound.mMax.y*=this.mBoundScale;
		this.mUICL.mBound.mMax.z = 0.1;
		this.mUICL.mBound.mMin.z = -0.1;

		this.PushComp(this.mUICL);
	}
	
	GetSize()	{	return this.mSize;	}
	SetSize(_width,_height)
	{
		if(this.mSize==null)
			this.mSize=new CVec2();
		else if(this.mSize.x == _width && this.mSize.y == _height) {
			return;
		}
		this.mSize.x=_width;
		this.mSize.y=_height;
		if(this.mUIPT!=null)
		{
			this.mUIPT.SetSize(this.mSize);
			this.AddCCollider();
		}
		this.mUpdateAnchor=true;
	}
	GetPivot() {
		return this.mPivot;
	}
	

	SetPivot(_pivot : CVec3)
	{
		this.mPivot = _pivot;
		
			
		if(this.mUIPT) 
		{
			if(this.mPivot!=null)
			{
				this.mUIPT.SetPivot(_pivot);
			}	
			this.AddCCollider();
		}
		
	}
	SetClickEvent(_event : CEvent);
	SetClickEvent(_event : Function);
	SetClickEvent(_event : any)
	{
		if(_event instanceof CEvent)
			this.mClickEvent = _event;
		else
			this.mClickEvent = new CEvent(_event);
		this.AddCCollider();
	}
	SetPressEvent(_event : CEvent);
	SetPressEvent(_event : Function);
	SetPressEvent(_event : any)
	{
		if(_event instanceof CEvent)
			this.mPressEvent = _event;
		else
			this.mPressEvent = new CEvent(_event);
		this.AddCCollider();
	}

	

	SetRGBA(_RGBA=new CVec4(0,0,0,1))
	{
		if(this.mRGBA!=null && this.mRGBA.Equals(_RGBA))	return;
		this.mRGBA=_RGBA;

		if(this.mUIPT!=null)
		{
			this.mUIPT.SetColorModel(new CColor(_RGBA.x,_RGBA.y,_RGBA.z,CColor.eModel.RGBAdd));
			this.mUIPT.SetAlphaModel(new CAlpha(_RGBA.w));
		}
	}
	// SetTexture(_tex)
	// {
	// 	if (this.m_fw.Res().get(_tex) == null)
	// 		this.m_fw.Load().Load(_tex);
	// 	this.m_uiPt.SetTexture(_tex);
	// }
	RTTexCodi()
	{
		this.mUIPT.SetTexCodi(new CVec4(1, 1, 0, -1));
	}
	
	PickMouse(_rayMouse : CRayMouse)
	{
		if(this.mEnable==false)
			return;
		
		//this.m_lastPickMouse.CopyImport(this.m_pick);
		this.mPick=_rayMouse;
		//CConsol.Veiwer(true);
		//CConsol.Log("PickMouse : "+this.Key());

		// this.m_lastPickKey=this.m_pick.mouse.key;

		// if(this.m_fw.Win().Input().KeyDown(CInput.eKey.LButton, true))
		// 	this.m_firstMouseClick = true;
		// else
		// 	this.m_firstMouseClick = false;

		//this.m_pick2DPos=CMath.V3SubV3(_rayMouse.ray.GetPosition(),this.GetPos());
		//this.m_pick2DPos.z=0;

		//CConsol.Log(pos.toJSON());
	}
	UpdateAnchor()
	{
		if(this.mUIPT.mRenPT.length==0 || gToolMode)
			return;
		var cam = this.mUIPT.mRenPT[0].mCam;
	

		if (this.mUpdateAnchor == false && this.mFrame.Win().IsResize() == false && cam.mUpdateMat==0)
            return;
        if (this.mAnchorXType == CUI.eAnchor.Null || this.mAnchorYType == CUI.eAnchor.Null || this.mUIPT==null)
            return;
        
        var pos = new CVec3();//this.GetPos().Export();
        var bound = this.mUIPT.GetBound().Export();
        if (bound.GetType() == CBound.eType.Null)
            return;
        //bound.InitBound(CMath.V3MulMatCoordi(bound.mMin, this.mUIPT.GetMat()));
        //bound.InitBound(CMath.V3MulMatCoordi(bound.mMax, this.mUIPT.GetMat()));
        
		var width = cam.mWidth;
		var height = cam.mHeight;
	
		width = this.mFrame.PF().mWidth;
		height = this.mFrame.PF().mHeight;
       

		let zoom=(1/cam.mZoom);
		let sizeX=Math.round((bound.mMax.x * this.mSca.x)*zoom);
		let sizeY=Math.round((bound.mMax.y * this.mSca.y)*zoom);
		pos.x=sizeX * -this.mAnchorXType+this.mAnchorXLen * -this.mAnchorXType;
		pos.y=sizeY * -this.mAnchorYType+this.mAnchorYLen * -this.mAnchorYType;
		//pos.x*=zoom;
		//pos.y*=zoom;
		if(this.mAnchorXType>0)	pos.x+=width;
		if(this.mAnchorYType>0)	pos.y+=height;

		// // 소수점 제거하여 픽셀 정렬 (떨림 방지)
		// pos.x = Math.round(pos.x);
		// pos.y = Math.round(pos.y);

		pos=cam.ScreenToWorld2DPoint(pos.x,pos.y);

		// ScreenToWorld2DPoint 후에도 소수점 제거
		pos.x = Math.trunc(pos.x);
		pos.y = Math.trunc(pos.y);

        super.SetPos(pos,true);
        this.mUpdateAnchor = false;
	}
	override SetPos(_pos: CVec3, _reset=true): void
	{
		super.SetPos(_pos,_reset);
		this.mUpdateAnchor=true;
	}
	override SubjectUpdate(_update : CUpdate)
	{
		super.SubjectUpdate(_update);

		if(this.mDebugMode!=null)
		{
			if(this.GetFrame().PF().mDebugMode && this.mDebugMode.length==0)
			{
				
				for(let i=0;i<this.mComArr.length;++i)
				{
					this.mDebugMode[i]=this.mComArr[i].IsEnable();
					this.mComArr[i].SetEnable(false);
				}
				
			}
			else if(this.GetFrame().PF().mDebugMode==false && this.mDebugMode.length!=0)
			{
				
				for(let i=0;i<this.mComArr.length;++i)
				{
					if(this.mDebugMode[i]==null)
						this.mComArr[i].SetEnable(true);
					else
						this.mComArr[i].SetEnable(this.mDebugMode[i]);
				}
				this.mUpdateAnchor=true;
				this.mDebugMode.length=0;
			}
		}
		


		if(this.mUIPT==null || this.mFrame==null)	return;

		
		if(this.mUIPT.mRenPT.length>0)
		{
			let cam = this.mUIPT.mRenPT[0].mCam;
			if(this.mCamZoomResize && Math.abs(cam.mZoom-this.mSca.x)>0.001)
			{
				
				this.SetSca(new CVec3(cam.mZoom,cam.mZoom,cam.mZoom));
				
				
			}
		}
		

		
		

		this.UpdateAnchor();
		// if(gMainFrame==this.GetFrame())	
		// {
		// 	this.mLastEvent=this.mEvent;
		// 	this.mEvent=null;

		// 	if(this.mPick!=null)
		// 	{
		// 		//this.mLastPickMouse=this.mPick;
				
		// 		gPickList.Push({ui:this,pick:this.mPick,z:this.GetPt().GetFMat().z});
		// 		this.mPick=null;
		// 	}
		// 	return;//갱신해줄 메인 프레임이 있으면 작업 안함
		// }



		
		let lastPressPos=this.mPressPos;
		this.mPressPos=null;
		
		
		
		let ev=CEvent.eType.Null;
		if(this.mPick!=null)
		{
			
			
			if(this.mPick.mouse.press)
			{
				
				ev=CEvent.eType.Press;
				if(this.mFirstRayMs==null)
				{
					this.mFirstRayMs=this.mPick.Export();
					let ctr=CMath.V3SubV3(this.mFirstRayMs.ray.GetPosition(),this.GetPos());
					this.mFirstRayMs.ray.SetOriginal(ctr);
				}
					
			}
			else
				ev=CEvent.eType.Pick;
			let push=true;
			let aDepth=this.GetPt().GetRenderPass()[0].mPriority+this.GetPt().GetFMat().z;
			for(let i=0;i<gUIPDepth.length;++i)
			{
				if(gUIPDepth[i]!=this && gUIPDepth[i].mPressTraking)
				{
					push=false;
					ev=CEvent.eType.Null;
					this.mPick=null;
					break;
				}
				
				if(gUIPDepth[i]==this)
				{
					push=false;
					continue;
				}

				let bDepth=gUIPDepth[i].GetPt().GetRenderPass()[0].mPriority+gUIPDepth[i].GetPt().GetFMat().z;
				
				if(gUIPDepth[i].mLastPickMouse.mouse.key==this.mPick.mouse.key)
				{
					if(aDepth==bDepth)
					{
						let aDist=CMath.V3Distance(this.mPick.ray.GetPosition(),this.GetPos());
						let bDist=CMath.V3Distance(gUIPDepth[i].mLastPickMouse.ray.GetPosition(),gUIPDepth[i].GetPos());

						CConsol.Log(this.Key()+" : "+aDist+" "+gUIPDepth[i].Key()+" : "+bDist);
						if(aDist>bDist)
						{
							push=false;
							ev=CEvent.eType.Null;
							this.mPick=null;
							break;
						}
						
					}

					if(bDepth<aDepth)
						gUIPDepth[i].mLastEvent=CEvent.eType.Null;
					else
						ev=CEvent.eType.Null;

				}
				
			}
			if(push)
			{
				gUIPDepth.push(this);
			}
			

		}
		if(this.mLastPickMouse!=null && this.mPick==null)
		{
			let m=this.mFrame.Input().GetMouseKey(this.mLastPickMouse.mouse.key);
			if(m!=null && m.press && this.mPressTraking && this.mFirstRayMs!=null)
			{
				ev=CEvent.eType.Press;
				this.mLastPickMouse.mouse.Import(m);
				this.mPick=this.mLastPickMouse;
				//
			}
			else
			{
				for(let i=0;i<gUIPDepth.length;++i)
				{
					if(gUIPDepth[i]==this)
					{
						gUIPDepth.splice(i,1);
						break;
					}
				}
			}

			// if(this.mSkipZTest) {
			// 	for(let i=0;i<gUIPDepth.length;++i)
			// 	{
			// 		if(gUIPDepth[i]==this)
			// 		{
			// 			gUIPDepth.splice(i,1);
			// 			break;
			// 		}
			// 	}
			// }
		}
		if(this.mDbOn)
		{
			this.mDbTime-=_update.DeltaTime();
			if(this.mDbTime<=0)
			{
				this.mLastEvent=CEvent.eType.Click;
				this.mClickEvent.Call(this);
				this.mDbTime=0;
				this.mDbOn=false;
				this.mPressPos=lastPressPos;
				//CConsol.Log("Click");
			}
		}
		if(this.mLastEvent==CEvent.eType.Press)
		{
			
			if(ev==CEvent.eType.Pick)
			{
				if(this.mDbClick!=0)
				{
					if(this.mDbOn==false)
					{
						this.mDbOn=true;
						this.mDbTime=this.mDbClick;
						this.mLastEvent=CEvent.eType.Null;
					}
					else
					{
						
						if(this.mDbTime>0)
						{
							this.mLastEvent=CEvent.eType.DoubleClick;
							this.mClickEvent.Call(this);
							this.mDbTime=0;
							this.mDbOn=false;
							//CConsol.Log("DoubleClick");
						}
					}
					

				}
				else
				{
					this.mLastEvent=CEvent.eType.Click;
					this.mPressPos=lastPressPos;
					this.mClickEvent.Call(this);
					//CConsol.Log("Click");
				}
			}
			else if(ev==CEvent.eType.Null && this.mPressTraking)
			{
				this.mLastEvent=CEvent.eType.Click;
				this.mPressPos=lastPressPos;
				this.mClickEvent.Call(this);
			}
			

			
		}
		else
			this.mLastEvent=ev;

		if(this.mFirstRayMs!=null && ev==CEvent.eType.Null)
		{
			this.mFirstRayMs=null;
		}
			
		if(ev==CEvent.eType.Press)
		{	
			this.mPressEvent.Call(this);
			var mx=this.mPick.mouse.x-this.mFirstRayMs.mouse.x;
			var my=this.mPick.mouse.y-this.mFirstRayMs.mouse.y;
			
			let ctr=this.mFirstRayMs.ray.GetOriginal();
			
			
			

			this.mPressPos=new CVec3(mx+ctr.x,my+ctr.y);


		}
		


		this.mLastPickMouse=this.mPick;
		this.mPick=null;
		
	}

};
//========================================================================
export class CUIText extends CUI
{
	public mText : string=null;
	public mFontOption : CFontOption;
	public mAlignCenter : boolean = true;
	constructor()
	{
		super();
	
	}
	Init(_text,_fontOption : CFontOption=null)
	{
		if(_fontOption!=null)
			this.mFontOption=_fontOption;
		if(this.mFontOption==null)
			this.mFontOption=new CFontOption(64);
		
		this.mText = _text+"";
		
		
		
		if(this.mUIPT==null)
		{
			this.mUIPT = new CPaint2D();
			this.mUIPT.PushRenderPass(gUIRP);
		
			
			this.PushComp(this.mUIPT);
		}
		this.mUpdate=true;
	}
	override SubjectUpdate(_delay: any): void 
	{
		
		if (this.mUpdate && this.mText!=null)
		{
			if(this.mDebugMode!=null)	this.mDebugMode.length=0;

			var fr = CFont.TextToTexName(this.GetFrame().Ren(),this.mText,this.mFontOption);
			this.mUIPT.SetTexture(fr.mKey);
			this.mUIPT.SetSize(null);
			
			if(this.mAlignCenter) {
				var xrate=fr.mXSize-fr.mRXSize;
				this.mUIPT.SetPos(new CVec3(xrate*0.5,0,0));
			}

			this.SetPivot(this.mPivot);

			if(this.mUICL != null) {
				this.mUICL.SetPickMouse(false);
			}
		}
		if (this.mUICL == null) {
			this.AddCCollider();

			if(this.mUICL != null) {
				this.mUICL.SetPickMouse(false);
			}
			
		}
		super.SubjectUpdate(_delay);
		if(this.mUpdate) this.mUpdate=false;
	}
	public override Export(_copy=true,_resetKey=true) 
	{
		this.mUIPT.SetTexture("");
		return super.Export(_copy,_resetKey);
	}
	override SetFrame(_fw: CFrame): void {
		if(_fw!=null && this.mText!=null)
			CFont.TextToTexName(_fw.Ren(),this.mText,this.mFontOption);
		super.SetFrame(_fw);
		
	}
	
};
//========================================================================
export class CUIPicture extends CUI
{
	public mTextureKey="";
	
	constructor()
	{
		super();
		
	}
	Init(_tex : string, _color = null)
	{
		this.mTextureKey = _tex;
		this.mUpdate=true;
	
		if(this.mUIPT == null) {
			this.mUIPT = new CPaint2D(this.mTextureKey,this.mSize);
			
			this.mUIPT.PushRenderPass(gUIRP);
			this.PushComp(this.mUIPT);
		}
	}
	override SubjectUpdate(_delay: any): void 
	{
		
		if (this.mUpdate && this.mTextureKey!=null)
		{
			this.mDebugMode.length=0;
			this.mUIPT.SetTexture(this.mTextureKey);
			this.mUIPT.SetSize(this.mSize);
			if(this.mRGBA!=null)	this.SetRGBA(this.mRGBA);
			this.SetPivot(this.mPivot);
			if(this.mUICL != null) {
				this.mUICL.SetPickMouse(false);
			}
		}
		if (this.mUICL == null) {
			this.AddCCollider();

			if(this.mUICL != null) {
				this.mUICL.SetPickMouse(false);
			}
			
		}
		super.SubjectUpdate(_delay);
		if (this.mUpdate)	this.mUpdate=false;
	}
};
//========================================================================


export class CUIButtonImg extends CUI
{
	
	
	public mNormal="";
	public mOverImg="";
	public mPressImg="";

	
	constructor()
	{
		super();
		
	}

	Init(_normal : string, _over : string, _press : string)
	{
		this.mUpdate=true;
		this.mNormal = _normal;
		this.mOverImg = _over;
		this.mPressImg = _press;
		if(this.mFrame!=null)
		{
			this.mFrame.Load().Exe(_over);
			this.mFrame.Load().Exe(_press);
		}
		
		this.mUpdate=true;
		
		if(this.mUIPT==null)
		{
			this.mUIPT = new CPaint2D(this.mNormal,this.mSize);
			//this.m_uiPt.PushTag("ui");
			this.mUIPT.PushRenderPass(gUIRP);
			this.PushComp(this.mUIPT);
		}
	}
	override SubjectUpdate(_delay)
	{
		
		if (this.mUpdate)
		{
			if(this.mNormal!=null)
			{
				this.mDebugMode.length=0;
				this.mUIPT.SetSize(this.mSize);
				this.mUIPT.SetTexture(this.mNormal);
				if(this.mRGBA!=null)	this.SetRGBA(this.mRGBA);
				this.SetPivot(this.mPivot);
			}
			
			this.mUpdate=false;
		}

		if (this.mUICL == null) {
			this.AddCCollider();
			
		}

		if (this.mLastEvent == CEvent.eType.Press)
		{
		
			if (this.mPressImg!=this.mUIPT.GetTexture()[0])
				this.mUIPT.SetTexture(this.mPressImg);
			this.GetFrame().SetCurser(CFrame.eCurser.pointer);
		}
		else if (this.mLastEvent == CEvent.eType.Pick)
		{
		
			if (this.mOverImg!=this.mUIPT.GetTexture()[0])
				this.mUIPT.SetTexture(this.mOverImg);
			this.GetFrame().SetCurser(CFrame.eCurser.pointer);
		}
		else
		{
			if (this.mNormal!=this.mUIPT.GetTexture()[0])
				this.mUIPT.SetTexture(this.mNormal);
			
		}
	
	
		super.SubjectUpdate(_delay);
		//if (this.m_update)	this.m_update=false;


	}
	override SetFrame(_fw: CFrame): void {
		super.SetFrame(_fw);
		if(this.mFrame!=null)
		{
			this.mFrame.Load().Exe(this.mOverImg);
			this.mFrame.Load().Exe(this.mPressImg);
		}
	}
};
export class CUIButtonRGBA extends CUI
{
	public mNormal="";
	public mNormalRGBA=new CVec4(0,0,0,1);
	public mOverRGBA=new CVec4(0,0,0,1);
	public mPressRGBA=new CVec4(0,0,0,1);
	
	constructor()
	{
		super();
		
	}
	Init(_normal : string, _over : CVec4=new CVec4(-0.2, -0.2, -0.2, 1), _press : CVec4=new CVec4(0.2, 0.2, 0.2, 1))
	{
		this.mUpdate=true;
		this.mNormal = _normal;
	
		this.mOverRGBA = _over;
		this.mPressRGBA = _press;
	
		if(this.mUIPT==null && this.mNormal!=null)
		{
			this.mUIPT = new CPaint2D(this.mNormal,this.mSize);
			//this.m_uiPt.PushTag("ui");
			this.mUIPT.PushRenderPass(gUIRP);
			this.PushComp(this.mUIPT);
		}
	}
	override SubjectUpdate(_delay)
	{
		
		if (this.mUpdate)
		{
			this.mDebugMode.length=0;
			this.mUIPT.SetSize(this.mSize);
			this.mUIPT.SetTexture(this.mNormal);
			if(this.mRGBA!=null)	this.SetRGBA(this.mRGBA);
			this.SetPivot(this.mPivot);
			this.mUpdate=false;
		}

		if (this.mUICL == null) {
			this.AddCCollider();
		
			//this.m_uiPt.GetRenderPass()[0].m_cam2D=this.m_cam2D;
		}
		
		if (this.mLastEvent == CEvent.eType.Press)
		{
			this.SetRGBA(this.mPressRGBA);
			this.GetFrame().SetCurser(CFrame.eCurser.pointer);
		}
		else if (this.mLastEvent == CEvent.eType.Pick)
		{
			this.SetRGBA(this.mOverRGBA);
			this.GetFrame().SetCurser(CFrame.eCurser.pointer);
		}
		else
		{
			this.SetRGBA(this.mNormalRGBA);
		}
	
		super.SubjectUpdate(_delay);
		//if (this.m_update)	this.m_update=false;


	}
};
export class CUIProgressBar extends CUI
{
	//public m_tex="";
	public mTexFront : string;
	public mTexBack : string;
	public mMax=0;
	public mVal=0;
	//public m_orgUiSize=new CVec2();
	//public m_orgTexSize=new CVec2();
	public mPTBack : CPaint2D;
	constructor()
	{
		super();
		
	}
	public override ImportCJSON(_json: CJSON) 
	{
		let result = super.ImportCJSON(_json);
		let ptVec = result.FindComps(CPaint2D);
		//ptBack 넣어줌
		if(ptVec.length > 1) {
			this.mPTBack = ptVec[1];
		}
		return result;
	}
	Init(_max : number,_val : number,_size : CVec2=new CVec2(2,2),_front=null,_back=null)
	{
		this.mTexFront=_front;
		this.mTexBack=_back;
		
		this.mMax = _max;
		this.mVal = _val;
		this.mSize=_size;
		this.mUpdate=true;
		
		if(this.mUIPT==null)
		{
			var redOn=false;
			if(this.mTexFront==null && this.mRGBA == null)
			{
				redOn=true;
			}
				

			this.mUIPT = new CPaint2D("",this.mSize);
			//this.m_uiPt.PushTag("ui");
			this.mUIPT.PushRenderPass(gUIRP);
			//this.m_uiPt.Sort2D(this.m_zValue+1);

			if(redOn)
				this.SetRGBA(new CVec4(1,0,0,0));
			else if(this.mRGBA)
				this.SetRGBA(this.mRGBA);

			this.PushComp(this.mUIPT);
		}

		if(this.mPTBack == null)
		{
			// if(this.m_texBack==null)
			// 	this.m_texBack=this.m_fw.Pal().GetBlackTex();
			this.mPTBack = new CPaint2D("",this.mSize);
			//this.m_ptBack.PushTag("ui");
			this.mPTBack.PushRenderPass(gUIRP);
			//this.m_ptBack.Sort2D(this.m_zValue);
			this.mPTBack.SetPos(new CVec3(0,0,-0.1));
			
			this.PushComp(this.mPTBack);
		}
	}
	SetBarVal(_val)
	{
		if (_val < 0)
			this.mVal = 0;
		else if (_val > this.mMax)
			this.mVal = this.mMax;
		else
			this.mVal = _val;
		
		if(this.mUIPT==null)
			return;
		var per = this.mVal / this.mMax*1.0;
		if(Number.isNaN(per)) {
			per = 0;
		}
		// this.m_uiPt.SetTexCodi(0, 0, this.m_orgTexSize.x*per, this.m_orgTexSize.y, this.m_orgTexSize.x, this.m_orgTexSize.y);
		this.mUIPT.SetPos(new CVec3((this.mSize.x*per-this.mSize.x)*0.5,0,0));
		this.mUIPT.SetSize(new CVec2(this.mSize.x*per, this.mSize.y));
	}
	GetBarVal() { return this.mVal; }
	GetBarMax() { return this.mMax; }
	SetBarMax(_val)
	{
		this.mMax = _val;
		this.SetBarVal(this.GetBarVal());
	}
	SetSizeScreenX(_yLen : number) 
	{
		if(!this.mFrame) return;
		this.SetSize(this.mFrame.PF().mWidth, _yLen);
	}
	SetSizeScreenY(_xLen : number) 
	{
		if(!this.mFrame) return;
		this.SetSize(_xLen, this.mFrame.PF().mHeight);
	}
	override SubjectUpdate(_delay: any): void 
	{
		
		if (this.mUpdate)
		{
			//페인트 생성 안되었으면 다음 업데이트에서 하도록 통과
			if(!(this.mUIPT && this.mPTBack)) {
				return;
			}

			if(this.mTexFront==null)
			{
				this.mTexFront=this.mFrame.Pal().GetBlackTex();
				this.mUIPT.SetTexture(this.mTexFront);
			}
				
			if(this.mTexBack==null)
			{
				this.mTexBack=this.mFrame.Pal().GetBlackTex();
				this.mPTBack.SetTexture(this.mTexBack);
			}
				

			this.mUIPT.SetSize(this.mSize);
			if(this.mRGBA!=null) this.SetRGBA(this.mRGBA);
			this.SetBarVal(this.mVal);
			//this.m_uiPt.Sort2D(this.m_zValue);
			//this.m_ptBack.Sort2D(this.m_zValue);

			if(this.mUICL != null) {
				this.mUICL.SetPickMouse(false);
			}
		}
		if (this.mUICL == null) {
			this.AddCCollider();

			if(this.mUICL != null) {
				this.mUICL.SetPickMouse(false);
			}
		}
		super.SubjectUpdate(_delay);
		if (this.mUpdate)	this.mUpdate=false;
	}
	
}
export class CUiHTML extends CUI
{
	mHTML : string | CJSON;
	mHover=false;
	mCLInit=true;
	Init(_html : string | CJSON,_size : CVec2=null)
	{
		this.mHTML=_html;
	
		if(this.mUIPT==null)
		{
			this.mUIPT = new CPaintHTML(CDOM.DataToDom(this.mHTML),_size);
			this.PushComp(this.mUIPT);
		}
		else
		{
			this.mUIPT.Destroy();
			this.mUIPT = new CPaintHTML(CDOM.DataToDom(this.mHTML),_size);
			
			this.PushComp(this.mUIPT);
		}
	}
	override Update(_update: CUpdate): void {
		super.Update(_update);

		if (this.mUICL == null || this.mCLInit) 
		{
			if((this.mUIPT as CPaintHTML).mAttach==false)
			{
				return;
			}
			this.AddCCollider();
			this.mCLInit=false;
		}
		let e=(this.mUIPT as CPaintHTML).GetElement();
		if(e.classList.length>0 && this.mHover)
		{
			if(this.mLastEvent==CEvent.eType.Pick || this.mLastEvent==CEvent.eType.Press)
			{
				(this.mUIPT as CPaintHTML).GetElement().classList.add("active");
			}
			else
			{
				(this.mUIPT as CPaintHTML).GetElement().classList.remove("active");
			}
		}
		
	}
	SetHover(_enable : boolean)
	{
		this.mHover=_enable;
	}
	
}