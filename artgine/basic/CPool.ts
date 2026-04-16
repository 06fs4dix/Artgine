import {CEvent} from "../basic/CEvent.js";
import {CQueue} from "../basic/CQueue.js";
import { IListener, IRecycle } from "./Basic.js";
import { CArray } from "./CArray.js";
import {CClass} from "./CClass.js";



/*
순환 구조
*ExeRecycle로 재사용 등록
*Destroy시 Recycle자신에 호출
*재사용 직적 ExeRecycle다시 호출됌
ㄴ내부적으로 자식들 Recycle호출


*/
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
    static sRecysleList=new CArray<IRecycle>();

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

  
    // 공통 로직 추출
    private static _Setup<T>(p: any, _typeName: string, _destructor: any): T {
        if (p.GetRecycleType() == null)
            p.ExeRecycle(_typeName);
        else
            p.ExeRecycle(p.GetRecycleType());

        if (CPool.sRecycleEvent[_typeName] != null)
            CPool.sRecycleEvent[_typeName].Call(p);

        if (_destructor != null && _destructor instanceof Array == false)
            gDestructorRegistry.register(_destructor, p);

        return p as T;
    }

    static Product<T>(type: new () => T, _destructor?: any): T | null;
    static Product<T>(type: string, _destructor?: any): T;
    static Product<T>(type: string | object, _destructor: any = null): T | null {
        const _typeName = CPool._ResolveName(type);
        const que = CPool.sSpace.get(_typeName);

        let p: any;
        if (que == null || que.IsEmpty()) {
            if (CPool.sProductEvent[_typeName] == null) {
                p = CClass.New(_typeName);
                if (p == null) return null;
            } else {
                p = CPool.sProductEvent[_typeName].Call(); // ← sync
            }
        } else {
            p = que.Dequeue();
        }

        return CPool._Setup<T>(p, _typeName, _destructor);
    }

    static async ProductAsync<T>(type: string | object, _destructor: any = null): Promise<T | null> {
        const _typeName = CPool._ResolveName(type);
        const que = CPool.sSpace.get(_typeName);

        let p: any;
        if (que == null || que.IsEmpty()) {
            if (CPool.sProductEvent[_typeName] == null) {
                p = CClass.New(_typeName);
                if (p == null) return null;
            } else {
                p = await CPool.sProductEvent[_typeName].CallAsync(); // ← async
            }
        } else {
            p = que.Dequeue();
        }

        return CPool._Setup<T>(p, _typeName, _destructor);
    }

    private static _ResolveName(type: string | object): string {
        if (typeof type === "function") return (type as Function).name;
        if (typeof type === "object") return (type as Object).constructor?.name ?? "Unknown";
        return type as string;
    }
    //수동 회수. 서브젝트는 자동 회수다
    static Recycle(_obj : IRecycle)
    {
        if(_obj.Recycle==null)  return;
        
        CPool.sRecysleList.Push(_obj);
        
        //너무 많이 생기면 강제로 업데이트
        if(CPool.sRecysleList.Size()>10000)
        {
            let dummy=CPool.sRecysleList;
            CPool.sRecysleList=new CArray();
            CPool.sRecysleList.Clear();
            setTimeout(() => {
                for(let i=0;i<dummy.Size();++i)
                {
                    let _obj=dummy.Find(i);
                    
                
                    let type=_obj.GetRecycleType();
                    if(type==null)    continue;
                    let que=CPool.sSpace.get(type);

                    if(que==null)
                    {
                        que=new CQueue();
                        CPool.sSpace.set(type,que);
                    }
                    que.Enqueue(_obj);
                }
            }, 1);
        }
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
    static Update()
    {
        for(let i=0;i<CPool.sRecysleList.Size();++i)
        {
            let _obj=CPool.sRecysleList.Find(i);
            
        
            let type=_obj.GetRecycleType();
            if(type==null)    continue;
            let que=CPool.sSpace.get(type);

            if(que==null)
            {
                que=new CQueue();
                CPool.sSpace.set(type,que);
            }
            que.Enqueue(_obj);
        }
        CPool.sRecysleList.Clear();
        
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
