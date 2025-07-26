import {CComponent} from "../component/CComponent.js"
import {CForce} from "./CForce.js"
import {CVec3} from "../../geometry/CVec3.js"
import {CMath} from "../../geometry/CMath.js"
import {CCollider,CCollusionObject} from "../component/CCollider.js"
import {CPhysics} from "../component/CPhysics.js"
import {CStopover} from "./CStopover.js"
import {CSubject} from "../subject/CSubject.js"
import {CJSON} from "../../basic/CJSON.js"

import { CObject, CPointer } from "../../basic/CObject.js"
import { CUtilMath } from "../../geometry/CUtilMath.js"
import { CStream } from "../../basic/CStream.js"
import { CString } from "../../basic/CString.js"

var yPath=true;

export class CRigidBody extends CComponent
{
	
	mStartPos : CVec3 = null;
	mForceArr = new Array<CForce>();
	mForceGravity : CForce = null;
	mStopover : CStopover=null;

	mFreezePos = new Array<boolean>(false,false,false);
	//m_move = false;
	
	
	private mRestitution = 0;//복원계수 : 팅겨나는 정도 밀어냄 0없음 1이하 서로 침범 범위만 1이상 밀어내는걸 넘어서 팅겨남


	private mElastic = false;//탄성
	private mDamping = 0;//감쇠/마찰력
	private mMass = 0;//질량

	
	private mGravity = false;//중력

	mFall = false;
	mJump = false;
	mAutoDetrude=true;
	mElevatorPos : CVec3= null;
	mElevator : CSubject= null;
	mMoveDir=new CVec3();
	mOneWayMap=new Map<any,number>();
	//m_update=Df.UpdateState.Not;



	Icon(){		return "bi bi-person-walking";	}
	SetGravity(_gravity:boolean) {this.mGravity = _gravity;}
	GetGravity(){return this.mGravity;}
	SetRestitution(_restitution:number=0.5) {this.mRestitution = _restitution;}
	GetRestitution(){return this.mRestitution;}

	//IsGravityNow(){return this.mIsGravity;}
	SetFreezePos(_xfreeze:boolean,_yfreeze:boolean,_zfreeze:boolean){
		this.mFreezePos = [_xfreeze,_yfreeze,_zfreeze];
	}
	//GetJump(){return this.m_jump;}
	constructor()
	{
		super();
		this.mSysc=CComponent.eSysn.Wind;
		
	}
	EditChange(_pointer : CPointer)
	{
		if(_pointer.member=="mGravity")
		{
			//this.mIsGravity=false;
			this.mForceGravity=null;
			this.Remove("g");
		}
	}
	IsJump()
	{
		return this.mJump;
	}
	IsFall()
	{
		return this.mFall;
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mAutoDetrude" || _member=="mForceGravity" || _member=="mOneWayMap")
			return true;
			
		return super.IsShould(_member,_type);
	}
	//IsMove()	{		return this.m_move;	}

	GetMoveQue()	{	return this.mForceArr;	}
	GetMoveQueGravity(){
		for(let each1 of this.mForceArr) if(each1.mKey==CPhysics.GravityKey) return each1;
		return null;
	}
	Start(): void {
		this.mStartPos = this.GetOwner().GetPos().Export();
	}
	Update(_delay)
	{
		
		// if(this.m_update==Df.UpdateState.Updated)
		// 	this.m_update=Df.UpdateState.Already;
		// else if(this.m_update==Df.UpdateState.Already)
		// 	this.m_update=Df.UpdateState.Not;
	
		
		if(this.mGravity)
		{
			if(this.mForceGravity==null)
			{
				this.mForceGravity = new CForce("g");
				this.mForceGravity.SetDirVel(CPhysics.GravityDir,CPhysics.GravityPow,CPhysics.GravityDir,CPhysics.GravityMaxPow);
				this.mForceGravity.SetDelay(1200);
				
			
				this.Remove("g");
				this.Push(this.mForceGravity);
			}

		}

		
		this.mMoveDir.Zero();
		if(this.mForceArr.length>0)
		{
			
			for (var i = 0; i < this.mForceArr.length; ++i)
			{
				if(this.mGravity && CMath.V3Dot(CMath.V3Nor(CPhysics.GravityDir), this.mForceArr[i].mDirection) < 0)
				{
					this.mJump = true;
					this.mElevator=null;
					this.mElevatorPos=null;
					
				}
		
				
				CMath.V3AddV3(this.mMoveDir, this.mForceArr[i].Cac(_delay),this.mMoveDir);
				if(this.mForceArr[i].IsRemove())
				{
					this.mForceArr.splice(i,1);
					i--;
				}
			}
			

			
			if(this.mMoveDir.IsZero()==false)
			{
				CMath.V3AddV3(this.mMoveDir, this.GetOwner().GetPos(),this.GetOwner().mPos);
				this.GetOwner().PRSReset(false);

				let len=CMath.V3Len(this.mMoveDir);
				if(len<CPhysics.GravityPow*0.05)
					this.mMoveDir.Zero();

			}
				
			
				
		}
		//CConsol.Log(this.m_jump);
		if(this.mStopover!=null)
		{
			if(this.mStopover.m_delay==0)
			{
				let so=this.mStopover as CStopover;
				so.mPos.unshift(this.GetOwner().mPos.Export());

				let sumLen=0;
				let bPos=so.mPos[0];
				for(let i=1;i<so.mPos.length;++i)
				{
					if(bPos.Equals(so.mPos[i]))
					{
						so.mPos.splice(i,1);
						--i;
					}
					let len=CMath.V3Distance(so.mPos[i],bPos);
					bPos=so.mPos[i];
					sumLen+=len;
					
				}

				so.m_delay+=(sumLen/so.m_velocity)*1000;
			}
			this.mStopover.m_time+=_delay;
		
			var t=0;
			
			if(this.mStopover.m_time>this.mStopover.m_delay)
				t=1;
			else
				t=(this.mStopover.m_time+_delay)/this.mStopover.m_delay;

			let pos=null;
			if(this.mStopover.m_bezier)
				pos=CUtilMath.Bezier(this.mStopover.mPos,t,0,0);
			else
				pos=CUtilMath.WeightVec3(this.mStopover.mPos,t);
			let dir = CMath.V3SubV3(pos, this.GetOwner().GetPos());
			//let v=CMath.V3Len(dir)*100;

			if(CMath.V3Len(dir)<=(_delay*0.001)*this.mStopover.m_velocity)
			{
				this.Remove("path");
				this.GetOwner().SetPos(pos,true,false);
			}
			else
			{
				this.Push(new CForce("path",CMath.V3Nor(dir),this.mStopover.m_velocity));
				this.mStopover.m_delay+=_delay;
			}
				

			if(this.mStopover.m_time>this.mStopover.m_delay)
			{
				this.mStopover=null;
				this.Remove("path");
			}

			
		}
		
		// if(this.m_move)
		// {
		// 	//this.GetOwner().PRSReset();
		// 	let cm=this.NewComMsg("Move");
		// 	cm.m_intra=CSubject;
			
		// }
		// this.m_move=false;
		
		
		
		


		
		// //중력 큐가 있으면
		if(this.mForceGravity!=null) //&& resetGravity==false)
		{
		
			//중력 적용중인지 확인
			if(this.mForceGravity.mVelocity > CPhysics.GravityAcc*0.15)
			{
				this.mFall=true;
				//this.PatchExe("mForceArr");
			}
			else
				this.mFall=false;
			
		}
	
		//this.m_lastCol=null;

		if(this.mFreezePos[0])this.GetOwner().mPos.x = this.mStartPos.x;
		if(this.mFreezePos[1])this.GetOwner().mPos.y = this.mStartPos.y;
		if(this.mFreezePos[2])this.GetOwner().mPos.z = this.mStartPos.z;


		if(this.mOneWayMap.size>0)
		{
			for(let [key,value] of this.mOneWayMap.entries())
			{
				if(value-1==0)
					this.mOneWayMap.delete(key);
				else
					this.mOneWayMap.set(key,1);
			}
			
		}

	}
	deltacount = 0;

	
	Push(move : CStopover);
	Push(move : CForce);
	Push(move : Array<CForce>);
 	Push(move,duplication=false)
	{
		if(move==null)
			return;
		if(move instanceof Array)
		{
		
			for (var i = 0; i < move.length; ++i)
			{
				this.Push(move[i]);
			}
		}
		else if(move instanceof CForce)
		{
			this.PatchExe("mForceArr");
			if(duplication==false)
			{
				for (var i = 0; i < this.mForceArr.length; ++i)
				{
					if (this.mForceArr[i].mKey==move.mKey)
					{
						this.mForceArr[i].Import(move);
						return;
					}
				}
			}
			
			this.mForceArr.push(move);
		}
		else
		{
			//this.m_path = move;
			
			this.mStopover=move;


			for (let i = 0; i < this.mForceArr.length; ++i)
			{
				if (this.mForceArr[i].mKey=="path")
				{
					this.mForceArr.splice(i,1);
					break;
				}
			}
		}
		
	}
	Remove(_key)
	{
		this.PatchExe("mForceArr");
		for (var i = 0; i < this.mForceArr.length; ++i)
		{
			if (this.mForceArr[i].mKey==(_key+""))
			{
				this.mForceArr.splice(i,1);
				break;
			}
		}
	}
	IsEmpty(_key)
	{
		for (var i = 0; i < this.mForceArr.length; ++i)
		{
			if (this.mForceArr[i].mKey==_key)
			{
				return false;
			}
		}
		return true;
	}
	Clear()
	{
		this.PatchExe("mForceArr");
		this.mForceArr=new Array();
		this.mStopover=null;
	}
	MoveDir(_key=null)
	{
		if(_key==null)
			return this.mMoveDir;
		var rVal =new CVec3();
		for (var i = 0; i < this.mForceArr.length; ++i)
		{
			if (this.mForceArr[i].mKey==_key || _key==null)
			{
				var dirPower = CMath.V3MulFloat(this.mForceArr[i].mDirection,this.mForceArr[i].mVelocity);
				rVal = CMath.V3AddV3(rVal, dirPower);
				break;
			}
		}
		if (rVal.x == 0 && rVal.y == 0 && rVal.z == 0)
		{
		}
		else
		{
			rVal = rVal;
		}
		return rVal;
	}
	ResetGravity()
	{
		//this.PatchExe("mForceArr");
		if(this.mForceGravity != null)
		{
			this.mForceGravity.mTime=0;
		}
	}
	
	
	Collision(_org : CCollider,_size : number,_tar : Array<CCollider>,_push : Array<CVec3>)
	{

	}
	Jump(_power : number)
	{
		
	}
	Move(_dir : CVec3,_power : number)
	{
		
	}

	
	Ground(_co : Array<CCollusionObject>)
	{
		
		
	}
	override ImportCJSON(_json: CJSON)
	{
		this.Remove("g");
		return super.ImportCJSON(_json);
	}
	//리지드 바디는 포지션 패치를 수동으로 한다.
	//데드레커닝 처리해야함
	public PatchStreamUpdate(_stream: CStream, _path: Array<string>): void 
	{
		//상위 pos 갱신
		if(this.IsPatchUpdate("mForceArr"))
			this.GetOwner().PatchStreamWrite(_stream,CString.PathArrToFullPath(_path,-1),"mPos");
		super.PatchStreamUpdate(_stream,_path)
	
	}
	PatchTrackDefault()
	{
		this.PatchTrack("mForceArr");
	}

}

import CRigidBody_imple from "../../canvas_imple/component/CRigidBody.js";



CRigidBody_imple();