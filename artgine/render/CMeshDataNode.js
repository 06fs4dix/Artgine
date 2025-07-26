import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CObject } from "../basic/CObject.js";
export class CKeyFrame extends CObject {
    key;
    value;
    constructor() {
        super();
        this.key = 0;
        this.value = new CVec4();
        this.value.w = 100000;
    }
}
export class CMeshDataNode extends CObject {
    ci;
    keyFramePos;
    keyFrameRot;
    keyFrameSca;
    textureOff;
    materialOff;
    pos;
    sca;
    rot;
    rev = false;
    skinKey;
    constructor() {
        super();
        this.ci = null;
        this.keyFramePos = new Array();
        this.keyFrameRot = new Array();
        this.keyFrameSca = new Array();
        this.textureOff = new Array();
        this.materialOff = new Array();
        this.pos = new CVec3();
        this.sca = new CVec3(1, 1, 1);
        this.rot = new CVec4();
        this.skinKey = new Array();
    }
    IsSkinKey(_key) {
        for (var each0 of this.skinKey) {
            if (each0 == _key)
                return true;
        }
        return false;
    }
    FindKeyFrame(_key, _keyFrameVec) {
        var off = _keyFrameVec.length;
        for (var i = 0; i < _keyFrameVec.length; ++i) {
            if (_key == _keyFrameVec[i].key)
                return _keyFrameVec[i];
            else if (_key < _keyFrameVec[i].key) {
                off = i;
                break;
            }
        }
        var keyframe = new CKeyFrame();
        keyframe.key = _key;
        _keyFrameVec.splice(off, 0, keyframe);
        return _keyFrameVec[off];
    }
    FindKeyFrame2(_type, _key) {
        var fv = null;
        if (_type == "S" || _type == "Lcl Scaling")
            fv = this.keyFrameSca;
        else if (_type == "R" || _type == "Lcl Rotation")
            fv = this.keyFrameRot;
        else
            fv = this.keyFramePos;
        var off = fv.length;
        for (var i = 0; i < fv.length; ++i) {
            if (_key == fv[i].key)
                return fv[i];
            else if (_key < fv[i].key) {
                off = i;
                break;
            }
        }
        var keyframe = new CKeyFrame();
        keyframe.key = _key;
        fv.splice(off, 0, keyframe);
        return fv[off];
    }
}
