import { CDOM } from "../../basic/CDOM.js";
import { CString } from "../../basic/CString.js";
import { CUtil } from "../../basic/CUtil.js";
import { CUtilWeb, CSheetData } from "../../util/CUtilWeb.js";
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

async function uploadFile(_base64: string) {
    if (!gPath) { if (statusEl) statusEl.textContent = "No path info, cannot save."; return; }
    const dirEnd = gPath.lastIndexOf('/');
    const dir = gPath.slice(0, dirEnd + 1);
    const fileName = gPath.slice(dirEnd + 1);
    const token = getAuthToken(CPath.WebRootUrl());

    if (statusEl) statusEl.textContent = "Saving...";
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'File/Upload',
            { path: dir, name: [fileName], data: [_base64], token }, 'json') as any;
        if (statusEl) statusEl.textContent = j.ok ? "Saved" : `Save failed: ${j.msg ?? ''}`;
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

async function mainSheet(container: HTMLElement, ext: string, writable: boolean) {
    let buf: ArrayBuffer;
    try {
        const res = await fetch(gUrl);
        if (!res.ok) { container.textContent = `Failed to load file: HTTP ${res.status}`; return; }
        buf = await res.arrayBuffer();
    } catch (e: any) {
        container.textContent = `Failed to load file: ${e.message}`;
        return;
    }

    let data: CSheetData;
    if (ext === 'csv') {
        const str = CUtil.ArrayToString(buf);
        const lines = str.split(/\r?\n/).filter(l => l.trim());
        data = [{ name: 'Sheet1', rows: lines.map(l => parseCSVLine(l)) }];
    } else {
        const XLSX = (window as any)["XLSX"];
        if (!XLSX) {
            container.textContent = "xlsx 라이브러리가 로드되지 않았습니다.";
            return;
        }
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        data = (wb.SheetNames as string[]).map((name: string) => {
            const sheet = wb.Sheets[name];
            const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            return { name, rows };
        });
    }

    gSheetData = data;
    gSheetExt = ext;

    CUtilWeb.SheetEditor(container, data, writable, (_action, _payload) => applySheetAction(_action, _payload));

    if (writable && saveBtn) {
        saveBtn.style.display = "inline-block";
        saveBtn.addEventListener("click", () => saveSheetFile());
    }
}

async function main() {
    const container = CDOM.ID("editor-body");
    if (!gUrl) { container.textContent = "No file specified."; return; }

    const { ext } = CString.ExtCut(gPath || gUrl);
    const writable = await canWrite();

    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        await mainSheet(container, ext, writable);
        return;
    }

    let source: string;
    try {
        const res = await fetch(gUrl);
        if (!res.ok) { container.textContent = `Failed to load file: HTTP ${res.status}`; return; }
        source = await res.text();
    } catch (e: any) {
        container.textContent = `Failed to load file: ${e.message}`;
        return;
    }

    const language = languageMap[ext] ?? "plaintext";

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
