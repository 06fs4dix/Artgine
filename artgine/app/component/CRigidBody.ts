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
import { CUpdate } from "../../basic/Basic.js"
import { CGeometryComp } from "./CGeometryComp.js"




var yPath=true;

export class CRigidBody extends CGeometryComp
{
	
	// mStartPos : CVec3 = null;
	mForceArr = new Array<CForce>();
	mForceGravity : CForce = null;
	mStopover : CStopover=null;

	//mFreezePos = new Array<boolean>(false,false,false);
	//m_move = false;
	
	
	// private mRestitution = 0;//복원계수 : 팅겨나는 정도 밀어냄 0없음 1이하 서로 침범 범위만 1이상 밀어내는걸 넘어서 팅겨남


	// private mElastic = false;//탄성
	// private mMass = 0;//질량

	//충돌로 밀린 힘(BounceKey)이 초당 줄어드는 속도. 등감속이라 v -= mDamping*dt로 깎는다.
	//표준 linear damping(v에 비례하는 지수 감쇠)과 수식이 다르니 주의.
	//밀려나는 거리 = v²/(2*mDamping). 크게 줄수록 부딪혀도 제자리에 선다.
	//접촉면의 성질인 마찰(CCollider.mFriction)과 달리 물체 자신의 성질이라 접지와 무관하게 걸린다.
	//대상은 충돌이 만든 힘 하나뿐이다. 중력/걷기/점프/사용자가 던진 힘은 건드리지 않는다
	//(그쪽을 멈추는 건 접지 마찰 mGroundFriction의 몫이다).
	mDamping = CPhysics.LinearDamping;

	
	private mGravity : number = 0;//중력

	mFall = false;
	mJump = false;
	//접지 상태. 충돌(Collider)이 세우고, 다음 스텝 Fixed가 읽은 뒤 끈다.
	mGround = false;
	//밟고 있는 면의 마찰. mGround와 같은 수명으로 충돌이 전달한다.
	mGroundFriction = 0;
	//걸을 수 있는 최대 경사각(도). 이 각도를 넘는 면은 접지로 보지 않아 미끄러진다.
	//캐릭터마다 다르다. 사람은 45 전후, 차량이나 거미형은 더 크게 준다.
	mSlopeLimit = CPhysics.GroundSlopeAngle;
	//위 각도의 코사인 캐시. 값이 바뀌면 스스로 다시 계산한다.
	private mSlopeLimitLast = -1;
	private mSlopeLimitDot = 0;
	//질량. 부딪힌 두 물체가 각각 얼마나 밀려날지를 나누는 데 쓴다.
	//0 이하는 무한 질량으로 보아 밀려나지 않는다.
	mMass = 1;
	//mAutoDetrude=true;
	//mElevatorPos : CVec3= null;
	//mElevator : CSubject= null;
	mMoveDir=new CVec3();
	mPosUpdate=true;
	//mOneWayMap=new Map<any,number>();
	//m_update=Df.UpdateState.Not;
	mFreezePos = new Array<boolean>(false,false,false);
	mStartPos : CVec3 = null;
	mLastDir =CVec3.eDir.Null;

	override Icon(){ return "bi bi-speedometer2"; }
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
		//충돌 보정이 스텝의 마지막 위치 쓰기가 되도록 Collider보다 앞에서 이동한다.
		this.mSysc=CComponent.eSysn.Move;
		
	}
	override Start(): void {
		this.mStartPos=this.GetOwner().GetPos().Export();
	}
	override EditChange(_pointer : CPointer)
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
	IsGround()
	{
		return this.mGround;
	}
	//역질량. 무한 질량(0 이하)은 0을 돌려준다.
	//밀어내기 분배는 질량이 아니라 역질량 비율로 나눈다.
	InvMass()
	{
		if(this.mMass<=0)	return 0;
		return 1/this.mMass;
	}
	//접지 판정용 임계 dot. 에디터/JSON/네트워크 어느 경로로 값이 바뀌어도 자동 반영된다.
	SlopeLimitDot()
	{
		if(this.mSlopeLimit!=this.mSlopeLimitLast)
		{
			this.mSlopeLimitLast=this.mSlopeLimit;
			this.mSlopeLimitDot=Math.cos(this.mSlopeLimit*CMath.PI()/180);
		}
		return this.mSlopeLimitDot;
	}
	override Provider(_type: string, _state : Array<string>): void 
	{
		//let lastDir=-1;
		for(let f of this.mForceArr)
		{
			_state.push("/rigidBody/force/"+f.Key());
			
			if(f.Key()=="g")    continue;
			
			let dirDot=[0,0,0,0,0,0];

			//CConsol.Log(com.MoveDir());
			
			dirDot[CVec3.eDir.Up]=CMath.V3Dot(CVec3.Up(),f.mDirection);
			dirDot[CVec3.eDir.Down]=CMath.V3Dot(CVec3.Down(),f.mDirection);
			dirDot[CVec3.eDir.Left]=CMath.V3Dot(CVec3.Left(),f.mDirection);
			dirDot[CVec3.eDir.Right]=CMath.V3Dot(CVec3.Right(),f.mDirection);
			dirDot[CVec3.eDir.Front]=CMath.V3Dot(CVec3.Front(),f.mDirection);
			dirDot[CVec3.eDir.Back]=CMath.V3Dot(CVec3.Back(),f.mDirection);

			let select=-1;
			let selectMax=0;
			for(let i=0;i<6;++i)
			{
				if(dirDot[i]>selectMax)
				{
					selectMax=dirDot[i];
					select=i;
				}
			}
			if(select!=-1)	this.mLastDir=select;
			
			_state.push("/rigidBody/force/"+f.mKey+select);

			// switch(select)
			// {
			// 	case CVec3.eDir.Left:_state.push("/rigidBody/force/"+f.mKey+CVec3.eDir.Left);break;
			// 	case CVec3.eDir.Right:_state.push("/rigidBody/force/"+f.mKey+CVec3.eDir.Right);break;
			// 	case CVec3.eDir.Up:_state.push("/rigidBody/force/"+f.mKey+CVec3.eDir.Up);break;
			// 	case CVec3.eDir.Down:_state.push("/rigidBody/force/"+f.mKey+CVec3.eDir.Down);break;
			// 	case CVec3.eDir.Front:_state.push("/rigidBody/force/"+f.mKey+CVec3.eDir.Front);break;
			// 	case CVec3.eDir.Back:_state.push("/rigidBody/force/"+f.mKey+CVec3.eDir.Back);break;
			// }
			//if(lastDir==-1)	_state.push("/rigidBody/force/"+f.mKey+CVec3.eDir.Back);break;
			
		}
		_state.push("/rigidBody/force/"+this.mLastDir);
		if(this.IsJump()) _state.push("/rigidBody/force/Jump");
		if(this.IsFall()) _state.push("/rigidBody/force/Fall");
	
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_type==CObject.eShould.Watch)
		{
			if(_member=="mForceArr")	return true;
			else return false;
		}
		

		if(_member=="mForceGravity")
			return true;

		if(_member=="mLastDir")
			return false;

		if(_member=="mGround")
			return false;

		//파생 캐시라 저장/동기화 대상이 아니다. mSlopeLimit만 저장하면 된다.
		if(_member=="mSlopeLimitLast" || _member=="mSlopeLimitDot")
			return false;

		//매 스텝 충돌이 전달하는 임시값이라 저장 대상이 아니다.
		if(_member=="mGroundFriction")
			return false;
			
		return super.IsShould(_member,_type);
	}
	//IsMove()	{		return this.m_move;	}
	override Update(_update: CUpdate) {
		if(this.GetGI()!=null)	this.GetGI().mFixedComp.Push(this);
	}
	GetForceArr()	{	return this.mForceArr;	}
	GetForceArrGravity(){
		for(let each1 of this.mForceArr) if(each1.mKey==CPhysics.GravityKey) return each1;
		return null;
	}
	// Start(): void {
	// 	this.mStartPos = this.GetOwner().GetPos().Export();
	// }
	override Fixed(_update : CUpdate)
	{
	

	}
	deltacount = 0;

	
	Push(move : CStopover) : CStopover;
	Push(move : CForce) : CForce;
	Push(move : CForce,duplication) : CForce;
	Push(move : Array<CForce>) : Array<CForce>;
 	Push(move,duplication=false) : any
	{
		//CConsol.Log("RB-Push");
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
			//this.PatchExe("mForceArr");
			if(duplication==false)
			{
				for (var i = 0; i < this.mForceArr.length; ++i)
				{
					if (this.mForceArr[i].mKey==move.mKey)
					{
						this.mForceArr[i].Import(move);
						return this.mForceArr[i];
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
				if (this.mForceArr[i].mKey==this.mStopover.mKey)
				{
					this.mForceArr.splice(i,1);
					i--;
				}
			}

			//옛 힘을 지운 그 자리에서 바로 다음 목표 지점용 새 힘도 붙인다. 원래는 Fixed()가 다음
			//물리 틱에야 늦게 붙였는데, Push()~다음 Fixed() 사이 "힘이 하나도 없는" 한 틱짜리 공백이
			//생겨서 그 틱만 이동량이 0이 되어 애니메이션이 walk<->idle로 깜빡이는 원인이 됐다
			//(FindPos()를 자주 부를수록 눈에 띄게 심해짐 — VillageRPG AI 재접근 주기 단축 때 발견).
			this.AdvanceStopoverForce();
		}
		return move;

	}

	//mStopover가 있는데 아직 그 키의 힘이 없으면, 다음 목표 지점을 찾아 방향/힘을 새로 붙인다.
	//Push(CStopover)가 옛 힘을 지운 직후와, Fixed()가 매 틱 확인할 때 양쪽에서 공유해서 쓴다 —
	//두 곳에 복사해두면 나중에 한쪽만 고치고 다른 쪽을 놓치는 사고가 나기 쉽다.
	//반환값: 이번 호출에서 실제로 새 힘을 붙였으면 true다. Fixed()는 이 값이 true인 틱엔 바로 이어서
	//추월 검사를 하지 않는다 — 막 붙인 힘을 같은 틱에 바로 다시 지워버리는 낭비를 막기 위함이다.
	AdvanceStopoverForce() : boolean
	{
		const stopover=this.mStopover;
		if(stopover==null || this.Find(stopover.mKey)!=null)	return false;

		const ownerPos=this.GetOwner().GetPos();
		let added=false;
		do
		{
			const tPos=stopover.mPos[stopover.mIndex];

			if(tPos==null)
			{
				this.mStopover=null;
				break;
			}

			if(tPos.Equals(ownerPos))
			{
				stopover.mIndex++;
				continue;
			}

			stopover.mDir=CMath.V3Nor(CMath.V3SubV3(tPos,ownerPos));
			this.Push(new CForce(stopover.mKey,stopover.mDir,stopover.mVelocity));
			added=true;

		}while(this.Find(stopover.mKey)==null)

		return added;
	}
	Remove(_key)
	{
		//CConsol.Log("Remove");
		//this.PatchExe("mForceArr");
		for (var i = 0; i < this.mForceArr.length; ++i)
		{
			if (this.mForceArr[i].mKey==(_key+""))
			{
				if(this.mForceArr[i]==this.mForceGravity)	this.mForceGravity=null;
				this.mForceArr.splice(i,1);
				
				break;
			}
		}
		
	}
	Find(_key : string)
	{
		for (var i = 0; i < this.mForceArr.length; ++i)
		{
			if (this.mForceArr[i].mKey==_key)
			{
				return this.mForceArr[i];
			}
		}
		return null;
	}
	Clear()
	{
		//this.PatchExe("mForceArr");
		this.mForceArr=new Array();
		this.mStopover=null;
		this.mForceGravity=null;
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
	// public override PatchStreamUpdate(_stream: CStream, _path: Array<string>): void 
	// {
	// 	//상위 pos 갱신
	// 	if(this.IsPatchUpdate("mForceArr"))
	// 		this.GetOwner().PatchStreamWrite(_stream,CString.PathArrToFullPath(_path,-1),"mPos");
	// 	super.PatchStreamUpdate(_stream,_path)
	
	// }
	// override PatchTrackDefault()
	// {
	// 	this.PatchTrack("mForceArr");
	// }

}


import CRigidBody_imple from "../../app_imple/component/CRigidBody.js";
import { CConsol } from "../../basic/CConsol.js"
CRigidBody_imple();