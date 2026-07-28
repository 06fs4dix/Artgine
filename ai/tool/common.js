import { readFileSync, existsSync, writeFileSync, renameSync, unlinkSync, openSync, closeSync, writeSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CHash } from '../../artgine/basic/CHash.js';

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));

// 도구 전체가 공유하는 단일 인증 저장소. 서버(base)별로 항목이 나뉘므로 파일은 하나로 두고
// 원격지가 몇 개로 늘어나든 항목만 늘어난다.
//   { "<base>": { "cookie": "connect.sid=...", "token": "<relog token>" }, ... }
// 도구별로 파일을 나누면 같은 서버에 이미 인증해 둔 세션을 옆 도구가 못 쓰고 다시 로그인하게 되고,
// 반대로 base 구분 없이 한 파일에 문자열 하나만 두면 A서버 세션이 B서버 접속 한 번에 지워진다.
export const COOKIE_FILE = join(TOOL_DIR, 'cookie.json');
const LOCK_FILE = join(TOOL_DIR, 'cookie.lock');

// 락은 2FA 승인(최대 5분)을 기다리는 동안 계속 잡고 있어야 한다. 그래서 "오래 잡고 있다"는 이유만으로
// 죽은 락 취급을 하면 정상 대기를 깨뜨린다. 대신 보유자가 주기적으로 파일에 현재 시각을 다시 쓰고,
// 그 시각이 STALE보다 오래 멈춰 있을 때만(=프로세스가 죽었을 때만) 강제 해제한다.
const LOCK_STALE_MS = 30 * 1000;
const LOCK_HEARTBEAT_MS = 5 * 1000;
const LOCK_WAIT_MS = 6 * 60 * 1000;
const LOCK_POLL_MS = 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function getPassword(projectRoot) {
    const candidates = [
        'settings.json',
        join('desktop', 'settings.json'),
        join(projectRoot, 'settings.json'),
        join(projectRoot, 'desktop', 'settings.json'),
    ];
    const file = candidates.find((path) => existsSync(path));
    if (!file) return 'artgine';
    const json = JSON.parse(readFileSync(file, 'utf8'));
    return json.password ?? 'artgine';
}

export function hashPassword(password) {
    return password.length >= 64 ? password : CHash.SHA256('artgine_' + password);
}

// ── 파일 락 ──────────────────────────────────────────────────────────────────
// 여러 봇이 같은 저장소를 공유하므로 "읽고-고쳐-쓰기" 구간과 로그인 구간을 프로세스 간에 직렬화해야 한다.
// openSync(..., 'wx')는 파일이 이미 있으면 실패하는 원자적 생성이라 그 자체로 상호배제가 된다.
let gLockFd = -1;
let gLockDepth = 0;
let gLockTimer = null;

function lockIdleMs() {
    try {
        const beat = Number(readFileSync(LOCK_FILE, 'utf8').trim());
        return Number.isFinite(beat) ? Date.now() - beat : 0;
    } catch {
        return Infinity; // 락 파일이 사라졌다 = 잡을 수 있다
    }
}

function beatLock() {
    if (gLockFd < 0) return;
    try { writeSync(gLockFd, String(Date.now()).padEnd(16), 0); } catch { /* 해제 직후 경합은 무시 */ }
}

async function acquireLock() {
    if (gLockDepth > 0) { gLockDepth++; return; } // 같은 프로세스 안에서의 재진입
    const deadline = Date.now() + LOCK_WAIT_MS;
    for (;;) {
        try {
            gLockFd = openSync(LOCK_FILE, 'wx');
            gLockDepth = 1;
            beatLock();
            gLockTimer = setInterval(beatLock, LOCK_HEARTBEAT_MS);
            gLockTimer.unref?.(); // 락 때문에 프로세스가 안 끝나는 일이 없게
            return;
        } catch (e) {
            if (e.code !== 'EEXIST') throw e;
        }
        if (lockIdleMs() > LOCK_STALE_MS) {
            try { unlinkSync(LOCK_FILE); } catch { /* 다른 봇이 먼저 치웠다 */ }
            continue;
        }
        if (Date.now() > deadline) {
            // 락을 못 잡아도 작업 자체는 진행시킨다. 최악이라도 로그인이 한 번 더 나가는 정도이고,
            // 여기서 멈춰버리면 도구가 통째로 죽는다.
            console.error('[cookie] lock wait timed out - proceeding without lock');
            return;
        }
        await sleep(LOCK_POLL_MS);
    }
}

function releaseLock() {
    if (gLockDepth === 0) return; // 락 없이 진행한 경우
    if (--gLockDepth > 0) return;
    if (gLockTimer) { clearInterval(gLockTimer); gLockTimer = null; }
    if (gLockFd >= 0) { try { closeSync(gLockFd); } catch { /* 이미 닫힘 */ } gLockFd = -1; }
    try { unlinkSync(LOCK_FILE); } catch { /* 이미 없음 */ }
}

// ── 인증 저장소 ──────────────────────────────────────────────────────────────
function loadMap() {
    let raw;
    try { raw = readFileSync(COOKIE_FILE, 'utf8'); } catch { return {}; } // 첫 실행
    try { return JSON.parse(raw); } catch {
        // 조용히 {}를 돌려주면 전 서버 세션이 이유 없이 사라진 것처럼 보인다. 반드시 알린다.
        console.error(`[cookie] ${COOKIE_FILE} 파싱 실패 - 이번 실행은 세션 없이 진행합니다`);
        return {};
    }
}

function saveMapSync(map) {
    // 같은 파일에 직접 쓰면 truncate와 write 사이의 중간 상태를 다른 봇이 읽어 JSON이 깨진다.
    // 임시 파일에 다 쓴 뒤 rename으로 통째로 갈아끼우면 읽는 쪽은 항상 완전한 파일만 본다.
    const tmp = `${COOKIE_FILE}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(map, null, 2), 'utf8');
    renameSync(tmp, COOKIE_FILE);
}

export function getEntry(base) {
    const e = loadMap()[base];
    return e && typeof e === 'object' ? e : {};
}

// 락 안에서 파일을 다시 읽어 병합한다. 그냥 자기가 들고 있던 맵을 쓰면 그 사이에 다른 봇이
// 추가한 서버 항목이 통째로 날아간다.
// guard는 락을 잡은 뒤의 실제 값을 보고 쓸지 말지 정한다(읽은 시점과 쓰는 시점 사이의 변화 대응).
async function updateEntry(base, patch, guard = null) {
    await acquireLock();
    try {
        const map = loadMap();
        const cur = map[base] ?? {};
        if (guard && !guard(cur)) return;
        map[base] = { ...cur, ...patch };
        for (let i = 0; ; i++) {
            try { saveMapSync(map); return; }
            catch (e) {
                // 윈도우에서는 다른 봇이 그 순간 파일을 열고 있으면 rename이 EPERM/EBUSY로 튕긴다.
                if (i >= 4) { console.error(`[cookie] 저장 실패: ${e.message}`); return; }
                await sleep(50);
            }
        }
    } finally {
        releaseLock();
    }
}

// ── 서버 주소 ────────────────────────────────────────────────────────────────
async function fetchInstanceId(base, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(`${base}/AIInfo/whoami`, { signal: ctrl.signal });
        if (!res.ok) return '';
        const j = await res.json();
        return typeof j?.instanceId === 'string' ? j.instanceId : '';
    } catch { return ''; }
    finally { clearTimeout(timer); }
}

// 공인 주소(예: http://myhost.iptime.org:8050/Artgine)로 자기 PC의 서버에 붙으면 라우터를 한 바퀴
// 돌아오느라(헤어핀 NAT) 서버가 보는 피어 IP가 loopback이 아니게 되고, 그래서 로컬인데도 2차 인증이
// 걸린다. 사람이 승인해 줄 수 없는 자동화 경로라 이러면 도구가 통째로 멈춘다.
//
// 그래서 접속 직전에 "이 주소가 사실 내 PC의 서버인가"를 확인해 localhost로 갈아탄다. 판별은
// /AIInfo/whoami의 instanceId(프로세스마다 다른 기동 시 난수)를 원래 주소와 127.0.0.1에서 각각
// 받아 비교하는 방식이다. 폴더 구성이나 설정값 비교로는 같은 프로젝트를 배포한 원격 서버와 구분이
// 안 돼서, 원격지 대신 자기 로컬 서버에 조용히 명령을 실행하는 사고가 난다.
//
// 서버 판정(TCP 피어 주소) 자체는 그대로라 보안은 달라지지 않는다. 확인에 실패하면 원래 주소를
// 그대로 쓰므로 최악의 경우도 지금과 동일하다(평소대로 2차 인증을 거친다).
//
// 부수 효과로 base가 여기서 한 번 확정된다 - 인증 저장소의 키이기도 하므로 같은 서버가
// 원래 주소와 127.0.0.1 두 항목으로 갈라지지 않는다.
export async function resolveLocalBase(base, timeoutMs = 1500) {
    let u;
    try { u = new URL(base); } catch { return base; }
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1') return base;

    const localUrl = new URL(base);
    localUrl.hostname = '127.0.0.1';
    const localBase = localUrl.toString().replace(/\/+$/, '');

    // 로컬부터 물어본다. 안 떠 있으면(대부분의 순수 원격 접속) 즉시 실패하므로 원격 왕복이 없다.
    const localId = await fetchInstanceId(localBase, timeoutMs);
    if (!localId) return base;

    const remoteId = await fetchInstanceId(base, timeoutMs);
    return remoteId && remoteId === localId ? localBase : base;
}

// ── 로그인 ───────────────────────────────────────────────────────────────────
// 서버에 2차 인증이 켜져 있으면 auth/login은 비밀번호가 맞아도 pending2FA:true와 함께 아직 권한이 없는
// 토큰만 준다. 메신저로 간 승인 링크를 사람이 누를 때까지 auth/check를 폴링해야 세션이 인증된다.
// (로컬 서버는 서버 쪽에서 2차 인증을 건너뛰므로 이 경로를 타지 않는다 - 원격 서버에 붙을 때만 걸린다.)
export async function login(call, base, projectRoot, password = getPassword(projectRoot)) {
    const j = await call(base, 'auth/login', { password: hashPassword(password) });
    if (!j?.ok || !j.pending2FA || !j.token) return j;

    const pollMs = j.pollMs ?? 1000;
    const deadline = Date.now() + (j.waitMs ?? 5 * 60 * 1000);
    console.error('2FA approval required - waiting for messenger approval...');
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, pollMs));
        let w;
        try { w = await call(base, 'auth/check', { token: j.token }); }
        catch { continue; } // 일시적인 네트워크 오류로 대기를 포기하지 않는다(만료되면 서버가 알려준다).
        if (w?.authed) return { ok: true, token: j.token };
        if (w?.ok === false) return { ok: false, msg: w.msg ?? '2FA approval timed out' };
    }
    return { ok: false, msg: '2FA approval timed out' };
}

// ── API 클라이언트 ───────────────────────────────────────────────────────────
// 모든 도구가 이 하나를 쓴다. 인증은 COOKIE_FILE에 모여 있고 base로 구분되므로,
// 서버를 몇 개를 오가든 각 서버 세션은 서로를 덮어쓰지 않는다.
export function createApiClient(projectRoot) {
    async function send(method, base, path, payload) {
        const cookie = getEntry(base).cookie ?? '';
        const headers = {
            ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
        };
        const url = method === 'POST' ? `${base}/${path}` : `${base}/${path}${payload}`;
        const res = await fetch(url, {
            method,
            headers,
            ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
        });
        const setCookie = res.headers.get('set-cookie');
        // 서버가 세션을 새로 만들었을 때만 set-cookie가 온다(resave:false). 즉 정상 재사용 중에는
        // 파일에 쓰기가 발생하지 않고, 봇들은 읽기만 하며 같은 세션을 공유한다.
        //
        // 다만 미인증 요청에도 새 익명 세션이 딸려 오므로(saveUninitialized:true) 그걸 무조건
        // 저장하면, 봇 여러 개가 동시에 기동했을 때 늦게 온 봇의 익명 쿠키가 먼저 인증을 끝낸
        // 봇의 세션을 덮어써 버린다. 그러면 늦은 봇도 다시 로그인하게 되고 2FA 승인 링크가
        // 봇 수만큼 날아간다. 그래서 저장은 "내가 보낸 쿠키가 아직 그대로일 때"만 한다
        // (= 내 세션이 서버에서 갱신된 경우). 그 사이 남이 더 나은 쿠키를 넣었으면 건드리지 않는다.
        // auth/* 는 그 응답 자체가 인증된 세션이므로 예외로 항상 저장한다.
        if (setCookie) {
            const fresh = setCookie.split(';')[0];
            const guard = path.startsWith('auth/') ? null : (cur) => !cur.cookie || cur.cookie === cookie;
            await updateEntry(base, { cookie: fresh }, guard);
        }
        return { res };
    }

    async function toJson(res) {
        try { return await res.json(); }
        catch { return { ok: false, msg: `HTTP ${res.status}` }; }
    }

    // 재인증 경로 자신이 다시 재인증을 부르지 않도록 auth/* 는 이쪽 raw 호출만 쓴다.
    async function rawCall(base, path, params = {}) {
        const { res } = await send('POST', base, path, params);
        return toJson(res);
    }

    // 저장된 쿠키가 지금 인증된 세션인지 서버에 직접 물어본다.
    // 쿠키 "값이 바뀌었는지"로 판정하면 안 된다 - 서버가 saveUninitialized:true라 401 응답에도
    // 새 익명 세션 쿠키를 함께 내려주고, send()가 그걸 저장하므로 값은 늘 바뀌어 있다.
    async function isAuthed(base) {
        if (!getEntry(base).cookie) return false;
        const chk = await rawCall(base, 'auth/check', {});
        return chk?.authed === true;
    }

    // 세션이 끊겼을 때의 복구. 비용이 싼 순서로 시도한다.
    async function reauth(base) {
        await acquireLock();
        try {
            // 1) 내가 락을 기다리는 사이 다른 봇이 이미 살려놨을 수 있다. 락 안에서 다시 확인한다.
            //    이게 없으면 세션이 끊긴 순간 봇 전원이 동시에 로그인으로 몰려 2FA 승인 링크가
            //    봇 수만큼 날아간다.
            if (await isAuthed(base)) return true;

            // 2) relog 토큰. 비밀번호도 2FA도 필요 없고, 쓸 때마다 서버가 TTL을 갱신해 준다.
            const token = getEntry(base).token;
            if (token) {
                const r = await rawCall(base, 'auth/check', { token });
                if (r?.authed === true) return true;
                await updateEntry(base, { token: '' }); // 만료된 토큰은 치운다
            }

            // 3) 최후에만 비밀번호 로그인(원격이면 여기서 2FA 승인을 기다린다).
            const r = await login(rawCall, base, projectRoot);
            if (r?.ok && r.token) await updateEntry(base, { token: r.token });
            return r?.ok === true;
        } finally {
            releaseLock();
        }
    }

    async function request(method, base, path, payload) {
        const first = await send(method, base, path, payload);
        // 401 = 세션 미인증(라우터 공통). 403은 브루트포스 잠금이라 재시도해도 소용없다.
        if (first.res.status !== 401 || path.startsWith('auth/')) return toJson(first.res);
        if (!(await reauth(base))) return toJson(first.res);
        const second = await send(method, base, path, payload);
        return toJson(second.res);
    }

    async function call(base, path, params = {}) {
        return request('POST', base, path, params);
    }

    async function get(base, path, query = {}) {
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null))
        ).toString();
        return request('GET', base, path, qs ? `?${qs}` : '');
    }

    // 도구의 명시적 login 명령. 이미 다른 봇이 인증해 둔 세션이 있으면 그대로 쓴다 - 봇 여러 개가
    // 동시에 기동해도 실제 로그인은 한 번, 2FA 승인 링크도 하나만 간다.
    async function authLogin(base, password) {
        await acquireLock();
        try {
            if (await isAuthed(base)) return { ok: true, reused: true };
            const r = await login(rawCall, base, projectRoot, password);
            if (r?.ok && r.token) await updateEntry(base, { token: r.token });
            return r;
        } finally {
            releaseLock();
        }
    }

    return { call, get, login: authLogin };
}
