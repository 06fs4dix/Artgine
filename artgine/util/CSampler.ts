
import { CUpdate } from "../basic/Basic.js";
import { CClass } from "../basic/CClass.js";
import {CObject} from "../basic/CObject.js";
import { CFloat32 } from "../geometry/CFloat32.js";
import { CMath } from "../geometry/CMath.js";
import { CVec1 } from "../geometry/CVec1.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CTimer } from "../system/CTimer.js";

export class CSampler<T> extends CObject
{
	protected mDefault : T=null;
	constructor(_default : T=null)
	{
		super();
		this.mDefault=_default;
	}
	Execute(_target=null)	
	{
		return this.mDefault;
	}
}
export class CSampMinMax<T> extends CSampler<T>
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
	override Execute(_target : any=null) : T
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
export class CSampList<T> extends CSampler<T> 
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
	override Execute() : T
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

export class CSampCountDown<T> extends CSampler<T> 
{
	private mTimes = new Array<number>();
	private mList = new Array<T>();
	private mTimer = new CTimer();
	private mTime = 0;
	constructor(_times : Array<number>, _list : Array<T>)
	{
		super();
		this.mTimes = _times;
		this.mList = _list;
	}
	override Execute() : T
	{
		if(this.mTimes == null || this.mList == null) return null;
		
		this.mTime += this.mTimer.Delay();
		for(let i=0; i<this.mTimes.length; ++i)
		{
			if(this.mTime <= this.mTimes[i])
			{
				return this.mList[i];
			}
		}
		return null;
	}
}
export class CSampDir extends CSampler<CVec3>
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
	override Execute() : CVec3
	{
		var pran=this.mPitch*2*Math.random()-this.mPitch;
		var rran=this.mRoll*2*Math.random()-this.mRoll;
		
		var mat=CMath.MatRotation(new CVec3(pran,rran,0));
		return CMath.V3MulMatNormal(this.mDir,mat);
	}
}
