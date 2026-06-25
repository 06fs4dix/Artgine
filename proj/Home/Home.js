import "../../artgine/artgine.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { MountDownloadTab } from "./Downloads/DownloadTab.js";
CClass.Push(MountDownloadTab);
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
gPF.mWASM = false;
gPF.mCanvas = "";
gPF.mServer = 'webServer';
gPF.mGitHub = false;
gPF.mVersion = "mqtgsq45_2";
import { CAtelier } from "../../artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CSing, CSingOption } from "../../artgine/server/CSing.js";
import { CConfirm, CModal } from "../../artgine/basic/CModal.js";
import { CUtilWeb } from "../../artgine/util/CUtilWeb.js";
import { CStorage } from "../../artgine/system/CStorage.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CDOM } from "../../artgine/basic/CDOM.js";
import { CFecth } from "../../artgine/network/CFecth.js";
import { CPath } from "../../artgine/basic/CPath.js";
import { getAuthToken, setAuthToken, removeAuthToken } from "../../artgine/server/CAuthToken.js";
import { CFileViewer, CMDViewer, CSheetViewer, CModalStackMsg, CModalMusic } from "../../artgine/util/CModalUtil.js";
import { CPWA } from '../../artgine/system/CPWA.js';
import { Bootstrap } from "../../artgine/basic/Bootstrap.js";
if (gPF.mServer != "webServer")
    CAlert.E("Server setting is invalid.");
CUtilWeb.Parameter("");
if (!CPWA.IsInstalled()) {
    CDOM.ID("install-btn").style.display = "";
}
CDOM.ID("install-btn").addEventListener("click", () => {
    let msg = CPWA.Install();
    if (msg)
        CAlert.Info(msg);
});
const MODAL_DOM_DELAY = 100;
const DEFAULT_AUTH_PASSWORD = 'artgine';
function warnIfDefaultAuthPassword(pw) {
    if (pw === DEFAULT_AUTH_PASSWORD)
        CAlert.E("Please change the default password.");
}
const aiFrameContainer = CDOM.ID("ai-frame-container");
const aiFramePlaceholder = CDOM.ID("ai-frame-placeholder");
function updateFramePlaceholder() {
    aiFramePlaceholder.style.display = activeFrameKey ? 'none' : '';
}
const aiSessionList = CDOM.ID("aiSessionList");
const aiNewChatBtn = CDOM.ID("aiNewChatBtn");
let aiInited = false;
async function loadAiProviderStatus() {
    const el = document.getElementById('aiProviderStatus');
    if (!el)
        return;
    try {
        const r = await fetch(CPath.WebRootUrl() + 'cmd/provider-state');
        const list = await r.json();
        el.innerHTML = list.map(p => {
            const rowClass = !p.installed ? 'bg-secondary-subtle' : p.authenticated ? 'bg-success-subtle' : 'bg-warning-subtle';
            const icon = !p.installed ? 'bi-x-circle text-secondary' : p.authenticated ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle-fill text-warning';
            const status = !p.installed ? 'Not Installed' : p.authenticated ? 'Ready' : 'Not Authenticated';
            const ver = p.version ? `<span class="text-secondary ms-2" style="font-size:0.85em;">v${p.version}</span>` : '';
            return `<div class="d-flex align-items-center justify-content-between rounded px-3 py-2 ${rowClass}" style="font-size:1.05rem;">
                <span class="fw-semibold text-capitalize">${p.id}${ver}</span>
                <span class="d-flex align-items-center gap-1"><i class="bi ${icon}"></i>${status}</span>
            </div>`;
        }).join('');
    }
    catch (e) {
        console.error('provider-state error:', e);
    }
}
loadAiProviderStatus();
const iframePool = new Map();
let activeFrameKey = null;
let pendingNewSid = null;
let _activeNotifCallback = null;
function isAiPanelActive() {
    return document.getElementById('ai-panel')?.classList.contains('active') === true;
}
function isRdpPanelActive() {
    return document.getElementById('rdp-panel')?.classList.contains('active') === true;
}
function isAiAuthVisible() {
    const overlay = document.getElementById('ai-auth-overlay');
    return !!overlay && overlay.style.display !== 'none';
}
function handleTermSidebarShortcut(e) {
    if (!isAiPanelActive())
        return false;
    if (isAiAuthVisible())
        return false;
    if (!aiSidebarEl.classList.contains('show'))
        return false;
    if (e.shiftKey && !e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        e.stopPropagation();
        termStartNew('cmd');
        return true;
    }
    if (e.shiftKey && !e.ctrlKey && e.key.toLowerCase() === 'd') {
        if (!activeFrameKey?.startsWith('term:'))
            return false;
        e.preventDefault();
        e.stopPropagation();
        termConfirmKillSession(parseInt(activeFrameKey.slice(5), 10));
        return true;
    }
    return false;
}
function _showModalStackMsg(label, content, onClick) {
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
                onClick();
                m.Close();
                _activeNotifCallback = null;
            });
        }, 0);
    }
    m.Close(8);
    setTimeout(() => { if (_activeNotifCallback === onClick)
        _activeNotifCallback = null; }, 8000);
}
function _showDoneNotification(label, content, onClick) {
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
function isActiveFrame(key) {
    return activeFrameKey === key;
}
const myAppContainerEl = document.querySelector('.container');
const myTabBarEl = document.getElementById('myTab');
const myTabContentEl = document.getElementById('myTabContent');
const FILE_LIST_AUTHED_CLASS = 'file-list-authed';
function installFileAuthIndicatorStyle() {
    if (document.getElementById('file-auth-indicator-style'))
        return;
    const style = document.createElement('style');
    style.id = 'file-auth-indicator-style';
    style.textContent = `
        #File_div.${FILE_LIST_AUTHED_CLASS} {
            outline: 2px solid #dc3545;
            outline-offset: -2px;
            border-radius: .375rem;
            box-shadow: 0 0 0 .12rem rgba(220, 53, 69, .18);
        }
    `;
    document.head.appendChild(style);
}
function applyFileAuthIndicator(authed) {
    const fileList = document.getElementById('File_div');
    if (!fileList)
        return;
    fileList.classList.toggle(FILE_LIST_AUTHED_CLASS, authed);
    fileList.setAttribute('title', authed ? 'File admin authenticated' : '');
}
installFileAuthIndicatorStyle();
function syncFrameContainerSize() {
    if (!myAppContainerEl || !myTabBarEl || !myTabContentEl)
        return;
    const viewportH = window.innerHeight;
    myAppContainerEl.style.height = `${viewportH}px`;
    const tabBarH = myTabBarEl.getBoundingClientRect().height;
    myTabContentEl.style.flex = '0 0 auto';
    myTabContentEl.style.height = `${Math.max(0, viewportH - tabBarH)}px`;
}
syncFrameContainerSize();
window.addEventListener('resize', syncFrameContainerSize);
window.addEventListener('orientationchange', syncFrameContainerSize);
if (myTabBarEl)
    new ResizeObserver(syncFrameContainerSize).observe(myTabBarEl);
function showTab(target) {
    const el = /^[[#.]/.test(target) ? document.querySelector(target) : document.getElementById(target);
    if (el)
        window.bootstrap.Tab.getOrCreateInstance(el).show();
}
function runHomeHotkey(key) {
    switch (key) {
        case 'F1':
            showTab('file-tab');
            FileBtn();
            return true;
        case 'F2':
            showTab('file-tab');
            FileSearch();
            return true;
        case 'F3':
            showTab('rdp-tab');
            return true;
        case 'F4':
            showTab('ai-tab');
            return true;
        case 'F7':
            showTab('memo-tab');
            return true;
    }
    return false;
}
function postFrameVisible(f, visible) {
    try {
        f?.contentWindow?.postMessage({ type: 'frame-visibility', visible }, '*');
    }
    catch (_) { }
}
function postFrameMessage(key, msg) {
    const f = iframePool.get(key);
    try {
        f?.contentWindow?.postMessage(msg, '*');
    }
    catch (_) { }
}
function showPooledFrame(ctx, key, src) {
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
        if (prev)
            prev.style.display = 'none';
    }
    f.style.display = 'block';
    ctx.setActiveKey(key);
    ctx.updatePlaceholder();
    ctx.onActivate?.(key, prevKey);
    return f;
}
function destroyPooledFrame(ctx, key) {
    const f = ctx.pool.get(key);
    if (!f)
        return;
    f.remove();
    ctx.pool.delete(key);
    if (ctx.getActiveKey() === key)
        ctx.setActiveKey(null);
    ctx.updatePlaceholder();
}
const noFocusTermKeys = new Set();
function isAiTabActive() { return CDOM.ID('ai-tab').classList.contains('active'); }
function isBrowserSubtabActive() { return CDOM.ID('ai-browser-subtab').classList.contains('active'); }
function updateBrowserFrameVisibility() {
    if (!activeFrameKey?.startsWith('browser:'))
        return;
    const f = iframePool.get(activeFrameKey);
    postFrameVisible(f, isAiTabActive() && isBrowserSubtabActive());
}
const aiFrameCtx = {
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
                if (noFocusTermKeys.has(key)) {
                    noFocusTermKeys.delete(key);
                }
                else {
                    postFrameMessage(key, { type: 'focus-input' });
                }
            }
            try {
                f.contentWindow?.addEventListener('keydown', (e) => {
                    if (isTerm && handleTermSidebarShortcut(e))
                        return;
                    if (!isTerm && e.key === 'Tab') {
                        e.preventDefault();
                        handleTabKey();
                        return;
                    }
                    if (!isTerm && e.key === 'ArrowRight' && _activeNotifCallback) {
                        e.preventDefault();
                        handleNotifKey();
                        return;
                    }
                    if (!isTerm && e.key === 'ArrowLeft' && goPrevFrame()) {
                        e.preventDefault();
                        return;
                    }
                    if (!isTerm && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                        if (aiSidebarEl.classList.contains('show')) {
                            e.preventDefault();
                            goNextSession(e.key === 'ArrowUp' ? -1 : 1);
                            return;
                        }
                    }
                    if (!isTerm && (e.key === '1' || e.key === '2' || e.key === '3') && !e.ctrlKey && !e.altKey && !e.metaKey) {
                        if (aiSidebarEl.classList.contains('show')) {
                            const target = e.target;
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
            }
            catch (_) { }
        });
    },
    onActivate: (key, prevKey) => {
        if (prevKey && prevKey.startsWith('browser:'))
            postFrameVisible(iframePool.get(prevKey), false);
        if (key.startsWith('browser:'))
            updateBrowserFrameVisibility();
    },
};
function showFrame(key, src) {
    syncFrameContainerSize();
    return showPooledFrame(aiFrameCtx, key, src);
}
function destroyFrame(key) {
    destroyPooledFrame(aiFrameCtx, key);
}
function focusActiveFrame() {
    if (!activeFrameKey)
        return;
    if (activeFrameKey.startsWith('term:') || activeFrameKey.startsWith('term-new:')) {
        postFrameMessage(activeFrameKey, { type: 'focus-input' });
        return;
    }
    const f = iframePool.get(activeFrameKey);
    if (!f)
        return;
    try {
        f.contentWindow?.focus();
        const input = f.contentDocument?.querySelector('textarea, input');
        if (input) {
            input.focus();
            return;
        }
    }
    catch (_) { }
    f.focus();
}
function focusActiveFrameIfSidebarCollapsed() {
    if (aiSidebarEl.classList.contains('show'))
        return;
    setTimeout(() => focusActiveFrame(), 0);
}
function uuidv4() {
    if (crypto && 'randomUUID' in crypto)
        return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function authedFetch(url, init) {
    return fetch(url, init);
}
function aiFormatRelative(ts) {
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
function aiEscapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function aiLoadSession(sid) {
    showFrame(`chat:${sid}`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(sid)}`);
    aiRefreshSessions();
    termRefreshSessions();
}
async function aiRefreshSessions() {
    if (document.querySelector('.dropdown-menu.show'))
        return;
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
        if (!j.ok)
            return;
        aiSessionList.innerHTML = '';
        const sessions = j.sessions;
        const serverSids = new Set(sessions.map(s => s.sessionId));
        for (const key of Array.from(iframePool.keys())) {
            if (!key.startsWith('chat:'))
                continue;
            if (pendingNewSid && key === `chat:${pendingNewSid}`)
                continue;
            if (!serverSids.has(key.slice(5)))
                destroyFrame(key);
        }
        for (const s of sessions) {
            const key = `chat:${s.sessionId}`;
            const isActive = activeFrameKey === key;
            const isLoaded = iframePool.has(key);
            const rel = aiFormatRelative(s.updatedAt);
            const st = !isLoaded ? 'off' : s.busy ? 'busy' : 'idle';
            syncSessState(`chat:${s.sessionId}`, st, () => {
                if (!isActiveFrame(key) || !document.hasFocus())
                    _showDoneNotification(aiEscapeHtml(s.title), s.lastMsg ? aiEscapeHtml(s.lastMsg) : undefined, () => aiLoadSession(s.sessionId));
            });
            const dot = st === 'off' ? '<span class="text-danger small" title="미연결">●</span>'
                : st === 'busy' ? '<span class="ai-busy-dot text-warning small" title="처리 중">●</span>'
                    : '<span class="text-success small" title="대기 중">●</span>';
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
                        () => { },
                    ], ["Delete", "Cancel"]);
                    delConfirm.Open();
                },
                popup: { url: () => `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(s.sessionId)}`, title: s.title, winName: `chat_${s.sessionId}` },
            });
            aiSessionList.appendChild(item);
        }
    }
    catch (e) {
        console.error('AI session list error:', e);
    }
}
function refreshSessionsSoon() {
    setTimeout(() => { aiRefreshSessions(); termRefreshSessions(); }, 1500);
    setTimeout(() => { aiRefreshSessions(); termRefreshSessions(); }, 4000);
}
aiNewChatBtn.addEventListener('click', () => chatStartNew());
function chatStartNew(initialWorkingDir) {
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
        const mcpCheck = container.querySelector('#chat-opt-mcp');
        const mdcopyCheck = container.querySelector('#chat-opt-mdcopy');
        const workingDirInput = container.querySelector('#chat-opt-workingDir');
        if (initialWorkingDir)
            workingDirInput.value = initialWorkingDir;
        const doOpen = () => {
            const sid = uuidv4();
            const workingDir = workingDirInput.value.trim();
            const params = new URLSearchParams({ session: sid });
            if (!mcpCheck.checked)
                params.set('mcp', '0');
            if (workingDir)
                params.set('workingDir', workingDir);
            if (mdcopyCheck.checked)
                params.set('mdcopy', '1');
            pendingNewSid = sid;
            showFrame(`chat:${sid}`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?${params.toString()}`);
            aiRefreshSessions();
            termRefreshSessions();
            refreshSessionsSoon();
            modal.Close();
        };
        container.querySelector('#chat-modal-open').addEventListener('click', doOpen);
        container.querySelector('#chat-modal-cancel').addEventListener('click', () => modal.Close());
        workingDirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            doOpen(); });
    }, MODAL_DOM_DELAY);
}
const termNewBtn = CDOM.ID("termNewBtn");
const termSessionList = CDOM.ID("termSessionList");
let termActivePort = null;
const _sessState = new Map();
function syncSessState(id, cur, onDone, onWait) {
    const prev = _sessState.get(id);
    if ((prev === 'busy' || prev === 'wait') && cur === 'idle')
        onDone();
    if (prev !== 'wait' && cur === 'wait')
        onWait?.();
    _sessState.set(id, cur);
}
async function termStartNew(_mode = 'cmd', initialWorkingDir) {
    const token = getAuthToken(CPath.WebRootUrl());
    if (token) {
        try {
            const r = await authedFetch(CPath.WebRootUrl() + 'cmd/sessions');
            const j = await r.json();
            if (j.ok) {
                const aliveCount = j.sessions.filter((s) => s.alive).length;
                if (aliveCount >= 9) {
                    alert('터미널 세션이 가득 찼습니다 (최대 9개).\n기존 세션을 삭제한 후 다시 시도하세요.');
                    return;
                }
            }
        }
        catch { }
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
        let selectedMode = _mode;
        const modeButtons = container.querySelectorAll('.term-mode-btn');
        const mcpCheck = container.querySelector('#term-opt-mcp');
        const mdcopyCheck = container.querySelector('#term-opt-mdcopy');
        const updateModeUI = (mode) => {
            selectedMode = mode;
            modeButtons.forEach(b => {
                b.classList.toggle('btn-primary', b.dataset.mode === mode);
                b.classList.toggle('btn-outline-secondary', b.dataset.mode !== mode);
            });
        };
        modeButtons.forEach(b => b.addEventListener('click', () => updateModeUI(b.dataset.mode)));
        updateModeUI(selectedMode);
        const keyInput = container.querySelector('#term-opt-key');
        const workingDirInput = container.querySelector('#term-opt-workingDir');
        if (initialWorkingDir)
            workingDirInput.value = initialWorkingDir;
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
            openBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Opening...`;
            try {
                const key = keyInput.value.trim();
                const workingDir = workingDirInput.value.trim();
                const params = new URLSearchParams({ mode: selectedMode });
                if (key)
                    params.set('key', key);
                if (workingDir)
                    params.set('workingDir', workingDir);
                if (!mcpCheck.checked)
                    params.set('mcp', '0');
                if (mdcopyCheck.checked)
                    params.set('mdcopy', '1');
                const r = await authedFetch(CPath.WebRootUrl() + 'cmd/start-ttyd?' + params.toString());
                const j = await r.json();
                if (!j.ok) {
                    alert(j.msg || 'Failed to start terminal');
                    return;
                }
                modal.Close();
                const key2 = `term-new:${Date.now()}`;
                showFrame(key2, `${CPath.WebRootUrl()}cmd/terminal-proxy?port=${j.port}`);
                aiRefreshSessions();
                termRefreshSessions();
                refreshSessionsSoon();
            }
            catch (e) {
                console.error('[Terminal] start-ttyd error:', e);
                alert('Failed to start terminal');
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
        workingDirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            doOpen(); });
    }, MODAL_DOM_DELAY);
}
async function termConnectSession(port, focusInput = true) {
    const key = `term:${port}`;
    if (iframePool.has(key)) {
        showFrame(key, '');
        aiRefreshSessions();
        termRefreshSessions();
        if (focusInput)
            postFrameMessage(key, { type: 'focus-input' });
        return;
    }
    if (!focusInput)
        noFocusTermKeys.add(key);
    showFrame(key, `${CPath.WebRootUrl()}cmd/terminal-proxy?port=${port}`);
    aiRefreshSessions();
    termRefreshSessions();
}
async function termKillSession(port) {
    try {
        const r = await authedFetch(`${CPath.WebRootUrl()}cmd/kill-session?port=${port}`);
        const j = await r.json();
        if (!j.ok) {
            alert(`삭제 실패: ${j.msg || 'unknown error'}`);
            return;
        }
        termRefreshSessions();
        aiRefreshSessions();
    }
    catch (e) {
        console.error('termKillSession error:', e);
    }
}
function termConfirmKillSession(port) {
    const item = termSessionList.querySelector(`[data-port="${port}"]`);
    const label = item?.querySelector('.fw-semibold')?.textContent || `Terminal ${port}`;
    const confirm = new CConfirm();
    confirm.SetBody(`Delete ${aiEscapeHtml(label)}?`);
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => { termKillSession(port); },
        () => { },
    ], ["Delete", "Cancel"]);
    confirm.Open();
}
async function termRefreshSessions() {
    if (document.querySelector('.dropdown-menu.show'))
        return;
    try {
        const r = await fetch(CPath.WebRootUrl() + 'cmd/sessions');
        const j = await r.json();
        if (!j.ok)
            return;
        termSessionList.innerHTML = '';
        const sessions = j.sessions;
        const serverPorts = new Set(sessions.map(s => s.port));
        for (const key of Array.from(iframePool.keys())) {
            if (!key.startsWith('term:'))
                continue;
            if (!serverPorts.has(parseInt(key.slice(5), 10)))
                destroyFrame(key);
        }
        const termNewKeys = Array.from(iframePool.keys()).filter(k => k.startsWith('term-new:'));
        if (termNewKeys.length > 0) {
            const newSessions = sessions.filter(s => !iframePool.has(`term:${s.port}`));
            if (newSessions.length > 0) {
                const newest = newSessions.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
                const key = `term:${newest.port}`;
                const newKey = termNewKeys[0];
                const f = iframePool.get(newKey);
                iframePool.delete(newKey);
                iframePool.set(key, f);
                if (activeFrameKey === newKey)
                    activeFrameKey = key;
            }
        }
        for (const s of sessions) {
            const key = `term:${s.port}`;
            const isActive = activeFrameKey === key;
            const isLoaded = iframePool.has(key);
            const rel = aiFormatRelative(s.updatedAt);
            const preview = aiEscapeHtml(s.lastMsg || '(empty)');
            const dotLabel = s.mode.slice(0, 3);
            const dotTitle = s.key || s.mode;
            const st = !s.alive ? 'off'
                : s.permPending ? 'wait'
                    : !isLoaded ? 'off'
                        : s.busy ? 'busy'
                            : 'idle';
            syncSessState(`term:${s.port}`, st, () => {
                const rawPreview = s.lastMsg || '';
                if (!isActiveFrame(key) || !document.hasFocus())
                    _showDoneNotification(`${s.key || s.mode}: ${rawPreview}`.trimEnd(), rawPreview ? preview : undefined, () => termConnectSession(s.port));
            }, () => {
                if (!isActiveFrame(key) || !document.hasFocus())
                    _showDoneNotification(`⚠️ ${s.key || s.mode}: 권한 승인 필요`, s.lastMsg || undefined, () => termConnectSession(s.port));
            });
            const dot = st === 'off' ? `<span class="badge rounded-pill bg-danger" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
                : st === 'wait' ? `<span class="badge rounded-pill bg-warning term-busy-dot" title="${aiEscapeHtml(dotTitle)}" style="filter:hue-rotate(30deg)">${dotLabel}</span>`
                    : st === 'busy' ? `<span class="badge rounded-pill bg-warning term-busy-dot" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`
                        : `<span class="badge rounded-pill bg-success" title="${aiEscapeHtml(dotTitle)}">${dotLabel}</span>`;
            const item = createSessionItem({
                activeClass: 'bg-success-subtle',
                isActive,
                dataAttr: { name: 'port', value: String(s.port) },
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
                onClick: () => termConnectSession(s.port),
                onShare: () => termShowShareLink(s.port),
                onDelete: () => termConfirmKillSession(s.port),
                popup: { url: () => `${CPath.WebRootUrl()}cmd/terminal-proxy?port=${s.port}`, title: s.key || s.mode || 'Terminal', winName: `term_${s.port}` },
            });
            termSessionList.appendChild(item);
        }
    }
    catch (e) {
        console.error('Terminal session list error:', e);
    }
}
function termShowShareLink(port) {
    showShareLinkModal('Terminal Share Link', 'Anyone with this link can view the terminal in read-only mode.', `${CPath.WebRootUrl()}cmd/terminal-proxy?port=${port}`);
}
function aiShowShareLink(sessionId, title) {
    showShareLinkModal('AI Chat Share Link', `Anyone with this link can view the chat: <strong>${aiEscapeHtml(title)}</strong>`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Chat.html?session=${encodeURIComponent(sessionId)}&share=1`);
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
function createSessionItem(spec) {
    const item = document.createElement('div');
    item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
        + (spec.isActive ? ' ' + spec.activeClass : '');
    item.dataset[spec.dataAttr.name] = spec.dataAttr.value;
    if (spec.cursorPointer)
        item.style.cursor = 'pointer';
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
    item.addEventListener('click', (e) => {
        if (e.target.closest('.dropdown'))
            return;
        spec.onClick();
    });
    const dropEl = item.querySelector('.dropdown');
    new window.bootstrap.Dropdown(dropEl.querySelector('[data-bs-toggle="dropdown"]'), { popperConfig: { strategy: 'fixed' } });
    item.querySelector('[data-act="link"]').addEventListener('click', spec.onShare);
    wirePopupActions(item, spec.popup.url, spec.popup.title, spec.popup.winName);
    item.querySelector(`[data-act="${spec.deleteAct}"]`).addEventListener('click', spec.onDelete);
    item.addEventListener('mouseenter', () => { if (!spec.isActive)
        item.classList.add('bg-body-secondary'); });
    item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
    return item;
}
termNewBtn.addEventListener('click', () => termStartNew('cmd'));
const schedNewBtn = CDOM.ID("schedNewBtn");
const schedSessionList = CDOM.ID("schedSessionList");
function schedIntervalStr(s) {
    const parts = [`${s.delay}s`];
    if (s.count > 0)
        parts.push(`×${s.count}`);
    if (s.start > 0)
        parts.push(`+${s.start}s`);
    if (s.end > 0)
        parts.push(`~${s.end}s`);
    return parts.join(' ');
}
async function schedRefresh() {
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/schedules');
        const j = await r.json();
        if (!j.ok)
            return;
        schedSessionList.innerHTML = '';
        const schedules = j.schedules;
        if (schedules.length === 0)
            return;
        for (const s of schedules) {
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-1 rounded';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:2rem;">
                    <span class="badge rounded-pill ${s.mode === 'none' ? 'bg-secondary' : s.mode === 'cmd' ? 'bg-info' : s.mode === 'claude' ? 'bg-warning text-dark' : s.mode === 'codex' ? 'bg-primary' : s.mode === 'opencode' ? 'bg-success' : 'bg-danger'}" style="font-size:0.65rem;">${s.mode === 'antigravity' ? 'agy' : s.mode}</span>
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
            item.querySelector('.sched-del-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(`스케줄 '${s.name}' 을 삭제할까요?`))
                    return;
                await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-del?name=${encodeURIComponent(s.name)}`);
                schedRefresh();
            });
            item.addEventListener('mouseenter', () => item.classList.add('bg-body-secondary'));
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
            schedSessionList.appendChild(item);
        }
    }
    catch (e) {
        console.error('schedRefresh error:', e);
    }
}
function schedOpenModal(existing) {
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
        const modeBtns = container.querySelectorAll('.sched-mode-btn');
        const updateMode = (m) => {
            selectedMode = m;
            modeBtns.forEach(b => {
                b.classList.toggle('btn-primary', b.dataset.mode === m);
                b.classList.toggle('btn-outline-secondary', b.dataset.mode !== m);
            });
        };
        modeBtns.forEach(b => b.addEventListener('click', () => updateMode(b.dataset.mode)));
        updateMode(selectedMode);
        const doSave = async () => {
            const name = (container.querySelector('#sched-name')).value.trim();
            const tkey = (container.querySelector('#sched-tkey')).value.trim();
            const command = (container.querySelector('#sched-cmd')).value.trim();
            const delay = Math.max(0, parseInt((container.querySelector('#sched-delay')).value) || 0);
            const count = Math.max(0, parseInt((container.querySelector('#sched-count')).value) || 0);
            const start = Math.max(0, parseInt((container.querySelector('#sched-start')).value) || 0);
            const end = Math.max(0, parseInt((container.querySelector('#sched-end')).value) || 0);
            const cwd = (container.querySelector('#sched-cwd')).value.trim();
            const allow = (container.querySelector('#sched-allow')).checked;
            const mcp = (container.querySelector('#sched-mcp')).checked;
            const mdcopy = (container.querySelector('#sched-mdcopy')).checked;
            if (!name || !tkey || !command) {
                alert('Name, terminal key, and command are required');
                return;
            }
            if (delay === 0) {
                alert('Delay must be at least 1 second');
                return;
            }
            const params = new URLSearchParams({ name, terminalKey: tkey, mode: selectedMode, command,
                delay: String(delay), count: String(count), start: String(start), end: String(end),
                allow: allow ? '1' : '0', mcp: mcp ? '1' : '0', mdcopy: mdcopy ? '1' : '0' });
            if (cwd)
                params.set('cwd', cwd);
            const r = await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-set?${params.toString()}`);
            const j = await r.json();
            if (!j.ok) {
                alert(j.msg || 'Failed');
                return;
            }
            modal.Close();
            schedRefresh();
        };
        container.querySelector('#sched-modal-save').addEventListener('click', doSave);
        container.querySelector('#sched-modal-cancel').addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}
schedNewBtn.addEventListener('click', () => schedOpenModal());
setInterval(() => {
    if (CDOM.ID("ai-panel").classList.contains("show")) {
        aiRefreshSessions();
        termRefreshSessions();
        schedRefresh();
        browserRefreshList();
    }
}, 5000);
window.addEventListener('message', (e) => {
    if (e.data?.type === 'ai-sessions-changed') {
        pendingNewSid = null;
        aiRefreshSessions();
    }
    if (e.data?.type === 'browser-sessions-changed') {
        browserRefreshList();
    }
    if (e.data?.type === 'terminal-tab-key') {
        handleTabKey();
    }
    if (e.data?.type === 'rdp-tab-key') {
        if (isRdpPanelActive())
            handleRdpTabKey();
    }
    if (e.data?.type === 'terminal-arrow-key') {
        if (e.data.key === 'ArrowLeft')
            goPrevFrame();
        else if (e.data.key === 'ArrowUp')
            goNextSession(-1);
        else if (e.data.key === 'ArrowDown')
            goNextSession(1);
        else
            handleNotifKey();
    }
    if (e.data?.type === 'home-hotkey') {
        runHomeHotkey(e.data.key);
    }
});
function handleTabKey() {
    toggleSidebar();
}
let _notifReturnKey = null;
let _notifReturnTimer = null;
function handleNotifKey() {
    if (_activeNotifCallback) {
        const cb = _activeNotifCallback;
        _activeNotifCallback = null;
        const from = activeFrameKey;
        cb();
        if (from && from !== activeFrameKey) {
            _notifReturnKey = from;
            if (_notifReturnTimer)
                clearTimeout(_notifReturnTimer);
            _notifReturnTimer = window.setTimeout(() => { _notifReturnKey = null; }, 8000);
        }
        focusActiveFrameIfSidebarCollapsed();
        return true;
    }
    return false;
}
function goPrevFrame() {
    if (!_notifReturnKey || _notifReturnKey === activeFrameKey)
        return false;
    const f = iframePool.get(_notifReturnKey);
    if (!f) {
        _notifReturnKey = null;
        return false;
    }
    showFrame(_notifReturnKey, f.src);
    _notifReturnKey = null;
    if (_notifReturnTimer) {
        clearTimeout(_notifReturnTimer);
        _notifReturnTimer = null;
    }
    aiRefreshSessions();
    termRefreshSessions();
    focusActiveFrameIfSidebarCollapsed();
    return true;
}
function goNextSession(dir) {
    if (!aiSidebarEl.classList.contains('show'))
        return false;
    const subtab = document.getElementById('ai-chat-subtab')?.classList.contains('active') ? 'chat'
        : document.getElementById('ai-term-subtab')?.classList.contains('active') ? 'term'
            : 'browser';
    if (subtab === 'chat') {
        const items = Array.from(aiSessionList.querySelectorAll('[data-sid]'));
        if (items.length === 0)
            return false;
        const curIdx = activeFrameKey?.startsWith('chat:')
            ? items.findIndex(el => el.dataset.sid === activeFrameKey.slice(5))
            : -1;
        const nxt = curIdx === -1 ? 0 : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (nxt === curIdx)
            return false;
        aiLoadSession(items[nxt].dataset.sid);
        items[nxt].scrollIntoView({ block: 'nearest' });
        return true;
    }
    else if (subtab === 'term') {
        const items = Array.from(termSessionList.querySelectorAll('[data-port]'));
        if (items.length === 0)
            return false;
        const curIdx = activeFrameKey?.startsWith('term:')
            ? items.findIndex(el => `term:${el.dataset.port}` === activeFrameKey)
            : -1;
        const nxt = curIdx === -1 ? 0 : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (nxt === curIdx)
            return false;
        termConnectSession(parseInt(items[nxt].dataset.port), false);
        items[nxt].scrollIntoView({ block: 'nearest' });
        return true;
    }
    return false;
}
const AI_SIDEBAR_COLLAPSED_KEY = 'ai.sidebarCollapsed';
const aiSidebarEl = CDOM.ID("ai-sidebar");
const aiSidebarToggleBtn = CDOM.ID("aiSidebarToggle");
const aiSidebarOffcanvas = new window.bootstrap.Offcanvas(aiSidebarEl, { backdrop: false, scroll: true });
function openAiSidebar() {
    if (!aiSidebarEl.classList.contains('show'))
        aiSidebarOffcanvas.show();
}
aiSidebarEl.addEventListener('shown.bs.offcanvas', () => {
    aiSidebarToggleBtn.querySelector('i').className = 'bi bi-layout-sidebar-inset';
    localStorage.setItem(AI_SIDEBAR_COLLAPSED_KEY, '0');
});
aiSidebarEl.addEventListener('hidden.bs.offcanvas', () => {
    aiSidebarToggleBtn.querySelector('i').className = 'bi bi-layout-sidebar';
    localStorage.setItem(AI_SIDEBAR_COLLAPSED_KEY, '1');
});
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
    if (isAiPanelActive() && isAiAuthVisible())
        return;
    if (e.key === 'Tab') {
        if (isRdpPanelActive()) {
            e.preventDefault();
            handleRdpTabKey();
            return;
        }
        if (!isAiPanelActive())
            return;
        e.preventDefault();
        handleTabKey();
        return;
    }
    if (handleTermSidebarShortcut(e))
        return;
    if ((e.key === '1' || e.key === '2' || e.key === '3') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isAiPanelActive() && aiSidebarEl.classList.contains('show')) {
            const target = e.target;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
                e.preventDefault();
                const subtabs = ['ai-chat-subtab', 'ai-term-subtab', 'ai-browser-subtab'];
                showTab(subtabs[parseInt(e.key) - 1]);
                return;
            }
        }
    }
    if (e.key === 'ArrowRight') {
        if (!isAiPanelActive())
            return;
        if (_activeNotifCallback) {
            e.preventDefault();
            handleNotifKey();
        }
        return;
    }
    if (e.key === 'ArrowLeft') {
        if (!isAiPanelActive())
            return;
        if (goPrevFrame())
            e.preventDefault();
        return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!isAiPanelActive())
            return;
        if (aiSidebarEl.classList.contains('show'))
            e.preventDefault();
        goNextSession(e.key === 'ArrowUp' ? -1 : 1);
        return;
    }
    if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4' || e.key === 'F7') {
        e.preventDefault();
        runHomeHotkey(e.key);
    }
});
const aiAuthOverlay = CDOM.ID("ai-auth-overlay");
const aiAuthPwInput = CDOM.ID("aiAuthPwInput");
const aiAuthMsg = CDOM.ID("aiAuthMsg");
const aiAuthSubmitBtn = CDOM.ID("aiAuthSubmitBtn");
aiAuthOverlay.addEventListener('keydown', (e) => e.stopPropagation());
async function aiCheckAuth() {
    const token = getAuthToken(CPath.WebRootUrl());
    if (!token)
        return false;
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "auth/check", { token }, "json");
        const authed = !!j?.authed;
        if (!authed)
            removeAuthToken(CPath.WebRootUrl());
        return authed;
    }
    catch {
        return false;
    }
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
    }
    else {
        refreshFileAuthState();
        aiAuthOverlay.style.display = 'none';
        aiRefreshSessions();
        termRefreshSessions();
    }
}
async function aiDoAuth() {
    const pw = aiAuthPwInput.value;
    if (!pw)
        return;
    aiAuthSubmitBtn.disabled = true;
    aiAuthMsg.textContent = '';
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "auth/login", { password: pw }, "json");
        if (j.ok) {
            setAuthToken(CPath.WebRootUrl(), j.token);
            refreshFileAuthState();
            aiAuthOverlay.style.display = 'none';
            aiRefreshSessions();
            termRefreshSessions();
            warnIfDefaultAuthPassword(pw);
        }
        else {
            aiAuthMsg.textContent = j.msg || 'Wrong password';
        }
    }
    catch {
        aiAuthMsg.textContent = 'Server error';
    }
    aiAuthSubmitBtn.disabled = false;
}
aiAuthSubmitBtn.addEventListener('click', aiDoAuth);
aiAuthPwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
    aiDoAuth(); });
CDOM.ID("ai-chat-subtab").addEventListener("shown.bs.tab", () => aiRefreshSessions());
CDOM.ID("ai-term-subtab").addEventListener("shown.bs.tab", () => { termRefreshSessions(); schedRefresh(); focusActiveFrame(); });
CDOM.ID("ai-browser-subtab").addEventListener("shown.bs.tab", () => browserRefreshList());
const browserNewBtn = CDOM.ID("browserNewBtn");
const browserSessionList = CDOM.ID("browserSessionList");
const browserSessions = new Map();
function browserLoadSession(sessionId) {
    showFrame(`browser:${sessionId}`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}`);
    _browserUpdateHighlights();
}
function _browserUpdateHighlights() {
    for (const [sid, s] of browserSessions) {
        const isActive = activeFrameKey === `browser:${sid}`;
        s.sidebarEl.classList.toggle('bg-primary-subtle', isActive);
        const dot = s.sidebarEl.querySelector('.browser-dot');
        if (dot) {
            dot.classList.toggle('text-success', isActive);
            dot.classList.toggle('text-danger', !isActive);
        }
    }
}
function browserFmtTtl(expiresAt) {
    const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (rem <= 0)
        return '−0s';
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return m > 0 ? `−${m}m${s}s` : `−${s}s`;
}
function browserAddSession(sessionId, url, browserName = '', expiresAt = 0, navigate = true) {
    if (browserSessions.has(sessionId))
        return;
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
    const ttlEl = sidebarEl.querySelector('.browser-ttl-label');
    browserSessionList.appendChild(sidebarEl);
    browserSessions.set(sessionId, { sessionId, url, browserName, expiresAt, sidebarEl, ttlEl });
    if (navigate)
        browserLoadSession(sessionId);
}
async function browserRemoveSession(sessionId) {
    const s = browserSessions.get(sessionId);
    if (!s)
        return;
    s.sidebarEl.remove();
    browserSessions.delete(sessionId);
    destroyFrame(`browser:${sessionId}`);
    try {
        await authedFetch(`${CPath.WebRootUrl()}PlayWright/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
    }
    catch { }
}
async function browserRefreshList() {
    if (document.querySelector('.dropdown-menu.show'))
        return;
    try {
        const r = await authedFetch(`${CPath.WebRootUrl()}PlayWright/list`);
        const j = await r.json();
        if (!j.ok)
            return;
        const serverIds = new Set(j.sessions.map(s => s.sessionId));
        for (const [sid] of Array.from(browserSessions)) {
            if (!serverIds.has(sid))
                browserRemoveSession(sid);
        }
        for (const s of j.sessions) {
            if (!browserSessions.has(s.sessionId)) {
                browserAddSession(s.sessionId, s.currentUrl, s.browserName, s.expiresAt, false);
            }
            else {
                const sess = browserSessions.get(s.sessionId);
                sess.expiresAt = s.expiresAt;
            }
        }
        _browserUpdateHighlights();
    }
    catch { }
}
function browserShowShareLink(sessionId, url) {
    showShareLinkModal('Browser Share Link', `Anyone with this link can view the session in read-only mode: <strong>${aiEscapeHtml(url)}</strong>`, `${CPath.WebRootArtgineUrl()}artgine/server/html/Browser.html?session=${encodeURIComponent(sessionId)}&readonly=1`);
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
        <div class="d-flex justify-content-between">
            <button id="brow-open" class="btn btn-primary">Open</button>
            <button id="brow-cancel" class="btn btn-danger ms-2">Cancel</button>
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
        const doOpen = async () => {
            const url = urlInput.value.trim();
            if (!url)
                return;
            const browser = browserSel.value;
            const ttl = parseInt(ttlInput.value) || 300;
            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);
            modal.Close();
            try {
                const r = await authedFetch(`${CPath.WebRootUrl()}PlayWright/push`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, ...(browser ? { browser } : {}), ttl, logSize: 200, width, height })
                });
                const j = await r.json();
                if (!j.ok) {
                    CAlert.E(j.msg || 'Failed');
                    return;
                }
                browserAddSession(j.sessionId, url, browser || 'auto', Date.now() + ttl * 1000);
            }
            catch {
                CAlert.E('Failed to start browser');
            }
        };
        container.querySelector('#brow-open').addEventListener('click', doOpen);
        container.querySelector('#brow-cancel').addEventListener('click', () => modal.Close());
        urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            doOpen(); });
        setTimeout(() => urlInput.focus(), 50);
    }, MODAL_DOM_DELAY);
});
const rdpFrameContainer = CDOM.ID("rdp-frame-container");
const rdpFramePlaceholder = CDOM.ID("rdp-frame-placeholder");
const rdpSessionList = CDOM.ID("rdpSessionList");
const rdpAddUrlInput = CDOM.ID("rdpAddUrlInput");
const rdpAddBtn = CDOM.ID("rdpAddBtn");
const rdpIframePool = new Map();
let activeRdpFrameKey = null;
function updateRdpFramePlaceholder() {
    rdpFramePlaceholder.style.display = activeRdpFrameKey ? 'none' : '';
}
function isRdpTabActive() { return CDOM.ID('rdp-tab').classList.contains('active'); }
function updateRdpFrameVisibility() {
    if (!activeRdpFrameKey)
        return;
    postFrameVisible(rdpIframePool.get(activeRdpFrameKey), isRdpTabActive());
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
function focusActiveRdpFrame() {
    if (!activeRdpFrameKey)
        return;
    const f = rdpIframePool.get(activeRdpFrameKey);
    if (!f)
        return;
    try {
        f.contentWindow?.focus();
        const inputTarget = f.contentDocument?.querySelector('#imgWrap');
        if (inputTarget) {
            inputTarget.focus();
            return;
        }
    }
    catch (_) { }
    f.focus();
}
let rdpRemotes = [];
function rdpRenderList() {
    rdpSessionList.innerHTML = '';
    const localItem = document.createElement('div');
    localItem.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
        + (activeRdpFrameKey === 'rdp:local' ? ' bg-primary-subtle' : '');
    localItem.innerHTML = `<i class="bi bi-pc-display"></i><span class="flex-grow-1">Local</span>`
        + `<button type="button" class="btn btn-sm btn-link text-secondary p-0" data-act="local-link" title="Show accessible link"><i class="bi bi-link-45deg"></i></button>`;
    localItem.addEventListener('click', () => rdpOpenLocal());
    localItem.querySelector('[data-act="local-link"]').addEventListener('click', (e) => {
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
    modal.SetHeader('Local Access Link');
    modal.SetBody(`<div id="${boxId}" class="small text-secondary">Checking accessible link...</div>`);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(480, 160);
    modal.Open(CModal.ePos.Center);
    const { url, blocked } = await rdpResolveAccessibleUrl();
    const box = document.getElementById(boxId);
    if (!box)
        return;
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
function rdpShowShareLink(remoteUrl) {
    const shareUrl = `${ParseFileHomeUrl(remoteUrl).webRootUrl}artgine/server/html/RemoteDesktop.html`;
    showShareLinkModal('Remote Desktop Share Link', `Anyone with this link can access the remote desktop: <strong>${aiEscapeHtml(remoteUrl)}</strong>`, shareUrl);
}
async function rdpOpenLocal() {
    try {
        await ConnectFileHomeUrl();
    }
    catch (e) {
        CAlert.E("Connect failed: " + (e?.message ?? String(e)));
        return;
    }
    showRdpFrame('rdp:local', `${CPath.WebRootArtgineUrl()}artgine/server/html/RemoteDesktop.html`);
    rdpRenderList();
}
async function rdpOpenRemote(index) {
    const remote = rdpRemotes[index];
    if (!remote)
        return;
    try {
        await ConnectFileHomeUrl(remote.url);
    }
    catch (e) {
        CAlert.E("Connect failed: " + (e?.message ?? String(e)));
        return;
    }
    const webRootUrl = ParseFileHomeUrl(remote.url).webRootUrl;
    showRdpFrame(`rdp:remote:${index}`, `${webRootUrl}artgine/server/html/RemoteDesktop.html`);
    rdpRenderList();
}
rdpAddBtn.addEventListener('click', () => {
    const input = rdpAddUrlInput.value.trim();
    if (!input)
        return;
    rdpRemotes.push({ url: input });
    rdpAddUrlInput.value = '';
    rdpRenderList();
});
rdpAddUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
    rdpAddBtn.click(); });
const rdpSidebarEl = CDOM.ID("rdp-sidebar");
const rdpSidebarToggleBtn = CDOM.ID("rdpSidebarToggle");
const rdpSidebarOffcanvas = new window.bootstrap.Offcanvas(rdpSidebarEl, { backdrop: false, scroll: true });
rdpSidebarEl.addEventListener('shown.bs.offcanvas', () => {
    rdpSidebarToggleBtn.querySelector('i').className = 'bi bi-layout-sidebar-inset';
});
rdpSidebarEl.addEventListener('hidden.bs.offcanvas', () => {
    rdpSidebarToggleBtn.querySelector('i').className = 'bi bi-layout-sidebar';
});
rdpSidebarEl.style.transition = 'none';
rdpSidebarOffcanvas.show();
requestAnimationFrame(() => { rdpSidebarEl.style.transition = ''; });
function toggleRdpSidebar() {
    const wasShown = rdpSidebarEl.classList.contains('show');
    rdpSidebarOffcanvas.toggle();
    setTimeout(() => wasShown ? focusActiveRdpFrame() : rdpSidebarEl.focus(), 0);
}
function handleRdpTabKey() {
    toggleRdpSidebar();
}
rdpSidebarToggleBtn.addEventListener('click', toggleRdpSidebar);
let rdpInited = false;
function rdpInitIfNeeded() {
    if (rdpInited)
        return;
    rdpInited = true;
    rdpRenderList();
    rdpOpenLocal();
}
CDOM.ID("rdp-tab").addEventListener("shown.bs.tab", () => { rdpInitIfNeeded(); updateRdpFrameVisibility(); });
CDOM.ID("rdp-tab").addEventListener("hidden.bs.tab", () => updateRdpFrameVisibility());
if (CDOM.ID("rdp-panel").classList.contains("show"))
    queueMicrotask(() => rdpInitIfNeeded());
function showAiTermSubtab() {
    showTab('ai-term-subtab');
}
CDOM.ID("ai-tab").addEventListener("shown.bs.tab", () => {
    const isFirstInit = !aiInited;
    aiInited = true;
    if (isFirstInit)
        openAiSidebar();
    showAiTermSubtab();
    aiShowAuthOrLoad();
    updateBrowserFrameVisibility();
});
CDOM.ID("ai-tab").addEventListener("hidden.bs.tab", () => updateBrowserFrameVisibility());
CDOM.ID("ai-browser-subtab").addEventListener("shown.bs.tab", () => updateBrowserFrameVisibility());
CDOM.ID("ai-browser-subtab").addEventListener("hidden.bs.tab", () => updateBrowserFrameVisibility());
if (CDOM.ID("ai-panel").classList.contains("show")) {
    aiInited = true;
    openAiSidebar();
    showAiTermSubtab();
    aiShowAuthOrLoad();
}
var g_contentJBox = new CModal("content_modal");
g_contentJBox.SetCloseToHide(true);
g_contentJBox.SetBody("<img id='ImageModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' onclick='NextPhoto()'/>" +
    "<video id='VideoModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' controls onended='NextPhoto()'></video>" +
    "<a id='FileModalSrc' download >Download</a>" +
    "<div id='SourceSrc'/>");
g_contentJBox.Hide();
g_contentJBox.Open(CModal.ePos.Center);
var g_deleteJBox = new CModal("delete_modal");
g_deleteJBox.SetCloseToHide(true);
g_deleteJBox.SetBody("<div id='Delete_div'/>");
g_deleteJBox.Hide();
g_deleteJBox.Open(CModal.ePos.Center);
var g_musicJBox;
function vcsTag(fl) {
    const s = fl.Status;
    if (!s)
        return '';
    const color = s === 'A' ? 'success' : s === 'D' ? 'danger' : s === 'M' ? 'warning' : 'secondary';
    const canDiff = s === 'M' || s === 'A' || s === 'D';
    if (canDiff) {
        const filePath = (gRoot ?? '') + (gPath ?? '') + (fl.name ?? '');
        const escaped = filePath.replace(/'/g, "\\'");
        return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;cursor:pointer;" onclick="event.stopPropagation();openVcsDiff('${escaped}')">${s}</span>`;
    }
    return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;">${s}</span>`;
}
let index = 0;
var folderList = { "<>": "ul", "class": "list-group", "html": [] };
var fileList = { "<>": "ul", "class": "list-group", "html": [] };
const EXT_KIND = {
    png: 'image', jpg: 'image', jpeg: 'image', bmp: 'image',
    mp3: 'audio', ogg: 'audio',
    mp4: 'video', mov: 'video', avi: 'video',
    soundlist: 'soundlist', html: 'html', md: 'md',
    ts: 'code', js: 'code', txt: 'code', json: 'code',
    csv: 'sheet', xlsx: 'sheet', xls: 'sheet',
};
const FILE_ICON = {
    folder: 'bi-folder-fill', image: 'bi-folder-image', audio: 'bi-folder-music',
    video: 'bi-folder-play', soundlist: 'bi-flower1', html: 'bi-file-earmark-code',
    code: 'bi-file-code', md: 'bi-file-earmark-text', sheet: 'bi-file-earmark-spreadsheet',
    file: 'bi-file',
};
const kindOf = (fl) => fl.file ? (EXT_KIND[fl.ext] ?? 'file') : 'folder';
const downUrl = (fl) => gDown + gPath + fl.name;
function saveEditedFile(filePath, base64) {
    const fileName = filePath.split('/').pop();
    CFecth.Exe(FileApiUrl("File/Upload"), FileParam({ path: gRoot + gPath, name: [fileName], data: [base64] }))
        .then(() => CAlert.Info('저장 완료'))
        .catch((e) => CAlert.E('저장 실패: ' + e.message));
}
const textToBase64 = (text) => btoa(unescape(encodeURIComponent(text)));
function openFolder(fl) {
    if (CDOM.IDValue("soundAddType") == "1") {
        const p2 = { path: gPath + fl.name + "/" };
        if (RootPath)
            p2.RootPath = RootPath;
        if (RootUrl)
            p2.RootUrl = RootUrl;
        CFecth.Exe(FileApiUrl("File/List"), FileParam(p2), "json").then((data) => {
            CAlert.Info(gPath + fl.name + "추가");
            for (const fl2 of data.list) {
                if (fl.name == fl2.name)
                    continue;
                if (fl2.ext == "mp3" || fl2.ext == "ogg")
                    g_musicJBox.AddTrack(fl2.name, gDown + gPath + fl.name + "/" + fl2.name);
            }
            g_musicJBox.Play(0);
        });
    }
    else {
        FolderCD(gPath + fl.name + "/");
    }
}
function openImage(fl) {
    CDOM.ID("ImageModalSrc").hidden = false;
    CDOM.ID("ImageModalSrc").src = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").hidden = true;
    fl.open = true;
    RefreshOpen();
    g_contentJBox.Show();
}
function openAudio(fl) {
    if (CDOM.IDValue("soundAddType") == "1") {
        g_musicJBox.AddTrack(fl.name, downUrl(fl));
        CAlert.Info(fl.name + " 추가");
    }
    else {
        const names = [fl.name];
        const paths = [downUrl(fl)];
        for (const fl2 of gDirList) {
            if (fl.name == fl2.name)
                continue;
            if (fl2.ext == "mp3" || fl2.ext == "ogg") {
                const fp = gDown + gPath + fl2.name;
                if (!paths.includes(fp)) {
                    names.push(fl2.name);
                    paths.push(fp);
                }
            }
        }
        g_musicJBox.SetList(names, paths);
        g_musicJBox.Play(0);
    }
    fl.open = true;
    RefreshOpen();
}
function openVideo(fl) {
    CDOM.ID("ImageModalSrc").hidden = true;
    CDOM.ID("VideoModalSrc").src = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = false;
    CDOM.ID("FileModalSrc").hidden = true;
    fl.open = true;
    RefreshOpen();
    g_contentJBox.Show();
}
function openSoundList(fl) {
    const oReq = new XMLHttpRequest();
    oReq.onload = () => {
        if (oReq.status != 200) {
            CAlert.E("XMLHttpRequest error code" + oReq.status);
            return;
        }
        const d = oReq.response;
        g_musicJBox.SetList(d.name || [], d.fullPath || []);
        CAlert.Info("ListUp!");
    };
    oReq.open("GET", downUrl(fl));
    oReq.responseType = "json";
    oReq.send();
}
function openHtml(fl) {
    const confirm = new CConfirm();
    confirm.SetBody("HTML 파일을 어떻게 열까요?");
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => { window.open(downUrl(fl), "_blank"); },
        () => { new CFileViewer([downUrl(fl)], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open(); },
    ], ["New Window", "File Viewer"]);
    confirm.Open();
}
function openCode(fl) {
    new CFileViewer([downUrl(fl)], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open();
}
function openMd(fl) {
    new CMDViewer(downUrl(fl));
}
function openSheet(fl) {
    new CSheetViewer([downUrl(fl)], async (filePath, base64) => saveEditedFile(filePath, base64)).Open();
}
function openGenericFile(fl) {
    CDOM.ID("ImageModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").href = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").hidden = false;
    g_contentJBox.Show();
}
const FILE_OPEN = {
    folder: openFolder, image: openImage, audio: openAudio, video: openVideo,
    soundlist: openSoundList, html: openHtml, code: openCode, md: openMd,
    sheet: openSheet, file: openGenericFile,
};
function DirListRefresh() {
    CDOM.ID("File_div").innerHTML = "";
    CDOM.ID("Delete_div").innerHTML = "";
    folderList = { "<>": "ul", "class": "list-group", "html": [] };
    fileList = { "<>": "ul", "class": "list-group", "html": [] };
    if (gPath != null && gPath != "/") {
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-warning list-group-item-action", "html": "<i class='bi bi-folder'></i> Root Folder",
            "onclick": () => { FolderCD("/"); },
        });
        let path = gPath;
        let pos = path.lastIndexOf("/", path.length - 2);
        let bpath = path.substr(0, pos);
        bpath += "/";
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-primary list-group-item-action", "html": "<i class='bi bi-folder'></i> Parent Folder",
            "onclick": () => { FolderCD(bpath); },
        });
    }
    for (let fl of gDirList) {
        if (fl.hidden)
            continue;
        fl.open = false;
        fl.index = index;
        index++;
        const kind = kindOf(fl);
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
            "html": `<i class='bi ${FILE_ICON[kind]}'>${fl.name}${vcsTag(fl)}`, "onclick": () => FILE_OPEN[kind](fl) });
        if (fl.file == true) {
            fileList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": `<i class='bi bi-file'>${fl.name}${vcsTag(fl)}`, "onclick": () => Delete(fl.name) });
        }
    }
    CDOM.ID("File_div").append(CDOM.DataToDom(folderList));
    CDOM.ID("Delete_div").append(CDOM.DataToDom(fileList));
}
const FILE_ROOT_KEY = 'artgine.fileRoot';
function loadPersistedFileRoot() {
    try {
        const v = JSON.parse(localStorage.getItem(FILE_ROOT_KEY) || '{}');
        return { RootPath: v.RootPath ?? null, RootUrl: v.RootUrl ?? null, SelKey: v.SelKey ?? null };
    }
    catch {
        return { RootPath: null, RootUrl: null, SelKey: null };
    }
}
function savePersistedFileRoot(rootPath, rootUrl, selKey) {
    try {
        localStorage.setItem(FILE_ROOT_KEY, JSON.stringify({ RootPath: rootPath, RootUrl: rootUrl, SelKey: selKey }));
    }
    catch { }
}
const _persistedFileRoot = loadPersistedFileRoot();
let fileRootSelKey = _persistedFileRoot.SelKey;
let path = CUtilWeb.Parameter("path");
let RootPath = CUtilWeb.Parameter("RootPath") ?? _persistedFileRoot.RootPath;
let RootUrl = CUtilWeb.Parameter("RootUrl") ?? _persistedFileRoot.RootUrl;
let g_fileWebRootUrl = CPath.WebRootUrl();
let fileAuthed = !!getAuthToken(g_fileWebRootUrl);
function setFileAuthed(authed) {
    fileAuthed = authed;
    applyFileAuthIndicator(authed);
}
let gPath = '/';
let gRoot = '';
let gDown = '';
let gRoots = [];
let gDirList = [];
const cachedDirList = CStorage.Get(path == null ? "root" : path);
if (cachedDirList != null) {
    gDirList = JSON.parse(cachedDirList);
    DirListRefresh();
}
function NormalizeWebRootUrl(url) {
    return url.replace(/\/+$/, '') + '/';
}
function ResolveFileUrl(url) {
    if (!url)
        return '';
    if (url.startsWith("http://") || url.startsWith("https://"))
        return url.replace(/\/+$/, '');
    return new URL(url, g_fileWebRootUrl).href.replace(/\/+$/, '');
}
function FileApiUrl(path) {
    return g_fileWebRootUrl + path.replace(/^\/+/, '');
}
function GetFileToken() {
    return getAuthToken(g_fileWebRootUrl);
}
function SetFileToken(token) {
    setAuthToken(g_fileWebRootUrl, token);
}
function FileParam(extra = {}) {
    return { ...extra, token: GetFileToken() };
}
function BuildFileHomeUrl() {
    const base = g_fileWebRootUrl.replace(/\/+$/, '');
    let url = base + "/proj/Home/Home.html";
    const q = [];
    if (path)
        q.push("path=" + encodeURIComponent(path));
    if (RootPath)
        q.push("RootPath=" + encodeURIComponent(RootPath));
    if (RootUrl)
        q.push("RootUrl=" + encodeURIComponent(RootUrl));
    if (q.length)
        url += "?" + q.join("&");
    return url;
}
async function SendRemoteGuide(token) {
    try {
        await CFecth.Exe(CPath.WebRootUrl() + "RemoteCMD/Write", { addr: BuildFileHomeUrl(), token }, "json");
    }
    catch (e) {
        console.error("RemoteCMD/Write update failed:", e);
    }
}
function SyncFileRoot(data) {
    if (data.RootPath != null)
        RootPath = data.RootPath;
    if (data.RootUrl != null)
        RootUrl = data.RootUrl;
    gRoot = RootPath?.replace(/\/+$/, '') ?? '';
    gDown = ResolveFileUrl(RootUrl);
    if (data.roots)
        gRoots = data.roots;
}
async function fileCheckAuth() {
    const token = GetFileToken();
    if (!token)
        return false;
    try {
        const j = await CFecth.Exe(FileApiUrl("auth/check"), { token }, "json");
        return !!j?.authed;
    }
    catch {
        return false;
    }
}
async function refreshFileAuthState() {
    const checkedWebRootUrl = g_fileWebRootUrl;
    const hasToken = !!GetFileToken();
    fileAuthed = hasToken;
    applyFileAuthIndicator(false);
    if (!hasToken)
        return;
    const valid = await fileCheckAuth();
    if (!valid)
        removeAuthToken(checkedWebRootUrl);
    if (checkedWebRootUrl !== g_fileWebRootUrl)
        return;
    setFileAuthed(valid);
    if (valid && checkedWebRootUrl !== CPath.WebRootUrl())
        SendRemoteGuide(GetFileToken());
}
async function InitFileRoot() {
    const rootParam = {};
    if (RootPath)
        rootParam.RootPath = RootPath;
    if (RootUrl)
        rootParam.RootUrl = RootUrl;
    const data = await CFecth.Exe(FileApiUrl("File/Root"), rootParam, "json");
    SyncFileRoot(data);
}
async function FetchFileList(_path) {
    let fetchParam = { path: _path };
    if (RootPath)
        fetchParam.RootPath = RootPath;
    if (RootUrl)
        fetchParam.RootUrl = RootUrl;
    return await CFecth.Exe(FileApiUrl("File/List"), FileParam(fetchParam), "json");
}
async function LoadFileList(_path) {
    const data = await FetchFileList(_path);
    CStorage.Set(_path == null ? "root" : _path, JSON.stringify(data.list));
    gDirList = data.list;
    SyncFileRoot(data);
    gPath = data.path;
    DirListRefresh();
}
function ParseFileHomeUrl(input) {
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
async function ConnectFileHomeUrl(input) {
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
    }
    catch (err) {
        throw err;
    }
    await LoadFileList(path);
    refreshFileAuthState();
    memoNotifyRootChanged();
}
window["ConnectFileHomeUrl"] = ConnectFileHomeUrl;
ConnectFileHomeUrl(CUtilWeb.Parameter("FileHomeUrl") ?? undefined);
{
    const _sd = CStorage.Get("SoundList");
    const _d = _sd ? JSON.parse(_sd) : { name: [], fullPath: [] };
    g_musicJBox = new CModalMusic(_d.name, _d.fullPath, (names, paths) => CStorage.Set("SoundList", JSON.stringify({ name: names, fullPath: paths })));
}
function FolderCD(_path, _onDone) {
    gPath = _path;
    FetchFileList(_path).then((data) => {
        gDirList = data.list;
        SyncFileRoot(data);
        gPath = data.path;
        index = 0;
        DirListRefresh();
        _onDone?.();
    });
}
window["FolderCD"] = FolderCD;
var g_fun = "";
var g_data = "";
var g_option = "";
function Redirection(_multi) {
    var form = CDOM.ID("ThisPage");
    form.setAttribute("charset", "UTF-8");
    form.setAttribute("method", "Post");
    form.setAttribute("action", FileApiUrl("File/Redirection"));
    CDOM.IDValue("fun", g_fun);
    CDOM.IDValue("data", g_data);
    CDOM.IDValue("option", g_option);
    CDOM.IDValue("path", gPath);
    CDOM.IDValue("RootPath", RootPath ?? "");
    CDOM.IDValue("RootUrl", RootUrl ?? "");
    CDOM.IDValue("redirToken", GetFileToken());
    form.submit();
}
window["Redirection"] = Redirection;
var g_menuList = { "<>": "div", "class": "d-flex align-items-center p-1", "html": [
        { "<>": "form", "action": "FilePage.jsp", "id": "ThisPage", "name": "ThisPage", "method": "post", "accept-charset": "UTF-8", "html": [
                { "<>": "input", "type": "hidden", "id": "fun", "name": "fun" },
                { "<>": "input", "type": "hidden", "id": "data", "name": "data" },
                { "<>": "input", "type": "hidden", "id": "option", "name": "option" },
                { "<>": "input", "type": "hidden", "id": "path", "name": "path" },
                { "<>": "input", "type": "hidden", "id": "RootPath", "name": "RootPath" },
                { "<>": "input", "type": "hidden", "id": "RootUrl", "name": "RootUrl" },
                { "<>": "input", "type": "hidden", "id": "redirToken", "name": "token" },
            ] },
        { "<>": "input", "type": "file", "multiple": "multiple", "id": "uploadBtn", "name": "uploadBtn", "style": "display:none" },
        { "<>": "div", "class": "d-flex align-items-center gap-1", "html": [
                { "<>": "button", "type": "button", "class": "btn btn-sm btn-primary", "text": "Music", "onclick": () => {
                        g_musicJBox.Show();
                        g_musicJBox.SetPosition(CModal.ePos.Center);
                    } },
                { "<>": "select", "class": "form-select form-select-sm", "id": "soundAddType", "style": "width:128px;", "html": [
                        { "<>": "option", "value": "0", "text": "Add All" },
                        { "<>": "option", "value": "1", "text": "Add Each (w/ Folder)" },
                    ] },
                { "<>": "button", "type": "button", "class": "btn btn-sm btn-outline-info", "html": "Search <span style='font-size:0.75em;opacity:0.7;'>F2</span>", "onclick": () => { FileSearch(); } },
                { "<>": "button", "type": "button", "class": "btn btn-sm btn-outline-secondary", "html": "File <span style='font-size:0.75em;opacity:0.7;'>F1</span>", "onclick": () => { FileBtn(); } },
            ] },
    ] };
CDOM.ID("Menu_div").append(CDOM.DataToDom(g_menuList));
async function FileBtn() {
    if (fileAuthed) {
        const valid = await fileCheckAuth();
        if (valid) {
            setFileAuthed(true);
            showFileAdminModal();
            return;
        }
        setFileAuthed(false);
    }
    const dlg = new CConfirm();
    dlg.SetBody('Enter admin password:<br><input type="password" id="AuthPassword" class="form-control form-control-sm">');
    const doAuth = () => {
        const pw = CDOM.IDValue("AuthPassword");
        CFecth.Exe(FileApiUrl("auth/login"), { password: pw }, "json").then((j) => {
            if (j.ok) {
                SetFileToken(j.token);
                setFileAuthed(true);
                aiAuthOverlay.style.display = 'none';
                aiRefreshSessions();
                termRefreshSessions();
                CAlert.Info("Permission granted");
                warnIfDefaultAuthPassword(pw);
            }
            else {
                CAlert.E("Wrong password: " + (j.msg ?? ""));
            }
        }).catch(() => { CAlert.E("Server error"); });
    };
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        doAuth,
        () => { },
    ], ["OK", "Cancel"]);
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
window["FileBtn"] = FileBtn;
window["PermissionBtn"] = FileBtn;
function showFileAdminModal() {
    const uid = Date.now();
    const _roots = gRoots ?? [];
    const _opts = [..._roots, { path: "./", name: "Artgine (WorkingPath)" }];
    let _curIdx = fileRootSelKey === 'workingpath'
        ? _opts.length - 1
        : (fileRootSelKey != null ? _roots.findIndex(r => r.path === fileRootSelKey) : -1);
    if (_curIdx < 0) {
        for (let i = _opts.length - 1; i >= 0; i--) {
            if (_opts[i].path === (RootPath || './')) {
                _curIdx = i;
                break;
            }
        }
    }
    if (_curIdx < 0)
        _curIdx = 0;
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
                            <button id="fadm_share_${uid}" class="btn btn-outline-info btn-sm">Share</button>
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
        const applyValues = async (rootPath, rootUrl, selKey) => {
            fileRootSelKey = selKey;
            RootUrl = rootUrl ?? null;
            SyncFileRoot({ RootPath: rootPath || null, RootUrl: rootUrl ?? null });
            savePersistedFileRoot(rootPath || null, rootUrl ?? null, selKey);
            if (!rootUrl)
                await InitFileRoot();
            FolderCD("/");
            showTab('file-tab');
        };
        const rootSel = document.getElementById(`fadm_rootsel_${uid}`);
        rootSel?.addEventListener('change', () => {
            const idx = parseInt(rootSel.value);
            const r = _opts[idx];
            if (r)
                applyValues(r.path, r.url, idx === _opts.length - 1 ? 'workingpath' : r.path);
        });
        document.getElementById(`fadm_share_${uid}`)?.addEventListener('click', () => {
            modal.Hide();
            FileShare();
        });
        document.getElementById(`fadm_folder_${uid}`)?.addEventListener('click', () => {
            modal.Hide();
            CreateFolder();
        });
        document.getElementById(`fadm_delete_${uid}`)?.addEventListener('click', () => {
            openDeleteModal();
        });
        document.getElementById(`fadm_upload_${uid}`)?.addEventListener('click', () => {
            modal.Hide();
            CDOM.ID("uploadBtn").click();
        });
        const isRemoteServer = () => g_fileWebRootUrl !== CPath.WebRootUrl();
        document.getElementById(`fadm_chat_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = isRemoteServer() ? '' : (gRoot ?? '') + (gPath ?? '');
            showTab('[data-bs-target="#ai-panel"]');
            setTimeout(() => showTab('ai-chat-subtab'), 150);
            chatStartNew(cwd || undefined);
        });
        document.getElementById(`fadm_term_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = isRemoteServer() ? '' : (gRoot ?? '') + (gPath ?? '');
            showTab('[data-bs-target="#ai-panel"]');
            setTimeout(() => showTab('ai-term-subtab'), 150);
            termStartNew('cmd', cwd || undefined);
        });
        const vcsPath = () => (gRoot ?? './') + (gPath ?? '');
        document.getElementById(`fadm_vcs_diff_${uid}`)?.addEventListener('click', () => openVcsDiff(vcsPath()));
        document.getElementById(`fadm_vcs_update_${uid}`)?.addEventListener('click', async () => {
            const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "update", path: vcsPath() }), "json");
            const revLine = res.revision ? `<br><b>Revision: ${res.revision}</b>` : '';
            const msgBody = res.msg ? res.msg.replace(/\n/g, '<br>') : (res.ok ? 'Update complete' : 'Update failed');
            CAlert.Info(msgBody + revLine);
            if (res.ok)
                FolderCD(gPath);
        });
        document.getElementById(`fadm_vcs_add_${uid}`)?.addEventListener('click', () => openVcsModal('add', vcsPath()));
        document.getElementById(`fadm_vcs_revert_${uid}`)?.addEventListener('click', () => openVcsModal('revert', vcsPath()));
        document.getElementById(`fadm_vcs_commit_${uid}`)?.addEventListener('click', () => openVcsModal('commit', vcsPath()));
    }, MODAL_DOM_DELAY);
}
window["showFileAdminModal"] = showFileAdminModal;
function openActionModal(title, runLabel, runClass, onRun, hasMessage = false, fetchItems, staticItems, onItemDblClick) {
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
    const listEl = document.getElementById(`am_list_${uid}`);
    const resultEl = document.getElementById(`am_result_${uid}`);
    const allBtn = document.getElementById(`am_all_${uid}`);
    const runBtn = document.getElementById(`am_run_${uid}`);
    const msgEl = document.getElementById(`am_msg_${uid}`);
    let currentItems = [];
    const renderItems = (items) => {
        if (!items || items.length === 0) {
            listEl.innerHTML = '<span class="text-secondary">No items</span>';
            return;
        }
        currentItems = items;
        listEl.innerHTML = items.map((i, idx) => `
            <div class="d-flex align-items-center gap-1 py-1" data-action-idx="${idx}">
                <input type="checkbox" class="form-check-input am-chk-${uid}" value="${i.value}" ${i.checked !== false ? 'checked' : ''}>
                ${i.badge ? `<span class="badge bg-${i.badgeClass ?? 'secondary'}" style="font-size:0.65rem;min-width:1.4rem;">${i.badge}</span>` : ''}
                ${i.icon ? `<i class="bi ${i.icon}"></i>` : ''}
                <span class="text-truncate mb-0 flex-fill" title="${i.label}">${i.label}</span>
            </div>`).join('');
        if (onItemDblClick) {
            listEl.querySelectorAll('[data-action-idx]').forEach(row => {
                row.addEventListener('dblclick', () => {
                    const item = currentItems[parseInt(row.dataset.actionIdx ?? '-1')];
                    if (item)
                        onItemDblClick(item);
                });
            });
        }
    };
    const refresh = async () => {
        if (!fetchItems)
            return;
        listEl.innerHTML = '<span class="text-secondary">Loading...</span>';
        resultEl.style.display = 'none';
        renderItems(await fetchItems());
    };
    if (fetchItems)
        refresh();
    else
        renderItems(staticItems);
    document.getElementById(`am_refresh_${uid}`)?.addEventListener('click', refresh);
    allBtn.addEventListener('click', () => {
        const chks = listEl.querySelectorAll(`.am-chk-${uid}`);
        const allChecked = Array.from(chks).every(c => c.checked);
        chks.forEach(c => c.checked = !allChecked);
    });
    runBtn.addEventListener('click', async () => {
        const values = Array.from(listEl.querySelectorAll(`.am-chk-${uid}`))
            .filter(c => c.checked).map(c => c.value);
        if (values.length === 0) {
            CAlert.Info('No items selected');
            return;
        }
        if (hasMessage && !msgEl?.value.trim()) {
            CAlert.Info('Please enter a message');
            return;
        }
        runBtn.setAttribute('disabled', '');
        resultEl.style.display = '';
        resultEl.textContent = 'Processing...';
        const { result, refresh: doRefresh } = await onRun(values, msgEl?.value.trim());
        resultEl.textContent = result;
        runBtn.removeAttribute('disabled');
        if (doRefresh)
            refresh();
    });
}
function openVcsModal(action, path) {
    const statusColor = (s) => s === 'M' ? 'warning' : s === 'A' ? 'success' : s === 'D' ? 'danger' : 'secondary';
    const title = action === 'commit' ? 'Commit & Push' : action === 'revert' ? 'Revert' : 'Add';
    const runLabel = action === 'commit' ? 'Commit & Push' : action === 'revert' ? 'Revert' : 'Add';
    const runClass = action === 'commit' ? 'btn-success' : action === 'revert' ? 'btn-warning' : 'btn-info';
    const diffPath = (file) => {
        const normalized = file.replace(/\\/g, '/');
        if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/'))
            return normalized;
        return (path.replace(/\\/g, '/').replace(/\/?$/, '/') + normalized).replace(/\/+/g, '/');
    };
    openActionModal(title, runLabel, runClass, async (files, message) => {
        const param = { action, path, files };
        if (action === 'commit')
            param.message = message;
        const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam(param), "json");
        if (res.ok)
            FolderCD(gPath);
        return { result: res.msg || (res.ok ? 'Done' : 'Failed'), refresh: res.ok };
    }, action === 'commit', async () => {
        const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "status", path }), "json");
        if (!res.ok)
            return [];
        const items = res.items;
        const filtered = action === 'add'
            ? items.filter(i => i.status === '?')
            : (action === 'commit' && res.vcs === 'svn')
                ? items.filter(i => i.status !== '?')
                : items;
        return filtered.map(i => ({ badge: i.status, badgeClass: statusColor(i.status), label: i.file, value: i.file, checked: true }));
    }, undefined, action === 'add' ? undefined : item => openVcsDiff(diffPath(item.value)));
}
async function openVcsDiff(filePath) {
    let res;
    try {
        res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "diff", path: filePath }), "json");
    }
    catch (e) {
        CAlert.Info("Diff request failed");
        return;
    }
    if (!res?.ok) {
        CAlert.Info(res?.msg || "Diff failed");
        return;
    }
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
        if (!el)
            return;
        const D2H = window.Diff2HtmlUI;
        if (!D2H) {
            el.textContent = "diff2html not loaded";
            return;
        }
        const cfg = { drawFileList: false, matching: "lines", outputFormat: "line-by-line", highlight: false, stickyFileHeaders: false };
        new D2H(el, res.diff, cfg).draw();
    }, MODAL_DOM_DELAY);
}
window["openVcsDiff"] = openVcsDiff;
function openDeleteModal() {
    const dirList = gDirList ?? [];
    openActionModal('Delete', 'Delete', 'btn-danger', async (names) => {
        const lines = [];
        for (const name of names) {
            const param = { data: gPath + name };
            if (RootPath)
                param.RootPath = RootPath;
            const res = await CFecth.Exe(FileApiUrl("File/Delete"), FileParam(param), "json");
            lines.push(`${res.ok ? 'OK' : 'FAIL'} ${name}`);
        }
        FolderCD(gPath);
        return { result: lines.join('\n') };
    }, false, undefined, dirList
        .filter(fl => !fl.hidden)
        .map(fl => ({ icon: fl.file ? 'bi-file' : 'bi-folder-fill', label: fl.name, value: fl.name, checked: false })));
}
function CreateFolder() {
    let confirm = new CConfirm();
    confirm.SetBody('Enter folder name:<br><input type="text" id="CreateFolder" class="form-control form-control-sm" value="New Folder">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        async () => {
            const folderName = CDOM.IDValue("CreateFolder");
            const data = gPath + folderName;
            const param = { data };
            if (RootPath)
                param.RootPath = RootPath;
            const j = await CFecth.Exe(FileApiUrl("File/Mkdir"), FileParam(param), "json");
            if (j?.ok)
                FolderCD(gPath);
            else
                CAlert.E("폴더 생성 실패");
        },
        () => { },
    ], ["Yes", "No"]);
    confirm.Open();
}
window["CreateFolder"] = CreateFolder;
function Delete(_file) {
    g_fun = "Delete";
    g_data = gPath + _file;
    Redirection(false);
}
window["Delete"] = Delete;
const SEARCH_EXCLUDE_DIRS = ['node_modules'];
const isSearchExcluded = (name) => name.startsWith('.') || SEARCH_EXCLUDE_DIRS.includes(name);
let g_srchCache = new Map();
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
    await new Promise(r => setTimeout(r, MODAL_DOM_DELAY));
    const input = document.getElementById(`srchInput_${uid}`);
    const btn = document.getElementById(`srchBtn_${uid}`);
    const stopBtn = document.getElementById(`srchStop_${uid}`);
    const status = document.getElementById(`srchStatus_${uid}`);
    const results = document.getElementById(`srchResults_${uid}`);
    const makeItem = (fl, dirPath) => {
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
                        if (el.textContent?.includes(fl.name)) {
                            el.click();
                            break;
                        }
                    }
                });
            });
        }
        else {
            item.addEventListener('click', () => { FolderCD(dirPath + fl.name + '/'); switchToFileTab(); });
        }
        return item;
    };
    const renderFromCache = (startPath, query) => {
        results.innerHTML = '';
        let found = 0;
        for (const [dirPath, list] of g_srchCache) {
            if (!dirPath.startsWith(startPath))
                continue;
            for (const fl of list) {
                if (fl.hidden || isSearchExcluded(fl.name))
                    continue;
                if (fl.name.toLowerCase().includes(query)) {
                    results.appendChild(makeItem(fl, dirPath));
                    if (++found >= 200)
                        return found;
                }
            }
        }
        return found;
    };
    const doSearch = async () => {
        const query = input.value.trim().toLowerCase();
        if (!query)
            return;
        const startPath = gPath ?? "/";
        const serverKey = (RootPath ?? '') + '|' + (RootUrl ?? '');
        if (g_srchServerKey !== serverKey) {
            g_srchCache = new Map();
            g_srchServerKey = serverKey;
        }
        searchCancelled = false;
        btn.disabled = true;
        stopBtn.style.display = '';
        results.innerHTML = '';
        status.textContent = 'Scanning...';
        let found = 0;
        const queue = [startPath];
        while (queue.length > 0 && !searchCancelled) {
            const dirPath = queue.shift();
            status.textContent = `Scanning: ${dirPath}`;
            try {
                let p2 = { path: dirPath };
                if (RootPath)
                    p2.RootPath = RootPath;
                if (RootUrl)
                    p2.RootUrl = RootUrl;
                const data = await CFecth.Exe(FileApiUrl("File/List"), FileParam(p2), "json");
                g_srchCache.set(dirPath, data.list);
                for (const fl of data.list) {
                    if (!fl.hidden && !fl.file && !isSearchExcluded(fl.name))
                        queue.push(dirPath + fl.name + '/');
                    if (!fl.hidden && fl.name.toLowerCase().includes(query) && found < 200) {
                        results.appendChild(makeItem(fl, dirPath));
                        found++;
                    }
                }
            }
            catch (_) { }
        }
        const cap = found >= 200 ? ' (capped at 200)' : '';
        status.textContent = searchCancelled ? `Stopped. (${found} result(s))` : found === 0 ? 'No results.' : `${found} result(s)${cap}`;
        btn.disabled = false;
        stopBtn.style.display = 'none';
    };
    stopBtn.addEventListener('click', () => { searchCancelled = true; });
    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter')
        doSearch(); });
    input.focus();
}
window["FileSearch"] = FileSearch;
function FileShare() {
    const path = gPath ?? "/";
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('path', path);
    if (RootPath)
        url.searchParams.set('RootPath', RootPath);
    if (RootUrl)
        url.searchParams.set('RootUrl', RootUrl);
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
        const btn = document.getElementById(`shareCopyBtn_${uid}`);
        const msg = document.getElementById(`shareCopyMsg_${uid}`);
        btn?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                msg.textContent = 'Copied!';
                setTimeout(() => { msg.textContent = ''; }, 2000);
            }
            catch {
                msg.textContent = 'Copy failed ??select and copy manually.';
            }
        });
    }, MODAL_DOM_DELAY);
}
window["FileShare"] = FileShare;
CDOM.ID("uploadBtn").onchange = async (e) => {
    var fi = e.target;
    const path = gRoot + gPath;
    const readAsBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
    for (let i = 0; i < fi.files.length; ++i) {
        try {
            const name = fi.files[i].name;
            const data = await readAsBase64(fi.files[i]);
            await CFecth.Exe(FileApiUrl("File/Upload"), FileParam({ data: [data], name: [name], path }));
        }
        catch (err) {
            CAlert.E('Upload failed: ' + (err?.message ?? String(err)));
            return;
        }
    }
    Redirection(true);
};
function SoundPlayListSave() {
    let confirm = new CConfirm();
    confirm.SetBody('Enter file name to save:<br><input type="text" id="soundListSave" class="form-control form-control-sm" value="basic">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => {
            g_fun = "SoundPlayListSave";
            g_data = JSON.stringify({ name: g_musicJBox.Names, fullPath: g_musicJBox.Paths });
            g_option = CDOM.IDValue("soundListSave");
            Redirection(false);
        },
        () => {
        },
    ], ["Yes", "No"]);
    confirm.Open();
}
window["SoundPlayListSave"] = SoundPlayListSave;
function RefreshOpen() {
    for (let fl of gDirList) {
        if (fl.index == null)
            continue;
        if (fl.open == false) {
            CDOM.ID("fl" + fl.index).className = "list-group-item list-group-item-action";
        }
        else {
            CDOM.ID("fl" + fl.index).className = "list-group-item list-group-item-action list-group-item-secondary";
        }
    }
}
window["RefreshOpen"] = RefreshOpen;
function NextPhoto() {
    for (let fl of gDirList) {
        if (fl.open == false) {
            CDOM.ID("fl" + fl.index).className = "list-group-item list-group-item-action list-group-item-secondary";
            fl.open = true;
            if (fl.ext == "png" || fl.ext == "jpg" || fl.ext == "jpeg" || fl.ext == "bmp") {
                CDOM.ID("ImageModalSrc").hidden = false;
                CDOM.ID("ImageModalSrc").src = gDown + gPath + fl.name;
                CDOM.ID("VideoModalSrc").hidden = true;
                CDOM.ID("FileModalSrc").hidden = true;
            }
            else if (fl.ext == "mp4" || fl.ext == "mov" || fl.ext == "avi") {
                CDOM.ID("ImageModalSrc").hidden = true;
                CDOM.ID("VideoModalSrc").src = gDown + gPath + fl.name;
                CDOM.ID("VideoModalSrc").hidden = false;
                CDOM.ID("FileModalSrc").hidden = true;
            }
            return;
        }
    }
    CAlert.Info("더 이상 없습니다.");
}
window["NextPhoto"] = NextPhoto;
const memoTab = CDOM.ID("memo-tab");
const memoPanel = CDOM.ID("memo");
let memoProviders = [];
let memoLoadGen = 0;
function memoFormatTime(_t) {
    const s = String(_t);
    if (s.length < 14)
        return s;
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
}
async function memoGetJson(_url) {
    const token = GetFileToken();
    const url = token ? _url + (_url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token) : _url;
    const r = await authedFetch(url);
    if (r.status === 401) {
        removeAuthToken(g_fileWebRootUrl);
        memoShowAuthOrLoad();
        return { ok: false };
    }
    return await r.json();
}
async function memoPostJson(_url, _body) {
    const r = await authedFetch(_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ..._body, token: GetFileToken() }) });
    if (r.status === 401) {
        removeAuthToken(g_fileWebRootUrl);
        memoShowAuthOrLoad();
        return { ok: false };
    }
    return await r.json();
}
async function memoLoadProviders() {
    if (memoProviders.length > 0) {
        memoPopulateProviderSelect();
        return;
    }
    const gen = memoLoadGen;
    try {
        const setting = await memoGetJson(FileApiUrl('cmd/setting'));
        if (gen !== memoLoadGen)
            return;
        if (setting.models) {
            memoProviders = Object.keys(setting.models).map(id => ({ id, models: setting.models[id] || [] }));
            memoPopulateProviderSelect();
        }
    }
    catch (e) {
        console.error('memo providers error:', e);
    }
}
async function memoShowAuthOrLoad() {
    const overlay = CDOM.ID("memo-auth-overlay");
    if (overlay == null)
        return;
    const authed = await fileCheckAuth();
    if (!authed) {
        refreshFileAuthState();
        const wasVisible = overlay.style.display === 'flex';
        overlay.style.display = 'flex';
        if (!wasVisible) {
            const pwInput = CDOM.ID("memoAuthPwInput");
            const msgEl = CDOM.ID("memoAuthMsg");
            pwInput.value = '';
            msgEl.textContent = '';
            setTimeout(() => pwInput.focus(), 50);
        }
    }
    else {
        refreshFileAuthState();
        overlay.style.display = 'none';
        memoLoadProviders();
        memoLoadRecentLog();
    }
}
async function memoDoAuth() {
    const pwInput = CDOM.ID("memoAuthPwInput");
    const msgEl = CDOM.ID("memoAuthMsg");
    const submitBtn = CDOM.ID("memoAuthSubmitBtn");
    const pw = pwInput.value;
    if (!pw)
        return;
    submitBtn.disabled = true;
    msgEl.textContent = '';
    try {
        const j = await CFecth.Exe(FileApiUrl("auth/login"), { password: pw }, "json");
        if (j.ok) {
            SetFileToken(j.token);
            refreshFileAuthState();
            CDOM.ID("memo-auth-overlay").style.display = 'none';
            memoLoadProviders();
            memoLoadRecentLog();
            warnIfDefaultAuthPassword(pw);
        }
        else {
            msgEl.textContent = j.msg || 'Wrong password';
        }
    }
    catch {
        msgEl.textContent = 'Server error';
    }
    submitBtn.disabled = false;
}
function memoPopulateProviderSelect() {
    const providerEl = CDOM.ID("memoProviderSelect");
    if (providerEl == null)
        return;
    providerEl.innerHTML = memoProviders.map(p => `<option value="${p.id}">${p.id}</option>`).join('');
    memoPopulateModelSelect();
}
function memoPopulateModelSelect() {
    const providerEl = CDOM.ID("memoProviderSelect");
    const modelEl = CDOM.ID("memoModelSelect");
    if (providerEl == null || modelEl == null)
        return;
    const info = memoProviders.find(p => p.id === providerEl.value);
    const models = info ? info.models : [];
    modelEl.innerHTML = models.map(m => `<option value="${m.value}">${aiEscapeHtml(m.label)}</option>`).join('');
    if (models.length > 0) {
        modelEl.value = models[Math.floor(models.length / 2)].value;
    }
}
async function memoLoadRecentLog() {
    const gen = memoLoadGen;
    try {
        const j = await memoGetJson(FileApiUrl('Memo/List?n=30'));
        if (gen !== memoLoadGen)
            return;
        if (!j.ok)
            return;
        const list = j.list;
        const logEl = CDOM.ID("memo-log");
        if (logEl == null)
            return;
        logEl.innerHTML = '';
        if (list.length === 0) {
            memoRenderEmptyLog();
            return;
        }
        for (let i = list.length - 1; i >= 0; i--) {
            const r = list[i];
            const wrap = document.createElement('div');
            wrap.style.cursor = 'pointer';
            wrap.dataset.offset = String(r.selfOffset);
            wrap.innerHTML = `
                <div class="text-secondary small text-uppercase mb-1" style="letter-spacing: .5px;">${r.headOffset !== r.selfOffset ? `#${r.headOffset}-#${r.selfOffset}` : `#${r.selfOffset}`} · ${memoFormatTime(r.chatTime)}</div>
                <div class="msg-bubble p-3 rounded border-start border-4 border-primary bg-primary-subtle">${aiEscapeHtml(r.original)}</div>
                ${r.keywords && r.keywords.length > 0 ? `<div class="mt-2 d-flex flex-wrap gap-1">${r.keywords.map(k => `<span class="badge bg-secondary">#${k}</span>`).join('')}</div>` : ''}
            `;
            wrap.addEventListener('click', () => memoOpenChainModal(r.selfOffset));
            logEl.appendChild(wrap);
        }
        memoScrollBottom();
    }
    catch (e) {
        console.error('memo recent log error:', e);
    }
}
function memoExtractDeletedOffsets(_text) {
    const offsets = new Set();
    for (const m of _text.matchAll(/Deleted memo (\d+):/g))
        offsets.add(Number(m[1]));
    for (const m of _text.matchAll(/^\[(\d+)\]/gm))
        offsets.add(Number(m[1]));
    return Array.from(offsets);
}
function memoRemoveLogEntries(_offsets) {
    const logEl = CDOM.ID("memo-log");
    if (logEl == null)
        return;
    for (const offset of _offsets) {
        logEl.querySelector(`[data-offset="${offset}"]`)?.remove();
    }
    if (logEl.children.length === 0)
        memoRenderEmptyLog();
}
function memoChainBodyHtml(_chain) {
    const range = _chain.length > 1 ? `#${_chain[0].selfOffset} - #${_chain[_chain.length - 1].selfOffset}` : `#${_chain[0].selfOffset}`;
    return `
        <div class="d-flex flex-column h-100">
            <div class="text-secondary small text-uppercase px-2 pt-2" style="letter-spacing: .5px;">${range}</div>
            <div id="memoChainLog" class="flex-grow-1 overflow-auto d-flex flex-column gap-2 p-2">
                ${_chain.map(r => `
                    <div class="position-relative">
                        <div class="text-secondary small text-uppercase mb-1" style="letter-spacing: .5px;">#${r.selfOffset} · ${memoFormatTime(r.chatTime)}</div>
                        <button type="button" class="btn-close memoChainDeleteBtn" data-offset="${r.selfOffset}" aria-label="Delete" style="position:absolute; top:0; right:0;"></button>
                        <div class="msg-bubble p-3 rounded border-start border-4 border-primary bg-primary-subtle" style="white-space: pre-wrap; word-wrap: break-word;">${aiEscapeHtml(r.original)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="border-top p-2 d-flex gap-2 align-items-end">
                <textarea id="memoChainInput" class="form-control" placeholder="Continue this conversation..." rows="1" style="resize: none; max-height: 160px;"></textarea>
                <button id="memoChainSendBtn" class="btn btn-primary"><i class="bi bi-send"></i></button>
            </div>
        </div>
    `;
}
async function memoRefreshChainModal(_modal, _selfOffset) {
    const j = await memoGetJson(FileApiUrl('Memo/Get?offset=' + _selfOffset));
    if (!j.ok)
        return;
    const chain = j.chain;
    if (chain.length === 0) {
        _modal.Close();
        return;
    }
    const tail = chain.find(r => r.nextOffset === 0) || chain[chain.length - 1];
    _modal.SetBody(memoChainBodyHtml(chain));
    const body = _modal.GetBody();
    const logEl = body.querySelector('#memoChainLog');
    logEl.scrollTop = logEl.scrollHeight;
    const input = body.querySelector('#memoChainInput');
    const sendBtn = body.querySelector('#memoChainSendBtn');
    const send = () => memoChainSend(_modal, input, sendBtn, tail.selfOffset);
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey) {
            ev.preventDefault();
            send();
        }
    });
    input.addEventListener('input', () => {
        input.style.height = '0';
        input.style.height = Math.min(input.scrollHeight, 160) + 'px';
    });
    setTimeout(() => input.focus(), 50);
    body.querySelectorAll('.memoChainDeleteBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const offset = Number(btn.dataset.offset);
            memoChainDelete(_modal, chain, offset);
        });
    });
}
async function memoChainDelete(_modal, _chain, _offset) {
    if (!confirm('이 메모를 삭제할까요?'))
        return;
    try {
        const j = await memoPostJson(FileApiUrl('Memo/Delete'), { offset: _offset });
        if (!j.ok) {
            console.error('memo delete error:', j.msg);
            return;
        }
        await memoLoadRecentLog();
        const remaining = _chain.find(r => r.selfOffset !== _offset);
        if (remaining == null) {
            _modal.Close();
            return;
        }
        await memoRefreshChainModal(_modal, remaining.selfOffset);
    }
    catch (e) {
        console.error('memo delete error:', e);
    }
}
async function memoChainSend(_modal, _input, _btn, _continueOffset) {
    const text = _input.value.trim();
    if (!text)
        return;
    _input.disabled = true;
    _btn.disabled = true;
    try {
        const j = await memoPostJson(FileApiUrl('Memo/Chat'), {
            mode: 'write',
            text,
            continueOffset: _continueOffset,
        });
        if (!j.ok) {
            console.error('memo chain send error:', j.msg);
            return;
        }
        await memoLoadRecentLog();
        await memoRefreshChainModal(_modal, _continueOffset);
    }
    catch (e) {
        console.error('memo chain send error:', e);
    }
    finally {
        _input.disabled = false;
        _btn.disabled = false;
    }
}
async function memoOpenChainModal(_selfOffset) {
    const modal = new CModal("memoChainModal");
    modal.SetTitle(CModal.eTitle.TextFullClose);
    modal.SetHeader("Memo");
    modal.SetSize(480, 600);
    modal.SetBody('<div class="text-center text-secondary p-4">Loading...</div>');
    modal.Open(CModal.ePos.Center);
    await memoRefreshChainModal(modal, _selfOffset);
}
function memoScrollBottom() {
    const el = CDOM.ID("memo-content");
    if (el)
        el.scrollTop = el.scrollHeight;
}
let memoPendingEl = null;
function memoAppendBubble(_role, _text, _pending) {
    const logEl = CDOM.ID("memo-log");
    if (logEl == null)
        return null;
    const placeholder = logEl.querySelector('#memoEmptyState');
    if (placeholder)
        placeholder.remove();
    const roleLabel = _role === 'ai' ? 'Memo' : _role === 'system' ? 'System' : '';
    const bubbleCls = _role === 'user'
        ? _pending
            ? 'msg-bubble p-3 rounded border-start border-4 border-secondary bg-body-tertiary memo-pending'
            : 'msg-bubble p-3 rounded border-start border-4 border-primary bg-primary-subtle'
        : _role === 'ai'
            ? 'msg-bubble p-3 rounded border-start border-4 border-secondary bg-body-tertiary'
            : 'msg-bubble p-2 px-3 rounded border border-danger bg-danger-subtle text-danger-emphasis';
    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <div class="text-secondary small text-uppercase mb-1" style="letter-spacing: .5px;">${roleLabel}</div>
        <div class="${bubbleCls}">${aiEscapeHtml(_text)}</div>
    `;
    logEl.appendChild(wrap);
    memoScrollBottom();
    return wrap;
}
function memoRenderEmptyLog() {
    const logEl = CDOM.ID("memo-log");
    if (logEl == null)
        return;
    logEl.innerHTML = '';
    const empty = document.createElement('div');
    empty.id = 'memoEmptyState';
    empty.className = 'text-center text-secondary mt-5';
    empty.innerHTML = `
        <i class="bi bi-journal-text fs-1 d-block mb-2"></i>
        <div>Enter a new memo.</div>
    `;
    logEl.appendChild(empty);
}
async function memoSend() {
    const textEl = CDOM.ID("memoTextInput");
    const modeEl = CDOM.ID("memoModeSelect");
    const providerEl = CDOM.ID("memoProviderSelect");
    const modelEl = CDOM.ID("memoModelSelect");
    const sendBtn = CDOM.ID("memoSendBtn");
    const text = textEl.value.trim();
    if (!text)
        return;
    memoPendingEl = memoAppendBubble('user', text, true);
    textEl.value = '';
    textEl.style.height = '0';
    sendBtn.disabled = true;
    try {
        const j = await memoPostJson(FileApiUrl('Memo/Chat'), {
            provider: providerEl.value || undefined,
            model: modelEl.value || undefined,
            mode: modeEl.value,
            text,
        });
        if (!j.ok) {
            memoAppendBubble('system', j.msg || 'Error');
            return;
        }
        if (j.result === 'saved') {
            if (memoPendingEl) {
                memoPendingEl.remove();
                memoPendingEl = null;
            }
            await memoLoadRecentLog();
        }
        else {
            if (memoPendingEl) {
                const bubble = memoPendingEl.querySelector('.msg-bubble');
                if (bubble)
                    bubble.className = 'msg-bubble p-3 rounded border-start border-4 border-primary bg-primary-subtle';
                memoPendingEl = null;
            }
            memoAppendBubble('ai', j.result);
            const deletedOffsets = memoExtractDeletedOffsets(j.result);
            if (deletedOffsets.length > 0)
                memoRemoveLogEntries(deletedOffsets);
        }
    }
    catch (e) {
        console.error('memo chat error:', e);
        memoAppendBubble('system', 'Network error');
    }
    finally {
        sendBtn.disabled = false;
    }
}
function memoEnsureLayout() {
    if (CDOM.ID("memo-content"))
        return;
    memoPanel.classList.add("position-relative");
    memoPanel.style.overflow = "hidden";
    memoPanel.innerHTML = `
        <style>
            #memo-content .msg-bubble { white-space: pre-wrap; word-wrap: break-word; line-height: 1.6; }
            #memo-content .msg-bubble pre { background: var(--bs-tertiary-bg); padding: .5rem; border-radius: .25rem; overflow-x: auto; }
            #memo-content .msg-bubble code { font-family: var(--bs-font-monospace); font-size: .875em; }
            #memo-content .memo-pending { opacity: 0.5; }
        </style>
        <div id="memo-auth-overlay" class="position-absolute align-items-center justify-content-center"
             style="inset:0; z-index:20; background:var(--bs-body-bg); display:none;">
            <div class="card shadow" style="width:320px;">
                <div class="card-body">
                    <h5 class="card-title mb-3"><i class="bi bi-shield-lock"></i> Authentication</h5>
                    <div class="mb-3">
                        <input type="password" id="memoAuthPwInput" class="form-control" placeholder="Password">
                    </div>
                    <div id="memoAuthMsg" class="text-danger small mb-2" style="min-height:1.2em;"></div>
                    <button id="memoAuthSubmitBtn" class="btn btn-primary w-100">Sign In</button>
                </div>
            </div>
        </div>
        <div id="memo-frame-container" class="d-flex flex-column overflow-hidden position-absolute bg-body text-body" style="inset:0;" data-bs-theme="dark">
            <div id="memo-topbar" class="d-flex align-items-center gap-2 p-2 border-bottom bg-body-tertiary">
                <select id="memoModeSelect" class="form-select form-select-sm w-auto">
                    <option value="auto">Auto</option>
                    <option value="write">Write</option>
                    <option value="read">Read</option>
                </select>
                <select id="memoProviderSelect" class="form-select form-select-sm w-auto"></select>
                <select id="memoModelSelect" class="form-select form-select-sm w-auto"></select>
            </div>
            <div id="memo-content" class="flex-grow-1 overflow-auto p-3 bg-body">
                <div id="memo-log" class="d-flex flex-column gap-2">
                    <div id="memoEmptyState" class="text-center text-secondary mt-5">
                        <i class="bi bi-journal-text fs-1 d-block mb-2"></i>
                        <div>Enter a new memo.</div>
                    </div>
                </div>
            </div>
            <div id="memo-composer" class="border-top bg-body-tertiary p-2">
                <div class="d-flex gap-2 align-items-end">
                    <textarea id="memoTextInput" class="form-control" placeholder="Enter memo..." rows="1" style="resize: none; max-height: 200px;"></textarea>
                    <button id="memoSendBtn" class="btn btn-primary">
                        <i class="bi bi-send"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    CDOM.ID("memoProviderSelect").addEventListener("change", memoPopulateModelSelect);
    CDOM.ID("memoSendBtn").addEventListener("click", memoSend);
    CDOM.ID("memoTextInput").addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
            ev.preventDefault();
            memoSend();
        }
    });
    CDOM.ID("memoTextInput").addEventListener("input", () => {
        const el = CDOM.ID("memoTextInput");
        el.style.height = '0';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    });
    CDOM.ID("memo-auth-overlay").addEventListener("keydown", (e) => e.stopPropagation());
    CDOM.ID("memoAuthSubmitBtn").addEventListener("click", memoDoAuth);
    CDOM.ID("memoAuthPwInput").addEventListener("keydown", (ev) => {
        if (ev.key === "Enter")
            memoDoAuth();
    });
    memoRenderEmptyLog();
}
memoEnsureLayout();
let memoInited = false;
let memoSyncedRootUrl = null;
function memoTryInit() {
    if (memoInited)
        return;
    memoInited = true;
    memoSyncedRootUrl = g_fileWebRootUrl;
    memoShowAuthOrLoad();
}
memoTab.addEventListener("shown.bs.tab", memoTryInit);
if (memoTab.classList.contains("active"))
    memoTryInit();
function memoNotifyRootChanged() {
    if (!memoInited || memoSyncedRootUrl === g_fileWebRootUrl)
        return;
    memoSyncedRootUrl = g_fileWebRootUrl;
    memoLoadGen++;
    memoProviders = [];
    memoRenderEmptyLog();
    memoShowAuthOrLoad();
}
let dlInited = false;
CDOM.ID("download-tab").addEventListener("shown.bs.tab", () => {
    if (dlInited)
        return;
    dlInited = true;
    MountDownloadTab("download-root");
});
if (CDOM.ID("download-panel").classList.contains("active")) {
    dlInited = true;
    MountDownloadTab("download-root");
}
let option = new CSingOption();
option.mFindPWBtn = "pass";
CSing.On(CSing.eEvent.State, () => {
    if (CSing.PrivateKey() == null)
        CDOM.ID("login-btn").innerText = "Login";
    else
        CDOM.ID("login-btn").innerText = "Logout";
});
CSing.On(CSing.eEvent.Init, () => {
    if (CSing.PrivateKey() == null)
        CDOM.ID("login-btn").innerText = "Login";
    else
        CDOM.ID("login-btn").innerText = "Logout";
});
CSing.On(CSing.eEvent.JoinInit, () => {
    loginModal.SetPosition(CModal.ePos.Center);
});
CSing.On(CSing.eEvent.Insert, () => {
    loginModal.Open();
    CSing.ModifyMode();
});
let html = await CSing.InitForm(option);
let loginModal = new CModal();
loginModal.SetHeader("Sing");
loginModal.SetBody(html);
loginModal.SetTitle(CModal.eTitle.TextClose);
loginModal.SetCloseToHide(true);
loginModal.SetSize(320, 640);
CDOM.ID("login-btn").addEventListener("click", () => {
    loginModal.Open();
});
