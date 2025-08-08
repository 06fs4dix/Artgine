import { CScript } from "../../util/CScript.js";
import { CComponent } from "./CComponent.js";

export class CScriptComp extends CComponent
{
    mScript : CScript=new CScript();

    constructor()
    {
        super();
        this.mScript.mKey=this.Key();
        //this.mScript.mData[0]=this;

    }
    Update(_delay: any): void {
        super.Update(_delay);
        this.mScript.mKey=this.Key();
        this.mScript.mData[0]=this.GetOwner();
        this.mScript.Exe();
    }
    Icon(){		return "bi bi-pc";	}
}