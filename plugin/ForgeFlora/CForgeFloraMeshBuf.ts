import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CUtilRender } from "../../artgine/render/CUtilRender.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CForgeMeshBuf } from "../ForgeBuild/CForgeMeshBuf.js";
import { CForgeFloraTex } from "./CForgeFloraTex.js";

export type ForgeFloraV3 = number[];

//좌표는 m. 정점마다 텍스처 칸(mSlot)과 바람 가중치(mWind, 0.5 고정 ~ 1 최대)를 함께 쌓는다
export class CForgeFloraMeshBuf
{
    static sUnit = 100;
    mPos : number[] = [];
    mUV : number[] = [];
    mNor : number[] = [];
    mSlot : number[] = [];
    mWind : number[] = [];
    mIdx : number[] = [];

    Count() : number { return this.mSlot.length; }

    //_flex : 0 고정 ~ 1 최대 흔들림
    Vert(_p : ForgeFloraV3, _u : number, _v : number, _n : ForgeFloraV3, _slot : number, _flex : number) : number
    {
        this.mPos.push(_p[0], _p[1], _p[2]);
        this.mUV.push(_u, _v);
        const l = Math.hypot(_n[0], _n[1], _n[2]) || 1;
        this.mNor.push(_n[0] / l, _n[1] / l, _n[2] / l);
        this.mSlot.push(_slot);
        this.mWind.push(0.5 + 0.5 * Math.max(0, Math.min(1, _flex)));
        return this.Count() - 1;
    }
    //(p1-p0)×(p2-p0)가 _f 쪽을 보면 앞면(엔진 규칙)
    Tri(_i0 : number, _i1 : number, _i2 : number, _f : ForgeFloraV3)
    {
        const P = this.mPos;
        const ax = P[_i1 * 3] - P[_i0 * 3], ay = P[_i1 * 3 + 1] - P[_i0 * 3 + 1], az = P[_i1 * 3 + 2] - P[_i0 * 3 + 2];
        const bx = P[_i2 * 3] - P[_i0 * 3], by = P[_i2 * 3 + 1] - P[_i0 * 3 + 1], bz = P[_i2 * 3 + 2] - P[_i0 * 3 + 2];
        const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
        if(cx * _f[0] + cy * _f[1] + cz * _f[2] >= 0) this.mIdx.push(_i0, _i1, _i2);
        else this.mIdx.push(_i0, _i2, _i1);
    }
    TwoSide(_i0 : number, _i1 : number, _i2 : number, _f : ForgeFloraV3)
    {
        this.Tri(_i0, _i1, _i2, _f);
        this.Tri(_i0, _i1, _i2, [-_f[0], -_f[1], -_f[2]]);
    }

    //[x0, y0, z0, x1, y1, z1] m
    Bound() : number[]
    {
        const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], P = this.mPos;
        for(let i = 0; i < P.length; i += 3)
            for(let k = 0; k < 3; k++) { b[k] = Math.min(b[k], P[i + k]); b[k + 3] = Math.max(b[k + 3], P[i + k]); }
        return b;
    }

    //_bound : LOD 단계끼리 같은 상자를 넣어야 한다. 덴시티 머지가 메시마다 최대 변을 1로 정규화해 상자가 다르면 전환 때 크기가 튄다
    //_wind : 정점 바람 가중치(Weight.x)를 넣는다. 셰이더 ApplyWind는 0.5 초과 정점만 흔든다
    //_pbr : 알베도 뒤에 재질맵을 붙이고 정점 z가 그 칸을 가리킨다. z가 0이면 거칠기를 알베도에서 읽는다
    Commit(_frame : CFrame, _key : string, _tex : string[], _bound : number[], _wind : boolean, _pbr = false) : boolean
    {
        if(this.mIdx.length == 0) return false;
        const n = this.Count(), U = CForgeFloraMeshBuf.sUnit, tex = _pbr ? _tex.concat(_tex.map(_k => CForgeFloraTex.Mat(_k))) : _tex;
        const pos = new Float32Array(n * 3), ref = new Float32Array(n * 3);
        for(let i = 0; i < n * 3; i++) pos[i] = this.mPos[i] * U;
        for(let i = 0; i < n; i++) { ref[i * 3] = this.mSlot[i]; if(_pbr) ref[i * 3 + 2] = _tex.length + this.mSlot[i]; }
        const uv = Float32Array.from(this.mUV), nor = Float32Array.from(this.mNor);

        const ci = new CMeshCreateInfo();
        const Set = (_id : number, _a : Float32Array) => { const f = ci.Create(_id).bufF; f.mF32A = _a; f.mSize = _a.length; };
        const I = CVertexFormat.eIdentifier;
        Set(I.Position, pos);
        Set(I.UV, uv);
        Set(I.Normal, nor);
        Set(I.TexOff, ref);
        const tan = CForgeMeshBuf.Tangent(pos, nor, uv, this.mIdx);
        Set(I.Tangent, tan);
        Set(I.Binormal, new Float32Array(tan.length));
        if(_wind)
        {
            const we = new Float32Array(n * 4);
            for(let i = 0; i < n; i++) we[i * 4] = this.mWind[i];
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
        const mesh = CUtilRender.CMeshCreateInfoToCMesh(ci, tex[0]);
        mesh.texture.push(...tex.slice(1));
        //CMeshCreateInfoToCMesh는 텍스처 칸을 0~2로 고정한다. 목록 길이와 다르면 머지가 없는 키를 목록에 넣는다
        mesh.meshTree.mData.textureOff = tex.map((_k, _i) => _i);
        _frame.Res().Push(_key, mesh);
        return true;
    }
}
