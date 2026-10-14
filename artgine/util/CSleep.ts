import { CObject } from "../basic/CObject.js";

//경과 시간은 스스로 재지 않는다. 쓰는 쪽이 매번 Add로 흐른 시간(초)을 넣어 줘야 한다.
export class CSleep extends CObject
{
	//주기(초, 밀리초 아님). 0 이하면 매번 Is()가 true
	protected mCycle=0;
	protected mTime=0;
	constructor(_cycle=0)
	{
		super();
		this.mCycle=_cycle;
	}
	SetCycle(_cycle : number)
	{
		if(this.mCycle==_cycle)	return;
		this.mCycle=_cycle;
		this.mTime=0;
	}
	Reset(_offset=0)
	{
		this.mTime=_offset;
	}
	Add(_delay : number)
	{
		this.mTime+=_delay;
	}
	override IsShould(_member: string, _type: CObject.eShould)
	{
		if(_member=="mTime")	return false;
		return super.IsShould(_member,_type);
	}
	Is() : boolean
	{
		if(this.mCycle<=0)	return true;
		if(this.mTime<this.mCycle)	return false;
		this.mTime=0;
		return true;
	}
}
