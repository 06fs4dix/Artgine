import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeOpening } from "./CForgeOpening.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeAdobeGen } from "./CForgeAdobeGen.js";
import { CForgeIncaGen } from "./CForgeIncaGen.js";
export class CForgeArabGen {
    static ArchY(_w, _h, _kind, _u) {
        const o = CForgeOpening.Outline(_w, _h, _kind);
        let best = 0;
        for (let i = 0; i + 1 < o.length; i++) {
            const a = o[i], b = o[i + 1];
            if ((_u - a[0]) * (_u - b[0]) > 0 || Math.abs(b[0] - a[0]) < 1e-9)
                continue;
            best = Math.max(best, a[1] + (b[1] - a[1]) * (_u - a[0]) / (b[0] - a[0]));
        }
        return best;
    }
    static Gate(_body, _trim, _dark, c, q, _half, _out, Gnd, Top, H, _kind) {
        const g = Gnd(q.s), open = Math.min(H(q.s) - 0.6, Math.max(2.4, q.w * 1.25)), hw = q.w * 0.5, a = c.At(q.s), lx = -a.tz * _out, lz = a.tx * _out, ang = Math.atan2(a.tz, a.tx);
        const Y = (_s) => g + CForgeArabGen.ArchY(q.w, open, _kind, Math.max(-hw + 1e-3, Math.min(hw - 1e-3, _s - q.s)));
        CForgeShape.Band(_body, c, c.Steps(q.a0, q.a1, 0.1), () => _half, Y, _s => Top(_s) + 0.02, { bottom: true, cap0: false, cap1: false });
        const fo = _half + 0.12, fw = 0.55, P = (_u, _y) => [a.p[0] + a.tx * _u + lx * fo, _y, a.p[1] + a.tz * _u + lz * fo];
        for (const sg of [-1, 1])
            CForgeShape.Box(_trim, a.p[0] + a.tx * sg * (hw + fw * 0.5) + lx * (fo - 0.12), a.p[1] + a.tz * sg * (hw + fw * 0.5) + lz * (fo - 0.12), fw, 0.24, g - 0.3, g + open + 0.6, ang);
        CForgeShape.Box(_trim, a.p[0] + lx * (fo - 0.12), a.p[1] + lz * (fo - 0.12), q.w + fw * 2, 0.24, g + open, g + open + 0.6, ang);
        const O = CForgeOpening.Outline(q.w, open, _kind);
        for (let i = 1; i + 2 < O.length; i++) {
            const p0 = O[i], p1 = O[i + 1];
            _trim.Quad([P(p0[0], g + p0[1]), P(p1[0], g + p1[1]), P(p1[0], g + open + 0.02), P(p0[0], g + open + 0.02)], null, [lx, 0, lz]);
        }
    }
    static Wall(_w, c, Gnd, Top, H, gates) {
        const L = c.mLen, half = _w.thick * 0.5, T = CForgeTheme.Of(_w), out = _w.out, step = 0.5, st = T.mWallStyle, earth = st == 1;
        const body = new CForgeMeshBuf(), base = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), dark = new CForgeMeshBuf();
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
        for (const [a, b] of spans) {
            if (b - a < 0.05)
                continue;
            const ss = c.Steps(a, b, step), o = { cap0: !(_w.closed && a <= 0), cap1: !(_w.closed && b >= L) };
            CForgeShape.Band(body, c, ss, () => half, Sink, Top, o);
            CForgeShape.Band(base, c, ss, () => half + 0.14, Sink, _s => Gnd(_s) + Math.min(0.9, H(_s) * 0.2), o);
            if (!earth)
                CForgeShape.Band(trim, c, ss, () => half + 0.06, _s => Top(_s) - 0.2, Top, o);
        }
        const walk = _w.thick >= 0.7, sh = walk ? out * half * 0.6 : 0;
        for (let s = 0.5; s < L - 0.3; s += st == 2 ? 1.3 : 0.95) {
            if (InGate(s, 0.3))
                continue;
            const p = c.At(s), ang = Math.atan2(p.tz, p.tx), x = p.p[0] - p.tz * sh, z = p.p[1] + p.tx * sh;
            if (st == 2)
                CForgeShape.Box(body, x, z, 0.75, walk ? half * 0.7 : _w.thick, Top(s), Top(s) + 0.9, ang);
            else
                CForgeAdobeGen.Merlon(body, x, z, ang, Top(s), 0.62, earth ? 3 : 1);
        }
        if (walk)
            for (const [a, b] of spans)
                if (b - a > 0.3)
                    CForgeShape.Band(body, c, c.Steps(a, b, step), () => half * 0.12, Top, _s => Top(_s) + 0.35, {}, () => -out * half * 0.86);
        for (let s = 0.5; s < L; s += earth ? 1.0 : 4.5) {
            if (InGate(s, 0.8))
                continue;
            const p = c.At(s), lx = -p.tz * out, lz = p.tx * out;
            if (earth)
                for (let y = Gnd(s) + 1.2; y < Top(s) - 0.4; y += 0.9)
                    CForgeShape.Decal(dark, p.p[0] + lx * half, y, p.p[1] + lz * half, p.tx, p.tz, lx, lz, 0.12, 0.12);
            else if (H(s) > 3.5)
                CForgeOpening.Slit({ stone: trim, fill: dark, dark }, p.p[0] + lx * half, Gnd(s) + H(s) * 0.6, p.p[1] + lz * half, p.tx, p.tz, lx, lz, 0.16, 0.9);
        }
        const kind = earth ? CForgeOpening.eKind.Horseshoe : st == 2 ? CForgeOpening.eKind.Round : CForgeOpening.eKind.Pointed;
        for (const q of gates)
            CForgeArabGen.Gate(body, trim, dark, c, q, half + 0.02, out, Gnd, Top, H, kind);
        const parts = [
            { buf: body, rgb: T.mWallBody, tex: earth ? CForgeTex.sHangtu : CForgeTex.sAshlar }, { buf: base, rgb: T.mWallStone, tex: earth ? CForgeTex.sHangtu : CForgeTex.sAshlar },
            { buf: trim, rgb: T.mWallCap, tex: earth ? CForgeTex.sHangtu : CForgeTex.sAshlar }, { buf: dark, rgb: T.mDark },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Tower(_t, _g, _top, T) {
        const [cx, cz] = _t.c, r = _t.r, st = T.mWallStyle, earth = st == 1, round = T.mTowerShape != 1, seg = Math.min(32, Math.max(14, Math.round(r * 7)));
        const body = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), gold = new CForgeMeshBuf(), w = r * 1.8;
        if (round) {
            CForgeTowerGen.Lathe(body, cx, cz, [[r * 1.1, _g - 1.0], [r * 1.05, _g + 1.0], [r, _top]], seg);
            CForgeTowerGen.Ring(trim, cx, cz, r * 0.96, r + 0.18, _top - 0.35, _top, seg);
        }
        else {
            CForgeIncaGen.Batter(body, [[cx - w / 2, cz - w / 2], [cx + w / 2, cz - w / 2], [cx + w / 2, cz + w / 2], [cx - w / 2, cz + w / 2]], 0.25, _g - 1.0, _top);
            CForgeShape.Box(trim, cx, cz, w + 0.3, w + 0.3, _top - 0.35, _top);
        }
        const OB = { stone: trim, fill: dark, dark };
        for (let k = 0; k < _t.floors; k++)
            for (const a of round ? [0.4, 2.5, 4.6].map(_v => _v + k) : [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
                if (_t.attach.some(_b => Math.abs(Math.atan2(Math.sin(a - _b), Math.cos(a - _b))) < 0.6))
                    continue;
                const nx = Math.cos(a), nz = Math.sin(a), d = round ? r : w * 0.5, y = _g + _t.height * (k + 0.55) / _t.floors;
                if (earth)
                    CForgeShape.Decal(dark, cx + nx * (d + 0.02), y, cz + nz * (d + 0.02), -nz, nx, nx, nz, 0.35, 0.6);
                else
                    CForgeOpening.Slit(OB, cx + nx * d, y, cz + nz * d, -nz, nx, nx, nz, 0.17, 0.9);
            }
        if (_t.door != null) {
            const a = _t.door, d = round ? r * 1.05 : w * 0.5 + 0.05;
            CForgeOpening.Door({ stone: trim, fill: dark, dark, door: dark }, cx + Math.cos(a) * d, _g, cz + Math.sin(a) * d, -Math.sin(a), Math.cos(a), Math.cos(a), Math.sin(a), 1.1, 2.3, earth ? 4 : st == 2 ? 1 : 2, 1);
        }
        if (st == 2 && !_t.flat && round) {
            CForgeTowerGen.Lathe(roof, cx, cz, [[r + 0.3, _top - 0.05], [(r + 0.3) * 0.5, _top + r * 1.3], [0.1, _top + r * 2.4]], seg);
            CForgeTowerGen.Soffit(roof, cx, cz, r * 0.9, r + 0.3, _top - 0.06, seg);
            CForgeTowerGen.Lathe(gold, cx, cz, [[0.08, _top + r * 2.35], [0.14, _top + r * 2.45], [0.03, _top + r * 2.75], [0, _top + r * 2.8]], 8);
        }
        else if (round) {
            CForgeShape.Cap(trim, Array.from({ length: seg }, (_v, _k) => [cx + Math.cos(_k / seg * Math.PI * 2) * r, cz + Math.sin(_k / seg * Math.PI * 2) * r]), _top);
            const n = Math.max(6, Math.round(Math.PI * 2 * r / 1.0));
            for (let k = 0; k < n; k++) {
                const a = (k + 0.5) / n * Math.PI * 2, x = cx + Math.cos(a) * (r - 0.05), z = cz + Math.sin(a) * (r - 0.05);
                if (st == 2)
                    CForgeShape.Box(body, x, z, 0.7, 0.36, _top, _top + 0.9, a + Math.PI * 0.5);
                else
                    CForgeAdobeGen.Merlon(body, x, z, a + Math.PI * 0.5, _top, 0.62, earth ? 3 : 1);
            }
        }
        else {
            CForgeShape.Cap(trim, [[cx - w / 2, cz - w / 2], [cx + w / 2, cz - w / 2], [cx + w / 2, cz + w / 2], [cx - w / 2, cz + w / 2]], _top);
            const n = Math.max(2, Math.round(w / 0.95));
            for (const [fx, fz] of [[1, 0], [0, 1], [-1, 0], [0, -1]])
                for (let k = 0; k < n; k++) {
                    const t = (k + 0.5) / n - 0.5, x = cx + fx * (w * 0.5 - 0.1) - fz * t * w, z = cz + fz * (w * 0.5 - 0.1) + fx * t * w;
                    CForgeAdobeGen.Merlon(body, x, z, Math.atan2(fx, -fz), _top, 0.62, earth ? 3 : 1);
                }
        }
        const parts = [
            { buf: body, rgb: T.mTowerBody, tex: earth ? CForgeTex.sHangtu : CForgeTex.sAshlar }, { buf: trim, rgb: T.mWallCap, tex: earth ? CForgeTex.sHangtu : CForgeTex.sAshlar },
            { buf: dark, rgb: T.mDark }, { buf: roof, rgb: T.mMetal, tex: CForgeTex.sPlaster }, { buf: gold, rgb: T.mGold },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static TowerTop(_t, T) { return T.mWallStyle == 2 && !_t.flat && T.mTowerShape != 1 ? _t.r * 2.8 : 0.9; }
    static Dome(_b, _cx, _cz, _r, _y, _h, _a0 = 0, _a1 = Math.PI * 2, _seg = 24, _pointed = 0) {
        const nv = 8, base = _b.Count(), na = Math.max(3, Math.round(_seg * (_a1 - _a0) / (Math.PI * 2)));
        for (let j = 0; j <= nv; j++) {
            const t = j / nv * Math.PI * 0.5, rr = Math.cos(t) * _r * (1 - _pointed * Math.sin(t) * 0.25), yy = _y + Math.sin(t) * _h + _pointed * _h * 0.25 * Math.pow(Math.sin(t), 6);
            for (let i = 0; i <= na; i++) {
                const a = _a0 + (_a1 - _a0) * i / na, ca = Math.cos(a), sa = Math.sin(a);
                _b.Vert(_cx + ca * rr, yy, _cz + sa * rr, a * _r, t * _r, ca * Math.cos(t) * _h, Math.sin(t) * _r, sa * Math.cos(t) * _h);
            }
        }
        for (let j = 0; j < nv; j++)
            for (let i = 0; i < na; i++) {
                const k = base + j * (na + 1) + i, t = (j + 0.5) / nv * Math.PI * 0.5, a = _a0 + (_a1 - _a0) * (i + 0.5) / na;
                _b.QuadIdx(k, k + 1, k + na + 2, k + na + 1, Math.cos(a) * Math.cos(t), Math.sin(t), Math.sin(a) * Math.cos(t));
            }
    }
    static Finial(_b, _x, _z, _y, _s, _balls = 2) {
        CForgeTowerGen.Lathe(_b, _x, _z, [[0.04 * _s, _y], [0.04 * _s, _y + 0.9 * _s]], 6);
        for (let k = 0; k < _balls; k++) {
            const y = _y + (0.15 + k * 0.3) * _s, r = (0.16 - k * 0.03) * _s;
            CForgeTowerGen.Lathe(_b, _x, _z, [[0.03, y], [r, y + r], [0.03, y + r * 2]], 8);
        }
        const y = _y + 0.95 * _s, R = 0.22 * _s;
        for (let k = 0; k < 7; k++) {
            const a0 = -Math.PI * 0.75 + k / 7 * Math.PI * 1.5, a1 = -Math.PI * 0.75 + (k + 1) / 7 * Math.PI * 1.5;
            CForgeTowerGen.Strut(_b, [_x + Math.cos(a0) * R, y + R + Math.sin(a0) * R, _z], [_x + Math.cos(a1) * R, y + R + Math.sin(a1) * R, _z], 0.06 * _s);
        }
    }
    static MosqueDim(_r, F) {
        const { L, W } = _r, T = CForgeTheme.Of(_r), m = T.mMosque;
        if (m == 1) {
            const S = Math.min(W - 1, L * 0.62), H = S * 0.42 + 2.5, rd = S * 0.36;
            return { S, H, rd, dy: F.floor + H + 1.3, ms: 1.5, mh: H + S * 1.1 + 4 };
        }
        if (m == 2) {
            const H = 5.2, ms = Math.min(3.4, W * 0.32);
            return { S: W - 0.6, H, rd: 0, dy: F.floor + H, ms, mh: H + ms * 4.6 };
        }
        const H = Math.min(11, 5 + W * 0.45), rd = Math.min(W * 0.3, 3.6);
        return { S: W - 0.6, H, rd, dy: F.floor + H + 2.6, ms: Math.min(2.8, W * 0.26), mh: H + 12 };
    }
    static MosqueHull(_r, F) {
        const D = CForgeArabGen.MosqueDim(_r, F), { L, W, fs } = _r, m = CForgeTheme.Of(_r).mMosque, f = F.floor, out = [];
        if (m == 1) {
            const ac = -L * 0.5 + D.S * 0.5 + 0.4;
            out.push([ac, 0, D.S * 0.5, D.S * 0.5, F.base, f + D.H], [ac, 0, D.rd, D.rd, f + D.H, D.dy + D.rd]);
            for (const s of [-1, 1])
                out.push([ac + D.S * 0.5 + 0.8, s * (D.S * 0.5 - 0.2), D.ms * 0.5, D.ms * 0.5, F.base, f + D.mh]);
            return out;
        }
        out.push([0, 0, L * 0.5, W * 0.5 - 0.3, F.base, f + D.H]);
        if (m == 0)
            out.push([-L * 0.5 + D.rd + 0.8, 0, D.rd + 0.3, D.rd + 0.3, f + D.H, D.dy + D.rd * 1.45]);
        out.push([L * 0.5 - D.ms * 0.5, fs * (W * 0.5 - D.ms * 0.5 - 0.3), D.ms * 0.5, D.ms * 0.5, F.base, f + D.mh]);
        return out;
    }
    static Mosque(_r, _g, F) {
        const T = CForgeTheme.Of(_r), m = T.mMosque;
        if (m == 1)
            return CForgeArabGen.Ottoman(_r, F, T);
        if (m == 2)
            return CForgeArabGen.Maghreb(_r, F, T);
        return CForgeArabGen.Mamluk(_r, F, T);
    }
    static Mamluk(_r, F, T) {
        const { L, W, fs, u } = _r, { P, v, floor, base, ang } = F, D = CForgeArabGen.MosqueDim(_r, F), H = D.H, Wh = W - 0.6;
        const light = new CForgeMeshBuf(), red = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), door = new CForgeMeshBuf(), dome = new CForgeMeshBuf(), gold = new CForgeMeshBuf();
        const body = CForgeIncaGen.LocalRect(P, 0, 0, L, Wh), top = floor + H;
        CForgeShape.Extrude(trim, CForgePoly.Offset(body, 0.08), base, floor + 0.5);
        for (let y = floor + 0.5, k = 0; y < top - 1e-3; y += 0.5, k++)
            CForgeShape.Extrude(k % 2 == 1 && y < floor + 3.4 ? red : light, body, y, Math.min(top, y + 0.5));
        CForgeShape.Cap(trim, body, top);
        CForgeShape.Extrude(trim, CForgePoly.Offset(body, 0.1), top - 0.35, top);
        for (let i = 0; i < 4; i++) {
            const a = body[i], c = body[(i + 1) % 4], len = Math.hypot(c[0] - a[0], c[1] - a[1]), tx = (c[0] - a[0]) / len, tz = (c[1] - a[1]) / len, nx = tz, nz = -tx, ea = Math.atan2(tz, tx);
            const fr = nx * v[0] * fs + nz * v[1] * fs > 0.7, nb = Math.max(1, Math.round(len / 3.2)), bw = len / nb;
            for (let k = 0; k <= nb; k++) {
                const x = a[0] + tx * bw * k + nx * 0.12, z = a[1] + tz * bw * k + nz * 0.12;
                CForgeShape.Box(trim, x, z, 0.5, 0.24, floor + 0.5, top - 0.35, ea);
            }
            for (let k = 0; k < nb; k++) {
                const m = bw * (k + 0.5), x = a[0] + tx * m + nx * 0.02, z = a[1] + tz * m + nz * 0.02;
                if (fr && Math.abs(m - len * 0.5) < 2.6)
                    continue;
                CForgeOpening.Window({ stone: trim, fill: dark, dark }, x, floor + 1.4, z, tx, tz, nx, nz, Math.min(1.0, bw * 0.3), 1.3, CForgeOpening.eKind.Rect);
                for (const s of [-1, 1])
                    CForgeOpening.Window({ stone: trim, fill: dark, dark }, x + tx * s * bw * 0.16, top - 3.3, z + tz * s * bw * 0.16, tx, tz, nx, nz, Math.min(0.6, bw * 0.17), 1.6, CForgeOpening.eKind.Pointed);
                CForgeOpening.Window({ stone: trim, fill: dark, dark }, x, top - 1.35, z, tx, tz, nx, nz, 0.5, 0.5, CForgeOpening.eKind.Round);
            }
            for (let k = 0, n = Math.max(1, Math.floor(len / 0.62)); k < n; k++) {
                const m = (k + 0.5) * len / n;
                CForgeAdobeGen.Merlon(trim, a[0] + tx * m - nx * 0.12, a[1] + tz * m - nz * 0.12, ea, top, 0.42, 1);
            }
        }
        {
            const pw = Math.min(5, L * 0.3), pc = P(0, fs * (Wh * 0.5 + 0.4)), nx = v[0] * fs, nz = v[1] * fs, ph = top + 1.2, aw = pw - 1.4, ah = H - 0.6;
            for (const s of [-1, 1]) {
                const q = P(s * (pw - (pw - aw) * 0.5) * 0.5, fs * (Wh * 0.5 + 0.4));
                CForgeShape.Box(light, q[0], q[1], (pw - aw) * 0.5, 0.8, base, ph, ang);
            }
            const lt = P(0, fs * (Wh * 0.5 + 0.4));
            CForgeShape.Box(light, lt[0], lt[1], aw + 0.02, 0.8, floor + ah, ph, ang);
            CForgeShape.Box(trim, pc[0], pc[1], pw + 0.2, 0.9, ph - 0.3, ph, ang);
            const fo = Wh * 0.5 + 0.8 + 0.01, f0 = P(0, fs * fo);
            CForgeOpening.Frame(trim, f0[0], floor, f0[1], u[0], u[1], nx, nz, aw, ah, CForgeOpening.eKind.Pointed, 0.25, 0.08);
            const back = P(0, fs * (Wh * 0.5 + 0.02));
            CForgeOpening.Fill(dark, back[0], floor, back[1], u[0], u[1], nx, nz, aw, ah, CForgeOpening.eKind.Pointed, 0.0);
            for (let k = 0; k < 4; k++) {
                const y = floor + ah - 2.0 + k * 0.38, w = aw * (0.3 + k * 0.17), q = P(0, fs * (Wh * 0.5 + 0.12 + k * 0.14));
                CForgeShape.Box(trim, q[0], q[1], w, 0.24 + k * 0.04, y, y + 0.3, ang);
                for (let j = 0, n = 2 + k; j < n; j++) {
                    const cq = P(-w * 0.5 + w * (j + 0.5) / n, fs * (Wh * 0.5 + 0.25 + k * 0.16 + k * 0.02));
                    CForgeShape.Decal(dark, cq[0], y + 0.13, cq[1], u[0], u[1], v[0] * fs, v[1] * fs, w / n * 0.6, 0.18);
                }
            }
            const dq = P(0, fs * (Wh * 0.5 + 0.04));
            CForgeOpening.Door({ stone: trim, fill: door, dark, door }, dq[0], floor, dq[1], u[0], u[1], nx, nz, Math.min(1.8, aw * 0.55), 2.8, CForgeOpening.eKind.Rect, 1);
            for (let k = 0; k < 4; k++) {
                const q = P(0, fs * (Wh * 0.5 + 0.9 + k * 0.32));
                CForgeShape.Box(trim, q[0], q[1], aw + 0.4, 0.34, base, floor - 0.2 * k, ang);
            }
        }
        {
            const rd = D.rd, ac = -L * 0.5 + rd + 0.8, dc = P(ac, 0), y0 = top, y1 = y0 + 1.3, y2 = D.dy;
            CForgeShape.Box(light, dc[0], dc[1], rd * 2 + 0.4, rd * 2 + 0.4, y0 - 0.1, y1, ang);
            CForgeShape.Box(trim, dc[0], dc[1], rd * 2 + 0.6, rd * 2 + 0.6, y1 - 0.2, y1, ang);
            CForgeTowerGen.Lathe(light, dc[0], dc[1], [[rd * 1.04, y1 - 0.1], [rd * 1.02, y2]], 8);
            for (let k = 0; k < 8; k++)
                CForgeTowerGen.ArchDecal(dark, dc[0], dc[1], rd * 0.96, k * Math.PI / 4 + Math.PI / 8, y1 + 0.25, 0.32, 0.8);
            CForgeArabGen.Dome(dome, dc[0], dc[1], rd, y2, rd * 1.35, 0, Math.PI * 2, 24, 1);
            CForgeArabGen.Finial(gold, dc[0], dc[1], y2 + rd * 1.35 + rd * 0.25 - 0.1, 1.4);
        }
        CForgeArabGen.Minaret(light, trim, dark, dome, gold, P(L * 0.5 - D.ms * 0.5, fs * (Wh * 0.5 - D.ms * 0.5)), ang, D.ms, base, top, floor + D.mh, 0);
        const parts = [
            { buf: light, rgb: T.mWallBody, tex: CForgeTex.sAshlar }, { buf: red, rgb: T.mWallStone, tex: CForgeTex.sAshlar }, { buf: trim, rgb: T.mWallCap, tex: CForgeTex.sAshlar },
            { buf: dome, rgb: T.mStone, tex: CForgeTex.sAshlar }, { buf: dark, rgb: T.mDark }, { buf: door, rgb: T.mWood.map(_v => _v * 1.1), tex: CForgeTex.sPlank }, { buf: gold, rgb: T.mGold },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Minaret(_body, _trim, _dark, _cap, _gold, _c, _ang, _ms, _y0, _y1, _yTop, _kind) {
        const [cx, cz] = _c, hs = _ms * 0.5, ux = Math.cos(_ang), uz = Math.sin(_ang);
        const Balcony = (_y, _rIn, _rOut, _seg) => {
            for (let k = 0; k < 3; k++)
                CForgeTowerGen.Ring(_trim, cx, cz, _rIn * 0.9, _rIn + (_rOut - _rIn) * (k + 1) / 3, _y - 0.6 + k * 0.2, _y - 0.4 + k * 0.2, _seg);
            CForgeTowerGen.Ring(_trim, cx, cz, _rOut - 0.08, _rOut, _y, _y + 0.9, _seg, true);
        };
        const Blind = (_x, _z, _nx, _nz, _y, _w, _h, _k) => CForgeOpening.Fill(_dark, _x, _y, _z, -_nz, _nx, _nx, _nz, _w, _h, _k, 0.015);
        if (_kind == 2) {
            CForgeShape.Box(_body, cx, cz, _ms, _ms, _y0, _yTop, _ang);
            const fr = [[1, 0], [0, 1], [-1, 0], [0, -1]];
            for (const [fu, fv] of fr) {
                const nx = ux * fu - uz * fv, nz = uz * fu + ux * fv;
                for (const y of [_yTop - 5.2, _yTop - 2.8])
                    for (const s of [-1, 1])
                        Blind(cx + nx * hs + nz * s * hs * 0.4, cz + nz * hs - nx * s * hs * 0.4, nx, nz, y, hs * 0.42, 1.6, CForgeOpening.eKind.Horseshoe);
            }
            CForgeShape.Box(_cap, cx, cz, _ms + 0.06, _ms + 0.06, _yTop - 1.0, _yTop - 0.6, _ang);
            CForgeShape.Box(_trim, cx, cz, _ms + 0.2, _ms + 0.2, _yTop - 0.15, _yTop, _ang);
            const n = Math.max(2, Math.round(_ms / 0.75));
            for (const [fu, fv] of fr)
                for (let k = 0; k < n; k++) {
                    const t = ((k + 0.5) / n - 0.5) * _ms, nx = ux * fu - uz * fv, nz = uz * fu + ux * fv;
                    CForgeAdobeGen.Merlon(_body, cx + nx * (hs - 0.1) - nz * t, cz + nz * (hs - 0.1) + nx * t, Math.atan2(nz, nx) + Math.PI * 0.5, _yTop, 0.5, 3);
                }
            const ls = _ms * 0.42, ly = _yTop + ls * 1.9;
            CForgeShape.Box(_body, cx, cz, ls, ls, _yTop - 0.1, ly, _ang);
            for (const [fu, fv] of fr) {
                const nx = ux * fu - uz * fv, nz = uz * fu + ux * fv;
                Blind(cx + nx * ls * 0.5, cz + nz * ls * 0.5, nx, nz, _yTop + ls * 0.5, ls * 0.4, ls * 0.9, CForgeOpening.eKind.Horseshoe);
            }
            CForgeShape.Box(_trim, cx, cz, ls + 0.16, ls + 0.16, ly - 0.1, ly + 0.05, _ang);
            CForgeArabGen.Dome(_cap, cx, cz, ls * 0.5, ly + 0.05, ls * 0.45, 0, Math.PI * 2, 12);
            CForgeArabGen.Finial(_gold, cx, cz, ly + ls * 0.48, 1.2, 3);
            return;
        }
        if (_kind == 1) {
            const r = hs * 0.62, seg = 12, h = _yTop - _y1, b1 = _y1 + h * 0.55, b2 = _y1 + h * 0.82;
            CForgeShape.Box(_body, cx, cz, _ms, _ms, _y0, _y1 + 0.6, _ang);
            CForgeTowerGen.Lathe(_body, cx, cz, [[r * 1.15, _y1 + 0.5], [r, _y1 + 1.2], [r, _yTop]], seg);
            Balcony(b1, r, r + 0.45, seg);
            Balcony(b2, r * 0.95, r + 0.4, seg);
            CForgeTowerGen.Lathe(_cap, cx, cz, [[r + 0.08, _yTop], [r * 0.6, _yTop + 2.2], [0.08, _yTop + 4.2]], seg);
            CForgeArabGen.Finial(_gold, cx, cz, _yTop + 4.1, 1.3);
            return;
        }
        const st = _yTop - _y1, y2 = _y1 + 2.0, y3 = y2 + st * 0.4, y4 = y3 + st * 0.25, r8 = hs * 0.82, rc = hs * 0.6;
        CForgeShape.Box(_body, cx, cz, _ms, _ms, _y0, y2, _ang);
        for (const [fu, fv] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
            const nx = ux * fu - uz * fv, nz = uz * fu + ux * fv;
            Blind(cx + nx * hs, cz + nz * hs, nx, nz, y2 - 2.6, 0.4, 1.4, CForgeOpening.eKind.Pointed);
        }
        Balcony(y2 + 0.4, hs * 0.9, hs + 0.35, 8);
        CForgeTowerGen.Lathe(_body, cx, cz, [[r8, y2], [r8, y3]], 8);
        for (let k = 0; k < 8; k++)
            CForgeTowerGen.ArchDecal(_dark, cx, cz, r8 * 0.93, k * Math.PI / 4 + Math.PI / 8, y2 + 1.4, 0.3, 1.2);
        Balcony(y3 + 0.3, r8 * 0.9, r8 + 0.38, 12);
        CForgeTowerGen.Lathe(_body, cx, cz, [[rc, y3], [rc, y4]], 12);
        CForgeTowerGen.Ring(_trim, cx, cz, rc - 0.05, rc + 0.2, y4, y4 + 0.15, 12);
        for (let k = 0; k < 8; k++) {
            const a = k / 8 * Math.PI * 2;
            CForgeTowerGen.Lathe(_body, cx + Math.cos(a) * rc * 0.82, cz + Math.sin(a) * rc * 0.82, [[0.07, y4 + 0.15], [0.07, y4 + 1.7]], 6);
        }
        CForgeTowerGen.Ring(_trim, cx, cz, rc * 0.5, rc + 0.12, y4 + 1.7, y4 + 1.85, 12);
        CForgeTowerGen.Lathe(_cap, cx, cz, [[rc * 0.7, y4 + 1.85], [rc * 0.9, y4 + 2.3], [rc * 0.75, y4 + 2.75], [rc * 0.3, y4 + 3.1], [0.06, y4 + 3.3]], 12);
        CForgeArabGen.Finial(_gold, cx, cz, y4 + 3.25, 1.1);
    }
    static Ottoman(_r, F, T) {
        const { L, u } = _r, { P, v, floor, base, ang } = F, D = CForgeArabGen.MosqueDim(_r, F), { S, H, rd } = D;
        const body = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), lead = new CForgeMeshBuf(), gold = new CForgeMeshBuf(), door = new CForgeMeshBuf();
        const ac = -L * 0.5 + S * 0.5 + 0.4, c = P(ac, 0), top = floor + H, ye = top + 0.5;
        const hall = CForgeIncaGen.LocalRect(P, ac, 0, S, S);
        CForgeShape.Extrude(trim, CForgePoly.Offset(hall, 0.1), base, floor + 0.4);
        CForgeShape.Extrude(body, hall, floor + 0.3, top);
        CForgeShape.Extrude(trim, CForgePoly.Offset(hall, 0.12), top - 0.3, top);
        CForgeShape.Cap(lead, hall, top);
        for (let i = 0; i < 4; i++) {
            const a = hall[i], b = hall[(i + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len, nx = tz, nz = -tx;
            const n = Math.max(2, Math.round(len / 2.4));
            for (let k = 0; k < n; k++)
                for (const [y, h] of [[floor + 1.2, 1.5], [floor + 3.6, 1.3], [top - 2.0, 1.1]]) {
                    if (y + h > top - 0.4)
                        continue;
                    const m = (k + 0.5) * len / n;
                    CForgeOpening.Window({ stone: trim, fill: dark, dark }, a[0] + tx * m + nx * 0.02, y, a[1] + tz * m + nz * 0.02, tx, tz, nx, nz, 0.7, h, CForgeOpening.eKind.Round);
                }
        }
        CForgeTowerGen.Lathe(body, c[0], c[1], [[rd * 1.02, top - 0.1], [rd * 1.02, ye + 0.8]], 24);
        for (let k = 0; k < 16; k++)
            CForgeTowerGen.ArchDecal(dark, c[0], c[1], rd * 1.02, k * Math.PI / 8, ye - 0.2, 0.32, 0.8);
        CForgeTowerGen.Ring(trim, c[0], c[1], rd * 0.98, rd * 1.1, ye + 0.75, ye + 0.95, 24);
        CForgeArabGen.Dome(lead, c[0], c[1], rd * 1.04, ye + 0.95, rd * 0.92, 0, Math.PI * 2, 28);
        CForgeArabGen.Finial(gold, c[0], c[1], ye + 0.95 + rd * 0.92 - 0.05, 1.6);
        const ua = Math.atan2(u[1], u[0]);
        for (const s of [-1, 1]) {
            const sc = P(ac + s * S * 0.25, 0), r2 = S * 0.25;
            CForgeArabGen.Dome(lead, sc[0], sc[1], r2, top, r2 * 0.9, ua + (s > 0 ? -Math.PI * 0.5 : Math.PI * 0.5), ua + (s > 0 ? Math.PI * 0.5 : Math.PI * 1.5), 14);
        }
        for (const [sa, sb] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
            const q = P(ac + sa * (S * 0.5 - 0.6), sb * (S * 0.5 - 0.6));
            CForgeTowerGen.Lathe(body, q[0], q[1], [[0.55, top - 0.2], [0.55, top + 1.4]], 8);
            CForgeArabGen.Dome(lead, q[0], q[1], 0.6, top + 1.4, 0.55, 0, Math.PI * 2, 10);
            CForgeArabGen.Finial(gold, q[0], q[1], top + 1.9, 0.6, 1);
        }
        {
            const a0 = ac + S * 0.5, pd = Math.min(3.2, L * 0.5 - a0 + L * 0.5 - 0.6), pa = a0 + pd * 0.5, ph = floor + 4.2, n = Math.max(3, Math.round(S / 3));
            if (pd > 1.5) {
                const pc = P(pa, 0);
                CForgeShape.Box(trim, pc[0], pc[1], pd, S, base, floor + 0.35, ang);
                CForgeShape.Box(body, pc[0], pc[1], pd, S, ph - 0.6, ph, ang);
                for (let k = 0; k <= n; k++) {
                    const q = P(a0 + pd - 0.35, -S * 0.5 + 0.3 + (S - 0.6) * k / n);
                    CForgeTowerGen.Lathe(trim, q[0], q[1], [[0.24, floor + 0.35], [0.2, floor + 0.6], [0.2, ph - 0.85], [0.3, ph - 0.6]], 10);
                }
                for (let k = 0; k < n; k++) {
                    const q = P(pa, -S * 0.5 + (S) * (k + 0.5) / n);
                    CForgeArabGen.Dome(lead, q[0], q[1], Math.min(pd, S / n) * 0.42, ph, Math.min(pd, S / n) * 0.36, 0, Math.PI * 2, 12);
                }
                const dq = P(a0 + 0.02, 0);
                CForgeOpening.Door({ stone: trim, fill: door, dark, door }, dq[0], floor + 0.3, dq[1], v[0], v[1], u[0], u[1], 1.6, 2.8, CForgeOpening.eKind.Round, 2);
            }
        }
        for (const s of [-1, 1])
            CForgeArabGen.Minaret(body, trim, dark, lead, gold, P(ac + S * 0.5 + 0.8, s * (S * 0.5 - 0.2)), ang, D.ms, base, top, floor + D.mh - 4, 1);
        const parts = [
            { buf: body, rgb: T.mStone, tex: CForgeTex.sAshlar }, { buf: trim, rgb: T.mWallCap, tex: CForgeTex.sAshlar }, { buf: dark, rgb: T.mDark },
            { buf: lead, rgb: T.mMetal, tex: CForgeTex.sPlaster }, { buf: gold, rgb: T.mGold }, { buf: door, rgb: T.mWood.map(_v => _v * 1.1), tex: CForgeTex.sPlank },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Maghreb(_r, F, T) {
        const { L, W, fs, u } = _r, { P, V3, v, floor, base } = F, D = CForgeArabGen.MosqueDim(_r, F), H = D.H, Wh = W - 0.6, top = floor + H;
        const body = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), glaze = new CForgeMeshBuf(), wood = new CForgeMeshBuf(), door = new CForgeMeshBuf(), gold = new CForgeMeshBuf(), mina = new CForgeMeshBuf();
        const hall = CForgeIncaGen.LocalRect(P, -D.ms * 0.5, 0, L - D.ms, Wh);
        CForgeShape.Extrude(trim, CForgePoly.Offset(hall, 0.06), base, floor + 0.35);
        CForgeShape.Extrude(body, hall, floor + 0.3, top);
        const n = Math.max(2, Math.round((L - D.ms) / 3.6)), nl = (L - D.ms) / n, a0 = -L * 0.5;
        for (let k = 0; k < n; k++) {
            const W3 = (_a, _b, _y) => V3(_b, _a, _y);
            CForgeShape.GableRoof(glaze, wood, body, W3, -Wh * 0.5, Wh * 0.5, a0 + nl * k, a0 + nl * (k + 1), top, 0.5, 0.25, 0.35, 0.1);
        }
        for (let i = 0; i < 4; i++) {
            const a = hall[i], b = hall[(i + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len, nx = tz, nz = -tx;
            const fr = nx * v[0] * fs + nz * v[1] * fs > 0.7, cnt = Math.max(1, Math.round(len / 3.2));
            for (let k = 0; k < cnt; k++) {
                const m = (k + 0.5) * len / cnt;
                if (fr && Math.abs(m - len * 0.5) < 2.2)
                    continue;
                CForgeOpening.Window({ stone: trim, fill: dark, dark }, a[0] + tx * m + nx * 0.02, floor + 2.6, a[1] + tz * m + nz * 0.02, tx, tz, nx, nz, 0.6, 1.0, CForgeOpening.eKind.Horseshoe);
            }
        }
        {
            const nx = v[0] * fs, nz = v[1] * fs, q = P(-D.ms * 0.5, fs * (Wh * 0.5 + 0.05)), ea = Math.atan2(u[1], u[0]);
            CForgeShape.Box(trim, q[0] + nx * 0.1, q[1] + nz * 0.1, 3.4, 0.24, base, floor + 3.9, ea);
            const fq = P(-D.ms * 0.5, fs * (Wh * 0.5 + 0.23));
            CForgeOpening.Door({ stone: trim, fill: door, dark, door }, fq[0], floor + 0.3, fq[1], u[0], u[1], nx, nz, 1.7, 2.9, CForgeOpening.eKind.Horseshoe, 1);
            const W3 = (_a, _b, _y) => { const p = P(-D.ms * 0.5 + _a, fs * (Wh * 0.5 + 0.2 + _b)); return [p[0], _y, p[1]]; };
            CForgeShape.HipRoof(glaze, wood, W3, -1.9, 1.9, 0, 0.8, floor + 4.1, 0.6, 0.15, 0.08);
        }
        CForgeArabGen.Minaret(mina, trim, dark, glaze, gold, P(L * 0.5 - D.ms * 0.5, fs * (Wh * 0.5 - D.ms * 0.5)), F.ang, D.ms, base, top, floor + D.mh, 2);
        const parts = [
            { buf: body, rgb: T.mPlaster[2] ?? T.mPlaster[0], tex: CForgeTex.sPlaster }, { buf: mina, rgb: T.mTowerBody, tex: CForgeTex.sHangtu }, { buf: trim, rgb: T.mStone, tex: CForgeTex.sAshlar },
            { buf: dark, rgb: T.mDark }, { buf: glaze, rgb: T.mGlaze, tex: CForgeTex.sTile }, { buf: wood, rgb: T.mWood, tex: CForgeTex.sWood },
            { buf: door, rgb: T.mShutter[0], tex: CForgeTex.sPlank }, { buf: gold, rgb: T.mGold },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
}
