import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeGiwaGen } from "./CForgeGiwaGen.js";
export class CForgeYaguraGen {
    static sShrink = 0.17;
    static Bufs() {
        return { plaster: new CForgeMeshBuf(), board: new CForgeMeshBuf(), wood: new CForgeMeshBuf(), dark: new CForgeMeshBuf(), roof: new CForgeMeshBuf(), under: new CForgeMeshBuf(),
            edge: new CForgeMeshBuf(), ridge: new CForgeMeshBuf(), mortar: new CForgeMeshBuf(), gable: new CForgeMeshBuf() };
    }
    static Floor(_L, _D, _y0, _h, _k) { const f = 1 - CForgeYaguraGen.sShrink * _k; return { L: _L * f, D: _D * f, y: _y0 + _h * _k }; }
    static Height(_L, _D, _floors, _h) {
        const t = CForgeYaguraGen.Floor(_L, _D, 0, _h, _floors - 1);
        return t.y + _h - 0.08 + 0.5 + Math.min(t.L, t.D) * 0.5 * 0.75 + 0.62;
    }
    static Build(B, _cx, _cz, _ux, _uz, _L, _D, _y0, _floors, _h = 2.5) {
        const vx = -_uz, vz = _ux, ang = Math.atan2(_uz, _ux);
        const V3 = (_a, _b, _y) => [_cx + _ux * _a + vx * _b, _y, _cz + _uz * _a + vz * _b];
        for (let k = 0; k < _floors; k++) {
            const F = CForgeYaguraGen.Floor(_L, _D, _y0, _h, k), y = F.y, yt = y + _h, last = k == _floors - 1, yb = y - (k == 0 ? 0.3 : 0.5);
            CForgeShape.Box(B.plaster, _cx, _cz, F.L, F.D, yb, yt, ang);
            CForgeShape.Box(B.board, _cx, _cz, F.L + 0.04, F.D + 0.04, yb, y + _h * 0.38, ang);
            for (const [along, half, other] of [[true, F.L * 0.5, F.D * 0.5], [false, F.D * 0.5, F.L * 0.5]]) {
                const n = along ? Math.max(1, Math.round(F.L / 2.2)) : half * 2 > 2.6 ? 1 : 0;
                for (const sd of [-1, 1])
                    for (let j = 0; j < n; j++) {
                        const t = -half + half * 2 * (j + 0.5) / n, W = (_t, _o) => along ? V3(_t, sd * (other + _o), 0) : V3(sd * (other + _o), _t, 0);
                        const tx = along ? _ux : vx, tz = along ? _uz : vz, nx = along ? vx * sd : _ux * sd, nz = along ? vz * sd : _uz * sd;
                        const p = W(t, 0), wy = y + _h * 0.62, ww = 0.9, wh = 0.72;
                        CForgeShape.Decal(B.dark, p[0], wy, p[2], tx, tz, nx, nz, ww, wh);
                        for (let b = 0; b < 5; b++) {
                            const q = W(t - ww * 0.5 + ww * (b + 0.5) / 5, 0.04);
                            CForgeShape.Box(B.plaster, q[0], q[2], 0.05, 0.05, wy - wh * 0.5, wy + wh * 0.5, Math.atan2(tz, tx));
                        }
                        const sill = W(t, 0.06);
                        CForgeShape.Box(B.plaster, sill[0], sill[2], ww + 0.24, 0.12, wy - wh * 0.5 - 0.1, wy - wh * 0.5, Math.atan2(tz, tx));
                        if (!along)
                            continue;
                        const h = W(t + half / n, 0.02);
                        if (j + 1 < n)
                            CForgeShape.Decal(B.dark, h[0], y + _h * 0.2, h[2], tx, tz, nx, nz, 0.18, 0.18);
                    }
            }
            const alongU = F.L >= F.D, ha = (alongU ? F.L : F.D) * 0.5, hb = (alongU ? F.D : F.L) * 0.5, ye = yt - 0.08;
            const Wr = alongU ? V3 : (_a, _b, _y) => V3(_b, _a, _y);
            if (!last)
                CForgeGiwaGen.Roof(B, Wr, -ha, ha, -hb, hb, ye, ye + (hb + 0.8) * 0.5, { e: 0.8, lift: 0.15, bulge: 0.08, sg: 1, prof: 1.25, T: 0.22, tile: true, nu: 10, ns: 5 });
            else
                CForgeGiwaGen.Roof(B, Wr, -ha, ha, -hb, hb, ye, ye + 0.5 + hb * 0.75, { e: 0.85, lift: 0.18, bulge: 0.08, sg: 0.55, prof: 1.3, T: 0.24, tile: true, nu: 12, ns: 6 });
        }
    }
    static Parts(B, T, _seed) {
        const rc = T.mRoof[_seed % T.mRoof.length], wall = T.mTowerBody;
        return [
            { buf: B.plaster, rgb: wall, tex: CForgeTex.sPlaster }, { buf: B.board, rgb: T.mBoard, tex: CForgeTex.sShitami },
            { buf: B.wood, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: B.dark, rgb: T.mDark },
            { buf: B.roof, rgb: rc, tex: CForgeTex.sKawara }, { buf: B.under, rgb: wall.map(_v => _v * 0.92), tex: CForgeTex.sPlaster },
            { buf: B.edge, rgb: wall, tex: CForgeTex.sPlaster }, { buf: B.ridge, rgb: rc.map(_v => _v * 0.85), tex: CForgeTex.sKawara },
            { buf: B.mortar, rgb: [0.9, 0.89, 0.85], tex: CForgeTex.sPlaster }, { buf: B.gable, rgb: wall, tex: CForgeTex.sPlaster },
        ].filter(_p => _p.buf.mIdx.length > 0);
    }
}
