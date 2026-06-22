// Browser Session client — Playwright screenshot viewer
// URL params: ?session=<sessionId>  [&readonly=1]

import { CFecth } from "../../network/CFecth.js";
import { CPath }  from "../../basic/CPath.js";
import { getAuthToken, setAuthToken, removeAuthToken } from "../CAuthToken.js";

const params     = new URLSearchParams(location.search);
const SESSION_ID = params.get('session') || '';
const READONLY   = params.get('readonly') === '1';

let authToken  = getAuthToken(CPath.WebRootUrl());
let pollTimer: number | null = null;
let pollMs     = 3000;
let logOffset  = 0;
let inputMode  = false;
let screenshotQuality = 75;
let consoleVisible = true;

const loginOverlay  = document.getElementById('loginOverlay')  as HTMLDivElement;
const loginPw       = document.getElementById('loginPw')       as HTMLInputElement;
const loginBtn      = document.getElementById('loginBtn')      as HTMLButtonElement;
const loginMsg      = document.getElementById('loginMsg')      as HTMLDivElement;
const screenshot    = document.getElementById('screenshot')    as HTMLImageElement;
const logArea       = document.getElementById('logArea')       as HTMLDivElement;
const controlsBar   = document.getElementById('controlsBar')   as HTMLDivElement;
const rateSlider    = document.getElementById('rateSlider')    as HTMLInputElement;
const rateLabel     = document.getElementById('rateLabel')     as HTMLSpanElement;
const inputToggle   = document.getElementById('inputToggle')   as HTMLInputElement;
const imgWrap       = document.getElementById('imgWrap')       as HTMLDivElement;
const inputModeRow  = document.getElementById('inputModeRow')  as HTMLDivElement;

interface IBrowserSessionInfo {
    sessionId: string;
    currentUrl: string;
    browserName?: string;
    ttl?: number;
    logSize?: number;
    width?: number;
    height?: number;
}

function initResetControl() {
    if (!controlsBar) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-outline-secondary py-0 px-2';
    btn.textContent = 'Reset';
    controlsBar.appendChild(btn);

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
            const listRes = await fetch(CPath.WebRootUrl() + 'PlayWright/list');
            const listJson = await listRes.json();
            const session = (listJson.sessions as IBrowserSessionInfo[] | undefined)?.find(s => s.sessionId === SESSION_ID);
            if (!listJson.ok || !session) throw new Error('Session not found');

            const resetRes = await fetch(CPath.WebRootUrl() + 'PlayWright/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: SESSION_ID,
                    browser: session.browserName || '',
                    url: session.currentUrl,
                    ttl: session.ttl || 300,
                    logSize: session.logSize || 100,
                    width: session.width || 1280,
                    height: session.height || 720,
                })
            });
            const resetJson = await resetRes.json();
            if (!resetJson.ok) throw new Error(resetJson.msg || 'Reset failed');

            btn.textContent = 'Reset OK';
            window.parent?.postMessage({ type: 'browser-sessions-changed' }, '*');
            setTimeout(() => { btn.textContent = 'Reset'; }, 1000);
        } catch {
            btn.textContent = 'Failed';
            setTimeout(() => { btn.textContent = 'Reset'; }, 1500);
        } finally {
            btn.disabled = false;
        }
    });
}

function initQualityControl() {
    if (!controlsBar) return;

    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-1';
    row.innerHTML = `
        <input id="qualitySlider" type="range" class="form-range" min="0" max="100" step="1" value="${screenshotQuality}" style="width:100px;">
        <span id="qualityLabel" style="font-size:0.75rem;min-width:2.4rem;">${screenshotQuality}</span>
    `;
    controlsBar.insertBefore(row, inputModeRow);

    const slider = row.querySelector<HTMLInputElement>('#qualitySlider')!;
    const label = row.querySelector<HTMLSpanElement>('#qualityLabel')!;
    slider.addEventListener('input', () => {
        const quality = Math.trunc(Number(slider.value));
        screenshotQuality = Math.max(0, Math.min(100, Number.isFinite(quality) ? quality : 75));
        label.textContent = String(screenshotQuality);
    });
}

function initConsoleControl() {
    if (!controlsBar) return;

    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-1';
    row.innerHTML = `
        <span>console</span>
        <input id="consoleToggle" type="checkbox" class="form-check-input ms-1" checked>
    `;
    controlsBar.insertBefore(row, inputModeRow.nextSibling);

    const toggle = row.querySelector<HTMLInputElement>('#consoleToggle')!;
    toggle.addEventListener('change', () => {
        consoleVisible = toggle.checked;
        logArea.style.display = consoleVisible ? '' : 'none';
    });
}

function showOverlay(msg = '') {
    loginOverlay.style.setProperty('display', 'flex', 'important');
    if (msg) loginMsg.textContent = msg;
}

function hideOverlay() {
    loginOverlay.style.setProperty('display', 'none', 'important');
}

async function tryLogin(pw: string) {
    loginMsg.textContent = '';
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'auth/login', { password: pw }, 'json') as any;
        if (j.ok && j.token) {
            authToken = j.token;
            setAuthToken(CPath.WebRootUrl(), authToken);
            hideOverlay();
            boot();
        } else {
            loginMsg.textContent = j.msg || 'Login failed';
        }
    } catch (e: any) {
        loginMsg.textContent = 'Network error: ' + e.message;
    }
}

async function checkAuth() {
    if (!authToken) {
        showOverlay();
        return;
    }
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'auth/check', { token: authToken }, 'json') as any;
        if (j.authed) {
            hideOverlay();
            boot();
        } else {
            authToken = '';
            removeAuthToken(CPath.WebRootUrl());
            showOverlay('Session expired. Please sign in again.');
        }
    } catch {
        showOverlay('Server unreachable');
    }
}

// 탭이 안 보이면 폴링을 멈춘다. pageHidden은 브라우저 탭 자체 전환(Page Visibility API),
// frameHidden은 Home.ts의 iframe show/hide(부모가 postMessage로 알려줌) — display:none은
// iframe 내부 document의 visibilitychange를 발생시키지 않으므로 별도로 받아야 한다.
let pageHidden = false;
let frameHidden = false;
function canPoll(): boolean { return !pageHidden && !frameHidden; }
function resumePollIfNeeded() {
    if (canPoll() && pollTimer === null) poll();
}

document.addEventListener('visibilitychange', () => {
    pageHidden = document.hidden;
    resumePollIfNeeded();
});
window.addEventListener('message', (e: MessageEvent) => {
    if (e.data?.type !== 'frame-visibility') return;
    frameHidden = !e.data.visible;
    resumePollIfNeeded();
});

async function poll() {
    if (!canPoll()) { pollTimer = null; return; }
    try {
        const screenReq = fetch(CPath.WebRootUrl() + 'PlayWright/screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: SESSION_ID,
                args: [{ type: 'jpeg', quality: screenshotQuality }]
            })
        });
        const logsReq = consoleVisible ? fetch(CPath.WebRootUrl() + 'PlayWright/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: SESSION_ID, fromOffset: logOffset })
        }) : null;
        const [rScreen, rLogs] = await Promise.all([
            screenReq,
            logsReq,
        ]);
        const jScreen = await rScreen.json();
        if (jScreen.ok && jScreen.result?.type === 'base64') {
            screenshot.src = `data:image/jpeg;base64,${jScreen.result.data}`;
        }
        if (rLogs) {
            const jLogs = await rLogs.json();
            if (jLogs.ok && jLogs.logs?.length) {
                for (const l of jLogs.logs as { type: string; text: string }[]) {
                    const div = document.createElement('div');
                    div.className = (l.type === 'error' || l.type === 'network') ? 'text-danger' : '';
                    div.textContent = `[${l.type}] ${l.text}`;
                    logArea.appendChild(div);
                }
                logArea.scrollTop = logArea.scrollHeight;
            }
            if (jLogs.ok && jLogs.nextOffset != null) logOffset = jLogs.nextOffset;
        }
    } catch {}
    pollTimer = window.setTimeout(poll, pollMs);
}

function boot() {
    if (!SESSION_ID) {
        document.body.innerHTML = '<div class="text-center text-secondary p-5">No session specified.</div>';
        return;
    }

    if (READONLY) inputModeRow.style.display = 'none';

    rateSlider.addEventListener('input', () => {
        pollMs = parseFloat(rateSlider.value) * 1000;
        rateLabel.textContent = `${rateSlider.value}s`;
    });

    inputToggle.addEventListener('change', () => {
        inputMode = inputToggle.checked;
        imgWrap.tabIndex = inputMode ? 0 : -1;
        if (inputMode) imgWrap.focus();
    });

    imgWrap.addEventListener('keydown', async (e: KeyboardEvent) => {
        if (!inputMode) return;
        e.preventDefault();
        const fn = e.key.length === 1 ? 'keyboard.type' : 'keyboard.press';
        try {
            await fetch(CPath.WebRootUrl() + 'PlayWright/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: SESSION_ID, fn, args: [e.key] })
            });
        } catch {}
    });

    // 인풋 모드 여부 관계없이 img 네이티브 드래그 금지
    screenshot.addEventListener('dragstart', e => e.preventDefault());

    function toNativeCoords(e: MouseEvent): { cx: number; cy: number } | null {
        const rect = screenshot.getBoundingClientRect();
        const natW = screenshot.naturalWidth;
        const natH = screenshot.naturalHeight;
        if (!natW || !natH) return null;
        const scale = Math.min(rect.width / natW, rect.height / natH);
        const dispW = natW * scale;
        const dispH = natH * scale;
        const ox = (rect.width  - dispW) / 2;
        const oy = (rect.height - dispH) / 2;
        const cx = Math.round((e.clientX - rect.left - ox) / scale);
        const cy = Math.round((e.clientY - rect.top  - oy) / scale);
        if (cx < 0 || cy < 0 || cx > natW || cy > natH) return null;
        return { cx, cy };
    }

    async function pwExec(fn: string, args: any[]) {
        await fetch(CPath.WebRootUrl() + 'PlayWright/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: SESSION_ID, fn, args })
        });
    }

    function getMouseButton(e: MouseEvent): 'left' | 'right' | 'middle' | null {
        if (e.button === 0) return 'left';
        if (e.button === 1) return 'middle';
        if (e.button === 2) return 'right';
        return null;
    }

    function showRipple(e: MouseEvent) {
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
    }

    let _activeButton: 'left' | 'right' | 'middle' | null = null;
    let _hasMoved = false;
    let _lastMoveTime = 0;
    let _lastMiddleY = 0;
    const MOVE_THROTTLE_MS = 30;

    async function releaseActiveMouse() {
        const button = _activeButton;
        _activeButton = null;
        if (!button) return;
        try { await pwExec('mouse.up', [{ button }]); } catch {}
    }

    imgWrap.addEventListener('mousedown', async (e: MouseEvent) => {
        if (!inputMode) return;
        e.preventDefault();
        imgWrap.focus();
        const coords = toNativeCoords(e);
        if (!coords) return;
        const button = getMouseButton(e);
        if (!button) return;
        if (_activeButton) await releaseActiveMouse();
        _activeButton = button;
        _hasMoved = false;
        _lastMiddleY = e.clientY;
        try {
            await pwExec('mouse.move', [coords.cx, coords.cy]);
            await pwExec('mouse.down', [{ button }]);
        } catch {}
    });

    imgWrap.addEventListener('mousemove', async (e: MouseEvent) => {
        if (!inputMode || !_activeButton) return;
        e.preventDefault();
        const now = Date.now();
        if (now - _lastMoveTime < MOVE_THROTTLE_MS) return;
        _lastMoveTime = now;
        const coords = toNativeCoords(e);
        if (!coords) return;
        _hasMoved = true;
        try {
            await pwExec('mouse.move', [coords.cx, coords.cy]);
            if (_activeButton === 'middle') {
                const dy = e.clientY - _lastMiddleY;
                _lastMiddleY = e.clientY;
                if (dy !== 0) await pwExec('mouse.wheel', [0, dy * 3]);
            }
        } catch {}
    });

    imgWrap.addEventListener('mouseup', async (e: MouseEvent) => {
        if (!inputMode || !_activeButton) return;
        e.preventDefault();
        const button = _activeButton;
        _activeButton = null;
        const coords = toNativeCoords(e);
        try {
            if (coords) await pwExec('mouse.move', [coords.cx, coords.cy]);
            if (!_hasMoved && coords) showRipple(e);
            await pwExec('mouse.up', [{ button }]);
        } catch {}
    });

    imgWrap.addEventListener('mouseleave', async () => {
        if (!inputMode || !_activeButton) return;
        await releaseActiveMouse();
    });

    window.addEventListener('mouseup', async () => {
        if (!inputMode || !_activeButton) return;
        await releaseActiveMouse();
    });

    imgWrap.addEventListener('contextmenu', (e: MouseEvent) => {
        if (!inputMode) return;
        e.preventDefault();
    });

    imgWrap.addEventListener('wheel', async (e: WheelEvent) => {
        if (!inputMode) return;
        const coords = toNativeCoords(e);
        if (!coords) return;
        e.preventDefault();
        try {
            await pwExec('mouse.move', [coords.cx, coords.cy]);
            await pwExec('mouse.wheel', [e.deltaX, e.deltaY]);
        } catch {}
    });

    poll();
}

loginBtn.addEventListener('click', () => tryLogin(loginPw.value));
loginPw.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') tryLogin(loginPw.value); });

initQualityControl();
initConsoleControl();
initResetControl();
checkAuth();
