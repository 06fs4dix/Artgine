import { CConsol } from "../artgine/basic/CConsol.js";
import { CDOM } from "../artgine/basic/CDOM.js";
import { CWebView } from "../artgine/system/CWebView.js";
var gIpInfo;
async function Init() {
    gIpInfo = JSON.parse(await CWebView.Call("GetIPInfo"));
    CDOM.IDValue("url_txt", gIpInfo.url);
    CDOM.IDValue("publicIP_txt", gIpInfo.public);
    CDOM.IDValue("privateIP_txt", gIpInfo.private);
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
