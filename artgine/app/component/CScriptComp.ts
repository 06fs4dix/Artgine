import { CUpdate } from "../../basic/Basic.js";
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
    override Update(_update : CUpdate): void {
        super.Update(_update);
        this.mScript.mKey=this.Key();
        //this.mScript.mData[0]=this.GetOwner();
        this.mScript.mGitHub=this.GetOwner().GetFrame().PF().mGitHub;
        this.mScript.Exe();
    }
    override Icon(){		return "bi bi-pc";	}
}