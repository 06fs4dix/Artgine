import { CFecth } from "../../network/CFecth.js";
import { CModal, CConfirm } from "../../basic/CModal.js";
import { CAlert } from "../../basic/CAlert.js";
import { CHash } from "../../basic/CHash.js";
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

    // JS로 그려지는 문구
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

    // 헬프 모달 본문 (한글은 하나의 블록으로 등록, 영문은 코드 쪽 기본값 그대로 사용)
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

RegisterMemoLan();
ApplyMemoLan();

// ==================================================================================================================
// 타입 - 서버(artgine/server/CMemo.ts)의 CategoryRecord/DataRecord와 형태를 맞춘다.
// ==================================================================================================================
interface CategoryRecord { id: number; parentId: number; name: string; }
interface DataRecord { id: number; categoryId: number; content: string; tags: string[]; date: number; }

function El<T extends HTMLElement = HTMLElement>(_id: string): T {
    return document.getElementById(_id) as T;
}

// ==================================================================================================================
// 인증
// ==================================================================================================================
const authOverlay = El<HTMLDivElement>("memo-auth-overlay");
const authPwInput = El<HTMLInputElement>("authPwInput");
const authMsg = El("authMsg");
const authSubmitBtn = El<HTMLButtonElement>("authSubmitBtn");

async function CheckAuth(): Promise<boolean> {
    try {
        const j = await CFecth.Exe("auth/check", null, "json") as any;
        return !!j?.authed;
    } catch { return false; }
}

async function DoAuth(): Promise<void> {
    const pw = authPwInput.value;
    if (!pw) return;
    authSubmitBtn.disabled = true;
    authMsg.textContent = '';
    try {
        const j = await CFecth.Exe("auth/login", { password: CHash.SHA256('artgine_' + pw) }, "json") as any;
        if (j.ok) {
            authOverlay.style.display = 'none';
            await LoadProviders();
            await LoadCategories();
            await LoadRecentData();
        } else {
            authMsg.textContent = j.msg || 'Wrong password';
        }
    } catch {
        authMsg.textContent = 'Server error';
    }
    authSubmitBtn.disabled = false;
}

async function ShowAuthOrLoad(): Promise<void> {
    const authed = await CheckAuth();
    if (!authed) {
        authOverlay.style.display = 'flex';
        authPwInput.value = '';
        authMsg.textContent = '';
        setTimeout(() => authPwInput.focus(), 50);
    } else {
        authOverlay.style.display = 'none';
        await LoadProviders();
        await LoadCategories();
        await LoadRecentData();
    }
}

authSubmitBtn.addEventListener('click', DoAuth);
authPwInput.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') DoAuth();
});

// ==================================================================================================================
// 폴더 경로 - 서버가 폴더별로 완전히 독립된 sqlite 파일에 저장하므로(CMemo.ts 참고),
// 모든 /Memo/* 호출에 이 값을 함께 보내야 한다. 새로고침해도 남아있도록 localStorage에 저장한다.
// ==================================================================================================================
const FOLDER_STORAGE_KEY = 'memo_folder';
const folderInputEl = El<HTMLInputElement>("memoFolderInput");
folderInputEl.value = localStorage.getItem(FOLDER_STORAGE_KEY) ?? '';

function GetFolder(): string {
    return folderInputEl.value.trim();
}

async function ReloadForFolder(): Promise<void> {
    localStorage.setItem(FOLDER_STORAGE_KEY, GetFolder());
    activeCatId = null;
    await LoadCategories();
    await LoadData();
    await LoadRecentData();
}
// blur(포커스 아웃)로는 리로드하지 않는다 - 다른 곳(예: Time 탭 항목)을 클릭하면 그 클릭보다
// blur가 먼저 발생해서, 클릭이 도착하기 전에 목록이 통째로 다시 그려져 클릭 대상이 사라지는 경합이 생긴다.
folderInputEl.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') ReloadForFolder();
});

// GET 호출(_data===null)은 querystring에, POST 호출은 body에 끼워 넣는다(공용 헬퍼).
function AppendParam(_path: string, _data: object | null, _key: string, _value: string): { path: string; data: object | null } {
    if (_data === null) {
        const sep = _path.includes('?') ? '&' : '?';
        return { path: `${_path}${sep}${_key}=${encodeURIComponent(_value)}`, data: null };
    }
    return { path: _path, data: { ..._data, [_key]: _value } };
}

// auth/*, cmd/* 등 Memo 이외의 엔드포인트는 folder가 필요 없으므로 그대로 둔다.
function InjectFolder(_path: string, _data: object | null): { path: string; data: object | null } {
    if (!_path.startsWith('Memo/')) return { path: _path, data: _data };
    return AppendParam(_path, _data, 'folder', GetFolder());
}

// 원격 서버 상태 - Home.ts가 RDP/File 탭에서 원격지가 바뀔 때마다 postMessage('set-remote')로 알려준다.
// 비어있으면 로컬(같은 오리진), 값이 있으면 그 서버의 /Memo/*를 대신 호출한다 - File 탭의
// g_fileWebRootUrl/FileApiUrl/FileParam과 동일한 패턴. 쿠키는 cross-origin에 안 실리므로 token을 함께 보낸다
// (토큰은 File 탭이 그 원격에 대해 이미 로그인해서 얻어둔 것을 그대로 재사용 - 서버 프로세스 전역 토큰 저장소를
// Memo 라우터도 File 라우터와 함께 공유하므로 별도 메모 전용 로그인이 필요 없다. CAuthServer.ts 참고).
let memoApiBaseUrl = '';
let memoApiToken = '';

function InjectRemote(_path: string, _data: object | null): { path: string; data: object | null } {
    if (!memoApiBaseUrl || !_path.startsWith('Memo/')) return { path: _path, data: _data };
    const absPath = memoApiBaseUrl.replace(/\/+$/, '') + '/' + _path.replace(/^\/+/, '');
    return memoApiToken ? AppendParam(absPath, _data, 'token', memoApiToken) : { path: absPath, data: _data };
}

function ExtractHttpStatus(_err: any): number | null {
    const m = String(_err?.message || '').match(/status:\s*(\d+)/);
    return m ? Number(m[1]) : null;
}

// 401 응답을 받으면 인증 오버레이를 다시 띄운다. 세션이 만료된 경우를 처리.
// 그 외 실패(서버가 400/500 등을 반환한 경우)도 여기서 한 번에 눈에 보이는 에러를 띄운다 -
// LoadCategories/LoadData 등 개별 호출부가 별도로 try/catch를 하지 않아도 사용자가 실패를 알 수 있게 한다.
// (folder를 비워두면 서버가 기존 기본 db로 대체하므로, 빈 folder 자체는 에러가 아니다.)
async function ApiExe(_path: string, _data: object | null, _returnType: "text" | "json" = "json"): Promise<any> {
    const step1 = InjectFolder(_path, _data);
    const { path, data } = InjectRemote(step1.path, step1.data);
    try {
        return await CFecth.Exe(path, data, _returnType);
    } catch (e: any) {
        const status = ExtractHttpStatus(e);
        if (status === 401) {
            // 원격 모드의 401은 로컬 로그인 오버레이가 아니라 File 매니저 쪽 인증 문제이므로 안내만 한다 -
            // 여기서 비밀번호를 받아도 로컬 서버에 로그인될 뿐 원격 토큰은 갱신되지 않는다.
            if (memoApiBaseUrl) {
                CAlert.E(L('memo.msg.remoteNotAuthed', 'Not authenticated on the remote server. Authenticate it from the File Manager (Chat/Terminal/Memo) first.'));
            } else {
                authOverlay.style.display = 'flex';
            }
        } else {
            CAlert.E(L('memo.msg.requestFailed', 'Request failed ({status}): {path}')
                .replace('{status}', String(status ?? 'network error')).replace('{path}', _path.split('?')[0]));
        }
        throw e;
    }
}

// ==================================================================================================================
// 상태
// ==================================================================================================================
let categoryCache: CategoryRecord[] = [];
let categoryTagsCache: Map<number, string[]> = new Map();
let activeCatId: number | null = null;
const expandedCatIds: Set<number> = new Set();

// ==================================================================================================================
// 카테고리 트리
// ==================================================================================================================
const catTreeEl = El("catTree");
const catSearchInputEl = El<HTMLInputElement>("catSearchInput");

// 사이드바 열고 닫기 - Home의 ai-sidebar/rdp-sidebar와 동일하게 Bootstrap Offcanvas 컴포넌트를 사용한다.
const catSidebarEl = El<HTMLElement>("cat-sidebar");
const catSidebarToggleBtn = El<HTMLButtonElement>("catSidebarToggle");
const catSidebarOffcanvas = new (window as any).bootstrap.Offcanvas(catSidebarEl, { backdrop: false, scroll: true });
catSidebarEl.addEventListener('shown.bs.offcanvas', () => {
    catSidebarToggleBtn.querySelector('i')!.className = 'bi bi-layout-sidebar-inset';
});
catSidebarEl.addEventListener('hidden.bs.offcanvas', () => {
    catSidebarToggleBtn.querySelector('i')!.className = 'bi bi-layout-sidebar';
});
catSidebarEl.style.transition = 'none';
catSidebarOffcanvas.show();
requestAnimationFrame(() => { catSidebarEl.style.transition = ''; });

function ToggleCatSidebar(): void {
    const wasShown = catSidebarEl.classList.contains('show');
    catSidebarOffcanvas.toggle();
    setTimeout(() => wasShown ? composerTextEl.focus() : catSidebarEl.focus(), 0);
}
catSidebarToggleBtn.addEventListener('click', ToggleCatSidebar);

function OpenCatSidebar(): void {
    catSidebarOffcanvas.show();
}
// Home.ts가 memo 탭으로 전환될 때마다 사이드바를 펼치도록 postMessage로 알려준다.
// 'set-folder'는 파일 매니저의 Memo 버튼에서 보내는 것 - 현재 경로를 폴더 입력창에 채워주기만 하고,
// 실제 로드는 사용자가 직접 Enter를 눌러야 한다(다른 폴더로 확정하기 전 실수로 덮어쓰는 것을 방지).
// 'set-remote'는 RDP/File 탭에서 원격지가 바뀔 때마다 Home.ts가 보내는 것 - 이후 모든 /Memo/* 호출을
// 그 원격 서버로 돌린다(InjectRemote 참고). 로컬로 돌아오면 baseUrl이 빈 값으로 와서 다시 로컬로 리셋된다.
// 사용자가 원격지를 전환하는 그 행위 자체가 명시적 액션이므로(폴더 입력처럼 Enter를 또 기다리지 않고) 바로 다시 로드한다.
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

function GetChildren(_parentId: number): CategoryRecord[] {
    return categoryCache.filter(c => c.parentId === _parentId);
}
function GetCategory(_id: number): CategoryRecord | undefined {
    return categoryCache.find(c => c.id === _id);
}
function GetPath(_id: number | null): CategoryRecord[] {
    const path: CategoryRecord[] = [];
    let cur = _id != null ? GetCategory(_id) : undefined;
    while (cur) {
        path.unshift(cur);
        cur = cur.parentId ? GetCategory(cur.parentId) : undefined;
    }
    return path;
}

function RenderCatNode(_cat: CategoryRecord): string {
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

function RenderTree(): void {
    const roots = GetChildren(0);
    if (roots.length === 0) {
        catTreeEl.innerHTML = `<div class="cat-emptyhint text-body-secondary">${EscapeHtml(L('memo.cat.emptyHint', 'No categories yet. Add one above.'))}</div>`;
        return;
    }
    catTreeEl.innerHTML = roots.map(RenderCatNode).join('');
}

function ToggleCat(_id: number): void {
    const el = El('children-' + _id);
    const chev = El('chev-' + _id);
    if (!el) return;
    el.classList.toggle('d-none');
    chev.classList.toggle('bi-chevron-down');
    chev.classList.toggle('bi-chevron-right');
    if (expandedCatIds.has(_id)) expandedCatIds.delete(_id);
    else expandedCatIds.add(_id);
}

// 검색으로 찾은 카테고리까지 가는 경로(조상들)를 전부 펼친다 - 접혀있어도 강제로 열어서 보이게 한다.
function ExpandAncestors(_id: number): void {
    for (const cat of GetPath(_id)) {
        El('children-' + cat.id)?.classList.remove('d-none');
        const chev = El('chev-' + cat.id);
        if (chev) { chev.classList.remove('bi-chevron-right'); chev.classList.add('bi-chevron-down'); }
        expandedCatIds.add(cat.id);
    }
}

// 카테고리 검색 - 이름에 검색어가 포함된 카테고리를 찾아 조상까지 펼치고, 클릭한 것처럼 선택/활성화한다.
// FindCategoryMatches(카테고리명이 문장 안에 포함되는지 검사, AI 텍스트 매칭용)와는 반대 방향 매칭이라 별도로 둔다.
async function SearchCategoryInput(): Promise<void> {
    const query = catSearchInputEl.value.trim().toLowerCase();
    if (!query) return;
    const found = categoryCache.find(c => c.name.toLowerCase().includes(query));
    if (!found) return;
    ExpandAncestors(found.id);
    await SelectCategory(found.id);
    catTreeEl.querySelector(`[data-select-cat="${found.id}"]`)?.scrollIntoView({ block: 'center' });
}

// 선택 카테고리 표시는 active 클래스 토글만으로 충분하다 - RenderTree()로 전체를
// 다시 그리면 카테고리가 많을 때 비용이 크고, 접어둔 하위 트리(d-none)도 리셋된다.
function UpdateActiveCatUI(_prevId: number | null, _newId: number | null): void {
    if (_prevId != null) catTreeEl.querySelector(`[data-select-cat="${_prevId}"]`)?.classList.remove('active');
    if (_newId != null) catTreeEl.querySelector(`[data-select-cat="${_newId}"]`)?.classList.add('active');
}

async function SelectCategory(_id: number | null): Promise<void> {
    const prevId = activeCatId;
    activeCatId = _id;
    UpdateActiveCatUI(prevId, _id);
    await LoadData();
}

async function LoadCategories(): Promise<void> {
    const j = await ApiExe("Memo/Category/List", null, "json");
    if (!j?.ok) return;
    categoryCache = j.categories as CategoryRecord[];
    const tagRows = j.tags as { categoryId: number; tag: string }[];
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

// 카테고리 트리를 depth 순서로 평평하게 펼쳐서 "부모 선택" 드롭다운 옵션으로 쓴다(이름은 depth만큼 들여쓰기).
function BuildCategoryOptions(): { id: number; label: string }[] {
    const result: { id: number; label: string }[] = [];
    const walk = (_parentId: number, _depth: number) => {
        for (const cat of GetChildren(_parentId)) {
            result.push({ id: cat.id, label: `${'  '.repeat(_depth)}${cat.name}` });
            walk(cat.id, _depth + 1);
        }
    };
    walk(0, 0);
    return result;
}

// 카테고리 추가 모달 - "어디에 붙일지"(부모 선택)와 "이름" 두 필드를 하나로 통합해서 루트 추가/하위 추가를 모두 이 모달 하나로 처리한다.
function OpenAddCategoryModal(_defaultParentId: number): Promise<{ parentId: number; name: string } | null> {
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
                const parentId = Number((document.getElementById(selectId) as HTMLSelectElement | null)?.value ?? '0');
                const name = (document.getElementById(nameId) as HTMLInputElement | null)?.value.trim() ?? '';
                resolve(name.length > 0 ? { parentId, name } : null);
            },
            () => resolve(null),
        ], [L('memo.addCatModal.add', 'Add'), L('memo.common.cancel', 'Cancel')]);
        c.Open();
        setTimeout(() => {
            const sel = document.getElementById(selectId) as HTMLSelectElement | null;
            if (sel) sel.value = String(_defaultParentId);
            (document.getElementById(nameId) as HTMLInputElement | null)?.focus();
        }, 50);
    });
}

async function AddCategoryUI(_defaultParentId: number): Promise<void> {
    const result = await OpenAddCategoryModal(_defaultParentId);
    if (!result) return;
    const j = await ApiExe("Memo/Category/Add", { name: result.name, parentId: result.parentId }, "json");
    if (!j?.ok) { CAlert.E(j?.msg || L('memo.msg.failAddCategory', 'Failed to add category')); return; }
    await LoadCategories();
    ExpandAncestors(result.parentId);
}

function CollectDescendantIds(_id: number): number[] {
    const result: number[] = [_id];
    const stack: number[] = [_id];
    while (stack.length > 0) {
        const current = stack.pop()!;
        for (const child of GetChildren(current)) {
            result.push(child.id);
            stack.push(child.id);
        }
    }
    return result;
}

// 카테고리 삭제 확인 메시지 - 사이드바 버튼과 Delete 모드 입력창이 공유한다.
function CategoryDeleteConfirmMsg(_cat: CategoryRecord): string {
    const descendantCount = CollectDescendantIds(_cat.id).length - 1;
    return descendantCount > 0
        ? L('memo.confirm.deleteCatMulti', `"{name}" and its {n} subcategory(ies) (with all memos inside) will be deleted. Continue?`)
            .replace('{name}', _cat.name).replace('{n}', String(descendantCount))
        : L('memo.confirm.deleteCatSingle', `Delete category "{name}"? (Memos inside will also be deleted)`)
            .replace('{name}', _cat.name);
}

// 실제 카테고리 삭제 API 호출 + 화면 갱신. 사이드바 버튼과 Delete 모드 입력창이 공유한다.
async function PerformCategoryDelete(_id: number): Promise<boolean> {
    const j = await ApiExe("Memo/Category/Delete", { id: _id }, "json");
    if (!j?.ok) return false;

    if (activeCatId != null && CollectDescendantIds(_id).includes(activeCatId)) {
        activeCatId = null;
    }
    await LoadCategories();
    await LoadData();
    await LoadRecentData();
    return true;
}

async function DeleteCategoryUI(_id: number): Promise<void> {
    const cat = GetCategory(_id);
    if (!cat) return;
    if (!(await ConfirmModal(CategoryDeleteConfirmMsg(cat)))) return;
    if (!(await PerformCategoryDelete(_id))) CAlert.E(L('memo.msg.failDeleteCategory', 'Failed to delete category'));
}

// 카테고리 이름 변경 - 이름을 바꾸면 서버가 새 이름으로 태그도 다시 뽑아 교체한다(CMemo.RenameCategory 참고).
// 같은 부모 아래 다른 카테고리가 이미 그 태그를 쓰고 있으면 서버가 거부한다.
async function RenameCategoryUI(_id: number): Promise<void> {
    const cat = GetCategory(_id);
    if (!cat) return;

    const name = await PromptText(L('memo.prompt.renameCategory', `Rename category "{name}" to:`).replace('{name}', cat.name), cat.name);
    if (name == null || !name.trim() || name.trim() === cat.name) return;

    const j = await ApiExe("Memo/Category/Rename", { id: _id, name: name.trim() }, "json");
    if (!j?.ok) { CAlert.E(j?.msg || L('memo.msg.failRenameCategory', 'Failed to rename category')); return; }
    await LoadCategories();
}

// 입력 텍스트 안에 이름이 포함된 카테고리들을 찾는다(가장 긴 이름 = 가장 구체적인 매치를 우선).
// "xx카테고리 삭제해줘" 같은 문장에서 카테고리 이름을 잡아내기 위한 단순 포함 매칭.
function FindCategoryMatches(_text: string): CategoryRecord[] {
    const lower = _text.toLowerCase();
    return categoryCache
        .filter(c => c.name.length > 0 && lower.includes(c.name.toLowerCase()))
        .sort((a, b) => b.name.length - a.name.length);
}

El('addCatBtn').addEventListener('click', () => AddCategoryUI(0));
El('clearCatSelectionBtn').addEventListener('click', () => SelectCategory(null));
catSearchInputEl.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') SearchCategoryInput();
});

catTreeEl.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const toggleBtn = target.closest('[data-toggle-cat]') as HTMLElement | null;
    if (toggleBtn) { e.stopPropagation(); ToggleCat(Number(toggleBtn.dataset.toggleCat)); return; }
    const renameBtn = target.closest('[data-rename-cat]') as HTMLElement | null;
    if (renameBtn) { e.stopPropagation(); RenameCategoryUI(Number(renameBtn.dataset.renameCat)); return; }
    const addBtn = target.closest('[data-add-child]') as HTMLElement | null;
    if (addBtn) { e.stopPropagation(); AddCategoryUI(Number(addBtn.dataset.addChild)); return; }
    const delBtn = target.closest('[data-delete-cat]') as HTMLElement | null;
    if (delBtn) { e.stopPropagation(); DeleteCategoryUI(Number(delBtn.dataset.deleteCat)); return; }
    const row = target.closest('[data-select-cat]') as HTMLElement | null;
    if (row) { SelectCategory(Number(row.dataset.selectCat)); return; }
});

// ==================================================================================================================
// 사이드바 "Time" 탭 - 카테고리 구분 없이 전체에서 최신 30개를 시간순으로 보여준다.
// 새 메모가 추가/삭제될 때마다 LoadRecentData()로 다시 불러와 갱신한다.
// ==================================================================================================================
const timeListEl = El("timeList");
const timeSearchInputEl = El<HTMLInputElement>("timeSearchInput");
let recentDataCache: DataRecord[] = [];
let timeSearchQuery = '';

function RenderTimeList(): void {
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

async function LoadRecentData(): Promise<void> {
    const j = await ApiExe("Memo/Data/ListRecent?limit=30", null, "json");
    if (!j?.ok) return;
    recentDataCache = j.data as DataRecord[];
    RenderTimeList();
}

timeListEl.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const item = target.closest('[data-time-item-cat]') as HTMLElement | null;
    if (item) SelectCategory(Number(item.dataset.timeItemCat));
});

timeSearchInputEl.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key !== 'Enter') return;
    timeSearchQuery = timeSearchInputEl.value.trim().toLowerCase();
    RenderTimeList();
});

// 탭을 전환하면 검색 입력/필터를 초기화해서, 다른 탭으로 갔다 돌아왔을 때 이전 검색 상태가 남아있지 않게 한다.
function ResetSidebarSearch(): void {
    catSearchInputEl.value = '';
    timeSearchInputEl.value = '';
    timeSearchQuery = '';
    RenderTimeList();
}
El("cat-tab-category").addEventListener('shown.bs.tab', ResetSidebarSearch);
El("cat-tab-time").addEventListener('shown.bs.tab', ResetSidebarSearch);

// ==================================================================================================================
// Provider / Model - Home의 AI 채팅과 동일하게 AIInfo/setting에서 읽어온다.
// Chat/Terminal/SubAgent와 동일한 CStorage 키(ai.provider / ai.model)로 마지막 선택을 공유한다.
// ==================================================================================================================
type ProviderInfo = { id: string; models: { value: string; label: string }[] };
let providers: ProviderInfo[] = [];
const LS_PROVIDER = 'ai.provider';
const LS_MODEL = 'ai.model';

const providerSelectEl = El<HTMLSelectElement>("providerSelect");
const modelSelectEl = El<HTMLSelectElement>("modelSelect");
const modeSelectEl = El<HTMLSelectElement>("modeSelect");

function SaveLastProviderModel(): void {
    const provider = providerSelectEl.value;
    if (!provider) return;
    CStorage.Set(LS_PROVIDER, provider);
    if (provider !== 'cmd' && modelSelectEl.value) CStorage.Set(LS_MODEL, modelSelectEl.value);
}

function PopulateModelSelect(): void {
    const info = providers.find(p => p.id === providerSelectEl.value);
    const models = info ? info.models : [];
    modelSelectEl.innerHTML = models.map(m => `<option value="${m.value}">${EscapeHtml(m.label)}</option>`).join('');
    if (models.length === 0) return;
    const savedModel = CStorage.Get(LS_MODEL) as string | null;
    if (savedModel && models.some(m => m.value === savedModel)) {
        modelSelectEl.value = savedModel;
    } else {
        modelSelectEl.value = models[Math.floor(models.length / 2)].value;
    }
}

function PopulateProviderSelect(): void {
    providerSelectEl.innerHTML = providers.map(p => `<option value="${p.id}">${p.id}</option>`).join('');
    const savedProvider = CStorage.Get(LS_PROVIDER) as string | null;
    if (savedProvider && providers.some(p => p.id === savedProvider)) {
        providerSelectEl.value = savedProvider;
    }
    PopulateModelSelect();
}

async function LoadProviders(): Promise<void> {
    if (providers.length > 0) { PopulateProviderSelect(); return; }
    try {
        const setting = await ApiExe("AIInfo/setting", null, "json");
        if (setting?.models) {
            providers = Object.keys(setting.models).map(id => ({ id, models: setting.models[id] || [] }));
            PopulateProviderSelect();
        }
    } catch (e) { console.error('provider list error:', e); }
}

providerSelectEl.addEventListener('change', () => {
    PopulateModelSelect();
    SaveLastProviderModel();
});
modelSelectEl.addEventListener('change', () => SaveLastProviderModel());

// ==================================================================================================================
// 도움말 모달 - 단축키/명령어 설명(한글). CConfirm(OK 전용)으로 표시.
// ==================================================================================================================
const helpBtnEl = El<HTMLButtonElement>("helpBtn");

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

function ShowHelpModal(): void {
    const c = new CConfirm();
    c.SetHeader(`<i class="bi bi-question-circle me-1"></i>${L('memo.help.title', 'Help')}`);
    c.SetTitle(CModal.eTitle.Text);
    c.SetBody(L('memo.help.body', sHelpBodyDefaultEn));
    c.SetSize('520px', '70%');
    c.SetConfirm(CConfirm.eConfirm.OK, [() => {}], [L('memo.help.close', 'Close')]);
    c.Open();
}

helpBtnEl.addEventListener('click', ShowHelpModal);

// ==================================================================================================================
// 채팅 로그(센터) - 선택된 카테고리의 메모를 대화 로그처럼 표시. 검색 시 AI 답변도 말풍선으로 추가된다.
// ==================================================================================================================
const memoLogEl = El("memo-log");
const composerTextEl = El<HTMLTextAreaElement>("composerText");
const submitBtn = El<HTMLButtonElement>("submitBtn");
let pendingEl: HTMLElement | null = null;

function FormatTime(_t: number): string {
    const s = String(_t).padStart(14, '0');
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
}

function ScrollLogBottom(): void {
    const el = El("memo-content");
    if (el) el.scrollTop = el.scrollHeight;
}

function RenderEmptyLog(_text: string, _icon: string): void {
    memoLogEl.innerHTML = `<div id="memoEmptyState" class="empty-state text-center text-body-secondary"><i class="bi ${_icon} d-block"></i>${EscapeHtml(_text)}</div>`;
}

// 저장된 메모 하나를 채팅 로그의 말풍선으로 렌더링한다(삭제 버튼 + 태그 배지 포함).
function RenderDataBubble(_item: DataRecord): HTMLElement {
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

// 검색 질의/답변, 오류 메시지를 위한 일반 채팅 말풍선(Home의 memoAppendBubble과 동일한 패턴).
function AppendChatBubble(_role: 'user' | 'ai' | 'system', _text: string, _pending?: boolean): HTMLElement {
    const placeholder = memoLogEl.querySelector('#memoEmptyState');
    if (placeholder) placeholder.remove();

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

// pending(회색) user 말풍선을 정상 색으로 되돌린다 - Write는 완료 후 pendingEl을 지우고 다시
// 그리지만, Search는 같은 질문 말풍선을 그대로 두고 색만 바꾼다.
function UnpendUserBubble(_wrap: HTMLElement): void {
    const bubble = _wrap.querySelector('.msg-bubble') as HTMLElement | null;
    if (!bubble) return;
    bubble.className = 'msg-bubble p-3 rounded border-start border-4 border-primary bg-primary-subtle';
}

async function LoadData(): Promise<void> {
    if (activeCatId == null) {
        RenderEmptyLog(L('memo.empty.noCategory', 'No category selected. Select one to write, or use Search/Delete to work across all categories.'), 'bi-signpost-split');
        return;
    }
    const j = await ApiExe("Memo/Data/List?categoryId=" + activeCatId, null, "json");
    if (!j?.ok) return;
    const items = (j.data as DataRecord[]).slice().reverse(); // 최신순 응답을 오래된순으로 뒤집어 대화 흐름처럼 표시
    if (items.length === 0) {
        RenderEmptyLog(L('memo.empty.writeHint', 'Write a memo to get started.'), 'bi-journal-text');
        return;
    }
    memoLogEl.innerHTML = '';
    for (const item of items) memoLogEl.appendChild(RenderDataBubble(item));
    ScrollLogBottom();
}

async function DeleteDataUI(_id: number): Promise<void> {
    if (!(await ConfirmModal(L('memo.confirm.deleteData', 'Delete this memo?')))) return;
    const j = await ApiExe("Memo/Data/Delete", { id: _id }, "json");
    if (!j?.ok) { CAlert.E(j?.msg || L('memo.msg.failDeleteMemo', 'Failed to delete memo')); return; }
    await LoadData();
    await LoadRecentData();
}

memoLogEl.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const delBtn = target.closest('[data-delete-data]') as HTMLElement | null;
    if (delBtn) { DeleteDataUI(Number(delBtn.dataset.deleteData)); }
});

// ==================================================================================================================
// 채팅 입력(하단) - 모드(Write/Search/Delete)에 따라 메모 등록, 이 카테고리 안에서의 AI 검색,
// 또는 설명 기반 삭제(2단계: 후보 조회 -> confirm -> 삭제)를 수행한다.
// ==================================================================================================================
// 입력창 맨 앞의 /w(write), /s(search), /r(search와 동일), /d(delete), /m(move) 접두어로 이번 전송 한 번만 모드를 강제 전환한다.
// modeSelect(화면 위 모드 표시)는 그대로 두고, 그 전송에만 접두어 모드를 적용한다.
const sSlashModeMap: { [key: string]: string } = { '/w': 'write', '/s': 'search', '/r': 'search', '/d': 'delete', '/m': 'move' };

// 한글 입력기가 켜진 채로 w/s/r/d/m을 누르면(2벌식 자판) 같은 자리의 자음/모음(ㅈ/ㄴ/ㄱ/ㅇ/ㅡ)이 그대로
// 입력창에 찍힌다 - 그 글자를 다시 원래 영문 키로 되돌려서, 한/영 전환을 깜빡해도 슬래시 모드가 그대로 동작하게 한다.
const sJamoToKey: { [key: string]: string } = { 'ㅈ': 'w', 'ㄴ': 's', 'ㄱ': 'r', 'ㅇ': 'd', 'ㅡ': 'm' };

function NormalizeSlashPrefix(_text: string): string {
    const m = _text.match(/^\/([ㄱ-ㅎㅏ-ㅣ])/);
    const key = m ? sJamoToKey[m[1]] : undefined;
    return key ? '/' + key + _text.slice(2) : _text;
}

function ExtractSlashMode(_text: string): { mode: string | null; text: string } {
    const m = NormalizeSlashPrefix(_text).match(/^(\/[wsrdm])(?:\s+|$)([\s\S]*)$/i);
    if (m) return { mode: sSlashModeMap[m[1].toLowerCase()], text: m[2] };
    return { mode: null, text: _text };
}

async function ComposerSend(): Promise<void> {
    let text = composerTextEl.value.trim();
    if (!text) return;

    const slash = ExtractSlashMode(text);
    const mode = slash.mode ?? modeSelectEl.value;
    if (slash.mode) {
        text = slash.text.trim();
        if (!text) { composerTextEl.value = ''; composerTextEl.style.height = '0'; return; }
    }

    const provider = providerSelectEl.value || undefined;
    const model = modelSelectEl.value || undefined;

    composerTextEl.value = '';
    composerTextEl.style.height = '0';
    submitBtn.disabled = true;

    try {
        if (mode === 'write') {
            pendingEl = AppendChatBubble('user', text, true);
            // categoryId를 생략(null)하면 서버가 내용으로 태그를 뽑아 그 태그를 가진 카테고리에 저장하고,
            // 없으면 그 태그 이름으로 카테고리를 새로 만들어 저장한다(CMemo.AddDataAuto 참고).
            const j = await ApiExe("Memo/Data/Add", { categoryId: activeCatId, text, provider, model }, "json");
            if (!j?.ok) { AppendChatBubble('system', j?.msg || L('memo.msg.failSave', 'Failed to save')); return; }
            if (pendingEl) { pendingEl.remove(); pendingEl = null; }
            if (activeCatId == null) {
                await LoadCategories();
                await SelectCategory((j.data as DataRecord).categoryId);
            } else {
                await LoadData();
            }
            await LoadRecentData();
        } else if (mode === 'search') {
            const userBubble = AppendChatBubble('user', text, true);
            const j = await ApiExe("Memo/Search", { text, categoryId: activeCatId, provider, model }, "json");
            UnpendUserBubble(userBubble);
            if (!j?.ok) { AppendChatBubble('system', j?.msg || L('memo.msg.searchFailed', 'Search failed')); return; }
            AppendChatBubble('ai', j.result);
        } else if (mode === 'move') {
            await ComposerMove(text);
        } else {
            await ComposerDelete(text, provider, model);
        }
    } catch (e) {
        AppendChatBubble('system', L('memo.msg.networkError', 'Network error'));
    } finally {
        submitBtn.disabled = false;
    }
}

// 다른 카테고리에 있는 메모를 "지금 선택된 카테고리"로 옮긴다 - 옮겨올 대상 메모가 있는 카테고리가 아니라,
// 옮겨 담을 카테고리를 선택한 채로 "/m 2" 또는 "/m @2"(2는 그 메모의 id) 형태로 입력한다.
// 카테고리가 선택되어 있지 않으면(어디로 옮길지 알 수 없으므로) 경고만 띄운다.
async function ComposerMove(_text: string): Promise<void> {
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
    if (!j?.ok) { AppendChatBubble('system', j?.msg || L('memo.msg.failMoveMemo', 'Failed to move memo')); return; }

    await LoadData();
    await LoadRecentData();
    AppendChatBubble('system', L('memo.msg.movedMemo', `Moved memo @{id} into "{name}".`)
        .replace('{id}', String(dataId)).replace('{name}', String(GetCategory(activeCatId)?.name ?? activeCatId)));
}

// 숫자만 입력하면 그 id 하나만 바로 삭제, 텍스트에 카테고리 이름이 포함되면 카테고리(+하위+메모)를
// 삭제, 그 외 설명 문장이면 서버에서 메모 후보를 찾아온 뒤 confirm()으로 한 번 확인받고 나서
// 각 후보를 개별 삭제한다.
async function ComposerDelete(_text: string, _provider: string | undefined, _model: string | undefined): Promise<void> {
    AppendChatBubble('user', _text);

    if (/^\d+$/.test(_text)) {
        const id = Number(_text);
        if (!(await ConfirmModal(L('memo.confirm.deleteDataId', 'Delete memo @{id}?').replace('{id}', String(id))))) { AppendChatBubble('system', L('memo.msg.cancelled', 'Cancelled.')); return; }
        const j = await ApiExe("Memo/Data/Delete", { id }, "json");
        if (!j?.ok) { AppendChatBubble('system', j?.msg || L('memo.msg.failDeleteMemo', 'Failed to delete')); return; }
        AppendChatBubble('system', L('memo.msg.deletedMemo', 'Deleted memo @{id}.').replace('{id}', String(id)));
        await LoadData();
        await LoadRecentData();
        return;
    }

    const catMatches = FindCategoryMatches(_text);
    if (catMatches.length > 0) {
        const cat = catMatches[0];
        if (!(await ConfirmModal(CategoryDeleteConfirmMsg(cat)))) { AppendChatBubble('system', L('memo.msg.cancelled', 'Cancelled.')); return; }
        const ok = await PerformCategoryDelete(cat.id);
        AppendChatBubble('system', ok
            ? L('memo.msg.deletedCategory', `Deleted category "{name}".`).replace('{name}', cat.name)
            : L('memo.msg.failDeleteCategoryDone', 'Failed to delete category.'));
        return;
    }

    const found = await ApiExe("Memo/Data/FindByDescription", { text: _text, categoryId: activeCatId, provider: _provider, model: _model }, "json");
    if (!found?.ok) { AppendChatBubble('system', found?.msg || L('memo.msg.searchFailed', 'Search failed')); return; }
    const candidates = found.data as DataRecord[];
    if (candidates.length === 0) { AppendChatBubble('system', L('memo.msg.noMatchingMemos', 'No matching memos found.')); return; }

    const preview = candidates.map(c => `@${c.id} ${c.content.slice(0, 40)}${c.content.length > 40 ? '...' : ''}`).join('\n');
    if (!(await ConfirmModal(L('memo.confirm.deleteCandidates', 'Delete {n} matching memo(s)?\n\n{preview}')
        .replace('{n}', String(candidates.length)).replace('{preview}', preview)))) { AppendChatBubble('system', L('memo.msg.cancelled', 'Cancelled.')); return; }

    let deletedCount = 0;
    for (const c of candidates) {
        const j = await ApiExe("Memo/Data/Delete", { id: c.id }, "json");
        if (j?.ok) deletedCount++;
    }
    AppendChatBubble('system', L('memo.msg.deletedCandidates', 'Deleted {n} of {total} matching memo(s).')
        .replace('{n}', String(deletedCount)).replace('{total}', String(candidates.length)));
    await LoadData();
    await LoadRecentData();
}

submitBtn.addEventListener('click', ComposerSend);
composerTextEl.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ComposerSend(); }
});
composerTextEl.addEventListener('input', () => {
    composerTextEl.style.height = '0';
    composerTextEl.style.height = Math.min(composerTextEl.scrollHeight, 200) + 'px';
});

// ==================================================================================================================
// 전역 단축키 - Tab: 사이드바 열고 닫기. 모드 전환은 입력창에서 /w /s /r /d 접두어로 한다(ExtractSlashMode 참고).
// 입력 중(input/textarea/contentEditable)일 때는 브라우저 기본 동작(Tab 이동)을 막지 않는다.
// ==================================================================================================================
document.addEventListener('keydown', (ev: KeyboardEvent) => {
    const target = ev.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (ev.key === 'Tab') {
        // 메모 입력창(composerText)에서는 항상 사이드바를 토글한다 - 그렇지 않으면 닫힐 때 입력창으로
        // 포커스가 이동한 뒤 다음 탭이 전송 버튼으로 넘어가버려서 매번 두 번 눌러야 하는 문제가 생긴다.
        // 비밀번호/카테고리 이름 같은 다른 입력 필드에서는 평범한 탭 이동을 그대로 둔다.
        if (isTyping && target !== composerTextEl) return;
        ev.preventDefault();
        ToggleCatSidebar();
        return;
    }
    if (ev.key === 'F1' || ev.key === 'F2' || ev.key === 'F3' || ev.key === 'F4' || ev.key === 'F7') {
        ev.preventDefault();
        if (window.top) CIframeMsg.Send(window.top, 'home-hotkey', { key: ev.key });
        return;
    }
});

// ==================================================================================================================
// 유틸
// ==================================================================================================================
function EscapeHtml(_s: string): string {
    const div = document.createElement('div');
    div.textContent = _s;
    return div.innerHTML;
}

// 네이티브 confirm() 대신 아티젠이 제공하는 CConfirm(Yes/No 모달)을 쓴다.
function ConfirmModal(_text: string, _yesText = L('memo.common.yes', 'Yes'), _noText = L('memo.common.no', 'No')): Promise<boolean> {
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

// 네이티브 prompt() 대신 Home.ts의 CreateFolder 등과 동일한 패턴 - CConfirm 본문에 <input>을
// 넣고 Yes 콜백에서 값을 읽는다. 취소(No)면 null.
function PromptText(_label: string, _defaultValue = ''): Promise<string | null> {
    return new Promise(resolve => {
        const inputId = 'promptTextInput_' + Math.random().toString(36).slice(2);
        const c = new CConfirm();
        c.SetBody(`${EscapeHtml(_label)}<br><input type="text" id="${inputId}" class="form-control form-control-sm" value="${EscapeHtml(_defaultValue)}">`);
        c.SetConfirm(CConfirm.eConfirm.YesNo, [
            () => resolve((document.getElementById(inputId) as HTMLInputElement | null)?.value ?? null),
            () => resolve(null),
        ], [L('memo.common.ok', 'OK'), L('memo.common.cancel', 'Cancel')]);
        c.Open();
        setTimeout(() => {
            const el = document.getElementById(inputId) as HTMLInputElement | null;
            el?.focus();
            el?.select();
        }, 50);
    });
}

// ==================================================================================================================
// 초기화
// ==================================================================================================================
ShowAuthOrLoad();
