import { CObject } from "../basic/CObject.js";
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
    index = new Array();
    constructor() {
        super();
        this.name = "";
        this.vertexCount = 0;
        this.indexCount = 0;
        this.vertex = new Array();
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
}
