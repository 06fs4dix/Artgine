import { CTexture } from "../../artgine/render/CTexture.js";
import { CForgeFloraAsset } from "./CForgeFloraAsset.js";
import { CForgeFloraTex } from "./CForgeFloraTex.js";
import { CForgeFloraBake } from "./CForgeFloraBake.js";
import { CForgeFloraGrassGen } from "./CForgeFloraGrassGen.js";
import { CForgeFloraTreeGen } from "./CForgeFloraTreeGen.js";
import { CForgeFloraRockGen } from "./CForgeFloraRockGen.js";
export { CForgeFloraAsset } from "./CForgeFloraAsset.js";
export { CForgeFloraMeshBuf } from "./CForgeFloraMeshBuf.js";
export { CForgeFloraTex } from "./CForgeFloraTex.js";
export { CForgeFloraShape } from "./CForgeFloraShape.js";
export { CForgeFloraBake } from "./CForgeFloraBake.js";
export { CForgeFloraGrassGen } from "./CForgeFloraGrassGen.js";
export { CForgeFloraTreeGen } from "./CForgeFloraTreeGen.js";
export { CForgeFloraRockGen } from "./CForgeFloraRockGen.js";
export class CForgeFloraFactory {
    static eKind = { Grass: "grass", Tree: "tree", Rock: "rock" };
    static eGrass = CForgeFloraGrassGen.ePreset;
    static eTree = CForgeFloraTreeGen.ePreset;
    static eRock = CForgeFloraRockGen.ePreset;
    static sWindLod = 1;
    static sImpostorSize = 256;
    static sCount = 0;
    mFrame;
    mId;
    mPBR = false;
    mReal = false;
    mAsset = [];
    mTexMesh = [];
    constructor(_frame, _pbr = false, _real = false) {
        this.mFrame = _frame;
        this.mId = ++CForgeFloraFactory.sCount;
        this.mPBR = _pbr;
        this.mReal = _real;
        CForgeFloraTex.Build(_frame, _pbr, _real);
    }
    ApplyReal(_on) {
        if (this.mReal == _on)
            return;
        this.mReal = _on;
        CForgeFloraTex.Build(this.mFrame, this.mPBR, true);
        for (const m of this.mTexMesh) {
            const mesh = this.mFrame.Res().Find(m.key);
            if (mesh == null || mesh.texture == null)
                continue;
            const alb = _on ? m.albs.map(_k => CForgeFloraTex.Real(_k)) : m.albs;
            for (let i = 0; i < alb.length; i++)
                mesh.texture[i] = alb[i];
            if (m.pbr)
                for (let i = 0; i < alb.length; i++)
                    mesh.texture[alb.length + i] = CForgeFloraTex.Mat(alb[i]);
        }
    }
    Grass(_preset, _seed) {
        const a = this.Finish(CForgeFloraFactory.eKind.Grass, _preset, _seed, _l => CForgeFloraGrassGen.Build(_preset, _seed, _l), 2, CForgeFloraGrassGen.Tex(_preset), false, true);
        a.mCut = CForgeFloraGrassGen.Cut(_preset);
        return a;
    }
    Tree(_preset, _seed, _billboard = true) {
        const a = this.Finish(CForgeFloraFactory.eKind.Tree, _preset, _seed, _l => CForgeFloraTreeGen.Build(_preset, _seed, _l), 2, CForgeFloraTreeGen.Tex(_preset), _billboard, true);
        a.mCut = true;
        return a;
    }
    Rock(_preset, _seed) {
        return this.Finish(CForgeFloraFactory.eKind.Rock, _preset, _seed, _l => CForgeFloraRockGen.Build(_preset, _seed, _l), 2, [CForgeFloraTex.sRock], false, false);
    }
    Release(_a) {
        const frame = this.mFrame;
        for (const key of _a.mLod) {
            const res = frame.Res().Find(key);
            if (res == null)
                continue;
            if (key.endsWith(".tex"))
                frame.Ren().ReleaseTexture(res);
            const dm = "Artgine/DM/" + key;
            for (const [k, v] of [...frame.Res().mResMap]) {
                if (k.indexOf(dm) != 0)
                    continue;
                frame.Ren().ReleaseMeshDrawNode(v);
                frame.Res().Remove(k);
            }
            frame.Res().Remove(key);
        }
        this.mAsset = this.mAsset.filter(_q => _q != _a);
    }
    static sFitPct = 0.9;
    static Spread(_b) {
        const P = _b.mPos, n = P.length / 3, r = new Float32Array(n), y = new Float32Array(n);
        let y0 = Infinity;
        for (let i = 0; i < n; i++)
            y0 = Math.min(y0, P[i * 3 + 1]);
        for (let i = 0; i < n; i++) {
            r[i] = Math.hypot(P[i * 3], P[i * 3 + 2]);
            y[i] = P[i * 3 + 1] - y0;
        }
        r.sort();
        y.sort();
        const k = Math.min(n - 1, Math.floor(n * CForgeFloraFactory.sFitPct));
        return [r[k], y[k], y0];
    }
    static Fit(_ref, _b) {
        if (_ref.mPos.length == 0 || _b.mPos.length == 0)
            return;
        const [r0, h0] = CForgeFloraFactory.Spread(_ref), [r1, h1, y1] = CForgeFloraFactory.Spread(_b);
        const sr = r1 > 1e-4 ? Math.min(1.5, Math.max(0.67, r0 / r1)) : 1, sh = h1 > 1e-4 ? Math.min(1.5, Math.max(0.67, h0 / h1)) : 1, P = _b.mPos;
        for (let i = 0; i < P.length; i += 3) {
            P[i] *= sr;
            P[i + 2] *= sr;
            P[i + 1] = y1 + (P[i + 1] - y1) * sh;
        }
        if (Math.abs(sr - sh) > 1e-4) {
            const N = _b.mNor;
            for (let i = 0; i < N.length; i += 3) {
                const x = N[i] / sr, yv = N[i + 1] / sh, z = N[i + 2] / sr, l = Math.hypot(x, yv, z) || 1;
                N[i] = x / l;
                N[i + 1] = yv / l;
                N[i + 2] = z / l;
            }
        }
    }
    Finish(_kind, _preset, _seed, _gen, _lodN, _tex, _billboard, _sway) {
        const t0 = performance.now(), a = new CForgeFloraAsset();
        a.mKind = _kind;
        a.mPreset = _preset;
        a.mSeed = _seed;
        const pre = "forgeflora" + this.mId + "_" + _kind + "_" + _preset + "_" + _seed;
        let bound = null, lod0 = null;
        for (let l = 0; l < _lodN; l++) {
            const b = _gen(l);
            if (l == 0) {
                const o = b.Bound(), R = Math.max(-o[0], o[3], -o[2], o[5]);
                bound = [-R, o[1], -R, R, o[4], R];
                lod0 = b;
            }
            else if (lod0 != null)
                CForgeFloraFactory.Fit(lod0, b);
            const key = pre + "_l" + l + ".mesh";
            const wind = _sway && l < CForgeFloraFactory.sWindLod;
            const alb = this.mReal ? _tex.map(_k => CForgeFloraTex.Real(_k)) : _tex;
            if (!b.Commit(this.mFrame, key, alb, bound, wind, this.mPBR))
                continue;
            this.mTexMesh.push({ key, albs: _tex.slice(), pbr: this.mPBR });
            a.mLod.push(key);
            a.mWind.push(wind);
            a.mTris.push(b.mIdx.length / 3);
        }
        if (bound != null)
            a.mBound = bound;
        if (_billboard && lod0 != null && lod0.mIdx.length > 0) {
            const N = CForgeFloraFactory.sImpostorSize, key = pre + "_imp.tex";
            CForgeFloraTex.Upload(this.mFrame, key, N, N, CForgeFloraBake.Impostor(lod0, _tex, bound, N), false, false, CTexture.eMipmap.AlphaCac);
            a.mLod.push(key);
            a.mWind.push(false);
            a.mBillboard = true;
        }
        a.mMs = performance.now() - t0;
        this.mAsset.push(a);
        return a;
    }
}
