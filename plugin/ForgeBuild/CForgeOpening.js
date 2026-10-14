import { CForgeShape } from "./CForgeShape.js";
export class CForgeOpening {
    static eKind = { Rect: 0, Round: 1, Pointed: 2, Trapezoid: 3, Horseshoe: 4 };
    static sSeg = 8;
    static Outline(_w, _h, _kind) {
        const hw = _w * 0.5, S = CForgeOpening.sSeg, K = CForgeOpening.eKind;
        if (_kind == K.Rect)
            return [[-hw, 0], [-hw, _h], [hw, _h], [hw, 0]];
        if (_kind == K.Trapezoid)
            return [[-hw, 0], [-hw * 0.74, _h], [hw * 0.74, _h], [hw, 0]];
        const out = [[-hw, 0]];
        if (_kind == K.Horseshoe) {
            const R = hw * 1.16, oc = Math.acos(hw / R), sp = Math.max(0, _h - R - R * Math.sin(oc));
            for (let k = 0; k <= S; k++) {
                const a = Math.PI + oc - (Math.PI + oc * 2) * k / S;
                out.push([Math.cos(a) * R, sp + R * Math.sin(oc) + Math.sin(a) * R]);
            }
            out.push([hw, 0]);
            return out;
        }
        if (_kind == K.Round) {
            const sp = Math.max(0, _h - hw);
            for (let k = 0; k <= S; k++) {
                const a = Math.PI * (1 - k / S);
                out.push([Math.cos(a) * hw, sp + Math.sin(a) * hw]);
            }
        }
        else {
            const R = _w * 0.8, cx = R - hw, ta = Math.acos(-cx / R), rise = R * Math.sin(ta), sp = Math.max(0, _h - rise), half = S / 2;
            for (let k = 0; k <= half; k++) {
                const a = Math.PI + (ta - Math.PI) * k / half;
                out.push([-hw + R + Math.cos(a) * R, sp + Math.sin(a) * R]);
            }
            for (let k = half - 1; k >= 0; k--) {
                const p = out[1 + k];
                out.push([-p[0], p[1]]);
            }
        }
        out.push([hw, 0]);
        return out;
    }
    static P(_x, _y0, _z, _tx, _tz, _nx, _nz, _q, _o) {
        return [_x + _tx * _q[0] + _nx * _o, _y0 + _q[1], _z + _tz * _q[0] + _nz * _o];
    }
    static Frame(_b, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, _kind, _jw, _fd) {
        const I = CForgeOpening.Outline(_w, _h, _kind), O = CForgeOpening.Outline(_w + _jw * 2, _h + _jw, _kind);
        const P = (_q, _o) => CForgeOpening.P(_x, _y0, _z, _tx, _tz, _nx, _nz, _q, _o);
        for (let i = 0; i + 1 < I.length; i++) {
            _b.Quad([P(I[i], _fd), P(O[i], _fd), P(O[i + 1], _fd), P(I[i + 1], _fd)], null, [_nx, 0, _nz]);
            let du = I[i + 1][0] - I[i][0], dv = I[i + 1][1] - I[i][1], l = Math.hypot(du, dv) || 1;
            _b.Quad([P(I[i], 0), P(I[i + 1], 0), P(I[i + 1], _fd), P(I[i], _fd)], null, [_tx * dv / l, -du / l, _tz * dv / l]);
            du = O[i + 1][0] - O[i][0];
            dv = O[i + 1][1] - O[i][1];
            l = Math.hypot(du, dv) || 1;
            _b.Quad([P(O[i + 1], 0), P(O[i], 0), P(O[i], _fd), P(O[i + 1], _fd)], null, [-_tx * dv / l, du / l, -_tz * dv / l]);
        }
    }
    static Fill(_b, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, _kind, _off) {
        _b.Poly(CForgeOpening.Outline(_w, _h, _kind).map(_q => CForgeOpening.P(_x, _y0, _z, _tx, _tz, _nx, _nz, _q, _off)), [_nx, 0, _nz]);
    }
    static Window(B, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, _kind, _mullion = false) {
        const jw = Math.min(0.24, Math.max(0.1, _w * 0.18)), fd = Math.min(0.26, Math.max(0.1, _w * 0.2)), ang = Math.atan2(_tz, _tx);
        CForgeOpening.Fill(B.fill, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, _kind, 0.012);
        CForgeOpening.Frame(B.stone, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, _kind, jw, fd);
        CForgeShape.Box(B.stone, _x + _nx * (fd + 0.06) * 0.5, _z + _nz * (fd + 0.06) * 0.5, _w + jw * 2 + 0.16, fd + 0.06, _y0 - 0.13, _y0, ang);
        if (!_mullion)
            return;
        const sp = _kind == CForgeOpening.eKind.Rect ? _h : _h - _w * 0.55, mw = Math.max(0.07, _w * 0.09);
        CForgeShape.Box(B.stone, _x + _nx * fd * 0.35, _z + _nz * fd * 0.35, mw, fd * 0.7, _y0, _y0 + sp, ang);
        CForgeShape.Box(B.stone, _x + _nx * fd * 0.35, _z + _nz * fd * 0.35, _w, fd * 0.7, _y0 + sp - mw, _y0 + sp, ang);
    }
    static Door(B, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, _kind, _orders = 2) {
        const ang = Math.atan2(_tz, _tx);
        CForgeOpening.Fill(B.door, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, _kind, 0.02);
        for (const v of [0.22, 0.58])
            CForgeShape.Box(B.dark, _x + _nx * 0.03, _z + _nz * 0.03, _w * 0.86, 0.025, _y0 + _h * v, _y0 + _h * v + 0.07, ang);
        CForgeShape.Box(B.dark, _x + _tx * _w * 0.28 + _nx * 0.05, _z + _tz * _w * 0.28 + _nz * 0.05, 0.1, 0.06, _y0 + 1.0, _y0 + 1.12, ang);
        let w = _w, h = _h, d = 0;
        for (let k = 0; k < _orders; k++) {
            const jw = 0.22, fd = 0.16 + k * 0.08;
            CForgeOpening.Frame(B.stone, _x, _y0, _z, _tx, _tz, _nx, _nz, w, h, _kind, jw, d + fd);
            d += fd;
            w += jw * 2;
            h += jw;
        }
        CForgeShape.Box(B.stone, _x + _nx * (d + 0.5) * 0.5, _z + _nz * (d + 0.5) * 0.5, w + 0.3, d + 0.5, _y0 - 1.2, _y0 + 0.02, ang);
    }
    static Slit(B, _x, _yc, _z, _tx, _tz, _nx, _nz, _w, _h) {
        const y0 = _yc - _h * 0.5, K = CForgeOpening.eKind.Round, ang = Math.atan2(_tz, _tx);
        CForgeOpening.Fill(B.dark, _x, y0, _z, _tx, _tz, _nx, _nz, _w, _h, K, 0.012);
        CForgeOpening.Frame(B.stone, _x, y0, _z, _tx, _tz, _nx, _nz, _w, _h, K, 0.13, 0.1);
        CForgeShape.Box(B.stone, _x + _nx * 0.07, _z + _nz * 0.07, _w + 0.36, 0.14, y0 - 0.1, y0, ang);
    }
}
