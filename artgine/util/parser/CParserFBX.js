import { CParser } from "./CParser.js";
import { CMesh } from "../../render/CMesh.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
export class FBXAnimCurveNode {
    tree;
    type;
    constructor(_tree, _type) {
        this.tree = _tree;
        this.type = _type;
    }
}
export class FBXLine {
    endOff = 0;
    properties = new Array();
    object = false;
    name = "";
    constructor() {
    }
}
;
export class FBXData {
    type = 0;
    value = null;
    constructor(_type = 0, _value = null) {
        this.type = _type;
        this.value = _value;
    }
}
export class CFBXSearch {
    mFBX;
    constructor(_fbx) {
        this.mFBX = _fbx;
    }
    SPV(_key, _off = 0) {
        for (var each1 of this.mFBX) {
            if (each1[_off] == _key) {
                if (each1[3] == "A" || each1[3] == "N" || each1[3] == "A+")
                    return new CVec3(each1[4], each1[5], each1[6]);
                else if (each1[2] == "A" || each1[2] == "N" || each1[2] == "A+" || each1[2] == "")
                    return new CVec3(each1[3], each1[4], each1[5]);
                else
                    return new CVec3(each1[4], each1[5], each1[6]);
            }
        }
        return null;
    }
    SPI(_key, _tagOff) {
        for (var each1 of this.mFBX) {
            if (each1[_tagOff] == _key) {
                return each1[each1.length - 1];
            }
        }
        return null;
    }
    S(_key, _off = 0) {
        var kobj = null;
        if (_key instanceof Array) {
            for (var each0 of _key) {
                if (this.mFBX[each0] != null)
                    kobj = this.mFBX[each0];
            }
        }
        else
            kobj = this.mFBX[_key];
        if (kobj == null)
            return null;
        if (_off == null)
            return new CFBXSearch(kobj);
        return new CFBXSearch(kobj[_off]);
    }
    SAA(_key) {
        var kobj = null;
        kobj = this.mFBX[_key];
        if (kobj == null)
            return null;
        var arr = kobj[0];
        return arr;
    }
}
export class CFBXConnect {
    mFBX;
    mKey;
    mType;
    mExtra = new Array();
    constructor(_fbx, _key, _type) {
        this.mFBX = _fbx;
        this.mKey = _key;
        this.mType = _type;
    }
}
export class CParserFBX extends CParser {
    mPath;
    mBin = true;
    mFBX = {};
    mVersion = 0;
    mLine = new FBXLine();
    mPstFbx = null;
    mMesh = new CMesh();
    mConnectMap = new Map();
    mMaterialMap = new Map();
    mUpAxis = 2;
    mAniCuvMap = new Map();
    mDeformerMap = new Map();
    mGeometryMap = new Map();
    constructor() {
        super();
    }
    GetResult() { return this.mMesh; }
    PosScaAxis(_vec) {
        var dummy = _vec.y;
        _vec.y = _vec.z;
        _vec.z = dummy;
        return _vec;
    }
    RotAxis(_vec) {
        _vec.x = -_vec.x;
        let dummy = _vec.y;
        _vec.y = -_vec.z;
        _vec.z = -dummy;
        _vec.x = CMath.DegreeToRadian(_vec.x);
        _vec.y = CMath.DegreeToRadian(_vec.y);
        _vec.z = CMath.DegreeToRadian(_vec.z);
        return _vec;
    }
    TextureId(fbxs, _tree, off) {
    }
    Geometry(_fbx, _tree, _prop) {
    }
    async Load(pa_fileName) {
    }
    async Rebuild() {
    }
    FD(_object) {
    }
    TypeChk(_type, _fbx) {
        if (_type == "Model" || _type == "Texture" || _type == "Geometry" || _type == "Material" ||
            _type == "AnimationCurve" || _type == "AnimationCurveNode" || _type == "Deformer") {
            var con = this.mConnectMap.get(_fbx.properties[0]);
            if (con == null) {
                con = new CFBXConnect(_fbx, _fbx.properties[0], _type);
                this.mConnectMap.set(_fbx.properties[0], con);
            }
            else {
                con.mExtra.push(_fbx);
            }
        }
    }
    async ReadObject(_end) {
    }
    StrChk(s, cut) {
        if (s == true)
            return cut;
        else if (cut == "T")
            return true;
        else if (cut == "F")
            return false;
        else if (cut == "U")
            return 85;
        else if (cut == "a")
            return 97;
        else if (cut == "n")
            return 110;
        else if (cut == "s")
            return 115;
        else if (cut == "r")
            return 114;
        else if (cut == "p")
            return 112;
        return Number(cut);
    }
    ReadStrFBXLine() {
        var str = "";
        while (this.mBuffer.length > this.mPstOff) {
            var ch = String.fromCharCode(this.mBuffer[this.mPstOff]);
            this.mPstOff += 1;
            if (ch == '\n') {
                let ch2014 = String.fromCharCode(this.mBuffer[this.mPstOff - 2]);
                let ch2010 = String.fromCharCode(this.mBuffer[this.mPstOff + 1]);
                if (ch2014 == ',' || ch2010 == ' ') {
                    continue;
                }
                else
                    break;
            }
            str += ch;
        }
        return str;
    }
    ReadLine() {
    }
    ReadData() {
        return null;
    }
}
import CParserFBX_imple from "../../util_imple/parser/CParserFBX.js";
CParserFBX_imple();
