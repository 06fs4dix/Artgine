import { CForgeRand } from "../ForgeBuild/CForgeRand.js";
export class CForgeFloraShape {
    static Add(_a, _b) { return [_a[0] + _b[0], _a[1] + _b[1], _a[2] + _b[2]]; }
    static Sub(_a, _b) { return [_a[0] - _b[0], _a[1] - _b[1], _a[2] - _b[2]]; }
    static Mul(_a, _s) { return [_a[0] * _s, _a[1] * _s, _a[2] * _s]; }
    static Dot(_a, _b) { return _a[0] * _b[0] + _a[1] * _b[1] + _a[2] * _b[2]; }
    static Cross(_a, _b) { return [_a[1] * _b[2] - _a[2] * _b[1], _a[2] * _b[0] - _a[0] * _b[2], _a[0] * _b[1] - _a[1] * _b[0]]; }
    static Len(_a) { return Math.hypot(_a[0], _a[1], _a[2]); }
    static Nor(_a) { const l = CForgeFloraShape.Len(_a) || 1; return [_a[0] / l, _a[1] / l, _a[2] / l]; }
    static Lerp(_a, _b, _t) { return [_a[0] + (_b[0] - _a[0]) * _t, _a[1] + (_b[1] - _a[1]) * _t, _a[2] + (_b[2] - _a[2]) * _t]; }
    static Perp(_a) { return CForgeFloraShape.Nor(CForgeFloraShape.Cross(_a, Math.abs(_a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])); }
    static Rot(_v, _axis, _ang) {
        const c = Math.cos(_ang), s = Math.sin(_ang), d = CForgeFloraShape.Dot(_axis, _v), x = CForgeFloraShape.Cross(_axis, _v);
        return [_v[0] * c + x[0] * s + _axis[0] * d * (1 - c), _v[1] * c + x[1] * s + _axis[1] * d * (1 - c), _v[2] * c + x[2] * s + _axis[2] * d * (1 - c)];
    }
    static RandDir(_r) {
        const y = _r.Range(-1, 1), a = _r.Range(0, Math.PI * 2), s = Math.sqrt(1 - y * y);
        return [Math.cos(a) * s, y, Math.sin(a) * s];
    }
    static At(_p, _t) {
        const seg = [];
        let L = 0;
        for (let i = 1; i < _p.length; i++) {
            const l = CForgeFloraShape.Len(CForgeFloraShape.Sub(_p[i], _p[i - 1]));
            seg.push(l);
            L += l;
        }
        let s = Math.max(0, Math.min(1, _t)) * L;
        for (let i = 0; i < seg.length; i++) {
            if (s <= seg[i] || i == seg.length - 1) {
                const f = seg[i] > 0 ? Math.min(1, s / seg[i]) : 0;
                return { p: CForgeFloraShape.Lerp(_p[i], _p[i + 1], f), d: CForgeFloraShape.Nor(CForgeFloraShape.Sub(_p[i + 1], _p[i])), i, f };
            }
            s -= seg[i];
        }
        return { p: _p[0], d: [0, 1, 0], i: 0, f: 0 };
    }
    static Tube(_b, _p, _r, _side, _o) {
        const S = CForgeFloraShape, n = _p.length;
        if (n < 2)
            return;
        const T = _p.map((_q, _i) => S.Nor(S.Sub(_p[Math.min(n - 1, _i + 1)], _p[Math.max(0, _i - 1)])));
        let N = S.Perp(T[0]), v = _o.v0 ?? 0, prev = -1;
        for (let i = 0; i < n; i++) {
            if (i > 0) {
                const t = S.Sub(N, S.Mul(T[i], S.Dot(N, T[i])));
                N = S.Len(t) < 1e-6 ? S.Perp(T[i]) : S.Nor(t);
                v += S.Len(S.Sub(_p[i], _p[i - 1])) * _o.vScale;
            }
            const B = S.Cross(T[i], N), base = _b.Count();
            for (let k = 0; k <= _side; k++) {
                const a = k / _side * Math.PI * 2, d = S.Add(S.Mul(N, Math.cos(a)), S.Mul(B, Math.sin(a)));
                _b.Vert(S.Add(_p[i], S.Mul(d, _r[i])), _o.u0 + (_o.u1 - _o.u0) * k / _side, v + 0.01, d, _o.slot, _o.flex[i]);
            }
            if (prev >= 0)
                for (let k = 0; k < _side; k++) {
                    const a = prev + k, b = prev + k + 1, c = base + k + 1, d = base + k;
                    const f = S.Add([_b.mNor[a * 3], _b.mNor[a * 3 + 1], _b.mNor[a * 3 + 2]], [_b.mNor[c * 3], _b.mNor[c * 3 + 1], _b.mNor[c * 3 + 2]]);
                    _b.Tri(a, b, c, f);
                    _b.Tri(a, c, d, f);
                }
            prev = base;
        }
    }
    static Card(_b, _o, _ax, _ay, _uv, _n, _slot, _f) {
        const S = CForgeFloraShape;
        const p = [_o, S.Add(_o, _ax), S.Add(S.Add(_o, _ax), _ay), S.Add(_o, _ay)];
        const uv = [[_uv[0], _uv[1]], [_uv[2], _uv[1]], [_uv[2], _uv[3]], [_uv[0], _uv[3]]];
        const i = p.map((_q, _k) => _b.Vert(_q, uv[_k][0], uv[_k][1], _n, _slot, _f[_k]));
        const fn = S.Cross(_ax, _ay);
        _b.TwoSide(i[0], i[1], i[2], fn);
        _b.TwoSide(i[0], i[2], i[3], fn);
    }
    static Blade(_b, _base, _yaw, _h, _w, _lean, _bend, _seg, _u0, _u1, _slot, _hMax) {
        const S = CForgeFloraShape, d = [Math.cos(_yaw), 0, Math.sin(_yaw)], side = [-d[2], 0, d[0]], L = _h / _seg;
        let p = _base, prevL = -1, prevR = -1;
        for (let k = 0; k <= _seg; k++) {
            const t = k / _seg, th = _lean + _bend * t;
            const T = S.Add(S.Mul(d, Math.sin(th)), [0, Math.cos(th), 0]);
            let n = S.Cross(side, T);
            if (n[1] < 0)
                n = S.Mul(n, -1);
            n = S.Nor(S.Add(S.Nor(n), [0, 0.6, 0]));
            const flex = Math.pow(Math.max(0, Math.min(1, p[1] / _hMax)), 1.5);
            const v = 0.02 + 0.96 * t;
            if (k < _seg) {
                const hw = _w * 0.5 * Math.pow(1 - t, 0.6);
                const l = _b.Vert(S.Sub(p, S.Mul(side, hw)), _u0, v, n, _slot, flex);
                const r = _b.Vert(S.Add(p, S.Mul(side, hw)), _u1, v, n, _slot, flex);
                if (prevL >= 0) {
                    _b.TwoSide(prevL, prevR, r, n);
                    _b.TwoSide(prevL, r, l, n);
                }
                prevL = l;
                prevR = r;
            }
            else {
                const tip = _b.Vert(p, (_u0 + _u1) * 0.5, v, n, _slot, flex);
                _b.TwoSide(prevL, prevR, tip, n);
            }
            p = S.Add(p, S.Mul(T, L));
        }
    }
    static BladeTip(_base, _yaw, _h, _lean, _bend, _seg) {
        const S = CForgeFloraShape, d = [Math.cos(_yaw), 0, Math.sin(_yaw)], L = _h / _seg;
        let p = _base, T = [0, 1, 0];
        for (let k = 0; k < _seg; k++) {
            const th = _lean + _bend * k / _seg;
            T = S.Add(S.Mul(d, Math.sin(th)), [0, Math.cos(th), 0]);
            p = S.Add(p, S.Mul(T, L));
        }
        return { p, d: T };
    }
    static Frond(_b, _base, _yaw, _h, _w, _lean, _bend, _seg, _uv, _slot, _hMax) {
        const S = CForgeFloraShape, d = [Math.cos(_yaw), 0, Math.sin(_yaw)], side = [-d[2], 0, d[0]], L = _h / _seg;
        let p = _base, prevL = -1, prevR = -1;
        for (let k = 0; k <= _seg; k++) {
            const t = k / _seg, th = _lean + _bend * t;
            const T = S.Add(S.Mul(d, Math.sin(th)), [0, Math.cos(th), 0]);
            let n = S.Cross(side, T);
            if (n[1] < 0)
                n = S.Mul(n, -1);
            n = S.Nor(S.Add(S.Nor(n), [0, 0.5, 0]));
            const flex = Math.pow(Math.max(0, Math.min(1, p[1] / _hMax)), 1.5) * 0.5 + t * 0.5;
            const hw = _w * 0.5 * (1 - 0.35 * t), v = _uv[1] + (_uv[3] - _uv[1]) * t;
            const l = _b.Vert(S.Sub(p, S.Mul(side, hw)), _uv[0], v, n, _slot, flex);
            const r = _b.Vert(S.Add(p, S.Mul(side, hw)), _uv[2], v, n, _slot, flex);
            if (prevL >= 0) {
                _b.TwoSide(prevL, prevR, r, n);
                _b.TwoSide(prevL, r, l, n);
            }
            prevL = l;
            prevR = r;
            p = S.Add(p, S.Mul(T, L));
        }
    }
    static Icosphere(_sub) {
        const t = (1 + Math.sqrt(5)) / 2;
        let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(_q => CForgeFloraShape.Nor(_q));
        let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
        for (let s = 0; s < _sub; s++) {
            const mid = new Map(), nf = [];
            const M = (_a, _c) => {
                const k = _a < _c ? _a + "_" + _c : _c + "_" + _a;
                let i = mid.get(k);
                if (i == null) {
                    i = v.push(CForgeFloraShape.Nor(CForgeFloraShape.Lerp(v[_a], v[_c], 0.5))) - 1;
                    mid.set(k, i);
                }
                return i;
            };
            for (const [a, b, c] of f) {
                const ab = M(a, b), bc = M(b, c), ca = M(c, a);
                nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
            }
            f = nf;
        }
        return { v, f };
    }
    static Noise3(_x, _y, _z, _seed) {
        const xi = Math.floor(_x), yi = Math.floor(_y), zi = Math.floor(_z);
        const S = (_t) => _t * _t * (3 - 2 * _t);
        const u = S(_x - xi), v = S(_y - yi), w = S(_z - zi);
        const H = (_i, _j, _k) => CForgeRand.Hash(xi + _i, yi + _j, zi + _k, _seed) / 4294967296;
        const L = (_a, _b, _t) => _a + (_b - _a) * _t;
        return L(L(L(H(0, 0, 0), H(1, 0, 0), u), L(H(0, 1, 0), H(1, 1, 0), u), v), L(L(H(0, 0, 1), H(1, 0, 1), u), L(H(0, 1, 1), H(1, 1, 1), u), v), w);
    }
    static Fbm3(_x, _y, _z, _oct, _seed) {
        let s = 0, amp = 0.5, n = 0, f = 1;
        for (let o = 0; o < _oct; o++) {
            s += CForgeFloraShape.Noise3(_x * f, _y * f, _z * f, _seed + o * 101) * amp;
            n += amp;
            amp *= 0.5;
            f *= 2;
        }
        return s / n;
    }
}
