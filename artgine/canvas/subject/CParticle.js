import { CSubject } from "./CSubject.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CExtract, CExtractMinMax, CExtractSample } from "../../geometry/CExtract.js";
import { CRigidBody } from "../component/CRigidBody.js";
import { CForce } from "../component/CForce.js";
import { CCurve } from "../../util/CCurve.js";
import { CObject } from "../../basic/CObject.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
export class CParticleShape extends CObject {
    mTarget = null;
    constructor(_target = null) {
        super();
        this.mTarget = _target;
    }
    TargetPos(_objList) {
        if (this.mTarget != null) {
            for (let each0 of _objList) {
                if (this.mTarget.GetRemove()) {
                    each0.Destroy();
                }
                else
                    each0.SetPos(CMath.V3AddV3(each0.GetPos(), this.mTarget.GetWMat().xyz));
            }
        }
    }
    LineUp(_time, _objList) {
        this.TargetPos(_objList);
    }
}
export class CParticleShapeOut extends CParticleShape {
    mDir = new CExtractMinMax(new CVec3(-1, -1, -1), new CVec3(1, 1, 1));
    mPos = new CExtract(new CVec3());
    mSca = new CExtractMinMax(1, 1);
    mSpeed = new CExtract(100);
    mMovementKey = "CParticleShapeOut";
    mCurve = new CCurve();
    LineUp(_time, _objList) {
        super.LineUp(_time, _objList);
        for (var each0 of _objList) {
            var rb = each0.FindComp(CRigidBody);
            if (rb == null) {
                rb = new CRigidBody();
                each0.PushComp(rb);
            }
            let force = new CForce(this.mMovementKey, this.mDir.V3(), this.mSpeed.V1());
            force.SetCurve(this.mCurve);
            rb.Push(force);
            let sca = this.mSca.V1();
            each0.SetSca(new CVec3(sca, sca, sca));
            var pos = this.mPos.V3();
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
    LineUp(_time, _objList) {
        if (this.mBuf == null) {
            for (var each0 of _objList)
                each0.Destroy();
            return;
        }
        super.LineUp(_time, _objList);
        for (var each0 of _objList) {
            let pos = each0.GetWMat().xyz;
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
export class CExtractSamSub extends CExtractSample {
    constructor(_val, _rate = null) {
        super(_val, _rate);
    }
}
export class CParticle extends CSubject {
    mSample = null;
    mCreateCount = new CExtract(5);
    mCreateTime = 100;
    mStartTime = 0;
    mEndTime = 1000 * 60 * 60;
    mTime = 0;
    mShape = new CParticleShape();
    IsShould(_member, _type) {
        if (_member == 'mChild' || _member == 'mComArr' || _member == 'mTime')
            return false;
        return super.IsShould(_member, _type);
    }
    m_cTime = 0;
    constructor() {
        super();
    }
    SetCrateTime(_time) {
        this.mCreateTime = _time;
    }
    SetCrateCount(_count) {
        this.mCreateCount = _count;
    }
    SetShape(_shape) {
        this.mShape = _shape;
    }
    SubjectUpdate(_delay) {
        super.SubjectUpdate(_delay);
        if (this.mStartTime > this.mTime || this.mSample == null) {
            this.mTime += _delay;
            return;
        }
        if (0 >= this.m_cTime && this.mEndTime > this.mTime) {
            this.m_cTime = this.mCreateTime;
            let count = this.mCreateCount.V1();
            var objArr = new Array();
            for (var i = 0; i < count; ++i) {
                var sub = this.mSample.Obj();
                if (sub != null) {
                    var obj = new CSubject();
                    obj.Import(sub);
                    obj.SetKey(CUniqueID.GetHash());
                    this.PushChild(obj);
                    objArr.push(obj);
                }
            }
            this.mShape.LineUp(this.mTime, objArr);
        }
        this.mTime += _delay;
        this.m_cTime -= _delay;
        if (this.mEndTime < this.mTime && this.mChild.length == 0) {
            this.Destroy();
        }
    }
    toJSON() {
        return { class: "" };
    }
}
