import { CUpdate } from "../../artgine/basic/Basic.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CArray } from "../../artgine/basic/CArray.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CConsol } from "../../artgine/basic/CConsol.js";
import { CDomFactory } from "../../artgine/basic/CDOMFactory.js";
import { CJSON } from "../../artgine/basic/CJSON.js";
import { CBlackBoardRef, CObject, CPointer } from "../../artgine/basic/CObject.js";
import { CTree } from "../../artgine/basic/CTree.js";
import { CCollider } from "../../artgine/canvas/component/CCollider.js";
import { CComponent } from "../../artgine/canvas/component/CComponent.js";
import { CForce } from "../../artgine/canvas/component/CForce.js";
import { CGlobalGeometryInfo } from "../../artgine/canvas/component/CGlobalGeometryInfo.js";
import { CRigidBody } from "../../artgine/canvas/component/CRigidBody.js";
import { CStopover } from "../../artgine/canvas/component/CStopover.js";
import { CPaint } from "../../artgine/canvas/component/paint/CPaint.js";
import { CPaint2D } from "../../artgine/canvas/component/paint/CPaint2D.js";
import { CPaint3D } from "../../artgine/canvas/component/paint/CPaint3D.js";
import { CRouteMsg } from "../../artgine/canvas/CRouteMsg.js";
import { CSubject } from "../../artgine/canvas/subject/CSubject.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CUtilMath } from "../../artgine/geometry/CUtilMath.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CMeshCopyNode } from "../../artgine/render/CMeshCopyNode.js";

import RAPIER from './rapier.mjs';

var gWorld;
var gEventQut;
var gColliderMap=new Map<any,CRapierCollider>();

export class CRapierCollider extends CCollider
{
    constructor(_paint : CBound);
    constructor(_paint : CPaint);
    constructor(_paint : CBound,_rb : CRigidBody);
    constructor(_paint : CPaint,_rb : CRigidBody);
    constructor(_paint,_rb : CRigidBody=null)
    {
        super(null);

        
        this.mRestitution=null;
        this.mEvent=null;
        this.mRB=_rb;

    
        //this.mSysc=CComponent.eSysn.RigidBody;
        if(_paint instanceof CBound)
            this.mBound.Import(_paint);
        else
            this.mPaintLoad=_paint;
        this.mSysc=CComponent.eSysn.RigidBody;
        //this.InitBound(_paint);
    }
    SetFrictionCombineRule(_role) 
    {
        this.mCL.setFrictionCombineRule(_role);
    }
    SetRestitutionCombineRule(_role) 
    {
        this.mCL.setRestitutionCombineRule(_role);
    }
    //복원계수
    SetRestitution(_value:number=1) 
    {
        if(this.mCL==null)
        {
            this.mRestitution=_value;
            return;
        }
        this.mCL.setRestitution(_value);   
    }
    
    //마찰
    SetFriction(_value:number) 
    {
        if(this.mCL==null)
        {
            this.mFriction=_value;
            return;
        }
        this.mCL.setFriction(_value);   
    }
    //질량
    SetDensity(_value: number) {
        if(this.mCL==null)
        {
            this.mDensity=_value;
            return;
        }
        this.mCL.setDensity(_value);   

    }
    SetEvent(_event) 
    {
        if(this.mCL==null)
        {
            this.mEvent=_event;
            return;
        }
        this.mCL.setSensor(true);
        if(_event==CCollider.eEvent.Trigger)
        {
            this.mCL.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        }
        else if(_event==CCollider.eEvent.Collision)
        {
            this.mCL.setSensor(false);
            this.mCL.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS);
            this.mCL.setContactForceEventThreshold(0.0);//초기화????
        }
    }
    mCL;//Collider
    mPaintLoad=null;
    mDensity: number | null = null;
    //mUpdate=CUpdate.eType.Updated;
    

    mColTargetSwap =new CArray<CCollider>();
    mColPushSwap =new CArray<CVec3>();

    //mEvent : number;
    //mRestitution=null;
    mFriction=null;//마찰
    
    SetOwner(_obj) {
        //super.SetOwner(_obj);
        this.mOwner=_obj;
    }
    StartChk() 
    {
        if(this.mStartChk==true)
        {
            this.mStartChk=false;
		    this.Start();   
        }
		
    }
    InitBound(_bound : CBound);
	InitBound(_paint : CPaint);
    InitBound(_bound)
    {
        if(this.GetOwner()==null)   return;
        if(this.mRB==null)
        {
            if(this.GetOwner()==null)   return;
            this.mRB=this.GetOwner().FindComp(CRapierRigidBody);
            if(this.mRB==null)  return;
        }

        let rb=(this.mRB as CRapierRigidBody);
        if(_bound instanceof CPaint)
        {
            //
            if(_bound instanceof CPaint2D)
            {
               
                if(_bound.GetSize()==null)	_bound.SizeCac();
                //그래도 널이다
                if(_bound.GetSize()==null)
                {
                    this.mPaintLoad=_bound;
                    return;
                }	
            }
            
                
            if(_bound.GetBound().GetType()==CBound.eType.Null)
            {
                this.mPaintLoad=_bound;
                return;
            }
            //this.mBound=_bound.GetBound().Export() as CBound;
			//bound.Reset();
            let mat=_bound.GetFMat().Export();
            mat.mF32A[3]=0;mat.mF32A[7]=0;mat.mF32A[11]=0;
			this.mBound.InitBound(CMath.V3MulMatCoordi(_bound.GetBound().mMin, mat));
			this.mBound.InitBound(CMath.V3MulMatCoordi(_bound.GetBound().mMax, mat));
        }
        // else
        // {
        //     this.mBound.Import(_bound);
        // }

        let size=this.mBound.GetSize();
        let cub=RAPIER.ColliderDesc.cuboid(size.x*0.5, size.y*0.5, size.z*0.5);
        this.mCL = gWorld.createCollider(cub, rb.mRB);
        //rb.mCenter=this.mBound.GetCenter();
        
        gColliderMap.set(this.mCL,this);

        this.mPaintLoad=null;
        
        const { bits } = CRapier.ResolveGroups(this.mLayer, this.mCollision);
        this.mCL.setCollisionGroups(bits);
        

        if(this.mEvent!=null)
        {
            this.SetEvent(this.mEvent);
            this.mEvent=null;

        }
        
            

        if(this.mRestitution!=null)
        {
            this.SetRestitution(this.mRestitution);
            this.mRestitution=null;
        }
        if(this.mFriction!=null)
        {
            this.SetFriction(this.mFriction);
            this.mFriction=null;
        }
        if(this.mDensity!=null)
        {
            this.SetDensity(this.mDensity);
            this.mDensity=null;
        }
    }
    Update(_delay: any): void {
        //super.Update(_delay);

        if(this.mPaintLoad!=null ||this.mCL==null)
        {
            if(this.GetOwner()==null)   return;
            this.InitBound(this.mPaintLoad);
            if(this.mPaintLoad!=null)   return;

        }


        
        if(this.mEvent!=CCollider.eEvent.None && this.mColTarget.Size()!=0)
        {
            let ctd=this.mColTargetSwap;
            let cpd=this.mColPushSwap;
            this.mColTargetSwap=this.mColTarget;
            this.mColPushSwap=this.mColPush;
            this.mColTarget=ctd;
            this.mColPush=cpd;
            this.mColTarget.Clear();
            this.mColPush.Clear();
            
            let msg : CRouteMsg;
            if(this.mEvent==CCollider.eEvent.Trigger)
                msg=this.GetOwner().NewInMsg("Trigger");
            else
                msg=this.GetOwner().NewInMsg("Collision");

            msg.mMsgData[0]=this;
			msg.mMsgData[1]=this.mColTargetSwap.Size();
			msg.mMsgData[2]=this.mColTargetSwap.mArray;
			msg.mMsgData[3]=this.mColPushSwap.mArray;
        }
        

    }
    Destroy(): void {
        super.Destroy();
        gColliderMap.delete(this.mCL);

        if (this.mCL) 
        {
            gWorld.removeCollider(this.mCL, /*wakeUpParent=*/true);
            this.mCL = null;
        }
    }
    EditHTMLInit(_div: HTMLDivElement, _pointer?: CPointer): void {
        _div.innerHTML="Not Support";
    }
}
export class CRapierRigidBody extends CRigidBody
{
    constructor(_dynamic=true)
    {
        super();
        if(_dynamic)
            this.mRB = gWorld.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0));
        else
            this.mRB = gWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0));
        this.mRB.setGravityScale(0, true);
    }
    mUpdate=CUpdate.eType.Updated;
    mRB;
    mCenter=new CVec3();
    mLateImpulse : CVec3=null;
    Start(): void {
    
        const wMat = this.GetOwner().GetWMat();
        const wPos = CMath.V3MulMatCoordi(new CVec3(0, 0, 0), wMat);
        const wRot= CMath.EulerToQut(CMath.MatDecomposeRot(wMat,true,true,true));

        this.mRB.setTranslation({ x: wPos.x+this.mCenter.x, y: wPos.y+this.mCenter.y, z: wPos.z+this.mCenter.z }, true);
        this.mRB.setRotation({x:wRot.x,y:wRot.y,z:wRot.z,w:wRot.w});
    }
    SetGravity(_scale : number)
	{
		this.mRB.setGravityScale(_scale, true);
	}
    SetFreezePos(_x:boolean,_y:boolean,_z:boolean)
    {
        this.mRB.setEnabledTranslations(!_x, !_y, !_z,true);
	}
    SetFreezeRot(_x:boolean,_y:boolean,_z:boolean)
    {
		this.mRB.setEnabledRotations(!_x, !_y, !_z, true);
	}
    
    Update(_delay: any): void {
        //super.Update(_delay);
        if(this.mLateImpulse!=null)
        {
            //const handles: number[] = this.mRB.colliders(); // 콜라이더 핸들들
            if(this.mRB.mass()!=0)
            {
                this.mRB.applyImpulse(this.mLateImpulse, true);
                this.mLateImpulse=null;
            }
            
        }
        if(this.GetOwner().mUpdateMat!=0 && this.mUpdate==CUpdate.eType.Not)
        {
            let wMat=this.GetOwner().GetWMat();
            const wPos = CMath.V3MulMatCoordi(new CVec3(0, 0, 0), wMat);
            this.mRB.setTranslation({ x: wPos.x+this.mCenter.x, y: wPos.y+this.mCenter.y, z: wPos.z+this.mCenter.z }, true);
        }
        this.mUpdate=CUpdate.eType.Not;
        // this.mUpdate!=0
        if(this.mRB.isSleeping()==false)
        {
            let pos=this.mRB.translation();
            const q = this.mRB.rotation(); 
            
            this.GetOwner().SetPos(CVec3.Vec3(pos.x-this.mCenter.x,pos.y-this.mCenter.y,pos.z-this.mCenter.z));
            this.GetOwner().SetRot(CVec4.Vec4(q.x, q.y, q.z, q.w));
            this.mUpdate=CUpdate.eType.Updated;
        }

        
            

        

    }
   
    Impulse(_value : CVec3)
    {
        
        if(this.mRB.mass()==0)
        {
            this.mLateImpulse=_value;
            return;
        }

        this.mRB.applyImpulse(_value, true);
    }
    Linvel(_value : CVec3)
    {
        if(this.mRB!=null)
            this.mRB.setLinvel(_value, true);
    }
    Clear()
	{
		if(this.mRB!=null)
        {
            this.mRB.setLinvel({x:0, y:0, z:0}, true);   // 선형속도 0
            this.mRB.setAngvel({x:0, y:0, z:0}, true);   // 각속도 0 (회전도 멈춤)
            this.mRB.resetForces(true);                  // 누적 힘 제거
            this.mRB.resetTorques(true);                 // 누적 토크 제거
            this.mRB.sleep(); 
        }
	}
    WakeUp()
    {
        this.mRB.wakeUp();
    }
    Push(move: CStopover);
    Push(move: CForce);
    Push(move: Array<CForce>);
    Push(move: any, duplication?: boolean): void {
        CAlert.E("Not Support!");
    }
    Destroy(): void {
        super.Destroy();
        
        if (this.mRB) {
            gWorld.removeRigidBody(this.mRB);
            this.mRB = null;
         
            return;
        }
        
    }
    EditHTMLInit(_div: HTMLDivElement, _pointer?: CPointer): void {
        _div.innerHTML="Not Support";
    }
    // EditInit(_pointer?: CPointer): HTMLElement {
    //     return CDomFactory.DataToDom("Not Support");
    // }
}



export class CRapier extends CComponent
{
    static eCombineRule=
    {
        Min:RAPIER.CoefficientCombineRule.Min,
        Max:RAPIER.CoefficientCombineRule.Max,
        Average:RAPIER.CoefficientCombineRule.Average,
        Multiply:RAPIER.CoefficientCombineRule.Multiply,
    }
    static async Init()
    {
        await RAPIER.init();
        const gravity = { x: 0, y: -9.8, z: 0 };
        //const gravity = { x: 0, y: 0, z: 0 };
        gWorld = new RAPIER.World(gravity);
        gEventQut = new RAPIER.EventQueue(true);
    }
    static Update(_delay)
    {
        gWorld.step(gEventQut);
        gEventQut.drainCollisionEvents((h1, h2, started) => 
        {
            const a = gColliderMap.get(gWorld.getCollider(h1));
            const b = gColliderMap.get(gWorld.getCollider(h2));
            a.mColTarget.Push(b);
        });
        gEventQut.drainContactForceEvents((e) => 
        {
            const ca = gWorld.getCollider(e.collider1());
            const cb = gWorld.getCollider(e.collider2());

            const a = gColliderMap.get(ca);
            const b = gColliderMap.get(cb);

            //const mag = e.totalForceMagnitude(); // 총 접촉 힘 크기(스칼라)

            

            // 1) 방향과 크기 얻기 (가용 API에 따라 선택)
            let dir = e.totalForce ? e.totalForce() : e.maxForceDirection(); // {x,y,z}
            let mag = e.totalForceMagnitude ? e.totalForceMagnitude()
                                            : e.maxForceMagnitude();

            // totalForce()가 있다면 이미 벡터이므로 정규화
            if (e.totalForce) {
                const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
                mag = len;
                dir = { x: dir.x / len, y: dir.y / len, z: dir.z / len };
            }

            // (선택) 부호 안정화: Manifold 노말(A->B)와 같은 방향으로 맞추기
            const pair = gWorld.contactPair?.(ca, cb) ?? gWorld.narrowPhase?.contactPair?.(ca, cb);
            if (pair && pair.numContactManifolds) {
                const m = pair.contactManifold(0);
                if (m) {
                const n = m.normal(); // A -> B
                const dot = dir.x*n.x + dir.y*n.y + dir.z*n.z;
                if (dot < 0) dir = { x:-dir.x, y:-dir.y, z:-dir.z };
                }
            }

            // 2) 각 콜라이더에 작용한 '힘' (A는 -dir, B는 +dir)
            a.mColTarget.Push(b);
            b.mColTarget.Push(a);
            a.mColPush.Push(new CVec3(-dir.x * mag,-dir.y * mag,-dir.z * mag));
            b.mColPush.Push(new CVec3(dir.x * mag,dir.y * mag,dir.z * mag));
            
        });
    }
    static PushCuboid(px, py, pz, hx, hy, hz)
    {
        const rb = gWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(px, py, pz));
        const cd = RAPIER.ColliderDesc.cuboid(hx, hy, hz);
        cd.setRestitution(1);
        cd.setFriction(0);
        gWorld.createCollider(cd, rb);
    }    
    private static _layerBits = new Map<string, number>();
    private static _nextBit = 0;

    static GetLayerMask(name: string): number {
        const key = name && name.length ? name : "Default";
        let bit = this._layerBits.get(key);
        if (bit == null) {
            if (this._nextBit >= 16) {
                console.warn(`[CRapier] 레이어는 최대 16개까지 권장됩니다. '${key}'를 'Default(1<<0)'로 대체합니다.`);
                bit = 1 << 0; // fallback
            } else {
                bit = 1 << this._nextBit++;
                this._layerBits.set(key, bit);
            }
        }
        return bit;
    }

    static GetFilterMask(set?: Set<string>): number {
        // 비어있으면 "모든 레이어와 충돌" 의미로 0xFFFF
        if (!set || set.size === 0) return 0xFFFF;
        let mask = 0;
        for (const name of set) mask |= this.GetLayerMask(name);
        return mask & 0xFFFF;
    }

    static MakeCollisionGroups(membershipMask: number, filterMask: number): number {
        // Rapier 헬퍼가 있으면 사용, 없으면 직접 합성
        // membership: 상위 16bit, filter: 하위 16bit
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if ((RAPIER as any).InteractionGroups?.get) {
            return (RAPIER as any).InteractionGroups.get(membershipMask & 0xFFFF, filterMask & 0xFFFF);
        }
        return (((membershipMask & 0xFFFF) << 16) | (filterMask & 0xFFFF)) >>> 0;
    }

    static ResolveGroups(layerName: string, targets: Set<string>): { membership: number, filter: number, bits: number } {
        const membership = this.GetLayerMask(layerName);
        const filter = this.GetFilterMask(targets);
        const bits = this.MakeCollisionGroups(membership, filter);
        return { membership, filter, bits };
    }
}

CClass.Push(CRapier);
CClass.Push(CRapierCollider);
CClass.Push(CRapierRigidBody);