import { CObject } from "../basic/CObject.js";
import { CTree } from "../basic/CTree.js";
import { CMat } from "../geometry/CMat.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CHash } from "../basic/CHash.js";
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
    aniInfo = new Array();
}
export class CMeshAttacher {
    bones = new Array();
    target;
    offsetPos = new CVec3();
    offsetRot = new CVec4(0, 0, 0, 1);
    offsetSca = new CVec3(1, 1, 1);
    mixPos = new CVec3(1, 1, 1);
    mixRot = 1;
    mixSca = new CVec3(1, 1, 1);
    aniInfo = new Array();
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
    hash = null;
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
    HashBoneStruct() {
        if (this.hash != null)
            return this.hash;
        this.hash = CHash.HashCode(this.HashBoneStructNode(this.meshTree));
        return this.hash;
    }
    HashBoneStructNode(_node) {
        if (_node == null)
            return "";
        let isBone = _node.mData != null && _node.mData.ci == null;
        let childArr = [];
        let child = _node.mChild;
        while (child != null) {
            childArr.push(child);
            child = child.mColleague;
        }
        childArr.sort((a, b) => (a.mKey < b.mKey ? -1 : (a.mKey > b.mKey ? 1 : 0)));
        let childStr = "";
        for (let c of childArr) {
            childStr += this.HashBoneStructNode(c);
        }
        if (!isBone)
            return childStr;
        let pos = _node.mData.pos;
        let posStr = pos.x.toFixed(2) + "," + pos.y.toFixed(2) + "," + pos.z.toFixed(2);
        return _node.mKey + ":" + posStr + "(" + childStr + ")";
    }
}
