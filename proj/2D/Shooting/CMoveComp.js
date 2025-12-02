import CBehavior from "../../../artgine/canvas/component/CBehavior.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import { CComponent } from "../../../artgine/canvas/component/CComponent.js";
import { CForce } from "../../../artgine/canvas/component/CForce.js";
import { CRigidBody } from "../../../artgine/canvas/component/CRigidBody.js";
import { CPad } from "../../../artgine/canvas/subject/CPad.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CPlane } from "../../../artgine/geometry/CPlane.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
export class CMoveComp extends CBehavior {
    constructor() {
        super();
        this.mSysc = CComponent.eSysn.First;
    }
    m_input = "";
    m_rb = null;
    m_pad = null;
    m_lastDir = new CVec3();
    Start() {
        this.m_rb = this.GetOwner().FindComp(CRigidBody);
    }
    MovePro(_key) {
        if (this.m_pad == null) {
            this.m_pad = this.GetOwner().FindChild(CPad);
            if (this.m_pad == null)
                return;
        }
        if (this.m_rb == null) {
            let pos = this.GetOwner().GetPos();
            if (this.m_pad.GetDir().Equals(CVec3.Up()))
                this.GetOwner().SetPos(CMath.V3AddV3(pos, new CVec3(0, 10, 0)));
            if (this.m_pad.GetDir().Equals(CVec3.Down()))
                this.GetOwner().SetPos(CMath.V3AddV3(pos, new CVec3(0, -10, 0)));
            if (this.m_pad.GetDir().Equals(CVec3.Right()))
                this.GetOwner().SetPos(CMath.V3AddV3(pos, new CVec3(10, 0, 0)));
            if (this.m_pad.GetDir().Equals(CVec3.Left()))
                this.GetOwner().SetPos(CMath.V3AddV3(pos, new CVec3(-10, 0, 0)));
        }
        else {
            let dir = this.m_pad.GetDir();
            if (this.m_lastDir.Equals(dir) == false) {
                this.m_rb.Clear();
                if (dir.IsZero() == false)
                    this.m_rb.Push(new CForce("move", dir, 400));
                this.m_lastDir.Import(dir);
            }
        }
    }
    Update(_update) {
        super.Update(_update);
        this.m_input = "";
        this.MovePro(this.m_input);
    }
    CameraOut(_pArr) {
        if (_pArr == null)
            return;
        let rad = this.GetOwner().FindComp(CCollider).mBound.GetInRadius() * 0.5;
        var pos = this.GetOwner().GetPos().Export();
        for (var each0 of _pArr) {
            switch (each0.mPlane) {
                case CPlane.eDir.Left:
                    pos.x += (1 + each0.mLen) * rad;
                    break;
                case CPlane.eDir.Right:
                    pos.x -= (1 + each0.mLen) * rad;
                    break;
                case CPlane.eDir.Top:
                    pos.y -= (1 + each0.mLen) * rad;
                    break;
                case CPlane.eDir.Bottom:
                    pos.y += (1 + each0.mLen) * rad;
                    break;
            }
        }
        this.GetOwner().SetPos(pos);
    }
}
