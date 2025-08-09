
import { CBlackBoard } from "https://06fs4dix.github.io/Artgine/artgine/basic/CBlackBoard.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAniFlow.js";
import { CAnimation, CClipColorAlpha, CClipDestroy } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAnimation.js";
import CBehavior from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CBehavior.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CCollider.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CColor.js";
import { CLight } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CLight.js";
import { CNavigation } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CNavigation.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CRigidBody.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CRayMouse } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CRayMouse.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CBound } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CBound.js";
import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
import { CCamera } from "https://06fs4dix.github.io/Artgine/artgine/render/CCamera.js";
import { CH5Canvas } from "https://06fs4dix.github.io/Artgine/artgine/render/CH5Canvas.js";
import { CAudioBuf } from "https://06fs4dix.github.io/Artgine/artgine/system/audio/CAudio.js";
import { CInput } from "https://06fs4dix.github.io/Artgine/artgine/system/CInput.js";
import { CCamCon2DFollow, CCamCon2DFreeMove } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CCamShakeNoise } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamShake.js";
import { CCoroutine } from "https://06fs4dix.github.io/Artgine/artgine/util/CCoroutine.js";
import { SDF } from "https://06fs4dix.github.io/Artgine/artgine/z_file/SDF.js";
import CStage from "./CStage.js";


export default class CUser extends CBehavior
{
    m_ready=true;
    m_move=false;
    m_footTime=0;
    m_lastPos=new CVec3();
    m_camMode=0;
    
    //m_shakeTime=0;
    Start(): void {

        let sub=this.GetOwner();

        CH5Canvas.Init(128,128);
        CH5Canvas.StrokeStyle("black");
        CH5Canvas.StrokeCircle(64,64,60,8);
        CH5Canvas.FillStyle("white");
        CH5Canvas.FillCircle(64,64, 60);
        CH5Canvas.Draw();
        let tex=CH5Canvas.GetNewTex();
        sub.GetFrame().Res().Push("circle.tex",tex);
        sub.GetFrame().Ren().BuildTexture(tex);
        

        
        let pointLight=new CLight();
        pointLight.SetColor(new CVec3(1,1,1))
        pointLight.SetPoint(500,300);
        sub.PushComp(pointLight);
    
    
        let pt=sub.PushComp(new CPaint2D("circle.tex",new CVec2(32,32))) as CPaint2D;
        pt.SetPos(new CVec3(0,0,1));
        let cl=sub.PushComp(new CCollider(pt)) as CCollider;
        //cl.SetPickMouse(true);
        cl.SetLayer("user");
        cl.PushCollisionLayer(["block","mon"]);
    
        cl=sub.PushComp(new CCollider(pt)) as CCollider;
        cl.SetLayer("user");
        cl.SetTrigger(true);
        cl.PushCollisionLayer("endpoint");

        let bound=new CBound();
        bound.mMin=new CVec3(-50,-50,-50);
        bound.mMax=new CVec3(50,50,50);
        bound.mType=CBound.eType.Box;
        cl=sub.PushComp(new CCollider(bound)) as CCollider;
        cl.SetPickMouse(true);

        let navi=new CNavigation();
        navi.InitBound(pt);
        this.GetOwner().PushComp(navi);
        
    
        let rb=sub.PushComp<CRigidBody>(new CRigidBody());
        rb.SetRestitution(15);
        
        
    }
    //m_camSpeed=0.1;
    *ReadyMouse()
    {
        this.GetOwner().FindComp(CPaint2D).SetColorModel(new CColor(1,0,0,CColor.eModel.RGBMul));
        let cam=CBlackBoard.Find("2D") as CCamera;
        let camShake = new CCamShakeNoise();
        cam.SetCamShake(camShake);
        camShake.Shake(1000);
        camShake.Set2D(50);
        cam.SetCamShake(camShake);
        yield CCoroutine.Wait(1000);
        this.m_ready=true;
        this.GetOwner().FindComp(CPaint2D).SetColorModel(new CColor(1,0,0,CColor.eModel.None));

        
    }
    PickMouse(_rayMouse : CRayMouse)
    {
        let mouse=this.GetOwner().GetFrame().Input().Mouse();
        let cam=CBlackBoard.Find("2D") as CCamera;
        let npos=cam.ScreenToWorldPoint(mouse.x,mouse.y);
        let pos=this.GetOwner().GetPos();

        if(this.GetOwner().GetFrame().Input().KeyDown(CInput.eKey.LButton) && this.m_ready==true && 
            CBlackBoard.Find("RayExtrapolate")(pos,npos,this.GetOwner())==false)
        {
            this.m_move=true;
        }
    }
    CamInit(_type)
    {
        let cam=CBlackBoard.Find("2D") as CCamera;
        let camcon=cam.GetCamCon();
        let fw=this.GetOwner().GetFrame();
        if(_type==0 && (camcon instanceof CCamCon2DFollow)==false)
        {
            let user=CBlackBoard.Find("User") as CSubject;
            let camcon=new CCamCon2DFollow(fw.Input());
            cam.SetCamCon(camcon);
            camcon.SetPosKey(CInput.eKey.LButton);
            camcon.SetRotKey(CInput.eKey.RButton);
            //camcon.m_smoothSpeed=Number(CWebUtil.IDValue("trakingSpeed"));
        }
        else if(_type==1 && (camcon instanceof CCamCon2DFreeMove) ==false)
        {
            let camcon=new CCamCon2DFreeMove(fw.Input());
            cam.SetCamCon(camcon);
            camcon.SetPosKey(CInput.eKey.LButton);
            camcon.SetRotKey(CInput.eKey.RButton);
        }

    }
    Update(_delay: any): void {
        super.Update(true);

        let cam=CBlackBoard.Find("2D") as CCamera;
        if(cam.GetCamCon() instanceof CCamCon2DFollow)
        {
            let camcon=cam.GetCamCon() as CCamCon2DFollow;
            camcon.SetPos(this.GetOwner().GetPos());
        }

        if(this.GetOwner().GetFrame().Input().KeyDown(CInput.eKey.LButton)==true && this.m_move==true)
        {
            if(this.m_camMode==0)
                cam.SetCamCon(null);
        }
        if(this.GetOwner().GetFrame().Input().KeyDown(CInput.eKey.LButton)==false)
        {
            if(this.m_camMode==0)
                this.CamInit(0);
            this.m_move=false;
        }
            
        if(this.m_move)
        {
            let mouse=this.GetOwner().GetFrame().Input().Mouse();
            let cam=CBlackBoard.Find("2D") as CCamera;
            let npos=cam.ScreenToWorldPoint(mouse.x,mouse.y);
            let pos=this.GetOwner().GetPos();
            
            if(CBlackBoard.Find("RayExtrapolate")(pos,npos,this.GetOwner())==false)
            {
                this.GetOwner().SetPos(cam.ScreenToWorldPoint(mouse.x,mouse.y));
            }
            else
            {
                if(this.m_camMode==0)
                    this.CamInit(0);
                this.m_move=false;
                this.m_ready=false;
                new CCoroutine(this.ReadyMouse,this).Start();

                let audio=new CAudioBuf("Hit_Hurt.mp3");
                audio.SetRemove(true);
                audio.Play();

                

            }
            
            
        }

        this.m_footTime+=_delay;
        if(CMath.V3Distance(this.m_lastPos,this.GetOwner().GetPos())>50 || this.m_footTime>500)
        {
            this.m_lastPos.Import(this.GetOwner().GetPos());
            let ptb=this.GetOwner().FindComp(CPaint2D);

            let ch=new CSubject();
            ch.mPMatMul=false;
            let pt=ch.PushComp(new CPaint2D(ptb.GetTexture()[0],ptb.GetSize())) as CPaint2D;
            pt.SetColorModel(new CColor(0,0,1,SDF.eColorModel.RGBMul));
            ch.SetPos(this.m_lastPos);
            this.GetOwner().PushChilde(ch);
            let ani=new CAnimation();
            ani.Push(new CClipColorAlpha(0,1000*15,new CVec4(-1,-1,1,-0.5),new CVec4(-1,-1,1,-1)));
            ani.Push(new CClipDestroy(1000*15));
            ch.PushComp(new CAniFlow(ani));
            this.m_footTime=0;
        }


        if(this.GetOwner().GetFrame().Input().KeyUp(CInput.eKey.J))
        {
            let mouse=this.GetOwner().GetFrame().Input().Mouse();
            let cam=CBlackBoard.Find("2D") as CCamera;
            let npos=cam.ScreenToWorldPoint(mouse.x,mouse.y);

            CBlackBoard.Find("FindPath")(this.GetOwner(),npos);
        }

    }
    Collision(_org : CCollider,_size : number,_tar : Array<CCollider>,_push : Array<CVec3>)
    {
        let audio=new CAudioBuf("Hit_Hurt.mp3");
        audio.SetRemove(true);
        audio.Play();
        this.m_move=false;
        this.m_ready=false;
        new CCoroutine(this.ReadyMouse,this).Start();

        

        let ch=new CSubject();
        ch.mPMatMul=false;
        let ptb=this.GetOwner().FindComp(CPaint2D);
        let pt=ch.PushComp(new CPaint2D(ptb.GetTexture()[0],ptb.GetSize())) as CPaint2D;
        pt.SetColorModel(new CColor(0,0,1,SDF.eColorModel.RGBMul));
        ch.SetPos(this.m_lastPos);
        this.GetOwner().PushChilde(ch);
        let ani=new CAnimation();
        ani.Push(new CClipColorAlpha(0,1000*10,new CVec4(1,-1,-1,-0.5),new CVec4(1,-1,-1,-1)));
        ani.Push(new CClipDestroy(1000*10));
        ch.PushComp(new CAniFlow(ani));

    }
    Trigger(_org : CCollider,_size : number,_tar : Array<CCollider>)
    {
        if(this.m_move==false)
        {
            //this.m_move=false;
            CStage.LevelUp();
            CBlackBoard.Find("ResetMaze")(11,11);
            
        }
    }
}
document.body.style.backgroundColor='#000000;';