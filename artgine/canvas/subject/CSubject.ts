import { CUpdate } from "../../basic/Basic.js"
import { CArray } from "../../basic/CArray.js"
import { CClass } from "../../basic/CClass.js"
import { CJSON } from "../../basic/CJSON.js"
import { CConfirm } from "../../basic/CModal.js"
import { CObject, CPointer } from "../../basic/CObject.js"
import { CStream } from "../../basic/CStream.js"
import { CUniqueID } from "../../basic/CUniqueID.js"
import { CUtilObj } from "../../basic/CUtilObj.js"
import CSubject_imple from "../../canvas_imple/subject/CSubject.js"
import { CBound } from "../../geometry/CBound.js"
import { CMat } from "../../geometry/CMat.js"
import { CMath } from "../../geometry/CMath.js"
import { CVec3 } from "../../geometry/CVec3.js"
import { CVec4 } from "../../geometry/CVec4.js"
import { CFile } from "../../system/CFile.js"
import { IFile } from "../../system/System.js"
import { CFrame } from "../../util/CFrame.js"
import { CComponent } from "../component/CComponent.js"
import { CGlobalGeometryInfo } from "../component/CGlobalGeometryInfo.js"
import { CNavigation } from "../component/CNavigation.js"
import { CRouteMsg } from "../CRouteMsg.js"
import { CPaint } from "../component/paint/CPaint.js"
import { CCollider } from "../component/CCollider.js"
var g_offCObjHD = 0;


//3번에 sysn가 돌고, 
//1.updateMsg(인아웃 메세지 or 업데이트할 컴포넌트 정리)
//2.sysn처리(함수 호출)
export class CSubject extends CObject implements IFile
{
	public mComArr : Array<CComponent>;
	public mPTArr : Array<CComponent>=null;
	public mCLArr : CArray<CComponent>=null;
	public mPushArr : Array<CComponent>=new Array<CComponent>();
	public mPushLock=false;
	
	
	public mChilde : Array<CSubject>;
	public mPMat : CMat;
	public mPos : CVec3;
	public mRot : CVec3;
	public mSca : CVec3;
	public mWMat : CMat;
	public mPMatMul=true;
	//public m_addPos : CVec3;
	//public m_refresh : boolean;
	
	public mKey : string;
	public mKeyChange : string;
	public mDestroy : boolean;
	public mEnable : boolean;
	public mPEnable : boolean;
	
	public mSpeed : number;
	//public m_power : number;
	protected mFrame : CFrame=null;
	
	public mBroMsg = new CArray<CRouteMsg>();
	public mInMsg = new CArray<CRouteMsg>();
	public mOutMsg = new CArray<CRouteMsg>();

	public mUpdateMat : number = CUpdate.eType.Updated;
	mSave=true;
	//public m_updateRS : boolean=true;

	SetSave(_enable : boolean)
	{
		this.mSave=_enable;
	}
	constructor(_comArr =new Array<CComponent>())
	{
		super();
		this.mComArr=_comArr;
		this.mCLArr=new CArray<CComponent>();
		this.mChilde=new Array();
		this.mPMat=null;
		this.mPos = new CVec3();
		this.mRot = new CVec3();
		this.mSca = new CVec3(1, 1, 1);
		//this.m_addPos = new CVec3();
		
		this.mWMat = new CMat(null);
		this.mWMat.NewWASM();
		//this.m_refresh = true;
	
		this.mKey=CUniqueID.GetHash();
		//this.Key();
		this.mKeyChange="";
		this.mDestroy = false;
		this.mEnable = true;
		this.mPEnable = true;

		this.mSpeed = 1.0;

		this.mInMsg.Push(new CRouteMsg("dummy"));
		this.mInMsg.Clear();
	
		
	}
	IsDestroy()	
	{	
		if(this.IsRecycle())	return true;

		return this.mDestroy;	
	}
	Reset()
	{
		for(let each0 of this.mChilde)
		{
			each0.Reset();
		}
		for(let each0 of this.mComArr)
		{
			each0.Reset();
		}
		if(this.mPTArr)
		{
			for(let pt of this.mPTArr as Array<CPaint>)
			{
				pt.ClearCRPAuto();
			}
			this.mPTArr.length=0;
			this.mPTArr = null;
		}
		else
		{
			let pVec=this.FindComps(CPaint,true);
			for(let pt of pVec as Array<CPaint>)
			{
				pt.ClearCRPAuto();
			}
		}
		
		this.mFrame=null;
		this.mDestroy=false;
		this.mInMsg.Clear();
		this.mOutMsg.Clear();
		this.mCLArr.Clear();
		this.mUpdateMat = CUpdate.eType.Updated;
	}
	
	Icon(){	
		if(this.IsProxy())
			return "bi bi-crosshair";
		return "bi bi-box";	
	}
	
	RegistHeap(_F32A: Float32Array) {
		//this.m_heap.Push(_F32A);
	}
	
	
	override ImportCJSON(_json: CJSON) 
	{

		var key=this.mKey;
		var fw=this.mFrame;
		//var subc=this.m_subscribe;
		this.Reset();
		
		super.ImportCJSON(_json);
		if(this.mKey!=key)
			this.mKeyChange="keySwap";
	
		
		
		
		this.mFrame=null;
		this.SetFrame(fw);

		

		
		return this;
		//this.PRSReset();
	}
	Call(_function: string, _para: Array<any>): void {
		//super.Call(_function,_para);
		//this.Message(_function,_para);
		var cm=new CRouteMsg(_function);
	 	cm.mMsgData=_para;
		this.mInMsg.Push(cm);
	}
	// Message(_function : string,_para : Array<any>)
	// {
	// 	var cm=new CRouteMsg(_function);
	// 	cm.mMsgData=_para;
	// 	//cm.mInter="@";
		
	// 	if(this.mFrame==null)
	// 		cm.Call(this);
	// 	else
	// 		this.mInMsg.Push(cm);
		
	// }
	override IsShould(_member: string, _type: CObject.eShould) 
	{

		if(_type==CObject.eShould.Editer)
		{
			

			if(_member=="mPEnable" || _member=="mPMat")
				return false;
			if(_member=="mDestroy")
				return true;
			
		}
		
		if(_member=="mFrame" || _member=="mKeyChange" || _member=="mInMsg" || _member=="mOutMsg" || _member=="mBroMsg" || 
			_member=="mPushArr" || _member=="mPushLock" ||
			_member=="mDestroy" || _member=="mPTArr" || 
			_member=="mCLArr" || _member=="mUpdateMat")
			return false;
		if(_type==CObject.eShould.Proxy)
		{
			if(_member=="mPos" || _member=="mRot" || _member=="mSca" || _member=="mWMat" || _member=="mPMat" ||
				_member=="mKey" || _member=="mEnable" || _member=="mPEnable")//_member=="mChilde" || _member=="mComArr"
				return false;
		}
		
		
		return super.IsShould(_member,_type);
	}

	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		if(_pointer.member=="mComArr")
			CUtilObj.ArrayAddDataList(_pointer,_body,_input,CClass.ExtendsList(CComponent,true),false,true);
		if(_pointer.member=="mChilde")
			CUtilObj.ArrayAddDataList(_pointer,_body,_input,CClass.ExtendsList(CSubject,true),false,true);

	}

	override EditChange(_pointer : CPointer,_childe : boolean)
	{
		super.EditChange(_pointer,_childe);
		if(_pointer.member=="mKey")
		{
			this.mKeyChange="keySwap";
		}
		else if(_pointer.member=="mDestroy")
		{
			this.mDestroy=false;
			this.Destroy();
		}
		else if(_pointer.member=="mComArr")
		{
			if(_pointer.state==1)
			{
				let com=this.mComArr[_pointer.key];
				com.SetOwner(this);
				if(com.constructor.name=="CCollider" && this.mPTArr.length>0)
				{
					com["InitBound"](this.mPTArr[0]);
				}
				this.SortComponent();
			}
			if(_pointer.state==-1)
			{
				let com=this.mComArr[_pointer.key];
				com.Destroy();
			}

			if(this.mPTArr)	this.mPTArr.length=0;
			this.mPTArr=null;
			//if(this.mCLArr)	this.mCLArr.Clear();
			
	
		}
		else if(_pointer.member=="mChilde")
		{
			if(_pointer.state==1)
			{
				let ch=this.mChilde[_pointer.key];
				this.mChilde.splice(_pointer.key,1);
				this.PushChilde(ch);
			}
		}
		else if(_childe)
		{
			if(_pointer.IsRef(this.mPos) || _pointer.IsRef(this.mRot) || _pointer.IsRef(this.mSca))
			{
				this.PRSReset();	
			}
			else if(_pointer.member=="mEnable")
			{
				this.SetEnable(this.mEnable);
			}
		}
		
	}
	GetFrame()	{	return this.mFrame;	}
	Start(){}
	SetFrame(_frame : CFrame)	
	{
		if(this.mFrame!=null && _frame!=null)
			return;
		if(this.mFrame!=null)
			this.Reset();
		this.mFrame=_frame;
		
		//this.mCLArr.Clear();
		for(let each0 of this.mComArr)
		{
			each0.SetOwner(this);
			// if(each0 instanceof CCollider || each0 instanceof CNavigation)
			// {
			// 	this.mCLArr.Push(each0);
			// }
		}

		
		for(let each0 of this.mChilde)
		{
			each0.SetFrame(_frame);
		}
		// if(this.mFrame!=null)
		// 	this.Start();
	}
	GetRemove() { return this.mDestroy || this.IsRecycle(); }
	KeyChange() { return this.mKeyChange; }
	ClearKeyChange() { this.mKeyChange = "";	 }
	SetEnable(_enable : boolean) 
	{
		this.mEnable = _enable;
		this.mUpdateMat=CUpdate.eType.Updated;
		this.SetChildeShow(_enable);
	}
	protected SetChildeShow(_enable : boolean)
	{
		for(let each0 of this.mChilde)
		{
			each0.mPEnable=_enable;
			each0.SetChildeShow(_enable && this.mEnable);
		}
	}
	
	IsEnable() 
	{
		return this.mEnable && this.mPEnable;	 
	}
	
	SetKey(_key) 
	{
		if(this.mKey==_key)
			return;
		// if(this.m_key.length!=0)
		// 	this.m_keyChange = this.m_key;
		this.mKeyChange="keySwap";
		this.mKey = _key+""; 	
	}
	GetSpeed() {return this.mSpeed;	};
	SetSpeed(_speed) {	this.mSpeed = _speed;	}
	//GetPower()	{	return this.m_power;	}
	//SetPower(_power) {	this.m_power = _power;	}
	GetBound()
	 { 
		var dummy=new CBound();
		dummy.mMin.x=0;dummy.mMin.y=0;dummy.mMin.z=0;
		dummy.mMax.x=0;dummy.mMax.y=0;dummy.mMax.z=0;
		return dummy;	
	}
	SubjectUpdate(_delay : number) : void
	{
		
		for (var i = 0; i < this.mChilde.length; ++i)
		{
			if(this.mChilde[i].GetRemove())
			{
				this.mChilde.splice(i,1);
				if(this.mPTArr)
					this.mPTArr.length=0;
				i--;
				continue;
			}
			

			
		}
		//if(this.m_init==false)
		// 	this.m_init=true;
	}
	Update(_delay : number){};
	NewInMsg(_name : string) : CRouteMsg
	{
		let msg=new CRouteMsg(_name);
		this.mInMsg.Push(msg);
		return msg;
	}
	NewOutMsg(_name : string) : CRouteMsg
	{
		let msg=new CRouteMsg(_name);
		this.mOutMsg.Push(msg);
		return msg;
	}
	PushPac(_stream : CStream)
	{
		var msg=this.NewOutMsg("PushPac");
		msg.mMsgData[0]=_stream;
		msg.mInter="canvas";
	}
	

	RouteMsg(_msg : CRouteMsg)
	{
		
		
	}
	RootMsgUpdate(_delay : number,_ggi : CGlobalGeometryInfo)
	{
		
	}
	

	RouteMsgUpdate(_delay : number,_ggi : CGlobalGeometryInfo)
	{

		
	}
	
	GetCPaintVec(_vec=new Array<CComponent>)
	{
		
		if(this.mPTArr==null || this.mPTArr.length == 0)
		{
			if(_vec!=null)
				this.mPTArr=_vec;
			if(this.mPTArr==null)	this.mPTArr=new Array();

			for (let each0 of this.mComArr)
			{
				if(each0.IsDestroy())
					continue;
				
				if (each0.GetSysc() == CComponent.eSysn.Paint)//&&  (each0 as CPaint).GetCamera()!=null)
					this.mPTArr.push(each0);
			}
			for (let each0 of this.mChilde)
			{
				each0.GetCPaintVec(this.mPTArr);
			}
		}
		
		return this.mPTArr;
	}
	SortComponent()
	{
		this.mComArr.sort((a, b) => {
            return a.mSysc-b.mSysc;
        });
	}
	Destroy()
	{

		if(this.GetRecycleType()!=null)
		{
			this.Recycle();
			this.Reset();
			return;
		}


		if(this.mDestroy)
			return;
			
		this.mDestroy = true;
		//this.m_show = false;
		for (var i = 0; i < this.mComArr.length; ++i)
		{
			this.mComArr[i].Destroy();
		}
	
		for (var i = 0; i < this.mChilde.length; ++i)
		{
			
			this.mChilde[i].Destroy();
		}
		this.mWMat.ReleaseWASM();
	}
	//virtual void CanvasDelete() {};
	//GetOffset() { return this.m_offset; }
	
	//==================================================================
	SetPMat(_mat : CMat) { this.mPMat = _mat;	 }//toCopy해야 안전한데 성능상...
	
	PushChilde<T extends  CSubject>(_obj : T)
	{ 
		
		this.mChilde.push(_obj);
		if(this.mPMatMul)	_obj.SetPMat(this.mWMat);
		_obj.mPEnable=this.IsEnable();
		_obj.PRSReset();
		
		if(this.mFrame!=null)
			_obj.SetFrame(this.mFrame);

		if(this.mPTArr)
			this.mPTArr.length=0;
		this.mPTArr=null;
		
		return _obj;
	}
	DetachChild(_key : string)
	{
		let child : CSubject = null;
		for (var i = 0; i < this.mChilde.length; ++i)
		{
			if (this.mChilde[i].Key() == _key)
			{
				child = this.mChilde[i];
				this.mChilde.splice(i,1);
				break;
			}
		}
		if(child == null)
			return null;

		if(this.mPTArr) {
			for(let pt of this.mPTArr as Array<CPaint>)
			{
				pt.BatchClear();
			}

			this.mPTArr.length = 0;
			this.mPTArr = null;
			
			//const cPtVec = child.GetCPaintVec() as CPaint[];
			//cPtVec.forEach(pt => pt.m_renPt.forEach(cc => cc.m_show = null));
		}

		// if(this.m_clVec) {
		// 	this.m_clVec.length = 0;
		// 	this.m_clVec = null;
		// }
		child.mPMat=null;
		return child;
	}
	DetachComp<T = CComponent>(_type : string) : CComponent;
	DetachComp<T>(_type : (new (...args:any[]) => T)) : T;
	DetachComp<T>(_type : (new (...args:any[]) => T)|string) : T|CComponent;
	DetachComp<T>(_type : (new (...args:any[]) => T)|string) : T|CComponent
	//DetachComp(_key : any)
	{
		let com : CComponent = null;
		for (var i = 0; i < this.mComArr.length; ++i)
		{
			if (typeof _type =="string")
			{
				if(this.mComArr[i].Key() == _type)
				{
					com = this.mComArr[i];
					this.mComArr.splice(i,1);
					break;
				}
			}
			else if(this.mComArr[i] instanceof _type)
			{
				com = this.mComArr[i];
				this.mComArr.splice(i,1);
				break;
			}
		}

		if(com == null)
			return null;

		if(this.mPTArr) {
			for(let pt of this.mPTArr as Array<CPaint>)
			{
				pt.BatchClear();
			}

			this.mPTArr.length = 0;
			this.mPTArr = null;
			
			//const cPtVec = this.GetCPaintVec() as CPaint[];
			//cPtVec.forEach(pt => pt.m_camCull.forEach(cc => cc.m_show = -1));
		}

		// if(this.m_clVec) {
		// 	this.m_clVec.length = 0;
		// 	this.m_clVec = null;
		// }
		return com;
	}
	FindComp<T = CComponent>(_type : string|number,_childe?,vec?) : CComponent;
	FindComp<T>(_type : (new (...args:any[]) => T),_childe?,vec?) : T;
	FindComp<T>(_type : (new (...args:any[]) => T)|string|number,_childe?,vec?) : T|CComponent;
	FindComp<T>(_type : (new (...args:any[]) => T)|string|number,_childe=false,vec = new Array()) : T|CComponent
	{
		let cList=this.FindComps(_type,_childe,vec);
		if(cList.length==0)
			return null;
		return cList[0];
	}
	FindComps<T = CComponent>(_type : string|number,_childe?:boolean,vec?:CComponent[]) : CComponent[];
	FindComps<T>(_type : (new (...args:any[]) => T),_childe?:boolean,vec?:T[]) : T[];
	FindComps<T>(_type : (new (...args:any[]) => T)|string|number,_childe?,vec?) : T[]|CComponent[];
	FindComps<T>(_type : (new (...args:any[]) => T)|string|number,_childe=false,vec=new Array()) : T[]|CComponent[]
	{	
		for (let each0 of this.mComArr)
		{
			if(each0.IsDestroy())
				continue;
			if(typeof _type =="string")
			{
				if(each0.Key()== _type)
					vec.push(each0); 
			}
			else if(typeof _type =="number")
			{
				if(each0.GetSysc()== _type)
					vec.push(each0); 
			}
			else if(each0 instanceof _type)
				vec.push(each0);
		}
		if(_childe)
		{
			for(let each0 of this.mChilde)
			{
				each0.FindComps(_type,_childe,vec);
			}
		}
		if(this.mPushLock)
		{
			for (let each0 of this.mPushArr)
			{
				if(each0.IsDestroy())
					continue;
				if(typeof _type =="string")
				{
					if(each0.Key()== _type)
						vec.push(each0); 
				}
				else if(typeof _type =="number")
				{
					if(each0.GetSysc()== _type)
						vec.push(each0); 
				}
				else if(each0 instanceof _type)
					vec.push(each0);
			}
		}
		
		
		
		
		return vec;
	}
	FindChild<T extends CSubject>(_key: new (...args: any[]) => T, _childe?: boolean): T | null;
	FindChild<T extends CSubject>(_key: string, _childe?: boolean): T | null;
	FindChild<T extends CSubject>(_key: any, _childe = false): T | null {
		const cList = this.FindChilds(_key, _childe);
		if (cList.length === 0)
			return null;
		return cList[0] as T;
	}
	FindChilds(_key : any,_childe=false)
	{
		var vec=new Array<CSubject>();
		
		
		for(let each0 of this.mChilde)
		{
			if(each0.GetRemove())	continue;
			
			if(typeof _key =="string")
			{
				if(each0.Key()==_key)
					vec.push(each0);
			}
				
			else if(each0 instanceof _key)
				vec.push(each0);

			if(_childe)
			{
				let chvec=each0.FindChilds(_key,true);
				if(chvec.length>0)
					vec=vec.concat(chvec);
			}
			
		}
		
		
		
		return vec;
	}
	PushComp<T extends CComponent>(_com : T) : T
	{
		if(this.mFrame!=null && _com.GetOwner()==null)
		{
			_com.SetOwner(this);

			var cm=new CRouteMsg("PushComp");
			cm.mInter="canvas";
			cm.mMsgData.push(this);
			cm.mMsgData.push(_com);
			this.mOutMsg.Push(cm);
		}

		if(this.mPushLock)
		{
			this.mPushArr.push(_com);
			return _com;
		}

		
			

		if(this.mPTArr)
			this.mPTArr.length=0;
		this.mPTArr = null;
		// if(this.m_clVec)
		// 	this.m_clVec.length=0;
		// this.m_clVec=null;
		// if(_com instanceof CCollider || _com instanceof CNavigation)
		// {
		// 	this.mCLArr.Push(_com);
		// }

		//중간 삽입을 제외하면 뒤로 넣는게 복사가 덜하다
		for(var i=0;i<this.mComArr.length;++i)
		{
			if(this.mComArr[i].mSysc>_com.mSysc)
			{
				this.mComArr.splice(i,0,_com);
				return _com;
			}
				
		}
		this.mComArr.push(_com);

		return _com;
	}



	GetWMat()	{	return this.mWMat;	}
	GetPos() { return this.mPos; }
	GetRot() { return this.mRot; };
	GetSca() { return this.mSca; };

	//리지드 바디가 있어서. 무한정 호출해는 문제가 있어서 추가함
	SetPos(_pos : CVec3,_reset=true,_patch=true)
	{
		if(_pos.Equals(this.mPos))	return;
		this.mPos.Import(_pos);
		
			
		
		
		if(_reset)
			this.PRSReset(false);
		if(_patch)
			this.PatchExe("mPos");
	}
	SetRot(_rot : any,_reset=true)
	{
		if(_rot.Equals(this.mRot))	return;
		//this.m_updateRS=true;
		if(_rot instanceof CVec4)
			this.mRot.Import(CMath.QutToEuler(_rot));
		else
			this.mRot.Import(_rot);
		if(_reset)
			this.PRSReset(true);
	}
	SetSca(_sca : CVec3|number,_reset=true)
	{
		if(typeof _sca == "number")
		{
			this.mSca.mF32A[0]=_sca;
			this.mSca.mF32A[1]=_sca;
			this.mSca.mF32A[2]=_sca;
		}
		else
		{
			if(_sca.Equals(this.mSca))	return;
		
			this.mSca.Import(_sca);
		}
		
		if(_reset)
			this.PRSReset(true);
	}
	PRSReset(_rsUpdate=true)
	{
		
	}
	
	//CallRemoveCComponent(_com) {}
	RemoveComps(_type)
	{
		var vec = this.FindComps(_type);
		for (var each0 of vec)
		{
			each0.Destroy();
		}
		// if(this.m_clVec)
		// 	this.m_clVec.length=0;
		// this.m_clVec=null;
		if(this.mPTArr)
			this.mPTArr.length=0;
		this.mPTArr = null;
	}
	
	
	async LoadJSON(_file=null)
	{
		let buf=await CFile.Load(_file);
		if(buf==null)	return true;
		this.ImportCJSON(new CJSON(buf));
		return false;
	}
	async SaveJSON(_file=null)
	{
		

		let confirm=new CConfirm();
		confirm.SetBody("Save Type Click");
		confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
		()=> {
			CFile.Save(this.ToStr(),_file);
		},
		async ()=> {
			var sub=new CSubject();
			sub.Import(this);
			CFile.Save(sub.ToStr(),_file);
			
		},
		],["this","CSubject"])
		confirm.Open();

	}
	public Export(_copy=true,_resetKey=true): this 
	{
		
		let target=super.Export(_copy,_resetKey);
		target.SetFrame(null);
		if(_resetKey && this.mPMat==null)
			target.SetKey(CUniqueID.GetHash());
		else
			target.SetKey(this.Key());

		
		return target;
	}
	Prefab(_fw : CFrame)
	{
		this.mFrame=_fw;
		for (var each0 of this.mComArr)
		{
			each0.Prefab(this);
		}
		this.mFrame=null;
		

	}
	
	public PatchStreamUpdate(_stream: CStream,_path : Array<string>) 
	{
		super.PatchStreamUpdate(_stream,_path)

		for(let i=0;i<this.mComArr.length;++i)
		{
			_path.push("mComArr["+i+"]");
			this.mComArr[i].PatchStreamUpdate(_stream,_path);
			_path.pop();
			
		}
		for(let i=0;i<this.mChilde.length;++i)
		{
			_path.push("mChilde["+i+"]");
			this.mChilde[i].PatchStreamUpdate(_stream,_path);
			_path.pop();
		}
	}
	public PatchStreamRead(_stream: CStream, _key: string): void {
		super.PatchStreamRead(_stream,_key);
		if(_key=="mPos")	this.PRSReset();

	}
	//전체 트레킹 된다. 이러면 느려짐
	public PatchTrackDefault()
	{
		for(let i=0;i<this.mComArr.length;++i)
		{
			
			this.mComArr[i].PatchTrackDefault();
			
			
		}
		for(let i=0;i<this.mChilde.length;++i)
		{
			this.mChilde[i].PatchTrackDefault();	
		}
	}
	
	
};
CSubject_imple();