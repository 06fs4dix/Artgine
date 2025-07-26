import { CWorkFlow, CWFSystem } from "../../util/CWorkFlow.js";
import { CComponent } from "./CComponent.js";
export class CWFComp extends CComponent {
    mWF;
    constructor(_sys) {
        super();
        this.mSysc = CComponent.eSysn.WorkFlow;
        if (_sys instanceof CWFSystem)
            this.mWF = new CWorkFlow(_sys);
        else if (_sys == null)
            this.mWF = new CWorkFlow(null);
        else
            this.mWF = _sys;
    }
    ResetWF() {
        if (this.mWF != null)
            this.mWF.Reset();
    }
    Icon() { return "bi bi-pc"; }
    Update(_delay) {
        this.mWF.Update(_delay);
    }
    SetOwner(_obj) {
        super.SetOwner(_obj);
        this.mWF.mEnv.Register(this.GetOwner());
    }
    GetWFSystem() {
        return this.mWF.mSys;
    }
    GetWFEnv() {
        return this.mWF.mEnv;
    }
}
