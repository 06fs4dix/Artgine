import { CObject } from "../../basic/CObject.js";
export class CLOD extends CObject {
    mRes;
    mAmount;
    mDistance;
    mHysteresis;
    mPaintTag = new Array();
    mPaintShaderAttr = new Array();
    mWind = -1;
    mSubject = null;
    IsShould(_member, _type) {
        if (_member == "mSubject")
            return false;
        return super.IsShould(_member, _type);
    }
    constructor(_res = null, _amount = 1, _dist = 0, _hysteresis = 0, _paintTag = [], _paintShaderAttr = [], _wind = -1, _subject = null) {
        super();
        this.mRes = _res;
        this.mAmount = _amount;
        this.mDistance = _dist;
        this.mHysteresis = _hysteresis;
        this.mPaintTag = _paintTag;
        this.mPaintShaderAttr = _paintShaderAttr;
        this.mWind = _wind;
        this.mSubject = _subject;
    }
    static Select(_arr, _dist, _cur) {
        for (let i = _arr.length - 1; i >= 0; i--) {
            let edge = _arr[i].mDistance;
            if (i <= _cur) {
                let hys = 0;
                for (let j = i; j >= 0 && _arr[j].mDistance == edge; j--)
                    hys = Math.max(hys, _arr[j].mHysteresis);
                edge = Math.max(0, edge - hys);
            }
            if (_dist >= edge)
                return i;
        }
        return 0;
    }
    static Range(_arr, _index) {
        let s = _index, e = _index;
        while (s > 0 && _arr[s - 1].mDistance == _arr[_index].mDistance)
            s--;
        while (e < _arr.length - 1 && _arr[e + 1].mDistance == _arr[_index].mDistance)
            e++;
        return [s, e];
    }
    static Insert(_arr, _info) {
        const insertIndex = _arr.findIndex(existing => _info.mDistance < existing.mDistance);
        const index = insertIndex === -1 ? _arr.length : insertIndex;
        _arr.splice(index, 0, _info);
    }
    static Add(_arr, _resOrList, _distance = 0, _hysteresis = 0, _amount = 1, _paintTag = [], _paintShaderAttr = []) {
        if (Array.isArray(_resOrList)) {
            for (const info of _resOrList)
                CLOD.Insert(_arr, info);
            return;
        }
        CLOD.Insert(_arr, new CLOD(_resOrList, _amount, Math.abs(_distance), _hysteresis, _paintTag, _paintShaderAttr));
    }
}
