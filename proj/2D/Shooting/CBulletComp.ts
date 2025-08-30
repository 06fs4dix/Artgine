import CBehavior from "../../../artgine/canvas/component/CBehavior.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import { CRigidBody } from "../../../artgine/canvas/component/CRigidBody.js";
import { CPaint } from "../../../artgine/canvas/component/paint/CPaint.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CPlaneInside } from "../../../artgine/geometry/CPlaneInside.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";
import { CProComp } from "./CProComp.js";

export class CBulletComp extends CBehavior
{
    m_rb : CRigidBody=null;
    m_pt : CPaint2D=null;
    Start()
    {
        this.m_pt=this.GetOwner().FindComp(CPaint2D);
        //this.m_pt.PushTag()
        this.m_rb=this.GetOwner().FindComp(CRigidBody);
    }
    Update(_delay: any): void 
    {
        let dir=this.m_rb.MoveDir();
        let angle=CMath.V3TwoAngle(new CVec3(1,0,0),dir);
        this.m_pt.SetRot(new CVec3(0,0,angle));


    }
    CameraOut(_pArr : Array<CPlaneInside>)
    {
        for(var each0 of _pArr)
        {
            if(each0.mLen>1)
            {
                this.GetOwner().Destroy();
            }
        }
    }
    Collision(_org : CCollider,_size : number,_tar : Array<CCollider>,_push : Array<CVec3>)
    {
        let pro=_tar[0].GetOwner().FindComp(CProComp);
        pro.SetHP(pro.GetHP()-10);

        this.GetOwner().PushPac(CPacShooting.Effect("Flash",this.GetOwner().GetPos(),new CVec2(25,25)));
        this.GetOwner().Destroy();
    }
}