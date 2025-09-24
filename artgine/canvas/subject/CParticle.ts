
import {CSubject} from "./CSubject.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CMath} from "../../geometry/CMath.js";
import {CSampler, CSamplerList, CSamplerMinMax, CSamplerTimer } from "../../geometry/CSampler.js";
import {CRigidBody} from "../component/CRigidBody.js";
import {CForce} from "../component/CForce.js";
import {CCurve} from "../../util/CCurve.js";
import { CObject } from "../../basic/CObject.js";
import { CUniqueID } from "../../basic/CUniqueID.js";


export class CParticleShape extends CObject
{
	public mTarget : CSubject=null;
	constructor(_target : CSubject=null)
	{
		super();
		this.mTarget=_target;
	}
	public TargetPos(_objList : Array<CSubject>)
	{
		if(this.mTarget!=null)
		{
			for(let each0 of _objList)
			{
				if(this.mTarget.IsDestroy())
				{
					each0.Destroy();
				}
				else
					each0.SetPos(CMath.V3AddV3(each0.GetPos(),this.mTarget.GetWMat().xyz));
			}
			
		}
		
	}
	//생성될 최초 위치
	public LineUp(_time : number,_objList : Array<CSubject>)
	{
		this.TargetPos(_objList);
	}
	// public GetRigidBody(_obj : CSubject) : CRigidBody
	// {
	// 	var rb=null;
	// 	var rbVec=_obj.GetComps(CComponent.eType.CRigidBody) as Array<CRigidBody>;
	// 	if(rbVec.length==0)
	// 	{
	// 		rb=new CRigidBody();
	// 		_obj.PushComp(rb);
	// 	}
	// 	else
	// 		rb=rbVec[0];
	// 	return rb;
	// }
}
//위치에서 밖으로
export class CParticleShapeOut extends CParticleShape
{
	public mDir=new CSamplerMinMax<CVec3>(new CVec3(-1,-1,-1),new CVec3(1,1,1));
	public mPos=new CSampler(new CVec3());
	public mSca=new CSamplerMinMax<number>(1,1);
	public mSpeed=new CSampler<number>(100);//속도
	public mMovementKey="CParticleShapeOut";
	public mCurve=new CCurve();
	
	public LineUp(_time : number,_objList : Array<CSubject>)
	{
		super.LineUp(_time,_objList);
		for(var each0 of _objList)
		{
			var rb=each0.FindComp(CRigidBody);
			if(rb==null)
			{
				rb=new CRigidBody();
				each0.PushComp(rb);
			}
			let force=new CForce(this.mMovementKey,this.mDir.Excute(),this.mSpeed.Excute());
			force.SetCurve(this.mCurve);
			rb.Push(force);

			let sca=this.mSca.Excute();
			each0.SetSca(new CVec3(sca,sca,sca));
			
			
			var pos=this.mPos.Excute();
			if(pos.IsZero()==false)
				each0.SetPos(CMath.V3AddV3(each0.GetPos(),pos));
		}
	}
}

// export class CParticleShapeGravity extends CParticleShape
// {
// 	public m_dir=new CExtractMinMax(new CVec3(-1,-1,-1),new CVec3(1,1,1));//생성 곗수
// 	public m_pos=new CExtract(new CVec3());//생성 곗수
// 	public m_speed=new CExtract(100);//속도
// 	public m_movementKey="CParticleShapeGravity";
	
// 	public LineUp(_time : number,_objList : Array<CSubject>)
// 	{
// 		super.LineUp(_time,_objList);
// 		for(var each0 of _objList)
// 		{
// 			var rb=each0.GetComp(CRigidBody);
// 			if(rb==null)
// 			{
// 				rb=new CRigidBody();
// 				each0.PushComp(rb);
// 			}
// 			rb.Push(new CForce(this.m_movementKey,this.m_dir.V3(),this.m_speed.V1()));
			
			
// 			var pos=this.m_pos.V3();
// 			if(pos.IsZero()==false)
// 				each0.SetPos(CMath.V3AddV3(each0.GetPos(),pos));
// 		}
// 	}
// }
export class CParticleTexBuf extends CParticleShapeOut
{
	mBuf : Uint8Array;
	mWidth : number;
	mHeight : number; 
	mScaleX=1;
	mScaleY=1;
	constructor(_target : CSubject,_buf : Uint8Array,_width,_height)
	{
		super(_target);
		this.mBuf=_buf;
		this.mWidth=_width;
		this.mHeight=_height;
	}
	public LineUp(_time : number,_objList : Array<CSubject>)
	{
		if(this.mBuf==null)
		{
			for(var each0 of _objList)
				each0.Destroy();
			return;
		}
		
		super.LineUp(_time,_objList);
		
		for(var each0 of _objList)
		{
			let pos=each0.GetWMat().xyz;
			while(true)
			{
				let x=Math.trunc(Math.random()*this.mWidth);
				let y=Math.trunc(Math.random()*this.mHeight);
				if(this.mBuf[x*4+y*4*this.mWidth+3]>0)
				{

					x=(x-this.mWidth*0.5)*this.mScaleX;
					y=-(y-this.mHeight*0.5)*this.mScaleY;
					each0.SetPos(CMath.V3AddV3(each0.GetPos(),new CVec3(x,y)));
					break;
				}
					
			}
		}	
		

		
	}
}

export class CParticle extends CSubject
{

	public mSample : CSamplerList<CSubject>=null;
	public mCreateCount=new CSampler(5);//생성 곗수
	public mTimer=new CSamplerTimer(true);
	// public mCreateTime=100;//생성 주기
	// public mStartTime=0;//언제부터 시작
	// public mEndTime=1000*60*60;//언제까지 생성
	//private mTime=0;
	public mShape =new CParticleShape();

	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=='mChild' || _member=='mComArr' || _member=='mTime')
			return false;
		return super.IsShould(_member,_type);
	}
	private m_cTime=0;
	constructor()
	{
		super();
		this.mTimer.mDelay=100;
		this.mTimer.mEnd=1000*60*60;

	}
	// SetCrateTime(_time)
	// {
	// 	this.mCreateTime=_time;
	// }
	SetCrateCount(_count : CSampler<number>)
	{
		this.mCreateCount=_count;
	}
	SetShape(_shape : CParticleShape)
	{
		this.mShape=_shape;
	}

	SubjectUpdate(_delay)
	{
		super.SubjectUpdate(_delay);
		
		if(this.mTimer.Excute(_delay)==false || this.mSample==null)	return;
			
		
		
		let count=this.mCreateCount.Excute();
		var objArr=new Array<CSubject>();
		for(var i=0;i<count;++i)
		{
			let sub=this.mSample.Excute();
			if(sub!=null)
			{
				var obj=new CSubject();
				


				
				obj.Import(sub);
				obj.SetKey(CUniqueID.GetHash());
				
				this.PushChild(obj);
				objArr.push(obj);
			}
		}
		this.mShape.LineUp(this.mTimer.mTimeAll,objArr);
		
		
	}
	public toJSON(): { class: string; } {
		return {class:""};
	}
}



