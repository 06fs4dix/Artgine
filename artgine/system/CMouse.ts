import {CObject} from "../basic/CObject.js";

export class CMouse extends CObject
{
	public x : number;
	public y : number;
	public key : number;
	public press : boolean;
	constructor()
	{
		super();
		this.x=0;
		this.y=0;
		this.key=0;
		this.press=true;
	}
}