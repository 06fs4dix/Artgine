

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
import { CGlobalGeometryInfo } from "./CGlobalGeometryInfo.js";
import { CUpdate } from "../../basic/Basic.js";
import { CObject, CPointer } from "../../basic/CObject.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";

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


export class CCollider extends CComponent
{

	public mPaintLoad =null;
	public mBound =new  CBound;
	public mLayer  = "";


	public mPickRay = new Set<string>();
	public mPlaneOut : string= null;
	public mPlaneOutLast=false;

	public mCollision = new Set<string>();
	public mPushVec=new CVec3();
	//public m_cameraOut = false;
	
	public mElevator=false;//엘리베이터인지
	public mStairs=false;//계단인지
	public mDynamic=true;//static은 충돌 이벤트를 처리하지 않는다.
	public mTrigger=false;

	//점프해서 한쪽 방향에서 올라가는용. 2D게임에서 사용
	//특정 방향으로 설정시 그방향이랑 동일한 값일시 밀어내기 무시
	//캐릭터 오른쪽르고 갈때 방향도 오른쪽 설정시 동일 방향시 무시
	public mOneWayDir : CVec3=new CVec3();
	public mOneWayArc : number=-1;

	public mGGI : CGlobalGeometryInfo=null;
	public mGJK : CGJK_EPA= null;
	public mGJKShape : CGJKShape=null;
	public mBoundGJK :CBound =null;
	public mCenterGJK=new CVec3();
	public mSizeGJK=new CVec3();

	public m2D : boolean;
	public mUpdateMat=CUpdate.eType.Updated;
	mColTarget =new CArray<CCollider>();
	mColPush =new CArray<CVec3>();
	mColPair=new Map<CCollider,CVec3>();
	mBoundType=CBound.eType.Null;

	constructor();
	constructor(_paint : CBound);
	constructor(_paint : CPaint);
	constructor(_paint : CBound,_2d : boolean);
	constructor(_paint=null,_2d=false)
	{
		super();

		
		this.m2D=_2d;
		if(_paint !=null)
			this.InitBound(_paint);
		else
		{
			this.mBound=new CBound();
		}
		this.mSysc=CComponent.eSysn.Collider;
		
		this.mBoundGJK=new CBound();
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
	Icon(){		return "bi bi-sign-railroad";	}
	RegistHeap(_F32A : Float32Array)
	{
		//this.m_heap.Push(_F32A);
	}
	
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		if(_pointer.member=="mCollision" || _pointer.member=="mGGI" )
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[""]);

	}
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);
		if(_pointer.IsRef(this.mBound))
		{
			this.InitBound(this.mBound);
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
		if(_member=="mUpdateMat" || _member=="mGJK" || _member=="m_colMsg" || _member=="mPaintLoad" || 
			_member=="mGJKShape" || _member=="mPushVec" || _member=="mGGI" ||
			_member=="mBoundGJK" || _member=="mCenterGJK" || _member=="mSizeGJK" ||
			_member=="mColTarget" || _member=="mColPush")
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
	GeometryUpdate(_ggi : CGlobalGeometryInfo)
	{
		this.mGGI=_ggi;

		this.UpdateMat();

		if(this.IsEnable()==false || this.GetLayer()=="" || this.GetOwner().IsEnable()==false) return;

		_ggi.mOctree.Insert(this.mCenterGJK, this.mSizeGJK,this,this.mBoundGJK.mMin,this.mBoundGJK.mMax);


	}
	Prefab(_owner : CSubject)
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
	StartChk()
	{
		//super.StartChk();
		if(this.mPaintLoad!=null)
		{
			if (this.m2D ? this.mPaintLoad.GetSize() != null : this.mPaintLoad.GetBound().GetType() != CBound.eType.Null) 
			{
				this.InitBound(this.mPaintLoad);
				this.mPaintLoad=null;
				
				this.UpdateMat();
			}
			else
				return;
			
			
		}
		
			

		if(this.mGJKShape==null || this.mGGI==null)
			return;
		if(this.mBound.GetType()==CBound.eType.Voxel)
		{
			this.mUpdateMat=CUpdate.eType.Not;
			return;
		}
			
		
		this.mStartChk=false;
		this.Start();
	}
	SetOwner(_obj: any): void {
		super.SetOwner(_obj);
		if(this.mPaintLoad==null)
			this.InitBound(this.mBound);
		this.UpdateMat();
	}

	InitBound(_bound : CBound);
	InitBound(_paint : CPaint);
	InitBound(_paint : any)
	{
		if(_paint instanceof CBound)
		{
			this.mBound.Import(_paint);
			//this.m_mat=new CMat();
			
		}
		else
		{
			if(_paint instanceof CPaint2D)
			{
				this.m2D=true;
				//사이즈를 확인해보고
				if(_paint.GetSize()==null)	_paint.SizeCac();
				//그래도 널이다
				if(_paint.GetSize()==null)
				{
					this.mPaintLoad=_paint;
					return;
				}	
			}
			
				
			if(_paint.GetBound().GetType()==CBound.eType.Null)
			{
				this.mPaintLoad=_paint;
				return;
			}
			
			let bound=_paint.GetBound().Export() as CBound;
			this.mBound.Reset();
			this.mBound.InitBound(CMath.V3MulMatCoordi(bound.mMin, _paint.GetLMat()));
			this.mBound.InitBound(CMath.V3MulMatCoordi(bound.mMax, _paint.GetLMat()));
			let size=this.mBound.GetSize();
	
			this.mBound.mMin.x=-size.x*0.5;this.mBound.mMin.y=-size.y*0.5;this.mBound.mMin.z=-size.z*0.5;
			this.mBound.mMax.x=size.x*0.5;this.mBound.mMax.y=size.y*0.5;this.mBound.mMax.z=size.z*0.5;

			if(this.mBoundType==CBound.eType.Null)
			{
				this.mBound.SetType(bound.GetType());
				this.mBoundType=bound.GetType();
			}
			else
				this.mBound.SetType(this.mBoundType);
			
		}
		if(this.m2D)
		{
			this.mBound.mMax.z=this.mBound.GetInRadius();
			this.mBound.mMin.z=-this.mBound.mMax.z;
			
		}
		this.mGJK=new CGJK_EPA();
		this.mGJKShape=CGJKSphere.NewCBound(this.mBound,this.m2D);
		
		this.mUpdateMat=CUpdate.eType.Updated;
		if(this.GetOwner()!=null)
			this.UpdateMat();
	}
	
	//SetDamping(_damping:number){this.m_damping = _damping;}
	SetDynamic(_dynamic:boolean){this.mDynamic = _dynamic;}
	GetDynamic(){	return this.mDynamic;	}
	
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
	GetTrigger()	{	return this.mTrigger;	}
	SetTrigger(_enable:boolean){ this.mTrigger = _enable;}

	GetStairs()	{	return this.mStairs;	}
	SetStairs(_stairs:boolean){ this.mStairs = _stairs;}
	
	Update(_delay)
	{
		
		
	}
	//GetCUD() { return this.m_update;	};
	SetBoundType(_type)
	{
		this.mBoundType=_type;
		if(this.mBound.GetType()!=CBound.eType.Null)
		{
			this.mGJKShape=CGJKSphere.NewCBound(this.mBound,this.m2D);
			this.mUpdateMat=CUpdate.eType.Updated;
			this.ResetBoundGJK();
		}
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
	SetPickMouse(_val : boolean) { this.mPickRay.add("Main"); }	
	SetCameraOut(_val : boolean) { this.mPlaneOut="Main"; }
	PushPickRay(_val)
	{
		this.mPickRay.add(_val);
	}

	SetGJK(_wMat)
	{
		if(this.mGJKShape==null)
			return;
		//var aMat=CMath.MatMul(this.m_mat,_wMat);
		this.mGJKShape.SetMatrix(_wMat);
	}
	UpdateMat()
	{
		if(this.mGJKShape==null)
			return;
		
		if(this.mUpdateMat!=CUpdate.eType.Not || this.GetOwner().mUpdateMat!=0)
		{
			
			this.mGJKShape.SetMatrix(this.GetOwner().GetWMat());
			this.ResetBoundGJK();
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
	GetWBound()
	{
		if(this.mLayer=="")
			this.ResetBoundGJK(false);
		
		return this.mBoundGJK;	
	}
	ResetBoundGJK(_layerChk=true)
	{
		
		
		//레이어가 없으면 충돌갱신 안함
		if(this.mLayer=="" && _layerChk)	return;
		

		let dPos=CPoolGeo.ProductV3();
		let oPos=CPoolGeo.ProductV3();
		if(this.mGJKShape instanceof CGJKSphere)
		{
			let r=(this.mGJKShape as CGJKSphere).GetRadian();
			this.mCenterGJK.mF32A[0]=this.mGJKShape.GetMatrix().mF32A[12];
			this.mCenterGJK.mF32A[1]=this.mGJKShape.GetMatrix().mF32A[13];
			this.mCenterGJK.mF32A[2]=this.mGJKShape.GetMatrix().mF32A[14];
			this.mSizeGJK.mF32A[0]=r;
			this.mSizeGJK.mF32A[1]=r;
			this.mSizeGJK.mF32A[2]=r;

			this.mBoundGJK.mMax.mF32A[0]=this.mCenterGJK.mF32A[0]+r;
			this.mBoundGJK.mMax.mF32A[1]=this.mCenterGJK.mF32A[1]+r;
			this.mBoundGJK.mMax.mF32A[2]=this.mCenterGJK.mF32A[2]+r;

			this.mBoundGJK.mMin.mF32A[0]=this.mCenterGJK.mF32A[0]-r;
			this.mBoundGJK.mMin.mF32A[1]=this.mCenterGJK.mF32A[1]-r;
			this.mBoundGJK.mMin.mF32A[2]=this.mCenterGJK.mF32A[2]-r;

			
		}
		else if(this.mGJKShape.GetMatrix().IsRotUnit())
		{
			this.mCenterGJK.mF32A[0]=this.mGJKShape.GetMatrix().mF32A[12];
			this.mCenterGJK.mF32A[1]=this.mGJKShape.GetMatrix().mF32A[13];
			this.mCenterGJK.mF32A[2]=this.mGJKShape.GetMatrix().mF32A[14];
			
			CMath.V3AddV3(this.GetBound().mMin,this.mCenterGJK,this.mBoundGJK.mMin);
			CMath.V3AddV3(this.GetBound().mMax,this.mCenterGJK,this.mBoundGJK.mMax);
			this.mBoundGJK.GetSize(this.mSizeGJK);
			
			
		}
		else
		{
			
			this.mBoundGJK.mMin.mF32A[0]=100000;this.mBoundGJK.mMin.mF32A[1]=100000;this.mBoundGJK.mMin.mF32A[2]=100000;
			this.mBoundGJK.mMax.mF32A[0]=-100000;this.mBoundGJK.mMax.mF32A[1]=-100000;this.mBoundGJK.mMax.mF32A[2]=-100000;

			dPos.x=this.GetBound().mMin.x;dPos.y=this.GetBound().mMin.y;dPos.z=this.GetBound().mMin.z;
			this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
			dPos.x=this.GetBound().mMin.x;dPos.y=this.GetBound().mMin.y;dPos.z=this.GetBound().mMax.z;
			this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
			dPos.x=this.GetBound().mMin.x;dPos.y=this.GetBound().mMax.y;dPos.z=this.GetBound().mMin.z;
			this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
			dPos.x=this.GetBound().mMin.x;dPos.y=this.GetBound().mMax.y;dPos.z=this.GetBound().mMax.z;
			this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
			dPos.x=this.GetBound().mMax.x;dPos.y=this.GetBound().mMin.y;dPos.z=this.GetBound().mMin.z;
			this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
			dPos.x=this.GetBound().mMax.x;dPos.y=this.GetBound().mMin.y;dPos.z=this.GetBound().mMax.z;
			this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
			dPos.x=this.GetBound().mMax.x;dPos.y=this.GetBound().mMax.y;dPos.z=this.GetBound().mMin.z;
			this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));
			

			
			dPos.x=this.GetBound().mMax.x;dPos.y=this.GetBound().mMax.y;dPos.z=this.GetBound().mMax.z;
			this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(),oPos));

			this.mBoundGJK.GetCenter(this.mCenterGJK);
			this.mBoundGJK.GetSize(this.mSizeGJK);
			
		}
		
		
		
		CPoolGeo.RecycleV3(oPos);
		CPoolGeo.RecycleV3(dPos);

       
		this.mBoundGJK.mType = CBound.eType.Box;
		
	}
	GetBoundGJK()
	{
		return this.mBoundGJK;	
	}
	//GetLMat() {	return this.m_mat;	}
	
	CollisionChk( _co : CCollider) : CVec3
	{
		return null;
	}
	
	Pushing(_co : CCollider) : CVec3
	{
		return null;
	}
	static PushingSphere(_a : CBound,_b : CBound) : CVec3
	{
		return null;
	}
	static PushingBox(_a : CBound,_b : CBound) : CVec3
	{
		
		return null;
	}
	PushingGJK(_co : CCollider) : CVec3
	{

		return null;
	}
	PickChk(_tVec3 : CRay) : boolean
	{
		return true;
		
	}
	CameraOutChk(_plane) : Array<CPlaneInside>
	{
		return null;
	}
	
}
import CCollider_imple from "../../canvas_imple/component/CCollider.js";
import CStage from "../../../proj/2D/Maze/CStage.js";



CCollider_imple();