// Browser Session client — Playwright screenshot viewer
// URL params: ?session=<sessionId>  [&readonly=1]

import { CPath }  from "../../basic/CPath.js";
import { CHash }  from "../../basic/CHash.js";
import { getAuthToken, setAuthToken, authLogin, checkAuthed, getPageAuthToken, withAuthToken } from "../CAuthToken.js";
import { CIframeMsg } from "./CIframeMsg.js";

const params     = new URLSearchParams(location.search);
const SESSION_ID = params.get('session') || '';
const READONLY   = params.get('readonly') === '1';

// 로컬(same-origin)이면 '' 이라 세션 쿠키로 인증되고, 원격이면 Control이 URL에 실어 보낸 ?authToken= 이 들어온다.
let authToken  = getPageAuthToken(CPath.WebRootUrl());

// PlayWright/* 요청 URL. 로컬은 same-origin 세션 쿠키로 인증되지만 원격(cross-origin)은 그 쿠키가
// 서드파티로 차단되므로 서버가 받아주는 ?authToken= 을 붙인다(CPlaywrightRouter.isAuthedOrToken).
// 토큰이 ''이면 URL이 그대로라 로컬 동작은 바뀌지 않는다.
function pwUrl(apiPath: string): string {
    return withAuthToken(CPath.WebRootUrl() + apiPath, authToken);
}
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
const kbBridge      = document.getElementById('kbBridge')      as HTMLTextAreaElement;
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
            const listRes = await fetch(pwUrl('PlayWright/list'));
            const listJson = await listRes.json();
            const session = (listJson.sessions as IBrowserSessionInfo[] | undefined)?.find(s => s.sessionId === SESSION_ID);
            if (!listJson.ok || !session) throw new Error('Session not found');

            const resetRes = await fetch(pwUrl('PlayWright/reset'), {
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
            if (window.parent) CIframeMsg.Send(window.parent, 'browser-sessions-changed');
            setTimeout(() => { btn.textContent = 'Reset'; }, 1000);
        } catch {
            btn.textContent = 'Failed';
            setTimeout(() => { btn.textContent = 'Reset'; }, 1500);
        } finally {
            btn.disabled = false;
        }
    });
}

function appendLog(text: string, cls = '') {
    const div = document.createElement('div');
    div.className = cls;
    div.textContent = text;
    logArea.appendChild(div);
    logArea.scrollTop = logArea.scrollHeight;
}

function appendLink(prefix: string, url: string, cls = '') {
    const div = document.createElement('div');
    div.className = cls;
    div.append(prefix);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = url;
    div.appendChild(a);
    logArea.appendChild(div);
    logArea.scrollTop = logArea.scrollHeight;
}

// localhost/사설 IP로 열려 있으면 외부에서 닿지 않으므로 공인 IP로 치환한다. 공인 IP를 못 얻으면 원래 주소를 그대로 쓴다.
let publicIp = '';
async function toExternalUrl(url: string): Promise<string> {
    const u = new URL(url);
    const h = u.hostname;
    const unreachable = h === 'localhost' || h === '[::1]' || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
    if (!unreachable) return u.href;
    try {
        if (!publicIp) publicIp = (await (await fetch('https://api.ipify.org?format=text')).text()).trim();
    } catch { return u.href; }
    if (!publicIp) return u.href;
    u.hostname = publicIp;
    return u.href;
}

function initCaptureControl() {
    if (!controlsBar) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-outline-secondary py-0 px-2';
    btn.textContent = 'Capture';
    controlsBar.appendChild(btn);

    btn.addEventListener('click', async () => {
        const src = screenshot.src;
        const b64 = src.startsWith('data:') ? src.replace(/^data:[^,]*base64,/, '') : '';
        if (!b64) { appendLog('[capture] no image', 'text-danger'); return; }

        const d = new Date();
        const p = (n: number) => String(n).padStart(2, '0');
        const base = `capture_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
        const name = `${base}.jpg`;
        const jsonName = `${base}.json`;

        btn.disabled = true;
        try {
            let logs: unknown[] = [];
            let url = '';
            try {
                const [rLogs, rList] = await Promise.all([
                    fetch(pwUrl('PlayWright/logs'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId: SESSION_ID, fromOffset: 0 })
                    }),
                    fetch(pwUrl('PlayWright/list')),
                ]);
                const jLogs = await rLogs.json();
                if (!jLogs.ok) throw new Error(jLogs.msg || 'logs failed');
                logs = jLogs.logs ?? [];
                const jList = await rList.json();
                url = (jList.sessions as IBrowserSessionInfo[] | undefined)?.find(s => s.sessionId === SESSION_ID)?.currentUrl ?? '';
            } catch (e: any) {
                appendLog(`[capture] console info failed: ${e.message}`, 'text-danger');
            }

            const info = JSON.stringify({ time: d.toISOString(), sessionId: SESSION_ID, url, image: name, logs }, null, 2);
            const bytes = new TextEncoder().encode(info);
            let bin = '';
            for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));

            const res = await fetch(CPath.WebRootUrl() + 'File/Upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: 'temp/', name: [name, jsonName], data: [b64, btoa(bin)], token: authToken })
            });
            const j = await res.json();
            if (!j.ok) throw new Error(j.msg || 'Upload failed');
            appendLog(`[capture] saved temp/${name}, temp/${jsonName} (logs ${logs.length})`, 'text-info');
            appendLink('[capture] image: ', await toExternalUrl(CPath.WebRootUrl() + 'temp/' + name), 'text-info');
            appendLink('[capture] json:  ', await toExternalUrl(CPath.WebRootUrl() + 'temp/' + jsonName), 'text-info');
        } catch (e: any) {
            appendLog(`[capture] failed: ${e.message}`, 'text-danger');
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
        const j = await authLogin(CPath.WebRootUrl(), CHash.SHA256('artgine_' + pw),
            () => { loginMsg.textContent = 'Waiting for messenger approval (up to 5 minutes)...'; });
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
    const hadToken = !!authToken;
    // authToken은 원격이면 URL(?authToken=)에서, 로컬이면 localStorage에서 온다(getPageAuthToken).
    const valid = await checkAuthed(CPath.WebRootUrl(), authToken);
    if (valid) {
        // 로컬에서 쿠키만으로 통과한 경우 저장된 토큰을 집어온다. 원격이면 URL로 받은 토큰을 덮어쓰지 않는다
        // (이 origin의 localStorage는 비어 있어서 덮으면 토큰을 잃는다).
        if (!authToken) authToken = getAuthToken(CPath.WebRootUrl());
        hideOverlay();
        boot();
    } else {
        authToken = '';
        showOverlay(hadToken ? 'Session expired. Please sign in again.' : '');
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
CIframeMsg.Recv({
    'frame-visibility': (data) => {
        frameHidden = !data.visible;
        resumePollIfNeeded();
    },
});

async function poll() {
    if (!canPoll()) { pollTimer = null; return; }
    try {
        const screenReq = fetch(pwUrl('PlayWright/screenshot'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: SESSION_ID,
                args: [{ type: 'jpeg', quality: screenshotQuality }]
            })
        });
        const logsReq = consoleVisible ? fetch(pwUrl('PlayWright/logs'), {
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

    const heldKeys = new Map<string, string>();
    let keyChain: Promise<void> = Promise.resolve();

    rateSlider.addEventListener('input', () => {
        pollMs = parseFloat(rateSlider.value) * 1000;
        rateLabel.textContent = `${rateSlider.value}s`;
    });

    inputToggle.addEventListener('change', () => {
        inputMode = inputToggle.checked;
        imgWrap.tabIndex = inputMode ? 0 : -1;
        if (inputMode) kbBridge.focus();
    });

    // 키보드 포커스는 imgWrap이 아니라 숨겨진 kbBridge(textarea)에 준다.
    // Ctrl+V의 네이티브 paste 이벤트는 포커스 대상이 편집 가능한 요소(textarea 등)일 때만 발생하며,
    // 이 경로는 HTTPS(secure context)가 아니어도 동작한다 (navigator.clipboard.readText는 secure context 필요).
    kbBridge.addEventListener('keydown', async (e: KeyboardEvent) => {
        if (!inputMode) return;

        // Android 등 모바일 IME는 조합 중인 키를 keydown에서 실제 문자로 알려주지 않고
        // e.key === 'Unidentified'(keyCode 229)로 보낸다. 여기서 막지 않고 네이티브 입력을
        // 그대로 진행시켜, 아래 input/compositionend 핸들러에서 실제 문자를 캡처한다.
        if (e.isComposing || e.key === 'Unidentified' || e.keyCode === 229) return;

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            try {
                const text = await pwEval('window.getSelection().toString()');
                if (typeof text === 'string' && text) {
                    kbBridge.value = text;
                    kbBridge.select();
                    document.execCommand('copy');
                    kbBridge.value = '';
                }
            } catch {}
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            // preventDefault하지 않는다: 브라우저가 kbBridge에 네이티브 'paste' 이벤트를 발생시키도록 둔다.
            return;
        }

        e.preventDefault();

        // keyboard.down 은 US 레이아웃에 없는 문자를 Unknown key로 거부하므로 type으로 보낸다.
        if (e.key.length === 1 && e.key.charCodeAt(0) > 0x7e) {
            queueKey(() => pwExec('keyboard.type', [e.key]));
            return;
        }
        // type/press는 원격에서 keydown/keyup을 즉시 연달아 발생시켜, 매 프레임 키 상태를 읽는
        // 엔진(CWindow의 mKeyPress)에서는 눌림이 관측되지 않는다. 그래서 down/up을 분리해 전달한다.
        // keyup 시점의 e.key는 Shift 해제 등으로 달라질 수 있어 e.code 기준으로 눌렀던 key를 기억한다.
        const key = e.key;
        heldKeys.set(e.code, key);
        queueKey(() => pwExec('keyboard.down', [key]));
    });

    kbBridge.addEventListener('keyup', (e: KeyboardEvent) => {
        const key = heldKeys.get(e.code);
        if (key == null) return;
        heldKeys.delete(e.code);
        e.preventDefault();
        queueKey(() => pwExec('keyboard.up', [key]));
    });

    kbBridge.addEventListener('blur', releaseAllKeys);
    inputToggle.addEventListener('change', () => { if (!inputToggle.checked) releaseAllKeys(); });

    kbBridge.addEventListener('paste', (e: ClipboardEvent) => {
        if (!inputMode) return;
        e.preventDefault();
        const text = e.clipboardData?.getData('text');
        kbBridge.value = '';
        if (text) queueKey(() => pwExec('keyboard.type', [text]));
    });

    // 모바일 IME(Android 등)는 문자 입력을 keydown이 아니라 input/composition 이벤트로만 알려준다.
    // keydown 쪽에서 preventDefault하지 않고 흘려보낸 조합 입력을 여기서 캡처해 가상 브라우저로 전달한다.
    kbBridge.addEventListener('input', (e: Event) => {
        if (!inputMode) return;
        const ie = e as InputEvent;
        if (ie.isComposing) return;
        const inputType = ie.inputType;
        kbBridge.value = '';
        if (inputType === 'deleteContentBackward') { queueKey(() => pwExec('keyboard.press', ['Backspace'])); return; }
        if (inputType === 'deleteContentForward')  { queueKey(() => pwExec('keyboard.press', ['Delete'])); return; }
        if (inputType === 'insertLineBreak')        { queueKey(() => pwExec('keyboard.press', ['Enter'])); return; }
        const data = ie.data;
        if (data) queueKey(() => pwExec('keyboard.type', [data]));
    });

    kbBridge.addEventListener('compositionend', (e: CompositionEvent) => {
        kbBridge.value = '';
        if (!inputMode) return;
        const data = e.data;
        if (data) queueKey(() => pwExec('keyboard.type', [data]));
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
        await fetch(pwUrl('PlayWright/exec'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: SESSION_ID, fn, args })
        });
    }

    // 키 요청을 직렬화한다. fetch를 병렬로 보내면 up이 down보다 먼저 도착해 원격 키가 눌린 채로 남을 수 있다.
    function queueKey(task: () => Promise<void>) {
        keyChain = keyChain.then(task).catch(() => {});
    }

    function releaseAllKeys() {
        const keys = [...heldKeys.values()];
        heldKeys.clear();
        for (const key of keys) queueKey(() => pwExec('keyboard.up', [key]));
    }

    async function pwEval(expr: string): Promise<any> {
        const r = await fetch(pwUrl('PlayWright/eval'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: SESSION_ID, expr })
        });
        const j = await r.json();
        return j.ok ? j.result : null;
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
initCaptureControl();
checkAuth();
