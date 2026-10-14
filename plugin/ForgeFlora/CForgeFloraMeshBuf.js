import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CUtilRender } from "../../artgine/render/CUtilRender.js";
import { CForgeMeshBuf } from "../ForgeBuild/CForgeMeshBuf.js";
export class CForgeFloraMeshBuf {
    static sUnit = 100;
    mPos = [];
    mUV = [];
    mNor = [];
    mSlot = [];
    mWind = [];
    mIdx = [];
    Count() { return this.mSlot.length; }
    Vert(_p, _u, _v, _n, _slot, _flex) {
        this.mPos.push(_p[0], _p[1], _p[2]);
        this.mUV.push(_u, _v);
        const l = Math.hypot(_n[0], _n[1], _n[2]) || 1;
        this.mNor.push(_n[0] / l, _n[1] / l, _n[2] / l);
        this.mSlot.push(_slot);
        this.mWind.push(0.5 + 0.5 * Math.max(0, Math.min(1, _flex)));
        return this.Count() - 1;
    }
    Tri(_i0, _i1, _i2, _f) {
        const P = this.mPos;
        const ax = P[_i1 * 3] - P[_i0 * 3], ay = P[_i1 * 3 + 1] - P[_i0 * 3 + 1], az = P[_i1 * 3 + 2] - P[_i0 * 3 + 2];
        const bx = P[_i2 * 3] - P[_i0 * 3], by = P[_i2 * 3 + 1] - P[_i0 * 3 + 1], bz = P[_i2 * 3 + 2] - P[_i0 * 3 + 2];
        const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
        if (cx * _f[0] + cy * _f[1] + cz * _f[2] >= 0)
            this.mIdx.push(_i0, _i1, _i2);
        else
            this.mIdx.push(_i0, _i2, _i1);
    }
    TwoSide(_i0, _i1, _i2, _f) {
        this.Tri(_i0, _i1, _i2, _f);
        this.Tri(_i0, _i1, _i2, [-_f[0], -_f[1], -_f[2]]);
    }
    Bound() {
        const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], P = this.mPos;
        for (let i = 0; i < P.length; i += 3)
            for (let k = 0; k < 3; k++) {
                b[k] = Math.min(b[k], P[i + k]);
                b[k + 3] = Math.max(b[k + 3], P[i + k]);
            }
        return b;
    }
    Commit(_frame, _key, _tex, _bound, _wind) {
        if (this.mIdx.length == 0)
            return false;
        const n = this.Count(), U = CForgeFloraMeshBuf.sUnit;
        const pos = new Float32Array(n * 3), ref = new Float32Array(n * 3);
        for (let i = 0; i < n * 3; i++)
            pos[i] = this.mPos[i] * U;
        for (let i = 0; i < n; i++)
            ref[i * 3] = this.mSlot[i];
        const uv = Float32Array.from(this.mUV), nor = Float32Array.from(this.mNor);
        const ci = new CMeshCreateInfo();
        const Set = (_id, _a) => { const f = ci.Create(_id).bufF; f.mF32A = _a; f.mSize = _a.length; };
        const I = CVertexFormat.eIdentifier;
        Set(I.Position, pos);
        Set(I.UV, uv);
        Set(I.Normal, nor);
        Set(I.TexOff, ref);
        const tan = CForgeMeshBuf.Tangent(pos, nor, uv, this.mIdx);
        Set(I.Tangent, tan);
        Set(I.Binormal, new Float32Array(tan.length));
        if (_wind) {
            const we = new Float32Array(n * 4);
            for (let i = 0; i < n; i++)
                we[i * 4] = this.mWind[i];
            Set(I.Weight, we);
            Set(I.WeightIndex, new Float32Array(n * 4));
        }
        ci.Create(I.Index).bufI = this.mIdx.slice();
        const b = _bound ?? this.Bound();
        ci.bound.InitBound(new CVec3(b[0] * U, b[1] * U, b[2] * U));
        ci.bound.InitBound(new CVec3(b[3] * U, b[4] * U, b[5] * U));
        ci.bound.SetType(CBound.eType.Box);
        ci.vertexCount = n;
        ci.indexCount = this.mIdx.length;
        const mesh = CUtilRender.CMeshCreateInfoToCMesh(ci, _tex[0]);
        mesh.texture.push(..._tex.slice(1));
        mesh.meshTree.mData.textureOff = _tex.map((_k, _i) => _i);
        _frame.Res().Push(_key, mesh);
        return true;
    }
}
