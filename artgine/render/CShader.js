import { CObject } from "../basic/CObject.js";
var g_bufMap = new Map();
export class CVertexFormat extends CObject {
    static eIdentifier = {
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
        Index: 12,
        Compress: 13,
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
    mVP = null;
    mVS = null;
    mPS = null;
    mBuildFun = null;
    mVSFun = null;
    mPSFun = null;
    mBranchUse = null;
    mFunction = null;
    mKey;
    mProgram;
    mTag;
    mTagMain;
    mVF;
    mUniform;
    mDefault;
    mComplie = 0;
    mUniCPU = null;
    mUniRing = null;
    mUniSize = -1;
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
        if (_member == "m_complie" || _member == "m_program" || _member == "mUniCPU"
            || _member == "mUniRing" || _member == "mUniSize")
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
export class CShaderList extends CObject {
    mKey = "";
    mShader = new Array();
    mShaderMap = new Map();
    mBase = null;
    mMakeFun = null;
    PushShader(_shader) {
        this.mShader.push(_shader);
        this.mShaderMap.set(_shader.mKey, _shader);
    }
    GetShader(_tag) {
        if (_tag instanceof Array || _tag instanceof Set) {
            if (this.mBase != null)
                return this.GetShaderLazy(Array.isArray(_tag) ? new Set(_tag) : _tag);
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
            let sh = this.mShaderMap.get(_tag);
            if (sh == null && this.mBase != null && this.mMakeFun != null)
                sh = this.KeyToShader(_tag);
            return sh;
        }
        return null;
    }
    GetShaderLazy(_tagSet) {
        var maxMainTagCount = -1;
        var maxCount = -1000;
        var minFCount = 1000;
        var bestOff = -1;
        var bestSel = null;
        var bestKey = "";
        for (var i = 0; i < this.mBase.length; ++i) {
            var base = this.mBase[i];
            var allMainTagsMatch = true;
            var mainTagCount = 0;
            for (let mainTag of base.tagMain) {
                if (!_tagSet.has(mainTag)) {
                    allMainTagsMatch = false;
                    break;
                }
                mainTagCount++;
            }
            if (!allMainTagsMatch)
                continue;
            var scount = 0;
            var fcount = 0;
            for (var tag of base.tag) {
                if (_tagSet.has(tag))
                    scount++;
                else
                    fcount++;
            }
            var sel = new Array();
            for (var br of base.branch) {
                if (_tagSet.has(br.mTag)) {
                    sel.push(br);
                    scount++;
                }
            }
            if (mainTagCount > maxMainTagCount ||
                (mainTagCount == maxMainTagCount && scount > maxCount) ||
                (mainTagCount == maxMainTagCount && scount == maxCount && fcount < minFCount)) {
                maxMainTagCount = mainTagCount;
                maxCount = scount;
                minFCount = fcount;
                bestOff = i;
                bestSel = sel;
                bestKey = base.key;
                for (var br of sel)
                    bestKey += br.mKeyword;
            }
        }
        if (bestOff == -1)
            return this.mShader[0];
        var sh = this.mShaderMap.get(bestKey);
        if (sh != null)
            return sh;
        sh = this.mMakeFun(bestOff, bestSel);
        if (sh == null)
            return this.mShader[0];
        return sh;
    }
    KeyToShader(_key) {
        for (var i = 0; i < this.mBase.length; ++i) {
            let base = this.mBase[i];
            if (_key.indexOf(base.key) != 0)
                continue;
            let sel = new Array();
            if (this.KeyMatch(base.branch, 0, _key, base.key.length, sel) == false)
                continue;
            if (sel.length == 0)
                continue;
            return this.mMakeFun(i, sel);
        }
        return null;
    }
    KeyMatch(_branch, _off, _key, _pos, _sel) {
        if (_pos == _key.length)
            return true;
        for (var i = _off; i < _branch.length; ++i) {
            let kw = _branch[i].mKeyword;
            if (kw == null || kw == "")
                continue;
            if (_key.startsWith(kw, _pos) == false)
                continue;
            _sel.push(_branch[i]);
            if (this.KeyMatch(_branch, i + 1, _key, _pos + kw.length, _sel))
                return true;
            _sel.pop();
        }
        return false;
    }
    MaterializeAll() {
        if (this.mBase == null || this.mMakeFun == null)
            return;
        for (let i = 0; i < this.mBase.length; ++i) {
            let branch = this.mBase[i].branch;
            let Combine = (_start, _path) => {
                if (_path.length > 0)
                    this.mMakeFun(i, _path);
                for (let j = _start; j < branch.length; ++j) {
                    _path.push(branch[j]);
                    Combine(j + 1, [..._path]);
                    _path.pop();
                }
            };
            Combine(0, []);
        }
    }
}
