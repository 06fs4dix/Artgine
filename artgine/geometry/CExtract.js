import { CObject } from "../basic/CObject.js";
import { CMath } from "./CMath.js";
import { CVec3 } from "./CVec3.js";
import { CVec4 } from "./CVec4.js";
export class CExtract extends CObject {
    mValue = null;
    constructor(_v0 = null) {
        super();
        if (typeof _v0 == "number")
            this.mValue = [_v0];
        else if (_v0 instanceof CVec3) {
            this.mValue = [_v0.x, _v0.y, _v0.z];
        }
        else
            this.mValue = _v0;
    }
    V1() {
        if (this.mValue != null)
            return this.mValue[0];
        return 0;
    }
    V3() {
        if (this.mValue != null && this.mValue.length >= 3)
            return new CVec3(this.mValue[0], this.mValue[1], this.mValue[2]);
        return new CVec3();
    }
    V4() {
        if (this.mValue != null && this.mValue.length >= 4)
            return new CVec4(this.mValue[0], this.mValue[1], this.mValue[2], this.mValue[3]);
        return new CVec4(0, 0, 0, 0);
    }
    Obj() { return null; }
}
export class CExtractMinMax extends CExtract {
    mLinear;
    constructor(_min, _max, _linear = false) {
        var arr = null;
        if (typeof _min == "number") {
            arr = [_min, _max];
        }
        else if (_min instanceof CVec3) {
            arr = [_min.x, _min.y, _min.z, _max.x, _max.y, _max.z];
        }
        else if (_min instanceof CVec4) {
            arr = [_min.x, _min.y, _min.z, _min.w, _max.x, _max.y, _max.z, _max.w];
        }
        super(arr);
        this.mLinear = _linear;
    }
    V1() {
        let ran = Math.random();
        if (this.mValue != null && this.mValue.length == 2)
            return CMath.FloatInterpolate(this.mValue[0], this.mValue[1], ran);
        return super.V1();
    }
    V3() {
        if (this.mValue != null && this.mValue.length == 6) {
            if (this.mLinear) {
                let ran = Math.random();
                return new CVec3(CMath.FloatInterpolate(this.mValue[0], this.mValue[3], ran), CMath.FloatInterpolate(this.mValue[1], this.mValue[4], ran), CMath.FloatInterpolate(this.mValue[2], this.mValue[5], ran));
            }
            else {
                return new CVec3(CMath.FloatInterpolate(this.mValue[0], this.mValue[3], Math.random()), CMath.FloatInterpolate(this.mValue[1], this.mValue[4], Math.random()), CMath.FloatInterpolate(this.mValue[2], this.mValue[5], Math.random()));
            }
        }
        return super.V3();
    }
    V4() {
        if (this.mValue != null && this.mValue.length == 6) {
            if (this.mLinear) {
                let ran = Math.random();
                return new CVec4(CMath.FloatInterpolate(this.mValue[0], this.mValue[4], ran), CMath.FloatInterpolate(this.mValue[1], this.mValue[5], ran), CMath.FloatInterpolate(this.mValue[2], this.mValue[6], ran), CMath.FloatInterpolate(this.mValue[3], this.mValue[7], ran));
            }
            else {
                return new CVec4(CMath.FloatInterpolate(this.mValue[0], this.mValue[4], Math.random()), CMath.FloatInterpolate(this.mValue[1], this.mValue[5], Math.random()), CMath.FloatInterpolate(this.mValue[2], this.mValue[6], Math.random()), CMath.FloatInterpolate(this.mValue[3], this.mValue[7], Math.random()));
            }
        }
        return super.V4();
    }
}
export class CExtractArray extends CExtract {
    constructor(_val = null) {
        super(_val);
    }
    V1() {
        let ran = Math.random() * this.mValue.length;
        return this.mValue[Math.trunc(ran)];
    }
}
export class CExtractSample extends CExtract {
    m_count = 0;
    m_rate = new Array();
    constructor(_val, _rate = null) {
        super(_val);
        if (_val == null)
            return;
        if (_rate == null) {
            _rate = new Array();
            for (var each0 of _val) {
                _rate.push(1);
            }
        }
        else if (_val.length > _rate.length) {
            for (var i = 0; i < _val.length - _rate.length; ++i) {
                _rate.push(1);
            }
        }
        this.m_rate = _rate;
        for (let each0 of this.m_rate) {
            this.m_count += each0;
        }
    }
    Obj() {
        if (this.mValue == null || this.m_rate.length === 0)
            return null;
        let ran = Math.random();
        let accum = 0;
        for (let i = 0; i < this.m_rate.length; ++i) {
            accum += this.m_rate[i] / this.m_count;
            if (ran <= accum) {
                return this.mValue[i];
            }
        }
        return this.mValue[this.mValue.length - 1];
    }
}
export class CExtractDir extends CExtract {
    m_dir;
    m_pitch;
    m_roll;
    constructor(_dir, _pitch, _roll) {
        super();
        this.m_dir = _dir;
        this.m_pitch = _pitch;
        this.m_roll = _roll;
    }
    V3() {
        var pran = this.m_pitch * 2 * Math.random() - this.m_pitch;
        var rran = this.m_roll * 2 * Math.random() - this.m_roll;
        var mat = CMath.MatRotation(new CVec3(pran, rran, 0));
        return CMath.V3MulMatNormal(this.m_dir, mat);
    }
}
