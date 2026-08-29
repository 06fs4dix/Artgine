import { CFecth } from "../../network/CFecth.js";
import { CModal, CConfirm } from "../../basic/CModal.js";
import { CAlert } from "../../basic/CAlert.js";
import { CLan } from "../../basic/CLan.js";
import { CIframeMsg } from "./CIframeMsg.js";
import { CUtilWeb } from "../../util/CUtilWeb.js";
import { CStorage } from "../../system/CStorage.js";

// Control.html이 iframe으로 열 때 자신의 현재 테마(light/dark)를 함께 넘겨준다.
// 값이 없으면(단독 접속 등) 기존과 동일하게 아무 것도 건드리지 않는다(기본 Bootstrap 라이트 모습).
const _memoTheme = CUtilWeb.Parameter("theme");
if (_memoTheme) document.documentElement.setAttribute('data-bs-theme', _memoTheme);

// ==================================================================================================================
// 다국어(CLan) - 기본 텍스트는 영문(HTML innerHTML/placeholder, 코드 내 기본값)이고 한국어만 추가 등록한다.
// 미등록 언어/키는 원문(영문)으로 폴백되므로 안전하다(CUtil.Language()로 브라우저 언어 자동감지).
// ==================================================================================================================
function L(_key: string, _def: string): string {
    return CLan.Get(_key, _def) ?? _def;
}

function RegisterMemoLan(): void {
    const ko = CLan.eType.ko;
    CLan.Set(ko, "memo.auth.title", "인증");
    CLan.Set(ko, "memo.auth.pwPlaceholder", "비밀번호");
    CLan.Set(ko, "memo.auth.signIn", "로그인");
    CLan.Set(ko, "memo.connect.title", "메모");
    CLan.Set(ko, "memo.connect.keyPlaceholder", "키 (비워두면 랜덤 발급)");
    CLan.Set(ko, "memo.connect.pwPlaceholder", "암호 (선택, 아직 미사용)");
    CLan.Set(ko, "memo.connect.go", "접속");
    CLan.Set(ko, "memo.top.connect", "접속");
    CLan.Set(ko, "memo.top.list", "리스트");
    CLan.Set(ko, "memo.top.delete", "삭제");
    CLan.Set(ko, "memo.key.editTitle", "클릭해서 키 변경");
    CLan.Set(ko, "memo.editor.placeholder", "메모를 입력하세요...");
    CLan.Set(ko, "memo.list.new", "새 메모");
    CLan.Set(ko, "memo.list.empty", "아직 메모가 없습니다.");
    CLan.Set(ko, "memo.status.editing", "입력 중...");
    CLan.Set(ko, "memo.status.saving", "저장 중...");
    CLan.Set(ko, "memo.status.saved", "저장됨");
    CLan.Set(ko, "memo.msg.failConnect", "접속 실패");
    CLan.Set(ko, "memo.msg.failSave", "저장 실패");
    CLan.Set(ko, "memo.msg.failDelete", "삭제 실패");
    CLan.Set(ko, "memo.msg.failLoad", "불러오기 실패");
    CLan.Set(ko, "memo.msg.networkError", "네트워크 오류");
    CLan.Set(ko, "memo.msg.requestFailed", "요청 실패 ({status}): {path}");
    CLan.Set(ko, "memo.msg.remoteNotAuthed", "원격 서버에 인증되어 있지 않습니다. 파일 관리자(Chat/Terminal/Memo)에서 먼저 인증하세요.");
    CLan.Set(ko, "memo.confirm.delete", "이 메모를 삭제하시겠습니까?");
    CLan.Set(ko, "memo.confirm.deleteYes", "삭제");
    CLan.Set(ko, "memo.confirm.deleteNo", "취소");
    CLan.Set(ko, "memo.msg.nothingToDelete", "삭제할 메모가 없습니다.");
}

// data-CLan(본문/placeholder) + data-CLan-title(title 속성) 요소에 현재 언어 번역을 적용한다.
// 기존 내용을 기본값으로 쓰므로 미등록 키/언어는 원문(영문)이 그대로 유지된다.
function ApplyMemoLan(_root: ParentNode = document): void {
    _root.querySelectorAll<HTMLElement>('[data-CLan]').forEach(el => {
        const key = el.getAttribute('data-CLan');
        if (!key) return;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            const t = CLan.Get(key, el.placeholder);
            if (t != null) el.placeholder = t;
        } else {
            const t = CLan.Get(key, el.innerHTML);
            if (t != null) el.innerHTML = t;
        }
    });
    _root.querySelectorAll<HTMLElement>('[data-CLan-title]').forEach(el => {
        const key = el.getAttribute('data-CLan-title');
        if (!key) return;
        const t = CLan.Get(key, el.title);
        if (t != null) el.title = t;
    });
}

// 요청에 따라 항상 영어로만 보여준다 - 한국어 등록/적용을 하지 않으면 HTML/코드의 영문 기본값이 그대로 쓰인다.
// (RegisterMemoLan/ApplyMemoLan은 나중에 다시 켤 수 있도록 남겨둔다)

interface MemoRecord { id: string; preview: string; date: number; }
interface MemoFull extends MemoRecord { content: string; }

function El<T extends HTMLElement = HTMLElement>(_id: string): T {
    return document.getElementById(_id) as T;
}

function EscapeHtml(_s: string): string {
    const div = document.createElement('div');
    div.textContent = _s;
    return div.innerHTML;
}

// ==================================================================================================================
// API 호출 (원격 서버 라우팅 - Home.ts가 RDP/File 탭에서 원격지가 바뀔 때마다 postMessage('set-remote')로 알려준다)
// ==================================================================================================================
let memoApiBaseUrl = '';
let memoApiToken = '';

function AppendParam(_path: string, _data: object | null, _key: string, _value: string): { path: string; data: object | null } {
    if (_data === null) {
        const sep = _path.includes('?') ? '&' : '?';
        return { path: `${_path}${sep}${_key}=${encodeURIComponent(_value)}`, data: null };
    }
    return { path: _path, data: { ..._data, [_key]: _value } };
}

function InjectRemote(_path: string, _data: object | null): { path: string; data: object | null } {
    if (!memoApiBaseUrl || !_path.startsWith('Memo/')) return { path: _path, data: _data };
    const absPath = memoApiBaseUrl.replace(/\/+$/, '') + '/' + _path.replace(/^\/+/, '');
    return memoApiToken ? AppendParam(absPath, _data, 'token', memoApiToken) : { path: absPath, data: _data };
}

function ExtractHttpStatus(_err: any): number | null {
    const m = String(_err?.message || '').match(/status:\s*(\d+)/);
    return m ? Number(m[1]) : null;
}

async function ApiExe(_path: string, _data: object | null, _returnType: "text" | "json" = "json"): Promise<any> {
    const { path, data } = InjectRemote(_path, _data);
    try {
        return await CFecth.Exe(path, data, _returnType);
    } catch (e: any) {
        const status = ExtractHttpStatus(e);
        if (status === 401) {
            // 메모 페이지는 로그인 없이 열리지만, 원격(RDP/File 탭에서 전환된) 서버로 라우팅된 요청은
            // 그 원격 서버 자체의 인증이 별도로 필요할 수 있다.
            if (memoApiBaseUrl) {
                CAlert.E(L('memo.msg.remoteNotAuthed', 'Not authenticated on the remote server. Authenticate it from the File Manager (Chat/Terminal/Memo) first.'));
            }
        } else if (status !== 404) {
            CAlert.E(L('memo.msg.requestFailed', 'Request failed ({status}): {path}')
                .replace('{status}', String(status ?? 'network error')).replace('{path}', _path.split('?')[0]));
        }
        throw e;
    }
}

// ==================================================================================================================
// 화면 전환
// ==================================================================================================================
const connectScreenEl = El<HTMLDivElement>("connect-screen");
const mainScreenEl = El<HTMLDivElement>("main-screen");
const editorScreenEl = El<HTMLDivElement>("memo-editor");
const listScreenEl = El<HTMLDivElement>("memo-list");
const currentKeyLabelEl = El("currentKeyLabel");
const currentKeyInputEl = El<HTMLInputElement>("currentKeyInput");

type Screen = 'connect' | 'editor' | 'list';
let currentScreen: Screen = 'connect';
let currentKey = '';
// 비밀번호는 서버에 저장되지 않는다 - 연결된 동안 메모리에만 들고 있다가 요청마다 같이 보낸다.
// localStorage 등에는 절대 저장하지 않고, 탭을 새로고침하면 다시 입력해야 한다.
let currentPassword = '';

// Bootstrap의 .d-flex/.d-none은 둘 다 !important라 inline style.display 토글로는 이길 수 없다
// (한번 .d-flex가 붙은 요소는 style.display='none'을 줘도 계속 flex로 보인다) -
// 그래서 표시 여부는 항상 .d-none과 레이아웃용 클래스(.d-flex 등)를 짝으로 함께 토글한다.
function SetVisible(_el: HTMLElement, _visible: boolean, _layoutClass: string | null = 'd-flex'): void {
    _el.classList.toggle('d-none', !_visible);
    if (_layoutClass) _el.classList.toggle(_layoutClass, _visible);
}

// 서버(CMemo.FormatDateTimeId)와 같은 형식(YYYYMMDDHHmmssSSS)으로 현재 시각을 만든다 -
// 키 입력창을 비워둔 채 접속하면 서버가 이 형식으로 새 키를 발급하므로, 입력창에도 미리 같은 형식으로 보여준다.
function FormatNowKey(): string {
    const d = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${pad(d.getMilliseconds(), 3)}`;
}

function ShowConnectScreen(): void {
    FlushSave();
    currentScreen = 'connect';
    currentKey = '';
    currentPassword = '';
    currentId = null;
    editorTextEl.value = '';
    lastSavedText = '';
    SetVisible(mainScreenEl, false);
    SetVisible(connectScreenEl, true);
    connectMsgEl.textContent = '';
    if (!connectKeyInputEl.value) connectKeyInputEl.value = FormatNowKey();
    setTimeout(() => { connectKeyInputEl.focus(); connectKeyInputEl.select(); }, 50);
    LoadConnectKeys();
}

function ShowEditorScreen(): void {
    currentScreen = 'editor';
    SetVisible(connectScreenEl, false);
    SetVisible(mainScreenEl, true);
    SetVisible(listScreenEl, false, null);
    SetVisible(editorScreenEl, true);
    setTimeout(() => editorTextEl.focus(), 50);
}

async function ShowListScreen(): Promise<void> {
    FlushSave();
    currentScreen = 'list';
    SetVisible(connectScreenEl, false);
    SetVisible(mainScreenEl, true);
    SetVisible(editorScreenEl, false);
    SetVisible(listScreenEl, true, null);
    await LoadList();
}

// ==================================================================================================================
// 접속
// ==================================================================================================================
const connectKeyInputEl = El<HTMLInputElement>("connectKeyInput");
const connectPwInputEl = El<HTMLInputElement>("connectPwInput");
const connectMsgEl = El("connectMsg");
const connectBtnEl = El<HTMLButtonElement>("connectBtn");

// 접속 성공 시 화면 전환 없이 상태만 그 key(+password)로 갈아끼운다 - 접속 화면(DoConnect)과
// 상단 바의 key 인라인 수정(StartKeyEdit 계열) 둘 다 여기로 모인다.
function ApplyKey(_key: string, _password: string): void {
    currentKey = _key;
    currentPassword = _password;
    currentKeyLabelEl.textContent = _key;
    currentId = null;
    editorTextEl.value = '';
    lastSavedText = '';
    saveStatusEl.textContent = '';
}

async function ConnectWithKey(_key: string): Promise<void> {
    connectBtnEl.disabled = true;
    connectMsgEl.textContent = '';
    const password = connectPwInputEl.value;
    try {
        const j = await ApiExe("Memo/Connect", { key: _key, password }, "json");
        if (j?.ok) {
            ApplyKey(j.key as string, password);
            connectPwInputEl.value = '';
            await OpenLatestOrNew();
        } else {
            connectMsgEl.textContent = j?.msg || L('memo.msg.failConnect', 'Connect failed');
        }
    } catch {
        connectMsgEl.textContent = L('memo.msg.networkError', 'Network error');
    }
    connectBtnEl.disabled = false;
}

function DoConnect(): Promise<void> {
    return ConnectWithKey(connectKeyInputEl.value.trim());
}

connectBtnEl.addEventListener('click', DoConnect);
connectKeyInputEl.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') DoConnect();
});
connectPwInputEl.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') DoConnect();
});

// 접속 화면에 지금까지 만들어진 key(폴더) 목록을 이름순으로 보여준다 - 클릭하면 그 key로 바로 접속.
const connectKeysListEl = El("connectKeysList");

async function LoadConnectKeys(): Promise<void> {
    connectKeysListEl.innerHTML = '';
    try {
        const j = await ApiExe("Memo/Keys", null, "json");
        const keys = (j?.ok ? j.data : []) as string[];
        connectKeysListEl.innerHTML = keys.map(k => `<div class="connect-key-item" data-key="${EscapeHtml(k)}">${EscapeHtml(k)}</div>`).join('');
    } catch { /* ApiExe가 이미 에러를 표시했다 */ }
}

connectKeysListEl.addEventListener('click', (ev: MouseEvent) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('[data-key]');
    if (!row) return;
    ConnectWithKey(row.dataset.key!);
});

// ==================================================================================================================
// 상단 바의 key 라벨 - 클릭하면 그 자리에서 바로 다른 key로 갈아탈 수 있다(접속 화면으로 돌아가지 않고).
// ==================================================================================================================
function StartKeyEdit(): void {
    currentKeyInputEl.value = currentKey;
    currentKeyLabelEl.classList.add('d-none');
    currentKeyInputEl.classList.remove('d-none');
    currentKeyInputEl.focus();
    currentKeyInputEl.select();
}

function EndKeyEdit(): void {
    currentKeyInputEl.classList.add('d-none');
    currentKeyLabelEl.classList.remove('d-none');
}

// 상단 바에서 key를 바꾸는 건 새 빈 공간으로 옮겨가는 게 아니라, 지금 key 폴더 자체의 이름을 바꾸는 것이다
// (안에 있던 메모들도 그대로 새 이름 폴더로 함께 이동한다) - 그래서 Connect가 아니라 Rename을 부르고,
// 편집 중이던 화면/내용(currentId, 에디터 텍스트 등)은 건드리지 않는다.
async function ConfirmKeyEdit(): Promise<void> {
    const newKey = currentKeyInputEl.value.trim();
    EndKeyEdit();
    if (!newKey || newKey === currentKey) return;
    FlushSave();
    try {
        const j = await ApiExe("Memo/Rename", { key: currentKey, newKey }, "json");
        if (j?.ok) {
            currentKey = j.key as string;
            currentKeyLabelEl.textContent = currentKey;
            if (currentScreen === 'list') await LoadList();
        } else {
            currentKeyInputEl.value = currentKey;
        }
    } catch { currentKeyInputEl.value = currentKey; }
}

currentKeyLabelEl.addEventListener('click', StartKeyEdit);
currentKeyInputEl.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') currentKeyInputEl.blur();
    else if (ev.key === 'Escape') { currentKeyInputEl.value = currentKey; currentKeyInputEl.blur(); }
});
currentKeyInputEl.addEventListener('blur', ConfirmKeyEdit);

// ==================================================================================================================
// 메모쓰기 (편집 + 8초 디바운스 자동저장)
// ==================================================================================================================
const editorTextEl = El<HTMLTextAreaElement>("editorText");
const saveStatusEl = El("saveStatus");

let currentId: string | null = null;
let lastSavedText = '';
let saveTimer: number | null = null;
const AUTOSAVE_DELAY_MS = 8000;

function ScheduleSave(): void {
    if (saveTimer != null) { clearTimeout(saveTimer); saveTimer = null; }
    if (editorTextEl.value === lastSavedText) { saveStatusEl.textContent = ''; return; }
    saveStatusEl.textContent = L('memo.status.editing', 'Editing...');
    saveTimer = window.setTimeout(DoSave, AUTOSAVE_DELAY_MS);
}

async function DoSave(): Promise<void> {
    saveTimer = null;
    const text = editorTextEl.value;
    if (text === lastSavedText) return;
    if (text.trim().length === 0) { saveStatusEl.textContent = ''; return; }
    saveStatusEl.textContent = L('memo.status.saving', 'Saving...');
    try {
        const j = await ApiExe("Memo/Save", { key: currentKey, id: currentId, text, password: currentPassword }, "json");
        if (j?.ok) {
            currentId = j.data.id;
            lastSavedText = text;
            saveStatusEl.textContent = L('memo.status.saved', 'Saved');
        } else {
            saveStatusEl.textContent = j?.msg || L('memo.msg.failSave', 'Save failed');
        }
    } catch {
        saveStatusEl.textContent = L('memo.msg.failSave', 'Save failed');
    }
}

// 화면 전환/탭 이탈 직전에 대기 중인 저장을 즉시 실행해 유실을 막는다.
function FlushSave(): void {
    if (saveTimer != null) {
        clearTimeout(saveTimer);
        saveTimer = null;
        DoSave();
    }
}

editorTextEl.addEventListener('input', ScheduleSave);

async function OpenMemo(_id: string): Promise<void> {
    try {
        const j = await ApiExe(`Memo/Get?key=${encodeURIComponent(currentKey)}&id=${encodeURIComponent(_id)}&password=${encodeURIComponent(currentPassword)}`, null, "json");
        if (j?.ok) {
            currentId = j.data.id;
            editorTextEl.value = j.data.content;
            lastSavedText = j.data.content;
            saveStatusEl.textContent = '';
            ShowEditorScreen();
        }
    } catch { /* ApiExe가 이미 에러를 표시했다 */ }
}

function OpenNewMemo(): void {
    currentId = null;
    editorTextEl.value = '';
    lastSavedText = '';
    saveStatusEl.textContent = '';
    ShowEditorScreen();
}

// 접속하면 매번 빈 화면이 아니라 그 key에서 가장 최근에 쓴 메모를 바로 열어준다 - 없으면(첫 접속 등) 새 메모.
async function OpenLatestOrNew(): Promise<void> {
    try {
        const j = await ApiExe(`Memo/List?key=${encodeURIComponent(currentKey)}&password=${encodeURIComponent(currentPassword)}`, null, "json");
        const data = (j?.ok ? j.data : []) as MemoRecord[];
        if (data.length > 0) {
            await OpenMemo(data[0].id);
            return;
        }
    } catch { /* ApiExe가 이미 에러를 표시했다 */ }
    OpenNewMemo();
}

// ==================================================================================================================
// 리스트
// ==================================================================================================================
const memoListItemsEl = El("memoListItems");
const memoListEmptyEl = El("memoListEmpty");
const memoNewItemEl = El("memoNewItem");

function FormatDate(_ms: number): string {
    const d = new Date(_ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function LoadList(): Promise<void> {
    try {
        const j = await ApiExe(`Memo/List?key=${encodeURIComponent(currentKey)}&password=${encodeURIComponent(currentPassword)}`, null, "json");
        const data = (j?.ok ? j.data : []) as MemoRecord[];
        memoListEmptyEl.style.display = data.length === 0 ? 'block' : 'none';
        memoListItemsEl.innerHTML = data.map(m => `
            <div class="memo-list-item" data-id="${EscapeHtml(m.id)}">
                <div class="memo-preview">${EscapeHtml(m.preview) || '&nbsp;'}</div>
                <div class="memo-date">${FormatDate(m.date)}</div>
            </div>
        `).join('');
    } catch { /* ApiExe가 이미 에러를 표시했다 */ }
}

memoListItemsEl.addEventListener('click', (ev: MouseEvent) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('[data-id]');
    if (!row) return;
    OpenMemo(row.dataset.id!);
});
memoNewItemEl.addEventListener('click', OpenNewMemo);

// ==================================================================================================================
// 삭제
// ==================================================================================================================
function ConfirmDelete(): Promise<boolean> {
    return new Promise(resolve => {
        const c = new CConfirm();
        c.SetBody(`<div>${EscapeHtml(L('memo.confirm.delete', 'Delete this memo?'))}</div>`);
        c.SetConfirm(CConfirm.eConfirm.YesNo, [
            () => resolve(true),
            () => resolve(false),
        ], [L('memo.confirm.deleteYes', 'Delete'), L('memo.confirm.deleteNo', 'Cancel')]);
        c.Open();
    });
}

async function DoDelete(): Promise<void> {
    if (currentScreen !== 'editor' || !currentId) {
        CAlert.E(L('memo.msg.nothingToDelete', 'Nothing to delete.'));
        return;
    }
    const ok = await ConfirmDelete();
    if (!ok) return;

    if (saveTimer != null) { clearTimeout(saveTimer); saveTimer = null; }
    try {
        const j = await ApiExe("Memo/Delete", { key: currentKey, id: currentId, password: currentPassword }, "json");
        if (j?.ok) {
            currentId = null;
            editorTextEl.value = '';
            lastSavedText = '';
            saveStatusEl.textContent = '';
            await ShowListScreen();
        } else {
            CAlert.E(j?.msg || L('memo.msg.failDelete', 'Delete failed'));
        }
    } catch { /* ApiExe가 이미 에러를 표시했다 */ }
}

// ==================================================================================================================
// 상단 바
// ==================================================================================================================
El<HTMLButtonElement>("topConnectBtn").addEventListener('click', ShowConnectScreen);
El<HTMLButtonElement>("topListBtn").addEventListener('click', ShowListScreen);
El<HTMLButtonElement>("topDeleteBtn").addEventListener('click', DoDelete);

// ==================================================================================================================
// 부모(Control/Home) 프레임 메시지
// - 'set-remote': RDP/File 탭에서 원격지가 전환되면 알려준다. 원격이 바뀌면 그 서버의 db/Memo는
//   전혀 다른 공간이므로, 지금 열려있던 key/메모를 그대로 들고 있으면 혼란스럽다 - 접속 화면으로 되돌린다.
// - 'set-folder': 파일 매니저가 현재 작업 폴더 경로를 보내는 것 - key 입력창에 미리 채워만 주고
//   자동 접속은 하지 않는다(실수로 다른 공간에 붙는 것을 방지, 기존 folder 입력과 동일한 패턴).
// ==================================================================================================================
CIframeMsg.Recv({
    'set-remote': (data) => {
        const baseUrl = String(data.baseUrl ?? '');
        const token = String(data.token ?? '');
        if (baseUrl === memoApiBaseUrl) return;
        memoApiBaseUrl = baseUrl;
        memoApiToken = token;
        ShowConnectScreen();
    },
    'set-folder': (data) => {
        connectKeyInputEl.value = String(data.folder ?? '');
        ShowConnectScreen();
        setTimeout(() => { connectKeyInputEl.focus(); connectKeyInputEl.select(); }, 50);
    },
});

// F1~F4/F7은 상위 화면(Home/Control)의 단축키이므로 여기서 소비하지 않고 부모로 위임한다.
document.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (['F1', 'F2', 'F3', 'F4', 'F7'].includes(ev.key)) {
        if (window.top) CIframeMsg.Send(window.top, 'home-hotkey', { key: ev.key, shift: ev.shiftKey });
    }
});

// 메모 페이지는 로그인 없이 바로 접속 화면부터 시작한다(사이트 전체 로그인과 무관).
ShowConnectScreen();
