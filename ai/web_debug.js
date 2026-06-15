import { readFileSync, existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(SCRIPT_DIR);
const COOKIE_FILE = join(SCRIPT_DIR, 'cookie.txt');

function getPassword() {
    const candidates = [
        'Main.json',
        join('desktop', 'Main.json'),
        join(PROJECT_ROOT, 'Main.json'),
        join(PROJECT_ROOT, 'desktop', 'Main.json'),
    ];
    const file = candidates.find((path) => existsSync(path));
    if (!file) return 'artgine';
    const json = JSON.parse(readFileSync(file, 'utf8'));
    return json.password ?? 'artgine';
}

function loadCookie() {
    try { return readFileSync(COOKIE_FILE, 'utf8').trim(); } catch { return ''; }
}

function saveCookie(val) {
    writeFileSync(COOKIE_FILE, val, 'utf8');
}

async function call(base, path, params = {}) {
    const url = `${base}/${path}`;
    const cookie = loadCookie();
    const headers = { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(params) });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) saveCookie(setCookie.split(';')[0]);
    return res.json();
}

const [,, baseArg, cmd, ...args] = process.argv;

if (!baseArg || !baseArg.startsWith('http')) {
    console.error('Usage: node ai/web_debug.js <base-url> <cmd> [args]');
    console.error('  node ai/web_debug.js http://localhost:7000 login');
    console.error('  node ai/web_debug.js http://localhost:7000 push <url> [ttl=60] [logSize=100]');
    console.error('  node ai/web_debug.js http://localhost:7000 exec <sid> <fn> [args_json]');
    console.error('  node ai/web_debug.js http://localhost:7000 logs <sid> [fromOffset=0]');
    console.error('  node ai/web_debug.js http://localhost:7000 list');
    console.error('  node ai/web_debug.js http://localhost:7000 remove <sid>');
    process.exit(1);
}

const base = baseArg.replace(/\/$/, '');

if (cmd === 'login') {
    const password = getPassword();
    const r = await call(base, 'auth/login', { password });
    console.log(r.ok ? 'ok' : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'push') {
    const [url, ttl = '60', logSize = '100'] = args;
    if (!url) { console.error('Usage: push <url> [ttl] [logSize]'); process.exit(1); }
    const r = await call(base, 'playwright/push', { url, ttl, logSize });
    console.log(r.ok ? r.sessionId : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'exec') {
    const [sid, fn, argsJson = '[]'] = args;
    if (!sid || !fn) { console.error('Usage: exec <sid> <fn> [args_json]'); process.exit(1); }
    const r = await call(base, 'playwright/exec', { sessionId: sid, fn, args: JSON.parse(argsJson) });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'list') {
    const r = await call(base, 'playwright/list');
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'logs') {
    const [sid, fromOffset = '0'] = args;
    if (!sid) { console.error('Usage: logs <sid> [fromOffset]'); process.exit(1); }
    const r = await call(base, 'playwright/logs', { sessionId: sid, fromOffset: parseInt(fromOffset, 10) });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'remove') {
    const [sid] = args;
    if (!sid) { console.error('Usage: remove <sid>'); process.exit(1); }
    const r = await call(base, 'playwright/remove', { sessionId: sid });
    console.log(JSON.stringify(r));

} else {
    console.error(`Unknown command: ${cmd}`);
    console.error('Commands: login, push, exec, list, remove');
    process.exit(1);
}
