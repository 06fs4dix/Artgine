import { CClass } from "../basic/CClass.js";

//var gComMsgPool=new Array();

export class CRouteMsg
{
	// static Product()
	// {	
	// 	if(gComMsgPool.length>0)
	// 	{
	// 		//g_comMsgPool.splice(0,1);
	// 		return gComMsgPool.splice(0,1)[0];
	// 	}
		
	// 	return new Array<CRouteMsg>();
	// }
	// static Recycle(_arr : Array<CRouteMsg>)
	// {
	// 	gComMsgPool.push(_arr);
	// }
	//외부
	/*
		"" : 현재 캔버스/서브젝트 들  
		"키" : 특정 유저 / 특정 캔버스
		"canvas" : 현재 캔버스 
		null : 외부노출 금지
	*/
	public mInter : string=null;
	public mChilde : boolean;
	public mIntra : any=null;//내부전달용 컴포넌트나 서브젝트 ex:CPaint,CSubject
	public mMsgName="";
	public mMsgData=new Array<any>();
	
	constructor(_msgName : string,_msgData : Array<any>=null,_component=null,_objHD=null,_childe=false)
	{
		this.mMsgName=_msgName;
		if(_msgData!=null)
			this.mMsgData=_msgData;
		this.mIntra=_component;
		this.mInter=_objHD;
		this.mChilde=_childe;
	}
	Call(_target : any)
	{
		CClass.Call(_target,this.mMsgName,this.mMsgData);
	}
}
