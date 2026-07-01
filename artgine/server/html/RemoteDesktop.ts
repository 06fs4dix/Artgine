// Remote Desktop client — nut-js 기반 OS 화면 캡처/입력 뷰어
// 이 페이지는 항상 로드된 origin(로컬이든 원격 서버든) 기준으로 동작한다.
// 원격 서버를 보려면 이 페이지 자체를 그 서버 주소로 iframe에 로드하면 되므로
// 별도의 ?server= 파라미터나 cross-origin 처리가 필요 없다(Home.ts 쪽에서 처리).

import { CFecth } from "../../network/CFecth.js";
import { CPath }  from "../../basic/CPath.js";
import { getAuthToken, setAuthToken, removeAuthToken } from "../CAuthToken.js";

let authToken: string = getAuthToken(CPath.WebRootUrl());
let pollTimer: number | null = null;
let pollMs = 1000;
let inputMode = false;
let screenshotQuality = 75;
let screenshotMonitor = 0;

// /RemoteDesktop/exec는 nut-js 메서드를 그대로 호출하는 패스스루라서, nut-js의 숫자 enum 값을 여기서 직접 들고 있어야 한다.
// (Button.LEFT=0, MIDDLE=1, RIGHT=2 / Key.* 값은 nut-js 소스 기준 — 값이 바뀌면 서버 KEY_MAP과 함께 갱신 필요)
const BUTTON_MAP: Record<string, number> = { left: 0, middle: 1, right: 2 };

const KEY_MAP: Record<string, number> = {
    Enter: 103, Backspace: 41, Tab: 50, Escape: 0,
    Delete: 64, Insert: 42, Home: 43, End: 65,
    PageUp: 44, PageDown: 66, CapsLock: 71,
    ArrowUp: 99, ArrowDown: 120, ArrowLeft: 119, ArrowRight: 121,
    Shift: 87, Control: 104, Alt: 108, Meta: 105,
    ' ': 116, Space: 116,
    F1: 1, F2: 2, F3: 3, F4: 4, F5: 5, F6: 6,
    F7: 7, F8: 8, F9: 9, F10: 10, F11: 11, F12: 12,
};

// Ctrl+C/Ctrl+V 조합키를 원격에 실제로 전송하기 위한 nut-js Key 코드 (Key.LeftControl=104, Key.C=90, Key.V=91).
const CTRL_KEY = 104;
const COPY_PASTE_KEY_MAP: Record<string, number> = { c: 90, v: 91 };

const loginOverlay  = document.getElementById('loginOverlay')  as HTMLDivElement;
const loginPw       = document.getElementById('loginPw')       as HTMLInputElement;
const loginBtn      = document.getElementById('loginBtn')      as HTMLButtonElement;
const loginMsg      = document.getElementById('loginMsg')      as HTMLDivElement;
const screenshot    = document.getElementById('screenshot')    as HTMLImageElement;
const controlsBar   = document.getElementById('controlsBar')   as HTMLDivElement;
const rateSlider    = document.getElementById('rateSlider')    as HTMLInputElement;
const rateLabel     = document.getElementById('rateLabel')     as HTMLSpanElement;
const inputToggle   = document.getElementById('inputToggle')   as HTMLInputElement;
const imgWrap       = document.getElementById('imgWrap')       as HTMLDivElement;
const kbBridge      = document.getElementById('kbBridge')      as HTMLTextAreaElement;
const inputModeRow  = document.getElementById('inputModeRow')  as HTMLDivElement;

function isLoginOverlayVisible(): boolean {
    return getComputedStyle(loginOverlay).display !== 'none';
}

function postRdpTabKey(e: KeyboardEvent) {
    if (isLoginOverlayVisible()) return;
    e.preventDefault();
    e.stopPropagation();
    window.parent?.postMessage({ type: 'rdp-tab-key' }, '*');
}

function initQualityControl() {
    if (!controlsBar) return;

    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-1';
    row.innerHTML = `
        <input id="qualitySlider" type="range" class="form-range" min="10" max="100" step="5" value="${screenshotQuality}" style="width:100px;">
        <span id="qualityLabel" style="font-size:0.75rem;min-width:2.4rem;">${screenshotQuality}</span>
    `;
    controlsBar.insertBefore(row, inputModeRow);

    const slider = row.querySelector<HTMLInputElement>('#qualitySlider')!;
    const label = row.querySelector<HTMLSpanElement>('#qualityLabel')!;
    slider.addEventListener('input', () => {
        const quality = Math.trunc(Number(slider.value));
        screenshotQuality = Math.max(10, Math.min(100, Number.isFinite(quality) ? quality : 75));
        label.textContent = String(screenshotQuality);
    });
}

function initMonitorControl() {
    if (!controlsBar) return;
    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-1';
    row.innerHTML = `<span style="font-size:0.75rem;">Mon</span>
        <input id="monitorInput" type="number" min="0" max="9" value="${screenshotMonitor}"
               class="form-control form-control-sm p-0 text-center" style="width:3rem;">`;
    controlsBar.insertBefore(row, inputModeRow);
    const input = row.querySelector<HTMLInputElement>('#monitorInput')!;
    input.addEventListener('change', () => {
        const v = Math.trunc(Number(input.value));
        screenshotMonitor = Number.isFinite(v) && v >= 0 ? v : 0;
        input.value = String(screenshotMonitor);
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

async function rdExec(fn: string, args: any[]) {
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
        body: JSON.stringify({ quality: screenshotQuality, monitor: screenshotMonitor, token: authToken })
    });
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

async function poll() {
    if (!canPoll()) { pollTimer = null; return; }
    try {
        const r = await rdScreenshot();
        const j = await r.json();
        if (j.ok && j.result?.type === 'base64') {
            screenshot.src = `data:image/jpeg;base64,${j.result.data}`;
        }
    } catch {}
    pollTimer = window.setTimeout(poll, pollMs);
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

function boot() {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Tab') postRdpTabKey(e);
    }, true);

    rateSlider.addEventListener('input', () => {
        pollMs = parseFloat(rateSlider.value) * 1000;
        rateLabel.textContent = `${rateSlider.value}s`;
    });

    inputToggle.addEventListener('change', () => {
        inputMode = inputToggle.checked;
        imgWrap.tabIndex = inputMode ? 0 : -1;
        if (inputMode) kbBridge.focus();
    });

    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 키보드 포커스는 imgWrap이 아니라 숨겨진 kbBridge(textarea)에 준다.
    // Ctrl+V의 네이티브 paste 이벤트는 포커스 대상이 편집 가능한 요소(textarea 등)일 때만 발생하며,
    // 이 경로는 HTTPS(secure context)가 아니어도 동작한다 (navigator.clipboard는 secure context 필요).
    kbBridge.addEventListener('keydown', async (e: KeyboardEvent) => {
        if (!inputMode) return;

        if ((e.ctrlKey || e.metaKey) && COPY_PASTE_KEY_MAP[e.key.toLowerCase()] != null) {
            e.preventDefault();
            const letterKey = COPY_PASTE_KEY_MAP[e.key.toLowerCase()];
            try {
                if (e.key.toLowerCase() === 'v') return; // paste 이벤트에서 처리
                // 실제 Ctrl+C를 원격에 전송해 포커스된 원격 앱이 자체적으로 복사하게 한다.
                await rdExec('keyboard.pressKey', [CTRL_KEY, letterKey]);
                await rdExec('keyboard.releaseKey', [CTRL_KEY, letterKey]);
                await sleep(150); // 원격 앱이 클립보드를 갱신할 시간을 준다
                const r = await rdExec('clipboard.getContent', []);
                const j = await r.json();
                const text = j.ok ? j.result : null;
                if (typeof text === 'string' && text) {
                    kbBridge.value = text;
                    kbBridge.select();
                    document.execCommand('copy');
                    kbBridge.value = '';
                }
            } catch {}
            return;
        }

        e.preventDefault();
        try {
            if (e.key.length === 1) {
                await rdExec('keyboard.type', [e.key]);
            } else {
                const key = KEY_MAP[e.key];
                if (key == null) return;
                await rdExec('keyboard.pressKey', [key]);
                await rdExec('keyboard.releaseKey', [key]);
            }
        } catch {}
    });

    kbBridge.addEventListener('paste', async (e: ClipboardEvent) => {
        if (!inputMode) return;
        e.preventDefault();
        const text = e.clipboardData?.getData('text');
        kbBridge.value = '';
        if (!text) return;
        try {
            // 로컬 클립보드 텍스트를 원격 OS 클립보드에 반영한 뒤, 실제 Ctrl+V를 보내
            // 포커스된 원격 앱이 자체적으로 붙여넣기 하게 한다(문자 단위 타이핑보다 IME/서식에 안전).
            await rdExec('clipboard.setContent', [text]);
            await rdExec('keyboard.pressKey', [CTRL_KEY, COPY_PASTE_KEY_MAP['v']]);
            await rdExec('keyboard.releaseKey', [CTRL_KEY, COPY_PASTE_KEY_MAP['v']]);
        } catch {}
    });

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
            animation:remote-ripple 0.5s ease-out forwards;
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
        try { await rdExec('mouse.releaseButton', [BUTTON_MAP[button]]); } catch {}
    }

    imgWrap.addEventListener('mousedown', async (e: MouseEvent) => {
        if (!inputMode) return;
        e.preventDefault();
        kbBridge.focus();
        const coords = toNativeCoords(e);
        if (!coords) return;
        const button = getMouseButton(e);
        if (!button) return;
        if (_activeButton) await releaseActiveMouse();
        _activeButton = button;
        _hasMoved = false;
        _lastMiddleY = e.clientY;
        try {
            await rdExec('mouse.setPosition', [{ x: coords.cx, y: coords.cy }]);
            await rdExec('mouse.pressButton', [BUTTON_MAP[button]]);
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
            await rdExec('mouse.setPosition', [{ x: coords.cx, y: coords.cy }]);
            if (_activeButton === 'middle') {
                const dy = e.clientY - _lastMiddleY;
                _lastMiddleY = e.clientY;
                if (dy !== 0) {
                    const amount = Math.abs(Math.round(dy * 3));
                    await rdExec(dy > 0 ? 'mouse.scrollDown' : 'mouse.scrollUp', [amount]);
                }
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
            if (coords) await rdExec('mouse.setPosition', [{ x: coords.cx, y: coords.cy }]);
            if (!_hasMoved && coords) showRipple(e);
            await rdExec('mouse.releaseButton', [BUTTON_MAP[button]]);
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
            await rdExec('mouse.setPosition', [{ x: coords.cx, y: coords.cy }]);
            if (e.deltaY) {
                const amount = Math.abs(Math.round(e.deltaY));
                await rdExec(e.deltaY > 0 ? 'mouse.scrollDown' : 'mouse.scrollUp', [amount]);
            }
            if (e.deltaX) {
                const amount = Math.abs(Math.round(e.deltaX));
                await rdExec(e.deltaX > 0 ? 'mouse.scrollRight' : 'mouse.scrollLeft', [amount]);
            }
        } catch {}
    });

    poll();
}

loginBtn.addEventListener('click', () => tryLogin(loginPw.value));
loginPw.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') tryLogin(loginPw.value); });

initQualityControl();
initMonitorControl();
checkAuth();
