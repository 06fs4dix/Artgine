import { CMesh } from "../../render/CMesh.js";
import { CParser } from "./CParser.js";
export default class CParserGLTF extends CParser {
    mMesh = new CMesh();
    mInch = false;
    mTexMap = new Map();
    constructor(_inch) {
        super();
        this.mInch = _inch;
    }
    GetResult() {
        return this.mMesh;
    }
    async Load(_fileName) {
        return null;
    }
    async CreateMesh(_root, gltfDir) {
    }
    CreateMeshDataNode(_root, _node, _tree) {
        return null;
    }
    async ParseCJSON(_fileName, _json) {
    }
}
import CParserGLTF_imple from "../../util_imple/parser/CParserGLTF.js";
CParserGLTF_imple();
