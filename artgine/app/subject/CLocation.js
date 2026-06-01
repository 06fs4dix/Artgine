import { CBound } from "../../geometry/CBound.js";
import { CCollider } from "../component/CCollider.js";
import { CSubject } from "./CSubject.js";
export class CLocation extends CSubject {
    constructor() {
        super();
        let bound = new CBound();
        bound.InitBound(100);
        this.mCL = this.PushComp(new CCollider(bound));
        this.mCL.SetLayer("location");
    }
    mCL;
    IsShould(_member, _type) {
        if (_member == "mCL")
            return false;
        return super.IsShould(_member, _type);
    }
    ImportCJSON(_json) {
        let t = super.ImportCJSON(_json);
        this.mCL = this.FindComp(CCollider);
        return t;
    }
}
