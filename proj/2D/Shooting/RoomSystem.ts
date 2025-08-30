import { CBlackBoardRef } from "../../../artgine/basic/CObject.js";
import { CUniqueID } from "../../../artgine/basic/CUniqueID.js";
import { CCanvas } from "../../../artgine/canvas/CCanvas.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";


export class RoomSystem extends CSubject
{
    mTime=0;
    mMon=new CBlackBoardRef<CSubject>("Monster");
    mMain=new CBlackBoardRef<CCanvas>("Main");
    mTick=0;
    
    Start() 
    {

    }
    Update(): void {
        let delay=this.GetFrame().Delay();
        this.mTime+=delay;
        this.mTick+=delay;

        if(this.mTick>1000)
        {
            this.mTick=0;
            this.PushPac(CPacShooting.MonCreate(CUniqueID.GetHash(),new CVec3(Math.random()*600-300,500,0),"basic"));
        }

    }
    MonCreate(_monKey : string,pos : CVec3,_type)
    {
        let mon=this.mMon.Ref().Export(true,true) as CSubject;
        mon.SetKey(_monKey);
        mon.SetPos(pos);
        this.mMain.Ref().PushSub(mon);
    }
}