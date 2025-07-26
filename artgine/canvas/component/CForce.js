import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CCurve } from "../../util/CCurve.js";
import { CObject } from "../../basic/CObject.js";
export class CForce extends CObject {
    mKey;
    mCurve = new CCurve();
    mTime = 0;
    mDelay = 0xffffffff;
    mDMulVBegin;
    mDMulVEnd;
    mDirection = new CVec3();
    mVelocity = 0;
    mForce = new CVec3();
    mRemove = false;
    constructor(_key = "", _dir = new CVec3(), _velocity = 0) {
        super();
        this.mKey = _key + "";
        this.mDMulVBegin = CMath.V3MulFloat(_dir, _velocity);
        this.mDMulVEnd = null;
        this.mDirection.Import(_dir);
        this.mVelocity = _velocity;
    }
    IsRemove() {
        if (this.mTime > this.mDelay && this.mRemove)
            return true;
        return false;
    }
    SetDirVel(_DirBegin, _VelBegin, _DirEnd = null, _VelEnd = 0) {
        if (typeof _DirBegin == "number") {
            this.mDMulVBegin.mF32A[0] = _DirBegin * _VelEnd;
            this.mDMulVBegin.mF32A[1] = _VelBegin * _VelEnd;
            this.mDMulVBegin.mF32A[2] = _DirEnd * _VelEnd;
        }
        else {
            this.mDMulVBegin = CMath.V3MulFloat(_DirBegin, _VelBegin);
            this.mDirection = _DirBegin;
            this.mVelocity = _VelBegin;
            if (_DirEnd == null)
                this.mDMulVEnd = null;
            else
                this.mDMulVEnd = CMath.V3MulFloat(_DirEnd, _VelEnd);
        }
    }
    SetDelay(_delay) { this.mDelay = _delay; this.mTime = 0; }
    SetCurve(_curve) { this.mCurve = _curve; }
    SetRemove(_enable) { this.mRemove = _enable; }
    Cac(_tick) {
        var dtime = _tick * 0.001;
        this.mTime += _tick;
        if (this.mDMulVEnd == null) {
            CMath.V3MulFloat(this.mDirection, dtime * this.mVelocity, this.mForce);
            return this.mForce;
        }
        var t = 0;
        if (this.mDelay == 0) {
            this.mDirection.Zero();
            this.mVelocity = 0;
            return this.mDirection;
        }
        if (this.mTime > this.mDelay)
            t = 1;
        else if (this.mDelay < 0xffffffff)
            t = this.mTime / this.mDelay;
        var v = this.mCurve.GetCurve(t);
        this.mForce.mF32A[0] = CMath.FloatInterpolate(this.mDMulVBegin.mF32A[0], this.mDMulVEnd.mF32A[0], v);
        this.mForce.mF32A[1] = CMath.FloatInterpolate(this.mDMulVBegin.mF32A[1], this.mDMulVEnd.mF32A[1], v);
        this.mForce.mF32A[2] = CMath.FloatInterpolate(this.mDMulVBegin.mF32A[2], this.mDMulVEnd.mF32A[2], v);
        this.mVelocity = CMath.V3Len(this.mForce);
        if (this.mForce.IsZero() == false) {
            this.mDirection.mF32A[0] = this.mForce.mF32A[0] / this.mVelocity;
            this.mDirection.mF32A[1] = this.mForce.mF32A[1] / this.mVelocity;
            this.mDirection.mF32A[2] = this.mForce.mF32A[2] / this.mVelocity;
        }
        CMath.V3MulFloat(this.mForce, dtime, this.mForce);
        return this.mForce;
    }
}
