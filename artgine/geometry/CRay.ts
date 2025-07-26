
import {CObject} from "../basic/CObject.js";
import {CVec3} from "../geometry/CVec3.js"


export class CRay extends CObject
{
	public mVec3List : Array<CVec3>;
	
	constructor()
	{
		super();
		this.mVec3List=new Array();
		this.mVec3List.push(new CVec3());
		this.mVec3List.push(new CVec3());
		this.mVec3List.push(new CVec3());
	}

	GetDirect(){	return this.mVec3List[0];	}
	GetPosition(){	return this.mVec3List[1];	}
	GetOriginal(){	return this.mVec3List[2];	}
	GetVecList(){	return this.mVec3List;	}
	
	SetDirect(_vec : CVec3){	this.mVec3List[0]=_vec.Export();	}
	SetPosition(_vec : CVec3){	this.mVec3List[1]=_vec.Export();	}
	SetOriginal(_vec : CVec3){	this.mVec3List[2]=_vec.Export();	}
	
	override Export(_copy?: boolean, _resetKey?: boolean): this 
	{
		var dummy=new CRay();
		for (var i = 0; i < 3; ++i)
			dummy.mVec3List[i].Import(this.mVec3List[i]);
		return dummy as this;
	}
	override Import(_tar : CRay) : any
	{	
		for (var i = 0; i < 3; ++i)
			this.mVec3List[i].Import(_tar.mVec3List[i]);	
	}
}

