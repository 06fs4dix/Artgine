import { CUpdate } from "../basic/Basic.js";
import { CAlert } from "../basic/CAlert.js";
import { CObject } from "../basic/CObject.js";
import { CMath } from "../geometry/CMath.js";
import { CPoolGeo } from "../geometry/CPoolGeo.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CInput } from "../system/CInput.js";
export class CCamCon extends CObject {
    constructor(_input) {
        super();
        this.mInput = _input;
        this.mCamera = null;
    }
    mCamera;
    mInput;
    mlX = -1;
    mlY = -1;
    mBfpos = null;
    mBspos = null;
    mMovX = 0;
    mMovY = 0;
    mMovLock = 0;
    mPosSensitivity = 1;
    mRotSensitivity = 1;
    mZoomSensitivity = 1;
    mLock = false;
    mRotKey = CInput.eKey.LButton;
    mRotXLock = false;
    mRotYLock = false;
    mPosKey = CInput.eKey.RButton;
    mKeyboard = true;
    mPause = false;
    mRotX = 0;
    mRotY = 0;
    mPosX = 0;
    mPosY = 0;
    mZoom = 0;
    mUp = 0;
    mReset = false;
    IsShould(_member, _type) {
        let hide = [
            "mCamera", "mInput", "mlX", "mlY", "mBfpos", "mBspos", "mMovX", "mMovY",
            "mMoveLock", "mRotX", "mRotY", "mPosX", "mPosY", "mZoom",
            "mUp", "mReset"
        ];
        if (hide.indexOf(_member) != -1) {
            return false;
        }
        return super.IsShould(_member, _type);
    }
    SetRotKey(_key) {
        this.mRotKey = _key;
    }
    SetPosKey(_key) {
        this.mPosKey = _key;
    }
    SetRotXLock(_enable) { this.mRotXLock = _enable; }
    SetRotYLock(_enable) { this.mRotYLock = _enable; }
    SetKeyboard(_enable) {
        this.mKeyboard = _enable;
    }
    SetPosSensitivity(_sensitivity) {
        this.mPosSensitivity = _sensitivity;
    }
    SetRotSensitivity(_sensitivity) {
        this.mRotSensitivity = _sensitivity;
    }
    SetZoomSensitivity(_sensitivity) {
        this.mZoomSensitivity = _sensitivity;
    }
    SetPause(_pause) {
        this.mPause = _pause;
    }
    InitCamera(_cam) {
        if (this.mCamera == null)
            this.mCamera = _cam;
    }
    SetInput(_input) {
        this.mInput = _input;
    }
    Update(_delay) {
        if (this.mCamera == null || this.mInput == null)
            return;
        if (this.mPause)
            return;
        var mosVec = this.mInput.Mouse();
        const move = 10;
        this.mRotX = 0;
        this.mRotY = 0;
        this.mPosX = 0;
        this.mPosY = 0;
        this.mUp = 0;
        this.mZoom = 0;
        this.mReset = false;
        this.mMovX = 0;
        this.mMovY = 0;
        if (this.mLock == false) {
            if (this.mInput.KeyDown(this.mRotKey) || this.mInput.KeyDown(this.mPosKey)) {
                if (this.mlX != -1) {
                    var dumX = this.mlX - mosVec.x;
                    var dumY = this.mlY - mosVec.y;
                    if (dumX != 0 || dumY != 0)
                        this.mMovLock += 1;
                    if (this.mMovLock > 4) {
                        this.mMovX = this.mlX - mosVec.x;
                        this.mMovY = this.mlY - mosVec.y;
                    }
                }
                this.mlX = mosVec.x;
                this.mlY = mosVec.y;
            }
            else {
                this.mlX = -1;
                this.mlY = -1;
                this.mMovLock = 0;
            }
            let mVec = this.mInput.MouseVec();
            if (mVec.length == 2) {
                let fpos = new CVec3(mVec[0].x, mVec[0].y);
                let spos = new CVec3(mVec[1].x, mVec[1].y);
                if (this.mBfpos != null) {
                    let len = CMath.V3Len(CMath.V3SubV3(fpos, spos));
                    let bLen = CMath.V3Len(CMath.V3SubV3(this.mBfpos, this.mBspos));
                    this.mZoom = len - bLen;
                    this.mReset = true;
                }
                this.mBfpos = fpos;
                this.mBspos = spos;
                this.mlX = -1;
                this.mlY = -1;
            }
            else {
                if (this.mBfpos != null) {
                    this.mBfpos = null;
                    this.mBspos = null;
                }
                if (this.mInput.KeyDown(this.mRotKey)) {
                    if (this.mRotXLock == false)
                        this.mRotX = this.mMovY;
                    if (this.mRotYLock == false)
                        this.mRotY = this.mMovX;
                    this.mReset = true;
                }
                else if (this.mInput.KeyDown(this.mPosKey)) {
                    this.mPosX = -this.mMovY;
                    this.mPosY = this.mMovX;
                    this.mReset = true;
                }
                if (this.mInput.KeyUp(CInput.eKey.Wheel)) {
                    var val = this.mInput.Wheel();
                    if (val > 50)
                        val = 50;
                    else if (val < -50)
                        val = -50;
                    this.mZoom = -val;
                    this.mReset = true;
                }
            }
            if (this.mKeyboard) {
                if (this.mInput.KeyDown(CInput.eKey.W)) {
                    if (this instanceof CCamCon2D) {
                        this.mPosX -= move;
                    }
                    else {
                        this.mPosX -= move;
                    }
                    this.mReset = true;
                }
                if (this.mInput.KeyDown(CInput.eKey.S)) {
                    if (this instanceof CCamCon2D) {
                        this.mPosX += move;
                    }
                    else {
                        this.mPosX += move;
                    }
                    this.mReset = true;
                }
                if (this.mInput.KeyDown(CInput.eKey.A)) {
                    this.mPosY -= move;
                    this.mReset = true;
                }
                if (this.mInput.KeyDown(CInput.eKey.D)) {
                    this.mPosY += move;
                    this.mReset = true;
                }
                if (this.mInput.KeyDown(CInput.eKey.Q)) {
                    this.mZoom = move;
                    this.mReset = true;
                }
                if (this.mInput.KeyDown(CInput.eKey.E)) {
                    this.mZoom = -move;
                    this.mReset = true;
                }
                if (this.mInput.KeyDown(CInput.eKey.Z)) {
                    this.mUp = -move;
                    this.mReset = true;
                }
                if (this.mInput.KeyDown(CInput.eKey.X)) {
                    this.mUp = move;
                    this.mReset = true;
                }
            }
        }
        else {
            this.mlX = -1;
            this.mlY = -1;
            if (this.mBfpos != null) {
                CAlert.Info("this.mBfpos!=null");
                this.mBfpos = null;
                this.mBspos = null;
            }
        }
    }
}
class CCamCon3D extends CCamCon {
    InitCamera(_cam) {
        super.InitCamera(_cam);
    }
}
export class CCamCon3DFirstPerson extends CCamCon3D {
    Update(_delay) {
        super.Update(_delay);
        if (this.mReset == false)
            return;
        this.mCamera.FrontMove(this.mPosX * this.mPosSensitivity);
        this.mCamera.CrossMove(-this.mPosY * this.mPosSensitivity);
        this.mCamera.XAxisRotation(this.mRotX * 0.005 * this.mRotSensitivity);
        this.mCamera.YAxisRotation(this.mRotY * 0.005 * this.mRotSensitivity);
        this.mCamera.ZAxisZoom(this.mZoom * this.mZoomSensitivity);
        this.mCamera.UpMove(this.mUp * this.mPosSensitivity);
    }
}
export class CCamCon3DThirdPerson extends CCamCon3D {
    mPos;
    m_zoom = 1000;
    SetPos(_pos) {
        if (!this.mPos) {
            this.mPos = _pos.Export();
            this.m_zoom = CMath.V3Len(CMath.V3SubV3(this.mPos, this.mCamera.GetEye()));
        }
        else {
            this.mPos.Import(_pos);
        }
    }
    SetZoom(_zoom) {
        this.m_zoom = _zoom;
    }
    Update(_delay) {
        super.Update(_delay);
        if (!this.mPos)
            this.mPos = this.mCamera.GetEye().Export();
        let rotX = this.mRotY * 0.001 * _delay * this.mRotSensitivity;
        let rotY = this.mRotX * 0.001 * _delay * this.mRotSensitivity;
        if (this.mZoom != 0)
            this.m_zoom = this.m_zoom - this.mZoom * this.mZoomSensitivity;
        this.mCamera.CharacterByRotation(this.mPos, rotY, rotX, this.m_zoom);
    }
}
class CCamCon2D extends CCamCon {
    InitCamera(_cam) {
        if (_cam.mOrthographic == false) {
            CAlert.E("not orthographic cam!");
        }
        else
            super.InitCamera(_cam);
    }
    AddZoom(_val) {
        if (_val == 0)
            return;
        this.mCamera.mZoom *= 1 + _val / 1000;
        this.mCamera.mUpdateMat = CUpdate.eType.Updated;
    }
}
export class CCamCon2DFreeMove extends CCamCon2D {
    Update(_delay) {
        super.Update(_delay);
        if (this.mReset == false)
            return;
        this.AddZoom(-this.mZoom * this.mZoomSensitivity);
        let width = this.mCamera.mWidth;
        let height = this.mCamera.mHeight;
        if (width == 0) {
            width = this.mCamera.mPF.mWidth;
        }
        if (height == 0) {
            height = this.mCamera.mPF.mHeight;
        }
        let multiplier = CMath.Max(width, height) / 1000 * this.mPosSensitivity * this.mCamera.mZoom;
        this.mCamera.CrossMove(-this.mPosY * multiplier);
        this.mCamera.UpMove(-this.mPosX * multiplier);
        this.mCamera.ResetOrthographic();
    }
}
export class CCamCon2DFollow extends CCamCon2D {
    mPos;
    m_offset = new CVec3();
    m_smoothSpeed = 0.125;
    m_tempVec3 = new CVec3();
    constructor(_input) {
        super(_input);
    }
    SetPos(_pos) {
        this.mPos = _pos;
    }
    IsShould(_member, _type) {
        if (_member == "m_tempVec3")
            return false;
        return super.IsShould(_member, _type);
    }
    Update(_delay) {
        super.Update(_delay);
        this.AddZoom(-this.mZoom * this.mZoomSensitivity);
        if (!this.mPos)
            this.mPos = this.mCamera.GetEye().Export();
        let destination = this.m_tempVec3;
        CMath.V3AddV3(this.mPos, this.m_offset, destination);
        let smoothedPos = CPoolGeo.ProductV3();
        CMath.V3Interpolate(this.mCamera.GetEye(), destination, this.m_smoothSpeed, smoothedPos);
        smoothedPos.z = this.mCamera.GetEye().z;
        let look = this.m_tempVec3;
        CMath.V3AddV3(smoothedPos, new CVec3(0, 0, -1), look);
        this.mCamera.Init(smoothedPos, look);
        CPoolGeo.RecycleV3(smoothedPos);
        this.mCamera.ResetOrthographic();
    }
}
