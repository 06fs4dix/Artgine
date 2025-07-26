
import {CLan} from "../basic/CLan.js";
import {CModal,  CConfirm } from "../basic/CModal.js";

var gAudio=null;
var gVoice=null;
// var g_gps=null;
// var g_camera=null;
var gLock=false;
export class CSysAuth
{
	static IsAudio()	{	return gAudio;	}
	static IsVoice()	{	return gVoice;	}
	static Confirm(_audio : boolean,_voice=false,_gps=false,_camera=false)
	{
		if(gLock)
		{
			return new Promise((resolve, reject)=>{
				resolve(false);
			});
		}
		if(gAudio!=null)
		{
			return new Promise((resolve, reject)=>{
				resolve(gAudio);
			});
		}
		let str="";
		if(_audio)
			str+=CLan.T("CWebAuth.Enable.Sound", "사운드");
		str+=CLan.T("CWebAuth.Enable.Question", "권한을 활성화 하시겠습니까?");
		
		gLock=true;
		return new Promise((resolve, reject)=>{

			let confirm=new CConfirm();
			confirm.SetBody(str);
			confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
			()=> {
				gAudio=true;
				gLock=false;
				resolve(true);
				
			},
			()=> {
				gAudio=false;
				gLock=false;
				resolve(false);
			},
			],["Yes","No"])
			confirm.Open(CModal.ePos.Center);


			// new CJBox('Confirm', {
			// 	content: str,
			// 	confirmButton: '예',
			// 	cancelButton: '아니오',
			// 	confirm : ()=> {
			// 		g_audio=true;
			// 		g_lock=false;
			// 		resolve(true);
					
			// 	},
			// 	cancel : ()=> {
			// 		g_audio=false;
			// 		g_lock=false;
			// 		resolve(false);
			// 	},
			
			// }).open();
		});
	}
	
}