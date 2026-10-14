import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeGiwaGen } from "./CForgeGiwaGen.js";
export class CForgeChineseHallGen {
    static sGallery = 0.9;
    static Bufs() {
        return { stone: new CForgeMeshBuf(), pillar: new CForgeMeshBuf(), wall: new CForgeMeshBuf(), door: new CForgeMeshBuf(), beam: new CForgeMeshBuf(),
            roof: new CForgeMeshBuf(), under: new CForgeMeshBuf(), edge: new CForgeMeshBuf(), ridge: new CForgeMeshBuf(), mortar: new CForgeMeshBuf(), gable: new CForgeMeshBuf() };
    }
    static Dim(_L, _D, _y0, _h, _double) {
        const g = CForgeChineseHallGen.sGallery, l = Math.max(1.6, _L - g * 2), d = Math.max(1.6, _D - g * 2), hw = Math.min(l, d) * 0.5, hwo = Math.min(_L, _D) * 0.5;
        const ye1 = _y0 + _h + 0.35, yr1 = ye1 + (hwo + 0.8) * 0.42;
        const top = _double ? Math.max(yr1 + 0.6, ye1 + 1.6) : _y0 + _h, ye2 = top + 0.35;
        return { g, l, d, hw: _double ? hw : hwo, ye1, yr1, top, ye2, yr2: ye2 + 0.7 + (_double ? hw : hwo) * 0.85 };
    }
    static Height(_L, _D, _h, _double) { return CForgeChineseHallGen.Dim(_L, _D, 0, _h, _double).yr2 + 1.0; }
    static Build(B, _cx, _cz, _ux, _uz, _L, _D, _y0, _h, _double, _lift = 1) {
        const vx = -_uz, vz = _ux, ang = Math.atan2(_uz, _ux), M = CForgeChineseHallGen.Dim(_L, _D, _y0, _h, _double), { l, d } = M;
        const W = (_a, _b) => [_cx + _ux * _a + vx * _b, _cz + _uz * _a + vz * _b];
        const V3 = (_a, _b, _y) => { const q = W(_a, _b); return [q[0], _y, q[1]]; };
        CForgeShape.Box(B.stone, _cx, _cz, _L + 0.5, _D + 0.5, _y0 - 0.35, _y0, ang);
        CForgeShape.Box(B.wall, _cx, _cz, l, d, _y0, M.top, ang);
        const nb = Math.max(1, Math.round(l / 2.2)), bw = l / nb, dy1 = Math.min(_y0 + _h - 0.3, _y0 + 3.2);
        for (const sd of [-1, 1]) {
            for (let k = 0; k <= nb; k++) {
                const q = W(-l * 0.5 + bw * k, sd * d * 0.5);
                CForgeShape.Prism(B.pillar, q[0], q[1], 0.17, 0.16, _y0, M.top, 8);
            }
            for (let k = 0; k < nb; k++) {
                const bc = -l * 0.5 + bw * (k + 0.5), hw = bw * 0.5 - 0.2, bf = sd * (d * 0.5 + 0.01), y0 = _y0 + 0.12;
                B.door.Quad([V3(bc - hw, bf, y0), V3(bc + hw, bf, y0), V3(bc + hw, bf, dy1), V3(bc - hw, bf, dy1)], [[64, y0], [64 + hw * 2, y0], [64 + hw * 2, dy1], [64, dy1]], [vx * sd, 0, vz * sd]);
            }
            const ww = Math.min(1.4, d * 0.4), y0 = _y0 + 1.0, af = sd * (l * 0.5 + 0.01);
            B.door.Quad([V3(af, -ww * 0.5, y0), V3(af, ww * 0.5, y0), V3(af, ww * 0.5, dy1), V3(af, -ww * 0.5, dy1)], [[64, y0], [64 + ww, y0], [64 + ww, dy1], [64, dy1]], [_ux * sd, 0, _uz * sd]);
        }
        const nl = Math.max(1, Math.round(_L / 2.2)), nd = Math.max(1, Math.round(_D / 2.2));
        for (let i = 0; i <= nl; i++)
            for (let j = 0; j <= nd; j++) {
                if (i != 0 && i != nl && j != 0 && j != nd)
                    continue;
                const q = W(-_L * 0.5 + _L * i / nl, -_D * 0.5 + _D * j / nd);
                CForgeShape.Prism(B.pillar, q[0], q[1], 0.17, 0.16, _y0, _y0 + _h, 8);
            }
        CForgeChineseHallGen.Bracket(B, W, _L, _D, _y0 + _h, ang);
        const Wr = (_l, _d) => _l >= _d ? V3 : (_a, _b, _y) => V3(_b, _a, _y);
        const Ext = (_l, _d) => [Math.max(_l, _d) * 0.5, Math.min(_l, _d) * 0.5];
        if (_double) {
            const [ha, hb] = Ext(_L, _D);
            CForgeGiwaGen.Roof(B, Wr(_L, _D), -ha - 0.1, ha + 0.1, -hb - 0.1, hb + 0.1, M.ye1, M.yr1, { e: 0.8, lift: 0.45 * _lift, bulge: 0.25 * _lift, sg: 1, prof: 1.5, T: 0.25, tile: true, nu: 12, ns: 5, endH: 0.3 });
            CForgeChineseHallGen.Bracket(B, W, l, d, M.top, ang);
        }
        const [la, lb] = _double ? [l, d] : [_L, _D], [ha, hb] = Ext(la, lb);
        CForgeGiwaGen.Roof(B, Wr(la, lb), -ha - 0.1, ha + 0.1, -hb - 0.1, hb + 0.1, M.ye2, M.yr2, { e: 0.9 + M.hw * 0.2, lift: 0.85 * _lift, bulge: 0.45 * _lift, sg: 0.55, prof: _lift < 1 ? 1.4 : 1.8, T: 0.3, tile: true, nu: 14, ns: 7, endH: 0.9 });
    }
    static Bracket(B, W, _L, _D, _y, _ang) {
        const c = W(0, 0);
        CForgeShape.Box(B.beam, c[0], c[1], _L + 0.12, _D + 0.12, _y - 0.45, _y, _ang);
        CForgeShape.Box(B.pillar, c[0], c[1], _L + 0.3, _D + 0.3, _y, _y + 0.1, _ang);
        for (const s of [-1, 1]) {
            for (let k = 0, n = Math.max(2, Math.round(_L / 0.6)); k <= n; k++) {
                const q = W(-_L * 0.5 + _L * k / n, s * _D * 0.5);
                CForgeShape.Box(B.beam, q[0], q[1], 0.2, 0.55, _y + 0.1, _y + 0.26, _ang);
                CForgeShape.Box(B.beam, q[0], q[1], 0.2, 0.85, _y + 0.26, _y + 0.4, _ang);
            }
            for (let k = 1, n = Math.max(2, Math.round(_D / 0.6)); k < n; k++) {
                const q = W(s * _L * 0.5, -_D * 0.5 + _D * k / n);
                CForgeShape.Box(B.beam, q[0], q[1], 0.55, 0.2, _y + 0.1, _y + 0.26, _ang);
                CForgeShape.Box(B.beam, q[0], q[1], 0.85, 0.2, _y + 0.26, _y + 0.4, _ang);
            }
        }
    }
    static Parts(B, T, _rc) {
        return [
            { buf: B.stone, rgb: T.mStone, tex: CForgeTex.sStone }, { buf: B.wall, rgb: T.mPillar.map(_v => _v * 0.92), tex: CForgeTex.sPlaster },
            { buf: B.pillar, rgb: T.mPillar, tex: CForgeTex.sWood }, { buf: B.door, rgb: T.mPillar.map(_v => _v * 0.85), tex: CForgeTex.sChuang },
            { buf: B.beam, rgb: T.mBeam, tex: CForgeTex.sWood }, { buf: B.roof, rgb: _rc, tex: CForgeTex.sGiwa }, { buf: B.under, rgb: T.mBeam, tex: CForgeTex.sWood },
            { buf: B.edge, rgb: _rc.map(_v => _v * 0.8), tex: CForgeTex.sGiwa }, { buf: B.ridge, rgb: _rc.map(_v => _v * 0.85), tex: CForgeTex.sGiwa },
            { buf: B.mortar, rgb: _rc.map(_v => _v * 0.9), tex: CForgeTex.sGiwa }, { buf: B.gable, rgb: T.mPillar, tex: CForgeTex.sWood },
        ].filter(_p => _p.buf.mIdx.length > 0);
    }
}
