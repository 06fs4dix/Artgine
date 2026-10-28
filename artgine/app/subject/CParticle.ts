
import {CSubject} from "./CSubject.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CMath} from "../../geometry/CMath.js";

import {CRigidBody} from "../component/CRigidBody.js";
import {CForce} from "../component/CForce.js";
import {CCurve} from "../../util/CCurve.js";
import { CObject } from "../../basic/CObject.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { CUpdate } from "../../basic/Basic.js";
import { CSampler, CSampList, CSampMinMax } from "../../util/CSampler.js";
import { CSchedule } from "../../util/CSchedule.js";
import { CPool } from "../../basic/CPool.js";
import { CMat } from "../../geometry/CMat.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CTexture } from "../../render/CTexture.js";
import { CAtlas } from "../../util/CAtlas.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CPaint2D, CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3D, CPaint3DMerge } from "../component/paint/CPaint3D.js";
import { CPaintMerge } from "../component/paint/CPaintMerge.js";

//페인트 샘플로 만든 입자 하나. 머지의 슬롯이라 서브젝트처럼 스스로 움직이거나 사라지지 않으므로 상속 클래스가 직접 갱신하고 Remove 한다
export class CParticlePaint
{
	public mMerge : CPaintMerge;
	public mSlot : number;
	//2D 는 샘플 이미지 크기가 스케일에 이미 들어 있다
	public mMat : CMat;

	constructor(_merge : CPaintMerge,_slot : number,_mat : CMat)
	{
		this.mMerge=_merge;
		this.mSlot=_slot;
		this.mMat=_mat;
	}
	IsUse()	{	return this.mMerge.IsUse(this.mSlot);	}
	SetPos(_pos : {x:number,y:number,z:number})
	{
		const f=this.mMat.mF32A;
		f[12]=_pos.x;	f[13]=_pos.y;	f[14]=_pos.z;
		this.mMat.UnitCheck();
		this.Apply();
	}
	SetMat(_mat : CMat)
	{
		this.mMat.mF32A.set(_mat.mF32A);
		this.mMat.UnitCheck();
		this.Apply();
	}
	//알파는 2D 머지만 슬롯 단위로 지원한다
	SetAlpha(_alpha : number)
	{
		if(this.mSlot>=0 && this.mMerge instanceof CPaint2DMerge)
			this.mMerge.ModifyAlpha(this.mSlot,_alpha);
	}
	Remove()
	{
		this.mMerge.Remove(this.mSlot);
		this.mSlot=-1;
	}
	//머지가 시작되기 전에는 mMat 을 머지가 그대로 들고 있다가 Start 에서 쓰므로 mMat 만 고쳐도 반영된다
	private Apply()
	{
		if(this.mSlot>=0 && this.mMerge.IsReady())
			this.mMerge.Modify(this.mSlot,this.mMat);
	}
}

/*
	파티클 발생기. 입자가 어떻게 움직이는지는 이 클래스를 상속해서 LineUp(생성 시), Update(매 프레임, mChild 순회)로 정의한다.
	mSample : 만들 견본 목록(확률 지정 가능). 서브젝트면 복제, 문자열이면 CPool 키, 페인트면 샘플마다 만든 머지의 슬롯(CParticlePaint)
	페인트 입자는 서브젝트가 아니라서 이동·소멸을 LineUp 에서 받은 CParticlePaint 로 직접 관리한다
	자주 쓰는 형태는 아래 CParticleOut, CParticleTexBuf 로 제공한다
*/
export class CParticle extends CSubject
{

	public mSample : CSampList<CSubject|string|CPaint>=null;
	public mCreateCount=new CSampler(5);
	public mTimer=new CSchedule();
	private mPaintMerge=new Map<CPaint,CPaintMerge>();

	override IsShould(_member: string, _type: CObject.eShould)
	{
		if(_member=='mChild' || _member=='mComArr' || _member=='mTime' || _member=='mPaintMerge')
			return false;
		return super.IsShould(_member,_type);
	}
	constructor()
	{
		super();
		this.mTimer.mCount=0xfffffff;
		this.mTimer.mDelay=0.1;
		this.mTimer.mEnd=1*60*60;
	}

	//생성된 입자의 최초 상태를 정한다
	public LineUp(_objList : Array<CSubject|CParticlePaint>)
	{
	}

	private PaintCount()
	{
		let count=0;
		for(const merge of this.mPaintMerge.values())
			count+=merge.Size();
		return count;
	}
	//텍스처가 아직 로드되지 않았으면 null
	private PaintSize(_pt : CPaint2D) : CVec2
	{
		const size=_pt.GetSize();
		if(size!=null && size.IsZero()==false)	return size;
		const frame=this.GetFrame();
		if(frame==null || _pt.GetTexture().length==0)	return null;
		const tex=frame.Res().Find(_pt.GetTexture()[0]);
		if(tex instanceof CTexture)
		{
			if(tex.GetWidth()==1 && tex.GetHeight()==1)	return null;
			return new CVec2(tex.GetWidth(),tex.GetHeight());
		}
		if(tex instanceof CAtlas)
		{
			const codi=_pt.GetTexCodi();
			return new CVec2(Math.round(tex.GetWidth()*codi.x),Math.round(tex.GetHeight()*codi.y));
		}
		return null;
	}
	private FindMerge(_pt : CPaint) : CPaintMerge
	{
		let merge=this.mPaintMerge.get(_pt);
		if(merge!=null)	return merge;

		if(_pt instanceof CPaint2D)
		{
			const m2D=new CPaint2DMerge(null);
			m2D.SetYSort(_pt.mYSort);
			if(_pt.GetTag().has("wind"))	m2D.Wind(_pt.mWindInfluence.x);
			m2D.SetTexture([..._pt.GetTexture()]);
			merge=m2D;
		}
		else
		{
			const pt3D=_pt as CPaint3D;
			const m3D=new CPaint3DMerge([],[]);
			if(pt3D.GetTag().has("wind"))	m3D.Wind(pt3D.mWindInfluence.x);
			if(pt3D.GetTexture().length>0)	m3D.mTexOverride=[...pt3D.GetTexture()];
			merge=m3D;
		}
		if(_pt.GetRenderPass().length>0)	merge.PushRenderPass(_pt.GetRenderPass());
		for(const key of ["alphaCut","mask"])
		{
			const sa=_pt.FindCShaderAttr(key);
			if(sa!=null)	merge.PushCShaderAttr(sa);
		}
		for(const tag of _pt.GetTag())
			if(tag!="codi")	merge.PushTag(tag);
		if(_pt.GetTag().has("colorModel"))	merge.SetColorModel(_pt.GetColorModel());
		if(_pt.GetTag().has("alphaModel"))	merge.SetAlphaModel(_pt.GetAlphaModel());
		this.mPaintMerge.set(_pt,merge);
		this.PushComp(merge);
		return merge;
	}
	//2D 머지 슬롯은 크기 1 사각형이라 스케일에 이미지 크기를 넣는다. 로드가 덜 됐거나 지원하지 않는 페인트면 null
	//타이머와 mSample 없이 입자 하나를 바로 만든다. 페인트 샘플의 텍스처가 아직 로드되지 않았으면 null
	Emit(_sample : CPaint) : CParticlePaint
	{
		return this.PushPaint(_sample);
	}
	private PushPaint(_pt : CPaint) : CParticlePaint
	{
		const mat=new CMat();
		if(_pt instanceof CPaint2D)
		{
			const size=this.PaintSize(_pt);
			if(size==null)	return null;
			mat.mF32A[0]=size.x;	mat.mF32A[5]=size.y;
			mat.UnitCheck();
			const merge=this.FindMerge(_pt) as CPaint2DMerge;
			return new CParticlePaint(merge,merge.Push(mat,_pt.GetTexCodi()),mat);
		}
		if(_pt instanceof CPaint3D)
		{
			const merge=this.FindMerge(_pt) as CPaint3DMerge;
			const slot=merge.Push(_pt.mMesh,mat);
			if(slot<0)	return null;
			return new CParticlePaint(merge,slot,mat);
		}
		return null;
	}

	override async SubjectUpdate(_update : CUpdate)
	{
		super.SubjectUpdate(_update);
		if(this.mTimer.IsEndReset() && this.mChild.length==0 && this.PaintCount()==0)	this.Destroy();
		if(this.mTimer.Execute()==false || this.mSample==null)	return;



		let count=this.mCreateCount.Execute();
		var objArr=new Array<CSubject|CParticlePaint>();
		for(var i=0;i<count;++i)
		{
			let sub=this.mSample.Execute();
			if(sub==null){}
			else if(sub instanceof CSubject)
			{
				var obj=sub.Export();
				obj.SetKey(CUniqueID.GetHash());

				this.PushChild(obj);
				objArr.push(obj);
			}
			else if(sub instanceof CPaint)
			{
				var pp=this.PushPaint(sub);
				if(pp!=null)	objArr.push(pp);
			}
			else if(typeof sub =="string")
			{
				var obj=CPool.Product(sub) as CSubject;
				//CConsol.Log("Product : "+obj.Key());
				//obj.SetKey(CUniqueID.GetHash());

				this.PushChild(obj);
				objArr.push(obj);
			}

		}
		this.LineUp(objArr);


	}
	public toJSON(): { class: string; } {
		return {class:""};
	}
}

//위치에서 밖으로
export class CParticleOut extends CParticle
{
	public mDir=new CSampMinMax<CVec3>(new CVec3(-1,-1,-1),new CVec3(1,1,1));
	//생성 위치에 더하는 오프셋 (CSubject.mPos 와 구분)
	public mOffset=new CSampler(new CVec3());
	public mSpawnScale=new CSampMinMax<number>(1,1);
	public mMoveSpeed=new CSampler<number>(100);//속도 (CSubject.mSpeed 와 구분)
	public mMovementKey="CParticleOut";
	public mCurve=new CCurve();

	public override LineUp(_objList : Array<CSubject|CParticlePaint>)
	{
		super.LineUp(_objList);
		for(var each0 of _objList)
		{
			if(each0 instanceof CSubject==false)	continue;
			var rb=each0.FindComp(CRigidBody);
			if(rb==null)
			{
				rb=new CRigidBody();
				each0.PushComp(rb);
			}
			let force=new CForce(this.mMovementKey,this.mDir.Execute(),this.mMoveSpeed.Execute());
			force.SetCurve(this.mCurve);
			rb.Push(force);

			let sca=this.mSpawnScale.Execute();
			each0.SetSca(new CVec3(sca,sca,sca));


			var pos=this.mOffset.Execute();
			if(pos.IsZero()==false)
				each0.SetPos(CMath.V3AddV3(each0.GetPos(),pos));
		}
	}
}

export class CParticleTexBuf extends CParticleOut
{
	mBuf : Uint8Array;
	mWidth : number;
	mHeight : number;
	mScaleX=1;
	mScaleY=1;
	constructor(_buf : Uint8Array,_width,_height)
	{
		super();
		this.mBuf=_buf;
		this.mWidth=_width;
		this.mHeight=_height;
	}
	public override LineUp(_objList : Array<CSubject|CParticlePaint>)
	{
		if(this.mBuf==null)
		{
			for(var each0 of _objList)
			{
				if(each0 instanceof CSubject)	each0.Destroy();
				else	each0.Remove();
			}
			return;
		}

		super.LineUp(_objList);

		for(var each0 of _objList)
		{
			if(each0 instanceof CSubject==false)	continue;
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
