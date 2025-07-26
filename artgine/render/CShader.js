import { CObject } from "../basic/CObject.js";
var g_bufMap = new Map();
export class CVertexFormat extends CObject {
    static eIdentifier = {
        Vertex: 0,
        Position: 0,
        UV: 1,
        Normal: 3,
        Weight: 4,
        WeightIndex: 5,
        Color: 6,
        TexOff: 7,
        Tangent: 8,
        Binormal: 9,
        Instance: 10,
        Shadow: 11,
        VertexIndex: 20,
        UVIndex: 21,
        OutPosition: 30,
        OutColor: 31,
        Count: 12,
        Null: 13,
    };
    static eDataType = {
        Byte: 0,
        Float: 1,
        Int: 2,
        Count: 3,
        Null: 4,
    };
    text;
    eachSize;
    eachCount;
    dataType;
    identifier;
    identifierCount;
    location;
    constructor() {
        super();
        this.text = null;
        this.eachSize = 0;
        this.eachCount = 0;
        this.dataType = CVertexFormat.eDataType.Float;
        this.identifier = CVertexFormat.eIdentifier.Null;
        this.identifierCount = 0;
        this.location = -1;
    }
}
export class CShader extends CObject {
    mInsCount = 1;
    mVS = null;
    mPS = null;
    mKey;
    mProgram;
    mTag;
    mTagMain;
    mVF;
    mUniform;
    mDefault;
    mComplie = false;
    constructor() {
        super();
        this.mKey = "";
        this.mVF = new Array();
        this.mUniform = new Map();
        this.mDefault = new Array();
        this.mTag = new Set();
        this.mTagMain = new Set();
    }
    IsShould(_member, _type) {
        if (_member == "m_complie" || _member == "m_program")
            return false;
        return super.IsShould(_member, _type);
    }
    Icon() { return "bi bi-filetype-sh"; }
    PushProgram(_program) {
        this.mProgram = _program;
    }
    PushTag(_tag) {
        for (var each0 of _tag) {
            if (each0 != "")
                this.mTag.add(each0);
        }
    }
    PushTagMain(_tag) {
        for (var each0 of _tag) {
            if (each0 != "")
                this.mTagMain.add(each0);
        }
    }
    PushUniform(_uni) {
        this.mUniform.set(_uni.name, _uni);
    }
    GetDefault(_key) {
        for (var i = 0; i < this.mDefault.length; ++i) {
            if (this.mDefault[i].mKey == _key) {
                return this.mDefault[i];
            }
        }
        return null;
    }
    GetVFAllSize() {
        let size = 0;
        for (let vf of this.mVF) {
            size += vf.eachCount * 4;
        }
        return size;
    }
}
export class CShaderList {
    mKey = "";
    mShader = new Array();
    PushShader(_shader) {
        this.mShader.push(_shader);
    }
    GetShader(_tag) {
        if (_tag instanceof Array || _tag instanceof Set) {
            var maxMainTagCount = -1;
            var maxCount = -1000;
            var maxOff = 0;
            var minFCount = 1000;
            var tagSet = Array.isArray(_tag) ? new Set(_tag) : _tag;
            for (var i = 0; i < this.mShader.length; ++i) {
                var shader = this.mShader[i];
                var allMainTagsMatch = true;
                var mainTagCount = 0;
                for (let mainTag of shader.mTagMain) {
                    if (!tagSet.has(mainTag)) {
                        allMainTagsMatch = false;
                        break;
                    }
                    mainTagCount++;
                }
                if (!allMainTagsMatch)
                    continue;
                var scount = 0;
                var fcount = 0;
                for (var tag of shader.mTag) {
                    if (tagSet.has(tag))
                        scount++;
                    else
                        fcount++;
                }
                if (mainTagCount > maxMainTagCount ||
                    (mainTagCount == maxMainTagCount && scount > maxCount) ||
                    (mainTagCount == maxMainTagCount && scount == maxCount && fcount < minFCount)) {
                    maxMainTagCount = mainTagCount;
                    maxCount = scount;
                    minFCount = fcount;
                    maxOff = i;
                }
            }
            return this.mShader[maxOff];
        }
        else {
            for (var i = 0; i < this.mShader.length; ++i) {
                if (this.mShader[i].mKey == _tag)
                    return this.mShader[i];
            }
        }
        return null;
    }
}
