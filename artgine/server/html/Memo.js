import { CFecth } from "../../network/CFecth.js";
import { CModal, CConfirm } from "../../basic/CModal.js";
import { CAlert } from "../../basic/CAlert.js";
import { CHash } from "../../basic/CHash.js";
import { CLan } from "../../basic/CLan.js";
import { CIframeMsg } from "./CIframeMsg.js";
import { CUtilWeb } from "../../util/CUtilWeb.js";
import { CStorage } from "../../system/CStorage.js";
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
    CLan.Set(ko, "memo.folder.placeholder", "폴더 경로 (예: proj/2D/Village)");
    CLan.Set(ko, "memo.addCategory", "카테고리 추가");
    CLan.Set(ko, "memo.deselect", "선택 해제");
    CLan.Set(ko, "memo.deselect.title", "선택 해제 - Search/Delete가 전체 카테고리를 대상으로 동작합니다");
    CLan.Set(ko, "memo.tab.category", "카테고리");
    CLan.Set(ko, "memo.tab.message", "메시지");
    CLan.Set(ko, "memo.search.category", "카테고리 검색...");
    CLan.Set(ko, "memo.search.message", "메시지 검색...");
    CLan.Set(ko, "memo.sidebarToggle.title", "사이드바 토글 (Tab)");
    CLan.Set(ko, "memo.mode.title", "입력창에 /w, /s, /d를 입력해도 전환됩니다");
    CLan.Set(ko, "memo.mode.write", "쓰기 /w");
    CLan.Set(ko, "memo.mode.search", "검색 /s /r");
    CLan.Set(ko, "memo.mode.delete", "삭제 /d");
    CLan.Set(ko, "memo.mode.move", "이동 /m");
    CLan.Set(ko, "memo.help.title", "도움말");
    CLan.Set(ko, "memo.empty.noCategory", "선택된 카테고리가 없습니다. 쓰려면 카테고리를 선택하거나, 전체를 대상으로 Search/Delete를 사용하세요.");
    CLan.Set(ko, "memo.composer.placeholder", "메모... #태그");
    CLan.Set(ko, "memo.empty.writeHint", "메모를 작성해 시작하세요.");
    CLan.Set(ko, "memo.cat.emptyHint", "아직 카테고리가 없습니다. 위에서 추가하세요.");
    CLan.Set(ko, "memo.time.empty", "아직 메모가 없습니다.");
    CLan.Set(ko, "memo.confirm.deleteCatMulti", `"{name}" 및 하위 카테고리 {n}개(내부 메모 포함)가 모두 삭제됩니다. 계속하시겠습니까?`);
    CLan.Set(ko, "memo.confirm.deleteCatSingle", `"{name}" 카테고리를 삭제하시겠습니까? (내부 메모도 함께 삭제됩니다)`);
    CLan.Set(ko, "memo.confirm.deleteData", "이 메모를 삭제하시겠습니까?");
    CLan.Set(ko, "memo.confirm.deleteDataId", "메모 @{id}를 삭제하시겠습니까?");
    CLan.Set(ko, "memo.confirm.deleteCandidates", "일치하는 메모 {n}건을 삭제하시겠습니까?\n\n{preview}");
    CLan.Set(ko, "memo.addCatModal.root", "-- 루트 (부모 없음) --");
    CLan.Set(ko, "memo.addCatModal.parent", "부모 카테고리");
    CLan.Set(ko, "memo.addCatModal.name", "이름");
    CLan.Set(ko, "memo.addCatModal.add", "추가");
    CLan.Set(ko, "memo.common.cancel", "취소");
    CLan.Set(ko, "memo.common.yes", "예");
    CLan.Set(ko, "memo.common.no", "아니오");
    CLan.Set(ko, "memo.common.ok", "확인");
    CLan.Set(ko, "memo.prompt.renameCategory", `카테고리 "{name}"의 새 이름:`);
    CLan.Set(ko, "memo.msg.failAddCategory", "카테고리 추가 실패");
    CLan.Set(ko, "memo.msg.failDeleteCategory", "카테고리 삭제 실패");
    CLan.Set(ko, "memo.msg.failRenameCategory", "카테고리 이름 변경 실패");
    CLan.Set(ko, "memo.msg.failSave", "저장 실패");
    CLan.Set(ko, "memo.msg.failDeleteMemo", "메모 삭제 실패");
    CLan.Set(ko, "memo.msg.searchFailed", "검색 실패");
    CLan.Set(ko, "memo.msg.networkError", "네트워크 오류");
    CLan.Set(ko, "memo.msg.cancelled", "취소되었습니다.");
    CLan.Set(ko, "memo.msg.deletedMemo", "메모 @{id}가 삭제되었습니다.");
    CLan.Set(ko, "memo.msg.failDeleteCategoryDone", "카테고리 삭제 실패.");
    CLan.Set(ko, "memo.msg.deletedCategory", `카테고리 "{name}"가 삭제되었습니다.`);
    CLan.Set(ko, "memo.msg.noMatchingMemos", "일치하는 메모가 없습니다.");
    CLan.Set(ko, "memo.msg.deletedCandidates", "일치하는 메모 {total}건 중 {n}건이 삭제되었습니다.");
    CLan.Set(ko, "memo.msg.moveNoCategory", "선택된 카테고리가 없습니다 - 먼저 옮길 대상 카테고리를 선택한 뒤 /m @<메모 id>를 사용하세요.");
    CLan.Set(ko, "memo.msg.moveUsage", "사용법: /m <메모 id> (예: /m 2 또는 @2)");
    CLan.Set(ko, "memo.msg.failMoveMemo", "메모 이동 실패");
    CLan.Set(ko, "memo.msg.movedMemo", `메모 @{id}를 "{name}"로 옮겼습니다.`);
    CLan.Set(ko, "memo.msg.requestFailed", "요청 실패 ({status}): {path}");
    CLan.Set(ko, "memo.msg.remoteNotAuthed", "원격 서버에 인증되어 있지 않습니다. 파일 관리자(Chat/Terminal/Memo)에서 먼저 인증하세요.");
    CLan.Set(ko, "memo.help.body", `
        <div class="small">
            <h6>단축키</h6>
            <ul class="mb-3">
                <li><b>Tab</b> - 좌측 카테고리/타임 사이드바 열고 닫기</li>
                <li><b>Enter</b> - 입력창에서 전송 (줄바꿈은 <b>Shift+Enter</b>)</li>
                <li><b>F1~F4, F7</b> - 상위 화면(Home)의 단축키로 전달됨</li>
            </ul>
            <h6>메시지 입력창 명령어</h6>
            <p class="mb-1">입력 맨 앞에 아래 접두어를 붙이면 상단 모드 선택과 무관하게 <b>이번 전송 한 번만</b> 해당 모드로 동작합니다.</p>
            <ul class="mb-3">
                <li><code>/w &lt;내용&gt;</code> - <b>Write</b>: 메모 저장 (카테고리 미선택 시 내용으로 자동 분류)</li>
                <li><code>/s &lt;질문&gt;</code> 또는 <code>/r &lt;질문&gt;</code> - <b>Search</b>: AI 검색 (선택된 카테고리 범위, 미선택 시 전체)</li>
                <li><code>/d &lt;내용&gt;</code> - <b>Delete</b>: 삭제
                    <ul>
                        <li>숫자만 입력 - 해당 id의 메모 1건 삭제 (예: <code>/d 12</code>)</li>
                        <li>카테고리 이름 포함 - 그 카테고리(+하위 카테고리+메모) 전체 삭제</li>
                        <li>그 외 - AI가 설명과 어울리는 메모 후보를 찾아 확인 후 삭제</li>
                    </ul>
                </li>
                <li><code>/m &lt;메모 id&gt;</code> - <b>Move</b>: 해당 메모를 현재 선택된(옮겨 담을) 카테고리로 이동 (예: <code>/m 2</code> 또는 <code>/m @2</code>). 먼저 목적지 카테고리를 선택해야 함</li>
            </ul>
            <p class="mb-0 text-body-secondary">접두어 없이 전송하면 상단의 <b>모드 선택 드롭다운</b>(Write/Search/Delete/Move)에 맞춰 동작합니다. 한/영 전환을 깜빡해도 같은 자리의 한글 자모(ㅈㄴㄱㅇㅡ)로 인식됩니다.</p>
        </div>
    `);
    CLan.Set(ko, "memo.help.close", "닫기");
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
RegisterMemoLan();
ApplyMemoLan();
function El(_id) {
    return document.getElementById(_id);
}
const authOverlay = El("memo-auth-overlay");
const authPwInput = El("authPwInput");
const authMsg = El("authMsg");
const authSubmitBtn = El("authSubmitBtn");
async function CheckAuth() {
    try {
        const j = await CFecth.Exe("auth/check", null, "json");
        return !!j?.authed;
    }
    catch {
        return false;
    }
}
async function DoAuth() {
    const pw = authPwInput.value;
    if (!pw)
        return;
    authSubmitBtn.disabled = true;
    authMsg.textContent = '';
    try {
        const j = await CFecth.Exe("auth/login", { password: CHash.SHA256('artgine_' + pw) }, "json");
        if (j.ok) {
            authOverlay.style.display = 'none';
            await LoadProviders();
            await LoadCategories();
            await LoadRecentData();
        }
        else {
            authMsg.textContent = j.msg || 'Wrong password';
        }
    }
    catch {
        authMsg.textContent = 'Server error';
    }
    authSubmitBtn.disabled = false;
}
async function ShowAuthOrLoad() {
    const authed = await CheckAuth();
    if (!authed) {
        authOverlay.style.display = 'flex';
        authPwInput.value = '';
        authMsg.textContent = '';
        setTimeout(() => authPwInput.focus(), 50);
    }
    else {
        authOverlay.style.display = 'none';
        await LoadProviders();
        await LoadCategories();
        await LoadRecentData();
    }
}
authSubmitBtn.addEventListener('click', DoAuth);
authPwInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter')
        DoAuth();
});
const FOLDER_STORAGE_KEY = 'memo_folder';
const folderInputEl = El("memoFolderInput");
folderInputEl.value = localStorage.getItem(FOLDER_STORAGE_KEY) ?? '';
function GetFolder() {
    return folderInputEl.value.trim();
}
async function ReloadForFolder() {
    localStorage.setItem(FOLDER_STORAGE_KEY, GetFolder());
    activeCatId = null;
    await LoadCategories();
    await LoadData();
    await LoadRecentData();
}
folderInputEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter')
        ReloadForFolder();
});
function AppendParam(_path, _data, _key, _value) {
    if (_data === null) {
        const sep = _path.includes('?') ? '&' : '?';
        return { path: `${_path}${sep}${_key}=${encodeURIComponent(_value)}`, data: null };
    }
    return { path: _path, data: { ..._data, [_key]: _value } };
}
function InjectFolder(_path, _data) {
    if (!_path.startsWith('Memo/'))
        return { path: _path, data: _data };
    return AppendParam(_path, _data, 'folder', GetFolder());
}
let memoApiBaseUrl = '';
let memoApiToken = '';
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
    const step1 = InjectFolder(_path, _data);
    const { path, data } = InjectRemote(step1.path, step1.data);
    try {
        return await CFecth.Exe(path, data, _returnType);
    }
    catch (e) {
        const status = ExtractHttpStatus(e);
        if (status === 401) {
            if (memoApiBaseUrl) {
                CAlert.E(L('memo.msg.remoteNotAuthed', 'Not authenticated on the remote server. Authenticate it from the File Manager (Chat/Terminal/Memo) first.'));
            }
            else {
                authOverlay.style.display = 'flex';
            }
        }
        else {
            CAlert.E(L('memo.msg.requestFailed', 'Request failed ({status}): {path}')
                .replace('{status}', String(status ?? 'network error')).replace('{path}', _path.split('?')[0]));
        }
        throw e;
    }
}
let categoryCache = [];
let categoryTagsCache = new Map();
let activeCatId = null;
const expandedCatIds = new Set();
const catTreeEl = El("catTree");
const catSearchInputEl = El("catSearchInput");
const catSidebarEl = El("cat-sidebar");
const catSidebarToggleBtn = El("catSidebarToggle");
const catSidebarOffcanvas = new window.bootstrap.Offcanvas(catSidebarEl, { backdrop: false, scroll: true });
catSidebarEl.addEventListener('shown.bs.offcanvas', () => {
    catSidebarToggleBtn.querySelector('i').className = 'bi bi-layout-sidebar-inset';
});
catSidebarEl.addEventListener('hidden.bs.offcanvas', () => {
    catSidebarToggleBtn.querySelector('i').className = 'bi bi-layout-sidebar';
});
catSidebarEl.style.transition = 'none';
catSidebarOffcanvas.show();
requestAnimationFrame(() => { catSidebarEl.style.transition = ''; });
function ToggleCatSidebar() {
    const wasShown = catSidebarEl.classList.contains('show');
    catSidebarOffcanvas.toggle();
    setTimeout(() => wasShown ? composerTextEl.focus() : catSidebarEl.focus(), 0);
}
catSidebarToggleBtn.addEventListener('click', ToggleCatSidebar);
function OpenCatSidebar() {
    catSidebarOffcanvas.show();
}
CIframeMsg.Recv({
    'open-sidebar': () => OpenCatSidebar(),
    'set-folder': (data) => {
        folderInputEl.value = String(data.folder ?? '');
        OpenCatSidebar();
        setTimeout(() => { folderInputEl.focus(); folderInputEl.select(); }, 50);
    },
    'set-remote': (data) => {
        memoApiBaseUrl = String(data.baseUrl ?? '');
        memoApiToken = String(data.token ?? '');
        activeCatId = null;
        LoadCategories();
        LoadData();
        LoadRecentData();
    },
});
function GetChildren(_parentId) {
    return categoryCache.filter(c => c.parentId === _parentId);
}
function GetCategory(_id) {
    return categoryCache.find(c => c.id === _id);
}
function GetPath(_id) {
    const path = [];
    let cur = _id != null ? GetCategory(_id) : undefined;
    while (cur) {
        path.unshift(cur);
        cur = cur.parentId ? GetCategory(cur.parentId) : undefined;
    }
    return path;
}
function RenderCatNode(_cat) {
    const children = GetChildren(_cat.id);
    const hasChildren = children.length > 0;
    const isActive = _cat.id === activeCatId;
    const isExpanded = expandedCatIds.has(_cat.id);
    const tags = categoryTagsCache.get(_cat.id) ?? [];
    const tagsHtml = tags.length > 0
        ? `<div class="cat-tags d-flex flex-wrap gap-1">${tags.map(t => `<span class="badge rounded-pill text-bg-secondary">#${EscapeHtml(t)}</span>`).join('')}</div>`
        : '';
    return `
      <div class="cat-node position-relative" data-cat-id="${_cat.id}">
        <div class="cat-row d-flex flex-column rounded-3 user-select-none ${isActive ? 'active' : ''}" data-select-cat="${_cat.id}">
          <div class="d-flex align-items-center gap-1">
            <button class="cat-toggle d-inline-flex align-items-center justify-content-center flex-shrink-0 border-0 bg-transparent p-0 ${hasChildren ? '' : 'invisible'}" data-toggle-cat="${_cat.id}">
              <i class="bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}" id="chev-${_cat.id}"></i>
            </button>
            <i class="bi ${hasChildren ? 'bi-folder2-open' : 'bi-folder2'}"></i>
            <span class="cat-label text-truncate">${EscapeHtml(_cat.name)}</span>
            <span class="cat-actions d-flex flex-shrink-0">
              <button class="border-0 bg-transparent d-inline-flex align-items-center justify-content-center rounded-1" title="Rename" data-rename-cat="${_cat.id}"><i class="bi bi-pencil"></i></button>
              <button class="border-0 bg-transparent d-inline-flex align-items-center justify-content-center rounded-1" title="Add subcategory" data-add-child="${_cat.id}"><i class="bi bi-plus-lg"></i></button>
              <button class="border-0 bg-transparent d-inline-flex align-items-center justify-content-center rounded-1" title="Delete" data-delete-cat="${_cat.id}"><i class="bi bi-x-lg"></i></button>
            </span>
          </div>
          ${tagsHtml}
        </div>
        ${hasChildren ? `<div class="cat-children ${isExpanded ? '' : 'd-none'}" id="children-${_cat.id}">${children.map(RenderCatNode).join('')}</div>` : ''}
      </div>
    `;
}
function RenderTree() {
    const roots = GetChildren(0);
    if (roots.length === 0) {
        catTreeEl.innerHTML = `<div class="cat-emptyhint text-body-secondary">${EscapeHtml(L('memo.cat.emptyHint', 'No categories yet. Add one above.'))}</div>`;
        return;
    }
    catTreeEl.innerHTML = roots.map(RenderCatNode).join('');
}
function ToggleCat(_id) {
    const el = El('children-' + _id);
    const chev = El('chev-' + _id);
    if (!el)
        return;
    el.classList.toggle('d-none');
    chev.classList.toggle('bi-chevron-down');
    chev.classList.toggle('bi-chevron-right');
    if (expandedCatIds.has(_id))
        expandedCatIds.delete(_id);
    else
        expandedCatIds.add(_id);
}
function ExpandAncestors(_id) {
    for (const cat of GetPath(_id)) {
        El('children-' + cat.id)?.classList.remove('d-none');
        const chev = El('chev-' + cat.id);
        if (chev) {
            chev.classList.remove('bi-chevron-right');
            chev.classList.add('bi-chevron-down');
        }
        expandedCatIds.add(cat.id);
    }
}
async function SearchCategoryInput() {
    const query = catSearchInputEl.value.trim().toLowerCase();
    if (!query)
        return;
    const found = categoryCache.find(c => c.name.toLowerCase().includes(query));
    if (!found)
        return;
    ExpandAncestors(found.id);
    await SelectCategory(found.id);
    catTreeEl.querySelector(`[data-select-cat="${found.id}"]`)?.scrollIntoView({ block: 'center' });
}
function UpdateActiveCatUI(_prevId, _newId) {
    if (_prevId != null)
        catTreeEl.querySelector(`[data-select-cat="${_prevId}"]`)?.classList.remove('active');
    if (_newId != null)
        catTreeEl.querySelector(`[data-select-cat="${_newId}"]`)?.classList.add('active');
}
async function SelectCategory(_id) {
    const prevId = activeCatId;
    activeCatId = _id;
    UpdateActiveCatUI(prevId, _id);
    await LoadData();
}
async function LoadCategories() {
    const j = await ApiExe("Memo/Category/List", null, "json");
    if (!j?.ok)
        return;
    categoryCache = j.categories;
    const tagRows = j.tags;
    categoryTagsCache = new Map();
    for (const row of tagRows) {
        const list = categoryTagsCache.get(row.categoryId) ?? [];
        list.push(row.tag);
        categoryTagsCache.set(row.categoryId, list);
    }
    RenderTree();
    if (activeCatId != null && !GetCategory(activeCatId)) {
        activeCatId = null;
        await LoadData();
    }
}
function BuildCategoryOptions() {
    const result = [];
    const walk = (_parentId, _depth) => {
        for (const cat of GetChildren(_parentId)) {
            result.push({ id: cat.id, label: `${'  '.repeat(_depth)}${cat.name}` });
            walk(cat.id, _depth + 1);
        }
    };
    walk(0, 0);
    return result;
}
function OpenAddCategoryModal(_defaultParentId) {
    return new Promise(resolve => {
        const selectId = 'addCatParentSelect_' + Math.random().toString(36).slice(2);
        const nameId = 'addCatNameInput_' + Math.random().toString(36).slice(2);
        const optionsHtml = [`<option value="0">${EscapeHtml(L('memo.addCatModal.root', '-- Root (no parent) --'))}</option>`]
            .concat(BuildCategoryOptions().map(o => `<option value="${o.id}">${EscapeHtml(o.label)}</option>`))
            .join('');
        const c = new CConfirm();
        c.SetBody(`
            <label class="form-label small mb-1">${EscapeHtml(L('memo.addCatModal.parent', 'Parent category'))}</label>
            <select id="${selectId}" class="form-select form-select-sm mb-2">${optionsHtml}</select>
            <label class="form-label small mb-1">${EscapeHtml(L('memo.addCatModal.name', 'Name'))}</label>
            <input type="text" id="${nameId}" class="form-control form-control-sm">
        `);
        c.SetConfirm(CConfirm.eConfirm.YesNo, [
            () => {
                const parentId = Number(document.getElementById(selectId)?.value ?? '0');
                const name = document.getElementById(nameId)?.value.trim() ?? '';
                resolve(name.length > 0 ? { parentId, name } : null);
            },
            () => resolve(null),
        ], [L('memo.addCatModal.add', 'Add'), L('memo.common.cancel', 'Cancel')]);
        c.Open();
        setTimeout(() => {
            const sel = document.getElementById(selectId);
            if (sel)
                sel.value = String(_defaultParentId);
            document.getElementById(nameId)?.focus();
        }, 50);
    });
}
async function AddCategoryUI(_defaultParentId) {
    const result = await OpenAddCategoryModal(_defaultParentId);
    if (!result)
        return;
    const j = await ApiExe("Memo/Category/Add", { name: result.name, parentId: result.parentId }, "json");
    if (!j?.ok) {
        CAlert.E(j?.msg || L('memo.msg.failAddCategory', 'Failed to add category'));
        return;
    }
    await LoadCategories();
    ExpandAncestors(result.parentId);
}
function CollectDescendantIds(_id) {
    const result = [_id];
    const stack = [_id];
    while (stack.length > 0) {
        const current = stack.pop();
        for (const child of GetChildren(current)) {
            result.push(child.id);
            stack.push(child.id);
        }
    }
    return result;
}
function CategoryDeleteConfirmMsg(_cat) {
    const descendantCount = CollectDescendantIds(_cat.id).length - 1;
    return descendantCount > 0
        ? L('memo.confirm.deleteCatMulti', `"{name}" and its {n} subcategory(ies) (with all memos inside) will be deleted. Continue?`)
            .replace('{name}', _cat.name).replace('{n}', String(descendantCount))
        : L('memo.confirm.deleteCatSingle', `Delete category "{name}"? (Memos inside will also be deleted)`)
            .replace('{name}', _cat.name);
}
async function PerformCategoryDelete(_id) {
    const j = await ApiExe("Memo/Category/Delete", { id: _id }, "json");
    if (!j?.ok)
        return false;
    if (activeCatId != null && CollectDescendantIds(_id).includes(activeCatId)) {
        activeCatId = null;
    }
    await LoadCategories();
    await LoadData();
    await LoadRecentData();
    return true;
}
async function DeleteCategoryUI(_id) {
    const cat = GetCategory(_id);
    if (!cat)
        return;
    if (!(await ConfirmModal(CategoryDeleteConfirmMsg(cat))))
        return;
    if (!(await PerformCategoryDelete(_id)))
        CAlert.E(L('memo.msg.failDeleteCategory', 'Failed to delete category'));
}
async function RenameCategoryUI(_id) {
    const cat = GetCategory(_id);
    if (!cat)
        return;
    const name = await PromptText(L('memo.prompt.renameCategory', `Rename category "{name}" to:`).replace('{name}', cat.name), cat.name);
    if (name == null || !name.trim() || name.trim() === cat.name)
        return;
    const j = await ApiExe("Memo/Category/Rename", { id: _id, name: name.trim() }, "json");
    if (!j?.ok) {
        CAlert.E(j?.msg || L('memo.msg.failRenameCategory', 'Failed to rename category'));
        return;
    }
    await LoadCategories();
}
function FindCategoryMatches(_text) {
    const lower = _text.toLowerCase();
    return categoryCache
        .filter(c => c.name.length > 0 && lower.includes(c.name.toLowerCase()))
        .sort((a, b) => b.name.length - a.name.length);
}
El('addCatBtn').addEventListener('click', () => AddCategoryUI(0));
El('clearCatSelectionBtn').addEventListener('click', () => SelectCategory(null));
catSearchInputEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter')
        SearchCategoryInput();
});
catTreeEl.addEventListener('click', (e) => {
    const target = e.target;
    const toggleBtn = target.closest('[data-toggle-cat]');
    if (toggleBtn) {
        e.stopPropagation();
        ToggleCat(Number(toggleBtn.dataset.toggleCat));
        return;
    }
    const renameBtn = target.closest('[data-rename-cat]');
    if (renameBtn) {
        e.stopPropagation();
        RenameCategoryUI(Number(renameBtn.dataset.renameCat));
        return;
    }
    const addBtn = target.closest('[data-add-child]');
    if (addBtn) {
        e.stopPropagation();
        AddCategoryUI(Number(addBtn.dataset.addChild));
        return;
    }
    const delBtn = target.closest('[data-delete-cat]');
    if (delBtn) {
        e.stopPropagation();
        DeleteCategoryUI(Number(delBtn.dataset.deleteCat));
        return;
    }
    const row = target.closest('[data-select-cat]');
    if (row) {
        SelectCategory(Number(row.dataset.selectCat));
        return;
    }
});
const timeListEl = El("timeList");
const timeSearchInputEl = El("timeSearchInput");
let recentDataCache = [];
let timeSearchQuery = '';
function RenderTimeList() {
    const items = timeSearchQuery
        ? recentDataCache.filter(item => item.content.toLowerCase().includes(timeSearchQuery))
        : recentDataCache;
    if (items.length === 0) {
        timeListEl.innerHTML = `<div class="cat-emptyhint text-body-secondary">${EscapeHtml(L('memo.time.empty', 'No memos yet.'))}</div>`;
        return;
    }
    timeListEl.innerHTML = items.map(item => {
        const catName = GetCategory(item.categoryId)?.name ?? '?';
        return `
          <div class="time-item rounded-1" data-time-item-cat="${item.categoryId}">
            <div class="time-item-meta d-flex justify-content-between">
                <span class="text-truncate">${EscapeHtml(catName)}</span>
                <span class="flex-shrink-0 ms-1">${FormatTime(item.date)}</span>
            </div>
            <div class="text-truncate">${EscapeHtml(item.content)}</div>
          </div>
        `;
    }).join('');
}
async function LoadRecentData() {
    const j = await ApiExe("Memo/Data/ListRecent?limit=30", null, "json");
    if (!j?.ok)
        return;
    recentDataCache = j.data;
    RenderTimeList();
}
timeListEl.addEventListener('click', (e) => {
    const target = e.target;
    const item = target.closest('[data-time-item-cat]');
    if (item)
        SelectCategory(Number(item.dataset.timeItemCat));
});
timeSearchInputEl.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter')
        return;
    timeSearchQuery = timeSearchInputEl.value.trim().toLowerCase();
    RenderTimeList();
});
function ResetSidebarSearch() {
    catSearchInputEl.value = '';
    timeSearchInputEl.value = '';
    timeSearchQuery = '';
    RenderTimeList();
}
El("cat-tab-category").addEventListener('shown.bs.tab', ResetSidebarSearch);
El("cat-tab-time").addEventListener('shown.bs.tab', ResetSidebarSearch);
let providers = [];
const LS_PROVIDER = 'ai.provider';
const LS_MODEL = 'ai.model';
const providerSelectEl = El("providerSelect");
const modelSelectEl = El("modelSelect");
const modeSelectEl = El("modeSelect");
function SaveLastProviderModel() {
    const provider = providerSelectEl.value;
    if (!provider)
        return;
    CStorage.Set(LS_PROVIDER, provider);
    if (provider !== 'cmd' && modelSelectEl.value)
        CStorage.Set(LS_MODEL, modelSelectEl.value);
}
function PopulateModelSelect() {
    const info = providers.find(p => p.id === providerSelectEl.value);
    const models = info ? info.models : [];
    modelSelectEl.innerHTML = models.map(m => `<option value="${m.value}">${EscapeHtml(m.label)}</option>`).join('');
    if (models.length === 0)
        return;
    const savedModel = CStorage.Get(LS_MODEL);
    if (savedModel && models.some(m => m.value === savedModel)) {
        modelSelectEl.value = savedModel;
    }
    else {
        modelSelectEl.value = models[Math.floor(models.length / 2)].value;
    }
}
function PopulateProviderSelect() {
    providerSelectEl.innerHTML = providers.map(p => `<option value="${p.id}">${p.id}</option>`).join('');
    const savedProvider = CStorage.Get(LS_PROVIDER);
    if (savedProvider && providers.some(p => p.id === savedProvider)) {
        providerSelectEl.value = savedProvider;
    }
    PopulateModelSelect();
}
async function LoadProviders() {
    if (providers.length > 0) {
        PopulateProviderSelect();
        return;
    }
    try {
        const setting = await ApiExe("AIInfo/setting", null, "json");
        if (setting?.models) {
            providers = Object.keys(setting.models).map(id => ({ id, models: setting.models[id] || [] }));
            PopulateProviderSelect();
        }
    }
    catch (e) {
        console.error('provider list error:', e);
    }
}
providerSelectEl.addEventListener('change', () => {
    PopulateModelSelect();
    SaveLastProviderModel();
});
modelSelectEl.addEventListener('change', () => SaveLastProviderModel());
const helpBtnEl = El("helpBtn");
const sHelpBodyDefaultEn = `
        <div class="small">
            <h6>Keyboard shortcuts</h6>
            <ul class="mb-3">
                <li><b>Tab</b> - Open/close the category/time sidebar</li>
                <li><b>Enter</b> - Send in the input box (<b>Shift+Enter</b> for a newline)</li>
                <li><b>F1~F4, F7</b> - Forwarded to the parent screen (Home)'s shortcuts</li>
            </ul>
            <h6>Message box commands</h6>
            <p class="mb-1">Prefix the input with one of the following to force that mode for <b>this send only</b>, regardless of the mode dropdown above.</p>
            <ul class="mb-3">
                <li><code>/w &lt;text&gt;</code> - <b>Write</b>: save a memo (auto-classified by content if no category is selected)</li>
                <li><code>/s &lt;question&gt;</code> or <code>/r &lt;question&gt;</code> - <b>Search</b>: AI search (scoped to the selected category, or all if none selected)</li>
                <li><code>/d &lt;text&gt;</code> - <b>Delete</b>
                    <ul>
                        <li>Number only - deletes that single memo id (e.g. <code>/d 12</code>)</li>
                        <li>Text containing a category name - deletes that category (+ subcategories + memos)</li>
                        <li>Otherwise - AI finds matching memo candidates, then deletes after confirmation</li>
                    </ul>
                </li>
                <li><code>/m &lt;memo id&gt;</code> - <b>Move</b>: move that memo into the currently selected category (e.g. <code>/m 2</code> or <code>/m @2</code>). Select the destination category first</li>
            </ul>
            <p class="mb-0 text-body-secondary">Sending without a prefix uses the <b>mode dropdown</b> above (Write/Search/Delete/Move). Typing w/s/r/d/m with Korean IME on still works - the same-position Jamo is recognized.</p>
        </div>
    `;
function ShowHelpModal() {
    const c = new CConfirm();
    c.SetHeader(`<i class="bi bi-question-circle me-1"></i>${L('memo.help.title', 'Help')}`);
    c.SetTitle(CModal.eTitle.Text);
    c.SetBody(L('memo.help.body', sHelpBodyDefaultEn));
    c.SetSize('520px', '70%');
    c.SetConfirm(CConfirm.eConfirm.OK, [() => { }], [L('memo.help.close', 'Close')]);
    c.Open();
}
helpBtnEl.addEventListener('click', ShowHelpModal);
const memoLogEl = El("memo-log");
const composerTextEl = El("composerText");
const submitBtn = El("submitBtn");
let pendingEl = null;
function FormatTime(_t) {
    const s = String(_t).padStart(14, '0');
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
}
function ScrollLogBottom() {
    const el = El("memo-content");
    if (el)
        el.scrollTop = el.scrollHeight;
}
function RenderEmptyLog(_text, _icon) {
    memoLogEl.innerHTML = `<div id="memoEmptyState" class="empty-state text-center text-body-secondary"><i class="bi ${_icon} d-block"></i>${EscapeHtml(_text)}</div>`;
}
function RenderDataBubble(_item) {
    const tagHtml = _item.tags.length > 0
        ? `<div class="mt-2 d-flex flex-wrap gap-1">${_item.tags.map(t => `<span class="badge rounded-pill text-bg-primary">#${EscapeHtml(t)}</span>`).join('')}</div>`
        : '';
    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <div class="text-secondary small text-uppercase mb-1 d-flex justify-content-between align-items-center" style="letter-spacing: .5px;">
            <span>@${_item.id} · ${FormatTime(_item.date)}</span>
            <button type="button" class="btn-close" style="font-size:0.6rem;" data-delete-data="${_item.id}" aria-label="Delete"></button>
        </div>
        <div class="msg-bubble p-3 rounded border-start border-4 border-primary bg-primary-subtle">${EscapeHtml(_item.content)}${tagHtml}</div>
    `;
    return wrap;
}
function AppendChatBubble(_role, _text, _pending) {
    const placeholder = memoLogEl.querySelector('#memoEmptyState');
    if (placeholder)
        placeholder.remove();
    const roleLabel = _role === 'ai' ? 'Memo' : _role === 'system' ? 'System' : '';
    const bubbleCls = _role === 'user'
        ? _pending
            ? 'msg-bubble p-3 rounded border-start border-4 border-secondary bg-body-tertiary opacity-50'
            : 'msg-bubble p-3 rounded border-start border-4 border-primary bg-primary-subtle'
        : _role === 'ai'
            ? 'msg-bubble p-3 rounded border-start border-4 border-secondary bg-body-tertiary'
            : 'msg-bubble p-2 px-3 rounded border border-danger bg-danger-subtle text-danger-emphasis';
    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <div class="text-secondary small text-uppercase mb-1" style="letter-spacing: .5px;">${roleLabel}</div>
        <div class="${bubbleCls}">${EscapeHtml(_text)}</div>
    `;
    memoLogEl.appendChild(wrap);
    ScrollLogBottom();
    return wrap;
}
function UnpendUserBubble(_wrap) {
    const bubble = _wrap.querySelector('.msg-bubble');
    if (!bubble)
        return;
    bubble.className = 'msg-bubble p-3 rounded border-start border-4 border-primary bg-primary-subtle';
}
async function LoadData() {
    if (activeCatId == null) {
        RenderEmptyLog(L('memo.empty.noCategory', 'No category selected. Select one to write, or use Search/Delete to work across all categories.'), 'bi-signpost-split');
        return;
    }
    const j = await ApiExe("Memo/Data/List?categoryId=" + activeCatId, null, "json");
    if (!j?.ok)
        return;
    const items = j.data.slice().reverse();
    if (items.length === 0) {
        RenderEmptyLog(L('memo.empty.writeHint', 'Write a memo to get started.'), 'bi-journal-text');
        return;
    }
    memoLogEl.innerHTML = '';
    for (const item of items)
        memoLogEl.appendChild(RenderDataBubble(item));
    ScrollLogBottom();
}
async function DeleteDataUI(_id) {
    if (!(await ConfirmModal(L('memo.confirm.deleteData', 'Delete this memo?'))))
        return;
    const j = await ApiExe("Memo/Data/Delete", { id: _id }, "json");
    if (!j?.ok) {
        CAlert.E(j?.msg || L('memo.msg.failDeleteMemo', 'Failed to delete memo'));
        return;
    }
    await LoadData();
    await LoadRecentData();
}
memoLogEl.addEventListener('click', (e) => {
    const target = e.target;
    const delBtn = target.closest('[data-delete-data]');
    if (delBtn) {
        DeleteDataUI(Number(delBtn.dataset.deleteData));
    }
});
const sSlashModeMap = { '/w': 'write', '/s': 'search', '/r': 'search', '/d': 'delete', '/m': 'move' };
const sJamoToKey = { 'ㅈ': 'w', 'ㄴ': 's', 'ㄱ': 'r', 'ㅇ': 'd', 'ㅡ': 'm' };
function NormalizeSlashPrefix(_text) {
    const m = _text.match(/^\/([ㄱ-ㅎㅏ-ㅣ])/);
    const key = m ? sJamoToKey[m[1]] : undefined;
    return key ? '/' + key + _text.slice(2) : _text;
}
function ExtractSlashMode(_text) {
    const m = NormalizeSlashPrefix(_text).match(/^(\/[wsrdm])(?:\s+|$)([\s\S]*)$/i);
    if (m)
        return { mode: sSlashModeMap[m[1].toLowerCase()], text: m[2] };
    return { mode: null, text: _text };
}
async function ComposerSend() {
    let text = composerTextEl.value.trim();
    if (!text)
        return;
    const slash = ExtractSlashMode(text);
    const mode = slash.mode ?? modeSelectEl.value;
    if (slash.mode) {
        text = slash.text.trim();
        if (!text) {
            composerTextEl.value = '';
            composerTextEl.style.height = '0';
            return;
        }
    }
    const provider = providerSelectEl.value || undefined;
    const model = modelSelectEl.value || undefined;
    composerTextEl.value = '';
    composerTextEl.style.height = '0';
    submitBtn.disabled = true;
    try {
        if (mode === 'write') {
            pendingEl = AppendChatBubble('user', text, true);
            const j = await ApiExe("Memo/Data/Add", { categoryId: activeCatId, text, provider, model }, "json");
            if (!j?.ok) {
                AppendChatBubble('system', j?.msg || L('memo.msg.failSave', 'Failed to save'));
                return;
            }
            if (pendingEl) {
                pendingEl.remove();
                pendingEl = null;
            }
            if (activeCatId == null) {
                await LoadCategories();
                await SelectCategory(j.data.categoryId);
            }
            else {
                await LoadData();
            }
            await LoadRecentData();
        }
        else if (mode === 'search') {
            const userBubble = AppendChatBubble('user', text, true);
            const j = await ApiExe("Memo/Search", { text, categoryId: activeCatId, provider, model }, "json");
            UnpendUserBubble(userBubble);
            if (!j?.ok) {
                AppendChatBubble('system', j?.msg || L('memo.msg.searchFailed', 'Search failed'));
                return;
            }
            AppendChatBubble('ai', j.result);
        }
        else if (mode === 'move') {
            await ComposerMove(text);
        }
        else {
            await ComposerDelete(text, provider, model);
        }
    }
    catch (e) {
        AppendChatBubble('system', L('memo.msg.networkError', 'Network error'));
    }
    finally {
        submitBtn.disabled = false;
    }
}
async function ComposerMove(_text) {
    AppendChatBubble('user', _text);
    if (activeCatId == null) {
        AppendChatBubble('system', L('memo.msg.moveNoCategory', 'No category selected - select the destination category first, then use /m @<memo id>.'));
        return;
    }
    const m = _text.trim().match(/^@?(\d+)$/);
    if (!m) {
        AppendChatBubble('system', L('memo.msg.moveUsage', 'Usage: /m <memo id> (e.g. /m 2 or @2)'));
        return;
    }
    const dataId = Number(m[1]);
    const j = await ApiExe("Memo/Data/Move", { id: dataId, categoryId: activeCatId }, "json");
    if (!j?.ok) {
        AppendChatBubble('system', j?.msg || L('memo.msg.failMoveMemo', 'Failed to move memo'));
        return;
    }
    await LoadData();
    await LoadRecentData();
    AppendChatBubble('system', L('memo.msg.movedMemo', `Moved memo @{id} into "{name}".`)
        .replace('{id}', String(dataId)).replace('{name}', String(GetCategory(activeCatId)?.name ?? activeCatId)));
}
async function ComposerDelete(_text, _provider, _model) {
    AppendChatBubble('user', _text);
    if (/^\d+$/.test(_text)) {
        const id = Number(_text);
        if (!(await ConfirmModal(L('memo.confirm.deleteDataId', 'Delete memo @{id}?').replace('{id}', String(id))))) {
            AppendChatBubble('system', L('memo.msg.cancelled', 'Cancelled.'));
            return;
        }
        const j = await ApiExe("Memo/Data/Delete", { id }, "json");
        if (!j?.ok) {
            AppendChatBubble('system', j?.msg || L('memo.msg.failDeleteMemo', 'Failed to delete'));
            return;
        }
        AppendChatBubble('system', L('memo.msg.deletedMemo', 'Deleted memo @{id}.').replace('{id}', String(id)));
        await LoadData();
        await LoadRecentData();
        return;
    }
    const catMatches = FindCategoryMatches(_text);
    if (catMatches.length > 0) {
        const cat = catMatches[0];
        if (!(await ConfirmModal(CategoryDeleteConfirmMsg(cat)))) {
            AppendChatBubble('system', L('memo.msg.cancelled', 'Cancelled.'));
            return;
        }
        const ok = await PerformCategoryDelete(cat.id);
        AppendChatBubble('system', ok
            ? L('memo.msg.deletedCategory', `Deleted category "{name}".`).replace('{name}', cat.name)
            : L('memo.msg.failDeleteCategoryDone', 'Failed to delete category.'));
        return;
    }
    const found = await ApiExe("Memo/Data/FindByDescription", { text: _text, categoryId: activeCatId, provider: _provider, model: _model }, "json");
    if (!found?.ok) {
        AppendChatBubble('system', found?.msg || L('memo.msg.searchFailed', 'Search failed'));
        return;
    }
    const candidates = found.data;
    if (candidates.length === 0) {
        AppendChatBubble('system', L('memo.msg.noMatchingMemos', 'No matching memos found.'));
        return;
    }
    const preview = candidates.map(c => `@${c.id} ${c.content.slice(0, 40)}${c.content.length > 40 ? '...' : ''}`).join('\n');
    if (!(await ConfirmModal(L('memo.confirm.deleteCandidates', 'Delete {n} matching memo(s)?\n\n{preview}')
        .replace('{n}', String(candidates.length)).replace('{preview}', preview)))) {
        AppendChatBubble('system', L('memo.msg.cancelled', 'Cancelled.'));
        return;
    }
    let deletedCount = 0;
    for (const c of candidates) {
        const j = await ApiExe("Memo/Data/Delete", { id: c.id }, "json");
        if (j?.ok)
            deletedCount++;
    }
    AppendChatBubble('system', L('memo.msg.deletedCandidates', 'Deleted {n} of {total} matching memo(s).')
        .replace('{n}', String(deletedCount)).replace('{total}', String(candidates.length)));
    await LoadData();
    await LoadRecentData();
}
submitBtn.addEventListener('click', ComposerSend);
composerTextEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        ComposerSend();
    }
});
composerTextEl.addEventListener('input', () => {
    composerTextEl.style.height = '0';
    composerTextEl.style.height = Math.min(composerTextEl.scrollHeight, 200) + 'px';
});
document.addEventListener('keydown', (ev) => {
    const target = ev.target;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    if (ev.key === 'Tab') {
        if (isTyping && target !== composerTextEl)
            return;
        ev.preventDefault();
        ToggleCatSidebar();
        return;
    }
    if (ev.key === 'F1' || ev.key === 'F2' || ev.key === 'F3' || ev.key === 'F4' || ev.key === 'F7') {
        ev.preventDefault();
        if (window.top)
            CIframeMsg.Send(window.top, 'home-hotkey', { key: ev.key });
        return;
    }
});
function EscapeHtml(_s) {
    const div = document.createElement('div');
    div.textContent = _s;
    return div.innerHTML;
}
function ConfirmModal(_text, _yesText = L('memo.common.yes', 'Yes'), _noText = L('memo.common.no', 'No')) {
    return new Promise(resolve => {
        const c = new CConfirm();
        c.SetBody(EscapeHtml(_text).replace(/\n/g, '<br>'));
        c.SetConfirm(CConfirm.eConfirm.YesNo, [
            () => resolve(true),
            () => resolve(false),
        ], [_yesText, _noText]);
        c.Open();
    });
}
function PromptText(_label, _defaultValue = '') {
    return new Promise(resolve => {
        const inputId = 'promptTextInput_' + Math.random().toString(36).slice(2);
        const c = new CConfirm();
        c.SetBody(`${EscapeHtml(_label)}<br><input type="text" id="${inputId}" class="form-control form-control-sm" value="${EscapeHtml(_defaultValue)}">`);
        c.SetConfirm(CConfirm.eConfirm.YesNo, [
            () => resolve(document.getElementById(inputId)?.value ?? null),
            () => resolve(null),
        ], [L('memo.common.ok', 'OK'), L('memo.common.cancel', 'Cancel')]);
        c.Open();
        setTimeout(() => {
            const el = document.getElementById(inputId);
            el?.focus();
            el?.select();
        }, 50);
    });
}
ShowAuthOrLoad();
