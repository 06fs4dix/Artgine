import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CHash } from '../../artgine/basic/CHash.js';

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

export function createApiClient(cookieFile) {
    function loadCookie() {
        try { return readFileSync(cookieFile, 'utf8').trim(); } catch { return ''; }
    }
    function saveCookie(val) {
        writeFileSync(cookieFile, val, 'utf8');
    }
    async function call(base, path, params = {}) {
        const url = `${base}/${path}`;
        const cookie = loadCookie();
        const headers = { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) };
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(params) });
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) saveCookie(setCookie.split(';')[0]);
        return res.json();
    }
    async function get(base, path, query = {}) {
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null))
        ).toString();
        const url = `${base}/${path}${qs ? `?${qs}` : ''}`;
        const cookie = loadCookie();
        const headers = { ...(cookie ? { Cookie: cookie } : {}) };
        const res = await fetch(url, { method: 'GET', headers });
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) saveCookie(setCookie.split(';')[0]);
        return res.json();
    }
    return { call, get };
}

export async function login(call, base, projectRoot) {
    const password = getPassword(projectRoot);
    const hashed = password.length >= 64 ? password : CHash.SHA256('artgine_' + password);
    return call(base, 'auth/login', { password: hashed });
}
