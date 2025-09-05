


import {CVec3} from "../geometry/CVec3.js"
import {CMath} from "../geometry/CMath.js"
import {CArray} from "../basic/CArray.js";
import {CObject,CPointer } from "../basic/CObject.js";
import { CJSON } from "../basic/CJSON.js";



export class CBound extends CObject
{
	public mMin : CVec3;
	public mMax : CVec3;
	public mType : number;
	public mPos : CArray<CVec3>;
	
	constructor()
	{
		super();
		this.mMin=new CVec3(100000,100000,100000);
		this.mMax=new CVec3(-100000,-100000,-100000);
		this.mType=CBound.eType.Null;
		this.mPos = new CArray<CVec3>();
	}
	NewWASM()
	{
		this.mMin.NewWASM();
		this.mMax.NewWASM();
	}
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
		// if (_type == CBound.eType.Polytope && this.vInfo.len==0)
		// {
		// 	this.boundType = CBound.eType.Box;
		// }
	}
	WTForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {
		if(_pointer.member == "boundType")
		{
		
			let textArr = ["Box","Sphere","Polytope","Null"], valArr = [0,1,2,4];
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
				_input.value=valArr[ct.selectedIndex]+"";
				if (_pointer.target instanceof CObject)
					_pointer.target.EditChange(_pointer,false);
			};

			//let select = CWatchUtil.Select(_pointer, _input, textArr, valArr);
			_div.append(select);




			select.addEventListener("change", () => {
				this.EditRefresh();
			});
		}
		
	}

	Reset()
	{
		this.mMin.mF32A[0]=100000;this.mMin.mF32A[1]=100000;this.mMin.mF32A[2]=100000;
		this.mMax.mF32A[0]=-100000;this.mMax.mF32A[1]=-100000;this.mMax.mF32A[2]=-100000;

		this.mType=CBound.eType.Null;
		if(this.GetType()==CBound.eType.Polytope)
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
	InitBound(_vInfo : any) : void
	{
		if(typeof _vInfo == "number" )
		{
			this.mMin.x=-_vInfo;
			this.mMin.y=-_vInfo;
			this.mMin.z=-_vInfo;
			
			this.mMax.x=_vInfo;
			this.mMax.y=_vInfo;
			this.mMax.z=_vInfo;
		}
		else if(_vInfo instanceof Array )
		{
			for (var each0 of _vInfo)
			{
				if(this.GetType()==CBound.eType.Polytope)
					this.mPos.Push(each0);
				this.ResetBoxMinMax(each0);
			}
		}
		else
		{
			if(this.GetType()==CBound.eType.Polytope)
				this.mPos.Push(_vInfo);
			this.ResetBoxMinMax(_vInfo);
		}	
	}
	GetInRadius()
	{
		var cen = this.GetCenter();
		var maxX = CMath.Max(this.mMax.mF32A[0] - cen.mF32A[0], this.mMin.mF32A[0] - cen.mF32A[0]);
		var maxY = CMath.Max(this.mMax.mF32A[1] - cen.mF32A[1], this.mMin.mF32A[1] - cen.mF32A[1]);
		var maxZ = CMath.Max(this.mMax.mF32A[2] - cen.mF32A[2], this.mMin.mF32A[2] - cen.mF32A[2]);

		return CMath.Max(CMath.Max(maxX, maxY), maxZ);
	}
	GetOutRadius()
	{
		var ra=this.GetInRadius();
		if (this.mType == CBound.eType.Sphere)
			return ra;
		return CMath.V3Len(new CVec3(ra, ra, ra));
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
	GetRandom(_x,_y,_z)
	{
		let pos=new CVec3();
		let size=this.GetSize();
		if(_x)	pos.x=size.x*Math.random()+this.mMin.x;
		if(_y)	pos.y=size.y*Math.random()+this.mMin.y;
		if(_z)	pos.z=size.z*Math.random()+this.mMin.z;

		return pos;
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
		for(var each0 of this.mPos.mArray)
		{
			dummy.mPos.Push(each0);
		}
		
		return dummy as any;
	}
	override Import(_tar : CBound)
	{
		this.mMin.Import(_tar.mMin);
		this.mMax.Import(_tar.mMax);
		this.mType=_tar.mType;
		this.mPos.Clear();
		for(var each0 of _tar.mPos.mArray)
		{
			this.mPos.Push(each0);
		}
		
	}
	

	
}
export namespace CBound
{
	export enum eType{
		Box=0,
		Sphere=1,
		Polytope=2,
		Voxel=3,
		Null=4,
	};
}