import { CJSON } from "../../basic/CJSON.js";
import { CObject } from "../../basic/CObject.js";
import { CBound } from "../../geometry/CBound.js";
import { CCollider } from "../component/CCollider.js";
import { CSubject } from "./CSubject.js";

//기본 100,100,100으로 잡힌다.
//회전 미적용
export class CLocation extends CSubject
{
    constructor()
    {
        super();
        let bound=new CBound();
        bound.InitBound(100);
        this.mCL=this.PushComp(new CCollider(bound));
        this.mCL.SetLayer("location");
    }
    mCL : CCollider;
    // override Start(): void {
    //     this.Start();
    //     this.mCL=this.FindComp(CCollider);
    // }
    
    override IsShould(_member: string, _type: CObject.eShould): boolean {

        if(_member=="mCL")  return false;
        return super.IsShould(_member,_type);
    }
    override ImportCJSON(_json: CJSON): this {
        let t=super.ImportCJSON(_json);
        this.mCL=this.FindComp(CCollider);
        return t;
    }
}