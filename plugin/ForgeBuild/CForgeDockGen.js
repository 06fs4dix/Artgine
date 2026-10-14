import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeRand } from "./CForgeRand.js";
export class CForgeDockGen {
    static sFree = 0.7;
    static sRope = [0.74, 0.64, 0.45];
    static Head(_r) {
        const L = Math.hypot(_r.pts[1][0] - _r.pts[0][0], _r.pts[1][1] - _r.pts[0][1]);
        return L > 6 ? 2.4 : 0;
    }
    static Build(_r, _g) {
        const a = _r.pts[0], b = _r.pts[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, nx = -tz, nz = tx, ang = Math.atan2(tz, tx), half = _r.width * 0.5, y = _r.deck;
        const T = CForgeTheme.Of(_r), plank = new CForgeMeshBuf(), beam = new CForgeMeshBuf(), rope = new CForgeMeshBuf(), boat = new CForgeMeshBuf();
        const P = (_s, _v) => [a[0] + tx * _s + nx * _v, a[1] + tz * _s + nz * _v];
        const Pile = (_s, _v, _top) => { const q = P(_s, _v); CForgeShape.Prism(beam, q[0], q[1], 0.13, 0.12, _g(q[0], q[1]) - 0.6, _top, 7); };
        let q = P(L * 0.5, 0);
        CForgeShape.Box(plank, q[0], q[1], L, _r.width, y - 0.1, y, ang);
        for (const s of [1, -1])
            CForgeShape.Box(beam, ...P(L * 0.5, s * (half - 0.2)), L, 0.18, y - 0.36, y - 0.1, ang);
        const n = Math.max(1, Math.round(L / 2));
        for (let k = 1; k <= n; k++) {
            const s = Math.min(L - 0.15, L * k / n);
            for (const v of [half - 0.2, 0.2 - half])
                Pile(s, v, y - 0.1);
            q = P(s, 0);
            CForgeShape.Box(beam, q[0], q[1], 0.16, _r.width - 0.1, y - 0.42, y - 0.1, ang);
        }
        const hd = CForgeDockGen.Head(_r), hw = hd > 0 ? _r.width * 1.1 + 1.2 : half;
        if (hd > 0) {
            q = P(L - hd * 0.5, 0);
            CForgeShape.Box(plank, q[0], q[1], hd, hw * 2, y - 0.1, y, ang);
            for (const s of [L - hd + 0.15, L - 0.15])
                for (const v of [hw - 0.15, 0.15 - hw])
                    Pile(s, v, y - 0.1);
        }
        for (const v of [hw - 0.15, 0.15 - hw]) {
            Pile(L - 0.15, v, y + 0.5);
            q = P(L - 0.15, v);
            CForgeShape.Prism(rope, q[0], q[1], 0.17, 0.17, y + 0.28, y + 0.36, 8);
        }
        const h = CForgeRand.Hash(_r.seed, 7);
        for (let i = 0; i < 1 + (h % 3); i++) {
            const s = 0.8 + i * 0.75, v = (half - 0.45) * ((h >>> (i + 3)) & 1 ? 1 : -1);
            q = P(s, v);
            if ((h >>> (i + 8)) & 1)
                CForgeShape.Box(plank, q[0], q[1], 0.65, 0.65, y, y + 0.6, ang + 0.3 * i);
            else {
                CForgeShape.Prism(beam, q[0], q[1], 0.28, 0.28, y, y + 0.8, 9);
                CForgeShape.Cap(beam, Array.from({ length: 9 }, (_v, _k) => [q[0] + Math.cos(_k / 9 * Math.PI * 2) * 0.28, q[1] + Math.sin(_k / 9 * Math.PI * 2) * 0.28]), y + 0.8);
            }
        }
        if (L > 3) {
            const side = h & 1 ? 1 : -1;
            q = P(L - (hd > 0 ? hd + 1.6 : 1.9), side * (half + 0.85));
            CForgeDockGen.Boat(boat, q[0], q[1], tx, tz, y - CForgeDockGen.sFree, 3.6, 1.25);
        }
        const wc = T.mWood.map(_v => Math.min(1, _v * 1.3));
        return [{ buf: plank, rgb: wc, tex: CForgeTex.sPlank }, { buf: beam, rgb: T.mWood, tex: CForgeTex.sWood },
            { buf: rope, rgb: CForgeDockGen.sRope }, { buf: boat, rgb: wc, tex: CForgeTex.sPlank }].filter(_p => _p.buf.mIdx.length > 0);
    }
    static Boat(_b, _cx, _cz, _tx, _tz, _wy, _len, _beam) {
        const nx = -_tz, nz = _tx, S = 10, prof = [[-1, 1], [-0.85, 0.45], [-0.4, 0], [0.4, 0], [0.85, 0.45], [1, 1]], W = prof.length;
        const Sec = (_t, _in) => {
            const hw = Math.max(0.03, _beam * 0.5 * Math.pow(Math.max(0, 1 - _t * _t), 0.55) - _in);
            return { hw, top: _wy + 0.3 + 0.2 * _t * _t, bot: _in > 0 ? _wy + 0.05 + 0.15 * _t * _t : _wy - 0.2 + 0.22 * _t * _t };
        };
        for (const side of [1, -1]) {
            const base = _b.Count(), inset = side > 0 ? 0 : 0.05;
            for (let i = 0; i <= S; i++) {
                const t = i / S * 2 - 1, c = Sec(t, inset), x0 = _cx + _tx * t * _len * 0.5, z0 = _cz + _tz * t * _len * 0.5;
                for (const [fv, fh] of prof) {
                    const vv = fv * c.hw, yy = c.bot + (c.top - c.bot) * fh;
                    _b.Vert(x0 + nx * vv, yy, z0 + nz * vv, t * _len * 0.5, vv, nx * fv * side, (fh < 0.3 ? -1 : -0.15) * side, nz * fv * side);
                }
            }
            for (let i = 0; i < S; i++)
                for (let j = 0; j + 1 < W; j++) {
                    const k = base + i * W + j, fv = (prof[j][0] + prof[j + 1][0]) * 0.5, fy = Math.abs(fv) < 0.5 ? -1 : -0.2;
                    _b.QuadIdx(k, k + W, k + W + 1, k + 1, nx * fv * side, fy * side, nz * fv * side);
                }
        }
        for (const t of [-0.35, 0.3]) {
            const c = Sec(t, 0.05);
            CForgeShape.Box(_b, _cx + _tx * t * _len * 0.5, _cz + _tz * t * _len * 0.5, 0.22, c.hw * 2, c.top - 0.12, c.top - 0.05, Math.atan2(_tz, _tx));
        }
    }
}
