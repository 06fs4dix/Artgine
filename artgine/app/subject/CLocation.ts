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
        let cl=this.PushComp(new CCollider(bound));
        cl.SetLayer("location");
    }
}