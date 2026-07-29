import { CDOM } from "../../basic/CDOM.js";
import { CString } from "../../basic/CString.js";
import { CUtil } from "../../basic/CUtil.js";
import { CUtilWeb, CSheetData } from "../../util/CUtilWeb.js";
import { CPath } from "../../basic/CPath.js";
import { CFecth } from "../../network/CFecth.js";
import { getAuthToken, checkAuthed } from "../CAuthToken.js";
import { CIframeMsg } from "./CIframeMsg.js";

// path/url은 Control.ts가 file-opened 이벤트로 받은 값을 그대로 쿼리스트링에 실어 iframe src로 넘긴다.
const gPath = CUtilWeb.Parameter("path") ?? "";
const gUrl = CUtilWeb.Parameter("url") ?? "";

// 언어 맵은 CUtilWeb.sMonacoExtToLang 공유. TS 언어 서비스/TSImport는 typescript일 때만 MonacoEditer 내부에서 동작.
const saveBtn = CDOM.ID("editor-save-btn") as HTMLButtonElement;
const refreshBtn = CDOM.ID("editor-refresh-btn") as HTMLButtonElement;
const pathEl = CDOM.ID("editor-path") as HTMLSpanElement;
const statusEl = CDOM.ID("editor-status") as HTMLSpanElement;
if (pathEl) { pathEl.textContent = gPath || gUrl; pathEl.title = gPath || gUrl; }

let gDirty = false;
let gSuppressDirty = false;
let gEditor: any = null;
let gMode: "text" | "sheet" | null = null;
let gWritable = false;
let gExt = "";
let gContainer: HTMLElement | null = null;
let gToolbarBound = false;

// 이 페이지가 로드된 origin(로컬/원격 서버 공통)의 admin 토큰이 이미 저장돼 있는지로 쓰기 가능 여부를 판단한다.
// Home/Control 쪽에서 로그인하면 같은 origin의 localStorage 토큰을 공유하므로 여기서 별도 로그인 UI는 두지 않는다.
async function canWrite(): Promise<boolean> {
    return checkAuthed(CPath.WebRootUrl());
}

// 수정/저장 상태를 부모(Control.ts)에 알린다. 부모는 이 신호로 사이드바 항목의 초록/노랑 점을 갱신한다.
function sendDirty(_dirty: boolean): void {
    gDirty = _dirty;
    if (window.parent !== window) CIframeMsg.Send(window.parent, 'editor-dirty', { dirty: _dirty });
}

let gLastSaveTime: number | null = null;
let gSaveTimerId: number | null = null;

function formatElapsed(_ms: number): string {
    const sec = Math.floor(_ms / 1000);
    if (sec < 60) return `${sec}초 전 저장됨`;
    return `${Math.floor(sec / 60)}분 전 저장됨`;
}

function tickSaveStatus(): void {
    if (gLastSaveTime === null || !statusEl) return;
    statusEl.textContent = formatElapsed(Date.now() - gLastSaveTime);
}

function startSaveTimer(): void {
    gLastSaveTime = Date.now();
    tickSaveStatus();
    if (gSaveTimerId === null) gSaveTimerId = window.setInterval(tickSaveStatus, 1000);
}

function stopSaveTimer(): void {
    if (gSaveTimerId !== null) { window.clearInterval(gSaveTimerId); gSaveTimerId = null; }
    gLastSaveTime = null;
}

function showToolbar(): void {
    if (refreshBtn) refreshBtn.style.display = "inline-block";
    if (saveBtn && gWritable) saveBtn.style.display = "inline-block";
}

function bindToolbarOnce(): void {
    if (gToolbarBound) return;
    gToolbarBound = true;
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            if (gMode === "sheet") saveSheetFile();
            else if (gEditor) saveFile(gEditor);
        });
    }
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => { void refreshFile(); });
    }
}

async function uploadFile(_base64: string) {
    if (!gPath) { if (statusEl) statusEl.textContent = "No path info, cannot save."; return; }
    const dirEnd = gPath.lastIndexOf('/');
    const dir = gPath.slice(0, dirEnd + 1);
    const fileName = gPath.slice(dirEnd + 1);
    const token = getAuthToken(CPath.WebRootUrl());

    stopSaveTimer();
    if (statusEl) statusEl.textContent = "Saving...";
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'File/Upload',
            { path: dir, name: [fileName], data: [_base64], token }, 'json') as any;
        if (j.ok) { startSaveTimer(); sendDirty(false); }
        else if (statusEl) statusEl.textContent = `Save failed: ${j.msg ?? ''}`;
    } catch (e: any) {
        if (statusEl) statusEl.textContent = `Save failed: ${e.message}`;
    }
}

async function saveFile(editor: any) {
    await uploadFile(btoa(unescape(encodeURIComponent(editor.getValue()))));
}

// 시트(csv/xlsx/xls) 편집 상태. CModalUtil.ts의 CSheetViewer 파싱/직렬화 로직과 동일한 방식이나,
// 해당 로직이 CSheetViewer의 private 메서드라 재사용할 수 없어 여기서 최소 형태로 다시 구현한다.
let gSheetData: CSheetData = null;
let gSheetExt = '';

function parseCSVLine(_line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < _line.length; i++) {
        const ch = _line[i];
        if (ch === '"') {
            if (inQuote && _line[i + 1] === '"') { cur += '"'; i++; }
            else inQuote = !inQuote;
        }
        else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
        else cur += ch;
    }
    result.push(cur);
    return result;
}

function serializeCSV(_rows: any[][]): string {
    return _rows.map(row =>
        row.map(cell => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n'))
                return '"' + str.replace(/"/g, '""') + '"';
            return str;
        }).join(',')
    ).join('\r\n');
}

function applySheetAction(_action: string, _payload: any): void {
    if (!gSheetData) return;
    switch (_action) {
        case 'update': {
            const sheet = gSheetData.find(s => s.name === _payload.sheet);
            if (!sheet) break;
            const rowIdx = _payload.row + 1;
            if (!sheet.rows[rowIdx]) sheet.rows[rowIdx] = [];
            sheet.rows[rowIdx][_payload.col] = _payload.value;
            break;
        }
        case 'insert': {
            const sheet = gSheetData.find(s => s.name === _payload.sheet);
            if (sheet) sheet.rows.splice(_payload.row + 1, 0, _payload.values);
            break;
        }
        case 'delete': {
            const sheet = gSheetData.find(s => s.name === _payload.sheet);
            if (sheet) sheet.rows.splice(_payload.row + 1, 1);
            break;
        }
        case 'alter': {
            const sheet = gSheetData.find(s => s.name === _payload.sheet);
            if (!sheet) break;
            if (!sheet.rows[0]) sheet.rows[0] = [];
            sheet.rows[0][_payload.col] = _payload.name;
            break;
        }
        case 'insertSheet':
            gSheetData.splice(_payload.index, 0, { name: _payload.name, rows: [['']] });
            break;
        case 'deleteSheet': {
            const idx = gSheetData.findIndex(s => s.name === _payload.name);
            if (idx >= 0) gSheetData.splice(idx, 1);
            break;
        }
    }
}

async function saveSheetFile() {
    if (!gSheetData) return;
    let base64: string;
    if (gSheetExt === 'csv') {
        base64 = btoa(unescape(encodeURIComponent(serializeCSV(gSheetData[0]?.rows ?? []))));
    } else {
        const XLSX = (window as any)["XLSX"];
        if (!XLSX) { if (statusEl) statusEl.textContent = "xlsx library not loaded."; return; }
        const wb = XLSX.utils.book_new();
        gSheetData.forEach(sheet => {
            const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
            XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        });
        base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    }
    await uploadFile(base64);
}

async function loadSheetData(ext: string): Promise<CSheetData> {
    const res = await fetch(gUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();

    if (ext === 'csv') {
        const str = CUtil.ArrayToString(buf);
        const lines = str.split(/\r?\n/).filter(l => l.trim());
        return [{ name: 'Sheet1', rows: lines.map(l => parseCSVLine(l)) }];
    }

    const XLSX = (window as any)["XLSX"];
    if (!XLSX) throw new Error("xlsx library not loaded.");
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    return (wb.SheetNames as string[]).map((name: string) => {
        const sheet = wb.Sheets[name];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        return { name, rows };
    });
}

async function mainSheet(container: HTMLElement, ext: string, writable: boolean) {
    gMode = "sheet";
    gContainer = container;
    gExt = ext;
    gWritable = writable;

    let data: CSheetData;
    try {
        data = await loadSheetData(ext);
    } catch (e: any) {
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

async function refreshFile(): Promise<void> {
    if (!gUrl || !gMode) return;
    if (gDirty && !confirm("저장되지 않은 변경이 있습니다. 서버 내용으로 덮어쓸까요?")) return;

    if (statusEl) statusEl.textContent = "Refreshing...";
    try {
        if (gMode === "text" && gEditor) {
            const res = await fetch(gUrl, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const source = await res.text();
            gSuppressDirty = true;
            gEditor.setValue(source);
            gSuppressDirty = false;
            sendDirty(false);
            stopSaveTimer();
            if (statusEl) statusEl.textContent = "Refreshed";
            return;
        }

        if (gMode === "sheet" && gContainer) {
            await mainSheet(gContainer, gExt, gWritable);
            sendDirty(false);
            stopSaveTimer();
            if (statusEl) statusEl.textContent = "Refreshed";
        }
    } catch (e: any) {
        gSuppressDirty = false;
        if (statusEl) statusEl.textContent = `Refresh failed: ${e.message}`;
    }
}

async function main() {
    const container = CDOM.ID("editor-body");
    if (!gUrl) { container.textContent = "No file specified."; return; }

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
    let source: string;
    try {
        const res = await fetch(gUrl, { cache: "no-store" });
        if (!res.ok) { container.textContent = `Failed to load file: HTTP ${res.status}`; return; }
        source = await res.text();
    } catch (e: any) {
        container.textContent = `Failed to load file: ${e.message}`;
        return;
    }

    const language = CUtilWeb.sMonacoExtToLang[ext] ?? "plaintext";

    CUtilWeb.MonacoEditer(container, source, language, "vs-dark", (editor) => {
        gEditor = editor;
        editor?.updateOptions({ readOnly: !writable });
        bindToolbarOnce();
        showToolbar();
        if (!writable) return;

        const monacoNs = (window as any)["monaco"];
        editor.addCommand(monacoNs.KeyMod.CtrlCmd | monacoNs.KeyCode.KeyS, () => saveFile(editor));
        editor.onDidChangeModelContent(() => {
            if (!gSuppressDirty) sendDirty(true);
        });
    }, false, gUrl);
}
main();
