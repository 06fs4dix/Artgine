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
