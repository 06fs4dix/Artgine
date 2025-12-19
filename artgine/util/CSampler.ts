
import { CClass } from "../basic/CClass.js";
import {CObject} from "../basic/CObject.js";
import { CFloat32 } from "../geometry/CFloat32.js";
import { CMath } from "../geometry/CMath.js";
import { CVec1 } from "../geometry/CVec1.js";
import { CVec3 } from "../geometry/CVec3.js";


export class CSampler<T> extends CObject
{
	protected mDefault : T=null;
	constructor(_default : T=null)
	{
		super();
		this.mDefault=_default;
	}
	Excute(_target=null)	
	{
		return this.mDefault;
	}
}
export class CSamplerMinMax<T> extends CSampler<T>
{
	
	public mLinear : boolean;
	public mMin : T;
	public mMax : T;

	constructor(_min : number,_max: number);
	constructor(_min : number,_max: number,_linear);
	constructor(_min : CFloat32,_max: CFloat32);
	constructor(_min : CFloat32,_max: CFloat32,_linear);
	constructor(_min : T,_max: T,_linear=false)
	{
		super();
		if(typeof _min =="number" && typeof _max =="number")
		{
			this.mMin=new CVec1(_min) as T;
			this.mMax=new CVec1(_max) as T;
		}
		else
		{
			this.mMin=_min;
			this.mMax=_max;
		}
		
		this.mLinear=_linear;
	}
	Excute(_target : any=null) : T
	{
		if(_target==null || typeof _target=="number")
			_target=CClass.New(this.mMin);

		let ran=Math.random();

		for(let i=0;i<_target.mF32A.length;++i)
		{
			if(this.mLinear==false)
				ran=Math.random();
				
			_target.mF32A[i]=CMath.FloatInterpolate((this.mMin as any).mF32A[i],(this.mMax as any).mF32A[i],ran);
			
		}
		if(_target instanceof CVec1)
			return _target.mF32A[0] as any;
		return _target as T;
	}
	
}
export class CSamplerList<T> extends CSampler<T> 
{
	private mCount=0;
	private mRate =new Array<number>();
	private mList =new Array<T>();
	constructor(_list : Array<T>,_rate : Array<number>=null)
	{
		super();
		if(_list==null)	return;

		if(_rate==null)
		{
			_rate=new Array();
			for(var each0 of _list)
			{
				_rate.push(1);
			}
		}
		else if(_list.length>_rate.length)
		{
			for(var i=0;i<_list.length-_rate.length;++i)
			{
				_rate.push(1);
			}
		}
		this.mList=_list;
		this.mRate=_rate;
		
		for(let each0 of this.mRate)
		{
			this.mCount+=each0;
		}
	}
	Excute() : T
	{
		if(this.mList == null || this.mRate.length === 0)
			return null;

		let ran = Math.random();
		let accum = 0;

		for (let i = 0; i < this.mRate.length; ++i)
		{
			accum += this.mRate[i] / this.mCount;
			if (ran <= accum)
			{
				return this.mList[i] as T;
			}
		}

		// fallback: 마지막 값 (정확히 1.0에 해당하는 경우)
		return this.mList[this.mList.length - 1] as T;
	}
}
export class CSamplerDir extends CSampler<CVec3>
{
	public mDir : CVec3;
	public mPitch : number;
	public mRoll : number;
	
	constructor(_dir : CVec3,_pitch : number,_roll : number)
	{
		super();
		this.mDir=_dir;
		this.mPitch=_pitch;
		this.mRoll=_roll;
	}
	Excute() : CVec3
	{
		var pran=this.mPitch*2*Math.random()-this.mPitch;
		var rran=this.mRoll*2*Math.random()-this.mRoll;
		
		var mat=CMath.MatRotation(new CVec3(pran,rran,0));
		return CMath.V3MulMatNormal(this.mDir,mat);
	}
}
export class CSamplerTimer<T> extends CSampler<T>
{
	mDelay=0;
    mCount=1;
    mBegin=0;
    mEnd=0;

    mTimeAll=0;
    mTimeDelay=0;
	mExcute=0;
    mUpdate=0;
	constructor(_actionValue : T)
	{
		super(_actionValue);
	}

	Excute(_delay : number,_update=1) : T
	{
		//업데이트 오프셋이 차이남
		if(_update-1!=this.mUpdate)
		{
			this.mTimeAll=0;
			this.mExcute=0;
			this.mTimeDelay=0;
		}
		this.mUpdate=_update;

		if(this.mTimeAll<this.mBegin || (this.mCount!=0 && this.mCount<=this.mExcute) || 
			(this.mEnd!=0 && this.mEnd<this.mTimeAll) || (0<this.mTimeDelay))  
		{
			this.mTimeAll+=_delay;
			this.mTimeDelay-=_delay;
			if(typeof this.mDefault!="undefined")	return false as any;
			return null;
		}
		

		this.mTimeAll+=_delay;
		this.mTimeDelay=this.mDelay;
		this.mExcute++;

		return this.mDefault;
	}
}