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
gPF.mVersion = "mqc55wv8_2";

import {CAtelier} from "../../artgine/app/CAtelier.js";

import {CPlugin} from "../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.燧녳쐦?슟燧녳삝截륆윊π윍?
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
import { CFileViewer, CMDViewer, CSheetViewer, CModalStackMsg, CModalMusic } from "../../artgine/util/CModalUtil.js";
import { CFile } from "../../artgine/system/CFile.js";
import { CWebSocket } from '../../artgine/network/CWebSocket.js';
import { CPWA } from '../../artgine/system/CPWA.js';
import { Bootstrap } from "../../artgine/basic/Bootstrap.js";
import { CTooltip } from "../../artgine/util/CTooltip.js";


// let mdModal=new CModal("test");
// mdModal.SetBody();
// mdModal.SetTitle(CModal.eTitle.TextClose);
// mdModal.Open();



if(gPF.mServer!="webServer")
    CAlert.E("Server setting is invalid.");

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

// PWA Install 踰꾪듉
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

// Download ??
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

// 紐⑤뱺 fetch??AI ?좏겙 ?먮룞 泥⑤? ??File/AI/Terminal ?몄쬆 怨듭쑀
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

// ---- iframe pool: ?몄뀡蹂?iframe???좎??섍퀬 show/hide留??좉? ----
// key 洹쒖튃: 'chat:<sid>', 'term:<port>', 'term-new:<localId>'
const iframePool = new Map<string, HTMLIFrameElement>();
let activeFrameKey: string | null = null;
let pendingNewSid: string | null = null; // ?쒕쾭???꾩쭅 ?녿뒗 ???몄뀡 (泥?硫붿떆吏 ??

let _activeNotifCallback: (() => void) | null = null;

function isAiPanelActive(): boolean {
    return document.getElementById('ai-panel')?.classList.contains('active') === true;
}

function isAiAuthVisible(): boolean {
    const overlay = document.getElementById('ai-auth-overlay');
    return !!overlay && overlay.style.display !== 'none';
}

function handleTermSidebarShortcut(e: KeyboardEvent): boolean {
    if (!isAiPanelActive()) return false;
    if (isAiAuthVisible()) return false;
    if (aiSidebarEl.classList.contains('collapsed')) return false;
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
        termConfirmKillSession(parseInt(activeFrameKey.slice(5), 10));
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
        // ?ъ빱???놁쓣 ?? 釉뚮씪?곗? ?뚮┝ ?곗꽑, ?ㅽ뙣 ??CModalStackMsg濡??대갚
        CUtilWeb.Notify(label, content ?? "", "", onClick ? () => onClick() : null).then(failed => {
            if (!failed) return;
            _showModalStackMsg(label, content, onClick);
        });
    } else {
        // ?ъ빱???덉쓣 ?? CModalStackMsg ?ъ슜
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
                    if (isTerm && handleTermSidebarShortcut(e)) return;
                    if (!isTerm && e.key === 'Tab') { e.preventDefault(); handleTabKey(); return; }
                    if (!isTerm && e.key === 'ArrowRight' && _activeNotifCallback) { e.preventDefault(); handleNotifKey(); return; }
                    if (!isTerm && e.key === 'ArrowLeft' && goPrevFrame()) { e.preventDefault(); return; }
                    if (!isTerm && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && goNextSession(e.key === 'ArrowUp' ? -1 : 1)) { e.preventDefault(); return; }
                    if (!isTerm && e.key === 'F1') { e.preventDefault(); FileBtn(); }
                    else if (!isTerm && e.key === 'F2') { e.preventDefault(); FileSearch(); }
                    else if (!isTerm && e.key === 'F3') {
                        e.preventDefault();
                        const fileTabEl = document.getElementById('file-tab') as HTMLElement;
                        if (fileTabEl) (window as any).bootstrap.Tab.getOrCreateInstance(fileTabEl).show();
                        FolderCD('/');
                    } else if (!isTerm && e.key === 'F4') {
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

function focusActiveFrame() {
    if (!activeFrameKey) return;
    const f = iframePool.get(activeFrameKey);
    if (!f) return;
    try {
        f.contentWindow?.focus();
        const input = f.contentDocument?.querySelector<HTMLElement>('#mi-bar textarea, textarea, input');
        if (input) {
            input.focus();
            return;
        }
    } catch (_) {}
    f.focus();
}

function focusActiveFrameIfSidebarCollapsed() {
    if (!aiSidebarEl.classList.contains('collapsed')) return;
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
        const r = await aiAuthedFetch(CPath.WebRootUrl() + 'ai/chat/sessions?limit=30');
        if (r.status === 401) {
            localStorage.removeItem(AI_TOKEN_KEY);
            fileAuthed = false;
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
            if (pendingNewSid && key === `chat:${pendingNewSid}`) continue; // ???몄뀡 蹂댄샇
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
            const st: SessState = !isLoaded ? 'off' : s.busy ? 'busy' : 'idle';
            syncSessState(`chat:${s.sessionId}`, st, () => {
                if (!isActiveFrame(key) || !document.hasFocus())
                    _showDoneNotification(aiEscapeHtml(s.title), s.lastMsg ? aiEscapeHtml(s.lastMsg) : undefined, () => aiLoadSession(s.sessionId));
            });
            const dot = st === 'off'  ? '<span class="text-danger small" title="誘몄뿰寃?>??/span>'
                      : st === 'busy' ? '<span class="ai-busy-dot text-warning small" title="泥섎━ 以?>??/span>'
                      :                 '<span class="text-success small" title="?湲?以?>??/span>';
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
                    <button class="d-block w-100 text-start btn btn-sm text-light px-3 py-2" data-act="link">?뵕 Share Link</button>
                    <button class="d-block w-100 text-start btn btn-sm text-danger px-3 py-2" data-act="delete">?뿊截?Delete Session</button>
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
                            await aiAuthedFetch(`${CPath.WebRootUrl()}ai/chat/session?id=${s.sessionId}`, { method: 'DELETE' });
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
            const aiTipEl = document.createElement('div');
            aiTipEl.style.cssText = 'white-space:pre-wrap;max-width:280px;font-size:0.82rem;';
            aiTipEl.textContent = s.title + (s.lastMsg ? '\n\n' + s.lastMsg : '');
            new CTooltip(aiTipEl, item, CTooltip.eTrigger.Hover, CTooltip.ePlacement.Left);
            aiSessionList.appendChild(item);
        }
    } catch (e) { console.error('AI session list error:', e); }
}

function refreshSessionsSoon() {
    // ??梨꾪똿? 泥?硫붿떆吏 ?쒖젏, ???곕??먯? ttyd 湲곕룞 ?꾩뿉 ?쒕쾭???깅줉?섎?濡?
    // 吏㏃?/湲????쒖젏???ъ슂泥?빐??由ъ뒪?몃? ?곕씪媛寃??쒕떎.
    setTimeout(() => { aiRefreshSessions(); termRefreshSessions(); }, 1500);
    setTimeout(() => { aiRefreshSessions(); termRefreshSessions(); }, 4000);
}

aiNewChatBtn.addEventListener('click', () => chatStartNew());

function chatStartNew(initialWorkingDir?: string) {
    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">?듭뀡</p>
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

// ---- ?몄뀡 ?곹깭(鍮④컯 off / ?몃옉 busy / 珥덈줉 idle)瑜?1怨녹뿉??愿由?----
// ?뚮┝? ?몃옉/二쇳솴?믪큹濡?busy쨌wait?뭝dle) ?꾪솚?먯꽌留?諛쒗솕?쒕떎. AI 梨꾪똿쨌?곕???怨듭슜.
type SessState = 'off' | 'busy' | 'idle' | 'wait';
const _sessState = new Map<string, SessState>();
function syncSessState(id: string, cur: SessState, onDone: () => void, onWait?: () => void): void {
    const prev = _sessState.get(id);
    if ((prev === 'busy' || prev === 'wait') && cur === 'idle') onDone();
    if (prev !== 'wait' && cur === 'wait') onWait?.();
    _sessState.set(id, cur);
}




function termAuthedFetch(url: string, init?: RequestInit): Promise<Response> {
    const token = localStorage.getItem(CMD_TOKEN_KEY) || '';
    const headers = new Headers((init?.headers as HeadersInit) || {});
    if (token) headers.set('x-cmd-token', token);
    return fetch(url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token), { ...init, headers });
}

async function termStartNew(_mode: 'cmd' | 'claude' /* | 'gemini' */ | 'codex' | 'antigravity' = 'cmd', initialWorkingDir?: string) {
    const token = localStorage.getItem(CMD_TOKEN_KEY);
    if (token) {
        try {
            const r = await termAuthedFetch(CPath.WebRootUrl() + 'cmd/sessions');
            const j = await r.json();
            if (j.ok) {
                const aliveCount = (j.sessions as any[]).filter((s: any) => s.alive).length;
                if (aliveCount >= 9) {
                    alert('?곕????몄뀡??媛??李쇱뒿?덈떎 (理쒕? 9媛?.\n湲곗〈 ?몄뀡????젣?????ㅼ떆 ?쒕룄?섏꽭??');
                    return;
                }
            }
        } catch {}
    }

    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">?듭뀡</p>
        <div class="mb-3 d-flex gap-2 flex-wrap">
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="cmd">cmd</button>
            <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="claude">claude</button>
            <!-- <button class="term-mode-btn btn btn-sm btn-outline-secondary flex-fill" data-mode="gemini">gemini</button> -->
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
                const r = await termAuthedFetch(CPath.WebRootUrl() + 'cmd/start-ttyd?' + params.toString());
                const j = await r.json();
                if (!j.ok) { alert(j.msg || 'Failed to start terminal'); return; }
                const key = `term-new:${Date.now()}`;
                showFrame(key, `${CPath.WebRootUrl()}cmd/terminal-proxy?port=${j.port}`);
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
    // ?대? ????덉쑝硫?洹몃?濡?蹂댁뿬二쇨퀬 ??
    if (iframePool.has(key)) {
        showFrame(key, '');
        aiRefreshSessions();
        termRefreshSessions();
        return;
    }
    showFrame(key, `${CPath.WebRootUrl()}cmd/terminal-proxy?port=${port}`);
    aiRefreshSessions();
    termRefreshSessions();
}

async function termKillSession(port: number) {
    try {
        const r = await termAuthedFetch(`${CPath.WebRootUrl()}cmd/kill-session?port=${port}`);
        const j = await r.json();
        if (!j.ok) { alert(`??젣 ?ㅽ뙣: ${j.msg || 'unknown error'}`); return; }
        termRefreshSessions();
        aiRefreshSessions();
    } catch (e) { console.error('termKillSession error:', e); }
}

function termConfirmKillSession(port: number) {
    const item = termSessionList.querySelector<HTMLElement>(`[data-port="${port}"]`);
    const label = item?.querySelector<HTMLElement>('.fw-semibold')?.textContent || `Terminal ${port}`;
    const confirm = new CConfirm();
    confirm.SetBody(`Delete ${aiEscapeHtml(label)}?`);
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => { termKillSession(port); },
        () => {},
    ], ["Delete", "Cancel"]);
    confirm.Open();
}

async function termRefreshSessions() {
    try {
        const r = await fetch(CPath.WebRootUrl() + 'cmd/sessions');
        const j = await r.json();
        if (!j.ok) return;
        termSessionList.innerHTML = '';
        const sessions = j.sessions as { port: number; mode: string; key?: string; lastMsg: string; updatedAt: number; createdAt: number; alive: boolean; busy: boolean; permPending?: boolean; workingDir?: string }[];
        const serverPorts = new Set(sessions.map(s => s.port));
        for (const key of Array.from(iframePool.keys())) {
            if (!key.startsWith('term:')) continue;
            if (!serverPorts.has(parseInt(key.slice(5), 10))) destroyFrame(key);
        }
        // term-new: ?꾨젅?꾩쓣 ?ㅼ젣 ?ы듃 ?ㅻ줈 ?밴꺽 (媛??理쒓렐 ?앹꽦?????몄뀡?먮쭔 留ㅼ묶)
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
            const rel = aiFormatRelative(s.updatedAt);
            const preview = aiEscapeHtml(s.lastMsg || '(empty)');
            const dotLabel = s.mode.slice(0, 3);
            const dotTitle = s.key || s.mode;
            const st: SessState = !s.alive ? 'off'
                : s.permPending ? 'wait'
                : !isLoaded ? 'off'
                : s.busy ? 'busy'
                : 'idle';
            syncSessState(`term:${s.port}`, st,
                () => {
                    const rawPreview = s.lastMsg || '';
                    if (!isActiveFrame(key) || !document.hasFocus())
                        _showDoneNotification(`${s.key || s.mode}: ${rawPreview}`.trimEnd(), rawPreview ? preview : undefined, () => termConnectSession(s.port));
                },
                () => {
                    if (!isActiveFrame(key) || !document.hasFocus())
                        _showDoneNotification(`??${s.key || s.mode}: 沅뚰븳 ?뱀씤 ?꾩슂`, s.lastMsg || undefined, () => termConnectSession(s.port));
                }
            );
            const dot = st === 'off'  ? `<span class="badge rounded-pill bg-danger" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
                      : st === 'wait' ? `<span class="badge rounded-pill bg-warning term-busy-dot" title="${aiEscapeHtml(dotTitle)}" style="filter:hue-rotate(30deg)">${dotLabel}</span>`
                      : st === 'busy' ? `<span class="badge rounded-pill bg-warning term-busy-dot" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
                      :                 `<span class="badge rounded-pill bg-success" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`;
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
                <button class="term-popup-btn btn btn-sm btn-link text-secondary p-0" title="?앹뾽?쇰줈 ?닿린">
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
                    <button class="d-block w-100 text-start btn btn-sm text-light px-3 py-2" data-act="modal">?뱞 Open in Modal</button>
                    <button class="d-block w-100 text-start btn btn-sm text-light px-3 py-2" data-act="window">?첒 Open in New Window</button>
                    <button class="d-block w-100 text-start btn btn-sm text-light px-3 py-2" data-act="link">?뵕 Share Link</button>
                    <button class="d-block w-100 text-start btn btn-sm text-danger px-3 py-2" data-act="kill">?뿊截?Delete Session</button>
                `;
                const rect = btn.getBoundingClientRect();
                drop.style.top = (rect.bottom + 4) + 'px';
                drop.style.left = rect.left + 'px';
                document.body.appendChild(drop);
                drop.querySelectorAll('button').forEach(b => {
                    b.addEventListener('click', () => {
                        drop.remove();
                        if (b.dataset.act === 'kill') {
                            termConfirmKillSession(s.port);
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
            const termTipEl = document.createElement('div');
            termTipEl.style.cssText = 'white-space:pre-wrap;max-width:280px;font-size:0.82rem;';
            termTipEl.textContent = s.lastMsg || '(empty)';
            new CTooltip(termTipEl, item, CTooltip.eTrigger.Hover, CTooltip.ePlacement.Left);
            termSessionList.appendChild(item);
        }
    } catch (e) { console.error('Terminal session list error:', e); }
}

function termShowShareLink(port: number) {
    const shareUrl = `${CPath.WebRootUrl()}cmd/terminal-proxy?port=${port}`;
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
    const shareUrl = `${location.origin}${base}/AI/AIChat.html?session=${encodeURIComponent(sessionId)}`;
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
            `${CPath.WebRootUrl()}cmd/terminal-proxy?port=${port}`,
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
            `<iframe src="${CPath.WebRootUrl()}cmd/terminal-proxy?port=${port}" style="width:100%;height:100%;border:none;display:block;"></iframe>` +
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
    if (s.count > 0) parts.push(`횞${s.count}`);
    if (s.start > 0) parts.push(`+${s.start}s`);
    if (s.end > 0)   parts.push(`~${s.end}s`);
    return parts.join(' ');
}

async function schedRefresh() {
    try {
        const r = await termAuthedFetch(CPath.WebRootUrl() + 'cmd/schedules');
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
                    <span class="badge rounded-pill ${s.mode==='none'?'bg-secondary':s.mode==='cmd'?'bg-info':s.mode==='claude'?'bg-warning text-dark':/*s.mode==='gemini'?'bg-success':*/s.mode==='codex'?'bg-primary':'bg-danger'}" style="font-size:0.65rem;">${s.mode==='antigravity'?'agy':s.mode}</span>
                    <span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${schedIntervalStr(s)}</span>
                </span>
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    <span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(s.name)}</span>
                    <span class="text-truncate text-secondary" style="font-size:0.7rem;">${aiEscapeHtml(s.terminalKey)}</span>
                    <span class="text-truncate small text-body-secondary">${aiEscapeHtml(s.command)}</span>
                </span>
                <button class="sched-del-btn btn btn-sm btn-link text-danger p-0" title="??젣"><i class="bi bi-trash"></i></button>
            `;
            item.addEventListener('click', () => schedOpenModal(s));
            item.querySelector('.sched-del-btn')!.addEventListener('click', async (e: Event) => {
                e.stopPropagation();
                if (!confirm(`?ㅼ?以?'${s.name}' ????젣?좉퉴??`)) return;
                await termAuthedFetch(`${CPath.WebRootUrl()}cmd/schedule-del?name=${encodeURIComponent(s.name)}`);
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
            const r = await termAuthedFetch(`${CPath.WebRootUrl()}cmd/schedule-set?${params.toString()}`);
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


// AI ??active ??5珥덈쭏??梨꾪똿쨌?곕??먃룹뒪耳以?紐⑸줉 媛깆떊
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
        pendingNewSid = null; // ?쒕쾭???몄뀡???앹꽦?먯쑝誘濡?蹂댄샇 ?댁젣
        aiRefreshSessions();
    }
    if (e.data?.type === 'terminal-tab-key') {
        handleTabKey();
    }
    if (e.data?.type === 'terminal-arrow-key') {
        if (e.data.key === 'ArrowLeft') goPrevFrame();
        else if (e.data.key === 'ArrowUp') goNextSession(-1);
        else if (e.data.key === 'ArrowDown') goNextSession(1);
        else handleNotifKey();
    }
    if (e.data?.type === 'home-hotkey') {
        const k = e.data.key as string;
        if (k === 'F1') FileBtn();
        else if (k === 'F2') FileSearch();
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
    toggleSidebar();
}

// ??濡??뚮┝ ?몄뀡 ?꾪솚 吏곹썑, ??濡??뚯븘媛?吏곸쟾 ?몄뀡. ?쒓컙??吏?섎㈃ ?댁젣?쒕떎.
let _notifReturnKey: string | null = null;
let _notifReturnTimer: number | null = null;

// ?쒖꽦 ?뚮┝(?꾨즺 硫붿꽭吏) 肄쒕갚??諛쒗솕?쒕떎. ???붿궡?쒕줈 ?몄텧?쒕떎.
function handleNotifKey(): boolean {
    if (_activeNotifCallback) {
        const cb = _activeNotifCallback;
        _activeNotifCallback = null;
        const from = activeFrameKey;   // ?꾪솚 ???몄뀡 湲곕줉
        cb();                          // ?뚮┝ ?몄뀡?쇰줈 ?꾪솚
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

// ???붿궡?? 吏곸쟾??蹂대뜕 ?몄뀡?쇰줈 蹂듦?(?뚮┝ ?꾪솚 吏곹썑?먮쭔 armed).
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

// ?묅넃 ?붿궡?? ?ъ씠?쒕컮媛 ?대젮 ?덉쓣 ???몄뀡 紐⑸줉 ?꾩븘???대룞
function goNextSession(dir: 1 | -1): boolean {
    if (aiSidebarEl.classList.contains('collapsed')) return false;
    const isChat = !activeFrameKey || activeFrameKey.startsWith('chat:');
    if (isChat) {
        const items = Array.from(aiSessionList.querySelectorAll<HTMLElement>('[data-sid]'));
        if (items.length === 0) return false;
        const curIdx = activeFrameKey ? items.findIndex(el => el.dataset.sid === activeFrameKey.slice(5)) : -1;
        const nxt = curIdx === -1 ? (dir === 1 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (nxt === curIdx) return false;
        const sid = items[nxt].dataset.sid!;
        aiLoadSession(sid);
        items[nxt].scrollIntoView({ block: 'nearest' });
        return true;
    } else {
        const items = Array.from(termSessionList.querySelectorAll<HTMLElement>('[data-port]'));
        if (items.length === 0) return false;
        const curIdx = activeFrameKey ? items.findIndex(el => `term:${el.dataset.port}` === activeFrameKey) : -1;
        const nxt = curIdx === -1 ? (dir === 1 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (nxt === curIdx) return false;
        termConnectSession(parseInt(items[nxt].dataset.port!));
        items[nxt].scrollIntoView({ block: 'nearest' });
        return true;
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
    setTimeout(() => next ? focusActiveFrame() : aiSidebarEl.focus(), 0);
}
aiSidebarToggleBtn.addEventListener('click', toggleSidebar);
document.addEventListener('keydown', (e) => {
    if (isAiPanelActive() && isAiAuthVisible()) return;
    if (e.key === 'Tab') {
        if (!isAiPanelActive()) return;
        e.preventDefault();
        handleTabKey();
        return;
    }
    if (handleTermSidebarShortcut(e)) return;
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
        if (goNextSession(e.key === 'ArrowUp' ? -1 : 1)) e.preventDefault();
        return;
    }
    if (e.key === 'F1') {
        e.preventDefault();
        FileBtn();
    } else if (e.key === 'F2') {
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

aiAuthOverlay.addEventListener('keydown', (e) => e.stopPropagation());

async function aiCheckAuth(): Promise<boolean> {
    const token = localStorage.getItem(AI_TOKEN_KEY) || '';
    if (!token) return false;
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "auth/check", { token }, "json") as any;
        return !!j?.ok;
    } catch { return false; }
}

async function aiShowAuthOrLoad() {
    const authed = await aiCheckAuth();
    if (!authed) {
        fileAuthed = false;
        const wasVisible = aiAuthOverlay.style.display === 'flex';
        aiAuthOverlay.style.display = 'flex';
        if (!wasVisible) {
            aiAuthPwInput.value = '';
            aiAuthMsg.textContent = '';
            setTimeout(() => aiAuthPwInput.focus(), 50);
        }
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
        const j = await CFecth.Exe(CPath.WebRootUrl() + "auth/login", { password: pw }, "json") as any;
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

// ?쒕툕???꾪솚 ???대떦 由ъ뒪??媛깆떊
CDOM.ID("ai-chat-subtab").addEventListener("shown.bs.tab", () => aiRefreshSessions());
CDOM.ID("ai-term-subtab").addEventListener("shown.bs.tab", () => { termRefreshSessions(); schedRefresh(); });

function showAiTermSubtab() {
    const termSubEl = CDOM.ID("ai-term-subtab") as HTMLElement;
    (window as any).bootstrap.Tab.getOrCreateInstance(termSubEl).show();
}

CDOM.ID("ai-tab").addEventListener("shown.bs.tab", () => {
    aiInited = true;
    showAiTermSubtab();
    aiShowAuthOrLoad();
});
// also init if AI tab is the restored last-active tab
if (CDOM.ID("ai-panel").classList.contains("show")) {
    aiInited = true;
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
        const filePath = ((window["g_root"] as string) ?? '') + ((window["g_path"] as string) ?? '') + (fl.name ?? '');
        const escaped = filePath.replace(/'/g, "\\'");
        return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;cursor:pointer;" onclick="event.stopPropagation();openVcsDiff('${escaped}')">${s}</span>`;
    }
    return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;">${s}</span>`;
}

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

    for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number,Status?:string}>)
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
                "html":"<i class='bi bi-folder-fill'>"+fl.name+vcsTag(fl),"onclick":()=>{
                let soundAddType=CDOM.IDValue("soundAddType");
                if(soundAddType=="1")
                {
                    let p2: any = {path:window["g_path"]+fl.name+"/"};
                    if(RootPath) p2.RootPath = RootPath;
                    if(RootUrl)     p2.RootUrl = RootUrl;
                    CFecth.Exe("File/List",p2,"json").then((data : {"list","RootPath","path","RootUrl"})=>{
                        //CStorage.Set(path==null?"root":path,JSON.stringify(data.list));
                        CAlert.Info(window["g_path"]+fl.name+"異붽?");
                        

                        for(let fl2 of data.list as Array<{hidden:boolean,file:boolean,name:string,ext:string}>)
                        {
                            if(fl.name==fl2.name)   continue;
                            if(fl2.ext=="mp3" || fl2.ext=="ogg")
                                g_musicJBox.AddTrack(fl2.name, window["g_down"]+window["g_path"]+fl.name+"/"+fl2.name);
                        }
                        g_musicJBox.Play(0);
                    });
                }
                else
                    FolderCD(window["g_path"]+fl.name+"/");
            }});
        }       
        else if(fl.ext=="png" || fl.ext=="jpg" || fl.ext=="jpeg" || fl.ext=="bmp")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-image'>"+fl.name+vcsTag(fl),"onclick":(e)=>{
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
        //         "html":"<i class='bi bi-file-earmark'>"+fl.name+vcsTag(fl),"onclick":(e)=>{
                

        //         let modal=new CSourceViewer([window["g_down"]+window["g_path"]+fl.name]);
        //         modal.Open();
                
        //         //e.target.className="list-group-item list-group-item-action list-group-item-secondary";
            
        //     }});
        // }
        else if(fl.ext=="mp3" || fl.ext=="ogg")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-music'>"+fl.name+vcsTag(fl),"onclick":()=>{
                let soundAddType=CDOM.IDValue("soundAddType");
                if(soundAddType=="1")
                {
                    g_musicJBox.AddTrack(fl.name, window["g_down"]+window["g_path"]+fl.name);
                    CAlert.Info(fl.name+" 異붽?");
                }
                else
                {
                    const _newNames: string[] = [fl.name];
                    const _newPaths: string[] = [window["g_down"]+window["g_path"]+fl.name];
                    for(let fl2 of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string}>)
                    {
                        if(fl.name==fl2.name)   continue;
                        if(fl2.ext=="mp3" || fl2.ext=="ogg")
                        {
                            const _fp = window["g_down"]+window["g_path"]+fl2.name;
                            if(!_newPaths.includes(_fp)) { _newNames.push(fl2.name); _newPaths.push(_fp); }
                        }
                    }
                    g_musicJBox.SetList(_newNames, _newPaths);
                    g_musicJBox.Play(0);
                }
                fl.open=true;
                RefreshOpen();
                
            }});
        }
        else if(fl.ext=="mp4" || fl.ext=="mov" || fl.ext=="avi")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-play'>"+fl.name+vcsTag(fl),"onclick":()=>{
                
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
                "html":"<i class='bi bi-flower1'>"+fl.name+vcsTag(fl),"onclick":()=>{
                var oReq = new XMLHttpRequest();
                oReq.onload = (e)=> 
                {
                    if (oReq.status != 200) 
                    {
                        CAlert.E("XMLHttpRequest error code" + oReq.status);
                    }
                    else
                    {
                        const _d = oReq.response;
                        g_musicJBox.SetList(_d.name || [], _d.fullPath || []);
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
                "html":"<i class='bi bi-file-earmark-code'>"+fl.name+vcsTag(fl),"onclick":()=>{
                let confirm=new CConfirm();
                confirm.SetBody("HTML ?뚯씪???대뼸寃??닿퉴??");
                confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
                    ()=>{ window.open(window["g_down"]+window["g_path"]+fl.name, "_blank"); },
                    ()=>{
                        let viewer = new CFileViewer([window["g_down"]+window["g_path"]+fl.name], async (filePath, bufStr) => {
                            const fileName = filePath.split('/').pop();
                            const dirPath = window["g_root"] + window["g_path"];
                            const base64 = btoa(unescape(encodeURIComponent(bufStr)));
                            CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                                CAlert.Info('????꾨즺');
                            }).catch((e) => {
                                CAlert.E('????ㅽ뙣: ' + e.message);
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
                "html":"<i class='bi bi-file-code'>"+fl.name+vcsTag(fl),"onclick":()=>{
                                
                
                let viewer = new CFileViewer([window["g_down"]+window["g_path"]+fl.name], async (filePath, bufStr) => {
                    const fileName = filePath.split('/').pop();
                    const dirPath = window["g_root"] + window["g_path"];
                    const base64 = btoa(unescape(encodeURIComponent(bufStr)));
                    console.log('Upload save', { path: dirPath, name: [fileName] });
                    CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                        CAlert.Info('????꾨즺');
                    }).catch((e) => {
                        CAlert.E('????ㅽ뙣: ' + e.message);
                    });
                });
                viewer.Open();
            }});
        }
        else if(fl.ext=="md")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file-earmark-text'>"+fl.name+vcsTag(fl),"onclick":(e)=>{
                new CMDViewer(window["g_down"]+window["g_path"]+fl.name);
            }});
        }
        else if(fl.ext=="csv" || fl.ext=="xlsx" || fl.ext=="xls")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file-earmark-spreadsheet'>"+fl.name+vcsTag(fl),"onclick":()=>{
                new CSheetViewer([window["g_down"]+window["g_path"]+fl.name], async (filePath, base64) => {
                    const fileName = filePath.split('/').pop();
                    const dirPath = window["g_root"] + window["g_path"];
                    CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                        CAlert.Info('????꾨즺');
                    }).catch((e: any) => {
                        CAlert.E('????ㅽ뙣: ' + e.message);
                    });
                }).Open();
            }});
        }
        else
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file'>"+fl.name+vcsTag(fl),"onclick":()=>{
                
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
                "html":"<i class='bi bi-file'>"+fl.name+vcsTag(fl),"onclick":()=>{
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

CFecth.Exe("File/List",fetchParam,"json").then((data : {"list","RootPath","path","RootUrl","roots"})=>{
    CStorage.Set(path==null?"root":path,JSON.stringify(data.list));
    window["g_dirList"]=data.list;
    window["g_root"]=(data.RootPath as string)?.replace(/\/+$/, '') ?? '';
    window["g_path"]=data.path;
    window["g_down"]=data.RootUrl;
    window["g_roots"]=data.roots ?? [];
    DirListRefresh();
});



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
    window["g_path"]=_path;
    let p2: any = {path:_path};
    if(RootPath) p2.RootPath = RootPath;
    if(RootUrl)     p2.RootUrl = RootUrl;
    CFecth.Exe("File/List",p2,"json").then((data : {"list","RootPath","path","RootUrl","roots"})=>{
        window["g_dirList"]=data.list;
        window["g_root"]=(data.RootPath as string)?.replace(/\/+$/, '') ?? '';
        window["g_path"]=data.path;
        window["g_down"]=data.RootUrl;
        window["g_roots"]=data.roots ?? [];
        index=0;
        DirListRefresh();
        _onDone?.();
    });
}
window["FolderCD"]=FolderCD;

var g_fun="";
var g_data="";
var g_option="";
// 蹂寃???
function Redirection(_multi : boolean)
{
    var form = CDOM.ID("ThisPage") as HTMLFormElement;
    form.setAttribute("charset", "UTF-8");
    form.setAttribute("method", "Post");
    const _token = localStorage.getItem(AI_TOKEN_KEY) || '';
    const _tokenQ = _token ? `?token=${encodeURIComponent(_token)}` : '';
    form.setAttribute("action", CPath.WebRootUrl()+"File/Redirection"+_tokenQ);

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
        {"<>":"button","type":"button","class":"btn btn-sm btn-outline-secondary","html":"File <span style='font-size:0.75em;opacity:0.7;'>F1</span>","onclick":()=>{FileBtn();}},
    ]},
]};

CDOM.ID("Menu_div").append(CDOM.DataToDom(g_menuList));

async function FileBtn() {
    if (fileAuthed) {
        // ?쒕쾭 ?좏겙 ?좏슚??寃利?(?쒕쾭 ?ъ떆????硫붾え由??좏겙 珥덇린?붾맖)
        const valid = await aiCheckAuth();
        if (valid) {
            showFileAdminModal();
            return;
        }
        // ?좏겙 留뚮즺/臾댄슚 ???ъ씤利??꾩슂
        fileAuthed = false;
    }
    const dlg = new CConfirm();
    dlg.SetBody('Enter admin password:<br><input type="password" id="AuthPassword" class="form-control form-control-sm">');
    const doAuth = () => {
        const pw = CDOM.IDValue("AuthPassword");
        (CFecth.Exe(CPath.WebRootUrl() + "auth/login", { password: pw }, "json") as Promise<any>).then((j: { ok: boolean, token?: string, msg?: string }) => {
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
        });
    }, 80);
}
window["FileBtn"] = FileBtn;
window["PermissionBtn"] = FileBtn;

function showFileAdminModal() {
    const uid = Date.now();

    const _roots = (window["g_roots"] as Array<{path:string,url:string,name:string}>) ?? [];
    // ?ㅼ젙 猷⑦듃??+ ?꾪떚???뚰궧) 寃쎈줈瑜?????됲듃???듯빀
    const _opts = [..._roots, { path: "./", url: "/Artgine/", name: "Artgine (WorkingPath)" }];
    // ?꾩옱 ?쒖꽦 ??ぉ ?쒖떆: RootPath+RootUrl 議고빀 留ㅼ묶, 湲곕낯(誘몄꽑???대㈃ 泥?猷⑦듃
    let _curIdx = _opts.findIndex(r => r.path === (RootPath ?? '') && r.url === (RootUrl ?? ''));
    if (_curIdx < 0) _curIdx = 0;
    const _rootOpts = _opts.map((r, i) => `<option value="${i}" ${i === _curIdx ? 'selected' : ''}>${r.name}</option>`).join('');

    const modal = new CModal();
    modal.SetHeader("File Manager");
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetCloseToHide(false);
    modal.SetBody(`
        <div class="d-flex flex-column gap-2 p-2" style="min-width:260px;min-height:420px;">
            <select id="fadm_rootsel_${uid}" class="form-select form-select-sm">${_rootOpts}</select>
            <hr class="my-0">
            <div class="d-flex gap-1">
                <button id="fadm_chat_${uid}" class="btn btn-outline-primary flex-fill">Chat</button>
                <button id="fadm_term_${uid}" class="btn btn-outline-success flex-fill">Terminal</button>
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
                            <button id="fadm_share_${uid}" class="btn btn-outline-info">Share</button>
                            <button id="fadm_folder_${uid}" class="btn btn-warning">New Folder</button>
                            <button id="fadm_delete_${uid}" class="btn btn-danger">Delete</button>
                            <button id="fadm_upload_${uid}" class="btn btn-primary">Upload</button>
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
        const applyValues = (root: string, down: string) => {
            RootPath = root || null;
            RootUrl = down || null;
            modal.Close();
            FolderCD("/");
        };

        const rootSel = document.getElementById(`fadm_rootsel_${uid}`) as HTMLSelectElement | null;
        rootSel?.addEventListener('change', () => {
            const r = _opts[parseInt(rootSel.value)];
            if (r) applyValues(r.path, r.url);
        });
        document.getElementById(`fadm_share_${uid}`)?.addEventListener('click', () => {
            modal.Hide(); FileShare();
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

        const vcsPath = () => ((window["g_root"] as string) ?? './') + ((window["g_path"] as string) ?? '');

        document.getElementById(`fadm_vcs_diff_${uid}`)?.addEventListener('click', () => openVcsDiff(vcsPath()));
        document.getElementById(`fadm_vcs_update_${uid}`)?.addEventListener('click', async () => {
            const res = await CFecth.Exe(CPath.WebRootUrl() + "File/VCS", { action: "update", path: vcsPath() }, "json") as any;
            CAlert.Info(res.msg || (res.ok ? 'Update complete' : 'Update failed'));
            if (res.ok) FolderCD(window["g_path"]);
        });
        document.getElementById(`fadm_vcs_add_${uid}`)?.addEventListener('click', () => openVcsModal('add', vcsPath()));
        document.getElementById(`fadm_vcs_revert_${uid}`)?.addEventListener('click', () => openVcsModal('revert', vcsPath()));
        document.getElementById(`fadm_vcs_commit_${uid}`)?.addEventListener('click', () => openVcsModal('commit', vcsPath()));
    }, 80);
}
window["showFileAdminModal"] = showFileAdminModal;

type ActionItem = {badge?:string, badgeClass?:string, icon?:string, label:string, value:string, checked?:boolean};
type ActionRunFn = (values: string[], message?: string) => Promise<{result: string, refresh?: boolean}>;

function openActionModal(
    title: string,
    runLabel: string,
    runClass: string,
    onRun: ActionRunFn,
    hasMessage = false,
    fetchItems?: () => Promise<ActionItem[]>,
    staticItems?: ActionItem[]
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
            <div id="am_list_${uid}" class="border rounded p-1 flex-fill" style="overflow-y:auto;font-size:0.78rem;min-height:0;">
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

    const renderItems = (items: ActionItem[] | undefined) => {
        if (!items || items.length === 0) { listEl.innerHTML = '<span class="text-secondary">No items</span>'; return; }
        listEl.innerHTML = items.map((i, idx) => `
            <div class="d-flex align-items-center gap-1 py-1">
                <input type="checkbox" class="form-check-input am-chk-${uid}" id="am_${uid}_${idx}" value="${i.value}" ${i.checked !== false ? 'checked' : ''}>
                ${i.badge ? `<span class="badge bg-${i.badgeClass ?? 'secondary'}" style="font-size:0.65rem;min-width:1.4rem;">${i.badge}</span>` : ''}
                ${i.icon  ? `<i class="bi ${i.icon}"></i>` : ''}
                <label for="am_${uid}_${idx}" class="text-truncate mb-0 flex-fill" style="cursor:pointer;" title="${i.label}">${i.label}</label>
            </div>`).join('');
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
    openActionModal(
        title,
        runLabel,
        runClass,
        async (files, message) => {
            const param: any = { action, path, files };
            if (action === 'commit') param.message = message;
            const res = await CFecth.Exe(CPath.WebRootUrl() + "File/VCS", param, "json") as any;
            if (res.ok) FolderCD(window["g_path"]);
            return { result: res.msg || (res.ok ? 'Done' : 'Failed'), refresh: res.ok };
        },
        action === 'commit',
        async () => {
            const res = await CFecth.Exe(CPath.WebRootUrl() + "File/VCS", { action: "status", path }, "json") as any;
            if (!res.ok) return [];
            const items = res.items as {status: string, file: string}[];
            const filtered = action === 'add' ? items.filter(i => i.status === '?') : items;
            return filtered.map(i => ({ badge: i.status, badgeClass: statusColor(i.status), label: i.file, value: i.file, checked: true }));
        }
    );
}

async function openVcsDiff(filePath: string) {
    let res: any;
    try {
        res = await CFecth.Exe(CPath.WebRootUrl() + "File/VCS", { action: "diff", path: filePath }, "json");
    } catch (e) {
        CAlert.Info("Diff request failed"); return;
    }
    if (!res?.ok) { CAlert.Info(res?.msg || "Diff failed"); return; }

    // ?쇱씤踰덊샇 td媛 position:absolute???ㅽ겕濡??곸뿭 ?덉뿉 湲곗???position:relative)???꾩슂.
    // ?놁쑝硫??몃줈 ?ㅽ겕濡???肄붾뱶留??吏곸씠怨??쇱씤踰덊샇媛 ?닿툔?? 1?뚮쭔 二쇱엯.
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
    }, 80);
}
window["openVcsDiff"] = openVcsDiff;

function openDeleteModal() {
    const dirList = (window["g_dirList"] as Array<{file:boolean, name:string, hidden?:boolean}>) ?? [];
    openActionModal(
        'Delete',
        'Delete',
        'btn-danger',
        async (names) => {
            const lines: string[] = [];
            for (const name of names) {
                const param: any = { data: window["g_path"] + name };
                if (RootPath) param.RootPath = RootPath;
                const res = await CFecth.Exe(CPath.WebRootUrl() + "File/Delete", param, "json") as any;
                lines.push(`${res.ok ? 'OK' : 'FAIL'} ${name}`);
            }
            FolderCD(window["g_path"]);
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
        const data = window["g_path"] + folderName;
        const param: any = { data };
        if (RootPath) param.RootPath = RootPath;
        const j = await CFecth.Exe(CPath.WebRootUrl() + "File/Mkdir", param, "json") as any;
        if (j?.ok) FolderCD(window["g_path"]);
        else CAlert.E("?대뜑 ?앹꽦 ?ㅽ뙣");
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
// ?쒕쾭 猷⑦듃 ?⑥쐞濡?罹먯떆 ?좎? ??寃쎈줈媛 諛붾뚯뼱???좎?, ?대떦 subtree ??ぉ留??쒖슜
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

        // startPath ?섏쐞 罹먯떆媛 ?덉쑝硫?利됱떆 ?쒖떆
        const hasCached = [...g_srchCache.keys()].some(k => k.startsWith(startPath));
        if (hasCached) {
            const n = renderFromCache(startPath, query);
            status.textContent = `(Cached: ${n}) Refreshing...`;
        } else {
            results.innerHTML = '';
            status.textContent = 'Scanning...';
        }

        // 理쒖떊 ?ㅼ틪 ???꾨즺 ??罹먯떆 ?낅뜲?댄듃 & 寃곌낵 援먯껜
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
        <div class="mb-2 small text-secondary">?꾩옱 ?대뜑 怨듭쑀 留곹겕</div>
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
                msg.textContent = 'Copy failed ??select and copy manually.';
            }
        });
    }, 80);
}
window["FileShare"] = FileShare;



CDOM.ID("uploadBtn").onchange=async (e)=>{

    var fi=e.target as HTMLInputElement;
    const path=window["g_root"]+window["g_path"];

    // arrayBuffer() ???FileReader ?ъ슜: iOS Safari?먯꽌 ??⑸웾 ?뚯씪 ?덉젙?깆씠 ?믪쓬
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
            await CFecth.Exe("File/Upload",{data:[data],name:[name],path});
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
    
    for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number,Status?:string}>)
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
    for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number,Status?:string}>)
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
    CAlert.Info("???댁긽 ?놁뒿?덈떎.");
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




























