import { CEvent } from "../basic/CEvent.js";
import { CQueue } from "../basic/CQueue.js";
import { CArray } from "./CArray.js";
import { CClass } from "./CClass.js";
const gDestructorRegistry = new FinalizationRegistry((heldValue) => {
    CPool.Recycle(heldValue);
});
export class CPool {
    static sSpace = new Map();
    static sProductEvent = new Array();
    static sRecycleEvent = new Array();
    static sRecysleList = new CArray();
    constructor() {
    }
    static On(_key, _event, _target) {
        if (_target == "Product")
            CPool.sProductEvent[_key] = CEvent.ToCEvent(_event);
        else
            CPool.sRecycleEvent[_key] = CEvent.ToCEvent(_event);
    }
    static Off(_key, _target) {
    }
    static GetEvent(_key, _target) {
    }
    static _Setup(p, _typeName, _destructor) {
        if (p.GetRecycleType() == null)
            p.ExeRecycle(_typeName);
        else
            p.ExeRecycle(p.GetRecycleType());
        if (CPool.sRecycleEvent[_typeName] != null)
            CPool.sRecycleEvent[_typeName].Call(p);
        if (_destructor != null && _destructor instanceof Array == false)
            gDestructorRegistry.register(_destructor, p);
        return p;
    }
    static Product(type, _destructor = null) {
        const _typeName = CPool._ResolveName(type);
        const que = CPool.sSpace.get(_typeName);
        let p;
        if (que == null || que.IsEmpty()) {
            if (CPool.sProductEvent[_typeName] == null) {
                p = CClass.New(_typeName);
                if (p == null)
                    return null;
            }
            else {
                p = CPool.sProductEvent[_typeName].Call();
            }
        }
        else {
            p = que.Dequeue();
        }
        return CPool._Setup(p, _typeName, _destructor);
    }
    static async ProductAsync(type, _destructor = null) {
        const _typeName = CPool._ResolveName(type);
        const que = CPool.sSpace.get(_typeName);
        let p;
        if (que == null || que.IsEmpty()) {
            if (CPool.sProductEvent[_typeName] == null) {
                p = CClass.New(_typeName);
                if (p == null)
                    return null;
            }
            else {
                p = await CPool.sProductEvent[_typeName].CallAsync();
            }
        }
        else {
            p = que.Dequeue();
        }
        return CPool._Setup(p, _typeName, _destructor);
    }
    static _ResolveName(type) {
        if (typeof type === "function")
            return type.name;
        if (typeof type === "object")
            return type.constructor?.name ?? "Unknown";
        return type;
    }
    static Recycle(_obj) {
        if (_obj.Recycle == null)
            return;
        CPool.sRecysleList.Push(_obj);
        if (CPool.sRecysleList.Size() > 10000) {
            let dummy = CPool.sRecysleList;
            CPool.sRecysleList = new CArray();
            CPool.sRecysleList.Clear();
            setTimeout(() => {
                for (let i = 0; i < dummy.Size(); ++i) {
                    let _obj = dummy.Find(i);
                    let type = _obj.GetRecycleType();
                    if (type == null)
                        continue;
                    let que = CPool.sSpace.get(type);
                    if (que == null) {
                        que = new CQueue();
                        CPool.sSpace.set(type, que);
                    }
                    que.Enqueue(_obj);
                }
            }, 1);
        }
    }
    static Pooling(_type, _count = 1) {
        if (CPool.sProductEvent[_type] == null)
            return;
        let que = CPool.sSpace.get(_type);
        if (que == null) {
            que = new CQueue();
            CPool.sSpace.set(_type, que);
        }
        _count = _count - que.Size();
        for (let i = 0; i < _count; ++i) {
            que.Enqueue(CPool.sProductEvent[_type].Call());
        }
    }
    static Update() {
        for (let i = 0; i < CPool.sRecysleList.Size(); ++i) {
            let _obj = CPool.sRecysleList.Find(i);
            let type = _obj.GetRecycleType();
            if (type == null)
                continue;
            let que = CPool.sSpace.get(type);
            if (que == null) {
                que = new CQueue();
                CPool.sSpace.set(type, que);
            }
            que.Enqueue(_obj);
        }
        CPool.sRecysleList.Clear();
    }
}
const gCheckStatic = CPool;
(function (CPool) {
    let ePool;
    (function (ePool) {
        ePool["Product"] = "Product";
        ePool["Recycle"] = "Recycle";
    })(ePool = CPool.ePool || (CPool.ePool = {}));
})(CPool || (CPool = {}));
