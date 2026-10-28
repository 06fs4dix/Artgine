import { ForgeV2 } from "./CForgeScene.js";
import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeShape, ForgeGround } from "./CForgeShape.js";
import { CForgeOpening } from "./CForgeOpening.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeHanokGen } from "./CForgeHanokGen.js";
import { IForgeBuildingR } from "./CForgeAdjust.js";

//충돌 조각: 바닥 볼록 외곽선, 아래·위 높이
export type ForgeHull = [ForgeV2[], number, number];
interface IForgeBlock { poly : ForgeV2[]; top : number; fl : number; }
interface IForgeEdge { i : number; a : ForgeV2; c : ForgeV2; len : number; tx : number; tz : number; nx : number; nz : number; }

//평지붕 흙·돌집(12: 아랍·이집트·사헬), 오스만 목조 돌출층 집(16), 은데벨레 채색 흙집(17).
//바닥 외곽선의 사각형 분해(rects)마다 덩이를 쌓아 지붕선이 계단지고, 바깥으로 난 벽에만 창·장식을 단다
export class CForgeAdobeGen
{
    static sJetty = 0.45;

    //사각형 덩이마다 [월드 외곽선, 윗선, 층수]. 가장 넓은 덩이가 가장 높고 나머지는 시드에 따라 한 층 낮다
    static Blocks(_b : IForgeBuildingR, _g : ForgeGround)
    {
        let gmin = Infinity, gmax = -Infinity;
        for(const q of _b.poly) { const g = _g(q[0], q[1]); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
        const floor = gmax + 0.2, fl = Math.max(1, _b.floors), fh = _b.height / fl, top = floor + _b.height, blocks : IForgeBlock[] = [];
        if(_b.rects == null) blocks.push({ poly : CForgePoly.Orient(_b.poly), top, fl });
        else
        {
            const { rects, W } = CForgeHanokGen.Rects(_b), Area = (_r : number[]) => (_r[2] - _r[0]) * (_r[3] - _r[1]);
            let big = 0;
            rects.forEach((_r, _i) => { if(Area(_r) > Area(rects[big])) big = _i; });
            rects.forEach((_r, _i) =>
            {
                const low = _i != big && fl >= 2 && CForgeRand.Hash(_b.seed, 301, _i) % 3 != 0;
                const poly = CForgePoly.Orient([[_r[0], _r[1]], [_r[2], _r[1]], [_r[2], _r[3]], [_r[0], _r[3]]].map(([u, v]) => { const w = W(u, v, 0); return [w[0], w[2]] as ForgeV2; }));
                blocks.push({ poly, top : low ? top - fh : top, fl : low ? fl - 1 : fl });
            });
        }
        const TopAt = (_x : number, _z : number) => { let t = -Infinity; for(const k of blocks) if(CForgePoly.InPoly(_x, _z, k.poly)) t = Math.max(t, k.top); return t > -Infinity ? t : top; };
        return { gmin, gmax, floor, fh, top, blocks, TopAt };
    }
    //바깥으로 난 벽(다른 건물 속으로 들어간 벽은 뺀다)
    static Edges(_b : IForgeBuildingR) : IForgeEdge[]
    {
        const out : IForgeEdge[] = [], p = _b.poly, n = p.length;
        for(let i = 0; i < n; i++)
        {
            const a = p[i], c = p[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
            if(len < 0.8) continue;
            const tx = (c[0] - a[0]) / len, tz = (c[1] - a[1]) / len, mx = (a[0] + c[0]) * 0.5 + tz * 0.4, mz = (a[1] + c[1]) * 0.5 - tx * 0.4;
            if(_b.others.some(_o => CForgePoly.InPoly(mx, mz, _o))) continue;
            out.push({ i, a, c, len, tx, tz, nx : tz, nz : -tx });
        }
        return out;
    }
    //외곽선 밖에서 0.3m 떨어진 점이 집 안이면(덩이 사이 안쪽 면) 장식을 달지 않는다
    static Outside(_b : IForgeBuildingR, _x : number, _z : number) : boolean
    {
        return !CForgePoly.InPoly(_x, _z, _b.poly) && !_b.others.some(_o => CForgePoly.InPoly(_x, _z, _o));
    }

    static Hull(_b : IForgeBuildingR, _g : ForgeGround, _kind : number) : ForgeHull[]
    {
        const D = CForgeAdobeGen.Blocks(_b, _g), out : ForgeHull[] = [];
        if(_kind == 16)
        {
            const up = CForgePoly.ConvexHull(CForgePoly.Offset(_b.poly, CForgeAdobeGen.sJetty));
            out.push([CForgePoly.ConvexHull(_b.poly), D.gmin - 0.5, D.top], [up, D.floor + 2.7, D.top + 2.2]);
            return out;
        }
        if(_kind == 17) return [[CForgePoly.ConvexHull(_b.poly), D.gmin - 0.5, D.floor + 2.6], [CForgePoly.ConvexHull(CForgePoly.Offset(_b.poly, 0.45)), D.floor + 2.4, D.floor + 4.4]];
        for(const k of D.blocks) out.push([CForgePoly.ConvexHull(k.poly), D.gmin - 0.5, k.top + 0.6]);
        return out;
    }

    static Build(_b : IForgeBuildingR, _g : ForgeGround, _lod : number, _kind : number) : IForgePart[]
    {
        if(_b.poly.length < 3) return [];
        if(_kind == 16) return CForgeAdobeGen.Ottoman(_b, _g, _lod);
        if(_kind == 17) return CForgeAdobeGen.Painted(_b, _g, _lod);
        const T = CForgeTheme.Of(_b), E = CForgeTheme.eCulture, L = _lod, R = new CForgeRand(_b.seed);
        const D = CForgeAdobeGen.Blocks(_b, _g), { floor, fh, top, blocks, TopAt } = D;
        const arab = T.mCulture == E.Arab, egypt = T.mCulture == E.Egypt, sahel = T.mToron;
        const B = { body : new CForgeMeshBuf(), base : new CForgeMeshBuf(), roof : new CForgeMeshBuf(), trim : new CForgeMeshBuf(), dark : new CForgeMeshBuf(), door : new CForgeMeshBuf(),
            wood : new CForgeMeshBuf(), lattice : new CForgeMeshBuf(), thatch : new CForgeMeshBuf(), glaze : new CForgeMeshBuf() };
        const OB = { stone : sahel ? B.wood : B.trim, fill : B.dark, dark : B.dark };

        CForgeShape.Extrude(B.base, CForgePoly.Offset(_b.poly, 0.05), _q => _g(_q[0], _q[1]) - 1.0, floor + 0.35);
        const ph = T.mParapet == 2 ? 0.42 : T.mParapet == 0 ? 0.55 : 0.32;
        for(const k of blocks)
        {
            CForgeShape.Extrude(B.body, k.poly, floor + 0.3, k.top);
            CForgeShape.Cap(B.roof, CForgePoly.Offset(k.poly, -0.2), k.top + 0.08);
            CForgeShape.Parapet(B.body, k.poly, 0.22, k.top, k.top + ph);
            if(T.mParapet == 2) CForgeShape.Parapet(B.body, CForgePoly.Offset(k.poly, -0.04), 0.14, k.top + ph, k.top + ph + 0.1);
            if(L >= 2 || T.mParapet == 0 || T.mParapet == 2) continue;
            //계단형 성가퀴(이슬람)·피라미드 머리 타(마그레브): 바깥 변에만 일정 간격으로
            const n = k.poly.length;
            for(let i = 0; i < n; i++)
            {
                const a = k.poly[i], c = k.poly[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]), tx = (c[0] - a[0]) / len, tz = (c[1] - a[1]) / len, ang = Math.atan2(tz, tx);
                const cnt = Math.max(1, Math.floor(len / 0.95));
                for(let j = 0; j < cnt; j++)
                {
                    const u = (j + 0.5) * len / cnt, x = a[0] + tx * u + tz * 0.11, z = a[1] + tz * u - tx * 0.11;
                    if(!CForgeAdobeGen.Outside(_b, x + tz * 0.35, z - tx * 0.35)) continue;
                    CForgeAdobeGen.Merlon(B.body, x, z, ang, k.top + ph, 0.56, T.mParapet);
                }
            }
        }

        const edges = CForgeAdobeGen.Edges(_b), K = CForgeOpening.eKind, door = _b.door ?? { edge : 0, t : 0.5 };
        for(const e of edges)
        {
            const P = (_u : number, _o : number) : ForgeV2 => [e.a[0] + e.tx * _u + e.nx * _o, e.a[1] + e.tz * _u + e.nz * _o];
            const front = e.i == door.edge, du = door.t * e.len, ang = Math.atan2(e.tz, e.tx);
            const TopU = (_u : number) => { const q = P(_u, -0.3); return TopAt(q[0], q[1]); };
            if(front)
            {
                const q = P(du, 0.02), dw = sahel ? 1.05 : 1.15, dh = Math.min(fh - 0.4, arab ? 2.5 : 2.2);
                CForgeOpening.Door({ stone : sahel ? B.wood : B.trim, fill : B.door, dark : B.dark, door : B.door }, q[0], floor, q[1], e.tx, e.tz, e.nx, e.nz, dw, dh, T.mArch, 1);
                //마그레브 문 위 녹색 기와 차양: 두 돌 받침 위 작은 모임 지붕
                if(T.mParapet == 3 && L < 2)
                {
                    const W = (_a : number, _c : number, _y : number) => { const p = P(du + _a, _c); return [p[0], _y, p[1]]; }, y = floor + dh + 0.55;
                    CForgeShape.HipRoof(B.glaze, B.wood, W, -0.9, 0.9, 0.02, 0.62, y, 0.55, 0.12, 0.06);
                    for(const s of [-1, 1]) { const c = P(du + s * 0.85, 0.2); CForgeShape.Box(B.wood, c[0], c[1], 0.12, 0.4, y - 0.25, y, ang); }
                }
                //사헬 정면: 문 양옆 굵은 붙임기둥이 지붕 위로 솟아 원뿔 첨두로 끝나고, 문 위에 나무 차양
                if(sahel)
                {
                    for(const s of [-1, 1])
                    {
                        const c = P(du + s * (dw * 0.5 + 0.55), 0.2), y1 = TopU(du) + ph + 0.9;
                        CForgeShape.Box(B.body, c[0], c[1], 0.6, 0.42, floor - 0.3, y1, ang);
                        CForgeAdobeGen.Pinnacle(B.body, c[0], c[1], y1, 0.32, 1.0);
                    }
                    const c = P(du, 0.35);
                    CForgeShape.Box(B.body, c[0], c[1], dw + 2.3, 0.7, floor + dh + 0.25, floor + dh + 0.55, ang);
                }
            }
            if(L >= 2) continue;
            const ksp = sahel || egypt ? 2.8 : 2.4;
            const cnt = Math.floor((e.len - 0.8) / ksp);
            for(let f = 0; f < D.blocks.reduce((_m, _k) => Math.max(_m, _k.fl), 1); f++)
                for(let j = 0; j < cnt; j++)
                {
                    const u = (j + 0.5) * e.len / cnt, q = P(u, 0.02), yb = floor + f * fh;
                    if(f == 0 && front && Math.abs(u - du) < 1.5) continue;
                    const small = f == 0 || egypt || sahel, w = small ? (egypt ? 0.5 : 0.55) : 0.75, h = small ? (egypt ? 0.45 : 0.7) : 1.2, y0 = yb + (small ? fh - h - 0.55 : 0.85);
                    if(y0 + h > TopU(u) - 0.35) continue;
                    if(T.mLattice && f >= 1 && (j + f) % 2 == 0 && e.len > 3)
                    {
                        CForgeAdobeGen.Mashrabiya(B, q[0], q[1], e.tx, e.tz, e.nx, e.nz, 1.25, y0 - 0.3, 1.7);
                        continue;
                    }
                    CForgeOpening.Window(OB, q[0], y0, q[1], e.tx, e.tz, e.nx, e.nz, w, h, egypt || sahel ? K.Rect : T.mArch);
                    if(sahel && L == 0) CForgeShape.Box(B.wood, q[0] + e.nx * 0.04, q[1] + e.nz * 0.04, w * 0.95, 0.04, y0 + 0.02, y0 + h - 0.02, ang);
                }
            //토론: 층마다 0.9m 간격으로 흙벽에서 튀어나온 야자 막대(비계 겸 장식)
            if(sahel && L == 0)
                for(let f = 0; f * fh < _b.height; f++)
                    for(let u = 0.45; u < e.len - 0.3; u += 0.9)
                    {
                        const y = floor + f * fh + fh * 0.72, q = P(u, 0.2);
                        if(y > TopU(u) - 0.2 || (front && Math.abs(u - du) < 1.6)) continue;
                        CForgeShape.Box(B.wood, q[0], q[1], 0.07, 0.5, y, y + 0.07, ang);
                    }
        }
        //사헬: 덩이 모서리마다 원뿔 첨두
        if(sahel && L < 2)
            for(const k of blocks)
                for(const v of k.poly)
                {
                    const c = CForgePoly.Centroid(k.poly), l = Math.hypot(v[0] - c[0], v[1] - c[1]) || 1, x = v[0] - (v[0] - c[0]) / l * 0.2, z = v[1] - (v[1] - c[1]) / l * 0.2;
                    if(Math.abs(TopAt(x, z) - k.top) > 0.01) continue;
                    CForgeAdobeGen.Pinnacle(B.body, x, z, k.top + ph, 0.26, 0.75);
                }
        //이집트 신왕국: 가장 높은 덩이 지붕 뒤쪽에 기둥 차양(야자잎 지붕)과 바람 잡이(말카프)
        if(T.mRoofDeck && L < 2)
        {
            const k = blocks.reduce((_m, _q) => _q.top > _m.top ? _q : _m, blocks[0]), ob = CForgePoly.OBB(k.poly), y = k.top + 0.08;
            const W = (_a : number, _c : number) : ForgeV2 => [ob.u[0] * _a + ob.v[0] * _c, ob.u[1] * _a + ob.v[1] * _c], ang = Math.atan2(ob.u[1], ob.u[0]);
            const dl = (ob.uMax - ob.uMin) * 0.55, dd = Math.min(2.0, (ob.vMax - ob.vMin) * 0.45), a0 = ob.uMin + 0.4, v1 = ob.vMax - 0.35, v0 = v1 - dd;
            const np = Math.max(2, Math.round(dl / 1.6));
            for(let i = 0; i <= np; i++)
            {
                const p = W(a0 + dl * i / np, v0);
                CForgeTowerGen.Lathe(B.trim, p[0], p[1], [[0.11, y], [0.1, y + 1.85], [0.17, y + 2.0], [0.17, y + 2.05]], 8);
            }
            const m = W(a0 + dl * 0.5, (v0 + v1) * 0.5);
            CForgeShape.Box(B.thatch, m[0], m[1], dl + 0.4, dd + 0.3, y + 2.05, y + 2.2, ang);
            CForgeShape.Box(B.wood, m[0], m[1], dl + 0.3, dd + 0.2, y + 1.98, y + 2.05, ang);
            const wc = W(ob.uMax - 0.9, ob.vMin + 0.9), mh = 1.4 + R.Range(0, 0.4);
            CForgeShape.Box(B.body, wc[0], wc[1], 1.0, 0.8, y, y + mh, ang);
            const sq = [[-0.5, -0.4], [0.5, -0.4], [0.5, 0.4], [-0.5, 0.4]].map(([a, c]) => [wc[0] + ob.u[0] * a + ob.v[0] * c, wc[1] + ob.u[1] * a + ob.v[1] * c]);
            B.body.Quad([[sq[0][0], y + mh, sq[0][1]], [sq[1][0], y + mh, sq[1][1]], [sq[2][0], y + mh + 0.55, sq[2][1]], [sq[3][0], y + mh + 0.55, sq[3][1]]], null, [-ob.v[0] * 0.55, 0.8, -ob.v[1] * 0.55]);
            const fc = W(ob.uMax - 0.9, ob.vMin + 0.48);
            CForgeShape.Decal(B.dark, fc[0], y + mh - 0.35, fc[1], ob.u[0], ob.u[1], -ob.v[0], -ob.v[1], 0.7, 0.55);
        }

        const pick = (_arr : number[][], _salt : number) => _arr[CForgeRand.Hash(_b.seed, _salt) % _arr.length];
        const wall = pick(T.mPlaster, 1), mud = !arab, wallTex = mud ? CForgeTex.sAdobe : CForgeTex.sPlaster;
        const parts : IForgePart[] = [
            { buf : B.body, rgb : wall, tex : wallTex }, { buf : B.base, rgb : mud ? wall.map(_v => _v * 0.8) : T.mStone, tex : mud ? CForgeTex.sAdobe : CForgeTex.sAshlar },
            { buf : B.roof, rgb : wall.map(_v => _v * 0.9), tex : wallTex }, { buf : B.trim, rgb : T.mStone, tex : arab ? CForgeTex.sAshlar : CForgeTex.sStone },
            { buf : B.dark, rgb : T.mDark }, { buf : B.door, rgb : pick(T.mShutter, 2), tex : CForgeTex.sPlank }, { buf : B.wood, rgb : T.mWood, tex : CForgeTex.sWood },
            { buf : B.lattice, rgb : T.mWood.map(_v => _v * 1.15), tex : CForgeTex.sChuang }, { buf : B.thatch, rgb : T.mThatch[0], tex : CForgeTex.sThatch },
            { buf : B.glaze, rgb : T.mGlaze, tex : CForgeTex.sTile },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //성가퀴 하나(바닥 중심 x, z, 벽 방향 ang, 바닥 y, 폭 w). 1 = 세 단 계단형, 3 = 네모 타 위 피라미드 머리
    static Merlon(_b : CForgeMeshBuf, _x : number, _z : number, _ang : number, _y : number, _w : number, _style : number)
    {
        if(_style == 3)
        {
            CForgeShape.Box(_b, _x, _z, _w, 0.3, _y, _y + 0.42, _ang);
            const c = Math.cos(_ang), s = Math.sin(_ang), hw = _w * 0.5, hd = 0.15;
            CForgeShape.Pyramid(_b, [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [_x + a * c - b * s, _z + a * s + b * c] as ForgeV2), _y + 0.42, 0.24, 0);
            return;
        }
        CForgeShape.Box(_b, _x, _z, _w, 0.24, _y, _y + 0.3, _ang);
        CForgeShape.Box(_b, _x, _z, _w * 0.62, 0.24, _y + 0.3, _y + 0.52, _ang);
        CForgeShape.Box(_b, _x, _z, _w * 0.26, 0.24, _y + 0.52, _y + 0.7, _ang);
    }
    //사헬 원뿔 첨두(흙): 바닥 반지름 _r, 높이 _h, 끝은 둥글게
    static Pinnacle(_b : CForgeMeshBuf, _x : number, _z : number, _y : number, _r : number, _h : number)
    {
        CForgeTowerGen.Lathe(_b, _x, _z, [[_r, _y - 0.1], [_r * 0.92, _y + _h * 0.3], [_r * 0.6, _y + _h * 0.7], [_r * 0.28, _y + _h * 0.93], [0, _y + _h]], 8);
    }
    //나무 격자 돌출창(마슈라비야): 벽에서 0.55m 내민 격자 상자, 아래 받침 까치발과 위 작은 처마
    static Mashrabiya(B : Record<string, CForgeMeshBuf>, _x : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number, _w : number, _y0 : number, _h : number)
    {
        const d = 0.55, ang = Math.atan2(_tz, _tx), cx = _x + _nx * d * 0.5, cz = _z + _nz * d * 0.5;
        CForgeShape.Box(B.lattice, cx, cz, _w, d, _y0, _y0 + _h, ang);
        CForgeShape.Box(B.wood, cx, cz, _w + 0.1, d + 0.06, _y0 - 0.12, _y0, ang);
        CForgeShape.Box(B.wood, cx + _nx * 0.05, cz + _nz * 0.05, _w + 0.24, d + 0.16, _y0 + _h, _y0 + _h + 0.1, ang);
        for(const s of [-1, 1]) CForgeTowerGen.Strut(B.wood, [_x + _tx * s * _w * 0.38, _y0 - 0.6, _z + _tz * s * _w * 0.38], [_x + _tx * s * _w * 0.38 + _nx * d * 0.85, _y0 - 0.1, _z + _tz * s * _w * 0.38 + _nz * d * 0.85], 0.1);
    }

    //오스만 목조 집: 돌로 쌓은 1층 위로 위층이 사방 0.45m 내밀어(까치발로 받침) 칠한 널판 벽에 촘촘한 격자 유리창, 넓은 처마의 테라코타 기와 모임지붕
    private static Ottoman(_b : IForgeBuildingR, _g : ForgeGround, _lod : number) : IForgePart[]
    {
        const T = CForgeTheme.Of(_b), L = _lod, D = CForgeAdobeGen.Blocks(_b, _g), { floor, top } = D, J = CForgeAdobeGen.sJetty;
        const B = { stone : new CForgeMeshBuf(), body : new CForgeMeshBuf(), trim : new CForgeMeshBuf(), glass : new CForgeMeshBuf(), dark : new CForgeMeshBuf(), roof : new CForgeMeshBuf(),
            under : new CForgeMeshBuf(), wood : new CForgeMeshBuf(), door : new CForgeMeshBuf() };
        const two = _b.floors >= 2, y1 = two ? floor + 2.7 : top, fl = Math.max(1, _b.floors - 1), fh = (top - y1) / fl, up = two ? CForgePoly.Offset(_b.poly, J) : _b.poly;
        CForgeShape.Extrude(B.stone, CForgePoly.Offset(_b.poly, 0.03), _q => _g(_q[0], _q[1]) - 1.0, y1);
        if(two)
        {
            CForgeShape.Extrude(B.body, up, y1, top);
            CForgeShape.Cap(B.wood, up, y1, false);
            for(let k = 0; k < fl; k++) CForgeShape.Extrude(B.trim, CForgePoly.Offset(up, 0.03), y1 + k * fh - 0.02, y1 + k * fh + 0.14);
            for(const v of up) CForgeShape.Box(B.trim, v[0], v[1], 0.16, 0.16, y1, top, 0);
        }
        const edges = CForgeAdobeGen.Edges(_b), door = _b.door ?? { edge : 0, t : 0.5 }, K = CForgeOpening.eKind, OB = { stone : B.trim, fill : B.glass, dark : B.dark };
        for(const e of edges)
        {
            const ang = Math.atan2(e.tz, e.tx), P = (_u : number, _o : number) : ForgeV2 => [e.a[0] + e.tx * _u + e.nx * _o, e.a[1] + e.tz * _u + e.nz * _o], du = door.t * e.len;
            if(e.i == door.edge)
            {
                const q = P(du, 0.02);
                CForgeOpening.Door({ stone : B.stone, fill : B.door, dark : B.dark, door : B.door }, q[0], floor, q[1], e.tx, e.tz, e.nx, e.nz, 1.1, 2.2, T.mArch, 1);
            }
            if(L >= 2) continue;
            for(let u = 1.4; u < e.len - 0.9; u += 2.2)
            {
                if(e.i == door.edge && Math.abs(u - du) < 1.4) continue;
                const q = P(u, 0.02);
                CForgeOpening.Window({ stone : B.stone, fill : B.dark, dark : B.dark }, q[0], floor + 1.1, q[1], e.tx, e.tz, e.nx, e.nz, 0.5, 0.75, K.Rect);
                for(const f of [-0.12, 0.12]) CForgeShape.Box(B.dark, q[0] + e.tx * f + e.nx * 0.05, q[1] + e.tz * f + e.nz * 0.05, 0.03, 0.03, floor + 1.1, floor + 1.85, ang);
            }
            if(!two) continue;
            //까치발: 1.1m마다 벽에서 내민 위층 바닥 끝까지 비스듬한 받침
            for(let u = 0.5; u < e.len - 0.3; u += 1.1)
            {
                const p = P(u, 0.02), q = P(u, J - 0.05);
                CForgeTowerGen.Strut(B.wood, [p[0], y1 - 0.85, p[1]], [q[0], y1 - 0.06, q[1]], 0.11);
            }
            const n = Math.max(1, Math.floor((e.len + J * 2 - 0.6) / 1.15));
            for(let k = 0; k < fl; k++)
                for(let j = 0; j < n; j++)
                {
                    const u = -J + (j + 0.5) * (e.len + J * 2) / n, q = P(u, J + 0.02);
                    CForgeOpening.Window(OB, q[0], y1 + k * fh + 0.55, q[1], e.tx, e.tz, e.nx, e.nz, 0.62, Math.min(1.4, fh - 0.95), K.Rect);
                }
        }
        const { rects, W } = CForgeHanokGen.Rects(_b), ex = two ? J : 0;
        for(const r of rects) CForgeShape.HipRoof(B.roof, B.under, W, r[0] - ex, r[2] + ex, r[1] - ex, r[3] + ex, top, 0.5, 0.85, 0.1);
        const pick = (_arr : number[][], _salt : number) => _arr[CForgeRand.Hash(_b.seed, _salt) % _arr.length];
        const parts : IForgePart[] = [
            { buf : B.stone, rgb : T.mStone, tex : CForgeTex.sStone }, { buf : B.body, rgb : pick(T.mPlankWall, 1), tex : CForgeTex.sShitami },
            { buf : B.trim, rgb : [0.92, 0.9, 0.84], tex : CForgeTex.sWood }, { buf : B.glass, rgb : [0.85, 0.85, 0.82], tex : CForgeTex.sSash, glow : true }, { buf : B.dark, rgb : T.mDark },
            { buf : B.roof, rgb : pick(T.mRoof, 3), tex : CForgeTex.sTile }, { buf : B.under, rgb : T.mWood.map(_v => Math.min(1, _v * 1.6)), tex : CForgeTex.sPlank },
            { buf : B.wood, rgb : T.mWood, tex : CForgeTex.sWood }, { buf : B.door, rgb : T.mWood.map(_v => _v * 1.1), tex : CForgeTex.sPlank },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //은데벨레 채색 흙집: 흰 회벽 단층 집에 굵은 검은 테를 두른 기하학 무늬(네모 테·박공·마름모·계단)를 칸마다 칠하고, 아래는 흙빛 띠, 초가 모임지붕
    private static Painted(_b : IForgeBuildingR, _g : ForgeGround, _lod : number) : IForgePart[]
    {
        const T = CForgeTheme.Of(_b), L = _lod, D = CForgeAdobeGen.Blocks(_b, _g), floor = D.floor, top = floor + 2.6;
        const body = new CForgeMeshBuf(), base = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), under = new CForgeMeshBuf(), door = new CForgeMeshBuf(), dark = new CForgeMeshBuf();
        const paint = T.mPaint.map(() => new CForgeMeshBuf()), white = new CForgeMeshBuf();
        CForgeShape.Extrude(base, CForgePoly.Offset(_b.poly, 0.03), _q => _g(_q[0], _q[1]) - 1.0, floor + 0.45);
        CForgeShape.Extrude(body, _b.poly, floor + 0.3, top);
        const edges = CForgeAdobeGen.Edges(_b), dr = _b.door ?? { edge : 0, t : 0.5 };
        for(const e of edges)
        {
            const PQ = (_u : number, _y : number, _o : number) => [e.a[0] + e.tx * _u + e.nx * _o, _y, e.a[1] + e.tz * _u + e.nz * _o], N = [e.nx, 0, e.nz];
            const Rect = (_b2 : CForgeMeshBuf, _u0 : number, _u1 : number, _y0 : number, _y1 : number, _o : number) => _b2.Quad([PQ(_u0, _y0, _o), PQ(_u1, _y0, _o), PQ(_u1, _y1, _o), PQ(_u0, _y1, _o)], null, N);
            const Tri = (_b2 : CForgeMeshBuf, _u0 : number, _u1 : number, _y0 : number, _y1 : number, _o : number) => _b2.Poly([PQ(_u0, _y0, _o), PQ(_u1, _y0, _o), PQ((_u0 + _u1) * 0.5, _y1, _o)], N);
            const Dia = (_b2 : CForgeMeshBuf, _uc : number, _yc : number, _hu : number, _hy : number, _o : number) => _b2.Poly([PQ(_uc, _yc - _hy, _o), PQ(_uc + _hu, _yc, _o), PQ(_uc, _yc + _hy, _o), PQ(_uc - _hu, _yc, _o)], N);
            const du = dr.t * e.len, front = e.i == dr.edge;
            if(front)
            {
                const q = PQ(du, floor, 0.02);
                CForgeOpening.Door({ stone : base, fill : door, dark, door }, q[0], floor, q[2], e.tx, e.tz, e.nx, e.nz, 0.95, 2.0, CForgeOpening.eKind.Rect, 1);
            }
            if(L >= 2) continue;
            const y0 = floor + 0.6, y1 = top - 0.35, cw = 1.25, n = Math.max(1, Math.round((e.len - 0.3) / cw)), w = (e.len - 0.3) / n;
            Rect(paint[0], 0.1, e.len - 0.1, y0 - 0.12, y0, 0.01);
            Rect(paint[0], 0.1, e.len - 0.1, y1, y1 + 0.12, 0.01);
            for(let j = 0; j < n; j++)
            {
                const u0 = 0.15 + j * w + 0.08, u1 = u0 + w - 0.16, uc = (u0 + u1) * 0.5, h = CForgeRand.Hash(_b.seed, e.i, j, 311);
                if(front && Math.abs(uc - du) < w * 0.5 + 0.55) continue;
                const c1 = paint[1 + h % (paint.length - 1)], c2 = paint[1 + (h >>> 4) % (paint.length - 1)], m = (h >>> 8) % 4, k = 0.09;
                if(m == 0)
                {
                    Rect(paint[0], u0, u1, y0 + 0.1, y1 - 0.1, 0.012);
                    Rect(c1, u0 + k, u1 - k, y0 + 0.1 + k, y1 - 0.1 - k, 0.02);
                    Rect(white, u0 + 0.24, u1 - 0.24, y0 + 0.34, y1 - 0.34, 0.028);
                    Rect(c2, u0 + 0.33, u1 - 0.33, y0 + 0.43, y1 - 0.43, 0.036);
                }
                else if(m == 1)
                {
                    const ym = y0 + (y1 - y0) * 0.55;
                    Rect(paint[0], u0, u1, y0 + 0.1, ym, 0.012);
                    Tri(paint[0], u0 - 0.05, u1 + 0.05, ym - 0.01, y1 - 0.05, 0.012);
                    Rect(c1, u0 + k, u1 - k, y0 + 0.1 + k, ym, 0.02);
                    Tri(c1, u0 + k + 0.04, u1 - k - 0.04, ym - 0.01, y1 - 0.05 - k * 1.8, 0.02);
                    Rect(white, uc - 0.14, uc + 0.14, y0 + 0.3, ym - 0.15, 0.028);
                }
                else if(m == 2)
                {
                    const yc = (y0 + y1) * 0.5, hu = (u1 - u0) * 0.5, hy = (y1 - y0) * 0.5 - 0.08;
                    for(const s of [u0, u1 - 0.1]) Rect(paint[0], s, s + 0.1, y0 + 0.1, y1 - 0.1, 0.012);
                    Dia(paint[0], uc, yc, hu - 0.1, hy, 0.012);
                    Dia(c1, uc, yc, hu - 0.1 - k * 1.4, hy - k * 1.4, 0.02);
                    Dia(paint[0], uc, yc, (hu - 0.1) * 0.32, hy * 0.32, 0.028);
                }
                else
                {
                    const hs = (y1 - y0 - 0.2) / 3;
                    for(let s = 0; s < 3; s++)
                    {
                        const inset = s * (u1 - u0) * 0.17, ya = y0 + 0.1 + s * hs;
                        Rect(paint[0], u0 + inset, u1 - inset, ya, ya + hs + 0.02, 0.012 + s * 0.001);
                        Rect(s % 2 ? c2 : c1, u0 + inset + k, u1 - inset - k, ya + k, ya + hs - k + 0.02, 0.02 + s * 0.001);
                    }
                }
            }
        }
        const { rects, W } = CForgeHanokGen.Rects(_b);
        for(const r of rects) CForgeShape.HipRoof(roof, under, W, r[0], r[2], r[1], r[3], top, 0.85, 0.45, 0.22);
        const parts : IForgePart[] = [
            { buf : body, rgb : T.mPlaster[0], tex : CForgeTex.sAdobe }, { buf : base, rgb : T.mWallStone, tex : CForgeTex.sAdobe }, { buf : white, rgb : T.mPlaster[0], tex : CForgeTex.sPlaster },
            { buf : roof, rgb : T.mThatch[CForgeRand.Hash(_b.seed, 3) % T.mThatch.length], tex : CForgeTex.sThatch }, { buf : under, rgb : T.mWood, tex : CForgeTex.sWood },
            { buf : door, rgb : T.mWood.map(_v => _v * 1.2), tex : CForgeTex.sPlank }, { buf : dark, rgb : T.mDark },
            ...paint.map((_p, _i) => ({ buf : _p, rgb : T.mPaint[_i], tex : CForgeTex.sPlaster })),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
}
