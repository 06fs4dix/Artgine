import CBehavior from "https://06fs4dix.github.io/Artgine/artgine/app/component/CBehavior.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CComponent } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CComponent.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint2D.js";
import { CUpdate } from "https://06fs4dix.github.io/Artgine/artgine/basic/Basic.js";
import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CObject } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js";
import { CPlaneInside } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CPlaneInside.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";


export class CProComp extends CBehavior
{
    mHP=100;
    mSpeed=100;
   
    mRB : CRigidBody=null;
    mCL : CCollider=null;
    mPT : CPaint2D=null;
    constructor()
    {
        super();
        this.mSysc=CComponent.eSysn.First;
    }
    IsShould(_member: string, _type: CObject.eShould): boolean {

        if(_member=="mHP" || _member=="mSpeed")
            return true;

        return super.IsShould(_member,_type);
    }
    SetHP(_val)
    {
        this.mHP=_val;
    }
    GetHP(){    return this.mHP;    }
    CameraOut(_pArr : Array<CPlaneInside>)
    {
        for(var each0 of _pArr)
        {
            if(each0.mLen>100)
            {
                this.GetOwner().Destroy();
                //CConsol.Log(this.GetOwner().Key()+"Destroy");
            }
        }
    }
    Start()
    {
        this.mPT=this.GetOwner().FindComp(CPaint2D);
        if(this.GetOwner().FindComp(CRigidBody)==null)
        {
            this.mRB=new CRigidBody();
            this.GetOwner().PushComp(this.mRB);
        }
            
        else
            this.mRB=this.GetOwner().FindComp(CRigidBody);
        
            
        if(this.GetOwner().FindComp(CCollider)==null)
        {
            this.mCL=new CCollider(this.mPT);
            this.GetOwner().PushComp(this.mCL);
        }
        else
            this.mCL=this.GetOwner().FindComp(CCollider);
        this.mCL.SetCameraOut(true);
        

        
        //this.GetOwner().SetPower(this.m_speed);
        this.EditRefresh();
    }
    Update(_update : CUpdate): void {
      
        if(this.mRB==null) return;

        if(this.mHP<=0)
        {
            this.GetOwner().Destroy();
            this.GetOwner().PushPacket(CPacShooting.Effect("Explosion",this.GetOwner().GetPos(),this.mPT.GetSize()));
        }
        // let dir=this.m_rb.MoveDir("move");
        // let angle=CMath.V3TwoAngle(new CVec3(0,1,0),dir);
        // this.m_pl.SetRot(new CVec3(0,0,angle));


    }
}