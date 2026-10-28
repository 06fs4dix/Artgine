


import {CVec3} from "../geometry/CVec3.js"
import {CMath} from "../geometry/CMath.js"
import {CArray} from "../basic/CArray.js";
import {CObject,CPointer } from "../basic/CObject.js";
import { CJSON } from "../basic/CJSON.js";
import { CMat } from "./CMat.js";



export class CBound extends CObject
{
	public mMin : CVec3;
	public mMax : CVec3;
	public mType : number;
	public mPos : CArray<CVec3>;
	
	constructor()
	{
		super();
		this.mMin=new CVec3(1e30,1e30,1e30);
		this.mMax=new CVec3(-1e30,-1e30,-1e30);
		this.mType=CBound.eType.Null;
		this.mPos = new CArray<CVec3>();
	}
	NewWASM()
	{
		this.mMin.NewWASM();
		this.mMax.NewWASM();	}
	DeleteWASM()
	{
		this.mMin.ReleaseWASM();
		this.mMax.ReleaseWASM();
	}
	
	GetType()
	{
		return this.mType; 
	}
	SetType(_type) 
	{
		this.mType = _type; 
	}
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		super.EditForm(_pointer,_body,_input);
		if(_pointer.member == "mType")
		{
		
			let textArr = ["Box","Sphere","GJK","Triangle","Null"], valArr = [0,1,2,5,4];
			_input.hidden=true;
			let select=document.createElement("select") as HTMLSelectElement;
			select.className="form-select";
			for(var i=0;i<textArr.length;++i)
			{
				var opt = document.createElement("option");
				opt.value=valArr[i]+"";
				opt.text=textArr[i];
				if(_pointer.Get()==valArr[i])
					opt.selected=true;
				select.add(opt);
			}
			select.onchange=(_event)=>{
				var ct=_event.currentTarget as HTMLSelectElement;
				_pointer.Set(valArr[ct.selectedIndex]);
				(_input as HTMLInputElement).value=valArr[ct.selectedIndex]+"";
				if (_pointer.target instanceof CObject)
					_pointer.target.EditChange(_pointer,false);
			};

			//let select = CWatchUtil.Select(_pointer, _input, textArr, valArr);
			_body.append(select);




			select.addEventListener("change", () => {
				this.EditRefresh();
			});
		}
		
	}

	Reset()
	{
		this.mMin.mF32A[0]=1e30;this.mMin.mF32A[1]=1e30;this.mMin.mF32A[2]=1e30;
		this.mMax.mF32A[0]=-1e30;this.mMax.mF32A[1]=-1e30;this.mMax.mF32A[2]=-1e30;

		this.mType=CBound.eType.Null;
		//if(this.GetType()==CBound.eType.GJK)
		this.mPos.Clear();
	}
	private ResetBoxMinMax(_vec : CVec3)
	{
		if(this.mType == CBound.eType.Null) {
			this.mType=CBound.eType.Box;
		}
		this.mMin.mF32A[0]=CMath.Min(this.mMin.mF32A[0],_vec.mF32A[0]);
		this.mMin.mF32A[1]=CMath.Min(this.mMin.mF32A[1],_vec.mF32A[1]);
		this.mMin.mF32A[2]=CMath.Min(this.mMin.mF32A[2],_vec.mF32A[2]);
		
		this.mMax.mF32A[0]=CMath.Max(this.mMax.mF32A[0],_vec.mF32A[0]);
		this.mMax.mF32A[1]=CMath.Max(this.mMax.mF32A[1],_vec.mF32A[1]);
		this.mMax.mF32A[2]=CMath.Max(this.mMax.mF32A[2],_vec.mF32A[2]);
	}
	InitBound(_vInfo : number) : void;
	InitBound(_vInfo : Array<CVec3>) : void;
	InitBound(_vInfo : CVec3) : void;
	InitBound(_vInfo : CVec3,_push : boolean) : void;
	InitBound(_vInfo : CBound) : void;
	InitBound(_vInfo : any,_push=false) : void
	{
		if(typeof _vInfo == "number" )
		{
			//정점으로 초기화하는 경로(ResetBoxMinMax)와 달리 여기선 타입이 Null로 남아,
			//충돌 분기에서 Box-Box 전용 경로를 못 타고 GJK로 떨어진다
			if(this.mType == CBound.eType.Null)
				this.mType=CBound.eType.Box;
			this.mMin.x=-_vInfo;
			this.mMin.y=-_vInfo;
			this.mMin.z=-_vInfo;
			
			this.mMax.x=_vInfo;
			this.mMax.y=_vInfo;
			this.mMax.z=_vInfo;
		}
		else if(_vInfo instanceof CBound )
		{
			
			this.mMin.x=CMath.Min(_vInfo.mMin.x,this.mMin.x);
			this.mMin.y=CMath.Min(_vInfo.mMin.y,this.mMin.y);
			this.mMin.z=CMath.Min(_vInfo.mMin.z,this.mMin.z);

			this.mMax.x=CMath.Max(_vInfo.mMax.x,this.mMax.x);
			this.mMax.y=CMath.Max(_vInfo.mMax.y,this.mMax.y);
			this.mMax.z=CMath.Max(_vInfo.mMax.z,this.mMax.z);


			this.mPos.PushArray(_vInfo.mPos);

			
		}
		else if(_vInfo instanceof Array )
		{
			for (var each0 of _vInfo)
			{
				if(this.GetType()==CBound.eType.GJK || this.GetType()==CBound.eType.Triangle)
					this.mPos.Push(each0);
				this.ResetBoxMinMax(each0);
			}
		}
		else
		{
			//if(this.GetType()==CBound.eType.GJK)
			if(_push)	this.mPos.Push(_vInfo);
			
			this.ResetBoxMinMax(_vInfo);
		}	
	}
	GetInRadius()
	{
		var cen = this.GetCenter();
		var maxX = CMath.Max(this.mMax.mF32A[0] - cen.mF32A[0], this.mMin.mF32A[0] - cen.mF32A[0]);
		var maxY = CMath.Max(this.mMax.mF32A[1] - cen.mF32A[1], this.mMin.mF32A[1] - cen.mF32A[1]);
		var maxZ = CMath.Max(this.mMax.mF32A[2] - cen.mF32A[2], this.mMin.mF32A[2] - cen.mF32A[2]);

		return Math.min(maxX, maxY, maxZ);
	}
	GetOutRadius()
	{
		var cen = this.GetCenter();
		var maxX = CMath.Max(this.mMax.mF32A[0] - cen.mF32A[0], this.mMin.mF32A[0] - cen.mF32A[0]);
		var maxY = CMath.Max(this.mMax.mF32A[1] - cen.mF32A[1], this.mMin.mF32A[1] - cen.mF32A[1]);
		var maxZ = CMath.Max(this.mMax.mF32A[2] - cen.mF32A[2], this.mMin.mF32A[2] - cen.mF32A[2]);

		return Math.hypot(maxX, maxY, maxZ);
	}
	GetCenter(_copy : CVec3=null)
	{
		var L_cen=_copy;
		if(L_cen==null)
			L_cen=new CVec3();
		L_cen.mF32A[0]=(this.mMax.mF32A[0] + this.mMin.mF32A[0])*0.5;
		L_cen.mF32A[1]=(this.mMax.mF32A[1] + this.mMin.mF32A[1])*0.5;
		L_cen.mF32A[2]=(this.mMax.mF32A[2] + this.mMin.mF32A[2])*0.5;

		return L_cen;
	}
	// CubeVec3InLen(_posVec3:CVec3) : number //벡터, 직육면체 크기
	// {
	// 	//let radV3 = new CVec3();
	// 	let radV3=CMMgr.CVec3();
	// 	let cuberad = CMath.V3MulFloat(this.GetSize(),0.5);
	// 	radV3.dt.x = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.x),CMath.V3Len(new CVec3(0,CMath.Abs(_posVec3.y),CMath.Abs(_posVec3.z)))));
	// 	radV3.dt.y = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.y),CMath.V3Len(new CVec3(CMath.Abs(_posVec3.x),0,CMath.Abs(_posVec3.z)))));
	// 	radV3.dt.z = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.z),CMath.V3Len(new CVec3(CMath.Abs(_posVec3.x),CMath.Abs(_posVec3.y),0))));
	// 	let len=CMath.V3Len(new CVec3(Math.sin(CMath.DegreeToRadian(radV3.dt.x))*cuberad.x,Math.sin(CMath.DegreeToRadian(radV3.dt.y))*cuberad.y,Math.sin(CMath.DegreeToRadian(radV3.dt.z))*cuberad.z));
	// 	radV3.UnLock();
	// 	return len;
	// }
	GetSize(_copy : CVec3=null)
	{
		if(_copy==null)
			_copy=new CVec3(this.mMax.mF32A[0]-this.mMin.mF32A[0],this.mMax.mF32A[1]-this.mMin.mF32A[1],this.mMax.mF32A[2]-this.mMin.mF32A[2]);
		else
		{
			_copy.mF32A[0]=this.mMax.mF32A[0]-this.mMin.mF32A[0];
			_copy.mF32A[1]=this.mMax.mF32A[1]-this.mMin.mF32A[1];
			_copy.mF32A[2]=this.mMax.mF32A[2]-this.mMin.mF32A[2];
		}
		return _copy;
	}
	GetRandom(_x=true,_y=true,_z=true)
	{
		let pos=new CVec3();
		let size=this.GetSize();
		if(_x)	pos.x=size.x*Math.random()+this.mMin.x;
		if(_y)	pos.y=size.y*Math.random()+this.mMin.y;
		if(_z)	pos.z=size.z*Math.random()+this.mMin.z;

		return pos;
	}
	MatCoordi(_mat :CMat)
	{

		this.mMin=CMath.V3MulMatCoordi(this.mMin,_mat);
		this.mMax=CMath.V3MulMatCoordi(this.mMax,_mat);
		
		let dummy=new CVec3();
		for(let i=0;i<this.mPos.Size();++i)
		{
			let v=this.mPos.Find(i);
			dummy.Import(v);
			CMath.V3MulMatCoordi(dummy,_mat,v);
			
		}

		
	}
	AddPos(_pos : CVec3)
	{
		this.mMin.x+=_pos.x;
		this.mMin.y+=_pos.y;
		this.mMin.z+=_pos.z;

		this.mMax.x+=_pos.x;
		this.mMax.y+=_pos.y;
		this.mMax.z+=_pos.z;
	}
	// GetRadiusLen()
	// {
	// 	var L_cen = new CVec3();
		
	// 	if (this.max.x < 0)
	// 		L_cen.x = (CMath.Abs(this.min.x) - CMath.Abs(this.max.x)) / 2;
	// 	else
	// 		L_cen.x = (this.max.x - this.min.x) / 2;

	// 	if (this.max.z < 0)
	// 		L_cen.z = (CMath.Abs(this.min.z) - CMath.Abs(this.max.z)) / 2;
	// 	else
	// 		L_cen.z = (this.max.z - this.min.z) / 2;

	// 	if (this.max.y < 0)
	// 		L_cen.y = (CMath.Abs(this.min.y) - CMath.Abs(this.max.y)) / 2;
	// 	else
	// 		L_cen.y = (this.max.y - this.min.y) / 2;

	// 	return L_cen;
	// }
	WTBubbling(){	return false;}
	override Export(_copy?: boolean, _resetKey?: boolean): this 
	{
		var dummy=new CBound();
		dummy.mMin = this.mMin.Export();
		dummy.mMax = this.mMax.Export();
		dummy.mType=this.mType;
		//mArray를 그대로 돌면 안 된다. Clear()는 mLength만 0으로 되돌리고 배열은 남기므로,
		//한 번 줄어든 뒤에는 mArray에 예전 잔여 항목이 그대로 붙어 있다. Size()까지만 돈다.
		for(let i=0;i<this.mPos.Size();++i)
		{
			dummy.mPos.Push(this.mPos.Find(i));
		}

		return dummy as any;
	}
	override Import(_tar : CBound)
	{
		//자기 자신을 넣는 호출이 있다(CCollider.SetOwner). 아래에서 mPos를 비우고 다시 채우므로
		//그대로 두면 원본을 비운 뒤 빈 걸 읽어 결과가 사라진다. 자기 복사는 할 일이 없다.
		if(_tar==this)	return;
		this.mMin.Import(_tar.mMin);
		this.mMax.Import(_tar.mMax);
		this.mType=_tar.mType;
		this.mPos.Clear();
		//Export와 같은 이유로 mArray가 아니라 Size()까지만 돈다
		for(let i=0;i<_tar.mPos.Size();++i)
		{
			this.mPos.Push(_tar.mPos.Find(i));
		}

	}
	

	
}
export namespace CBound
{
	export enum eType{
		Box=0,
		Sphere=1,
		//mPos를 "하나의 볼록(convex) 형체"로 보고 GJK/EPA로 처리한다.
		//오목한 형체에 쓰면 파인 부분이 볼록껍질로 메워져 실제와 다르게 충돌한다.
		GJK=2,
		Voxel=3,
		Null=4,
		//mPos를 3개씩 끊어 실제 삼각형 리스트로 보고 삼각형 단위로 정밀 충돌한다.
		//오목해도 정확하지만 삼각형 수만큼 검사하므로 정적 메시용이다.
		Triangle=5,
	};
}