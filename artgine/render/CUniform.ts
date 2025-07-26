import {CObject} from "../basic/CObject.js";

export class CUniform extends CObject
{
	public count : number;
	public tag : string;
	public type : any;
	public name : string;
	public data : any;
	//gpu
	public binding : number;
	public group : number;
	public size : number;
	
	
	constructor(_type : any,_name : string,_count=1,_tag="")
	{
		super();
		this.count = _count;
		this.tag = _tag;
		this.type=_type;
		this.name=_name;
		this.data=null;
		this.binding=null;
		this.group=null;
	}
};