import { CClass } from "../basic/CClass.js";
import { CObject } from "../basic/CObject.js";
import { CMath } from "./CMath.js";
import { CVec1 } from "./CVec1.js";
import { CVec3 } from "./CVec3.js";
export class CSampler extends CObject {
    mDefault = null;
    constructor(_default = null) {
        super();
        this.mDefault = _default;
    }
    Excute(_target = null) {
        return this.mDefault;
    }
}
export class CSamplerMinMax extends CSampler {
    mLinear;
    mMin;
    mMax;
    constructor(_min, _max, _linear = false) {
        super();
        if (typeof _min == "number" && typeof _max == "number") {
            this.mMin = new CVec1(_min);
            this.mMax = new CVec1(_max);
        }
        else {
            this.mMin = _min;
            this.mMax = _max;
        }
        this.mLinear = _linear;
    }
    Excute(_target = null) {
        if (_target == null || typeof _target == "number")
            _target = CClass.New(this.mMin);
        let ran = Math.random();
        for (let i = 0; i < _target.mF32A.length; ++i) {
            if (this.mLinear == false)
                ran = Math.random();
            _target.mF32A[i] = CMath.FloatInterpolate(this.mMin.mF32A[i], this.mMax.mF32A[i], ran);
        }
        if (_target instanceof CVec1)
            return _target.mF32A[0];
        return _target;
    }
}
export class CSamplerList extends CSampler {
    mCount = 0;
    mRate = new Array();
    mList = new Array();
    constructor(_list, _rate = null) {
        super();
        if (_list == null)
            return;
        if (_rate == null) {
            _rate = new Array();
            for (var each0 of _list) {
                _rate.push(1);
            }
        }
        else if (_list.length > _rate.length) {
            for (var i = 0; i < _list.length - _rate.length; ++i) {
                _rate.push(1);
            }
        }
        this.mList = _list;
        this.mRate = _rate;
        for (let each0 of this.mRate) {
            this.mCount += each0;
        }
    }
    Excute() {
        if (this.mList == null || this.mRate.length === 0)
            return null;
        let ran = Math.random();
        let accum = 0;
        for (let i = 0; i < this.mRate.length; ++i) {
            accum += this.mRate[i] / this.mCount;
            if (ran <= accum) {
                return this.mList[i];
            }
        }
        return this.mList[this.mList.length - 1];
    }
}
export class CSamplerDir extends CSampler {
    mDir;
    mPitch;
    mRoll;
    constructor(_dir, _pitch, _roll) {
        super();
        this.mDir = _dir;
        this.mPitch = _pitch;
        this.mRoll = _roll;
    }
    Excute() {
        var pran = this.mPitch * 2 * Math.random() - this.mPitch;
        var rran = this.mRoll * 2 * Math.random() - this.mRoll;
        var mat = CMath.MatRotation(new CVec3(pran, rran, 0));
        return CMath.V3MulMatNormal(this.mDir, mat);
    }
}
export class CSamplerTimer extends CSampler {
    mDelay = 0;
    mCount = 1;
    mBegin = 0;
    mEnd = 0;
    mTimeAll = 0;
    mTimeDelay = 0;
    mExcute = 0;
    mUpdate = 0;
    constructor(_actionValue) {
        super(_actionValue);
    }
    Excute(_delay, _update = 1) {
        if (_update - 1 != this.mUpdate) {
            this.mTimeAll = 0;
            this.mExcute = 0;
            this.mTimeDelay = 0;
        }
        this.mUpdate = _update;
        if (this.mTimeAll < this.mBegin || (this.mCount != 0 && this.mCount <= this.mExcute) ||
            (this.mEnd != 0 && this.mEnd < this.mTimeAll) || (0 < this.mTimeDelay)) {
            this.mTimeAll += _delay;
            this.mTimeDelay -= _delay;
            if (typeof this.mDefault != "undefined")
                return false;
            return null;
        }
        this.mTimeAll += _delay;
        this.mTimeDelay = this.mDelay;
        this.mExcute++;
        return this.mDefault;
    }
}
