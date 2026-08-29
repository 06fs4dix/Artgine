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
    CRemoteDesktopRouter.prototype["onScreenshot"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",3530));
    CRemoteDesktopRouter.prototype["onInput"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","F5ZBNB5z5BZQZjNtNZ5FFr5kZtN5FhZHNkFlZ7F2N2ZjZeZVZlZnFpF9Zv5IFd5VNLBF5AZ9FCNUN5FCNt5V5qFvNKNrFjNHFlZ3FIFmZxZj5KFc5o5hNQNyF7Zn5yN0ZfFt5mFeF9FXFL5AN1F6NS57BZ5TBuFlFnNnByZKFH5E51ZdFmZtFPNCN657ZPNoZO5359FcNWNnZ4NBNAF9NN5MZTFY58ZW5GFhZ65JN2Z3NwZBNDZEFJNO545nZz535t5gNOFI50ZX5VFnFGZaFTZz5w5VNpFJNYZtFFZF5iZcZLNlZ5FT5hNcNI5uNoFqF9Fp5dN5ZqFqZ7ZU5kZ5ZrZUFIF7NgNC5cFyZ25jNLZeNyNiNZZA5xN3NSZjNrZBZcZlZMZpBZ5C5U5wNxNYFr5ZFa5rZJ535PF9N0NR5LZN5mF1NpNcNZNRNFNZFY55FFZN54NbNfNONA5SFa5m5XZjF1NCZe5L5tFv5fFJ5EZLNtFrNXFGZBZx53ZVFQFD5TFIZjZ1FH5BFCNlNW5UNZ50ZS5NFpNUFc5OFvNeFV5SZyZlNZZ4ZCFU5DFqZgFsNMN352NA54FEFwBN5fNW5KZFN6FT53NZ5KZhNHFfFM5GZe5gZ5FrZNFcFrNXZyZdFp5cZ2FM5zZlFw55FLZtNoZz5aNgF2ZOF7FtZTN25C5fNMN3F9ZBNOZh5RFdNhF7FPNi5OFwNl5zNpFdZ8N65SFt5rFAFjZ9ZW575gZZF8FlFIBuNxNLNgNmFoFpFDZ45EFAF6ZDZONxZMFu57Zc5xFqB55w5GZl5wFYZkZu5WZfFZZ8NuZsZ1ZVNBF4ZYFG5e595hFgFjFYNcZjNUFA5CBy5L5d5bFBZRBuNJ5d5tZyFuNr5rZtFN5nZmNQZqZ6NI5RFBZ1FgFL5cFpZ3Z6NWFJ5TNt5FFe5eZKZYFE5jZSFh5X5KNABNNXZrZVF4NH5lFHNaNQNaFoFFN658F8ZfFI52FuFINQZ0NL5kZPFWFeNW5XZbN3FDZd5LZQNNF7FlFq5e5oZ75f5WFt5T5vNCZFZZZFZ55mNsNRZyNBFy50FjF1FWNqZN5qFxBuFt5J5MFfFy5H5I56Fr5e52ByNPZpFeZJ5dNQNmByNaNiZq5mFhZeZg5dZCZVN55QZaZRZ45dFXFGFINs5s5zFqBN5j5K5X5iF1ZwZZ5lFKNF5UZuN352BuNmZuFh5uZG5NBBZVZyFA5HFqZoFZZtFW55ZZZT5lFQNtFkN651FkNTNFFCZvF5FrFU5hNFNhNLFIZiZo5PNQ5RNuFJZqFAFYZLNqFaBZZtZI545Q5NZjNRN1Z3NtF5F6ZLFVNVZL5NFoN35wZ6FYFBF1ZIFqZmZm5a5YZhZy5l5MNDFe5O5FFKNz5z5yNDZ65kFnNT5D5VFq5DZDZ3Fi53N35zZ8ZWFh5uZzFTNSF65QFQNZN1ZTZwZP5MNsFxZNNaNP5lFRZXNEZyN25qNW555CFxNHNWZDFoNCB5FZNpFcNEF65UF5Zm5b5uFFZ7NZZSNS5vZi5d5pFvZlZ2Zc5oZcFYF9NLFlFd5FZOFQNANd5vZWBtF6F3FXNvN7FTZd5LFEZnNjNxZqZpNHFFZ15p5rF6FiFvFiNJNbNE5mNJNC53NXNkZYZz5zNv5L5wZu5tZrZsFTNV5oZdZ5FVZRZsZJ5HNyZ0NbZiZBZI5m5AZV5W5iNlZT5sNSFN5yNnBBF3Np5w5sFZ5D5F595Q5ZZMN4NYZ1NnNeFeF35oZnZdZwFa5Y5WFM5GN05wNxNsFLNdFZ5AF85LFmZJFH5p535IZiZbFyFf5QFCZn5zFNFINu5eZc5VFkNfNMFMZ6Fy545M5pFQNbZyZoFXNDFSNA59N7NvNi54F6N1ZmFO5a5rZL5pZlB5ZFF3FvNNZb56ZpZB5ENQ5oZ5Nr58NRNBFdFoNXFh5y5q5YZTZHNrBNNQ5r5y5pZYNa5fZoFfZLNLFP5BZkNIN55LNJZKFf5ZZY5254NkZ5ZNZaZ25XZeFB5oZRNWB5NEZ9Fl575ENTZHNRFRZV5VFhZlZaNwNx5oNDF25H56B5FmNYNa5F53FFZRNEFc5GN8N4ZNFHNZF3ZuNcZrZn5nFsFn56Ft5rNOZxNMFT59NF5TZSZTZdNBNyF35d5JFyFc5kZ4F1FMFiZQ5sNjNuZFByNRBZFH5XZvFI5JZ7By545eNG5b5jNxZdFJ59NQN7FhNYZWZlNxFe5oZfZBFx5jBZN7NGZKZgZGZ8ZI5hNmNP5GNM5k5rZA5VFN5TN95uNzFOZcNPNDNsFL5oZ65mZX5ENC5jFSZaF0NDBuZxFnFJFgFtNPNVNYZCFWFc5YB5FZNpZqZVFoBNZtZeZC565G5cNAZUFqNG55Zt5mFbFHNjNlNrNZ5f5M53FSNwZPZwFCNONzF55VFmFaF35GFsBuNLFuNRBuZyFdNr52FCFv53ZSZH5vZFFdZX59Z4ZjZGZTF3N6FsZjZfZw5KZq5iFoZfZKFpZoFuNJZhNOFkNw545rNoZ1NlZHF9NyZaF155ZqNqNhZuFeZt5AZGBBFuNINVZ7ZrNE5gZSFGNZN35XNjZe5sZ3N2NkF95IFJ5r59FAZZ5lZ9FANZZ2Fh54F3BuFkFk54FgNkF9ZRNkFPZyZ65tF65TZyFx5LNlNO5ON4F35DZCZmFD5j5HNZZy5m5gN6ZHZCZ45QNS5SFxZnNIZzN55VFlZQZgZG5hFvFsF0FFZgZwZuZSFSNMZ55RNyZ3ZqFcNZ5AN6BuFfNoZVFG5zZIFgNeZjFyZ0BF5lNbFmFxFvZwNUFC5WZc565g51BFFINg5n5KFX5kFN5RZa5gZSNk5mZBZGZ9ZtF5ZtNxFNFnZqNfZlFkNfNxNTFX5m5hNWFWFcN9ZiZ35BZg5OFfFHFhNiZUN7NHZ25FNtZNFM50FK5xNJNwFDZpNtNzFtFvNhFpNDNr5r5n5bZvNpNHFF5aNbF1FUFj5MNpFO5pBZFf5Z58NU5H5bZxF059N7FZ5qN5FbFiNCFfFIZBN0ZJFaF05h575UNEFa5t5wNIZlZ3FZ5lZjFVZUN9ZPN8Z0F6FZF55KFpZCNO545p5KFqNHFK51NSZVNH5cNQNfZeNaZEZ6NiFpFVZRZlFSFR5gFwF95CZ75F5zBuZlFKBBZJFpN25oZkZh5SN4ZsNqFDZCF2ZLZ3NMZZ5YNfFcZZNyF85WNb5eN85eNk54ZVZ45zNJFyNWNHN35X51ZzFPZAZ2NlNxFGN0NT5FFZZSZjN8ZxNg5FFoZR5gZzNtZnNiBNFM5MNvFUNTZKNAF8Fu5lNcNpBFZmNJFfFiNENbZPZdNB5pNE5D5cZ8ZbZw5WZn57FdNdN25GNQ5pNiF7FI5AZkNoNI5HZr5GNzFwNrNBFiNaBtZEFhNuNmFiZ7FAN5BtFUFbNpZ05DNDZHZv5uFdFnFgNABFF65CNlFX5kN0ZHZNZ3ZxF9ZMZsF6FU5ENRZr5vZkNjZeNDZo5kZd5gNfFvNMNRZRN857ZDFO5b5xNO5vFIZc5mNfFwZB5wZd5uFyFFFNZaF7NrFgZcNDFWZiNhZLFlZ15DFtFp5mF3FM5ONoFo5P5VF4ZX5eNOZiFDZWF0FlFCZrZr5g5sNTZK5F57NiNFNNBFNK5a5RNN5gZKN9F25J505MBNZSF1ZS5tZnFk5VNwZUZm5DNdFnNZ5sZj5fFyZmFRZ35cFvZTFb5wNsZiFCFVNYZqZLFYF4FMZ3ZJ5mNEF15h5KZiNENy5MN0FIFx5JNOFzF75DNhByN7F65Y5sNPZb5y5hFiZYFWZ6NVFc5TFqN65bF2Zb5l5CZ3ZaNFF15DFoZ4ZQZnFQNwZJZ65iNwNv5qZ2N8ZFFsFYFVFUFtNf59FZZJZVFsZk5RFsFGFGFeZbN95t5lZtNNZZFENhNH5P58NNFVFiFdNQFfNL5i50NJF3ZzNiNwNkZw5AZcNp5SZI5zF95MNANw5RNlZONN5DZDN7ZyZFZANQF35z5EFrFU5J5H5rNeZaFLZI5vZFZDFyFVNu5vN9565CN1NlZGZYFJZF5LFD5QZn5DZ4FcFoF3F2FsZ45pZtZZNfNJNcNH58FmFlZwZ0NbZPFDZDBBFpFdFJBNZ2575OZhFO5jZ1NBZf5lNWF5NlNsFYFmFkFnNvZRFYNXFpZQZY5l5XZA5RNR5FZdNhZpNLZWNcZHFP5yZh5yFh56NoNuNuFsZ3N1FFNEBNZE5wNpNhFeZd5bFdNd5CN75yFyZxNAZ2FCFBNiZP52N3ZMFtZm5K5EZCZ2Zo5kZa51NTZiNV51ZTNdN65D595SFwZvZa5YF9FO55NW59NaNvZNNd5tFlNRZtBB5KZAFnZxZZNEZv5OFU5JZ0B5NhFiNe5lZWZd52Z6N8NCZUNh5o5xF5NI5MZXFwFzNjFyNeZJNoNNNX5gNMF3BNZzFLFg5HFGN0NeNrFWF2NsZRFeZYFrZz5z5KFDZwFnZ5NX53ZNN4ZiZqNZFeNEZINoFv5RZKFTFAFTF5ZGNdZIF4ZYZqN0FWFxZzFn5kZ3ZCFGZKN0FbFA5rZZ57FgFPZn5QNQNKFjFxZf5yNWZSN550NSN75B5s5XNEFUNwFL5tF35UNWZjZE5RZT5mZ6Zo52NCNYFhFu5VZZZnZcNNZdFk5bNbZdN0NOZw5a5q5bFoNxFWFTZHN3NB5M5SFtZjFQ5GZqN1FVNJ535Y5tNEFB5OZpB5ZEFpZZZ35wZhFYZAZ5Z05kFeFCFvNHN8Z0ZqZoNmFb505NNZ5DF0ZDZqBuF75UN0ZaNaFmFOZUN2FJ5X5y5z5S5HZhNeB5N7NrNrF4FuFgFqZoNHZ0NVN3ZC5DFQ5k555D5vFbNZFmN2NFNeF2ZtZiNm5MNwFUNrF1FJ5JFrFyZzB5NsFxZJZ7FcZjFyBuFw5H5ZZB5JZ7FCFjN7ZL5Y5n5sFsZ1FGZX5gB5FP5XN2Z8ZHZlFRZINcFVFNB5ZKBZ5gZG5INdNxNTFhFbB5FuNENA5WZvZ655NkNqND5vZDN1NoF8ZbFO585vFo5cZXZ3FCFW5WNB5cNA5eZ3FUNQZoFm5SFgFR5fNtNvNsFC5pNAFbZb565O5BF75CNtNEZmNIFs5y5lZBNN5RNlFHNcF9Ft5nN2FuFZF8FxZwZmZMZyBZZZZ95dZd5LZb57NHNW5tF6FUFuZYFt5j5cBFZn5DZsNvZSN9Ny52Nz5P52N3N2ZSNEZ4Nr59Zg5R5nZiN357NpFdZNNzZlNtZc5uNsN2NK5GZ9ZHNaNHFUZ8N5ZlZO5mN8ZU5YZtFTZZNRNFNFNTFp5UZj5GNy5yBuFDNPFYNMNRZd5UNH5bFwNW5ANu54ZzNd5PFGFzFy5XZKFqZ2NdZE59Z1FtZoZWNdN7ZLNBN1F951FsZi5RNWZkFd5oF3NB5X5fNMZVF5FQNs5IF7Zf54ZS5pZl53ZAFH5aFXFbFRZ3FeNRNGNKZiF4NQ5gFCZiNS5yFK5bNP5INEZ1FD55FxZe5IBZNEZgNMFrB5FeF6FPFWZxZ5FH5R5pNJZx5zFoNrZpNV5gFtByNPNuZ657FP5g54NNNfZM5PFfZPNPZzZxZS5YNJNOZ5NhZiFENM5pF9NT5LF9ZmZCN4FEZCZpF7NuNz5VNSN6Nu5xNk5QNjNNNPN65i5nZo5O5w55N9F85kFB5f5UNtZ2NfNk5c5EZFFLFRZG5zZq5b5v5dZOBtZEZPNJZBFKZNNg515DNlFxZX56BtFQFv5hZxZh5eZk5WN65V5xZ85G5oZp5T51NV5uBt5NFm53Z7ZHZyZINWFINn5u5G5lZpZ5NWNRFHFHNENE5lZgNKZUBFFL5BF4Z85H5sFk5B54ZDFPFLFZNCFLZQ50BFNjFn5DZMNPZM5nF8ND5mNwByB5F5BF5dF15rZTZpFz5XZRFkN6ZxNnNHZbFMNh5MF6FINjF5F8NVZKFxZMZ9FLZXNe5xBu5wZzNmFM5ENv5U57ZRFQFGZ8ZONLZHF1ZJZM5vNE5xFDFtZDFu5kNq5z5a5jFvFtN1ZlNjZQFTZl5oN7NTNyF9ZGN3Zj5S51Fo5f5SNtNFFKFYFwNA5AN1BNNaNkZsZtZz5M5HNPZKF1Fo5X5HF9Zo58NT5fFL5hZTFIN7FkFr595J5hFyFlN25rF0ZXBtNF5fNRZcFt5k5BZXFnFNZZNdZfN7ZhFA5ANXZxFQFPNMFDFo5yF4Ff5rZ9NQNgNoFDZwFlN8ZnNAFHFeNzZeN7FnZnNxN7NBFdFcFXFJ5PZSNUBtZeNRZ7ZANBNwZ8FGZnNDNR5cZpNUFeFdFq5QZiFkZXZMZA5jFZFoZ6ZkNPFv51FtFGFl5mZRZLZUFsNvNE5o5H5FNWZFFAZUZBF2ZnNlZnNP5d5V5JZt5jZMNJNRZ15IZu5zNO53NgZSZ0F9FaNXNUZOFz5FFUZ65nFQ5LFvBNFCFnZFNe51ZHFX5pNJ5QNlFfZQ5CFCFr5n5EFTFdNs5mZxZbZJFyNxFCFsNhFIZdZgNDZB505V5fNNFdNxFTFTNBFgZbFKFe5gNNByFuZGZEF45ZZuFIN1Z9ZLZ45oZGFZFDZwN05w5BZdZE50NkBFN9F95O5s5Y5W5aZ3FSF5Z85K5KZTZjNnZBNg5L5HFsN6By5rFvFlFWNXZO5QZTZs5PFb5KFiB5NRNzNnNQNPFU5uZiFOFEFi5X5i5q5SZRNZNDN5ZnFqZ7N15VFLZRFENgFoNHNwF2NONVFk5DNVZ6F45G5qNVNzN3NYZiF7ByNX565nN0NVZSZT5uFOF05I53NtFfZ058FZNdNHNpNuZJ5AFEZYFCN1NrF4FRNS595G5F5IFO5m5f5bZZ5L5mF9BF5p5aFVF357ZxNR5TZdZG5mF0N8Nm5jFINSZtNM5m5ABB5jFJ575DZONYZQZHF6ZjZ85v5aNkFHFdZANn5FNh5zBBNDZ5FQZRZGZrZxFIZmNjNkFnZ3FAFJ5u5VZs5AFu5f5wN85NZIZv5OFRZJ5t5jFO51Fx5MNm5mNP5FNa5dFn5HZ55IFoZjF5ZGN6NF5r51Zv5Y5Y5XZ6FN5YFNZRZs5fFUZa5wZZFc5ZFwFOFiZlNDBu545hFtZk5cZcFnNM5lZUNCZjZM505bFUNBFLNdFtFCFR5uBuFt5758NM5lF7N7FsZiFGZLZcF15EFA5xZ7BtZI5kZOZhZj5OF7Fd50NB50NuNeZ7N7FSN2575t5yZbZsNvFd5HZ1Nz5TZvByZRFLZqNWZoFXFbBFNb5oNTNQZnF0ZtZDZ5FX5S58N8FPNZZjNEF9ZDFx5mNKZG5DN2FkBFNKZN5aFiZdZkFM5qNDFcNv5sZtNaNpFAZn5LFj5JNZFJNKF0ZzFIFU51Fd5tFUNT5z5gZBZR5tZIZY5MFZFGZC5GNUFIFvFvB5ZeNeZMNYZsFF54F8Zi5TBuNr5dZk525a5bFgZIFK5YZEF5ZJ5aZz5ZZTF4F0ZtFEND5Y5dFFZ05iNUZDZb5IZXBuZPNUZgNiBu5aZbZoZG5WZjFSBZ53NRZTZfBtFgZrF1B55b5AFuNeFS59F1FWN2ZABuFNFSF4ZAFFZRF0FABNFX56Nj5RZfFX5aNoFpFxZuFL52NQBuFTZ8F2ZpNO5e58ZkNtBuFoNUFs565IFCZdZlZTZMZQNfZWNvZVNUN75mZY5HNlNJBNZfNNFGF15p5SFRZEFkFrZZ5i585WZLFKFDFdFI5pN9NqFzF2FiZf55FS5rNuFPNhFh5rFH5SZ7Ff5P54ZUZ6FIZeZNZkFuZl5bZ3ZeFWFkNcN2NY5WZrF5FeZPFa5gN6Z7F7525bFIFp53Ny5SZmNOFCF2F8ZhZuNXNdZIFHNcZS5xFiFN58N35UF5ZHNZZPZVFaZAZFF2ZAFjN8NN5WBtNaZIFG5c5YNGZOZtNYNe5h5I5c5eNYFXFPFoNTNVNNNqF3Fn5wFJNt5ON456NHNZNX5DZ7NAZiNpFk5uZUNQ5lF0FXN5ZW54FlNfNV5nFD5E5jF2FzNH5YFLZaNEFO5s5i5Z5z5a5lZCF85pNWZV5AZp5K5ANBNENy5JZtFgFgZO5x5sZ7Z654FOB5ZK56NuFf5vNpZ6FlNGZp535jFeZINyZdNONk595iNkFGNoZWFQNgFoNWNeFIFTNbZh5OFVNMNuNDFyNNNp515EFwNQFz5tNOFsZ3NK56NfNeFWZDNsN7NT5PF2F8NuFyN75Y5oZHBZ5zFQFuZJBuFBFENQ5gFKNe50ZkFWZFN2FtZDFSBZZ4FXFNZ25J575QBtFoFZFLNPZYNIZaFl5E5uBNFCZkFVZwFlNJFQZqNmZOFiNx5RFZ5KNfFk5K575FNOFfZpZGZlNB5QZCFPFt5VNDZ1FkBZFYF8Z2FUFhNnZFFOZZFtN5505RF2Z4FH50NvFCZpFMN7ZE5VFKN4FCFNFWFXZFZuFaFjZX5wZbZdFV505JFXFGZrNRN65rZq5yZsNGNjNQ5D5j5eZ1ZfZo5BFVBF5jZGNB5e5ZZ0BuNS5eNE5ZFXNzNsF2FJZZFjFU51ZRN8FfNy5ENQ5E5JFlNlNn5UFEFNNuZu565BFpZGFTZ8ZaZbZE5yNXFq5OFcFwNB5w5vFAZKZx5hZqN8ZVZWZxNTNzFRZcZ7NJFx5cFx5T5o5aFIFVZe5mFh5e5WF4F2Zo565DZiZtFFZIZRFjFf5XZ9FdZCZKFJFrF65hZkFKFrZgNH5DFVFbNsNWFeNQ5bNxFM5oZrF4ZvBZNX5K5K5LNgZLNDN15jNUNbNfFrNY5aZRZsF1Nr50NW5DN5F7ZqZl5SNMFj5aNX5JZTZMZ4Fn5pZwFbNbNf535WN0Nd5TNBFSFkFZN95r5v5F575mZLNzN9FJZaFn5nFP5P5rZHFa595W53FwFYZBNW5s5y5fFDZrFfFR5O5fNk5wZb5IBt5O5VFvNf50FF5nNb5oNxByFfZpNz5DNZ5QZ9FI5hZ9Z4ZKFqFLBBZLNKFbFGFPF8FHNgNoF5ByNU5wB5NhZGN4FlByFyZONMF9F0ZDFnNS5c5sBy5jNH5d5B55N95GZdFt5iZfFCN1N5Nc5nFqZf5FZjNjZQNINrZQF5Ny5LFJ5rNoNA5XNLZ5B5N3N3F9Zj5wFfNnNeNCFg5KZZFtNcFtZqNsZu5kF2ZtNe5fBNZpZMNPNgF5ZqNbN0Fn5cFjFz5lZJF1NnZ65kZUNdNx5450B5NT5vFhNAZ3NJZ7FGZYZd5hZBZpZKFPZ3FjZvNTNxZqBZZ05JNaZJFTNiZ7ZeZNNMN3ZjNm5y5o5oNeNoN0FyNOZU5B5gNLF251NU50N4ZTZl5qZAZLZfNQ5DNj5hN7N9FT57FoNnZk5fNYF8ZlNON8ZKFN5wZ9NUBy5M5JZYZmFz51NpN35GN85uFQ5JZt5c5NB5ZRZlFeZFZ6NRZKNl5gBFFuZgFINHZ957NPNxZENhN25NZi5kFuZY5UF1ZqFkFQNf5DB55c5bFyFA5AFSZlZqFWF2ZcZMZVNa5O5tZQNLNmZXZrFmZcZ953BuFHZP5QFx5TFP5AFI57ZP5vZZFsNlFM5eZtFaZhZpNoFHZU5GFeZSFB5J56ZC5wNVFsZiZz5AB55nZSFcZ75LN3FTZdNzZ453NGN25IFCZeNT525vNu5c5RNsZq5zZl59NO5Z5R5OBBZQNnZVFr5rF050FwFVZZ5XZAF4ZqZQNUNJ5CNkFbBB53Zq5GFA5Y5tZ35I52NiFAFY5r57NfNiZDNEF6ZkZ35MZ7FsZ6ZAN5Z3NxZoFN5UN7Z05uFHNIZcZ9FqZlN1NOFUZINMZ9FUZDFzNV5SNr53FhBuN5ZhFYNs5nZOZB5vZXZoF4NCNeFEZKFy5MFEZ6NYNkFcFh58NHFwNkZCNtZDFp5Z50FGZwNNZ65SZNFENBFnZXZV5BFK5jFWBt5f5bZbFpFP5OZkZjNfF7ZKN759NwZLNEByNrZU5c5f535wZDZ1FKNINdNkZjF053B55AB55OZSN7FtFsZcZwZP5yFfNsNTZ2Zd5tZy525tNNZTZL5GFKNaFs50N2Nf5oFp5ZNjZ1F3FMZIFRN4FvZnFnN7NJBZZqFy5z5gF3Np5HFlFcNONuNyFI5FNF5ENN5JZRNFZ4Fe5v5UNiByZcZo5zZZNx5EFAZhBuNjZdZaFBN5ZI5YNT5e5ENyFPN05zN7Z9NrN2NINT5BZgFBFPNs5KNaNLFOZuBtZRNrNS5ENGZLZHZMFeNvBFFONjFINwNJZC5KNYFUNsZxNtFY5P5bZtZXN8Z3FeFEFqN8ZcZkN65oFqF25H5X5xFYZkNWBBZJ53NmZyNgN9ZP5m5pZpN3ZaFuFLZyNFBFN35Z5M5UFqZ2Nw5Y5xFfZt5xZXZlFHFE5VNo5HNaFtNTFQFhFXZ4FxZzN8NEFI5UNI5q59ZSZEZsNUFqFW5t5gFXZvN55HZBFgNBFn5k5JZTFZ5mZjFLN0FTNW5YZKBtNwNLNVFrNvZw5VBNN75yFAZJNUNBF9N55cNhF35sNLNBF7N85BZEZX5VZdZqNc5aZTF9FfNANfZSF6ZmZGN7Nq5uFWFJ5cFyFIZLZtZUFiZfZHZYNR5CFP5wNoFI5JNyFLFaFzNnNs5S5kNqNnFm5T5DZANoNxFsNr5hZ2NsN3NuFeZT5J5JBuZfNdNZZENUFhNYNWFsNRZVNHZVNIFnNrZUFeZ3ZaN65fFHZk5SNcZENcFS5pBBF3F8FhNoFTF7FNZOFRNG5xZeZGF0NNN1Z3NlNONzNYFrNI5O5656NFZlFFNqFY5F5RZhFn5zFDZFN857ZvN1ZEZcZR54FPZgBFNkFjFyNWFQNRN9NvZA57ZNZQ515zF3FwNFNl5hN6FiF4FT5YNzN05pZONwFV5QZa5EFo5nZnNK5c5R5759FFZdZ3ZG5V53NVZDZPF6NsZR5sFDNhZxF7FdFYZNZFF4ZmZU5vFIF8ZH5nNWZLFO5E5CNUNHFQFP5EFmN95p53FeZtZS5yBFN25qZdNz5LF05oZb52F2FRNMNOFeNiN45L5p5yNxFaF6Zk5I5nNs5AZuFENDFrN9FSNKZTZqZkFfZlNc5cFPZpZL5B51BN5TZ9Z25pNc5pNBFB5p5wFlBtZqFVF856ZWZhFrFS5o5l5pFPFiNuNeFeFeNEZ3NaF556FDFq5H5A5mFDNgZON7ZnZfBB5KFSN25BNbZqFgFrFHZdZi5EZ6ZNZC5P5HFQBtN5ZINV5pFf535sZdZUNaZxNJZv5oFHFJNxNI5tFaNkFdFkNV5y59ZRZ35aFe5gFdZFZ3F5NUNvN6NkZoZuZN5UZkNdFTNlFiNr55NdNbN75N5qZfF45pZGZK5JFZNLFXZ35z5LFIFYFRNp5dFo5JF05bNeFk5uNmFlFeZxZ8FzNp5l5YF2Z4NDZ0NyNrN85bNw5q5U5hN9NPZzNBNoZ8NYF9Z1Bt5p5GNgNMNsFPNjNQNUNONT5tFp5VZQF75l5cZaFn5hFTFeZuFzBtNuZ8ZcFl5oFFNzNOZfN7Z65F59N1NyNjZq5l59Z558FP5yNVZQ505PZaNeNRFz5RZU5dBBZL5aBuNM5jNJ5kZt57ZQZCFU5F57Zw5sNkFk5PZ8NEFfByZ655F5Zx5y5SZw5YBZFK5lBuN3FIFfNvZmFPZY5TNDNh52NDNLZzNOZmN3F15i5gF1Fm5a55FpNkZqZqFJNkN3ZvNxN0Nk525NZiZaZZFtNJNIFLN75nNjFXZm5tZwNxFt5M5MFP5WZiZTZkFX5DZtFUZ85G59ZN5YNE5CNrZINPNBZvNhFgNuZt5TF55u57ZYBy50FHNyFEFaNQZT5eNz5q5JZ3Fy5sZq5O5j5Z5TF9N6NsZoNRNjZPFD5J5GNOFRFNNAZj5IZxNAN3NY5VFWZTFg52FXFyZs5Z5QFE5DZzNq5nZuNQ51ZnZXZNZ4FdZ5Zu5LFmZBZLZPZFFbNsNL5F5CN5NGZXFu5rNSNy5GZbNdFX5iF1ZUFgNp59NGNcZCFmF45xFaZp5mFvN852FkBNNHF8FzF7Fi5DFLNINIZ2NUF4ZyZXNBFMFVZFZSFEZnNe5tZsZN5zFEB55rZdNuZO5OFPNpNTBZZmN4ZQNhBFNWNaZIZL5hN3Zp5tZhZiNTFKFhFvFo5759Fy57ZjN95GByZFNTZO52ZkZI5nZn5HFv5NFFFS5mFUFk59ZvBBNRNANoFnFUZRN8BFFaNBFsZBNMZH5RZmFAFrN8FH53NRNM5bFMFMFwN55hNJFk5LZzFiZ6NQZUNB5JNN5kBN5XNBN5NF5xF75Q5BZX5iNTFQ5zNQ5EZPNfZ0NZZrNgF2B5BZFlNhFyFiZbZsF9N1N9FwBuNOZdN9N1FbNtFtFTZ9B5BBF3FeZ95ZZeZjF654BBZYNkFEZ75SNR5t5f505P5JFAZBNU5UZ4FVZ6NtZlZYFhBy5PZ4FNFb5LFHZ7N5Zt5pZQNwZ2N4Ng5SZ4FWZlZN505jZuNhNz5xFQNSNn5rNS5b5KFb5EFc51Z6ZAN05DFyZi5bNhNXZCZJFtFC5W5AZo5bB55eNnZO5m59ZN5NNiZTZ0NPZbN95NNPFZZr5P5v5CZ4NgNcZpBtNqF9FaFXZH56Fg53ZFNcFrNf58ZT5mZlNtFEFpNuNiFqZKFaNqFkN4NyFfNqFpNINp5FNoFFFi5YNGFDNv5rZeZ9Zu5hZsZh5WFhBNFJ5N5T5RFSN2ZoZpZGZOZzZcFTNINgN6Z1NjBtFy5KNX5d5GBB5dNDN3FoZb5DN0ZqByZaNOFfNG5XFpZG5n5i58FCFoZCFCZ2FW515JFs54NRFtFIFX5uBuF85VN0FGZ3NCFRNQNvNcFGFSNPZrFS5ON4FwFxFbZqNDZFZPZZNPFM58F5ZVFIFB5jF5FCNq5s53535n56NnZI5aZkNcZu5XFpF7FQByFK5aFkNbZ1NlNH58Zk5WFENbZDFkN7ZYZo5E53NwFwBBFHNXZYFvNTFlNXFUZfFmNz5V5uFYFvZu",6098));
    CRemoteDesktopRouter.prototype["onCmd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",12553));
    CRemoteDesktopRouter.prototype["onRemotes"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",14820));
    CRemoteDesktopRouter.prototype["onRemotesSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",16785));
    CRemoteDesktopRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CRemoteDesktopRouter.js","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",18882));
}
