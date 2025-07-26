
import {CDomFactory} from "../../basic/CDOMFactory.js";
import {CEvent} from "../../basic/CEvent.js";
import {CJSON} from "../../basic/CJSON.js";
import { CObject } from "../../basic/CObject.js";
import {CBound} from "../../geometry/CBound.js";
import {CMath} from "../../geometry/CMath.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CVec4} from "../../geometry/CVec4.js";
import {CRenderPass} from "../../render/CRenderPass.js";
import {CFont,  CFontOption } from "../../util/CFont.js";
import { CFrame } from "../../util/CFrame.js";



import {CCollider} from "../component/CCollider.js";
import { CPaint2D, CPaintHTML } from "../component/paint/CPaint2D.js";
import { CRayMouse } from "../CRayMouse.js";
import {CSubject} from "./CSubject.js";


var g_toolMode=false;
var g_moveMode = false;
var g_uiPDepth=new Array<CUI>();



var gUIRP=new CRenderPass();
gUIRP.mPriority=CRenderPass.ePriority.Ui;
//g_uiRP.m_depthTest = false;
gUIRP.mDepthTest = true;
gUIRP.mDepthWrite = true;


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
	mSkipZTest : boolean = false;
	
	//public m_hotkey=-1;
	public mMove=false;
	public mUpdate=true;
	
	
	
	public mLastEvent = CEvent.eType.Null;
	public mUIPT : CPaint2D = null;
	public mUICL : CCollider = null;
	public mSize : CVec2=null;
	public mRGBA : CVec4=null;
	public mClickEvent=new CEvent();
	public mPressEvent=new CEvent();
	
	public m_camResize=false;

	public mAnchorXType=CUI.eAnchor.Null;
	public mAnchorYType=CUI.eAnchor.Null;
	public mAnchorXLen=0;
	public mAnchorYLen=0;
	public mUpdateAnchor=true;
	public mUpdateScale=false;
	
	public mPivot : CVec3 = null;
	public mFocusCount=0;
	public mDebugMode=new Array();

	static ToolMode(_enable){	g_toolMode=_enable;}

	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mPick" || _member=="mLastPickMouse" || _member=="mLastEvent" || 
			_member=="mUpdateAnchor" || _member=="mUpdate" || _member=="mUpdateScale")
			return true;
			
		return super.IsShould(_member,_type);
	}
	public ImportCJSON(_json: CJSON) 
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
	public Export(_copy=true,_resetKey=true): this 
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
	SetCamResize(_enable : boolean)
	{
		this.m_camResize=_enable;
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
	SetEnable(_show)
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
			this.mUICL.mBound.mMax.z = 0.1;
			this.mUICL.mBound.mMin.z = -0.1;
			return;
		}
			
		this.mUICL = new CCollider(this.mUIPT);
		//this.m_uiCl.SetLayer("ui");
		this.mUICL.SetPickMouse(true);
		this.mUICL.SetBoundType(CBound.eType.Box);
		//2d인데 ortho안쓰는 경우 있음
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
	
	/*SetRS(_rs)
	{
		this.m_uiPt.SetRS(_rs);
	}*/
	// PivotCenter(_enable)
	// {
	// 	if (_enable) {
	// 		this.m_pivot = new CVec3(0,0,0);
	// 		this.m_uiPt.SetPivot(this.m_pivot);
	// 	}
	// 	else {
	// 		this.m_pivot = new CVec3(1, 1, 1);
	// 		this.m_uiPt.SetPivot(this.m_pivot);
	// 	}

	// 	this.AddCCollider();
	// }
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
			this.mUIPT.SetRGBA(_RGBA);
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
		if(this.mUIPT.mRenPT.length==0 || g_toolMode)
			return;
		var cam = this.mUIPT.mRenPT[0].mCam;
	

		if (this.mUpdateAnchor == false && this.mFrame.Win().IsResize() == false && cam.mUpdateMat==0)
            return;
        if (this.mAnchorXType == CUI.eAnchor.Null || this.mAnchorYType == CUI.eAnchor.Null || this.mUIPT==null)
            return;
        
        var pos = this.GetPos().Export();
        var bound = this.mUIPT.GetBound().Export();
        if (bound.GetType() == CBound.eType.Null)
            return;
        bound.InitBound(CMath.V3MulMatCoordi(bound.mMin, this.mUIPT.GetLMat()));
        bound.InitBound(CMath.V3MulMatCoordi(bound.mMax, this.mUIPT.GetLMat()));
        //var xRate=this.m_anXType*0.5+0.5;
        //var yRate=this.m_anYType*0.5+0.5;

		var width = cam.mWidth;
		var height = cam.mHeight;
		if(width == 0) {
			width = this.mFrame.PF().mWidth;
		}
		if(height == 0) {
			height = this.mFrame.PF().mHeight;
		}
        var ww = width * 0.5 * this.mAnchorXType*cam.mZoom; //this.m_fw.PF().m_width * 0.5 * this.m_anXType;
        var wh = height * 0.5 * this.mAnchorYType*cam.mZoom; //this.m_fw.PF().m_height * 0.5 * this.m_anYType;
		// else
		// {
			
		// }
        
        pos.x = ww - this.mAnchorXLen * this.mAnchorXType * this.mSca.x + (bound.mMax.x * this.mSca.x) * (-this.mAnchorXType) + cam.GetEye().x;
        pos.y = wh - this.mAnchorYLen * this.mAnchorYType * this.mSca.y + (bound.mMax.y * this.mSca.y) * (-this.mAnchorYType) + cam.GetEye().y;
		if(this.mAnchorXType==CUI.eAnchor.Center)	pos.x+=this.mAnchorXLen;
		if(this.mAnchorYType==CUI.eAnchor.Center)	pos.y+=this.mAnchorYLen;

        //pos.y=this.m_fw.PF().m_height*yRate+(this.m_anYLen+bound.max.y*this.m_sca.y)*(-this.m_anYType);
        this.SetPos(pos);
        this.mUpdateAnchor = false;
	}
	SetPos(_pos: CVec3, _reset=true): void
	{
		super.SetPos(_pos,_reset);
		this.mUpdateAnchor=true;
	}
	SubjectUpdate(_delay)
	{
		super.SubjectUpdate(_delay);

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
			if(this.m_camResize && (this.mFrame.Win().IsResize() || this.mUpdate || cam.mUpdateMat!=0))
			{
				//if(this.m_uiPt.m_renPt.length==0 || g_toolMode){}
				//if(this.m_updateScale)
				//{
					//임의 지정 사이즈가 아니면 확대 가능하다는 의미
					//그리고 타겟에 맞춰서 사이즈 변경되는 모드는 이걸 켜야함
					// if(cam.m_width==0 && this.m_targetResize)
					// {
					// 	var tw=this.GetFW().PF().m_width/this.GetFW().PF().m_targetWidth;
					// 	this.SetSca(new CVec3(tw,tw,tw));
					// }
					// else 
					//if(this.m_camResize)
					{
						this.SetSca(new CVec3(cam.mZoom,cam.mZoom,cam.mZoom));
					}
					//this.m_updateScale=false;
					
				// }
				// else
				// {
				// 	this.SetSca(new CVec3(cam.m_zoom,cam.m_zoom,cam.m_zoom));
				// }
				
			}
		}
		

		
		

		this.UpdateAnchor();
		var pressChk = false;
		this.mPressPos=null;
		//this.m_pressOut=false;

		
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
			for(let i=0;i<g_uiPDepth.length;++i)
			{
				
				if(g_uiPDepth[i]==this)
				{
					push=false;
					continue;
				}

				let bDepth=g_uiPDepth[i].GetPt().GetRenderPass()[0].mPriority+g_uiPDepth[i].GetPt().GetFMat().z;
				//if(aDepth==bDepth)	continue;
				//_a.GetPt().GetRenderPass()[0].m_priority+_a.GetPt().GetFMat().z-_b.GetPt().GetRenderPass()[0].m_priority+_b.GetPt().GetFMat().z
				if(g_uiPDepth[i].mLastPickMouse.mouse.key==this.mPick.mouse.key)
				{
					if(aDepth==bDepth)
					{
						push=false;
						ev=CEvent.eType.Null;
						this.mPick=null;
						break;
					}

					if(bDepth<aDepth)
						g_uiPDepth[i].mLastEvent=CEvent.eType.Null;
					else
						ev=CEvent.eType.Null;

				}
				
			}
			if(push)
			{
				g_uiPDepth.push(this);
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
				for(let i=0;i<g_uiPDepth.length;++i)
				{
					if(g_uiPDepth[i]==this)
					{
						g_uiPDepth.splice(i,1);
						break;
					}
				}
			}

			if(this.mSkipZTest) {
				for(let i=0;i<g_uiPDepth.length;++i)
				{
					if(g_uiPDepth[i]==this)
					{
						g_uiPDepth.splice(i,1);
						break;
					}
				}
			}
		}
		
		if(this.mLastEvent==CEvent.eType.Press && ev==CEvent.eType.Pick)
		{
			this.mLastEvent=CEvent.eType.Click;
			this.mClickEvent.Call(this);
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
			//this.m_firstRayMs.ray.SetOriginal();
			//let ctr=CMath.V3SubV3(this.m_pick.ray.GetPosition(),this.GetPos());
			//let ctr=CMath.V3SubV3(this.m_firstRayMs.ray.GetPosition(),this.GetPos());
			let ctr=this.mFirstRayMs.ray.GetOriginal();
			
			
			

			this.mPressPos=new CVec3(mx+ctr.x,my+ctr.y);

			// const offsetX = this.m_firstRayMs.mouse.x - this.GetPos().x;
			// const offsetY = this.m_firstRayMs.mouse.y - this.GetPos().y;

			// let center = new CVec3(offsetX, offsetY, 0);
			// const mx = this.m_pick.mouse.x - this.GetPos().x - center.x;
			// const my = this.m_pick.mouse.y - this.GetPos().y - center.y;

			// this.m_pressPos=new CVec3(mx,my);

		}
		


		this.mLastPickMouse=this.mPick;
		this.mPick=null;
		
		return;






		
	}

};
//========================================================================
export class CUIText extends CUI
{
	public m_text : string=null;
	public m_fo : CFontOption;
	public m_alignCenter : boolean = true;
	constructor()
	{
		super();
		//this.m_text=null;
	}
	Init(_text,_fontOption : CFontOption=null)
	{
		if(_fontOption!=null)
			this.m_fo=_fontOption;
		if(this.m_fo==null)
			this.m_fo=new CFontOption(64);
		
		this.m_text = _text+"";
		
		
		
		//this.m_pivot = new CVec3(1,1,1);
		
		if(this.mUIPT==null)
		{
			this.mUIPT = new CPaint2D();
			this.mUIPT.SetRenderPass(gUIRP);
			//this.m_uiPt.PushTag("ui");
			
			
			this.PushComp(this.mUIPT);
		}
		this.mUpdate=true;
	}
	SubjectUpdate(_delay: any): void 
	{
		
		if (this.mUpdate && this.m_text!=null)
		{
			if(this.mDebugMode!=null)	this.mDebugMode.length=0;

			var fr = CFont.TextToTexName(this.GetFrame().Ren(),this.m_text,this.m_fo);
			this.mUIPT.SetTexture(fr.mKey);
			this.mUIPT.SetSize(null);
			
			if(this.m_alignCenter) {
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
			
			//this.m_uiPt.GetRenderPass()[0].m_cam2D=this.m_cam2D;
		}
		super.SubjectUpdate(_delay);
		if(this.mUpdate) this.mUpdate=false;
	}
	public Export(_copy=true,_resetKey=true) 
	{
		this.mUIPT.SetTexture("");
		return super.Export(_copy,_resetKey);
	}
	SetFrame(_fw: CFrame): void {
		if(_fw!=null && this.m_text!=null)
			CFont.TextToTexName(_fw.Ren(),this.m_text,this.m_fo);
		super.SetFrame(_fw);
		
	}
	// public ParseJSON(_json: object | CJSON): CWatch {
	// 	let w=super.ParseJSON(_json);
		
	// 	return w;
	// }
};
//========================================================================
export class CUIPicture extends CUI
{
	public m_tex="";
	
	constructor()
	{
		super();
		
	}
	Init(_tex : string, _color = null)
	{
		this.m_tex = _tex;
		this.mUpdate=true;
	
		if(this.mUIPT == null) {
			this.mUIPT = new CPaint2D(this.m_tex,this.mSize);
			//this.m_uiPt.PushTag("ui");
			this.mUIPT.SetRenderPass(gUIRP);
			this.PushComp(this.mUIPT);
		}
	}
	SubjectUpdate(_delay: any): void 
	{
		
		if (this.mUpdate && this.m_tex!=null)
		{
			this.mDebugMode.length=0;
			this.mUIPT.SetTexture(this.m_tex);
			this.mUIPT.SetSize(this.mSize);
			if(this.mRGBA!=null)	this.mUIPT.SetRGBA(this.mRGBA);
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
			
			//this.m_uiPt.GetRenderPass()[0].m_cam2D=this.m_cam2D;
		}
		super.SubjectUpdate(_delay);
		if (this.mUpdate)	this.mUpdate=false;
	}
};
//========================================================================


export class CUIButtonImg extends CUI
{
	
	
	public m_normal="";
	public m_overImg="";
	public m_pressImg="";

	
	constructor()
	{
		super();
		
	}

	Init(_normal : string, _over : string, _press : string)
	{
		this.mUpdate=true;
		this.m_normal = _normal;
		this.m_overImg = _over;
		this.m_pressImg = _press;
		if(this.mFrame!=null)
		{
			this.mFrame.Load().Load(_over);
			this.mFrame.Load().Load(_press);
		}
		
		this.mUpdate=true;
		
		if(this.mUIPT==null)
		{
			this.mUIPT = new CPaint2D(this.m_normal,this.mSize);
			//this.m_uiPt.PushTag("ui");
			this.mUIPT.SetRenderPass(gUIRP);
			this.PushComp(this.mUIPT);
		}
	}
	SubjectUpdate(_delay)
	{
		
		if (this.mUpdate)
		{
			if(this.m_normal!=null)
			{
				this.mDebugMode.length=0;
				this.mUIPT.SetSize(this.mSize);
				this.mUIPT.SetTexture(this.m_normal);
				if(this.mRGBA!=null)	this.mUIPT.SetRGBA(this.mRGBA);
				this.SetPivot(this.mPivot);
			}
			
			this.mUpdate=false;
		}

		if (this.mUICL == null) {
			this.AddCCollider();
			
			//this.m_uiPt.GetRenderPass()[0].m_cam2D=this.m_cam2D;
		}

		if (this.mLastEvent == CEvent.eType.Press)
		{
		
			if (this.m_pressImg!=this.mUIPT.GetTexture()[0])
				this.mUIPT.SetTexture(this.m_pressImg);
			this.GetFrame().SetCurser(CFrame.eCurser.pointer);
		}
		else if (this.mLastEvent == CEvent.eType.Pick)
		{
		
			if (this.m_overImg!=this.mUIPT.GetTexture()[0])
				this.mUIPT.SetTexture(this.m_overImg);
			this.GetFrame().SetCurser(CFrame.eCurser.pointer);
		}
		else
		{
			if (this.m_normal!=this.mUIPT.GetTexture()[0])
				this.mUIPT.SetTexture(this.m_normal);
			
		}
	
	
		super.SubjectUpdate(_delay);
		//if (this.m_update)	this.m_update=false;


	}
	SetFrame(_fw: CFrame): void {
		super.SetFrame(_fw);
		if(this.mFrame!=null)
		{
			this.mFrame.Load().Load(this.m_overImg);
			this.mFrame.Load().Load(this.m_pressImg);
		}
	}
};
export class CUIButtonRGBA extends CUI
{
	public m_normal="";
	public m_normalRGBA=new CVec4();
	public m_overRGBA=new CVec4();
	public m_pressRGBA=new CVec4();
	
	constructor()
	{
		super();
		
	}
	Init(_normal : string, _over : CVec4=new CVec4(-0.2, -0.2, -0.2, 0), _press : CVec4=new CVec4(0.2, 0.2, 0.2, 0))
	{
		this.mUpdate=true;
		this.m_normal = _normal;
	
		this.m_overRGBA = _over;
		this.m_pressRGBA = _press;
	
		if(this.mUIPT==null && this.m_normal!=null)
		{
			this.mUIPT = new CPaint2D(this.m_normal,this.mSize);
			//this.m_uiPt.PushTag("ui");
			this.mUIPT.SetRenderPass(gUIRP);
			this.PushComp(this.mUIPT);
		}
	}
	SubjectUpdate(_delay)
	{
		
		if (this.mUpdate)
		{
			this.mDebugMode.length=0;
			this.mUIPT.SetSize(this.mSize);
			this.mUIPT.SetTexture(this.m_normal);
			if(this.mRGBA!=null)	this.mUIPT.SetRGBA(this.mRGBA);
			this.SetPivot(this.mPivot);
			this.mUpdate=false;
		}

		if (this.mUICL == null) {
			this.AddCCollider();
		
			//this.m_uiPt.GetRenderPass()[0].m_cam2D=this.m_cam2D;
		}
		
		if (this.mLastEvent == CEvent.eType.Press)
		{
			this.SetRGBA(this.m_pressRGBA);
			this.GetFrame().SetCurser(CFrame.eCurser.pointer);
		}
		else if (this.mLastEvent == CEvent.eType.Pick)
		{
			this.SetRGBA(this.m_overRGBA);
			this.GetFrame().SetCurser(CFrame.eCurser.pointer);
		}
		else
		{
			this.SetRGBA(this.m_normalRGBA);
		}
	
		super.SubjectUpdate(_delay);
		//if (this.m_update)	this.m_update=false;


	}
};
export class CUIProgressBar extends CUI
{
	//public m_tex="";
	public m_texFront : string;
	public m_texBack : string;
	public m_max=0;
	public m_val=0;
	//public m_orgUiSize=new CVec2();
	//public m_orgTexSize=new CVec2();
	public m_ptBack : CPaint2D;
	constructor()
	{
		super();
		
	}
	public ImportCJSON(_json: CJSON) 
	{
		let result = super.ImportCJSON(_json);
		let ptVec = result.FindComps(CPaint2D);
		//ptBack 넣어줌
		if(ptVec.length > 1) {
			this.m_ptBack = ptVec[1];
		}
		return result;
	}
	Init(_max : number,_val : number,_size : CVec2=new CVec2(2,2),_front=null,_back=null)
	{
		this.m_texFront=_front;
		this.m_texBack=_back;
		
		this.m_max = _max;
		this.m_val = _val;
		this.mSize=_size;
		this.mUpdate=true;
		
		if(this.mUIPT==null)
		{
			var redOn=false;
			if(this.m_texFront==null && this.mRGBA == null)
			{
				redOn=true;
			}
				

			this.mUIPT = new CPaint2D("",this.mSize);
			//this.m_uiPt.PushTag("ui");
			this.mUIPT.SetRenderPass(gUIRP);
			//this.m_uiPt.Sort2D(this.m_zValue+1);

			if(redOn)
				this.mUIPT.SetRGBA(new CVec4(1,0,0,0));
			else if(this.mRGBA)
				this.mUIPT.SetRGBA(this.mRGBA);

			this.PushComp(this.mUIPT);
		}

		if(this.m_ptBack == null)
		{
			// if(this.m_texBack==null)
			// 	this.m_texBack=this.m_fw.Pal().GetBlackTex();
			this.m_ptBack = new CPaint2D("",this.mSize);
			//this.m_ptBack.PushTag("ui");
			this.m_ptBack.SetRenderPass(gUIRP);
			//this.m_ptBack.Sort2D(this.m_zValue);
			this.m_ptBack.SetPos(new CVec3(0,0,-0.1));
			
			this.PushComp(this.m_ptBack);
		}
	}
	SetBarVal(_val)
	{
		if (_val < 0)
			this.m_val = 0;
		else if (_val > this.m_max)
			this.m_val = this.m_max;
		else
			this.m_val = _val;
		
		if(this.mUIPT==null)
			return;
		var per = this.m_val / this.m_max*1.0;
		if(Number.isNaN(per)) {
			per = 0;
		}
		// this.m_uiPt.SetTexCodi(0, 0, this.m_orgTexSize.x*per, this.m_orgTexSize.y, this.m_orgTexSize.x, this.m_orgTexSize.y);
		this.mUIPT.SetPos(new CVec3((this.mSize.x*per-this.mSize.x)*0.5,0,0));
		this.mUIPT.SetSize(new CVec2(this.mSize.x*per, this.mSize.y));
	}
	GetBarVal() { return this.m_val; }
	GetBarMax() { return this.m_max; }
	SetBarMax(_val)
	{
		this.m_max = _val;
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
	SubjectUpdate(_delay: any): void 
	{
		
		if (this.mUpdate)
		{
			//페인트 생성 안되었으면 다음 업데이트에서 하도록 통과
			if(!(this.mUIPT && this.m_ptBack)) {
				return;
			}

			if(this.m_texFront==null)
			{
				this.m_texFront=this.mFrame.Pal().GetBlackTex();
				this.mUIPT.SetTexture(this.m_texFront);
			}
				
			if(this.m_texBack==null)
			{
				this.m_texBack=this.mFrame.Pal().GetBlackTex();
				this.m_ptBack.SetTexture(this.m_texBack);
			}
				

			this.mUIPT.SetSize(this.mSize);
			if(this.mRGBA!=null) this.mUIPT.SetRGBA(this.mRGBA);
			this.SetBarVal(this.m_val);
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
// export class CUiHTML extends CUi
// {
// 	m_html : CJSON=new CJSON('{"<>":"div"}');
// 	m_click : boolean=false;
// 	Init(_html : CJSON,_click=false)
// 	{
// 		this.m_html=_html;
// 		this.m_click=_click;
// 		if(this.m_uiPt==null)
// 		{
// 			this.m_uiPt = new CPaintHTML(CDomFactory.DataToDom(this.m_html.GetDocument()),this.m_size);
// 			(this.m_uiPt as CPaintHTML).m_click=_click;
// 			this.PushComp(this.m_uiPt);
// 		}
// 		else
// 		{
// 			(this.m_uiPt as CPaintHTML).Reset(CDomFactory.DataToDom(this.m_html.GetDocument()));
// 		}
// 	}
// 	WTChange(_pointer: CPointer): void {
// 		super.WTChange(_pointer);

// 		if(_pointer.member=="m_html")
// 		{
// 			this.Init(this.m_html);
// 		}
// 	}
// 	public ParseJSON(_json: object | CJSON): CWatch {
// 		let json=_json as CJSON;
// 		let html=json.G("m_html");
// 		if(html!=null)
// 			json.Set("m_html",null);

		
// 		let w=super.ParseJSON(_json);
// 		if(html!=null)
// 			this.m_html=html;
// 		this.Init(this.m_html);
		
		
		
// 		return w;
// 	}
// 	public toJSON(): { class: string; } {
// 		let w=super.toJSON();
// 		w["m_html"]=this.m_html.Document();
// 		return w;
// 	}
// 	Update(_delay: any): void {
// 		super.Update(_delay);
// 		let pthtml=this.m_uiPt as CPaintHTML;
// 		if(this.m_uiPt.GetEnable()==false && pthtml.m_html["hidden"]==false)
// 		{
// 			pthtml.m_html["hidden"]=true;
// 		}
// 		else if(this.m_uiPt.GetEnable()==true && pthtml.m_html["hidden"]==true)
// 		{
// 			pthtml.m_html["hidden"]=false;
// 		}
// 	}
// }