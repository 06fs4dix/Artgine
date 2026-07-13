import { CDOM } from "../../basic/CDOM.js";
import { CString } from "../../basic/CString.js";
import { CUtilWeb } from "../../util/CUtilWeb.js";
import { CPath } from "../../basic/CPath.js";
import { CFecth } from "../../network/CFecth.js";
import { getAuthToken } from "../CAuthToken.js";
const gPath = CUtilWeb.Parameter("path") ?? "";
const gUrl = CUtilWeb.Parameter("url") ?? "";
const languageMap = {
    ts: "typescript", js: "javascript", mjs: "javascript",
    json: "json", html: "html", htm: "html", wgsl: "wgsl",
};
const saveBtn = CDOM.ID("editor-save-btn");
const pathEl = CDOM.ID("editor-path");
const statusEl = CDOM.ID("editor-status");
if (pathEl) {
    pathEl.textContent = gPath || gUrl;
    pathEl.title = gPath || gUrl;
}
async function canWrite() {
    const token = getAuthToken(CPath.WebRootUrl());
    if (!token)
        return false;
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'auth/check', { token }, 'json');
        return !!j.authed;
    }
    catch {
        return false;
    }
}
async function saveFile(editor) {
    if (!gPath) {
        if (statusEl)
            statusEl.textContent = "No path info, cannot save.";
        return;
    }
    const dirEnd = gPath.lastIndexOf('/');
    const dir = gPath.slice(0, dirEnd + 1);
    const fileName = gPath.slice(dirEnd + 1);
    const token = getAuthToken(CPath.WebRootUrl());
    const base64 = btoa(unescape(encodeURIComponent(editor.getValue())));
    if (statusEl)
        statusEl.textContent = "Saving...";
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'File/Upload', { path: dir, name: [fileName], data: [base64], token }, 'json');
        if (statusEl)
            statusEl.textContent = j.ok ? "Saved" : `Save failed: ${j.msg ?? ''}`;
    }
    catch (e) {
        if (statusEl)
            statusEl.textContent = `Save failed: ${e.message}`;
    }
}
async function main() {
    const container = CDOM.ID("editor-body");
    if (!gUrl) {
        container.textContent = "No file specified.";
        return;
    }
    let source;
    try {
        const res = await fetch(gUrl);
        if (!res.ok) {
            container.textContent = `Failed to load file: HTTP ${res.status}`;
            return;
        }
        source = await res.text();
    }
    catch (e) {
        container.textContent = `Failed to load file: ${e.message}`;
        return;
    }
    const { ext } = CString.ExtCut(gPath || gUrl);
    const language = languageMap[ext] ?? "plaintext";
    const writable = await canWrite();
    CUtilWeb.MonacoEditer(container, source, language, "vs-dark", (editor) => {
        editor?.updateOptions({ readOnly: !writable });
        if (!writable)
            return;
        if (saveBtn) {
            saveBtn.style.display = "inline-block";
            saveBtn.addEventListener("click", () => saveFile(editor));
        }
        const monacoNs = window["monaco"];
        editor.addCommand(monacoNs.KeyMod.CtrlCmd | monacoNs.KeyCode.KeyS, () => saveFile(editor));
    }, false, gUrl);
}
main();
