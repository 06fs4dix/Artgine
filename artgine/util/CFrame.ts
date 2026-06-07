import {CWindow} from "../system/CWindow.js"
import {CPreferences} from "../basic/CPreferences.js"
import {CRes} from "../system/CRes.js"
import {CTimer} from "../system/CTimer.js"
import {CWASM} from "../basic/CWASM.js"
import {CUniqueID} from "../basic/CUniqueID.js"
import {CEvent} from "../basic/CEvent.js"
import {CCoroutine} from "./CCoroutine.js"
import {CConfirm, CModal} from "../basic/CModal.js"
import { CUpdate, IAutoFixed, IAutoRender, IAutoUpdate } from "../basic/Basic.js"
import {CPWA} from "../system/CPWA.js"
import {CConsol} from "../basic/CConsol.js"
import { CModalChat, CModalFrameView, CFileViewer, CLoadingBack } from "./CModalUtil.js"
import {CAlert} from "../basic/CAlert.js"
import {CInput} from "../system/CInput.js"
import {CWebView} from "../system/CWebView.js"
import {CRenderer,  CRendererGL } from "../render/CRenderer.js"
import {CDevice,  CDeviceGL } from "../render/CDevice.js"
import {CShaderInterpret,  CShaderInterpretGL } from "../render/CShaderInterpret.js"
import {CSoundMgr} from "../system/CSoundMgr.js"
import {CChecker} from "./CChecker.js"
import { CWebXR } from "./CWebXR.js"
import { CLoader } from "./CLoader.js"
import { CVec2 } from "../geometry/CVec2.js"
import { CTexture } from "../render/CTexture.js"
import { CBatchMgr, CBatchMgrGL } from "../render/CBatchMgr.js"
import { CPalette } from "./CPalette.js"
import { CPlugin } from "./CPlugin.js"
import { CPath } from "../basic/CPath.js"
import { CString } from "../basic/CString.js"
import { CRollBack } from "./CRollBack.js"
import { CSysAuth } from "../system/CSysAuth.js"
import { CUtilWeb } from "./CUtilWeb.js"
import { CDOM } from "../basic/CDOM.js"
import { CUtil } from "../basic/CUtil.js"
import { CUtilObj } from "../basic/CUtilObj.js"
import { CPool } from "../basic/CPool.js"


let gConsolChat : CModalChat=null;
var gFocus=null;
function WebInit()
{

	const invisibleButton = CDOM.TagToDom("div");
	invisibleButton.style.position = "absolute";
	invisibleButton.style.top = "0";
	invisibleButton.style.left = "0";
	invisibleButton.style.width = "32px";
	invisibleButton.style.height = "32px";
	invisibleButton.style.opacity = "0"; // 보이지 않지만
	invisibleButton.style.zIndex = "9999";
	invisibleButton.style.pointerEvents = "auto"; // 반드시 있어야 클릭 됨
	invisibleButton.style.background = "transparent"; // 안전하게
	document.body.appendChild(invisibleButton);
	invisibleButton.addEventListener("dblclick", () => {
		if(gConsolChat==null)
		{
			CConsolModalInit();
		}
		else
			gConsolChat.Show();

		while(CConsol.GetLogQue().IsEmpty()==false)
			gConsolChat.ChatAdd(CConsol.GetLogQue().Dequeue(),"gray");
	});
	
	window.addEventListener('error', function (event) 
	{
		if(event.message.indexOf("ResizeObserver")!=-1 )	return;

		if(gConsolChat==null && gMainFramework==null)
			CConsolModalInit();
		
		CConsol.Log("📄 filename: " + event.filename);     // 예: Light.js
		CConsol.Log("📌 lineno/colno: " + event.lineno+"/"+event.colno);             // 예: 25
		//CConsol.Log("📍 colno: " + );              // 예: 1

		if (event.error) {
			CConsol.Log("💬 message: " + event.error.message); // 예: Cannot read properties of null
			CConsol.Log("🧵 stack:\n" + event.error.stack);    // 전체 호출 위치 (Light.js:25:1 포함)
		} else {
			CConsol.Log("⚠️ message: " + event.message);
		}
	});
	window.addEventListener("unhandledrejection", function (event) {
		if(gConsolChat==null && gMainFramework==null)
			CConsolModalInit();
		//console.log("🔥 처리 안 된 Promise 에러");
		CConsol.Log("💬 reason:"+event.reason); // Error, string 등
	});

	document.addEventListener("freeze", () => {
		if(CFrame.Main()==null)	return;
		CFrame.EventCall(CFrame.Main().GetEvent(CEvent.eType.Freeze));

		
	});
	document.addEventListener("resume", () => {
		if(CFrame.Main()==null)	return;
		CFrame.EventCall(CFrame.Main().GetEvent(CEvent.eType.Resume));
	});
	document.addEventListener("visibilitychange", () => {
		if(CFrame.Main()==null)	return;
		if (document.hidden) {
			CFrame.EventCall(CFrame.Main().GetEvent(CEvent.eType.Freeze));
		} else {
			CFrame.EventCall(CFrame.Main().GetEvent(CEvent.eType.Resume));
		}
	});
}
if(CUtil.IsNode()==false)	WebInit();

	
	
	




function CConsolModalInit()
{
	gConsolChat=new CModalChat("ConsolChat",false);
	gConsolChat.SetCloseToHide(true);
	gConsolChat.Open();
	gConsolChat.On(CEvent.eType.Chat,(msg : string)=>{
		msg=msg.toLowerCase();
		gConsolChat.ChatAdd(msg);
		if(["frame", "fps"].some(word => msg.includes(word)))
			new CModalFrameView();
		else if (["win", "window", "preferences"].some(word => msg.includes(word)) &&
         ["size"].some(word => msg.includes(word)))
		{
			gConsolChat.ChatAdd("win width : " + window.innerWidth + " height : " + window.innerHeight,"#00cc00");
		}
		else if (["pf", "cpreferences"].some(word => msg.includes(word)) &&
				["size"].some(word => msg.includes(word)))
		{
			gConsolChat.ChatAdd("pf width : " + CFrame.Main().PF().mWidth + " height : " + CFrame.Main().PF().mHeight,"#00cc00");
		}
		else if(["res"].some(word => msg.includes(word)))
		{
			let modal=CUtilObj.ShowModal(CFrame.Main().Res(),"Resource");
			modal.SetZIndex(CModal.eSort.Manual,CModal.eSort.ZIndexTool);
		}
	});
	while(CConsol.GetLogQue().IsEmpty()==false)
		gConsolChat.ChatAdd(CConsol.GetLogQue().Dequeue(),"gray");
}


CConsol.SetLogEvent((_msg,_color)=>{
	if(gConsolChat!=null && gConsolChat.IsShow())
	{
		gConsolChat.ChatAdd(_msg,_color);
	}
	else	return true;

	return false;
});



var g_offset=0;
export class CFrame
{
	public mMainProcess;
	public mSubProcess;
	public mLoadProcess=null;
	public mRenderProcess=null;
	mLoadChk=null;
	mInit=true;

	private m_offset : number;
	

	private mDevice : CDevice;
	private mRenderer : CRenderer;
	private mBatchMgr : CBatchMgr;
	

	private mWindow : CWindow;
	private mSoundMgr : CSoundMgr=null;
	private mPreferences : CPreferences;
	private mLoader : CLoader;
	//private m_heap : CHeap=new CHeap();
	private mRes=new CRes();
	public mInput : CInput; 
	private mPalette=new CPalette();
	private mIAutoRenderArr=new Array<IAutoRender>();
	private mResizeList=new Array<string>();
	

	mEventVec=new Array<CEvent>();
	//mDelay=0;
	mUpdate =new CUpdate();
	

	DeltaTime()	{	return this.mUpdate.DeltaTime();	}
	Input()	{	return this.mInput;	}
	
	Win()	{	return this.mWindow;	}
	Dev()	{	return this.mDevice;	}
	Ren()	{	return this.mRenderer;	}
	BMgr()	{	return this.mBatchMgr;	}
	
	//SInter()	{	return this.m_shaderInterpret;	}
	Load()	:CLoader {	return this.mLoader;	}
	Res()	:CRes {	return this.mRes;	}
	PF()	{	return this.mPreferences;	}
	Pal()	{	return this.mPalette;	}
	SMgr()	{	return this.mSoundMgr;	}
	Off()	{	return this.m_offset;	}
	//Heap()	{	return this.m_heap;	}
	static Main()	{	return gMainFramework;	}
	static Sub()	{	return gSubFramework;	}
	static CConsolModal()
	{
		if(gConsolChat==null)
			CConsolModalInit();
		else
			gConsolChat.Show();
	}
	IsInit()	{	return this.mLoadProcess==null;}
	
	constructor(_pf : CPreferences)
	constructor(_pf : CPreferences,_htmlObj : HTMLCanvasElement)
	constructor(_pf : CPreferences,_htmlObj : string)
	constructor(_pf : CPreferences,_htmlObj : any="")
	{
		this.m_offset=g_offset++;
		this.mPreferences=_pf;
		if(CUtil.IsNode())	
		{
			//CAlert.E("Not Support!");
			return;
		}
			
		
		var canDummy=_htmlObj;
		if(typeof _htmlObj == "string")
		{
			canDummy=CDOM.ID(_htmlObj) as HTMLCanvasElement;
			if(canDummy==null)
			{
				canDummy=CDOM.TagToDom("canvas");
				canDummy.width=640;
				canDummy.height=480;
				if(_htmlObj=="")
					canDummy.id="can_"+CUniqueID.GetHash();
				else
					canDummy.id=_htmlObj;
				document.body.append(canDummy);
				document.body.style.userSelect='none';
				document.body.style.margin='0px';
				document.body.style.backgroundColor="black";
				canDummy.style.backgroundColor='black';
				
				
			}
			else
			{
				
				canDummy.id=_htmlObj;
			}
				
			
			canDummy.setAttribute("draggable","true");
			canDummy.setAttribute("oncontextmenu","return false");
			canDummy.setAttribute("ondragstart","return false");
			canDummy.setAttribute("onselectstart","return false");
			canDummy.setAttribute("onselectstart","return false");

			
			canDummy.style.display='block';
			//canDummy.style.backgroundColor='black';
			canDummy.style.userSelect='none';
			canDummy.style.outline = 'none';
			(canDummy as HTMLCanvasElement).style.webkitUserSelect="none";
			
			

			

		}
		else if(_htmlObj instanceof HTMLCanvasElement)
		{
			CAlert.E("HTMLCanvasElement 구현 안함");
		}
		this.mSoundMgr=new CSoundMgr(this.mRes);
		this.mInput=new CInput(_pf,canDummy);
		
			
		if(gMainFramework==null)
		{
			window.addEventListener('DOMContentLoaded', (event) => {
					
				var inputList=document.querySelectorAll("input");
				for(var input of inputList)
				{
					input.onfocus=()=>{
						this.mInput.SetFocus(false);
					};
					input.onblur=()=>{
						this.mInput.SetFocus(true);
					};
				}
				
			});
			window.onkeydown = (e) => {

				CInput.sKeyPress[e.keyCode]=true;

				if(e.keyCode==116 && CWebView.IsWebView()==CWebView.eType.None)
				{
					CUtilWeb.PageReload();
					return false;
				}
				else if(e.keyCode >= 112 && e.keyCode <= 121) 
				{
					if(e.keyCode >= 112 && e.keyCode <= 115)	
						this.mInput.mKeyPress[e.keyCode]=true;
					e.preventDefault();
					return false;
				}
				if(e.keyCode == 123 && this.mPreferences.mDeveloper==false) 
				{
					e.preventDefault();
					e.returnValue = false;
					return false;
				}
				if(e.keyCode == 18) {
					e.preventDefault();
					return false;
				}
				if (e.keyCode == 13 && e.altKey)
				{
					if(CWebView.IsWebView()==CWebView.eType.None)
						CWindow.ScreenFull();
					else
						CWebView.JToWKeyUp("Alt+Enter");
				}
				if (e.keyCode == 90 && e.ctrlKey)
				{
					if(CRollBack.Exe())
						e.preventDefault();
				}
					
					//CAlert.Info(CRollBack.Exe());
				
				
				if(e.altKey) 
				{
					e.preventDefault();
					return false;
				}
			}
			window.onkeyup=(e)=>
			{
				CInput.sKeyPress[e.keyCode]=false;
				if(e.keyCode >= 112 && e.keyCode <= 115 )
				{
					this.mInput.mKeyPress[e.keyCode]=false;
					e.preventDefault();
				}
				if(e.keyCode ==115 && (CWebView.IsWebView()==CWebView.eType.None || e.ctrlKey==true) && this.mPreferences.mDeveloper==true)
				{
					let info=CString.ExtCut(CPath.FullPath());
					
					let sv=new CFileViewer([info.name+".ts",info.name+".json",info.name+".html"]);
					sv.Open();
				}
				if(e.key=="Escape")
				{
					let mList=CModal.GetModalList();
					let top : CModal=null;
					let topIndex=-1;
					for(let m of mList)
					{
						let index=Number(m.mCard.style.zIndex==""?0:m.mCard.style.zIndex);
						if(topIndex<index)
						{
							topIndex=index;
							top=m;
						}
						
					}
					if(top!=null && top.mESC)
					{
						top.Close();
					}
				}
				//if(e.keyCode ==119 )	CWebView.JToWKeyUp("F8");
				//if(e.keyCode ==120 )	CWebView.JToWKeyUp("F9");
				//if(e.keyCode ==123 )	CWebView.JToWKeyUp("F12");
				
			};
		}
		
	

		
		
		
		
		
		if(this.mPreferences.mIAuto)
		{
			this.PushEvent(CEvent.eType.Load,new CEvent(async ()=>{
				await this.mPalette.Load(this);
			}));
			this.PushEvent(CEvent.eType.Init,new CEvent(()=>{
				this.mPalette.Init(this);
			}));
		}

		if(canDummy!=null)
		{
			this.mWindow=new CWindow(this.mPreferences,canDummy,this.mInput);
			

			//GPU안되면 무조건 webgl
			if(navigator.gpu && this.mPreferences.mRenderer==CPreferences.eRenderer.GPU)
			{

			}
			else if(this.mPreferences.mRenderer==CPreferences.eRenderer.GL)
			{
				this.mDevice=new CDeviceGL(this.mPreferences,canDummy);
				//this.mDevice.BenchmarkScore();
				
				
				this.mRenderer=new CRendererGL(this.mDevice,new CShaderInterpretGL(),this.mRes,this.mPreferences);
				this.mBatchMgr=new CBatchMgrGL(this.mRenderer);
				//this.m_shaderInterpret=new CShaderInterpretGL();
			}
			this.mLoader=new CLoader(this.mRenderer,this.mRes);
		}
			
		if(gMainFramework==null)
			gMainFramework=this;
		else
			gSubFramework=this;
		
	}
	PushIAuto(_any : IAutoUpdate|IAutoRender|IAutoFixed)
	{
		if(_any["Init"])
		{
			this.mEventVec.push(new CEvent("Init",_any,CEvent.eType.Init));
		}
		if(_any["Update"])
		{
			this.mEventVec.push(new CEvent("Update",_any,CEvent.eType.Update));
		}
		if(_any["Fixed"])
		{
			this.mEventVec.push(new CEvent("Fixed",_any,CEvent.eType.Fixed));
		}
			
		if(_any["Render"])
		{
			if(this.mIAutoRenderArr.length==0)
			{
				this.mRenderProcess=async ()=>{
					this.Ren().Begin();
					
					for(var each0 of this.mIAutoRenderArr)
					{
						each0.RenderQue(true);
					}
					for(var each0 of this.mIAutoRenderArr)
					{
						each0.RenderQue(false);
					}
					
					 	
					await CFrame.EventCall(this.GetEvent(CEvent.eType.Render));
					this.Ren().End();
				};
				// this.mEventVec.push(new CEvent(()=>{
				// 	//this.Ren().Dev().ClearColor(0,0,0);
				// 	this.Ren().Begin();
					
				// 	for(var each0 of this.mIAutoRenderArr)
				// 	{
				// 		each0.RenderQue(true);
				// 	}
				// 	 if(this.mIAutoRenderArr.length>0)
				// 	 	this.mIAutoRenderArr[0].RenderQue(false);
				// 	//CCanvas.RenderCanvas(g_brush,[g_can3d]);
				// 	this.Ren().End();
				// },CEvent.eType.Render));
			}
			this.mIAutoRenderArr.push(_any as IAutoRender);
		}

		
		//	
	}
	//PushEvent(_type: CEvent.eType.Update, _event: (delay: number) => any| CEvent<(delay: number) => any>): void;
	//PushEvent(_type: Exclude<CEvent.eType, CEvent.eType.Update>, _event: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>): void;

	PushEvent(_type: string, _event: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>): void;
	PushEvent(_type: CEvent.eType.Update, _event: ((delay: number) => any) | CEvent<(delay: number) => any>): void;
	PushEvent(_type: Exclude<CEvent.eType, CEvent.eType.Update>, _event: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>): void;
	PushEvent(_type: CEvent.eType, _event: any): void
	{
		this.mEventVec.push(CEvent.ToCEvent(_event,_type));
	}
	// static PushPlugingEvent(_type: CEvent.eType, _event: any): void
	// {
	// 	CFrame.sPluginEventVec.push(CEvent.ToCEvent(_event,_type));
	// }
	RemoveEvent(_event : CEvent)
	{
		for (let i = 0; i < this.mEventVec.length; ++i) 
		{
			
			if (this.mEventVec[i] === _event) 
			{
				this.mEventVec.splice(i, 1);
				break;
			}
		}
	}
	RemoveIAuto(_IAuto : IAutoUpdate|IAutoRender)
	{
		for (let i = 0; i < this.mEventVec.length; ++i) 
		{
			
			if (this.mEventVec[i].mClass == _IAuto) 
			{
				this.mEventVec.splice(i, 1);

			}
		}
		for (let i = 0; i < this.mIAutoRenderArr.length; ++i) 
		{
			
			if (this.mIAutoRenderArr[i] == _IAuto) 
			{
				this.mIAutoRenderArr.splice(i, 1);

			}
		}


		
	}
	// PushEventUpdate(_event: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>,_type : eEvent)
	// {
	// 	this.m_eventVec.push(CEvent.ToCEvent(_event,CEvent.eType.Update));
		
	// }
	
	GetEvent(_key : string) : Array<CEvent>
	{
		var earr=new Array<CEvent>();
		for(var each0 of this.mEventVec)
		{
			
			if(each0.mKey==_key)
			{
				earr.push(each0);
			}
		}
		
		return earr;
	}
	private Update(_update : CUpdate)
	{
		//this.mDelay=_delay;

		if(document.visibilityState != "visible" || document.hidden==true)
			this.SetCurser(CFrame.eCurser.notAllowed);
		else if(gMainFramework.Win()!=null && document.activeElement!=gMainFramework.Win().Handle())
			this.SetCurser(CFrame.eCurser.help);
		else 
			this.SetCurser(CFrame.eCurser.default);


	
		if(CFrame.Main()==this)
		{
			CPool.Update();

			let mList=CModal.GetModalList();
			let conFocus=true;
			for(let m of mList)
			{
				if(m.IsPause()==false)
					m.Update(this.mUpdate);
				
				if(m.mDebugMode!=null)
				{
					if(this.PF().mDebugMode && m.mShow && m.mDebugMode==true)
					{
						m.Hide(0);
						m.mDebugMode=false;
					}
					else if(this.PF().mDebugMode==false && m.mDebugMode==false)
					{
						m.mDebugMode=true;
						m.Show();
					}
				}
				if(m instanceof CConfirm)
					conFocus=false;
			}

			this.Input().SetFocus(conFocus);

			let cLoop=CCoroutine.GetLoopArr();
			for(let i=0;i<cLoop.Size();++i)
			{
				cLoop.Find(i).Start();
			}
			cLoop.Clear();
		}
		this.mInput.Update(this.mUpdate);
		this.mSoundMgr.Update(this.mUpdate);
			
		

		
		if(this.mWindow!=null)
		{
			this.mWindow.Update(this.mUpdate);
			if(this.mResizeList.length>0)
			{
				for(let i=0;i<this.mResizeList.length;++i)
				{
					let res=this.mRes.Find(this.mResizeList[i]);
					if(res.m_depthBuf!=null)
					{
						var size=new CVec2(Math.trunc(res.GetRWidth()*this.PF().mWidth),Math.trunc(res.GetRHeight()*this.PF().mHeight));
						if(size.IsZero())	continue;
						
						if(res.GetWidth() != size.x || res.GetHeight() != size.y)
							this.Ren().BuildRenderTarget(res.GetInfo(),size,this.mResizeList[i]);
						var ntex=this.Res().Find(this.mResizeList[i]) as CTexture;
						ntex.SetFilter(res.GetFilter());
						this.mResizeList.splice(i,1);
						i--;
					}
				}
			}
			if(this.mWindow.IsResize() || CWebXR.IsResize())
			{

				if(CFrame.Main()==this)
				{
					
					
					CDOM.PaintDiv().style.width=this.mWindow.mPF.mWidth+"px";
					CDOM.PaintDiv().style.height=this.mWindow.mPF.mHeight+"px";
					if(this.mWindow.mPF.mTargetWidth==0)
					{
						const rect = this.mWindow.Handle().getBoundingClientRect()
						CDOM.PaintDiv().style.left=rect.left+"px";
						CDOM.PaintDiv().style.top=rect.top+"px";
					}
					else
					{
						CDOM.PaintDiv().style.left=0+"px";
						CDOM.PaintDiv().style.top=0+"px";
					}
					
				}
				


				let mList=CModal.GetModalList();
				for(let m of mList)
				{
					if(m.mLimitPush)
						m.LimitPushChk();
				}
				for(let key of this.mRes.Keys())
				{
					let res=this.mRes.Find(key);
					if(res instanceof CTexture)
					{
						if(res.GetAutoResize() && res.GetInfo()[0].mTarget==CTexture.eTarget.Sigle)
						{
							if(res.mDepthBuf!=null)
							{
								var size=new CVec2(Math.trunc(res.GetRWidth()*this.PF().mWidth),Math.trunc(res.GetRHeight()*this.PF().mHeight));
								if(size.IsZero())	continue;
								
								if(res.GetWidth() != size.x || res.GetHeight() != size.y)
									this.Ren().BuildRenderTarget(res.GetInfo(),size,key);
								var ntex=this.Res().Find(key) as CTexture;
								ntex.SetFilter(res.GetFilter());
							}
							else
							{
								this.mResizeList.push(key);
							}
							
						}
					}
				}
				CFrame.EventCall(this.GetEvent(CEvent.eType.Resize));
			}
		}
		
	}





	static async EventCall(_eventArr : Array<CEvent>,_val=null)
	{
		if(_eventArr==null)
			return;
		for(var each0 of _eventArr)
		{
			if(each0.IsCall())
				await each0.CallAsync(_val);
		}
	}

	
	
	async Process()
	{
		this.Load().mLoadSet.add("load");

		if(CFrame.Sub()==null)
		{
			new CLoadingBack("MainLoading", ()=>{

				//init씬 확인용
				let size=this.Load().mLoadSet.size+(this.mInit?1:0);

				if(this.Load().mLoadSet.size==0 && this.mInit)
					this.mInit=false;

				return size;
			});
		}
		


		if(this.mDevice)	await this.mDevice.Init();
		
		let path=CPath.WebRootArtgineUrl();
		if(this.mPreferences.mGitHub)
			path="https://06fs4dix.github.io/Artgine/";
		await CWASM.Init(this.mPreferences.mWASM,path);
		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) await CPWA.IsOnline();
		//CConsol.Log(3);
		
		if(CPlugin.sEventVec.length>0 && gMainFramework==this)
		{
			for(let event of CPlugin.sEventVec)
			{
				this.PushEvent(event.mKey,event);
			}
			
		}

		var timer=new CTimer();
		var subCall=false;
		var subWDelay=0;
		

		//let timerTest=new CTimer();
        //let addTime=0;

		this.mMainProcess=async ()=>{
			//CConsol.Log("m_mainProcess");
			//this.m_heap.Clear();
			if(this.mMainProcess==null)	return;
			
			this.mUpdate.mDeltaTime=timer.Delay();
			this.mUpdate.mOffset++;
			


			const DEBUG_THRESHOLD = 5.0; // 1초 이상 멈췄다면 디버깅이나 탭 전환으로 판단
			const NORMAL_FRAME_TIME = 0.0166; // 복귀 시 사용할 기본 프레임 시간 (약 60fps)

			if (this.mUpdate.mDeltaTime > DEBUG_THRESHOLD && this.mPreferences.mDeveloper) 
			{
				// 디버깅 등으로 멈춰있다가 풀린 경우
				this.mUpdate.mDeltaTime = NORMAL_FRAME_TIME; 
				CAlert.W(`[Debug Detected] 시간 보정 발생: ${NORMAL_FRAME_TIME}s로 강제 설정`);
			}

			

			const maxTime=0.03;
			const maxCount=30;
			if(this.mUpdate.mDeltaTime>0.5)
			{
				this.mUpdate.mDeltaTime=0.001;
				this.mUpdate.mFixedCount=1;
				this.mUpdate.mFixedTime=this.mUpdate.mDeltaTime;
			}
			else
			{
				if(this.mUpdate.mDeltaTime>maxTime)
				{
					this.mUpdate.mFixedCount=Math.ceil(this.mUpdate.mDeltaTime/maxTime);
					if(this.mUpdate.mFixedCount>maxCount)
					{
						this.mUpdate.mDeltaTime=maxCount*maxTime;
						this.mUpdate.mFixedCount=maxCount;
					}

					this.mUpdate.mFixedTime=this.mUpdate.mDeltaTime/this.mUpdate.mFixedCount;
				}
				else
				{
					this.mUpdate.mFixedCount=1;
					this.mUpdate.mFixedTime=this.mUpdate.mDeltaTime;
				}
			}

			this.Update(this.mUpdate);

			
			await CFrame.EventCall(this.GetEvent(CEvent.eType.Update),this.mUpdate);
			await CFrame.EventCall(this.GetEvent(CEvent.eType.Fixed),this.mUpdate);
			//IAutoRender가 있으면 내부 루프를 돌아야해서 이렇게
			if(this.mRenderProcess==null)
				await CFrame.EventCall(this.GetEvent(CEvent.eType.Render));
			else
				await this.mRenderProcess();
			
			
			requestAnimationFrame(this.mMainProcess);
			// if(subCall==false || subWDelay>1000*3)
			// {
			// 	CWASM.SetThread(true);
			// 	CFrame.EventCall(this.GetEvent(CEvent.eType.SubUpdate));
			// 	subWDelay=0;
				
			// }
			CWASM.SetThread(false);
		};
		this.mSubProcess=(deadline)=>{
			CWASM.SetThread(true);
			//CConsol.Log("m_subProcess");
			if(this.mMainProcess==null)	return;
			subWDelay=0;
			subCall=true;
			CFrame.EventCall(this.GetEvent(CEvent.eType.SubUpdate),deadline);
			if ('requestIdleCallback' in window) 
				requestIdleCallback(this.mSubProcess);
			CWASM.Checker(1);
		};
		
		await CFrame.EventCall(this.GetEvent(CEvent.eType.Load));
		CChecker.Exe(async ()=>{
			if(this.mMainProcess==null)	return;

			if(this.Load().mLoadSet.has("load") && CSysAuth.IsLock()==false)
				this.Load().mLoadSet.delete("load");
			if(this.Load().LoadCompleteChk())
				this.mLoadChk=true;
			
			if (this.mLoadChk)
			{	
				await CFrame.EventCall(this.GetEvent(CEvent.eType.Init));
				timer.Delay();
				requestAnimationFrame(this.mMainProcess);
				if ('requestIdleCallback' in window) 
					requestIdleCallback(this.mSubProcess);
				this.mLoadProcess=null;
			}
			else
			{
				this.mLoadChk=false;
				CFrame.EventCall(this.GetEvent(CEvent.eType.LoadUpdate));
				return true;
			}
			
			return false;
		});
		

	}
	Destroy()
	{
		this.mLoadProcess=null;
		this.mSubProcess=null;
		this.mMainProcess=null;
		for(let [key,value] of this.mRes.mResMap)
		{
			if(key.indexOf("png")!=-1 || key.indexOf("jpg")!=-1 || key.indexOf("tga")!=-1  || key.indexOf("tex")!=-1)
				this.mRenderer.ReleaseTexture(value);
			else if(key.indexOf("/DM/")!=-1)
				this.mRenderer.ReleaseMeshDrawNode(value);
		}
	
	}
	static eCurser=
	{
		default:"default",
		pointer:"pointer",
		wait:"wait",
		none:"none",
		help:"help",
		notAllowed:"not-allowed",
		
		
	};
	SetCurser(_type)
	{
		if(this.Win()!=null && this.Win().Handle().style.cursor!=_type)
			this.Win().Handle().style.cursor=_type;
	}

}
var gMainFramework : CFrame=null;
var gSubFramework : CFrame=null;
