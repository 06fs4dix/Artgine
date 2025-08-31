import { CAlert } from "../basic/CAlert.js";
import { CEvent } from "../basic/CEvent.js";
import { CLan } from "../basic/CLan.js";
import { CModal } from "../basic/CModal.js";
import { CPath } from "../basic/CPath.js";
import { CPreferences } from "../basic/CPreferences.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CInput } from "../system/CInput.js";
import { CStorage } from "../system/CStorage.js";
import { CWebView } from "../system/CWebView.js";
import { DevTool } from "../tool/DevTool.js";
import { CFrame } from "../util/CFrame.js";
import { CScript } from "../util/CScript.js";
import { CBrush } from "./CBrush.js";
import { CCanvas } from "./CCanvas.js";

/*
저장된 파일 구성
{
	script:[]
	canvas:[]
	brash:""

}


*/
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
		if(this.mPF.mRenderer==CPreferences.eRenderer.Null)
		{
			let MainLoading=CUtil.ID("MainLoading");
			if (MainLoading != null && MainLoading.parentNode) 
				MainLoading.hidden=true;
				//MainLoading.parentNode.removeChild(MainLoading);
			
			return;
		}
			


		this.mFrame = new CFrame(this.mPF,_canvasHTMLKey);
		this.mBrush = new CBrush(this.mFrame);
		this.mBrush.InitCamera(false);
		this.mBrush.mPause=true;
		let script="";

		this.mFrame.PushEvent(CEvent.eType.Load,async ()=>{


			let data=CStorage.Get(CPath.PHPCR()+"Save.json");
			if(CWebView.IsWebView()==CWebView.eType.None && data!=null)
			{
				let json:{script,canvas,brash}=JSON.parse(data);

				this.mBrush.ImportJSON(json.brash)
				for(let canJson of json.canvas)
				{
					let can=new CCanvas(this.mFrame,this.mBrush);
					can.ImportJSON(canJson);
					this.mCanvasMap.set(can.Key(),can);
					
				}
				script=json.script;
					
				
			}
			else
			{
				if(_canvas.length>0)
				await this.mBrush.LoadJSON("Canvas/Brush.json");
				for(let key of _canvas)
				{
					if(key==null || key=="")	continue;

					let can=new CCanvas(this.mFrame,this.mBrush);
					this.mCanvasMap.set(key,can);
					
					await can.LoadJSON("Canvas/"+key);
				}
			}
			



			
			this.mBrush.mPause=false;
			

			if(_devTool)
			{
				this.mFrame.PushEvent(CEvent.eType.Update,()=>{

					if(this.mFrame.Input().KeyUp(CInput.eKey.F3) && this.mFrame.PF().mDebugMode==false)
					{
						if(window["bootstrap"]==null)
							alert("import bootstrap!");
						else
							DevTool(this);
					}
						
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

						modal.SetZIndex(CModal.eSort.Top);
						modal.SetBodyClose(true);
						modal.Open(CModal.ePos.Center);

					}
				});
			}
		})
		await this.mFrame.Process();
		if(script!="")
			CScript.Build(CUniqueID.Get()+".ts",script);
		
		
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