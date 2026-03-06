
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
	override Excute(_target : any=null) : T
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
	override Excute() : T
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
	override Excute() : CVec3
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
    mStart=0;
    mEnd=0;

    // mTimeAll=0;
    // mTimeDelay=0;
	// mExcute=0;
    // mUpdate=0;
	constructor(_actionValue : T)
	{
		super(_actionValue);
	}

	override Excute(_dataTarget : any=null,_run="") : T
	{
		if(_dataTarget==null)	_dataTarget=this;
		if(CSamplerTimer.Update(_dataTarget,this.mCount,this.mDelay,this.mStart,this.mEnd,_run)==false)
		{
			if(typeof this.mDefault!="undefined")	return false as any;
			return null;
		}
		
		return this.mDefault;
	}


	//실시간 호출해줘야 갱신된다
    static Update(_dataTarget : any,count=0,delay=0,start=0,end=0,_run="") : boolean
    {
		
        if(_dataTarget["mTemp"]==null)_dataTarget["mTemp"]={};

        
        //let run=_dataTarget["mTemp"]["mRun"];
        let timer : CTimer;
        if(_dataTarget["mTemp"]["mTimer"+_run]==null)
        {
            _dataTarget["mTemp"]["mTimer"+_run]=new CTimer();
            _dataTarget["mTemp"]["mCount"+_run]=0;
            _dataTarget["mTemp"]["mTime"+_run]=0;
            _dataTarget["mTemp"]["mDelay"+_run]=0;
        }
        timer=_dataTarget["mTemp"]["mTimer"+_run];
        let t=timer.Delay();
        _dataTarget["mTemp"]["mDelay"+_run]=_dataTarget["mTemp"]["mDelay"+_run]+t;
        _dataTarget["mTemp"]["mTime"+_run]=_dataTarget["mTemp"]["mTime"+_run]+t;

        
			
        if(delay!=0 && _dataTarget["mTemp"]["mDelay"+_run]<delay)   return false;
        if(_dataTarget["mTemp"]["mTime"+_run]<start)   return false;
        if(end!=0 && _dataTarget["mTemp"]["mTime"+_run]>end)   
		{
			_dataTarget["mTemp"]["mEnd"+_run]=true;
			return false;
		}
			
        
        _dataTarget["mTemp"]["mDelay"+_run]=0;
        _dataTarget["mTemp"]["mCount"+_run]=_dataTarget["mTemp"]["mCount"+_run]+1;

		if(count!=0 && _dataTarget["mTemp"]["mCount"+_run]>count)   
		{
			_dataTarget["mTemp"]["mEnd"+_run]=true;
			return false;
		}
        
        
       return true;
        
    }
	static Reset(_dataTarget : any,_run="")
	{
		//if(_dataTarget["mTemp"]==null)return;
		if(_dataTarget["mTemp"]["mTimer"+_run]!=null)
        {
			(_dataTarget["mTemp"]["mTimer"+_run] as CTimer).Delay();
            _dataTarget["mTemp"]["mCount"+_run]=0;
            _dataTarget["mTemp"]["mTime"+_run]=0;
            _dataTarget["mTemp"]["mDelay"+_run]=0;
			_dataTarget["mTemp"]["mEnd"+_run]=false;
        }
	}
	static IsEnd(_dataTarget : any,_run="")
	{
		if(_dataTarget["mTemp"]==null)	return false;
		return _dataTarget["mTemp"]["mEnd"+_run]==true;
	}
}