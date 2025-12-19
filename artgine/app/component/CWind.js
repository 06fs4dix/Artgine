import { CVec3 } from "../../geometry/CVec3.js";
import { CDevice } from "../../render/CDevice.js";
import { CBrushComp } from "./CBrushComp.js";
import { CComponent } from "./CComponent.js";
export class CWind extends CBrushComp {
    mDir = new CVec3(1, 0, 0);
    mPower = 100;
    mInnerRadius = 0;
    mOuterRadius = 0;
    mFrequency = 0.6;
    mWaveLength = 1000;
    mUseWeight = true;
    constructor() {
        super(null);
        this.mSysc = CComponent.eSysn.Wind;
    }
    SetInnerOuter(_inner, _outer) {
        this.mInnerRadius = _inner;
        this.mOuterRadius = _outer;
    }
    SetDirect(_dir = new CVec3()) {
        this.mDir = _dir;
    }
    SetPower(_power) {
        this.mPower = _power;
    }
    SetFrequency(_f) {
        this.mFrequency = _f;
    }
    SetWave(_w) {
        this.mWaveLength = _w;
    }
    Icon() {
        return "bi bi-wind";
    }
    Update(_update) {
        if (super.Update(_update))
            return;
        if (this.mBruch.mWindCount > CDevice.GetProperty(CDevice.eProperty.Sam2DSize))
            return;
        this.mBruch.mWindDir[this.mBruch.mWindCount * 4 + 0] = this.mDir.x;
        this.mBruch.mWindDir[this.mBruch.mWindCount * 4 + 1] = this.mDir.y;
        this.mBruch.mWindDir[this.mBruch.mWindCount * 4 + 2] = this.mDir.z;
        this.mBruch.mWindDir[this.mBruch.mWindCount * 4 + 3] = this.mPower;
        this.mBruch.mWindPos[this.mBruch.mWindCount * 4 + 0] = this.GetOwner().GetMat().x;
        this.mBruch.mWindPos[this.mBruch.mWindCount * 4 + 1] = this.GetOwner().GetMat().y;
        this.mBruch.mWindPos[this.mBruch.mWindCount * 4 + 2] = this.GetOwner().GetMat().z;
        this.mBruch.mWindPos[this.mBruch.mWindCount * 4 + 3] = this.mUseWeight ? 1.0 : 0.0;
        this.mBruch.mWindInfo[this.mBruch.mWindCount * 4 + 0] = this.mInnerRadius;
        this.mBruch.mWindInfo[this.mBruch.mWindCount * 4 + 1] = this.mOuterRadius;
        this.mBruch.mWindInfo[this.mBruch.mWindCount * 4 + 2] = this.mFrequency;
        this.mBruch.mWindInfo[this.mBruch.mWindCount * 4 + 3] = this.mWaveLength;
        this.mBruch.mWindCount++;
        return false;
    }
}
