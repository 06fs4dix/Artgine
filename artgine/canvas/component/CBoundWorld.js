import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
export class CBoundWorld {
    mBound = new CBound();
    mCenter = new CVec3();
    mSize = new CVec3();
    mPos = new CVec3();
    mRadian = 0;
    Init(_LBound, _WMat) {
        this.mBound.Reset();
        this.mBound.mType = _LBound.mType;
        this.mCenter.x = _LBound.mMin.x;
        this.mCenter.y = _LBound.mMin.y;
        this.mCenter.z = _LBound.mMin.z;
        if (_WMat != null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat, this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        this.mCenter.x = _LBound.mMin.x;
        this.mCenter.y = _LBound.mMin.y;
        this.mCenter.z = _LBound.mMax.z;
        if (_WMat != null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat, this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        this.mCenter.x = _LBound.mMin.x;
        this.mCenter.y = _LBound.mMax.y;
        this.mCenter.z = _LBound.mMin.z;
        if (_WMat != null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat, this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        this.mCenter.x = _LBound.mMin.x;
        this.mCenter.y = _LBound.mMax.y;
        this.mCenter.z = _LBound.mMax.z;
        if (_WMat != null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat, this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        this.mCenter.x = _LBound.mMax.x;
        this.mCenter.y = _LBound.mMin.y;
        this.mCenter.z = _LBound.mMin.z;
        if (_WMat != null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat, this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        this.mCenter.x = _LBound.mMax.x;
        this.mCenter.y = _LBound.mMin.y;
        this.mCenter.z = _LBound.mMax.z;
        if (_WMat != null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat, this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        this.mCenter.x = _LBound.mMax.x;
        this.mCenter.y = _LBound.mMax.y;
        this.mCenter.z = _LBound.mMin.z;
        if (_WMat != null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat, this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        this.mCenter.x = _LBound.mMax.x;
        this.mCenter.y = _LBound.mMax.y;
        this.mCenter.z = _LBound.mMax.z;
        if (_WMat != null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat, this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        this.mBound.GetCenter(this.mCenter);
        this.mBound.GetSize(this.mSize);
    }
    UpdateMat(_mat) {
        this.mPos.mF32A[0] = this.mCenter.mF32A[0] + _mat.mF32A[12];
        this.mPos.mF32A[1] = this.mCenter.mF32A[1] + _mat.mF32A[13];
        this.mPos.mF32A[2] = this.mCenter.mF32A[2] + _mat.mF32A[14];
    }
}
export class CBoundWorldPaint extends CBoundWorld {
    Init(_LBound, _WMat) {
        super.Init(_LBound, _WMat);
        this.mRadian = this.mBound.GetOutRadius();
    }
}
export class CBoundWorldCollider extends CBoundWorld {
    mMat = new CMat();
    mIMat = new CMat();
    mWBound = new CBound();
    dirPoint = new CVec3();
    Init(_LBound, _WMat) {
        super.Init(_LBound, _WMat);
        this.mRadian = this.mBound.GetInRadius();
    }
    UpdateMat(_mat) {
        super.UpdateMat(_mat);
        this.mMat.Import(_mat);
        if (_mat.IsRotScaUnit())
            this.mIMat.Unit();
        else
            CMath.MatInvert(this.mMat, this.mIMat);
        this.mWBound.mMin.mF32A[0] = this.mBound.mMin.mF32A[0] + this.mMat.mF32A[12];
        this.mWBound.mMin.mF32A[1] = this.mBound.mMin.mF32A[1] + this.mMat.mF32A[13];
        this.mWBound.mMin.mF32A[2] = this.mBound.mMin.mF32A[2] + this.mMat.mF32A[14];
        this.mWBound.mMax.mF32A[0] = this.mBound.mMax.mF32A[0] + this.mMat.mF32A[12];
        this.mWBound.mMax.mF32A[1] = this.mBound.mMax.mF32A[1] + this.mMat.mF32A[13];
        this.mWBound.mMax.mF32A[2] = this.mBound.mMax.mF32A[2] + this.mMat.mF32A[14];
    }
    getFarthestPointInDirection(v) {
        let r = Math.random() * 0.00001;
        if (this.mBound.GetType() == CBound.eType.Sphere) {
            CMath.V3Nor(v, this.dirPoint);
            CMath.V3MulFloat(this.dirPoint, this.mRadian + r, this.dirPoint);
            CMath.V3AddV3(this.dirPoint, this.mMat.xyz, this.dirPoint);
        }
        else if (this.mBound.GetType() == CBound.eType.Box) {
            CMath.V3MulMatNormal(v, this.mIMat, this.dirPoint);
            this.dirPoint.mF32A[0] = (this.dirPoint.mF32A[0] > 0) ? this.mWBound.mMax.mF32A[0] + r : this.mWBound.mMin.mF32A[0] - r;
            this.dirPoint.mF32A[1] = (this.dirPoint.mF32A[1] > 0) ? this.mWBound.mMax.mF32A[1] + r : this.mWBound.mMin.mF32A[1] - r;
            this.dirPoint.mF32A[2] = (this.dirPoint.mF32A[2] > 0) ? this.mWBound.mMax.mF32A[2] + r : this.mWBound.mMin.mF32A[2] - r;
        }
        else {
            var dir = CMath.V3MulMatNormal(v, this.mIMat);
            var furthest_point = new CVec3();
            if (this.mBound.mPos.Size() != 0)
                furthest_point = this.mBound.mPos.Find(0);
            var max_dot = CMath.V3Dot(furthest_point, dir);
            for (var i = 1; i < this.mBound.mPos.Size(); i++) {
                var d = CMath.V3Dot(this.mBound.mPos.Find(i), dir);
                if (d > max_dot) {
                    max_dot = d;
                    furthest_point = this.mBound.mPos.Find(i);
                }
            }
            CMath.V3MulMatCoordi(furthest_point, this.mMat, this.dirPoint);
        }
        return this.dirPoint;
    }
}
