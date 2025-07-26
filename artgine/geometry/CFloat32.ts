

import {CObject} from "../basic/CObject.js";
import {CWASM} from "../basic/CWASM.js";



export class CFloat32 extends CObject
{

	public mF32A : Float32Array=null;

	Ptr() : number
	{
		return this.mF32A["ptr"];
	}
	NewWASM()
	{
		this.mF32A=CWASM.ProductF32A(this.mF32A.length);	
		
	}
	ReleaseWASM()
	{
		CWASM.Recycle(this.mF32A);
	}
	
	IsZero() : boolean	
	{
		for(let i=0;i<this.mF32A.length;++i)
		{
			if(this.mF32A[i]!=0)	return false;
		}
		return true;
	}
	Zero()
	{
		for(let i=0;i<this.mF32A.length;++i)
		{
			this.mF32A[i]=0;
		}
	}

	Equals(_target : CFloat32)
	{
		if(this.constructor.name!=_target.constructor.name)
			return false;
		for(let i=0;i<this.mF32A.length;++i)
		{
			if(this.mF32A[i]!=_target.mF32A[i])
			{
				return false;
			}
		}
		return true;
	}
	
	F32A() : Float32Array
	{	
		return this.mF32A;	
	}

	override Import(_target : CObject)
	{
		if(_target==null)	return;
		
		this.mF32A.set(_target["mF32A"]);
		
		
	}
	set array(_val : Array<number>|Float32Array)
	{
		for(let i=0;i<_val.length;++i)
		{
			if(this.mF32A.length==i)
				break;
			this.mF32A[i]=_val[i];	
		}
			
	}
	Snap(_cut=10000)
	{
		
		for (let i = 0; i < this.mF32A.length; ++i) 
		{
			this.mF32A[i]=Math.floor(this.mF32A[i] * _cut) / _cut;
		}
	}
	override ToLog()
	{
		let str="";
		for (let i = 0; i < this.mF32A.length; ++i) 
		{
			str+=this.mF32A[0];
		}
			
		return str;
	}
}
