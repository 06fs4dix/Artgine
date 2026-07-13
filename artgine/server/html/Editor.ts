import { CDOM } from "../../basic/CDOM.js";
import { CString } from "../../basic/CString.js";
import { CUtilWeb } from "../../util/CUtilWeb.js";
import { CPath } from "../../basic/CPath.js";
import { CFecth } from "../../network/CFecth.js";
import { getAuthToken } from "../CAuthToken.js";

// path/url은 Control.ts가 file-opened 이벤트로 받은 값을 그대로 쿼리스트링에 실어 iframe src로 넘긴다.
const gPath = CUtilWeb.Parameter("path") ?? "";
const gUrl = CUtilWeb.Parameter("url") ?? "";

const languageMap: Record<string, "typescript" | "javascript" | "json" | "html" | "wgsl" | "plaintext"> = {
    ts: "typescript", js: "javascript", mjs: "javascript",
    json: "json", html: "html", htm: "html", wgsl: "wgsl",
};

const saveBtn = CDOM.ID("editor-save-btn") as HTMLButtonElement;
const pathEl = CDOM.ID("editor-path") as HTMLSpanElement;
const statusEl = CDOM.ID("editor-status") as HTMLSpanElement;
if (pathEl) { pathEl.textContent = gPath || gUrl; pathEl.title = gPath || gUrl; }

// 이 페이지가 로드된 origin(로컬/원격 서버 공통)의 admin 토큰이 이미 저장돼 있는지로 쓰기 가능 여부를 판단한다.
// Home/Control 쪽에서 로그인하면 같은 origin의 localStorage 토큰을 공유하므로 여기서 별도 로그인 UI는 두지 않는다.
async function canWrite(): Promise<boolean> {
    const token = getAuthToken(CPath.WebRootUrl());
    if (!token) return false;
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'auth/check', { token }, 'json') as any;
        return !!j.authed;
    } catch { return false; }
}

async function saveFile(editor: any) {
    if (!gPath) { if (statusEl) statusEl.textContent = "No path info, cannot save."; return; }
    const dirEnd = gPath.lastIndexOf('/');
    const dir = gPath.slice(0, dirEnd + 1);
    const fileName = gPath.slice(dirEnd + 1);
    const token = getAuthToken(CPath.WebRootUrl());
    const base64 = btoa(unescape(encodeURIComponent(editor.getValue())));

    if (statusEl) statusEl.textContent = "Saving...";
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'File/Upload',
            { path: dir, name: [fileName], data: [base64], token }, 'json') as any;
        if (statusEl) statusEl.textContent = j.ok ? "Saved" : `Save failed: ${j.msg ?? ''}`;
    } catch (e: any) {
        if (statusEl) statusEl.textContent = `Save failed: ${e.message}`;
    }
}

async function main() {
    const container = CDOM.ID("editor-body");
    if (!gUrl) { container.textContent = "No file specified."; return; }

    let source: string;
    try {
        const res = await fetch(gUrl);
        if (!res.ok) { container.textContent = `Failed to load file: HTTP ${res.status}`; return; }
        source = await res.text();
    } catch (e: any) {
        container.textContent = `Failed to load file: ${e.message}`;
        return;
    }

    const { ext } = CString.ExtCut(gPath || gUrl);
    const language = languageMap[ext] ?? "plaintext";
    const writable = await canWrite();

    CUtilWeb.MonacoEditer(container, source, language, "vs-dark", (editor) => {
        editor?.updateOptions({ readOnly: !writable });
        if (!writable) return;

        if (saveBtn) {
            saveBtn.style.display = "inline-block";
            saveBtn.addEventListener("click", () => saveFile(editor));
        }
        const monacoNs = (window as any)["monaco"];
        editor.addCommand(monacoNs.KeyMod.CtrlCmd | monacoNs.KeyCode.KeyS, () => saveFile(editor));
    }, false, gUrl);
}
main();
