import { CTree } from "../../artgine/basic/CTree.js";
import { CMesh } from "../../artgine/render/CMesh.js";
import { CMeshDataNode } from "../../artgine/render/CMeshDataNode.js";
import { CMeshBuf, CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CAvatarCloth } from "./CAvatarCloth.js";
export class CAvatarMerge {
    static IsCompatible(_body, _part) {
        if (_body.skin.length != _part.skin.length)
            return false;
        for (let i = 0; i < _body.skin.length; i++)
            if (_body.skin[i].key != _part.skin[i].key)
                return false;
        return true;
    }
    static Merge(_body, _bodyTex, _part) {
        const m = CAvatarCloth.Variant(_body);
        m.texture = _body.texture.map(t => _bodyTex?.get(t) ?? t);
        let n = 0;
        for (const p of _part) {
            if (!CAvatarMerge.IsCompatible(_body, p.mesh))
                continue;
            const off = m.texture.length;
            for (const t of p.mesh.texture)
                m.texture.push(p.tex?.get(t) ?? t);
            const moved = new Map();
            for (const src of CAvatarCloth.SkinNodes(p.mesh)) {
                const sp = src.mParent;
                const parent = sp == null ? m.meshTree : (moved.get(sp) ?? m.meshTree.Find(sp.mKey) ?? m.meshTree);
                const t = new CTree();
                t.mKey = "part" + (n++) + "_" + src.mKey;
                t.mData = Object.assign(new CMeshDataNode(), src.mData);
                t.mData.textureOff = src.mData.textureOff.map(i => i + off);
                t.mParent = parent;
                moved.set(src, t);
                if (parent.mChild == null)
                    parent.mChild = t;
                else {
                    let last = parent.mChild;
                    while (last.mColleague != null)
                        last = last.mColleague;
                    last.mColleague = t;
                }
            }
        }
        m.meshTree.mValueArr = null;
        m.hash = null;
        return m;
    }
    static Compact(_mesh, _driver) {
        const Bone = (_key) => _key.substring(_key.lastIndexOf(" ") + 1);
        const newSkin = _mesh.skin.filter(s => _driver.has(Bone(s.key)));
        if (newSkin.length == 0)
            return _mesh;
        const remap = _mesh.skin.map(s => {
            for (let t = _mesh.meshTree.Find(Bone(s.key)); t != null; t = t.mParent) {
                const i = newSkin.findIndex(n => Bone(n.key) == t.mKey);
                if (i >= 0)
                    return i;
            }
            return 0;
        });
        const Copy = (_n, _parent) => {
            const t = new CTree();
            t.mKey = _n.mKey;
            t.mParent = _parent;
            t.mData = _n.mData;
            const ci = _n.mData?.ci;
            const wb = ci?.GetVFType(CVertexFormat.eIdentifier.Weight)[0], ib = ci?.GetVFType(CVertexFormat.eIdentifier.WeightIndex)[0];
            if (wb != null && ib != null) {
                const W = wb.bufF.GetArray(), I = ib.bufF.GetArray(), cnt = Math.min(wb.bufF.Size(4), ib.bufF.Size(4));
                const nw = new Float32Array(cnt * 4), ni = new Float32Array(cnt * 4);
                for (let v = 0; v < cnt; v++) {
                    const acc = new Map();
                    for (let k = 0; k < 4; k++) {
                        const w = W[v * 4 + k];
                        if (w <= 0)
                            continue;
                        const j = remap[I[v * 4 + k]] ?? 0;
                        acc.set(j, (acc.get(j) ?? 0) + w);
                    }
                    let k = 0;
                    for (const [j, w] of acc) {
                        ni[v * 4 + k] = j;
                        nw[v * 4 + k] = w;
                        k++;
                    }
                }
                const nwb = new CMeshBuf(CVertexFormat.eIdentifier.Weight), nib = new CMeshBuf(CVertexFormat.eIdentifier.WeightIndex);
                nwb.bufF.mF32A = nw;
                nwb.bufF.mSize = nw.length;
                nib.bufF.mF32A = ni;
                nib.bufF.mSize = ni.length;
                const nci = Object.assign(new CMeshCreateInfo(), ci);
                nci.vertex = ci.vertex.map(b => b == wb ? nwb : b == ib ? nib : b);
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
        const m = Object.assign(new CMesh(), _mesh);
        m.meshTree = Copy(_mesh.meshTree, null);
        m.skin = newSkin;
        m.hash = null;
        return m;
    }
}
