import { CArray } from "../basic/CArray.js";
import { CClass } from "../basic/CClass.js";
import { CJSON } from "../basic/CJSON.js";
import { CObject } from "../basic/CObject.js";
import { CRouteMsg } from "../canvas/CRouteMsg.js";


//condition
export class CSMC extends CObject
{
    constructor(_stage : string,_op : string="==",_value : number=1)
    {
        super();
        this.mState=_stage;
        this.mOperator=_op==null?"==":_op;
        this.mValue=_value==null?1:_value;
    }
    mState="";
    mValue=1;
    mOperator="==";
    static eOperator={
        "==":"==",
        "!=":"!=",
        "<=":"<=",
        ">=":">=",
        "<":"<",
        ">":">",
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
        this.mValue=json["mValue"]==null?json["v"]:json["mValue"];
        return this;
    }

}
//action
export class CSMA extends CObject
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
    };
    mType : string="Function";
    mAction : string="";
    mParameter : Array<any>=new Array<any>();

    mDelay=0;
    mCount=1;
    mBegin=0;
    mEnd=0;

    mTimeAll=0;
    mTimeDelay=0;
    mExcute=0;
    mUpdate=0;
    

    async Excute(_target,_delay : number,_update=1,_async=false)
    {
        //업데이트 오프셋이 차이남
        if(_update-1!=this.mUpdate)
        {
            this.mTimeAll=0;
            this.mExcute=0;
            this.mTimeDelay=0;
        }
        this.mUpdate=_update;

        if(this.mTimeAll<this.mBegin || (this.mCount!=0 && this.mCount<=this.mExcute) || 
            (this.mEnd!=0 && this.mEnd<this.mTimeAll) || (0<this.mTimeDelay))  
        {
            this.mTimeAll+=_delay;
            this.mTimeDelay-=_delay;
            return;
        }
        

        this.mTimeAll+=_delay;
        this.mTimeDelay=this.mDelay;
        this.mExcute++;

        if(this.mType==CSMA.eType.Function)
        {
            if(_async)
                return await CClass.CallAsync(_target,this.mAction,this.mParameter);    
            else
                CClass.Call(_target,this.mAction,this.mParameter);
        }
        else if(this.mType==CSMA.eType.Listener)
        {
            if(_async)
                return await _target.GetEvent(this.mAction).CallAsync(this.mParameter);
            else
                _target.GetEvent(this.mAction).Call(this.mParameter);
        }
        else if(this.mType==CSMA.eType.Message)
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

        

        if(json["mDelay"]!=null)    this.mDelay=json["mDelay"];
        if(json["mCount"]!=null)    this.mCount=json["mCount"];
        if(json["mBegin"]!=null)    this.mBegin=json["mBegin"];
        if(json["mEnd"]!=null)    this.mEnd=json["mEnd"];
        return this;
    }
}
//pattern
export class CSMP extends CObject
{
    constructor(_and : CSMC|Array<CSMC>,_ex : CSMA|Array<CSMA>)
    {
        super();
        if(_and==null){}
        else if(_and instanceof Array)
            this.mAnd=_and;
        else
            this.mAnd.push(_and);    
        if(_ex==null){}
        else if(_ex instanceof Array)
            this.mExcute=_ex;
        else
            this.mExcute.push(_ex);    

    }
    mPriority : number=10000;
    mAnd =new Array<CSMC>;
    mOr =new Array<CSMC>;
    mExcute=new Array<CSMA>;
    ImportCJSON(_json: CJSON): this {
        let json=_json.mDocument;
        let and=json["mAnd"]==null?json["and"]:json["mAnd"];
        if(and!=null)
        {
            this.mAnd.length=0;
            for(let con of and)
            {
                let SMC=new CSMC(null);
                SMC.ImportJSON(con);
                this.mAnd.push(SMC);
            }
        }
        let or=json["mOr"]==null?json["or"]:json["mOr"];
        if(or!=null)
        {
            this.mOr.length=0;
            for(let con of or)
            {
                let SMC=new CSMC(null);
                SMC.ImportJSON(con);
                this.mOr.push(SMC);
            }
        }
        this.mPriority=json["mPriority"]==null?json["priority"]:json["mPriority"];


        let exe=json["mExcute"]==null?json["exe"]:json["mExcute"];
        if(exe!=null)
        {
            for(let ac of exe)
            {
                let sma=new CSMA(null,null);
                sma.ImportJSON(ac);
                this.mExcute.push(sma);
            }
        }
        return this;
    }
    IsCondition(_state : CObject)
    {
        let excute=true;
        for(let con of this.mAnd)
        {
            if(con.Excute(_state)==false)  
            {
                excute=false;
                break;
            }
                
        }
        if(excute==false)   return false;

        excute=this.mOr.length==0;
        for(let con of this.mOr)
        {
            if(con.Excute(_state)==true)
            {
                excute=true;
                break;
            }
        }

        return excute;
    }
}

export class CStateMachine extends CObject
{
    mPattern=new Array<CSMP>;
    mState=new CObject();
    mExcuteList=new CArray<CSMA>();
    mExcuteLock : CSMA=null;
    mUpdateOffset=0;
    //mExcuteData=new Map<>

    GetState(){ return this.mState; }
    PushPattern(_p : CSMP|Object|Array<Object>)
    {
        if(_p instanceof CSMP)
        {
            for(let i=0;i<this.mPattern.length;++i)
            {
                if(this.mPattern[i].mPriority<_p.mPriority)
                {
                    this.mPattern.splice(i,0,_p);
                    break;
                }
            }
            this.mPattern.push(_p);
        }
        else if(_p instanceof Array)
        {
            for(let json of _p)
            {
                let p=new CSMP([],null);
                p.ImportJSON(json);
                this.PushPattern(p);
                //this.mPattern.push(p);
            }
        }
        else//json
        {
            let p=new CSMP([],null);
            p.ImportJSON(_p);
            this.PushPattern(p);
            //this.mPattern.push(p);

        }
        
    }

    PatternUpdate()
    {
        if(this.mExcuteList.Size()!=0)  return;
        this.mUpdateOffset++;
        for(let pat of this.mPattern)
        {
            
            if(pat.IsCondition(this.mState))
            {
                for(let ac of pat.mExcute)
                    this.mExcuteList.Push(ac);
            }
        }
    }
    async ExcuteListUpdate(_target,_delay,_async=false)
    {
        if(this.mExcuteLock!=null)  return;

        for(let i=0;i<this.mExcuteList.Size();++i)
        {
            this.mExcuteLock=this.mExcuteList.Find(i);
            if(_async)
            {
                await this.mExcuteLock.Excute(_target,_delay,this.mUpdateOffset,_async)
            }
            else
                this.mExcuteLock.Excute(_target,_delay,this.mUpdateOffset);
        }
        this.mExcuteList.Clear();
        this.mExcuteLock=null;
    }
}
