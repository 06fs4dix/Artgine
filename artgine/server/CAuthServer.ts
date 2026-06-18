import { CJSON } from '../basic/CJSON.js';
import { URLPatterns, gSessionParser } from '../network/CServerMain.js';
import { CServerRouter } from '../network/CServerRouter.js';
import { Request, Response } from 'express';
import { GetAppJSON } from '../../desktop/MainFunc.js';
import { randomBytes } from 'crypto';

const BRUTE_MAX     = 5;
const BRUTE_LOCK_MS = 5 * 60 * 1000;
const GLOBAL_BRUTE_MAX       = 1000;
const GLOBAL_BRUTE_WINDOW_MS = 60 * 1000;
const TOKEN_TTL_MS  = 4 * 60 * 60 * 1000;
const gAuthedTokens = new Map<string, number>();
const gFailMap      = new Map<string, { count: number; until: number }>();
let gGlobalFailTimeList: number[] = [];
let gGlobalFailUntil = 0;

export function genToken(): string {
    return randomBytes(32).toString('base64url');
}

export function isValidToken(token: string): boolean {
    const exp = gAuthedTokens.get(token);
    if (!exp || exp < Date.now()) {
        gAuthedTokens.delete(token);
        return false;
    }
    gAuthedTokens.set(token, Date.now() + TOKEN_TTL_MS);
    return true;
}

export function revokeToken(token: string): void {
    gAuthedTokens.delete(token);
}

export function getToken(req: any): string {
    return (req.query?.token || '') as string;
}

export function getAuthIP(req: any): string {
    return req.ip || req.connection?.remoteAddress || 'unknown';
}

// 일반 요청 인증: 세션 쿠키만으로 판정 (토큰 불필요)
export function isAuthedReq(req: any): boolean {
    return req.session?.authed === true;
}

// WebSocket 업그레이드 인증: 미들웨어가 자동 실행되지 않으므로 공유 세션 파서를
// 직접 호출해 req.session을 채운 뒤 authed 여부를 반환한다.
export function isAuthedUpgrade(req: any): Promise<boolean> {
    return new Promise((resolve) => {
        const parser = gSessionParser;
        if (!parser) { resolve(false); return; }
        try {
            parser(req, {}, () => resolve(req.session?.authed === true));
        } catch {
            resolve(false);
        }
    });
}

export function getAuthLockMsg(ip: string, now = Date.now()): string | null {
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

export function clearAuthFail(ip: string): void {
    gFailMap.delete(ip);
}

export function recordGlobalAuthFail(now = Date.now()): string | null {
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

export function recordAuthFail(ip: string, msg = 'Authentication required'): { ok: false; msg: string } {
    const now = Date.now();
    const globalLockMsg = recordGlobalAuthFail(now);
    const fail = gFailMap.get(ip) || { count: 0, until: 0 };
    fail.count++;
    fail.until = fail.count >= BRUTE_MAX ? now + BRUTE_LOCK_MS : 0;
    gFailMap.set(ip, fail);
    return { ok: false, msg: globalLockMsg ?? (fail.count >= BRUTE_MAX ? 'Locked for 5 minutes' : msg) };
}

export function checkBrute(req: any, res: any, next: any): void {
    const ip = getAuthIP(req);
    const msg = getAuthLockMsg(ip);
    if (msg != null) {
        res.json({ ok: false, msg });
        return;
    }
    next();
}

export function checkToken(req: any, res: any, next: any): void {
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

export async function handleAuth(ip: string, password: string): Promise<{ ok: boolean; token?: string; msg?: string }> {
    const lockMsg = getAuthLockMsg(ip);
    if (lockMsg != null) return { ok: false, msg: lockMsg };

    const config = await GetAppJSON();
    const now = Date.now();
    if (password === (config.password ?? '')) {
        clearAuthFail(ip);
        const token = genToken();
        gAuthedTokens.set(token, now + TOKEN_TTL_MS);
        return { ok: true, token };
    }
    return recordAuthFail(ip, 'Wrong password');
}

@URLPatterns(["/auth/login", "/auth/check"])
export class CAuthServer extends CServerRouter {
    constructor() {
        super();

        // 비밀번호 로그인: 성공 시 세션에 인증 표시 + 토큰 발급(재접속용 relog 자격증명).
        this.On("/auth/login", async (_json: CJSON, _req: Request, _res: Response) => {
            const ip = getAuthIP(_req);
            const result = await handleAuth(ip, _json.GetStr("password"));
            if (result.ok) (_req as any).session.authed = true;
            else _res.status(403);
            _res.json(result);
            return null;
        });

        // 세션 유효성 확인. 토큰이 주어지면 relog: 토큰이 살아있으면 세션을 재설정한다.
        // (서버가 살아있는데 세션 쿠키만 잃은 경우 복구용)
        this.On("/auth/check", async (_json: CJSON, _req: Request, _res: Response) => {
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
                    (_req as any).session.authed = true;
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
}
