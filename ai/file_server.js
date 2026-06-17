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

// HomeURL = <주소>:<포트>/<기본경로>/proj/.../Home.html?path=...&RootPath=...&RootUrl=...
// 기본경로(예: /Artgine)까지가 File API 베이스. RootPath+path를 합쳐 File/CMD의 cwd로 사용한다.
function parseHomeUrl(homeUrlArg) {
    const u = new URL(homeUrlArg);
    const segments = u.pathname.split('/').filter(Boolean);
    const basePath = segments.length ? `/${segments[0]}` : '';
    const base = `${u.origin}${basePath}`;
    const rootPath = u.searchParams.get('RootPath') ?? './';
    const path = u.searchParams.get('path') ?? '/';
    const cwd = rootPath + path;
    return { base, cwd };
}

const [, , homeUrlArg, cmd, ...rest] = process.argv;

function usageAndExit() {
    console.error('Usage: node ai/file_server.js <HomeURL> login');
    console.error('       node ai/file_server.js <HomeURL> cmd <콘솔 명령어 그대로...>');
    console.error('       node ai/file_server.js <HomeURL> remote <토큰>  # 토큰으로 세션 인증');
    process.exit(1);
}

if (!homeUrlArg || !homeUrlArg.startsWith('http') || !cmd) usageAndExit();

const { base, cwd } = parseHomeUrl(homeUrlArg);

if (cmd === 'login') {
    const password = getPassword();
    const r = await call(base, 'auth/login', { password });
    console.log(r.ok ? 'ok' : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'cmd') {
    if (rest.length === 0) { console.error('Usage: cmd <콘솔 명령어 그대로...>'); process.exit(1); }
    const rawCmd = rest.join(' ');
    const r = await call(base, 'File/CMD', { cmd: rawCmd, path: cwd });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'remote') {
    const [token] = rest;
    if (!token) { console.error('Usage: remote <토큰>'); process.exit(1); }
    const r = await call(base, 'auth/check', { token });
    console.log(JSON.stringify(r, null, 2));

} else {
    console.error(`Unknown command: ${cmd}`);
    console.error('Commands: login, cmd, remote');
    process.exit(1);
}
