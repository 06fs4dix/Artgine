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
import { CStorage } from '../system/CStorage.js';
import { CMessenger } from './CMessenger.js';
const BRUTE_MAX = 5;
const BRUTE_LOCK_MS = 5 * 60 * 1000;
const GLOBAL_BRUTE_MAX = 1000;
const GLOBAL_BRUTE_WINDOW_MS = 60 * 1000;
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;
const gAuthedTokens = new Map();
const gFailMap = new Map();
let gGlobalFailTimeList = [];
let gGlobalFailUntil = 0;
const TWO_FACTOR_SESSION_KEY = 'auth.twoFactor.sessionId';
const TWO_FACTOR_PENDING_MS = 5 * 60 * 1000;
const TWO_FACTOR_POLL_MS = 1000;
const gPending = new Map();
function sweepPending(_now = Date.now()) {
    for (const [approveToken, p] of gPending) {
        if (_now - p.createdAt > TWO_FACTOR_PENDING_MS)
            gPending.delete(approveToken);
    }
}
function escapeHtml(_s) {
    return _s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function getPeerIP(_req) {
    return String(_req.socket?.remoteAddress ?? _req.connection?.remoteAddress ?? 'unknown');
}
function displayIp(_ip) {
    if (_ip === '::1')
        return '127.0.0.1';
    const mapped = _ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    return mapped ? mapped[1] : _ip;
}
export function isLocalReq(_req) {
    const ip = getPeerIP(_req).replace(/^::ffff:/i, '');
    return ip === '127.0.0.1' || ip === '::1';
}
async function getServerBaseUrl() {
    const config = await GetAppJSON();
    return String(config.url ?? '').trim().replace(/^(https?:)\/(?!\/)/i, '$1//').replace(/\/+$/, '');
}
export function getTwoFactorSessionId() {
    const raw = CStorage.Get(TWO_FACTOR_SESSION_KEY, 0);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
}
export function setTwoFactorSessionId(_sessionId) {
    CStorage.Set(TWO_FACTOR_SESSION_KEY, String(_sessionId | 0));
}
export function genToken() {
    return randomBytes(32).toString('base64url');
}
export function isValidToken(token) {
    const e = gAuthedTokens.get(token);
    if (!e || e.exp < Date.now()) {
        gAuthedTokens.delete(token);
        return false;
    }
    if (e.pending2FA)
        return false;
    e.exp = Date.now() + TOKEN_TTL_MS;
    return true;
}
export function isPending2FAToken(token) {
    const e = gAuthedTokens.get(token);
    return e != null && e.exp >= Date.now() && e.pending2FA;
}
function markTokenPending2FA(token) {
    gAuthedTokens.set(token, { exp: Date.now() + TWO_FACTOR_PENDING_MS, pending2FA: true });
}
function approveToken2FA(token) {
    if (!gAuthedTokens.has(token))
        return;
    gAuthedTokens.set(token, { exp: Date.now() + TOKEN_TTL_MS, pending2FA: false });
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
        gAuthedTokens.set(token, { exp: now + TOKEN_TTL_MS, pending2FA: false });
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
            if (!result.ok) {
                _res.json(result);
                return null;
            }
            const sessionId = getTwoFactorSessionId();
            if (sessionId <= 0 || isLocalReq(_req)) {
                _req.session.authed = true;
                _res.json(result);
                return null;
            }
            const base = await getServerBaseUrl();
            if (base === '') {
                _res.json({ ok: false, msg: '2FA is on but this server has no url configured (settings.json "url")' });
                return null;
            }
            sweepPending();
            const approveToken = genToken();
            const peerIp = getPeerIP(_req);
            gPending.set(approveToken, {
                createdAt: Date.now(),
                ip: peerIp,
                fwdIp: ip !== peerIp ? ip : '',
                userAgent: String(_req.headers['user-agent'] ?? 'unknown'),
                token: result.token ?? '',
            });
            markTokenPending2FA(result.token ?? '');
            try {
                const link = `${base}/auth/twoFactor?token=${approveToken}`;
                await CMessenger.Send(sessionId, 'auth', `Two-factor authentication approval requested. Tap the link below within 5 minutes to approve.\n${link}`);
            }
            catch (e) {
                gPending.delete(approveToken);
                revokeToken(result.token ?? '');
                _res.json({ ok: false, msg: '2FA message send failed: ' + e.message });
                return null;
            }
            _res.json({ ...result, pending2FA: true, waitMs: TWO_FACTOR_PENDING_MS, pollMs: TWO_FACTOR_POLL_MS });
            return null;
        });
        this.On("/auth/twoFactor", async (_json, _req, _res) => {
            const approveToken = String(_json.GetStr("token") ?? '');
            if (_req.method === 'POST') {
                const target = gPending.get(approveToken);
                if (target != null) {
                    approveToken2FA(target.token);
                    gPending.delete(approveToken);
                }
                _res.json({ ok: target != null });
                return null;
            }
            const p = gPending.get(approveToken);
            const bootstrapCss = `${this.mPath}/artgine/external/legacy/bootstrap-5.3.3-dist/css/bootstrap.min.css`;
            const bootstrapJs = `${this.mPath}/artgine/external/legacy/bootstrap-5.3.3-dist/js/bootstrap.min.js`;
            const head = `<meta name="viewport" content="width=device-width, initial-scale=1">
                <link rel="stylesheet" href="${bootstrapCss}">`;
            _res.type('html').send(p != null
                ? `<html><head>${head}</head><body>
                    <div class="container py-4" style="max-width:480px;">
                        <h4 class="mb-3">Approve this login?</h4>
                        <p class="mb-1"><strong>IP:</strong> ${escapeHtml(displayIp(p.ip))}</p>
                        ${p.fwdIp === '' ? '' : `<p class="mb-1 text-secondary small">Forwarded-For (client-reported, can be spoofed): ${escapeHtml(displayIp(p.fwdIp))}</p>`}
                        <p class="mb-4" style="word-break:break-all;"><strong>Browser:</strong> ${escapeHtml(p.userAgent)}</p>
                        <button id="approveBtn" class="btn btn-primary btn-lg w-100">Approve</button>
                        <p id="approveMsg" class="mt-3 fs-5"></p>
                    </div>
                    <script src="${bootstrapJs}"></script>
                    <script>
                        document.getElementById('approveBtn').onclick = async () => {
                            const r = await fetch(location.pathname + location.search, { method: 'POST' });
                            const j = await r.json().catch(() => ({ ok: false }));
                            document.getElementById('approveMsg').textContent = j.ok ? 'Approved. You can close this page.' : 'This approval link is invalid or expired.';
                            if (j.ok) window.close();
                        };
                    </script>
                   </body></html>`
                : `<html><head>${head}</head><body>
                    <div class="container py-4" style="max-width:480px;">
                        <p class="fs-5">This approval link is invalid or expired.</p>
                    </div>
                   </body></html>`);
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
                else if (isPending2FAToken(t)) {
                    _res.json({ ok: true, authed: false });
                    return null;
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
        this.On("/auth/twoFactorConfig", async (_json, _req, _res) => {
            if (!isAuthedReq(_req)) {
                _res.status(403).json({ ok: false, msg: 'Authentication required' });
                return null;
            }
            if (_json.GetVal("sessionId") !== undefined)
                setTwoFactorSessionId(Number(_json.GetInt("sessionId")) || 0);
            _res.json({ ok: true, sessionId: getTwoFactorSessionId() });
            return null;
        });
    }
};
CAuthServer = __decorate([
    URLPatterns(["/auth/login", "/auth/check", "/auth/twoFactor", "/auth/twoFactorConfig"])
], CAuthServer);
export { CAuthServer };
