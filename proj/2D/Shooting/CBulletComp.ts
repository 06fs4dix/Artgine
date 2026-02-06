import CBehavior from "https://06fs4dix.github.io/Artgine/artgine/app/component/CBehavior.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint2D.js";
import { CUpdate } from "https://06fs4dix.github.io/Artgine/artgine/basic/Basic.js";

import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CPlaneInside } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CPlaneInside.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";
import { CProComp } from "./CProComp.js";

export class CBulletComp extends CBehavior
{
    m_rb : CRigidBody=null;
    m_pt : CPaint2D=null;
    override Start()
    {
        this.m_pt=this.GetOwner().FindComp(CPaint2D);
        //this.m_pt.PushTag()
        this.m_rb=this.GetOwner().FindComp(CRigidBody);
    }
    override Update(_update : CUpdate): void 
    {
        let dir=this.m_rb.MoveDir();
        let angle=CMath.V3TwoAngle(new CVec3(1,0,0),dir);
        this.GetOwner().SetRot(new CVec3(0,0,angle));


    }
    override CameraOut(_pArr : Array<CPlaneInside>)
    {
        for(var each0 of _pArr)
        {
            if(each0.mLen>1)
            {
                this.GetOwner().Destroy();
            }
        }
    }
    override Collision(_org : CCollider,_size : number,_tar : Array<CCollider>,_push : Array<CVec3>)
    {
        let pro=_tar[0].GetOwner().FindComp(CProComp);
        pro.SetHP(pro.GetHP()-10);

        this.GetOwner().PushPacket(CPacShooting.Effect("Flash",this.GetOwner().GetPos(),new CVec2(25,25)));
        this.GetOwner().Destroy();
    }
}