import CBehavior from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CBehavior.js";
import { CComponent } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CComponent.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CForce.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CRigidBody.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CPad.js";
import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CPlane } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CPlane.js";
import { CPlaneInside } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CPlaneInside.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";

export class CMoveComp extends CBehavior
{
    constructor()
    {
        super();
        this.mSysc=CComponent.eSysn.First;
    }
    m_input ="";
    m_rb : CRigidBody=null;
    m_pad : CPad=null;
    m_lastDir=new CVec3();
    //m_isMove=false;

   
 
    Start()
    {
        
        this.m_rb=this.GetOwner().FindComp(CRigidBody);
        

    }
    MovePro(_key : string)
    {
        if(this.m_pad==null)
        {
            this.m_pad=this.GetOwner().FindChild(CPad);
            if(this.m_pad==null)    return;
        }
        if(this.m_rb==null)
        {
            let pos=this.GetOwner().GetPos();
            if(this.m_pad.GetDir().Equals(CVec3.Up()))
                this.GetOwner().SetPos(CMath.V3AddV3(pos,new CVec3(0,10,0)));
            if(this.m_pad.GetDir().Equals(CVec3.Down()))
                this.GetOwner().SetPos(CMath.V3AddV3(pos,new CVec3(0,-10,0)));
            if(this.m_pad.GetDir().Equals(CVec3.Right()))
                this.GetOwner().SetPos(CMath.V3AddV3(pos,new CVec3(10,0,0)));
            if(this.m_pad.GetDir().Equals(CVec3.Left()))
                this.GetOwner().SetPos(CMath.V3AddV3(pos,new CVec3(-10,0,0)));
        }
        else
        {
            let dir=this.m_pad.GetDir();

            if(this.m_lastDir.Equals(dir)==false)
            {
                this.m_rb.Clear();
                if(dir.IsZero()==false)
                    this.m_rb.Push(new CForce("move",dir,400));

                this.m_lastDir.Import(dir);
                //this.GetOwner().PushPac(CPac.Pos(this.GetOwner().Key(),this.GetOwner().GetPos(),dir));
            }
                
            
        }
        
        
    }

    Update(_delay: number): void {
        super.Update(_delay);

        this.m_input="";
        
        // if(this.m_pad.GetDir().Equals(CVec3.GetUp2D()))
        //     this.m_input+="W";
        // if(this.m_pad.GetDir().Equals(CVec3.GetDown2D()))
        //     this.m_input+="S";
        // if(this.m_pad.GetDir().Equals(CVec3.GetRight2D()))
        //     this.m_input+="D";
        // if(this.m_pad.GetDir().Equals(CVec3.GetLeft2D()))
        //     this.m_input+="A";

        this.MovePro(this.m_input);

    }
    CameraOut(_pArr : Array<CPlaneInside>)
    {
        if(_pArr==null)
            return;
        var size=(this.GetOwner().GetCPaintVec()[0] as CPaint2D).GetSize().Export();
        size.x*=this.GetOwner().GetSca().x;
        size.y*=this.GetOwner().GetSca().y;
        var pos=this.GetOwner().GetPos().Export();
        //CConsol.Log(_len+"/"+_plane);

      
        for(var each0 of _pArr)
        {
            //CConsol.Log((each0.m_len)*size.x);
            switch(each0.mPlane)
            {
                case CPlane.eDir.Left:
                    pos.x+=(1+each0.mLen)*size.x*0.5;
                    break;
                case CPlane.eDir.Right:
                    pos.x-=(1+each0.mLen)*size.x*0.5;
                    break;
                case CPlane.eDir.Top:
                    pos.y+=(1+each0.mLen)*size.y*0.5;
                    break;
                case CPlane.eDir.Bottom:
                    pos.y-=(1+each0.mLen)*size.y*0.5;
                    break;
            }
        }
        
        this.GetOwner().SetPos(pos);
        
    }
}