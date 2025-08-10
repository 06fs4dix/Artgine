import { CAlert } from "../basic/CAlert.js";
import { CEvent } from "../basic/CEvent.js";
import { CLan } from "../basic/CLan.js";
import { CModal } from "../basic/CModal.js";
import { CPreferences } from "../basic/CPreferences.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CInput } from "../system/CInput.js";
import { CWebView } from "../system/CWebView.js";
import { DevTool } from "../tool/DevTool.js";
import { CFrame } from "../util/CFrame.js";
import { CBrush } from "./CBrush.js";
import { CCanvas } from "./CCanvas.js";

var gMain : CAtelier=null;
export class CAtelier
{
	static Main()	{	return gMain;	}
	mPF : CPreferences=new CPreferences();
	mFrame : CFrame=null;
	mBrush : CBrush=null;
	mCanvasMap : Map<string,CCanvas>=new Map<string,CCanvas>();
	//m_dev : CCanvasDev=null;
	async Init(_canvas : Array<string>,_canvasHTMLKey="",_devTool=true)
	{
		if(gMain==null)	gMain=this;
		if(this.mPF.mRenderer==CPreferences.eRenderer.Null)	return;

		// if(CWebView.IsWebView()!=CWebView.eType.None)
	    // {
		// 	if(!CWebView.Call("IsTSCompiled")) {
		// 		CAlert.E("ts파일 컴파일이 진행 중이거나 진행되지 않고 있습니다. 5초 후에 자동으로 새로고침됩니다.");
		// 		setTimeout(()=>{
		// 			CWebView.Call("RemoveCache").then(() => {
		// 				location.reload();
		// 			});
		// 		}, 5000);
		// 		return;
		// 	}
		// }

		this.mFrame = new CFrame(this.mPF,_canvasHTMLKey);
		
		//document.body.append(this.m_frame.Win().Handle());

		this.mBrush = new CBrush(this.mFrame);
		this.mBrush.InitCamera(false);
		this.mBrush.mPause=true;

		await this.mFrame.Process();

		if(_canvas.length>0)
			await this.mBrush.LoadJSON("Canvas/Brush.json");
		for(let key of _canvas)
		{

			// await this.m_frame.Load().Load("Canvas/"+key+".json");
			// var json=this.m_frame.Res().Find("Canvas/"+key+".json");
			if(key==null || key=="")	continue;

			let can=new CCanvas(this.mFrame,this.mBrush);
			this.mCanvasMap.set(key,can);
			//can.m_pause=true;
			await can.LoadJSON("Canvas/"+key);
		}
		this.mBrush.mPause=false;
		// for(let key of _canvas)
		// {
		// 	this.m_can.get(key).m_pause=false;
		// }

		if(_devTool)
		{
			this.mFrame.PushEvent(CEvent.eType.Update,()=>{

				if(this.mFrame.Input().KeyUp(CInput.eKey.F3) && this.mFrame.PF().mDebugMode==false)
					DevTool(this);
				if(this.mFrame.Input().KeyUp(CInput.eKey.F2))
				{
					let modal=CUtilObj.ShowModal(this.mFrame.Res());
					modal.SetZIndex(CModal.eSort.Manual,2000);
				}
				if(this.mFrame.Input().KeyUp(CInput.eKey.F1))
				{
					let modal=new CModal("HelpModal");
					modal.SetHeader("Help")
					modal.SetTitle(CModal.eTitle.Text);

					
					modal.SetBody(`
						<div class="table-responsive">
						<table class="table table-sm table-bordered align-middle mb-2">
							<thead class="table-light">
							<tr>
								<th class="text-center">Shortcut Key</th>
								<th>Function Description</th>
							</tr>
							</thead>
							<tbody>
							<tr><td class="text-center fw-bold">F2</td><td>Resource / BlackBoard / Language</td></tr>
							<tr><td class="text-center fw-bold">F3</td><td>DevTool</td></tr>
							<tr><td class="text-center fw-bold">F4</td><td>VSCode Project Open <small class="text-muted">(Only Electron)</small></td></tr>
							<tr><td class="text-center fw-bold">F5</td><td>Refresh. Ctrl+F5(Chach Clear)</td></tr>
							<tr><td class="text-center fw-bold">F6</td><td>Stop <small class="text-muted">(Only DevTool Mode)</small></td></tr>
							<tr><td class="text-center fw-bold">F7</td><td>Windows Project Folder Open <small class="text-muted">(Only Electron)</small></td></tr>
							<tr><td class="text-center fw-bold">F8</td><td>Browser Open <small class="text-muted">(Only Electron)</small></td></tr>
							<tr><td class="text-center fw-bold">F9</td><td>Setting <small class="text-muted">(Only Electron)</small></td></tr>
							<tr><td class="text-center fw-bold">Ctrl + C</td><td>Copy after selecting Subject</td></tr>
							<tr><td class="text-center fw-bold">Ctrl + V</td><td>Paste after selecting Canvas</td></tr>
							</tbody>
						</table>
						</div>
						<div class="mb-2">
						<p class="mb-1"><strong>Call</strong> : You can manually execute function names</p>
						<p class="mb-0">You can <strong>Import</strong> by entering copied JSON strings</p>
						</div>
					`);
					
					
					/*
						F2 Resource/BlackBoard
						F3 DevTool
						F4 VSCode Projcet Open 
						Ctrl+F4 SourceViewer
						F5 Refresh
						F6 Stop(Only DevTool Mode)
						F7 Window Projcet Folder Open (Only Electron)
						F8 Browser Open (Only Electron)
						F9 Setting (Only Electron)

						Ctrl+C Subject Select Copy
						Ctrl+V Canvas Select Paste

						Call : 함수 수동으로 실행가능
						복사한 json정보를 넣으면 Import가능
					*/
					modal.SetZIndex(CModal.eSort.Top);
					//modal.SetBG(CModal.eBG.danger);
					modal.SetBodyClose(true);
					modal.Open(CModal.ePos.Center);
					//modal.Close(1000*30);
				}
			});

			
		}
		// 	this.m_dev = new CCanvasDev(this.m_frame, this.m_brush);
		// await this.m_frame.Process();
	}
	NewCanvas(_key : string)
	{
		if(this.mCanvasMap.has(_key))	return;
		
		let can=new CCanvas(this.mFrame,this.mBrush);
		can.SetKey(_key);
		this.mCanvasMap.set(_key,can);
		//if(this.m_dev==null && this.m_frame!=null)
		//	this.m_dev = new CCanvasDev(this.m_frame, this.m_brush);
		return can;
	}
	Canvas(_key)
	{
		return this.mCanvasMap.get(_key);
	}
	Frame()
	{
		return this.mFrame;
	}
	PF(){	return this.mPF;	}
	Brush(){	return this.mBrush;	}
}
window["CAtelier"]=CAtelier;