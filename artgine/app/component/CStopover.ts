import { CObject } from "../../basic/CObject.js";
import { CVec3 } from "../../geometry/CVec3.js";

export class CStopover extends CObject
{
    constructor(_dest: CVec3[], _velocity: number)
    {
        super();
        this.mPos = _dest;
        this.mVelocity = _velocity;
    }
    mKey = "path";
    mPos = new Array<CVec3>();
    mVelocity = 0;
    mIndex = 0; 
	mDir=new CVec3();
}