import { CRouteMsg } from "../app/CRouteMsg.js";
import { CClass } from "../basic/CClass.js";
import { CJSON } from "../basic/CJSON.js";
import { CObject } from "../basic/CObject.js";
import { CSamplerTimer } from "./CSampler.js";

//condition
export class CCondition extends CObject
{
    constructor(_stage : string|{s}|{s,v}|{s,v,o},_op : string="==",_value : any=1)
    {
        super();
        this.mOperator=_op==null?"==":_op;
        this.mValue=_value==null?1:_value;

        if(_stage==null)    {}
        else if(typeof _stage=="string")
        {
            this.mState=_stage;
        }
        else
        {
            this.ImportJSON(_stage);
        }
        
    }
    mState="";
    mValue : any=1;
    mOperator="==";
    static eOperator={
        "==":"==",
        "!=":"!=",
        "<=":"<=",
        ">=":">=",
        "<":"<",
        ">":">",

        Equal:"==",
        NotEqual:"!=",
        LessEqual: "<=",
        GreaterEqual: ">=",
        Less: "<",
        Greater: ">"
    };
    Excute(_state : CObject)
    {
        let st=_state.Get(this.mState) as any;
       
        if(this.mOperator=="==")    return st==this.mValue;
        if(this.mOperator=="!=")    return st!=this.mValue;
        if(this.mOperator=="<=")    return st<=this.mValue;
        if(this.mOperator==">=")    return st>=this.mValue;
        if(this.mOperator=="<")    return st<this.mValue;
        if(this.mOperator==">")    return st>this.mValue;
        

        return true;
    }
    ImportCJSON(_json: CJSON): this {
        let json=_json.mDocument;
        this.mState=json["mState"]==null?json["s"]:json["mState"];
        this.mOperator=json["mOperator"]==null?json["o"]:json["mOperator"];
        if(this.mOperator==null)    this.mOperator="==";
        this.mValue=json["mValue"]==null?json["v"]:json["mValue"];
        if(this.mValue==null)    this.mValue=1;
        return this;
    }

}
//action
export class CAction extends CObject
{
    constructor(_type,_action : string,_para : Array<any>=[])
    {
        super();
        this.mAction=_action;
        this.mParameter=_para==null?[]:_para;
        this.mType=_type;
    }

    static eType={
        "Function":"Function",
        "Listener":"Listener",
        "Message":"Message",

        "Code":"Code",
        "Ramda":"Ramda",
    };
    mType : string="Function";
    mAction : string="";
    mParameter : Array<any>=new Array<any>();
    mSamplerTimer=new CSamplerTimer(true);
 
    

    async Excute(_target,_delay : number,_update=1,_async=false)
    {
        if(this.mSamplerTimer.Excute(_delay,_update)==false)    return;

        if(this.mType==CAction.eType.Function)
        {
            if(_async)
                return await CClass.CallAsync(_target,this.mAction,this.mParameter);    
            else
                CClass.Call(_target,this.mAction,this.mParameter);
        }
        else if(this.mType==CAction.eType.Listener)
        {
            if(_async)
                return await _target.GetEvent(this.mAction).CallAsync(this.mParameter);
            else
                _target.GetEvent(this.mAction).Call(this.mParameter);
        }
        else if(this.mType==CAction.eType.Message)
        {
            let mag=_target.NewInMsg(this.mAction) as CRouteMsg;
            mag.mMsgData=this.mParameter;
        }
    }
    ImportCJSON(_json: CJSON): this {
        let json=_json.mDocument;
        this.mType=json["mType"]==null?json["t"]:json["mType"];
        this.mAction=json["mAction"]==null?json["a"]:json["mAction"];
        this.mParameter=json["mParameter"]==null?json["p"]:json["mParameter"];

        

        if(json["mDelay"]!=null)    this.mSamplerTimer.mDelay=json["mDelay"]==null?json["d"]:json["mDelay"];
        if(json["mCount"]!=null)    this.mSamplerTimer.mCount=json["mCount"]==null?json["c"]:json["mCount"];
        if(json["mBegin"]!=null)    this.mSamplerTimer.mBegin=json["mBegin"]==null?json["b"]:json["mBegin"];
        if(json["mEnd"]!=null)    this.mSamplerTimer.mEnd=json["mEnd"]==null?json["e"]:json["mEnd"];
        return this;
    }
}