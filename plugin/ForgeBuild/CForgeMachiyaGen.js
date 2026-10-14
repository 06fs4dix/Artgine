import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeGiwaGen } from "./CForgeGiwaGen.js";
import { CForgeHanokGen } from "./CForgeHanokGen.js";
export class CForgeMachiyaGen {
    static sBay = 1.8;
    static sThatch = { e: 0.95, lift: 0, bulge: 0, sg: 0.72, prof: 1.0, T: 0.55, tile: false, nu: 10, ns: 6 };
    static Dim(_b, _g, _kind) {
        let gmax = -Infinity, gmin = Infinity;
        for (const q of _b.poly) {
            const g = _g(q[0], q[1]);
            gmin = Math.min(gmin, g);
            gmax = Math.max(gmax, g);
        }
        const board = CForgeTheme.Of(_b).mItabuki, tile = _kind == 6, two = tile && _b.floors >= 2 && !board;
        const floor = gmax + (tile ? 0.25 : 0.3), base = floor + (tile ? 0.15 : 0.45), top = base + (two ? 4.1 : tile ? 2.7 : 2.3);
        return { gmin, gmax, floor, base, top, tile, two, board, e: tile ? 0.75 : CForgeMachiyaGen.sThatch.e, ye: top - 0.12 };
    }
    static RidgeY(_D, _hw) {
        return _D.tile ? _D.ye + 0.15 + (_hw + _D.e) * (_D.board ? 0.3 : 0.42) : _D.ye + 1.2 + _hw * 1.2;
    }
    static Build(_b, _g, _lod, _kind) {
        const poly = _b.poly, n = poly.length;
        if (n < 3)
            return [];
        const T = CForgeTheme.Of(_b), D = CForgeMachiyaGen.Dim(_b, _g, _kind), { floor, base, top, tile, two } = D, L = _lod;
        const B = { stone: new CForgeMeshBuf(), body: new CForgeMeshBuf(), board: new CForgeMeshBuf(), wood: new CForgeMeshBuf(), paper: new CForgeMeshBuf(), koshi: new CForgeMeshBuf(),
            dark: new CForgeMeshBuf(), cloth: new CForgeMeshBuf(), roof: new CForgeMeshBuf(), under: new CForgeMeshBuf(), edge: new CForgeMeshBuf(), ridge: new CForgeMeshBuf(),
            mortar: new CForgeMeshBuf(), gable: new CForgeMeshBuf() };
        const plat = CForgePoly.Offset(poly, tile ? 0.12 : 0.35);
        CForgeShape.Extrude(B.stone, plat, _q => _g(_q[0], _q[1]) - 1.0, floor);
        CForgeShape.Cap(B.stone, plat, floor);
        CForgeShape.Extrude(B.wood, poly, floor - 0.05, base);
        CForgeShape.Extrude(B.body, poly, base, top - 0.25);
        CForgeShape.Extrude(B.board, CForgePoly.Offset(poly, 0.03), base, base + (tile ? 0.9 : 1.0));
        CForgeShape.Extrude(B.wood, CForgePoly.Offset(poly, 0.05), top - 0.35, top);
        if (two)
            CForgeShape.Extrude(B.wood, CForgePoly.Offset(poly, 0.05), base + 2.55, base + 2.75);
        const front = _b.door?.edge ?? 0;
        for (let i = 0; i < n; i++) {
            const a = poly[i], c = poly[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
            if (len < 0.5)
                continue;
            const tx = (c[0] - a[0]) / len, tz = (c[1] - a[1]) / len, nx = tz, nz = -tx, ang = Math.atan2(tz, tx);
            const bays = Math.max(1, Math.round(len / CForgeMachiyaGen.sBay)), bw = len / bays, mid = Math.floor(bays / 2);
            const postTop = two && i == front ? base + 2.75 : top - 0.05;
            for (let k = 0; k < bays; k++)
                CForgeShape.Box(B.wood, a[0] + tx * bw * k, a[1] + tz * bw * k, 0.18, 0.18, base - 0.05, postTop, ang);
            if (two && i == front && L < 2) {
                const nw = Math.max(1, Math.round(len / 3.2)), wh = 0.42, y = base + 3.32;
                for (let j = 0; j < nw; j++) {
                    const ww = Math.min(1.8, len / nw * 0.6), m = len * (j + 0.5) / nw, cx = a[0] + tx * m, cz = a[1] + tz * m;
                    CForgeShape.Decal(B.dark, cx, y, cz, tx, tz, nx, nz, ww, wh);
                    for (const yy of [y - wh * 0.5 - 0.05, y + wh * 0.5 + 0.05])
                        CForgeShape.Box(B.body, cx + nx * 0.03, cz + nz * 0.03, ww + 0.16, 0.08, yy - 0.05, yy + 0.05, ang);
                    for (const sd of [-1, 1])
                        CForgeShape.Box(B.body, cx + tx * sd * (ww * 0.5 + 0.04) + nx * 0.03, cz + tz * sd * (ww * 0.5 + 0.04) + nz * 0.03, 0.08, 0.08, y - wh * 0.5, y + wh * 0.5, ang);
                    for (let k = 0, nk = Math.max(4, Math.round(ww / 0.13)); k < nk; k++) {
                        const u = -ww * 0.5 + ww * (k + 0.5) / nk;
                        CForgeShape.Box(B.body, cx + tx * u + nx * 0.03, cz + tz * u + nz * 0.03, 0.065, 0.07, y - wh * 0.5, y + wh * 0.5, ang);
                    }
                }
            }
            if (L >= 2)
                continue;
            for (let k = 0; k < bays; k++) {
                const m = bw * (k + 0.5), cx = a[0] + tx * m, cz = a[1] + tz * m;
                if (i != front) {
                    if ((k + i) % 2 == 0 && bw > 1.2)
                        CForgeMachiyaGen.Panel(B, cx, cz, tx, tz, nx, nz, Math.min(0.9, bw * 0.5), base + 1.0, base + 1.75, ang);
                    continue;
                }
                if (tile) {
                    if (k == mid) {
                        const dw = Math.min(bw - 0.4, 1.1), y1 = base + 1.95;
                        B.dark.Quad([CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, -dw * 0.5, base + 0.05, 0.02), CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, dw * 0.5, base + 0.05, 0.02),
                            CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, dw * 0.5, y1, 0.02), CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, -dw * 0.5, y1, 0.02)], null, [nx, 0, nz]);
                        CForgeMachiyaGen.Frame(B.wood, cx, cz, tx, tz, nx, nz, dw, base + 0.05, y1, ang);
                        B.cloth.Quad([CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, -dw * 0.5 - 0.05, y1 - 0.55, 0.1), CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, dw * 0.5 + 0.05, y1 - 0.55, 0.1),
                            CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, dw * 0.5 + 0.05, y1 - 0.02, 0.1), CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, -dw * 0.5 - 0.05, y1 - 0.02, 0.1)], null, [nx, 0, nz]);
                    }
                    else {
                        const w = bw - 0.3, y0 = base + 0.2, y1 = base + 2.05;
                        B.koshi.Quad([CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, -w * 0.5, y0, 0.07), CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, w * 0.5, y0, 0.07),
                            CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, w * 0.5, y1, 0.07), CForgeMachiyaGen.P(cx, cz, tx, tz, nx, nz, -w * 0.5, y1, 0.07)], [[64, y0], [64 + w, y0], [64 + w, y1], [64, y1]], [nx, 0, nz]);
                        CForgeMachiyaGen.Frame(B.wood, cx + nx * 0.05, cz + nz * 0.05, tx, tz, nx, nz, w, y0, y1, ang);
                    }
                }
                else
                    CForgeMachiyaGen.Panel(B, cx, cz, tx, tz, nx, nz, bw - 0.25, base + 0.05, top - 0.6, ang);
            }
            if (i != front || L > 0)
                continue;
            if (two) {
                const y0 = base + 2.8, y1 = base + 2.42, d = 0.9, P = (_u, _o, _y) => [a[0] + tx * _u + nx * _o, _y, a[1] + tz * _u + nz * _o];
                const r = [P(-0.1, 0, y0), P(len + 0.1, 0, y0), P(len + 0.1, d, y1), P(-0.1, d, y1)], sl = (y0 - y1) / d;
                B.roof.Quad([r[1], r[0], r[3], r[2]], null, [nx * sl, 1, nz * sl]);
                const U = (_q) => [_q[0], _q[1] - 0.12, _q[2]];
                B.under.Quad([U(r[0]), U(r[1]), U(r[2]), U(r[3])], null, [-nx * sl, -1, -nz * sl]);
                B.edge.Quad([r[3], r[2], U(r[2]), U(r[3])], null, [nx, 0, nz]);
            }
            else if (!tile) {
                const d = 0.9, mx = (a[0] + c[0]) * 0.5 + nx * d * 0.5, mz = (a[1] + c[1]) * 0.5 + nz * d * 0.5;
                CForgeShape.Box(B.wood, mx, mz, len, d, base - 0.1, base, ang);
                for (let k = 0; k <= bays; k++)
                    CForgeShape.Box(B.wood, a[0] + tx * bw * k + nx * (d - 0.1), a[1] + tz * bw * k + nz * (d - 0.1), 0.12, 0.12, floor, base - 0.1, ang);
                const sx = (a[0] + c[0]) * 0.5 + nx * (d + 0.4), sz = (a[1] + c[1]) * 0.5 + nz * (d + 0.4), gs = _g(sx, sz);
                CForgeShape.Box(B.stone, sx, sz, 1.2, 0.6, gs - 0.3, Math.max(gs + 0.1, floor - (floor - gs) * 0.5), ang);
            }
        }
        const { rects, W } = CForgeHanokGen.Rects(_b);
        for (const r of rects) {
            const ru = r[2] - r[0], rv = r[3] - r[1], alongU = ru >= rv, hw = (alongU ? rv : ru) * 0.5;
            const Wr = alongU ? W : (_a, _c, _y) => W(_c, _a, _y);
            const a0 = alongU ? r[0] : r[1], a1 = alongU ? r[2] : r[3], b0 = alongU ? r[1] : r[0], b1 = alongU ? r[3] : r[2], yr = CForgeMachiyaGen.RidgeY(D, hw);
            if (tile) {
                CForgeGiwaGen.Gable(L >= 2 ? { ...B, under: null } : B, Wr, a0, a1, b0, b1, D.ye, yr, { e: D.e, ev: 0.35, T: D.board ? 0.1 : 0.2, prof: D.board ? 1.0 : 1.12, ns: L >= 2 ? 2 : 5, wall: top - 0.3 });
                if (D.board && L < 2) {
                    const hb = (b1 - b0) * 0.5 + D.e, bc = (b0 + b1) * 0.5, ac = (a0 + a1) * 0.5, ha = (a1 - a0) * 0.5 + 0.2, o = Wr(ac, bc, 0), pa = Wr(ac + 1, bc, 0), ang = Math.atan2(pa[2] - o[2], pa[0] - o[0]);
                    for (const f of [-0.7, -0.32, 0.32, 0.7]) {
                        const y = D.ye + (yr - D.ye) * (1 - Math.abs(f)), m = Wr(ac, bc + f * hb, 0);
                        CForgeShape.Box(B.wood, m[0], m[2], ha * 2, 0.08, y - 0.02, y + 0.06, ang);
                        for (let k = 0, n = Math.max(2, Math.round(ha * 2 / 0.7)); k <= n; k++) {
                            const q = Wr(ac - ha + ha * 2 * k / n, bc + f * hb, 0), h = CForgeRand.Hash(_b.seed, k, Math.round(f * 10) + 20);
                            CForgeShape.Box(B.stone, q[0], q[2], 0.22 + (h % 10) * 0.012, 0.2, y + 0.04, y + 0.16 + (h % 7) * 0.01, ang + (h % 9) * 0.1);
                        }
                    }
                }
                continue;
            }
            const o = { ...CForgeMachiyaGen.sThatch };
            if (L == 1) {
                o.nu = Math.ceil(o.nu / 2);
                o.ns = Math.ceil(o.ns / 2);
            }
            if (L >= 2) {
                o.nu = 4;
                o.ns = 3;
            }
            CForgeGiwaGen.Roof(L >= 2 ? { ...B, under: null } : B, Wr, a0, a1, b0, b1, D.ye, yr, o);
            const HA = (a1 - a0) * 0.5 + o.e, HB = (b1 - b0) * 0.5 + o.e, RA = Math.max(HA - HB * o.sg, HA * 0.12) + 0.25, ac = (a0 + a1) * 0.5, bc = (b0 + b1) * 0.5;
            const p0 = Wr(ac - RA, bc, 0), p1 = Wr(ac + RA, bc, 0), ra = Math.atan2(p1[2] - p0[2], p1[0] - p0[0]), pm = Wr(ac, bc, 0);
            CForgeShape.Box(B.ridge, pm[0], pm[2], RA * 2, 0.7, yr - 0.3, yr + 0.22, ra);
            if (L >= 2)
                continue;
            for (let k = 0, m = Math.max(2, Math.round(RA * 2 / 0.8)); k <= m; k++) {
                const q = Wr(ac - RA + 0.1 + (RA * 2 - 0.2) * k / m, bc, 0);
                CForgeShape.Box(B.wood, q[0], q[2], 0.1, 0.95, yr + 0.12, yr + 0.3, ra);
            }
        }
        const pick = (_arr, _salt) => _arr[CForgeRand.Hash(_b.seed, _salt) % _arr.length];
        const rc = D.board && tile ? pick(T.mShingle, 3) : tile ? pick(T.mRoof, 3) : pick(T.mThatch, 3), wall = tile ? pick(T.mPlaster, 1) : pick(T.mMud, 1);
        const parts = [
            { buf: B.stone, rgb: T.mStone, tex: CForgeTex.sDoldam }, { buf: B.body, rgb: wall, tex: CForgeTex.sPlaster },
            { buf: B.board, rgb: T.mBoard, tex: CForgeTex.sShitami }, { buf: B.wood, rgb: T.mWood, tex: CForgeTex.sWood },
            { buf: B.paper, rgb: T.mPaper, tex: CForgeTex.sShoji }, { buf: B.koshi, rgb: T.mWood.map(_v => Math.min(1, _v * 1.15)), tex: CForgeTex.sKoshi },
            { buf: B.dark, rgb: T.mDark }, { buf: B.cloth, rgb: pick(T.mCloth, 5) },
            { buf: B.roof, rgb: rc, tex: D.board && tile ? CForgeTex.sShingle : tile ? CForgeTex.sKawara : CForgeTex.sKaya },
            { buf: B.under, rgb: tile ? T.mWood.map(_v => Math.min(1, _v * 1.25)) : rc.map(_v => _v * 0.7), tex: tile ? CForgeTex.sWood : CForgeTex.sKaya },
            { buf: B.edge, rgb: tile ? rc.map(_v => _v * 0.8) : rc.map(_v => _v * 0.72), tex: D.board ? CForgeTex.sWood : tile ? CForgeTex.sKawara : CForgeTex.sKaya },
            { buf: B.ridge, rgb: tile && !D.board ? rc.map(_v => _v * 0.85) : T.mWood, tex: tile && !D.board ? CForgeTex.sKawara : CForgeTex.sWood },
            { buf: B.mortar, rgb: [0.9, 0.89, 0.85], tex: CForgeTex.sPlaster }, { buf: B.gable, rgb: tile ? wall : T.mWood, tex: tile ? CForgeTex.sPlaster : CForgeTex.sWood },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static P(_x, _z, _tx, _tz, _nx, _nz, _u, _y, _o) {
        return [_x + _tx * _u + _nx * _o, _y, _z + _tz * _u + _nz * _o];
    }
    static Frame(_b, _x, _z, _tx, _tz, _nx, _nz, _w, _y0, _y1, _ang) {
        const hw = _w * 0.5;
        for (const s of [-1, 1])
            CForgeShape.Box(_b, _x + _tx * s * (hw + 0.04) + _nx * 0.04, _z + _tz * s * (hw + 0.04) + _nz * 0.04, 0.08, 0.08, _y0, _y1, _ang);
        for (const y of [_y0, _y1])
            CForgeShape.Box(_b, _x + _nx * 0.04, _z + _nz * 0.04, _w + 0.16, 0.08, y - 0.05, y + 0.05, _ang);
    }
    static Panel(B, _x, _z, _tx, _tz, _nx, _nz, _w, _y0, _y1, _ang) {
        const hw = _w * 0.5, P = (_u, _y) => CForgeMachiyaGen.P(_x, _z, _tx, _tz, _nx, _nz, _u, _y, 0.02);
        B.paper.Quad([P(-hw, _y0), P(hw, _y0), P(hw, _y1), P(-hw, _y1)], [[64, 64], [64 + _w, 64], [64 + _w, 64 + _y1 - _y0], [64, 64 + _y1 - _y0]], [_nx, 0, _nz]);
        CForgeMachiyaGen.Frame(B.wood, _x, _z, _tx, _tz, _nx, _nz, _w, _y0, _y1, _ang);
    }
}
