import { CRouteMsg } from "../app/CRouteMsg.js";
import { CClass } from "../basic/CClass.js";
import { CEvent } from "../basic/CEvent.js";
import { CJSON } from "../basic/CJSON.js";
import { CObject } from "../basic/CObject.js";
import { CTimer } from "../system/CTimer.js";
import { CSamplerTimer } from "./CSampler.js";

//condition
export class CCondition extends CObject
{
    constructor(_state : string|{s}|{s,v}|{s,v,o},_op : string="==",_value : any=1)
    {
        super();
        this.mOperator=_op==null?"==":_op;
        this.mValue=_value==null?1:_value;

        if(_state==null)    {}
        else if(typeof _state=="number")
        {
            this.mState=_state+"";
        }
        else if(typeof _state=="string")
        {
            this.mState=_state;
        }
        else
        {
            this.ImportJSON(_state);
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
        if(st==null && typeof this.mValue =="number")   st=0;
        if(this.mOperator=="==")    return st==this.mValue;
        if(this.mOperator=="!=")    return st!=this.mValue;
        if(this.mOperator=="<=")    return st<=this.mValue;
        if(this.mOperator==">=")    return st>=this.mValue;
        if(this.mOperator=="<")    return st<this.mValue;
        if(this.mOperator==">")    return st>this.mValue;
        

        return true;
    }
    override ImportCJSON(_json: CJSON): this {
        let json=_json.mDocument;
        this.mState=json["mState"]==null?json["s"]:json["mState"];
        if(typeof this.mState=="number")
            this.mState=this.mState+"";
        this.mOperator=json["mOperator"]==null?json["o"]:json["mOperator"];
        if(this.mOperator==null)    this.mOperator="==";
        this.mValue=json["mValue"]==null?json["v"]:json["mValue"];
        if(this.mValue==null)    this.mValue=1;
        return this;
    }

}
