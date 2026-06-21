import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

export function getPassword(projectRoot) {
    const candidates = [
        'Main.json',
        join('desktop', 'Main.json'),
        join(projectRoot, 'Main.json'),
        join(projectRoot, 'desktop', 'Main.json'),
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
    return { call };
}

export async function login(call, base, projectRoot) {
    const password = getPassword(projectRoot);
    return call(base, 'auth/login', { password });
}
