import { IListener } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CClass } from "../../basic/CClass.js";
import { CConsol } from "../../basic/CConsol.js";
import { CEvent } from "../../basic/CEvent.js";
import { CObject } from "../../basic/CObject.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CRouteMsg } from "../CRouteMsg.js";
import { CAniFlow } from "./CAniFlow.js";
import { CAnimation } from "./CAnimation.js";
import { CComponent } from "./CComponent.js";
import { CRigidBody } from "./CRigidBody.js";


//condition
export class CSMC extends CObject
{
    constructor(_stage : string,_op : string="==",_value : number=1)
    {
        super();
        this.mState=_stage;
        this.mOperator=_op==null?"==":_op;
        this.mValue=_value==null?1:_value;
    }
    mState="";
    mValue=1;
    mOperator="==";
    static eOperator={
        "==":"==",
        "!=":"!=",
        "<=":"<=",
        ">=":">=",
        "<":"<",
        ">":">",
    };
    Excute(_state)
    {
        if(this.mOperator=="==")    return _state==this.mValue;
        if(this.mOperator=="!=")    return _state!=this.mValue;
        if(this.mOperator=="<=")    return _state<=this.mValue;
        if(this.mOperator==">=")    return _state>=this.mValue;
        if(this.mOperator=="<")    return _state<this.mValue;
        if(this.mOperator==">")    return _state>this.mValue;
        

        return true;
    }
}
//action
export class CSMA extends CObject
{
    constructor(_type,_action : string,_para : Array<any>=[])
    {
        super();
        this.mAction=_action;
        this.mParameter=_para==null?[]:_para;
        this.mType=_type;
    }

    static eType={
        "Function":"Function",
        "Listener":"Listener",
        "Message":"Message",
    };
    mType : string="Function";
    mAction : string="";
    mParameter : Array<any>=new Array<any>();

    mDelay=0;
    mCount=1;
    mBegin=0;
    mEnd=0;

    mTimeAll=0;
    mTimeDelay=0;
    mExcute=0;
    mUpdate=0;
    

    async Excute(_target,_delay : number,_update=1,_async=false)
    {
        //업데이트 오프셋이 차이남
        if(_update-1!=this.mUpdate)
        {
            this.mTimeAll=0;
            this.mExcute=0;
            this.mTimeDelay=0;
        }
        this.mUpdate=_update;

        if(this.mTimeAll<this.mBegin || (this.mCount!=0 && this.mCount<=this.mExcute) || 
            (this.mEnd!=0 && this.mEnd<this.mTimeAll) || (0<this.mTimeDelay))  
        {
            this.mTimeAll+=_delay;
            this.mTimeDelay-=_delay;
            return;
        }
        

        this.mTimeAll+=_delay;
        this.mTimeDelay=this.mDelay;
        this.mExcute++;

        if(this.mType==CSMA.eType.Function)
        {
            if(_async)
                return await CClass.CallAsync(_target,this.mAction,this.mParameter);    
            else
                CClass.Call(_target,this.mAction,this.mParameter);
        }
        else if(this.mType==CSMA.eType.Listener)
        {
            if(_async)
                return await _target.GetEvent(this.mAction).CallAsync(this.mParameter);
            else
                _target.GetEvent(this.mAction).Call(this.mParameter);
        }
        else if(this.mType==CSMA.eType.Message)
        {
            let mag=_target.NewInMsg(this.mAction) as CRouteMsg;
            mag.mMsgData=this.mParameter;
        }
        

    }
}
//pattern
export class CSMP extends CObject
{
    constructor(_and : CSMC|Array<CSMC>,_ex : CSMA|Array<CSMA>)
    {
        super();
        if(_and==null){}
        else if(_and instanceof Array)
            this.mAnd=_and;
        else
            this.mAnd.push(_and);    
        if(_ex==null){}
        else if(_ex instanceof Array)
            this.mExcute=_ex;
        else
            this.mExcute.push(_ex);    

    }
    mPriority : number=10000;
    mAnd =new Array<CSMC>;
    mOr =new Array<CSMC>;
    mExcute=new Array<CSMA>;
    ImportJSON(_json: object): void {

        let and=_json["mAnd"]==null?_json["and"]:_json["mAnd"];
        if(and!=null)
        {
            this.mAnd.length=0;
            for(let con of and)
            {
                let state=con["mState"]==null?con["s"]:con["mState"];
                let operator=con["mOperator"]==null?con["o"]:con["mOperator"];
                let value=con["mValue"]==null?con["v"]:con["mValue"];
               

                let SMC=new CSMC(state,operator,value);
                this.mAnd.push(SMC);
            }
        }
        let or=_json["mAnd"]==null?_json["or"]:_json["mOr"];
        if(or!=null)
        {
            this.mOr.length=0;
            for(let con of or)
            {
                let state=con["mState"]==null?con["s"]:con["mState"];
                let operator=con["mOperator"]==null?con["o"]:con["mOperator"];
                let value=con["mValue"]==null?con["v"]:con["mValue"];
               

                let SMC=new CSMC(state,operator,value);
                this.mOr.push(SMC);
            }
        }
        this.mPriority=_json["mPriority"]==null?_json["priority"]:_json["mPriority"];


        let exe=_json["mExcute"]==null?_json["exe"]:_json["mExcute"];
        if(exe!=null)
        {
            for(let ac of exe)
            {
                let type=exe["mType"]==null?ac["t"]:ac["mType"];
                let action=exe["mAction"]==null?ac["a"]:ac["mAction"];
                let parameter=exe["mParameter"]==null?ac["p"]:ac["mParameter"];

                let sma=new CSMA(type,action,parameter);

                if(ac["mDelay"]!=null)    sma.mDelay=ac["mDelay"];
                if(ac["mCount"]!=null)    sma.mCount=ac["mCount"];
                if(ac["mBegin"]!=null)    sma.mBegin=ac["mBegin"];
                if(ac["mEnd"]!=null)    sma.mEnd=ac["mEnd"];
                this.mExcute.push(sma);
            }
        }
    }
    IsCondition(_state : CObject)
    {
        let excute=true;
        for(let con of this.mAnd)
        {
            if(con.Excute(_state.Get(con.mState))==false)  
            {
                excute=false;
                break;
            }
                
        }
        if(excute==false)   return false;

        excute=this.mOr.length==0;
        for(let con of this.mOr)
        {
            if(con.Excute(_state.Get(con.mState))==true)
            {
                excute=true;
                break;
            }
        }

        return excute;
    }
}

export class CStateMachine extends CObject
{
    mPattern=new Array<CSMP>;
    mState=new CObject();
    mExcuteList=new CArray<CSMA>();
    mExcuteLock : CSMA=null;
    mUpdateOffset=0;
    //mExcuteData=new Map<>

    GetState(){ return this.mState; }
    PushPattern(_p : CSMP|Object|Array<Object>)
    {
        if(_p instanceof CSMP)
        {
            for(let i=0;i<this.mPattern.length;++i)
            {
                if(this.mPattern[i].mPriority<_p.mPriority)
                {
                    this.mPattern.splice(i,0,_p);
                    break;
                }
            }
            this.mPattern.push(_p);
        }
        else if(_p instanceof Array)
        {
            for(let json of _p)
            {
                let p=new CSMP([],null);
                p.ImportJSON(json);
                this.mPattern.push(p);
            }
        }
        else
        {
            let p=new CSMP([],null);
            p.ImportJSON(_p);
            this.mPattern.push(p);

        }
        
    }

    PatternUpdate()
    {
        if(this.mExcuteList.Size()!=0)  return;
        this.mUpdateOffset++;
        for(let pat of this.mPattern)
        {
            
            if(pat.IsCondition(this.mState))
            {
                for(let ac of pat.mExcute)
                    this.mExcuteList.Push(ac);
            }
        }
    }
    async ExcuteListUpdate(_target,_delay,_async=false)
    {
        if(this.mExcuteLock!=null)  return;

        for(let i=0;i<this.mExcuteList.Size();++i)
        {
            this.mExcuteLock=this.mExcuteList.Find(i);
            if(_async)
            {
                await this.mExcuteLock.Excute(_target,_delay,this.mUpdateOffset,_async)
            }
            else
                this.mExcuteLock.Excute(_target,_delay,this.mUpdateOffset);
        }
        this.mExcuteList.Clear();
        this.mExcuteLock=null;
    }
}
export class CSMComp extends CComponent
{
    mSM=new CStateMachine;
    mNameSet=new Set<string>();
    mLastDir : number =null;
    Update(_delay: any): void 
    {
        super.Update(_delay);
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
        this.mSM.ExcuteListUpdate(this.GetOwner(),_delay);
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



// var test=new CStateMachine2();


// let tt={
//     "mAnd":{"mState":"Default"},
//     "mExcute":{"mFunction":"Basic"}
// };
// //test.PushPattern();

// test.PushPattern(new CSMPattern2([new CSMCondition("Default")],new CSMAction("Basic")));
// test.PushPattern(new CSMPattern2([new CSMCondition("move"),new CSMCondition("Jump","!=")],new CSMAction("MaryWalk")));


/*
CRigidBody 
-Force Key : move,run...
-Jump : 점프
-Grabity
-Left,Right... 방향

CAniFlow
-[Ani][Play/Stop]이런식에 조합


*/
// export class CStateMachine extends CComponent //implements IListener
// {
//     mPattern=new Array<CSMPattern>;
//     //mEvent=new Map<string,CEvent>();
//     mLastDir : number =null;
//     mStatePst=new Set<string>();;
//     mStateLast=new Set<string>();;
//     mNameSet=new Set<string>();
//     mOnList=new Set<string>();
//     constructor()
//     {
//         super();
//         //this.mParrern=_pattern;
//     }
//     // On(_key: any, _event: any, _target: any=null) 
//     // {
//     //     this.mEvent.set(_key,CEvent.ToCEvent(_event));
//     // }
//     // Off(_key: any, _target: any) {
//     //     throw new Error("Method not implemented.");
//     // }
//     // GetEvent(_key: any, _target: any) {
//     //     throw new Error("Method not implemented.");
//     // }

//     PushPattern(_smp)
//     {
//         this.mPattern.push(_smp);
//     }
//     IsOn(_state)
//     {
//         return this.mOnList.has(_state);
//     }
//     PushName(_Name)
//     {
//         this.mNameSet.add(_Name);
//     }
//     Update(_delay: any): void 
//     {
//         super.Update(_delay);
        
//         this.mOnList.clear();
//         for(let com of this.GetOwner().mComArr)
//         {
//             if(com instanceof CRigidBody)
//             {
//                 for(let f of com.mForceArr)
//                 {
//                     this.mNameSet.add(f.mKey);
//                     if(f.Key()=="g")    continue;
                    
//                     let dirDot=[0,0,0,0,0,0];

//                     //CConsol.Log(com.MoveDir());
//                     dirDot[0]=CMath.V3Dot(CVec3.Left(),f.mDirection);
//                     dirDot[1]=CMath.V3Dot(CVec3.Right(),f.mDirection);
//                     dirDot[2]=CMath.V3Dot(CVec3.Up(),f.mDirection);
//                     dirDot[3]=CMath.V3Dot(CVec3.Down(),f.mDirection);
//                     dirDot[4]=CMath.V3Dot(CVec3.Front(),f.mDirection);
//                     dirDot[5]=CMath.V3Dot(CVec3.Back(),f.mDirection);

//                     let select=-1;
//                     let selectMax=0;
//                     for(let i=0;i<6;++i)
//                     {
//                         if(dirDot[i]>selectMax)
//                         {
//                             selectMax=dirDot[i];
//                             select=i;
//                         }
//                     }
//                     this.mLastDir=select;
//                     switch(select)
//                     {
//                         case 0:this.mNameSet.add(f.mKey+CVec3.eDir.Left);break;
//                         case 1:this.mNameSet.add(f.mKey+CVec3.eDir.Right);break;
//                         case 2:this.mNameSet.add(f.mKey+CVec3.eDir.Up);break;
//                         case 3:this.mNameSet.add(f.mKey+CVec3.eDir.Down);break;
//                         case 4:this.mNameSet.add(f.mKey+CVec3.eDir.Front);break;
//                         case 5:this.mNameSet.add(f.mKey+CVec3.eDir.Back);break;
//                     }
                    
                    
//                 }
//                 if(com.IsJump()) this.mNameSet.add("Jump");
//                 if(com.IsFall()) this.mNameSet.add("Fall");
//                 if(this.mLastDir!=null)
//                 {
//                     switch(this.mLastDir)
//                     {
//                         case 0:this.mNameSet.add("Last"+CVec3.eDir.Left);break;
//                         case 1:this.mNameSet.add("Last"+CVec3.eDir.Right);break;
//                         case 2:this.mNameSet.add("Last"+CVec3.eDir.Up);break;
//                         case 3:this.mNameSet.add("Last"+CVec3.eDir.Down);break;
//                         case 4:this.mNameSet.add("Last"+CVec3.eDir.Front);break;
//                         case 5:this.mNameSet.add("Last"+CVec3.eDir.Back);break;
//                     }
//                 }
                    
//             }
//             else if(com instanceof CAniFlow)
//             {
//                 this.mNameSet.add(com.mAni.Key()+(com.IsEnd()?"Stop":"Play"));
//             }
 
//         }
//         let callCount=0;
//         let defaultPat : CSMPattern =null;
//         for(let pat of this.mPattern)
//         {
//             let call=true;
//             if(pat.mInArr.length==0 && pat.mOutArr.length==0)
//             {
//                 defaultPat=pat;
//                 continue;
//             }
                
//             for(let data of pat.mInArr)
//             {
//                 if(this.mNameSet.has(data)==false)
//                     call=false;
//             }
//             if(call && pat.mOutArr.length>0)
//             {
//                 //let outCall=true;
//                 for(let data of pat.mOutArr)
//                 {
//                     if(this.mNameSet.has(data)==true)
//                         call=false;
//                 }
//             }
            
         
            
//             if(call)
//             {
//                 this.mStatePst.add(pat.mName);
//                 if(this.mStateLast.has(pat.mName)==false)
//                 {
//                     this.GetOwner().NewInMsg(pat.mName);
//                     //let event=this.mEvent.get(pat.mName);
//                     //if(event!=null) event.Call();
//                     this.mOnList.add(pat.mName);
                    
//                 }
                
//                 callCount++;
//             }
//         }
//         if(callCount==0)
//         {
//             this.mStatePst.add("");
//             if(this.mStateLast.has("")==false)
//             {
//                 this.GetOwner().NewInMsg(defaultPat.mName);
//                 // let event=this.mEvent.get("");
//                 // if(event!=null) event.Call();
//             }
            
//         }
//         var dummy=this.mStateLast;
//         this.mStateLast=this.mStatePst;
//         dummy.clear();
//         this.mStatePst=dummy;
//         this.mNameSet.clear();
//     }

// }