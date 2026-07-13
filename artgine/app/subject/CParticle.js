import { CSubject } from "./CSubject.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CRigidBody } from "../component/CRigidBody.js";
import { CForce } from "../component/CForce.js";
import { CCurve } from "../../util/CCurve.js";
import { CObject } from "../../basic/CObject.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { CSampler, CSampMinMax } from "../../util/CSampler.js";
import { CSchedule } from "../../util/CSchedule.js";
import { CPool } from "../../basic/CPool.js";
export class CParticleShape extends CObject {
    mTarget = null;
    constructor(_target = null) {
        super();
        this.mTarget = _target;
    }
    TargetPos(_objList) {
        if (this.mTarget != null) {
            for (let each0 of _objList) {
                if (this.mTarget.IsDestroy()) {
                    each0.Destroy();
                }
                else
                    each0.SetPos(CMath.V3AddV3(each0.GetPos(), this.mTarget.GetMat().xyz));
            }
        }
    }
    LineUp(_objList) {
        this.TargetPos(_objList);
    }
}
export class CParticleShapeOut extends CParticleShape {
    mDir = new CSampMinMax(new CVec3(-1, -1, -1), new CVec3(1, 1, 1));
    mPos = new CSampler(new CVec3());
    mSca = new CSampMinMax(1, 1);
    mSpeed = new CSampler(100);
    mMovementKey = "CParticleShapeOut";
    mCurve = new CCurve();
    LineUp(_objList) {
        super.LineUp(_objList);
        for (var each0 of _objList) {
            var rb = each0.FindComp(CRigidBody);
            if (rb == null) {
                rb = new CRigidBody();
                each0.PushComp(rb);
            }
            let force = new CForce(this.mMovementKey, this.mDir.Execute(), this.mSpeed.Execute());
            force.SetCurve(this.mCurve);
            rb.Push(force);
            let sca = this.mSca.Execute();
            each0.SetSca(new CVec3(sca, sca, sca));
            var pos = this.mPos.Execute();
            if (pos.IsZero() == false)
                each0.SetPos(CMath.V3AddV3(each0.GetPos(), pos));
        }
    }
}
export class CParticleTexBuf extends CParticleShapeOut {
    mBuf;
    mWidth;
    mHeight;
    mScaleX = 1;
    mScaleY = 1;
    constructor(_target, _buf, _width, _height) {
        super(_target);
        this.mBuf = _buf;
        this.mWidth = _width;
        this.mHeight = _height;
    }
    LineUp(_objList) {
        if (this.mBuf == null) {
            for (var each0 of _objList)
                each0.Destroy();
            return;
        }
        super.LineUp(_objList);
        for (var each0 of _objList) {
            let pos = each0.GetMat().xyz;
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
export class CParticle extends CSubject {
    mSample = null;
    mCreateCount = new CSampler(5);
    mTimer = new CSchedule();
    mShape = new CParticleShape();
    IsShould(_member, _type) {
        if (_member == 'mChild' || _member == 'mComArr' || _member == 'mTime')
            return false;
        return super.IsShould(_member, _type);
    }
    constructor() {
        super();
        this.mTimer.mCount = 0xfffffff;
        this.mTimer.mDelay = 0.1;
        this.mTimer.mEnd = 1 * 60 * 60;
    }
    SetCrateCount(_count) {
        this.mCreateCount = _count;
    }
    SetShape(_shape) {
        this.mShape = _shape;
    }
    async SubjectUpdate(_update) {
        super.SubjectUpdate(_update);
        if (this.mTimer.IsEndReset() && this.mChild.length == 0)
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
            else if (typeof sub == "string") {
                var obj = CPool.Product(sub);
                this.PushChild(obj);
                objArr.push(obj);
            }
        }
        this.mShape.LineUp(objArr);
    }
    toJSON() {
        return { class: "" };
    }
}
