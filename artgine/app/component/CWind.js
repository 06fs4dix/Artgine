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
        if (this.mBrush.mWindCount > CDevice.GetProperty(CDevice.eProperty.Sam2DSize))
            return;
        this.mBrush.mWindDir[this.mBrush.mWindCount * 4 + 0] = this.mDir.x;
        this.mBrush.mWindDir[this.mBrush.mWindCount * 4 + 1] = this.mDir.y;
        this.mBrush.mWindDir[this.mBrush.mWindCount * 4 + 2] = this.mDir.z;
        this.mBrush.mWindDir[this.mBrush.mWindCount * 4 + 3] = this.mPower;
        this.mBrush.mWindPos[this.mBrush.mWindCount * 4 + 0] = this.GetOwner().GetMat().x;
        this.mBrush.mWindPos[this.mBrush.mWindCount * 4 + 1] = this.GetOwner().GetMat().y;
        this.mBrush.mWindPos[this.mBrush.mWindCount * 4 + 2] = this.GetOwner().GetMat().z;
        this.mBrush.mWindPos[this.mBrush.mWindCount * 4 + 3] = this.mUseWeight ? 1.0 : 0.0;
        this.mBrush.mWindInfo[this.mBrush.mWindCount * 4 + 0] = this.mInnerRadius;
        this.mBrush.mWindInfo[this.mBrush.mWindCount * 4 + 1] = this.mOuterRadius;
        this.mBrush.mWindInfo[this.mBrush.mWindCount * 4 + 2] = this.mFrequency;
        this.mBrush.mWindInfo[this.mBrush.mWindCount * 4 + 3] = this.mWaveLength;
        this.mBrush.mWindCount++;
        return false;
    }
}
