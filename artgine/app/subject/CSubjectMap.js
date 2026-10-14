import { CUpdate } from "../../basic/Basic.js";
import { CCollider } from "../component/CCollider.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CSubject } from "./CSubject.js";
export class CSubjectMap extends CSubject {
    mPaintArr = new Array();
    mColliderArr = new Array();
    mSubjectArr = new Array();
    mColSleep = false;
    mColWake = false;
    mSleepArr = new Array();
    IsShould(_member, _type) {
        if (_member == "mPaintArr" || _member == "mColliderArr" || _member == "mSubjectArr" || _member == "mColSleep" || _member == "mColWake" || _member == "mSleepArr" || _member == "mCompDirty")
            return false;
        return super.IsShould(_member, _type);
    }
    GetColSubject(_cl) {
        const i = this.mColliderArr.indexOf(_cl);
        if (i < 0)
            return null;
        return this.mSubjectArr[i] ?? null;
    }
    PushComp(_com) {
        const lock = this.mPushLock;
        const com = super.PushComp(_com);
        if (lock == false)
            this.PushMapComp(com);
        return com;
    }
    RemoveComps(_type) {
        super.RemoveComps(_type);
        this.ReleaseMapComp();
    }
    DetachComp(_type) {
        const com = super.DetachComp(_type);
        if (com != null) {
            let i = this.mPaintArr.indexOf(com);
            if (i >= 0)
                this.mPaintArr[i] = null;
            i = this.mColliderArr.indexOf(com);
            if (i >= 0) {
                this.mColliderArr[i] = null;
                if (i < this.mSubjectArr.length)
                    this.mSubjectArr[i] = null;
            }
        }
        return com;
    }
    ToStr() {
        const keep = this.mComArr;
        this.mComArr = this.ExceptMapComp();
        try {
            return super.ToStr();
        }
        finally {
            this.mComArr = keep;
        }
    }
    Export(_copy = true, _resetKey = true) {
        const keep = this.mComArr;
        this.mComArr = this.ExceptMapComp();
        try {
            return super.Export(_copy, _resetKey);
        }
        finally {
            this.mComArr = keep;
        }
    }
    Update(_update) {
        super.Update(_update);
        this.ColSleep();
        this.FlushComp();
    }
    mCompDirty = false;
    UpdateComp() {
        if (this.mPushLock == false || this.mComEnableArr.length == 0) {
            super.UpdateComp();
            return;
        }
        this.mCompDirty = true;
        this.mUpdateComp = true;
    }
    FlushComp() {
        if (this.mCompDirty == false)
            return;
        this.mCompDirty = false;
        const arr = this.mComEnableArr;
        arr.length = 0;
        for (const com of this.mComArr)
            if (com.IsEnable())
                arr.push(com);
    }
    ColWake() {
        this.mColWake = true;
    }
    DetachMapCollider(_cl) {
        const i = this.mComArr.indexOf(_cl);
        if (i >= 0)
            this.mComArr.splice(i, 1);
        const ci = this.mColliderArr.indexOf(_cl);
        if (ci >= 0) {
            this.mColliderArr[ci] = null;
            if (ci < this.mSubjectArr.length)
                this.mSubjectArr[ci] = null;
        }
        const si = this.mSleepArr.indexOf(_cl);
        if (si >= 0) {
            this.mSleepArr.splice(si, 1);
            _cl.SetEnable(true);
        }
        this.UpdateComp();
    }
    ReleaseMapComp() {
        this.ReleaseDestroy(this.mPaintArr);
        if (this.ReleaseDestroy(this.mColliderArr, this.mSubjectArr))
            this.mColWake = true;
        if (this.mPTArr)
            this.mPTArr.length = 0;
        this.mPTArr = null;
        this.UpdateComp();
    }
    PushMapComp(_com) {
        if (_com instanceof CPaint)
            this.mPaintArr.push(_com);
        else if (_com instanceof CCollider) {
            this.mColliderArr.push(_com);
            const owner = _com.GetOwner();
            this.mSubjectArr[this.mColliderArr.length - 1] = owner != null && owner !== this ? owner : null;
        }
    }
    ExceptMapComp() {
        const set = new Set();
        for (const pt of this.mPaintArr)
            if (pt != null)
                set.add(pt);
        for (const cl of this.mColliderArr)
            if (cl != null)
                set.add(cl);
        return this.mComArr.filter(_com => set.has(_com) == false);
    }
    ReleaseDestroy(_arr, _pair = null) {
        let change = false, empty = true;
        let gi = null;
        for (let i = 0; i < _arr.length; ++i) {
            const com = _arr[i];
            if (com == null)
                continue;
            if (com.IsDestroy()) {
                if (gi == null && com instanceof CCollider)
                    gi = com.GetGI();
                _arr[i] = null;
                if (_pair != null && i < _pair.length)
                    _pair[i] = null;
                change = true;
            }
            else
                empty = false;
        }
        if (empty) {
            _arr.length = 0;
            if (_pair != null)
                _pair.length = 0;
        }
        if (gi != null && gi.mOctree.mStaticBuild == false)
            gi.mOctree.mStaticUpdate = true;
        return change;
    }
    ColSleep() {
        let gi = null;
        for (const cl of this.mColliderArr) {
            if (cl != null && cl.IsDestroy() == false && cl.GetGI() != null) {
                gi = cl.GetGI();
                break;
            }
        }
        if (gi == null)
            return;
        const rebuilding = gi.mOctree.mStaticUpdate || gi.mOctree.mStaticBuild;
        if (this.mColSleep) {
            let wake = rebuilding || this.mColWake || this.mUpdateMat != CUpdate.eType.Not;
            for (let i = 0; wake == false && i < this.mSleepArr.length; ++i)
                if (this.mSleepArr[i].mUpdateMat != CUpdate.eType.Not)
                    wake = true;
            if (wake == false)
                return;
            for (const cl of this.mSleepArr)
                if (cl.IsDestroy() == false)
                    cl.SetEnable(true);
            this.mSleepArr.length = 0;
            gi.mOctree.mStaticUpdate = true;
            this.mColSleep = false;
            this.mColWake = false;
            this.UpdateComp();
            return;
        }
        this.mColWake = false;
        if (rebuilding)
            return;
        for (const cl of this.mColliderArr)
            if (this.IsSleepTarget(cl) && cl.mUpdateMat != CUpdate.eType.Not)
                return;
        for (const cl of this.mColliderArr) {
            if (this.IsSleepTarget(cl) == false)
                continue;
            cl.SetEnable(false);
            this.mSleepArr.push(cl);
        }
        this.mColSleep = true;
        this.UpdateComp();
    }
    IsSleepTarget(_cl) {
        return _cl != null && _cl.IsEnable() && _cl.mEvent == CCollider.eEvent.Static;
    }
}
