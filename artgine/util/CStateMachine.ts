import { CRouteMsg } from "../app/CRouteMsg.js";
import { CArray } from "../basic/CArray.js";
import { CClass } from "../basic/CClass.js";
import { CJSON } from "../basic/CJSON.js";
import { CObject } from "../basic/CObject.js";
import { CAction } from "./CAction.js";
import { CCondition } from "./CCondition.js";
import { CSamplerTimer } from "./CSampler.js";



//pattern
export class CSMP extends CObject
{
    constructor(_and : CCondition|Array<CCondition>,_ex : CAction|Array<CAction>)
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
    mAnd =new Array<CCondition>;
    mOr =new Array<CCondition>;
    mExcute=new Array<CAction>;
    override ImportCJSON(_json: CJSON): this {
        let json=_json.mDocument;
        let and=json["mAnd"]==null?json["and"]:json["mAnd"];
        if(and!=null)
        {
            this.mAnd.length=0;
            for(let con of and)
            {
                let SMC=new CCondition(null);
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
                let SMC=new CCondition(null);
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
                let sma=new CAction(null,null);
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
    mState : CObject;
    private mExcuteList=new CArray<CAction>();
    private mExcuteSet=new Set<CAction>();
    private mExcuteLock : CAction=null;
    
    constructor(_state=new CObject())
    {
        super();
        this.mState=_state;
    }
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member=="mState" || _member=="mExcuteList" || _member=="mExcuteSet" || _member=="mExcuteLock")
            return false;
        return super.IsShould(_member,_type);
    }
    SetState(_state : CObject){ this.mState=_state; }
    //GetState(){ return this.mState; }
    SetStateValue(_key : string,_value,_temp=true)
    {
        if(_temp)
        {
            if(this.mState["mTemp"]==null)this.mState["mTemp"]={};
            this.mState["mTemp"][_key]=_value;
        }
            
        else
            this.mState[_key]=_value;
    }
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

        for(let pat of this.mPattern)
        {
            
            if(pat.IsCondition(this.mState))
            {
                for(let ac of pat.mExcute)
                {
                    this.mExcuteList.Push(ac);
                    this.mExcuteSet.delete(ac);
                }
                    
                
            }
        }
        for(let action of this.mExcuteSet)
        {
            action.Reset();
        }
        this.mExcuteSet.clear();
    }
    async ExcuteListUpdate(_target,_async=false)
    {
        if(this.mExcuteLock!=null)  return;

        for(let i=0;i<this.mExcuteList.Size();++i)
        {
            this.mExcuteLock=this.mExcuteList.Find(i);
            if(_async)
            {
                await this.mExcuteLock.Excute(_target,_async)
            }
            else
                this.mExcuteLock.Excute(_target);
            this.mExcuteSet.add(this.mExcuteLock);
        }
        
        this.mExcuteList.Clear();
        this.mExcuteLock=null;
    }
}
