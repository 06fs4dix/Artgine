


import { CUpdate } from "../../basic/Basic.js";
import { CObject } from "../../basic/CObject.js";
import {CBrush} from "../CBrush.js";
import { CRPAuto } from "../CRPMgr.js";
import { CSubject } from "../subject/CSubject.js";
import {CComponent} from "./CComponent.js";
import { CPaint3D } from "./paint/CPaint3D.js";


export class CBrushComp extends CComponent
{
    constructor(_key : string)
    {
        super();
        this.mSysc=CComponent.eSysn.CamComp;
        this.mTexKey=_key;
       
    }
    public mTexKey:string;
    protected mWrite : Array<CRPAuto>=new Array();
    public mRead : string=null;//텍스쳐 사용하는 페인트들 골라냄 태그를 넣어라
    public mReadLen=10000;
    public mLayer=0;
    mBruch : CBrush=null;

    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member=="mBruch")   return false;
        return super.IsShould(_member,_type);
    }
    GetWrite() { return this.mWrite; }
    GetTex()    {   return this.mTexKey+".tex";   }
    PushRPAuto(_write : CRPAuto)
    {
        this.mWrite.push(_write);
    }
    StartChk(): boolean {
        if(this.mStartChk==true && this.mBruch!=null)
		{
			this.mStartChk=false;
			return true;
		}
        else
        {
            var cm=this.ProductMsg("SendGetBrush");
            cm.mInter="canvas";
            cm.mMsgData[0]=this;
        }
        return false;
    }
    // SetOwner(_obj: any): void {
    //     super.SetOwner(_obj);
    // }
    Update(_update : CUpdate): boolean 
    {
        //브러시 정보는 캔버스에 있어서 받으려고 처리
        //CC->Can->Light,Env
        // if(this.mBruch==null)
        // {
        //     var cm=this.ProductMsg("SendGetBrush");
        //     cm.mInter="canvas";
        //     cm.mMsgData[0]=this;
        //     return true;
        // }
        

        if(this.mRead!=null)
        {
            var cm=this.ProductMsg("CubeMap");
            cm.mIntra=CPaint3D;
            cm.mInter = "";
            cm.mMsgData[0]=this;
        }
        return false;
    }
  
    
    RecvGetBrush(_brush : CBrush) 
    {
        this.mBruch=_brush;
    }
   
}
