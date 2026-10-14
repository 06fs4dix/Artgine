import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeGiwaGen } from "./CForgeGiwaGen.js";
import { CForgeLandmarkGen } from "./CForgeLandmarkGen.js";
export class CForgeMonumentGen {
    static sSorin = 1.7;
    static Tiers(_s, _floors, _y) {
        const out = [];
        let y = _y;
        for (let k = 0; k < _floors; k++) {
            const b = _s * (0.56 - k * 0.14 / _floors), h = k == 0 ? b * 0.7 : b * 0.46, ye = y + h + 0.02;
            out.push({ b, h, y, ye, yr: ye + b * (k == _floors - 1 ? 0.42 : 0.3) });
            y += h + b * 0.16;
        }
        return out;
    }
    static OctaSpec(_mode, _floors) {
        if (_mode == 1)
            return { n: _floors >= 5 ? 9 : 7, r0: 0.36, rk: 0.045, h0: 0.42, h: 0.2, hk: 0.03, gap: 0.1, base: 0.55, cap: 0.25, fin: 0.8 };
        if (_mode == 2)
            return { n: _floors * 2 + 3, r0: 0.46, rk: 0.035, h0: 1.3, h: 0.1, hk: 0, gap: 0.14, base: 0.65, cap: 0.4, fin: 0.9 };
        return { n: _floors + 2, r0: 0.5, rk: 0.05, h0: 0.95, h: 0.46, hk: 0.03, gap: 0.2, base: 0.45, cap: 0.5, fin: 1.2 };
    }
    static OctaTiers(_s, _floors, _y, _mode) {
        const S = CForgeMonumentGen.OctaSpec(_mode, _floors), out = [];
        let y = _y;
        for (let k = 0; k < S.n; k++) {
            const r = _s * S.r0 * (1 - k * S.rk), h = k == 0 ? _s * S.h0 : _s * S.h * (1 - k * S.hk);
            out.push({ r, h, y, ye: y + h });
            y += h + _s * S.gap;
        }
        return out;
    }
    static Height(_r, T) {
        const s = _r.size, M = CForgeTheme.eMonument, k = T.mMonument;
        if (k >= M.Pyramid)
            return CForgeLandmarkGen.Height(_r, T);
        const Octa = (_mode) => { const S = CForgeMonumentGen.OctaSpec(_mode, _r.floors), t = CForgeMonumentGen.OctaTiers(s, _r.floors, s * S.base, _mode); return t[t.length - 1].ye + s * (S.gap * 0.5 + S.cap + S.fin); };
        if (k == M.BrickPagoda)
            return Octa(0);
        if (k == M.OctaPagoda)
            return Octa(1);
        if (k == M.DenseEave)
            return Octa(2);
        if (k == M.WoodPagoda) {
            const t = CForgeMonumentGen.Tiers(s, _r.floors, 0.4);
            return t[t.length - 1].yr + s * CForgeMonumentGen.sSorin;
        }
        if (k == M.Runestone)
            return s * 1.6;
        if (k == M.Obelisk)
            return s * 4.15 + 0.3;
        if (k == M.Arch)
            return s * 2.25;
        if (k == M.Column)
            return 0.5 + s * 3.8;
        if (k == M.Gorinto)
            return 0.15 + s * 1.95;
        if (k == M.StonePagoda) {
            let h = 0.22 + s * 0.4 + 0.1 + s * 0.36 + 0.1;
            for (let i = 0; i < _r.floors; i++) {
                const b = s * (0.52 - i * 0.32 / _r.floors);
                h += (i == 0 ? b * 0.8 : b * 0.38) + 0.08 + b * 0.12;
            }
            return h + s * 0.7;
        }
        return s * (_r.floors >= 5 ? 3.6 : 2.6) + 0.9;
    }
    static Half(_r, T) {
        const s = _r.size, M = CForgeTheme.eMonument;
        if (T.mMonument >= M.Pyramid)
            return CForgeLandmarkGen.Half(_r, T);
        if (T.mMonument == M.Arch)
            return [s * 0.98, s * 0.42];
        if (T.mMonument == M.Runestone)
            return [s * 0.4, s * 0.2];
        return [s * 0.65, s * 0.65];
    }
    static Build(_r, _g) {
        const T = CForgeTheme.Of(_r), M = CForgeTheme.eMonument, stone = new CForgeMeshBuf(), metal = new CForgeMeshBuf();
        const [cx, cz] = _r.c, s = _r.size, ang = _r.ang, ux = Math.cos(ang), uz = Math.sin(ang);
        let g = Infinity;
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]])
            g = Math.min(g, _g(cx + (ux * a - uz * b) * s * 0.6, cz + (uz * a + ux * b) * s * 0.6));
        const Sq = (_h) => CForgePoly.Orient([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + (ux * a - uz * b) * _h, cz + (uz * a + ux * b) * _h]));
        const k = T.mMonument;
        if (k >= M.Pyramid)
            return CForgeLandmarkGen.Build(_r, T, g);
        if (k == M.WoodPagoda)
            return CForgeMonumentGen.Pagoda(_r, T, g);
        if (k == M.BrickPagoda)
            return CForgeMonumentGen.OctaPagoda(_r, T, g, 0);
        if (k == M.OctaPagoda)
            return CForgeMonumentGen.OctaPagoda(_r, T, g, 1);
        if (k == M.DenseEave)
            return CForgeMonumentGen.OctaPagoda(_r, T, g, 2);
        if (k == M.Runestone)
            return CForgeMonumentGen.Runestone(_r, T, g);
        if (k == M.Arch)
            return CForgeMonumentGen.Arch(_r, T, g);
        if (k == M.Gorinto)
            return CForgeMonumentGen.Gorinto(_r, T, g);
        let tex = CForgeTex.sStone;
        if (k == M.StonePagoda) {
            tex = CForgeTex.sSeongdol;
            let y = g + 0.22;
            CForgeShape.Box(stone, cx, cz, s * 1.3, s * 1.3, g - 0.5, y, ang);
            for (const [w, h] of [[s, s * 0.4], [s * 0.8, s * 0.36]]) {
                CForgeShape.Box(stone, cx, cz, w, w, y, y + h, ang);
                CForgeShape.Box(stone, cx, cz, w * 1.1, w * 1.1, y + h, y + h + 0.1, ang);
                y += h + 0.1;
            }
            for (let i = 0; i < _r.floors; i++) {
                const b = s * (0.52 - i * 0.32 / _r.floors), h = i == 0 ? b * 0.8 : b * 0.38;
                CForgeShape.Box(stone, cx, cz, b, b, y, y + h, ang);
                y += h;
                CForgeShape.Box(stone, cx, cz, b * 1.15, b * 1.15, y, y + 0.08, ang);
                CForgeShape.Pyramid(stone, Sq(b * 0.75), y + 0.08, b * 0.32, b * 0.45);
                y += 0.08 + b * 0.12;
            }
            CForgeTowerGen.Lathe(stone, cx, cz, [[0.09, y], [0.06, y + s * 0.7]], 6);
            for (const f of [0.25, 0.45, 0.62])
                CForgeTowerGen.Ring(stone, cx, cz, 0.05, 0.15, y + s * 0.7 * f, y + s * 0.7 * f + 0.06, 6);
        }
        else if (k == M.Obelisk) {
            let y = g + 0.3;
            CForgeShape.Box(stone, cx, cz, s * 1.2, s * 1.2, g - 0.5, y, ang);
            CForgeShape.Box(stone, cx, cz, s * 0.9, s * 0.9, y, y + s * 0.5, ang);
            CForgeShape.Box(stone, cx, cz, s * 1.0, s * 1.0, y + s * 0.5, y + s * 0.58, ang);
            y += s * 0.58;
            CForgeShape.Box(stone, cx, cz, s * 0.7, s * 0.7, y, y + s * 0.17, ang);
            y += s * 0.17;
            CForgeShape.Ishigaki(stone, cx, cz, s * 0.24, s * 0.06, y, y + s * 3.2, ang, 1);
            CForgeShape.Pyramid(stone, Sq(s * 0.12), y + s * 3.2, s * 0.2, 0);
        }
        else if (k == M.Column) {
            let y = g;
            for (const [w, h] of [[s * 1.3, 0.25], [s * 1.0, 0.25]]) {
                CForgeShape.Box(stone, cx, cz, w, w, y == g ? g - 0.5 : y, y + h, ang);
                y += h;
            }
            CForgeShape.Box(stone, cx, cz, s * 0.55, s * 0.55, y, y + s * 0.6, ang);
            CForgeShape.Box(stone, cx, cz, s * 0.65, s * 0.65, y + s * 0.6, y + s * 0.66, ang);
            y += s * 0.66;
            CForgeTowerGen.Lathe(stone, cx, cz, [[s * 0.22, y], [s * 0.2, y + s * 0.08], [s * 0.16, y + s * 0.1], [s * 0.13, y + s * 2.5], [s * 0.2, y + s * 2.6]], 12);
            y += s * 2.6;
            CForgeShape.Box(stone, cx, cz, s * 0.44, s * 0.44, y, y + s * 0.12, ang);
            y += s * 0.12;
            CForgeTowerGen.Lathe(metal, cx, cz, [[0, y], [s * 0.12, y + s * 0.05], [s * 0.15, y + s * 0.15], [s * 0.12, y + s * 0.25], [s * 0.05, y + s * 0.3], [s * 0.07, y + s * 0.42], [0, y + s * 0.42]], 10);
        }
        else {
            let y = g;
            for (let i = 0; i < 3; i++) {
                const w = s * (1.6 - i * 0.3);
                CForgeShape.Box(stone, cx, cz, w, w, i == 0 ? g - 0.5 : y, y + 0.3, ang);
                y += 0.3;
            }
            CForgeShape.Box(stone, cx, cz, s * 0.62, s * 0.62, y, y + s * 0.5, ang);
            CForgeShape.Box(stone, cx, cz, s * 0.72, s * 0.72, y + s * 0.5, y + s * 0.58, ang);
            y += s * 0.58;
            const sh = s * (_r.floors >= 5 ? 2.6 : 1.6);
            CForgeTowerGen.Lathe(stone, cx, cz, [[s * 0.2, y], [s * 0.14, y + sh]], 8);
            y += sh;
            CForgeShape.Box(stone, cx, cz, s * 0.4, s * 0.4, y, y + s * 0.16, ang);
            y += s * 0.16;
            const ch = Math.max(0.5, s * 0.42);
            CForgeShape.Box(metal, cx, cz, 0.08, 0.08, y, y + ch, ang);
            CForgeShape.Box(metal, cx, cz, ch * 0.6, 0.08, y + ch * 0.6, y + ch * 0.72, ang + Math.PI * 0.5);
        }
        const parts = [{ buf: stone, rgb: T.mStone, tex }, { buf: metal, rgb: T.mMetal }];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Octa(_b, _cx, _cz, _r0, _r1, _y0, _y1, _rot) {
        const h = _y1 - _y0, c = Math.cos(Math.PI / 8), e0 = 2 * _r0 * Math.sin(Math.PI / 8), e1 = 2 * _r1 * Math.sin(Math.PI / 8);
        const P = (_r, _a, _y) => [_cx + Math.cos(_a) * _r, _y, _cz + Math.sin(_a) * _r];
        for (let i = 0; i < 8; i++) {
            const a0 = _rot + i * Math.PI / 4, a1 = a0 + Math.PI / 4, am = (a0 + a1) * 0.5;
            _b.Quad([P(_r0, a0, _y0), P(_r0, a1, _y0), P(_r1, a1, _y1), P(_r1, a0, _y1)], [[i * e0, _y0], [(i + 1) * e0, _y0], [(i + 0.5) * e0 + e1 * 0.5, _y1], [(i + 0.5) * e0 - e1 * 0.5, _y1]], [Math.cos(am) * h, (_r0 - _r1) * c, Math.sin(am) * h]);
        }
    }
    static Oct(_cx, _cz, _r, _rot) {
        const out = [];
        for (let i = 0; i < 8; i++)
            out.push([_cx + Math.cos(_rot + i * Math.PI / 4) * _r, _cz + Math.sin(_rot + i * Math.PI / 4) * _r]);
        return out;
    }
    static OctaPagoda(_r, T, _g, _mode) {
        const [cx, cz] = _r.c, s = _r.size, rot = _r.ang + Math.PI / 8, S = CForgeMonumentGen.OctaSpec(_mode, _r.floors), stoneAll = _mode == 1;
        const stone = new CForgeMeshBuf(), body = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), metal = new CForgeMeshBuf();
        const yb = _g + s * S.base;
        CForgeMonumentGen.Octa(stone, cx, cz, s * 0.8, s * 0.8, _g - 0.5, _g + s * S.base * 0.45, rot);
        CForgeShape.Cap(stone, CForgeMonumentGen.Oct(cx, cz, s * 0.8, rot), _g + s * S.base * 0.45);
        CForgeMonumentGen.Octa(stone, cx, cz, s * 0.62, s * 0.62, _g + s * S.base * 0.45, yb - s * 0.06, rot);
        CForgeMonumentGen.Octa(stone, cx, cz, s * 0.7, s * 0.7, yb - s * 0.06, yb, rot);
        CForgeShape.Cap(stone, CForgeMonumentGen.Oct(cx, cz, s * 0.7, rot), yb);
        const tiers = CForgeMonumentGen.OctaTiers(s, _r.floors, yb, _mode), g2 = s * S.gap;
        for (let k = 0; k < tiers.length; k++) {
            const t = tiers[k], rn = k + 1 < tiers.length ? tiers[k + 1].r : s * 0.1, last = k + 1 == tiers.length;
            CForgeMonumentGen.Octa(body, cx, cz, t.r, t.r, t.y - 0.02, t.ye, rot);
            const ap = t.r * Math.cos(Math.PI / 8) + 0.02;
            if (_mode == 0 || k == 0)
                for (let j = k % 2; j < 8; j += 2) {
                    const am = rot + (j + 0.5) * Math.PI / 4, dh = k == 0 ? t.h * (_mode == 2 ? 0.4 : 0.55) : t.h * 0.5;
                    CForgeTowerGen.ArchDecal(dark, cx, cz, ap, am, t.y + (t.h - dh) * (k == 0 ? 0.3 : 0.45), t.r * 0.42, dh);
                }
            const rE = t.r + s * (_mode == 1 ? 0.2 : _mode == 2 ? 0.2 : 0.26), y1 = t.ye + g2 * 0.25, y2 = t.ye + g2 * 0.5;
            if (_mode != 1) {
                const c1 = t.r + s * 0.07, c2 = t.r + s * 0.14;
                CForgeMonumentGen.Octa(cap, cx, cz, t.r, c1, t.ye, y1, rot);
                CForgeMonumentGen.Octa(cap, cx, cz, c1, c2, y1, y2, rot);
            }
            CForgeShape.Cap(roof, CForgeMonumentGen.Oct(cx, cz, rE, rot), y2 - 0.04, false);
            CForgeMonumentGen.Octa(roof, cx, cz, rE, rE, y2 - 0.04, y2, rot);
            CForgeMonumentGen.Octa(roof, cx, cz, rE, last ? s * 0.12 : rn * 0.98, y2, last ? y2 + s * S.cap : t.ye + g2 + 0.02, rot);
        }
        const top = tiers[tiers.length - 1], ys = top.ye + g2 * 0.5 + s * S.cap, fh = s * S.fin;
        CForgeTowerGen.Lathe(metal, cx, cz, [[s * 0.14, ys - 0.1], [s * 0.16, ys + fh * 0.08], [s * 0.05, ys + fh * 0.14], [s * 0.04, ys + fh]], 8);
        for (let k = 0; k < 6; k++) {
            const y = ys + fh * (0.22 + k * 0.08);
            CForgeTowerGen.Ring(metal, cx, cz, 0.03, s * (0.09 - k * 0.008), y, y + 0.05, 8);
        }
        CForgeTowerGen.Lathe(metal, cx, cz, [[0, ys + fh * 0.8], [s * 0.06, ys + fh * 0.86], [0, ys + fh * 1.0]], 8);
        const rc = T.mRoof[_r.seed % T.mRoof.length], sc = T.mStone;
        const parts = [
            { buf: stone, rgb: sc, tex: CForgeTex.sStone }, { buf: body, rgb: stoneAll ? sc : T.mWallBody, tex: stoneAll ? CForgeTex.sStone : CForgeTex.sQingzhuan },
            { buf: cap, rgb: T.mWallBody.map(_v => _v * 0.92), tex: CForgeTex.sQingzhuan }, { buf: roof, rgb: stoneAll ? sc.map(_v => _v * 0.92) : rc, tex: stoneAll ? CForgeTex.sStone : CForgeTex.sGiwa },
            { buf: dark, rgb: T.mDark }, { buf: metal, rgb: T.mMetal },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Runestone(_r, T, _g) {
        const [cx, cz] = _r.c, s = _r.size, ang = _r.ang, ux = Math.cos(ang), uz = Math.sin(ang), nx = -uz, nz = ux;
        const stone = new CForgeMeshBuf(), paint = new CForgeMeshBuf(), hw = s * 0.36, hh = s * 1.6, th = s * 0.11;
        const prof = [[-hw * 0.9, -0.4], [hw * 0.9, -0.4]];
        for (let k = 0; k <= 8; k++) {
            const a = k / 8 * Math.PI;
            prof.push([Math.cos(a) * hw * (k == 0 || k == 8 ? 1 : 0.95), hh - hw * 0.6 + Math.sin(a) * hw * 0.6]);
        }
        const Q = (_u, _y, _o) => [cx + ux * _u + nx * _o, _g + _y, cz + uz * _u + nz * _o];
        const outline = [prof[0], ...prof.slice(2).reverse(), prof[1]].reverse();
        for (const sd of [1, -1])
            stone.Poly(outline.map(_p => Q(_p[0], _p[1], sd * th)), [nx * sd, 0, nz * sd]);
        for (let i = 0; i < outline.length; i++) {
            const a = outline[i], b = outline[(i + 1) % outline.length], du = b[0] - a[0], dv = b[1] - a[1], l = Math.hypot(du, dv) || 1;
            stone.Quad([Q(a[0], a[1], th), Q(b[0], b[1], th), Q(b[0], b[1], -th), Q(a[0], a[1], -th)], null, [ux * dv / l, -du / l, uz * dv / l]);
        }
        const In = (_p, _d) => { const cy = hh * 0.45, du = -_p[0], dv = cy - _p[1], l = Math.hypot(du, dv) || 1; return [_p[0] + du / l * _d, _p[1] + dv / l * _d]; };
        for (const sd of [1, -1])
            for (let i = 2; i + 1 < prof.length; i++) {
                const a0 = In(prof[i], s * 0.05), a1 = In(prof[i + 1], s * 0.05), b0 = In(prof[i], s * 0.1), b1 = In(prof[i + 1], s * 0.1), o = sd * (th + 0.012);
                paint.Quad([Q(a0[0], a0[1], o), Q(a1[0], a1[1], o), Q(b1[0], b1[1], o), Q(b0[0], b0[1], o)], null, [nx * sd, 0, nz * sd]);
            }
        for (let k = 0; k < 5; k++) {
            const a = k / 5 * Math.PI * 2 + 0.4, r = s * (0.42 + (k % 2) * 0.1), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
            CForgeShape.Bush(stone, x, _g - 0.05, z, s * 0.09, s * 0.08, 5);
        }
        return [{ buf: stone, rgb: T.mStone.map(_v => _v * 0.9), tex: CForgeTex.sStone }, { buf: paint, rgb: [0.62, 0.2, 0.14] }].filter(_p => _p.buf.mIdx.length > 0);
    }
    static Arch(_r, T, _g) {
        const [cx, cz] = _r.c, s = _r.size, ang = _r.ang, ux = Math.cos(ang), uz = Math.sin(ang), nx = -uz, nz = ux;
        const stone = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), w = s * 1.9, d = s * 0.75, r = s * 0.38, ys = _g + s * 1.0, yt = ys + r + s * 0.45, hw = w * 0.5;
        const Q = (_u, _y, _o) => [cx + ux * _u + nx * _o, _y, cz + uz * _u + nz * _o];
        CForgeShape.Box(trim, cx, cz, w + 0.3, d + 0.3, _g - 0.5, _g + 0.2, ang);
        for (const sg of [-1, 1]) {
            const c = Q(sg * (hw + r) * 0.5, 0, 0);
            CForgeShape.Box(stone, c[0], c[2], hw - r, d, _g + 0.2, ys, ang);
        }
        const n = 10;
        for (const sd of [1, -1]) {
            const o = sd * d * 0.5, N = [nx * sd, 0, nz * sd];
            for (const sg of [-1, 1])
                stone.Quad([Q(sg * hw, ys, o), Q(sg * r, ys, o), Q(sg * r, yt, o), Q(sg * hw, yt, o)], null, N);
            for (let k = 0; k < n; k++) {
                const a0 = Math.PI * (1 - k / n), a1 = Math.PI * (1 - (k + 1) / n);
                stone.Quad([Q(Math.cos(a0) * r, ys + Math.sin(a0) * r, o), Q(Math.cos(a1) * r, ys + Math.sin(a1) * r, o), Q(Math.cos(a1) * r, yt, o), Q(Math.cos(a0) * r, yt, o)], null, N);
            }
        }
        for (let k = 0; k < n; k++) {
            const a0 = Math.PI * (1 - k / n), a1 = Math.PI * (1 - (k + 1) / n), am = (a0 + a1) * 0.5;
            stone.Quad([Q(Math.cos(a0) * r, ys + Math.sin(a0) * r, d * 0.5), Q(Math.cos(a1) * r, ys + Math.sin(a1) * r, d * 0.5), Q(Math.cos(a1) * r, ys + Math.sin(a1) * r, -d * 0.5), Q(Math.cos(a0) * r, ys + Math.sin(a0) * r, -d * 0.5)], null, [-ux * Math.cos(am), -Math.sin(am), -uz * Math.cos(am)]);
        }
        for (const sg of [-1, 1])
            stone.Quad([Q(sg * hw, ys, d * 0.5), Q(sg * hw, ys, -d * 0.5), Q(sg * hw, yt, -d * 0.5), Q(sg * hw, yt, d * 0.5)], null, [ux * sg, 0, uz * sg]);
        CForgeShape.Box(trim, cx, cz, w + 0.24, d + 0.24, yt, yt + s * 0.12, ang);
        CForgeShape.Box(stone, cx, cz, w - 0.1, d - 0.1, yt + s * 0.12, yt + s * 0.4, ang);
        CForgeShape.Box(trim, cx, cz, w + 0.1, d + 0.1, yt + s * 0.4, yt + s * 0.47, ang);
        for (const sd of [1, -1]) {
            const k = Q(0, 0, sd * (d * 0.5 + 0.04));
            CForgeShape.Box(trim, k[0], k[2], s * 0.14, 0.08, ys + r - s * 0.06, ys + r + s * 0.12, ang);
        }
        return [{ buf: stone, rgb: T.mStone, tex: CForgeTex.sStone }, { buf: trim, rgb: T.mStone.map(_v => _v * 0.9), tex: CForgeTex.sStone }].filter(_p => _p.buf.mIdx.length > 0);
    }
    static Gorinto(_r, T, _g) {
        const [cx, cz] = _r.c, s = _r.size, ang = _r.ang, ux = Math.cos(ang), uz = Math.sin(ang), stone = new CForgeMeshBuf();
        const Sq = (_h) => CForgePoly.Orient([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + (ux * a - uz * b) * _h, cz + (uz * a + ux * b) * _h]));
        let y = _g + 0.15;
        CForgeShape.Box(stone, cx, cz, s * 0.95, s * 0.95, _g - 0.4, y, ang);
        CForgeShape.Box(stone, cx, cz, s * 0.55, s * 0.55, y, y + s * 0.5, ang);
        y += s * 0.5;
        const sph = [];
        for (let k = 0; k <= 8; k++) {
            const a = -Math.PI * 0.5 + k / 8 * Math.PI;
            sph.push([Math.cos(a) * s * 0.3 + (k == 0 || k == 8 ? 0 : 0), y + s * 0.3 + Math.sin(a) * s * 0.3]);
        }
        sph[0][0] = 0.001;
        sph[8][0] = 0.001;
        CForgeTowerGen.Lathe(stone, cx, cz, sph, 12);
        y += s * 0.58;
        CForgeShape.Box(stone, cx, cz, s * 0.62, s * 0.62, y, y + s * 0.08, ang);
        CForgeShape.Pyramid(stone, Sq(s * 0.31), y + s * 0.08, s * 0.24, s * 0.06);
        y += s * 0.3;
        CForgeTowerGen.Lathe(stone, cx, cz, [[s * 0.2, y], [s * 0.19, y + s * 0.08], [s * 0.12, y + s * 0.17], [0.01, y + s * 0.2]], 10);
        y += s * 0.18;
        CForgeTowerGen.Lathe(stone, cx, cz, [[0.01, y], [s * 0.13, y + s * 0.1], [s * 0.1, y + s * 0.22], [0, y + s * 0.38]], 10);
        return [{ buf: stone, rgb: T.mStone.map(_v => _v * 0.92), tex: CForgeTex.sStone }];
    }
    static Pagoda(_r, T, _g) {
        const [cx, cz] = _r.c, s = _r.size, ang = _r.ang, ux = Math.cos(ang), uz = Math.sin(ang);
        const B = { stone: new CForgeMeshBuf(), body: new CForgeMeshBuf(), dark: new CForgeMeshBuf(), beam: new CForgeMeshBuf(), metal: new CForgeMeshBuf(),
            roof: new CForgeMeshBuf(), under: new CForgeMeshBuf(), edge: new CForgeMeshBuf(), ridge: new CForgeMeshBuf(), mortar: new CForgeMeshBuf(), gable: new CForgeMeshBuf() };
        const W = (_a, _b, _y) => [cx + ux * _a - uz * _b, _y, cz + uz * _a + ux * _b];
        CForgeShape.Box(B.stone, cx, cz, s * 1.4, s * 1.4, _g - 0.5, _g + 0.25, ang);
        CForgeShape.Box(B.stone, cx, cz, s * 0.95, s * 0.95, _g + 0.25, _g + 0.4, ang);
        const tiers = CForgeMonumentGen.Tiers(s, _r.floors, _g + 0.4);
        for (const t of tiers) {
            const hb = t.b * 0.5;
            CForgeShape.Box(B.body, cx, cz, t.b, t.b, t.y - 0.05, t.ye, ang);
            CForgeShape.Box(B.beam, cx, cz, t.b + 0.12, t.b + 0.12, t.ye - t.h * 0.16, t.ye, ang);
            for (const [fa, fb] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const p = W(fa * hb, fb * hb, 0), nx = ux * fa - uz * fb, nz = uz * fa + ux * fb;
                CForgeShape.Decal(B.dark, p[0], t.y + t.h * 0.4, p[2], -nz, nx, nx, nz, t.b * 0.32, t.h * 0.56);
            }
            CForgeGiwaGen.Roof(B, W, -hb, hb, -hb, hb, t.ye, t.yr, { e: t.b * 0.7, lift: t.b * 0.1, bulge: t.b * 0.05, sg: 1, prof: 1.4, T: 0.1, tile: false, nu: 8, ns: 4 });
        }
        const top = tiers[tiers.length - 1], ry = top.yr, sh = s * CForgeMonumentGen.sSorin;
        CForgeShape.Box(B.metal, cx, cz, top.b * 0.42, top.b * 0.42, ry - 0.12, ry + 0.12, ang);
        CForgeTowerGen.Lathe(B.metal, cx, cz, [[0.05, ry + 0.12], [0.04, ry + sh]], 6);
        for (let k = 0; k < 9; k++) {
            const y = ry + 0.3 + k * sh * 0.06;
            CForgeTowerGen.Ring(B.metal, cx, cz, 0.03, 0.06 + s * 0.035, y, y + 0.04, 8);
        }
        CForgeTowerGen.Lathe(B.metal, cx, cz, [[0, ry + sh * 0.84], [0.06 + s * 0.02, ry + sh * 0.9], [0, ry + sh]], 8);
        const rc = T.mRoof[_r.seed % T.mRoof.length];
        const parts = [
            { buf: B.stone, rgb: T.mStone, tex: CForgeTex.sStone }, { buf: B.body, rgb: T.mPillar, tex: CForgeTex.sWood }, { buf: B.dark, rgb: T.mDark },
            { buf: B.beam, rgb: T.mBeam, tex: CForgeTex.sWood }, { buf: B.metal, rgb: T.mMetal },
            { buf: B.roof, rgb: rc, tex: CForgeTex.sKawara }, { buf: B.under, rgb: T.mBeam, tex: CForgeTex.sWood }, { buf: B.edge, rgb: rc.map(_v => _v * 0.75), tex: CForgeTex.sKawara },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
}
