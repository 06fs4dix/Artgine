import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CUtilRender } from "../../artgine/render/CUtilRender.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CForgeScene } from "./CForgeScene.js";
import { CForgeTex } from "./CForgeTex.js";
import { IForgeFire, IForgeLight } from "./CForgeFire.js";

//움직이는 부품. 같은 key의 재질 묶음은 자식 서브젝트 하나로 묶이고, 메시 좌표는 pivot(m)을 원점으로 한 상대 좌표다(월드 축 그대로).
//ForgeAction 값 p(0~1)에서 자세 = pivot + slide * p, 회전 = axis(축 방향) * angle * p(라디안, 한 축씩만).
//hull : 닫힌 자세(p = 0)의 충돌 볼록체(pivot 기준 상대 좌표, 점 3개씩). 닫혔을 때만 막는다. focus : 상호작용 중심(pivot 기준 상대 좌표, 없으면 hull 중심)
export interface IForgeAnim { key : string; kind : string; pivot : number[]; axis : number[]; angle : number; slide : number[]; dur : number; hull? : number[][]; focus? : number[]; }

//생성기가 내놓는 재질 묶음 하나(색, 선택 텍스처)
//fire·light : 메시 대신 불꽃 파티클·점광원 위치(buf는 비워 둔다)
//anim : 있으면 건물 메시에 합치지 않고 따로 움직이는 부품으로 만든다
//interior : 실내 안에서만 보이는 부품. 멀면 한꺼번에 끈다(문·창은 밖에서도 보이므로 표시하지 않는다)
export interface IForgePart { buf : CForgeMeshBuf; rgb : number[]; tex? : string; glow? : boolean; emit? : number[]; noShadow? : boolean; fire? : IForgeFire; light? : IForgeLight; anim? : IForgeAnim; interior? : boolean; }

//좌표는 m로 받아 엔진 단위로 저장한다. 면은 항상 넘긴 법선 쪽이 앞면이 되게 감김을 맞춰 넣는다
export class CForgeMeshBuf
{
    mPos : number[] = [];
    mUV : number[] = [];
    mNor : number[] = [];
    mIdx : number[] = [];

    Count() : number { return this.mPos.length / 3; }
/*
    //_x·_y·_z(m)만큼 옮긴 복사본. 피벗 기준 상대 좌표로 만든 부품을 월드 자리에 구울 때 쓴다
    Moved(_x : number, _y : number, _z : number) : CForgeMeshBuf
    {
        const b = new CForgeMeshBuf(), U = CForgeScene.sUnit;
        b.mPos = this.mPos.map((_v, _i) => _v + [_x, _y, _z][_i % 3] * U);
        b.mUV = this.mUV.slice(); b.mNor = this.mNor.slice(); b.mIdx = this.mIdx.slice();
        return b;
    }
*/
    Clear() { this.mPos = []; this.mUV = []; this.mNor = []; this.mIdx = []; }

    Vert(_x : number, _y : number, _z : number, _u : number, _v : number, _nx : number, _ny : number, _nz : number) : number
    {
        const U = CForgeScene.sUnit;
        this.mPos.push(_x * U, _y * U, _z * U);
        this.mUV.push(_u, _v);
        const l = Math.hypot(_nx, _ny, _nz) || 1;
        this.mNor.push(_nx / l, _ny / l, _nz / l);
        return this.Count() - 1;
    }
    //(p1-p0)×(p2-p0)가 _n 쪽을 보면 앞면(엔진 규칙)
    Tri(_i0 : number, _i1 : number, _i2 : number, _nx : number, _ny : number, _nz : number)
    {
        const P = this.mPos;
        const ax = P[_i1 * 3] - P[_i0 * 3], ay = P[_i1 * 3 + 1] - P[_i0 * 3 + 1], az = P[_i1 * 3 + 2] - P[_i0 * 3 + 2];
        const bx = P[_i2 * 3] - P[_i0 * 3], by = P[_i2 * 3 + 1] - P[_i0 * 3 + 1], bz = P[_i2 * 3 + 2] - P[_i0 * 3 + 2];
        const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
        if(cx * _nx + cy * _ny + cz * _nz >= 0) this.mIdx.push(_i0, _i1, _i2);
        else this.mIdx.push(_i0, _i2, _i1);
    }
    //i0-i1-i2-i3 순서로 둘레를 도는 사각형
    QuadIdx(_i0 : number, _i1 : number, _i2 : number, _i3 : number, _nx : number, _ny : number, _nz : number)
    {
        this.Tri(_i0, _i1, _i2, _nx, _ny, _nz);
        this.Tri(_i0, _i2, _i3, _nx, _ny, _nz);
    }
    //평면 사각형(법선 하나). _p는 [x,y,z] 4개, 둘레 순서. _uv가 null이면 면 위에 m 단위로 펼친다
    Quad(_p : number[][], _uv : number[][], _n : number[])
    {
        const uv = _uv ?? CForgeMeshBuf.PlanarUV(_p, _n);
        const i = this.Count();
        for(let k = 0; k < 4; k++) this.Vert(_p[k][0], _p[k][1], _p[k][2], uv[k][0], uv[k][1], _n[0], _n[1], _n[2]);
        this.QuadIdx(i, i + 1, i + 2, i + 3, _n[0], _n[1], _n[2]);
    }
    //평면 볼록 다각형(부채꼴 삼각분할), UV는 m 단위로 펼친다
    Poly(_p : number[][], _n : number[])
    {
        const uv = CForgeMeshBuf.PlanarUV(_p, _n), i = this.Count();
        _p.forEach((_q, _k) => this.Vert(_q[0], _q[1], _q[2], uv[_k][0], uv[_k][1], _n[0], _n[1], _n[2]));
        for(let k = 1; k + 1 < _p.length; k++) this.Tri(i, i + k, i + k + 1, _n[0], _n[1], _n[2]);
    }
    //첫 변 방향을 u, 면 안에서 그와 수직인 방향을 v로 하는 m 단위 UV(벽면이면 v가 위쪽이 되게 맞춘다)
    static PlanarUV(_p : number[][], _n : number[]) : number[][]
    {
        let ux = _p[1][0] - _p[0][0], uy = _p[1][1] - _p[0][1], uz = _p[1][2] - _p[0][2];
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul; uy /= ul; uz /= ul;
        const nl = Math.hypot(_n[0], _n[1], _n[2]) || 1, nx = _n[0] / nl, ny = _n[1] / nl, nz = _n[2] / nl;
        let vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
        if(vy < 0) { vx = -vx; vy = -vy; vz = -vz; }
        return _p.map(q => { const dx = q[0] - _p[0][0], dy = q[1] - _p[0][1], dz = q[2] - _p[0][2]; return [dx * ux + dy * uy + dz * uz, dx * vx + dy * vy + dz * vz]; });
    }

    //NaN·범위 밖 인덱스·퇴화 삼각형 검사(퍼즈 테스트용)
    Validate() : { nan : number, badIdx : number, degenerate : number }
    {
        let nan = 0, badIdx = 0, degenerate = 0;
        for(const v of this.mPos) if(!Number.isFinite(v)) nan++;
        for(const v of this.mNor) if(!Number.isFinite(v)) nan++;
        const n = this.Count();
        for(let t = 0; t < this.mIdx.length; t += 3)
        {
            const a = this.mIdx[t], b = this.mIdx[t + 1], c = this.mIdx[t + 2];
            if(a >= n || b >= n || c >= n || a < 0 || b < 0 || c < 0) { badIdx++; continue; }
            if(a == b || b == c || a == c) degenerate++;
        }
        return { nan, badIdx, degenerate };
    }

    //_nor·_mat : 노말·재질 텍스처를 붙일지(텍스처 묶음이 있는 경우만). 끈 쪽은 TexOff를 0으로 둬 셰이더가 읽지 않는다
    //_pbr : 재질 칸을 램버트 맵 대신 PBR 맵(_mp)으로. _real : 실사 알베도·노말·재질
    Commit(_frame : CFrame, _key : string, _tex : string, _nor : boolean = false, _mat : boolean = false, _pbr : boolean = false, _real : boolean = false) : boolean
    {
        if(this.mIdx.length == 0) return false;
        const n = this.Count();
        const surf = _real ? CForgeTex.EnsureReal(_tex) : (_nor || _mat ? CForgeTex.Surf(_tex) : null);
        const alb = _real && surf != null && surf.mAlbR != null ? surf.mAlbR : _tex, list = [alb];
        const nor = surf == null ? null : (_real && surf.mNorR != null ? surf.mNorR : surf.mNor);
        const mat = surf == null ? null : (_real ? (_pbr ? surf.mMatPBRR : surf.mMatR) : (_pbr && surf.mMatPBR != null ? surf.mMatPBR : surf.mMat));
        const ni = surf != null && _nor && nor != null ? list.push(nor) - 1 : 0, mi = surf != null && _mat && mat != null ? list.push(mat) - 1 : 0;
        const tex = new Float32Array(n * 3);
        for(let i = 0; i < n; i++) { tex[i * 3 + 1] = ni; tex[i * 3 + 2] = mi; }
        CForgeMeshBuf.ToMesh(_frame, _key, this.mPos, this.mUV, this.mNor, tex, this.mIdx, list);
        return true;
    }
    //CUtilRender.TangentCalculate와 같은 규칙(UV u 방향, 노말에 직교화, w = 손잡이 방향)
    static Tangent(P : ArrayLike<number>, N : ArrayLike<number>, T : ArrayLike<number>, I : number[]) : Float32Array
    {
        const n = P.length / 3, t1 = new Float32Array(n * 3), t2 = new Float32Array(n * 3), out = new Float32Array(n * 4);
        for(let a = 0; a < I.length; a += 3)
        {
            const i0 = I[a], i1 = I[a + 1], i2 = I[a + 2];
            const v1x = P[i1 * 3] - P[i0 * 3], v1y = P[i1 * 3 + 1] - P[i0 * 3 + 1], v1z = P[i1 * 3 + 2] - P[i0 * 3 + 2];
            const v2x = P[i2 * 3] - P[i0 * 3], v2y = P[i2 * 3 + 1] - P[i0 * 3 + 1], v2z = P[i2 * 3 + 2] - P[i0 * 3 + 2];
            const u1x = T[i1 * 2] - T[i0 * 2], u1y = T[i1 * 2 + 1] - T[i0 * 2 + 1], u2x = T[i2 * 2] - T[i0 * 2], u2y = T[i2 * 2 + 1] - T[i0 * 2 + 1];
            const d = u1x * u2y - u2x * u1y;
            if(Math.abs(d) < 1e-20) continue;
            const r = 1 / d;
            const sx = (u2y * v1x - u1y * v2x) * r, sy = (u2y * v1y - u1y * v2y) * r, sz = (u2y * v1z - u1y * v2z) * r;
            const tx = (u1x * v2x - u2x * v1x) * r, ty = (u1x * v2y - u2x * v1y) * r, tz = (u1x * v2z - u2x * v1z) * r;
            for(const i of [i0, i1, i2]) { t1[i * 3] += sx; t1[i * 3 + 1] += sy; t1[i * 3 + 2] += sz; t2[i * 3] += tx; t2[i * 3 + 1] += ty; t2[i * 3 + 2] += tz; }
        }
        for(let i = 0; i < n; i++)
        {
            let nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
            const nl = Math.hypot(nx, ny, nz) || 1;
            nx /= nl; ny /= nl; nz /= nl;
            const dt = nx * t1[i * 3] + ny * t1[i * 3 + 1] + nz * t1[i * 3 + 2];
            let tx = t1[i * 3] - nx * dt, ty = t1[i * 3 + 1] - ny * dt, tz = t1[i * 3 + 2] - nz * dt;
            const tl = Math.hypot(tx, ty, tz);
            if(tl < 1e-10)
            {
                const [ux, uy, uz] = Math.abs(nz) < 0.999 ? [0, 0, 1] : [0, 1, 0];
                tx = uy * nz - uz * ny; ty = uz * nx - ux * nz; tz = ux * ny - uy * nx;
                const l = Math.hypot(tx, ty, tz) || 1;
                tx /= l; ty /= l; tz /= l;
            }
            else { tx /= tl; ty /= tl; tz /= tl; }
            const cx = ny * tz - nz * ty, cy = nz * tx - nx * tz, cz = nx * ty - ny * tx;
            out[i * 4] = tx; out[i * 4 + 1] = ty; out[i * 4 + 2] = tz;
            out[i * 4 + 3] = cx * t2[i * 3] + cy * t2[i * 3 + 1] + cz * t2[i * 3 + 2] < 0 ? -1 : 1;
        }
        return out;
    }
    //_ref : 정점마다 [기본, 노말, 재질] 텍스처 칸 번호(_tex 목록 순서, 노말·재질 0은 안 읽음)
    static ToMesh(_frame : CFrame, _key : string, _pos : ArrayLike<number>, _uv : ArrayLike<number>, _nor : ArrayLike<number>, _ref : ArrayLike<number>, _idx : number[], _tex : string[])
    {
        const ci = new CMeshCreateInfo();
        const posb = ci.Create(CVertexFormat.eIdentifier.Position);
        const uvb = ci.Create(CVertexFormat.eIdentifier.UV);
        const norb = ci.Create(CVertexFormat.eIdentifier.Normal);
        const texb = ci.Create(CVertexFormat.eIdentifier.TexOff);
        const inb = ci.Create(CVertexFormat.eIdentifier.Index);
        //정점마다 CVec3를 만들어 Push하면 벽 하나에 수 ms가 든다. 배열을 통째로 넘기고 바운드는 최소·최대 두 점만 넣는다
        const Set = (_f : typeof posb.bufF, _a : ArrayLike<number>) => { _f.mF32A = _a instanceof Float32Array ? _a : Float32Array.from(_a); _f.mSize = _a.length; };
        Set(posb.bufF, _pos);
        Set(uvb.bufF, _uv);
        Set(norb.bufF, _nor);
        Set(texb.bufF, _ref);
        //탄젠트가 비어 있으면 렌더러가 처음 그릴 때 정점마다 CVec3를 만들며 구해(정점 수십만 개면 수 초) 그 프레임이 멈춘다. 같은 규칙으로 미리 채운다
        const tan = CForgeMeshBuf.Tangent(_pos, _nor, _uv, _idx);
        Set(ci.Create(CVertexFormat.eIdentifier.Tangent).bufF, tan);
        Set(ci.Create(CVertexFormat.eIdentifier.Binormal).bufF, new Float32Array(tan.length));
        let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
        const P = _pos;
        for(let i = 0; i < P.length; i += 3)
        {
            if(P[i] < x0) x0 = P[i]; if(P[i] > x1) x1 = P[i];
            if(P[i + 1] < y0) y0 = P[i + 1]; if(P[i + 1] > y1) y1 = P[i + 1];
            if(P[i + 2] < z0) z0 = P[i + 2]; if(P[i + 2] > z1) z1 = P[i + 2];
        }
        ci.bound.InitBound(new CVec3(x0, y0, z0));
        ci.bound.InitBound(new CVec3(x1, y1, z1));
        inb.bufI = _idx.slice();
        ci.vertexCount = _pos.length / 3;
        ci.indexCount = _idx.length;
        //MeshBoundUpdate는 인덱스마다 정점을 행렬로 옮겨 충돌용 삼각형 목록까지 만든다(정점 8천 개에 10ms 이상). 렌더 전용이라 위에서 구한 상자만 쓴다
        ci.bound.SetType(CBound.eType.Box);
        const mesh = CUtilRender.CMeshCreateInfoToCMesh(ci, _tex[0]);
        mesh.texture.push(..._tex.slice(1));
        //CMeshCreateInfoToCMesh는 노드가 쓰는 텍스처 칸을 0~2로 고정해 렌더러가 앞 3장만 바인딩한다(그 뒤 칸은 검게 나온다)
        mesh.meshTree.mData.textureOff = _tex.map((_k, _i) => _i);
        _frame.Res().Push(_key, mesh);
    }
}
