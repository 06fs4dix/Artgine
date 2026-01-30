import { CUpdate, IListener } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CClass } from "../../basic/CClass.js";
import { CConsol } from "../../basic/CConsol.js";
import { CEvent } from "../../basic/CEvent.js";
import { CObject } from "../../basic/CObject.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CStateMachine } from "../../util/CStateMachine.js";
import { CRouteMsg } from "../CRouteMsg.js";
import { CAniFlow } from "./CAniFlow.js";
import { CAnimation } from "./CAnimation.js";
import { CComponent } from "./CComponent.js";
import { CRigidBody } from "./CRigidBody.js";


export class CSMComp extends CComponent
{
    mSM=new CStateMachine;
    mNameSet=new Set<string>();
    mLastDir : number =null;
    override Update(_update : CUpdate): void 
    {
        super.Update(_update);
        for(let com of this.GetOwner().mComArr)
        {
            if(com instanceof CRigidBody)
            {
                for(let f of com.mForceArr)
                {
                    this.mNameSet.add(f.Key());
                    if(f.Key()=="g")    continue;
                    
                    let dirDot=[0,0,0,0,0,0];

                    //CConsol.Log(com.MoveDir());
                    dirDot[0]=CMath.V3Dot(CVec3.Left(),f.mDirection);
                    dirDot[1]=CMath.V3Dot(CVec3.Right(),f.mDirection);
                    dirDot[2]=CMath.V3Dot(CVec3.Up(),f.mDirection);
                    dirDot[3]=CMath.V3Dot(CVec3.Down(),f.mDirection);
                    dirDot[4]=CMath.V3Dot(CVec3.Front(),f.mDirection);
                    dirDot[5]=CMath.V3Dot(CVec3.Back(),f.mDirection);

                    let select=-1;
                    let selectMax=0;
                    for(let i=0;i<6;++i)
                    {
                        if(dirDot[i]>selectMax)
                        {
                            selectMax=dirDot[i];
                            select=i;
                        }
                    }
                    this.mLastDir=select;
                    switch(select)
                    {
                        case 0:this.mNameSet.add(f.mKey+CVec3.eDir.Left);break;
                        case 1:this.mNameSet.add(f.mKey+CVec3.eDir.Right);break;
                        case 2:this.mNameSet.add(f.mKey+CVec3.eDir.Up);break;
                        case 3:this.mNameSet.add(f.mKey+CVec3.eDir.Down);break;
                        case 4:this.mNameSet.add(f.mKey+CVec3.eDir.Front);break;
                        case 5:this.mNameSet.add(f.mKey+CVec3.eDir.Back);break;
                    }
                    
                    
                }
                if(com.IsJump()) this.mNameSet.add("Jump");
                if(com.IsFall()) this.mNameSet.add("Fall");
                
                    
            }
            else if(com instanceof CAniFlow)
            {
                this.mNameSet.add(com.mAni.Key()+(com.IsEnd()?"Stop":"Play"));
            }
 
        }//for
        if(this.mLastDir!=null)
        {
            switch(this.mLastDir)
            {
                case 0:this.mNameSet.add("Last"+CVec3.eDir.Left);break;
                case 1:this.mNameSet.add("Last"+CVec3.eDir.Right);break;
                case 2:this.mNameSet.add("Last"+CVec3.eDir.Up);break;
                case 3:this.mNameSet.add("Last"+CVec3.eDir.Down);break;
                case 4:this.mNameSet.add("Last"+CVec3.eDir.Front);break;
                case 5:this.mNameSet.add("Last"+CVec3.eDir.Back);break;
            }
        }
        else
            this.mNameSet.add("Last"+CVec3.eDir.Null);

        for(let name of this.mNameSet)
        {
            this.mSM.GetState()[name]=1;
        }
        if(this.mNameSet.size==0)
            this.mSM.GetState()["Default"]=1;
        
        this.mSM.PatternUpdate();
        this.mSM.ExcuteListUpdate(this.GetOwner());
        for(let name of this.mNameSet)
        {
            this.mSM.GetState()[name]=0;
        }
        if(this.mNameSet.size==0)
            this.mSM.GetState()["Default"]=0;
        this.mNameSet.clear();
        //this.mLastDir=null;
    }
    GetSM() {   return this.mSM;    }
}

