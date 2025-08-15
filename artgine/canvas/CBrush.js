import { CJSON } from "../basic/CJSON.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CCamera } from "../render/CCamera.js";
import { CDevice } from "../render/CDevice.js";
import { CObject } from "../basic/CObject.js";
import { CUpdate } from "../basic/Basic.js";
import { CArray } from "../basic/CArray.js";
import { CFile } from "../system/CFile.js";
export class CRenInfo {
    mRP = null;
    mCam = null;
    mCycle = null;
    mTag = new Set();
    mShow = true;
    mShader = null;
}
export class CRenPriority {
    mAlphaList = new CArray();
    mDistanceList = new CArray();
    mPriority = 0;
    static CompareDistance(a, b) {
        return (b.mDistance + b.mTexHash) - (a.mDistance + a.mTexHash);
    }
    static CompareAlpha(a, b) {
        return (b.mAlpha + b.mDistance) - (a.mAlpha + a.mDistance);
    }
}
export class CBrush extends CObject {
    constructor(_frame) {
        super();
        this.SetKey("Brush");
        this.mFrame = _frame;
        var size = CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX);
        this.mLightDir = new Float32Array(4 * size);
        this.mLightColor = new Float32Array(4 * size);
        this.mLightCount = 0;
        for (var i = 0; i < 8; ++i)
            this.mShadowView.push(new Float32Array(4 * size));
        this.mWindDir = new Float32Array(4 * size);
        this.mWindPos = new Float32Array(4 * size);
        this.mWindInfo = new Float32Array(4 * size);
        this.mWindCount = 0;
        if (_frame.PF().mIAuto)
            _frame.PushIAuto(this);
    }
    async SaveJSON(_file = null) {
        CFile.Save(this.ToStr(), _file);
    }
    async LoadJSON(_file = null) {
        let buf = await CFile.Load(_file);
        if (buf == null)
            return true;
        this.mCameraMap.clear();
        this.ImportCJSON(new CJSON(buf));
        for (let cam of this.mCameraMap.values()) {
            cam.mPF = this.mFrame.PF();
            if (cam.mCamCon != null)
                cam.mCamCon.SetInput(this.mFrame.Input());
        }
        this.mCam3d = this.GetCamera("3D");
        this.mCam2d = this.GetCamera("2D");
        this.mCamDev = this.GetCamera("Dev");
        return false;
    }
    IsPause() {
        return this.mPause;
    }
    SetPause(_pause) {
        this.mPause = _pause;
    }
    mFrame = null;
    mCam2d = null;
    mCam3d = null;
    mCamDev = null;
    mDoubleChk = new Set();
    mLightDir = null;
    mLightColor = null;
    mLightCount;
    mShadowView = new Array();
    mShadowCount = 0;
    mWindDir = null;
    mWindPos = null;
    mWindInfo = null;
    mWindCount = 0;
    mAutoRPMap = new Map();
    mAutoRPUpdate = CUpdate.eType.Not;
    mShadowRead = new Map();
    mCameraMap = new Map();
    mPause = false;
    mRenPriMap = new Map();
    mRenInfoMap = new Map();
    IsShould(_member, _type) {
        if (_member == "mCameraMap")
            return true;
        else
            return false;
        return super.IsShould(_member, _type);
    }
    ClearRen() {
        for (let value of this.mRenPriMap.values()) {
            for (let i = 0; i < value.mAlphaList.Size(); ++i) {
                value.mAlphaList.Find(i).mPaint.BatchClear();
            }
            for (let i = 0; i < value.mDistanceList.Size(); ++i) {
                value.mDistanceList.Find(i).mPaint.BatchClear();
            }
        }
        this.mRenInfoMap.clear();
        this.mRenPriMap.clear();
    }
    RemoveAutoRP(_key) {
        this.mAutoRPMap.delete(_key);
        this.mAutoRPUpdate = CUpdate.eType.Updated;
    }
    SetAutoRP(_key, _val) {
        this.mAutoRPMap.set(_key, _val);
        this.mAutoRPUpdate = CUpdate.eType.Updated;
    }
    GetAutoRP(_key) {
        return this.mAutoRPMap.get(_key);
    }
    AutoRP() { return this.mAutoRPMap; }
    GetCamera(_key) {
        let cam = this.mCameraMap.get(_key);
        if (cam == null) {
            cam = new CCamera(this.mFrame.PF());
            this.mCameraMap.set(_key, cam);
            cam.SetKey(_key);
        }
        return cam;
    }
    m_2DCamDisplayReset = false;
    GetCam3D() { return this.mCam3d; }
    GetCam2D() { return this.mCam2d; }
    GetCamDev() { return this.mCamDev; }
    InitCamera(_displayReset = false) {
        if (this.mCam3d == null) {
            this.mCam3d = this.GetCamera("3D");
            this.mCam3d.SetKey("3D");
        }
        if (this.mCam2d == null) {
            this.mCam2d = this.GetCamera("2D");
            this.mCam2d.SetKey("2D");
        }
        if (this.mCamDev == null) {
            this.mCamDev = this.GetCamera("Dev");
            this.mCamDev.SetKey("Dev");
        }
        this.m_2DCamDisplayReset = _displayReset;
        if (this.mCam3d != null) {
            this.mCam3d.Init(new CVec3(0, 1000, 1), new CVec3(0, 0, 0));
            this.mCam3d.ResetPerspective();
        }
        if (this.mCam2d != null) {
            if (this.m_2DCamDisplayReset) {
                var stx = this.mCam2d.mWidth * 0.5;
                var sty = this.mCam2d.mHeight * 0.5;
                this.mCam2d.Init(new CVec3(stx, sty, 100), new CVec3(stx, sty, 0));
            }
            else {
                this.mCam2d.Init(new CVec3(0, 0.1, 100), new CVec3(0, 0.1, 0));
            }
            this.mCam2d.ResetOrthographic();
        }
    }
    Update(_delay) {
        if (this.mPause != true) {
            if (this.mAutoRPUpdate == CUpdate.eType.Updated)
                this.mAutoRPUpdate = CUpdate.eType.Already;
            else if (this.mAutoRPUpdate == CUpdate.eType.Already)
                this.mAutoRPUpdate = CUpdate.eType.Not;
            this.mLightCount = 0;
            this.mShadowCount = 0;
            this.mShadowRead.clear();
            this.mWindCount = 0;
            this.mDoubleChk.clear();
        }
        for (var cam of this.mCameraMap.values()) {
            if (this.mFrame.Win().IsResize()) {
                cam.mReset = true;
            }
            cam.Update(_delay);
        }
        if (this.mCam2d != null) {
            if (this.mFrame.Win().IsResize()) {
                if (this.m_2DCamDisplayReset) {
                    var stx = this.mCam2d.mWidth * 0.5;
                    var sty = this.mCam2d.mHeight * 0.5;
                    this.mCam2d.Init(new CVec3(stx, sty, 100), new CVec3(stx, sty, 0));
                    this.mCam2d.ResetOrthographic();
                }
            }
        }
    }
    Icon() {
        return "bi-brush";
    }
}
