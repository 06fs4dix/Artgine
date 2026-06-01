import { CScript } from "../../util/CScript.js";
import { CComponent } from "./CComponent.js";
export class CScriptComp extends CComponent {
    mScript = new CScript();
    constructor() {
        super();
        this.mScript.mKey = this.Key();
    }
    Update(_update) {
        super.Update(_update);
        this.mScript.mKey = this.Key();
        this.mScript.mGitHub = this.GetOwner().GetFrame().PF().mGitHub;
        this.mScript.Exe(this.GetOwner());
    }
    Icon() { return "bi bi-pc"; }
}
