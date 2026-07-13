import { CMesh } from "../../render/CMesh.js";
import { CParser } from "./CParser.js";
export class CParserOBJ extends CParser {
    mMesh = new CMesh();
    mPath = "";
    mComputeNormal;
    constructor(_computeNormal = true) {
        super();
        this.mComputeNormal = _computeNormal;
    }
    GetResult() { return this.mMesh; }
    async Load(pa_fileName) {
    }
}
import CParserOBJ_imple from "../../util_imple/parser/CParserOBJ.js";
CParserOBJ_imple();
