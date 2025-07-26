//https://roystan.net/articles/camera-shake/
import { CObject } from "../basic/CObject.js";
import {CMat} from "../geometry/CMat.js";
import {CMath} from "../geometry/CMath.js";
import { CUtilMath } from "../geometry/CUtilMath.js";
import {CVec2} from "../geometry/CVec2.js";
import {CVec3} from "../geometry/CVec3.js";
import {CVec4} from "../geometry/CVec4.js";
import { CCamera, ICamShake } from "../render/CCamera.js";


export class CCamShake extends CObject implements ICamShake
{
    constructor()
    {
        super();
 
        this.mCamera = null;
        this.mSeed = Math.random();
    }
    
    public mCamera : CCamera;
 
    public mKey : number = 0;

    //흔들림의 최대 크기
    public mPosLimit : CVec3 = new CVec3();
    public mRotLimit : CVec3 = new CVec3(); //euler, radian

    //최대 크기 내에서 흔들리는 빈도 / 강도
    public mTraumaExponent : number = 2.0; // 흔들림의 부드러움 정도(이차곡선으로 움직임)
    public mFrequency : number = 25.0; // 흔들림의 빈도
    public mRecoverySpeed : number = 1.0; // 흔들림의 강도

    //흔들림의 타입, 방향
    public mRange : CVec2 = new CVec2(-1, 1);

    //private
    protected mSeed : number;
    protected mTranslation : CVec3 = new CVec3();
    protected mRotation : CVec3 = new CVec3();
    protected mTrauma : number = 0.0;

    private mRotationQuat : CVec4 = new CVec4();
    private mRotationMat : CMat = new CMat();
    private mEye : CVec3 = new CVec3();
    private mLook : CVec3 = new CVec3();

    override IsShould(_member: string, _type: CObject.eShould) 
    {
        let hide = [
            "mSeed", "mTranslation", 
            "mRotation", "mRotationQuat", "mRotationMat", 
            "mTrauma","mUpdateEye","mUpdateLook"
        ];
        if(hide.includes(_member)) 
            return false;
        
        return super.IsShould(_member, _type);
    }

    public InitCamera(_cam : CCamera)
    {
        if(this.mCamera==null)
            this.mCamera=_cam;
    }

    protected NormalizeToRange(_number : number) {
        return _number * (this.mRange.y - this.mRange.x) + this.mRange.x;
    }

    public GetEye() {
        if(this.mCamera==null) return new CVec3();
        return CMath.V3AddV3(this.mCamera.GetEye(), this.mTranslation, this.mEye);
    }

    public GetLook() {
        if(this.mCamera==null) return new CVec3();
        let view = CMath.V3SubV3(this.mCamera.GetLook(), this.mCamera.GetEye());
        view = CMath.V3MulMatNormal(view, this.mRotationMat);
        return CMath.V3AddV3(view, this.GetEye(), this.mLook);
    }

    public Update(_delay : number) {
        if(this.mCamera==null) return;

       

        if(this.mTrauma > 0) {
            this.mCamera.mReset = true;
        }

        let delaySec : number = _delay / 1000;
        let timeSec : number = Date.now() / 1000;
        let trauma : number = CMath.Clamp(this.mTrauma, 0, 1);
        let shake : number = Math.pow(trauma, this.mTraumaExponent);

        this.Process(timeSec, shake);
        
        CMath.EulerToQut(this.mRotation, this.mRotationQuat);
        CMath.QutToMat(this.mRotationQuat, this.mRotationMat);

        this.mTrauma = CMath.Clamp(this.mTrauma - this.mRecoverySpeed * delaySec, 0, 1);
    }

    protected Process(_time : number, _shake : number) {}

    //_duration : ms
    public Shake(_duration : number) {
        this.mTrauma = this.mRecoverySpeed * _duration / 1000;
    }

    public Set2D(_magnitude : number = 20) {
        this.mPosLimit.x = _magnitude;
        this.mPosLimit.y = _magnitude;
        this.mPosLimit.z = _magnitude;
        this.mRotLimit.x = 0;
        this.mRotLimit.y = 0;
        this.mRotLimit.z = 0;
    }

    public Set3D(_magnitude : number = 20, _rotation : number = 5) {
        this.mPosLimit.x = _magnitude;
        this.mPosLimit.y = _magnitude;
        this.mPosLimit.z = _magnitude;
        this.mRotLimit.x = CMath.DegreeToRadian(_rotation);
        this.mRotLimit.y = CMath.DegreeToRadian(_rotation);
        this.mRotLimit.z = CMath.DegreeToRadian(_rotation);
    }
}

export class CCamShakeRandom extends CCamShake
{
    constructor() {
        super();

        this.Set3D(20, 5);
    }

    protected Process(_time : number, _shake : number): void {
        this.mTranslation.x = this.NormalizeToRange(Math.random()) * this.mPosLimit.x * _shake;
        this.mTranslation.y = this.NormalizeToRange(Math.random()) * this.mPosLimit.y * _shake;
        this.mTranslation.z = this.NormalizeToRange(Math.random()) * this.mPosLimit.z * _shake;

        this.mRotation.x = this.NormalizeToRange(Math.random()) * this.mRotLimit.x * _shake;
        this.mRotation.y = this.NormalizeToRange(Math.random()) * this.mRotLimit.y * _shake;
        this.mRotation.z = this.NormalizeToRange(Math.random()) * this.mRotLimit.z * _shake;
    }
}

export class CCamShakeNoise extends CCamShake
{
    constructor() {
        super();

        this.Set3D(20, 5);
    }

    protected Process(_time : number, _shake : number): void {
        this.mTranslation.x = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 0, _time * this.mFrequency)) * this.mPosLimit.x * _shake;
        this.mTranslation.y = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 1, _time * this.mFrequency)) * this.mPosLimit.y * _shake;
        this.mTranslation.z = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 2, _time * this.mFrequency)) * this.mPosLimit.z * _shake;

        this.mRotation.x = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 3, _time * this.mFrequency)) * this.mRotLimit.x * _shake;
        this.mRotation.y = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 4, _time * this.mFrequency)) * this.mRotLimit.y * _shake;
        this.mRotation.z = this.NormalizeToRange(CUtilMath.Noise(this.mSeed + 5, _time * this.mFrequency)) * this.mRotLimit.z * _shake;
    }
}

export class CCamShakeSine extends CCamShake
{
    constructor() {
        super();

        this.Set3D(20, 5);
    }

    protected Process(_time : number, _shake : number): void {
        this.mTranslation.x = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mPosLimit.x * _shake;
        this.mTranslation.y = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mPosLimit.y * _shake;
        this.mTranslation.z = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mPosLimit.z * _shake;

        this.mRotation.x = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mRotLimit.x * _shake;
        this.mRotation.y = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mRotLimit.y * _shake;
        this.mRotation.z = this.NormalizeToRange(Math.sin(_time * this.mFrequency)) * this.mRotLimit.z * _shake;
    }
}