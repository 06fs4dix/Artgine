import {CComponent} from "../component/CComponent.js"
import {CForce} from "./CForce.js"
import {CVec3} from "../../geometry/CVec3.js"
import {CMath} from "../../geometry/CMath.js"
import {CCollider,CCollisionObject} from "../component/CCollider.js"
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
	
	// mStartPos : CVec3 = null;
	mForceArr = new Array<CForce>();
	mForceGravity : CForce = null;
	mStopover : CStopover=null;

	//mFreezePos = new Array<boolean>(false,false,false);
	//m_move = false;
	
	
	// private mRestitution = 0;//복원계수 : 팅겨나는 정도 밀어냄 0없음 1이하 서로 침범 범위만 1이상 밀어내는걸 넘어서 팅겨남


	// private mElastic = false;//탄성
	// private mDamping = 0;//감쇠/마찰력
	// private mMass = 0;//질량

	
	private mGravity : number = 0;//중력

	mFall = false;
	mJump = false;
	//mAutoDetrude=true;
	//mElevatorPos : CVec3= null;
	//mElevator : CSubject= null;
	mMoveDir=new CVec3();
	mPosUpdate=true;
	//mOneWayMap=new Map<any,number>();
	//m_update=Df.UpdateState.Not;
	mFreezePos = new Array<boolean>(false,false,false);
	mStartPos : CVec3 = null;

	Icon(){		return "bi bi-person-walking";	}
	SetGravity(_scale : number) {this.mGravity = _scale;}
	GetGravity(){return this.mGravity;}
	// SetRestitution(_restitution:number=0.5) {this.mRestitution = _restitution;}
	// GetRestitution(){return this.mRestitution;}

	//IsGravityNow(){return this.mIsGravity;}
	// SetFreezePos(_xfreeze:boolean,_yfreeze:boolean,_zfreeze:boolean){
	// 	this.mFreezePos = [_xfreeze,_yfreeze,_zfreeze];
	// }
	
	//GetJump(){return this.m_jump;}
	constructor()
	{
		super();
		this.mSysc=CComponent.eSysn.Wind;
		
	}
	Start(): void {
		this.mStartPos=this.GetOwner().GetPos().Export();
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
		if(_member=="mForceGravity")
			return true;
			
		return super.IsShould(_member,_type);
	}
	//IsMove()	{		return this.m_move;	}

	GetMoveQue()	{	return this.mForceArr;	}
	GetMoveQueGravity(){
		for(let each1 of this.mForceArr) if(each1.mKey==CPhysics.GravityKey) return each1;
		return null;
	}
	// Start(): void {
	// 	this.mStartPos = this.GetOwner().GetPos().Export();
	// }
	Update(_delay : number)
	{
	

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