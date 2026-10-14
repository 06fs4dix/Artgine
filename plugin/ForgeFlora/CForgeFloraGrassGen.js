import { CForgeRand } from "../ForgeBuild/CForgeRand.js";
import { CForgeFloraMeshBuf } from "./CForgeFloraMeshBuf.js";
import { CForgeFloraShape } from "./CForgeFloraShape.js";
import { CForgeFloraTex } from "./CForgeFloraTex.js";
export class CForgeFloraGrassGen {
    static ePreset = { Short: "short", Tall: "tall", Wispy: "wispy", Reed: "reed", Wheat: "wheat",
        Flower: "flower", Clover: "clover", Fern: "fern", Barley: "barley", Rice: "rice", Cattail: "cattail", Lily: "lily" };
    static sPreset = {
        short: { cnt: 12, h: [0.22, 0.38], w: [0.026, 0.04], r: 0.13, lean: [0.1, 0.45], bend: [0.2, 0.6], col: [0, 1, 2, 3, 4] },
        tall: { cnt: 12, h: [0.45, 0.75], w: [0.03, 0.046], r: 0.16, lean: [0.1, 0.4], bend: [0.3, 0.8], col: [0, 1, 2, 4] },
        wispy: { cnt: 16, h: [0.3, 0.55], w: [0.012, 0.02], r: 0.18, lean: [0.2, 0.55], bend: [0.5, 1.1], col: [1, 3, 5] },
        reed: { cnt: 10, h: [1.0, 1.6], w: [0.026, 0.04], r: 0.12, lean: [0.05, 0.25], bend: [0.15, 0.45], col: [0, 3, 5] },
        wheat: { cnt: 12, h: [0.8, 1.0], w: [0.008, 0.012], r: 0.14, lean: [0.02, 0.15], bend: [0.05, 0.25], col: [6, 6, 5] },
        barley: { cnt: 9, h: [0.7, 0.9], w: [0.008, 0.012], r: 0.14, lean: [0.02, 0.15], bend: [0.05, 0.25], col: [6, 6, 6, 5] },
        rice: { cnt: 12, h: [0.7, 0.9], w: [0.008, 0.012], r: 0.12, lean: [0.02, 0.12], bend: [0.05, 0.2], col: [1, 5, 1] },
        cattail: { cnt: 10, h: [1.2, 1.7], w: [0.018, 0.026], r: 0.14, lean: [0.03, 0.2], bend: [0.1, 0.35], col: [0, 3, 5] },
    };
    static Tex(_preset) {
        const P = CForgeFloraGrassGen.ePreset;
        if (_preset == P.Flower)
            return [CForgeFloraTex.sGrass, CForgeFloraTex.sFlower];
        if (_preset == P.Clover)
            return [CForgeFloraTex.sGrass, CForgeFloraTex.sClover];
        if (_preset == P.Fern)
            return [CForgeFloraTex.sGrass, CForgeFloraTex.sFern];
        if (_preset == P.Lily)
            return [CForgeFloraTex.sGrass, CForgeFloraTex.sLily];
        return [CForgeFloraTex.sGrass];
    }
    static Cut(_preset) { return CForgeFloraGrassGen.Tex(_preset).length > 1; }
    static Build(_preset, _seed, _lod) {
        const P = CForgeFloraGrassGen.ePreset, r = new CForgeRand(CForgeRand.Hash(_seed, 31));
        if (_preset == P.Flower)
            return CForgeFloraGrassGen.Flower(r, _lod);
        if (_preset == P.Clover)
            return CForgeFloraGrassGen.Clover(r, _lod);
        if (_preset == P.Fern)
            return CForgeFloraGrassGen.Fern(r, _lod);
        if (_preset == P.Lily)
            return CForgeFloraGrassGen.Lily(r, _lod);
        return CForgeFloraGrassGen.Blades(_preset, r, _lod);
    }
    static Blades(_preset, r, _lod) {
        const P = CForgeFloraGrassGen.sPreset[_preset] ?? CForgeFloraGrassGen.sPreset.short, E = CForgeFloraGrassGen.ePreset;
        const b = new CForgeFloraMeshBuf(), seg = _lod == 0 ? 3 : 1, hMax = P.h[1];
        for (let i = 0; i < P.cnt; i++) {
            const a = r.Range(0, Math.PI * 2), d = Math.sqrt(r.Next()) * P.r;
            const base = [Math.cos(a) * d, 0, Math.sin(a) * d];
            const yaw = a + r.Range(-0.7, 0.7), h = r.Range(P.h[0], P.h[1]), w = r.Range(P.w[0], P.w[1]);
            const lean = r.Range(P.lean[0], P.lean[1]) * (0.5 + d / P.r), bend = r.Range(P.bend[0], P.bend[1]);
            const [u0, u1] = CForgeFloraTex.GrassU(r.Pick(P.col));
            const head = r.Next(), side = r.Next();
            if (_lod > 0 && i % 2 == 1)
                continue;
            const grain = _preset == E.Wheat || _preset == E.Barley || _preset == E.Rice;
            if (_preset == E.Cattail && head < 0.3) {
                CForgeFloraShape.Blade(b, base, yaw, h * 0.9, 0.01, lean * 0.3, bend * 0.2, seg, u0, u1, 0, hMax);
                CForgeFloraGrassGen.Head(b, base, yaw, h * 0.75, lean * 0.3, bend * 0.2, seg, 0.2, [0.012, 0.026, 0.028, 0.026, 0.01], 7, hMax, _lod);
                continue;
            }
            CForgeFloraShape.Blade(b, base, yaw, h, w, lean, bend, seg, u0, u1, 0, hMax);
            if (_preset == E.Wheat || _preset == E.Barley)
                CForgeFloraGrassGen.Head(b, base, yaw, h, lean, bend, seg, 0.1, [0.004, 0.016, 0.003], 6, hMax, _lod);
            if (_preset == E.Barley && _lod == 0) {
                const tip = CForgeFloraShape.BladeTip(base, yaw, h, lean, bend, seg), [a0, a1] = CForgeFloraTex.GrassU(6);
                for (let k = 0; k < 2; k++)
                    CForgeFloraShape.Blade(b, CForgeFloraShape.Add(tip.p, CForgeFloraShape.Mul(tip.d, 0.04 * k)), yaw + k * 3.1, 0.12, 0.004, lean + 0.25, 0.1, 1, a0, a1, 0, hMax);
            }
            if (_preset == E.Rice) {
                const tip = CForgeFloraShape.BladeTip(base, yaw, h, lean, bend, seg), [a0, a1] = CForgeFloraTex.GrassU(6);
                for (let k = 0; k < (_lod == 0 ? 3 : 2); k++)
                    CForgeFloraShape.Blade(b, tip.p, yaw + (k - 1) * 0.4, 0.2, 0.012, lean + bend + 0.3, 1.9, _lod == 0 ? 2 : 1, a0, a1, 0, hMax);
            }
            if (grain && _lod == 0 && i % 2 == 0)
                CForgeFloraShape.Blade(b, base, yaw + 1.6, h * 0.45, 0.02, lean + 0.3, 0.8, 2, u0, u1, 0, hMax);
            if (_preset == E.Reed && head < 0.25)
                CForgeFloraGrassGen.Head(b, base, yaw, h * 0.85, lean * 0.3, bend * 0.3, seg, 0.16, [0.012, 0.018, 0.018, 0.017, 0.008], 7, hMax, _lod);
            if (_preset == E.Cattail && side < 0.5 && _lod == 0)
                CForgeFloraShape.Blade(b, base, yaw + 2.5, h * 0.7, w, lean + 0.2, bend + 0.2, seg, u0, u1, 0, hMax);
        }
        return b;
    }
    static Head(_b, _base, _yaw, _h, _lean, _bend, _seg, _len, _rad, _col, _hMax, _lod) {
        const S = CForgeFloraShape, tip = S.BladeTip(_base, _yaw, _h, _lean, _bend, _seg);
        const n = _rad.length, pts = [], flex = [];
        for (let k = 0; k < n; k++) {
            const q = S.Add(tip.p, S.Mul(tip.d, _len * k / (n - 1)));
            pts.push(q);
            flex.push(Math.pow(Math.min(1, q[1] / _hMax), 1.5));
        }
        const [u0, u1] = CForgeFloraTex.GrassU(_col);
        S.Tube(_b, pts, _rad, _lod == 0 ? 4 : 3, { slot: 0, u0, u1, vScale: 2, flex, v0: 0.7 });
    }
    static Flower(r, _lod) {
        const S = CForgeFloraShape, b = new CForgeFloraMeshBuf(), seg = _lod == 0 ? 3 : 1, hMax = 0.55, cnt = r.Int(5, 8);
        const p0 = r.Int(0, 3), pal = [p0, (p0 + r.Int(1, 3)) % 4], [u0, u1] = CForgeFloraTex.GrassU(1);
        for (let i = 0; i < cnt; i++) {
            const a = r.Range(0, Math.PI * 2), d = Math.sqrt(r.Next()) * 0.12, base = [Math.cos(a) * d, 0, Math.sin(a) * d];
            const yaw = a + r.Range(-0.5, 0.5), h = r.Range(0.25, 0.5), lean = r.Range(0.05, 0.3), bend = r.Range(0.05, 0.3), sz = r.Range(0.06, 0.1), q = pal[i % 2];
            const leafYaw = r.Range(0, Math.PI * 2), tilt = r.Range(-0.4, 0.4);
            if (_lod > 0 && i % 2 == 1)
                continue;
            CForgeFloraShape.Blade(b, base, yaw, h, 0.006, lean, bend, seg, u0, u1, 0, hMax);
            const tip = S.BladeTip(base, yaw, h, lean, bend, seg), up = S.Nor(S.Add(tip.d, [Math.cos(leafYaw) * tilt, 0, Math.sin(leafYaw) * tilt]));
            const rg = S.Perp(up), fw = S.Cross(up, rg), fl = Math.pow(Math.min(1, tip.p[1] / hMax), 1.5);
            S.Card(b, S.Sub(S.Sub(tip.p, S.Mul(rg, sz / 2)), S.Mul(fw, sz / 2)), S.Mul(rg, sz), S.Mul(fw, sz), CForgeFloraTex.Quad(q), up, 1, [fl, fl, fl, fl]);
            if (_lod == 0)
                CForgeFloraShape.Blade(b, base, leafYaw, h * 0.4, 0.02, 0.5, 0.6, 2, u0, u1, 0, hMax);
        }
        return b;
    }
    static Clover(r, _lod) {
        const S = CForgeFloraShape, b = new CForgeFloraMeshBuf(), cnt = 12;
        for (let i = 0; i < cnt; i++) {
            const a = r.Range(0, Math.PI * 2), d = Math.sqrt(r.Next()) * 0.14, y = r.Range(0.03, 0.09), sz = r.Range(0.05, 0.075), rot = r.Range(0, Math.PI * 2);
            const tx = r.Range(-0.25, 0.25), tz = r.Range(-0.25, 0.25);
            if (_lod > 0 && i % 2 == 1)
                continue;
            const up = S.Nor([tx, 1, tz]), rg = S.Nor(S.Cross(up, [Math.cos(rot), 0, Math.sin(rot)])), fw = S.Cross(up, rg), c = [Math.cos(a) * d, y, Math.sin(a) * d];
            const f = y / 0.1 * 0.6;
            S.Card(b, S.Sub(S.Sub(c, S.Mul(rg, sz / 2)), S.Mul(fw, sz / 2)), S.Mul(rg, sz), S.Mul(fw, sz), [0.02, 0.02, 0.98, 0.98], up, 1, [f, f, f, f]);
        }
        return b;
    }
    static Fern(r, _lod) {
        const b = new CForgeFloraMeshBuf(), cnt = r.Int(6, 9), seg = _lod == 0 ? 4 : 2;
        for (let i = 0; i < cnt; i++) {
            const yaw = i / cnt * Math.PI * 2 + r.Range(-0.3, 0.3), h = r.Range(0.5, 0.85), w = r.Range(0.2, 0.3), lean = r.Range(0.35, 0.7), bend = r.Range(0.6, 1.1);
            const base = [Math.cos(yaw) * 0.03, 0, Math.sin(yaw) * 0.03];
            if (_lod > 0 && i % 3 == 2)
                continue;
            CForgeFloraShape.Frond(b, base, yaw, h, w, lean, bend, seg, [0.02, 0.02, 0.98, 0.98], 1, 0.7);
        }
        return b;
    }
    static Lily(r, _lod) {
        const S = CForgeFloraShape, b = new CForgeFloraMeshBuf(), cnt = r.Int(3, 6), UP = [0, 1, 0];
        for (let i = 0; i < cnt; i++) {
            const a = r.Range(0, Math.PI * 2), d = Math.sqrt(r.Next()) * 0.35, sz = r.Range(0.22, 0.38), rot = r.Range(0, Math.PI * 2), q = r.Next() < 0.15 ? 3 : r.Int(0, 1);
            const rg = [Math.cos(rot), 0, Math.sin(rot)], fw = S.Cross(UP, rg), c = [Math.cos(a) * d, 0.005 + i * 0.002, Math.sin(a) * d];
            S.Card(b, S.Sub(S.Sub(c, S.Mul(rg, sz / 2)), S.Mul(fw, sz / 2)), S.Mul(rg, sz), S.Mul(fw, sz), CForgeFloraTex.Quad(q), UP, 1, [0.05, 0.05, 0.05, 0.05]);
        }
        if (r.Next() < 0.45) {
            const sz = 0.13, c = [r.Range(-0.1, 0.1), 0.05, r.Range(-0.1, 0.1)];
            for (const k of [0, 1]) {
                const rg = k == 0 ? [1, 0, 0] : [0, 0, 1];
                S.Card(b, S.Sub(S.Sub(c, S.Mul(rg, sz / 2)), [0, sz * 0.35, 0]), S.Mul(rg, sz), [0, sz, 0], CForgeFloraTex.Quad(2), UP, 1, [0.1, 0.1, 0.1, 0.1]);
            }
            S.Card(b, S.Sub(c, [sz / 2, -0.01, sz / 2]), [sz, 0, 0], [0, 0, sz], CForgeFloraTex.Quad(2), UP, 1, [0.1, 0.1, 0.1, 0.1]);
        }
        return b;
    }
}
