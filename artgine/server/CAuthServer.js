var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns, gSessionParser } from '../network/CServerMain.js';
import { CServerRouter } from '../network/CServerRouter.js';
import { GetAppJSON } from '../../desktop/MainFunc.js';
import { randomBytes } from 'crypto';
import { CHash } from '../basic/CHash.js';
const BRUTE_MAX = 5;
const BRUTE_LOCK_MS = 5 * 60 * 1000;
const GLOBAL_BRUTE_MAX = 1000;
const GLOBAL_BRUTE_WINDOW_MS = 60 * 1000;
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;
const gAuthedTokens = new Map();
const gFailMap = new Map();
let gGlobalFailTimeList = [];
let gGlobalFailUntil = 0;
export function genToken() {
    return randomBytes(32).toString('base64url');
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
    return (req.query?.token || '');
}
export function getAuthIP(req) {
    return req.ip || req.connection?.remoteAddress || 'unknown';
}
export function isAuthedReq(req) {
    return req.session?.authed === true;
}
export function isAuthedUpgrade(req) {
    return new Promise((resolve) => {
        const parser = gSessionParser;
        if (!parser) {
            resolve(false);
            return;
        }
        try {
            parser(req, {}, () => resolve(req.session?.authed === true));
        }
        catch {
            resolve(false);
        }
    });
}
export function getAuthLockMsg(ip, now = Date.now()) {
    if (gGlobalFailUntil > now) {
        const sec = Math.ceil((gGlobalFailUntil - now) / 1000);
        return `All login locked. Retry in ${sec} seconds`;
    }
    const fail = gFailMap.get(ip);
    if (fail && fail.until > now) {
        const sec = Math.ceil((fail.until - now) / 1000);
        return `Retry in ${sec} seconds`;
    }
    return null;
}
export function clearAuthFail(ip) {
    gFailMap.delete(ip);
}
export function recordGlobalAuthFail(now = Date.now()) {
    const minTime = now - GLOBAL_BRUTE_WINDOW_MS;
    gGlobalFailTimeList = gGlobalFailTimeList.filter((time) => time >= minTime);
    gGlobalFailTimeList.push(now);
    if (gGlobalFailTimeList.length >= GLOBAL_BRUTE_MAX) {
        gGlobalFailUntil = now + BRUTE_LOCK_MS;
        gGlobalFailTimeList = [];
        return 'All login locked for 5 minutes';
    }
    return null;
}
export function recordAuthFail(ip, msg = 'Authentication required') {
    const now = Date.now();
    const globalLockMsg = recordGlobalAuthFail(now);
    const fail = gFailMap.get(ip) || { count: 0, until: 0 };
    fail.count++;
    fail.until = fail.count >= BRUTE_MAX ? now + BRUTE_LOCK_MS : 0;
    gFailMap.set(ip, fail);
    return { ok: false, msg: globalLockMsg ?? (fail.count >= BRUTE_MAX ? 'Locked for 5 minutes' : msg) };
}
export function checkBrute(req, res, next) {
    const ip = getAuthIP(req);
    const msg = getAuthLockMsg(ip);
    if (msg != null) {
        res.json({ ok: false, msg });
        return;
    }
    next();
}
export function checkToken(req, res, next) {
    const ip = getAuthIP(req);
    const t = getToken(req);
    if (!t) {
        res.status(401).json({ ok: false, msg: 'Authentication required' });
        return;
    }
    const lockMsg = getAuthLockMsg(ip);
    if (lockMsg != null) {
        res.status(401).json({ ok: false, msg: lockMsg });
        return;
    }
    if (!isValidToken(t)) {
        const result = recordAuthFail(ip, 'Authentication required');
        res.status(401).json(result);
        return;
    }
    clearAuthFail(ip);
    next();
}
export async function handleAuth(ip, password) {
    const lockMsg = getAuthLockMsg(ip);
    if (lockMsg != null)
        return { ok: false, msg: lockMsg };
    const config = await GetAppJSON();
    const now = Date.now();
    const stored = config.password ?? '';
    const storedHash = stored.length >= 64 ? stored : CHash.SHA256('artgine_' + stored);
    if (password === storedHash) {
        clearAuthFail(ip);
        const token = genToken();
        gAuthedTokens.set(token, now + TOKEN_TTL_MS);
        return { ok: true, token };
    }
    return recordAuthFail(ip, 'Wrong password');
}
let CAuthServer = class CAuthServer extends CServerRouter {
    constructor() {
        super();
        this.On("/auth/login", async (_json, _req, _res) => {
            const ip = getAuthIP(_req);
            const result = await handleAuth(ip, _json.GetStr("password"));
            if (result.ok)
                _req.session.authed = true;
            _res.json(result);
            return null;
        });
        this.On("/auth/check", async (_json, _req, _res) => {
            const ip = getAuthIP(_req);
            const t = _json.GetStr("token") || getToken(_req);
            if (t) {
                const lockMsg = getAuthLockMsg(ip);
                if (lockMsg != null) {
                    _res.status(403).json({ ok: false, msg: lockMsg, authed: false });
                    return null;
                }
                if (isValidToken(t)) {
                    clearAuthFail(ip);
                    _req.session.authed = true;
                }
                else {
                    const result = recordAuthFail(ip, 'Authentication required');
                    _res.status(403).json({ ...result, authed: false });
                    return null;
                }
            }
            _res.json({ ok: true, authed: isAuthedReq(_req) });
            return null;
        });
    }
};
CAuthServer = __decorate([
    URLPatterns(["/auth/login", "/auth/check"])
], CAuthServer);
export { CAuthServer };
