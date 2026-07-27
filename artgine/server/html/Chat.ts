// AI Chat client
// Talks to CAIChatRouter (/AIChat/*, /AIChat/ws)


// 'cmd'는 CLI 프로바이더가 아니라 셸 실행 의사 프로바이더다(서버의 CAIChatRouter Provider 타입과 동일한 정의).
type Provider = 'claude' /* | 'gemini' */ | 'codex' | 'antigravity' | 'opencode' | 'grok' | 'cmd';
interface IAttachment { name: string; path: string; }
interface IMessage {
    role: 'user' | 'assistant';
    content: string;
    provider?: Provider;
    model?: string;
    attachments?: IAttachment[];
    timestamp: number;
    senderIp?: string;
    senderUa?: string;
}
interface ISessionMeta {
    sessionId: string;
    title: string;
    provider: Provider;
    model: string;
    cliSessionId?: string;
    createdAt: number;
    updatedAt: number;
}
interface IHistory { meta: ISessionMeta; messages: IMessage[]; }

// populated from GET /AIInfo/setting (ai/settings.json을 그대로 받아 models 필드만 사용)
// cmd는 셸 실행 의사 프로바이더라 모델 개념이 없다 — 항상 빈 목록이고 모델 셀렉트는 비활성화된다.
let MODELS: Record<Provider, { value: string; label: string }[]> = { claude: [], /* gemini: [], */ codex: [], antigravity: [], opencode: [], grok: [], cmd: [] };
const LS_LAST_SID = 'ai.lastSessionId';
const LS_PROVIDER = 'ai.provider';
const LS_MODEL    = 'ai.model';
// LS_SIDEBAR removed (sidebar moved to Home.ts)

import { CFecth } from "../../network/CFecth.js";
import { CPath } from "../../basic/CPath.js";
import { CHash } from "../../basic/CHash.js";
import { getAuthToken, setAuthToken, removeAuthToken } from "../CAuthToken.js";
import { CLan } from "../../basic/CLan.js";
import { CIframeMsg } from "./CIframeMsg.js";
import { CStorage } from "../../system/CStorage.js";
import { marked } from "../../external/esnext/md/marked.esm.js";

marked.setOptions({ gfm: true, breaks: true });

// ---- 다국어(CLan) ----
// 기본 텍스트는 영문(HTML innerHTML)이고 한국어만 추가 등록한다.
// 미등록 언어/키는 원문(영문)으로 폴백되므로 안전하다.
CLan.Set(CLan.eType.ko, "chat.caution", "⚠ 주의");
CLan.Set(CLan.eType.ko, "chat.cautionMsg", "채팅 모드는 모든 권한으로 시작됩니다. AI는 실수할 수 있으니 명확한 규칙을 정하세요.");
CLan.Set(CLan.eType.ko, "chat.cautionAuth", "프로바이더 인증이 안 되어 있으면 작동하지 않을 수 있습니다.");
function applyChatLan(root: ParentNode = document): void {
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
applyChatLan();

// ---- auth ----
let authToken: string = getAuthToken(CPath.WebRootUrl());
function isStandaloneChat(): boolean {
    return window.parent === window;
}
function authedFetch(input: string, init?: RequestInit): Promise<Response> {
    // 세션 쿠키로 인증되므로 토큰을 별도로 첨부하지 않는다.
    return fetch(input, init);
}
function clearAuth() {
    authToken = '';
    removeAuthToken(CPath.WebRootUrl());
    showLoginOverlay('Session expired. Please sign in again.');
}
function showLoginOverlay(msg: string = '') {
    hideLoginOverlay();
    showComposerLogin(msg);
}
function hideLoginOverlay() {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) { overlay.classList.add('d-none'); overlay.style.setProperty('display', 'none', 'important'); }
}

// ---- DOM ----
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
// sessionList and newChatBtn removed (moved to Home.ts)
const elProviderSel  = $<HTMLSelectElement>('providerSel');
const elModelSel     = $<HTMLSelectElement>('modelSel');
let sessionMcp = true;
let sessionWorkingDir: string | null = null;
let sessionMdcopy = false;
let sessionWrite = true;
const elStatus       = $<HTMLSpanElement>('status');
const elMessages     = $<HTMLDivElement>('messages');
const elComposer     = $<HTMLDivElement>('composer');
const elAttachPrev   = $<HTMLDivElement>('attachPreview');
const elInput        = $<HTMLTextAreaElement>('input');
const elSendBtn      = $<HTMLButtonElement>('sendBtn');
const elFileBtn      = $<HTMLButtonElement>('fileBtn');
const elFileInput    = $<HTMLInputElement>('fileInput');
const elEmpty        = $<HTMLDivElement>('emptyState');
const elInitWarning  = $<HTMLDivElement>('initWarning');
// sidebar/sidebarToggle removed (moved to Home.ts)
const elComposerRow  = elInput.closest('.d-flex') as HTMLDivElement | null;
let elComposerLogin: HTMLDivElement | null = null;

function showComposerLogin(msg: string = '') {
    elAttachPrev.classList.add('d-none');
    elComposerRow?.classList.add('d-none');
    if (!elComposerLogin) {
        elComposerLogin = document.createElement('div');
        elComposerLogin.id = 'composerLogin';
        elComposerLogin.innerHTML = `
            <div class="d-flex gap-2 align-items-center">
                <input id="composerLoginPw" type="password" class="form-control flex-grow-1" style="min-width:0;" placeholder="Password" autocomplete="current-password">
                <button id="composerLoginBtn" class="btn btn-primary flex-shrink-0 text-nowrap">Sign in</button>
            </div>
            <div id="composerLoginMsg" class="small text-danger mt-1" style="min-height: 1.2em;"></div>
        `;
        elComposer.appendChild(elComposerLogin);
        const pwEl = document.getElementById('composerLoginPw') as HTMLInputElement;
        const btnEl = document.getElementById('composerLoginBtn') as HTMLButtonElement;
        btnEl.addEventListener('click', () => tryLogin(pwEl.value));
        pwEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') tryLogin(pwEl.value);
        });
    }
    const msgEl = document.getElementById('composerLoginMsg');
    const pwEl = document.getElementById('composerLoginPw') as HTMLInputElement | null;
    if (msgEl) msgEl.textContent = msg;
    if (pwEl) {
        pwEl.value = '';
        setTimeout(() => pwEl.focus(), 50);
    }
}

function hideComposerLogin() {
    elAttachPrev.classList.remove('d-none');
    elComposerRow?.classList.remove('d-none');
    elComposerLogin?.classList.add('d-none');
}

function redirectToAuthedChat() {
    const url = new URL(location.href);
    if (!url.searchParams.get('session')) url.searchParams.set('session', uuid());
    url.searchParams.delete('share');
    location.replace(url.toString());
}

// ---- state ----
let currentSid: string | null = null;
let currentHistory: IHistory | null = null;
let pendingAttachments: IAttachment[] = [];
let ws: WebSocket | null = null;
let streamingEl: HTMLDivElement | null = null;
let isSending = false;
let pendingChangedFiles: IAttachment[] = [];
const MAX_USER_META_LEN = 70;

// URL params: ?session=<id> to load specific session.
const _urlParams: URLSearchParams | null = (() => {
    try { return new URL(location.href).searchParams; } catch { return null; }
})();
const paramSid: string | null = _urlParams?.get('session') ?? null;
// 공유 링크(?share=1): /AIChat/share 의 공개(무인증) 히스토리만 읽기, 전송 불가(읽기전용).
let isShareMode: boolean = _urlParams?.get('share') === '1';

function shortUA(ua: string): string {
    // pick OS + main engine in a compact form
    let os = '';
    if (/Windows NT 10/.test(ua)) os = 'Win10';
    else if (/Windows NT 11/.test(ua)) os = 'Win11';
    else if (/Windows/.test(ua)) os = 'Windows';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iOS/.test(ua)) os = 'iOS';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    let br = '';
    if (/Edg\//.test(ua)) br = 'Edge';
    else if (/Chrome\//.test(ua)) br = 'Chrome';
    else if (/Firefox\//.test(ua)) br = 'Firefox';
    else if (/Safari\//.test(ua)) br = 'Safari';
    return [os, br].filter(Boolean).join(' ');
}
function buildUserMeta(m: IMessage): string {
    const parts: string[] = [];
    if (m.senderIp) parts.push(m.senderIp);
    if (m.senderUa) {
        const ua = shortUA(m.senderUa);
        if (ua) parts.push(ua);
    }
    let s = parts.join(' · ');
    if (s.length > MAX_USER_META_LEN) s = s.slice(0, MAX_USER_META_LEN - 1) + '…';
    return s;
}
function formatRelative(ts?: number): string {
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
function formatTime(ts?: number): string {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ---- utils ----
function uuid(): string {
    if (crypto && 'randomUUID' in crypto) return (crypto as any).randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}
function renderMarkdown(s: string): string {
    // AI 응답에 섞인 raw HTML이 그대로 실행되지 않도록 먼저 escape한 뒤 marked로 파싱한다.
    return marked.parse(escapeHtml(s), { xhtml: false }) as string;
}
function isImagePath(p: string): boolean {
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(p);
}
function attachmentUrl(sid: string, relPath: string, bust?: number): string {
    const t = bust ?? Date.now();
    // share 모드는 무인증 공개 엔드포인트를 써야 한다(workspace는 로그인 필요).
    const ep = isShareMode ? 'AIChat/share/file' : 'AIChat/workspace';
    // 같은 출처 요청이라 세션 쿠키가 자동 전송된다(토큰 불필요).
    return `${CPath.WebRootUrl()}${ep}?id=${encodeURIComponent(sid)}&path=${relPath}&t=${t}`;
}

// ---- provider/model dropdowns ----
async function fetchProviders(): Promise<boolean> {
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'AIInfo/setting');
        if (r.status === 401) { clearAuth(); return false; }
        const setting = await r.json();
        const models = setting.models || {};
        for (const id of ['claude', /* 'gemini', */ 'codex', 'antigravity', 'opencode', 'grok'] as Provider[]) {
            MODELS[id] = models[id] || [];
        }
        return true;
    } catch { return false; }
}
function rebuildProviderOptions() {
    elProviderSel.innerHTML = '';
    const _providerLabels: Record<Provider, string> = {
        claude: 'Claude', /* gemini: 'Gemini', */ codex: 'Codex', antigravity: 'Antigravity', opencode: 'OpenCode', grok: 'Grok', cmd: 'CMD (shell)',
    };
    for (const id of ['claude', /* 'gemini', */ 'codex', 'antigravity', 'opencode', 'grok', 'cmd'] as Provider[]) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = _providerLabels[id];
        elProviderSel.appendChild(o);
    }
}
function rebuildModelOptions() {
    const provider = elProviderSel.value as Provider;
    elModelSel.innerHTML = '';
    // cmd는 모델이 없다 — 셀렉트를 비워 비활성화하고, 빈 값이 그대로 서버로 간다(라우터가 무시).
    elModelSel.disabled = (provider === 'cmd');
    if (provider === 'cmd') return;
    for (const m of MODELS[provider]) {
        const o = document.createElement('option');
        o.value = m.value; o.textContent = m.label;
        elModelSel.appendChild(o);
    }
    const list = MODELS[provider];
    const savedModel = CStorage.Get(LS_MODEL) as string | null;
    if (savedModel && list.some(m => m.value === savedModel)) {
        elModelSel.value = savedModel;
    } else if (list.length > 0) {
        // default = cheapest/last entry instead of the first (most expensive) one
        elModelSel.value = list[list.length - 1].value;
    }
}
elProviderSel.addEventListener('change', () => {
    CStorage.Set(LS_PROVIDER, elProviderSel.value);
    rebuildModelOptions();
    // cmd는 모델이 빈 값이라 그대로 저장하면 직전에 쓰던 모델 기억이 지워진다 — 저장하지 않는다.
    if (elProviderSel.value !== 'cmd') CStorage.Set(LS_MODEL, elModelSel.value);
});
elModelSel.addEventListener('change', () => {
    CStorage.Set(LS_MODEL, elModelSel.value);
});

// ---- history (REST) ----
async function fetchHistory(sid: string): Promise<void> {
    try {
        const r = await authedFetch(`${CPath.WebRootUrl()}AIChat/session?id=${encodeURIComponent(sid)}`);
        if (r.status === 401) { clearAuth(); return; }
        if (!r.ok) { currentHistory = null; renderMessages(); return; }
        const j = await r.json();
        currentHistory = (j.ok && j.history) ? j.history as IHistory : null;
    } catch {
        currentHistory = null;
    }
    renderMessages();
}

// ---- session list ----
async function refreshSessions() {
    // session list is now managed by Home.ts — notify parent if in iframe
    if (window.parent !== window) {
        CIframeMsg.Send(window.parent, 'ai-sessions-changed');
    }
}


// ---- messages ----
function renderMessages() {
    elMessages.innerHTML = '';
    if (!currentHistory || currentHistory.messages.length === 0) {
        elMessages.appendChild(elEmpty);
        elEmpty.style.display = '';
        elInitWarning.style.display = '';
        return;
    }
    elEmpty.style.display = 'none';
    elInitWarning.style.display = 'none';
    for (const m of currentHistory.messages) appendMessage(m);
    elMessages.scrollTop = elMessages.scrollHeight;
}

function appendChangedFilesTo(container: HTMLElement, files: IAttachment[], sid: string) {
    const wrap = document.createElement('div');
    wrap.className = 'mt-2';
    let html = '<div class="text-secondary small mb-1"><i class="bi bi-pencil-square me-1"></i>변경/생성된 파일</div>';
    html += '<div class="d-flex flex-wrap gap-2">';
    for (const a of files) {
        const url = attachmentUrl(sid, a.path);
        html += isImagePath(a.path)
            ? `<a href="${url}" target="_blank"><img src="${url}" alt="${escapeHtml(a.name)}" class="attachment-img rounded border"></a>`
            : `<a href="${url}" target="_blank" class="badge text-bg-secondary text-decoration-none"><i class="bi bi-file-earmark"></i> ${escapeHtml(a.name)}</a>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
    container.appendChild(wrap);
    elMessages.scrollTop = elMessages.scrollHeight;
}

function appendMessage(m: IMessage): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'mx-auto mb-3';
    div.style.maxWidth = '900px';
    const ts = formatTime(m.timestamp);
    let role: string;
    if (m.role === 'user') {
        const meta = buildUserMeta(m);
        role = meta || 'User';
    } else {
        role = m.model || 'Assistant';
    }
    if (ts) role += ` · ${ts}`;
    const bubbleCls = m.role === 'user'
        ? 'msg-bubble p-3 rounded border-start border-4 border-primary bg-primary-subtle'
        : 'msg-bubble p-3 rounded border-start border-4 border-secondary bg-body-tertiary';
    let attachHtml = '';
    if (m.attachments?.length && currentSid) {
        attachHtml = '<div class="d-flex flex-wrap gap-2 mt-2">';
        for (const a of m.attachments) {
            const url = attachmentUrl(currentSid, a.path);
            attachHtml += isImagePath(a.path)
                ? `<img src="${url}" alt="${escapeHtml(a.name)}" class="attachment-img rounded" onclick="window.open(this.src)">`
                : `<span class="badge text-bg-secondary"><i class="bi bi-file-earmark"></i> ${escapeHtml(a.name)}</span>`;
        }
        attachHtml += '</div>';
    }
    div.innerHTML = `
        <div class="text-secondary small text-uppercase mb-1" style="letter-spacing: .5px;">${role}</div>
        <div class="${bubbleCls}">${renderMarkdown(m.content)}</div>
        ${attachHtml}
    `;
    elMessages.appendChild(div);
    return div;
}

// ---- attachments ----
elFileBtn.addEventListener('click', () => elFileInput.click());
elFileInput.addEventListener('change', async () => {
    if (!elFileInput.files) return;
    for (const f of Array.from(elFileInput.files)) await uploadFile(f);
    elFileInput.value = '';
});

async function uploadFile(f: File) {
    try {
        const r = await authedFetch(`${CPath.WebRootUrl()}AIChat/session/upload?id=${currentSid}&name=${encodeURIComponent(f.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: f,
        });
        if (r.status === 401) { clearAuth(); return; }
        const j = await r.json();
        if (j.ok) {
            pendingAttachments.push(j.attachment);
            renderAttachPreview();
        } else {
            alert('Upload failed: ' + (j.msg || 'unknown'));
        }
    } catch (e: any) {
        alert('Upload error: ' + e.message);
    }
}

function renderAttachPreview() {
    elAttachPrev.innerHTML = '';
    pendingAttachments.forEach((a, i) => {
        const span = document.createElement('span');
        span.className = 'badge text-bg-secondary d-flex align-items-center gap-1';
        span.innerHTML = `<i class="bi bi-paperclip"></i><span>${escapeHtml(a.name)}</span>
            <button class="btn-close btn-close-white ms-1" style="font-size:.6rem;" aria-label="Remove"></button>`;
        span.querySelector('button')!.addEventListener('click', () => {
            pendingAttachments.splice(i, 1);
            renderAttachPreview();
        });
        elAttachPrev.appendChild(span);
    });
}

// ---- send ----
elInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send();
    }
});
elInput.addEventListener('input', () => {
    elInput.style.height = '0';
    elInput.style.height = Math.min(elInput.scrollHeight, 200) + 'px';
});
elSendBtn.addEventListener('click', send);

function send() {
    if (isSending) return;
    const text = elInput.value.trim();
    if (!text && pendingAttachments.length === 0) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const sendMsg: any = {
        type: 'send',
        provider: elProviderSel.value,
        model: elModelSel.value,
        content: text,
        attachments: pendingAttachments.slice(),
        title: text.slice(0, 30) || 'New chat',
        ua: navigator.userAgent,
        mcp: sessionMcp,
        write: sessionWrite,
    };
    if (sessionWorkingDir) sendMsg.workingDir = sessionWorkingDir;
    if (sessionMdcopy) sendMsg.mdcopy = true;
    ws.send(JSON.stringify(sendMsg));
    isSending = true;
    elSendBtn.disabled = true;
    elInput.value = '';
    elInput.style.height = '0';
    pendingAttachments = [];
    renderAttachPreview();
    // DOM은 서버 echo(type:'message', 'start', 'chunk', 'done')로만 업데이트
}

// ---- WebSocket ----
function setStatus(text: string, cls: string) {
    elStatus.textContent = text;
    elStatus.className = `badge ${cls}`;
}

function handleWsMessage(ev: MessageEvent) {
    let msg: any;
    try { msg = JSON.parse(ev.data); } catch { return; }

    if (msg.type === 'message') {
        // 서버가 broadcast한 유저 메시지
        const m = msg.message as IMessage;
        if (currentHistory) currentHistory.messages.push(m);
        elEmpty.style.display = 'none';
        elInitWarning.style.display = 'none';
        appendMessage(m);
        elMessages.scrollTop = elMessages.scrollHeight;
    } else if (msg.type === 'start') {
        // AI 응답 시작 — 스트리밍 placeholder 생성 (이 시점에 세션이 디스크에 저장됨)
        elInitWarning.style.display = 'none';
        refreshSessions();
        const placeholder: IMessage = { role: 'assistant', content: '', timestamp: Date.now(), provider: elProviderSel.value as Provider, model: elModelSel.value };
        streamingEl = appendMessage(placeholder);
        streamingEl.querySelector('.msg-bubble')?.classList.add('msg-streaming');
        elMessages.scrollTop = elMessages.scrollHeight;
    } else if (msg.type === 'chunk') {
        if (streamingEl) {
            const bubble = streamingEl.querySelector('.msg-bubble') as HTMLDivElement;
            const cur = (bubble.dataset.raw || '') + msg.text;
            bubble.dataset.raw = cur;
            bubble.innerHTML = renderMarkdown(cur);
            elMessages.scrollTop = elMessages.scrollHeight;
        }
    } else if (msg.type === 'files') {
        pendingChangedFiles = Array.isArray(msg.changed) ? msg.changed : [];
    } else if (msg.type === 'done') {
        if (streamingEl) {
            const bubble = streamingEl.querySelector('.msg-bubble') as HTMLDivElement;
            const finalText = (bubble.dataset.raw || '').trim();
            if (finalText === '' && !msg.errored) {
                streamingEl.remove();
            } else {
                bubble.innerHTML = renderMarkdown(finalText);
                bubble.classList.remove('msg-streaming');
                const header = streamingEl.querySelector('.text-secondary.small') as HTMLDivElement | null;
                if (header && !/\d{2}:\d{2}:\d{2}/.test(header.textContent || '')) {
                    header.textContent = `${header.textContent} · ${formatTime(Date.now())}`;
                }
                if (pendingChangedFiles.length && currentSid) {
                    appendChangedFilesTo(streamingEl, pendingChangedFiles, currentSid);
                }
                if (currentHistory) {
                    currentHistory.messages.push({
                        role: 'assistant', content: finalText,
                        provider: elProviderSel.value as Provider,
                        model: elModelSel.value,
                        attachments: pendingChangedFiles.length ? pendingChangedFiles.slice() : undefined,
                        timestamp: Date.now(),
                    });
                }
            }
            streamingEl = null;
        }
        pendingChangedFiles = [];
        if (msg.code !== 0 && msg.stderr) console.warn('[stderr]', msg.stderr);
        isSending = false;
        elSendBtn.disabled = false;
        refreshSessions();
    } else if (msg.type === 'busy') {
        isSending = false;
        elSendBtn.disabled = false;
        const el = document.createElement('div');
        el.className = 'text-center text-warning small py-1';
        el.textContent = '다른 메시지 처리 중입니다. 잠시 후 다시 시도해주세요.';
        elMessages.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    } else if (msg.type === 'error') {
        if (streamingEl) {
            const bubble = streamingEl.querySelector('.msg-bubble') as HTMLDivElement;
            if (bubble) {
                bubble.className = 'msg-bubble p-2 px-3 rounded border border-danger bg-danger-subtle text-danger-emphasis';
                bubble.textContent = `[오류] ${msg.msg}`;
                bubble.classList.remove('msg-streaming');
            }
            streamingEl = null;
        } else {
            const el = document.createElement('div');
            el.className = 'mx-auto mb-3';
            el.style.maxWidth = '900px';
            el.innerHTML = `<div class="msg-bubble p-2 px-3 rounded border border-danger bg-danger-subtle text-danger-emphasis"></div>`;
            (el.querySelector('.msg-bubble') as HTMLElement).textContent = `[오류] ${msg.msg}`;
            elMessages.appendChild(el);
            elMessages.scrollTop = elMessages.scrollHeight;
        }
        isSending = false;
        elSendBtn.disabled = false;
    }
}

function connectWs() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    if (ws) { ws.close(); ws = null; }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // 인증은 WS 핸드셰이크에 자동 전송되는 세션 쿠키로 처리된다(토큰 불필요).
    ws = new WebSocket(`${CPath.WebRootUrl().replace(/^http/, 'ws')}AIChat/ws`);
    ws.addEventListener('open', () => {
        setStatus('connected', 'text-bg-success');
        ws!.send(JSON.stringify({ type: 'join', sessionId: currentSid }));
    });
    ws.addEventListener('close', () => {
        setStatus('disconnected', 'text-bg-secondary');
        ws = null;
        isSending = false;
        elSendBtn.disabled = false;
    });
    ws.addEventListener('error', () => setStatus('error', 'text-bg-danger'));
    ws.addEventListener('message', handleWsMessage);
}

// ---- login handler ----
async function tryLogin(pw: string) {
    const msgEl = document.getElementById('composerLoginMsg') || document.getElementById('loginMsg');
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "auth/login", { password: CHash.SHA256('artgine_' + pw) }, "json") as any;
        if (j.ok && j.token) {
            authToken = j.token;
            setAuthToken(CPath.WebRootUrl(), authToken);
            hideLoginOverlay();
            hideComposerLogin();
            if (isShareMode) {
                isShareMode = false;
                document.body.classList.remove('share-mode');
            }
            if (isStandaloneChat()) {
                redirectToAuthedChat();
            } else {
                bootChat();
            }
        } else {
            if (msgEl) msgEl.textContent = j.msg || 'Login failed';
        }
    } catch (e: any) {
        if (msgEl) msgEl.textContent = 'Network error: ' + e.message;
    }
}
function installLoginHandlers() {
    const btn = document.getElementById('loginBtn');
    const pw = document.getElementById('loginPw') as HTMLInputElement | null;
    btn?.addEventListener('click', () => { if (pw) tryLogin(pw.value); });
    pw?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryLogin(pw.value);
    });
}

// ---- init ----
async function bootChat() {
    // 부모(Home.ts)가 항상 ?session=<uuid>로 전달. 없으면 직접 접근으로 간주해 생성.
    currentSid = paramSid || uuid();
    localStorage.setItem(LS_LAST_SID, currentSid);

    // URL 파라미터에서 config 읽기 (Home이 iframe src에 포함해서 전달)
    const paramMcp = _urlParams?.get('mcp');
    if (paramMcp !== null && paramMcp !== undefined) sessionMcp = paramMcp !== '0';
    sessionWorkingDir = _urlParams?.get('workingDir') ?? null;
    sessionMdcopy = _urlParams?.get('mdcopy') === '1';
    const paramWrite = _urlParams?.get('write');
    if (paramWrite !== null && paramWrite !== undefined) sessionWrite = paramWrite !== '0';

    await fetchProviders();
    rebuildProviderOptions();

    const savedProvider = CStorage.Get(LS_PROVIDER) as Provider | null;
    if (savedProvider && MODELS[savedProvider]) elProviderSel.value = savedProvider;
    rebuildModelOptions();

    await fetchHistory(currentSid); // REST로 history 로드
    connectWs(); // WS 연결 (채팅 스트리밍용)
}

// ---- share mode (read-only, no auth) ----
async function initShareMode() {
    document.body.classList.add('share-mode');
    currentSid = paramSid;
    if (!currentSid) { showComposerLogin('Invalid share link'); return; }
    try {
        const r = await fetch(`${CPath.WebRootUrl()}AIChat/share?id=${encodeURIComponent(currentSid)}`);
        const j = await r.json();
        currentHistory = (j.ok && j.history) ? j.history as IHistory : null;
    } catch {
        currentHistory = null;
    }
    renderMessages();
    // 입력란 자리에 패스워드 입력만 노출 (로그인하면 일반 채팅으로 전환됨)
    showComposerLogin();
}

async function init() {
    installLoginHandlers();
    if (isShareMode) {
        await initShareMode();
        return;
    }
    if (!authToken) {
        showLoginOverlay();
        return;
    }
    // verify cached token; if invalid, ask again
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + "auth/check", { token: authToken }, "json") as any;
        if (j.authed) {
            hideLoginOverlay();
            hideComposerLogin();
            bootChat();
        } else {
            authToken = '';
            removeAuthToken(CPath.WebRootUrl());
            showLoginOverlay();
        }
    } catch {
        showLoginOverlay('Server unreachable');
    }
}
// 모바일 키보드 대응: visual viewport 크기가 바뀔 때 body 높이를 실시간 맞춤
// dvh를 지원하지 않는 구형 기기(Android WebView 등)용 폴백
if (window.visualViewport) {
    const onVpResize = () => {
        requestAnimationFrame(() => {
            document.body.style.height = window.visualViewport!.height + 'px';
            elMessages.scrollTop = elMessages.scrollHeight;
        });
    };
    window.visualViewport.addEventListener('resize', onVpResize);
    window.visualViewport.addEventListener('scroll', onVpResize);
}
elInput.addEventListener('focus', () => {
    [150, 350, 600].forEach(ms => {
        setTimeout(() => elComposer.scrollIntoView({ behavior: 'smooth', block: 'end' }), ms);
    });
});

init();
