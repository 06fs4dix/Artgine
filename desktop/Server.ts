import { CAlert } from "../artgine/basic/CAlert.js";
import {CConsol} from "../artgine/basic/CConsol.js";
import { CDOM } from "../artgine/basic/CDOM.js";
import {CUtil} from "../artgine/basic/CUtil.js";
import {CWebView} from "../artgine/system/CWebView.js";


//var gAppJSON: { url, projectPath, projectName, program, server, width, height,fullScreen }=null;
var gIpInfo:{url,public,private};
async function Init()
{
    //gAppJSON = JSON.parse(await CWebView.Call("LoadAppJSON"));
    gIpInfo = JSON.parse(await CWebView.Call("GetIPInfo"));
    
    CDOM.IDValue("url_txt",gIpInfo.url);
    CDOM.IDValue("publicIP_txt",gIpInfo.public);
    CDOM.IDValue("privateIP_txt",gIpInfo.private);
}
Init();

function copyToClipboard(inputId: string) {
	const input = document.getElementById(inputId) as HTMLInputElement;
	if (input) {
		navigator.clipboard.writeText(input.value)
			.then(() => CConsol.Log(`[Copy] ${inputId} : ${input.value}`))
			.catch(err => CConsol.Log(`[Copy Error] ${err}`, CConsol.eColor.red));
	}
}

document.getElementById("privateIP_btn")?.addEventListener("click", () => {
	copyToClipboard("privateIP_txt");
});

document.getElementById("publicIP_btn")?.addEventListener("click", () => {
	copyToClipboard("publicIP_txt");
});
document.getElementById("url_btn")?.addEventListener("click", () => {
	copyToClipboard("url_txt");
});
document.getElementById("browser_btn")?.addEventListener("click", () => {
	CWebView.Call("RunBrowser",gIpInfo.url);
});