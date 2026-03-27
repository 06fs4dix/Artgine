import { CRouteMsg } from "../app/CRouteMsg.js";
import { CUpdate } from "../basic/Basic.js";
import { CClass } from "../basic/CClass.js";
import { CEvent } from "../basic/CEvent.js";
import { CJSON } from "../basic/CJSON.js";
import { CObject } from "../basic/CObject.js";
import { CSamplerTimer } from "./CSampler.js";

//action
export class CAction extends CObject
{
    constructor(_type,_action : string|CEvent,_para : Array<any>=[])
    {
        super();
        this.mAction=_action;
        this.mParameter=_para==null?[]:_para;
        this.mType=_type;
    }

    static eType={
        "Function":"Function",//등록된 타겟에 함수
        "Listener":"Listener",//리스너를 상속한 객체
        "Message":"Message",//메세지로 전달
        "Event":"Event",

        //"Code":"Code",
        //"Ramda":"Ramda",
    };
    mType : string="Function";
    mAction : string|CEvent="";
    mParameter : Array<any>=new Array<any>();
    mSamplerTimer=new CSamplerTimer(true);
    mTemp=null;
    mRun="";
 
    static Excute(_temp,_event :  ((...args: any[]) => any) | CEvent<(...args: any[]) => any>,count=0,delay=0,start=0,_end=0)
    {
        if(CSamplerTimer.Update(_temp,count,delay,start,_end))
        {
            if(_event instanceof CEvent)
                _event.Call(_temp);
            else
                _event(_temp);
        }
    }
    // static Reset(_temp)
    // {
    //     CSamplerTimer.Reset(_temp);
    // }
    async Excute(_actionTarget,_async=false,_parameter : Array<any>=null,_tempTarget=null,_run="",_update : CUpdate=null)
    {
        if(_tempTarget==null) this.mTemp=this;
        else    this.mTemp=_tempTarget;
        
        this.mRun=_run;

        if(this.mSamplerTimer.Excute(this.mTemp,this.mRun,_update)==false)    return;
       
        
             


        if(_parameter==null)    _parameter=this.mParameter;
        if(typeof this.mAction!="string")
        {
            this.mAction.Call(_parameter);
        }
        else if(this.mType==CAction.eType.Function)
        {
            if(_async)
                return await CClass.CallAsync(_actionTarget,this.mAction ,_parameter);    
            else
                CClass.Call(_actionTarget,this.mAction as string,_parameter);
        }
        else if(this.mType==CAction.eType.Listener)
        {
            if(_async)
                return await _actionTarget.GetEvent(this.mAction).CallAsync(_parameter);
            else
                _actionTarget.GetEvent(this.mAction).Call(_parameter);
        }
        else if(this.mType==CAction.eType.Message)
        {
            let mag=_actionTarget.NewInMsg(this.mAction) as CRouteMsg;
            mag.mMsgData=_parameter;
        }
        //else if(this.mType==CAction.eType.Message)
    }
    override ImportCJSON(_json: CJSON): this {
        let json=_json.mDocument;
        this.mType=json["mType"]==null?json["t"]:json["mType"];
        this.mAction=json["mAction"]==null?json["a"]:json["mAction"];
        this.mParameter=json["mParameter"]==null?json["p"]:json["mParameter"];

        

        if(json["mDelay"]!=null)    this.mSamplerTimer.mDelay=json["mDelay"]==null?json["d"]:json["mDelay"];
        if(json["mCount"]!=null)    this.mSamplerTimer.mCount=json["mCount"]==null?json["c"]:json["mCount"];
        if(json["mBegin"]!=null)    this.mSamplerTimer.mStart=json["mBegin"]==null?json["b"]:json["mBegin"];
        if(json["mEnd"]!=null)    this.mSamplerTimer.mEnd=json["mEnd"]==null?json["e"]:json["mEnd"];
        return this;
    }
    // Reset()
    // {
    //     if(this.mTemp==null)    return;
    //     CSamplerTimer.Reset(this.mTemp,this.mRun);
    // }
    IsEndReset()
    {
        if(this.mTemp==null)    return false;
        return CSamplerTimer.IsEndReset(this.mTemp,this.mRun);
    }
}