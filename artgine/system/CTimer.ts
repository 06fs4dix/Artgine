
export class CTimer
{
	public mBegin : number;
	constructor(_time =0)
	{
		this.mBegin=_time;
		this.Delay();
	}
	Delay(_reset=true) : number
	{
		if(this.mBegin==0)
		{
			this.mBegin = new Date().getTime();
			return 0;
		}
		var before = this.mBegin;
		let time=new Date().getTime();
		if(_reset)
			this.mBegin = new Date().getTime();
		return (time - before)*0.001;
	}
}
export class CTimerNano
{
	public mBegin : number;
	constructor()
	{
		this.mBegin=0;
		this.Delay();
	}
	Delay() : number
	{
		if(this.mBegin==0)
		{
			this.mBegin = performance.now();
			return 0;
		}
		var before = this.mBegin;
		this.mBegin = performance.now();
		return this.mBegin - before;
	}
}