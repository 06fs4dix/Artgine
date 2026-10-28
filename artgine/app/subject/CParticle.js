import { CSubject } from "./CSubject.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CRigidBody } from "../component/CRigidBody.js";
import { CForce } from "../component/CForce.js";
import { CCurve } from "../../util/CCurve.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { CSampler, CSampMinMax } from "../../util/CSampler.js";
import { CSchedule } from "../../util/CSchedule.js";
import { CPool } from "../../basic/CPool.js";
import { CMat } from "../../geometry/CMat.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CTexture } from "../../render/CTexture.js";
import { CAtlas } from "../../util/CAtlas.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CPaint2D, CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3D, CPaint3DMerge } from "../component/paint/CPaint3D.js";
export class CParticlePaint {
    mMerge;
    mSlot;
    mMat;
    constructor(_merge, _slot, _mat) {
        this.mMerge = _merge;
        this.mSlot = _slot;
        this.mMat = _mat;
    }
    IsUse() { return this.mMerge.IsUse(this.mSlot); }
    SetPos(_pos) {
        const f = this.mMat.mF32A;
        f[12] = _pos.x;
        f[13] = _pos.y;
        f[14] = _pos.z;
        this.mMat.UnitCheck();
        this.Apply();
    }
    SetMat(_mat) {
        this.mMat.mF32A.set(_mat.mF32A);
        this.mMat.UnitCheck();
        this.Apply();
    }
    SetAlpha(_alpha) {
        if (this.mSlot >= 0 && this.mMerge instanceof CPaint2DMerge)
            this.mMerge.ModifyAlpha(this.mSlot, _alpha);
    }
    Remove() {
        this.mMerge.Remove(this.mSlot);
        this.mSlot = -1;
    }
    Apply() {
        if (this.mSlot >= 0 && this.mMerge.IsReady())
            this.mMerge.Modify(this.mSlot, this.mMat);
    }
}
export class CParticle extends CSubject {
    mSample = null;
    mCreateCount = new CSampler(5);
    mTimer = new CSchedule();
    mPaintMerge = new Map();
    IsShould(_member, _type) {
        if (_member == 'mChild' || _member == 'mComArr' || _member == 'mTime' || _member == 'mPaintMerge')
            return false;
        return super.IsShould(_member, _type);
    }
    constructor() {
        super();
        this.mTimer.mCount = 0xfffffff;
        this.mTimer.mDelay = 0.1;
        this.mTimer.mEnd = 1 * 60 * 60;
    }
    LineUp(_objList) {
    }
    PaintCount() {
        let count = 0;
        for (const merge of this.mPaintMerge.values())
            count += merge.Size();
        return count;
    }
    PaintSize(_pt) {
        const size = _pt.GetSize();
        if (size != null && size.IsZero() == false)
            return size;
        const frame = this.GetFrame();
        if (frame == null || _pt.GetTexture().length == 0)
            return null;
        const tex = frame.Res().Find(_pt.GetTexture()[0]);
        if (tex instanceof CTexture) {
            if (tex.GetWidth() == 1 && tex.GetHeight() == 1)
                return null;
            return new CVec2(tex.GetWidth(), tex.GetHeight());
        }
        if (tex instanceof CAtlas) {
            const codi = _pt.GetTexCodi();
            return new CVec2(Math.round(tex.GetWidth() * codi.x), Math.round(tex.GetHeight() * codi.y));
        }
        return null;
    }
    FindMerge(_pt) {
        let merge = this.mPaintMerge.get(_pt);
        if (merge != null)
            return merge;
        if (_pt instanceof CPaint2D) {
            const m2D = new CPaint2DMerge(null);
            m2D.SetYSort(_pt.mYSort);
            if (_pt.GetTag().has("wind"))
                m2D.Wind(_pt.mWindInfluence.x);
            m2D.SetTexture([..._pt.GetTexture()]);
            merge = m2D;
        }
        else {
            const pt3D = _pt;
            const m3D = new CPaint3DMerge([], []);
            if (pt3D.GetTag().has("wind"))
                m3D.Wind(pt3D.mWindInfluence.x);
            if (pt3D.GetTexture().length > 0)
                m3D.mTexOverride = [...pt3D.GetTexture()];
            merge = m3D;
        }
        if (_pt.GetRenderPass().length > 0)
            merge.PushRenderPass(_pt.GetRenderPass());
        for (const key of ["alphaCut", "mask"]) {
            const sa = _pt.FindCShaderAttr(key);
            if (sa != null)
                merge.PushCShaderAttr(sa);
        }
        for (const tag of _pt.GetTag())
            if (tag != "codi")
                merge.PushTag(tag);
        if (_pt.GetTag().has("colorModel"))
            merge.SetColorModel(_pt.GetColorModel());
        if (_pt.GetTag().has("alphaModel"))
            merge.SetAlphaModel(_pt.GetAlphaModel());
        this.mPaintMerge.set(_pt, merge);
        this.PushComp(merge);
        return merge;
    }
    Emit(_sample) {
        return this.PushPaint(_sample);
    }
    PushPaint(_pt) {
        const mat = new CMat();
        if (_pt instanceof CPaint2D) {
            const size = this.PaintSize(_pt);
            if (size == null)
                return null;
            mat.mF32A[0] = size.x;
            mat.mF32A[5] = size.y;
            mat.UnitCheck();
            const merge = this.FindMerge(_pt);
            return new CParticlePaint(merge, merge.Push(mat, _pt.GetTexCodi()), mat);
        }
        if (_pt instanceof CPaint3D) {
            const merge = this.FindMerge(_pt);
            const slot = merge.Push(_pt.mMesh, mat);
            if (slot < 0)
                return null;
            return new CParticlePaint(merge, slot, mat);
        }
        return null;
    }
    async SubjectUpdate(_update) {
        super.SubjectUpdate(_update);
        if (this.mTimer.IsEndReset() && this.mChild.length == 0 && this.PaintCount() == 0)
            this.Destroy();
        if (this.mTimer.Execute() == false || this.mSample == null)
            return;
        let count = this.mCreateCount.Execute();
        var objArr = new Array();
        for (var i = 0; i < count; ++i) {
            let sub = this.mSample.Execute();
            if (sub == null) { }
            else if (sub instanceof CSubject) {
                var obj = sub.Export();
                obj.SetKey(CUniqueID.GetHash());
                this.PushChild(obj);
                objArr.push(obj);
            }
            else if (sub instanceof CPaint) {
                var pp = this.PushPaint(sub);
                if (pp != null)
                    objArr.push(pp);
            }
            else if (typeof sub == "string") {
                var obj = CPool.Product(sub);
                this.PushChild(obj);
                objArr.push(obj);
            }
        }
        this.LineUp(objArr);
    }
    toJSON() {
        return { class: "" };
    }
}
export class CParticleOut extends CParticle {
    mDir = new CSampMinMax(new CVec3(-1, -1, -1), new CVec3(1, 1, 1));
    mOffset = new CSampler(new CVec3());
    mSpawnScale = new CSampMinMax(1, 1);
    mMoveSpeed = new CSampler(100);
    mMovementKey = "CParticleOut";
    mCurve = new CCurve();
    LineUp(_objList) {
        super.LineUp(_objList);
        for (var each0 of _objList) {
            if (each0 instanceof CSubject == false)
                continue;
            var rb = each0.FindComp(CRigidBody);
            if (rb == null) {
                rb = new CRigidBody();
                each0.PushComp(rb);
            }
            let force = new CForce(this.mMovementKey, this.mDir.Execute(), this.mMoveSpeed.Execute());
            force.SetCurve(this.mCurve);
            rb.Push(force);
            let sca = this.mSpawnScale.Execute();
            each0.SetSca(new CVec3(sca, sca, sca));
            var pos = this.mOffset.Execute();
            if (pos.IsZero() == false)
                each0.SetPos(CMath.V3AddV3(each0.GetPos(), pos));
        }
    }
}
export class CParticleTexBuf extends CParticleOut {
    mBuf;
    mWidth;
    mHeight;
    mScaleX = 1;
    mScaleY = 1;
    constructor(_buf, _width, _height) {
        super();
        this.mBuf = _buf;
        this.mWidth = _width;
        this.mHeight = _height;
    }
    LineUp(_objList) {
        if (this.mBuf == null) {
            for (var each0 of _objList) {
                if (each0 instanceof CSubject)
                    each0.Destroy();
                else
                    each0.Remove();
            }
            return;
        }
        super.LineUp(_objList);
        for (var each0 of _objList) {
            if (each0 instanceof CSubject == false)
                continue;
            while (true) {
                let x = Math.trunc(Math.random() * this.mWidth);
                let y = Math.trunc(Math.random() * this.mHeight);
                if (this.mBuf[x * 4 + y * 4 * this.mWidth + 3] > 0) {
                    x = (x - this.mWidth * 0.5) * this.mScaleX;
                    y = -(y - this.mHeight * 0.5) * this.mScaleY;
                    each0.SetPos(CMath.V3AddV3(each0.GetPos(), new CVec3(x, y)));
                    break;
                }
            }
        }
    }
}
