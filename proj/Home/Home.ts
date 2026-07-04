//Version
import "../../artgine/artgine.js"

//Class
import {CClass} from "../../artgine/basic/CClass.js";
import { MountDownloadTab } from "./Downloads/DownloadTab.js";
CClass.Push(MountDownloadTab);
//Atelier
import {CPreferences} from "../../artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "Null";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = true;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = false;
gPF.mCanvas = "";
gPF.mServer = 'webServer';
gPF.mGitHub = false;
gPF.mVersion = "mr6bwtd7_2";

import {CAtelier} from "../../artgine/app/CAtelier.js";

import {CPlugin} from "../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import {CObject} from "../../artgine/basic/CObject.js"
import { CSing, CSingOption } from "../../artgine/server/CSing.js";
import { CConfirm, CModal } from "../../artgine/basic/CModal.js";
import { CUtil } from "../../artgine/basic/CUtil.js";
import { CUtilWeb } from "../../artgine/util/CUtilWeb.js";
import { CStorage } from "../../artgine/system/CStorage.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CDOM } from "../../artgine/basic/CDOM.js";
import { CLan } from "../../artgine/basic/CLan.js";
import { CFecth } from "../../artgine/network/CFecth.js";
import { CPath } from "../../artgine/basic/CPath.js";
import { getAuthToken, setAuthToken, removeAuthToken } from "../../artgine/server/CAuthToken.js";
import { CFileViewer, CMDViewer, CSheetViewer, CModalStackMsg, CModalMusic } from "../../artgine/util/CModalUtil.js";
import { CWebSocket } from '../../artgine/network/CWebSocket.js';
import { CPWA } from '../../artgine/system/CPWA.js';
import { Bootstrap } from "../../artgine/basic/Bootstrap.js";


if(gPF.mServer!="webServer")
    CAlert.E("Server setting is invalid.");

//CStorage.Set("privateKey",null);

CUtilWeb.Parameter("")



// CModal.Open() 직후엔 모달 본문 DOM이 아직 붙기 전이라, 내부 요소에 접근하려면
// 한 틱 양보해야 한다. 이벤트 바인딩/포커스용 공통 지연(ms).
const MODAL_DOM_DELAY = 100;
const DEFAULT_AUTH_PASSWORD = 'artgine';

function warnIfDefaultAuthPassword(pw: string) {
    if (pw === DEFAULT_AUTH_PASSWORD) CAlert.E("Please change the default password.");
}

// ---- AI tab: session list ----
// 토큰은 로그인 시 저장해두는 relog 자격증명일 뿐이며, 일반 요청 인증은
// 같은 출처(same-origin) fetch가 자동 전송하는 세션 쿠키로 처리된다.

const aiFrameContainer = CDOM.ID("ai-frame-container") as HTMLDivElement;
const aiFramePlaceholder = CDOM.ID("ai-frame-placeholder") as HTMLDivElement;
function updateFramePlaceholder() {
    aiFramePlaceholder.style.display = activeFrameKey ? 'none' : '';
}
const aiSessionList = CDOM.ID("aiSessionList");
const aiNewChatBtn = CDOM.ID("aiNewChatBtn");

// ---- 다국어(CLan) ----
// 기본 텍스트는 영문(HTML innerHTML / CLan.Get 기본값)이고, 한국어 등 추가 언어만 등록한다.
// 미등록 언어는 영문으로 폴백되므로 안전하다(브라우저 언어 자동감지 = CUtil.Language()).
function registerHomeLan(): void {
    const ko = CLan.eType.ko;
    CLan.Set(ko, "ai.providerStatus", "프로바이더 상태");
    CLan.Set(ko, "ai.refresh", "갱신");
    CLan.Set(ko, "ai.shortcuts", "단축키");
    CLan.Set(ko, "ai.global", "전역");
    CLan.Set(ko, "ai.panel", "AI 패널");
    CLan.Set(ko, "ai.insideTerm", "터미널 내부");
    // Provider 상태 라벨 (JS 생성)
    CLan.Set(ko, "ai.ready", "준비됨");
    CLan.Set(ko, "ai.notInstalled", "미설치");
    CLan.Set(ko, "ai.notAuth", "인증 안됨");
    CLan.Set(ko, "ai.weekly", "주간");
    CLan.Set(ko, "ai.usageRemaining", "남음");
    CLan.Set(ko, "ai.nodeRequired", "Node.js가 설치되어 있지 않습니다. Provider 상태 페이지에서 확인 후 Node.js를 설치해 주세요.");
    CLan.Set(ko, "memo.authNotice", "프로바이더 인증이 안 되어 있으면 작동하지 않을 수 있습니다.");
    // 단축키 설명 (kbd 마크업 포함)
    CLan.Set(ko, "ai.kb.f1", "<kbd>F1</kbd> 파일 탭 + 파일 관리자로 이동");
    CLan.Set(ko, "ai.kb.f2", "<kbd>F2</kbd> 파일 탭 + 파일 검색으로 이동");
    CLan.Set(ko, "ai.kb.f3", "<kbd>F3</kbd> RDP 탭으로 이동");
    CLan.Set(ko, "ai.kb.f4", "<kbd>F4</kbd> AI 탭으로 이동");
    CLan.Set(ko, "ai.kb.tab", "<kbd>Tab</kbd> 사이드바 토글");
    CLan.Set(ko, "ai.kb.123", "<kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> Chat / Terminal / Brow 서브탭 전환");
    CLan.Set(ko, "ai.kb.updown", "<kbd>&uarr;</kbd> / <kbd>&darr;</kbd> 세션 목록 이동 (사이드바 열림)");
    CLan.Set(ko, "ai.kb.right", "<kbd>&rarr;</kbd> 알림 세션으로 이동");
    CLan.Set(ko, "ai.kb.left", "<kbd>&larr;</kbd> 이전 세션으로 복귀");
    CLan.Set(ko, "ai.kb.shiftN", "<kbd>Shift</kbd>+<kbd>N</kbd> 새 터미널 (Terminal 서브탭, 사이드바 열림)");
    CLan.Set(ko, "ai.kb.shiftD", "<kbd>Shift</kbd>+<kbd>D</kbd> 현재 터미널 세션 삭제");
    CLan.Set(ko, "ai.kb.enter", "<kbd>Enter</kbd> 입력 전송 (<kbd>Shift</kbd>+<kbd>Enter</kbd> 줄바꿈)");
    CLan.Set(ko, "ai.kb.tabAuto", "<kbd>Tab</kbd> 자동완성 적용");
    CLan.Set(ko, "ai.kb.esc", "<kbd>Esc</kbd> 자동완성 닫기");
    CLan.Set(ko, "ai.kb.updownAuto", "<kbd>&uarr;</kbd> / <kbd>&darr;</kbd> 자동완성 탐색, 입력이 비었을 때 커서 이동");
    CLan.Set(ko, "ai.kb.ctrlT", "<kbd>Ctrl</kbd>+<kbd>T</kbd> 맨 아래로 스크롤");
    CLan.Set(ko, "ai.kb.f6", "<kbd>F6</kbd> SUPER(자동 승인) 토글 + 입력창 포커스");
}

// data-CLan 요소에 현재 언어 번역을 적용한다. 기존 innerHTML(영문)을 기본값으로 쓰므로
// 미등록 키/언어는 원문이 유지된다(CDOM.RefreshDataCLan과 달리 null로 지우지 않음).
function applyLanIn(root: HTMLElement | null): void {
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-CLan]').forEach(el => {
        const key = el.getAttribute('data-CLan');
        if (!key) return;
        if (el instanceof HTMLInputElement) {
            const t = CLan.Get(key, el.placeholder);
            if (t != null) el.placeholder = t;
        } else {
            const t = CLan.Get(key, el.innerHTML);
            if (t != null) el.innerHTML = t;
        }
    });
}

registerHomeLan();
applyLanIn(document.getElementById('ai-frame-placeholder') as HTMLElement | null);

// 인증 여부와 무관하게 즉시 호출 가능한 엔드포인트라 페이지 접속과 동시에 조회한다.
interface IProviderStateEntry { id: string; installed: boolean; authenticated: boolean; version: string; models: { value: string; label: string }[]; usage: { fiveHour: number; weekly: number }; }
interface INodeState { installed: boolean; version: string; }
interface IProviderStateResp { node: INodeState; providers: IProviderStateEntry[]; }
// 노드 설치 여부 캐시. provider-state는 프로바이더 버전/인증 probing(최대 수초)으로 무거우므로,
// 매번 재조회하지 않고 페이지 로드/갱신 버튼에서 받아온 값을 재사용한다. null = 아직 미확인.
let _nodeInstalled: boolean | null = null;
async function loadAiProviderStatus() {
    const el = document.getElementById('aiProviderStatus');
    if (!el) return;
    const btn = document.getElementById('aiProviderRefreshBtn') as HTMLButtonElement | null;
    const icon = btn?.querySelector('i');
    if (btn) btn.disabled = true;
    icon?.classList.add('spin');
    try {
        const r = await fetch(CPath.WebRootUrl() + 'cmd/provider-state');
        const resp: IProviderStateResp = await r.json();
        const node = resp.node;
        _nodeInstalled = !!node?.installed; // 갱신 시점마다 캐시 갱신
        const providers = resp.providers ?? [];
        // node 상태 행: 설치 시 초록(Ready), 미설치 시 회색.
        const nodeRowClass = node?.installed ? 'bg-success-subtle' : 'bg-secondary-subtle';
        const nodeIcon = node?.installed ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-secondary';
        const nodeStatus = node?.installed ? CLan.Get('ai.ready', 'Ready') : CLan.Get('ai.notInstalled', 'Not Installed');
        const nodeVer = node?.version ? `<span class="text-secondary ms-2" style="font-size:0.85em;">v${node.version}</span>` : '';
        const nodeStatusHtml = node?.installed
            ? `<span class="d-flex align-items-center gap-1"><i class="bi ${nodeIcon}"></i>${nodeStatus}</span>`
            : `<button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" id="aiNodeDownloadBtn"><i class="bi ${nodeIcon}"></i>${nodeStatus}</button>`;
        const nodeRow = `<div class="d-flex align-items-center justify-content-between rounded px-3 py-2 ${nodeRowClass}" style="font-size:1.05rem;">
                <span class="fw-semibold">Node.js${nodeVer}</span>
                ${nodeStatusHtml}
            </div>`;
        el.innerHTML = nodeRow + providers.map(p => {
            const rowClass = !p.installed ? 'bg-secondary-subtle' : p.authenticated ? 'bg-success-subtle' : 'bg-warning-subtle';
            const icon = !p.installed ? 'bi-x-circle text-secondary' : p.authenticated ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle-fill text-warning';
            const status = !p.installed ? CLan.Get('ai.notInstalled', 'Not Installed') : p.authenticated ? CLan.Get('ai.ready', 'Ready') : CLan.Get('ai.notAuth', 'Not Authenticated');
            const ver = p.version ? `<span class="text-secondary ms-2" style="font-size:0.85em;">v${p.version}</span>` : '';
            const statusHtml = !p.installed
                ? `<button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 ai-provider-launch-btn" data-provider="${p.id}"><i class="bi ${icon}"></i>${status}</button>`
                : `<span class="d-flex align-items-center gap-1"><i class="bi ${icon}"></i>${status}</span>`;
            // usage.fiveHour/weekly: 0~1 남은 비율, -1이면 조회 실패/미지원이라 표시하지 않는다.
            const pct = (v: number) => Math.round(v * 100);
            const usageParts: string[] = [];
            if (p.usage?.fiveHour >= 0) usageParts.push(`5h ${pct(p.usage.fiveHour)}%`);
            if (p.usage?.weekly >= 0)   usageParts.push(`${CLan.Get('ai.weekly', '주간')} ${pct(p.usage.weekly)}%`);
            const usageHtml = usageParts.length
                ? `<div class="text-secondary mt-1" style="font-size:0.8em;">${usageParts.join(' · ')} ${CLan.Get('ai.usageRemaining', '남음')}</div>`
                : '';
            return `<div class="rounded px-3 py-2 ${rowClass}" style="font-size:1.05rem;">
                <div class="d-flex align-items-center justify-content-between">
                    <span class="fw-semibold text-capitalize">${p.id}${ver}</span>
                    ${statusHtml}
                </div>
                ${usageHtml}
            </div>`;
        }).join('');
        document.getElementById('aiNodeDownloadBtn')?.addEventListener('click', () => {
            window.open('https://nodejs.org/en/download', '_blank');
        });
        el.querySelectorAll<HTMLButtonElement>('.ai-provider-launch-btn').forEach(b => {
            b.addEventListener('click', () => termStartNew(b.dataset.provider as Parameters<typeof termStartNew>[0]));
        });
    } catch (e) { console.error('provider-state error:', e); }
    finally {
        if (btn) btn.disabled = false;
        icon?.classList.remove('spin');
    }
}
loadAiProviderStatus();
document.getElementById('aiProviderRefreshBtn')?.addEventListener('click', () => loadAiProviderStatus());

// AI 사이트 바로가기 버튼: 모바일이면 앱 스킴 먼저 시도, 미설치 시 웹으로 폴백
function openAiSite(appUrl: string, webUrl: string) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && appUrl !== webUrl) {
        // 앱 스킴 시도 후 1.5초 내 페이지가 그대로면 웹으로 폴백
        const t = setTimeout(() => { window.open(webUrl, '_blank', 'noopener,noreferrer'); }, 1500);
        window.addEventListener('blur', () => clearTimeout(t), { once: true }); // 앱이 열리면 blur 발생 → 타이머 취소
        window.location.href = appUrl;
    } else {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
}
document.querySelectorAll<HTMLButtonElement>('.ai-site-launch-btn').forEach(btn => {
    btn.addEventListener('click', () => openAiSite(btn.dataset.app ?? btn.dataset.web!, btn.dataset.web!));
});

// AI 탭의 프로바이더 상태(placeholder) 페이지로 이동: 활성 프레임을 숨겨 placeholder를 노출하고 상태를 갱신한다.
function goProviderStatusPage() {
    showTab('ai-tab');
    if (activeFrameKey) {
        const f = iframePool.get(activeFrameKey);
        if (f) f.style.display = 'none';
        activeFrameKey = null;
        updateFramePlaceholder();
    }
    loadAiProviderStatus();
}

// 터미널/채팅/메모 실행 전 노드 설치 여부를 확인한다.
// 캐시(_nodeInstalled)를 우선 사용하고, 아직 미확인(null)일 때만 1회 조회한다.
// 미설치(또는 확인 실패) 시 프로바이더 상태 페이지로 보내고 설치를 안내한 뒤 false를 반환한다.
async function ensureNodeInstalled(): Promise<boolean> {
    if (_nodeInstalled === null) {
        // 페이지 로드 시 loadAiProviderStatus가 아직 못 받아온 경우에만 1회 조회
        try {
            const r = await fetch(CPath.WebRootUrl() + 'cmd/provider-state');
            const resp: IProviderStateResp = await r.json();
            _nodeInstalled = !!resp?.node?.installed;
        } catch (e) { console.error('node check error:', e); _nodeInstalled = false; }
    }
    if (_nodeInstalled) return true;
    goProviderStatusPage();
    CAlert.E(CLan.Get('ai.nodeRequired', 'Node.js is not installed. Please check the Provider status page and install Node.js.'));
    return false;
}

// ---- iframe pool: 세션별 iframe을 유지하고 show/hide만 토글 ----
// key 규칙: 'chat:<sid>', 'term:<token>', 'term-new:<localId>'
const iframePool = new Map<string, HTMLIFrameElement>();
let activeFrameKey: string | null = null;
let pendingNewSid: string | null = null; // 서버에 아직 없는 새 세션 (첫 메시지 전)

let _activeNotifCallback: (() => void) | null = null;

function isAiPanelActive(): boolean {
    return document.getElementById('ai-panel')?.classList.contains('active') === true;
}

function isRdpPanelActive(): boolean {
    return document.getElementById('rdp-panel')?.classList.contains('active') === true;
}

function isAiAuthVisible(): boolean {
    const overlay = document.getElementById('ai-auth-overlay');
    return !!overlay && overlay.style.display !== 'none';
}

function handleTermSidebarShortcut(e: KeyboardEvent): boolean {
    if (!isAiPanelActive()) return false;
    if (isAiAuthVisible()) return false;
    if (!aiSidebarEl.classList.contains('show')) return false;
    if (e.shiftKey && !e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        e.stopPropagation();
        termStartNew('cmd');
        return true;
    }
    if (e.shiftKey && !e.ctrlKey && e.key.toLowerCase() === 'd') {
        if (!activeFrameKey?.startsWith('term:')) return false;
        e.preventDefault();
        e.stopPropagation();
        termConfirmKillSession(activeFrameKey.slice(5));
        return true;
    }
    return false;
}

function _showModalStackMsg(label: string, content?: string, onClick?: () => void) {
    const m = new CModalStackMsg(CModal.ePos.TopRight);
    m.SetBG(Bootstrap.eColor.warning);
    m.SetSize(260, content ? 69 : 49);
    const nid = `notif_${Date.now()}`;
    const cursor = onClick ? 'cursor:pointer;' : '';
    m.SetBody(`<div id="${nid}" class="px-3 py-2" style="width:260px;overflow:hidden;${cursor}">
        <div class="small fw-semibold text-truncate">${label}</div>
        ${content ? `<div class="small text-secondary text-truncate mt-1">${content}</div>` : ''}
    </div>`);
    m.Open();
    if (onClick) {
        _activeNotifCallback = onClick;
        setTimeout(() => {
            document.getElementById(nid)?.addEventListener('click', () => {
                onClick(); m.Close(); _activeNotifCallback = null;
            });
        }, 0);
    }
    m.Close(8);
    setTimeout(() => { if (_activeNotifCallback === onClick) _activeNotifCallback = null; }, 8000);
}

function _showDoneNotification(label: string, content?: string, onClick?: () => void) {
    if (!document.hasFocus()) {
        // 포커스 없을 때: 브라우저 알림 우선, 실패 시 CModalStackMsg로 폴백
        CUtilWeb.Notify(label, content ?? "", "", onClick ? () => onClick() : null).then(failed => {
            if (!failed) return;
            _showModalStackMsg(label, content, onClick);
        });
    } else {
        // 포커스 있을 때: CModalStackMsg 사용
        _showModalStackMsg(label, content, onClick);
    }
}

function isActiveFrame(key: string): boolean {
    return activeFrameKey === key;
}


// 채팅/터미널/웹 세 종류 모두 showFrame()을 통해서만 iframe이 생성/전환되므로,
// 여기서 영역 크기를 강제로 재계산해 적용하면 셋 다 한 곳에서 통합 제어된다.
// 탭바(#myTab) 높이는 모바일에서 요소가 늘어나 줄바꿈되는 등 가변적이라
// CSS(vh/dvh, flex)에 맡기지 않고 매번 실측해서 px로 직접 박아 넣는다.
const myAppContainerEl = document.querySelector('.container') as HTMLElement;
const myTabBarEl = document.getElementById('myTab') as HTMLElement;
const myTabContentEl = document.getElementById('myTabContent') as HTMLElement;
const FILE_LIST_AUTHED_CLASS = 'file-list-authed';

function installFileAuthIndicatorStyle() {
    if (document.getElementById('file-auth-indicator-style')) return;
    const style = document.createElement('style');
    style.id = 'file-auth-indicator-style';
    style.textContent = `
        #fileUrlBar.${FILE_LIST_AUTHED_CLASS} {
            background-color: var(--bs-primary-bg-subtle);
            border-color: var(--bs-primary) !important;
        }
#fileUrlBar.${FILE_LIST_AUTHED_CLASS} #fileUrlCopyBtn {
            border-color: var(--bs-primary);
            color: var(--bs-primary);
        }
    `;
    document.head.appendChild(style);
}

function applyFileAuthIndicator(authed: boolean) {
    const urlBar = document.getElementById('fileUrlBar');
    if (!urlBar) return;
    urlBar.classList.toggle(FILE_LIST_AUTHED_CLASS, authed);
    urlBar.title = authed ? 'File admin authenticated' : '';
}

installFileAuthIndicatorStyle();

function syncFrameContainerSize() {
    if (!myAppContainerEl || !myTabBarEl || !myTabContentEl) return;
    // 레이아웃 뷰포트(innerHeight) 기준으로 잡는다. visualViewport.height는 iOS에서
    // 키보드가 올라오면 줄어드는데, 그 값을 컨테이너 높이에 박으면 컨테이너가 키보드 위로
    // 축소되고 그 아래로 페이지 배경(흰색)이 노출돼 "흰 화면"이 된다. 키보드는 컨테이너
    // 위에 겹쳐지게 두고, 컨테이너 자체는 키보드에 영향받지 않는 innerHeight를 쓴다.
    const viewportH = window.innerHeight;
    myAppContainerEl.style.height = `${viewportH}px`;
    const tabBarH = myTabBarEl.getBoundingClientRect().height;
    // flex-fill이 자체적으로 다시 계산해버리지 못하도록 인라인으로 고정
    myTabContentEl.style.flex = '0 0 auto';
    myTabContentEl.style.height = `${Math.max(0, viewportH - tabBarH)}px`;
}
syncFrameContainerSize();
window.addEventListener('resize', syncFrameContainerSize);
window.addEventListener('orientationchange', syncFrameContainerSize);
if (myTabBarEl) new ResizeObserver(syncFrameContainerSize).observe(myTabBarEl);

// 부트스트랩 탭/서브탭 전환. target은 요소 id이거나 셀렉터([..], #.., ...) 둘 다 허용.
function showTab(target: string) {
    const el = /^[[#.]/.test(target) ? document.querySelector(target) : document.getElementById(target);
    if (el) (window as any).bootstrap.Tab.getOrCreateInstance(el as HTMLElement).show();
}

// F1~F4 전역 단축키. iframe keydown·postMessage·document keydown 세 진입점에서 공용으로 호출한다.
function runHomeHotkey(key: string): boolean {
    switch (key) {
        case 'F1': showTab('file-tab'); FileBtn(); return true;
        case 'F2': showTab('file-tab'); FileSearch(); return true;
        case 'F3': showTab('rdp-tab'); return true;
        case 'F4': showTab('ai-tab'); return true;
        case 'F7': showTab('memo-tab'); return true;
    }
    return false;
}

// 화면 캡처 폴링을 하는 iframe(browser:, rdp:)에 표시 여부를 알려준다.
// display:none 토글은 iframe 내부 document의 visibilitychange를 발생시키지 않으므로 postMessage로 직접 알린다.
function postFrameVisible(f: HTMLIFrameElement | null | undefined, visible: boolean) {
    try { f?.contentWindow?.postMessage({ type: 'frame-visibility', visible }, '*'); } catch (_) {}
}

function postFrameMessage(key: string, msg: any) {
    const f = iframePool.get(key);
    try { f?.contentWindow?.postMessage(msg, '*'); } catch (_) {}
}

// ---- 공통 iframe 풀 관리 ----
// AI 탭(chat/term/browser)과 RDP 탭은 각자 독립된 Map/container/activeKey를 쓰지만,
// "있으면 재사용, 없으면 생성 후 보이기/숨기기 토글" 로직 자체는 동일하므로 여기서 통합한다.
// 탭마다 다른 부분(생성 시 1회성 와이어링, 전환 시 부가 동작)은 ctx의 훅으로 주입한다.
interface FramePoolCtx {
    pool: Map<string, HTMLIFrameElement>;
    container: HTMLElement;
    getActiveKey: () => string | null;
    setActiveKey: (key: string | null) => void;
    updatePlaceholder: () => void;
    onCreate?: (f: HTMLIFrameElement, key: string) => void;
    onActivate?: (key: string, prevKey: string | null) => void;
}

function showPooledFrame(ctx: FramePoolCtx, key: string, src: string): HTMLIFrameElement {
    let f = ctx.pool.get(key);
    if (!f) {
        f = document.createElement('iframe');
        f.src = src;
        f.style.display = 'none';
        ctx.onCreate?.(f, key);
        ctx.container.appendChild(f);
        ctx.pool.set(key, f);
    }
    const prevKey = ctx.getActiveKey();
    if (prevKey && prevKey !== key) {
        const prev = ctx.pool.get(prevKey);
        if (prev) prev.style.display = 'none';
    }
    f.style.display = 'block';
    ctx.setActiveKey(key);
    ctx.updatePlaceholder();
    ctx.onActivate?.(key, prevKey);
    return f;
}

function destroyPooledFrame(ctx: FramePoolCtx, key: string) {
    const f = ctx.pool.get(key);
    if (!f) return;
    f.remove();
    ctx.pool.delete(key);
    if (ctx.getActiveKey() === key) ctx.setActiveKey(null);
    ctx.updatePlaceholder();
}

const noFocusTermKeys = new Set<string>(); // 키보드 ↑/↓로 세션 탐색 중 새로 만들어지는 터미널 iframe엔 자동 포커스를 막는다 (key별 1회성)

function isAiTabActive(): boolean { return CDOM.ID('ai-tab').classList.contains('active'); }
function isBrowserSubtabActive(): boolean { return CDOM.ID('ai-browser-subtab').classList.contains('active'); }

// browser: 세션 iframe은 ai-tab과 ai-browser-subtab이 둘 다 활성 상태여야 실제로 보이는 상태다.
function updateBrowserFrameVisibility() {
    if (!activeFrameKey?.startsWith('browser:')) return;
    const f = iframePool.get(activeFrameKey);
    postFrameVisible(f, isAiTabActive() && isBrowserSubtabActive());
}

const aiFrameCtx: FramePoolCtx = {
    pool: iframePool,
    container: aiFrameContainer,
    getActiveKey: () => activeFrameKey,
    setActiveKey: (key) => { activeFrameKey = key; },
    updatePlaceholder: updateFramePlaceholder,
    onCreate: (f, key) => {
        f.setAttribute('allow', 'clipboard-read; clipboard-write');
        f.addEventListener('load', () => {
                const isTerm = key.startsWith('term:') || key.startsWith('term-new:');
                if (isTerm) {
                    if (noFocusTermKeys.has(key)) { noFocusTermKeys.delete(key); }
                    else { postFrameMessage(key, { type: 'focus-input' }); }
                }
                try {
                    f.contentWindow?.addEventListener('keydown', (e) => {
                    if (isTerm && handleTermSidebarShortcut(e)) return;
                    if (!isTerm && e.key === 'Tab') { e.preventDefault(); handleTabKey(); return; }
                    if (!isTerm && e.key === 'ArrowRight' && _activeNotifCallback) { e.preventDefault(); handleNotifKey(); return; }
                    if (!isTerm && e.key === 'ArrowLeft' && goPrevFrame()) { e.preventDefault(); return; }
                    if (!isTerm && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                        if (aiSidebarEl.classList.contains('show')) { e.preventDefault(); goNextSession(e.key === 'ArrowUp' ? -1 : 1); return; }
                    }
                    if (!isTerm && (e.key === '1' || e.key === '2' || e.key === '3') && !e.ctrlKey && !e.altKey && !e.metaKey) {
                        if (aiSidebarEl.classList.contains('show')) {
                            const target = e.target as HTMLElement;
                            if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable)) {
                                e.preventDefault();
                                const subtabs = ['ai-chat-subtab', 'ai-term-subtab', 'ai-browser-subtab'];
                                showTab(subtabs[parseInt(e.key) - 1]);
                                return;
                            }
                        }
                    }
                    if (!isTerm && (e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4' || e.key === 'F7')) {
                        e.preventDefault();
                        runHomeHotkey(e.key);
                    }
                }, true);
            } catch (_) {}
        });
    },
    onActivate: (key, prevKey) => {
        if (prevKey && prevKey.startsWith('browser:')) postFrameVisible(iframePool.get(prevKey), false);
        if (key.startsWith('browser:')) updateBrowserFrameVisibility();
    },
};

function showFrame(key: string, src: string): HTMLIFrameElement {
    syncFrameContainerSize();
    return showPooledFrame(aiFrameCtx, key, src);
}

function destroyFrame(key: string) {
    destroyPooledFrame(aiFrameCtx, key);
}

function focusActiveFrame() {
    if (!activeFrameKey) return;
    if (activeFrameKey.startsWith('term:') || activeFrameKey.startsWith('term-new:')) {
        postFrameMessage(activeFrameKey, { type: 'focus-input' });
        return;
    }
    const f = iframePool.get(activeFrameKey);
    if (!f) return;
    try {
        f.contentWindow?.focus();
        const input = f.contentDocument?.querySelector<HTMLElement>('textarea, input');
        if (input) {
            input.focus();
            return;
        }
    } catch (_) {}
    f.focus();
}

function focusActiveFrameIfSidebarCollapsed() {
    if (aiSidebarEl.classList.contains('show')) return;
    setTimeout(() => focusActiveFrame(), 0);
}

function uuidv4(): string {
    if (crypto && 'randomUUID' in crypto) return (crypto as any).randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 같은 출처(same-origin) 요청이라 세션 쿠키가 자동 전송된다 → 토큰 별도 첨부 불필요.
// AI 채팅·터미널·브라우저 세션 API 공용.
function authedFetch(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, init);
}

function aiFormatRelative(ts?: number): string {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 0 || isNaN(diff)) return '';
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}mo`;
    return `${Math.floor(mo / 12)}y`;
}

function aiEscapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}

function aiLoadSession(sid: string) {
    showFrame(`chat:${sid}`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(sid)}`);
    aiRefreshSessions();
    termRefreshSessions();
}

async function aiRefreshSessions() {
    if (document.querySelector('.dropdown-menu.show')) return;
    const token = getAuthToken(CPath.WebRootUrl());
    if (!token) {
        aiSessionList.innerHTML = '<div class="text-center text-secondary small p-3">Please sign in from AI Chat first.</div>';
        return;
    }
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'ai/chat/sessions?limit=30');
        if (r.status === 401) {
            removeAuthToken(CPath.WebRootUrl());
            refreshFileAuthState();
            aiShowAuthOrLoad();
            return;
        }
        const j = await r.json();
        if (!j.ok) return;
        aiSessionList.innerHTML = '';
        const sessions = j.sessions as { sessionId: string; title: string; updatedAt?: number; busy?: boolean; lastMsg?: string; workingDir?: string }[];
        const serverSids = new Set(sessions.map(s => s.sessionId));
        for (const key of Array.from(iframePool.keys())) {
            if (!key.startsWith('chat:')) continue;
            if (pendingNewSid && key === `chat:${pendingNewSid}`) continue; // 새 세션 보호
            if (!serverSids.has(key.slice(5))) destroyFrame(key);
        }
        for (const s of sessions) {
            const key = `chat:${s.sessionId}`;
            const isActive = activeFrameKey === key;
            const isLoaded = iframePool.has(key);
            const rel = aiFormatRelative(s.updatedAt);
            const st: SessState = !isLoaded ? 'off' : s.busy ? 'busy' : 'idle';
            syncSessState(`chat:${s.sessionId}`, st, () => {
                if (!isActiveFrame(key) || !document.hasFocus())
                    _showDoneNotification(aiEscapeHtml(s.title), s.lastMsg ? aiEscapeHtml(s.lastMsg) : undefined, () => aiLoadSession(s.sessionId));
            });
            const dot = st === 'off'  ? '<span class="text-danger small" title="미연결">●</span>'
                      : st === 'busy' ? '<span class="ai-busy-dot text-warning small" title="처리 중">●</span>'
                      :                 '<span class="text-success small" title="대기 중">●</span>';
            const item = createSessionItem({
                activeClass: 'bg-primary-subtle',
                isActive,
                dataAttr: { name: 'sid', value: s.sessionId },
                leftHtml: `
                <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
                    ${dot}
                    ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
                </span>`,
                bodyHtml: `
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    <span class="text-truncate small">${aiEscapeHtml(s.title)}</span>
                    ${s.workingDir ? `<span class="text-secondary" style="font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;">${aiEscapeHtml(s.workingDir)}</span>` : ''}
                </span>`,
                deleteAct: 'delete',
                deleteLabel: '🗑️ Delete Session',
                onClick: () => aiLoadSession(s.sessionId),
                onShare: () => aiShowShareLink(s.sessionId, s.title),
                onDelete: () => {
                    const delConfirm = new CConfirm();
                    delConfirm.SetBody(`Delete "${aiEscapeHtml(s.title)}"?`);
                    delConfirm.SetConfirm(CConfirm.eConfirm.YesNo, [
                        async () => {
                            await authedFetch(`${CPath.WebRootUrl()}ai/chat/session?id=${s.sessionId}`, { method: 'DELETE' });
                            destroyFrame(key);
                            aiRefreshSessions();
                            termRefreshSessions();
                        },
                        () => {},
                    ], ["Delete", "Cancel"]);
                    delConfirm.Open();
                },
                popup: { url: () => `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(s.sessionId)}`, title: s.title, winName: `chat_${s.sessionId}` },
            });
            aiSessionList.appendChild(item);
        }
    } catch (e) { console.error('AI session list error:', e); }
}

function refreshSessionsSoon() {
    // 새 채팅은 첫 메시지 시점, 새 터미널은 ttyd 기동 후에 서버에 등록되므로
    // 짧은/긴 두 시점에 재요청해서 리스트를 따라가게 한다.
    setTimeout(() => { aiRefreshSessions(); termRefreshSessions(); }, 1500);
    setTimeout(() => { aiRefreshSessions(); termRefreshSessions(); }, 4000);
}

aiNewChatBtn.addEventListener('click', () => chatStartNew());

function chatStartNew(initialWorkingDir?: string) {
    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">New Chat</p>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Working Directory</label>
            <input id="chat-opt-workingDir" type="text" class="form-control form-control-sm" placeholder="e.g. D:/MyProject" autocomplete="off">
        </div>
        <div class="mb-3 d-flex gap-4">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="chat-opt-mcp">
                <label class="form-check-label small text-secondary" for="chat-opt-mcp">MCP</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="chat-opt-mdcopy" checked>
                <label class="form-check-label small text-secondary" for="chat-opt-mdcopy">Copy MD</label>
            </div>
        </div>
        <div class="d-flex justify-content-between">
            <button id="chat-modal-open" class="btn btn-primary">Open</button>
            <button id="chat-modal-cancel" class="btn btn-danger ms-2">Cancel</button>
        </div>`;

    const modal = new CModal();
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const mcpCheck        = container.querySelector<HTMLInputElement>('#chat-opt-mcp')!;
        const mdcopyCheck     = container.querySelector<HTMLInputElement>('#chat-opt-mdcopy')!;
        const workingDirInput = container.querySelector<HTMLInputElement>('#chat-opt-workingDir')!;
        if (initialWorkingDir) workingDirInput.value = initialWorkingDir;

        const doOpen = async () => {
            if (!(await ensureNodeInstalled())) { modal.Close(); return; }
            const sid = uuidv4();
            const workingDir = workingDirInput.value.trim();
            const params = new URLSearchParams({ session: sid });
            if (!mcpCheck.checked) params.set('mcp', '0');
            if (workingDir) params.set('workingDir', workingDir);
            if (mdcopyCheck.checked) params.set('mdcopy', '1');
            pendingNewSid = sid;
            showFrame(`chat:${sid}`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?${params.toString()}`);
            aiRefreshSessions();
            termRefreshSessions();
            refreshSessionsSoon();
            modal.Close();
        };

        container.querySelector<HTMLButtonElement>('#chat-modal-open')!.addEventListener('click', doOpen);
        container.querySelector<HTMLButtonElement>('#chat-modal-cancel')!.addEventListener('click', () => modal.Close());
        workingDirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doOpen(); });
    }, MODAL_DOM_DELAY);
}

// ---- Terminal session management ----
const termNewBtn = CDOM.ID("termNewBtn");
const termSessionList = CDOM.ID("termSessionList");
let termActivePort: number | null = null;

// ---- 세션 상태(빨강 off / 주황 busy / 초록 idle)를 1곳에서 관리 ----
// 알림은 트랙/주황(초록→busy·wait·idle) 전환에서만 발화한다. AI 채팅·터미널 공용.
type SessState = 'off' | 'busy' | 'idle' | 'wait';
const _sessState = new Map<string, SessState>();
function syncSessState(id: string, cur: SessState, onDone: () => void, onWait?: () => void): void {
    const prev = _sessState.get(id);
    if ((prev === 'busy' || prev === 'wait') && cur === 'idle') onDone();
    if (prev !== 'wait' && cur === 'wait') onWait?.();
    _sessState.set(id, cur);
}





async function termStartNew(_mode: 'cmd' | 'claude' /* | 'gemini' */ | 'codex' | 'antigravity' | 'opencode' = 'cmd', initialWorkingDir?: string) {
    if (!(await ensureNodeInstalled())) return;
    const token = getAuthToken(CPath.WebRootUrl());
    if (token) {
        try {
            const r = await authedFetch(CPath.WebRootUrl() + 'cmd/sessions');
            const j = await r.json();
            if (j.ok) {
                const aliveCount = (j.sessions as any[]).filter((s: any) => s.alive).length;
                if (aliveCount >= 9) {
                    alert('터미널 세션이 가득 찼습니다 (최대 9개).\n기존 세션을 삭제한 후 다시 시도하세요.');
                    return;
                }
            }
        } catch {}
    }

    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">New Terminal</p>
        <div class="mb-3 d-flex gap-2 flex-wrap">
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="cmd">cmd</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="claude">claude</button>
            <!-- <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="gemini">gemini</button> -->
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="codex">codex</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="antigravity">agy</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="opencode">opencode</button>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Key</label>
            <input id="term-opt-key" type="text" class="form-control form-control-sm" placeholder="Session key (optional)" autocomplete="off">
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Working Directory</label>
            <input id="term-opt-workingDir" type="text" class="form-control form-control-sm" placeholder="e.g. D:/Artgine-script" autocomplete="off">
        </div>
        <div class="mb-3 d-flex gap-4">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="term-opt-mcp" checked>
                <label class="form-check-label small text-secondary" for="term-opt-mcp">MCP</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="term-opt-mdcopy" checked>
                <label class="form-check-label small text-secondary" for="term-opt-mdcopy">Copy MD</label>
            </div>
        </div>
        <div class="d-flex justify-content-between">
            <button id="term-modal-open" class="btn btn-primary">Open</button>
            <button id="term-modal-cancel" class="btn btn-danger ms-2">Cancel</button>
        </div>`;

    const modal = new CModal();
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        let selectedMode: string = _mode;

        const modeButtons = container.querySelectorAll<HTMLButtonElement>('.term-mode-btn');
        const mcpCheck    = container.querySelector<HTMLInputElement>('#term-opt-mcp')!;
        const mdcopyCheck = container.querySelector<HTMLInputElement>('#term-opt-mdcopy')!;

        const updateModeUI = (mode: string) => {
            selectedMode = mode;
            modeButtons.forEach(b => {
                b.classList.toggle('btn-primary', b.dataset.mode === mode);
                b.classList.toggle('btn-outline-secondary', b.dataset.mode !== mode);
            });
        };

        modeButtons.forEach(b => b.addEventListener('click', () => updateModeUI(b.dataset.mode!)));
        updateModeUI(selectedMode);

        const keyInput        = container.querySelector<HTMLInputElement>('#term-opt-key')!;
        const workingDirInput = container.querySelector<HTMLInputElement>('#term-opt-workingDir')!;
        if (initialWorkingDir) workingDirInput.value = initialWorkingDir;
        const openBtn   = container.querySelector<HTMLButtonElement>('#term-modal-open')!;
        const cancelBtn = container.querySelector<HTMLButtonElement>('#term-modal-cancel')!;

        let opening = false;
        const doOpen = async () => {
            if (opening) return;   // ttyd 기동에 시간이 걸려 응답이 늦으므로, 그 사이 중복 클릭 차단
            opening = true;
            openBtn.disabled = true;
            cancelBtn.disabled = true;
            const openBtnOrigHtml = openBtn.innerHTML;
            openBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Opening...`;
            try {
                const key        = keyInput.value.trim();
                const workingDir = workingDirInput.value.trim();
                const params = new URLSearchParams({ mode: selectedMode });
                if (key)        params.set('key', key);
                if (workingDir) params.set('workingDir', workingDir);
                if (!mcpCheck.checked) params.set('mcp', '0');
                if (mdcopyCheck.checked) params.set('mdcopy', '1');
                const r = await authedFetch(CPath.WebRootUrl() + 'cmd/start-ttyd?' + params.toString());
                const j = await r.json();
                if (!j.ok) { alert(j.msg || 'Failed to start terminal'); return; }
                modal.Close();
                const key2 = `term-new:${Date.now()}`;
                showFrame(key2, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${j.token}`);
                aiRefreshSessions();
                termRefreshSessions();
                refreshSessionsSoon();
            } catch (e) {
                console.error('[Terminal] start-ttyd error:', e);
                alert('Failed to start terminal');
            } finally {
                opening = false;
                openBtn.disabled = false;
                cancelBtn.disabled = false;
                openBtn.innerHTML = openBtnOrigHtml;
            }
        };

        openBtn.addEventListener('click', doOpen);
        cancelBtn.addEventListener('click', () => modal.Close());
        workingDirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doOpen(); });
    }, MODAL_DOM_DELAY);
}

async function termConnectSession(token: string, focusInput: boolean = true) {
    const key = `term:${token}`;
    // 이미 풀에 있으면 그대로 보여주고 끝
    if (iframePool.has(key)) {
        showFrame(key, '');
        aiRefreshSessions();
        termRefreshSessions();
        if (focusInput) postFrameMessage(key, { type: 'focus-input' });
        return;
    }
    if (!focusInput) noFocusTermKeys.add(key);
    showFrame(key, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${token}`);
    aiRefreshSessions();
    termRefreshSessions();
}

async function termKillSession(token: string) {
    try {
        const r = await authedFetch(`${CPath.WebRootUrl()}cmd/kill-session?token=${token}`);
        const j = await r.json();
        if (!j.ok) { alert(`삭제 실패: ${j.msg || 'unknown error'}`); return; }
        termRefreshSessions();
        aiRefreshSessions();
    } catch (e) { console.error('termKillSession error:', e); }
}

function termConfirmKillSession(token: string) {
    const item = termSessionList.querySelector<HTMLElement>(`[data-token="${token}"]`);
    const label = item?.querySelector<HTMLElement>('.fw-semibold')?.textContent || 'Terminal';
    const confirm = new CConfirm();
    confirm.SetBody(`Delete ${aiEscapeHtml(label)}?`);
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => { termKillSession(token); },
        () => {},
    ], ["Delete", "Cancel"]);
    confirm.Open();
}

async function termRefreshSessions() {
    if (document.querySelector('.dropdown-menu.show')) return;
    try {
        const r = await fetch(CPath.WebRootUrl() + 'cmd/sessions');
        const j = await r.json();
        if (!j.ok) return;
        termSessionList.innerHTML = '';
        const sessions = j.sessions as { token: string; mode: string; key?: string; lastMsg: string; updatedAt: number; createdAt: number; alive: boolean; busy: boolean; permPending?: boolean; workingDir?: string }[];
        const serverTokens = new Set(sessions.map(s => s.token));
        for (const key of Array.from(iframePool.keys())) {
            if (!key.startsWith('term:')) continue;
            if (!serverTokens.has(key.slice(5))) destroyFrame(key);
        }
        // term-new: 프레임을 실제 토큰 키로 승격 (가장 최근 생성된 새 세션에만 매칭)
        const termNewKeys = Array.from(iframePool.keys()).filter(k => k.startsWith('term-new:'));
        if (termNewKeys.length > 0) {
            const newSessions = sessions.filter(s => !iframePool.has(`term:${s.token}`));
            if (newSessions.length > 0) {
                const newest = newSessions.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
                const key = `term:${newest.token}`;
                const newKey = termNewKeys[0];
                const f = iframePool.get(newKey)!;
                iframePool.delete(newKey);
                iframePool.set(key, f);
                if (activeFrameKey === newKey) activeFrameKey = key;
            }
        }
        for (const s of sessions) {
            const key = `term:${s.token}`;
            const isActive = activeFrameKey === key;
            const isLoaded = iframePool.has(key);
            const rel = aiFormatRelative(s.updatedAt);
            const preview = aiEscapeHtml(s.lastMsg || '(empty)');
            const dotLabel = s.mode.slice(0, 3);
            const dotTitle = s.key || s.mode;
            const st: SessState = !s.alive ? 'off'
                : s.permPending ? 'wait'
                : !isLoaded ? 'off'
                : s.busy ? 'busy'
                : 'idle';
            syncSessState(`term:${s.token}`, st,
                () => {
                    const rawPreview = s.lastMsg || '';
                    if (!isActiveFrame(key) || !document.hasFocus())
                        _showDoneNotification(`${s.key || s.mode}: ${rawPreview}`.trimEnd(), rawPreview ? preview : undefined, () => termConnectSession(s.token));
                },
                () => {
                    if (!isActiveFrame(key) || !document.hasFocus())
                        _showDoneNotification(`⚠️ ${s.key || s.mode}: 권한 승인 필요`, s.lastMsg || undefined, () => termConnectSession(s.token));
                }
            );
            const dot = st === 'off'  ? `<span class="badge rounded-pill bg-danger" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
                      : st === 'wait' ? `<span class="badge rounded-pill bg-warning term-busy-dot" title="${aiEscapeHtml(dotTitle)}" style="filter:hue-rotate(30deg)">${dotLabel}</span>`
                      : st === 'busy' ? `<span class="badge rounded-pill bg-warning term-busy-dot" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
                      :                 `<span class="badge rounded-pill bg-success" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`;
            const item = createSessionItem({
                activeClass: 'bg-success-subtle',
                isActive,
                dataAttr: { name: 'token', value: s.token },
                cursorPointer: true,
                leftHtml: `
                <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
                    ${dot}
                    ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
                </span>`,
                bodyHtml: `
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    ${s.key ? `<span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(s.key)}</span>` : ''}
                    <span class="text-truncate small">${preview}</span>
                    ${s.workingDir ? `<span class="text-secondary" style="font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;">${aiEscapeHtml(s.workingDir)}</span>` : ''}
                </span>`,
                deleteAct: 'kill',
                deleteLabel: '🗑️ Delete Session',
                onClick: () => termConnectSession(s.token),
                onShare: () => termShowShareLink(s.token),
                onDelete: () => termConfirmKillSession(s.token),
                popup: { url: () => `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${s.token}`, title: s.key || s.mode || 'Terminal', winName: `term_${s.token.slice(0, 8)}` },
            });
            termSessionList.appendChild(item);
        }
    } catch (e) { console.error('Terminal session list error:', e); }
}

function termShowShareLink(token: string) {
    showShareLinkModal(
        'Terminal Share Link',
        'Anyone with this link can view the terminal in read-only mode.',
        `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${token}`
    );
}

function aiShowShareLink(sessionId: string, title: string) {
    showShareLinkModal(
        'AI Chat Share Link',
        `Anyone with this link can view the chat: <strong>${aiEscapeHtml(title)}</strong>`,
        `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(sessionId)}&share=1`
    );
}

// ---- 세션 프레임을 모달/새 창으로 여는 통합 로직 (채팅·터미널·웹 공용) ----
function openSessionPopup(url: string, title: string, newWindow = false, winName = '_blank') {
    if (newWindow) {
        window.open(url, winName, 'width=900,height=600,toolbar=no,menubar=no,location=no,status=no');
        return;
    }
    try {
        const modal = new CModal(null);
        modal.SetCloseToHide(false);
        modal.SetResize(true);
        modal.SetTitle(CModal.eTitle.TextClose);
        modal.SetHeader(title);
        modal.SetBody(
            `<div style="position:relative;width:100%;height:100%;">` +
            `<iframe src="${url}" style="width:100%;height:100%;border:none;display:block;"></iframe>` +
            `<div class="modal-iframe-guard" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;z-index:1;"></div>` +
            `</div>`
        );
        modal.SetSize('80%', '80%');
        modal.Open(CModal.ePos.Center);
        const guard = modal.mBody?.querySelector('.modal-iframe-guard') as HTMLElement | null;
        if (guard) {
            document.addEventListener('mousedown', () => { guard.style.display = 'block'; });
            document.addEventListener('mouseup',   () => { guard.style.display = 'none'; });
        }
    } catch (e) { console.error('Session popup error:', e); }
}

// ---- 공유 링크 모달 (채팅·터미널·웹 공용) ----
// descHtml은 신뢰된 호출자만 넘기므로 그대로 삽입한다. shareUrl은 input value로만 쓴다.
function showShareLinkModal(header: string, descHtml: string, shareUrl: string) {
    const uid = `share_${Date.now()}`;
    const modal = new CModal();
    modal.SetHeader(header);
    modal.SetBody(`
        <div class="mb-2 small text-secondary">${descHtml}</div>
        <div class="input-group">
            <input id="${uid}" type="text" class="form-control form-control-sm" readonly value="${aiEscapeHtml(shareUrl)}">
            <button id="${uid}_copy" class="btn btn-outline-secondary btn-sm" title="Copy"><i class="bi bi-clipboard"></i></button>
        </div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(480, 160);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const input = document.getElementById(uid) as HTMLInputElement | null;
        const copyBtn = document.getElementById(`${uid}_copy`) as HTMLButtonElement | null;
        input?.addEventListener('click', () => input.select());
        copyBtn?.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(shareUrl); }
            catch { input?.select(); document.execCommand('copy'); }
            copyBtn.innerHTML = '<i class="bi bi-check2"></i>';
            setTimeout(() => { copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>'; }, 1500);
        });
    }, MODAL_DOM_DELAY);
}

// 드롭다운 공용 메뉴 항목(모달/새 창) + 클릭 핸들러 연결
const POPUP_MENU_ITEMS =
    '<li><button class="dropdown-item" data-act="modal"><i class="bi bi-window-stack"></i> Open in Modal</button></li>' +
    '<li><button class="dropdown-item" data-act="window"><i class="bi bi-box-arrow-up-right"></i> Open in New Window</button></li>';

function wirePopupActions(rootEl: Element, getUrl: () => string, title: string, winName: string) {
    rootEl.querySelector<HTMLElement>('[data-act="modal"]')?.addEventListener('click', () => openSessionPopup(getUrl(), title, false, winName));
    rootEl.querySelector<HTMLElement>('[data-act="window"]')?.addEventListener('click', () => openSessionPopup(getUrl(), title, true, winName));
}

// ---- 세션 리스트 아이템 공용 빌더 (채팅·터미널·웹) ----
// 좌측(dot/시간)·본문(제목/미리보기) HTML만 호출자가 만들고, 바깥 골격(드롭다운 메뉴,
// 클릭/공유/삭제 핸들러, hover, 툴팁)은 여기서 한 번에 구성한다. 아이템 append는 호출자 몫.
interface SessionItemSpec {
    activeClass: string;                    // 활성 시 추가 클래스 (예: 'bg-primary-subtle')
    isActive: boolean;
    dataAttr: { name: string; value: string };
    leftHtml: string;                       // 좌측 컬럼 HTML
    bodyHtml: string;                       // 본문 컬럼 HTML
    deleteAct: string;                      // 삭제 메뉴 data-act ('delete' | 'kill')
    deleteLabel: string;                    // 삭제 메뉴 라벨
    onClick: () => void;
    onShare: () => void;
    onDelete: () => void;
    popup: { url: () => string; title: string; winName: string };
    cursorPointer?: boolean;
}
function createSessionItem(spec: SessionItemSpec): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
        + (spec.isActive ? ' ' + spec.activeClass : '');
    item.dataset[spec.dataAttr.name] = spec.dataAttr.value;
    if (spec.cursorPointer) item.style.cursor = 'pointer';
    item.innerHTML = `
        ${spec.leftHtml}
        ${spec.bodyHtml}
        <div class="dropdown" style="flex-shrink:0;">
            <button class="btn btn-sm btn-link text-secondary p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark">
                ${POPUP_MENU_ITEMS}
                <li><button class="dropdown-item" data-act="link">🔗 Share Link</button></li>
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item text-danger" data-act="${spec.deleteAct}">${spec.deleteLabel}</button></li>
            </ul>
        </div>
    `;
    item.addEventListener('click', (e: Event) => {
        if ((e.target as HTMLElement).closest('.dropdown')) return;
        spec.onClick();
    });
    const dropEl = item.querySelector('.dropdown')!;
    new (window as any).bootstrap.Dropdown(dropEl.querySelector('[data-bs-toggle="dropdown"]')!, { popperConfig: { strategy: 'fixed' } });
    item.querySelector<HTMLElement>('[data-act="link"]')!.addEventListener('click', spec.onShare);
    wirePopupActions(item, spec.popup.url, spec.popup.title, spec.popup.winName);
    item.querySelector<HTMLElement>(`[data-act="${spec.deleteAct}"]`)!.addEventListener('click', spec.onDelete);
    item.addEventListener('mouseenter', () => { if (!spec.isActive) item.classList.add('bg-body-secondary'); });
    item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
    return item;
}

termNewBtn.addEventListener('click', () => termStartNew('cmd'));

// ---- Schedule management ----
const schedNewBtn   = CDOM.ID("schedNewBtn");
const schedSessionList = CDOM.ID("schedSessionList");

type ScheduleData = { name: string; terminalKey: string; mode: string; delay: number; count: number; start: number; end: number; command: string; cwd?: string; allow?: boolean; mcp?: boolean; mdcopy?: boolean; timeMode?: boolean; days?: number[]; hour?: number; minute?: number };

function schedIntervalStr(s: ScheduleData): string {
    if (s.timeMode) {
        const hh = String(s.hour ?? 0).padStart(2,'0');
        const mm = String(s.minute ?? 0).padStart(2,'0');
        return `${hh}:${mm}`;
    }
    const parts: string[] = [`${s.delay}s`];
    if (s.count > 0) parts.push(`×${s.count}`);
    if (s.start > 0) parts.push(`+${s.start}s`);
    if (s.end > 0)   parts.push(`~${s.end}s`);
    return parts.join(' ');
}

async function schedRefresh() {
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/schedules');
        const j = await r.json();
        if (!j.ok) return;
        schedSessionList.innerHTML = '';
        const schedules = j.schedules as ScheduleData[];
        if (schedules.length === 0) return;
        for (const s of schedules) {
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-1 rounded';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:2rem;">
                    <span class="badge rounded-pill ${s.mode==='none'?'bg-secondary':s.mode==='cmd'?'bg-info':s.mode==='claude'?'bg-warning text-dark':/*s.mode==='gemini'?'bg-success':*/s.mode==='codex'?'bg-primary':s.mode==='opencode'?'bg-success':'bg-danger'}" style="font-size:0.65rem;">${s.mode==='antigravity'?'agy':s.mode}</span>
                    <span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${schedIntervalStr(s)}</span>
                </span>
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    <span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(s.name)}</span>
                    <span class="text-truncate text-secondary" style="font-size:0.7rem;">${aiEscapeHtml(s.terminalKey)}</span>
                    <span class="text-truncate small text-body-secondary">${aiEscapeHtml(s.command)}</span>
                </span>
                <button class="sched-del-btn btn btn-sm btn-link text-danger p-0" title="삭제"><i class="bi bi-trash"></i></button>
            `;
            item.addEventListener('click', () => schedOpenModal(s));
            item.querySelector('.sched-del-btn')!.addEventListener('click', async (e: Event) => {
                e.stopPropagation();
                if (!confirm(`스케줄 '${s.name}' 을 삭제할까요?`)) return;
                await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-del?name=${encodeURIComponent(s.name)}`);
                schedRefresh();
            });
            item.addEventListener('mouseenter', () => item.classList.add('bg-body-secondary'));
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
            schedSessionList.appendChild(item);
        }
    } catch (e) { console.error('schedRefresh error:', e); }
}

function schedOpenModal(existing?: ScheduleData) {
    const isEdit = !!existing;
    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">${isEdit ? 'Edit Schedule' : 'New Schedule'}</p>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Name (schedule key)</label>
            <input id="sched-name" type="text" class="form-control form-control-sm" placeholder="e.g. daily-backup" autocomplete="off" value="${aiEscapeHtml(existing?.name || '')}">
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Terminal Key</label>
            <input id="sched-tkey" type="text" class="form-control form-control-sm" placeholder="target terminal key" autocomplete="off" value="${aiEscapeHtml(existing?.terminalKey || '')}">
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Mode (created if terminal missing)</label>
            <div class="d-flex gap-1 flex-wrap">
                <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="none">none</button>
                <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="cmd">cmd</button>
                <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="claude">claude</button>
                <!-- <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="gemini">gemini</button> -->
                <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="codex">codex</button>
                <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="antigravity">agy</button>
                <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="opencode">opencode</button>
            </div>
        </div>
        <div class="mb-2">
            <div class="d-flex gap-1 mb-2">
                <button id="sched-tab-interval" type="button" class="btn btn-sm flex-fill ${!(existing?.timeMode) ? 'btn-primary' : 'btn-outline-secondary'}">Interval</button>
                <button id="sched-tab-time"     type="button" class="btn btn-sm flex-fill ${  existing?.timeMode  ? 'btn-primary' : 'btn-outline-secondary'}">Time</button>
            </div>
            <div id="sched-panel-interval" style="display:${!(existing?.timeMode) ? '' : 'none'}">
                <div class="d-flex gap-2 mb-2">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Delay (sec)</label>
                        <input id="sched-delay" type="number" min="1" class="form-control form-control-sm" placeholder="e.g. 60" value="${existing?.delay ?? 60}">
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Count (0=infinite)</label>
                        <input id="sched-count" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.count ?? 0}">
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Start offset (sec, 0=now)</label>
                        <input id="sched-start" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.start ?? 0}">
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">End offset (sec, 0=never)</label>
                        <input id="sched-end" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.end ?? 0}">
                    </div>
                </div>
            </div>
            <div id="sched-panel-time" style="display:${existing?.timeMode ? '' : 'none'}">
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">Days of Week</label>
                    <div class="d-flex gap-1 flex-wrap">
                        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((lbl,i) => `<button type="button" class="sched-day-btn btn btn-sm ${(existing?.days ?? []).includes(i) ? 'btn-primary' : 'btn-outline-secondary'}" data-day="${i}">${lbl}</button>`).join('')}
                    </div>
                </div>
                <div class="d-flex gap-2 align-items-end">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Hour (0–23)</label>
                        <select id="sched-hour" class="form-select form-select-sm">
                            ${Array.from({length:24},(_,h)=>`<option value="${h}" ${(existing?.hour??9)===h?'selected':''}>${String(h).padStart(2,'0')}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Minute</label>
                        <select id="sched-minute" class="form-select form-select-sm">
                            ${Array.from({length:12},(_,i)=>i*5).map(m=>`<option value="${m}" ${(existing?.minute??0)===m?'selected':''}>${String(m).padStart(2,'0')}</option>`).join('')}
                        </select>
                    </div>
                </div>
                </div>
            </div>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Command</label>
            <textarea id="sched-cmd" class="form-control form-control-sm" rows="3" placeholder="e.g. node backup.js">${aiEscapeHtml(existing?.command || '')}</textarea>
        </div>
        <div class="accordion accordion-flush mb-3" id="sched-accordion">
            <div class="accordion-item" style="background:transparent;border:1px solid #444;border-radius:0.375rem;">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed py-2 px-3 small" type="button" data-bs-toggle="collapse" data-bs-target="#sched-acc-body" style="background:transparent;color:inherit;font-size:0.75rem;">
                        Advanced
                    </button>
                </h2>
                <div id="sched-acc-body" class="accordion-collapse collapse">
                    <div class="accordion-body py-2 px-3">
                        <div class="mb-2">
                            <label class="form-label small text-secondary mb-1">Working Directory</label>
                            <input id="sched-cwd" type="text" class="form-control form-control-sm" placeholder="e.g. D:/Artgine-script" autocomplete="off" value="${aiEscapeHtml(existing?.cwd || '')}">
                        </div>
                        <div class="d-flex gap-4">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="sched-allow" ${existing?.allow ? 'checked' : ''}>
                                <label class="form-check-label small text-secondary" for="sched-allow">Allow working dir write</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="sched-mcp" ${(existing?.mcp ?? true) ? 'checked' : ''}>
                                <label class="form-check-label small text-secondary" for="sched-mcp">MCP</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="sched-mdcopy" ${existing?.mdcopy ? 'checked' : ''}>
                                <label class="form-check-label small text-secondary" for="sched-mdcopy">Copy MD</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="d-flex justify-content-between">
            <button id="sched-modal-save" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>
            <button id="sched-modal-cancel" class="btn btn-danger ms-2">Cancel</button>
        </div>`;

    const modal = new CModal();
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        let selectedMode = existing?.mode || 'cmd';
        const modeBtns = container.querySelectorAll<HTMLButtonElement>('.sched-mode-btn');
        const updateMode = (m: string) => {
            selectedMode = m;
            modeBtns.forEach(b => {
                b.classList.toggle('btn-primary', b.dataset.mode === m);
                b.classList.toggle('btn-outline-secondary', b.dataset.mode !== m);
            });
        };
        modeBtns.forEach(b => b.addEventListener('click', () => updateMode(b.dataset.mode!)));
        updateMode(selectedMode);

        // 탭 전환
        let isTimeMode = existing?.timeMode ?? false;
        const tabInterval = container.querySelector<HTMLButtonElement>('#sched-tab-interval')!;
        const tabTime     = container.querySelector<HTMLButtonElement>('#sched-tab-time')!;
        const panelInterval = container.querySelector<HTMLElement>('#sched-panel-interval')!;
        const panelTime     = container.querySelector<HTMLElement>('#sched-panel-time')!;
        const switchTab = (toTime: boolean) => {
            isTimeMode = toTime;
            tabInterval.className = `btn btn-sm flex-fill ${!toTime ? 'btn-primary' : 'btn-outline-secondary'}`;
            tabTime.className     = `btn btn-sm flex-fill ${ toTime ? 'btn-primary' : 'btn-outline-secondary'}`;
            panelInterval.style.display = toTime ? 'none' : '';
            panelTime.style.display     = toTime ? '' : 'none';
        };
        tabInterval.addEventListener('click', () => switchTab(false));
        tabTime.addEventListener('click', () => switchTab(true));

        // 요일 토글
        const dayBtns = container.querySelectorAll<HTMLButtonElement>('.sched-day-btn');
        dayBtns.forEach(b => b.addEventListener('click', () => {
            const active = b.classList.contains('btn-primary');
            b.classList.toggle('btn-primary', !active);
            b.classList.toggle('btn-outline-secondary', active);
        }));

        const doSave = async () => {
            const name    = (container.querySelector<HTMLInputElement>('#sched-name')!).value.trim();
            const tkey    = (container.querySelector<HTMLInputElement>('#sched-tkey')!).value.trim();
            const command = (container.querySelector<HTMLTextAreaElement>('#sched-cmd')!).value.trim();
            const cwd    = (container.querySelector<HTMLInputElement>('#sched-cwd')!).value.trim();
            const allow  = (container.querySelector<HTMLInputElement>('#sched-allow')!).checked;
            const mcp    = (container.querySelector<HTMLInputElement>('#sched-mcp')!).checked;
            const mdcopy = (container.querySelector<HTMLInputElement>('#sched-mdcopy')!).checked;
            if (!name || !tkey || !command) { alert('Name, terminal key, and command are required'); return; }

            const params = new URLSearchParams({ name, terminalKey: tkey, mode: selectedMode, command,
                allow: allow ? '1' : '0', mcp: mcp ? '1' : '0', mdcopy: mdcopy ? '1' : '0',
                timeMode: isTimeMode ? '1' : '0' });
            if (cwd) params.set('cwd', cwd);

            if (isTimeMode) {
                const selectedDays = Array.from(dayBtns).filter(b => b.classList.contains('btn-primary')).map(b => Number(b.dataset.day));
                if (selectedDays.length === 0) { alert('Select at least one day'); return; }
                const hh = parseInt((container.querySelector<HTMLSelectElement>('#sched-hour')!).value) || 0;
                const mm = parseInt((container.querySelector<HTMLSelectElement>('#sched-minute')!).value) || 0;
                params.set('days', selectedDays.join(','));
                params.set('hour', String(hh));
                params.set('minute', String(mm));
                params.set('delay', '60'); params.set('count', '0'); params.set('start', '0'); params.set('end', '0');
            } else {
                const delay = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-delay')!).value) || 0);
                const count = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-count')!).value) || 0);
                const start = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-start')!).value) || 0);
                const end   = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-end')!).value) || 0);
                if (delay === 0) { alert('Delay must be at least 1 second'); return; }
                params.set('delay', String(delay)); params.set('count', String(count));
                params.set('start', String(start)); params.set('end', String(end));
                params.set('days', ''); params.set('hour', '0'); params.set('minute', '0');
            }

            const r = await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-set?${params.toString()}`);
            const j = await r.json();
            if (!j.ok) { alert(j.msg || 'Failed'); return; }
            modal.Close();
            schedRefresh();
        };

        container.querySelector<HTMLButtonElement>('#sched-modal-save')!.addEventListener('click', doSave);
        container.querySelector<HTMLButtonElement>('#sched-modal-cancel')!.addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}

schedNewBtn.addEventListener('click', () => schedOpenModal());


// AI 탭 active 시 5초마다 채팅·터미널·스케줄 목록 갱신
setInterval(() => {
    if (CDOM.ID("ai-panel").classList.contains("show")) {
        aiRefreshSessions();
        termRefreshSessions();
        schedRefresh();
        browserRefreshList();
    }
}, 5000);

// Listen for session changes from iframe
window.addEventListener('message', (e) => {
    if (e.data?.type === 'ai-sessions-changed') {
        pendingNewSid = null; // 서버에 세션이 생성됐으므로 보호 해제
        aiRefreshSessions();
    }
    if (e.data?.type === 'browser-sessions-changed') {
        browserRefreshList();
    }
    if (e.data?.type === 'terminal-tab-key') {
        handleTabKey();
    }
    if (e.data?.type === 'rdp-tab-key') {
        if (isRdpPanelActive()) handleRdpTabKey();
    }
    if (e.data?.type === 'terminal-arrow-key') {
        if (e.data.key === 'ArrowLeft') goPrevFrame();
        else if (e.data.key === 'ArrowUp') goNextSession(-1);
        else if (e.data.key === 'ArrowDown') goNextSession(1);
        else handleNotifKey();
    }
    if (e.data?.type === 'home-hotkey') {
        runHomeHotkey(e.data.key as string);
    }
});

function handleTabKey() {
    toggleSidebar();
}

// 새로 알림 세션 전환 직후, 새로 돌아갈 직전 세션. 시간이 지나면 해제된다.
let _notifReturnKey: string | null = null;
let _notifReturnTimer: number | null = null;

// 활성 알림(완료 메세지) 콜백을 발화한다. 이 윈도우로 노출한다.
function handleNotifKey(): boolean {
    if (_activeNotifCallback) {
        const cb = _activeNotifCallback;
        _activeNotifCallback = null;
        const from = activeFrameKey;   // 전환 전 세션 기록
        cb();                          // 알림 세션으로 전환
        if (from && from !== activeFrameKey) {
            _notifReturnKey = from;
            if (_notifReturnTimer) clearTimeout(_notifReturnTimer);
            _notifReturnTimer = window.setTimeout(() => { _notifReturnKey = null; }, 8000);
        }
        focusActiveFrameIfSidebarCollapsed();
        return true;
    }
    return false;
}

// 이 윈도우, 직전에 보던 세션으로 복귀(알림 전환 직후에만 armed).
function goPrevFrame(): boolean {
    if (!_notifReturnKey || _notifReturnKey === activeFrameKey) return false;
    const f = iframePool.get(_notifReturnKey);
    if (!f) { _notifReturnKey = null; return false; }
    showFrame(_notifReturnKey, f.src);
    _notifReturnKey = null;
    if (_notifReturnTimer) { clearTimeout(_notifReturnTimer); _notifReturnTimer = null; }
    aiRefreshSessions();
    termRefreshSessions();
    focusActiveFrameIfSidebarCollapsed();
    return true;
}

// 위↓ 윈도우, 사이드바가 가려 있을 때 세션 목록 아래로 이동
function goNextSession(dir: 1 | -1): boolean {
    if (!aiSidebarEl.classList.contains('show')) return false;
    const subtab = document.getElementById('ai-chat-subtab')?.classList.contains('active') ? 'chat'
                 : document.getElementById('ai-term-subtab')?.classList.contains('active') ? 'term'
                 : 'browser';
    if (subtab === 'chat') {
        const items = Array.from(aiSessionList.querySelectorAll<HTMLElement>('[data-sid]'));
        if (items.length === 0) return false;
        const curIdx = activeFrameKey?.startsWith('chat:')
            ? items.findIndex(el => el.dataset.sid === activeFrameKey!.slice(5))
            : -1;
        const nxt = curIdx === -1 ? 0 : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (nxt === curIdx) return false;
        aiLoadSession(items[nxt].dataset.sid!);
        items[nxt].scrollIntoView({ block: 'nearest' });
        return true;
    } else if (subtab === 'term') {
        const items = Array.from(termSessionList.querySelectorAll<HTMLElement>('[data-token]'));
        if (items.length === 0) return false;
        const curIdx = activeFrameKey?.startsWith('term:')
            ? items.findIndex(el => `term:${el.dataset.token}` === activeFrameKey)
            : -1;
        const nxt = curIdx === -1 ? 0 : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (nxt === curIdx) return false;
        termConnectSession(items[nxt].dataset.token!, false);
        items[nxt].scrollIntoView({ block: 'nearest' });
        return true;
    }
    return false;
}

// ---- sidebar collapse toggle ----
const AI_SIDEBAR_COLLAPSED_KEY = 'ai.sidebarCollapsed';
const aiSidebarEl = CDOM.ID("ai-sidebar") as HTMLDivElement;
const aiSidebarToggleBtn = CDOM.ID("aiSidebarToggle") as HTMLButtonElement;
// backdrop:false 만으로는 scroll 기본값(false)에 의해 포커스 트랩이 계속 활성화되어
// 사이드바가 열려 있는 동안 다른 모달의 입력/포커스를 가로채 버린다.
// scroll:true를 같이 줘야 포커스 트랩이 완전히 꺼진다.
const aiSidebarOffcanvas = new (window as any).bootstrap.Offcanvas(aiSidebarEl, { backdrop: false, scroll: true });

function openAiSidebar() {
    aiSidebarOffcanvas.show();
}

// 백드롭 클릭/Esc 등 토글 버튼을 거치지 않는 닫힘에도 아이콘/저장값이 따라가도록 이벤트로 동기화
aiSidebarEl.addEventListener('shown.bs.offcanvas', () => {
    aiSidebarToggleBtn.querySelector('i')!.className = 'bi bi-layout-sidebar-inset';
    localStorage.setItem(AI_SIDEBAR_COLLAPSED_KEY, '0');
});
aiSidebarEl.addEventListener('hidden.bs.offcanvas', () => {
    aiSidebarToggleBtn.querySelector('i')!.className = 'bi bi-layout-sidebar';
    localStorage.setItem(AI_SIDEBAR_COLLAPSED_KEY, '1');
});

// 첫 진입 시 슬라이드 인 애니메이션 없이 바로 펼쳐진 상태로 시작
aiSidebarEl.style.transition = 'none';
openAiSidebar();
requestAnimationFrame(() => { aiSidebarEl.style.transition = ''; });

function toggleSidebar() {
    const wasShown = aiSidebarEl.classList.contains('show');
    aiSidebarOffcanvas.toggle();
    setTimeout(() => wasShown ? focusActiveFrame() : aiSidebarEl.focus(), 0);
}
aiSidebarToggleBtn.addEventListener('click', toggleSidebar);
document.addEventListener('keydown', (e) => {
    if (isAiPanelActive() && isAiAuthVisible()) return;
    if (e.key === 'Tab') {
        if (isRdpPanelActive()) {
            e.preventDefault();
            handleRdpTabKey();
            return;
        }
        if (!isAiPanelActive()) return;
        e.preventDefault();
        handleTabKey();
        return;
    }
    if (handleTermSidebarShortcut(e)) return;
    if ((e.key === '1' || e.key === '2' || e.key === '3') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isAiPanelActive() && aiSidebarEl.classList.contains('show')) {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
                e.preventDefault();
                const subtabs = ['ai-chat-subtab', 'ai-term-subtab', 'ai-browser-subtab'];
                showTab(subtabs[parseInt(e.key) - 1]);
                return;
            }
        }
    }
    if (e.key === 'ArrowRight') {
        if (!isAiPanelActive()) return;
        if (_activeNotifCallback) { e.preventDefault(); handleNotifKey(); }
        return;
    }
    if (e.key === 'ArrowLeft') {
        if (!isAiPanelActive()) return;
        if (goPrevFrame()) e.preventDefault();
        return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!isAiPanelActive()) return;
        if (aiSidebarEl.classList.contains('show')) e.preventDefault();
        goNextSession(e.key === 'ArrowUp' ? -1 : 1);
        return;
    }
    if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4' || e.key === 'F7') {
        e.preventDefault();
        runHomeHotkey(e.key);
    }
});

// ---- Auth overlay ----
const aiAuthOverlay = CDOM.ID("ai-auth-overlay") as HTMLDivElement;
const aiAuthPwInput = CDOM.ID("aiAuthPwInput") as HTMLInputElement;
const aiAuthMsg     = CDOM.ID("aiAuthMsg") as HTMLElement;
const aiAuthSubmitBtn = CDOM.ID("aiAuthSubmitBtn") as HTMLButtonElement;

aiAuthOverlay.addEventListener('keydown', (e) => e.stopPropagation());

async function aiCheckAuth(): Promise<boolean> {
    const token = getAuthToken(CPath.WebRootUrl());
    if (!token) return false;
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "auth/check", { token }, "json") as any;
        const authed = !!j?.authed;
        if (!authed) removeAuthToken(CPath.WebRootUrl());
        return authed;
    } catch { return false; }
}

async function aiShowAuthOrLoad() {
    const authed = await aiCheckAuth();
    if (!authed) {
        refreshFileAuthState();
        const wasVisible = aiAuthOverlay.style.display === 'flex';
        aiAuthOverlay.style.display = 'flex';
        if (!wasVisible) {
            aiAuthPwInput.value = '';
            aiAuthMsg.textContent = '';
            setTimeout(() => aiAuthPwInput.focus(), 50);
        }
    } else {
        refreshFileAuthState();
        aiAuthOverlay.style.display = 'none';
        aiRefreshSessions();
        termRefreshSessions();
    }
}

async function aiDoAuth() {
    const pw = aiAuthPwInput.value;
    if (!pw) return;
    aiAuthSubmitBtn.disabled = true;
    aiAuthMsg.textContent = '';
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "auth/login", { password: pw }, "json") as any;
        if (j.ok) {
            setAuthToken(CPath.WebRootUrl(), j.token);
            refreshFileAuthState();
            aiAuthOverlay.style.display = 'none';
            aiRefreshSessions();
            termRefreshSessions();
            warnIfDefaultAuthPassword(pw);
        } else {
            aiAuthMsg.textContent = j.msg || 'Wrong password';
        }
    } catch { aiAuthMsg.textContent = 'Server error'; }
    aiAuthSubmitBtn.disabled = false;
}

aiAuthSubmitBtn.addEventListener('click', aiDoAuth);
aiAuthPwInput.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') aiDoAuth(); });

// 서브탭 전환 시 해당 리스트 갱신
CDOM.ID("ai-chat-subtab").addEventListener("shown.bs.tab", () => aiRefreshSessions());
CDOM.ID("ai-term-subtab").addEventListener("shown.bs.tab", () => { termRefreshSessions(); schedRefresh(); focusActiveFrame(); });
CDOM.ID("ai-browser-subtab").addEventListener("shown.bs.tab", () => browserRefreshList());

// ---- Browser tab: Playwright sessions ----
const browserNewBtn      = CDOM.ID("browserNewBtn") as HTMLButtonElement;
const browserSessionList = CDOM.ID("browserSessionList");
interface IBrowserSessionState {
    sessionId: string;
    url: string;
    browserName: string;
    expiresAt: number;
    sidebarEl: HTMLDivElement;
    ttlEl: HTMLSpanElement;
}
const browserSessions = new Map<string, IBrowserSessionState>();

function browserLoadSession(sessionId: string) {
    showFrame(`browser:${sessionId}`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}`);
    _browserUpdateHighlights();
}

function _browserUpdateHighlights() {
    for (const [sid, s] of browserSessions) {
        const isActive = activeFrameKey === `browser:${sid}`;
        s.sidebarEl.classList.toggle('bg-primary-subtle', isActive);
        const dot = s.sidebarEl.querySelector<HTMLElement>('.browser-dot');
        if (dot) {
            dot.classList.toggle('text-success', isActive);
            dot.classList.toggle('text-danger', !isActive);
        }
    }
}

function browserFmtTtl(expiresAt: number): string {
    const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (rem <= 0) return '−0s';
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return m > 0 ? `−${m}m${s}s` : `−${s}s`;
}

function browserAddSession(sessionId: string, url: string, browserName: string = '', expiresAt: number = 0, navigate = true) {
    if (browserSessions.has(sessionId)) return;

    const sidebarEl = createSessionItem({
        activeClass: 'bg-primary-subtle',
        isActive: activeFrameKey === `browser:${sessionId}`,
        dataAttr: { name: 'sid', value: sessionId },
        leftHtml: `<span class="browser-dot text-danger small flex-shrink-0">●</span>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            <span class="text-truncate small" title="${aiEscapeHtml(url)}">${aiEscapeHtml(url)}</span>
            <span class="d-flex gap-2 text-secondary" style="font-size:0.7rem;">
                <span>${aiEscapeHtml(browserName || 'auto')}</span>
                <span class="browser-ttl-label"></span>
            </span>
        </span>`,
        deleteAct: 'delete',
        deleteLabel: '🗑️ Delete Session',
        onClick: () => browserLoadSession(sessionId),
        onShare: () => browserShowShareLink(sessionId, url),
        onDelete: () => browserRemoveSession(sessionId),
        popup: { url: () => `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}`, title: url, winName: `browser_${sessionId}` },
    });
    const ttlEl = sidebarEl.querySelector<HTMLSpanElement>('.browser-ttl-label')!;
    browserSessionList.appendChild(sidebarEl);

    browserSessions.set(sessionId, { sessionId, url, browserName, expiresAt, sidebarEl, ttlEl });

    if (navigate) browserLoadSession(sessionId);
}

async function browserRemoveSession(sessionId: string) {
    const s = browserSessions.get(sessionId);
    if (!s) return;
    s.sidebarEl.remove();
    browserSessions.delete(sessionId);
    destroyFrame(`browser:${sessionId}`);
    try {
        await authedFetch(`${CPath.WebRootUrl()}PlayWright/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
    } catch {}
}

async function browserRefreshList() {
    if (document.querySelector('.dropdown-menu.show')) return;
    try {
        const r = await authedFetch(`${CPath.WebRootUrl()}PlayWright/list`);
        const j = await r.json();
        if (!j.ok) return;
        const serverIds = new Set<string>((j.sessions as { sessionId: string }[]).map(s => s.sessionId));
        for (const [sid] of Array.from(browserSessions)) {
            if (!serverIds.has(sid)) browserRemoveSession(sid);
        }
        for (const s of j.sessions as { sessionId: string; currentUrl: string; browserName: string; expiresAt: number }[]) {
            if (!browserSessions.has(s.sessionId)) {
                browserAddSession(s.sessionId, s.currentUrl, s.browserName, s.expiresAt, false);
            } else {
                const sess = browserSessions.get(s.sessionId)!;
                sess.expiresAt = s.expiresAt;
            }
        }
        _browserUpdateHighlights();
    } catch {}
}

function browserShowShareLink(sessionId: string, url: string) {
    showShareLinkModal(
        'Browser Share Link',
        `Anyone with this link can view the session in read-only mode: <strong>${aiEscapeHtml(url)}</strong>`,
        `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}&readonly=1`
    );
}

browserNewBtn.addEventListener('click', () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">New Browser Session</p>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">URL</label>
            <input id="brow-url" type="text" class="form-control form-control-sm" placeholder="https://..." autocomplete="off">
        </div>
        <div class="mb-3 d-flex gap-2">
            <div class="flex-fill">
                <label class="form-label small text-secondary mb-1">Browser</label>
                <select id="brow-browser" class="form-select form-select-sm">
                    <option value="">auto</option>
                    <option value="chrome">chrome</option>
                    <option value="msedge">msedge</option>
                    <option value="firefox">firefox</option>
                </select>
            </div>
            <div class="flex-fill">
                <label class="form-label small text-secondary mb-1">TTL (sec)</label>
                <input id="brow-ttl" type="number" min="10" class="form-control form-control-sm" value="300">
            </div>
        </div>
        <div class="mb-3 d-flex gap-2">
            <div class="flex-fill">
                <label class="form-label small text-secondary mb-1">Width</label>
                <input id="brow-width" type="number" min="1" class="form-control form-control-sm" value="1280">
            </div>
            <div class="flex-fill">
                <label class="form-label small text-secondary mb-1">Height</label>
                <input id="brow-height" type="number" min="1" class="form-control form-control-sm" value="720">
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label small text-secondary mb-1">Stealth (sec, 0=off)</label>
            <input id="brow-stealth" type="number" min="0" class="form-control form-control-sm" value="0">
        </div>
        <div class="d-flex justify-content-between">
            <button id="brow-open" class="btn btn-primary">Open</button>
            <button id="brow-cancel" class="btn btn-danger ms-2">Cancel</button>
        </div>`;

    const modal = new CModal();
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const urlInput   = container.querySelector<HTMLInputElement>('#brow-url')!;
        const browserSel = container.querySelector<HTMLSelectElement>('#brow-browser')!;
        const ttlInput   = container.querySelector<HTMLInputElement>('#brow-ttl')!;
        const widthInput = container.querySelector<HTMLInputElement>('#brow-width')!;
        const heightInput = container.querySelector<HTMLInputElement>('#brow-height')!;
        const stealthInput = container.querySelector<HTMLInputElement>('#brow-stealth')!;

        const doOpen = async () => {
            const url = urlInput.value.trim();
            if (!url) return;
            const browser = browserSel.value;
            const ttl = parseInt(ttlInput.value) || 300;
            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);
            const stealth = parseInt(stealthInput.value) || 0;
            modal.Close();
            try {
                const r = await authedFetch(`${CPath.WebRootUrl()}PlayWright/push`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, ...(browser ? { browser } : {}), ttl, logSize: 200, width, height, stealth })
                });
                const j = await r.json();
                if (!j.ok) { CAlert.E(j.msg || 'Failed'); return; }
                browserAddSession(j.sessionId, url, browser || 'auto', Date.now() + ttl * 1000);
            } catch { CAlert.E('Failed to start browser'); }
        };

        container.querySelector<HTMLButtonElement>('#brow-open')!.addEventListener('click', doOpen);
        container.querySelector<HTMLButtonElement>('#brow-cancel')!.addEventListener('click', () => modal.Close());
        urlInput.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') doOpen(); });
        setTimeout(() => urlInput.focus(), 50);
    }, MODAL_DOM_DELAY);
});

// ---- RDP tab: local / remote desktop screen viewer ----
// AI 탭의 iframe pool과는 별개로, RDP 탭 자신의 frame-container를 위한 독립된 풀을 둔다.
const rdpFrameContainer = CDOM.ID("rdp-frame-container") as HTMLDivElement;
const rdpFramePlaceholder = CDOM.ID("rdp-frame-placeholder") as HTMLDivElement;
const rdpSessionList = CDOM.ID("rdpSessionList") as HTMLDivElement;
const rdpAddUrlInput = CDOM.ID("rdpAddUrlInput") as HTMLInputElement;
const rdpAddBtn = CDOM.ID("rdpAddBtn") as HTMLButtonElement;
const rdpIframePool = new Map<string, HTMLIFrameElement>();
let activeRdpFrameKey: string | null = null;

function updateRdpFramePlaceholder() {
    rdpFramePlaceholder.style.display = activeRdpFrameKey ? 'none' : '';
}

function isRdpTabActive(): boolean { return CDOM.ID('rdp-tab').classList.contains('active'); }

function updateRdpFrameVisibility() {
    if (!activeRdpFrameKey) return;
    postFrameVisible(rdpIframePool.get(activeRdpFrameKey), isRdpTabActive());
}

const rdpFrameCtx: FramePoolCtx = {
    pool: rdpIframePool,
    container: rdpFrameContainer,
    getActiveKey: () => activeRdpFrameKey,
    setActiveKey: (key) => { activeRdpFrameKey = key; },
    updatePlaceholder: updateRdpFramePlaceholder,
    onActivate: (_key, prevKey) => {
        if (prevKey) postFrameVisible(rdpIframePool.get(prevKey), false);
        updateRdpFrameVisibility();
    },
};

function showRdpFrame(key: string, src: string): HTMLIFrameElement {
    return showPooledFrame(rdpFrameCtx, key, src);
}

function focusActiveRdpFrame() {
    if (!activeRdpFrameKey) return;
    const f = rdpIframePool.get(activeRdpFrameKey);
    if (!f) return;
    try {
        f.contentWindow?.focus();
        const inputTarget = f.contentDocument?.querySelector<HTMLElement>('#imgWrap');
        if (inputTarget) {
            inputTarget.focus();
            return;
        }
    } catch (_) {}
    f.focus();
}

interface IRdpRemote { url: string; }
// 임시 목록(현재 세션 동안만 유지) — 저장/로드는 추후 추가 예정.
let rdpRemotes: IRdpRemote[] = [];

function rdpRenderList() {
    rdpSessionList.innerHTML = '';

    const localItem = document.createElement('div');
    localItem.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
        + (activeRdpFrameKey === 'rdp:local' ? ' bg-primary-subtle' : '');
    localItem.innerHTML = `<i class="bi bi-pc-display"></i><span class="flex-grow-1">Local</span>`
        + `<button type="button" class="btn btn-sm btn-link text-secondary p-0" data-act="local-link" title="Show accessible link"><i class="bi bi-link-45deg"></i></button>`;
    localItem.addEventListener('click', () => rdpOpenLocal());
    localItem.querySelector<HTMLButtonElement>('[data-act="local-link"]')!.addEventListener('click', (e) => {
        e.stopPropagation();
        rdpShowLocalAccessLink();
    });
    rdpSessionList.appendChild(localItem);

    rdpRemotes.forEach((r, i) => {
        const key = `rdp:remote:${i}`;
        const item = createSessionItem({
            activeClass: 'bg-primary-subtle',
            isActive: activeRdpFrameKey === key,
            dataAttr: { name: 'idx', value: String(i) },
            leftHtml: `<i class="bi bi-hdd-network"></i>`,
            bodyHtml: `<span class="flex-grow-1 text-truncate small">${aiEscapeHtml(r.url)}</span>`,
            deleteAct: 'delete',
            deleteLabel: '🗑️ Delete',
            onClick: () => rdpOpenRemote(i),
            onShare: () => rdpShowShareLink(r.url),
            onDelete: () => { rdpRemotes.splice(i, 1); rdpRenderList(); },
            popup: { url: () => `${ParseFileHomeUrl(r.url).webRootUrl}artgine/server/html/RemoteDesktop.html`, title: r.url, winName: `rdp_${i}` },
        });
        rdpSessionList.appendChild(item);
    });
}

// 현재 페이지가 localhost로 열려있으면 공인 IP로 바꾸고, fetch(no-cors)로 외부에서
// 그 포트에 실제로 닿는지 확인한다. no-cors는 응답 본문을 읽을 수 없지만, 연결 자체가
// 실패(타임아웃/거부)하면 reject되므로 포트 개방 여부 판단에는 충분하다.
async function rdpResolveAccessibleUrl(): Promise<{ url: string; blocked: boolean }> {
    const loc = window.location;
    const isLocalHost = loc.hostname === 'localhost' || loc.hostname === '127.0.0.1' || loc.hostname === '::1';
    if (!isLocalHost) return { url: loc.href, blocked: false };

    let publicIp = '';
    try {
        publicIp = (await (await fetch('https://api.ipify.org?format=text')).text()).trim();
    } catch (_) {
        return { url: '', blocked: true };
    }
    if (!publicIp) return { url: '', blocked: true };

    const port = loc.port ? `:${loc.port}` : '';
    const url = `${loc.protocol}//${publicIp}${port}${loc.pathname}${loc.search}`;
    const reachable = await rdpCheckPortOpen(url);
    return { url, blocked: !reachable };
}

function rdpCheckPortOpen(url: string, timeoutMs = 4000): Promise<boolean> {
    return new Promise(resolve => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => { ctrl.abort(); resolve(false); }, timeoutMs);
        fetch(url, { mode: 'no-cors', signal: ctrl.signal })
            .then(() => { clearTimeout(timer); resolve(true); })
            .catch(() => { clearTimeout(timer); resolve(false); });
    });
}

async function rdpShowLocalAccessLink() {
    const boxId = `rdp_local_link_${Date.now()}`;
    const modal = new CModal();
    modal.SetHeader('Local Access Link');
    modal.SetBody(`<div id="${boxId}" class="small text-secondary">Checking accessible link...</div>`);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(480, 160);
    modal.Open(CModal.ePos.Center);

    const { url, blocked } = await rdpResolveAccessibleUrl();
    const box = document.getElementById(boxId);
    if (!box) return;

    if (blocked || !url) {
        box.innerHTML = `<div class="text-danger">Port appears to be blocked from outside access. Please check port forwarding.</div>`;
        return;
    }

    const inputId = `${boxId}_input`;
    const copyId = `${boxId}_copy`;
    box.className = '';
    box.innerHTML = `
        <div class="mb-2 small text-secondary">Accessible link for this page:</div>
        <div class="input-group">
            <input id="${inputId}" type="text" class="form-control form-control-sm" readonly value="${aiEscapeHtml(url)}">
            <button id="${copyId}" class="btn btn-outline-secondary btn-sm" title="Copy"><i class="bi bi-clipboard"></i></button>
        </div>`;
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    const copyBtn = document.getElementById(copyId) as HTMLButtonElement | null;
    input?.addEventListener('click', () => input.select());
    copyBtn?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(url); }
        catch { input?.select(); document.execCommand('copy'); }
        copyBtn.innerHTML = '<i class="bi bi-check2"></i>';
        setTimeout(() => { copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>'; }, 1500);
    });
}

function rdpShowShareLink(remoteUrl: string) {
    const shareUrl = `${ParseFileHomeUrl(remoteUrl).webRootUrl}artgine/server/html/RemoteDesktop.html`;
    showShareLinkModal(
        'Remote Desktop Share Link',
        `Anyone with this link can access the remote desktop: <strong>${aiEscapeHtml(remoteUrl)}</strong>`,
        shareUrl
    );
}

async function rdpOpenLocal() {
    try {
        await ConnectFileHomeUrl();
    } catch (e: any) {
        CAlert.E("Connect failed: " + (e?.message ?? String(e)));
        return;
    }
    showRdpFrame('rdp:local', `${CPath.WebRootArtgineUrl()}artgine/server/html/RemoteDesktop.html`);
    rdpRenderList();
}

// 원격 항목 클릭: File 탭의 ConnectFileHomeUrl과 동일한 방식으로 File 탭 컨텍스트만 전환하고,
// RDP 메인 화면에는 그 서버 자신의 RemoteDesktop.html을 로드해 해당 서버의 화면을 보여준다.
async function rdpOpenRemote(index: number) {
    const remote = rdpRemotes[index];
    if (!remote) return;
    try {
        await ConnectFileHomeUrl(remote.url);
    } catch (e: any) {
        CAlert.E("Connect failed: " + (e?.message ?? String(e)));
        return;
    }
    const webRootUrl = ParseFileHomeUrl(remote.url).webRootUrl;
    showRdpFrame(`rdp:remote:${index}`, `${webRootUrl}artgine/server/html/RemoteDesktop.html`);
    rdpRenderList();
    // 원격지가 미인증이면 즉시 비밀번호 인증창을 띄운다. 인증 성공 시 refreshFileAuthState가
    // SendRemoteGuide를 호출해 ai/RemoteCMDGuide.md를 그 원격지 주소/토큰으로 갱신한다.
    if (!(await fileCheckAuth())) promptFileAuth();
}

// 파일 서버(g_fileWebRootUrl) 관리자 비밀번호 인증창. F1(FileBtn)과 RDP 원격 클릭에서 공용으로 쓴다.
// 성공 시 refreshFileAuthState를 태워 인증 상태/인디케이터를 갱신하고, 대상이 원격이면 SendRemoteGuide까지 발동한다.
function promptFileAuth(onSuccess?: () => void) {
    const dlg = new CConfirm();
    dlg.SetBody('Enter admin password:<br><input type="password" id="AuthPassword" class="form-control form-control-sm">');
    const doAuth = () => {
        const pw = CDOM.IDValue("AuthPassword");
        (CFecth.Exe(FileApiUrl("auth/login"), { password: pw }, "json") as Promise<any>).then(async (j: { ok: boolean, token?: string, msg?: string }) => {
            if (j.ok) {
                SetFileToken(j.token!);
                await refreshFileAuthState();
                aiAuthOverlay.style.display = 'none';
                aiRefreshSessions();
                termRefreshSessions();
                CAlert.Info("Permission granted");
                warnIfDefaultAuthPassword(pw);
                onSuccess?.();
            } else {
                CAlert.E("Wrong password: " + (j.msg ?? ""));
            }
        }).catch(() => { CAlert.E("Server error"); });
    };
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        doAuth,
        () => {},
    ], ["OK", "Cancel"]);
    dlg.Open();
    setTimeout(() => {
        const input = CDOM.ID("AuthPassword") as HTMLInputElement | null;
        input?.focus();
        input?.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            doAuth();
            dlg.Close();
        });
    }, MODAL_DOM_DELAY);
}

rdpAddBtn.addEventListener('click', () => {
    const input = rdpAddUrlInput.value.trim();
    if (!input) return;
    rdpRemotes.push({ url: input });
    rdpAddUrlInput.value = '';
    rdpRenderList();
});
rdpAddUrlInput.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') rdpAddBtn.click(); });

const rdpSidebarEl = CDOM.ID("rdp-sidebar") as HTMLDivElement;
const rdpSidebarToggleBtn = CDOM.ID("rdpSidebarToggle") as HTMLButtonElement;
const rdpSidebarOffcanvas = new (window as any).bootstrap.Offcanvas(rdpSidebarEl, { backdrop: false, scroll: true });
rdpSidebarEl.addEventListener('shown.bs.offcanvas', () => {
    rdpSidebarToggleBtn.querySelector('i')!.className = 'bi bi-layout-sidebar-inset';
});
rdpSidebarEl.addEventListener('hidden.bs.offcanvas', () => {
    rdpSidebarToggleBtn.querySelector('i')!.className = 'bi bi-layout-sidebar';
});
rdpSidebarEl.style.transition = 'none';
rdpSidebarOffcanvas.show();
requestAnimationFrame(() => { rdpSidebarEl.style.transition = ''; });
function toggleRdpSidebar() {
    const wasShown = rdpSidebarEl.classList.contains('show');
    rdpSidebarOffcanvas.toggle();
    setTimeout(() => wasShown ? focusActiveRdpFrame() : rdpSidebarEl.focus(), 0);
}
function openRdpSidebar() {
    rdpSidebarOffcanvas.show();
}
function handleRdpTabKey() {
    toggleRdpSidebar();
}
rdpSidebarToggleBtn.addEventListener('click', toggleRdpSidebar);

let rdpInited = false;
function rdpInitIfNeeded() {
    if (rdpInited) return;
    rdpInited = true;
    rdpRenderList();
    rdpOpenLocal();
}
CDOM.ID("rdp-tab").addEventListener("shown.bs.tab", () => { rdpInitIfNeeded(); openRdpSidebar(); updateRdpFrameVisibility(); });
CDOM.ID("rdp-tab").addEventListener("hidden.bs.tab", () => updateRdpFrameVisibility());
// rdpOpenLocal()이 g_fileWebRootUrl(파일 하단에서 선언됨)을 참조하므로, 모듈 평가가 끝난
// 뒤로 미뤄서 호출한다(그대로 동기 호출하면 TDZ로 'g_fileWebRootUrl' 참조 에러가 난다).
if (CDOM.ID("rdp-panel").classList.contains("show")) queueMicrotask(() => rdpInitIfNeeded());

function showAiTermSubtab() {
    showTab('ai-term-subtab');
}

CDOM.ID("ai-tab").addEventListener("shown.bs.tab", () => {
    openAiSidebar();
    showAiTermSubtab();
    aiShowAuthOrLoad();
    updateBrowserFrameVisibility();
});
CDOM.ID("ai-tab").addEventListener("click", () => {
    if (CDOM.ID("ai-tab").classList.contains("active")) goProviderStatusPage();
});
CDOM.ID("ai-tab").addEventListener("hidden.bs.tab", () => updateBrowserFrameVisibility());
CDOM.ID("ai-browser-subtab").addEventListener("shown.bs.tab", () => updateBrowserFrameVisibility());
CDOM.ID("ai-browser-subtab").addEventListener("hidden.bs.tab", () => updateBrowserFrameVisibility());
// also init if AI tab is the restored last-active tab
if (CDOM.ID("ai-panel").classList.contains("show")) {
    openAiSidebar();
    showAiTermSubtab();
    aiShowAuthOrLoad();
}

//==================================================================================================================
var g_contentJBox=new CModal("content_modal");
g_contentJBox.SetCloseToHide(true);
g_contentJBox.SetBody("<img id='ImageModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' onclick='NextPhoto()'/>"+
			"<video id='VideoModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' controls onended='NextPhoto()'></video>"+
			"<a id='FileModalSrc' download >Download</a>"+
            "<div id='SourceSrc'/>");
g_contentJBox.Hide();
g_contentJBox.Open(CModal.ePos.Center);


var g_deleteJBox=new CModal("delete_modal");
//g_deleteJBox.SetSize(400,600);
g_deleteJBox.SetCloseToHide(true);
g_deleteJBox.SetBody("<div id='Delete_div'/>");
g_deleteJBox.Hide();
g_deleteJBox.Open(CModal.ePos.Center);



var g_musicJBox: CModalMusic;



function vcsTag(fl: { Status?: string, name?: string }): string {
    const s = fl.Status;
    if (!s) return '';
    const color = s === 'A' ? 'success' : s === 'D' ? 'danger' : s === 'M' ? 'warning' : 'secondary';
    const canDiff = s === 'M' || s === 'A' || s === 'D';
    if (canDiff) {
        const filePath = ((gRoot as string) ?? '') + ((gPath as string) ?? '') + (fl.name ?? '');
        const escaped = filePath.replace(/'/g, "\\'");
        return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;cursor:pointer;" onclick="event.stopPropagation();openVcsDiff('${escaped}')">${s}</span>`;
    }
    return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;">${s}</span>`;
}

let index=0;
var folderList={"<>":"ul","class":"list-group","html":[]};
var fileList={"<>":"ul","class":"list-group","html":[]};

// ---- 파일 항목 종류 분류 + 종류별 (아이콘 / 클릭 동작) 테이블 ----
type FileKind = 'folder'|'image'|'audio'|'video'|'soundlist'|'html'|'code'|'md'|'sheet'|'file';
const EXT_KIND: Record<string, FileKind> = {
    png:'image', jpg:'image', jpeg:'image', bmp:'image',
    mp3:'audio', ogg:'audio',
    mp4:'video', mov:'video', avi:'video',
    soundlist:'soundlist', html:'html', md:'md',
    ts:'code', js:'code', txt:'code', json:'code',
    csv:'sheet', xlsx:'sheet', xls:'sheet',
};
const FILE_ICON: Record<FileKind, string> = {
    folder:'bi-folder-fill', image:'bi-folder-image', audio:'bi-folder-music',
    video:'bi-folder-play', soundlist:'bi-flower1', html:'bi-file-earmark-code',
    code:'bi-file-code', md:'bi-file-earmark-text', sheet:'bi-file-earmark-spreadsheet',
    file:'bi-file',
};
const kindOf = (fl: DirEntry): FileKind => fl.file ? (EXT_KIND[fl.ext] ?? 'file') : 'folder';
const downUrl = (fl: DirEntry) => gDown + gPath + fl.name;
// 에디터(텍스트/HTML/시트)에서 저장 콜백 공용. base64를 그대로 업로드한다.
function saveEditedFile(filePath: string, base64: string) {
    const fileName = filePath.split('/').pop();
    CFecth.Exe(FileApiUrl("File/Upload"), FileParam({ path: gRoot + gPath, name: [fileName], data: [base64] }))
        .then(() => CAlert.Info('저장 완료'))
        .catch((e: any) => CAlert.E('저장 실패: ' + e.message));
}
const textToBase64 = (text: string) => btoa(unescape(encodeURIComponent(text)));

function openFolder(fl: DirEntry) {
    if (CDOM.IDValue("soundAddType") == "1") {
        const p2: any = { path: gPath + fl.name + "/" };
        if (RootPath) p2.RootPath = RootPath;
        if (RootUrl)  p2.RootUrl = RootUrl;
        CFecth.Exe(FileApiUrl("File/List"), FileParam(p2), "json").then((data: {"list","RootPath","path","RootUrl"}) => {
            CAlert.Info(gPath + fl.name + "추가");
            for (const fl2 of data.list as Array<DirEntry>) {
                if (fl.name == fl2.name) continue;
                if (fl2.ext == "mp3" || fl2.ext == "ogg")
                    g_musicJBox.AddTrack(fl2.name, gDown + gPath + fl.name + "/" + fl2.name);
            }
            g_musicJBox.Play(0);
        });
    } else {
        FolderCD(gPath + fl.name + "/");
    }
}
function openImage(fl: DirEntry) {
    CDOM.ID("ImageModalSrc").hidden = false;
    (CDOM.ID("ImageModalSrc") as HTMLImageElement).src = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").hidden = true;
    fl.open = true;
    RefreshOpen();
    g_contentJBox.Show();
}
function openAudio(fl: DirEntry) {
    if (CDOM.IDValue("soundAddType") == "1") {
        g_musicJBox.AddTrack(fl.name, downUrl(fl));
        CAlert.Info(fl.name + " 추가");
    } else {
        const names: string[] = [fl.name];
        const paths: string[] = [downUrl(fl)];
        for (const fl2 of gDirList) {
            if (fl.name == fl2.name) continue;
            if (fl2.ext == "mp3" || fl2.ext == "ogg") {
                const fp = gDown + gPath + fl2.name;
                if (!paths.includes(fp)) { names.push(fl2.name); paths.push(fp); }
            }
        }
        g_musicJBox.SetList(names, paths);
        g_musicJBox.Play(0);
    }
    fl.open = true;
    RefreshOpen();
}
function openVideo(fl: DirEntry) {
    CDOM.ID("ImageModalSrc").hidden = true;
    (CDOM.ID("VideoModalSrc") as HTMLVideoElement).src = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = false;
    CDOM.ID("FileModalSrc").hidden = true;
    fl.open = true;
    RefreshOpen();
    g_contentJBox.Show();
}
function openSoundList(fl: DirEntry) {
    const oReq = new XMLHttpRequest();
    oReq.onload = () => {
        if (oReq.status != 200) { CAlert.E("XMLHttpRequest error code" + oReq.status); return; }
        const d = oReq.response;
        g_musicJBox.SetList(d.name || [], d.fullPath || []);
        CAlert.Info("ListUp!");
    };
    oReq.open("GET", downUrl(fl));
    oReq.responseType = "json";
    oReq.send();
}
function openHtml(fl: DirEntry) {
    const confirm = new CConfirm();
    confirm.SetBody("HTML 파일을 어떻게 열까요?");
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => { window.open(downUrl(fl), "_blank"); },
        () => { new CFileViewer([downUrl(fl)], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open(); },
    ], ["New Window", "File Viewer"]);
    confirm.Open();
}
function openCode(fl: DirEntry) {
    new CFileViewer([downUrl(fl)], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open();
}
function openMd(fl: DirEntry) {
    new CMDViewer(downUrl(fl));
}
function openSheet(fl: DirEntry) {
    new CSheetViewer([downUrl(fl)], async (filePath, base64) => saveEditedFile(filePath, base64)).Open();
}
function openGenericFile(fl: DirEntry) {
    CDOM.ID("ImageModalSrc").hidden = true;
    (CDOM.ID("FileModalSrc") as HTMLLinkElement).href = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").hidden = false;
    g_contentJBox.Show();
}
const FILE_OPEN: Record<FileKind, (fl: DirEntry) => void> = {
    folder: openFolder, image: openImage, audio: openAudio, video: openVideo,
    soundlist: openSoundList, html: openHtml, code: openCode, md: openMd,
    sheet: openSheet, file: openGenericFile,
};

function updateFileUrlBar() {
    const input = document.getElementById('fileUrlInput') as HTMLInputElement | null;
    if (!input) return;
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('path', gPath ?? '/');
    if (RootPath) url.searchParams.set('RootPath', RootPath);
    if (RootUrl)  url.searchParams.set('RootUrl', RootUrl);
    input.value = url.toString();
}

function DirListRefresh()
{
    updateFileUrlBar();
    CDOM.ID("File_div").innerHTML="";
    CDOM.ID("Delete_div").innerHTML="";
    folderList={"<>":"ul","class":"list-group","html":[]};
    fileList={"<>":"ul","class":"list-group","html":[]};

    if(gPath!=null && gPath!="/")
    {
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-warning list-group-item-action","html":"<i class='bi bi-folder'></i> Root Folder",
            "onclick":()=>{FolderCD("/")},
        });
        let path=(gPath as string);
        let pos=path.lastIndexOf("/",path.length-2);
        let bpath=path.substr(0,pos);
        bpath+="/";
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-primary list-group-item-action","html":"<i class='bi bi-folder'></i> Parent Folder",
            "onclick":()=>{FolderCD(bpath)},
        });
    }

    for(let fl of gDirList as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number,Status?:string}>)
    {
        if(fl.hidden)   continue;
        fl.open=false;
        fl.index=index;
        index++;
        
        const kind = kindOf(fl);
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
            "html":`<i class='bi ${FILE_ICON[kind]}'>${fl.name}${vcsTag(fl)}`,"onclick":()=>FILE_OPEN[kind](fl)});

        if(fl.file==true)
        {
            fileList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":`<i class='bi bi-file'>${fl.name}${vcsTag(fl)}`,"onclick":()=>Delete(fl.name)});
        }

    }

    CDOM.ID("File_div").append(CDOM.DataToDom(folderList));
    CDOM.ID("Delete_div").append(CDOM.DataToDom(fileList));
}

// F1 File Manager에서 마지막으로 고른 루트를 기억해뒀다가, URL 쿼리(path/RootPath/RootUrl)가 없는
// 일반 진입 시에는 그 값을 기본 선택으로 복원한다.
const FILE_ROOT_KEY = 'artgine.fileRoot';
// SelKey: 사용자가 File Manager에서 실제로 클릭한 옵션의 식별자.
// 'workingpath'면 WorkingPath 항목, 그 외엔 설정 루트의 원본(미정규화) path 문자열.
// RootPath는 서버 왕복(File/Root, File/List)을 거치며 슬래시 정규화 등으로 형태가 바뀌므로,
// 그 값으로 드롭다운 선택을 역추정하면 다른 루트를 골라도 매칭이 깨진다. 그래서 SelKey를 따로 기억한다.
function loadPersistedFileRoot(): { RootPath: string | null, RootUrl: string | null, SelKey: string | null } {
    try {
        const v = JSON.parse(localStorage.getItem(FILE_ROOT_KEY) || '{}');
        return { RootPath: v.RootPath ?? null, RootUrl: v.RootUrl ?? null, SelKey: v.SelKey ?? null };
    } catch { return { RootPath: null, RootUrl: null, SelKey: null }; }
}
function savePersistedFileRoot(rootPath: string | null, rootUrl: string | null, selKey: string | null) {
    try { localStorage.setItem(FILE_ROOT_KEY, JSON.stringify({ RootPath: rootPath, RootUrl: rootUrl, SelKey: selKey })); } catch {}
}
const _persistedFileRoot = loadPersistedFileRoot();
let fileRootSelKey: string | null = _persistedFileRoot.SelKey;

let path=CUtilWeb.Parameter("path");
let RootPath=CUtilWeb.Parameter("RootPath") ?? _persistedFileRoot.RootPath;
let RootUrl=CUtilWeb.Parameter("RootUrl") ?? _persistedFileRoot.RootUrl;
let g_fileWebRootUrl = CPath.WebRootUrl();

let fileAuthed = !!getAuthToken(g_fileWebRootUrl);
function setFileAuthed(authed: boolean) {
    fileAuthed = authed;
    applyFileAuthIndicator(authed);
}

// ---- 파일 브라우저 상태 (이전 window["g_*"] 전역을 타입 있는 모듈 변수로 대체) ----
interface DirEntry { hidden: boolean; file: boolean; name: string; ext: string; open: boolean; index: number; Status?: string; }
interface FileRoot { path: string; name: string; url?: string; }
let gPath = '/';                 // 현재 폴더 경로
let gRoot = '';                  // 루트 절대경로 prefix (RootPath)
let gDown = '';                  // 다운로드 베이스 URL
let gRoots: FileRoot[] = [];     // 선택 가능한 루트 목록
let gDirList: DirEntry[] = [];   // 현재 폴더의 항목 목록

const cachedDirList = CStorage.Get(path == null ? "root" : path);
if (cachedDirList != null) {
    gDirList = JSON.parse(cachedDirList);
    DirListRefresh();
}

function NormalizeWebRootUrl(url: string): string {
    return url.replace(/\/+$/, '') + '/';
}

function ResolveFileUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith("http://") || url.startsWith("https://")) return url.replace(/\/+$/, '');
    return new URL(url, g_fileWebRootUrl).href.replace(/\/+$/, '');
}

function FileApiUrl(path: string): string {
    return g_fileWebRootUrl + path.replace(/^\/+/, '');
}

function GetFileToken(): string {
    return getAuthToken(g_fileWebRootUrl);
}

function SetFileToken(token: string) {
    setAuthToken(g_fileWebRootUrl, token);
}

// File/* 요청 본문에 토큰을 동봉한다. 다른 origin(원격 서버)으로 보내는 cross-origin
// fetch는 쿠키가 기본적으로 첨부되지 않으므로, 서버가 토큰 우선으로 인증할 수 있게 한다.
function FileParam(extra: object = {}): object {
    return { ...extra, token: GetFileToken() };
}

// 현재 접속된 서버 기준 Home.html URL(주소)을 재구성한다. RemoteCMDGuide.md의 `## 주소` 형식과 동일.
function BuildFileHomeUrl(): string {
    const base = g_fileWebRootUrl.replace(/\/+$/, '');
    let url = base + "/proj/Home/Home.html";
    const q: string[] = [];
    if (path)     q.push("path=" + encodeURIComponent(path));
    if (RootPath) q.push("RootPath=" + encodeURIComponent(RootPath));
    if (RootUrl)  q.push("RootUrl=" + encodeURIComponent(RootUrl));
    if (q.length) url += "?" + q.join("&");
    return url;
}

// RDP 사이드바에서 원격 서버로 전환되어 인증이 확인됐을 때(refreshFileAuthState) 호출된다.
// 그 원격 서버의 주소/토큰을 "현재 구동 중인(페이지가 떠 있는)" 서버로 보내 ai/RemoteCMDGuide.md를 갱신한다.
// (리모트 서버 자신에게 보내면 로컬 AI가 볼 수 없는 파일이 갱신되므로 의미가 없다 — g_fileWebRootUrl이 아니라 CPath.WebRootUrl()로 보낸다.)
async function SendRemoteGuide(token: string) {
    try {
        await CFecth.Exe(CPath.WebRootUrl() + "RemoteCMD/Write", { addr: BuildFileHomeUrl(), token }, "json");
    } catch (e) {
        // 가이드 갱신 실패는 인증 흐름에 영향을 주지 않는다.
        console.error("RemoteCMD/Write update failed:", e);
    }
}

function SyncFileRoot(data: {RootPath?: string | null, RootUrl?: string | null, roots?: Array<{path:string,name:string,url?:string}>}) {
    if (data.RootPath != null) RootPath = data.RootPath;
    if (data.RootUrl != null) RootUrl = data.RootUrl;
    gRoot=(RootPath as string)?.replace(/\/+$/, '') ?? '';
    gDown=ResolveFileUrl(RootUrl);
    if (data.roots) gRoots=data.roots;
}

async function fileCheckAuth(): Promise<boolean> {
    const token = GetFileToken();
    if (!token) return false;
    try {
        const j = await CFecth.Exe(FileApiUrl("auth/check"), { token }, "json") as any;
        return !!j?.authed;
    } catch { return false; }
}

async function refreshFileAuthState() {
    const checkedWebRootUrl = g_fileWebRootUrl;
    const hasToken = !!GetFileToken();
    fileAuthed = hasToken;
    applyFileAuthIndicator(false);
    if (!hasToken) return;
    const valid = await fileCheckAuth();
    if (!valid) removeAuthToken(checkedWebRootUrl);
    if (checkedWebRootUrl !== g_fileWebRootUrl) return;
    setFileAuthed(valid);
    // RDP 사이드바에서 원격 서버로 전환해 인증이 확인된 시점에 가이드를 갱신한다(로컬 자기 자신은 대상이 아님).
    if (valid && checkedWebRootUrl !== CPath.WebRootUrl()) SendRemoteGuide(GetFileToken());
}

async function InitFileRoot() {
    const rootParam: any = {};
    if(RootPath) rootParam.RootPath = RootPath;
    if(RootUrl)  rootParam.RootUrl = RootUrl;
    const data = await CFecth.Exe(FileApiUrl("File/Root"), rootParam, "json") as {RootPath:string, RootUrl:string, roots:Array<{path:string,name:string,url?:string}>};
    SyncFileRoot(data);
}

async function FetchFileList(_path) {
    let fetchParam: any = {path:_path};
    if(RootPath) fetchParam.RootPath = RootPath;
    if(RootUrl)  fetchParam.RootUrl = RootUrl;
    return await CFecth.Exe(FileApiUrl("File/List"), FileParam(fetchParam), "json") as {"list","RootPath","path","RootUrl"};
}

async function LoadFileList(_path) {
    const data = await FetchFileList(_path);
    CStorage.Set(_path==null?"root":_path,JSON.stringify(data.list));
    gDirList=data.list;
    SyncFileRoot(data);
    gPath=data.path;
    DirListRefresh();
}

function ParseFileHomeUrl(input: string): {webRootUrl:string, path:string, RootPath:string | null, RootUrl:string | null} {
    const u = new URL(input);
    const marker = "/proj/Home/Home.html";
    const homeIdx = u.pathname.indexOf(marker);
    const basePath = homeIdx >= 0 ? u.pathname.substring(0, homeIdx) : u.pathname;
    return {
        webRootUrl: NormalizeWebRootUrl(u.origin + (basePath || "/")),
        path: u.searchParams.get("path") || "/",
        RootPath: u.searchParams.get("RootPath"),
        RootUrl: u.searchParams.get("RootUrl"),
    };
}

async function ConnectFileHomeUrl(input?: string) {
    if (!input) {
        g_fileWebRootUrl = CPath.WebRootUrl();
        RootPath = null;
        RootUrl = null;
        path = "/";
    }
    else {
        const parsed = ParseFileHomeUrl(input);
        g_fileWebRootUrl = parsed.webRootUrl;
        RootPath = parsed.RootPath;
        RootUrl = parsed.RootUrl;
        path = parsed.path;
    }

    try {
        await InitFileRoot();
    } catch (err) {
        throw err;
    }
    await LoadFileList(path);
    refreshFileAuthState();
    memoNotifyRootChanged();
}
window["ConnectFileHomeUrl"] = ConnectFileHomeUrl;

{
    const fileHomeUrlParam = CUtilWeb.Parameter("FileHomeUrl");
    if (fileHomeUrlParam) {
        ConnectFileHomeUrl(fileHomeUrlParam);
    } else {
        // path/RootPath/RootUrl are already initialized from URL params above (lines ~2310-2312).
        // ConnectFileHomeUrl(undefined) would reset them to defaults, so call the init steps directly.
        (async () => {
            try { await InitFileRoot(); } catch {}
            await LoadFileList(path ?? '/');
            refreshFileAuthState();
            memoNotifyRootChanged();
        })();
    }
}



{
    const _sd = CStorage.Get("SoundList");
    const _d = _sd ? JSON.parse(_sd) : {name:[] as string[], fullPath:[] as string[]};
    g_musicJBox = new CModalMusic(
        _d.name, _d.fullPath,
        (names, paths) => CStorage.Set("SoundList", JSON.stringify({name:names,fullPath:paths}))
    );
}

function FolderCD(_path, _onDone?: () => void)
{
    gPath=_path;
    FetchFileList(_path).then((data : {"list","RootPath","path","RootUrl"})=>{
        gDirList=data.list;
        SyncFileRoot(data);
        gPath=data.path;
        index=0;
        DirListRefresh();
        _onDone?.();
    });
}
window["FolderCD"]=FolderCD;

var g_fun="";
var g_data="";
var g_option="";
// 변경 후
function Redirection(_multi : boolean)
{
    var form = CDOM.ID("ThisPage") as HTMLFormElement;
    form.setAttribute("charset", "UTF-8");
    form.setAttribute("method", "Post");
    // 원격 서버로 보낼 수도 있어 쿠키에 의존하지 않고 hidden input(token)으로 직접 인증한다.
    form.setAttribute("action", FileApiUrl("File/Redirection"));

    CDOM.IDValue("fun",g_fun);
    CDOM.IDValue("data",g_data);
    CDOM.IDValue("option",g_option);
    CDOM.IDValue("path",gPath);
    CDOM.IDValue("RootPath", RootPath ?? "");
    CDOM.IDValue("RootUrl", RootUrl ?? "");
    CDOM.IDValue("redirToken", GetFileToken());

    form.submit();
}
window["Redirection"]=Redirection;

//var pageAction=CWebUtil.Parameter("pageAction","");




//==========================================================


var g_menuList={"<>":"div","class":"d-flex align-items-center p-1","html":[
    {"<>":"form","action":"FilePage.jsp","id":"ThisPage","name":"ThisPage","method":"post","accept-charset":"UTF-8","html":[
        {"<>":"input","type":"hidden","id":"fun","name":"fun"},
        {"<>":"input","type":"hidden","id":"data","name":"data"},
        {"<>":"input","type":"hidden","id":"option","name":"option"},
        {"<>":"input","type":"hidden","id":"path","name":"path"},
        {"<>":"input","type":"hidden","id":"RootPath","name":"RootPath"},
        {"<>":"input","type":"hidden","id":"RootUrl","name":"RootUrl"},
        {"<>":"input","type":"hidden","id":"redirToken","name":"token"},
    ]},
    {"<>":"input","type":"file","multiple":"multiple","id":"uploadBtn","name":"uploadBtn","style":"display:none"},
    {"<>":"div","class":"d-flex align-items-center gap-1","html":[
        {"<>":"button","type":"button","class":"btn btn-sm btn-primary","text":"Music","onclick":()=>{
            g_musicJBox.Show();
            g_musicJBox.SetPosition(CModal.ePos.Center);
        }},
        {"<>":"select","class":"form-select form-select-sm","id":"soundAddType","style":"width:128px;","html":[
            {"<>":"option","value":"0","text":"Add All"},
            {"<>":"option","value":"1","text":"Add Each (w/ Folder)"},
        ]},
        {"<>":"button","type":"button","class":"btn btn-sm btn-outline-info","html":"Search <span style='font-size:0.75em;opacity:0.7;'>F2</span>","onclick":()=>{FileSearch();}},
        {"<>":"button","type":"button","class":"btn btn-sm btn-outline-secondary","html":"File <span style='font-size:0.75em;opacity:0.7;'>F1</span>","onclick":()=>{FileBtn();}},
    ]},
]};

CDOM.ID("Menu_div").append(CDOM.DataToDom(g_menuList));

{
    const copyBtn = document.getElementById('fileUrlCopyBtn');
    copyBtn?.addEventListener('click', async () => {
        const input = document.getElementById('fileUrlInput') as HTMLInputElement | null;
        if (!input?.value) return;
        try { await navigator.clipboard.writeText(input.value); }
        catch { input.select(); document.execCommand('copy'); }
        const icon = copyBtn.querySelector('i');
        if (!icon) return;
        icon.className = 'bi bi-clipboard-check';
        setTimeout(() => { icon.className = 'bi bi-clipboard'; }, 1500);
    });
}

async function FileBtn() {
    if (fileAuthed) {
        // 서버 토큰 유효성 검증 (서버 재시작 시 메모리 토큰 초기화됨)
        const valid = await fileCheckAuth();
        if (valid) {
            setFileAuthed(true);
            showFileAdminModal();
            return;
        }
        // 토큰 만료/무효 → 재인증 필요
        setFileAuthed(false);
    }
    promptFileAuth();
}
window["FileBtn"] = FileBtn;
window["PermissionBtn"] = FileBtn;

function showFileAdminModal() {
    const uid = Date.now();

    const _roots = (gRoots as Array<{path:string,name:string,url?:string}>) ?? [];
    // 설정 루트(맵 + 안티앨리싱) 경로를 텍스트로 통합
    const _opts: Array<{path:string,name:string,url?:string}> = [..._roots, { path: "./", name: "Artgine (WorkingPath)" }];
    // 현재 활성 항목 표시: 사용자가 마지막으로 클릭한 SelKey로 직접 매칭한다.
    // (RootPath는 서버 왕복 중 정규화되어 형태가 바뀌므로 비교 기준으로 쓰지 않는다.)
    let _curIdx = fileRootSelKey === 'workingpath'
        ? _opts.length - 1
        : (fileRootSelKey != null ? _roots.findIndex(r => r.path === fileRootSelKey) : -1);
    if (_curIdx < 0) {
        // SelKey 기록이 없는 최초 진입 등에는 RootPath로 추정한다.
        for (let i = _opts.length - 1; i >= 0; i--) {
            if (_opts[i].path === (RootPath || './')) { _curIdx = i; break; }
        }
    }
    if (_curIdx < 0) _curIdx = 0;
    const _rootOpts = _opts.map((r, i) => `<option value="${i}" ${i === _curIdx ? 'selected' : ''}>${r.name}</option>`).join('');

    const modal = new CModal();
    modal.SetHeader("File Manager");
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetCloseToHide(false);
    modal.SetBody(`
        <div class="d-flex flex-column gap-2 p-2" style="width:100%;height:100%;box-sizing:border-box;overflow:hidden;">
            <select id="fadm_rootsel_${uid}" class="form-select form-select-sm" style="width:100%;min-width:0;">${_rootOpts}</select>
            <div class="d-flex gap-1 align-items-center">
                <span class="small text-secondary flex-shrink-0" title="Find from current path"><i class="bi bi-folder2-open"></i> PathTo</span>
                <button id="fadm_chat_${uid}" class="btn btn-outline-primary btn-sm flex-fill">Chat</button>
                <button id="fadm_term_${uid}" class="btn btn-outline-success btn-sm flex-fill">Terminal</button>
            </div>
            <hr class="my-0">
            <div class="accordion" id="fadm_acc_${uid}">
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button py-2 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#fadm_file_actions_body_${uid}" aria-expanded="false" aria-controls="fadm_file_actions_body_${uid}">
                            File Actions
                        </button>
                    </h2>
                    <div id="fadm_file_actions_body_${uid}" class="accordion-collapse collapse" data-bs-parent="#fadm_acc_${uid}">
                        <div class="accordion-body d-flex flex-column gap-2 p-2">
<button id="fadm_folder_${uid}" class="btn btn-warning btn-sm">New Folder</button>
                            <button id="fadm_delete_${uid}" class="btn btn-danger btn-sm">Delete</button>
                            <button id="fadm_upload_${uid}" class="btn btn-primary btn-sm">Upload</button>
                        </div>
                    </div>
                </div>
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button py-2" type="button" data-bs-toggle="collapse" data-bs-target="#fadm_vcs_body_${uid}" aria-expanded="true" aria-controls="fadm_vcs_body_${uid}">
                            Version Control
                        </button>
                    </h2>
                    <div id="fadm_vcs_body_${uid}" class="accordion-collapse collapse show" data-bs-parent="#fadm_acc_${uid}">
                        <div class="accordion-body d-flex flex-column gap-2 p-2">
                            <button id="fadm_vcs_diff_${uid}" class="btn btn-outline-secondary btn-sm w-100">Diff</button>
                            <button id="fadm_vcs_update_${uid}" class="btn btn-outline-primary btn-sm w-100">Update</button>
                            <button id="fadm_vcs_add_${uid}" class="btn btn-outline-info btn-sm w-100">Add (SVN)</button>
                            <button id="fadm_vcs_revert_${uid}" class="btn btn-outline-warning btn-sm w-100">Revert</button>
                            <button id="fadm_vcs_commit_${uid}" class="btn btn-outline-success btn-sm w-100">Commit & Push</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const applyValues = async (rootPath: string, rootUrl: string | undefined, selKey: string) => {
            fileRootSelKey = selKey;
            RootUrl = rootUrl ?? null; // SyncFileRoot는 null을 무시하므로(부분 갱신용) 여기서 직접 초기화해야 이전 루트의 RootUrl이 남지 않는다.
            SyncFileRoot({ RootPath: rootPath || null, RootUrl: rootUrl ?? null });
            savePersistedFileRoot(rootPath || null, rootUrl ?? null, selKey);
            // 루트 리스트가 자기 url을 들고 오면 그대로 사용, 없으면(예: WorkingPath) 서버에서 받아온다.
            if (!rootUrl) await InitFileRoot();
            FolderCD("/");
            showTab('file-tab');
        };

        const rootSel = document.getElementById(`fadm_rootsel_${uid}`) as HTMLSelectElement | null;
        rootSel?.addEventListener('change', () => {
            const idx = parseInt(rootSel.value);
            const r = _opts[idx];
            if (r) applyValues(r.path, r.url, idx === _opts.length - 1 ? 'workingpath' : r.path);
        });
document.getElementById(`fadm_folder_${uid}`)?.addEventListener('click', () => {
            modal.Hide(); CreateFolder();
        });
        document.getElementById(`fadm_delete_${uid}`)?.addEventListener('click', () => {
            openDeleteModal();
        });
        document.getElementById(`fadm_upload_${uid}`)?.addEventListener('click', () => {
            modal.Hide(); (CDOM.ID("uploadBtn") as HTMLInputElement).click();
        });
        // RootUrl은 "로컬 리소스 루트 선택"에도 채워지므로 원격 판단 기준으로 쓰면 안 된다.
        // 진짜 원격 서버 접속 여부는 g_fileWebRootUrl이 로컬 WebRootUrl과 다른지로만 판별한다.
        // 원격 연결은 File 탭에만 영향을 주어야 하므로, Chat/Term은 원격 상태일 때 cwd를 비워 전달받지 않는다.
        const isRemoteServer = () => g_fileWebRootUrl !== CPath.WebRootUrl();
        document.getElementById(`fadm_chat_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = isRemoteServer() ? '' : ((gRoot as string) ?? '') + ((gPath as string) ?? '');
            showTab('[data-bs-target="#ai-panel"]');
            setTimeout(() => showTab('ai-chat-subtab'), 150);
            chatStartNew(cwd || undefined);
        });
        document.getElementById(`fadm_term_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = isRemoteServer() ? '' : ((gRoot as string) ?? '') + ((gPath as string) ?? '');
            showTab('[data-bs-target="#ai-panel"]');
            setTimeout(() => showTab('ai-term-subtab'), 150);
            termStartNew('cmd', cwd || undefined);
        });

        const vcsPath = () => ((gRoot as string) ?? './') + ((gPath as string) ?? '');

        document.getElementById(`fadm_vcs_diff_${uid}`)?.addEventListener('click', () => openVcsDiff(vcsPath()));
        document.getElementById(`fadm_vcs_update_${uid}`)?.addEventListener('click', async () => {
            const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "update", path: vcsPath() }), "json") as any;
            const revLine = res.revision ? `<br><b>Revision: ${res.revision}</b>` : '';
            const msgBody = res.msg ? res.msg.replace(/\n/g, '<br>') : (res.ok ? 'Update complete' : 'Update failed');
            CAlert.Info(msgBody + revLine);
            if (res.ok) FolderCD(gPath);
        });
        document.getElementById(`fadm_vcs_add_${uid}`)?.addEventListener('click', () => openVcsModal('add', vcsPath()));
        document.getElementById(`fadm_vcs_revert_${uid}`)?.addEventListener('click', () => openVcsModal('revert', vcsPath()));
        document.getElementById(`fadm_vcs_commit_${uid}`)?.addEventListener('click', () => openVcsModal('commit', vcsPath()));
    }, MODAL_DOM_DELAY);
}
window["showFileAdminModal"] = showFileAdminModal;

type ActionItem = {badge?:string, badgeClass?:string, icon?:string, label:string, value:string, checked?:boolean};
type ActionRunFn = (values: string[], message?: string) => Promise<{result: string, refresh?: boolean}>;
type ActionItemDblClickFn = (item: ActionItem) => void;

function openActionModal(
    title: string,
    runLabel: string,
    runClass: string,
    onRun: ActionRunFn,
    hasMessage = false,
    fetchItems?: () => Promise<ActionItem[]>,
    staticItems?: ActionItem[],
    onItemDblClick?: ActionItemDblClickFn
) {
    const uid = Date.now();
    const hasFetch = !!fetchItems;

    const modal = new CModal();
    modal.SetHeader(title);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetBody(`
        <div class="d-flex flex-column gap-2 p-1" style="width:380px;height:480px;overflow:hidden;">
            ${hasFetch ? `
            <div class="d-flex gap-2 align-items-center flex-shrink-0">
                ${hasMessage ? `<input id="am_msg_${uid}" type="text" class="form-control form-control-sm flex-fill" placeholder="Commit message...">` : ''}
                <button id="am_refresh_${uid}" class="btn btn-outline-secondary btn-sm flex-shrink-0"><i class="bi bi-arrow-clockwise"></i></button>
            </div>` : hasMessage ? `<input id="am_msg_${uid}" type="text" class="form-control form-control-sm flex-shrink-0" placeholder="Commit message...">` : ''}
            <div id="am_list_${uid}" class="border rounded p-1 flex-fill" style="overflow-y:auto;min-height:0;">
                ${hasFetch ? '<span class="text-secondary">Loading...</span>' : ''}
            </div>
            <div class="d-flex gap-1 flex-shrink-0">
                <button id="am_all_${uid}" class="btn btn-outline-secondary btn-sm">Select All</button>
                <button id="am_run_${uid}" class="btn ${runClass} btn-sm flex-fill">${runLabel}</button>
            </div>
            <pre id="am_result_${uid}" class="p-2 rounded bg-body-secondary small mb-0 flex-shrink-0" style="display:none;max-height:120px;overflow-y:auto;white-space:pre-wrap;"></pre>
        </div>
    `);
    modal.Open(CModal.ePos.Center);

    const listEl   = document.getElementById(`am_list_${uid}`)!;
    const resultEl = document.getElementById(`am_result_${uid}`)!;
    const allBtn   = document.getElementById(`am_all_${uid}`)!;
    const runBtn   = document.getElementById(`am_run_${uid}`)!;
    const msgEl    = document.getElementById(`am_msg_${uid}`) as HTMLInputElement | null;

    let currentItems: ActionItem[] = [];
    const renderItems = (items: ActionItem[] | undefined) => {
        if (!items || items.length === 0) { listEl.innerHTML = '<span class="text-secondary">No items</span>'; return; }
        currentItems = items;
        listEl.innerHTML = items.map((i, idx) => `
            <div class="d-flex align-items-center gap-1 py-1" data-action-idx="${idx}">
                <input type="checkbox" class="form-check-input am-chk-${uid}" value="${i.value}" ${i.checked !== false ? 'checked' : ''}>
                ${i.badge ? `<span class="badge bg-${i.badgeClass ?? 'secondary'}" style="font-size:0.65rem;min-width:1.4rem;">${i.badge}</span>` : ''}
                ${i.icon  ? `<i class="bi ${i.icon}"></i>` : ''}
                <span class="text-truncate mb-0 flex-fill" title="${i.label}">${i.label}</span>
            </div>`).join('');
        if (onItemDblClick) {
            listEl.querySelectorAll<HTMLElement>('[data-action-idx]').forEach(row => {
                row.addEventListener('dblclick', () => {
                    const item = currentItems[parseInt(row.dataset.actionIdx ?? '-1')];
                    if (item) onItemDblClick(item);
                });
            });
        }
    };

    const refresh = async () => {
        if (!fetchItems) return;
        listEl.innerHTML = '<span class="text-secondary">Loading...</span>';
        resultEl.style.display = 'none';
        renderItems(await fetchItems());
    };

    if (fetchItems) refresh();
    else renderItems(staticItems);

    document.getElementById(`am_refresh_${uid}`)?.addEventListener('click', refresh);

    allBtn.addEventListener('click', () => {
        const chks = listEl.querySelectorAll<HTMLInputElement>(`.am-chk-${uid}`);
        const allChecked = Array.from(chks).every(c => c.checked);
        chks.forEach(c => c.checked = !allChecked);
    });

    runBtn.addEventListener('click', async () => {
        const values = Array.from(listEl.querySelectorAll<HTMLInputElement>(`.am-chk-${uid}`))
            .filter(c => c.checked).map(c => c.value);
        if (values.length === 0) { CAlert.Info('No items selected'); return; }
        if (hasMessage && !msgEl?.value.trim()) { CAlert.Info('Please enter a message'); return; }

        runBtn.setAttribute('disabled', '');
        resultEl.style.display = '';
        resultEl.textContent = 'Processing...';
        const { result, refresh: doRefresh } = await onRun(values, msgEl?.value.trim());
        resultEl.textContent = result;
        runBtn.removeAttribute('disabled');
        if (doRefresh) refresh();
    });
}

function openVcsModal(action: 'add' | 'revert' | 'commit', path: string) {
    const statusColor = (s: string) => s === 'M' ? 'warning' : s === 'A' ? 'success' : s === 'D' ? 'danger' : 'secondary';
    const title = action === 'commit' ? 'Commit & Push' : action === 'revert' ? 'Revert' : 'Add';
    const runLabel = action === 'commit' ? 'Commit & Push' : action === 'revert' ? 'Revert' : 'Add';
    const runClass = action === 'commit' ? 'btn-success' : action === 'revert' ? 'btn-warning' : 'btn-info';
    const diffPath = (file: string) => {
        const normalized = file.replace(/\\/g, '/');
        if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/')) return normalized;
        return (path.replace(/\\/g, '/').replace(/\/?$/, '/') + normalized).replace(/\/+/g, '/');
    };
    openActionModal(
        title,
        runLabel,
        runClass,
        async (files, message) => {
            const param: any = { action, path, files };
            if (action === 'commit') param.message = message;
            const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam(param), "json") as any;
            if (res.ok) FolderCD(gPath);
            return { result: res.msg || (res.ok ? 'Done' : 'Failed'), refresh: res.ok };
        },
        action === 'commit',
        async () => {
            const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "status", path }), "json") as any;
            if (!res.ok) return [];
            const items = res.items as {status: string, file: string}[];
            // SVN의 '?'(미버전) 파일은 svn add 전엔 커밋 대상이 아니므로 commit 목록에서 제외
            const filtered = action === 'add'
                ? items.filter(i => i.status === '?')
                : (action === 'commit' && res.vcs === 'svn')
                    ? items.filter(i => i.status !== '?')
                    : items;
            return filtered.map(i => ({ badge: i.status, badgeClass: statusColor(i.status), label: i.file, value: i.file, checked: true }));
        },
        undefined,
        action === 'add' ? undefined : item => openVcsDiff(diffPath(item.value))
    );
}

async function openVcsDiff(filePath: string) {
    let res: any;
    try {
        res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "diff", path: filePath }), "json");
    } catch (e) {
        CAlert.Info("Diff request failed"); return;
    }
    if (!res?.ok) { CAlert.Info(res?.msg || "Diff failed"); return; }

    // 라인번호 td가 position:absolute라 스크롤 영역 내에 기준(position:relative)이 필요.
    // 없으면 세로 스크롤 시 코드만 움직이고 라인번호가 안 따라가서 1픽셀만 주입.
    if (!document.getElementById("vcs-diff-style")) {
        const st = document.createElement("style");
        st.id = "vcs-diff-style";
        st.textContent = "#vcs-diff-view .d2h-code-wrapper{position:relative;}";
        document.head.appendChild(st);
    }

    const modal = new CModal();
    modal.SetHeader(`Diff: ${filePath.replace(/\/+$/, '').split('/').pop() || filePath}`);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetBody(`<div id="vcs-diff-view"></div>`);
    modal.SetSize(860, 580);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const el = document.getElementById("vcs-diff-view");
        if (!el) return;
        const D2H = (window as any).Diff2HtmlUI;
        if (!D2H) { el.textContent = "diff2html not loaded"; return; }
        const cfg = { drawFileList: false, matching: "lines", outputFormat: "line-by-line", highlight: false, stickyFileHeaders: false };
        new D2H(el, res.diff, cfg).draw();
    }, MODAL_DOM_DELAY);
}
window["openVcsDiff"] = openVcsDiff;

function openDeleteModal() {
    const dirList = (gDirList as Array<{file:boolean, name:string, hidden?:boolean}>) ?? [];
    openActionModal(
        'Delete',
        'Delete',
        'btn-danger',
        async (names) => {
            const lines: string[] = [];
            for (const name of names) {
                const param: any = { data: gPath + name };
                if (RootPath) param.RootPath = RootPath;
                const res = await CFecth.Exe(FileApiUrl("File/Delete"), FileParam(param), "json") as any;
                lines.push(`${res.ok ? 'OK' : 'FAIL'} ${name}`);
            }
            FolderCD(gPath);
            return { result: lines.join('\n') };
        },
        false,
        undefined,
        dirList
            .filter(fl => !fl.hidden)
            .map(fl => ({ icon: fl.file ? 'bi-file' : 'bi-folder-fill', label: fl.name, value: fl.name, checked: false }))
    );
}

function CreateFolder()
{
    let confirm=new CConfirm();
    confirm.SetBody('Enter folder name:<br><input type="text" id="CreateFolder" class="form-control form-control-sm" value="New Folder">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    async ()=> {
        const folderName = CDOM.IDValue("CreateFolder");
        const data = gPath + folderName;
        const param: any = { data };
        if (RootPath) param.RootPath = RootPath;
        const j = await CFecth.Exe(FileApiUrl("File/Mkdir"), FileParam(param), "json") as any;
        if (j?.ok) FolderCD(gPath);
        else CAlert.E("폴더 생성 실패");
    },
    ()=> {},
    ],["Yes","No"])
    confirm.Open();
}
window["CreateFolder"]=CreateFolder;
function Delete(_file)
{
    g_fun="Delete";
    g_data=gPath+_file;
    Redirection(false);
}
window["Delete"]=Delete;

type SrchFile = {hidden:boolean,file:boolean,name:string,ext:string};
const SEARCH_EXCLUDE_DIRS = ['node_modules'];
const isSearchExcluded = (name: string) => name.startsWith('.') || SEARCH_EXCLUDE_DIRS.includes(name);
// 서버 루트 단위로 캐시 유지 — 경로가 바뀌어도 유지, 해당 subtree 항목만 활용
let g_srchCache: Map<string, SrchFile[]> = new Map(); // dirPath ??fileList
let g_srchServerKey = '';

async function FileSearch() {
    let searchCancelled = false;
    const uid = Date.now();

    const modal = new CModal();
    modal.SetHeader("File Search");
    modal.SetBody(`
        <div class="d-flex gap-2 mb-2">
            <input type="text" id="srchInput_${uid}" class="form-control form-control-sm" placeholder="Filename (partial match)...">
            <button id="srchBtn_${uid}" class="btn btn-sm btn-primary">Search</button>
            <button id="srchStop_${uid}" class="btn btn-sm btn-outline-danger" style="display:none;">Stop</button>
        </div>
        <div id="srchStatus_${uid}" class="small text-secondary mb-1" style="min-height:1.2em;"></div>
        <div id="srchResults_${uid}" class="list-group" style="max-height:360px;overflow-y:auto;font-size:13px;"></div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(520, 520);
    modal.Open(CModal.ePos.Center);

    await new Promise<void>(r => setTimeout(r, MODAL_DOM_DELAY));

    const input   = document.getElementById(`srchInput_${uid}`)  as HTMLInputElement;
    const btn     = document.getElementById(`srchBtn_${uid}`)    as HTMLButtonElement;
    const stopBtn = document.getElementById(`srchStop_${uid}`)   as HTMLButtonElement;
    const status  = document.getElementById(`srchStatus_${uid}`) as HTMLElement;
    const results = document.getElementById(`srchResults_${uid}`) as HTMLElement;

    const makeItem = (fl: SrchFile, dirPath: string) => {
        const item = document.createElement('div');
        item.className = 'list-group-item list-group-item-action py-1 px-2';
        const icon = fl.file ? 'bi-file-earmark' : 'bi-folder-fill text-warning';
        item.innerHTML =
            `<i class="bi ${icon} me-1"></i><strong>${fl.name}</strong>` +
            `<span class="text-muted ms-2" style="font-size:11px;">${dirPath}</span>`;
        const switchToFileTab = () => {
            showTab('file-tab');
        };
        if (fl.file) {
            item.addEventListener('click', () => {
                modal.Hide();
                switchToFileTab();
                FolderCD(dirPath, () => {
                    const els = document.querySelectorAll('#File_div .list-group-item');
                    for (const el of Array.from(els)) {
                        if (el.textContent?.includes(fl.name)) { (el as HTMLElement).click(); break; }
                    }
                });
            });
        } else {
            item.addEventListener('click', () => { FolderCD(dirPath + fl.name + '/'); switchToFileTab(); });
        }
        return item;
    };

    const renderFromCache = (startPath: string, query: string) => {
        results.innerHTML = '';
        let found = 0;
        for (const [dirPath, list] of g_srchCache) {
            if (!dirPath.startsWith(startPath)) continue;
            for (const fl of list) {
                if (fl.hidden || isSearchExcluded(fl.name)) continue;
                if (fl.name.toLowerCase().includes(query)) {
                    results.appendChild(makeItem(fl, dirPath));
                    if (++found >= 200) return found;
                }
            }
        }
        return found;
    };

    const doSearch = async () => {
        const query = input.value.trim().toLowerCase();
        if (!query) return;

        const startPath = gPath ?? "/";
        const serverKey = (RootPath ?? '') + '|' + (RootUrl ?? '');
        if (g_srchServerKey !== serverKey) { g_srchCache = new Map(); g_srchServerKey = serverKey; }

        searchCancelled = false;
        btn.disabled = true;
        stopBtn.style.display = '';
        results.innerHTML = '';
        status.textContent = 'Scanning...';
        let found = 0;

        const queue: string[] = [startPath];
        while (queue.length > 0 && !searchCancelled) {
            const dirPath = queue.shift()!;
            status.textContent = `Scanning: ${dirPath}`;
            try {
                let p2: any = { path: dirPath };
                if (RootPath) p2.RootPath = RootPath;
                if (RootUrl)  p2.RootUrl  = RootUrl;
                const data = await CFecth.Exe(FileApiUrl("File/List"), FileParam(p2), "json") as { list: Array<SrchFile> };
                g_srchCache.set(dirPath, data.list);
                for (const fl of data.list) {
                    if (!fl.hidden && !fl.file && !isSearchExcluded(fl.name)) queue.push(dirPath + fl.name + '/');
                    if (!fl.hidden && fl.name.toLowerCase().includes(query) && found < 200) {
                        results.appendChild(makeItem(fl, dirPath));
                        found++;
                    }
                }
            } catch (_) {}
        }

        const cap = found >= 200 ? ' (capped at 200)' : '';
        status.textContent = searchCancelled ? `Stopped. (${found} result(s))` : found === 0 ? 'No results.' : `${found} result(s)${cap}`;
        btn.disabled = false;
        stopBtn.style.display = 'none';
    };

    stopBtn.addEventListener('click', () => { searchCancelled = true; });
    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') doSearch(); });
    input.focus();
}
window["FileSearch"] = FileSearch;




CDOM.ID("uploadBtn").onchange=async (e)=>{

    var fi=e.target as HTMLInputElement;
    const path=gRoot+gPath;

    // arrayBuffer() 대신 FileReader 사용: iOS Safari에서 대용량 파일 안정성이 높음
    const readAsBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // data:image/jpeg;base64,XXX ??XXX
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

    for(let i=0;i<fi.files.length;++i)
    {
        try {
            const name=fi.files[i].name;
            const data=await readAsBase64(fi.files[i]);
            await CFecth.Exe(FileApiUrl("File/Upload"), FileParam({data:[data],name:[name],path}));
        } catch(err: any) {
            CAlert.E('Upload failed: ' + (err?.message ?? String(err)));
            return;
        }
    }
    Redirection(true);
    
};

function SoundPlayListSave()
{
    let confirm=new CConfirm();
    confirm.SetBody('Enter file name to save:<br><input type="text" id="soundListSave" class="form-control form-control-sm" value="basic">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    ()=> {
        g_fun="SoundPlayListSave";
			g_data=JSON.stringify({name:g_musicJBox.Names,fullPath:g_musicJBox.Paths});
            g_option=CDOM.IDValue("soundListSave");
			Redirection(false);
        
    },
    ()=> {
        
    },
    ],["Yes","No"])
    confirm.Open();

  
}
window["SoundPlayListSave"]=SoundPlayListSave;




function RefreshOpen()
{
    
    for(let fl of gDirList as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number,Status?:string}>)
    {
        if(fl.index==null)  continue;
        if(fl.open==false)
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action";
        }
        else
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action list-group-item-secondary";
        }
    }
}
window["RefreshOpen"]=RefreshOpen;
function NextPhoto()
{
    for(let fl of gDirList as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number,Status?:string}>)
    {
        if(fl.open==false)
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action list-group-item-secondary";
            fl.open=true;
            if(fl.ext=="png" || fl.ext=="jpg" || fl.ext=="jpeg" || fl.ext=="bmp")
            {
                CDOM.ID("ImageModalSrc").hidden=false;
                (CDOM.ID("ImageModalSrc") as HTMLImageElement).src=gDown+gPath+fl.name;
                CDOM.ID("VideoModalSrc").hidden=true;
                CDOM.ID("FileModalSrc").hidden=true;
            }
            else if(fl.ext=="mp4" || fl.ext=="mov" || fl.ext=="avi")
            {
                CDOM.ID("ImageModalSrc").hidden=true;
                (CDOM.ID("VideoModalSrc") as HTMLVideoElement).src=gDown+gPath+fl.name;
                CDOM.ID("VideoModalSrc").hidden=false;
                CDOM.ID("FileModalSrc").hidden=true;
            }
            return;
        }
      
        
    }
    CAlert.Info("더 이상 없습니다.");
}
window["NextPhoto"]=NextPhoto;






// ==================================================================================================================
// 메모 (artgine/server/html/Memo.html을 iframe으로 임베드)
// ==================================================================================================================
const memoTab = CDOM.ID("memo-tab") as HTMLButtonElement;
const memoPanel = CDOM.ID("memo") as HTMLDivElement;
let memoIframe: HTMLIFrameElement | null = null;
let memoLoadedRootUrl: string | null = null;

function memoEnsureLayout() {
    if (memoIframe) return;
    memoPanel.classList.add("position-relative");
    memoPanel.style.overflow = "hidden";
    memoIframe = document.createElement("iframe");
    memoIframe.id = "memo-iframe";
    memoIframe.style.cssText = "position:absolute; inset:0; width:100%; height:100%; border:none;";
    memoPanel.appendChild(memoIframe);
}

// RDP 전환으로 g_fileWebRootUrl이 바뀌면 그 서버의 Memo.html을 다시 로드한다.
function memoLoadFrame() {
    memoEnsureLayout();
    if (memoLoadedRootUrl === g_fileWebRootUrl) return;
    memoLoadedRootUrl = g_fileWebRootUrl;
    memoIframe!.src = `${g_fileWebRootUrl}artgine/server/html/Memo.html`;
}

memoEnsureLayout();
let memoInited = false;
function memoTryInit() {
    if (memoInited) return;
    memoInited = true;
    memoLoadFrame();
}
// F7 등 키보드로 탭을 전환하면 포커스가 부모 문서에 남아 있어 이후 Tab 키가 memo iframe(사이드바 토글)이 아니라
// 부모 페이지의 기본 포커스 이동으로 새어나간다. 탭이 보일 때마다 iframe에 포커스를 넘겨 이를 막는다.
memoTab.addEventListener("shown.bs.tab", () => {
    memoTryInit();
    memoIframe?.contentWindow?.postMessage({ type: 'open-sidebar' }, '*');
    memoIframe?.contentWindow?.focus();
});
if (memoTab.classList.contains("active")) memoTryInit();

function memoNotifyRootChanged() {
    if (!memoInited) return;
    memoLoadFrame();
}


// ==================================================================================================================
// 다운로드 (MountDownloadTab)
// ==================================================================================================================
let dlInited = false;
CDOM.ID("download-tab").addEventListener("shown.bs.tab", () => {
    if (dlInited) return;
    dlInited = true;
    MountDownloadTab("download-root");
});
if (CDOM.ID("download-panel").classList.contains("active")) {
    dlInited = true;
    MountDownloadTab("download-root");
}


// ==================================================================================================================
// 로그인 (CSing)
// ==================================================================================================================
let option=new CSingOption();
option.mFindPWBtn="pass";
CSing.On(CSing.eEvent.State,()=>{
    if(CSing.PrivateKey()==null)
        CDOM.ID("login-btn").innerText="Login";
    else
        CDOM.ID("login-btn").innerText="Logout";
});
CSing.On(CSing.eEvent.Init,()=>{
    if(CSing.PrivateKey()==null)
        CDOM.ID("login-btn").innerText="Login";
    else
        CDOM.ID("login-btn").innerText="Logout";
});
CSing.On(CSing.eEvent.JoinInit,()=>{
    loginModal.SetPosition(CModal.ePos.Center);
});
CSing.On(CSing.eEvent.Insert,()=>{
   loginModal.Open();
   CSing.ModifyMode();
});
let html=await CSing.InitForm(option);
let loginModal=new CModal();
loginModal.SetHeader("Sing");
loginModal.SetBody(html);
loginModal.SetTitle(CModal.eTitle.TextClose);
loginModal.SetCloseToHide(true);
loginModal.SetSize(320,640);
CDOM.ID("login-btn").addEventListener("click",()=>{
    loginModal.Open();
});



























































