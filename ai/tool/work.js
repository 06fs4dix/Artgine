import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { getPassword, hashPassword, updateEntry } from './common.js';

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

// PROJECT_ROOT는 모듈(CWorkOrder.js 등)을 import하는 용도로만 쓴다. cwd를 여기로 옮기면 CSQLite
// 기본 경로(./db/artgine.sqlite)가 실행한 위치가 아니라 이 폴더 기준으로 잡혀 서버가 쓰는 db와
// 어긋날 수 있다(예: 감싸는 프로젝트 구조에서 실제 코드 폴더와 서버 cwd가 다른 경우) — 그래서
// process.chdir()은 하지 않고 cwd는 실행한 위치 그대로 둔다.
const PROJECT_ROOT = findProjectRoot(SCRIPT_DIR);

const { CWorkOrder } = await import(pathToFileURL(join(PROJECT_ROOT, 'artgine', 'server', 'CWorkOrder.js')));
const { CSubAgent } = await import(pathToFileURL(join(PROJECT_ROOT, 'artgine', 'server', 'CSubAgent.js')));
const { CTerminalScheduler } = await import(pathToFileURL(join(PROJECT_ROOT, 'artgine', 'server', 'CTerminalScheduler.js')));
const { CProviderLog } = await import(pathToFileURL(join(PROJECT_ROOT, 'artgine', 'server', 'CProviderLog.js')));

const [cmd, ...rest] = process.argv.slice(2);

function usageAndExit() {
    console.error('Usage: node ai/tool/work.js list-work [status] [limit]         (워크오더 목록, status 비우면 전체)');
    console.error('       node ai/tool/work.js list-agent                         (서브 에이전트 목록)');
    console.error('       node ai/tool/work.js set-agent <key> <provider> <model> [score] [workingDir] [super] [retryCount] [retryText] [traits_json] [permissions_json] [hidden]');
    console.error('       node ai/tool/work.js del-agent <key>                    (서브 에이전트 삭제)');
    console.error('       node ai/tool/work.js list-sched                         (스케줄러 목록)');
    console.error('       node ai/tool/work.js set-sched <name> <subAgentKey> <mode> <option_json> <command...>');
    console.error('       node ai/tool/work.js del-sched <name>                   (스케줄러 삭제)');
    console.error('       node ai/tool/work.js get <id>                            (워크오더 단건 + 처리 로그/최종 답변)');
    console.error('       node ai/tool/work.js check <팀키> [시작시각]              (팀 경과분 + 워크오더 집계)');
    console.error('       node ai/tool/work.js push <from> <to> <content...>       (작업 생성, 줄바꿈은 실제 Enter 대신 \\n으로)');
    console.error('       node ai/tool/work.js status <id> <status>                (상태 갱신. 완료는 서버가 자동 판정, 실패 선언은 status <id> failed)');
    console.error('       node ai/tool/work.js watchdog                            (사원 세션이 사라진 working 워크오더를 ready로 복구)');
    console.error('       node ai/tool/work.js team-end <팀키>                     (팀 종료 - 그 팀이 자동 생성한 임시 사원을 전부 정리)');
    console.error('       node ai/tool/work.js start-team [--remindMin=N] <provider> <model|-> <subAgents|-> <autoAgents_json|-> <limitMin|-> <goal...>');
    console.error('                                                                 (팀 시작 - curl 대신 이 명령을 써야 한글 등 비ASCII goal이 안 깨짐)');
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

// watchdog가 로컬 서버(work.js와 항상 같은 머신)를 호출할 때 쓸 주소+인증 토큰.
// cookie.json은 browser.js가 로그인 시 기록해두는 파일 — localhost/127.0.0.1 항목에 authToken으로
// 쓸 수 있는 token 필드가 이미 있으므로 그대로 재사용한다(별도 인증 설정 불필요).
function localServerAuth() {
    let cookies = {};
    try { cookies = JSON.parse(readFileSync(join(SCRIPT_DIR, 'cookie.json'), 'utf8')); }
    catch { return null; }
    for (const host of ['localhost', '127.0.0.1']) {
        for (const baseUrl of Object.keys(cookies)) {
            if (!baseUrl.includes(`://${host}:`)) continue;
            const token = cookies[baseUrl]?.token;
            if (token) return { baseUrl, token };
        }
    }
    return null;
}

// authToken(gAuthedTokens)은 서버 메모리에만 있어 서버 재시작 시 사라진다. 반면 cookie.json의 세션
// 쿠키는 재시작 후에도 살아있어서 login 명령은 "이미 인증됨"으로 판단해 토큰 갱신을 건너뛴다 -
// 그래서 authToken이 죽어 401이 오면 여기서 직접 비밀번호로 재로그인해 새 토큰을 받는다.
// 로컬 서버 호출 전용(localServerAuth)이라 서버가 2FA를 건너뛰므로 승인 대기 없이 바로 끝난다.
async function forceRelogin(auth) {
    const r = await fetch(`${auth.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: hashPassword(getPassword(PROJECT_ROOT)) }),
    });
    const j = await r.json().catch(() => null);
    if (!j?.ok || !j.token) return false;
    auth.token = j.token;
    await updateEntry(auth.baseUrl, { token: j.token });
    return true;
}

// /cmd/* 호출이 401이면(= authToken 만료) 한 번 재로그인하고 다시 시도한다.
async function cmdFetch(auth, buildUrl) {
    let res = await fetch(buildUrl(auth.token));
    if (res.status === 401 && (await forceRelogin(auth))) {
        res = await fetch(buildUrl(auth.token));
    }
    return res;
}

function stampToDate(_stamp) {
    const s = String(_stamp);
    return new Date(
        Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)),
        Number(s.slice(8, 10)), Number(s.slice(10, 12)), Number(s.slice(12, 14))
    );
}

// traits: JSON 배열 문자열 또는 콤마/줄바꿈 구분. 빈 값·"-" → []
function parseTraits(_raw) {
    if (_raw == null || _raw === '' || _raw === '-') return [];
    const s = unescapeNewlines(String(_raw)).trim();
    if (!s) return [];
    if (s.startsWith('[')) {
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch { /* fallthrough */ }
    }
    return s.split(/[\n,]/).map(t => t.trim()).filter(t => t.length > 0);
}

// permissions: JSON {allow:[],deny:[]}. 빈 값·"-" → 빈 규칙.
// "@path" 는 파일 내용으로 대체(셸이 JSON 따옴표를 벗기는 환경 대비).
function parsePermissions(_raw) {
    const empty = { allow: [], deny: [] };
    if (_raw == null || _raw === '' || _raw === '-') return empty;
    let text = String(_raw);
    if (text.startsWith('@')) {
        try { text = readFileSync(text.slice(1), 'utf8'); }
        catch (e) { console.error('fail: permissions 파일 읽기 실패: ' + e.message); process.exit(1); }
    }
    try {
        const parsed = JSON.parse(text);
        return {
            allow: Array.isArray(parsed?.allow) ? parsed.allow : [],
            deny: Array.isArray(parsed?.deny) ? parsed.deny : [],
        };
    } catch {
        console.error('fail: permissions_json 파싱 실패');
        process.exit(1);
    }
}

function parseOptionJson(_raw) {
    try {
        const parsed = JSON.parse(String(_raw || '{}'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* fallthrough */ }
    console.error('fail: option_json 파싱 실패 (유효한 JSON 객체 필요)');
    process.exit(1);
}

if (cmd === 'list-work') {
    const [status, limit] = rest;
    const records = await CWorkOrder.List(status || undefined, limit ? Number(limit) : undefined);
    printResult(records);

} else if (cmd === 'list-agent') {
    const records = await CSubAgent.List();
    printResult(records);

} else if (cmd === 'set-agent') {
    // set-agent <key> <provider> <model> [score] [workingDir] [super] [retryCount] [retryText] [traits_json] [permissions_json] [hidden]
    const [key, provider, model, scoreArg, workingDirArg, superArg, retryCountArg, retryTextArg, traitsArg, permsArg, hiddenArg] = rest;
    if (!key || !provider || !model) usageAndExit();
    const record = {
        key,
        provider,
        model,
        score: scoreArg != null && scoreArg !== '' ? Number(scoreArg) || 0 : 0,
        workingDir: (workingDirArg != null && workingDirArg !== '' && workingDirArg !== '-') ? workingDirArg : './',
        super: superArg === '1' || superArg === 'true' ? 1 : 0,
        retryCount: retryCountArg != null && retryCountArg !== '' ? Math.max(0, Number(retryCountArg) || 0) : 0,
        retryText: (retryTextArg != null && retryTextArg !== '-') ? unescapeNewlines(retryTextArg) : '',
        traits: parseTraits(traitsArg),
        permissions: parsePermissions(permsArg),
        hidden: hiddenArg === '1' || hiddenArg === 'true' ? 1 : 0,
    };
    await CSubAgent.Set(record);
    console.log('ok');

} else if (cmd === 'del-agent') {
    const [key] = rest;
    if (!key) usageAndExit();
    const ok = await CSubAgent.Delete(key);
    console.log(ok ? 'ok' : 'fail: not found');

} else if (cmd === 'list-sched') {
    const records = await CTerminalScheduler.List();
    printResult(records);

} else if (cmd === 'set-sched') {
    // set-sched <name> <subAgentKey> <mode> <option_json> <command...>
    const [name, subAgentKey, modeArg, optionArg, ...commandParts] = rest;
    const command = unescapeNewlines(commandParts.join(' ').trim());
    if (!name || !subAgentKey || !modeArg || optionArg == null || !command) usageAndExit();
    const mode = modeArg === 'time' ? 'time' : (modeArg === 'interval' ? 'interval' : null);
    if (!mode) {
        console.error('fail: mode는 interval 또는 time');
        process.exit(1);
    }
    const option = parseOptionJson(optionArg);
    if (mode === 'time' && (!Array.isArray(option.days) || option.days.length === 0)) {
        console.error('fail: time 모드는 option.days 배열이 하나 이상 필요');
        process.exit(1);
    }
    if (mode === 'interval' && !(Number(option.delay) > 0)) {
        console.error('fail: interval 모드는 option.delay가 1 이상이어야 함');
        process.exit(1);
    }
    await CTerminalScheduler.Set({ name, subAgentKey, mode, option, command });
    console.log('ok');

} else if (cmd === 'del-sched') {
    const [name] = rest;
    if (!name) usageAndExit();
    const ok = await CTerminalScheduler.Delete(name);
    console.log(ok ? 'ok' : 'fail: not found');

} else if (cmd === 'get') {
    const [id] = rest;
    if (!id) usageAndExit();
    const record = await CWorkOrder.Get(Number(id));
    if (!record) { printResult(null); process.exit(0); }
    // 결과 본문은 워크오더에 없다 - assignee의 대화 로그 중 이 의뢰 구간(의뢰 표식이 든 user 행 ~ 다음 의뢰 logId)에서
    // 꺼낸다. 시작을 logId가 아니라 표식 행으로 잡아야 배분 직전 /clear의 응답("Conversation cleared...")이 섞이지 않는다.
    // user 행(= 보낸 지시문)은 content와 중복이라 뺀다. 아직 배분 전이거나 지시문이 로그에 안 잡혔으면 로그가 없다.
    let logs = [];
    const taskRow = record.logId > 0 ? await CProviderLog.FindTaskRow(record.assignee, record.logId, CWorkOrder.Marker(record.id)) : 0;
    if (taskRow > 0) {
        const rows = await CProviderLog.ListForKeyRange(record.assignee, taskRow, await CWorkOrder.NextLogId(record));
        logs = rows.filter(r => r.role !== 'user').map(r => r.role === 'tool'
            ? { id: r.id, role: r.role, tool: r.tool, file: r.file, createdAt: r.createdAt }
            : { id: r.id, role: r.role, text: r.text, createdAt: r.createdAt });
    }
    const finals = logs.filter(l => l.role === 'assistant');
    printResult({ ...record, answer: finals.length > 0 ? finals[finals.length - 1].text : null, logs });

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

} else if (cmd === 'watchdog') {
    // work_order.status='working'은 그 에이전트의 최종 답변이 로그에 들어와야(또는 스스로 failed를 선언해야)
    // 풀린다 — 에이전트 세션이 사라지면(크래시 등) 영원히 'working'에 갇힌다.
    // 세션 존재 여부는 라우터(cmd/sessions)만 알므로 로컬 서버에 물어 대조한다.
    const auth = localServerAuth();
    if (!auth) {
        console.error('fail: ai/tool/cookie.json에서 로컬 서버(localhost/127.0.0.1) 인증 토큰을 찾지 못했습니다');
        process.exit(1);
    }
    const working = await CWorkOrder.List('working');

    let sessions = [];
    try {
        const r = await cmdFetch(auth, (token) => `${auth.baseUrl}/cmd/sessions?authToken=${token}`);
        const j = await r.json();
        if (j.ok) sessions = j.sessions;
        else { console.error('fail: cmd/sessions 응답 실패: ' + (j.msg || '')); process.exit(1); }
    } catch (e) {
        console.error('fail: cmd/sessions 호출 실패: ' + e.message);
        process.exit(1);
    }

    // 세션이 살아있는 의뢰는 건드리지 않는다. 완료는 서버가 판정한다 - 최종 답변이 로그에 들어오면 done,
    // 로그에 못 잡혀도 세션이 30초 이상 idle이면 안전망으로 done(_completeWorkOrdersByIdle). 예전처럼 "idle인데
    // 결과 보고가 없다"는 이유로 세션을 죽이고 재배분하면, 로그 판정이 안 되는 CLI에서 같은 일을 끝없이 반복한다.
    // 여기서 할 일은 세션이 아예 사라진(크래시 등) 의뢰를 ready로 돌려, 되살아난 세션에 재배분되게 하는 것뿐이다.
    const recovered = [];
    for (const order of working) {
        if (sessions.some(x => x.key === order.assignee)) continue;
        await CWorkOrder.SetStatus(order.id, 'ready');
        recovered.push({ id: order.id, assignee: order.assignee });
    }
    printResult({ checked: working.length, recovered });

} else if (cmd === 'team-end') {
    // 자동 생성 사원은 DB가 아니라 서버 메모리(gTeamTempAgents)에만 있고, 정리에는 pty를 죽이는 일이
    // 포함되므로 여기서 직접 할 수 없다 - watchdog와 같은 경로로 로컬 서버에 정리를 요청한다.
    const [teamKey] = rest;
    if (!teamKey) usageAndExit();
    const auth = localServerAuth();
    if (!auth) {
        console.error('fail: ai/tool/cookie.json에서 로컬 서버(localhost/127.0.0.1) 인증 토큰을 찾지 못했습니다');
        process.exit(1);
    }
    try {
        const r = await cmdFetch(auth, (token) => `${auth.baseUrl}/cmd/team-end?teamKey=${encodeURIComponent(teamKey)}&authToken=${token}`);
        const j = await r.json();
        if (!j.ok) { console.error('fail: cmd/team-end 응답 실패: ' + (j.msg || '')); process.exit(1); }
        printResult(j);
    } catch (e) {
        console.error('fail: cmd/team-end 호출 실패: ' + e.message);
        process.exit(1);
    }

} else if (cmd === 'start-team') {
    // start-team <provider> <model|-> <subAgents|-> <autoAgents_json|-> <limitMin|-> <goal...>
    // curl로 /cmd/start-team을 직접 부르면 비ASCII(한글 등) 인자가 Windows 콘솔 코드페이지 변환을
    // 거치며 깨진다(curl.exe는 ANSI argv를 받지만 Node는 유니코드 argv를 그대로 받는다) - 그래서 이
    // 명령은 Node 프로세스 안에서 URLSearchParams로 직접 인코딩해 fetch하여 그 변환 경로를 우회한다.
    // --remindMin=N 은 위치 인자 순서를 깨지 않도록 플래그로 받아 먼저 걷어낸다(기존 호출과 호환).
    const remindFlag = rest.find(a => a.startsWith('--remindMin='));
    const positional = rest.filter(a => a !== remindFlag);
    const [provider, modelArg, subAgentsArg, autoAgentsArg, limitMinArg, ...goalParts] = positional;
    const goal = unescapeNewlines(goalParts.join(' ').trim());
    if (!provider || !goal) usageAndExit();
    const auth = localServerAuth();
    if (!auth) {
        console.error('fail: ai/tool/cookie.json에서 로컬 서버(localhost/127.0.0.1) 인증 토큰을 찾지 못했습니다');
        process.exit(1);
    }
    const params = new URLSearchParams();
    params.set('provider', provider);
    if (modelArg && modelArg !== '-') params.set('model', modelArg);
    if (subAgentsArg && subAgentsArg !== '-') params.set('subAgents', subAgentsArg);
    if (autoAgentsArg && autoAgentsArg !== '-') params.set('autoAgents', autoAgentsArg);
    if (limitMinArg && limitMinArg !== '-') params.set('limitMin', limitMinArg);
    if (remindFlag) params.set('remindMin', remindFlag.slice('--remindMin='.length));
    params.set('goal', goal);
    try {
        const r = await cmdFetch(auth, (token) => {
            params.set('authToken', token);
            return `${auth.baseUrl}/cmd/start-team?${params.toString()}`;
        });
        const j = await r.json();
        if (!j.ok) { console.error('fail: cmd/start-team 응답 실패: ' + (j.msg || '')); process.exit(1); }
        printResult(j);
    } catch (e) {
        console.error('fail: cmd/start-team 호출 실패: ' + e.message);
        process.exit(1);
    }

} else {
    usageAndExit();
}
