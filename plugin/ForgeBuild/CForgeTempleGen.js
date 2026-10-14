import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeGiwaGen } from "./CForgeGiwaGen.js";
import { CForgePavilionGen } from "./CForgePavilionGen.js";
import { CForgeChineseHallGen } from "./CForgeChineseHallGen.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
export class CForgeTempleGen {
    static Layout(_r) {
        const { o, u, L, W, fs } = _r, v = [-u[1], u[0]];
        const P = (_a, _b) => [o[0] + u[0] * _a + v[0] * _b, o[1] + u[1] * _a + v[1] * _b];
        const Wh = Math.min(12, Math.max(6, L * 0.7)), Dh = Math.min(Wh * 0.5, Math.max(3.4, W - 3.0)), bh = -fs * 0.7;
        const side = Wh * 0.5 + 0.8;
        return { v, P, fs, Wh, Dh, bh, court: [(side + L * 0.5) * 0.5, 0], courtL: L * 0.5 - side, courtW: W, ang: Math.atan2(u[1], u[0]) };
    }
    static Dim(_r, _g) {
        const Y = CForgeTempleGen.Layout(_r);
        let gmin = Infinity, gmax = -Infinity;
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
            const q = Y.P(a * (Y.Wh * 0.5 + 0.8), Y.bh + b * (Y.Dh * 0.5 + 0.8)), g = _g(q[0], q[1]);
            gmin = Math.min(gmin, g);
            gmax = Math.max(gmax, g);
        }
        const f0 = gmax + 0.45, floor = f0 + 0.5, top = floor + 2.8 + Y.Wh * 0.06, C = CForgeTheme.Of(_r).mCulture, E = CForgeTheme.eCulture;
        const yr = C == E.Japan ? top + 1.8 + Y.Dh * 0.53 : C == E.China || C == E.Mongol ? floor + CForgeChineseHallGen.Height(Y.Wh, Y.Dh, CForgeTempleGen.ChineseH(Y.Wh), CForgeTheme.Of(_r).mTemple != 1) : top + 1.55 + Y.Dh * 0.45;
        return { ...Y, gmin, gmax, f0, floor, top, yr };
    }
    static ChineseH(_Wh) { return 2.8 + _Wh * 0.04; }
    static Build(_r, _g) {
        const T = CForgeTheme.Of(_r);
        if (T.mCulture == CForgeTheme.eCulture.Japan)
            return CForgeTempleGen.Japanese(_r, _g, T);
        if (T.mCulture == CForgeTheme.eCulture.China || T.mCulture == CForgeTheme.eCulture.Mongol)
            return CForgeTempleGen.Chinese(_r, _g, T);
        const { u } = _r, D = CForgeTempleGen.Dim(_r, _g), { v, P, fs, Wh, Dh, bh, f0, floor, top, ang } = D;
        const B = { ...CForgePavilionGen.Bufs(), stone: new CForgeMeshBuf(), plaster: new CForgeMeshBuf(), door: new CForgeMeshBuf(), board: new CForgeMeshBuf(), sign: new CForgeMeshBuf() };
        const hc = P(0, bh);
        CForgeShape.Box(B.stone, hc[0], hc[1], Wh + 1.6, Dh + 1.6, D.gmin - 0.6, f0, ang);
        CForgeShape.Box(B.stone, hc[0], hc[1], Wh + 0.9, Dh + 0.9, f0, floor, ang);
        const be = bh + fs * (Dh + 0.9) * 0.5, sp = P(0, be), gF = _g(sp[0], sp[1]), rise = floor - gF, ns = Math.max(2, Math.ceil(rise / 0.2)), sw = Math.min(2.6, Wh * 0.25);
        for (let k = 0; k < ns; k++) {
            const q = P(0, be + fs * (0.15 + k * 0.3));
            CForgeShape.Box(B.stone, q[0], q[1], sw, 0.32, Math.min(gF, _g(q[0], q[1])) - 0.3, floor - rise * (k + 1) / ns, ang);
        }
        CForgeTempleGen.Hall(B, hc[0], hc[1], u[0], u[1], v[0] * fs, v[1] * fs, Wh, Dh, floor, top, T.mTemple == 1);
        const sk = CForgeTex.Sign(T.mTempleSign, 1 / 0.36);
        const parts = [
            { buf: B.stone, rgb: T.mStone, tex: CForgeTex.sSeongdol }, { buf: B.plaster, rgb: T.mPlaster[0], tex: CForgeTex.sPlaster },
            { buf: B.door, rgb: [0.62, 0.48, 0.34], tex: CForgeTex.sChangho }, { buf: B.board, rgb: [0.3, 0.13, 0.1], tex: CForgeTex.sWood },
            { buf: B.sign, rgb: sk == null ? [0.3, 0.13, 0.1] : [1, 1, 1], tex: sk ?? CForgeTex.sWood },
            ...CForgePavilionGen.Parts(B, T, _r.seed),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Chinese(_r, _g, T) {
        const { u } = _r, D = CForgeTempleGen.Dim(_r, _g), { v, P, fs, Wh, Dh, bh, f0, floor, ang } = D;
        const B = { ...CForgeChineseHallGen.Bufs(), rail: new CForgeMeshBuf(), sign: new CForgeMeshBuf(), board: new CForgeMeshBuf() };
        const hc = P(0, bh), ow = Wh + 2.4, od = Dh + 2.4, sw = Math.min(3.0, Wh * 0.3);
        CForgeShape.Box(B.stone, hc[0], hc[1], ow, od, D.gmin - 0.6, f0, ang);
        CForgeShape.Box(B.stone, hc[0], hc[1], ow + 0.2, od + 0.2, f0 - 0.2, f0 - 0.08, ang);
        CForgeShape.Box(B.stone, hc[0], hc[1], Wh + 0.46, Dh + 0.46, f0 - 0.05, floor - 0.3, ang);
        const H = (_a, _b) => P(_a, bh + _b);
        for (const [len, along, off] of [[ow * 0.5 - 0.12, true, od * 0.5 - 0.12], [od * 0.5 - 0.12, false, ow * 0.5 - 0.12]])
            for (const sd of [-1, 1]) {
                const gapF = along && sd == fs, n = Math.max(2, Math.round(len * 2 / 1.2));
                for (let k = 0; k <= n; k++) {
                    const t = -len + len * 2 * k / n;
                    if (gapF && Math.abs(t) < sw * 0.5 + 0.05)
                        continue;
                    const q = along ? H(t, sd * off) : H(sd * off, t);
                    CForgeShape.Box(B.rail, q[0], q[1], 0.18, 0.18, f0, f0 + 0.9, ang);
                    CForgeShape.Box(B.rail, q[0], q[1], 0.24, 0.24, f0 + 0.9, f0 + 1.0, ang);
                }
                const Rail = (_t0, _t1) => {
                    if (_t1 - _t0 < 0.05)
                        return;
                    const m = (_t0 + _t1) * 0.5, q = along ? H(m, sd * off) : H(sd * off, m), l = _t1 - _t0;
                    for (const [y0, y1] of [[f0, f0 + 0.18], [f0 + 0.62, f0 + 0.74]])
                        CForgeShape.Box(B.rail, q[0], q[1], along ? l : 0.1, along ? 0.1 : l, y0, y1, ang);
                };
                if (gapF) {
                    Rail(-len, -sw * 0.5 - 0.1);
                    Rail(sw * 0.5 + 0.1, len);
                }
                else
                    Rail(-len, len);
            }
        const be = bh + fs * od * 0.5, sp = P(0, be), gF = _g(sp[0], sp[1]), rise = f0 - gF, ns = Math.max(2, Math.ceil(rise / 0.18));
        for (let k = 0; k < ns; k++) {
            const q = P(0, be + fs * (0.15 + k * 0.3));
            CForgeShape.Box(B.stone, q[0], q[1], sw, 0.32, Math.min(gF, _g(q[0], q[1])) - 0.3, f0 - rise * (k + 1) / ns, ang);
        }
        for (let k = 0; k < 3; k++) {
            const q = P(0, bh + fs * (Dh * 0.5 + 0.4 + k * 0.3));
            CForgeShape.Box(B.stone, q[0], q[1], sw, 0.32, f0 - 0.1, floor - (floor - f0) * (k + 1) / 3, ang);
        }
        const dbl = T.mTemple != 1, hg = CForgeTempleGen.ChineseH(Wh), M = CForgeChineseHallGen.Dim(Wh, Dh, floor, hg, dbl), sk = CForgeTex.Sign(T.mTempleSign, 1 / 0.36, 2);
        CForgeChineseHallGen.Build(B, hc[0], hc[1], u[0], u[1], Wh, Dh, floor, hg, dbl, T.mRoofLift);
        const hb1 = Math.min(Wh, Dh) * 0.5 + 0.9, s1 = Math.max(0, (hb1 - M.d * 0.5) / hb1), yRoof = M.ye1 + (M.yr1 - M.ye1) * Math.pow(s1, 1.5);
        const by0 = dbl ? yRoof + 0.12 : Math.min(floor + 3.2, floor + hg - 0.3) + 0.05, sh = dbl ? Math.min(0.9, M.top - 0.5 - by0) : Math.min(0.8, floor + hg - 0.5 - by0 + 0.6);
        if (sh > 0.25) {
            const bwid = Math.min(sh / 0.36, M.l * 0.4), bhh = bwid * 0.36, ob = fs * (M.d * 0.5 + 0.08), V3 = (_a, _b, _y) => { const q = P(_a, bh + _b); return [q[0], _y, q[1]]; };
            const bq = P(0, bh + ob);
            CForgeShape.Box(B.board, bq[0], bq[1], bwid + 0.14, 0.1, by0 - 0.07, by0 + bhh + 0.07, ang);
            const of = ob + fs * 0.056, hw2 = bwid * 0.5 * fs;
            B.sign.Quad([V3(hw2, of, by0), V3(-hw2, of, by0), V3(-hw2, of, by0 + bhh), V3(hw2, of, by0 + bhh)], [[2, 0], [0, 0], [0, 2], [2, 2]], [v[0] * fs, 0, v[1] * fs]);
        }
        const parts = [
            { buf: B.rail, rgb: T.mStone, tex: CForgeTex.sStone }, { buf: B.board, rgb: T.mMetal, tex: CForgeTex.sWood },
            { buf: B.sign, rgb: sk == null ? T.mBeam : [1, 1, 1], tex: sk ?? CForgeTex.sWood },
            ...CForgeChineseHallGen.Parts(B, T, T.mGlaze),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Japanese(_r, _g, T) {
        const { u } = _r, D = CForgeTempleGen.Dim(_r, _g), { v, P, fs, Wh, Dh, bh, f0, floor, top, ang } = D;
        const B = { ...CForgePavilionGen.Bufs(), stone: new CForgeMeshBuf(), plaster: new CForgeMeshBuf(), door: new CForgeMeshBuf(), board: new CForgeMeshBuf(), sign: new CForgeMeshBuf() };
        const hc = P(0, bh), ew = 0.9, zen = T.mTemple == 1;
        CForgeShape.Box(B.stone, hc[0], hc[1], Wh + 2.6, Dh + 2.6, D.gmin - 0.6, f0, ang);
        if (zen)
            CForgeShape.Box(B.stone, hc[0], hc[1], Wh + 1.4, Dh + 1.4, f0 - 0.05, floor, ang);
        else
            CForgeShape.Box(B.plank, hc[0], hc[1], Wh + ew * 2, Dh + ew * 2, floor - 0.14, floor, ang);
        const sw = Math.min(2.6, Wh * 0.25), hl = Wh * 0.5 + ew - 0.06, hd = Dh * 0.5 + ew - 0.06;
        const H = (_a, _b) => P(_a, bh + _b);
        for (const [len, along, off] of zen ? [] : [[hl, true, hd], [hd, false, hl]])
            for (const sd of [-1, 1]) {
                const n = Math.max(2, Math.round(len * 2 / 1.8)), gapF = along && sd == fs;
                for (let k = 0; k <= n; k++) {
                    const t = -len + len * 2 * k / n, q = along ? H(t, sd * off) : H(sd * off, t);
                    CForgeShape.Box(B.board, q[0], q[1], 0.16, 0.16, f0, floor - 0.14, ang);
                    if (!(gapF && Math.abs(t) < sw * 0.5 + 0.1))
                        CForgeShape.Box(B.pillar, q[0], q[1], 0.1, 0.1, floor, floor + 0.8, ang);
                }
                const Rail = (_t0, _t1) => {
                    if (_t1 - _t0 < 0.05)
                        return;
                    const m = (_t0 + _t1) * 0.5, q = along ? H(m, sd * off) : H(sd * off, m), l = _t1 - _t0;
                    for (const [y0, y1] of [[floor + 0.3, floor + 0.36], [floor + 0.72, floor + 0.82]])
                        CForgeShape.Box(B.pillar, q[0], q[1], along ? l : 0.08, along ? 0.08 : l, y0, y1, ang);
                };
                if (gapF) {
                    Rail(-len, -sw * 0.5 - 0.1);
                    Rail(sw * 0.5 + 0.1, len);
                }
                else
                    Rail(-len, len);
            }
        const be = bh + fs * (Dh * 0.5 + (zen ? 0.7 : ew)), sp = P(0, be), gF = _g(sp[0], sp[1]), rise = floor - gF, ns = Math.max(2, Math.ceil(rise / 0.2));
        for (let k = 0; k < ns; k++) {
            const q = P(0, be + fs * (0.15 + k * 0.3));
            CForgeShape.Box(zen ? B.stone : B.plank, q[0], q[1], sw, 0.32, Math.min(gF, _g(q[0], q[1])) - 0.3, floor - rise * (k + 1) / ns, ang);
        }
        CForgeTempleGen.HallJapanese(B, hc[0], hc[1], u[0], u[1], v[0] * fs, v[1] * fs, Wh, Dh, floor, top, gF, zen);
        const sk = CForgeTex.Sign(T.mTempleSign, 1 / 0.36, 1);
        const parts = [
            { buf: B.stone, rgb: T.mStone, tex: CForgeTex.sSeongdol }, { buf: B.plaster, rgb: T.mPlaster[0], tex: CForgeTex.sPlaster },
            { buf: B.door, rgb: T.mPillar.map(_v => _v * 0.85), tex: CForgeTex.sKoshi }, { buf: B.board, rgb: T.mWood, tex: CForgeTex.sWood },
            { buf: B.sign, rgb: sk == null ? T.mWood : [1, 1, 1], tex: sk ?? CForgeTex.sWood },
            ...CForgePavilionGen.Parts(B, T, _r.seed),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static HallJapanese(B, _cx, _cz, _ux, _uz, _fx, _fz, _L, _D, _floor, _top, _gF, _zen = false) {
        const vx = -_uz, vz = _ux, ang = Math.atan2(_uz, _ux), fs = vx * _fx + vz * _fz >= 0 ? 1 : -1;
        const W = (_a, _b) => [_cx + _ux * _a + vx * _b, _cz + _uz * _a + vz * _b];
        const V3 = (_a, _b, _y) => { const q = W(_a, _b); return [q[0], _y, q[1]]; };
        const nb = Math.max(1, Math.round(_L / 2.6)) | 1, nd = Math.max(1, Math.round(_D / 2.4)), bw = _L / nb;
        const pillars = [];
        for (let i = 0; i <= nb; i++)
            for (let j = 0; j <= nd; j++) {
                if (i != 0 && i != nb && j != 0 && j != nd)
                    continue;
                const a = -_L * 0.5 + bw * i, b = -_D * 0.5 + _D * j / nd, q = W(a, b);
                pillars.push([a, b]);
                CForgeShape.Prism(B.pillar, q[0], q[1], 0.2, 0.19, _floor - 0.05, _top, 10);
            }
        CForgeShape.Box(B.plaster, _cx, _cz, _L - 0.12, _D - 0.12, _floor - 0.05, _top - 0.45, ang);
        const bf = fs * (_D * 0.5 - 0.02), sx = vx * fs, sz = vz * fs;
        const Katou = (_a, _b, _nx, _nz, _tx, _tz, _w, _h, _y0) => {
            const q = W(_a, _b), prof = [[0, 0], [0.5, 0], [0.5, 0.58], [0.42, 0.72], [0.26, 0.8], [0.12, 0.86], [0, 1], [-0.12, 0.86], [-0.26, 0.8], [-0.42, 0.72], [-0.5, 0.58], [-0.5, 0]];
            for (const [buf, sc, o] of [[B.beam, 1.18, 0.03], [B.board, 1, 0.05]])
                buf.Poly(prof.map(([u, v]) => [q[0] + _tx * u * _w * sc + _nx * o, _y0 - (sc - 1) * 0.1 + v * _h * sc, q[1] + _tz * u * _w * sc + _nz * o]), [_nx, 0, _nz]);
        };
        for (let k = 0; k < nb; k++) {
            const bc = -_L * 0.5 + bw * (k + 0.5), hw = bw * 0.5 - 0.22, y0 = _floor + 0.16, y1 = _top - 0.85;
            if (_zen && nb >= 3 && (k == 0 || k == nb - 1)) {
                Katou(bc, fs * (_D * 0.5), sx, sz, _ux, _uz, Math.min(1.2, bw * 0.5), (y1 - y0) * 0.75, y0 + 0.5);
                continue;
            }
            B.door.Quad([V3(bc - hw, bf, y0), V3(bc + hw, bf, y0), V3(bc + hw, bf, y1), V3(bc - hw, bf, y1)], [[64, 64], [64 + hw * 2, 64], [64 + hw * 2, 64 + y1 - y0], [64, 64 + y1 - y0]], [sx, 0, sz]);
            const p = W(bc, fs * (_D * 0.5 - 0.01));
            CForgeShape.Box(B.beam, p[0], p[1], 0.07, 0.07, y0, y1, ang);
        }
        if (_zen)
            for (const s of [-1, 1])
                Katou(s * _L * 0.5, 0, _ux * s, _uz * s, vx, vz, Math.min(1.2, _D * 0.3), (_top - _floor) * 0.55, _floor + 0.7);
        CForgeShape.Box(B.beam, _cx, _cz, _L + 0.02, _D + 0.02, _floor + 0.02, _floor + 0.16, ang);
        CForgeShape.Box(B.beam, _cx, _cz, _L + 0.04, _D + 0.04, _top - 0.85, _top - 0.7, ang);
        CForgeShape.Box(B.beam, _cx, _cz, _L + 0.3, _D + 0.3, _top - 0.4, _top, ang);
        for (const [a, b] of pillars) {
            const q = W(a, b), outA = Math.abs(Math.abs(a) - _L * 0.5) < 1e-3, outB = Math.abs(Math.abs(b) - _D * 0.5) < 1e-3;
            CForgeShape.Box(B.beam, q[0], q[1], 0.42, 0.42, _top, _top + 0.18, ang);
            if (outB)
                CForgeShape.Box(B.beam, q[0], q[1], 0.26, 0.9, _top + 0.18, _top + 0.36, ang);
            if (outA)
                CForgeShape.Box(B.beam, q[0], q[1], 0.9, 0.26, _top + 0.18, _top + 0.36, ang);
        }
        CForgeShape.Box(B.beam, _cx, _cz, _L + 0.7, _D + 0.7, _top + 0.36, _top + 0.5, ang);
        CForgeShape.Box(B.board, _cx, _cz, _L - 0.3, _D - 0.3, _top + 0.5, _top + 1.6, ang);
        const bwid = Math.min(1.6, _L * 0.2), bh = bwid * 0.36, by0 = _top + 0.02, ob = fs * (_D * 0.5 + 0.55), hb = W(0, ob);
        CForgeShape.Box(B.board, hb[0], hb[1], bwid + 0.12, 0.1, by0 - 0.06, by0 + bh + 0.06, ang);
        const of = ob + fs * 0.056, hw2 = bwid * 0.5 * fs;
        B.sign.Quad([V3(hw2, of, by0), V3(-hw2, of, by0), V3(-hw2, of, by0 + bh), V3(hw2, of, by0 + bh)], [[2, 0], [0, 0], [0, 2], [2, 2]], [vx * fs, 0, vz * fs]);
        const hw = Math.min(_L, _D) * 0.5, ye = _top + 0.6, yr = ye + 1.2 + hw * 1.05;
        if (_zen) {
            const y0 = _top - 0.75, y1 = y0 - 0.5, d = 1.2;
            for (const [hl, hd2, along] of [[_L * 0.5, _D * 0.5, true], [_D * 0.5, _L * 0.5, false]])
                for (const s of [-1, 1]) {
                    const Q = (_t, _o, _y) => along ? V3(_t, s * (hd2 + _o), _y) : V3(s * (hd2 + _o), _t, _y);
                    const r = [Q(-hl - d, 0, y0), Q(hl + d, 0, y0), Q(hl + d, d, y1), Q(-hl - d, d, y1)], on = along ? [vx * s, vz * s] : [_ux * s, _uz * s], sl = 0.5 / d;
                    B.roof.Quad(r, null, [on[0] * sl, 1, on[1] * sl]);
                    B.under.Quad(r.map(_p => [_p[0], _p[1] - 0.12, _p[2]]), null, [-on[0] * sl, -1, -on[1] * sl]);
                    B.edge.Quad([r[3], r[2], [r[2][0], r[2][1] - 0.12, r[2][2]], [r[3][0], r[3][1] - 0.12, r[3][2]]], null, [on[0], 0, on[1]]);
                    for (let k = 0, m = Math.max(1, Math.round((hl * 2 + d * 2) / 2.4)); k <= m; k++) {
                        const t = -hl - d + 0.15 + (hl * 2 + d * 2 - 0.3) * k / m, p = Q(t, d - 0.2, 0);
                        CForgeShape.Prism(B.pillar, p[0], p[2], 0.13, 0.12, _floor, y1 - 0.1, 8);
                    }
                }
            CForgeGiwaGen.Roof(B, V3, -_L * 0.5 - 0.3, _L * 0.5 + 0.3, -_D * 0.5 - 0.3, _D * 0.5 + 0.3, ye, yr, { e: 1.1 + hw * 0.15, lift: 0.75, bulge: 0.3, sg: 0.5, prof: 1.9, T: 0.4, tile: true, nu: 16, ns: 8 });
            return;
        }
        const kw = bw + 0.4, kd = _D * 0.5 + 2.3, ky = _top - 1.25;
        for (const s of [-1, 1]) {
            const q = W(s * kw * 0.5, fs * kd), g = _gF;
            CForgeShape.Box(B.stone, q[0], q[1], 0.5, 0.5, g - 0.4, g + 0.2, ang);
            CForgeShape.Prism(B.pillar, q[0], q[1], 0.17, 0.16, g + 0.2, ky, 10);
            const m = W(s * kw * 0.5, fs * (_D * 0.5 + kd) * 0.5);
            CForgeShape.Box(B.pillar, m[0], m[1], 0.16, kd - _D * 0.5, ky - 0.22, ky, ang);
        }
        const fb = W(0, fs * kd);
        CForgeShape.Box(B.pillar, fb[0], fb[1], kw + 0.2, 0.18, ky - 0.25, ky, ang);
        const Wk = (_a, _b, _y) => V3(_b, fs * _a, _y);
        CForgeGiwaGen.Gable(B, Wk, _D * 0.5 - 0.3, kd + 0.2, -kw * 0.5, kw * 0.5, ky + 0.02, _top - 0.75, { e: 0.5, ev: 0.3, T: 0.24, prof: 1.2, ns: 4, wall: null });
        CForgeGiwaGen.Roof(B, V3, -_L * 0.5 - 0.3, _L * 0.5 + 0.3, -_D * 0.5 - 0.3, _D * 0.5 + 0.3, ye, yr, { e: 1.3 + hw * 0.15, lift: 0.3, bulge: 0.15, sg: 0.5, prof: 1.5, T: 0.4, tile: true, nu: 16, ns: 8 });
    }
    static Hall(B, _cx, _cz, _ux, _uz, _fx, _fz, _L, _D, _floor, _top, _jusimpo = false) {
        const vx = -_uz, vz = _ux, ang = Math.atan2(_uz, _ux), fs = vx * _fx + vz * _fz >= 0 ? 1 : -1;
        const W = (_a, _b) => [_cx + _ux * _a + vx * _b, _cz + _uz * _a + vz * _b];
        const V3 = (_a, _b, _y) => { const q = W(_a, _b); return [q[0], _y, q[1]]; };
        const nb = Math.max(1, Math.round(_L / 2.6)) | 1, nd = Math.max(1, Math.round(_D / 2.4)), bw = _L / nb;
        const posts = [];
        for (let i = 0; i <= nb; i++)
            for (let j = 0; j <= nd; j++) {
                if (i != 0 && i != nb && j != 0 && j != nd)
                    continue;
                const a = -_L * 0.5 + bw * i, b = -_D * 0.5 + _D * j / nd, q = W(a, b);
                posts.push([a, b]);
                if (_jusimpo)
                    CForgeTowerGen.Lathe(B.pillar, q[0], q[1], [[0.18, _floor], [0.22, _floor + (_top - _floor) * 0.33], [0.16, _top]], 10);
                else
                    CForgeShape.Prism(B.pillar, q[0], q[1], 0.19, 0.17, _floor, _top, 10);
                CForgeShape.Box(B.stone, q[0], q[1], 0.46, 0.46, _floor - 0.02, _floor + 0.13, ang);
            }
        CForgeShape.Box(B.plaster, _cx, _cz, _L - 0.12, _D - 0.12, _floor - 0.05, _top - 0.45, ang);
        const bf = fs * (_D * 0.5 - 0.02), sx = vx * fs, sz = vz * fs;
        for (let k = 0; k < nb; k++) {
            const bc = -_L * 0.5 + bw * (k + 0.5), hw = bw * 0.5 - 0.2, y0 = _floor + 0.16, y1 = _top - 0.61;
            B.door.Quad([V3(bc - hw, bf, y0), V3(bc + hw, bf, y0), V3(bc + hw, bf, y1), V3(bc - hw, bf, y1)], [[64, 64], [64 + hw * 2, 64], [64 + hw * 2, 66], [64, 66]], [sx, 0, sz]);
            for (const e of [-1, 0, 1]) {
                const p = W(bc + e * (hw + 0.04), fs * (_D * 0.5 - 0.01));
                CForgeShape.Box(B.beam, p[0], p[1], e == 0 ? 0.06 : 0.08, 0.08, y0, y1, ang);
            }
        }
        CForgeShape.Box(B.beam, _cx, _cz, _L + 0.02, _D + 0.02, _floor + 0.04, _floor + 0.16, ang);
        CForgeShape.Box(B.beam, _cx, _cz, _L + 0.02, _D + 0.02, _top - 0.61, _top - 0.49, ang);
        CForgeShape.Box(B.beam, _cx, _cz, _L + 0.3, _D + 0.3, _top - 0.45, _top, ang);
        CForgeShape.Box(B.pillar, _cx, _cz, _L + 0.4, _D + 0.4, _top, _top + 0.14, ang);
        if (_jusimpo)
            for (const [a, b] of posts) {
                const q = W(a, b), outA = Math.abs(Math.abs(a) - _L * 0.5) < 1e-3, outB = Math.abs(Math.abs(b) - _D * 0.5) < 1e-3;
                CForgeShape.Box(B.beam, q[0], q[1], 0.4, 0.4, _top + 0.14, _top + 0.3, ang);
                if (outB) {
                    CForgeShape.Box(B.beam, q[0], q[1], 0.24, 0.8, _top + 0.3, _top + 0.46, ang);
                    CForgeShape.Box(B.beam, q[0], q[1], 0.24, 1.2, _top + 0.46, _top + 0.6, ang);
                }
                if (outA) {
                    CForgeShape.Box(B.beam, q[0], q[1], 0.8, 0.24, _top + 0.3, _top + 0.46, ang);
                    CForgeShape.Box(B.beam, q[0], q[1], 1.2, 0.24, _top + 0.46, _top + 0.6, ang);
                }
            }
        for (const s of _jusimpo ? [] : [-1, 1]) {
            for (let k = 0, n = Math.max(3, Math.round(_L / 0.7)); k <= n; k++) {
                const q = W(-_L * 0.5 + _L * k / n, s * _D * 0.5);
                CForgeShape.Box(B.beam, q[0], q[1], 0.22, 0.65, _top + 0.14, _top + 0.32, ang);
                CForgeShape.Box(B.beam, q[0], q[1], 0.22, 0.95, _top + 0.32, _top + 0.5, ang);
            }
            for (let k = 1, n = Math.max(2, Math.round(_D / 0.7)); k < n; k++) {
                const q = W(s * _L * 0.5, -_D * 0.5 + _D * k / n);
                CForgeShape.Box(B.beam, q[0], q[1], 0.65, 0.22, _top + 0.14, _top + 0.32, ang);
                CForgeShape.Box(B.beam, q[0], q[1], 0.95, 0.22, _top + 0.32, _top + 0.5, ang);
            }
        }
        const bwid = Math.min(2.4, _L * 0.3), bh = bwid * 0.36, by0 = _top + 0.2 - bh, ob = fs * (_D * 0.5 + 0.58), hb = W(0, ob);
        CForgeShape.Box(B.board, hb[0], hb[1], bwid + 0.12, 0.1, by0 - 0.06, by0 + bh + 0.06, ang);
        const of = ob + fs * 0.056, hw2 = bwid * 0.5 * fs;
        B.sign.Quad([V3(hw2, of, by0), V3(-hw2, of, by0), V3(-hw2, of, by0 + bh), V3(hw2, of, by0 + bh)], [[2, 0], [0, 0], [0, 2], [2, 2]], [vx * fs, 0, vz * fs]);
        const hw = Math.min(_L, _D) * 0.5, ye = _top + 0.55, yr = ye + 1.0 + hw * 0.9;
        if (_jusimpo) {
            CForgeGiwaGen.Gable(B, V3, -_L * 0.5 - 0.2, _L * 0.5 + 0.2, -_D * 0.5 - 0.2, _D * 0.5 + 0.2, ye, yr, { e: 0.9 + hw * 0.25, ev: 1.2, T: 0.34, prof: 1.5, ns: 6, wall: _top });
            return;
        }
        CForgeGiwaGen.Roof(B, V3, -_L * 0.5 - 0.2, _L * 0.5 + 0.2, -_D * 0.5 - 0.2, _D * 0.5 + 0.2, ye, yr, { e: 0.9 + hw * 0.25, lift: 0.65, bulge: 0.45, sg: 0.62, prof: 1.7, T: 0.34, tile: true, nu: 16, ns: 8 });
    }
}
