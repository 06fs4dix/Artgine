import { CObject } from "../basic/CObject.js";
import { CMat } from "../geometry/CMat.js";
import { CMath } from "../geometry/CMath.js";
import { CUtilMath } from "../geometry/CUtilMath.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
export class CCamShake extends CObject {
    constructor() {
        super();
        this.mCamera = null;
        this.mSeed = Math.random();
    }
    mCamera;
    mKey = 0;
    mPosLimit = new CVec3();
    mRotLimit = new CVec3();
    mTraumaExponent = 2.0;
    mFrequency = 25.0;
    mRecoverySpeed = 1.0;
    mRange = new CVec2(-1, 1);
    mSeed;
    mTranslation = new CVec3();
    mRotation = new CVec3();
    mTrauma = 0.0;
    mRotationQuat = new CVec4();
    mRotationMat = new CMat();
    mEye = new CVec3();
    mLook = new CVec3();
    IsShould(_member, _type) {
        let hide = [
            "mSeed", "mTranslation",
            "mRotation", "mRotationQuat", "mRotationMat",
            "mTrauma", "mUpdateEye", "mUpdateLook", "mCamera"
        ];
        if (hide.includes(_member))
            return false;
        return super.IsShould(_member, _type);
    }
    InitCamera(_cam) {
        if (this.mCamera == null)
            this.mCamera = _cam;
    }
    NormalizeToRange(_number) {
        return _number * (this.mRange.y - this.mRange.x) + this.mRange.x;
    }
    GetEye() {
        if (this.mCamera == null)
            return new CVec3();
        return CMath.V3AddV3(this.mCamera.GetEye(), this.mTranslation, this.mEye);
    }
    GetLook() {
        if (this.mCamera == null)
            return new CVec3();
        let view = CMath.V3SubV3(this.mCamera.GetLook(), this.mCamera.GetEye());
        view = CMath.V3MulMatNormal(view, this.mRotationMat);
        return CMath.V3AddV3(view, this.GetEye(), this.mLook);
    }
    Update(_delay) {
        if (this.mCamera == null)
            return;
        if (this.mTrauma > 0) {
            this.mCamera.mReset = true;
        }
        let delaySec = _delay / 1000;
        let timeSec = Date.now() / 1000;
        let trauma = CMath.Clamp(this.mTrauma, 0, 1);
        let shake = Math.pow(trauma, this.mTraumaExponent);
        this.Process(timeSec, shake);
        CMath.EulerToQut(this.mRotation, this.mRotationQuat);
        CMath.QutToMat(this.mRotationQuat, this.mRotationMat);
        this.mTrauma = CMath.Clamp(this.mTrauma - this.mRecoverySpeed * delaySec, 0, 1);
    }
    Process(_time, _shake) { }
    Shake(_duration) {
        this.mTrauma = this.mRecoverySpeed * _duration / 1000;
    }
    Set2D(_magnitude = 20) {
        this.mPosLimit.x = _magnitude;
        this.mPosLimit.y = _magnitude;
        this.mPosLimit.z = _magnitude;
        this.mRotLimit.x = 0;
        this.mRotLimit.y = 0;
        this.mRotLimit.z = 0;
    }
    Set3D(_magnitude = 20, _rotation = 5) {
        this.mPosLimit.x = _magnitude;
        this.mPosLimit.y = _magnitude;
        this.mPosLimit.z = _magnitude;
        this.mRotLimit.x = CMath.DegreeToRadian(_rotation);
        this.mRotLimit.y = CMath.DegreeToRadian(_rotation);
        this.mRotLimit.z = CMath.DegreeToRadian(_rotation);
    }
}
export class CCamShakeRandom extends CCamShake {
    constructor() {
        super();
        this.Set3D(20, 5);
    }
    Process(_time, _shake) {
        this.mTranslation.x = this.NormalizeToRange(Math.random()) * this.mPosLimit.x * _shake;
        this.mTranslation.y = this.NormalizeToRange(Math.random()) * this.mPosLimit.y * _shake;
        this.mTranslation.z = this.NormalizeToRange(Math.random()) * this.mPosLimit.z * _shake;
        this.mRotation.x = this.NormalizeToRange(Math.random()) * this.mRotLimit.x * _shake;
        this.mRotation.y = this.NormalizeToRange(Math.random()) * this.mRotLimit.y * _shake;
        this.mRotation.z = this.NormalizeToRange(Math.random()) * this.mRotLimit.z * _shake;
    }
}
export class CCamShakeNoise extends CCamShake {
    constructor() {
        super();
        this.Set3D(20, 5);
    }
    Process(_time, _shake) {
        this.mTranslation.x = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 0, _time * this.mFrequency)) * this.mPosLimit.x * _shake;
        this.mTranslation.y = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 1, _time * this.mFrequency)) * this.mPosLimit.y * _shake;
        this.mTranslation.z = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 2, _time * this.mFrequency)) * this.mPosLimit.z * _shake;
        this.mRotation.x = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 3, _time * this.mFrequency)) * this.mRotLimit.x * _shake;
        this.mRotation.y = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 4, _time * this.mFrequency)) * this.mRotLimit.y * _shake;
        this.mRotation.z = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 5, _time * this.mFrequency)) * this.mRotLimit.z * _shake;
    }
}
export class CCamShakeSine extends CCamShake {
    constructor() {
        super();
        this.Set3D(20, 5);
    }
    Process(_time, _shake) {
        this.mTranslation.x = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mPosLimit.x * _shake;
        this.mTranslation.y = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mPosLimit.y * _shake;
        this.mTranslation.z = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mPosLimit.z * _shake;
        this.mRotation.x = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mRotLimit.x * _shake;
        this.mRotation.y = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mRotLimit.y * _shake;
        this.mRotation.z = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mRotLimit.z * _shake;
    }
}
