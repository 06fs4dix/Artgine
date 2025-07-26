


import {CBrush} from "../CBrush.js";
import { CRPAuto } from "../CRPMgr.js";
import {CComponent} from "./CComponent.js";
import { CPaint3D } from "./paint/CPaint3D.js";


export class CCamComp extends CComponent
{
    constructor(_key : string)
    {
        super();
        this.mSysc=CComponent.eSysn.CamComp;
        this.mShadowKey=_key;
       
    }
    public mShadowKey:string;
    protected mWrite : Array<CRPAuto>=new Array();
    public mRead : string=null;//텍스쳐 사용하는 페인트들 골라냄 태그를 넣어라
    public mReadLen=10000;
    public mLayer=0;

    GetWrite() { return this.mWrite; }
    GetTex()    {   return this.mShadowKey+".tex";   }
    PushRPAuto(_write : CRPAuto)
    {
        this.mWrite.push(_write);
    }
    Update(_delay: any): void 
    {
        //브러시 정보는 캔버스에 있어서 받으려고 처리
        //CC->Can->Light,Env
        var cm=this.ProductMsg("CCamCompAck");
        cm.mInter="canvas";
        cm.mMsgData[0]=this;

        if(this.mRead!=null)
        {
            var cm=this.ProductMsg("CubeMap");
            cm.mIntra=CPaint3D;
            cm.mInter = "";
            cm.mMsgData[0]=this;
        }
    }
  
    
    CCamCompReq(_brush : CBrush) 
    {

    }
   
}
