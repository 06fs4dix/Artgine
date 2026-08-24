const STORE_KEY = 'artgine.tokens';
const LEGACY_FLAT_KEY = 'artgine.token';
const LEGACY_PREFIX = 'artgine.token:';
function readStore() {
    try {
        return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    }
    catch {
        return {};
    }
}
function writeStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
}
function migrateLegacy() {
    const store = readStore();
    let changed = false;
    const legacyFlat = localStorage.getItem(LEGACY_FLAT_KEY);
    if (legacyFlat) {
        const origin = location.origin;
        if (!store[origin]) {
            store[origin] = { token: legacyFlat, savedAt: Date.now() };
            changed = true;
        }
        localStorage.removeItem(LEGACY_FLAT_KEY);
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(LEGACY_PREFIX))
            continue;
        const origin = key.slice(LEGACY_PREFIX.length);
        const token = localStorage.getItem(key);
        if (token && !store[origin]) {
            store[origin] = { token, savedAt: Date.now() };
            changed = true;
        }
        localStorage.removeItem(key);
    }
    if (changed)
        writeStore(store);
}
migrateLegacy();
export function getAuthToken(origin) {
    return readStore()[origin]?.token ?? '';
}
export function setAuthToken(origin, token) {
    const store = readStore();
    store[origin] = { token, savedAt: Date.now() };
    writeStore(store);
}
export function removeAuthToken(origin) {
    const store = readStore();
    if (!store[origin])
        return;
    delete store[origin];
    writeStore(store);
}
async function postJson(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(body),
    });
    return res.json();
}
export async function authLogin(webRootUrl, passwordHash, onPending) {
    const base = webRootUrl.replace(/\/+$/, '') + '/';
    const j = await postJson(base + 'auth/login', { password: passwordHash });
    if (!j.ok || !j.pending2FA || !j.token)
        return j;
    onPending?.();
    const pollMs = j.pollMs ?? 1000;
    const deadline = Date.now() + (j.waitMs ?? 5 * 60 * 1000);
    while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, pollMs));
        let w;
        try {
            w = await postJson(base + 'auth/check', { token: j.token });
        }
        catch {
            continue;
        }
        if (w.authed)
            return { ok: true, token: j.token };
        if (w.ok === false)
            return { ok: false, msg: w.msg ?? '2FA approval timed out' };
    }
    return { ok: false, msg: '2FA approval timed out' };
}
export async function checkAuthed(webRootUrl) {
    const base = webRootUrl.replace(/\/+$/, '') + '/';
    const token = getAuthToken(webRootUrl);
    try {
        const j = await postJson(base + 'auth/check', token ? { token } : {});
        if (!j?.authed && token)
            removeAuthToken(webRootUrl);
        return !!j?.authed;
    }
    catch {
        return false;
    }
}
