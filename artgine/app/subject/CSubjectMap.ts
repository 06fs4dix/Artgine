import { CUpdate } from "../../basic/Basic.js";
import { CObject } from "../../basic/CObject.js";
import { CCollider } from "../component/CCollider.js";
import { CComponent } from "../component/CComponent.js";
import { CGeometryInfo } from "../component/CGeometryComp.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CSubject } from "./CSubject.js";

//맵 형태 서브젝트(복셀, 덴시티, 터레인 등)의 공통 부분.
//맵의 페인트·콜라이더는 맵 버퍼에서 다시 만들어지는 것이라 저장·복사하지 않는다.
//콜라이더는 정적 옥트리에 등록된 뒤 할 일이 없으므로 재워서(끄기) 프레임마다 도는 Update를 없앤다.
export class CSubjectMap extends CSubject
{
	mPaintArr=new Array<CPaint>();
	mColliderArr=new Array<CCollider>();
	//mColliderArr와 같은 오프셋. 오너가 맵이 아닌 콜라이더(PushSubject로 넣은 것)는 그 오너, 아니면 null
	mSubjectArr=new Array<CSubject>();
	mColSleep=false;
	private mColWake=false;
	private mSleepArr=new Array<CCollider>();

	override IsShould(_member: string, _type: CObject.eShould)
	{
		if(_member=="mPaintArr" || _member=="mColliderArr" || _member=="mSubjectArr" || _member=="mColSleep" || _member=="mColWake" || _member=="mSleepArr" || _member=="mCompDirty")
			return false;
		return super.IsShould(_member,_type);
	}
	GetColSubject(_cl : CCollider) : CSubject
	{
		const i=this.mColliderArr.indexOf(_cl);
		if(i<0)	return null;
		return this.mSubjectArr[i] ?? null;
	}
	override PushComp<T extends CComponent>(_com : T) : T
	{
		//잠긴 동안(Update 중) 들어온 것은 mPushArr에 보관됐다가 나중에 PushComp로 다시 들어오므로 그때 등록한다
		const lock=this.mPushLock;
		const com=super.PushComp(_com);
		if(lock==false)	this.PushMapComp(com);
		return com;
	}
	override RemoveComps(_type)
	{
		super.RemoveComps(_type);
		this.ReleaseMapComp();
	}
	override DetachComp(_type) : any
	{
		const com=super.DetachComp(_type);
		if(com!=null)
		{
			let i=this.mPaintArr.indexOf(com as CPaint);
			if(i>=0)	this.mPaintArr[i]=null;
			i=this.mColliderArr.indexOf(com as CCollider);
			if(i>=0)
			{
				this.mColliderArr[i]=null;
				if(i<this.mSubjectArr.length)	this.mSubjectArr[i]=null;
			}
		}
		return com;
	}
	override ToStr() : string
	{
		const keep=this.mComArr;
		this.mComArr=this.ExceptMapComp();
		try
		{
			return super.ToStr();
		}
		finally
		{
			this.mComArr=keep;
		}
	}
	override Export(_copy=true,_resetKey=true) : this
	{
		const keep=this.mComArr;
		this.mComArr=this.ExceptMapComp();
		try
		{
			return super.Export(_copy,_resetKey);
		}
		finally
		{
			this.mComArr=keep;
		}
	}
	override Update(_update : CUpdate)
	{
		super.Update(_update);
		this.ColSleep();
		this.FlushComp();
	}
	//RouteMsgUpdate는 활성 목록을 잡아 둔 뒤 Update를 부른다. 목록을 도는 중에 기본 UpdateComp가 목록을 비우면
	//이번 프레임 컴포넌트를 건너뛰고 목록도 다시 만들지 않아 이후 매 프레임 잠든 콜라이더까지 전체를 돈다.
	//그때는 표시만 해 두고 Update 끝(FlushComp)에서 한 번 다시 채운다. 재우기·깨우기는 콜라이더 수만큼 불리므로 매번 채우면 n²이 된다.
	//mUpdateComp는 켜 둬야 Update 중에 넣은 컴포넌트(mPushArr)가 루프 끝에서 등록된다
	private mCompDirty=false;
	override UpdateComp()
	{
		if(this.mPushLock==false || this.mComEnableArr.length==0)
		{
			super.UpdateComp();
			return;
		}
		this.mCompDirty=true;
		this.mUpdateComp=true;
	}
	//Update를 오버라이드해 UpdateComp를 부르는 하위 클래스는 끝에서 다시 부른다
	protected FlushComp()
	{
		if(this.mCompDirty==false)	return;
		this.mCompDirty=false;
		const arr=this.mComEnableArr;
		arr.length=0;
		for(const com of this.mComArr)
			if(com.IsEnable())	arr.push(com);
	}

	//맵 버퍼가 바뀌어 콜라이더를 다시 등록해야 할 때 부른다
	protected ColWake()
	{
		this.mColWake=true;
	}
	//맵 콜라이더를 없애지 않고 빼낸다(오너 서브젝트에 돌려줄 때). 옥트리에는 그대로 남아 있어 빼는 사이 충돌이 비지 않는다
	protected DetachMapCollider(_cl : CCollider)
	{
		const i=this.mComArr.indexOf(_cl);
		if(i>=0)	this.mComArr.splice(i,1);
		const ci=this.mColliderArr.indexOf(_cl);
		if(ci>=0)
		{
			this.mColliderArr[ci]=null;
			if(ci<this.mSubjectArr.length)	this.mSubjectArr[ci]=null;
		}
		const si=this.mSleepArr.indexOf(_cl);
		if(si>=0)
		{
			this.mSleepArr.splice(si,1);
			_cl.SetEnable(true);
		}
		this.UpdateComp();
	}
	//Destroy한 맵 컴포넌트를 배열에서 비우고 정적 트리 재등록을 요청한다
	protected ReleaseMapComp()
	{
		this.ReleaseDestroy(this.mPaintArr);
		if(this.ReleaseDestroy(this.mColliderArr,this.mSubjectArr))
			this.mColWake=true;
		if(this.mPTArr)	this.mPTArr.length=0;
		this.mPTArr=null;
		this.UpdateComp();
	}
	//배열을 셀 번호 등으로 직접 관리하는 하위 클래스는 오버라이드해서 끈다
	protected PushMapComp(_com : CComponent)
	{
		if(_com instanceof CPaint)	this.mPaintArr.push(_com);
		else if(_com instanceof CCollider)
		{
			this.mColliderArr.push(_com);
			const owner=_com.GetOwner();
			this.mSubjectArr[this.mColliderArr.length-1]=owner!=null && owner!==this ? owner : null;
		}
	}

	private ExceptMapComp()
	{
		const set=new Set<CComponent>();
		for(const pt of this.mPaintArr)	if(pt!=null)	set.add(pt);
		for(const cl of this.mColliderArr)	if(cl!=null)	set.add(cl);
		return this.mComArr.filter(_com=>set.has(_com)==false);
	}
	//지운 칸은 당기지 않고 비운다. 복셀처럼 칸 번호로 접근하는 배열이 있다
	private ReleaseDestroy(_arr : Array<CComponent>,_pair : Array<any>=null) : boolean
	{
		let change=false, empty=true;
		let gi : CGeometryInfo=null;
		for(let i=0;i<_arr.length;++i)
		{
			const com=_arr[i];
			if(com==null)	continue;
			if(com.IsDestroy())
			{
				if(gi==null && com instanceof CCollider)	gi=com.GetGI();
				_arr[i]=null;
				if(_pair!=null && i<_pair.length)	_pair[i]=null;
				change=true;
			}
			else
				empty=false;
		}
		if(empty)
		{
			_arr.length=0;
			if(_pair!=null)	_pair.length=0;
		}
		//정적 트리는 재빌드 때만 다시 만들어지므로, 안 하면 지운 콜라이더가 다음 재빌드까지 남아 충돌한다
		if(gi!=null && gi.mOctree.mStaticBuild==false)
			gi.mOctree.mStaticUpdate=true;
		return change;
	}
	//정적 콜라이더만 재운다. 동적 콜라이더는 매 스텝 다시 Insert해야 옥트리에 남는다.
	//정적 재빌드는 그 프레임에 Insert된 콜라이더만 새 트리에 담는다. 그래서 자는 동안 재빌드가 뜨면 깨우고,
	//이미 지나간 재빌드일 수 있어 한 번 더 요청한다. 맵이 움직였거나 자는 콜라이더의 바운드·레이어가 바뀌어도
	//(InitBound, SetLayer가 mUpdateMat을 세운다) 다시 등록해야 하므로 깨운다. 깨울 때는 재웠던 것만 켠다.
	private ColSleep()
	{
		let gi : CGeometryInfo=null;
		for(const cl of this.mColliderArr)
		{
			if(cl!=null && cl.IsDestroy()==false && cl.GetGI()!=null)
			{
				gi=cl.GetGI();
				break;
			}
		}
		if(gi==null)	return;
		const rebuilding=gi.mOctree.mStaticUpdate || gi.mOctree.mStaticBuild;

		if(this.mColSleep)
		{
			let wake=rebuilding || this.mColWake || this.mUpdateMat!=CUpdate.eType.Not;
			for(let i=0;wake==false && i<this.mSleepArr.length;++i)
				if(this.mSleepArr[i].mUpdateMat!=CUpdate.eType.Not)	wake=true;
			if(wake==false)	return;
			for(const cl of this.mSleepArr)
				if(cl.IsDestroy()==false)	cl.SetEnable(true);
			this.mSleepArr.length=0;
			gi.mOctree.mStaticUpdate=true;
			this.mColSleep=false;
			this.mColWake=false;
			this.UpdateComp();
			return;
		}
		this.mColWake=false;
		if(rebuilding)	return;
		//mUpdateMat이 Not이 되어야 재빌드 프레임에 Insert까지 끝났다는 뜻이다. 그 전에 재우면 영영 등록되지 않는다.
		for(const cl of this.mColliderArr)
			if(this.IsSleepTarget(cl) && cl.mUpdateMat!=CUpdate.eType.Not)	return;
		for(const cl of this.mColliderArr)
		{
			if(this.IsSleepTarget(cl)==false)	continue;
			cl.SetEnable(false);
			this.mSleepArr.push(cl);
		}
		this.mColSleep=true;
		//SetEnable은 오너의 활성 목록만 비운다. PushSubject 콜라이더는 오너가 서브젝트라 맵 목록이 안 비워져 잠든 것까지 계속 순회한다
		this.UpdateComp();
	}
	private IsSleepTarget(_cl : CCollider)
	{
		return _cl!=null && _cl.IsEnable() && _cl.mEvent==CCollider.eEvent.Static;
	}
}
