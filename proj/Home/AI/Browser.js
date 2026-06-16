import { CFecth } from "../../../artgine/network/CFecth.js";
import { CPath } from "../../../artgine/basic/CPath.js";
const LS_TOKEN = 'artgine.token';
const params = new URLSearchParams(location.search);
const SESSION_ID = params.get('session') || '';
const READONLY = params.get('readonly') === '1';
let authToken = localStorage.getItem(LS_TOKEN) || '';
let pollTimer = null;
let pollMs = 3000;
let logOffset = 0;
let inputMode = false;
const loginOverlay = document.getElementById('loginOverlay');
const loginPw = document.getElementById('loginPw');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');
const screenshot = document.getElementById('screenshot');
const logArea = document.getElementById('logArea');
const rateSlider = document.getElementById('rateSlider');
const rateLabel = document.getElementById('rateLabel');
const ttlLabel = document.getElementById('ttlLabel');
const inputToggle = document.getElementById('inputToggle');
const imgWrap = document.getElementById('imgWrap');
const inputModeRow = document.getElementById('inputModeRow');
function showOverlay(msg = '') {
    loginOverlay.style.setProperty('display', 'flex', 'important');
    if (msg)
        loginMsg.textContent = msg;
}
function hideOverlay() {
    loginOverlay.style.setProperty('display', 'none', 'important');
}
async function tryLogin(pw) {
    loginMsg.textContent = '';
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'auth/login', { password: pw }, 'json');
        if (j.ok && j.token) {
            authToken = j.token;
            localStorage.setItem(LS_TOKEN, authToken);
            hideOverlay();
            boot();
        }
        else {
            loginMsg.textContent = j.msg || 'Login failed';
        }
    }
    catch (e) {
        loginMsg.textContent = 'Network error: ' + e.message;
    }
}
async function checkAuth() {
    if (!authToken) {
        showOverlay();
        return;
    }
    try {
        const j = await CFecth.Exe(CPath.WebRootUrl() + 'auth/check', { token: authToken }, 'json');
        if (j.authed) {
            hideOverlay();
            boot();
        }
        else {
            authToken = '';
            localStorage.removeItem(LS_TOKEN);
            showOverlay('Session expired. Please sign in again.');
        }
    }
    catch {
        showOverlay('Server unreachable');
    }
}
function bufToDataUrl(buf) {
    const bytes = new Uint8Array(buf.data);
    let bin = '';
    for (let i = 0; i < bytes.length; i++)
        bin += String.fromCharCode(bytes[i]);
    return 'data:image/png;base64,' + btoa(bin);
}
function fmtTtl(expiresAt) {
    const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (rem <= 0)
        return '−0s';
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return m > 0 ? `−${m}m${s}s` : `−${s}s`;
}
async function poll() {
    try {
        const [rScreen, rLogs] = await Promise.all([
            fetch(CPath.WebRootUrl() + 'playwright/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: SESSION_ID, fn: 'screenshot', args: [] })
            }),
            fetch(CPath.WebRootUrl() + 'playwright/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: SESSION_ID, fromOffset: logOffset })
            }),
        ]);
        const jScreen = await rScreen.json();
        if (jScreen.ok && jScreen.result?.type === 'Buffer') {
            screenshot.src = bufToDataUrl(jScreen.result);
        }
        const jLogs = await rLogs.json();
        if (jLogs.ok && jLogs.logs?.length) {
            for (const l of jLogs.logs) {
                const div = document.createElement('div');
                div.className = (l.type === 'error' || l.type === 'network') ? 'text-danger' : '';
                div.textContent = `[${l.type}] ${l.text}`;
                logArea.appendChild(div);
            }
            logArea.scrollTop = logArea.scrollHeight;
        }
        if (jLogs.ok && jLogs.nextOffset != null)
            logOffset = jLogs.nextOffset;
    }
    catch { }
    pollTimer = window.setTimeout(poll, pollMs);
}
function boot() {
    if (!SESSION_ID) {
        document.body.innerHTML = '<div class="text-center text-secondary p-5">No session specified.</div>';
        return;
    }
    if (READONLY)
        inputModeRow.style.display = 'none';
    fetch(CPath.WebRootUrl() + 'playwright/list').then(r => r.json()).then(j => {
        if (!j.ok)
            return;
        const s = j.sessions.find(x => x.sessionId === SESSION_ID);
        if (!s)
            return;
        const update = () => { ttlLabel.textContent = fmtTtl(s.expiresAt); };
        update();
        setInterval(update, 1000);
    }).catch(() => { });
    rateSlider.addEventListener('input', () => {
        pollMs = parseFloat(rateSlider.value) * 1000;
        rateLabel.textContent = `${rateSlider.value}s`;
    });
    inputToggle.addEventListener('change', () => {
        inputMode = inputToggle.checked;
        imgWrap.tabIndex = inputMode ? 0 : -1;
        if (inputMode)
            imgWrap.focus();
    });
    imgWrap.addEventListener('keydown', async (e) => {
        if (!inputMode)
            return;
        e.preventDefault();
        const fn = e.key.length === 1 ? 'keyboard.type' : 'keyboard.press';
        try {
            await fetch(CPath.WebRootUrl() + 'playwright/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: SESSION_ID, fn, args: [e.key] })
            });
        }
        catch { }
    });
    screenshot.addEventListener('dragstart', e => e.preventDefault());
    function toNativeCoords(e) {
        const rect = screenshot.getBoundingClientRect();
        const natW = screenshot.naturalWidth;
        const natH = screenshot.naturalHeight;
        if (!natW || !natH)
            return null;
        const scale = Math.min(rect.width / natW, rect.height / natH);
        const dispW = natW * scale;
        const dispH = natH * scale;
        const ox = (rect.width - dispW) / 2;
        const oy = (rect.height - dispH) / 2;
        const cx = Math.round((e.clientX - rect.left - ox) / scale);
        const cy = Math.round((e.clientY - rect.top - oy) / scale);
        if (cx < 0 || cy < 0 || cx > natW || cy > natH)
            return null;
        return { cx, cy };
    }
    async function pwExec(fn, args) {
        await fetch(CPath.WebRootUrl() + 'playwright/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: SESSION_ID, fn, args })
        });
    }
    function showRipple(e) {
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
    let _isDragging = false;
    let _hasMoved = false;
    let _lastMoveTime = 0;
    const MOVE_THROTTLE_MS = 30;
    imgWrap.addEventListener('mousedown', async (e) => {
        if (!inputMode)
            return;
        imgWrap.focus();
        const coords = toNativeCoords(e);
        if (!coords)
            return;
        _isDragging = true;
        _hasMoved = false;
        try {
            await pwExec('mouse.move', [coords.cx, coords.cy]);
            await pwExec('mouse.down', []);
        }
        catch { }
    });
    imgWrap.addEventListener('mousemove', async (e) => {
        if (!inputMode || !_isDragging)
            return;
        const now = Date.now();
        if (now - _lastMoveTime < MOVE_THROTTLE_MS)
            return;
        _lastMoveTime = now;
        const coords = toNativeCoords(e);
        if (!coords)
            return;
        _hasMoved = true;
        try {
            await pwExec('mouse.move', [coords.cx, coords.cy]);
        }
        catch { }
    });
    imgWrap.addEventListener('mouseup', async (e) => {
        if (!inputMode || !_isDragging)
            return;
        _isDragging = false;
        const coords = toNativeCoords(e);
        if (!coords)
            return;
        if (!_hasMoved)
            showRipple(e);
        try {
            await pwExec('mouse.move', [coords.cx, coords.cy]);
            await pwExec('mouse.up', []);
        }
        catch { }
    });
    imgWrap.addEventListener('mouseleave', async () => {
        if (!inputMode || !_isDragging)
            return;
        _isDragging = false;
        try {
            await pwExec('mouse.up', []);
        }
        catch { }
    });
    poll();
}
loginBtn.addEventListener('click', () => tryLogin(loginPw.value));
loginPw.addEventListener('keydown', (e) => { if (e.key === 'Enter')
    tryLogin(loginPw.value); });
checkAuth();
