import { CClass } from "../basic/CClass.js";
import { CObject } from "../basic/CObject.js";
import { CMath } from "../geometry/CMath.js";
import { CVec1 } from "../geometry/CVec1.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CTimer } from "../system/CTimer.js";
export class CSampler extends CObject {
    mDefault = null;
    constructor(_default = null) {
        super();
        this.mDefault = _default;
    }
    Execute(_target = null) {
        return this.mDefault;
    }
}
export class CSampMinMax extends CSampler {
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
    Execute(_target = null) {
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
export class CSampList extends CSampler {
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
    Execute() {
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
export class CSampCountDown extends CSampler {
    mTimes = new Array();
    mList = new Array();
    mTimer = new CTimer();
    mTime = 0;
    constructor(_times, _list) {
        super();
        this.mTimes = _times;
        this.mList = _list;
    }
    Execute() {
        if (this.mTimes == null || this.mList == null)
            return null;
        this.mTime += this.mTimer.Delay();
        for (let i = 0; i < this.mTimes.length; ++i) {
            if (this.mTime <= this.mTimes[i]) {
                return this.mList[i];
            }
        }
        return null;
    }
}
export class CSampDir extends CSampler {
    mDir;
    mPitch;
    mRoll;
    constructor(_dir, _pitch, _roll) {
        super();
        this.mDir = _dir;
        this.mPitch = _pitch;
        this.mRoll = _roll;
    }
    Execute() {
        var pran = this.mPitch * 2 * Math.random() - this.mPitch;
        var rran = this.mRoll * 2 * Math.random() - this.mRoll;
        var mat = CMath.MatRotation(new CVec3(pran, rran, 0));
        return CMath.V3MulMatNormal(this.mDir, mat);
    }
}
