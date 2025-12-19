import { CUpdate, IAutoFixed } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CObject } from "../../basic/CObject.js";
import { COctreeMgr } from "../../geometry/COctree.js";
import { CPlane } from "../../geometry/CPlane.js";
import { CFrame } from "../../util/CFrame.js";
import { CNaviMgr } from "../canvas/CNavigationMgr.js";
import { CRayMouse } from "../CRayMouse.js";
import { CComponent } from "./CComponent.js";

export class CGeometryInfo implements IAutoFixed
{
    //public m_ray = new Array<CRayMouse>();
    //public m_plane : CPlane= null;
    public mRay=new Map<string,Array<CRayMouse>>();
    public mPlane=new Map<string,CPlane>();
    public mNavi : CNaviMgr=null;
    public mOctree:COctreeMgr=new COctreeMgr();
    public mFixedComp=new CArray<CComponent>();
    constructor(_frame : CFrame)
    {
       
        if(_frame!=null && _frame.PF().mIAuto)	_frame.PushIAuto(this);
    }
    Fixed(_update : CUpdate) : void
    {
        this.mFixedComp.Sort((a:CComponent,b:CComponent)=>{return a.mSysc-b.mSysc;})
        for(let i=0;i<_update.FixedCount();++i)
        {
            for(let j=0;j<this.mFixedComp.Size();++j)
            {
                let comp=this.mFixedComp.Find(j);
                comp.Fixed(_update);
            }
            for(let j=0;j<this.mFixedComp.Size();++j)
            {
                let comp=this.mFixedComp.Find(j);
                comp.BuildGI();
            }
            this.mOctree.Build();
        }

        
        this.mFixedComp.Clear();
        if(this.mNavi!=null)
		{
			(this.mNavi as CNaviMgr).Reset(false);
		}
    }
   
}
export class CGeometryComp extends CComponent
{
    constructor()
    {
        super();
        this.mSysc=CComponent.eSysn.CamComp;
    }
    mCanKey="";
    mGI : CGeometryInfo=null;

    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member=="mGI")   return false;
        return super.IsShould(_member,_type);
    }
    StartChk(): boolean
    {
        if(this.mStartChk==true && this.mGI!=null)
		{
			this.mStartChk=false;
			return true;
		}
        else
        {
            var cm=this.ProductMsg("SendGetGeometryInfo");
            cm.mInter="canvas";
            cm.mMsgData[0]=this;
        }
        return false;
    }
   
    RecvGetGeometryInfo(_GI : CGeometryInfo,_key : string) 
    {
        this.mGI=_GI;
        this.mCanKey=_key;
    }

   
}