import { CUpdate, IListener } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CClass } from "../../basic/CClass.js";
import { CConsol } from "../../basic/CConsol.js";
import { CEvent } from "../../basic/CEvent.js";
import { CObject } from "../../basic/CObject.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CRoleMgr } from "../../util/CRole.js";
import { CRouteMsg } from "../CRouteMsg.js";
import { CAniFlow } from "./CAniFlow.js";
import { CAnimation } from "./CAnimation.js";
import { CComponent } from "./CComponent.js";
import { CRigidBody } from "./CRigidBody.js";


export class CRoleComp extends CComponent
{
    mRoleMgr=new CRoleMgr();
    override Update(_update : CUpdate): void 
    {
        super.Update(_update);
        
        
        this.mRoleMgr.Update(_update,this.GetOwner());

    }
    GetRoleMgr() {   return this.mRoleMgr;    }
}

