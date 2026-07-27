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

export function hashPassword(password) {
    return password.length >= 64 ? password : CHash.SHA256('artgine_' + password);
}

export async function login(call, base, projectRoot) {
    const password = getPassword(projectRoot);
    return call(base, 'auth/login', { password: hashPassword(password) });
}

// createApiClient는 쿠키 파일 하나에 세션 문자열 하나만 담아 "서버 하나만 상대"하는 도구용이다.
// remote.js처럼 한 프로세스에서 여러 원격 서버를 동시에 오가며 각자 세션을 유지해야 하면,
// 같은 파일을 base URL별로 덮어쓰다 서로 다른 서버의 쿠키가 뒤섞이므로 base를 키로 하는
// JSON 맵으로 따로 관리한다.
export function createMultiApiClient(cookieFile) {
    function loadMap() {
        try { return JSON.parse(readFileSync(cookieFile, 'utf8')); } catch { return {}; }
    }
    function saveMap(map) {
        writeFileSync(cookieFile, JSON.stringify(map, null, 2), 'utf8');
    }
    async function call(base, path, params = {}) {
        const url = `${base}/${path}`;
        const map = loadMap();
        const cookie = map[base] ?? '';
        const headers = { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) };
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(params) });
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) { map[base] = setCookie.split(';')[0]; saveMap(map); }
        return res.json();
    }
    return { call };
}
