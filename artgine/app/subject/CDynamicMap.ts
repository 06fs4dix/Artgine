import { CUpdate } from "../../basic/Basic.js";
import { CObject } from "../../basic/CObject.js";
import { CMat } from "../../geometry/CMat.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CUtilRender } from "../../render/CUtilRender.js";
import { CComponent } from "../component/CComponent.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CPaint2D, CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3D, CPaint3DMerge } from "../component/paint/CPaint3D.js";
import { CPaintMerge } from "../component/paint/CPaintMerge.js";
import { CSubjectMap } from "./CSubjectMap.js";

//맵에 넣은 페인트 하나가 어느 머지의 몇 번 슬롯에 들어가 있는지
class CDynamicItem
{
	mPaint : CPaint=null;
	mMerge : CPaintMerge=null;
	mSlot=-1;
	mBuildID=-1;
	mCodi=new Float32Array(4);
}

//동적으로 생성·삭제되는 오브젝트를 일반 서브젝트처럼 PushComp로 넣어 쓴다. 저장하지 않는다.
//CPaint2D/CPaint3D는 각자 그리지 않고, 텍스처·태그·색상이 같은 것끼리 머지 페인트 하나의 슬롯으로 그린다.
//넣은 페인트는 컴포넌트 배열에 넣지 않아 프레임마다 Update가 돌지 않는다. 대신 이 맵이 매 프레임
//행렬·codi·켜짐·삭제만 확인해 슬롯에 반영한다. 텍스처·태그·색상은 넣을 때 기준이라 바꿔도 반영되지 않는다.
//콜라이더는 일반 컴포넌트로 들어가 CSubjectMap의 재우기를 탄다.
export class CDynamicMap extends CSubjectMap
{
	private mItem=new Array<CDynamicItem>();
	private mItemMap=new Map<CPaint,CDynamicItem>();
	private mGroup=new Map<string,CPaintMerge>();
	private mMat=new CMat();
	private mCodi=new CVec4();

	override IsShould(_member: string, _type: CObject.eShould)
	{
		if(_member=="mItem" || _member=="mItemMap" || _member=="mGroup" || _member=="mMat" || _member=="mCodi")
			return false;
		return super.IsShould(_member,_type);
	}
	override PushComp<T extends CComponent>(_com : T) : T
	{
		if(this.IsItemPaint(_com)==false)	return super.PushComp(_com);
		const pt=_com as unknown as CPaint;
		if(this.mItemMap.has(pt))	return _com;
		pt.SetOwner(this);
		const item=new CDynamicItem();
		item.mPaint=pt;
		this.mItem.push(item);
		this.mItemMap.set(pt,item);
		return _com;
	}
	override FindComps(_type : any,_child=false,vec=new Array()) : any
	{
		super.FindComps(_type,_child,vec);
		for(const item of this.mItem)
		{
			const pt=item.mPaint;
			if(pt.IsDestroy())	continue;
			if(typeof _type=="string")
			{
				if(pt.Key()==_type)	vec.push(pt);
			}
			else if(typeof _type=="number")
			{
				if(pt.GetSysc()==_type)	vec.push(pt);
			}
			else if(pt instanceof _type)
				vec.push(pt);
		}
		return vec;
	}
	override DetachComp(_type : any) : any
	{
		for(const item of this.mItem)
		{
			const pt=item.mPaint;
			if(typeof _type=="string" ? pt.Key()==_type : pt instanceof _type)
			{
				this.ReleaseItem(item);
				return pt;
			}
		}
		return super.DetachComp(_type);
	}
	override Destroy()
	{
		for(const item of this.mItem)	item.mPaint.Destroy();
		this.mItem.length=0;
		this.mItemMap.clear();
		super.Destroy();
	}
	override Update(_update : CUpdate)
	{
		super.Update(_update);
		for(let i=0;i<this.mItem.length;++i)
		{
			const item=this.mItem[i];
			const pt=item.mPaint;
			if(pt.IsDestroy())
			{
				this.ReleaseItem(item);
				--i;
				continue;
			}
			if(pt.IsEnable()==false)
			{
				this.HideItem(item);
				continue;
			}
			if(item.mMerge==null)
			{
				item.mMerge=this.FindGroup(pt);
				if(item.mMerge==null)	continue;
			}
			const merge=item.mMerge;
			if(merge.IsReady()==false)	continue;
			if(item.mBuildID!=merge.GetBuildID())
			{
				item.mBuildID=merge.GetBuildID();
				item.mSlot=-1;
			}
			this.ModifyItem(item);
		}
	}

	//하위 클래스(CPaintHTML, CShadowPlane 등)는 자기 방식으로 그리므로 일반 컴포넌트로 둔다
	private IsItemPaint(_com : CComponent)
	{
		if(_com.constructor!==CPaint2D && _com.constructor!==CPaint3D)	return false;
		const pt=_com as unknown as CPaint;
		return pt.GetTag().has("tail")==false;
	}
	//2D 머지 슬롯은 크기 1 사각형(±0.5)이고 CPaint2D 메시는 Mesh2DSize 기준이라 그만큼 키운다.
	//CPaint2D의 로컬 행렬에는 크기·배율·반전·피벗·위치가 이미 들어 있다(CPaint2D.MatUpdate).
	private ItemMat(_pt : CPaint) : CMat
	{
		const m=this.mMat.mF32A;
		m.set(_pt.GetMat().mF32A);
		if(_pt instanceof CPaint2D)
		{
			const s=CUtilRender.Mesh2DSize;
			m[0]*=s;	m[1]*=s;	m[2]*=s;
			m[4]*=s;	m[5]*=s;	m[6]*=s;
		}
		this.mMat.UnitCheck();
		return this.mMat;
	}
	private ModifyItem(_item : CDynamicItem)
	{
		const pt=_item.mPaint, merge=_item.mMerge;
		const mat=this.ItemMat(pt);
		if(merge instanceof CPaint3DMerge)
		{
			if(_item.mSlot<0)	_item.mSlot=merge.Push((pt as CPaint3D).mMesh,mat);
			else	merge.Modify(_item.mSlot,mat);
			return;
		}
		const merge2D=merge as CPaint2DMerge;
		const codi=(pt as CPaint2D).GetTexCodi().mF32A, last=_item.mCodi;
		if(_item.mSlot<0)
		{
			last.set(codi);
			this.mCodi.mF32A.set(codi);
			_item.mSlot=merge2D.Push(mat,this.mCodi);
		}
		else if(codi[0]!=last[0] || codi[1]!=last[1] || codi[2]!=last[2] || codi[3]!=last[3])
		{
			last.set(codi);
			this.mCodi.mF32A.set(codi);
			merge2D.Modify(_item.mSlot,mat,this.mCodi);
		}
		else
			merge2D.Modify(_item.mSlot,mat);
	}
	private HideItem(_item : CDynamicItem)
	{
		if(_item.mSlot<0)	return;
		_item.mMerge.Remove(_item.mSlot);
		_item.mSlot=-1;
	}
	private ReleaseItem(_item : CDynamicItem)
	{
		this.HideItem(_item);
		const i=this.mItem.indexOf(_item);
		if(i>=0)
		{
			this.mItem[i]=this.mItem[this.mItem.length-1];
			this.mItem.pop();
		}
		this.mItemMap.delete(_item.mPaint);
	}
	//개별 페인트는 StartChk의 InitChk에서 텍스처 로드를 걸고(SetTexture는 owner가 있어야 로드한다) 2D는 크기를 정한 뒤
	//Start에서 로컬 행렬을 만든다. 맵에 넣은 페인트는 그게 돌지 않으므로 여기서 같은 일을 한다.
	//2D는 텍스처가 로드돼 크기가 정해질 때까지 null을 돌려주고 다음 프레임에 다시 본다.
	//3D의 InitChk는 개별 렌더용 메시 트리까지 만들어서 부르지 않고, 메시 로드는 머지가 한다
	private FindGroup(_pt : CPaint) : CPaintMerge
	{
		if(_pt instanceof CPaint2D)
		{
			_pt.InitChk();
			if(_pt.mInit==false)	return null;
			_pt.MatUpdate();
		}
		else if(_pt.GetTexture().length>0)
			_pt.SetTexture(_pt.GetTexture());
		const key=this.GroupKey(_pt);
		let merge=this.mGroup.get(key);
		if(merge!=null)	return merge;

		if(_pt instanceof CPaint2D)
		{
			const m2D=new CPaint2DMerge(null);
			m2D.SetYSort(_pt.mYSort);
			if(_pt.GetTag().has("wind"))	m2D.Wind(_pt.mWindInfluence.x);
			merge=m2D;
		}
		else
		{
			const pt3D=_pt as CPaint3D;
			const m3D=new CPaint3DMerge([],[],pt3D.mCenterPos,pt3D.mTargetScale);
			if(pt3D.GetTag().has("wind"))	m3D.Wind(pt3D.mWindInfluence.x);
			if(pt3D.GetTexture().length>0)	m3D.mTexOverride=[...pt3D.GetTexture()];
			merge=m3D;
		}
		if(_pt instanceof CPaint2D)	merge.SetTexture([..._pt.GetTexture()]);
		for(const tag of _pt.GetTag())
			if(tag!="codi")	merge.PushTag(tag);
		if(_pt.GetTag().has("colorModel"))	merge.SetColorModel(_pt.GetColorModel());
		if(_pt.GetTag().has("alphaModel"))	merge.SetAlphaModel(_pt.GetAlphaModel());
		this.mGroup.set(key,merge);
		this.PushComp(merge);
		return merge;
	}
	private GroupKey(_pt : CPaint) : string
	{
		const tag=[..._pt.GetTag()].filter(_t=>_t!="codi").sort().join(",");
		let key=tag+"|"+_pt.GetTexture().join(",")+"|"+_pt.GetColorModel().mF32A.join(",")+"|"+_pt.GetAlphaModel().mF32A.join(",");
		if(_pt instanceof CPaint2D)
			key="2D|"+key+"|"+_pt.mYSort+"|"+_pt.mWindInfluence.x;
		else
		{
			const pt3D=_pt as CPaint3D;
			key="3D|"+key+"|"+pt3D.mMesh+"|"+pt3D.mCenterPos+"|"+pt3D.mTargetScale+"|"+pt3D.mWindInfluence.x;
		}
		return key;
	}
}
