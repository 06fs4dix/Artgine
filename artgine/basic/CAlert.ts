
import { Bootstrap } from "./Bootstrap.js";
import {CConsol} from "./CConsol.js";
import {CModal} from "./CModal.js";
import {CUtil} from "./CUtil.js";


export class CAlert
{
	static E(_msg : string,_textArea=false)
	{
		
		debugger;
		if(CUtil.IsNode())
		{
			CConsol.Log(_msg,CConsol.eColor.red);
			return;
		}

		//window[CModal]
		let modal=new CModal();
		modal.SetHeader("Error")
		modal.SetTitle(CModal.eTitle.Text);
		if(_textArea)
		{
			//modal.SetSize(480,320);
			modal.SetTitle(CModal.eTitle.TextClose);
			modal.SetBody("<textarea style='width: 480px; height: 320px;'>"+_msg+"</textarea>");
			
		}
		else
		{
			modal.SetBody(_msg);
			modal.SetBodyClose(true);
			
		}
			
		modal.SetZIndex(CModal.eSort.Top);
		modal.SetBG(Bootstrap.eColor.danger);
		//
		modal.Open(CModal.ePos.Center);
		modal.Focus(CModal.eAction.Shake);
		if(_textArea==false)
			modal.Close(1000*5);
		
	}
	static W(_msg)
	{
		CConsol.Log(_msg,CConsol.eColor.yellow);
	}
	static Info(_msg : string,_time=5000)
	{
		let modal=new CModal();
		modal.SetHeader("Info")
		modal.SetTitle(CModal.eTitle.Text);
		modal.SetBody(_msg);
		modal.SetZIndex(CModal.eSort.Top);
		//modal.SetBG(CModal.eBG.danger);
		modal.SetBodyClose(true);
		modal.Open(CModal.ePos.Center);
		modal.Close(_time);
	}
	static Warning(_msg)
	{
		let modal=new CModal();
		modal.SetHeader("Warning")
		modal.SetTitle(CModal.eTitle.Text);
		modal.SetBody(_msg);
		modal.SetZIndex(CModal.eSort.Top);
		modal.SetBG("warning");
		modal.SetBodyClose(true);
		modal.Open(CModal.ePos.Center);
		modal.Close(5000);
	}
	static Error(_msg)
	{
		debugger;
		console.log(_msg);
		let modal=new CModal();
		modal.SetHeader("Error")
		modal.SetTitle(CModal.eTitle.Text);
		modal.SetBody(_msg);
		modal.SetZIndex(CModal.eSort.Top);
		modal.SetBG("danger");
		modal.SetBodyClose(true);
		modal.Open(CModal.ePos.Center);
		modal.Focus(CModal.eAction.Shake);
		modal.Close(5000);
	}
}

