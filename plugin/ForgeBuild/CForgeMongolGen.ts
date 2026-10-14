import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeCurve } from "./CForgeSpline.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeWallGen } from "./CForgeWallGen.js";
import { IForgeGate, IForgeTowerR, IForgeWallR } from "./CForgeAdjust.js";
import { CForgeHutGen } from "./CForgeHutGen.js";

type ForgeGateR = IForgeGate & { a0 : number, a1 : number, arch : boolean };
export interface IForgeStupaBuf { white : CForgeMeshBuf; gold : CForgeMeshBuf; dark : CForgeMeshBuf; }

//몽골 양식. 성벽(mWallStyle) 0 = 제국 시대 흙 토성(양쪽이 기운 다진 흙, 풀 덮인 둥근 머리, 나무 문틀 문길), 1 = 에르데니 조 사원 담(흰 회벽에 녹색 기와 덮개,
//5m마다 담 위에 흰 스투파, 문은 기와 지붕 얹은 나무 문). 탑은 사원 담이면 모서리 큰 스투파(그 밖은 나무 망루)
export class CForgeMongolGen
{
    //흰 스투파(티베트식 초르텐): 세 단 네모 기단 → 사자좌 → 작은 계단 넷 → 위가 넓은 항아리 몸(보병) → 네모 하르미카 → 열세 고리 금빛 첨탑 → 일산·해와 달.
    //바닥 폭 _s, 높이는 약 1.95_s
    static Stupa(B : IForgeStupaBuf, _x : number, _z : number, _s : number, _y : number, _a : number = 0)
    {
        let y = _y;
        for(const w of [1, 0.86, 0.72]) { CForgeShape.Box(B.white, _x, _z, _s * w, _s * w, y == _y ? _y - 0.4 : y, y + _s * 0.11, _a); y += _s * 0.11; }
        CForgeShape.Box(B.white, _x, _z, _s * 0.62, _s * 0.62, y, y + _s * 0.17, _a);
        //사자좌 네 면 가운데 작은 감실
        for(let k = 0; k < 4; k++)
        {
            const a = _a + k * Math.PI * 0.5, nx = Math.cos(a), nz = Math.sin(a), o = _s * 0.31;
            CForgeShape.Decal(B.dark, _x + nx * o, y + _s * 0.085, _z + nz * o, -nz, nx, nx, nz, _s * 0.12, _s * 0.09);
        }
        y += _s * 0.17;
        for(let k = 0; k < 4; k++) { const w = _s * (0.54 - k * 0.045); CForgeShape.Box(B.white, _x, _z, w, w, y, y + _s * 0.05, _a); y += _s * 0.05; }
        CForgeTowerGen.Lathe(B.white, _x, _z, [[_s * 0.19, y], [_s * 0.21, y + _s * 0.06], [_s * 0.26, y + _s * 0.24], [_s * 0.25, y + _s * 0.3], [_s * 0.17, y + _s * 0.36], [_s * 0.05, y + _s * 0.38]], 16);
        y += _s * 0.36;
        CForgeShape.Box(B.white, _x, _z, _s * 0.2, _s * 0.2, y, y + _s * 0.1, _a);
        CForgeShape.Box(B.white, _x, _z, _s * 0.25, _s * 0.25, y + _s * 0.1, y + _s * 0.13, _a);
        y += _s * 0.13;
        CForgeTowerGen.Lathe(B.gold, _x, _z, [[_s * 0.09, y], [_s * 0.05, y + _s * 0.45]], 10);
        for(let k = 0; k < 13; k++) { const t = k / 13, r = _s * (0.095 - t * 0.04), yy = y + _s * 0.45 * t; CForgeTowerGen.Ring(B.gold, _x, _z, r * 0.9, r + 0.012, yy, yy + _s * 0.012, 10); }
        y += _s * 0.45;
        CForgeTowerGen.Lathe(B.gold, _x, _z, [[0.01, y], [_s * 0.13, y + _s * 0.03], [_s * 0.1, y + _s * 0.06], [0.01, y + _s * 0.07]], 12);
        CForgeTowerGen.Lathe(B.gold, _x, _z, [[0.01, y + _s * 0.07], [_s * 0.035, y + _s * 0.1], [0.01, y + _s * 0.13], [0, y + _s * 0.2]], 8);
    }
    static sStupaH = 1.95;

    //유목 진영 울타리(하샤, 성벽 자리): 유목 진영은 성벽이 없고 게르 마당을 세로 널판 나무 울타리로 둘렀다.
    //2m 이하 세로 널판 벽 + 2.4m마다 기둥 + 양면 위아래 가로대, 문은 높은 문기둥 둘과 위 가로보(칠한 붉은 나무)
    static sFenceH = 2.0;
    static Khashaa(_w : IForgeWallR, c : CForgeCurve, Gnd : (_s : number) => number, H : (_s : number) => number, gates : ForgeGateR[]) : IForgePart[]
    {
        const L = c.mLen, T = CForgeTheme.Of(_w), Hh = (_s : number) => Math.min(H(_s), CForgeMongolGen.sFenceH), step = 0.4;
        const board = new CForgeMeshBuf(), post = new CForgeMeshBuf(), gate = new CForgeMeshBuf();
        const spans : number[][] = [];
        let s0 = 0;
        for(const q of gates) { if(q.a0 > s0) spans.push([s0, q.a0]); s0 = Math.max(s0, q.a1); }
        if(s0 < L) spans.push([s0, L]);
        for(const [a, b] of spans)
        {
            if(b - a < 0.05) continue;
            const ss = c.Steps(a, b, step), o = { cap0 : !(_w.closed && a <= 0), cap1 : !(_w.closed && b >= L) };
            CForgeShape.Band(board, c, ss, () => 0.04, _s => Gnd(_s) - 0.2, _s => Gnd(_s) + Hh(_s), o);
            for(const f of [0.2, 0.85]) for(const sd of [1, -1]) CForgeShape.Band(post, c, ss, () => 0.035, _s => Gnd(_s) + Hh(_s) * f, _s => Gnd(_s) + Hh(_s) * f + 0.1, {}, () => sd * 0.075);
            for(let s = Math.ceil(a / 2.4) * 2.4; s <= b; s += 2.4) { const p = c.At(s); CForgeShape.Box(post, p.p[0], p.p[1], 0.16, 0.16, Gnd(s) - 0.4, Gnd(s) + Hh(s) + 0.12, Math.atan2(p.tz, p.tx)); }
        }
        for(const q of gates)
        {
            const a = c.At(q.s), g = Gnd(q.s), top = g + CForgeMongolGen.sFenceH + 0.6;
            for(const s of [q.a0, q.a1]) { const p = c.At(s); CForgeShape.Box(gate, p.p[0], p.p[1], 0.24, 0.24, Gnd(s) - 0.4, top, Math.atan2(p.tz, p.tx)); }
            CForgeShape.Box(gate, a.p[0], a.p[1], q.a1 - q.a0 + 0.7, 0.26, top - 0.3, top, Math.atan2(a.tz, a.tx));
        }
        const parts : IForgePart[] = [{ buf : board, rgb : T.mFenceWood, tex : CForgeTex.sPlank }, { buf : post, rgb : T.mFenceWood.map(_v => _v * 0.85), tex : CForgeTex.sWood },
            { buf : gate, rgb : T.mShutter[0], tex : CForgeTex.sWood }];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    //게르 수레(게르 테렉, 탑 자리): 망루 대신 소가 끄는 큰 수레 위에 얹은 게르. 바퀴 넷(살 여덟), 널판 바닥, 앞으로 뻗은 끌채 둘
    static CartR(_t : IForgeTowerR) : number { return Math.min(3, Math.max(1.8, _t.r)); }
    static sCartDeck = 1.3;
    static GerCart(_t : IForgeTowerR, _g : number, T : CForgeTheme) : IForgePart[]
    {
        const [cx, cz] = _t.c, r = CForgeMongolGen.CartR(_t), a = _t.door ?? (_t.attach.length > 0 ? _t.attach[0] + Math.PI * 0.5 : 0), ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
        const wood = new CForgeMeshBuf(), deck = new CForgeMeshBuf(), dy = _g + CForgeMongolGen.sCartDeck, wr = 0.75;
        const P = (_u : number, _v : number, _y : number) => [cx + ux * _u + vx * _v, _y, cz + uz * _u + vz * _v];
        CForgeShape.Box(deck, cx, cz, r * 2 + 0.6, r * 2 + 0.2, dy - 0.22, dy, a);
        for(const au of [-r * 0.55, r * 0.55])
        {
            CForgeTowerGen.Strut(wood, P(au, -r - 0.45, _g + wr), P(au, r + 0.45, _g + wr), 0.12);
            for(const sv of [-1, 1])
            {
                const v0 = sv * (r + 0.35), seg = 12;
                for(let k = 0; k < seg; k++)
                {
                    const t0 = k / seg * Math.PI * 2, t1 = (k + 1) / seg * Math.PI * 2;
                    CForgeTowerGen.Strut(wood, P(au + Math.cos(t0) * wr, v0, _g + wr + Math.sin(t0) * wr), P(au + Math.cos(t1) * wr, v0, _g + wr + Math.sin(t1) * wr), 0.1);
                    if(k % 3 == 0) CForgeTowerGen.Strut(wood, P(au, v0, _g + wr), P(au + Math.cos(t0) * wr, v0, _g + wr + Math.sin(t0) * wr), 0.05);
                }
            }
        }
        for(const sv of [-0.5, 0.5]) CForgeTowerGen.Strut(wood, P(r + 0.2, sv, dy - 0.15), P(r + 3.6, sv * 0.4, _g + 0.6), 0.12);
        const HB = CForgeHutGen.Bufs();
        CForgeHutGen.Hut(HB, 0, cx, cz, r, dy, a, 0, _t.seed, false);
        const parts : IForgePart[] = [...CForgeHutGen.Parts(HB, T, _t.seed), { buf : wood, rgb : T.mWood, tex : CForgeTex.sWood }, { buf : deck, rgb : T.mWood.map(_v => Math.min(1, _v * 1.2)), tex : CForgeTex.sPlank }];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    static Wall(_w : IForgeWallR, c : CForgeCurve, Gnd : (_s : number) => number, Top : (_s : number) => number, H : (_s : number) => number, gates : ForgeGateR[]) : IForgePart[]
    {
        if(CForgeTheme.Of(_w).mWallStyle == 2) return CForgeMongolGen.Khashaa(_w, c, Gnd, H, gates);
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), step = 0.5, temple = T.mWallStyle == 1;
        const body = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), wood = new CForgeMeshBuf(), turf = new CForgeMeshBuf(), S = { white : new CForgeMeshBuf(), gold : new CForgeMeshBuf(), dark : new CForgeMeshBuf() };
        const Sink = (_s : number) => Gnd(_s) - 1.0, Spread = (_s : number) => (Top(_s) - Sink(_s)) * (temple ? 0.02 : 0.25);
        const spans : number[][] = [];
        let s0 = 0;
        for(const q of gates) { if(q.a0 > s0) spans.push([s0, q.a0]); s0 = Math.max(s0, q.a1); }
        if(s0 < L) spans.push([s0, L]);
        const InGate = (_s : number, _pad : number) => gates.some(_q => _s > _q.a0 - _pad && _s < _q.a1 + _pad);
        for(const [a, b] of spans)
        {
            if(b - a < 0.05) continue;
            const ss = c.Steps(a, b, step), cap0 = !(_w.closed && a <= 0), cap1 = !(_w.closed && b >= L);
            if(temple)
            {
                CForgeShape.Band(body, c, ss, () => half, Sink, Top, { cap0, cap1 });
                CForgeWallGen.TileCap(cap, c, ss, half, Top);
                continue;
            }
            for(const sd of [1, -1]) CForgeWallGen.Batter(body, c, ss, half, sd, Sink, Top, Spread, cap0, cap1);
            CForgeShape.Band(turf, c, ss, () => half * 0.9, Top, _s => Top(_s) + 0.12, { cap0, cap1 });
        }
        if(temple)
        {
            const st = Math.max(1.6, _w.thick * 1.6);
            for(let s = 2.5; s < L - 1; s += 5)
            {
                if(InGate(s, st * 0.6)) continue;
                const p = c.At(s);
                CForgeMongolGen.Stupa(S, p.p[0], p.p[1], st, Top(s) + 0.3, Math.atan2(p.tz, p.tx));
            }
        }
        for(const q of gates)
        {
            const a = c.At(q.s), hg = half + (temple ? 0.3 : Spread(q.s) * 0.5);
            CForgeWallGen.TimberGate(body, wood, c, q, hg, Gnd, H, _s => Top(_s) + 0.02);
            if(!temple) continue;
            const W = (_a : number, _b : number, _y : number) => [a.p[0] + a.tx * _a - a.tz * _b, _y, a.p[1] + a.tz * _a + a.tx * _b];
            CForgeShape.GableRoof(cap, wood, null, W, -q.w * 0.5 - 0.6, q.w * 0.5 + 0.6, -hg - 0.3, hg + 0.3, Top(q.s) + 0.4, 0.55, 0.5, 0.3, 0.12);
        }
        const parts : IForgePart[] = [
            { buf : body, rgb : T.mWallBody, tex : temple ? CForgeTex.sPlaster : CForgeTex.sHangtu }, { buf : cap, rgb : T.mWallCap, tex : CForgeTex.sGiwa },
            { buf : wood, rgb : T.mPillar ?? T.mWood, tex : CForgeTex.sWood }, { buf : turf, rgb : T.mGreen, tex : CForgeTex.sTurf },
            { buf : S.white, rgb : T.mTowerBody, tex : CForgeTex.sPlaster }, { buf : S.gold, rgb : T.mGold }, { buf : S.dark, rgb : T.mDark },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //사원 담 모서리 큰 스투파(탑 자리): 반지름 r의 두 배 폭
    static Tower(_t : IForgeTowerR, _g : number, _top : number, T : CForgeTheme) : IForgePart[]
    {
        if(T.mWallStyle == 2) return CForgeMongolGen.GerCart(_t, _g, T);
        const S = { white : new CForgeMeshBuf(), gold : new CForgeMeshBuf(), dark : new CForgeMeshBuf() }, s = CForgeMongolGen.TowerS(_t);
        CForgeMongolGen.Stupa(S, _t.c[0], _t.c[1], s, _g, _t.attach.length > 0 ? _t.attach[0] : 0);
        const parts : IForgePart[] = [{ buf : S.white, rgb : T.mTowerBody, tex : CForgeTex.sPlaster }, { buf : S.gold, rgb : T.mGold }, { buf : S.dark, rgb : T.mDark }];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static TowerS(_t : IForgeTowerR) : number { return Math.max(3, Math.min(_t.r * 2.2, _t.height / CForgeMongolGen.sStupaH)); }
}
