import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeWallGen } from "./CForgeWallGen.js";
export class CForgeHutGen {
    static Huts(_b) {
        const ob = CForgePoly.OBB(CForgePoly.Orient(_b.poly)), Lu = ob.uMax - ob.uMin, Lv = ob.vMax - ob.vMin;
        const W = (_a, _c) => [ob.u[0] * _a + ob.v[0] * _c, ob.u[1] * _a + ob.v[1] * _c], vc = (ob.vMin + ob.vMax) * 0.5;
        let door = 0;
        const d = _b.door, p = _b.poly;
        if (d != null && p.length > 2) {
            const a = p[d.edge], c = p[(d.edge + 1) % p.length];
            door = Math.atan2(-(c[0] - a[0]), c[1] - a[1]);
        }
        const r0 = Math.min(5, Math.max(1.6, Lv * 0.5));
        if (Lu > Lv * 1.7 && Lu - r0 * 2 > 2.6) {
            const r1 = Math.min(r0 * 0.72, (Lu - r0 * 2) * 0.5);
            return [{ c: W(ob.uMin + r0, vc), r: r0, door }, { c: W(ob.uMax - r1, vc), r: r1, door }];
        }
        return [{ c: W((ob.uMin + ob.uMax) * 0.5, vc), r: Math.min(5, Math.max(1.6, Math.min(Lu, Lv) * 0.5)), door }];
    }
    static Dim(_kind, _r) {
        if (_kind == 0)
            return { wh: 1.6, top: 1.6 + _r * 0.3 + 0.12 };
        if (_kind == 2)
            return { wh: 0, top: _r * 1.05 + 0.2 };
        return { wh: 2.1, top: 2.1 + (_r + 0.55) * 0.95 + 0.25 };
    }
    static Ground(_g, _c, _r) {
        let g = _g(_c[0], _c[1]);
        for (let k = 0; k < 8; k++)
            g = Math.max(g, _g(_c[0] + Math.cos(k * 0.785) * _r, _c[1] + Math.sin(k * 0.785) * _r));
        return g;
    }
    static Hull(_b, _g) {
        const T = CForgeTheme.Of(_b);
        return CForgeHutGen.Huts(_b).map(_h => {
            const g = CForgeHutGen.Ground(_g, _h.c, _h.r), D = CForgeHutGen.Dim(T.mHut, _h.r);
            return [Array.from({ length: 8 }, (_v, _k) => [_h.c[0] + Math.cos(_k * 0.785) * _h.r, _h.c[1] + Math.sin(_k * 0.785) * _h.r]), g - 0.5, g + D.top];
        });
    }
    static Bufs() {
        return { wall: new CForgeMeshBuf(), base: new CForgeMeshBuf(), roof: new CForgeMeshBuf(), under: new CForgeMeshBuf(), wood: new CForgeMeshBuf(), rope: new CForgeMeshBuf(),
            trim: new CForgeMeshBuf(), door: new CForgeMeshBuf(), dark: new CForgeMeshBuf(), gold: new CForgeMeshBuf() };
    }
    static Build(_b, _g, _lod) {
        const T = CForgeTheme.Of(_b), B = CForgeHutGen.Bufs();
        for (const h of CForgeHutGen.Huts(_b))
            CForgeHutGen.Hut(B, T.mHut, h.c[0], h.c[1], h.r, CForgeHutGen.Ground(_g, h.c, h.r), h.door, _lod, _b.seed, false);
        return CForgeHutGen.Parts(B, T, _b.seed);
    }
    static Hut(B, _kind, _cx, _cz, _r, _g, _door, _lod, _seed, _grand) {
        const seg = _lod >= 2 ? 10 : Math.min(36, Math.max(16, Math.round(_r * 6))), D = CForgeHutGen.Dim(_kind, _r), wh = D.wh, dx = Math.cos(_door), dz = Math.sin(_door), ang = _door + Math.PI * 0.5;
        if (_kind == 0) {
            const rise = _r * 0.3, rc = Math.max(0.45, _r * 0.18), y1 = _g + wh, yt = y1 + rise;
            CForgeTowerGen.Lathe(B.base, _cx, _cz, [[_r + 0.02, _g - 0.15], [_r + 0.02, _g + 0.32]], seg);
            CForgeTowerGen.Lathe(B.wall, _cx, _cz, [[_r, _g + 0.3], [_r, y1]], seg);
            CForgeTowerGen.Lathe(B.wall, _cx, _cz, [[_r + 0.1, y1 - 0.06], [_r * 0.78, y1 + rise * 0.36], [_r * 0.5, y1 + rise * 0.7], [rc + 0.06, yt]], seg);
            CForgeTowerGen.Soffit(B.under, _cx, _cz, _r - 0.02, _r + 0.1, y1 - 0.06, seg);
            CForgeTowerGen.Lathe(B.trim, _cx, _cz, [[_r + 0.115, y1 - 0.05], [_r * 0.97, y1 + rise * (_grand ? 0.16 : 0.08)]], seg);
            if (_lod < 2) {
                for (const f of [0.22, 0.55, 0.86])
                    CForgeTowerGen.Ring(B.rope, _cx, _cz, _r, _r + 0.035, _g + wh * f, _g + wh * f + 0.05, seg);
                for (let k = 0; k < 4; k++) {
                    const a = _door + Math.PI * 0.25 + k * Math.PI * 0.5, ca = Math.cos(a), sa = Math.sin(a);
                    CForgeTowerGen.Strut(B.rope, [_cx + ca * (_r + 0.12), y1 - 0.05, _cz + sa * (_r + 0.12)], [_cx + ca * (_r * 0.78 + 0.03), y1 + rise * 0.36 + 0.03, _cz + sa * (_r * 0.78 + 0.03)], 0.05);
                    CForgeTowerGen.Strut(B.rope, [_cx + ca * (_r * 0.78 + 0.03), y1 + rise * 0.36 + 0.03, _cz + sa * (_r * 0.78 + 0.03)], [_cx + ca * (rc + 0.08), yt + 0.03, _cz + sa * (rc + 0.08)], 0.05);
                }
            }
            CForgeTowerGen.Ring(B.wood, _cx, _cz, rc - 0.08, rc + 0.06, yt - 0.02, yt + 0.12, 12, true);
            CForgeShape.Cap(B.dark, Array.from({ length: 10 }, (_v, _k) => [_cx + Math.cos(_k / 10 * Math.PI * 2) * (rc - 0.07), _cz + Math.sin(_k / 10 * Math.PI * 2) * (rc - 0.07)]), yt + 0.02);
            for (const s of [-1, 1])
                CForgeShape.Box(B.wood, _cx + Math.cos(_door + s * 1.1) * (rc - 0.04) * 0.5, _cz + Math.sin(_door + s * 1.1) * (rc - 0.04) * 0.5, 0.06, rc * 1.9, yt + 0.03, yt + 0.09, _door + s * 1.1 + Math.PI * 0.5);
            const fx = _cx + dx * (_r + 0.05), fz = _cz + dz * (_r + 0.05), dw = _grand ? 1.1 : 0.82, dh = _grand ? 1.45 : 1.3;
            CForgeShape.Box(B.wood, fx, fz, dw + 0.18, 0.12, _g, _g + dh + 0.1, ang);
            CForgeShape.Box(B.door, fx + dx * 0.04, fz + dz * 0.04, dw, 0.06, _g + 0.04, _g + dh, ang);
            if (_lod < 2)
                for (const [w, h] of [[dw * 0.78, dh * 0.82]])
                    CForgeShape.Box(_grand ? B.gold : B.trim, fx + dx * 0.075, fz + dz * 0.075, w, 0.012, _g + (dh - h) * 0.5, _g + (dh + h) * 0.5, ang);
            CForgeShape.Box(B.door, fx + dx * 0.08, fz + dz * 0.08, 0.025, 0.012, _g + 0.1, _g + dh - 0.06, ang);
            return;
        }
        if (_kind == 2) {
            const hh = _r * 1.05, prof = [[_r, _g - 0.15], [_r, _g + 0.22], [_r * 0.97, _g + hh * 0.3], [_r * 0.88, _g + hh * 0.55], [_r * 0.71, _g + hh * 0.75], [_r * 0.46, _g + hh * 0.9], [_r * 0.2, _g + hh * 0.98], [0, _g + hh]];
            CForgeTowerGen.Lathe(B.roof, _cx, _cz, prof, seg);
            CForgeTowerGen.Lathe(B.rope, _cx, _cz, [[_r * 0.14, _g + hh - 0.03], [_r * 0.1, _g + hh + 0.12], [0.03, _g + hh + 0.22], [0, _g + hh + 0.24]], 8);
            const fx = _cx + dx * (_r - 0.02), fz = _cz + dz * (_r - 0.02);
            CForgeTowerGen.ArchDecal(B.dark, _cx, _cz, _r + 0.02, _door, _g, _grand ? 0.95 : 0.7, _grand ? 1.25 : 0.95);
            CForgeShape.Box(B.wood, fx + dx * 0.18, fz + dz * 0.18, (_grand ? 1.25 : 1.0), 0.4, _g - 0.05, _g + 0.06, ang);
            return;
        }
        const re = _r + 0.55, y1 = _g + wh, k = 0.95, apex = y1 - 0.2 + re * k;
        CForgeTowerGen.Lathe(B.base, _cx, _cz, [[_r + 0.12, _g - 0.2], [_r + 0.1, _g + 0.35], [_r, _g + 0.42]], seg);
        CForgeTowerGen.Lathe(B.wall, _cx, _cz, [[_r, _g + 0.35], [_r, y1]], seg);
        CForgeTowerGen.Lathe(B.roof, _cx, _cz, [[re, y1 - 0.2], [re * 0.5, y1 - 0.2 + re * k * 0.5], [0, apex]], seg);
        CForgeTowerGen.Soffit(B.under, _cx, _cz, _r - 0.02, re, y1 - 0.22, seg);
        CForgeTowerGen.Lathe(B.roof, _cx, _cz, [[re + 0.02, y1 - 0.34], [re, y1 - 0.18]], seg);
        CForgeTowerGen.Lathe(B.rope, _cx, _cz, [[0.22, apex - 0.25], [0.18, apex + 0.1], [0.08, apex + 0.28], [0, apex + 0.32]], 8);
        if (_lod < 2) {
            const fx = _cx + dx * (_r + 0.03), fz = _cz + dz * (_r + 0.03), dw = _grand ? 1.1 : 0.85;
            CForgeShape.Box(B.wood, fx, fz, dw + 0.2, 0.1, _g + 0.35, _g + 2.0, ang);
            CForgeShape.Box(B.door, fx + dx * 0.03, fz + dz * 0.03, dw, 0.06, _g + 0.38, _g + 1.92, ang);
            for (const s of [-1, 1]) {
                const a = _door + s * 1.6;
                CForgeTowerGen.ArchDecal(B.dark, _cx, _cz, _r, a, _g + 1.15, 0.42, 0.5);
            }
        }
    }
    static Parts(B, T, _seed) {
        const pick = (_arr, _salt) => _arr[CForgeRand.Hash(_seed, _salt) % _arr.length], ger = T.mHut == 0;
        const thatch = pick(T.mThatch, 3), felt = pick(T.mFelt, 1), mud = pick(T.mAdobe, 1);
        const parts = [
            { buf: B.wall, rgb: ger ? felt : mud, tex: ger ? CForgeTex.sFelt : CForgeTex.sAdobe }, { buf: B.base, rgb: ger ? felt.map(_v => _v * 0.82) : mud.map(_v => _v * 0.78), tex: ger ? CForgeTex.sFelt : CForgeTex.sAdobe },
            { buf: B.roof, rgb: thatch, tex: T.mHut == 2 ? CForgeTex.sChoga : CForgeTex.sThatch }, { buf: B.under, rgb: ger ? T.mShutter[0].map(_v => _v * 0.9) : T.mWood, tex: CForgeTex.sWood },
            { buf: B.wood, rgb: ger ? T.mShutter[0].map(_v => _v * 0.85) : T.mWood, tex: CForgeTex.sWood }, { buf: B.rope, rgb: ger ? [0.42, 0.33, 0.24] : thatch.map(_v => _v * 0.8), tex: ger ? CForgeTex.sWood : CForgeTex.sThatch },
            { buf: B.trim, rgb: ger ? T.mCloth[0] : T.mWood, tex: ger ? CForgeTex.sFelt : CForgeTex.sWood }, { buf: B.door, rgb: pick(T.mShutter, 2), tex: CForgeTex.sPlank },
            { buf: B.dark, rgb: T.mDark }, { buf: B.gold, rgb: T.mGold },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static GreatHull(_r, _g, F) {
        const T = CForgeTheme.Of(_r), R = Math.min(_r.W * 0.42, _r.L * 0.3, 6.5), D = CForgeHutGen.Dim(T.mHut, R), g = CForgeHutGen.Ground(_g, F.P(0, 0), R);
        return [[0, 0, R, R, g - 0.5, g + D.top]];
    }
    static Great(_r, _g, F) {
        const T = CForgeTheme.Of(_r), B = CForgeHutGen.Bufs(), { L, W, fs } = _r, R = Math.min(W * 0.42, L * 0.3, 6.5), door = Math.atan2(F.v[1] * fs, F.v[0] * fs);
        const c = F.P(0, 0), pole = new CForgeMeshBuf(), cloth = new CForgeMeshBuf(), logA = new CForgeMeshBuf();
        CForgeHutGen.Hut(B, T.mHut, c[0], c[1], R, CForgeHutGen.Ground(_g, c, R), door, 0, _r.seed, true);
        if (T.mHut == 0) {
            const rs = Math.min(R * 0.55, (L * 0.5 - R) * 0.7);
            if (rs > 1.4)
                for (const s of [-1, 1]) {
                    const q = F.P(s * (R + rs + 0.8), -fs * 0.4);
                    CForgeHutGen.Hut(B, 0, q[0], q[1], rs, CForgeHutGen.Ground(_g, q, rs), door, 0, _r.seed + s, false);
                }
            for (const s of [-1, 1]) {
                const q = F.P(s * R * 0.55, fs * (R + 1.6)), g = _g(q[0], q[1]), h = 4.2;
                CForgeTowerGen.Lathe(pole, q[0], q[1], [[0.06, g - 0.3], [0.05, g + h]], 6);
                CForgeTowerGen.Lathe(cloth, q[0], q[1], [[0.06, g + h - 1.0], [0.42, g + h - 0.85], [0.36, g + h - 0.45], [0.08, g + h - 0.3]], 10);
                CForgeTowerGen.Lathe(B.gold, q[0], q[1], [[0.05, g + h], [0.09, g + h + 0.12], [0.02, g + h + 0.55], [0, g + h + 0.6]], 6);
                CForgeShape.Box(pole, q[0], q[1], 0.7, 0.7, g - 0.3, g + 0.25, 0);
            }
        }
        else {
            const rr = Math.min(R + 3.0, W * 0.5 - 0.3, L * 0.5 - 0.3), n = Math.round(Math.PI * 2 * rr / 0.32);
            for (let k = 0; k < n; k++) {
                const a = k / n * Math.PI * 2, d = Math.atan2(Math.sin(a - door), Math.cos(a - door));
                if (Math.abs(d) < 0.25)
                    continue;
                const x = c[0] + Math.cos(a) * rr, z = c[1] + Math.sin(a) * rr, h = CForgeRand.Hash(_r.seed, k, 41);
                CForgeWallGen.Log(logA, x, z, 0.1 + (h % 5) * 0.01, _g(x, z) - 0.4, _g(x, z) + 1.6 + ((h >>> 6) % 30) / 100, 0.22, h);
            }
        }
        const parts = CForgeHutGen.Parts(B, T, _r.seed);
        parts.push({ buf: pole, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: cloth, rgb: [0.12, 0.1, 0.09], tex: CForgeTex.sThatch }, { buf: logA, rgb: T.mLogWood[0], tex: CForgeTex.sWood });
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
}
