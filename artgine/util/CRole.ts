
import { CUpdate } from "../basic/Basic.js";

import { CJSON } from "../basic/CJSON.js";
import { CObject } from "../basic/CObject.js";
import { CAction } from "./CAction.js";
import { CCondition } from "./CCondition.js";


//pattern
export class CRole extends CObject
{
    constructor(_and : CCondition|Array<CCondition>=null,_ex : CAction|Array<CAction>=null)
    {
        super();
        if(_and==null){}
        else if(_and instanceof Array)
            this.mAnd=_and;
        else
            this.mAnd.push(_and);    
        if(_ex==null){}
        else if(_ex instanceof Array)
            this.mExecute=_ex;
        else
            this.mExecute.push(_ex);    

    }
    mPriority : number=10000;
    // true면 이 룰이 조건 성립해서 실행된 뒤, 같은 틱(CRoleMgr.Update 한 번) 안에서 배열의 나머지(더 낮은
    // 우선순위) 룰 평가를 중단한다. 기본값 false라 이 필드를 안 쓰는 기존 룰들의 동작(조건 맞는 룰을 전부
    // 실행)은 그대로 유지된다 — 배타적(하나만 실행) 상태 전환이 필요한 곳에서만 명시적으로 true를 준다.
    mBreak : boolean=false;
    mAnd =new Array<CCondition>;
    mOr =new Array<CCondition>;
    mExecute=new Array<CAction>;
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
        this.mBreak=json["mBreak"]==null?(json["break"]??false):json["mBreak"];


        let exe=json["mExcute"]==null?json["exe"]:json["mExcute"];
        if(exe!=null)
        {
            for(let ac of exe)
            {
                let sma=new CAction(null,null);
                sma.ImportJSON(ac);
                this.mExecute.push(sma);
            }
        }
        return this;
    }
    IsCondition(_state : CObject)
    {
        let execute=true;
        for(let con of this.mAnd)
        {
            if(con.Excute(_state)==false)  
            {
                execute=false;
                break;
            }
                
        }
        if(execute==false)   return false;

        execute=this.mOr.length==0;
        for(let con of this.mOr)
        {
            if(con.Excute(_state)==true)
            {
                execute=true;
                break;
            }
        }

        return execute;
    }
}
//특정 상태를 변경하는 인터페이스 문자열로 값을 0/1로 사용됌 rigidBody/force/move1 이런식
export interface IProvider
{
    Provider(_type : string,_state : Array<string>);
}
export class CRoleMgr extends CObject
{
    mRoleArr=new Array<CRole>;
    mType="";
    mStateArr=new Array<string>;

    constructor()
    {
        super();
        
    }
    // override IsShould(_member: string, _type: CObject.eShould): boolean {
    //     if(_member=="mExecuteList" || _member=="mExecuteSet" || _member=="mExecuteLock")
    //         return false;
    //     return super.IsShould(_member,_type);
    // }
    
    GetType(){  return this.mType;  }
    SetStateValue(_key : string,_value,_temp=true)
    {
        if(_temp)
            this.Temp(_key,_value)
        else
            this[_key]=_value;
    }
    PushRole(_p : CRole|Object|Array<Object>)
    {
        if(_p instanceof CRole)
        {
            for(let i=0;i<this.mRoleArr.length;++i)
            {
                if(this.mRoleArr[i].mPriority<_p.mPriority)
                {
                    this.mRoleArr.splice(i,0,_p);
                    break;
                }
            }
            this.mRoleArr.push(_p);
        }
        else if(_p instanceof Array)
        {
            for(let json of _p)
            {
                let p=new CRole([],null);
                p.ImportJSON(json);
                this.PushRole(p);
                //this.mPattern.push(p);
            }
        }
        else//json
        {
            let p=new CRole([],null);
            p.ImportJSON(_p);
            this.PushRole(p);
            //this.mPattern.push(p);

        }
        
    }

  
    async Update(_update : CUpdate,_target : IProvider)
    {
        let stateArr=[];
        _target.Provider(this.mType,this.mStateArr);

        for(let key of this.mStateArr)
        {
            this.Temp(key,1);
        }
        

        for(let pat of this.mRoleArr)
        {

            if(pat.IsCondition(this))
            {
                for(let ac of pat.mExecute)
                {
                    ac.Excute(_target,false,null,null,"",_update);
                }
                if(pat.mBreak)  break;
            }
        }
        for(let key of this.mStateArr)
        {
            this.Temp(key,0);
        }
        this.mStateArr.length=0;
    }
}
