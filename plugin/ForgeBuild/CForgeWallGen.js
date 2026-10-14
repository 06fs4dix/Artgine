import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeCurve } from "./CForgeSpline.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeOpening } from "./CForgeOpening.js";
import { CForgePavilionGen } from "./CForgePavilionGen.js";
import { CForgeYaguraGen } from "./CForgeYaguraGen.js";
import { CForgeGiwaGen } from "./CForgeGiwaGen.js";
import { CForgeChineseHallGen } from "./CForgeChineseHallGen.js";
import { CForgeArabGen } from "./CForgeArabGen.js";
import { CForgeEgyptGen } from "./CForgeEgyptGen.js";
import { CForgeIncaGen } from "./CForgeIncaGen.js";
import { CForgeAfricaGen } from "./CForgeAfricaGen.js";
import { CForgeMongolGen } from "./CForgeMongolGen.js";
export class CForgeWallGen {
    static sSink = 1.0;
    static sCrenelH = 5;
    static sCrenelBlend = 0.4;
    static Smooth(_a, _b, _x) { const t = Math.min(1, Math.max(0, (_x - _a) / (_b - _a))); return t * t * (3 - 2 * t); }
    static sButtressH = 4.2;
    static sSlitH = 4.5;
    static sArchH = 2.4;
    static sMerlon = 0.8;
    static sMerlonGap = 0.55;
    static sMerlonH = 0.75;
    static sButtressStep = 7;
    static sSlitStep = 4.5;
    static sPlaster = [0.93, 0.88, 0.78];
    static sStone = [0.66, 0.62, 0.56];
    static sCap = [0.8, 0.76, 0.69];
    static sDark = [0.2, 0.17, 0.14];
    static Build(_w, _g) {
        const c = new CForgeCurve(_w.curve), L = c.mLen;
        if (L < 0.2)
            return [];
        const half = _w.thick * 0.5, seed = _w.seed % 100003;
        const body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), dark = new CForgeMeshBuf();
        const memo = new Map();
        const Info = (_s) => {
            let v = memo.get(_s);
            if (v == null) {
                const a = c.At(_s), nx = -a.tz * half, nz = a.tx * half;
                const gp = a.p.length > 3 ? a.p[3] : null;
                const g0 = gp ?? _g(a.p[0] + nx, a.p[1] + nz), g1 = gp ?? _g(a.p[0] - nx, a.p[1] - nz);
                v = [Math.min(g0, g1), Math.max(g0, g1) + a.p[2], a.p[2]];
                memo.set(_s, v);
            }
            return v;
        };
        const Gnd = (_s) => Info(_s)[0];
        const Top = (_s) => Info(_s)[1];
        const H = (_s) => Info(_s)[2];
        const N = (_s, _k) => CForgeRand.Noise(_s * _k, 0.5, seed);
        const st = _w.style ?? 0, none = st == 1 || st == 3;
        const crenH = none ? Infinity : st == 2 ? 3.5 : CForgeWallGen.sCrenelH, buttH = none ? Infinity : st == 2 ? 3.2 : CForgeWallGen.sButtressH, slitH = none ? Infinity : st == 2 ? 3.4 : CForgeWallGen.sSlitH;
        const ks = Math.min(1.2, Math.max(0.55, _w.thick / 1.2)), T = CForgeTheme.Of(_w);
        const gates = _w.gates.map(_q => ({ ..._q, a0: _q.s - _q.w * 0.5, a1: _q.s + _q.w * 0.5, arch: H(_q.s) >= CForgeWallGen.sArchH }));
        const InGate = (_s, _pad = 0) => gates.find(_q => _s > _q.a0 - _pad && _s < _q.a1 + _pad);
        const lands = (_w.lands ?? []).map(_q => ({ a0: _q.s - _q.w * 0.5, a1: _q.s + _q.w * 0.5 }));
        if (st == 4 || (st == 0 && T.mWallKind == 1))
            return CForgeWallGen.Palisade(_w, c, Gnd, Top, H, gates, InGate, seed);
        const C = CForgeTheme.eCulture;
        if (T.mCulture == C.Arab)
            return CForgeArabGen.Wall(_w, c, Gnd, Top, H, gates);
        if (T.mCulture == C.Egypt)
            return CForgeEgyptGen.Wall(_w, c, Gnd, Top, H, gates);
        if (T.mCulture == C.Andes)
            return CForgeIncaGen.Wall(_w, c, Gnd, Top, H, gates, seed, _g);
        if (T.mCulture == C.Africa)
            return CForgeAfricaGen.Wall(_w, c, Gnd, Top, H, gates);
        if (T.mCulture == C.Mongol)
            return CForgeMongolGen.Wall(_w, c, Gnd, Top, H, gates);
        if (T.mCulture == CForgeTheme.eCulture.Japan)
            return CForgeWallGen.Japanese(_w, c, Gnd, Top, H, gates, lands, seed, _g);
        if (T.mCulture == CForgeTheme.eCulture.China)
            return CForgeWallGen.Chinese(_w, c, Gnd, Top, H, gates, lands, seed, _g);
        if (T.East())
            return CForgeWallGen.Korean(_w, c, Gnd, Top, H, gates, lands, seed, _g);
        if (T.mWallStyle == 2)
            return CForgeWallGen.Bastion(_w, c, Gnd, Top, H, gates, lands, seed, _g);
        if (T.mWallStyle == 3)
            return CForgeWallGen.Garden(_w, c, Gnd, H, gates, seed);
        const spans = [];
        let s0 = 0;
        for (const q of gates) {
            if (q.a0 > s0)
                spans.push([s0, q.a0]);
            s0 = Math.max(s0, q.a1);
        }
        if (s0 < L)
            spans.push([s0, L]);
        const step = 0.5;
        for (const [a, b] of spans) {
            const seam0 = _w.closed && a <= 0, seam1 = _w.closed && b >= L;
            const ss = c.Steps(a, b, step);
            CForgeShape.Band(body, c, ss, () => half, _s => Gnd(_s) - CForgeWallGen.sSink, Top, { cap0: !seam0, cap1: !seam1 });
            CForgeShape.Band(stone, c, ss, () => half + 0.13, _s => Gnd(_s) - CForgeWallGen.sSink, _s => Gnd(_s) + Math.min(0.5 + 0.3 * N(_s, 0.35), H(_s) * 0.3), { cap0: !seam0, cap1: !seam1 });
        }
        for (const q of gates) {
            if (q.arch)
                CForgeWallGen.Arch(body, stone, c, q, half, Gnd, Top, H);
            else {
                for (const s of [q.a0, q.a1]) {
                    const a = c.At(s), side = s == q.a0 ? -1 : 1, px = a.p[0] + a.tx * side * half * 0.4, pz = a.p[1] + a.tz * side * half * 0.4;
                    const ang = Math.atan2(a.tz, a.tx), w = _w.thick * 1.3, top = Top(s) + 0.35;
                    CForgeShape.Box(stone, px, pz, w, w, Gnd(s) - 0.3, top, ang);
                    CForgeShape.Box(cap, px, pz, w + 0.16, w + 0.16, top, top + 0.14, ang);
                }
            }
        }
        const runs = [];
        for (const s of c.Steps(0, L, step)) {
            const g = InGate(s);
            if (g != null && !g.arch)
                continue;
            const cren = H(s) >= crenH - CForgeWallGen.sCrenelBlend, r = runs[runs.length - 1];
            if (r != null && r.cren == cren && s - r.b < step * 1.5)
                r.b = s;
            else
                runs.push({ a: s, b: s, cren });
        }
        for (const r of runs) {
            if (r.b - r.a < 0.05)
                continue;
            if (!r.cren) {
                const ch = st == 3 ? 0.22 : 0.2 * ks;
                CForgeShape.Band(cap, c, c.Steps(r.a, r.b, step), () => half + 0.09 * ks, _s => Top(_s) - ch * 0.7, _s => Top(_s) + ch * 0.3);
                if (st == 3)
                    CForgeShape.Band(cap, c, c.Steps(r.a, r.b, step), () => half * 0.6, _s => Top(_s) + ch * 0.3, _s => Top(_s) + ch * 0.3 + half * 0.35);
                continue;
            }
            CForgeShape.Band(cap, c, c.Steps(r.a, r.b, step), () => half + 0.06, _s => Top(_s) - 0.1, _s => Top(_s) + 0.02);
            const walk = _w.thick >= 0.7, sh = walk ? _w.out * half * 0.55 : 0, mw = walk ? half * 0.42 : half * 0.92;
            const F = (_s) => CForgeWallGen.Smooth(crenH - CForgeWallGen.sCrenelBlend, crenH + CForgeWallGen.sCrenelBlend, H(_s));
            const ML = CForgeWallGen.sMerlon * ks, P = ML + CForgeWallGen.sMerlonGap * ks;
            for (let k = Math.ceil(r.a / P); k * P + ML <= r.b; k++) {
                const m0 = k * P, m1 = m0 + ML, f = F((m0 + m1) * 0.5);
                if (f < 0.05)
                    continue;
                const mh = (CForgeWallGen.sMerlonH * ks + 0.1 * (N(m0, 1.7) - 0.5)) * f;
                if (T.mWallStyle == 1) {
                    CForgeShape.Band(body, c, c.Steps(m0, m1, step), () => mw, _s => Top(_s), _s => Top(_s) + mh * 0.8, {}, () => sh);
                    for (const [h0, h1] of [[m0, m0 + ML * 0.38], [m1 - ML * 0.38, m1]])
                        CForgeShape.Band(body, c, c.Steps(h0, h1, step), () => mw, _s => Top(_s) + mh * 0.8, _s => Top(_s) + mh * 1.35, {}, () => sh);
                }
                else
                    CForgeShape.Band(body, c, c.Steps(m0, m1, step), () => mw, _s => Top(_s), _s => Top(_s) + mh, {}, () => sh);
            }
            if (!walk)
                continue;
            let a = r.a;
            for (const q of [...lands].sort((_x, _y) => _x.a0 - _y.a0)) {
                if (q.a1 <= a || q.a0 >= r.b)
                    continue;
                if (q.a0 - a > 0.05)
                    CForgeShape.Band(cap, c, c.Steps(a, q.a0, step), () => half * 0.12, _s => Top(_s), _s => Top(_s) + 0.3 * F(_s), {}, () => -_w.out * half * 0.86);
                a = Math.max(a, q.a1);
            }
            if (r.b - a > 0.05)
                CForgeShape.Band(cap, c, c.Steps(a, r.b, step), () => half * 0.12, _s => Top(_s), _s => Top(_s) + 0.3 * F(_s), {}, () => -_w.out * half * 0.86);
        }
        const out = _w.out;
        const nearEnd = (_s) => !_w.closed && (_s < 2 || _s > L - 2);
        const buttress = [];
        for (let s = CForgeWallGen.sButtressStep * 0.5; s < L; s += CForgeWallGen.sButtressStep) {
            if (H(s) < buttH || InGate(s, 1.5) || nearEnd(s))
                continue;
            const a = c.At(s), nx = -a.tz * out, nz = a.tx * out, g = Gnd(s);
            CForgeShape.Wedge(stone, a.p[0] + nx * half, a.p[1] + nz * half, a.tx, a.tz, nx, nz, 0.9, 0.45 + H(s) * 0.06, 0.12, g - 0.3, g + H(s) * 0.7);
            buttress.push(s);
        }
        for (let s = CForgeWallGen.sSlitStep * 0.5 + 1.1; s < L; s += CForgeWallGen.sSlitStep) {
            if (H(s) < slitH || InGate(s, 1) || nearEnd(s) || buttress.some(_b => Math.abs(_b - s) < 1))
                continue;
            const a = c.At(s), nx = -a.tz * out, nz = a.tx * out;
            CForgeOpening.Slit({ stone, fill: dark, dark }, a.p[0] + nx * half, Gnd(s) + H(s) * 0.55, a.p[1] + nz * half, a.tx, a.tz, nx, nz, 0.16, 0.9);
        }
        const green = new CForgeMeshBuf();
        for (let k = 0; k * 3.5 < L; k++) {
            const hk = CForgeRand.Hash(seed, k, 31);
            if (hk % 100 > 38)
                continue;
            const s = k * 3.5 + (hk % 17) / 17 * 2.5;
            if (s > L || InGate(s, 1.2) || nearEnd(s) || lands.some(_q => s > _q.a0 - 7 && s < _q.a1 + 7))
                continue;
            const a = c.At(s), side = (hk >>> 8) & 1 ? 1 : -1, br = 0.45 + ((hk >>> 10) % 50) / 100;
            const nx = -a.tz * side, nz = a.tx * side, x = a.p[0] + nx * (half + 0.15 + br * 0.6), z = a.p[1] + nz * (half + 0.15 + br * 0.6);
            CForgeShape.Bush(green, x, _g(x, z) - 0.1, z, br, br * 0.9);
        }
        if (!_w.closed) {
            for (const [k, s] of [[0, 0], [1, L]]) {
                if (_w.endTower[k] > 0)
                    continue;
                const a = c.At(s), ang = Math.atan2(a.tz, a.tx), w = _w.thick * 1.35, top = Top(s) + 0.4;
                CForgeShape.Box(stone, a.p[0], a.p[1], w, w, Gnd(s) - 0.4, top, ang);
                CForgeShape.Box(cap, a.p[0], a.p[1], w + 0.18, w + 0.18, top, top + 0.16, ang);
            }
        }
        const parts = [
            { buf: body, rgb: T.mWallBody, tex: CForgeTex.sStone }, { buf: stone, rgb: T.mWallStone, tex: CForgeTex.sStone },
            { buf: cap, rgb: T.mWallCap, tex: CForgeTex.sStone }, { buf: dark, rgb: T.mDark }, { buf: green, rgb: T.mGreen },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Korean(_w, c, Gnd, Top, H, gates, lands, seed, _g) {
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), st = _w.style ?? 0, out = _w.out, step = 0.5;
        const body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), green = new CForgeMeshBuf(), PB = CForgePavilionGen.Bufs();
        const paraH = st == 1 || st == 3 ? Infinity : st == 2 ? 2.2 : 2.8, ext = 1.6, halfG = Math.max(half + 0.5, 1.8);
        const Z0 = (_q) => Math.max(0, _q.a0 - (_q.arch ? ext : 0)), Z1 = (_q) => Math.min(L, _q.a1 + (_q.arch ? ext : 0));
        const Sink = (_s) => Gnd(_s) - CForgeWallGen.sSink;
        const rammed = T.mWallStyle == 1, Spread = (_s) => (Top(_s) - Sink(_s)) * 0.14, timber = new CForgeMeshBuf();
        const spans = [];
        let s0 = 0;
        for (const q of gates) {
            if (Z0(q) > s0)
                spans.push([s0, Z0(q)]);
            s0 = Math.max(s0, Z1(q));
        }
        if (s0 < L)
            spans.push([s0, L]);
        for (const [a, b] of spans) {
            const o = { cap0: !(_w.closed && a <= 0), cap1: !(_w.closed && b >= L) }, ss = c.Steps(a, b, step);
            if (rammed) {
                for (const sd of [1, -1])
                    CForgeWallGen.Batter(body, c, ss, half, sd, Sink, Top, Spread, o.cap0, o.cap1);
                CForgeShape.Band(stone, c, ss, _s => half + Spread(_s) * 0.92 + 0.12, Sink, _s => Gnd(_s) + Math.min(0.55, H(_s) * 0.2), o);
                continue;
            }
            CForgeShape.Band(body, c, ss, () => half, Sink, Top, o);
            CForgeShape.Band(stone, c, ss, () => half + 0.1, Sink, _s => Gnd(_s) + Math.min(0.6, H(_s) * 0.25), o);
        }
        for (const q of gates) {
            if (!q.arch) {
                for (const s of [q.a0, q.a1]) {
                    const a = c.At(s), side = s == q.a0 ? -1 : 1, px = a.p[0] + a.tx * side * half * 0.4, pz = a.p[1] + a.tz * side * half * 0.4;
                    const ang = Math.atan2(a.tz, a.tx), w = _w.thick * 1.3, top = Top(s) + 0.35;
                    CForgeShape.Box(body, px, pz, w, w, Gnd(s) - 0.3, top, ang);
                    CForgeShape.Box(cap, px, pz, w + 0.2, w + 0.2, top, top + 0.12, ang);
                    CForgeShape.Box(cap, px, pz, w * 0.5, w + 0.1, top + 0.12, top + 0.26, ang);
                }
                continue;
            }
            const z0 = Z0(q), z1 = Z1(q), TopG = (_s) => Top(_s) + 0.02;
            for (const [a, b] of [[z0, q.a0], [q.a1, z1]])
                if (b - a > 0.05)
                    CForgeShape.Band(body, c, c.Steps(a, b, step), () => halfG, Sink, TopG);
            if (rammed)
                CForgeWallGen.TimberGate(body, timber, c, q, halfG, Gnd, H, TopG);
            else
                CForgeWallGen.Arch(body, stone, c, q, halfG, Gnd, TopG, H);
            const a = c.At(q.s), y0 = Math.max(Top(z0), Top(q.s), Top(z1)) + 0.2;
            CForgePavilionGen.Build(PB, a.p[0], a.p[1], a.tx, a.tz, Math.max(3, z1 - z0 - 0.8), halfG * 2 - 0.5, y0, 2.5, true);
        }
        const runs = [];
        for (const s of c.Steps(0, L, step)) {
            if (gates.some(_q => s > Z0(_q) - 1e-3 && s < Z1(_q) + 1e-3))
                continue;
            const para = H(s) >= paraH, r = runs[runs.length - 1];
            if (r != null && r.para == para && s - r.b < step * 1.5)
                r.b = s;
            else
                runs.push({ a: s, b: s, para });
        }
        const walk = _w.thick >= 0.7, pw = walk ? Math.min(half * 0.5, 0.45) : half * 0.92, sh = walk ? out * (half - pw) : 0;
        const ph = 1.3, low = 0.45, seg = 3.2, gap = 0.32;
        for (const r of runs) {
            if (r.b - r.a < 0.05)
                continue;
            const ss = c.Steps(r.a, r.b, step);
            if (!r.para) {
                CForgeWallGen.TileCap(cap, c, ss, half, Top);
                continue;
            }
            if (rammed) {
                CForgeShape.Band(body, c, ss, () => pw, Top, _s => Top(_s) + 1.0, {}, () => sh);
                CForgeWallGen.TileCap(cap, c, ss, pw, _s => Top(_s) + 1.0, () => sh);
                continue;
            }
            CForgeShape.Band(stone, c, ss, () => half + 0.12, _s => Top(_s) - 0.16, _s => Top(_s) + 0.02);
            CForgeShape.Band(body, c, ss, () => pw, Top, _s => Top(_s) + low, {}, () => sh);
            for (let k = Math.floor(r.a / seg); k * seg < r.b; k++) {
                const m0 = Math.max(r.a, k * seg + gap * 0.5), m1 = Math.min(r.b, (k + 1) * seg - gap * 0.5);
                if (m1 - m0 < 0.5)
                    continue;
                const ms = c.Steps(m0, m1, step);
                CForgeShape.Band(body, c, ms, () => pw, _s => Top(_s) + low, _s => Top(_s) + ph, {}, () => sh);
                CForgeShape.Band(cap, c, ms, () => pw + 0.1, _s => Top(_s) + ph, _s => Top(_s) + ph + 0.1, {}, () => sh);
                CForgeShape.Band(cap, c, ms, () => pw * 0.45, _s => Top(_s) + ph + 0.1, _s => Top(_s) + ph + 0.2, {}, () => sh);
                for (const [f, y, hw, hh] of [[0.28, 0.95, 0.16, 0.22], [0.72, 0.95, 0.16, 0.22], [0.5, 0.25, 0.22, 0.16]]) {
                    if (m1 - m0 < 1.4 && f != 0.5)
                        continue;
                    const s = m0 + (m1 - m0) * f, a = c.At(s), lx = -a.tz, lz = a.tx;
                    for (const side of [1, -1]) {
                        const off = sh + side * out * pw, nx = lx * side * out, nz = lz * side * out;
                        CForgeShape.Decal(dark, a.p[0] + lx * off, Top(s) + y, a.p[1] + lz * off, a.tx, a.tz, nx, nz, hw, hh);
                    }
                }
            }
        }
        for (let k = 0; k * 3.5 < L; k++) {
            const hk = CForgeRand.Hash(seed, k, 31);
            if (hk % 100 > 38)
                continue;
            const s = k * 3.5 + (hk % 17) / 17 * 2.5;
            if (s > L || gates.some(_q => s > Z0(_q) - 1.2 && s < Z1(_q) + 1.2) || lands.some(_q => s > _q.a0 - 7 && s < _q.a1 + 7))
                continue;
            const a = c.At(s), side = (hk >>> 8) & 1 ? 1 : -1, br = 0.45 + ((hk >>> 10) % 50) / 100;
            const nx = -a.tz * side, nz = a.tx * side, x = a.p[0] + nx * (half + 0.15 + br * 0.6), z = a.p[1] + nz * (half + 0.15 + br * 0.6);
            CForgeShape.Bush(green, x, _g(x, z) - 0.1, z, br, br * 0.9);
        }
        if (!_w.closed)
            for (const [k, s] of [[0, 0], [1, L]]) {
                if (_w.endTower[k] > 0)
                    continue;
                const a = c.At(s), ang = Math.atan2(a.tz, a.tx), w = _w.thick * 1.35, top = Top(s) + 0.4;
                CForgeShape.Box(body, a.p[0], a.p[1], w, w, Gnd(s) - 0.4, top, ang);
                CForgeShape.Box(cap, a.p[0], a.p[1], w + 0.2, w + 0.2, top, top + 0.14, ang);
            }
        const parts = [
            { buf: body, rgb: T.mWallBody, tex: rammed ? CForgeTex.sHangtu : CForgeTex.sSeongdol }, { buf: stone, rgb: T.mWallStone, tex: rammed ? CForgeTex.sStone : CForgeTex.sSeongdol },
            { buf: cap, rgb: T.mWallCap, tex: CForgeTex.sGiwa }, { buf: timber, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: dark, rgb: T.mDark }, { buf: green, rgb: T.mGreen },
            ...CForgePavilionGen.Parts(PB, T, seed),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Chinese(_w, c, Gnd, Top, H, gates, lands, seed, _g) {
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), st = _w.style ?? 0, out = _w.out, step = 0.5;
        const body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), tile = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), green = new CForgeMeshBuf(), HB = CForgeChineseHallGen.Bufs();
        const paraH = st == 1 || st == 3 ? Infinity : st == 2 ? 2.2 : 2.6, ext = 1.8, halfG = Math.max(half + 0.6, 2.6);
        const Z0 = (_q) => Math.max(0, _q.a0 - (_q.arch ? ext : 0)), Z1 = (_q) => Math.min(L, _q.a1 + (_q.arch ? ext : 0));
        const Sink = (_s) => Gnd(_s) - CForgeWallGen.sSink;
        const rammed = T.mWallStyle == 1, Spread = (_s) => (Top(_s) - Sink(_s)) * 0.16, timber = new CForgeMeshBuf();
        const spans = [];
        let s0 = 0;
        for (const q of gates) {
            if (Z0(q) > s0)
                spans.push([s0, Z0(q)]);
            s0 = Math.max(s0, Z1(q));
        }
        if (s0 < L)
            spans.push([s0, L]);
        for (const [a, b] of spans) {
            const o = { cap0: !(_w.closed && a <= 0), cap1: !(_w.closed && b >= L) }, ss = c.Steps(a, b, step);
            if (rammed) {
                for (const sd of [1, -1])
                    CForgeWallGen.Batter(body, c, ss, half, sd, Sink, Top, Spread, o.cap0, o.cap1);
                continue;
            }
            CForgeShape.Band(body, c, ss, () => half, Sink, Top, o);
            CForgeShape.Band(stone, c, ss, () => half + 0.08, Sink, _s => Gnd(_s) + Math.min(0.7, H(_s) * 0.2), o);
        }
        for (const q of gates) {
            if (!q.arch) {
                for (const s of [q.a0, q.a1]) {
                    const a = c.At(s), side = s == q.a0 ? -1 : 1, px = a.p[0] + a.tx * side * half * 0.4, pz = a.p[1] + a.tz * side * half * 0.4;
                    const ang = Math.atan2(a.tz, a.tx), w = _w.thick * 1.3, top = Top(s) + 0.45;
                    CForgeShape.Box(body, px, pz, w, w, Gnd(s) - 0.3, top, ang);
                    CForgeShape.Box(tile, px, pz, w + 0.3, w + 0.3, top, top + 0.12, ang);
                    CForgeShape.Box(tile, px, pz, w * 0.5, w + 0.2, top + 0.12, top + 0.28, ang);
                }
                continue;
            }
            const z0 = Z0(q), z1 = Z1(q), TopG = (_s) => Top(_s) + 0.02;
            for (const [a, b] of [[z0, q.a0], [q.a1, z1]])
                if (b - a > 0.05)
                    CForgeShape.Band(body, c, c.Steps(a, b, step), () => halfG, Sink, TopG);
            const a = c.At(q.s), y0 = Math.max(Top(z0), Top(q.s), Top(z1)) + 0.37, ang = Math.atan2(a.tz, a.tx);
            if (rammed)
                CForgeWallGen.TimberGate(body, timber, c, q, halfG, Gnd, H, TopG);
            else
                CForgeWallGen.Arch(body, stone, c, q, halfG, Gnd, TopG, H);
            if (!rammed)
                CForgeShape.Box(cap, a.p[0], a.p[1], z1 - z0, halfG * 2 + 0.1, y0 - 0.37, y0 - 0.3, ang);
            CForgeChineseHallGen.Build(HB, a.p[0], a.p[1], a.tx, a.tz, Math.max(4, z1 - z0 - 0.8), halfG * 2 - 0.6, y0, 2.6, !rammed, T.mRoofLift);
        }
        const runs = [];
        for (const s of c.Steps(0, L, step)) {
            if (gates.some(_q => s > Z0(_q) - 1e-3 && s < Z1(_q) + 1e-3))
                continue;
            const para = H(s) >= paraH, r = runs[runs.length - 1];
            if (r != null && r.para == para && s - r.b < step * 1.5)
                r.b = s;
            else
                runs.push({ a: s, b: s, para });
        }
        const walk = _w.thick >= 0.7, pw = walk ? Math.min(half * 0.35, 0.3) : half * 0.92, sh = walk ? out * (half - pw) : 0;
        const low = 0.95, ph = 1.75, seg = 1.5, gap = 0.5;
        for (const r of runs) {
            if (r.b - r.a < 0.05)
                continue;
            const ss = c.Steps(r.a, r.b, step);
            if (!r.para) {
                CForgeWallGen.TileCap(tile, c, ss, half, Top);
                continue;
            }
            CForgeShape.Band(cap, c, ss, () => half + 0.06, _s => Top(_s) - 0.12, _s => Top(_s));
            CForgeShape.Band(body, c, ss, () => pw, Top, _s => Top(_s) + low, {}, () => sh);
            CForgeShape.Band(cap, c, ss, () => pw + 0.04, _s => Top(_s) + low - 0.02, _s => Top(_s) + low + 0.06, {}, () => sh);
            for (let k = Math.floor(r.a / seg); k * seg < r.b; k++) {
                const m0 = Math.max(r.a, k * seg + gap * 0.5), m1 = Math.min(r.b, (k + 1) * seg - gap * 0.5);
                if (m1 - m0 < 0.4)
                    continue;
                const ms = c.Steps(m0, m1, step);
                CForgeShape.Band(body, c, ms, () => pw, _s => Top(_s) + low, _s => Top(_s) + ph, {}, () => sh);
                CForgeShape.Band(cap, c, ms, () => pw + 0.05, _s => Top(_s) + ph, _s => Top(_s) + ph + 0.1, {}, () => sh);
                const s = (m0 + m1) * 0.5, p = c.At(s), lx = -p.tz, lz = p.tx;
                for (const side of [1, -1]) {
                    const off = sh + side * out * pw, nx = lx * side * out, nz = lz * side * out;
                    CForgeShape.Decal(dark, p.p[0] + lx * off, Top(s) + low + 0.45, p.p[1] + lz * off, p.tx, p.tz, nx, nz, 0.2, 0.2);
                }
            }
            if (!walk)
                continue;
            let a = r.a;
            for (const q of [...lands].sort((_x, _y) => _x.a0 - _y.a0)) {
                if (q.a1 <= a || q.a0 >= r.b)
                    continue;
                if (q.a0 - a > 0.05)
                    CForgeShape.Band(body, c, c.Steps(a, q.a0, step), () => 0.18, Top, _s => Top(_s) + 0.9, {}, () => -out * (half - 0.18));
                a = Math.max(a, q.a1);
            }
            if (r.b - a > 0.05)
                CForgeShape.Band(body, c, c.Steps(a, r.b, step), () => 0.18, Top, _s => Top(_s) + 0.9, {}, () => -out * (half - 0.18));
        }
        for (let k = 0; k * 3.5 < L; k++) {
            const hk = CForgeRand.Hash(seed, k, 31);
            if (hk % 100 > 38)
                continue;
            const s = k * 3.5 + (hk % 17) / 17 * 2.5;
            if (s > L || gates.some(_q => s > Z0(_q) - 1.2 && s < Z1(_q) + 1.2) || lands.some(_q => s > _q.a0 - 7 && s < _q.a1 + 7))
                continue;
            const a = c.At(s), side = (hk >>> 8) & 1 ? 1 : -1, br = 0.45 + ((hk >>> 10) % 50) / 100;
            const nx = -a.tz * side, nz = a.tx * side, x = a.p[0] + nx * (half + 0.15 + br * 0.6), z = a.p[1] + nz * (half + 0.15 + br * 0.6);
            CForgeShape.Bush(green, x, _g(x, z) - 0.1, z, br, br * 0.9);
        }
        if (!_w.closed)
            for (const [k, s] of [[0, 0], [1, L]]) {
                if (_w.endTower[k] > 0)
                    continue;
                const a = c.At(s), ang = Math.atan2(a.tz, a.tx), w = _w.thick * 1.35, top = Top(s) + 0.4;
                CForgeShape.Box(body, a.p[0], a.p[1], w, w, Gnd(s) - 0.4, top, ang);
                CForgeShape.Box(cap, a.p[0], a.p[1], w + 0.2, w + 0.2, top, top + 0.14, ang);
            }
        const parts = [
            { buf: body, rgb: T.mWallBody, tex: rammed ? CForgeTex.sHangtu : CForgeTex.sQingzhuan }, { buf: stone, rgb: T.mWallStone, tex: CForgeTex.sStone },
            { buf: cap, rgb: T.mWallCap, tex: rammed ? CForgeTex.sHangtu : CForgeTex.sQingzhuan }, { buf: tile, rgb: T.mRoof[0], tex: CForgeTex.sGiwa }, { buf: timber, rgb: T.mWood, tex: CForgeTex.sWood },
            { buf: dark, rgb: T.mDark }, { buf: green, rgb: T.mGreen },
            ...CForgeChineseHallGen.Parts(HB, T, T.mRoof[seed % T.mRoof.length]),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Japanese(_w, c, Gnd, Top, H, gates, lands, seed, _g) {
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), st = _w.style ?? 0, out = _w.out, step = 0.5;
        if (T.mWallStyle == 1)
            return CForgeWallGen.JapaneseEarth(_w, c, Gnd, Top, H, gates, seed);
        const body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), plaster = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), eaves = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), wood = new CForgeMeshBuf(), green = new CForgeMeshBuf();
        const YB = CForgeYaguraGen.Bufs();
        const castleH = st == 1 || st == 3 ? Infinity : st == 2 ? 2.2 : 2.8, ext = 1.6, halfG = Math.max(half + 0.5, 1.8);
        const Z0 = (_q) => Math.max(0, _q.a0 - (_q.arch ? ext : 0)), Z1 = (_q) => Math.min(L, _q.a1 + (_q.arch ? ext : 0));
        const Sink = (_s) => Gnd(_s) - CForgeWallGen.sSink, Spread = (_s) => (Top(_s) - Sink(_s)) * 0.24;
        const walk = _w.thick >= 0.7, pw = Math.min(walk ? half * 0.45 : half * 0.9, 0.22), sh = walk ? out * (half - pw) : 0, dh = st == 2 ? 1.4 : 1.7;
        const spans = [];
        let s0 = 0;
        for (const q of gates) {
            if (Z0(q) > s0)
                spans.push([s0, Z0(q)]);
            s0 = Math.max(s0, Z1(q));
        }
        if (s0 < L)
            spans.push([s0, L]);
        for (const [a, b] of spans) {
            const runs = [];
            let prev = a;
            for (const s of c.Steps(a, b, step)) {
                const hi = H(s) >= castleH, r = runs[runs.length - 1];
                if (r == null)
                    runs.push({ a: s, b: s, hi });
                else if (r.hi == hi)
                    r.b = s;
                else {
                    const m = (prev + s) * 0.5;
                    r.b = m;
                    runs.push({ a: m, b: s, hi });
                }
                prev = s;
            }
            for (const r of runs) {
                if (r.b - r.a < 0.05)
                    continue;
                const ss = c.Steps(r.a, r.b, step), cap0 = !(_w.closed && r.a <= 0), cap1 = !(_w.closed && r.b >= L);
                if (!r.hi) {
                    CForgeShape.Band(stone, c, ss, () => half + 0.06, Sink, _s => Gnd(_s) + Math.min(0.55, H(_s) * 0.3), { cap0, cap1 });
                    CForgeShape.Band(plaster, c, ss, () => half, Sink, Top, { cap0, cap1 });
                    CForgeWallGen.RoofBand(cap, eaves, c, ss, half, 0.35, Top);
                    continue;
                }
                CForgeWallGen.Batter(body, c, ss, half, out, Sink, Top, Spread, cap0, cap1);
                CForgeShape.Band(stone, c, ss, () => pw + 0.04, _s => Top(_s) - 0.02, _s => Top(_s) + 0.25, {}, () => sh);
                CForgeShape.Band(plaster, c, ss, () => pw, Top, _s => Top(_s) + dh, {}, () => sh);
                CForgeWallGen.RoofBand(cap, eaves, c, ss, pw, 0.4, _s => Top(_s) + dh, () => sh);
                for (let k = Math.ceil(r.a / 1.2 - 0.5); (k + 0.5) * 1.2 < r.b - 0.3; k++) {
                    const s = (k + 0.5) * 1.2;
                    if (s < r.a + 0.3)
                        continue;
                    const p = c.At(s), lx = -p.tz, lz = p.tx, y = Top(s) + dh * 0.55;
                    for (const side of [1, -1]) {
                        const off = sh + side * out * (pw + 0.02), nx = lx * side * out, nz = lz * side * out, x = p.p[0] + lx * off, z = p.p[1] + lz * off;
                        if (k % 2 == 0)
                            CForgeShape.Decal(dark, x, y, z, p.tx, p.tz, nx, nz, 0.2, 0.2);
                        else
                            dark.Poly([[x - p.tx * 0.13, y - 0.1, z - p.tz * 0.13], [x + p.tx * 0.13, y - 0.1, z + p.tz * 0.13], [x, y + 0.13, z]], [nx, 0, nz]);
                    }
                }
            }
        }
        for (const q of gates) {
            const a = c.At(q.s), ang = Math.atan2(a.tz, a.tx);
            if (!q.arch) {
                const top = Top(q.s) + 0.5, hl = (q.a1 - q.a0) * 0.5 + 0.25, hd = half + 0.3;
                for (const s of [q.a0, q.a1]) {
                    const p = c.At(s);
                    CForgeShape.Box(stone, p.p[0], p.p[1], 0.6, 0.6, Gnd(s) - 0.3, Gnd(s) + 0.15, ang);
                    CForgeShape.Box(wood, p.p[0], p.p[1], 0.32, 0.32, Gnd(s) + 0.15, top, ang);
                }
                CForgeShape.Box(wood, a.p[0], a.p[1], hl * 2 + 0.2, 0.3, top - 0.5, top - 0.18, ang);
                const W = (_a, _b, _y) => [a.p[0] + a.tx * _a - a.tz * _b, _y, a.p[1] + a.tz * _a + a.tx * _b];
                CForgeGiwaGen.Gable(YB, W, -hl, hl, -hd, hd, top, top + (hd + 0.45) * 0.5, { e: 0.45, ev: 0.3, T: 0.16, prof: 1.15, ns: 4, wall: null });
                continue;
            }
            const z0 = Z0(q), z1 = Z1(q), TopG = (_s) => Top(_s) + 0.02;
            for (const [s0, s1] of [[z0, q.a0], [q.a1, z1]])
                if (s1 - s0 > 0.05)
                    CForgeWallGen.Batter(body, c, c.Steps(s0, s1, step), halfG, out, Sink, TopG, Spread, true, true);
            const y0 = Math.max(Top(z0), Top(q.s), Top(z1)) + 0.02, lintel = Math.min(y0 - 0.6, Gnd(q.s) + Math.max(2.4, q.w * 1.1));
            for (const s of [q.a0 + 0.22, q.a1 - 0.22]) {
                const p = c.At(s);
                CForgeShape.Box(wood, p.p[0], p.p[1], 0.4, halfG * 0.5, Gnd(s) - 0.3, y0, ang);
            }
            CForgeShape.Box(wood, a.p[0], a.p[1], q.w + 0.3, halfG * 0.5 + 0.1, lintel, lintel + 0.4, ang);
            CForgeShape.Box(YB.board, a.p[0], a.p[1], q.w, halfG * 0.4, lintel + 0.4, y0, ang);
            CForgeShape.Box(wood, a.p[0], a.p[1], q.w + 0.1, halfG * 2 - 0.4, y0 - 0.25, y0, ang);
            CForgeYaguraGen.Build(YB, a.p[0], a.p[1], a.tx, a.tz, Math.max(3, z1 - z0 - 0.6), halfG * 2 - 0.4, y0, 1, 2.4);
        }
        for (let k = 0; k * 3.5 < L; k++) {
            const hk = CForgeRand.Hash(seed, k, 31);
            if (hk % 100 > 38)
                continue;
            const s = k * 3.5 + (hk % 17) / 17 * 2.5;
            if (s > L || gates.some(_q => s > Z0(_q) - 1.2 && s < Z1(_q) + 1.2) || lands.some(_q => s > _q.a0 - 7 && s < _q.a1 + 7))
                continue;
            const a = c.At(s), side = (hk >>> 8) & 1 ? 1 : -1, br = 0.45 + ((hk >>> 10) % 50) / 100, far = half + Spread(s) * (side == out ? 0.7 : 0) + 0.15 + br * 0.6;
            const nx = -a.tz * side, nz = a.tx * side, x = a.p[0] + nx * far, z = a.p[1] + nz * far;
            CForgeShape.Bush(green, x, _g(x, z) - 0.1, z, br, br * 0.9);
        }
        if (!_w.closed)
            for (const [k, s] of [[0, 0], [1, L]]) {
                if (_w.endTower[k] > 0)
                    continue;
                const a = c.At(s), ang = Math.atan2(a.tz, a.tx), w = _w.thick * 1.35, top = Top(s) + 0.4;
                CForgeShape.Box(body, a.p[0], a.p[1], w, w, Gnd(s) - 0.4, top, ang);
                CForgeShape.Box(cap, a.p[0], a.p[1], w + 0.2, w + 0.2, top, top + 0.14, ang);
            }
        const parts = [
            { buf: body, rgb: T.mWallBody, tex: CForgeTex.sIshigaki }, { buf: stone, rgb: T.mWallStone, tex: CForgeTex.sIshigaki },
            { buf: plaster, rgb: T.mPlaster[0], tex: CForgeTex.sPlaster }, { buf: cap, rgb: T.mWallCap, tex: CForgeTex.sKawara },
            { buf: eaves, rgb: T.mPlaster[0].map(_v => _v * 0.94), tex: CForgeTex.sPlaster },
            { buf: wood, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: dark, rgb: T.mDark }, { buf: green, rgb: T.mGreen },
            ...CForgeYaguraGen.Parts(YB, T, seed),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static sBatterRows = 5;
    static Batter(_b, c, ss, _half, _out, Bot, Top, Spread, _cap0, _cap1) {
        const n = ss.length, m = CForgeWallGen.sBatterRows;
        if (n < 2)
            return;
        const O = [], I = [], U = [], F = [];
        let ut = ss[0], px = 0, pz = 0;
        for (let i = 0; i < n; i++) {
            const s = ss[i], a = c.At(s), lx = -a.tz * _out, lz = a.tx * _out, y0 = Bot(s), y1 = Top(s), sp = Spread(s), h = Math.max(1e-3, y1 - y0);
            const col = [], op = [], ip = [];
            for (let k = 0; k <= m; k++) {
                const t = k / m, off = _half + sp * (1 - t) * (1 - t), y = y0 + h * t;
                op.push([a.p[0] + lx * off, y, a.p[1] + lz * off]);
                ip.push([a.p[0] - lx * _half, y, a.p[1] - lz * _half]);
                col.push(_b.Vert(op[k][0], y, op[k][2], s, y, lx, 2 * sp * (1 - t) / h, lz));
            }
            O.push(col);
            const i0 = ip[0], i1 = ip[m], o1 = op[m];
            if (i > 0)
                ut += Math.hypot(a.p[0] - px, a.p[1] - pz);
            px = a.p[0];
            pz = a.p[1];
            I.push(_b.Vert(i0[0], i0[1], i0[2], s, i0[1], -lx, 0, -lz), _b.Vert(i1[0], i1[1], i1[2], s, i1[1], -lx, 0, -lz));
            U.push(_b.Vert(o1[0], o1[1], o1[2], ut, 0, 0, 1, 0), _b.Vert(i1[0], i1[1], i1[2], ut, _half * 2, 0, 1, 0));
            F.push({ tx: a.tx, tz: a.tz, lx, lz, o: op, i: ip });
        }
        for (let i = 0; i + 1 < n; i++) {
            const k = i * 2, f = F[i];
            for (let r = 0; r < m; r++)
                _b.QuadIdx(O[i][r], O[i + 1][r], O[i + 1][r + 1], O[i][r + 1], f.lx, 0.3, f.lz);
            _b.QuadIdx(I[k], I[k + 2], I[k + 3], I[k + 1], -f.lx, 0, -f.lz);
            _b.QuadIdx(U[k], U[k + 2], U[k + 3], U[k + 1], 0, 1, 0);
        }
        for (const [on, i, sg] of [[_cap0, 0, -1], [_cap1, n - 1, 1]]) {
            if (!on)
                continue;
            const f = F[i];
            for (let r = 0; r < m; r++)
                _b.Poly([f.o[r], f.o[r + 1], f.i[r + 1], f.i[r]], [f.tx * sg, 0, f.tz * sg]);
        }
    }
    static RoofBand(_roof, _under, c, ss, _half, _eave, Top, _shift = null) {
        const n = ss.length, w = _half + _eave, rise = w * 0.45, T = 0.1, ls = Math.hypot(w, rise);
        if (n < 2)
            return;
        const R = [];
        let u = ss[0];
        for (let i = 0; i < n; i++) {
            const a = c.At(ss[i]), lx = -a.tz, lz = a.tx, sh = _shift ? _shift(ss[i]) : 0, y = Top(ss[i]) - rise * _eave / w + T, x = a.p[0] + lx * sh, z = a.p[1] + lz * sh;
            if (i > 0)
                u += Math.hypot(x - R[i - 1].p[0], z - R[i - 1].p[1]);
            const Q = (_o, _y) => [x + lx * _o, _y, z + lz * _o];
            R.push({ p: [x, z], tx: a.tx, tz: a.tz, l: Q(w, y), r: Q(-w, y), m: Q(0, y + rise), lw: Q(_half, Top(ss[i])), rw: Q(-_half, Top(ss[i])), u });
        }
        const D = (_q) => [_q[0], _q[1] - T, _q[2]];
        for (let i = 0; i + 1 < n; i++) {
            const a = R[i], b = R[i + 1], lx = -a.tz, lz = a.tx;
            for (const sd of [1, -1]) {
                const ea = sd > 0 ? a.l : a.r, eb = sd > 0 ? b.l : b.r, wa = sd > 0 ? a.lw : a.rw, wb = sd > 0 ? b.lw : b.rw;
                _roof.Quad([ea, eb, b.m, a.m], [[a.u, 0], [b.u, 0], [b.u, ls], [a.u, ls]], [lx * sd * rise, w, lz * sd * rise]);
                _under.Quad([D(ea), D(eb), wb, wa], null, [-lx * sd * rise, -w, -lz * sd * rise]);
                _roof.Quad([ea, eb, D(eb), D(ea)], null, [lx * sd, 0, lz * sd]);
            }
        }
        for (const [i, sg] of [[0, -1], [n - 1, 1]]) {
            const q = R[i];
            _roof.Poly([D(q.l), q.l, q.m, q.r, D(q.r)], [q.tx * sg, 0, q.tz * sg]);
        }
        CForgeShape.Band(_roof, c, ss, () => 0.11, _s => Top(_s) - rise * _eave / w + T + rise - 0.06, _s => Top(_s) - rise * _eave / w + T + rise + 0.12, {}, _shift);
    }
    static Bastion(_w, c, Gnd, Top, H, gates, lands, seed, _g) {
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), out = _w.out, step = 0.5;
        const body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), earth = new CForgeMeshBuf(), dark = new CForgeMeshBuf();
        const Sink = (_s) => Gnd(_s) - CForgeWallGen.sSink, Spread = (_s) => (Top(_s) - Sink(_s)) * 0.28;
        const InGate = (_s) => gates.find(_q => _s > _q.a0 && _s < _q.a1);
        const spans = [];
        let s0 = 0;
        for (const q of gates) {
            if (q.a0 > s0)
                spans.push([s0, q.a0]);
            s0 = Math.max(s0, q.a1);
        }
        if (s0 < L)
            spans.push([s0, L]);
        const pw = Math.min(half * 0.55, 0.9), sh = out * (half - pw);
        for (const [a, b] of spans) {
            if (b - a < 0.05)
                continue;
            const ss = c.Steps(a, b, step), cap0 = !(_w.closed && a <= 0), cap1 = !(_w.closed && b >= L);
            CForgeWallGen.Batter(body, c, ss, half, out, Sink, Top, Spread, cap0, cap1);
            CForgeWallGen.Batter(earth, c, ss, half * 0.6, -out, Sink, _s => Top(_s) - 0.25, _s => (Top(_s) - Sink(_s)) * 0.9, cap0, cap1);
            CForgeShape.Band(stone, c, ss, () => pw + 0.2, _s => Top(_s) - 0.28, Top, { cap0, cap1 }, () => sh);
            for (let k = Math.floor(a / 6); k * 6 < b; k++) {
                const m0 = Math.max(a, k * 6 + 0.45), m1 = Math.min(b, (k + 1) * 6 - 0.45);
                if (m1 - m0 < 0.4)
                    continue;
                CForgeShape.Band(body, c, c.Steps(m0, m1, step), () => pw, Top, _s => Top(_s) + 1.1, {}, () => sh);
                CForgeShape.Band(stone, c, c.Steps(m0, m1, step), () => pw + 0.04, _s => Top(_s) + 1.1, _s => Top(_s) + 1.2, {}, () => sh);
            }
        }
        for (const q of gates) {
            const a = c.At(q.s), ang = Math.atan2(a.tz, a.tx), lx = -a.tz * out, lz = a.tx * out;
            if (!q.arch) {
                for (const s of [q.a0, q.a1]) {
                    const p = c.At(s);
                    CForgeShape.Box(stone, p.p[0], p.p[1], 0.7, _w.thick + 0.3, Gnd(s) - 0.3, Top(s) + 0.5, ang);
                }
                continue;
            }
            const hg = half + 0.4, TopG = (_s) => Top(_s) + 0.6;
            CForgeWallGen.Arch(body, stone, c, q, hg, Gnd, TopG, H);
            const g = Gnd(q.s), ty = TopG(q.s), fo = hg + 0.12, P = (_u, _y) => [a.p[0] + a.tx * _u + lx * fo, _y, a.p[1] + a.tz * _u + lz * fo];
            for (const sg of [-1, 1]) {
                const p = c.At(q.s + sg * (q.w * 0.5 + 0.45));
                CForgeShape.Box(stone, p.p[0] + lx * fo, p.p[1] + lz * fo, 0.5, 0.3, g, ty, ang);
            }
            CForgeShape.Box(stone, a.p[0] + lx * fo, a.p[1] + lz * fo, q.w + 1.6, 0.36, ty, ty + 0.3, ang);
            stone.Poly([P(-q.w * 0.5 - 0.8, ty + 0.3), P(q.w * 0.5 + 0.8, ty + 0.3), P(0, ty + 0.3 + (q.w * 0.5 + 0.8) * 0.35)], [lx, 0, lz]);
        }
        const parts = [
            { buf: body, rgb: T.mWallBody, tex: CForgeTex.sStone }, { buf: stone, rgb: T.mWallCap, tex: CForgeTex.sStone },
            { buf: earth, rgb: T.mGreen.map(_v => _v * 0.95), tex: CForgeTex.sTurf }, { buf: dark, rgb: T.mDark },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static sGardenH = 2.2;
    static Garden(_w, c, Gnd, H, gates, seed) {
        const L = c.mLen, half = Math.min(0.3, _w.thick * 0.5), T = CForgeTheme.Of(_w), step = 0.5, Top = (_s) => Gnd(_s) + Math.min(H(_s), CForgeWallGen.sGardenH);
        const body = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), iron = new CForgeMeshBuf(), brick = T.mChurchMat == 2;
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
            CForgeShape.Band(body, c, ss, () => half, _s => Gnd(_s) - 0.5, Top, o);
            CForgeShape.Band(cap, c, ss, () => half + 0.07, Top, _s => Top(_s) + 0.1, o);
            for (let s = a + 2; s < b - 1; s += 4) {
                const p = c.At(s);
                CForgeShape.Box(cap, p.p[0], p.p[1], half * 2 + 0.24, half * 2 + 0.24, Top(s) - 0.2, Top(s) + 0.3, Math.atan2(p.tz, p.tx));
            }
        }
        for (const q of gates) {
            for (const s of [q.a0, q.a1]) {
                const p = c.At(s), ang = Math.atan2(p.tz, p.tx), top = Gnd(s) + CForgeWallGen.sGardenH + 0.4;
                CForgeShape.Box(body, p.p[0], p.p[1], 0.6, 0.6, Gnd(s) - 0.4, top, ang);
                CForgeShape.Box(cap, p.p[0], p.p[1], 0.75, 0.75, top, top + 0.15, ang);
                CForgeTowerGen.Lathe(cap, p.p[0], p.p[1], [[0.18, top + 0.15], [0.22, top + 0.3], [0, top + 0.5]], 8);
            }
            const g = Gnd(q.s), gh = CForgeWallGen.sGardenH - 0.1;
            for (const y of [0.15, gh * 0.5, gh])
                CForgeShape.Band(iron, c, c.Steps(q.a0 + 0.3, q.a1 - 0.3, 0.5), () => 0.025, () => g + y - 0.03, () => g + y + 0.03);
            for (let k = 0, n = Math.round((q.a1 - q.a0 - 0.6) / 0.15); k <= n; k++) {
                const p = c.At(q.a0 + 0.3 + (q.a1 - q.a0 - 0.6) * k / n);
                CForgeTowerGen.Lathe(iron, p.p[0], p.p[1], [[0.015, g + 0.1], [0.015, g + gh], [0.03, g + gh + 0.02], [0, g + gh + 0.14]], 4);
            }
        }
        const parts = [
            { buf: body, rgb: brick ? T.mBrick : T.mWallBody, tex: brick ? CForgeTex.sBrickWall : CForgeTex.sStone }, { buf: cap, rgb: T.mWallCap, tex: CForgeTex.sStone }, { buf: iron, rgb: T.mIron },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static JapaneseEarth(_w, c, Gnd, Top, H, gates, seed) {
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), step = 0.5;
        const earth = new CForgeMeshBuf(), board = new CForgeMeshBuf(), wood = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), under = new CForgeMeshBuf(), dark = new CForgeMeshBuf();
        const fh = 1.7, Bank = (_s) => Gnd(_s) + Math.max(0.6, H(_s) - fh), Sink = (_s) => Gnd(_s) - CForgeWallGen.sSink, Spread = (_s) => (Bank(_s) - Sink(_s)) * 0.7;
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
            const ss = c.Steps(a, b, step), cap0 = !(_w.closed && a <= 0), cap1 = !(_w.closed && b >= L);
            for (const o of [1, -1])
                CForgeWallGen.Batter(earth, c, ss, half, o, Sink, Bank, Spread, cap0, cap1);
            CForgeShape.Band(board, c, ss, () => 0.07, _s => Bank(_s) - 0.1, _s => Bank(_s) + fh, { cap0, cap1 });
            CForgeWallGen.RoofBand(roof, under, c, ss, 0.07, 0.3, _s => Bank(_s) + fh);
            for (let s = a + 0.9; s < b - 0.3; s += 1.8) {
                const p = c.At(s);
                CForgeShape.Box(wood, p.p[0], p.p[1], 0.14, 0.2, Bank(s) - 0.1, Bank(s) + fh, Math.atan2(p.tz, p.tx));
            }
            for (let s = a + 1.8; s < b - 0.5; s += 1.8) {
                const p = c.At(s), lx = -p.tz, lz = p.tx;
                for (const sd of [1, -1])
                    CForgeShape.Decal(dark, p.p[0] + lx * sd * 0.08, Bank(s) + fh * 0.6, p.p[1] + lz * sd * 0.08, p.tx, p.tz, lx * sd, lz * sd, 0.16, 0.16);
            }
        }
        for (const q of gates) {
            const a = c.At(q.s), ang = Math.atan2(a.tz, a.tx), top = Gnd(q.s) + Math.max(3.0, Math.min(H(q.s) + 0.4, 4.2)), hl = (q.a1 - q.a0) * 0.5 + 0.3, hd = half + 0.4;
            for (const s of [q.a0, q.a1]) {
                const p = c.At(s);
                CForgeShape.Box(wood, p.p[0], p.p[1], 0.36, 0.36, Gnd(s) - 0.3, top, ang);
            }
            CForgeShape.Box(wood, a.p[0], a.p[1], hl * 2 + 0.3, 0.32, top - 0.55, top - 0.2, ang);
            const W = (_a, _b, _y) => [a.p[0] + a.tx * _a - a.tz * _b, _y, a.p[1] + a.tz * _a + a.tx * _b];
            CForgeGiwaGen.Gable({ roof, under, edge: under, ridge: wood, mortar: wood, gable: wood }, W, -hl, hl, -hd, hd, top, top + (hd + 0.5) * 0.45, { e: 0.5, ev: 0.3, T: 0.12, prof: 1.0, ns: 3, wall: null });
        }
        const parts = [
            { buf: earth, rgb: T.mGreen.map(_v => _v * 0.95), tex: CForgeTex.sTurf }, { buf: board, rgb: T.mBoard.map(_v => _v * 1.6), tex: CForgeTex.sPlank },
            { buf: wood, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: roof, rgb: T.mShingle[seed % T.mShingle.length], tex: CForgeTex.sShingle },
            { buf: under, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: dark, rgb: T.mDark },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static TileCap(_b, c, ss, half, Top, _shift = null) {
        CForgeShape.Band(_b, c, ss, () => half + 0.14, _s => Top(_s) - 0.02, _s => Top(_s) + 0.1, {}, _shift);
        CForgeShape.Band(_b, c, ss, () => half * 0.62 + 0.05, _s => Top(_s) + 0.1, _s => Top(_s) + 0.2, {}, _shift);
        CForgeShape.Band(_b, c, ss, () => Math.max(0.08, half * 0.25), _s => Top(_s) + 0.2, _s => Top(_s) + 0.32, {}, _shift);
    }
    static TimberGate(_body, _timber, c, q, halfG, Gnd, H, TopG) {
        const a = c.At(q.s), ang = Math.atan2(a.tz, a.tx), g = Gnd(q.s), lin = g + Math.min(H(q.s) - 0.6, Math.max(2.6, q.w * 1.1)), lx = -a.tz, lz = a.tx;
        CForgeShape.Band(_body, c, c.Steps(q.a0, q.a1, 0.25), () => halfG, () => lin, TopG, { bottom: true, cap0: false, cap1: false });
        for (const o of [-halfG + 0.25, 0, halfG - 0.25]) {
            for (const sg of [-1, 1]) {
                const b0 = c.At(q.s + sg * q.w * 0.5).p, b1 = c.At(q.s + sg * (q.w * 0.5 - 0.35)).p;
                CForgeTowerGen.Strut(_timber, [b0[0] + lx * o, g - 0.2, b0[1] + lz * o], [b1[0] + lx * o, lin, b1[1] + lz * o], 0.24);
            }
            CForgeShape.Box(_timber, a.p[0] + lx * o, a.p[1] + lz * o, q.w + 0.3, 0.26, lin - 0.28, lin, ang);
        }
    }
    static Palisade(_w, c, Gnd, Top, H, gates, InGate, seed) {
        const L = c.mLen, T = CForgeTheme.Of(_w), d = 0.32, r = 0.15, out = _w.out;
        const logA = new CForgeMeshBuf(), logB = new CForgeMeshBuf(), rail = new CForgeMeshBuf(), deck = new CForgeMeshBuf();
        for (let k = 0; (k + 0.5) * d <= L; k++) {
            const s = (k + 0.5) * d;
            if (InGate(s, 0.02))
                continue;
            const a = c.At(s), h = CForgeRand.Hash(seed, k, 41), rr = r * (0.88 + (h % 25) / 100), top = Top(s) + ((h >>> 8) % 100 / 100 - 0.5) * 0.3;
            CForgeWallGen.Log(k % 2 == 0 ? logA : logB, a.p[0], a.p[1], rr, Gnd(s) - 0.6, top, rr * 2.6, h);
        }
        const spans = [];
        let s0 = 0;
        for (const q of gates) {
            if (q.a0 > s0)
                spans.push([s0, q.a0]);
            s0 = Math.max(s0, q.a1);
        }
        if (s0 < L)
            spans.push([s0, L]);
        const tall = (_s) => H(_s) >= 3.2;
        for (const [a0, a1] of spans) {
            if (a1 - a0 < 0.3)
                continue;
            const ss = c.Steps(a0, a1, 1.0);
            for (const f of [0.28, 0.72])
                for (const sd of [1, -1])
                    CForgeShape.Band(rail, c, ss, () => 0.05, _s => Gnd(_s) + H(_s) * f - 0.07, _s => Gnd(_s) + H(_s) * f + 0.07, {}, () => sd * out * (r + 0.05));
            if (!tall((a0 + a1) * 0.5))
                continue;
            CForgeShape.Band(deck, c, ss, () => 0.42, _s => Top(_s) - 1.42, _s => Top(_s) - 1.32, {}, () => -out * (r + 0.47));
            for (let s = a0 + 0.6; s < a1 - 0.3; s += 2) {
                const p = c.At(s), nx = -p.tz * -out * (r + 0.8), nz = p.tx * -out * (r + 0.8);
                CForgeShape.Box(rail, p.p[0] + nx, p.p[1] + nz, 0.16, 0.16, Gnd(s) - 0.3, Top(s) - 1.42, Math.atan2(p.tz, p.tx));
            }
        }
        for (const q of gates) {
            const top = Top(q.s) + 0.6;
            for (const s of [q.a0, q.a1]) {
                const p = c.At(s);
                CForgeTowerGen.Lathe(rail, p.p[0], p.p[1], [[0.24, Gnd(s) - 0.6], [0.24, top], [0.2, top + 0.12]], 8);
            }
            if (H(q.s) < 2.4)
                continue;
            const p0 = c.At(q.a0).p, p1 = c.At(q.a1).p, mx = (p0[0] + p1[0]) * 0.5, mz = (p0[1] + p1[1]) * 0.5;
            CForgeShape.Box(rail, mx, mz, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.6, 0.3, top - 0.55, top - 0.25, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]));
        }
        const parts = [
            { buf: logA, rgb: T.mLogWood[0], tex: CForgeTex.sWood }, { buf: logB, rgb: T.mLogWood[1 % T.mLogWood.length], tex: CForgeTex.sWood },
            { buf: rail, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: deck, rgb: T.mWood.map(_v => Math.min(1, _v * 1.25)), tex: CForgeTex.sPlank },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Log(_b, _x, _z, _r, _y0, _y1, _tip, _seed) {
        const seg = 5, base = _b.Count(), rot = (_seed % 628) / 100;
        for (let k = 0; k <= seg; k++) {
            const a = rot + k / seg * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a), u = k / seg * Math.PI * 2 * _r;
            _b.Vert(_x + cs * _r, _y0, _z + sn * _r, u, _y0, cs, 0, sn);
            _b.Vert(_x + cs * _r, _y1, _z + sn * _r, u, _y1, cs, 0.35, sn);
        }
        const apex = _b.Vert(_x, _y1 + _tip, _z, Math.PI * _r, _y1 + _tip, 0, 1, 0);
        for (let k = 0; k < seg; k++) {
            const a = rot + (k + 0.5) / seg * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a), i = base + k * 2;
            _b.QuadIdx(i, i + 2, i + 3, i + 1, cs, 0, sn);
            _b.Tri(i + 1, i + 3, apex, cs, 0.4, sn);
        }
    }
    static Arch(_body, _stone, _c, _q, _half, _gnd, _top, _h) {
        const r = _q.w * 0.5, g = _gnd(_q.s);
        const open = Math.min(_h(_q.s) - 0.7, Math.max(2.1, _q.w * 1.15));
        const spring = g + open - r;
        const Y = (_s) => spring + Math.sqrt(Math.max(0, r * r - (_s - _q.s) * (_s - _q.s)));
        const ss = _c.Steps(_q.a0, _q.a1, 0.1);
        CForgeShape.Band(_body, _c, ss, () => _half, _s => Y(_s) + 0.3, _top, { bottom: true, cap0: false, cap1: false });
        const ring = _c.Steps(_q.a0 - 0.12, _q.a1 + 0.12, 0.1);
        const RY = (_s) => { const d = Math.abs(_s - _q.s); return d < r ? Y(_s) : spring; };
        CForgeShape.Band(_stone, _c, ring, () => _half + 0.05, RY, _s => RY(_s) + 0.32, { bottom: true, cap0: false, cap1: false });
    }
}
