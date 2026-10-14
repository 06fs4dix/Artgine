import { CForgeRand } from "../ForgeBuild/CForgeRand.js";
import { CForgeFloraMeshBuf } from "./CForgeFloraMeshBuf.js";
import { CForgeFloraShape } from "./CForgeFloraShape.js";
import { CForgeFloraTex } from "./CForgeFloraTex.js";
export class CForgeFloraTreeGen {
    static ePreset = { Broad: "broad", Conifer: "conifer", Bush: "bush", Bamboo: "bamboo" };
    static sPreset = {
        broad: { h: [7, 10], trunkR: 0.17, crown: 0.35, l1: [10, 14], l1Len: 0.42, l1Ang: [40, 65], l1Curve: 0.35,
            l2: [4, 6], l2Len: 0.5, l2Ang: [30, 55], leaf: 1.6, leafN: 7, shape: "ellipse", bark: CForgeFloraTex.sBark, needle: false },
        conifer: { h: [9, 14], trunkR: 0.13, crown: 0.12, l1: [30, 40], l1Len: 0.3, l1Ang: [78, 100], l1Curve: -0.15,
            l2: [2, 4], l2Len: 0.4, l2Ang: [35, 55], leaf: 1.9, leafN: 0, shape: "cone", bark: CForgeFloraTex.sBarkPine, needle: true },
        bush: { h: [1.2, 2.0], trunkR: 0, crown: 0, l1: [7, 10], l1Len: 0.6, l1Ang: [15, 55], l1Curve: 0.25,
            l2: [2, 3], l2Len: 0.5, l2Ang: [30, 50], leaf: 0.6, leafN: 3, shape: "bush", bark: CForgeFloraTex.sBark, needle: false },
    };
    static Param(_preset) { return CForgeFloraTreeGen.sPreset[_preset] ?? CForgeFloraTreeGen.sPreset.broad; }
    static Tex(_preset) {
        if (_preset == CForgeFloraTreeGen.ePreset.Bamboo)
            return [CForgeFloraTex.sBamboo, CForgeFloraTex.sBambooLeaf];
        const P = CForgeFloraTreeGen.Param(_preset);
        return [P.bark, P.needle ? CForgeFloraTex.sNeedle : CForgeFloraTex.sLeaf];
    }
    static Build(_preset, _seed, _lod) {
        if (_preset == CForgeFloraTreeGen.ePreset.Bamboo)
            return CForgeFloraTreeGen.Bamboo(_seed, _lod);
        const P = CForgeFloraTreeGen.Param(_preset), sk = CForgeFloraTreeGen.Skeleton(P, _seed), b = new CForgeFloraMeshBuf();
        for (const br of sk.br) {
            if (br.lv == 2 && _lod > 0)
                continue;
            const side = br.lv == 0 ? (_lod == 0 ? 8 : 5) : (br.lv == 1 && _lod == 0 ? 5 : 3);
            CForgeFloraShape.Tube(b, br.pts, br.rad, side, { slot: 0, u0: 0, u1: 1, vScale: 1 / (4 * Math.PI * Math.max(br.rad[0], 0.03)), flex: br.flex });
        }
        if (P.needle)
            CForgeFloraTreeGen.Needles(b, P, sk, _seed, _lod);
        else
            CForgeFloraTreeGen.Leaves(b, P, sk, _seed, _lod);
        return b;
    }
    static Skeleton(P, _seed) {
        const S = CForgeFloraShape, r = new CForgeRand(CForgeRand.Hash(_seed, 57)), H = r.Range(P.h[0], P.h[1]), br = [];
        let trunk = null;
        if (P.trunkR > 0) {
            const n = 8, R0 = P.trunkR * H / 8, lx = r.Range(-1, 1) * 0.04 * H, lz = r.Range(-1, 1) * 0.04 * H;
            trunk = { pts: [], rad: [], flex: [], lv: 0 };
            for (let k = 0; k < n; k++) {
                const t = k / (n - 1), w = t * t;
                trunk.pts.push([lx * w + r.Range(-0.03, 0.03) * H * t, H * t, lz * w + r.Range(-0.03, 0.03) * H * t]);
                trunk.rad.push(R0 * (1 - 0.85 * t) * (k == 0 ? 1.35 : 1));
                trunk.flex.push(0.2 * w);
            }
            br.push(trunk);
        }
        const Interp = (_b, _s) => {
            const a = S.At(_b.pts, _s), j = Math.min(a.i + 1, _b.pts.length - 1);
            return { p: a.p, d: a.d, rad: _b.rad[a.i] + (_b.rad[j] - _b.rad[a.i]) * a.f, flex: _b.flex[a.i] + (_b.flex[j] - _b.flex[a.i]) * a.f };
        };
        const cnt = r.Int(P.l1[0], P.l1[1]), D = Math.PI / 180;
        let tipSum = [0, 0, 0], tipN = 0;
        for (let i = 0; i < cnt; i++) {
            const t = trunk == null ? 0.02 : Math.min(0.97, P.crown + (1 - P.crown) * (i + r.Range(0, 0.8)) / cnt);
            const tp = trunk == null ? 0 : (t - P.crown) / (1 - P.crown);
            const env = P.shape == "cone" ? 1 - tp * 0.88 : P.shape == "ellipse" ? 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, 0.15 + tp * 0.85)) : r.Range(0.7, 1);
            const L = H * P.l1Len * env * r.Range(0.85, 1.1), az = i * 2.39996 + r.Range(-0.3, 0.3), ang = r.Range(P.l1Ang[0], P.l1Ang[1]) * D;
            const at = trunk != null ? Interp(trunk, t) : { p: [r.Range(-0.1, 0.1), 0, r.Range(-0.1, 0.1)], rad: 0.04 * H, flex: 0, d: [0, 1, 0] };
            const rA = trunk != null ? at.rad * 0.55 * Math.sqrt(env) : 0.012 * H;
            const b1 = { pts: [at.p], rad: [rA], flex: [at.flex], lv: 1 };
            let d = [Math.sin(ang) * Math.cos(az), Math.cos(ang), Math.sin(ang) * Math.sin(az)], p = at.p;
            for (let k = 1; k <= 4; k++) {
                d = S.Nor(S.Add(S.Add(d, [0, P.l1Curve * 0.6, 0]), S.Mul(S.RandDir(r), 0.1)));
                p = S.Add(p, S.Mul(d, L / 4));
                b1.pts.push(p);
                b1.rad.push(Math.max(0.012, rA * (1 - 0.8 * k / 4)));
                b1.flex.push(at.flex + 0.45 * k / 4);
            }
            br.push(b1);
            tipSum = S.Add(tipSum, p);
            tipN++;
            const c2 = r.Int(P.l2[0], P.l2[1]);
            for (let j = 0; j < c2; j++) {
                const s = r.Range(0.3, 0.92), a2 = Interp(b1, s);
                const axis = S.Rot(S.Perp(a2.d), a2.d, r.Range(0, Math.PI * 2));
                let d2 = S.Rot(a2.d, axis, r.Range(P.l2Ang[0], P.l2Ang[1]) * D);
                if (!P.needle)
                    d2 = S.Nor(S.Add(d2, [0, 0.2, 0]));
                const L2 = L * P.l2Len * (1 - 0.4 * s) * r.Range(0.8, 1.1);
                const b2 = { pts: [a2.p], rad: [Math.max(0.006, a2.rad * 0.5)], flex: [a2.flex], lv: 2 };
                let q = a2.p;
                for (let k = 1; k <= 2; k++) {
                    d2 = S.Nor(S.Add(S.Add(d2, [0, P.l1Curve * 0.4, 0]), S.Mul(S.RandDir(r), 0.12)));
                    q = S.Add(q, S.Mul(d2, L2 / 2));
                    b2.pts.push(q);
                    b2.rad.push(Math.max(0.006, b2.rad[0] * (1 - 0.8 * k / 2)));
                    b2.flex.push(a2.flex + 0.3 * k / 2);
                }
                br.push(b2);
                tipSum = S.Add(tipSum, q);
                tipN++;
            }
        }
        return { br, h: H, crown: tipN > 0 ? S.Mul(tipSum, 1 / tipN) : [0, H * 0.6, 0] };
    }
    static Leaves(_b, P, sk, _seed, _lod) {
        const S = CForgeFloraShape;
        sk.br.forEach((_br, _i) => {
            if (_br.lv == 0)
                return;
            const r = new CForgeRand(CForgeRand.Hash(_seed, _i, 5)), n = _br.lv == 2 ? P.leafN : 4;
            for (let k = 0; k < n; k++) {
                const s = _br.lv == 2 ? 0.35 + 0.65 * r.Next() : 0.6 + 0.4 * r.Next(), a = S.At(_br.pts, s);
                const fl = _br.flex[a.i] + (_br.flex[Math.min(a.i + 1, _br.flex.length - 1)] - _br.flex[a.i]) * a.f + 0.15;
                const c = S.Add(a.p, S.Mul(S.RandDir(r), 0.15 * P.leaf));
                let sz = P.leaf * r.Range(0.75, 1.2);
                const out = S.Nor(S.Sub(c, sk.crown)), n0 = S.Nor(S.Add(out, S.Mul(S.RandDir(r), 0.8)));
                const rg = S.Nor(S.Cross(n0, S.RandDir(r))), up = S.Cross(n0, rg);
                if (_lod > 0 && k % 3 == 2)
                    continue;
                if (_lod > 0)
                    sz *= 1.25;
                const o = S.Sub(S.Sub(c, S.Mul(rg, sz / 2)), S.Mul(up, sz / 2));
                S.Card(_b, o, S.Mul(rg, sz), S.Mul(up, sz), [0.02, 0.02, 0.98, 0.98], S.Nor(S.Add(S.Mul(out, 0.75), S.Mul(n0, 0.25))), 1, [fl, fl, fl, fl]);
            }
        });
    }
    static Needles(_b, P, sk, _seed, _lod) {
        const S = CForgeFloraShape, UP = [0, 1, 0], D = Math.PI / 180;
        const Pair = (_a, _c, _w, _fa, _fc) => {
            const ax = S.Sub(_c, _a), dir = S.Nor(ax);
            let side = S.Cross(dir, UP);
            side = S.Len(side) < 1e-4 ? [1, 0, 0] : S.Nor(side);
            const out = S.Nor(S.Add(S.Nor([_a[0], 0, _a[2]]), [0, 0.8, 0]));
            const f = [_fa, _fc, _fc, _fa];
            for (const [ang, w] of [[-8, 1], [55, 0.85], [-50, 0.75]]) {
                const e = S.Mul(S.Rot(side, dir, ang * D), _w * w);
                S.Card(_b, S.Sub(_a, S.Mul(e, 0.5)), ax, e, [0, 0.02, 1, 0.98], out, 1, f);
            }
        };
        for (const br of sk.br) {
            if (br.lv == 0 || (br.lv == 2 && _lod > 0))
                continue;
            const W = P.leaf * (br.lv == 1 ? 1 : 0.7), n = br.pts.length;
            if (_lod > 0) {
                Pair(br.pts[0], br.pts[n - 1], W * 1.1, br.flex[0] + 0.1, br.flex[n - 1] + 0.1);
                continue;
            }
            for (let k = 0; k + 1 < n; k++)
                Pair(br.pts[k], br.pts[k + 1], W * (1 - 0.35 * k / (n - 1)), br.flex[k] + 0.1, br.flex[k + 1] + 0.1);
        }
        const trunk = sk.br.find(_q => _q.lv == 0);
        if (trunk == null)
            return;
        const top = trunk.pts[trunk.pts.length - 1], len = sk.h * 0.14, w = P.leaf * 0.8;
        const base = S.Sub(top, [0, len, 0]), ft = trunk.flex[trunk.flex.length - 1] + 0.1;
        for (const side of [[1, 0, 0], [0, 0, 1]])
            S.Card(_b, S.Sub(base, S.Mul(side, w / 2)), [0, len * 1.08, 0], S.Mul(side, w), [0, 0.02, 1, 0.98], [side[2], 0.6, side[0]], 1, [ft - 0.1, ft, ft, ft - 0.1]);
    }
    static Bamboo(_seed, _lod) {
        const S = CForgeFloraShape, r = new CForgeRand(CForgeRand.Hash(_seed, 91)), b = new CForgeFloraMeshBuf(), UP = [0, 1, 0];
        const cnt = r.Int(6, 10), H = r.Range(5, 7.5);
        for (let c = 0; c < cnt; c++) {
            const a = r.Range(0, Math.PI * 2), d = Math.sqrt(r.Next()) * 0.5, h = H * r.Range(0.7, 1), rad = r.Range(0.025, 0.04);
            const lean = r.Range(0.03, 0.12) + d * 0.15, lx = Math.cos(a), lz = Math.sin(a), node = r.Range(0.3, 0.42), n = Math.max(2, Math.round(h / node));
            const pts = [], rr = [], fl = [];
            for (let k = 0; k <= n; k++) {
                const t = k / n, off = Math.sin(lean * t * 1.6) * h * t * 0.6;
                pts.push([lx * (d + off), h * t, lz * (d + off)]);
                rr.push(rad * (1 - 0.45 * t));
                fl.push(0.6 * t * t);
            }
            S.Tube(b, pts, rr, _lod == 0 ? 6 : 3, { slot: 0, u0: 0, u1: 1, vScale: 1 / (h / n), flex: fl });
            for (let k = Math.ceil(n * 0.45); k < n; k++) {
                const keep = _lod == 0 || k % 2 == 0;
                for (let j = 0; j < 2; j++) {
                    const ya = r.Range(0, Math.PI * 2), up = r.Range(0.2, 0.6), len = r.Range(0.5, 0.9) * (1 - 0.3 * k / n), w = r.Range(0.3, 0.42);
                    if (!keep)
                        continue;
                    const p = pts[k], dir = S.Nor([Math.cos(ya), up, Math.sin(ya)]), e = S.Add(p, S.Mul(dir, len)), f0 = fl[k], f1 = Math.min(1, f0 + 0.3);
                    if (_lod == 0)
                        S.Tube(b, [p, e], [0.006, 0.003], 3, { slot: 0, u0: 0, u1: 1, vScale: 1, flex: [f0, f1], v0: 0.5 });
                    let side = S.Cross(dir, UP);
                    side = S.Len(side) < 1e-4 ? [1, 0, 0] : S.Nor(side);
                    const ww = w * (_lod == 0 ? 1 : 1.3), ax = S.Mul(dir, len * (_lod == 0 ? 1 : 1.2));
                    for (const ang of [-20, 35]) {
                        const ev = S.Mul(S.Rot(side, dir, ang * Math.PI / 180), ww);
                        S.Card(b, S.Sub(p, S.Mul(ev, 0.5)), ax, ev, [0, 0.02, 1, 0.98], S.Nor(S.Add(S.Nor([p[0], 0, p[2]]), [0, 0.7, 0])), 1, [f0, f1, f1, f0]);
                    }
                }
            }
        }
        return b;
    }
}
