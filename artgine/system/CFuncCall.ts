import { CObject } from "../basic/CObject.js";

export class CFuncCall extends CObject
{
    constructor(_name : string,_para : any);
    constructor(_name : string,_para : Array<any>);
    constructor(_name : string,_para : any)
    {
        super();
        this.mName=_name;
        if(_para instanceof Array) {
            for(let i = 0; i < _para.length; i++) {
                if(_para[i] instanceof Array) {
                    _para[i] = JSON.stringify(_para[i]);
                }
            }
        }
        this.mParameter=_para;
    }
    public mName="";
    public mParameter=null;

    CmdToString() {
        let str = "(";
        for(let para of this.mParameter) {
            if(typeof(para) == "string" && para.startsWith("[") == false) {
                str += `"${para}",`;
            }
            else {
                str += para + ",";
            }
        }
        if(this.mParameter.length > 0) {
            str = str.substring(0, str.length - 1);
        }
        str += ")";
        return str;
    }
}