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
    CRemoteDesktopRouter.prototype["onScreenshot"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",2900));
    CRemoteDesktopRouter.prototype["onInput"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",5785));
    CRemoteDesktopRouter.prototype["onRecord"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","FXZR54NVNp5iZU5xFpFeFgFaZtZzNU5F5RZJF0FnZxNTF8FUBBF4FgNlNvN4ZENOZgFD5KNw57N9NJFuFEFRNaZ05bNl5NNzZUFj5e5rNbFGNKZT5XNbZPN6Zu5r5f5r5W5HFyNFNPZXNJZiZAZgNWZI5TNfFbZT56NQNk5OFpFwFk5yZAZRZsZw5F595yNi5wNz52FBBZZRZG5hFu5QByNlZ0ZXFlF3Z5ZiFe5cBFZV5a5qNv5d5VZUFBZgFk5dFIZ4ZcZAFmFKBtZbZ15z5yZVF452ZY5vFGNy5gFNNXN7FiFOBNFYN3Z1Z5NDZoZyFYN95CBBNwNHNOZN5mFs5WZ95yFxF4NCZg5yFh5pN7535iF2Z7FF5a5rB5Fb5SNtNRFzZxNSZg5QNN5j5DFYZWFFZvZLZ7N3FTNiNjZoZ7By5h5HFTFeZTNkFnNT57Ze55NjFqNU5DNj595GZFZIFk5EZvF255Ng5tN85IZ55f5CFy5HZgBt5aZ0ZZZ5F1NUF7NJZ85lZ2FL5mFJ5NNPFrB5NTFg5gFNZ8595o5xF55z5eZ4ZNFqNeZsNuZvNzN95l5r5DFIFxZjFaZn5YBy5U54NVFrFiNoZCFCFhZxFd5pNKZUFiZBFV5J5PBN5TF8FX5iZY5EZ6NMBu5WZKFTFmFp5HFwNwZRZrFkFCN0FWFxZzFb58ZjFMZ1ZQ5gFYFY5SZZ53ZnZzFfNE5N58ZLZwFW5u5tFA5PFZFZ5pNdNlN3NhBNNaFL5tZRNYNQZOZGNLZC5AFUZXNIN25GZkZDNHFkB5Fo5IZaZw5xN1ZQFZ5OFV5E535QZi5YZAZRF05JNS5uF5Z2ZgZ7NVZMNLZRNP5j555jNbFlNuFIZ1ZZZsFVZ9NLZNFHByZQFVNEZTFiZe5VN2ZLFuZ3FNZB5YF55jNZZxFcFAZVFiNgNtZB5FZtZ7ZM59Fp5INP56NHNSZHNqBZNi5x5HFDZ4FgFqZoNHZSNw5vF45pFmNE5H545ZFVNlFLN2NF5cZ3ZtZT50Ny5NFqNLFCFz5SZmFwZzFI53FVFqZ3FtZ3FuZmZQN8NPZL54ZsFtFvN7Z0NVNxN3ZyF0FGZ9NEFhZDN955ZiFxFIFVZM5sFdNEFWZiFrFFZX5ZNm5H5LByBFZdZsN8NPNXZlFO5R5g5i5yNLZzN35wF7F1FpNgNiZ95PZtZ7ZPZB5d57NeNb5CZXFjNKF8Zx5nZcFe5L5T5ONSZ8NFNsZEZJFF5M57FD5yNu5kFmNTF4NsNyZwNXNdNSFH55ZWFeNrNYZrNAZ2ZGFlBFFzZRFrZEF2NkBu5KFS5u5h5RNzZ4ZFF9B5F75FNZZBFD5cZRN0FmNtNINjNz5zNjNYFNFg5aFB5L5cFnNzNDFLNj5ONJFSFh5jFMNJFTN5FNNk5h50ZUFiN1NjFpFPNlZ5ZO5HNkZbNRZtFTZ35L595BNxFjNQZi5BNTNsFAZiNVZENMNRFnNQ5MN8BNNWNVN3NiZo5h5eZ1FrZr5mZFFBZHFZFr5sBNZHZsZB5fNDBZNu55F65xZ4ZMNsNcFSFa5gZI5M5qFF5MZkFZZpN7NyZsZENDFHNFFS5IZnZI5aFOZwZiFvF65b5jNWZyF6545gFCZ253NMBy5Y5SN9NhFLFMNyFHZtNFFxNYFdNpZBZ1F7FmFUZQFHZzZnNfN6FZFrNvZpNnZeFZ5ZZHZVNsN5FO5NF7Nz5F5m5WFYN4ZJFyNZFXZzF15bNXNeZ4NxF4ZS5GNzZPNO5FFBZYZ25XB5FMZLZQ5sNp52Nc525IN5Nk50NXNa5t5S595bZc595EFZN5Z25QZP5yNm5IZCN1Nx58NdZBFAZfZSNIZM5Q5vNHZsFKZMZjNZZKZ3ZA5VNyFN5eFYFyNUFgFdFt50FSF9NMZX5d5iNE5RZ0Ni5uZp5T51NH5uZm5NZcN2Z9FuFiFv5bZL5N5u5G5lZqZF5r5PFwZZNX5G5vFb5cFPZkBZ5nZUZu5mNtZ5N6NFF2ZXBy5f5bZXFYNdZkNrZBNpZrNRFeNSZ4N8NENAZOZ25xF75oZH5VFrZmZu5PZfFi52ZK5Z5ABZZ45jNZZJFBNWNQZzNaFuFxZIFqZtFwN751FQ5UFsNnZeNg5XNK5IZIFGZgFlFO5lFaFWZrFzNPNE5EBZZjFeF7NY5F5uNc5ZBBFINGF75jFQZQFcNCNO5g54ZTZg5yFINYNlZb5Y58N6FNZZZSZFFZNb5qFL5I5gFTZBFT5tNC5nFvZuFTNHNjZ1Fx5N5s5HZW5nFOZv5GFRZgNz5iN6ZCZTNG58ZdZsFhN4Ng5wFtZ45KNHZbFY5bF1N4FRN3FwZf5h5FZxFQFi5bFuFcN6FOZf5rZ4NkNSNpZRZtZoNCZVNLFgZp5sZXN3FwZG5A5n50ZSFuZvZo5OFkNaF6FkNRFCFr5JN0FeZiZF5pFZ5uZq5IZIByZCN2ZvFRZ4ZCZj5y50ZMFGBZ5pFa5LZoFPZZNgZcFrFKZ9NlF55XNwNu5yFsByZ2ZdZ0FfNsZa5bNF5wNiZvNlF4N55fFa5oZMNN505v5eFcFWZQFV5dNHFOZPNyF9FfNdFSNKZiBtBuFfBy575rFSZi505dNu5UF6Zt5DZsZPNm5EZeFa5l5RFHFUFjFl5OZCFQ5dFgFgZWNiFINENG5m53Fv5cZcZsNtFmZ1FdFMNpN9ZWZ3ZSZdFCNXFJFv5KFXBBZYNdFK5WZRZtNLNx54FyFq5S5xZTNtZ7NO5TNWFZ56F4Fx5HByNc5HFuFnNMFrNU5PNRZlNXF7NEFCZsFgNOZrNFF6Fv57Z7NkFBFh5I52NnNA5kZ65BF3BNZfFv595xNBNWZv5d5658FbFkZy5K5UZ2ZHFRNrF4NHN8ZoNS5EFnNi5XZQFUFFNK5gNJ5ZNmZXZ9FLNY5xNWN15IZSZp5qBtZnNCNNNjZQZxN35l5bNmNj5mFM5LZmZEZPNV5lFoFRN85z5cNp5qFUNc5qNtFRNBNUZ2ByNnN0ZZFQN2Zr5nNPZPZxNfFL5uN35NFs5sF05TNV59ZmNIFM5S57Zi5MFPZ1FtFcFK5v5a5KF7FEZGNn5VFZ53BB5NBZFaZRFyF4F1FBZRN35QBuZgFRZ9NO53FPNCZD5B5qFFNEZaZ4NTZnZ857NXFl5zFR59NwNc5PNsFN5JFK58Fd5QF2ZpNWFONVNI5b5XFMNPFZ5mFzN25b5OFTF0NhFnZnN2FgZKNqZTFcZgZGNTZyF5NGZ7Fq5GFDFnNAFZFjN2FaZWNG5YZCNtZxNYFOZ0FR5tFnZBNy5W5eNQZCNqZXFhBuFbFMZjNGFfNfZHZkZPFFFnZpZtNoF7Fd5LNIN3NUNoF2FZBZNkNU5jN9FwZJNXZdN1FaNQNcFBZmZ3Z1Ze5VZ8ZTZSZxNw5CNsNRFKFAFEZeFVZuNLNg5hFX5sFINXFYFDFJ585DFk5O5eZSFTN3Fd5dZJBNZEZd5m57FON2FFZ0Ng5HFeFE5KFH5R5eFeNVFhFlZGBB51Zy5FZ65v5r5KBBZq5dFyZZNt5BF1Fl5EN7F8ZUZsZjBt5zFC5RZaFZNnZRZaN6FU565LZBNi5SNWZSFlZNNOZ3N8Zy5fFpN3ZiFIF3FbBtNM5I55NWZ0Nk5aFfZ553FLFuZsN4ZM5iFH5CZFFQBZFZZ3BZFx5MNRZCZ1ZvBuZ8FRF65e5EZ3FZFJ5cZVZk5KZaFdNkBZFvFIN0ZdZBZLZFZ15pNMNzFDFH5b5vFBZKF4ZA5rNRZFZuZaFpFl52F5F5Fs52ZzFsNSZo5N5wFTF1BNZiFUZQ5DFhNoZEFZ5q5aB55R5FNBZCFLNoZkZg5cNGFJBtZAZ2Fy515F5lZCFvBZFQZA5gNSNEFQFgZ1ZvNFF7575GFONSFV5gFA5OFMFGNBNIFoZGBtFDBtFAFiZU5SF3ZnZnFVNe5hNzNnZ45kFGZpZVNRNdFIZDNi5JFOZ4NPNN56B5N4FSZ4FcFYZo50NmFUZANIFb5RZRNUNSNqNG54ZyNJFtZBFDF4FnFpZ3F35fNPNPZcNkFMZj59NSNfFtZSFZ5h5m5e5J5pNzZYZJBBNTN2N5NnZCZXN7ZKNjNp5M5q5VNTNiNfZlN7Fy5vFbNuZK5V59ZAZ65FZ7N8FhNn5ZNUBFNF5pF1Z3Nk5UFXZb51FB5KNqNCNz55NyZ2F2NA5oF25jFj5h5x51F5NN5cZBZmBFZpN7N9FMZs56ZlF4Fq5F5AZZNjNoZyFH5rFIFNNBFTFjNfZE5J5RNb505MZL58FxByNSFPNG5wZyZc5LZb5IZb5zNnNJFB5i525hNDBF5wFdN459FqF05CNq5i5ZZhZeN75S525kZDFsNBFiF55Y5MZHFK5IFLF3FjF7FUFkNP5RZx5X5sZAF0ZE5ZFeFTB5Z3ZyZjNfZz5lNc5xZEZy5aZa5XZENjZmFU5b5fZLZvBNFfFVZv53ZYBNNrZQBZNlNL5g5H5pZE5x5m5q5DFLZBZlZF56NJByZuZ4NkFNZFZoZuZ8ZyFKZOZcNKZsZcFEFINrNr5VZOZpFk5W5fZeZjZVNLFW5VFM55ZONmZ6FaZaZiZ8FgFtNWFIZsZL5QNbFaB5ZU5k5d5IZ75PZsNGN7NQ5D5j53Z1ZfZo5tFnBF5jZhNt5e5ZZhFfNS5eNE5eFXNzNlZpFJZZFDFvNPF2FZZp5D5H5q5f52FTNj5h5PZA58NgZXNONlFEFYZ2FMZsBuF0Nj5FZOFFZcFiNz55NpFaZfFE5YZu5QBFBNFv5c5YFYByFz5rZVN0ZmN25TNsZJZ3FJNNByNVNVFTFnZN5P5pZzF45hFMF9FbFG53FIZuFjFRFTFUZUFZZHFHZgF45rNDZkZZNONkFWNnNb5HF15uZ3BBZRZANi5Q5955NSFrN45SN9NENbNfFR5kNIF2FgZxNrNz5LNQ5kZnF9ZZ5n5WFzNs5vNmFzFYFsZoNJZfFf5zNJNZ585h525d5qZwZT5w53N0505lNi5LZJ5B5jZcZGBZNJZING5wFuZGNSNfNVFWZIFR5BNPNx5aFTFgZ8Fk5pNFNZNKFKNVZvNONYZR5INfNzN35sNM5uZBZJZrF5N65bNdFwF9NcFCZiZkFwFWFiFGNuFxB5ZAFkFx5k5y5qZWNS5UFcNwFl59ZAFgZeZ95rF3FYZYZONS5B5CZCNsNbNRN05H5rNtZVFYNUZ2FDNP5f5R5SZ5FONmZiNVF45U5tZ1N65TNBZPNmNl5v5eNfZ9Zc5CNyF3By5WZK5xNCN0Fr5wF9FO5yFIZY5eZeNAFaFm5s5wZzZDFUNiNANmFvNLNaZgNqZyZK5yZvZL54FuN1ZRNH5m5s51ZQ5INDZaNdZ45jZiZ1F1FKN8ZKFkFGFPFBFIZC5z5mFOZhZf5o5rZ4BZNzFtZpBt5DNFZi555oNi5A5l5GNrFoNiZ352FZFNZX50F55xNMFlZYNtFVBNZGNSNqNWNS5XNeF25FFUNfZGNUNNFyZm5lNyZGNr5gBB55F7N6NLFVFfFtNbNI5hNINw52ZB5WFaNT5wZ7ZDF3F2F1Zx5gBu5A5gBuFyFBFENQFsNxNh5VZENINB5AZi5lZUZb5KZ2ZHZ3Fn5OFNFa5XNuF1Zk50Z7ZaFpZhFIFfFsFe5hNS5CFpNW5pFTFdZ1Z3ZcN6ZgZjZHNwFYNVFH5NFuNSZHNPZBZwNaZM5MFEZOZfZcN7FPF75wFjFiZrNfNZFQ5856Z9FAFBN9FaNMFGFMZv5n5sF4Fl53Zo5CNGN25IZuZeNT525CNu5c5R53FKNzFh5t5R5kNm57F4Zq5nFKZT5pBB5ABFZ9ZnNaFrBtFBFpNS5R5u53ZxFDNMFVNKZTNV5oZUNE5w5uFEF95pND5g5nZhFZFPBuZ4NoF3FSFvZS5lZkNgFO5K5FNyFR52FgNxFBZqZkZlN1NDZYZWNuZsBuF2Zy5ANM5xNFZfZQN9F0ZC57NWZjZ3NXFBFUFm5bNPFYZ6ZJ5TFHZF5kN2ZlZ2NE5RZH5EFl5zBBZUNWNjZIZA5YZX5nZKZ7NIFUZ9F1NwFy5DZ1Fr5h5kFkZyZZ5ZBFFH54ZjF05yN8NTZbNgZzNnFiNFNv5JN1ZTZPZN5ONxNwZdZxNtZKNrZxNgFbFNFlZtFiFCFtNxFG5a5ZFKZH5oZp5DNK5wFdF0NPFm5XFJNc5m5pNOZQ5CF5FHFvZsFzFnNIZtFVFV5sNWFHZjFe5G5xZjNtNbZJZ8NfNTNoZl5QNeNx5v5ZFt5mFUZVN7NiNjFOFOFbN9Zs5rNtZbFlFGF5ZFFlF85fFzFFNXNh5M5iFJ5v5054Z45MNB5BNNNbZjZoZUNC595a5rZOZyFEF7N0NS5ENGZ1FjFpZH5PFtFQ54FIN8NZZI5eNQFpNJZDNTBuNN5FZmFXF5ZkFBBuF054BBFE5Z5NFmZ955NS5iZnZK5FZcF65T5BZ15dNDZcN4N9Fx5uFlZzZiF651FK5kNMNCNnZfFD59NRNyFGZsNkFWZ6Z5ZiN6N85QNQFmNNBuZhFnZqFaBN5F5gZIN05qNN5lFvZEZ255ZkFW5uNmFAFeN45bFcBuN5Z5NoN3F3N1NeF2FQ5kFENYNYFAFtN05bNkFsNjZHNFFq5jN3FYZSNQ5oZP5INp5fFg5j5V5sZN5wNOZZZf5EFrZgNfNkZJZcZP5KNAZPBNZjZYNDNY56ZgZT50FMZ7ZgFnBuZRBFFJZYNrNIBZ5CNTZI5J5aZ0ZrFX5t5PNqFZNNNkZDNqNKFy5V5LZa515VZT5WNb5TFIBZ5RNpBZFzNs53ZHNDFDFFFNZaNNFANmZa5fF1NKFSZDZOZVN65fFLZE5SNcZQN4FS5pB5FeZ1Zh5iF4BuFNZcFn5qNaZUF8F456FZZSNa5ONP52Fp5t5s5DNnNYZPNdNqFY5ZNYZhFn5zZqZM5d5yZkNeFWZcFgNuFuZuF35GBNZe5BBu56NB50FY5NZaFp5hNGZIFmND5n5P52ZlZdFVNCNz5D5rF8NwZX5OZZ5UBu5BFEN0NL5JNDNZNzZsFTZw5w5z5gZrFgFf5XZU5NZeNGZ2ZnZEZMZdFYFuZmZ55JZIZ9FCNL5hFmFW5S5o5xNqFbZD5wFt5FN15iBZF4ZANXF3N4NkFLN3NRZ1NIFnNjZXFQND5sZyNLNCNA595xNdZLF9ZSN45f5F5MFoBNNzZuN3BZ5mFzZoFdFXZC5cNDZFFvFCFZ5lFf5eFlFQNeNNNH5LFy5ONoZZF0FvZMZNNNFgFhZMZV55NE53FpBBN85ZZ8Z1NXFiNaNO5fZcFMFFNjNKB55SZ5NTFqFLFD5HZs58NW5WFnBFZ6ZkFvFJNtFiZOFo5NNRZCFK5mF3565cZpNuNEZFFg5LFuNqZ35iZjFR5kNiN1FX51ZVZINFNi5jZfZLNdFJN6ZEFVZrF5NUNc5FNkZoZuZZ5UZkNdFBNlFiNR5YNdNbNPNSNKFhFTNWZ7FRNqN7N7ZRZ6NS57ZIFAFUNmNdFX57ZpN05kZANb5kZdZ6FiF9F6525l5YF2Z45UFWNj5MNuNV5NNb5yNGNv5gZx5MN7FwNoZ2ZWZKN0Nk5jN75dF75gF55i57585vZKNxFJZcNYNjFCZLNcZXZkZ8Z1Fh5HFCFhZD5t5n5bNSFfNoFA5VN9FZ5bNAFp5s5pFcNEF9NPNeBZNxN3ZoNN5QZr5IFpNfF1ZiFNFE5rNsNI5KFvNoZKZpF8N6N9Zb5sNkFk5cF15QBFZEFQN4NAZEN2NRBF5lZ2Zk5FFxNrFXZS5oFvFvF0N3NQN1NA5y5JFp59Zb5fZwN85bFlBN5wNmFxNVFTZMZB5a5oZy5tN0Nk525MFBBNFaF05DNiZmF5NfNpFqZ253FrFZFmNzNqZO5eZcZtZ5Fw5XZLByF7NaNoFu5N5n5uNWF75FN9ZI5RZlNDZc5jN8Nu5xFhZBNCFuNTZLZn5iBZNr5qNgN3FTFyNhFcNS565nNjBt5P5dZ756NpFbF65jNU5VFyNjNVZjNGFG54NP5lNfZoFzZU5FBZZPZM5B5ZBt52Z750NWZRNb5DZmZjFWF2ZAZhZhNAZmZxZvZ2ZKZdNfNANJNTNbNUFOZTNvNn5c55ZqNrByNvZOFOBZ5ONA5m5hZJF4ZI58ByZc5TZp5N5iZSZH5BZXZbFqFRNyZi5J5nZT5iZRFxZ4NXFtFnZuF4FRZa565fZuZKNjFsZKNgZQ5QZ7NPZcNCNyZBZF5WZONgZb56NAF9FYNV5JZs5uBBFONoZtFj",8013));
    CRemoteDesktopRouter.prototype["onCmd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",12123));
    CRemoteDesktopRouter.prototype["onRemotes"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","F3FSNFFYFXFEF0Zp5DZRNoNF5iF1F35ANtNU55NQN6ZKNDFUNbZn5QF45RFx5rNnZaF4FhNW5zF4N8NeNTFyNB5S5eZPN4Ng51Zx5s5WFC5YFFF6NW5aFSFkFoNSBNFz5rFeZsB55cBy5I58ZCFd5q50ZUFK5uFOFHZ1F4F3ZvNeFP5kZiB5NcZyZcFMN7ZVNcZcNyFgNvNdFv51FaNCNWFZNzZgBtNx59ByFeNe5jZ65J5HZ3Zf56Fk5iZmZ0F4ZYZkNZ5cZNZU5dNU5lFsBuFCNCZT5TZj5GN55fZkB5NaNJZvNR5nFY5uZoFqNsNvN852Zi5bFl5IZJN0FlZ1ZY5zNaNPFqZBFfNeFB5WNzFGNCNXZyNdFZ5BNe57BNFBNcFYFQZxN6F1ZxN85Q5xZq535TNj5HNgFZF0NeNXNzNnNoZsFXF5F3ZPZ8N1565gZm5EFhNiZjN65yF95JF95tZCFNNCZG5nFQ5FFKNNFdFcZTZ7ZsZf58F0NF5fNbFeNeFeFYNrZY5PNjZG5W5X5DF15F5T5aNL5QZqNgNIBZ5IZoZjFVNnZ35yNlFdZiZdFB5WFx5eZcNbZfFR5W5aZmNJZiF5BB58BFN350FP5IZdFEFcN9ZLNcNlFN5YNr5jFzFuNpFbNLFXZwNLFf56FxZ3Ny5ZBtBFZfNR5H5fFhNF5wFPNIFX5MZeNrFEFMNi5gFYZb5xNuZGFsNDF8FLZw5tNeZhFTFE57Z55lZG52ZPNPZrFaZIFTZzZI59NGNwNUNgFdZI5PFPFvF8Nu5iNFBuNkZnN3NSF7NdNlNV59Fq59NMFg5C5HFvFeNLZ1ZBZsF1ZjZXNJNl5w5MF75xZ1FTFH5JZWF957Fx5J5aN7Z9F5Ni5SZS5ENAFgFhF2NK5p5sFwFDN259NmFQNV595DFt5gFc56F75cZIFONFZyBFZFNf5C5fZdZe5t5vBuN2F15uFaFwZ15JNnNANrNgFsNE5p5ABZBt5m5XN2NeFU51NYF6F9ZfFqFbZfFsZiF8NTFXNENEZGNn5jFhNiF9FAZVF7ZQFcNy59NNN9NVN9FrFA5HFaZhFHFA5mZLNDFyFPZRNRFDZpZuF2ZVN2NgZKFUFq5mFp50F5Fu5JNhN4NHNRNt58Z7FHFpFUZ453FMZyZu5I5iNNNV5U5aNxZZFnNlNzN7515A57ZsFe5EZPNFZeFTFUFvNkF9Bu5ANLBuZJNYNrZp5AFfFUFF5HBtZgFQ52ZS57ZVF3F156Zf5TBu5cFl5DZYNs5DZK5nFyFrZe5QNp5tFe5EZ55EF3NGZ756Z25ONe5L5lZJNPZwNfNEZ3ZENCNBFI5GBZZU5GZnZaNvZp5YNyFGFbNv5GF3F055FfZQFeNS5uB5N1BNFqZ4FLN7ZeZbFAFuZ2FFFx51F0Z5N45eNl5dNzFnN85X5M5PZyF258ZzZeNqZGZY5qZmNTZt5EFXZb5fN5NQNFZ1B5FY5uFUZ1Zf5YZMNsZkZzNxNu5JZ5ZjZ45QZSNBNRFA5gNUNU5eF7Z9No5ONPZg5E5d5S5BFpFlZB5xFN51NHNMNEFvNrZOBZNL5HFgBN5eF6NdNTN1ZN5F5sFZFGNZNQ5UZoNvFcBtNpFu5P5qZOFFFGZD5t5QNiZT5NFnNp5m58NrN9FpN8FTNTNi545BFGZNN0NS5IBB5l5xNr5O59ZQNvFzFY56FZ5u5NNxNDFl5aZtFUFlZV59FiNVFf5lNR5WNn5NBNZ8N8ZO5kNfZGFmFDZ1F2FrZPFAZ3N2ZJZ75FFSZCNR5jNeFNF1ZVFAZz5UZT5tZANPFnZE5U5WFmZ2N8FmZ35EFyFKN7NVZ4ZV5pFuNY59FQZHBFZM5q5yZSFXZXNY5D5c5jZUFPZIZq5KZj5UF2FiFOZn5d5ZNiFvNo5VFu5oZBZqZUFZ5aZ6ZvNAFA5jB5Z5Z8BF59FmNM5wZGZi5oF651FWNkNp5sBN5eFpNJ5uZzZbN2FoNsNjZXFAZN5J5ZFp5zZt5WNfF5FJ5GZGZSF5NbFP5nNnF9ZZ5g5sBBF1FrByFwNS5vZxZCZ9FyNBNpZCFWFu5PFY5eBNZIZiFu5S5cF1ZWFdFJ5gFRF6Fb5oNe5UFGB5FhNRFfNQ54ZGZ6BFFvF7N75LNx5z5tFPZIFtFbFRFQZnZ5F6FcNzZe5vFYZZ53NHZv5lFk5wNkZVNRNyZ8NVNW54ZGZJZ6FwZM5e5VFbZD5J5eFHN2ZF5EFAN6FDFxN9F35359NpFO5yN35FZDZHFjZcZINx5IF7NENKNlNf5kZyFvZONvF2FY53NUZS5eZbNk5ZF0NWNnBNZGFrFE5DZBF7ZHF7ZS5mZ7NnFCZcFk5QNKNHFDNLFjNc5ZNoNaZHZIFp5S5cF8NUBBNnNBNABNZSZFZIFEZ4ZhZOByNy5zZK5CFt5cND5fN8B55sNtNGNuNm5Y5KNSZWN7NjZu5yZh5tZH5yZb5a5XZrZh5iFvByZl5YF4ZiFAZ2FRZuNeFl5g5cByZg5JZvFF5pFvFk5RF2FLZw5Z5UFpF1FtN8ZbNjF2NDFrNYN8NSFUFM5FFjFPZBFm50FG5J5vZ4FoNJFGZl55FhFlZ0FwFF5aZLFcZJNaZpFaZJN85lZ15GZMFTZ25wN7NxN4ByZBZIFsNi5ENV5sZvNk5y57N6N2ZMByZeZBFAZy5u5M5xNfZKNeZ9NCFyZJF45zNgZcNMFJZj5zFbNzZe5VNUBuZQF5ZSFsZZFNNxZ158NDZ6F8ZeFrZf5bZDZ8505eNdBy5aF8ZmZnZFFpFPZmBNZvZSNI5I5Q53F1NP5zFLNQ5tFcFh50ZbBt5TFpZKZQFnFJNW5nZiFN5cF55zND5WFoZbZOFTF7FbN6Zf5LFMZONaFT5DFWFHNp5bFoFe5zF3FBZSFuFdZIZ85h5oFwN6NjNLZhF3BFZ4FRZTF6NlFX58FDZHN7Zv5yFRNA5h5U505HF7B5525UFpNZZqNfFK5QNlZeZqN1Nn5uNONzFg50NvF5NsZBZaNY5F5JFLN4Nm52N5ZUFx5eNMNiNz5NZjFDZbFIFyZN5QNSZ9ZaNvFpZn545uNu5i5MNb5O5WNV5mFaNu5AFg5hFF5X5kF0Z8NrZsF9ZIZ7Nu5MZSZFNnNYZbZMFUFiZOZn5SNa5ZFANQ50Zu5W54NuFpZuZ2Zd5b5e5r5353ZjNlZl5OFkN45jNE5FNH5VZfFp5AZ8Z2NyFKNdN25RZdBZZUFG5JNv5iZUNEBFNKBNNPFcFWNAN5Z55vZzZvZMFMZh5rFgFnZzZ6FYBZ57FfNfFEFr5CNsZtZ4ZJZUFfFeNQZU5jFBFkZE5hNxFeN2NtN2FD5NZA51By5yFHZPFpZjNKFLZ959F3B5BNZyN8ZM5WZsNaNyN2525A5S5mNuNbNY5L5j5L5C5vZ35aN55P5mN95d5yNRZ7FyZJ52FA51NxNdNa5dZtZc5pF05AZINUN5NQ5nFNZgNCB5ZF58ZIZMNyNoN0Ny5h5yZJZIZ0ZGFWNg5wB5F7BuNlZjZkN3FKNw5DFENkFT5h5p5rFsNUNCNBFYFvZdFoNXZd5LNNZp50FIFpNpFwFCZDF15CZC5gNE5mNbZ857ZaF4BZ5m5WZaZZZQZl5MF1FAZQF0BNZOZfBuNS5nFFFvFzZK5I5HFOZxF0FeZG5LFdFfZb5p54FNF8ZxZQ5MNN5AFN51ZN5JFh5N5QF7NrNa5XNMFHBNFdZuZhNI59ZxFiF65KZu5CNuND5fZt5jF9ZJZ9NS5CFxNn515GFRFIZ75WFq5LZmFbFdN7Fc5hFhZ8ZRFq5p515CNhNI5A5sFIFd52ZS505n5fNy5qZ55JFcZnFIZ8ZrFpFv5RBBF9ZzN2FsZaF7F4NjFi5p5l5KF9NZFp5IFVFNZy5j5u5vF75y54NwNlNP5b5R5n",14353));
    CRemoteDesktopRouter.prototype["onRemotesSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",16305));
    CRemoteDesktopRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",18294));
}
