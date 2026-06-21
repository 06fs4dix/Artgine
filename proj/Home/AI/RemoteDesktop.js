import { CFecth } from "../../../artgine/network/CFecth.js";
import { CPath } from "../../../artgine/basic/CPath.js";
import { getAuthToken, setAuthToken, removeAuthToken } from "../../../artgine/server/CAuthToken.js";
let authToken = getAuthToken(CPath.WebRootUrl());
let pollTimer = null;
let pollMs = 500;
let inputMode = false;
let screenshotQuality = 75;
const BUTTON_MAP = { left: 0, middle: 1, right: 2 };
const KEY_MAP = {
    Enter: 103, Backspace: 41, Tab: 50, Escape: 0,
    Delete: 64, Insert: 42, Home: 43, End: 65,
    PageUp: 44, PageDown: 66, CapsLock: 71,
    ArrowUp: 99, ArrowDown: 120, ArrowLeft: 119, ArrowRight: 121,
    Shift: 87, Control: 104, Alt: 108, Meta: 105,
    ' ': 116, Space: 116,
    F1: 1, F2: 2, F3: 3, F4: 4, F5: 5, F6: 6,
    F7: 7, F8: 8, F9: 9, F10: 10, F11: 11, F12: 12,
};
const loginOverlay = document.getElementById('loginOverlay');
const loginPw = document.getElementById('loginPw');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');
const screenshot = document.getElementById('screenshot');
const controlsBar = document.getElementById('controlsBar');
const rateSlider = document.getElementById('rateSlider');
const rateLabel = document.getElementById('rateLabel');
const inputToggle = document.getElementById('inputToggle');
const imgWrap = document.getElementById('imgWrap');
const inputModeRow = document.getElementById('inputModeRow');
function isLoginOverlayVisible() {
    return getComputedStyle(loginOverlay).display !== 'none';
}
function postRdpTabKey(e) {
    if (isLoginOverlayVisible())
        return;
    e.preventDefault();
    e.stopPropagation();
    window.parent?.postMessage({ type: 'rdp-tab-key' }, '*');
}
function initQualityControl() {
    if (!controlsBar)
        return;
    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-1';
    row.innerHTML = `
        <input id="qualitySlider" type="range" class="form-range" min="10" max="100" step="5" value="${screenshotQuality}" style="width:100px;">
        <span id="qualityLabel" style="font-size:0.75rem;min-width:2.4rem;">${screenshotQuality}</span>
    `;
    controlsBar.insertBefore(row, inputModeRow);
    const slider = row.querySelector('#qualitySlider');
    const label = row.querySelector('#qualityLabel');
    slider.addEventListener('input', () => {
        const quality = Math.trunc(Number(slider.value));
        screenshotQuality = Math.max(10, Math.min(100, Number.isFinite(quality) ? quality : 75));
        label.textContent = String(screenshotQuality);
    });
}
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
            setAuthToken(CPath.WebRootUrl(), authToken);
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
            removeAuthToken(CPath.WebRootUrl());
            showOverlay('Session expired. Please sign in again.');
        }
    }
    catch {
        showOverlay('Server unreachable');
    }
}
async function rdExec(fn, args) {
    return fetch(CPath.WebRootUrl() + 'RemoteDesktop/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn, args, token: authToken })
    });
}
async function rdScreenshot() {
    return fetch(CPath.WebRootUrl() + 'RemoteDesktop/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality: screenshotQuality, token: authToken })
    });
}
let pageHidden = false;
let frameHidden = false;
function canPoll() { return !pageHidden && !frameHidden; }
function resumePollIfNeeded() {
    if (canPoll() && pollTimer === null)
        poll();
}
async function poll() {
    if (!canPoll()) {
        pollTimer = null;
        return;
    }
    try {
        const r = await rdScreenshot();
        const j = await r.json();
        if (j.ok && j.result?.type === 'base64') {
            screenshot.src = `data:image/jpeg;base64,${j.result.data}`;
        }
    }
    catch { }
    pollTimer = window.setTimeout(poll, pollMs);
}
document.addEventListener('visibilitychange', () => {
    pageHidden = document.hidden;
    resumePollIfNeeded();
});
window.addEventListener('message', (e) => {
    if (e.data?.type !== 'frame-visibility')
        return;
    frameHidden = !e.data.visible;
    resumePollIfNeeded();
});
function boot() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab')
            postRdpTabKey(e);
    }, true);
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
        try {
            if (e.key.length === 1) {
                await rdExec('keyboard.type', [e.key]);
            }
            else {
                const key = KEY_MAP[e.key];
                if (key == null)
                    return;
                await rdExec('keyboard.pressKey', [key]);
                await rdExec('keyboard.releaseKey', [key]);
            }
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
    function getMouseButton(e) {
        if (e.button === 0)
            return 'left';
        if (e.button === 1)
            return 'middle';
        if (e.button === 2)
            return 'right';
        return null;
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
            animation:remote-ripple 0.5s ease-out forwards;
        `;
        imgWrap.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    }
    let _activeButton = null;
    let _hasMoved = false;
    let _lastMoveTime = 0;
    let _lastMiddleY = 0;
    const MOVE_THROTTLE_MS = 30;
    async function releaseActiveMouse() {
        const button = _activeButton;
        _activeButton = null;
        if (!button)
            return;
        try {
            await rdExec('mouse.releaseButton', [BUTTON_MAP[button]]);
        }
        catch { }
    }
    imgWrap.addEventListener('mousedown', async (e) => {
        if (!inputMode)
            return;
        e.preventDefault();
        imgWrap.focus();
        const coords = toNativeCoords(e);
        if (!coords)
            return;
        const button = getMouseButton(e);
        if (!button)
            return;
        if (_activeButton)
            await releaseActiveMouse();
        _activeButton = button;
        _hasMoved = false;
        _lastMiddleY = e.clientY;
        try {
            await rdExec('mouse.setPosition', [{ x: coords.cx, y: coords.cy }]);
            await rdExec('mouse.pressButton', [BUTTON_MAP[button]]);
        }
        catch { }
    });
    imgWrap.addEventListener('mousemove', async (e) => {
        if (!inputMode || !_activeButton)
            return;
        e.preventDefault();
        const now = Date.now();
        if (now - _lastMoveTime < MOVE_THROTTLE_MS)
            return;
        _lastMoveTime = now;
        const coords = toNativeCoords(e);
        if (!coords)
            return;
        _hasMoved = true;
        try {
            await rdExec('mouse.setPosition', [{ x: coords.cx, y: coords.cy }]);
            if (_activeButton === 'middle') {
                const dy = e.clientY - _lastMiddleY;
                _lastMiddleY = e.clientY;
                if (dy !== 0) {
                    const amount = Math.abs(Math.round(dy * 3));
                    await rdExec(dy > 0 ? 'mouse.scrollDown' : 'mouse.scrollUp', [amount]);
                }
            }
        }
        catch { }
    });
    imgWrap.addEventListener('mouseup', async (e) => {
        if (!inputMode || !_activeButton)
            return;
        e.preventDefault();
        const button = _activeButton;
        _activeButton = null;
        const coords = toNativeCoords(e);
        try {
            if (coords)
                await rdExec('mouse.setPosition', [{ x: coords.cx, y: coords.cy }]);
            if (!_hasMoved && coords)
                showRipple(e);
            await rdExec('mouse.releaseButton', [BUTTON_MAP[button]]);
        }
        catch { }
    });
    imgWrap.addEventListener('mouseleave', async () => {
        if (!inputMode || !_activeButton)
            return;
        await releaseActiveMouse();
    });
    window.addEventListener('mouseup', async () => {
        if (!inputMode || !_activeButton)
            return;
        await releaseActiveMouse();
    });
    imgWrap.addEventListener('contextmenu', (e) => {
        if (!inputMode)
            return;
        e.preventDefault();
    });
    imgWrap.addEventListener('wheel', async (e) => {
        if (!inputMode)
            return;
        const coords = toNativeCoords(e);
        if (!coords)
            return;
        e.preventDefault();
        try {
            await rdExec('mouse.setPosition', [{ x: coords.cx, y: coords.cy }]);
            if (e.deltaY) {
                const amount = Math.abs(Math.round(e.deltaY));
                await rdExec(e.deltaY > 0 ? 'mouse.scrollDown' : 'mouse.scrollUp', [amount]);
            }
            if (e.deltaX) {
                const amount = Math.abs(Math.round(e.deltaX));
                await rdExec(e.deltaX > 0 ? 'mouse.scrollRight' : 'mouse.scrollLeft', [amount]);
            }
        }
        catch { }
    });
    poll();
}
loginBtn.addEventListener('click', () => tryLogin(loginPw.value));
loginPw.addEventListener('keydown', (e) => { if (e.key === 'Enter')
    tryLogin(loginPw.value); });
initQualityControl();
checkAuth();
