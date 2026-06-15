import { CJSON } from '../basic/CJSON.js';
import { URLPatterns, gSessionParser } from '../network/CServerMain.js';
import { CServerRouter } from '../network/CServerRouter.js';
import { Request, Response } from 'express';
import { GetAppJSON } from '../../desktop/MainFunc.js';

const BRUTE_MAX     = 5;
const BRUTE_LOCK_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS  = 4 * 60 * 60 * 1000;
const gAuthedTokens = new Map<string, number>();
const gFailMap      = new Map<string, { count: number; until: number }>();

export function genToken(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
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

export function checkBrute(req: any, res: any, next: any): void {
    const ip  = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const fail = gFailMap.get(ip);
    if (fail && fail.until > now) {
        const sec = Math.ceil((fail.until - now) / 1000);
        res.json({ ok: false, msg: `Retry in ${sec} seconds` });
        return;
    }
    next();
}

export function checkToken(req: any, res: any, next: any): void {
    const t = getToken(req);
    if (!t || !isValidToken(t)) {
        res.status(401).json({ ok: false, msg: 'Authentication required' });
        return;
    }
    next();
}

export async function handleAuth(ip: string, password: string): Promise<{ ok: boolean; token?: string; msg?: string }> {
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

@URLPatterns(["/auth/login", "/auth/check"])
export class CAuthServer extends CServerRouter {
    constructor() {
        super();

        // 비밀번호 로그인: 성공 시 세션에 인증 표시 + 토큰 발급(재접속용 relog 자격증명).
        this.On("/auth/login", async (_json: CJSON, _req: Request, _res: Response) => {
            const ip  = _req.ip || (_req.connection as any)?.remoteAddress || 'unknown';
            const now = Date.now();
            const fail = gFailMap.get(ip);
            if (fail && fail.until > now) {
                const sec = Math.ceil((fail.until - now) / 1000);
                _res.json({ ok: false, msg: `Retry in ${sec} seconds` });
                return null;
            }
            const result = await handleAuth(ip, _json.GetStr("password"));
            if (result.ok) (_req as any).session.authed = true;
            else _res.status(403);
            _res.json(result);
            return null;
        });

        // 세션 유효성 확인. 토큰이 주어지면 relog: 토큰이 살아있으면 세션을 재설정한다.
        // (서버가 살아있는데 세션 쿠키만 잃은 경우 복구용)
        this.On("/auth/check", async (_json: CJSON, _req: Request, _res: Response) => {
            const t = _json.GetStr("token") || getToken(_req);
            if (t && isValidToken(t)) (_req as any).session.authed = true;
            _res.json({ ok: true, authed: isAuthedReq(_req) });
            return null;
        });
    }
}
