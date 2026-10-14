export class CForgeCurve {
    mPts;
    mCum = [0];
    mLen = 0;
    mClosed;
    constructor(_pts) {
        this.mPts = _pts;
        this.mClosed = CForgeSpline.IsClosed(_pts);
        for (let i = 1; i < _pts.length; i++)
            this.mCum.push(this.mCum[i - 1] + Math.hypot(_pts[i][0] - _pts[i - 1][0], _pts[i][1] - _pts[i - 1][1]));
        this.mLen = this.mCum[this.mCum.length - 1];
    }
    At(_s) {
        const P = this.mPts, C = this.mCum, L = this.mLen;
        let s = _s;
        if (this.mClosed && L > 0)
            s = ((s % L) + L) % L;
        s = Math.min(L, Math.max(0, s));
        let lo = 0, hi = C.length - 1;
        while (hi - lo > 1) {
            const m = (lo + hi) >> 1;
            if (C[m] <= s)
                lo = m;
            else
                hi = m;
        }
        const seg = C[hi] - C[lo], t = seg > 1e-9 ? (s - C[lo]) / seg : 0;
        const a = P[lo], b = P[hi];
        let tx = b[0] - a[0], tz = b[1] - a[1];
        const l = Math.hypot(tx, tz) || 1;
        return { p: a.map((_v, _k) => _v + (b[_k] - _v) * t), tx: tx / l, tz: tz / l };
    }
    Steps(_s0, _s1, _step) {
        const out = [_s0], gap = _step * 0.1;
        for (let k = Math.floor(_s0 / _step) + 1; k * _step < _s1 - gap; k++)
            if (k * _step > _s0 + gap)
                out.push(k * _step);
        out.push(_s1);
        return out;
    }
}
export class CForgeSpline {
    static sDense = 12;
    static IsClosed(_pts) {
        if (_pts.length < 3)
            return false;
        const a = _pts[0], b = _pts[_pts.length - 1];
        return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-3;
    }
    static Eval(_p0, _p1, _p2, _p3, _t, _out) {
        const D = (a, b) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
        const t0 = 0, t1 = t0 + D(_p0, _p1), t2 = t1 + D(_p1, _p2), t3 = t2 + D(_p2, _p3);
        const t = t1 + (t2 - t1) * _t;
        for (let k = 0; k < _p1.length; k++) {
            const a1 = (t1 - t) / (t1 - t0) * _p0[k] + (t - t0) / (t1 - t0) * _p1[k];
            const a2 = (t2 - t) / (t2 - t1) * _p1[k] + (t - t1) / (t2 - t1) * _p2[k];
            const a3 = (t3 - t) / (t3 - t2) * _p2[k] + (t - t2) / (t3 - t2) * _p3[k];
            const b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2;
            const b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3;
            _out[k] = (t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2;
        }
    }
    static Dense(_pts) {
        const closed = CForgeSpline.IsClosed(_pts);
        const p = closed ? _pts.slice(0, -1) : _pts.slice();
        const n = p.length;
        if (n < 2)
            return p.map(q => q.slice());
        const Get = (i) => {
            if (closed)
                return p[((i % n) + n) % n];
            if (i < 0)
                return p[0].map((v, k) => k < 2 ? 2 * p[0][k] - p[1][k] : v);
            if (i >= n)
                return p[n - 1].map((v, k) => k < 2 ? 2 * p[n - 1][k] - p[n - 2][k] : v);
            return p[i];
        };
        const out = [];
        const segs = closed ? n : n - 1;
        for (let i = 0; i < segs; i++) {
            const p0 = Get(i - 1), p1 = Get(i), p2 = Get(i + 1), p3 = Get(i + 2);
            for (let s = 0; s < CForgeSpline.sDense; s++) {
                const q = new Array(p1.length);
                CForgeSpline.Eval(p0, p1, p2, p3, s / CForgeSpline.sDense, q);
                out.push(q);
            }
        }
        out.push(closed ? out[0].slice() : p[n - 1].slice());
        return out;
    }
    static Length(_pts) {
        let L = 0;
        for (let i = 1; i < _pts.length; i++)
            L += Math.hypot(_pts[i][0] - _pts[i - 1][0], _pts[i][1] - _pts[i - 1][1]);
        return L;
    }
    static Sample(_pts, _step) {
        const dense = CForgeSpline.Dense(_pts);
        if (dense.length < 2)
            return dense;
        const cum = [0];
        for (let i = 1; i < dense.length; i++)
            cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
        const L = cum[cum.length - 1], step = Math.max(1e-3, _step);
        const ds = [0];
        for (let k = 1; k * step < L - step * 0.3; k++)
            ds.push(k * step);
        if (L > 1e-6)
            ds.push(L);
        const out = [];
        let j = 1;
        for (const d of ds) {
            while (j < cum.length - 1 && cum[j] < d)
                j++;
            const seg = cum[j] - cum[j - 1], t = seg > 1e-9 ? (d - cum[j - 1]) / seg : 0;
            const a = dense[j - 1], b = dense[j];
            out.push(a.map((v, k) => v + (b[k] - v) * t));
        }
        return out;
    }
    static Frames(_pts) {
        const n = _pts.length, closed = CForgeSpline.IsClosed(_pts), out = [];
        for (let i = 0; i < n; i++) {
            let a = _pts[Math.max(0, i - 1)], b = _pts[Math.min(n - 1, i + 1)];
            if (closed && (i == 0 || i == n - 1)) {
                a = _pts[n - 2];
                b = _pts[1];
            }
            let tx = b[0] - a[0], tz = b[1] - a[1];
            const l = Math.hypot(tx, tz) || 1;
            tx /= l;
            tz /= l;
            out.push({ tx, tz, nx: -tz, nz: tx });
        }
        return out;
    }
}
