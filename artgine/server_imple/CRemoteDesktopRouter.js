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
    CRemoteDesktopRouter.prototype["onScreenshot"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",3138));
    CRemoteDesktopRouter.prototype["onInput"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",5904));
    CRemoteDesktopRouter.prototype["onRecord"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",8184));
    CRemoteDesktopRouter.prototype["onCmd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",12122));
    CRemoteDesktopRouter.prototype["onRemotes"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",14486));
    CRemoteDesktopRouter.prototype["onRemotesSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",16495));
    CRemoteDesktopRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",18502));
}
