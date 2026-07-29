import { CJSON } from '../basic/CJSON.js';
import { URLPatterns, gSessionParser } from '../network/CServerMain.js';
import { CServerRouter } from '../network/CServerRouter.js';
import { Request, Response } from 'express';
import { GetAppJSON } from '../../desktop/MainFunc.js';
import { randomBytes } from 'crypto';
import { CHash } from '../basic/CHash.js';
import { CStorage } from '../system/CStorage.js';
import { CMessenger } from './CMessenger.js';

const BRUTE_MAX     = 5;
const BRUTE_LOCK_MS = 5 * 60 * 1000;
const GLOBAL_BRUTE_MAX       = 1000;
const GLOBAL_BRUTE_WINDOW_MS = 60 * 1000;
const TOKEN_TTL_MS  = 4 * 60 * 60 * 1000;
// pending2FA인 토큰은 발급은 됐지만 아직 아무 권한이 없다. 권한 판정이 전부 isValidToken 한 곳을
// 거치므로, 여기서 막으면 File/Terminal/RemoteDesktop 등 모든 라우터가 자동으로 함께 막힌다.
const gAuthedTokens = new Map<string, { exp: number; pending2FA: boolean }>();
const gFailMap      = new Map<string, { count: number; until: number }>();
let gGlobalFailTimeList: number[] = [];
let gGlobalFailUntil = 0;

// 2차 인증(메신저 승인) 설정: Env.json(CStorage)에 저장 — Control 옵션 탭의 셀렉트박스가 이 키를 편집한다.
// 값이 0(선택 안 함)이면 비활성, 그 외엔 승인 메시지를 보낼 메신저 세션 id.
const TWO_FACTOR_SESSION_KEY = 'auth.twoFactor.sessionId';
const TWO_FACTOR_PENDING_MS  = 5 * 60 * 1000;
const TWO_FACTOR_POLL_MS     = 1000;

// approveToken -> 승인 대기 상태. 서버 전용 메모리(재시작 시 초기화 — 재시작 중이던 로그인은 실패
// 처리되는 게 자연스럽다). ip/userAgent는 승인 페이지에 "이 요청이 정말 나인지" 보여주기 위한 표시용이다.
//
// approveToken은 메신저 링크에 실려 나가는 승인 전용 값으로, 클라이언트가 들고 있는 인증 토큰과 일부러
// 다른 값이다. 링크가 새더라도 그걸 본 사람은 남의 로그인을 승인해 줄 수만 있고 자기 자신을 인증시킬 수는 없다.
interface ITwoFactorPending {
    createdAt: number;
    ip: string;        // 실제 TCP 피어 주소(위조 불가)
    fwdIp: string;     // X-Forwarded-For 기반 req.ip가 피어와 다를 때만 채운다(클라이언트 주장값)
    userAgent: string;
    token: string;     // 승인되면 살려낼 인증 토큰
}
const gPending = new Map<string, ITwoFactorPending>();

// 승인 없이 방치된 항목이 계속 쌓이지 않게 로그인 시마다 만료분을 걷어낸다.
function sweepPending(_now = Date.now()): void {
    for (const [approveToken, p] of gPending) {
        if (_now - p.createdAt > TWO_FACTOR_PENDING_MS) gPending.delete(approveToken);
    }
}

function escapeHtml(_s: string): string {
    return _s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 실제 TCP 피어 주소. getAuthIP(req.ip)는 'trust proxy'=true라 X-Forwarded-For 헤더로 위조할 수 있으므로,
// 2FA 스킵 판정이나 승인 페이지 표시처럼 "속으면 안 되는" 용도에는 반드시 이쪽을 쓴다.
export function getPeerIP(_req: any): string {
    return String(_req.socket?.remoteAddress ?? _req.connection?.remoteAddress ?? 'unknown');
}

// 표시용 IP 정규화. ::1(IPv6 루프백)은 127.0.0.1로, ::ffff:1.2.3.4(IPv4-매핑 IPv6)는
// 접두사를 벗겨 순수 IPv4로 보여준다 — 값 자체는 잘린 게 아니라 정상 IPv6 표기라 헷갈리지 않게 변환만 한다.
function displayIp(_ip: string): string {
    if (_ip === '::1') return '127.0.0.1';
    const mapped = _ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    return mapped ? mapped[1] : _ip;
}

// 서버와 같은 머신에서 온 요청인지. ai/tool/remote.js 같은 로컬 자동화가 사람 승인 없이 붙어야 하므로
// 이 경우 2FA를 건너뛴다. 주의: 같은 머신에서 리버스 프록시(nginx 등)를 앞에 두면 모든 외부 트래픽의
// 피어 주소가 루프백이 되어 이 판정이 무너진다 — 그런 구성을 도입하면 이 함수를 다시 손봐야 한다.
export function isLocalReq(_req: any): boolean {
    const ip = getPeerIP(_req).replace(/^::ffff:/i, '');
    return ip === '127.0.0.1' || ip === '::1';
}

// 메신저로 보낼 승인 링크의 베이스 URL. 클라이언트가 알려준 주소(요청 본문의 webRootUrl이나 Host 헤더)를
// 쓰면 비밀번호를 아는 공격자가 링크를 자기 서버로 돌려 approveToken을 가로챌 수 있으므로, 서버 자신의
// 설정값만 신뢰한다.
async function getServerBaseUrl(): Promise<string> {
    const config = await GetAppJSON();
    // settings.json의 url이 "http:/host:8050/Artgine"처럼 슬래시가 하나 빠져 있는 경우가 있어 보정한다.
    return String(config.url ?? '').trim().replace(/^(https?:)\/(?!\/)/i, '$1//').replace(/\/+$/, '');
}

export function getTwoFactorSessionId(): number {
    const raw = CStorage.Get(TWO_FACTOR_SESSION_KEY, 0);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
}

export function setTwoFactorSessionId(_sessionId: number): void {
    CStorage.Set(TWO_FACTOR_SESSION_KEY, String(_sessionId | 0));
}

export function genToken(): string {
    return randomBytes(32).toString('base64url');
}

export function isValidToken(token: string): boolean {
    const e = gAuthedTokens.get(token);
    if (!e || e.exp < Date.now()) {
        gAuthedTokens.delete(token);
        return false;
    }
    // 2FA 승인 전에는 발급만 된 상태라 어떤 권한도 주지 않는다.
    if (e.pending2FA) return false;
    e.exp = Date.now() + TOKEN_TTL_MS;
    return true;
}

// 2FA 승인을 기다리는 중인 토큰인지. /auth/check가 이걸로 "아직 승인 안 됨"과 "무효/만료"를 구분한다.
export function isPending2FAToken(token: string): boolean {
    const e = gAuthedTokens.get(token);
    return e != null && e.exp >= Date.now() && e.pending2FA;
}

// 승인 대기로 전환. 유효기간도 승인 제한시간에 맞춰 줄여둔다 — 끝내 승인되지 않으면 5분 뒤
// 그냥 만료된 토큰이 되므로, 폴링하던 클라이언트는 별도 신호 없이 실패를 감지할 수 있다.
function markTokenPending2FA(token: string): void {
    gAuthedTokens.set(token, { exp: Date.now() + TWO_FACTOR_PENDING_MS, pending2FA: true });
}

// 승인 완료. 그 순간부터 토큰이 살아나고 유효기간도 정상 TTL로 돌아간다.
function approveToken2FA(token: string): void {
    if (!gAuthedTokens.has(token)) return;
    gAuthedTokens.set(token, { exp: Date.now() + TOKEN_TTL_MS, pending2FA: false });
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

@URLPatterns(["/auth/login", "/auth/check", "/auth/twoFactor", "/auth/twoFactorConfig"])
export class CAuthServer extends CServerRouter {
    constructor() {
        super();

        // 비밀번호 로그인: 성공 시 세션에 인증 표시 + 토큰 발급(재접속용 relog 자격증명).
        // 2FA가 켜져 있으면 세션은 인증시키지 않고, 토큰만 "승인 대기(pending2FA)" 상태로 발급한 뒤
        // 메신저로 승인 링크를 보낸다. 그 토큰은 승인 전까지 isValidToken에서 걸러져 아무 권한이 없다.
        // 호출자는 /auth/check를 폴링하다 authed:true가 되면 완료다
        // (예전엔 이 요청을 최대 5분 붙잡고 있었는데, 원격 서버를 상대할 때 그 유휴 커넥션이
        //  중간 장비에서 끊길 위험이 있어 폴링을 호출자 쪽으로 옮겼다).
        this.On("/auth/login", async (_json: CJSON, _req: Request, _res: Response) => {
            const ip = getAuthIP(_req);
            const result = await handleAuth(ip, _json.GetStr("password"));
            if (!result.ok) { _res.json(result); return null; }

            // 세션 미선택 = 2FA 비활성. 로컬 요청도 2FA를 건너뛴다(사람이 승인해 줄 수 없는 자동화 경로).
            const sessionId = getTwoFactorSessionId();
            if (sessionId <= 0 || isLocalReq(_req)) {
                (_req as any).session.authed = true;
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
            } catch (e) {
                gPending.delete(approveToken);
                revokeToken(result.token ?? '');
                _res.json({ ok: false, msg: '2FA message send failed: ' + (e as Error).message });
                return null;
            }

            _res.json({ ...result, pending2FA: true, waitMs: TWO_FACTOR_PENDING_MS, pollMs: TWO_FACTOR_POLL_MS });
            return null;
        });

        // 메신저 승인 링크가 여는 엔드포인트. 이 요청은 폰 쪽 세션이라 여기서 세션 인증을 하지 않는다
        // (자기 세션 쿠키를 든 원래 /auth/login 요청이 폴링으로 감지해 자기 세션을 인증시킨다).
        // approveToken은 genToken()의 32바이트 랜덤값이라 추측 불가능.
        //
        // GET은 승인하지 않고 버튼 있는 페이지만 보여준다 - 디스코드/텔레그램은 메시지에 링크가 오면
        // 미리보기(임베드)를 만들려고 그 URL을 사람 클릭 전에 자동으로 GET해버린다. GET에서 바로
        // approved=true를 세팅했더니 사람이 누르기도 전에 미리보기 요청만으로 인증이 뚫리는 사고가 실제
        // 있었다. 그래서 실제 승인은 그 페이지의 버튼이 실행하는 POST에서만 처리한다(미리보기 봇은
        // 정적 HTML만 받아갈 뿐 그 안의 JS를 실행해 POST를 보내지 않는다).
        this.On("/auth/twoFactor", async (_json: CJSON, _req: Request, _res: Response) => {
            const approveToken = String(_json.GetStr("token") ?? '');
            if (_req.method === 'POST') {
                const target = gPending.get(approveToken);
                if (target != null) {
                    approveToken2FA(target.token);
                    gPending.delete(approveToken);   // 승인은 한 번만 (링크 재사용 방지)
                }
                _res.json({ ok: target != null });
                return null;
            }
            const p = gPending.get(approveToken);
            const bootstrapCss = `${this.mPath}/artgine/external/legacy/bootstrap-5.3.3-dist/css/bootstrap.min.css`;
            const bootstrapJs  = `${this.mPath}/artgine/external/legacy/bootstrap-5.3.3-dist/js/bootstrap.min.js`;
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
                // 2FA 승인 대기 중인 토큰. 클라이언트가 승인될 때까지 이 엔드포인트를 반복 호출하므로
                // 실패로 세면 사람이 승인을 누르기도 전에 자기 IP가 브루트포스 잠금에 걸린다.
                // 승인되지 않은 채 5분이 지나면 토큰 자체가 만료돼 아래 실패 분기로 떨어진다.
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

        // 2FA 설정 조회/저장. Control 옵션 탭의 셀렉트박스가 쓴다. 인증된 세션만 허용.
        this.On("/auth/twoFactorConfig", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isAuthedReq(_req)) { _res.status(403).json({ ok: false, msg: 'Authentication required' }); return null; }

            if (_json.GetVal("sessionId") !== undefined) setTwoFactorSessionId(Number(_json.GetInt("sessionId")) || 0);

            _res.json({ ok: true, sessionId: getTwoFactorSessionId() });
            return null;
        });
    }
}
