import { CTree } from "../../artgine/basic/CTree.js";
import { CMesh } from "../../artgine/render/CMesh.js";
import { CMeshDataNode } from "../../artgine/render/CMeshDataNode.js";
import { CMeshBuf, CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CAvatarCloth } from "./CAvatarCloth.js";

export interface IAvatarMergePart { mesh : CMesh; tex : Map<string, string>; }

//로블록스 FastCluster 방식. 몸·옷·머리카락을 한 메시(한 뼈대·한 페인트)로 합친다.
//모든 파츠의 스킨 배열이 같은 순서·같은 바인드라는 전제(같은 유니버설 리그)라 정점 가중치 인덱스는 그대로 쓴다
export class CAvatarMerge
{
    static IsCompatible(_body : CMesh, _part : CMesh) : boolean
    {
        if(_body.skin.length != _part.skin.length) return false;
        for(let i = 0; i < _body.skin.length; i++) if(_body.skin[i].key != _part.skin[i].key) return false;
        return true;
    }

    //_bodyTex·파츠 tex : 원래 텍스처 키 → 바꿀 키(피부색·머리색)
    static Merge(_body : CMesh, _bodyTex : Map<string, string>, _part : IAvatarMergePart[]) : CMesh
    {
        const m = CAvatarCloth.Variant(_body);
        m.texture = _body.texture.map(t => _bodyTex?.get(t) ?? t);
        let n = 0;
        for(const p of _part)
        {
            if(!CAvatarMerge.IsCompatible(_body, p.mesh)) continue;
            const off = m.texture.length;
            for(const t of p.mesh.texture) m.texture.push(p.tex?.get(t) ?? t);
            //파츠 메시 노드끼리의 부모(메시 → 하위 프리미티브)는 이름을 바꿨으므로 새 노드로 찾는다
            const moved = new Map<CTree<CMeshDataNode>, CTree<CMeshDataNode>>();
            for(const src of CAvatarCloth.SkinNodes(p.mesh))
            {
                const sp = src.mParent;
                const parent = sp == null ? m.meshTree : (moved.get(sp) ?? m.meshTree.Find(sp.mKey) ?? m.meshTree);
                const t = new CTree<CMeshDataNode>();
                t.mKey = "part" + (n++) + "_" + src.mKey;
                t.mData = Object.assign(new CMeshDataNode(), src.mData) as CMeshDataNode;
                t.mData.textureOff = src.mData.textureOff.map(i => i + off);
                t.mParent = parent;
                moved.set(src, t);
                if(parent.mChild == null) parent.mChild = t;
                else
                {
                    let last = parent.mChild;
                    while(last.mColleague != null) last = last.mColleague;
                    last.mColleague = t;
                }
            }
        }
        m.meshTree.mValueArr = null;
        m.hash = null;
        return m;
    }

    //R6 경량 메시. 모든 정점 가중치를 가장 가까운 조상 구동 본으로 옮기고 스킨 배열을 구동 본만 남긴다.
    //엔진은 페인트마다 매 프레임 (노드 수 × 스킨 수)만큼 본 행렬을 맞추므로 스킨이 줄면 그만큼 가벼워진다
    static Compact(_mesh : CMesh, _driver : Set<string>) : CMesh
    {
        const Bone = (_key : string) => _key.substring(_key.lastIndexOf(" ") + 1);
        const newSkin = _mesh.skin.filter(s => _driver.has(Bone(s.key)));
        if(newSkin.length == 0) return _mesh;
        const remap = _mesh.skin.map(s =>
        {
            for(let t = _mesh.meshTree.Find(Bone(s.key)); t != null; t = t.mParent)
            {
                const i = newSkin.findIndex(n => Bone(n.key) == t.mKey);
                if(i >= 0) return i;
            }
            return 0;
        });
        const Copy = (_n : CTree<CMeshDataNode>, _parent : CTree<CMeshDataNode>) : CTree<CMeshDataNode> =>
        {
            const t = new CTree<CMeshDataNode>();
            t.mKey = _n.mKey;
            t.mParent = _parent;
            t.mData = _n.mData;
            const ci = _n.mData?.ci;
            const wb = ci?.GetVFType(CVertexFormat.eIdentifier.Weight)[0], ib = ci?.GetVFType(CVertexFormat.eIdentifier.WeightIndex)[0];
            if(wb != null && ib != null)
            {
                const W = wb.bufF.GetArray(), I = ib.bufF.GetArray(), cnt = Math.min(wb.bufF.Size(4), ib.bufF.Size(4));
                const nw = new Float32Array(cnt * 4), ni = new Float32Array(cnt * 4);
                for(let v = 0; v < cnt; v++)
                {
                    const acc = new Map<number, number>();
                    for(let k = 0; k < 4; k++)
                    {
                        const w = W[v * 4 + k];
                        if(w <= 0) continue;
                        const j = remap[I[v * 4 + k]] ?? 0;
                        acc.set(j, (acc.get(j) ?? 0) + w);
                    }
                    let k = 0;
                    for(const [j, w] of acc) { ni[v * 4 + k] = j; nw[v * 4 + k] = w; k++; }
                }
                const nwb = new CMeshBuf(CVertexFormat.eIdentifier.Weight), nib = new CMeshBuf(CVertexFormat.eIdentifier.WeightIndex);
                nwb.bufF.mF32A = nw; nwb.bufF.mSize = nw.length;
                nib.bufF.mF32A = ni; nib.bufF.mSize = ni.length;
                const nci = Object.assign(new CMeshCreateInfo(), ci) as CMeshCreateInfo;
                nci.vertex = ci.vertex.map(b => b == wb ? nwb : b == ib ? nib : b);
                t.mData = Object.assign(new CMeshDataNode(), _n.mData) as CMeshDataNode;
                t.mData.ci = nci;
            }
            let prev : CTree<CMeshDataNode> = null;
            for(let ch = _n.mChild; ch != null; ch = ch.mColleague)
            {
                const c = Copy(ch, t);
                if(prev == null) t.mChild = c; else prev.mColleague = c;
                prev = c;
            }
            return t;
        };
        const m = Object.assign(new CMesh(), _mesh) as CMesh;
        m.meshTree = Copy(_mesh.meshTree, null);
        m.skin = newSkin;
        m.hash = null;
        return m;
    }
}
