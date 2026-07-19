import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync, readdirSync } from 'fs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const MARKER = ['artgine', 'server', 'CWorkOrder.js'];

// SCRIPT_DIR에서 위로 올라가며 artgine/server/CWorkOrder.js가 실제로 있는 폴더를 프로젝트 루트로 판정한다.
// ai/tool과 artgine/ 사이의 중첩 깊이는 프로젝트 구조마다 달라(WebContent는 2단계, 서브모듈로 한 겹
// 더 감싼 구조(예: Artgine-Agent/Artgine/artgine/...)는 3단계라 고정 단계 수를 가정하면 깨진다.
// 그래서 각 조상 폴더 자신뿐 아니라 그 직계 자식 폴더까지(서브모듈 폴더 한 겹) 함께 확인한다.
function findProjectRoot(_startDir) {
    let dir = _startDir;
    for (let i = 0; i < 6; i++) {
        if (existsSync(join(dir, ...MARKER))) return dir;
        try {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
                if (!entry.isDirectory()) continue;
                const child = join(dir, entry.name);
                if (existsSync(join(child, ...MARKER))) return child;
            }
        } catch { /* 읽기 권한 없는 폴더는 건너뛴다 */ }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    throw new Error(`프로젝트 루트를 찾지 못했습니다 (기준 경로: ${_startDir})`);
}

// PROJECT_ROOT는 모듈(CWorkOrder.js)을 import하는 용도로만 쓴다. cwd를 여기로 옮기면 CSQLite
// 기본 경로(./db/artgine.sqlite)가 실행한 위치가 아니라 이 폴더 기준으로 잡혀 서버가 쓰는 db와
// 어긋날 수 있다(예: 감싸는 프로젝트 구조에서 실제 코드 폴더와 서버 cwd가 다른 경우) — 그래서
// process.chdir()은 하지 않고 cwd는 실행한 위치 그대로 둔다.
const PROJECT_ROOT = findProjectRoot(SCRIPT_DIR);

const { CWorkOrder } = await import(pathToFileURL(join(PROJECT_ROOT, 'artgine', 'server', 'CWorkOrder.js')));
const { CSubAgent } = await import(pathToFileURL(join(PROJECT_ROOT, 'artgine', 'server', 'CSubAgent.js')));

const [cmd, ...rest] = process.argv.slice(2);

function usageAndExit() {
    console.error('Usage: node ai/tool/work.js list-work [status] [limit]         (워크오더 목록, status 비우면 전체)');
    console.error('       node ai/tool/work.js list-agent                         (서브 에이전트 목록)');
    console.error('       node ai/tool/work.js get <id>                            (단건 조회)');
    console.error('       node ai/tool/work.js check <팀키> [시작시각]              (팀 경과분 + 워크오더 집계)');
    console.error('       node ai/tool/work.js push <from> <to> <content...>       (작업 생성, 줄바꿈은 실제 Enter 대신 \\n으로)');
    console.error('       node ai/tool/work.js status <id> <status>                (상태 갱신)');
    console.error('       node ai/tool/work.js result <id> <status> <result...>    (완료/실패 처리, 상태+결과 동시 기록, 줄바꿈은 \\n으로)');
    process.exit(1);
}

if (!cmd) usageAndExit();

function printResult(v) {
    console.log(JSON.stringify(v));
}

// createdAt과 같은 YYYYMMDDHHmmss 포맷. CWorkOrder.Now()는 private이라 여기서 다시 만든다.
function nowStamp() {
    const d = new Date();
    const pad2 = v => (v < 10 ? `0${v}` : `${v}`);
    return Number(`${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`);
}

// 터미널 커맨드라인은 실제 개행을 담을 수 없다(Enter = 명령 제출) — 대신 리터럴 "\n"(백슬래시+n)으로
// 줄바꿈을 표현하게 하고 여기서 실제 개행으로 복원한다.
function unescapeNewlines(_s) {
    return _s.replace(/\\n/g, '\n');
}

function stampToDate(_stamp) {
    const s = String(_stamp);
    return new Date(
        Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)),
        Number(s.slice(8, 10)), Number(s.slice(10, 12)), Number(s.slice(12, 14))
    );
}

if (cmd === 'list-work') {
    const [status, limit] = rest;
    const records = await CWorkOrder.List(status || undefined, limit ? Number(limit) : undefined);
    printResult(records);

} else if (cmd === 'list-agent') {
    const records = await CSubAgent.List();
    printResult(records);

} else if (cmd === 'get') {
    const [id] = rest;
    if (!id) usageAndExit();
    const record = await CWorkOrder.Get(Number(id));
    printResult(record);

} else if (cmd === 'check') {
    // 메인(팀 감독자)이 자기 팀의 진행 상황을 정량으로 확인하는 용도.
    // requester가 곧 팀키이므로 그 팀이 낸 의뢰서만 골라 집계한다.
    const [teamKey, startedAtArg] = rest;
    if (!teamKey) usageAndExit();
    const mine = (await CWorkOrder.List()).filter(r => r.requester === teamKey);

    const orders = { ready: 0, working: 0, done: 0, failed: 0 };
    for (const r of mine) if (r.status in orders) orders[r.status]++;

    // 시작시각을 안 주면 그 팀의 첫 의뢰서 시각으로 대신한다(발주 전이면 경과 판정 불가 → null).
    const startedAt = startedAtArg ? Number(startedAtArg)
        : (mine.length > 0 ? Math.min(...mine.map(r => r.createdAt)) : 0);
    const now = nowStamp();

    printResult({
        teamKey,
        startedAt: startedAt || null,
        now,
        elapsedMin: startedAt ? Math.floor((stampToDate(now).getTime() - stampToDate(startedAt).getTime()) / 60000) : null,
        orders: { ...orders, total: mine.length },
        failedIds: mine.filter(r => r.status === 'failed').map(r => r.id),
    });

} else if (cmd === 'push') {
    const [from, to, ...contentParts] = rest;
    const content = unescapeNewlines(contentParts.join(' ').trim());
    if (!from || !to || !content) usageAndExit();
    const record = await CWorkOrder.Create(from, to, content);
    printResult(record);

} else if (cmd === 'status') {
    const [id, status] = rest;
    if (!id || !status) usageAndExit();
    await CWorkOrder.SetStatus(Number(id), status);
    console.log('ok');

} else if (cmd === 'result') {
    const [id, status, ...resultParts] = rest;
    const result = unescapeNewlines(resultParts.join(' ').trim());
    if (!id || !status) usageAndExit();
    await CWorkOrder.SetResult(Number(id), status, result);
    console.log('ok');

} else {
    usageAndExit();
}
