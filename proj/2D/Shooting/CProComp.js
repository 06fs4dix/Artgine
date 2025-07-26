import CBehavior from "../../../artgine/canvas/component/CBehavior.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import { CComponent } from "../../../artgine/canvas/component/CComponent.js";
import { CRigidBody } from "../../../artgine/canvas/component/CRigidBody.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";
export class CProComp extends CBehavior {
    mHP = 100;
    mSpeed = 100;
    mRB = null;
    mCL = null;
    mPT = null;
    constructor() {
        super();
        this.mSysc = CComponent.eSysn.First;
    }
    IsShould(_member, _type) {
        if (_member == "mHP" || _member == "mSpeed")
            return true;
        return super.IsShould(_member, _type);
    }
    SetHP(_val) {
        this.mHP += _val;
    }
    CameraOut(_pArr) {
        for (var each0 of _pArr) {
            if (each0.mLen > 100) {
                this.GetOwner().Destroy();
            }
        }
    }
    Start() {
        this.mPT = this.GetOwner().FindComp(CPaint2D);
        if (this.GetOwner().FindComp(CRigidBody) == null) {
            this.mRB = new CRigidBody();
            this.GetOwner().PushComp(this.mRB);
        }
        else
            this.mRB = this.GetOwner().FindComp(CRigidBody);
        if (this.GetOwner().FindComp(CCollider) == null) {
            this.mCL = new CCollider(this.mPT);
            this.GetOwner().PushComp(this.mCL);
        }
        else
            this.mCL = this.GetOwner().FindComp(CCollider);
        this.mCL.SetCameraOut(true);
        this.mPT.SetRot(new CVec3(0, 0, 0));
        this.EditRefresh();
    }
    Update(_delay) {
        if (this.mRB == null)
            return;
        if (this.mHP <= 0) {
            this.GetOwner().Destroy();
            this.GetOwner().PushPac(CPacShooting.Effect("Explosion", this.GetOwner().GetPos(), this.mPT.GetSize()));
        }
    }
}
