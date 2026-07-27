import { CObject } from "../basic/CObject.js";
import { CLZ4 } from "../basic/LZ.js";
import { CBound } from "../geometry/CBound.js";
import { CFloat32Mgr } from "../geometry/CFloat32Mgr.js";
import { CVertexFormat } from "./CShader.js";
export class CUVChannel {
    uvIndex = new Array();
    uv = new CFloat32Mgr();
}
export class CMeshBuf extends CObject {
    constructor(_type) {
        super();
        this.vfType = _type;
    }
    bufF = new CFloat32Mgr();
    bufI = new Array();
    vfType = CVertexFormat.eIdentifier.Null;
}
export class CMeshCreateInfo extends CObject {
    name;
    vertexCount;
    indexCount;
    vertex;
    bound;
    constructor() {
        super();
        this.name = "";
        this.vertexCount = 0;
        this.indexCount = 0;
        this.vertex = new Array();
        this.bound = new CBound();
    }
    GetVFType(_type) {
        var rVal = new Array();
        for (var each0 of this.vertex) {
            if (each0.vfType == _type)
                rVal.push(each0);
        }
        return rVal;
    }
    RemoveVFType(_type) {
        for (var i = 0; i < this.vertex.length; ++i) {
            if (this.vertex[i].vfType == _type) {
                this.vertex.splice(i, 1);
                i--;
            }
        }
    }
    Create(_type) {
        var buf = new CMeshBuf(_type);
        this.vertex.push(buf);
        return buf;
    }
    Compress(_level = 6) {
        let totalBytes = 0;
        for (const buf of this.vertex)
            totalBytes += 4 + 4 + buf.bufF.mSize * 4;
        const raw = new Uint8Array(totalBytes);
        const dv = new DataView(raw.buffer);
        let off = 0;
        for (const buf of this.vertex) {
            dv.setInt32(off, buf.vfType, true);
            off += 4;
            dv.setInt32(off, buf.bufF.mSize, true);
            off += 4;
            const fa = buf.bufF.GetArray();
            for (let i = 0; i < buf.bufF.mSize; i++) {
                dv.setFloat32(off, fa[i], true);
                off += 4;
            }
        }
        const lz4 = new CLZ4();
        const compressed = lz4.compress(raw, _level);
        this.vertex = [];
        const compBuf = this.Create(CVertexFormat.eIdentifier.Compress);
        for (let i = 0; i < compressed.length; i++)
            compBuf.bufI.push(compressed[i]);
    }
}
