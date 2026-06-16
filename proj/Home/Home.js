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
gPF.mVersion = "mqex2tpd_11";
import { CAtelier } from "../../artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CSing, CSingOption } from "../../artgine/server/CSing.js";
import { CConfirm, CModal } from "../../artgine/basic/CModal.js";
import { CUtil } from "../../artgine/basic/CUtil.js";
import { CBoard } from "../../artgine/server/CBoard.js";
import { CUtilWeb } from "../../artgine/util/CUtilWeb.js";
import { CStorage } from "../../artgine/system/CStorage.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CDOM } from "../../artgine/basic/CDOM.js";
import { CFecth } from "../../artgine/network/CFecth.js";
import { CPath } from "../../artgine/basic/CPath.js";
import { CFileViewer, CMDViewer, CSheetViewer, CModalStackMsg, CModalMusic } from "../../artgine/util/CModalUtil.js";
import { CFile } from "../../artgine/system/CFile.js";
import { CPWA } from '../../artgine/system/CPWA.js';
import { Bootstrap } from "../../artgine/basic/Bootstrap.js";
import { CTooltip } from "../../artgine/util/CTooltip.js";
if (gPF.mServer != "webServer")
    CAlert.E("Server setting is invalid.");
CUtilWeb.Parameter("");
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
if (!CPWA.IsInstalled()) {
    CDOM.ID("install-btn").style.display = "";
}
CDOM.ID("install-btn").addEventListener("click", () => {
    let msg = CPWA.Install();
    if (msg)
        CAlert.Info(msg);
});
let bClient = null;
CDOM.ID("board-tab").onclick = () => {
    if (bClient == null) {
        bClient = new CBoard(CDOM.ID("board"), "");
        bClient.List(0, 5);
    }
};
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
const AI_TOKEN_KEY = 'artgine.token';
const aiFrameContainer = CDOM.ID("ai-frame-container");
const aiSessionList = CDOM.ID("aiSessionList");
const aiNewChatBtn = CDOM.ID("aiNewChatBtn");
let aiInited = false;
const iframePool = new Map();
let activeFrameKey = null;
let activeBrowserSid = null;
let pendingNewSid = null;
let _activeNotifCallback = null;
function isAiPanelActive() {
    return document.getElementById('ai-panel')?.classList.contains('active') === true;
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
    if (aiSidebarEl.classList.contains('collapsed'))
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
function showFrame(key, src) {
    let f = iframePool.get(key);
    if (!f) {
        f = document.createElement('iframe');
        f.src = src;
        f.setAttribute('allow', 'clipboard-read; clipboard-write');
        f.style.display = 'none';
        f.addEventListener('load', () => {
            const isTerm = key.startsWith('term:') || key.startsWith('term-new:');
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
                    if (!isTerm && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && goNextSession(e.key === 'ArrowUp' ? -1 : 1)) {
                        e.preventDefault();
                        return;
                    }
                    if (!isTerm && e.key === 'F1') {
                        e.preventDefault();
                        FileBtn();
                    }
                    else if (!isTerm && e.key === 'F2') {
                        e.preventDefault();
                        FileSearch();
                    }
                    else if (!isTerm && e.key === 'F3') {
                        e.preventDefault();
                        const fileTabEl = document.getElementById('file-tab');
                        if (fileTabEl)
                            window.bootstrap.Tab.getOrCreateInstance(fileTabEl).show();
                        FolderCD('/');
                    }
                    else if (!isTerm && e.key === 'F4') {
                        e.preventDefault();
                        const aiTabEl = document.getElementById('ai-tab');
                        if (aiTabEl)
                            window.bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
                    }
                }, true);
            }
            catch (_) { }
        });
        aiFrameContainer.appendChild(f);
        iframePool.set(key, f);
    }
    document.querySelectorAll('.browser-panel').forEach(p => { p.style.display = 'none'; });
    activeBrowserSid = null;
    if (activeFrameKey && activeFrameKey !== key) {
        const prev = iframePool.get(activeFrameKey);
        if (prev)
            prev.style.display = 'none';
    }
    f.style.display = 'block';
    activeFrameKey = key;
    return f;
}
function destroyFrame(key) {
    const f = iframePool.get(key);
    if (!f)
        return;
    f.remove();
    iframePool.delete(key);
    if (activeFrameKey === key)
        activeFrameKey = null;
}
function focusActiveFrame() {
    if (!activeFrameKey)
        return;
    const f = iframePool.get(activeFrameKey);
    if (!f)
        return;
    try {
        f.contentWindow?.focus();
        const input = f.contentDocument?.querySelector('#mi-bar textarea, textarea, input');
        if (input) {
            input.focus();
            return;
        }
    }
    catch (_) { }
    f.focus();
}
function focusActiveFrameIfSidebarCollapsed() {
    if (!aiSidebarEl.classList.contains('collapsed'))
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
function aiAuthedFetch(url, init) {
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
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
                + (isActive ? ' bg-primary-subtle' : '');
            item.dataset.sid = s.sessionId;
            const rel = aiFormatRelative(s.updatedAt);
            const st = !isLoaded ? 'off' : s.busy ? 'busy' : 'idle';
            syncSessState(`chat:${s.sessionId}`, st, () => {
                if (!isActiveFrame(key) || !document.hasFocus())
                    _showDoneNotification(aiEscapeHtml(s.title), s.lastMsg ? aiEscapeHtml(s.lastMsg) : undefined, () => aiLoadSession(s.sessionId));
            });
            const dot = st === 'off' ? '<span class="text-danger small" title="미연결">●</span>'
                : st === 'busy' ? '<span class="ai-busy-dot text-warning small" title="처리 중">●</span>'
                    : '<span class="text-success small" title="대기 중">●</span>';
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
            item.querySelector('.ai-popup-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                const existing = document.getElementById('ai-session-dropdown');
                if (existing)
                    existing.remove();
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
                            if (!confirm(`Delete "${s.title}"?`))
                                return;
                            await aiAuthedFetch(`${CPath.WebRootUrl()}ai/chat/session?id=${s.sessionId}`, { method: 'DELETE' });
                            destroyFrame(key);
                            aiRefreshSessions();
                            termRefreshSessions();
                        }
                        else if (b.dataset.act === 'link') {
                            aiShowShareLink(s.sessionId, s.title);
                        }
                    });
                });
                const close = (ev) => {
                    if (!drop.contains(ev.target)) {
                        drop.remove();
                        document.removeEventListener('click', close);
                    }
                };
                setTimeout(() => document.addEventListener('click', close), 0);
            });
            item.addEventListener('mouseenter', () => { if (!isActive)
                item.classList.add('bg-body-secondary'); });
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
            const aiTipEl = document.createElement('div');
            aiTipEl.style.cssText = 'white-space:pre-wrap;max-width:280px;font-size:0.82rem;';
            aiTipEl.textContent = s.title + (s.lastMsg ? '\n\n' + s.lastMsg : '');
            new CTooltip(aiTipEl, item, CTooltip.eTrigger.Hover, CTooltip.ePlacement.Left);
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
        const allowCheck = container.querySelector('#chat-opt-allow');
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
            if (allowCheck.checked)
                params.set('allow', '1');
            if (mdcopyCheck.checked)
                params.set('mdcopy', '1');
            pendingNewSid = sid;
            showFrame(`chat:${sid}`, `./AI/AIChat.html?${params.toString()}`);
            aiRefreshSessions();
            termRefreshSessions();
            refreshSessionsSoon();
            modal.Close();
        };
        container.querySelector('#chat-modal-open').addEventListener('click', doOpen);
        container.querySelector('#chat-modal-cancel').addEventListener('click', () => modal.Close());
        workingDirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            doOpen(); });
    }, 100);
}
const CMD_TOKEN_KEY = 'artgine.token';
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
function termAuthedFetch(url, init) {
    return fetch(url, init);
}
async function termStartNew(_mode = 'cmd', initialWorkingDir) {
    const token = localStorage.getItem(CMD_TOKEN_KEY);
    if (token) {
        try {
            const r = await termAuthedFetch(CPath.WebRootUrl() + 'cmd/sessions');
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
        <p class="fw-semibold mb-3">옵션</p>
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
        let selectedMode = _mode;
        const modeButtons = container.querySelectorAll('.term-mode-btn');
        const allowCheck = container.querySelector('#term-opt-allow');
        const mcpCheck = container.querySelector('#term-opt-mcp');
        const mdcopyCheck = container.querySelector('#term-opt-mdcopy');
        const updateModeUI = (mode) => {
            selectedMode = mode;
            modeButtons.forEach(b => {
                b.classList.toggle('btn-primary', b.dataset.mode === mode);
                b.classList.toggle('btn-outline-secondary', b.dataset.mode !== mode);
            });
            allowCheck.disabled = mode === 'cmd';
            if (mode === 'cmd')
                allowCheck.checked = false;
        };
        modeButtons.forEach(b => b.addEventListener('click', () => updateModeUI(b.dataset.mode)));
        updateModeUI(selectedMode);
        const keyInput = container.querySelector('#term-opt-key');
        const workingDirInput = container.querySelector('#term-opt-workingDir');
        if (initialWorkingDir)
            workingDirInput.value = initialWorkingDir;
        const openBtn = container.querySelector('#term-modal-open');
        const cancelBtn = container.querySelector('#term-modal-cancel');
        const doOpen = async () => {
            const key = keyInput.value.trim();
            const workingDir = workingDirInput.value.trim();
            const params = new URLSearchParams({ mode: selectedMode });
            if (key)
                params.set('key', key);
            if (workingDir)
                params.set('workingDir', workingDir);
            if (allowCheck.checked)
                params.set('allow', '1');
            if (!mcpCheck.checked)
                params.set('mcp', '0');
            if (mdcopyCheck.checked)
                params.set('mdcopy', '1');
            modal.Close();
            try {
                const r = await termAuthedFetch(CPath.WebRootUrl() + 'cmd/start-ttyd?' + params.toString());
                const j = await r.json();
                if (!j.ok) {
                    alert(j.msg || 'Failed to start terminal');
                    return;
                }
                const key = `term-new:${Date.now()}`;
                showFrame(key, `${CPath.WebRootUrl()}cmd/terminal-proxy?port=${j.port}`);
                aiRefreshSessions();
                termRefreshSessions();
                refreshSessionsSoon();
            }
            catch (e) {
                console.error('[Terminal] start-ttyd error:', e);
                alert('Failed to start terminal');
            }
        };
        openBtn.addEventListener('click', doOpen);
        cancelBtn.addEventListener('click', () => modal.Close());
        workingDirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            doOpen(); });
    }, 100);
}
async function termConnectSession(port) {
    const key = `term:${port}`;
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
async function termKillSession(port) {
    try {
        const r = await termAuthedFetch(`${CPath.WebRootUrl()}cmd/kill-session?port=${port}`);
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
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded'
                + (isActive ? ' bg-success-subtle' : '');
            item.dataset.port = String(s.port);
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
            item.querySelector('.term-popup-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                const existing = document.getElementById('term-popup-dropdown');
                if (existing)
                    existing.remove();
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
                            termConfirmKillSession(s.port);
                        }
                        else if (b.dataset.act === 'link') {
                            termShowShareLink(s.port);
                        }
                        else {
                            termOpenPopup(s.port, b.dataset.act === 'window');
                        }
                    });
                });
                const close = (ev) => {
                    if (!drop.contains(ev.target)) {
                        drop.remove();
                        document.removeEventListener('click', close);
                    }
                };
                setTimeout(() => document.addEventListener('click', close), 0);
            });
            item.addEventListener('mouseenter', () => { if (!isActive)
                item.classList.add('bg-body-secondary'); });
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
            const termTipEl = document.createElement('div');
            termTipEl.style.cssText = 'white-space:pre-wrap;max-width:280px;font-size:0.82rem;';
            termTipEl.textContent = s.lastMsg || '(empty)';
            new CTooltip(termTipEl, item, CTooltip.eTrigger.Hover, CTooltip.ePlacement.Left);
            termSessionList.appendChild(item);
        }
    }
    catch (e) {
        console.error('Terminal session list error:', e);
    }
}
function termShowShareLink(port) {
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
function aiShowShareLink(sessionId, title) {
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
async function termOpenPopup(port, newWindow = false) {
    if (newWindow) {
        window.open(`${CPath.WebRootUrl()}cmd/terminal-proxy?port=${port}`, `term_${port}`, 'width=900,height=600,toolbar=no,menubar=no,location=no,status=no');
        return;
    }
    try {
        const modal = new CModal(null);
        modal.SetCloseToHide(false);
        modal.SetResize(true);
        modal.SetTitle(CModal.eTitle.TextClose);
        modal.SetHeader('Terminal');
        modal.SetBody(`<div style="position:relative;width:100%;height:100%;">` +
            `<iframe src="${CPath.WebRootUrl()}cmd/terminal-proxy?port=${port}" style="width:100%;height:100%;border:none;display:block;"></iframe>` +
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
        console.error('Terminal popup error:', e);
    }
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
        const r = await termAuthedFetch(CPath.WebRootUrl() + 'cmd/schedules');
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
                    <span class="badge rounded-pill ${s.mode === 'none' ? 'bg-secondary' : s.mode === 'cmd' ? 'bg-info' : s.mode === 'claude' ? 'bg-warning text-dark' : s.mode === 'codex' ? 'bg-primary' : 'bg-danger'}" style="font-size:0.65rem;">${s.mode === 'antigravity' ? 'agy' : s.mode}</span>
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
                await termAuthedFetch(`${CPath.WebRootUrl()}cmd/schedule-del?name=${encodeURIComponent(s.name)}`);
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
            const r = await termAuthedFetch(`${CPath.WebRootUrl()}cmd/schedule-set?${params.toString()}`);
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
    }, 100);
}
schedNewBtn.addEventListener('click', () => schedOpenModal());
setInterval(() => {
    if (CDOM.ID("ai-panel").classList.contains("show")) {
        aiRefreshSessions();
        termRefreshSessions();
        schedRefresh();
    }
}, 5000);
window.addEventListener('message', (e) => {
    if (e.data?.type === 'ai-sessions-changed') {
        pendingNewSid = null;
        aiRefreshSessions();
    }
    if (e.data?.type === 'terminal-tab-key') {
        handleTabKey();
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
        const k = e.data.key;
        if (k === 'F1')
            FileBtn();
        else if (k === 'F2')
            FileSearch();
        else if (k === 'F3') {
            const fileTabEl = document.getElementById('file-tab');
            if (fileTabEl)
                window.bootstrap.Tab.getOrCreateInstance(fileTabEl).show();
            FolderCD('/');
        }
        else if (k === 'F4') {
            const aiTabEl = document.getElementById('ai-tab');
            if (aiTabEl)
                window.bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
        }
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
    if (aiSidebarEl.classList.contains('collapsed'))
        return false;
    const isChat = !activeFrameKey || activeFrameKey.startsWith('chat:');
    if (isChat) {
        const items = Array.from(aiSessionList.querySelectorAll('[data-sid]'));
        if (items.length === 0)
            return false;
        const curIdx = activeFrameKey ? items.findIndex(el => el.dataset.sid === activeFrameKey.slice(5)) : -1;
        const nxt = curIdx === -1 ? (dir === 1 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (nxt === curIdx)
            return false;
        const sid = items[nxt].dataset.sid;
        aiLoadSession(sid);
        items[nxt].scrollIntoView({ block: 'nearest' });
        return true;
    }
    else {
        const items = Array.from(termSessionList.querySelectorAll('[data-port]'));
        if (items.length === 0)
            return false;
        const curIdx = activeFrameKey ? items.findIndex(el => `term:${el.dataset.port}` === activeFrameKey) : -1;
        const nxt = curIdx === -1 ? (dir === 1 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, curIdx + dir));
        if (nxt === curIdx)
            return false;
        termConnectSession(parseInt(items[nxt].dataset.port));
        items[nxt].scrollIntoView({ block: 'nearest' });
        return true;
    }
}
const AI_SIDEBAR_COLLAPSED_KEY = 'ai.sidebarCollapsed';
const aiSidebarEl = CDOM.ID("ai-sidebar");
const aiSidebarToggleBtn = CDOM.ID("aiSidebarToggle");
function applySidebarCollapsed(collapsed) {
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
    if (isAiPanelActive() && isAiAuthVisible())
        return;
    if (e.key === 'Tab') {
        if (!isAiPanelActive())
            return;
        e.preventDefault();
        handleTabKey();
        return;
    }
    if (handleTermSidebarShortcut(e))
        return;
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
        if (goNextSession(e.key === 'ArrowUp' ? -1 : 1))
            e.preventDefault();
        return;
    }
    if (e.key === 'F1') {
        e.preventDefault();
        FileBtn();
    }
    else if (e.key === 'F2') {
        e.preventDefault();
        FileSearch();
    }
    else if (e.key === 'F3') {
        e.preventDefault();
        const fileTabEl = document.getElementById('file-tab');
        if (fileTabEl)
            window.bootstrap.Tab.getOrCreateInstance(fileTabEl).show();
        FolderCD('/');
    }
    else if (e.key === 'F4') {
        e.preventDefault();
        const aiTabEl = document.getElementById('ai-tab');
        if (aiTabEl)
            window.bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
    }
});
const aiAuthOverlay = CDOM.ID("ai-auth-overlay");
const aiAuthPwInput = CDOM.ID("aiAuthPwInput");
const aiAuthMsg = CDOM.ID("aiAuthMsg");
const aiAuthSubmitBtn = CDOM.ID("aiAuthSubmitBtn");
aiAuthOverlay.addEventListener('keydown', (e) => e.stopPropagation());
async function aiCheckAuth() {
    const token = localStorage.getItem(AI_TOKEN_KEY) || '';
    if (!token)
        return false;
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "auth/check", { token }, "json");
        return !!j?.authed;
    }
    catch {
        return false;
    }
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
    }
    else {
        fileAuthed = true;
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
            localStorage.setItem(AI_TOKEN_KEY, j.token);
            fileAuthed = true;
            aiAuthOverlay.style.display = 'none';
            aiRefreshSessions();
            termRefreshSessions();
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
CDOM.ID("ai-term-subtab").addEventListener("shown.bs.tab", () => { termRefreshSessions(); schedRefresh(); });
CDOM.ID("ai-browser-subtab").addEventListener("shown.bs.tab", () => browserRefreshList());
const browserNewBtn = CDOM.ID("browserNewBtn");
const browserSessionList = CDOM.ID("browserSessionList");
const browserSessions = new Map();
const BROWSER_POLL_MS = 3000;
setInterval(() => {
    for (const s of browserSessions.values()) {
        s.ttlEl.textContent = browserFmtTtl(s.expiresAt);
    }
}, 1000);
function browserBufToDataUrl(buf) {
    const bytes = new Uint8Array(buf.data);
    let bin = '';
    for (let i = 0; i < bytes.length; i++)
        bin += String.fromCharCode(bytes[i]);
    return 'data:image/png;base64,' + btoa(bin);
}
function browserShowPanel(sessionId) {
    if (activeFrameKey) {
        iframePool.get(activeFrameKey)?.style.setProperty('display', 'none');
        activeFrameKey = null;
    }
    for (const [sid, s] of browserSessions) {
        const isActive = sid === sessionId;
        s.panelEl.style.display = isActive ? 'flex' : 'none';
        s.sidebarEl.classList.toggle('bg-primary-subtle', isActive);
        const dot = s.sidebarEl.querySelector('.browser-dot');
        if (dot) {
            dot.classList.toggle('text-success', isActive);
            dot.classList.toggle('text-danger', !isActive);
        }
    }
    activeBrowserSid = sessionId;
}
async function browserPoll(sessionId) {
    const s = browserSessions.get(sessionId);
    if (!s)
        return;
    if (document.hasFocus() && activeBrowserSid === sessionId) {
        try {
            const r = await aiAuthedFetch(`${CPath.WebRootUrl()}playwright/exec`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, fn: 'screenshot', args: [] })
            });
            const j = await r.json();
            if (j.ok && j.result?.type === 'Buffer') {
                s.imgEl.src = browserBufToDataUrl(j.result);
            }
            if (j.logs?.length) {
                for (const l of j.logs) {
                    const div = document.createElement('div');
                    div.className = (l.type === 'error' || l.type === 'network') ? 'text-danger' : '';
                    div.textContent = `[${l.type}] ${l.text}`;
                    s.logEl.appendChild(div);
                }
                s.logEl.scrollTop = s.logEl.scrollHeight;
            }
        }
        catch { }
    }
    s.timer = window.setTimeout(() => browserPoll(sessionId), s.pollMs);
}
function browserFmtTtl(expiresAt) {
    const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (rem <= 0)
        return '−0s';
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return m > 0 ? `−${m}m${s}s` : `−${s}s`;
}
function browserAddSession(sessionId, url, browserName = '', expiresAt = 0) {
    if (browserSessions.has(sessionId))
        return;
    const sidebarEl = document.createElement('div');
    sidebarEl.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-2 rounded';
    sidebarEl.innerHTML = `
        <span class="browser-dot text-danger small flex-shrink-0">●</span>
        <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
            <span class="text-truncate small" title="${aiEscapeHtml(url)}">${aiEscapeHtml(url)}</span>
            <span class="d-flex gap-2 text-secondary" style="font-size:0.7rem;">
                <span>${aiEscapeHtml(browserName || 'auto')}</span>
                <span class="browser-ttl-label"></span>
            </span>
        </span>
        <button class="browser-close-btn btn btn-sm btn-link text-secondary p-0"><i class="bi bi-x-lg"></i></button>
    `;
    const ttlEl = sidebarEl.querySelector('.browser-ttl-label');
    sidebarEl.addEventListener('click', () => browserShowPanel(sessionId));
    sidebarEl.querySelector('.browser-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        browserRemoveSession(sessionId);
    });
    sidebarEl.addEventListener('mouseenter', () => { if (activeBrowserSid !== sessionId)
        sidebarEl.classList.add('bg-body-secondary'); });
    sidebarEl.addEventListener('mouseleave', () => sidebarEl.classList.remove('bg-body-secondary'));
    browserSessionList.appendChild(sidebarEl);
    const panelEl = document.createElement('div');
    panelEl.className = 'browser-panel';
    panelEl.style.cssText = 'position:absolute;inset:0;display:none;flex-direction:column;';
    panelEl.innerHTML = `
        <div class="d-flex align-items-center gap-2 px-3 flex-shrink-0" style="height:36px;background:#1e1e1e;border-bottom:1px solid #333;font-size:0.75rem;color:#aaa;">
            <span>갱신</span>
            <input type="range" class="browser-rate-slider form-range" min="0.1" max="10" step="0.1" value="3" style="width:120px;">
            <span class="browser-rate-label">3s</span>
            <span class="ms-3">인풋 모드</span>
            <input type="checkbox" class="browser-click-toggle form-check-input ms-1">
        </div>
        <div class="browser-img-wrap" style="flex:1;min-height:0;background:#111;overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative;">
            <img class="browser-screenshot" style="max-width:100%;max-height:100%;object-fit:contain;" alt="" />
        </div>
        <div class="browser-logs overflow-auto p-2 font-monospace d-flex flex-column" style="height:200px;font-size:0.75rem;background:#1a1a1a;color:#aaa;border-top:1px solid #333;flex-shrink:0;"></div>
    `;
    const imgEl = panelEl.querySelector('.browser-screenshot');
    const logEl = panelEl.querySelector('.browser-logs');
    const slider = panelEl.querySelector('.browser-rate-slider');
    const rateLabel = panelEl.querySelector('.browser-rate-label');
    const clickToggle = panelEl.querySelector('.browser-click-toggle');
    aiFrameContainer.appendChild(panelEl);
    const session = {
        sessionId, url, browserName, expiresAt,
        sidebarEl, ttlEl, panelEl, imgEl, logEl,
        timer: null, pollMs: 3000, inputMode: false,
    };
    browserSessions.set(sessionId, session);
    slider.addEventListener('input', () => {
        const s = parseFloat(slider.value);
        session.pollMs = s * 1000;
        rateLabel.textContent = `${s}s`;
    });
    clickToggle.addEventListener('change', () => {
        session.inputMode = clickToggle.checked;
        imgWrap.tabIndex = clickToggle.checked ? 0 : -1;
        if (clickToggle.checked)
            imgWrap.focus();
    });
    const imgWrap = panelEl.querySelector('.browser-img-wrap');
    imgWrap.tabIndex = -1;
    imgWrap.style.outline = 'none';
    imgWrap.addEventListener('keydown', async (e) => {
        if (!session.inputMode)
            return;
        e.preventDefault();
        const fn = e.key.length === 1 ? 'keyboard.type' : 'keyboard.press';
        try {
            await aiAuthedFetch(`${CPath.WebRootUrl()}playwright/exec`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, fn, args: [e.key] })
            });
        }
        catch { }
    });
    imgEl.addEventListener('click', async (e) => {
        if (!session.inputMode)
            return;
        if (session.inputMode)
            imgWrap.focus();
        const rect = imgEl.getBoundingClientRect();
        const natW = imgEl.naturalWidth;
        const natH = imgEl.naturalHeight;
        if (!natW || !natH)
            return;
        const scale = Math.min(rect.width / natW, rect.height / natH);
        const dispW = natW * scale;
        const dispH = natH * scale;
        const ox = (rect.width - dispW) / 2;
        const oy = (rect.height - dispH) / 2;
        const cx = Math.round((e.clientX - rect.left - ox) / scale);
        const cy = Math.round((e.clientY - rect.top - oy) / scale);
        if (cx < 0 || cy < 0 || cx > natW || cy > natH)
            return;
        const wrapRect = imgWrap.getBoundingClientRect();
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position:absolute;
            left:${e.clientX - wrapRect.left}px;
            top:${e.clientY - wrapRect.top}px;
            width:24px;height:24px;
            margin:-12px 0 0 -12px;
            border-radius:50%;
            border:2px solid #000;
            background:rgba(255,120,0,0.5);
            box-shadow:0 0 0 1.5px #ff7800;
            pointer-events:none;
            animation:browser-ripple 0.5s ease-out forwards;
        `;
        imgWrap.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
        try {
            await aiAuthedFetch(`${CPath.WebRootUrl()}playwright/exec`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, fn: 'mouse.click', args: [cx, cy] })
            });
        }
        catch { }
    });
    browserShowPanel(sessionId);
    browserPoll(sessionId);
}
async function browserRemoveSession(sessionId) {
    const s = browserSessions.get(sessionId);
    if (!s)
        return;
    if (s.timer !== null) {
        clearTimeout(s.timer);
        s.timer = null;
    }
    s.sidebarEl.remove();
    s.panelEl.remove();
    browserSessions.delete(sessionId);
    if (activeBrowserSid === sessionId)
        activeBrowserSid = null;
    try {
        await aiAuthedFetch(`${CPath.WebRootUrl()}playwright/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
    }
    catch { }
}
async function browserRefreshList() {
    try {
        const r = await aiAuthedFetch(`${CPath.WebRootUrl()}playwright/list`);
        const j = await r.json();
        if (!j.ok)
            return;
        const serverIds = new Set(j.sessions.map(s => s.sessionId));
        for (const [sid] of browserSessions) {
            if (!serverIds.has(sid))
                browserRemoveSession(sid);
        }
        for (const s of j.sessions) {
            browserAddSession(s.sessionId, s.currentUrl, s.browserName, s.expiresAt);
        }
    }
    catch { }
}
browserNewBtn.addEventListener('click', () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <p class="fw-semibold mb-3">새 브라우저 세션</p>
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
        const doOpen = async () => {
            const url = urlInput.value.trim();
            if (!url)
                return;
            const browser = browserSel.value;
            const ttl = parseInt(ttlInput.value) || 300;
            modal.Close();
            try {
                const r = await aiAuthedFetch(`${CPath.WebRootUrl()}playwright/push`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, ...(browser ? { browser } : {}), ttl, logSize: 200 })
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
    }, 100);
});
function showAiTermSubtab() {
    const termSubEl = CDOM.ID("ai-term-subtab");
    window.bootstrap.Tab.getOrCreateInstance(termSubEl).show();
}
CDOM.ID("ai-tab").addEventListener("shown.bs.tab", () => {
    aiInited = true;
    showAiTermSubtab();
    aiShowAuthOrLoad();
});
if (CDOM.ID("ai-panel").classList.contains("show")) {
    aiInited = true;
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
        const filePath = (window["g_root"] ?? '') + (window["g_path"] ?? '') + (fl.name ?? '');
        const escaped = filePath.replace(/'/g, "\\'");
        return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;cursor:pointer;" onclick="event.stopPropagation();openVcsDiff('${escaped}')">${s}</span>`;
    }
    return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;">${s}</span>`;
}
let index = 0;
var folderList = { "<>": "ul", "class": "list-group", "html": [] };
var fileList = { "<>": "ul", "class": "list-group", "html": [] };
function DirListRefresh() {
    CDOM.ID("File_div").innerHTML = "";
    CDOM.ID("Delete_div").innerHTML = "";
    folderList = { "<>": "ul", "class": "list-group", "html": [] };
    fileList = { "<>": "ul", "class": "list-group", "html": [] };
    if (window["g_path"] != null && window["g_path"] != "/") {
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-warning list-group-item-action", "html": "<i class='bi bi-folder'></i> Root Folder",
            "onclick": () => { FolderCD("/"); },
        });
        let path = window["g_path"];
        let pos = path.lastIndexOf("/", path.length - 2);
        let bpath = path.substr(0, pos);
        bpath += "/";
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-primary list-group-item-action", "html": "<i class='bi bi-folder'></i> Parent Folder",
            "onclick": () => { FolderCD(bpath); },
        });
    }
    for (let fl of window["g_dirList"]) {
        if (fl.hidden)
            continue;
        fl.open = false;
        fl.index = index;
        index++;
        let name = "";
        let onclick = null;
        if (fl.file == false) {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-folder-fill'>" + fl.name + vcsTag(fl), "onclick": () => {
                    let soundAddType = CDOM.IDValue("soundAddType");
                    if (soundAddType == "1") {
                        let p2 = { path: window["g_path"] + fl.name + "/" };
                        if (RootPath)
                            p2.RootPath = RootPath;
                        if (RootUrl)
                            p2.RootUrl = RootUrl;
                        CFecth.Exe("File/List", p2, "json").then((data) => {
                            CAlert.Info(window["g_path"] + fl.name + "추가");
                            for (let fl2 of data.list) {
                                if (fl.name == fl2.name)
                                    continue;
                                if (fl2.ext == "mp3" || fl2.ext == "ogg")
                                    g_musicJBox.AddTrack(fl2.name, window["g_down"] + window["g_path"] + fl.name + "/" + fl2.name);
                            }
                            g_musicJBox.Play(0);
                        });
                    }
                    else
                        FolderCD(window["g_path"] + fl.name + "/");
                } });
        }
        else if (fl.ext == "png" || fl.ext == "jpg" || fl.ext == "jpeg" || fl.ext == "bmp") {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-folder-image'>" + fl.name + vcsTag(fl), "onclick": (e) => {
                    CDOM.ID("ImageModalSrc").hidden = false;
                    CDOM.ID("ImageModalSrc").src = window["g_down"] + window["g_path"] + fl.name;
                    CDOM.ID("VideoModalSrc").hidden = true;
                    CDOM.ID("FileModalSrc").hidden = true;
                    fl.open = true;
                    RefreshOpen();
                    g_contentJBox.Show();
                } });
        }
        else if (fl.ext == "mp3" || fl.ext == "ogg") {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-folder-music'>" + fl.name + vcsTag(fl), "onclick": () => {
                    let soundAddType = CDOM.IDValue("soundAddType");
                    if (soundAddType == "1") {
                        g_musicJBox.AddTrack(fl.name, window["g_down"] + window["g_path"] + fl.name);
                        CAlert.Info(fl.name + " 추가");
                    }
                    else {
                        const _newNames = [fl.name];
                        const _newPaths = [window["g_down"] + window["g_path"] + fl.name];
                        for (let fl2 of window["g_dirList"]) {
                            if (fl.name == fl2.name)
                                continue;
                            if (fl2.ext == "mp3" || fl2.ext == "ogg") {
                                const _fp = window["g_down"] + window["g_path"] + fl2.name;
                                if (!_newPaths.includes(_fp)) {
                                    _newNames.push(fl2.name);
                                    _newPaths.push(_fp);
                                }
                            }
                        }
                        g_musicJBox.SetList(_newNames, _newPaths);
                        g_musicJBox.Play(0);
                    }
                    fl.open = true;
                    RefreshOpen();
                } });
        }
        else if (fl.ext == "mp4" || fl.ext == "mov" || fl.ext == "avi") {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-folder-play'>" + fl.name + vcsTag(fl), "onclick": () => {
                    CDOM.ID("ImageModalSrc").hidden = true;
                    CDOM.ID("VideoModalSrc").src = window["g_down"] + window["g_path"] + fl.name;
                    CDOM.ID("VideoModalSrc").hidden = false;
                    CDOM.ID("FileModalSrc").hidden = true;
                    fl.open = true;
                    RefreshOpen();
                    g_contentJBox.Show();
                } });
        }
        else if (fl.ext == "soundlist") {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-flower1'>" + fl.name + vcsTag(fl), "onclick": () => {
                    var oReq = new XMLHttpRequest();
                    oReq.onload = (e) => {
                        if (oReq.status != 200) {
                            CAlert.E("XMLHttpRequest error code" + oReq.status);
                        }
                        else {
                            const _d = oReq.response;
                            g_musicJBox.SetList(_d.name || [], _d.fullPath || []);
                            CAlert.Info("ListUp!");
                        }
                    };
                    oReq.open("GET", window["g_down"] + window["g_path"] + fl.name);
                    oReq.responseType = "json";
                    oReq.send();
                } });
        }
        else if (fl.ext == "html") {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-file-earmark-code'>" + fl.name + vcsTag(fl), "onclick": () => {
                    let confirm = new CConfirm();
                    confirm.SetBody("HTML 파일을 어떻게 열까요?");
                    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
                        () => { window.open(window["g_down"] + window["g_path"] + fl.name, "_blank"); },
                        () => {
                            let viewer = new CFileViewer([window["g_down"] + window["g_path"] + fl.name], async (filePath, bufStr) => {
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
                    ], ["New Window", "File Viewer"]);
                    confirm.Open();
                } });
        }
        else if (fl.ext == "ts" || fl.ext == "js" || fl.ext == "txt" || fl.ext == "json") {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-file-code'>" + fl.name + vcsTag(fl), "onclick": () => {
                    let viewer = new CFileViewer([window["g_down"] + window["g_path"] + fl.name], async (filePath, bufStr) => {
                        const fileName = filePath.split('/').pop();
                        const dirPath = window["g_root"] + window["g_path"];
                        const base64 = btoa(unescape(encodeURIComponent(bufStr)));
                        console.log('Upload save', { path: dirPath, name: [fileName] });
                        CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                            CAlert.Info('저장 완료');
                        }).catch((e) => {
                            CAlert.E('저장 실패: ' + e.message);
                        });
                    });
                    viewer.Open();
                } });
        }
        else if (fl.ext == "md") {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-file-earmark-text'>" + fl.name + vcsTag(fl), "onclick": (e) => {
                    new CMDViewer(window["g_down"] + window["g_path"] + fl.name);
                } });
        }
        else if (fl.ext == "csv" || fl.ext == "xlsx" || fl.ext == "xls") {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-file-earmark-spreadsheet'>" + fl.name + vcsTag(fl), "onclick": () => {
                    new CSheetViewer([window["g_down"] + window["g_path"] + fl.name], async (filePath, base64) => {
                        const fileName = filePath.split('/').pop();
                        const dirPath = window["g_root"] + window["g_path"];
                        CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                            CAlert.Info('저장 완료');
                        }).catch((e) => {
                            CAlert.E('저장 실패: ' + e.message);
                        });
                    }).Open();
                } });
        }
        else {
            folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-file'>" + fl.name + vcsTag(fl), "onclick": () => {
                    CDOM.ID("ImageModalSrc").hidden = true;
                    CDOM.ID("FileModalSrc").href = window["g_down"] + window["g_path"] + fl.name;
                    CDOM.ID("VideoModalSrc").hidden = true;
                    CDOM.ID("FileModalSrc").hidden = false;
                    g_contentJBox.Show();
                } });
        }
        if (fl.file == true) {
            fileList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": "<i class='bi bi-file'>" + fl.name + vcsTag(fl), "onclick": () => {
                    Delete(fl.name);
                } });
        }
    }
    CDOM.ID("File_div").append(CDOM.DataToDom(folderList));
    CDOM.ID("Delete_div").append(CDOM.DataToDom(fileList));
}
let path = CUtilWeb.Parameter("path");
let RootPath = CUtilWeb.Parameter("RootPath");
let RootUrl = CUtilWeb.Parameter("RootUrl");
let fileAuthed = !!localStorage.getItem(AI_TOKEN_KEY);
window["g_dirList"] = CStorage.Get(path == null ? "root" : path);
if (window["g_dirList"] != null) {
    window["g_dirList"] = JSON.parse(window["g_dirList"]);
    DirListRefresh();
}
let fetchParam = { path: path };
if (RootPath)
    fetchParam.RootPath = RootPath;
if (RootUrl)
    fetchParam.RootUrl = RootUrl;
CFecth.Exe("File/List", fetchParam, "json").then((data) => {
    CStorage.Set(path == null ? "root" : path, JSON.stringify(data.list));
    window["g_dirList"] = data.list;
    window["g_root"] = data.RootPath?.replace(/\/+$/, '') ?? '';
    window["g_path"] = data.path;
    window["g_down"] = data.RootUrl;
    window["g_roots"] = data.roots ?? [];
    DirListRefresh();
});
{
    const _sd = CStorage.Get("SoundList");
    const _d = _sd ? JSON.parse(_sd) : { name: [], fullPath: [] };
    g_musicJBox = new CModalMusic(_d.name, _d.fullPath, (names, paths) => CStorage.Set("SoundList", JSON.stringify({ name: names, fullPath: paths })));
}
function FolderCD(_path, _onDone) {
    window["g_path"] = _path;
    let p2 = { path: _path };
    if (RootPath)
        p2.RootPath = RootPath;
    if (RootUrl)
        p2.RootUrl = RootUrl;
    CFecth.Exe("File/List", p2, "json").then((data) => {
        window["g_dirList"] = data.list;
        window["g_root"] = data.RootPath?.replace(/\/+$/, '') ?? '';
        window["g_path"] = data.path;
        window["g_down"] = data.RootUrl;
        window["g_roots"] = data.roots ?? [];
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
    form.setAttribute("action", CPath.WebRootUrl() + "File/Redirection");
    CDOM.IDValue("fun", g_fun);
    CDOM.IDValue("data", g_data);
    CDOM.IDValue("option", g_option);
    CDOM.IDValue("path", window["g_path"]);
    CDOM.IDValue("RootPath", RootPath ?? "");
    CDOM.IDValue("RootUrl", RootUrl ?? "");
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
        const valid = await aiCheckAuth();
        if (valid) {
            showFileAdminModal();
            return;
        }
        fileAuthed = false;
    }
    const dlg = new CConfirm();
    dlg.SetBody('Enter admin password:<br><input type="password" id="AuthPassword" class="form-control form-control-sm">');
    const doAuth = () => {
        const pw = CDOM.IDValue("AuthPassword");
        CFecth.Exe(CPath.WebRootUrl() + "auth/login", { password: pw }, "json").then((j) => {
            if (j.ok) {
                localStorage.setItem(AI_TOKEN_KEY, j.token);
                fileAuthed = true;
                aiAuthOverlay.style.display = 'none';
                aiRefreshSessions();
                termRefreshSessions();
                CAlert.Info("Permission granted");
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
    }, 80);
}
window["FileBtn"] = FileBtn;
window["PermissionBtn"] = FileBtn;
function showFileAdminModal() {
    const uid = Date.now();
    const _roots = window["g_roots"] ?? [];
    const _opts = [..._roots, { path: "./", url: "/Artgine/", name: "Artgine (WorkingPath)" }];
    let _curIdx = _opts.findIndex(r => r.path === (RootPath ?? '') && r.url === (RootUrl ?? ''));
    if (_curIdx < 0)
        _curIdx = 0;
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
        const applyValues = (root, down) => {
            RootPath = root || null;
            RootUrl = down || null;
            modal.Close();
            FolderCD("/");
        };
        const rootSel = document.getElementById(`fadm_rootsel_${uid}`);
        rootSel?.addEventListener('change', () => {
            const r = _opts[parseInt(rootSel.value)];
            if (r)
                applyValues(r.path, r.url);
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
        document.getElementById(`fadm_chat_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = (window["g_root"] ?? '') + (window["g_path"] ?? '');
            const aiTabEl = document.querySelector('[data-bs-target="#ai-panel"]');
            if (aiTabEl)
                window.bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
            setTimeout(() => {
                const chatSubEl = document.getElementById('ai-chat-subtab');
                if (chatSubEl)
                    window.bootstrap.Tab.getOrCreateInstance(chatSubEl).show();
            }, 150);
            chatStartNew(cwd || undefined);
        });
        document.getElementById(`fadm_term_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = (window["g_root"] ?? '') + (window["g_path"] ?? '');
            const aiTabEl = document.querySelector('[data-bs-target="#ai-panel"]');
            if (aiTabEl)
                window.bootstrap.Tab.getOrCreateInstance(aiTabEl).show();
            setTimeout(() => {
                const termSubEl = document.getElementById('ai-term-subtab');
                if (termSubEl)
                    window.bootstrap.Tab.getOrCreateInstance(termSubEl).show();
            }, 150);
            termStartNew('cmd', cwd || undefined);
        });
        const vcsPath = () => (window["g_root"] ?? './') + (window["g_path"] ?? '');
        document.getElementById(`fadm_vcs_diff_${uid}`)?.addEventListener('click', () => openVcsDiff(vcsPath()));
        document.getElementById(`fadm_vcs_update_${uid}`)?.addEventListener('click', async () => {
            const res = await CFecth.Exe(CPath.WebRootUrl() + "File/VCS", { action: "update", path: vcsPath() }, "json");
            const revLine = res.revision ? `<br><b>Revision: ${res.revision}</b>` : '';
            const msgBody = res.msg ? res.msg.replace(/\n/g, '<br>') : (res.ok ? 'Update complete' : 'Update failed');
            CAlert.Info(msgBody + revLine);
            if (res.ok)
                FolderCD(window["g_path"]);
        });
        document.getElementById(`fadm_vcs_add_${uid}`)?.addEventListener('click', () => openVcsModal('add', vcsPath()));
        document.getElementById(`fadm_vcs_revert_${uid}`)?.addEventListener('click', () => openVcsModal('revert', vcsPath()));
        document.getElementById(`fadm_vcs_commit_${uid}`)?.addEventListener('click', () => openVcsModal('commit', vcsPath()));
    }, 80);
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
                <input type="checkbox" class="form-check-input am-chk-${uid}" id="am_${uid}_${idx}" value="${i.value}" ${i.checked !== false ? 'checked' : ''}>
                ${i.badge ? `<span class="badge bg-${i.badgeClass ?? 'secondary'}" style="font-size:0.65rem;min-width:1.4rem;">${i.badge}</span>` : ''}
                ${i.icon ? `<i class="bi ${i.icon}"></i>` : ''}
                <label for="am_${uid}_${idx}" class="text-truncate mb-0 flex-fill" style="cursor:pointer;" title="${i.label}">${i.label}</label>
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
        const res = await CFecth.Exe(CPath.WebRootUrl() + "File/VCS", param, "json");
        if (res.ok)
            FolderCD(window["g_path"]);
        return { result: res.msg || (res.ok ? 'Done' : 'Failed'), refresh: res.ok };
    }, action === 'commit', async () => {
        const res = await CFecth.Exe(CPath.WebRootUrl() + "File/VCS", { action: "status", path }, "json");
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
        res = await CFecth.Exe(CPath.WebRootUrl() + "File/VCS", { action: "diff", path: filePath }, "json");
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
    }, 80);
}
window["openVcsDiff"] = openVcsDiff;
function openDeleteModal() {
    const dirList = window["g_dirList"] ?? [];
    openActionModal('Delete', 'Delete', 'btn-danger', async (names) => {
        const lines = [];
        for (const name of names) {
            const param = { data: window["g_path"] + name };
            if (RootPath)
                param.RootPath = RootPath;
            const res = await CFecth.Exe(CPath.WebRootUrl() + "File/Delete", param, "json");
            lines.push(`${res.ok ? 'OK' : 'FAIL'} ${name}`);
        }
        FolderCD(window["g_path"]);
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
            const data = window["g_path"] + folderName;
            const param = { data };
            if (RootPath)
                param.RootPath = RootPath;
            const j = await CFecth.Exe(CPath.WebRootUrl() + "File/Mkdir", param, "json");
            if (j?.ok)
                FolderCD(window["g_path"]);
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
    g_data = window["g_path"] + _file;
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
    await new Promise(r => setTimeout(r, 80));
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
        if (fl.file) {
            item.addEventListener('click', () => {
                modal.Hide();
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
            item.addEventListener('click', () => { FolderCD(dirPath + fl.name + '/'); modal.Hide(); });
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
        const startPath = window["g_path"] ?? "/";
        const serverKey = (RootPath ?? '') + '|' + (RootUrl ?? '');
        if (g_srchServerKey !== serverKey) {
            g_srchCache = new Map();
            g_srchServerKey = serverKey;
        }
        searchCancelled = false;
        btn.disabled = true;
        stopBtn.style.display = '';
        const hasCached = [...g_srchCache.keys()].some(k => k.startsWith(startPath));
        if (hasCached) {
            const n = renderFromCache(startPath, query);
            status.textContent = `(Cached: ${n}) Refreshing...`;
        }
        else {
            results.innerHTML = '';
            status.textContent = 'Scanning...';
        }
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
                const data = await CFecth.Exe("File/List", p2, "json");
                g_srchCache.set(dirPath, data.list);
                for (const fl of data.list) {
                    if (!fl.hidden && !fl.file && !isSearchExcluded(fl.name))
                        queue.push(dirPath + fl.name + '/');
                }
            }
            catch (_) { }
        }
        if (!searchCancelled) {
            const n = renderFromCache(startPath, query);
            const cap = n >= 200 ? ' (capped at 200)' : '';
            status.textContent = n === 0 ? 'No results.' : `${n} result(s)${cap}`;
        }
        else {
            status.textContent = 'Stopped.';
        }
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
    const path = window["g_path"] ?? "/";
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
    }, 80);
}
window["FileShare"] = FileShare;
CDOM.ID("uploadBtn").onchange = async (e) => {
    var fi = e.target;
    const path = window["g_root"] + window["g_path"];
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
            await CFecth.Exe("File/Upload", { data: [data], name: [name], path });
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
    for (let fl of window["g_dirList"]) {
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
    for (let fl of window["g_dirList"]) {
        if (fl.open == false) {
            CDOM.ID("fl" + fl.index).className = "list-group-item list-group-item-action list-group-item-secondary";
            fl.open = true;
            if (fl.ext == "png" || fl.ext == "jpg" || fl.ext == "jpeg" || fl.ext == "bmp") {
                CDOM.ID("ImageModalSrc").hidden = false;
                CDOM.ID("ImageModalSrc").src = window["g_down"] + window["g_path"] + fl.name;
                CDOM.ID("VideoModalSrc").hidden = true;
                CDOM.ID("FileModalSrc").hidden = true;
            }
            else if (fl.ext == "mp4" || fl.ext == "mov" || fl.ext == "avi") {
                CDOM.ID("ImageModalSrc").hidden = true;
                CDOM.ID("VideoModalSrc").src = window["g_down"] + window["g_path"] + fl.name;
                CDOM.ID("VideoModalSrc").hidden = false;
                CDOM.ID("FileModalSrc").hidden = true;
            }
            return;
        }
    }
    CAlert.Info("더 이상 없습니다.");
}
window["NextPhoto"] = NextPhoto;
let lan = CUtil.Language();
let buf = CFile.Load("../../README-" + lan + ".md").then(async () => {
    if (buf == null || lan == "en")
        lan = "";
    else
        lan = "-" + lan;
    CDOM.ID("main").innerHTML = "";
    CDOM.ID("main").append(await CUtilWeb.MDReader("../../README" + lan + ".md"));
});
