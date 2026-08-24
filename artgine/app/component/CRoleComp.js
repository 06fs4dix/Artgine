import { CRoleMgr } from "../../util/CRole.js";
import { CComponent } from "./CComponent.js";
import { CSampCountDown } from "../../util/CSampler.js";
export class CRoleComp extends CComponent {
    mRoleMgr = new CRoleMgr();
    mCountDownList = new Array();
    Update(_update) {
        super.Update(_update);
        this.mRoleMgr.Update(_update, this.GetOwner());
    }
    GetRoleMgr() { return this.mRoleMgr; }
    PushCountDown(_time, _value) {
        this.mCountDownList.push(new CSampCountDown([_time], [_value]));
    }
    Provider(_type, _state) {
        for (let i = this.mCountDownList.length - 1; i >= 0; i--) {
            let result = this.mCountDownList[i].Execute();
            if (result == null)
                this.mCountDownList.splice(i, 1);
            else
                _state.push(result);
        }
    }
}
