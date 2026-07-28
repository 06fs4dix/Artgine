//Version
import "../../artgine/artgine.js"

//Class
import {CClass} from "../../artgine/basic/CClass.js";
import { MountDownloadTab } from "./Downloads/DownloadTab.js";
CClass.Push(MountDownloadTab);
import { MountMessengerTab } from "./Messenger/MessengerTab.js";
CClass.Push(MountMessengerTab);
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
gPF.mVersion = "ms2wpghp_6";

import {CAtelier} from "../../artgine/app/CAtelier.js";

import {CPlugin} from "../../artgine/util/CPlugin.js";
CPlugin.PushPath('ControlDownload','../../plugin/ControlDownload/');
import "../../plugin/ControlDownload/ControlDownload.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
// 탭 골격만 구성된 단계. 각 탭(RDP/터미널/브라우저/파일/메모/다운로드)의 기능 연결은 다음 단계에서 진행.
import { CDOM } from "../../artgine/basic/CDOM.js";
import { CPath } from "../../artgine/basic/CPath.js";
import { CModal, CConfirm } from "../../artgine/basic/CModal.js";
import { CORMViewer } from "../../artgine/util/CModalUtil.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CFecth } from "../../artgine/network/CFecth.js";
import { CHash } from "../../artgine/basic/CHash.js";
import { getAuthToken, setAuthToken, removeAuthToken, authLogin } from "../../artgine/server/CAuthToken.js";
import { CIframeMsg } from "../../artgine/server/html/CIframeMsg.js";
import { CModalStackMsg } from "../../artgine/util/CModalUtil.js";
import { CUtilWeb } from "../../artgine/util/CUtilWeb.js";
import { Bootstrap } from "../../artgine/basic/Bootstrap.js";
import { CLan } from "../../artgine/basic/CLan.js";
import { CStorage } from "../../artgine/system/CStorage.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { marked } from "../../artgine/external/esnext/md/marked.esm.js";

marked.setOptions({ gfm: true, breaks: true });

// 사이드바 도킹: 넓음=양쪽 고정, 중간=왼쪽만 고정(오른쪽 오버레이), 좁음=둘 다 오버레이.
// 컨테이너는 가운데 정렬이라 좌·우 여백이 같아, 단계별로 body 클래스 + 컨테이너 정렬을 바꾼다.
const appSidebar = document.getElementById('app-sidebar');
const sidebarToggleBtnWrap = document.getElementById('sidebarToggleBtnWrap');
const mainContainer = document.querySelector('.container') as HTMLElement | null;
const appSidebarRight = document.getElementById('app-sidebar-right');
const sidebarToggleBtnWrapRight = document.getElementById('sidebarToggleBtnWrapRight');
const SIDEBAR_WIDTH = 310;
const SIDEBAR_WIDTH_RIGHT = 300;
const CONTENT_MAX = 1200;
// 양쪽 도킹: 콘텐츠 1200 + 좌우 여유(≈325씩) = 1850.
// 왼쪽만 도킹: 콘텐츠를 1200으로 고정하지 않음. 사이드바 + 최소 본문 폭만 있으면 됨.
// (갤럭시 Tab S10 계열 가로 CSS ≈1100~1480 — 예전 1510 임계면 탭에서 왼쪽이 접힘)
const CONTENT_MIN_FOR_LEFT = 720;
const SIDEBAR_BOTH_MIN = CONTENT_MAX + 325 + 325; // 1850
const SIDEBAR_LEFT_MIN = SIDEBAR_WIDTH + CONTENT_MIN_FOR_LEFT; // 1030

function updateSidebarMode() {
    if (!mainContainer) return;
    // Multiplexer 최대화 중에는 레이아웃/도킹을 재적용하지 않는다(CSS display:none + 풀폭 컨테이너 유지).
    if (document.body.classList.contains('tmux-fullscreen')) return;
    const w = window.innerWidth;
    let leftDock = false;
    let rightDock = false;
    let layout: 'both' | 'left' | 'none' = 'none';
    if (w >= SIDEBAR_BOTH_MIN) {
        leftDock = true;
        rightDock = true;
        layout = 'both';
    } else if (w >= SIDEBAR_LEFT_MIN) {
        leftDock = true;
        rightDock = false;
        layout = 'left';
    }
    document.body.classList.toggle('sidebar-layout-both', layout === 'both');
    document.body.classList.toggle('sidebar-layout-left', layout === 'left');
    document.body.classList.toggle('sidebar-layout-none', layout === 'none');

    if (appSidebar) {
        appSidebar.classList.toggle('sidebar-docked', leftDock);
        if (sidebarToggleBtnWrap) sidebarToggleBtnWrap.style.display = leftDock ? 'none' : '';
    }
    if (appSidebarRight) {
        appSidebarRight.classList.toggle('sidebar-docked', rightDock);
        if (sidebarToggleBtnWrapRight) sidebarToggleBtnWrapRight.style.display = rightDock ? 'none' : '';
    }
}
updateSidebarMode();
window.addEventListener('resize', updateSidebarMode);

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

// ---- 우측 사이드바: 서브 에이전트 세션 숨기기 ----
// 터미널 세션 중 key가 있는(=set-agent로 등록된 서브 에이전트가 띄운) 항목을 좌측 Agent 목록에서 뺀다.
// 숨겨진 개수는 사라지지 않고 그룹 헤더에 배지로 남아, "몇 개가 숨어있는지"를 알 수 있게 한다.
const HIDE_SUBAGENT_LS = 'ctrl.hideSubAgentSessions';
// 저장된 값이 없으면 기본 ON(숨김). 사용자가 명시적으로 끈 경우('0')만 해제한다.
let hideSubAgentSessions = localStorage.getItem(HIDE_SUBAGENT_LS) !== '0';
const hideSubAgentChk = document.getElementById('hideSubAgentSessionsChk') as HTMLInputElement | null;
if (hideSubAgentChk) hideSubAgentChk.checked = hideSubAgentSessions;
hideSubAgentChk?.addEventListener('change', () => {
    hideSubAgentSessions = hideSubAgentChk.checked;
    localStorage.setItem(HIDE_SUBAGENT_LS, hideSubAgentSessions ? '1' : '0');
    renderSessionSidebar();
});

// ---- 우측 사이드바: 2단계 인증(메신저 승인) 설정 ----
// 셀렉트박스 하나로 선택/비선택만 관리한다(값 0 = 비활성). 로컬 서버 전용 설정.
const twoFactorSessionSelect = document.getElementById('twoFactorSessionSelect') as HTMLSelectElement | null;
const twoFactorMsg = document.getElementById('twoFactorMsg') as HTMLDivElement | null;

async function twoFactorLoadSessions(_selected: number) {
    if (!twoFactorSessionSelect) return;
    try {
        const j = await CFecth.Exe('messenger/list', null, 'json') as { ok: boolean, sessions?: Array<{ id: number, platform: string, botName: string }> };
        const sessions = j.ok ? (j.sessions ?? []) : [];
        twoFactorSessionSelect.innerHTML = `<option value="0">${L('ctrl.twoFactorDisabled', 'Disabled')}</option>`
            + sessions.map(s => `<option value="${s.id}">${aiEscapeHtml(`${s.platform} - ${s.botName}`)}</option>`).join('');
        twoFactorSessionSelect.value = String(_selected);
    } catch { /* 목록을 못 가져와도 셀렉트박스 자체는 계속 쓸 수 있게 조용히 둔다 */ }
}

async function twoFactorLoadConfig() {
    try {
        const j = await CFecth.Exe('auth/twoFactorConfig', null, 'json') as { ok: boolean, sessionId?: number };
        if (!j.ok) return;
        await twoFactorLoadSessions(j.sessionId ?? 0);
    } catch { /* 인증 전이면 조회가 막힌다 - 로그인 후 옵션 탭을 열면 다시 로드됨 */ }
}

async function twoFactorSaveConfig() {
    if (twoFactorMsg) twoFactorMsg.textContent = '';
    try {
        const body = { sessionId: Number(twoFactorSessionSelect?.value ?? 0) };
        const j = await CFecth.Exe('auth/twoFactorConfig', body, 'json') as { ok: boolean, msg?: string };
        if (twoFactorMsg) twoFactorMsg.textContent = j.ok ? L('ctrl.twoFactorSaved', 'Saved') : (j.msg ?? L('ctrl.serverError', 'Server error'));
    } catch {
        if (twoFactorMsg) twoFactorMsg.textContent = L('ctrl.serverError', 'Server error');
    }
}

twoFactorSessionSelect?.addEventListener('change', () => twoFactorSaveConfig());
CDOM.ID('right-option-tab').addEventListener('shown.bs.tab', () => twoFactorLoadConfig());
if (CDOM.ID('right-option-panel').classList.contains('active')) twoFactorLoadConfig();

// ---- 다국어(CLan) ----
// 기본 텍스트는 영문(HTML/코드 기본값). 한국어는 아래 한곳(registerControlLan)에만 등록한다.
// 탭/옵션 설명/모달 폼 라벨 = 영문. 도움말 + 경고/알림/에러 메시지 = 한영.
// 미등록 키/언어는 영문으로 폴백. 브라우저 언어 = CUtil.Language().
// 동적 문자열: L("key", "English default") 또는 LF("key", "Hello {0}", name)
// 정적 DOM: data-CLan / data-CLan-title + applyLanIn(root)
function registerControlLan(): void {
    // ★ 한국어 UI 문자열은 전부 이 객체에만 추가/수정한다.
    CLan.Set({
        ko: {
            // 경고 / 알림 / 에러 (CAlert, 토스트, 인라인 상태 메시지)
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
            "ctrl.local": "Local",
            "ctrl.msg.searchScopeFailed": "이 위치는 검색할 수 없습니다(서버에 등록된 워킹 폴더가 아닐 수 있습니다).",
            "ctrl.msg.scanningPath": "검색 중: {0}:{1}",
            "ctrl.msg.cachedScanning": "캐시: {0}건... 검색 중",
            "ctrl.msg.stoppedResults": "중지됨. ({0}건)",
            "ctrl.msg.nResults": "{0}건{1}",
            "ctrl.msg.noScopeSelected": "검색할 패스를 하나 이상 선택하세요.",
            "ctrl.msg.noSearchScope": "검색 가능한 경로가 없습니다.",
            "ctrl.dl.enterUrl": "URL을 입력하세요",
            "ctrl.dl.failedInfo": "정보 조회 실패",
            "ctrl.dl.failedStart": "시작 실패",
            "ctrl.dl.serverError": "서버 오류: {0}",
            "ctrl.dl.serverUnavailable": "서버 응답 없음 - 서버가 제외된 버전일 수 있습니다. 서버 상태를 확인하세요",
        }
    });
}

/** 현재 언어 번역. en 기본값, ko 등록 시 한글. */
function L(key: string, en: string): string {
    return CLan.Get(key, en);
}

/** {0} {1} ... 치환 번역. */
function LF(key: string, en: string, ...args: Array<string | number>): string {
    let s = CLan.Get(key, en);
    for (let i = 0; i < args.length; i++) s = s.split(`{${i}}`).join(String(args[i]));
    return s;
}

// data-CLan / data-CLan-title 요소에 현재 언어 번역을 적용한다.
function applyLanIn(root: ParentNode | null): void {
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-CLan]').forEach(el => {
        const key = el.getAttribute('data-CLan');
        if (!key) return;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            const t = CLan.Get(key, el.placeholder);
            if (t != null) el.placeholder = t;
        } else if (el instanceof HTMLOptionElement) {
            const t = CLan.Get(key, el.text);
            if (t != null) el.text = t;
        } else {
            const t = CLan.Get(key, el.innerHTML);
            if (t != null) el.innerHTML = t;
        }
    });
    root.querySelectorAll<HTMLElement>('[data-CLan-title]').forEach(el => {
        const key = el.getAttribute('data-CLan-title');
        if (!key) return;
        const t = CLan.Get(key, el.title || '');
        if (t != null) el.title = t;
    });
}

registerControlLan();
applyLanIn(document.body);

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
            // 한쪽만 지원하는 프로바이더(예: antigravity 신형 = weekly만)는 미지원 버킷을 ?로 넣지 않고 생략한다.
            // 둘 다 -1일 때만 조회 실패로 `?`를 보여 준다.
            const pct = (v: number) => Math.round(v * 100);
            const usageParts: string[] = [];
            const showUsage = p.authenticated && p.usage;
            if (showUsage) {
                const fh = p.usage!.fiveHour;
                const wk = p.usage!.weekly;
                if (fh >= 0) usageParts.push(`5h ${pct(fh)}%`);
                if (wk >= 0) usageParts.push(`Weekly ${pct(wk)}%`);
                if (fh < 0 && wk < 0) {
                    usageParts.push(`5h ?`);
                    usageParts.push(`Weekly ?`);
                }
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
document.getElementById('agentAddFolderBtn')?.addEventListener('click', () => showWorkFolderModal());
// 아티젠 DB(db/artgine.sqlite)를 CORMRouter(/ORM/Exec) 경유로 읽어 보여주는 읽기 전용 ORM 뷰어.
// RDP로 원격 서버를 보는 중이면 그 서버의 DB를, 아니면 로컬 DB를 연다(currentWebRootUrl 기준).
document.getElementById('sqliteViewerBtn')?.addEventListener('click', () => {
    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
    new CORMViewer(undefined, 'sqlite', 'db/artgine.sqlite', currentWebRootUrl, token).Open(CModal.ePos.Center);
});

// 임의의 DB(mysql/mssql/sqlite/ne/postgresql/mongodb)에 접속해 보여주는 범용 ORM 뷰어. dbType/database를 비워 넘기면
// CORMViewer가 연결 정보 입력 폼을 먼저 띄운다.
document.getElementById('dbViewerBtn')?.addEventListener('click', () => {
    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
    new CORMViewer(undefined, undefined, undefined, currentWebRootUrl, token).Open(CModal.ePos.Center);
});

// claude/codex/opencode/antigravity/grok이 로컬에 남기는 대화 세션 저장소에서 N개월보다 오래된 것을
// 지운다(이 컴퓨터의 모든 프로젝트 대상 — /AIInfo/prune-conversations 참조).
document.getElementById('pruneConvBtn')?.addEventListener('click', () => {
    const input = document.getElementById('pruneConvMonths') as HTMLInputElement | null;
    const result = document.getElementById('pruneConvResult');
    const months = Math.max(1, parseInt(input?.value ?? '1', 10) || 1);

    const dlg = new CConfirm();
    dlg.SetBody(LF('ctrl.msg.pruneConfirm', 'Delete all conversation history older than {0} month(s)? This applies to every project on this machine and cannot be undone.', months));
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        async () => {
            if (result) result.innerHTML = `<i class="bi bi-hourglass-split"></i> ${L('ctrl.deleting', 'Deleting...')}`;
            try {
                const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/prune-conversations', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ months }),
                });
                const j = await r.json();
                if (!j.ok) throw new Error(j.msg ?? L('ctrl.failed', 'failed'));
                const lines = Object.entries(j.results as Record<string, { installed: boolean; deleted: number; error?: string }>)
                    .map(([provider, v]) => v.installed
                        ? `${aiEscapeHtml(provider)}: ${v.deleted}${v.error ? ` <span class="text-danger">(${aiEscapeHtml(v.error)})</span>` : ''}`
                        : `${aiEscapeHtml(provider)}: <span class="text-secondary">${L('ctrl.msg.notInstalled', 'not installed')}</span>`)
                    .join('<br>');
                if (result) result.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${LF('ctrl.msg.pruneTotal', 'Total {0} deleted', j.totalDeleted)}</span><div class="mt-1">${lines}</div>`;
            } catch (e: any) {
                if (result) result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(e?.message ?? String(e))}</span>`;
            }
        },
        () => {},
    ], [L('ctrl.delete', 'Delete'), L('ctrl.cancel', 'Cancel')]);
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
                        const msg = r.status === 401 ? L('ctrl.msg.loginRequired', 'Login required') : (j.msg || L('ctrl.failed', 'Failed'));
                        result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(msg)}</span>`;
                    }
                    return;
                }
                const models: { name: string; tools: boolean }[] = j.models ?? [];
                const list = models.map(m => `${aiEscapeHtml(m.name)}${m.tools ? ' <span class="badge bg-success">tools</span>' : ''}`).join(', ');
                if (result) result.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${aiEscapeHtml(j.provider)} — ${models.length} models</span><div class="text-secondary mt-1">${list}</div>`;
                CAlert.Info(LF('ctrl.msg.modelsToJson', '{0}: {1} models → opencode.json', j.provider, models.length));
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
            if (r.status === 401) { body.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${L('ctrl.msg.loginRequired', 'Login required')}</span>`; return; }
            const j = await r.json();
            const providers: { key: string; label: string; backend: string; host: string; connected: boolean; error?: string; modelCount: number; running: { name: string; vramBytes?: number; sizeBytes?: number }[] }[] = j.providers ?? [];
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

// 서버 재시작을 요청한 뒤 현재 페이지를 자동으로 다시 로드한다.
// 재시작 중에는 이 페이지가 들고 있는 루트 목록(/RootN)·세션 상태가 전부 낡은 값이라,
// 서버가 다시 뜰 시간을 준 뒤 새로고침해야 바뀐 워킹 폴더가 반영된 화면을 볼 수 있다.
const RESTART_RELOAD_SEC = 10;
function scheduleReloadAfterRestart(_el: HTMLElement | null) {
    let left = RESTART_RELOAD_SEC;
    const tick = () => {
        if (left <= 0) { location.reload(); return; }
        if (_el) _el.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${LF('ctrl.msg.savedReloading', 'Saved. Server is restarting… reloading in {0}s', left)}</span>`;
        left--;
        setTimeout(tick, 1000);
    };
    tick();
}

// 서버 워킹 폴더(rootPath) 편집 모달. 현재 값(/AIInfo/workfolder)을 불러와 줄단위로 편집하고,
// 저장(/AIInfo/workfolder-set) 시 Env.json에 기록 후 서버가 재시작된다(/RootN 재등록).
function showWorkFolderModal() {
    const uid = `workfolder_${Date.now()}`;
    const modal = new CModal();
    modal.SetHeader('Working Folder');
    modal.SetBody(`
        <div class="small text-secondary mb-2">
            <p class="mb-1">Server working folders, served as <code>/Root0</code>, <code>/Root1</code> … (one per line).</p>
            <p class="mb-0">Saving writes to <code>Env.json</code> and <strong>restarts the server</strong> to re-register the routes.</p>
        </div>
        <textarea id="${uid}" class="form-control form-control-sm" rows="4" placeholder="./&#10;D:/Work" spellcheck="false"></textarea>
        <div class="d-flex justify-content-end mt-2">
            <button id="${uid}_save" class="btn btn-primary btn-sm">Save &amp; Restart</button>
        </div>
        <div id="${uid}_result" class="small mt-2"></div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(520, 320);
    modal.Open(CModal.ePos.Center);
    setTimeout(async () => {
        const ta      = document.getElementById(uid) as HTMLTextAreaElement | null;
        const saveBtn = document.getElementById(`${uid}_save`) as HTMLButtonElement | null;
        const result  = document.getElementById(`${uid}_result`);
        // 현재 워킹 폴더 로드
        try {
            const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/workfolder');
            if (r.status === 401) {
                if (result) result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${L('ctrl.msg.loginRequired', 'Login required')}</span>`;
            } else {
                const j = await r.json();
                if (j.ok && ta) ta.value = (j.rootPath ?? []).join('\n');
            }
        } catch (e: any) {
            if (result) result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(e?.message ?? String(e))}</span>`;
        }
        const submit = () => {
            const list = (ta?.value ?? '').split('\n').map(s => s.trim()).filter(Boolean);
            if (!list.length) { ta?.focus(); return; }
            const dlg = new CConfirm();
            dlg.SetBody(`${L('ctrl.msg.saveFoldersRestart', 'Save working folders and restart the server now?')}<br><br>${list.map(aiEscapeHtml).join('<br>')}`);
            dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
                async () => {
                    if (saveBtn) saveBtn.disabled = true;
                    if (result) result.innerHTML = '<span class="text-secondary"><i class="bi bi-hourglass-split"></i> Saving &amp; restarting…</span>';
                    try {
                        const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/workfolder-set', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ rootPath: list }),
                        });
                        const j = await r.json();
                        if (!j.ok) {
                            const msg = r.status === 401 ? L('ctrl.msg.loginRequired', 'Login required') : (j.msg || L('ctrl.failed', 'Failed'));
                            if (result) result.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${aiEscapeHtml(msg)}</span>`;
                            if (saveBtn) saveBtn.disabled = false;
                            return;
                        }
                        CAlert.Info(L('ctrl.msg.workingFolderSaved', 'Working folder saved. Server is restarting.'));
                        scheduleReloadAfterRestart(result);
                    } catch (e: any) {
                        // 재시작으로 연결이 끊겨 응답을 못 받을 수 있다 — 저장 자체는 서버에서 이미 완료된 상태다.
                        scheduleReloadAfterRestart(result);
                    }
                    // 저장에 성공한 경로에서는 버튼을 다시 켜지 않는다 — 곧 새로고침되므로 중복 저장을 막는다.
                },
                () => {},
            ], ["Save & Restart", "Cancel"]);
            dlg.Open();
        };
        saveBtn?.addEventListener('click', submit);
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
    // 센터에 보이는 프레임이 바뀌면(새 터미널/에디터 열림, 세션 전환 등) 좌측 사이드바 하위 탭과 active를
    // 즉시 그 화면과 일치시킨다. chat/term→Agent, browser/editor→Other(RDP 등 그 외는 탭 전환 없음).
    // renderSessionSidebar()는 rAF로 합류되므로 연속 호출해도 부담이 없다.
    syncSidebarTabToFrame(key);
    renderSessionSidebar();
    return f;
}
// 프레임 키 접두사로 소속 하위 탭을 판별해, 필요할 때만 그 탭으로 전환한다(폴링 렌더가 아니라 전환 시점에만).
function syncSidebarTabToFrame(key: string) {
    const target: 'agent' | 'other' | null =
        /^(chat:|term:|term-new:)/.test(key) ? 'agent'
        : /^(browser:|editor:)/.test(key) ? 'other'
        : null;
    if (target && sbSubTab !== target) { sbSubTab = target; localStorage.setItem(SB_TAB_LS, target); applySidebarSubTab(); }
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

// 세션 탭(Chat/Terminal/RDP/Browser/Editor) 활성화 공통 처리. Multiplexer(tmux) 화면을 보고 있는 동안
// 새 세션을 만들거나 사이드바에서 고를 때 탭이 강제로 바뀌면 배치·작업 중이던 Multiplexer가 꺼진다 —
// 이때는 탭 전환만 건너뛰고 Multiplexer에 그대로 머무른다(완료 알림 콜백 등도 동일).
function activatePaneUnlessMultiplexer(_tabId: string, _label?: string) {
    if (CDOM.ID('tmux-tab').classList.contains('active')) return;
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID(_tabId)).show();
}

function rdpActivatePane() {
    activatePaneUnlessMultiplexer('rdp-panel-tab', 'RDP');
}

interface IRdpRemote { remoteId: string; entryUrl: string; saved?: boolean; password?: string; }
// saved=true 항목만 서버에 영속된다(추가 모달의 "Save this remote" 체크박스). 나머지는 이번 세션 한정.
// 저장은 반드시 서버(/RemoteDesktop/remotes-set)를 거친다 — CStorage를 브라우저에서 직접 부르면
// CUtil.IsNode()가 false라 localStorage로 떨어져 이 브라우저에만 남는다. 서버(Node)에서 호출해야
// Env.json에 기록된다(Electron 렌더러도 nodeIntegration:false라 마찬가지로 localStorage 경로다).
let rdpRemotes: IRdpRemote[] = [];

// 저장된 원격지는 "지금 접속 가능한지"가 보장되지 않는다(원격 PC가 꺼져 있거나 포트가 막혔을 수 있다).
// 그래서 불러온 뒤 각 항목을 확인해 사이드바에 상태를 표시한다.
//   online  — 서버 응답 + 인증됨(기존처럼 클릭 시 바로 원격 폴더까지 보인다)
//   auth    — 서버는 살아있으나 인증 안 됨(클릭 시 기존 흐름대로 비밀번호를 묻는다)
//   offline — 아예 닿지 않음(미연결)
type RdpStatus = 'checking' | 'online' | 'auth' | 'offline';
const rdpStatus = new Map<string, RdpStatus>();
const RDP_PROBE_TIMEOUT_MS = 5000;
// 표시는 다른 세션 목록(Chat/Terminal)과 동일하게 색 점 하나로 통일한다 — 닿으면 초록, 못 닿으면 빨강.
// auth도 서버는 살아있는 것이므로 초록이고, 구분은 툴팁 문구로만 남긴다.
const RDP_STATUS_VIEW: Record<RdpStatus, { cls: string; title: string }> = {
    checking: { cls: 'text-secondary', title: L('ctrl.msg.rdpChecking', 'Checking...') },
    online:   { cls: 'text-success',   title: L('ctrl.msg.rdpConnected', 'Connected') },
    auth:     { cls: 'text-success',   title: L('ctrl.msg.rdpNeedsAuth', 'Authentication required') },
    offline:  { cls: 'text-danger',    title: L('ctrl.msg.rdpOffline', 'Not connected') },
};

// 저장된 목록을 서버에서 불러온다. 미인증/서버 오류면 조용히 넘어간다(저장 목록 없이 평소대로 동작).
// 로그인 전(로컬 토큰 없음)이면 애초에 시도하지 않는다 — 로그인 성공 시 rdpPromptRemoteAuth의 doAuth()에서 다시 불러온다.
async function rdpLoadRemotes() {
    if (!getAuthToken(CPath.WebRootUrl())) return;
    let list: IRdpRemote[] = [];
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "RemoteDesktop/remotes", {}, "json") as { ok: boolean, list?: IRdpRemote[] };
        list = j?.list ?? [];
    } catch { return; }
    const known = new Set(rdpRemotes.map(r => r.remoteId));
    for (const r of list) {
        if (!r?.remoteId || !r?.entryUrl || known.has(r.remoteId)) continue;
        rdpRemotes.push({ remoteId: r.remoteId, entryUrl: r.entryUrl, saved: true, password: r.password });
    }
    if (!list.length) return;
    rdpRenderList();
    rdpRefreshAllStatus();
}

// 목록 전체를 덮어쓴다(추가/삭제 모두 최종 목록을 통째로 보낸다).
async function rdpSaveRemotes() {
    const list = rdpRemotes.filter(r => r.saved).map(r => ({ remoteId: r.remoteId, entryUrl: r.entryUrl, password: r.password }));
    try {
        await CFecth.Exe(CPath.WebRootUrl() + "RemoteDesktop/remotes-set", { list }, "json");
    } catch {
        CAlert.Warning(L('ctrl.msg.rdpSaveFailed', 'Failed to save the remote list.'));
    }
}

// 응답이 오기만 하면(401/403이라도) 원격지는 살아있는 것이다. 아예 닿지 않을 때만 offline.
// rdpCheckRemoteAuth는 토큰이 없으면 무조건 false라 "꺼짐"과 "인증 안 됨"을 구분하지 못하므로 쓰지 않는다.
async function rdpProbeRemote(entryUrl: string): Promise<RdpStatus> {
    let webRootUrl: string;
    try { webRootUrl = rdpRemoteWebRootUrl(entryUrl); } catch { return 'offline'; }
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
        if (!res.ok) return 'auth';
        const j = await res.json().catch(() => null) as { authed?: boolean } | null;
        return j?.authed ? 'online' : 'auth';
    } catch {
        return 'offline';
    } finally {
        clearTimeout(timer);
    }
}

// 전부 병렬로 확인하고 '한 번만' 다시 그린다(rdpRenderList가 refreshAllRemoteRoots까지 부르므로
// 항목마다 그리면 원격 루트 조회가 그 수만큼 중복된다). seq는 갱신 중 목록이 바뀐 경우의 경합 방지.
let rdpStatusSeq = 0;
async function rdpRefreshAllStatus() {
    const seq = ++rdpStatusSeq;
    const targets = rdpRemotes.slice();
    if (!targets.length) return;
    const results = await Promise.all(targets.map(r => rdpProbeRemote(r.entryUrl)));
    if (seq !== rdpStatusSeq) return;
    targets.forEach((r, i) => rdpStatus.set(r.remoteId, results[i]));
    rdpRenderList();
}
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
        const key = `rdp:remote:${r.remoteId}`;
        const st = rdpStatus.get(r.remoteId) ?? 'checking';
        const stv = RDP_STATUS_VIEW[st];
        const item = createSessionItem({
            activeClass: 'ai-session-item-active',
            isActive: selectedRdpKey === key,
            dataAttr: { name: 'id', value: r.remoteId },
            leftHtml: `<span class="${stv.cls} small flex-shrink-0" title="${aiEscapeHtml(stv.title)}">●</span>`,
            // 미연결 항목은 흐리게 — 목록만 보고도 지금 붙을 수 있는 원격지를 가려낼 수 있게.
            bodyHtml: `<span class="flex-grow-1 text-truncate small${st === 'offline' ? ' text-secondary' : ''}"`
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
                if (activeRdpFrameKey === key) activeRdpFrameKey = null;
                if (selectedRdpKey === key) selectedRdpKey = 'rdp:local';
                rdpRenderList();
                if (wasSaved) rdpSaveRemotes();
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

// Memo 탭이 어느 서버의 /Memo/*를 써야 하는지 판단하는 단일 출처(RDP가 원격을 전환할 때마다 갱신).
// '' = 로컬. 인증은 여기서 미리 하지 않고, Memo 탭이 열릴 때 memoSendRemoteInfo()가 필요하면 그때 확인/요청한다.
let currentWebRootUrl = '';

// ---- 경로(Root) 목록 상태: 예전엔 사이드바 상단에 실제 <select> UI가 있었으나 제거됨(Agent 탭 최하단의
// Add Working Folder 버튼으로 대체). currentWebRootUrl(현재 활성 서버)의 File/Root를 조회해 채우는
// ctrlRootOpts/ctrlSelectedRootPath는 Agent 그룹핑, 새 세션 기본 Working Directory 등에서 여전히 쓴다
// (File.ts로의 'set-file-root' 동기화 메시지는 더 이상 발생하지 않지만 File.ts는 자체 fetch/localStorage로
// 독립 동작하므로 영향 없다).
interface ICtrlRootOpt { path: string; name: string; url?: string; }
let ctrlRootOpts: ICtrlRootOpt[] = [];
let ctrlRootReqSeq = 0;
// New Chat/New Terminal 모달의 기본 Working Directory로 쓰는 현재 선택된 경로.
// 서버(File/Root)가 Artgine 작업경로를 항상 절대경로로 실어 보내므로 여기 담기는 값도 절대경로다.
// CTerminalRouter/CAIChatRouter는 어차피 받은 경로를 자기 작업경로 기준으로 resolve하므로 절대/상대 어느 쪽이든 안전하다.
let ctrlSelectedRootPath = '';
// Control.html이 ?RootPath=...로 열린 경우, 최초 1회에 한해 그 값과 일치하는 루트를 기본 선택한다
// (그 뒤 RDP 목록에서 Local/원격을 전환할 때 다시 그리는 건 평소처럼 상대경로 기본값으로 되돌아간다).
let ctrlInitRootPathConsumed = false;
const ctrlNormPath = (s: string) => s.replace(/\\/g, '/').replace(/\/+$/, '');

function ctrlRenderRootOpts(roots: ICtrlRootOpt[]) {
    // 서버(getRoots)가 Artgine 작업경로를 name='./'인 항목으로 항상 실어 보낸다 - 표시 이름만 바꿔치기한다.
    ctrlRootOpts = roots.map(r => r.name === './' ? { ...r, name: 'Artgine (WorkingPath)' } : r);
    // 기본 선택은 Artgine 작업경로 항목. 못 찾으면(이론상 없음) 마지막 항목으로 대체.
    let defaultIdx = ctrlRootOpts.findIndex(r => r.name === 'Artgine (WorkingPath)');
    if (defaultIdx < 0) defaultIdx = ctrlRootOpts.length - 1;
    if (!ctrlInitRootPathConsumed && ctrlInitRootPath) {
        ctrlInitRootPathConsumed = true;
        const matchIdx = ctrlRootOpts.findIndex(r => ctrlNormPath(r.path) === ctrlNormPath(ctrlInitRootPath));
        if (matchIdx >= 0) defaultIdx = matchIdx;
    }
    ctrlSelectedRootPath = ctrlRootOpts[defaultIdx]?.path ?? '';
    // 등록 경로가 바뀌면 Agent 그룹(빈 그룹 포함)을 다시 그린다.
    renderSessionSidebar();
}

async function ctrlRefreshRootSelect() {
    const baseUrl = currentWebRootUrl;
    const seq = ++ctrlRootReqSeq;
    if (baseUrl) {
        // password가 저장된 원격이면 기존 토큰을 확인하지 않고 매번 새로 로그인해 세션을 새로 맺는다.
        const remote = rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === baseUrl);
        const authed = remote?.password ? await rdpEnsureRemoteAuth(remote) : await rdpCheckRemoteAuth(baseUrl);
        if (!authed) {
            if (seq !== ctrlRootReqSeq) return;
            rdpPromptRemoteAuth(baseUrl, () => {
                if (currentWebRootUrl !== baseUrl || seq !== ctrlRootReqSeq) return;
                ctrlRefreshRootSelect();
            });
            return;
        }
    }
    try {
        const token = baseUrl ? getAuthToken(baseUrl) : '';
        const data = await CFecth.Exe((baseUrl || CPath.WebRootUrl()) + "File/Root", token ? { token } : {}, "json") as { RootPath: string, RootUrl: string, roots: ICtrlRootOpt[] };
        if (seq !== ctrlRootReqSeq) return;
        ctrlRenderRootOpts(data.roots ?? []);
        ctrlSideFileGoTo('/');
    } catch {
        // 표시할 UI가 없으므로 무시 - 다음 refresh(RDP 전환 등)에서 재시도된다.
    }
}

// 사용자가 직접 root를 고르는 UI는 제거됨. 경로 전환은 이제 rdpOpenLocal/rdpOpenRemote의
// ctrlRefreshRootSelect() 재조회와 ctrlRenderRootOpts()의 기본 선택 로직만으로 이뤄진다.

function rdpOpenLocal() {
    rdpInited = true;
    rdpActivatePane();
    showRdpFrame('rdp:local', `${CPath.WebRootArtgineUrl()}artgine/server/html/RemoteDesktop.html`);
    selectedRdpKey = 'rdp:local';
    rdpRenderList();
    currentWebRootUrl = '';
    if (fileIframe?.contentWindow) CIframeMsg.Send(fileIframe.contentWindow, 'connect-remote', { url: '' });
    ctrlRefreshRootSelect();
    logOnServerChanged();
}

// 사이드바 클릭 진입점. 미연결(빨강) 항목이면 먼저 재확인부터 한다 — 원격 PC가 그새 켜졌을 수 있으므로
// "다시 누르면 재시도"가 되어야 한다. 닿으면 그대로 열어 기존처럼 원격 폴더까지 이어서 보여준다.
async function rdpClickRemote(remoteId: string) {
    const remote = rdpRemotes.find(r => r.remoteId === remoteId);
    if (!remote) return;
    if (rdpStatus.get(remoteId) === 'offline') {
        rdpStatus.set(remoteId, 'checking');
        rdpRenderList();
        const st = await rdpProbeRemote(remote.entryUrl);
        // 확인하는 동안 지워졌으면 버린다.
        if (!rdpRemotes.some(x => x.remoteId === remoteId)) return;
        rdpStatus.set(remoteId, st);
        if (st === 'offline') {
            rdpRenderList();
            CAlert.Warning(LF('ctrl.msg.rdpStillOffline', 'Cannot reach {0}.', remote.entryUrl));
            return;
        }
    }
    rdpOpenRemote(remoteId);
}

function rdpOpenRemote(remoteId: string) {
    const remote = rdpRemotes.find(r => r.remoteId === remoteId);
    if (!remote) return;
    rdpInited = true;
    rdpActivatePane();
    showRdpFrame(`rdp:remote:${remoteId}`, `${rdpRemoteWebRootUrl(remote.entryUrl)}artgine/server/html/RemoteDesktop.html`);
    selectedRdpKey = `rdp:remote:${remoteId}`;
    rdpRenderList();
    currentWebRootUrl = rdpRemoteWebRootUrl(remote.entryUrl);
    if (fileIframe?.contentWindow) CIframeMsg.Send(fileIframe.contentWindow, 'connect-remote', { url: remote.entryUrl });
    ctrlRefreshRootSelect();
    logOnServerChanged();
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
    modal.SetHeader(L('ctrl.hdr.localAccessLink', 'Local Access Link'));
    modal.SetBody(`<div id="${boxId}" class="small text-secondary">${L('ctrl.msg.checkingLink', 'Checking accessible link...')}</div>`);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(480, 160);
    modal.Open(CModal.ePos.Center);

    const { url, blocked } = await rdpResolveAccessibleUrl();
    const box = document.getElementById(boxId);
    if (!box) return;

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

function rdpAddRemote(entryUrl: string, save = false, password?: string) {
    const remote: IRdpRemote = { remoteId: genUuid(), entryUrl, saved: save, password };
    rdpRemotes.unshift(remote);
    rdpRenderList();
    if (save) rdpSaveRemotes();
    // 방금 추가한 항목만 확인한다(나머지는 이미 상태를 들고 있다). 확인 중에 지워졌으면 버린다.
    rdpProbeRemote(entryUrl).then((st) => {
        if (!rdpRemotes.some(x => x.remoteId === remote.remoteId)) return;
        rdpStatus.set(remote.remoteId, st);
        rdpRenderList();
    });
}

// RDP는 사이드바에서 실제로 클릭(또는 패널 활성화)했을 때만 프레임을 만든다.
// (초기 기본 탭은 Help — Control/artgine-agent.html iframe)
let rdpInited = false;
CDOM.ID('rdp-panel-tab').addEventListener('shown.bs.tab', () => {
    if (!rdpInited) rdpOpenLocal();
    updateRdpFrameVisibility();
});
CDOM.ID('rdp-panel-tab').addEventListener('hidden.bs.tab', () => updateRdpFrameVisibility());

rdpRenderList();
// 저장된 원격 목록을 서버(Env.json)에서 받아온다. 비동기라 모듈 평가가 끝난 뒤에 목록이 채워지고,
// 이어서 각 원격지의 연결 상태 확인까지 진행된다.
rdpLoadRemotes();
// rdpOpenLocal()이 File 섹션에서 선언되는 fileIframe을 참조하므로, 모듈 평가가 끝난 뒤로 미뤄서
// 호출한다(그대로 동기 호출하면 TDZ로 'fileIframe' 참조 에러가 난다).
if (CDOM.ID('rdp-panel').classList.contains('active')) queueMicrotask(() => rdpOpenLocal());
// 초기 기본 탭이 Help라 RDP 패널이 active가 아니면 rdpOpenLocal()이 돌지 않고, 그 안에서만 호출되는
// ctrlRefreshRootSelect()도 실행되지 않아 루트 선택 박스가 계속 비어 있었다(Env.json의 워킹 폴더가
// 안 보이고, ctrlSelectedRootPath가 ''로 남아 Terminal/Chat/F2 검색의 기본 경로도 비었다).
// 그래서 RDP 진입과 무관하게 최초 1회는 로컬(currentWebRootUrl='')에서 루트 목록을 받아온다.
// (rdpOpenLocal()이 도는 경우엔 거기서 호출하므로 중복 조회를 피한다.)
else queueMicrotask(() => ctrlRefreshRootSelect());

// More > RDP: 원격 추가용 소형 모달. 추가하면 메인 탭이 아니라 사이드바 목록에 항목이 생긴다.
// 비밀번호를 함께 입력받아 추가 시점에 바로 인증해둔다(성공 시 토큰 저장) - 그래야 이후 처음 연결할 때
// 빈 화면이 뜬 뒤에야 비밀번호를 물어보는 게 아니라 이미 인증된 상태로 바로 붙는다.
// 비밀번호를 비워두고 추가하면 기존과 동일하게 연결 시점(ctrlRefreshRootSelect)에 지연 인증된다.
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
        const input = document.getElementById('rdpModalUrlInput') as HTMLInputElement | null;
        const pwInput = document.getElementById('rdpModalPwInput') as HTMLInputElement | null;
        const errEl = document.getElementById('rdpModalErr') as HTMLDivElement | null;
        const btn = document.getElementById('rdpModalAddBtn') as HTMLButtonElement | null;
        input?.focus();
        const saveChk = document.getElementById('rdpModalSaveChk') as HTMLInputElement | null;
        const submit = async () => {
            const url = input?.value.trim();
            if (!url) return;
            const pw = pwInput?.value ?? '';
            const save = saveChk?.checked ?? false;
            if (errEl) errEl.style.display = 'none';
            if (!pw) {
                rdpAddRemote(url, save);
                modal.Close();
                return;
            }
            let webRootUrl: string;
            try { webRootUrl = rdpRemoteWebRootUrl(url); }
            catch { if (errEl) { errEl.textContent = L('ctrl.msg.invalidUrl', 'Invalid URL'); errEl.style.display = 'block'; } return; }
            if (btn) btn.disabled = true;
            const password = CHash.SHA256('artgine_' + pw);
            try {
                const j = await authLogin(webRootUrl, password, () => {
                    if (errEl) { errEl.className = 'small text-secondary'; errEl.textContent = L('ctrl.msg.waitingTwoFactor', 'Waiting for messenger approval (up to 5 minutes)...'); errEl.style.display = 'block'; }
                });
                if (errEl) errEl.className = 'small text-danger';
                if (j.ok) {
                    setAuthToken(webRootUrl, j.token!);
                    // 해시로 저장해두면 다음부터는 이 비밀번호를 다시 묻지 않고 매번 새 세션으로 바로 로그인한다.
                    rdpAddRemote(url, save, password);
                    modal.Close();
                } else if (errEl) {
                    errEl.textContent = LF('ctrl.msg.wrongPassword', 'Wrong password: {0}', j.msg ?? '');
                    errEl.style.display = 'block';
                }
            } catch {
                if (errEl) { errEl.textContent = L('ctrl.msg.serverError', 'Server error'); errEl.style.display = 'block'; }
            } finally {
                if (btn) btn.disabled = false;
            }
        };
        btn?.addEventListener('click', submit);
        [input, pwInput].forEach(el => el?.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') submit(); }));
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

// ---- Help 패널 (Control/artgine-agent.html을 iframe으로 임베드, 초기 진입 기본 화면) ----
// 실제 탭 트리거는 숨은 #help-panel-tab(nav 밖 dropdown과 분리). More > Help(#help-open-btn)는
// 그 트리거를 show()만 한다. dropdown-item 자체를 탭으로 쓰면 Tab.show()가 부모 More 메뉴를
// 펼쳐 초기 진입 시 드롭다운이 열려 버리는 문제가 있었다.
// 인증 없이 열리며 탭 목록 인증 가드에 포함하지 않는다.
const helpPanel = CDOM.ID("help-panel") as HTMLDivElement;
let helpIframe: HTMLIFrameElement | null = null;
function helpLoadFrame() {
    if (helpIframe) return;
    helpPanel.classList.add("position-relative");
    helpPanel.style.overflow = "hidden";
    helpIframe = document.createElement("iframe");
    helpIframe.id = "help-iframe";
    helpIframe.style.cssText = "position:absolute; inset:0; width:100%; height:100%; border:none;";
    // Control 프로젝트 루트에 둔 안내 페이지(Control.html과 동일 디렉터리).
    helpIframe.src = new URL('./artgine-agent.html', import.meta.url).href;
    helpPanel.appendChild(helpIframe);
}
helpLoadFrame();
// 초기 진입 시 Help 패널을 기본으로 보이게 한다(More > Help로 다시 열 수 있음).
// 단, ?path=로 특정 루트를 지정해 들어온 경우는 그 폴더를 보러 온 것이므로 File 탭을 바로 보여준다.
function helpActivatePane() {
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('help-panel-tab')).show();
}
CDOM.ID('help-open-btn').addEventListener('click', () => helpActivatePane());
if (ctrlInitRootPath) (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('file-tab')).show();
else helpActivatePane();

// F1 핸들러와 동일한 로직(우측 사이드바 열기 + File 탭 활성화)을 F2 검색 모달의 폴더 클릭에서도 재사용한다.
function ctrlShowFileTab() {
    if (appSidebarRight && !appSidebarRight.classList.contains('sidebar-docked')) {
        (window as any).bootstrap.Offcanvas.getOrCreateInstance(appSidebarRight).show();
    }
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('right-file-tab')).show();
}

// ---- 파일 검색 모달 ----
// File.ts의 FileSearch()와 동일한 방식(BFS 재귀 스캔 + 캐시 + hidden/node_modules 제외 + 200개 캡)이지만,
// File 탭 iframe이 아니라 Control 페이지 자체에서 실행한다. 모달 상단에 등록된 모든 패스(로컬+인증 원격)를
// 체크박스로 나열한다. onlyKey 없이(F2) 호출하면 전부 체크, 경로 그룹 '...' > Search(onlyKey)면 그 패스만
// 기본 체크 — 사용자는 체크를 자유롭게 토글하고, 체크된 스코프들을 순서대로 스캔한다(루트 "/"부터).
type CtrlSrchFile = { hidden: boolean; file: boolean; name: string; ext: string };
// 검색 대상 서버/루트. webRootUrl은 File/List를 던질 서버 base URL, rootPath는 그 서버의 등록 루트(RootPath 파라미터),
// editorBaseUrl은 결과 클릭 시 Editor를 띄울 서버('' = 로컬), serverLabel은 모달 헤더의 "접속지" 부분.
interface ICtrlSearchScope { remoteId: string; webRootUrl: string; rootPath: string; editorBaseUrl: string; serverLabel: string; }
// 헤더에 넣을 접속지 표기. 원격은 전체 진입 URL이 너무 길어 host(도메인:포트)만, 로컬은 'Local'.
function ctrlServerLabel(url: string): string {
    if (!url) return L('ctrl.local', 'Local');
    try { return new URL(url, location.href).host; } catch { return url; }
}
// 사이드바 경로 그룹 키(`remote:<id>:<경로>` 또는 `<경로>`) → 검색 스코프. 미등록 원격이면 null.
function ctrlGroupSearchScope(key: string): ICtrlSearchScope | null {
    const g = parseGroupKey(key);
    const ctx = serverCtxOf(g.remoteId);
    if (!ctx) return null;
    return {
        remoteId: g.remoteId,
        webRootUrl: ctx.apiUrl,
        rootPath: g.pathText,
        editorBaseUrl: g.remoteId ? ctx.apiUrl : '',
        serverLabel: ctrlServerLabel(g.remoteId ? (remoteEntryUrl(g.remoteId) || ctx.apiUrl) : ''),
    };
}
const CTRL_SEARCH_EXCLUDE_DIRS = ['node_modules'];
const ctrlIsSearchExcluded = (name: string) => name.startsWith('.') || CTRL_SEARCH_EXCLUDE_DIRS.includes(name);
const ctrlEncodeUrlPath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

// 검색 모달에 체크박스로 나열할 "모든 패스" = 로컬 등록 루트(localRootOpts) + 인증된 원격들의 등록 루트(remoteRootsCache).
// 좌측 사이드바 Agent 그룹 소스(renderAgentGroups)와 동일한 키 규칙을 그대로 재사용해 그룹 Search 버튼의 키와 맞춘다.
interface ICtrlSearchScopeItem { key: string; scope: ICtrlSearchScope; }
function ctrlAllSearchScopeItems(): ICtrlSearchScopeItem[] {
    const items: ICtrlSearchScopeItem[] = [];
    const seen = new Set<string>();
    const add = (key: string) => {
        if (seen.has(key)) return;
        seen.add(key);
        const scope = ctrlGroupSearchScope(key);
        if (scope) items.push({ key, scope });
    };
    for (const r of localRootOpts) add(agentGroupKey(r.path));
    for (const remote of rdpRemotes) {
        const roots = remoteRootsCache.get(remote.remoteId);
        if (!roots) continue;
        for (const ro of roots) add(`remote:${remote.remoteId}:${agentGroupKey(ro.path)}`);
    }
    return items;
}

// 스코프별 스캔 캐시(스코프 키 -> 경로 -> 목록). 여러 스코프가 동시에 켜질 수 있어 서버 키 하나로
// 통째로 비우던 기존 방식 대신 스코프별로 독립 유지한다(File.ts의 g_srchCache와 같은 목적).
const g_ctrlSrchCache: Map<string, Map<string, CtrlSrchFile[]>> = new Map();

// onlyKey 없이(F2) 호출하면 전체 패스가 체크된 상태로, 특정 그룹의 '...' > Search로 호출하면(onlyKey) 그 패스만
// 체크된 상태로 모달이 열린다. 목록 자체는 항상 전체 패스(로컬 + 인증된 원격들의 등록 루트)가 나열되고,
// 사용자가 체크박스를 직접 켜고 끌 수 있다 - 체크된 스코프들을 모두 대상으로 검색한다.
async function ctrlFileSearch(onlyKey?: string) {
    let searchCancelled = false;
    const uid = Date.now();

    const scopeItems = ctrlAllSearchScopeItems();
    const initialChecked = new Set<string>(onlyKey ? [onlyKey] : scopeItems.map(s => s.key));

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
        <div id="ctrlSrchResults_${uid}" class="list-group" style="max-height:320px;overflow-y:auto;font-size:13px;"></div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(520, 620);
    modal.Open(CModal.ePos.Center);

    await new Promise<void>(r => setTimeout(r, MODAL_DOM_DELAY));

    const scopesEl = document.getElementById(`ctrlSrchScopes_${uid}`) as HTMLElement;
    const input   = document.getElementById(`ctrlSrchInput_${uid}`)  as HTMLInputElement;
    const btn     = document.getElementById(`ctrlSrchBtn_${uid}`)    as HTMLButtonElement;
    const stopBtn = document.getElementById(`ctrlSrchStop_${uid}`)   as HTMLButtonElement;
    const status  = document.getElementById(`ctrlSrchStatus_${uid}`) as HTMLElement;
    const results = document.getElementById(`ctrlSrchResults_${uid}`) as HTMLElement;

    // 결과의 폴더 클릭(우측 File 목록으로 이동)은 지금 그 목록이 보고 있는 서버/루트와 스코프가 같을 때만 의미가 있다.
    // 다른 서버(원격)나 다른 루트를 검색한 경우엔 폴더 항목을 이동 불가로 두고 파일만 Editor로 연다(Editor는 baseUrl을 직접 받으므로 안전).
    const sameAsSideList = (scope: ICtrlSearchScope) => scope.webRootUrl === (currentWebRootUrl || CPath.WebRootUrl())
        && ctrlNormPath(scope.rootPath ?? '') === ctrlNormPath(ctrlSelectedRootPath ?? '');
    // 스코프별 실제 루트 경로/다운로드 baseUrl(File/List 응답에서 채워짐).
    const gRoot = new Map<string, string>();
    const gDown = new Map<string, string>();

    const makeItem = (scopeKey: string, scope: ICtrlSearchScope, fl: CtrlSrchFile, dirPath: string) => {
        const item = document.createElement('div');
        item.className = 'list-group-item list-group-item-action py-1 px-2';
        const icon = fl.file ? 'bi-file-earmark' : 'bi-folder-fill text-warning';
        item.innerHTML =
            `<i class="bi ${icon} me-1"></i><strong>${fl.name}</strong>` +
            `<span class="text-muted ms-2" style="font-size:11px;">${aiEscapeHtml(scope.serverLabel)}:${dirPath}</span>`;
        // 사이드바 File 목록(ctrlSideFileRenderList)과 동일하게, 터미널 탭(iframe)에 드롭하면 경로가 입력창에 삽입된다.
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', (gRoot.get(scopeKey) ?? '') + dirPath + fl.name);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
        });
        if (fl.file) {
            item.addEventListener('click', () => {
                modal.Hide();
                editorOpenFile((gRoot.get(scopeKey) ?? '') + dirPath + fl.name, scope.editorBaseUrl, (gDown.get(scopeKey) ?? '') + ctrlEncodeUrlPath(dirPath + fl.name));
            });
        } else if (sameAsSideList(scope)) {
            // 폴더 클릭 시 우측 File 탭을 열고, 그 폴더 자체가 아니라 상위 폴더(목록 안에 이 폴더가 보이는 위치)로 이동시킨다.
            item.addEventListener('click', () => {
                modal.Hide();
                ctrlShowFileTab();
                ctrlSideFileGoTo(dirPath);
            });
        }
        return item;
    };

    const keyOf = (scopeKey: string, dirPath: string, name: string) => scopeKey + ' ' + dirPath + ' ' + name;

    const renderFromCache = (activeScopes: ICtrlSearchScopeItem[], query: string, shown: Set<string>) => {
        let found = 0;
        for (const { key: scopeKey, scope } of activeScopes) {
            const cache = g_ctrlSrchCache.get(scopeKey);
            if (!cache) continue;
            for (const [dirPath, list] of cache) {
                for (const fl of list) {
                    if (fl.hidden || ctrlIsSearchExcluded(fl.name)) continue;
                    if (fl.name.toLowerCase().includes(query)) {
                        const key = keyOf(scopeKey, dirPath, fl.name);
                        if (shown.has(key)) continue;
                        shown.add(key);
                        results.appendChild(makeItem(scopeKey, scope, fl, dirPath));
                        if (++found >= 200) return found;
                    }
                }
            }
        }
        return found;
    };

    const doSearch = async () => {
        const query = input.value.trim().toLowerCase();
        if (!query) return;

        const checkedKeys = new Set(
            Array.from(scopesEl.querySelectorAll<HTMLInputElement>('.ctrl-srch-scope-cb'))
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.key!)
        );
        const activeScopes = scopeItems.filter(s => checkedKeys.has(s.key));
        if (activeScopes.length === 0) { status.textContent = L('ctrl.msg.noScopeSelected', 'Select at least one path.'); return; }

        searchCancelled = false;
        btn.disabled = true;
        stopBtn.style.display = '';
        results.innerHTML = '';

        const shown = new Set<string>();
        let found = renderFromCache(activeScopes, query, shown);
        status.textContent = found > 0 ? LF('ctrl.msg.cachedScanning', 'Cached: {0} result(s)... Scanning', found) : L('ctrl.scanning', 'Scanning...');

        // 스코프의 rootPath가 그 서버에 등록된 루트가 아니면 File/List가 403 {ok:false,msg:"Invalid RootPath"}를
        // 돌려준다(세션 workingDir만으로 만들어진 임시 그룹에서 검색한 경우). list가 없으므로 조용히 0건이 되는 대신
        // 첫 요청에서 사유를 잡아 상태줄에 띄운다.
        const scopeErrors: string[] = [];
        for (const { key: scopeKey, scope } of activeScopes) {
            if (searchCancelled || found >= 200) break;
            const webRootUrl = scope.webRootUrl;
            const rootPathParam = scope.rootPath || undefined;
            let cache = g_ctrlSrchCache.get(scopeKey);
            if (!cache) { cache = new Map(); g_ctrlSrchCache.set(scopeKey, cache); }

            const queue: string[] = ["/"];
            while (queue.length > 0 && !searchCancelled && found < 200) {
                const dirPath = queue.shift()!;
                status.textContent = LF('ctrl.msg.scanningPath', 'Scanning: {0}:{1}', scope.serverLabel, dirPath);
                try {
                    const p2: any = { path: dirPath };
                    if (rootPathParam) p2.RootPath = rootPathParam;
                    const token = getAuthToken(webRootUrl);
                    const data = await CFecth.Exe(webRootUrl + "File/List", { ...p2, token }, "json") as { list: CtrlSrchFile[], RootPath?: string, RootUrl?: string, msg?: string };
                    if (!Array.isArray(data.list)) {
                        if (dirPath === "/") scopeErrors.push(`${scope.serverLabel}: ${data.msg || L('ctrl.msg.searchScopeFailed', 'Cannot search this location.')}`);
                        continue;
                    }
                    if (data.RootPath != null) gRoot.set(scopeKey, data.RootPath.replace(/\/+$/, ''));
                    // RootUrl은 서버 origin 기준 상대경로("/Artgine/Root0")로 오므로 webRootUrl에 대해 절대 URL로 풀어야 한다
                    // (File.ts의 ResolveFileUrl과 동일한 처리). 끝 슬래시는 제거만 하고 붙이지 않는다 — dirPath가 항상
                    // "/"로 시작하므로 여기서 슬래시를 추가하면 "Root0//artgine/..."처럼 중복되어, Monaco가 등록된
                    // extra lib 경로와 다른 문자열로 취급해 "Cannot find module" 에러가 난다.
                    if (data.RootUrl != null) gDown.set(scopeKey, new URL(data.RootUrl, webRootUrl).href.replace(/\/+$/, ''));
                    cache.set(dirPath, data.list);
                    for (const fl of data.list) {
                        if (!fl.hidden && !fl.file && !ctrlIsSearchExcluded(fl.name)) queue.push(dirPath + fl.name + '/');
                        if (!fl.hidden && fl.name.toLowerCase().includes(query) && found < 200) {
                            const key = keyOf(scopeKey, dirPath, fl.name);
                            if (shown.has(key)) continue;
                            shown.add(key);
                            results.appendChild(makeItem(scopeKey, scope, fl, dirPath));
                            found++;
                        }
                    }
                } catch (_) {}
            }
        }

        const cap = found >= 200 ? ' (capped at 200)' : '';
        status.textContent = scopeErrors.length ? scopeErrors.join(' / ')
            : searchCancelled ? LF('ctrl.msg.stoppedResults', 'Stopped. ({0} result(s))', found)
            : found === 0 ? L('ctrl.noResults', 'No results.') : LF('ctrl.msg.nResults', '{0} result(s){1}', found, cap);
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
// webRootUrl/RootPath는 File 탭과 동일한 단일 출처(currentWebRootUrl/ctrlSelectedRootPath)를 쓰므로,
// RDP Local/Remote 전환 등으로 그 값들이 바뀌는 지점(ctrlRefreshRootSelect)에서
// ctrlSideFileGoTo('/')를 같이 호출해 목록을 새로고침한다.
interface CtrlSideFileEntry { file: boolean; hidden: boolean; name: string; ext: string; Status?: string }

// File.ts의 vcsTag()와 동일한 배색/표기 규칙(M=warning, A=success, D=danger, 그 외=secondary).
// M/A/D는 File.ts와 동일하게 클릭 시 diff 모달을 띄운다(canDiff).
function ctrlSideFileVcsBadge(status: string | undefined, filePath: string): string {
    if (!status) return '';
    const color = status === 'A' ? 'success' : status === 'D' ? 'danger' : status === 'M' ? 'warning' : 'secondary';
    const canDiff = status === 'M' || status === 'A' || status === 'D';
    if (!canDiff) return `<span class="badge bg-${color} ms-auto" style="font-size:0.6rem;">${status}</span>`;
    return `<span class="badge bg-${color} ms-auto" style="font-size:0.6rem;cursor:pointer;" title="Diff" data-vcs-diff-path="${aiEscapeHtml(filePath)}">${status}</span>`;
}

// File.ts의 openVcsDiff()와 동일한 File/VCS(action=diff) + Diff2HtmlUI 렌더링을 그대로 옮긴 것.
// webRootUrl/token은 File 탭과 동일하게 currentWebRootUrl(원격 접속 시)을 기준으로 삼는다.
async function ctrlOpenVcsDiff(filePath: string) {
    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
    let res: any;
    try {
        res = await CFecth.Exe(webRootUrl + "File/VCS", { action: "diff", path: filePath, token }, "json");
    } catch (e) {
        CAlert.Info(L('ctrl.msg.diffRequestFailed', 'Diff request failed')); return;
    }
    if (!res?.ok) { CAlert.Info(res?.msg || L('ctrl.msg.diffFailed', 'Diff failed')); return; }

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
        if (!el) return;
        const D2H = (window as any).Diff2HtmlUI;
        if (!D2H) { el.textContent = "diff2html not loaded"; return; }
        // diff2html은 자체 다크 배색을 갖고 있지만 이 클래스를 붙여야 적용된다 — 안 붙이면 라이트 배색 그대로라 다크 테마에서 글자가 안 보인다.
        el.classList.toggle('d2h-dark-color-scheme', document.documentElement.getAttribute('data-bs-theme') === 'dark');
        const cfg = { drawFileList: false, matching: "lines", outputFormat: "line-by-line", highlight: false, stickyFileHeaders: false };
        new D2H(el, res.diff, cfg).draw();
    }, 100);
}

// File.ts의 EXT_KIND/FILE_ICON/kindOf를 그대로 옮긴 것 — 확장자별 아이콘을 File 탭(File.html)과 동일하게 맞춘다.
type CtrlFileKind = 'folder'|'image'|'audio'|'video'|'soundlist'|'html'|'code'|'md'|'sheet'|'orm'|'file';
const CTRL_EXT_KIND: Record<string, CtrlFileKind> = {
    png:'image', jpg:'image', jpeg:'image', bmp:'image',
    mp3:'audio', ogg:'audio',
    mp4:'video', mov:'video', avi:'video',
    soundlist:'soundlist', html:'html', md:'md',
    ts:'code', js:'code', txt:'code', json:'code',
    csv:'sheet', xlsx:'sheet', xls:'sheet',
    sqlite:'orm', db:'orm',
};
const CTRL_FILE_ICON: Record<CtrlFileKind, string> = {
    folder:'bi-folder-fill text-warning', image:'bi-folder-image', audio:'bi-folder-music',
    video:'bi-folder-play', soundlist:'bi-flower1', html:'bi-file-earmark-code',
    code:'bi-file-code', md:'bi-file-earmark-text', sheet:'bi-file-earmark-spreadsheet',
    orm:'bi-file-earmark-binary', file:'bi-file-earmark',
};
function ctrlSideFileKind(fl: CtrlSideFileEntry): CtrlFileKind {
    return fl.file
        ? (CTRL_EXT_KIND[fl.ext] ?? 'file')
        : (fl.name.toLowerCase().endsWith('.nedb') ? 'orm' : 'folder');
}
function ctrlSideFileIcon(fl: CtrlSideFileEntry): string {
    return CTRL_FILE_ICON[ctrlSideFileKind(fl)];
}
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
        const icon = ctrlSideFileIcon(fl);
        const vcsFilePath = ctrlSideFileRoot + ctrlSideFilePath + fl.name;
        item.innerHTML = `<i class="bi ${icon}"></i><span class="text-truncate">${aiEscapeHtml(fl.name)}</span>${ctrlSideFileVcsBadge(fl.Status, vcsFilePath)}`;
        item.querySelector<HTMLElement>('[data-vcs-diff-path]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            ctrlOpenVcsDiff(vcsFilePath);
        });
        // 터미널 탭(iframe)에 드롭하면 그 안의 Terminal.html이 text/plain을 읽어 입력창에 경로를 삽입한다.
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', ctrlSideFileRoot + ctrlSideFilePath + fl.name);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
        });
        item.addEventListener('click', () => {
            if (fl.file) {
                // sqlite/db는 서버가 정적 서빙 자체를 403으로 막으므로(CServerMain.ts), Editor로 열지 말고
                // File.ts의 openOrm과 동일하게 전용 API(CORMViewer)로 연다.
                if (ctrlSideFileKind(fl) === 'orm') {
                    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
                    new CORMViewer(undefined, 'sqlite', ctrlSideFileRoot + ctrlSideFilePath + fl.name, currentWebRootUrl, token).Open();
                    return;
                }
                // File 탭('file-opened' → promptSourceAction)과 동일하게, html/md는 Edit/Execute를 물어본다.
                promptSourceAction(
                    ctrlSideFileRoot + ctrlSideFilePath + fl.name,
                    currentWebRootUrl,
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
    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    const rootPathParam = ctrlSelectedRootPath || undefined;
    try {
        const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
        const p: any = { path: pathVal };
        if (rootPathParam) p.RootPath = rootPathParam;
        if (token) p.token = token;
        const data = await CFecth.Exe(webRootUrl + "File/List", p, "json") as { list: CtrlSideFileEntry[]; RootPath?: string; RootUrl?: string; path?: string };
        if (seq !== ctrlSideFileReqSeq) return;
        if (data.RootPath != null) ctrlSideFileRoot = data.RootPath.replace(/\/+$/, '');
        if (data.RootUrl != null) ctrlSideFileDown = new URL(data.RootUrl, webRootUrl).href.replace(/\/+$/, '');
        if (data.path != null) { ctrlSideFilePath = data.path; ctrlSideFilePathEl.textContent = data.path; }
        ctrlSideFileRenderList(data.list ?? []);
    } catch (e) {
        if (seq !== ctrlSideFileReqSeq) return;
        ctrlSideFileRenderEmpty(L('ctrl.failedToLoad', 'Failed to load'));
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
// F1: 우측 사이드바 File ↔ Info 토글. 이미 File이면 Info로, 아니면 File로.
// 작은 화면(사이드바 오버레이 모드)이면 우측 사이드바를 먼저 연다.
// F2(서치)는 File 탭과 무관하게 Control 페이지 자체에서 검색 모달만 띄운다(탭 전환/iframe 메시지 없음).
// F3는 More > Terminal 버튼 클릭과 동일하게 New Terminal 모달만 띄운다(탭 전환은 termStartNew 이후 Open을 눌러야 일어남).
function runControlHotkey(key: string): boolean {
    switch (key) {
        case 'F1': {
            // 도킹 모드가 아니면(작은 화면) 우측 사이드바 offcanvas를 연다. 이미 열려 있으면 show()는 no-op에 가깝다.
            if (appSidebarRight && !appSidebarRight.classList.contains('sidebar-docked')) {
                (window as any).bootstrap.Offcanvas.getOrCreateInstance(appSidebarRight).show();
            }
            const fileTab = CDOM.ID('right-file-tab');
            // File 탭이 이미 활성(aria-selected 또는 active 클래스)이면 Info로 되돌린다.
            const onFile = fileTab?.classList.contains('active') || fileTab?.getAttribute('aria-selected') === 'true';
            if (onFile) {
                (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('right-info-tab')).show();
            } else {
                ctrlShowFileTab();
            }
            return true;
        }
        case 'F2':
            ctrlFileSearch();
            return true;
        case 'F3':
            if (!ctrlRequireAuthed()) return true;
            termStartNew('cmd');
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
// F4 키(또는 Ctrl 빠르게 두 번 누르기): 한 번 누르면 좌측 메뉴 사이드바로 포커스(오버레이 모드면 먼저 연다), 이미 사이드바에 포커스가
// 가 있는 상태에서 한 번 더 누르면 지금 보고 있는 액티브 iframe으로 포커스를 돌려준다(Home.ts의
// Tab 키=toggleSidebar()+focusActiveFrame() 조합과 동일한 패턴).
// - 오버레이 모드(작은 화면): data-bs-backdrop="false"라 바깥 클릭으로 안 닫히므로, F4 자체가 열고/닫는
//   유일한 수단이다. "포커스 위치"로 판단하면 한번 열린 뒤 닫을 방법이 없어져 꼬이므로, 예전처럼 매번
//   순수 토글(열림<->닫힘)로 처리하고 여는 순간만 사이드바로, 닫는 순간엔 액티브 iframe으로 포커스를 보낸다.
// - 도킹 모드(큰 화면): 사이드바가 항상 보이므로 open/close 대신 "포커스가 지금 사이드바 안에 있는가"로
//   1차/2차 누름을 구분한다.
function runControlF4Key() {
    if (!appSidebar) return;
    // Other 탭을 보고 있으면 Agent 탭으로 전환한다(F4는 에이전트 작업 흐름용).
    if (sbSubTab === 'other') { sbSubTab = 'agent'; localStorage.setItem(SB_TAB_LS, 'agent'); applySidebarSubTab(); }
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
// 위/아래 화살표: 현재 보고 있는 하위 탭(Agent=agent-sidebar-list / Other=other-sidebar-list)의 세션 목록에서만
// 선택을 이동한다. RDP 목록(rdp-sidebar-list, 위쪽)은 대상에서 제외.
function isAppSidebarVisible(): boolean {
    if (!appSidebar) return false;
    return appSidebar.classList.contains('sidebar-docked') || appSidebar.classList.contains('show');
}
function runControlArrowKey(dir: 1 | -1): boolean {
    if (!isAppSidebarVisible()) return false;
    // 현재 보고 있는 하위 탭(Agent/Other)의 목록에서, 접힌 그룹에 가려지지 않은(보이는) 항목만 대상으로 한다.
    const listEl = sbSubTab === 'agent' ? agentSidebarList : otherSidebarList;
    const items = Array.from(listEl.querySelectorAll<HTMLElement>('.ai-session-item')).filter(el => el.offsetParent !== null);
    if (items.length === 0) return false;
    const curIdx = items.findIndex(el => el.classList.contains('ai-session-item-active'));
    const nxt = curIdx === -1 ? 0 : Math.max(0, Math.min(items.length - 1, curIdx + dir));
    if (nxt === curIdx) return false;
    items[nxt].click();
    items[nxt].scrollIntoView({ block: 'nearest' });
    return true;
}
// Ctrl "빠른 두 번 누르기"(다른 키와 조합되지 않은 단독 Ctrl을 짧은 시간 안에 두 번) 감지기.
// Ctrl+C/V/S 같은 흔한 조합키의 첫 keydown과는 확실히 구분해야 하므로(조합키 사용 시마다 오작동하면 안 됨),
// 이 Ctrl을 누르고 있는 동안 다른 키가 같이 눌렸는지(otherKeyUsed)를 추적해서, 조합으로 쓰인 Ctrl은
// "단독 탭"으로 치지 않는다. Firefox의 Alt 단독 키 = 메뉴바 노출 같은 브라우저 기본 동작이 Ctrl에는
// 없어서 별도 preventDefault 트릭이 필요 없다(Alt 방식에서 이 문제 때문에 Ctrl로 변경).
function wireCtrlDoubleTap(target: Document | Window, onTrigger: () => void) {
    const THRESHOLD_MS = 400;
    let otherKeyUsed = false;
    let lastSoloUpTime = 0;
    target.addEventListener('keydown', ((e: KeyboardEvent) => {
        if (e.key === 'Control') return;
        if (e.ctrlKey) otherKeyUsed = true;
    }) as EventListener, true);
    target.addEventListener('keyup', ((e: KeyboardEvent) => {
        if (e.key !== 'Control') return;
        if (otherKeyUsed) {
            otherKeyUsed = false;
            lastSoloUpTime = 0;
            return;
        }
        const now = performance.now();
        if (now - lastSoloUpTime < THRESHOLD_MS) {
            lastSoloUpTime = 0;
            onTrigger();
        } else {
            lastSoloUpTime = now;
        }
    }) as EventListener, true);
}
// File/Memo iframe은 자체 keydown에서 ArrowUp/ArrowDown을 부모로 위임하지 않으므로
// (그 스크립트는 artgine/ 보호 경로라 직접 수정하지 않고) 같은 출처 iframe에 직접 keydown을 걸어 잡는다.
// Ctrl 더블탭도 마찬가지로 이 iframe 안에서 직접 감지한다.
function wireIframeArrowKeys(f: HTMLIFrameElement) {
    f.addEventListener('load', () => {
        try {
            f.contentWindow?.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    if (runControlArrowKey(e.key === 'ArrowUp' ? -1 : 1)) e.preventDefault();
                }
            }, true);
            if (f.contentWindow) wireCtrlDoubleTap(f.contentWindow, runControlF4Key);
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
            // 터미널은 Ctrl+C가 SIGINT로 쓰이지만, 더블탭 감지기는 조합(otherKeyUsed)으로 쓰인 Ctrl은
            // 무시하므로 Ctrl+C 자체와는 충돌하지 않는다.
            if (f.contentWindow) wireCtrlDoubleTap(f.contentWindow, runControlF4Key);
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
        // F6은 Terminal iframe 안에서는 Terminal.html이 자체 keydown으로 잡아 SUPER 토글로 쓴다.
        // 여기(document 레벨)는 포커스가 iframe 밖 Control 페이지 자체에 있을 때만 걸리므로,
        // 그 경우엔 F4와 동일하게 사이드바 포커스 토글로 처리한다.
        e.preventDefault();
        runControlF4Key();
        return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (runControlArrowKey(e.key === 'ArrowUp' ? -1 : 1)) e.preventDefault();
    }
    // F7은 Control 자체 기능은 없지만(Terminal.html이 자기 iframe 안에서 직접 처리), 포커스가
    // Control 페이지(iframe 밖)에 있을 때 브라우저 기본 동작(예: Firefox 캐럿 브라우징 토글)이
    // 뜨는 걸 막기 위해 preventDefault만 한다. iframe 내부 keydown은 부모까지 버블링되지 않으므로
    // Terminal.html의 F7 처리에는 영향 없다.
    if (e.key === 'F7') {
        e.preventDefault();
    }
});
wireCtrlDoubleTap(document, runControlF4Key);
// File.ts/Memo.ts는 자체 keydown에서 F1/F2/F3/F4/F7을 잡아 'home-hotkey'로 부모에 위임한다(Home.ts와 동일 패턴).
// Ctrl 더블탭은 File.ts/Memo.ts가 위임하지 않으므로(wireIframeArrowKeys가 해당 iframe에서 직접 잡음) 여기엔
// 오지 않는다.
// Control.ts는 F1/F2/F3/F4만 지원하므로(F7은 무시) runControlHotkey가 알 수 없는 키는 그냥 무시된다.
CIframeMsg.Recv({
    'home-hotkey': (data) => {
        const key = String(data.key ?? '');
        if (key === 'F4') runControlF4Key();
        else runControlHotkey(key);
    },
});

// File 탭(File.ts)이 스스로 다른 원격으로 전환하면 이 메시지로 currentWebRootUrl을 갱신하고,
// Memo iframe에도 같은 원격을 보도록 알려준다(memoSendRemoteInfo와 동일한 단일 출처 패턴).
CIframeMsg.Recv({
    'file-remote-changed': (data) => {
        currentWebRootUrl = String(data.baseUrl ?? '');
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
    // Editor.html이 내용 수정/저장 시 보내는 신호. ev.source로 어느 editor iframe인지 찾아 그 세션의
    // dirty 상태만 갱신하고 사이드바 점(초록/노랑)을 다시 그린다.
    'editor-dirty': (data, source) => {
        for (const [key, f] of editorIframePool) {
            if (f.contentWindow !== source) continue;
            const s = editorSessions.get(key);
            if (s) { s.dirty = !!data.dirty; renderSessionSidebar(); }
            break;
        }
    },
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

// ---- 다운로드 탭 (MountDownloadTab) ---- 파일 맨 아래 "다운로드(Download) 관련 소스" 구간으로 이동함.

// ---- 로그 탭: provider(CLI)별 대화 로그를 세션 아코디언으로 보여준다 (CProviderLog/cmd/log-* 기반) ----
interface LogSessionEntry { name: string; offset: number; model: string; firstText: string; cwd: string; time: number; }
interface LogRecord { id: number; key: string; provider: string; sessionId: string; cwd: string; model: string; role: string; text: string; tool?: string; file?: string; createdAt: number; }

const logAccordionList = CDOM.ID('logAccordionList') as HTMLDivElement;
const logLoadMoreBtn = CDOM.ID('logLoadMoreBtn') as HTMLButtonElement;
const logSearchInput = CDOM.ID('logSearchInput') as HTMLInputElement;
const logSourceLabel = CDOM.ID('logSourceLabel') as HTMLSpanElement;
let logNextBefore: number | null = null;
let logSearchTerm = '';
const LOG_PAGE_SIZE = 15;

// 로그 탭은 RDP 사이드바에서 선택한 서버를 그대로 따라간다(로컬 선택=로컬 로그, 원격 선택=그 원격의 로그).
// 목록을 불러온 시점의 ctx는 아코디언 항목에 함께 실어둔다 — 펼치기/삭제가 나중에 일어나도 목록을 받아온
// 그 서버로 가야 하기 때문(중간에 사용자가 다른 원격으로 갈아탈 수 있다).
function logServerCtx(): IServerCtx {
    const prefix = 'rdp:remote:';
    const remoteId = selectedRdpKey.startsWith(prefix) ? selectedRdpKey.slice(prefix.length) : '';
    return serverCtxOf(remoteId) ?? localServerCtx();
}

// 제목 옆에 지금 로그를 가져오는 원본 주소를 보여준다(로컬이면 Local).
function logUpdateSource() {
    const ctx = logServerCtx();
    const addr = remoteEntryUrl(ctx.remoteId);
    logSourceLabel.className = 'small fw-normal text-truncate ' + (ctx.remoteId ? 'text-danger' : 'text-secondary');
    logSourceLabel.title = addr || CPath.WebRootUrl();
    logSourceLabel.textContent = ctx.remoteId ? addr : L('ctrl.local', 'Local');
}

// RDP에서 서버를 바꾸면 라벨을 갱신하고, 로그 탭이 보이는 중이면 그 자리에서 다시 불러온다
// (보이지 않으면 다음에 탭을 열 때 shown.bs.tab 핸들러가 어차피 다시 부른다).
function logOnServerChanged() {
    logUpdateSource();
    if (isPanelShown('log-panel')) logLoadSessions(true);
}

function logRegexEscape(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 원문을 escape한 뒤 검색어와 일치하는 부분만 <mark>로 감싼다.
function logHighlightText(raw: string, term: string): string {
    const escapedRaw = aiEscapeHtml(raw);
    if (!term) return escapedRaw;
    const re = new RegExp(logRegexEscape(aiEscapeHtml(term)), 'gi');
    return escapedRaw.replace(re, m => `<span class="log-search-hit">${m}</span>`);
}

// 대화 본문은 마크다운 원문이라 그대로 이스케이프해 보여주면 문법 기호가 그대로 노출된다.
// AI 응답에 섞인 raw HTML이 실행되지 않도록 먼저 escape한 뒤 marked로 파싱한다(Chat.ts renderMarkdown과 동일 패턴).
function logRenderMarkdown(raw: string): string {
    return marked.parse(aiEscapeHtml(raw), { xhtml: false }) as string;
}

// 마크다운 렌더링 후의 HTML은 태그 구조를 갖고 있어 문자열 치환으로 하이라이트하면 태그가 깨질 수 있다.
// 텍스트 노드만 순회하며 일치 부분을 span으로 감싼다.
function logHighlightNode(root: HTMLElement, term: string): void {
    if (!term) return;
    const re = new RegExp(logRegexEscape(term), 'gi');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) textNodes.push(n as Text);
    for (const node of textNodes) {
        const text = node.textContent ?? '';
        re.lastIndex = 0;
        if (!re.test(text)) continue;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
            if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            const span = document.createElement('span');
            span.className = 'log-search-hit';
            span.textContent = m[0];
            frag.appendChild(span);
            last = m.index + m[0].length;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode?.replaceChild(frag, node);
    }
}

// 타이틀 미리보기뿐 아니라, 이미 펼쳐서 로드된 대화 본문(.log-body-text의 data-raw)에도 검색어가 있으면 매치로 본다.
// 본문에 있는지 여부는 열어보기 전까진 알 수 없으므로, 한 번이라도 로드된 세션은 접힌 상태에서도 타이틀 색으로 알려준다.
function logItemMatchesTerm(item: HTMLElement, term: string): boolean {
    if (!term) return false;
    const t = term.toLowerCase();
    const preview = item.dataset.preview ?? '';
    if (preview.toLowerCase().includes(t)) return true;
    const bodies = item.querySelectorAll<HTMLElement>('.log-body-text');
    for (const b of Array.from(bodies)) {
        if ((b.dataset.raw ?? '').toLowerCase().includes(t)) return true;
    }
    return false;
}

// 항목 하나의 매치 상태를 갱신한다 — 타이틀 텍스트 색뿐 아니라 아코디언 헤더 바 전체 배경도 바꿔,
// 접힌 상태에서도(제목에 검색어가 없어도) 본문에 매치가 있다는 걸 한눈에 알 수 있게 한다.
// 본문이 나중에(펼칠 때) 로드된 경우에도 재사용.
function logUpdateItemMatchState(item: HTMLElement, term: string): void {
    const titleSpan = item.querySelector<HTMLElement>('.log-title-text');
    const header = item.querySelector<HTMLElement>('[data-act="toggle"]');
    if (!titleSpan || !header) return;
    const matched = logItemMatchesTerm(item, term);
    titleSpan.classList.toggle('text-primary', matched);
    titleSpan.classList.toggle('fw-semibold', matched);
    header.classList.toggle('bg-body-tertiary', !matched);
    header.classList.toggle('bg-primary-subtle', matched);
}

// 화면에 보이는(로드된) 세션 항목만 대상으로 타이틀 + 펼쳐진 대화 내용에 검색어가 포함되는지 확인해 색을 바꾼다.
function logApplySearch(term: string): void {
    logSearchTerm = term;
    const items = logAccordionList.querySelectorAll<HTMLDivElement>(':scope > div');
    items.forEach(item => {
        const titleSpan = item.querySelector<HTMLElement>('.log-title-text');
        if (!titleSpan) return;
        titleSpan.innerHTML = logHighlightText(item.dataset.preview ?? '', term);
    });
    logApplySearchToBodies(term);
    items.forEach(item => logUpdateItemMatchState(item, term));
}

// 이미 펼쳐서 로드된 대화 내용(말풍선, 마크다운 렌더링)에도 같은 방식으로 하이라이트를 적용한다.
function logApplySearchToBodies(term: string): void {
    logAccordionList.querySelectorAll<HTMLElement>('.log-body-text').forEach(el => {
        const raw = el.dataset.raw ?? '';
        el.innerHTML = logRenderMarkdown(raw);
        logHighlightNode(el, term);
    });
}

logSearchInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    logApplySearch(logSearchInput.value.trim());
});

// createdAt은 CProviderLog.Stamp()가 만든 YYYYMMDDHHmmss 정수 — 화면 표시용으로만 문자열 분해.
function logFormatTime(stamp: number): string {
    const s = String(stamp);
    if (s.length < 14) return s;
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
}

async function logLoadSessionBody(ctx: IServerCtx, sessionId: string, bodyEl: HTMLElement) {
    try {
        const r = await ctxFetch(ctx, `cmd/log-session?sessionId=${encodeURIComponent(sessionId)}`);
        const j = await r.json();
        if (!j.ok) { bodyEl.innerHTML = `<span class="text-danger small">${aiEscapeHtml(j.msg ?? L('ctrl.failed', 'failed'))}</span>`; return; }
        const records: LogRecord[] = j.records ?? [];
        if (!records.length) { bodyEl.innerHTML = `<span class="text-secondary small">${L('ctrl.noMessages', 'No messages.')}</span>`; return; }
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
        bodyEl.querySelectorAll<HTMLElement>('.log-body-text').forEach((el, i) => {
            const rec = records[i];
            el.dataset.raw = rec.role === 'tool'
                ? `${(rec.tool || '').trim()} ${(rec.file || '').trim()}`.trim()
                : rec.text.trim();
            logHighlightNode(el, logSearchTerm);
        });
        // 본문이 방금 로드됐으므로, 이미 검색어가 입력돼 있었다면 이 항목의 타이틀 색도 다시 판정한다.
        const item = bodyEl.closest<HTMLElement>('[data-session-id]');
        if (item) logUpdateItemMatchState(item, logSearchTerm);
    } catch (e: any) {
        bodyEl.innerHTML = `<span class="text-danger small">${aiEscapeHtml(e?.message ?? String(e))}</span>`;
    }
}

// 세션 하나 = 아코디언 항목 하나. 클릭 시 최초 1회만 대화 전체를 지연 로드한다.
function logCreateAccordionItem(ctx: IServerCtx, entry: LogSessionEntry): HTMLDivElement {
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
        logLoadSessionBody(ctx, entry.name, item.querySelector<HTMLElement>('[data-role="body"]')!);
    });
    item.querySelector<HTMLElement>('[data-act="del"]')!.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const dlg = new CConfirm();
        dlg.SetBody(LF('ctrl.msg.deleteSessionLog', 'Delete all logs for session "{0}"?', aiEscapeHtml(entry.name)));
        dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
            async () => {
                await ctxFetch(ctx, `cmd/log-session-del?sessionId=${encodeURIComponent(entry.name)}`);
                bsCollapse.dispose();
                item.remove();
            },
            () => {},
        ], [L('ctrl.delete', 'Delete'), L('ctrl.cancel', 'Cancel')]);
        dlg.Open();
    });
    return item;
}

// 원격이 아직 인증되지 않았으면 조회 자체가 401이라 목록이 빈 채로 남는다. 왜 비었는지 알려주고
// 그 자리에서 인증할 수 있게 안내를 대신 그린다.
function logRenderAuthNotice(ctx: IServerCtx) {
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

async function logLoadSessions(reset: boolean) {
    if (reset) { logAccordionList.innerHTML = ''; logNextBefore = null; }
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
        if (!j.ok) return;
        const sessions: LogSessionEntry[] = j.sessions ?? [];
        for (const s of sessions) logAccordionList.appendChild(logCreateAccordionItem(ctx, s));
        logNextBefore = sessions.length ? sessions[sessions.length - 1].offset : logNextBefore;
        logLoadMoreBtn.style.display = sessions.length >= LOG_PAGE_SIZE ? '' : 'none';
    } catch (e) { console.error('logLoadSessions error:', e); }
}

CDOM.ID('log-tab').addEventListener('shown.bs.tab', () => logLoadSessions(true));
if (CDOM.ID('log-panel').classList.contains('active')) { logLoadSessions(true); }
else logUpdateSource();
CDOM.ID('logRefreshBtn').addEventListener('click', () => logLoadSessions(true));
logLoadMoreBtn.addEventListener('click', () => logLoadSessions(false));

// 상단 X: 모든 provider 로그를 통째로 삭제(cmd/log-clear) 후 목록 갱신.
CDOM.ID('logClearBtn').addEventListener('click', () => {
    const ctx = logServerCtx();
    const dlg = new CConfirm();
    dlg.SetBody(L('ctrl.msg.deleteAllLogs', 'Delete ALL logs? This will remove every session and cannot be undone.')
        // 어느 서버의 로그를 지우는지 확인창에서도 못 박아 준다(원격 선택 중에 로컬 로그를 지운 줄 아는 사고 방지).
        + `<div class="small text-secondary mt-1">${aiEscapeHtml(remoteEntryUrl(ctx.remoteId) || L('ctrl.local', 'Local'))}</div>`);
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        async () => {
            await ctxFetch(ctx, 'cmd/log-clear');
            logLoadSessions(true);
        },
        () => {},
    ], [L('ctrl.deleteAll', 'Delete All'), L('ctrl.cancel', 'Cancel')]);
    dlg.Open();
});

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
// 원격 로그인 성공 시 로컬 서버의 /RemoteCMD/Write를 호출해 ai/RemoteCMDGuide.md에
// 그 원격 주소/토큰을 등록한다(Home.ts의 rdpSendRemoteGuide와 동일).
async function rdpSendRemoteGuide(webRootUrl: string, token: string): Promise<void> {
    try {
        const base = webRootUrl.replace(/\/+$/, '');
        await CFecth.Exe(CPath.WebRootUrl() + "RemoteCMD/Write", { addr: base + "/proj/Control/Control.html", token }, "json");
    } catch (e) {
        console.error("RemoteCMD/Write update failed:", e);
    }
}

async function rdpCheckRemoteAuth(webRootUrl: string): Promise<boolean> {
    const token = getAuthToken(webRootUrl);
    if (!token) return false;
    try {
        const j = await CFecth.Exe(webRootUrl + "auth/check", { token }, "json") as any;
        return !!j?.authed;
    } catch { return false; }
}

// 로컬 세션 1회 relog(Chat.html 등과 동일 역할, Control 셸 진입 시만).
// - 로컬 API는 계속 세션 쿠키만 본다. 여기서는 쿠키가 비었을 때 localStorage 토큰으로 세션만 되살린다.
// - 성공/확정 실패는 settled 캐시 → 5초 폴링마다 auth/check를 반복하지 않는다(죽은 토큰 brute-force 잠금 방지).
// - 확정 실패(403·authed:false) 시 토큰을 지워 다음 로드에서도 재시도하지 않는다.
// - 네트워크 오류만 settled 하지 않아, 서버가 다시 살아나면 한 번 더 시도한다.
let localAuthSettled = false;
let localAuthOk = false;
let localAuthInFlight: Promise<boolean> | null = null;
async function ensureLocalAuth(): Promise<boolean> {
    if (localAuthSettled) return localAuthOk;
    if (localAuthInFlight) return localAuthInFlight;
    const origin = CPath.WebRootUrl();
    const token = getAuthToken(origin);
    if (!token) {
        localAuthSettled = true;
        localAuthOk = false;
        return false;
    }
    localAuthInFlight = (async () => {
        try {
            // CFecth는 non-2xx를 reject 해서 403(죽은 토큰)과 네트워크 오류를 구분 못 한다 → fetch 직접 사용.
            const res = await fetch(origin + 'auth/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify({ token }),
            });
            if (!res.ok) {
                // 서버가 죽은 토큰에 대해 이미 recordAuthFail 한 상태. 토큰을 지워 재호출을 막는다.
                removeAuthToken(origin);
                localAuthSettled = true;
                localAuthOk = false;
                return false;
            }
            const j = await res.json().catch(() => null) as { authed?: boolean } | null;
            if (j?.authed) {
                localAuthSettled = true;
                localAuthOk = true;
                return true;
            }
            removeAuthToken(origin);
            localAuthSettled = true;
            localAuthOk = false;
            return false;
        } catch {
            // 서버 미응답: 토큰 유지, settled 아님 → 이후 목록 조회/폴링에서 재시도.
            return false;
        } finally {
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

// 저장된 password가 해시(SHA256, 64자)가 아니라 평문으로 들어와 있는 경우(수동 편집 등)를 대비해
// CAuthServer.handleAuth와 동일한 규칙으로 정규화한다: 64자 미만이면 해시가 아닌 것으로 보고 해시한다.
function rdpNormalizePassword(password: string): string {
    return password.length < 64 ? CHash.SHA256('artgine_' + password) : password;
}

// 저장된 password가 있는 원격은 기존 토큰을 확인/재사용하지 않고 매번 auth/login으로 새 세션을
// 새로 맺는다(만료/서버 재시작으로 토큰이 죽어 있어도 관리자 비밀번호 재입력 없이 바로 붙기 위함).
// password가 없으면(과거에 추가된 원격) 기존처럼 저장된 토큰 유효성만 확인한다.
async function rdpEnsureRemoteAuth(remote: IRdpRemote): Promise<boolean> {
    if (!remote.password) return rdpCheckRemoteAuth(rdpRemoteWebRootUrl(remote.entryUrl));
    const webRootUrl = rdpRemoteWebRootUrl(remote.entryUrl);
    try {
        const j = await authLogin(webRootUrl, rdpNormalizePassword(remote.password));
        if (!j.ok || !j.token) return false;
        setAuthToken(webRootUrl, j.token);
        return true;
    } catch { return false; }
}

// 같은 webRootUrl에 대해 이미 열려 있는 인증창이 있으면 그 콜백 목록에 합류한다.
// (ctrlRefreshRootSelect와 memoSendRemoteInfo가 원격 전환 시 동시에 각자 호출해 인증창이 2개
// 뜨는 경우가 있었는데, 그러면 둘 다 id="AuthPassword"라 doAuth()의 getElementById가 항상
// 첫 번째 창의(엉뚱한/빈) 값을 읽어 비밀번호를 맞게 입력해도 항상 실패하는 버그가 있었다.)
// 주의: CConfirm OK는 콜백 직후 무조건 Close 하므로, 실패/취소/ESC/X 어떤 경로로 닫혀도
// Map 항목을 반드시 지워야 한다. 지우지 않으면 이후 rdpPromptRemoteAuth가 existing early-return만
// 하고 모달을 다시 열지 않는다.
const gAuthPromptCallbacks = new Map<string, Array<() => void>>();

// 그 원격의 admin 비밀번호 인증창. 성공하면 토큰을 저장하고 onSuccess를 호출한다(Home.ts의 rdpPromptRemoteAuth와 동일).
function rdpPromptRemoteAuth(webRootUrl: string, onSuccess?: () => void) {
    const existing = gAuthPromptCallbacks.get(webRootUrl);
    if (existing) { if (onSuccess) existing.push(onSuccess); return; }
    const callbacks: Array<() => void> = onSuccess ? [onSuccess] : [];
    gAuthPromptCallbacks.set(webRootUrl, callbacks);
    const releaseAuthPrompt = () => { gAuthPromptCallbacks.delete(webRootUrl); };
    const dlg = new CConfirm();
    dlg.SetBody(`${L('ctrl.msg.enterAdminPassword', 'Enter admin password:')}<br><input type="password" id="AuthPassword" class="form-control form-control-sm">`);
    const doAuth = () => {
        const pw = CDOM.IDValue("AuthPassword");
        authLogin(webRootUrl, CHash.SHA256('artgine_' + pw), () => {
            CAlert.Info(L('ctrl.msg.waitingTwoFactor', 'Waiting for messenger approval (up to 5 minutes)...'));
        }).then((j: { ok: boolean, token?: string, msg?: string }) => {
            if (j.ok) {
                setAuthToken(webRootUrl, j.token!);
                CAlert.Info(L('ctrl.msg.permissionGranted', 'Permission granted'));
                if (pw === "artgine") {
                    CAlert.Warning(L('ctrl.msg.defaultPassword', 'You are using the default password. Please change it for security.'));
                }
                // 로컬 로그인 성공 시 relog 캐시를 성공으로 두고, 이전에 인증 없이 건너뛴 RDP 저장 목록을 불러온다.
                if (webRootUrl === CPath.WebRootUrl()) { markLocalAuthOk(); rdpLoadRemotes(); }
                // 원격 로그인 성공 시, 로컬의 ai/RemoteCMDGuide.md에 그 원격 주소/토큰을 등록한다(Home.ts와 동일).
                else {
                    rdpSendRemoteGuide(webRootUrl, j.token!);
                    // 로그인 전엔 인증 게이트에 막혀 경로를 못 불러왔으므로, 이제 그 원격의 Agent 그룹 경로를 새로 불러온다.
                    const remote = rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === webRootUrl);
                    if (remote) refreshRemoteRoots(remote);
                }
                // 성공 콜백은 로컬 callbacks 배열 기준(Close로 Map이 먼저 비워져도 동작).
                releaseAuthPrompt();
                callbacks.forEach(cb => cb());
            } else {
                // OK/Enter는 이미 모달을 닫은 뒤라 Map을 비워 재호출 시 다시 뜨게 한다.
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
    // ESC/X 등 버튼 외 닫힘에서도 Map 잔존 방지(OK 실패·취소와 동일).
    dlg.On(CEvent.eType.Close, releaseAuthPrompt);
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

// 로컬 서버 인증 여부를 확인하고, 인증 안 됐으면 경고 메시지 + 패스워드 모달을 띄운다(File 탭 제외 다른 탭 전환 가드용).
// 패스워드 모달을 먼저 열고 그 뒤에 경고를 띄워, 경고가 모달보다 앞에 보이도록 한다.
function ctrlRequireAuthed(): boolean {
    if (getAuthToken(CPath.WebRootUrl())) return true;
    rdpPromptRemoteAuth(CPath.WebRootUrl());
    CAlert.Warning(L('ctrl.msg.authRequired', 'Authentication required. Please sign in first.'));
    return false;
}
// File 탭을 제외한 나머지 탭은 인증 전에는 전환되지 않도록 막는다. 트리거 방식(직접 클릭/사이드바
// 클릭으로 인한 프로그램적 Tab.show() 호출)에 상관없이 'show.bs.tab'은 실제 전환 직전에 공통으로
// 발생하므로 여기서 preventDefault()하면 그 뒤의 shown.bs.tab 기반 초기화(패널 로드 등)도 함께 막힌다.
// 플러그인이 동적으로 추가하는 탭(예: ControlDownload의 download-tab)은 이 목록에 넣지 않는다.
// 플러그인 client js는 Control.js보다 먼저 실행되므로 여기서 ctrlRequireAuthed를 전역으로 노출해두고,
// 플러그인 쪽에서 이벤트 발생 시점에 지연 조회해 같은 가드를 건다.
(window as any).ctrlRequireAuthed = ctrlRequireAuthed;
// 없는 탭에서 최상위 throw가 나면 이 아래 모듈 본문 전체(사이드바/채팅/터미널/인증 초기화 등)가
// 실행되지 않으므로, 반드시 옵셔널 체이닝으로 방어한다.
['rdp-panel-tab', 'chat-panel-tab', 'browser-panel-tab', 'editor-panel-tab', 'term-tab', 'memo-tab', 'log-tab', 'messenger-tab'].forEach((tabId) => {
    CDOM.ID(tabId)?.addEventListener('show.bs.tab', (e: Event) => {
        if (!ctrlRequireAuthed()) e.preventDefault();
    });
});

// Chat/Terminal/Browser 사이드바 목록이 인증 안 됨(토큰 없음/만료)으로 못 받아올 때 공용으로 쓰는
// "로그인 필요" 안내 + Sign In 버튼. 클릭하면 로컬 서버(CPath.WebRootUrl())에 대해 rdpPromptRemoteAuth로
// 관리자 비밀번호를 물어보고, 성공하면 onSuccess(보통 그 목록의 RenderList 재호출)로 즉시 다시 채운다.
function renderSignInPrompt(container: HTMLElement, onSuccess: () => void) {
    container.innerHTML = `
        <div class="text-center text-secondary small p-3 d-flex flex-column align-items-center gap-2">
            <div>${L('ctrl.msg.signInRequired', 'Sign in required.')}</div>
            <button type="button" class="btn btn-sm btn-outline-primary sign-in-btn">${L('ctrl.signIn', 'Sign In')}</button>
        </div>`;
    container.querySelector<HTMLButtonElement>('.sign-in-btn')!.addEventListener('click', () => {
        rdpPromptRemoteAuth(CPath.WebRootUrl(), onSuccess);
    });
}

// Memo iframe에 어느 서버를 쓸지 알린다. 원격이면서 인증이 안 되어 있으면 그 순간 비밀번호를 물어보고,
// 성공한 뒤에야 토큰을 실어 보낸다(로컬이면 baseUrl/token 둘 다 빈 값 = 로컬 리셋).
async function memoSendRemoteInfo() {
    const baseUrl = currentWebRootUrl;
    if (!baseUrl) {
        if (memoIframe?.contentWindow) CIframeMsg.Send(memoIframe.contentWindow, 'set-remote', { baseUrl: '', token: '' });
        return;
    }
    const remote = rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === baseUrl);
    const authed = remote?.password ? await rdpEnsureRemoteAuth(remote) : await rdpCheckRemoteAuth(baseUrl);
    if (!authed) {
        rdpPromptRemoteAuth(baseUrl, () => {
            if (currentWebRootUrl !== baseUrl) return; // 그 사이에 다른 원격/로컬로 전환했으면 무시
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
// 좌측 사이드바 하위 목록: Agent(Chat/Terminal, 경로 그룹) / Other(Browser/Editor, 평면 최신순).
const agentSidebarList = CDOM.ID("agent-sidebar-list") as HTMLDivElement;
const otherSidebarList = CDOM.ID("other-sidebar-list") as HTMLDivElement;
const agentAddFolderBtn = CDOM.ID("agentAddFolderBtn") as HTMLButtonElement;

// ---- 하위 탭(Agent/Other) 선택 + 그룹 접힘 상태 persist ----
const SB_TAB_LS = 'ctrl.sidebar.subtab';
const SB_COLLAPSE_LS = 'ctrl.sidebar.collapsed';
function sbSafeArr(s: string | null): string[] { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a.map(String) : []; } catch { return []; } }
let sbSubTab: 'agent' | 'other' = localStorage.getItem(SB_TAB_LS) === 'other' ? 'other' : 'agent';
const collapsedGroups = new Set<string>(sbSafeArr(localStorage.getItem(SB_COLLAPSE_LS)));
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

// 재정렬만 얼린다. 예전에는 "호버 중에는 렌더 자체를 통째로 스킵"했는데, 그러면 마우스를 올려둔 동안
// 점 색/시간/active까지 전부 멈추고(터치는 mouseleave가 안 와서 영구 정지) 그걸 메우려고 예외 패치를
// 또 만들어야 했다. 클릭이 깨지는 원인은 "갱신"이 아니라 "누르는 순간 항목이 움직이는 것"뿐이므로,
// 포인터가 목록 위에 있거나 드롭다운이 열려 있는 동안에는 순서만 고정하고 내용 갱신은 계속한다.
let sessionOrderFrozen = false;
let frozenSessionOrder: string[] = [];            // Other 목록의 얼린 순서
let frozenAgentGroupOrder: string[] = [];         // Agent 그룹(경로)의 얼린 순서
let frozenAgentItemOrder: string[] = [];          // Agent 아이템의 얼린 순서(그룹 무관 평면)
function freezeSessionOrder(on: boolean) {
    if (sessionOrderFrozen === on) return;
    sessionOrderFrozen = on;
    if (!on) renderSessionSidebar(); // 풀리는 즉시 밀린 정렬을 반영한다.
}
// pointerenter/leave는 마우스·터치·펜을 모두 커버한다(mouseenter와 달리 터치에서 한쪽만 오지 않는다).
for (const lst of [agentSidebarList, otherSidebarList]) {
    lst.addEventListener('pointerenter', () => freezeSessionOrder(true));
    lst.addEventListener('pointerleave', () => freezeSessionOrder(false));
    // enter는 "경계를 넘을 때"만 오므로, 로드 시점부터 커서가 이미 목록 위면 발화하지 않는다. 누르는 순간에도 잠근다.
    lst.addEventListener('pointerdown', () => freezeSessionOrder(true));
}

// ---- Agent 경로 그룹 노드(경로 헤더 + 접기 + '...' 생성 메뉴 + 아이템 컨테이너) ----
// 그룹 키는 세션 workingDir를 정규화한 값. './'(WorkingPath)는 '.'로 정규화된다.
interface AgentGroupEl extends HTMLDivElement { _key: string; }
const agentGroupEls = new Map<string, AgentGroupEl>();
function agentGroupKey(wd?: string): string { return ctrlNormPath(wd || './') || '.'; }
function agentGroupPathText(key: string): string { return key === '.' ? './' : key; }
// 그룹 키에서 서버(remoteId)와 경로 텍스트를 뽑는다. 로컬은 키 자체가 경로키, 원격은 `remote:${remoteId}:${경로키}`.
function parseGroupKey(key: string): { remoteId: string; pathText: string } {
    if (key.startsWith('remote:')) {
        const rest = key.slice('remote:'.length);
        const i = rest.indexOf(':');
        const remoteId = i >= 0 ? rest.slice(0, i) : rest;
        const base = i >= 0 ? rest.slice(i + 1) : '';
        return { remoteId, pathText: agentGroupPathText(base) };
    }
    return { remoteId: '', pathText: agentGroupPathText(key) };
}
function clearAgentGroups() { for (const el of agentGroupEls.values()) destroyAgentGroup(el); agentGroupEls.clear(); }

function createAgentGroup(key: string): AgentGroupEl {
    const wrap = document.createElement('div') as AgentGroupEl;
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
    const head = wrap.querySelector('.agent-group-head') as HTMLElement;
    head.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.dropdown')) return; // '...' 메뉴 클릭은 접기 토글 제외
        if (collapsedGroups.has(wrap._key)) collapsedGroups.delete(wrap._key); else collapsedGroups.add(wrap._key);
        saveCollapsedGroups();
        wrap.classList.toggle('agent-group-collapsed', collapsedGroups.has(wrap._key));
    });
    const addBtn = wrap.querySelector('[data-bs-toggle="dropdown"]')!;
    new (window as any).bootstrap.Dropdown(addBtn, { popperConfig: { strategy: 'fixed' } });
    // 생성 시점의 key가 아니라 현재(wrap._key) 경로로 만든다(그룹 노드는 재사용되므로).
    wrap.querySelector<HTMLElement>('[data-new="chat"]')!.addEventListener('click', () => { const g = parseGroupKey(wrap._key); chatStartNew(g.pathText, g.remoteId); });
    wrap.querySelector<HTMLElement>('[data-new="term"]')!.addEventListener('click', () => { const g = parseGroupKey(wrap._key); termStartNew('cmd', g.pathText, g.remoteId); });
    // Search도 Chat/Terminal과 동일하게 이 그룹의 서버(로컬/원격) + 이 그룹의 경로를 검색 대상으로 쓰지만,
    // 모달에는 전체 패스가 체크박스로 나열되고 이 그룹만 기본 체크된 상태로 열린다(나머지는 사용자가 추가로 켤 수 있음).
    wrap.querySelector<HTMLElement>('[data-new="search"]')!.addEventListener('click', () => {
        if (ctrlGroupSearchScope(wrap._key)) ctrlFileSearch(wrap._key);
    });
    return wrap;
}
function destroyAgentGroup(el: AgentGroupEl) {
    const toggle = el.querySelector('[data-bs-toggle="dropdown"]');
    if (toggle) (window as any).bootstrap.Dropdown.getInstance(toggle)?.dispose();
    el.remove();
}

// remoteLabel이 있으면 원격 소유 그룹 - 주소를 경로 위 줄에 표시하고 빨강 액센트(agent-group-remote)를 켠다.
interface IAgentGroupMeta { pathText: string; remoteLabel?: string; }
function updateAgentGroupHeader(el: AgentGroupEl, meta: IAgentGroupMeta) {
    const head = el.querySelector('.agent-group-head') as HTMLElement;
    head.classList.toggle('agent-group-remote', !!meta.remoteLabel);
    const addrEl = el.querySelector('.agent-group-addr') as HTMLElement;
    addrEl.style.display = meta.remoteLabel ? 'block' : 'none';
    addrEl.textContent = meta.remoteLabel ?? '';
    el.querySelector('.agent-group-path > span')!.textContent = meta.pathText;
}

// ---- Agent 그룹 표시 전용 경로 캐시(로컬 + 원격 각각 독립) ----
// ctrlRootOpts/ctrlRefreshRootSelect는 "지금 RDP 탭에서 보고 있는 서버 하나"(currentWebRootUrl)를
// 따라 로컬↔원격으로 통째로 바뀐다(File 탭 기본 경로·New Chat/Terminal 기본 작업폴더용이라 그게 맞음).
// 그 값을 Agent 그룹 소스로 그대로 쓰면, 원격을 RDP에서 보는 동안 그 원격 경로가 "로컬"인 것처럼
// (prefix 없이) 한 번 더 나타나 remoteRootsCache 표시와 중복된다. 그래서 로컬 경로도 여기서
// 완전히 별도로 관리한다 - 어느 RDP 탭을 보고 있든 로컬은 로컬대로, 원격은 원격대로 항상 동시에 보인다.
let localRootOpts: ICtrlRootOpt[] = [];
const remoteRootsCache = new Map<string, ICtrlRootOpt[]>();

async function refreshLocalRoots() {
    try {
        const data = await CFecth.Exe(CPath.WebRootUrl() + "File/Root", {}, "json") as { roots: ICtrlRootOpt[] };
        // ctrlRenderRootOpts와 동일하게 Artgine 작업경로 항목만 표시 이름을 바꿔치기한다.
        localRootOpts = (data.roots ?? []).map(r => r.name === './' ? { ...r, name: 'Artgine (WorkingPath)' } : r);
        renderSessionSidebar();
    } catch { /* 다음 rdpRenderList 재호출 때 재시도된다 */ }
}

async function refreshRemoteRoots(r: IRdpRemote) {
    const webRootUrl = rdpRemoteWebRootUrl(r.entryUrl);
    if (!(await rdpEnsureRemoteAuth(r))) {
        if (remoteRootsCache.delete(r.remoteId)) renderSessionSidebar();
        return;
    }
    try {
        const token = getAuthToken(webRootUrl);
        const data = await CFecth.Exe(webRootUrl + "File/Root", token ? { token } : {}, "json") as { roots: ICtrlRootOpt[] };
        remoteRootsCache.set(r.remoteId, data.roots ?? []);
        renderSessionSidebar();
    } catch { /* 다음 rdpRenderList 재호출 때 재시도된다 */ }
}
// RDP 목록이 다시 그려질 때마다(추가/삭제/로컬·원격 전환/초기 로드) 로컬 + 등록된 모든 원격의 경로를
// 다시 갱신한다 - 폴링이 아니라 그 시점들에서만 호출되므로 과도한 요청이 아니다.
function refreshAllRemoteRoots() { refreshLocalRoots(); rdpRemotes.forEach(refreshRemoteRoots); }

// ==================================================================================================================
// 서버 컨텍스트: 로컬 + 각 원격을 동일 인터페이스로 다룬다(멀티서버 Chat/Terminal용)
// ==================================================================================================================
// remoteId '' = 로컬. 로컬은 same-origin 쿠키로 인증(authToken=''), 원격은 저장된 토큰을 ?authToken= 로 실어보낸다.
// (서버의 AIChat/cmd 라우터가 CFileServer와 동일하게 authToken 있으면 토큰, 없으면 쿠키로 인증한다.)
interface IServerCtx { remoteId: string; apiUrl: string; artgineUrl: string; authToken: string; }
function localServerCtx(): IServerCtx {
    return { remoteId: '', apiUrl: CPath.WebRootUrl(), artgineUrl: CPath.WebRootArtgineUrl(), authToken: '' };
}
function remoteServerCtx(r: IRdpRemote): IServerCtx {
    const base = rdpRemoteWebRootUrl(r.entryUrl);
    return { remoteId: r.remoteId, apiUrl: base, artgineUrl: base, authToken: getAuthToken(base) };
}
function serverCtxOf(remoteId: string): IServerCtx | null {
    if (!remoteId) return localServerCtx();
    const r = rdpRemotes.find(x => x.remoteId === remoteId);
    return r ? remoteServerCtx(r) : null;
}
// 원격 세션 항목의 서브라인에 표시할 원본 주소(로컬이면 '').
function remoteEntryUrl(remoteId: string): string {
    return remoteId ? (rdpRemotes.find(r => r.remoteId === remoteId)?.entryUrl || '') : '';
}
// 세션 조회 대상: 로컬 + 인증 토큰이 있는(=사용자가 이미 인증한) 원격만. 미인증 원격은 건너뛴다(경로 빈 그룹만 표시됨).
function sessionServerCtxs(): IServerCtx[] {
    return [localServerCtx(), ...rdpRemotes.map(remoteServerCtx).filter(c => !!c.authToken)];
}
// API 요청 URL: 원격이면 authToken을 쿼리에 덧붙인다(로컬은 same-origin 쿠키라 그대로).
function ctxApiUrl(ctx: IServerCtx, apiPath: string): string {
    const url = ctx.apiUrl + apiPath;
    if (!ctx.authToken) return url;
    return url + (url.includes('?') ? '&' : '?') + 'authToken=' + encodeURIComponent(ctx.authToken);
}
// 원격 조회에는 타임아웃을 걸어 죽은/느린 원격 서버가 목록 갱신 전체를 막지 않게 한다(로컬은 same-origin이라 불필요).
const REMOTE_FETCH_TIMEOUT_MS = 8000;
function ctxFetch(ctx: IServerCtx, apiPath: string, init?: RequestInit): Promise<Response> {
    const url = ctxApiUrl(ctx, apiPath);
    if (!ctx.remoteId) return fetch(url, init);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REMOTE_FETCH_TIMEOUT_MS);
    return fetch(url, { ...init, signal: ac.signal }).finally(() => clearTimeout(timer));
}
// 프레임/캐시/알림 키: 로컬은 기존과 동일(chat:${id}), 원격은 remoteId로 네임스페이스(chat:${remoteId}:${id}).
// 이렇게 해야 서로 다른 서버의 같은 세션ID가 충돌하지 않고, 로컬 동작은 바이트 단위로 그대로 유지된다.
function sessKey(prefix: string, remoteId: string, id: string): string {
    return remoteId ? `${prefix}:${remoteId}:${id}` : `${prefix}:${id}`;
}
// sessKey의 역: `${prefix}:${id}`=로컬('') / `${prefix}:${remoteId}:${id}`=원격. (id/remoteId엔 ':'가 없음 — uuid/hex)
function keyRemoteId(key: string): string {
    const parts = key.split(':');
    return parts.length >= 3 ? parts[1] : '';
}
// chat/term 세션 키를 {remoteId, id}로 분해한다(editor 키처럼 id에 ':'가 든 경우엔 쓰지 말 것).
function parseSessKey(key: string): { remoteId: string; id: string } {
    const parts = key.split(':');
    return parts.length >= 3 ? { remoteId: parts[1], id: parts.slice(2).join(':') } : { remoteId: '', id: parts.slice(1).join(':') };
}
// 세션이 속한 서버의 Agent 그룹키(renderAgentGroups의 원격 빈 그룹 키 `remote:${remoteId}:${path}`와 일치시켜 같은 그룹에 배치).
function sessionGroupKey(remoteId: string, workingDir?: string): string {
    const base = agentGroupKey(workingDir);
    return remoteId ? `remote:${remoteId}:${base}` : base;
}

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

// remoteId: '' = 로컬, 그 외 = 등록된 원격의 remoteId. 세션이 어느 서버 것인지의 단일 출처.
type IChatSess = { sessionId: string; title: string; updatedAt?: number; busy?: boolean; lastMsg?: string; workingDir?: string; remoteId: string };
type ITermSess = { token: string; mode: string; key?: string; lastMsg: string; updatedAt: number; createdAt: number; alive: boolean; busy: boolean; permPending?: boolean; workingDir?: string; remoteId: string };
let lastChatSessions: IChatSess[] | null = null;
let lastTermSessions: ITermSess[] | null = null;

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
            clearAgentGroups();
            otherSidebarList.innerHTML = '';
            renderSignInPrompt(agentSidebarList, () => { chatRenderList(); termRenderList(); browserRefreshList(); });
        }
        return;
    }
    if (sessionSidebarSignedOut) { sessionSidebarSignedOut = false; agentSidebarList.innerHTML = ''; otherSidebarList.innerHTML = ''; }

    const activeKey = activeSessionKey();

    // Agent(Chat/Terminal)와 Other(Browser/Editor)로 분리한다.
    type AgentEntry = { key: string; groupKey: string; sortKey: number; spec: SessionItemSpec };
    type OtherEntry = { key: string; sortKey: number; spec: SessionItemSpec };
    const agentEntries: AgentEntry[] = [];
    if (lastChatSessions) for (const s of lastChatSessions) agentEntries.push({ key: sessKey('chat', s.remoteId, s.sessionId), groupKey: sessionGroupKey(s.remoteId, s.workingDir), sortKey: s.updatedAt ?? 0, spec: chatItemSpec(s, activeKey) });
    // key가 있는 터미널 세션 = 서브 에이전트가 띄운 세션. 숨김이 켜져 있으면 목록에서 빼되,
    // 그룹별로 몇 개가 숨었는지 세어 헤더 배지로 보여준다(아예 안 보이면 "왜 없지" 하고 다시 헷갈리게 된다).
    const hiddenByGroup = new Map<string, number>();
    if (lastTermSessions) for (const s of lastTermSessions) {
        const groupKey = sessionGroupKey(s.remoteId, s.workingDir);
        if (hideSubAgentSessions && s.key) {
            hiddenByGroup.set(groupKey, (hiddenByGroup.get(groupKey) ?? 0) + 1);
            continue;
        }
        agentEntries.push({ key: sessKey('term', s.remoteId, s.token), groupKey, sortKey: s.updatedAt ?? 0, spec: termItemSpec(s, activeKey) });
    }
    const otherEntries: OtherEntry[] = [];
    for (const s of browserSessions.values()) otherEntries.push({ key: `browser:${s.sessionId}`, sortKey: s.updatedAt ?? s.createdAt ?? 0, spec: browserItemSpec(s, activeKey) });
    for (const s of editorSessions.values()) otherEntries.push({ key: s.key, sortKey: s.openedAt, spec: editorItemSpec(s, activeKey) });
    otherEntries.sort((a, b) => b.sortKey - a.sortKey);

    // 사라진 세션 노드 정리(두 목록 공용 캐시).
    const live = new Set<string>();
    for (const e of agentEntries) live.add(e.key);
    for (const e of otherEntries) live.add(e.key);
    for (const [key, el] of Array.from(sessionItemEls)) {
        if (!live.has(key)) { destroySessionItem(el); sessionItemEls.delete(key); }
    }

    // 재정렬 잠금: 포인터가 목록 위이거나 어느 목록이든 드롭다운이 열려 있으면 순서만 고정한다.
    const frozen = sessionOrderFrozen
        || !!agentSidebarList.querySelector('.dropdown-menu.show')
        || !!otherSidebarList.querySelector('.dropdown-menu.show');

    renderAgentGroups(agentEntries, frozen, hiddenByGroup);
    renderOtherList(otherEntries, frozen);
}

// Agent: 경로별 그룹으로 렌더. 그룹 소스 = 등록된 경로(ctrlRootOpts) ∪ 실제 세션의 workingDir.
// 등록 경로는 세션이 없어도 빈 그룹으로 남고, 등록 안 된 임의 경로 세션은 자기 그룹을 새로 만든다.
function renderAgentGroups(entries: { key: string; groupKey: string; sortKey: number; spec: SessionItemSpec }[], frozen: boolean, hiddenByGroup: Map<string, number>) {
    // 그룹별 아이템 수집.
    const byGroup = new Map<string, { key: string; groupKey: string; sortKey: number; spec: SessionItemSpec }[]>();
    for (const e of entries) {
        let arr = byGroup.get(e.groupKey);
        if (!arr) { arr = []; byGroup.set(e.groupKey, arr); }
        arr.push(e);
    }
    // 등록 경로(순서 유지) → 세션만 있는 임의 경로(최근순).
    // 로컬(ctrlRootOpts) 뒤에 등록된 모든 원격(remoteRootsCache)의 경로를 이어붙인다 - 키에 원격 id를
    // 포함시켜 로컬 경로와 절대 충돌하지 않게 하고, 헤더 표시용 메타(주소/경로 텍스트)를 함께 기록한다.
    const regSet = new Set<string>();
    const registered: string[] = [];
    const groupMeta = new Map<string, IAgentGroupMeta>();
    for (const r of localRootOpts) {
        const k = agentGroupKey(r.path);
        if (!regSet.has(k)) { regSet.add(k); registered.push(k); groupMeta.set(k, { pathText: agentGroupPathText(k) }); }
    }
    for (const remote of rdpRemotes) {
        const roots = remoteRootsCache.get(remote.remoteId);
        if (!roots) continue;
        for (const ro of roots) {
            const base = agentGroupKey(ro.path);
            const k = `remote:${remote.remoteId}:${base}`;
            if (!regSet.has(k)) { regSet.add(k); registered.push(k); groupMeta.set(k, { pathText: agentGroupPathText(base), remoteLabel: remote.entryUrl }); }
        }
    }
    // 보이는 세션이 하나도 없어도(전부 숨겨진 서브 에이전트 세션뿐이어도) 그룹 자체는 남아야
    // 숨김 배지가 뜬다 - 그래서 byGroup뿐 아니라 hiddenByGroup의 키도 adhoc 후보에 포함시킨다.
    const adhocKeys = new Set<string>(byGroup.keys());
    for (const k of hiddenByGroup.keys()) adhocKeys.add(k);
    const adhoc = Array.from(adhocKeys).filter(k => !regSet.has(k));
    adhoc.sort((a, b) => (byGroup.get(b)?.[0]?.sortKey ?? 0) - (byGroup.get(a)?.[0]?.sortKey ?? 0));

    // 그룹 순서/아이템 순서를 얼림 상태에 맞춰 확정.
    let groupOrder = [...registered, ...adhoc];
    const naturalItemOrder: string[] = [];
    for (const arr of byGroup.values()) { arr.sort((a, b) => b.sortKey - a.sortKey); for (const e of arr) naturalItemOrder.push(e.key); }
    if (frozen) {
        const grank = new Map(frozenAgentGroupOrder.map((k, i) => [k, i]));
        groupOrder = groupOrder.slice().sort((a, b) => (grank.get(a) ?? Number.MAX_SAFE_INTEGER) - (grank.get(b) ?? Number.MAX_SAFE_INTEGER));
        const irank = new Map(frozenAgentItemOrder.map((k, i) => [k, i]));
        for (const arr of byGroup.values()) arr.sort((a, b) => (irank.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (irank.get(b.key) ?? Number.MAX_SAFE_INTEGER));
    } else {
        frozenAgentGroupOrder = groupOrder.slice();
        frozenAgentItemOrder = naturalItemOrder;
    }

    // 죽은 그룹 제거(등록 경로가 아니고, 보이는 세션도 숨겨진 세션도 없는 그룹).
    for (const [k, el] of Array.from(agentGroupEls)) {
        if (!regSet.has(k) && !byGroup.has(k) && !hiddenByGroup.has(k)) { destroyAgentGroup(el); agentGroupEls.delete(k); }
    }

    // 그룹 노드 배치 + 헤더 갱신 + 그룹 내부 아이템 배치.
    let gcursor: Element | null = agentSidebarList.firstElementChild;
    for (const k of groupOrder) {
        let g = agentGroupEls.get(k);
        if (!g) { g = createAgentGroup(k); agentGroupEls.set(k, g); }
        // 등록 그룹은 groupMeta에 메타가 있고, 세션만 있는 adhoc 그룹은 키에서 직접 파싱한다
        // (원격 adhoc 그룹도 빨강+주소가 붙도록 remoteLabel을 채운다).
        let meta = groupMeta.get(k);
        if (!meta) { const pg = parseGroupKey(k); meta = { pathText: pg.pathText, remoteLabel: pg.remoteId ? remoteEntryUrl(pg.remoteId) : undefined }; }
        updateAgentGroupHeader(g, meta);
        const items = byGroup.get(k) ?? [];
        g.querySelector('.agent-group-count')!.textContent = items.length ? String(items.length) : '';
        const hiddenCount = hiddenByGroup.get(k) ?? 0;
        const hiddenEl = g.querySelector('.agent-group-hidden') as HTMLElement;
        hiddenEl.textContent = hiddenCount ? `+${hiddenCount} \u{1F916}` : '';
        hiddenEl.title = hiddenCount ? `${hiddenCount} hidden sub agent session(s)` : '';
        g.classList.toggle('agent-group-collapsed', collapsedGroups.has(k));
        if (g === gcursor) gcursor = gcursor.nextElementSibling;
        else agentSidebarList.insertBefore(g, gcursor);

        const body = g.querySelector('.agent-group-body') as HTMLElement;
        let icursor: Element | null = body.firstElementChild;
        for (const e of items) {
            let el = sessionItemEls.get(e.key);
            if (!el) { el = createSessionItem(e.spec); sessionItemEls.set(e.key, el); }
            else updateSessionItem(el, e.spec);
            if (el === icursor) icursor = icursor.nextElementSibling;
            else body.insertBefore(el, icursor);
        }
    }
}

// Other: Browser/Editor를 최신순 평면 목록으로 렌더(기존 통합 목록과 동일한 재조정).
function renderOtherList(entries: { key: string; sortKey: number; spec: SessionItemSpec }[], frozen: boolean) {
    let ordered = entries;
    if (frozen) {
        const rank = new Map(frozenSessionOrder.map((k, i) => [k, i]));
        ordered = entries.slice().sort((a, b) => (rank.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.key) ?? Number.MAX_SAFE_INTEGER));
    } else {
        frozenSessionOrder = entries.map(e => e.key);
    }
    let cursor: Element | null = otherSidebarList.firstElementChild;
    for (const e of ordered) {
        let el = sessionItemEls.get(e.key);
        if (!el) { el = createSessionItem(e.spec); sessionItemEls.set(e.key, el); }
        else updateSessionItem(el, e.spec);
        if (el === cursor) cursor = cursor.nextElementSibling;
        else otherSidebarList.insertBefore(el, cursor);
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
    activatePaneUnlessMultiplexer('chat-panel-tab', 'Chat');
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
    activatePaneUnlessMultiplexer('editor-panel-tab', 'Editor');
}

interface IEditorSession { key: string; path: string; baseUrl: string; url: string; openedAt: number; dirty: boolean; }
const editorSessions = new Map<string, IEditorSession>();

function editorFrameSrc(s: IEditorSession): string {
    const root = s.baseUrl || CPath.WebRootArtgineUrl();
    return `${root}artgine/server/html/Editor.html?path=${encodeURIComponent(s.path)}&url=${encodeURIComponent(s.url)}`;
}

function editorOpenFile(path: string, baseUrl: string, url: string) {
    const key = `editor:${baseUrl}|${path}`;
    let s = editorSessions.get(key);
    if (!s) {
        s = { key, path, baseUrl, url, openedAt: Date.now(), dirty: false };
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
        CAlert.E(LF('ctrl.msg.cannotOpenUnknownWd', 'Cannot open path — working directory is unknown: {0}', tappedPath));
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
            CAlert.E(LF('ctrl.msg.cannotOpenNotRoot', 'Cannot open path — not under a registered root: {0}', fullPath));
            return;
        }
        const relPath = normFull.slice(termNormAbsPath(root.path).length);
        const downBase = new URL(root.url, CPath.WebRootUrl()).href.replace(/\/+$/, '');
        const url = downBase + relPath.split('/').map(encodeURIComponent).join('/');
        promptSourceAction(fullPath, '', url);
    } catch (e) {
        console.error('termOpenTappedPath error:', e);
        CAlert.E(L('ctrl.msg.openPathError', 'An error occurred while opening the path.'));
    }
}

function fileExtOf(path: string): string {
    const m = /\.([a-zA-Z0-9]+)$/.exec(path);
    return m ? m[1].toLowerCase() : '';
}

// Execute는 html 파일에만 해당한다: 새 창에서 실제 렌더링.
function executeOpenedSource(fullPath: string, url: string) {
    window.open(url, "_blank");
}

// File 탭(file-opened)과 Terminal 탭(terminal-path-tapped)이 공유하는 단일 진입점.
// html/htm만 Edit·Execute 확인창을 띄우고(새 창 실행 여부 선택), 그 외 소스는 기존처럼 바로 에디터로 연다.
function promptSourceAction(fullPath: string, baseUrl: string, url: string) {
    const ext = fileExtOf(fullPath);
    const canExecute = ext === 'html' || ext === 'htm';
    if (!canExecute) { editorOpenFile(fullPath, baseUrl, url); return; }

    const actions = [() => editorOpenFile(fullPath, baseUrl, url), () => executeOpenedSource(fullPath, url), () => {}];
    const labels = [L('ctrl.edit', 'Edit'), L('ctrl.execute', 'Execute'), L('ctrl.cancel', 'Cancel')];

    const confirm = new CConfirm();
    confirm.SetBody(`"${aiEscapeHtml(fullPath)}"`);
    confirm.SetConfirm(CConfirm.eConfirm.List, actions, labels);
    confirm.Open();
}

function editorItemSpec(s: IEditorSession, activeKey: string | null): SessionItemSpec {
    const name = s.path.split('/').pop() || s.path;
    const dir = s.path.slice(0, s.path.length - name.length);
    const dot = s.dirty
        ? `<span class="text-warning small" title="${L('ctrl.st.modified', 'Modified (unsaved)')}">●</span>`
        : `<span class="text-success small" title="${L('ctrl.st.saved', 'Saved')}">●</span>`;
    // 원격 서버에서 연 파일이면(File 탭에서 currentWebRootUrl과 함께 열렸음) 로컬(파랑)과 구분되도록
    // 빨강 강조를 쓰고, 경로 줄 위에 원격 주소를 한 줄 더 보여준다(Agent 그룹의 agent-group-remote와 동일 규칙).
    const isRemote = !!s.baseUrl;
    return {
        activeClass: isRemote ? 'ai-session-item-active-remote' : 'ai-session-item-active',
        isActive: activeKey === s.key,
        dataAttr: { name: 'key', value: s.key },
        leftHtml: `${dot}`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;" title="${aiEscapeHtml(s.path)}">
            <span class="text-truncate small"><i class="bi bi-file-earmark-code"></i> ${aiEscapeHtml(name)}</span>
            ${isRemote ? `<span class="text-secondary" style="font-size:0.68rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${aiEscapeHtml(s.baseUrl)}</span>` : ''}
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

// New Chat 모달(MCP/Copy MD/Write 옵션 + 경로 입력). 사이드바에서 선택된 경로가 initialWorkingDir로
// 넘어와 기본값으로 채워지지만, 모달 안에서 직접 수정할 수 있다.
// remoteId를 주면(원격 그룹의 '+'에서 호출) 그 원격 오리진에서 Chat.html을 열어 그 서버에 세션이 생긴다.
function chatStartNew(initialWorkingDir?: string, remoteId: string = '') {
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
        const mcpCheck        = container.querySelector<HTMLInputElement>('#chat-opt-mcp')!;
        const mdcopyCheck     = container.querySelector<HTMLInputElement>('#chat-opt-mdcopy')!;
        const writeCheck      = container.querySelector<HTMLInputElement>('#chat-opt-write')!;
        const workingDirInput = container.querySelector<HTMLInputElement>('#chat-opt-workingdir')!;
        workingDirInput.value = (initialWorkingDir ?? '').trim(); // 사이드바 선택 경로를 기본값으로 채워주되, 모달에서 직접 수정할 수 있다.

        const doOpen = () => {
            const ctx = serverCtxOf(remoteId);
            if (!ctx) { modal.Close(); return; }
            const sid = genUuid();
            const workingDir = workingDirInput.value.trim();
            const params = new URLSearchParams({ session: sid });
            if (!mcpCheck.checked) params.set('mcp', '0');
            if (workingDir) params.set('workingDir', workingDir);
            if (mdcopyCheck.checked) params.set('mdcopy', '1');
            if (!writeCheck.checked) params.set('write', '0');
            chatActivatePane();
            // 원격이면 그 원격 오리진에서 Chat.html이 열려 스스로 인증한다(iframe src에 authToken 미부착).
            showChatFrame(sessKey('chat', remoteId, sid), `${ctx.artgineUrl}artgine/server/html/Chat.html?${params.toString()}`);
            chatRenderList();
            setTimeout(chatRenderList, 1500);
            setTimeout(chatRenderList, 4000);
            modal.Close();
        };

        container.querySelector<HTMLButtonElement>('#chat-modal-open')!.addEventListener('click', doOpen);
        container.querySelector<HTMLButtonElement>('#chat-modal-cancel')!.addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}
// More > Chat: 사이드바 경로 그룹과 무관하게 여는 진입점이므로 경로를 비워둔다(사용자가 모달에서 직접 입력).
CDOM.ID('chat-new-btn').addEventListener('click', () => chatStartNew());

function chatLoadSession(s: { remoteId: string; sessionId: string }) {
    const ctx = serverCtxOf(s.remoteId);
    if (!ctx) return;
    chatActivatePane();
    // Chat.html은 원격이면 그 원격 오리진에서 로드되어 스스로 인증(자체 사인인)한다 - iframe src에는 authToken을 붙이지 않는다.
    showChatFrame(sessKey('chat', s.remoteId, s.sessionId), `${ctx.artgineUrl}artgine/server/html/Chat.html?session=${encodeURIComponent(s.sessionId)}`);
    renderSessionSidebar();
}

function chatShowShareLink(ctx: IServerCtx, sid: string, title: string) {
    const shareUrl = `${ctx.artgineUrl}artgine/server/html/Chat.html?session=${encodeURIComponent(sid)}`;
    showShareLinkModal('Chat Share Link', `Anyone with this link can access the chat: <strong>${aiEscapeHtml(title)}</strong>`, shareUrl);
}

function chatItemSpec(s: IChatSess, activeKey: string | null): SessionItemSpec {
    const ctx = serverCtxOf(s.remoteId);
    const key = sessKey('chat', s.remoteId, s.sessionId);
    const isRemote = !!s.remoteId;
    const addr = remoteEntryUrl(s.remoteId);
    const rel = chatFormatRelative(s.updatedAt);
    const isLoaded = chatIframePool.has(key);
    const st: 'off' | 'busy' | 'idle' = !isLoaded ? 'off' : s.busy ? 'busy' : 'idle';
    const dot = st === 'off'  ? `<span class="text-danger small" title="${L('ctrl.st.disconnected', 'Disconnected')}">●</span>`
              : st === 'busy' ? `<span class="ai-busy-dot text-warning small" title="${L('ctrl.st.busy', 'Busy')}">●</span>`
              :                 `<span class="text-success small" title="${L('ctrl.st.idle', 'Idle')}">●</span>`;
    return {
        // 원격 세션은 로컬(파랑)과 구분되도록 빨강(-remote) 강조를 쓴다.
        activeClass: isRemote ? 'ai-session-item-active-remote' : 'ai-session-item-active',
        isActive: activeKey === key,
        dataAttr: { name: 'key', value: key },
        leftHtml: `
        <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
            ${dot}
            ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
        </span>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            ${isRemote && addr ? `<span class="text-truncate text-danger" style="font-size:0.65rem;">${aiEscapeHtml(addr)}</span>` : ''}
            <span class="text-truncate text-secondary" style="font-size:0.65rem;font-family:monospace;">${aiEscapeHtml(s.sessionId)}</span>
            <span class="text-truncate small">${aiEscapeHtml(s.lastMsg || s.title)}</span>
        </span>`,
        deleteAct: 'delete',
        deleteLabel: '🗑️ Delete',
        onClick: () => chatLoadSession(s),
        onShare: () => { if (ctx) chatShowShareLink(ctx, s.sessionId, s.title); },
        onDelete: async () => {
            // 원격이면 그 서버로 authToken 실어 삭제, 로컬이면 same-origin 쿠키(authedFetch)로.
            if (ctx) await fetch(ctxApiUrl(ctx, `AIChat/session?id=${s.sessionId}`), { method: 'DELETE' });
            const f = chatIframePool.get(key);
            if (f) { f.remove(); chatIframePool.delete(key); }
            if (activeChatFrameKey === key) { activeChatFrameKey = null; updateChatFramePlaceholder(); }
            chatRenderList();
        },
        popup: { url: () => `${ctx?.artgineUrl ?? CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(s.sessionId)}`, title: s.title, winName: `chat_${s.remoteId}_${s.sessionId}` },
    };
}

// 폴링 루프와 이벤트성 갱신(세션 생성 직후 등)이 겹칠 수 있다. 이미 같은 조회가 떠 있으면 건너뛴다
// —— 어차피 떠 있는 쪽이 최신 결과를 가져오고, 겹쳐 두면 늦게 온 응답이 캐시를 되돌린다.
let chatListInFlight = false;
async function chatRenderList() {
    // 진입 시 1회 relog로 세션 쿠키를 되살린 뒤 목록을 본다(폴링마다 재호출하지 않음 — ensureLocalAuth 캐시).
    await ensureLocalAuth();
    // 로컬 인증 상태가 전체 사인인 게이트를 좌우한다(기존과 동일). 로컬 토큰이 없으면 원격도 조회하지 않는다.
    if (!getAuthToken(CPath.WebRootUrl())) {
        chatAuthState = 'signin';
        lastChatSessions = null;
        renderSessionSidebar();
        return;
    }
    if (chatListInFlight) return;
    chatListInFlight = true;
    try {
        // 로컬 + 인증된 모든 원격을 병렬 조회하되, 서버별 응답이 오는 즉시 반영한다.
        // (일괄 Promise.all이면 느린 원격 1대의 타임아웃 때문에 로컬 목록/401 판정도 같이 늦어진다.)
        const ctxs = sessionServerCtxs();
        let merged: IChatSess[] = (lastChatSessions ?? []).slice();
        await Promise.all(ctxs.map(async (ctx) => {
            const remoteId = ctx.remoteId;
            let sessions: IChatSess[] | null = null;
            let unauthed = false;
            try {
                const r = await ctxFetch(ctx, 'AIChat/sessions?limit=30');
                if (r.status === 401) unauthed = true;
                else if (r.ok) { const j = await r.json(); sessions = j.ok ? j.sessions as IChatSess[] : null; }
            } catch { /* sessions=null: 실패 서버 스킵 */ }

            // 로컬 401이면 전체 사인인 게이트. 원격 401은 그 서버만 건너뛴다.
            if (unauthed && !remoteId) {
                removeAuthToken(CPath.WebRootUrl());
                markLocalAuthLost();
                chatAuthState = 'signin';
                lastChatSessions = null;
                renderSessionSidebar();
                return;
            }
            if (!sessions) return;

            chatAuthState = 'ok';
            merged = merged.filter(s => s.remoteId !== remoteId).concat(sessions.map(raw => ({ ...raw, remoteId })));
            for (const s of sessions) {
                const full: IChatSess = { ...s, remoteId };
                const key = sessKey('chat', remoteId, full.sessionId);
                const st: SessState = full.busy ? 'busy' : 'idle';
                syncSessState(key, st, () => {
                    const suppressToast = activeChatFrameKey === key && document.hasFocus();
                    _showDoneNotification(aiEscapeHtml(full.title), full.lastMsg ? aiEscapeHtml(full.lastMsg) : undefined, () => chatLoadSession(full), aiEscapeHtml(full.sessionId), suppressToast);
                });
            }
            lastChatSessions = merged;
            renderSessionSidebar();
        }));
    } catch (e) { console.error('Chat session list error:', e); }
    finally { chatListInFlight = false; }
}

// Chat 목록 최초 로드는 아래 sessionPollLoop 첫 회(즉시)에서 term/browser와 함께 수행한다.

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
    activatePaneUnlessMultiplexer('term-tab', 'Terminal');
}

async function termConnectSession(s: { remoteId: string; token: string }) {
    const ctx = serverCtxOf(s.remoteId);
    if (!ctx) return;
    termActivatePane();
    const key = sessKey('term', s.remoteId, s.token);
    if (termIframePool.has(key)) {
        showTermFrame(key, '');
    } else {
        // terminal-proxy는 인증 가드 엔드포인트라 원격이면 authToken을 실어야 렌더된다.
        // 렌더된 Terminal.html의 ws(조작 가능) 인증은 iframe 내부 사인인이 처리한다(원격은 최초 1회 로그인).
        showTermFrame(key, ctxApiUrl(ctx, `cmd/terminal-proxy?token=${s.token}`));
    }
    renderSessionSidebar();
}

async function termKillSession(s: { remoteId: string; token: string }) {
    const ctx = serverCtxOf(s.remoteId);
    if (!ctx) return;
    try {
        const r = await fetch(ctxApiUrl(ctx, `cmd/kill-session?token=${s.token}`));
        const j = await r.json();
        if (!j.ok) { CAlert.E(LF('ctrl.msg.deleteFailed', 'Delete failed: {0}', j.msg || 'unknown error')); return; }
        const key = sessKey('term', s.remoteId, s.token);
        const f = termIframePool.get(key);
        if (f) { f.remove(); termIframePool.delete(key); }
        if (activeTermFrameKey === key) { activeTermFrameKey = null; updateTermFramePlaceholder(); }
        termRenderList();
    } catch (e) { console.error('termKillSession error:', e); }
}

// 공유 링크는 authToken 없이 준다(토큰 유출 방지) → 방문자는 읽기전용(서버 isAuthedUpgrade=false와 동일 의미).
function termShowShareLink(ctx: IServerCtx, token: string) {
    showShareLinkModal(
        L('ctrl.share.termTitle', 'Terminal Share Link'),
        L('ctrl.share.term', 'Anyone with this link can view the terminal in read-only mode.'),
        `${ctx.apiUrl}cmd/terminal-proxy?token=${token}`
    );
}

function termItemSpec(s: ITermSess, activeKey: string | null): SessionItemSpec {
    const ctx = serverCtxOf(s.remoteId);
    const key = sessKey('term', s.remoteId, s.token);
    const isRemote = !!s.remoteId;
    const addr = remoteEntryUrl(s.remoteId);
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
        // 원격 세션은 로컬(파랑)과 구분되도록 빨강(-remote) 강조를 쓴다.
        activeClass: isRemote ? 'ai-session-item-active-remote' : 'ai-session-item-active',
        isActive,
        dataAttr: { name: 'key', value: key },
        leftHtml: `
        <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
            ${dot}
            ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
        </span>`,
        bodyHtml: `
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            ${isRemote && addr ? `<span class="text-truncate text-danger" style="font-size:0.65rem;">${aiEscapeHtml(addr)}</span>` : ''}
            <span class="text-truncate text-secondary" style="font-size:0.65rem;font-family:monospace;">${aiEscapeHtml(s.token)}</span>
            ${s.key ? `<span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(s.key)}</span>` : ''}
            <span class="text-truncate small">${preview}</span>
        </span>`,
        deleteAct: 'kill',
        deleteLabel: '🗑️ Delete',
        onClick: () => termConnectSession(s),
        onShare: () => { if (ctx) termShowShareLink(ctx, s.token); },
        onDelete: () => termKillSession(s),
        popup: { url: () => `${ctx?.apiUrl ?? CPath.WebRootUrl()}cmd/terminal-proxy?token=${s.token}`, title: s.key || s.mode || 'Terminal', winName: `term_${s.remoteId}_${s.token.slice(0, 8)}` },
    };
}

let termListInFlight = false;
let termListPending = false;   // in-flight 중 들어온 갱신 요청(누락 방지용): 끝나는 즉시 한 번 더 실행.
async function termRenderList() {
    await ensureLocalAuth();
    if (!getAuthToken(CPath.WebRootUrl())) {
        termAuthState = 'signin';
        lastTermSessions = null;
        renderSessionSidebar();
        return;
    }
    if (termListInFlight) { termListPending = true; return; }
    termListInFlight = true;
    try {
        // 로컬 + 인증된 모든 원격을 병렬 조회하되, 서버별 응답이 오는 즉시 그 서버 몫만 반영해 렌더링한다.
        // (Promise.all로 다 모아서 한번에 처리하면, 느리거나 끊긴 원격 하나의 REMOTE_FETCH_TIMEOUT_MS(8초) 때문에
        //  즉시 응답하는 로컬 갱신까지 함께 묶여서 늦게 반영되는 문제가 있었다.)
        const ctxs = sessionServerCtxs();
        let merged: ITermSess[] = (lastTermSessions ?? []).slice();
        await Promise.all(ctxs.map(async (ctx) => {
            const remoteId = ctx.remoteId;
            let sessions: ITermSess[] | null = null;
            let unauthed = false;
            try {
                const r = await ctxFetch(ctx, 'cmd/sessions');
                if (r.status === 401) unauthed = true;
                else if (r.ok) { const j = await r.json(); sessions = j.ok ? j.sessions as ITermSess[] : null; }
            } catch { /* sessions=null 유지: 실패한 서버는 스킵(기존 프레임 보존) */ }

            if (unauthed && !remoteId) {
                removeAuthToken(CPath.WebRootUrl());
                markLocalAuthLost();
                termAuthState = 'signin';
                lastTermSessions = null;
                renderSessionSidebar();
                return;
            }
            if (!sessions) return; // 실패/미인증 원격: 응답 못 받은 서버 프레임은 건드리지 않고 보존

            termAuthState = 'ok';
            const withRemote = sessions.map(x => ({ ...x, remoteId }));
            const serverTokens = new Set(withRemote.map(s => s.token));
            const liveKeys = new Set(withRemote.map(s => sessKey('term', remoteId, s.token)));

            // term-new:(remoteId:)?<token>:<ts> 임시 프레임을 실제 토큰 키로 승격한다(이 서버 것만).
            // ("가장 최근 세션"으로 추측하지 않고, 생성 시 심어둔 토큰이 실제로 나타날 때만 정확히 매칭한다.)
            const newPrefix = remoteId ? `term-new:${remoteId}:` : 'term-new:';
            for (const newKey of Array.from(termIframePool.keys())) {
                if (!newKey.startsWith(newPrefix)) continue;
                const tok = newKey.slice(newPrefix.length, newKey.lastIndexOf(':'));
                if (!serverTokens.has(tok)) continue;
                const key = sessKey('term', remoteId, tok);
                const f = termIframePool.get(newKey)!;
                termIframePool.delete(newKey);
                termIframePool.set(key, f);
                if (activeTermFrameKey === newKey) activeTermFrameKey = key;
            }
            for (const s of withRemote) {
                const key = sessKey('term', remoteId, s.token);
                const st: SessState = !s.alive ? 'off'
                    : s.permPending ? 'wait'
                    : s.busy ? 'busy'
                    : 'idle';
                syncSessState(key, st,
                    () => {
                        const rawPreview = s.lastMsg || '';
                        const suppressToast = activeTermFrameKey === key && document.hasFocus();
                        _showDoneNotification(`${s.key || s.mode}: ${rawPreview}`.trimEnd(), rawPreview ? aiEscapeHtml(rawPreview) : undefined, () => termConnectSession(s), aiEscapeHtml(s.token), suppressToast);
                    },
                    () => {
                        const suppressToast = activeTermFrameKey === key && document.hasFocus();
                        _showDoneNotification(LF('ctrl.msg.approvalRequired', '⚠️ {0}: Approval required', s.key || s.mode), s.lastMsg || undefined, () => termConnectSession(s), aiEscapeHtml(s.token), suppressToast);
                    }
                );
            }

            // 이 서버(remoteId) 몫만 교체(다른 서버/아직 응답 안 온 서버 항목은 그대로 유지).
            merged = merged.filter(s => s.remoteId !== remoteId).concat(withRemote);

            // 죽은 term 프레임 정리: 이 서버 것 중 더 이상 살아있지 않은(liveKeys에 없는) 프레임만 제거.
            for (const key of Array.from(termIframePool.keys())) {
                if (!key.startsWith('term:')) continue; // term-new:* 는 건드리지 않음
                if (keyRemoteId(key) !== remoteId) continue;
                if (!liveKeys.has(key)) {
                    const f = termIframePool.get(key);
                    if (f) { f.remove(); termIframePool.delete(key); }
                    if (activeTermFrameKey === key) { activeTermFrameKey = null; updateTermFramePlaceholder(); }
                }
            }

            lastTermSessions = merged;
            renderSessionSidebar();
        }));
    } catch (e) { console.error('Terminal session list error:', e); }
    finally {
        termListInFlight = false;
        if (termListPending) { termListPending = false; termRenderList(); }
    }
}

// More > Terminal 버튼: 클릭(사용자가 직접 누른 경우)하면 항상 New Terminal 모달을 띄운다.
// 사이드바 항목 클릭으로 프로그램적으로 탭을 활성화하는 경우(termActivatePane)는 'click'이 아니라
// bootstrap의 show()이므로 네이티브 click 이벤트가 발생하지 않아 여기서 다시 걸리지 않는다.
// remoteId를 주면(원격 그룹의 '+'에서 호출) 그 원격 서버에 터미널을 만들고 그 오리진에서 iframe을 연다.
async function termStartNew(mode: 'cmd' | 'claude' | 'codex' | 'antigravity' | 'opencode' | 'grok' = 'cmd', initialWorkingDir?: string, remoteId: string = '') {
    // 모델 목록은 터미널을 띄울 서버(remoteId) 것을 그대로 받아 쓴다 — 서브에이전트 모달과 같은 소스(/AIInfo/setting).
    const modelMap = await agentFetchModels(remoteId);
    const modelsFor = (providerId: string): { value: string; label: string }[] => modelMap[providerId] ?? [];
    // Provider Status 버튼 등에서 특정 mode를 넘기면 그걸 우선. 그 외(기본 cmd)는 CStorage에 저장된 마지막 provider.
    const savedProvider = getLastProvider();
    const termProviders = ['cmd', ...AGENT_PROVIDER_IDS];
    const initialProvider = (mode !== 'cmd')
        ? mode
        : (savedProvider && termProviders.includes(savedProvider) ? savedProvider : 'cmd');
    // 첫 옵션은 항상 (default) = 빈 값. 이 상태로 열면 서버에 model을 안 보내고, CLI가 기존에 선택해둔 모델을 그대로 쓴다.
    // Chat/Memo의 마지막 모델(ai.model)은 프로바이더 공통 키라 Claude 목록에만 매칭되는 경우가 많다.
    // 그 값을 복원하면 Claude만 (default)가 아닌 특정 모델이 선택된 채 열려 보이므로, New Terminal은 항상 (default)로 연다.
    const buildModelOptions = (providerId: string, selectedModel: string = ''): string => {
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
    // auto 크기면 Provider/Model 셀렉트 폭에만 맞춰져 너무 좁게 잡힌다. 폭은 고정하고,
    // 높이는 Open 이후 실측해서 맞춘다(아래 fitHeight) — 고정 높이면 Options 접힘 상태에서 버튼 밑이 남는다.
    const TERM_MODAL_W = 560;
    modal.SetSize(TERM_MODAL_W, 430);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        // 카드 높이 = 헤더 + body 컨텐츠 + body 패딩(card-body p-2 = 상하 8px) + 카드 테두리/반올림 여유 12px.
        // 여유가 없으면 1~2px 모자라 body(overflow-auto)에 스크롤바가 생긴다.
        // Options 아코디언을 여닫을 때마다 다시 맞춰 버튼 아래 빈 공간이나 불필요한 스크롤이 안 생기게 한다.
        const fitHeight = (_recenter = false) => {
            const headerH = (modal.GetHeader() as HTMLElement | null)?.offsetHeight ?? 0;
            modal.SetSize(TERM_MODAL_W, headerH + container.offsetHeight + 16 + 12);
            if (_recenter) modal.SetPosition(CModal.ePos.Center);
        };
        // 최초 1회는 Open이 430 기준으로 잡아둔 위치가 어긋나므로 다시 중앙 정렬한다.
        // 이후 아코디언 토글은 위치를 유지한 채 아래로만 늘었다 줄었다 하게 둔다(사용자가 옮겼을 수도 있으므로).
        fitHeight(true);
        const optionsAccordion = container.querySelector<HTMLElement>('#term-options-accordion')!;
        optionsAccordion.addEventListener('shown.bs.collapse', () => fitHeight());
        optionsAccordion.addEventListener('hidden.bs.collapse', () => fitHeight());

        const providerSelect = container.querySelector<HTMLSelectElement>('#term-opt-provider')!;
        const modelSelect    = container.querySelector<HTMLSelectElement>('#term-opt-model')!;
        const mcpCheck    = container.querySelector<HTMLInputElement>('#term-opt-mcp')!;
        const mdcopyCheck = container.querySelector<HTMLInputElement>('#term-opt-mdcopy')!;

        // cmd는 CLI가 아니라 그냥 셸이라 model/MCP/Copy MD가 전부 무의미하다 — 비활성화해 오해를 막는다.
        const updateModeUI = () => {
            const isCmd = providerSelect.value === 'cmd';
            // provider 변경 시에도 항상 (default). Chat 쪽 마지막 모델을 끌어오지 않는다.
            modelSelect.innerHTML = buildModelOptions(providerSelect.value, '');
            modelSelect.disabled = isCmd;
            mcpCheck.disabled = isCmd;
            mdcopyCheck.disabled = isCmd;
        };
        providerSelect.addEventListener('change', updateModeUI);
        updateModeUI();

        const keyInput  = container.querySelector<HTMLInputElement>('#term-opt-key')!;
        const workingDirInput = container.querySelector<HTMLInputElement>('#term-opt-workingdir')!;
        workingDirInput.value = (initialWorkingDir ?? '').trim(); // 사이드바 선택 경로가 기본값이지만 모달에서 직접 수정 가능.
        const openBtn   = container.querySelector<HTMLButtonElement>('#term-modal-open')!;
        const cancelBtn = container.querySelector<HTMLButtonElement>('#term-modal-cancel')!;

        let opening = false;
        const doOpen = async () => {
            if (opening) return;
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
                if (key)        params.set('key', key);
                if (workingDir) params.set('workingDir', workingDir);
                if (selectedModel) params.set('model', selectedModel); // 비우면(=default) 서버에 안 보내 CLI 기본/기존 모델 유지.
                if (!mcpCheck.checked) params.set('mcp', '0');
                if (mdcopyCheck.checked) params.set('mdcopy', '1');
                const ctx = serverCtxOf(remoteId);
                if (!ctx) { CAlert.E(L('ctrl.msg.failedStartTerm', 'Failed to start terminal')); return; }
                const r = await fetch(ctxApiUrl(ctx, 'cmd/start-term?' + params.toString()));
                const j = await r.json();
                if (!j.ok) { CAlert.E(j.msg || L('ctrl.msg.failedStartTerm', 'Failed to start terminal')); return; }
                modal.Close();
                termActivatePane();
                showTermFrame(sessKey('term-new', remoteId, `${j.token}:${Date.now()}`), ctxApiUrl(ctx, `cmd/terminal-proxy?token=${j.token}`));
                termRenderList();
                setTimeout(termRenderList, 1500);
                setTimeout(termRenderList, 4000);
            } catch (e) {
                console.error('[Terminal] start-term error:', e);
                CAlert.E(L('ctrl.msg.failedStartTerm', 'Failed to start terminal'));
            } finally {
                opening = false;
                openBtn.disabled = false;
                cancelBtn.disabled = false;
                openBtn.innerHTML = openBtnOrigHtml;
            }
        };

        openBtn.addEventListener('click', doOpen);
        cancelBtn.addEventListener('click', () => modal.Close());
        keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doOpen(); });
    }, MODAL_DOM_DELAY);
}

const termTab = CDOM.ID('term-tab') as HTMLButtonElement;
// More > Terminal: 상단 nav에서 빠진 대신 여기서 New Terminal 모달을 연다(Chat/Browser와 동일 패턴).
// 사이드바 경로 그룹과 무관하게 여는 진입점이므로 경로를 비워둔다(사용자가 모달에서 직접 입력).
CDOM.ID('term-new-btn').addEventListener('click', () => {
    if (!ctrlRequireAuthed()) return;
    termStartNew('cmd');
});
termTab.addEventListener('shown.bs.tab', () => { termRenderList(); updateTermFrameVisibility(); });
termTab.addEventListener('hidden.bs.tab', () => updateTermFrameVisibility());

// Terminal 목록 최초 로드는 sessionPollLoop 첫 회에서 수행한다.

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
    activatePaneUnlessMultiplexer('browser-panel-tab', 'Browser');
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
    // PlayWright는 세션 쿠키만 보므로, 목록 전에 1회 relog로 쿠키를 되살린다.
    await ensureLocalAuth();
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
            removeAuthToken(CPath.WebRootUrl());
            markLocalAuthLost();
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
        L('ctrl.share.browserTitle', 'Browser Share Link'),
        LF('ctrl.share.browser', 'Anyone with this link can view the session in read-only mode: <strong>{0}</strong>', aiEscapeHtml(url)),
        `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}&readonly=1`
    );
}

// More > Search: F2와 동일하게 스코프 없이 열어 전체 패스가 기본 체크된 상태로 띄운다.
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
            } catch (_) { CAlert.E(L('ctrl.msg.failedStartBrowser', 'Failed to start browser')); }
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
    otherSidebarList.querySelectorAll<HTMLElement>('[data-key^="browser:"]').forEach(el => {
        const sid = el.dataset.key!.slice('browser:'.length);
        const s = browserSessions.get(sid);
        const ttlEl = el.querySelector<HTMLSpanElement>('.browser-ttl-label');
        if (s && ttlEl) ttlEl.textContent = s.expiresAt ? browserFmtTtl(s.expiresAt) : '';
    });
}, 1000);

// 사이드바 목록(Chat/Terminal/Browser)은 탭과 무관하게 항상 보이므로, busy/idle 상태(응답 완료 등)가
// 실시간으로 반영되도록 첫 조회 즉시 + 이후 5초마다 갱신한다.
// setInterval이 아니라 "셋 다 끝난 뒤 5초"로 도는 이유: 응답이 5초를 넘기면 요청이 계속 쌓이고,
// 늦게 온 옛 응답이 새 응답을 덮어써 목록이 과거 상태로 되돌아간다.
// ensureLocalAuth 는 목록 첫 호출에서 1회만 relog 하고, 이후 폴링은 settled 캐시만 본다.
async function sessionPollOnce() {
    await Promise.allSettled([chatRenderList(), termRenderList(), browserRefreshList()]);
}
(async function sessionPollLoop() {
    for (;;) {
        await sessionPollOnce();
        await new Promise(r => setTimeout(r, 5000));
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

// ---- Tmux 패널: 센터 영역을 tmux처럼 좌우/상하로 분할해 여러 iframe을 동시에 띄운다.
// 트리는 leaf(콘텐츠 1칸)와 split(row/col 두 자식)로 구성되며, 설정 모드에서 분할/병합/셀렉트를
// 수행하고 작업 모드에서는 오버레이 없이(iframe이 직접 입력을 받도록) 결과만 보여준다.
// leaf DOM 요소는 분할/병합 시 통째로 재사용하므로(appendChild로 이동) iframe이 다시 로드되지 않는다 —
// 단, 분할되지 않은 채로 남아있는 다른 leaf들은 재생성되지 않아 그대로 유지된다.
interface ITmuxPane {
    id: string;
    split?: 'row' | 'col';
    children?: [ITmuxPane, ITmuxPane];
    contentKey?: string | null;
}
const TMUX_LS_KEY = 'ctrl-tmux-layout-v1';
const TMUX_MODE_LS_KEY = 'ctrl-tmux-mode-v1';
const tmuxPaneEls = new Map<string, HTMLElement>();
const tmuxTreeRoot = CDOM.ID('tmux-tree-root') as HTMLDivElement;
const tmuxModeWorkBtn = CDOM.ID('tmux-mode-work-btn') as HTMLButtonElement;
const tmuxModeConfigBtn = CDOM.ID('tmux-mode-config-btn') as HTMLButtonElement;

function tmuxLoadLayout(): ITmuxPane {
    try {
        const raw = localStorage.getItem(TMUX_LS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { id: genUuid(), contentKey: null };
}
function tmuxStrip(p: ITmuxPane): ITmuxPane {
    if (p.split && p.children) return { id: p.id, split: p.split, children: [tmuxStrip(p.children[0]), tmuxStrip(p.children[1])] };
    return { id: p.id, contentKey: p.contentKey ?? null };
}
function tmuxSaveLayout() {
    try { localStorage.setItem(TMUX_LS_KEY, JSON.stringify(tmuxStrip(tmuxRoot))); } catch (_) {}
}

let tmuxRoot: ITmuxPane = tmuxLoadLayout();
let tmuxMode: 'work' | 'config' = (localStorage.getItem(TMUX_MODE_LS_KEY) as 'work' | 'config') || 'config';

function tmuxFind(node: ITmuxPane, id: string): ITmuxPane | null {
    if (node.id === id) return node;
    if (node.children) { for (const c of node.children) { const f = tmuxFind(c, id); if (f) return f; } }
    return null;
}
function tmuxFindParent(node: ITmuxPane, id: string, parent: ITmuxPane | null = null): { pane: ITmuxPane; parent: ITmuxPane | null } | null {
    if (node.id === id) return { pane: node, parent };
    if (node.children) { for (const c of node.children) { const f = tmuxFindParent(c, id, node); if (f) return f; } }
    return null;
}
function tmuxCollectIds(p: ITmuxPane, out: string[] = []): string[] {
    out.push(p.id);
    if (p.children) { tmuxCollectIds(p.children[0], out); tmuxCollectIds(p.children[1], out); }
    return out;
}

// 선택된 콘텐츠 키(chat:xxx / term:xxx / browser:xxx / rdp:local / rdp:remote:xxx)를 실제 iframe src로 변환.
// 기존 각 탭의 프레임 풀이 쓰는 것과 동일한 URL 규칙을 그대로 따른다(showChatFrame 등 호출부 참고).
function tmuxKeyToSrc(key: string): string | null {
    if (key.startsWith('chat:')) {
        const p = parseSessKey(key); const ctx = serverCtxOf(p.remoteId);
        return ctx ? `${ctx.artgineUrl}artgine/server/html/Chat.html?session=${encodeURIComponent(p.id)}` : null;
    }
    if (key.startsWith('term:')) {
        const p = parseSessKey(key); const ctx = serverCtxOf(p.remoteId);
        return ctx ? ctxApiUrl(ctx, `cmd/terminal-proxy?token=${encodeURIComponent(p.id)}`) : null;
    }
    if (key.startsWith('browser:')) {
        return `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(key.slice(8))}`;
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
    return null;
}
function tmuxRenderLeafContent(el: HTMLElement, key: string | null) {
    const content = el.querySelector('.tmux-leaf-content') as HTMLElement;
    content.innerHTML = '';
    if (!key) return;
    const src = tmuxKeyToSrc(key);
    if (!src) return;
    const f = document.createElement('iframe');
    f.src = src;
    content.appendChild(f);
}
// leaf 하나의 중앙에 뜨는 분할/병합/셀렉트 버튼 묶음. 별도 "선택" 단계 없이 버튼이 곧 그 칸에 대한
// 조작이므로, 클릭 시 pane.id를 그대로 넘긴다. 루트(부모 없음)에는 병합 버튼을 만들지 않는다.
function tmuxBuildLeafToolbar(paneId: string): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'tmux-leaf-toolbar';
    const canMerge = !!tmuxFindParent(tmuxRoot, paneId)?.parent;
    toolbar.innerHTML = `
        <button type="button" class="btn btn-sm btn-outline-secondary tmux-pane-split-h" data-CLan-title="ctrl.tmux.splitH" title="좌우 분할"><i class="bi bi-layout-split"></i></button>
        <button type="button" class="btn btn-sm btn-outline-secondary tmux-pane-split-v" data-CLan-title="ctrl.tmux.splitV" title="상하 분할"><i class="bi bi-layout-split" style="display:inline-block;transform:rotate(90deg);"></i></button>
        ${canMerge ? `<button type="button" class="btn btn-sm btn-outline-secondary tmux-pane-merge" data-CLan-title="ctrl.tmux.merge" title="병합"><i class="bi bi-arrows-angle-contract"></i></button>` : ''}
        <button type="button" class="btn btn-sm btn-outline-primary tmux-pane-select" data-CLan-title="ctrl.tmux.select" title="콘텐츠 선택"><i class="bi bi-card-list"></i></button>
    `;
    toolbar.querySelector('.tmux-pane-split-h')!.addEventListener('click', () => tmuxSplitPane(paneId, 'row'));
    toolbar.querySelector('.tmux-pane-split-v')!.addEventListener('click', () => tmuxSplitPane(paneId, 'col'));
    toolbar.querySelector('.tmux-pane-merge')?.addEventListener('click', () => tmuxMergePane(paneId));
    toolbar.querySelector('.tmux-pane-select')!.addEventListener('click', () => tmuxOpenSelectModal(paneId));
    applyLanIn(toolbar);
    return toolbar;
}
function tmuxBuildEl(pane: ITmuxPane): HTMLElement {
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
        empty.textContent = L('ctrl.tmux.emptyPane', '설정 모드에서 셀렉트로 콘텐츠를 선택하세요');
        content.appendChild(empty);
    } else {
        tmuxRenderLeafContent(el, pane.contentKey);
    }
    const overlay = document.createElement('div');
    overlay.className = 'tmux-leaf-overlay';
    overlay.appendChild(tmuxBuildLeafToolbar(pane.id));
    el.appendChild(overlay);
    tmuxPaneEls.set(pane.id, el);
    return el;
}
function tmuxRenderAll() {
    tmuxPaneEls.clear();
    tmuxTreeRoot.innerHTML = '';
    tmuxTreeRoot.appendChild(tmuxBuildEl(tmuxRoot));
}

function tmuxApplyMode() {
    tmuxTreeRoot.classList.toggle('tmux-config-mode', tmuxMode === 'config');
    tmuxModeWorkBtn.classList.toggle('active', tmuxMode === 'work');
    tmuxModeConfigBtn.classList.toggle('active', tmuxMode === 'config');
}

// 해당 leaf를 좌우(row)/상하(col)로 분할한다. 기존 콘텐츠(iframe)는 첫 번째 자식으로 그대로 옮겨진다
// (appendChild 단일 이동이라 iframe이 다시 로드되지 않는다).
function tmuxSplitPane(paneId: string, dir: 'row' | 'col') {
    const pane = tmuxFind(tmuxRoot, paneId);
    if (!pane || pane.split) return;
    const oldEl = tmuxPaneEls.get(pane.id);
    const existingIframe = oldEl?.querySelector('.tmux-leaf-content iframe') as HTMLIFrameElement | null;

    const child1: ITmuxPane = { id: genUuid(), contentKey: pane.contentKey ?? null };
    const child2: ITmuxPane = { id: genUuid(), contentKey: null };
    pane.split = dir;
    pane.children = [child1, child2];
    delete pane.contentKey;

    const splitEl = document.createElement('div');
    splitEl.className = `tmux-split tmux-split-${dir}`;
    splitEl.dataset.paneId = pane.id;
    const child1El = tmuxBuildEl(child1);
    if (existingIframe) {
        const c1content = child1El.querySelector('.tmux-leaf-content') as HTMLElement;
        c1content.innerHTML = '';
        c1content.appendChild(existingIframe);
    }
    const child2El = tmuxBuildEl(child2);
    splitEl.appendChild(child1El);
    splitEl.appendChild(child2El);

    oldEl?.replaceWith(splitEl);
    tmuxPaneEls.set(pane.id, splitEl);
    tmuxSaveLayout();
}

// paneId와 그 형제를 부모 자리에서 하나의 leaf로 합친다. paneId 쪽 콘텐츠(iframe)만 유지되고
// 형제 쪽(중첩된 하위 트리 포함)은 버려진다.
function tmuxMergePane(paneId: string) {
    const found = tmuxFindParent(tmuxRoot, paneId);
    if (!found || !found.parent) return; // 루트는 병합 대상 없음
    const { pane, parent } = found;
    const paneEl = tmuxPaneEls.get(pane.id);
    const keptIframe = paneEl?.querySelector('.tmux-leaf-content iframe') as HTMLIFrameElement | null;
    const keptContentKey = pane.contentKey ?? null;

    const staleIds = tmuxCollectIds(parent);
    // tmuxBuildEl(new leaf)가 내부에서 tmuxPaneEls.set(parent.id, ...)로 맵을 덮어쓰기 전에
    // 옛 split 컨테이너 엘리먼트를 먼저 잡아둬야 한다(순서를 바꾸면 self-replaceWith가 되어 아무 일도 안 일어남).
    const parentEl = tmuxPaneEls.get(parent.id);
    parent.split = undefined;
    parent.children = undefined;
    parent.contentKey = keptContentKey;

    const newLeafEl = tmuxBuildEl({ id: parent.id, contentKey: null });
    if (keptIframe) {
        const c = newLeafEl.querySelector('.tmux-leaf-content') as HTMLElement;
        c.innerHTML = '';
        c.appendChild(keptIframe);
    }
    parentEl?.replaceWith(newLeafEl);
    staleIds.forEach(id => { if (id !== parent.id) tmuxPaneEls.delete(id); });
    tmuxPaneEls.set(parent.id, newLeafEl);
    tmuxSaveLayout();
}

// 셀렉트: 지정된 leaf(paneId)에 표시할 기존 세션(Chat/Terminal/Browser/RDP)을 고르는 모달.
// 세션을 구분할 수 있는 값(제목/마지막 출력 등)을 primary로, 작업 폴더 등은 sub(작은 글씨)로 따로 보여준다
// — 터미널은 사용자가 이름(key)을 안 붙인 경우가 많아 workingDir만 보여주면 서로 구별이 안 됐기 때문.
function tmuxOpenSelectModal(paneId: string) {
    // Chat은 첫 메시지를 보내기 전까지 서버에 세션이 생기지 않아 lastChatSessions에 안 잡힌다.
    // 화면에 이미 열려있는(chatIframePool) 것 중 서버 목록에 없는 것도 "대화 전" 항목으로 함께 보여준다.
    const chatItems = (lastChatSessions ?? []).map(s => ({ key: sessKey('chat', s.remoteId, s.sessionId), label: s.title || s.sessionId, sub: s.workingDir }));
    const chatKnownKeys = new Set(chatItems.map(it => it.key));
    chatIframePool.forEach((_f, key) => {
        if (!chatKnownKeys.has(key)) chatItems.push({ key, label: L('ctrl.tmux.unsentChat', '(New, unsent)'), sub: key.slice(5) });
    });
    const groups: { label: string; items: { key: string; label: string; sub?: string }[] }[] = [
        { label: 'Chat', items: chatItems },
        { label: 'Terminal', items: (lastTermSessions ?? []).map(s => ({ key: sessKey('term', s.remoteId, s.token), label: s.key || s.lastMsg || `(${s.mode})`, sub: s.workingDir || s.token })) },
        { label: 'Browser', items: Array.from(browserSessions.values()).map(s => ({ key: `browser:${s.sessionId}`, label: s.url, sub: s.browserName })) },
        { label: 'RDP', items: [{ key: 'rdp:local', label: 'Local' }, ...rdpRemotes.map(r => ({ key: `rdp:remote:${r.remoteId}`, label: r.entryUrl }))] },
        { label: 'Editor', items: Array.from(editorSessions.values()).map(s => ({ key: s.key, label: s.path.split('/').pop() || s.path, sub: s.path })) },
    ];
    const bodyHtml = groups.map(g => `
        <div class="mb-2">
            <div class="small text-secondary fw-semibold mb-1">${aiEscapeHtml(g.label)}</div>
            ${g.items.length ? g.items.map(it => `<button type="button" class="btn btn-sm btn-outline-secondary d-block w-100 text-start mb-1 tmux-select-item" data-key="${aiEscapeHtml(it.key)}">
                <span class="d-block text-truncate">${aiEscapeHtml(it.label)}</span>
                ${it.sub ? `<span class="d-block text-truncate text-secondary" style="font-size:0.7rem;">${aiEscapeHtml(it.sub)}</span>` : ''}
            </button>`).join('') : `<div class="small text-secondary fst-italic">${L('ctrl.tmux.noSessions', '없음')}</div>`}
        </div>`).join('') +
        `<button type="button" class="btn btn-sm btn-outline-danger w-100 mt-1" id="tmux-select-clear">${L('ctrl.tmux.clearPane', '비우기')}</button>`;

    const modal = new CModal();
    modal.SetHeader(L('ctrl.tmux.select', '콘텐츠 선택'));
    modal.SetBody(bodyHtml);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(420, 480);
    modal.Open(CModal.ePos.Center);
    setTimeout(() => {
        document.querySelectorAll('.tmux-select-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = (btn as HTMLElement).dataset.key!;
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
function tmuxSetPaneContent(paneId: string, key: string | null) {
    const pane = tmuxFind(tmuxRoot, paneId);
    if (!pane || pane.split) return;
    pane.contentKey = key;
    const el = tmuxPaneEls.get(paneId);
    if (el) {
        el.querySelector('.tmux-leaf-content')!.innerHTML = '';
        if (!key) {
            const empty = document.createElement('div');
            empty.className = 'tmux-leaf-empty';
            empty.textContent = L('ctrl.tmux.emptyPane', '설정 모드에서 셀렉트로 콘텐츠를 선택하세요');
            el.querySelector('.tmux-leaf-content')!.appendChild(empty);
        } else {
            tmuxRenderLeafContent(el, key);
        }
    }
    tmuxSaveLayout();
}

tmuxRenderAll();
tmuxApplyMode();

tmuxModeWorkBtn.addEventListener('click', () => { tmuxMode = 'work'; localStorage.setItem(TMUX_MODE_LS_KEY, tmuxMode); tmuxApplyMode(); });
tmuxModeConfigBtn.addEventListener('click', () => { tmuxMode = 'config'; localStorage.setItem(TMUX_MODE_LS_KEY, tmuxMode); tmuxApplyMode(); });
// 종료: 레이아웃/콘텐츠는 그대로 둔 채(localStorage에 이미 저장됨) Tmux 탭에서 나가기만 한다 — 초기 진입 기본 탭인 Help로 전환.
function tmuxClose() {
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('help-panel-tab')).show();
}
CDOM.ID('tmux-close-btn').addEventListener('click', () => tmuxClose());
// 이미 활성화된 Multiplexer 탭을 다시 누르면 종료(Help로 전환)하는 토글.
// Bootstrap 5 위임 클릭은 document capture에서 Tab.show()를 먼저 돌려 active를 붙이므로,
// click 시점에 classList.contains('active')를 보면 "방금 연 것"과 "원래 켜져 있던 것"을 구분할 수 없다.
// 그래서 click보다 앞서는 pointerdown에서 사전 active 여부를 스냅샷 해 두고, click에서 그 값만 본다.
const tmuxTabEl = CDOM.ID('tmux-tab');
let tmuxTabWasActiveOnPointer = false;
tmuxTabEl.addEventListener('pointerdown', () => {
    tmuxTabWasActiveOnPointer = tmuxTabEl.classList.contains('active');
}, true);
tmuxTabEl.addEventListener('click', (e) => {
    if (!tmuxTabWasActiveOnPointer) return;
    e.preventDefault();
    e.stopPropagation();
    tmuxClose();
}, true);

// 최대/최소 토글(드롭다운 안 버튼 하나): 최대=사이드바 숨김+폭 전체(탭 바는 보임, 지금까지의 기본 동작),
// 최소=사이드바가 보이는 일반 센터 레이아웃. body.tmux-fullscreen 클래스 하나로 좌우 사이드바를 숨기고
// .container 폭 제한을 없애던 기존 CSS를 그대로 재사용하되, 이제는 탭에 들어올 때마다 자동으로 켜는 대신
// 저장된 선호 상태를 적용하고 드롭다운에서 즉시 전환할 수 있게 한다.
const tmuxMaximizeBtn = CDOM.ID('tmux-maximize-btn') as HTMLButtonElement;
const TMUX_MAX_LS_KEY = 'ctrl-tmux-maximized-v1';
let tmuxMaximized = localStorage.getItem(TMUX_MAX_LS_KEY) !== '0'; // 기본값: 최대(기존 동작과 동일)
function tmuxApplyMaximize() {
    document.body.classList.toggle('tmux-fullscreen', tmuxMaximized);
    if (tmuxMaximized) {
        // 열려 있던 오버레이 사이드바만 닫는다. 도킹 모드는 CSS display:none 으로 숨기며,
        // 도킹 중인 offcanvas에 hide()를 호출하면 최소 복귀 시 상태 불일치로 히트영역이 꼬일 수 있다.
        if (appSidebar?.classList.contains('show'))
            (window as any).bootstrap.Offcanvas.getOrCreateInstance(appSidebar).hide();
        if (appSidebarRight?.classList.contains('show'))
            (window as any).bootstrap.Offcanvas.getOrCreateInstance(appSidebarRight).hide();
    } else {
        // 최소: 도킹 flex 자리를 다시 잡는다(사이드바 static + 본문 나머지 폭).
        updateSidebarMode();
    }
    // 버튼에는 현재 상태가 아니라 "눌렀을 때 전환될 대상"을 보여준다(종료 항목과 같은 액션형 문구).
    tmuxMaximizeBtn.innerHTML = tmuxMaximized
        ? `<i class="bi bi-fullscreen-exit"></i> <span data-CLan="ctrl.tmux.minimize">최소</span>`
        : `<i class="bi bi-arrows-fullscreen"></i> <span data-CLan="ctrl.tmux.maximize">최대</span>`;
    applyLanIn(tmuxMaximizeBtn);
}
tmuxMaximizeBtn.addEventListener('click', () => {
    tmuxMaximized = !tmuxMaximized;
    localStorage.setItem(TMUX_MAX_LS_KEY, tmuxMaximized ? '1' : '0');
    tmuxApplyMaximize();
});

// Tmux 탭 진입 시 저장된 최대/최소 선호 상태를 적용하고, 나갈 때는 다른 탭에 영향 없도록 항상 원복한다.
CDOM.ID('tmux-tab').addEventListener('shown.bs.tab', () => {
    tmuxApplyMaximize();
});
CDOM.ID('tmux-tab').addEventListener('hidden.bs.tab', () => {
    document.body.classList.remove('tmux-fullscreen');
    updateSidebarMode();
});

// ---- Schedule management (Home.ts의 스케줄러를 이식. 옵션 패널의 Schedule 제목 옆
// New 버튼(#sched-new-btn) → schedOpenModal()로 생성/편집한다) ----
const schedSessionList = CDOM.ID("schedSessionList");

type SchedulerOption = { delay?: number; count?: number; start?: number; end?: number; days?: number[]; hour?: number; minute?: number; autoEnd?: boolean };
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
                <button class="sched-del-btn btn btn-sm btn-link text-danger p-0" title="${L('ctrl.delete', 'Delete')}"><i class="bi bi-trash"></i></button>
            `;
            item.addEventListener('click', () => schedOpenModal(s));
            item.querySelector('.sched-del-btn')!.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                const dlg = new CConfirm();
                dlg.SetBody(LF('ctrl.msg.deleteSchedule', 'Delete schedule "{0}"?', aiEscapeHtml(s.name)));
                dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
                    async () => {
                        await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-del?name=${encodeURIComponent(s.name)}`);
                        schedRefresh();
                    },
                    () => {},
                ], [L('ctrl.delete', 'Delete'), L('ctrl.cancel', 'Cancel')]);
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
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.schedName', 'Name (schedule key)')}</label>
            <input id="sched-name" type="text" class="form-control form-control-sm" placeholder="e.g. daily-backup" autocomplete="off" value="${aiEscapeHtml(existing?.name || '')}">
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.subAgent', 'Sub Agent')}</label>
            <select id="sched-agent" class="form-select form-select-sm">
                ${agents.map(a => `<option value="${aiEscapeHtml(a.key)}" ${existing?.subAgentKey === a.key ? 'selected' : ''}>${aiEscapeHtml(a.key)}</option>`).join('') || `<option value="">${L('ctrl.msg.noSubAgents', '(No sub agents registered)')}</option>`}
            </select>
        </div>
        <div class="mb-2">
            <div class="d-flex gap-1 mb-2">
                <button id="sched-tab-interval" type="button" class="btn btn-sm flex-fill ${existing?.mode!=='time' ? 'btn-primary' : 'btn-outline-secondary'}">${L('ctrl.lbl.interval', 'Interval')}</button>
                <button id="sched-tab-time"     type="button" class="btn btn-sm flex-fill ${existing?.mode==='time'  ? 'btn-primary' : 'btn-outline-secondary'}">${L('ctrl.lbl.time', 'Time')}</button>
            </div>
            <div id="sched-panel-interval" style="display:${existing?.mode!=='time' ? '' : 'none'}">
                <div class="d-flex gap-2 mb-2">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.delaySec', 'Delay (sec)')}</label>
                        <input id="sched-delay" type="number" min="1" class="form-control form-control-sm" placeholder="e.g. 60" value="${existing?.option.delay ?? 60}">
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.countInf', 'Count (0=infinite)')}</label>
                        <input id="sched-count" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.option.count ?? 0}">
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.startOffset', 'Start offset (sec, 0=now)')}</label>
                        <input id="sched-start" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.option.start ?? 0}">
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.endOffset', 'End offset (sec, 0=never)')}</label>
                        <input id="sched-end" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.option.end ?? 0}">
                    </div>
                </div>
                <div class="form-check mt-2">
                    <input id="sched-autoend-interval" type="checkbox" class="form-check-input" ${(existing?.option.autoEnd ?? true) ? 'checked' : ''}>
                    <label for="sched-autoend-interval" class="form-check-label small text-secondary">${L('ctrl.lbl.autoEndInterval', 'Auto-delete when count is exhausted')}</label>
                </div>
            </div>
            <div id="sched-panel-time" style="display:${existing?.mode==='time' ? '' : 'none'}">
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.daysOfWeek', 'Days of Week')}</label>
                    <div class="d-flex gap-1 flex-wrap">
                        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((lbl,i) => `<button type="button" class="sched-day-btn btn btn-sm ${(existing?.option.days ?? []).includes(i) ? 'btn-primary' : 'btn-outline-secondary'}" data-day="${i}">${lbl}</button>`).join('')}
                    </div>
                </div>
                <div class="d-flex gap-2 align-items-end">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.hour', 'Hour (0–23)')}</label>
                        <select id="sched-hour" class="form-select form-select-sm">
                            ${Array.from({length:24},(_,h)=>`<option value="${h}" ${(existing?.option.hour??9)===h?'selected':''}>${String(h).padStart(2,'0')}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.minute', 'Minute')}</label>
                        <select id="sched-minute" class="form-select form-select-sm">
                            ${Array.from({length:12},(_,i)=>i*5).map(m=>`<option value="${m}" ${(existing?.option.minute??0)===m?'selected':''}>${String(m).padStart(2,'0')}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-check mt-2">
                    <input id="sched-autoend-time" type="checkbox" class="form-check-input" ${(existing?.option.autoEnd ?? false) ? 'checked' : ''}>
                    <label for="sched-autoend-time" class="form-check-label small text-secondary">${L('ctrl.lbl.autoEndTime', 'Run once then delete')}</label>
                </div>
            </div>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.command', 'Command')}</label>
            <textarea id="sched-cmd" class="form-control form-control-sm" rows="3" placeholder="e.g. node backup.js">${aiEscapeHtml(existing?.command || '')}</textarea>
        </div>
        <div class="d-flex justify-content-between">
            <button id="sched-modal-save" class="btn btn-primary">${isEdit ? L('ctrl.save', 'Save') : L('ctrl.create', 'Create')}</button>
            <button id="sched-modal-cancel" class="btn btn-danger ms-2">${L('ctrl.cancel', 'Cancel')}</button>
        </div>`;

    const modal = new CModal();
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader(isEdit ? L('ctrl.hdr.editSchedule', 'Edit Schedule') : L('ctrl.hdr.newSchedule', 'New Schedule'));
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
            if (!name || !subAgentKey || !command) { CAlert.E(L('ctrl.msg.nameAgentCmdRequired', 'Name, sub agent, and command are required')); return; }

            const option: SchedulerOption = {};
            if (isTimeMode) {
                const selectedDays = Array.from(dayBtns).filter(b => b.classList.contains('btn-primary')).map(b => Number(b.dataset.day));
                if (selectedDays.length === 0) { CAlert.E(L('ctrl.msg.selectOneDay', 'Select at least one day')); return; }
                option.days = selectedDays;
                option.hour = parseInt((container.querySelector<HTMLSelectElement>('#sched-hour')!).value) || 0;
                option.minute = parseInt((container.querySelector<HTMLSelectElement>('#sched-minute')!).value) || 0;
                option.autoEnd = (container.querySelector<HTMLInputElement>('#sched-autoend-time')!).checked;
            } else {
                const delay = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-delay')!).value) || 0);
                if (delay === 0) { CAlert.E(L('ctrl.msg.delayMin1', 'Delay must be at least 1 second')); return; }
                option.delay = delay;
                option.count = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-count')!).value) || 0);
                option.start = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-start')!).value) || 0);
                option.end   = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-end')!).value) || 0);
                option.autoEnd = (container.querySelector<HTMLInputElement>('#sched-autoend-interval')!).checked;
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
type AgentPermRule = { type?: string; tool?: string; command?: string };
type AgentPermissions = { allow: AgentPermRule[]; deny: AgentPermRule[] };
type SubAgentData = { key: string; provider: string; model: string; score: number; traits: string[]; workingDir: string; super: number; retryText: string; retryCount: number; permissions?: AgentPermissions };

// 권한 규칙 ↔ 한 줄 텍스트 상호 변환(설정 UI용).
// 형식: 한 줄에 규칙 하나. `type:write` `tool:Edit` `cmd:<나머지 전부>` 토큰을 조합한다.
//   - 접두사 없이 그냥 명령을 적으면 그 줄 전체가 command 규칙이 된다(가장 흔한 경우).
//   예) `node *ai/tool/tsc_check`  ·  `type:read`  ·  `tool:Bash cmd:git log`
function agentRuleToLine(r: AgentPermRule): string {
    const parts: string[] = [];
    if (r.type) parts.push(`type:${r.type}`);
    if (r.tool) parts.push(`tool:${r.tool}`);
    if (r.command) parts.push(`cmd:${r.command}`);
    return parts.join(' ');
}
function agentRulesToText(rules: AgentPermRule[] | undefined): string {
    return (rules ?? []).map(agentRuleToLine).filter(s => s.length > 0).join('\n');
}
function agentTextToRules(text: string): AgentPermRule[] {
    const out: AgentPermRule[] = [];
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        const rule: AgentPermRule = {};
        let head = line;
        const ci = line.indexOf('cmd:');
        if (ci >= 0) { rule.command = line.slice(ci + 4).trim(); head = line.slice(0, ci).trim(); }
        let sawPrefix = false;
        for (const tok of head.split(/\s+/)) {
            if (!tok) continue;
            if (tok.startsWith('type:')) { rule.type = tok.slice(5); sawPrefix = true; }
            else if (tok.startsWith('tool:')) { rule.tool = tok.slice(5); sawPrefix = true; }
        }
        // 접두사가 하나도 없고 cmd:도 없었다면 → 줄 전체가 command.
        if (!sawPrefix && ci < 0) rule.command = head;
        if (rule.type || rule.tool || rule.command) out.push(rule);
    }
    return out;
}

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
                <button class="agent-del-btn btn btn-sm btn-link text-danger p-0" title="${L('ctrl.delete', 'Delete')}"><i class="bi bi-trash"></i></button>
            `;
            item.addEventListener('click', () => agentOpenModal(a));
            item.querySelector('.agent-del-btn')!.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                const dlg = new CConfirm();
                dlg.SetBody(LF('ctrl.msg.deleteSubAgent', 'Delete sub agent "{0}"?', aiEscapeHtml(a.key)));
                dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
                    async () => {
                        await authedFetch(`${CPath.WebRootUrl()}cmd/agent-del?key=${encodeURIComponent(a.key)}`);
                        agentRefresh();
                    },
                    () => {},
                ], [L('ctrl.delete', 'Delete'), L('ctrl.cancel', 'Cancel')]);
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
// 모달을 열 때마다 다시 부르지 않도록 서버(remoteId)별로 최초 1회만 조회해 캐시한다(진행 중인 요청은 공유해 중복 호출 방지).
// New Terminal은 원격 서버에도 열 수 있으므로 그 서버의 ai/settings.json 모델 목록을 각각 받아온다.
// 마지막 선택 provider/model은 Chat·Memo와 동일 키로 CStorage에 공유한다.
type AgentModelMap = Record<string, { value: string; label: string }[]>;
const AGENT_PROVIDER_IDS: string[] = ['claude', 'codex', 'antigravity', 'opencode', 'grok'];
const AGENT_PROVIDER_LABELS: Record<string, string> = { claude: 'Claude', codex: 'Codex', antigravity: 'Antigravity', opencode: 'OpenCode', grok: 'Grok' };
const LS_PROVIDER = 'ai.provider';
const LS_MODEL = 'ai.model';
function getLastProvider(): string | null {
    const v = CStorage.Get(LS_PROVIDER) as string | null;
    return v || null;
}
function getLastModel(): string | null {
    const v = CStorage.Get(LS_MODEL) as string | null;
    return v || null;
}
/** cmd는 모델이 없으므로 model 저장을 건너뛴다(이전 AI 모델 기억 보존). */
function saveLastProviderModel(provider: string, model: string = ''): void {
    if (!provider) return;
    CStorage.Set(LS_PROVIDER, provider);
    if (provider !== 'cmd' && model) CStorage.Set(LS_MODEL, model);
}

const gAgentModelsCache = new Map<string, AgentModelMap>();
const gAgentModelsFetching = new Map<string, Promise<AgentModelMap>>();
async function agentFetchModels(remoteId: string = ''): Promise<AgentModelMap> {
    const cached = gAgentModelsCache.get(remoteId);
    if (cached) return cached;
    const inFlight = gAgentModelsFetching.get(remoteId);
    if (inFlight) return inFlight;
    const p = (async () => {
        try {
            // 로컬은 기존과 동일하게 same-origin 요청, 원격은 authToken이 붙은 ctx URL로 조회한다.
            const ctx = serverCtxOf(remoteId);
            const r = ctx && remoteId ? await ctxFetch(ctx, 'AIInfo/setting') : await authedFetch(CPath.WebRootUrl() + 'AIInfo/setting');
            const setting = await r.json();
            const models: AgentModelMap = setting.models || {};
            gAgentModelsCache.set(remoteId, models);
            return models;
        } catch (e) {
            console.error('agentFetchModels error:', e);
            return {};
        } finally {
            gAgentModelsFetching.delete(remoteId);
        }
    })();
    gAgentModelsFetching.set(remoteId, p);
    return p;
}

async function agentOpenModal(existing?: SubAgentData) {
    const isEdit = !!existing;
    const modelMap = await agentFetchModels();

    const modelsFor = (providerId: string): { value: string; label: string }[] => modelMap[providerId] ?? [];

    // 기본값: 편집이면 에이전트 저장값, 신규면 CStorage 마지막 사용 provider/model(없으면 첫 provider/첫 model).
    const lastProvider = getLastProvider();
    const lastModel = getLastModel() || '';
    const defaultProvider = existing?.provider
        || (lastProvider && AGENT_PROVIDER_IDS.includes(lastProvider) ? lastProvider : AGENT_PROVIDER_IDS[0]);
    const modelsOfDefault = modelsFor(defaultProvider);
    const defaultModel = existing?.model
        || (lastModel && modelsOfDefault.some(m => m.value === lastModel) ? lastModel : '')
        || modelsOfDefault[0]?.value || '';

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
    // 필드가 많아(Key/Provider/Model/Traits/Options) auto 크기면 너무 작게 잡힌다. SetSize는 뷰포트보다
    // 크면 자동으로 줄어드므로(CModal.SetSize) 모바일에서도 고정폭 그대로 안전하다.
    modal.SetSize(560, 600);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const keyInput = container.querySelector<HTMLInputElement>('#agent-key')!;
        const providerSelect = container.querySelector<HTMLSelectElement>('#agent-provider')!;
        const modelSelect = container.querySelector<HTMLSelectElement>('#agent-model')!;
        keyInput.focus();

        // provider를 바꾸면 그 provider의 모델 목록으로 model 셀렉트를 다시 채운다(마지막 모델 후보 → 없으면 첫 모델).
        providerSelect.addEventListener('change', () => {
            const prefer = getLastModel() || '';
            modelSelect.innerHTML = buildModelOptions(providerSelect.value, prefer);
        });

        const doSave = async () => {
            const key = keyInput.value.trim();
            if (!key) { CAlert.E(L('ctrl.msg.keyRequired', 'Key is required')); return; }
            const workingDir = (container.querySelector<HTMLInputElement>('#agent-working-dir')!).value.trim() || './';
            const superChecked = (container.querySelector<HTMLInputElement>('#agent-super')!).checked;
            const permissions: AgentPermissions = {
                allow: agentTextToRules((container.querySelector<HTMLTextAreaElement>('#agent-perm-allow')!).value),
                deny:  agentTextToRules((container.querySelector<HTMLTextAreaElement>('#agent-perm-deny')!).value),
            };
            saveLastProviderModel(providerSelect.value, modelSelect.value);
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
                permissions: JSON.stringify(permissions),
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
    // Chat/Terminal/SubAgent와 동일한 CStorage 마지막 선택을 기본값으로 쓴다.
    const lastProvider = getLastProvider();
    const lastModel = getLastModel() || '';
    const defaultProvider = (lastProvider && AGENT_PROVIDER_IDS.includes(lastProvider)) ? lastProvider : AGENT_PROVIDER_IDS[0];
    const modelsOfDefault = modelsFor(defaultProvider);
    const defaultModel = (lastModel && modelsOfDefault.some(m => m.value === lastModel) ? lastModel : '') || modelsOfDefault[0]?.value || '';
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
            <select id="team-model" class="form-select form-select-sm">${buildModelOptions(defaultProvider, defaultModel)}</select>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Goal</label>
            <textarea id="team-goal" class="form-control form-control-sm" rows="3" placeholder="e.g. Analyze the text files in the xx folder and summarize them into an md file"></textarea>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Sub Agents</label>
            <div id="team-agents" class="border rounded p-2" style="max-height:140px;overflow-y:auto;">
                ${agents.length === 0
                    ? `<div class="text-secondary small">${L('ctrl.msg.noSubAgentsHint', 'No sub agents registered. Register one first in the right sidebar → Sub Agent.')}</div>`
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
        const providerSelect = container.querySelector<HTMLSelectElement>('#team-provider')!;
        const modelSelect    = container.querySelector<HTMLSelectElement>('#team-model')!;
        const goalInput      = container.querySelector<HTMLTextAreaElement>('#team-goal')!;
        const createBtn      = container.querySelector<HTMLButtonElement>('#team-modal-create')!;
        const cancelBtn      = container.querySelector<HTMLButtonElement>('#team-modal-cancel')!;
        goalInput.focus();

        providerSelect.addEventListener('change', () => {
            const prefer = getLastModel() || '';
            modelSelect.innerHTML = buildModelOptions(providerSelect.value, prefer);
        });

        let creating = false;
        const doCreate = async () => {
            if (creating) return;
            const goal = goalInput.value.trim();
            if (!goal) { CAlert.E(L('ctrl.msg.enterGoal', 'Enter a goal')); return; }
            const subAgents = Array.from(container.querySelectorAll<HTMLInputElement>('.team-agent-check'))
                .filter(c => c.checked).map(c => c.value);
            if (subAgents.length === 0) { CAlert.E(L('ctrl.msg.selectOneSubAgent', 'Select at least one sub agent')); return; }

            creating = true;
            createBtn.disabled = true; cancelBtn.disabled = true;
            const origHtml = createBtn.innerHTML;
            createBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${L('ctrl.creating', 'Creating...')}`;
            try {
                // 팀키 생성·감독 지시문 조립·워크오더 발주는 전부 서버(onStartTeam)가 한다.
                saveLastProviderModel(providerSelect.value, modelSelect.value);
                const params = new URLSearchParams({
                    provider: providerSelect.value,
                    model: modelSelect.value,
                    goal,
                    subAgents: subAgents.join(','),
                    limitMin: String(Number((container.querySelector<HTMLInputElement>('#team-limit-min')!).value) || 0),
                });
                const r = await authedFetch(`${CPath.WebRootUrl()}cmd/start-team?${params.toString()}`);
                const j = await r.json();
                if (!j.ok) { CAlert.E(j.msg || L('ctrl.msg.failedStartTeam', 'Failed to start team')); return; }
                modal.Close();
                // New Terminal과 동일 — 메인 터미널을 Terminal 패널에 띄운다.
                termActivatePane();
                showTermFrame(`term-new:${j.token}:${Date.now()}`, `${CPath.WebRootUrl()}cmd/terminal-proxy?token=${j.token}`);
                termRenderList();
                setTimeout(termRenderList, 1500);
                setTimeout(termRenderList, 4000);
            } catch (e) {
                console.error('[Team] start-team error:', e);
                CAlert.E(L('ctrl.msg.failedStartTeam', 'Failed to start team'));
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

// ============================================================
// 다운로드(Download) 탭은 Downloads/DownloadTab.ts가 import되는 시점에
// 자기 자신을 More 메뉴 + 탭 패널로 등록하고 마운트까지 처리한다(registerDownloadTab()).
// 여기서는 더 이상 할 일이 없다. import를 빼면 탭 자체가 사라진다.
// ============================================================

// ============================================================
// ↓↓↓ 메신저(Messenger) 탭 관련 소스 ↓↓↓
// ============================================================

let messengerInited = false;
CDOM.ID('messenger-tab').addEventListener('shown.bs.tab', () => {
    if (messengerInited) return;
    messengerInited = true;
    MountMessengerTab('messenger-root', ctrlRequireAuthed);
});
if (CDOM.ID('messenger-panel').classList.contains('active')) {
    messengerInited = true;
    MountMessengerTab('messenger-root', ctrlRequireAuthed);
}

// ============================================================
// ↑↑↑ 메신저(Messenger) 탭 관련 소스 끝 ↑↑↑
// ============================================================








































