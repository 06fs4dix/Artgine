
import { CObject } from "../basic/CObject.js";
import {CRay} from "../geometry/CRay.js";
import {CMouse} from "../system/CMouse.js";

export class CRayMouse extends CObject
{
	public mouse : CMouse;
	public ray : CRay;
	constructor();
	constructor(_ray : CRay,_mouse : CMouse);
	constructor(_ray : CRay=null ,_mouse : CMouse=null )
	{
		super();
		this.mouse = new CMouse();
		if(_ray == null)
		{
			this.ray = new CRay();
		}
		else
		{
			this.ray = _ray.Export();
			this.mouse.key = _mouse.key;
			this.mouse.x = _mouse.x;
			this.mouse.y = _mouse.y;
			this.mouse.press=_mouse.press;
		}
		
	}
	Export(_copy=true,_resetKey=true) : any
	{
		var dummy=new CRayMouse();
		dummy.mouse.Import(this.mouse);
		dummy.ray.Import(this.ray);
		
		return dummy;
	}
	Import(_tar : CRayMouse) : any
	{	
		this.mouse.Import(_tar.mouse);
		this.ray.Import(_tar.ray);
		
	}
	
};
