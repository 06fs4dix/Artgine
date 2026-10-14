import { dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { createApiClient, resolveLocalBase, tempPath, shotFormat } from './common.js';
import { wantsAnalysis, finishShot, finishFrames } from './image_tools.js';

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

// browser.js와 같은 버튼 이름(mouseLeft 등)을 받아 서버가 쓰는 left/right/middle로 바꾼다.
const MOUSE_BUTTONS = { mouseLeft: 'left', mouseRight: 'right', mouseMiddle: 'middle' };

const [, , homeUrlArg, cmd, ...rest] = process.argv;

function usageAndExit() {
    console.error('       node ai/tool/remote.js <HomeURL> login [비밀번호]                 # 비밀번호 생략 시 로컬 settings.json 비밀번호로 로그인, 있으면 그 값으로 로그인');
    console.error('       node ai/tool/remote.js <HomeURL> cmd <콘솔 명령어 그대로...>       # 콘솔 명령 실행(RemoteCMD/Exec)');
    console.error('       node ai/tool/remote.js <HomeURL> upload <로컬파일> <원격디렉터리>');
    console.error('       node ai/tool/remote.js <HomeURL> download <원격파일경로> [로컬저장경로]   # 상대경로/생략 시 temp/ 기준');
    console.error('       node ai/tool/remote.js <HomeURL> roots                          # 그 서버의 작업 루트(RootPath) 목록 조회(File/Root)');
    console.error('       node ai/tool/remote.js <HomeURL> restart                        # 서버 재시작(File/Restart)');
    console.error('       node ai/tool/remote.js <HomeURL> screenshot [options_json] [name]   # {"format":"png|jpeg","quality","clip":{x,y,width,height},"monitor","avg":true,"diff":"<ref>"} → temp/<name>.png|jpg + JSON');
    console.error('       node ai/tool/remote.js <HomeURL> record [options_json] [name]       # {"duration","frames","interval","times":[ms..],"inputs":[{at,key,time,focus,points}],"clip","monitor","format","avg","diff":"prev|<ref>"} → temp/<name>_NNN.png|jpg + JSON');
    console.error('       node ai/tool/remote.js <HomeURL> input <key|mouseButton> <time_ms> <focus> [x y [x2 y2]]   # focus = 창 제목 | -');
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
    const savePath = tempPath(localPath || basename(remotePath));
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
    // 구 형식(screenshot [quality] [monitor])도 계속 받는다 — 당시엔 jpeg 전용이었으므로 jpeg로 처리.
    const hasOpts = rest[0]?.trim().startsWith('{');
    const legacy = !hasOpts && /^\d+$/.test(rest[0] ?? '');
    const opts = hasOpts ? JSON.parse(rest[0]) : legacy ? { format: 'jpeg', quality: rest[0], monitor: rest[1] } : {};
    const name = (hasOpts ? rest[1] : legacy ? undefined : rest[0]) || 'screenshot';
    const analysis = { avg: opts.avg, diff: opts.diff };
    // 분석은 무손실로만 한다 — jpeg 압축 노이즈가 diff 영역/avg 값을 오염시킨다.
    const format = wantsAnalysis(analysis) ? 'png' : shotFormat(opts.format ?? opts.type);
    const quality = Number(opts.quality ?? 75);
    const monitor = Math.max(0, Math.trunc(Number(opts.monitor ?? 0))) || 0;
    const r = await call(base, 'RemoteDesktop/screenshot', { format, quality, monitor, clip: opts.clip });
    if (r.ok && r.result && r.result.data) {
        // 구버전 서버는 format/clip을 무시하고 항상 jpeg 전체 화면을 주며 응답에 format도 없다 → 그 경우 jpeg로 저장.
        console.log(JSON.stringify(finishShot(r.result.data, r.result.format ?? 'jpeg', name, analysis, opts.clip)));
    } else {
        console.log(JSON.stringify(r, null, 2));
    }

} else if (cmd === 'record') {
    const hasOpts = rest[0]?.trim().startsWith('{');
    const { avg, diff, format: fmtArg, type, inputs = [], ...opts } = hasOpts ? JSON.parse(rest[0]) : {};
    const name = (hasOpts ? rest[1] : rest[0]) || 'record';
    const analysis = { avg, diff };
    const format = wantsAnalysis(analysis) ? 'png' : shotFormat(fmtArg ?? type);
    // 입력 항목은 browser.js와 같은 규격(focus = 창 제목 | -)으로 받아 서버 필드(windowTitle)로 옮긴다.
    const normInputs = inputs.map(({ focus, ...inp }) => ({
        ...inp,
        key: MOUSE_BUTTONS[inp.key] ?? inp.key,
        windowTitle: inp.windowTitle ?? (!focus || focus === '-' ? '' : focus),
    }));
    const r = await call(base, 'RemoteDesktop/record', { ...opts, format, inputs: normInputs });
    console.log(JSON.stringify(r.ok && r.frames ? finishFrames(r, name, analysis, opts.clip) : r));

} else if (cmd === 'input') {
    const [keyArg, timeArg, windowTitleArg = '-', ...pointArgs] = rest;
    if (!keyArg || !timeArg) {
        console.error('Usage: input <key|mouseButton> <time_ms> <focus> [x y [x2 y2]]');
        process.exit(1);
    }
    const key = MOUSE_BUTTONS[keyArg] ?? keyArg;
    const time = parseInt(timeArg, 10);
    const windowTitle = windowTitleArg === '-' ? '' : windowTitleArg;
    const points = pointArgs.map((v) => Number(v));
    if (!Number.isFinite(time) || time < 0 || points.some((v) => !Number.isFinite(v)) || (points.length !== 0 && points.length !== 2 && points.length !== 4)) {
        console.error('Usage: input <key|mouseButton> <time_ms> <focus> [x y [x2 y2]]');
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
    console.error('Commands: login, cmd, upload, download, roots, restart, screenshot, record, input, exec');
    process.exit(1);
}
