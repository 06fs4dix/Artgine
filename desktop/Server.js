import { CConsol } from "../artgine/basic/CConsol.js";
import { CDOM } from "../artgine/basic/CDOM.js";
import { CWebView } from "../artgine/system/CWebView.js";
import { CUtilWeb } from "../artgine/util/CUtilWeb.js";
import { CConfirm } from "../artgine/basic/CModal.js";
var gIpInfo;
async function Init() {
    const appJSON = JSON.parse(await CWebView.Call("LoadAppJSON"));
    gIpInfo = JSON.parse(await CWebView.Call("GetIPInfo"));
    CDOM.IDValue("url_txt", gIpInfo.url);
    CDOM.IDValue("publicIP_txt", gIpInfo.public);
    CDOM.IDValue("privateIP_txt", gIpInfo.private);
    if (gIpInfo.public.startsWith("http")) {
        const qrUrl = await CUtilWeb.QRCode(gIpInfo.public, 180);
        document.getElementById("qr_img").src = qrUrl;
        document.getElementById("qr_area").style.display = "block";
    }
    CDOM.IDValue("auth_password_txt", appJSON.password ?? "");
    CDOM.IDValue("auth_rootpath_txt", (Array.isArray(appJSON.rootPath) ? appJSON.rootPath : [appJSON.rootPath ?? "./"]).join("\n"));
    document.querySelectorAll("#authRoot_collapse input, #authRoot_collapse textarea").forEach(el => el.addEventListener("change", () => CWebView.Call("UpdateExtraSettings", {
        password: document.getElementById("auth_password_txt").value,
        rootPath: document.getElementById("auth_rootpath_txt").value.split("\n").map(s => s.trim()).filter(Boolean),
    })));
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
    const target = gIpInfo.public.startsWith("http") ? gIpInfo.public : gIpInfo.url;
    CWebView.Call("RunBrowser", target);
});
document.getElementById("switchDev_btn")?.addEventListener("click", () => {
    CConfirm.List(`<p class="text-danger fw-bold">
			Switching to Developer mode.<br><br>
			To return to server mode, you must change the program type to <b>"server"</b> and restart.
		</p>`, [
        () => { CWebView.Call("SwitchProgram", "developer"); },
        () => { }
    ]);
});
