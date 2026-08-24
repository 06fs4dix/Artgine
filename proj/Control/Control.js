import "../../artgine/artgine.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { MountMessengerTab } from "./Messenger/MessengerTab.js";
CClass.Push(MountMessengerTab);
import { MountScheduleTab } from "./Schedule/ScheduleTab.js";
CClass.Push(MountScheduleTab);
import { CPreferences } from "../../artgine/basic/CPreferences.js";
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
gPF.mCanvas = "";
gPF.mServer = 'webServer';
gPF.mGitHub = false;
gPF.mVersion = "mschkcx4_2";
import { CAtelier } from "../../artgine/app/CAtelier.js";
import { CPlugin } from "../../artgine/util/CPlugin.js";
CPlugin.PushPath('ControlMedia', '../../plugin/ControlMedia/');
import "../../plugin/ControlMedia/ControlMediaClient.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CDOM } from "../../artgine/basic/CDOM.js";
import { CPath } from "../../artgine/basic/CPath.js";
import { CModal, CConfirm } from "../../artgine/basic/CModal.js";
import { CORMViewer, CSheetViewer } from "../../artgine/util/CModalUtil.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CFecth } from "../../artgine/network/CFecth.js";
import { CHash } from "../../artgine/basic/CHash.js";
import { getAuthToken, setAuthToken, removeAuthToken, authLogin, checkAuthed } from "../../artgine/server/CAuthToken.js";
import { CIframeMsg } from "../../artgine/server/html/CIframeMsg.js";
import { CModalStackMsg } from "../../artgine/util/CModalUtil.js";
import { CUtilWeb } from "../../artgine/util/CUtilWeb.js";
import { Bootstrap } from "../../artgine/basic/Bootstrap.js";
import { CLan } from "../../artgine/basic/CLan.js";
import { CStorage } from "../../artgine/system/CStorage.js";
import { CFile } from "../../artgine/system/CFile.js";
import { CUtil } from "../../artgine/basic/CUtil.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { marked } from "../../artgine/external/esnext/md/marked.esm.js";
marked.setOptions({ gfm: true, breaks: true });
const appSidebar = document.getElementById('app-sidebar');
const sidebarToggleBtnWrap = document.getElementById('sidebarToggleBtnWrap');
const mainContainer = document.querySelector('.container');
const appSidebarRight = document.getElementById('app-sidebar-right');
const sidebarToggleBtnWrapRight = document.getElementById('sidebarToggleBtnWrapRight');
const SIDEBAR_WIDTH = 310;
const SIDEBAR_WIDTH_RIGHT = 300;
const CONTENT_MAX = 1200;
const CONTENT_MIN_FOR_LEFT = 720;
const SIDEBAR_BOTH_MIN = CONTENT_MAX + 325 + 325;
const SIDEBAR_LEFT_MIN = SIDEBAR_WIDTH + CONTENT_MIN_FOR_LEFT;
function updateSidebarMode() {
    if (!mainContainer)
        return;
    const w = window.innerWidth;
    let leftDock = false;
    let rightDock = false;
    let layout = 'none';
    if (w >= SIDEBAR_BOTH_MIN) {
        leftDock = true;
        rightDock = true;
        layout = 'both';
    }
    else if (w >= SIDEBAR_LEFT_MIN) {
        leftDock = true;
        rightDock = false;
        layout = 'left';
    }
    document.body.classList.toggle('sidebar-layout-both', layout === 'both');
    document.body.classList.toggle('sidebar-layout-left', layout === 'left');
    document.body.classList.toggle('sidebar-layout-none', layout === 'none');
    if (appSidebar) {
        appSidebar.classList.toggle('sidebar-docked', leftDock);
        if (sidebarToggleBtnWrap)
            sidebarToggleBtnWrap.style.display = leftDock ? 'none' : '';
    }
    if (appSidebarRight) {
        appSidebarRight.classList.toggle('sidebar-docked', rightDock);
        if (sidebarToggleBtnWrapRight)
            sidebarToggleBtnWrapRight.style.display = rightDock ? 'none' : '';
    }
}
updateSidebarMode();
window.addEventListener('resize', updateSidebarMode);
const THEME_STORAGE_KEY = 'artgine-control-theme';
const themeSelect = document.getElementById('theme-select');
function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) ?? 'dark';
if (themeSelect)
    themeSelect.value = savedTheme;
applyTheme(savedTheme);
themeSelect?.addEventListener('change', () => applyTheme(themeSelect.value));
const HIDE_SUBAGENT_LS = 'ctrl.hideSubAgentSessions';
let hideSubAgentSessions = localStorage.getItem(HIDE_SUBAGENT_LS) !== '0';
const hideSubAgentChk = document.getElementById('hideSubAgentSessionsChk');
if (hideSubAgentChk)
    hideSubAgentChk.checked = hideSubAgentSessions;
hideSubAgentChk?.addEventListener('change', () => {
    hideSubAgentSessions = hideSubAgentChk.checked;
    localStorage.setItem(HIDE_SUBAGENT_LS, hideSubAgentSessions ? '1' : '0');
    renderSessionSidebar();
});
const twoFactorSessionSelect = document.getElementById('twoFactorSessionSelect');
const twoFactorMsg = document.getElementById('twoFactorMsg');
async function twoFactorLoadSessions(_selected) {
    if (!twoFactorSessionSelect)
        return;
    try {
        const j = await CFecth.Exe('messenger/list', null, 'json');
        const sessions = j.ok ? (j.sessions ?? []) : [];
        twoFactorSessionSelect.innerHTML = `<option value="0">${L('ctrl.twoFactorDisabled', 'Disabled')}</option>`
            + sessions.map(s => `<option value="${s.id}">${aiEscapeHtml(`${s.platform} - ${s.botName}`)}</option>`).join('');
        twoFactorSessionSelect.value = String(_selected);
    }
    catch { }
}
async function twoFactorLoadConfig() {
    try {
        await ensureLocalAuth();
        const j = await CFecth.Exe('auth/twoFactorConfig', null, 'json');
        if (!j.ok)
            return;
        await twoFactorLoadSessions(j.sessionId ?? 0);
    }
    catch { }
}
async function twoFactorSaveConfig() {
    if (twoFactorMsg)
        twoFactorMsg.textContent = '';
    try {
        const body = { sessionId: Number(twoFactorSessionSelect?.value ?? 0) };
        const j = await CFecth.Exe('auth/twoFactorConfig', body, 'json');
        if (twoFactorMsg)
            twoFactorMsg.textContent = j.ok ? L('ctrl.twoFactorSaved', 'Saved') : (j.msg ?? L('ctrl.serverError', 'Server error'));
    }
    catch {
        if (twoFactorMsg)
            twoFactorMsg.textContent = L('ctrl.serverError', 'Server error');
    }
}
twoFactorSessionSelect?.addEventListener('change', () => twoFactorSaveConfig());
CDOM.ID('right-option-tab').addEventListener('shown.bs.tab', () => twoFactorLoadConfig());
if (CDOM.ID('right-option-panel').classList.contains('active'))
    twoFactorLoadConfig();
function registerControlLan() {
    CLan.Set({
        ko: {
            "ctrl.failed": "실패",
            "ctrl.failedToLoad": "불러오기 실패",
            "ctrl.msg.signInRequired": "로그인이 필요합니다.",
            "ctrl.msg.loginRequired": "로그인이 필요합니다",
            "ctrl.msg.signInOption": "로그인 필요",
            "ctrl.msg.authRequired": "인증이 필요합니다. 먼저 로그인해 주세요.",
            "ctrl.msg.permissionGranted": "권한이 부여되었습니다",
            "ctrl.msg.defaultPassword": "기본 비밀번호를 사용 중입니다. 보안을 위해 변경해 주세요.",
            "ctrl.msg.wrongPassword": "비밀번호가 올바르지 않습니다: {0}",
            "ctrl.msg.serverError": "서버 오류",
            "ctrl.msg.enterAdminPassword": "관리자 비밀번호 입력:",
            "ctrl.msg.deleteFailed": "삭제 실패: {0}",
            "ctrl.msg.cannotOpenUnknownWd": "워킹 디렉토리를 알 수 없어 경로를 열 수 없습니다: {0}",
            "ctrl.msg.cannotOpenNotRoot": "등록된 루트 경로에 없어 열 수 없습니다: {0}",
            "ctrl.msg.openPathError": "경로를 여는 중 오류가 발생했습니다.",
            "ctrl.msg.approvalRequired": "⚠️ {0}: 권한 승인 필요",
            "ctrl.msg.deleteSessionLog": "세션 \"{0}\"의 로그를 전부 삭제할까요?",
            "ctrl.msg.deleteAllLogs": "전체 로그를 삭제할까요? 모든 세션이 삭제되며 되돌릴 수 없습니다.",
            "ctrl.msg.deleteSchedule": "스케줄 \"{0}\"을(를) 삭제할까요?",
            "ctrl.msg.deleteSubAgent": "서브 에이전트 \"{0}\"을(를) 삭제할까요?",
            "ctrl.msg.deleteNamed": "\"{0}\"을(를) 삭제할까요?",
            "ctrl.msg.pruneConfirm": "{0}개월보다 오래된 대화 기록을 모두 삭제할까요? 이 컴퓨터의 모든 프로젝트에 적용되며 되돌릴 수 없습니다.",
            "ctrl.msg.pruneTotal": "총 {0}개 삭제됨",
            "ctrl.msg.notInstalled": "미설치",
            "ctrl.msg.saveFoldersRestart": "워킹 폴더를 저장하고 서버를 지금 재시작할까요?",
            "ctrl.msg.workingFolderSaved": "워킹 폴더가 저장되었습니다. 서버를 재시작합니다.",
            "ctrl.msg.savedReloading": "저장됨. 서버 재시작 중… {0}초 후 새로고침",
            "ctrl.msg.portBlocked": "외부에서 포트에 접근할 수 없는 것 같습니다. 포트 포워딩을 확인해 주세요.",
            "ctrl.msg.checkingLink": "접속 가능한 링크 확인 중...",
            "ctrl.msg.diffFailed": "Diff 실패",
            "ctrl.msg.diffRequestFailed": "Diff 요청 실패",
            "ctrl.msg.failedStartTerm": "터미널 시작 실패",
            "ctrl.msg.failedStartBrowser": "브라우저 시작 실패",
            "ctrl.msg.failedStartTeam": "팀 시작 실패",
            "ctrl.msg.nameAgentCmdRequired": "이름, 서브 에이전트, 명령이 필요합니다",
            "ctrl.msg.selectOneDay": "요일을 하나 이상 선택하세요",
            "ctrl.msg.delayMin1": "간격은 최소 1초여야 합니다",
            "ctrl.msg.keyRequired": "Key가 필요합니다",
            "ctrl.msg.enterGoal": "목표를 입력하세요",
            "ctrl.msg.selectOneSubAgent": "서브 에이전트를 하나 이상 선택하세요",
            "ctrl.msg.noSubAgents": "(등록된 서브 에이전트 없음)",
            "ctrl.msg.noSubAgentsHint": "등록된 서브 에이전트가 없습니다. 먼저 우측 사이드바 → Sub Agent에서 등록하세요.",
            "ctrl.msg.modelsToJson": "{0}: {1}개 모델 → opencode.json",
            "ctrl.msg.ocNoProviders": "등록된 OpenCode provider가 없습니다. 먼저 \"Add OpenCode Model\"을 사용하세요.",
            "ctrl.providerSetting": "프로바이더 설정",
            "ctrl.msg.providerSettingHint": "체크를 해제한 프로바이더는 목록에서 숨겨지고, 상태 갱신 시 조회하지도 않습니다.",
            "ctrl.local": "Local",
            "ctrl.msg.searchScopeFailed": "이 위치는 검색할 수 없습니다(서버에 등록된 워킹 폴더가 아닐 수 있습니다).",
            "ctrl.msg.scanningPath": "검색 중: {0}:{1}",
            "ctrl.msg.cachedScanning": "캐시: {0}건... 검색 중",
            "ctrl.msg.cachedOnly": "캐시: {0}건 (Enter로 전체 검색)",
            "ctrl.msg.stoppedResults": "중지됨. ({0}건)",
            "ctrl.msg.nResults": "{0}건{1}",
            "ctrl.msg.noScopeSelected": "검색할 패스를 하나 이상 선택하세요.",
            "ctrl.msg.noSearchScope": "검색 가능한 경로가 없습니다.",
            "ctrl.ph.sideSearch": "파일 검색 (클릭 시 인덱싱)",
            "ctrl.indexingCount": "인덱싱중... ({0}개)",
            "ctrl.dl.enterUrl": "URL을 입력하세요",
            "ctrl.dl.failedInfo": "정보 조회 실패",
            "ctrl.dl.failedStart": "시작 실패",
            "ctrl.dl.serverError": "서버 오류: {0}",
            "ctrl.dl.serverUnavailable": "서버 응답 없음 - 서버가 제외된 버전일 수 있습니다. 서버 상태를 확인하세요",
        }
    });
}
function L(key, en) {
    return CLan.Get(key, en);
}
function LF(key, en, ...args) {
    let s = CLan.Get(key, en);
    for (let i = 0; i < args.length; i++)
        s = s.split(`{${i}}`).join(String(args[i]));
    return s;
}
function applyLanIn(root) {
    if (!root)
        return;
    root.querySelectorAll('[data-CLan]').forEach(el => {
        const key = el.getAttribute('data-CLan');
        if (!key)
            return;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            const t = CLan.Get(key, el.placeholder);
            if (t != null)
                el.placeholder = t;
        }
        else if (el instanceof HTMLOptionElement) {
            const t = CLan.Get(key, el.text);
            if (t != null)
                el.text = t;
        }
        else {
            const t = CLan.Get(key, el.innerHTML);
            if (t != null)
                el.innerHTML = t;
        }
    });
    root.querySelectorAll('[data-CLan-title]').forEach(el => {
        const key = el.getAttribute('data-CLan-title');
        if (!key)
            return;
        const t = CLan.Get(key, el.title || '');
        if (t != null)
            el.title = t;
    });
}
registerControlLan();
applyLanIn(document.body);
const AI_PROVIDER_HIDDEN_BY_SRC_LS = 'ctrl.aiProviderHiddenBySrc';
const AI_PROVIDER_HIDDEN_LS_LEGACY = 'ctrl.aiProviderHidden';
let aiProviderHiddenBySrc = (() => {
    try {
        const raw = localStorage.getItem(AI_PROVIDER_HIDDEN_BY_SRC_LS);
        if (raw != null) {
            const obj = JSON.parse(raw);
            return new Map(Object.entries(obj).map(([k, v]) => [k, new Set(v)]));
        }
    }
    catch { }
    try {
        const legacy = localStorage.getItem(AI_PROVIDER_HIDDEN_LS_LEGACY);
        if (legacy)
            return new Map([['', new Set(JSON.parse(legacy))]]);
    }
    catch { }
    return new Map();
})();
function aiProviderHiddenSet(sourceKey) {
    return aiProviderHiddenBySrc.get(sourceKey) ?? new Set();
}
function aiProviderSaveHidden() {
    const obj = {};
    for (const [k, v] of aiProviderHiddenBySrc)
        obj[k] = [...v];
    localStorage.setItem(AI_PROVIDER_HIDDEN_BY_SRC_LS, JSON.stringify(obj));
}
function aiProviderSetHidden(sourceKey, providerId, hide) {
    let set = aiProviderHiddenBySrc.get(sourceKey);
    if (!set) {
        set = new Set();
        aiProviderHiddenBySrc.set(sourceKey, set);
    }
    if (hide)
        set.add(providerId);
    else
        set.delete(providerId);
    aiProviderSaveHidden();
}
const AI_PROVIDER_NODE_KEY = '__node__';
const AI_PROVIDER_SERVER_KEY = '__server__';
let aiProviderAll = ['claude', 'codex', 'antigravity', 'opencode', 'grok'];
let currentWebRootUrl = '';
function aiProviderAllSources() {
    return [
        { remoteId: '', baseUrl: CPath.WebRootUrl(), label: L('ctrl.local', 'Local') },
        ...rdpRemotes.map(r => ({ remoteId: r.remoteId, baseUrl: rdpRemoteWebRootUrl(r.entryUrl), label: r.entryUrl })),
    ];
}
async function loadAiProviderStatus() {
    const el = document.getElementById('aiProviderStatus');
    if (!el)
        return;
    const btn = document.getElementById('aiProviderRefreshBtn');
    const icon = btn?.querySelector('i');
    if (btn)
        btn.disabled = true;
    icon?.classList.add('spin');
    const sources = aiProviderAllSources().filter(s => {
        const hidden = aiProviderHiddenSet(s.remoteId);
        return !hidden.has(AI_PROVIDER_NODE_KEY) || !hidden.has(AI_PROVIDER_SERVER_KEY) || aiProviderAll.some(p => !hidden.has(p));
    });
    try {
        const results = await Promise.all(sources.map(async (s) => {
            const hidden = aiProviderHiddenSet(s.remoteId);
            const visible = aiProviderAll.filter(p => !hidden.has(p));
            const query = hidden.size ? `?providers=${encodeURIComponent(visible.join(','))}` : '';
            const wantServer = !hidden.has(AI_PROVIDER_SERVER_KEY);
            try {
                const [r, serverResp] = await Promise.all([
                    fetch(s.baseUrl + 'AIInfo/provider-state' + query),
                    wantServer
                        ? fetch(s.baseUrl + 'AIInfo/server-info').then(r2 => r2.json()).catch(() => null)
                        : Promise.resolve(null),
                ]);
                return { s, resp: await r.json(), server: serverResp, ok: true };
            }
            catch (e) {
                console.error('provider-state error:', s.baseUrl, e);
                return { s, resp: null, server: null, ok: false };
            }
        }));
        el.innerHTML = results.map(({ s, resp, server, ok }) => {
            if (!ok || !resp) {
                return `<div class="rounded px-2 py-1 bg-secondary-subtle" style="font-size:0.8rem;">
                    <span class="fw-semibold ${s.remoteId ? rdpTextColor(s.remoteId) : 'text-primary'}">${aiEscapeHtml(s.label)}</span>
                    <span class="text-secondary ms-1">${L('ctrl.msg.providerStateError', 'unreachable')}</span>
                </div>`;
            }
            if (resp.all?.length)
                aiProviderAll = resp.all;
            const hidden = aiProviderHiddenSet(s.remoteId);
            const providers = (resp.providers ?? []).filter(p => !hidden.has(p.id));
            const node = resp.node;
            let nodeRow = '';
            if (!hidden.has(AI_PROVIDER_NODE_KEY)) {
                const nodeRowClass = node?.installed ? 'bg-success-subtle' : 'bg-secondary-subtle';
                const nodeIcon = node?.installed ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-secondary';
                const nodeStatus = node?.installed ? 'Ready' : 'Not Installed';
                const nodeStatusHtml = node?.installed
                    ? ''
                    : `<button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 ai-node-download-btn"><i class="bi ${nodeIcon}"></i>${nodeStatus}</button>`;
                nodeRow = `<div class="d-flex align-items-center justify-content-between rounded px-2 py-1 ${nodeRowClass}" style="font-size:0.8rem;">
                        <span class="fw-semibold">Node.js</span>
                        ${nodeStatusHtml}
                    </div>`;
            }
            let serverRow = '';
            if (!hidden.has(AI_PROVIDER_SERVER_KEY) && server?.ok) {
                const loadColorHtml = (v, text) => v >= 80 ? `<span class="fw-semibold text-danger">${text}</span>`
                    : v >= 50 ? `<span class="fw-semibold" style="color:#fd7e14;">${text}</span>`
                        : `<span class="fw-semibold text-success">${text}</span>`;
                const loadBadge = (label, v) => `<span class="text-secondary">${label}</span> ${loadColorHtml(v, v + '%')}`;
                serverRow = `<div class="d-flex align-items-center gap-2 rounded px-2 py-1 bg-body-secondary" style="font-size:0.75em;">${loadBadge('CPU', server.cpu.percent)}<span class="text-secondary">·</span>${loadBadge('RAM', server.memory.percent)}</div>`;
            }
            const providerRows = providers.map(p => {
                const rowClass = !p.installed ? 'bg-secondary-subtle' : p.authenticated ? 'bg-success-subtle' : 'bg-warning-subtle';
                const pIcon = !p.installed ? 'bi-x-circle text-secondary' : p.authenticated ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle-fill text-warning';
                const status = !p.installed ? 'Not Installed' : p.authenticated ? 'Ready' : 'Not Authenticated';
                const statusHtml = !p.installed
                    ? `<button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 ai-provider-launch-btn" data-provider="${p.id}" data-remote="${aiEscapeHtml(s.remoteId)}"><i class="bi ${pIcon}"></i>${status}</button>`
                    : p.authenticated ? '' : `<span class="d-flex align-items-center gap-1"><i class="bi ${pIcon}"></i>${status}</span>`;
                const pct = (v) => Math.round(v * 100);
                const usageColorHtml = (v, text) => v <= 20 ? `<span class="fw-semibold text-danger">${text}</span>`
                    : v <= 50 ? `<span class="fw-semibold" style="color:#fd7e14;">${text}</span>`
                        : `<span class="fw-semibold text-success">${text}</span>`;
                const usageBadge = (label, v) => `<span class="text-secondary">${label}</span> ${v == null ? '<span class="fw-semibold text-secondary">?</span>' : usageColorHtml(v, v + '%')}`;
                const usageParts = [];
                const showUsage = p.authenticated && p.usage;
                if (showUsage) {
                    const fh = p.usage.fiveHour;
                    const wk = p.usage.weekly;
                    if (fh >= 0)
                        usageParts.push(usageBadge('5h', pct(fh)));
                    if (wk >= 0)
                        usageParts.push(usageBadge('7d', pct(wk)));
                    if (fh < 0 && wk < 0) {
                        usageParts.push(usageBadge('5h', null));
                        usageParts.push(usageBadge('7d', null));
                    }
                }
                const usageHtml = usageParts.length
                    ? `<span class="ms-2" style="font-size:0.75em;">${usageParts.join(' <span class="text-secondary">·</span> ')}</span>`
                    : '';
                return `<div class="d-flex align-items-center justify-content-between rounded px-2 py-1 ${rowClass}" style="font-size:0.8rem;">
                    <span class="fw-semibold text-capitalize">${p.id}${usageHtml}</span>
                    ${statusHtml}
                </div>`;
            }).join('');
            const header = sources.length > 1
                ? `<div class="small fw-semibold text-truncate ${s.remoteId ? rdpTextColor(s.remoteId) : 'text-primary'}" style="font-size:0.72rem;" title="${aiEscapeHtml(s.baseUrl)}">${aiEscapeHtml(s.label)}</div>`
                : '';
            return `<div class="ai-provider-source d-flex flex-column gap-1 mb-1">${header}${serverRow}${nodeRow}${providerRows}</div>`;
        }).join('');
        el.querySelectorAll('.ai-node-download-btn').forEach(b => {
            b.addEventListener('click', () => window.open('https://nodejs.org/en/download', '_blank'));
        });
        el.querySelectorAll('.ai-provider-launch-btn').forEach(b => {
            b.addEventListener('click', () => termStartNew(b.dataset.provider, undefined, b.dataset.remote || ''));
        });
        const timeEl = document.getElementById('aiProviderStatusTime');
        if (timeEl) {
            const now = new Date();
            const pad2 = (n) => String(n).padStart(2, '0');
            timeEl.textContent = `(${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())})`;
        }
    }
    catch (e) {
        console.error('provider-state error:', e);
    }
    finally {
        if (btn)
            btn.disabled = false;
        icon?.classList.remove('spin');
    }
}
setTimeout(() => loadAiProviderStatus(), 0);
setInterval(() => loadAiProviderStatus(), 5 * 60 * 1000);
document.getElementById('aiProviderRefreshBtn')?.addEventListener('click', () => loadAiProviderStatus());
document.getElementById('aiProviderSettingBtn')?.addEventListener('click', () => showProviderVisibilityModal());
function showProviderVisibilityModal() {
    const uid = `provVis_${Date.now()}`;
    const modal = new CModal();
    modal.SetHeader(L('ctrl.providerSetting', 'Provider Settings'));
    const groups = aiProviderAllSources().map(s => {
        const hidden = aiProviderHiddenSet(s.remoteId);
        const serverRow = `
            <label class="d-flex align-items-center gap-2 px-2 py-1 rounded border ms-3">
                <input type="checkbox" class="form-check-input mt-0 ${uid}_chk" data-remote="${aiEscapeHtml(s.remoteId)}" data-provider="${AI_PROVIDER_SERVER_KEY}" ${hidden.has(AI_PROVIDER_SERVER_KEY) ? '' : 'checked'}>
                <span>Server (CPU/RAM/NET)</span>
            </label>`;
        const nodeRow = `
            <label class="d-flex align-items-center gap-2 px-2 py-1 rounded border ms-3">
                <input type="checkbox" class="form-check-input mt-0 ${uid}_chk" data-remote="${aiEscapeHtml(s.remoteId)}" data-provider="${AI_PROVIDER_NODE_KEY}" ${hidden.has(AI_PROVIDER_NODE_KEY) ? '' : 'checked'}>
                <span>Node.js</span>
            </label>`;
        const rows = serverRow + nodeRow + aiProviderAll.map(p => `
            <label class="d-flex align-items-center gap-2 px-2 py-1 rounded border ms-3">
                <input type="checkbox" class="form-check-input mt-0 ${uid}_chk" data-remote="${aiEscapeHtml(s.remoteId)}" data-provider="${aiEscapeHtml(p)}" ${hidden.has(p) ? '' : 'checked'}>
                <span class="text-capitalize">${aiEscapeHtml(p)}</span>
            </label>`).join('');
        return `
        <div class="mb-3">
            <div class="fw-semibold small text-truncate ${s.remoteId ? rdpTextColor(s.remoteId) : 'text-primary'}" title="${aiEscapeHtml(s.baseUrl)}">${aiEscapeHtml(s.label)}</div>
            <div class="d-flex flex-column gap-1 mt-1">${rows}</div>
        </div>`;
    }).join('');
    modal.SetBody(`
        <div class="small text-secondary mb-2">${L('ctrl.msg.providerSettingHint', 'Uncheck a provider to hide it for that server. A server with none checked is hidden entirely and skipped on refresh.')}</div>
        ${groups}
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(360, 480);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        document.querySelectorAll(`.${uid}_chk`).forEach(chk => {
            chk.addEventListener('change', () => {
                aiProviderSetHidden(chk.dataset.remote ?? '', chk.dataset.provider ?? '', !chk.checked);
                loadAiProviderStatus();
            });
        });
    }, MODAL_DOM_DELAY);
}
document.getElementById('aiAddOllamaBtn')?.addEventListener('click', () => showAddOllamaModal());
document.getElementById('aiOpencodeStatusBtn')?.addEventListener('click', () => showOpencodeStatusModal());
document.getElementById('agentAddFolderBtn')?.addEventListener('click', () => showWorkFolderModal());
document.getElementById('sqliteViewerBtn')?.addEventListener('click', () => {
    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
    new CORMViewer(undefined, 'sqlite', 'db/artgine.sqlite', currentWebRootUrl, token).Open(CModal.ePos.Center);
});
document.getElementById('dbViewerBtn')?.addEventListener('click', () => {
    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
    new CORMViewer(undefined, undefined, undefined, currentWebRootUrl, token).Open(CModal.ePos.Center);
});
document.getElementById('pruneConvBtn')?.addEventListener('click', () => {
    const input = document.getElementById('pruneConvMonths');
    const result = document.getElementById('pruneConvResult');
    const months = Math.max(1, parseInt(input?.value ?? '1', 10) || 1);
    const dlg = new CConfirm();
    dlg.SetBody(LF('ctrl.msg.pruneConfirm', 'Delete all conversation history older than {0} month(s)? This applies to every project on this machine and cannot be undone.', months));
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        async () => {
            if (result)
                result.innerHTML = `<i class="bi bi-hourglass-split"></i> ${L('ctrl.deleting', 'Deleting...')}`;
            try {
                const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/prune-conversations', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ months }),
                });
                const j = await r.json();
                if (!j.ok)
                    throw new Error(j.msg ?? L('ctrl.failed', 'failed'));
                const lines = Object.entries(j.results)
                    .map(([provider, v]) => v.installed
                    ? `${aiEscapeHtml(provider)}: ${v.deleted}${v.error ? ` <span class="text-danger">(${aiEscapeHtml(v.error)})</span>` : ''}`
                    : `${aiEscapeHtml(provider)}: <span class="text-secondary">${L('ctrl.msg.notInstalled', 'not installed')}</span>`)
                    .join('<br>');
                if (result)
                    result.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${LF('ctrl.msg.pruneTotal', 'Total {0} deleted', j.totalDeleted)}</span><div class="mt-1">${lines}</div>`;
            }
            catch (e) {
                if (result)
                    result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(e?.message ?? String(e))}</span>`;
            }
        },
        () => { },
    ], [L('ctrl.delete', 'Delete'), L('ctrl.cancel', 'Cancel')]);
    dlg.Open();
});
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
        const input = document.getElementById(uid);
        const keyInput = document.getElementById(`${uid}_key`);
        const goBtn = document.getElementById(`${uid}_go`);
        const result = document.getElementById(`${uid}_result`);
        input?.focus();
        const submit = async () => {
            const host = (input?.value ?? '').trim();
            const apiKey = (keyInput?.value ?? '').trim();
            if (!host) {
                input?.focus();
                return;
            }
            if (goBtn)
                goBtn.disabled = true;
            if (result)
                result.innerHTML = '<span class="text-secondary"><i class="bi bi-hourglass-split"></i> …</span>';
            try {
                const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/opencode-pushLocal', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(apiKey ? { host, apiKey } : { host }),
                });
                const j = await r.json();
                if (!j.ok) {
                    if (result) {
                        const msg = r.status === 401 ? L('ctrl.msg.loginRequired', 'Login required') : (j.msg || L('ctrl.failed', 'Failed'));
                        result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(msg)}</span>`;
                    }
                    return;
                }
                const models = j.models ?? [];
                const list = models.map(m => `${aiEscapeHtml(m.name)}${m.tools ? ' <span class="badge bg-success">tools</span>' : ''}`).join(', ');
                if (result)
                    result.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${aiEscapeHtml(j.provider)} — ${models.length} models</span><div class="text-secondary mt-1">${list}</div>`;
                CAlert.Info(LF('ctrl.msg.modelsToJson', '{0}: {1} models → opencode.json', j.provider, models.length));
            }
            catch (e) {
                if (result)
                    result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(e?.message ?? String(e))}</span>`;
            }
            finally {
                if (goBtn)
                    goBtn.disabled = false;
            }
        };
        goBtn?.addEventListener('click', submit);
        const onEnter = (e) => { if (e.key === 'Enter') {
            e.preventDefault();
            submit();
        } };
        input?.addEventListener('keydown', onEnter);
        keyInput?.addEventListener('keydown', onEnter);
    }, MODAL_DOM_DELAY);
}
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
        const refreshBtn = document.getElementById('opencodeStatusRefreshBtn');
        if (!body)
            return;
        if (refreshBtn)
            refreshBtn.disabled = true;
        body.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
        try {
            const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/opencode-statusLocal');
            if (r.status === 401) {
                body.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${L('ctrl.msg.loginRequired', 'Login required')}</span>`;
                return;
            }
            const j = await r.json();
            const providers = j.providers ?? [];
            if (!providers.length) {
                body.innerHTML = `<span class="text-secondary">${L('ctrl.msg.ocNoProviders', 'No registered OpenCode providers yet. Use "Add OpenCode Model" first.')}</span>`;
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
                    const mem = [];
                    if (m.vramBytes)
                        mem.push(`${(m.vramBytes / 1e9).toFixed(1)}GB VRAM`);
                    if (m.sizeBytes)
                        mem.push(`${(m.sizeBytes / 1e9).toFixed(1)}GB total`);
                    return `${aiEscapeHtml(m.name)}${mem.length ? ` <span class="text-secondary">(${mem.join(', ')})</span>` : ''}`;
                }).join('<br>')
                : '<span class="text-secondary">-</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        catch (e) {
            body.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(e?.message ?? String(e))}</span>`;
        }
        finally {
            if (refreshBtn)
                refreshBtn.disabled = false;
        }
    };
    setTimeout(() => {
        document.getElementById('opencodeStatusRefreshBtn')?.addEventListener('click', load);
        load();
    }, MODAL_DOM_DELAY);
}
const RESTART_RELOAD_SEC = 10;
function scheduleReloadAfterRestart(_el) {
    let left = RESTART_RELOAD_SEC;
    const tick = () => {
        if (left <= 0) {
            location.reload();
            return;
        }
        if (_el)
            _el.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${LF('ctrl.msg.savedReloading', 'Saved. Server is restarting… reloading in {0}s', left)}</span>`;
        left--;
        setTimeout(tick, 1000);
    };
    tick();
}
function showWorkFolderModal() {
    const uid = `workfolder_${Date.now()}`;
    const modal = new CModal();
    modal.SetHeader('Working Folder');
    modal.SetBody(`
        <div class="small text-secondary mb-2">
            <p class="mb-1">Server working folders, served as <code>/Root0</code>, <code>/Root1</code> … (one per line).</p>
            <p class="mb-1">A git URL (e.g. <code>https://github.com/owner/repo</code>) or svn URL (e.g. <code>svn://host/repo</code>, <code>https://host/svn/repo</code>) is also accepted — after restart it's auto-downloaded into <code>git/&lt;repo&gt;</code> / <code>svn/&lt;repo&gt;</code> and the entry is replaced with that local path.</p>
            <p class="mb-0">Saving writes to <code>Env.json</code> and <strong>restarts the server</strong> to re-register the routes.</p>
        </div>
        <textarea id="${uid}" class="form-control form-control-sm" rows="10" placeholder="./&#10;D:/Work&#10;https://github.com/owner/repo&#10;svn://host/repo" spellcheck="false"></textarea>
        <div class="d-flex justify-content-end mt-2">
            <button id="${uid}_save" class="btn btn-primary btn-sm">Save &amp; Restart</button>
        </div>
        <div id="${uid}_result" class="small mt-2"></div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(560, 480);
    modal.Open(CModal.ePos.Center);
    setTimeout(async () => {
        const ta = document.getElementById(uid);
        const saveBtn = document.getElementById(`${uid}_save`);
        const result = document.getElementById(`${uid}_result`);
        try {
            const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/workfolder');
            if (r.status === 401) {
                if (result)
                    result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${L('ctrl.msg.loginRequired', 'Login required')}</span>`;
            }
            else {
                const j = await r.json();
                if (j.ok && ta)
                    ta.value = (j.rootPath ?? []).join('\n');
            }
        }
        catch (e) {
            if (result)
                result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(e?.message ?? String(e))}</span>`;
        }
        const submit = () => {
            const list = (ta?.value ?? '').split('\n').map(s => s.trim()).filter(Boolean);
            if (!list.length) {
                ta?.focus();
                return;
            }
            const dlg = new CConfirm();
            dlg.SetBody(`${L('ctrl.msg.saveFoldersRestart', 'Save working folders and restart the server now?')}<br><br>${list.map(aiEscapeHtml).join('<br>')}`);
            dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
                async () => {
                    if (saveBtn)
                        saveBtn.disabled = true;
                    if (result)
                        result.innerHTML = '<span class="text-secondary"><i class="bi bi-hourglass-split"></i> Saving &amp; restarting…</span>';
                    try {
                        const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/workfolder-set', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ rootPath: list }),
                        });
                        const j = await r.json();
                        if (!j.ok) {
                            const msg = r.status === 401 ? L('ctrl.msg.loginRequired', 'Login required') : (j.msg || L('ctrl.failed', 'Failed'));
                            if (result)
                                result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(msg)}</span>`;
                            if (saveBtn)
                                saveBtn.disabled = false;
                            return;
                        }
                        CAlert.Info(L('ctrl.msg.workingFolderSaved', 'Working folder saved. Server is restarting.'));
                        scheduleReloadAfterRestart(result);
                    }
                    catch (e) {
                        scheduleReloadAfterRestart(result);
                    }
                },
                () => { },
            ], ["Save & Restart", "Cancel"]);
            dlg.Open();
        };
        saveBtn?.addEventListener('click', submit);
    }, MODAL_DOM_DELAY);
}
const MODAL_DOM_DELAY = 100;
function postFrameVisible(f, visible) {
    if (f?.contentWindow)
        CIframeMsg.Send(f.contentWindow, 'frame-visibility', { visible });
}
function rdpRemoteWebRootUrl(input) {
    const u = new URL(input);
    const m = u.pathname.match(/^(.*)\/proj\/[^\/]+\/[^\/]+\.html$/);
    const basePath = m ? m[1] : u.pathname;
    return (u.origin + (basePath || "/")).replace(/\/+$/, '') + '/';
}
function aiEscapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
function openSessionPopup(url, title, newWindow = false, winName = '_blank') {
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
        modal.SetBody(`<div style="position:relative;width:100%;height:100%;">` +
            `<iframe src="${url}" style="width:100%;height:100%;border:none;display:block;"></iframe>` +
            `<div class="modal-iframe-guard" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;z-index:1;"></div>` +
            `</div>`);
        modal.SetSize('80%', '80%');
        modal.Open(CModal.ePos.Center);
        const guard = modal.mBody?.querySelector('.modal-iframe-guard');
        if (guard) {
            document.addEventListener('mousedown', () => { guard.style.display = 'block'; });
            document.addEventListener('mouseup', () => { guard.style.display = 'none'; });
        }
    }
    catch (e) {
        console.error('Session popup error:', e);
    }
}
function showShareLinkModal(header, descHtml, shareUrl) {
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
        const input = document.getElementById(uid);
        const copyBtn = document.getElementById(`${uid}_copy`);
        input?.addEventListener('click', () => input.select());
        copyBtn?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
            }
            catch {
                input?.select();
                document.execCommand('copy');
            }
            copyBtn.innerHTML = '<i class="bi bi-check2"></i>';
            setTimeout(() => { copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>'; }, 1500);
        });
    }, MODAL_DOM_DELAY);
}
const POPUP_MENU_ITEMS = '<li><button class="dropdown-item" data-act="modal"><i class="bi bi-window-stack"></i> Open in Modal</button></li>' +
    '<li><button class="dropdown-item" data-act="window"><i class="bi bi-box-arrow-up-right"></i> Open in New Window</button></li>';
function wirePopupActions(rootEl, getUrl, title, winName) {
    rootEl.querySelector('[data-act="modal"]')?.addEventListener('click', () => openSessionPopup(getUrl(), title, false, winName));
    rootEl.querySelector('[data-act="window"]')?.addEventListener('click', () => openSessionPopup(getUrl(), title, true, winName));
}
function isPanelShown(panelId) {
    return CDOM.ID(panelId).classList.contains('active');
}
function sessionItemDragKey(spec) {
    if (spec.dataAttr.name === 'key')
        return spec.dataAttr.value;
    if (spec.dataAttr.name === 'id')
        return `rdp:remote:${spec.dataAttr.value}`;
    return null;
}
document.addEventListener('dragstart', (e) => {
    if (e.target?.closest?.('.ai-session-item'))
        document.body.classList.add('tmux-dragging');
});
document.addEventListener('dragend', () => document.body.classList.remove('tmux-dragging'));
function createSessionItem(spec) {
    const item = document.createElement('div');
    item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
        + (spec.isActive ? ' ' + spec.activeClass : '');
    if (spec.accentStyle)
        item.style.cssText = spec.accentStyle;
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
                ${spec.onShare ? '<li><button class="dropdown-item" data-act="link">🔗 Share Link</button></li>' : ''}
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item text-danger" data-act="${spec.deleteAct}">${spec.deleteLabel}</button></li>
            </ul>
        </div>
    `;
    item._spec = spec;
    item._left = spec.leftHtml;
    item._body = spec.bodyHtml;
    item.addEventListener('click', (e) => {
        if (e.target.closest('.dropdown'))
            return;
        item._spec.onClick();
    });
    item.draggable = true;
    item.addEventListener('dragstart', (e) => {
        const key = sessionItemDragKey(item._spec);
        if (!key) {
            e.preventDefault();
            return;
        }
        e.dataTransfer?.setData('text/plain', key);
        if (e.dataTransfer)
            e.dataTransfer.effectAllowed = 'copy';
    });
    item.addEventListener('mousedown', (e) => { if (e.button === 1)
        e.preventDefault(); });
    item.addEventListener('auxclick', (e) => {
        if (e.button !== 1)
            return;
        e.preventDefault();
        item._spec.onDelete();
    });
    const dropEl = item.querySelector('.dropdown');
    new window.bootstrap.Dropdown(dropEl.querySelector('[data-bs-toggle="dropdown"]'), { popperConfig: { strategy: 'fixed' } });
    item.querySelector('[data-act="link"]')?.addEventListener('click', () => item._spec.onShare?.());
    wirePopupActions(item, () => item._spec.popup.url(), spec.popup.title, spec.popup.winName);
    item.querySelector(`[data-act="${spec.deleteAct}"]`).addEventListener('click', () => item._spec.onDelete());
    return item;
}
const SESS_ACTIVE_CLASSES = ['ai-session-item-active', 'ai-session-item-active-remote', 'ai-session-item-active-main', 'ai-session-item-active-sub'];
function applySessActiveClasses(el, spec) {
    el.classList.remove(...SESS_ACTIVE_CLASSES);
    if (spec.isActive)
        el.classList.add(spec.activeClass);
}
function updateSessionItem(el, spec) {
    const item = el;
    item._spec = spec;
    if (item._left !== spec.leftHtml) {
        item._left = spec.leftHtml;
        item.querySelector('.sess-left').innerHTML = spec.leftHtml;
    }
    if (item._body !== spec.bodyHtml) {
        item._body = spec.bodyHtml;
        item.querySelector('.sess-body').innerHTML = spec.bodyHtml;
    }
    applySessActiveClasses(item, spec);
    item.style.cssText = spec.accentStyle ?? '';
}
function destroySessionItem(el) {
    const toggle = el.querySelector('[data-bs-toggle="dropdown"]');
    if (toggle)
        window.bootstrap.Dropdown.getInstance(toggle)?.dispose();
    el.remove();
}
const rdpFrameContainer = CDOM.ID("rdp-frame-container");
const rdpFramePlaceholder = CDOM.ID("rdp-frame-placeholder");
const rdpSidebarList = CDOM.ID("rdp-sidebar-list");
const rdpIframePool = new Map();
let activeRdpFrameKey = null;
function updateRdpFramePlaceholder() {
    rdpFramePlaceholder.classList.toggle('rdp-frame-placeholder-hidden', !!activeRdpFrameKey);
}
function isRdpPaneActive() {
    return CDOM.ID('tmux-panel').classList.contains('active') && !!activeRdpFrameKey && tmuxFindPaneIdByKey(activeRdpFrameKey) !== null;
}
function updateRdpFrameVisibility() {
    if (!activeRdpFrameKey)
        return;
    postFrameVisible(rdpIframePool.get(activeRdpFrameKey), isRdpPaneActive());
}
const tmuxIdlePool = document.createElement('div');
tmuxIdlePool.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
document.body.appendChild(tmuxIdlePool);
function showPooledFrame(ctx, key, src) {
    let f = ctx.pool.get(key);
    if (!f) {
        f = document.createElement('iframe');
        f.src = src;
        f.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;border:0;display:none;';
        ctx.onCreate?.(f, key);
        ctx.pool.set(key, f);
        tmuxAllFrames.set(key, f);
        tmuxTreeRoot.appendChild(f);
    }
    const prevKey = ctx.getActiveKey();
    ctx.setActiveKey(key);
    ctx.updatePlaceholder();
    tmuxPlaceFrame(key, f);
    ctx.onActivate?.(key, prevKey);
    syncSidebarTabToFrame(key);
    renderSessionSidebar();
    return f;
}
function syncSidebarTabToFrame(key) {
    const target = /^(chat:|term:|term-new:)/.test(key) ? 'agent'
        : /^(browser:|editor:)/.test(key) ? 'other'
            : null;
    if (target && sbSubTab !== target) {
        sbSubTab = target;
        localStorage.setItem(SB_TAB_LS, target);
        applySidebarSubTab();
    }
}
const rdpFrameCtx = {
    pool: rdpIframePool,
    container: rdpFrameContainer,
    getActiveKey: () => activeRdpFrameKey,
    setActiveKey: (key) => { activeRdpFrameKey = key; },
    updatePlaceholder: updateRdpFramePlaceholder,
    onActivate: (_key, prevKey) => {
        if (prevKey)
            postFrameVisible(rdpIframePool.get(prevKey), false);
        updateRdpFrameVisibility();
    },
};
function showRdpFrame(key, src) {
    return showPooledFrame(rdpFrameCtx, key, src);
}
function activatePaneUnlessMultiplexer(_tabId, _label) {
    tmuxShowPanel();
}
function rdpActivatePane() {
    activatePaneUnlessMultiplexer('rdp-panel-tab', 'RDP');
}
let rdpRemotes = [];
const rdpStatus = new Map();
const RDP_PROBE_TIMEOUT_MS = 5000;
const RDP_STATUS_VIEW = {
    checking: { cls: 'text-secondary', title: L('ctrl.msg.rdpChecking', 'Checking...') },
    online: { cls: 'text-success', title: L('ctrl.msg.rdpConnected', 'Connected') },
    auth: { cls: 'text-success', title: L('ctrl.msg.rdpNeedsAuth', 'Authentication required') },
    offline: { cls: 'text-danger', title: L('ctrl.msg.rdpOffline', 'Not connected') },
};
const RDP_COLOR_NAMES = ['danger', 'warning', 'info', 'dark'];
const rdpColorAssign = new Map();
function rdpColorName(remoteId) {
    let name = rdpColorAssign.get(remoteId);
    if (!name) {
        name = RDP_COLOR_NAMES[Math.min(rdpColorAssign.size, RDP_COLOR_NAMES.length - 1)];
        rdpColorAssign.set(remoteId, name);
    }
    return name;
}
function rdpTextColor(remoteId) {
    return `text-${rdpColorName(remoteId)}`;
}
function rdpAccentStyle(remoteId) {
    const name = rdpColorName(remoteId);
    return `--rdp-accent:var(--bs-${name});--rdp-accent-bg:var(--bs-${name}-bg-subtle);`;
}
async function rdpLoadRemotes() {
    if (!getAuthToken(CPath.WebRootUrl()))
        return;
    let list = [];
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "RemoteDesktop/remotes", {}, "json");
        list = j?.list ?? [];
    }
    catch {
        return;
    }
    const known = new Set(rdpRemotes.map(r => r.remoteId));
    for (const r of list) {
        if (!r?.remoteId || !r?.entryUrl || known.has(r.remoteId))
            continue;
        rdpRemotes.push({ remoteId: r.remoteId, entryUrl: r.entryUrl, saved: true, password: r.password });
    }
    if (!list.length)
        return;
    rdpRenderList();
    rdpRefreshAllStatus();
}
async function rdpSaveRemotes() {
    const list = rdpRemotes.filter(r => r.saved).map(r => ({ remoteId: r.remoteId, entryUrl: r.entryUrl, password: r.password }));
    try {
        await CFecth.Exe(CPath.WebRootUrl() + "RemoteDesktop/remotes-set", { list }, "json");
    }
    catch {
        CAlert.Warning(L('ctrl.msg.rdpSaveFailed', 'Failed to save the remote list.'));
    }
}
async function rdpProbeRemote(entryUrl) {
    let webRootUrl;
    try {
        webRootUrl = rdpRemoteWebRootUrl(entryUrl);
    }
    catch {
        return 'offline';
    }
    const token = getAuthToken(webRootUrl);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), RDP_PROBE_TIMEOUT_MS);
    try {
        const res = await fetch(webRootUrl + 'auth/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(token ? { token } : {}),
            signal: ctrl.signal,
        });
        if (!res.ok)
            return 'auth';
        const j = await res.json().catch(() => null);
        return j?.authed ? 'online' : 'auth';
    }
    catch {
        return 'offline';
    }
    finally {
        clearTimeout(timer);
    }
}
let rdpStatusSeq = 0;
async function rdpRefreshAllStatus() {
    const seq = ++rdpStatusSeq;
    const targets = rdpRemotes.slice();
    if (!targets.length)
        return;
    const results = await Promise.all(targets.map(r => rdpProbeRemote(r.entryUrl)));
    if (seq !== rdpStatusSeq)
        return;
    const prevStatus = new Map(rdpStatus);
    targets.forEach((r, i) => rdpStatus.set(r.remoteId, results[i]));
    rdpRenderList();
    targets.forEach((r, i) => {
        if (results[i] === 'offline' && prevStatus.get(r.remoteId) !== 'offline')
            rdpClearRemoteSessions(r.remoteId);
    });
    if (results.some(st => st === 'offline'))
        rdpEnsureOfflinePolling();
}
let selectedRdpKey = 'rdp:local';
let tmuxTreeReady = false;
function rdpRenderList() {
    for (const el of Array.from(rdpSidebarList.children))
        destroySessionItem(el);
    rdpSidebarList.innerHTML = '';
    const localItem = document.createElement('div');
    localItem.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded';
    localItem.dataset.key = 'rdp:local';
    applySessActiveClasses(localItem, sessActiveFromKey('rdp:local'));
    localItem.innerHTML = `<i class="bi bi-pc-display"></i><span class="flex-grow-1">Local</span>`
        + `<button type="button" class="btn btn-sm btn-link text-secondary p-0" data-act="local-link" title="Show accessible link"><i class="bi bi-link-45deg"></i></button>`;
    localItem.addEventListener('click', () => rdpOpenLocal());
    localItem.querySelector('[data-act="local-link"]').addEventListener('click', (e) => {
        e.stopPropagation();
        rdpShowLocalAccessLink();
    });
    rdpSidebarList.appendChild(localItem);
    rdpRemotes.forEach((r) => {
        const key = `rdp:remote:${r.remoteId}`;
        const st = rdpStatus.get(r.remoteId) ?? 'checking';
        const stv = RDP_STATUS_VIEW[st];
        const item = createSessionItem({
            ...sessActiveFromKey(key),
            dataAttr: { name: 'id', value: r.remoteId },
            leftHtml: `<span class="${stv.cls} small flex-shrink-0" title="${aiEscapeHtml(stv.title)}">●</span>`,
            bodyHtml: `<span class="flex-grow-1 text-truncate small ${rdpTextColor(r.remoteId)}"`
                + (r.saved ? ` title="${aiEscapeHtml(L('ctrl.msg.rdpSaved', 'Saved'))}"` : '')
                + `>${aiEscapeHtml(r.entryUrl)}</span>`,
            deleteAct: 'delete',
            deleteLabel: '🗑️ Delete',
            onClick: () => rdpClickRemote(r.remoteId),
            onShare: () => rdpShowShareLink(r.entryUrl),
            onDelete: () => {
                const wasSaved = !!r.saved;
                rdpRemotes = rdpRemotes.filter(x => x.remoteId !== r.remoteId);
                rdpStatus.delete(r.remoteId);
                if (activeRdpFrameKey === key)
                    activeRdpFrameKey = null;
                if (selectedRdpKey === key)
                    selectedRdpKey = 'rdp:local';
                rdpRenderList();
                if (wasSaved)
                    rdpSaveRemotes();
            },
            popup: { url: () => `${rdpRemoteWebRootUrl(r.entryUrl)}artgine/server/html/RemoteDesktop.html`, title: r.entryUrl, winName: `rdp_${r.remoteId}` },
        });
        rdpSidebarList.appendChild(item);
    });
    const divider = document.createElement('hr');
    divider.className = 'my-2';
    rdpSidebarList.appendChild(divider);
    refreshAllRemoteRoots();
}
let ctrlRootOpts = [];
let ctrlRootReqSeq = 0;
let localRootOpts = [];
const remoteRootsCache = new Map();
let ctrlSelectedRootPath = '';
let ctrlInitRootPathConsumed = false;
const ctrlNormPath = (s) => s.replace(/\\/g, '/').replace(/\/+$/, '');
function ctrlSyncSideFileRootSel() {
    const sel = CDOM.ID('ctrlSideFileRootSel');
    if (!sel)
        return;
    sel.innerHTML = '';
    const addGroup = (label, remoteId, roots) => {
        if (!roots.length)
            return;
        const group = document.createElement('optgroup');
        group.label = label;
        for (const r of roots) {
            const opt = document.createElement('option');
            opt.value = r.path;
            opt.dataset.remoteId = remoteId;
            opt.textContent = r.name || r.path;
            opt.title = r.path;
            group.appendChild(opt);
        }
        sel.appendChild(group);
    };
    addGroup(L('ctrl.local', 'Local'), '', localRootOpts);
    for (const remote of rdpRemotes) {
        const roots = remoteRootsCache.get(remote.remoteId);
        if (roots)
            addGroup(remote.entryUrl, remote.remoteId, roots);
    }
    const activeRemoteId = currentWebRootUrl
        ? (rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === currentWebRootUrl)?.remoteId ?? '')
        : '';
    const options = Array.from(sel.options);
    let match = options.find(o => (o.dataset.remoteId ?? '') === activeRemoteId && ctrlNormPath(o.value) === ctrlNormPath(ctrlSelectedRootPath));
    if (!match)
        match = options.find(o => (o.dataset.remoteId ?? '') === activeRemoteId);
    if (match) {
        sel.selectedIndex = options.indexOf(match);
        ctrlSelectedRootPath = match.value;
    }
    else if (options.length) {
        sel.selectedIndex = 0;
        ctrlSelectedRootPath = options[0].value;
    }
}
function ctrlRenderRootOpts(roots) {
    ctrlRootOpts = roots.map(r => r.name === './' ? { ...r, name: 'Artgine (WorkingPath)' } : r);
    const prev = ctrlSelectedRootPath;
    const prevIdx = prev
        ? ctrlRootOpts.findIndex(r => ctrlNormPath(r.path) === ctrlNormPath(prev))
        : -1;
    let defaultIdx = prevIdx;
    if (defaultIdx < 0)
        defaultIdx = ctrlRootOpts.length > 0 ? 0 : -1;
    if (!ctrlInitRootPathConsumed && ctrlInitRootPath) {
        ctrlInitRootPathConsumed = true;
        const matchIdx = ctrlRootOpts.findIndex(r => ctrlNormPath(r.path) === ctrlNormPath(ctrlInitRootPath));
        if (matchIdx >= 0)
            defaultIdx = matchIdx;
    }
    ctrlSelectedRootPath = ctrlRootOpts[defaultIdx]?.path ?? '';
    ctrlSyncSideFileRootSel();
    renderSessionSidebar();
}
async function ctrlRefreshRootSelect() {
    const baseUrl = currentWebRootUrl;
    const seq = ++ctrlRootReqSeq;
    if (baseUrl) {
        const remote = rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === baseUrl);
        const authed = remote?.password ? await rdpEnsureRemoteAuth(remote) : await rdpCheckRemoteAuth(baseUrl);
        if (!authed) {
            if (seq !== ctrlRootReqSeq)
                return;
            rdpPromptRemoteAuth(baseUrl, () => {
                if (currentWebRootUrl !== baseUrl || seq !== ctrlRootReqSeq)
                    return;
                ctrlRefreshRootSelect();
            });
            return;
        }
    }
    try {
        const token = baseUrl ? getAuthToken(baseUrl) : '';
        const data = await CFecth.Exe((baseUrl || CPath.WebRootUrl()) + "File/Root", token ? { token } : {}, "json");
        if (seq !== ctrlRootReqSeq)
            return;
        ctrlRenderRootOpts(data.roots ?? []);
        ctrlSideFileGoTo('/');
    }
    catch {
    }
}
CDOM.ID('ctrlSideFileRootSel')?.addEventListener('change', () => {
    const sel = CDOM.ID('ctrlSideFileRootSel');
    const opt = sel?.selectedOptions[0];
    if (!opt)
        return;
    const remoteId = opt.dataset.remoteId ?? '';
    const remote = remoteId ? rdpRemotes.find(r => r.remoteId === remoteId) : undefined;
    const nextWeb = remote ? rdpRemoteWebRootUrl(remote.entryUrl) : '';
    const next = opt.value;
    if (ctrlNormPath(next) === ctrlNormPath(ctrlSelectedRootPath) && (currentWebRootUrl || '') === (nextWeb || ''))
        return;
    if ((currentWebRootUrl || '') !== (nextWeb || '')) {
        currentWebRootUrl = nextWeb;
        logOnServerChanged();
    }
    ctrlSelectedRootPath = next;
    ctrlSideSrchStop();
    ctrlSideFileGoTo('/');
});
function rdpOpenLocal() {
    rdpInited = true;
    rdpActivatePane();
    showRdpFrame('rdp:local', `${CPath.WebRootArtgineUrl()}artgine/server/html/RemoteDesktop.html`);
    selectedRdpKey = 'rdp:local';
    rdpRenderList();
    currentWebRootUrl = '';
    if (fileIframe?.contentWindow)
        CIframeMsg.Send(fileIframe.contentWindow, 'connect-remote', { url: '' });
    ctrlRefreshRootSelect();
    logOnServerChanged();
}
async function rdpClickRemote(remoteId) {
    const remote = rdpRemotes.find(r => r.remoteId === remoteId);
    if (!remote)
        return;
    if (rdpStatus.get(remoteId) === 'offline') {
        rdpStatus.set(remoteId, 'checking');
        rdpRenderList();
        const st = await rdpProbeRemote(remote.entryUrl);
        if (!rdpRemotes.some(x => x.remoteId === remoteId))
            return;
        rdpStatus.set(remoteId, st);
        if (st === 'offline') {
            rdpRenderList();
            rdpEnsureOfflinePolling();
            CAlert.Warning(LF('ctrl.msg.rdpStillOffline', 'Cannot reach {0}.', remote.entryUrl));
            return;
        }
    }
    rdpOpenRemote(remoteId);
}
function rdpOpenRemote(remoteId) {
    const remote = rdpRemotes.find(r => r.remoteId === remoteId);
    if (!remote)
        return;
    rdpInited = true;
    rdpActivatePane();
    showRdpFrame(`rdp:remote:${remoteId}`, `${rdpRemoteWebRootUrl(remote.entryUrl)}artgine/server/html/RemoteDesktop.html`);
    selectedRdpKey = `rdp:remote:${remoteId}`;
    rdpRenderList();
    currentWebRootUrl = rdpRemoteWebRootUrl(remote.entryUrl);
    if (fileIframe?.contentWindow)
        CIframeMsg.Send(fileIframe.contentWindow, 'connect-remote', { url: remote.entryUrl });
    ctrlRefreshRootSelect();
    logOnServerChanged();
}
function rdpShowShareLink(remoteUrl) {
    const shareUrl = `${rdpRemoteWebRootUrl(remoteUrl)}artgine/server/html/RemoteDesktop.html`;
    showShareLinkModal('Remote Desktop Share Link', `Anyone with this link can access the remote desktop: <strong>${aiEscapeHtml(remoteUrl)}</strong>`, shareUrl);
}
async function rdpResolveAccessibleUrl() {
    const loc = window.location;
    const isLocalHost = loc.hostname === 'localhost' || loc.hostname === '127.0.0.1' || loc.hostname === '::1';
    if (!isLocalHost)
        return { url: loc.href, blocked: false };
    let publicIp = '';
    try {
        publicIp = (await (await fetch('https://api.ipify.org?format=text')).text()).trim();
    }
    catch (_) {
        return { url: '', blocked: true };
    }
    if (!publicIp)
        return { url: '', blocked: true };
    const port = loc.port ? `:${loc.port}` : '';
    const url = `${loc.protocol}//${publicIp}${port}${loc.pathname}${loc.search}`;
    const reachable = await rdpCheckPortOpen(url);
    return { url, blocked: !reachable };
}
function rdpCheckPortOpen(url, timeoutMs = 4000) {
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
    modal.SetHeader(L('ctrl.hdr.localAccessLink', 'Local Access Link'));
    modal.SetBody(`<div id="${boxId}" class="small text-secondary">${L('ctrl.msg.checkingLink', 'Checking accessible link...')}</div>`);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(480, 160);
    modal.Open(CModal.ePos.Center);
    const { url, blocked } = await rdpResolveAccessibleUrl();
    const box = document.getElementById(boxId);
    if (!box)
        return;
    if (blocked || !url) {
        box.innerHTML = `<div class="text-danger">${L('ctrl.msg.portBlocked', 'Port appears to be blocked from outside access. Please check port forwarding.')}</div>`;
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
    const input = document.getElementById(inputId);
    const copyBtn = document.getElementById(copyId);
    input?.addEventListener('click', () => input.select());
    copyBtn?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(url);
        }
        catch {
            input?.select();
            document.execCommand('copy');
        }
        copyBtn.innerHTML = '<i class="bi bi-check2"></i>';
        setTimeout(() => { copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>'; }, 1500);
    });
}
function rdpAddRemote(entryUrl, save = false, password) {
    const remote = { remoteId: genUuid(), entryUrl, saved: save, password };
    rdpRemotes.unshift(remote);
    rdpRenderList();
    if (save)
        rdpSaveRemotes();
    rdpProbeRemote(entryUrl).then((st) => {
        if (!rdpRemotes.some(x => x.remoteId === remote.remoteId))
            return;
        rdpStatus.set(remote.remoteId, st);
        rdpRenderList();
        if (st === 'offline')
            rdpEnsureOfflinePolling();
    });
}
let rdpInited = false;
CDOM.ID('rdp-panel-tab').addEventListener('shown.bs.tab', () => {
    if (!rdpInited)
        rdpOpenLocal();
    updateRdpFrameVisibility();
});
CDOM.ID('rdp-panel-tab').addEventListener('hidden.bs.tab', () => updateRdpFrameVisibility());
rdpRenderList();
rdpLoadRemotes();
if (CDOM.ID('rdp-panel').classList.contains('active'))
    queueMicrotask(() => rdpOpenLocal());
else
    queueMicrotask(() => ctrlRefreshRootSelect());
function openRdpAddModal() {
    const modal = new CModal();
    modal.SetHeader('Add Remote Desktop');
    modal.SetBody(`
        <div class="d-flex flex-column gap-1">
            <input id="rdpModalUrlInput" type="text" class="form-control form-control-sm" placeholder="Remote Control.html URL">
            <input id="rdpModalPwInput" type="password" class="form-control form-control-sm" placeholder="${L('ctrl.msg.adminPasswordOptional', 'Admin password (optional)')}">
            <div class="form-check">
                <input id="rdpModalSaveChk" class="form-check-input" type="checkbox" checked>
                <label class="form-check-label small" for="rdpModalSaveChk">${L('ctrl.msg.rdpSaveRemote', 'Save this remote (restored on next visit)')}</label>
            </div>
            <div id="rdpModalErr" class="small text-danger" style="display:none;"></div>
            <button id="rdpModalAddBtn" class="btn btn-outline-primary btn-sm align-self-end"><i class="bi bi-plus-lg"></i> Add</button>
        </div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(420, 235);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const input = document.getElementById('rdpModalUrlInput');
        const pwInput = document.getElementById('rdpModalPwInput');
        const errEl = document.getElementById('rdpModalErr');
        const btn = document.getElementById('rdpModalAddBtn');
        input?.focus();
        const saveChk = document.getElementById('rdpModalSaveChk');
        const submit = async () => {
            const url = input?.value.trim();
            if (!url)
                return;
            const pw = pwInput?.value ?? '';
            const save = saveChk?.checked ?? false;
            if (errEl)
                errEl.style.display = 'none';
            if (!pw) {
                rdpAddRemote(url, save);
                modal.Close();
                return;
            }
            let webRootUrl;
            try {
                webRootUrl = rdpRemoteWebRootUrl(url);
            }
            catch {
                if (errEl) {
                    errEl.textContent = L('ctrl.msg.invalidUrl', 'Invalid URL');
                    errEl.style.display = 'block';
                }
                return;
            }
            if (btn)
                btn.disabled = true;
            const password = CHash.SHA256('artgine_' + pw);
            try {
                const j = await authLogin(webRootUrl, password, () => {
                    if (errEl) {
                        errEl.className = 'small text-secondary';
                        errEl.textContent = L('ctrl.msg.waitingTwoFactor', 'Waiting for messenger approval (up to 5 minutes)...');
                        errEl.style.display = 'block';
                    }
                });
                if (errEl)
                    errEl.className = 'small text-danger';
                if (j.ok) {
                    setAuthToken(webRootUrl, j.token);
                    rdpAddRemote(url, save, password);
                    modal.Close();
                }
                else if (errEl) {
                    errEl.textContent = LF('ctrl.msg.wrongPassword', 'Wrong password: {0}', j.msg ?? '');
                    errEl.style.display = 'block';
                }
            }
            catch {
                if (errEl) {
                    errEl.textContent = L('ctrl.msg.serverError', 'Server error');
                    errEl.style.display = 'block';
                }
            }
            finally {
                if (btn)
                    btn.disabled = false;
            }
        };
        btn?.addEventListener('click', submit);
        [input, pwInput].forEach(el => el?.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            submit(); }));
    }, MODAL_DOM_DELAY);
}
CDOM.ID('rdp-add-btn').addEventListener('click', openRdpAddModal);
const filePanel = CDOM.ID("file-panel");
let fileIframe = null;
let fileLoaded = false;
function fileEnsureLayout() {
    if (fileIframe)
        return;
    filePanel.classList.add("position-relative");
    filePanel.style.overflow = "hidden";
    fileIframe = document.createElement("iframe");
    fileIframe.id = "file-iframe";
    fileIframe.style.cssText = "position:absolute; inset:0; width:100%; height:100%; border:none;";
    filePanel.appendChild(fileIframe);
}
const ctrlInitRootPath = CUtilWeb.Parameter("path");
function fileLoadFrame() {
    fileEnsureLayout();
    if (fileLoaded)
        return;
    fileLoaded = true;
    const params = [];
    if (ctrlInitRootPath)
        params.push(`RootPath=${encodeURIComponent(ctrlInitRootPath)}`);
    const ctrlTheme = document.documentElement.getAttribute('data-bs-theme');
    if (ctrlTheme)
        params.push(`theme=${encodeURIComponent(ctrlTheme)}`);
    params.push('editorHost=control');
    const q = params.length ? `?${params.join('&')}` : '';
    fileIframe.src = `${CPath.WebRootArtgineUrl()}artgine/server/html/File.html${q}`;
}
fileLoadFrame();
const helpPanel = CDOM.ID("help-panel");
let helpIframe = null;
function helpLoadFrame() {
    if (helpIframe)
        return;
    helpPanel.classList.add("position-relative");
    helpPanel.style.overflow = "hidden";
    helpIframe = document.createElement("iframe");
    helpIframe.id = "help-iframe";
    helpIframe.style.cssText = "position:absolute; inset:0; width:100%; height:100%; border:none;";
    helpIframe.src = new URL('./artgine-agent.html', import.meta.url).href;
    helpPanel.appendChild(helpIframe);
}
helpLoadFrame();
function helpActivatePane() {
    window.bootstrap.Tab.getOrCreateInstance(CDOM.ID('help-panel-tab')).show();
}
CDOM.ID('help-open-btn').addEventListener('click', () => helpActivatePane());
if (ctrlInitRootPath)
    window.bootstrap.Tab.getOrCreateInstance(CDOM.ID('file-tab')).show();
else
    helpActivatePane();
function ctrlShowFileTab() {
    if (appSidebarRight && !appSidebarRight.classList.contains('sidebar-docked')) {
        window.bootstrap.Offcanvas.getOrCreateInstance(appSidebarRight).show();
    }
    window.bootstrap.Tab.getOrCreateInstance(CDOM.ID('right-file-tab')).show();
}
function ctrlSideFileOpenFromSearch(scope, pathVal) {
    const nextWeb = scope.remoteId ? scope.webRootUrl : '';
    if ((currentWebRootUrl || '') !== (nextWeb || '')) {
        currentWebRootUrl = nextWeb;
        logOnServerChanged();
    }
    if (ctrlNormPath(ctrlSelectedRootPath ?? '') !== ctrlNormPath(scope.rootPath ?? '')) {
        ctrlSelectedRootPath = scope.rootPath ?? '';
        ctrlSyncSideFileRootSel();
    }
    ctrlShowFileTab();
    ctrlSideFileGoTo(pathVal);
}
function ctrlServerLabel(url) {
    if (!url)
        return L('ctrl.local', 'Local');
    try {
        return new URL(url, location.href).host;
    }
    catch {
        return url;
    }
}
function ctrlGroupSearchScope(key) {
    const g = parseGroupKey(key);
    const ctx = serverCtxOf(g.remoteId);
    if (!ctx)
        return null;
    return {
        remoteId: g.remoteId,
        webRootUrl: ctx.apiUrl,
        rootPath: g.pathText,
        editorBaseUrl: g.remoteId ? ctx.apiUrl : '',
        serverLabel: ctrlServerLabel(g.remoteId ? (remoteEntryUrl(g.remoteId) || ctx.apiUrl) : ''),
    };
}
const CTRL_SEARCH_EXCLUDE_DIRS = ['node_modules'];
const ctrlIsSearchExcluded = (name) => name.startsWith('.') || CTRL_SEARCH_EXCLUDE_DIRS.includes(name);
const ctrlEncodeUrlPath = (p) => p.split('/').map(encodeURIComponent).join('/');
function ctrlAllSearchScopeItems() {
    const items = [];
    const seen = new Set();
    const add = (key) => {
        if (seen.has(key))
            return;
        seen.add(key);
        const scope = ctrlGroupSearchScope(key);
        if (scope)
            items.push({ key, scope });
    };
    for (const r of localRootOpts)
        add(agentGroupKey(r.path));
    for (const remote of rdpRemotes) {
        const roots = remoteRootsCache.get(remote.remoteId);
        if (!roots)
            continue;
        for (const ro of roots)
            add(`remote:${remote.remoteId}:${agentGroupKey(ro.path)}`);
    }
    return items;
}
const g_ctrlSrchCache = new Map();
const g_ctrlSrchRoot = new Map();
const g_ctrlSrchDown = new Map();
const CTRL_SRCH_LAST_CHECKED_KEY = 'ctrlSrchLastChecked';
let g_ctrlSrchLastChecked = (() => {
    try {
        const raw = localStorage.getItem(CTRL_SRCH_LAST_CHECKED_KEY);
        return raw ? new Set(JSON.parse(raw)) : null;
    }
    catch {
        return null;
    }
})();
async function ctrlFileSearch(onlyKey) {
    let searchCancelled = false;
    const uid = Date.now();
    const scopeItems = ctrlAllSearchScopeItems();
    const initialChecked = new Set(onlyKey ? [onlyKey] :
        g_ctrlSrchLastChecked ? scopeItems.map(s => s.key).filter(k => g_ctrlSrchLastChecked.has(k)) :
            []);
    if (onlyKey) {
        g_ctrlSrchLastChecked = new Set(initialChecked);
        try {
            localStorage.setItem(CTRL_SRCH_LAST_CHECKED_KEY, JSON.stringify(Array.from(g_ctrlSrchLastChecked)));
        }
        catch { }
    }
    const modal = new CModal();
    modal.SetHeader(`<i class="bi bi-search me-1"></i>${L('ctrl.search', 'Search')}`);
    const scopeRows = scopeItems.map(s => `
        <label class="d-flex align-items-center gap-2 py-1" style="cursor:pointer;">
            <input type="checkbox" class="form-check-input m-0 ctrl-srch-scope-cb" data-key="${aiEscapeHtml(s.key)}" ${initialChecked.has(s.key) ? 'checked' : ''}>
            <span style="font-size:12px;">${aiEscapeHtml(s.scope.serverLabel)}:${aiEscapeHtml(s.scope.rootPath || './')}</span>
        </label>`).join('');
    modal.SetBody(`
        <div id="ctrlSrchScopes_${uid}" class="d-flex flex-column mb-2" style="max-height:140px;overflow-y:auto;border:1px solid var(--bs-border-color,#444);border-radius:4px;padding:0 8px;">
            ${scopeRows || `<span class="text-secondary small py-1">${L('ctrl.msg.noSearchScope', 'No searchable path.')}</span>`}
        </div>
        <div class="d-flex gap-2 mb-2">
            <input type="text" id="ctrlSrchInput_${uid}" class="form-control form-control-sm" placeholder="${L('ctrl.ph.filename', 'Filename (partial match)...')}">
            <button id="ctrlSrchBtn_${uid}" class="btn btn-sm btn-primary">${L('ctrl.search', 'Search')}</button>
            <button id="ctrlSrchStop_${uid}" class="btn btn-sm btn-outline-danger" style="display:none;">${L('ctrl.stop', 'Stop')}</button>
        </div>
        <div id="ctrlSrchStatus_${uid}" class="small text-secondary mb-1" style="min-height:1.2em;"></div>
        <div id="ctrlSrchResults_${uid}" class="list-group ctrl-srch-results" style="max-height:320px;overflow-y:auto;font-size:13px;"></div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(520, 620);
    modal.Open(CModal.ePos.Center);
    await new Promise(r => setTimeout(r, MODAL_DOM_DELAY));
    const scopesEl = document.getElementById(`ctrlSrchScopes_${uid}`);
    const input = document.getElementById(`ctrlSrchInput_${uid}`);
    const btn = document.getElementById(`ctrlSrchBtn_${uid}`);
    const stopBtn = document.getElementById(`ctrlSrchStop_${uid}`);
    const status = document.getElementById(`ctrlSrchStatus_${uid}`);
    const results = document.getElementById(`ctrlSrchResults_${uid}`);
    scopesEl.addEventListener('change', (e) => {
        if (!e.target?.classList.contains('ctrl-srch-scope-cb'))
            return;
        g_ctrlSrchLastChecked = new Set(Array.from(scopesEl.querySelectorAll('.ctrl-srch-scope-cb'))
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.key));
        try {
            localStorage.setItem(CTRL_SRCH_LAST_CHECKED_KEY, JSON.stringify(Array.from(g_ctrlSrchLastChecked)));
        }
        catch { }
    });
    const makeItem = (scopeKey, scope, fl, dirPath) => {
        const item = document.createElement('div');
        item.className = 'list-group-item list-group-item-action py-1 px-2';
        const icon = fl.file ? 'bi-file-earmark' : 'bi-folder-fill text-warning';
        item.innerHTML =
            `<i class="bi ${icon} me-1"></i><strong>${fl.name}</strong>` +
                `<span class="text-muted ms-2" style="font-size:11px;">${aiEscapeHtml(scope.serverLabel)}:${dirPath}</span>`;
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', (g_ctrlSrchRoot.get(scopeKey) ?? '') + dirPath + fl.name);
            if (e.dataTransfer)
                e.dataTransfer.effectAllowed = 'copy';
        });
        if (fl.file) {
            item.addEventListener('click', () => {
                modal.Hide();
                editorOpenFile((g_ctrlSrchRoot.get(scopeKey) ?? '') + dirPath + fl.name, scope.editorBaseUrl, (g_ctrlSrchDown.get(scopeKey) ?? '') + ctrlEncodeUrlPath(dirPath + fl.name));
            });
        }
        else {
            item.addEventListener('click', () => {
                modal.Hide();
                ctrlSideFileOpenFromSearch(scope, dirPath + fl.name + '/');
            });
        }
        return item;
    };
    const keyOf = (scopeKey, dirPath, name) => scopeKey + ' ' + dirPath + ' ' + name;
    const renderFromCache = (activeScopes, query, shown) => {
        let found = 0;
        for (const { key: scopeKey, scope } of activeScopes) {
            const cache = g_ctrlSrchCache.get(scopeKey);
            if (!cache)
                continue;
            for (const [dirPath, list] of cache) {
                for (const fl of list) {
                    if (fl.hidden || ctrlIsSearchExcluded(fl.name))
                        continue;
                    if (fl.name.toLowerCase().includes(query)) {
                        const key = keyOf(scopeKey, dirPath, fl.name);
                        if (shown.has(key))
                            continue;
                        shown.add(key);
                        results.appendChild(makeItem(scopeKey, scope, fl, dirPath));
                        if (++found >= 200)
                            return found;
                    }
                }
            }
        }
        return found;
    };
    const doSearch = async () => {
        const query = input.value.trim().toLowerCase();
        if (!query)
            return;
        const checkedKeys = new Set(Array.from(scopesEl.querySelectorAll('.ctrl-srch-scope-cb'))
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.key));
        const activeScopes = scopeItems.filter(s => checkedKeys.has(s.key));
        if (activeScopes.length === 0) {
            status.textContent = L('ctrl.msg.noScopeSelected', 'Select at least one path.');
            return;
        }
        searchCancelled = false;
        btn.disabled = true;
        stopBtn.style.display = '';
        results.innerHTML = '';
        const shown = new Set();
        let found = renderFromCache(activeScopes, query, shown);
        status.textContent = found > 0 ? LF('ctrl.msg.cachedScanning', 'Cached: {0} result(s)... Scanning', found) : L('ctrl.scanning', 'Scanning...');
        const scopeErrors = [];
        for (const { key: scopeKey, scope } of activeScopes) {
            if (searchCancelled || found >= 200)
                break;
            const webRootUrl = scope.webRootUrl;
            const rootPathParam = scope.rootPath || undefined;
            let cache = g_ctrlSrchCache.get(scopeKey);
            if (!cache) {
                cache = new Map();
                g_ctrlSrchCache.set(scopeKey, cache);
            }
            const queue = ["/"];
            while (queue.length > 0 && !searchCancelled && found < 200) {
                const dirPath = queue.shift();
                status.textContent = LF('ctrl.msg.scanningPath', 'Scanning: {0}:{1}', scope.serverLabel, dirPath);
                try {
                    const p2 = { path: dirPath, skipVcs: 'true' };
                    if (rootPathParam)
                        p2.RootPath = rootPathParam;
                    const token = getAuthToken(webRootUrl);
                    const data = await CFecth.Exe(webRootUrl + "File/List", { ...p2, token }, "json");
                    if (!Array.isArray(data.list)) {
                        if (dirPath === "/")
                            scopeErrors.push(`${scope.serverLabel}: ${data.msg || L('ctrl.msg.searchScopeFailed', 'Cannot search this location.')}`);
                        continue;
                    }
                    if (data.RootPath != null)
                        g_ctrlSrchRoot.set(scopeKey, data.RootPath.replace(/\/+$/, ''));
                    if (data.RootUrl != null)
                        g_ctrlSrchDown.set(scopeKey, new URL(data.RootUrl, webRootUrl).href.replace(/\/+$/, ''));
                    cache.set(dirPath, data.list);
                    for (const fl of data.list) {
                        if (!fl.hidden && !fl.file && !ctrlIsSearchExcluded(fl.name))
                            queue.push(dirPath + fl.name + '/');
                        if (!fl.hidden && fl.name.toLowerCase().includes(query) && found < 200) {
                            const key = keyOf(scopeKey, dirPath, fl.name);
                            if (shown.has(key))
                                continue;
                            shown.add(key);
                            results.appendChild(makeItem(scopeKey, scope, fl, dirPath));
                            found++;
                        }
                    }
                }
                catch (_) { }
            }
        }
        const cap = found >= 200 ? ' (capped at 200)' : '';
        status.textContent = scopeErrors.length ? scopeErrors.join(' / ')
            : searchCancelled ? LF('ctrl.msg.stoppedResults', 'Stopped. ({0} result(s))', found)
                : found === 0 ? L('ctrl.noResults', 'No results.') : LF('ctrl.msg.nResults', '{0} result(s){1}', found, cap);
        btn.disabled = false;
        stopBtn.style.display = 'none';
    };
    input.addEventListener('input', () => {
        if (btn.disabled)
            return;
        const query = input.value.trim().toLowerCase();
        results.innerHTML = '';
        if (!query) {
            status.textContent = '';
            return;
        }
        const checkedKeys = new Set(Array.from(scopesEl.querySelectorAll('.ctrl-srch-scope-cb'))
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.key));
        const activeScopes = scopeItems.filter(s => checkedKeys.has(s.key));
        if (activeScopes.length === 0)
            return;
        const found = renderFromCache(activeScopes, query, new Set());
        status.textContent = found > 0 ? LF('ctrl.msg.cachedOnly', 'Cached: {0} result(s) (Enter for full search)', found) : '';
    });
    stopBtn.addEventListener('click', () => { searchCancelled = true; });
    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const items = Array.from(results.querySelectorAll('.list-group-item'));
            if (items.length === 0)
                return;
            e.preventDefault();
            const curIdx = items.findIndex(el => el.classList.contains('ctrl-srch-kbd-active'));
            const dir = e.key === 'ArrowDown' ? 1 : -1;
            const nxt = curIdx === -1 ? (dir === 1 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, curIdx + dir));
            if (curIdx >= 0)
                items[curIdx].classList.remove('ctrl-srch-kbd-active');
            items[nxt].classList.add('ctrl-srch-kbd-active');
            items[nxt].scrollIntoView({ block: 'nearest' });
            return;
        }
        if (e.key === 'Enter') {
            const activeItem = results.querySelector('.ctrl-srch-kbd-active');
            if (activeItem) {
                activeItem.click();
                return;
            }
            doSearch();
        }
    });
    input.focus();
}
function ctrlSideFileVcsBadge(status, filePath) {
    if (!status)
        return '';
    const color = status === 'A' ? 'success' : status === 'D' ? 'danger' : status === 'M' ? 'warning' : 'secondary';
    const canDiff = status === 'M' || status === 'A' || status === 'D';
    if (!canDiff)
        return `<span class="badge bg-${color} ms-auto" style="font-size:0.6rem;">${status}</span>`;
    return `<span class="badge bg-${color} ms-auto" style="font-size:0.6rem;cursor:pointer;" title="Diff" data-vcs-diff-path="${aiEscapeHtml(filePath)}">${status}</span>`;
}
async function ctrlOpenVcsDiff(filePath) {
    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
    let res;
    try {
        res = await CFecth.Exe(webRootUrl + "File/VCS", { action: "diff", path: filePath, token }, "json");
    }
    catch (e) {
        CAlert.Info(L('ctrl.msg.diffRequestFailed', 'Diff request failed'));
        return;
    }
    if (!res?.ok) {
        CAlert.Info(res?.msg || L('ctrl.msg.diffFailed', 'Diff failed'));
        return;
    }
    if (!document.getElementById("vcs-diff-style")) {
        const st = document.createElement("style");
        st.id = "vcs-diff-style";
        st.textContent = "#ctrl-vcs-diff-view .d2h-code-wrapper{position:relative;}";
        document.head.appendChild(st);
    }
    const modal = new CModal();
    modal.SetHeader(`Diff: ${filePath.replace(/\/+$/, '').split('/').pop() || filePath}`);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetBody(`<div id="ctrl-vcs-diff-view"></div>`);
    modal.SetSize(860, 580);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const el = document.getElementById("ctrl-vcs-diff-view");
        if (!el)
            return;
        const D2H = window.Diff2HtmlUI;
        if (!D2H) {
            el.textContent = "diff2html not loaded";
            return;
        }
        el.classList.toggle('d2h-dark-color-scheme', document.documentElement.getAttribute('data-bs-theme') === 'dark');
        const cfg = { drawFileList: false, matching: "lines", outputFormat: "line-by-line", highlight: false, stickyFileHeaders: false };
        new D2H(el, res.diff, cfg).draw();
    }, 100);
}
const CTRL_EXT_KIND = {
    png: 'image', jpg: 'image', jpeg: 'image', bmp: 'image',
    mp3: 'audio', ogg: 'audio',
    mp4: 'video', mov: 'video', avi: 'video',
    soundlist: 'soundlist', html: 'html', md: 'md',
    ts: 'code', js: 'code', txt: 'code', json: 'code',
    csv: 'sheet', xlsx: 'sheet', xls: 'sheet',
    sqlite: 'orm', db: 'orm',
};
const CTRL_FILE_ICON = {
    folder: 'bi-folder-fill text-warning', image: 'bi-folder-image', audio: 'bi-folder-music',
    video: 'bi-folder-play', soundlist: 'bi-flower1', html: 'bi-file-earmark-code',
    code: 'bi-file-code', md: 'bi-file-earmark-text', sheet: 'bi-file-earmark-spreadsheet',
    orm: 'bi-file-earmark-binary', file: 'bi-file-earmark',
};
function ctrlSideFileKind(fl) {
    return fl.file
        ? (CTRL_EXT_KIND[fl.ext] ?? 'file')
        : (fl.name.toLowerCase().endsWith('.nedb') ? 'orm' : 'folder');
}
function ctrlSideFileIcon(fl) {
    return CTRL_FILE_ICON[ctrlSideFileKind(fl)];
}
const ctrlSideFilePathEl = CDOM.ID('ctrlSideFilePath');
const ctrlSideFileListEl = CDOM.ID('ctrlSideFileList');
const ctrlSideFileCopyListEl = CDOM.ID('ctrlSideFileCopyList');
let ctrlSideFilePath = '/';
let ctrlSideFileRoot = '';
let ctrlSideFileDown = '';
let ctrlSideFileReqSeq = 0;
window.ctrlPathToUrl = async (absPath) => {
    const norm = termNormAbsPath(absPath);
    const normLower = norm.toLowerCase();
    try {
        const data = await CFecth.Exe(CPath.WebRootUrl() + "File/Root", {}, "json");
        const root = (data.roots || []).find(r => {
            const rp = termNormAbsPath(r.path).toLowerCase();
            return normLower === rp || normLower.startsWith(rp + '/');
        });
        if (!root)
            return null;
        const rel = norm.slice(termNormAbsPath(root.path).length).replace(/^\/+/, '');
        const downBase = new URL(root.url, CPath.WebRootUrl()).href.replace(/\/+$/, '');
        return downBase + '/' + ctrlEncodeUrlPath(rel);
    }
    catch {
        return null;
    }
};
async function ctrlUrlToPath(url, baseUrl) {
    const apiUrl = baseUrl || CPath.WebRootUrl();
    try {
        const data = await CFecth.Exe(apiUrl + "File/Root", {}, "json");
        for (const root of data.roots || []) {
            const downBase = new URL(root.url, apiUrl).href.replace(/\/+$/, '');
            if (url === downBase || url.startsWith(downBase + '/')) {
                const rel = decodeURIComponent(url.slice(downBase.length).replace(/^\/+/, ''));
                return termNormAbsPath(root.path) + '/' + rel;
            }
        }
    }
    catch { }
    return null;
}
const CTRL_SIDE_FILE_LONG_MS = 550;
const CTRL_SIDE_FILE_COPY_CLICK_GUARD_MS = 450;
const ctrlSideFileCopyItems = [];
let ctrlSideFileCopyClickGuardUntil = 0;
function ctrlSideFileAuthToken(webRootUrl) {
    if (webRootUrl && webRootUrl !== CPath.WebRootUrl())
        return getAuthToken(webRootUrl) || '';
    return getAuthToken(webRootUrl || CPath.WebRootUrl()) || '';
}
function ctrlSideFileRenderCopyList() {
    if (!ctrlSideFileCopyListEl)
        return;
    if (!ctrlSideFileCopyItems.length) {
        ctrlSideFileCopyListEl.innerHTML = '';
        ctrlSideFileCopyListEl.classList.add('d-none');
        ctrlSideFileCopyListEl.classList.remove('d-flex');
        return;
    }
    ctrlSideFileCopyListEl.classList.remove('d-none');
    ctrlSideFileCopyListEl.classList.add('d-flex');
    ctrlSideFileCopyListEl.innerHTML = '';
    for (const ci of ctrlSideFileCopyItems) {
        const row = document.createElement('div');
        row.className = 'd-flex align-items-center gap-1 px-1';
        const icon = ci.isFile ? 'bi-file-earmark' : 'bi-folder-fill text-warning';
        row.innerHTML =
            `<i class="bi ${icon} flex-shrink-0" style="font-size:0.75rem;"></i>` +
                `<span class="small text-truncate flex-grow-1" title="${aiEscapeHtml(ci.relPath)}">${aiEscapeHtml(ci.relPath)}</span>` +
                `<button type="button" class="btn btn-sm btn-outline-secondary py-0 px-1 flex-shrink-0" data-copy-act="remove" title="Remove"><i class="bi bi-x-lg"></i></button>` +
                `<button type="button" class="btn btn-sm btn-outline-primary py-0 px-1 flex-shrink-0" data-copy-act="paste" title="Paste here"><i class="bi bi-clipboard"></i></button>`;
        row.querySelector('[data-copy-act="remove"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (Date.now() < ctrlSideFileCopyClickGuardUntil)
                return;
            const idx = ctrlSideFileCopyItems.indexOf(ci);
            if (idx >= 0)
                ctrlSideFileCopyItems.splice(idx, 1);
            ctrlSideFileRenderCopyList();
        });
        row.querySelector('[data-copy-act="paste"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (Date.now() < ctrlSideFileCopyClickGuardUntil)
                return;
            void ctrlSideFilePasteCopy(ci);
        });
        ctrlSideFileCopyListEl.appendChild(row);
    }
}
function ctrlSideFileAddCopy(fl) {
    const relPath = fl.file
        ? ctrlSideFilePath + fl.name
        : ctrlSideFilePath + fl.name + '/';
    const absPath = ctrlSideFileRoot + relPath;
    if (ctrlSideFileCopyItems.some(x => x.absPath === absPath))
        return;
    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    ctrlSideFileCopyItems.push({
        name: fl.name,
        absPath,
        relPath,
        isFile: !!fl.file,
        downloadBase: ctrlSideFileDown,
        webRootUrl,
        rootPath: ctrlSelectedRootPath || '',
    });
    ctrlSideFileCopyClickGuardUntil = Date.now() + CTRL_SIDE_FILE_COPY_CLICK_GUARD_MS;
    ctrlSideFileRenderCopyList();
}
async function ctrlSideFileUploadOne(downloadUrl, destAbsDir, fileName, destWebRootUrl) {
    const buf = await CFile.Load(downloadUrl, false, true);
    if (!buf)
        return false;
    const b64 = CUtil.ArrayToBase64(buf);
    const token = ctrlSideFileAuthToken(destWebRootUrl);
    const up = { path: destAbsDir, name: [fileName], data: [b64] };
    if (token)
        up.token = token;
    const res = await CFecth.Exe(destWebRootUrl + 'File/Upload', up, 'json');
    return !!res?.ok;
}
async function ctrlSideFileCopyFolderTree(item, destParentRel, destWebRootUrl, destRootPath, destAbsRoot, overwrite) {
    const srcToken = ctrlSideFileAuthToken(item.webRootUrl);
    const destToken = ctrlSideFileAuthToken(destWebRootUrl);
    const destFolderRel = destParentRel + item.name + '/';
    const mk = { data: destParentRel + item.name };
    if (destRootPath)
        mk.RootPath = destRootPath;
    if (destToken)
        mk.token = destToken;
    const mkRes = await CFecth.Exe(destWebRootUrl + 'File/Mkdir', mk, 'json');
    if (mkRes && mkRes.ok === false)
        return false;
    const lp = { path: item.relPath };
    if (item.rootPath)
        lp.RootPath = item.rootPath;
    if (srcToken)
        lp.token = srcToken;
    const listed = await CFecth.Exe(item.webRootUrl + 'File/List', lp, 'json');
    if (listed?.ok === false)
        return false;
    const children = (listed.list ?? []).filter(fl => !fl.hidden);
    const destAbsDir = destAbsRoot + destFolderRel;
    const checkP = { path: destFolderRel };
    if (destRootPath)
        checkP.RootPath = destRootPath;
    if (destToken)
        checkP.token = destToken;
    const destList = await CFecth.Exe(destWebRootUrl + 'File/List', checkP, 'json');
    const destNames = new Set((destList.list ?? []).map(x => x.name));
    for (const fl of children) {
        const nameExists = destNames.has(fl.name);
        if (nameExists && !overwrite)
            continue;
        if (fl.file) {
            const srcRel = item.relPath + fl.name;
            const url = item.downloadBase + ctrlEncodeUrlPath(srcRel);
            const ok = await ctrlSideFileUploadOne(url, destAbsDir, fl.name, destWebRootUrl);
            if (!ok)
                return false;
            destNames.add(fl.name);
        }
        else {
            const sub = {
                name: fl.name,
                absPath: item.absPath + fl.name + '/',
                relPath: item.relPath + fl.name + '/',
                isFile: false,
                downloadBase: item.downloadBase,
                webRootUrl: item.webRootUrl,
                rootPath: item.rootPath,
            };
            const ok = await ctrlSideFileCopyFolderTree(sub, destFolderRel, destWebRootUrl, destRootPath, destAbsRoot, overwrite);
            if (!ok)
                return false;
            destNames.add(fl.name);
        }
    }
    return true;
}
async function ctrlSideFilePasteCopyDo(item, overwrite) {
    const destDir = ctrlSideFileRoot + ctrlSideFilePath;
    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    try {
        let ok = false;
        if (item.isFile) {
            const downloadUrl = item.downloadBase + ctrlEncodeUrlPath(item.relPath);
            ok = await ctrlSideFileUploadOne(downloadUrl, destDir, item.name, webRootUrl);
            if (!ok)
                CAlert.Info(L('ctrl.msg.copyFailed', 'Copy failed.'));
        }
        else {
            ok = await ctrlSideFileCopyFolderTree(item, ctrlSideFilePath, webRootUrl, ctrlSelectedRootPath || '', ctrlSideFileRoot, overwrite);
            if (!ok)
                CAlert.Info(L('ctrl.msg.copyFailed', 'Copy failed.'));
        }
        if (!ok)
            return;
        const idx = ctrlSideFileCopyItems.indexOf(item);
        if (idx >= 0)
            ctrlSideFileCopyItems.splice(idx, 1);
        await ctrlSideFileGoTo(ctrlSideFilePath);
        ctrlSideFileRenderCopyList();
    }
    catch {
        CAlert.Info(L('ctrl.msg.copyFailed', 'Copy failed.'));
    }
}
async function ctrlSideFilePasteCopy(item) {
    const destDir = ctrlSideFileRoot + ctrlSideFilePath;
    const destAbs = item.isFile ? destDir + item.name : destDir + item.name + '/';
    if (destAbs === item.absPath) {
        CAlert.Info(L('ctrl.msg.copySamePath', 'Same path. Skipped.'));
        return;
    }
    if (!item.isFile) {
        const src = item.relPath.endsWith('/') ? item.relPath : item.relPath + '/';
        const dest = ctrlSideFilePath + item.name + '/';
        if (dest === src || dest.startsWith(src)) {
            CAlert.Info(L('ctrl.msg.copyIntoSelf', 'Cannot paste a folder into itself. Skipped.'));
            return;
        }
    }
    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
    try {
        const p = { path: ctrlSideFilePath };
        if (ctrlSelectedRootPath)
            p.RootPath = ctrlSelectedRootPath;
        if (token)
            p.token = token;
        const data = await CFecth.Exe(webRootUrl + 'File/List', p, 'json');
        if (data?.ok === false) {
            CAlert.Info(data.msg || L('ctrl.failedToLoad', 'Failed to load'));
            return;
        }
        const exists = (data.list ?? []).some(fl => fl.name === item.name);
        if (!exists) {
            await ctrlSideFilePasteCopyDo(item, true);
            return;
        }
        const kind = item.isFile
            ? L('ctrl.file', 'File')
            : L('ctrl.folder', 'Folder');
        const body = `<div class="small">` +
            `<div class="mb-2">${aiEscapeHtml(kind)} <code>${aiEscapeHtml(item.name)}</code> ${L('ctrl.msg.copyExistsAsk', 'already exists in this folder.')}</div>` +
            `<div class="text-secondary">${L('ctrl.msg.copyExistsHint', 'Overwrite replaces existing files. Pass skips this paste.')}</div>` +
            `</div>`;
        CConfirm.List(body, [
            () => { void ctrlSideFilePasteCopyDo(item, true); },
            () => { },
        ], [
            L('ctrl.overwrite', 'Overwrite'),
            L('ctrl.pass', 'Pass'),
        ]);
    }
    catch {
        CAlert.Info(L('ctrl.msg.copyFailed', 'Copy failed.'));
    }
}
function ctrlSideFileBindLongPress(item, fl) {
    let timer = null;
    let longReady = false;
    let suppressClick = false;
    const clearTimer = () => {
        if (timer != null) {
            clearTimeout(timer);
            timer = null;
        }
    };
    const abortPress = () => {
        clearTimer();
        longReady = false;
        item.classList.remove('active');
    };
    item.addEventListener('pointerdown', (e) => {
        if (e.button !== 0)
            return;
        abortPress();
        suppressClick = false;
        timer = setTimeout(() => {
            timer = null;
            longReady = true;
            item.classList.add('active');
        }, CTRL_SIDE_FILE_LONG_MS);
    });
    item.addEventListener('pointerup', () => {
        clearTimer();
        item.classList.remove('active');
        if (!longReady)
            return;
        longReady = false;
        suppressClick = true;
        ctrlSideFileAddCopy(fl);
    });
    item.addEventListener('pointerleave', abortPress);
    item.addEventListener('pointercancel', abortPress);
    item.addEventListener('dragstart', abortPress);
    item.addEventListener('click', (e) => {
        if (!suppressClick)
            return;
        e.preventDefault();
        e.stopImmediatePropagation();
        suppressClick = false;
    }, true);
}
function ctrlSideFileRenderEmpty(msg) {
    ctrlSideFileListEl.innerHTML = `<div class="text-secondary small px-1">${aiEscapeHtml(msg)}</div>`;
}
function ctrlSideFileRenderList(list) {
    const visible = list
        .filter(fl => !fl.hidden)
        .sort((a, b) => (a.file === b.file) ? a.name.localeCompare(b.name) : (a.file ? 1 : -1));
    if (!visible.length && ctrlSideFilePath === '/') {
        ctrlSideFileRenderEmpty('Empty');
        return;
    }
    ctrlSideFileListEl.innerHTML = '';
    if (ctrlSideFilePath !== '/') {
        const rootItem = document.createElement('button');
        rootItem.type = 'button';
        rootItem.className = 'list-group-item list-group-item-warning list-group-item-action py-1 px-2';
        rootItem.innerHTML = `<i class="bi bi-folder"></i> ${L('ctrl.rootFolder', 'Root Folder')}`;
        rootItem.addEventListener('click', () => ctrlSideFileGoTo('/'));
        ctrlSideFileListEl.appendChild(rootItem);
        const trimmed = ctrlSideFilePath.replace(/\/+$/, '');
        const parent = trimmed.substring(0, trimmed.lastIndexOf('/') + 1) || '/';
        const parentItem = document.createElement('button');
        parentItem.type = 'button';
        parentItem.className = 'list-group-item list-group-item-primary list-group-item-action py-1 px-2';
        parentItem.innerHTML = `<i class="bi bi-folder"></i> ${L('ctrl.parentFolder', 'Parent Folder')}`;
        parentItem.addEventListener('click', () => ctrlSideFileGoTo(parent));
        ctrlSideFileListEl.appendChild(parentItem);
    }
    if (!visible.length)
        return;
    for (const fl of visible) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action py-1 px-2 d-flex align-items-center gap-1';
        const icon = ctrlSideFileIcon(fl);
        const vcsFilePath = ctrlSideFileRoot + ctrlSideFilePath + fl.name;
        item.innerHTML = `<i class="bi ${icon}"></i><span class="text-truncate">${aiEscapeHtml(fl.name)}</span>${ctrlSideFileVcsBadge(fl.Status, vcsFilePath)}`;
        item.querySelector('[data-vcs-diff-path]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            ctrlOpenVcsDiff(vcsFilePath);
        });
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', ctrlSideFileRoot + ctrlSideFilePath + fl.name);
            if (e.dataTransfer)
                e.dataTransfer.effectAllowed = 'copy';
        });
        item.addEventListener('click', () => {
            if (fl.file) {
                if (ctrlSideFileKind(fl) === 'orm') {
                    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
                    new CORMViewer(undefined, 'sqlite', ctrlSideFileRoot + ctrlSideFilePath + fl.name, currentWebRootUrl, token).Open();
                    return;
                }
                promptSourceAction(ctrlSideFileRoot + ctrlSideFilePath + fl.name, currentWebRootUrl, ctrlSideFileDown + ctrlEncodeUrlPath(ctrlSideFilePath + fl.name));
            }
            else {
                ctrlSideFileGoTo(ctrlSideFilePath + fl.name + '/');
            }
        });
        ctrlSideFileBindLongPress(item, fl);
        ctrlSideFileListEl.appendChild(item);
    }
}
async function ctrlSideFileGoTo(pathVal) {
    ctrlSideFilePath = pathVal;
    ctrlSideFilePathEl.textContent = pathVal;
    const seq = ++ctrlSideFileReqSeq;
    ctrlSideFileRenderEmpty('Loading...');
    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    const rootPathParam = ctrlSelectedRootPath || undefined;
    try {
        const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
        const p = { path: pathVal };
        if (rootPathParam)
            p.RootPath = rootPathParam;
        if (token)
            p.token = token;
        const data = await CFecth.Exe(webRootUrl + "File/List", p, "json");
        if (seq !== ctrlSideFileReqSeq)
            return;
        if (data.RootPath != null)
            ctrlSideFileRoot = data.RootPath.replace(/\/+$/, '');
        if (data.RootUrl != null)
            ctrlSideFileDown = new URL(data.RootUrl, webRootUrl).href.replace(/\/+$/, '');
        if (data.path != null) {
            ctrlSideFilePath = data.path;
            ctrlSideFilePathEl.textContent = data.path;
        }
        ctrlSideFileRenderList(data.list ?? []);
        if (g_ctrlSideSrch.indexed && g_ctrlSideSrch.rootKey === ctrlSideSrchKey()) {
            g_ctrlSideSrch.cache.set(ctrlSideFilePath, (data.list ?? []));
        }
    }
    catch (e) {
        if (seq !== ctrlSideFileReqSeq)
            return;
        ctrlSideFileRenderEmpty(L('ctrl.failedToLoad', 'Failed to load'));
        if (currentWebRootUrl) {
            const remote = rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === currentWebRootUrl);
            if (remote)
                rdpNoteFetchFailure(remote);
        }
    }
}
CDOM.ID('ctrlSideFileRefreshBtn').addEventListener('click', () => ctrlSideFileGoTo(ctrlSideFilePath));
ctrlSideFileGoTo('/');
const ctrlSideFileSearchInputEl = CDOM.ID('ctrlSideFileSearchInput');
const ctrlSideFileSearchResultsEl = CDOM.ID('ctrlSideFileSearchResults');
const CTRL_SIDE_SRCH_SCAN_CAP = 100000;
const CTRL_SIDE_SRCH_CONCURRENCY = 16;
let g_ctrlSideSrch = { rootKey: '', indexed: false, indexing: false, cache: new Map(), root: '', down: '' };
let ctrlSideSrchSeq = 0;
function ctrlSideSrchKey() {
    return (currentWebRootUrl || '') + '|' + (ctrlSelectedRootPath || '');
}
function ctrlSideSrchStop() {
    ctrlSideSrchSeq++;
    const wasIndexing = g_ctrlSideSrch.indexing;
    g_ctrlSideSrch = { rootKey: '', indexed: false, indexing: false, cache: new Map(), root: '', down: '' };
    if (wasIndexing) {
        ctrlSideFileSearchInputEl.disabled = false;
        ctrlSideFileSearchInputEl.placeholder = L('ctrl.ph.sideSearch', 'Search (click to index)');
    }
    ctrlSideFileSearchInputEl.value = '';
    ctrlSideFileSearchResultsEl.classList.add('d-none');
}
async function ctrlSideSrchIndex() {
    const key = ctrlSideSrchKey();
    if (g_ctrlSideSrch.rootKey !== key)
        g_ctrlSideSrch = { rootKey: key, indexed: false, indexing: false, cache: new Map(), root: '', down: '' };
    if (g_ctrlSideSrch.indexed || g_ctrlSideSrch.indexing)
        return;
    const seq = ++ctrlSideSrchSeq;
    g_ctrlSideSrch.indexing = true;
    ctrlSideFileSearchInputEl.disabled = true;
    const prevPlaceholder = ctrlSideFileSearchInputEl.placeholder;
    ctrlSideFileSearchInputEl.placeholder = LF('ctrl.indexingCount', 'Indexing... ({0})', 0);
    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    const rootPathParam = ctrlSelectedRootPath || undefined;
    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
    const queue = ['/'];
    let scanned = 0;
    let stopped = false;
    const fetchDir = async (dirPath) => {
        try {
            const p = { path: dirPath, skipVcs: 'true' };
            if (rootPathParam)
                p.RootPath = rootPathParam;
            if (token)
                p.token = token;
            const data = await CFecth.Exe(webRootUrl + "File/List", p, "json");
            if (seq !== ctrlSideSrchSeq)
                return;
            if (!Array.isArray(data.list))
                return;
            if (data.RootPath != null)
                g_ctrlSideSrch.root = data.RootPath.replace(/\/+$/, '');
            if (data.RootUrl != null)
                g_ctrlSideSrch.down = new URL(data.RootUrl, webRootUrl).href.replace(/\/+$/, '');
            g_ctrlSideSrch.cache.set(dirPath, data.list);
            scanned += data.list.length;
            ctrlSideFileSearchInputEl.placeholder = LF('ctrl.indexingCount', 'Indexing... ({0})', scanned);
            for (const fl of data.list) {
                if (!fl.hidden && !fl.file && !ctrlIsSearchExcluded(fl.name))
                    queue.push(dirPath + fl.name + '/');
            }
        }
        catch {
            stopped = true;
        }
    };
    const worker = async () => {
        while (queue.length > 0 && scanned < CTRL_SIDE_SRCH_SCAN_CAP && !stopped && seq === ctrlSideSrchSeq) {
            const dirPath = queue.shift();
            if (dirPath === undefined)
                break;
            await fetchDir(dirPath);
        }
    };
    await Promise.all(Array.from({ length: CTRL_SIDE_SRCH_CONCURRENCY }, () => worker()));
    if (seq !== ctrlSideSrchSeq)
        return;
    g_ctrlSideSrch.indexing = false;
    g_ctrlSideSrch.indexed = true;
    ctrlSideFileSearchInputEl.disabled = false;
    ctrlSideFileSearchInputEl.placeholder = prevPlaceholder;
}
function ctrlSideSrchRenderResults(query) {
    ctrlSideFileSearchResultsEl.innerHTML = '';
    if (!query) {
        ctrlSideFileSearchResultsEl.classList.add('d-none');
        return;
    }
    let found = 0;
    outer: for (const [dirPath, list] of g_ctrlSideSrch.cache) {
        for (const fl of list) {
            if (fl.hidden || ctrlIsSearchExcluded(fl.name))
                continue;
            if (!fl.name.toLowerCase().includes(query))
                continue;
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action py-1 px-2';
            const icon = fl.file ? 'bi-file-earmark' : 'bi-folder-fill text-warning';
            item.innerHTML =
                `<i class="bi ${icon} me-1"></i><strong>${aiEscapeHtml(fl.name)}</strong>` +
                    `<span class="text-muted ms-2" style="font-size:11px;">${aiEscapeHtml(dirPath)}</span>`;
            item.addEventListener('click', () => {
                ctrlSideFileSearchInputEl.value = '';
                ctrlSideFileSearchResultsEl.classList.add('d-none');
                if (fl.file) {
                    editorOpenFile(g_ctrlSideSrch.root + dirPath + fl.name, currentWebRootUrl, g_ctrlSideSrch.down + ctrlEncodeUrlPath(dirPath + fl.name));
                }
                else {
                    ctrlSideFileGoTo(dirPath + fl.name + '/');
                }
            });
            ctrlSideFileSearchResultsEl.appendChild(item);
            if (++found >= 100)
                break outer;
        }
    }
    ctrlSideFileSearchResultsEl.classList.toggle('d-none', found === 0);
}
ctrlSideFileSearchInputEl.addEventListener('focus', () => { void ctrlSideSrchIndex(); });
ctrlSideFileSearchInputEl.addEventListener('input', () => {
    ctrlSideSrchRenderResults(ctrlSideFileSearchInputEl.value.trim().toLowerCase());
});
ctrlSideFileSearchInputEl.addEventListener('keydown', (e) => {
    if (ctrlSideFileSearchResultsEl.classList.contains('d-none'))
        return;
    const items = Array.from(ctrlSideFileSearchResultsEl.querySelectorAll('.list-group-item'));
    if (items.length === 0)
        return;
    const curIdx = items.findIndex(el => el.classList.contains('ctrl-srch-kbd-active'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const nxt = curIdx === -1 ? (dir === 1 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (curIdx >= 0)
            items[curIdx].classList.remove('ctrl-srch-kbd-active');
        items[nxt].classList.add('ctrl-srch-kbd-active');
        items[nxt].scrollIntoView({ block: 'nearest' });
    }
    else if (e.key === 'Enter') {
        if (curIdx >= 0) {
            e.preventDefault();
            items[curIdx].click();
        }
    }
    else if (e.key === 'Escape') {
        ctrlSideFileSearchResultsEl.classList.add('d-none');
    }
});
document.addEventListener('click', (e) => {
    if (ctrlSideFileSearchResultsEl.classList.contains('d-none'))
        return;
    const t = e.target;
    if (t === ctrlSideFileSearchInputEl || ctrlSideFileSearchResultsEl.contains(t))
        return;
    ctrlSideFileSearchResultsEl.classList.add('d-none');
});
function ctrlOpenLeftSidebar() {
    if (!appSidebar)
        return;
    if (sbSubTab === 'other') {
        sbSubTab = 'agent';
        localStorage.setItem(SB_TAB_LS, 'agent');
        applySidebarSubTab();
    }
    if (!tmuxSidebarVisible('left'))
        tmuxShowSidebar('left');
    appSidebar.focus();
}
function ctrlOpenRightSidebarToggleFile() {
    if (!tmuxSidebarVisible('right'))
        tmuxShowSidebar('right');
    const fileTab = CDOM.ID('right-file-tab');
    const onFile = fileTab?.classList.contains('active') || fileTab?.getAttribute('aria-selected') === 'true';
    if (onFile) {
        window.bootstrap.Tab.getOrCreateInstance(CDOM.ID('right-info-tab')).show();
    }
    else {
        ctrlShowFileTab();
    }
}
function runControlHotkey(key, shift = false) {
    switch (key) {
        case 'F1':
            if (shift)
                tmuxHideSidebar('left');
            else
                ctrlOpenLeftSidebar();
            return true;
        case 'F2':
            if (shift)
                tmuxHideSidebar('right');
            else
                ctrlOpenRightSidebarToggleFile();
            return true;
        case 'F3':
            if (!ctrlRequireAuthed())
                return true;
            termStartNew('cmd');
            return true;
    }
    return false;
}
function isSidebarFocused() {
    if (!appSidebar)
        return false;
    return document.activeElement instanceof Node && appSidebar.contains(document.activeElement);
}
function runControlArrowKey(dir) {
    if (!isSidebarFocused())
        return false;
    const listEl = sbSubTab === 'agent' ? agentSidebarList : otherSidebarList;
    const items = Array.from(listEl.querySelectorAll('.ai-session-item')).filter(el => el.offsetParent !== null);
    if (items.length === 0)
        return false;
    let curIdx = items.findIndex(el => el.classList.contains('ai-session-item-active-main') || el.classList.contains('ai-session-item-active-remote'));
    if (curIdx < 0)
        curIdx = items.findIndex(el => el.classList.contains('ai-session-item-active-sub') || el.classList.contains('ai-session-item-active'));
    const nxt = curIdx === -1 ? 0 : Math.max(0, Math.min(items.length - 1, curIdx + dir));
    if (nxt === curIdx)
        return false;
    items[nxt].click();
    items[nxt].scrollIntoView({ block: 'nearest' });
    return true;
}
function runControlSubTabArrowKey(dir) {
    if (!isSidebarFocused())
        return false;
    const next = dir === 1 ? 'other' : 'agent';
    if (sbSubTab === next)
        return false;
    sbSubTab = next;
    localStorage.setItem(SB_TAB_LS, next);
    applySidebarSubTab();
    return true;
}
function wirePooledFrameHotkeys(f, key) {
    const isTerm = key.startsWith('term:') || key.startsWith('term-new:');
    f.addEventListener('load', () => {
        try {
            if (!isTerm) {
                f.contentWindow?.addEventListener('keydown', (e) => {
                    if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') {
                        e.preventDefault();
                        runControlHotkey(e.key, e.shiftKey);
                        return;
                    }
                }, true);
            }
        }
        catch (_) { }
    });
}
document.addEventListener('keydown', (e) => {
    if (e.target === ctrlSideFileSearchInputEl && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return;
    }
    if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') {
        e.preventDefault();
        runControlHotkey(e.key, e.shiftKey);
        return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (runControlArrowKey(e.key === 'ArrowUp' ? -1 : 1))
            e.preventDefault();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (runControlSubTabArrowKey(e.key === 'ArrowRight' ? 1 : -1))
            e.preventDefault();
    }
    if (e.key === 'F7') {
        e.preventDefault();
    }
});
CIframeMsg.Recv({
    'home-hotkey': (data) => {
        runControlHotkey(String(data.key ?? ''), !!data.shift);
    },
});
CIframeMsg.Recv({
    'file-remote-changed': (data) => {
        currentWebRootUrl = String(data.baseUrl ?? '');
        memoSendRemoteInfo();
        logOnServerChanged();
    },
    'file-opened': (data) => {
        promptSourceAction(String(data.path ?? ''), String(data.baseUrl ?? ''), String(data.url ?? ''));
    },
    'open-chat': (data) => chatStartNew(data.cwd || undefined),
    'open-term': (data) => termStartNew('cmd', data.cwd || undefined),
    'open-memo': (data) => {
        window.bootstrap.Tab.getOrCreateInstance(memoTab).show();
        memoTryInit();
        setTimeout(() => { if (memoIframe?.contentWindow)
            CIframeMsg.Send(memoIframe.contentWindow, 'set-folder', { folder: data.folder ?? '' }); }, 200);
    },
    'terminal-path-tapped': (data) => termOpenTappedPath(String(data.path ?? ''), String(data.token ?? '')),
    'editor-dirty': (data, source) => {
        for (const [key, f] of editorIframePool) {
            if (f.contentWindow !== source)
                continue;
            const s = editorSessions.get(key);
            if (s) {
                s.dirty = !!data.dirty;
                renderSessionSidebar();
            }
            break;
        }
    },
    'editor-open-ref': (data, source) => {
        const url = String(data.url ?? '');
        if (!url)
            return;
        let baseUrl = '';
        for (const [key, f] of editorIframePool) {
            if (f.contentWindow !== source)
                continue;
            baseUrl = editorSessions.get(key)?.baseUrl ?? '';
            break;
        }
        void ctrlUrlToPath(url, baseUrl).then(path => {
            if (path)
                promptSourceAction(path, baseUrl, url);
        });
    },
    'terminal-handoff': (data) => {
        const newToken = String(data.newToken ?? '');
        if (!newToken)
            return;
        termActivatePane();
        showTermFrame(`term-new:${newToken}:${Date.now()}`, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${newToken}`);
        termRenderList();
        setTimeout(termRenderList, 1500);
        setTimeout(termRenderList, 4000);
    },
});
const logAccordionList = CDOM.ID('logAccordionList');
const logLoadMoreBtn = CDOM.ID('logLoadMoreBtn');
const logSearchInput = CDOM.ID('logSearchInput');
const logSourceLabel = CDOM.ID('logSourceLabel');
let logNextBefore = null;
let logSearchTerm = '';
const LOG_PAGE_SIZE = 15;
function logServerCtx() {
    const prefix = 'rdp:remote:';
    const remoteId = selectedRdpKey.startsWith(prefix) ? selectedRdpKey.slice(prefix.length) : '';
    return serverCtxOf(remoteId) ?? localServerCtx();
}
function logUpdateSource() {
    const ctx = logServerCtx();
    const addr = remoteEntryUrl(ctx.remoteId);
    logSourceLabel.className = 'small fw-normal text-truncate ' + (ctx.remoteId ? 'text-danger' : 'text-secondary');
    logSourceLabel.title = addr || CPath.WebRootUrl();
    logSourceLabel.textContent = ctx.remoteId ? addr : L('ctrl.local', 'Local');
}
function logOnServerChanged() {
    logUpdateSource();
    if (isPanelShown('log-panel'))
        logLoadSessions(true);
    loadAiProviderStatus();
}
function logRegexEscape(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function logHighlightText(raw, term) {
    const escapedRaw = aiEscapeHtml(raw);
    if (!term)
        return escapedRaw;
    const re = new RegExp(logRegexEscape(aiEscapeHtml(term)), 'gi');
    return escapedRaw.replace(re, m => `<span class="log-search-hit">${m}</span>`);
}
function logRenderMarkdown(raw) {
    return marked.parse(aiEscapeHtml(raw), { xhtml: false });
}
function logHighlightNode(root, term) {
    if (!term)
        return;
    const re = new RegExp(logRegexEscape(term), 'gi');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let n;
    while ((n = walker.nextNode()))
        textNodes.push(n);
    for (const node of textNodes) {
        const text = node.textContent ?? '';
        re.lastIndex = 0;
        if (!re.test(text))
            continue;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0;
        let m;
        while ((m = re.exec(text))) {
            if (m.index > last)
                frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            const span = document.createElement('span');
            span.className = 'log-search-hit';
            span.textContent = m[0];
            frag.appendChild(span);
            last = m.index + m[0].length;
        }
        if (last < text.length)
            frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode?.replaceChild(frag, node);
    }
}
function logItemMatchesTerm(item, term) {
    if (!term)
        return false;
    const t = term.toLowerCase();
    const preview = item.dataset.preview ?? '';
    if (preview.toLowerCase().includes(t))
        return true;
    const bodies = item.querySelectorAll('.log-body-text');
    for (const b of Array.from(bodies)) {
        if ((b.dataset.raw ?? '').toLowerCase().includes(t))
            return true;
    }
    return false;
}
function logUpdateItemMatchState(item, term) {
    const titleSpan = item.querySelector('.log-title-text');
    const header = item.querySelector('[data-act="toggle"]');
    if (!titleSpan || !header)
        return;
    const matched = logItemMatchesTerm(item, term);
    titleSpan.classList.toggle('text-primary', matched);
    titleSpan.classList.toggle('fw-semibold', matched);
    header.classList.toggle('bg-body-tertiary', !matched);
    header.classList.toggle('bg-primary-subtle', matched);
}
function logApplySearch(term) {
    logSearchTerm = term;
    const items = logAccordionList.querySelectorAll(':scope > div');
    items.forEach(item => {
        const titleSpan = item.querySelector('.log-title-text');
        if (!titleSpan)
            return;
        titleSpan.innerHTML = logHighlightText(item.dataset.preview ?? '', term);
    });
    logApplySearchToBodies(term);
    items.forEach(item => logUpdateItemMatchState(item, term));
}
function logApplySearchToBodies(term) {
    logAccordionList.querySelectorAll('.log-body-text').forEach(el => {
        const raw = el.dataset.raw ?? '';
        el.innerHTML = logRenderMarkdown(raw);
        logHighlightNode(el, term);
    });
}
logSearchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter')
        return;
    logApplySearch(logSearchInput.value.trim());
});
function logFormatTime(stamp) {
    const s = String(stamp);
    if (s.length < 14)
        return s;
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
}
async function logLoadSessionBody(ctx, sessionId, bodyEl) {
    try {
        const r = await ctxFetch(ctx, `cmd/log-session?sessionId=${encodeURIComponent(sessionId)}`);
        const j = await r.json();
        if (!j.ok) {
            bodyEl.innerHTML = `<span class="text-danger small">${aiEscapeHtml(j.msg ?? L('ctrl.failed', 'failed'))}</span>`;
            return;
        }
        const records = j.records ?? [];
        if (!records.length) {
            bodyEl.innerHTML = `<span class="text-secondary small">${L('ctrl.noMessages', 'No messages.')}</span>`;
            return;
        }
        bodyEl.innerHTML = records.map(rec => {
            if (rec.role === 'tool') {
                const toolName = (rec.tool || '?').trim();
                const filePath = (rec.file || '').trim();
                return `<div class="d-flex justify-content-start">` +
                    `<div class="px-2 py-1 rounded border bg-body-tertiary text-secondary" style="max-width:95%;font-size:0.82em;">` +
                    `<div style="font-size:0.68em;opacity:0.75;">${aiEscapeHtml(rec.provider)} &middot; ${logFormatTime(rec.createdAt)} &middot; tool</div>` +
                    `<div class="log-body-text" style="word-break:break-word;font-family:var(--bs-font-monospace);">` +
                    `<span class="badge text-bg-dark me-1">${aiEscapeHtml(toolName)}</span>` +
                    (filePath ? `<span class="text-body-secondary">${aiEscapeHtml(filePath)}</span>` : '') +
                    `</div></div></div>`;
            }
            const isUser = rec.role === 'user';
            return `<div class="d-flex ${isUser ? 'justify-content-end' : 'justify-content-start'}">` +
                `<div class="p-2 rounded ${isUser ? 'bg-primary text-white' : 'bg-secondary-subtle'}" style="max-width:85%;">` +
                `<div style="font-size:0.68em;opacity:0.75;">${aiEscapeHtml(rec.provider)} &middot; ${logFormatTime(rec.createdAt)}</div>` +
                `<div class="log-body-text" style="word-break:break-word;">${logRenderMarkdown(rec.text.trim())}</div>` +
                `</div></div>`;
        }).join('');
        bodyEl.querySelectorAll('.log-body-text').forEach((el, i) => {
            const rec = records[i];
            el.dataset.raw = rec.role === 'tool'
                ? `${(rec.tool || '').trim()} ${(rec.file || '').trim()}`.trim()
                : rec.text.trim();
            logHighlightNode(el, logSearchTerm);
        });
        const item = bodyEl.closest('[data-session-id]');
        if (item)
            logUpdateItemMatchState(item, logSearchTerm);
    }
    catch (e) {
        bodyEl.innerHTML = `<span class="text-danger small">${aiEscapeHtml(e?.message ?? String(e))}</span>`;
    }
}
function logCreateAccordionItem(ctx, entry) {
    const item = document.createElement('div');
    item.className = 'border rounded';
    item.dataset.sessionId = entry.name;
    const bodyId = `logBody_${entry.offset}`;
    const preview = entry.firstText.replace(/\s+/g, ' ').trim();
    item.dataset.preview = preview;
    item.innerHTML = `
        <div class="d-flex align-items-center gap-2 p-2 bg-body-tertiary rounded" style="cursor:pointer;" data-act="toggle">
            <i class="bi bi-chevron-right log-chevron flex-shrink-0"></i>
            <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex align-items-center gap-2">
                    <span class="badge text-bg-secondary flex-shrink-0">${aiEscapeHtml(entry.model || '?')}</span>
                    <span class="text-truncate small log-title-text">${aiEscapeHtml(preview)}</span>
                </div>
                <div class="text-truncate text-secondary" style="font-size:0.72em;">
                    <i class="bi bi-folder2"></i> ${aiEscapeHtml(entry.cwd || '-')} &middot; ${logFormatTime(entry.time)} &middot; <i class="bi bi-key"></i> ${aiEscapeHtml(entry.name)}
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-link text-danger p-0 flex-shrink-0" data-act="del" title="Delete"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="collapse" id="${bodyId}">
            <div class="p-2 border-top d-flex flex-column gap-2" style="max-height:700px;overflow-y:auto;" data-role="body">
                <div class="text-secondary small"><i class="bi bi-hourglass-split"></i> Loading...</div>
            </div>
        </div>
    `;
    let loaded = false;
    const toggleHeader = item.querySelector('[data-act="toggle"]');
    const collapseEl = item.querySelector(`#${bodyId}`);
    const chevron = item.querySelector('.log-chevron');
    const bsCollapse = new window.bootstrap.Collapse(collapseEl, { toggle: false });
    collapseEl.addEventListener('show.bs.collapse', () => { chevron.className = 'bi bi-chevron-down log-chevron'; });
    collapseEl.addEventListener('hide.bs.collapse', () => { chevron.className = 'bi bi-chevron-right log-chevron'; });
    toggleHeader.addEventListener('click', () => {
        bsCollapse.toggle();
        if (loaded)
            return;
        loaded = true;
        logLoadSessionBody(ctx, entry.name, item.querySelector('[data-role="body"]'));
    });
    item.querySelector('[data-act="del"]').addEventListener('click', (e) => {
        e.stopPropagation();
        const dlg = new CConfirm();
        dlg.SetBody(LF('ctrl.msg.deleteSessionLog', 'Delete all logs for session "{0}"?', aiEscapeHtml(entry.name)));
        dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
            async () => {
                await ctxFetch(ctx, `cmd/log-session-del?sessionId=${encodeURIComponent(entry.name)}`);
                bsCollapse.dispose();
                item.remove();
            },
            () => { },
        ], [L('ctrl.delete', 'Delete'), L('ctrl.cancel', 'Cancel')]);
        dlg.Open();
    });
    return item;
}
function logRenderAuthNotice(ctx) {
    const addr = remoteEntryUrl(ctx.remoteId);
    const box = document.createElement('div');
    box.className = 'text-secondary small d-flex align-items-center gap-2';
    box.innerHTML = `<span>${aiEscapeHtml(LF('ctrl.msg.logNeedsAuth', 'Authentication required for {0}.', addr))}</span>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-outline-primary';
    btn.textContent = L('ctrl.msg.authenticate', 'Authenticate');
    btn.addEventListener('click', () => rdpPromptRemoteAuth(ctx.apiUrl, () => logLoadSessions(true)));
    box.appendChild(btn);
    logAccordionList.appendChild(box);
}
async function logLoadSessions(reset) {
    if (reset) {
        logAccordionList.innerHTML = '';
        logNextBefore = null;
    }
    logUpdateSource();
    const ctx = logServerCtx();
    if (ctx.remoteId && !ctx.authToken) {
        logLoadMoreBtn.style.display = 'none';
        logRenderAuthNotice(ctx);
        return;
    }
    try {
        const url = 'cmd/log-sessions' + (logNextBefore ? `?before=${logNextBefore}` : '');
        const r = await ctxFetch(ctx, url);
        const j = await r.json();
        if (!j.ok)
            return;
        const sessions = j.sessions ?? [];
        for (const s of sessions)
            logAccordionList.appendChild(logCreateAccordionItem(ctx, s));
        logNextBefore = sessions.length ? sessions[sessions.length - 1].offset : logNextBefore;
        logLoadMoreBtn.style.display = sessions.length >= LOG_PAGE_SIZE ? '' : 'none';
    }
    catch (e) {
        console.error('logLoadSessions error:', e);
    }
}
CDOM.ID('log-tab').addEventListener('shown.bs.tab', () => logLoadSessions(true));
if (CDOM.ID('log-panel').classList.contains('active')) {
    logLoadSessions(true);
}
else
    logUpdateSource();
CDOM.ID('logRefreshBtn').addEventListener('click', () => logLoadSessions(true));
logLoadMoreBtn.addEventListener('click', () => logLoadSessions(false));
CDOM.ID('logClearBtn').addEventListener('click', () => {
    const ctx = logServerCtx();
    const dlg = new CConfirm();
    dlg.SetBody(L('ctrl.msg.deleteAllLogs', 'Delete ALL logs? This will remove every session and cannot be undone.')
        + `<div class="small text-secondary mt-1">${aiEscapeHtml(remoteEntryUrl(ctx.remoteId) || L('ctrl.local', 'Local'))}</div>`);
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        async () => {
            await ctxFetch(ctx, 'cmd/log-clear');
            logLoadSessions(true);
        },
        () => { },
    ], [L('ctrl.deleteAll', 'Delete All'), L('ctrl.cancel', 'Cancel')]);
    dlg.Open();
});
const memoTab = CDOM.ID("memo-tab");
const memoPanel = CDOM.ID("memo-panel");
let memoIframe = null;
let memoLoaded = false;
function memoEnsureLayout() {
    if (memoIframe)
        return;
    memoPanel.classList.add("position-relative");
    memoPanel.style.overflow = "hidden";
    memoIframe = document.createElement("iframe");
    memoIframe.id = "memo-iframe";
    memoIframe.style.cssText = "position:absolute; inset:0; width:100%; height:100%; border:none;";
    memoPanel.appendChild(memoIframe);
}
function memoLoadFrame() {
    memoEnsureLayout();
    if (memoLoaded)
        return;
    memoLoaded = true;
    const ctrlTheme = document.documentElement.getAttribute('data-bs-theme');
    const q = ctrlTheme ? `?theme=${encodeURIComponent(ctrlTheme)}` : '';
    memoIframe.src = `${CPath.WebRootArtgineUrl()}artgine/server/html/Memo.html${q}`;
}
memoEnsureLayout();
let memoInited = false;
function memoTryInit() {
    if (memoInited)
        return;
    memoInited = true;
    memoLoadFrame();
}
async function rdpSendRemoteGuide(webRootUrl, token) {
    try {
        const base = webRootUrl.replace(/\/+$/, '');
        await CFecth.Exe(CPath.WebRootUrl() + "RemoteCMD/Write", { addr: base + "/proj/Control/Control.html", token }, "json");
    }
    catch (e) {
        console.error("RemoteCMD/Write update failed:", e);
    }
}
async function rdpCheckRemoteAuth(webRootUrl) {
    return checkAuthed(webRootUrl);
}
let localAuthSettled = false;
let localAuthOk = false;
let localAuthInFlight = null;
async function ensureLocalAuth() {
    if (localAuthSettled)
        return localAuthOk;
    if (localAuthInFlight)
        return localAuthInFlight;
    const origin = CPath.WebRootUrl();
    const token = getAuthToken(origin);
    if (!token) {
        localAuthSettled = true;
        localAuthOk = false;
        return false;
    }
    localAuthInFlight = (async () => {
        try {
            const res = await fetch(origin + 'auth/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify({ token }),
            });
            if (!res.ok) {
                removeAuthToken(origin);
                localAuthSettled = true;
                localAuthOk = false;
                return false;
            }
            const j = await res.json().catch(() => null);
            if (j?.authed) {
                localAuthSettled = true;
                localAuthOk = true;
                return true;
            }
            removeAuthToken(origin);
            localAuthSettled = true;
            localAuthOk = false;
            return false;
        }
        catch {
            return false;
        }
        finally {
            localAuthInFlight = null;
        }
    })();
    return localAuthInFlight;
}
function markLocalAuthOk() {
    localAuthSettled = true;
    localAuthOk = true;
}
function markLocalAuthLost() {
    localAuthSettled = true;
    localAuthOk = false;
}
function rdpNormalizePassword(password) {
    return password.length < 64 ? CHash.SHA256('artgine_' + password) : password;
}
async function rdpEnsureRemoteAuth(remote) {
    if (!remote.password)
        return rdpCheckRemoteAuth(rdpRemoteWebRootUrl(remote.entryUrl));
    const webRootUrl = rdpRemoteWebRootUrl(remote.entryUrl);
    try {
        const j = await authLogin(webRootUrl, rdpNormalizePassword(remote.password));
        if (!j.ok || !j.token)
            return false;
        setAuthToken(webRootUrl, j.token);
        return true;
    }
    catch {
        return false;
    }
}
const gAuthPromptCallbacks = new Map();
function rdpPromptRemoteAuth(webRootUrl, onSuccess) {
    const existing = gAuthPromptCallbacks.get(webRootUrl);
    if (existing) {
        if (onSuccess)
            existing.push(onSuccess);
        return;
    }
    const callbacks = onSuccess ? [onSuccess] : [];
    gAuthPromptCallbacks.set(webRootUrl, callbacks);
    const releaseAuthPrompt = () => { gAuthPromptCallbacks.delete(webRootUrl); };
    const dlg = new CConfirm();
    dlg.SetBody(`${L('ctrl.msg.enterAdminPassword', 'Enter admin password:')}<br><input type="password" id="AuthPassword" class="form-control form-control-sm">`);
    const doAuth = () => {
        const pw = CDOM.IDValue("AuthPassword");
        authLogin(webRootUrl, CHash.SHA256('artgine_' + pw), () => {
            CAlert.Info(L('ctrl.msg.waitingTwoFactor', 'Waiting for messenger approval (up to 5 minutes)...'));
        }).then((j) => {
            if (j.ok) {
                setAuthToken(webRootUrl, j.token);
                CAlert.Info(L('ctrl.msg.permissionGranted', 'Permission granted'));
                if (pw === "artgine") {
                    CAlert.Warning(L('ctrl.msg.defaultPassword', 'You are using the default password. Please change it for security.'));
                }
                if (webRootUrl === CPath.WebRootUrl()) {
                    markLocalAuthOk();
                    rdpLoadRemotes();
                }
                else {
                    rdpSendRemoteGuide(webRootUrl, j.token);
                    const remote = rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === webRootUrl);
                    if (remote)
                        refreshRemoteRoots(remote);
                }
                releaseAuthPrompt();
                callbacks.forEach(cb => cb());
            }
            else {
                releaseAuthPrompt();
                CAlert.E(LF('ctrl.msg.wrongPassword', 'Wrong password: {0}', j.msg ?? ''));
            }
        }).catch(() => {
            releaseAuthPrompt();
            CAlert.E(L('ctrl.msg.serverError', 'Server error'));
        });
    };
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        doAuth,
        releaseAuthPrompt,
    ], [L('ctrl.ok', 'OK'), L('ctrl.cancel', 'Cancel')]);
    dlg.On(CEvent.eType.Close, releaseAuthPrompt);
    dlg.Open();
    setTimeout(() => {
        const input = CDOM.ID("AuthPassword");
        input?.focus();
        input?.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter')
                return;
            e.preventDefault();
            doAuth();
            dlg.Close();
        });
    }, MODAL_DOM_DELAY);
}
function ctrlRequireAuthed() {
    if (getAuthToken(CPath.WebRootUrl()))
        return true;
    rdpPromptRemoteAuth(CPath.WebRootUrl());
    CAlert.Warning(L('ctrl.msg.authRequired', 'Authentication required. Please sign in first.'));
    return false;
}
window.ctrlRequireAuthed = ctrlRequireAuthed;
['rdp-panel-tab', 'chat-panel-tab', 'browser-panel-tab', 'editor-panel-tab', 'term-tab', 'memo-tab', 'log-tab', 'messenger-tab'].forEach((tabId) => {
    CDOM.ID(tabId)?.addEventListener('show.bs.tab', (e) => {
        if (!ctrlRequireAuthed())
            e.preventDefault();
    });
});
function renderSignInPrompt(container, onSuccess) {
    container.innerHTML = `
        <div class="text-center text-secondary small p-3 d-flex flex-column align-items-center gap-2">
            <div>${L('ctrl.msg.signInRequired', 'Sign in required.')}</div>
            <button type="button" class="btn btn-sm btn-outline-primary sign-in-btn">${L('ctrl.signIn', 'Sign In')}</button>
        </div>`;
    container.querySelector('.sign-in-btn').addEventListener('click', () => {
        rdpPromptRemoteAuth(CPath.WebRootUrl(), onSuccess);
    });
}
async function memoSendRemoteInfo() {
    const baseUrl = currentWebRootUrl;
    if (!baseUrl) {
        if (memoIframe?.contentWindow)
            CIframeMsg.Send(memoIframe.contentWindow, 'set-remote', { baseUrl: '', token: '' });
        return;
    }
    const remote = rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === baseUrl);
    const authed = remote?.password ? await rdpEnsureRemoteAuth(remote) : await rdpCheckRemoteAuth(baseUrl);
    if (!authed) {
        rdpPromptRemoteAuth(baseUrl, () => {
            if (currentWebRootUrl !== baseUrl)
                return;
            if (memoIframe?.contentWindow)
                CIframeMsg.Send(memoIframe.contentWindow, 'set-remote', { baseUrl, token: getAuthToken(baseUrl) });
        });
        return;
    }
    if (memoIframe?.contentWindow)
        CIframeMsg.Send(memoIframe.contentWindow, 'set-remote', { baseUrl, token: getAuthToken(baseUrl) });
}
memoTab.addEventListener("shown.bs.tab", () => {
    memoTryInit();
    if (memoIframe?.contentWindow)
        CIframeMsg.Send(memoIframe.contentWindow, 'open-sidebar');
    memoIframe?.contentWindow?.focus();
    memoSendRemoteInfo();
});
memoTab.addEventListener("click", () => {
    if (memoIframe?.contentWindow)
        CIframeMsg.Send(memoIframe.contentWindow, 'open-sidebar');
});
if (memoTab.classList.contains("active"))
    memoTryInit();
const agentSidebarList = CDOM.ID("agent-sidebar-list");
const otherSidebarList = CDOM.ID("other-sidebar-list");
const agentAddFolderBtn = CDOM.ID("agentAddFolderBtn");
const SB_TAB_LS = 'ctrl.sidebar.subtab';
const SB_COLLAPSE_LS = 'ctrl.sidebar.collapsed';
function sbSafeArr(s) { try {
    const a = JSON.parse(s || '[]');
    return Array.isArray(a) ? a.map(String) : [];
}
catch {
    return [];
} }
let sbSubTab = localStorage.getItem(SB_TAB_LS) === 'other' ? 'other' : 'agent';
const collapsedGroups = new Set(sbSafeArr(localStorage.getItem(SB_COLLAPSE_LS)));
function saveCollapsedGroups() { localStorage.setItem(SB_COLLAPSE_LS, JSON.stringify(Array.from(collapsedGroups))); }
function applySidebarSubTab() {
    agentSidebarList.classList.toggle('d-none', sbSubTab !== 'agent');
    agentAddFolderBtn.classList.toggle('d-none', sbSubTab !== 'agent');
    otherSidebarList.classList.toggle('d-none', sbSubTab !== 'other');
    CDOM.ID('sb-agent-tab').classList.toggle('active', sbSubTab === 'agent');
    CDOM.ID('sb-other-tab').classList.toggle('active', sbSubTab === 'other');
}
CDOM.ID('sb-agent-tab').addEventListener('click', () => { sbSubTab = 'agent'; localStorage.setItem(SB_TAB_LS, 'agent'); applySidebarSubTab(); });
CDOM.ID('sb-other-tab').addEventListener('click', () => { sbSubTab = 'other'; localStorage.setItem(SB_TAB_LS, 'other'); applySidebarSubTab(); });
applySidebarSubTab();
let sessionOrderFrozen = false;
let frozenSessionOrder = [];
let frozenAgentGroupOrder = [];
let frozenAgentItemOrder = [];
function freezeSessionOrder(on) {
    if (sessionOrderFrozen === on)
        return;
    sessionOrderFrozen = on;
    if (!on)
        renderSessionSidebar();
}
for (const lst of [agentSidebarList, otherSidebarList]) {
    lst.addEventListener('pointerenter', () => freezeSessionOrder(true));
    lst.addEventListener('pointerleave', () => freezeSessionOrder(false));
    lst.addEventListener('pointerdown', () => freezeSessionOrder(true));
}
const agentGroupEls = new Map();
function agentGroupKey(wd) { return ctrlNormPath(wd || './') || '.'; }
function agentGroupPathText(key) { return key === '.' ? './' : key; }
function parseGroupKey(key) {
    if (key.startsWith('remote:')) {
        const rest = key.slice('remote:'.length);
        const i = rest.indexOf(':');
        const remoteId = i >= 0 ? rest.slice(0, i) : rest;
        const base = i >= 0 ? rest.slice(i + 1) : '';
        return { remoteId, pathText: agentGroupPathText(base) };
    }
    return { remoteId: '', pathText: agentGroupPathText(key) };
}
function clearAgentGroups() { for (const el of agentGroupEls.values())
    destroyAgentGroup(el); agentGroupEls.clear(); }
function createAgentGroup(key) {
    const wrap = document.createElement('div');
    wrap.className = 'agent-group';
    wrap._key = key;
    wrap.innerHTML = `
        <div class="agent-group-head d-flex align-items-center gap-1 px-1 py-1 rounded">
            <i class="bi bi-chevron-down agent-group-caret flex-shrink-0"></i>
            <span class="flex-grow-1" style="min-width:0;overflow:hidden;display:flex;flex-direction:column;">
                <span class="agent-group-addr" style="display:none;"></span>
                <span class="agent-group-path"><span></span></span>
            </span>
            <span class="agent-group-count text-secondary flex-shrink-0" style="font-size:0.7rem;"></span>
            <span class="agent-group-hidden text-secondary flex-shrink-0" style="font-size:0.65rem;" title=""></span>
            <div class="dropdown flex-shrink-0">
                <button class="agent-group-add btn btn-sm btn-link text-secondary p-0 px-1" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="New"><i class="bi bi-three-dots"></i></button>
                <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark">
                    <li><button class="dropdown-item" data-new="chat"><i class="bi bi-chat-dots"></i> Chat</button></li>
                    <li><button class="dropdown-item" data-new="term"><i class="bi bi-terminal"></i> Terminal</button></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button class="dropdown-item" data-new="search"><i class="bi bi-search"></i> Search</button></li>
                </ul>
            </div>
        </div>
        <div class="agent-group-body d-flex flex-column gap-1"></div>`;
    const head = wrap.querySelector('.agent-group-head');
    head.addEventListener('click', (e) => {
        if (e.target.closest('.dropdown'))
            return;
        if (collapsedGroups.has(wrap._key))
            collapsedGroups.delete(wrap._key);
        else
            collapsedGroups.add(wrap._key);
        saveCollapsedGroups();
        wrap.classList.toggle('agent-group-collapsed', collapsedGroups.has(wrap._key));
    });
    const addBtn = wrap.querySelector('[data-bs-toggle="dropdown"]');
    new window.bootstrap.Dropdown(addBtn, { popperConfig: { strategy: 'fixed' } });
    wrap.querySelector('[data-new="chat"]').addEventListener('click', () => { const g = parseGroupKey(wrap._key); chatStartNew(g.pathText, g.remoteId); });
    wrap.querySelector('[data-new="term"]').addEventListener('click', () => { const g = parseGroupKey(wrap._key); termStartNew('cmd', g.pathText, g.remoteId); });
    wrap.querySelector('[data-new="search"]').addEventListener('click', () => {
        if (ctrlGroupSearchScope(wrap._key))
            ctrlFileSearch(wrap._key);
    });
    return wrap;
}
function destroyAgentGroup(el) {
    const toggle = el.querySelector('[data-bs-toggle="dropdown"]');
    if (toggle)
        window.bootstrap.Dropdown.getInstance(toggle)?.dispose();
    el.remove();
}
function updateAgentGroupHeader(el, meta) {
    const head = el.querySelector('.agent-group-head');
    head.classList.toggle('agent-group-remote', !!meta.remoteLabel);
    head.style.cssText = meta.remoteLabel ? rdpAccentStyle(meta.remoteId ?? meta.remoteLabel) : '';
    const addrEl = el.querySelector('.agent-group-addr');
    addrEl.style.display = meta.remoteLabel ? 'block' : 'none';
    addrEl.textContent = meta.remoteLabel ?? '';
    el.querySelector('.agent-group-path > span').textContent = meta.pathText;
}
async function refreshLocalRoots() {
    try {
        const data = await CFecth.Exe(CPath.WebRootUrl() + "File/Root", {}, "json");
        localRootOpts = (data.roots ?? []).map(r => r.name === './' ? { ...r, name: 'Artgine (WorkingPath)' } : r);
        renderSessionSidebar();
        ctrlSyncSideFileRootSel();
    }
    catch { }
}
async function refreshRemoteRoots(r) {
    const webRootUrl = rdpRemoteWebRootUrl(r.entryUrl);
    if (!(await rdpEnsureRemoteAuth(r))) {
        if (remoteRootsCache.delete(r.remoteId)) {
            renderSessionSidebar();
            ctrlSyncSideFileRootSel();
        }
        rdpNoteFetchFailure(r);
        return;
    }
    try {
        const token = getAuthToken(webRootUrl);
        const data = await CFecth.Exe(webRootUrl + "File/Root", token ? { token } : {}, "json");
        remoteRootsCache.set(r.remoteId, data.roots ?? []);
        renderSessionSidebar();
        ctrlSyncSideFileRootSel();
    }
    catch {
        rdpNoteFetchFailure(r);
    }
}
function refreshAllRemoteRoots() { refreshLocalRoots(); rdpRemotes.forEach(refreshRemoteRoots); }
async function rdpHandleReconnect(remote) {
    await refreshRemoteRoots(remote);
    const webRootUrl = rdpRemoteWebRootUrl(remote.entryUrl);
    if (currentWebRootUrl === webRootUrl)
        await ctrlRefreshRootSelect();
}
const RDP_OFFLINE_POLL_MS = 15000;
let rdpOfflinePollTimer = null;
function rdpEnsureOfflinePolling() {
    if (rdpOfflinePollTimer != null)
        return;
    rdpOfflinePollTimer = setInterval(async () => {
        const offlineRemotes = rdpRemotes.filter(r => rdpStatus.get(r.remoteId) === 'offline');
        if (!offlineRemotes.length) {
            clearInterval(rdpOfflinePollTimer);
            rdpOfflinePollTimer = null;
            return;
        }
        for (const r of offlineRemotes) {
            const st = await rdpProbeRemote(r.entryUrl);
            if (!rdpRemotes.some(x => x.remoteId === r.remoteId))
                continue;
            if (st === 'offline')
                continue;
            rdpStatus.set(r.remoteId, st);
            rdpRenderList();
            rdpHandleReconnect(r);
        }
    }, RDP_OFFLINE_POLL_MS);
}
function rdpClearRemoteSessions(remoteId) {
    remoteRootsCache.delete(remoteId);
    for (const [key, f] of Array.from(termIframePool.entries())) {
        if (!key.startsWith('term:') || keyRemoteId(key) !== remoteId)
            continue;
        f.remove();
        termIframePool.delete(key);
        tmuxAllFrames.delete(key);
        tmuxClearIfShowing(key);
        if (activeTermFrameKey === key) {
            activeTermFrameKey = null;
            updateTermFramePlaceholder();
        }
    }
    if (lastTermSessions)
        lastTermSessions = lastTermSessions.filter(s => s.remoteId !== remoteId);
    for (const [key, f] of Array.from(chatIframePool.entries())) {
        if (keyRemoteId(key) !== remoteId)
            continue;
        f.remove();
        chatIframePool.delete(key);
        tmuxAllFrames.delete(key);
        tmuxClearIfShowing(key);
        if (activeChatFrameKey === key) {
            activeChatFrameKey = null;
            updateChatFramePlaceholder();
        }
    }
    if (lastChatSessions)
        lastChatSessions = lastChatSessions.filter(s => s.remoteId !== remoteId);
    for (const [key, s] of Array.from(browserSessions.entries())) {
        if (s.remoteId !== remoteId)
            continue;
        browserSessions.delete(key);
        destroyBrowserFrame(key);
    }
    renderSessionSidebar();
}
async function rdpNoteFetchFailure(remote) {
    const prev = rdpStatus.get(remote.remoteId);
    const st = await rdpProbeRemote(remote.entryUrl);
    if (!rdpRemotes.some(x => x.remoteId === remote.remoteId))
        return;
    if (st === prev)
        return;
    rdpStatus.set(remote.remoteId, st);
    rdpRenderList();
    if (st === 'offline') {
        rdpClearRemoteSessions(remote.remoteId);
        rdpEnsureOfflinePolling();
    }
    else
        rdpHandleReconnect(remote);
}
function noteSessionFetchFailure(remoteId) {
    if (!remoteId)
        return;
    const remote = rdpRemotes.find(r => r.remoteId === remoteId);
    if (remote)
        rdpNoteFetchFailure(remote);
}
function localServerCtx() {
    return { remoteId: '', apiUrl: CPath.WebRootUrl(), artgineUrl: CPath.WebRootArtgineUrl(), authToken: '' };
}
function remoteServerCtx(r) {
    const base = rdpRemoteWebRootUrl(r.entryUrl);
    return { remoteId: r.remoteId, apiUrl: base, artgineUrl: base, authToken: getAuthToken(base) };
}
function serverCtxOf(remoteId) {
    if (!remoteId)
        return localServerCtx();
    const r = rdpRemotes.find(x => x.remoteId === remoteId);
    return r ? remoteServerCtx(r) : null;
}
function remoteEntryUrl(remoteId) {
    return remoteId ? (rdpRemotes.find(r => r.remoteId === remoteId)?.entryUrl || '') : '';
}
function sessionServerCtxs() {
    return [localServerCtx(), ...rdpRemotes.map(remoteServerCtx).filter(c => !!c.authToken)];
}
function ctxApiUrl(ctx, apiPath) {
    const url = ctx.apiUrl + apiPath;
    if (!ctx.authToken)
        return url;
    return url + (url.includes('?') ? '&' : '?') + 'authToken=' + encodeURIComponent(ctx.authToken);
}
const REMOTE_FETCH_TIMEOUT_MS = 8000;
function ctxFetch(ctx, apiPath, init) {
    const url = ctxApiUrl(ctx, apiPath);
    if (!ctx.remoteId)
        return fetch(url, init);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REMOTE_FETCH_TIMEOUT_MS);
    return fetch(url, { ...init, signal: ac.signal }).finally(() => clearTimeout(timer));
}
function sessKey(prefix, remoteId, id) {
    return remoteId ? `${prefix}:${remoteId}:${id}` : `${prefix}:${id}`;
}
function keyRemoteId(key) {
    const parts = key.split(':');
    return parts.length >= 3 ? parts[1] : '';
}
function parseSessKey(key) {
    const parts = key.split(':');
    return parts.length >= 3 ? { remoteId: parts[1], id: parts.slice(2).join(':') } : { remoteId: '', id: parts.slice(1).join(':') };
}
function sessionGroupKey(remoteId, workingDir) {
    const base = agentGroupKey(workingDir);
    return remoteId ? `remote:${remoteId}:${base}` : base;
}
let _activeNotifCallback = null;
function _showModalStackMsg(label, content, onClick) {
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
                onClick();
                m.Close();
                _activeNotifCallback = null;
            });
        }, 0);
    }
    m.Close(2);
    setTimeout(() => { if (_activeNotifCallback === onClick)
        _activeNotifCallback = null; }, 2000);
}
const NOTIF_LOG_MAX = 7;
const notifLogEl = document.getElementById('aiNotifLog');
function _pushNotifLog(label, content, onClick, idInfo) {
    if (!notifLogEl)
        return;
    const row = document.createElement('div');
    row.className = 'small rounded px-2 py-2 notif-row notif-flash';
    if (onClick)
        row.style.cursor = 'pointer';
    row.innerHTML = `${idInfo ? `<div class="text-secondary text-truncate" style="font-size:0.65rem;font-family:monospace;">${idInfo}</div>` : ''}<div class="fw-semibold text-truncate">${label}</div>${content ? `<div class="text-secondary text-truncate">${content}</div>` : ''}`;
    if (onClick)
        row.addEventListener('click', onClick);
    notifLogEl.prepend(row);
    while (notifLogEl.children.length > NOTIF_LOG_MAX)
        notifLogEl.lastElementChild?.remove();
}
function _showDoneNotification(label, content, onClick, idInfo, suppressToast) {
    _pushNotifLog(label, content, onClick, idInfo);
    if (suppressToast)
        return;
    if (!document.hasFocus()) {
        CUtilWeb.Notify(label, content ?? "", "", onClick ? () => onClick() : null).then(failed => {
            if (!failed)
                return;
            _showModalStackMsg(label, content, onClick);
        });
    }
    else {
        _showModalStackMsg(label, content, onClick);
    }
}
const _sessState = new Map();
function syncSessState(id, cur, onDone, onWait) {
    const prev = _sessState.get(id);
    if ((prev === 'busy' || prev === 'wait') && cur === 'idle')
        onDone();
    if (prev !== 'wait' && cur === 'wait')
        onWait?.();
    _sessState.set(id, cur);
}
let chatAuthState = 'unknown';
let termAuthState = 'unknown';
let browserAuthState = 'unknown';
let lastChatSessions = null;
let lastTermSessions = null;
function tmuxPaneRole(key) {
    if (!tmuxTreeReady)
        return null;
    const mainId = tmuxFirstPaneId();
    let role = null;
    (function walk(p) {
        if (role === 'main')
            return;
        if (p.split && p.children) {
            walk(p.children[0]);
            walk(p.children[1]);
            return;
        }
        if (p.contentKey !== key)
            return;
        role = p.id === mainId ? 'main' : 'sub';
    })(tmuxRoot);
    return role;
}
function sessActiveFromKey(key) {
    const role = tmuxPaneRole(key);
    return {
        activeClass: role === 'main' ? 'ai-session-item-active-main' : 'ai-session-item-active-sub',
        isActive: role != null,
    };
}
function refreshRdpHighlights() {
    for (const el of Array.from(rdpSidebarList.querySelectorAll('.ai-session-item'))) {
        const key = el.dataset.key || (el.dataset.id ? `rdp:remote:${el.dataset.id}` : '');
        if (key)
            applySessActiveClasses(el, sessActiveFromKey(key));
    }
}
let sessionRenderQueued = false;
function renderSessionSidebar() {
    if (sessionRenderQueued)
        return;
    sessionRenderQueued = true;
    requestAnimationFrame(() => { sessionRenderQueued = false; flushSessionSidebar(); });
}
const sessionItemEls = new Map();
let sessionSidebarSignedOut = false;
function clearSessionItems() {
    for (const el of sessionItemEls.values())
        destroySessionItem(el);
    sessionItemEls.clear();
}
function flushSessionSidebar() {
    if (document.hidden)
        return;
    if (chatAuthState === 'signin' || termAuthState === 'signin' || browserAuthState === 'signin') {
        if (!sessionSidebarSignedOut) {
            sessionSidebarSignedOut = true;
            clearSessionItems();
            clearAgentGroups();
            otherSidebarList.innerHTML = '';
            renderSignInPrompt(agentSidebarList, () => { chatRenderList(); termRenderList(); browserRefreshList(); });
        }
        return;
    }
    if (sessionSidebarSignedOut) {
        sessionSidebarSignedOut = false;
        agentSidebarList.innerHTML = '';
        otherSidebarList.innerHTML = '';
    }
    const agentEntries = [];
    if (lastChatSessions)
        for (const s of lastChatSessions)
            agentEntries.push({ key: sessKey('chat', s.remoteId, s.sessionId), groupKey: sessionGroupKey(s.remoteId, s.workingDir), sortKey: s.updatedAt ?? 0, spec: chatItemSpec(s) });
    const hiddenByGroup = new Map();
    if (lastTermSessions)
        for (const s of lastTermSessions) {
            const groupKey = sessionGroupKey(s.remoteId, s.workingDir);
            if (hideSubAgentSessions && s.hidden) {
                hiddenByGroup.set(groupKey, (hiddenByGroup.get(groupKey) ?? 0) + 1);
                continue;
            }
            agentEntries.push({ key: sessKey('term', s.remoteId, s.token), groupKey, sortKey: s.updatedAt ?? 0, spec: termItemSpec(s) });
        }
    const otherEntries = [];
    for (const s of browserSessions.values())
        otherEntries.push({ key: sessKey('browser', s.remoteId, s.sessionId), sortKey: s.updatedAt ?? s.createdAt ?? 0, spec: browserItemSpec(s) });
    for (const s of editorSessions.values())
        otherEntries.push({ key: s.key, sortKey: s.openedAt, spec: editorItemSpec(s) });
    for (const s of webSessions.values())
        otherEntries.push({ key: s.key, sortKey: s.openedAt, spec: webItemSpec(s) });
    otherEntries.sort((a, b) => b.sortKey - a.sortKey);
    const live = new Set();
    for (const e of agentEntries)
        live.add(e.key);
    for (const e of otherEntries)
        live.add(e.key);
    for (const [key, el] of Array.from(sessionItemEls)) {
        if (!live.has(key)) {
            destroySessionItem(el);
            sessionItemEls.delete(key);
        }
    }
    const frozen = sessionOrderFrozen
        || !!agentSidebarList.querySelector('.dropdown-menu.show')
        || !!otherSidebarList.querySelector('.dropdown-menu.show');
    renderAgentGroups(agentEntries, frozen, hiddenByGroup);
    renderOtherList(otherEntries, frozen);
}
function renderAgentGroups(entries, frozen, hiddenByGroup) {
    const byGroup = new Map();
    for (const e of entries) {
        let arr = byGroup.get(e.groupKey);
        if (!arr) {
            arr = [];
            byGroup.set(e.groupKey, arr);
        }
        arr.push(e);
    }
    const regSet = new Set();
    const registered = [];
    const groupMeta = new Map();
    for (const r of localRootOpts) {
        const k = agentGroupKey(r.path);
        if (!regSet.has(k)) {
            regSet.add(k);
            registered.push(k);
            groupMeta.set(k, { pathText: agentGroupPathText(k) });
        }
    }
    for (const remote of rdpRemotes) {
        const roots = remoteRootsCache.get(remote.remoteId);
        if (!roots)
            continue;
        for (const ro of roots) {
            const base = agentGroupKey(ro.path);
            const k = `remote:${remote.remoteId}:${base}`;
            if (!regSet.has(k)) {
                regSet.add(k);
                registered.push(k);
                groupMeta.set(k, { pathText: agentGroupPathText(base), remoteLabel: remote.entryUrl, remoteId: remote.remoteId });
            }
        }
    }
    const adhocKeys = new Set(byGroup.keys());
    for (const k of hiddenByGroup.keys())
        adhocKeys.add(k);
    const adhoc = Array.from(adhocKeys).filter(k => !regSet.has(k));
    adhoc.sort((a, b) => (byGroup.get(b)?.[0]?.sortKey ?? 0) - (byGroup.get(a)?.[0]?.sortKey ?? 0));
    let groupOrder = [...registered, ...adhoc];
    const naturalItemOrder = [];
    for (const arr of byGroup.values()) {
        arr.sort((a, b) => b.sortKey - a.sortKey);
        for (const e of arr)
            naturalItemOrder.push(e.key);
    }
    if (frozen) {
        const grank = new Map(frozenAgentGroupOrder.map((k, i) => [k, i]));
        groupOrder = groupOrder.slice().sort((a, b) => (grank.get(a) ?? Number.MAX_SAFE_INTEGER) - (grank.get(b) ?? Number.MAX_SAFE_INTEGER));
        const irank = new Map(frozenAgentItemOrder.map((k, i) => [k, i]));
        for (const arr of byGroup.values())
            arr.sort((a, b) => (irank.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (irank.get(b.key) ?? Number.MAX_SAFE_INTEGER));
    }
    else {
        frozenAgentGroupOrder = groupOrder.slice();
        frozenAgentItemOrder = naturalItemOrder;
    }
    for (const [k, el] of Array.from(agentGroupEls)) {
        if (!regSet.has(k) && !byGroup.has(k) && !hiddenByGroup.has(k)) {
            destroyAgentGroup(el);
            agentGroupEls.delete(k);
        }
    }
    let gcursor = agentSidebarList.firstElementChild;
    for (const k of groupOrder) {
        let g = agentGroupEls.get(k);
        if (!g) {
            g = createAgentGroup(k);
            agentGroupEls.set(k, g);
        }
        let meta = groupMeta.get(k);
        if (!meta) {
            const pg = parseGroupKey(k);
            meta = { pathText: pg.pathText, remoteLabel: pg.remoteId ? remoteEntryUrl(pg.remoteId) : undefined, remoteId: pg.remoteId };
        }
        updateAgentGroupHeader(g, meta);
        const items = byGroup.get(k) ?? [];
        g.querySelector('.agent-group-count').textContent = items.length ? String(items.length) : '';
        const hiddenCount = hiddenByGroup.get(k) ?? 0;
        const hiddenEl = g.querySelector('.agent-group-hidden');
        hiddenEl.textContent = hiddenCount ? `+${hiddenCount} \u{1F916}` : '';
        hiddenEl.title = hiddenCount ? `${hiddenCount} hidden sub agent session(s)` : '';
        g.classList.toggle('agent-group-collapsed', collapsedGroups.has(k));
        if (g === gcursor)
            gcursor = gcursor.nextElementSibling;
        else
            agentSidebarList.insertBefore(g, gcursor);
        const body = g.querySelector('.agent-group-body');
        let icursor = body.firstElementChild;
        for (const e of items) {
            let el = sessionItemEls.get(e.key);
            if (!el) {
                el = createSessionItem(e.spec);
                sessionItemEls.set(e.key, el);
            }
            else
                updateSessionItem(el, e.spec);
            if (el === icursor)
                icursor = icursor.nextElementSibling;
            else
                body.insertBefore(el, icursor);
        }
    }
}
function renderOtherList(entries, frozen) {
    let ordered = entries;
    if (frozen) {
        const rank = new Map(frozenSessionOrder.map((k, i) => [k, i]));
        ordered = entries.slice().sort((a, b) => (rank.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.key) ?? Number.MAX_SAFE_INTEGER));
    }
    else {
        frozenSessionOrder = entries.map(e => e.key);
    }
    let cursor = otherSidebarList.firstElementChild;
    for (const e of ordered) {
        let el = sessionItemEls.get(e.key);
        if (!el) {
            el = createSessionItem(e.spec);
            sessionItemEls.set(e.key, el);
        }
        else
            updateSessionItem(el, e.spec);
        if (el === cursor)
            cursor = cursor.nextElementSibling;
        else
            otherSidebarList.insertBefore(el, cursor);
    }
}
function authedFetch(url, init) {
    return fetch(url, init);
}
function chatFormatRelative(ts) {
    if (!ts)
        return '';
    const diff = Date.now() - ts;
    if (diff < 0 || isNaN(diff))
        return '';
    const s = Math.floor(diff / 1000);
    if (s < 60)
        return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30)
        return `${d}d`;
    const mo = Math.floor(d / 30);
    if (mo < 12)
        return `${mo}mo`;
    return `${Math.floor(mo / 12)}y`;
}
const chatFrameContainer = CDOM.ID("chat-frame-container");
const chatFramePlaceholder = CDOM.ID("chat-frame-placeholder");
const chatIframePool = new Map();
let activeChatFrameKey = null;
function updateChatFramePlaceholder() {
    chatFramePlaceholder.classList.toggle('chat-frame-placeholder-hidden', !!activeChatFrameKey);
}
const chatFrameCtx = {
    pool: chatIframePool,
    container: chatFrameContainer,
    getActiveKey: () => activeChatFrameKey,
    setActiveKey: (key) => { activeChatFrameKey = key; },
    updatePlaceholder: updateChatFramePlaceholder,
    onCreate: wirePooledFrameHotkeys,
};
function showChatFrame(key, src) {
    return showPooledFrame(chatFrameCtx, key, src);
}
function chatActivatePane() {
    activatePaneUnlessMultiplexer('chat-panel-tab', 'Chat');
}
const editorFrameContainer = CDOM.ID("editor-frame-container");
const editorFramePlaceholder = CDOM.ID("editor-frame-placeholder");
const editorIframePool = new Map();
let activeEditorFrameKey = null;
function updateEditorFramePlaceholder() {
    editorFramePlaceholder.classList.toggle('editor-frame-placeholder-hidden', !!activeEditorFrameKey);
}
const editorFrameCtx = {
    pool: editorIframePool,
    container: editorFrameContainer,
    getActiveKey: () => activeEditorFrameKey,
    setActiveKey: (key) => { activeEditorFrameKey = key; },
    updatePlaceholder: updateEditorFramePlaceholder,
};
function showEditorFrame(key, src) {
    return showPooledFrame(editorFrameCtx, key, src);
}
function editorActivatePane() {
    activatePaneUnlessMultiplexer('editor-panel-tab', 'Editor');
}
const editorSessions = new Map();
function editorFrameSrc(s) {
    const root = s.baseUrl || CPath.WebRootArtgineUrl();
    return `${root}artgine/server/html/Editor.html?path=${encodeURIComponent(s.path)}&url=${encodeURIComponent(s.url)}`;
}
function editorOpenFile(path, baseUrl, url) {
    const key = `editor:${baseUrl}|${path}`;
    let s = editorSessions.get(key);
    if (!s) {
        s = { key, path, baseUrl, url, openedAt: Date.now(), dirty: false };
        editorSessions.set(key, s);
    }
    else {
        s.url = url;
        s.openedAt = Date.now();
    }
    editorActivatePane();
    showEditorFrame(key, editorFrameSrc(s));
    renderSessionSidebar();
}
function termNormAbsPath(p) {
    return p.replace(/\\/g, '/').replace(/\/+$/, '');
}
async function termOpenTappedPath(tappedPath, token) {
    if (!tappedPath)
        return;
    const sess = lastTermSessions?.find(s => s.token === token);
    const workingDir = sess?.workingDir || '';
    const isAbsolute = /^[A-Za-z]:[\\/]/.test(tappedPath);
    const fullPath = isAbsolute
        ? tappedPath
        : workingDir
            ? `${termNormAbsPath(workingDir)}/${tappedPath.replace(/\\/g, '/')}`
            : '';
    if (!fullPath) {
        CAlert.E(LF('ctrl.msg.cannotOpenUnknownWd', 'Cannot open path — working directory is unknown: {0}', tappedPath));
        return;
    }
    const ctx = serverCtxOf(sess?.remoteId || '') ?? localServerCtx();
    try {
        const data = await CFecth.Exe(ctx.apiUrl + "File/Root", ctx.authToken ? { token: ctx.authToken } : {}, "json");
        const normFull = termNormAbsPath(fullPath);
        const normFullLower = normFull.toLowerCase();
        const root = (data.roots || []).find(r => {
            const rp = termNormAbsPath(r.path).toLowerCase();
            return normFullLower === rp || normFullLower.startsWith(rp + '/');
        });
        if (!root) {
            CAlert.E(LF('ctrl.msg.cannotOpenNotRoot', 'Cannot open path — not under a registered root: {0}', fullPath));
            return;
        }
        const relPath = normFull.slice(termNormAbsPath(root.path).length);
        const downBase = new URL(root.url, ctx.apiUrl).href.replace(/\/+$/, '');
        const url = downBase + relPath.split('/').map(encodeURIComponent).join('/');
        promptSourceAction(fullPath, ctx.remoteId ? ctx.apiUrl : '', url);
    }
    catch (e) {
        console.error('termOpenTappedPath error:', e);
        CAlert.E(L('ctrl.msg.openPathError', 'An error occurred while opening the path.'));
    }
}
function fileExtOf(path) {
    const m = /\.([a-zA-Z0-9]+)$/.exec(path);
    return m ? m[1].toLowerCase() : '';
}
function executeOpenedSource(fullPath, url) {
    window.open(url, "_blank");
}
async function ctrlSaveOpenedSheet(filePath, base64, baseUrl) {
    const fileName = filePath.split('/').pop() ?? filePath;
    const dir = filePath.slice(0, filePath.length - fileName.length);
    const webRootUrl = baseUrl || CPath.WebRootUrl();
    const token = baseUrl ? getAuthToken(baseUrl) : '';
    const up = { path: dir, name: [fileName], data: [base64] };
    if (token)
        up.token = token;
    try {
        await CFecth.Exe(webRootUrl + 'File/Upload', up, 'json');
        CAlert.Info('저장 완료');
    }
    catch (e) {
        CAlert.E('저장 실패: ' + e.message);
    }
}
function promptSourceAction(fullPath, baseUrl, url) {
    const ext = fileExtOf(fullPath);
    if (ext === 'sqlite' || ext === 'db') {
        const token = baseUrl ? getAuthToken(baseUrl) : '';
        new CORMViewer(undefined, 'sqlite', fullPath, baseUrl, token).Open(CModal.ePos.Center);
        return;
    }
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        new CSheetViewer([url], async (filePath, base64) => ctrlSaveOpenedSheet(filePath, base64, baseUrl)).Open();
        return;
    }
    const canExecute = ext === 'html' || ext === 'htm';
    if (!canExecute) {
        editorOpenFile(fullPath, baseUrl, url);
        return;
    }
    const actions = [() => editorOpenFile(fullPath, baseUrl, url), () => executeOpenedSource(fullPath, url), () => { }];
    const labels = [L('ctrl.edit', 'Edit'), L('ctrl.execute', 'Execute'), L('ctrl.cancel', 'Cancel')];
    const confirm = new CConfirm();
    confirm.SetBody(`"${aiEscapeHtml(fullPath)}"`);
    confirm.SetConfirm(CConfirm.eConfirm.List, actions, labels);
    confirm.Open();
}
function editorItemSpec(s) {
    const name = s.path.split('/').pop() || s.path;
    const dir = s.path.slice(0, s.path.length - name.length);
    const dot = s.dirty
        ? `<span class="text-warning small" title="${L('ctrl.st.modified', 'Modified (unsaved)')}">●</span>`
        : `<span class="text-success small" title="${L('ctrl.st.saved', 'Saved')}">●</span>`;
    const isRemote = !!s.baseUrl;
    const remoteId = isRemote ? (rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === s.baseUrl)?.remoteId ?? s.baseUrl) : '';
    return {
        ...sessActiveFromKey(s.key),
        dataAttr: { name: 'key', value: s.key },
        leftHtml: `${dot}`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;" title="${aiEscapeHtml(s.path)}">
            <span class="text-truncate small"><i class="bi bi-file-earmark-code"></i> ${aiEscapeHtml(name)}</span>
            ${isRemote ? `<span class="${rdpTextColor(remoteId)}" style="font-size:0.68rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${aiEscapeHtml(s.baseUrl)}</span>` : ''}
            ${dir ? `<span class="text-secondary" style="font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;">${aiEscapeHtml(dir)}</span>` : ''}
        </span>`,
        deleteAct: 'delete',
        deleteLabel: L('ctrl.deleteIcon', '🗑️ Delete'),
        onClick: () => {
            editorActivatePane();
            showEditorFrame(s.key, editorFrameSrc(s));
            renderSessionSidebar();
        },
        onShare: () => showShareLinkModal(L('ctrl.share.editorTitle', 'Editor Share Link'), LF('ctrl.share.editor', 'Anyone with this link can view: <strong>{0}</strong>', aiEscapeHtml(s.path)), editorFrameSrc(s)),
        onDelete: () => {
            const f = editorIframePool.get(s.key);
            if (f) {
                f.remove();
                editorIframePool.delete(s.key);
                tmuxAllFrames.delete(s.key);
                tmuxClearIfShowing(s.key);
            }
            if (activeEditorFrameKey === s.key) {
                activeEditorFrameKey = null;
                updateEditorFramePlaceholder();
            }
            editorSessions.delete(s.key);
            renderSessionSidebar();
        },
        popup: { url: () => editorFrameSrc(s), title: name, winName: `editor_${s.key}` },
    };
}
function genUuid() {
    if (crypto && 'randomUUID' in crypto)
        return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
const webIframePool = new Map();
let activeWebFrameKey = null;
const webFrameCtx = {
    pool: webIframePool,
    container: tmuxIdlePool,
    getActiveKey: () => activeWebFrameKey,
    setActiveKey: (key) => { activeWebFrameKey = key; },
    updatePlaceholder: () => { },
};
function showWebFrame(key, src) {
    return showPooledFrame(webFrameCtx, key, src);
}
function webActivatePane() {
    activatePaneUnlessMultiplexer('web-panel-tab', 'Web');
}
const webSessions = new Map();
function webNormalizeUrl(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');
        let id = '';
        let start = '';
        if (host === 'youtube.com' && u.pathname === '/watch') {
            id = u.searchParams.get('v') || '';
            start = u.searchParams.get('t') || '';
        }
        else if (host === 'youtu.be') {
            id = u.pathname.slice(1);
            start = u.searchParams.get('t') || '';
        }
        if (!id)
            return url;
        const startSec = start ? start.replace(/s$/, '') : '';
        return `https://www.youtube.com/embed/${id}${startSec ? `?start=${encodeURIComponent(startSec)}` : ''}`;
    }
    catch (_) {
        return url;
    }
}
function webOpenUrl(rawUrl) {
    const url = webNormalizeUrl(rawUrl);
    const key = `web:${genUuid()}`;
    webSessions.set(key, { key, url, openedAt: Date.now() });
    webActivatePane();
    showWebFrame(key, url);
    renderSessionSidebar();
}
function webItemSpec(s) {
    return {
        ...sessActiveFromKey(s.key),
        dataAttr: { name: 'key', value: s.key },
        leftHtml: `<i class="bi bi-globe"></i>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;" title="${aiEscapeHtml(s.url)}">
            <span class="text-truncate small">${aiEscapeHtml(s.url)}</span>
        </span>`,
        deleteAct: 'delete',
        deleteLabel: L('ctrl.deleteIcon', '🗑️ Delete'),
        onClick: () => {
            webActivatePane();
            showWebFrame(s.key, s.url);
            renderSessionSidebar();
        },
        onShare: () => showShareLinkModal(L('ctrl.share.webTitle', 'Web Link'), LF('ctrl.share.web', 'Anyone with this link can view: <strong>{0}</strong>', aiEscapeHtml(s.url)), s.url),
        onDelete: () => {
            const f = webIframePool.get(s.key);
            if (f) {
                f.remove();
                webIframePool.delete(s.key);
                tmuxAllFrames.delete(s.key);
                tmuxClearIfShowing(s.key);
            }
            if (activeWebFrameKey === s.key)
                activeWebFrameKey = null;
            webSessions.delete(s.key);
            renderSessionSidebar();
        },
        popup: { url: () => s.url, title: s.url, winName: `web_${s.key}` },
    };
}
CDOM.ID('web-new-btn').addEventListener('click', () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">${L('ctrl.hdr.newWeb', 'Open Web Page')}</p>
        <div class="mb-3">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.url', 'URL')}</label>
            <input id="web-url" type="text" class="form-control form-control-sm" placeholder="https://..." autocomplete="off">
        </div>
        <div class="d-flex justify-content-between">
            <button id="web-open" class="btn btn-primary">${L('ctrl.open', 'Open')}</button>
            <button id="web-cancel" class="btn btn-danger ms-2">${L('ctrl.cancel', 'Cancel')}</button>
        </div>`;
    const modal = new CModal();
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const urlInput = container.querySelector('#web-url');
        const doOpen = () => {
            let url = urlInput.value.trim();
            if (!url)
                return;
            if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url))
                url = 'https://' + url;
            modal.Close();
            webOpenUrl(url);
        };
        container.querySelector('#web-open').addEventListener('click', doOpen);
        container.querySelector('#web-cancel').addEventListener('click', () => modal.Close());
        urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            doOpen(); });
        setTimeout(() => urlInput.focus(), 50);
    }, 0);
});
function chatStartNew(initialWorkingDir, remoteId = '') {
    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">${L('ctrl.hdr.newChat', 'New Chat')}</p>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.workingDir', 'Working Directory')}</label>
            <input id="chat-opt-workingdir" type="text" class="form-control form-control-sm" placeholder="./" autocomplete="off">
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
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="chat-opt-write">
                <label class="form-check-label small text-secondary" for="chat-opt-write">${L('ctrl.chat.write', 'Write')}</label>
            </div>
        </div>
        <div class="d-flex justify-content-between">
            <button id="chat-modal-open" class="btn btn-primary">${L('ctrl.open', 'Open')}</button>
            <button id="chat-modal-cancel" class="btn btn-danger ms-2">${L('ctrl.cancel', 'Cancel')}</button>
        </div>`;
    const modal = new CModal();
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const mcpCheck = container.querySelector('#chat-opt-mcp');
        const mdcopyCheck = container.querySelector('#chat-opt-mdcopy');
        const writeCheck = container.querySelector('#chat-opt-write');
        const workingDirInput = container.querySelector('#chat-opt-workingdir');
        workingDirInput.value = (initialWorkingDir ?? '').trim();
        const doOpen = () => {
            const ctx = serverCtxOf(remoteId);
            if (!ctx) {
                modal.Close();
                return;
            }
            const sid = genUuid();
            const workingDir = workingDirInput.value.trim();
            const params = new URLSearchParams({ session: sid });
            if (!mcpCheck.checked)
                params.set('mcp', '0');
            if (workingDir)
                params.set('workingDir', workingDir);
            if (mdcopyCheck.checked)
                params.set('mdcopy', '1');
            if (!writeCheck.checked)
                params.set('write', '0');
            chatActivatePane();
            showChatFrame(sessKey('chat', remoteId, sid), `${ctx.artgineUrl}artgine/server/html/Chat.html?${params.toString()}`);
            chatRenderList();
            setTimeout(chatRenderList, 1500);
            setTimeout(chatRenderList, 4000);
            modal.Close();
        };
        container.querySelector('#chat-modal-open').addEventListener('click', doOpen);
        container.querySelector('#chat-modal-cancel').addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}
CDOM.ID('chat-new-btn').addEventListener('click', () => chatStartNew());
function chatLoadSession(s) {
    const ctx = serverCtxOf(s.remoteId);
    if (!ctx)
        return;
    chatActivatePane();
    showChatFrame(sessKey('chat', s.remoteId, s.sessionId), `${ctx.artgineUrl}artgine/server/html/Chat.html?session=${encodeURIComponent(s.sessionId)}`);
    renderSessionSidebar();
}
function chatItemSpec(s) {
    const ctx = serverCtxOf(s.remoteId);
    const key = sessKey('chat', s.remoteId, s.sessionId);
    const isRemote = !!s.remoteId;
    const addr = remoteEntryUrl(s.remoteId);
    const rel = chatFormatRelative(s.updatedAt);
    const isLoaded = chatIframePool.has(key);
    const st = !isLoaded ? 'off' : s.busy ? 'busy' : 'idle';
    const dot = st === 'off' ? `<span class="text-danger small" title="${L('ctrl.st.disconnected', 'Disconnected')}">●</span>`
        : st === 'busy' ? `<span class="ai-busy-dot text-warning small" title="${L('ctrl.st.busy', 'Busy')}">●</span>`
            : `<span class="text-success small" title="${L('ctrl.st.idle', 'Idle')}">●</span>`;
    return {
        ...sessActiveFromKey(key),
        dataAttr: { name: 'key', value: key },
        leftHtml: `
        <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
            ${dot}
            ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
        </span>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            ${isRemote && addr ? `<span class="text-truncate ${rdpTextColor(s.remoteId)}" style="font-size:0.65rem;">${aiEscapeHtml(addr)}</span>` : ''}
            <span class="text-truncate text-secondary" style="font-size:0.65rem;font-family:monospace;">${aiEscapeHtml(s.sessionId)}</span>
            <span class="text-truncate small">${aiEscapeHtml(s.lastMsg || s.title)}</span>
        </span>`,
        deleteAct: 'delete',
        deleteLabel: '🗑️ Delete',
        onClick: () => chatLoadSession(s),
        onDelete: async () => {
            if (ctx)
                await fetch(ctxApiUrl(ctx, `AIChat/session?id=${s.sessionId}`), { method: 'DELETE' });
            const f = chatIframePool.get(key);
            if (f) {
                f.remove();
                chatIframePool.delete(key);
                tmuxAllFrames.delete(key);
                tmuxClearIfShowing(key);
            }
            if (activeChatFrameKey === key) {
                activeChatFrameKey = null;
                updateChatFramePlaceholder();
            }
            chatRenderList();
        },
        popup: { url: () => `${ctx?.artgineUrl ?? CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(s.sessionId)}`, title: s.title, winName: `chat_${s.remoteId}_${s.sessionId}` },
    };
}
let chatListInFlight = false;
async function chatRenderList() {
    await ensureLocalAuth();
    if (!getAuthToken(CPath.WebRootUrl())) {
        chatAuthState = 'signin';
        lastChatSessions = null;
        renderSessionSidebar();
        return;
    }
    if (chatListInFlight)
        return;
    chatListInFlight = true;
    try {
        const ctxs = sessionServerCtxs();
        let merged = (lastChatSessions ?? []).slice();
        await Promise.all(ctxs.map(async (ctx) => {
            const remoteId = ctx.remoteId;
            let sessions = null;
            let unauthed = false;
            try {
                const r = await ctxFetch(ctx, 'AIChat/sessions?limit=30');
                if (r.status === 401)
                    unauthed = true;
                else if (r.ok) {
                    const j = await r.json();
                    sessions = j.ok ? j.sessions : null;
                }
            }
            catch {
                noteSessionFetchFailure(remoteId);
            }
            if (unauthed && !remoteId) {
                removeAuthToken(CPath.WebRootUrl());
                markLocalAuthLost();
                chatAuthState = 'signin';
                lastChatSessions = null;
                renderSessionSidebar();
                return;
            }
            if (!sessions)
                return;
            chatAuthState = 'ok';
            merged = merged.filter(s => s.remoteId !== remoteId).concat(sessions.map(raw => ({ ...raw, remoteId })));
            for (const s of sessions) {
                const full = { ...s, remoteId };
                const key = sessKey('chat', remoteId, full.sessionId);
                const st = full.busy ? 'busy' : 'idle';
                syncSessState(key, st, () => {
                    const suppressToast = activeChatFrameKey === key && document.hasFocus();
                    _showDoneNotification(aiEscapeHtml(full.title), full.lastMsg ? aiEscapeHtml(full.lastMsg) : undefined, () => chatLoadSession(full), aiEscapeHtml(full.sessionId), suppressToast);
                });
            }
            lastChatSessions = merged;
            renderSessionSidebar();
        }));
    }
    catch (e) {
        console.error('Chat session list error:', e);
    }
    finally {
        chatListInFlight = false;
    }
}
const termFrameContainer = CDOM.ID("term-frame-container");
const termFramePlaceholder = CDOM.ID("term-frame-placeholder");
const termIframePool = new Map();
let activeTermFrameKey = null;
function updateTermFramePlaceholder() {
    termFramePlaceholder.classList.toggle('term-frame-placeholder-hidden', !!activeTermFrameKey);
}
function updateTermFrameVisibility() {
    if (!activeTermFrameKey)
        return;
    postFrameVisible(termIframePool.get(activeTermFrameKey), CDOM.ID('term-panel').classList.contains('active'));
}
const termFrameCtx = {
    pool: termIframePool,
    container: termFrameContainer,
    getActiveKey: () => activeTermFrameKey,
    setActiveKey: (key) => { activeTermFrameKey = key; },
    updatePlaceholder: updateTermFramePlaceholder,
    onCreate: wirePooledFrameHotkeys,
};
function showTermFrame(key, src) {
    return showPooledFrame(termFrameCtx, key, src);
}
function termActivatePane() {
    activatePaneUnlessMultiplexer('term-tab', 'Terminal');
}
async function termConnectSession(s) {
    const ctx = serverCtxOf(s.remoteId);
    if (!ctx)
        return;
    termActivatePane();
    const key = sessKey('term', s.remoteId, s.token);
    if (termIframePool.has(key)) {
        showTermFrame(key, '');
    }
    else {
        showTermFrame(key, ctxApiUrl(ctx, `cmd/terminal-proxy?token=${s.token}`));
    }
    renderSessionSidebar();
}
async function termKillSession(s) {
    const ctx = serverCtxOf(s.remoteId);
    if (!ctx)
        return;
    try {
        const r = await fetch(ctxApiUrl(ctx, `cmd/kill-session?token=${s.token}`));
        const j = await r.json();
        if (!j.ok) {
            CAlert.E(LF('ctrl.msg.deleteFailed', 'Delete failed: {0}', j.msg || 'unknown error'));
            return;
        }
        const key = sessKey('term', s.remoteId, s.token);
        const f = termIframePool.get(key);
        if (f) {
            f.remove();
            termIframePool.delete(key);
            tmuxAllFrames.delete(key);
            tmuxClearIfShowing(key);
        }
        if (activeTermFrameKey === key) {
            activeTermFrameKey = null;
            updateTermFramePlaceholder();
        }
        termRenderList();
    }
    catch (e) {
        console.error('termKillSession error:', e);
    }
}
function termShowShareLink(ctx, token) {
    showShareLinkModal(L('ctrl.share.termTitle', 'Terminal Share Link'), L('ctrl.share.term', 'Anyone with this link can view the terminal in read-only mode.'), `${ctx.apiUrl}cmd/terminal-proxy?token=${token}`);
}
function termItemSpec(s) {
    const ctx = serverCtxOf(s.remoteId);
    const key = sessKey('term', s.remoteId, s.token);
    const isRemote = !!s.remoteId;
    const addr = remoteEntryUrl(s.remoteId);
    const isLoaded = termIframePool.has(key);
    const rel = chatFormatRelative(s.updatedAt);
    const preview = aiEscapeHtml(s.lastMsg || '(empty)');
    const dotLabel = s.mode.slice(0, 3);
    const dotTitle = s.key || s.mode;
    const st = !s.alive ? 'off'
        : s.permPending ? 'wait'
            : !isLoaded ? 'off'
                : s.busy ? 'busy'
                    : 'idle';
    const dot = st === 'off' ? `<span class="badge rounded-pill bg-danger" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
        : st === 'wait' ? `<span class="badge rounded-pill bg-warning" title="${aiEscapeHtml(dotTitle)}" style="filter:hue-rotate(30deg)">${dotLabel}</span>`
            : st === 'busy' ? `<span class="badge rounded-pill bg-warning" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
                : `<span class="badge rounded-pill bg-success" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`;
    return {
        ...sessActiveFromKey(key),
        dataAttr: { name: 'key', value: key },
        leftHtml: `
        <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
            ${dot}
            ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
        </span>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            ${isRemote && addr ? `<span class="text-truncate ${rdpTextColor(s.remoteId)}" style="font-size:0.65rem;">${aiEscapeHtml(addr)}</span>` : ''}
            <span class="text-truncate text-secondary" style="font-size:0.65rem;font-family:monospace;">${aiEscapeHtml(s.token)}</span>
            ${s.key ? `<span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(s.key)}</span>` : ''}
            <span class="text-truncate small">${preview}</span>
        </span>`,
        deleteAct: 'kill',
        deleteLabel: '🗑️ Delete',
        onClick: () => termConnectSession(s),
        onShare: () => { if (ctx)
            termShowShareLink(ctx, s.token); },
        onDelete: () => termKillSession(s),
        popup: { url: () => `${ctx?.apiUrl ?? CPath.WebRootUrl()}cmd/terminal-proxy?token=${s.token}`, title: s.key || s.mode || 'Terminal', winName: `term_${s.remoteId}_${s.token.slice(0, 8)}` },
    };
}
let termListInFlight = false;
let termListPending = false;
async function termRenderList() {
    await ensureLocalAuth();
    if (!getAuthToken(CPath.WebRootUrl())) {
        termAuthState = 'signin';
        lastTermSessions = null;
        renderSessionSidebar();
        return;
    }
    if (termListInFlight) {
        termListPending = true;
        return;
    }
    termListInFlight = true;
    try {
        const ctxs = sessionServerCtxs();
        let merged = (lastTermSessions ?? []).slice();
        await Promise.all(ctxs.map(async (ctx) => {
            const remoteId = ctx.remoteId;
            let sessions = null;
            let unauthed = false;
            try {
                const r = await ctxFetch(ctx, 'cmd/sessions');
                if (r.status === 401)
                    unauthed = true;
                else if (r.ok) {
                    const j = await r.json();
                    sessions = j.ok ? j.sessions : null;
                }
            }
            catch {
                noteSessionFetchFailure(remoteId);
            }
            if (unauthed && !remoteId) {
                removeAuthToken(CPath.WebRootUrl());
                markLocalAuthLost();
                termAuthState = 'signin';
                lastTermSessions = null;
                renderSessionSidebar();
                return;
            }
            if (!sessions)
                return;
            termAuthState = 'ok';
            const withRemote = sessions.map(x => ({ ...x, remoteId }));
            const serverTokens = new Set(withRemote.map(s => s.token));
            const liveKeys = new Set(withRemote.map(s => sessKey('term', remoteId, s.token)));
            const newPrefix = remoteId ? `term-new:${remoteId}:` : 'term-new:';
            for (const newKey of Array.from(termIframePool.keys())) {
                if (!newKey.startsWith(newPrefix))
                    continue;
                const tok = newKey.slice(newPrefix.length, newKey.lastIndexOf(':'));
                if (!serverTokens.has(tok))
                    continue;
                const key = sessKey('term', remoteId, tok);
                const f = termIframePool.get(newKey);
                termIframePool.delete(newKey);
                termIframePool.set(key, f);
                tmuxAllFrames.delete(newKey);
                tmuxAllFrames.set(key, f);
                if (activeTermFrameKey === newKey)
                    activeTermFrameKey = key;
                let promoted = false;
                (function walk(p) {
                    if (p.split && p.children) {
                        walk(p.children[0]);
                        walk(p.children[1]);
                        return;
                    }
                    if (p.contentKey === newKey) {
                        p.contentKey = key;
                        promoted = true;
                    }
                })(tmuxRoot);
                if (promoted) {
                    tmuxSyncPanePositions();
                    tmuxSaveLayout();
                }
            }
            for (const s of withRemote) {
                const key = sessKey('term', remoteId, s.token);
                const st = !s.alive ? 'off'
                    : s.permPending ? 'wait'
                        : s.busy ? 'busy'
                            : 'idle';
                syncSessState(key, st, () => {
                    const rawPreview = s.lastMsg || '';
                    const suppressToast = activeTermFrameKey === key && document.hasFocus();
                    _showDoneNotification(`${s.key || s.mode}: ${rawPreview}`.trimEnd(), rawPreview ? aiEscapeHtml(rawPreview) : undefined, () => termConnectSession(s), aiEscapeHtml(s.token), suppressToast);
                }, () => {
                    const suppressToast = activeTermFrameKey === key && document.hasFocus();
                    _showDoneNotification(LF('ctrl.msg.approvalRequired', '⚠️ {0}: Approval required', s.key || s.mode), s.lastMsg || undefined, () => termConnectSession(s), aiEscapeHtml(s.token), suppressToast);
                });
            }
            merged = merged.filter(s => s.remoteId !== remoteId).concat(withRemote);
            for (const key of Array.from(termIframePool.keys())) {
                if (!key.startsWith('term:'))
                    continue;
                if (keyRemoteId(key) !== remoteId)
                    continue;
                if (!liveKeys.has(key)) {
                    const f = termIframePool.get(key);
                    if (f) {
                        f.remove();
                        termIframePool.delete(key);
                        tmuxAllFrames.delete(key);
                        tmuxClearIfShowing(key);
                    }
                    if (activeTermFrameKey === key) {
                        activeTermFrameKey = null;
                        updateTermFramePlaceholder();
                    }
                }
            }
            lastTermSessions = merged;
            renderSessionSidebar();
        }));
    }
    catch (e) {
        console.error('Terminal session list error:', e);
    }
    finally {
        termListInFlight = false;
        if (termListPending) {
            termListPending = false;
            termRenderList();
        }
    }
}
async function termStartNew(mode = 'cmd', initialWorkingDir, remoteId = '') {
    const modelMap = await agentFetchModels(remoteId);
    const modelsFor = (providerId) => modelMap[providerId] ?? [];
    const savedProvider = getLastProvider();
    const termProviders = ['cmd', ...AGENT_PROVIDER_IDS];
    const initialProvider = (mode !== 'cmd')
        ? mode
        : (savedProvider && termProviders.includes(savedProvider) ? savedProvider : 'cmd');
    const buildModelOptions = (providerId, selectedModel = '') => {
        const models = modelsFor(providerId);
        const sel = (selectedModel && models.some(m => m.value === selectedModel)) ? selectedModel : '';
        return `<option value="" ${sel === '' ? 'selected' : ''}>${L('ctrl.opt.defaultModel', '(default)')}</option>` +
            models.map(m => `<option value="${aiEscapeHtml(m.value)}" ${m.value === sel ? 'selected' : ''}>${aiEscapeHtml(m.label)}</option>`).join('');
    };
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.provider', 'Provider')}</label>
            <select id="term-opt-provider" class="form-select form-select-sm">
                <option value="cmd" ${initialProvider === 'cmd' ? 'selected' : ''}>cmd</option>
                ${AGENT_PROVIDER_IDS.map(id => `<option value="${id}" ${id === initialProvider ? 'selected' : ''}>${AGENT_PROVIDER_LABELS[id]}</option>`).join('')}
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.model', 'Model')}</label>
            <select id="term-opt-model" class="form-select form-select-sm">
                ${buildModelOptions(initialProvider, '')}
            </select>
        </div>
        <div class="accordion mb-3" id="term-options-accordion">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#term-options-body">${L('ctrl.lbl.options', 'Options')}</button>
                </h2>
                <div id="term-options-body" class="accordion-collapse collapse" data-bs-parent="#term-options-accordion">
                    <div class="accordion-body">
                        <div class="mb-2">
                            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.workingDir', 'Working Directory')}</label>
                            <input id="term-opt-workingdir" type="text" class="form-control form-control-sm" placeholder="./" autocomplete="off">
                        </div>
                        <div class="mb-2">
                            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.key', 'Key')}</label>
                            <input id="term-opt-key" type="text" class="form-control form-control-sm" placeholder="${L('ctrl.ph.sessionKey', 'Session key (optional)')}" autocomplete="off">
                        </div>
                        <div class="d-flex gap-4">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="term-opt-mcp" checked>
                                <label class="form-check-label small text-secondary" for="term-opt-mcp">${L('ctrl.lbl.mcp', 'MCP')}</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="term-opt-mdcopy" checked>
                                <label class="form-check-label small text-secondary" for="term-opt-mdcopy">${L('ctrl.lbl.mdcopy', 'Copy MD')}</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="d-flex justify-content-between">
            <button id="term-modal-open" class="btn btn-primary">${L('ctrl.open', 'Open')}</button>
            <button id="term-modal-cancel" class="btn btn-danger ms-2">${L('ctrl.cancel', 'Cancel')}</button>
        </div>`;
    const modal = new CModal();
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader(L('ctrl.hdr.newTerminal', 'New Terminal'));
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    const TERM_MODAL_W = 560;
    modal.SetSize(TERM_MODAL_W, 430);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const fitHeight = (_recenter = false) => {
            const headerH = modal.GetHeader()?.offsetHeight ?? 0;
            modal.SetSize(TERM_MODAL_W, headerH + container.offsetHeight + 16 + 12);
            if (_recenter)
                modal.SetPosition(CModal.ePos.Center);
        };
        fitHeight(true);
        const optionsAccordion = container.querySelector('#term-options-accordion');
        optionsAccordion.addEventListener('shown.bs.collapse', () => fitHeight());
        optionsAccordion.addEventListener('hidden.bs.collapse', () => fitHeight());
        const providerSelect = container.querySelector('#term-opt-provider');
        const modelSelect = container.querySelector('#term-opt-model');
        const mcpCheck = container.querySelector('#term-opt-mcp');
        const mdcopyCheck = container.querySelector('#term-opt-mdcopy');
        const updateModeUI = () => {
            const isCmd = providerSelect.value === 'cmd';
            modelSelect.innerHTML = buildModelOptions(providerSelect.value, '');
            modelSelect.disabled = isCmd;
            mcpCheck.disabled = isCmd;
            mdcopyCheck.disabled = isCmd;
        };
        providerSelect.addEventListener('change', updateModeUI);
        updateModeUI();
        const keyInput = container.querySelector('#term-opt-key');
        const workingDirInput = container.querySelector('#term-opt-workingdir');
        workingDirInput.value = (initialWorkingDir ?? '').trim();
        const openBtn = container.querySelector('#term-modal-open');
        const cancelBtn = container.querySelector('#term-modal-cancel');
        let opening = false;
        const doOpen = async () => {
            if (opening)
                return;
            opening = true;
            openBtn.disabled = true;
            cancelBtn.disabled = true;
            const openBtnOrigHtml = openBtn.innerHTML;
            openBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${L('ctrl.opening', 'Opening...')}`;
            try {
                const key = keyInput.value.trim();
                const workingDir = workingDirInput.value.trim();
                const selectedMode = providerSelect.value;
                const selectedModel = selectedMode === 'cmd' ? '' : modelSelect.value.trim();
                saveLastProviderModel(selectedMode, selectedModel);
                const params = new URLSearchParams({ mode: selectedMode });
                if (key)
                    params.set('key', key);
                if (workingDir)
                    params.set('workingDir', workingDir);
                if (selectedModel)
                    params.set('model', selectedModel);
                if (!mcpCheck.checked)
                    params.set('mcp', '0');
                if (mdcopyCheck.checked)
                    params.set('mdcopy', '1');
                const ctx = serverCtxOf(remoteId);
                if (!ctx) {
                    CAlert.E(L('ctrl.msg.failedStartTerm', 'Failed to start terminal'));
                    return;
                }
                const r = await fetch(ctxApiUrl(ctx, 'cmd/start-term?' + params.toString()));
                const j = await r.json();
                if (!j.ok) {
                    CAlert.E(j.msg || L('ctrl.msg.failedStartTerm', 'Failed to start terminal'));
                    return;
                }
                modal.Close();
                termActivatePane();
                showTermFrame(sessKey('term-new', remoteId, `${j.token}:${Date.now()}`), ctxApiUrl(ctx, `cmd/terminal-proxy?token=${j.token}`));
                termRenderList();
                setTimeout(termRenderList, 1500);
                setTimeout(termRenderList, 4000);
            }
            catch (e) {
                console.error('[Terminal] start-term error:', e);
                CAlert.E(L('ctrl.msg.failedStartTerm', 'Failed to start terminal'));
            }
            finally {
                opening = false;
                openBtn.disabled = false;
                cancelBtn.disabled = false;
                openBtn.innerHTML = openBtnOrigHtml;
            }
        };
        openBtn.addEventListener('click', doOpen);
        cancelBtn.addEventListener('click', () => modal.Close());
        keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            doOpen(); });
    }, MODAL_DOM_DELAY);
}
const termTab = CDOM.ID('term-tab');
CDOM.ID('term-new-btn').addEventListener('click', () => {
    if (!ctrlRequireAuthed())
        return;
    termStartNew('cmd');
});
termTab.addEventListener('shown.bs.tab', () => { termRenderList(); updateTermFrameVisibility(); });
termTab.addEventListener('hidden.bs.tab', () => updateTermFrameVisibility());
const browserFrameContainer = CDOM.ID("browser-frame-container");
const browserFramePlaceholder = CDOM.ID("browser-frame-placeholder");
const browserIframePool = new Map();
let activeBrowserFrameKey = null;
function updateBrowserFramePlaceholder() {
    browserFramePlaceholder.classList.toggle('browser-frame-placeholder-hidden', !!activeBrowserFrameKey);
}
function isBrowserPaneActive() {
    return CDOM.ID('tmux-panel').classList.contains('active') && !!activeBrowserFrameKey && tmuxFindPaneIdByKey(activeBrowserFrameKey) !== null;
}
function updateBrowserFrameVisibility() {
    if (!activeBrowserFrameKey)
        return;
    postFrameVisible(browserIframePool.get(activeBrowserFrameKey), isBrowserPaneActive());
}
const browserFrameCtx = {
    pool: browserIframePool,
    container: browserFrameContainer,
    getActiveKey: () => activeBrowserFrameKey,
    setActiveKey: (key) => { activeBrowserFrameKey = key; },
    updatePlaceholder: updateBrowserFramePlaceholder,
    onCreate: wirePooledFrameHotkeys,
    onActivate: (_key, prevKey) => {
        if (prevKey)
            postFrameVisible(browserIframePool.get(prevKey), false);
        updateBrowserFrameVisibility();
    },
};
function showBrowserFrame(key, src) {
    return showPooledFrame(browserFrameCtx, key, src);
}
function destroyBrowserFrame(key) {
    const f = browserIframePool.get(key);
    if (!f)
        return;
    f.remove();
    browserIframePool.delete(key);
    tmuxAllFrames.delete(key);
    tmuxClearIfShowing(key);
    if (activeBrowserFrameKey === key)
        activeBrowserFrameKey = null;
    updateBrowserFramePlaceholder();
}
function browserActivatePane() {
    activatePaneUnlessMultiplexer('browser-panel-tab', 'Browser');
}
const browserSessions = new Map();
function browserLoadSession(remoteId, sessionId) {
    const ctx = serverCtxOf(remoteId);
    if (!ctx)
        return;
    browserActivatePane();
    showBrowserFrame(sessKey('browser', remoteId, sessionId), `${ctx.artgineUrl}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}`);
    renderSessionSidebar();
}
function browserFmtTtl(expiresAt) {
    const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (rem <= 0)
        return '−0s';
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return m > 0 ? `−${m}m${s}s` : `−${s}s`;
}
function browserItemSpec(s) {
    const ctx = serverCtxOf(s.remoteId);
    const key = sessKey('browser', s.remoteId, s.sessionId);
    const isRemote = !!s.remoteId;
    const addr = remoteEntryUrl(s.remoteId);
    const isLoaded = browserIframePool.has(key);
    const rel = chatFormatRelative(s.updatedAt);
    return {
        ...sessActiveFromKey(key),
        dataAttr: { name: 'key', value: key },
        leftHtml: `
        <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
            <span class="browser-dot ${isLoaded ? 'text-success' : 'text-danger'} small flex-shrink-0">●</span>
            ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
        </span>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            ${isRemote && addr ? `<span class="text-truncate ${rdpTextColor(s.remoteId)}" style="font-size:0.65rem;">${aiEscapeHtml(addr)}</span>` : ''}
            <span class="text-truncate small" title="${aiEscapeHtml(s.url)}">${aiEscapeHtml(s.url)}</span>
            <span class="d-flex gap-2 text-secondary" style="font-size:0.7rem;">
                <span>${aiEscapeHtml(s.browserName || 'auto')}</span>
                <span class="browser-ttl-label">${s.expiresAt ? browserFmtTtl(s.expiresAt) : ''}</span>
            </span>
        </span>`,
        deleteAct: 'delete',
        deleteLabel: '🗑️ Delete',
        onClick: () => browserLoadSession(s.remoteId, s.sessionId),
        onShare: () => browserShowShareLink(ctx, s.sessionId, s.url),
        onDelete: () => browserRemoveSession(s.remoteId, s.sessionId),
        popup: { url: () => `${ctx?.artgineUrl ?? CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(s.sessionId)}`, title: s.url, winName: `browser_${s.remoteId}_${s.sessionId}` },
    };
}
function browserAddSession(sessionId, url, browserName = '', expiresAt = 0, navigate = true, createdAt = Date.now(), remoteId = '') {
    const key = sessKey('browser', remoteId, sessionId);
    if (browserSessions.has(key))
        return;
    browserSessions.set(key, { sessionId, remoteId, url, browserName, expiresAt, createdAt, updatedAt: createdAt });
    renderSessionSidebar();
    if (navigate)
        browserLoadSession(remoteId, sessionId);
}
async function browserRemoveSession(remoteId, sessionId) {
    const key = sessKey('browser', remoteId, sessionId);
    if (!browserSessions.has(key))
        return;
    browserSessions.delete(key);
    destroyBrowserFrame(key);
    renderSessionSidebar();
    const ctx = serverCtxOf(remoteId);
    if (!ctx)
        return;
    try {
        await fetch(ctxApiUrl(ctx, 'PlayWright/remove'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
    }
    catch (_) { }
}
let browserListInFlight = false;
async function browserRefreshList() {
    await ensureLocalAuth();
    if (!getAuthToken(CPath.WebRootUrl())) {
        browserAuthState = 'signin';
        browserSessions.clear();
        renderSessionSidebar();
        return;
    }
    if (browserListInFlight)
        return;
    browserListInFlight = true;
    try {
        const ctxs = sessionServerCtxs();
        await Promise.all(ctxs.map(async (ctx) => {
            const remoteId = ctx.remoteId;
            let sessions = null;
            let unauthed = false;
            try {
                const r = await ctxFetch(ctx, 'PlayWright/list');
                if (r.status === 401)
                    unauthed = true;
                else if (r.ok) {
                    const j = await r.json();
                    sessions = j.ok ? j.sessions : null;
                }
            }
            catch {
                noteSessionFetchFailure(remoteId);
            }
            if (unauthed && !remoteId) {
                removeAuthToken(CPath.WebRootUrl());
                markLocalAuthLost();
                browserAuthState = 'signin';
                browserSessions.clear();
                renderSessionSidebar();
                return;
            }
            if (!sessions)
                return;
            browserAuthState = 'ok';
            const serverIds = new Set(sessions.map(s => s.sessionId));
            for (const [key, s] of Array.from(browserSessions.entries())) {
                if (s.remoteId !== remoteId)
                    continue;
                if (!serverIds.has(s.sessionId)) {
                    browserSessions.delete(key);
                    destroyBrowserFrame(key);
                }
            }
            for (const s of sessions) {
                const key = sessKey('browser', remoteId, s.sessionId);
                const existing = browserSessions.get(key);
                if (existing) {
                    existing.expiresAt = s.expiresAt;
                    existing.updatedAt = s.updatedAt;
                }
                else
                    browserSessions.set(key, { sessionId: s.sessionId, remoteId, url: s.currentUrl, browserName: s.browserName, expiresAt: s.expiresAt, createdAt: s.createdAt, updatedAt: s.updatedAt });
            }
            renderSessionSidebar();
        }));
    }
    catch (_) { }
    finally {
        browserListInFlight = false;
    }
}
function browserShowShareLink(ctx, sessionId, url) {
    const base = ctx?.artgineUrl ?? CPath.WebRootArtgineUrl();
    showShareLinkModal(L('ctrl.share.browserTitle', 'Browser Share Link'), LF('ctrl.share.browser', 'Anyone with this link can view the session in read-only mode: <strong>{0}</strong>', aiEscapeHtml(url)), `${base}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}&readonly=1`);
}
CDOM.ID('search-open-btn').addEventListener('click', () => ctrlFileSearch());
CDOM.ID('browser-new-btn').addEventListener('click', () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">${L('ctrl.hdr.newBrowser', 'New Browser Session')}</p>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.url', 'URL')}</label>
            <input id="brow-url" type="text" class="form-control form-control-sm" placeholder="https://..." autocomplete="off">
        </div>
        <div class="mb-3 d-flex gap-2">
            <div class="flex-fill">
                <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.browser', 'Browser')}</label>
                <select id="brow-browser" class="form-select form-select-sm">
                    <option value="">auto</option>
                    <option value="chrome">chrome</option>
                    <option value="msedge">msedge</option>
                    <option value="firefox">firefox</option>
                </select>
            </div>
            <div class="flex-fill">
                <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.ttl', 'TTL (sec)')}</label>
                <input id="brow-ttl" type="number" min="10" class="form-control form-control-sm" value="300">
            </div>
        </div>
        <div class="mb-3 d-flex gap-2">
            <div class="flex-fill">
                <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.width', 'Width')}</label>
                <input id="brow-width" type="number" min="1" class="form-control form-control-sm" value="1280">
            </div>
            <div class="flex-fill">
                <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.height', 'Height')}</label>
                <input id="brow-height" type="number" min="1" class="form-control form-control-sm" value="720">
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.stealth', 'Stealth (sec, 0=off)')}</label>
            <input id="brow-stealth" type="number" min="0" class="form-control form-control-sm" value="0">
        </div>
        <div class="d-flex justify-content-between">
            <button id="brow-open" class="btn btn-primary">${L('ctrl.open', 'Open')}</button>
            <button id="brow-cancel" class="btn btn-danger ms-2">${L('ctrl.cancel', 'Cancel')}</button>
        </div>`;
    const modal = new CModal();
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const urlInput = container.querySelector('#brow-url');
        const browserSel = container.querySelector('#brow-browser');
        const ttlInput = container.querySelector('#brow-ttl');
        const widthInput = container.querySelector('#brow-width');
        const heightInput = container.querySelector('#brow-height');
        const stealthInput = container.querySelector('#brow-stealth');
        const doOpen = async () => {
            const url = urlInput.value.trim();
            if (!url)
                return;
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
                if (!j.ok) {
                    CAlert.E(j.msg || 'Failed');
                    return;
                }
                browserAddSession(j.sessionId, url, browser || 'auto', Date.now() + ttl * 1000);
            }
            catch (_) {
                CAlert.E(L('ctrl.msg.failedStartBrowser', 'Failed to start browser'));
            }
        };
        container.querySelector('#brow-open').addEventListener('click', doOpen);
        container.querySelector('#brow-cancel').addEventListener('click', () => modal.Close());
        urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            doOpen(); });
        setTimeout(() => urlInput.focus(), 50);
    }, MODAL_DOM_DELAY);
});
CDOM.ID('browser-panel-tab').addEventListener('shown.bs.tab', () => updateBrowserFrameVisibility());
CDOM.ID('browser-panel-tab').addEventListener('hidden.bs.tab', () => updateBrowserFrameVisibility());
setInterval(() => {
    otherSidebarList.querySelectorAll('[data-key^="browser:"]').forEach(el => {
        const s = browserSessions.get(el.dataset.key);
        const ttlEl = el.querySelector('.browser-ttl-label');
        if (s && ttlEl)
            ttlEl.textContent = s.expiresAt ? browserFmtTtl(s.expiresAt) : '';
    });
}, 1000);
async function sessionPollOnce() {
    await Promise.allSettled([chatRenderList(), termRenderList(), browserRefreshList()]);
}
(async function sessionPollLoop() {
    for (;;) {
        await sessionPollOnce();
        await new Promise(r => setTimeout(r, 5000));
    }
})();
document.addEventListener('visibilitychange', () => { if (!document.hidden)
    renderSessionSidebar(); });
const TMUX_LS_KEY = 'ctrl-tmux-layout-v1';
const tmuxPaneEls = new Map();
const tmuxTreeRoot = CDOM.ID('tmux-tree-root');
const tmuxTreeStruct = CDOM.ID('tmux-tree-struct');
const tmuxAllFrames = new Map();
function tmuxLoadLayout() {
    try {
        const raw = localStorage.getItem(TMUX_LS_KEY);
        if (raw)
            return JSON.parse(raw);
    }
    catch (_) { }
    return { id: genUuid(), contentKey: null };
}
function tmuxStrip(p) {
    if (p.split && p.children)
        return { id: p.id, split: p.split, children: [tmuxStrip(p.children[0]), tmuxStrip(p.children[1])] };
    return { id: p.id, contentKey: p.contentKey ?? null };
}
function tmuxSaveLayout() {
    try {
        localStorage.setItem(TMUX_LS_KEY, JSON.stringify(tmuxStrip(tmuxRoot)));
    }
    catch (_) { }
    tmuxRenderMenu();
    renderSessionSidebar();
    refreshRdpHighlights();
}
let tmuxRoot = tmuxLoadLayout();
tmuxTreeReady = true;
function tmuxFind(node, id) {
    if (node.id === id)
        return node;
    if (node.children) {
        for (const c of node.children) {
            const f = tmuxFind(c, id);
            if (f)
                return f;
        }
    }
    return null;
}
function tmuxFindParent(node, id, parent = null) {
    if (node.id === id)
        return { pane: node, parent };
    if (node.children) {
        for (const c of node.children) {
            const f = tmuxFindParent(c, id, node);
            if (f)
                return f;
        }
    }
    return null;
}
function tmuxFirstPaneId() {
    let p = tmuxRoot;
    while (p.split && p.children)
        p = p.children[0];
    return p.id;
}
function tmuxPoolForKey(key) {
    if (key.startsWith('term:') || key.startsWith('term-new:'))
        return { pool: termIframePool, onCreate: wirePooledFrameHotkeys };
    if (key.startsWith('chat:'))
        return { pool: chatIframePool, onCreate: wirePooledFrameHotkeys };
    if (key.startsWith('browser:'))
        return { pool: browserIframePool, onCreate: wirePooledFrameHotkeys };
    if (key.startsWith('editor:'))
        return { pool: editorIframePool };
    if (key.startsWith('web:'))
        return { pool: webIframePool };
    if (key.startsWith('rdp:'))
        return { pool: rdpIframePool };
    return null;
}
function tmuxEnsurePooledFrame(key) {
    const spec = tmuxPoolForKey(key);
    if (!spec)
        return null;
    const existing = spec.pool.get(key);
    if (existing)
        return existing;
    const src = tmuxKeyToSrc(key);
    if (!src)
        return null;
    const f = document.createElement('iframe');
    f.src = src;
    f.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;border:0;display:none;';
    spec.onCreate?.(f, key);
    spec.pool.set(key, f);
    tmuxAllFrames.set(key, f);
    tmuxTreeRoot.appendChild(f);
    return f;
}
function tmuxAssignPaneContent(paneId, key) {
    const affected = new Set([paneId]);
    (function walk(p) {
        if (p.split && p.children) {
            walk(p.children[0]);
            walk(p.children[1]);
            return;
        }
        if (key && p.contentKey === key && p.id !== paneId) {
            p.contentKey = null;
            affected.add(p.id);
        }
    })(tmuxRoot);
    const pane = tmuxFind(tmuxRoot, paneId);
    if (pane && !pane.split)
        pane.contentKey = key;
    affected.forEach(tmuxRefreshEmptyState);
}
function tmuxRefreshEmptyState(paneId) {
    const pane = tmuxFind(tmuxRoot, paneId);
    if (!pane || pane.split)
        return;
    const content = tmuxPaneEls.get(paneId)?.querySelector('.tmux-leaf-content');
    if (!content)
        return;
    content.querySelectorAll('.tmux-leaf-empty').forEach(e => e.remove());
    if (!pane.contentKey) {
        const empty = document.createElement('div');
        empty.className = 'tmux-leaf-empty';
        empty.textContent = L('ctrl.tmux.emptyPane', 'Empty — pick content from the Multiplexer menu');
        content.appendChild(empty);
    }
}
function tmuxSyncPanePositions() {
    const rootRect = tmuxTreeRoot.getBoundingClientRect();
    const assignedKeys = new Set();
    (function walk(p) {
        if (p.split && p.children) {
            walk(p.children[0]);
            walk(p.children[1]);
            return;
        }
        if (!p.contentKey)
            return;
        const f = tmuxEnsurePooledFrame(p.contentKey);
        if (!f)
            return;
        assignedKeys.add(p.contentKey);
        const leafContent = tmuxPaneEls.get(p.id)?.querySelector('.tmux-leaf-content');
        if (!leafContent)
            return;
        const r = leafContent.getBoundingClientRect();
        f.style.left = `${r.left - rootRect.left}px`;
        f.style.top = `${r.top - rootRect.top}px`;
        f.style.width = `${r.width}px`;
        f.style.height = `${r.height}px`;
        if (f.style.display !== 'block') {
            f.style.display = 'block';
            postFrameVisible(f, true);
        }
    })(tmuxRoot);
    tmuxAllFrames.forEach((f, key) => {
        if (!assignedKeys.has(key) && f.style.display !== 'none') {
            postFrameVisible(f, false);
            f.style.display = 'none';
        }
    });
}
new ResizeObserver(() => tmuxSyncPanePositions()).observe(tmuxTreeRoot);
function tmuxPlaceInPane(paneId, key) {
    tmuxAssignPaneContent(paneId, key);
    tmuxSyncPanePositions();
}
function tmuxFindPaneIdByKey(key) {
    let found = null;
    (function walk(p) {
        if (found)
            return;
        if (p.split && p.children) {
            walk(p.children[0]);
            walk(p.children[1]);
            return;
        }
        if (p.contentKey === key)
            found = p.id;
    })(tmuxRoot);
    return found;
}
function tmuxPlaceFrame(key, _f) {
    tmuxPlaceInPane(tmuxFindPaneIdByKey(key) ?? tmuxFirstPaneId(), key);
    tmuxSaveLayout();
    tmuxShowPanel();
}
function tmuxClearIfShowing(key) {
    let changed = false;
    (function walk(p) {
        if (p.split && p.children) {
            walk(p.children[0]);
            walk(p.children[1]);
            return;
        }
        if (p.contentKey !== key)
            return;
        p.contentKey = null;
        tmuxRefreshEmptyState(p.id);
        changed = true;
    })(tmuxRoot);
    if (changed) {
        tmuxSyncPanePositions();
        tmuxSaveLayout();
    }
}
function tmuxCollectIds(p, out = []) {
    out.push(p.id);
    if (p.children) {
        tmuxCollectIds(p.children[0], out);
        tmuxCollectIds(p.children[1], out);
    }
    return out;
}
function tmuxKeyToSrc(key) {
    if (key.startsWith('chat:')) {
        const p = parseSessKey(key);
        const ctx = serverCtxOf(p.remoteId);
        return ctx ? `${ctx.artgineUrl}artgine/server/html/Chat.html?session=${encodeURIComponent(p.id)}` : null;
    }
    if (key.startsWith('term:')) {
        const p = parseSessKey(key);
        const ctx = serverCtxOf(p.remoteId);
        return ctx ? ctxApiUrl(ctx, `cmd/terminal-proxy?token=${encodeURIComponent(p.id)}`) : null;
    }
    if (key.startsWith('browser:')) {
        const p = parseSessKey(key);
        const ctx = serverCtxOf(p.remoteId);
        return ctx ? `${ctx.artgineUrl}artgine/server/html/Browser.html?session=${encodeURIComponent(p.id)}` : null;
    }
    if (key === 'rdp:local') {
        return `${CPath.WebRootArtgineUrl()}artgine/server/html/RemoteDesktop.html`;
    }
    if (key.startsWith('rdp:remote:')) {
        const remote = rdpRemotes.find(r => r.remoteId === key.slice(11));
        return remote ? `${rdpRemoteWebRootUrl(remote.entryUrl)}artgine/server/html/RemoteDesktop.html` : null;
    }
    if (key.startsWith('editor:')) {
        const s = editorSessions.get(key);
        return s ? editorFrameSrc(s) : null;
    }
    if (key.startsWith('web:')) {
        const s = webSessions.get(key);
        return s ? s.url : null;
    }
    return null;
}
function tmuxBuildEl(pane) {
    if (pane.split && pane.children) {
        const el = document.createElement('div');
        el.className = `tmux-split tmux-split-${pane.split}`;
        el.dataset.paneId = pane.id;
        el.appendChild(tmuxBuildEl(pane.children[0]));
        el.appendChild(tmuxBuildEl(pane.children[1]));
        tmuxPaneEls.set(pane.id, el);
        return el;
    }
    const el = document.createElement('div');
    el.className = 'tmux-leaf';
    el.dataset.paneId = pane.id;
    const content = document.createElement('div');
    content.className = 'tmux-leaf-content';
    el.appendChild(content);
    if (!pane.contentKey) {
        const empty = document.createElement('div');
        empty.className = 'tmux-leaf-empty';
        empty.textContent = L('ctrl.tmux.emptyPane', 'Empty — pick content from the Multiplexer menu');
        content.appendChild(empty);
    }
    const dropzone = document.createElement('div');
    dropzone.className = 'tmux-leaf-dropzone';
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('tmux-leaf-dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('tmux-leaf-dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('tmux-leaf-dragover');
        const key = e.dataTransfer?.getData('text/plain');
        if (key)
            tmuxSetPaneContent(pane.id, key);
    });
    el.appendChild(dropzone);
    tmuxPaneEls.set(pane.id, el);
    return el;
}
function tmuxRenderAll() {
    tmuxPaneEls.clear();
    tmuxTreeStruct.innerHTML = '';
    tmuxTreeStruct.appendChild(tmuxBuildEl(tmuxRoot));
    tmuxSyncPanePositions();
}
function tmuxSplitPane(paneId, dir) {
    const pane = tmuxFind(tmuxRoot, paneId);
    if (!pane || pane.split)
        return;
    const oldEl = tmuxPaneEls.get(pane.id);
    const child1 = { id: genUuid(), contentKey: pane.contentKey ?? null };
    const child2 = { id: genUuid(), contentKey: null };
    pane.split = dir;
    pane.children = [child1, child2];
    delete pane.contentKey;
    const splitEl = document.createElement('div');
    splitEl.className = `tmux-split tmux-split-${dir}`;
    splitEl.dataset.paneId = pane.id;
    splitEl.appendChild(tmuxBuildEl(child1));
    splitEl.appendChild(tmuxBuildEl(child2));
    oldEl?.replaceWith(splitEl);
    tmuxPaneEls.set(pane.id, splitEl);
    tmuxSyncPanePositions();
    tmuxSaveLayout();
}
function tmuxMergePane(paneId) {
    const found = tmuxFindParent(tmuxRoot, paneId);
    if (!found || !found.parent)
        return;
    const { pane, parent } = found;
    const keptContentKey = pane.contentKey ?? null;
    const staleIds = tmuxCollectIds(parent);
    const parentEl = tmuxPaneEls.get(parent.id);
    parent.split = undefined;
    parent.children = undefined;
    parent.contentKey = keptContentKey;
    const newLeafEl = tmuxBuildEl(parent);
    parentEl?.replaceWith(newLeafEl);
    staleIds.forEach(id => { if (id !== parent.id)
        tmuxPaneEls.delete(id); });
    tmuxPaneEls.set(parent.id, newLeafEl);
    tmuxSyncPanePositions();
    tmuxSaveLayout();
}
function tmuxOpenSelectModal(paneId) {
    const chatItems = (lastChatSessions ?? []).map(s => ({ key: sessKey('chat', s.remoteId, s.sessionId), label: s.title || s.sessionId, sub: s.workingDir }));
    const chatKnownKeys = new Set(chatItems.map(it => it.key));
    chatIframePool.forEach((_f, key) => {
        if (!chatKnownKeys.has(key))
            chatItems.push({ key, label: L('ctrl.tmux.unsentChat', '(New, unsent)'), sub: key.slice(5) });
    });
    const groups = [
        { label: 'Chat', items: chatItems },
        { label: 'Terminal', items: (lastTermSessions ?? []).map(s => ({ key: sessKey('term', s.remoteId, s.token), label: s.key || s.lastMsg || `(${s.mode})`, sub: s.workingDir || s.token })) },
        { label: 'Browser', items: Array.from(browserSessions.values()).map(s => ({ key: sessKey('browser', s.remoteId, s.sessionId), label: s.url, sub: s.browserName })) },
        { label: 'RDP', items: [{ key: 'rdp:local', label: 'Local' }, ...rdpRemotes.map(r => ({ key: `rdp:remote:${r.remoteId}`, label: r.entryUrl }))] },
        { label: 'Editor', items: Array.from(editorSessions.values()).map(s => ({ key: s.key, label: s.path.split('/').pop() || s.path, sub: s.path })) },
        { label: 'Web', items: Array.from(webSessions.values()).map(s => ({ key: s.key, label: s.url })) },
    ];
    const bodyHtml = groups.map(g => `
        <div class="mb-2">
            <div class="small text-secondary fw-semibold mb-1">${aiEscapeHtml(g.label)}</div>
            ${g.items.length ? g.items.map(it => `<button type="button" class="btn btn-sm btn-outline-secondary d-block w-100 text-start mb-1 tmux-select-item" data-key="${aiEscapeHtml(it.key)}">
                <span class="d-block text-truncate">${aiEscapeHtml(it.label)}</span>
                ${it.sub ? `<span class="d-block text-truncate text-secondary" style="font-size:0.7rem;">${aiEscapeHtml(it.sub)}</span>` : ''}
            </button>`).join('') : `<div class="small text-secondary fst-italic">${L('ctrl.tmux.noSessions', 'None')}</div>`}
        </div>`).join('') +
        `<button type="button" class="btn btn-sm btn-outline-danger w-100 mt-1" id="tmux-select-clear">${L('ctrl.tmux.clearPane', 'Clear')}</button>`;
    const modal = new CModal();
    modal.SetHeader(L('ctrl.tmux.select', 'Select content'));
    modal.SetBody(bodyHtml);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(420, 480);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        document.querySelectorAll('.tmux-select-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                tmuxSetPaneContent(paneId, key);
                modal.Close();
            });
        });
        document.getElementById('tmux-select-clear')?.addEventListener('click', () => {
            tmuxSetPaneContent(paneId, null);
            modal.Close();
        });
    }, MODAL_DOM_DELAY);
}
function tmuxSetPaneContent(paneId, key) {
    const pane = tmuxFind(tmuxRoot, paneId);
    if (!pane || pane.split)
        return;
    if (key)
        tmuxEnsurePooledFrame(key);
    const sourcePaneId = key ? tmuxFindPaneIdByKey(key) : null;
    if (sourcePaneId && sourcePaneId !== paneId) {
        const sourcePane = tmuxFind(tmuxRoot, sourcePaneId);
        const displaced = pane.contentKey ?? null;
        sourcePane.contentKey = displaced;
        pane.contentKey = key;
        tmuxRefreshEmptyState(sourcePaneId);
        tmuxRefreshEmptyState(paneId);
    }
    else {
        tmuxAssignPaneContent(paneId, key);
    }
    tmuxSyncPanePositions();
    tmuxSaveLayout();
}
function tmuxPaneLabel(pane) {
    const key = pane.contentKey;
    if (!key)
        return L('ctrl.tmux.emptyPane2', 'Empty');
    if (key === 'rdp:local')
        return 'RDP · Local';
    if (key.startsWith('rdp:remote:')) {
        const remote = rdpRemotes.find(r => r.remoteId === key.slice(11));
        return remote ? `RDP · ${remote.entryUrl}` : 'RDP';
    }
    if (key.startsWith('editor:')) {
        const s = editorSessions.get(key);
        return s ? `Editor · ${s.path.split('/').pop() || s.path}` : 'Editor';
    }
    if (key.startsWith('chat:'))
        return 'Chat';
    if (key.startsWith('term:'))
        return 'Terminal';
    if (key.startsWith('browser:'))
        return 'Browser';
    if (key.startsWith('web:')) {
        const s = webSessions.get(key);
        return s ? `Web · ${s.url}` : 'Web';
    }
    return key;
}
function tmuxShowPanel() {
    window.bootstrap.Tab.getOrCreateInstance(CDOM.ID('tmux-panel-tab')).show();
}
function tmuxSidebarVisible(side) {
    if (document.body.classList.contains(side === 'left' ? 'hide-left-sidebar' : 'hide-right-sidebar'))
        return false;
    const el = side === 'left' ? appSidebar : appSidebarRight;
    if (!el)
        return false;
    if (el.classList.contains('sidebar-docked'))
        return true;
    return el.classList.contains('show');
}
function tmuxHideSidebar(side) {
    const el = side === 'left' ? appSidebar : appSidebarRight;
    const wrap = side === 'left' ? sidebarToggleBtnWrap : sidebarToggleBtnWrapRight;
    document.body.classList.add(side === 'left' ? 'hide-left-sidebar' : 'hide-right-sidebar');
    if (wrap)
        wrap.style.display = '';
    if (el?.classList.contains('show'))
        window.bootstrap.Offcanvas.getOrCreateInstance(el).hide();
}
function tmuxShowSidebar(side) {
    const el = side === 'left' ? appSidebar : appSidebarRight;
    document.body.classList.remove(side === 'left' ? 'hide-left-sidebar' : 'hide-right-sidebar');
    updateSidebarMode();
    if (el && !el.classList.contains('sidebar-docked') && !el.classList.contains('show')) {
        window.bootstrap.Offcanvas.getOrCreateInstance(el).show();
    }
}
function tmuxToggleSidebar(side) {
    if (tmuxSidebarVisible(side))
        tmuxHideSidebar(side);
    else
        tmuxShowSidebar(side);
}
appSidebar?.addEventListener('show.bs.offcanvas', () => { document.body.classList.remove('hide-left-sidebar'); updateSidebarMode(); });
appSidebarRight?.addEventListener('show.bs.offcanvas', () => { document.body.classList.remove('hide-right-sidebar'); updateSidebarMode(); });
function tmuxCollectLeavesGrouped() {
    const out = [];
    let groupSeq = 0;
    (function walk(p, group) {
        if (p.split && p.children) {
            const g = ++groupSeq;
            walk(p.children[0], g);
            walk(p.children[1], g);
        }
        else {
            out.push({ pane: p, group });
        }
    })(tmuxRoot, 0);
    return out;
}
function tmuxRenderMenu() {
    const menu = CDOM.ID('tmux-dropdown-menu');
    if (!menu)
        return;
    const entries = tmuxCollectLeavesGrouped();
    let rowsHtml = '';
    entries.forEach((entry, i) => {
        if (i > 0 && entry.group !== entries[i - 1].group)
            rowsHtml += `<li><hr class="dropdown-divider"></li>`;
        const { pane } = entry;
        const canMerge = !!tmuxFindParent(tmuxRoot, pane.id)?.parent;
        const numPrefix = entry.group > 0 ? `${aiEscapeHtml(String(entry.group))}. ` : '';
        rowsHtml += `<li>
            <div class="tmux-menu-pane" data-pane-id="${pane.id}">
                <span class="tmux-menu-pane-label" data-act="show">${numPrefix}${aiEscapeHtml(tmuxPaneLabel(pane))}</span>
                <div class="tmux-menu-pane-actions">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-act="split-h" data-CLan-title="ctrl.tmux.splitH" title="Split horizontal"><i class="bi bi-layout-split"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-act="split-v" data-CLan-title="ctrl.tmux.splitV" title="Split vertical"><i class="bi bi-layout-split" style="display:inline-block;transform:rotate(90deg);"></i></button>
                    ${canMerge ? `<button type="button" class="btn btn-sm btn-outline-secondary" data-act="merge" data-CLan-title="ctrl.tmux.merge" title="Merge"><i class="bi bi-arrows-angle-contract"></i></button>` : ''}
                    <button type="button" class="btn btn-sm btn-outline-primary" data-act="select" data-CLan-title="ctrl.tmux.select" title="Select content"><i class="bi bi-card-list"></i></button>
                </div>
            </div>
        </li>`;
    });
    const rightVisible = tmuxSidebarVisible('right');
    const leftVisible = tmuxSidebarVisible('left');
    menu.innerHTML =
        `<li><button type="button" class="dropdown-item" id="tmux-toggle-left-btn"><i class="bi bi-layout-sidebar-inset"></i> ${aiEscapeHtml(leftVisible ? L('ctrl.tmux.hideLeft', 'Turn off left side') : L('ctrl.tmux.showLeft', 'Turn on left side'))}</button></li>
        <li><button type="button" class="dropdown-item" id="tmux-toggle-right-btn"><i class="bi bi-layout-sidebar-inset-reverse"></i> ${aiEscapeHtml(rightVisible ? L('ctrl.tmux.hideRight', 'Turn off right side') : L('ctrl.tmux.showRight', 'Turn on right side'))}</button></li>
        <li><hr class="dropdown-divider"></li>` +
            rowsHtml;
    CDOM.ID('tmux-toggle-left-btn')?.addEventListener('click', () => tmuxToggleSidebar('left'));
    CDOM.ID('tmux-toggle-right-btn')?.addEventListener('click', () => tmuxToggleSidebar('right'));
    menu.querySelectorAll('.tmux-menu-pane').forEach(row => {
        const paneId = row.dataset.paneId;
        row.querySelector('[data-act="show"]')?.addEventListener('click', () => tmuxShowPanel());
        row.querySelector('[data-act="split-h"]')?.addEventListener('click', (e) => { e.stopPropagation(); tmuxSplitPane(paneId, 'row'); tmuxShowPanel(); });
        row.querySelector('[data-act="split-v"]')?.addEventListener('click', (e) => { e.stopPropagation(); tmuxSplitPane(paneId, 'col'); tmuxShowPanel(); });
        row.querySelector('[data-act="merge"]')?.addEventListener('click', (e) => { e.stopPropagation(); tmuxMergePane(paneId); tmuxShowPanel(); });
        row.querySelector('[data-act="select"]')?.addEventListener('click', (e) => { e.stopPropagation(); tmuxOpenSelectModal(paneId); });
    });
    applyLanIn(menu);
}
CDOM.ID('tmux-tab').addEventListener('show.bs.dropdown', () => tmuxRenderMenu());
tmuxRenderAll();
tmuxRenderMenu();
refreshRdpHighlights();
renderSessionSidebar();
MountScheduleTab();
function agentRuleToLine(r) {
    const parts = [];
    if (r.type)
        parts.push(`type:${r.type}`);
    if (r.tool)
        parts.push(`tool:${r.tool}`);
    if (r.command)
        parts.push(`cmd:${r.command}`);
    return parts.join(' ');
}
function agentRulesToText(rules) {
    return (rules ?? []).map(agentRuleToLine).filter(s => s.length > 0).join('\n');
}
function agentTextToRules(text) {
    const out = [];
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line)
            continue;
        const rule = {};
        let head = line;
        const ci = line.indexOf('cmd:');
        if (ci >= 0) {
            rule.command = line.slice(ci + 4).trim();
            head = line.slice(0, ci).trim();
        }
        let sawPrefix = false;
        for (const tok of head.split(/\s+/)) {
            if (!tok)
                continue;
            if (tok.startsWith('type:')) {
                rule.type = tok.slice(5);
                sawPrefix = true;
            }
            else if (tok.startsWith('tool:')) {
                rule.tool = tok.slice(5);
                sawPrefix = true;
            }
        }
        if (!sawPrefix && ci < 0)
            rule.command = head;
        if (rule.type || rule.tool || rule.command)
            out.push(rule);
    }
    return out;
}
const agentList = CDOM.ID('agentList');
async function agentRefresh() {
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/agents');
        const j = await r.json();
        if (!j.ok)
            return;
        agentList.innerHTML = '';
        const agents = j.agents;
        for (const a of agents) {
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-1 rounded';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    <span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(a.key)}${a.super ? ' <span class="badge bg-warning text-dark" style="font-size:0.6rem;">SUPER</span>' : ''}${a.retryCount > 0 ? ` <span class="badge bg-info text-dark" style="font-size:0.6rem;">RETRY x${a.retryCount}</span>` : ''}${a.hidden ? ' <span class="badge bg-secondary" style="font-size:0.6rem;">HIDDEN</span>' : ''}</span>
                    <span class="text-truncate text-secondary" style="font-size:0.7rem;">${aiEscapeHtml(a.provider)} / ${aiEscapeHtml(a.model)} · ${a.score}</span>
                    <span class="text-truncate small text-body-secondary" style="font-size:0.7rem;">${aiEscapeHtml(a.workingDir || './')}</span>
                    <span class="text-truncate small text-body-secondary">${aiEscapeHtml(a.traits.join(', '))}</span>
                </span>
                <button class="agent-del-btn btn btn-sm btn-link text-danger p-0" title="${L('ctrl.delete', 'Delete')}"><i class="bi bi-trash"></i></button>
            `;
            item.addEventListener('click', () => agentOpenModal(a));
            item.querySelector('.agent-del-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const dlg = new CConfirm();
                dlg.SetBody(LF('ctrl.msg.deleteSubAgent', 'Delete sub agent "{0}"?', aiEscapeHtml(a.key)));
                dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
                    async () => {
                        await authedFetch(`${CPath.WebRootUrl()}cmd/agent-del?key=${encodeURIComponent(a.key)}`);
                        agentRefresh();
                    },
                    () => { },
                ], [L('ctrl.delete', 'Delete'), L('ctrl.cancel', 'Cancel')]);
                dlg.Open();
            });
            item.addEventListener('mouseenter', () => item.classList.add('bg-body-secondary'));
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
            agentList.appendChild(item);
        }
    }
    catch (e) {
        console.error('agentRefresh error:', e);
    }
}
const TEAM_AUTO_MAX = 20;
const AGENT_PROVIDER_IDS = ['claude', 'codex', 'antigravity', 'opencode', 'grok'];
const AGENT_PROVIDER_LABELS = { claude: 'Claude', codex: 'Codex', antigravity: 'Antigravity', opencode: 'OpenCode', grok: 'Grok' };
const LS_PROVIDER = 'ai.provider';
const LS_MODEL = 'ai.model';
function getLastProvider() {
    const v = CStorage.Get(LS_PROVIDER);
    return v || null;
}
function getLastModel() {
    const v = CStorage.Get(LS_MODEL);
    return v || null;
}
function saveLastProviderModel(provider, model = '') {
    if (!provider)
        return;
    CStorage.Set(LS_PROVIDER, provider);
    if (provider !== 'cmd' && model)
        CStorage.Set(LS_MODEL, model);
}
const gAgentModelsCache = new Map();
const gAgentModelsFetching = new Map();
async function agentFetchModels(remoteId = '') {
    const cached = gAgentModelsCache.get(remoteId);
    if (cached)
        return cached;
    const inFlight = gAgentModelsFetching.get(remoteId);
    if (inFlight)
        return inFlight;
    const p = (async () => {
        try {
            const ctx = serverCtxOf(remoteId);
            const r = ctx && remoteId ? await ctxFetch(ctx, 'AIInfo/setting') : await authedFetch(CPath.WebRootUrl() + 'AIInfo/setting');
            const setting = await r.json();
            const models = setting.models || {};
            gAgentModelsCache.set(remoteId, models);
            return models;
        }
        catch (e) {
            console.error('agentFetchModels error:', e);
            return {};
        }
        finally {
            gAgentModelsFetching.delete(remoteId);
        }
    })();
    gAgentModelsFetching.set(remoteId, p);
    return p;
}
async function agentOpenModal(existing) {
    const isEdit = !!existing;
    const modelMap = await agentFetchModels();
    const modelsFor = (providerId) => modelMap[providerId] ?? [];
    const lastProvider = getLastProvider();
    const lastModel = getLastModel() || '';
    const defaultProvider = existing?.provider
        || (lastProvider && AGENT_PROVIDER_IDS.includes(lastProvider) ? lastProvider : AGENT_PROVIDER_IDS[0]);
    const modelsOfDefault = modelsFor(defaultProvider);
    const defaultModel = existing?.model
        || (lastModel && modelsOfDefault.some(m => m.value === lastModel) ? lastModel : '')
        || modelsOfDefault[0]?.value || '';
    const buildModelOptions = (providerId, selected) => {
        const models = modelsFor(providerId).slice();
        const values = models.map(m => m.value);
        const sel = selected || models[0]?.value || '';
        if (sel && !values.includes(sel))
            models.push({ value: sel, label: sel });
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
                        <div class="mb-2 form-check">
                            <input class="form-check-input" type="checkbox" id="agent-hidden" ${existing?.hidden ? 'checked' : ''}>
                            <label class="form-check-label small text-secondary" for="agent-hidden">${L('ctrl.lbl.hideInSidebar', 'Hide in sidebar (when the hide toggle is on)')}</label>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small text-secondary mb-1">Retry Text (auto-repeat instruction while idle)</label>
                            <textarea id="agent-retry-text" class="form-control form-control-sm" rows="2" placeholder="e.g. Review the result once more and improve quality">${aiEscapeHtml(existing?.retryText || '')}</textarea>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small text-secondary mb-1">Retry Count (0 = disabled)</label>
                            <input id="agent-retry-count" type="number" min="0" step="1" class="form-control form-control-sm" placeholder="0" value="${existing?.retryCount ?? 0}">
                        </div>
                        <hr class="my-2">
                        <div class="small text-secondary mb-1">Session Permissions <span class="text-body-secondary">(added on top of global settings.json · one rule per line · <code>deny</code> wins)</span></div>
                        <div class="small text-body-secondary mb-2" style="font-size:0.68rem;">Format: bare line = command prefix (e.g. <code>node *ai/tool/x</code>), or use <code>type:write</code> / <code>tool:Edit</code> / <code>cmd:git log</code> tokens.</div>
                        <div class="mb-2">
                            <label class="form-label small text-success mb-1">Allow</label>
                            <textarea id="agent-perm-allow" class="form-control form-control-sm" rows="3" placeholder="e.g.&#10;cmd:cd D:/MyProject&#10;tool:Edit&#10;type:read">${aiEscapeHtml(agentRulesToText(existing?.permissions?.allow))}</textarea>
                        </div>
                        <div class="mb-0">
                            <label class="form-label small text-danger mb-1">Deny</label>
                            <textarea id="agent-perm-deny" class="form-control form-control-sm" rows="3" placeholder="e.g.&#10;cmd:rm -rf&#10;cmd:git push">${aiEscapeHtml(agentRulesToText(existing?.permissions?.deny))}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="d-flex justify-content-between">
            <button id="agent-modal-save" class="btn btn-primary">${isEdit ? L('ctrl.save', 'Save') : L('ctrl.create', 'Create')}</button>
            <button id="agent-modal-cancel" class="btn btn-danger ms-2">${L('ctrl.cancel', 'Cancel')}</button>
        </div>`;
    const modal = new CModal();
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader(isEdit ? L('ctrl.hdr.editSubAgent', 'Edit Sub Agent') : L('ctrl.hdr.newSubAgent', 'New Sub Agent'));
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.SetSize(560, 600);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const keyInput = container.querySelector('#agent-key');
        const providerSelect = container.querySelector('#agent-provider');
        const modelSelect = container.querySelector('#agent-model');
        keyInput.focus();
        providerSelect.addEventListener('change', () => {
            const prefer = getLastModel() || '';
            modelSelect.innerHTML = buildModelOptions(providerSelect.value, prefer);
        });
        const doSave = async () => {
            const key = keyInput.value.trim();
            if (!key) {
                CAlert.E(L('ctrl.msg.keyRequired', 'Key is required'));
                return;
            }
            const workingDir = (container.querySelector('#agent-working-dir')).value.trim() || './';
            const superChecked = (container.querySelector('#agent-super')).checked;
            const hiddenChecked = (container.querySelector('#agent-hidden')).checked;
            const permissions = {
                allow: agentTextToRules((container.querySelector('#agent-perm-allow')).value),
                deny: agentTextToRules((container.querySelector('#agent-perm-deny')).value),
            };
            saveLastProviderModel(providerSelect.value, modelSelect.value);
            const params = new URLSearchParams({
                key,
                provider: providerSelect.value,
                model: modelSelect.value,
                score: String(Number((container.querySelector('#agent-score')).value) || 0),
                traits: (container.querySelector('#agent-traits')).value,
                workingDir,
                super: superChecked ? '1' : '0',
                retryText: (container.querySelector('#agent-retry-text')).value.trim(),
                retryCount: String(Math.max(0, Number((container.querySelector('#agent-retry-count')).value) || 0)),
                permissions: JSON.stringify(permissions),
                hidden: hiddenChecked ? '1' : '0',
            });
            const r = await authedFetch(`${CPath.WebRootUrl()}cmd/agent-set?${params.toString()}`);
            const j = await r.json();
            if (!j.ok) {
                CAlert.E(j.msg || 'Failed');
                return;
            }
            modal.Close();
            agentRefresh();
        };
        container.querySelector('#agent-modal-save').addEventListener('click', doSave);
        container.querySelector('#agent-modal-cancel').addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}
CDOM.ID('agent-new-btn').addEventListener('click', () => agentOpenModal());
agentRefresh();
setInterval(agentRefresh, 5000);
async function teamOpenModal() {
    const modelMap = await agentFetchModels();
    const modelsFor = (providerId) => modelMap[providerId] ?? [];
    const lastProvider = getLastProvider();
    const lastModel = getLastModel() || '';
    const defaultProvider = (lastProvider && AGENT_PROVIDER_IDS.includes(lastProvider)) ? lastProvider : AGENT_PROVIDER_IDS[0];
    const modelsOfDefault = modelsFor(defaultProvider);
    const defaultModel = (lastModel && modelsOfDefault.some(m => m.value === lastModel) ? lastModel : '') || modelsOfDefault[0]?.value || '';
    const buildModelOptions = (providerId, selected) => {
        const models = modelsFor(providerId).slice();
        const sel = selected || models[0]?.value || '';
        if (sel && !models.some(m => m.value === sel))
            models.push({ value: sel, label: sel });
        return models.map(m => `<option value="${aiEscapeHtml(m.value)}" ${m.value === sel ? 'selected' : ''}>${aiEscapeHtml(m.label)}</option>`).join('');
    };
    let agents = [];
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/agents');
        const j = await r.json();
        if (j.ok)
            agents = j.agents;
    }
    catch { }
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
            <select id="team-model" class="form-select form-select-sm">${buildModelOptions(defaultProvider, defaultModel)}</select>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Goal</label>
            <textarea id="team-goal" class="form-control form-control-sm" rows="3" placeholder="e.g. Analyze the text files in the xx folder and summarize them into an md file"></textarea>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Auto Staff (provider / model / count)</label>
            <div class="d-flex gap-1 mb-1">
                <select id="team-auto-provider" class="form-select form-select-sm" style="flex:0 0 8rem;">
                    ${AGENT_PROVIDER_IDS.map(id => `<option value="${id}" ${id === defaultProvider ? 'selected' : ''}>${AGENT_PROVIDER_LABELS[id]}</option>`).join('')}
                </select>
                <select id="team-auto-model" class="form-select form-select-sm">${buildModelOptions(defaultProvider, defaultModel)}</select>
                <input id="team-auto-count" type="number" min="1" max="${TEAM_AUTO_MAX}" step="1" value="1" class="form-control form-control-sm" style="flex:0 0 4.5rem;">
                <button id="team-auto-add" class="btn btn-sm btn-outline-primary" style="white-space:nowrap;">Add</button>
            </div>
            <div id="team-auto-list" class="border rounded p-2" style="max-height:120px;overflow-y:auto;"></div>
            <div class="form-text" style="font-size:0.7rem;">Added staff are created fresh for this team, run in the team leader's working folder with approvals auto-granted, and are deleted when the team ends.</div>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Manual Staff (already-registered sub agents)</label>
            <div id="team-agents" class="border rounded p-2" style="max-height:140px;overflow-y:auto;">
                ${agents.length === 0
        ? `<div class="text-secondary small">${L('ctrl.msg.noSubAgentsHint', 'No sub agents registered. Register one first in the right sidebar → Sub Agent.')}</div>`
        : agents.map(a => `
                        <div class="form-check">
                            <input class="form-check-input team-agent-check" type="checkbox" value="${aiEscapeHtml(a.key)}" id="team-agent-${aiEscapeHtml(a.key)}">
                            <label class="form-check-label small" for="team-agent-${aiEscapeHtml(a.key)}">
                                ${aiEscapeHtml(a.key)}
                                <span class="text-secondary">${aiEscapeHtml(a.provider)} / ${aiEscapeHtml(a.model)} · ${a.score}</span>
                            </label>
                        </div>`).join('')}
            </div>
        </div>
        <hr class="my-3">
        <div class="mb-3">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.stopLimit', 'Stop — time limit (min, 0 = unlimited)')}</label>
            <input id="team-limit-min" type="number" min="0" step="1" class="form-control form-control-sm" value="60">
            <div class="form-text" style="font-size:0.7rem;">${L('ctrl.lbl.stopHint', 'If any task fails, the whole team stops immediately regardless of time.')}</div>
        </div>
        <div class="d-flex justify-content-between">
            <button id="team-modal-create" class="btn btn-primary">${L('ctrl.create', 'Create')}</button>
            <button id="team-modal-cancel" class="btn btn-danger ms-2">${L('ctrl.cancel', 'Cancel')}</button>
        </div>`;
    const modal = new CModal();
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader(L('ctrl.hdr.newTeam', 'New Team'));
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        const providerSelect = container.querySelector('#team-provider');
        const modelSelect = container.querySelector('#team-model');
        const goalInput = container.querySelector('#team-goal');
        const createBtn = container.querySelector('#team-modal-create');
        const cancelBtn = container.querySelector('#team-modal-cancel');
        goalInput.focus();
        providerSelect.addEventListener('change', () => {
            const prefer = getLastModel() || '';
            modelSelect.innerHTML = buildModelOptions(providerSelect.value, prefer);
        });
        const autoProvider = container.querySelector('#team-auto-provider');
        const autoModel = container.querySelector('#team-auto-model');
        const autoCount = container.querySelector('#team-auto-count');
        const autoAddBtn = container.querySelector('#team-auto-add');
        const autoListBox = container.querySelector('#team-auto-list');
        const autoRows = [];
        const autoTotal = () => autoRows.reduce((sum, r) => sum + r.count, 0);
        const renderAutoList = () => {
            if (autoRows.length === 0) {
                autoListBox.innerHTML = `<div class="text-secondary small">No auto staff yet. Pick provider/model/count and press Add.</div>`;
                return;
            }
            autoListBox.innerHTML = autoRows.map((r, i) => `
                <div class="d-flex align-items-center justify-content-between">
                    <span class="small">${aiEscapeHtml(AGENT_PROVIDER_LABELS[r.provider] || r.provider)}
                        <span class="text-secondary">${aiEscapeHtml(r.model || '(default)')}</span>
                        × ${r.count}</span>
                    <button class="btn btn-sm btn-link text-danger p-0 team-auto-del" data-idx="${i}">✕</button>
                </div>`).join('');
            autoListBox.querySelectorAll('.team-auto-del').forEach(btn => {
                btn.addEventListener('click', () => {
                    autoRows.splice(Number(btn.dataset.idx), 1);
                    renderAutoList();
                });
            });
        };
        renderAutoList();
        autoProvider.addEventListener('change', () => {
            autoModel.innerHTML = buildModelOptions(autoProvider.value, '');
        });
        autoAddBtn.addEventListener('click', () => {
            const provider = autoProvider.value;
            const model = autoModel.value;
            const room = TEAM_AUTO_MAX - autoTotal();
            if (room <= 0) {
                CAlert.E(`You can add at most ${TEAM_AUTO_MAX} auto staff.`);
                return;
            }
            const count = Math.min(Math.max(1, Math.floor(Number(autoCount.value) || 1)), room);
            const same = autoRows.find(r => r.provider === provider && r.model === model);
            if (same)
                same.count += count;
            else
                autoRows.push({ provider, model, count });
            renderAutoList();
        });
        let creating = false;
        const doCreate = async () => {
            if (creating)
                return;
            const goal = goalInput.value.trim();
            if (!goal) {
                CAlert.E(L('ctrl.msg.enterGoal', 'Enter a goal'));
                return;
            }
            const subAgents = Array.from(container.querySelectorAll('.team-agent-check'))
                .filter(c => c.checked).map(c => c.value);
            if (subAgents.length === 0 && autoRows.length === 0) {
                CAlert.E('Add at least one staff member (auto or manual)');
                return;
            }
            creating = true;
            createBtn.disabled = true;
            cancelBtn.disabled = true;
            const origHtml = createBtn.innerHTML;
            createBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${L('ctrl.creating', 'Creating...')}`;
            try {
                saveLastProviderModel(providerSelect.value, modelSelect.value);
                const params = new URLSearchParams({
                    provider: providerSelect.value,
                    model: modelSelect.value,
                    goal,
                    subAgents: subAgents.join(','),
                    autoAgents: JSON.stringify(autoRows),
                    limitMin: String(Number((container.querySelector('#team-limit-min')).value) || 0),
                });
                const r = await authedFetch(`${CPath.WebRootUrl()}cmd/start-team?${params.toString()}`);
                const j = await r.json();
                if (!j.ok) {
                    CAlert.E(j.msg || L('ctrl.msg.failedStartTeam', 'Failed to start team'));
                    return;
                }
                modal.Close();
                termActivatePane();
                showTermFrame(`term-new:${j.token}:${Date.now()}`, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${j.token}`);
                termRenderList();
                setTimeout(termRenderList, 1500);
                setTimeout(termRenderList, 4000);
            }
            catch (e) {
                console.error('[Team] start-team error:', e);
                CAlert.E(L('ctrl.msg.failedStartTeam', 'Failed to start team'));
            }
            finally {
                creating = false;
                createBtn.disabled = false;
                cancelBtn.disabled = false;
                createBtn.innerHTML = origHtml;
            }
        };
        createBtn.addEventListener('click', doCreate);
        cancelBtn.addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}
CDOM.ID('team-tab').addEventListener('click', () => teamOpenModal());
let messengerInited = false;
CDOM.ID('messenger-tab').addEventListener('shown.bs.tab', () => {
    if (messengerInited)
        return;
    messengerInited = true;
    MountMessengerTab('messenger-root', ctrlRequireAuthed);
});
if (CDOM.ID('messenger-panel').classList.contains('active')) {
    messengerInited = true;
    MountMessengerTab('messenger-root', ctrlRequireAuthed);
}
