

import {CSubject} from "../subject/CSubject.js";
import {CComponent} from "./CComponent.js";
import {CBound} from "../../geometry/CBound.js";
import {CRay} from "../../geometry/CRay.js";
import {CGJK_EPA, CGJKShape, CGJKSphere } from "../../geometry/CGJK_EPA.js";
import {CArray} from "../../basic/CArray.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CMath} from "../../geometry/CMath.js";
import {CTree} from "../../basic/CTree.js";
import {CMeshCopyNode} from "../../render/CMeshCopyNode.js";
import {CMeshTreeUpdate} from "../../render/CMeshTreeUpdate.js";
import {CMat} from "../../geometry/CMat.js";
import {CMesh} from "../../render/CMesh.js";
import {CPaint} from "./paint/CPaint.js";
import { CPaint2D } from "./paint/CPaint2D.js";
import {CPlaneInside} from "../../geometry/CPlaneInside.js";
import {CJSON} from "../../basic/CJSON.js";
import { CUpdate } from "../../basic/Basic.js";
import { CObject, CPointer } from "../../basic/CObject.js";
import { CUtilObj } from "../../basic/CUtilObj.js";

import { CBoundWorldCollider } from "./CBoundWorld.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";

import { CPhysics } from "./CPhysics.js";
import { CRigidBody } from "./CRigidBody.js";
import { CGeometryComp, CGeometryInfo } from "./CGeometryComp.js";


export class CCollisionObject
{
	public mTar : CCollider=null;
	public mOrg : CCollider=null;
	public mPush : CVec3=null;
	

	constructor(_org,_tar,_push)
	{
		this.mOrg=_org;
		this.mTar=_tar;
		this.mPush=_push;
	}
}


export class CCollider extends CGeometryComp
{
	static eEvent=
	{
		None:0,
		Trigger:1,
		Collision:2
	};
	public mPaintLoad =null;
	public mBound =new  CBound;
	public mLayer  = "";


	public mPickRay = new Set<string>();
	public mCameraOut : string= null;
	public mCameraOutLast=false;

	public mCollision = new Set<string>();
	public mPushVec=new CVec3();
	//public m_cameraOut = false;
	
	public mElevator=false;//엘리베이터인지
	public mStairs=false;//계단인지
	public mEvent=CCollider.eEvent.Collision;
	// public mDynamic=true;//static은 충돌 이벤트를 처리하지 않는다.
	// public mTrigger=false;

	//점프해서 한쪽 방향에서 올라가는용. 2D게임에서 사용
	//특정 방향으로 설정시 그방향이랑 동일한 값일시 밀어내기 무시
	//캐릭터 오른쪽르고 갈때 방향도 오른쪽 설정시 동일 방향시 무시
	public mOneWayDir : CVec3=new CVec3();
	public mOneWayArc : number=-1;

	public mGJK : CGJK_EPA= new CGJK_EPA();
	//public mGJKShape : CGJKShape=null;
	//public mBoundGJK :CBound =null;
	//public mCenterGJK=new CVec3();
	//public mSizeGJK=new CVec3();
	mBW=new CBoundWorldCollider();

	public m2D : boolean;
	public mUpdateMat=CUpdate.eType.Updated;
	mColTarget =new CArray<CCollider>();
	mColPush =new CArray<CVec3>();
	mColPair=new Map<CCollider,CVec3>();
	//mBoundType=CBound.eType.Null;

	constructor();
	constructor(_paint : CBound);
	constructor(_paint : CPaint);
	constructor(_paint : CPaint,_rb : CRigidBody);
	constructor(_paint : CBound,_rb : CRigidBody,_2d : boolean);
	constructor(_paint=null,_rb=null,_2d=false)
	{
		super();

		this.mRB=_rb;
		this.m2D=_2d;
		if(_paint !=null)
			this.InitBound(_paint);
		else
			this.mBound=new CBound();
		
		this.mSysc=CComponent.eSysn.Collider;
		
		//this.mBoundGJK=new CBound();
	}
	// Destroy(): void {
	// 	super.Destroy();
	// 	this.m_boundGJK.Delete();
	// 	// if(this.m_gjkShape!=null)
	// 	// {
	// 	// 	this.m_gjkShape.Delete();
	// 	// 	this.m_gjkShapeDown.Delete();
	// 	// }
		

	// }
	override Icon(){		return "bi bi-sign-railroad";	}
	RegistHeap(_F32A : Float32Array)
	{
		//this.m_heap.Push(_F32A);
	}
	
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		if(_pointer.member=="mCollision" || _pointer.member=="mGI" )
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[""]);
		else if(_pointer.member=="mCameraOut")
			CUtilObj.NullEdit(_pointer,_body,_input,"");

	}
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);
		if(_pointer.IsRef(this.mBound))
		{
			this.InitBound(this.mBound);
			this.mBW.mBound.mType=this.mBound.mType;
			this.mUpdateMat=CUpdate.eType.Updated;
			//break;
		}
		else if(_pointer.member=="mLayer")
		{
			this.mUpdateMat=CUpdate.eType.Updated;
		}
		
	
	}

	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mUpdateMat" || _member=="mGJK" || _member=="mPaintLoad" || 
			_member=="mPushVec" || _member=="mGI" || _member=="mBW" ||
			
			_member=="mColTarget" || _member=="mColPush" || _member=="mColPair" || 
			_member=="mOneWayMap" || _member=="mRB" || _member=="mCameraOutLast")
			return false;
			
			
		return super.IsShould(_member,_type);
	}
	override Export(_copy=true,_resetKey=true)	
	{	
		let dummy=super.Export(_copy,_resetKey);
		dummy.Import(this);
		dummy.mPaintLoad=this.mPaintLoad;

		return dummy;
	}
	
	override ImportCJSON(_json: CJSON) 
	{
		let wat = super.ImportCJSON(_json);
		this.InitBound(this.mBound);

		if((_json).GetBool("m_pickMouse"))
			this.SetPickMouse(true);
		if((_json).GetBool("m_cameraOut"))
			this.SetCameraOut(true);

		
		

		return wat;
	}
	SetOneWay(_radian : number,_dir=new CVec3(0,1))
	{
		this.mOneWayArc=1-_radian/CMath.PI();
		this.mOneWayDir=_dir;
	}
	static MeshToColliderList(_mesh : CMesh) : Array<CCollider>
	{
		
		
		var lmesh=_mesh;
		
		var tree = new CTree<CMeshCopyNode>();
		tree.mData=new CMeshCopyNode();
		var boundList=new Array<CBound>();
		var colList=new Array<CCollider>();
		CMeshTreeUpdate.TreeCopy(lmesh.meshTree,tree,new CMat(),boundList);
		
		for(var each0 of boundList)
		{
			var col=new CCollider(each0);
			col.PushCollisionLayer("");
			colList.push(col);
		}
		
		return colList;
	}
	override Update(_update: CUpdate) {
		if(this.mGI!=null)	this.mGI.mFixedComp.Push(this);

		if(this.GetOwner().mUpdateRS!=CUpdate.eType.Not || this.mBW.mRadian==0)
		{
			this.mBW.Init(this.mBound,this.mOwner.GetMat());
		}
	}
	override BuildGI()
	{
		

		this.UpdateMat();

		if(this.IsEnable()==false || this.GetLayer()=="" || this.GetOwner().IsEnable()==false) return;

		this.mGI.mOctree.Insert(this.mBW.mPos, this.mBW.mSize,this,this.mBW.mWBound.mMin,this.mBW.mWBound.mMax);


	}
	GetBoundGJK()
	{
		return this.mBW.mWBound;
	}
	override Prefab(_owner : CSubject)
	{
		if(this.mPaintLoad!=null)
		{
			if (this.m2D ? this.mPaintLoad.GetSize() != null : this.mPaintLoad.GetBound().GetType() != CBound.eType.Null) 
			{
				this.InitBound(this.mPaintLoad);
				this.mPaintLoad=null;
				
				this.UpdateMat();
			}
		}
	}
	override Start(): void {
		super.Start();
		this.mBW.Init(this.mBound,this.GetOwner().GetMat());
		this.mBW.UpdateMat(this.GetOwner().GetMat());
	}
	override StartChk()
	{
		let start=super.StartChk();
		if(this.mPaintLoad!=null)
		{
			this.InitBound(this.mPaintLoad);
			if(this.mPaintLoad!=null)
			{
				this.mStartChk=true;
				return false;
			}
		}
		
			


		if(this.mBound.GetType()==CBound.eType.Voxel)
		{
			this.mUpdateMat=CUpdate.eType.Not;
			return true;
		}
		
		return start;
	}
	override SetOwner(_obj: any): void {
		super.SetOwner(_obj);
		if(this.mPaintLoad==null)
			this.InitBound(this.mBound);
		this.UpdateMat();
	}

	InitBound(_bound : CBound);
	InitBound(_paint : CPaint);
	InitBound(_paint : any)
	{
		this.mBW.mRadian=0;
		if(_paint instanceof CBound)
		{
			this.mBound.Import(_paint);
			//this.m_mat=new CMat();
			
		}
		else
		{
			
				
			if((_paint as CPaint).IsStart()==false)
			{
				this.mPaintLoad=_paint;
				return;
			}
			this.mPaintLoad=null;
			let bound=_paint.GetBound().Export() as CBound;
			this.mBound.Reset();
			this.mBound.mMin.Import(bound.mMin);
			this.mBound.mMax.Import(bound.mMax);
			this.mBound.SetType(bound.GetType());
			
			
		}
	
		
		//this.mGJK=new CGJK_EPA();
		//this.mGJKShape=CGJKSphere.NewCBound(this.mBound,this.m2D);
		
		this.mUpdateMat=CUpdate.eType.Updated;
		if(this.GetOwner()!=null)
			this.UpdateMat();
	}
	
	//SetDamping(_damping:number){this.m_damping = _damping;}
	//SetDynamic(_dynamic:boolean){this.mDynamic = _dynamic;}
	//GetDynamic(){	return this.mDynamic;	}
	SetEvent(_event)
	{
		this.mEvent=_event;
	}
	
	SetLayer(_key : string)	
	{
		this.mLayer=_key;	
		this.mUpdateMat=CUpdate.eType.Updated;
	}
	GetLayer()	: string	{	return this.mLayer;	}
	// Bound2DInit(_size)
	// {
	// 	this.mBound.mMin = CMath.V3MulFloat(new CVec3(_size.x/2, _size.y/2, 1), -1);
	// 	this.mBound.mMax = new CVec3(_size.x/2, _size.y/2, 1);
	// 	this.BoxType();
		
	// }
	GetElevator()	{	return this.mElevator;	}
	SetElevator(_elevator:boolean){ this.mElevator = _elevator;}
	// GetTrigger()	{	return this.mTrigger;	}
	// SetTrigger(_enable:boolean){ this.mTrigger = _enable;}

	GetStairs()	{	return this.mStairs;	}
	SetStairs(_stairs:boolean){ this.mStairs = _stairs;}
	
	override Fixed(_update : CUpdate)
	{
		
		
	}
	//GetCUD() { return this.m_update;	};
	SetBoundType(_type)
	{
		this.mBound.SetType(_type);
		this.mBW.mBound.SetType(_type);
		// if(this.mBound.GetType()!=CBound.eType.Null)
		// {
		// 	this.mGJKShape=CGJKSphere.NewCBound(this.mBound,this.m2D);
		// 	this.mUpdateMat=CUpdate.eType.Updated;
		// 	this.ResetBoundGJK();
		// }
	}
	// BoxType() 
	// {
	// 	//this.mBound.SetType(CBound.eType.Box); 
	// 	this.mBoundType=CBound.eType.Box;
	// 	this.mGJKShape=CGJKSphere.NewCBound(this.mBound,this.m2D);
		
	// 	this.mUpdateMat=CState.eUpdate.Updated;
	// 	this.ResetBoundGJK();
	// }
	// SphereType()
	// {
	// 	this.mBound.SetType(CBound.eType.Sphere); 
	// 	this.mGJKShape=CGJKSphere.NewCBound(this.mBound,this.m2D);
		
	// 	this.mUpdateMat=CState.eUpdate.Updated;
	// 	this.ResetBoundGJK();
	// }
	// PolytopeType() 
	// {
	// 	this.mBound.SetType(CBound.eType.Polytope); 
	// 	this.mGJKShape=CGJKSphere.NewCBound(this.mBound,this.m2D);
		
	// 	this.mUpdateMat=CState.eUpdate.Updated;
	// 	this.ResetBoundGJK();
	// }
	
	
	PushCollisionLayer(_val : string|string[]) :void
	{
		if(typeof _val=="string")
			this.mCollision.add(_val);	
		else
		{
			for(let lay of _val)
			{
				this.mCollision.add(lay);
			}
		}
			
	}
	ClearCollisionLayer()
	{
		this.mCollision=new Set();
	}
	SetPickMouse(_val : boolean) { this.mPickRay.add(""); }	
	SetCameraOut(_val : boolean) { this.mCameraOut=""; }
	PushPickRay(_val)
	{
		this.mPickRay.add(_val);
	}

	// SetGJK(_wMat)
	// {
	// 	if(this.mGJKShape==null)
	// 		return;
	// 	//var aMat=CMath.MatMul(this.m_mat,_wMat);
	// 	this.mGJKShape.SetMatrix(_wMat);
	// }
	UpdateMat()
	{
		
		
		if(this.mUpdateMat!=CUpdate.eType.Not || this.GetOwner().mUpdateMat!=0)
		{
			
			//this.mGJKShape.SetMatrix(this.GetOwner().GetMat());
			this.mBW.UpdateMat(this.GetOwner().GetMat());
			
			if(this.mUpdateMat==CUpdate.eType.Updated)
				this.mUpdateMat=CUpdate.eType.Already;
		}
		
	}
	GetCollision() : Set<string>
	{
		return this.mCollision; 
	}
	//GetPickMouse() { return this.m_pickMouse; }
	//GetPickCamera() { return this.m_pickCamera; }
	GetBound()
	{
		return this.mBound;	
	}
	// GetWBound()
	// {
	// 	if(this.mLayer=="")
	// 		this.ResetBoundGJK(false);
		
	// 	return this.mBoundGJK;	
	// }
	// ResetBoundGJK(_layerChk=true)
	// {
		
		
	// 	//레이어가 없으면 충돌갱신 안함
	// 	if(this.mLayer=="" && _layerChk)	return;
		

	// 	let dPos=CPoolGeo.ProductV3();
	// 	let oPos=CPoolGeo.ProductV3();
	// 	if(this.mGJKShape instanceof CGJKSphere)
	// 	{
	// 		let r=(this.mGJKShape as CGJKSphere).GetRadian();
	// 		this.mCenterGJK.mF32A[0]=this.mGJKShape.GetMatrix().mF32A[12];
	// 		this.mCenterGJK.mF32A[1]=this.mGJKShape.GetMatrix().mF32A[13];
	// 		this.mCenterGJK.mF32A[2]=this.mGJKShape.GetMatrix().mF32A[14];
	// 		this.mSizeGJK.mF32A[0]=r;
	// 		this.mSizeGJK.mF32A[1]=r;
	// 		this.mSizeGJK.mF32A[2]=r;

	// 		this.mBoundGJK.mMax.mF32A[0]=this.mCenterGJK.mF32A[0]+r;
	// 		this.mBoundGJK.mMax.mF32A[1]=this.mCenterGJK.mF32A[1]+r;
	// 		this.mBoundGJK.mMax.mF32A[2]=this.mCenterGJK.mF32A[2]+r;

	// 		this.mBoundGJK.mMin.mF32A[0]=this.mCenterGJK.mF32A[0]-r;
	// 		this.mBoundGJK.mMin.mF32A[1]=this.mCenterGJK.mF32A[1]-r;
	// 		this.mBoundGJK.mMin.mF32A[2]=this.mCenterGJK.mF32A[2]-r;

			
	// 	}
	// 	else if(this.mGJKShape.GetMatrix().IsRotScaUnit())
	// 	{
	// 		this.mCenterGJK.mF32A[0]=this.mGJKShape.GetMatrix().mF32A[12];
	// 		this.mCenterGJK.mF32A[1]=this.mGJKShape.GetMatrix().mF32A[13];
	// 		this.mCenterGJK.mF32A[2]=this.mGJKShape.GetMatrix().mF32A[14];
			
	// 		CMath.V3AddV3(this.GetBound().mMin,this.mCenterGJK,this.mBoundGJK.mMin);
	// 		CMath.V3AddV3(this.GetBound().mMax,this.mCenterGJK,this.mBoundGJK.mMax);
	// 		this.mBoundGJK.GetSize(this.mSizeGJK);
			
			
	// 	}
	// 	else
	// 	{
			
	// 		this.mBoundGJK.mMin.mF32A[0]=100000;this.mBoundGJK.mMin.mF32A[1]=100000;this.mBoundGJK.mMin.mF32A[2]=100000;
	// 		this.mBoundGJK.mMax.mF32A[0]=-100000;this.mBoundGJK.mMax.mF32A[1]=-100000;this.mBoundGJK.mMax.mF32A[2]=-100000;

	// 		dPos.x=this.GetBound().mMin.x;dPos.y=this.GetBound().mMin.y;dPos.z=this.GetBound().mMin.z;
	// 		this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
	// 		dPos.x=this.GetBound().mMin.x;dPos.y=this.GetBound().mMin.y;dPos.z=this.GetBound().mMax.z;
	// 		this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
	// 		dPos.x=this.GetBound().mMin.x;dPos.y=this.GetBound().mMax.y;dPos.z=this.GetBound().mMin.z;
	// 		this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
	// 		dPos.x=this.GetBound().mMin.x;dPos.y=this.GetBound().mMax.y;dPos.z=this.GetBound().mMax.z;
	// 		this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
	// 		dPos.x=this.GetBound().mMax.x;dPos.y=this.GetBound().mMin.y;dPos.z=this.GetBound().mMin.z;
	// 		this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
	// 		dPos.x=this.GetBound().mMax.x;dPos.y=this.GetBound().mMin.y;dPos.z=this.GetBound().mMax.z;
	// 		this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
	// 		dPos.x=this.GetBound().mMax.x;dPos.y=this.GetBound().mMax.y;dPos.z=this.GetBound().mMin.z;
	// 		this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
	// 		dPos.x=this.GetBound().mMax.x;dPos.y=this.GetBound().mMax.y;dPos.z=this.GetBound().mMax.z;
	// 		this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));

	// 		this.mBoundGJK.GetCenter(this.mCenterGJK);
	// 		this.mBoundGJK.GetSize(this.mSizeGJK);
			
	// 	}
		
		
		
	// 	CPoolGeo.RecycleV3(oPos);
	// 	CPoolGeo.RecycleV3(dPos);

       
	// 	this.mBoundGJK.mType = CBound.eType.Box;
		
	// }
	// GetBoundGJK()
	// {
	// 	return this.mBoundGJK;	
	// }

	
	CollisionChk( _co : CCollider,_colTarget : CArray<CCollider>,_colPush : CArray<CVec3>) : boolean
	{
		let push : CVec3=null;

		push=this.mColPair.get(_co);
		if(push)	
		{
			if(_colTarget!=null)	_colTarget.Push(_co);
			if(_colPush!=null)	_colPush.Push(CMath.V3MulFloat(push,-1));
			return true;
		}
				
		//옥트리에서 회전이 없을시 AABB테스트만 해도 되니까 이렇게
		if(this.mBound.GetType()==_co.mBound.GetType() && this.mEvent==CCollider.eEvent.Trigger && 
			this.mBW.mMat.IsRotUnit() && _co.mBW.mMat.IsRotUnit())
		{
			if(_colTarget!=null)	_colTarget.Push(_co);
			if(_colPush!=null) _colPush.Push(this.mPushVec);
			return true;
		}
		else if(this.mBound.GetType()==CBound.eType.Sphere && _co.mBound.GetType()==CBound.eType.Sphere)
		{

			// let aCen=CPoolGeo.ProductV3();
			// let bCen=CPoolGeo.ProductV3();
			const aRadius = this.mBW.mRadian;
			// aCen.mF32A[0]=this.mGJKShape.GetMatrix().mF32A[12];
			// aCen.mF32A[1]=this.mGJKShape.GetMatrix().mF32A[13];
			// aCen.mF32A[2]=this.mGJKShape.GetMatrix().mF32A[14];
			const bRadius = _co.mBW.mRadian;
			// bCen.mF32A[0]=_co.mGJKShape.GetMatrix().mF32A[12];
			// bCen.mF32A[1]=_co.mGJKShape.GetMatrix().mF32A[13];
			// bCen.mF32A[2]=_co.mGJKShape.GetMatrix().mF32A[14];

			var dir=CMath.V3SubV3(this.mBW.mPos, _co.mBW.mPos);
			// CPoolGeo.RecycleV3(aCen);
			// CPoolGeo.RecycleV3(bCen);
			
			var vlen = CMath.V3Len(dir);
			if (vlen <= aRadius + bRadius)
			{
				//if(this.mDynamic==false)	return this.mPushVec;
				CMath.V3Nor(dir,dir);
				vlen = aRadius + bRadius - vlen;
				if (vlen < 0.01)
					vlen = 0.0;
				else
					vlen += 0.01;
				push=CMath.V3MulFloat(dir, -vlen);
			}
			else
				return false;
		}
		else if(this.mBound.GetType()==CBound.eType.Box && _co.mBound.GetType()==CBound.eType.Box)
		{
			if(this.mBW.mMat.IsRotUnit()==false || _co.mBW.mMat.IsRotUnit()==false)
				push=CUtilMath.ColBoxBoxOBB(this.mBound,this.mBW.mMat,_co.mBound,_co.mBW.mMat);
			else
				push=CUtilMath.ColBoxBoxAABB(this.mBound,this.mBW.mMat,_co.mBound,_co.mBW.mMat);
		}
		
		else if(this.mBound.GetType()==CBound.eType.Sphere && _co.mBound.GetType()==CBound.eType.Box)
		{
			
			push=CUtilMath.ColSphereBox(this.mBW.mPos,this.mBW.mRadian,_co.mBound,_co.mBW.mMat);
			if(push!=null)
			push=CMath.V3MulFloat(push,-1);
		}
		
		else if(_co.mBound.GetType()==CBound.eType.Sphere && this.mBound.GetType()==CBound.eType.Box)
		{
			
			push=CUtilMath.ColSphereBox(_co.mBW.mPos,_co.mBW.mRadian,this.mBound,this.mBW.mMat);
		}
		else if(this.mGJK.Intersect(this.mBW,_co.mBW))
		//if(this.mGJK.Intersect(this.mBW,_co.mBW))
		{
			push=this.mGJK.EPA(this.mBW,_co.mBW);
		
			var ocen=this.mBW.mPos;
			var tcen=_co.mBW.mPos;
			var cen=CMath.V3SubV3(ocen,tcen);
			if(_co.GetBound().mMax.Equals(this.GetBound().mMax) &&
				_co.GetBound().mMin.Equals(this.GetBound().mMin) && CMath.V3Len(push)<0.000001)
			{
				if(cen.IsZero())
				{
					push.x=Math.random()-0.5;
					push.y=Math.random()-0.5;
					push.z=Math.random()-0.5;
					
				}
				else
					push=CCollider.PushingSphere(this.mBW.mWBound,_co.mBW.mWBound);
					
				
			}
			else
			{
				if(push.x > 0 &&  ocen.x > tcen.x) push.x = -push.x;
				else if(push.x < 0 && ocen.x < tcen.x) push.x = -push.x;
				if(push.y > 0 && ocen.y > tcen.y) push.y = -push.y;
				else if(push.y < 0 && ocen.y < tcen.y) push.y = -push.y;
				if(push.z > 0 && ocen.z > tcen.z) push.z = -push.z;
				else if(push.z < 0 && ocen.z < tcen.z) push.z = -push.z;
				

				
			}

		}
		


		if(push!=null)
		{
			if(Math.abs(push.x)<CPhysics.CutMinPushValue)	push.x=0;
			if(Math.abs(push.y)<CPhysics.CutMinPushValue)	push.y=0;
			if(Math.abs(push.z)<CPhysics.CutMinPushValue)	push.z=0;
			if(push.IsZero())
				return false;
			_co.mColPair.set(this,push);

			if(_colTarget!=null) _colTarget.Push(_co);
			if(_colPush!=null) _colPush.Push(push);

			return true;
		}

		


		return false;
	}
	
	
	static PushingSphere(_a : CBound,_b : CBound) : CVec3
	{
		var aRadius = _a.GetInRadius();
        var aCenter = _a.GetCenter();
        var bRadius = _b.GetInRadius();
        var bCenter = _b.GetCenter();
        var dir = CMath.V3SubV3(aCenter, bCenter);
        var len = CMath.V3Len(dir);
        dir = CMath.V3Nor(dir);
        len = aRadius + bRadius - len;
        if (len < 0.01)
            len = 0.0;
        else
            len += 0.01;
        return CMath.V3MulFloat(dir, -len);
	}
	static PushingBox(_a : CBound,_b : CBound) : CVec3
	{
		
		var aBound=_a;
		var bBound=_b;
		//========================
		// var cenA=aBound.GetCenter();
		// var cenB=bBound.GetCenter();
		// var sizeA=aBound.GetSize();
		// var sizeB=bBound.GetSize();

		// var x=-((cenA.x+sizeA.x*0.5)-(cenB.x+sizeB.x*0.5));
		// var y=-((cenA.y+sizeA.y*0.5)-(cenB.y+sizeB.y*0.5));
		// var z=-((cenA.z+sizeA.z*0.5)-(cenB.z+sizeB.z*0.5));

		// if(Math.abs(x)>Math.abs(y))
		// {
		// 	if(Math.abs(x)>Math.abs(z))
		// 		return new CVec3(x+x*0.001,0,0);
		// 	else
		// 	return new CVec3(0,0,z+z*0.001);
		// }
			
		
		// else if(Math.abs(y)>Math.abs(z))
		// 	return new CVec3(0,y+y*0.001,0);

		// return new CVec3(0,0,z+z*0.001);

		//==================================================
		var rate=0.001;
		var pushPos=new CVec3();
		var minVal=100000000;
		var val=0;
		
		val=aBound.mMin.x-bBound.mMax.x;
		if(minVal>Math.abs(val))
		{
			if(val>0)	val+=rate;	else val-=rate;
			minVal=Math.abs(val);
			pushPos.x=val;pushPos.y=0;pushPos.z=0;
		}
		val=aBound.mMax.x-bBound.mMin.x;
		if(minVal>Math.abs(val))
		{
			if(val>0)	val+=rate;	else val-=rate;
			minVal=Math.abs(val);
			pushPos.x=val;pushPos.y=0;pushPos.z=0;
		}
	
		
		val=aBound.mMin.y-bBound.mMax.y;
		if(minVal>Math.abs(val))
		{
			if(val>0)	val+=rate;	else val-=rate;
			minVal=Math.abs(val);
			pushPos.y=val;pushPos.x=0;pushPos.z=0;
		}
		val=aBound.mMax.y-bBound.mMin.y;
		if(minVal>Math.abs(val))
		{
			if(val>0)	val+=rate;	else val-=rate;
			minVal=Math.abs(val);
			pushPos.y=val;pushPos.x=0;pushPos.z=0;
		}
	
		
		
		
		val=aBound.mMin.z-bBound.mMax.z;
		if(minVal>Math.abs(val))
		{
			if(val>0)	val+=rate;	else val-=rate;
			minVal=Math.abs(val);
			pushPos.z=val;pushPos.x=0;pushPos.y=0;
		}
		val=aBound.mMax.z-bBound.mMin.z;
		if(minVal>Math.abs(val))
		{
			if(val>0)	val+=rate;	else val-=rate;
			minVal=Math.abs(val);
			pushPos.z=val;pushPos.x=0;pushPos.y=0;
		}
	
		
		return pushPos;
	}
	
	PickChk(_tVec3 : CRay) : boolean
	{		
		return null;
		
	}
	CameraOutChk(_plane) : Array<CPlaneInside>
	{
		return null;
		
	}
	//밀어내는 정도 0~1은 밀어내는 비율 0.5면 절반만 밀기
	//1이상은 100%밀어내고 추가로 밀어낼 거리값
	protected mRestitution = 0;
	
	mRB : CRigidBody=null;
	mOneWayMap=new Map<any,number>();
	
	SetRestitution(_restitution:number=0.5) {this.mRestitution = _restitution;}
	GetRestitution(){return this.mRestitution;}
	PushExe(_org : CCollider,_size : number,_tar : Array<CCollider>,_push : Array<CVec3>)
	{
		
	}
	
}
import CCollider_imple from "../../app_imple/component/CCollider.js";
CCollider_imple();