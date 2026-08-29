//Version
import "../../artgine/artgine.js"

//Class
import {CClass} from "../../artgine/basic/CClass.js";
import { MountMessengerTab } from "./Messenger/MessengerTab.js";
CClass.Push(MountMessengerTab);
import { MountScheduleTab } from "./Schedule/ScheduleTab.js";
CClass.Push(MountScheduleTab);
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
gPF.mCanvas = "";
gPF.mServer = 'webServer';
gPF.mGitHub = false;
gPF.mVersion = "mschkcx4_2";

import {CAtelier} from "../../artgine/app/CAtelier.js";

import {CPlugin} from "../../artgine/util/CPlugin.js";
CPlugin.PushPath('ControlMedia','../../plugin/ControlMedia/');
import "../../plugin/ControlMedia/ControlMediaClient.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
// 탭 골격만 구성된 단계. 각 탭(RDP/터미널/브라우저/파일/메모/다운로드)의 기능 연결은 다음 단계에서 진행.
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
// 터미널 세션 중 카탈로그(set-agent)에 등록된 서브 에이전트이면서 그 에이전트의 hidden 플래그가 켜진
// 항목만 좌측 Agent 목록에서 뺀다(과거엔 key 유무만 봐서 팀장 세션까지 같이 숨겨졌었다).
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
        await ensureLocalAuth();
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
interface IProviderStateResp { node: INodeState; providers: IProviderStateEntry[]; all?: string[]; }
interface IServerInfoResp {
    ok: boolean;
    cpu: { percent: number; cores: number };
    memory: { totalBytes: number; usedBytes: number; percent: number };
}

// 서버(소스)별로 숨긴(= 안 쓰는) 프로바이더 id 집합. 소스 키는 ''(로컬) 또는 remoteId.
// 숨긴 것은 화면에서 빼는 데서 끝나지 않고 provider-state 요청의 providers 쿼리에서도 빠져,
// 그 서버가 해당 프로바이더 CLI를 아예 실행하지 않는다(그만큼 빨라짐).
// 한 소스의 프로바이더를 전부 숨기면 그 소스 섹션 자체가 안 보인다 — 로컬/원격을 보이거나 숨기는
// 것과 프로바이더를 고르는 것이 옵션 모달에서 서버별로 중첩된 체크박스 하나로 합쳐진다.
const AI_PROVIDER_HIDDEN_BY_SRC_LS = 'ctrl.aiProviderHiddenBySrc';
const AI_PROVIDER_HIDDEN_LS_LEGACY = 'ctrl.aiProviderHidden'; // 구버전(서버 구분 없는 전역 숨김 목록) 마이그레이션용.
let aiProviderHiddenBySrc: Map<string, Set<string>> = (() => {
    try {
        const raw = localStorage.getItem(AI_PROVIDER_HIDDEN_BY_SRC_LS);
        if (raw != null) {
            const obj = JSON.parse(raw) as Record<string, string[]>;
            return new Map(Object.entries(obj).map(([k, v]) => [k, new Set(v)]));
        }
    } catch { /* fall through to legacy */ }
    try {
        const legacy = localStorage.getItem(AI_PROVIDER_HIDDEN_LS_LEGACY);
        if (legacy) return new Map([['', new Set<string>(JSON.parse(legacy))]]);
    } catch { /* ignore */ }
    return new Map();
})();
// 명시적으로 설정한 적 없는 소스는 기본으로 전부 보인다(빈 숨김 집합).
function aiProviderHiddenSet(sourceKey: string): Set<string> {
    return aiProviderHiddenBySrc.get(sourceKey) ?? new Set<string>();
}
function aiProviderSaveHidden() {
    const obj: Record<string, string[]> = {};
    for (const [k, v] of aiProviderHiddenBySrc) obj[k] = [...v];
    localStorage.setItem(AI_PROVIDER_HIDDEN_BY_SRC_LS, JSON.stringify(obj));
}
function aiProviderSetHidden(sourceKey: string, providerId: string, hide: boolean) {
    let set = aiProviderHiddenBySrc.get(sourceKey);
    if (!set) { set = new Set<string>(); aiProviderHiddenBySrc.set(sourceKey, set); }
    if (hide) set.add(providerId); else set.delete(providerId);
    aiProviderSaveHidden();
}
// Node.js 행은 실제 프로바이더가 아니라 aiProviderAll에 안 들어있다 — 같은 숨김 집합에 이 가짜 id로
// 넣어 서버별로 독립 토글되게 한다(providers= 쿼리에는 안 실린다, aiProviderAll에 없으므로).
const AI_PROVIDER_NODE_KEY = '__node__';
// 서버 CPU/RAM/네트워크 카드도 Node.js 행과 같은 방식으로 서버별 독립 숨김 토글을 지원한다.
const AI_PROVIDER_SERVER_KEY = '__server__';
// 서버가 아는 전체 프로바이더 목록(응답의 all로 매번 갱신된다). 첫 조회 전/구버전 서버 대비 기본값.
let aiProviderAll: string[] = ['claude', 'codex', 'antigravity', 'opencode', 'grok'];

// Memo 탭이 어느 서버의 /Memo/*를 써야 하는지 판단하는 단일 출처(RDP가 원격을 전환할 때마다 갱신).
// '' = 로컬. 인증은 여기서 미리 하지 않고, Memo 탭이 열릴 때 memoSendRemoteInfo()가 필요하면 그때 확인/요청한다.
// (원래는 RDP 상태 섹션 근처에 있었지만, Provider Status가 페이지 로드와 동시에 이 값을 읽으므로
// let의 TDZ를 피하기 위해 그보다 앞에 선언한다.)
let currentWebRootUrl = '';

// Provider Status에 알려진 전체 서버 목록(로컬 + 저장된 원격 전부). 실제로 그릴지는 소스별 숨김
// 집합(aiProviderHiddenSet)에 안 가려진 프로바이더가 하나라도 있는지로 loadAiProviderStatus에서 정한다.
function aiProviderAllSources(): { remoteId: string; baseUrl: string; label: string }[] {
    return [
        { remoteId: '', baseUrl: CPath.WebRootUrl(), label: L('ctrl.local', 'Local') },
        ...rdpRemotes.map(r => ({ remoteId: r.remoteId, baseUrl: rdpRemoteWebRootUrl(r.entryUrl), label: r.entryUrl })),
    ];
}

async function loadAiProviderStatus() {
    const el = document.getElementById('aiProviderStatus');
    if (!el) return;
    const btn = document.getElementById('aiProviderRefreshBtn') as HTMLButtonElement | null;
    const icon = btn?.querySelector('i');
    if (btn) btn.disabled = true;
    icon?.classList.add('spin');
    // Node.js/서버상태 행도 프로바이더도 전부 숨겨진 소스는 조회 자체를 건너뛴다(그 서버 CLI를 아예 안 돌림).
    const sources = aiProviderAllSources().filter(s => {
        const hidden = aiProviderHiddenSet(s.remoteId);
        return !hidden.has(AI_PROVIDER_NODE_KEY) || !hidden.has(AI_PROVIDER_SERVER_KEY) || aiProviderAll.some(p => !hidden.has(p));
    });
    try {
        // provider-state/server-info는 인증 불필요 엔드포인트라(onProviderState/onServerInfo 주석) cross-origin이어도
        // 토큰 없이 조회 가능 — 보이는 서버 전부를 병렬로 조회한다. server-info는 숨겨진 소스라면 건너뛴다(호출 자체가
        // CPU/네트워크 샘플링으로 200ms+ 걸리는 조회라, 안 보일 때까지 매번 돌릴 필요가 없다).
        const results = await Promise.all(sources.map(async s => {
            const hidden = aiProviderHiddenSet(s.remoteId);
            const visible = aiProviderAll.filter(p => !hidden.has(p));
            const query = hidden.size ? `?providers=${encodeURIComponent(visible.join(','))}` : '';
            const wantServer = !hidden.has(AI_PROVIDER_SERVER_KEY);
            try {
                const [r, serverResp] = await Promise.all([
                    fetch(s.baseUrl + 'AIInfo/provider-state' + query),
                    wantServer
                        ? fetch(s.baseUrl + 'AIInfo/server-info').then(r2 => r2.json() as Promise<IServerInfoResp>).catch(() => null)
                        : Promise.resolve(null),
                ]);
                return { s, resp: await r.json() as IProviderStateResp, server: serverResp, ok: true as const };
            } catch (e) {
                console.error('provider-state error:', s.baseUrl, e);
                return { s, resp: null, server: null, ok: false as const };
            }
        }));
        el.innerHTML = results.map(({ s, resp, server, ok }) => {
            if (!ok || !resp) {
                return `<div class="rounded px-2 py-1 bg-secondary-subtle" style="font-size:0.8rem;">
                    <span class="fw-semibold ${s.remoteId ? rdpTextColor(s.remoteId) : 'text-primary'}">${aiEscapeHtml(s.label)}</span>
                    <span class="text-secondary ms-1">${L('ctrl.msg.providerStateError', 'unreachable')}</span>
                </div>`;
            }
            if (resp.all?.length) aiProviderAll = resp.all;
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
                // usage 뱃지와 같은 규칙(빨강<=20%<=주황<=50%<초록)을 쓰되, 사용률은 "높을수록 위험"이라
                // 남은 비율 기준인 usageColorHtml과 반대 방향(threshold 넘을수록 진해짐)으로 별도 계산한다.
                const loadColorHtml = (v: number, text: string) =>
                    v >= 80 ? `<span class="fw-semibold text-danger">${text}</span>`
                    : v >= 50 ? `<span class="fw-semibold" style="color:#fd7e14;">${text}</span>`
                    : `<span class="fw-semibold text-success">${text}</span>`;
                const loadBadge = (label: string, v: number) => `<span class="text-secondary">${label}</span> ${loadColorHtml(v, v + '%')}`;
                serverRow = `<div class="d-flex align-items-center gap-2 rounded px-2 py-1 bg-body-secondary" style="font-size:0.75em;">${loadBadge('CPU', server.cpu.percent)}<span class="text-secondary">·</span>${loadBadge('RAM', server.memory.percent)}</div>`;
            }
            const providerRows = providers.map(p => {
                const rowClass = !p.installed ? 'bg-secondary-subtle' : p.authenticated ? 'bg-success-subtle' : 'bg-warning-subtle';
                const pIcon = !p.installed ? 'bi-x-circle text-secondary' : p.authenticated ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle-fill text-warning';
                const status = !p.installed ? 'Not Installed' : p.authenticated ? 'Ready' : 'Not Authenticated';
                const statusHtml = !p.installed
                    ? `<button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 ai-provider-launch-btn" data-provider="${p.id}" data-remote="${aiEscapeHtml(s.remoteId)}"><i class="bi ${pIcon}"></i>${status}</button>`
                    : p.authenticated ? '' : `<span class="d-flex align-items-center gap-1"><i class="bi ${pIcon}"></i>${status}</span>`;
                // usage.fiveHour/weekly: 0~1 남은 비율, -1이면 조회 실패/미지원.
                // 한쪽만 지원하는 프로바이더(예: antigravity 신형 = weekly만)는 미지원 버킷을 ?로 넣지 않고 생략한다.
                // 둘 다 -1일 때만 조회 실패로 `?`를 보여 준다.
                // 라벨(5h/7d)은 옅게, 남은 비율 숫자는 진하게+구간별 색(빨강<=20%<=주황<=50%<초록)을 줘서
                // "5h 7% 7d 12%"처럼 붙어 있어도 라벨과 숫자, 두 구간이 한눈에 갈린다.
                // 중간 구간은 bootstrap text-warning(노랑)이 배경/초록과 대비가 약해 안 보이길래
                // 더 진한 주황(#fd7e14, bootstrap --bs-orange)을 인라인으로 직접 준다.
                const pct = (v: number) => Math.round(v * 100);
                const usageColorHtml = (v: number, text: string) =>
                    v <= 20 ? `<span class="fw-semibold text-danger">${text}</span>`
                    : v <= 50 ? `<span class="fw-semibold" style="color:#fd7e14;">${text}</span>`
                    : `<span class="fw-semibold text-success">${text}</span>`;
                const usageBadge = (label: string, v: number | null) =>
                    `<span class="text-secondary">${label}</span> ${v == null ? '<span class="fw-semibold text-secondary">?</span>' : usageColorHtml(v, v + '%')}`;
                const usageParts: string[] = [];
                const showUsage = p.authenticated && p.usage;
                if (showUsage) {
                    const fh = p.usage!.fiveHour;
                    const wk = p.usage!.weekly;
                    if (fh >= 0) usageParts.push(usageBadge('5h', pct(fh)));
                    if (wk >= 0) usageParts.push(usageBadge('7d', pct(wk)));
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
            // 소스가 여럿일 때만 헤더(로컬/원격 주소, 색으로 구분)를 보여준다 — 하나뿐이면 예전처럼 바로 목록만.
            const header = sources.length > 1
                ? `<div class="small fw-semibold text-truncate ${s.remoteId ? rdpTextColor(s.remoteId) : 'text-primary'}" style="font-size:0.72rem;" title="${aiEscapeHtml(s.baseUrl)}">${aiEscapeHtml(s.label)}</div>`
                : '';
            return `<div class="ai-provider-source d-flex flex-column gap-1 mb-1">${header}${serverRow}${nodeRow}${providerRows}</div>`;
        }).join('');
        el.querySelectorAll<HTMLButtonElement>('.ai-node-download-btn').forEach(b => {
            b.addEventListener('click', () => window.open('https://nodejs.org/en/download', '_blank'));
        });
        el.querySelectorAll<HTMLButtonElement>('.ai-provider-launch-btn').forEach(b => {
            // 이 항목이 속한 소스(로컬/원격)에서 터미널을 띄운다.
            b.addEventListener('click', () => termStartNew(b.dataset.provider as Parameters<typeof termStartNew>[0], undefined, b.dataset.remote || ''));
        });
        const timeEl = document.getElementById('aiProviderStatusTime');
        if (timeEl) {
            const now = new Date();
            const pad2 = (n: number) => String(n).padStart(2, '0');
            timeEl.textContent = `(${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())})`;
        }
    } catch (e) { console.error('provider-state error:', e); }
    finally {
        if (btn) btn.disabled = false;
        icon?.classList.remove('spin');
    }
}
// aiProviderAllSources()가 참조하는 rdpRemotes(let)는 이 지점보다 아래에서 선언되므로, 같은 모듈 안에서
// 지금 바로 호출하면 TDZ로 죽는다. 한 틱 미뤄 전체 모듈 평가가 끝난 뒤 돌게 한다.
setTimeout(() => loadAiProviderStatus(), 0);
setInterval(() => loadAiProviderStatus(), 5 * 60 * 1000);
document.getElementById('aiProviderRefreshBtn')?.addEventListener('click', () => loadAiProviderStatus());
document.getElementById('aiProviderSettingBtn')?.addEventListener('click', () => showProviderVisibilityModal());

// Provider Status 설정 모달: 서버(로컬/원격)별로 그룹을 나누고 그 아래 프로바이더 체크박스를 중첩해서 보여준다
// (로컬/원격을 보이거나 숨기는 것과 프로바이더를 고르는 것이 서버별 체크박스 하나로 합쳐진다 — 어떤 서버 아래
// 프로바이더를 하나도 안 켜면 그 서버 섹션 자체가 목록에서 빠지고 조회도 건너뛴다).
// 선택은 localStorage(AI_PROVIDER_HIDDEN_BY_SRC_LS)에 이 브라우저 기준으로 남는다.
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
        document.querySelectorAll<HTMLInputElement>(`.${uid}_chk`).forEach(chk => {
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

// 사이드바 강조는 Multiplexer에 떠 있는 세션을 그대로 보여 준다(메인 pane=빨강, 서브 pane=파랑,
// 여러 개 동시). 이전처럼 그룹별로 하나만 켜지 않는다. RDP 목록과 Chat/Terminal/Browser/Editor
// 통합 목록 모두 tmuxPaneRole() 기준.
function isPanelShown(panelId: string): boolean {
    return CDOM.ID(panelId).classList.contains('active');
}

// ---- 사이드바 세션 아이템 공용 빌더(Local/Remote가 동일한 골격·드롭다운·핸들러를 공유) ----
interface SessionItemSpec {
    activeClass: string;
    isActive: boolean;
    /** activeClass가 -remote 계열일 때 원격지별 강조색(--rdp-accent/-bg)을 싣는 인라인 스타일. rdpAccentStyle() 참고. */
    accentStyle?: string;
    dataAttr: { name: string; value: string };
    /** 상단 탭 스트립(topTabStrip)의 짧은 한 줄 라벨. bodyHtml은 여러 줄이라 그대로 쓸 수 없어 별도로 둔다. */
    shortLabel: string;
    leftHtml: string;
    bodyHtml: string;
    deleteAct: string;
    deleteLabel: string;
    onClick: () => void;
    /** 없으면 Share Link 메뉴 숨김 (Chat 등 공유 미지원 세션) */
    onShare?: () => void;
    onDelete: () => void;
    popup: { url: () => string; title: string; winName: string };
}
// 항목 노드는 만들어진 뒤에도 재사용되므로(renderSessionSidebar의 재조정), 리스너가 생성 시점의 spec을
// 클로저로 붙잡으면 데이터가 굳어버린다(예: 브라우저 세션의 url이 바뀌어도 Share Link는 옛 url을 낸다).
// 그래서 최신 spec을 노드에 얹어두고(_spec) 리스너는 항상 그걸 통해 디스패치한다.
interface SessionItemEl extends HTMLDivElement { _spec: SessionItemSpec; _left?: string; _body?: string; }

// 세션 아이템을 Multiplexer pane에 드래그해 놓을 때 쓸 tmux 콘텐츠 키. Chat/Terminal/Browser/Editor는
// dataAttr가 이미 그 형식 그대로(name:'key')라 값을 그대로 쓰고, RDP 원격 항목만 dataAttr가
// name:'id'(remoteId)라 'rdp:remote:' 접두사를 붙여 변환한다. 그 외(알 수 없는 형식)는 드래그 불가.
function sessionItemDragKey(spec: SessionItemSpec): string | null {
    if (spec.dataAttr.name === 'key') return spec.dataAttr.value;
    if (spec.dataAttr.name === 'id') return `rdp:remote:${spec.dataAttr.value}`;
    return null;
}
// 세션 아이템을 끄는 동안만 body.tmux-dragging을 켜서 Multiplexer pane들의 드롭존(.tmux-leaf-dropzone)이
// 나타나게 한다(평소엔 숨겨서 iframe 조작을 방해하지 않는다).
document.addEventListener('dragstart', (e: DragEvent) => {
    if ((e.target as HTMLElement)?.closest?.('.ai-session-item, .top-tab-item')) document.body.classList.add('tmux-dragging');
});
document.addEventListener('dragend', () => document.body.classList.remove('tmux-dragging'));
// leftHtml/bodyHtml은 갱신 대상이지만 드롭다운은 유지해야 한다(열려 있는 메뉴가 닫히고 Dropdown 인스턴스가
// 새로 생기는 것을 막는다). 그래서 둘을 display:contents 래퍼로 감싸 갱신 슬롯을 만든다.
// display:contents라 래퍼 자신은 레이아웃에 관여하지 않아 기존 flex 배치가 그대로 유지된다.
function createSessionItem(spec: SessionItemSpec): HTMLDivElement {
    const item = document.createElement('div') as SessionItemEl;
    item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
        + (spec.isActive ? ' ' + spec.activeClass : '');
    if (spec.accentStyle) item.style.cssText = spec.accentStyle;
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
    item.addEventListener('click', (e: Event) => {
        if ((e.target as HTMLElement).closest('.dropdown')) return;
        item._spec.onClick();
    });
    // 드래그해서 Multiplexer pane에 놓으면 그 pane 콘텐츠가 이 세션으로 바뀐다(sessionItemDragKey 참고).
    item.draggable = true;
    item.addEventListener('dragstart', (e: DragEvent) => {
        const key = sessionItemDragKey(item._spec);
        if (!key) { e.preventDefault(); return; }
        e.dataTransfer?.setData('text/plain', key);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
    });
    // 미들(휠) 클릭 = 즉시 삭제. 브라우저 기본 자동 스크롤 동작(mousedown)도 함께 막는다.
    item.addEventListener('mousedown', (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); });
    item.addEventListener('auxclick', (e: MouseEvent) => {
        if (e.button !== 1) return;
        e.preventDefault();
        item._spec.onDelete();
    });
    const dropEl = item.querySelector('.dropdown')!;
    new (window as any).bootstrap.Dropdown(dropEl.querySelector('[data-bs-toggle="dropdown"]')!, { popperConfig: { strategy: 'fixed' } });
    item.querySelector<HTMLElement>('[data-act="link"]')?.addEventListener('click', () => item._spec.onShare?.());
    wirePopupActions(item, () => item._spec.popup.url(), spec.popup.title, spec.popup.winName);
    item.querySelector<HTMLElement>(`[data-act="${spec.deleteAct}"]`)!.addEventListener('click', () => item._spec.onDelete());
    return item;
}

const SESS_ACTIVE_CLASSES = ['ai-session-item-active', 'ai-session-item-active-remote', 'ai-session-item-active-main', 'ai-session-item-active-sub'];
function applySessActiveClasses(el: HTMLElement, spec: { activeClass: string; isActive: boolean }) {
    el.classList.remove(...SESS_ACTIVE_CLASSES);
    if (spec.isActive) el.classList.add(spec.activeClass);
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
    applySessActiveClasses(item, spec);
    item.style.cssText = spec.accentStyle ?? '';
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

// RDP는 더 이상 전용 탭이 없으므로, "지금 Multiplexer의 어느 pane이든 이 RDP 세션을 보여주고 있는지"로
// 판단한다(첫 pane만 보면 분할해서 서브 pane에 놓았을 때 실제로는 보이는데 "숨김" 신호가 계속 가서
// 화면 캡처/스트리밍이 멈췄다 다시 시작하는 것처럼 보이는 버그가 있었다).
function isRdpPaneActive(): boolean {
    return CDOM.ID('tmux-panel').classList.contains('active') && !!activeRdpFrameKey && tmuxFindPaneIdByKey(activeRdpFrameKey) !== null;
}

function updateRdpFrameVisibility() {
    if (!activeRdpFrameKey) return;
    postFrameVisible(rdpIframePool.get(activeRdpFrameKey), isRdpPaneActive());
}

// pane이 아직 없을 때만 쓰는 임시 부모. 숨긴 세션 iframe은 여기로 옮기지 않는다 — Chrome은
// display:none인 iframe을 다른 부모로 appendChild하면 문서를 다시 로드해서 입력창이 비고 WS가 끊긴다.
const tmuxIdlePool = document.createElement('div');
tmuxIdlePool.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
document.body.appendChild(tmuxIdlePool);

interface FramePoolCtx {
    pool: Map<string, HTMLIFrameElement>;
    container: HTMLElement;
    getActiveKey: () => string | null;
    setActiveKey: (key: string | null) => void;
    updatePlaceholder: () => void;
    onActivate?: (key: string, prevKey: string | null) => void;
    onCreate?: (f: HTMLIFrameElement, key: string) => void;
}
// RDP/Chat/Terminal/Browser/Editor 공용 프레임 풀. 예전에는 각 타입마다 자기 전용 탭(패널)에
// iframe을 붙였지만, 지금은 전부 Multiplexer의 첫 번째 pane(tmuxPlaceFrame)에 옮겨 붙인다 -
// 새 세션을 열면 그게 곧 "첫 프레임과 교체"다. ctx.container는 더 이상 쓰이지 않지만(각 타입의
// 옛 전용 탭 컨테이너), FramePoolCtx 생성부를 그대로 두기 위해 필드는 남겨둔다.
function showPooledFrame(ctx: FramePoolCtx, key: string, src: string): HTMLIFrameElement {
    let f = ctx.pool.get(key);
    if (!f) {
        f = document.createElement('iframe');
        f.src = src;
        // 좌표는 tmuxSyncPanePositions가 매길 때까지 0크기로 숨겨둔다. #tmux-tree-root에 딱 한 번만
        // 붙이고 이후로는 절대 다른 부모로 옮기지 않는다(재로드 방지 - Multiplexer 섹션 상단 주석 참고).
        // 이 attach를 빼먹으면 iframe이 DOM에 아예 안 붙어 새 세션 화면이 안 보인다(tmuxEnsurePooledFrame이
        // pool에 이미 있는 걸 보고 "이미 붙어있다" 착각해 자기 attach 단계를 건너뛰기 때문).
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
    // 센터에 보이는 프레임이 바뀌면(새 터미널/에디터 열림, 세션 전환 등) 좌측 Agent 서브탭 또는 우측 Other
    // 탭의 active를 즉시 그 화면과 일치시킨다. chat/term→좌측 Agent 서브탭, browser/editor→우측 Other 탭
    // (RDP 등 그 외는 탭 전환 없음). renderSessionSidebar()는 rAF로 합류되므로 연속 호출해도 부담이 없다.
    syncSidebarTabToFrame(key);
    renderSessionSidebar();
    return f;
}
// 프레임 키 접두사로 소속 탭을 판별해, 필요할 때만 그 탭으로 전환한다(폴링 렌더가 아니라 전환 시점에만).
function syncSidebarTabToFrame(key: string) {
    const isAgent = /^(chat:|term:|term-new:)/.test(key);
    const isOther = /^(browser:|editor:)/.test(key);
    if (isAgent && sbSubTab !== 'agent') { sbSubTab = 'agent'; localStorage.setItem(SB_TAB_LS, 'agent'); applySidebarSubTab(); }
    if (isOther) (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('right-other-tab')).show();
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

// 세션 탭(Chat/Terminal/RDP/Browser/Editor) 활성화 공통 처리. 예전엔 타입별 전용 탭을 Tab.show()
// 했지만, 지금은 모든 세션이 Multiplexer 첫 pane에 표시되므로 그 패널로 전환하는 것으로 통일한다.
// _tabId/_label은 더 이상 쓰이지 않지만(과거 호출부 유지를 위해) 시그니처는 그대로 둔다.
function activatePaneUnlessMultiplexer(_tabId: string, _label?: string) {
    tmuxShowPanel();
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

// 원격지별 색: 상태 점(success/danger)과 겹치지 않는 부트스트랩 기본 테마색만 순서대로 배정한다.
// 팔레트를 넘어서는 원격지는 마지막 색을 계속 재사용한다. remoteId 기준으로 한 번 배정하면 목록 순서가
// 바뀌어도(새 원격지가 unshift로 앞에 추가돼도) 기존 항목 색은 유지된다.
// RDP 사이드바 목록뿐 아니라 Chat/Terminal/Editor/Browser 세션 항목의 "원격" 강조(원래 고정 빨강이던
// ai-session-item-active-remote / agent-group-remote / text-danger 주소 표시)에도 전부 이 배정을 쓴다.
// primary는 로컬 강조(파랑)가 이미 쓰고 있어 제외 — 안 그러면 첫 번째 원격지가 로컬과 같은 파랑이 된다.
const RDP_COLOR_NAMES = ['danger', 'warning', 'info', 'dark'];
const rdpColorAssign = new Map<string, string>();
function rdpColorName(remoteId: string): string {
    let name = rdpColorAssign.get(remoteId);
    if (!name) {
        name = RDP_COLOR_NAMES[Math.min(rdpColorAssign.size, RDP_COLOR_NAMES.length - 1)];
        rdpColorAssign.set(remoteId, name);
    }
    return name;
}
function rdpTextColor(remoteId: string): string {
    return `text-${rdpColorName(remoteId)}`;
}
// active-remote 하이라이트/그룹 헤더 액센트에 쓸 인라인 CSS 커스텀 프로퍼티.
// CSS 쪽(.ai-session-item-active-remote, .agent-group-remote)은 --rdp-accent(-bg)를 읽고,
// 값이 없으면(로컬 항목 등) var()의 두 번째 인자로 기존 danger 색으로 폴백한다.
function rdpAccentStyle(remoteId: string): string {
    const name = rdpColorName(remoteId);
    return `--rdp-accent:var(--bs-${name});--rdp-accent-bg:var(--bs-${name}-bg-subtle);`;
}

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
    const prevStatus = new Map(rdpStatus);
    targets.forEach((r, i) => rdpStatus.set(r.remoteId, results[i]));
    rdpRenderList();
    targets.forEach((r, i) => {
        if (results[i] === 'offline' && prevStatus.get(r.remoteId) !== 'offline') rdpClearRemoteSessions(r.remoteId);
    });
    if (results.some(st => st === 'offline')) rdpEnsureOfflinePolling();
}
// 사이드바에서 "선택됨"으로 표시할 항목. activeRdpFrameKey(실제 로드된 iframe)와 달리
// 프레임이 아직 열리지 않은 최초 상태에도 Local을 강제로 선택 표시하기 위해 별도로 둔다.
let selectedRdpKey = 'rdp:local';
// tmuxRoot/tmuxPaneRole보다 먼저 rdpRenderList()가 호출되므로, let TDZ를 피하려면
// 이 플래그를 그보다 위에 둬야 한다. tmuxLoadLayout 직후 true가 된다.
let tmuxTreeReady = false;

function rdpRenderList() {
    // RDP 목록은 이벤트가 있을 때만 다시 그리므로 통째로 만들어도 무방하지만, 버리는 항목의
    // Bootstrap Dropdown은 반드시 정리해야 한다(innerHTML로 지우면 popper 인스턴스가 남는다).
    for (const el of Array.from(rdpSidebarList.children)) destroySessionItem(el as HTMLElement);
    rdpSidebarList.innerHTML = '';

    const localItem = document.createElement('div');
    localItem.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded';
    localItem.dataset.key = 'rdp:local';
    applySessActiveClasses(localItem, sessActiveFromKey('rdp:local'));
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
            ...sessActiveFromKey(key),
            dataAttr: { name: 'id', value: r.remoteId },
            shortLabel: r.entryUrl,
            leftHtml: `<span class="${stv.cls} small flex-shrink-0" title="${aiEscapeHtml(stv.title)}">●</span>`,
            // 연결 상태와 무관하게 원격지별로 다른 색을 준다(rdpTextColor).
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

// ---- 경로(Root) 목록 상태: 좌측 File 서브탭 최상단 셀렉트(#ctrlSideFileRootSel)로 선택한다.
// currentWebRootUrl(현재 활성 서버)의 File/Root를 조회해 채우는 ctrlRootOpts/ctrlSelectedRootPath는
// Agent 그룹핑, 새 세션 기본 Working Directory, 좌측 파일 목록 RootPath 파라미터에도 쓰인다.
// (File.ts로의 'set-file-root' 동기화 메시지는 더 이상 발생하지 않지만 File.ts는 자체 fetch/localStorage로
// 독립 동작하므로 영향 없다).
interface ICtrlRootOpt { path: string; name: string; url?: string; }
let ctrlRootOpts: ICtrlRootOpt[] = [];
let ctrlRootReqSeq = 0;
// 로컬 + 등록된 모든 원격의 워킹 폴더 목록(어느 RDP 탭을 보고 있든 항상 둘 다 유지) - Agent 그룹 표시와
// 좌측 File 서브탭 셀렉트(#ctrlSideFileRootSel, optgroup으로 로컬/원격 구분)가 함께 이 캐시를 쓴다.
let localRootOpts: ICtrlRootOpt[] = [];
const remoteRootsCache = new Map<string, ICtrlRootOpt[]>();
// New Chat/New Terminal 모달의 기본 Working Directory로 쓰는 현재 선택된 경로.
// 서버(File/Root)가 Artgine 작업경로를 항상 절대경로로 실어 보내므로 여기 담기는 값도 절대경로다.
// CTerminalRouter/CAIChatRouter는 어차피 받은 경로를 자기 작업경로 기준으로 resolve하므로 절대/상대 어느 쪽이든 안전하다.
let ctrlSelectedRootPath = '';
// Control.html이 ?RootPath=...로 열린 경우, 최초 1회에 한해 그 값과 일치하는 루트를 기본 선택한다
// (그 뒤 RDP 목록에서 Local/원격을 전환할 때 다시 그리는 건 평소처럼 상대경로 기본값으로 되돌아간다).
let ctrlInitRootPathConsumed = false;
const ctrlNormPath = (s: string) => s.replace(/\\/g, '/').replace(/\/+$/, '');

// 좌측 File 서브탭 워킹폴더 셀렉트를 로컬(localRootOpts) + 등록된 모든 원격(remoteRootsCache)의 경로로
// 채운다 - RDP에서 지금 보고 있는 서버와 무관하게 로컬/원격 워킹 폴더가 항상 함께 나열된다(optgroup으로 구분).
// 현재 선택(ctrlSelectedRootPath + currentWebRootUrl에 대응하는 원격)과 일치하는 항목을 하이라이트한다.
function ctrlSyncSideFileRootSel() {
    const sel = CDOM.ID('ctrlSideFileRootSel') as HTMLSelectElement | null;
    if (!sel) return;
    sel.innerHTML = '';

    const addGroup = (label: string, remoteId: string, roots: ICtrlRootOpt[]) => {
        if (!roots.length) return;
        const group = document.createElement('optgroup');
        group.label = label;
        for (const r of roots) {
            const opt = document.createElement('option');
            opt.value = r.path;
            opt.dataset.remoteId = remoteId;
            // 표시는 name, title에 실제 절대경로를 넣어 구분한다.
            opt.textContent = r.name || r.path;
            opt.title = r.path;
            group.appendChild(opt);
        }
        sel.appendChild(group);
    };

    addGroup(L('ctrl.local', 'Local'), '', localRootOpts);
    for (const remote of rdpRemotes) {
        const roots = remoteRootsCache.get(remote.remoteId);
        if (roots) addGroup(remote.entryUrl, remote.remoteId, roots);
    }

    const activeRemoteId = currentWebRootUrl
        ? (rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === currentWebRootUrl)?.remoteId ?? '')
        : '';
    const options = Array.from(sel.options);
    let match = options.find(o => (o.dataset.remoteId ?? '') === activeRemoteId && ctrlNormPath(o.value) === ctrlNormPath(ctrlSelectedRootPath));
    if (!match) match = options.find(o => (o.dataset.remoteId ?? '') === activeRemoteId);
    if (match) {
        sel.selectedIndex = options.indexOf(match);
        ctrlSelectedRootPath = match.value;
    } else if (options.length) {
        sel.selectedIndex = 0;
        ctrlSelectedRootPath = options[0].value;
    }
}

function ctrlRenderRootOpts(roots: ICtrlRootOpt[]) {
    // 서버(getRoots)가 Artgine 작업경로를 name='./'인 항목으로 항상 실어 보낸다 - 표시 이름만 바꿔치기한다.
    ctrlRootOpts = roots.map(r => r.name === './' ? { ...r, name: 'Artgine (WorkingPath)' } : r);
    // 이미 고른 루트가 목록에 남아 있으면 유지. 없거나 최초면 목록 첫 항목.
    const prev = ctrlSelectedRootPath;
    const prevIdx = prev
        ? ctrlRootOpts.findIndex(r => ctrlNormPath(r.path) === ctrlNormPath(prev))
        : -1;
    let defaultIdx = prevIdx;
    if (defaultIdx < 0) defaultIdx = ctrlRootOpts.length > 0 ? 0 : -1;
    if (!ctrlInitRootPathConsumed && ctrlInitRootPath) {
        ctrlInitRootPathConsumed = true;
        const matchIdx = ctrlRootOpts.findIndex(r => ctrlNormPath(r.path) === ctrlNormPath(ctrlInitRootPath));
        if (matchIdx >= 0) defaultIdx = matchIdx;
    }
    ctrlSelectedRootPath = ctrlRootOpts[defaultIdx]?.path ?? '';
    ctrlSyncSideFileRootSel();
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
        // 다음 refresh(RDP 전환 등)에서 재시도된다.
    }
}

// 좌측 File 서브탭 워킹폴더 셀렉트 변경 → 로컬/원격 optgroup 중 어느 쪽을 골랐는지에 따라
// currentWebRootUrl까지 전환한 뒤(ctrlSideFileOpenFromSearch와 동일한 패턴 - RDP 중앙 프레임은 그대로 두고
// File 탭이 보는 서버만 바꾼다) 선택 루트를 갱신하고 목록을 루트(/)부터 다시 연다.
CDOM.ID('ctrlSideFileRootSel')?.addEventListener('change', () => {
    const sel = CDOM.ID('ctrlSideFileRootSel') as HTMLSelectElement;
    const opt = sel?.selectedOptions[0];
    if (!opt) return;
    const remoteId = opt.dataset.remoteId ?? '';
    const remote = remoteId ? rdpRemotes.find(r => r.remoteId === remoteId) : undefined;
    const nextWeb = remote ? rdpRemoteWebRootUrl(remote.entryUrl) : '';
    const next = opt.value;
    if (ctrlNormPath(next) === ctrlNormPath(ctrlSelectedRootPath) && (currentWebRootUrl || '') === (nextWeb || '')) return;
    if ((currentWebRootUrl || '') !== (nextWeb || '')) { currentWebRootUrl = nextWeb; logOnServerChanged(); }
    ctrlSelectedRootPath = next;
    // 이전 워킹 폴더 인덱싱이 돌고 있으면 즉시 중단한다(검색창 잠금·BFS 요청이 새 폴더로 새지 않게).
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
            rdpEnsureOfflinePolling();
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
        if (st === 'offline') rdpEnsureOfflinePolling();
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
// 초기 진입 시 Help 패널을 기본으로 보이게 한다(More > Help로 다시 열 수 있음). 세션(터미널/채팅 등)을
// 열면 activatePaneUnlessMultiplexer가 Multiplexer로 전환한다. 단, ?path=로 특정 루트를 지정해
// 들어온 경우는 그 폴더를 보러 온 것이므로 File 탭을 바로 보여준다.
function helpActivatePane() {
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('help-panel-tab')).show();
}
CDOM.ID('help-open-btn').addEventListener('click', () => helpActivatePane());
if (ctrlInitRootPath) (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('file-tab')).show();
else helpActivatePane();

// 좌측 사이드바 열기 + File 서브탭 활성화. F2 검색 모달의 폴더 클릭에서 재사용한다.
function ctrlShowFileTab() {
    if (!appSidebar) return;
    if (!tmuxSidebarVisible('left')) tmuxShowSidebar('left');
    if (sbSubTab !== 'file') { sbSubTab = 'file'; localStorage.setItem(SB_TAB_LS, 'file'); applySidebarSubTab(); }
    appSidebar.focus();
}

// 검색 결과 폴더 클릭: 좌측 File 목록이 보고 있는 서버/루트를 결과 스코프에 맞춘 뒤 해당 경로로 이동한다.
// 다중 경로 검색에서는 현재 선택 루트와 다른 스코프 결과가 나오므로, 같음 여부와 무관하게 전환한다.
function ctrlSideFileOpenFromSearch(scope: ICtrlSearchScope, pathVal: string) {
    // 로컬 스코프는 currentWebRootUrl='', 원격은 그 서버 apiUrl. File/List·토큰이 이 값을 본다.
    const nextWeb = scope.remoteId ? scope.webRootUrl : '';
    if ((currentWebRootUrl || '') !== (nextWeb || '')) { currentWebRootUrl = nextWeb; logOnServerChanged(); }
    if (ctrlNormPath(ctrlSelectedRootPath ?? '') !== ctrlNormPath(scope.rootPath ?? '')) {
        ctrlSelectedRootPath = scope.rootPath ?? '';
        ctrlSyncSideFileRootSel();
    }
    ctrlShowFileTab();
    ctrlSideFileGoTo(pathVal);
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
// 스코프별 실제 루트 경로/다운로드 baseUrl(File/List 응답에서 채워짐). 위 캐시와 마찬가지로 전역으로 유지해야
// 한다 - 모달을 닫았다 다시 열면(F2) g_ctrlSrchCache는 남아있어 타이핑 즉시 캐시 결과가 뜨는데(자동완성처럼 보임),
// 이 맵들이 모달 호출마다 초기화되는 로컬 변수였다면 그 세션에서 아직 실제 스캔(File/List)이 한 번도 안 일어나
// 루트 경로가 비어있는 채로 클릭 시 잘못된(루트 prefix 빠진) 경로가 만들어져 404가 났다.
const g_ctrlSrchRoot: Map<string, string> = new Map();
const g_ctrlSrchDown: Map<string, string> = new Map();
// 마지막으로 사용자가 체크해둔 스코프 조합(F2로 다시 열 때 재사용). localStorage에 저장해 새로고침/재접속
// 후에도 유지되고, 저장된 값이 전혀 없는 최초 실행 때만 null로 남아 전부 미체크로 시작한다.
const CTRL_SRCH_LAST_CHECKED_KEY = 'ctrlSrchLastChecked';
let g_ctrlSrchLastChecked: Set<string> | null = (() => {
    try {
        const raw = localStorage.getItem(CTRL_SRCH_LAST_CHECKED_KEY);
        return raw ? new Set<string>(JSON.parse(raw)) : null;
    } catch { return null; }
})();

// onlyKey 없이(F2) 호출하면 마지막으로 사용자가 체크해둔 조합을 그대로 복원하고(한 번도 토글한 적이 없으면
// 전부 미체크), 특정 그룹의 '...' > Search로 호출하면(onlyKey) 그 패스만 체크된 상태로 모달이 열린다. 목록 자체는
// 항상 전체 패스(로컬 + 인증된 원격들의 등록 루트)가 나열되고, 사용자가 체크박스를 직접 켜고 끌 수 있다 -
// 체크된 스코프들을 모두 대상으로 검색한다.
async function ctrlFileSearch(onlyKey?: string) {
    let searchCancelled = false;
    const uid = Date.now();

    const scopeItems = ctrlAllSearchScopeItems();
    const initialChecked = new Set<string>(
        onlyKey ? [onlyKey] :
        g_ctrlSrchLastChecked ? scopeItems.map(s => s.key).filter(k => g_ctrlSrchLastChecked!.has(k)) :
        []
    );
    // onlyKey(그룹 '...' > Search)로 열렸을 때는 체크박스가 사용자 조작 없이 미리 체크된 채로 뜨므로 change 이벤트가
    // 발생하지 않는다 - 그대로 두면 다음 순수 F2 때 이 선택이 기억되지 않는다. 여기서 바로 "마지막 체크 조합"에 반영한다.
    if (onlyKey) {
        g_ctrlSrchLastChecked = new Set(initialChecked);
        try { localStorage.setItem(CTRL_SRCH_LAST_CHECKED_KEY, JSON.stringify(Array.from(g_ctrlSrchLastChecked))); } catch {}
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

    await new Promise<void>(r => setTimeout(r, MODAL_DOM_DELAY));

    const scopesEl = document.getElementById(`ctrlSrchScopes_${uid}`) as HTMLElement;
    const input   = document.getElementById(`ctrlSrchInput_${uid}`)  as HTMLInputElement;
    const btn     = document.getElementById(`ctrlSrchBtn_${uid}`)    as HTMLButtonElement;
    const stopBtn = document.getElementById(`ctrlSrchStop_${uid}`)   as HTMLButtonElement;
    const status  = document.getElementById(`ctrlSrchStatus_${uid}`) as HTMLElement;
    const results = document.getElementById(`ctrlSrchResults_${uid}`) as HTMLElement;

    // 사용자가 체크박스를 토글할 때마다 다음 F2 호출을 위해 조합을 저장해둔다(새로고침 후에도 유지되도록 localStorage에도 기록).
    scopesEl.addEventListener('change', (e) => {
        if (!(e.target as HTMLElement)?.classList.contains('ctrl-srch-scope-cb')) return;
        g_ctrlSrchLastChecked = new Set(
            Array.from(scopesEl.querySelectorAll<HTMLInputElement>('.ctrl-srch-scope-cb'))
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.key!)
        );
        try { localStorage.setItem(CTRL_SRCH_LAST_CHECKED_KEY, JSON.stringify(Array.from(g_ctrlSrchLastChecked))); } catch {}
    });

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
            e.dataTransfer?.setData('text/plain', (g_ctrlSrchRoot.get(scopeKey) ?? '') + dirPath + fl.name);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
        });
        if (fl.file) {
            item.addEventListener('click', () => {
                modal.Hide();
                editorOpenFile((g_ctrlSrchRoot.get(scopeKey) ?? '') + dirPath + fl.name, scope.editorBaseUrl, (g_ctrlSrchDown.get(scopeKey) ?? '') + ctrlEncodeUrlPath(dirPath + fl.name));
            });
        } else {
            // File.ts FileSearch와 동일: 폴더 클릭 시 그 폴더 안으로 이동. 스코프가 우측 목록과 다르면 루트/서버도 전환.
            item.addEventListener('click', () => {
                modal.Hide();
                ctrlSideFileOpenFromSearch(scope, dirPath + fl.name + '/');
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
                    // skipVcs: 사이드바 인덱싱과 동일하게, 폴더마다 git/svn 프로세스를 스폰하는 VCS 상태 조회를
                    // 생략해 스캔 속도를 크게 높인다.
                    const p2: any = { path: dirPath, skipVcs: 'true' };
                    if (rootPathParam) p2.RootPath = rootPathParam;
                    const token = getAuthToken(webRootUrl);
                    const data = await CFecth.Exe(webRootUrl + "File/List", { ...p2, token }, "json") as { list: CtrlSrchFile[], RootPath?: string, RootUrl?: string, msg?: string };
                    if (!Array.isArray(data.list)) {
                        if (dirPath === "/") scopeErrors.push(`${scope.serverLabel}: ${data.msg || L('ctrl.msg.searchScopeFailed', 'Cannot search this location.')}`);
                        continue;
                    }
                    if (data.RootPath != null) g_ctrlSrchRoot.set(scopeKey, data.RootPath.replace(/\/+$/, ''));
                    // RootUrl은 서버 origin 기준 상대경로("/Artgine/Root0")로 오므로 webRootUrl에 대해 절대 URL로 풀어야 한다
                    // (File.ts의 ResolveFileUrl과 동일한 처리). 끝 슬래시는 제거만 하고 붙이지 않는다 — dirPath가 항상
                    // "/"로 시작하므로 여기서 슬래시를 추가하면 "Root0//artgine/..."처럼 중복되어, Monaco가 등록된
                    // extra lib 경로와 다른 문자열로 취급해 "Cannot find module" 에러가 난다.
                    if (data.RootUrl != null) g_ctrlSrchDown.set(scopeKey, new URL(data.RootUrl, webRootUrl).href.replace(/\/+$/, ''));
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

    // 한 글자씩 입력할 때마다(네트워크 요청 없이) 이미 스캔해둔 캐시(g_ctrlSrchCache)에서만 즉시 필터링해서
    // 보여준다 - 실제 폴더 스캔은 doSearch(Enter/버튼)에서만 일어난다. 스캔 중(btn.disabled)에는 doSearch가
    // 이미 results를 채우고 있으므로 건드리지 않는다.
    input.addEventListener('input', () => {
        if (btn.disabled) return;
        const query = input.value.trim().toLowerCase();
        results.innerHTML = '';
        if (!query) { status.textContent = ''; return; }
        const checkedKeys = new Set(
            Array.from(scopesEl.querySelectorAll<HTMLInputElement>('.ctrl-srch-scope-cb'))
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.key!)
        );
        const activeScopes = scopeItems.filter(s => checkedKeys.has(s.key));
        if (activeScopes.length === 0) return;
        const found = renderFromCache(activeScopes, query, new Set<string>());
        status.textContent = found > 0 ? LF('ctrl.msg.cachedOnly', 'Cached: {0} result(s) (Enter for full search)', found) : '';
    });

    stopBtn.addEventListener('click', () => { searchCancelled = true; });
    btn.addEventListener('click', doSearch);
    // 위/아래 화살표로 결과 목록을 하나씩 탐색(사이드바 자동완성과 동일한 방식). 항목이 키보드로
    // 선택된 상태에서 Enter는 그 항목을 열고, 아니면 기존처럼 전체 스캔(doSearch)을 돌린다.
    input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const items = Array.from(results.querySelectorAll<HTMLElement>('.list-group-item'));
            if (items.length === 0) return;
            e.preventDefault();
            const curIdx = items.findIndex(el => el.classList.contains('ctrl-srch-kbd-active'));
            const dir = e.key === 'ArrowDown' ? 1 : -1;
            const nxt = curIdx === -1 ? (dir === 1 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, curIdx + dir));
            if (curIdx >= 0) items[curIdx].classList.remove('ctrl-srch-kbd-active');
            items[nxt].classList.add('ctrl-srch-kbd-active');
            items[nxt].scrollIntoView({ block: 'nearest' });
            return;
        }
        if (e.key === 'Enter') {
            const activeItem = results.querySelector<HTMLElement>('.ctrl-srch-kbd-active');
            if (activeItem) { activeItem.click(); return; }
            doSearch();
        }
    });
    input.focus();
}

// ---- 좌측 사이드바: 빠른 파일 열람(목록만) ----
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
const ctrlSideFileCopyListEl = CDOM.ID('ctrlSideFileCopyList') as HTMLDivElement;
let ctrlSideFilePath = '/';
let ctrlSideFileRoot = '';
let ctrlSideFileDown = '';
let ctrlSideFileReqSeq = 0;

// File 탭 드래그(dataTransfer의 'text/plain')로 넘어오는 값은 서버 로컬 절대경로 문자열이다.
// 다른 탭(예: Media 탭)이 드롭을 받아 fetch로 파일을 읽으려면 이 절대경로를 실제 다운로드 URL로
// 바꿔야 한다. 사이드바가 지금 보여주고 있는 루트(ctrlSideFileRoot) 하나만 보고 매칭하면, 드래그한
// 파일이 다른 등록 루트(예: E:/) 소속일 때 매칭에 실패한다 — termOpenTappedPath와 동일하게
// File/Root의 전체 루트 목록을 받아 대소문자 무시하고 매칭하는 방식으로 전역 함수를 노출한다
// (ctrlRequireAuthed와 같은 패턴).
(window as any).ctrlPathToUrl = async (absPath: string): Promise<string | null> => {
    const norm = termNormAbsPath(absPath);
    const normLower = norm.toLowerCase();
    try {
        const data = await CFecth.Exe(CPath.WebRootUrl() + "File/Root", {}, "json") as { roots: Array<{ path: string; url: string; name: string }> };
        const root = (data.roots || []).find(r => {
            const rp = termNormAbsPath(r.path).toLowerCase();
            return normLower === rp || normLower.startsWith(rp + '/');
        });
        if (!root) return null;
        const rel = norm.slice(termNormAbsPath(root.path).length).replace(/^\/+/, '');
        const downBase = new URL(root.url, CPath.WebRootUrl()).href.replace(/\/+$/, '');
        return downBase + '/' + ctrlEncodeUrlPath(rel);
    } catch {
        return null;
    }
};

// ctrlPathToUrl의 반대 방향: Editor.html(Monaco)이 다른 파일의 정의로 이동할 때 보내는 다운로드 URL을
// File/Root 목록과 대조해 절대경로로 되돌린다 (editorOpenFile의 path 인자는 항상 절대경로여야 함).
async function ctrlUrlToPath(url: string, baseUrl: string): Promise<string | null> {
    const apiUrl = baseUrl || CPath.WebRootUrl();
    try {
        const data = await CFecth.Exe(apiUrl + "File/Root", {}, "json") as { roots: Array<{ path: string; url: string; name: string }> };
        for (const root of data.roots || []) {
            const downBase = new URL(root.url, apiUrl).href.replace(/\/+$/, '');
            if (url === downBase || url.startsWith(downBase + '/')) {
                const rel = decodeURIComponent(url.slice(downBase.length).replace(/^\/+/, ''));
                return termNormAbsPath(root.path) + '/' + rel;
            }
        }
    } catch { }
    return null;
}

// 좌측 File 서브탭 길게 누르기 복사 클립보드. 경로 바 아래에 표시, X=목록 제거, 복사=현재 경로에 붙여넣기.
// 파일·폴더 모두 지원. 폴더는 File/List + Mkdir + Upload로 재귀 복사.
interface CtrlSideCopyItem {
    name: string;
    absPath: string;
    /** 루트 기준 상대 경로. 폴더는 trailing '/' */
    relPath: string;
    isFile: boolean;
    downloadBase: string;
    webRootUrl: string;
    /** 복사 시점 RootPath (소스 File/List·다운로드용) */
    rootPath: string;
}
const CTRL_SIDE_FILE_LONG_MS = 550;
// 길게 누른 직후 레이아웃이 밀리며 X 버튼이 손가락/커서 아래에 생겨 오클릭되는 것을 막는다.
const CTRL_SIDE_FILE_COPY_CLICK_GUARD_MS = 450;
const ctrlSideFileCopyItems: CtrlSideCopyItem[] = [];
let ctrlSideFileCopyClickGuardUntil = 0;

function ctrlSideFileAuthToken(webRootUrl: string): string {
    // 원격은 해당 origin 토큰, 로컬은 세션 쿠키 또는 로컬 토큰
    if (webRootUrl && webRootUrl !== CPath.WebRootUrl()) return getAuthToken(webRootUrl) || '';
    return getAuthToken(webRootUrl || CPath.WebRootUrl()) || '';
}

function ctrlSideFileRenderCopyList() {
    if (!ctrlSideFileCopyListEl) return;
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
        // 경로 표시 + 액션은 X(삭제)/복사(현재 경로 붙여넣기) 아이콘 두 개만
        row.innerHTML =
            `<i class="bi ${icon} flex-shrink-0" style="font-size:0.75rem;"></i>` +
            `<span class="small text-truncate flex-grow-1" title="${aiEscapeHtml(ci.relPath)}">${aiEscapeHtml(ci.relPath)}</span>` +
            `<button type="button" class="btn btn-sm btn-outline-secondary py-0 px-1 flex-shrink-0" data-copy-act="remove" title="Remove"><i class="bi bi-x-lg"></i></button>` +
            `<button type="button" class="btn btn-sm btn-outline-primary py-0 px-1 flex-shrink-0" data-copy-act="paste" title="Paste here"><i class="bi bi-clipboard"></i></button>`;
        row.querySelector<HTMLButtonElement>('[data-copy-act="remove"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // 길게 누르기 직후 합성 클릭으로 X가 눌리는 경우 무시
            if (Date.now() < ctrlSideFileCopyClickGuardUntil) return;
            const idx = ctrlSideFileCopyItems.indexOf(ci);
            if (idx >= 0) ctrlSideFileCopyItems.splice(idx, 1);
            ctrlSideFileRenderCopyList();
        });
        row.querySelector<HTMLButtonElement>('[data-copy-act="paste"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (Date.now() < ctrlSideFileCopyClickGuardUntil) return;
            void ctrlSideFilePasteCopy(ci);
        });
        ctrlSideFileCopyListEl.appendChild(row);
    }
}

function ctrlSideFileAddCopy(fl: CtrlSideFileEntry) {
    const relPath = fl.file
        ? ctrlSideFilePath + fl.name
        : ctrlSideFilePath + fl.name + '/';
    const absPath = ctrlSideFileRoot + relPath;
    if (ctrlSideFileCopyItems.some(x => x.absPath === absPath)) return;
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
    // 목록 DOM이 생긴 직후 오클릭 방지
    ctrlSideFileCopyClickGuardUntil = Date.now() + CTRL_SIDE_FILE_COPY_CLICK_GUARD_MS;
    ctrlSideFileRenderCopyList();
}

/** 단일 파일을 소스 URL → dest 절대 디렉터리로 업로드. 실패 시 false */
async function ctrlSideFileUploadOne(
    downloadUrl: string,
    destAbsDir: string,
    fileName: string,
    destWebRootUrl: string,
): Promise<boolean> {
    const buf = await CFile.Load(downloadUrl, false, true);
    if (!buf) return false;
    const b64 = CUtil.ArrayToBase64(buf);
    const token = ctrlSideFileAuthToken(destWebRootUrl);
    const up: any = { path: destAbsDir, name: [fileName], data: [b64] };
    if (token) up.token = token;
    const res = await CFecth.Exe(destWebRootUrl + 'File/Upload', up, 'json') as { ok?: boolean };
    return !!res?.ok;
}

/**
 * 폴더 재귀 복사.
 * @param overwrite true면 동명 파일 덮어쓰기·동명 폴더 병합. false면 동명 항목은 패스(스킵).
 */
async function ctrlSideFileCopyFolderTree(
    item: CtrlSideCopyItem,
    destParentRel: string,
    destWebRootUrl: string,
    destRootPath: string,
    destAbsRoot: string,
    overwrite: boolean,
): Promise<boolean> {
    const srcToken = ctrlSideFileAuthToken(item.webRootUrl);
    const destToken = ctrlSideFileAuthToken(destWebRootUrl);
    const destFolderRel = destParentRel + item.name + '/';
    // 1) 대상 폴더 생성 (이미 있어도 mkdir recursive라 성공)
    const mk: any = { data: destParentRel + item.name };
    if (destRootPath) mk.RootPath = destRootPath;
    if (destToken) mk.token = destToken;
    const mkRes = await CFecth.Exe(destWebRootUrl + 'File/Mkdir', mk, 'json') as { ok?: boolean; msg?: string };
    if (mkRes && mkRes.ok === false) return false;

    // 2) 소스 폴더 목록
    const lp: any = { path: item.relPath };
    if (item.rootPath) lp.RootPath = item.rootPath;
    if (srcToken) lp.token = srcToken;
    const listed = await CFecth.Exe(item.webRootUrl + 'File/List', lp, 'json') as {
        list?: CtrlSideFileEntry[]; ok?: boolean; msg?: string;
    };
    if ((listed as any)?.ok === false) return false;
    const children = (listed.list ?? []).filter(fl => !fl.hidden);

    // 3) 대상 기존 이름 집합 (패스 모드에서 동명 스킵용)
    const destAbsDir = destAbsRoot + destFolderRel;
    const checkP: any = { path: destFolderRel };
    if (destRootPath) checkP.RootPath = destRootPath;
    if (destToken) checkP.token = destToken;
    const destList = await CFecth.Exe(destWebRootUrl + 'File/List', checkP, 'json') as { list?: CtrlSideFileEntry[] };
    const destNames = new Set((destList.list ?? []).map(x => x.name));

    for (const fl of children) {
        const nameExists = destNames.has(fl.name);
        if (nameExists && !overwrite) continue;
        if (fl.file) {
            const srcRel = item.relPath + fl.name;
            const url = item.downloadBase + ctrlEncodeUrlPath(srcRel);
            const ok = await ctrlSideFileUploadOne(url, destAbsDir, fl.name, destWebRootUrl);
            if (!ok) return false;
            destNames.add(fl.name);
        } else {
            const sub: CtrlSideCopyItem = {
                name: fl.name,
                absPath: item.absPath + fl.name + '/',
                relPath: item.relPath + fl.name + '/',
                isFile: false,
                downloadBase: item.downloadBase,
                webRootUrl: item.webRootUrl,
                rootPath: item.rootPath,
            };
            const ok = await ctrlSideFileCopyFolderTree(
                sub, destFolderRel, destWebRootUrl, destRootPath, destAbsRoot, overwrite,
            );
            if (!ok) return false;
            destNames.add(fl.name);
        }
    }
    return true;
}

/** 실제 붙여넣기 수행. overwrite: 동명 시 덮어쓰기 여부(최상위는 호출 전에 컨펌으로 결정). */
async function ctrlSideFilePasteCopyDo(item: CtrlSideCopyItem, overwrite: boolean) {
    const destDir = ctrlSideFileRoot + ctrlSideFilePath;
    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    try {
        let ok = false;
        if (item.isFile) {
            const downloadUrl = item.downloadBase + ctrlEncodeUrlPath(item.relPath);
            ok = await ctrlSideFileUploadOne(downloadUrl, destDir, item.name, webRootUrl);
            if (!ok) CAlert.Info(L('ctrl.msg.copyFailed', 'Copy failed.'));
        } else {
            ok = await ctrlSideFileCopyFolderTree(
                item,
                ctrlSideFilePath,
                webRootUrl,
                ctrlSelectedRootPath || '',
                ctrlSideFileRoot,
                overwrite,
            );
            if (!ok) CAlert.Info(L('ctrl.msg.copyFailed', 'Copy failed.'));
        }
        if (!ok) return;
        // 붙여넣기 성공 시 복사 목록에서 제거
        const idx = ctrlSideFileCopyItems.indexOf(item);
        if (idx >= 0) ctrlSideFileCopyItems.splice(idx, 1);
        await ctrlSideFileGoTo(ctrlSideFilePath);
        ctrlSideFileRenderCopyList();
    } catch {
        CAlert.Info(L('ctrl.msg.copyFailed', 'Copy failed.'));
    }
}

async function ctrlSideFilePasteCopy(item: CtrlSideCopyItem) {
    const destDir = ctrlSideFileRoot + ctrlSideFilePath;
    const destAbs = item.isFile ? destDir + item.name : destDir + item.name + '/';
    if (destAbs === item.absPath) {
        CAlert.Info(L('ctrl.msg.copySamePath', 'Same path. Skipped.'));
        return;
    }
    // 폴더를 자기 자신/하위 경로로 붙여넣으면 순환이므로 스킵
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
        // 대상에 동명 있는지 확인 → 있으면 덮어쓰기/패스 컨펌
        const p: any = { path: ctrlSideFilePath };
        if (ctrlSelectedRootPath) p.RootPath = ctrlSelectedRootPath;
        if (token) p.token = token;
        const data = await CFecth.Exe(webRootUrl + 'File/List', p, 'json') as { list?: CtrlSideFileEntry[]; ok?: boolean; msg?: string };
        if ((data as any)?.ok === false) {
            CAlert.Info((data as any).msg || L('ctrl.failedToLoad', 'Failed to load'));
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
        const body =
            `<div class="small">` +
            `<div class="mb-2">${aiEscapeHtml(kind)} <code>${aiEscapeHtml(item.name)}</code> ${L('ctrl.msg.copyExistsAsk', 'already exists in this folder.')}</div>` +
            `<div class="text-secondary">${L('ctrl.msg.copyExistsHint', 'Overwrite replaces existing files. Pass skips this paste.')}</div>` +
            `</div>`;
        CConfirm.List(
            body,
            [
                () => { void ctrlSideFilePasteCopyDo(item, true); },
                () => { /* 패스: 아무 것도 안 함 */ },
            ],
            [
                L('ctrl.overwrite', 'Overwrite'),
                L('ctrl.pass', 'Pass'),
            ],
        );
    } catch {
        CAlert.Info(L('ctrl.msg.copyFailed', 'Copy failed.'));
    }
}

function ctrlSideFileBindLongPress(item: HTMLElement, fl: CtrlSideFileEntry) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let longReady = false;
    let suppressClick = false;
    const clearTimer = () => {
        if (timer != null) { clearTimeout(timer); timer = null; }
    };
    const abortPress = () => {
        clearTimer();
        longReady = false;
        item.classList.remove('active');
    };
    // 누르는 동안에는 목록 DOM을 건드리지 않는다(레이아웃 밀림 → X 오클릭 방지).
    // 길게 눌렀다가 손을 뗄 때(pointerup) 목록에 넣는다. 파일·폴더 모두 동일.
    item.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
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
        if (!longReady) return;
        longReady = false;
        suppressClick = true;
        ctrlSideFileAddCopy(fl);
    });
    item.addEventListener('pointerleave', abortPress);
    item.addEventListener('pointercancel', abortPress);
    item.addEventListener('dragstart', abortPress);
    // 길게 누른 뒤에는 클릭(열기/폴더 진입)이 이어지지 않게 막는다.
    item.addEventListener('click', (e) => {
        if (!suppressClick) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        suppressClick = false;
    }, true);
}

function ctrlSideFileRenderEmpty(msg: string) {
    ctrlSideFileListEl.innerHTML = `<div class="text-secondary small px-1">${aiEscapeHtml(msg)}</div>`;
}

function ctrlSideFileRenderList(list: CtrlSideFileEntry[]) {
    const visible = list
        .filter(fl => !fl.hidden)
        .sort((a, b) => (a.file === b.file) ? a.name.localeCompare(b.name) : (a.file ? 1 : -1));
    if (!visible.length && ctrlSideFilePath === '/') { ctrlSideFileRenderEmpty('Empty'); return; }
    ctrlSideFileListEl.innerHTML = '';
    // File.ts(DirListRefresh)와 동일하게, 최상위(루트)가 아닐 때만 맨 위에 Root/Parent 이동 항목을 넣는다.
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
    if (!visible.length) return;
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
        ctrlSideFileBindLongPress(item, fl);
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
        // 검색 인덱스가 이미 만들어져 있는 루트라면, 지금 새로 받아온 이 폴더 목록으로 그 폴더의 캐시 항목만
        // 교체한다(전체 재인덱싱은 하지 않음) - Refresh 버튼이 ctrlSideFileGoTo(현재 경로)를 그대로 호출하므로
        // 새로고침을 누르면 자동으로 그 폴더의 검색 자동완성 정보도 최신화된다.
        if (g_ctrlSideSrch.indexed && g_ctrlSideSrch.rootKey === ctrlSideSrchKey()) {
            g_ctrlSideSrch.cache.set(ctrlSideFilePath, (data.list ?? []) as unknown as CtrlSrchFile[]);
        }
    } catch (e) {
        if (seq !== ctrlSideFileReqSeq) return;
        ctrlSideFileRenderEmpty(L('ctrl.failedToLoad', 'Failed to load'));
        // 원격 보는 중 실패면(서버 재시작으로 토큰이 죽었거나 일시적으로 끊겼거나) 재연결 감지로 넘긴다.
        // 다시 응답하면 rdpHandleReconnect가 currentWebRootUrl 일치를 보고 이 File 패널도 자동으로 다시 부른다.
        if (currentWebRootUrl) {
            const remote = rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === currentWebRootUrl);
            if (remote) rdpNoteFetchFailure(remote);
        }
    }
}

CDOM.ID('ctrlSideFileRefreshBtn').addEventListener('click', () => ctrlSideFileGoTo(ctrlSideFilePath));

ctrlSideFileGoTo('/');

// ---- 좌측 사이드바 File 서브탭: 검색(자동완성) ----
// F2 검색 모달(ctrlFileSearch)과 같은 방식(BFS로 File/List를 재귀 스캔해 캐시)이지만, 상시 인덱싱은 느리므로
// 여기서는 입력창을 처음 포커스하는 순간에만 현재 워킹 폴더(webRootUrl+RootPath) 하나를 인덱싱한다.
// 인덱싱 중엔 입력을 비활성화하고 "인덱싱중..."을 보여주며, 끝나면 타이핑마다 그 캐시만 필터링(자동완성)한다 -
// F2 모달의 renderFromCache와 동일한 개념이지만 네트워크 재요청 없이 캐시만 쓴다는 점이 다르다.
const ctrlSideFileSearchInputEl = CDOM.ID('ctrlSideFileSearchInput') as HTMLInputElement;
const ctrlSideFileSearchResultsEl = CDOM.ID('ctrlSideFileSearchResults') as HTMLDivElement;
const CTRL_SIDE_SRCH_SCAN_CAP = 100000;
// 폴더 하나씩 순차 요청(BFS 싱글) 대신, 동시에 이만큼의 File/List 요청을 병렬로 띄운다(워커 풀).
const CTRL_SIDE_SRCH_CONCURRENCY = 16;
interface ICtrlSideSrchState { rootKey: string; indexed: boolean; indexing: boolean; cache: Map<string, CtrlSrchFile[]>; root: string; down: string; }
let g_ctrlSideSrch: ICtrlSideSrchState = { rootKey: '', indexed: false, indexing: false, cache: new Map(), root: '', down: '' };
let ctrlSideSrchSeq = 0;

function ctrlSideSrchKey(): string {
    return (currentWebRootUrl || '') + '|' + (ctrlSelectedRootPath || '');
}

// 워킹 폴더 셀렉트가 바뀌면 호출한다. 진행 중인 BFS 인덱싱을 끊고(워커는 seq 불일치로 다음 폴더를
// 요청하지 않음) 검색창/캐시를 초기화한다. 이미 날아간 File/List 응답은 캐시·placeholder에 반영되지 않는다.
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

// 현재 워킹 폴더 전체를 BFS로 스캔해 파일명 캐시를 채운다. 이미 인덱싱됐거나 진행 중이면 아무 것도 하지 않는다.
async function ctrlSideSrchIndex(): Promise<void> {
    const key = ctrlSideSrchKey();
    if (g_ctrlSideSrch.rootKey !== key) g_ctrlSideSrch = { rootKey: key, indexed: false, indexing: false, cache: new Map(), root: '', down: '' };
    if (g_ctrlSideSrch.indexed || g_ctrlSideSrch.indexing) return;

    const seq = ++ctrlSideSrchSeq;
    g_ctrlSideSrch.indexing = true;
    ctrlSideFileSearchInputEl.disabled = true;
    const prevPlaceholder = ctrlSideFileSearchInputEl.placeholder;
    ctrlSideFileSearchInputEl.placeholder = LF('ctrl.indexingCount', 'Indexing... ({0})', 0);

    const webRootUrl = currentWebRootUrl || CPath.WebRootUrl();
    const rootPathParam = ctrlSelectedRootPath || undefined;
    const token = currentWebRootUrl ? getAuthToken(currentWebRootUrl) : '';
    const queue: string[] = ['/'];
    let scanned = 0;
    let stopped = false;

    // 폴더 하나 요청 + 결과 반영. 워커 여러 개가 같은 queue/cache를 공유해도, JS는 단일 스레드라
    // await 사이 구간에서만 다른 워커로 넘어가므로 queue.shift()/cache.set() 자체는 안전하다.
    const fetchDir = async (dirPath: string) => {
        try {
            // skipVcs: 인덱싱은 폴더를 대량으로 훑으므로, 폴더마다 git/svn 프로세스를 스폰하는 VCS 상태 조회를
            // 생략해 서버 부하와 응답 시간을 크게 줄인다(파일 탐색기 쪽 File/List는 그대로 VCS 배지를 받음).
            const p: any = { path: dirPath, skipVcs: 'true' };
            if (rootPathParam) p.RootPath = rootPathParam;
            if (token) p.token = token;
            const data = await CFecth.Exe(webRootUrl + "File/List", p, "json") as { list: CtrlSrchFile[]; RootPath?: string; RootUrl?: string };
            if (seq !== ctrlSideSrchSeq) return;
            if (!Array.isArray(data.list)) return;
            if (data.RootPath != null) g_ctrlSideSrch.root = data.RootPath.replace(/\/+$/, '');
            if (data.RootUrl != null) g_ctrlSideSrch.down = new URL(data.RootUrl, webRootUrl).href.replace(/\/+$/, '');
            g_ctrlSideSrch.cache.set(dirPath, data.list);
            scanned += data.list.length;
            ctrlSideFileSearchInputEl.placeholder = LF('ctrl.indexingCount', 'Indexing... ({0})', scanned);
            for (const fl of data.list) {
                if (!fl.hidden && !fl.file && !ctrlIsSearchExcluded(fl.name)) queue.push(dirPath + fl.name + '/');
            }
        } catch { stopped = true; }
    };

    // 워커 풀: 각 워커가 queue에서 하나씩 꺼내 순차 처리하되, 여러 워커가 동시에 돌아 전체적으로는 병렬 스캔이 된다.
    const worker = async () => {
        while (queue.length > 0 && scanned < CTRL_SIDE_SRCH_SCAN_CAP && !stopped && seq === ctrlSideSrchSeq) {
            const dirPath = queue.shift();
            if (dirPath === undefined) break;
            await fetchDir(dirPath);
        }
    };
    await Promise.all(Array.from({ length: CTRL_SIDE_SRCH_CONCURRENCY }, () => worker()));

    if (seq !== ctrlSideSrchSeq) return;
    g_ctrlSideSrch.indexing = false;
    g_ctrlSideSrch.indexed = true;
    ctrlSideFileSearchInputEl.disabled = false;
    ctrlSideFileSearchInputEl.placeholder = prevPlaceholder;
}

function ctrlSideSrchRenderResults(query: string) {
    ctrlSideFileSearchResultsEl.innerHTML = '';
    if (!query) { ctrlSideFileSearchResultsEl.classList.add('d-none'); return; }
    let found = 0;
    outer:
    for (const [dirPath, list] of g_ctrlSideSrch.cache) {
        for (const fl of list) {
            if (fl.hidden || ctrlIsSearchExcluded(fl.name)) continue;
            if (!fl.name.toLowerCase().includes(query)) continue;
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action py-1 px-2';
            const icon = fl.file ? 'bi-file-earmark' : 'bi-folder-fill text-warning';
            item.innerHTML =
                `<i class="bi ${icon} me-1"></i><strong>${aiEscapeHtml(fl.name)}</strong>` +
                `<span class="text-muted ms-2" style="font-size:11px;">${aiEscapeHtml(dirPath)}</span>`;
            // 좌측 File 목록 항목(ctrlSideFileRenderList)과 동일하게, 터미널 탭(iframe)에 드롭하면
            // 전체 경로가 입력창에 삽입된다.
            item.draggable = true;
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer?.setData('text/plain', g_ctrlSideSrch.root + dirPath + fl.name);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
            });
            item.addEventListener('click', () => {
                ctrlSideFileSearchInputEl.value = '';
                ctrlSideFileSearchResultsEl.classList.add('d-none');
                if (fl.file) {
                    editorOpenFile(g_ctrlSideSrch.root + dirPath + fl.name, currentWebRootUrl, g_ctrlSideSrch.down + ctrlEncodeUrlPath(dirPath + fl.name));
                } else {
                    ctrlSideFileGoTo(dirPath + fl.name + '/');
                }
            });
            ctrlSideFileSearchResultsEl.appendChild(item);
            if (++found >= 100) break outer;
        }
    }
    ctrlSideFileSearchResultsEl.classList.toggle('d-none', found === 0);
}

ctrlSideFileSearchInputEl.addEventListener('focus', () => { void ctrlSideSrchIndex(); });
ctrlSideFileSearchInputEl.addEventListener('input', () => {
    ctrlSideSrchRenderResults(ctrlSideFileSearchInputEl.value.trim().toLowerCase());
});
// 검색 입력에 포커스가 있을 때 위/아래 화살표로 자동완성 결과를 하나씩 이동, Enter로 선택.
// document 레벨 핸들러는 이 입력에서 온 ArrowUp/ArrowDown을 이미 무시하므로(좌측 사이드바 이동 방지),
// 여기서 자체적으로 결과 목록의 키보드 탐색만 처리하면 된다.
ctrlSideFileSearchInputEl.addEventListener('keydown', (e: KeyboardEvent) => {
    if (ctrlSideFileSearchResultsEl.classList.contains('d-none')) return;
    const items = Array.from(ctrlSideFileSearchResultsEl.querySelectorAll<HTMLElement>('.list-group-item'));
    if (items.length === 0) return;
    const curIdx = items.findIndex(el => el.classList.contains('ctrl-srch-kbd-active'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const nxt = curIdx === -1 ? (dir === 1 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (curIdx >= 0) items[curIdx].classList.remove('ctrl-srch-kbd-active');
        items[nxt].classList.add('ctrl-srch-kbd-active');
        items[nxt].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        if (curIdx >= 0) { e.preventDefault(); items[curIdx].click(); }
    } else if (e.key === 'Escape') {
        ctrlSideFileSearchResultsEl.classList.add('d-none');
    }
});
document.addEventListener('click', (e) => {
    if (ctrlSideFileSearchResultsEl.classList.contains('d-none')) return;
    const t = e.target as Node;
    if (t === ctrlSideFileSearchInputEl || ctrlSideFileSearchResultsEl.contains(t)) return;
    ctrlSideFileSearchResultsEl.classList.add('d-none');
});

// ---- 전역 단축키 ----
// F1: 왼쪽 사이드바를 열고 Agent 서브탭으로 고정한다 - 꺼져 있으면(모바일 오버레이 기본 숨김이든,
// Multiplexer 드롭다운에서 강제로 꺼놨든) 켜고, 이어서 방향키로 세션 목록을 탐색할 수 있도록 포커스까지 준다.
// Shift+F1은 왼쪽 사이드바를 강제로 끔(Multiplexer 드롭다운의 "왼쪽 끄기"와 동일).
// F2: 왼쪽 사이드바를 열고 File 서브탭으로 고정한다(토글 아님 - 항상 File). Shift+F2도 왼쪽 사이드바를 강제로 끔
// (F1/F2 모두 왼쪽 사이드바가 대상이라 Shift 쪽은 같은 동작).
// F3는 그대로 More > Terminal 버튼과 동일하게 New Terminal 모달만 띄운다.
// F4: 오른쪽 사이드바를 연다(탭 고정 없이 마지막에 보던 탭 그대로). Shift+F4는 오른쪽 사이드바를 강제로 끔.
function ctrlOpenLeftSidebar() {
    if (!appSidebar) return;
    if (sbSubTab !== 'agent') { sbSubTab = 'agent'; localStorage.setItem(SB_TAB_LS, 'agent'); applySidebarSubTab(); }
    if (!tmuxSidebarVisible('left')) tmuxShowSidebar('left');
    appSidebar.focus();
}
function ctrlOpenRightSidebar() {
    if (!appSidebarRight) return;
    if (!tmuxSidebarVisible('right')) tmuxShowSidebar('right');
    appSidebarRight.focus();
}
function runControlHotkey(key: string, shift: boolean = false): boolean {
    switch (key) {
        case 'F1':
            if (shift) tmuxHideSidebar('left'); else ctrlOpenLeftSidebar();
            return true;
        case 'F2':
            if (shift) tmuxHideSidebar('left'); else {
                ctrlShowFileTab();
                // 이미 인덱싱된 루트면 검색창으로 바로 포커스를 옮겨 즉시 타이핑할 수 있게 한다.
                if (g_ctrlSideSrch.indexed && g_ctrlSideSrch.rootKey === ctrlSideSrchKey()) ctrlSideFileSearchInputEl.focus();
            }
            return true;
        case 'F3':
            if (!ctrlRequireAuthed()) return true;
            termStartNew('cmd');
            return true;
        case 'F4':
            if (shift) tmuxHideSidebar('right'); else ctrlOpenRightSidebar();
            return true;
    }
    return false;
}
// 방향키(상하좌우)는 F1으로 좌측 사이드바에 실제 포커스가 가 있을 때만 동작한다(ctrlOpenLeftSidebar가
// 끝에 appSidebar.focus()를 호출해 만들어주는 상태). 프레임(채팅/터미널/브라우저/File 등 iframe)에
// 포커스가 있을 때는 방향키가 그 프레임 본래 용도(터미널 히스토리, 텍스트 커서 이동 등)로만 쓰이고
// 사이드바를 건드리지 않는다.
function isSidebarFocused(): boolean {
    if (!appSidebar) return false;
    return document.activeElement instanceof Node && appSidebar.contains(document.activeElement);
}
// 위/아래 화살표: Agent 서브탭(agent-sidebar-list)의 세션 목록에서만 선택을 이동한다. File 서브탭은
// 세션 목록이 아니라 탐색 대상이 아니다. RDP 목록(rdp-sidebar-list, 위쪽)도 대상에서 제외.
function runControlArrowKey(dir: 1 | -1): boolean {
    if (!isSidebarFocused()) return false;
    if (sbSubTab !== 'agent') return false;
    // 접힌 그룹에 가려지지 않은(보이는) 항목만 대상으로 한다.
    const items = Array.from(agentSidebarList.querySelectorAll<HTMLElement>('.ai-session-item')).filter(el => el.offsetParent !== null);
    if (items.length === 0) return false;
    // 메인(빨강)을 현재 선택으로 보고, 없으면 서브(파랑) 중 첫 항목. 예전 클래스명도 함께 본다.
    let curIdx = items.findIndex(el => el.classList.contains('ai-session-item-active-main') || el.classList.contains('ai-session-item-active-remote'));
    if (curIdx < 0) curIdx = items.findIndex(el => el.classList.contains('ai-session-item-active-sub') || el.classList.contains('ai-session-item-active'));
    const nxt = curIdx === -1 ? 0 : Math.max(0, Math.min(items.length - 1, curIdx + dir));
    if (nxt === curIdx) return false;
    items[nxt].click();
    items[nxt].scrollIntoView({ block: 'nearest' });
    return true;
}
// 좌/우 화살표: 사이드바가 포커스된 상태에서 Agent ↔ File 서브탭을 전환한다(sb-agent-tab/sb-file-tab
// 클릭과 동일 효과). 이미 그 탭이면 아무 것도 하지 않는다.
function runControlSubTabArrowKey(dir: 1 | -1): boolean {
    if (!isSidebarFocused()) return false;
    const next: 'agent' | 'file' = dir === 1 ? 'file' : 'agent';
    if (sbSubTab === next) return false;
    sbSubTab = next;
    localStorage.setItem(SB_TAB_LS, next);
    applySidebarSubTab();
    return true;
}
// File/Memo iframe 안에서 벌어지는 keydown은 부모까지 안 올라오므로, File.ts/Memo.ts가 자체적으로
// F1~F4/F7을 잡아 'home-hotkey' postMessage로 위임한다(아래 CIframeMsg.Recv). 여기서 따로 더 걸 게 없다.
// Chat/Terminal/Browser 프레임 풀(showPooledFrame의 onCreate)에서 공용으로 쓰는 단축키 브리지.
// RDP(원격 데스크탑 제어)와 Editor(Monaco - F1은 커맨드 팔레트, 방향키는 커서 이동)는 이 키들을 가로채면
// 본래 기능이 깨지므로 일부러 연결하지 않는다.
// Terminal(같은 출처든 원격 cross-origin이든)은 Terminal.html 자체가 F1~F4를 잡아 'home-hotkey'
// postMessage로 위임하므로(File.ts/Memo.ts와 동일 패턴) 여기서 직접 가로채지 않는다 - 그대로 두면
// 같은 출처(로컬) 터미널에서 F1~F4가 두 경로로 겹쳐 들어와 두 번 실행된다. Chat/Browser는 아직 이
// 위임 로직이 없어서(같은 출처일 때만 동작) 직접 가로채기가 여전히 필요하다.
function wirePooledFrameHotkeys(f: HTMLIFrameElement, key: string) {
    const isTerm = key.startsWith('term:') || key.startsWith('term-new:');
    f.addEventListener('load', () => {
        try {
            if (!isTerm) {
                f.contentWindow?.addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4') {
                        e.preventDefault();
                        runControlHotkey(e.key, e.shiftKey);
                        return;
                    }
                    // 방향키는 사이드바가 포커스된 상태에서만 동작해야 하므로(프레임 포커스 시엔 그 프레임
                    // 본래 용도로 - 텍스트 커서 이동 등) 더 이상 이 프레임 안에서 가로채지 않는다.
                }, true);
            }
        } catch (_) {}
    });
}
document.addEventListener('keydown', (e) => {
    // 사이드바 File 탭 검색창(자동완성)에 포커스가 있을 땐 위/아래 화살표가 좌측 사이드바 세션 이동으로
    // 새지 않도록 여기서 먼저 걸러낸다. F1~F4/F7 단축키는 검색 중에도 그대로 유지.
    if (e.target === ctrlSideFileSearchInputEl && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return;
    }
    if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4') {
        e.preventDefault();
        runControlHotkey(e.key, e.shiftKey);
        return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (runControlArrowKey(e.key === 'ArrowUp' ? -1 : 1)) e.preventDefault();
    }
    // 좌/우 화살표: 사이드바 포커스 시 Agent ↔ File 서브탭 전환.
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (runControlSubTabArrowKey(e.key === 'ArrowRight' ? 1 : -1)) e.preventDefault();
    }
    // F7은 Control 자체 기능은 없지만(Terminal.html이 자기 iframe 안에서 직접 처리), 포커스가
    // Control 페이지(iframe 밖)에 있을 때 브라우저 기본 동작(예: Firefox 캐럿 브라우징 토글)이
    // 뜨는 걸 막기 위해 preventDefault만 한다. iframe 내부 keydown은 부모까지 버블링되지 않으므로
    // Terminal.html의 F7 처리에는 영향 없다.
    if (e.key === 'F7') {
        e.preventDefault();
    }
});
// File.ts/Memo.ts/Terminal.html은 자체 keydown에서 F1~F4/F7을 잡아 'home-hotkey'로 부모에 위임한다
// (shift도 함께 실어 보낸다 - F1/F2/F4는 Shift 여부로 동작이 갈린다). F7은 무시되므로(runControlHotkey가
// 모르는 키는 그냥 false를 반환) 실질적으로 F1~F4만 처리된다.
CIframeMsg.Recv({
    'home-hotkey': (data) => {
        runControlHotkey(String(data.key ?? ''), !!data.shift);
    },
});

// File 탭(File.ts)이 스스로 다른 원격으로 전환하면 이 메시지로 currentWebRootUrl을 갱신하고,
// Memo iframe에도 같은 원격을 보도록 알려준다(memoSendRemoteInfo와 동일한 단일 출처 패턴).
CIframeMsg.Recv({
    'file-remote-changed': (data) => {
        currentWebRootUrl = String(data.baseUrl ?? '');
        memoSendRemoteInfo();
        logOnServerChanged();
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
    // Editor.html(Monaco)이 Ctrl+클릭/F12로 아직 열려있지 않은 다른 파일의 정의로 이동하려 할 때 보내는
    // 요청. 원본 URL을 그냥 새 탭으로 열면 다운로드로 처리되므로, 대신 절대경로로 되돌려 새 에디터 탭을 연다.
    // 소스 iframe이 속한 세션의 baseUrl을 그대로 물려받아(로컬/원격 구분) File/Root를 조회한다.
    'editor-open-ref': (data, source) => {
        const url = String(data.url ?? '');
        if (!url) return;
        let baseUrl = '';
        for (const [key, f] of editorIframePool) {
            if (f.contentWindow !== source) continue;
            baseUrl = editorSessions.get(key)?.baseUrl ?? '';
            break;
        }
        void ctrlUrlToPath(url, baseUrl).then(path => {
            if (path) promptSourceAction(path, baseUrl, url);
        });
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
    loadAiProviderStatus();
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
    return checkAuthed(webRootUrl);
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
// 플러그인이 동적으로 추가하는 탭은 이 목록에 넣지 않는다. 플러그인 client js는 Control.js보다
// 먼저 실행되므로 여기서 ctrlRequireAuthed를 전역으로 노출해두고, 플러그인 쪽에서 이벤트 발생
// 시점에 지연 조회해 같은 가드를 걸 수 있게 한다(현재는 이를 쓰는 플러그인 탭 없음).
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
// 좌측 사이드바 하위 목록: Agent(Chat/Terminal, 경로 그룹) / File(빠른 파일 열람 패널).
// Other(Browser/Editor, 평면 최신순)는 우측 사이드바의 Other 탭(#other-sidebar-list)으로 옮겨갔다.
const agentSidebarList = CDOM.ID("agent-sidebar-list") as HTMLDivElement;
const otherSidebarList = CDOM.ID("other-sidebar-list") as HTMLDivElement;
const agentAddFolderBtn = CDOM.ID("agentAddFolderBtn") as HTMLButtonElement;
const leftFilePanel = CDOM.ID("left-file-panel") as HTMLDivElement;

// ---- 하위 탭(Agent/File) 선택 + 그룹 접힘 상태 persist ----
const SB_TAB_LS = 'ctrl.sidebar.subtab';
const SB_COLLAPSE_LS = 'ctrl.sidebar.collapsed';
function sbSafeArr(s: string | null): string[] { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a.map(String) : []; } catch { return []; } }
let sbSubTab: 'agent' | 'file' = localStorage.getItem(SB_TAB_LS) === 'file' ? 'file' : 'agent';
const collapsedGroups = new Set<string>(sbSafeArr(localStorage.getItem(SB_COLLAPSE_LS)));
function saveCollapsedGroups() { localStorage.setItem(SB_COLLAPSE_LS, JSON.stringify(Array.from(collapsedGroups))); }
function applySidebarSubTab() {
    agentSidebarList.classList.toggle('d-none', sbSubTab !== 'agent');
    agentAddFolderBtn.classList.toggle('d-none', sbSubTab !== 'agent');
    leftFilePanel.classList.toggle('d-none', sbSubTab !== 'file');
    CDOM.ID('sb-agent-tab').classList.toggle('active', sbSubTab === 'agent');
    CDOM.ID('sb-file-tab').classList.toggle('active', sbSubTab === 'file');
}
CDOM.ID('sb-agent-tab').addEventListener('click', () => { sbSubTab = 'agent'; localStorage.setItem(SB_TAB_LS, 'agent'); applySidebarSubTab(); });
CDOM.ID('sb-file-tab').addEventListener('click', () => { sbSubTab = 'file'; localStorage.setItem(SB_TAB_LS, 'file'); applySidebarSubTab(); });
applySidebarSubTab();

// ---- 상단 탭 스트립: 현재 열려 있는(서버에 존재하는) Chat/Terminal/Browser/Editor/Web 세션을 전부
// More 버튼 뒤에 한 줄로 나열한다. Agent/Other 사이드바 목록과 완전히 같은 소스(spec+sortKey)를 쓰고,
// 짧은 한 줄 라벨(shortLabel)을 쓴다. RDP는 별도 목록(rdp-sidebar-list)이라 대상에서 제외.
// 표시 순서(topTabOrder)는 기본은 sortKey(최근 활동/오픈 시각) 내림차순이지만, 탭끼리 드래그해서
// 자유롭게 재배치할 수 있다 - 한 번 순서가 정해지면 재활동으로 다시 섞이지 않도록 topTabOrder 자체가
// 그 순서의 기준이 되고, 새로 나타난 세션만 recency 규칙대로 앞쪽에 끼워 넣는다.
const topTabStripEl = CDOM.ID("top-tab-strip") as HTMLDivElement;
const TOP_TAB_ICON: Record<string, string> = { chat: 'bi-chat-dots', term: 'bi-terminal', 'term-new': 'bi-terminal', browser: 'bi-browser-chrome', editor: 'bi-file-earmark-code', web: 'bi-globe' };
const TOP_TAB_DRAG_MIME = 'application/x-control-top-tab-key';
let topTabOrder: string[] = [];
let topTabLastEntries: { key: string; sortKey: number; spec: SessionItemSpec }[] = [];
// draggedKey를 beforeKey 바로 앞으로 옮긴다(beforeKey가 null이면 맨 뒤로).
function topTabMoveTo(draggedKey: string, beforeKey: string | null) {
    const from = topTabOrder.indexOf(draggedKey);
    if (from < 0) return;
    topTabOrder.splice(from, 1);
    if (beforeKey) {
        const to = topTabOrder.indexOf(beforeKey);
        topTabOrder.splice(to < 0 ? topTabOrder.length : to, 0, draggedKey);
    } else {
        topTabOrder.push(draggedKey);
    }
    // drop 핸들러 안에서 곧바로 다시 그리면(innerHTML 초기화) 드래그 중이던 원본 탭 엘리먼트가 그 드래그
    // 시퀀스가 끝나기(dragend) 전에 DOM에서 사라져 dragend가 영영 발화하지 않는다 - 그러면
    // body.tmux-dragging이 안 풀려 Multiplexer 드롭존 오버레이가 화면 전체를 덮은 채 남아 클릭이 다 막힌다.
    // 그래서 이번 이벤트 루프가 끝나 dragend까지 처리된 뒤(setTimeout 0)로 렌더를 미룬다.
    setTimeout(() => renderTopTabStrip(topTabLastEntries), 0);
}
if (topTabStripEl) {
    // 탭 사이 빈 공간(마지막 탭 뒤 등)에 놓으면 맨 뒤로 보낸다.
    topTabStripEl.addEventListener('dragover', (ev) => {
        if (ev.dataTransfer?.types.includes(TOP_TAB_DRAG_MIME)) ev.preventDefault();
    });
    topTabStripEl.addEventListener('drop', (ev) => {
        const draggedKey = ev.dataTransfer?.getData(TOP_TAB_DRAG_MIME);
        if (!draggedKey) return;
        ev.preventDefault();
        topTabMoveTo(draggedKey, null);
    });
}
function renderTopTabStrip(entries: { key: string; sortKey: number; spec: SessionItemSpec }[]) {
    if (!topTabStripEl) return;
    topTabLastEntries = entries;
    const specByKey = new Map(entries.map(e => [e.key, e.spec] as const));
    topTabOrder = topTabOrder.filter(k => specByKey.has(k));
    const newKeys = entries.filter(e => !topTabOrder.includes(e.key)).sort((a, b) => b.sortKey - a.sortKey).map(e => e.key);
    topTabOrder = [...newKeys, ...topTabOrder];

    topTabStripEl.innerHTML = '';
    for (const key of topTabOrder) {
        const spec = specByKey.get(key);
        if (!spec) continue;
        const prefix = key.slice(0, key.indexOf(':'));
        const tab = document.createElement('div');
        // 사이드바 세션 항목과 동일하게 Multiplexer 메인 pane=빨강/서브 pane=파랑으로 표시한다.
        tab.className = 'top-tab-item d-flex align-items-center gap-1' + (spec.isActive ? ' ' + spec.activeClass : '');
        tab.title = spec.shortLabel;
        tab.innerHTML = `<i class="bi ${TOP_TAB_ICON[prefix] ?? 'bi-app'}"></i>`
            + `<span class="text-truncate">${aiEscapeHtml(spec.shortLabel)}</span>`
            + `<button type="button" class="btn-close" aria-label="Close"></button>`;
        tab.addEventListener('click', (ev) => {
            if ((ev.target as HTMLElement).closest('.btn-close')) return;
            spec.onClick();
        });
        // 사이드바 세션 항목(createSessionItem)과 동일하게, Multiplexer pane에 드래그해 놓으면 그 pane
        // 콘텐츠가 이 세션으로 바뀐다(sessionItemDragKey 참고). 동시에 탭 스트립 안의 다른 탭 위에 놓으면
        // 그 자리로 순서를 옮긴다(topTabMoveTo) - 같은 드래그가 두 목적 모두를 겸한다.
        tab.draggable = true;
        tab.addEventListener('dragstart', (ev: DragEvent) => {
            const dragKey = sessionItemDragKey(spec);
            if (dragKey) ev.dataTransfer?.setData('text/plain', dragKey);
            ev.dataTransfer?.setData(TOP_TAB_DRAG_MIME, key);
            if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copyMove';
        });
        tab.addEventListener('dragover', (ev) => {
            if (!ev.dataTransfer?.types.includes(TOP_TAB_DRAG_MIME)) return;
            ev.preventDefault();
            ev.stopPropagation();
        });
        tab.addEventListener('drop', (ev) => {
            const draggedKey = ev.dataTransfer?.getData(TOP_TAB_DRAG_MIME);
            if (!draggedKey || draggedKey === key) return;
            ev.preventDefault();
            ev.stopPropagation();
            topTabMoveTo(draggedKey, key);
        });
        tab.querySelector('.btn-close')?.addEventListener('click', (ev) => { ev.stopPropagation(); spec.onDelete(); });
        topTabStripEl.appendChild(tab);
    }
}

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

// remoteLabel이 있으면 원격 소유 그룹 - 주소를 경로 위 줄에 표시하고 원격지별 배정색 액센트(agent-group-remote)를 켠다.
interface IAgentGroupMeta { pathText: string; remoteLabel?: string; remoteId?: string; }
function updateAgentGroupHeader(el: AgentGroupEl, meta: IAgentGroupMeta) {
    const head = el.querySelector('.agent-group-head') as HTMLElement;
    head.classList.toggle('agent-group-remote', !!meta.remoteLabel);
    head.style.cssText = meta.remoteLabel ? rdpAccentStyle(meta.remoteId ?? meta.remoteLabel) : '';
    const addrEl = el.querySelector('.agent-group-addr') as HTMLElement;
    addrEl.style.display = meta.remoteLabel ? 'block' : 'none';
    addrEl.textContent = meta.remoteLabel ?? '';
    el.querySelector('.agent-group-path > span')!.textContent = meta.pathText;
}

// ---- Agent 그룹 표시 + File 탭 셀렉트 공용 경로 캐시(로컬 + 원격 각각 독립) ----
// ctrlRootOpts/ctrlRefreshRootSelect는 "지금 RDP 탭에서 보고 있는 서버 하나"(currentWebRootUrl)를
// 따라 로컬↔원격으로 통째로 바뀐다(New Chat/Terminal 기본 작업폴더·File/List RootPath 파라미터용이라 그게 맞음).
// 그 값을 Agent 그룹/File 탭 셀렉트 소스로 그대로 쓰면, 원격을 RDP에서 보는 동안 그 원격 경로가 "로컬"인 것처럼
// (prefix 없이) 한 번 더 나타나 remoteRootsCache 표시와 중복된다. 그래서 로컬 경로도 여기서
// 완전히 별도로 관리한다 - 어느 RDP 탭을 보고 있든 로컬은 로컬대로, 원격은 원격대로 항상 동시에 보인다.
async function refreshLocalRoots() {
    try {
        const data = await CFecth.Exe(CPath.WebRootUrl() + "File/Root", {}, "json") as { roots: ICtrlRootOpt[] };
        // ctrlRenderRootOpts와 동일하게 Artgine 작업경로 항목만 표시 이름을 바꿔치기한다.
        localRootOpts = (data.roots ?? []).map(r => r.name === './' ? { ...r, name: 'Artgine (WorkingPath)' } : r);
        renderSessionSidebar();
        ctrlSyncSideFileRootSel();
    } catch { /* 다음 rdpRenderList 재호출 때 재시도된다 */ }
}

async function refreshRemoteRoots(r: IRdpRemote) {
    const webRootUrl = rdpRemoteWebRootUrl(r.entryUrl);
    if (!(await rdpEnsureRemoteAuth(r))) {
        if (remoteRootsCache.delete(r.remoteId)) { renderSessionSidebar(); ctrlSyncSideFileRootSel(); }
        rdpNoteFetchFailure(r);
        return;
    }
    try {
        const token = getAuthToken(webRootUrl);
        const data = await CFecth.Exe(webRootUrl + "File/Root", token ? { token } : {}, "json") as { roots: ICtrlRootOpt[] };
        remoteRootsCache.set(r.remoteId, data.roots ?? []);
        renderSessionSidebar();
        ctrlSyncSideFileRootSel();
    } catch { rdpNoteFetchFailure(r); }
}
// RDP 목록이 다시 그려질 때마다(추가/삭제/로컬·원격 전환/초기 로드) 로컬 + 등록된 모든 원격의 경로를
// 다시 갱신한다 - 폴링이 아니라 그 시점들에서만 호출되므로 과도한 요청이 아니다.
function refreshAllRemoteRoots() { refreshLocalRoots(); rdpRemotes.forEach(refreshRemoteRoots); }

// ---- 원격 재연결 감지 ----
// 평소엔 rdpRenderList()가 사용자 조작(클릭/추가/삭제/로그인 성공)이 있을 때만 좌/우 목록을 다시
// 불러오므로, 이미 열어 둔 원격이 "죽었다가 다시 살아나는" 동안에는 아무도 다시 불러주지 않아
// 페이지를 새로고침해야만 했다. 그래서 "연결이 끊긴 원격"이 있을 때만 낮은 빈도로 재확인하다가
// 다시 응답하면(재시작으로 토큰이 죽어 있어도 rdpEnsureRemoteAuth가 저장된 비밀번호로 재로그인한다)
// 좌측 Agent 그룹 + (지금 보고 있는 원격이면) 좌측 File 패널까지 자동으로 다시 불러온다.
// 끊긴 원격이 하나도 없으면 폴링 자체가 없다 - 상시로 도는 타이머를 두지 않기 위함.
async function rdpHandleReconnect(remote: IRdpRemote) {
    await refreshRemoteRoots(remote);
    const webRootUrl = rdpRemoteWebRootUrl(remote.entryUrl);
    if (currentWebRootUrl === webRootUrl) await ctrlRefreshRootSelect();
}

const RDP_OFFLINE_POLL_MS = 15000;
let rdpOfflinePollTimer: ReturnType<typeof setInterval> | null = null;
function rdpEnsureOfflinePolling() {
    if (rdpOfflinePollTimer != null) return;
    rdpOfflinePollTimer = setInterval(async () => {
        const offlineRemotes = rdpRemotes.filter(r => rdpStatus.get(r.remoteId) === 'offline');
        if (!offlineRemotes.length) {
            clearInterval(rdpOfflinePollTimer!);
            rdpOfflinePollTimer = null;
            return;
        }
        for (const r of offlineRemotes) {
            const st = await rdpProbeRemote(r.entryUrl);
            if (!rdpRemotes.some(x => x.remoteId === r.remoteId)) continue; // 확인 중 삭제됨
            if (st === 'offline') continue; // 아직도 안 닿음 - 다음 틱에 재시도
            rdpStatus.set(r.remoteId, st);
            rdpRenderList();
            rdpHandleReconnect(r);
        }
    }, RDP_OFFLINE_POLL_MS);
}
// 원격이 완전히 오프라인으로 "새로 확정"되는 순간 그 원격 몫의 상태를 전부 지운다.
// 서버 재시작이면 토큰/터미널 프로세스/브라우저 세션이 전부 무효화되므로, 재연결됐을 때 죽은 정보를
// 그대로 보여주는 대신 빈 목록에서 새로 시작하는 게 맞다. (일시적 fetch 실패만으로는 호출하지 않음 -
// termRenderList/chatRenderList/browserRefreshList는 그런 경우 기존 프레임을 보존하도록 이미 설계돼 있다.)
function rdpClearRemoteSessions(remoteId: string) {
    remoteRootsCache.delete(remoteId);

    for (const [key, f] of Array.from(termIframePool.entries())) {
        if (!key.startsWith('term:') || keyRemoteId(key) !== remoteId) continue;
        f.remove();
        termIframePool.delete(key);
        tmuxAllFrames.delete(key);
        tmuxClearIfShowing(key);
        if (activeTermFrameKey === key) { activeTermFrameKey = null; updateTermFramePlaceholder(); }
    }
    if (lastTermSessions) lastTermSessions = lastTermSessions.filter(s => s.remoteId !== remoteId);

    for (const [key, f] of Array.from(chatIframePool.entries())) {
        if (keyRemoteId(key) !== remoteId) continue;
        f.remove();
        chatIframePool.delete(key);
        tmuxAllFrames.delete(key);
        tmuxClearIfShowing(key);
        if (activeChatFrameKey === key) { activeChatFrameKey = null; updateChatFramePlaceholder(); }
    }
    if (lastChatSessions) lastChatSessions = lastChatSessions.filter(s => s.remoteId !== remoteId);

    for (const [key, s] of Array.from(browserSessions.entries())) {
        if (s.remoteId !== remoteId) continue;
        browserSessions.delete(key);
        destroyBrowserFrame(key);
    }

    renderSessionSidebar();
}

// 어느 원격에 대한 fetch가 실패했을 때 공용으로 부른다. 실제로 끊긴 것이면 상태를 offline으로
// 갱신하고 재연결 폴링을 시작하고, 서버는 살아있는데 인증만 깨진 것이면(토큰 만료 등) 즉시
// 재연결 처리(재로그인 + 재조회)를 한다 - 이 경우는 굳이 폴링을 기다릴 필요가 없다.
async function rdpNoteFetchFailure(remote: IRdpRemote) {
    const prev = rdpStatus.get(remote.remoteId);
    const st = await rdpProbeRemote(remote.entryUrl);
    if (!rdpRemotes.some(x => x.remoteId === remote.remoteId)) return;
    if (st === prev) return; // 상태 변화 없음 - 이미 처리 중이거나 폴링이 담당
    rdpStatus.set(remote.remoteId, st);
    rdpRenderList();
    if (st === 'offline') {
        rdpClearRemoteSessions(remote.remoteId); // st!==prev가 위에서 걸러졌으므로 여긴 항상 "새로 오프라인"인 경우
        rdpEnsureOfflinePolling();
    }
    else rdpHandleReconnect(remote);
}
// chat/term/browser 세션 폴링(sessionPollLoop, 5초 주기)은 실패한 서버를 조용히 스킵하도록
// 설계돼 있어(깜빡임 방지) rdpStatus를 갱신하지 않는다. fetch가 실제 네트워크 에러로 실패했을 때만
// 여기로 흘려보내 사이드바 online/offline 표시와 세션 정리가 뒤따르게 한다.
function noteSessionFetchFailure(remoteId: string) {
    if (!remoteId) return; // 로컬은 별도 처리(ensureLocalAuth) 대상 - 여기서 다루지 않음
    const remote = rdpRemotes.find(r => r.remoteId === remoteId);
    if (remote) rdpNoteFetchFailure(remote);
}

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
type ITermSess = { token: string; mode: string; key?: string; lastMsg: string; updatedAt: number; createdAt: number; alive: boolean; busy: boolean; permPending?: boolean; workingDir?: string; remoteId: string; hidden?: boolean };
let lastChatSessions: IChatSess[] | null = null;
let lastTermSessions: ITermSess[] | null = null;

// Multiplexer에 떠 있는 세션을 사이드바에 표시한다. 메인 pane(트리에서 항상 children[0]로 내려간
// 첫 leaf, 새 세션이 들어가는 칸)은 빨강, 나머지 서브 pane은 파랑. 여러 개가 동시에 켜진다.
function tmuxPaneRole(key: string): 'main' | 'sub' | null {
    if (!tmuxTreeReady) return null;
    const mainId = tmuxFirstPaneId();
    let role: 'main' | 'sub' | null = null;
    (function walk(p: ITmuxPane) {
        if (role === 'main') return;
        if (p.split && p.children) { walk(p.children[0]); walk(p.children[1]); return; }
        if (p.contentKey !== key) return;
        role = p.id === mainId ? 'main' : 'sub';
    })(tmuxRoot);
    return role;
}
function sessActiveFromKey(key: string): { activeClass: string; isActive: boolean } {
    const role = tmuxPaneRole(key);
    return {
        activeClass: role === 'main' ? 'ai-session-item-active-main' : 'ai-session-item-active-sub',
        isActive: role != null,
    };
}
function refreshRdpHighlights() {
    for (const el of Array.from(rdpSidebarList.querySelectorAll<HTMLElement>('.ai-session-item'))) {
        const key = el.dataset.key || (el.dataset.id ? `rdp:remote:${el.dataset.id}` : '');
        if (key) applySessActiveClasses(el, sessActiveFromKey(key));
    }
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
            topTabOrder = [];
            topTabStripEl.innerHTML = '';
            renderSignInPrompt(agentSidebarList, () => { chatRenderList(); termRenderList(); browserRefreshList(); });
        }
        return;
    }
    if (sessionSidebarSignedOut) { sessionSidebarSignedOut = false; agentSidebarList.innerHTML = ''; otherSidebarList.innerHTML = ''; }

    // Agent(Chat/Terminal)와 Other(Browser/Editor)로 분리한다.
    type AgentEntry = { key: string; groupKey: string; sortKey: number; spec: SessionItemSpec };
    type OtherEntry = { key: string; sortKey: number; spec: SessionItemSpec };
    const agentEntries: AgentEntry[] = [];
    if (lastChatSessions) for (const s of lastChatSessions) agentEntries.push({ key: sessKey('chat', s.remoteId, s.sessionId), groupKey: sessionGroupKey(s.remoteId, s.workingDir), sortKey: s.updatedAt ?? 0, spec: chatItemSpec(s) });
    // s.hidden = 그 세션의 key가 카탈로그에 등록된 서브 에이전트이고 그 에이전트의 hidden 플래그가 켜져
    // 있다는 뜻(서버 onSessions가 계산해서 내려줌). key 유무가 아니라 이 플래그로 판정해야 팀장/팀
    // 자동생성 사원(카탈로그에 없어 항상 hidden=false)이 실수로 같이 숨겨지지 않는다.
    // 숨김이 켜져 있으면 목록에서 빼되, 그룹별로 몇 개가 숨었는지 세어 헤더 배지로 보여준다
    // (아예 안 보이면 "왜 없지" 하고 다시 헷갈리게 된다).
    const hiddenByGroup = new Map<string, number>();
    if (lastTermSessions) for (const s of lastTermSessions) {
        const groupKey = sessionGroupKey(s.remoteId, s.workingDir);
        if (hideSubAgentSessions && s.hidden) {
            hiddenByGroup.set(groupKey, (hiddenByGroup.get(groupKey) ?? 0) + 1);
            continue;
        }
        agentEntries.push({ key: sessKey('term', s.remoteId, s.token), groupKey, sortKey: s.updatedAt ?? 0, spec: termItemSpec(s) });
    }
    const otherEntries: OtherEntry[] = [];
    for (const s of browserSessions.values()) otherEntries.push({ key: sessKey('browser', s.remoteId, s.sessionId), sortKey: s.updatedAt ?? s.createdAt ?? 0, spec: browserItemSpec(s) });
    for (const s of editorSessions.values()) otherEntries.push({ key: s.key, sortKey: s.openedAt, spec: editorItemSpec(s) });
    for (const s of webSessions.values()) otherEntries.push({ key: s.key, sortKey: s.openedAt, spec: webItemSpec(s) });
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
    renderTopTabStrip([...agentEntries, ...otherEntries]);
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
            if (!regSet.has(k)) { regSet.add(k); registered.push(k); groupMeta.set(k, { pathText: agentGroupPathText(base), remoteLabel: remote.entryUrl, remoteId: remote.remoteId }); }
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
        if (!meta) { const pg = parseGroupKey(k); meta = { pathText: pg.pathText, remoteLabel: pg.remoteId ? remoteEntryUrl(pg.remoteId) : undefined, remoteId: pg.remoteId }; }
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
    // 세션이 원격(rdpRemotes) 것이면 그 서버의 File/Root를 조회해야 한다 — 로컬 File/Root로는
    // 원격 경로가 절대 매칭되지 않는다(refreshRemoteRoots와 동일 패턴).
    const ctx = serverCtxOf(sess?.remoteId || '') ?? localServerCtx();
    try {
        const data = await CFecth.Exe(ctx.apiUrl + "File/Root", ctx.authToken ? { token: ctx.authToken } : {}, "json") as { roots: Array<{ path: string; url: string; name: string }> };
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
        // baseUrl: 로컬은 ''(file-opened와 동일 규약), 원격은 그 서버 주소 — editorFrameSrc/editorItemSpec이
        // 이 값으로 Editor.html을 원격 오리진에서 열고 사이드바에 원격 표시(빨간 강조)를 붙인다.
        promptSourceAction(fullPath, ctx.remoteId ? ctx.apiUrl : '', url);
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

// File 탭에서 편집한 시트(csv/xlsx/xls)를 저장할 때 쓰는 업로드 헬퍼.
// File.ts의 saveEditedFile과 동일한 File/Upload API를 baseUrl 기준(로컬/원격)으로 호출한다.
async function ctrlSaveOpenedSheet(filePath: string, base64: string, baseUrl: string) {
    const fileName = filePath.split('/').pop() ?? filePath;
    const dir = filePath.slice(0, filePath.length - fileName.length);
    const webRootUrl = baseUrl || CPath.WebRootUrl();
    const token = baseUrl ? getAuthToken(baseUrl) : '';
    const up: any = { path: dir, name: [fileName], data: [base64] };
    if (token) up.token = token;
    try {
        await CFecth.Exe(webRootUrl + 'File/Upload', up, 'json');
        CAlert.Info('저장 완료');
    } catch (e: any) {
        CAlert.E('저장 실패: ' + e.message);
    }
}

// File 탭(file-opened)과 Terminal 탭(terminal-path-tapped)이 공유하는 단일 진입점.
// html/htm만 Edit·Execute 확인창을 띄우고(새 창 실행 여부 선택), sqlite/db는 ORM 뷰어,
// csv/xlsx/xls는 시트 뷰어로 열며, 그 외 소스는 기존처럼 바로 에디터로 연다.
function promptSourceAction(fullPath: string, baseUrl: string, url: string) {
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
    if (!canExecute) { editorOpenFile(fullPath, baseUrl, url); return; }

    const actions = [() => editorOpenFile(fullPath, baseUrl, url), () => executeOpenedSource(fullPath, url), () => {}];
    const labels = [L('ctrl.edit', 'Edit'), L('ctrl.execute', 'Execute'), L('ctrl.cancel', 'Cancel')];

    const confirm = new CConfirm();
    confirm.SetBody(`"${aiEscapeHtml(fullPath)}"`);
    confirm.SetConfirm(CConfirm.eConfirm.List, actions, labels);
    confirm.Open();
}

function editorItemSpec(s: IEditorSession): SessionItemSpec {
    const name = s.path.split('/').pop() || s.path;
    const dir = s.path.slice(0, s.path.length - name.length);
    const dot = s.dirty
        ? `<span class="text-warning small" title="${L('ctrl.st.modified', 'Modified (unsaved)')}">●</span>`
        : `<span class="text-success small" title="${L('ctrl.st.saved', 'Saved')}">●</span>`;
    // 원격 서버에서 연 파일이면 경로 줄 위에 원격 주소를 한 줄 더 보여준다(Agent 그룹의 agent-group-remote와 동일 규칙).
    // 사이드바 강조색(빨강/파랑)은 로컬/원격이 아니라 Multiplexer 메인/서브 pane 여부로 결정한다.
    const isRemote = !!s.baseUrl;
    const remoteId = isRemote ? (rdpRemotes.find(r => rdpRemoteWebRootUrl(r.entryUrl) === s.baseUrl)?.remoteId ?? s.baseUrl) : '';
    return {
        ...sessActiveFromKey(s.key),
        dataAttr: { name: 'key', value: s.key },
        shortLabel: name,
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
            if (f) { f.remove(); editorIframePool.delete(s.key); tmuxAllFrames.delete(s.key); tmuxClearIfShowing(s.key); }
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

// ---- Web 탭 (More > Web: 서버/세션 개념 없이 임의 URL을 그대로 iframe에 띄워 빠르게 확인만 하는 용도.
// Editor 탭과 동일 패턴 — 프레임 풀 + 클라이언트 전용 세션 목록만 있고 서버 폴링은 없다.) ----
const webIframePool = new Map<string, HTMLIFrameElement>();
let activeWebFrameKey: string | null = null;

const webFrameCtx: FramePoolCtx = {
    pool: webIframePool,
    container: tmuxIdlePool,
    getActiveKey: () => activeWebFrameKey,
    setActiveKey: (key) => { activeWebFrameKey = key; },
    updatePlaceholder: () => {},
};

function showWebFrame(key: string, src: string): HTMLIFrameElement {
    return showPooledFrame(webFrameCtx, key, src);
}

function webActivatePane() {
    activatePaneUnlessMultiplexer('web-panel-tab', 'Web');
}

interface IWebSession { key: string; url: string; openedAt: number; }
const webSessions = new Map<string, IWebSession>();

// 유튜브 watch/공유 링크는 X-Frame-Options로 iframe 삽입이 막혀 있어 임베드 전용 URL(/embed/ID)로
// 바꿔야 열린다. 사용자가 주소창에서 그대로 복사해오는 링크가 대부분 이 형태라 여기서 자동 변환한다.
function webNormalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');
        let id = '';
        let start = '';
        if (host === 'youtube.com' && u.pathname === '/watch') {
            id = u.searchParams.get('v') || '';
            start = u.searchParams.get('t') || '';
        } else if (host === 'youtu.be') {
            id = u.pathname.slice(1);
            start = u.searchParams.get('t') || '';
        }
        if (!id) return url;
        const startSec = start ? start.replace(/s$/, '') : '';
        return `https://www.youtube.com/embed/${id}${startSec ? `?start=${encodeURIComponent(startSec)}` : ''}`;
    } catch (_) {
        return url;
    }
}

function webOpenUrl(rawUrl: string) {
    const url = webNormalizeUrl(rawUrl);
    const key = `web:${genUuid()}`;
    webSessions.set(key, { key, url, openedAt: Date.now() });
    webActivatePane();
    showWebFrame(key, url);
    renderSessionSidebar();
}

function webItemSpec(s: IWebSession): SessionItemSpec {
    return {
        ...sessActiveFromKey(s.key),
        dataAttr: { name: 'key', value: s.key },
        shortLabel: s.url,
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
            if (f) { f.remove(); webIframePool.delete(s.key); tmuxAllFrames.delete(s.key); tmuxClearIfShowing(s.key); }
            if (activeWebFrameKey === s.key) activeWebFrameKey = null;
            webSessions.delete(s.key);
            renderSessionSidebar();
        },
        popup: { url: () => s.url, title: s.url, winName: `web_${s.key}` },
    };
}

// More > Web: URL 하나만 입력받아 바로 iframe으로 연다(Browser처럼 서버에 원격 브라우저 프로세스를
// 띄우는 게 아니라, 유튜브 등을 그냥 훑어보는 용도의 가벼운 미리보기).
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
        const urlInput = container.querySelector<HTMLInputElement>('#web-url')!;
        const doOpen = () => {
            let url = urlInput.value.trim();
            if (!url) return;
            if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)) url = 'https://' + url;
            modal.Close();
            webOpenUrl(url);
        };
        container.querySelector<HTMLButtonElement>('#web-open')!.addEventListener('click', doOpen);
        container.querySelector<HTMLButtonElement>('#web-cancel')!.addEventListener('click', () => modal.Close());
        urlInput.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') doOpen(); });
        setTimeout(() => urlInput.focus(), 50);
    }, 0);
});

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

function chatItemSpec(s: IChatSess): SessionItemSpec {
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
        ...sessActiveFromKey(key),
        dataAttr: { name: 'key', value: key },
        shortLabel: s.title || s.lastMsg || s.sessionId,
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
            // 원격이면 그 서버로 authToken 실어 삭제, 로컬이면 same-origin 쿠키(authedFetch)로.
            if (ctx) await fetch(ctxApiUrl(ctx, `AIChat/session?id=${s.sessionId}`), { method: 'DELETE' });
            const f = chatIframePool.get(key);
            if (f) { f.remove(); chatIframePool.delete(key); tmuxAllFrames.delete(key); tmuxClearIfShowing(key); }
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
            } catch { noteSessionFetchFailure(remoteId); /* sessions=null: 실패 서버 스킵 */ }

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
        if (f) { f.remove(); termIframePool.delete(key); tmuxAllFrames.delete(key); tmuxClearIfShowing(key); }
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

function termItemSpec(s: ITermSess): SessionItemSpec {
    const ctx = serverCtxOf(s.remoteId);
    const key = sessKey('term', s.remoteId, s.token);
    const isRemote = !!s.remoteId;
    const addr = remoteEntryUrl(s.remoteId);
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
        ...sessActiveFromKey(key),
        dataAttr: { name: 'key', value: key },
        shortLabel: s.key || s.mode || s.token,
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
            } catch { noteSessionFetchFailure(remoteId); /* sessions=null 유지: 실패한 서버는 스킵(기존 프레임 보존) */ }

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
                // tmuxAllFrames(모든 세션 iframe 통합 인덱스)도 같이 옮겨야 한다 - 안 그러면 이 iframe이
                // 여전히 옛 term-new: 키로만 등록된 채 남아서, 다음 tmuxSyncPanePositions가 "이 키는 이제
                // 어느 pane에도 배정 안 됐다"고 착각해(pane.contentKey는 이미 새 키로 바뀌었으므로) 방금
                // 정상적으로 띄운 iframe을 곧바로 다시 숨겨버린다 - 새로 만든 터미널이 잠깐 보이다 사라지는
                // 버그의 원인이었다.
                tmuxAllFrames.delete(newKey);
                tmuxAllFrames.set(key, f);
                if (activeTermFrameKey === newKey) activeTermFrameKey = key;
                // 이 세션이 지금 Multiplexer 첫 pane에 떠 있었다면(term-new:로 막 열어 승격 전이었던 경우)
                // pane.contentKey도 새 토큰 키로 맞춰준다 - 안 그러면 이후 tmuxClearIfShowing/라벨이
                // 옛 임시 키를 찾다가 어긋난다.
                let promoted = false;
                (function walk(p: ITmuxPane) {
                    if (p.split && p.children) { walk(p.children[0]); walk(p.children[1]); return; }
                    if (p.contentKey === newKey) { p.contentKey = key; promoted = true; }
                })(tmuxRoot);
                if (promoted) { tmuxSyncPanePositions(); tmuxSaveLayout(); }
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
                    if (f) { f.remove(); termIframePool.delete(key); tmuxAllFrames.delete(key); tmuxClearIfShowing(key); }
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

// Browser도 RDP와 동일하게 전용 탭이 없으므로 어느 pane이든 이 세션을 보여주고 있는지로 판단한다
// (isRdpPaneActive 참고 - 첫 pane만 보면 서브 pane에 놓았을 때 "숨김" 신호가 잘못 간다).
function isBrowserPaneActive(): boolean {
    return CDOM.ID('tmux-panel').classList.contains('active') && !!activeBrowserFrameKey && tmuxFindPaneIdByKey(activeBrowserFrameKey) !== null;
}

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
    tmuxAllFrames.delete(key);
    tmuxClearIfShowing(key);
    if (activeBrowserFrameKey === key) activeBrowserFrameKey = null;
    updateBrowserFramePlaceholder();
}

function browserActivatePane() {
    activatePaneUnlessMultiplexer('browser-panel-tab', 'Browser');
}

interface IBrowserSessionData {
    sessionId: string;
    remoteId: string;
    url: string;
    browserName: string;
    expiresAt: number;
    createdAt: number;
    updatedAt: number;
}
// 순수 데이터 캐시. DOM(사이드바 항목)은 매번 renderSessionSidebar()가 이 데이터로부터 새로 만든다.
// 키는 Chat/Terminal과 동일하게 sessKey('browser', remoteId, sessionId) — 로컬은 'browser:xxx', 원격은 'browser:remoteId:xxx'.
const browserSessions = new Map<string, IBrowserSessionData>();

function browserLoadSession(remoteId: string, sessionId: string) {
    const ctx = serverCtxOf(remoteId);
    if (!ctx) return;
    browserActivatePane();
    showBrowserFrame(sessKey('browser', remoteId, sessionId), `${ctx.artgineUrl}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}`);
    renderSessionSidebar();
}

function browserFmtTtl(expiresAt: number): string {
    const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (rem <= 0) return '−0s';
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return m > 0 ? `−${m}m${s}s` : `−${s}s`;
}

function browserItemSpec(s: IBrowserSessionData): SessionItemSpec {
    const ctx = serverCtxOf(s.remoteId);
    const key = sessKey('browser', s.remoteId, s.sessionId);
    const isRemote = !!s.remoteId;
    const addr = remoteEntryUrl(s.remoteId);
    const isLoaded = browserIframePool.has(key);
    const rel = chatFormatRelative(s.updatedAt);
    return {
        ...sessActiveFromKey(key),
        dataAttr: { name: 'key', value: key },
        shortLabel: s.url,
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

function browserAddSession(sessionId: string, url: string, browserName: string = '', expiresAt: number = 0, navigate = true, createdAt: number = Date.now(), remoteId: string = '') {
    const key = sessKey('browser', remoteId, sessionId);
    if (browserSessions.has(key)) return;
    browserSessions.set(key, { sessionId, remoteId, url, browserName, expiresAt, createdAt, updatedAt: createdAt });
    renderSessionSidebar();
    if (navigate) browserLoadSession(remoteId, sessionId);
}

async function browserRemoveSession(remoteId: string, sessionId: string) {
    const key = sessKey('browser', remoteId, sessionId);
    if (!browserSessions.has(key)) return;
    browserSessions.delete(key);
    destroyBrowserFrame(key);
    renderSessionSidebar();
    const ctx = serverCtxOf(remoteId);
    if (!ctx) return;
    try {
        await fetch(ctxApiUrl(ctx, 'PlayWright/remove'), {
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
        // 로컬 + 인증된 모든 원격을 병렬 조회하되, 서버별 응답이 오는 즉시 그 서버 몫만 반영한다(Chat/Terminal과 동일 패턴).
        const ctxs = sessionServerCtxs();
        await Promise.all(ctxs.map(async (ctx) => {
            const remoteId = ctx.remoteId;
            let sessions: { sessionId: string; currentUrl: string; browserName: string; expiresAt: number; createdAt: number; updatedAt: number }[] | null = null;
            let unauthed = false;
            try {
                const r = await ctxFetch(ctx, 'PlayWright/list');
                if (r.status === 401) unauthed = true;
                else if (r.ok) { const j = await r.json(); sessions = j.ok ? j.sessions : null; }
            } catch { noteSessionFetchFailure(remoteId); /* sessions=null: 실패한 서버는 스킵(기존 프레임 보존) */ }

            if (unauthed && !remoteId) {
                removeAuthToken(CPath.WebRootUrl());
                markLocalAuthLost();
                browserAuthState = 'signin';
                browserSessions.clear();
                renderSessionSidebar();
                return;
            }
            if (!sessions) return; // 실패/미인증 원격: 응답 못 받은 서버 항목은 그대로 유지

            browserAuthState = 'ok';
            const serverIds = new Set<string>(sessions.map(s => s.sessionId));
            for (const [key, s] of Array.from(browserSessions.entries())) {
                if (s.remoteId !== remoteId) continue; // 이 서버(remoteId) 몫만 정리
                if (!serverIds.has(s.sessionId)) { browserSessions.delete(key); destroyBrowserFrame(key); }
            }
            for (const s of sessions) {
                const key = sessKey('browser', remoteId, s.sessionId);
                const existing = browserSessions.get(key);
                if (existing) { existing.expiresAt = s.expiresAt; existing.updatedAt = s.updatedAt; }
                else browserSessions.set(key, { sessionId: s.sessionId, remoteId, url: s.currentUrl, browserName: s.browserName, expiresAt: s.expiresAt, createdAt: s.createdAt, updatedAt: s.updatedAt });
            }
            renderSessionSidebar();
        }));
    } catch (_) {}
    finally { browserListInFlight = false; }
}

function browserShowShareLink(ctx: IServerCtx | null, sessionId: string, url: string) {
    const base = ctx?.artgineUrl ?? CPath.WebRootArtgineUrl();
    showShareLinkModal(
        L('ctrl.share.browserTitle', 'Browser Share Link'),
        LF('ctrl.share.browser', 'Anyone with this link can view the session in read-only mode: <strong>{0}</strong>', aiEscapeHtml(url)),
        `${base}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}&readonly=1`
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
        const s = browserSessions.get(el.dataset.key!);
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

// Chat/Terminal/Browser/Editor/RDP 사이드바 강조는 Multiplexer 레이아웃(tmuxPaneRole) 기준.
// pane 내용이 바뀔 때마다 tmuxSaveLayout() → renderSessionSidebar/refreshRdpHighlights 가 맞춘다.

// ---- Multiplexer 패널: 센터 영역을 tmux처럼 좌우/상하로 분할해 여러 iframe을 동시에 띄운다.
// 트리는 leaf(콘텐츠 1칸)와 split(row/col 두 자식)로 구성된다. 분할/병합/콘텐츠 선택은 더 이상
// 패널 안 오버레이가 아니라 상단 Multiplexer 드롭다운(tmuxRenderMenu)에서 하므로, 패널 자체는
// 항상 "work 모드"처럼 오버레이 없이 iframe이 직접 입력을 받는다.
// 세션 iframe은 leaf(pane)의 DOM 자식이 아니다 - pane을 옮길 때마다 appendChild로 부모를 바꾸면
// Chrome이 iframe을 무조건 재로드한다(display:block/none 여부와 무관 - 실측 확인됨). 그래서 모든
// 세션 iframe은 #tmux-tree-root에 한 번만 붙이고 다시는 부모를 바꾸지 않는다. 대신 어느 pane에
// 보여줄지는 그 pane의 leaf-content 위치로 iframe 좌표(left/top/width/height)만 옮겨서 표현한다
// (tmuxSyncPanePositions). #tmux-tree-root는 overflow:hidden이라 iframe이 패널 밖으로 나갈 수 없다.
// 새 iframe을 만드는 곳은 두 군데다(tmuxEnsurePooledFrame, showPooledFrame) - 어느 쪽이든 반드시
// #tmux-tree-root에 붙이고 tmuxAllFrames에 등록해야 한다. 둘 다 pool(termIframePool 등, 타입별로
// 나뉘어 있지만 tmuxPoolForKey/FramePoolCtx가 같은 Map을 공유)에 먼저 들어간 키는 "이미 붙어있다"고
// 보고 건너뛰므로, 한쪽에서 attach를 빼먹으면 그 iframe은 pool에는 있지만 DOM에는 없는 채로 남아
// 화면에 영영 나타나지 않는다.
interface ITmuxPane {
    id: string;
    split?: 'row' | 'col';
    children?: [ITmuxPane, ITmuxPane];
    contentKey?: string | null;
}
const TMUX_LS_KEY = 'ctrl-tmux-layout-v1';
const tmuxPaneEls = new Map<string, HTMLElement>();
const tmuxTreeRoot = CDOM.ID('tmux-tree-root') as HTMLDivElement;
const tmuxTreeStruct = CDOM.ID('tmux-tree-struct') as HTMLDivElement;
// key -> 지금까지 생성된 모든 세션 iframe(어느 pane에도 배정 안 되어 숨겨진 것 포함). 풀 자체는
// 타입별로 나뉘어 있지만(termIframePool 등) "지금 화면에 보여야 하는지"를 한 번에 훑기 위한 통합 인덱스.
const tmuxAllFrames = new Map<string, HTMLIFrameElement>();

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
    tmuxRenderMenu();
    // pane 콘텐츠가 바뀌면 사이드바 강조(메인=빨강/서브=파랑)를 바로 맞춘다.
    renderSessionSidebar();
    refreshRdpHighlights();
    tmuxUpdateWideMode();
}

let tmuxRoot: ITmuxPane = tmuxLoadLayout();
tmuxTreeReady = true;

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
// "첫 번째 pane" = 트리에서 항상 children[0]를 따라 내려간 leaf. 새 세션을 열면 이 pane과 교체된다.
function tmuxFirstPaneId(): string {
    let p = tmuxRoot;
    while (p.split && p.children) p = p.children[0];
    return p.id;
}
function tmuxPoolForKey(key: string): { pool: Map<string, HTMLIFrameElement>, onCreate?: (f: HTMLIFrameElement, key: string) => void } | null {
    if (key.startsWith('term:') || key.startsWith('term-new:')) return { pool: termIframePool, onCreate: wirePooledFrameHotkeys };
    if (key.startsWith('chat:')) return { pool: chatIframePool, onCreate: wirePooledFrameHotkeys };
    if (key.startsWith('browser:')) return { pool: browserIframePool, onCreate: wirePooledFrameHotkeys };
    if (key.startsWith('editor:')) return { pool: editorIframePool };
    if (key.startsWith('web:')) return { pool: webIframePool };
    if (key.startsWith('rdp:')) return { pool: rdpIframePool };
    return null;
}
function tmuxEnsurePooledFrame(key: string): HTMLIFrameElement | null {
    const spec = tmuxPoolForKey(key);
    if (!spec) return null;
    const existing = spec.pool.get(key);
    if (existing) return existing;
    const src = tmuxKeyToSrc(key);
    if (!src) return null;
    const f = document.createElement('iframe');
    f.src = src;
    // 좌표는 tmuxSyncPanePositions가 매길 때까지 0크기로 숨겨둔다. #tmux-tree-root에 딱 한 번만
    // 붙이고 이후로는 절대 다른 부모로 옮기지 않는다(재로드 방지 - 파일 상단 주석 참고).
    f.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;border:0;display:none;';
    spec.onCreate?.(f, key);
    spec.pool.set(key, f);
    tmuxAllFrames.set(key, f);
    tmuxTreeRoot.appendChild(f);
    return f;
}
// key가 정확히 하나의 pane에만 배정되도록 강제한다. 다른 pane이 이미 이 key를 갖고 있었다면 비운다
// (안 그러면 두 pane이 같은 key를 동시에 들고 있는 상태가 남아, tmuxSyncPanePositions가 그중 트리
// 순회상 나중에 만난 pane 위치로만 iframe을 옮기고 먼저 만난 쪽은 배정된 척하지만 실제론 빈 화면인
// 핑퐁 버그가 생긴다). DOM 이동이 없으므로(좌표만 바뀜) 여기선 이동/재로드 걱정은 없다.
function tmuxAssignPaneContent(paneId: string, key: string | null): void {
    const affected = new Set<string>([paneId]);
    (function walk(p: ITmuxPane) {
        if (p.split && p.children) { walk(p.children[0]); walk(p.children[1]); return; }
        if (key && p.contentKey === key && p.id !== paneId) { p.contentKey = null; affected.add(p.id); }
    })(tmuxRoot);
    const pane = tmuxFind(tmuxRoot, paneId);
    if (pane && !pane.split) pane.contentKey = key;
    affected.forEach(tmuxRefreshEmptyState);
}
// pane의 "Empty — 콘텐츠 선택" 안내 문구를 그 pane의 현재 contentKey 상태에 맞춰 다시 그린다.
// 트리 전체를 재빌드하지 않고 contentKey만 바뀌었을 때(tmuxAssignPaneContent 등) 쓴다.
function tmuxRefreshEmptyState(paneId: string): void {
    const pane = tmuxFind(tmuxRoot, paneId);
    if (!pane || pane.split) return;
    const content = tmuxPaneEls.get(paneId)?.querySelector('.tmux-leaf-content') as HTMLElement | null;
    if (!content) return;
    content.querySelectorAll('.tmux-leaf-empty').forEach(e => e.remove());
    if (!pane.contentKey) {
        const empty = document.createElement('div');
        empty.className = 'tmux-leaf-empty';
        empty.textContent = L('ctrl.tmux.emptyPane', 'Empty — pick content from the Multiplexer menu');
        content.appendChild(empty);
    }
}
// 지금 트리 상태(어느 pane이 어느 key를 보여줘야 하는지)에 맞춰, 화면에 보여야 하는 세션 iframe들의
// 좌표를 그 pane의 leaf-content 위치로 옮기고, 어느 pane에도 배정 안 된 iframe은 숨긴다.
// pane 위치가 바뀔 수 있는 모든 경우(분할/병합/콘텐츠 변경/리사이즈)마다 호출한다.
function tmuxSyncPanePositions(): void {
    const rootRect = tmuxTreeRoot.getBoundingClientRect();
    const assignedKeys = new Set<string>();
    (function walk(p: ITmuxPane) {
        if (p.split && p.children) { walk(p.children[0]); walk(p.children[1]); return; }
        if (!p.contentKey) return;
        const f = tmuxEnsurePooledFrame(p.contentKey);
        if (!f) return;
        assignedKeys.add(p.contentKey);
        const leafContent = tmuxPaneEls.get(p.id)?.querySelector('.tmux-leaf-content') as HTMLElement | null;
        if (!leafContent) return;
        const r = leafContent.getBoundingClientRect();
        f.style.left = `${r.left - rootRect.left}px`;
        f.style.top = `${r.top - rootRect.top}px`;
        f.style.width = `${r.width}px`;
        f.style.height = `${r.height}px`;
        if (f.style.display !== 'block') { f.style.display = 'block'; postFrameVisible(f, true); }
    })(tmuxRoot);
    tmuxAllFrames.forEach((f, key) => {
        if (!assignedKeys.has(key) && f.style.display !== 'none') {
            postFrameVisible(f, false);
            f.style.display = 'none';
        }
    });
}
// 패널 크기가 바뀔 수 있는 외부 요인(창 리사이즈, 사이드바 토글 등)에 대응한다. 우리 코드가 직접
// 트리 구조를 바꾸는 경우(분할/병합/콘텐츠 변경)는 각 함수가 끝에서 tmuxSyncPanePositions를 직접
// 부르므로 이 옵저버는 그 외의 외부 리사이즈만 커버하면 된다.
new ResizeObserver(() => tmuxSyncPanePositions()).observe(tmuxTreeRoot);
function tmuxPlaceInPane(paneId: string, key: string): void {
    tmuxAssignPaneContent(paneId, key);
    tmuxSyncPanePositions();
}
// key가 이미 어느 pane(예: 분할된 두 번째 pane)에 떠 있으면 그 pane id를 돌려준다.
// 없으면 null — 이 경우에만 "첫 번째 pane과 교체" 기본 동작을 쓴다.
function tmuxFindPaneIdByKey(key: string): string | null {
    let found: string | null = null;
    (function walk(p: ITmuxPane) {
        if (found) return;
        if (p.split && p.children) { walk(p.children[0]); walk(p.children[1]); return; }
        if (p.contentKey === key) found = p.id;
    })(tmuxRoot);
    return found;
}
// _f는 호출부(showPooledFrame 등) 시그니처를 유지하기 위해 남겨뒀을 뿐 더 이상 쓰지 않는다
// (배정된 iframe은 tmuxSyncPanePositions가 알아서 찾아 좌표를 옮긴다).
function tmuxPlaceFrame(key: string, _f: HTMLIFrameElement) {
    // 이미 열려 있는 pane이 있으면(A/B 분할 상태에서 B를 다시 클릭한 경우 등) 그 pane을
    // 그대로 두고 첫 pane과 바꾸지 않는다 — 안 그러면 그 pane이 비어버린다.
    tmuxPlaceInPane(tmuxFindPaneIdByKey(key) ?? tmuxFirstPaneId(), key);
    tmuxSaveLayout();
    tmuxShowPanel();
}
// 세션이 삭제됐는데 그게 지금 화면(어느 pane이든)에 떠 있던 것이었다면 그 pane을 비운다.
// 풀에서 iframe을 지우는 각 삭제 처리부(f.remove() 직후)에서 호출한다.
function tmuxClearIfShowing(key: string) {
    let changed = false;
    (function walk(p: ITmuxPane) {
        if (p.split && p.children) { walk(p.children[0]); walk(p.children[1]); return; }
        if (p.contentKey !== key) return;
        p.contentKey = null;
        tmuxRefreshEmptyState(p.id);
        changed = true;
    })(tmuxRoot);
    if (changed) {
        tmuxSyncPanePositions();
        tmuxSaveLayout();
    }
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
        const p = parseSessKey(key); const ctx = serverCtxOf(p.remoteId);
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
        empty.textContent = L('ctrl.tmux.emptyPane', 'Empty — pick content from the Multiplexer menu');
        content.appendChild(empty);
    }
    // 사이드바 세션 아이템을 드래그해 놓는 자리. 평소엔 안 보이고(pointer-events도 안 받고) iframe을
    // 그대로 조작할 수 있다가, body.tmux-dragging일 때만(세션 아이템 드래그 시작~끝) 나타나 드롭을 받는다.
    // iframe 위에 그냥 리스너를 달면 드롭 이벤트가 iframe 내부 문서로 새서 안 잡히므로 이 오버레이가 필요하다.
    const dropzone = document.createElement('div');
    dropzone.className = 'tmux-leaf-dropzone';
    dropzone.addEventListener('dragover', (e: DragEvent) => { e.preventDefault(); dropzone.classList.add('tmux-leaf-dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('tmux-leaf-dragover'));
    dropzone.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        dropzone.classList.remove('tmux-leaf-dragover');
        const key = e.dataTransfer?.getData('text/plain');
        if (key) tmuxSetPaneContent(pane.id, key);
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
    tmuxUpdateWideMode();
}
// Multiplexer가 실제로 분할된 상태(pane 2개 이상)로 화면에 보이는 동안만 센터 컨테이너를 풀폭으로 넓힌다.
// 분할 안 된 단일 pane이거나 다른 탭을 보는 중이면 기존 폭(both 모드 1200px 캡)을 그대로 유지한다.
function tmuxUpdateWideMode() {
    const isSplit = !!(tmuxRoot.split && tmuxRoot.children);
    const isShown = CDOM.ID('tmux-panel-tab').classList.contains('active');
    document.body.classList.toggle('tmux-split-wide', isSplit && isShown);
}

// 해당 leaf를 좌우(row)/상하(col)로 분할한다. iframe은 옮기지 않는다(애초에 leaf의 DOM 자식이
// 아니므로) - tmuxSyncPanePositions가 새로 생긴 child1의 위치로 좌표만 옮겨준다.
function tmuxSplitPane(paneId: string, dir: 'row' | 'col') {
    const pane = tmuxFind(tmuxRoot, paneId);
    if (!pane || pane.split) return;
    const oldEl = tmuxPaneEls.get(pane.id);

    const child1: ITmuxPane = { id: genUuid(), contentKey: pane.contentKey ?? null };
    const child2: ITmuxPane = { id: genUuid(), contentKey: null };
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

// paneId와 그 형제를 부모 자리에서 하나의 leaf로 합친다. paneId 쪽 콘텐츠만 유지되고 형제 쪽
// (중첩된 하위 트리 포함)은 버려진다. iframe은 옮기지 않는다 - tmuxSyncPanePositions가 병합된
// leaf의 새 위치로 좌표만 옮겨준다(형제 쪽에서 버려진 세션의 iframe은 어느 pane에도 배정되지
// 않으므로 다음 sync에서 자동으로 숨겨진다 - 지워지지 않으니 나중에 다시 열어도 재로드 없음).
function tmuxMergePane(paneId: string) {
    const found = tmuxFindParent(tmuxRoot, paneId);
    if (!found || !found.parent) return; // 루트는 병합 대상 없음
    const { pane, parent } = found;
    const keptContentKey = pane.contentKey ?? null;

    const staleIds = tmuxCollectIds(parent);
    // tmuxBuildEl(new leaf)가 내부에서 tmuxPaneEls.set(parent.id, ...)로 맵을 덮어쓰기 전에
    // 옛 split 컨테이너 엘리먼트를 먼저 잡아둬야 한다(순서를 바꾸면 self-replaceWith가 되어 아무 일도 안 일어남).
    const parentEl = tmuxPaneEls.get(parent.id);
    parent.split = undefined;
    parent.children = undefined;
    parent.contentKey = keptContentKey;

    const newLeafEl = tmuxBuildEl(parent);
    parentEl?.replaceWith(newLeafEl);
    staleIds.forEach(id => { if (id !== parent.id) tmuxPaneEls.delete(id); });
    tmuxPaneEls.set(parent.id, newLeafEl);
    tmuxSyncPanePositions();
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
    if (key) tmuxEnsurePooledFrame(key);
    // 옮기려는 세션이 이미 다른 pane에 떠 있으면, 그 pane이 비어버리지 않도록 두 pane의
    // 콘텐츠를 맞바꾼다(대상 pane이 갖고 있던 콘텐츠를 원래 pane으로 되돌려준다).
    const sourcePaneId = key ? tmuxFindPaneIdByKey(key) : null;
    if (sourcePaneId && sourcePaneId !== paneId) {
        const sourcePane = tmuxFind(tmuxRoot, sourcePaneId)!;
        const displaced = pane.contentKey ?? null;
        sourcePane.contentKey = displaced;
        pane.contentKey = key;
        tmuxRefreshEmptyState(sourcePaneId);
        tmuxRefreshEmptyState(paneId);
    } else {
        tmuxAssignPaneContent(paneId, key);
    }
    tmuxSyncPanePositions();
    tmuxSaveLayout();
}

// pane의 대표 라벨(메뉴 목록/모달에 쓰임). 원격 RDP/Editor는 구체적인 대상까지 보여준다.
function tmuxPaneLabel(pane: ITmuxPane): string {
    const key = pane.contentKey;
    if (!key) return L('ctrl.tmux.emptyPane2', 'Empty');
    if (key === 'rdp:local') return 'RDP · Local';
    if (key.startsWith('rdp:remote:')) {
        const remote = rdpRemotes.find(r => r.remoteId === key.slice(11));
        return remote ? `RDP · ${remote.entryUrl}` : 'RDP';
    }
    if (key.startsWith('editor:')) {
        const s = editorSessions.get(key);
        return s ? `Editor · ${s.path.split('/').pop() || s.path}` : 'Editor';
    }
    if (key.startsWith('chat:')) return 'Chat';
    if (key.startsWith('term:')) return 'Terminal';
    if (key.startsWith('browser:')) return 'Browser';
    if (key.startsWith('web:')) {
        const s = webSessions.get(key);
        return s ? `Web · ${s.url}` : 'Web';
    }
    return key;
}
function tmuxShowPanel() {
    (window as any).bootstrap.Tab.getOrCreateInstance(CDOM.ID('tmux-panel-tab')).show();
}
CDOM.ID('tmux-panel-tab').addEventListener('shown.bs.tab', () => tmuxUpdateWideMode());
CDOM.ID('tmux-panel-tab').addEventListener('hidden.bs.tab', () => tmuxUpdateWideMode());
// 지금 그 사이드바가 실제로 보이는 상태인지(도킹 모드는 hide-* 클래스만 안 걸려 있으면 항상 보임,
// 오버레이 모드는 offcanvas의 show 클래스로 판단).
function tmuxSidebarVisible(side: 'left' | 'right'): boolean {
    if (document.body.classList.contains(side === 'left' ? 'hide-left-sidebar' : 'hide-right-sidebar')) return false;
    const el = side === 'left' ? appSidebar : appSidebarRight;
    if (!el) return false;
    if (el.classList.contains('sidebar-docked')) return true;
    return el.classList.contains('show');
}
// 사이드바 강제로 끄기(도킹/오버레이 모드 무관). 도킹 모드라 평소엔 숨겨진 햄버거 버튼을 강제로 보여줘서
// 다시 열 수단을 남긴다 - 그 버튼(왼쪽은 F1/F2, 오른쪽은 F4)으로 다시 열리는 순간 'show.bs.offcanvas'에서 원복된다.
function tmuxHideSidebar(side: 'left' | 'right') {
    const el = side === 'left' ? appSidebar : appSidebarRight;
    const wrap = side === 'left' ? sidebarToggleBtnWrap : sidebarToggleBtnWrapRight;
    document.body.classList.add(side === 'left' ? 'hide-left-sidebar' : 'hide-right-sidebar');
    if (wrap) wrap.style.display = '';
    if (el?.classList.contains('show')) (window as any).bootstrap.Offcanvas.getOrCreateInstance(el).hide();
}
function tmuxShowSidebar(side: 'left' | 'right') {
    const el = side === 'left' ? appSidebar : appSidebarRight;
    document.body.classList.remove(side === 'left' ? 'hide-left-sidebar' : 'hide-right-sidebar');
    updateSidebarMode();
    if (el && !el.classList.contains('sidebar-docked') && !el.classList.contains('show')) {
        (window as any).bootstrap.Offcanvas.getOrCreateInstance(el).show();
    }
}
function tmuxToggleSidebar(side: 'left' | 'right') {
    if (tmuxSidebarVisible(side)) tmuxHideSidebar(side); else tmuxShowSidebar(side);
}
appSidebar?.addEventListener('show.bs.offcanvas', () => { document.body.classList.remove('hide-left-sidebar'); updateSidebarMode(); });
appSidebarRight?.addEventListener('show.bs.offcanvas', () => { document.body.classList.remove('hide-right-sidebar'); updateSidebarMode(); });

// 같은 분할(split)에서 나온 두 pane은 같은 group 번호를 받는다(분할 트리 선행순회 중 split 노드를
// 만날 때마다 번호를 하나씩 새로 매기고, 그 아래 두 자식 leaf에게 그대로 물려준다). 한 번도 분할된 적
// 없는 단일 pane은 group 0(번호 표시 안 함).
function tmuxCollectLeavesGrouped(): { pane: ITmuxPane; group: number }[] {
    const out: { pane: ITmuxPane; group: number }[] = [];
    let groupSeq = 0;
    (function walk(p: ITmuxPane, group: number) {
        if (p.split && p.children) {
            const g = ++groupSeq;
            walk(p.children[0], g);
            walk(p.children[1], g);
        } else {
            out.push({ pane: p, group });
        }
    })(tmuxRoot, 0);
    return out;
}
// Multiplexer 드롭다운(#tmux-dropdown-menu) 내용을 매번 새로 그린다: 좌/우 사이드바 켜기·끄기 토글 2개
// (현재 상태에 따라 문구가 바뀐다) + 지금 트리의 leaf(pane) 목록(각각 상하/좌우 분할·병합·콘텐츠 선택
// 버튼). 레이아웃이 바뀔 때마다 tmuxSaveLayout()에서 호출되고, 드롭다운을 열 때도 다시 그려
// RDP/Editor 라벨과 사이드바 토글 문구를 최신으로 맞춘다.
// 같은 분할에서 나온 pane끼리는 같은 번호를 붙이고, 번호(그룹)가 바뀌는 경계마다 구분선을 넣어
// 어느 pane들이 같은 분할에서 나왔는지 한눈에 보이게 한다. 각 줄은 라벨이 잘리지 않도록
// 위에 라벨, 아래에 조작 버튼을 두는 2단 구성이다.
function tmuxRenderMenu() {
    const menu = CDOM.ID('tmux-dropdown-menu');
    if (!menu) return;
    const entries = tmuxCollectLeavesGrouped();

    let rowsHtml = '';
    entries.forEach((entry, i) => {
        if (i > 0 && entry.group !== entries[i - 1].group) rowsHtml += `<li><hr class="dropdown-divider"></li>`;
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
    menu.querySelectorAll<HTMLElement>('.tmux-menu-pane').forEach(row => {
        const paneId = row.dataset.paneId!;
        row.querySelector('[data-act="show"]')?.addEventListener('click', () => tmuxShowPanel());
        // 분할/병합/셀렉트는 드롭다운을 계속 열어둔 채로 이어서 조작할 수 있어야 하므로(연속 분할 등)
        // 상위(document)까지 전파되는 걸 막아 Bootstrap의 바깥 클릭 자동 닫기를 피한다.
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

// ---- Schedule management ----
// Schedule/ScheduleTab.ts로 분리됨(옵션 패널의 #schedSessionList / #sched-new-btn DOM에 직접 마운트).
// 원래 코드 위치에서 그대로 호출해 실행 순서(gAtl.Init 이후)를 보존한다.
MountScheduleTab();

// ---- Sub Agent management (옵션 패널의 Sub Agent 섹션. New 버튼 또는 목록 항목 클릭 시
// CModal로 key/provider/model/score/traits 입력폼을 띄운다. 저장은 key 기준 upsert이므로
// 신규/편집 모두 같은 Save 버튼 하나로 처리한다) ----
type AgentPermRule = { type?: string; tool?: string; command?: string };
type AgentPermissions = { allow: AgentPermRule[]; deny: AgentPermRule[] };
type SubAgentData = { key: string; provider: string; model: string; score: number; traits: string[]; workingDir: string; super: number; retryText: string; retryCount: number; permissions?: AgentPermissions; hidden?: number };

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
                    <span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(a.key)}${a.super ? ' <span class="badge bg-warning text-dark" style="font-size:0.6rem;">SUPER</span>' : ''}${a.retryCount > 0 ? ` <span class="badge bg-info text-dark" style="font-size:0.6rem;">RETRY x${a.retryCount}</span>` : ''}${a.hidden ? ' <span class="badge bg-secondary" style="font-size:0.6rem;">HIDDEN</span>' : ''}</span>
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
// 팀 하나가 자동 생성할 수 있는 사원 총 수 상한. 사원 한 명이 곧 CLI 프로세스 하나라 큰 수를 넣으면
// 머신이 주저앉는다 — 서버(CTerminalRouter의 TEAM_AUTO_MAX)도 같은 값으로 자르므로 둘을 함께 고쳐야 한다.
const TEAM_AUTO_MAX = 20;
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
            const hiddenChecked = (container.querySelector<HTMLInputElement>('#agent-hidden')!).checked;
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
                hidden: hiddenChecked ? '1' : '0',
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
//
// 사원은 두 방식을 섞어 쓴다.
//   자동(Auto Staff)   : provider/model/수량만 리스트에 담아 넘기면 서버가 이 팀 전용 사원을 즉석에서
//                        만들어 띄운다(key·권한·특성 전부 서버 몫). 팀이 끝나면 서버가 지운다.
//   수동(Manual Staff) : 우측 사이드바 → Sub Agent에 미리 등록해둔 에이전트를 골라 쓰는 기존 방식.
//                        팀보다 오래 사는 사용자 자산이라 팀 종료 시에도 지워지지 않는다.

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

        // ---- 자동 생성 사원 리스트 ----
        // 여기 담긴 항목은 "이런 사원을 이만큼 만들어라"는 주문서일 뿐이다. 실제 key 생성·권한 설정·스폰은
        // 전부 서버(onStartTeam)가 하므로 클라이언트는 provider/model/수량만 모아 그대로 넘긴다.
        const autoProvider = container.querySelector<HTMLSelectElement>('#team-auto-provider')!;
        const autoModel    = container.querySelector<HTMLSelectElement>('#team-auto-model')!;
        const autoCount    = container.querySelector<HTMLInputElement>('#team-auto-count')!;
        const autoAddBtn   = container.querySelector<HTMLButtonElement>('#team-auto-add')!;
        const autoListBox  = container.querySelector<HTMLDivElement>('#team-auto-list')!;
        const autoRows: { provider: string; model: string; count: number }[] = [];

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
            // 삭제 버튼은 매 렌더마다 새로 만들어지므로 여기서 함께 다시 연결한다.
            autoListBox.querySelectorAll<HTMLButtonElement>('.team-auto-del').forEach(btn => {
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
            // 같은 provider/model을 또 추가하면 줄을 늘리지 않고 수량만 합친다(리스트가 금방 지저분해진다).
            const provider = autoProvider.value;
            const model = autoModel.value;
            const room = TEAM_AUTO_MAX - autoTotal();
            if (room <= 0) { CAlert.E(`You can add at most ${TEAM_AUTO_MAX} auto staff.`); return; }
            const count = Math.min(Math.max(1, Math.floor(Number(autoCount.value) || 1)), room);
            const same = autoRows.find(r => r.provider === provider && r.model === model);
            if (same) same.count += count;
            else autoRows.push({ provider, model, count });
            renderAutoList();
        });

        let creating = false;
        const doCreate = async () => {
            if (creating) return;
            const goal = goalInput.value.trim();
            if (!goal) { CAlert.E(L('ctrl.msg.enterGoal', 'Enter a goal')); return; }
            const subAgents = Array.from(container.querySelectorAll<HTMLInputElement>('.team-agent-check'))
                .filter(c => c.checked).map(c => c.value);
            // 자동 생성과 수동 선택 중 어느 쪽이든 사원이 하나는 있어야 한다 - 감독은 직접 일하지 않으므로
            // 사원이 없는 팀은 아무 일도 못 한다.
            if (subAgents.length === 0 && autoRows.length === 0) { CAlert.E('Add at least one staff member (auto or manual)'); return; }

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
                    autoAgents: JSON.stringify(autoRows),
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
// Media 탭(다운로드 기능 포함)은 plugin/ControlMedia/ControlMediaClient.ts에 있다. 그 스크립트가
// import되는 시점에 자기 자신을 More 메뉴 + 탭 패널("Media")로 등록하고 마운트까지 처리한다.
// 위쪽 헤더의 CPlugin.PushPath('ControlMedia', ...) + import 두 줄을 빼면 탭 자체가 사라진다.
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












































