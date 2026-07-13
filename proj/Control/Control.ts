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
gPF.mVersion = "mre9w8y1_7";

import {CAtelier} from "../../artgine/app/CAtelier.js";

import {CPlugin} from "../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
// 탭 골격만 구성된 단계. 각 탭(RDP/터미널/브라우저/파일/메모/다운로드)의 기능 연결은 다음 단계에서 진행.
import { CDOM } from "../../artgine/basic/CDOM.js";
import { CPath } from "../../artgine/basic/CPath.js";
import { CModal, CConfirm } from "../../artgine/basic/CModal.js";
import { CFileViewer } from "../../artgine/util/CModalUtil.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CFecth } from "../../artgine/network/CFecth.js";
import { CHash } from "../../artgine/basic/CHash.js";
import { getAuthToken, setAuthToken } from "../../artgine/server/CAuthToken.js";
import { CIframeMsg } from "../../artgine/server/html/CIframeMsg.js";
import { CModalStackMsg } from "../../artgine/util/CModalUtil.js";
import { CUtilWeb } from "../../artgine/util/CUtilWeb.js";
import { Bootstrap } from "../../artgine/basic/Bootstrap.js";
import { CLan } from "../../artgine/basic/CLan.js";

// 좌측 여백이 사이드바 폭보다 넓으면 여백에 고정 표시, 부족하면 열고닫는 오버레이로 전환.
const appSidebar = document.getElementById('app-sidebar');
const sidebarToggleBtnWrap = document.getElementById('sidebarToggleBtnWrap');
const mainContainer = document.querySelector('.container') as HTMLElement | null;
const SIDEBAR_WIDTH = 310;

function updateSidebarMode() {
    if (!appSidebar || !mainContainer) return;
    const margin = mainContainer.getBoundingClientRect().left;
    const docked = margin >= SIDEBAR_WIDTH;
    appSidebar.classList.toggle('sidebar-docked', docked);
    if (sidebarToggleBtnWrap) sidebarToggleBtnWrap.style.display = docked ? 'none' : '';
}
updateSidebarMode();
window.addEventListener('resize', updateSidebarMode);

// 우측 상태 사이드바도 좌측과 동일한 방식(여백에 고정 vs 열고닫는 오버레이)으로 동작한다.
const appSidebarRight = document.getElementById('app-sidebar-right');
const sidebarToggleBtnWrapRight = document.getElementById('sidebarToggleBtnWrapRight');
const SIDEBAR_WIDTH_RIGHT = 300;

function updateSidebarModeRight() {
    if (!appSidebarRight || !mainContainer) return;
    const marginRight = window.innerWidth - mainContainer.getBoundingClientRect().right;
    const docked = marginRight >= SIDEBAR_WIDTH_RIGHT;
    appSidebarRight.classList.toggle('sidebar-docked', docked);
    if (sidebarToggleBtnWrapRight) sidebarToggleBtnWrapRight.style.display = docked ? 'none' : '';
}
updateSidebarModeRight();
window.addEventListener('resize', updateSidebarModeRight);

// ---- 우측 사이드바: 테마 선택 ----
// data-bs-theme를 html 태그에 지정하는 것만으로 iframe(별도 문서라 영향 없음)을 제외한 Control 페이지
// 전체(사이드바/탭/본문)에 테마가 적용된다. Bootstrap5 다크모드와 동일한 메커니즘을 커스텀 팔레트로 확장.
const THEME_STORAGE_KEY = 'artgine-control-theme';
const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null;

function applyTheme(theme: string) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) ?? 'dark';
if (themeSelect) themeSelect.value = savedTheme;
applyTheme(savedTheme);
themeSelect?.addEventListener('change', () => applyTheme(themeSelect.value));

// ---- 다국어(CLan) ----
// 기본 텍스트는 영문(HTML innerHTML)이고, 한국어만 추가 등록한다. 미등록 언어는 영문으로 폴백된다
// (브라우저 언어 자동감지 = CUtil.Language(), Home.ts의 registerHomeLan()과 동일한 패턴).
function registerControlLan(): void {
    const ko = CLan.eType.ko;
    CLan.Set(ko, "ctrl.help", "도움말");
    CLan.Set(ko, "ctrl.kb.global", "전역 단축키");
    CLan.Set(ko, "ctrl.kb.f1", "<kbd>F1</kbd> 파일 탭 + 파일 관리자로 이동");
    CLan.Set(ko, "ctrl.kb.f2", "<kbd>F2</kbd> 파일 검색 열기");
    CLan.Set(ko, "ctrl.kb.f3", "<kbd>F3</kbd> 사이드바 포커스/토글");
    CLan.Set(ko, "ctrl.kb.f6", "<kbd>F6</kbd> SUPER(자동 승인) 토글 + 입력창 포커스 (Chat/Terminal)");
    CLan.Set(ko, "ctrl.kb.updown", "<kbd>&uarr;</kbd> / <kbd>&darr;</kbd> 세션 목록 이동 (사이드바 열림)");
}

// data-CLan 요소에 현재 언어 번역을 적용한다. 기존 innerHTML(영문)을 기본값으로 쓰므로
// 미등록 키/언어는 원문이 유지된다.
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

registerControlLan();
applyLanIn(document.getElementById('right-option-panel'));

// ---- 우측 사이드바: AI Provider 상태 (Home.html의 Provider Status 패널을 재사용) ----
// 인증 여부와 무관하게 즉시 호출 가능한 엔드포인트라 페이지 접속과 동시에 조회한다.
interface IProviderStateEntry { id: string; installed: boolean; authenticated: boolean; version: string; models: { value: string; label: string }[]; usage: { fiveHour: number; weekly: number }; }
interface INodeState { installed: boolean; version: string; }
interface IProviderStateResp { node: INodeState; providers: IProviderStateEntry[]; }

async function loadAiProviderStatus() {
    const el = document.getElementById('aiProviderStatus');
    if (!el) return;
    const btn = document.getElementById('aiProviderRefreshBtn') as HTMLButtonElement | null;
    const icon = btn?.querySelector('i');
    if (btn) btn.disabled = true;
    icon?.classList.add('spin');
    try {
        const r = await fetch(CPath.WebRootUrl() + 'AIInfo/provider-state');
        const resp: IProviderStateResp = await r.json();
        const node = resp.node;
        const providers = resp.providers ?? [];
        const nodeRowClass = node?.installed ? 'bg-success-subtle' : 'bg-secondary-subtle';
        const nodeIcon = node?.installed ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-secondary';
        const nodeStatus = node?.installed ? 'Ready' : 'Not Installed';
        const nodeVer = node?.version ? `<span class="text-secondary ms-2" style="font-size:0.85em;">v${node.version}</span>` : '';
        const nodeStatusHtml = node?.installed
            ? ''
            : `<button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" id="aiNodeDownloadBtn"><i class="bi ${nodeIcon}"></i>${nodeStatus}</button>`;
        const nodeRow = `<div class="d-flex align-items-center justify-content-between rounded px-2 py-1 ${nodeRowClass}" style="font-size:0.8rem;">
                <span class="fw-semibold">Node.js${nodeVer}</span>
                ${nodeStatusHtml}
            </div>`;
        el.innerHTML = nodeRow + providers.map(p => {
            const rowClass = !p.installed ? 'bg-secondary-subtle' : p.authenticated ? 'bg-success-subtle' : 'bg-warning-subtle';
            const pIcon = !p.installed ? 'bi-x-circle text-secondary' : p.authenticated ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle-fill text-warning';
            const status = !p.installed ? 'Not Installed' : p.authenticated ? 'Ready' : 'Not Authenticated';
            const ver = p.version ? `<span class="text-secondary ms-2" style="font-size:0.85em;">v${p.version}</span>` : '';
            const statusHtml = !p.installed
                ? `<button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 ai-provider-launch-btn" data-provider="${p.id}"><i class="bi ${pIcon}"></i>${status}</button>`
                : p.authenticated ? '' : `<span class="d-flex align-items-center gap-1"><i class="bi ${pIcon}"></i>${status}</span>`;
            // usage.fiveHour/weekly: 0~1 남은 비율, -1이면 조회 실패/미지원.
            const pct = (v: number) => Math.round(v * 100);
            const usageParts: string[] = [];
            const showUsage = p.authenticated && p.usage;
            if (showUsage) {
                usageParts.push(p.usage!.fiveHour >= 0 ? `5h ${pct(p.usage!.fiveHour)}%` : `5h ?`);
                usageParts.push(p.usage!.weekly >= 0 ? `Weekly ${pct(p.usage!.weekly)}%` : `Weekly ?`);
            }
            const usageHtml = usageParts.length
                ? `<div class="text-secondary" style="font-size:0.75em;">${usageParts.join(' · ')} remaining</div>`
                : '';
            return `<div class="rounded px-2 py-1 ${rowClass}" style="font-size:0.8rem;">
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
setInterval(() => loadAiProviderStatus(), 5 * 60 * 1000);
document.getElementById('aiProviderRefreshBtn')?.addEventListener('click', () => loadAiProviderStatus());
document.getElementById('aiAddOllamaBtn')?.addEventListener('click', () => showAddOllamaModal());

// Ollama/LM Studio(OpenAI 호환) 서버 주소를 입력받아 /AIInfo/push-ollama 로 등록한다.
// 서버가 모델 목록·툴 지원 여부를 조회해 opencode.json의 커스텀 provider로 기록한다(없으면 CreateRole).
function showAddOllamaModal() {
    const uid = `ollama_${Date.now()}`;
    const modal = new CModal();
    modal.SetHeader('Add OpenCode Model');
    modal.SetBody(`
        <div class="small text-secondary mb-3">
            <p class="mb-2">Register a local <strong>Ollama</strong> or <strong>LM Studio</strong> server as an OpenCode model provider.</p>
            <p class="mb-2">Paste the server address in <strong>any form<\strong> &mdash; only the IP and port are extracted and recombined into the correct base URL <code>http://&lt;ip&gt;:&lt;port&gt;/v1</code>. All of these work:</p>
            <ul class="mb-2 ps-3">
                <li><code>127.0.0.1:11434</code></li>
                <li><code>http://127.0.0.1:11434</code></li>
                <li><code>http://127.0.0.1:11434/v1/models</code></li>
            </ul>
            <p class="mb-2">Ollama is tried first (native API); if that doesn't respond, LM Studio's OpenAI-compatible <code>/v1/models</code> is tried next. Between the two, most local model runners are covered.</p>
            <p class="mb-2">The server's model list is looked up automatically and written into <code>opencode.json</code> (it is created via CreateRole if missing). Tool-use support is detected for Ollama; for LM Studio it can't be queried via API, so it's assumed enabled &mdash; edit <code>opencode.json</code> manually if a model doesn't actually support tools.</p>
            <p class="mb-0">If the server requires authentication, enter its API key below &mdash; it's sent as a Bearer token and saved into <code>opencode.json</code>. Leave blank for open/unauthenticated servers.</p>
        </div>
        <div class="input-group mb-2">
            <input id="${uid}" type="text" class="form-control form-control-sm" placeholder="e.g. 127.0.0.1:11434">
            <button id="${uid}_go" class="btn btn-primary btn-sm">Add</button>
        </div>
        <input id="${uid}_key" type="text" class="form-control form-control-sm" placeholder="API key (optional)">
        <div id="${uid}_result" class="small mt-2"></div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(560, 400);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const input   = document.getElementById(uid) as HTMLInputElement | null;
        const keyInput = document.getElementById(`${uid}_key`) as HTMLInputElement | null;
        const goBtn   = document.getElementById(`${uid}_go`) as HTMLButtonElement | null;
        const result  = document.getElementById(`${uid}_result`);
        input?.focus();
        const submit = async () => {
            const host = (input?.value ?? '').trim();
            const apiKey = (keyInput?.value ?? '').trim();
            if (!host) { input?.focus(); return; }
            if (goBtn) goBtn.disabled = true;
            if (result) result.innerHTML = '<span class="text-secondary"><i class="bi bi-hourglass-split"></i> …</span>';
            try {
                const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/push-opencode-model', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(apiKey ? { host, apiKey } : { host }),
                });
                const j = await r.json();
                if (!j.ok) {
                    if (result) {
                        const msg = r.status === 401 ? 'Login required' : (j.msg || 'Failed');
                        result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(msg)}</span>`;
                    }
                    return;
                }
                const models: { name: string; tools: boolean }[] = j.models ?? [];
                const list = models.map(m => `${aiEscapeHtml(m.name)}${m.tools ? ' <span class="badge bg-success">tools<\span>' : ''}`).join(', ');
                if (result) result.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${aiEscapeHtml(j.provider)} — ${models.length} models</span><div class="text-secondary mt-1">${list}</div>`;
                CAlert.Info(`${j.provider}: ${models.length} models → opencode.json`);
            } catch (e: any) {
                if (result) result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(e?.message ?? String(e))}</span>`;
            } finally {
                if (goBtn) goBtn.disabled = false;
            }
        };
        goBtn?.addEventListener('click', submit);
        const onEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
        input?.addEventListener('keydown', onEnter);
        keyInput?.addEventListener('keydown', onEnter);
    }, MODAL_DOM_DELAY);
}

// ---- RDP: Local + Remote는 사이드바 목록에서 공통 로직(Open Modal/New Window/Share/Delete)을 공유한다 ----
const MODAL_DOM_DELAY = 100;

// 화면 캡처 폴링을 하는 iframe에 표시 여부를 알려준다.
// display:none 토글은 iframe 내부 document의 visibilitychange를 발생시키지 않으므로 postMessage로 직접 알린다.
function postFrameVisible(f: HTMLIFrameElement | null | undefined, visible: boolean) {
    if (f?.contentWindow) CIframeMsg.Send(f.contentWindow, 'frame-visibility', { visible });
}

function rdpRemoteWebRootUrl(input: string): string {
    const u = new URL(input);
    const marker = "/proj/Home/Home.html";
    const homeIdx = u.pathname.indexOf(marker);
    const basePath = homeIdx >= 0 ? u.pathname.substring(0, homeIdx) : u.pathname;
    return (u.origin + (basePath || "/")).replace(/\/+$/, '') + '/';
}

function aiEscapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// ---- 세션 프레임을 모달/새 창으로 여는 공용 로직 ----
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

// ---- 공유 링크 모달 ----
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

// 사이드바는 RDP 목록과 "Chat/Terminal/Browser/Editor 통합 목록" 두 그룹으로 나뉘고, 강조 표시도
// 그룹별로 독립적으로 하나씩(총 두 개) 켜져야 한다. RDP는 selectedRdpKey만으로 항상 하나가 켜지지만,
// 통합 목록 쪽은 네 종류가 같은 리스트를 공유하므로 그중 지금 센터에 실제로 보이는 탭의 항목만 켜야
// 네 개가 동시에 파랗게 표시되는 문제를 피할 수 있다.
function isPanelShown(panelId: string): boolean {
    return CDOM.ID(panelId).classList.contains('active');
}

// ---- 사이드바 세션 아이템 공용 빌더(Local/Remote가 동일한 골격·드롭다운·핸들러를 공유) ----
interface SessionItemSpec {
    activeClass: string;
    isActive: boolean;
    dataAttr: { name: string; value: string };
    leftHtml: string;
    bodyHtml: string;
    deleteAct: string;
    deleteLabel: string;
    onClick: () => void;
    onShare: () => void;
    onDelete: () => void;
    popup: { url: () => string; title: string; winName: string };
}
function createSessionItem(spec: SessionItemSpec): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
        + (spec.isActive ? ' ' + spec.activeClass : '');
    item.dataset[spec.dataAttr.name] = spec.dataAttr.value;
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

// ---- RDP 프레임 풀(Local + Remote 공용). 탭을 늘리는 대신 하나의 패널 안에서 iframe을 전환한다. ----
const rdpFrameContainer = CDOM.ID("rdp-frame-container") as HTMLDivElement;
const rdpFramePlaceholder = CDOM.ID("rdp-frame-placeholder") as HTMLDivElement;
const rdpSidebarList = CDOM.ID("rdp-sidebar-list") as HTMLDivElement;
const rdpIframePool = new Map<string, HTMLIFrameElement>();
let activeRdpFrameKey: string | null = null;

function updateRdpFramePlaceholder() {
    rdpFramePlaceholder.classList.toggle('rdp-frame-placeholder-hidden', !!activeRdpFrameKey);
}

function isRdpPaneActive(): boolean { return CDOM.ID('rdp-panel').classList.contains('active'); }

function updateRdpFrameVisibility() {
    if (!activeRdpFrameKey) return;
    postFrameVisible(rdpIframePool.get(activeRdpFrameKey), isRdpPaneActive());
}

interface FramePoolCtx {
    pool: Map<string, HTMLIFrameElement>;
    container: HTMLElement;
    getActiveKey: () => string | null;
    setActiveKey: (key: string | null) => void;
    updatePlaceholder: () => void;
    onActivate?: (key: string, prevKey: string | null) => void;
    onCreate?: (f: HTMLIFrameElement, key: string) => void;
}
function showPooledFrame(ctx: FramePoolCtx, key: string, src: string): HTMLIFrameElement {
    let f = ctx.pool.get(key);
    if (!f) {
        f = document.createElement('iframe');
        f.src = src;
        f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:none;';
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

function rdpActivatePane() {
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('rdp-panel-tab')).show();
}

interface IRdpRemote { id: string; url: string; }
// 임시 목록(현재 세션 동안만 유지) — Home과 동일하게 저장/로드는 추후 추가.
let rdpRemotes: IRdpRemote[] = [];
// 사이드바에서 "선택됨"으로 표시할 항목. activeRdpFrameKey(실제 로드된 iframe)와 달리
// 프레임이 아직 열리지 않은 최초 상태에도 Local을 강제로 선택 표시하기 위해 별도로 둔다.
let selectedRdpKey = 'rdp:local';

function rdpRenderList() {
    rdpSidebarList.innerHTML = '';

    const localItem = document.createElement('div');
    localItem.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
        + (selectedRdpKey === 'rdp:local' ? ' ai-session-item-active' : '');
    localItem.innerHTML = `<i class="bi bi-pc-display"></i><span class="flex-grow-1">Local</span>`
        + `<button type="button" class="btn btn-sm btn-link text-secondary p-0" data-act="local-link" title="Show accessible link"><i class="bi bi-link-45deg"></i></button>`;
    localItem.addEventListener('click', () => rdpOpenLocal());
    localItem.querySelector<HTMLButtonElement>('[data-act="local-link"]')!.addEventListener('click', (e) => {
        e.stopPropagation();
        rdpShowLocalAccessLink();
    });
    rdpSidebarList.appendChild(localItem);

    // 최신 추가된 원격지가 위로 오도록 목록 순서(=rdpRemotes, unshift로 삽입됨) 그대로 렌더링한다.
    rdpRemotes.forEach((r) => {
        const key = `rdp:remote:${r.id}`;
        const item = createSessionItem({
            activeClass: 'ai-session-item-active',
            isActive: selectedRdpKey === key,
            dataAttr: { name: 'id', value: r.id },
            leftHtml: `<i class="bi bi-hdd-network"></i>`,
            bodyHtml: `<span class="flex-grow-1 text-truncate small">${aiEscapeHtml(r.url)}</span>`,
            deleteAct: 'delete',
            deleteLabel: '🗑️ Delete',
            onClick: () => rdpOpenRemote(r.id),
            onShare: () => rdpShowShareLink(r.url),
            onDelete: () => {
                rdpRemotes = rdpRemotes.filter(x => x.id !== r.id);
                if (activeRdpFrameKey === key) activeRdpFrameKey = null;
                if (selectedRdpKey === key) selectedRdpKey = 'rdp:local';
                rdpRenderList();
            },
            popup: { url: () => `${rdpRemoteWebRootUrl(r.url)}artgine/server/html/RemoteDesktop.html`, title: r.url, winName: `rdp_${r.id}` },
        });
        rdpSidebarList.appendChild(item);
    });

    const divider = document.createElement('hr');
    divider.className = 'my-2';
    rdpSidebarList.appendChild(divider);
}

// Memo 탭이 어느 서버의 /Memo/*를 써야 하는지 판단하는 단일 출처(RDP가 원격을 전환할 때마다 갱신).
// '' = 로컬. 인증은 여기서 미리 하지 않고, Memo 탭이 열릴 때 memoSendRemoteInfo()가 필요하면 그때 확인/요청한다.
let currentRemoteBaseUrl = '';

// ---- 사이드바 경로(Root) 선택 박스: currentRemoteBaseUrl(현재 활성 서버)의 File/Root를 그 자리에서 조회해
// 옵션을 채우고, 고른 항목을 File 탭 iframe에 'set-file-root'로 보내 실제 루트를 바꾼다(File.ts의 #fileRootSel과
// 동일한 applyFileRootSelection()을 태운다). RDP 목록에서 Local/원격을 전환할 때마다 새 서버 기준으로 다시 조회한다.
const ctrlRootSel = CDOM.ID("ctrl-root-sel") as HTMLSelectElement;
interface ICtrlRootOpt { path: string; name: string; url?: string; }
let ctrlRootOpts: ICtrlRootOpt[] = [];
let ctrlRootReqSeq = 0;
// New Chat/New Terminal 모달의 기본 Working Directory로 쓰는 현재 선택된 경로.
// "Artgine (WorkingPath)" 같은 "./" 상대경로도 그대로 둔다 - CTerminalRouter/CAIChatRouter가 항상
// 서버 프로세스의 고정된 실행 기준 경로(=이 루트가 가리키는 곳과 동일)로 resolve하므로 안전하다.
let ctrlSelectedRootPath = '';
// Control.html이 ?RootPath=...로 열린 경우, 최초 1회에 한해 그 값과 일치하는 루트를 기본 선택한다
// (그 뒤 RDP 목록에서 Local/원격을 전환할 때 다시 그리는 건 평소처럼 상대경로 기본값으로 되돌아간다).
let ctrlInitRootPathConsumed = false;
const ctrlNormPath = (s: string) => s.replace(/\\/g, '/').replace(/\/+$/, '');

function ctrlRenderRootOpts(roots: ICtrlRootOpt[]) {
    ctrlRootOpts = [...roots, { path: "./", name: "Artgine (WorkingPath)" }];
    ctrlRootSel.innerHTML = ctrlRootOpts.map((r, i) => `<option value="${i}">${aiEscapeHtml(r.name)}</option>`).join('');
    // 기본 선택은 상대경로("./" Artgine WorkingPath) 항목 - 항상 목록 맨 끝에 추가됨.
    let defaultIdx = ctrlRootOpts.length - 1;
    if (!ctrlInitRootPathConsumed && ctrlInitRootPath) {
        ctrlInitRootPathConsumed = true;
        const matchIdx = ctrlRootOpts.findIndex(r => ctrlNormPath(r.path) === ctrlNormPath(ctrlInitRootPath));
        if (matchIdx >= 0) defaultIdx = matchIdx;
    }
    ctrlRootSel.selectedIndex = defaultIdx;
    ctrlSelectedRootPath = ctrlRootOpts[defaultIdx]?.path ?? '';
}

async function ctrlRefreshRootSelect() {
    const baseUrl = currentRemoteBaseUrl;
    const seq = ++ctrlRootReqSeq;
    ctrlRootSel.innerHTML = '<option>Loading...</option>';
    if (baseUrl && !(await rdpCheckRemoteAuth(baseUrl))) {
        if (seq !== ctrlRootReqSeq) return;
        ctrlRootSel.innerHTML = '<option>Sign in required</option>';
        rdpPromptRemoteAuth(baseUrl, () => {
            if (currentRemoteBaseUrl !== baseUrl || seq !== ctrlRootReqSeq) return;
            ctrlRefreshRootSelect();
        });
        return;
    }
    try {
        const token = baseUrl ? getAuthToken(baseUrl) : '';
        const data = await CFecth.Exe((baseUrl || CPath.WebRootUrl()) + "File/Root", token ? { token } : {}, "json") as { RootPath: string, RootUrl: string, roots: ICtrlRootOpt[] };
        if (seq !== ctrlRootReqSeq) return;
        ctrlRenderRootOpts(data.roots ?? []);
    } catch (e) {
        if (seq !== ctrlRootReqSeq) return;
        ctrlRootSel.innerHTML = '<option>Failed to load</option>';
    }
}

ctrlRootSel.addEventListener('change', () => {
    const idx = parseInt(ctrlRootSel.value);
    const r = ctrlRootOpts[idx];
    if (!r) return;
    ctrlSelectedRootPath = r.path;
    if (!fileIframe?.contentWindow) return;
    const selKey = idx === ctrlRootOpts.length - 1 ? 'workingpath' : r.path;
    CIframeMsg.Send(fileIframe.contentWindow, 'set-file-root', { path: r.path, url: r.url ?? '', selKey });
});

function rdpOpenLocal() {
    rdpInited = true;
    rdpActivatePane();
    showRdpFrame('rdp:local', `${CPath.WebRootArtgineUrl()}artgine/server/html/RemoteDesktop.html`);
    selectedRdpKey = 'rdp:local';
    rdpRenderList();
    currentRemoteBaseUrl = '';
    if (fileIframe?.contentWindow) CIframeMsg.Send(fileIframe.contentWindow, 'connect-remote', { url: '' });
    ctrlRefreshRootSelect();
}

function rdpOpenRemote(id: string) {
    const remote = rdpRemotes.find(r => r.id === id);
    if (!remote) return;
    rdpInited = true;
    rdpActivatePane();
    showRdpFrame(`rdp:remote:${id}`, `${rdpRemoteWebRootUrl(remote.url)}artgine/server/html/RemoteDesktop.html`);
    selectedRdpKey = `rdp:remote:${id}`;
    rdpRenderList();
    currentRemoteBaseUrl = rdpRemoteWebRootUrl(remote.url);
    if (fileIframe?.contentWindow) CIframeMsg.Send(fileIframe.contentWindow, 'connect-remote', { url: remote.url });
    ctrlRefreshRootSelect();
}

function rdpShowShareLink(remoteUrl: string) {
    const shareUrl = `${rdpRemoteWebRootUrl(remoteUrl)}artgine/server/html/RemoteDesktop.html`;
    showShareLinkModal(
        'Remote Desktop Share Link',
        `Anyone with this link can access the remote desktop: <strong>${aiEscapeHtml(remoteUrl)}</strong>`,
        shareUrl
    );
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

function rdpAddRemote(url: string) {
    rdpRemotes.unshift({ id: genUuid(), url });
    rdpRenderList();
}

// RDP 탭이 기본 활성 탭(Control.html에 하드코딩)이므로 페이지 로드시 Local을 지연 초기화한다.
// 그 외에는 사이드바에서 실제로 클릭했을 때만 프레임을 만든다.
let rdpInited = false;
CDOM.ID('rdp-panel-tab').addEventListener('shown.bs.tab', () => {
    if (!rdpInited) rdpOpenLocal();
    updateRdpFrameVisibility();
});
CDOM.ID('rdp-panel-tab').addEventListener('hidden.bs.tab', () => updateRdpFrameVisibility());

rdpRenderList();
// rdpOpenLocal()이 File 섹션에서 선언되는 fileIframe을 참조하므로, 모듈 평가가 끝난 뒤로 미뤄서
// 호출한다(그대로 동기 호출하면 TDZ로 'fileIframe' 참조 에러가 난다).
if (CDOM.ID('rdp-panel').classList.contains('active')) queueMicrotask(() => rdpOpenLocal());

// More > RDP: 원격 추가용 소형 모달. 추가하면 메인 탭이 아니라 사이드바 목록에 항목이 생긴다.
function openRdpAddModal() {
    const modal = new CModal();
    modal.SetHeader('Add Remote Desktop');
    modal.SetBody(`
        <div class="d-flex gap-1">
            <input id="rdpModalUrlInput" type="text" class="form-control form-control-sm" placeholder="Remote Home.html URL">
            <button id="rdpModalAddBtn" class="btn btn-outline-primary btn-sm flex-shrink-0"><i class="bi bi-plus-lg"></i> Add</button>
        </div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(420, 140);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const input = document.getElementById('rdpModalUrlInput') as HTMLInputElement | null;
        const btn = document.getElementById('rdpModalAddBtn') as HTMLButtonElement | null;
        input?.focus();
        const submit = () => {
            const url = input?.value.trim();
            if (!url) return;
            rdpAddRemote(url);
            modal.Close();
        };
        btn?.addEventListener('click', submit);
        input?.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') submit(); });
    }, MODAL_DOM_DELAY);
}
CDOM.ID('rdp-add-btn').addEventListener('click', openRdpAddModal);

// ---- 파일 탭 (Home.html과 동일하게 artgine/server/html/File.html을 iframe으로 임베드) ----
const filePanel = CDOM.ID("file-panel") as HTMLDivElement;
let fileIframe: HTMLIFrameElement | null = null;
let fileLoaded = false;

function fileEnsureLayout() {
    if (fileIframe) return;
    filePanel.classList.add("position-relative");
    filePanel.style.overflow = "hidden";
    fileIframe = document.createElement("iframe");
    fileIframe.id = "file-iframe";
    fileIframe.style.cssText = "position:absolute; inset:0; width:100%; height:100%; border:none;";
    filePanel.appendChild(fileIframe);
    wireIframeArrowKeys(fileIframe);
}

// Control.html 자체가 ?path=E:/ 처럼 열렸으면, 그 값은 settings.json의 rootPath 항목(예: "E:/") 중
// 하나를 그대로 가리키는 루트 경로다(File.ts 내부의 path=하위폴더/RootPath=루트 2파라미터 조합이 아니라
// 단일 값). File.html이 자기 루트를 "/"에서 시작하도록 RootPath로 그대로 넘겨준다.
const ctrlInitRootPath = CUtilWeb.Parameter("path");

// File 탭은 Home.html과 동일하게 탭 클릭을 기다리지 않고 모듈 로드 시 바로 iframe을 로드한다
// (RDP 로컬/원격 판별에 File/Root 확인이 쓰이던 과거 동작을 유지하기 위함).
function fileLoadFrame() {
    fileEnsureLayout();
    if (fileLoaded) return;
    fileLoaded = true;
    const params: string[] = [];
    if (ctrlInitRootPath) params.push(`RootPath=${encodeURIComponent(ctrlInitRootPath)}`);
    // Control 페이지의 현재 테마(light/dark)를 함께 넘겨 File.html도 맞춰 보이게 한다.
    const ctrlTheme = document.documentElement.getAttribute('data-bs-theme');
    if (ctrlTheme) params.push(`theme=${encodeURIComponent(ctrlTheme)}`);
    // Control 안에 임베드됐음을 File.html에 알린다. 이 값이 있으면 File.html은
    // ts/js/html/txt 등 모나코로 열리는 파일을 자체 모달로 열지 않고 'file-opened'
    // postMessage를 부모(Control)로 보낸다. Control은 이를 받아 자신의 editor 탭에서 연다.
    params.push('editorHost=control');
    const q = params.length ? `?${params.join('&')}` : '';
    fileIframe!.src = `${CPath.WebRootArtgineUrl()}artgine/server/html/File.html${q}`;
}
fileLoadFrame();
// 초기 진입 시 File 탭을 기본으로 보이게 한다(HTML상 기본 active는 RDP 탭).
(window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('file-tab')).show();

// ---- F2 파일 검색 모달 ----
// File.ts의 FileSearch()와 동일한 방식(BFS 재귀 스캔 + 캐시 + hidden/node_modules 제외 + 200개 캡)이지만,
// File 탭 iframe이 아니라 Control 페이지 자체에서 실행한다. File 탭엔 "현재 보던 폴더"(gPath) 상태가 있어 거기서부터
// 검색을 시작하지만, Control 페이지엔 그 상태가 없으므로 항상 루트("/")부터 검색한다.
type CtrlSrchFile = { hidden: boolean; file: boolean; name: string; ext: string };
const CTRL_SEARCH_EXCLUDE_DIRS = ['node_modules'];
const ctrlIsSearchExcluded = (name: string) => name.startsWith('.') || CTRL_SEARCH_EXCLUDE_DIRS.includes(name);
const ctrlEncodeUrlPath = (p: string) => p.split('/').map(encodeURIComponent).join('/');
// 서버+루트 단위로 캐시 유지 — File.ts의 g_srchCache/g_srchServerKey와 동일한 패턴.
let g_ctrlSrchCache: Map<string, CtrlSrchFile[]> = new Map();
let g_ctrlSrchServerKey = '';

async function ctrlFileSearch() {
    let searchCancelled = false;
    const uid = Date.now();

    const modal = new CModal();
    modal.SetHeader("File Search");
    modal.SetBody(`
        <div class="d-flex gap-2 mb-2">
            <input type="text" id="ctrlSrchInput_${uid}" class="form-control form-control-sm" placeholder="Filename (partial match)...">
            <button id="ctrlSrchBtn_${uid}" class="btn btn-sm btn-primary">Search</button>
            <button id="ctrlSrchStop_${uid}" class="btn btn-sm btn-outline-danger" style="display:none;">Stop</button>
        </div>
        <div id="ctrlSrchStatus_${uid}" class="small text-secondary mb-1" style="min-height:1.2em;"></div>
        <div id="ctrlSrchResults_${uid}" class="list-group" style="max-height:360px;overflow-y:auto;font-size:13px;"></div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(520, 520);
    modal.Open(CModal.ePos.Center);

    await new Promise<void>(r => setTimeout(r, MODAL_DOM_DELAY));

    const input   = document.getElementById(`ctrlSrchInput_${uid}`)  as HTMLInputElement;
    const btn     = document.getElementById(`ctrlSrchBtn_${uid}`)    as HTMLButtonElement;
    const stopBtn = document.getElementById(`ctrlSrchStop_${uid}`)   as HTMLButtonElement;
    const status  = document.getElementById(`ctrlSrchStatus_${uid}`) as HTMLElement;
    const results = document.getElementById(`ctrlSrchResults_${uid}`) as HTMLElement;

    const apiBase = currentRemoteBaseUrl || CPath.WebRootUrl();
    const rootPathParam = ctrlSelectedRootPath || undefined;
    let gRoot = '';
    let gDown = '';

    const makeItem = (fl: CtrlSrchFile, dirPath: string) => {
        const item = document.createElement('div');
        item.className = 'list-group-item list-group-item-action py-1 px-2';
        const icon = fl.file ? 'bi-file-earmark' : 'bi-folder-fill text-warning';
        item.innerHTML =
            `<i class="bi ${icon} me-1"></i><strong>${fl.name}</strong>` +
            `<span class="text-muted ms-2" style="font-size:11px;">${dirPath}</span>`;
        // 폴더는 Control 페이지에 "현재 보던 폴더" 화면이 없어 이동할 대상이 없으므로 표시만 하고 클릭은 비활성.
        if (fl.file) {
            item.addEventListener('click', () => {
                modal.Hide();
                editorOpenFile(gRoot + dirPath + fl.name, currentRemoteBaseUrl, gDown + ctrlEncodeUrlPath(dirPath + fl.name));
            });
        }
        return item;
    };

    const keyOf = (dirPath: string, name: string) => dirPath + ' ' + name;

    const renderFromCache = (startPath: string, query: string, shown: Set<string>) => {
        let found = 0;
        for (const [dirPath, list] of g_ctrlSrchCache) {
            if (!dirPath.startsWith(startPath)) continue;
            for (const fl of list) {
                if (fl.hidden || ctrlIsSearchExcluded(fl.name)) continue;
                if (fl.name.toLowerCase().includes(query)) {
                    const key = keyOf(dirPath, fl.name);
                    if (shown.has(key)) continue;
                    shown.add(key);
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

        const startPath = "/";
        const serverKey = apiBase + '|' + (rootPathParam ?? '');
        if (g_ctrlSrchServerKey !== serverKey) { g_ctrlSrchCache = new Map(); g_ctrlSrchServerKey = serverKey; }

        searchCancelled = false;
        btn.disabled = true;
        stopBtn.style.display = '';
        results.innerHTML = '';

        const shown = new Set<string>();
        let found = renderFromCache(startPath, query, shown);
        status.textContent = found > 0 ? `Cached: ${found} result(s)... Scanning` : 'Scanning...';

        const queue: string[] = [startPath];
        while (queue.length > 0 && !searchCancelled) {
            const dirPath = queue.shift()!;
            status.textContent = `Scanning: ${dirPath}`;
            try {
                const p2: any = { path: dirPath };
                if (rootPathParam) p2.RootPath = rootPathParam;
                const token = getAuthToken(apiBase);
                const data = await CFecth.Exe(apiBase + "File/List", { ...p2, token }, "json") as { list: CtrlSrchFile[], RootPath?: string, RootUrl?: string };
                if (data.RootPath != null) gRoot = data.RootPath.replace(/\/+$/, '');
                // RootUrl은 서버 origin 기준 상대경로("/Artgine/Root0")로 오므로 apiBase에 대해 절대 URL로 풀어야 한다
                // (File.ts의 ResolveFileUrl과 동일한 처리). 끝 슬래시는 제거만 하고 붙이지 않는다 — dirPath가 항상
                // "/"로 시작하므로 여기서 슬래시를 추가하면 "Root0//artgine/..."처럼 중복되어, Monaco가 등록된
                // extra lib 경로와 다른 문자열로 취급해 "Cannot find module" 에러가 난다.
                if (data.RootUrl != null) gDown = new URL(data.RootUrl, apiBase).href.replace(/\/+$/, '');
                g_ctrlSrchCache.set(dirPath, data.list);
                for (const fl of data.list) {
                    if (!fl.hidden && !fl.file && !ctrlIsSearchExcluded(fl.name)) queue.push(dirPath + fl.name + '/');
                    if (!fl.hidden && fl.name.toLowerCase().includes(query) && found < 200) {
                        const key = keyOf(dirPath, fl.name);
                        if (shown.has(key)) continue;
                        shown.add(key);
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

// ---- 전역 단축키 ----
// F1(파일 매니저, File 탭으로 전환 + 파일 탭 iframe에 트리거 메시지 전달)은 화면 크기와 무관하게 항상 동작.
// F2(서치)는 File 탭과 무관하게 Control 페이지 자체에서 검색 모달만 띄운다(탭 전환/iframe 메시지 없음).
function runControlHotkey(key: string): boolean {
    switch (key) {
        case 'F1':
            (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('file-tab')).show();
            if (fileIframe?.contentWindow) CIframeMsg.Send(fileIframe.contentWindow, 'trigger-file-btn', {});
            return true;
        case 'F2':
            ctrlFileSearch();
            return true;
    }
    return false;
}
// 지금 활성 탭(패널)에 물려있는 iframe과, 그게 터미널인지를 함께 돌려준다.
// Home.ts의 focusActiveFrame()과 동일하게 터미널만 특별 취급(입력창 포커스는 xterm.js 쪽에서 해야 해서
// DOM으로 직접 흉내낼 수 없어 'focus-input' 메시지로 위임한다).
function getActiveControlFrame(): { f: HTMLIFrameElement | null; isTerm: boolean } {
    if (isPanelShown('term-panel')) return { f: activeTermFrameKey ? termIframePool.get(activeTermFrameKey) ?? null : null, isTerm: true };
    if (isPanelShown('chat-panel')) return { f: activeChatFrameKey ? chatIframePool.get(activeChatFrameKey) ?? null : null, isTerm: false };
    if (isPanelShown('rdp-panel')) return { f: activeRdpFrameKey ? rdpIframePool.get(activeRdpFrameKey) ?? null : null, isTerm: false };
    if (isPanelShown('browser-panel')) return { f: activeBrowserFrameKey ? browserIframePool.get(activeBrowserFrameKey) ?? null : null, isTerm: false };
    if (isPanelShown('editor-panel')) return { f: activeEditorFrameKey ? editorIframePool.get(activeEditorFrameKey) ?? null : null, isTerm: false };
    if (isPanelShown('file-panel')) return { f: fileIframe, isTerm: false };
    if (isPanelShown('memo-panel')) return { f: memoIframe, isTerm: false };
    return { f: null, isTerm: false };
}
// 액티브 iframe으로 포커스를 넘긴다. 터미널이면 'focus-input' 메시지로 xterm 입력창에 포커스시키고,
// 그 외에는 contentWindow를 포커스한 뒤 안에서 첫 textarea/input을 찾아 포커스한다.
function focusActiveControlFrame() {
    const { f, isTerm } = getActiveControlFrame();
    if (!f) return;
    if (isTerm) {
        if (f.contentWindow) CIframeMsg.Send(f.contentWindow, 'focus-input');
        return;
    }
    try {
        f.contentWindow?.focus();
        const input = f.contentDocument?.querySelector<HTMLElement>('textarea, input');
        if (input) { input.focus(); return; }
    } catch (_) {}
    f.focus();
}
// F3 키: 한 번 누르면 좌측 메뉴 사이드바로 포커스(오버레이 모드면 먼저 연다), 이미 사이드바에 포커스가
// 가 있는 상태에서 한 번 더 누르면 지금 보고 있는 액티브 iframe으로 포커스를 돌려준다(Home.ts의
// Tab 키=toggleSidebar()+focusActiveFrame() 조합과 동일한 패턴).
// - 오버레이 모드(작은 화면): data-bs-backdrop="false"라 바깥 클릭으로 안 닫히므로, F3 자체가 열고/닫는
//   유일한 수단이다. "포커스 위치"로 판단하면 한번 열린 뒤 닫을 방법이 없어져 꼬이므로, 예전처럼 매번
//   순수 토글(열림<->닫힘)로 처리하고 여는 순간만 사이드바로, 닫는 순간엔 액티브 iframe으로 포커스를 보낸다.
// - 도킹 모드(큰 화면): 사이드바가 항상 보이므로 open/close 대신 "포커스가 지금 사이드바 안에 있는가"로
//   1차/2차 누름을 구분한다.
function runControlF3Key() {
    if (!appSidebar) return;
    if (!appSidebar.classList.contains('sidebar-docked')) {
        const wasShown = appSidebar.classList.contains('show');
        (window as any).bootstrap.Offcanvas.getOrCreateInstance(appSidebar).toggle();
        if (wasShown) focusActiveControlFrame();
        else setTimeout(() => appSidebar.focus(), 0);
        return;
    }
    const focusInSidebar = document.activeElement instanceof Node && appSidebar.contains(document.activeElement);
    if (focusInSidebar) {
        focusActiveControlFrame();
    } else {
        appSidebar.focus();
    }
}
// 위/아래 화살표: 좌측 사이드바의 "공통 세션 목록"(Chat/Terminal/Browser/Editor, session-sidebar-list)에서만
// 선택을 이동한다. RDP 목록(rdp-sidebar-list, 위쪽)은 대상에서 제외.
function isAppSidebarVisible(): boolean {
    if (!appSidebar) return false;
    return appSidebar.classList.contains('sidebar-docked') || appSidebar.classList.contains('show');
}
function runControlArrowKey(dir: 1 | -1): boolean {
    if (!isAppSidebarVisible()) return false;
    const items = Array.from(sessionSidebarList.querySelectorAll<HTMLElement>('.ai-session-item'));
    if (items.length === 0) return false;
    const curIdx = items.findIndex(el => el.classList.contains('ai-session-item-active'));
    const nxt = curIdx === -1 ? 0 : Math.max(0, Math.min(items.length - 1, curIdx + dir));
    if (nxt === curIdx) return false;
    items[nxt].click();
    items[nxt].scrollIntoView({ block: 'nearest' });
    return true;
}
// File/Memo iframe은 자체 keydown에서 ArrowUp/ArrowDown을 부모로 위임하지 않으므로
// (그 스크립트는 artgine/ 보호 경로라 직접 수정하지 않고) 같은 출처 iframe에 직접 keydown을 걸어 잡는다.
function wireIframeArrowKeys(f: HTMLIFrameElement) {
    f.addEventListener('load', () => {
        try {
            f.contentWindow?.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    if (runControlArrowKey(e.key === 'ArrowUp' ? -1 : 1)) e.preventDefault();
                }
            }, true);
        } catch (_) {}
    });
}
// Chat/Terminal/Browser 프레임 풀(showPooledFrame의 onCreate)에서 공용으로 쓰는 단축키 브리지.
// RDP(원격 데스크탑 제어)와 Editor(Monaco - F1은 커맨드 팔레트, 방향키는 커서 이동)는 이 키들을 가로채면
// 본래 기능이 깨지므로 일부러 연결하지 않는다.
function wirePooledFrameHotkeys(f: HTMLIFrameElement, key: string) {
    const isTerm = key.startsWith('term:') || key.startsWith('term-new:');
    f.addEventListener('load', () => {
        try {
            f.contentWindow?.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'F1' || e.key === 'F2') {
                    e.preventDefault();
                    runControlHotkey(e.key);
                    return;
                }
                if (e.key === 'F3') {
                    e.preventDefault();
                    runControlF3Key();
                    return;
                }
                // 터미널은 위/아래 화살표가 명령어 히스토리 탐색 용도이므로 제외(Home.ts와 동일 예외).
                if (!isTerm && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                    if (runControlArrowKey(e.key === 'ArrowUp' ? -1 : 1)) e.preventDefault();
                }
            }, true);
        } catch (_) {}
    });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'F1' || e.key === 'F2') {
        e.preventDefault();
        runControlHotkey(e.key);
        return;
    }
    if (e.key === 'F3') {
        e.preventDefault();
        runControlF3Key();
        return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (runControlArrowKey(e.key === 'ArrowUp' ? -1 : 1)) e.preventDefault();
    }
});
// File.ts/Memo.ts는 자체 keydown에서 F1/F2/F3/F4/F7을 잡아 'home-hotkey'로 부모에 위임한다(Home.ts와 동일 패턴).
// Control.ts는 F1/F2/F3만 지원하므로 나머지 키는 무시한다.
CIframeMsg.Recv({
    'home-hotkey': (data) => {
        const key = String(data.key ?? '');
        if (key === 'F3') runControlF3Key();
        else runControlHotkey(key);
    },
});

// Memo 옆 검색 버튼: Control 페이지의 파일 검색 모달을 연다(F2 단축키와 동일한 동작).
CDOM.ID('file-search-btn').addEventListener('click', () => runControlHotkey('F2'));

// File 탭(File.ts)이 스스로 다른 원격으로 전환하면 이 메시지로 currentRemoteBaseUrl을 갱신하고,
// Memo iframe에도 같은 원격을 보도록 알려준다(memoSendRemoteInfo와 동일한 단일 출처 패턴).
CIframeMsg.Recv({
    'file-remote-changed': (data) => {
        currentRemoteBaseUrl = String(data.baseUrl ?? '');
        memoSendRemoteInfo();
    },
    'file-opened': (data) => {
        editorOpenFile(String(data.path ?? ''), String(data.baseUrl ?? ''), String(data.url ?? ''));
    },
    // Chat/Terminal은 새 세션 옵션 모달만 띄우고, 현재 보고 있는 탭(File 등)은 그대로 유지한다.
    'open-chat': (data) => chatStartNew(data.cwd || undefined),
    'open-term': (data) => termStartNew('cmd', data.cwd || undefined),
    'open-memo': (data) => {
        (window as any).bootstrap.Tab.getOrCreateInstance(memoTab).show();
        memoTryInit();
        // iframe이 방금 로드됐을 수 있으니(memoTryInit), 스크립트가 메시지 리스너를 등록할 시간을 준다.
        setTimeout(() => { if (memoIframe?.contentWindow) CIframeMsg.Send(memoIframe.contentWindow, 'set-folder', { folder: data.folder ?? '' }); }, 200);
    },
    'terminal-path-tapped': (data) => termOpenTappedPath(String(data.path ?? ''), String(data.token ?? '')),
});

// ---- 다운로드 탭 (MountDownloadTab) ----
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

// ---- 메모 탭 (Home.html과 동일하게 artgine/server/html/Memo.html을 iframe으로 임베드) ----
const memoTab = CDOM.ID("memo-tab") as HTMLButtonElement;
const memoPanel = CDOM.ID("memo-panel") as HTMLDivElement;
let memoIframe: HTMLIFrameElement | null = null;
let memoLoaded = false;

function memoEnsureLayout() {
    if (memoIframe) return;
    memoPanel.classList.add("position-relative");
    memoPanel.style.overflow = "hidden";
    memoIframe = document.createElement("iframe");
    memoIframe.id = "memo-iframe";
    memoIframe.style.cssText = "position:absolute; inset:0; width:100%; height:100%; border:none;";
    memoPanel.appendChild(memoIframe);
    wireIframeArrowKeys(memoIframe);
}

function memoLoadFrame() {
    memoEnsureLayout();
    if (memoLoaded) return;
    memoLoaded = true;
    // Control 페이지의 현재 테마(light/dark)를 함께 넘겨 Memo.html도 맞춰 보이게 한다.
    const ctrlTheme = document.documentElement.getAttribute('data-bs-theme');
    const q = ctrlTheme ? `?theme=${encodeURIComponent(ctrlTheme)}` : '';
    memoIframe!.src = `${CPath.WebRootArtgineUrl()}artgine/server/html/Memo.html${q}`;
}

memoEnsureLayout();
let memoInited = false;
function memoTryInit() {
    if (memoInited) return;
    memoInited = true;
    memoLoadFrame();
}
// 저장된 토큰으로 그 원격의 인증 상태를 확인한다(Home.ts의 rdpCheckRemoteAuth와 동일).
async function rdpCheckRemoteAuth(webRootUrl: string): Promise<boolean> {
    const token = getAuthToken(webRootUrl);
    if (!token) return false;
    try {
        const j = await CFecth.Exe(webRootUrl + "auth/check", { token }, "json") as any;
        return !!j?.authed;
    } catch { return false; }
}

// 그 원격의 admin 비밀번호 인증창. 성공하면 토큰을 저장하고 onSuccess를 호출한다(Home.ts의 rdpPromptRemoteAuth와 동일).
function rdpPromptRemoteAuth(webRootUrl: string, onSuccess?: () => void) {
    const dlg = new CConfirm();
    dlg.SetBody('Enter admin password:<br><input type="password" id="AuthPassword" class="form-control form-control-sm">');
    const doAuth = () => {
        const pw = CDOM.IDValue("AuthPassword");
        (CFecth.Exe(webRootUrl + "auth/login", { password: CHash.SHA256('artgine_' + pw) }, "json") as Promise<any>).then((j: { ok: boolean, token?: string, msg?: string }) => {
            if (j.ok) {
                setAuthToken(webRootUrl, j.token!);
                CAlert.Info("Permission granted");
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

// Chat/Terminal/Browser 사이드바 목록이 인증 안 됨(토큰 없음/만료)으로 못 받아올 때 공용으로 쓰는
// "로그인 필요" 안내 + Sign In 버튼. 클릭하면 로컬 서버(CPath.WebRootUrl())에 대해 rdpPromptRemoteAuth로
// 관리자 비밀번호를 물어보고, 성공하면 onSuccess(보통 그 목록의 RenderList 재호출)로 즉시 다시 채운다.
function renderSignInPrompt(container: HTMLElement, onSuccess: () => void) {
    container.innerHTML = `
        <div class="text-center text-secondary small p-3 d-flex flex-column align-items-center gap-2">
            <div>로그인이 필요합니다.</div>
            <button type="button" class="btn btn-sm btn-outline-primary sign-in-btn">Sign In</button>
        </div>`;
    container.querySelector<HTMLButtonElement>('.sign-in-btn')!.addEventListener('click', () => {
        rdpPromptRemoteAuth(CPath.WebRootUrl(), onSuccess);
    });
}

// Memo iframe에 어느 서버를 쓸지 알린다. 원격이면서 인증이 안 되어 있으면 그 순간 비밀번호를 물어보고,
// 성공한 뒤에야 토큰을 실어 보낸다(로컬이면 baseUrl/token 둘 다 빈 값 = 로컬 리셋).
async function memoSendRemoteInfo() {
    const baseUrl = currentRemoteBaseUrl;
    if (!baseUrl) {
        if (memoIframe?.contentWindow) CIframeMsg.Send(memoIframe.contentWindow, 'set-remote', { baseUrl: '', token: '' });
        return;
    }
    if (!(await rdpCheckRemoteAuth(baseUrl))) {
        rdpPromptRemoteAuth(baseUrl, () => {
            if (currentRemoteBaseUrl !== baseUrl) return; // 그 사이에 다른 원격/로컬로 전환했으면 무시
            if (memoIframe?.contentWindow) CIframeMsg.Send(memoIframe.contentWindow, 'set-remote', { baseUrl, token: getAuthToken(baseUrl) });
        });
        return;
    }
    if (memoIframe?.contentWindow) CIframeMsg.Send(memoIframe.contentWindow, 'set-remote', { baseUrl, token: getAuthToken(baseUrl) });
}

memoTab.addEventListener("shown.bs.tab", () => {
    memoTryInit();
    if (memoIframe?.contentWindow) CIframeMsg.Send(memoIframe.contentWindow, 'open-sidebar');
    memoIframe?.contentWindow?.focus();
    memoSendRemoteInfo();
});
// shown.bs.tab은 다른 탭에서 메모 탭으로 "전환"될 때만 발생하고, 이미 메모 탭이 활성 상태에서
// 탭 버튼을 다시 눌렀을 때는 발생하지 않는다. 그 경우에도 사이드바를 무조건 열어야 하므로
// click에서도 별도로 open-sidebar를 보낸다(이미 열려 있으면 OpenCatSidebar()가 그대로 유지).
memoTab.addEventListener("click", () => {
    if (memoIframe?.contentWindow) CIframeMsg.Send(memoIframe.contentWindow, 'open-sidebar');
});
if (memoTab.classList.contains("active")) memoTryInit();

// ---- Chat/Terminal/Browser 통합 세션 목록 ----
// RDP만 별도 목록이고, 나머지 세 유형(Chat/Terminal/Browser)은 유형 구분 없이 실제 최신순으로
// 하나의 사이드바 목록에 함께 정렬되어야 한다(안 그러면 유형별로 나뉜 목록끼리는 서로 최신순 비교가
// 안 되어 "이게 왜 맨 위에 있냐"는 혼란이 생긴다). 그래서 각 유형은 자기 데이터만 캐시에 갱신하고,
// 실제 DOM 렌더링은 이 공용 renderSessionSidebar()가 세 캐시를 합쳐서 한 번에 그린다.
const sessionSidebarList = CDOM.ID("session-sidebar-list") as HTMLDivElement;

// ---- 완료 알림(Home.html과 동일): 포커스 여부에 따라 브라우저 알림 또는 우측 상단 토스트로 표시 ----
let _activeNotifCallback: (() => void) | null = null;

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

// 완료 알림 로그: 우측 사이드바에 최신순으로 쌓고, 7개를 넘으면 가장 오래된 것부터 제거한다.
const NOTIF_LOG_MAX = 7;
const notifLogEl = document.getElementById('aiNotifLog');
function _pushNotifLog(label: string, content?: string, onClick?: () => void, idInfo?: string) {
    if (!notifLogEl) return;
    const row = document.createElement('div');
    row.className = 'small rounded px-2 py-2 notif-row notif-flash';
    if (onClick) row.style.cursor = 'pointer';
    row.innerHTML = `${idInfo ? `<div class="text-secondary text-truncate" style="font-size:0.65rem;font-family:monospace;">${idInfo}</div>` : ''}<div class="fw-semibold text-truncate">${label}</div>${content ? `<div class="text-secondary text-truncate">${content}</div>` : ''}`;
    if (onClick) row.addEventListener('click', onClick);
    notifLogEl.prepend(row);
    while (notifLogEl.children.length > NOTIF_LOG_MAX) notifLogEl.lastElementChild?.remove();
}

// suppressToast: 우측 사이드바 로그는 무조건 남기되, 현재 프레임이 선택되어 있어 굳이 알릴 필요가 없을 때 토스트/브라우저 알림만 생략한다.
function _showDoneNotification(label: string, content?: string, onClick?: () => void, idInfo?: string, suppressToast?: boolean) {
    _pushNotifLog(label, content, onClick, idInfo);
    if (suppressToast) return;
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

// ---- 세션 상태(빨강 off / 주황 busy / 초록 idle)를 1곳에서 관리 ----
// 알림은 트랙/주황(초록→busy·wait·idle) 전환에서만 발화한다. Chat·Terminal 공용.
type SessState = 'off' | 'busy' | 'idle' | 'wait';
const _sessState = new Map<string, SessState>();
function syncSessState(id: string, cur: SessState, onDone: () => void, onWait?: () => void): void {
    const prev = _sessState.get(id);
    if ((prev === 'busy' || prev === 'wait') && cur === 'idle') onDone();
    if (prev !== 'wait' && cur === 'wait') onWait?.();
    _sessState.set(id, cur);
}

type ISessionAuthState = 'ok' | 'signin' | 'unknown';
let chatAuthState: ISessionAuthState = 'unknown';
let termAuthState: ISessionAuthState = 'unknown';
let browserAuthState: ISessionAuthState = 'unknown';

let lastChatSessions: { sessionId: string; title: string; updatedAt?: number; busy?: boolean; lastMsg?: string; workingDir?: string }[] | null = null;
let lastTermSessions: { token: string; mode: string; key?: string; lastMsg: string; updatedAt: number; createdAt: number; alive: boolean; busy: boolean; permPending?: boolean; workingDir?: string }[] | null = null;

function renderSessionSidebar() {
    if (sessionSidebarList.querySelector('.dropdown-menu.show')) return;

    // 셋 다 같은 로컬 서버 인증을 공유하므로, 하나라도 로그인이 필요하면 프롬프트 하나만 띄운다.
    if (chatAuthState === 'signin' || termAuthState === 'signin' || browserAuthState === 'signin') {
        renderSignInPrompt(sessionSidebarList, () => { chatRenderList(); termRenderList(); browserRefreshList(); });
        return;
    }

    const entries: { sortKey: number; el: HTMLDivElement }[] = [];
    if (lastChatSessions) for (const s of lastChatSessions) entries.push({ sortKey: s.updatedAt ?? 0, el: buildChatItem(s) });
    if (lastTermSessions) for (const s of lastTermSessions) entries.push({ sortKey: s.updatedAt ?? 0, el: buildTermItem(s) });
    for (const s of browserSessions.values()) entries.push({ sortKey: s.updatedAt ?? s.createdAt ?? 0, el: buildBrowserItem(s) });
    for (const s of editorSessions.values()) entries.push({ sortKey: s.openedAt, el: buildEditorItem(s) });

    entries.sort((a, b) => b.sortKey - a.sortKey);
    sessionSidebarList.innerHTML = '';
    for (const e of entries) sessionSidebarList.appendChild(e.el);
}

// ---- Chat 탭 (Home.html의 AI Chat 세션 목록/프레임 풀 패턴을 재사용) ----
// 같은 출처(same-origin) 요청이라 세션 쿠키가 자동 전송된다 → 토큰 별도 첨부 불필요.
function authedFetch(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, init);
}

function chatFormatRelative(ts?: number): string {
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

const chatFrameContainer = CDOM.ID("chat-frame-container") as HTMLDivElement;
const chatFramePlaceholder = CDOM.ID("chat-frame-placeholder") as HTMLDivElement;
const chatIframePool = new Map<string, HTMLIFrameElement>();
let activeChatFrameKey: string | null = null;

function updateChatFramePlaceholder() {
    chatFramePlaceholder.classList.toggle('chat-frame-placeholder-hidden', !!activeChatFrameKey);
}

const chatFrameCtx: FramePoolCtx = {
    pool: chatIframePool,
    container: chatFrameContainer,
    getActiveKey: () => activeChatFrameKey,
    setActiveKey: (key) => { activeChatFrameKey = key; },
    updatePlaceholder: updateChatFramePlaceholder,
    onCreate: wirePooledFrameHotkeys,
};

function showChatFrame(key: string, src: string): HTMLIFrameElement {
    return showPooledFrame(chatFrameCtx, key, src);
}

function chatActivatePane() {
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('chat-panel-tab')).show();
}

// ---- Editor 탭 (File 탭에서 연 파일을 Monaco로 보여주는 artgine/server/html/Editor.html을 프레임 풀로 관리) ----
const editorFrameContainer = CDOM.ID("editor-frame-container") as HTMLDivElement;
const editorFramePlaceholder = CDOM.ID("editor-frame-placeholder") as HTMLDivElement;
const editorIframePool = new Map<string, HTMLIFrameElement>();
let activeEditorFrameKey: string | null = null;

function updateEditorFramePlaceholder() {
    editorFramePlaceholder.classList.toggle('editor-frame-placeholder-hidden', !!activeEditorFrameKey);
}

const editorFrameCtx: FramePoolCtx = {
    pool: editorIframePool,
    container: editorFrameContainer,
    getActiveKey: () => activeEditorFrameKey,
    setActiveKey: (key) => { activeEditorFrameKey = key; },
    updatePlaceholder: updateEditorFramePlaceholder,
};

function showEditorFrame(key: string, src: string): HTMLIFrameElement {
    return showPooledFrame(editorFrameCtx, key, src);
}

function editorActivatePane() {
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('editor-panel-tab')).show();
}

interface IEditorSession { key: string; path: string; baseUrl: string; url: string; openedAt: number; }
const editorSessions = new Map<string, IEditorSession>();

function editorFrameSrc(s: IEditorSession): string {
    const root = s.baseUrl || CPath.WebRootArtgineUrl();
    return `${root}artgine/server/html/Editor.html?path=${encodeURIComponent(s.path)}&url=${encodeURIComponent(s.url)}`;
}

function editorOpenFile(path: string, baseUrl: string, url: string) {
    const key = `editor:${baseUrl}|${path}`;
    let s = editorSessions.get(key);
    if (!s) {
        s = { key, path, baseUrl, url, openedAt: Date.now() };
        editorSessions.set(key, s);
    } else {
        s.url = url;
        s.openedAt = Date.now();
    }
    editorActivatePane();
    showEditorFrame(key, editorFrameSrc(s));
    renderSessionSidebar();
}

// 터미널에서 탭한 경로(터미널의 workingDir 기준 상대/절대 경로)를 settings.json에 등록된
// File/Root 루트들 중 하나에 매핑해 Monaco 에디터 iframe(editorOpenFile)으로 열어준다.
// 등록된 루트 범위 밖이면(File/Root가 모르는 경로) 열 수 없으므로 안내만 띄운다.
function termNormAbsPath(p: string): string {
    return p.replace(/\\/g, '/').replace(/\/+$/, '');
}
async function termOpenTappedPath(tappedPath: string, token: string) {
    if (!tappedPath) return;
    const sess = lastTermSessions?.find(s => s.token === token);
    const workingDir = sess?.workingDir || '';
    const isAbsolute = /^[A-Za-z]:[\\/]/.test(tappedPath);
    const fullPath = isAbsolute
        ? tappedPath
        : workingDir
            ? `${termNormAbsPath(workingDir)}/${tappedPath.replace(/\\/g, '/')}`
            : '';
    if (!fullPath) {
        CAlert.E(`워킹 디렉토리를 알 수 없어 경로를 열 수 없습니다: ${tappedPath}`);
        return;
    }
    try {
        const data = await CFecth.Exe(CPath.WebRootUrl() + "File/Root", {}, "json") as { roots: Array<{ path: string; url: string; name: string }> };
        const normFull = termNormAbsPath(fullPath);
        const normFullLower = normFull.toLowerCase();
        const root = (data.roots || []).find(r => {
            const rp = termNormAbsPath(r.path).toLowerCase();
            return normFullLower === rp || normFullLower.startsWith(rp + '/');
        });
        if (!root) {
            CAlert.E(`등록된 루트 경로에 없어 열 수 없습니다: ${fullPath}`);
            return;
        }
        const relPath = normFull.slice(termNormAbsPath(root.path).length);
        const downBase = new URL(root.url, CPath.WebRootUrl()).href.replace(/\/+$/, '');
        const url = downBase + relPath.split('/').map(encodeURIComponent).join('/');
        termPromptOpenMode(fullPath, url);
    } catch (e) {
        console.error('termOpenTappedPath error:', e);
        CAlert.E('경로를 여는 중 오류가 발생했습니다.');
    }
}

// File.ts의 saveEditedFile과 동일한 멀티바이트 안전 base64 인코딩.
const termTextToBase64 = (text: string) => btoa(unescape(encodeURIComponent(text)));

// File.ts의 saveEditedFile과 동일하게 File/Upload로 저장한다. 다만 File.ts는 현재 탐색 중인
// 폴더(gRoot+gPath)를 쓰지만, 여기는 탐색 상태가 없으므로 fullPath에서 폴더/파일명을 직접 뽑는다.
function termSaveEditedFile(fullPath: string, base64: string) {
    const idx = fullPath.lastIndexOf('/');
    const folder = fullPath.slice(0, idx + 1);
    const fileName = fullPath.slice(idx + 1);
    CFecth.Exe(CPath.WebRootUrl() + "File/Upload", { path: folder, name: [fileName], data: [base64] })
        .then(() => CAlert.Info('저장 완료'))
        .catch((e: any) => CAlert.E('저장 실패: ' + e.message));
}

// Source(읽기전용 Monaco iframe, 기존 editorOpenFile) / Edit(수정 가능한 CFileViewer 모달, File.ts의
// openCode와 동일한 방식) 중 어떻게 열지 선택하는 확인창.
function termPromptOpenMode(fullPath: string, url: string) {
    const confirm = new CConfirm();
    confirm.SetBody(`"${aiEscapeHtml(fullPath)}"`);
    confirm.SetConfirm(CConfirm.eConfirm.List, [
        () => editorOpenFile(fullPath, '', url),
        () => new CFileViewer([url], async (_filePath, bufStr) => termSaveEditedFile(fullPath, termTextToBase64(bufStr))).Open(),
        () => {},
    ], ["Source", "Edit", "Cancel"]);
    confirm.Open();
}

function buildEditorItem(s: IEditorSession): HTMLDivElement {
    const name = s.path.split('/').pop() || s.path;
    return createSessionItem({
        activeClass: 'ai-session-item-active',
        isActive: activeEditorFrameKey === s.key && isPanelShown('editor-panel'),
        dataAttr: { name: 'key', value: s.key },
        leftHtml: `<i class="bi bi-file-earmark-code"></i>`,
        bodyHtml: `<span class="flex-grow-1 min-w-0 text-truncate small" title="${aiEscapeHtml(s.path)}">${aiEscapeHtml(name)}</span>`,
        deleteAct: 'delete',
        deleteLabel: '🗑️ Delete',
        onClick: () => {
            editorActivatePane();
            showEditorFrame(s.key, editorFrameSrc(s));
            renderSessionSidebar();
        },
        onShare: () => showShareLinkModal('Editor Share Link', `Anyone with this link can view: <strong>${aiEscapeHtml(s.path)}</strong>`, editorFrameSrc(s)),
        onDelete: () => {
            const f = editorIframePool.get(s.key);
            if (f) { f.remove(); editorIframePool.delete(s.key); }
            if (activeEditorFrameKey === s.key) { activeEditorFrameKey = null; updateEditorFramePlaceholder(); }
            editorSessions.delete(s.key);
            renderSessionSidebar();
        },
        popup: { url: () => editorFrameSrc(s), title: name, winName: `editor_${s.key}` },
    });
}

function genUuid(): string {
    if (crypto && 'randomUUID' in crypto) return (crypto as any).randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// More > New Chat: Home.html의 New Chat 모달과 동일(Working Directory/MCP/Copy MD 옵션).
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

        const doOpen = () => {
            const sid = genUuid();
            const workingDir = workingDirInput.value.trim();
            const params = new URLSearchParams({ session: sid });
            if (!mcpCheck.checked) params.set('mcp', '0');
            if (workingDir) params.set('workingDir', workingDir);
            if (mdcopyCheck.checked) params.set('mdcopy', '1');
            chatActivatePane();
            showChatFrame(`chat:${sid}`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?${params.toString()}`);
            chatRenderList();
            setTimeout(chatRenderList, 1500);
            setTimeout(chatRenderList, 4000);
            modal.Close();
        };

        container.querySelector<HTMLButtonElement>('#chat-modal-open')!.addEventListener('click', doOpen);
        container.querySelector<HTMLButtonElement>('#chat-modal-cancel')!.addEventListener('click', () => modal.Close());
        workingDirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doOpen(); });
    }, MODAL_DOM_DELAY);
}
CDOM.ID('chat-new-btn').addEventListener('click', () => chatStartNew(ctrlSelectedRootPath || undefined));

function chatLoadSession(sid: string) {
    chatActivatePane();
    showChatFrame(`chat:${sid}`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(sid)}`);
    renderSessionSidebar();
}

function chatShowShareLink(sid: string, title: string) {
    const shareUrl = `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(sid)}`;
    showShareLinkModal('Chat Share Link', `Anyone with this link can access the chat: <strong>${aiEscapeHtml(title)}</strong>`, shareUrl);
}

function buildChatItem(s: { sessionId: string; title: string; updatedAt?: number; busy?: boolean; workingDir?: string }): HTMLDivElement {
    const key = `chat:${s.sessionId}`;
    const rel = chatFormatRelative(s.updatedAt);
    const isLoaded = chatIframePool.has(key);
    const st: 'off' | 'busy' | 'idle' = !isLoaded ? 'off' : s.busy ? 'busy' : 'idle';
    const dot = st === 'off'  ? '<span class="text-danger small" title="미연결">●</span>'
              : st === 'busy' ? '<span class="ai-busy-dot text-warning small" title="처리 중">●</span>'
              :                 '<span class="text-success small" title="대기 중">●</span>';
    return createSessionItem({
        activeClass: 'ai-session-item-active',
        isActive: activeChatFrameKey === key && isPanelShown('chat-panel'),
        dataAttr: { name: 'key', value: key },
        leftHtml: `
        <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
            ${dot}
            ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
        </span>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            <span class="text-truncate text-secondary" style="font-size:0.65rem;font-family:monospace;">${aiEscapeHtml(s.sessionId)}</span>
            <span class="text-truncate small">${aiEscapeHtml(s.title)}</span>
            ${s.workingDir ? `<span class="text-secondary" style="font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;">${aiEscapeHtml(s.workingDir)}</span>` : ''}
        </span>`,
        deleteAct: 'delete',
        deleteLabel: '🗑️ Delete',
        onClick: () => chatLoadSession(s.sessionId),
        onShare: () => chatShowShareLink(s.sessionId, s.title),
        onDelete: () => {
            const delConfirm = new CConfirm();
            delConfirm.SetBody(`Delete "${aiEscapeHtml(s.title)}"?`);
            delConfirm.SetConfirm(CConfirm.eConfirm.YesNo, [
                async () => {
                    await authedFetch(`${CPath.WebRootUrl()}AIChat/session?id=${s.sessionId}`, { method: 'DELETE' });
                    const f = chatIframePool.get(key);
                    if (f) { f.remove(); chatIframePool.delete(key); }
                    if (activeChatFrameKey === key) { activeChatFrameKey = null; updateChatFramePlaceholder(); }
                    chatRenderList();
                },
                () => {},
            ], ["Delete", "Cancel"]);
            delConfirm.Open();
        },
        popup: { url: () => `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(s.sessionId)}`, title: s.title, winName: `chat_${s.sessionId}` },
    });
}

async function chatRenderList() {
    const token = getAuthToken(CPath.WebRootUrl());
    if (!token) {
        chatAuthState = 'signin';
        lastChatSessions = null;
        renderSessionSidebar();
        return;
    }
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'AIChat/sessions?limit=30');
        if (r.status === 401) {
            chatAuthState = 'signin';
            lastChatSessions = null;
            renderSessionSidebar();
            return;
        }
        if (!r.ok) return;
        const j = await r.json();
        if (!j.ok) return;
        chatAuthState = 'ok';
        const sessions = j.sessions as { sessionId: string; title: string; updatedAt?: number; busy?: boolean; lastMsg?: string; workingDir?: string }[];
        for (const s of sessions) {
            const key = `chat:${s.sessionId}`;
            const st: SessState = s.busy ? 'busy' : 'idle';
            syncSessState(key, st, () => {
                const suppressToast = activeChatFrameKey === key && document.hasFocus();
                _showDoneNotification(aiEscapeHtml(s.title), s.lastMsg ? aiEscapeHtml(s.lastMsg) : undefined, () => chatLoadSession(s.sessionId), aiEscapeHtml(s.sessionId), suppressToast);
            });
        }
        lastChatSessions = sessions;
        renderSessionSidebar();
    } catch (e) { console.error('Chat session list error:', e); }
}

// Chat 목록은 RDP 목록과 함께 사이드바에 항상 표시된다(탭 전환과 무관).
chatRenderList();

// ---- Terminal 탭 (Home.html의 터미널 세션 목록/프레임 풀 패턴을 재사용) ----
// Terminal은 More 드롭다운이 아니라 최상위 nav-link라서 드롭다운 하이라이트 문제가 없다.
// 요구사항: "Terminal 탭 버튼 자체가 New Terminal 버튼" — 탭을 누르면 항상 새 터미널 시작 모달이 뜬다.
// 기존 세션 보기는 사이드바 목록 클릭(termConnectSession)으로만 한다.
const termFrameContainer = CDOM.ID("term-frame-container") as HTMLDivElement;
const termFramePlaceholder = CDOM.ID("term-frame-placeholder") as HTMLDivElement;
const termIframePool = new Map<string, HTMLIFrameElement>();
let activeTermFrameKey: string | null = null;

function updateTermFramePlaceholder() {
    termFramePlaceholder.classList.toggle('term-frame-placeholder-hidden', !!activeTermFrameKey);
}

function updateTermFrameVisibility() {
    if (!activeTermFrameKey) return;
    postFrameVisible(termIframePool.get(activeTermFrameKey), CDOM.ID('term-panel').classList.contains('active'));
}

const termFrameCtx: FramePoolCtx = {
    pool: termIframePool,
    container: termFrameContainer,
    getActiveKey: () => activeTermFrameKey,
    setActiveKey: (key) => { activeTermFrameKey = key; },
    updatePlaceholder: updateTermFramePlaceholder,
    onCreate: wirePooledFrameHotkeys,
};

function showTermFrame(key: string, src: string): HTMLIFrameElement {
    return showPooledFrame(termFrameCtx, key, src);
}

function termActivatePane() {
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('term-tab')).show();
}

async function termConnectSession(token: string) {
    termActivatePane();
    const key = `term:${token}`;
    if (termIframePool.has(key)) {
        showTermFrame(key, '');
    } else {
        showTermFrame(key, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${token}`);
    }
    renderSessionSidebar();
}

async function termKillSession(token: string) {
    try {
        const r = await authedFetch(`${CPath.WebRootUrl()}cmd/kill-session?token=${token}`);
        const j = await r.json();
        if (!j.ok) { CAlert.E(`삭제 실패: ${j.msg || 'unknown error'}`); return; }
        const key = `term:${token}`;
        const f = termIframePool.get(key);
        if (f) { f.remove(); termIframePool.delete(key); }
        if (activeTermFrameKey === key) { activeTermFrameKey = null; updateTermFramePlaceholder(); }
        termRenderList();
    } catch (e) { console.error('termKillSession error:', e); }
}

function termConfirmKillSession(token: string, label: string) {
    const confirm = new CConfirm();
    confirm.SetBody(`Delete "${aiEscapeHtml(label)}"?`);
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => { termKillSession(token); },
        () => {},
    ], ["Delete", "Cancel"]);
    confirm.Open();
}

function termShowShareLink(token: string) {
    showShareLinkModal(
        'Terminal Share Link',
        'Anyone with this link can view the terminal in read-only mode.',
        `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${token}`
    );
}

function buildTermItem(s: { token: string; mode: string; key?: string; lastMsg: string; updatedAt: number; alive: boolean; busy: boolean; permPending?: boolean; workingDir?: string }): HTMLDivElement {
    const key = `term:${s.token}`;
    const isActive = activeTermFrameKey === key && isPanelShown('term-panel');
    const isLoaded = termIframePool.has(key);
    const rel = chatFormatRelative(s.updatedAt);
    const preview = aiEscapeHtml(s.lastMsg || '(empty)');
    const dotLabel = s.mode.slice(0, 3);
    const dotTitle = s.key || s.mode;
    const st: 'off' | 'busy' | 'idle' | 'wait' = !s.alive ? 'off'
        : s.permPending ? 'wait'
        : !isLoaded ? 'off'
        : s.busy ? 'busy'
        : 'idle';
    const dot = st === 'off'  ? `<span class="badge rounded-pill bg-danger" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
              : st === 'wait' ? `<span class="badge rounded-pill bg-warning" title="${aiEscapeHtml(dotTitle)}" style="filter:hue-rotate(30deg)">${dotLabel}</span>`
              : st === 'busy' ? `<span class="badge rounded-pill bg-warning" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
              :                 `<span class="badge rounded-pill bg-success" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`;
    return createSessionItem({
        activeClass: 'ai-session-item-active',
        isActive,
        dataAttr: { name: 'key', value: key },
        leftHtml: `
        <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
            ${dot}
            ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
        </span>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            <span class="text-truncate text-secondary" style="font-size:0.65rem;font-family:monospace;">${aiEscapeHtml(s.token)}</span>
            ${s.key ? `<span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(s.key)}</span>` : ''}
            <span class="text-truncate small">${preview}</span>
            ${s.workingDir ? `<span class="text-secondary" style="font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;">${aiEscapeHtml(s.workingDir)}</span>` : ''}
        </span>`,
        deleteAct: 'kill',
        deleteLabel: '🗑️ Delete',
        onClick: () => termConnectSession(s.token),
        onShare: () => termShowShareLink(s.token),
        onDelete: () => termConfirmKillSession(s.token, s.key || s.mode || 'Terminal'),
        popup: { url: () => `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${s.token}`, title: s.key || s.mode || 'Terminal', winName: `term_${s.token.slice(0, 8)}` },
    });
}

async function termRenderList() {
    if (!getAuthToken(CPath.WebRootUrl())) {
        termAuthState = 'signin';
        lastTermSessions = null;
        renderSessionSidebar();
        return;
    }
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/sessions');
        if (r.status === 401) {
            termAuthState = 'signin';
            lastTermSessions = null;
            renderSessionSidebar();
            return;
        }
        const j = await r.json();
        if (!j.ok) return;
        termAuthState = 'ok';
        const sessions = j.sessions as { token: string; mode: string; key?: string; lastMsg: string; updatedAt: number; createdAt: number; alive: boolean; busy: boolean; permPending?: boolean; workingDir?: string }[];
        const serverTokens = new Set(sessions.map(s => s.token));
        for (const key of Array.from(termIframePool.keys())) {
            if (!key.startsWith('term:')) continue;
            if (!serverTokens.has(key.slice(5))) {
                const f = termIframePool.get(key);
                if (f) { f.remove(); termIframePool.delete(key); }
                if (activeTermFrameKey === key) { activeTermFrameKey = null; updateTermFramePlaceholder(); }
            }
        }
        // term-new: 임시 키로 열어둔 프레임을, 서버에 등록된 실제 토큰 키로 승격한다(가장 최근 생성된 세션에 매칭).
        const termNewKeys = Array.from(termIframePool.keys()).filter(k => k.startsWith('term-new:'));
        if (termNewKeys.length > 0) {
            const newSessions = sessions.filter(s => !termIframePool.has(`term:${s.token}`));
            if (newSessions.length > 0) {
                const newest = newSessions.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
                const key = `term:${newest.token}`;
                const newKey = termNewKeys[0];
                const f = termIframePool.get(newKey)!;
                termIframePool.delete(newKey);
                termIframePool.set(key, f);
                if (activeTermFrameKey === newKey) activeTermFrameKey = key;
            }
        }
        for (const s of sessions) {
            const key = `term:${s.token}`;
            const st: SessState = !s.alive ? 'off'
                : s.permPending ? 'wait'
                : s.busy ? 'busy'
                : 'idle';
            syncSessState(key, st,
                () => {
                    const rawPreview = s.lastMsg || '';
                    const suppressToast = activeTermFrameKey === key && document.hasFocus();
                    _showDoneNotification(`${s.key || s.mode}: ${rawPreview}`.trimEnd(), rawPreview ? aiEscapeHtml(rawPreview) : undefined, () => termConnectSession(s.token), aiEscapeHtml(s.token), suppressToast);
                },
                () => {
                    const suppressToast = activeTermFrameKey === key && document.hasFocus();
                    _showDoneNotification(`⚠️ ${s.key || s.mode}: 권한 승인 필요`, s.lastMsg || undefined, () => termConnectSession(s.token), aiEscapeHtml(s.token), suppressToast);
                }
            );
        }
        lastTermSessions = sessions;
        renderSessionSidebar();
    } catch (e) { console.error('Terminal session list error:', e); }
}

// Terminal 탭 버튼: 클릭(사용자가 직접 누른 경우)하면 항상 New Terminal 모달을 띄운다.
// 사이드바 항목 클릭으로 프로그램적으로 탭을 활성화하는 경우(termActivatePane)는 'click'이 아니라
// bootstrap의 show()이므로 네이티브 click 이벤트가 발생하지 않아 여기서 다시 걸리지 않는다.
function termStartNew(mode: 'cmd' | 'claude' | 'codex' | 'antigravity' | 'opencode' = 'cmd', initialWorkingDir?: string) {
    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">New Terminal</p>
        <div class="mb-3 d-flex gap-2 flex-wrap">
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="cmd">cmd</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="claude">claude</button>
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
        let selectedMode: string = mode;
        const modeButtons = container.querySelectorAll<HTMLButtonElement>('.term-mode-btn');
        const mcpCheck    = container.querySelector<HTMLInputElement>('#term-opt-mcp')!;
        const mdcopyCheck = container.querySelector<HTMLInputElement>('#term-opt-mdcopy')!;

        const updateModeUI = (m: string) => {
            selectedMode = m;
            modeButtons.forEach(b => {
                b.classList.toggle('btn-primary', b.dataset.mode === m);
                b.classList.toggle('btn-outline-secondary', b.dataset.mode !== m);
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
            if (opening) return;
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
                const r = await authedFetch(CPath.WebRootUrl() + 'cmd/start-term?' + params.toString());
                const j = await r.json();
                if (!j.ok) { CAlert.E(j.msg || 'Failed to start terminal'); return; }
                modal.Close();
                termActivatePane();
                showTermFrame(`term-new:${Date.now()}`, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${j.token}`);
                termRenderList();
                setTimeout(termRenderList, 1500);
                setTimeout(termRenderList, 4000);
            } catch (e) {
                console.error('[Terminal] start-term error:', e);
                CAlert.E('Failed to start terminal');
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

const termTab = CDOM.ID('term-tab') as HTMLButtonElement;
termTab.addEventListener('click', () => termStartNew('cmd', ctrlSelectedRootPath || undefined));
termTab.addEventListener('shown.bs.tab', () => { termRenderList(); updateTermFrameVisibility(); });
termTab.addEventListener('hidden.bs.tab', () => updateTermFrameVisibility());

// Terminal 목록도 RDP/Chat과 함께 사이드바에 항상 표시된다.
termRenderList();

// ---- Browser 탭 (Home.html의 Playwright 세션 목록/프레임 풀 패턴을 재사용) ----
const browserFrameContainer = CDOM.ID("browser-frame-container") as HTMLDivElement;
const browserFramePlaceholder = CDOM.ID("browser-frame-placeholder") as HTMLDivElement;
const browserIframePool = new Map<string, HTMLIFrameElement>();
let activeBrowserFrameKey: string | null = null;

function updateBrowserFramePlaceholder() {
    browserFramePlaceholder.classList.toggle('browser-frame-placeholder-hidden', !!activeBrowserFrameKey);
}

function isBrowserPaneActive(): boolean { return CDOM.ID('browser-panel').classList.contains('active'); }

function updateBrowserFrameVisibility() {
    if (!activeBrowserFrameKey) return;
    postFrameVisible(browserIframePool.get(activeBrowserFrameKey), isBrowserPaneActive());
}

const browserFrameCtx: FramePoolCtx = {
    pool: browserIframePool,
    container: browserFrameContainer,
    getActiveKey: () => activeBrowserFrameKey,
    setActiveKey: (key) => { activeBrowserFrameKey = key; },
    updatePlaceholder: updateBrowserFramePlaceholder,
    onCreate: wirePooledFrameHotkeys,
    onActivate: (_key, prevKey) => {
        if (prevKey) postFrameVisible(browserIframePool.get(prevKey), false);
        updateBrowserFrameVisibility();
    },
};

function showBrowserFrame(key: string, src: string): HTMLIFrameElement {
    return showPooledFrame(browserFrameCtx, key, src);
}

function destroyBrowserFrame(key: string) {
    const f = browserIframePool.get(key);
    if (!f) return;
    f.remove();
    browserIframePool.delete(key);
    if (activeBrowserFrameKey === key) activeBrowserFrameKey = null;
    updateBrowserFramePlaceholder();
}

function browserActivatePane() {
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('browser-panel-tab')).show();
}

interface IBrowserSessionData {
    sessionId: string;
    url: string;
    browserName: string;
    expiresAt: number;
    createdAt: number;
    updatedAt: number;
}
// 순수 데이터 캐시. DOM(사이드바 항목)은 매번 renderSessionSidebar()가 이 데이터로부터 새로 만든다.
const browserSessions = new Map<string, IBrowserSessionData>();

function browserLoadSession(sessionId: string) {
    browserActivatePane();
    showBrowserFrame(`browser:${sessionId}`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}`);
    renderSessionSidebar();
}

function browserFmtTtl(expiresAt: number): string {
    const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (rem <= 0) return '−0s';
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return m > 0 ? `−${m}m${s}s` : `−${s}s`;
}

function buildBrowserItem(s: IBrowserSessionData): HTMLDivElement {
    const key = `browser:${s.sessionId}`;
    const isActive = activeBrowserFrameKey === key && isPanelShown('browser-panel');
    const isLoaded = browserIframePool.has(key);
    const rel = chatFormatRelative(s.updatedAt);
    return createSessionItem({
        activeClass: 'ai-session-item-active',
        isActive,
        dataAttr: { name: 'key', value: key },
        leftHtml: `
        <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
            <span class="browser-dot ${isLoaded ? 'text-success' : 'text-danger'} small flex-shrink-0">●</span>
            ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
        </span>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            <span class="text-truncate small" title="${aiEscapeHtml(s.url)}">${aiEscapeHtml(s.url)}</span>
            <span class="d-flex gap-2 text-secondary" style="font-size:0.7rem;">
                <span>${aiEscapeHtml(s.browserName || 'auto')}</span>
                <span class="browser-ttl-label">${s.expiresAt ? browserFmtTtl(s.expiresAt) : ''}</span>
            </span>
        </span>`,
        deleteAct: 'delete',
        deleteLabel: '🗑️ Delete',
        onClick: () => browserLoadSession(s.sessionId),
        onShare: () => browserShowShareLink(s.sessionId, s.url),
        onDelete: () => browserRemoveSession(s.sessionId),
        popup: { url: () => `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(s.sessionId)}`, title: s.url, winName: `browser_${s.sessionId}` },
    });
}

function browserAddSession(sessionId: string, url: string, browserName: string = '', expiresAt: number = 0, navigate = true, createdAt: number = Date.now()) {
    if (browserSessions.has(sessionId)) return;
    browserSessions.set(sessionId, { sessionId, url, browserName, expiresAt, createdAt, updatedAt: createdAt });
    renderSessionSidebar();
    if (navigate) browserLoadSession(sessionId);
}

async function browserRemoveSession(sessionId: string) {
    if (!browserSessions.has(sessionId)) return;
    browserSessions.delete(sessionId);
    destroyBrowserFrame(`browser:${sessionId}`);
    renderSessionSidebar();
    try {
        await authedFetch(`${CPath.WebRootUrl()}PlayWright/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
    } catch (_) {}
}

async function browserRefreshList() {
    if (!getAuthToken(CPath.WebRootUrl())) {
        browserAuthState = 'signin';
        browserSessions.clear();
        renderSessionSidebar();
        return;
    }
    try {
        const r = await authedFetch(`${CPath.WebRootUrl()}PlayWright/list`);
        if (r.status === 401) {
            browserAuthState = 'signin';
            browserSessions.clear();
            renderSessionSidebar();
            return;
        }
        const j = await r.json();
        if (!j.ok) return;
        browserAuthState = 'ok';
        const serverIds = new Set<string>((j.sessions as { sessionId: string }[]).map(s => s.sessionId));
        for (const sid of Array.from(browserSessions.keys())) {
            if (!serverIds.has(sid)) { browserSessions.delete(sid); destroyBrowserFrame(`browser:${sid}`); }
        }
        for (const s of j.sessions as { sessionId: string; currentUrl: string; browserName: string; expiresAt: number; createdAt: number; updatedAt: number }[]) {
            const existing = browserSessions.get(s.sessionId);
            if (existing) { existing.expiresAt = s.expiresAt; existing.updatedAt = s.updatedAt; }
            else browserSessions.set(s.sessionId, { sessionId: s.sessionId, url: s.currentUrl, browserName: s.browserName, expiresAt: s.expiresAt, createdAt: s.createdAt, updatedAt: s.updatedAt });
        }
        renderSessionSidebar();
    } catch (_) {}
}

function browserShowShareLink(sessionId: string, url: string) {
    showShareLinkModal(
        'Browser Share Link',
        `Anyone with this link can view the session in read-only mode: <strong>${aiEscapeHtml(url)}</strong>`,
        `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}&readonly=1`
    );
}

CDOM.ID('browser-new-btn').addEventListener('click', () => {
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
            } catch (_) { CAlert.E('Failed to start browser'); }
        };

        container.querySelector<HTMLButtonElement>('#brow-open')!.addEventListener('click', doOpen);
        container.querySelector<HTMLButtonElement>('#brow-cancel')!.addEventListener('click', () => modal.Close());
        urlInput.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') doOpen(); });
        setTimeout(() => urlInput.focus(), 50);
    }, MODAL_DOM_DELAY);
});

CDOM.ID('browser-panel-tab').addEventListener('shown.bs.tab', () => updateBrowserFrameVisibility());
CDOM.ID('browser-panel-tab').addEventListener('hidden.bs.tab', () => updateBrowserFrameVisibility());

// Browser 세션의 남은 TTL 표시를 1초마다 갱신한다. 항목 DOM은 5초 주기 renderSessionSidebar()가
// 통째로 다시 그리므로, 매초 전체를 재렌더링하는 대신 현재 DOM에 남은 ttl 라벨만 찾아 갱신한다.
setInterval(() => {
    sessionSidebarList.querySelectorAll<HTMLElement>('[data-key^="browser:"]').forEach(el => {
        const sid = el.dataset.key!.slice('browser:'.length);
        const s = browserSessions.get(sid);
        const ttlEl = el.querySelector<HTMLSpanElement>('.browser-ttl-label');
        if (s && ttlEl) ttlEl.textContent = s.expiresAt ? browserFmtTtl(s.expiresAt) : '';
    });
}, 1000);

// Browser 목록도 RDP/Chat/Terminal과 함께 사이드바에 항상 표시된다.
browserRefreshList();

// 사이드바 목록(Chat/Terminal/Browser)은 탭과 무관하게 항상 보이므로, busy/idle 상태(응답 완료 등)가
// 실시간으로 반영되도록 5초마다 갱신한다. 세션 생성 직후의 1.5s/4s 갱신만으로는 응답이 늦게 오면
// busy(노랑) 표시가 그대로 굳어버리는 문제가 있었다.
setInterval(() => {
    chatRenderList();
    termRenderList();
    browserRefreshList();
}, 5000);

// Chat/Terminal/Browser/Editor 통합 목록의 강조 표시(isPanelShown 기반)는 그중 어떤 탭이 지금
// 센터에 보이는지에 따라 달라지므로, 넷 중 하나로 전환될 때마다(꺼지는 탭/켜지는 탭 둘 다) 다시 그려
// 최신 상태를 반영한다. RDP 쪽 강조는 selectedRdpKey만으로 결정되어 탭 전환과 무관하다.
['chat-panel-tab', 'term-tab', 'browser-panel-tab', 'editor-panel-tab'].forEach((tabId) => {
    const tabEl = CDOM.ID(tabId);
    tabEl.addEventListener('shown.bs.tab', () => renderSessionSidebar());
    tabEl.addEventListener('hidden.bs.tab', () => renderSessionSidebar());
});

// ---- Schedule management (Home.ts의 스케줄러를 이식. 옵션 패널의 Schedule 제목 옆
// New 버튼(#sched-new-btn) → schedOpenModal()로 생성/편집한다) ----
const schedSessionList = CDOM.ID("schedSessionList");

type ScheduleData = { name: string; terminalKey: string; mode: string; delay: number; count: number; start: number; end: number; command: string; cwd?: string; clear?: boolean; mcp?: boolean; mdcopy?: boolean; timeMode?: boolean; days?: number[]; hour?: number; minute?: number };

function schedIntervalStr(s: ScheduleData): string {
    if (s.timeMode) {
        const hh = String(s.hour ?? 0).padStart(2, '0');
        const mm = String(s.minute ?? 0).padStart(2, '0');
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
                    <span class="badge rounded-pill ${s.mode==='none'?'bg-secondary':s.mode==='cmd'?'bg-info':s.mode==='claude'?'bg-warning text-dark':s.mode==='codex'?'bg-primary':s.mode==='opencode'?'bg-success':'bg-danger'}" style="font-size:0.65rem;">${s.mode==='antigravity'?'agy':s.mode}</span>
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
            item.querySelector('.sched-del-btn')!.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                const dlg = new CConfirm();
                dlg.SetBody(`스케줄 "${aiEscapeHtml(s.name)}"을(를) 삭제할까요?`);
                dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
                    async () => {
                        await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-del?name=${encodeURIComponent(s.name)}`);
                        schedRefresh();
                    },
                    () => {},
                ], ["Delete", "Cancel"]);
                dlg.Open();
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
                                <input class="form-check-input" type="checkbox" id="sched-clear" ${existing?.clear ? 'checked' : ''}>
                                <label class="form-check-label small text-secondary" for="sched-clear">Clear</label>
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
            const clear  = (container.querySelector<HTMLInputElement>('#sched-clear')!).checked;
            const mcp    = (container.querySelector<HTMLInputElement>('#sched-mcp')!).checked;
            const mdcopy = (container.querySelector<HTMLInputElement>('#sched-mdcopy')!).checked;
            if (!name || !tkey || !command) { CAlert.E('Name, terminal key, and command are required'); return; }

            const params = new URLSearchParams({ name, terminalKey: tkey, mode: selectedMode, command,
                clear: clear ? '1' : '0', mcp: mcp ? '1' : '0', mdcopy: mdcopy ? '1' : '0',
                timeMode: isTimeMode ? '1' : '0' });
            if (cwd) params.set('cwd', cwd);

            if (isTimeMode) {
                const selectedDays = Array.from(dayBtns).filter(b => b.classList.contains('btn-primary')).map(b => Number(b.dataset.day));
                if (selectedDays.length === 0) { CAlert.E('Select at least one day'); return; }
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
                if (delay === 0) { CAlert.E('Delay must be at least 1 second'); return; }
                params.set('delay', String(delay)); params.set('count', String(count));
                params.set('start', String(start)); params.set('end', String(end));
                params.set('days', ''); params.set('hour', '0'); params.set('minute', '0');
            }

            const r = await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-set?${params.toString()}`);
            const j = await r.json();
            if (!j.ok) { CAlert.E(j.msg || 'Failed'); return; }
            modal.Close();
            schedRefresh();
        };

        container.querySelector<HTMLButtonElement>('#sched-modal-save')!.addEventListener('click', doSave);
        container.querySelector<HTMLButtonElement>('#sched-modal-cancel')!.addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}

CDOM.ID('sched-new-btn').addEventListener('click', () => schedOpenModal());

// 옵션 패널이 항상 열려있지 않아도 최신 목록을 유지하도록 첫 로딩 시 + 5초 주기로 갱신한다.
schedRefresh();
setInterval(schedRefresh, 5000);














