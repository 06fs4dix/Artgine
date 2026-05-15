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
import { CSampCountDown } from "../../util/CSampler.js";


export class CRoleComp extends CComponent
{
    mRoleMgr = new CRoleMgr();
    private mCountDownList = new Array<CSampCountDown<string>>();

    override Update(_update: CUpdate): void 
    {
        super.Update(_update);
        this.mRoleMgr.Update(_update, this.GetOwner());
    }

    GetRoleMgr() { return this.mRoleMgr; }

    PushCountDown(_time: number, _value: string): void
    {
        this.mCountDownList.push(new CSampCountDown<string>([_time], [_value]));
    }

    override Provider(_type: string, _state: Array<string>): void
    {
        for(let i = this.mCountDownList.length - 1; i >= 0; i--)
        {
            let result = this.mCountDownList[i].Execute();
            if(result == null)
                this.mCountDownList.splice(i, 1);
            else
                _state.push(result);
        }
    }
}

