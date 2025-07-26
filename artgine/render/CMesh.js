import { CObject } from "../basic/CObject.js";
import { CTree } from "../basic/CTree.js";
import { CMat } from "../geometry/CMat.js";
export class CWeightMat {
    mat;
    target;
    constructor() {
        this.mat = new CMat();
        this.target = new Array();
    }
}
export class CMeshAniInfo {
    start = 0;
    end = 0;
}
export class CMeshSkin extends CObject {
    key = "";
    mat = new CMat();
}
var MeshBoneMat = 100;
export class CMesh extends CObject {
    vertexNormal;
    meshTree;
    material;
    texture;
    skin;
    aniMap;
    constructor() {
        super();
        this.vertexNormal = false;
        this.meshTree = new CTree();
        this.material = new Array();
        this.texture = new Array();
        this.aniMap = new Map();
        this.skin = new Array();
    }
    Icon() { return "bi bi-globe"; }
}
