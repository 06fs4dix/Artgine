import { CWASM as __cwasmDecode__ } from "../basic/CWASM.js";
import { mouse, keyboard, screen, clipboard, Button, Key, getWindows } from '@nut-tree-fork/nut-js';
import { Region } from '@nut-tree-fork/shared';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as nodePath from 'path';
import * as JimpNS from 'jimp';
import { CJSON } from '../basic/CJSON.js';
import { isAuthedReq, isValidToken } from '../server/CAuthServer.js';
import { CRemoteDesktopRouter } from '../server/CRemoteDesktopRouter.js';
import { CStorage } from '../system/CStorage.js';
import { CWASM } from '../basic/CWASM.js';
CWASM.IsSIMD();
const _exec = promisify(exec);
const execAsync = (cmd, opts) => _exec(cmd, { maxBuffer: 64 * 1024 * 1024, ...opts });
function isLinuxWayland() {
    return process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland';
}
const LINUX_WAYLAND_HINT = 'nut-js (libnut-linux) is X11-only and cannot capture/control the screen under a Wayland session. ' +
    'Run "sudo apt install ubuntu-session xserver-xorg" to install an Xorg session, then log back in choosing the Xorg session at the GDM login screen.';
async function getMonitorBounds(monitor) {
    if (process.platform !== 'win32')
        throw new Error('Multi-monitor capture is only supported on Windows');
    const { stdout } = await execAsync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; ` +
        `$s=[System.Windows.Forms.Screen]::AllScreens; ` +
        `if(${monitor} -ge $s.Count){throw 'Monitor ${monitor} not found'}; ` +
        `$b=$s[${monitor}].Bounds; ` +
        `$b.X.ToString()+','+$b.Y.ToString()+','+$b.Width.ToString()+','+$b.Height.ToString()"`);
    const parts = stdout.trim().split(',').map(Number);
    if (parts.length !== 4 || parts.some(v => !Number.isFinite(v)))
        throw new Error(`Monitor ${monitor} not found`);
    return new Region(parts[0], parts[1], parts[2], parts[3]);
}
const Jimp = JimpNS.default ?? JimpNS;
const clampQuality = (q) => Math.max(1, Math.min(100, Math.trunc(q)));
function parseClip(v) {
    if (!v || typeof v !== 'object')
        return null;
    const c = { x: Math.trunc(Number(v.x) || 0), y: Math.trunc(Number(v.y) || 0), width: Math.trunc(Number(v.width)), height: Math.trunc(Number(v.height)) };
    return c.width > 0 && c.height > 0 ? c : null;
}
async function encodeJimp(jimpImage, format, quality) {
    if (format === 'png')
        return jimpImage.getBufferAsync(Jimp.MIME_PNG);
    jimpImage.quality(clampQuality(quality));
    return jimpImage.getBufferAsync(Jimp.MIME_JPEG);
}
async function toImageBuffer(img, format, quality = 75) {
    const jimpImage = new Jimp({ data: Buffer.from(img.data), width: img.width, height: img.height });
    jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, function (_x, _y, idx) {
        const r = this.bitmap.data[idx];
        this.bitmap.data[idx] = this.bitmap.data[idx + 2];
        this.bitmap.data[idx + 2] = r;
        this.bitmap.data[idx + 3] = 255;
    });
    return encodeJimp(jimpImage, format, quality);
}
async function cropEncoded(buf, clip, format, quality) {
    const jimpImage = await Jimp.read(buf);
    jimpImage.crop(clip.x, clip.y, clip.width, clip.height);
    return encodeJimp(jimpImage, format, quality);
}
const KEY_MAP = {
    Enter: Key.Enter, Backspace: Key.Backspace, Tab: Key.Tab, Escape: Key.Escape,
    Delete: Key.Delete, Insert: Key.Insert, Home: Key.Home, End: Key.End,
    PageUp: Key.PageUp, PageDown: Key.PageDown, CapsLock: Key.CapsLock,
    ArrowUp: Key.Up, ArrowDown: Key.Down, ArrowLeft: Key.Left, ArrowRight: Key.Right,
    Shift: Key.LeftShift, Control: Key.LeftControl, Alt: Key.LeftAlt, Meta: Key.LeftSuper,
    ' ': Key.Space, Space: Key.Space,
    F1: Key.F1, F2: Key.F2, F3: Key.F3, F4: Key.F4, F5: Key.F5, F6: Key.F6,
    F7: Key.F7, F8: Key.F8, F9: Key.F9, F10: Key.F10, F11: Key.F11, F12: Key.F12,
};
function resolveKey(key) {
    if (KEY_MAP[key] != null)
        return KEY_MAP[key];
    if (key.length === 1) {
        const upper = key.toUpperCase();
        if (/^[A-Z]$/.test(upper))
            return Key[upper] ?? null;
        if (/^[0-9]$/.test(upper))
            return Key['Num' + upper] ?? null;
    }
    return null;
}
function getMouseButton(key) {
    if (key === 'left')
        return Button.LEFT;
    if (key === 'right')
        return Button.RIGHT;
    if (key === 'middle')
        return Button.MIDDLE;
    return null;
}
const SCREENCAST_TOKEN_PATH = nodePath.resolve(process.cwd(), '.artgine_screencast_restore_token');
async function loadRestoreToken() {
    try {
        const fs = await import('fs/promises');
        return (await fs.readFile(SCREENCAST_TOKEN_PATH, 'utf8')).trim() || null;
    }
    catch {
        return null;
    }
}
async function saveRestoreToken(token) {
    try {
        const fs = await import('fs/promises');
        await fs.writeFile(SCREENCAST_TOKEN_PATH, token, 'utf8');
    }
    catch { }
}
function portalToken() {
    return 'artgine' + Math.random().toString(16).slice(2);
}
const REQUEST_XML = '<node><interface name="org.freedesktop.portal.Request">' +
    '<method name="Close"/>' +
    '<signal name="Response"><arg type="u" name="response"/><arg type="a{sv}" name="results"/></signal>' +
    '</interface></node>';
function unwrapVariant(v) {
    return v && typeof v === 'object' && 'value' in v ? v.value : v;
}
async function portalRequest(bus, call) {
    const handleToken = portalToken();
    const senderToken = String(bus.name).replace(/^:/, '').replace(/\./g, '_');
    const predictedPath = `/org/freedesktop/portal/desktop/request/${senderToken}/${handleToken}`;
    const reqObj = await bus.getProxyObject('org.freedesktop.portal.Desktop', predictedPath, REQUEST_XML);
    const reqIface = reqObj.getInterface('org.freedesktop.portal.Request');
    const responsePromise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Portal request timed out (no response — waiting for user to approve "Share Screen"?)')), 60000);
        reqIface.once('Response', (code, results) => {
            clearTimeout(timer);
            if (code !== 0)
                reject(new Error(`Portal request denied/cancelled (code ${code})`));
            else
                resolve(results);
        });
    });
    const actualPath = await call(handleToken);
    if (actualPath !== predictedPath) {
        throw new Error(`Portal request path mismatch: predicted ${predictedPath}, got ${actualPath}`);
    }
    return responsePromise;
}
async function captureDBusPortal(format, quality) {
    const { sessionBus, Variant } = await import('dbus-next');
    const bus = sessionBus();
    let sessionHandle = null;
    try {
        const desktop = await bus.getProxyObject('org.freedesktop.portal.Desktop', '/org/freedesktop/portal/desktop');
        const screenCast = desktop.getInterface('org.freedesktop.portal.ScreenCast');
        const sessionResult = await portalRequest(bus, (handleToken) => screenCast.CreateSession({
            session_handle_token: new Variant('s', portalToken()),
            handle_token: new Variant('s', handleToken),
        }));
        sessionHandle = unwrapVariant(sessionResult.session_handle);
        if (!sessionHandle)
            throw new Error('ScreenCast CreateSession returned no session_handle');
        const savedToken = await loadRestoreToken();
        await portalRequest(bus, (handleToken) => {
            const selectOptions = {
                handle_token: new Variant('s', handleToken),
                types: new Variant('u', 1),
                multiple: new Variant('b', false),
                persist_mode: new Variant('u', 2),
            };
            if (savedToken)
                selectOptions.restore_token = new Variant('s', savedToken);
            return screenCast.SelectSources(sessionHandle, selectOptions);
        });
        const startResult = await portalRequest(bus, (handleToken) => screenCast.Start(sessionHandle, '', {
            handle_token: new Variant('s', handleToken),
        }));
        const newToken = unwrapVariant(startResult.restore_token);
        if (newToken)
            await saveRestoreToken(newToken);
        const streams = unwrapVariant(startResult.streams);
        if (!Array.isArray(streams) || streams.length === 0)
            throw new Error('ScreenCast Start returned no streams');
        const nodeId = streams[0][0];
        const os = await import('os');
        const fs = await import('fs/promises');
        const tmp = nodePath.join(os.tmpdir(), `artgine_portal_cap_${process.pid}_${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`);
        const encoder = format === 'png' ? 'pngenc' : `jpegenc quality=${clampQuality(quality)}`;
        try {
            await execAsync(`gst-launch-1.0 -q pipewiresrc path=${nodeId} num-buffers=1 ! videoconvert ! ${encoder} ! filesink location="${tmp}"`);
            const buf = await fs.readFile(tmp);
            if (!buf || buf.length === 0)
                throw new Error('gst-launch produced an empty file');
            return buf;
        }
        finally {
            await fs.unlink(tmp).catch(() => { });
        }
    }
    finally {
        if (sessionHandle) {
            try {
                const sessionObj = await bus.getProxyObject('org.freedesktop.portal.Desktop', sessionHandle);
                await sessionObj.getInterface('org.freedesktop.portal.Session').Close();
            }
            catch { }
        }
        bus.disconnect();
    }
}
async function captureElectron(format, quality) {
    const { screen: electronScreen, desktopCapturer } = await import('electron');
    const primary = electronScreen.getPrimaryDisplay();
    const scaleFactor = primary.scaleFactor || 1;
    const thumbnailSize = {
        width: Math.round(primary.size.width * scaleFactor),
        height: Math.round(primary.size.height * scaleFactor),
    };
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize });
    const source = sources.find(s => s.display_id === String(primary.id)) ?? sources[0];
    if (!source || source.thumbnail.isEmpty())
        throw new Error('desktopCapturer returned no screen source');
    return format === 'png' ? source.thumbnail.toPNG() : source.thumbnail.toJPEG(clampQuality(quality));
}
async function captureLinuxWithFallback(format, quality, clip) {
    const errors = [];
    try {
        const img = clip ? await screen.grabRegion(new Region(clip.x, clip.y, clip.width, clip.height)) : await screen.grab();
        return await toImageBuffer(img, format, quality);
    }
    catch (e) {
        errors.push(`nut-js: ${e.message}`);
    }
    const capFormat = clip ? 'png' : format;
    try {
        const buf = await captureDBusPortal(capFormat, quality);
        return clip ? await cropEncoded(buf, clip, format, quality) : buf;
    }
    catch (e) {
        errors.push(`dbus-portal: ${e.message}`);
    }
    try {
        const buf = await captureElectron(capFormat, quality);
        return clip ? await cropEncoded(buf, clip, format, quality) : buf;
    }
    catch (e) {
        errors.push(`electron: ${e.message}`);
    }
    throw new Error(`All Linux capture methods failed — ${errors.join(' / ')}`);
}
async function captureScreen(format, quality, monitor = 0, clip = null) {
    if (process.platform === 'linux')
        return captureLinuxWithFallback(format, quality, clip);
    const bounds = monitor > 0 ? await getMonitorBounds(monitor) : null;
    let region = bounds;
    if (clip)
        region = new Region((bounds?.left ?? 0) + clip.x, (bounds?.top ?? 0) + clip.y, clip.width, clip.height);
    const img = region ? await screen.grabRegion(region) : await screen.grab();
    return toImageBuffer(img, format, quality);
}
const NUT_ROOT = { mouse, keyboard, screen, clipboard };
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function unwrapArgs(arr) {
    return arr.map(v => (v instanceof CJSON ? v.GetDocument() : v));
}
async function findWindowByTitle(title) {
    const needle = title.toLowerCase();
    const wins = await getWindows();
    for (const w of wins) {
        const t = await w.getTitle();
        if (t && t.toLowerCase().includes(needle))
            return w;
    }
    return null;
}
async function moveMouseTimed(x0, y0, x1, y1, time) {
    const steps = Math.max(1, Math.min(120, Math.ceil(time / 16)));
    const delay = steps > 0 ? time / steps : 0;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        await mouse.setPosition({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
        if (delay > 0 && i < steps)
            await sleep(delay);
    }
}
const LINUX_INPUT_HINT = 'Install and start ydotool: "sudo apt install ydotool", run the "ydotoold" daemon, ' +
    'and make sure /dev/uinput is writable by the server process.';
const LINUX_KEYCODES = {
    Enter: 28, Backspace: 14, Tab: 15, Escape: 1, Delete: 111, Insert: 110,
    Home: 102, End: 107, PageUp: 104, PageDown: 109, CapsLock: 58,
    ArrowUp: 103, ArrowDown: 108, ArrowLeft: 105, ArrowRight: 106,
    Shift: 42, Control: 29, Alt: 56, Meta: 125, ' ': 57, Space: 57,
    F1: 59, F2: 60, F3: 61, F4: 62, F5: 63, F6: 64, F7: 65, F8: 66, F9: 67, F10: 68, F11: 87, F12: 88,
};
const LINUX_LETTER = {
    a: 30, b: 48, c: 46, d: 32, e: 18, f: 33, g: 34, h: 35, i: 23, j: 36, k: 37, l: 38, m: 50,
    n: 49, o: 24, p: 25, q: 16, r: 19, s: 31, t: 20, u: 22, v: 47, w: 17, x: 45, y: 21, z: 44,
};
const LINUX_DIGIT = { '1': 2, '2': 3, '3': 4, '4': 5, '5': 6, '6': 7, '7': 8, '8': 9, '9': 10, '0': 11 };
function resolveLinuxKeycode(key) {
    if (LINUX_KEYCODES[key] != null)
        return LINUX_KEYCODES[key];
    if (key.length === 1) {
        const lower = key.toLowerCase();
        if (LINUX_LETTER[lower] != null)
            return LINUX_LETTER[lower];
        if (LINUX_DIGIT[key] != null)
            return LINUX_DIGIT[key];
    }
    return null;
}
function linuxMouseCode(key) {
    if (key === 'left')
        return 0x00;
    if (key === 'right')
        return 0x01;
    if (key === 'middle')
        return 0x02;
    return null;
}
async function ydotool(args) {
    try {
        await execAsync(`ydotool ${args}`);
    }
    catch (e) {
        const m = e.message || String(e);
        if (/not found|ENOENT|No such file|command not found/i.test(m))
            throw new Error(`ydotool failed: ${m} — ${LINUX_INPUT_HINT}`);
        throw e;
    }
}
async function moveMouseLinuxTimed(x0, y0, x1, y1, time) {
    const steps = Math.max(1, Math.min(120, Math.ceil(time / 16)));
    const delay = steps > 0 ? time / steps : 0;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        await ydotool(`mousemove --absolute -x ${Math.round(x0 + (x1 - x0) * t)} -y ${Math.round(y0 + (y1 - y0) * t)}`);
        if (delay > 0 && i < steps)
            await sleep(delay);
    }
}
async function inputLinux(key, time, points) {
    if (points.length === 0) {
        const code = resolveLinuxKeycode(key);
        if (code == null)
            throw new Error(`Unsupported key: ${key}`);
        await ydotool(`key ${code}:1`);
        try {
            if (time > 0)
                await sleep(time);
        }
        finally {
            await ydotool(`key ${code}:0`);
        }
        return { type: 'keyboard', key, time };
    }
    const base = linuxMouseCode(key);
    if (base == null)
        throw new Error('Mouse input key must be left, right, or middle');
    const down = `0x${(base | 0x40).toString(16)}`;
    const up = `0x${(base | 0x80).toString(16)}`;
    if (points.length === 2) {
        const [x, y] = points;
        await ydotool(`mousemove --absolute -x ${Math.round(x)} -y ${Math.round(y)}`);
        await ydotool(`click ${down}`);
        try {
            if (time > 0)
                await sleep(time);
        }
        finally {
            await ydotool(`click ${up}`);
        }
        return { type: 'mouse.press', key, time, x, y };
    }
    const [x, y, x2, y2] = points;
    await ydotool(`mousemove --absolute -x ${Math.round(x)} -y ${Math.round(y)}`);
    await ydotool(`click ${down}`);
    try {
        await moveMouseLinuxTimed(x, y, x2, y2, time);
    }
    finally {
        await ydotool(`click ${up}`);
    }
    return { type: 'mouse.drag', key, time, x, y, x2, y2 };
}
async function runInput(key, time, windowTitle, points) {
    if (!key || (points.length !== 0 && points.length !== 2 && points.length !== 4) || points.some(v => !Number.isFinite(v))) {
        throw new Error('Usage: { key, time?, windowTitle?, points: [] | [x,y] | [x,y,x2,y2] }');
    }
    if (process.platform === 'linux')
        return { ...(await inputLinux(key, time, points)), windowTitle };
    if (windowTitle) {
        const win = await findWindowByTitle(windowTitle);
        if (!win)
            throw new Error(`Window not found: ${windowTitle}`);
        await win.focus();
    }
    if (points.length === 0) {
        const nutKey = resolveKey(key);
        if (nutKey == null)
            throw new Error(`Unsupported key: ${key}`);
        await keyboard.pressKey(nutKey);
        try {
            if (time > 0)
                await sleep(time);
        }
        finally {
            await keyboard.releaseKey(nutKey);
        }
        return { type: 'keyboard', key, time, windowTitle };
    }
    const button = getMouseButton(key);
    if (points.length === 2) {
        const [x, y] = points;
        if (button == null)
            throw new Error('Mouse input key must be left, right, or middle');
        await mouse.setPosition({ x, y });
        await mouse.pressButton(button);
        try {
            if (time > 0)
                await sleep(time);
        }
        finally {
            await mouse.releaseButton(button);
        }
        return { type: 'mouse.press', key, time, windowTitle, x, y };
    }
    const [x, y, x2, y2] = points;
    if (button == null)
        throw new Error('Mouse drag key must be left, right, or middle');
    await mouse.setPosition({ x, y });
    await mouse.pressButton(button);
    try {
        await moveMouseTimed(x, y, x2, y2, time);
    }
    finally {
        await mouse.releaseButton(button);
    }
    return { type: 'mouse.drag', key, time, windowTitle, x, y, x2, y2 };
}
const RECORD_MAX_FRAMES = 300;
const RECORD_MAX_DURATION_MS = 30000;
const RECORD_MAX_RAW_BYTES = 1024 * 1024 * 1024;
function parseRecordPlan(doc) {
    const num = (v) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
    const times = Array.isArray(doc.times)
        ? Array.from(new Set(doc.times.map(Number).filter((v) => Number.isFinite(v) && v >= 0)))
            .sort((a, b) => a - b).slice(0, RECORD_MAX_FRAMES)
        : [];
    const frames = Math.min(RECORD_MAX_FRAMES, Math.max(1, Math.trunc(num(doc.frames) ?? RECORD_MAX_FRAMES)));
    const interval = Math.max(0, num(doc.interval) ?? 0);
    const fallback = times.length ? times[times.length - 1] + 1 : num(doc.frames) != null ? RECORD_MAX_DURATION_MS : 1000;
    const duration = Math.min(RECORD_MAX_DURATION_MS, Math.max(1, num(doc.duration) ?? fallback));
    return { times: times.length ? times : null, interval, duration, frames };
}
async function sampleLoop(plan, t0, grab) {
    const out = [];
    let k = 0;
    while (out.length < plan.frames) {
        const now = Date.now() - t0;
        let target = now;
        if (plan.times) {
            if (k >= plan.times.length)
                break;
            target = plan.times[k++];
        }
        else if (plan.interval > 0) {
            k = Math.max(k, Math.floor(now / plan.interval));
            target = k++ * plan.interval;
        }
        if (target >= plan.duration)
            break;
        if (target > now)
            await sleep(target - now);
        const t = Date.now() - t0;
        const v = await grab();
        if (v == null)
            break;
        out.push({ t, v });
    }
    return out;
}
function scheduleInputs(list, t0, run) {
    return Promise.all(list.map(async (inp) => {
        const at = Math.max(0, Number(inp?.at) || 0);
        const wait = t0 + at - Date.now();
        if (wait > 0)
            await sleep(wait);
        const tStart = Date.now() - t0;
        try {
            const result = await run(inp);
            return { at, tStart, tEnd: Date.now() - t0, ok: true, result };
        }
        catch (e) {
            return { at, tStart, tEnd: Date.now() - t0, ok: false, msg: e.message };
        }
    }));
}
function recordFps(frames) {
    if (frames.length < 2)
        return 0;
    const span = frames[frames.length - 1].t - frames[0].t;
    return span > 0 ? Math.round((frames.length - 1) / span * 1000 * 10) / 10 : 0;
}
const RDP_REMOTES_KEY = 'rdpRemotes';
function isAuthedCall(_json, _req) {
    const token = _json.GetStr('token');
    return token ? isValidToken(token) : isAuthedReq(_req);
}
function sanitizeRemotes(raw) {
    const out = [];
    const seen = new Set();
    for (const v of raw) {
        const rec = v instanceof CJSON ? v.GetDocument() : v;
        if (rec == null || typeof rec !== 'object')
            continue;
        const remoteId = String(rec.remoteId ?? '').trim();
        const entryUrl = String(rec.entryUrl ?? '').trim();
        const password = String(rec.password ?? '').trim();
        if (!remoteId || !entryUrl || seen.has(remoteId))
            continue;
        seen.add(remoteId);
        out.push(password ? { remoteId, entryUrl, password } : { remoteId, entryUrl });
    }
    return out;
}
export default function CRemoteDesktopRouter_imple() {
    CRemoteDesktopRouter.prototype["onExec"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",0));
    CRemoteDesktopRouter.prototype["onScreenshot"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","5uFVN7FEZgFhNW5CZTZHFGZkFXNrZqBNNn5O5sFmFVNiBNZ85O57ZyNs56Nq5VZANw5mN1NlNAFPZWZQZs50Z1N6F9ZKN3BBFdF2Ny5lNp5IZGFl5oZvZy5xFR5pNwNcNjFVFiZCZmNd5l51FaNTZDNEZbBtZ05L5NZUFVZU5E5jNIZ1ZeZ3NtBtNOFFZPFf5nZIFENd5y54ZHNXZxF1FBZs5KN25pB5ZrZFFjZ8NkZoNzFBZGZd5b575r525MZTF6Zf5LZYZXZ45wNOFkZ458ZRN2NOF45kNcNI5u5nNW5jNSF9N35KZdFsFnNiNSNkND5hZzBZFDFuFqNa5O51NFNsFi5s5yNoNnNtNeNiFU5Y5GZ6Ft5MZ7ZiN5ZF5G5x5CZq5RZyNPZUFdZEZpNr5J5rNeNLFINjFC5mZC55Zf5OFDFS5UZcFSBFNM5rBFNR5S5OZuF05aZkZ25sFSZZNfFqFnNeNwZQB5ZG5ZNJFL5wZ45n5XFENBFoN1Zj56Z2F0NAZA54FAZwFF5ZF85N5SZgNXZlNzFVFW5rN8595RNZN35MFzNYBtZuNNZR50Nh51NX5YF3NxNsBNZJ5KFjF5ZLZQN3FSBF5NZNNbNnFuFBNjFmNVZaFdNB535jFRZqFwFR52N6FZFv5oZDNsFo5TZ95yFMNsF9FnF5FaZHZJZbZVZP5XNyZEZaFlFHFC59Z85o5WZ5Fp5ZF25XN4Ne5AZZ5WF7NHFYZ6FiZcZU5JZ3ZYFC5A5OZXZ7FQNbZ65RFyZFFb5iFKNrFsFENqNbFRNBFgNGZAFXN05HNnZO52FvFO5ANJ5aZpZx5INpN9FxZQZG5JNHN4N35JZi5N5aZ2NnFiZtNOFZZoZHF9Z0NJNTFs5KFB5UFsZVNMZWF7FgZsZRZP5vZ6FeZhNy5rNNNjBuZh56ZYFu55Zs5dN2BN5ONJFuNlFTNn59Zy5bFVNMZQ56NPN55X5j5HFaNBBFFaN2NCF3NnNVZgNWNFFl5aN2FiNJFM5E5v5cZU52ZRFZNtFRBtZqZ1NUFnNx5wFnNA5tNaFINF5wNn5p5CZ2ZJNSNuF2NiB5FgFqFL5r5aNLZl5cZeZSFBZYZTZZZa5x55NHFy5QZrFu5AFY5v5r5tZaNRNBFoFCFfFA5o5n5xNP58ZeN95eFcNUNRNzFkFPNy5SZEF1ZSNW57BN5bZ9ZWNsFGNyZdNKZMF9NlNRZhF75lFjBtZlFw5sFoZCNcNmN4F5FLFtZkNkNlFkFqNFNyFMZ4FqFGZi5xFa5w5D515W5TFpNpF75xNKNmNuNa585xZnZYFEFlZtZrZyZ1NxNRFOZDN1BZZvZRZaFWZ55oNzFpNXZmZ4535VZXFJFNFgFtN0NVN45a5GN5FI5x56ZpBy5JZAZDZSNbNdN3515vNmFh5CFDZI5jZOZOZOZZFlFxBF5G5EZc55N8NgN0Za5HZaNzZPNwZqFxF3Fw5c5O5zNYZ7Bt5P5uFGZMZ8ZgNbNPZV5n5xFtNCNzZyZWNH5iNHNHNANFFlFqZSFhZyZ8NX5fNfZY5jZ4555NNyFUZyZYZOFUFT50ZsZpFPZzNbNvNdNp5d5I5ANDZBZwZoZuNRF9ZTFx5t5w5eNmFUNn5vN7Z3NWZGZMNE5MN1FSFe5qNNFtZbF7FH5iZNN1F6ZC5BNFFYFe5SZ9Fl5XNVZRFoNp5dFbN8NLNGFeNVZwFLZDFHZZFdZxZ5NeFJZINn5RNTFV5zZq5RZL5FZXZTF65S5k5zNjNe52NnNzFmZLNK5BF0ZQ5JFjZEZDFNF65z5rZqF5FYZZ5MNMZi5jFlNJN3NUFEZfNTZJFLFMNSBNFw5kZyZi5nZfZYNiBt5fZaNKNA5kNgFWFBN85wZNNKZXNqZ6N05eBy5r5qNzNMZaZTNF5fZPZuZLZPFKNsNwZAZQBZFrNsFNFxZo5YFnZqF25jFh5dZCFT5DNNFg5PNP5o5EF6BNNB5Z5pNpNEFMZpF5Z8NNZiNHNJNEZP5mNw5kNBN9FUNcNkZJ5SNSZaN6N9NIFyNuNqNjZqFp5yNh5yNKZIF4ZkZKFR5iZ2ZZZlFMN95KFZFZFKNgFXNx5AFiFRZn5oNBNGZUN6Fj5rNA5gNuZGZCZRZuZc51NtZBF4FyZIFEZAFjNXFj5o5zZYZUN0NyNAFvZT5tN0ZRZmB55zF059Z7FBFVNt5BFNZWNSFx5ZZ1FuNB5wF4NPByZC5GZQNINoFhBtNq5c5oNBF05yN3FvNgZC5QZiZvNb5L5S5H5wNBFcZ8NkZjFrZBNpZ0NuZE5EFENWBN585dNd56ZF585z5OFSF4ZfNf5fNfZgFD5tNcFqNr5J5MFzF9ZP5kFKFaF5FaZMFdFZ5WNeFq5ZZtZa5JFUFM5fNtZZNwFc5T5XNDFtZRF3BN565UZA5ZNfZKF6NjF2FzZtNa5YFR5yZ7Z0NFFMNyFuZAFjFq5d5PFB5DNVNe55FIZdZp5lFxZ6NXNl5QZ65GZfF0NfZ4ZX5LZmFq5pF25oZH5EFLNyNYNBFENKN2FoNBZyBZNKZp5UZKZLZpZeZvZC5cZVBN5aFpF45mZ7ZCFlZLFaZKZzFlZoZoNOZyFcZlZON1NoFCZr54ZpZY5aFqFaZRFtNSFf5dFpFJFZNk5uNVNEZhZpZhN1Fg5yZE5Z5qFdFG5n5M5WZM5GZkZfFJ56FbZWFuN1Z2Zy5S5zZLN2Z0NNZ3FDZaZyFiFM5qBuFiF1NmNXZM5jN5NP54FnZNNJ5A59ZBZBF6ZwZw5vFiZWZgZ0F4NsF6FQZLNjZ65t5oF0F4FnZKZyZ2NCFuN1ZdFjFjFEF6NXZL5uN45NZQ5i5VN1NPFBFuNxNjZU5wFeB5ZQZTZBB5FPZCF4575f5QFN5IFA5EFmFrFd5wFH5TNfZoNHZ5ZB5zZr5qFDNg5lZX5a5nN4FD5OBNNJF75VN4F0ByZcZCZYFh5XF5FXBFFDZWNhN9F958NNF55G5EFk5zNpFIZON7ZW54ZlNtFwFCZhNjZcNrZS5c5B5VNf5S5D5YZT5f5HN6ZUZKF7Zq5KZz5n53FD5qNhZsFON8NJZZ5wNVZUFkFAFYNgNqFd5d5aF1NcNM5KNjNFNFZvNxN9ZHZT5pN7Z25mFN5lZ3NMZkFOFj5JFBBBNFNANwFbZK5b5MZE5O5LFaZcFQZUNf5yBuZbN7NUZKFA5gZb5uFDBZZhZvNo59F357ZRNkNCZFFVFk5SFcFXF7NdFHNl5754Zk5C5jByZhZ7ZHNtF1ZlZRNoFn5FNcF4NtFJFuFi51FTNXZL5PNxFjZOZOFs5kNuZUZDF4FQ5ENlFRZ0FoZTNqF3F1FEN1FDZq57NKF3NJZCZsZJ5OZW5jNnZe5MFqZsZkZ85cNhNy5UZlNyFtFtFxNwFUFn5ONdNeZ25dNwFLZDZ4BFNY5lBZ5VNl5b5150NtBN5J51NrNd5nFmFL5qNlFEZVZZBtNyNqZO5G53ZANgFONl5U55ByZR5GZ5ZX59ZLZwN8FMZGZw5fNu5HBZFTN558F9ZuZGNOZFBuZQFDFr5P5aNm5S5WZT5UNZ5cZjBu5UZ3FPZjNeFiNwB55FNQFB5NZNF4Z0FW5ENnF15J5nFYFFFEFy5oFvNLZb5UZlNEZMNXZDFg55NaNsFIFdZJZdNWZS5p5HZV5NN9Fp5GNrNgFDNRNUFHFd5rNtFBZDZL525ZNkFCZNFwZUZH5nZANBFK5754NbZJZGFoFaNe5yNTFXZiNkFaZnFyNjN5NcZlN4NX5BFQNlZZNnNwZzNRBB5TNb5zN2F3ZWFI5dNuNvNFZYZTFIFT5aZVZCN9ZDZXZtFQFlNHZlNxNdNS5V56NMZeFZZGF35FFXZHNBZv5rZg5yFd575BBZZeZuNzFkNbNLN2FsZDNYZ4NrZ6NA5QFSFF5zNLFOZ2N0N2Zd5DZrZoFlB5ZDFlZyZONtZT5HNH5nNCZAFkZiZrN8FbNdBN5BZ3ZN50Fx5WFj5mFdZVNgZP5f5fZDZj5VNeNMNtZNN2Nz5rFpNrZdNCN15GNV5rZQZxFcFZZjNgNvZE5WFP5aNn5ENhNYBtZNFY53N25INzNuNH5BFf5Y5LFEFM5jZbZ8FgN45aN25s5CNjFMNhNR5UN0ZPFCF2ZqN2N85VZwFiFe5aZaNJFkFF5TF65oZFNRZ7BBFBNeB55oZbNRFVNPZH50NT55ZpZJZJZ5ZdBBZYFhFwF85JFlNRF5BZ5MNlN0FmFV5YF3FgN450ZNZQNJZ3ZiNF5NZuZpByZgNYFBFxN1ZkNnF5FGFGFfZxNl5WNzFGNw5NZ7FeNi58B5NaNW5mFa5W54F25WFhBNZg5d5Q5tNjNENUNoNZN4Fl55ZiNIFx5wN4FfFm57FWF2NuN4NYZbFEF6NJFXNcNXFpF9Z0NY5g5VFWNFFC5dF6FNN55AFNNgNlZV5xNbN4Nj575SZ8NNNB5eZBFeNPNUNdN55QByNSFwN75YNHFKFH58FdFhFsZhN95653ZkB5NwFrZFFRNMNiFiZ05SZM5VFq515HFWZdZY5iFwNE5ONCFF535kF4BB5jZkFMNr5qNYNw5W56FkFpNUFjN7FjFe565XZlFQNKZ35YZiZgFiNzZOZyNqZwFVNmFyBFNBFp5H5vB554NANe5GZvZDNQZh5yFK525INMZQNFFjNhZCZ0ZfFj5lZeZ3ZfNZZdBtBuZGZpZZFpZm5GNfZhFBNhZfF0ZPNR59Zp5Q5PBBZK51FHBuFW5CNC5dZIFUF5ZgNpFx5E5LNhFzNONcZlNoNmZpZCF2Z8Z3Zq5bNoZJFjNnFiFe5sF5F7NcFtFfZXNPFRNwNKNDBtFKFvFANTFG5IZSNkZA5ZZS5bZpNKZPFiZqZtFFFINpF9FDFKZANeZzFmFz5eZgZ55ZFYNc5kZq5dFV55NQNa595sN8ZlND5cFd5BFgZHFKFFZR5z5KFCBuFwZTNm52FQBtZvFb5Q5L5xNSZtZsZxNLZ85HNnZMFBNz5CNLZz515hZyN0FB5CN3Fd5oFY53F8ZIZSFwFlF2ZLZ9NhFC5vNwFW5rFzZNZGFKNiNqFAFOFU5ANYFBNrZN5B5iN1FFZXZ5FUBuN6NiN0NnZQ51Nb56NZFJFiZA5UZcZ0Z4NzNxNn5rZVFvFANqFyZVFhB55UZ2NwNGNpN1ZmNu52N4FCNgFAZTNQNP5BNsNzZM5JNwFuNOZ0NkZGZg57NGNBFOFB5K585c54Z1NF5c5PNJZ0Z7NGNC555lBZ5JNh5Z5YNN5KNANc5J5MFI5FNaFfZe5jNYNtZyFYFPZGNNNZF6ZkNiNW5L5bFHFf5VFvNpNRN8Fk5bNmN2NqZ35QF0NUFMFsFXFaFXZQNz5cNhFR5sNX5bNdBZFVFDBBZMZbByZnZ8F4ZP5HZBZjZMFsFYNfNyZRFAZVNvZzZIN35hZqZBNBZgN0Z1FJZ25eFi",3336));
    CRemoteDesktopRouter.prototype["onInput"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",6046));
    CRemoteDesktopRouter.prototype["onRecord"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",8174));
    CRemoteDesktopRouter.prototype["onCmd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","FNFSNpZcFDZ1FCByF8Z45Q5MNHBFNTZJF9NbNBNr5RZ5N6N3N3ZMFp5GNWFTFsBB5JZdNT56FvZn58Nn57ZMF1ZIFtZsFb5v5TFz5JNEZXZFFJNlFRFT53NwZlFDNmFKNYNc5QZ1ZfN3ZcZH5i5OFSFEZ2BF5kFeZBZ9NSB5NJ5XF3ZEZG5KNyZ15n5H5cN75y5D5CFj5ABt5AFt5qFCBuFQB5Fh5qZdN0Bu5HNVN0FV5TFK5jFqFe5JZNZO5G515LFVZ0Bu56FRZM5qFj5IF6ZtZt57Nr5qFmFyZp515dZH5t5T5eNyZuZF5UZV5cZnFPNVZtZI5l51505g5EZh52FJN85sZCFwF25y515iFh5bNlZKNMF6FsFnNsZ0NsNTZDNx5yFEFQ5R5vZMZHN05WNAZaZz51N7ZqF1NyZQZ2ZiNbFQ5SN4FIFbFfN35K5YNI5aBuNoNi5e5pZRF9Fk5nNnNz57NeFwZbZMZb5k5hFvF7ZANdFEN3Zd5I5IZVFQNGNZB5B5NnZm5HBy54Nx5zZkFXNgBZ5eZ3ZJZeZGF6FbZNNxNe5rN2FX5OZUFPNc5qNVFjNqN9ZzFM5QNfFfNGFRZeFBFM59ZDBN5pFaNDZQFh5dZsN2ZG5x5yNO5QNGFjNgNnN7FRBNFfNWFOFcNo5FZUFgZvNaNx5FFOBBFe5P5BZ1NI5oNNFkN1FK5ZN7NN5rNb5jNFNEZ2N851NR5yNNFAZZZn5BZjZIZQNfNmFa5H5yNUNDF35lZcZD5uNrFeZi5RFr5rB5Nl5JNgB55E55NNZ8FAZOZJNHZa51Fk5N5O5l5HZjZNZ9NUZRNU5lFh5TZ1FgFpNbFeFFNC5MZaZ9ZtNfNlZf5JZaZH5aZh5F5eZaFcNRNu5HZaNaNy5SZfZt5HZzFI5qNr5AZXNzNIZG5bNTFaFL5H5l5eFKNpFo57F05m5sZ4Fd5pZI5j5ZFkByF15HZnN1N9NuZKZKZOF9NMFJFwFmFAZfFQFT5ONb5NNmNzFfB5ZzZfFWNH5CZmZlN35l5nZpFNNTZINQ5GNK5DZX5OZFBuNQBuNd5sZFNg5aZFFCNqZSFu5PZtZ05DNs5pBBZjBZNIFVNoF4ZoNGFtZk5ZFkZf5iNQ5oZPFqZJZdNgFCNvNMZdFg5FFJ57Fg5PZkFFZ95DN35VNUNN5qNCZHFANA5SNl58N7ZtFuNbBuFoFq5wNDN9ZnFpF4FfN8ZFZgFGZ7Zq5NNoF1ZVNzFuFtBt5YFoN5NGZbFXNcFAZS5qFAFK5pNcF7NnZ5FMZVNvN25jZfFc5wFDNDFmN7NUNlZUFHNl5XNiZ5ZY5sZjFcF95JZYZG5PZ6NfBtNSNGN0F55v5GFQNmFxFIZnZU5OZJZW5T5J5JN3Zk5i5c54Zl5DFLNQ5GZcFDN0Bu5P5dZyFkFA5INVFXNz5mNeZEFWZ75YN5NB5XZX5AZBFIZ1FzZIZmZgFAFb5VNDFBZNFyF2ZW5eZz5H5hNi5wZT5vNPFwFcN35D5bZ2Zj5G5nZuBuNjFTN6ZQ5GNRZeNSZC5KFHBt585jF3Z0NuByZvBZNJFQNFNaZNFIF9NgByZhN7Zp5jFgFXFUZUNdFgFS5UFgZQZfFKZ6FwFfZN5O5J5VZ0NK51ZZNT58N3B5FwZFZTF15dFNN7FfBFZxF45UFqFM5MFBNAN2ZjFq50ZjFxNkZwFWNTB5FZNEZlFJNJNXNw5t5oZeF3F25W5S5k5XFdNIZuZoFUFMNpZeZmNtZ3FVNkNK5v5QFm5pZJ5VZxZ7F2ZKN9ZSZJFg5f5852F7ZEZlFIZqZxZzZNZCZ4Z4NeBuNP56ZWZeZDBuFHZqFQ5eBtNaFOZWZaFfZONiN85HFr53FOZ4ZAZVNuFvZKFC5lFcZy5NZCNVNHNuZnZAFmFl5h5dNe5sNJZn5XZJZXFbZH5lFUN2FHFg5WNyZwZj5o5UFbN6NIFnZMNDN2FCNm545S56N7F65vZLZiZg56ZuNyNiN45i5vZEFY5vNHNQ5CFkFl5ANLFnFVN2575BFTF6FRFtZ15yNdNyFaNc5SFL52FZZyFIFZNV5OFaNaFaZkZ0FJNdZDNZZeFsFWZsNjNbNQFcZAZHNEF6NHNvNoNLND5F50FbZIB5NgFEN4NAFNFaFpNrZ95PNYZrFzBB5M5lFlFIZA5nFl5fZrFmNfFOF0NXNVFmNiFpN3FwZdF85lZuNmNcFNZs5RN25rNy58N65g52ZeZu5LZH52Nf5wNHFkZGN8Zv5zN05kN85E58FY5xFXF75YZuBZ5aNGFQFaFEFy5X5YZNNiNFZQ5k5rNOFTNQFlZp5EF2NmFMNMN5ZzNwFOZgZGFl5jFNNaFVZh5d5kFLNvNMZNNAZ2FKF5ZqNt5nZwNUNq5Y5JFENJZOZWFVN553FhNNF9N9Nj5yNUNmFGNXNVN7NNZRZK5LZONm5sNq5A51FmN9FPFn5LZnF4F8N3FDZwF15dZsZQN4ZZZvZkFXNG5VNvFDBZFy5GZT5J50FvZlN3ZJ53F35qFtFdZk5SN6NNZ2FL5X5iF9ZXBZZ25ZFxZN5yF25v5pNn5SZU5OZlFJFyNUF9NUFlZoN4N8Z7FCZy505uF2NDNUNGFDZDZHZUNfZhFEZ0ND57BF5aN3Fg58F4FkF2ZdNkNbBtNL5R51N6FOZH52ByZnBZZP58Z3NL5QFz5G5EBtF4FhFoBtFUNkNeBuF0NeZ5Nk5uZFZaNbNaZyFsZeF0Nk535050ZvFwFp5v55ZaZEZ6F95mNVByZ2NfZvZAFzZ2NfN2Zd5h50N9NSFzN95ZNcZ1NfNDFsNw5iZVZo5hZaNl5L5rNYZFZXNk5oFXN2FPNg5X5t5NZDNXZfZsZZZPZ0FOZmZ45eBN5KFrFsB5ZnNRZu5TFzNj5u5lNbF85XNCZNNT5aNQZWF7NT53NaNy5B5ABu5TZk5YZT50FY5bFaZOFGNhFaZ15B5BZ3BtFFFWZfFK5bF4Np50FX5RF2FEF2F9Z3FMFK5aNPNDN3NnNa5uBFNUNu5SFoFjFNNNZRFmFrNrNAFKZkNGZTNV52Ze5JFFFpFT5bNQNB5EZtZxZMZsZN5kNIZb5L5c5355Zr5w56ZV5D5AN3ZLNdFG5HFlZkN5FhFW5fZ9Ny5w51NS5bZ2NUFZZVZqN6FyF3Ns5gNQZbZX5fZSN3ZY5kZeNl50ZU5CN15YNr54NMFXZyZHNyNuZl585v5u5MZV5M59NjZOZvNjNWNWNINtFAZCNdBFNF5P5DNkFk5HFz5WNy5oNX5ZZHNPZxFqNEFq5WFwFnZIFF5e5JFfN4NqZ1F8FjNn5IFAZp5aNgFzFNNjFaNhFCNj53FEZsF35BFcFnNL5YNX52ZZ5fF6FS5BZuFG5NF15WF0ZANbZV5HBZNENA5OZR5AZGZD5uNIFbFGZbZG5j5uZdFtNo555lZpNANuFrZdF4FkBtZPFbFBNoNcFYZSNcNzFkZd5XFMFPNUFlNTF8FvFhF2ZoZcF65I5h52545YFnFaFjZ0NJNDFp5oFmZn5vFNZrFu5v5dNS5t5hFY5Z5ENH5x5zNBFiNEZXFNZg5t50NAF6ByZTZw5DFAB55BNz5xN5ZGBZFINcZSZNFJNuZsZrZSNKFd5TNFFsZUNa55BtNnNd5XNfNwFwNm5FF8N0NSNUFZZPNzZ8NzNeZ25LFKFS50FCF0Zk5DN5F4Z9BtZJZJZoFMZXZjZR5OFl5G525DFL5dZoNJFxZz5GF8ZqFKZn59FZZRFrBZBNZF5kFI5K5pNEZxNvFVFXFOFkBuFn5iZaZdBuN0NwN2NJFANUN2N3ZZNNZBZ2ZfFENgFXFuNhZsF0ZlFlN8NVNLZJFNN3Fb5HNIFRFB565ZNbFYNEFI5lBuFCFwZjZEFVBN5eZn5K5aFPNhF8FR5VNWFpZa5PF8F3ZYZLZh56Zi5u5K5rZNZT56NP5G5wNl5TFz5uF4FFZt5GFENLFg58NZZWZ3Zf5m5jFX5CNf58FCNU5aNpF6NwN2NYZn505mFPNmNvZv5fNRZLBBZ9NnZKZ35wFuFTBFNsZyNZ5wZTZMNv5dF4ZU5CZMFLF7ZJFMFs5VF4FNZiZU5OF4Z6BN52FA5MFL5qBNNj5jZs5dBF5PNCNbNtZ2ZV5o5vFYFzF5NCFuNpNSZdFg5zZZNSFAZBFoFyFRNv57Z1ZJ5w5q5lFsBtZG5QZrNlZgNLNs5dFqB555NjFf5HNWBZNWFUFXNINANgNDZ75zFfNzFJ5tFdBZZW50N2NlZiZqByNqFp5tNeFQNCNOZuNx5l5DNt52FzZ4NlZmFzZdNpFLZz5b515hZF5uNs5j5tNVN5ZKNk5y5K5k5GZsZiF5ByFCZMNY55NEFf5NZh5tZ85UNMZr5ZZWN7ZcNA53ZKNKZmNhBN5MFQZAF6FvFBZvNWFmN4NcFZZ354FWF15hFc5RN4ZxNNNkN6ZHNXN8NVNx5NZt5Q5tZ0N8FBZ8ZF55F25P5KFHF4ZEZL5WFH5tFLFZZ1ZVNT5mFGN7FKNHZnNkZMNBNQZr5CZbZYFTNqZFND5O5BNRNd56BBZ9N6FrN7ZcZhNhZuNlFAFp5bNzBZZfBNNvNKNHFV575aFu5OFJNiFqNgZbZ9NZ5YFBBu5H5cZXFo5uZUFQBNN95tFxZCZQ5BFH5jZL5tZ85C",12406));
    CRemoteDesktopRouter.prototype["onRemotes"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","FzFGZ7ZCFpFUNeNm58NANNFhFKN5ZTZ3Zc5BNPNuZtNLFYN85DF65A5x5l5OFT54NBZNNDN2F2FuNUZIZ9Z4Z0FOZi5F5ONW5JZlNHZxFXZoNvFwZi52Zk5FNJ5zFzFF5ZNUFb5k5AZmZXZC515FNkFRZR5fNZ5LFrNR5iNJFC5SZO57FT5JFjF45qF4FVZBNb5B5RFrZcNDNXFiNhZ15pByFRFENiNANh5fN2FIN15J5fZaBuN15u5E5dFMNfNAZGF6FLF4ZAFfFtF9Fy5uF45RNmZGNQ5jBZ5uZuBuBFFOFAFy5u5FNZNQ5r5cZ0FE5dFKFrFRZa5HZA5tFXFvZo5JZMFoFJFUFx5nNYZaZ6Z4NUFO5VNXFzNuNg54NR585Q5kFMFMFOFPFqNIZTFsF45dNz5s5fNz5VNdZGFg595M5JN05x53FDB55WF95sF3FDZ2ZdN0ZsFI5nNaF1FvN0NKZXNsBNFiNQNEZkFrZf52F3NJFYZ3FYNDFpN7Zd5tZe5FZH5X5BZE5SFvFKFi5YNINqF450ZaN8ZpNaZo57ZT5jNzN8NtZCNXZN5ENYF7ZF585MZDNSZHZ35rBuBNFFZqNhF5BtZmNu5SZcZx5rZdFhFJFF57FC5bZhZUZoFW5qZJF9Z0ZIZ6NWByNNByZmNe575i5A5AZg5b5FNjNMFUZpFFF6Z9NaBFFeNqZE5tZN5YBBFd5dNB5SNOByBBFdNqZoFnBBNgFPNvZVZzNxNF5ZZNZjZ3NgZA5ON1Fa5rNa5d53ZpFw595jNTBt5HNKNC5wZbF6ZANO5r5a5GNW5GFsNCZUZHNwNvZ2FY5lZx5ANj5RZs5FN3F5Zu59NANHZC5JFDF65ZZo5O50Fc5rF0ZhN35xN7F0NhZa5t5uF55s5tFE5KZl5p5W545uFgFJ5nN85cFINzNUNRNSNvZkNtZWFY5e5K5w5xNKNzZZNSFkZeZZFm5jZl5qB55oF55v5G54ZSZZ5WFk5gNPBuBZZIZ9ZrZaFOFBZ4NhFeZlNvBuF2Ni5yNcNoZOZHZJZRNQFBNMZlNcFaZ4NXNhFGZcNZFhF8NnZFFRNp58ZCFr5HFJ5fNeZHZgZmF6FF59ZaFwFXNd5X5s5vZ2ZUZ5Fj5nZ5NpFOFOFcFxFFNJ58FINBNYZJ5oFrZ9BN58NzZEZY5sZsN2ZPZyZAFMNKZ85d5pF2Zi5oFuNkFY5dN2NWZj5dFKNNN9F9ZaNxFz5x5nFrZaZW5j5UZ5NtFw5qNA50ByNSZrBBNSNqFPNw5nZ5FJNG5TZ3ZNZaZRBu5mN6ZVZcFkZxNTFNZjZwFO5gFbNXZkZYZfBu58NYF1Z1FaZM5fZFZsZb5MNXNMZYBZFhNRBNNm5FZjFTFYFlFB5j515LNNNBZjFOZtZOFlFnZ5FLFaFXNIFONnZKZ75aNeFI59Z55NN4ZFNw5TFfNeNh5uZyZkF4ZdZ7NeNkZzFRN05BFqFZZs5QZiN3BtZV5KFo5v5lNeFP5j5S5cFeFpZUZRF65CNXBN5L52Nu5pNHFxZ2Fw5XF6FW5MNuZL52FU5kNfF3NJ5gZWFmFIFSNFFhZyFRZNZl5rF45dFDZzZNNT57NqFSNXFINc5iNlNgFvZ8FJNhNMF95mZZ5VNm5YZcZUZPZSF3BBZjF1Zs5mNaZl5UFH5n5pNx55FHNb5Y5DNA565KNN5UZv5X5JZUNEFwNMZ55SFA5m5zBZZN5JFUFMFu5bZ2ZlZvZJFIZcNIZGNM5cZLZy5rFuNGNvZpFxNyFCZ2Z159NUFEByZM5gZjNKZPNrZZ5G5n5bFQFbNFF9FVBtZn5LFU5PNJFsFWNvZQZTNAZnFiZBBBN15DZAF2FyNbFWFWZz565lZn5hFVZlFK5UNdFFN6ZZFyZ7ZI5e5sNRNJFSNc5PNM5jNOZPZVFuFKFSZZ5y565LN2ZXNoFp58ZFZ9FINbNQFz5sFyZn5IFrN0FB5W5QFeZ65RZAZWFlNYFZZr5u5OZeFRFDFLFbNXZSFd5b5e5TFRNlFpFIFLZsZTZkFfFjF7Fs5eNC555DFANX5hFQNr5tFcFgNRZbBt5MZlZKZQF1Fy5oNRZtNz5MNm5959NTZUZHFvFiFDZLNVFaNHZMZkNVFlNkZ7FAN75RFQFtNZZPFmBtZCF1ZGZjNHNiFn5ZNO5jZKZPFVZYFYFlZDNxZeNsFeZL5BFf5jFiNzFZ5vNBNwFIFf5wNnFs5qZ85GFbNcNuZ3FJ5s58NT5iNHBZ51N5NqNsFwFn5vNq5MBBNnNgN45BFrFk5J5ONBN7N8ZkFeFkF2FzByNQ5PZsZsN6ZyZC5jNu535SNz565D5JNdNnZLNaF5ZEN1N05CNmZMFq51FTF1Z7F95JN0BuFg5B5MZuFIFCZnZSFE5g595kZVNL5rFKNdNL53ZYFMFQFwNyN5NpNtNUFC5dFD5tZ5585A5w5u5F5FFEFtN4BNFXN5Z2Ns5m5UFcZrFXFKNHNgNtFq57ZR5gB55SZBZxNw5YFUN6ZpFgZWZMZdNrZMBZFWFiZpFh5NFa5tZAZe5BNJF1FLZfFDFAZfNqFD5OZAFiFR5L5IFA5mNN53Fh5AZfNFZCNpFYFnFrFU5UZMZwNDZCF2Z8FqNUFk5tFlNd5Z5PN5NONKNB5M5Z5LNvNlN9NPNLFpNvNl5u5a5r5oN3NkFdF1FM5XZp5e5r51NZ5oZ0Z8NbF4NSZp56Nr5g58N9Zj5YZSZj55ZRZ9FN5FNk5b5PN3ZuFLZ4ZtFV5952FhFOFDNaFcZW5WF95a52ZJ5GFl5U5p5rFCNCNCNBFfF8ZdFoNPZd5LNNZINUFIFpNMZFFCZDFk5sFRNmN2NtN3F7NZZeF0Fd5YNpZlZaZBZ55EZxBtZhZpF1FwFLZYNUNl5sZ7FpFt5YNkFjFtF4ZuZaNcFoZWZWNxF5N0FcFBZqNyNZNO5DNkZKFNFD5AFNFYN5505j51FPFGZmBNFANj5uF7ZOFUNvZbNoNZ5Q56ZG5jBBZfFlNGNgFz5r5fNqFJZpZr52FmNgZxZoFo5vF2NqFDF7FeZn5rNrNJ5lNnNSNeZVFoN6FkN65BNV5o50FUNJFsFRFMFUZZFIFr5EFWZiZ1NEZyFfZfZI5lZTFF5ONYZONEZUN7FR5vFuN6Nz50FUN5NF5FNQNI50FFN05hZmFoFpZ1ZMFFNmF8FUZhZjNoFsFTZhByZr5XBZNGFT5iFl5hFbFYNS5gNPFsZRZuZT5pZTZ0Fd5fFgZiNBZE5kFsFANCNQ5x5Y5EFVFQ5FNoFCZtNLBFBt5S5KFsZC5EZwZ65oZX5oNw5u5h5IFZFmFA5h5wZ2ZlNS59N6NDZg5dZO5KFk5zZvZi55NNNfFkZQZM5QZtNSN55pZfFAFO5BF2Nv5CN2ByFNFuFi5zZcZ7ZsNV5qZyZIZ2Z253Z75M5kFrFRFaNn5aFBZINCZ5ZcNuZONeNvZwFbZfFS5yNiFJZOZuZaZX5ENZZ05xBuZZFU5LZeF05GZCZONDN2F7FA555XZFBuZ1NMF7ZLFRNVZcFC5vN2F6B5Z1FWZwFVF15u5XF05k5Z5UBZN0B5F85eF65XFS5H5w5t5dNiFz5f5lNuN9Z8NA5ZNbNN5GN35HNENPZ4F1Fp5hNnBFZ05uZONmZ7ZeFdZ0NrFnNk55ZGN7FXZZF9F4BuFd5pNvFcZfFkZBFoFrNzNHNWFRZyN9FQNY5YFX5dZU57FZZg54FxN256NRFNFUFQNBBN5RZwNv5d5SFGFfNsFs52Z75gZGZqNiZU5dFENH5r",14728));
    CRemoteDesktopRouter.prototype["onRemotesSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","FbFcFSNgZrFTZBZ6N4FlF6By5y5fNWZ2NYZE5wZv5TZAFVZA5aNkBt5F5f5FFIFkZaNh5fFuFuZ8NDFlBy5Z5E52ZHZy5YFDFLZNNHZhNiZb5V59ZKZbBtZU585JNWNuZWNoNu5PNmNeNYZnZGNEZRNZNlNqFZ5YFgBy5uNL575ANtFe5bZGZeZNNkNINdBt5iFIFkFeZdBZZd5INA51FkNdF3FNBNZmZu5lNxBF5tZp5hNWFYN55iFj5UZ45zNe5kFf53ZXFFFP5i5s5cF4NwZ8ZSF5FGZgNlZpFxNiF5ZRFeNxBNN95hZNNmZyFUFXZfZcNB5RZy5y5M5P58ZiByZLNXF6FFFJZhNA5WNTFzNqZVNc5rF9FIZ55DFjZxN6FkFzZX5pFXZmFkNkFDNUN9FHNDBZFy5X5eFr5INEZV5dFyZu5wNSFcNnFSNXNBFqFlFwNeZ6ZaZANYNyFr51ZjZvZzFXZDZD5e50Nl5P5XNlNUNkFAZlFUFlFoNn505J5uZ5NhN6FoNgZsZJ5c5P5eZqF9BFZDNmZsZNNC59ZxFoZWZ4Nw5oBZ5DZ9ZZFBFS5CFHFLZjNdFfZvNrFVFq5lFgNp5gZR5SNv5o5cN3ZoZ6NwZdFnZJ5Q5sNz5m5BF8NDNy51ZCZoN1N4Bu5RNoZoZeNmFL5X57ZNZtZG5YN8N85fZpFyNkFEN1FE53FoFSN1ZFNbZG5iZ8NTFCZxFq5ZFO5UFk5O50ZtF95fZFFp5kN95GZa5gNoNZ53FIZzNZZKZKBBNw5PZk56Z2FU5Q50NfZSZbZCNnZY5lZSZQ5IFg5l5CFpFXZrFjZlNJNWZgFK5f5oZ9ZwN0ZlNzNtFh5XNNNIBB5z5cFGFE5hZeBFNwFLFPNdF9ZmZeZ4ZoFFNLNfFU5UNOFEZPN1Z8NaNOZ25OFwZzNwZX53FhNPZWZ7N3FHZAZqZzFv5G5vFJFiF7ZAZRNg53NtFEN55vNOZD5vZz5WZYZA5oF2Z4N6NE5cZJFLFPNqZaZv5CZFZUFtFa5x5nFxZbF65m5zZWBFNmZgFM5A5tZ5ZUFON05lZLFM5L5K5mFVNtFe5eFgZgFeN4NyF4FvFBFP5hNu54NzBZFNZr5gZYZ955FGFQFlF8FfZ95J54ZcF5F05nFjZbNTN2F4NNZR54ZmZgF1FvFYZeZzFBFW5T5qZ85R55FhFaNPBZ52NrNgByNJN05LZbN95iNtZaF45V57FOZTZ4NLN45hFOFDBBNkFGNDNsNOZPNPF55q5Y5K5aFHNMNIFB5VZG5RN8FUZcZkZEF3NdZ5Fv54NIFqF25IN35yF2ZW5XZFNTZcZiZ1NsNiZmFcNB5V5D5KZvNQN9NS5cFcNwN65T55ZPNn5eNTFHZk5jNXFdZBZnNRZ2FGZ456NTZLNKNdNIFcFHZRNmN9Fa5F5KFj5mZdFYN2555G5DZeNw5yNlN9FSBNZlZoZmZtN6ZkFsZ6Z456FoFxNpFENw5EZIZLNYN5ZhZZNtNi5C5i5kZLNgNdFe585WNnZWNuNsNAZcZdZhZRNgByZkZAF4FzFp5UNrNYNyZGFJ5u5sN0BtZmZtN8NXNf51ZNNQNMBBZ2FNZsNZ5j5qNvZEFE5kZB5zZvN3FGNkZHFlNE5OZaNHNjFnFWNoFoZOZf5d5l5NZrNcZtNLF1NPN0Z8NxZDZIFo5kNCZr5o5xZ9NQFkFTF1NhF6FuNYFrZkZC5QFENXBZNeZaNdNQZtF45v525OFF5FZkZ1N4FwNX5I5yNJFj5LN8NeNcZg5EFUF2FNNDFfFQFsNLFjZ15FNxFKZxZoBBZxFKFc5c58FiNoF5NsFc5TN2F5FD5CNWZBFRFhNPNFZoNjN7FxNKZ1NO5q5eFAFVNk5Z57BNFBZ5ZpNhZwFl5tZG5xZfF3ZYFIF1Z45nF35EZGNxFsFlNQZGNLFEFLFpFMZyZtFHNWZmFkNCF4ZcFI5y5iZKNYNOFD5ANeZcF0NR5DZOFzZ8Z7ZQ5ZFXFhFGNbZ6ZON859FZNJF05YFpNxNmN6ZXFEZWFxNcZ45nN6ZK5gZIF2ZMFaZtNoNrZC5bF1FaZ55nZcFtZsNFZc5QZ85xZMN35JNCNDNI5iFd5gNTFf5ZF25bNbFoZxFTFjZIF35nF2BtFW5VNONMNBZY55NzZANtNkNGFT555QNc59FJNBZU5SZiZo5YZVZdNZZJFeFWNhZrNYZdFA5lZZFuNzZuZw5N59ZkFANWNnF6FYNQByNp5TFn5EFNNdF9Z1Fo5SZNZuF7NDZxNy575PFFZPFeZYF9NAZdN2FNFdZiF5ZtFwZEFDNv5X5o5wZJNJ5aZlZBNSNHFpZeZuZgNOZRNBFNFaFfZVNbZfNiNM5zFX5QFJFLF2NNFWZdFkNaNlZPFDNj5rNLN0ZRZLFQ5uNlZRB5N5ZbZJFENQZCZg5K5pN1BFFbN0FDF2FpNY5tFPZO5LFTNkZZ5JNyNw5MZn5NF85aFkZG5D5ZN2ZINGNQFiFfNc5gNPZe5FZiZsNpFcFMFL5k5z5X58ZEFl5wZ8ZoZcN7FtNTNm50FTZH5aNqFDZ4NvN4FSZy5M5SN0By5iNmNXNaZkNJN35MZnZxN55JNxZkNfNVFUNNZmZYNaNPZmN1NgFiBFNKN4FeZyFNZnFMZ9ZHZyZ5FiZ8FL5SZlBN5FN1ZmZ05cFI5zZAZt50ZL57FNBZNX5eFUF7FZFdNGZDZ35k5XFv58BtNvZeFnFtNbFYNUZlFpFYFbB5NTZxFHZg5bFd5GNhNDZiNDZ0ZaFF5QZVN35O5lZEZn50NhZdZ9NfZ4FbFNF0Fn5XN4NxFYZrNbN1ByZ3F4FRNMZ956ZdZFZYFF5bNV59ZRZzFx575KNmNANG5d5yZo5iFxBtNpFUZV5VFr5INjFzNw5BFtZ6FAFNZ8ZXF3NqNaNS5rFJ5dNW5rZuFJ5kFjZ55nZ05BNZZcF5FmZ3FcZfNhNJ5nNqFfNWNAFCFsNL57505aFnNwNKFcNmZcZx5YNjN2F9FrFHFgFyNY5bN1F3NNZENF5Z5e5UNnNMFKZaNx5PNe5zFc5MZdFdZ3NHN8NKZfZGZjN85EFNZC585KNGB55EZzZJ5eFPZ3Fl5V5mZ25KNv5jNf5F51NV5XF1NV5L5C5yN35HNXF5ZSNqZHFu5rNuNC585JF8Zx5gFnFQZrFaNPNBFa5BBy5eFnFrFCZf5RF7ZXNw5mFpZNNVZHF5ZdFQBNZkBZFCFc5mFONH5sZJBB5aZsNUZmZ9FYF5N4NSFHF35FNxNuF4NwZk5X5Z5iFIBuZXNN5OBNFFZaFxFnNwFi5LZ8NPNgN0NE5nZcNNZqZdNv56FXF5Z8ZWBNNFFM5lB5FONlFbFRZ1ZMZCNcNmF3FUN6BtZaFtFcNSNT5XFbZV5i5kZPZcZ05ANoNvNz5oNWFrNOZwN2N1NTZgZZN6FD5GNEZwZt5OFhBNFd5XFgZwZ5BZFX5NNDZvNONTFV5FZ3NUZwZu5HZuF9FtFjNQ5VNZZPFQZYFUNFFgZeNCZ9ZPByFPFCFmNi58NHNL5CFBZkNi5zBtNqZ7ZM57NkZx5CN6Fm5PFnZZFj515cN7FcFmFhZENBNBNBF55TBBNkFJFAFpN1FPNpNhNXFLZtZmNeZS58FWFCNsByNdNa5qF4Zn5DN8NgFEZXFd5HFnNYZvZ5ZjZQNDNUNdNs5NNaNaZcN65yZpNk5cF157ZpZMFPFNFUNMZBZDNHZU5nZvFuFqZbZjFjF1NbFn5LZ9F0ZGFP59NA5DZUZ05M5TFw5nFRNs5MNr5pZmZO52Zj5zZe59FoNB5NF1Nf5VNqZDNjFP5tNmFaB5NV5LFR5ZFAFQFOZX5tZzNRN45qZ7N95O5p5W5C5QFa5lFtNDFOFI5L5l5DFjZfF35b5gZYN7NmZBNh54Z9NhNuFWF2ZkFO5OF3Ff54NtNp5NNBF95SNe5TF4ZyFlF2Z1NbFzZS5eNP5LNiNkNtN5N8NpN2ZaFG5uN2505a5I5DZ55u5zN25PNFN9Nd5U5vFkFiNXZfNo5pZhNB5DFOZdNAFOZCNMNbNLNGBBFHNtNkNGNTNXZLFWNfZq5hFNZhFA5lZxN3ZCNSFb5o5CZmNyZt56N85B57BN5G58NPFPNpZEZLZbNsNKZiNAZIFcZwFwFo5zFT5AFvNfNXZgNzN35TNHFjNgZRNL5lFD5NZy5pFeFzZq5qZdZHZ4NMZEFfZzZlFj5pFGZvNKF5NCNANd525GNMNDNFFIN5ZYZ65GFVFENw5CZM59FnZeFs",16611));
    CRemoteDesktopRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",18739));
}
