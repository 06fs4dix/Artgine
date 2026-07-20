import { CAlert } from "../artgine/basic/CAlert.js";
import {CConsol} from "../artgine/basic/CConsol.js";
import { CDOM } from "../artgine/basic/CDOM.js";
import {CUtil} from "../artgine/basic/CUtil.js";
import {CWebView} from "../artgine/system/CWebView.js";
import {CUtilWeb} from "../artgine/util/CUtilWeb.js";
import {CConfirm} from "../artgine/basic/CModal.js";
import {CHash} from "../artgine/basic/CHash.js";


//var gAppJSON: { url, projectPath, projectName, program, server, width, height,fullScreen }=null;
var gIpInfo:{url,public,private};

async function applyPublicAccess(publicUrl: string) {
    gIpInfo.public = publicUrl;
    CDOM.IDValue("publicIP_txt", publicUrl);
    if (publicUrl.startsWith("http")) {
        const qrUrl = await CUtilWeb.QRCode(publicUrl, 180);
        (document.getElementById("qr_img") as HTMLImageElement).src = qrUrl;
        (document.getElementById("qr_area") as HTMLElement).style.display = "block";
    } else {
        (document.getElementById("qr_area") as HTMLElement).style.display = "none";
    }
}

/** 외부 포트 막힘 시 Cloudflare Quick Tunnel 제안 → 수락 시 bin 다운로드·실행·링크 표시 */
async function offerCloudflareTunnelIfNeeded() {
    if (gIpInfo.public.startsWith("http")) return;
    // GetIPInfo가 포트 미개방으로 판정한 문구일 때만 (인터넷 불가 메시지는 제외)
    if (gIpInfo.public.indexOf("Port unreachable") < 0) return;

    await new Promise<void>((resolve) => {
        CConfirm.List(
            `<p class="fw-bold">External port is unreachable.</p>
			<p class="mb-0">Start a free <b>Cloudflare tunnel</b> for remote access?<br>
			<span class="text-secondary small">(Downloads cloudflared once, no account required. Link is temporary.)</span></p>`,
            [
                async () => {
                    CDOM.IDValue("publicIP_txt", "Starting Cloudflare tunnel…");
                    try {
                        const raw = await CWebView.Call("StartCloudflareTunnel");
                        const r = typeof raw === "string" ? JSON.parse(raw) : raw;
                        if (r?.ok && r.url) {
                            await applyPublicAccess(r.url);
                            CAlert.Info("Cloudflare tunnel ready.");
                        } else {
                            const msg = r?.msg || "Failed to start Cloudflare tunnel.";
                            CDOM.IDValue("publicIP_txt", gIpInfo.public);
                            CAlert.E(msg);
                        }
                    } catch (e: any) {
                        CDOM.IDValue("publicIP_txt", gIpInfo.public);
                        CAlert.E(e?.message ?? String(e));
                    }
                    resolve();
                },
                () => { resolve(); },
            ],
            ["Yes", "No"]
        );
    });
}

async function Init()
{
    const appJSON = JSON.parse(await CWebView.Call("LoadAppJSON"));
    gIpInfo = JSON.parse(await CWebView.Call("GetIPInfo"));

    CDOM.IDValue("url_txt",gIpInfo.url);
    CDOM.IDValue("publicIP_txt",gIpInfo.public);
    CDOM.IDValue("privateIP_txt",gIpInfo.private);

    if(gIpInfo.public.startsWith("http"))
    {
        await applyPublicAccess(gIpInfo.public);
    }
    else
    {
        await offerCloudflareTunnelIfNeeded();
    }

    CDOM.IDValue("auth_password_txt", appJSON.password ?? "");

    const commitAuth = () => CWebView.Call("UpdateExtraSettings", {
        password: (document.getElementById("auth_password_txt") as HTMLInputElement).value,
    });
    const pwInput = document.getElementById("auth_password_txt") as HTMLInputElement;
    const hashPW = () => {
        const v = pwInput.value;
        if (v && v.length < 64) pwInput.value = CHash.SHA256('artgine_' + v);
    };
    pwInput.addEventListener("blur", () => { hashPW(); commitAuth(); });
    pwInput.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); pwInput.blur(); }
    });
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
	const target = gIpInfo.public.startsWith("http") ? gIpInfo.public : gIpInfo.url;
	CWebView.Call("RunBrowser", target);
});
document.getElementById("switchDev_btn")?.addEventListener("click", () => {
	CConfirm.List(
		`<p class="text-danger fw-bold">
			Switching to Developer mode.<br><br>
			To return to server mode, you must change the program type to <b>"server"</b> and restart.
		</p>`,
		[
			() => { CWebView.Call("SwitchProgram", "developer"); },
			() => {}
		]
	);
});