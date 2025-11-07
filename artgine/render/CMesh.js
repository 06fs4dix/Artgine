import { CObject } from "../basic/CObject.js";
import { CTree } from "../basic/CTree.js";
import { CMat } from "../geometry/CMat.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
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
export class CMeshIK {
    bones = new Array();
    target;
    pole;
    mix = 1;
}
export class CMeshAttacher {
    bones = new Array();
    target;
    offsetPos = new CVec3();
    offsetRot = new CVec4(0, 0, 0, 1);
    offsetSca = new CVec3(1, 1, 1);
    mixPos = 1;
    mixRot = 1;
    mixSca = 1;
}
var MeshBoneMat = 100;
export class CMesh extends CObject {
    vertexNormal;
    clamp = true;
    meshTree;
    texture;
    skin;
    aniMap;
    ik;
    attacher;
    constructor() {
        super();
        this.vertexNormal = false;
        this.meshTree = new CTree();
        this.texture = new Array();
        this.aniMap = new Map();
        this.skin = new Array();
        this.ik = new Map;
        this.attacher = new Map;
    }
    Icon() { return "bi bi-globe"; }
}
