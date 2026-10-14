import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeShape, ForgeGround } from "./CForgeShape.js";
import { CForgeGiwaGen } from "./CForgeGiwaGen.js";
import { CForgeHanokGen } from "./CForgeHanokGen.js";
import { IForgeBuildingR } from "./CForgeAdjust.js";

//중국 집 생성기. 8 = 북방 사합원채(돌 기단·회색 벽돌 벽, 정면은 붉은 기둥 사이 아래 벽돌 창턱 위 격자창·가운데 칸 격자문, 청록 들보, 경산식 맞배 회색 기와),
//9 = 휘파 민가(흰 회벽·돌 굽, 높은 곳에 작은 창, 정면 문에 돌 문틀과 작은 기와 차양, 맞배 지붕 양끝 박공 위로 계단식 마두벽). 바닥 외곽선의 사각형 분해(rects)마다 지붕을 올린다
export class CForgeChineseHouseGen
{
    static sBay = 2.4;

    //기단 윗면·벽 시작·벽 윗선·처마 높이. 충돌체도 같은 값을 쓴다
    static Dim(_b : IForgeBuildingR, _g : ForgeGround, _kind : number)
    {
        let gmax = -Infinity, gmin = Infinity;
        for(const q of _b.poly) { const g = _g(q[0], q[1]); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
        const north = _kind == 8, two = !north && _b.floors >= 2;
        const floor = gmax + (north ? 0.45 : 0.2), base = floor + 0.05, top = base + (north ? 3.1 : two ? 5.4 : 3.6);
        return { gmin, gmax, floor, base, top, north, two, e : north ? 0.6 : 0.35, ye : top - 0.1 };
    }
    static RidgeY(_D : { ye : number, e : number }, _hw : number) : number { return _D.ye + 0.25 + (_hw + _D.e) * 0.5; }
    static sProf = 1.25;

    static Build(_b : IForgeBuildingR, _g : ForgeGround, _lod : number, _kind : number) : IForgePart[]
    {
        const poly = _b.poly, n = poly.length;
        if(n < 3) return [];
        const T = CForgeTheme.Of(_b), D = CForgeChineseHouseGen.Dim(_b, _g, _kind), { floor, base, top, north, two } = D, L = _lod, brick = T.mBrickHouse;
        const B = { stone : new CForgeMeshBuf(), brick : new CForgeMeshBuf(), body : new CForgeMeshBuf(), pillar : new CForgeMeshBuf(), lattice : new CForgeMeshBuf(), beam : new CForgeMeshBuf(),
            dark : new CForgeMeshBuf(), roof : new CForgeMeshBuf(), under : new CForgeMeshBuf(), edge : new CForgeMeshBuf(), ridge : new CForgeMeshBuf(), mortar : new CForgeMeshBuf(), gable : new CForgeMeshBuf() };

        const plat = CForgePoly.Offset(poly, north ? 0.5 : 0.15);
        CForgeShape.Extrude(B.stone, plat, _q => _g(_q[0], _q[1]) - 1.0, floor);
        CForgeShape.Cap(B.stone, plat, floor);
        if(north && brick)
        {
            CForgeShape.Extrude(B.brick, poly, floor - 0.05, top - 0.3);
            CForgeShape.Extrude(B.brick, CForgePoly.Offset(poly, 0.06), top - 0.4, top);
        }
        else if(north)
        {
            //송식: 회벽에 목조 골조가 드러나고 아래는 벽돌 창턱 담
            CForgeShape.Extrude(B.body, poly, base, top - 0.3);
            CForgeShape.Extrude(B.brick, CForgePoly.Offset(poly, 0.03), floor - 0.05, base + 0.7);
            CForgeShape.Extrude(B.under, CForgePoly.Offset(poly, 0.05), top - 0.45, top);
            for(let i = 0; i < n && L < 2; i++)
            {
                const a = poly[i], c = poly[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]), ang = Math.atan2(c[1] - a[1], c[0] - a[0]);
                for(let k = 0, m = Math.max(1, Math.round(len / CForgeChineseHouseGen.sBay)); k < m; k++)
                    CForgeShape.Box(B.under, a[0] + (c[0] - a[0]) * k / m, a[1] + (c[1] - a[1]) * k / m, 0.2, 0.2, base, top - 0.3, ang);
            }
        }
        else
        {
            CForgeShape.Extrude(B.body, poly, base, top);
            CForgeShape.Extrude(B.stone, CForgePoly.Offset(poly, 0.03), floor - 0.05, base + 0.5);
        }

        const front = _b.door?.edge ?? 0;
        for(let i = 0; i < n && L < 2; i++)
        {
            const a = poly[i], c = poly[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
            if(len < 0.5) continue;
            const tx = (c[0] - a[0]) / len, tz = (c[1] - a[1]) / len, nx = tz, nz = -tx, ang = Math.atan2(tz, tx);
            const bays = Math.max(1, Math.round(len / CForgeChineseHouseGen.sBay)), bw = len / bays, mid = Math.floor(bays / 2);
            const P = (_u : number, _y : number, _o : number) => [a[0] + tx * _u + nx * _o, _y, a[1] + tz * _u + nz * _o];
            const Face = (_buf : CForgeMeshBuf, _u : number, _w : number, _y0 : number, _y1 : number, _o : number) =>
                _buf.Quad([P(_u - _w * 0.5, _y0, _o), P(_u + _w * 0.5, _y0, _o), P(_u + _w * 0.5, _y1, _o), P(_u - _w * 0.5, _y1, _o)],
                    [[64 + _u - _w * 0.5, _y0], [64 + _u + _w * 0.5, _y0], [64 + _u + _w * 0.5, _y1], [64 + _u - _w * 0.5, _y1]], [nx, 0, nz]);
            if(north)
            {
                if(i == front)
                {
                    for(let k = 0; k <= bays; k++) { const q = P(bw * k, 0, 0.08); CForgeShape.Prism(B.pillar, q[0], q[2], 0.15, 0.14, base, top - 0.3, 8); }
                    for(let k = 0; k < bays; k++)
                    {
                        const u = bw * (k + 0.5), w = bw - 0.36;
                        if(k == mid) Face(B.lattice, u, Math.min(w, 1.6), base + 0.05, top - 0.65, 0.03);
                        else Face(B.lattice, u, w, base + 0.95, top - 0.65, 0.03);
                    }
                    const m = P(len * 0.5, 0, 0.09);
                    CForgeShape.Box(B.beam, m[0], m[2], len, 0.14, top - 0.68, top - 0.32, ang);
                }
                else for(let k = 0; k < bays; k++) if((k + i) % 2 == 0 && bw > 1.6) Face(B.lattice, bw * (k + 0.5), 0.9, base + 1.3, base + 2.2, 0.03);
                continue;
            }
            const wy = two ? base + 3.9 : base + 2.5;
            for(let k = 0; k < bays; k++)
            {
                const u = bw * (k + 0.5);
                if(i == front && k == mid)
                {
                    const dw = 1.1, dh = 2.15;
                    Face(B.dark, u, dw, base + 0.02, base + dh, 0.02);
                    for(const sd of [-1, 1]) { const q = P(u + sd * (dw * 0.5 + 0.09), 0, 0.05); CForgeShape.Box(B.stone, q[0], q[2], 0.18, 0.12, base, base + dh + 0.18, ang); }
                    const q = P(u, 0, 0.06);
                    CForgeShape.Box(B.stone, q[0], q[2], dw + 0.54, 0.14, base + dh, base + dh + 0.2, ang);
                    //문 위 작은 기와 차양(門罩)
                    const y0 = base + dh + 0.55, y1 = y0 - 0.22, d = 0.5, r = [P(u - 1.0, y0, 0), P(u + 1.0, y0, 0), P(u + 1.0, y1, d), P(u - 1.0, y1, d)], sl = (y0 - y1) / d;
                    B.roof.Quad([r[1], r[0], r[3], r[2]], null, [nx * sl, 1, nz * sl]);
                    const U = (_q : number[]) => [_q[0], _q[1] - 0.1, _q[2]];
                    B.under.Quad([U(r[0]), U(r[1]), U(r[2]), U(r[3])], null, [-nx * sl, -1, -nz * sl]);
                    B.edge.Quad([r[3], r[2], U(r[2]), U(r[3])], null, [nx, 0, nz]);
                    continue;
                }
                if((k + i) % 2 != 0 && i != front) continue;
                const w = 0.55, h = 0.65;
                Face(B.dark, u, w, wy - h * 0.5, wy + h * 0.5, 0.02);
                for(const y of [wy - h * 0.5 - 0.05, wy + h * 0.5 + 0.05]) { const q = P(u, 0, 0.04); CForgeShape.Box(B.stone, q[0], q[2], w + 0.2, 0.1, y - 0.05, y + 0.05, ang); }
            }
        }

        //지붕: 사각형마다 긴 축을 용마루로 하는 맞배(경산식: 박공 쪽으로 거의 내밀지 않는다). 휘파는 박공 위로 계단식 마두벽
        const { rects, W } = CForgeHanokGen.Rects(_b);
        for(const r of rects)
        {
            const ru = r[2] - r[0], rv = r[3] - r[1], alongU = ru >= rv, hw = (alongU ? rv : ru) * 0.5;
            const Wr = alongU ? W : (_a : number, _c : number, _y : number) => W(_c, _a, _y);
            const a0 = alongU ? r[0] : r[1], a1 = alongU ? r[2] : r[3], b0 = alongU ? r[1] : r[0], b1 = alongU ? r[3] : r[2], yr = CForgeChineseHouseGen.RidgeY(D, hw);
            CForgeGiwaGen.Gable(L >= 2 ? { ...B, under : null } : B, Wr, a0, a1, b0, b1, D.ye, yr,
                { e : D.e, ev : north ? (brick ? 0.1 : 0.55) : 0.0, T : 0.2, prof : CForgeChineseHouseGen.sProf, ns : L >= 2 ? 2 : 5, wall : top - 0.3 });
            if(!north) CForgeChineseHouseGen.Horse(B, Wr, a0, a1, b0, b1, D, yr);
        }

        const pick = (_arr : number[][], _salt : number) => _arr[CForgeRand.Hash(_b.seed, _salt) % _arr.length];
        const rc = pick(T.mRoof, 3), wall = pick(T.mPlaster, 1);
        const parts : IForgePart[] = [
            { buf : B.stone, rgb : T.mWallStone, tex : CForgeTex.sStone }, { buf : B.brick, rgb : T.mBrick, tex : CForgeTex.sQingzhuan },
            { buf : B.body, rgb : wall, tex : CForgeTex.sPlaster }, { buf : B.pillar, rgb : T.mPillar, tex : CForgeTex.sWood },
            { buf : B.lattice, rgb : T.mPillar.map(_v => _v * 0.85), tex : CForgeTex.sChuang }, { buf : B.beam, rgb : T.mBeam, tex : CForgeTex.sWood },
            { buf : B.dark, rgb : T.mDark }, { buf : B.roof, rgb : rc, tex : CForgeTex.sGiwa },
            { buf : B.under, rgb : T.mWood.map(_v => Math.min(1, _v * 1.2)), tex : CForgeTex.sWood }, { buf : B.edge, rgb : rc.map(_v => _v * 0.8), tex : CForgeTex.sGiwa },
            { buf : B.ridge, rgb : rc.map(_v => _v * 0.7), tex : CForgeTex.sGiwa }, { buf : B.mortar, rgb : rc.map(_v => _v * 0.85), tex : CForgeTex.sGiwa },
            { buf : B.gable, rgb : north && brick ? T.mBrick : wall, tex : north && brick ? CForgeTex.sQingzhuan : CForgeTex.sPlaster },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //마두벽(馬頭牆): 박공벽(a = 양끝)을 지붕 위로 올려 가운데가 가장 높은 다섯 칸 계단으로 끊고, 칸마다 검은 기와 덮개, 바깥 칸 끝에 들린 말머리
    private static Horse(B : Record<string, CForgeMeshBuf>, Wr : (_a : number, _b : number, _y : number) => number[], a0 : number, a1 : number, b0 : number, b1 : number,
        D : { ye : number, e : number }, yr : number)
    {
        //맨 바깥 칸은 처마 끝까지 내밀어 처마·박공 판 끝을 벽 안에 묻는다
        const ac = (a0 + a1) * 0.5, bc = (b0 + b1) * 0.5, hb = (b1 - b0) * 0.5, HB = hb + D.e, Bw = HB + 0.08;
        const o = Wr(ac, bc, 0), pb = Wr(ac, bc + 1, 0), angB = Math.atan2(pb[2] - o[2], pb[0] - o[0]);
        const Yr = (_b : number) => D.ye + (yr - D.ye) * Math.pow(Math.max(0, 1 - Math.abs(_b) / HB), CForgeChineseHouseGen.sProf);
        const edges = [-Bw, -Bw * 0.6, -Bw * 0.22, Bw * 0.22, Bw * 0.6, Bw];
        for(const a of [a0, a1])
            for(let j = 0; j < 5; j++)
            {
                const e0 = edges[j], e1 = edges[j + 1], bi = j == 2 ? 0 : Math.min(Math.abs(e0), Math.abs(e1)), st = (j == 2 ? yr : Yr(bi)) + 0.4, len = e1 - e0;
                const q = Wr(a, bc + (e0 + e1) * 0.5, 0);
                CForgeShape.Box(B.body, q[0], q[2], len, 0.3, D.ye - 0.35, st, angB);
                CForgeShape.Box(B.ridge, q[0], q[2], len + 0.08, 0.44, st, st + 0.07, angB);
                CForgeShape.Box(B.ridge, q[0], q[2], len, 0.16, st + 0.07, st + 0.16, angB);
                if(j == 2) continue;
                const ob = j < 2 ? e0 : e1, h = Wr(a, bc + ob - Math.sign(ob) * 0.1, 0);
                CForgeShape.Box(B.ridge, h[0], h[2], 0.2, 0.44, st + 0.07, st + 0.3, angB);
            }
    }
}
