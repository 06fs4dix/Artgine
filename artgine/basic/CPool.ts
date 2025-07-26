import {CEvent} from "../basic/CEvent.js";
import {CQueue} from "../basic/CQueue.js";
import { IListener } from "./Basic.js";
import {CClass} from "./CClass.js";



export interface IRecycle
{
    Recycle();
    GetRecycleType() : string;
    SetRecycleType(_type : string);
    IsRecycle();
}
export type RecycleHandler = (_irecyc: IRecycle) => void;
export type ProductHandler = () => IRecycle;

type Constructor<T> = new (...args: any[]) => T;
const gDestructorRegistry = new FinalizationRegistry((heldValue : IRecycle) => {
    CPool.Recycle(heldValue);
})
type ValidType =
    | string
    | (abstract new (...args: any[]) => any) // 클래스 생성자 (함수지만 이름이 있음)
    | object;

export class CPool
{
    static sSpace=new Map<string,CQueue<any>>();
    static sProductEvent = new Array<CEvent>();
    static sRecycleEvent = new Array<CEvent>();

    constructor()
    {
        
    }
   
    static On(_key,_event : CEvent<ProductHandler>|ProductHandler|RecycleHandler,_target : CPool.ePool|'Product' | 'Recycle')
    {
        if(_target=="Product")
            CPool.sProductEvent[_key]=CEvent.ToCEvent(_event);   
        else
            CPool.sRecycleEvent[_key]=CEvent.ToCEvent(_event);   
        
    }
	static Off(_key,_target)
    {

    }
    static GetEvent(_key,_target: CPool.ePool|'Product' | 'Recycle')
    {
        
        //CPool.sRecycleEvent[_typeName]
    }

    //static Product<T>(type: string|object,_destructor : any=null): T | null 
    static Product<T extends object>(type: new (...args: any[]) => T,_destructor: any): T | null;
    static Product<T extends object>(type: new (...args: any[]) => T): T | null;
    static Product<T>(type: string) : T;
    static Product<T>(type: string,_destructor: any) : T;
    static async Product<T>(type: string|object,_destructor : any=null): Promise<T | null> 
    {
        let _typeName: string;

        if (typeof type === "function") {
            _typeName = type.name;
        } else if (typeof type === "object") {
            _typeName = (type as Object).constructor?.name ?? "Unknown";
        } else if (typeof type === "string") {
            _typeName = type;
        } else {
            throw new Error("Invalid type input to CPool.Product");
        }

        let p = null;
        let que = CPool.sSpace.get(_typeName);
        if (que == null || que.IsEmpty()) {
            if (CPool.sProductEvent[_typeName] == null) {
                p = CClass.New(_typeName);
                if (p == null) return null;
                p.SetRecycleType(p.constructor.name);
            } else {
                p = await CPool.sProductEvent[_typeName].CallAsync();
            }
        } else {
            p = que.Dequeue();
            if (CPool.sRecycleEvent[_typeName] != null)
                CPool.sRecycleEvent[_typeName].CallAsync(p);
        }
        if(p.GetRecycleType()==null)
            p.SetRecycleType(_typeName);
        else    
            p.SetRecycleType(p.GetRecycleType());
        if(_destructor!=null)
            gDestructorRegistry.register(_destructor, p)

        return p as T;
    }
    //수동 회수. 서브젝트는 자동 회수다
    static Recycle(_obj : IRecycle)
    {
        if(_obj.Recycle==null)  return;
        
        let type=_obj.GetRecycleType();
        if(type==null)    return;
        let que=CPool.sSpace.get(type);

        if(que==null)
        {
            que=new CQueue();
            CPool.sSpace.set(type,que);
        }
        que.Enqueue(_obj);
    }
    static Pooling(_type,_count=1)
    {
        if(CPool.sProductEvent[_type]==null)    return;
        let que=CPool.sSpace.get(_type);
        if(que==null)
        {
            que=new CQueue();
            CPool.sSpace.set(_type,que);
        }
        _count=_count-que.Size();
        for(let i=0;i<_count;++i)
        {
            que.Enqueue(CPool.sProductEvent[_type].Call());
        }
    }
}
const gCheckStatic: IListener = CPool;
export namespace CPool
{
    export enum ePool
    {
        Product="Product",
        Recycle="Recycle",
    }
}
