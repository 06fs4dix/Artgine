import { CForgeScene } from "./CForgeScene.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeSpline } from "./CForgeSpline.js";
export class CForgeShape {
    static Band(_b, _c, _s, _half, _y0, _y1, _o = {}, _shift = null) {
        const n = _s.length;
        if (n < 2)
            return;
        const o = { top: true, bottom: false, left: true, right: true, cap0: true, cap1: true, ..._o };
        const L = [], R = [], T = [], D = [], fr = [];
        let px = 0, pz = 0, p0 = 0, p1 = 0, ut = _s[0], ud = _s[0];
        for (let i = 0; i < n; i++) {
            const a = _c.At(_s[i]), h = _half(_s[i]), sh = _shift ? _shift(_s[i]) : 0;
            const nx = -a.tz, nz = a.tx, x = a.p[0] + nx * sh, z = a.p[1] + nz * sh;
            const lx = x + nx * h, lz = z + nz * h, rx = x - nx * h, rz = z - nz * h, y0 = _y0(_s[i]), y1 = _y1(_s[i]);
            const u = _s[i];
            if (i > 0) {
                const d = Math.hypot(x - px, z - pz);
                ut += Math.hypot(d, y1 - p1);
                ud += Math.hypot(d, y0 - p0);
            }
            px = x;
            pz = z;
            p0 = y0;
            p1 = y1;
            fr.push({ tx: a.tx, tz: a.tz });
            if (o.left)
                L.push(_b.Vert(lx, y0, lz, u, y0, nx, 0, nz), _b.Vert(lx, y1, lz, u, y1, nx, 0, nz));
            if (o.right)
                R.push(_b.Vert(rx, y0, rz, u, y0, -nx, 0, -nz), _b.Vert(rx, y1, rz, u, y1, -nx, 0, -nz));
            if (o.top)
                T.push(_b.Vert(lx, y1, lz, ut, 0, 0, 1, 0), _b.Vert(rx, y1, rz, ut, h * 2, 0, 1, 0));
            if (o.bottom)
                D.push(_b.Vert(lx, y0, lz, ud, 0, 0, -1, 0), _b.Vert(rx, y0, rz, ud, h * 2, 0, -1, 0));
        }
        for (let i = 0; i + 1 < n; i++) {
            const nx = -fr[i].tz, nz = fr[i].tx, k = i * 2;
            if (o.left)
                _b.QuadIdx(L[k], L[k + 2], L[k + 3], L[k + 1], nx, 0, nz);
            if (o.right)
                _b.QuadIdx(R[k], R[k + 2], R[k + 3], R[k + 1], -nx, 0, -nz);
            if (o.top)
                _b.QuadIdx(T[k], T[k + 2], T[k + 3], T[k + 1], 0, 1, 0);
            if (o.bottom)
                _b.QuadIdx(D[k], D[k + 2], D[k + 3], D[k + 1], 0, -1, 0);
        }
        const P = (k) => [_b.mPos[k * 3] / CForgeScene.sUnit, _b.mPos[k * 3 + 1] / CForgeScene.sUnit, _b.mPos[k * 3 + 2] / CForgeScene.sUnit];
        for (const [on, i, sg] of [[o.cap0, 0, -1], [o.cap1, n - 1, 1]]) {
            if (!on || !o.left || !o.right)
                continue;
            const f = fr[i], k = i * 2;
            _b.Quad([P(L[k]), P(R[k]), P(R[k + 1]), P(L[k + 1])], null, [f.tx * sg, 0, f.tz * sg]);
        }
    }
    static Wedge(_b, _cx, _cz, _tx, _tz, _nx, _nz, _w, _d0, _d1, _y0, _y1) {
        const hw = _w * 0.5;
        const p = (s, d, y) => [_cx + _tx * s + _nx * d, y, _cz + _tz * s + _nz * d];
        const a0 = p(-hw, 0, _y0), b0 = p(hw, 0, _y0), c0 = p(hw, _d0, _y0), e0 = p(-hw, _d0, _y0);
        const a1 = p(-hw, 0, _y1), b1 = p(hw, 0, _y1), c1 = p(hw, _d1, _y1), e1 = p(-hw, _d1, _y1);
        const slope = (_d0 - _d1) / Math.max(1e-3, _y1 - _y0);
        const uv = null;
        _b.Quad([e0, c0, c1, e1], uv, [_nx, slope, _nz]);
        _b.Quad([a0, e0, e1, a1], uv, [-_tx, 0, -_tz]);
        _b.Quad([c0, b0, b1, c1], uv, [_tx, 0, _tz]);
        _b.Quad([a1, e1, c1, b1], uv, [0, 1, 0]);
    }
    static Decal(_b, _cx, _cy, _cz, _tx, _tz, _nx, _nz, _w, _h) {
        const hw = _w * 0.5, hh = _h * 0.5, x = _cx + _nx * 0.02, z = _cz + _nz * 0.02;
        _b.Quad([[x - _tx * hw, _cy - hh, z - _tz * hw], [x + _tx * hw, _cy - hh, z + _tz * hw], [x + _tx * hw, _cy + hh, z + _tz * hw], [x - _tx * hw, _cy + hh, z - _tz * hw]], [[0, 0], [1, 0], [1, 1], [0, 1]], [_nx, 0, _nz]);
    }
    static sGreen = [0.36, 0.55, 0.25];
    static Bush(_b, _cx, _y0, _cz, _r, _h, _seg = 7) {
        const prof = [[0, _h], [0.55, 0.93], [0.95, 0.62], [1, 0.3], [0.78, 0]];
        const base = _b.Count(), cy = _y0 + _h * 0.35;
        for (let i = 0; i < prof.length; i++)
            for (let k = 0; k <= _seg; k++) {
                const a = k / _seg * Math.PI * 2 + i * 0.4, r = prof[i][0] * _r, y = i == 0 ? _y0 + _h : _y0 + prof[i][1] * _h;
                const x = _cx + Math.cos(a) * r, z = _cz + Math.sin(a) * r;
                _b.Vert(x, y, z, k / _seg, i, x - _cx, (y - cy) * 1.4, z - _cz);
            }
        const W = _seg + 1;
        for (let i = 0; i + 1 < prof.length; i++)
            for (let k = 0; k < _seg; k++) {
                const a = (k + 0.5) / _seg * Math.PI * 2, i0 = base + i * W + k;
                if (i == 0)
                    _b.Tri(i0, i0 + W + 1, i0 + W, Math.cos(a), 1, Math.sin(a));
                else
                    _b.QuadIdx(i0, i0 + 1, i0 + W + 1, i0 + W, Math.cos(a), 0.3, Math.sin(a));
            }
    }
    static Box(_b, _cx, _cz, _w, _d, _y0, _y1, _a = 0) {
        const cs = Math.cos(_a), sn = Math.sin(_a), hw = _w * 0.5, hd = _d * 0.5;
        const P = (x, z, y) => [_cx + x * cs - z * sn, y, _cz + x * sn + z * cs];
        const uv = null;
        const c = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
        for (let i = 0; i < 4; i++) {
            const a = c[i], d = c[(i + 1) % 4], ex = d[0] - a[0], ez = d[1] - a[1], l = Math.hypot(ex, ez);
            const nx = ez / l, nz = -ex / l;
            _b.Quad([P(a[0], a[1], _y0), P(d[0], d[1], _y0), P(d[0], d[1], _y1), P(a[0], a[1], _y1)], uv, [nx * cs - nz * sn, 0, nx * sn + nz * cs]);
        }
        _b.Quad([P(-hw, -hd, _y1), P(hw, -hd, _y1), P(hw, hd, _y1), P(-hw, hd, _y1)], uv, [0, 1, 0]);
    }
    static Ishigaki(_b, _cx, _cz, _w, _sp, _y0, _y1, _a = 0, _m = 5) {
        const cs = Math.cos(_a), sn = Math.sin(_a), h = Math.max(1e-3, _y1 - _y0);
        const P = (x, z, y) => [_cx + x * cs - z * sn, y, _cz + x * sn + z * cs];
        const O = (_t) => _w * 0.5 + _sp * (1 - _t) * (1 - _t), c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        for (let i = 0; i < 4; i++) {
            const a = c[i], d = c[(i + 1) % 4], nx = Math.sign(d[1] - a[1]), nz = -Math.sign(d[0] - a[0]), ex = Math.sign(d[0] - a[0]), ez = Math.sign(d[1] - a[1]);
            const ua = a[0] * ex + a[1] * ez, ud = d[0] * ex + d[1] * ez;
            for (let k = 0; k < _m; k++) {
                const t0 = k / _m, t1 = (k + 1) / _m, o0 = O(t0), o1 = O(t1), ya = _y0 + h * t0, yb = _y0 + h * t1, up = 2 * _sp * (1 - (t0 + t1) * 0.5) / h;
                _b.Quad([P(a[0] * o0, a[1] * o0, ya), P(d[0] * o0, d[1] * o0, ya), P(d[0] * o1, d[1] * o1, yb), P(a[0] * o1, a[1] * o1, yb)], [[ua * o0 + 64, ya], [ud * o0 + 64, ya], [ud * o1 + 64, yb], [ua * o1 + 64, yb]], [nx * cs - nz * sn, up, nx * sn + nz * cs]);
            }
        }
        _b.Quad(c.map(([x, z]) => P(x * _w * 0.5, z * _w * 0.5, _y1)), null, [0, 1, 0]);
    }
    static Wall(_b, _s, _thick, _ground, _sink = 0.4) {
        const n = _s.length;
        if (n < 2)
            return;
        const fr = CForgeSpline.Frames(_s), closed = CForgeSpline.IsClosed(_s), h = _thick * 0.5;
        const L = [], R = [], TL = [], TR = [];
        let u = 0;
        for (let i = 0; i < n; i++) {
            if (i > 0)
                u += Math.hypot(_s[i][0] - _s[i - 1][0], _s[i][1] - _s[i - 1][1]);
            const f = fr[i], x = _s[i][0], z = _s[i][1];
            const lx = x + f.nx * h, lz = z + f.nz * h, rx = x - f.nx * h, rz = z - f.nz * h;
            const g = Math.min(_ground(lx, lz), _ground(rx, rz)), top = Math.max(_ground(lx, lz), _ground(rx, rz)) + _s[i][2];
            L.push(_b.Vert(lx, g - _sink, lz, u, g - _sink, f.nx, 0, f.nz), _b.Vert(lx, top, lz, u, top, f.nx, 0, f.nz));
            R.push(_b.Vert(rx, g - _sink, rz, u, g - _sink, -f.nx, 0, -f.nz), _b.Vert(rx, top, rz, u, top, -f.nx, 0, -f.nz));
            TL.push(_b.Vert(lx, top, lz, u, 0, 0, 1, 0));
            TR.push(_b.Vert(rx, top, rz, u, _thick, 0, 1, 0));
        }
        for (let i = 0; i + 1 < n; i++) {
            const f = fr[i];
            _b.QuadIdx(L[i * 2], L[i * 2 + 2], L[i * 2 + 3], L[i * 2 + 1], f.nx, 0, f.nz);
            _b.QuadIdx(R[i * 2], R[i * 2 + 2], R[i * 2 + 3], R[i * 2 + 1], -f.nx, 0, -f.nz);
            _b.QuadIdx(TL[i], TL[i + 1], TR[i + 1], TR[i], 0, 1, 0);
        }
        if (!closed) {
            for (const [i, s] of [[0, -1], [n - 1, 1]]) {
                const f = fr[i];
                const a = _b.mPos, U = 1 / CForgeScene.sUnit;
                const P = (k) => [a[k * 3] * U, a[k * 3 + 1] * U, a[k * 3 + 2] * U];
                _b.Quad([P(L[i * 2]), P(R[i * 2]), P(R[i * 2 + 1]), P(L[i * 2 + 1])], null, [f.tx * s, 0, f.tz * s]);
            }
        }
    }
    static GroundMax(_g, _x, _z, _r) {
        const y = _g(_x, _z);
        if (_r <= 0)
            return y;
        return Math.max(y, _g(_x + _r, _z), _g(_x - _r, _z), _g(_x, _z + _r), _g(_x, _z - _r));
    }
    static Ribbon(_b, _s, _width, _ground, _lift = 0.04, _reach = 0) {
        const n = _s.length;
        if (n < 2)
            return;
        const fr = CForgeSpline.Frames(_s), h = _width * 0.5, m = Math.max(1, Math.ceil(_width / 0.8)), idx = [];
        let u = 0;
        for (let i = 0; i < n; i++) {
            if (i > 0)
                u += Math.hypot(_s[i][0] - _s[i - 1][0], _s[i][1] - _s[i - 1][1]);
            const f = fr[i];
            for (let j = 0; j <= m; j++) {
                const v = -h + _width * j / m, x = _s[i][0] + f.nx * v, z = _s[i][1] + f.nz * v;
                const y = CForgeShape.GroundMax(_ground, x, z, _reach) + _lift;
                idx.push(_b.Vert(x, y, z, u, v + h, _ground(x - 0.5, z) - _ground(x + 0.5, z), 1, _ground(x, z - 0.5) - _ground(x, z + 0.5)));
            }
        }
        const W = m + 1;
        for (let i = 0; i + 1 < n; i++)
            for (let j = 0; j < m; j++) {
                const k = i * W + j;
                _b.QuadIdx(idx[k], idx[k + W], idx[k + W + 1], idx[k + 1], 0, 1, 0);
            }
    }
    static Prism(_b, _cx, _cz, _r0, _r1, _y0, _y1, _seg) {
        const slope = (_r0 - _r1) / Math.max(1e-3, _y1 - _y0), base = _b.Count();
        for (let i = 0; i <= _seg; i++) {
            const a = i / _seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
            _b.Vert(_cx + c * _r0, _y0, _cz + s * _r0, i / _seg, 0, c, slope, s);
            _b.Vert(_cx + c * _r1, _y1, _cz + s * _r1, i / _seg, 1, c, slope, s);
        }
        for (let i = 0; i < _seg; i++) {
            const a = (i + 0.5) / _seg * Math.PI * 2, k = base + i * 2;
            _b.QuadIdx(k, k + 2, k + 3, k + 1, Math.cos(a), 0, Math.sin(a));
        }
    }
    static Cone(_b, _cx, _cz, _r, _y0, _h, _seg) {
        const slope = _r / Math.max(1e-3, _h);
        for (let i = 0; i < _seg; i++) {
            const a0 = i / _seg * Math.PI * 2, a1 = (i + 1) / _seg * Math.PI * 2, am = (a0 + a1) * 0.5;
            const i0 = _b.Vert(_cx + Math.cos(a0) * _r, _y0, _cz + Math.sin(a0) * _r, 0, 0, Math.cos(a0), slope, Math.sin(a0));
            const i1 = _b.Vert(_cx + Math.cos(a1) * _r, _y0, _cz + Math.sin(a1) * _r, 1, 0, Math.cos(a1), slope, Math.sin(a1));
            const i2 = _b.Vert(_cx, _y0 + _h, _cz, 0.5, 1, Math.cos(am), slope, Math.sin(am));
            _b.Tri(i0, i1, i2, Math.cos(am), slope, Math.sin(am));
        }
    }
    static Cap(_b, _poly, _y, _up = true) {
        const p = CForgePoly.Orient(_poly), tri = CForgePoly.Triangulate(p), ny = _up ? 1 : -1, base = _b.Count();
        for (const q of p)
            _b.Vert(q[0], _y, q[1], q[0], q[1], 0, ny, 0);
        for (let t = 0; t < tri.length; t += 3)
            _b.Tri(base + tri[t], base + tri[t + 1], base + tri[t + 2], 0, ny, 0);
    }
    static Extrude(_b, _poly, _y0, _y1) {
        const p = CForgePoly.Orient(_poly), n = p.length;
        const Y0 = typeof _y0 == "number" ? () => _y0 : _y0;
        let u = 0;
        for (let i = 0; i < n; i++) {
            const a = p[i], c = p[(i + 1) % n], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
            if (l < 1e-6)
                continue;
            const nx = (c[1] - a[1]) / l, nz = -(c[0] - a[0]) / l;
            _b.Quad([[a[0], Y0(a), a[1]], [c[0], Y0(c), c[1]], [c[0], _y1, c[1]], [a[0], _y1, a[1]]], [[u, Y0(a)], [u + l, Y0(c)], [u + l, _y1], [u, _y1]], [nx, 0, nz]);
            u += l;
        }
    }
    static LocalDir(W, _na, _nb, _ny) {
        const o = W(0, 0, 0), ua = W(1, 0, 0), ub = W(0, 1, 0);
        return [(ua[0] - o[0]) * _na + (ub[0] - o[0]) * _nb, _ny, (ua[2] - o[2]) * _na + (ub[2] - o[2]) * _nb];
    }
    static GableRoof(_roof, _under, _gable, W, a0, a1, b0, b1, _ye, _k, _e, _eg, _t) {
        const hw = (b1 - b0) * 0.5, bc = (b0 + b1) * 0.5, yr = _ye + hw * _k, ye = _ye - _e * _k, tt = _t * Math.sqrt(1 + _k * _k), A0 = a0 - _eg, A1 = a1 + _eg;
        const D = (_na, _nb, _ny) => CForgeShape.LocalDir(W, _na, _nb, _ny);
        for (const s of [1, -1]) {
            const eb = bc + s * (hw + _e);
            _roof.Quad([W(A0, eb, ye + tt), W(A1, eb, ye + tt), W(A1, bc, yr + tt), W(A0, bc, yr + tt)], null, D(0, s * _k, 1));
            _under.Quad([W(A0, eb, ye), W(A1, eb, ye), W(A1, bc, yr), W(A0, bc, yr)], null, D(0, -s * _k, -1));
            _roof.Quad([W(A0, eb, ye), W(A1, eb, ye), W(A1, eb, ye + tt), W(A0, eb, ye + tt)], null, D(0, s, 0));
            for (const [a, sa] of [[A0, -1], [A1, 1]])
                _roof.Quad([W(a, eb, ye), W(a, eb, ye + tt), W(a, bc, yr + tt), W(a, bc, yr)], null, D(sa, 0, 0));
        }
        if (_gable != null)
            for (const [a, sa] of [[a0, -1], [a1, 1]])
                _gable.Poly([W(a, b0, _ye), W(a, b1, _ye), W(a, bc, yr - 0.02)], D(sa, 0, 0));
        return yr + tt;
    }
    static HipRoof(_roof, _under, W, a0, a1, b0, b1, _ye, _k, _e, _t) {
        const A0 = a0 - _e, A1 = a1 + _e, B0 = b0 - _e, B1 = b1 + _e, ye = _ye - _e * _k, h = Math.min(A1 - A0, B1 - B0) * 0.5, bc = (B0 + B1) * 0.5, ac = (A0 + A1) * 0.5;
        const longA = A1 - A0 >= B1 - B0, yr = ye + h * _k, tt = _t * Math.sqrt(1 + _k * _k);
        const r0 = longA ? [A0 + h, bc] : [ac, B0 + h], r1 = longA ? [A1 - h, bc] : [ac, B1 - h];
        const D = (_na, _nb, _ny) => CForgeShape.LocalDir(W, _na, _nb, _ny);
        const Near = (_p) => Math.hypot(_p[0] - r0[0], _p[1] - r0[1]) <= Math.hypot(_p[0] - r1[0], _p[1] - r1[1]) ? r0 : r1;
        const C = [[A0, B0], [A1, B0], [A1, B1], [A0, B1]];
        for (let i = 0; i < 4; i++) {
            const p = C[i], q = C[(i + 1) % 4], alongA = Math.abs(p[1] - q[1]) < 1e-6;
            const na = alongA ? 0 : Math.sign(p[0] - ac), nb = alongA ? Math.sign(p[1] - bc) : 0, rp = Near(p), rq = Near(q);
            for (const [buf, dy, sg] of [[_roof, tt, 1], [_under, 0, -1]]) {
                const n = D(na * _k * sg, nb * _k * sg, sg);
                if (rp == rq)
                    buf.Poly([W(p[0], p[1], ye + dy), W(q[0], q[1], ye + dy), W(rp[0], rp[1], yr + dy)], n);
                else
                    buf.Quad([W(p[0], p[1], ye + dy), W(q[0], q[1], ye + dy), W(rq[0], rq[1], yr + dy), W(rp[0], rp[1], yr + dy)], null, n);
            }
            _roof.Quad([W(p[0], p[1], ye), W(q[0], q[1], ye), W(q[0], q[1], ye + tt), W(p[0], p[1], ye + tt)], null, D(na, nb, 0));
        }
        return yr + tt;
    }
    static Frustum(_b, _cx, _cz, _w0, _d0, _w1, _d1, _y0, _y1, _a = 0, _dz = 0) {
        const cs = Math.cos(_a), sn = Math.sin(_a);
        const P = (x, z, y) => [_cx + x * cs - z * sn, y, _cz + x * sn + z * cs];
        const B = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [x * _w0 * 0.5, z * _d0 * 0.5]);
        const T = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [x * _w1 * 0.5, z * _d1 * 0.5 + _dz]);
        const h = Math.max(1e-4, _y1 - _y0);
        for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4, ex = B[j][0] - B[i][0], ez = B[j][1] - B[i][1], l = Math.hypot(ex, ez) || 1, nx = ez / l, nz = -ex / l;
            const mb = [(B[i][0] + B[j][0]) * 0.5, (B[i][1] + B[j][1]) * 0.5], mt = [(T[i][0] + T[j][0]) * 0.5, (T[i][1] + T[j][1]) * 0.5];
            const ny = ((mb[0] - mt[0]) * nx + (mb[1] - mt[1]) * nz) / h;
            const q = [P(B[i][0], B[i][1], _y0), P(B[j][0], B[j][1], _y0), P(T[j][0], T[j][1], _y1), P(T[i][0], T[i][1], _y1)];
            const n = [nx * cs - nz * sn, ny, nx * sn + nz * cs];
            if (Math.hypot(T[j][0] - T[i][0], T[j][1] - T[i][1]) < 1e-5)
                _b.Poly([q[0], q[1], q[2]], n);
            else
                _b.Quad(q, null, n);
        }
        if (_w1 > 1e-4 && _d1 > 1e-4)
            _b.Quad(T.map(_t => P(_t[0], _t[1], _y1)), null, [0, 1, 0]);
    }
    static Parapet(_b, _poly, _t, _y0, _y1) {
        const p = CForgePoly.Orient(_poly), q = CForgePoly.Offset(p, -_t, 50), n = p.length;
        CForgeShape.Extrude(_b, p, _y0, _y1);
        if (q.length != n)
            return;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n, a = q[i], c = q[j], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
            if (l < 1e-6)
                continue;
            const tx = (c[0] - a[0]) / l, tz = (c[1] - a[1]) / l;
            _b.Quad([[a[0], _y0, a[1]], [c[0], _y0, c[1]], [c[0], _y1, c[1]], [a[0], _y1, a[1]]], null, [-tz, 0, tx]);
            _b.Quad([[p[i][0], _y1, p[i][1]], [p[j][0], _y1, p[j][1]], [c[0], _y1, c[1]], [a[0], _y1, a[1]]], null, [0, 1, 0]);
        }
    }
    static Pyramid(_b, _poly, _y, _h, _eave = 0.4) {
        const p = CForgePoly.Offset(_poly, _eave), c = CForgePoly.Centroid(p), n = p.length;
        for (let i = 0; i < n; i++) {
            const a = p[i], d = p[(i + 1) % n];
            const ex = d[0] - a[0], ez = d[1] - a[1], fx = c[0] - a[0], fy = _h, fz = c[1] - a[1];
            const nx = -ez * fy, ny = ez * fx - ex * fz, nz = ex * fy;
            const s = ny < 0 ? -1 : 1;
            if (Math.hypot(ex, ez) < 1e-4)
                continue;
            _b.Poly([[a[0], _y, a[1]], [d[0], _y, d[1]], [c[0], _y + _h, c[1]]], [nx * s, ny * s, nz * s]);
        }
        CForgeShape.Cap(_b, p, _y, false);
    }
}
