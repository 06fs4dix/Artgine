import {CPlane} from "./CPlane.js";

export class CPlaneInside
{
    public mLen : number;
    public mPlane : number;
	constructor(_plane=CPlane.eDir.Null,_len=0)
	{
		this.mPlane = _plane;
		this.mLen = _len;
	}
}


