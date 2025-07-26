import { CConsol } from "../artgine/basic/CConsol.js";
import { CUtil } from "../artgine/basic/CUtil.js";
import { CWebView } from "../artgine/system/CWebView.js";
var gIpInfo;
async function Init() {
    gIpInfo = JSON.parse(await CWebView.Call("GetIPInfo"));
    CUtil.IDValue("url_txt", gIpInfo.url);
    CUtil.IDValue("publicIP_txt", gIpInfo.public);
    CUtil.IDValue("privateIP_txt", gIpInfo.private);
}
Init();
function copyToClipboard(inputId) {
    const input = document.getElementById(inputId);
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
    CWebView.Call("RunBrowser", gIpInfo.url);
});
