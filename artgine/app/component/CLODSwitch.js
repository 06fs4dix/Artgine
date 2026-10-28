import { CUpdate } from "../../basic/Basic.js";
import { CMesh } from "../../render/CMesh.js";
import { CLOD } from "./CLOD.js";
import { CComponent } from "./CComponent.js";
import { CPaint2D } from "./paint/CPaint2D.js";
import { CPaint3D } from "./paint/CPaint3D.js";
export class CLODSwitch extends CComponent {
    mLODInfo = new Array();
    mCamera = null;
    mCur = -1;
    mShow = new Array();
    mShowSub = new Array();
    mSubOn = new Map();
    mOff = false;
    mInit = true;
    mPending = false;
    mPaint = new Map();
    mLoading = new Set();
    IsShould(_member, _type) {
        if (_member == "mCamera" || _member == "mCur" || _member == "mShow" || _member == "mShowSub" || _member == "mSubOn" || _member == "mOff" || _member == "mInit" ||
            _member == "mPending" || _member == "mPaint" || _member == "mLoading")
            return false;
        return super.IsShould(_member, _type);
    }
    AddLODLevel(_resOrList, _distance = 0, _hysteresis = 0, _amount = 1, _paintTag = [], _paintShaderAttr = []) {
        CLOD.Add(this.mLODInfo, _resOrList, _distance, _hysteresis, _amount, _paintTag, _paintShaderAttr);
        this.mInit = true;
    }
    GetLevel() { return this.mCur; }
    RecvGetCamera(_cam) {
        this.mCamera = _cam;
        this.mInit = true;
    }
    Update(_update) {
        if (this.mCamera == null) {
            const cm = this.ProductMsg("SendGetCamera");
            cm.mInter = "canvas";
            cm.mMsgData[0] = this;
            return;
        }
        if (this.mOff)
            this.ApplyOff();
        const owner = this.GetOwner();
        const cam = this.mCamera;
        if (owner == null || owner.GetFrame() == null || this.mLODInfo.length == 0)
            return;
        if (this.mInit == false && this.mPending == false && cam.mUpdateMat == CUpdate.eType.Not && owner.mUpdateMat == CUpdate.eType.Not)
            return;
        this.mInit = false;
        this.mPending = false;
        const eye = cam.GetEye(), pos = owner.GetMat();
        const dist = Math.hypot(eye.x - pos.x, eye.y - pos.y, eye.z - pos.z);
        const index = CLOD.Select(this.mLODInfo, dist, this.mCur);
        if (index == this.mCur)
            return;
        const [start, end] = CLOD.Range(this.mLODInfo, index);
        const show = new Array(), showSub = new Array();
        for (let i = start; i <= end; i++) {
            const info = this.mLODInfo[i];
            if (info.mSubject != null)
                showSub.push(info.mSubject);
            if (info.mRes == null)
                continue;
            let pt = this.mPaint.get(info);
            if (pt == null) {
                pt = this.BuildPaint(info);
                if (pt == null) {
                    this.mPending = true;
                    return;
                }
                this.mPaint.set(info, pt);
            }
            show.push(pt);
        }
        this.mCur = index;
        this.mShow = show;
        this.mShowSub = showSub;
        for (const pt of show)
            if (pt.IsEnable() == false)
                pt.SetEnable(true);
        for (const sub of showSub)
            this.SetSub(sub, true);
        this.mOff = true;
    }
    ApplyOff() {
        this.mOff = false;
        for (const pt of this.mPaint.values())
            if (this.mShow.includes(pt) == false && pt.IsEnable())
                pt.SetEnable(false);
        for (const info of this.mLODInfo)
            if (info.mSubject != null && this.mShowSub.includes(info.mSubject) == false)
                this.SetSub(info.mSubject, false);
    }
    SetSub(_sub, _on) {
        if (this.mSubOn.get(_sub) === _on)
            return;
        this.mSubOn.set(_sub, _on);
        _sub.SetEnable(_on);
    }
    BuildPaint(_info) {
        const owner = this.GetOwner(), frame = owner.GetFrame();
        const res = frame.Res().Find(_info.mRes);
        if (res == null) {
            if (this.mLoading.has(_info.mRes) == false) {
                this.mLoading.add(_info.mRes);
                frame.Load().Exe(_info.mRes);
            }
            return null;
        }
        const pt = res instanceof CMesh ? new CPaint3D(_info.mRes) : new CPaint2D(_info.mRes);
        pt.mSave = false;
        pt.SetEnable(false);
        for (const tag of _info.mPaintTag)
            pt.PushTag(tag);
        for (const attr of _info.mPaintShaderAttr)
            pt.PushCShaderAttr(attr);
        if (_info.mWind > 0)
            pt.Wind(_info.mWind);
        owner.PushComp(pt);
        return pt;
    }
    Destroy() {
        for (const pt of this.mPaint.values())
            pt.Destroy();
        this.mPaint.clear();
        super.Destroy();
    }
}
