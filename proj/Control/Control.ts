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
gPF.mVersion = "mrn9vafi_5";

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
import { CMDViewer, CORMViewer } from "../../artgine/util/CModalUtil.js";
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
    CLan.Set(ko, "ctrl.kb.f3", "<kbd>F3</kbd> 새 터미널 열기");
    CLan.Set(ko, "ctrl.kb.f4", "<kbd>F4</kbd> 사이드바 포커스/토글");
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
document.getElementById('aiOpencodeStatusBtn')?.addEventListener('click', () => showOpencodeStatusModal());
// 아티젠 DB(db/artgine.sqlite)를 CORMRouter(/ORM/Exec) 경유로 읽어 보여주는 읽기 전용 ORM 뷰어.
// RDP로 원격 서버를 보는 중이면 그 서버의 DB를, 아니면 로컬 DB를 연다(currentRemoteBaseUrl 기준).
document.getElementById('sqliteViewerBtn')?.addEventListener('click', () => {
    const token = currentRemoteBaseUrl ? getAuthToken(currentRemoteBaseUrl) : '';
    new CORMViewer(undefined, 'sqlite', 'db/artgine.sqlite', currentRemoteBaseUrl, token).Open(CModal.ePos.Center);
});

// 임의의 DB(mysql/mssql/sqlite/ne)에 접속해 보여주는 범용 ORM 뷰어. dbType/database를 비워 넘기면
// CORMViewer가 연결 정보 입력 폼을 먼저 띄운다.
document.getElementById('dbViewerBtn')?.addEventListener('click', () => {
    const token = currentRemoteBaseUrl ? getAuthToken(currentRemoteBaseUrl) : '';
    new CORMViewer(undefined, undefined, undefined, currentRemoteBaseUrl, token).Open(CModal.ePos.Center);
});

// claude/codex/opencode/antigravity/grok이 로컬에 남기는 대화 세션 저장소에서 N개월보다 오래된 것을
// 지운다(이 컴퓨터의 모든 프로젝트 대상 — /AIInfo/prune-conversations 참조).
document.getElementById('pruneConvBtn')?.addEventListener('click', () => {
    const input = document.getElementById('pruneConvMonths') as HTMLInputElement | null;
    const result = document.getElementById('pruneConvResult');
    const months = Math.max(1, parseInt(input?.value ?? '1', 10) || 1);

    const dlg = new CConfirm();
    dlg.SetBody(`Delete all conversation history older than ${months} month(s)? This applies to every project on this machine and cannot be undone.`);
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        async () => {
            if (result) result.innerHTML = '<i class="bi bi-hourglass-split"></i> Deleting...';
            try {
                const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/prune-conversations', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ months }),
                });
                const j = await r.json();
                if (!j.ok) throw new Error(j.msg ?? 'failed');
                const lines = Object.entries(j.results as Record<string, { installed: boolean; deleted: number; error?: string }>)
                    .map(([provider, v]) => v.installed
                        ? `${aiEscapeHtml(provider)}: ${v.deleted}${v.error ? ` <span class="text-danger">(${aiEscapeHtml(v.error)})</span>` : ''}`
                        : `${aiEscapeHtml(provider)}: <span class="text-secondary">not installed</span>`)
                    .join('<br>');
                if (result) result.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> Total ${j.totalDeleted} deleted</span><div class="mt-1">${lines}</div>`;
            } catch (e: any) {
                if (result) result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(e?.message ?? String(e))}</span>`;
            }
        },
        () => {},
    ], ["Delete", "Cancel"]);
    dlg.Open();
});

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
                const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/opencode-pushLocal', {
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

// opencode.json에 등록해둔(Add OpenCode Model로 추가한) 커스텀 provider들의 실제 연결 상태를 조회해 테이블로 보여준다.
// 서버가 각 provider의 baseURL에 직접 접속해 판단하므로(/AIInfo/opencode-statusLocal), 가장 중요한 정보인
// "연결됨/끊김"을 배지로 강조하고, 그 외 현재 로드된 모델·VRAM(가능한 경우)을 함께 보여준다.
function showOpencodeStatusModal() {
    const modal = new CModal();
    modal.SetHeader('OpenCode Provider Status');
    modal.SetBody(`
        <div class="d-flex justify-content-end mb-2">
            <button id="opencodeStatusRefreshBtn" class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
                <i class="bi bi-arrow-clockwise"></i><span>Refresh</span>
            </button>
        </div>
        <div id="opencodeStatusBody" class="small"><i class="bi bi-hourglass-split"></i> Loading...</div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(680, 420);
    modal.Open(CModal.ePos.Center);

    const load = async () => {
        const body = document.getElementById('opencodeStatusBody');
        const refreshBtn = document.getElementById('opencodeStatusRefreshBtn') as HTMLButtonElement | null;
        if (!body) return;
        if (refreshBtn) refreshBtn.disabled = true;
        body.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
        try {
            const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/opencode-statusLocal');
            if (r.status === 401) { body.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle"></i> Login required</span>'; return; }
            const j = await r.json();
            const providers: { key: string; label: string; backend: string; host: string; connected: boolean; error?: string; modelCount: number; running: { name: string; vramBytes?: number; sizeBytes?: number }[] }[] = j.providers ?? [];
            if (!providers.length) {
                body.innerHTML = '<span class="text-secondary">No registered OpenCode providers yet. Use "Add OpenCode Model" first.</span>';
                return;
            }
            body.innerHTML = `
                <table class="table table-sm table-borderless align-middle mb-0">
                    <thead>
                        <tr class="text-secondary" style="font-size:0.8em;">
                            <th>Connection</th><th>Provider</th><th>Host</th><th>Models</th><th>Running</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${providers.map(p => `
                            <tr>
                                <td>${p.connected
                                    ? '<span class="badge bg-success"><i class="bi bi-check-circle-fill"></i> Connected</span>'
                                    : `<span class="badge bg-danger" title="${aiEscapeHtml(p.error ?? '')}"><i class="bi bi-x-circle-fill"></i> Disconnected</span>`}</td>
                                <td>${aiEscapeHtml(p.label)}<div class="text-secondary" style="font-size:0.75em;">${aiEscapeHtml(p.backend)}</div></td>
                                <td class="text-secondary">${aiEscapeHtml(p.host)}</td>
                                <td>${p.modelCount}</td>
                                <td>${p.running.length
                                    ? p.running.map(m => {
                                        const mem: string[] = [];
                                        if (m.vramBytes) mem.push(`${(m.vramBytes / 1e9).toFixed(1)}GB VRAM`);
                                        if (m.sizeBytes) mem.push(`${(m.sizeBytes / 1e9).toFixed(1)}GB total`);
                                        return `${aiEscapeHtml(m.name)}${mem.length ? ` <span class="text-secondary">(${mem.join(', ')})</span>` : ''}`;
                                    }).join('<br>')
                                    : '<span class="text-secondary">-</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (e: any) {
            body.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(e?.message ?? String(e))}</span>`;
        } finally {
            if (refreshBtn) refreshBtn.disabled = false;
        }
    };
    setTimeout(() => {
        document.getElementById('opencodeStatusRefreshBtn')?.addEventListener('click', load);
        load();
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
    // Home.html뿐 아니라 Control.html 등 "/proj/<프로젝트>/<파일>.html" 형태로 끝나는 진입점 URL이면
    // 모두 그 앞부분을 서버 base URL로 인식한다(과거엔 Home.html 마커만 인식해, Control.html 주소를
    // 그대로 넣으면 basePath가 pathname 전체가 되어 RemoteDesktop.html 등의 경로가 그 뒤에 그대로
    // 이어붙는 잘못된 URL이 만들어졌다).
    const m = u.pathname.match(/^(.*)\/proj\/[^\/]+\/[^\/]+\.html$/);
    const basePath = m ? m[1] : u.pathname;
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
// 항목 노드는 만들어진 뒤에도 재사용되므로(renderSessionSidebar의 재조정), 리스너가 생성 시점의 spec을
// 클로저로 붙잡으면 데이터가 굳어버린다(예: 브라우저 세션의 url이 바뀌어도 Share Link는 옛 url을 낸다).
// 그래서 최신 spec을 노드에 얹어두고(_spec) 리스너는 항상 그걸 통해 디스패치한다.
interface SessionItemEl extends HTMLDivElement { _spec: SessionItemSpec; _left?: string; _body?: string; }

// leftHtml/bodyHtml은 갱신 대상이지만 드롭다운은 유지해야 한다(열려 있는 메뉴가 닫히고 Dropdown 인스턴스가
// 새로 생기는 것을 막는다). 그래서 둘을 display:contents 래퍼로 감싸 갱신 슬롯을 만든다.
// display:contents라 래퍼 자신은 레이아웃에 관여하지 않아 기존 flex 배치가 그대로 유지된다.
function createSessionItem(spec: SessionItemSpec): HTMLDivElement {
    const item = document.createElement('div') as SessionItemEl;
    item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
        + (spec.isActive ? ' ' + spec.activeClass : '');
    item.dataset[spec.dataAttr.name] = spec.dataAttr.value;
    item.innerHTML = `
        <span class="sess-left" style="display:contents;">${spec.leftHtml}</span>
        <span class="sess-body" style="display:contents;">${spec.bodyHtml}</span>
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
    item._spec = spec;
    item._left = spec.leftHtml;
    item._body = spec.bodyHtml;
    item.addEventListener('click', (e: Event) => {
        if ((e.target as HTMLElement).closest('.dropdown')) return;
        item._spec.onClick();
    });
    const dropEl = item.querySelector('.dropdown')!;
    new (window as any).bootstrap.Dropdown(dropEl.querySelector('[data-bs-toggle="dropdown"]')!, { popperConfig: { strategy: 'fixed' } });
    item.querySelector<HTMLElement>('[data-act="link"]')!.addEventListener('click', () => item._spec.onShare());
    wirePopupActions(item, () => item._spec.popup.url(), spec.popup.title, spec.popup.winName);
    item.querySelector<HTMLElement>(`[data-act="${spec.deleteAct}"]`)!.addEventListener('click', () => item._spec.onDelete());
    return item;
}

// 이미 있는 노드를 같은 키의 새 spec으로 맞춘다. 실제로 바뀐 슬롯만 건드리므로 클릭·드롭다운·스크롤이
// 유지된다. deleteAct/deleteLabel/popup의 title·winName은 키에 종속(=불변)이라 갱신 대상이 아니다.
function updateSessionItem(el: HTMLDivElement, spec: SessionItemSpec) {
    const item = el as SessionItemEl;
    item._spec = spec;
    if (item._left !== spec.leftHtml) {
        item._left = spec.leftHtml;
        item.querySelector<HTMLElement>('.sess-left')!.innerHTML = spec.leftHtml;
    }
    if (item._body !== spec.bodyHtml) {
        item._body = spec.bodyHtml;
        item.querySelector<HTMLElement>('.sess-body')!.innerHTML = spec.bodyHtml;
    }
    item.classList.toggle(spec.activeClass, spec.isActive);
}

// 노드를 버릴 때 Bootstrap Dropdown 인스턴스를 반드시 정리한다. dispose를 빼먹으면 popper 인스턴스와
// 전역 리스너가 항목 수만큼 계속 쌓인다.
function destroySessionItem(el: HTMLElement) {
    const toggle = el.querySelector('[data-bs-toggle="dropdown"]');
    if (toggle) (window as any).bootstrap.Dropdown.getInstance(toggle)?.dispose();
    el.remove();
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
    // RDP 목록은 이벤트가 있을 때만 다시 그리므로 통째로 만들어도 무방하지만, 버리는 항목의
    // Bootstrap Dropdown은 반드시 정리해야 한다(innerHTML로 지우면 popper 인스턴스가 남는다).
    for (const el of Array.from(rdpSidebarList.children)) destroySessionItem(el as HTMLElement);
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
        ctrlSideFileGoTo('/');
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
    ctrlSideFileGoTo('/');
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

// ---- 우측 사이드바: 빠른 파일 열람(목록만) ----
// File 탭(File.html 전체 매니저)과 별개로, 폴더 이동 + 파일 열기(Editor 탭)만 지원하는 가벼운 목록.
// apiBase/RootPath는 File 탭과 동일한 단일 출처(currentRemoteBaseUrl/ctrlSelectedRootPath)를 쓰므로,
// 왼쪽 상단 루트 선택이나 RDP Local/Remote 전환 시 그 값들을 바꾸는 지점(ctrlRootSel change, ctrlRefreshRootSelect)에서
// ctrlSideFileGoTo('/')를 같이 호출해 목록을 새로고침한다.
interface CtrlSideFileEntry { file: boolean; hidden: boolean; name: string; ext: string }
const ctrlSideFilePathEl = CDOM.ID('ctrlSideFilePath') as HTMLElement;
const ctrlSideFileListEl = CDOM.ID('ctrlSideFileList') as HTMLDivElement;
let ctrlSideFilePath = '/';
let ctrlSideFileRoot = '';
let ctrlSideFileDown = '';
let ctrlSideFileReqSeq = 0;

function ctrlSideFileRenderEmpty(msg: string) {
    ctrlSideFileListEl.innerHTML = `<div class="text-secondary small px-1">${aiEscapeHtml(msg)}</div>`;
}

function ctrlSideFileRenderList(list: CtrlSideFileEntry[]) {
    const visible = list
        .filter(fl => !fl.hidden)
        .sort((a, b) => (a.file === b.file) ? a.name.localeCompare(b.name) : (a.file ? 1 : -1));
    if (!visible.length) { ctrlSideFileRenderEmpty('Empty'); return; }
    ctrlSideFileListEl.innerHTML = '';
    for (const fl of visible) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action py-1 px-2 d-flex align-items-center gap-1';
        const icon = fl.file ? 'bi-file-earmark' : 'bi-folder-fill text-warning';
        item.innerHTML = `<i class="bi ${icon}"></i><span class="text-truncate">${aiEscapeHtml(fl.name)}</span>`;
        // 터미널 탭(iframe)에 드롭하면 그 안의 Terminal.html이 text/plain을 읽어 입력창에 경로를 삽입한다.
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', ctrlSideFileRoot + ctrlSideFilePath + fl.name);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
        });
        item.addEventListener('click', () => {
            if (fl.file) {
                editorOpenFile(
                    ctrlSideFileRoot + ctrlSideFilePath + fl.name,
                    currentRemoteBaseUrl,
                    ctrlSideFileDown + ctrlEncodeUrlPath(ctrlSideFilePath + fl.name),
                );
            } else {
                ctrlSideFileGoTo(ctrlSideFilePath + fl.name + '/');
            }
        });
        ctrlSideFileListEl.appendChild(item);
    }
}

async function ctrlSideFileGoTo(pathVal: string) {
    ctrlSideFilePath = pathVal;
    ctrlSideFilePathEl.textContent = pathVal;
    const seq = ++ctrlSideFileReqSeq;
    ctrlSideFileRenderEmpty('Loading...');
    const apiBase = currentRemoteBaseUrl || CPath.WebRootUrl();
    const rootPathParam = ctrlSelectedRootPath || undefined;
    try {
        const token = currentRemoteBaseUrl ? getAuthToken(currentRemoteBaseUrl) : '';
        const p: any = { path: pathVal };
        if (rootPathParam) p.RootPath = rootPathParam;
        if (token) p.token = token;
        const data = await CFecth.Exe(apiBase + "File/List", p, "json") as { list: CtrlSideFileEntry[]; RootPath?: string; RootUrl?: string; path?: string };
        if (seq !== ctrlSideFileReqSeq) return;
        if (data.RootPath != null) ctrlSideFileRoot = data.RootPath.replace(/\/+$/, '');
        if (data.RootUrl != null) ctrlSideFileDown = new URL(data.RootUrl, apiBase).href.replace(/\/+$/, '');
        if (data.path != null) { ctrlSideFilePath = data.path; ctrlSideFilePathEl.textContent = data.path; }
        ctrlSideFileRenderList(data.list ?? []);
    } catch (e) {
        if (seq !== ctrlSideFileReqSeq) return;
        ctrlSideFileRenderEmpty('Failed to load');
    }
}

CDOM.ID('ctrlSideFileUpBtn').addEventListener('click', () => {
    if (ctrlSideFilePath === '/' || ctrlSideFilePath === '') return;
    const trimmed = ctrlSideFilePath.replace(/\/+$/, '');
    const parent = trimmed.substring(0, trimmed.lastIndexOf('/') + 1) || '/';
    ctrlSideFileGoTo(parent);
});
CDOM.ID('ctrlSideFileRefreshBtn').addEventListener('click', () => ctrlSideFileGoTo(ctrlSideFilePath));

ctrlSideFileGoTo('/');

// ---- 전역 단축키 ----
// F1(파일 매니저, File 탭으로 전환 + 파일 탭 iframe에 트리거 메시지 전달)은 화면 크기와 무관하게 항상 동작.
// F2(서치)는 File 탭과 무관하게 Control 페이지 자체에서 검색 모달만 띄운다(탭 전환/iframe 메시지 없음).
// F3는 Terminal 탭 버튼 클릭과 동일하게 New Terminal 모달만 띄운다(탭 전환은 termStartNew 이후 Open을 눌러야 일어남).
function runControlHotkey(key: string): boolean {
    switch (key) {
        case 'F1':
            (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('file-tab')).show();
            if (fileIframe?.contentWindow) CIframeMsg.Send(fileIframe.contentWindow, 'trigger-file-btn', {});
            return true;
        case 'F2':
            ctrlFileSearch();
            return true;
        case 'F3':
            if (!ctrlRequireAuthed()) return true;
            termStartNew('cmd', ctrlSelectedRootPath || undefined);
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
// F4 키: 한 번 누르면 좌측 메뉴 사이드바로 포커스(오버레이 모드면 먼저 연다), 이미 사이드바에 포커스가
// 가 있는 상태에서 한 번 더 누르면 지금 보고 있는 액티브 iframe으로 포커스를 돌려준다(Home.ts의
// Tab 키=toggleSidebar()+focusActiveFrame() 조합과 동일한 패턴).
// - 오버레이 모드(작은 화면): data-bs-backdrop="false"라 바깥 클릭으로 안 닫히므로, F4 자체가 열고/닫는
//   유일한 수단이다. "포커스 위치"로 판단하면 한번 열린 뒤 닫을 방법이 없어져 꼬이므로, 예전처럼 매번
//   순수 토글(열림<->닫힘)로 처리하고 여는 순간만 사이드바로, 닫는 순간엔 액티브 iframe으로 포커스를 보낸다.
// - 도킹 모드(큰 화면): 사이드바가 항상 보이므로 open/close 대신 "포커스가 지금 사이드바 안에 있는가"로
//   1차/2차 누름을 구분한다.
function runControlF4Key() {
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
                if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') {
                    e.preventDefault();
                    runControlHotkey(e.key);
                    return;
                }
                if (e.key === 'F4') {
                    e.preventDefault();
                    runControlF4Key();
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
    if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') {
        e.preventDefault();
        runControlHotkey(e.key);
        return;
    }
    if (e.key === 'F4' || e.key === 'F6') {
        // F6은 Chat/Terminal iframe 안에서는 Terminal.html이 자체 keydown으로 잡아 SUPER 토글로 쓴다.
        // 여기(document 레벨)는 포커스가 iframe 밖 Control 페이지 자체에 있을 때만 걸리므로,
        // 그 경우엔 F4와 동일하게 사이드바 포커스 토글로 처리한다.
        e.preventDefault();
        runControlF4Key();
        return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (runControlArrowKey(e.key === 'ArrowUp' ? -1 : 1)) e.preventDefault();
    }
});
// File.ts/Memo.ts는 자체 keydown에서 F1/F2/F3/F4/F7을 잡아 'home-hotkey'로 부모에 위임한다(Home.ts와 동일 패턴).
// Control.ts는 F1/F2/F3/F4만 지원하므로(F7은 무시) runControlHotkey가 알 수 없는 키는 그냥 무시된다.
CIframeMsg.Recv({
    'home-hotkey': (data) => {
        const key = String(data.key ?? '');
        if (key === 'F4') runControlF4Key();
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
        promptSourceAction(String(data.path ?? ''), String(data.baseUrl ?? ''), String(data.url ?? ''));
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
    // 핸드오프 완료: 요약을 넘겨받은 새 프로바이더 세션으로 화면을 전환한다(기존 세션은 서버가 이미 종료함).
    // 새 세션은 아직 pending(웹소켓이 붙어야 스폰)이라 /cmd/sessions 목록에 없으므로, termConnectSession의
    // 'term:<token>' 키를 쓰면 곧 실행되는 termRenderList 정리 로직이 목록에 없는 그 프레임을 지워버린다.
    // termStartNew와 동일하게 'term-new:' 접두어 키로 열어(정리 대상 제외) 스폰 후 실제 토큰으로 승격되게 한다.
    'terminal-handoff': (data) => {
        const newToken = String(data.newToken ?? '');
        if (!newToken) return;
        termActivatePane();
        showTermFrame(`term-new:${newToken}:${Date.now()}`, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${newToken}`);
        termRenderList();
        setTimeout(termRenderList, 1500);
        setTimeout(termRenderList, 4000);
    },
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

// ---- 로그 탭: provider(CLI)별 대화 로그를 세션 아코디언으로 보여준다 (CProviderLog/cmd/log-* 기반) ----
interface LogSessionEntry { name: string; offset: number; model: string; firstText: string; cwd: string; time: number; }
interface LogRecord { id: number; key: string; provider: string; sessionId: string; cwd: string; model: string; role: string; text: string; createdAt: number; }

const logAccordionList = CDOM.ID('logAccordionList') as HTMLDivElement;
const logLoadMoreBtn = CDOM.ID('logLoadMoreBtn') as HTMLButtonElement;
let logNextBefore: number | null = null;

// createdAt은 CProviderLog.Stamp()가 만든 YYYYMMDDHHmmss 정수 — 화면 표시용으로만 문자열 분해.
function logFormatTime(stamp: number): string {
    const s = String(stamp);
    if (s.length < 14) return s;
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
}

async function logLoadSessionBody(sessionId: string, bodyEl: HTMLElement) {
    try {
        const r = await authedFetch(`${CPath.WebRootUrl()}cmd/log-session?sessionId=${encodeURIComponent(sessionId)}`);
        const j = await r.json();
        if (!j.ok) { bodyEl.innerHTML = `<span class="text-danger small">${aiEscapeHtml(j.msg ?? 'failed')}</span>`; return; }
        const records: LogRecord[] = j.records ?? [];
        if (!records.length) { bodyEl.innerHTML = '<span class="text-secondary small">No messages.</span>'; return; }
        bodyEl.innerHTML = records.map(rec => {
            const isUser = rec.role === 'user';
            return `<div class="d-flex ${isUser ? 'justify-content-end' : 'justify-content-start'}">` +
                `<div class="p-2 rounded ${isUser ? 'bg-primary text-white' : 'bg-secondary-subtle'}" style="max-width:85%;">` +
                `<div style="font-size:0.68em;opacity:0.75;">${aiEscapeHtml(rec.provider)} &middot; ${logFormatTime(rec.createdAt)}</div>` +
                `<div style="white-space:pre-wrap;word-break:break-word;">${aiEscapeHtml(rec.text.trim())}</div>` +
                `</div></div>`;
        }).join('');
    } catch (e: any) {
        bodyEl.innerHTML = `<span class="text-danger small">${aiEscapeHtml(e?.message ?? String(e))}</span>`;
    }
}

// 세션 하나 = 아코디언 항목 하나. 클릭 시 최초 1회만 대화 전체를 지연 로드한다.
function logCreateAccordionItem(entry: LogSessionEntry): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'border rounded';
    item.dataset.sessionId = entry.name;
    const bodyId = `logBody_${entry.offset}`;
    const preview = entry.firstText.replace(/\s+/g, ' ').trim();
    item.innerHTML = `
        <div class="d-flex align-items-center gap-2 p-2 bg-body-tertiary rounded" style="cursor:pointer;" data-act="toggle">
            <i class="bi bi-chevron-right log-chevron flex-shrink-0"></i>
            <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex align-items-center gap-2">
                    <span class="badge text-bg-secondary flex-shrink-0">${aiEscapeHtml(entry.model || '?')}</span>
                    <span class="text-truncate small">${aiEscapeHtml(preview)}</span>
                </div>
                <div class="text-truncate text-secondary" style="font-size:0.72em;">
                    <i class="bi bi-folder2"></i> ${aiEscapeHtml(entry.cwd || '-')} &middot; ${logFormatTime(entry.time)}
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-link text-danger p-0 flex-shrink-0" data-act="del" title="Delete"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="collapse" id="${bodyId}">
            <div class="p-2 border-top d-flex flex-column gap-2" style="max-height:400px;overflow-y:auto;" data-role="body">
                <div class="text-secondary small"><i class="bi bi-hourglass-split"></i> Loading...</div>
            </div>
        </div>
    `;
    let loaded = false;
    const toggleHeader = item.querySelector<HTMLElement>('[data-act="toggle"]')!;
    const collapseEl = item.querySelector<HTMLElement>(`#${bodyId}`)!;
    const chevron = item.querySelector<HTMLElement>('.log-chevron')!;
    const bsCollapse = new (window as any).bootstrap.Collapse(collapseEl, { toggle: false });
    collapseEl.addEventListener('show.bs.collapse', () => { chevron.className = 'bi bi-chevron-down log-chevron'; });
    collapseEl.addEventListener('hide.bs.collapse', () => { chevron.className = 'bi bi-chevron-right log-chevron'; });
    toggleHeader.addEventListener('click', () => {
        bsCollapse.toggle();
        if (loaded) return;
        loaded = true;
        logLoadSessionBody(entry.name, item.querySelector<HTMLElement>('[data-role="body"]')!);
    });
    item.querySelector<HTMLElement>('[data-act="del"]')!.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const dlg = new CConfirm();
        dlg.SetBody(`세션 "${aiEscapeHtml(entry.name)}"의 로그를 전부 삭제할까요?`);
        dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
            async () => {
                await authedFetch(`${CPath.WebRootUrl()}cmd/log-session-del?sessionId=${encodeURIComponent(entry.name)}`);
                bsCollapse.dispose();
                item.remove();
            },
            () => {},
        ], ["Delete", "Cancel"]);
        dlg.Open();
    });
    return item;
}

async function logLoadSessions(reset: boolean) {
    if (reset) { logAccordionList.innerHTML = ''; logNextBefore = null; }
    try {
        const url = `${CPath.WebRootUrl()}cmd/log-sessions` + (logNextBefore ? `?before=${logNextBefore}` : '');
        const r = await authedFetch(url);
        const j = await r.json();
        if (!j.ok) return;
        const sessions: LogSessionEntry[] = j.sessions ?? [];
        for (const s of sessions) logAccordionList.appendChild(logCreateAccordionItem(s));
        logNextBefore = sessions.length ? sessions[sessions.length - 1].offset : logNextBefore;
        logLoadMoreBtn.style.display = sessions.length >= 30 ? '' : 'none';
    } catch (e) { console.error('logLoadSessions error:', e); }
}

CDOM.ID('log-tab').addEventListener('shown.bs.tab', () => logLoadSessions(true));
if (CDOM.ID('log-panel').classList.contains('active')) { logLoadSessions(true); }
CDOM.ID('logRefreshBtn').addEventListener('click', () => logLoadSessions(true));
logLoadMoreBtn.addEventListener('click', () => logLoadSessions(false));

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
                if (pw === "artgine") {
                    CAlert.Warning("You are using the default password. Please change it for security.");
                }
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

// 로컬 서버 인증 여부를 확인하고, 인증 안 됐으면 경고 메시지를 띄운다(File 탭 제외 다른 탭 전환 가드용).
function ctrlRequireAuthed(): boolean {
    if (getAuthToken(CPath.WebRootUrl())) return true;
    CAlert.Warning("Authentication required. Please sign in first.");
    return false;
}
// File 탭을 제외한 나머지 탭은 인증 전에는 전환되지 않도록 막는다. 트리거 방식(직접 클릭/사이드바
// 클릭으로 인한 프로그램적 Tab.show() 호출)에 상관없이 'show.bs.tab'은 실제 전환 직전에 공통으로
// 발생하므로 여기서 preventDefault()하면 그 뒤의 shown.bs.tab 기반 초기화(패널 로드 등)도 함께 막힌다.
['rdp-panel-tab', 'chat-panel-tab', 'browser-panel-tab', 'editor-panel-tab', 'term-tab', 'memo-tab', 'download-tab', 'log-tab'].forEach((tabId) => {
    CDOM.ID(tabId).addEventListener('show.bs.tab', (e: Event) => {
        if (!ctrlRequireAuthed()) e.preventDefault();
    });
});

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

// 재정렬만 얼린다. 예전에는 "호버 중에는 렌더 자체를 통째로 스킵"했는데, 그러면 마우스를 올려둔 동안
// 점 색/시간/active까지 전부 멈추고(터치는 mouseleave가 안 와서 영구 정지) 그걸 메우려고 예외 패치를
// 또 만들어야 했다. 클릭이 깨지는 원인은 "갱신"이 아니라 "누르는 순간 항목이 움직이는 것"뿐이므로,
// 포인터가 목록 위에 있거나 드롭다운이 열려 있는 동안에는 순서만 고정하고 내용 갱신은 계속한다.
let sessionOrderFrozen = false;
let frozenSessionOrder: string[] = [];
function freezeSessionOrder(on: boolean) {
    if (sessionOrderFrozen === on) return;
    sessionOrderFrozen = on;
    if (!on) renderSessionSidebar(); // 풀리는 즉시 밀린 정렬을 반영한다.
}
// pointerenter/leave는 마우스·터치·펜을 모두 커버한다(mouseenter와 달리 터치에서 한쪽만 오지 않는다).
sessionSidebarList.addEventListener('pointerenter', () => freezeSessionOrder(true));
sessionSidebarList.addEventListener('pointerleave', () => freezeSessionOrder(false));
// enter는 "경계를 넘을 때"만 오므로, 페이지 로드 시점부터 커서가 이미 목록 위에 있으면 발화하지 않는다.
// 그 상태로 누르면 여전히 mousedown~mouseup 사이에 재정렬이 끼어들 수 있어, 누르는 순간에도 잠근다.
sessionSidebarList.addEventListener('pointerdown', () => freezeSessionOrder(true));

// ---- 완료 알림(Home.html과 동일): 포커스 여부에 따라 브라우저 알림 또는 우측 상단 토스트로 표시 ----
let _activeNotifCallback: (() => void) | null = null;

function _showModalStackMsg(label: string, content?: string, onClick?: () => void) {
    const m = new CModalStackMsg(CModal.ePos.TopRight);
    m.SetBG(Bootstrap.eColor.warning);
    m.SetSize(40, 40);
    const nid = `notif_${Date.now()}`;
    const cursor = onClick ? 'cursor:pointer;' : '';
    const icon = label.startsWith('⚠️') ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill';
    const title = [label, content].filter(Boolean).join(' - ').replace(/"/g, '&quot;');
    m.SetBody(`<div id="${nid}" class="d-flex align-items-center justify-content-center" title="${title}" style="width:40px;height:40px;font-size:1.2rem;${cursor}">
        <i class="bi ${icon}"></i>
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
    m.Close(2);
    setTimeout(() => { if (_activeNotifCallback === onClick) _activeNotifCallback = null; }, 2000);
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

// 통합 목록의 강조는 "지금 센터에 보이는 탭"의 활성 프레임 하나만 켜야 한다(네 유형이 같은 목록을
// 공유하므로 각자 켜면 네 개가 동시에 파래진다). 판정을 여기 한 곳에만 두고 각 항목 spec은 이걸 쓴다.
function activeSessionKey(): string | null {
    if (isPanelShown('chat-panel')) return activeChatFrameKey;
    if (isPanelShown('term-panel')) return activeTermFrameKey;
    if (isPanelShown('browser-panel')) return activeBrowserFrameKey;
    if (isPanelShown('editor-panel')) return activeEditorFrameKey;
    return null;
}

// 렌더는 여러 로더가 각자 끝날 때마다 부르므로(한 주기에 3~4번) rAF로 합류시켜 실제 DOM 작업은 1번만 한다.
let sessionRenderQueued = false;
function renderSessionSidebar() {
    if (sessionRenderQueued) return;
    sessionRenderQueued = true;
    requestAnimationFrame(() => { sessionRenderQueued = false; flushSessionSidebar(); });
}

// 렌더된 항목 노드를 키로 들고 있다가 재사용한다. 지우고 다시 만들지 않는 것이 이 목록의 핵심이다.
const sessionItemEls = new Map<string, HTMLDivElement>();
let sessionSidebarSignedOut = false;

function clearSessionItems() {
    for (const el of sessionItemEls.values()) destroySessionItem(el);
    sessionItemEls.clear();
}

function flushSessionSidebar() {
    // 탭이 숨겨져 있으면 DOM만 건너뛴다. 폴링 자체는 계속 돌아야 한다 —— 완료 알림이 폴링 결과로
    // 발화하고, 하필 탭이 백그라운드일 때가 알림이 가장 필요한 때다.
    if (document.hidden) return;

    // 넷 다 같은 로컬 서버 인증을 공유하므로, 하나라도 로그인이 필요하면 프롬프트 하나만 띄운다.
    if (chatAuthState === 'signin' || termAuthState === 'signin' || browserAuthState === 'signin') {
        if (!sessionSidebarSignedOut) {
            sessionSidebarSignedOut = true;
            clearSessionItems();
            renderSignInPrompt(sessionSidebarList, () => { chatRenderList(); termRenderList(); browserRefreshList(); });
        }
        return;
    }
    if (sessionSidebarSignedOut) { sessionSidebarSignedOut = false; sessionSidebarList.innerHTML = ''; }

    const activeKey = activeSessionKey();
    const entries: { key: string; sortKey: number; spec: SessionItemSpec }[] = [];
    if (lastChatSessions) for (const s of lastChatSessions) entries.push({ key: `chat:${s.sessionId}`, sortKey: s.updatedAt ?? 0, spec: chatItemSpec(s, activeKey) });
    if (lastTermSessions) for (const s of lastTermSessions) entries.push({ key: `term:${s.token}`, sortKey: s.updatedAt ?? 0, spec: termItemSpec(s, activeKey) });
    for (const s of browserSessions.values()) entries.push({ key: `browser:${s.sessionId}`, sortKey: s.updatedAt ?? s.createdAt ?? 0, spec: browserItemSpec(s, activeKey) });
    for (const s of editorSessions.values()) entries.push({ key: s.key, sortKey: s.openedAt, spec: editorItemSpec(s, activeKey) });

    entries.sort((a, b) => b.sortKey - a.sortKey);

    // 순서가 얼어 있으면 마지막으로 확정한 순서를 유지한다. 그때 없던 항목은 뒤에 붙여 새 세션이
    // 아예 안 보이는 일은 없게 하고, 정확한 자리는 잠금이 풀릴 때 잡는다.
    // 드롭다운이 열려 있는 동안에도 얼린다(메뉴가 항목을 따라 움직이면 엉뚱한 세션을 지우게 된다).
    // 포인터는 popper가 body로 띄운 메뉴 위에 있어 목록 밖일 수 있으므로 DOM을 직접 확인한다.
    const frozen = sessionOrderFrozen || !!sessionSidebarList.querySelector('.dropdown-menu.show');
    if (frozen) {
        const rank = new Map(frozenSessionOrder.map((k, i) => [k, i]));
        entries.sort((a, b) => (rank.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.key) ?? Number.MAX_SAFE_INTEGER));
    } else {
        frozenSessionOrder = entries.map(e => e.key);
    }

    const live = new Set(entries.map(e => e.key));
    for (const [key, el] of Array.from(sessionItemEls)) {
        if (!live.has(key)) { destroySessionItem(el); sessionItemEls.delete(key); }
    }

    // 목표 순서대로 훑으면서, 그 자리에 없는 노드만 insertBefore로 옮긴다(실제로 움직인 항목만 건드린다).
    let cursor: Element | null = sessionSidebarList.firstElementChild;
    for (const e of entries) {
        let el = sessionItemEls.get(e.key);
        if (!el) { el = createSessionItem(e.spec); sessionItemEls.set(e.key, el); }
        else updateSessionItem(el, e.spec);
        if (el === cursor) cursor = cursor.nextElementSibling;
        else sessionSidebarList.insertBefore(el, cursor);
    }
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
        promptSourceAction(fullPath, '', url);
    } catch (e) {
        console.error('termOpenTappedPath error:', e);
        CAlert.E('경로를 여는 중 오류가 발생했습니다.');
    }
}

function fileExtOf(path: string): string {
    const m = /\.([a-zA-Z0-9]+)$/.exec(path);
    return m ? m[1].toLowerCase() : '';
}

// Execute는 html/md 파일에만 해당한다: html은 새 창에서 실제 렌더링, md는 마크다운 뷰어로 렌더링.
function executeOpenedSource(fullPath: string, url: string) {
    const ext = fileExtOf(fullPath);
    if (ext === 'html' || ext === 'htm') { window.open(url, "_blank"); return; }
    if (ext === 'md') { new CMDViewer(url); return; }
}

// File 탭(file-opened)과 Terminal 탭(terminal-path-tapped)이 공유하는 단일 진입점.
// Edit: Editor.html(Monaco, 자체 저장 지원)로 열기 / Execute: html·md만 실제 실행 / Cancel: 무시.
function promptSourceAction(fullPath: string, baseUrl: string, url: string) {
    const ext = fileExtOf(fullPath);
    const canExecute = ext === 'html' || ext === 'htm' || ext === 'md';
    const actions = [() => editorOpenFile(fullPath, baseUrl, url)];
    const labels = ["Edit"];
    if (canExecute) {
        actions.push(() => executeOpenedSource(fullPath, url));
        labels.push("Execute");
    }
    actions.push(() => {});
    labels.push("Cancel");

    const confirm = new CConfirm();
    confirm.SetBody(`"${aiEscapeHtml(fullPath)}"`);
    confirm.SetConfirm(CConfirm.eConfirm.List, actions, labels);
    confirm.Open();
}

function editorItemSpec(s: IEditorSession, activeKey: string | null): SessionItemSpec {
    const name = s.path.split('/').pop() || s.path;
    return {
        activeClass: 'ai-session-item-active',
        isActive: activeKey === s.key,
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
    };
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

function chatItemSpec(s: { sessionId: string; title: string; updatedAt?: number; busy?: boolean; workingDir?: string }, activeKey: string | null): SessionItemSpec {
    const key = `chat:${s.sessionId}`;
    const rel = chatFormatRelative(s.updatedAt);
    const isLoaded = chatIframePool.has(key);
    const st: 'off' | 'busy' | 'idle' = !isLoaded ? 'off' : s.busy ? 'busy' : 'idle';
    const dot = st === 'off'  ? '<span class="text-danger small" title="미연결">●</span>'
              : st === 'busy' ? '<span class="ai-busy-dot text-warning small" title="처리 중">●</span>'
              :                 '<span class="text-success small" title="대기 중">●</span>';
    return {
        activeClass: 'ai-session-item-active',
        isActive: activeKey === key,
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
    };
}

// 폴링 루프와 이벤트성 갱신(세션 생성 직후 등)이 겹칠 수 있다. 이미 같은 조회가 떠 있으면 건너뛴다
// —— 어차피 떠 있는 쪽이 최신 결과를 가져오고, 겹쳐 두면 늦게 온 응답이 캐시를 되돌린다.
let chatListInFlight = false;
async function chatRenderList() {
    const token = getAuthToken(CPath.WebRootUrl());
    if (!token) {
        chatAuthState = 'signin';
        lastChatSessions = null;
        renderSessionSidebar();
        return;
    }
    if (chatListInFlight) return;
    chatListInFlight = true;
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
    finally { chatListInFlight = false; }
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

function termItemSpec(s: { token: string; mode: string; key?: string; lastMsg: string; updatedAt: number; alive: boolean; busy: boolean; permPending?: boolean; workingDir?: string }, activeKey: string | null): SessionItemSpec {
    const key = `term:${s.token}`;
    const isActive = activeKey === key;
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
    return {
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
    };
}

let termListInFlight = false;
async function termRenderList() {
    if (!getAuthToken(CPath.WebRootUrl())) {
        termAuthState = 'signin';
        lastTermSessions = null;
        renderSessionSidebar();
        return;
    }
    if (termListInFlight) return;
    termListInFlight = true;
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
        // term-new:<token>:<timestamp> 임시 키로 열어둔 프레임을, 서버에 등록된 실제 토큰 키로 승격한다.
        // 키에 생성 시점에 이미 알고 있던 토큰을 심어두고 그 토큰이 실제로 나타났을 때만 정확히 매칭한다.
        // ("가장 최근 세션"으로 추측 매칭하면, 그 사이 존재하던 미접속 세션 — 예: 아직 한 번도 열어보지
        // 않은 서브 에이전트 세션 — 이 새로 만든 세션으로 오인되어 서로 다른 두 세션의 iframe이 뒤바뀐다.)
        for (const newKey of Array.from(termIframePool.keys())) {
            if (!newKey.startsWith('term-new:')) continue;
            const token = newKey.slice('term-new:'.length, newKey.lastIndexOf(':'));
            if (!serverTokens.has(token)) continue;
            const key = `term:${token}`;
            const f = termIframePool.get(newKey)!;
            termIframePool.delete(newKey);
            termIframePool.set(key, f);
            if (activeTermFrameKey === newKey) activeTermFrameKey = key;
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
    finally { termListInFlight = false; }
}

// Terminal 탭 버튼: 클릭(사용자가 직접 누른 경우)하면 항상 New Terminal 모달을 띄운다.
// 사이드바 항목 클릭으로 프로그램적으로 탭을 활성화하는 경우(termActivatePane)는 'click'이 아니라
// bootstrap의 show()이므로 네이티브 click 이벤트가 발생하지 않아 여기서 다시 걸리지 않는다.
function termStartNew(mode: 'cmd' | 'claude' | 'codex' | 'antigravity' | 'opencode' | 'grok' = 'cmd', initialWorkingDir?: string) {
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="mb-3 d-flex gap-2 flex-wrap">
            <button class="term-mode-btn btn btn-sm btn-outline-secondary" style="flex: 1 1 30%;" data-mode="cmd">cmd</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary" style="flex: 1 1 30%;" data-mode="claude">claude</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary" style="flex: 1 1 30%;" data-mode="codex">codex</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary" style="flex: 1 1 30%;" data-mode="antigravity">agy</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary" style="flex: 1 1 30%;" data-mode="opencode">opencode</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary" style="flex: 1 1 30%;" data-mode="grok">grok</button>
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
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader('New Terminal');
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
                showTermFrame(`term-new:${j.token}:${Date.now()}`, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${j.token}`);
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
termTab.addEventListener('click', () => {
    if (!ctrlRequireAuthed()) return;
    termStartNew('cmd', ctrlSelectedRootPath || undefined);
});
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

function browserItemSpec(s: IBrowserSessionData, activeKey: string | null): SessionItemSpec {
    const key = `browser:${s.sessionId}`;
    const isActive = activeKey === key;
    const isLoaded = browserIframePool.has(key);
    const rel = chatFormatRelative(s.updatedAt);
    return {
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
    };
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

let browserListInFlight = false;
async function browserRefreshList() {
    if (!getAuthToken(CPath.WebRootUrl())) {
        browserAuthState = 'signin';
        browserSessions.clear();
        renderSessionSidebar();
        return;
    }
    if (browserListInFlight) return;
    browserListInFlight = true;
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
    finally { browserListInFlight = false; }
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
// setInterval이 아니라 "셋 다 끝난 뒤 5초"로 도는 이유: 응답이 5초를 넘기면 요청이 계속 쌓이고,
// 늦게 온 옛 응답이 새 응답을 덮어써 목록이 과거 상태로 되돌아간다.
async function sessionPollOnce() {
    await Promise.allSettled([chatRenderList(), termRenderList(), browserRefreshList()]);
}
(async function sessionPollLoop() {
    for (;;) {
        await new Promise(r => setTimeout(r, 5000));
        await sessionPollOnce();
    }
})();

// 탭이 숨겨진 동안에는 flushSessionSidebar()가 DOM 작업을 건너뛰므로(폴링은 계속 돈다),
// 다시 보이는 순간 그동안 쌓인 최신 데이터로 한 번 그려준다.
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderSessionSidebar(); });

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

type SchedulerOption = { delay?: number; count?: number; start?: number; end?: number; days?: number[]; hour?: number; minute?: number };
type ScheduleData = { name: string; subAgentKey: string; mode: string; option: SchedulerOption; command: string };

function schedIntervalStr(s: ScheduleData): string {
    if (s.mode === 'time') {
        const hh = String(s.option.hour ?? 0).padStart(2, '0');
        const mm = String(s.option.minute ?? 0).padStart(2, '0');
        return `${hh}:${mm}`;
    }
    const parts: string[] = [`${s.option.delay ?? 0}s`];
    if ((s.option.count ?? 0) > 0) parts.push(`×${s.option.count}`);
    if ((s.option.start ?? 0) > 0) parts.push(`+${s.option.start}s`);
    if ((s.option.end ?? 0) > 0)   parts.push(`~${s.option.end}s`);
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
                    <span class="badge rounded-pill ${s.mode==='time'?'bg-primary':'bg-info'}" style="font-size:0.65rem;">${s.mode}</span>
                    <span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${schedIntervalStr(s)}</span>
                </span>
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    <span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(s.name)}</span>
                    <span class="text-truncate text-secondary" style="font-size:0.7rem;">${aiEscapeHtml(s.subAgentKey)}</span>
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

async function schedOpenModal(existing?: ScheduleData) {
    const isEdit = !!existing;
    let agents: SubAgentData[] = [];
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/agents');
        const j = await r.json();
        if (j.ok) agents = j.agents as SubAgentData[];
    } catch (e) { console.error('schedOpenModal agents fetch error:', e); }

    const container = document.createElement('div');
    container.innerHTML = `
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Name (schedule key)</label>
            <input id="sched-name" type="text" class="form-control form-control-sm" placeholder="e.g. daily-backup" autocomplete="off" value="${aiEscapeHtml(existing?.name || '')}">
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Sub Agent</label>
            <select id="sched-agent" class="form-select form-select-sm">
                ${agents.map(a => `<option value="${aiEscapeHtml(a.key)}" ${existing?.subAgentKey === a.key ? 'selected' : ''}>${aiEscapeHtml(a.key)}</option>`).join('') || '<option value="">(등록된 서브 에이전트 없음)</option>'}
            </select>
        </div>
        <div class="mb-2">
            <div class="d-flex gap-1 mb-2">
                <button id="sched-tab-interval" type="button" class="btn btn-sm flex-fill ${existing?.mode!=='time' ? 'btn-primary' : 'btn-outline-secondary'}">Interval</button>
                <button id="sched-tab-time"     type="button" class="btn btn-sm flex-fill ${existing?.mode==='time'  ? 'btn-primary' : 'btn-outline-secondary'}">Time</button>
            </div>
            <div id="sched-panel-interval" style="display:${existing?.mode!=='time' ? '' : 'none'}">
                <div class="d-flex gap-2 mb-2">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Delay (sec)</label>
                        <input id="sched-delay" type="number" min="1" class="form-control form-control-sm" placeholder="e.g. 60" value="${existing?.option.delay ?? 60}">
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Count (0=infinite)</label>
                        <input id="sched-count" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.option.count ?? 0}">
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Start offset (sec, 0=now)</label>
                        <input id="sched-start" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.option.start ?? 0}">
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">End offset (sec, 0=never)</label>
                        <input id="sched-end" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.option.end ?? 0}">
                    </div>
                </div>
            </div>
            <div id="sched-panel-time" style="display:${existing?.mode==='time' ? '' : 'none'}">
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">Days of Week</label>
                    <div class="d-flex gap-1 flex-wrap">
                        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((lbl,i) => `<button type="button" class="sched-day-btn btn btn-sm ${(existing?.option.days ?? []).includes(i) ? 'btn-primary' : 'btn-outline-secondary'}" data-day="${i}">${lbl}</button>`).join('')}
                    </div>
                </div>
                <div class="d-flex gap-2 align-items-end">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Hour (0–23)</label>
                        <select id="sched-hour" class="form-select form-select-sm">
                            ${Array.from({length:24},(_,h)=>`<option value="${h}" ${(existing?.option.hour??9)===h?'selected':''}>${String(h).padStart(2,'0')}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">Minute</label>
                        <select id="sched-minute" class="form-select form-select-sm">
                            ${Array.from({length:12},(_,i)=>i*5).map(m=>`<option value="${m}" ${(existing?.option.minute??0)===m?'selected':''}>${String(m).padStart(2,'0')}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Command</label>
            <textarea id="sched-cmd" class="form-control form-control-sm" rows="3" placeholder="e.g. node backup.js">${aiEscapeHtml(existing?.command || '')}</textarea>
        </div>
        <div class="d-flex justify-content-between">
            <button id="sched-modal-save" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>
            <button id="sched-modal-cancel" class="btn btn-danger ms-2">Cancel</button>
        </div>`;

    const modal = new CModal();
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader(isEdit ? 'Edit Schedule' : 'New Schedule');
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        // 탭 전환
        let isTimeMode = existing?.mode === 'time';
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
            const name        = (container.querySelector<HTMLInputElement>('#sched-name')!).value.trim();
            const subAgentKey = (container.querySelector<HTMLSelectElement>('#sched-agent')!).value.trim();
            const command     = (container.querySelector<HTMLTextAreaElement>('#sched-cmd')!).value.trim();
            if (!name || !subAgentKey || !command) { CAlert.E('Name, sub agent, and command are required'); return; }

            const option: SchedulerOption = {};
            if (isTimeMode) {
                const selectedDays = Array.from(dayBtns).filter(b => b.classList.contains('btn-primary')).map(b => Number(b.dataset.day));
                if (selectedDays.length === 0) { CAlert.E('Select at least one day'); return; }
                option.days = selectedDays;
                option.hour = parseInt((container.querySelector<HTMLSelectElement>('#sched-hour')!).value) || 0;
                option.minute = parseInt((container.querySelector<HTMLSelectElement>('#sched-minute')!).value) || 0;
            } else {
                const delay = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-delay')!).value) || 0);
                if (delay === 0) { CAlert.E('Delay must be at least 1 second'); return; }
                option.delay = delay;
                option.count = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-count')!).value) || 0);
                option.start = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-start')!).value) || 0);
                option.end   = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-end')!).value) || 0);
            }

            const params = new URLSearchParams({ name, subAgentKey, mode: isTimeMode ? 'time' : 'interval', command, option: JSON.stringify(option) });
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

// ---- Sub Agent management (옵션 패널의 Sub Agent 섹션. New 버튼 또는 목록 항목 클릭 시
// CModal로 key/provider/model/score/traits 입력폼을 띄운다. 저장은 key 기준 upsert이므로
// 신규/편집 모두 같은 Save 버튼 하나로 처리한다) ----
type SubAgentData = { key: string; provider: string; model: string; score: number; traits: string[]; workingDir: string; super: number; retryText: string; retryCount: number };

const agentList = CDOM.ID('agentList');

async function agentRefresh() {
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/agents');
        const j = await r.json();
        if (!j.ok) return;
        agentList.innerHTML = '';
        const agents = j.agents as SubAgentData[];
        for (const a of agents) {
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-1 rounded';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    <span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(a.key)}${a.super ? ' <span class="badge bg-warning text-dark" style="font-size:0.6rem;">SUPER</span>' : ''}${a.retryCount > 0 ? ` <span class="badge bg-info text-dark" style="font-size:0.6rem;">RETRY x${a.retryCount}</span>` : ''}</span>
                    <span class="text-truncate text-secondary" style="font-size:0.7rem;">${aiEscapeHtml(a.provider)} / ${aiEscapeHtml(a.model)} · ${a.score}</span>
                    <span class="text-truncate small text-body-secondary" style="font-size:0.7rem;">${aiEscapeHtml(a.workingDir || './')}</span>
                    <span class="text-truncate small text-body-secondary">${aiEscapeHtml(a.traits.join(', '))}</span>
                </span>
                <button class="agent-del-btn btn btn-sm btn-link text-danger p-0" title="삭제"><i class="bi bi-trash"></i></button>
            `;
            item.addEventListener('click', () => agentOpenModal(a));
            item.querySelector('.agent-del-btn')!.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                const dlg = new CConfirm();
                dlg.SetBody(`서브 에이전트 "${aiEscapeHtml(a.key)}"을(를) 삭제할까요?`);
                dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
                    async () => {
                        await authedFetch(`${CPath.WebRootUrl()}cmd/agent-del?key=${encodeURIComponent(a.key)}`);
                        agentRefresh();
                    },
                    () => {},
                ], ["Delete", "Cancel"]);
                dlg.Open();
            });
            item.addEventListener('mouseenter', () => item.classList.add('bg-body-secondary'));
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
            agentList.appendChild(item);
        }
    } catch (e) { console.error('agentRefresh error:', e); }
}

// Provider/Model 셀렉트박스를 채우기 위해 /AIInfo/setting을 조회한다 — Chat.ts(artgine/server/html/Chat.ts)와
// 동일한 소스다: ai/settings.json의 "models" 필드(프로바이더별 {value,label} 목록)를 그대로 쓴다.
// (/AIInfo/provider-state의 models는 항상 빈 배열이라 여긴 쓸 수 없다.)
// 모달을 열 때마다 다시 부르지 않도록 최초 1회만 조회해 캐시해두고 재사용한다(진행 중인 요청은 공유해 중복 호출 방지).
type AgentModelMap = Record<string, { value: string; label: string }[]>;
const AGENT_PROVIDER_IDS: string[] = ['claude', 'codex', 'antigravity', 'opencode', 'grok'];
const AGENT_PROVIDER_LABELS: Record<string, string> = { claude: 'Claude', codex: 'Codex', antigravity: 'Antigravity', opencode: 'OpenCode', grok: 'Grok' };

let gAgentModelsCache: AgentModelMap | null = null;
let gAgentModelsFetching: Promise<AgentModelMap> | null = null;
async function agentFetchModels(): Promise<AgentModelMap> {
    if (gAgentModelsCache) return gAgentModelsCache;
    if (gAgentModelsFetching) return gAgentModelsFetching;
    gAgentModelsFetching = (async () => {
        try {
            const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/setting');
            const setting = await r.json();
            const models: AgentModelMap = setting.models || {};
            gAgentModelsCache = models;
            return models;
        } catch (e) {
            console.error('agentFetchModels error:', e);
            return {};
        } finally {
            gAgentModelsFetching = null;
        }
    })();
    return gAgentModelsFetching;
}

async function agentOpenModal(existing?: SubAgentData) {
    const isEdit = !!existing;
    const modelMap = await agentFetchModels();

    const modelsFor = (providerId: string): { value: string; label: string }[] => modelMap[providerId] ?? [];

    // 기본값: 편집이면 저장된 provider/model, 신규면 첫 번째 provider의 첫 번째 model을 그대로 선택해둔다(빈 값으로 두지 않음).
    const defaultProvider = existing?.provider || AGENT_PROVIDER_IDS[0];
    const defaultModel = existing?.model || modelsFor(defaultProvider)[0]?.value || '';

    const buildModelOptions = (providerId: string, selected: string): string => {
        const models = modelsFor(providerId).slice();
        const values = models.map(m => m.value);
        const sel = selected || models[0]?.value || '';
        if (sel && !values.includes(sel)) models.push({ value: sel, label: sel });
        return models.map(m => `<option value="${aiEscapeHtml(m.value)}" ${m.value === sel ? 'selected' : ''}>${aiEscapeHtml(m.label)}</option>`).join('');
    };

    const container = document.createElement('div');
    container.innerHTML = `
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Key (name)</label>
            <input id="agent-key" type="text" class="form-control form-control-sm" placeholder="e.g. code-reviewer" autocomplete="off" value="${aiEscapeHtml(existing?.key || '')}">
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Provider</label>
            <select id="agent-provider" class="form-select form-select-sm">
                ${AGENT_PROVIDER_IDS.map(id => `<option value="${id}" ${id === defaultProvider ? 'selected' : ''}>${AGENT_PROVIDER_LABELS[id]}</option>`).join('')}
            </select>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Model</label>
            <select id="agent-model" class="form-select form-select-sm">
                ${buildModelOptions(defaultProvider, defaultModel)}
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label small text-secondary mb-1">Traits (one per line)</label>
            <textarea id="agent-traits" class="form-control form-control-sm" rows="5" placeholder="e.g.&#10;fast at reading large codebases&#10;cautious about destructive changes">${aiEscapeHtml((existing?.traits ?? []).join('\n'))}</textarea>
        </div>
        <div class="accordion mb-3" id="agent-options-accordion">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#agent-options-body">Options</button>
                </h2>
                <div id="agent-options-body" class="accordion-collapse collapse" data-bs-parent="#agent-options-accordion">
                    <div class="accordion-body">
                        <div class="mb-2">
                            <label class="form-label small text-secondary mb-1">Working Directory</label>
                            <input id="agent-working-dir" type="text" class="form-control form-control-sm" placeholder="./" autocomplete="off" value="${aiEscapeHtml(existing?.workingDir || './')}">
                        </div>
                        <div class="mb-2">
                            <label class="form-label small text-secondary mb-1">Score</label>
                            <input id="agent-score" type="number" step="any" class="form-control form-control-sm" placeholder="0" value="${existing?.score ?? 0}">
                        </div>
                        <div class="mb-2 form-check">
                            <input class="form-check-input" type="checkbox" id="agent-super" ${existing?.super ? 'checked' : ''}>
                            <label class="form-check-label small text-secondary" for="agent-super">Super</label>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small text-secondary mb-1">Retry Text (auto-repeat instruction while idle)</label>
                            <textarea id="agent-retry-text" class="form-control form-control-sm" rows="2" placeholder="e.g. Review the result once more and improve quality">${aiEscapeHtml(existing?.retryText || '')}</textarea>
                        </div>
                        <div class="mb-0">
                            <label class="form-label small text-secondary mb-1">Retry Count (0 = disabled)</label>
                            <input id="agent-retry-count" type="number" min="0" step="1" class="form-control form-control-sm" placeholder="0" value="${existing?.retryCount ?? 0}">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="d-flex justify-content-between">
            <button id="agent-modal-save" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>
            <button id="agent-modal-cancel" class="btn btn-danger ms-2">Cancel</button>
        </div>`;

    const modal = new CModal();
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader(isEdit ? 'Edit Sub Agent' : 'New Sub Agent');
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const keyInput = container.querySelector<HTMLInputElement>('#agent-key')!;
        const providerSelect = container.querySelector<HTMLSelectElement>('#agent-provider')!;
        const modelSelect = container.querySelector<HTMLSelectElement>('#agent-model')!;
        keyInput.focus();

        // provider를 바꾸면 그 provider의 모델 목록으로 model 셀렉트를 다시 채운다(첫 번째 모델을 기본 선택).
        providerSelect.addEventListener('change', () => {
            modelSelect.innerHTML = buildModelOptions(providerSelect.value, '');
        });

        const doSave = async () => {
            const key = keyInput.value.trim();
            if (!key) { CAlert.E('Key is required'); return; }
            const workingDir = (container.querySelector<HTMLInputElement>('#agent-working-dir')!).value.trim() || './';
            const superChecked = (container.querySelector<HTMLInputElement>('#agent-super')!).checked;
            const params = new URLSearchParams({
                key,
                provider: providerSelect.value,
                model: modelSelect.value,
                score: String(Number((container.querySelector<HTMLInputElement>('#agent-score')!).value) || 0),
                traits: (container.querySelector<HTMLTextAreaElement>('#agent-traits')!).value,
                workingDir,
                super: superChecked ? '1' : '0',
                retryText: (container.querySelector<HTMLTextAreaElement>('#agent-retry-text')!).value.trim(),
                retryCount: String(Math.max(0, Number((container.querySelector<HTMLInputElement>('#agent-retry-count')!).value) || 0)),
            });
            const r = await authedFetch(`${CPath.WebRootUrl()}cmd/agent-set?${params.toString()}`);
            const j = await r.json();
            if (!j.ok) { CAlert.E(j.msg || 'Failed'); return; }
            modal.Close();
            agentRefresh();
        };

        container.querySelector<HTMLButtonElement>('#agent-modal-save')!.addEventListener('click', doSave);
        container.querySelector<HTMLButtonElement>('#agent-modal-cancel')!.addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}

CDOM.ID('agent-new-btn').addEventListener('click', () => agentOpenModal());

agentRefresh();
setInterval(agentRefresh, 5000);

// ---- Team (상단 Team 탭 = New Team 버튼. term-tab과 동일하게 클릭하면 탭 전환 없이 모달만 뜬다) ----
// 팀 = "감독 프롬프트가 미리 입력된 터미널 세션 1개". 그래서 전용 엔드포인트 없이 New Terminal과 같은
// cmd/start-term을 쓰고(랜덤 팀키 + initialPrompt), 화면도 Terminal 패널을 그대로 쓴다.
// 메인은 직접 작업하지 않고 work_order로 서브 에이전트에게 발주·대기·취합만 반복한다.
// 메인 키는 sub_agent에 등록되지 않으므로 자동 재생성(_ensureSubAgentSessions) 대상도, 워크오더 배분
// (_dispatchWorkOrders) 대상도 아니다 - 자기가 낸 발주를 자기가 받는 일이 구조적으로 없다.

async function teamOpenModal() {
    const modelMap = await agentFetchModels();
    const modelsFor = (providerId: string): { value: string; label: string }[] => modelMap[providerId] ?? [];

    // 메인이 쓸 provider/model. 서브는 sub_agent에 이미 자기 provider/model을 갖고 있어 고르기만 하면 된다.
    const defaultProvider = AGENT_PROVIDER_IDS[0];
    const buildModelOptions = (providerId: string, selected: string): string => {
        const models = modelsFor(providerId).slice();
        const sel = selected || models[0]?.value || '';
        if (sel && !models.some(m => m.value === sel)) models.push({ value: sel, label: sel });
        return models.map(m => `<option value="${aiEscapeHtml(m.value)}" ${m.value === sel ? 'selected' : ''}>${aiEscapeHtml(m.label)}</option>`).join('');
    };

    let agents: SubAgentData[] = [];
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/agents');
        const j = await r.json();
        if (j.ok) agents = j.agents as SubAgentData[];
    } catch { /* 목록을 못 받아도 모달은 뜬다(아래에서 안내 문구로 대체) */ }

    const container = document.createElement('div');
    container.innerHTML = `
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Provider (main)</label>
            <select id="team-provider" class="form-select form-select-sm">
                ${AGENT_PROVIDER_IDS.map(id => `<option value="${id}" ${id === defaultProvider ? 'selected' : ''}>${AGENT_PROVIDER_LABELS[id]}</option>`).join('')}
            </select>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Model (main)</label>
            <select id="team-model" class="form-select form-select-sm">${buildModelOptions(defaultProvider, '')}</select>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Goal</label>
            <textarea id="team-goal" class="form-control form-control-sm" rows="3" placeholder="e.g. Analyze the text files in the xx folder and summarize them into an md file"></textarea>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Sub Agents</label>
            <div id="team-agents" class="border rounded p-2" style="max-height:140px;overflow-y:auto;">
                ${agents.length === 0
                    ? `<div class="text-secondary small">No sub agents registered. Register one first in the right sidebar → Sub Agent.</div>`
                    : agents.map(a => `
                        <div class="form-check">
                            <input class="form-check-input team-agent-check" type="checkbox" value="${aiEscapeHtml(a.key)}" id="team-agent-${aiEscapeHtml(a.key)}" checked>
                            <label class="form-check-label small" for="team-agent-${aiEscapeHtml(a.key)}">
                                ${aiEscapeHtml(a.key)}
                                <span class="text-secondary">${aiEscapeHtml(a.provider)} / ${aiEscapeHtml(a.model)} · ${a.score}</span>
                            </label>
                        </div>`).join('')}
            </div>
        </div>
        <hr class="my-3">
        <div class="mb-3">
            <label class="form-label small text-secondary mb-1">Stop — time limit (min, 0 = unlimited)</label>
            <input id="team-limit-min" type="number" min="0" step="1" class="form-control form-control-sm" value="60">
            <div class="form-text" style="font-size:0.7rem;">If any task fails, the whole team stops immediately regardless of time.</div>
        </div>
        <div class="d-flex justify-content-between">
            <button id="team-modal-create" class="btn btn-primary">Create</button>
            <button id="team-modal-cancel" class="btn btn-danger ms-2">Cancel</button>
        </div>`;

    const modal = new CModal();
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader('New Team');
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const providerSelect = container.querySelector<HTMLSelectElement>('#team-provider')!;
        const modelSelect    = container.querySelector<HTMLSelectElement>('#team-model')!;
        const goalInput      = container.querySelector<HTMLTextAreaElement>('#team-goal')!;
        const createBtn      = container.querySelector<HTMLButtonElement>('#team-modal-create')!;
        const cancelBtn      = container.querySelector<HTMLButtonElement>('#team-modal-cancel')!;
        goalInput.focus();

        providerSelect.addEventListener('change', () => {
            modelSelect.innerHTML = buildModelOptions(providerSelect.value, '');
        });

        let creating = false;
        const doCreate = async () => {
            if (creating) return;
            const goal = goalInput.value.trim();
            if (!goal) { CAlert.E('Enter a goal'); return; }
            const subAgents = Array.from(container.querySelectorAll<HTMLInputElement>('.team-agent-check'))
                .filter(c => c.checked).map(c => c.value);
            if (subAgents.length === 0) { CAlert.E('Select at least one sub agent'); return; }

            creating = true;
            createBtn.disabled = true; cancelBtn.disabled = true;
            const origHtml = createBtn.innerHTML;
            createBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Creating...`;
            try {
                // 팀키 생성·감독 지시문 조립·워크오더 발주는 전부 서버(onStartTeam)가 한다.
                const params = new URLSearchParams({
                    provider: providerSelect.value,
                    model: modelSelect.value,
                    goal,
                    subAgents: subAgents.join(','),
                    limitMin: String(Number((container.querySelector<HTMLInputElement>('#team-limit-min')!).value) || 0),
                });
                const r = await authedFetch(`${CPath.WebRootUrl()}cmd/start-team?${params.toString()}`);
                const j = await r.json();
                if (!j.ok) { CAlert.E(j.msg || 'Failed to start team'); return; }
                modal.Close();
                // New Terminal과 동일 — 메인 터미널을 Terminal 패널에 띄운다.
                termActivatePane();
                showTermFrame(`term-new:${j.token}:${Date.now()}`, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${j.token}`);
                termRenderList();
                setTimeout(termRenderList, 1500);
                setTimeout(termRenderList, 4000);
            } catch (e) {
                console.error('[Team] start-team error:', e);
                CAlert.E('Failed to start team');
            } finally {
                creating = false;
                createBtn.disabled = false; cancelBtn.disabled = false;
                createBtn.innerHTML = origHtml;
            }
        };

        createBtn.addEventListener('click', doCreate);
        cancelBtn.addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}

CDOM.ID('team-tab').addEventListener('click', () => teamOpenModal());
























