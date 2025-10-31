import { CObject } from "../../basic/CObject.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CCurve} from "../../util/CCurve.js";


//pos에 거리값은 동일해야 정상적으로 움직인다!!!!
export class CStopover extends CObject
{
	constructor(_dest : CVec3[],_velocity : number)
	{
		super();
		this.mPos=_dest;
		this.mVelocity=_velocity;
	}
	mPos=new Array<CVec3>;
	mCurve=new CCurve();
	mBezier=false;
	mTime=0;
	mDelay=0;
	mVelocity=0;
}