import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeCurve } from "./CForgeSpline.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeWallGen } from "./CForgeWallGen.js";
import { CForgeAdobeGen } from "./CForgeAdobeGen.js";
import { CForgeHutGen } from "./CForgeHutGen.js";
export class CForgeAfricaGen {
    static Bufs() { return { mud: new CForgeMeshBuf(), stone: new CForgeMeshBuf(), trim: new CForgeMeshBuf(), wood: new CForgeMeshBuf(), dark: new CForgeMeshBuf(), egg: new CForgeMeshBuf(), green: new CForgeMeshBuf() }; }
    static Parts(B, T, _mud) {
        const parts = [
            { buf: B.mud, rgb: _mud, tex: CForgeTex.sAdobe }, { buf: B.stone, rgb: T.mWallBody, tex: CForgeTex.sDryCourse }, { buf: B.trim, rgb: T.mWallCap, tex: CForgeTex.sDryCourse },
            { buf: B.wood, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: B.dark, rgb: T.mDark }, { buf: B.egg, rgb: [0.94, 0.92, 0.86] }, { buf: B.green, rgb: T.mGreen },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Toron(_b, _x, _z, _tx, _tz, _nx, _nz, _u0, _u1, _ys, _du = 0.9) {
        const ang = Math.atan2(_tz, _tx);
        for (const y of _ys)
            for (let u = _u0; u <= _u1; u += _du)
                CForgeShape.Box(_b, _x + _tx * u + _nx * 0.2, _z + _tz * u + _nz * 0.2, 0.07, 0.5, y, y + 0.07, ang);
    }
    static sYardH = 1.8;
    static YardWall(_w, c, Gnd, H, gates) {
        const L = c.mLen, T = CForgeTheme.Of(_w), half = 0.2, h0 = CForgeAfricaGen.sYardH, Hh = (_s) => Math.min(H(_s), h0), step = 0.4;
        const body = new CForgeMeshBuf(), base = new CForgeMeshBuf(), cols = T.mPaint.map(() => new CForgeMeshBuf());
        const spans = [];
        let s0 = 0;
        for (const q of gates) {
            if (q.a0 > s0)
                spans.push([s0, q.a0]);
            s0 = Math.max(s0, q.a1);
        }
        if (s0 < L)
            spans.push([s0, L]);
        for (const [a, b] of spans) {
            if (b - a < 0.05)
                continue;
            const ss = c.Steps(a, b, step), o = { cap0: !(_w.closed && a <= 0), cap1: !(_w.closed && b >= L) };
            CForgeShape.Band(body, c, ss, () => half, _s => Gnd(_s) - 0.3, _s => Gnd(_s) + Hh(_s), o);
            CForgeShape.Band(body, c, ss, () => half * 0.7, _s => Gnd(_s) + Hh(_s), _s => Gnd(_s) + Hh(_s) + 0.1, o);
            CForgeShape.Band(base, c, ss, () => half + 0.005, _s => Gnd(_s) - 0.3, _s => Gnd(_s) + 0.35, o);
            for (const sd of [1, -1]) {
                CForgeShape.Band(cols[0], c, ss, () => 0.008, _s => Gnd(_s) + Hh(_s) - 0.28, _s => Gnd(_s) + Hh(_s) - 0.18, { top: false, cap0: false, cap1: false }, () => sd * half);
                for (let k = Math.ceil(a / 0.9), n = Math.floor(b / 0.9); k < n; k++) {
                    const s = (k + 0.5) * 0.9, p = c.At(s), g = Gnd(s), hh = Hh(s), lx = -p.tz * sd, lz = p.tx * sd, o2 = half + 0.006;
                    if (hh < 1.0)
                        continue;
                    const P = (_u, _y, _o) => [p.p[0] + p.tx * _u + lx * _o, g + _y, p.p[1] + p.tz * _u + lz * _o];
                    cols[0].Poly([P(-0.36, 0.45, o2), P(0.36, 0.45, o2), P(0, hh - 0.35, o2)], [lx, 0, lz]);
                    cols[1 + Math.abs(k) % (cols.length - 1)].Poly([P(-0.25, 0.51, o2 + 0.006), P(0.25, 0.51, o2 + 0.006), P(0, hh - 0.46, o2 + 0.006)], [lx, 0, lz]);
                }
            }
        }
        for (const q of gates)
            for (const s of [q.a0, q.a1]) {
                const p = c.At(s), g = Gnd(s);
                CForgeTowerGen.Lathe(body, p.p[0], p.p[1], [[0.32, g - 0.3], [0.32, g + h0 + 0.2], [0.24, g + h0 + 0.42], [0, g + h0 + 0.5]], 12);
                CForgeTowerGen.Ring(cols[0], p.p[0], p.p[1], 0.31, 0.335, g + h0 - 0.2, g + h0 - 0.08, 12);
                CForgeTowerGen.Ring(cols[1 + Math.round(s) % (cols.length - 1)], p.p[0], p.p[1], 0.31, 0.335, g + h0 - 0.5, g + h0 - 0.25, 12);
            }
        const parts = [{ buf: body, rgb: T.mPlaster[0], tex: CForgeTex.sAdobe }, { buf: base, rgb: T.mWallStone, tex: CForgeTex.sAdobe },
            ...cols.map((_b, _i) => ({ buf: _b, rgb: T.mPaint[_i], tex: CForgeTex.sPlaster }))];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Wall(_w, c, Gnd, Top, H, gates) {
        if (CForgeTheme.Of(_w).mWallStyle == 2)
            return CForgeAfricaGen.YardWall(_w, c, Gnd, H, gates);
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), out = _w.out, step = 0.5, B = CForgeAfricaGen.Bufs(), zim = T.mWallStyle == 1;
        const Sink = (_s) => Gnd(_s) - 1.0, Spread = (_s) => (Top(_s) - Sink(_s)) * (zim ? 0.1 : 0.06);
        const spans = [];
        let s0 = 0;
        for (const q of gates) {
            if (q.a0 > s0)
                spans.push([s0, q.a0]);
            s0 = Math.max(s0, q.a1);
        }
        if (s0 < L)
            spans.push([s0, L]);
        const InGate = (_s, _pad) => gates.some(_q => _s > _q.a0 - _pad && _s < _q.a1 + _pad);
        const body = zim ? B.stone : B.mud;
        for (const [a, b] of spans) {
            if (b - a < 0.05)
                continue;
            const ss = c.Steps(a, b, step), cap0 = !(_w.closed && a <= 0), cap1 = !(_w.closed && b >= L);
            for (const sd of [1, -1])
                CForgeWallGen.Batter(body, c, ss, half, sd, Sink, Top, Spread, cap0, cap1);
            CForgeShape.Band(body, c, ss, () => half * 0.85, Top, _s => Top(_s) + 0.16, { cap0, cap1 });
            if (!zim)
                CForgeShape.Band(body, c, ss, () => half * 0.5, _s => Top(_s) + 0.16, _s => Top(_s) + 0.3, { cap0, cap1 });
        }
        if (zim) {
            for (let s = 0.3; s < L - 0.3; s += 0.3) {
                if (InGate(s, 0.4) || H(s) < 3)
                    continue;
                const p = c.At(s), ang = Math.atan2(p.tz, p.tx), lx = -p.tz * out, lz = p.tx * out, k = Math.round(s / 0.3), y = Top(s) - 0.9 + (k % 4 < 2 ? (k % 2) * 0.22 : (1 - k % 2) * 0.22);
                CForgeShape.Box(B.trim, p.p[0] + lx * (half + 0.03), p.p[1] + lz * (half + 0.03), 0.24, 0.12, y, y + 0.12, ang);
                if (k % 2 == 0)
                    CForgeShape.Box(B.trim, p.p[0] + lx * (half + 0.03), p.p[1] + lz * (half + 0.03), 0.24, 0.1, Top(s) - 1.5, Top(s) - 1.36, ang);
            }
            for (let s = 6; s < L - 2; s += 12) {
                if (InGate(s, 1.5))
                    continue;
                const p = c.At(s);
                CForgeShape.Box(B.trim, p.p[0], p.p[1], 0.28, 0.2, Top(s) + 0.1, Top(s) + 1.7, Math.atan2(p.tz, p.tx) + 0.2);
            }
            for (const q of gates)
                for (const s of [q.a0, q.a1]) {
                    const p = c.At(s);
                    CForgeTowerGen.Lathe(B.stone, p.p[0], p.p[1], [[half + Spread(s) + 0.05, Sink(s)], [half + 0.1, Gnd(s) + 1.0], [half, Top(s)], [half * 0.85, Top(s) + 0.16]], 12);
                }
            return CForgeAfricaGen.Parts(B, T, T.mWallBody);
        }
        for (let s = 1.5; s < L - 0.5; s += 3) {
            if (InGate(s, 1.2))
                continue;
            const p = c.At(s), ang = Math.atan2(p.tz, p.tx), lx = -p.tz * out, lz = p.tx * out, t = Top(s) + 0.6, d = half + Spread(s) * 0.5 + 0.2;
            CForgeShape.Frustum(B.mud, p.p[0] + lx * d, p.p[1] + lz * d, 0.75, 0.6, 0.55, 0.42, Sink(s), t, ang);
            CForgeAdobeGen.Pinnacle(B.mud, p.p[0] + lx * d, p.p[1] + lz * d, t, 0.3, 0.9);
            if (H(s) > 2.6)
                CForgeAfricaGen.Toron(B.wood, p.p[0] + lx * (half + 0.05), p.p[1] + lz * (half + 0.05), p.tx, p.tz, lx, lz, 0.7, 2.3, [Gnd(s) + H(s) * 0.45, Gnd(s) + H(s) * 0.8]);
        }
        for (const q of gates) {
            const g = Gnd(q.s), lin = g + Math.min(H(q.s) - 0.4, Math.max(2.6, q.w * 1.15));
            CForgeShape.Band(B.mud, c, c.Steps(q.a0 - 0.05, q.a1 + 0.05, 0.25), () => half + 0.1, () => lin + 0.2, _s => Top(_s) + 0.3, { bottom: true, cap0: false, cap1: false });
            CForgeShape.Band(B.wood, c, c.Steps(q.a0 - 0.3, q.a1 + 0.3, 0.25), () => half + 0.14, () => lin, () => lin + 0.2, { bottom: true });
            for (const s of [q.a0 - 0.7, q.a1 + 0.7]) {
                const p = c.At(s), t = Top(s) + 1.2;
                CForgeShape.Frustum(B.mud, p.p[0], p.p[1], 1.4, _w.thick + 1.0, 1.1, _w.thick + 0.6, Sink(s), t, Math.atan2(p.tz, p.tx));
                CForgeAdobeGen.Pinnacle(B.mud, p.p[0], p.p[1], t, 0.4, 1.2);
            }
        }
        return CForgeAfricaGen.Parts(B, T, T.mWallBody);
    }
    static Tower(_t, _g, _top, T) {
        const [cx, cz] = _t.c, r = _t.r, B = CForgeAfricaGen.Bufs();
        if (T.mWallStyle == 2) {
            const HB = CForgeHutGen.Bufs(), rr = CForgeAfricaGen.HutR(_t);
            CForgeHutGen.Hut(HB, 1, cx, cz, rr, _g, _t.door ?? (_t.attach.length > 0 ? _t.attach[0] + Math.PI * 0.5 : 0), 0, _t.seed, false);
            return CForgeHutGen.Parts(HB, T, _t.seed);
        }
        if (T.mWallStyle == 1) {
            CForgeTowerGen.Lathe(B.stone, cx, cz, [[r * 1.05, _g - 0.8], [r, _g + 0.6], [r * 0.62, _top]], 20);
            const n = Math.round(Math.PI * 2 * r * 0.62 / 0.3);
            for (let k = 0; k < n; k += 2) {
                const a = k / n * Math.PI * 2;
                CForgeShape.Box(B.trim, cx + Math.cos(a) * (r * 0.62 + 0.04), cz + Math.sin(a) * (r * 0.62 + 0.04), 0.22, 0.12, _top - 0.9, _top - 0.76, a + Math.PI * 0.5);
            }
            CForgeShape.Cap(B.trim, Array.from({ length: 14 }, (_v, _k) => [cx + Math.cos(_k / 14 * Math.PI * 2) * r * 0.62, cz + Math.sin(_k / 14 * Math.PI * 2) * r * 0.62]), _top);
            return CForgeAfricaGen.Parts(B, T, T.mWallBody);
        }
        const w = r * 1.8, w1 = w * 0.72, ang = _t.attach.length > 0 ? _t.attach[0] : 0, cs = Math.cos(ang), sn = Math.sin(ang);
        CForgeShape.Frustum(B.mud, cx, cz, w, w, w1, w1, _g - 1.0, _top, ang);
        CForgeShape.Box(B.mud, cx, cz, w1 + 0.1, w1 + 0.1, _top - 0.05, _top + 0.5, ang);
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
            CForgeAdobeGen.Pinnacle(B.mud, cx + (cs * a - sn * b) * (w1 * 0.5 - 0.15), cz + (sn * a + cs * b) * (w1 * 0.5 - 0.15), _top + 0.5, 0.26, 0.8);
        CForgeAdobeGen.Pinnacle(B.mud, cx, cz, _top + 0.5, 0.45, 1.6);
        CForgeTowerGen.Lathe(B.egg, cx, cz, [[0.02, _top + 2.0], [0.14, _top + 2.1], [0.12, _top + 2.28], [0, _top + 2.35]], 8);
        for (const [fu, fv] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
            const nx = cs * fu - sn * fv, nz = sn * fu + cs * fv, ys = [];
            for (let y = _g + 1.6; y < _top - 0.5; y += 1.4)
                ys.push(y);
            const d = (w + w1) * 0.25;
            CForgeAfricaGen.Toron(B.wood, cx + nx * d - nz * (-w * 0.38), cz + nz * d + nx * (-w * 0.38), -nz, nx, nx, nz, 0, w * 0.76, ys, 0.75);
            CForgeShape.Decal(B.dark, cx + nx * (d + 0.05), _g + _t.height * 0.6, cz + nz * (d + 0.05), -nz, nx, nx, nz, 0.3, 0.5);
        }
        return CForgeAfricaGen.Parts(B, T, T.mTowerBody);
    }
    static TowerTop(T) { return T.mWallStyle == 1 ? 0 : 2.4; }
    static HutR(_t) { return Math.min(3, Math.max(1.8, _t.r)); }
    static MosqueDim(_r, F) {
        const { L, W } = _r, ph = 1.4, Hm = Math.min(7.5, 3.6 + W * 0.22), tw = Math.min(5, L * 0.21);
        return { ph, Hm, tw, y0: F.floor + ph, Wh: W - 2.2, Lh: L - 1.8 };
    }
    static MosqueHull(_r, F) {
        const D = CForgeAfricaGen.MosqueDim(_r, F), { L, W, fs } = _r;
        return [[0, 0, L * 0.5, W * 0.5, F.base, D.y0], [0, 0, D.Lh * 0.5, D.Wh * 0.5, D.y0, D.y0 + D.Hm + 0.8], [0, fs * (D.Wh * 0.5), D.tw * 0.6, D.tw * 0.6, D.y0, D.y0 + D.Hm + 5]];
    }
    static Mosque(_r, _g, F) {
        const T = CForgeTheme.Of(_r), { L, W, fs, u } = _r, { P, v, floor, base, ang } = F, D = CForgeAfricaGen.MosqueDim(_r, F), B = CForgeAfricaGen.Bufs();
        const { y0, Hm, Wh, Lh, tw } = D, top = y0 + Hm, c = P(0, 0), k = 0.06;
        CForgeShape.Frustum(B.mud, c[0], c[1], L, W, L - 0.3, W - 0.3, base, y0, ang);
        CForgeShape.Frustum(B.mud, c[0], c[1], Lh, Wh, Lh - Hm * k * 2, Wh - Hm * k * 2, y0 - 0.05, top, ang);
        CForgeShape.Box(B.mud, c[0], c[1], Lh - Hm * k * 2 + 0.05, Wh - Hm * k * 2 + 0.05, top - 0.05, top + 0.55, ang);
        for (let i = 0; i < 6; i++) {
            const q = P(-L * 0.15, fs * (W * 0.5 + 1.0 - i * 0.28));
            CForgeShape.Box(B.mud, q[0], q[1], 3.0, 0.3, base, floor + (D.ph + 0.2) * (i + 1) / 6 - 0.2, ang);
        }
        const sides = [[1, 0, Lh, Wh], [-1, 0, Lh, Wh], [0, 1, Wh, Lh], [0, -1, Wh, Lh]];
        for (const [da, db, len, dep] of sides) {
            const nx = u[0] * da + v[0] * db, nz = u[1] * da + v[1] * db, tx = -nz, tz = nx, d = dep * 0.5 - Hm * k * 0.5, front = db == fs;
            const n = Math.max(2, Math.round(len / 1.5));
            for (let i = 0; i <= n; i++) {
                const t = -len * 0.5 + 0.4 + (len - 0.8) * i / n, x = c[0] + nx * (d + 0.15) + tx * t, z = c[1] + nz * (d + 0.15) + tz * t;
                if (front && [-0.32, 0, 0.32].some(_f => Math.abs(t - _f * len) < tw * 0.55))
                    continue;
                CForgeShape.Frustum(B.mud, x, z, 0.72, 0.6, 0.58, 0.45, y0 - 0.05, top + 0.55, Math.atan2(tz, tx));
                CForgeAdobeGen.Pinnacle(B.mud, x, z, top + 0.55, 0.3, 0.75);
                if (i < n)
                    CForgeAfricaGen.Toron(B.wood, x + tx * 0.75 - nx * 0.15, z + tz * 0.75 - nz * 0.15, tx, tz, nx, nz, 0, 0.01, [y0 + 1.2, y0 + 2.3, y0 + 3.4, y0 + 4.5, y0 + 5.6, y0 + 6.7].filter(_y => _y < top - 0.3), 1);
            }
            if (da == 1) {
                const q = [c[0] + nx * (d + 0.4), c[1] + nz * (d + 0.4)];
                CForgeShape.Frustum(B.mud, q[0], q[1], 3.2, 0.9, 2.8, 0.7, y0 - 0.05, top + 1.6, Math.atan2(tz, tx));
                CForgeShape.Decal(B.dark, q[0] + nx * 0.36, y0 + 1.6, q[1] + nz * 0.36, tx, tz, nx, nz, 1.4, 3.0);
                for (const s of [-1, 1])
                    CForgeAdobeGen.Pinnacle(B.mud, q[0] + tx * s * 1.2, q[1] + tz * s * 1.2, top + 1.6, 0.32, 1.0);
            }
        }
        for (const f of [-0.32, 0, 0.32]) {
            const w0 = f == 0 ? tw : tw * 0.82, d0 = w0 * 0.55, q = P(f * Lh, fs * (Wh * 0.5 - Hm * k * 0.5 + d0 * 0.35)), th = top + (f == 0 ? 3.6 : 2.6), nx = v[0] * fs, nz = v[1] * fs;
            CForgeShape.Frustum(B.mud, q[0], q[1], w0, d0, w0 * 0.78, d0 * 0.8, y0 - 0.05, th, ang);
            CForgeShape.Frustum(B.mud, q[0], q[1], w0 * 0.4, d0 * 0.6, w0 * 0.3, d0 * 0.45, th - 0.1, th + 1.0, ang);
            CForgeAdobeGen.Pinnacle(B.mud, q[0], q[1], th + 0.95, w0 * 0.13, 1.2);
            for (const s of [-1, 1])
                CForgeAdobeGen.Pinnacle(B.mud, q[0] + u[0] * s * w0 * 0.33, q[1] + u[1] * s * w0 * 0.33, th - 0.1, w0 * 0.1, 0.8);
            CForgeTowerGen.Lathe(B.egg, q[0], q[1], [[0.02, th + 2.1], [0.13, th + 2.2], [0.11, th + 2.38], [0, th + 2.45]], 8);
            for (const s of [-1, 1])
                CForgeShape.Box(B.wood, q[0], q[1], 0.06, w0 * 0.36, th + 1.45, th + 1.51, ang + (s > 0 ? 0 : Math.PI * 0.5));
            const ys = [];
            for (let y = y0 + 1.1; y < th - 0.6; y += 0.95)
                ys.push(y);
            CForgeAfricaGen.Toron(B.wood, q[0] + nx * d0 * 0.42 - u[0] * w0 * 0.33, q[1] + nz * d0 * 0.42 - u[1] * w0 * 0.33, u[0], u[1], nx, nz, 0, w0 * 0.66, ys, 0.62);
        }
        return CForgeAfricaGen.Parts(B, T, T.mPlaster[0]);
    }
    static EnclosureDim(_r) { const { L, W } = _r; return { A: L * 0.5 - 0.6, Bv: W * 0.5 - 0.6, H: Math.min(6, 3 + W * 0.18), th: 1.4 }; }
    static EnclosureHull(_r, F) {
        const D = CForgeAfricaGen.EnclosureDim(_r), y1 = F.floor + D.H, h = D.th * 0.5;
        return [[0, D.Bv, D.A * 0.7, h, F.base, y1], [0, -D.Bv, D.A * 0.7, h, F.base, y1], [D.A, 0, h, D.Bv * 0.7, F.base, y1], [-D.A, 0, h, D.Bv * 0.7, F.base, y1],
            [D.A * 0.45, 0, 1.6, 1.6, F.base, F.floor + Math.min(9, D.H * 1.6)]];
    }
    static Enclosure(_r, _g, F) {
        const T = CForgeTheme.Of(_r), { fs } = _r, { P, floor } = F, D = CForgeAfricaGen.EnclosureDim(_r), B = CForgeAfricaGen.Bufs(), H = D.H, half = D.th * 0.5;
        const pts = [];
        const n = 64, gapF = Math.PI * 0.5 * fs, gapB = -gapF, gw = 1.4 / Math.max(D.A, D.Bv);
        for (let k = 0; k <= n; k++) {
            const t = k / n * Math.PI * 2, q = P(Math.cos(t) * D.A, Math.sin(t) * D.Bv);
            pts.push([q[0], q[1], H]);
        }
        const c = new CForgeCurve(pts), L = c.mLen;
        const TA = (_s) => (_s / L) * Math.PI * 2, Gap = (_s) => [gapF, gapB].some(_g2 => Math.abs(Math.atan2(Math.sin(TA(_s) - _g2), Math.cos(TA(_s) - _g2))) < gw);
        const Gnd = (_s) => { const a = c.At(_s); return _g(a.p[0], a.p[1]); }, Top = (_s) => Math.max(floor, Gnd(_s)) + H * (0.85 + 0.15 * Math.max(0, Math.sin(TA(_s)) * fs));
        const Sink = (_s) => Gnd(_s) - 1.0, Spread = (_s) => (Top(_s) - Sink(_s)) * 0.12;
        const spans = [];
        let open = true, a0 = 0;
        for (let s = 0; s <= L; s += 0.2) {
            const g = Gap(s);
            if (open && g) {
                spans.push([a0, s]);
                open = false;
            }
            else if (!open && !g) {
                a0 = s;
                open = true;
            }
        }
        if (open)
            spans.push([a0, L]);
        for (const [a, b] of spans) {
            if (b - a < 0.3)
                continue;
            const ss = c.Steps(a, b, 0.4);
            for (const sd of [1, -1])
                CForgeWallGen.Batter(B.stone, c, ss, half, sd, Sink, Top, Spread, true, true);
            for (const s of [a, b]) {
                const p = c.At(s);
                CForgeTowerGen.Lathe(B.stone, p.p[0], p.p[1], [[half + Spread(s), Sink(s)], [half + 0.05, Gnd(s) + 1.0], [half, Top(s)]], 12);
            }
            for (let s = a + 0.3; s < b - 0.3; s += 0.3) {
                if (Math.sin(TA(s)) * fs < 0.2)
                    continue;
                const p = c.At(s), lx = p.tz, lz = -p.tx, k = Math.round(s / 0.3), y = Top(s) - 0.9 + (k % 4 < 2 ? (k % 2) * 0.22 : (1 - k % 2) * 0.22);
                CForgeShape.Box(B.trim, p.p[0] + lx * (half + 0.03), p.p[1] + lz * (half + 0.03), 0.24, 0.12, y, y + 0.12, Math.atan2(p.tz, p.tx));
            }
        }
        for (const [fa, r, h] of [[0.45, 1.6, Math.min(9, H * 1.6)], [0.25, 0.9, H * 0.8]]) {
            const q = P(D.A * fa, -fs * D.Bv * 0.2), g = _g(q[0], q[1]);
            CForgeTowerGen.Lathe(B.stone, q[0], q[1], [[r * 1.05, g - 0.8], [r, g + 0.5], [r * 0.6, g + h]], 18);
            CForgeShape.Cap(B.trim, Array.from({ length: 12 }, (_v, _k) => [q[0] + Math.cos(_k / 12 * Math.PI * 2) * r * 0.6, q[1] + Math.sin(_k / 12 * Math.PI * 2) * r * 0.6]), g + h);
        }
        const HB = CForgeHutGen.Bufs();
        for (const fa of [-0.5, -0.15]) {
            const q = P(D.A * fa, -fs * D.Bv * 0.25), rr = Math.min(2.2, D.Bv * 0.4);
            CForgeHutGen.Hut(HB, 1, q[0], q[1], rr, CForgeHutGen.Ground(_g, q, rr), Math.atan2(F.v[1] * fs, F.v[0] * fs), 0, _r.seed + Math.round(fa * 10), false);
        }
        return [...CForgeAfricaGen.Parts(B, T, T.mWallBody), ...CForgeHutGen.Parts(HB, T, _r.seed)];
    }
}
