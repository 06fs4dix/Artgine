import { IListener } from "../basic/Basic.js";
import { CEvent } from "../basic/CEvent.js";
import { CQueue } from "../basic/CQueue.js";

export class CRollBackInfo
{
    constructor(_name : string,_data=null)
    {
        this.mName=_name;
        this.mData=_data;
    }
    mName="";
    mData=null;
}
var gQueue=new CQueue<CRollBackInfo>();
var gEventMap=new Map<string,CEvent>();
export class CRollBack implements IListener
{
    On(_key: any, _event: any, _target: any) {
        throw new Error("Method not implemented.");
    }
    Off(_key: any, _target: any) {
        throw new Error("Method not implemented.");
    }
    GetEvent(_key: any, _target: any) {
        throw new Error("Method not implemented.");
    }
    static On(_key: string, _event: any, _target: any=null) {
        gEventMap.set(_key,CEvent.ToCEvent(_event));
    }
    static Off(_key: string, _target: any=null) {
        gEventMap.delete(_key);
    }
    static GetEvent(_key: string, _target: any=null) {
        return gEventMap.get(_key);
    }
    
    static Push(_info : CRollBackInfo)
    {
        gQueue.Enqueue(_info);
        if(gQueue.Size()>30)
            gQueue.Dequeue();
    }
    static Claear()
    {
        gQueue.Clear();
    }
    static Exe()
    {
        while(gQueue.IsEmpty()==false)
        {
            let info=gQueue.Pop();
            if(info!=null)
            {
                let event=CRollBack.GetEvent(info.mName);
                if(event!=null) 
                {
                    event.Call(info.mData);
                    return true;
                }
            }
        }
        return false;
    }

}