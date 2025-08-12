import { CScript } from "../../util/CScript.js";
import { CComponent } from "./CComponent.js";
export class CScriptComp extends CComponent {
    mScript = new CScript();
    constructor() {
        super();
        this.mScript.mKey = this.Key();
    }
    Update(_delay) {
        super.Update(_delay);
        this.mScript.mKey = this.Key();
        this.mScript.mData[0] = this.GetOwner();
        this.mScript.mGitHub = this.GetOwner().GetFrame().PF().mGitHub;
        this.mScript.Exe();
    }
    Icon() { return "bi bi-pc"; }
}
