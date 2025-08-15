import { CVec3 } from "../../geometry/CVec3.js";
import { CDevice } from "../../render/CDevice.js";
import { CCamComp } from "./CCamComp.js";
import { CComponent } from "./CComponent.js";
export class CWind extends CCamComp {
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
    Update(_delay) {
        super.Update(_delay);
    }
    CCamCompReq(_brush) {
        if (_brush.mDoubleChk.has(this))
            return;
        _brush.mDoubleChk.add(this);
        if (_brush.mWindCount > CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX) / 4)
            return;
        _brush.mWindDir[_brush.mWindCount * 4 + 0] = this.mDir.x;
        _brush.mWindDir[_brush.mWindCount * 4 + 1] = this.mDir.y;
        _brush.mWindDir[_brush.mWindCount * 4 + 2] = this.mDir.z;
        _brush.mWindDir[_brush.mWindCount * 4 + 3] = this.mPower;
        _brush.mWindPos[_brush.mWindCount * 4 + 0] = this.GetOwner().GetWMat().x;
        _brush.mWindPos[_brush.mWindCount * 4 + 1] = this.GetOwner().GetWMat().y;
        _brush.mWindPos[_brush.mWindCount * 4 + 2] = this.GetOwner().GetWMat().z;
        _brush.mWindPos[_brush.mWindCount * 4 + 3] = this.mUseWeight ? 1.0 : 0.0;
        _brush.mWindInfo[_brush.mWindCount * 4 + 0] = this.mInnerRadius;
        _brush.mWindInfo[_brush.mWindCount * 4 + 1] = this.mOuterRadius;
        _brush.mWindInfo[_brush.mWindCount * 4 + 2] = this.mFrequency;
        _brush.mWindInfo[_brush.mWindCount * 4 + 3] = this.mWaveLength;
        _brush.mWindCount++;
    }
}
