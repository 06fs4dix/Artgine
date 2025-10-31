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
    keyFrameCA;
    keyFrameTex;
    textureOff;
    pos;
    sca;
    rot;
    CA;
    ;
    skinKey;
    constructor() {
        super();
        this.ci = null;
        this.keyFramePos = new Array();
        this.keyFrameRot = new Array();
        this.keyFrameSca = new Array();
        this.keyFrameCA = new Array();
        this.keyFrameTex = new Array();
        this.textureOff = new Array();
        this.pos = new CVec3();
        this.sca = new CVec3(1, 1, 1);
        this.rot = new CVec4();
        this.CA = new CVec4(1, 1, 1, 1);
        this.skinKey = new Array();
    }
    IsSkinKey(_key) {
        for (var each0 of this.skinKey) {
            if (each0 == _key)
                return true;
        }
        return false;
    }
    FindKeyFrame(_type, _key) {
        var fv = null;
        if (_type == "S" || _type == "Lcl Scaling")
            fv = this.keyFrameSca;
        else if (_type == "R" || _type == "Lcl Rotation")
            fv = this.keyFrameRot;
        else if (_type === "DiffuseColor" || _type === "BaseColor" ||
            _type === "Base Color" || _type === "Visibility" || _type === "Opacity")
            fv = this.keyFrameCA;
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
        if (fv == this.keyFrameCA) {
            keyframe.value.x = 1;
            keyframe.value.y = 1;
            keyframe.value.z = 1;
            keyframe.value.w = 1;
        }
        keyframe.key = _key;
        fv.splice(off, 0, keyframe);
        return fv[off];
    }
}
