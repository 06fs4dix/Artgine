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
async function toJpegBuffer(img, quality = 75) {
    const jimpImage = new Jimp({ data: Buffer.from(img.data), width: img.width, height: img.height });
    jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, function (_x, _y, idx) {
        const r = this.bitmap.data[idx];
        this.bitmap.data[idx] = this.bitmap.data[idx + 2];
        this.bitmap.data[idx + 2] = r;
    });
    jimpImage.quality(Math.max(1, Math.min(100, Math.trunc(quality))));
    return jimpImage.getBufferAsync(Jimp.MIME_JPEG);
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
async function captureDBusPortalJpeg(quality) {
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
        const q = Math.max(1, Math.min(100, Math.trunc(quality)));
        const os = await import('os');
        const fs = await import('fs/promises');
        const tmp = nodePath.join(os.tmpdir(), `artgine_portal_cap_${process.pid}_${Date.now()}.jpg`);
        try {
            await execAsync(`gst-launch-1.0 -q pipewiresrc path=${nodeId} num-buffers=1 ! videoconvert ! jpegenc quality=${q} ! filesink location="${tmp}"`);
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
async function captureElectronJpeg(quality) {
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
    return source.thumbnail.toJPEG(Math.max(1, Math.min(100, Math.trunc(quality))));
}
async function captureLinuxJpegWithFallback(quality) {
    const errors = [];
    try {
        const img = await screen.grab();
        return await toJpegBuffer(img, quality);
    }
    catch (e) {
        errors.push(`nut-js: ${e.message}`);
    }
    try {
        return await captureDBusPortalJpeg(quality);
    }
    catch (e) {
        errors.push(`dbus-portal: ${e.message}`);
    }
    try {
        return await captureElectronJpeg(quality);
    }
    catch (e) {
        errors.push(`electron: ${e.message}`);
    }
    throw new Error(`All Linux capture methods failed — ${errors.join(' / ')}`);
}
async function captureScreenJpeg(quality, monitor = 0) {
    if (process.platform === 'linux')
        return captureLinuxJpegWithFallback(quality);
    if (monitor <= 0) {
        const img = await screen.grab();
        return toJpegBuffer(img, quality);
    }
    const bounds = await getMonitorBounds(monitor);
    const img = await screen.grabRegion(bounds);
    return toJpegBuffer(img, quality);
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
    CRemoteDesktopRouter.prototype["onScreenshot"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",2943));
    CRemoteDesktopRouter.prototype["onInput"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",5341));
    CRemoteDesktopRouter.prototype["onCmd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",11422));
    CRemoteDesktopRouter.prototype["onRemotes"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","Fz5GNaN2FcFnF35IF2N8NdZ1Fb5jFoN6FzNTZKByFONA525XZPZ0N6NaB5FvZBZWNTFGZaNWF25l5pN6NWZCN9ZyFMBt5tFk5VZMZi52NEZBFMZlNCNqZGNFNKNkZcZbBtZ852FpZlFDN6NuZZ52NBZK5hF2ZVZlFRN3NwFfN25OFF5iFBByN3ZkFEZtFl54ZV5UNeFc5KNyFTF0BtF4FjZ551NJFoF45ZZK5M58ZaZg5BNlFPFUZsFh5Q5DN45zFDZtZN5g5LZhFzZKZ25f5iZCF9NmF0ZeZuZR5JNBZZ5L5fNt5JZa5r5k5jZ15t5NZO5NNCZTFu5aFvNa5N5H54FsFuNnNwFa5YFq5jNINW5SFr59FYF2ByF9FkZ5Z0ZINqZj5nBuF9ZcF0NfFo5UFl5pN55YNSZp5yNKZY5U5rNxFhZR5mNmNONc5oNlBu5qFQ5PZU5mFhNBFaZsFE5sFaZ15p56ZeZY5sZQByFa53ZsNMNkZbNCZPBFFLFUFzF2F2NL56Ny5S5m58N9Z95S585AZFFKNz5xFSFkZdNQNDZNZ5NUZ35kNjFsNoNwZyFL5g515CNzFfZdZlZ0FrNa59ZqFN5qN652BB5YN2ZTNj5A58Z35aFd57ZZFANuZUFtNrZO5f52NVNSNtBu5H5SZaZ55qZEF9NJ5V56ZuFJ5bZ6NbFn5UFbNaNgZU5kNeNUNb585oFMZrZHNyNuFe585v5JN9FvNv5J5GZSF7Nq5JNM5pNFZJBy5QBy515hNzNWZ6NAFo5QNy5oNq5pZHNPZEFPNEFq5nFSFnZIFF5p5JFfN45BF8Z6Fy5p5YZWZpNc5VFO5YNjFaNQF85HN9ZFZtFLNpFlZPN7NrNjNEFlNCFyZj5nFeFg5PBN5GFnZANbZb5kBZNENhNuZR5AZGZU5uNIFWZbZbZG575IZdFtNoNS5lZpNANIFrZdFOZwBtZPFbFBNoNOFHZSNcNPZSZd5XF3ZcNUFlNiF7FvFhF8Z6ZcF65MNk52545xZaZoZMZV5x5NZo5PZIZIN75gFhFbN75L5j5W55FxNR5M5k5E5mN2ZPNQZw5DZB5ZNONjZpFmFHZ9NjFRFo5n5C5b5HZ7FgFI5aZOZwZD5rZdFXZgNCZTNj5bZ4Fh5a5jFQNwN8NnNJ5aZB5J5VZ4Nh5oNyNKZqFNBN5vNBF057ByZBNvFSBBZANANrZCZRFOZfFPZPFKZEFUZO5uZxNkNh5JZT5EF15iZ5Z9NZZNFpZ1Fq5KNEFIZBFeF1ZONfZn5YNnFZFy5oZzZCBuZHFXZHN8FwFcZn5v505i5ZZi5H5I5tZl5eFEF7FCFM50FDZLNPFcF0ZpZxF55i5KFENw5UZANZ53ZXZ6NR5s5FZA5sZyNAZBZSZdFwZdZ3ZnNkBBN4N0ZbNbZGZk5dNXFlF95IFnFiFgFSZc5CFlNsNuNLZgFy5aNcNd5NNxN6ZsNsFGNSB5N1Fp55ZhNhFZZ7ZsZS5aNBF85kNCNaZeNi5n5PZC5TN5NbZGNN5bZR5ANmZ9NmNhF8ZAF15DZuZINPZwZlZd5XZgNPNrF4F05J5VBuZ8N3FzZKZFZpZyZJ5OFtNwFtFr5GFCFyZi57ZENlZ554Z5Nu5cFT5LZfNS5HNk5TFAFg56NJZaF95L5eFuNI5HFpZn5OZG5PZVZYZIZgZH5z5vZxZRNrN8NXZPBuFtN2FlNOZCNa5qN3ZtZgN25aZ8NR5nBu5FFyFPNl5F5mNsZoNwFaN7ZDNKZkBtFVN9NaNDZiZFFHNjZ3N15JZkNwNXZy5G5n5o5yNJFcZp5sBBFTFVNTZQFRNrNd5xZeNzN55TNxNVNZZS5M5y5Q5nNjFpZUNfZCZsF75k5i5VFA5KZn5uZq5yNjZv5FFO52FjNQNaZZNbFRNiZdNiZVBNFcZ8FCZ75gFH5P5QNLZz5pZ7Zh5bFj5J5OZbNB5z5DF1NP5j5QN1NRZ95f5uBu5jZ4ZvZ0NHFi5vNZZnZ8ZHZsNhF05oZr5aFgFHNr5dZP5qFsFFFJNdFxNBN0ZR5RFaZhFC5kZG595O5SNGNV5zFoZ9NqZZ5wZcZaNhFg5jZWZ4NyN3ZbFxZGNL5YNAZL5O5MFu5FZcN0Z65kFdZ65eN1ZPFkNhNuF6FB5oZlBNZx5s52ZEFcFGN5ZN5BBB5sZlNpF3ZVZUFyZPZI59NGNwNn5UFgZU5DZRZvZT5iNnNsZEF5ZT5t5uFJF5NNN65OF9N55uBu5JNSFpFoNABNFnZjZNFlFt5lNu5WNOZyNaFGF2FL5sFxF4NuZtNXNaN3ZeFZNINUZ55xNCFRFIF4NpN55SFwZa5LNyNYFmNG5Z54Fp5nZ65oFvN3Z2Fo5eZJFKF15gNTNbBNFt54NJBN5NFW5JFQFkFKNZ5r5ANH5HZH5fND5KZRFdNW5D5h5QZiNKNEZwF9BZZiZtFGZOZvFvNPZvNnN1ZGNQ5PFxNzFzZmFmFzZxZ3Nu5M5o5eNRNzFKFY5dZlZbFYBZFFZANJZPZsFuNlFJZTZRF3Zb5m59Z7ZDFP5SZs5hN5BNNcNXNA5U5LNYNCZrFpFpFQFONIZIFPFc5hNN5v5HNLN8NSZgFxNnN2NO5dNm5cZlZSNXF9NCZkZeZqFL5nFvZj5ANsZBFuFZ5fFl5zBtF8Ns5SFKZhBt5yF95oZVF3F15eByNlFE5lZs5lZVNz5BZxNQFuZkFc5HNINqZTNGZa5xFINVZeNIFoNiNJNKNtF85PZGN1NCZeZfNWNgZj5kFdByNdZwBu5DZqNENCZNF8Ni5zZ9FaN0ZaZNZJNrNdZc5VB5FPFlZPNcZsZeZdFAF85bZfNZFRFhNZN6NpNK5UZC5PNu5K5cFyZU5oFOF4FFZpZN5iFLN0FW5ABNFo55Nu5G5HFLZbFAN4FkZGBtNVFP5PBZFpNK5o5ZZGZlZ45QZGNF5dFL5V5m5E5eFXFn5qNyN6Fn59Nj5wNxZ4ZOFY57NmNF58Nb5YZ055ZJF15q5qZ8FG5eZY5U5WNPZ6NvNENKZ8Nv5CNHZRN7ZkZv5pFt5JNWBF5UF0ZhNT5ANTFQ5fFa5x5qNH5L5AFr5HFMNANxN75JZRF85G5557Fc5GNu5mN8NFFg5lZtFw5B555f555R5FFH5UBFFqZ1ZX5vFrNWFnNu5n5sN05HFXZj5KZ4Nn5ZFSFEFPZbZPZTZZFkZQ5uZBZy5aZ2FYN15K5KNIFVFQFaFI5SZt5lBZNaZUZI5n56FgZONuZVZe5HZwFONp5yZCZV5pFu5dNWZIZlF1Fv5l5qFGFTFUN7Nz5TNsZdFuZ7ZUNzZYNBF3ZXZUFVNYFZNMZ8N4NJFuNuZxZBBN5UNsZ9Z05lZo53ZPZpZFFs55FgNK5eZPFONrZTNJFENH5w5jZXNKZA55NoZeFENlZrNF5GZ5F1Fn565JFR5cZm58555RFqNkZqZQNr52Fl5Y5YFbFYNg5jZ2ZNZiBNZd5bNJFEZaF1ZRNT5EBNZoF2NrZQNuFVBZZeZsN2NnFxBtBZZgN9FKZsZb5M5pNeFwBNZr5hFQNCNfZjZDZaZKZ45X5Q5nNFN7ZIZmFSZcZnFBZgB5F3Fa5tFo5eZ6F8NV58FYN9ZxNm5UFLNsNLZc5P5c5sFxBtBtZHZuNu5sZKZqNf5BZE5QZ55JFQ5JFhZnN4FP5BNE57Z35eNkNcFcZ2F6ZIZj5s5qFqNANXNjFFN8ZHFXF3NiZ4ZW5SNPZVNjFX5V",13645));
    CRemoteDesktopRouter.prototype["onRemotesSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",15504));
    CRemoteDesktopRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",17408));
}
