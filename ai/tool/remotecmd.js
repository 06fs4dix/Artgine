import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { createApiClient, login } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));
const COOKIE_FILE = join(SCRIPT_DIR, 'remotecmd_cookie.txt');

const { call } = createApiClient(COOKIE_FILE);

// HomeURL = <주소>:<포트>/<기본경로>/proj/.../Control.html?path=...&RootPath=...&RootUrl=...
// 기본경로(예: /Artgine)까지가 API 베이스. RootPath+path를 합쳐 RemoteCMD/Exec의 cwd로 사용한다.
function parseHomeUrl(homeUrlArg) {
    const u = new URL(homeUrlArg);
    const segments = u.pathname.split('/').filter(Boolean);
    const basePath = segments.length ? `/${segments[0]}` : '';
    const base = `${u.origin}${basePath}`;
    const rootPath = u.searchParams.get('RootPath') ?? './';
    const path = u.searchParams.get('path') ?? '/';
    const rootUrl = u.searchParams.get('RootUrl') ?? '';
    const cwd = rootPath + path;
    return { base, cwd, origin: u.origin, rootUrl };
}

const [, , homeUrlArg, cmd, ...rest] = process.argv;

function usageAndExit() {
    console.error('Usage: node ai/tool/remotecmd.js <HomeURL> login');
    console.error('       node ai/tool/remotecmd.js <HomeURL> remote <토큰>');
    console.error('       node ai/tool/remotecmd.js <HomeURL> cmd <콘솔 명령어 그대로...>');
    console.error('       node ai/tool/remotecmd.js <HomeURL> upload <로컬파일> <원격디렉터리>');
    console.error('       node ai/tool/remotecmd.js <HomeURL> download <원격파일경로> [로컬저장경로]');
    console.error('       node ai/tool/remotecmd.js <HomeURL> restart');
    process.exit(1);
}

if (!homeUrlArg || !homeUrlArg.startsWith('http') || !cmd) usageAndExit();

const { base, cwd, origin, rootUrl } = parseHomeUrl(homeUrlArg);

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

} else if (cmd === 'upload') {
    const [localFile, remotePath] = rest;
    if (!localFile || !remotePath) { console.error('Usage: upload <로컬파일> <원격디렉터리>'); process.exit(1); }
    const data = readFileSync(localFile);
    const b64 = data.toString('base64');
    const name = basename(localFile);
    const r = await call(base, 'File/Upload', { path: remotePath, name: [name], data: [b64] });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'download') {
    const [remotePath, localPath] = rest;
    if (!remotePath) { console.error('Usage: download <원격파일경로> [로컬저장경로]'); process.exit(1); }
    const fileUrl = `${origin}${rootUrl}${remotePath}`;
    const res = await fetch(fileUrl);
    if (!res.ok) { console.error(JSON.stringify({ ok: false, msg: `HTTP ${res.status}` })); process.exit(1); }
    const buf = Buffer.from(await res.arrayBuffer());
    const savePath = localPath || basename(remotePath);
    writeFileSync(savePath, buf);
    console.log(JSON.stringify({ ok: true, file: savePath, size: buf.length }));

} else if (cmd === 'restart') {
    // /File/Restart는 인증만 확인하고 현재 로드된 settings.json 그대로 서버를 재기동한다
    // (CFileServer.onRestart). 세션 쿠키는 login/remote로 먼저 확보해야 한다.
    const r = await call(base, 'File/Restart', {});
    console.log(JSON.stringify(r, null, 2));

} else {
    console.error(`Unknown command: ${cmd}`);
    console.error('Commands: login, cmd, remote, upload, download, restart');
    process.exit(1);
}
