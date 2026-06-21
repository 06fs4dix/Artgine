import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createApiClient, login } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));
const COOKIE_FILE = join(SCRIPT_DIR, 'remotedesktop_cookie.txt');

const { call } = createApiClient(COOKIE_FILE);

const [,, baseArg, cmd, ...args] = process.argv;

if (!baseArg || !baseArg.startsWith('http')) {
    console.error('Usage: node ai/remotedesktop.js <base-url> <cmd> [args]');
    console.error('  node ai/remotedesktop.js http://localhost:7000 login');
    console.error('  node ai/remotedesktop.js http://localhost:7000 exec <fn> [args_json]');
    console.error('  node ai/remotedesktop.js http://localhost:7000 screenshot [quality=75]');
    console.error('  node ai/remotedesktop.js http://localhost:7000 input <key|mouseButton> <time_ms> <windowTitle|-> [x y [x2 y2]]');
    process.exit(1);
}

const base = baseArg.replace(/\/$/, '');

if (cmd === 'login') {
    const r = await login(call, base, PROJECT_ROOT);
    console.log(r.ok ? 'ok' : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'exec') {
    const [fn, argsJson = '[]'] = args;
    if (!fn) { console.error('Usage: exec <fn> [args_json]'); process.exit(1); }
    const r = await call(base, 'RemoteDesktop/exec', { fn, args: JSON.parse(argsJson) });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'screenshot') {
    const [qualityArg = '75'] = args;
    const quality = Number(qualityArg);
    const r = await call(base, 'RemoteDesktop/screenshot', { quality });
    if (r.ok && r.result && r.result.data) {
        writeFileSync('screenshot.png', Buffer.from(r.result.data, 'base64'));
        console.log('Screenshot saved to screenshot.png');
    } else {
        console.log(JSON.stringify(r, null, 2));
    }

} else if (cmd === 'input') {
    const [key, timeArg, windowTitleArg = '-', ...pointArgs] = args;
    if (!key || !timeArg) {
        console.error('Usage: input <key|mouseButton> <time_ms> <windowTitle|-> [x y [x2 y2]]');
        process.exit(1);
    }
    const time = parseInt(timeArg, 10);
    const windowTitle = windowTitleArg === '-' ? '' : windowTitleArg;
    const points = pointArgs.map((v) => Number(v));
    if (!Number.isFinite(time) || time < 0 || points.some((v) => !Number.isFinite(v)) || (points.length !== 0 && points.length !== 2 && points.length !== 4)) {
        console.error('Usage: input <key|mouseButton> <time_ms> <windowTitle|-> [x y [x2 y2]]');
        process.exit(1);
    }
    const r = await call(base, 'RemoteDesktop/input', { key, time, windowTitle, points });
    console.log(JSON.stringify(r, null, 2));

} else {
    console.error(`Unknown command: ${cmd}`);
    console.error('Commands: login, exec, screenshot, input');
    process.exit(1);
}
