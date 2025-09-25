import { CMesh } from "../../render/CMesh.js";
import { CParser } from "./CParser.js";

// ▼ FBX 파서와 동일한 자료구조/유틸 사용
import { CMeshDataNode } from "../../render/CMeshDataNode.js";
import { CMeshCreateInfo, CMeshBuf } from "../../render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../render/CShader.js";
import { CUtilRender } from "../../render/CUtilRender.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CFile } from "../../system/CFile.js";
import { CUtil } from "../../basic/CUtil.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CAlert } from "../../basic/CAlert.js";
import { CTree } from "../../basic/CTree.js";

type ObjFaceV = { vi:number, vti:number, vni:number };

export class CParserOBJ extends CParser
{
    public mMesh = new CMesh();
    private mPath: string = "";

    GetResult() { return this.mMesh; }

    async Load(pa_fileName: string)
    {
        // ---------- path ----------
        if (pa_fileName.indexOf("/") == -1) this.mPath = "";
        else this.mPath = pa_fileName.substr(0, pa_fileName.lastIndexOf("/")) + "/";

        // ---------- open OBJ ----------
        if (await this.Open(pa_fileName)) return;

        this.SetOffset(0);
        const objText = this.ReadString(this.mBuffer.length);

        // ---------- MTL helpers ----------
        const mtlMaps = new Map<string, string>(); // materialName -> map_Kd (relative path allowed)
        
        const parseMTL = (txt: string) => {
            let cur: string | null = null;
            for (const raw of txt.split(/\r?\n/)) {
                const line = raw.replace(/#.*$/, "").trim();
                if (!line) continue;
                const tk = line.split(/\s+/);
                const tag = tk[0];
                if (tag === "newmtl" && tk[1]) cur = tk[1];
                else if (tag === "Kd" && tk.length >= 2) 
                {
                    mtlMaps.set(cur, `rgba(${Math.trunc(Number(tk[1])*0xff)},${Math.trunc(Number(tk[2])*0xff)},${Math.trunc(Number(tk[3])*0xff)},1).rgba`);
                }
                else if (cur && tag === "map_Kd" && tk.length >= 2) {
                    const path = line.substring("map_Kd".length).trim();
                    if (path) mtlMaps.set(cur, path);
                }
            }
        };

        // ---------- root tree ----------
        this.mMesh.meshTree.mData = new CMeshDataNode();

        // OBJ는 다수의 오브젝트/그룹을 가질 수 있음 → 노드 풀 관리
        type NodeBag = {
            node: CTree<CMeshDataNode>, // CTree<CMeshDataNode>
            name: string,
            // unified buffers per node
            pos: number[], uv: number[], nor: number[], idx: number[],
            texSelX: number[], // TexOff.X (diffuse slot selection) per unified vertex
            // source indices map: key-> unified index
            vmap: Map<string, number>,
            // current material selection (resolved TexOff selector index)
            curMat: string | null,
            curTexSel: number // selector value to write into TexOff.X
        };
        const nodes = new Map<string, NodeBag>();
        const getOrCreateNode = (name: string): NodeBag => {
            let bag = nodes.get(name);
            if (bag) return bag;
            const n = this.mMesh.meshTree.PushChild(name);
            n.mData = new CMeshDataNode();
            bag = {
                node: n,
                name,
                pos: [], uv: [], nor: [], idx: [],
                texSelX: [],
                vmap: new Map<string, number>(),
                curMat: null,
                curTexSel: -1
            };
            nodes.set(name, bag);
            return bag;
        };

        // 기본 노드명: 파일명 or "default"
        const baseName = (() => {
            const st = pa_fileName.lastIndexOf("/");
            return (st >= 0 ? pa_fileName.substring(st + 1) : pa_fileName) || "default";
        })();

        // ---------- source arrays ----------
        const srcV: Array<CVec3> = [];
        const srcVT: Array<{u:number, v:number}> = [];
        const srcVN: Array<CVec3> = [];

        // ---------- state ----------
        let curNode = getOrCreateNode(baseName);
        let curMatName: string | null = null; // for keying
        const fixIndex = (i: number, len: number) => (i > 0 ? i - 1 : len + i);

        // TexOff/texture tables per node need global this.mMesh.texture
        const ensureTextureOnNode = (bag: NodeBag, texPath: string) => {
            // 1) register texture globally
            let tOff = this.mMesh.texture.indexOf(texPath);
            if (tOff === -1) { this.mMesh.texture.push(texPath); tOff = this.mMesh.texture.length - 1; }
            // 2) ensure node textureOff includes this
            let sel = bag.node.mData.textureOff.indexOf(tOff);
            if (sel === -1) { bag.node.mData.textureOff.push(tOff); sel = bag.node.mData.textureOff.length - 1; }
            bag.curTexSel = sel;
            return sel;
        };

        // unified vertex builder (material-aware)
        const addVertex = (bag: NodeBag, faceV: ObjFaceV): number => {
            const vi = fixIndex(faceV.vi,  srcV.length);
            const vti = (faceV.vti !== 0 && srcVT.length > 0) ? fixIndex(faceV.vti, srcVT.length) : -1;
            const vni = (faceV.vni !== 0 && srcVN.length > 0) ? fixIndex(faceV.vni, srcVN.length) : -1;
            // key includes current material selection to allow per-material TexOff per-vertex
            const key = `${vi}/${vti}/${vni}/m:${bag.curTexSel}`;
            const hit = bag.vmap.get(key);
            if (hit !== undefined) return hit;

            const p = srcV[vi];
            const t = (vti >= 0) ? srcVT[vti] : null;
            const n = (vni >= 0) ? srcVN[vni] : null;

            // position
            bag.pos.push(p.x, p.y, p.z);

            // uv
            if (t) bag.uv.push(t.u, t.v);
            else   bag.uv.push(0, 0);

            // normal
            if (n) bag.nor.push(n.x, n.y, n.z);
            else   bag.nor.push(0, 0, 0);

            // TexOff.X selection per vertex
            bag.texSelX.push(bag.curTexSel);

            const idx = (bag.pos.length / 3) - 1;
            bag.vmap.set(key, idx);
            return idx;
        };

        // ---------- parse OBJ ----------
        const lines = objText.split(/\r?\n/);
        for (let raw of lines) {
            const line = raw.replace(/#.*$/, "").trim();
            if (!line) continue;
            const tok = line.split(/\s+/);
            const tag = tok[0];

            if (tag === "mtllib" && tok.length >= 2) {
                const mtlName = line.substring("mtllib".length).trim();
                let buf=await CFile.Load(this.mPath + mtlName);
                if(buf==null) 
                {
                    CAlert.E("file empty! : "+this.mPath + mtlName);
                    continue;
                }
                const mtlText = CUtil.ArrayToString(buf);
                if (mtlText) parseMTL(mtlText);
            }
            else if (tag === "usemtl" && tok.length >= 2) {
                curMatName = line.substring("usemtl".length).trim();
                const mapKd = mtlMaps.get(curMatName || "");
                if (mapKd) {
                    // 상대경로 보정
                    const rel = mapKd.split("\\").join("/");
                    const fileOnly = (() => {
                        const s = rel.lastIndexOf("/");
                        return s >= 0 ? rel.substring(s + 1) : rel;
                    })();
                    const full = this.mPath + fileOnly;
                    ensureTextureOnNode(curNode, full);
                } else {
                    // 텍스쳐 없으면 디폴트: 색상 없는 경우 RGBA 회색을 한 번만 생성해도 됨
                    if (curNode.node.mData.textureOff.length === 0) {
                        this.mMesh.texture.push("rgba(200,200,200,1).rgba");
                        const toff = this.mMesh.texture.length - 1;
                        curNode.node.mData.textureOff.push(toff);
                    }
                    curNode.curTexSel = 0;
                }
                curNode.curMat = curMatName;
            }
            else if ((tag === "o" || tag === "g") && tok.length >= 2) {
                const name = line.substring(tag.length).trim() || "unnamed";
                curNode = getOrCreateNode(name);
                // 그룹 전환 후에도 직전 usemtl을 이어가고 싶으면:
                if (curMatName) {
                    const mapKd = mtlMaps.get(curMatName);
                    if (mapKd) {
                        const rel = mapKd.split("\\").join("/");
                        const fileOnly = (() => { const s = rel.lastIndexOf("/"); return s >= 0 ? rel.substring(s + 1) : rel; })();
                        ensureTextureOnNode(curNode, this.mPath + fileOnly);
                    } else {
                        if (curNode.node.mData.textureOff.length === 0) {
                            this.mMesh.texture.push(this.mPath+"rgba(200,200,200,1).rgba");
                            const toff = this.mMesh.texture.length - 1;
                            curNode.node.mData.textureOff.push(toff);
                        }
                        curNode.curTexSel = 0;
                    }
                    curNode.curMat = curMatName;
                }
            }
            else if (tag === "v" && tok.length >= 4) {
                const x = parseFloat(tok[1]), y = parseFloat(tok[2]), z = parseFloat(tok[3]);
                srcV.push(new CVec3(x, y, z));
            }
            else if (tag === "vt" && tok.length >= 3) {
                const u = parseFloat(tok[1]), v = parseFloat(tok[2]);
                srcVT.push({ u, v });
            }
            else if (tag === "vn" && tok.length >= 4) {
                const x = parseFloat(tok[1]), y = parseFloat(tok[2]), z = parseFloat(tok[3]);
                srcVN.push(new CVec3(x, y, z));
            }
            else if (tag === "f" && tok.length >= 4) {
                // 현재 노드/머티리얼의 TexOff 선택이 정해지지 않았으면 기본 보장
                if (curNode.curTexSel < 0) {
                    if (curNode.node.mData.textureOff.length === 0) {
                        this.mMesh.texture.push(this.mPath+"rgba(200,200,200,1).rgba");
                        const toff = this.mMesh.texture.length - 1;
                        curNode.node.mData.textureOff.push(toff);
                    }
                    curNode.curTexSel = 0;
                }
                // f v(/vt)(/vn) ...
                const face: ObjFaceV[] = tok.slice(1).map(p => {
                    const [a,b,c] = p.split("/");
                    const vi  = parseInt(a, 10);
                    const vti = (b && b.length>0) ? parseInt(b, 10) : 0;
                    const vni = (c && c.length>0) ? parseInt(c, 10) : 0;
                    return {vi, vti, vni};
                });
                // triangle fan
                for (let i=1; i+1<face.length; ++i) {
                    const i0 = addVertex(curNode, face[0]);
                    const i1 = addVertex(curNode, face[i]);
                    const i2 = addVertex(curNode, face[i+1]);
                    // 시계 반전 필요 시 swap(엔진 규칙에 맞게 조정)
                    curNode.idx.push(i0, i1, i2);
                }
            }
            // 필요시: s(스무딩), usemap 등 확장 가능
        }

        // ---------- bake into mesh tree ----------
        for (const [,bag] of nodes) {
            // 노드별 CI 생성
            
            if(bag.pos.length==0)   continue;
            bag.node.mData.ci = new CMeshCreateInfo();
            
            // Position
            const posBuf = new CMeshBuf(CVertexFormat.eIdentifier.Position);
            for (let i=0;i<bag.pos.length;i+=3) {
                posBuf.bufF.Push(new CVec3(bag.pos[i+0], bag.pos[i+1], bag.pos[i+2]));
            }
            bag.node.mData.ci.vertex.push(posBuf);

            // Normal (초기 0이면 나중에 재계산)
            const norBuf = new CMeshBuf(CVertexFormat.eIdentifier.Normal);
            for (let i=0;i<bag.nor.length;i+=3) {
                norBuf.bufF.Push(new CVec3(bag.nor[i+0], bag.nor[i+1], bag.nor[i+2]));
            }
            bag.node.mData.ci.vertex.push(norBuf);

            // UV (+ 인덱스 매핑; OBJ는 unified라서 버텍스 인덱스를 그대로 복제)
            const uvBuf = new CMeshBuf(CVertexFormat.eIdentifier.UV);
            for (let i=0;i<bag.uv.length;i+=2) {
                uvBuf.bufF.Push(new CVec2(bag.uv[i+0], bag.uv[i+1]));
            }
            for (const id of bag.idx) uvBuf.bufI.push(id);
            bag.node.mData.ci.vertex.push(uvBuf);

            // TexOff (X=diffuse slot index, Y/Z=-1)
            const texOffBuf = new CMeshBuf(CVertexFormat.eIdentifier.TexOff);
            for (let i=0;i<bag.texSelX.length;i++) {
                const x = bag.texSelX[i] >= 0 ? bag.texSelX[i] : -1;
                texOffBuf.bufF.Push(new CVec3(x, -1, -1));
            }
            bag.node.mData.ci.vertex.push(texOffBuf);

            // Indices
            for (const id of bag.idx) bag.node.mData.ci.index.push(id);

            //bag.node.mData.ci.vertexCount=bag.pos.length/3;
            //bag.node.mData.ci.indexCount=bag.node.mData.ci.index.length;
            // 노말 재계산(필요 시)
            CUtilRender.RebuildNormals(bag.node.mData.ci);

            // // 텍스처 오프셋 테이블이 비었다면 기본 RGBA 보장
            // if (bag.node.mData.textureOff.length === 0) {
            //     this.mMesh.texture.push(this.mPath+"rgba(255, 255, 255, 1).rgba");
            //     const toff = this.mMesh.texture.length - 1;
            //     bag.node.mData.textureOff.push(toff);
            // }
        }
    }
}
