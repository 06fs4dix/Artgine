import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeShape, ForgeGround } from "./CForgeShape.js";
import { CForgeGiwaGen, IForgeGiwaOpt } from "./CForgeGiwaGen.js";
import { IForgeBuildingR } from "./CForgeAdjust.js";

//한국 집 생성기. 4 = 기와집(높은 돌 기단·둥근 나무 기둥·흰 회벽에 인방·창호·팔작 곡선 기와지붕),
//5 = 초가 민가(낮은 기단·네모 기둥·흙벽·우진각 둥근 볏짚 지붕). 바닥 외곽선의 사각형 분해(rects)마다 지붕을 올린다
export class CForgeHanokGen
{
    static sBay = 2.5;

    //기단 윗면·마루(벽 시작)·벽 윗선·처마·지붕 치수. 충돌체도 같은 값을 쓴다
    static Dim(_b : IForgeBuildingR, _g : ForgeGround, _kind : number)
    {
        let gmax = -Infinity, gmin = Infinity;
        for(const q of _b.poly) { const g = _g(q[0], q[1]); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
        const giwa = _kind == 4, floor = gmax + (giwa ? 0.75 : 0.35), base = floor + (giwa ? 0.45 : 0.25), top = base + (giwa ? 2.7 : 2.15);
        const opt : IForgeGiwaOpt = giwa
            ? { e : 1.25, lift : 0.55, bulge : 0.45, sg : 0.68, prof : 1.6, T : 0.3, tile : true, nu : 16, ns : 8 }
            : { e : 0.6, lift : 0, bulge : 0.05, sg : 1, prof : 0.55, T : 0.42, tile : false, nu : 10, ns : 6 };
        return { gmin, gmax, floor, base, top, opt, ye : giwa ? top - 0.25 : top - 0.15, giwa };
    }
    //지붕 사각형 목록(로컬 [u0, v0, u1, v1])과 로컬 → 월드. 직교가 아니면 최소 외접 사각형 하나
    static Rects(_b : IForgeBuildingR) : { rects : number[][], W : (_u : number, _v : number, _y : number) => number[] }
    {
        if(_b.rects != null) return { rects : _b.rects, W : (_u, _v, _y) => { const w = CForgePoly.ToWorld([[_u, _v]], _b.o, _b.u)[0]; return [w[0], _y, w[1]]; } };
        const ob = CForgePoly.OBB(_b.poly);
        return { rects : [[ob.uMin, ob.vMin, ob.uMax, ob.vMax]], W : (_u, _v, _y) => [ob.u[0] * _u + ob.v[0] * _v, _y, ob.u[1] * _u + ob.v[1] * _v] };
    }
    //용마루 높이: 가로 반폭에 비례(기와집은 높고 초가는 낮고 둥글다)
    static RidgeY(_top : number, _hw : number, _giwa : boolean) : number { return _giwa ? _top + 0.9 + _hw * 0.8 : _top + 0.35 + _hw * 0.6; }

    static Build(_b : IForgeBuildingR, _g : ForgeGround, _lod : number, _kind : number) : IForgePart[]
    {
        const poly = _b.poly, n = poly.length;
        if(n < 3) return [];
        const T = CForgeTheme.Of(_b), D = CForgeHanokGen.Dim(_b, _g, _kind), { floor, base, top, giwa } = D, L = _lod;
        const B = { stone : new CForgeMeshBuf(), body : new CForgeMeshBuf(), wood : new CForgeMeshBuf(), paper : new CForgeMeshBuf(), dark : new CForgeMeshBuf(),
            roof : new CForgeMeshBuf(), under : new CForgeMeshBuf(), edge : new CForgeMeshBuf(), ridge : new CForgeMeshBuf(), mortar : new CForgeMeshBuf(), gable : new CForgeMeshBuf() };

        //기단: 외곽선을 처마 밑까지 넓혀 돌로 쌓는다. 그 위 마루 높이까지 벽 아래를 받치는 하방(나무)
        const plat = CForgePoly.Offset(poly, giwa ? 0.9 : 0.45);
        CForgeShape.Extrude(B.stone, plat, _q => _g(_q[0], _q[1]) - 1.0, floor);
        CForgeShape.Cap(B.stone, plat, floor);
        CForgeShape.Extrude(giwa ? B.wood : B.stone, poly, floor - 0.05, base);
        CForgeShape.Extrude(B.body, poly, base, top - 0.3);
        CForgeShape.Extrude(B.wood, CForgePoly.Offset(poly, 0.06), top - 0.42, top);

        //변마다 기둥(칸 나눔)·인방·창호. 문이 난 변(정면)은 칸마다 높은 창호문, 다른 변은 칸 걸러 작은 창
        const front = _b.door?.edge ?? 0, R = new CForgeRand(_b.seed);
        for(let i = 0; i < n; i++)
        {
            const a = poly[i], c = poly[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
            if(len < 0.5) continue;
            const tx = (c[0] - a[0]) / len, tz = (c[1] - a[1]) / len, nx = tz, nz = -tx, ang = Math.atan2(tz, tx);
            const bays = Math.max(1, Math.round(len / CForgeHanokGen.sBay)), bw = len / bays;
            for(let k = 0; k < bays; k++)
            {
                const x = a[0] + tx * bw * k, z = a[1] + tz * bw * k;
                if(giwa)
                {
                    CForgeShape.Prism(B.wood, x, z, 0.16, 0.15, base - 0.05, top - 0.05, L == 0 ? 10 : 6);
                    CForgeShape.Box(B.stone, x, z, 0.42, 0.42, floor - 0.02, floor + 0.14, ang);
                }
                else CForgeShape.Box(B.wood, x, z, 0.2, 0.2, base - 0.05, top - 0.05, ang);
            }
            if(L >= 2) continue;
            for(const y of giwa ? [base + 0.12, top - 0.75] : [base + 0.1, top - 0.6])
                CForgeShape.Box(B.wood, (a[0] + c[0]) * 0.5 + nx * 0.03, (a[1] + c[1]) * 0.5 + nz * 0.03, len, 0.07, y - 0.06, y + 0.06, ang);
            for(let k = 0; k < bays; k++)
            {
                const m = bw * (k + 0.5), cx = a[0] + tx * m + nx * 0.04, cz = a[1] + tz * m + nz * 0.04;
                if(i == front)
                {
                    const dw = Math.min(bw - 0.5, giwa ? 1.5 : 0.9), y0 = base + 0.18, y1 = top - (giwa ? 0.81 : 0.66);
                    if(!giwa && k != Math.floor(bays / 2) && bays > 1) { CForgeHanokGen.Window(B, cx, cz, tx, tz, nx, nz, 0.7, base + 0.9, base + 1.55, ang); continue; }
                    CForgeHanokGen.Panel(B, cx, cz, tx, tz, nx, nz, dw, y0, y1, ang);
                    if(giwa && dw > 1.1) CForgeShape.Box(B.wood, cx + nx * 0.03, cz + nz * 0.03, 0.07, 0.06, y0, y1, ang);
                }
                else if((k + i) % 2 == 0 && bw > 1.3) CForgeHanokGen.Window(B, cx, cz, tx, tz, nx, nz, Math.min(0.9, bw * 0.4), base + 0.9, base + (giwa ? 1.75 : 1.5), ang);
            }
            //정면 쪽마루: 기단 위 마루 높이의 좁은 널마루
            if(i == front && L == 0)
            {
                const d = giwa ? 0.8 : 0.6, mx = (a[0] + c[0]) * 0.5 + nx * d * 0.5, mz = (a[1] + c[1]) * 0.5 + nz * d * 0.5;
                CForgeShape.Box(B.wood, mx, mz, len, d, base - 0.1, base, ang);
                for(let k = 0; k <= bays; k++) { const q = [a[0] + tx * bw * k + nx * (d - 0.1), a[1] + tz * bw * k + nz * (d - 0.1)]; CForgeShape.Box(B.wood, q[0], q[1], 0.1, 0.1, floor, base - 0.1, ang); }
                const sx = (a[0] + c[0]) * 0.5 + nx * ((giwa ? 0.9 : 0.45) + 0.35), sz = (a[1] + c[1]) * 0.5 + nz * ((giwa ? 0.9 : 0.45) + 0.35);
                CForgeShape.Box(B.stone, sx, sz, 1.6, 0.7, _g(sx, sz) - 0.4, floor - (floor - _g(sx, sz)) * 0.5, ang);
            }
        }

        //지붕: 사각형마다 긴 축을 용마루로
        const { rects, W } = CForgeHanokGen.Rects(_b), o = { ...D.opt };
        if(L == 1) { o.nu = Math.ceil(o.nu / 2); o.ns = Math.ceil(o.ns / 2); }
        if(L >= 2) { o.nu = 4; o.ns = 3; }
        for(const r of rects)
        {
            const ru = r[2] - r[0], rv = r[3] - r[1], alongU = ru >= rv, hw = (alongU ? rv : ru) * 0.5;
            const Wr = alongU ? W : (_a : number, _c : number, _y : number) => W(_c, _a, _y);
            const a0 = alongU ? r[0] : r[1], a1 = alongU ? r[2] : r[3], b0 = alongU ? r[1] : r[0], b1 = alongU ? r[3] : r[2];
            CForgeGiwaGen.Roof(L >= 2 ? { ...B, under : null } : B, Wr, a0, a1, b0, b1, D.ye, CForgeHanokGen.RidgeY(top, hw, giwa), o);
        }

        const pick = (_arr : number[][], _salt : number) => _arr[CForgeRand.Hash(_b.seed, _salt) % _arr.length];
        const rc = giwa ? pick(T.mRoof, 3) : pick(T.mThatch, 3);
        const parts : IForgePart[] = [
            { buf : B.stone, rgb : T.mStone, tex : giwa ? CForgeTex.sSeongdol : CForgeTex.sDoldam },
            { buf : B.body, rgb : giwa ? pick(T.mPlaster, 1) : pick(T.mMud, 1), tex : CForgeTex.sPlaster },
            { buf : B.wood, rgb : T.mWood, tex : CForgeTex.sWood }, { buf : B.paper, rgb : T.mPaper, tex : CForgeTex.sChangho }, { buf : B.dark, rgb : T.mDark },
            { buf : B.roof, rgb : rc, tex : giwa ? CForgeTex.sGiwa : CForgeTex.sChoga },
            { buf : B.under, rgb : giwa ? T.mWood.map(_v => Math.min(1, _v * 1.25)) : rc.map(_v => _v * 0.7), tex : giwa ? CForgeTex.sWood : CForgeTex.sChoga },
            { buf : B.edge, rgb : giwa ? rc.map(_v => _v * 0.75) : rc.map(_v => _v * 0.85), tex : giwa ? CForgeTex.sGiwa : CForgeTex.sChoga },
            { buf : B.ridge, rgb : giwa ? rc.map(_v => _v * 0.82) : rc.map(_v => _v * 0.8), tex : giwa ? CForgeTex.sGiwa : CForgeTex.sChoga },
            { buf : B.mortar, rgb : [0.9, 0.89, 0.85], tex : CForgeTex.sPlaster },
            { buf : B.gable, rgb : giwa ? pick(T.mPlaster, 1) : T.mWood, tex : giwa ? CForgeTex.sPlaster : CForgeTex.sWood },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //창호문: 문틀(나무) + 띠살 창호지 판
    private static Panel(B : Record<string, CForgeMeshBuf>, _x : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number, _w : number, _y0 : number, _y1 : number, _ang : number)
    {
        const hw = _w * 0.5, P = (_u : number, _y : number, _o : number) => [_x + _tx * _u + _nx * _o, _y, _z + _tz * _u + _nz * _o];
        B.paper.Quad([P(-hw, _y0, 0.02), P(hw, _y0, 0.02), P(hw, _y1, 0.02), P(-hw, _y1, 0.02)], [[64, 64], [64 + _w, 64], [64 + _w, 66], [64, 66]], [_nx, 0, _nz]);
        for(const s of [-1, 1]) CForgeShape.Box(B.wood, _x + _tx * s * (hw + 0.04) + _nx * 0.04, _z + _tz * s * (hw + 0.04) + _nz * 0.04, 0.08, 0.08, _y0, _y1, _ang);
        for(const y of [_y0, _y1]) CForgeShape.Box(B.wood, _x + _nx * 0.04, _z + _nz * 0.04, _w + 0.16, 0.08, y - 0.05, y + 0.05, _ang);
    }
    private static Window(B : Record<string, CForgeMeshBuf>, _x : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number, _w : number, _y0 : number, _y1 : number, _ang : number)
    {
        CForgeHanokGen.Panel(B, _x, _z, _tx, _tz, _nx, _nz, _w, _y0, _y1, _ang);
    }
}
