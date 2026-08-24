import {CVec3} from "../../geometry/CVec3.js"

export class CPhysics
{
	static GravityDir=new CVec3(0,-1);//중력 방향
	static GravityKey="g";
	static JumpKey="j";
	static GravityPow = 10;
	static GravityMaxPow = 500;
	static GravityAcc = 400;
	
	static StairsDownHeight=0;
	static StairsCenter=1;
	static CutMinPushValue=0.01;
	//걸을 수 있는 최대 경사각(도)의 기본값. 실제 값은 CRigidBody.mSlopeLimit이 캐릭터별로 가진다.
	//0이면 완전 평지만 접지로 본다. 크게 올리면 벽까지 바닥으로 인정되어 중력이 안 걸리니 주의.
	static GroundSlopeAngle=45;
	//접지 유지용 허용 관통량. CutMinPushValue보다 커야 매 프레임 접촉이 검출된다.
	static GroundSlop=0.03;
	//표면 마찰의 기본값(초당 감속량). 실제 값은 CCollider.mFriction이 표면별로 가진다.
	//0이면 감속하지 않는다(기존 동작).
	static SurfaceFriction=0;

	//반발계수의 기본값. 실제 값은 CCollider.mBounce가 표면별로 가진다.
	//0이면 되튀지 않고 밀어내기만 한다(기존 동작).
	static SurfaceBounce=0;
	//되튀는 힘이 쓰는 키.
	static BounceKey="b";
	//이 속도 미만으로 부딪히면 되튀지 않는다.
	//없으면 바닥에 놓인 물체가 중력 가속분만큼 계속 미세하게 튀어 떨린다.
	static BounceMinVel=30;
}
