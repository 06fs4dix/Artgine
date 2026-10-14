import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape, ForgeGround } from "./CForgeShape.js";
import { CForgeCurve, CForgeSpline } from "./CForgeSpline.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { IForgeLineR, IForgeStairR } from "./CForgeAdjust.js";

//다리·계단 생성기. style 1 = 돌, 2 = 나무, 그 밖은 테마(목책 테마면 나무)
export class CForgeBridgeGen
{
    static sSpan = 8;
    static sStep = 0.19;

    static IsWood(_r : { style? : number, theme? : string, over? : any }) : boolean
    {
        return _r.style == 2 || (_r.style != 1 && CForgeTheme.Of(_r).mWallKind == 1);
    }
    static Curve(_p : IForgeLineR) : CForgeCurve
    {
        return new CForgeCurve(CForgeSpline.Sample(_p.pts.map(_q => [_q[0], _q[1]]), 0.4));
    }
    //다리 재질: style이 정했으면 그 값, 아니면 일본 다리(무지개 목교)·목책 타입은 나무
    static IsWoodBridge(_r : IForgeLineR) : boolean
    {
        return _r.style == 2 || (_r.style != 1 && (CForgeBridgeGen.IsWood(_r) || CForgeTheme.Of(_r).mBridge == CForgeTheme.eBridge.Japan));
    }
    //가운데 솟음: 유럽 돌다리는 낮고, 한국 홍예교는 조금, 고려 판돌 다리는 거의 평평, 일본 무지개 목교·중국 아치 석교는 크게 솟는다
    static Hump(_r : IForgeLineR, _L : number) : number
    {
        const B = CForgeTheme.eBridge, k = CForgeTheme.Of(_r).mBridge, wood = CForgeBridgeGen.IsWoodBridge(_r);
        if(k == B.Rope && _r.style != 1 && _r.style != 2) return -Math.min(2.4, _L * 0.07);
        if(k == B.Japan && wood) return Math.min(1.6, _L * 0.12);
        if(k == B.China && !wood) return Math.min(2.4, _L * 0.16);
        if(k == B.Korea && !wood) return Math.min(1.1, _L * 0.08);
        if(k == B.Slab && !wood) return Math.min(0.3, _L * 0.02);
        return wood ? Math.min(0.25, _L * 0.02) : Math.min(0.9, _L * 0.06);
    }
    //상판 높이(호 길이 s). 양 끝은 강둑 지면에 닿고 가운데는 솟는다. 중간 지면이 더 높으면 그 위로 올린다
    static Deck(_c : CForgeCurve, _g : ForgeGround, _r : IForgeLineR) : (_s : number) => number
    {
        const L = _c.mLen, G = (_s : number) => { const a = _c.At(_s); return _g(a.p[0], a.p[1]); };
        const y0 = G(0) + 0.12, y1 = G(L) + 0.12, hump = CForgeBridgeGen.Hump(_r, L);
        const memo = new Map<number, number>();
        return (_s : number) =>
        {
            let v = memo.get(_s);
            if(v == null)
            {
                const t = Math.min(1, Math.max(0, _s / Math.max(1e-6, L)));
                v = Math.max(y0 + (y1 - y0) * t + hump * Math.sin(Math.PI * t), G(_s) + 0.12);
                memo.set(_s, v);
            }
            return v;
        };
    }

    static Bridge(_p : IForgeLineR, _g : ForgeGround) : IForgePart[]
    {
        if(_p.pts.length < 2) return [];
        const c = CForgeBridgeGen.Curve(_p), L = c.mLen;
        if(L < 1) return [];
        const T = CForgeTheme.Of(_p), wood = CForgeBridgeGen.IsWoodBridge(_p), half = _p.width * 0.5, D = CForgeBridgeGen.Deck(c, _g, _p), BK = CForgeTheme.eBridge, kind = T.mBridge;
        const G = (_s : number) => { const a = c.At(_s); return _g(a.p[0], a.p[1]); };
        const Side = (_s : number, _off : number) => { const a = c.At(_s); return [a.p[0] - a.tz * _off, a.p[1] + a.tx * _off, Math.atan2(a.tz, a.tx)]; };
        const steps = c.Steps(0, L, 0.25);
        //잉카 밧줄 현수교(케스와차카): 양 끝 다각석 받침과 닻돌 기둥, 가운데로 처지는 풀 밧줄 바닥, 1m 위 손잡이 밧줄 둘과 그 사이 촘촘한 세로 밧줄
        if(kind == BK.Rope && _p.style != 1 && _p.style != 2)
        {
            const stone = new CForgeMeshBuf(), deck = new CForgeMeshBuf(), rope = new CForgeMeshBuf(), hw = Math.min(half, 0.75);
            for(const s of [0, L])
            {
                const [x, z, a] = Side(s, 0), sg = s == 0 ? -1 : 1, bx = x + Math.cos(a) * sg * 0.8, bz = z + Math.sin(a) * sg * 0.8;
                CForgeShape.Box(stone, bx, bz, 2.0, hw * 2 + 1.4, G(s) - 1.2, D(s) - 0.05, a);
                for(const side of [1, -1]) { const [px, pz] = Side(s, side * (hw + 0.35)); CForgeShape.Box(stone, px + Math.cos(a) * sg * 0.5, pz + Math.sin(a) * sg * 0.5, 0.5, 0.5, D(s) - 0.3, D(s) + 1.25, a); }
            }
            CForgeShape.Band(deck, c, steps, () => hw, _s => D(_s) - 0.1, _s => D(_s), { bottom : true });
            for(const side of [1, -1])
            {
                CForgeShape.Band(rope, c, steps, () => 0.05, _s => D(_s) + 1.0, _s => D(_s) + 1.1, { bottom : true }, () => side * (hw + 0.15));
                CForgeShape.Band(rope, c, steps, () => 0.06, _s => D(_s) - 0.16, _s => D(_s) - 0.02, { bottom : true }, () => side * (hw - 0.04));
                for(let s = 0.3; s < L - 0.2; s += 0.35)
                {
                    const [x0, z0] = Side(s, side * (hw - 0.02)), [x1, z1] = Side(s, side * (hw + 0.15));
                    CForgeTowerGen.Strut(rope, [x0, D(s) - 0.02, z0], [x1, D(s) + 1.02, z1], 0.025);
                }
            }
            const th = T.mThatch[_p.seed % T.mThatch.length];
            const parts : IForgePart[] = [{ buf : stone, rgb : T.mStone, tex : CForgeTex.sInca }, { buf : deck, rgb : th.map(_v => _v * 0.85), tex : CForgeTex.sThatch }, { buf : rope, rgb : th.map(_v => _v * 0.75), tex : CForgeTex.sThatch }];
            return parts.filter(_q => _q.buf.mIdx.length > 0);
        }
        if(wood)
        {
            const plank = new CForgeMeshBuf(), beam = new CForgeMeshBuf();
            CForgeShape.Band(plank, c, steps, () => half, _s => D(_s) - 0.1, _s => D(_s), { bottom : true });
            for(const side of [1, -1])
                CForgeShape.Band(beam, c, steps, () => 0.1, _s => D(_s) - 0.42, _s => D(_s) - 0.1, { bottom : true }, () => side * (half - 0.3));
            const m = Math.max(1, Math.round(L / 3));
            for(let k = 1; k < m; k++)
            {
                const s = L * k / m, top = D(s) - 0.42;
                if(top - G(s) < 0.3) continue;
                const ends : number[][] = [];
                for(const side of [1, -1])
                {
                    const [x, z, a] = Side(s, side * (half - 0.3)), g = _g(x, z);
                    CForgeShape.Box(beam, x, z, 0.22, 0.22, g - 0.4, top, a);
                    ends.push([x, g, z]);
                }
                const [cx, cz, a] = Side(s, 0);
                CForgeShape.Box(beam, cx, cz, 0.2, _p.width - 0.2, top - 0.2, top, a);
                if(top - Math.max(ends[0][1], ends[1][1]) > 1.6)
                {
                    const lo = Math.max(ends[0][1], ends[1][1]) + 0.3;
                    CForgeTowerGen.Strut(beam, [ends[0][0], top - 0.25, ends[0][2]], [ends[1][0], lo, ends[1][2]], 0.12);
                    CForgeTowerGen.Strut(beam, [ends[1][0], top - 0.25, ends[1][2]], [ends[0][0], lo, ends[0][2]], 0.12);
                }
            }
            //난간: 일본 무지개 다리는 주칠 기둥에 청동 보주(擬宝珠) 머리, 그 밖은 나무 기둥
            const jp = kind == BK.Japan, rail = jp ? new CForgeMeshBuf() : beam, cap = new CForgeMeshBuf(), np = Math.max(1, Math.round(L / (jp ? 1.5 : 1.8)));
            for(const side of [1, -1])
            {
                const off = side * (half - 0.06);
                for(let k = 0; k <= np; k++)
                {
                    const s = L * k / np, [x, z, a] = Side(s, off), end = jp && (k == 0 || k == np);
                    CForgeShape.Box(rail, x, z, end ? 0.2 : 0.12, end ? 0.2 : 0.12, D(s) - 0.1, D(s) + (end ? 1.2 : 1.0), a);
                    if(jp) CForgeTowerGen.Lathe(cap, x, z, [[0.06, D(s) + (end ? 1.2 : 1.0)], [0.1, D(s) + (end ? 1.3 : 1.08)], [0.04, D(s) + (end ? 1.42 : 1.18)], [0, D(s) + (end ? 1.52 : 1.26)]], 8);
                }
                for(const [r0, r1] of [[0.5, 0.58], [0.92, 1.0]])
                    CForgeShape.Band(rail, c, steps, () => 0.04, _s => D(_s) + r0, _s => D(_s) + r1, { bottom : true }, () => off);
            }
            const parts : IForgePart[] = [{ buf : plank, rgb : T.mWood.map(_v => Math.min(1, _v * 1.3)), tex : CForgeTex.sPlank }, { buf : beam, rgb : T.mWood, tex : CForgeTex.sWood }];
            if(jp) parts.push({ buf : rail, rgb : T.mPillar, tex : CForgeTex.sWood }, { buf : cap, rgb : T.mMetal });
            return parts.filter(_q => _q.buf.mIdx.length > 0);
        }

        //경간마다 반원에 가까운 아치. 받침(양 끝 강둑, 사이 교각)에서는 낮은 쪽 지면 아래까지 내려가 묻힌다
        const body = new CForgeMeshBuf(), deck = new CForgeMeshBuf(), cap = new CForgeMeshBuf();
        if(kind == BK.Slab)
        {
            //고려 판돌 다리(선죽교): 돌기둥 교각 줄마다 멍에돌을 걸고 그 위에 두꺼운 판돌, 양옆 굵은 돌기둥(둥근 머리) 사이 두 줄 난간대
            CForgeShape.Band(body, c, steps, () => half, _s => D(_s) - 0.38, D, { bottom : true });
            CForgeShape.Band(deck, c, steps, () => half - 0.3, D, _s => D(_s) + 0.01, { left : false, right : false, cap0 : false, cap1 : false });
            const m = Math.max(1, Math.round(L / 2.4));
            for(let k = 1; k < m; k++)
            {
                const s = L * k / m, top = D(s) - 0.38;
                if(top - G(s) < 0.2) continue;
                const [cx, cz, a] = Side(s, 0), l = Side(s, half), r = Side(s, -half), g = Math.min(_g(l[0], l[1]), _g(r[0], r[1]), G(s));
                CForgeShape.Box(body, cx, cz, 0.5, _p.width + 0.3, top - 0.28, top, a);
                CForgeShape.Box(body, cx, cz, 0.7, _p.width - 0.1, g - 0.5, top - 0.28, a);
            }
            const np = Math.max(2, Math.round(L / 1.5));
            for(const side of [1, -1])
            {
                const off = side * (half - 0.16);
                CForgeShape.Band(body, c, steps, () => 0.18, _s => D(_s) - 0.05, _s => D(_s) + 0.1, {}, () => off);
                for(let k = 0; k <= np; k++)
                {
                    const s = L * k / np, [x, z, a] = Side(s, off), end = k == 0 || k == np, hp = end ? 1.0 : 0.82, pw = end ? 0.32 : 0.26;
                    CForgeShape.Box(cap, x, z, pw, pw, D(s), D(s) + hp, a);
                    CForgeTowerGen.Lathe(cap, x, z, [[pw * 0.5, D(s) + hp], [pw * 0.58, D(s) + hp + 0.05], [pw * 0.42, D(s) + hp + 0.16], [0, D(s) + hp + 0.24]], 8);
                }
                for(const [r0, r1] of [[0.26, 0.36], [0.58, 0.68]]) CForgeShape.Band(cap, c, steps, () => 0.07, _s => D(_s) + r0, _s => D(_s) + r1, { bottom : true }, () => off);
            }
            return [{ buf : body, rgb : T.mStone, tex : CForgeTex.sSeongdol }, { buf : deck, rgb : T.mStone.map(_v => _v * 0.95), tex : CForgeTex.sStone }, { buf : cap, rgb : T.mStone, tex : CForgeTex.sStone }];
        }
        const n = Math.max(1, Math.round(L / CForgeBridgeGen.sSpan)), span = L / n;
        //교각 쪽 아치 끝은 교각 폭 절반만큼 물려서, 두 아치가 교각 위에서 뾰족하게 만나지 않고 기둥으로 내려가게 한다
        const pier = 1.4;
        const Under = (_s : number) =>
        {
            const k = Math.min(n - 1, Math.floor(_s / span)), sa = k * span;
            const a0 = sa + (k > 0 ? pier * 0.5 : 0), a1 = sa + span - (k < n - 1 ? pier * 0.5 : 0);
            const spring = Math.min(G(sa), G(sa + span)) - 0.3;
            if(_s <= a0 || _s >= a1) return spring - 0.3;
            const t = (_s - a0) / (a1 - a0), rise = Math.max(0, D(sa + span * 0.5) - 0.6 - spring);
            return spring + rise * Math.sqrt(Math.max(0, 1 - (2 * t - 1) * (2 * t - 1)));
        };
        const sup : number[] = [];
        for(let k = 0; k <= n; k++) sup.push(k * span, ...(k > 0 && k < n ? [k * span - pier * 0.5, k * span + pier * 0.5] : []));
        const ss = [...new Set([...steps, ...sup])].sort((_a, _b) => _a - _b);
        CForgeShape.Band(body, c, ss, () => half, Under, D, { top : false, bottom : true });
        CForgeShape.Band(deck, c, steps, () => half - 0.3, D, _s => D(_s) + 0.01, { left : false, right : false, cap0 : false, cap1 : false });
        for(const side of [1, -1])
        {
            const off = side * (half - 0.18);
            if(kind == BK.Korea || kind == BK.China)
            {
                //한국 홍예교: 낮은 돌기둥 사이 두 줄 돌 난간대. 중국 아치 석교: 돌기둥 사이 낮은 판돌 난간, 기둥 머리 둥근 돌
                const kr = kind == BK.Korea, np = Math.max(2, Math.round(L / (kr ? 1.6 : 1.3))), hp = kr ? 0.75 : 0.85;
                CForgeShape.Band(body, c, steps, () => 0.2, _s => D(_s) - 0.05, _s => D(_s) + 0.12, {}, () => off);
                for(let k = 0; k <= np; k++)
                {
                    const s = L * k / np, [x, z, a] = Side(s, off);
                    CForgeShape.Box(cap, x, z, 0.22, 0.22, D(s), D(s) + hp, a);
                    if(!kr) CForgeTowerGen.Lathe(cap, x, z, [[0.1, D(s) + hp], [0.13, D(s) + hp + 0.08], [0.06, D(s) + hp + 0.2], [0, D(s) + hp + 0.24]], 8);
                }
                if(kr) for(const [r0, r1] of [[0.3, 0.38], [0.62, 0.7]]) CForgeShape.Band(cap, c, steps, () => 0.06, _s => D(_s) + r0, _s => D(_s) + r1, { bottom : true }, () => off);
                else CForgeShape.Band(cap, c, steps, () => 0.07, _s => D(_s) + 0.12, _s => D(_s) + 0.62, { bottom : true }, () => off);
                continue;
            }
            CForgeShape.Band(body, c, steps, () => 0.18, _s => D(_s) - 0.05, _s => D(_s) + 0.8, {}, () => off);
            CForgeShape.Band(cap, c, steps, () => 0.23, _s => D(_s) + 0.8, _s => D(_s) + 0.92, { bottom : true }, () => off);
        }
        for(let k = 1; k < n; k++)
        {
            const s = k * span, [x, z, a] = Side(s, 0), g = G(s);
            CForgeShape.Box(body, x, z, 1.5, _p.width + 0.7, g - 0.6, g + Math.min(1.2, (D(s) - g) * 0.35), a);
        }
        const east = kind == BK.Korea || kind == BK.China, st = east ? T.mStone : T.mWallStone;
        return [{ buf : body, rgb : st, tex : kind == BK.Korea ? CForgeTex.sSeongdol : CForgeTex.sStone }, { buf : deck, rgb : east ? T.mStone.map(_v => _v * 0.95) : T.mPebble[0], tex : CForgeTex.sStone },
            { buf : cap, rgb : east ? T.mStone : T.mWallCap, tex : CForgeTex.sStone }];
    }

    static Stair(_r : IForgeStairR, _g : ForgeGround) : IForgePart[]
    {
        const a = _r.pts[0], b = _r.pts[1], run = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if(run < 0.3) return [];
        const tx = (b[0] - a[0]) / run, tz = (b[1] - a[1]) / run, nx = -tz, nz = tx, ang = Math.atan2(tz, tx);
        const [y0, y1] = _r.y, rise = y1 - y0, n = Math.max(1, Math.round(rise / CForgeBridgeGen.sStep)), tread = run / n, half = _r.width * 0.5;
        const T = CForgeTheme.Of(_r), wood = CForgeBridgeGen.IsWood(_r);
        const P = (_s : number, _v : number) => [a[0] + tx * _s + nx * _v, a[1] + tz * _s + nz * _v];
        const Gmin = (_s0 : number, _s1 : number, _v : number) =>
        {
            let m = Infinity;
            for(const s of [_s0, _s1]) for(const v of [-_v, _v]) { const q = P(s, v); m = Math.min(m, _g(q[0], q[1])); }
            return m;
        };
        const Nose = (_s : number) => Math.min(y1, y0 + rise * Math.min(1, _s / run) + rise / n);
        if(!wood)
        {
            const stone = new CForgeMeshBuf(), cheek = new CForgeMeshBuf();
            for(let k = 0; k < n; k++)
            {
                const s0 = k * tread, s1 = (k + 1) * tread, top = y0 + rise * (k + 1) / n, q = P((s0 + s1) * 0.5, 0);
                CForgeShape.Box(stone, q[0], q[1], tread + 0.01, _r.width, Math.min(top - 0.2, Gmin(s0, s1, half) - 0.3), top, ang);
            }
            if(_r.land > 0)
            {
                const q = P(run + _r.land * 0.5, 0);
                CForgeShape.Box(stone, q[0], q[1], _r.land, _r.width, Math.min(y1 - 0.2, Gmin(run, run + _r.land, half) - 0.3), y1, ang);
            }
            const c = new CForgeCurve([[a[0], a[1]], [b[0], b[1]]]), st = c.Steps(0, run, Math.max(0.25, tread));
            for(const side of [1, -1])
            {
                const off = side * (half + 0.15);
                CForgeShape.Band(cheek, c, st, () => 0.15, _s => { const q = P(_s, off); return Math.min(Nose(_s) - 0.2, _g(q[0], q[1]) - 0.3); }, _s => Nose(_s) + 0.3, {}, () => off);
            }
            return [{ buf : stone, rgb : T.mStone, tex : CForgeTex.sStone }, { buf : cheek, rgb : T.mWallStone, tex : CForgeTex.sStone }];
        }

        const plank = new CForgeMeshBuf(), beam = new CForgeMeshBuf();
        for(let k = 0; k < n; k++)
        {
            const s0 = k * tread, s1 = (k + 1) * tread, top = y0 + rise * (k + 1) / n, q = P((s0 + s1) * 0.5, 0);
            CForgeShape.Box(plank, q[0], q[1], tread + 0.04, _r.width, top - 0.07, top, ang);
        }
        const V3 = (_s : number, _v : number, _y : number) => { const q = P(_s, _v); return [q[0], _y, q[1]]; };
        const Post = (_s : number, _v : number, _top : number) => { const q = P(_s, _v); CForgeShape.Box(beam, q[0], q[1], 0.14, 0.14, _g(q[0], q[1]) - 0.3, _top, ang); };
        if(_r.land > 0)
        {
            const q = P(run + _r.land * 0.5, 0);
            CForgeShape.Box(plank, q[0], q[1], _r.land + 0.04, _r.width, y1 - 0.07, y1, ang);
            for(const v of [half - 0.07, 0.07 - half]) Post(run + _r.land - 0.07, v, y1 - 0.07);
        }
        for(const side of [1, -1])
        {
            const v = side * (half + 0.06);
            CForgeTowerGen.Strut(beam, V3(0, v, y0 - 0.12), V3(run, v, y1 - 0.08), 0.14);
            const pq = P(run, v);
            if(y1 - _g(pq[0], pq[1]) > 0.4) Post(run - 0.07, v, y1 - 0.08);
            const mq = P(run * 0.5, v);
            if(run > 3 && (y0 + y1) * 0.5 - _g(mq[0], mq[1]) > 0.8) Post(run * 0.5, v, (y0 + y1) * 0.5 - 0.1);
            if(rise > 1)
            {
                const rv = side * (half + 0.14);
                Post(0.07, rv, y0 + rise / n + 0.95);
                Post(run - 0.07, rv, y1 + 0.95);
                CForgeTowerGen.Strut(beam, V3(0.07, rv, y0 + rise / n + 0.9), V3(run - 0.07, rv, y1 + 0.9), 0.08);
            }
        }
        return [{ buf : plank, rgb : T.mWood.map(_v => Math.min(1, _v * 1.3)), tex : CForgeTex.sPlank }, { buf : beam, rgb : T.mWood, tex : CForgeTex.sWood }];
    }
}
