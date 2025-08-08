import {  ICJSON,  IMember, IRecycle, IStream } from "./Basic.js";
import { CBlackBoard } from "./CBlackBoard.js";
import { CClass } from "./CClass.js";
import { CDomFactory } from "./CDOMFactory.js";
import { CJSON } from "./CJSON.js";
import { CPool } from "./CPool.js";
import { CStream } from "./CStream.js";
import { CString } from "./CString.js";
import { CUniqueID } from "./CUniqueID.js";




/*
Proxy 시스템 
블랙보드에 등록하고 그다음 등록하는 복사 오브젝트는 프록시로 생성된다.
복사 오브젝트 더미를 만들고 mProxy에 원본을 넣어놓는다.
프록시 오브젝트가 데이터를 가져올때는 원본을 확인하고 가져오는데,
ProxyData함수가 지정되어 있으면 거기에 맞게 원본이나 복사본을 가져온다.
*/
export var ProxyHandle = {
	get: (obj, name) => 
	{
		//let t=obj.Get();
		if(typeof obj[name] =="function" || name=="mProxy"){}
			
		else if(obj.IsShould(name,CObject.eShould.Proxy))
		{
			let bb=CBlackBoard.Find(obj.Key());
			if(bb!=null)	return bb[name];
		}
			

		return obj[name];
	},
	set: (obj, name, value) => 
	{
		if(typeof obj[name] =="function"){}

		else if(obj.IsShould(name,CObject.eShould.Proxy))
		{
			let bb=CBlackBoard.Find(obj.Key());
			if(bb!=null)
				bb[name]=value;
			return true;
		}
			
		obj[name]=value;

		return true;
	},
};
export class CPointer
{
	//public refer : Array<any>=new Array<any>();
	public target : any;
	public member : string;
	public key : any=null;
	public refArr=[];
	public state=0;
	
	constructor(_target,_member,_array=null)
	{
		this.target=_target;
		this.member=_member;
		this.key=_array;
	}
	Get()
	{
		if(this.key==null)
			return this.target[this.member];
		if(this.target[this.member] instanceof Set)
			return this.key;
		else if(this.target[this.member] instanceof Map)
		{
			return this.target[this.member].get(this.key);
		}
			
		return this.target[this.member][this.key];
	}
	Set(_value)
	{
		if(this.key==null)
			this.target[this.member]=_value;
		else if(this.target[this.member] instanceof Set)
		{
			this.target[this.member].delete(this.key);
			this.target[this.member].add(_value);

		}
		else if(typeof this.key == "string")
			this.target[this.member].set(this.key,_value);
		else
			this.target[this.member][this.key]=_value;
	}
	Member()
	{
		if(this.key==null)
			return this.member;
		return this.member+"["+this.key+"]";
	}
	IsRef(_obj)
	{
		for(let ref of this.refArr)
		{
			if(ref==_obj)
				return true;
		}

		return false;
	}
}


export class CObject implements IMember,IRecycle,IStream,ICJSON
{


	Icon(){		return "";	}
	Key()	: string
	{
		if(this["mKey"]==null)
			this["mKey"]=CUniqueID.GetHash();
		return this["mKey"];
	}
	SetKey(_key)
	{
		if(_key=="")
			delete this["mKey"];
		else
			this["mKey"]=_key;
	}
	IsKey()
	{
		return this["mKey"]!=null;
	}
	SetBlackBoard(_write=true)
	{
		let target=this;
		if(this["mProxy"]!=null)
			target=this["mProxy"];
		
			
		if(_write==false)
			delete target["mBlackboard"];
		else
		{
			CBlackBoard.Push(this.Key(),target);
			target["mBlackboard"]=_write;
		}

		
		this.EditRefresh();
	}
	static Export(obj,_copy : boolean,_resetKey : boolean)
	{
		return null;
	}
	static Import(_tar,_org)
	{
		
	}
	
	//내꺼를 내보냄 export
	Export(_copy=true,_resetKey=true)	: this
	{	
		return CObject.Export(this,_copy,_resetKey);	
	}
	//target에 값을 복사함 import
	Import(_target : CObject)
	{
		CObject.Import(this,_target);
	}
	IsBlackBoard()
	{
		return this["mBlackboard"];
	}
	//true면 긍정(노출),false 부정(숨김)
    IsShould(_member: string, _type: CObject.eShould) 
    {
        if(_type==CObject.eShould.Patch)
        {
            if(this["mPatch"]!=null && this["mPatch"].has(_member))
                return true;
			else
				return false;
        }
        //이건 안보여준다
        else if(_member.indexOf('mObject')!=-1 || _member=='class' || _member=="mProxy" || _member=="mPatchUpdate" ||
			_member=="mRecycleType" || _member=="mRecycle" ||  _member=="mTemp"
		)
			return false;
		return true;
    }

	EditRefresh(_pt : CPointer=null)
	{
		if(this["mObjectDiv"]!=null)
		{
			var orgDiv=this["mObjectDiv"] as HTMLDivElement;
			var newDiv=this.EditInit(_pt);

			orgDiv.innerHTML = "";
			orgDiv.append(...newDiv.childNodes);
			this["mObjectDiv"]=orgDiv;
			
		}
		this.EditRefreshEx();	
	}
	EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		this.EditFormEx(_pointer,_body,_input);
	}
	EditFormEx(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{

	}
	EditInit(_pointer : CPointer=null) : HTMLElement
	{
		return null;
	}
	static EditInit=function (_target : CObject,_point : CPointer=null) : HTMLElement
    {
        return null;
    }
	static EditArrayInit(_arr : Array<CObject>|IterableIterator<CObject>,_open =false,_pointer : CPointer=null) : HTMLElement
	{
		var dir=document.createElement("div");
		var arrList=new Array<CObject>();
		for(var each0 of _arr)
		{
			arrList.push(each0);
			var span=document.createElement("div");
			span.className="border border-primary";
			//span.append(each0.WTInit());
			if(_open==false)
			{
				span.innerText=each0.Key();
				span.id=each0.Key();
				span.onclick=(e)=>{
					var obj=e.target as HTMLElement;
					for(var each0 of arrList)
					{
						if(each0.Key()==obj.id)
						{
							obj.innerHTML="";
							obj.append(each0.EditInit(_pointer));
						}
					}
				};
			}
			else
			{
				span.append(each0.EditInit(_pointer));
			}
			
			dir.append(span);
		}
		
		return dir;
	}
	static EditValue(_point : CPointer) : HTMLDivElement
	{
		return null;
	}
	static EditArrayItem(_parent : HTMLElement,_point : CPointer)
	{

	}
	//자신에 객체에 변화가 있을때
	EditChange(_pointer : CPointer,_childe : boolean)
	{
		
	}
	EditChangeEx(_pointer : CPointer,_childe : boolean)
	{

	}
	EditDrop(_object : CObject)
	{
		if(this.constructor.name==_object.constructor.name)
		{
			this.Import(_object);
		}
	}
	
	static GetDragObj()	{	return null;	}
	static SetDrag(_type,_obj : CObject)
	{

	}
	static FocusInputNumberChange(_input : HTMLInputElement,_function : Function)
	{

	}

	EditRefreshEx()
	{

	}
	EditHTMLInit(_div: HTMLDivElement, _pointer: CPointer = null)
	{
		
	}

	//================================================





	//재활용되기전 호출됌
    Recycle() 
	{
		if(this["mRecycleType"]!=null)
		{
			this["mRecycle"]=true;
			CPool.Recycle(this);
		}
	}
	GetRecycleType(): string {
		return this["mRecycleType"];
	}
	SetRecycleType(_type: string) 
	{
		if(_type!=this["mRecycleType"])
			this["mRecycleType"]=_type;
		this["mRecycle"]=false;
	}
	//리사이클 등록되어 있는지
	IsRecycle() 
	{
		if(this["mRecycleType"]==null)
			return false;
		return this["mRecycle"];
	}
	static NewImportCJSON(_obj : CJSON)
	{
		if(_obj.GetStr("class")!=null)
		{
			let obj=CClass.New(_obj.GetStr("class")) as CObject;
			if(obj==null)	return;
			if(_obj.GetBool("mBlackboard")==true)
			{
				obj.SetKey(_obj.GetStr("mKey"));
				if(CBlackBoard.Find(obj.Key())!=null)
				{
					let p=new Proxy(obj,ProxyHandle);
					obj["mProxy"]=CBlackBoard.Find(obj.Key());
					return p;
				}
					

			}
			if(obj!=null)
			{
				obj.ImportCJSON(_obj);
			}
			
			return obj;
		}
		
		
		return _obj.GetDocument();
	}
	


	//js전용
	ToLog()
	{
		return this.ToStr();
	}
    ToStr()
    {
        return this.ExportCJSON().ToStr();
    }
    ToJSON()
	{
		var jData={"class":this.constructor.name };
		return jData;
	}
    ExportCJSON() : CJSON
    {
        return new CJSON(this.ToJSON());
    }
	ImportJSON(_json: object) 
	{
		this.ImportCJSON(new CJSON(_json));
	}
    ImportCJSON(_json: CJSON) 
	{
        return this;
    }
    

    Serial(_stream: any=new CStream()) {
		_stream.PushName(this);
		_stream.PushMember(this);
		return _stream;
    }
    Deserial(_stream: any) {
        _stream.GetName();
		_stream.GetMember(this);
    }

    ObjHash(_seed=1)
    {
        if(this["mObjectKey"+_seed]==null)
			this["mObjectKey"+_seed]=CUniqueID.GetHash();
		return this["mObjectKey"+_seed];
    }
	

    
	
    Get<T>(_member: string | string[], _default?: T): T | undefined {
		let t: any = this;
		const path = Array.isArray(_member) ? _member : _member.split(".");

		for (let key of path) {
			if (key.includes("(")) {
				const fun = CString.FunctionAnalyze(key);
				if (t?.[fun.function] != null) {
					t = CClass.Call(t, fun.function, fun.parameter);
					if (Array.isArray(t) && t.length === 1) t = t[0];
				} else {
					t = null;
				}
			} else if (key.includes("[")) {
				const index = Number(key.substring(key.indexOf("[") + 1, key.length - 1));
				t = t?.[index];
			} else {
				t = t?.[key];
			}
			if (t == null) break;
		}

		return t == null ? _default : (t as T);
	}
    Set(_member: Array<string> | string, _value: any) 
	{
		var t=this;
		if(_member instanceof Array)
		{
			if(_member.length==0)	return this;
			
		}
		else
		{
			_member=_member.split(".");
		}

		for(var i=0;i<_member.length-1;++i)
		{
			if(_member[i].indexOf("(")!=-1)
			{
				var fun=CString.FunctionAnalyze(_member[i]);
				if(t[fun.function]!=null)
				{
					t=CClass.Call(t,fun.function,fun.parameter);
					if(t instanceof Array && t.length==1)	t=t[0];
				}
			}
			else if(_member[i].indexOf("[")!=-1)
			{
				let off=_member[i].indexOf("[");
				let index=Number(_member[i].substring(off+1,_member[i].length-1));
				
				t=t[index];
			}
			else
				t=t[_member[i]];
			if(t==null)	break;
		}
        if(_member[_member.length-1].indexOf("[")!=-1)
		{
			let off=_member[i].indexOf("[");
			let index=Number(_member[i].substring(off+1,_member[i].length-1));
			
			t[index]=_value;
		}
		else
		{
			t[_member[_member.length-1]]=_value;
		}
		
		return this;
    }
    Call(_function: string, _para: Array<any>) 
	{
		CClass.Call(this,_function,_para);
    }
	static Get<T>(_member: string | string[], _default?: T): T | undefined {
        let t: any = this;
        const path = Array.isArray(_member) ? _member : _member.split(".");

        for (let key of path) {
            if (key.includes("(")) {
                const fun = CString.FunctionAnalyze(key);
                if (t?.[fun.function] != null) {
                    t = CClass.Call(t, fun.function, fun.parameter);
                    if (Array.isArray(t) && t.length === 1) t = t[0];
                } else {
                    t = null;
                }
            } else if (key.includes("[")) {
                const index = Number(key.substring(key.indexOf("[") + 1, key.length - 1));
                t = t?.[index];
            } else {
                t = t?.[key];
            }
            if (t == null) break;
        }

        return t == null ? _default : (t as T);
    }


    //업데이트할 멤버를 쓴다
    public PatchStreamWrite(_stream: CStream,_fullPath :string,_member)
	{
		_stream.Push(_fullPath+"."+_member);
		_stream.Push(this[_member]);
	}
	public PatchStreamUpdate(_stream  : CStream,_path : Array<string>)
	{
		if(this["mPatchUpdate"]==null || this["mPatchUpdate"].size==0)	return;

		for(let key of this["mPatchUpdate"])
		{
			this.PatchStreamWrite(_stream,CString.PathArrToFullPath(_path),key);
		}

		this["mPatchUpdate"].clear();
		return;
	}
    //이건 내부용이다 호출 금지
	public PatchStreamRead(_stream  : CStream,_member : string)
	{
		//let data=null;
		if(typeof this[_member]=="number")
			this[_member]=_stream.GetFloat();
		else if(typeof this[_member]=="string")
			this[_member]=_stream.GetString();
		else if(typeof this[_member]=="boolean")
			this[_member]=_stream.GetBool();
		else if(this[_member] instanceof Array)
		{
			this[_member]=new Array<any>();
			_stream.GetArray(this[_member]);
		}
		else if(this[_member] instanceof Map)
		{
			this[_member]=new Map<any,any>();
			_stream.GetMap(this[_member]);
		}
		else if(this[_member] instanceof CObject)
		{
			this[_member]=CClass.New(this[_member]);
			_stream.GetIStream(this[_member]);
			
		}
	}
	
	protected IsPatchUpdate(_member)
	{
		if(this["mPatchUpdate"]==null)
			return false;

		return this["mPatchUpdate"].has(_member);
	}
    //지정되어 있는 클래스에 트레킹 목록에서 패치 등록한다
	public PatchTrackDefault()
	{

	}
    //이건 수동으로 활성화. 특정 멤버에 값변화를 감시한다
    //활성화 안되면 업데이트도 무시된다
    //멤버를 지정하면 된다.
	public PatchTrack(_fullPath : string)
	{
		let pathArr=_fullPath.split(".");
		let target=CString.FullPathArrToLastTarget(this,pathArr);
		if(target["mPatch"]==null)
		{
			target["mPatch"]=new Set();
		}
		target["mPatch"].add(pathArr[pathArr.length-1]);
	}
    //업데이트 되었다고 강제로 알림
    public PatchExe(_member)
	{
		if(this.IsShould(_member,CObject.eShould.Patch)==false)	return;
		
		if(this["mPatchUpdate"]==null)
			this["mPatchUpdate"]=new Set();

		this["mPatchUpdate"].add(_member);
	}       
	static PushEditerBtn(_obj : CObjectEditerBtn)
	{
		gObjectEditerBtn.push(_obj);
	}
	static GetEditerBtn()
	{
		return gObjectEditerBtn;
	}

}
export class CBlackBoardRef<T> extends CObject
{
    mKey : string;
	constructor(_key="")
	{
		super();
		this.mKey=_key;
	}
	Ref(_ref : string=null) : T
	{
		if(_ref!=null)	
			this.mKey=_ref;
		return CBlackBoard.Find(this.mKey);
	}
	
	Icon() { return "bi bi-link"; }
	EditDrop(_object: CObject): void 
	{
		if(CBlackBoard.Find(_object.Key())!=null)
	    {
	        this.mKey=_object.Key();
	        this.EditRefresh();
	    }
	}
	
}


export namespace CObject {
	 export enum eShould {
		Data = "D",
		Editer = "E",
		Patch = "P",
		Proxy = "X"
	}
}

export class CObjectEditerBtn
{
	constructor(_fun : string,_text : string,_event  =null,_class="btn btn-primary btn-sm")
	{
		this.mFunction=_fun;
		this.mText=_text;
		this.mClass=_class;
		this.mEvent=_event;
	}
	mFunction="";
	mText="";
	mClass="";
	mEvent=null;
}

var gObjectEditerBtn=new Array<CObjectEditerBtn>();
gObjectEditerBtn.push(new CObjectEditerBtn("SaveJSON","Save",(_target)=>{
	let para=[];
	para.push(_target.Key());
	
	return para;
}));
gObjectEditerBtn.push(new CObjectEditerBtn("LoadJSON","Load",(_target)=>{
	let para=[];
	//para.push(_target.Key());
	
	return para;
}));

import CObject_imple from "../basic_impl/CObject.js";
CObject_imple();
