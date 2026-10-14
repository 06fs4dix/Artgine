export class CForgeGround {
    static Points(_p) {
        if (_p.length == 0)
            return () => 0;
        if (_p.length == 1) {
            const y = _p[0][2];
            return () => y;
        }
        return (_x, _z) => {
            let s = 0, w = 0;
            for (const q of _p) {
                const d2 = (q[0] - _x) * (q[0] - _x) + (q[1] - _z) * (q[1] - _z);
                if (d2 < 1e-8)
                    return q[2];
                const k = 1 / d2;
                s += q[2] * k;
                w += k;
            }
            return s / w;
        };
    }
    static Line(_p) {
        if (_p.length < 2)
            return CForgeGround.Points(_p);
        return (_x, _z) => {
            let best = Infinity, y = _p[0][2];
            for (let i = 0; i + 1 < _p.length; i++) {
                const a = _p[i], b = _p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
                const t = l2 > 0 ? Math.min(1, Math.max(0, ((_x - a[0]) * dx + (_z - a[1]) * dz) / l2)) : 0;
                const d = Math.hypot(_x - a[0] - dx * t, _z - a[1] - dz * t);
                if (d < best) {
                    best = d;
                    y = a[2] + (b[2] - a[2]) * t;
                }
            }
            return y;
        };
    }
}
