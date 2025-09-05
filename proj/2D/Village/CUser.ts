import { CBlackBoard } from "https://06fs4dix.github.io/Artgine/artgine/basic/CBlackBoard.js";
import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CBlackBoardRef } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAniFlow.js";
import { CAnimation, CClipCoodi } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAnimation.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CCollider.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CForce.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CRigidBody.js";
import { CSMComp, CSMP, CStateMachine } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CStateMachine.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CPad.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CCamera } from "https://06fs4dix.github.io/Artgine/artgine/render/CCamera.js";
import { CTexture } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CAudioBuf } from "https://06fs4dix.github.io/Artgine/artgine/system/audio/CAudio.js";
import { CCamCon2DFollow } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CCoroutine } from "https://06fs4dix.github.io/Artgine/artgine/util/CCoroutine.js";
import { CFrame } from "https://06fs4dix.github.io/Artgine/artgine/util/CFrame.js";
import { CScript } from "https://06fs4dix.github.io/Artgine/artgine/util/CScript.js";
import { CShadowPlane } from "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js";

export class CUser extends CSubject
{
    mRB : CRigidBody;
    mAF : CAniFlow;
    mPT : CPaint2D;
    mCL : CCollider;
    mBDir : CVec3=new CVec3();
    m2DCam=new CBlackBoardRef<CCamera>("2D");
    mAniMap=new Map<string,CAnimation>();
    constructor()
    {
        super();
        
    }
    Start()
    {
        this.mPT=this.PushComp(new CPaint2D("Res/Actor/Villager5/SeparateAnim/Walk.png",new CVec2(100,100)));
        this.mPT.mSave=false;
        this.mPT.mAutoLoad.mFilter=CTexture.eFilter.Neaest;
        this.mPT.SetYSort(true);
        this.mPT.SetYSortOrigin(-50);
        this.PushChild(new CPad()).mSave=false;
        this.mRB=this.PushComp(new CRigidBody());
        this.mRB.mSave=false;
        this.mRB.SetRestitution(1);
        this.mSave=false;
        this.mCL=this.PushComp(new CCollider(this.mPT));
        this.mCL.mSave=false;
        this.mCL.SetLayer("player");
        this.mCL.PushCollisionLayer("object");
        this.mCL.PushCollisionLayer("player");
        
        this.PushComp(new CShadowPlane());
        
        let sm = this.PushComp(new CSMComp());

        sm.GetSM().PushPattern([
            {
                "and":[{"s":"Last"+CVec3.eDir.Null,"o":"==","v":1}],
                "exe":[{"t":"Message","a":"ResetAnimation","p":["StandLeft"]}]
            },
            {
                "and":[{"s":"move"+CVec3.eDir.Left,"o":"==","v":1}],
                "exe":[{"t":"Message","a":"MoveLeft"}]
            },
            {
                "and":[{"s":"move"+CVec3.eDir.Right,"o":"==","v":1}],
                "exe":[{"t":"Message","a":"MoveRight"}]
            },
            {
                "and":[{"s":"move"+CVec3.eDir.Up,"o":"==","v":1}],
                "exe":[{"t":"Message","a":"MoveUp"}]
            },
            {
                "and":[{"s":"move"+CVec3.eDir.Down,"o":"==","v":1}],
                "exe":[{"t":"Message","a":"MoveDown"}]
            },
            {
                "and":[{"s":"Last"+CVec3.eDir.Left,"o":"==","v":1},{"s":"move","o":"!=","v":1}],
                "exe":[{"t":"Message","a":"StandLeft"}]
            },
            {
                "and":[{"s":"Last"+CVec3.eDir.Right,"o":"==","v":1},{"s":"move","o":"!=","v":1}],
                "exe":[{"t":"Message","a":"StandRight"}]
            },
            {
                "and":[{"s":"Last"+CVec3.eDir.Up,"o":"==","v":1},{"s":"move","o":"!=","v":1}],
                "exe":[{"t":"Message","a":"StandUp"}]
            },
            {
                "and":[{"s":"Last"+CVec3.eDir.Down,"o":"==","v":1},{"s":"move","o":"!=","v":1}],
                "exe":[{"t":"Message","a":"StandDown"}]
            },
        ]);


        let ani=new CAnimation();
        ani.Push(new CClipCoodi(0,0,0,0,16,16));
        this.mAniMap.set("StandDown",ani);

        ani=new CAnimation();
        ani.Push(new CClipCoodi(0,0,1*16,0,2*16,16));
        this.mAniMap.set("StandUp",ani);

        ani=new CAnimation();
        ani.Push(new CClipCoodi(0,0,2*16,0,3*16,16));
        this.mAniMap.set("StandLeft",ani);

        ani=new CAnimation();
        ani.Push(new CClipCoodi(0,0,3*16,0,4*16,16));
        this.mAniMap.set("StandRight",ani);


        let tick=100;

        ani=new CAnimation();
        for(let i=0;i<4;++i)    ani.Push(new CClipCoodi(i*tick,tick,0,i*16,16,(1+i)*16));
        this.mAniMap.set("MoveDown",ani);

        ani=new CAnimation();
        for(let i=0;i<4;++i)    ani.Push(new CClipCoodi(i*tick,tick,1*16,i*16,2*16,(1+i)*16));
        this.mAniMap.set("MoveUp",ani);

        ani=new CAnimation();
        for(let i=0;i<4;++i)    ani.Push(new CClipCoodi(i*tick,tick,2*16,i*16,3*16,(1+i)*16));
        this.mAniMap.set("MoveLeft",ani);

        ani=new CAnimation();
        for(let i=0;i<4;++i)    ani.Push(new CClipCoodi(i*tick,tick,3*16,i*16,4*16,(1+i)*16));
        this.mAniMap.set("MoveRight",ani);

        

        this.mAF=this.PushComp(new CAniFlow(ani));
        this.mAF.mSave=false;
        
    }
    ResetAnimation(_key)
    {
        this.mAF.ResetAni(this.mAniMap.get(_key));
    }
    StandLeft()
    {
        this.mAF.ResetAni(this.mAniMap.get("StandLeft"));
    }
    StandRight()
    {
        this.mAF.ResetAni(this.mAniMap.get("StandRight"));
    }
    StandUp()
    {
        this.mAF.ResetAni(this.mAniMap.get("StandUp"));
    }
    StandDown()
    {
        this.mAF.ResetAni(this.mAniMap.get("StandDown"));
    }
    MoveLeft()
    {
        this.mAF.ResetAni(this.mAniMap.get("MoveLeft"));
    }
    MoveRight()
    {
        this.mAF.ResetAni(this.mAniMap.get("MoveRight"));
    }
    MoveUp()
    {
        this.mAF.ResetAni(this.mAniMap.get("MoveUp"));
    }
    MoveDown()
    {
        this.mAF.ResetAni(this.mAniMap.get("MoveDown"));
    }
    Update(_delay: number): void 
    {
        super.Update(_delay);
        if(this.FindChild(CPad)==null)  return;
        let dir = this.FindChild(CPad).GetDir();
        
        

        if (dir.IsZero()==false)
        {
            if(this.mBDir.Equals(dir)==false)
                this.mRB.Push(new CForce("move", dir, 400));
            CScript.Action([this],()=>{
                let audio=new CAudioBuf("Res/sound/jute-dh-steps/stepdirt_2.wav");
                audio.Volume(0.5);
                audio.Play();
            },0,0.3);
        }
        else
        {
            this.mRB.Remove("move");
            this.mBDir.Zero();
        }
        let camcon=this.m2DCam.Ref().GetCamCon() as CCamCon2DFollow;
        camcon.SetPos(this.GetPos());
    }
    // *StepSound()
    // {
        
    //     yield CCoroutine.Wait(500);
    // }
}