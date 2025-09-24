import { CMesh } from "../../render/CMesh.js";
import { CParser } from "./CParser.js";
import { CMeshDataNode } from "../../render/CMeshDataNode.js";
import { CMeshCreateInfo, CMeshBuf } from "../../render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../render/CShader.js";
import { CUtilRender } from "../../render/CUtilRender.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CFile } from "../../system/CFile.js";
import { CUtil } from "../../basic/CUtil.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CAlert } from "../../basic/CAlert.js";
export class CParserOBJ extends CParser {
    mMesh = new CMesh();
    mPath = "";
    GetResult() { return this.mMesh; }
    async Load(pa_fileName) {
        if (pa_fileName.indexOf("/") == -1)
            this.mPath = "";
        else
            this.mPath = pa_fileName.substr(0, pa_fileName.lastIndexOf("/")) + "/";
        if (await this.Open(pa_fileName))
            return;
        this.SetOffset(0);
        const objText = this.ReadString(this.mBuffer.length);
        const mtlMaps = new Map();
        const parseMTL = (txt) => {
            let cur = null;
            for (const raw of txt.split(/\r?\n/)) {
                const line = raw.replace(/#.*$/, "").trim();
                if (!line)
                    continue;
                const tk = line.split(/\s+/);
                const tag = tk[0];
                if (tag === "newmtl" && tk[1])
                    cur = tk[1];
                else if (tag === "Kd" && tk.length >= 2) {
                    mtlMaps.set(cur, `rgba(${Math.trunc(Number(tk[1]) * 0xff)},${Math.trunc(Number(tk[2]) * 0xff)},${Math.trunc(Number(tk[3]) * 0xff)},1).rgba`);
                }
                else if (cur && tag === "map_Kd" && tk.length >= 2) {
                    const path = line.substring("map_Kd".length).trim();
                    if (path)
                        mtlMaps.set(cur, path);
                }
            }
        };
        this.mMesh.meshTree.mData = new CMeshDataNode();
        const nodes = new Map();
        const getOrCreateNode = (name) => {
            let bag = nodes.get(name);
            if (bag)
                return bag;
            const n = this.mMesh.meshTree.PushChild(name);
            n.mData = new CMeshDataNode();
            bag = {
                node: n,
                name,
                pos: [], uv: [], nor: [], idx: [],
                texSelX: [],
                vmap: new Map(),
                curMat: null,
                curTexSel: -1
            };
            nodes.set(name, bag);
            return bag;
        };
        const baseName = (() => {
            const st = pa_fileName.lastIndexOf("/");
            return (st >= 0 ? pa_fileName.substring(st + 1) : pa_fileName) || "default";
        })();
        const srcV = [];
        const srcVT = [];
        const srcVN = [];
        let curNode = getOrCreateNode(baseName);
        let curMatName = null;
        const fixIndex = (i, len) => (i > 0 ? i - 1 : len + i);
        const ensureTextureOnNode = (bag, texPath) => {
            let tOff = this.mMesh.texture.indexOf(texPath);
            if (tOff === -1) {
                this.mMesh.texture.push(texPath);
                tOff = this.mMesh.texture.length - 1;
            }
            let sel = bag.node.mData.textureOff.indexOf(tOff);
            if (sel === -1) {
                bag.node.mData.textureOff.push(tOff);
                sel = bag.node.mData.textureOff.length - 1;
            }
            bag.curTexSel = sel;
            return sel;
        };
        const addVertex = (bag, faceV) => {
            const vi = fixIndex(faceV.vi, srcV.length);
            const vti = (faceV.vti !== 0 && srcVT.length > 0) ? fixIndex(faceV.vti, srcVT.length) : -1;
            const vni = (faceV.vni !== 0 && srcVN.length > 0) ? fixIndex(faceV.vni, srcVN.length) : -1;
            const key = `${vi}/${vti}/${vni}/m:${bag.curTexSel}`;
            const hit = bag.vmap.get(key);
            if (hit !== undefined)
                return hit;
            const p = srcV[vi];
            const t = (vti >= 0) ? srcVT[vti] : null;
            const n = (vni >= 0) ? srcVN[vni] : null;
            bag.pos.push(p.x, p.y, p.z);
            if (t)
                bag.uv.push(t.u, t.v);
            else
                bag.uv.push(0, 0);
            if (n)
                bag.nor.push(n.x, n.y, n.z);
            else
                bag.nor.push(0, 0, 0);
            bag.texSelX.push(bag.curTexSel);
            const idx = (bag.pos.length / 3) - 1;
            bag.vmap.set(key, idx);
            return idx;
        };
        const lines = objText.split(/\r?\n/);
        for (let raw of lines) {
            const line = raw.replace(/#.*$/, "").trim();
            if (!line)
                continue;
            const tok = line.split(/\s+/);
            const tag = tok[0];
            if (tag === "mtllib" && tok.length >= 2) {
                const mtlName = line.substring("mtllib".length).trim();
                let buf = await CFile.Load(this.mPath + mtlName);
                if (buf == null) {
                    CAlert.E("file empty! : " + this.mPath + mtlName);
                    continue;
                }
                const mtlText = CUtil.ArrayToString(buf);
                if (mtlText)
                    parseMTL(mtlText);
            }
            else if (tag === "usemtl" && tok.length >= 2) {
                curMatName = line.substring("usemtl".length).trim();
                const mapKd = mtlMaps.get(curMatName || "");
                if (mapKd) {
                    const rel = mapKd.split("\\").join("/");
                    const fileOnly = (() => {
                        const s = rel.lastIndexOf("/");
                        return s >= 0 ? rel.substring(s + 1) : rel;
                    })();
                    const full = this.mPath + fileOnly;
                    ensureTextureOnNode(curNode, full);
                }
                else {
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
                if (curMatName) {
                    const mapKd = mtlMaps.get(curMatName);
                    if (mapKd) {
                        const rel = mapKd.split("\\").join("/");
                        const fileOnly = (() => { const s = rel.lastIndexOf("/"); return s >= 0 ? rel.substring(s + 1) : rel; })();
                        ensureTextureOnNode(curNode, this.mPath + fileOnly);
                    }
                    else {
                        if (curNode.node.mData.textureOff.length === 0) {
                            this.mMesh.texture.push(this.mPath + "rgba(200,200,200,1).rgba");
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
                if (curNode.curTexSel < 0) {
                    if (curNode.node.mData.textureOff.length === 0) {
                        this.mMesh.texture.push(this.mPath + "rgba(200,200,200,1).rgba");
                        const toff = this.mMesh.texture.length - 1;
                        curNode.node.mData.textureOff.push(toff);
                    }
                    curNode.curTexSel = 0;
                }
                const face = tok.slice(1).map(p => {
                    const [a, b, c] = p.split("/");
                    const vi = parseInt(a, 10);
                    const vti = (b && b.length > 0) ? parseInt(b, 10) : 0;
                    const vni = (c && c.length > 0) ? parseInt(c, 10) : 0;
                    return { vi, vti, vni };
                });
                for (let i = 1; i + 1 < face.length; ++i) {
                    const i0 = addVertex(curNode, face[0]);
                    const i1 = addVertex(curNode, face[i]);
                    const i2 = addVertex(curNode, face[i + 1]);
                    curNode.idx.push(i0, i1, i2);
                }
            }
        }
        for (const [, bag] of nodes) {
            if (bag.pos.length == 0)
                continue;
            bag.node.mData.ci = new CMeshCreateInfo();
            const posBuf = new CMeshBuf(CVertexFormat.eIdentifier.Position);
            for (let i = 0; i < bag.pos.length; i += 3) {
                posBuf.bufF.Push(new CVec3(bag.pos[i + 0], bag.pos[i + 1], bag.pos[i + 2]));
            }
            bag.node.mData.ci.vertex.push(posBuf);
            const norBuf = new CMeshBuf(CVertexFormat.eIdentifier.Normal);
            for (let i = 0; i < bag.nor.length; i += 3) {
                norBuf.bufF.Push(new CVec3(bag.nor[i + 0], bag.nor[i + 1], bag.nor[i + 2]));
            }
            bag.node.mData.ci.vertex.push(norBuf);
            const uvBuf = new CMeshBuf(CVertexFormat.eIdentifier.UV);
            for (let i = 0; i < bag.uv.length; i += 2) {
                uvBuf.bufF.Push(new CVec2(bag.uv[i + 0], bag.uv[i + 1]));
            }
            for (const id of bag.idx)
                uvBuf.bufI.push(id);
            bag.node.mData.ci.vertex.push(uvBuf);
            const texOffBuf = new CMeshBuf(CVertexFormat.eIdentifier.TexOff);
            for (let i = 0; i < bag.texSelX.length; i++) {
                const x = bag.texSelX[i] >= 0 ? bag.texSelX[i] : -1;
                texOffBuf.bufF.Push(new CVec3(x, -1, -1));
            }
            bag.node.mData.ci.vertex.push(texOffBuf);
            for (const id of bag.idx)
                bag.node.mData.ci.index.push(id);
            CUtilRender.RebuildNormals(bag.node.mData.ci);
        }
    }
}
