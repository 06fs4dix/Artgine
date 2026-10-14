import { ForgeV2 } from "./CForgeScene.js";
import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { IForgePart } from "./CForgeMeshBuf.js";
import { CForgeShape, ForgeGround } from "./CForgeShape.js";
import { CForgeCurve, CForgeSpline } from "./CForgeSpline.js";
import { CForgeRand } from "./CForgeRand.js";
import { IForgeLineR } from "./CForgeAdjust.js";
import { CForgeWallGen } from "./CForgeWallGen.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";

//울타리·길 생성기. 기둥·돌 배치는 시작점부터의 칸 번호 해시로 정해 끝을 고쳐도 앞쪽 배치가 그대로다
export class CForgePropGen
{
    static sWood = [0.5, 0.36, 0.23];
    static sDirt = [0.7, 0.6, 0.45];
    static sPebble = [[0.74, 0.71, 0.66], [0.66, 0.63, 0.58], [0.8, 0.77, 0.71]];

    static Fence(_f : IForgeLineR, _g : ForgeGround) : IForgePart[]
    {
        if(_f.pts.length < 2) return [];
        const c = new CForgeCurve(CForgeSpline.Sample(_f.pts.map(_q => [_q[0], _q[1]]), 0.3)), L = c.mLen, b = new CForgeMeshBuf();
        const T = CForgeTheme.Of(_f), F = CForgeTheme.eFence, kind = T.mFence;
        const G = (_s : number) => { const a = c.At(_s); return _g(a.p[0], a.p[1]); }, ss = c.Steps(0, L, 0.4);
        //막돌 담(지중해): 둥근 막돌을 쌓고 납작한 돌을 얹은 낮은 담
        if(kind == F.DryStone)
        {
            const h = (_f.h ?? 1.05) * 1.1, cap = new CForgeMeshBuf();
            CForgeShape.Band(b, c, ss, () => 0.28, _s => G(_s) - 0.3, _s => G(_s) + h);
            CForgeShape.Band(cap, c, ss, () => 0.33, _s => G(_s) + h, _s => G(_s) + h + 0.1);
            return [{ buf : b, rgb : T.mStone, tex : CForgeTex.sDoldam }, { buf : cap, rgb : T.mWallCap, tex : CForgeTex.sStone }];
        }
        //돌 난간(르네상스): 아래 받침돌 + 0.3m마다 배 불룩한 난간동자 + 위 갓돌, 2.4m마다 네모 기둥
        if(kind == F.Balustrade)
        {
            const h = (_f.h ?? 1.05), cap = new CForgeMeshBuf();
            CForgeShape.Band(b, c, ss, () => 0.2, _s => G(_s) - 0.3, _s => G(_s) + 0.18);
            CForgeShape.Band(cap, c, ss, () => 0.2, _s => G(_s) + h - 0.12, _s => G(_s) + h);
            const np = Math.max(1, Math.round(L / 2.4));
            for(let k = 0, n = Math.round(L / 0.3); k < n; k++)
            {
                const s = (k + 0.5) * L / n, a = c.At(s), y0 = G(s) + 0.18, y1 = G(s) + h - 0.12, hh = y1 - y0;
                if(Math.abs(s - Math.round(s / (L / np)) * (L / np)) < 0.2) continue;
                CForgeTowerGen.Lathe(b, a.p[0], a.p[1], [[0.06, y0], [0.1, y0 + hh * 0.3], [0.05, y0 + hh * 0.75], [0.07, y1]], 6);
            }
            for(let k = 0; k <= np; k++) { const a = c.At(L * k / np), g = G(L * k / np); CForgeShape.Box(cap, a.p[0], a.p[1], 0.3, 0.3, g - 0.3, g + h + 0.08, Math.atan2(a.tz, a.tx)); }
            return [{ buf : b, rgb : T.mStone, tex : CForgeTex.sStone }, { buf : cap, rgb : T.mStone.map(_v => _v * 0.95), tex : CForgeTex.sStone }];
        }
        //철책(근대): 낮은 돌 받침 위 검은 쇠 창살(끝이 뾰족), 위아래 가로대, 2.4m마다 돌 기둥
        if(kind == F.Railing)
        {
            const h = (_f.h ?? 1.05) * 1.2, iron = new CForgeMeshBuf(), np = Math.max(1, Math.round(L / 2.4));
            CForgeShape.Band(b, c, ss, () => 0.16, _s => G(_s) - 0.3, _s => G(_s) + 0.35);
            for(const y of [0.42, h - 0.12]) CForgeShape.Band(iron, c, ss, () => 0.02, _s => G(_s) + y, _s => G(_s) + y + 0.04);
            for(let k = 0, n = Math.round(L / 0.14); k < n; k++)
            {
                const s = (k + 0.5) * L / n, a = c.At(s), g = G(s);
                CForgeTowerGen.Lathe(iron, a.p[0], a.p[1], [[0.014, g + 0.35], [0.014, g + h], [0.03, g + h + 0.02], [0, g + h + 0.12]], 4);
            }
            for(let k = 0; k <= np; k++) { const a = c.At(L * k / np), g = G(L * k / np); CForgeShape.Box(b, a.p[0], a.p[1], 0.36, 0.36, g - 0.3, g + h + 0.15, Math.atan2(a.tz, a.tx)); }
            return [{ buf : b, rgb : T.mStone, tex : CForgeTex.sStone }, { buf : iron, rgb : T.mIron }];
        }
        //회색 벽돌 담(중국 북방): 벽돌 담 + 기와 덮개
        if(kind == F.BrickWall)
        {
            const h = (_f.h ?? 1.05) * 1.6, cap = new CForgeMeshBuf();
            CForgeShape.Band(b, c, ss, () => 0.18, _s => G(_s) - 0.3, _s => G(_s) + h);
            CForgeWallGen.TileCap(cap, c, ss, 0.18, _s => G(_s) + h);
            return [{ buf : b, rgb : T.mBrick, tex : CForgeTex.sQingzhuan }, { buf : cap, rgb : T.mRoof[0], tex : CForgeTex.sGiwa }];
        }
        //대울타리(建仁寺垣): 쪼갠 대를 세로로 촘촘히 붙인 판 + 양면 가로 누름대 셋 + 1.8m마다 둥근 기둥, 위는 대 덮개
        if(kind == F.Bamboo)
        {
            const G = (_s : number) => { const a = c.At(_s); return _g(a.p[0], a.p[1]); }, h = (_f.h ?? 1.05) * 1.5, ss = c.Steps(0, L, 0.4), rail = new CForgeMeshBuf(), post = new CForgeMeshBuf();
            CForgeShape.Band(b, c, ss, () => 0.03, _s => G(_s) - 0.1, _s => G(_s) + h);
            for(const f of [0.22, 0.52, 0.82]) for(const sd of [1, -1]) CForgeShape.Band(rail, c, ss, () => 0.025, _s => G(_s) + h * f - 0.03, _s => G(_s) + h * f + 0.03, {}, () => sd * 0.055);
            CForgeShape.Band(rail, c, ss, () => 0.07, _s => G(_s) + h, _s => G(_s) + h + 0.07);
            for(let k = 0, n = Math.max(1, Math.round(L / 1.8)); k <= n; k++)
            {
                const a = c.At(L * k / n), g = _g(a.p[0], a.p[1]);
                CForgeTowerGen.Lathe(post, a.p[0], a.p[1], [[0.06, g - 0.3], [0.06, g + h + 0.14], [0, g + h + 0.16]], 8);
            }
            return [{ buf : b, rgb : T.mBamboo, tex : CForgeTex.sTake }, { buf : post, rgb : T.mBamboo.map(_v => _v * 0.88), tex : CForgeTex.sTake }, { buf : rail, rgb : T.mBamboo.map(_v => _v * 0.8) }];
        }
        //화장담(花牆): 돌 굽 위 흰 회벽 + 기와 덮개, 2.4m마다 격자 누창(漏窓, 안팎 양면)
        if(kind == F.FlowerWall)
        {
            const G = (_s : number) => { const a = c.At(_s); return _g(a.p[0], a.p[1]); }, h = (_f.h ?? 1.05) * 1.5, ss = c.Steps(0, L, 0.4), hf = 0.14;
            const stone = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), win = new CForgeMeshBuf();
            CForgeShape.Band(b, c, ss, () => hf, _s => G(_s) - 0.3, _s => G(_s) + h);
            CForgeShape.Band(stone, c, ss, () => hf + 0.04, _s => G(_s) - 0.3, _s => G(_s) + 0.3);
            CForgeWallGen.TileCap(cap, c, ss, hf, _s => G(_s) + h);
            for(let k = 0, n = Math.floor(L / 2.4); k < n; k++)
            {
                const s = (k + 0.5) * L / n, a = c.At(s), y = G(s) + h * 0.6, w = 0.62, lx = -a.tz, lz = a.tx;
                for(const sd of [1, -1])
                {
                    const o = sd * (hf + 0.015), x = a.p[0] + lx * o, z = a.p[1] + lz * o, P = (_u : number, _y : number) => [x + a.tx * _u, _y, z + a.tz * _u];
                    win.Quad([P(-w * 0.5, y - w * 0.5), P(w * 0.5, y - w * 0.5), P(w * 0.5, y + w * 0.5), P(-w * 0.5, y + w * 0.5)], [[64, 64], [64 + w, 64], [64 + w, 64 + w], [64, 64 + w]], [lx * sd, 0, lz * sd]);
                }
            }
            return [{ buf : b, rgb : T.mPlaster[0], tex : CForgeTex.sPlaster }, { buf : stone, rgb : T.mWallStone, tex : CForgeTex.sStone },
                { buf : cap, rgb : T.mRoof[0], tex : CForgeTex.sGiwa }, { buf : win, rgb : T.mRoof[0].map(_v => _v * 1.3), tex : CForgeTex.sChuang }];
        }
        //흙담(아랍·이집트·사헬): 둥근 머리의 흙·회벽 담. 은데벨레는 아래 흙빛 띠와 위 검은 테 세모 무늬를 칠한다
        if(kind == F.MudWall)
        {
            const h = (_f.h ?? 1.05) * 1.6, top = new CForgeMeshBuf(), arab = T.mCulture == CForgeTheme.eCulture.Arab, paint = T.mHouseWall.includes(17);
            CForgeShape.Band(b, c, ss, () => 0.2, _s => G(_s) - 0.3, _s => G(_s) + h);
            CForgeShape.Band(top, c, ss, () => 0.16, _s => G(_s) + h, _s => G(_s) + h + 0.1);
            CForgeShape.Band(top, c, ss, () => 0.09, _s => G(_s) + h + 0.1, _s => G(_s) + h + 0.16);
            const wall = arab || paint ? T.mPlaster[0] : T.mAdobe[0], tex = arab ? CForgeTex.sPlaster : CForgeTex.sAdobe;
            const parts : IForgePart[] = [{ buf : b, rgb : wall, tex }, { buf : top, rgb : wall.map(_v => _v * 0.94), tex }];
            if(paint)
            {
                const base = new CForgeMeshBuf(), cols = T.mPaint.map(() => new CForgeMeshBuf());
                CForgeShape.Band(base, c, ss, () => 0.205, _s => G(_s) - 0.3, _s => G(_s) + 0.35);
                for(const sd of [1, -1])
                {
                    CForgeShape.Band(cols[0], c, ss, () => 0.01, _s => G(_s) + h - 0.3, _s => G(_s) + h - 0.2, { top : false, cap0 : false, cap1 : false }, () => sd * 0.2);
                    for(let k = 0, n = Math.floor(L / 0.8); k < n; k++)
                    {
                        const a = c.At((k + 0.5) * L / n), g = G((k + 0.5) * L / n), lx = -a.tz * sd, lz = a.tx * sd, o = 0.205;
                        const P = (_u : number, _y : number, _o : number) => [a.p[0] + a.tx * _u + lx * _o, g + _y, a.p[1] + a.tz * _u + lz * _o];
                        cols[0].Poly([P(-0.36, 0.45, o), P(0.36, 0.45, o), P(0, h - 0.35, o)], [lx, 0, lz]);
                        cols[1 + k % (cols.length - 1)].Poly([P(-0.26, 0.5, o + 0.006), P(0.26, 0.5, o + 0.006), P(0, h - 0.45, o + 0.006)], [lx, 0, lz]);
                    }
                }
                parts.push({ buf : base, rgb : T.mWallStone, tex : CForgeTex.sAdobe }, ...cols.map((_q, _i) => ({ buf : _q, rgb : T.mPaint[_i], tex : CForgeTex.sPlaster })));
            }
            return parts.filter(_q => _q.buf.mIdx.length > 0);
        }
        //가시덤불 울타리(줄루 소 우리): 0.25m마다 박은 가는 말뚝 사이를 가시나무 덤불 띠로 채운다
        if(kind == F.Brush)
        {
            const h = (_f.h ?? 1.05) * 1.3, brush = new CForgeMeshBuf();
            for(let k = 0, n = Math.round(L / 0.25); k <= n; k++)
            {
                const s = L * k / n, a = c.At(s), hh = CForgeRand.Hash(_f.seed, k, 7);
                CForgeWallGen.Log(b, a.p[0] + (hh % 7 - 3) * 0.02, a.p[1] + ((hh >>> 4) % 7 - 3) * 0.02, 0.045, G(s) - 0.3, G(s) + h * (0.85 + ((hh >>> 8) % 30) / 100), 0.08, hh);
            }
            CForgeShape.Band(brush, c, ss, () => 0.22, _s => G(_s) + 0.15, _s => G(_s) + h * (0.7 + 0.15 * CForgeRand.Noise(_s * 1.7, 0.5, _f.seed)));
            return [{ buf : b, rgb : T.mLogWood[0], tex : CForgeTex.sWood }, { buf : brush, rgb : [0.36, 0.3, 0.22], tex : CForgeTex.sThatch }];
        }
        //돌담: 막돌 담 + 기와 덮개
        if(kind == F.Doldam)
        {
            const G = (_s : number) => { const a = c.At(_s); return _g(a.p[0], a.p[1]); }, h = (_f.h ?? 1.05) * 1.4, ss = c.Steps(0, L, 0.4), cap = new CForgeMeshBuf();
            CForgeShape.Band(b, c, ss, () => 0.3, _s => G(_s) - 0.3, _s => G(_s) + h);
            CForgeWallGen.TileCap(cap, c, ss, 0.3, _s => G(_s) + h);
            return [{ buf : b, rgb : T.mStone.map(_v => _v * 0.92), tex : CForgeTex.sDoldam }, { buf : cap, rgb : T.mWallCap, tex : CForgeTex.sGiwa }];
        }
        const n = Math.max(1, Math.round(L / 1.8));
        for(let k = 0; k <= n; k++)
        {
            const s = L * k / n, a = c.At(s), g = _g(a.p[0], a.p[1]), lean = (CForgeRand.Hash(_f.seed, k) % 9 - 4) * 0.006;
            CForgeShape.Box(b, a.p[0] + a.tx * lean, a.p[1] + a.tz * lean, 0.14, 0.14, g - 0.25, g + (_f.h ?? 1.05) + (CForgeRand.Hash(_f.seed, k, 3) % 5) * 0.02, Math.atan2(a.tz, a.tx));
        }
        const fh = (_f.h ?? 1.05) / 1.05;
        for(const [y0, y1] of [[0.42 * fh, 0.42 * fh + 0.1], [0.8 * fh, 0.8 * fh + 0.1]])
            CForgeShape.Band(b, c, c.Steps(0, L, 0.4), () => 0.035, _s => G(_s) + y0, _s => G(_s) + y1);
        return [{ buf : b, rgb : CForgeTheme.Of(_f).mFenceWood, tex : CForgeTex.sWood }];
    }

    static sLift = 0.06;
    static sReach = 0.3;

    //style 2 = 돌길(돌 텍스처 + 양쪽 연석), 그 밖 = 흙길(+ 박힌 자갈)
    static Path(_p : IForgeLineR, _g : ForgeGround) : IForgePart[]
    {
        if(_p.pts.length < 2) return [];
        const c = new CForgeCurve(CForgeSpline.Sample(_p.pts.map(_q => [_q[0], _q[1]]), 0.4)), L = c.mLen;
        const T = CForgeTheme.Of(_p), half = _p.width * 0.5, lift = CForgePropGen.sLift, reach = CForgePropGen.sReach;
        if(_p.style == 2)
        {
            const road = new CForgeMeshBuf(), curb = new CForgeMeshBuf();
            CForgeShape.Ribbon(road, c.mPts, _p.width, _g, lift, reach);
            for(const side of [1, -1])
            {
                const off = side * (half - 0.09);
                const Y = (_s : number) => { const a = c.At(_s); return CForgeShape.GroundMax(_g, a.p[0] - a.tz * off, a.p[1] + a.tx * off, reach); };
                CForgeShape.Band(curb, c, c.Steps(0, L, 0.4), () => 0.11, _s => Y(_s) - 0.2, _s => Y(_s) + lift + 0.07, {}, () => off);
            }
            return [{ buf : road, rgb : T.mPebble[0], tex : CForgeTex.sStone }, { buf : curb, rgb : T.mStone, tex : CForgeTex.sStone }];
        }
        const dirt = new CForgeMeshBuf(), stones = [new CForgeMeshBuf(), new CForgeMeshBuf(), new CForgeMeshBuf()];
        CForgeShape.Ribbon(dirt, c.mPts, _p.width, _g, lift, reach);
        const across = Math.max(1, Math.round(_p.width / 0.75));
        for(let k = 0; k * 0.62 < L; k++)
            for(let j = 0; j < across; j++)
            {
                const h = CForgeRand.Hash(_p.seed, k, j);
                if(h % 100 < 22) continue;
                const s = k * 0.62 + ((h >>> 4) % 20) / 100, a = c.At(s), nx = -a.tz, nz = a.tx;
                const v = -half + _p.width * (j + 0.5) / across + (((h >>> 9) % 20) / 100 - 0.1);
                if(Math.abs(v) > half - 0.12) continue;
                const x = a.p[0] + nx * v, z = a.p[1] + nz * v, r = 0.17 + ((h >>> 13) % 14) / 100;
                const poly : ForgeV2[] = [];
                const cnt = 5 + (h % 3);
                for(let q = 0; q < cnt; q++)
                {
                    const ang = q / cnt * Math.PI * 2 + (h % 7) * 0.3, rr = r * (0.75 + ((CForgeRand.Hash(h, q) % 25) / 100));
                    poly.push([x + Math.cos(ang) * rr, z + Math.sin(ang) * rr]);
                }
                const b = stones[(h >>> 17) % 3], y = CForgeShape.GroundMax(_g, x, z, reach) + lift + 0.035;
                CForgeShape.Cap(b, poly, y);
                CForgeShape.Extrude(b, poly, y - 0.12, y);
            }
        const parts : IForgePart[] = [{ buf : dirt, rgb : T.mDirt, tex : CForgeTex.sPlaster }];
        stones.forEach((_b, _i) => parts.push({ buf : _b, rgb : T.mPebble[_i % T.mPebble.length] }));
        return parts.filter(_q => _q.buf.mIdx.length > 0);
    }
}
