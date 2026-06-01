var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CServerRouter } from '../network/CServerRouter.js';
import { GetAppJSON } from '../../desktop/MainFunc.js';
const BRUTE_MAX = 5;
const BRUTE_LOCK_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;
const gAuthedTokens = new Map();
const gFailMap = new Map();
export function genToken() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
}
export function isValidToken(token) {
    const exp = gAuthedTokens.get(token);
    if (!exp || exp < Date.now()) {
        gAuthedTokens.delete(token);
        return false;
    }
    gAuthedTokens.set(token, Date.now() + TOKEN_TTL_MS);
    return true;
}
export function revokeToken(token) {
    gAuthedTokens.delete(token);
}
export function getToken(req) {
    return (req.query?.token || req.headers?.['x-ai-token'] || req.headers?.['x-cmd-token'] || '');
}
export function checkBrute(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const fail = gFailMap.get(ip);
    if (fail && fail.until > now) {
        const sec = Math.ceil((fail.until - now) / 1000);
        res.json({ ok: false, msg: `Retry in ${sec} seconds` });
        return;
    }
    next();
}
export function checkToken(req, res, next) {
    const t = getToken(req);
    if (!t || !isValidToken(t)) {
        res.status(401).json({ ok: false, msg: 'Authentication required' });
        return;
    }
    next();
}
export async function handleAuth(ip, password) {
    const config = await GetAppJSON();
    const now = Date.now();
    if (password === (config.password ?? '')) {
        gFailMap.delete(ip);
        const token = genToken();
        gAuthedTokens.set(token, now + TOKEN_TTL_MS);
        return { ok: true, token };
    }
    const fail = gFailMap.get(ip) || { count: 0, until: 0 };
    fail.count++;
    fail.until = fail.count >= BRUTE_MAX ? now + BRUTE_LOCK_MS : 0;
    gFailMap.set(ip, fail);
    const msg = fail.count >= BRUTE_MAX ? 'Locked for 5 minutes' : 'Wrong password';
    return { ok: false, msg };
}
export function checkWsToken(urlObj) {
    const token = urlObj.searchParams.get('token') || '';
    return isValidToken(token) ? token : null;
}
let CAuthServer = class CAuthServer extends CServerRouter {
    constructor() {
        super();
        this.On("/auth/login", async (_json, _req, _res) => {
            const ip = _req.ip || _req.connection?.remoteAddress || 'unknown';
            const now = Date.now();
            const fail = gFailMap.get(ip);
            if (fail && fail.until > now) {
                const sec = Math.ceil((fail.until - now) / 1000);
                _res.json({ ok: false, msg: `Retry in ${sec} seconds` });
                return null;
            }
            const result = await handleAuth(ip, _json.GetStr("password"));
            if (!result.ok)
                _res.status(403);
            _res.json(result);
            return null;
        });
        this.On("/auth/check", async (_json, _req, _res) => {
            const t = _json.GetStr("token") || getToken(_req);
            _res.json({ ok: !!t && isValidToken(t) });
            return null;
        });
    }
};
CAuthServer = __decorate([
    URLPatterns(["/auth/login", "/auth/check"])
], CAuthServer);
export { CAuthServer };
