import { CObject } from "../basic/CObject.js";
import { CTimer } from "../system/CTimer.js";
export class CSchedule extends CObject {
    mDelay;
    mCount;
    mStart;
    mEnd;
    constructor(_delay = 0, _count = 1, _start = 0, _End = 0) {
        super();
        this.mDelay = _delay;
        this.mCount = _count;
        this.mStart = _start;
        this.mEnd = _End;
    }
    Execute(_tempTarget = null, _run = "", _update = null) {
        if (_tempTarget == null)
            _tempTarget = this;
        return CSchedule.Update(_tempTarget, _run, this.mCount, this.mDelay, this.mStart, this.mEnd, _update);
    }
    IsEndReset(_tempTarget = null, _run = "") {
        if (_tempTarget == null)
            _tempTarget = this;
        return CSchedule.IsEndReset(_tempTarget, _run);
    }
    static Update(_tempTarget, _tempKey = "", count = 0, delay = 0, start = 0, end = 0, _update = null) {
        if (_tempTarget["mTemp"] == null)
            _tempTarget["mTemp"] = {};
        let offset = _update != null ? _update.Offset() : 0;
        let timer;
        if (_tempTarget["mTemp"]["mTimer" + _tempKey] == null) {
            _tempTarget["mTemp"]["mTimer" + _tempKey] = new CTimer();
            _tempTarget["mTemp"]["mCount" + _tempKey] = 0;
            _tempTarget["mTemp"]["mTime" + _tempKey] = 0;
            _tempTarget["mTemp"]["mDelay" + _tempKey] = 0;
        }
        else if (_tempTarget["mTemp"]["mOffset" + _tempKey] + 1 < offset) {
            _tempTarget["mTemp"]["mTimer" + _tempKey].Delay();
            _tempTarget["mTemp"]["mCount" + _tempKey] = 0;
            _tempTarget["mTemp"]["mTime" + _tempKey] = 0;
            _tempTarget["mTemp"]["mDelay" + _tempKey] = 0;
            _tempTarget["mTemp"]["mEnd" + _tempKey] = false;
        }
        _tempTarget["mTemp"]["mOffset" + _tempKey] = offset;
        timer = _tempTarget["mTemp"]["mTimer" + _tempKey];
        let t = timer.Delay();
        _tempTarget["mTemp"]["mDelay" + _tempKey] = _tempTarget["mTemp"]["mDelay" + _tempKey] + t;
        _tempTarget["mTemp"]["mTime" + _tempKey] = _tempTarget["mTemp"]["mTime" + _tempKey] + t;
        if (delay != 0 && _tempTarget["mTemp"]["mDelay" + _tempKey] < delay)
            return false;
        if (_tempTarget["mTemp"]["mTime" + _tempKey] < start)
            return false;
        if (end != 0 && _tempTarget["mTemp"]["mTime" + _tempKey] > end) {
            _tempTarget["mTemp"]["mEnd" + _tempKey] = true;
            return false;
        }
        _tempTarget["mTemp"]["mDelay" + _tempKey] = 0;
        _tempTarget["mTemp"]["mCount" + _tempKey] = _tempTarget["mTemp"]["mCount" + _tempKey] + 1;
        if (count != 0 && _tempTarget["mTemp"]["mCount" + _tempKey] > count) {
            _tempTarget["mTemp"]["mEnd" + _tempKey] = true;
            return false;
        }
        return true;
    }
    static IsEndReset(_tempTarget, _run = "") {
        if (_tempTarget["mTemp"] == null)
            return false;
        if (_tempTarget["mTemp"]["mEnd" + _run] == true) {
            _tempTarget["mTemp"]["mOffset" + _run] = 0;
            return true;
        }
        return false;
    }
}
