import { CFecth } from "../../network/CFecth.js";
import { CConfirm } from "../../basic/CModal.js";
import { CAlert } from "../../basic/CAlert.js";
import { CLan } from "../../basic/CLan.js";
import { CIframeMsg } from "./CIframeMsg.js";
import { CUtilWeb } from "../../util/CUtilWeb.js";
const _memoTheme = CUtilWeb.Parameter("theme");
if (_memoTheme)
    document.documentElement.setAttribute('data-bs-theme', _memoTheme);
function L(_key, _def) {
    return CLan.Get(_key, _def) ?? _def;
}
function RegisterMemoLan() {
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
function ApplyMemoLan(_root = document) {
    _root.querySelectorAll('[data-CLan]').forEach(el => {
        const key = el.getAttribute('data-CLan');
        if (!key)
            return;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            const t = CLan.Get(key, el.placeholder);
            if (t != null)
                el.placeholder = t;
        }
        else {
            const t = CLan.Get(key, el.innerHTML);
            if (t != null)
                el.innerHTML = t;
        }
    });
    _root.querySelectorAll('[data-CLan-title]').forEach(el => {
        const key = el.getAttribute('data-CLan-title');
        if (!key)
            return;
        const t = CLan.Get(key, el.title);
        if (t != null)
            el.title = t;
    });
}
function El(_id) {
    return document.getElementById(_id);
}
function EscapeHtml(_s) {
    const div = document.createElement('div');
    div.textContent = _s;
    return div.innerHTML;
}
let memoApiBaseUrl = '';
let memoApiToken = '';
function AppendParam(_path, _data, _key, _value) {
    if (_data === null) {
        const sep = _path.includes('?') ? '&' : '?';
        return { path: `${_path}${sep}${_key}=${encodeURIComponent(_value)}`, data: null };
    }
    return { path: _path, data: { ..._data, [_key]: _value } };
}
function InjectRemote(_path, _data) {
    if (!memoApiBaseUrl || !_path.startsWith('Memo/'))
        return { path: _path, data: _data };
    const absPath = memoApiBaseUrl.replace(/\/+$/, '') + '/' + _path.replace(/^\/+/, '');
    return memoApiToken ? AppendParam(absPath, _data, 'token', memoApiToken) : { path: absPath, data: _data };
}
function ExtractHttpStatus(_err) {
    const m = String(_err?.message || '').match(/status:\s*(\d+)/);
    return m ? Number(m[1]) : null;
}
async function ApiExe(_path, _data, _returnType = "json") {
    const { path, data } = InjectRemote(_path, _data);
    try {
        return await CFecth.Exe(path, data, _returnType);
    }
    catch (e) {
        const status = ExtractHttpStatus(e);
        if (status === 401) {
            if (memoApiBaseUrl) {
                CAlert.E(L('memo.msg.remoteNotAuthed', 'Not authenticated on the remote server. Authenticate it from the File Manager (Chat/Terminal/Memo) first.'));
            }
        }
        else if (status !== 404) {
            CAlert.E(L('memo.msg.requestFailed', 'Request failed ({status}): {path}')
                .replace('{status}', String(status ?? 'network error')).replace('{path}', _path.split('?')[0]));
        }
        throw e;
    }
}
const connectScreenEl = El("connect-screen");
const mainScreenEl = El("main-screen");
const editorScreenEl = El("memo-editor");
const listScreenEl = El("memo-list");
const currentKeyLabelEl = El("currentKeyLabel");
const currentKeyInputEl = El("currentKeyInput");
let currentScreen = 'connect';
let currentKey = '';
let currentPassword = '';
function SetVisible(_el, _visible, _layoutClass = 'd-flex') {
    _el.classList.toggle('d-none', !_visible);
    if (_layoutClass)
        _el.classList.toggle(_layoutClass, _visible);
}
function FormatNowKey() {
    const d = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${pad(d.getMilliseconds(), 3)}`;
}
function ShowConnectScreen() {
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
    if (!connectKeyInputEl.value)
        connectKeyInputEl.value = FormatNowKey();
    setTimeout(() => { connectKeyInputEl.focus(); connectKeyInputEl.select(); }, 50);
    LoadConnectKeys();
}
function ShowEditorScreen() {
    currentScreen = 'editor';
    SetVisible(connectScreenEl, false);
    SetVisible(mainScreenEl, true);
    SetVisible(listScreenEl, false, null);
    SetVisible(editorScreenEl, true);
    setTimeout(() => editorTextEl.focus(), 50);
}
async function ShowListScreen() {
    FlushSave();
    currentScreen = 'list';
    SetVisible(connectScreenEl, false);
    SetVisible(mainScreenEl, true);
    SetVisible(editorScreenEl, false);
    SetVisible(listScreenEl, true, null);
    await LoadList();
}
const connectKeyInputEl = El("connectKeyInput");
const connectPwInputEl = El("connectPwInput");
const connectMsgEl = El("connectMsg");
const connectBtnEl = El("connectBtn");
function ApplyKey(_key, _password) {
    currentKey = _key;
    currentPassword = _password;
    currentKeyLabelEl.textContent = _key;
    currentId = null;
    editorTextEl.value = '';
    lastSavedText = '';
    saveStatusEl.textContent = '';
}
async function ConnectWithKey(_key) {
    connectBtnEl.disabled = true;
    connectMsgEl.textContent = '';
    const password = connectPwInputEl.value;
    try {
        const j = await ApiExe("Memo/Connect", { key: _key, password }, "json");
        if (j?.ok) {
            ApplyKey(j.key, password);
            connectPwInputEl.value = '';
            await OpenLatestOrNew();
        }
        else {
            connectMsgEl.textContent = j?.msg || L('memo.msg.failConnect', 'Connect failed');
        }
    }
    catch {
        connectMsgEl.textContent = L('memo.msg.networkError', 'Network error');
    }
    connectBtnEl.disabled = false;
}
function DoConnect() {
    return ConnectWithKey(connectKeyInputEl.value.trim());
}
connectBtnEl.addEventListener('click', DoConnect);
connectKeyInputEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter')
        DoConnect();
});
connectPwInputEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter')
        DoConnect();
});
const connectKeysListEl = El("connectKeysList");
async function LoadConnectKeys() {
    connectKeysListEl.innerHTML = '';
    try {
        const j = await ApiExe("Memo/Keys", null, "json");
        const keys = (j?.ok ? j.data : []);
        connectKeysListEl.innerHTML = keys.map(k => `<div class="connect-key-item" data-key="${EscapeHtml(k)}">${EscapeHtml(k)}</div>`).join('');
    }
    catch { }
}
connectKeysListEl.addEventListener('click', (ev) => {
    const row = ev.target.closest('[data-key]');
    if (!row)
        return;
    ConnectWithKey(row.dataset.key);
});
function StartKeyEdit() {
    currentKeyInputEl.value = currentKey;
    currentKeyLabelEl.classList.add('d-none');
    currentKeyInputEl.classList.remove('d-none');
    currentKeyInputEl.focus();
    currentKeyInputEl.select();
}
function EndKeyEdit() {
    currentKeyInputEl.classList.add('d-none');
    currentKeyLabelEl.classList.remove('d-none');
}
async function ConfirmKeyEdit() {
    const newKey = currentKeyInputEl.value.trim();
    EndKeyEdit();
    if (!newKey || newKey === currentKey)
        return;
    FlushSave();
    try {
        const j = await ApiExe("Memo/Rename", { key: currentKey, newKey }, "json");
        if (j?.ok) {
            currentKey = j.key;
            currentKeyLabelEl.textContent = currentKey;
            if (currentScreen === 'list')
                await LoadList();
        }
        else {
            currentKeyInputEl.value = currentKey;
        }
    }
    catch {
        currentKeyInputEl.value = currentKey;
    }
}
currentKeyLabelEl.addEventListener('click', StartKeyEdit);
currentKeyInputEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter')
        currentKeyInputEl.blur();
    else if (ev.key === 'Escape') {
        currentKeyInputEl.value = currentKey;
        currentKeyInputEl.blur();
    }
});
currentKeyInputEl.addEventListener('blur', ConfirmKeyEdit);
const editorTextEl = El("editorText");
const saveStatusEl = El("saveStatus");
let currentId = null;
let lastSavedText = '';
let saveTimer = null;
const AUTOSAVE_DELAY_MS = 8000;
function ScheduleSave() {
    if (saveTimer != null) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    if (editorTextEl.value === lastSavedText) {
        saveStatusEl.textContent = '';
        return;
    }
    saveStatusEl.textContent = L('memo.status.editing', 'Editing...');
    saveTimer = window.setTimeout(DoSave, AUTOSAVE_DELAY_MS);
}
async function DoSave() {
    saveTimer = null;
    const text = editorTextEl.value;
    if (text === lastSavedText)
        return;
    if (text.trim().length === 0) {
        saveStatusEl.textContent = '';
        return;
    }
    saveStatusEl.textContent = L('memo.status.saving', 'Saving...');
    try {
        const j = await ApiExe("Memo/Save", { key: currentKey, id: currentId, text, password: currentPassword }, "json");
        if (j?.ok) {
            currentId = j.data.id;
            lastSavedText = text;
            saveStatusEl.textContent = L('memo.status.saved', 'Saved');
        }
        else {
            saveStatusEl.textContent = j?.msg || L('memo.msg.failSave', 'Save failed');
        }
    }
    catch {
        saveStatusEl.textContent = L('memo.msg.failSave', 'Save failed');
    }
}
function FlushSave() {
    if (saveTimer != null) {
        clearTimeout(saveTimer);
        saveTimer = null;
        DoSave();
    }
}
editorTextEl.addEventListener('input', ScheduleSave);
async function OpenMemo(_id) {
    try {
        const j = await ApiExe(`Memo/Get?key=${encodeURIComponent(currentKey)}&id=${encodeURIComponent(_id)}&password=${encodeURIComponent(currentPassword)}`, null, "json");
        if (j?.ok) {
            currentId = j.data.id;
            editorTextEl.value = j.data.content;
            lastSavedText = j.data.content;
            saveStatusEl.textContent = '';
            ShowEditorScreen();
        }
    }
    catch { }
}
function OpenNewMemo() {
    currentId = null;
    editorTextEl.value = '';
    lastSavedText = '';
    saveStatusEl.textContent = '';
    ShowEditorScreen();
}
async function OpenLatestOrNew() {
    try {
        const j = await ApiExe(`Memo/List?key=${encodeURIComponent(currentKey)}&password=${encodeURIComponent(currentPassword)}`, null, "json");
        const data = (j?.ok ? j.data : []);
        if (data.length > 0) {
            await OpenMemo(data[0].id);
            return;
        }
    }
    catch { }
    OpenNewMemo();
}
const memoListItemsEl = El("memoListItems");
const memoListEmptyEl = El("memoListEmpty");
const memoNewItemEl = El("memoNewItem");
function FormatDate(_ms) {
    const d = new Date(_ms);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
async function LoadList() {
    try {
        const j = await ApiExe(`Memo/List?key=${encodeURIComponent(currentKey)}&password=${encodeURIComponent(currentPassword)}`, null, "json");
        const data = (j?.ok ? j.data : []);
        memoListEmptyEl.style.display = data.length === 0 ? 'block' : 'none';
        memoListItemsEl.innerHTML = data.map(m => `
            <div class="memo-list-item" data-id="${EscapeHtml(m.id)}">
                <div class="memo-preview">${EscapeHtml(m.preview) || '&nbsp;'}</div>
                <div class="memo-date">${FormatDate(m.date)}</div>
            </div>
        `).join('');
    }
    catch { }
}
memoListItemsEl.addEventListener('click', (ev) => {
    const row = ev.target.closest('[data-id]');
    if (!row)
        return;
    OpenMemo(row.dataset.id);
});
memoNewItemEl.addEventListener('click', OpenNewMemo);
function ConfirmDelete() {
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
async function DoDelete() {
    if (currentScreen !== 'editor' || !currentId) {
        CAlert.E(L('memo.msg.nothingToDelete', 'Nothing to delete.'));
        return;
    }
    const ok = await ConfirmDelete();
    if (!ok)
        return;
    if (saveTimer != null) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    try {
        const j = await ApiExe("Memo/Delete", { key: currentKey, id: currentId, password: currentPassword }, "json");
        if (j?.ok) {
            currentId = null;
            editorTextEl.value = '';
            lastSavedText = '';
            saveStatusEl.textContent = '';
            await ShowListScreen();
        }
        else {
            CAlert.E(j?.msg || L('memo.msg.failDelete', 'Delete failed'));
        }
    }
    catch { }
}
El("topConnectBtn").addEventListener('click', ShowConnectScreen);
El("topListBtn").addEventListener('click', ShowListScreen);
El("topDeleteBtn").addEventListener('click', DoDelete);
CIframeMsg.Recv({
    'set-remote': (data) => {
        const baseUrl = String(data.baseUrl ?? '');
        const token = String(data.token ?? '');
        if (baseUrl === memoApiBaseUrl)
            return;
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
document.addEventListener('keydown', (ev) => {
    if (['F1', 'F2', 'F3', 'F4', 'F7'].includes(ev.key)) {
        if (window.top)
            CIframeMsg.Send(window.top, 'home-hotkey', { key: ev.key, shift: ev.shiftKey });
    }
});
ShowConnectScreen();
