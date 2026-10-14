export class CForgePoly {
    static sEps = 1e-9;
    static Area(_p) {
        let s = 0;
        for (let i = 0, j = _p.length - 1; i < _p.length; j = i++)
            s += _p[j][0] * _p[i][1] - _p[i][0] * _p[j][1];
        return s * 0.5;
    }
    static Orient(_p, _positive = true) {
        const p = _p.slice();
        if ((CForgePoly.Area(p) > 0) != _positive)
            p.reverse();
        return p;
    }
    static Cross(_a, _b, _c) {
        return (_b[0] - _a[0]) * (_c[1] - _a[1]) - (_b[1] - _a[1]) * (_c[0] - _a[0]);
    }
    static Centroid(_p) {
        let a = 0, x = 0, z = 0;
        for (let i = 0, j = _p.length - 1; i < _p.length; j = i++) {
            const c = _p[j][0] * _p[i][1] - _p[i][0] * _p[j][1];
            a += c;
            x += (_p[j][0] + _p[i][0]) * c;
            z += (_p[j][1] + _p[i][1]) * c;
        }
        if (Math.abs(a) < 1e-12) {
            for (const q of _p) {
                x += q[0];
                z += q[1];
            }
            return [x / _p.length, z / _p.length];
        }
        return [x / (3 * a), z / (3 * a)];
    }
    static InPoly(_x, _z, _p) {
        let inside = false;
        for (let i = 0, j = _p.length - 1; i < _p.length; j = i++) {
            const a = _p[i], b = _p[j];
            if ((a[1] > _z) != (b[1] > _z) && _x < (b[0] - a[0]) * (_z - a[1]) / (b[1] - a[1]) + a[0])
                inside = !inside;
        }
        return inside;
    }
    static Perimeter(_p) {
        let s = 0;
        for (let i = 0, j = _p.length - 1; i < _p.length; j = i++)
            s += Math.hypot(_p[i][0] - _p[j][0], _p[i][1] - _p[j][1]);
        return s;
    }
    static Clean(_p, _minEdge = 0.05, _sinEps = 0.02) {
        let p = _p.slice();
        if (p.length > 1 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < _minEdge)
            p.pop();
        let changed = true;
        while (changed && p.length > 3) {
            changed = false;
            for (let i = 0; i < p.length; i++) {
                const a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length];
                const lab = Math.hypot(b[0] - a[0], b[1] - a[1]), lbc = Math.hypot(c[0] - b[0], c[1] - b[1]);
                const sin = Math.abs(CForgePoly.Cross(a, b, c)) / Math.max(1e-12, lab * lbc);
                const fwd = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) > 0;
                if (lab < _minEdge || (sin < _sinEps && fwd)) {
                    p.splice(i, 1);
                    changed = true;
                    break;
                }
            }
        }
        return CForgePoly.Orient(p);
    }
    static SegInter(_a, _b, _c, _d) {
        const rx = _b[0] - _a[0], rz = _b[1] - _a[1], sx = _d[0] - _c[0], sz = _d[1] - _c[1];
        const den = rx * sz - rz * sx;
        if (Math.abs(den) < 1e-14)
            return null;
        const qx = _c[0] - _a[0], qz = _c[1] - _a[1];
        return { t: (qx * sz - qz * sx) / den, u: (qx * rz - qz * rx) / den };
    }
    static IsSimple(_p) {
        const n = _p.length;
        if (n < 3)
            return false;
        for (let i = 0; i < n; i++) {
            const a = _p[i], b = _p[(i + 1) % n];
            for (let j = i + 1; j < n; j++) {
                if (j == i || (j + 1) % n == i || (i + 1) % n == j)
                    continue;
                const c = _p[j], d = _p[(j + 1) % n];
                const r = CForgePoly.SegInter(a, b, c, d);
                if (r != null && r.t >= -1e-9 && r.t <= 1 + 1e-9 && r.u >= -1e-9 && r.u <= 1 + 1e-9)
                    return false;
            }
        }
        return true;
    }
    static Triangulate(_p) {
        const n = _p.length;
        if (n < 3)
            return [];
        const pos = CForgePoly.Area(_p) > 0;
        const idx = [];
        for (let i = 0; i < n; i++)
            idx.push(pos ? i : n - 1 - i);
        const out = [];
        const C = CForgePoly.Cross, E = CForgePoly.sEps;
        const Inside = (q, a, b, c) => C(a, b, q) > E && C(b, c, q) > E && C(c, a, q) > E;
        const Same = (q, r) => Math.abs(q[0] - r[0]) < 1e-12 && Math.abs(q[1] - r[1]) < 1e-12;
        while (idx.length > 3) {
            let cut = -1, best = -1, bestCross = -Infinity;
            for (let i = 0; i < idx.length; i++) {
                const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
                const a = _p[ia], b = _p[ib], c = _p[ic];
                const cr = C(a, b, c);
                if (cr > bestCross) {
                    bestCross = cr;
                    best = i;
                }
                if (cr <= E)
                    continue;
                let ok = true;
                for (const j of idx) {
                    if (j == ia || j == ib || j == ic)
                        continue;
                    const q = _p[j];
                    if (Same(q, a) || Same(q, b) || Same(q, c))
                        continue;
                    if (Inside(q, a, b, c)) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    cut = i;
                    break;
                }
            }
            if (cut < 0)
                cut = best;
            const L = idx.length;
            const ia = idx[(cut + L - 1) % L], ib = idx[cut], ic = idx[(cut + 1) % L];
            if (C(_p[ia], _p[ib], _p[ic]) > E)
                out.push(ia, ib, ic);
            idx.splice(cut, 1);
        }
        if (C(_p[idx[0]], _p[idx[1]], _p[idx[2]]) > E)
            out.push(idx[0], idx[1], idx[2]);
        return out;
    }
    static Offset(_p, _d, _miter = 2.5) {
        const p = CForgePoly.Clean(_p, 1e-6, 1e-9);
        const E = p.map((_a, _i) => {
            const b = p[(_i + 1) % p.length], l = Math.hypot(b[0] - _a[0], b[1] - _a[1]) || 1;
            const tx = (b[0] - _a[0]) / l, tz = (b[1] - _a[1]) / l, nx = tz, nz = -tx;
            return { tx, tz, ax: _a[0] + nx * _d, az: _a[1] + nz * _d, bx: b[0] + nx * _d, bz: b[1] + nz * _d };
        });
        const Meet = (_e, _f) => {
            const den = _e.tx * _f.tz - _e.tz * _f.tx;
            if (Math.abs(den) < 1e-9)
                return [_f.ax, _f.az];
            const t = ((_f.ax - _e.ax) * _f.tz - (_f.az - _e.az) * _f.tx) / den;
            return [_e.ax + _e.tx * t, _e.az + _e.tz * t];
        };
        let V = [];
        for (let guard = 0; guard < p.length; guard++) {
            const m = E.length;
            if (m < 3)
                return [];
            V = E.map((_e, _i) => Meet(E[(_i + m - 1) % m], _e));
            let gone = -1;
            for (let i = 0; i < m; i++) {
                const a = V[i], b = V[(i + 1) % m];
                if ((b[0] - a[0]) * E[i].tx + (b[1] - a[1]) * E[i].tz < -1e-9) {
                    gone = i;
                    break;
                }
            }
            if (gone < 0)
                break;
            E.splice(gone, 1);
        }
        const out = [];
        const m = E.length, lim = _miter * Math.abs(_d);
        for (let i = 0; i < m; i++) {
            const e = E[i], pe = E[(i + m - 1) % m];
            const spike = Math.sign(_d) * (pe.tx * e.tz - pe.tz * e.tx) > 0;
            if (spike && Math.hypot(V[i][0] - e.ax, V[i][1] - e.az) > lim && Math.hypot(V[i][0] - pe.bx, V[i][1] - pe.bz) > lim) {
                out.push([pe.bx, pe.bz]);
                out.push([e.ax, e.az]);
            }
            else
                out.push(V[i]);
        }
        return out;
    }
    static OBB(_p) {
        let best = { area: Infinity, u: [1, 0], v: [0, 1], uMin: 0, uMax: 0, vMin: 0, vMax: 0 };
        for (let i = 0; i < _p.length; i++) {
            const a = _p[i], b = _p[(i + 1) % _p.length];
            const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (l < 1e-6)
                continue;
            const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], v = [-u[1], u[0]];
            let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
            for (const q of _p) {
                const pu = q[0] * u[0] + q[1] * u[1], pv = q[0] * v[0] + q[1] * v[1];
                uMin = Math.min(uMin, pu);
                uMax = Math.max(uMax, pu);
                vMin = Math.min(vMin, pv);
                vMax = Math.max(vMax, pv);
            }
            const area = (uMax - uMin) * (vMax - vMin);
            if (area < best.area)
                best = { area, u, v, uMin, uMax, vMin, vMax };
        }
        if (best.vMax - best.vMin > best.uMax - best.uMin) {
            const u = best.v, v = [-best.u[0], -best.u[1]];
            best = { area: best.area, u, v, uMin: best.vMin, uMax: best.vMax, vMin: -best.uMax, vMax: -best.uMin };
        }
        return best;
    }
    static Clip(_p, _s) {
        const out = [];
        for (let i = 0; i < _p.length; i++) {
            const a = _p[i], b = _p[(i + 1) % _p.length];
            const sa = _s(a), sb = _s(b);
            if (sa >= 0)
                out.push(a);
            if ((sa >= 0) != (sb >= 0)) {
                const t = sa / (sa - sb);
                out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            }
        }
        return out;
    }
    static ToLocal(_p, _o, _u) {
        return _p.map(q => [(q[0] - _o[0]) * _u[0] + (q[1] - _o[1]) * _u[1], -(q[0] - _o[0]) * _u[1] + (q[1] - _o[1]) * _u[0]]);
    }
    static ToWorld(_p, _o, _u) {
        return _p.map(q => [_o[0] + q[0] * _u[0] - q[1] * _u[1], _o[1] + q[0] * _u[1] + q[1] * _u[0]]);
    }
    static Orthogonalize(_local, _tol) {
        const n = _local.length;
        const cls = [], val = [];
        for (let i = 0; i < n; i++) {
            const a = _local[i], b = _local[(i + 1) % n], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
            const m = ((ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
            const off = Math.min(m, Math.PI / 2 - m);
            if (off > _tol) {
                cls.push(0);
                val.push(0);
                continue;
            }
            const horiz = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang));
            cls.push(horiz ? 1 : 2);
            val.push(horiz ? (a[1] + b[1]) * 0.5 : (a[0] + b[0]) * 0.5);
        }
        const out = [];
        for (let i = 0; i < n; i++) {
            const pi = (i + n - 1) % n, q = [_local[i][0], _local[i][1]];
            for (const e of [pi, i]) {
                if (cls[e] == 1)
                    q[1] = val[e];
                else if (cls[e] == 2)
                    q[0] = val[e];
            }
            out.push(q);
        }
        return out;
    }
    static IsRectilinear(_local, _eps = 1e-6) {
        for (let i = 0; i < _local.length; i++) {
            const a = _local[i], b = _local[(i + 1) % _local.length];
            if (Math.abs(a[0] - b[0]) > _eps && Math.abs(a[1] - b[1]) > _eps)
                return false;
        }
        return true;
    }
    static Rectangles(_local) {
        const Strips = (_p, _swap) => {
            const P = _swap ? _p.map(q => [q[1], q[0]]) : _p;
            const xs = [...new Set(P.map(q => Math.round(q[0] * 1e4) / 1e4))].sort((a, b) => a - b);
            const strips = [];
            for (let i = 0; i + 1 < xs.length; i++) {
                const xm = (xs[i] + xs[i + 1]) * 0.5, ys = [];
                for (let k = 0; k < P.length; k++) {
                    const a = P[k], b = P[(k + 1) % P.length];
                    if ((a[0] > xm) != (b[0] > xm))
                        ys.push(a[1] + (b[1] - a[1]) * (xm - a[0]) / (b[0] - a[0]));
                }
                ys.sort((a, b) => a - b);
                const iv = [];
                for (let k = 0; k + 1 < ys.length; k += 2)
                    iv.push([ys[k], ys[k + 1]]);
                strips.push({ x0: xs[i], x1: xs[i + 1], iv });
            }
            const out = [];
            let open = [];
            for (const s of strips) {
                const next = [];
                for (const iv of s.iv) {
                    const o = open.find(_r => Math.abs(_r[1] - iv[0]) < 1e-4 && Math.abs(_r[3] - iv[1]) < 1e-4 && Math.abs(_r[2] - s.x0) < 1e-4);
                    if (o != null) {
                        o[2] = s.x1;
                        next.push(o);
                    }
                    else
                        next.push([s.x0, iv[0], s.x1, iv[1]]);
                }
                for (const o of open)
                    if (next.indexOf(o) < 0)
                        out.push(o);
                open = next;
            }
            out.push(...open);
            return _swap ? out.map(r => [r[1], r[0], r[3], r[2]]) : out;
        };
        const a = Strips(_local, false), b = Strips(_local, true);
        return a.length <= b.length ? a : b;
    }
    static ConvexHull(_pts) {
        const p = _pts.slice().sort((_a, _b) => _a[0] - _b[0] || _a[1] - _b[1]);
        if (p.length < 3)
            return p;
        const lower = [], upper = [];
        for (const q of p) {
            while (lower.length >= 2 && CForgePoly.Cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0)
                lower.pop();
            lower.push(q);
        }
        for (let i = p.length - 1; i >= 0; i--) {
            const q = p[i];
            while (upper.length >= 2 && CForgePoly.Cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0)
                upper.pop();
            upper.push(q);
        }
        upper.pop();
        lower.pop();
        return lower.concat(upper);
    }
    static Union(_a, _b) {
        const a = CForgePoly.Orient(_a);
        let b = CForgePoly.Orient(_b);
        const c = CForgePoly.Centroid(b);
        for (let attempt = 0; attempt < 6; attempt++) {
            const r = CForgePoly.UnionGH(a, b);
            if (r !== undefined)
                return r;
            const ang = 1e-7 * (attempt + 1) * (attempt % 2 ? -1 : 1), cs = Math.cos(ang), sn = Math.sin(ang);
            b = b.map(q => [c[0] + (q[0] - c[0]) * cs - (q[1] - c[1]) * sn + 1e-7, c[1] + (q[0] - c[0]) * sn + (q[1] - c[1]) * cs]);
        }
        return null;
    }
    static UnionGH(_a, _b) {
        const Build = (_p) => {
            let first = null, prev = null;
            for (const q of _p) {
                const nd = { x: q[0], z: q[1], next: null, prev, inter: false, entry: false, alpha: 0, neighbor: null, visited: false };
                if (prev)
                    prev.next = nd;
                else
                    first = nd;
                prev = nd;
            }
            prev.next = first;
            first.prev = prev;
            return first;
        };
        const NextReal = (_n) => { let m = _n.next; while (m.inter)
            m = m.next; return m; };
        const Insert = (_n, _start, _end) => {
            let cur = _start.next;
            while (cur != _end && cur.alpha < _n.alpha)
                cur = cur.next;
            _n.next = cur;
            _n.prev = cur.prev;
            cur.prev.next = _n;
            cur.prev = _n;
        };
        const ha = Build(_a), hb = Build(_b);
        const EA = 1e-9;
        let count = 0;
        let sa = ha;
        do {
            const sa2 = NextReal(sa);
            let sb = hb;
            do {
                const sb2 = NextReal(sb);
                const r = CForgePoly.SegInter([sa.x, sa.z], [sa2.x, sa2.z], [sb.x, sb.z], [sb2.x, sb2.z]);
                if (r == null) {
                    const col = Math.abs(CForgePoly.Cross([sa.x, sa.z], [sa2.x, sa2.z], [sb.x, sb.z]));
                    if (col < 1e-12)
                        return undefined;
                }
                else if (r.t > -EA && r.t < 1 + EA && r.u > -EA && r.u < 1 + EA) {
                    if (r.t < EA || r.t > 1 - EA || r.u < EA || r.u > 1 - EA)
                        return undefined;
                    const x = sa.x + (sa2.x - sa.x) * r.t, z = sa.z + (sa2.z - sa.z) * r.t;
                    const na = { x, z, next: null, prev: null, inter: true, entry: false, alpha: r.t, neighbor: null, visited: false };
                    const nb = { x, z, next: null, prev: null, inter: true, entry: false, alpha: r.u, neighbor: na, visited: false };
                    na.neighbor = nb;
                    Insert(na, sa, sa2);
                    Insert(nb, sb, sb2);
                    count++;
                }
                sb = sb2;
            } while (sb != hb);
            sa = sa2;
        } while (sa != ha);
        if (count == 0) {
            if (CForgePoly.InPoly(_a[0][0], _a[0][1], _b))
                return _b.slice();
            if (CForgePoly.InPoly(_b[0][0], _b[0][1], _a))
                return _a.slice();
            return null;
        }
        const Mark = (_h, _other) => {
            let entry = CForgePoly.InPoly(_h.x, _h.z, _other);
            let n = _h;
            do {
                if (n.inter) {
                    n.entry = entry;
                    entry = !entry;
                }
                n = n.next;
            } while (n != _h);
        };
        Mark(ha, _b);
        Mark(hb, _a);
        const polys = [];
        for (;;) {
            let start = null, n = ha;
            do {
                if (n.inter && !n.visited) {
                    start = n;
                    break;
                }
                n = n.next;
            } while (n != ha);
            if (start == null)
                break;
            const out = [];
            let cur = start, guard = 0;
            do {
                cur.visited = true;
                cur.neighbor.visited = true;
                if (cur.entry) {
                    do {
                        cur = cur.next;
                        out.push([cur.x, cur.z]);
                    } while (!cur.inter && guard++ < 100000);
                }
                else {
                    do {
                        cur = cur.prev;
                        out.push([cur.x, cur.z]);
                    } while (!cur.inter && guard++ < 100000);
                }
                cur = cur.neighbor;
            } while (!cur.visited && guard++ < 100000);
            if (out.length >= 3)
                polys.push(out);
        }
        let best = null, bestA = 0;
        for (const p of polys) {
            const ar = Math.abs(CForgePoly.Area(p));
            if (ar > bestA) {
                bestA = ar;
                best = p;
            }
        }
        return best == null ? null : CForgePoly.Orient(best);
    }
}
