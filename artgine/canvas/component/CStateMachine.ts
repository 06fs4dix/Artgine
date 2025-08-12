import { IListener } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CConsol } from "../../basic/CConsol.js";
import { CEvent } from "../../basic/CEvent.js";
import { CObject } from "../../basic/CObject.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CAniFlow } from "./CAniFlow.js";
import { CAnimation } from "./CAnimation.js";
import { CComponent } from "./CComponent.js";
import { CRigidBody } from "./CRigidBody.js";


// class CSMPI
// {
//     constructor(_class,_data0,_data1=null)
//     {
//         this.mClass=_class;
//         this.mData.push(_data0);
//         if(_data1)
//     }
//     mClass;
//     mData=new Array();
// }
export class CSMPattern extends CObject
{
    //mName="";
    mName="";
    mInArr=new Array<string>();
    mOutArr=new Array<string>();
    constructor(_name : string,_in : Array<any>,_out : Array<any>=[])
    {
        super();
        this.mName=_name;
        this.mInArr=_in;
        this.mOutArr=_out;
        for(let i=0;i<this.mInArr.length;++i)
        {
            if(typeof this.mInArr[i]=="number")
                this.mInArr[i]=this.mInArr[i]+"";
        }
    }
}

/*
CRigidBody 
-Force Key : move,run...
-Jump : 점프
-Grabity
-Left,Right... 방향

CAniFlow
-[Ani][Play/Stop]이런식에 조합


*/
export class CStateMachine extends CComponent //implements IListener
{
    mPattern=new Array<CSMPattern>;
    //mEvent=new Map<string,CEvent>();
    mLastDir : number =null;
    mStatePst=new Set<string>();;
    mStateLast=new Set<string>();;
    mNameSet=new Set<string>();
    mOnList=new Set<string>();
    constructor()
    {
        super();
        //this.mParrern=_pattern;
    }
    // On(_key: any, _event: any, _target: any=null) 
    // {
    //     this.mEvent.set(_key,CEvent.ToCEvent(_event));
    // }
    // Off(_key: any, _target: any) {
    //     throw new Error("Method not implemented.");
    // }
    // GetEvent(_key: any, _target: any) {
    //     throw new Error("Method not implemented.");
    // }

    PushPattern(_smp)
    {
        this.mPattern.push(_smp);
    }
    IsOn(_state)
    {
        return this.mOnList.has(_state);
    }
    PushName(_Name)
    {
        this.mNameSet.add(_Name);
    }
    Update(_delay: any): void 
    {
        super.Update(_delay);
        
        this.mOnList.clear();
        for(let com of this.GetOwner().mComArr)
        {
            if(com instanceof CRigidBody)
            {
                for(let f of com.mForceArr)
                {
                    this.mNameSet.add(f.mKey);
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
                    
            }
            else if(com instanceof CAniFlow)
            {
                this.mNameSet.add(com.mAni.Key()+(com.IsEnd()?"Stop":"Play"));
            }
 
        }
        let callCount=0;
        let defaultPat : CSMPattern =null;
        for(let pat of this.mPattern)
        {
            let call=true;
            if(pat.mInArr.length==0 && pat.mOutArr.length==0)
            {
                defaultPat=pat;
                continue;
            }
                
            for(let data of pat.mInArr)
            {
                if(this.mNameSet.has(data)==false)
                    call=false;
            }
            if(call && pat.mOutArr.length>0)
            {
                //let outCall=true;
                for(let data of pat.mOutArr)
                {
                    if(this.mNameSet.has(data)==true)
                        call=false;
                }
            }
            
         
            
            if(call)
            {
                this.mStatePst.add(pat.mName);
                if(this.mStateLast.has(pat.mName)==false)
                {
                    this.GetOwner().NewInMsg(pat.mName);
                    //let event=this.mEvent.get(pat.mName);
                    //if(event!=null) event.Call();
                    this.mOnList.add(pat.mName);
                    
                }
                
                callCount++;
            }
        }
        if(callCount==0)
        {
            this.mStatePst.add("");
            if(this.mStateLast.has("")==false)
            {
                this.GetOwner().NewInMsg(defaultPat.mName);
                // let event=this.mEvent.get("");
                // if(event!=null) event.Call();
            }
            
        }
        var dummy=this.mStateLast;
        this.mStateLast=this.mStatePst;
        dummy.clear();
        this.mStatePst=dummy;
        this.mNameSet.clear();
    }

}