import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CUIText } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CUI.js";
import { CUpdate } from "https://06fs4dix.github.io/Artgine/artgine/basic/Basic.js";
import { CAlert } from "https://06fs4dix.github.io/Artgine/artgine/basic/CAlert.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CPlaneInside } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CPlaneInside.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";
import {CProComp} from "./CProComp.js";

export class CUserComp extends CProComp
{
    mShotTime=0;
    mPad : CPad=null;
    // MemberHide(_member: string, _form: any): boolean 
    // {
    //     if(_member=="m_pad")
    //         return true;
    //     return super.MemberHide(_member,_form);
    // }
    override Start()
    {
        this.mSpeed=300;
        super.Start();
        this.mCL.SetLayer("user");
        this.mCL.PushCollisionLayer("mon");
        // if(this.m_pad==null)
        // {
        //     this.m_pad=this.GetOwner().FindChild(CPad);
        //     pad.SetPadScale(1.5);
        // }
    }
    override Update(_update : CUpdate): void 
    {
        super.Update(_update);

        if(this.mPad==null)
        {
            let pad=this.GetOwner().FindChild(CPad);
            if(pad!=null)
                this.mPad=pad;
            else
                return;

        }
        this.mShotTime-=_update.DeltaMil();
        if(this.mPad.IsEnable() && this.mPad.GetButtonEvent(0)==CEvent.eType.Press && this.mShotTime<=0)
        {
            this.GetOwner().PushPacket(CPacShooting.UserShot(this.GetOwner().GetPos()));
            this.mShotTime=200;
        }
        
    }
    SetNick(_nick : string)
    {
        let uit=new CUIText();
        uit.Init(_nick);
        uit.SetPos(new CVec3(0,-40));
        this.GetOwner().PushChild(uit);
    }
    override Collision(_org: CCollider, _size: number, _tar: Array<CCollider>, _push: Array<CVec3>): void {
        this.GetOwner().PushPacket(CPacShooting.Dead(this.GetOwner().Key()));
        this.GetOwner().PushPacket(CPacShooting.Effect("Flash",this.GetOwner().GetPos(),new CVec2(50,50)));
        this.GetOwner().Destroy();

        //CAlert.Info("[Die!]");
    }
    override CameraOut(_pArr: Array<CPlaneInside>): void {
        
    }
}