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
