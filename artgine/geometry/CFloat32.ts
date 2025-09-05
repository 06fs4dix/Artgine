

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
		// if(this.constructor.name!=_target.constructor.name)
		// 	return false;
		
		// const ba = Buffer.from(this.mF32A.buffer, this.mF32A.byteOffset, this.mF32A.byteLength);
    	// const bb = Buffer.from(_target.mF32A.buffer, _target.mF32A.byteOffset, _target.mF32A.byteLength);

		// return ba.equals(bb);

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
	Snap(decimals = 8) 
	{
		const m = 10 ** decimals;      // 8자리면 1e8
		const a = this.mF32A;
		for (let i = 0; i < a.length; ++i) {
			a[i] = Math.trunc(a[i] * m) / m; // 음수도 절삭
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
