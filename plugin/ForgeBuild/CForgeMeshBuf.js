import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CUtilRender } from "../../artgine/render/CUtilRender.js";
import { CForgeScene } from "./CForgeScene.js";
import { CForgeTex } from "./CForgeTex.js";
export class CForgeMeshBuf {
    mPos = [];
    mUV = [];
    mNor = [];
    mIdx = [];
    Count() { return this.mPos.length / 3; }
    Clear() { this.mPos = []; this.mUV = []; this.mNor = []; this.mIdx = []; }
    Vert(_x, _y, _z, _u, _v, _nx, _ny, _nz) {
        const U = CForgeScene.sUnit;
        this.mPos.push(_x * U, _y * U, _z * U);
        this.mUV.push(_u, _v);
        const l = Math.hypot(_nx, _ny, _nz) || 1;
        this.mNor.push(_nx / l, _ny / l, _nz / l);
        return this.Count() - 1;
    }
    Tri(_i0, _i1, _i2, _nx, _ny, _nz) {
        const P = this.mPos;
        const ax = P[_i1 * 3] - P[_i0 * 3], ay = P[_i1 * 3 + 1] - P[_i0 * 3 + 1], az = P[_i1 * 3 + 2] - P[_i0 * 3 + 2];
        const bx = P[_i2 * 3] - P[_i0 * 3], by = P[_i2 * 3 + 1] - P[_i0 * 3 + 1], bz = P[_i2 * 3 + 2] - P[_i0 * 3 + 2];
        const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
        if (cx * _nx + cy * _ny + cz * _nz >= 0)
            this.mIdx.push(_i0, _i1, _i2);
        else
            this.mIdx.push(_i0, _i2, _i1);
    }
    QuadIdx(_i0, _i1, _i2, _i3, _nx, _ny, _nz) {
        this.Tri(_i0, _i1, _i2, _nx, _ny, _nz);
        this.Tri(_i0, _i2, _i3, _nx, _ny, _nz);
    }
    Quad(_p, _uv, _n) {
        const uv = _uv ?? CForgeMeshBuf.PlanarUV(_p, _n);
        const i = this.Count();
        for (let k = 0; k < 4; k++)
            this.Vert(_p[k][0], _p[k][1], _p[k][2], uv[k][0], uv[k][1], _n[0], _n[1], _n[2]);
        this.QuadIdx(i, i + 1, i + 2, i + 3, _n[0], _n[1], _n[2]);
    }
    Poly(_p, _n) {
        const uv = CForgeMeshBuf.PlanarUV(_p, _n), i = this.Count();
        _p.forEach((_q, _k) => this.Vert(_q[0], _q[1], _q[2], uv[_k][0], uv[_k][1], _n[0], _n[1], _n[2]));
        for (let k = 1; k + 1 < _p.length; k++)
            this.Tri(i, i + k, i + k + 1, _n[0], _n[1], _n[2]);
    }
    static PlanarUV(_p, _n) {
        let ux = _p[1][0] - _p[0][0], uy = _p[1][1] - _p[0][1], uz = _p[1][2] - _p[0][2];
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul;
        uy /= ul;
        uz /= ul;
        const nl = Math.hypot(_n[0], _n[1], _n[2]) || 1, nx = _n[0] / nl, ny = _n[1] / nl, nz = _n[2] / nl;
        let vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
        if (vy < 0) {
            vx = -vx;
            vy = -vy;
            vz = -vz;
        }
        return _p.map(q => { const dx = q[0] - _p[0][0], dy = q[1] - _p[0][1], dz = q[2] - _p[0][2]; return [dx * ux + dy * uy + dz * uz, dx * vx + dy * vy + dz * vz]; });
    }
    Validate() {
        let nan = 0, badIdx = 0, degenerate = 0;
        for (const v of this.mPos)
            if (!Number.isFinite(v))
                nan++;
        for (const v of this.mNor)
            if (!Number.isFinite(v))
                nan++;
        const n = this.Count();
        for (let t = 0; t < this.mIdx.length; t += 3) {
            const a = this.mIdx[t], b = this.mIdx[t + 1], c = this.mIdx[t + 2];
            if (a >= n || b >= n || c >= n || a < 0 || b < 0 || c < 0) {
                badIdx++;
                continue;
            }
            if (a == b || b == c || a == c)
                degenerate++;
        }
        return { nan, badIdx, degenerate };
    }
    Commit(_frame, _key, _tex, _nor = false, _mat = false) {
        if (this.mIdx.length == 0)
            return false;
        const n = this.Count();
        const surf = _nor || _mat ? CForgeTex.Surf(_tex) : null, list = [_tex];
        const ni = surf != null && _nor ? list.push(surf.mNor) - 1 : 0, mi = surf != null && _mat ? list.push(surf.mMat) - 1 : 0;
        const tex = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            tex[i * 3 + 1] = ni;
            tex[i * 3 + 2] = mi;
        }
        CForgeMeshBuf.ToMesh(_frame, _key, this.mPos, this.mUV, this.mNor, tex, this.mIdx, list);
        return true;
    }
    static Tangent(P, N, T, I) {
        const n = P.length / 3, t1 = new Float32Array(n * 3), t2 = new Float32Array(n * 3), out = new Float32Array(n * 4);
        for (let a = 0; a < I.length; a += 3) {
            const i0 = I[a], i1 = I[a + 1], i2 = I[a + 2];
            const v1x = P[i1 * 3] - P[i0 * 3], v1y = P[i1 * 3 + 1] - P[i0 * 3 + 1], v1z = P[i1 * 3 + 2] - P[i0 * 3 + 2];
            const v2x = P[i2 * 3] - P[i0 * 3], v2y = P[i2 * 3 + 1] - P[i0 * 3 + 1], v2z = P[i2 * 3 + 2] - P[i0 * 3 + 2];
            const u1x = T[i1 * 2] - T[i0 * 2], u1y = T[i1 * 2 + 1] - T[i0 * 2 + 1], u2x = T[i2 * 2] - T[i0 * 2], u2y = T[i2 * 2 + 1] - T[i0 * 2 + 1];
            const d = u1x * u2y - u2x * u1y;
            if (Math.abs(d) < 1e-20)
                continue;
            const r = 1 / d;
            const sx = (u2y * v1x - u1y * v2x) * r, sy = (u2y * v1y - u1y * v2y) * r, sz = (u2y * v1z - u1y * v2z) * r;
            const tx = (u1x * v2x - u2x * v1x) * r, ty = (u1x * v2y - u2x * v1y) * r, tz = (u1x * v2z - u2x * v1z) * r;
            for (const i of [i0, i1, i2]) {
                t1[i * 3] += sx;
                t1[i * 3 + 1] += sy;
                t1[i * 3 + 2] += sz;
                t2[i * 3] += tx;
                t2[i * 3 + 1] += ty;
                t2[i * 3 + 2] += tz;
            }
        }
        for (let i = 0; i < n; i++) {
            let nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
            const nl = Math.hypot(nx, ny, nz) || 1;
            nx /= nl;
            ny /= nl;
            nz /= nl;
            const dt = nx * t1[i * 3] + ny * t1[i * 3 + 1] + nz * t1[i * 3 + 2];
            let tx = t1[i * 3] - nx * dt, ty = t1[i * 3 + 1] - ny * dt, tz = t1[i * 3 + 2] - nz * dt;
            const tl = Math.hypot(tx, ty, tz);
            if (tl < 1e-10) {
                const [ux, uy, uz] = Math.abs(nz) < 0.999 ? [0, 0, 1] : [0, 1, 0];
                tx = uy * nz - uz * ny;
                ty = uz * nx - ux * nz;
                tz = ux * ny - uy * nx;
                const l = Math.hypot(tx, ty, tz) || 1;
                tx /= l;
                ty /= l;
                tz /= l;
            }
            else {
                tx /= tl;
                ty /= tl;
                tz /= tl;
            }
            const cx = ny * tz - nz * ty, cy = nz * tx - nx * tz, cz = nx * ty - ny * tx;
            out[i * 4] = tx;
            out[i * 4 + 1] = ty;
            out[i * 4 + 2] = tz;
            out[i * 4 + 3] = cx * t2[i * 3] + cy * t2[i * 3 + 1] + cz * t2[i * 3 + 2] < 0 ? -1 : 1;
        }
        return out;
    }
    static ToMesh(_frame, _key, _pos, _uv, _nor, _ref, _idx, _tex) {
        const ci = new CMeshCreateInfo();
        const posb = ci.Create(CVertexFormat.eIdentifier.Position);
        const uvb = ci.Create(CVertexFormat.eIdentifier.UV);
        const norb = ci.Create(CVertexFormat.eIdentifier.Normal);
        const texb = ci.Create(CVertexFormat.eIdentifier.TexOff);
        const inb = ci.Create(CVertexFormat.eIdentifier.Index);
        const Set = (_f, _a) => { _f.mF32A = _a instanceof Float32Array ? _a : Float32Array.from(_a); _f.mSize = _a.length; };
        Set(posb.bufF, _pos);
        Set(uvb.bufF, _uv);
        Set(norb.bufF, _nor);
        Set(texb.bufF, _ref);
        const tan = CForgeMeshBuf.Tangent(_pos, _nor, _uv, _idx);
        Set(ci.Create(CVertexFormat.eIdentifier.Tangent).bufF, tan);
        Set(ci.Create(CVertexFormat.eIdentifier.Binormal).bufF, new Float32Array(tan.length));
        let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
        const P = _pos;
        for (let i = 0; i < P.length; i += 3) {
            if (P[i] < x0)
                x0 = P[i];
            if (P[i] > x1)
                x1 = P[i];
            if (P[i + 1] < y0)
                y0 = P[i + 1];
            if (P[i + 1] > y1)
                y1 = P[i + 1];
            if (P[i + 2] < z0)
                z0 = P[i + 2];
            if (P[i + 2] > z1)
                z1 = P[i + 2];
        }
        ci.bound.InitBound(new CVec3(x0, y0, z0));
        ci.bound.InitBound(new CVec3(x1, y1, z1));
        inb.bufI = _idx.slice();
        ci.vertexCount = _pos.length / 3;
        ci.indexCount = _idx.length;
        ci.bound.SetType(CBound.eType.Box);
        const mesh = CUtilRender.CMeshCreateInfoToCMesh(ci, _tex[0]);
        mesh.texture.push(..._tex.slice(1));
        mesh.meshTree.mData.textureOff = _tex.map((_k, _i) => _i);
        _frame.Res().Push(_key, mesh);
    }
}
