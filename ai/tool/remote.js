import { dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { createApiClient, resolveLocalBase } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));

const { call, login } = createApiClient(PROJECT_ROOT);

// HomeURL = <주소>:<포트>/<기본경로>/proj/.../Control.html?path=...&RootPath=...&RootUrl=...
// 기본경로(예: /Artgine)까지가 API base. base는 그 서버의 세션 쿠키를 구분하는 키로도 쓰인다.
// RootPath+path를 합쳐 cmd/upload의 cwd로 쓴다. path/RootPath/RootUrl이 없는 순수 주소(예:
// http://addr:7000/Artgine)만 넘겨도 되고, 그 경우 cwd는 RootPath 기본값(./)이 된다.
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
    console.error('       node ai/tool/remote.js <HomeURL> login [비밀번호]                 # 비밀번호 생략 시 로컬 settings.json 비밀번호로 로그인, 있으면 그 값으로 로그인');
    console.error('       node ai/tool/remote.js <HomeURL> cmd <콘솔 명령어 그대로...>       # 콘솔 명령 실행(RemoteCMD/Exec)');
    console.error('       node ai/tool/remote.js <HomeURL> upload <로컬파일> <원격디렉터리>');
    console.error('       node ai/tool/remote.js <HomeURL> download <원격파일경로> [로컬저장경로]');
    console.error('       node ai/tool/remote.js <HomeURL> roots                          # 그 서버의 작업 루트(RootPath) 목록 조회(File/Root)');
    console.error('       node ai/tool/remote.js <HomeURL> restart                        # 서버 재시작(File/Restart)');
    console.error('       node ai/tool/remote.js <HomeURL> screenshot [quality=75] [monitor=0]');
    console.error('       node ai/tool/remote.js <HomeURL> input <key|mouseButton> <time_ms> <windowTitle|-> [x y [x2 y2]]');
    console.error('       node ai/tool/remote.js <HomeURL> exec <fn> [args_json]           # nut-js dot-notation 직접 호출');
    process.exit(1);
}

if (!homeUrlArg || !homeUrlArg.startsWith('http') || !cmd) usageAndExit();

const { base: rawBase, cwd, origin, rootUrl } = parseHomeUrl(homeUrlArg);
// base는 세션 쿠키 맵의 키이기도 하므로 여기서 한 번 확정해 모든 명령이 같은 주소를 쓰게 한다.
const base = await resolveLocalBase(rawBase);

if (cmd === 'login') {
    // 비밀번호 인자가 없으면 로컬(settings.json) 비밀번호로, 있으면 그 값을 그대로 해시해서 로그인한다.
    const [password] = rest;
    const r = await login(base, password);
    console.log(r.ok ? (r.reused ? 'ok (reused)' : 'ok') : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'cmd') {
    if (rest.length === 0) { console.error('Usage: cmd <콘솔 명령어 그대로...>'); process.exit(1); }
    const rawCmd = rest.join(' ');
    const r = await call(base, 'RemoteCMD/Exec', { cmd: rawCmd, path: cwd });
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

} else if (cmd === 'roots') {
    // 그 서버에 등록된 작업 루트(RootPath) 목록을 조회한다(File/Root, 인증 불필요). cmd/upload에
    // 넘길 RootPath를 모를 때 먼저 이걸로 확인한다 - roots[].path가 유효한 RootPath 값이다.
    const r = await call(base, 'File/Root', {});
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'restart') {
    // /File/Restart는 인증만 확인하고 현재 로드된 settings.json 그대로 서버를 재기동한다
    // (CFileServer.onRestart). 호출 즉시 그 서버 프로세스가 종료되므로 사용자 승인 없이 실행 금지.
    const r = await call(base, 'File/Restart', {});
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'screenshot') {
    const [qualityArg = '75', monitorArg = '0'] = rest;
    const quality = Number(qualityArg);
    const monitor = Math.max(0, Math.trunc(Number(monitorArg)));
    const r = await call(base, 'RemoteDesktop/screenshot', { quality, monitor });
    if (r.ok && r.result && r.result.data) {
        writeFileSync('screenshot.png', Buffer.from(r.result.data, 'base64'));
        console.log('Screenshot saved to screenshot.png');
    } else {
        console.log(JSON.stringify(r, null, 2));
    }

} else if (cmd === 'input') {
    const [key, timeArg, windowTitleArg = '-', ...pointArgs] = rest;
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

} else if (cmd === 'exec') {
    const [fn, argsJson = '[]'] = rest;
    if (!fn) { console.error('Usage: exec <fn> [args_json]'); process.exit(1); }
    const r = await call(base, 'RemoteDesktop/exec', { fn, args: JSON.parse(argsJson) });
    console.log(JSON.stringify(r, null, 2));

} else {
    console.error(`Unknown command: ${cmd}`);
    console.error('Commands: login, cmd, upload, download, roots, restart, screenshot, input, exec');
    process.exit(1);
}
