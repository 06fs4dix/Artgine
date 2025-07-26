
import { CObject } from "../../basic/CObject.js";
import {CPlaneInside} from "../../geometry/CPlaneInside.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CRayMouse} from "../CRayMouse.js";
import {CCollider,  CCollusionObject } from "./CCollider.js";
import {CComponent} from "./CComponent.js";


export default class CBehavior extends CComponent
{
    Start(): void {
        
    }
    Update(_delay: any): void 
    {
        
    }
    CameraOut(_pArr : Array<CPlaneInside>)
    {
     
    }
    Collision(_org : CCollider,_size : number,_tar : Array<CCollider>,_push : Array<CVec3>)
    {

    }
    Trigger(_org : CCollider,_size : number,_tar : Array<CCollider>)
    {

    }
    PickMouse(_rayMouse : CRayMouse)
    {

    }
    PickRay(_pos : CVec3,_col : CCollider)
    {
        
    }
    override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mEnable" || _member=="mKey" || _member=="mBlackboardWrite")
            return true;
        
		return false;
	}
    
}