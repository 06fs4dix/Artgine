import { CDOM } from "../../basic/CDOM.js";
import { CString } from "../../basic/CString.js";
import { CUtil } from "../../basic/CUtil.js";
import { CUtilWeb } from "../../util/CUtilWeb.js";
import { CPath } from "../../basic/CPath.js";
import { CFecth } from "../../network/CFecth.js";
import { getAuthToken } from "../CAuthToken.js";
import { CIframeMsg } from "./CIframeMsg.js";
const gPath = CUtilWeb.Parameter("path") ?? "";
const gUrl = CUtilWeb.Parameter("url") ?? "";
const saveBtn = CDOM.ID("editor-save-btn");
const refreshBtn = CDOM.ID("editor-refresh-btn");
const pathEl = CDOM.ID("editor-path");
const statusEl = CDOM.ID("editor-status");
if (pathEl) {
    pathEl.textContent = gPath || gUrl;
    pathEl.title = gPath || gUrl;
}
let gDirty = false;
let gSuppressDirty = false;
let gEditor = null;
let gMode = null;
let gWritable = false;
let gExt = "";
let gContainer = null;
let gToolbarBound = false;
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
function sendDirty(_dirty) {
    gDirty = _dirty;
    if (window.parent !== window)
        CIframeMsg.Send(window.parent, 'editor-dirty', { dirty: _dirty });
}
let gLastSaveTime = null;
let gSaveTimerId = null;
function formatElapsed(_ms) {
    const sec = Math.floor(_ms / 1000);
    if (sec < 60)
        return `${sec}초 전 저장됨`;
    return `${Math.floor(sec / 60)}분 전 저장됨`;
}
function tickSaveStatus() {
    if (gLastSaveTime === null || !statusEl)
        return;
    statusEl.textContent = formatElapsed(Date.now() - gLastSaveTime);
}
function startSaveTimer() {
    gLastSaveTime = Date.now();
    tickSaveStatus();
    if (gSaveTimerId === null)
        gSaveTimerId = window.setInterval(tickSaveStatus, 1000);
}
function stopSaveTimer() {
    if (gSaveTimerId !== null) {
        window.clearInterval(gSaveTimerId);
        gSaveTimerId = null;
    }
    gLastSaveTime = null;
}
function showToolbar() {
    if (refreshBtn)
        refreshBtn.style.display = "inline-block";
    if (saveBtn && gWritable)
        saveBtn.style.display = "inline-block";
}
function bindToolbarOnce() {
    if (gToolbarBound)
        return;
    gToolbarBound = true;
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            if (gMode === "sheet")
                saveSheetFile();
            else if (gEditor)
                saveFile(gEditor);
        });
    }
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => { void refreshFile(); });
    }
}
async function uploadFile(_base64) {
    if (!gPath) {
        if (statusEl)
            statusEl.textContent = "No path info, cannot save.";
        return;
    }
    const dirEnd = gPath.lastIndexOf('/');
    const dir = gPath.slice(0, dirEnd + 1);
    const fileName = gPath.slice(dirEnd + 1);
    const token = getAuthToken(CPath.WebRootUrl());
    stopSaveTimer();
    if (statusEl)
        statusEl.textContent = "Saving...";
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'File/Upload', { path: dir, name: [fileName], data: [_base64], token }, 'json');
        if (j.ok) {
            startSaveTimer();
            sendDirty(false);
        }
        else if (statusEl)
            statusEl.textContent = `Save failed: ${j.msg ?? ''}`;
    }
    catch (e) {
        if (statusEl)
            statusEl.textContent = `Save failed: ${e.message}`;
    }
}
async function saveFile(editor) {
    await uploadFile(btoa(unescape(encodeURIComponent(editor.getValue()))));
}
let gSheetData = null;
let gSheetExt = '';
function parseCSVLine(_line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < _line.length; i++) {
        const ch = _line[i];
        if (ch === '"') {
            if (inQuote && _line[i + 1] === '"') {
                cur += '"';
                i++;
            }
            else
                inQuote = !inQuote;
        }
        else if (ch === ',' && !inQuote) {
            result.push(cur);
            cur = '';
        }
        else
            cur += ch;
    }
    result.push(cur);
    return result;
}
function serializeCSV(_rows) {
    return _rows.map(row => row.map(cell => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n'))
            return '"' + str.replace(/"/g, '""') + '"';
        return str;
    }).join(',')).join('\r\n');
}
function applySheetAction(_action, _payload) {
    if (!gSheetData)
        return;
    switch (_action) {
        case 'update': {
            const sheet = gSheetData.find(s => s.name === _payload.sheet);
            if (!sheet)
                break;
            const rowIdx = _payload.row + 1;
            if (!sheet.rows[rowIdx])
                sheet.rows[rowIdx] = [];
            sheet.rows[rowIdx][_payload.col] = _payload.value;
            break;
        }
        case 'insert': {
            const sheet = gSheetData.find(s => s.name === _payload.sheet);
            if (sheet)
                sheet.rows.splice(_payload.row + 1, 0, _payload.values);
            break;
        }
        case 'delete': {
            const sheet = gSheetData.find(s => s.name === _payload.sheet);
            if (sheet)
                sheet.rows.splice(_payload.row + 1, 1);
            break;
        }
        case 'alter': {
            const sheet = gSheetData.find(s => s.name === _payload.sheet);
            if (!sheet)
                break;
            if (!sheet.rows[0])
                sheet.rows[0] = [];
            sheet.rows[0][_payload.col] = _payload.name;
            break;
        }
        case 'insertSheet':
            gSheetData.splice(_payload.index, 0, { name: _payload.name, rows: [['']] });
            break;
        case 'deleteSheet': {
            const idx = gSheetData.findIndex(s => s.name === _payload.name);
            if (idx >= 0)
                gSheetData.splice(idx, 1);
            break;
        }
    }
}
async function saveSheetFile() {
    if (!gSheetData)
        return;
    let base64;
    if (gSheetExt === 'csv') {
        base64 = btoa(unescape(encodeURIComponent(serializeCSV(gSheetData[0]?.rows ?? []))));
    }
    else {
        const XLSX = window["XLSX"];
        if (!XLSX) {
            if (statusEl)
                statusEl.textContent = "xlsx library not loaded.";
            return;
        }
        const wb = XLSX.utils.book_new();
        gSheetData.forEach(sheet => {
            const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
            XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        });
        base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    }
    await uploadFile(base64);
}
async function loadSheetData(ext) {
    const res = await fetch(gUrl, { cache: "no-store" });
    if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (ext === 'csv') {
        const str = CUtil.ArrayToString(buf);
        const lines = str.split(/\r?\n/).filter(l => l.trim());
        return [{ name: 'Sheet1', rows: lines.map(l => parseCSVLine(l)) }];
    }
    const XLSX = window["XLSX"];
    if (!XLSX)
        throw new Error("xlsx library not loaded.");
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    return wb.SheetNames.map((name) => {
        const sheet = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        return { name, rows };
    });
}
async function mainSheet(container, ext, writable) {
    gMode = "sheet";
    gContainer = container;
    gExt = ext;
    gWritable = writable;
    let data;
    try {
        data = await loadSheetData(ext);
    }
    catch (e) {
        container.textContent = `Failed to load file: ${e.message}`;
        return;
    }
    gSheetData = data;
    gSheetExt = ext;
    container.innerHTML = "";
    CUtilWeb.SheetEditor(container, data, writable, (_action, _payload) => {
        applySheetAction(_action, _payload);
        sendDirty(true);
    });
    bindToolbarOnce();
    showToolbar();
}
async function refreshFile() {
    if (!gUrl || !gMode)
        return;
    if (gDirty && !confirm("저장되지 않은 변경이 있습니다. 서버 내용으로 덮어쓸까요?"))
        return;
    if (statusEl)
        statusEl.textContent = "Refreshing...";
    try {
        if (gMode === "text" && gEditor) {
            const res = await fetch(gUrl, { cache: "no-store" });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const source = await res.text();
            gSuppressDirty = true;
            gEditor.setValue(source);
            gSuppressDirty = false;
            sendDirty(false);
            stopSaveTimer();
            if (statusEl)
                statusEl.textContent = "Refreshed";
            return;
        }
        if (gMode === "sheet" && gContainer) {
            await mainSheet(gContainer, gExt, gWritable);
            sendDirty(false);
            stopSaveTimer();
            if (statusEl)
                statusEl.textContent = "Refreshed";
        }
    }
    catch (e) {
        gSuppressDirty = false;
        if (statusEl)
            statusEl.textContent = `Refresh failed: ${e.message}`;
    }
}
async function main() {
    const container = CDOM.ID("editor-body");
    if (!gUrl) {
        container.textContent = "No file specified.";
        return;
    }
    const { ext } = CString.ExtCut(gPath || gUrl);
    const writable = await canWrite();
    gWritable = writable;
    gExt = ext;
    gContainer = container;
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        await mainSheet(container, ext, writable);
        return;
    }
    gMode = "text";
    let source;
    try {
        const res = await fetch(gUrl, { cache: "no-store" });
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
    const language = CUtilWeb.sMonacoExtToLang[ext] ?? "plaintext";
    CUtilWeb.MonacoEditer(container, source, language, "vs-dark", (editor) => {
        gEditor = editor;
        editor?.updateOptions({ readOnly: !writable });
        bindToolbarOnce();
        showToolbar();
        if (!writable)
            return;
        const monacoNs = window["monaco"];
        editor.addCommand(monacoNs.KeyMod.CtrlCmd | monacoNs.KeyCode.KeyS, () => saveFile(editor));
        editor.onDidChangeModelContent(() => {
            if (!gSuppressDirty)
                sendDirty(true);
        });
    }, false, gUrl);
}
main();
