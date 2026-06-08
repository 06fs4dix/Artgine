

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
		Collision:2,
		Static:3,
	};
	public mPaintLoad =null;
	public mBound =new  CBound;
	public mLayer  = "";
	//mStatic=false;


	public mPickRay = new Set<string>();
	public mCameraOut : string= null;
	public mCameraOutLast=false;

	public mCollision = new Set<string>();
	public mPushVec=new CVec3();
	
	
	//public mElevator=false;//엘리베이터인지
	public mStairs=false;//계단인지
	public mEvent=CCollider.eEvent.Collision;
	

	//점프해서 한쪽 방향에서 올라가는용. 2D게임에서 사용
	//특정 방향으로 설정시 그방향이랑 동일한 값일시 밀어내기 무시
	//캐릭터 오른쪽르고 갈때 방향도 오른쪽 설정시 동일 방향시 무시
	public mOneWayDir : CVec3=new CVec3();
	public mOneWayArc : number=-1;

	public mGJK : CGJK_EPA= new CGJK_EPA();
	mBW=new CBoundWorldCollider();

	public m2D : boolean;
	public mUpdateMat=CUpdate.eType.Updated;
	mColTarget =new CArray<CCollider>();
	mColPush =new CArray<CVec3>();
	mColPair=new Map<CCollider,CVec3>();

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
		if(this.mGI!=null)	
		{
			//this.mGI.mFixedComp.Push(this);

			if(this.mEvent!=CCollider.eEvent.Static || this.mGI.mOctree.mStaticBuild)	
			{	
				this.mGI.mFixedComp.Push(this);
			}
		}
			
		if(this.mEvent==CCollider.eEvent.Static && (this.GetOwner().mUpdateMat!=CUpdate.eType.Not || this.mUpdateMat!=CUpdate.eType.Not))	
		{
			if(this.mGI.mOctree.mStaticBuild==false)
			{
				this.mGI.mOctree.mStaticUpdate=true;
				this.mBW.Init(this.mBound,this.mOwner.GetMat());
			}
			
		}
			
		
		if(this.GetOwner().mUpdateRS!=CUpdate.eType.Not || this.mBW.mRadian==0)
		{
			

			this.mBW.Init(this.mBound,this.mOwner.GetMat());
		}
	}
	override BuildGI()
	{
		

		this.UpdateMat();

		if(this.IsEnable()==false || this.GetLayer()=="" || this.GetOwner().IsEnable()==false) return;

		
		this.mGI.mOctree.Insert(this.mBW.mPos, this.mBW.mSize,this,this.mBW.mWBound.mMin,this.mBW.mWBound.mMax,this.mEvent==CCollider.eEvent.Static);


	}
	GetBW()
	{
		return this.mBW;
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
	
	
	SetEvent(_event : number)
	{
		if(this.mGI!=null && (this.mEvent==CCollider.eEvent.Static || _event==CCollider.eEvent.Static))
			this.mGI.mOctree.mStaticUpdate=true;
		
		this.mEvent=_event;
		
	}
	
	SetLayer(_key : string)	
	{
		this.mLayer=_key;	
		this.mUpdateMat=CUpdate.eType.Updated;
	}
	GetLayer()	: string	{	return this.mLayer;	}
	
	// GetElevator()	{	return this.mElevator;	}
	// SetElevator(_elevator:boolean){ this.mElevator = _elevator;}
	

	GetStairs()	{	return this.mStairs;	}
	SetStairs(_stairs:boolean){ this.mStairs = _stairs;}
	
	override Fixed(_update : CUpdate)
	{
		
		
	}
	
	SetBoundType(_type)
	{
		this.mBound.SetType(_type);
		this.mBW.mBound.SetType(_type);
	}
	
	
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

	GetBound()
	{
		return this.mBound;	
	}
	

	
	CollisionChk( _co : CCollider,_colTarget : CArray<CCollider>,_colPush : CArray<CVec3>) : boolean
	{
		
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
import { CEvent } from "../../basic/CEvent.js";
CCollider_imple();