import { CModal } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CBlackBoardRef } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAniFlow.js";
import { CAnimation, CClipCoodi } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAnimation.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CCollider.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CRigidBody.js";
import { CSMPattern, CStateMachine } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CStateMachine.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CRayMouse } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CRayMouse.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CTexture } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CInput } from "https://06fs4dix.github.io/Artgine/artgine/system/CInput.js";
import { CShadowPlane } from "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js";


export class CNPC extends CSubject
{
    mRB : CRigidBody;
    mAF : CAniFlow;
    mPT : CPaint2D;
    mCL : CCollider;
    mBDir : CVec3=new CVec3();
    mAniMap=new Map<string,CAnimation>();
    mBaseImage="";
    mName="";
    constructor(_name,_baseImg : string)
    {
        super();
        this.mBaseImage=_baseImg;
        this.mName=_name;
    }
    Start()
    {
        this.mPT=this.PushComp(new CPaint2D(this.mBaseImage,new CVec2(100,100)));
        this.mPT.mSave=false;
        this.mPT.mAutoLoad.mFilter=CTexture.eFilter.Neaest;
        this.mPT.SetYSort(true);
        this.mPT.SetYSortOrigin(-50);
        this.mRB=this.PushComp(new CRigidBody());
        this.mRB.mSave=false;
        this.mRB.SetRestitution(0);
        this.mSave=false;
        this.mCL=this.PushComp(new CCollider(this.mPT));
        this.mCL.mSave=false;
        this.mCL.SetLayer("player");
        this.mCL.PushCollisionLayer("object");
        this.mCL.PushCollisionLayer("player");
        this.mCL.SetPickMouse(true);
        
        this.PushComp(new CShadowPlane());
        
        
        let sm = this.PushComp(new CStateMachine());

        sm.PushPattern(new CSMPattern("StandLeft", [], []));
        sm.PushPattern(new CSMPattern("StandLeft", ["Last"+CVec3.eDir.Left], ["move"]));
        sm.PushPattern(new CSMPattern("StandRight", ["Last"+CVec3.eDir.Right], ["move"]));
        sm.PushPattern(new CSMPattern("StandUp", ["Last"+CVec3.eDir.Up], ["move"]));
        sm.PushPattern(new CSMPattern("StandDown", ["Last"+CVec3.eDir.Down], ["move"]));

        sm.PushPattern(new CSMPattern("MoveLeft", ["move"+CVec3.eDir.Left], []));
        sm.PushPattern(new CSMPattern("MoveRight", ["move"+CVec3.eDir.Right], []));
        sm.PushPattern(new CSMPattern("MoveUp", ["move"+CVec3.eDir.Up], []));
        sm.PushPattern(new CSMPattern("MoveDown", ["move"+CVec3.eDir.Down], []));

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
    PickMouse(_rayMouse : CRayMouse)
    {
        if(this.GetFrame().Input().KeyUp(CInput.eKey.LButton))
        {
            // 모달창 생성
            let modal = new CModal("NPCModal");
            modal.SetTitle(CModal.eTitle.TextFullClose);
            modal.SetHeader(this.mName);
            modal.SetBody("안녕");
            modal.SetSize(400, 300);
            modal.Open();
        }
        
    }
   

}