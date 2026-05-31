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
gPF.mVersion = "mptgpf92_2";

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
import {CBoard} from "../../artgine/server/CBoard.js";
import { CUtilWeb } from "../../artgine/util/CUtilWeb.js";
import { CStorage } from "../../artgine/system/CStorage.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CDOM } from "../../artgine/basic/CDOM.js";
import { CFecth } from "../../artgine/network/CFecth.js";
import { CPath } from "../../artgine/basic/CPath.js";
import { CFileViewer, CMDViewer, CSheetViewer, CModalStackMsg } from "../../artgine/util/CModalUtil.js";
import { CFile } from "../../artgine/system/CFile.js";
import { CWebSocket } from '../../artgine/network/CWebSocket.js';
import { CPWA } from '../../artgine/system/CPWA.js';
import { Bootstrap } from "../../artgine/basic/Bootstrap.js";


// let mdModal=new CModal("test");
// mdModal.SetBody();
// mdModal.SetTitle(CModal.eTitle.TextClose);
// mdModal.Open();



if(gPF.mServer!="webServer")
    CAlert.E("서버 세팅이 잘못되었습니다");

//CStorage.Set("privateKey",null);

CUtilWeb.Parameter("")
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

// PWA Install 버튼
if(!CPWA.IsInstalled()) {
    CDOM.ID("install-btn").style.display="";
}
CDOM.ID("install-btn").addEventListener("click",()=>{
    let msg = CPWA.Install();
    if(msg) CAlert.Info(msg);
});

let bClient=null;
CDOM.ID("board-tab").onclick=()=>{
    if(bClient==null)
    {
        bClient=new CBoard(CDOM.ID("board"),"")
        bClient.List(0,5);
    }
    
};

// Download 탭
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

// ---- AI tab: session list ----
const AI_TOKEN_KEY = 'artgine.token';

// 모든 fetch에 AI 토큰 자동 첨부 → File/AI/Terminal 인증 공유
{
    const _origFetch = window.fetch.bind(window);
    (window as any).fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
        const token = localStorage.getItem(AI_TOKEN_KEY) || '';
        if (token) {
            const headers = new Headers((init.headers as HeadersInit) || {});
            if (!headers.has('x-ai-token')) headers.set('x-ai-token', token);
            init = { ...init, headers };
        }
        return _origFetch(input, init);
    };
}

const aiFrameContainer = CDOM.ID("ai-frame-container") as HTMLDivElement;
const aiSessionList = CDOM.ID("aiSessionList");
const aiNewChatBtn = CDOM.ID("aiNewChatBtn");
let aiInited = false;

// ---- iframe pool: 세션별 iframe을 유지하고 show/hide만 토글 ----
// key 규칙: 'chat:<sid>', 'term:<port>', 'term-new:<localId>'
const iframePool = new Map<string, HTMLIFrameElement>();
let activeFrameKey: string | null = null;
let pendingNewSid: string | null = null; // 서버에 아직 없는 새 세션 (첫 메시지 전)

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


function showFrame(key: string, src: string): HTMLIFrameElement {
    let f = iframePool.get(key);
    if (!f) {
        f = document.createElement('iframe');
        f.src = src;
        f.setAttribute('allow', 'clipboard-read; clipboard-write');
        f.style.display = 'none';
        f.addEventListener('load', () => {
            const isTerm = key.startsWith('term:') || key.startsWith('term-new:');
            try {
                f!.contentWindow?.addEventListener('keydown', (e) => {
                    if (!isTerm && e.key === 'Tab') { e.preventDefault(); handleTabKey(); return; }
                    if (e.key === 'F2') { e.preventDefault(); FileSearch(); }
                    else if (e.key === 'F3') {
                        e.preventDefault();
                        const fileTabEl = document.getElementById('file-tab') as HTMLElement;
                        if (fileTabEl) (window as any).bootstrap.Tab.getOrCreateInstance(fileTabEl).show();
                        FolderCD('/');
                    } else if (e.key === 'F4') {
                        e.preventDefault();
                        const aiTabEl = document.getElementById('ai-tab') as HTMLElement;
                        if (aiTabEl) (window as any).bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
                    }
                }, true);
            } catch (_) {}
        });
        aiFrameContainer.appendChild(f);
        iframePool.set(key, f);
    }
    if (activeFrameKey && activeFrameKey !== key) {
        const prev = iframePool.get(activeFrameKey);
        if (prev) prev.style.display = 'none';
    }
    f.style.display = 'block';
    activeFrameKey = key;
    return f;
}

function destroyFrame(key: string) {
    const f = iframePool.get(key);
    if (!f) return;
    f.remove();
    iframePool.delete(key);
    if (activeFrameKey === key) activeFrameKey = null;
}

function uuidv4(): string {
    if (crypto && 'randomUUID' in crypto) return (crypto as any).randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function aiAuthedFetch(url: string, init?: RequestInit): Promise<Response> {
    const token = localStorage.getItem(AI_TOKEN_KEY) || '';
    const headers = new Headers((init?.headers as HeadersInit) || {});
    if (token) headers.set('x-ai-token', token);
    return fetch(url, { ...init, headers });
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
    return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}

function aiLoadSession(sid: string) {
    showFrame(`chat:${sid}`, `./AI/AIChat.html?session=${encodeURIComponent(sid)}`);
    aiRefreshSessions();
    termRefreshSessions();
}

async function aiRefreshSessions() {
    const token = localStorage.getItem(AI_TOKEN_KEY);
    if (!token) {
        aiSessionList.innerHTML = '<div class="text-center text-secondary small p-3">Please sign in from AI Chat first.</div>';
        return;
    }
    try {
        const r = await aiAuthedFetch(CPath.PHPC() + 'ai/chat/sessions?limit=30');
        if (r.status === 401) {
            localStorage.removeItem(AI_TOKEN_KEY);
            fileAuthed = false;
            aiShowAuthOrLoad();
            return;
        }
        const j = await r.json();
        if (!j.ok) return;
        // DOM 지우기 전에 노란점(처리 중)이었던 세션 수집
        const prevYellowChat = new Set<string>();
        aiSessionList.querySelectorAll<HTMLElement>('[data-sid]').forEach(el => {
            if (el.querySelector('.ai-busy-dot')) prevYellowChat.add(el.dataset.sid!);
        });
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
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
                + (isActive ? ' bg-primary-subtle' : '');
            item.dataset.sid = s.sessionId;
            const rel = aiFormatRelative(s.updatedAt);
            let dot: string;
            if (!isLoaded) {
                dot = '<span class="text-danger small" title="미연결">●</span>';
            } else if (s.busy) {
                dot = '<span class="ai-busy-dot text-warning small" title="처리 중">●</span>';
            } else {
                if (prevYellowChat.has(s.sessionId) && (!isActiveFrame(key) || !document.hasFocus())) {
                    _showDoneNotification(aiEscapeHtml(s.title), s.lastMsg ? aiEscapeHtml(s.lastMsg) : undefined, () => aiLoadSession(s.sessionId));
                }
                dot = '<span class="text-warning small" title="대기 중">●</span>';
            }
            item.innerHTML = `
                <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
                    ${dot}
                    ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
                </span>
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    <span class="text-truncate small">${aiEscapeHtml(s.title)}</span>
                    ${s.workingDir ? `<span class="text-secondary" style="font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;">${aiEscapeHtml(s.workingDir)}</span>` : ''}
                </span>
                <button class="ai-popup-btn btn btn-sm btn-link text-secondary p-0" title="Options">
                    <i class="bi bi-box-arrow-up-right"></i>
                </button>
            `;
            item.addEventListener('click', () => aiLoadSession(s.sessionId));
            item.querySelector('.ai-popup-btn')!.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                const btn = e.currentTarget as HTMLElement;
                const existing = document.getElementById('ai-session-dropdown');
                if (existing) existing.remove();
                const drop = document.createElement('div');
                drop.id = 'ai-session-dropdown';
                drop.style.cssText = 'position:fixed;z-index:9999;background:#2a2a2a;border:1px solid #555;border-radius:6px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.5);min-width:160px;';
                drop.innerHTML = `
                    <button class="d-block w-100 text-start btn btn-sm text-light px-3 py-2" data-act="link">🔗 Share Link</button>
                    <button class="d-block w-100 text-start btn btn-sm text-danger px-3 py-2" data-act="delete">🗑️ Delete Session</button>
                `;
                const rect = btn.getBoundingClientRect();
                drop.style.top = (rect.bottom + 4) + 'px';
                drop.style.left = rect.left + 'px';
                document.body.appendChild(drop);
                drop.querySelectorAll('button').forEach(b => {
                    b.addEventListener('click', async () => {
                        drop.remove();
                        if (b.dataset.act === 'delete') {
                            if (!confirm(`Delete "${s.title}"?`)) return;
                            await aiAuthedFetch(`${CPath.PHPC()}ai/chat/session?id=${s.sessionId}`, { method: 'DELETE' });
                            destroyFrame(key);
                            aiRefreshSessions();
                            termRefreshSessions();
                        } else if (b.dataset.act === 'link') {
                            aiShowShareLink(s.sessionId, s.title);
                        }
                    });
                });
                const close = (ev: MouseEvent) => {
                    if (!drop.contains(ev.target as Node)) { drop.remove(); document.removeEventListener('click', close); }
                };
                setTimeout(() => document.addEventListener('click', close), 0);
            });
            item.addEventListener('mouseenter', () => { if (!isActive) item.classList.add('bg-body-secondary'); });
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
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
        <p class="fw-semibold mb-3">옵션</p>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">Working Directory</label>
            <input id="chat-opt-workingDir" type="text" class="form-control form-control-sm" placeholder="e.g. D:/MyProject" autocomplete="off">
        </div>
        <div class="mb-3 d-flex gap-4">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="chat-opt-allow" checked>
                <label class="form-check-label small text-secondary" for="chat-opt-allow">Allow working dir write</label>
            </div>
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
        const allowCheck      = container.querySelector<HTMLInputElement>('#chat-opt-allow')!;
        const mcpCheck        = container.querySelector<HTMLInputElement>('#chat-opt-mcp')!;
        const mdcopyCheck     = container.querySelector<HTMLInputElement>('#chat-opt-mdcopy')!;
        const workingDirInput = container.querySelector<HTMLInputElement>('#chat-opt-workingDir')!;
        if (initialWorkingDir) workingDirInput.value = initialWorkingDir;

        const doOpen = () => {
            const sid = uuidv4();
            const workingDir = workingDirInput.value.trim();
            const params = new URLSearchParams({ session: sid });
            if (!mcpCheck.checked) params.set('mcp', '0');
            if (workingDir) params.set('workingDir', workingDir);
            if (allowCheck.checked) params.set('allow', '1');
            if (mdcopyCheck.checked) params.set('mdcopy', '1');
            pendingNewSid = sid;
            showFrame(`chat:${sid}`, `./AI/AIChat.html?${params.toString()}`);
            aiRefreshSessions();
            termRefreshSessions();
            refreshSessionsSoon();
            modal.Close();
        };

        container.querySelector<HTMLButtonElement>('#chat-modal-open')!.addEventListener('click', doOpen);
        container.querySelector<HTMLButtonElement>('#chat-modal-cancel')!.addEventListener('click', () => modal.Close());
        workingDirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doOpen(); });
    }, 100);
}

// ---- Terminal session management ----
const CMD_TOKEN_KEY = 'artgine.token';
const termNewBtn = CDOM.ID("termNewBtn");
const termSessionList = CDOM.ID("termSessionList");
let termActivePort: number | null = null;




function termAuthedFetch(url: string, init?: RequestInit): Promise<Response> {
    const token = localStorage.getItem(CMD_TOKEN_KEY) || '';
    const headers = new Headers((init?.headers as HeadersInit) || {});
    if (token) headers.set('x-cmd-token', token);
    return fetch(url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token), { ...init, headers });
}

async function termStartNew(_mode: 'cmd' | 'claude' | 'gemini' | 'codex' | 'antigravity' = 'cmd', initialWorkingDir?: string) {
    const token = localStorage.getItem(CMD_TOKEN_KEY);
    if (token) {
        try {
            const r = await termAuthedFetch(CPath.PHPC() + 'cmd/sessions');
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
        <p class="fw-semibold mb-3">옵션</p>
        <div class="mb-3 d-flex gap-2 flex-wrap">
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="cmd">cmd</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="claude">claude</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="gemini">gemini</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="codex">codex</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="antigravity">agy</button>
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
                <input class="form-check-input" type="checkbox" id="term-opt-allow">
                <label class="form-check-label small text-secondary" for="term-opt-allow">Allow working dir write</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="term-opt-mcp" checked>
                <label class="form-check-label small text-secondary" for="term-opt-mcp">MCP</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="term-opt-mdcopy">
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
        const allowCheck  = container.querySelector<HTMLInputElement>('#term-opt-allow')!;
        const mcpCheck    = container.querySelector<HTMLInputElement>('#term-opt-mcp')!;
        const mdcopyCheck = container.querySelector<HTMLInputElement>('#term-opt-mdcopy')!;

        const updateModeUI = (mode: string) => {
            selectedMode = mode;
            modeButtons.forEach(b => {
                b.classList.toggle('btn-primary', b.dataset.mode === mode);
                b.classList.toggle('btn-outline-secondary', b.dataset.mode !== mode);
            });
            allowCheck.disabled = mode === 'cmd';
            if (mode === 'cmd') allowCheck.checked = false;
        };

        modeButtons.forEach(b => b.addEventListener('click', () => updateModeUI(b.dataset.mode!)));
        updateModeUI(selectedMode);

        const keyInput        = container.querySelector<HTMLInputElement>('#term-opt-key')!;
        const workingDirInput = container.querySelector<HTMLInputElement>('#term-opt-workingDir')!;
        if (initialWorkingDir) workingDirInput.value = initialWorkingDir;
        const openBtn   = container.querySelector<HTMLButtonElement>('#term-modal-open')!;
        const cancelBtn = container.querySelector<HTMLButtonElement>('#term-modal-cancel')!;

        const doOpen = async () => {
            const key        = keyInput.value.trim();
            const workingDir = workingDirInput.value.trim();
            const params = new URLSearchParams({ mode: selectedMode });
            if (key)        params.set('key', key);
            if (workingDir) params.set('workingDir', workingDir);
            if (allowCheck.checked) params.set('allow', '1');
            if (!mcpCheck.checked) params.set('mcp', '0');
            if (mdcopyCheck.checked) params.set('mdcopy', '1');
            modal.Close();
            try {
                const r = await termAuthedFetch(CPath.PHPC() + 'cmd/start-ttyd?' + params.toString());
                const j = await r.json();
                if (!j.ok) { alert(j.msg || 'Failed to start terminal'); return; }
                const key = `term-new:${Date.now()}`;
                showFrame(key, `${CPath.PHPC()}cmd/terminal-proxy?port=${j.port}`);
                aiRefreshSessions();
                termRefreshSessions();
                refreshSessionsSoon();
            } catch (e) {
                console.error('[Terminal] start-ttyd error:', e);
                alert('Failed to start terminal');
            }
        };

        openBtn.addEventListener('click', doOpen);
        cancelBtn.addEventListener('click', () => modal.Close());
        workingDirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doOpen(); });
    }, 100);
}

async function termConnectSession(port: number) {
    const key = `term:${port}`;
    // 이미 풀에 있으면 그대로 보여주고 끝
    if (iframePool.has(key)) {
        showFrame(key, '');
        aiRefreshSessions();
        termRefreshSessions();
        return;
    }
    showFrame(key, `${CPath.PHPC()}cmd/terminal-proxy?port=${port}`);
    aiRefreshSessions();
    termRefreshSessions();
}

async function termKillSession(port: number) {
    try {
        const r = await termAuthedFetch(`${CPath.PHPC()}cmd/kill-session?port=${port}`);
        const j = await r.json();
        if (!j.ok) { alert(`삭제 실패: ${j.msg || 'unknown error'}`); return; }
        termRefreshSessions();
        aiRefreshSessions();
    } catch (e) { console.error('termKillSession error:', e); }
}

async function termRefreshSessions() {
    try {
        const r = await fetch(CPath.PHPC() + 'cmd/sessions');
        const j = await r.json();
        if (!j.ok) return;
        // DOM 지우기 전에 노란점(처리 중)이었던 포트 수집
        const prevYellowTerm = new Set<number>();
        termSessionList.querySelectorAll<HTMLElement>('[data-port]').forEach(el => {
            if (el.querySelector('.term-busy-dot')) prevYellowTerm.add(Number(el.dataset.port));
        });
        termSessionList.innerHTML = '';
        const sessions = j.sessions as { port: number; mode: string; key?: string; lastLine: string; lastCmd: string; lastActivity: number; createdAt: number; alive: boolean; lineChanged: boolean; workingDir?: string }[];
        const serverPorts = new Set(sessions.map(s => s.port));
        for (const key of Array.from(iframePool.keys())) {
            if (!key.startsWith('term:')) continue;
            if (!serverPorts.has(parseInt(key.slice(5), 10))) destroyFrame(key);
        }
        // term-new: 프레임을 실제 포트 키로 승격 (가장 최근 생성된 새 세션에만 매칭)
        const termNewKeys = Array.from(iframePool.keys()).filter(k => k.startsWith('term-new:'));
        if (termNewKeys.length > 0) {
            const newSessions = sessions.filter(s => !iframePool.has(`term:${s.port}`));
            if (newSessions.length > 0) {
                const newest = newSessions.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
                const key = `term:${newest.port}`;
                const newKey = termNewKeys[0];
                const f = iframePool.get(newKey)!;
                iframePool.delete(newKey);
                iframePool.set(key, f);
                if (activeFrameKey === newKey) activeFrameKey = key;
            }
        }
        for (const s of sessions) {
            const key = `term:${s.port}`;
            const isActive = activeFrameKey === key;
            const isLoaded = iframePool.has(key);
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
                + (isActive ? ' bg-success-subtle' : '');
            item.dataset.port = String(s.port);
            const rel = aiFormatRelative(s.lastActivity);
            const preview = aiEscapeHtml(s.lastCmd || s.lastLine || '(empty)');
            const dotLabel = s.mode.slice(0, 3);
            const dotTitle = s.key || s.mode;
            let dot: string;
            if (!s.alive || !isLoaded) {
                dot = `<span class="badge rounded-pill bg-danger" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`;
            } else if (s.lineChanged) {
                dot = `<span class="badge rounded-pill bg-warning term-busy-dot" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`;
            } else {
                if (prevYellowTerm.has(s.port) && (!isActiveFrame(key) || !document.hasFocus())) {
                    const rawPreview = s.lastCmd || s.lastLine || '';
                    _showDoneNotification(`${s.key || s.mode}: ${rawPreview}`.trimEnd(), rawPreview ? preview : undefined, () => termConnectSession(s.port));
                }
                dot = `<span class="badge rounded-pill bg-success" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`;
            }
            item.innerHTML = `
                <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:1.5rem;">
                    ${dot}
                    ${rel ? `<span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${rel}</span>` : ''}
                </span>
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    ${s.key ? `<span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(s.key)}</span>` : ''}
                    <span class="text-truncate small">${preview}</span>
                    ${s.workingDir ? `<span class="text-secondary" style="font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;">${aiEscapeHtml(s.workingDir)}</span>` : ''}
                </span>
                <button class="term-popup-btn btn btn-sm btn-link text-secondary p-0" title="팝업으로 열기">
                    <i class="bi bi-box-arrow-up-right"></i>
                </button>
            `;
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => termConnectSession(s.port));
            item.querySelector('.term-popup-btn')!.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                const btn = e.currentTarget as HTMLElement;
                const existing = document.getElementById('term-popup-dropdown');
                if (existing) existing.remove();
                const drop = document.createElement('div');
                drop.id = 'term-popup-dropdown';
                drop.style.cssText = 'position:fixed;z-index:9999;background:#2a2a2a;border:1px solid #555;border-radius:6px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.5);min-width:160px;';
                drop.innerHTML = `
                    <button class="d-block w-100 text-start btn btn-sm text-light px-3 py-2" data-act="modal">📄 Open in Modal</button>
                    <button class="d-block w-100 text-start btn btn-sm text-light px-3 py-2" data-act="window">🪟 Open in New Window</button>
                    <button class="d-block w-100 text-start btn btn-sm text-light px-3 py-2" data-act="link">🔗 Share Link</button>
                    <button class="d-block w-100 text-start btn btn-sm text-danger px-3 py-2" data-act="kill">🗑️ Delete Session</button>
                `;
                const rect = btn.getBoundingClientRect();
                drop.style.top = (rect.bottom + 4) + 'px';
                drop.style.left = rect.left + 'px';
                document.body.appendChild(drop);
                drop.querySelectorAll('button').forEach(b => {
                    b.addEventListener('click', () => {
                        drop.remove();
                        if (b.dataset.act === 'kill') {
                            termKillSession(s.port);
                        } else if (b.dataset.act === 'link') {
                            termShowShareLink(s.port);
                        } else {
                            termOpenPopup(s.port, b.dataset.act === 'window');
                        }
                    });
                });
                const close = (ev: MouseEvent) => {
                    if (!drop.contains(ev.target as Node)) { drop.remove(); document.removeEventListener('click', close); }
                };
                setTimeout(() => document.addEventListener('click', close), 0);
            });
            item.addEventListener('mouseenter', () => { if (!isActive) item.classList.add('bg-body-secondary'); });
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
            termSessionList.appendChild(item);
        }
    } catch (e) { console.error('Terminal session list error:', e); }
}

function termShowShareLink(port: number) {
    const shareUrl = `${CPath.PHPC()}cmd/terminal-proxy?port=${port}`;
    const uid = `ts_${Date.now()}`;
    const modal = new CModal();
    modal.SetHeader('Terminal Share Link');
    modal.SetBody(`
        <div class="mb-2 small text-secondary">Anyone with this link can view the terminal in read-only mode.</div>
        <div class="input-group">
            <input id="${uid}" type="text" class="form-control form-control-sm" readonly value="${shareUrl}" onclick="this.select()">
            <button class="btn btn-outline-secondary btn-sm" title="Copy"
                onclick="var i=document.getElementById('${uid}');i.select();document.execCommand('copy');this.innerHTML='<i class=\\'bi bi-check2\\'></i>';setTimeout(()=>this.innerHTML='<i class=\\'bi bi-clipboard\\'></i>',1500)">
                <i class="bi bi-clipboard"></i>
            </button>
        </div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.Open(CModal.ePos.Center);
}

function aiShowShareLink(sessionId: string, title: string) {
    const base = location.pathname.replace(/\/[^/]+$/, '');
    const shareUrl = `${location.origin}${base}/AI/AIChat.html?share=${encodeURIComponent(sessionId)}`;
    const uid = `as_${Date.now()}`;
    const modal = new CModal();
    modal.SetHeader('AI Chat Share Link');
    modal.SetBody(`
        <div class="mb-2 small text-secondary">Anyone with this link can view the chat: <strong>${title}</strong></div>
        <div class="input-group">
            <input id="${uid}" type="text" class="form-control form-control-sm" readonly value="${shareUrl}" onclick="this.select()">
            <button class="btn btn-outline-secondary btn-sm" title="Copy"
                onclick="var i=document.getElementById('${uid}');i.select();document.execCommand('copy');this.innerHTML='<i class=\\'bi bi-check2\\'></i>';setTimeout(()=>this.innerHTML='<i class=\\'bi bi-clipboard\\'></i>',1500)">
                <i class="bi bi-clipboard"></i>
            </button>
        </div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.Open(CModal.ePos.Center);
}

async function termOpenPopup(port: number, newWindow = false) {
    if (newWindow) {
        window.open(
            `${CPath.PHPC()}cmd/terminal-proxy?port=${port}`,
            `term_${port}`,
            'width=900,height=600,toolbar=no,menubar=no,location=no,status=no'
        );
        return;
    }
    try {
        const modal = new CModal(null);
        modal.SetCloseToHide(false);
        modal.SetResize(true);
        modal.SetTitle(CModal.eTitle.TextClose);
        modal.SetHeader('Terminal');
        modal.SetBody(
            `<div style="position:relative;width:100%;height:100%;">` +
            `<iframe src="${CPath.PHPC()}cmd/terminal-proxy?port=${port}" style="width:100%;height:100%;border:none;display:block;"></iframe>` +
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
    } catch (e) { console.error('Terminal popup error:', e); }
}

termNewBtn.addEventListener('click', () => termStartNew('cmd'));

// ---- Schedule management ----
const schedNewBtn   = CDOM.ID("schedNewBtn");
const schedSessionList = CDOM.ID("schedSessionList");

type ScheduleData = { name: string; terminalKey: string; mode: string; delay: number; count: number; start: number; end: number; command: string; cwd?: string; allow?: boolean; mcp?: boolean; mdcopy?: boolean };

function schedIntervalStr(s: ScheduleData): string {
    const parts: string[] = [`${s.delay}s`];
    if (s.count > 0) parts.push(`×${s.count}`);
    if (s.start > 0) parts.push(`+${s.start}s`);
    if (s.end > 0)   parts.push(`~${s.end}s`);
    return parts.join(' ');
}

async function schedRefresh() {
    try {
        const r = await termAuthedFetch(CPath.PHPC() + 'cmd/schedules');
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
                    <span class="badge rounded-pill ${s.mode==='none'?'bg-secondary':s.mode==='cmd'?'bg-info':s.mode==='claude'?'bg-warning text-dark':s.mode==='gemini'?'bg-success':s.mode==='codex'?'bg-primary':'bg-danger'}" style="font-size:0.65rem;">${s.mode==='antigravity'?'agy':s.mode}</span>
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
                await termAuthedFetch(`${CPath.PHPC()}cmd/schedule-del?name=${encodeURIComponent(s.name)}`);
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
                <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="gemini">gemini</button>
                <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="codex">codex</button>
                <button class="sched-mode-btn btn btn-sm btn-outline-secondary" data-mode="antigravity">agy</button>
            </div>
        </div>
        <div class="mb-2">
            <div class="d-flex gap-2">
                <div class="flex-fill">
                    <label class="form-label small text-secondary mb-1">Delay (sec)</label>
                    <input id="sched-delay" type="number" min="1" class="form-control form-control-sm" placeholder="e.g. 60" value="${existing?.delay ?? 60}">
                </div>
                <div class="flex-fill">
                    <label class="form-label small text-secondary mb-1">Count (0=infinite)</label>
                    <input id="sched-count" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.count ?? 0}">
                </div>
            </div>
        </div>
        <div class="mb-2">
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

        const doSave = async () => {
            const name    = (container.querySelector<HTMLInputElement>('#sched-name')!).value.trim();
            const tkey    = (container.querySelector<HTMLInputElement>('#sched-tkey')!).value.trim();
            const command = (container.querySelector<HTMLTextAreaElement>('#sched-cmd')!).value.trim();
            const delay = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-delay')!).value) || 0);
            const count = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-count')!).value) || 0);
            const start = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-start')!).value) || 0);
            const end   = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-end')!).value) || 0);
            const cwd    = (container.querySelector<HTMLInputElement>('#sched-cwd')!).value.trim();
            const allow  = (container.querySelector<HTMLInputElement>('#sched-allow')!).checked;
            const mcp    = (container.querySelector<HTMLInputElement>('#sched-mcp')!).checked;
            const mdcopy = (container.querySelector<HTMLInputElement>('#sched-mdcopy')!).checked;
            if (!name || !tkey || !command) { alert('Name, terminal key, and command are required'); return; }
            if (delay === 0) { alert('Delay must be at least 1 second'); return; }
            const params = new URLSearchParams({ name, terminalKey: tkey, mode: selectedMode, command,
                delay: String(delay), count: String(count), start: String(start), end: String(end),
                allow: allow ? '1' : '0', mcp: mcp ? '1' : '0', mdcopy: mdcopy ? '1' : '0' });
            if (cwd) params.set('cwd', cwd);
            const r = await termAuthedFetch(`${CPath.PHPC()}cmd/schedule-set?${params.toString()}`);
            const j = await r.json();
            if (!j.ok) { alert(j.msg || 'Failed'); return; }
            modal.Close();
            schedRefresh();
        };

        container.querySelector<HTMLButtonElement>('#sched-modal-save')!.addEventListener('click', doSave);
        container.querySelector<HTMLButtonElement>('#sched-modal-cancel')!.addEventListener('click', () => modal.Close());
    }, 100);
}

schedNewBtn.addEventListener('click', () => schedOpenModal());


// AI 탭 active 시 5초마다 채팅·터미널·스케줄 목록 갱신
setInterval(() => {
    if (CDOM.ID("ai-panel").classList.contains("show")) {
        aiRefreshSessions();
        termRefreshSessions();
        schedRefresh();
    }
}, 5000);

// Listen for session changes from iframe
window.addEventListener('message', (e) => {
    if (e.data?.type === 'ai-sessions-changed') {
        pendingNewSid = null; // 서버에 세션이 생성됐으므로 보호 해제
        aiRefreshSessions();
    }
    if (e.data?.type === 'terminal-tab-key') {
        handleTabKey();
    }
    if (e.data?.type === 'home-hotkey') {
        const k = e.data.key as string;
        if (k === 'F2') FileSearch();
        else if (k === 'F3') {
            const fileTabEl = document.getElementById('file-tab') as HTMLElement;
            if (fileTabEl) (window as any).bootstrap.Tab.getOrCreateInstance(fileTabEl).show();
            FolderCD('/');
        } else if (k === 'F4') {
            const aiTabEl = document.getElementById('ai-tab') as HTMLElement;
            if (aiTabEl) (window as any).bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
        }
    }
});

function handleTabKey() {
    if (_activeNotifCallback) {
        const cb = _activeNotifCallback;
        _activeNotifCallback = null;
        cb();
    } else {
        toggleSidebar();
    }
}

// ---- sidebar collapse toggle ----
const AI_SIDEBAR_COLLAPSED_KEY = 'ai.sidebarCollapsed';
const aiSidebarEl = CDOM.ID("ai-sidebar") as HTMLDivElement;
const aiSidebarToggleBtn = CDOM.ID("aiSidebarToggle") as HTMLButtonElement;

function applySidebarCollapsed(collapsed: boolean) {
    aiSidebarEl.classList.toggle('collapsed', collapsed);
    const icon = aiSidebarToggleBtn.querySelector('i');
    if (icon) {
        icon.className = collapsed ? 'bi bi-layout-sidebar' : 'bi bi-layout-sidebar-inset';
    }
}
applySidebarCollapsed(false);
function toggleSidebar() {
    const next = !aiSidebarEl.classList.contains('collapsed');
    localStorage.setItem(AI_SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
    applySidebarCollapsed(next);
}
aiSidebarToggleBtn.addEventListener('click', toggleSidebar);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        if (!document.getElementById('ai-panel')?.classList.contains('active')) return;
        e.preventDefault();
        handleTabKey();
        return;
    }
    if (e.key === 'F2') {
        e.preventDefault();
        FileSearch();
    } else if (e.key === 'F3') {
        e.preventDefault();
        const fileTabEl = document.getElementById('file-tab') as HTMLElement;
        if (fileTabEl) (window as any).bootstrap.Tab.getOrCreateInstance(fileTabEl).show();
        FolderCD('/');
    } else if (e.key === 'F4') {
        e.preventDefault();
        const aiTabEl = document.getElementById('ai-tab') as HTMLElement;
        if (aiTabEl) (window as any).bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
    }
});

// ---- Auth overlay ----
const aiAuthOverlay = CDOM.ID("ai-auth-overlay") as HTMLDivElement;
const aiAuthPwInput = CDOM.ID("aiAuthPwInput") as HTMLInputElement;
const aiAuthMsg     = CDOM.ID("aiAuthMsg") as HTMLElement;
const aiAuthSubmitBtn = CDOM.ID("aiAuthSubmitBtn") as HTMLButtonElement;

async function aiCheckAuth(): Promise<boolean> {
    const token = localStorage.getItem(AI_TOKEN_KEY) || '';
    if (!token) return false;
    try {
        const j = await CFecth.Exe(CPath.PHPC() + "auth/check", { token }, "json") as any;
        return !!j?.ok;
    } catch { return false; }
}

async function aiShowAuthOrLoad() {
    const authed = await aiCheckAuth();
    if (!authed) {
        fileAuthed = false;
        aiAuthOverlay.style.display = 'flex';
        aiAuthPwInput.value = '';
        aiAuthMsg.textContent = '';
        setTimeout(() => aiAuthPwInput.focus(), 50);
    } else {
        fileAuthed = true;
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
        const j = await CFecth.Exe(CPath.PHPC() + "auth/login", { password: pw }, "json") as any;
        if (j.ok) {
            localStorage.setItem(AI_TOKEN_KEY, j.token);
            fileAuthed = true;
            aiAuthOverlay.style.display = 'none';
            aiRefreshSessions();
            termRefreshSessions();
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
CDOM.ID("ai-term-subtab").addEventListener("shown.bs.tab", () => { termRefreshSessions(); schedRefresh(); });

CDOM.ID("ai-tab").addEventListener("shown.bs.tab", () => {
    aiInited = true;
    aiShowAuthOrLoad();
});
// also init if AI tab is the restored last-active tab
if (CDOM.ID("ai-panel").classList.contains("show")) {
    aiInited = true;
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



var g_musicJBox=new CModal("music_modal");
g_musicJBox.SetSize(400,600);
g_musicJBox.SetCloseToHide(true);
g_musicJBox.SetBody(`<div id='Music_div'>
        
        <button type='button' class='btn btn-primary' style='margin: 4px;' onclick='SoundEachCopy()'>Copy Each</button>
        <button type='button' class='btn btn-danger' style='margin: 4px;' onclick='SoundAllDelate()'>Delete All</button>
        
        <button type='button' class='btn btn-warning' style='margin: 4px;' onclick='SoundPlayListSave()'>Save List</button>
        <div id='SoundNowPlaying' style='padding:6px;font-weight:bold;color:#0d6efd;'></div>
        <audio id='MAudio' controls playsinline preload="auto"></audio>
        <div class='form-check'>
            <input class='form-check-input' type='checkbox' id='SoundRandom_chk' checked>
            <label class='form-check-label' for='SoundRandom_chk'>Random Play</label>
        </div>

        <hr><div id='SoundList'></div>
    </div>`);
g_musicJBox.Hide();
g_musicJBox.Open(CModal.ePos.Center);



let index=0;
var folderList={"<>":"ul","class":"list-group","html":[]};
var fileList={"<>":"ul","class":"list-group","html":[]};
function DirListRefresh()
{
    
    CDOM.ID("File_div").innerHTML="";
    CDOM.ID("Delete_div").innerHTML="";
    folderList={"<>":"ul","class":"list-group","html":[]};
    fileList={"<>":"ul","class":"list-group","html":[]};

    if(window["g_path"]!=null && window["g_path"]!="/")
    {
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-warning list-group-item-action","html":"<i class='bi bi-folder'></i> Root Folder",
            "onclick":()=>{FolderCD("/")},
        });
        let path=(window["g_path"] as string);
        let pos=path.lastIndexOf("/",path.length-2);
        let bpath=path.substr(0,pos);
        bpath+="/";
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-primary list-group-item-action","html":"<i class='bi bi-folder'></i> Parent Folder",
            "onclick":()=>{FolderCD(bpath)},
        });
    }

    for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number}>)
    {
        if(fl.hidden)   continue;
        fl.open=false;
        fl.index=index;
        index++;
        
        let name="";
        let onclick=null;
        if(fl.file==false)
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-fill'>"+fl.name,"onclick":()=>{
                let soundAddType=CDOM.IDValue("soundAddType");
                if(soundAddType=="1")
                {
                    let p2: any = {path:window["g_path"]+fl.name+"/"};
                    if(RootPath) p2.RootPath = RootPath;
                    if(RootUrl)     p2.RootUrl = RootUrl;
                    CFecth.Exe("File/List",p2,"json").then((data : {"list","RootPath","path","RootUrl"})=>{
                        //CStorage.Set(path==null?"root":path,JSON.stringify(data.list));
                        CAlert.Info(window["g_path"]+fl.name+"추가");
                        

                        for(let fl2 of data.list as Array<{hidden:boolean,file:boolean,name:string,ext:string}>)
                        {
                            if(fl.name==fl2.name)   continue;
                            
                            if(fl2.ext=="mp3" || fl.ext=="ogg")
                            {
                                if(SoundListDupChk(window["g_down"]+window["g_path"]+fl.name+"/"+fl2.name)==false)
                                {
                                    g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl.name+"/"+fl2.name);
                                    g_soundList.name.push(fl2.name);
                                }
                                
                                
                            }
                        }
                        SoundListRefresh();
                        SoundPlay(0);
                    });
                }
                else
                    FolderCD(window["g_path"]+fl.name+"/");
            }});
        }       
        else if(fl.ext=="png" || fl.ext=="jpg" || fl.ext=="jpeg" || fl.ext=="bmp")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-image'>"+fl.name,"onclick":(e)=>{
                CDOM.ID("ImageModalSrc").hidden=false;
                (CDOM.ID("ImageModalSrc") as HTMLImageElement).src=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=true;
                CDOM.ID("FileModalSrc").hidden=true;
                //g_openList.add(fl.name);
                fl.open=true;
                RefreshOpen();
                g_contentJBox.Show();
                //e.target.className="list-group-item list-group-item-action list-group-item-secondary";
            
            }});
        }
        // else if(fl.ext=="ts" || fl.ext=="js" || fl.ext=="html" || fl.ext=="json")
        // {
        //     folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
        //         "html":"<i class='bi bi-file-earmark'>"+fl.name,"onclick":(e)=>{
                

        //         let modal=new CSourceViewer([window["g_down"]+window["g_path"]+fl.name]);
        //         modal.Open();
                
        //         //e.target.className="list-group-item list-group-item-action list-group-item-secondary";
            
        //     }});
        // }
        else if(fl.ext=="mp3" || fl.ext=="ogg")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-music'>"+fl.name,"onclick":()=>{
                //g_soundList.fullPath.push();
                let soundAddType=CDOM.IDValue("soundAddType");
                if(soundAddType=="1")
                {
                    if(SoundListDupChk(window["g_down"]+window["g_path"]+fl.name)==false)
                    {
                        g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl.name);
                        g_soundList.name.push(fl.name);
                    }
                    
                    CAlert.Info(fl.name+" 추가");
                }
                else
                {
                    

                    g_soundList.name.length=0;
                    g_soundList.fullPath.length=0;
                    g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl.name);
                    g_soundList.name.push(fl.name);

                    for(let fl2 of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string}>)
                    {
                        if(fl.name==fl2.name)   continue;
                        
                        if(fl2.ext=="mp3" || fl.ext=="ogg")
                        {
                            if(SoundListDupChk(window["g_down"]+window["g_path"]+fl2.name)==false)
                            {
                                g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl2.name);
                                g_soundList.name.push(fl2.name);
                            }
                            
                            
                        }
                    }
                    SoundListRefresh();
                    SoundPlay(0);
                }
                
                SoundListSave();
                fl.open=true;
                RefreshOpen();
                
            }});
        }
        else if(fl.ext=="mp4" || fl.ext=="mov" || fl.ext=="avi")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-play'>"+fl.name,"onclick":()=>{
                
                CDOM.ID("ImageModalSrc").hidden=true;
                (CDOM.ID("VideoModalSrc") as HTMLVideoElement).src=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=false;
                CDOM.ID("FileModalSrc").hidden=true;
                fl.open=true;
                RefreshOpen();
                g_contentJBox.Show();
                
            
            }});
        }
        else if(fl.ext=="soundlist")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-flower1'>"+fl.name,"onclick":()=>{
                var oReq = new XMLHttpRequest();
                oReq.onload = (e)=> 
                {
                    if (oReq.status != 200) 
                    {
                        CAlert.E("XMLHttpRequest error code" + oReq.status);
                    }
                    else
                    {
                        g_soundList=oReq.response;
                        SoundListSave();
                        CAlert.Info("ListUp!");
                    }
                }
                oReq.open("GET", window["g_down"]+window["g_path"]+fl.name);
                oReq.responseType = "json";
                oReq.send();
            }});
        }
        else if(fl.ext=="html")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file-earmark-code'>"+fl.name,"onclick":()=>{
                let confirm=new CConfirm();
                confirm.SetBody("HTML 파일을 어떻게 열까요?");
                confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
                    ()=>{ window.open(window["g_down"]+window["g_path"]+fl.name, "_blank"); },
                    ()=>{
                        let viewer = new CFileViewer([window["g_down"]+window["g_path"]+fl.name], async (filePath, bufStr) => {
                            const fileName = filePath.split('/').pop();
                            const dirPath = window["g_root"] + window["g_path"];
                            const base64 = btoa(unescape(encodeURIComponent(bufStr)));
                            CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                                CAlert.Info('저장 완료');
                            }).catch((e) => {
                                CAlert.E('저장 실패: ' + e.message);
                            });
                        });
                        viewer.Open();
                    },
                ],["New Window","File Viewer"])
                confirm.Open();
            }});
        }
        else if(fl.ext=="ts" || fl.ext=="js" || fl.ext=="txt" || fl.ext=="json")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file-code'>"+fl.name,"onclick":()=>{
                                
                
                let viewer = new CFileViewer([window["g_down"]+window["g_path"]+fl.name], async (filePath, bufStr) => {
                    const fileName = filePath.split('/').pop();
                    const dirPath = window["g_root"] + window["g_path"];
                    const base64 = btoa(unescape(encodeURIComponent(bufStr)));
                    console.log('Upload →', { path: dirPath, name: [fileName] }); // ← 확인용
                    CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                        CAlert.Info('저장 완료');
                    }).catch((e) => {
                        CAlert.E('저장 실패: ' + e.message);
                    });
                });
                viewer.Open();
            }});
        }
        else if(fl.ext=="md")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file-earmark-text'>"+fl.name,"onclick":(e)=>{
                new CMDViewer(window["g_down"]+window["g_path"]+fl.name);
            }});
        }
        else if(fl.ext=="csv" || fl.ext=="xlsx" || fl.ext=="xls")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file-earmark-spreadsheet'>"+fl.name,"onclick":()=>{
                new CSheetViewer([window["g_down"]+window["g_path"]+fl.name], async (filePath, base64) => {
                    const fileName = filePath.split('/').pop();
                    const dirPath = window["g_root"] + window["g_path"];
                    CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                        CAlert.Info('저장 완료');
                    }).catch((e: any) => {
                        CAlert.E('저장 실패: ' + e.message);
                    });
                }).Open();
            }});
        }
        else
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file'>"+fl.name,"onclick":()=>{
                
                CDOM.ID("ImageModalSrc").hidden=true;
                (CDOM.ID("FileModalSrc") as HTMLLinkElement).href=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=true;
                CDOM.ID("FileModalSrc").hidden=false;

                g_contentJBox.Show();
            
            }});
        }
        
        if(fl.file==true)
        {
            fileList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file'>"+fl.name,"onclick":()=>{
                Delete(fl.name);
            }});
        }

    }

    CDOM.ID("File_div").append(CDOM.DataToDom(folderList));
    CDOM.ID("Delete_div").append(CDOM.DataToDom(fileList));
}

let path=CUtilWeb.Parameter("path");
let RootPath=CUtilWeb.Parameter("RootPath");
let RootUrl=CUtilWeb.Parameter("RootUrl");

let fileAuthed = !!localStorage.getItem(AI_TOKEN_KEY);

window["g_dirList"]=CStorage.Get(path==null?"root":path);
if(window["g_dirList"]!=null)   
{
    window["g_dirList"]=JSON.parse(window["g_dirList"]);
    DirListRefresh();
}

let fetchParam: any = {path:path};
if(RootPath) fetchParam.RootPath = RootPath;
if(RootUrl)     fetchParam.RootUrl = RootUrl;

CFecth.Exe("File/List",fetchParam,"json").then((data : {"list","RootPath","path","RootUrl"})=>{
    CStorage.Set(path==null?"root":path,JSON.stringify(data.list));
    window["g_dirList"]=data.list;
    window["g_root"]=(data.RootPath as string)?.replace(/\/+$/, '') ?? '';
    window["g_path"]=data.path;
    window["g_down"]=data.RootUrl;
    DirListRefresh();
});



let g_soundList={"fullPath":[],"name":[]};
let SoundListStr=CStorage.Get("SoundList");
if(SoundListStr!=null)
    g_soundList=JSON.parse(SoundListStr);

function FolderCD(_path, _onDone?: () => void)
{
    window["g_path"]=_path;
    let p2: any = {path:_path};
    if(RootPath) p2.RootPath = RootPath;
    if(RootUrl)     p2.RootUrl = RootUrl;
    CFecth.Exe("File/List",p2,"json").then((data : {"list","RootPath","path","RootUrl"})=>{
        window["g_dirList"]=data.list;
        window["g_root"]=(data.RootPath as string)?.replace(/\/+$/, '') ?? '';
        window["g_path"]=data.path;
        window["g_down"]=data.RootUrl;
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
    const _token = localStorage.getItem(AI_TOKEN_KEY) || '';
    const _tokenQ = _token ? `?token=${encodeURIComponent(_token)}` : '';
    form.setAttribute("action", CPath.PHPC()+"File/Redirection"+_tokenQ);

    CDOM.IDValue("fun",g_fun);
    CDOM.IDValue("data",g_data);
    CDOM.IDValue("option",g_option);
    CDOM.IDValue("path",window["g_path"]);
    CDOM.IDValue("RootPath", RootPath ?? "");
    CDOM.IDValue("RootUrl", RootUrl ?? "");
    
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
        {"<>":"button","type":"button","class":"btn btn-sm btn-outline-secondary","text":"Permission","onclick":()=>{PermissionBtn();}},
    ]},
]};

CDOM.ID("Menu_div").append(CDOM.DataToDom(g_menuList));

async function PermissionBtn() {
    if (fileAuthed) {
        // 서버 토큰 유효성 검증 (서버 재시작 시 메모리 토큰 초기화됨)
        const valid = await aiCheckAuth();
        if (valid) {
            showFileAdminModal();
            return;
        }
        // 토큰 만료/무효 → 재인증 필요
        fileAuthed = false;
    }
    const dlg = new CConfirm();
    dlg.SetBody('Enter admin password:<br><input type="password" id="AuthPassword" class="form-control form-control-sm">');
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => {
            const pw = CDOM.IDValue("AuthPassword");
            (CFecth.Exe(CPath.PHPC() + "auth/login", { password: pw }, "json") as Promise<any>).then((j: { ok: boolean, token?: string, msg?: string }) => {
                if (j.ok) {
                    localStorage.setItem(AI_TOKEN_KEY, j.token!);
                    fileAuthed = true;
                    aiAuthOverlay.style.display = 'none';
                    aiRefreshSessions();
                    termRefreshSessions();
                    CAlert.Info("Permission granted");
                } else {
                    CAlert.E("Wrong password: " + (j.msg ?? ""));
                }
            }).catch(() => { CAlert.E("서버 오류"); });
        },
        () => {},
    ], ["OK", "Cancel"]);
    dlg.Open();
}
window["PermissionBtn"] = PermissionBtn;

function showFileAdminModal() {
    const uid = Date.now();
    const curRoot = RootPath || (window["g_root"] as string) || "";
    const curDown = RootUrl || (window["g_down"] as string) || "";

    const modal = new CModal();
    modal.SetHeader("File Manager");
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetCloseToHide(false);
    modal.SetBody(`
        <div class="d-flex flex-column gap-2 p-2" style="min-width:260px;">
            <div>
                <label class="form-label mb-0 small fw-bold">Path</label>
                <input id="fadm_path_${uid}" type="text" class="form-control form-control-sm" value="${curRoot}" placeholder="Server default">
            </div>
            <div>
                <label class="form-label mb-0 small fw-bold">Down</label>
                <input id="fadm_down_${uid}" type="text" class="form-control form-control-sm" value="${curDown}" placeholder="Server default">
            </div>
            <button id="fadm_apply_${uid}" class="btn btn-sm btn-success">Apply</button>
            <div class="d-flex gap-1">
                <button id="fadm_defpath_${uid}" class="btn btn-sm btn-outline-secondary flex-fill">RootPath</button>
                <button id="fadm_artpath_${uid}" class="btn btn-sm btn-outline-primary flex-fill">ArtginePath</button>
            </div>
            <hr class="my-0">
            <button id="fadm_share_${uid}" class="btn btn-outline-info">Share</button>
            <button id="fadm_folder_${uid}" class="btn btn-warning">New Folder</button>
            <button id="fadm_delete_${uid}" class="btn btn-danger">Delete</button>
            <button id="fadm_upload_${uid}" class="btn btn-primary">Upload</button>
            <div class="d-flex gap-1">
                <button id="fadm_chat_${uid}" class="btn btn-outline-primary flex-fill">Chat</button>
                <button id="fadm_term_${uid}" class="btn btn-outline-success flex-fill">Terminal</button>
            </div>
        </div>
    `);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const pathInput = document.getElementById(`fadm_path_${uid}`) as HTMLInputElement;
        const downInput = document.getElementById(`fadm_down_${uid}`) as HTMLInputElement;

        const applyValues = (root: string, down: string) => {
            RootPath = root || null;
            RootUrl = down || null;
            modal.Close();
            FolderCD("/");
        };

        document.getElementById(`fadm_apply_${uid}`)?.addEventListener('click', () => {
            applyValues(pathInput.value.trim(), downInput.value.trim());
        });
        document.getElementById(`fadm_defpath_${uid}`)?.addEventListener('click', () => {
            pathInput.value = "";
            downInput.value = "";
            applyValues("", "");
        });
        document.getElementById(`fadm_artpath_${uid}`)?.addEventListener('click', () => {
            pathInput.value = "./";
            downInput.value = "/Artgine/";
            applyValues("./", "/Artgine/");
        });
        document.getElementById(`fadm_share_${uid}`)?.addEventListener('click', () => {
            modal.Hide(); FileShare();
        });
        document.getElementById(`fadm_folder_${uid}`)?.addEventListener('click', () => {
            modal.Hide(); CreateFolder();
        });
        document.getElementById(`fadm_delete_${uid}`)?.addEventListener('click', () => {
            modal.Hide(); g_deleteJBox.Show();
        });
        document.getElementById(`fadm_upload_${uid}`)?.addEventListener('click', () => {
            modal.Hide(); (CDOM.ID("uploadBtn") as HTMLInputElement).click();
        });
        document.getElementById(`fadm_chat_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = ((window["g_root"] as string) ?? '') + ((window["g_path"] as string) ?? '');
            const aiTabEl = document.querySelector('[data-bs-target="#ai-panel"]') as HTMLElement;
            if (aiTabEl) (window as any).bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
            setTimeout(() => {
                const chatSubEl = document.getElementById('ai-chat-subtab') as HTMLElement;
                if (chatSubEl) (window as any).bootstrap.Tab.getOrCreateInstance(chatSubEl).show();
            }, 150);
            chatStartNew(cwd || undefined);
        });
        document.getElementById(`fadm_term_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = ((window["g_root"] as string) ?? '') + ((window["g_path"] as string) ?? '');
            const aiTabEl = document.querySelector('[data-bs-target="#ai-panel"]') as HTMLElement;
            if (aiTabEl) (window as any).bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
            setTimeout(() => {
                const termSubEl = document.getElementById('ai-term-subtab') as HTMLElement;
                if (termSubEl) (window as any).bootstrap.Tab.getOrCreateInstance(termSubEl).show();
            }, 150);
            termStartNew('cmd', cwd || undefined);
        });
    }, 80);
}
window["showFileAdminModal"] = showFileAdminModal;

function CreateFolder()
{
    let confirm=new CConfirm();
    confirm.SetBody('Enter folder name:<br><input type="text" id="CreateFolder" class="form-control form-control-sm" value="New Folder">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    async ()=> {
        const folderName = CDOM.IDValue("CreateFolder");
        const data = window["g_path"] + folderName;
        const param: any = { data };
        if (RootPath) param.RootPath = RootPath;
        const j = await CFecth.Exe(CPath.PHPC() + "File/Mkdir", param, "json") as any;
        if (j?.ok) FolderCD(window["g_path"]);
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
    g_data=window["g_path"]+_file;
    Redirection(false);
}
window["Delete"]=Delete;

type SrchFile = {hidden:boolean,file:boolean,name:string,ext:string};
const SEARCH_EXCLUDE_DIRS = ['node_modules'];
const isSearchExcluded = (name: string) => name.startsWith('.') || SEARCH_EXCLUDE_DIRS.includes(name);
// 서버 루트 단위로 캐시 유지 — 경로가 바뀌어도 유지, 해당 subtree 항목만 활용
let g_srchCache: Map<string, SrchFile[]> = new Map(); // dirPath → fileList
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

    await new Promise<void>(r => setTimeout(r, 80));

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
        if (fl.file) {
            item.addEventListener('click', () => {
                modal.Hide();
                FolderCD(dirPath, () => {
                    const els = document.querySelectorAll('#File_div .list-group-item');
                    for (const el of Array.from(els)) {
                        if (el.textContent?.includes(fl.name)) { (el as HTMLElement).click(); break; }
                    }
                });
            });
        } else {
            item.addEventListener('click', () => { FolderCD(dirPath + fl.name + '/'); modal.Hide(); });
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

        const startPath = window["g_path"] ?? "/";
        const serverKey = (RootPath ?? '') + '|' + (RootUrl ?? '');
        if (g_srchServerKey !== serverKey) { g_srchCache = new Map(); g_srchServerKey = serverKey; }

        searchCancelled = false;
        btn.disabled = true;
        stopBtn.style.display = '';

        // startPath 하위 캐시가 있으면 즉시 표시
        const hasCached = [...g_srchCache.keys()].some(k => k.startsWith(startPath));
        if (hasCached) {
            const n = renderFromCache(startPath, query);
            status.textContent = `(Cached: ${n}) Refreshing...`;
        } else {
            results.innerHTML = '';
            status.textContent = 'Scanning...';
        }

        // 최신 스캔 — 완료 후 캐시 업데이트 & 결과 교체
        const queue: string[] = [startPath];
        while (queue.length > 0 && !searchCancelled) {
            const dirPath = queue.shift()!;
            status.textContent = `Scanning: ${dirPath}`;
            try {
                let p2: any = { path: dirPath };
                if (RootPath) p2.RootPath = RootPath;
                if (RootUrl)     p2.RootUrl     = RootUrl;
                const data = await CFecth.Exe("File/List", p2, "json") as { list: Array<SrchFile> };
                g_srchCache.set(dirPath, data.list);
                for (const fl of data.list) {
                    if (!fl.hidden && !fl.file && !isSearchExcluded(fl.name)) queue.push(dirPath + fl.name + '/');
                }
            } catch (_) {}
        }

        if (!searchCancelled) {
            const n = renderFromCache(startPath, query);
            const cap = n >= 200 ? ' (capped at 200)' : '';
            status.textContent = n === 0 ? 'No results.' : `${n} result(s)${cap}`;
        } else {
            status.textContent = 'Stopped.';
        }
        btn.disabled = false;
        stopBtn.style.display = 'none';
    };

    stopBtn.addEventListener('click', () => { searchCancelled = true; });
    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') doSearch(); });
    input.focus();
}
window["FileSearch"] = FileSearch;

function FileShare() {
    const path = window["g_path"] ?? "/";
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('path', path);
    if (RootPath) url.searchParams.set('RootPath', RootPath);
    if (RootUrl)     url.searchParams.set('RootUrl', RootUrl);
    const shareUrl = url.toString();

    const uid = Date.now();
    const modal = new CModal();
    modal.SetHeader("Share");
    modal.SetBody(`
        <div class="mb-2 small text-secondary">현재 폴더 공유 링크</div>
        <div class="input-group">
            <input type="text" id="shareInput_${uid}" class="form-control form-control-sm" readonly value="${shareUrl.replace(/"/g, '&quot;')}">
            <button id="shareCopyBtn_${uid}" class="btn btn-sm btn-outline-primary">Copy</button>
        </div>
        <div id="shareCopyMsg_${uid}" class="small text-success mt-1" style="min-height:1.2em;"></div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(500, 160);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const btn = document.getElementById(`shareCopyBtn_${uid}`) as HTMLButtonElement;
        const msg = document.getElementById(`shareCopyMsg_${uid}`) as HTMLElement;
        btn?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                msg.textContent = 'Copied!';
                setTimeout(() => { msg.textContent = ''; }, 2000);
            } catch {
                msg.textContent = 'Copy failed — select and copy manually.';
            }
        });
    }, 80);
}
window["FileShare"] = FileShare;

// async function Upload()
// {
//     CAlert.E("막아둠");return;
//     var input=document.createElement('input');
//     input.type="file";
//     input.accept=".json";
//     input.click();

//     await new Promise<void>((resolve) => {
//         input.onchange=async(e)=>{
//             var fi=e.target as HTMLInputElement;
//             let _str = await CUtil.FileToStr(fi.files[0]) as string|object;
           
//             resolve();
//         };
//         //파일 선택 취소
//         input.addEventListener('cancel', () => {
//             resolve();
//         });
//     });
// }

// window["Upload"]=Upload;


CDOM.ID("uploadBtn").onchange=async (e)=>{

    var fi=e.target as HTMLInputElement;
    const path=window["g_root"]+window["g_path"];

    // arrayBuffer() 대신 FileReader 사용: iOS Safari에서 대용량 파일 안정성이 높음
    const readAsBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // data:image/jpeg;base64,XXX → XXX
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

    for(let i=0;i<fi.files.length;++i)
    {
        try {
            const name=fi.files[i].name;
            const data=await readAsBase64(fi.files[i]);
            await CFecth.Exe("File/Upload",{data:[data],name:[name],path});
        } catch(err: any) {
            CAlert.E('Upload failed: ' + (err?.message ?? String(err)));
            return;
        }
    }
    Redirection(true);
    
};
// function SoundAllAdd()
// {
//     for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string}>)
//     {
//         if(fl.ext=="mp3" || fl.ext=="ogg")
//         {
//             g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl.name);
//             g_soundList.name.push(fl.name);
            
//         }
//     }
//     CAlert.Info("전곡 추가");
//     SoundListSave();
// }
// window["SoundAllAdd"]=SoundAllAdd;
let gRamdomList=[];
function SoundListRefresh()
{
    gRamdomList=[];
    if(g_soundList==null)   return;

    var musicStr="";
    CDOM.ID("SoundList").innerHTML="";

    


    for(let i=0;i<g_soundList.fullPath.length;++i)
    {
        //let full=window["g_down"]+g_soundList.fullPath[i];
        

        musicStr+="<ul class='list-group'>";
		musicStr+="<li class='list-group-item list-group-item-action' id='Sound"+i+"' onclick='SoundPlay("+i+")'>"+
			"<i class='bi bi-file-music'></i> <font color='red'>"+g_soundList.name[i]+
            "</font><i class='bi bi-file-earmark-x float-right' onclick='SoundDelete("+i+")'></i></li>";
		musicStr+="</ul>";
    }
    CDOM.ID("SoundList").innerHTML=musicStr;
}
window["SoundListRefresh"]=SoundListRefresh;
SoundListRefresh();

function SoundListSave()
{
    CStorage.Set("SoundList",JSON.stringify(g_soundList));
    SoundListRefresh();
}
window["SoundListSave"]=SoundListSave;


var g_lastPlay=0;
function SoundPlay(_off)
{
    if(g_soundList.fullPath.length==0)  return;
    var MAudio=document.getElementById('MAudio') as HTMLAudioElement;
    if(_off==-1)
    {
        CDOM.ID("Sound"+g_lastPlay).className="list-group-item list-group-item-action";
        g_lastPlay=0;
        CDOM.ID("SoundNowPlaying").textContent="";
        return;
    }
    else
    {
        CDOM.ID("Sound"+g_lastPlay).className="list-group-item list-group-item-action";
        g_lastPlay=_off;
        CDOM.ID("Sound"+_off).className="list-group-item list-group-item-action list-group-item-dark";
    }

    // MAudio.src=g_soundList.fullPath[_off];
    // if(/iphone|ipad|ipod/i.test(navigator.userAgent)) MAudio.load();
    // MAudio.play()
    // .then(_ => {
    //     // 현재 재생곡 UI 표시
    //     CDOM.ID("SoundNowPlaying").textContent="\u266B " + g_soundList.name[_off];
    //     // MediaSession (잠금화면 곡 정보)
    //     if('mediaSession' in navigator) {
    //         navigator.mediaSession.metadata = new MediaMetadata({
    //             title: g_soundList.name[_off],
    //             artwork: [
    //                 { src: "512x512.png", sizes: "512x512", type: "image/png" }
    //             ]
    //         });
    //         navigator.mediaSession.playbackState = 'playing';
    //         if('setPositionState' in navigator.mediaSession) {
    //             try { navigator.mediaSession.setPositionState({ duration: MAudio.duration, playbackRate: MAudio.playbackRate, position: MAudio.currentTime }); } catch(e) {}
    //         }
    //     }
    // })
    // .catch(e => console.warn("SoundPlay failed:", e));
    // 변경 후
    const doPlay = () => {
        MAudio.play()
        .then(_ => {
            CDOM.ID("SoundNowPlaying").textContent="\u266B " + g_soundList.name[_off];
            if('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: g_soundList.name[_off],
                    artwork: [{ src: "512x512.png", sizes: "512x512", type: "image/png" }]
                });
                navigator.mediaSession.playbackState = 'playing';
                if('setPositionState' in navigator.mediaSession) {
                    try { navigator.mediaSession.setPositionState({ duration: MAudio.duration, playbackRate: MAudio.playbackRate, position: MAudio.currentTime }); } catch(e) {}
                }
            }
        })
        .catch(e => console.warn("SoundPlay failed:", e));
    };

    if ('audioSession' in navigator) {
        (navigator as any).audioSession.type = 'playback';
    }
    MAudio.src=g_soundList.fullPath[_off];
    doPlay();
}
window["SoundPlay"]=SoundPlay;

// MediaSession 핸들러 (1회 등록)
if('mediaSession' in navigator) {
    var MAudioRef=document.getElementById('MAudio') as HTMLAudioElement;
    navigator.mediaSession.setActionHandler("play", () => { MAudioRef.play(); });
    navigator.mediaSession.setActionHandler("pause", () => { MAudioRef.pause(); });
    navigator.mediaSession.setActionHandler("nexttrack", () => { SoundEnd(); });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
        let prev = g_lastPlay - 1;
        if(prev < 0) prev = g_soundList.fullPath.length - 1;
        SoundPlay(prev);
    });
    MAudioRef.addEventListener('play', () => { navigator.mediaSession.playbackState = 'playing'; });
    MAudioRef.addEventListener('pause', () => { navigator.mediaSession.playbackState = 'paused'; });
    MAudioRef.addEventListener('ended', () => { SoundEnd(); });
}

function SoundDelete(_off)
{
    var MAudio=document.getElementById('MAudio') as HTMLAudioElement;
    g_soundList.fullPath.splice(_off,1);
    g_soundList.name.splice(_off,1);
    SoundListSave();
    MAudio.pause();
}
window["SoundDelete"]=SoundDelete;


function SoundEnd()
{
    if((CDOM.ID("SoundRandom_chk") as HTMLInputElement).checked)
    {
        while(g_soundList.fullPath.length>0)
        {
            if(gRamdomList.length==0)
            {
                gRamdomList=[...g_soundList.fullPath];
            }

            let sel=Math.trunc(Math.random()*gRamdomList.length);

            let selKey=gRamdomList.splice(sel,1)[0];
            for(let i=0;i<g_soundList.fullPath.length;++i)
            {
                if(g_soundList.fullPath[i]==selKey)
                {
                    SoundPlay(i);
                    return;
                }
            }
        }
        

        //SoundPlay(Math.trunc(Math.random()*g_soundList.fullPath.length));
    }
    else
    {
        ;
        if(g_soundList.fullPath.length<=g_lastPlay+1)
            SoundPlay(0);
        else
            SoundPlay(g_lastPlay+1);
        
    }
}
window["SoundEnd"]=SoundEnd;
function SoundAllDelate()
{
    gRamdomList=[];
    g_soundList.fullPath=[];
    g_soundList.name=[];
    SoundListSave();
}
window["SoundAllDelate"]=SoundAllDelate;


// function SoundShuffle()
// {
// 	//g_soundList.fullPath.sort(() => Math.random() - 0.5); 
//     var fArr=[];
//     var nArr=[];
//     while(g_soundList.fullPath.length>0)
//     {
//         let off=Math.trunc(g_soundList.fullPath.length*Math.random());
//         fArr.push(g_soundList.fullPath.splice(off,1)[0]);
//         nArr.push(g_soundList.name.splice(off,1)[0]);
//     }
//     g_soundList.fullPath=fArr;
//     g_soundList.name=nArr;

// 	SoundListSave();
// }
// window["SoundShuffle"]=SoundShuffle;
function SoundListDupChk(_soundKey : string)
{
    for(let each0 of g_soundList.fullPath)
    {
        if(each0==_soundKey)    return true;
    }

    return false;
   
}
window["SoundListPush"]=SoundListDupChk;
function SoundPlayListSave()
{
    let confirm=new CConfirm();
    confirm.SetBody('Enter file name to save:<br><input type="text" id="soundListSave" class="form-control form-control-sm" value="basic">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    ()=> {
        g_fun="SoundPlayListSave";
			g_data=JSON.stringify(g_soundList);
            g_option=CDOM.IDValue("soundListSave");
			Redirection(false);
        
    },
    ()=> {
        
    },
    ],["Yes","No"])
    confirm.Open();

    // new CJBox(CJBox.Df.Confirm, {
	// 	content:'저장할 파일명을 입력하세요!<br><input type="text" id="soundListSave" class="form-control form-control-sm" value="basic">',
	// 	confirmButton: '예',
	// 	cancelButton: '아니오',
	// 	confirm : function () 
	// 	{
	// 		//Sound("SoundListSave"+g_path+"/"+$("#soundListSave").val());
			
	// 		g_fun="SoundPlayListSave";
	// 		g_data=JSON.stringify(g_soundList);
    //         g_option=CDOM.IDValue("soundListSave");
	// 		Redirection(false);
	// 	},
	// 	cancel : function () {
			
	// 	},
	// 	onOpen : function(){
	// 		g_musicJBox.close();
	// 	}
	// }).open();
}
window["SoundPlayListSave"]=SoundPlayListSave;




function SoundEachCopy()
{
    let confirm=new CConfirm();
    confirm.SetBody('Copy the list?">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    ()=> {
        g_fun="SoundEachCopy";
            g_data=JSON.stringify(g_soundList);
            Redirection(false);
        
    },
    ()=> {
        g_musicJBox.Hide();
    },
    ],["Yes","No"])
    confirm.Open();

    // new CJBox(CJBox.Df.Confirm, {
	// 	content:'리스트를 복사하겠습니까?">',
	// 	confirmButton: '예',
	// 	cancelButton: '아니오',
	// 	confirm : function () 
	// 	{
	// 		g_fun="SoundEachCopy";
    //         g_data=JSON.stringify(g_soundList);
    //         Redirection(false);
	// 	},

	// 	onOpen : function(){
	// 		g_musicJBox.Hide();
	// 	}
	// }).open();

    
}
window["SoundEachCopy"]=SoundEachCopy;
function RefreshOpen()
{
    
    for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number}>)
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
    for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number}>)
    {
        if(fl.open==false)
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action list-group-item-secondary";
            fl.open=true;
            if(fl.ext=="png" || fl.ext=="jpg" || fl.ext=="jpeg" || fl.ext=="bmp")
            {
                CDOM.ID("ImageModalSrc").hidden=false;
                (CDOM.ID("ImageModalSrc") as HTMLImageElement).src=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=true;
                CDOM.ID("FileModalSrc").hidden=true;
            }
            else if(fl.ext=="mp4" || fl.ext=="mov" || fl.ext=="avi")
            {
                CDOM.ID("ImageModalSrc").hidden=true;
                (CDOM.ID("VideoModalSrc") as HTMLVideoElement).src=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=false;
                CDOM.ID("FileModalSrc").hidden=true;
            }
            return;
        }
      
        
    }
    CAlert.Info("더 이상 없습니다.");
}
window["NextPhoto"]=NextPhoto;




let lan=CUtil.Language();
let buf=CFile.Load("../../README-"+lan+".md").then(async ()=>{
    if(buf==null || lan=="en")  lan="";
    else lan="-"+lan;
    CDOM.ID("main").innerHTML="";
    CDOM.ID("main").append(await CUtilWeb.MDReader("../../README"+lan+".md"));
});

// CDOM.ID("main").innerHTML="";
//     CDOM.ID("main").append(await CUtilWeb.MDReader("../../README.md"));































































































































































































































































































































