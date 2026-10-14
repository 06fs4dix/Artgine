import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeCurve } from "./CForgeSpline.js";
import { CForgeOpening } from "./CForgeOpening.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeHanokGen } from "./CForgeHanokGen.js";
import { CForgeAdobeGen } from "./CForgeAdobeGen.js";
import { CForgeArabGen } from "./CForgeArabGen.js";
import { CForgeWallGen } from "./CForgeWallGen.js";
export class CForgeIncaGen {
    static sBatter = 0.04;
    static sPitch = 1.25;
    static Batter(_b, _poly, _in, _y0, _y1) {
        const top = CForgePoly.Orient(_poly), bot = CForgePoly.Offset(top, _in, 50), n = top.length;
        if (bot.length != n) {
            CForgeShape.Extrude(_b, top, _y0, _y1);
            return;
        }
        const Y0 = typeof _y0 == "number" ? () => _y0 : _y0;
        let u = 0;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n, a = top[i], c = top[j], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
            if (l < 1e-6)
                continue;
            const nx = (c[1] - a[1]) / l, nz = -(c[0] - a[0]) / l, ny = _in / Math.max(0.1, _y1 - Y0(a));
            _b.Quad([[bot[i][0], Y0(a), bot[i][1]], [bot[j][0], Y0(c), bot[j][1]], [c[0], _y1, c[1]], [a[0], _y1, a[1]]], [[u, Y0(a)], [u + l, Y0(c)], [u + l, _y1], [u, _y1]], [nx, ny, nz]);
            u += l;
        }
    }
    static Niche(_dark, _stone, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, _double) {
        const K = CForgeOpening.eKind.Trapezoid;
        CForgeOpening.Fill(_dark, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, K, 0.012);
        CForgeOpening.Frame(_stone, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, K, 0.12, 0.06);
        if (_double)
            CForgeOpening.Frame(_stone, _x, _y0, _z, _tx, _tz, _nx, _nz, _w + 0.24, _h + 0.12, K, 0.16, 0.12);
    }
    static Dim(_b, _g, _kind) {
        let gmin = Infinity, gmax = -Infinity;
        for (const q of _b.poly) {
            const g = _g(q[0], q[1]);
            gmin = Math.min(gmin, g);
            gmax = Math.max(gmax, g);
        }
        const floor = gmax + 0.12, top = _kind == 15 ? floor + Math.max(5.4, _b.height) : floor + Math.min(_b.height, 2.9);
        return { gmin, gmax, floor, top, base: floor + Math.min(2.4, (top - floor) * 0.45) };
    }
    static Hull(_b, _g, _kind) {
        const D = CForgeIncaGen.Dim(_b, _g, _kind), hull = CForgePoly.ConvexHull(_b.poly), ob = CForgePoly.OBB(hull), hw = (ob.vMax - ob.vMin) * 0.5;
        return [[hull, D.gmin - 0.5, D.top], [CForgePoly.ConvexHull(CForgePoly.Offset(hull, 0.5)), D.top - 0.3, D.top + hw * (_kind == 15 ? 0.45 : CForgeIncaGen.sPitch) + 0.3]];
    }
    static House(_b, _g, _lod, _kind) {
        if (_b.poly.length < 3)
            return [];
        const T = CForgeTheme.Of(_b), L = _lod, D = CForgeIncaGen.Dim(_b, _g, _kind), { floor, top, base } = D, colonial = _kind == 15;
        const B = { stone: new CForgeMeshBuf(), body: new CForgeMeshBuf(), roof: new CForgeMeshBuf(), under: new CForgeMeshBuf(), dark: new CForgeMeshBuf(), wood: new CForgeMeshBuf(),
            trim: new CForgeMeshBuf(), shutter: new CForgeMeshBuf(), door: new CForgeMeshBuf(), lattice: new CForgeMeshBuf() };
        const edges = CForgeAdobeGen.Edges(_b), door = _b.door ?? { edge: 0, t: 0.5 };
        if (!colonial) {
            CForgeIncaGen.Batter(B.stone, _b.poly, (top - floor + 1) * CForgeIncaGen.sBatter, _q => _g(_q[0], _q[1]) - 1.0, top);
            for (const e of edges) {
                const P = (_u, _o) => [e.a[0] + e.tx * _u + e.nx * _o, e.a[1] + e.tz * _u + e.nz * _o], du = door.t * e.len, lean = (top - floor) * CForgeIncaGen.sBatter;
                if (e.i == door.edge) {
                    const q = P(du, lean * 0.6 + 0.02);
                    CForgeIncaGen.Niche(B.dark, B.stone, q[0], floor, q[1], e.tx, e.tz, e.nx, e.nz, 1.0, 1.9, false);
                }
                if (L >= 2)
                    continue;
                for (let u = 1.0; u < e.len - 0.6; u += 1.7) {
                    if (e.i == door.edge && Math.abs(u - du) < 1.2)
                        continue;
                    const q = P(u, lean * 0.4 + 0.02);
                    CForgeIncaGen.Niche(B.dark, B.stone, q[0], floor + 1.0, q[1], e.tx, e.tz, e.nx, e.nz, 0.42, 0.62, false);
                }
            }
            const { rects, W } = CForgeHanokGen.Rects(_b);
            for (const r of rects) {
                const alongU = r[2] - r[0] >= r[3] - r[1], Wr = alongU ? W : (_a, _c, _y) => W(_c, _a, _y);
                const a0 = alongU ? r[0] : r[1], a1 = alongU ? r[2] : r[3], b0 = alongU ? r[1] : r[0], b1 = alongU ? r[3] : r[2], k = CForgeIncaGen.sPitch, hw = (b1 - b0) * 0.5;
                const yr = CForgeShape.GableRoof(B.roof, B.under, B.stone, Wr, a0, a1, b0, b1, top, k, 0.5, 0.35, 0.32);
                const ua = CForgeShape.LocalDir(Wr, 1, 0, 0), rc = Wr((a0 + a1) * 0.5, (b0 + b1) * 0.5, yr - 0.05), ang = Math.atan2(ua[2], ua[0]);
                CForgeShape.Box(B.roof, rc[0], rc[2], a1 - a0 + 0.9, 0.42, yr - 0.12, yr + 0.08, ang);
                if (L < 2)
                    for (const [a, s] of [[a0, -1], [a1, 1]])
                        for (const f of [0.3, 0.62])
                            for (const sb of [-1, 1]) {
                                const p = Wr(a + s * 0.14, (b0 + b1) * 0.5 + sb * hw * (1 - f) * 0.6, top + hw * k * f * 0.85);
                                CForgeShape.Box(B.stone, p[0], p[2], 0.3, 0.13, p[1] - 0.065, p[1] + 0.065, ang);
                            }
            }
        }
        else {
            CForgeIncaGen.Batter(B.stone, _b.poly, (base - floor + 1) * CForgeIncaGen.sBatter, _q => _g(_q[0], _q[1]) - 1.0, base);
            CForgeShape.Extrude(B.body, _b.poly, base - 0.05, top);
            CForgeShape.Extrude(B.trim, CForgePoly.Offset(_b.poly, 0.05), base - 0.08, base + 0.1);
            const K = CForgeOpening.eKind;
            for (const e of edges) {
                const P = (_u, _o) => [e.a[0] + e.tx * _u + e.nx * _o, e.a[1] + e.tz * _u + e.nz * _o], du = door.t * e.len, ang = Math.atan2(e.tz, e.tx), front = e.i == door.edge;
                if (front) {
                    const q = P(du, 0.06);
                    CForgeOpening.Door({ stone: B.trim, fill: B.door, dark: B.dark, door: B.door }, q[0], floor, q[1], e.tx, e.tz, e.nx, e.nz, 1.5, 2.4, T.mArch, 1);
                }
                if (L >= 2)
                    continue;
                const n = Math.max(1, Math.floor((e.len - 0.6) / 2.3));
                for (let j = 0; j < n; j++) {
                    const u = (j + 0.5) * e.len / n, q = P(u, 0.02);
                    if (front && Math.abs(u - du) < 1.8 && e.len > 4)
                        continue;
                    CForgeOpening.Window({ stone: B.wood, fill: B.shutter, dark: B.dark }, q[0], base + 0.75, q[1], e.tx, e.tz, e.nx, e.nz, 0.8, 1.4, K.Rect);
                    if (!(front && Math.abs(u - du) < 1.5))
                        CForgeOpening.Window({ stone: B.stone, fill: B.dark, dark: B.dark }, q[0], floor + 1.2, q[1], e.tx, e.tz, e.nx, e.nz, 0.55, 0.75, K.Rect);
                }
                if (front && e.len > 4) {
                    const bw = Math.min(3.2, e.len - 1.2), d = 0.85, c = P(du, d * 0.5), y0 = base + 0.35, y1 = base + 2.3;
                    CForgeShape.Box(B.wood, c[0], c[1], bw + 0.1, d + 0.06, y0 - 0.12, y0, ang);
                    CForgeShape.Box(B.shutter, c[0], c[1], bw, d, y0, y0 + 0.8, ang);
                    CForgeShape.Box(B.lattice, c[0], c[1], bw - 0.02, d - 0.02, y0 + 0.8, y1, ang);
                    for (const s of [-0.5, 0.5]) {
                        const p = P(du + s * bw, d - 0.03);
                        CForgeShape.Box(B.wood, p[0], p[1], 0.1, 0.1, y0, y1, ang);
                    }
                    const W = (_a, _c, _y) => { const p = P(du + _a, _c); return [p[0], _y, p[1]]; };
                    CForgeShape.HipRoof(B.roof, B.under, W, -bw * 0.5, bw * 0.5, 0.02, d, y1 + 0.02, 0.45, 0.2, 0.06);
                    for (let k = 0; k <= 3; k++) {
                        const s = -bw * 0.45 + bw * 0.9 * k / 3, p = P(du + s, 0.02), q = P(du + s, d - 0.1);
                        CForgeTowerGen.Strut(B.wood, [p[0], y0 - 0.75, p[1]], [q[0], y0 - 0.1, q[1]], 0.1);
                    }
                }
            }
            const { rects, W } = CForgeHanokGen.Rects(_b);
            for (const r of rects)
                CForgeShape.HipRoof(B.roof, B.under, W, r[0], r[2], r[1], r[3], top, 0.45, 0.75, 0.1);
        }
        const pick = (_arr, _salt) => _arr[CForgeRand.Hash(_b.seed, _salt) % _arr.length];
        const parts = [
            { buf: B.stone, rgb: T.mStone, tex: CForgeTex.sInca }, { buf: B.body, rgb: pick(T.mPlaster, 1), tex: CForgeTex.sPlaster },
            { buf: B.roof, rgb: colonial ? pick(T.mRoof, 3) : pick(T.mThatch, 3), tex: colonial ? CForgeTex.sTile : CForgeTex.sThatch },
            { buf: B.under, rgb: colonial ? T.mWood : pick(T.mThatch, 3).map(_v => _v * 0.7), tex: colonial ? CForgeTex.sWood : CForgeTex.sThatch },
            { buf: B.dark, rgb: T.mDark }, { buf: B.wood, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: B.trim, rgb: T.mStone, tex: CForgeTex.sStone },
            { buf: B.shutter, rgb: pick(T.mShutter, 2), tex: CForgeTex.sPlank }, { buf: B.door, rgb: T.mWood.map(_v => _v * 1.2), tex: CForgeTex.sPlank },
            { buf: B.lattice, rgb: pick(T.mShutter, 2).map(_v => Math.min(1, _v * 1.15)), tex: CForgeTex.sKoshi },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static sZigP = 7;
    static sZigA = 1.3;
    static sTierStep = 2.0;
    static Tiers(_maxH) { return _maxH >= 6 ? 3 : _maxH >= 3.4 ? 2 : 1; }
    static Wall(_w, c, Gnd, Top, H, gates, seed, _g) {
        if (CForgeTheme.Of(_w).mWallStyle == 1)
            return CForgeIncaGen.ColonialWall(_w, c, Gnd, H, gates);
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), out = _w.out, step = 0.5;
        const body = new CForgeMeshBuf(), turf = new CForgeMeshBuf(), dark = new CForgeMeshBuf();
        let maxH = 0;
        for (const q of _w.curve)
            maxH = Math.max(maxH, q[2]);
        const n = CForgeIncaGen.Tiers(maxH), P = CForgeIncaGen.sZigP, A = CForgeIncaGen.sZigA, S = CForgeIncaGen.sTierStep;
        const Zig = (_s) => { const f = (_s / P) % 1; return A * (1 - Math.abs(f * 2 - 1)); };
        const Out = (_s, _k) => half + _k * S + (_k > 0 || n == 1 ? Zig(_s) : Zig(_s) * 0.35);
        const TopK = (_s, _k) => Gnd(_s) + H(_s) * (n - _k) / n;
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
            for (let k = 0; k < n; k++) {
                CForgeShape.Band(body, c, ss, _s => (Out(_s, k) + half) * 0.5, _s => Gnd(_s) - 1.0, _s => TopK(_s, k), o, _s => out * (Out(_s, k) - half) * 0.5);
                if (k == 0)
                    continue;
                CForgeShape.Band(turf, c, ss, _s => (Out(_s, k) - 0.35 - Out(_s, k - 1)) * 0.5, _s => TopK(_s, k), _s => TopK(_s, k) + 0.05, { left: false, right: false, cap0: false, cap1: false }, _s => out * (Out(_s, k) - 0.35 + Out(_s, k - 1)) * 0.5);
            }
        }
        for (const q of gates) {
            const a = c.At(q.s), g = Gnd(q.s), oo = Out(q.s, n - 1), depth = oo + half, mid = out * (oo - half) * 0.5;
            const oh = Math.min(H(q.s) - 0.9, Math.max(2.4, q.w * 1.05)), lin = g + oh, lx = -a.tz, lz = a.tx, hw = q.w * 0.5;
            CForgeShape.Band(body, c, c.Steps(q.a0 - 0.05, q.a1 + 0.05, 0.1), () => depth * 0.5, _s => g + CForgeArabGen.ArchY(q.w, oh, CForgeOpening.eKind.Trapezoid, Math.max(-hw, Math.min(hw, _s - q.s))), _s => Math.max(lin + 0.8, TopK(_s, 0)), { bottom: true, cap0: false, cap1: false }, () => mid);
            CForgeShape.Box(body, a.p[0] + lx * mid, a.p[1] + lz * mid, q.w * 0.74 + 1.2, depth + 0.3, lin, lin + 0.75, Math.atan2(a.tz, a.tx));
        }
        for (let i = 0; i < body.mUV.length; i++)
            body.mUV[i] *= 0.25;
        const parts = [{ buf: body, rgb: T.mWallBody, tex: CForgeTex.sInca }, { buf: turf, rgb: T.mGreen, tex: CForgeTex.sTurf }, { buf: dark, rgb: T.mDark }];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static sAdobeWallH = 2.4;
    static ColonialWall(_w, c, Gnd, H, gates) {
        const L = c.mLen, half = Math.min(0.35, _w.thick * 0.5), T = CForgeTheme.Of(_w), step = 0.5, Top = (_s) => Gnd(_s) + Math.min(H(_s), CForgeIncaGen.sAdobeWallH);
        const body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), under = new CForgeMeshBuf();
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
            CForgeShape.Band(stone, c, ss, () => half + 0.06, _s => Gnd(_s) - 0.5, _s => Gnd(_s) + 0.7, o);
            CForgeShape.Band(body, c, ss, () => half, _s => Gnd(_s) + 0.65, Top, o);
            CForgeWallGen.RoofBand(roof, under, c, ss, half, 0.22, Top);
        }
        const K = CForgeOpening.eKind.Round;
        for (const q of gates) {
            const a = c.At(q.s), g = Gnd(q.s), oh = Math.max(2.6, q.w * 1.15), top = g + oh + 0.9, hw = q.w * 0.5, ang = Math.atan2(a.tz, a.tx), hd = half + 0.15;
            CForgeShape.Band(body, c, c.Steps(q.a0 - 0.05, q.a1 + 0.05, 0.1), () => hd, _s => g + CForgeArabGen.ArchY(q.w, oh, K, Math.max(-hw, Math.min(hw, _s - q.s))), () => top, { bottom: true, cap0: false, cap1: false });
            for (const sg of [-1, 1]) {
                const p = c.At(q.s + sg * (hw + 0.3));
                CForgeShape.Box(stone, p.p[0], p.p[1], 0.6, hd * 2 + 0.2, g - 0.4, top + 0.05, ang);
            }
            const W = (_a, _b, _y) => [a.p[0] + a.tx * _a - a.tz * _b, _y, a.p[1] + a.tz * _a + a.tx * _b];
            CForgeShape.GableRoof(roof, under, null, W, -hw - 0.75, hw + 0.75, -hd - 0.1, hd + 0.1, top, 0.5, 0.35, 0.25, 0.1);
        }
        const parts = [
            { buf: body, rgb: T.mPlaster[0], tex: CForgeTex.sPlaster }, { buf: stone, rgb: T.mStone, tex: CForgeTex.sInca },
            { buf: roof, rgb: T.mRoof[0], tex: CForgeTex.sTile }, { buf: under, rgb: T.mWood, tex: CForgeTex.sWood },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static ColonialTower(_t, _g, T) {
        const [cx, cz] = _t.c, w = Math.min(4.2, Math.max(2.4, _t.r * 1.5)), ang = _t.attach.length > 0 ? _t.attach[0] : 0, top = _g + Math.max(6, Math.min(_t.height, 12)), bh = 2.4;
        const body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), under = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), metal = new CForgeMeshBuf();
        CForgeIncaGen.Batter(stone, CForgeIncaGen.Square(cx, cz, w + 0.3, ang), 0.1, _g - 0.8, _g + 1.6);
        CForgeShape.Box(body, cx, cz, w, w, _g + 1.5, top, ang);
        CForgeShape.Box(stone, cx, cz, w + 0.2, w + 0.2, top - bh - 0.15, top - bh, ang);
        CForgeShape.Box(stone, cx, cz, w + 0.24, w + 0.24, top - 0.1, top + 0.05, ang);
        const OB = { stone, fill: dark, dark };
        for (let k = 0; k < 4; k++) {
            const a = ang + k * Math.PI * 0.5, nx = Math.cos(a), nz = Math.sin(a);
            CForgeOpening.Window(OB, cx + nx * w * 0.5, top - bh + 0.25, cz + nz * w * 0.5, -nz, nx, nx, nz, w * 0.42, bh - 0.6, CForgeOpening.eKind.Round);
            if (k % 2 == 0)
                CForgeOpening.Window({ stone: body, fill: dark, dark }, cx + nx * w * 0.5, _g + (top - _g) * 0.45, cz + nz * w * 0.5, -nz, nx, nx, nz, 0.4, 0.8, CForgeOpening.eKind.Round);
        }
        CForgeTowerGen.Lathe(metal, cx, cz, [[w * 0.18, top - bh + 0.5], [w * 0.22, top - 0.9], [w * 0.1, top - 0.6], [0, top - 0.55]], 10);
        const W = (_a, _b, _y) => [cx + Math.cos(ang) * _a - Math.sin(ang) * _b, _y, cz + Math.sin(ang) * _a + Math.cos(ang) * _b];
        const yr = CForgeShape.HipRoof(roof, under, W, -w * 0.5, w * 0.5, -w * 0.5, w * 0.5, top + 0.05, 0.75, 0.35, 0.1);
        CForgeShape.Box(metal, cx, cz, 0.08, 0.08, yr - 0.1, yr + 1.0, ang);
        CForgeShape.Box(metal, cx, cz, 0.55, 0.08, yr + 0.6, yr + 0.68, ang);
        const parts = [
            { buf: body, rgb: T.mPlaster[0], tex: CForgeTex.sPlaster }, { buf: stone, rgb: T.mStone, tex: CForgeTex.sInca }, { buf: roof, rgb: T.mRoof[0], tex: CForgeTex.sTile },
            { buf: under, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: dark, rgb: T.mDark }, { buf: metal, rgb: [0.45, 0.36, 0.2] },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static ColonialTowerTop(_t) { return Math.max(6, Math.min(_t.height, 12)) - _t.height + Math.min(4.2, Math.max(2.4, _t.r * 1.5)) * 0.4 + 1.2; }
    static Square(_cx, _cz, _w, _a) {
        const cs = Math.cos(_a), sn = Math.sin(_a), h = _w * 0.5;
        return CForgePoly.Orient([[-h, -h], [h, -h], [h, h], [-h, h]].map(([x, z]) => [_cx + x * cs - z * sn, _cz + x * sn + z * cs]));
    }
    static WallHalf(_w) {
        let maxH = 0;
        for (const q of _w.curve)
            maxH = Math.max(maxH, q[2]);
        return (_w.thick + (CForgeIncaGen.Tiers(maxH) - 1) * CForgeIncaGen.sTierStep + CForgeIncaGen.sZigA * 0.5) * 0.5;
    }
    static Tower(_t, _g, _top, T) {
        if (T.mWallStyle == 1)
            return CForgeIncaGen.ColonialTower(_t, _g, T);
        const [cx, cz] = _t.c, r = _t.r, seg = Math.min(32, Math.max(14, Math.round(r * 7)));
        const body = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), under = new CForgeMeshBuf(), dark = new CForgeMeshBuf();
        CForgeTowerGen.Lathe(body, cx, cz, [[r * 1.08, _g - 1.0], [r * 1.05, _g], [r, _top]], seg);
        for (let k = 0; k < _t.floors; k++) {
            const y = _g + _t.height * (k + 0.35) / _t.floors, cnt = Math.max(3, Math.round(Math.PI * 2 * r / 2.2));
            for (let j = 0; j < cnt; j++) {
                const a = j / cnt * Math.PI * 2 + k * 0.5;
                if (_t.attach.some(_b => Math.abs(Math.atan2(Math.sin(a - _b), Math.cos(a - _b))) < 0.5) || (_t.door != null && Math.abs(Math.atan2(Math.sin(a - _t.door), Math.cos(a - _t.door))) < 0.5))
                    continue;
                CForgeIncaGen.TrapDecal(dark, cx, cz, r + 0.02, a, y, 0.5, 0.7);
            }
        }
        if (_t.door != null)
            CForgeIncaGen.TrapDecal(dark, cx, cz, r * 1.05 + 0.03, _t.door, _g, 1.0, 1.9);
        if (_t.flat) {
            CForgeTowerGen.Ring(body, cx, cz, r - 0.4, r, _top, _top + 0.9, seg, true);
            CForgeShape.Cap(body, Array.from({ length: seg }, (_v, _k) => [cx + Math.cos(_k / seg * Math.PI * 2) * (r - 0.38), cz + Math.sin(_k / seg * Math.PI * 2) * (r - 0.38)]), _top + 0.05);
        }
        else {
            const re = r + 0.5;
            CForgeTowerGen.Lathe(roof, cx, cz, [[re, _top - 0.15], [re * 0.5, _top - 0.15 + re * 0.6], [0, _top - 0.15 + re * 1.2]], seg);
            CForgeTowerGen.Lathe(roof, cx, cz, [[re + 0.02, _top - 0.4], [re, _top - 0.13]], seg);
            CForgeTowerGen.Soffit(under, cx, cz, r - 0.02, re, _top - 0.17, seg);
        }
        const parts = [{ buf: body, rgb: T.mTowerBody, tex: CForgeTex.sInca }, { buf: roof, rgb: T.mThatch[_t.seed % T.mThatch.length], tex: CForgeTex.sThatch },
            { buf: under, rgb: T.mThatch[0].map(_v => _v * 0.7), tex: CForgeTex.sThatch }, { buf: dark, rgb: T.mDark }];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static TowerTop(_t) { return _t.flat ? 0.9 : (_t.r + 0.5) * 1.2; }
    static TrapDecal(_b, _cx, _cz, _r, _a, _y0, _w, _h) {
        const P = (_u, _y) => { const a = _a + _u / _r; return [_cx + Math.cos(a) * _r, _y, _cz + Math.sin(a) * _r]; }, hw = _w * 0.5;
        _b.Quad([P(-hw, _y0), P(hw, _y0), P(hw * 0.74, _y0 + _h), P(-hw * 0.74, _y0 + _h)], [[0, 0], [1, 0], [1, 1], [0, 1]], [Math.cos(_a), 0, Math.sin(_a)]);
    }
    static TempleDim(_r, _g, F) {
        const { L, W } = _r, Lh = Math.max(6, L - 5.5), Wh = Math.min(W - 3.4, 6.5), y1 = F.floor + 0.7, y2 = y1 + 0.7, top = y2 + 3.4;
        return { Lh, Wh, y1, y2, top, ridge: top + Wh * 0.5 * CForgeIncaGen.sPitch + 0.5, ar: Math.min(W * 0.4, 3.2) };
    }
    static TempleHull(_r, _g, F) {
        const D = CForgeIncaGen.TempleDim(_r, _g, F), { L, W } = _r;
        return [[0, 0, L * 0.5, W * 0.5, F.base, D.y1], [0.4, 0, D.Lh * 0.5 + 0.4, D.Wh * 0.5 + 0.4, F.base, D.top], [0.4, 0, D.Lh * 0.5 + 0.6, D.Wh * 0.5 + 0.6, D.top - 0.3, D.ridge]];
    }
    static Temple(_r, _g, F) {
        const T = CForgeTheme.Of(_r), { L, W, fs, u } = _r, { P, V3, v, ang } = F, D = CForgeIncaGen.TempleDim(_r, _g, F), { Lh, Wh, y1, y2, top, ar } = D;
        const stone = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), under = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), gold = new CForgeMeshBuf();
        const ac = 0.4;
        CForgeIncaGen.Batter(stone, CForgeIncaGen.LocalRect(P, 0, 0, L, W), 0.25, F.base, y1);
        CForgeIncaGen.Batter(stone, CForgeIncaGen.LocalRect(P, 0, 0, L - 1.6, W - 1.6), 0.15, y1 - 0.05, y2);
        CForgeShape.Cap(stone, CForgeIncaGen.LocalRect(P, 0, 0, L - 1.6, W - 1.6), y2);
        const sw = 2.4, ns = Math.max(3, Math.ceil((y2 - F.floor + 0.2) / 0.22));
        for (let k = 0; k < ns; k++) {
            const b = fs * (W * 0.5 + 0.9 - k * (1.7 / ns)), q = P(0, b);
            CForgeShape.Box(stone, q[0], q[1], sw, 1.7 / ns + 0.02, F.base, F.floor - 0.2 + (y2 - F.floor + 0.2) * (k + 1) / ns, ang);
        }
        CForgeIncaGen.Batter(stone, CForgeIncaGen.LocalRect(P, ac, 0, Lh, Wh), 0.18, y2 - 0.05, top);
        const nd = Math.max(3, Math.min(7, Math.round(Lh / 2.6)));
        for (let k = 0; k < nd; k++) {
            const a = ac - Lh * 0.5 + Lh * (k + 0.5) / nd, q = P(a, fs * (Wh * 0.5 + 0.11));
            CForgeIncaGen.Niche(dark, stone, q[0], y2, q[1], u[0], u[1], v[0] * fs, v[1] * fs, 1.1, 2.3, true);
            const qb = P(a, -fs * (Wh * 0.5 + 0.11));
            CForgeIncaGen.Niche(dark, stone, qb[0], y2 + 1.0, qb[1], u[0], u[1], -v[0] * fs, -v[1] * fs, 0.5, 0.75, false);
        }
        CForgeShape.Extrude(gold, CForgePoly.Offset(CForgeIncaGen.LocalRect(P, ac, 0, Lh, Wh), 0.03), top - 0.55, top - 0.25);
        const W3 = (_a, _b, _y) => V3(_a, _b, _y);
        CForgeShape.GableRoof(roof, under, stone, W3, ac - Lh * 0.5, ac + Lh * 0.5, -Wh * 0.5, Wh * 0.5, top, CForgeIncaGen.sPitch, 0.55, 0.4, 0.34);
        const pts = [], cA = -L * 0.5 + 0.8 + ar;
        for (let k = 0; k <= 16; k++) {
            const t = Math.PI * 0.5 + Math.PI * k / 16, q = P(cA + Math.cos(t) * ar, Math.sin(t) * ar);
            pts.push([q[0], q[1], 0]);
        }
        const cv = new CForgeCurve(pts);
        CForgeShape.Band(stone, cv, cv.Steps(0, cv.mLen, 0.3), () => 0.45, () => y2 - 0.1, () => top - 0.6);
        CForgeShape.Band(gold, cv, cv.Steps(0, cv.mLen, 0.3), () => 0.47, () => top - 1.1, () => top - 0.9);
        const parts = [
            { buf: stone, rgb: T.mStone, tex: CForgeTex.sInca }, { buf: roof, rgb: T.mThatch[_r.seed % T.mThatch.length], tex: CForgeTex.sThatch },
            { buf: under, rgb: T.mThatch[0].map(_v => _v * 0.7), tex: CForgeTex.sThatch }, { buf: dark, rgb: T.mDark }, { buf: gold, rgb: T.mGold },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static LocalRect(P, _a, _b, _l, _w) {
        return CForgePoly.Orient([P(_a - _l * 0.5, _b - _w * 0.5), P(_a + _l * 0.5, _b - _w * 0.5), P(_a + _l * 0.5, _b + _w * 0.5), P(_a - _l * 0.5, _b + _w * 0.5)]);
    }
}
