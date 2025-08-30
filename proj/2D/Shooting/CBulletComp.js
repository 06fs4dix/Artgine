import CBehavior from "../../../artgine/canvas/component/CBehavior.js";
import { CRigidBody } from "../../../artgine/canvas/component/CRigidBody.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";
import { CProComp } from "./CProComp.js";
export class CBulletComp extends CBehavior {
    m_rb = null;
    m_pt = null;
    Start() {
        this.m_pt = this.GetOwner().FindComp(CPaint2D);
        this.m_rb = this.GetOwner().FindComp(CRigidBody);
    }
    Update(_delay) {
        let dir = this.m_rb.MoveDir();
        let angle = CMath.V3TwoAngle(new CVec3(1, 0, 0), dir);
        this.m_pt.SetRot(new CVec3(0, 0, angle));
    }
    CameraOut(_pArr) {
        for (var each0 of _pArr) {
            if (each0.mLen > 1) {
                this.GetOwner().Destroy();
            }
        }
    }
    Collision(_org, _size, _tar, _push) {
        let pro = _tar[0].GetOwner().FindComp(CProComp);
        pro.SetHP(pro.GetHP() - 10);
        this.GetOwner().PushPac(CPacShooting.Effect("Flash", this.GetOwner().GetPos(), new CVec2(25, 25)));
        this.GetOwner().Destroy();
    }
}
