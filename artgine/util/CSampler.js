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
    mStart = 0;
    mEnd = 0;
    constructor(_actionValue) {
        super(_actionValue);
    }
    Excute(_dataTarget = null, _run = "", _update = null) {
        if (_dataTarget == null)
            _dataTarget = this;
        if (CSamplerTimer.Update(_dataTarget, this.mCount, this.mDelay, this.mStart, this.mEnd, _run, _update) == false) {
            if (typeof this.mDefault != "undefined")
                return false;
            return null;
        }
        return this.mDefault;
    }
    IsEndReset(_dataTarget = null, _run = "") {
        if (_dataTarget == null)
            _dataTarget = this;
        return CSamplerTimer.IsEndReset(_dataTarget, _run);
    }
    static Update(_dataTarget, count = 0, delay = 0, start = 0, end = 0, _run = "", _update = null) {
        if (_dataTarget["mTemp"] == null)
            _dataTarget["mTemp"] = {};
        let offset = _update != null ? _update.Offset() : 0;
        let timer;
        if (_dataTarget["mTemp"]["mTimer" + _run] == null) {
            _dataTarget["mTemp"]["mTimer" + _run] = new CTimer();
            _dataTarget["mTemp"]["mCount" + _run] = 0;
            _dataTarget["mTemp"]["mTime" + _run] = 0;
            _dataTarget["mTemp"]["mDelay" + _run] = 0;
        }
        else if (_dataTarget["mTemp"]["mOffset" + _run] + 1 < offset) {
            _dataTarget["mTemp"]["mTimer" + _run].Delay();
            _dataTarget["mTemp"]["mCount" + _run] = 0;
            _dataTarget["mTemp"]["mTime" + _run] = 0;
            _dataTarget["mTemp"]["mDelay" + _run] = 0;
            _dataTarget["mTemp"]["mEnd" + _run] = false;
        }
        _dataTarget["mTemp"]["mOffset" + _run] = offset;
        timer = _dataTarget["mTemp"]["mTimer" + _run];
        let t = timer.Delay();
        _dataTarget["mTemp"]["mDelay" + _run] = _dataTarget["mTemp"]["mDelay" + _run] + t;
        _dataTarget["mTemp"]["mTime" + _run] = _dataTarget["mTemp"]["mTime" + _run] + t;
        if (delay != 0 && _dataTarget["mTemp"]["mDelay" + _run] < delay)
            return false;
        if (_dataTarget["mTemp"]["mTime" + _run] < start)
            return false;
        if (end != 0 && _dataTarget["mTemp"]["mTime" + _run] > end) {
            _dataTarget["mTemp"]["mEnd" + _run] = true;
            return false;
        }
        _dataTarget["mTemp"]["mDelay" + _run] = 0;
        _dataTarget["mTemp"]["mCount" + _run] = _dataTarget["mTemp"]["mCount" + _run] + 1;
        if (count != 0 && _dataTarget["mTemp"]["mCount" + _run] > count) {
            _dataTarget["mTemp"]["mEnd" + _run] = true;
            return false;
        }
        return true;
    }
    static IsEndReset(_dataTarget, _run = "") {
        if (_dataTarget["mTemp"] == null)
            return false;
        if (_dataTarget["mTemp"]["mEnd" + _run] == true) {
            _dataTarget["mTemp"]["mOffset" + _run] = 0;
            return true;
        }
        return false;
    }
}
