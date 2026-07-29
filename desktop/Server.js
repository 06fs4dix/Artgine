import { CAlert } from "../artgine/basic/CAlert.js";
import { CConsol } from "../artgine/basic/CConsol.js";
import { CDOM } from "../artgine/basic/CDOM.js";
import { CWebView } from "../artgine/system/CWebView.js";
import { CUtilWeb } from "../artgine/util/CUtilWeb.js";
import { CConfirm } from "../artgine/basic/CModal.js";
import { CHash } from "../artgine/basic/CHash.js";
var gIpInfo;
async function applyPublicAccess(publicUrl) {
    gIpInfo.public = publicUrl;
    CDOM.IDValue("publicIP_txt", publicUrl);
    if (publicUrl.startsWith("http")) {
        const qrUrl = await CUtilWeb.QRCode(publicUrl, 180);
        document.getElementById("qr_img").src = qrUrl;
        document.getElementById("qr_area").style.display = "block";
    }
    else {
        document.getElementById("qr_area").style.display = "none";
    }
}
async function offerCloudflareTunnelIfNeeded() {
    if (gIpInfo.public.startsWith("http"))
        return;
    if (gIpInfo.public.indexOf("Port unreachable") < 0)
        return;
    await new Promise((resolve) => {
        CConfirm.List(`<p class="fw-bold">External port is unreachable.</p>
			<p class="mb-0">Start a free <b>Cloudflare tunnel</b> for remote access?<br>
			<span class="text-secondary small">(Downloads cloudflared once, no account required. Link is temporary.)</span></p>`, [
            async () => {
                CDOM.IDValue("publicIP_txt", "Starting Cloudflare tunnel…");
                try {
                    const raw = await CWebView.Call("StartCloudflareTunnel");
                    const r = typeof raw === "string" ? JSON.parse(raw) : raw;
                    if (r?.ok && r.url) {
                        await applyPublicAccess(r.url);
                        CAlert.Info("Cloudflare tunnel ready.");
                    }
                    else {
                        const msg = r?.msg || "Failed to start Cloudflare tunnel.";
                        CDOM.IDValue("publicIP_txt", gIpInfo.public);
                        CAlert.E(msg);
                    }
                }
                catch (e) {
                    CDOM.IDValue("publicIP_txt", gIpInfo.public);
                    CAlert.E(e?.message ?? String(e));
                }
                resolve();
            },
            () => { resolve(); },
        ], ["Yes", "No"]);
    });
}
async function Init() {
    const appJSON = JSON.parse(await CWebView.Call("LoadAppJSON"));
    gIpInfo = JSON.parse(await CWebView.Call("GetIPInfo"));
    CDOM.IDValue("url_txt", gIpInfo.url);
    CDOM.IDValue("publicIP_txt", gIpInfo.public);
    CDOM.IDValue("privateIP_txt", gIpInfo.private);
    if (gIpInfo.public.startsWith("http")) {
        await applyPublicAccess(gIpInfo.public);
    }
    else {
        await offerCloudflareTunnelIfNeeded();
    }
    document.getElementById("browser_btn").disabled = false;
    CDOM.IDValue("auth_password_txt", appJSON.password ?? "");
    const commitAuth = () => CWebView.Call("UpdateExtraSettings", {
        password: document.getElementById("auth_password_txt").value,
    });
    const pwInput = document.getElementById("auth_password_txt");
    const hashPW = () => {
        const v = pwInput.value;
        if (v && v.length < 64)
            pwInput.value = CHash.SHA256('artgine_' + v);
    };
    pwInput.addEventListener("blur", () => { hashPW(); commitAuth(); });
    pwInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            pwInput.blur();
        }
    });
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
