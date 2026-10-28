import { CTree } from "../../artgine/basic/CTree.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CMesh, CMeshSkin } from "../../artgine/render/CMesh.js";
import { CMeshBuf, CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CMeshCopyNode } from "../../artgine/render/CMeshCopyNode.js";
import { CMeshDataNode } from "../../artgine/render/CMeshDataNode.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CAvatarCloth } from "./CAvatarCloth.js";
import { CAvatarRig } from "./CAvatarRig.js";
import { CAvatarShape } from "./CAvatarShape.js";

//로블록스 R15는 파트 15개가 각자 한 본에만 붙는다. 가슴은 그 파트에 없다.
//흉곽 정점을 밀면 갈비뼈가 커지므로, 가슴은 UpperTorso(spine_03) 자식 본 두 개의 구이고 슬라이더는 그 본의 균일 스케일이다.
export class CAvatarR15
{
    static sBone = ["bust_l", "bust_r"];

    static Has(_mesh : CMesh) : boolean
    {
        return _mesh?.skin?.some(s => s.key.endsWith(" bust_l")) == true;
    }

    static Build(_src : CMesh) : CMesh
    {
        const m = new CMesh();
        m.vertexNormal = true;
        m.texture = _src.texture.slice();
        m.meshTree = CAvatarR15.CopyTree(_src.meshTree, null);
        m.skin = _src.skin.map(s =>
        {
            const n = new CMeshSkin();
            n.key = s.key;
            n.mat.Import(s.mat);
            return n;
        });
        const anchor = CAvatarShape.Anchor(_src);
        const h = anchor.h;
        const P = (_n : string) => CAvatarR15.Pos(m, _n);
        const chest = m.meshTree.Find("spine_03");
        const prefix = m.skin.length > 0 ? m.skin[0].key.slice(0, m.skin[0].key.lastIndexOf(" ")) : "skin0";
        const parent = CAvatarRig.SkinMat(m, "spine_03");
        const ci = new CMeshCreateInfo();
        const pos = ci.Create(CVertexFormat.eIdentifier.Position);
        const nor = ci.Create(CVertexFormat.eIdentifier.Normal);
        const uv = ci.Create(CVertexFormat.eIdentifier.UV);
        const w = ci.Create(CVertexFormat.eIdentifier.Weight);
        const wi = ci.Create(CVertexFormat.eIdentifier.WeightIndex);
        const idx = ci.Create(CVertexFormat.eIdentifier.Index);
        const acc = { pos, nor, uv, w, wi, idx, bound : ci.bound };
        const J = (_n : string) => CAvatarR15.Joint(m, _n);
        const Arm = (_a : string, _b : string, _r0 : number, _r1 : number) =>
        {
            const a = P(_a), b = P(_b), j = J(_a);
            if(a == null || b == null || j < 0) return;
            CAvatarR15.Spindle(acc, a, b, _r0, _r1, j, 12);
        };
        const pelvis = P("pelvis"), s1 = P("spine_01"), s2 = P("spine_02"), s3 = P("spine_03"), neck = P("neck_01"), head = P("Head");
        const Mid = (_a : number[], _b : number[], _t : number) => [_a[0] + (_b[0] - _a[0]) * _t, _a[1] + (_b[1] - _a[1]) * _t, _a[2] + (_b[2] - _a[2]) * _t];
        const fwd = h * 0.016;
        const Ring = (_b : number[], _rx : number, _rz : number, _dy = 0) => ({ c : [0, _b[1] + _dy, _b[2] + fwd], rx : _rx, rz : _rz });
        let chestRing : { c : number[], rx : number, rz : number } = null;
        if(pelvis != null && s1 != null && s3 != null && neck != null && J("pelvis") >= 0 && J("spine_03") >= 0)
        {
            const waist = Ring(s1, h * 0.07, h * 0.052);
            const hip = Ring(Mid(pelvis, s1, 0.4), h * 0.096, h * 0.068);
            CAvatarR15.Loft(acc, [Ring(pelvis, h * 0.06, h * 0.046, -h * 0.015), hip, waist], J("pelvis"), 16);
            chestRing = Ring(s3, h * 0.086, h * 0.062);
            CAvatarR15.Loft(acc, [waist, Ring(s2 ?? Mid(s1, s3, 0.5), h * 0.078, h * 0.056), chestRing, Ring(Mid(s3, neck, 0.5), h * 0.09, h * 0.054), Ring(neck, h * 0.034, h * 0.03)], J("spine_03"), 16);
        }
        if(neck != null && head != null && J("neck_01") >= 0) CAvatarR15.Spindle(acc, neck, Mid(neck, head, 0.72), h * 0.024, h * 0.03, J("neck_01"), 10);
        if(head != null && J("Head") >= 0) CAvatarR15.Ellipsoid(acc, [head[0], head[1] + h * 0.01, head[2]], h * 0.062, h * 0.078, h * 0.068, J("Head"), 8, 12);
        const busts : { name : string, c : number[], r : number }[] = [];
        if(chest != null && parent != null && chestRing != null)
        {
            for(let i = 0; i < anchor.bust.length && i < 2; i++)
            {
                const b = anchor.bust[i];
                const r = h * 0.04;
                const x = Math.max(-chestRing.rx * 0.62, Math.min(chestRing.rx * 0.62, b.c[0]));
                busts.push({ name : b.c[0] < 0 ? "bust_l" : "bust_r", c : [x, chestRing.c[1] + h * 0.012, chestRing.c[2] + chestRing.rz + r * 0.2], r });
            }
        }
        for(const side of ["l", "r"])
        {
            const up = P("upperarm_" + side);
            if(up != null && J("upperarm_" + side) >= 0) CAvatarR15.Sphere(acc, up, h * 0.04, J("upperarm_" + side), 6, 8);
            Arm("upperarm_" + side, "lowerarm_" + side, h * 0.03, h * 0.023);
            Arm("lowerarm_" + side, "hand_" + side, h * 0.022, h * 0.016);
            Arm("thigh_" + side, "calf_" + side, h * 0.05, h * 0.034);
            Arm("calf_" + side, "foot_" + side, h * 0.033, h * 0.02);
            const foot = P("foot_" + side), ball = P("ball_" + side);
            if(foot != null && J("foot_" + side) >= 0)
            {
                const to = ball ?? [foot[0], foot[1] - h * 0.015, foot[2] + h * 0.07];
                CAvatarR15.Limb(acc, foot, to, h * 0.026, h * 0.014, J("foot_" + side));
            }
            const hand = P("hand_" + side);
            if(hand != null && J("hand_" + side) >= 0) CAvatarR15.Ellipsoid(acc, hand, h * 0.016, h * 0.012, h * 0.022, J("hand_" + side), 5, 8);
        }
        for(const b of busts)
        {
            const w = new CMat();
            w.Unit();
            w.mF32A[12] = b.c[0]; w.mF32A[13] = b.c[1]; w.mF32A[14] = b.c[2];
            const skin = new CMeshSkin();
            skin.key = prefix + " " + b.name;
            skin.mat = CMath.MatInvert(w);
            m.skin.push(skin);
            const node = chest.PushChild(b.name);
            node.mData = new CMeshDataNode();
            const local = CMath.V3MulMatCoordi(new CVec3(b.c[0], b.c[1], b.c[2]), parent);
            node.mData.pos.Import(local);
            node.mData.rot.Import(new CVec4(0, 0, 0, 1));
            node.mData.skinKey.push(skin.key);
            CAvatarR15.Sphere(acc, b.c, b.r, J(b.name), 8, 12);
        }
        ci.vertexCount = pos.bufF.Size(3);
        ci.indexCount = idx.bufI.length;
        const geo = m.meshTree.PushChild("R15Body");
        geo.mData = new CMeshDataNode();
        geo.mData.ci = ci;
        geo.mData.rot.Import(new CVec4(0, 0, 0, 1));
        const srcGeo = CAvatarCloth.BodyNodes(_src)[0];
        geo.mData.textureOff = srcGeo?.mData.textureOff?.length > 0 ? srcGeo.mData.textureOff.slice() : [0];
        m.meshTree.mValueArr = null;
        return m;
    }

    //애니메이션이 이 본을 건드리지 않는다. 매 프레임 부모(spine_03) 뒤에 균일 스케일을 다시 붙인다
    static Apply(_tree : CTree<CMeshCopyNode>, _bust : number)
    {
        const parent = _tree.Find("spine_03");
        if(parent == null) return;
        const s = Math.max(0.25, 1 + _bust * 0.6);
        for(const name of CAvatarR15.sBone)
        {
            const n = _tree.Find(name);
            if(n == null) continue;
            n.mData.sca.x = s; n.mData.sca.y = s; n.mData.sca.z = s;
            n.mData.MatUpdate();
            n.mData.pst = CMath.MatMul(n.mData.pst, parent.mData.pst);
        }
    }

    private static Joint(_mesh : CMesh, _name : string) : number
    {
        return _mesh.skin.findIndex(s => s.key == _name || s.key.endsWith(" " + _name));
    }
    private static Pos(_mesh : CMesh, _name : string) : number[]
    {
        const m = CAvatarRig.SkinMat(_mesh, _name);
        if(m == null) return null;
        const a = CMath.MatInvert(m).mF32A;
        return [a[12], a[13], a[14]];
    }
    private static CopyTree(_n : CTree<CMeshDataNode>, _parent : CTree<CMeshDataNode>) : CTree<CMeshDataNode>
    {
        const t = new CTree<CMeshDataNode>();
        t.mKey = _n.mKey;
        t.mParent = _parent;
        if(_n.mData != null)
        {
            const d = new CMeshDataNode();
            d.pos.Import(_n.mData.pos);
            d.rot.Import(_n.mData.rot);
            d.sca.Import(_n.mData.sca);
            d.skinKey = _n.mData.skinKey.slice();
            t.mData = d;
        }
        let prev : CTree<CMeshDataNode> = null;
        for(let c = _n.mChild; c != null; c = c.mColleague)
        {
            const ch = CAvatarR15.CopyTree(c, t);
            if(prev == null) t.mChild = ch; else prev.mColleague = ch;
            prev = ch;
        }
        return t;
    }
    private static Push(_a : { pos : CMeshBuf; nor : CMeshBuf; uv : CMeshBuf; w : CMeshBuf; wi : CMeshBuf; bound : CBound }, _p : number[], _n : number[], _bone : number)
    {
        _a.pos.bufF.Push(new CVec3(_p[0], _p[1], _p[2]));
        _a.nor.bufF.Push(new CVec3(_n[0], _n[1], _n[2]));
        _a.uv.bufF.Push(new CVec2(0.5, 0.5));
        _a.w.bufF.Push(new CVec4(1, 0, 0, 0));
        _a.wi.bufF.Push(new CVec4(_bone, 0, 0, 0));
        _a.bound.InitBound(new CVec3(_p[0], _p[1], _p[2]));
    }
    private static Face(_a : { idx : CMeshBuf }, _b : number)
    {
        _a.idx.bufI.push(_b, _b + 1, _b + 2, _b, _b + 2, _b + 3);
    }
    private static Quad(_a : { pos : CMeshBuf; nor : CMeshBuf; uv : CMeshBuf; w : CMeshBuf; wi : CMeshBuf; idx : CMeshBuf; bound : CBound }, _p : number[][], _bone : number)
    {
        const n = CAvatarR15.Normal(_p[0], _p[1], _p[2]);
        const b = _a.pos.bufF.Size(3);
        for(const p of _p) CAvatarR15.Push(_a, p, n, _bone);
        CAvatarR15.Face(_a, b);
    }
    private static Normal(_a : number[], _b : number[], _c : number[]) : number[]
    {
        const ux = _b[0] - _a[0], uy = _b[1] - _a[1], uz = _b[2] - _a[2];
        const vx = _c[0] - _a[0], vy = _c[1] - _a[1], vz = _c[2] - _a[2];
        let x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
        const l = Math.hypot(x, y, z) || 1;
        return [x / l, y / l, z / l];
    }
    private static Limb(_a : { pos : CMeshBuf; nor : CMeshBuf; uv : CMeshBuf; w : CMeshBuf; wi : CMeshBuf; idx : CMeshBuf; bound : CBound }, _from : number[], _to : number[], _rx : number, _rz : number, _bone : number)
    {
        let yx = _to[0] - _from[0], yy = _to[1] - _from[1], yz = _to[2] - _from[2];
        const len = Math.hypot(yx, yy, yz);
        if(len < 1e-4) return;
        yx /= len; yy /= len; yz /= len;
        let ux = 0, uy = 1, uz = 0;
        if(Math.abs(yy) > 0.9) { ux = 1; uy = 0; }
        let zx = uy * yz - uz * yy, zy = uz * yx - ux * yz, zz = ux * yy - uy * yx;
        let zl = Math.hypot(zx, zy, zz) || 1;
        zx /= zl; zy /= zl; zz /= zl;
        const xx = yy * zz - yz * zy, xy = yz * zx - yx * zz, xz = yx * zy - yy * zx;
        const mx = (_from[0] + _to[0]) * 0.5, my = (_from[1] + _to[1]) * 0.5, mz = (_from[2] + _to[2]) * 0.5;
        const hy = len * 0.5;
        const c = (sx : number, sy : number, sz : number) => [
            mx + xx * sx * _rx + yx * sy * hy + zx * sz * _rz,
            my + xy * sx * _rx + yy * sy * hy + zy * sz * _rz,
            mz + xz * sx * _rx + yz * sy * hy + zz * sz * _rz,
        ];
        const q = [
            [c(-1, -1, 1), c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1)],
            [c(1, -1, -1), c(-1, -1, -1), c(-1, 1, -1), c(1, 1, -1)],
            [c(-1, 1, 1), c(1, 1, 1), c(1, 1, -1), c(-1, 1, -1)],
            [c(-1, -1, -1), c(1, -1, -1), c(1, -1, 1), c(-1, -1, 1)],
            [c(-1, -1, -1), c(-1, -1, 1), c(-1, 1, 1), c(-1, 1, -1)],
            [c(1, -1, 1), c(1, -1, -1), c(1, 1, -1), c(1, 1, 1)],
        ];
        for(const f of q) CAvatarR15.Quad(_a, f, _bone);
    }
    private static Sphere(_a : { pos : CMeshBuf; nor : CMeshBuf; uv : CMeshBuf; w : CMeshBuf; wi : CMeshBuf; idx : CMeshBuf; bound : CBound }, _c : number[], _r : number, _bone : number, _lat : number, _lon : number)
    {
        const v : number[][] = [];
        for(let y = 0; y <= _lat; y++)
        {
            const t = y / _lat * Math.PI, st = Math.sin(t), ct = Math.cos(t);
            for(let x = 0; x <= _lon; x++)
            {
                const p = x / _lon * Math.PI * 2;
                v.push([_c[0] + Math.cos(p) * st * _r, _c[1] + ct * _r, _c[2] + Math.sin(p) * st * _r]);
            }
        }
        const base = _a.pos.bufF.Size(3);
        for(const p of v)
        {
            const n = [p[0] - _c[0], p[1] - _c[1], p[2] - _c[2]];
            const l = Math.hypot(n[0], n[1], n[2]) || 1;
            CAvatarR15.Push(_a, p, [n[0] / l, n[1] / l, n[2] / l], _bone);
        }
        const row = _lon + 1;
        for(let y = 0; y < _lat; y++)
            for(let x = 0; x < _lon; x++)
            {
                const i = base + y * row + x;
                _a.idx.bufI.push(i, i + 1, i + row + 1, i, i + row + 1, i + row);
            }
    }
    private static Ellipsoid(_a : { pos : CMeshBuf; nor : CMeshBuf; uv : CMeshBuf; w : CMeshBuf; wi : CMeshBuf; idx : CMeshBuf; bound : CBound }, _c : number[], _rx : number, _ry : number, _rz : number, _bone : number, _lat : number, _lon : number)
    {
        const v : number[][] = [], nrm : number[][] = [];
        for(let y = 0; y <= _lat; y++)
        {
            const t = y / _lat * Math.PI, st = Math.sin(t), ct = Math.cos(t);
            for(let x = 0; x <= _lon; x++)
            {
                const p = x / _lon * Math.PI * 2, cp = Math.cos(p), sp = Math.sin(p);
                v.push([_c[0] + cp * st * _rx, _c[1] + ct * _ry, _c[2] + sp * st * _rz]);
                const nx = cp * st / _rx, ny = ct / _ry, nz = sp * st / _rz;
                const l = Math.hypot(nx, ny, nz) || 1;
                nrm.push([nx / l, ny / l, nz / l]);
            }
        }
        const base = _a.pos.bufF.Size(3);
        for(let i = 0; i < v.length; i++) CAvatarR15.Push(_a, v[i], nrm[i], _bone);
        const row = _lon + 1;
        for(let y = 0; y < _lat; y++)
            for(let x = 0; x < _lon; x++)
            {
                const i = base + y * row + x;
                _a.idx.bufI.push(i, i + 1, i + row + 1, i, i + row + 1, i + row);
            }
    }
    private static Spindle(_a : { pos : CMeshBuf; nor : CMeshBuf; uv : CMeshBuf; w : CMeshBuf; wi : CMeshBuf; idx : CMeshBuf; bound : CBound }, _from : number[], _to : number[], _r0 : number, _r1 : number, _bone : number, _sides : number)
    {
        let yx = _to[0] - _from[0], yy = _to[1] - _from[1], yz = _to[2] - _from[2];
        const len = Math.hypot(yx, yy, yz);
        if(len < 1e-4) return;
        yx /= len; yy /= len; yz /= len;
        let ux = 0, uy = 1, uz = 0;
        if(Math.abs(yy) > 0.9) { ux = 1; uy = 0; }
        let zx = uy * yz - uz * yy, zy = uz * yx - ux * yz, zz = ux * yy - uy * yx;
        let zl = Math.hypot(zx, zy, zz) || 1;
        zx /= zl; zy /= zl; zz /= zl;
        const xx = yy * zz - yz * zy, xy = yz * zx - yx * zz, xz = yx * zy - yy * zx;
        const rings = 6, row = _sides + 1, base = _a.pos.bufF.Size(3);
        for(let y = 0; y <= rings; y++)
        {
            const t = y / rings, r = _r0 + (_r1 - _r0) * t;
            const cx = _from[0] + yx * len * t, cy = _from[1] + yy * len * t, cz = _from[2] + yz * len * t;
            for(let s = 0; s <= _sides; s++)
            {
                const a = s / _sides * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
                const ox = xx * ca + zx * sa, oy = xy * ca + zy * sa, oz = xz * ca + zz * sa;
                CAvatarR15.Push(_a, [cx + ox * r, cy + oy * r, cz + oz * r], [ox, oy, oz], _bone);
            }
        }
        for(let y = 0; y < rings; y++)
            for(let s = 0; s < _sides; s++)
            {
                const i = base + y * row + s;
                _a.idx.bufI.push(i, i + row, i + row + 1, i, i + row + 1, i + 1);
            }
        const c0 = _a.pos.bufF.Size(3);
        CAvatarR15.Push(_a, _from, [-yx, -yy, -yz], _bone);
        for(let s = 0; s < _sides; s++) _a.idx.bufI.push(c0, base + s, base + s + 1);
        const c1 = _a.pos.bufF.Size(3), tip = base + rings * row;
        CAvatarR15.Push(_a, _to, [yx, yy, yz], _bone);
        for(let s = 0; s < _sides; s++) _a.idx.bufI.push(c1, tip + s + 1, tip + s);
    }
    private static Loft(_a : { pos : CMeshBuf; nor : CMeshBuf; uv : CMeshBuf; w : CMeshBuf; wi : CMeshBuf; idx : CMeshBuf; bound : CBound }, _rings : { c : number[], rx : number, rz : number }[], _bone : number, _sides : number)
    {
        const row = _sides + 1, base = _a.pos.bufF.Size(3);
        for(const ring of _rings)
            for(let s = 0; s <= _sides; s++)
            {
                const a = s / _sides * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
                const nx = ca / ring.rx, nz = sa / ring.rz, l = Math.hypot(nx, nz) || 1;
                CAvatarR15.Push(_a, [ring.c[0] + ca * ring.rx, ring.c[1], ring.c[2] + sa * ring.rz], [nx / l, 0, nz / l], _bone);
            }
        for(let y = 0; y < _rings.length - 1; y++)
            for(let s = 0; s < _sides; s++)
            {
                const i = base + y * row + s;
                _a.idx.bufI.push(i, i + row, i + row + 1, i, i + row + 1, i + 1);
            }
        const c0 = _a.pos.bufF.Size(3);
        CAvatarR15.Push(_a, _rings[0].c, [0, -1, 0], _bone);
        for(let s = 0; s < _sides; s++) _a.idx.bufI.push(c0, base + s, base + s + 1);
        const c1 = _a.pos.bufF.Size(3), tip = base + (_rings.length - 1) * row;
        CAvatarR15.Push(_a, _rings[_rings.length - 1].c, [0, 1, 0], _bone);
        for(let s = 0; s < _sides; s++) _a.idx.bufI.push(c1, tip + s + 1, tip + s);
    }
}
