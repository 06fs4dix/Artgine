

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
		//메모리 위치만 옮기고 값은 유지한다. 안 그러면 CBound처럼 생성자 초기값(min=+1e30,max=-1e30)이 0으로 지워진다
		const old=this.mF32A;
		this.mF32A=CWASM.ProductF32A(old.length);
		const n=Math.min(old.length,this.mF32A.length);
		for(let i=0;i<n;++i)	this.mF32A[i]=old[i];
		CWASM.RegisterF32A(this);
	}
	ReleaseWASM()
	{
		//반납한 뒤에도 같은 뷰를 쥐고 있으면 다시 반납(풀에 중복 → 두 주인이 같은 메모리)하거나 반납 뒤 쓰기가 새 주인 값을 덮는다.
		//반납 즉시 값만 복사한 일반 배열로 바꿔 두 번째 호출과 이후 쓰기가 아무 영향이 없게 한다
		const old=this.mF32A;
		if(old==null || old["ptr"]==null)	return;
		CWASM.UnregisterF32A(this);
		const copy=new Float32Array(old["len"]!=null ? old["len"] : old.length);
		const n=Math.min(copy.length,old.length);
		for(let i=0;i<n;++i)	copy[i]=old[i];
		this.mF32A=copy;
		CWASM.Recycle(old);
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

	override Import(_target : CFloat32)
	{
		if(_target==null)	return;
		
		this.mF32A.set(_target.F32A());
		
		
	}

	override Export(_copy=true,_resetKey=true) : this
	{
		const copy = new (this.constructor as any)();
		copy.Import(this);
		return copy;
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
			str+=this.mF32A[i]+",";
		}
			
		return str;
	}
	

}
