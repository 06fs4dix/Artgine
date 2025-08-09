import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAniFlow.js";
import { CAnimation, CClipColorAlpha, CClipDestroy } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAnimation.js";
import CBehavior from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CBehavior.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CCollider.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CForce.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CRigidBody.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CBound } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CBound.js";
import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
import { CH5Canvas } from "https://06fs4dix.github.io/Artgine/artgine/render/CH5Canvas.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CCurve } from "https://06fs4dix.github.io/Artgine/artgine/util/CCurve.js";

export default class CMonster extends CBehavior
{
    m_enemy : CCollider=null;
    m_rp : CRenderPass;
    m_time=0;
    m_monType="";

    constructor(_rp : CRenderPass,_monType="")
    {
        super();
        this.m_rp=_rp;
        this.m_monType=_monType;
    }
    Start(): void {
        let sub=this.GetOwner();
        
        CH5Canvas.Init(128,128);
        CH5Canvas.StrokeStyle("black");
        CH5Canvas.StrokeCircle(64,64,60,8);
        CH5Canvas.FillStyle("green");
        CH5Canvas.FillCircle(64,64, 60);
        CH5Canvas.Draw(null);
        
        let tex=CH5Canvas.GetNewTex();
        sub.GetFrame().Res().Push("circle_mon.tex",tex);
        sub.GetFrame().Ren().BuildTexture(tex);

        
        // let pointLight=new CLight();
        // pointLight.SetColor(new CVec3(1,1,1))
        // pointLight.SetPoint(500,300);
        // sub.PushComp(pointLight);
    
        let pt : CPaint2D;
        if(this.m_monType=="acid_blob")
            pt=sub.PushComp(new CPaint2D("dc-mon/acid_blob.png",new CVec2(32,32))) as CPaint2D;
        else
            pt=sub.PushComp(new CPaint2D("circle_mon.tex",new CVec2(32,32))) as CPaint2D;

        pt.SetPos(new CVec3(0,0,1));
        pt.SetRenderPass(this.m_rp);
        let cl=sub.PushComp(new CCollider(pt)) as CCollider;
        cl.SetLayer("mon");
        cl.PushCollisionLayer(["block","user"]);
    
        let bound=new CBound();
        bound.mMin=new CVec3(-300,-300,-300);
        bound.mMax=new CVec3(300,300,300);
        bound.mType=CBound.eType.Box;
        cl=sub.PushComp(new CCollider(bound));
        cl.SetLayer("monSearch");
        cl.SetTrigger(true);
        cl.PushCollisionLayer("user");
    
        let rb=sub.PushComp(new CRigidBody());
        rb.SetRestitution(2);
    }
    Trigger(_org: CCollider, _size: number, _tar: Array<CCollider>): void {
        this.m_enemy=_tar[0];
    }
    Collision(_org: CCollider, _size: number, _tar: Array<CCollider>, _push: Array<CVec3>): void {

        if(_tar[0].GetLayer()!="user")  return;

        this.m_time=-4000;
        this.GetOwner().FindComp(CRigidBody).Clear();

        
        this.GetOwner().RemoveComps(CAniFlow);
        //this.GetOwner().GetComp(CPaint2D).SetColorModel(new CColor(1,0,0,SDF.eColorModel.RGBAdd));

        let ani=new CAnimation();
        let clip=ani.Push(new CClipColorAlpha(0,4000,new CVec4(0,0,0,0),new CVec4(1,1,1,0)));
        clip.mCurve.mType=CCurve.eType.LinearCoodi;
        clip.mCurve.mPosArr.push(new CVec2(0.15,1));
        clip.mCurve.mPosArr.push(new CVec2(0.3,0));
        clip.mCurve.mPosArr.push(new CVec2(0.45,1));
        clip.mCurve.mPosArr.push(new CVec2(0.6,0));
        clip.mCurve.mPosArr.push(new CVec2(0.75,1));
        clip.mCurve.mPosArr.push(new CVec2(0.9,0));
        clip.mCurve.mPosArr.push(new CVec2(1,0));
        ani.Push(new CClipDestroy(4000));
        //ani.mRemove=true;
        this.GetOwner().PushComp(new CAniFlow(ani));

    }
    Update(_delay: any): void {
        if(this.m_time>200)
        {
            this.m_time=0;
            this.GetOwner().FindComp(CRigidBody).Clear();
            if(this.m_enemy!=null)
            {
                
                
                let dir=CMath.V3SubV3(this.m_enemy.GetOwner().GetPos(),this.GetOwner().GetPos());
                dir=CMath.V3Nor(dir);

                this.GetOwner().FindComp(CRigidBody).Push(new CForce("move",dir,50));
            }
        }
        this.m_time+=_delay;
        this.m_enemy=null;
    }
}