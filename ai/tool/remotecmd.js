import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createApiClient, login } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));
const COOKIE_FILE = join(SCRIPT_DIR, 'remotecmd_cookie.txt');

const { call } = createApiClient(COOKIE_FILE);

// HomeURL = <주소>:<포트>/<기본경로>/proj/.../Home.html?path=...&RootPath=...&RootUrl=...
// 기본경로(예: /Artgine)까지가 API 베이스. RootPath+path를 합쳐 RemoteCMD/Exec의 cwd로 사용한다.
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
    console.error('Usage: node ai/remotecmd.js <HomeURL> login');
    console.error('       node ai/remotecmd.js <HomeURL> cmd <콘솔 명령어 그대로...>');
    console.error('       node ai/remotecmd.js <HomeURL> remote <토큰>  # 토큰으로 세션 인증');
    process.exit(1);
}

if (!homeUrlArg || !homeUrlArg.startsWith('http') || !cmd) usageAndExit();

const { base, cwd } = parseHomeUrl(homeUrlArg);

if (cmd === 'login') {
    const r = await login(call, base, PROJECT_ROOT);
    console.log(r.ok ? 'ok' : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'cmd') {
    if (rest.length === 0) { console.error('Usage: cmd <콘솔 명령어 그대로...>'); process.exit(1); }
    const rawCmd = rest.join(' ');
    const r = await call(base, 'RemoteCMD/Exec', { cmd: rawCmd, path: cwd });
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
