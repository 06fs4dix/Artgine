// 클라이언트(브라우저) 측 인증 토큰 저장소.
// CAuthServer.ts(서버)가 발급한 토큰을 origin(서버)별로 JSON 하나에 모아 관리한다.
// 과거에는 'artgine.token'(단일 값) / 'artgine.token:<origin>'(File 전용) 키가 따로 존재해
// 서버를 하나만 쓴다는 가정 하에 동작했으나, 여러 원격 서버를 동시에 다루는 구조(File 브라우저, 원격 등록 등)에
// 맞춰 origin별 다중 세션을 하나의 JSON으로 통합한다.

const STORE_KEY = 'artgine.tokens';
const LEGACY_FLAT_KEY = 'artgine.token';
const LEGACY_PREFIX = 'artgine.token:';

interface ITokenEntry { token: string; savedAt: number; }

function readStore(): Record<string, ITokenEntry> {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}

function writeStore(store: Record<string, ITokenEntry>) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// 과거 키들을 현 origin/명시된 origin 세션으로 1회 이전한다. 멱등 동작.
function migrateLegacy() {
    const store = readStore();
    let changed = false;

    const legacyFlat = localStorage.getItem(LEGACY_FLAT_KEY);
    if (legacyFlat) {
        const origin = location.origin;
        if (!store[origin]) { store[origin] = { token: legacyFlat, savedAt: Date.now() }; changed = true; }
        localStorage.removeItem(LEGACY_FLAT_KEY);
    }

    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(LEGACY_PREFIX)) continue;
        const origin = key.slice(LEGACY_PREFIX.length);
        const token = localStorage.getItem(key);
        if (token && !store[origin]) { store[origin] = { token, savedAt: Date.now() }; changed = true; }
        localStorage.removeItem(key);
    }

    if (changed) writeStore(store);
}
migrateLegacy();

export function getAuthToken(origin: string): string {
    return readStore()[origin]?.token ?? '';
}

export function setAuthToken(origin: string, token: string): void {
    const store = readStore();
    store[origin] = { token, savedAt: Date.now() };
    writeStore(store);
}

export function removeAuthToken(origin: string): void {
    const store = readStore();
    if (!store[origin]) return;
    delete store[origin];
    writeStore(store);
}

// ---- 로그인 (2차 인증 포함) ----------------------------------------------------------------------
// 서버에 2차 인증이 켜져 있으면 auth/login은 비밀번호가 맞아도 곧장 인증하지 않고 pending2FA:true와
// 함께 토큰을 준다. 그 토큰은 메신저로 간 승인 링크를 사람이 누르기 전까지 아무 권한이 없으므로,
// 승인될 때까지 auth/check를 폴링해야 한다. 이 처리를 페이지마다 복사하지 않도록 여기 모아둔다.

export interface IAuthLoginResult { ok: boolean; token?: string; msg?: string; pending2FA?: boolean; waitMs?: number; pollMs?: number; }

// ---- 인증 상태 확인 (공용) ------------------------------------------------------------------
// 저장된 토큰이 있으면 그 유효성을 검사하고, 없어도(같은 origin이면 세션 쿠키만으로) 서버에 확인한다.
// 토큰이 있었는데 무효/만료로 판정되면 로컬 저장소에서 정리한다(호출부마다 반복하던 정리 로직을 여기 하나로 모음).
// 여러 화면(File/Memo/Chat/Browser/RemoteDesktop/Editor)이 거의 동일한 "check + cleanup" 코드를
// 각자 복사해 갖고 있던 것을 통합한 것 — 로그인 프롬프트 UI는 화면마다 달라 여기서 다루지 않는다.

// CFecth를 쓰지 않는 이유: 이 모듈은 Terminal.html처럼 번들 없이 동적 import로 불러 쓰는 곳도 있어
// 의존성을 늘리지 않는다. 또 폴링 중 403(만료)을 예외가 아니라 본문으로 읽어야 한다.
async function postJson(url: string, body: unknown): Promise<any> {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(body),
    });
    return res.json();
}

// 비밀번호 로그인 + (필요하면) 2차 인증 승인 대기까지 한 번에 처리한다.
// 승인/실패/타임아웃이 확정된 뒤에만 반환하므로 호출부는 기존처럼 ok/token만 보면 된다.
// onPending은 "승인을 기다리는 중"임을 화면에 알리고 싶을 때 쓴다.
export async function authLogin(webRootUrl: string, passwordHash: string, onPending?: () => void): Promise<IAuthLoginResult> {
    const base = webRootUrl.replace(/\/+$/, '') + '/';
    const j = await postJson(base + 'auth/login', { password: passwordHash }) as IAuthLoginResult;
    if (!j.ok || !j.pending2FA || !j.token) return j;

    onPending?.();
    const pollMs = j.pollMs ?? 1000;
    const deadline = Date.now() + (j.waitMs ?? 5 * 60 * 1000);
    while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, pollMs));
        // 서버는 세 가지를 구분해 준다: authed:true=승인 완료 / ok:true+authed:false=아직 대기 / ok:false=만료·무효
        let w: { ok?: boolean; authed?: boolean; msg?: string };
        try { w = await postJson(base + 'auth/check', { token: j.token }); }
        catch { continue; }   // 일시적인 네트워크 오류로 대기를 포기하지 않는다(만료되면 서버가 알려준다).
        if (w.authed) return { ok: true, token: j.token };
        if (w.ok === false) return { ok: false, msg: w.msg ?? '2FA approval timed out' };
    }
    return { ok: false, msg: '2FA approval timed out' };
}

export async function checkAuthed(webRootUrl: string): Promise<boolean> {
    const base = webRootUrl.replace(/\/+$/, '') + '/';
    const token = getAuthToken(webRootUrl);
    try {
        const j = await postJson(base + 'auth/check', token ? { token } : {}) as { authed?: boolean };
        if (!j?.authed && token) removeAuthToken(webRootUrl);
        return !!j?.authed;
    } catch {
        return false;
    }
}
