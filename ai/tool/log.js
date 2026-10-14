import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync, readdirSync } from 'fs';
import { createApiClient } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const MARKER = ['artgine', 'server', 'CProviderLog.js'];

// work.js와 동일한 프로젝트 루트 탐색(주석은 거기 참조). cwd는 옮기지 않는다 — CSQLite 기본 경로가
// 실행한 위치 기준이라, 옮기면 서버가 쓰는 db(./db/artgine.sqlite)와 어긋날 수 있다.
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

const PROJECT_ROOT = findProjectRoot(SCRIPT_DIR);
const { CProviderLog } = await import(pathToFileURL(join(PROJECT_ROOT, 'artgine', 'server', 'CProviderLog.js')));
// 원격 조회용(아래 _parseIdent 참조). browser.js와 같은 인증 저장소(ai/tool/cookie.json)를 공유한다 —
// 그 서버에 browser.js로 로그인해둔 적이 있으면 바로 쓰이고, 없으면 사람이 먼저
// `node ai/tool/browser.js <baseUrl> login [password]`로 인증해야 한다.
const { get: apiGet } = createApiClient(PROJECT_ROOT);

// --key=value 형태 옵션과 위치 인자를 분리한다. session/key 명령 공용.
function parseArgs(argv) {
    const positional = [];
    const flags = {};
    for (const a of argv) {
        const m = /^--([^=]+)=(.*)$/.exec(a);
        if (m) flags[m[1]] = m[2];
        else positional.push(a);
    }
    return { positional, flags };
}

// 전체를 통째로 내보내면 긴 세션(특히 긴 답변·도구 호출이 많은 세션)에서 분석 요청 토큰이 눈덩이처럼
// 불어난다. 세 옵션으로 필요한 구간만 추려서 내보낸다 — 모두 AND(각자 독립 적용, 전부 만족하는 행만).
//   --role=user,assistant   (쉼표 구분, 기본 전체 — tool 행이 많은 세션에서 role=assistant로 답변만 보면 크게 줄어든다)
//   --grep=<키워드>          (text/tool/file에 대소문자 무관 부분일치)
//   --range=10~30           (번호 구간. 10+5 = 10~15, 10-5 = 5~10)
// no는 필터 전 전체 목록 기준 1부터의 순번 — Control 로그 탭에 표시되는 #번호와 같다.
function applyFilters(records, flags) {
    let out = records.map((r, i) => ({ no: i + 1, ...r }));
    if (flags.role) {
        const roles = new Set(flags.role.split(',').map(r => r.trim()).filter(Boolean));
        out = out.filter(r => roles.has(r.role));
    }
    if (flags.grep) {
        const needle = flags.grep.toLowerCase();
        out = out.filter(r => [r.text, r.tool, r.file].some(v => v && v.toLowerCase().includes(needle)));
    }
    if (flags.range) {
        const { lo, hi } = parseRange(flags.range);
        out = out.filter(r => r.no >= lo && r.no <= hi);
    }
    return out;
}

// "10~30" | "10+5"(10~15) | "10-5"(5~10) → {lo, hi}. 형식이 틀리면 전체를 내보내지 않고 종료한다.
function parseRange(spec) {
    const m = /^(\d+)\s*([~+-])\s*(\d+)$/.exec(spec.trim());
    if (!m) { console.error(`fail: --range 형식 오류 "${spec}" (예: 10~30, 10+5, 10-5)`); process.exit(1); }
    const a = Number(m[1]), b = Number(m[3]);
    if (m[2] === '~') return { lo: Math.min(a, b), hi: Math.max(a, b) };
    if (m[2] === '+') return { lo: a, hi: a + b };
    return { lo: a - b, hi: a };
}

const [cmd, ...restRaw] = process.argv.slice(2);
const { positional: rest, flags } = parseArgs(restRaw);

function usageAndExit() {
    console.error('Usage: node ai/tool/log.js sessions [before] [limit]        (최근 세션 아코디언 목록, 기본 30개. 로컬 전용)');
    console.error('       node ai/tool/log.js session <sessionId> [옵션]       (그 세션(CLI 자체 대화 1개)의 로그, 시간순)');
    console.error('       node ai/tool/log.js key <key> [afterId] [옵션]       (터미널 key로 조회. 로컬 전용. afterId 생략 시 전체)');
    console.error('');
    console.error('옵션(session/key 공용, 토큰 절약용 — 모두 AND. 필터 없으면 전체를 그대로 내보낸다):');
    console.error('  --role=user,assistant   역할만 추려서(쉼표 구분). tool 행이 많으면 --role=assistant로 답변만 보는 게 가장 효과적.');
    console.error('  --grep=<키워드>          text/tool/file에 그 키워드가 있는 행만(대소문자 무관).');
    console.error('  --range=10~30           번호(no) 구간. 10+5 = 10~15(뒤로 5개), 10-5 = 5~10(앞으로 5개).');
    console.error('                          번호는 Control 로그탭에 보이는 #번호와 같다.');
    console.error('');
    console.error('<sessionId>는 Control 로그탭의 세션키 입력박스에서 복사한 값을 그대로 붙여넣는다.');
    console.error('그 값이 "<sessionId>@<baseUrl>" 형태(= 원격 서버 로그를 복사한 경우)면 그 서버에 인증 조회한다');
    console.error('(ai/tool/cookie.json에 그 서버 토큰이 없으면 먼저 `node ai/tool/browser.js <baseUrl> login` 필요).');
    console.error('');
    console.error('조회 전용 도구다(삭제 없음). 세션 삭제는 Control 로그 탭에서 한다.');
    process.exit(1);
}

if (!cmd) usageAndExit();

function printResult(v) {
    console.log(JSON.stringify(v));
}

// "<sessionId>@<baseUrl>" → {id, baseUrl|null}. '@' 없으면 로컬 조회(baseUrl=null).
// sessionId(UUID류)는 '@'를 포함하지 않으므로 첫 '@' 기준으로 나누면 충분하다.
function parseIdent(raw) {
    const i = raw.indexOf('@');
    if (i < 0) return { id: raw, baseUrl: null };
    return { id: raw.slice(0, i), baseUrl: raw.slice(i + 1) };
}

if (cmd === 'sessions') {
    const [beforeArg, limitArg] = rest;
    const sessions = await CProviderLog.ListSessions(beforeArg ? Number(beforeArg) : undefined, limitArg ? Number(limitArg) : undefined);
    printResult(sessions);

} else if (cmd === 'session') {
    const [raw] = rest;
    if (!raw) usageAndExit();
    const { id, baseUrl } = parseIdent(raw);
    if (baseUrl) {
        let j;
        try { j = await apiGet(baseUrl, 'cmd/log-session', { sessionId: id }); }
        catch (e) { console.error(`fail: ${baseUrl} 접속 실패: ${e.message}`); process.exit(1); }
        if (!j.ok) { console.error(`fail: ${baseUrl} 조회 실패: ${j.msg || ''}`); process.exit(1); }
        printResult(applyFilters(j.records, flags));
    } else {
        printResult(applyFilters(await CProviderLog.ListBySession(id), flags));
    }

} else if (cmd === 'key') {
    const [raw, afterIdArg] = rest;
    if (!raw) usageAndExit();
    const { id, baseUrl } = parseIdent(raw);
    if (baseUrl) {
        console.error('fail: key 조회는 원격을 지원하지 않는다(서버에 key 기준 조회 API가 없음) — session 명령을 쓴다.');
        process.exit(1);
    }
    const afterId = afterIdArg ? Number(afterIdArg) : -1;
    printResult(applyFilters(await CProviderLog.ListForTerminalKey(id, afterId), flags));

} else {
    usageAndExit();
}
