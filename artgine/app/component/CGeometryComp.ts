import { CUpdate, IAutoFixed } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CObject } from "../../basic/CObject.js";
import { COctreeMgr } from "../../geometry/COctree.js";
import { CPlane } from "../../geometry/CPlane.js";
import { CFrame } from "../../util/CFrame.js";
import { CRayMouse } from "../CRayMouse.js";
import { CComponent } from "./CComponent.js";


export class CGeometryInfo implements IAutoFixed
{
    //public m_ray = new Array<CRayMouse>();
    //public m_plane : CPlane= null;
    public mRay=new Map<string,Array<CRayMouse>>();
    public mPlane=new Map<string,CPlane>();
    public mOctree:COctreeMgr=new COctreeMgr();
    public mFixedComp=new CArray<CComponent>();
    constructor(_frame : CFrame)
    {
       
        if(_frame!=null && _frame.PF().mIAuto)	_frame.PushIAuto(this);
    }
    Fixed(_update : CUpdate) : void
    {
        this.mFixedComp.Sort((a:CComponent,b:CComponent)=>{return a.mSysc-b.mSysc;})
        const count=_update.FixedCount();
        for(let i=0;i<count;++i)
        {
            for(let j=0;j<this.mFixedComp.Size();++j)
            {
                let comp=this.mFixedComp.Find(j);
                //Destroy()된 서브젝트는 WASM 월드행렬을 즉시 해제하므로, 이번 프레임에 이미 등록된 컴포넌트라도 건너뛴다
                if(comp.IsDestroy())    continue;
                comp.Fixed(_update);
            }
            for(let j=0;j<this.mFixedComp.Size();++j)
            {
                let comp=this.mFixedComp.Find(j);
                if(comp.IsDestroy())    continue;
                comp.BuildGI();
            }
            //정적 재빌드 신호(mStaticUpdate→mStaticBuild)는 마지막 서브스텝에서만 넘긴다. 중간에 넘기면
            //다음 서브스텝 Build가 정적 콜라이더가 Insert되기 전에 재빌드해서 빈 정적 트리가 된다.
            const su=this.mOctree.mStaticUpdate;
            if(i<count-1)   this.mOctree.mStaticUpdate=false;
            this.mOctree.Build();
            if(i<count-1)   this.mOctree.mStaticUpdate=su;
        }

        
        this.mFixedComp.Clear();
    
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
    protected mGI : CGeometryInfo=null;

    GetGI() {   return this.mGI;    }
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member=="mGI")   return false;
        return super.IsShould(_member,_type);
    }
    override StartChk(): boolean
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