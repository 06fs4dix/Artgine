import { CUpdate } from "../../basic/Basic.js";
import { CJSON } from "../../basic/CJSON.js";
import { CObject } from "../../basic/CObject.js";
import {CString} from "../../basic/CString.js";
import { CFile } from "../../system/CFile.js";
import { IFile } from "../../system/System.js";
import { IProvider } from "../../util/CRole.js";

import {CRouteMsg} from "../CRouteMsg.js";
import {CSubject} from "../subject/CSubject.js";

export class CComponent extends CObject implements IProvider
{
	protected mEnable : boolean;
	public mSave : boolean;


	
	protected mDestroy : boolean;
	public mSysc=CComponent.eSysn.Event;
	public mComMsg : Array<CRouteMsg>=null;
	protected mComMsgSwap=new Array<CRouteMsg>();
	public mComMsgLen=0;
	protected mOwner : CSubject=null;
	public mStartChk=true;
	constructor()
	{
		super();
		this.mDestroy=false;
		this.mEnable=true;
		this.mSave=true;
		this.mComMsg=new Array<CRouteMsg>();
		

	}
	Provider(_type : string,_state : Array<string>) {	}

	GetSysc(){	return this.mSysc;	}
	IsStart()
	{
		return this.mStartChk==false;
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		//원본데이터를 가져올지 유무
		if(_type==CObject.eShould.Proxy)
		{
			if(_member=="mEnable")
				return false;
		}
		if(_member=="mComMsg" ||  _member=="mComMsgLen" ||_member=="mComMsgSwap" ||  _member=="mStartChk" ||
			_member=="mOwner" || _member=="mDestroy" || _member=="mSysc")
			return false;
		
		return super.IsShould(_member,_type);
	}

	PushMsg(_msg : CRouteMsg)
	{
		if(this.mDestroy)	return;
		if(this.mComMsg.length>this.mComMsgLen)
			this.mComMsg[this.mComMsgLen]=_msg;
		else
			this.mComMsg.push(_msg);
		this.mComMsgLen++;	
	}
	Fixed(_update : CUpdate)
	{

	}
	Update(_update : CUpdate) : boolean|any
	{
		
	}
	BuildGI()
	{

	}
	SubUpdate()
	{

	}
	ProductMsg(_name : string)
	{
		if(this.mDestroy)	return new CRouteMsg(_name);;
		this.mComMsgLen++;
		var cm : CRouteMsg=null;
		if(this.mComMsg.length>this.mComMsgLen-1)
		{
			
			cm=this.mComMsg[this.mComMsgLen-1];
			cm.mMsgName=_name;
			cm.mIntra=null;
			cm.mInter=null;
			cm.mChild=false;
		}
		else
		{
			cm=new CRouteMsg(_name);
			this.mComMsg.push(cm);
		}
		return cm;
	}
	RemoveMsg(_name : string)
	{
		for(var i=0;i<this.mComMsg.length;++i)
		{
			if(this.mComMsg[i].mMsgName==_name)
			{
				this.mComMsg.splice(i,1);
				this.mComMsgLen--;
				break;
			}
		}	
	}
	
	ClearMsg()
	{
		if(this.mComMsgLen==0)return;
		//이거 함부로 지우지 마라
		//메세지 덮어쓰기 문제가 생길수가 있다
		var dummy=this.mComMsg;
		this.mComMsg=this.mComMsgSwap;
		this.mComMsgSwap=dummy;
		
		this.mComMsgLen=0;
	}
	// CRouteMsgCall(_msg : CRouteMsg)
	// {
	// 	_msg.Call(this);
		
	// }
	Reset()
	{
		this.mStartChk=true;
		this.mComMsgLen=0;
		this.mOwner=null;
	}
	override Recycle()
	{
		if(this.GetRecycleType()!=null && this.IsRecycle()==false)
		{
			super.Recycle();
			return;
		}
		
		this.mStartChk=true;
		this.mComMsgLen=0;
	}
	IsEnable()	
	{	
		if(this.IsDestroy())	return false;
		return this.mEnable;	
	}
	SetEnable(_val : boolean)	
	{	
		this.mEnable=_val;	
		if(this.mOwner!=null)		this.mOwner.UpdateComp();
	}
	//ClassEqual(_type)	{	return false;	}
	IsDestroy()	
	{	
		if(this.IsRecycle())	return true;
		return this.mDestroy;	
	}
	//체크는 더 상위이다. 로드가 덜되었는지 체크하는게 스타트랑 차이점
	StartChk() : boolean
	{
		if(this.mStartChk==true)
		{
			this.mStartChk=false;
			return true;
		}
		return false;
	}
	//스타트는 업데이트 전에 최초 한번만 호출
	Start(){}
	//어웨이크는 캔버스 등록될때 한번만 호출
	//Awake(){};
	SetOwner(_obj)
	{
		this.mOwner=_obj;
	}
	GetOwner(){		return this.mOwner;	}
	Destroy() 
	{
		
		if(this.mDestroy)
			return;

		if(this.GetRecycleType()!=null)
		{
			this.Recycle();
			return;
		}
			

		this.mDestroy = true;
		this.mEnable=false; 
		this.mStartChk=true;
		this.ClearMsg();
		this.mComMsg=null;
		
		  
	}
	//프리팹 상태에서 호출됌
	Prefab(_owner : CSubject)
	{

	}

};

export namespace CComponent
{
	export enum eSysn{
		First=0,
		Collider=100,
		Light=201,
		IK=300,
		CamComp=401,
		

		RigidBody=500,
		Wind=501,
		WorkFlow=600,
		Event=601,
		AniFlow=800,
		Paint=900,
	};
}