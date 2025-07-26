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
		this.m_velocity=_velocity;
	}
	mPos=new Array<CVec3>;
	m_curve=new CCurve();
	m_bezier=false;
	m_time=0;
	m_delay=0;
	m_velocity=0;
}