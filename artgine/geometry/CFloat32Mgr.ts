import {CVec2} from "../geometry/CVec2.js"
import {CVec3} from "../geometry/CVec3.js"
import {CVec4} from "../geometry/CVec4.js"
import {CMat} from "../geometry/CMat.js"
import {CAlert} from "../basic/CAlert.js";
import { CFloat32 } from "./CFloat32.js";



export class CFloat32Mgr extends CFloat32
{
	
	public mSize : number;
	constructor()
	{
		super();
		this.mF32A=new Float32Array(0);
		this.mSize=0;
	}
	Swap(_tar : CFloat32Mgr)
	{
		var dummy=this.mF32A;
		this.mF32A=_tar.GetArray();
		_tar.SetArray(dummy);
		var dummyS=this.mSize; 
		this.mSize=_tar.mSize;
		_tar.mSize=dummyS;
	}
	Copy(fa : CFloat32Mgr,_start,_len)
	{
		
	}
	SetArray(_arr)
	{
		this.mF32A=new Float32Array(_arr.length);
		for(var i=0;i<_arr.length;++i)
		{
			this.mF32A[i]=_arr[i];
		}
	}
	GetArray() { return this.mF32A;	 }
	Clear()
	{
		this.mSize=0;
	}
	IsEmpty()
	{
		return this.mF32A.length==0;
	}
	Resize(_count)
	{
		if(this.mF32A.length<_count)
		{
			var dummy=this.mF32A;
			this.mF32A=new Float32Array(_count);
			this.mF32A.set(dummy);
		}
		this.mSize=_count;
	}
	Reserve(_count)
	{
		var dummy=this.mF32A;
		this.mF32A=new Float32Array(_count);
		for(var i=0;i<_count;++i)
			this.mF32A[i]=dummy[i];
		
	}
	Size(_vCount)
	{
		return this.mSize / _vCount;
	}
	
	Push(_v : Float32Array);
	Push(_v : CVec2);
	Push(_v : CVec3);
	Push(_v : CVec4);
	Push(_v : CMat);
	Push(_v : number);
	Push(_v : any)
	{
		if(_v instanceof Float32Array)
		{
			this.mSize+=_v.length;
			if(this.mSize>=this.mF32A.length)
				this.Reserve(this.mSize*2);
			
			for(var i=0;i<_v.length;++i)
				this.mF32A[this.mSize-_v.length+i]=_v[i];
			
		}
		else if(_v instanceof CVec2)
		{
			this.mSize+=2;
			if(this.mSize>=this.mF32A.length)
				this.Reserve(this.mSize*2);
			
			this.mF32A[this.mSize-2]=_v.x;
			this.mF32A[this.mSize-1]=_v.y;
		}
		else if(_v instanceof CVec3)
		{
			this.mSize+=3;
			if(this.mSize>=this.mF32A.length)
				this.Reserve(this.mSize*2);
			
			this.mF32A[this.mSize-3]=_v.x;
			this.mF32A[this.mSize-2]=_v.y;
			this.mF32A[this.mSize-1]=_v.z;
		}
		else if(_v instanceof CVec4)
		{
			this.mSize+=4;
			if(this.mSize>=this.mF32A.length)
				this.Reserve(this.mSize*2);
			
			this.mF32A[this.mSize-4]=_v.x;
			this.mF32A[this.mSize-3]=_v.y;
			this.mF32A[this.mSize-2]=_v.z;
			this.mF32A[this.mSize-1]=_v.w;
		}
		else if(_v instanceof CMat)
		{
			CAlert.E("제대로 안함");
			this.mSize+=16;
			if(this.mSize>=this.mF32A.length)
				this.Reserve(this.mSize*16);
			
			this.mF32A[this.mSize-16]=_v.mF32A[0][0];
			this.mF32A[this.mSize-15]=_v.mF32A[0][1];
			this.mF32A[this.mSize-14]=_v.mF32A[0][2];
			this.mF32A[this.mSize-13]=_v.mF32A[0][3];
			
			this.mF32A[this.mSize-12]=_v.mF32A[1][0];
			this.mF32A[this.mSize-11]=_v.mF32A[1][1];
			this.mF32A[this.mSize-10]=_v.mF32A[1][2];
			this.mF32A[this.mSize-9]=_v.mF32A[1][3];
			
			this.mF32A[this.mSize-8]=_v.mF32A[2][0];
			this.mF32A[this.mSize-7]=_v.mF32A[2][1];
			this.mF32A[this.mSize-6]=_v.mF32A[2][2];
			this.mF32A[this.mSize-5]=_v.mF32A[2][3];
			
			this.mF32A[this.mSize-4]=_v.mF32A[3][0];
			this.mF32A[this.mSize-3]=_v.mF32A[3][1];
			this.mF32A[this.mSize-2]=_v.mF32A[3][2];
			this.mF32A[this.mSize-1]=_v.mF32A[3][3];
		}
		else
		{
			this.mSize+=1;
			if(this.mSize>=this.mF32A.length)
				this.Reserve(this.mSize*2);
			this.mF32A[this.mSize-1]=_v;
		}
			
	}
	

	//===========================================================

	V1(_off,_v)
	{
		
		if( typeof _v =="undefined")
			return this.mF32A[_off]; 
		this.mF32A[_off] = _v;
	}
	V2(_off,_v=null,_y=null)
	{
		if( _v==null)
			return new CVec2(this.mF32A[_off * 2 + 0], this.mF32A[_off * 2 + 1]);
		else if(_v instanceof CVec2)
		{
			this.mF32A[_off * 2 + 0] = _v.x;
			this.mF32A[_off * 2 + 1] = _v.y;
		}
		else
		{
			this.mF32A[_off * 2 + 0] = _v;
			this.mF32A[_off * 2 + 1] = _y;
		}
	}
	V3(_off,_v=null,_y=null,_z=null)
	{
		if( _v == null)
			return new CVec3(this.mF32A[_off * 3 + 0], this.mF32A[_off * 3 + 1], this.mF32A[_off * 3 + 2]);
		else if(_v instanceof CVec3)
		{
			this.mF32A[_off * 3 + 0] = _v.x;
			this.mF32A[_off * 3 + 1] = _v.y;
			this.mF32A[_off * 3 + 2] = _v.z;
		}
		else
		{
			this.mF32A[_off * 3 + 0] = _v;
			this.mF32A[_off * 3 + 1] = _y;
			this.mF32A[_off * 3 + 2] = _z;
		}
	}
	V4(_off,_v=null,_y=null,_z=null,_w=null)
	{
		if( _v ==null)
			return new CVec4(this.mF32A[_off * 4 + 0], this.mF32A[_off * 4 + 1], this.mF32A[_off * 4 + 2], this.mF32A[_off * 4 + 3]);
		else if( _v instanceof CVec3)
		{
			this.mF32A[_off * 4 + 0] = _v.x;
			this.mF32A[_off * 4 + 1] = _v.y;
			this.mF32A[_off * 4 + 2] = _v.z;
			if( typeof _y =="undefined")
				this.mF32A[_off * 4 + 3] = 1;
			else
				this.mF32A[_off * 4 + 3] = _y;
		}
		else if(_v instanceof CVec4)
		{
			this.mF32A[_off * 4 + 0] = _v.mF32A[0];
			this.mF32A[_off * 4 + 1] = _v.mF32A[1];
			this.mF32A[_off * 4 + 2] = _v.mF32A[2];
			this.mF32A[_off * 4 + 3] = _v.mF32A[3];
		}
		else if(_v instanceof Float32Array)
		{
			this.mF32A.set(_v,_off*4);
		}
		else
		{
			this.mF32A[_off * 4 + 0] = _v;
			this.mF32A[_off * 4 + 1] = _y;
			this.mF32A[_off * 4 + 2] = _z;
			this.mF32A[_off * 4 + 3] = _w;
		}
		
		
	}
	V16(_off,_arr : Float32Array)
	{
		this.mF32A.set(_arr,_off*16);
	}


	//======================================================
	X1(_off)
	{
		return this.mF32A[_off];
	}

	X2(_off)
	{
		return this.mF32A[_off * 2 + 0];
	}
	Y2(_off,_val)
	{
		if( typeof _val =="undefined")
			return this.mF32A[_off * 2+1];
		this.mF32A[_off * 2+1]=_val;
	}

	
	X3( _off,  _val=null)
	{
		if( _val ==null)
			return this.mF32A[_off * 3 + 0];
		this.mF32A[_off * 3 + 0] = _val;
	}
	Y3( _off,  _val)
	{
		if( typeof _val =="undefined")
			return this.mF32A[_off * 3 + 1];
		this.mF32A[_off * 3 + 1] = _val;
	}
	Z3( _off,  _val)
	{
		if( typeof _val =="undefined")
			return this.mF32A[_off * 3 + 2];
		this.mF32A[_off * 3 + 2] = _val;
	}
	//===========================================================
	X4( _off,  _val)
	{
		if( typeof _val =="undefined")
			return this.mF32A[_off * 4 + 0];
		this.mF32A[_off * 4 + 0] = _val;
	}
	Y4( _off,  _val)
	{
		if( typeof _val =="undefined")
			return this.mF32A[_off * 4 + 1];
		this.mF32A[_off * 4 + 1] = _val;
	}
	Z4( _off,  _val)
	{
		if( typeof _val =="undefined")
			return this.mF32A[_off * 4 + 2];
		this.mF32A[_off * 4 + 2] = _val;
	}
	W4( _off,  _val=null)
	{
		if(_val==null)
			return this.mF32A[_off * 4 + 3];
		this.mF32A[_off * 4 + 3] = _val;
	}

	//========================================================
	GetOff( _off,  _w)
	{
		if (_w == 0)
			return this.mF32A[_off * 4 + 0];
		else if (_w == 1)
			return this.mF32A[_off * 4 + 1];
		else if (_w == 2)
			return this.mF32A[_off * 4 + 2];
		return this.mF32A[_off * 4 + 3];
	}
	SetOff( _off,  _w,  _val)
	{
		if (_w == 0)
			this.mF32A[_off * 4 + 0]= _val;
		else if (_w == 1)
			this.mF32A[_off * 4 + 1] = _val;
		else if (_w == 2)
			this.mF32A[_off * 4 + 2] = _val;
		else
			this.mF32A[_off * 4 + 3] = _val;
	}
}