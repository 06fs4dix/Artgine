import {CTree} from "../basic/CTree.js";
import {CString} from "../basic/CString.js";
import {CBlackBoard} from "../basic/CBlackBoard.js";
import {CDomFactory} from "../basic/CDOMFactory.js";
import { CObject, CPointer } from "../basic/CObject.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CAlert } from "../basic/CAlert.js";
import { CClass } from "../basic/CClass.js";
import { IFile } from "../system/System.js";
import { CFile } from "../system/CFile.js";
import { CJSON } from "../basic/CJSON.js";




export class CWFValue extends CObject
{
	public mData : any=0;
	public mMember=new Array<string>();
	public mListener=null;
	constructor(_data,_listener=null,_member=new Array<string>)
	{
		super()
		this.mData=_data;
		this.mListener=_listener;
		this.mMember=_member;
	}
	GetValue(_env : CWFEnv)
	{
		if(this.mListener)
		{
			let l=_env.GetListener(this.mListener);
			if(l==null)
				return null;

			if(l.Get != null) {
				let lv=l.Get(this.mMember);

				return lv;
			}
			else {
				let lv = l;
				for(let mem of this.mMember) {
					lv = lv[mem];
				}
				return lv;
			}

		}

		return this.mData;
	}
	DataToStr()
	{
		var str="";
		if(this.mListener==null)
		{
			if(typeof this.mData =="string")
				str+="\""+this.mData+"\"";
			else
				str+=this.mData;
		}
		else
		{
			str +=  this.mListener;
			for(var m of this.mMember)
			{
				str+="."+m;
			}	
		}
		return str;
	}
	StrToData(_str : string)
	{
		if(_str.indexOf(".") != -1) 
		{
			let v0=_str.split(".");
			this.mListener=v0[0];
			
			for(var i=1;i<v0.length;++i)
			{
				if(v0[i].indexOf("(")!=-1 && v0[i].indexOf(")")==-1)
				{
					this.mMember.push(v0[i]+"."+v0[i+1]);	
					i++;
				}
				else
					this.mMember.push(v0[i]);	
			}
				
		} 
		else
		{
			this.mData = _str;
			this.mData=CString.DataConvert(this.mData);

			if(typeof this.mData=="string" && this.mData.indexOf("\"")!=-1)
				this.mData=CString.ReplaceAll(this.mData,"\"","")
		}	
		
	}

}
export class CWFOperator extends CObject
{
	constructor(_op : string="false",_value : Array<CWFValue>=new Array<CWFValue>())
	{
		super();
		this.mData=_op;
		this.mValue=_value;
	}
	public mValue=new Array<CWFValue>();
	public mData="false";
	public mTemp=null;
	override IsShould(_member: string, _type: CObject.eShould)
	{
		if(_member=="mTemp")	return false;

		return super.IsShould(_member,_type);
	}
	Process(_env : CWFEnv)
	{
		if(this.mData=="true")
			return true;
		else if(this.mValue.length==2)
		{
			if(this.mData=="==" || this.mData=="equals")
				return this.mValue[0].GetValue(_env)==this.mValue[1].GetValue(_env);
			else if(this.mData==">")
				return this.mValue[0].GetValue(_env)>this.mValue[1].GetValue(_env);
			else if(this.mData=="<")
				return this.mValue[0].GetValue(_env)<this.mValue[1].GetValue(_env);
			else if(this.mData==">=")
				return this.mValue[0].GetValue(_env)>=this.mValue[1].GetValue(_env);
			else if(this.mData=="<=")
				return this.mValue[0].GetValue(_env)<=this.mValue[1].GetValue(_env);
			else if(this.mData=="!=")
				return this.mValue[0].GetValue(_env)!=this.mValue[1].GetValue(_env);
		}
		else if(this.mValue.length==1)
		{
			if(this.mData=="change" || this.mData=="onchange")
			{
				var val=this.mValue[0].GetValue(_env);
				if(typeof val == "object")
				{
					val=JSON.stringify(val);
				}
				if((this.mTemp!=null && val!=this.mTemp))
				{
					this.mTemp=val;

					return true;
				}
				
				this.mTemp=val;
			}
			
		}
			
		
		return false;
	}
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		if(_pointer.member=="mValue")
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[new CWFValue("")]);
	}
	DataToStr()
	{
		let operString = "";
		if(this.mData == "change" || this.mData == "onchange") {
			operString += this.mData + "=";
			if(this.mValue.length == 1) {
				operString += (this.mValue[0].mListener == null? "" : (this.mValue[0].mListener))

				for(var m of this.mValue[0].mMember)
				{
					operString+="."+m;
				}
			}
		} else if(this.mData == "true" || this.mData == "false") {
			operString += this.mData;
		} else {
			if(this.mValue.length >= 1)
			{
				operString+=this.mValue[0].DataToStr();
			}
			operString += this.mData;
			if(this.mValue.length >= 2)
			{
				operString+=this.mValue[1].DataToStr();
			}
		}
		return operString;
	}
	StrToData(_str : string)
	{
		if(_str=="")
			return;
		let arr : Array<CWFValue> = [], oper = "";
		if(_str=="false")
			oper = _str;
		else if(_str=="true")
			oper = _str;
		else if(_str.indexOf("change") != -1 || _str.indexOf("onchange") != -1 || _str.indexOf("ch") != -1) {
			let [lis0, val0,mem0, lis1, val1,mem1] = this.ThinParseOperValue(_str, "=");
			if(val0 == "change" || val0 == "onchange" || val0 == "ch") {
				arr.push(new CWFValue(val1, lis1,mem1));
			} else {
				arr.push(new CWFValue(val0, lis0,mem0));
			}
			oper = "change";
		}
		else
		{
			if(_str.indexOf("==") != -1)	oper="==";
			else if(_str.indexOf("!=") != -1)	oper="!=";
			else if(_str.indexOf(">=") != -1)	oper=">=";
			else if(_str.indexOf("<=") != -1)	oper="<=";
			else if(_str.indexOf(">") != -1)	oper=">";
			else if(_str.indexOf("<") != -1)	oper="<";
			else
			{
				CAlert.E("알수없음")
				oper="true";
				return;
			}
			let [lis0, val0,mem0, lis1, val1,mem1] = this.ThinParseOperValue(_str, oper);
			arr.push(new CWFValue(val0, lis0,mem0), new CWFValue(val1, lis1,mem1));

		}
		
		this.mValue=arr;
		this.mData=oper;
		
	}
	ThinParseOperValue(_data : string, _oper : string) 
	{
		let [valKey0, valKey1] = _data.split(_oper);
		valKey0 = valKey0.split(" ").join("");
		valKey1 = valKey1.split(" ").join("");
		let listener0 = null, valueKey0 = null,member0=new Array<string>();
		if(valKey0.indexOf(".") != -1) {
			let v0=valKey0.split(".");
			listener0=v0[0];
			
			for(var i=1;i<v0.length;++i)
				member0.push(v0[i]);
			
			
				
			
		} else {
			valueKey0 = valKey0;
		}
		let listener1 = null, valueKey1 = null,member1=new Array<string>();
		if(valKey1.indexOf(".") != -1) {
			let v1=valKey1.split(".");
			listener1=v1[0];
			
			for(var i=1;i<v1.length;++i)
				member1.push(v1[i]);
			
		} else {
			valueKey1 = valKey1;
		}
		if(valueKey0!=null)
			valueKey0=CString.DataConvert(valueKey0);
		if(valueKey1!=null)
			valueKey1=CString.DataConvert(valueKey1);
	
		return [listener0, valueKey0,member0, listener1, valueKey1,member1];
	}
}

export class CWFCondition extends CObject
{
	constructor(_operator : Array<CWFOperator>=null,_logic="&&",_next="")
	{
		super();
		this.mOperator=_operator;
		if(this.mOperator==null)
			this.mOperator=new Array<CWFOperator>();;
		this.mLogic=_logic;
		this.mLink=_next;
	}
	public mLogic="&&";
	public mOperator=new Array<CWFOperator>();
	public mLink="";
	
	//"" : 기본값 / pass : 실행 안함 / exit : 종료 [user] : 원하는 위치로
	Process(_env : CWFEnv)
	{
		var rVal=true;
		if(this.mLogic=="||")
			rVal=false;
		for(var each0 of this.mOperator)
		{
			if(this.mLogic=="&&")
			{
				if(each0.Process(_env)==false)
					return false;
			}
			else if(each0.Process(_env)==true)
				return true;
		}
		return rVal;
	}
	DataToStr()
	{
		let str="";
		if(this.mOperator.length>0)
		{
			for(let i=0;i<this.mOperator.length;++i)
			{
				if(i!=0)
					str+=this.mLogic;
				str+=this.mOperator[i].DataToStr();
				
			}
		}
		return str;
	}
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		if(_pointer.member=="mLink")
		{
			
			
			_body.append(CDomFactory.DataToDom({"<>":"textarea","class":"form-control","row":"3",
				"placeholder":"logic...\nEX : this.Fun(1)==1","value":this.DataToStr(),
				"onchange":(e)=>
				{
					let target=e.target as HTMLTextAreaElement;
					this.mOperator.length=0;
					let list : Array<string>=[];
					let pos=target.value.indexOf("&&");
					if(pos!=-1)
						list=target.value.split("&&");
					pos=target.value.indexOf("||");
					if(pos!=-1)
					{
						this.mLogic="||";
						list=target.value.split("||");
					}
						

					if(list.length==0)
						list.push(target.value);
					for(let i=0;i<list.length;++i)
					{
						let op=new CWFOperator("true",[]);
						op.StrToData(list[i]);
						this.mOperator.push(op);
					}
					this.EditRefresh();
				}
			}));
		}
		else if(_pointer.member=="mOperator")
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[new CWFOperator("true",[])]);
	}
	
}
class CWFLoopData
{
	public mDelay=0;
	public mCount=0;
	public mTime=0;
}
export class CWFAction extends CObject
{
	public mStart=-1;
	public mDelay=-1;
	public mCount=-1;
	public mEnd=-1;
	public mCommand=new Array<CWFCommand>();

	IsCall(_delay : number,_env : CWFEnv)
	{
		let call=false;
		var ld=_env.mLoopMap.get(this.Key());
		if(ld==null)
		{
			_env.mLoopMap.set(this.Key(),new CWFLoopData());
			ld=_env.mLoopMap.get(this.Key());
		}
		if((this.mStart==-1 || this.mStart<=ld.mTime) && (ld.mTime<=this.mEnd || this.mEnd==-1))
		{
			if(ld.mDelay<=0 && (this.mCount==-1 || this.mCount>ld.mCount) )
			{
				ld.mDelay+=this.mDelay;
				call=true;
			
				ld.mCount++;
			}
			else
				ld.mDelay-=_delay;
		}
		ld.mTime+=_delay;
		return call;
	}

	
	
	Loop(_delay : number,_env : CWFEnv)
	{

		if(this.mCommand.length!=0 && this.IsCall(_delay,_env))
		{
			for(let com of this.mCommand)
			{
				if(com.mRightFun==null)
				{
					if(com.mRight.mMember.length==0)	
						com.mRightFun="";
					else
					{
						let dummyMember=[...com.mRight.mMember];
						let end=dummyMember.splice(dummyMember.length-1,1);
						var funInfo=CString.FunctionAnalyze(end[0]);

						let lis=_env.GetListener(com.mRight.mListener);
						if(lis==null)
						{
							CAlert.W("WF error : "+com.mRight.ToStr());
							continue;
						}
						if(lis.Get != null)
							com.mRightTarget=lis.Get(dummyMember);
						else
							com.mRightTarget=com.mRight.GetValue(_env);
						com.mRightFun=funInfo.function;
						com.mRightPara=funInfo.parameter;
						//특정값 참조시 
						for(let i=0;i<com.mRightPara.length;++i)
						{
							if(typeof com.mRightPara[i] == "string")	
							{
								if(com.mRightPara[i].indexOf(".")!=-1)
								{
									var dummy=new CWFValue(null);
									dummy.StrToData(com.mRightPara[i]);
									com.mRightPara[i]=dummy;
								}
								else
								{
									lis=_env.GetListener(com.mRightPara[i]);
									if(lis!=null)
										com.mRightPara[i]=lis;
								}
							}
						}
						

					}
				}
				let rightRet=null;
				if(com.mRightFun=="")
					rightRet=com.mRight.GetValue(_env);
				else
				{
					
					for(let i=0;i<com.mRightPara.length;++i)
					{
						if(com.mRightPara[i] instanceof CWFValue)
							com.mRightParaTras[i]=com.mRightPara[i].Get(_env);
					
						else
							com.mRightParaTras[i]=com.mRightPara[i];
					}
					if(com.mOperator=="")
					{
						if(com.mRightTarget!=null)
						{
							com.mRightTarget.Call(com.mRightFun,com.mRightParaTras);
							//com.mRightTarget.Message(com.mRightFun,com.mRightParaTras);
						}
						
					}
						
					else
						CClass.Call(com.mRightTarget,com.mRightFun,com.mRightParaTras);
						
				}

				if(com.mOperator=="=")
				{
					let l=_env.GetListener(com.mLeft.mListener);
					if(l) l.Set(com.mLeft.mMember,rightRet);
					else CAlert.W("WF error : "+com.mLeft.ToStr());
				}
				else if(com.mOperator!="")
				{
					let l=_env.GetListener(com.mLeft.mListener);
					if(l == null) {
						CAlert.W("WF error : " + com.mLeft.ToStr());
						continue;
					}
					var v=l.Get(com.mLeft.mMember) as number;//string일수도 잇는데 임시
					if(v==null)	v=0;
					if(com.mOperator=="+=")		l.Set(com.mLeft.mMember,v+rightRet);
					else if(com.mOperator=="-=")		l.Set(com.mLeft.mMember,v-rightRet);
					else if(com.mOperator=="*=")		l.Set(com.mLeft.mMember,v*rightRet);
					else if(com.mOperator=="/=")		l.Set(com.mLeft.mMember,v/rightRet);
				}
			}
		}
	}
	DataToStr()
	{
		var str="";
		for(let com of this.mCommand)
		{
			str += com.DataToStr();
			str+="\n";
		}
		return str;
	}
	StrToData(_str : string)
	{
		_str=CString.ReplaceAll(_str,"\n","");
		_str=CString.ReplaceAll(_str," ","");
		_str=CString.ReplaceAll(_str,"	","");
		var comArr=_str.split(";");
		this.mCommand.length=0;
		for(var each0 of comArr)
		{
			if(each0=="")	continue;
			var wfcom=new CWFCommand();
			let pos=each0.indexOf("=");
			if(pos!=-1)
			{
				
				wfcom.mRight=new CWFValue(null);
				wfcom.mRight.StrToData(each0.substr(pos+1,each0.length-pos));
				if(CString.InChk(each0,["+","-","*","/"]))
				{
					CAlert.W("WF에서는 연산자 미지원.X=1+1  X+=1가능");
				}

				//var right=each0.substr(pos,each0.length-pos);
				if(each0[pos-1]=="+" || each0[pos-1]=="-" || each0[pos-1]=="*" || each0[pos-1]=="/")
				{
					wfcom.mOperator=each0[pos-1]+"=";
					pos-=1;
				}
				else
				{
					wfcom.mOperator="=";
					//pos-=1;
				}
				//var left=each0.substr(0,pos);
				wfcom.mLeft=new CWFValue(null);
				wfcom.mLeft.StrToData(each0.substr(0,pos));
				
			}
			else
			{
				wfcom.mRight=new CWFValue(null);
				wfcom.mRight.StrToData(each0);
			}
			this.mCommand.push(wfcom);
		}

	}
	End(_env : CWFEnv)
	{
		_env.mLoopMap.delete(this.Key());
	}
}

export class CWFCommand extends CObject
{

	public mLeft : CWFValue=null;
	public mRight : CWFValue=null;
	public mRightTarget=null;
	public mRightFun=null;
	public mRightPara =new Array<any>();
	public mRightParaTras =new Array<any>();
	public mOperator="";
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mRightParaTras" || _member=="mRightPara" || _member=="mRightFun" || _member=="mRightTarget")
			return false;
		return super.IsShould(_member,_type);
	}
	DataToStr() {
		let str = "";
		if(this.mLeft!=null)
			str+=this.mLeft.DataToStr();
		str+=this.mOperator;
		str+=this.mRight.DataToStr();
		str+=";";
		return str;
	}
}


export class CWFEnv
{
	public mLoopMap=new Map<string,CWFLoopData>();
	public mListener=new Map<string,CObject>();

	GetListener(_key)
	{
		let val=this.mListener.get(_key);
		if(val==null)
			val=CBlackBoard.Get(_key);
		if(val==null)
			val=window[_key] as any;
		return val;		
	}
	Register(_obj : CObject,_key="this")
	{
		this.mListener.set(_key,_obj);
	}
	
	
}

export class CWFTask extends CObject
{
	constructor(_key : string="",_condition : Array<CWFCondition>=[],_action : Array<CWFAction>=[])
	{
		super();
		this.mKey=_key;
		this.mCondition=_condition;
		this.mAction=_action;
	}
	public mKey="";
	public mAction=new Array<CWFAction>();
	public mCondition=new Array<CWFCondition>();
	public mActionFirst=true;
	
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mActionFirst")
			return false;
		return super.IsShould(_member,_type);
	}
	ActionLoop(_delay : number,_env : CWFEnv)
	{
		for(var each0 of this.mAction)
		{
			each0.Loop(_delay,_env);
				
		}
	}
	ActionEnd(_env : CWFEnv)
	{
		for(var each0 of this.mAction)
		{
			each0.End(_env);
				
		}
	}
	Condition(_env : CWFEnv)
	{
		var change : CWFCondition=null;
		if(this.mCondition.length==0)
			return new CWFCondition(null,null,null);
		for(var each1 of this.mCondition)
		{
			if(each1.Process(_env))
			{
				change=each1;
				break;
			}
		}
		

		return change;
	}
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		if(_pointer.member=="mCondition")
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[new CWFCondition([])]);
	}
}
export class CWFSystem extends CObject implements IFile
{
	public mTaskActive=new Map<string,CWFTask>();
	public mLastEnv : CWFEnv=null;
	constructor()
	{
		super();
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mTaskActive" || _member=="mLastEnv")
			return false;
		return super.IsShould(_member,_type);
	}
	EditHTMLInit(_div : HTMLDivElement)
	{
		super.EditHTMLInit(_div);
		var button=document.createElement("button");
		button.innerText="WorkTool";
		button.onclick=()=>{
			if(window["WorkTool"]!=null)
				window["WorkTool"](this);
		};
		
		_div.append(button);

	}



	async SaveJSON(_file: any=null)
	{
		CFile.Save(this.ToStr(),_file,true);
	}
    async LoadJSON(_file: any=null)
	{
		let buf=await CFile.Load(_file);
		if(buf==null)	return true;
		this.ImportCJSON(new CJSON(buf));
		return false;
	}
	Update(_delay : number,_env : CWFEnv){}
	
}
export class CWFSystemSingle extends CWFSystem 
{
	public mTaskList=new Array<CWFTask>();
	public mRun : number=0;
	
	
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mRun")
			return false;
		return super.IsShould(_member,_type);
	}
	Update(_delay : number,_env : CWFEnv)
	{
		this.mLastEnv=_env;
		if(this.mTaskList.length==0)
			return;

		let run=this.mTaskList[this.mRun];
		
		var act=this.mTaskActive.get(run.mKey);
		if(act==null)
		{
			//run.ActionBegin(_env);
			this.mTaskActive.set(run.mKey,run);
		}
		run.ActionLoop(_delay,_env);
		var ch=run.Condition(_env);
		if(ch!=null && ch.mLogic!=null)
		{
			run.ActionEnd(_env);
			this.mTaskActive.delete(run.mKey);
			
			for(var i=0;i<this.mTaskList.length;++i)
			{
				if(this.mTaskList[i].mKey==ch.mLink)
				{
					this.mRun=i;
					break;
				}				
			}
			
		}
		
	}
	
}

export class CWFSystemMulti extends CWFSystem 
{
	public mTaskTree=new CTree<CWFTask>();
	public mActiveSet=new Set<string>();
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mActiveSet")
			return false;
		return super.IsShould(_member,_type);
	}
	Update(_delay : number,_env : CWFEnv)
	{
		this.mLastEnv=_env;
		//var link="";
		this.mActiveSet.clear();
		//var activeSet=new Set<string>();
		var que=new Array<CTree<CWFTask>>();

		//let step=new Set<string>();
		let node=this.mTaskTree.mChilde;
		let nextNode=()=>{
			if(node.mColleague!=null)
				node=node.mColleague;
			else if(node.mParent!=null && node.mParent.mData!=null)
				node=node.mParent;
			else
				node=null;
		};
		while(node!=null)
		{
			if(this.mActiveSet.has(node.mData.mKey)==true)
			{
				nextNode();
				continue;
			}
			
			this.mTaskActive.set(node.mData.mKey,node.mData);
			
			node.mData.ActionLoop(_delay,_env);
			this.mActiveSet.add(node.mData.mKey);

			var ch=node.mData.Condition(_env);
			
			
			if(ch!=null)
			{
				if(ch.mLink!=null && ch.mLink!="")
				{
					let linkNode=this.mTaskTree.Find(ch.mLink);
					this.mTaskActive.set(linkNode.mData.mKey,linkNode.mData);
					linkNode.mData.ActionLoop(_delay,_env);
					this.mActiveSet.add(linkNode.mData.mKey);
				}
					
				else if(node.mChilde!=null)
					node=node.mChilde;
				else 
					nextNode();
				
			}
			else
				nextNode();
		
			
		}
		
		

		//실행 안되는 루프들 찾아서 비활성화
		que=new Array<CTree<CWFTask>>();
		que.push(this.mTaskTree.mChilde);
		for(var i=0;i<que.length;++i)
		{
			let node=que[i];
			if(node!=null)
			{
				que.push(node.mColleague);
				que.push(node.mChilde);
				let act=this.mTaskActive.get(node.mData.mKey);
				if(act!=null && this.mActiveSet.has(node.mData.mKey)==false)
				{
					node.mData.ActionEnd(_env);
					this.mTaskActive.delete(node.mData.mKey);
				}
			}
		}

	}
	
}

export class CWorkFlow extends CObject
{
	public mSys : CWFSystem= null;
	public mEnv : CWFEnv=new CWFEnv();

	constructor(_sys : CWFSystem=null)
	{
		super();
		this.mSys=_sys;
	}
	Reset()
	{
		this.mSys.mTaskActive.clear();
		this.mEnv.mLoopMap.clear();
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mEnv")
			return false;
		return super.IsShould(_member,_type);
	}
	Update(_delay)
	{
		if(this.mSys!=null)
			this.mSys.Update(_delay,this.mEnv);
	}
	EditForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void
	{
		if(_pointer.member=="mSys")	
		{
			var buttonSingle=document.createElement("button");
			buttonSingle.innerText="single";
			
			buttonSingle.onclick=()=>{
				_pointer.target["mSys"]=new CWFSystemSingle();
				_pointer.target.EditRefresh();
				
			};
			_div.append(buttonSingle);
			
			var buttonMulti=document.createElement("button");
			buttonMulti.innerText="multi";
			buttonMulti.onclick=()=>{
				_pointer.target["mSys"]=new CWFSystemMulti();
				_pointer.target.EditRefresh();
				
			};
			_div.append(buttonMulti);

		}
	}
}