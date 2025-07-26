import {CVec3} from "../geometry/CVec3.js"
import {CFloat32} from "./CFloat32.js";

export class CVec4 extends CFloat32
{
	constructor(_x : number|Array<number>=0 ,_y=0,_z=0,_w=0)
	{
		super();
		
		this.mF32A=new Float32Array(4);
		
		
		
		

		if(typeof _x=="number")
		{
			this.mF32A[0]=_x;
			this.mF32A[1]=_y;
			this.mF32A[2]=_z;
			this.mF32A[3]=_w;
		}
		else
		{
			for(let i=0;i<_x.length;++i)
				this.mF32A[i]=_x[i];	
		}
		


		
	}
	set x(_val : number)	{		this.mF32A[0]=_val;	}
	get x(){	return this.mF32A[0];	}
	set y(_val : number)	{		this.mF32A[1]=_val;	}
	get y(){	return this.mF32A[1];	}
	set z(_val : number)	{		this.mF32A[2]=_val;	}
	get z(){	return this.mF32A[2];	}
	set w(_val : number)	{		this.mF32A[3]=_val;	}
	get w(){	return this.mF32A[3];	}
	get xyz(){	return new CVec3(this.mF32A[0],this.mF32A[1],this.mF32A[2]);	}
	set xyz(_val : CVec3)	{		this.mF32A[0]=_val.mF32A[0];this.mF32A[1]=_val.mF32A[1];this.mF32A[2]=_val.mF32A[2];	}

	
	
}

