import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeWallGen } from "./CForgeWallGen.js";
import { CForgeIncaGen } from "./CForgeIncaGen.js";
export class CForgeEgyptGen {
    static sBatter = 0.12;
    static Cornice(_b, _cx, _cz, _w, _d, _y, _a, _s = 1) {
        CForgeShape.Box(_b, _cx, _cz, _w + 0.1 * _s, _d + 0.1 * _s, _y - 0.18 * _s, _y - 0.04 * _s, _a);
        CForgeShape.Frustum(_b, _cx, _cz, _w + 0.02, _d + 0.02, _w + 0.7 * _s, _d + 0.7 * _s, _y - 0.04 * _s, _y + 0.55 * _s, _a);
        CForgeShape.Box(_b, _cx, _cz, _w + 0.7 * _s, _d + 0.7 * _s, _y + 0.55 * _s, _y + 0.65 * _s, _a);
    }
    static Pylon(B, _cx, _cz, _w, _d, _y0, _h, _a, _flag) {
        const k = CForgeEgyptGen.sBatter, w1 = _w - _h * k * 2, d1 = _d - _h * k * 2, cs = Math.cos(_a), sn = Math.sin(_a);
        CForgeShape.Frustum(B.body, _cx, _cz, _w, _d, w1, d1, _y0, _y0 + _h, _a);
        CForgeEgyptGen.Cornice(B.trim, _cx, _cz, w1, d1, _y0 + _h, _a, Math.min(1, Math.max(_w, _d) / 5));
        const P = (_x, _z, _y) => [_cx + _x * cs - _z * sn, _y, _cz + _x * sn + _z * cs];
        const wide = _w >= _d, fw0 = wide ? _w : _d, fw1 = wide ? w1 : d1, fd0 = wide ? _d : _w, fd1 = wide ? d1 : w1, ny = (fd0 - fd1) * 0.5 / _h;
        for (const sd of [-1, 1]) {
            const t0 = 0.12, t1 = 0.8, Q = (_t, _u) => { const hw = (fw0 + (fw1 - fw0) * _t) * 0.5 * _u, dz = ((fd0 + (fd1 - fd0) * _t) * 0.5 + 0.015) * sd, y = _y0 + _h * _t; return wide ? P(hw, dz, y) : P(dz, hw, y); };
            const n = wide ? [-sn * sd, ny, cs * sd] : [cs * sd, ny, sn * sd], hw0 = fw0 * 0.38, hw1 = (fw0 + (fw1 - fw0) * t1) * 0.38;
            B.relief.Quad([Q(t0, -0.76), Q(t0, 0.76), Q(t1, 0.76), Q(t1, -0.76)], [[-hw0, _h * t0], [hw0, _h * t0], [hw1, _h * t1], [-hw1, _h * t1]], n);
        }
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
            CForgeTowerGen.Strut(B.trim, P(a * (_w * 0.5 - 0.06), b * (_d * 0.5 - 0.06), _y0), P(a * (w1 * 0.5 - 0.06), b * (d1 * 0.5 - 0.06), _y0 + _h - 0.1), 0.2);
        if (!_flag)
            return;
        for (const s of [-0.24, 0.24]) {
            const p = P(s * _w, -_d * 0.5 - 0.3, 0), x = p[0], z = p[2], top = _y0 + _h + 3.5;
            CForgeTowerGen.Lathe(B.wood, x, z, [[0.13, _y0 - 0.2], [0.08, top]], 6);
            CForgeTowerGen.Lathe(B.gold, x, z, [[0.1, top], [0.02, top + 0.4]], 6);
            CForgeShape.Box(B.cloth, x + cs * 0.17, z + sn * 0.17, 0.22, 0.03, top - 2.6, top - 0.15, _a);
            CForgeShape.Box(B.cloth2, x - cs * 0.17, z - sn * 0.17, 0.18, 0.03, top - 2.0, top - 0.15, _a);
        }
    }
    static Bufs() {
        return { body: new CForgeMeshBuf(), trim: new CForgeMeshBuf(), dark: new CForgeMeshBuf(), wood: new CForgeMeshBuf(), cloth: new CForgeMeshBuf(), cloth2: new CForgeMeshBuf(), gold: new CForgeMeshBuf(),
            paint: new CForgeMeshBuf(), mud: new CForgeMeshBuf(), casing: new CForgeMeshBuf(), relief: new CForgeMeshBuf() };
    }
    static MudParts(B, T, _body, _trim) {
        const parts = [{ buf: B.body, rgb: _body, tex: CForgeTex.sMudBrick }, { buf: B.trim, rgb: _trim, tex: CForgeTex.sMudBrick }, { buf: B.dark, rgb: T.mDark }];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Parts(B, T, _stone) {
        const parts = [
            { buf: B.body, rgb: _stone, tex: CForgeTex.sAshlar }, { buf: B.trim, rgb: _stone.map(_v => Math.min(1, _v * 1.04)), tex: CForgeTex.sAshlar },
            { buf: B.mud, rgb: T.mWallBody, tex: CForgeTex.sMudBrick }, { buf: B.dark, rgb: T.mDark }, { buf: B.wood, rgb: T.mWood, tex: CForgeTex.sWood },
            { buf: B.cloth, rgb: [0.72, 0.2, 0.14] }, { buf: B.gold, rgb: T.mGold }, { buf: B.paint, rgb: [0.22, 0.42, 0.62], tex: CForgeTex.sAshlar },
            { buf: B.casing, rgb: _stone.map(_v => Math.min(1, _v * 1.05)), tex: CForgeTex.sPlaster }, { buf: B.cloth2, rgb: [0.92, 0.9, 0.84] },
            { buf: B.relief, rgb: _stone, tex: CForgeTex.sHiero },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Wall(_w, c, Gnd, Top, H, gates) {
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), out = _w.out, step = 0.5, B = CForgeEgyptGen.Bufs(), old = T.mWallStyle == 1;
        const Sink = (_s) => Gnd(_s) - 1.0;
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
        if (old) {
            for (const [a, b] of spans) {
                if (b - a < 0.05)
                    continue;
                const ss = c.Steps(a, b, step), o = { cap0: !(_w.closed && a <= 0), cap1: !(_w.closed && b >= L) };
                CForgeShape.Band(B.body, c, ss, () => half, Sink, Top, o);
                CForgeShape.Band(B.trim, c, ss, () => half + 0.08, _s => Top(_s) - 0.25, _s => Top(_s) + 0.05, o);
            }
            for (let s = 2.5; s < L - 1.2; s += 5) {
                if (InGate(s, 1.5))
                    continue;
                const p = c.At(s), ang = Math.atan2(p.tz, p.tx), lx = -p.tz * out, lz = p.tx * out;
                CForgeShape.Box(B.body, p.p[0] + lx * (half + 0.3), p.p[1] + lz * (half + 0.3), 2.2, 0.6, Sink(s), Top(s) - 0.01, ang);
                for (let k = -3; k <= 3; k++) {
                    const q = c.At(s + 2.5 + k * 0.32);
                    if (Math.abs(k) == 3 || InGate(s + 2.5 + k * 0.32, 0.5))
                        continue;
                    CForgeShape.Box(B.trim, q.p[0] + lx * (half + 0.06), q.p[1] + lz * (half + 0.06), 0.18, 0.12, Gnd(s) - 0.2, Top(s) - 0.6, ang);
                }
            }
            for (const q of gates) {
                const g = Gnd(q.s), lin = g + Math.min(H(q.s) - 0.6, Math.max(2.6, q.w * 1.1));
                CForgeShape.Band(B.body, c, c.Steps(q.a0 - 0.05, q.a1 + 0.05, 0.25), () => half + 0.05, () => lin, _s => Top(_s) + 0.05, { bottom: true, cap0: false, cap1: false });
                CForgeShape.Band(B.trim, c, c.Steps(q.a0 - 0.4, q.a1 + 0.4, 0.25), () => half + 0.15, () => lin - 0.05, () => lin + 0.4, { bottom: true });
            }
            return CForgeEgyptGen.MudParts(B, T, T.mWallBody, T.mWallCap);
        }
        const Wave = (_s) => Top(_s) + Math.sin(_s / 14 * Math.PI * 2) * Math.min(0.35, H(_s) * 0.06);
        const Spread = (_s) => (Wave(_s) - Sink(_s)) * CForgeEgyptGen.sBatter * 0.6;
        for (const [a, b] of spans) {
            if (b - a < 0.05)
                continue;
            const ss = c.Steps(a, b, step), cap0 = !(_w.closed && a <= 0), cap1 = !(_w.closed && b >= L);
            for (const sd of [1, -1])
                CForgeWallGen.Batter(B.mud, c, ss, half, sd, Sink, Wave, Spread, cap0, cap1);
            CForgeShape.Band(B.mud, c, ss, () => half * 0.8, Wave, _s => Wave(_s) + 0.18, { cap0, cap1 });
            CForgeShape.Band(B.mud, c, ss, () => half * 0.45, _s => Wave(_s) + 0.18, _s => Wave(_s) + 0.3, { cap0, cap1 });
        }
        for (const q of gates) {
            const a = c.At(q.s), ang = Math.atan2(a.tz, a.tx), g = Gnd(q.s), ph = H(q.s) + 3, pw = Math.max(3, q.w * 1.2), pd = _w.thick + 1.6;
            for (const sg of [-1, 1]) {
                const p = c.At(q.s + sg * (q.w * 0.5 + pw * 0.5));
                CForgeEgyptGen.Pylon(B, p.p[0], p.p[1], pw, pd, g - 0.8, ph + 0.8, Math.atan2(p.tz, p.tx), false);
            }
            const lin = g + Math.min(ph - 2.2, Math.max(3.0, q.w * 1.4)), gh = lin + 1.4;
            CForgeShape.Band(B.body, c, c.Steps(q.a0 - 0.1, q.a1 + 0.1, 0.25), () => pd * 0.42, () => lin, () => gh, { bottom: true, cap0: false, cap1: false });
            CForgeEgyptGen.Cornice(B.trim, a.p[0], a.p[1], q.w + 0.2, pd * 0.84, gh, ang, 0.6);
            for (const sd of [1, -1])
                CForgeShape.Decal(B.gold, a.p[0] - a.tz * sd * (pd * 0.42 + 0.01), lin + 0.65, a.p[1] + a.tx * sd * (pd * 0.42 + 0.01), a.tx, a.tz, -a.tz * sd, a.tx * sd, Math.min(q.w, 2.4), 0.35);
        }
        return CForgeEgyptGen.Parts(B, T, T.mStone);
    }
    static Tower(_t, _g, _top, T) {
        const [cx, cz] = _t.c, w = _t.r * 2, ang = _t.attach.length > 0 ? _t.attach[0] : 0, B = CForgeEgyptGen.Bufs();
        if (T.mWallStyle == 1) {
            CForgeShape.Box(B.body, cx, cz, w, w, _g - 1.0, _top, ang);
            for (const [fu, fv] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
                const nx = Math.cos(ang) * fu - Math.sin(ang) * fv, nz = Math.sin(ang) * fu + Math.cos(ang) * fv, n = Math.max(2, Math.round(w / 0.5));
                for (let k = 1; k < n; k++) {
                    const t = -w * 0.5 + w * k / n;
                    CForgeShape.Box(B.trim, cx + nx * (w * 0.5 + 0.05) - nz * t, cz + nz * (w * 0.5 + 0.05) + nx * t, 0.16, 0.1, _g, _top - 0.6, Math.atan2(nz, nx) + Math.PI * 0.5);
                }
            }
            CForgeShape.Box(B.trim, cx, cz, w + 0.25, w + 0.25, _top - 0.25, _top + 0.1, ang);
            return CForgeEgyptGen.MudParts(B, T, T.mTowerBody, T.mWallCap);
        }
        CForgeEgyptGen.Pylon(B, cx, cz, w * 1.2, w, _g - 1.0, _top - _g + 1.0, ang, false);
        for (let k = 0; k < _t.floors; k++) {
            const y = _g + _t.height * (k + 0.5) / _t.floors;
            for (const s of [1, -1]) {
                const nx = -Math.sin(ang) * s, nz = Math.cos(ang) * s, d = w * 0.5 - (y - _g) * CForgeEgyptGen.sBatter + 0.03;
                CForgeShape.Decal(B.dark, cx + nx * d, y, cz + nz * d, Math.cos(ang), Math.sin(ang), nx, nz, 0.5, 0.8);
            }
        }
        return CForgeEgyptGen.Parts(B, T, T.mTowerBody);
    }
    static Column(_b, _paint, _x, _z, _r, _y0, _y1) {
        const h = _y1 - _y0;
        CForgeTowerGen.Lathe(_b, _x, _z, [[_r * 1.35, _y0], [_r * 1.35, _y0 + 0.2], [_r * 1.05, _y0 + 0.3], [_r * 0.9, _y0 + h * 0.78], [_r * 1.1, _y0 + h * 0.86], [_r * 0.95, _y0 + h * 0.95], [_r * 0.7, _y1 - 0.25]], 12);
        CForgeShape.Box(_b, _x, _z, _r * 1.5, _r * 1.5, _y1 - 0.25, _y1, 0);
        for (const f of [0.74, 0.76, 0.78])
            CForgeTowerGen.Ring(_paint, _x, _z, _r * 0.85, _r * 0.93, _y0 + h * f, _y0 + h * f + 0.06, 12);
    }
    static TempleDim(_r, F) {
        const { L, W } = _r, T = CForgeTheme.Of(_r);
        if (T.mTemple == 1) {
            const B = Math.min(W * 1.15, L * 0.62);
            return { B, ph: B * 0.64, pa: -L * 0.5 + B * 0.5 + 0.2, Hp: 0, Hh: 4.2, gw: 0, tw: 0 };
        }
        const gw = Math.min(3.2, W * 0.24), tw = (W - gw) * 0.5, Hp = Math.min(15, Math.max(5, tw * 1.05)), pd = Math.min(3.4, L * 0.16);
        return { B: 0, ph: 0, pa: 0, Hp, pd, Hh: Math.max(3.8, Hp * 0.7), gw, tw };
    }
    static TempleHull(_r, F) {
        const D = CForgeEgyptGen.TempleDim(_r, F), { L, W } = _r, f = F.floor;
        if (CForgeTheme.Of(_r).mTemple == 1)
            return [[D.pa, 0, D.B * 0.5, D.B * 0.5, F.base, f + D.ph * 0.35], [D.pa, 0, D.B * 0.32, D.B * 0.32, f + D.ph * 0.35, f + D.ph * 0.66], [D.pa, 0, D.B * 0.15, D.B * 0.15, f + D.ph * 0.66, f + D.ph],
                [(D.pa + D.B * 0.5 + L * 0.5) * 0.5, 0, (L * 0.5 - D.pa - D.B * 0.5) * 0.5, W * 0.3, F.base, f + D.Hh]];
        const pd = D.pd ?? 3;
        return [[L * 0.5 - pd * 0.5, 0, pd * 0.5, W * 0.5, F.base, f + D.Hp + 0.6], [-L * 0.1, 0, L * 0.4, W * 0.5 - 0.4, F.base, f + D.Hh + 0.6]];
    }
    static Temple(_r, F) {
        const T = CForgeTheme.Of(_r);
        return T.mTemple == 1 ? CForgeEgyptGen.Pyramid(_r, F, T) : CForgeEgyptGen.NewTemple(_r, F, T);
    }
    static NewTemple(_r, F, T) {
        const { L, W, u } = _r, { P, floor, base, ang } = F, D = CForgeEgyptGen.TempleDim(_r, F), B = CForgeEgyptGen.Bufs(), Hp = D.Hp, pd = D.pd;
        const gw = D.gw, tw = D.tw, pa = L * 0.5 - pd * 0.5;
        CForgeShape.Box(B.body, P(0, 0)[0], P(0, 0)[1], L, W, base, floor + 0.25, ang);
        for (const s of [-1, 1]) {
            const q = P(pa, s * (gw * 0.5 + tw * 0.5));
            CForgeEgyptGen.Pylon(B, q[0], q[1], pd, tw, floor, Hp, ang, false);
            for (const f of [-0.25, 0.25]) {
                const v0 = s * (gw * 0.5 + tw * (0.5 + f)), fq = P(L * 0.5 + 0.3, v0), top = floor + Hp + 3, va = P(L * 0.5 + 0.3, v0 + 0.17), vb = P(L * 0.5 + 0.3, v0 - 0.17);
                CForgeTowerGen.Lathe(B.wood, fq[0], fq[1], [[0.14, base], [0.08, top]], 6);
                CForgeTowerGen.Lathe(B.gold, fq[0], fq[1], [[0.1, top], [0.02, top + 0.4]], 6);
                CForgeShape.Box(B.cloth, va[0], va[1], 0.22, 0.03, top - 2.6, top - 0.15, ang + Math.PI * 0.5);
                CForgeShape.Box(B.cloth2, vb[0], vb[1], 0.18, 0.03, top - 2.0, top - 0.15, ang + Math.PI * 0.5);
            }
        }
        const gq = P(pa, 0), gh = Hp * 0.62;
        CForgeShape.Box(B.body, gq[0], gq[1], pd * 0.8, gw + 0.4, floor, floor + gh, ang);
        CForgeEgyptGen.Cornice(B.trim, gq[0], gq[1], pd * 0.8, gw + 0.4, floor + gh, ang, 0.6);
        const dq = P(L * 0.5 - pd * 0.1 + 0.02, 0);
        CForgeShape.Decal(B.dark, dq[0], floor + gh * 0.36, dq[1], -u[1], u[0], u[0], u[1], gw * 0.55, gh * 0.72);
        CForgeShape.Decal(B.gold, dq[0] + u[0] * 0.02, floor + gh * 0.82, dq[1] + u[1] * 0.02, -u[1], u[0], u[0], u[1], gw * 0.8, 0.4);
        const cl = Math.max(4, (L - pd) * 0.4), ca0 = pa - pd * 0.5 - cl, wh = Hp * 0.42;
        for (const s of [-1, 1]) {
            const q = P(ca0 + cl * 0.5, s * (W * 0.5 - 0.4));
            CForgeShape.Box(B.body, q[0], q[1], cl, 0.8, floor, floor + wh, ang);
            CForgeShape.Box(B.trim, q[0], q[1], cl, 1.0, floor + wh, floor + wh + 0.3, ang);
            CForgeShape.Box(B.relief, q[0], q[1], cl - 0.3, 0.84, floor + 0.5, floor + wh - 0.4, ang);
            const nc = Math.max(2, Math.round(cl / 2.2));
            for (let k = 0; k < nc; k++) {
                const cq = P(ca0 + cl * (k + 0.5) / nc, s * (W * 0.5 - 2.0));
                CForgeEgyptGen.Column(B.body, B.paint, cq[0], cq[1], 0.42, floor + 0.25, floor + wh);
            }
        }
        const hl = Math.max(3.5, (L - pd - cl) * 0.6), ha = ca0 - hl * 0.5, Hh = D.Hh;
        const hq = P(ha, 0);
        CForgeShape.Box(B.body, hq[0], hq[1], hl, W - 0.8, floor, floor + Hh, ang);
        CForgeEgyptGen.Cornice(B.trim, hq[0], hq[1], hl, W - 0.8, floor + Hh, ang, 0.7);
        CForgeShape.Extrude(B.paint, CForgePoly.Offset(CForgeIncaGen.LocalRect(P, ha, 0, hl, W - 0.8), 0.02), floor + Hh - 1.4, floor + Hh - 1.0);
        CForgeShape.Extrude(B.relief, CForgePoly.Offset(CForgeIncaGen.LocalRect(P, ha, 0, hl, W - 0.8), 0.02), floor + 0.5, floor + Hh - 1.55);
        const nf = Math.max(3, Math.round((W - 2) / 2.2));
        for (let k = 0; k < nf; k++) {
            const b = -(W - 2) * 0.5 + (W - 2) * (k + 0.5) / nf, cq = P(ha + hl * 0.5 + 0.7, b);
            CForgeEgyptGen.Column(B.body, B.paint, cq[0], cq[1], 0.5, floor + 0.25, floor + Hh - 0.05);
        }
        CForgeShape.Box(B.trim, P(ha + hl * 0.5 + 0.7, 0)[0], P(ha + hl * 0.5 + 0.7, 0)[1], 1.3, W - 1.2, floor + Hh - 0.6, floor + Hh, ang);
        const sl = Math.max(2, L * 0.5 + ha - hl * 0.5 - 0.3), sq = P(ha - hl * 0.5 - sl * 0.5, 0);
        if (sl > 1.5) {
            CForgeShape.Box(B.body, sq[0], sq[1], sl, W * 0.6, floor, floor + Hh * 0.75, ang);
            CForgeShape.Extrude(B.relief, CForgePoly.Offset(CForgeIncaGen.LocalRect(P, ha - hl * 0.5 - sl * 0.5, 0, sl, W * 0.6), 0.02), floor + 0.5, floor + Hh * 0.75 - 0.7);
            CForgeEgyptGen.Cornice(B.trim, sq[0], sq[1], sl, W * 0.6, floor + Hh * 0.75, ang, 0.5);
        }
        return CForgeEgyptGen.Parts(B, T, T.mStone);
    }
    static Pyramid(_r, F, T) {
        const { L, W } = _r, { P, floor, base, ang } = F, D = CForgeEgyptGen.TempleDim(_r, F), B = CForgeEgyptGen.Bufs(), b = D.B, ph = D.ph, c = P(D.pa, 0);
        CForgeShape.Box(B.trim, c[0], c[1], b + 1.2, b + 1.2, base, floor + 0.2, ang);
        CForgeShape.Frustum(B.casing, c[0], c[1], b, b, b * 0.06, b * 0.06, floor + 0.2, floor + ph * 0.94, ang);
        CForgeShape.Frustum(B.gold, c[0], c[1], b * 0.06 + 0.01, b * 0.06 + 0.01, 0, 0, floor + ph * 0.94 - 0.01, floor + ph, ang);
        const ta = D.pa + b * 0.5 + 0.4, tl = L * 0.5 - ta - 0.2;
        if (tl > 2) {
            const tq = P(ta + tl * 0.5, 0), tw = Math.min(W * 0.75, b * 0.8), h = D.Hh;
            CForgeShape.Frustum(B.body, tq[0], tq[1], tl, tw, tl - 0.4, tw - 0.4, floor, floor + h, ang);
            CForgeShape.Box(B.trim, tq[0], tq[1], tl - 0.2, tw - 0.2, floor + h - 0.05, floor + h + 0.25, ang);
            const n = Math.max(2, Math.round(tw / 1.8));
            for (let k = 0; k < n; k++) {
                const q = P(ta + tl + 0.2, -tw * 0.5 + tw * (k + 0.5) / n);
                CForgeShape.Box(B.trim, q[0], q[1], 0.6, 0.6, floor, floor + h - 0.05, ang);
            }
            const dq = P(ta + tl - 0.18, 0);
            CForgeShape.Decal(B.dark, dq[0], floor + 1.3, dq[1], -Math.sin(ang), Math.cos(ang), Math.cos(ang), Math.sin(ang), 1.2, 2.4);
        }
        return CForgeEgyptGen.Parts(B, T, T.mStone);
    }
}
