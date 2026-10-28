import { CTree } from "../../artgine/basic/CTree.js";
import { CMesh } from "../../artgine/render/CMesh.js";
import { CMeshBuf, CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../artgine/render/CMeshDataNode.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
export class CAvatarCloth {
    static sGap = 0.035;
    static sInner = 1.5;
    static sBudget = 6;
    static Geo(_ci) {
        const pb = _ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
        if (pb == null)
            return null;
        const nb = _ci.GetVFType(CVertexFormat.eIdentifier.Normal)[0];
        return { pos: pb.bufF.GetArray(), nor: nb?.bufF.GetArray() ?? null, count: pb.bufF.Size(3) };
    }
    static SkinNodes(_mesh) {
        return _mesh.meshTree.GetArray().filter(n => n.mData?.ci != null);
    }
    static BodyNodes(_mesh) {
        return CAvatarCloth.SkinNodes(_mesh).filter(n => !/eye/i.test(n.mKey));
    }
    static Height(_mesh) {
        let y0 = Infinity, y1 = -Infinity;
        for (const n of CAvatarCloth.BodyNodes(_mesh)) {
            const g = CAvatarCloth.Geo(n.mData.ci);
            if (g == null)
                continue;
            for (let i = 0; i < g.count; i++) {
                const y = g.pos[i * 3 + 1];
                if (y < y0)
                    y0 = y;
                if (y > y1)
                    y1 = y;
            }
        }
        return y1 > y0 ? y1 - y0 : 1;
    }
    static async Hidden(_body, _cloth) {
        const out = new Map();
        const gap = CAvatarCloth.Height(_body) * CAvatarCloth.sGap;
        const cell = gap * 2, grid = new Map(), tri = [];
        const Key = (_x, _y, _z) => ((_x + 1024) * 2048 + (_y + 1024)) * 2048 + (_z + 1024);
        let t0 = performance.now();
        for (const c of _cloth)
            for (const n of CAvatarCloth.SkinNodes(c)) {
                const g = CAvatarCloth.Geo(n.mData.ci), ib = n.mData.ci.GetVFType(CVertexFormat.eIdentifier.Index)[0];
                if (g == null || ib == null)
                    continue;
                const I = ib.bufI, P = g.pos;
                for (let t = 0; t + 2 < I.length; t += 3) {
                    const id = tri.length / 9;
                    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
                    for (let k = 0; k < 3; k++) {
                        const v = I[t + k] * 3, x = P[v], y = P[v + 1], z = P[v + 2];
                        tri.push(x, y, z);
                        if (x < x0)
                            x0 = x;
                        if (x > x1)
                            x1 = x;
                        if (y < y0)
                            y0 = y;
                        if (y > y1)
                            y1 = y;
                        if (z < z0)
                            z0 = z;
                        if (z > z1)
                            z1 = z;
                    }
                    for (let a = Math.floor(x0 / cell); a <= Math.floor(x1 / cell); a++)
                        for (let b = Math.floor(y0 / cell); b <= Math.floor(y1 / cell); b++)
                            for (let d = Math.floor(z0 / cell); d <= Math.floor(z1 / cell); d++) {
                                const k = Key(a, b, d);
                                let list = grid.get(k);
                                if (list == null)
                                    grid.set(k, list = []);
                                list.push(id);
                            }
                }
            }
        if (tri.length == 0)
            return out;
        const back = gap * CAvatarCloth.sInner, len = back + gap * 2.5;
        for (const n of CAvatarCloth.BodyNodes(_body)) {
            const g = CAvatarCloth.Geo(n.mData.ci);
            if (g == null || g.nor == null)
                continue;
            const hid = new Uint8Array(g.count), seen = new Set();
            for (let i = 0; i < g.count; i++) {
                if ((i & 255) == 0 && performance.now() - t0 > CAvatarCloth.sBudget) {
                    await new Promise(r => setTimeout(r, 0));
                    t0 = performance.now();
                }
                let nx = g.nor[i * 3], ny = g.nor[i * 3 + 1], nz = g.nor[i * 3 + 2];
                const nl = Math.hypot(nx, ny, nz) || 1;
                nx /= nl;
                ny /= nl;
                nz /= nl;
                const ox = g.pos[i * 3] - nx * back, oy = g.pos[i * 3 + 1] - ny * back, oz = g.pos[i * 3 + 2] - nz * back;
                const ex = ox + nx * len, ey = oy + ny * len, ez = oz + nz * len;
                seen.clear();
                search: for (let a = Math.floor(Math.min(ox, ex) / cell); a <= Math.floor(Math.max(ox, ex) / cell); a++)
                    for (let b = Math.floor(Math.min(oy, ey) / cell); b <= Math.floor(Math.max(oy, ey) / cell); b++)
                        for (let d = Math.floor(Math.min(oz, ez) / cell); d <= Math.floor(Math.max(oz, ez) / cell); d++) {
                            const list = grid.get(Key(a, b, d));
                            if (list == null)
                                continue;
                            for (const id of list) {
                                if (seen.has(id))
                                    continue;
                                seen.add(id);
                                if (CAvatarCloth.Ray(ox, oy, oz, nx, ny, nz, len, tri, id * 9)) {
                                    hid[i] = 1;
                                    break search;
                                }
                            }
                        }
            }
            out.set(n.mKey, hid);
        }
        return out;
    }
    static Ray(_ox, _oy, _oz, _dx, _dy, _dz, _len, _T, _o) {
        const ax = _T[_o], ay = _T[_o + 1], az = _T[_o + 2];
        const e1x = _T[_o + 3] - ax, e1y = _T[_o + 4] - ay, e1z = _T[_o + 5] - az;
        const e2x = _T[_o + 6] - ax, e2y = _T[_o + 7] - ay, e2z = _T[_o + 8] - az;
        const px = _dy * e2z - _dz * e2y, py = _dz * e2x - _dx * e2z, pz = _dx * e2y - _dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-12)
            return false;
        const inv = 1 / det, sx = _ox - ax, sy = _oy - ay, sz = _oz - az;
        const u = (sx * px + sy * py + sz * pz) * inv;
        if (u < 0 || u > 1)
            return false;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const v = (_dx * qx + _dy * qy + _dz * qz) * inv;
        if (v < 0 || u + v > 1)
            return false;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        return t > 0 && t < _len;
    }
    static SmoothNormal(_ci, _pos) {
        const src = _ci.GetVFType(CVertexFormat.eIdentifier.Normal)[0];
        const ib = _ci.GetVFType(CVertexFormat.eIdentifier.Index)[0];
        const nv = _pos.length / 3;
        if (src == null || ib == null || ib.bufI == null || src.bufF.mF32A.length < nv * 3)
            return null;
        const out = new Float32Array(src.bufF.mF32A.length), idx = ib.bufI, orig = src.bufF.mF32A;
        for (let i = 0; i + 2 < idx.length; i += 3) {
            const i0 = idx[i], i1 = idx[i + 1], i2 = idx[i + 2];
            if (i0 >= nv || i1 >= nv || i2 >= nv)
                continue;
            const ax = _pos[i0 * 3], ay = _pos[i0 * 3 + 1], az = _pos[i0 * 3 + 2];
            const bx = _pos[i1 * 3] - ax, by = _pos[i1 * 3 + 1] - ay, bz = _pos[i1 * 3 + 2] - az;
            const cx = _pos[i2 * 3] - ax, cy = _pos[i2 * 3 + 1] - ay, cz = _pos[i2 * 3 + 2] - az;
            const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
            out[i0 * 3] += nx;
            out[i0 * 3 + 1] += ny;
            out[i0 * 3 + 2] += nz;
            out[i1 * 3] += nx;
            out[i1 * 3 + 1] += ny;
            out[i1 * 3 + 2] += nz;
            out[i2 * 3] += nx;
            out[i2 * 3 + 1] += ny;
            out[i2 * 3 + 2] += nz;
        }
        for (let i = 0; i < nv; i++) {
            const x = out[i * 3], y = out[i * 3 + 1], z = out[i * 3 + 2], l = Math.hypot(x, y, z);
            if (l < 1e-8) {
                out[i * 3] = orig[i * 3];
                out[i * 3 + 1] = orig[i * 3 + 1];
                out[i * 3 + 2] = orig[i * 3 + 2];
            }
            else {
                out[i * 3] = x / l;
                out[i * 3 + 1] = y / l;
                out[i * 3 + 2] = z / l;
            }
        }
        const nb = new CMeshBuf(CVertexFormat.eIdentifier.Normal);
        nb.bufF.mF32A = out;
        nb.bufF.mSize = out.length;
        return nb;
    }
    static Variant(_body, _hidden = null, _pos = null) {
        const Copy = (_n, _parent) => {
            const t = new CTree();
            t.mKey = _n.mKey;
            t.mParent = _parent;
            t.mData = _n.mData;
            const ci = _n.mData?.ci;
            const hid = ci != null ? _hidden?.get(_n.mKey) : null, pos = ci != null ? _pos?.get(_n.mKey) : null;
            if (hid != null || pos != null) {
                const swap = new Map();
                const ib = ci.GetVFType(CVertexFormat.eIdentifier.Index)[0];
                if (hid != null && ib != null) {
                    const src = ib.bufI, idx = [];
                    for (let i = 0; i + 2 < src.length; i += 3)
                        if (!(hid[src[i]] && hid[src[i + 1]] && hid[src[i + 2]]))
                            idx.push(src[i], src[i + 1], src[i + 2]);
                    const nb = new CMeshBuf(CVertexFormat.eIdentifier.Index);
                    nb.bufI = idx;
                    swap.set(ib, nb);
                }
                const pb = ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
                if (pos != null && pb != null) {
                    const nb = new CMeshBuf(CVertexFormat.eIdentifier.Position);
                    nb.bufF.mF32A = pos;
                    nb.bufF.mSize = pos.length;
                    swap.set(pb, nb);
                }
                const nor = pos != null ? CAvatarCloth.SmoothNormal(ci, pos) : null;
                const nci = Object.assign(new CMeshCreateInfo(), ci);
                nci.vertex = ci.vertex.map(b => swap.get(b) ?? (nor != null && b.vfType == CVertexFormat.eIdentifier.Normal ? nor : b));
                if (swap.has(ib))
                    nci.indexCount = swap.get(ib).bufI.length;
                t.mData = Object.assign(new CMeshDataNode(), _n.mData);
                t.mData.ci = nci;
            }
            let prev = null;
            for (let ch = _n.mChild; ch != null; ch = ch.mColleague) {
                const c = Copy(ch, t);
                if (prev == null)
                    t.mChild = c;
                else
                    prev.mColleague = c;
                prev = c;
            }
            return t;
        };
        const m = Object.assign(new CMesh(), _body);
        m.meshTree = Copy(_body.meshTree, null);
        m.hash = null;
        return m;
    }
}
