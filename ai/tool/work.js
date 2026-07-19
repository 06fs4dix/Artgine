import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CWorkOrder } from '../../artgine/server/CWorkOrder.js';
import { CSubAgent } from '../../artgine/server/CSubAgent.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));
// CSQLite 기본 경로(./db/artgine.sqlite)는 process.cwd() 기준이라, 어디서 실행하든
// 서버와 같은 db 파일을 보도록 프로젝트 루트로 고정한다.
process.chdir(PROJECT_ROOT);

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
