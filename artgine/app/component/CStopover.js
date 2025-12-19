import { CObject } from "../../basic/CObject.js";
import { CCurve } from "../../util/CCurve.js";
export class CStopover extends CObject {
    constructor(_dest, _velocity) {
        super();
        this.mPos = _dest;
        this.mVelocity = _velocity;
    }
    mPos = new Array;
    mCurve = new CCurve();
    mBezier = false;
    mTime = 0;
    mDelay = 0;
    mVelocity = 0;
}
