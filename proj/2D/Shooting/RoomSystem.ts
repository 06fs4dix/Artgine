import { CCanvas } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCanvas.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CUpdate } from "https://06fs4dix.github.io/Artgine/artgine/basic/Basic.js";
import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CBlackBoardRef } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js";
import { CUniqueID } from "https://06fs4dix.github.io/Artgine/artgine/basic/CUniqueID.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";
import { CProComp } from "./CProComp.js";


export class RoomSystem extends CSubject {
    
    mMon = new CBlackBoardRef<CSubject>("Monster");
    mMain = new CBlackBoardRef<CCanvas>("Main");

    

    mPTime=0;
    mPType=0;
    mTime=0;
    mState=0;
    mCCount=0;
    mMonKey=0;
    mLevel=1;
    mLTime=10;
    override Start() { }

    override Update(_update : CUpdate): void 
    {
        
        let ResetFun=()=>{
            this.mTime=0;
            this.mState=-1;
            this.mPTime=0;
            this.mCCount=0;
        };
        this.mLTime+=_update.DeltaTime();
        this.mPTime+=_update.DeltaTime();
        if(this.mLTime>10)
        {
            this.mLevel+=1;
            this.mLTime=0;
        }
        if(this.mPType==0)
        {
            if(this.mPTime>2)   
            {
                ResetFun();
                this.mPType=Math.trunc(Math.random()*2+1);
            }
        }
        else if(this.mPType==1)
        {
            

            if(this.mTime<=0)
            {

                let ran=Math.trunc(Math.random()*16-10);

                for(let i=-9;i<=9;++i)
                {
                    if(i>=ran && i<=ran+3)  continue;
                    let key=this.mMonKey+"mon";
                    this.mMonKey++
                    this.PushPacket(CPacShooting.MonCreate(key, new CVec3(i*32,500), this.mLevel));
                }
                
                this.mTime=2;
            }
            if(this.mPTime>10)   
            {
                ResetFun();
                this.mPType=0;
            }
            

            this.mTime-=_update.DeltaTime();
        }
        else if(this.mPType==2)
        {
            

            if(this.mTime<=0)
            {
                if(this.mState==-1)
                    this.mState=Math.trunc(Math.random()*19-10);
                

                let logStr=this.mState+" / "+this.mCCount;
                


                for(let i=0;i<3;++i)
                {
                    let key=this.mMonKey+"mon";
                    this.mMonKey++
                    logStr+=" "+key;
                    
                    this.PushPacket(CPacShooting.MonCreate(key, new CVec3((this.mState+i)*32,500), this.mLevel));
                }
                //CConsol.Log(logStr);
                this.mTime=0.5;
                this.mCCount++;

                if(this.mCCount>=3)
                {
                    this.mState=-1;
                    this.mCCount=0;
                }
            }
            if(this.mPTime>10)   
            {
                ResetFun();
                this.mPType=0;
            }
            

            this.mTime-=_update.DeltaTime();
        }

    }

    
    // MonCreate(_monKey: string, pos: CVec3, _type: string) {
    //     const mon = this.mMon.Ref().Export(true, true) as CSubject;
    //     mon.SetKey(_monKey);
    //     mon.SetPos(pos);
    //     mon.FindComp(CProComp).SetHP(10+this.mLevel*5);
    //     this.mMain.Ref().PushSub(mon);
    // }
}
