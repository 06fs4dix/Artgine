import { CEvent } from "../basic/CEvent.js";
import { CQueue } from "../basic/CQueue.js";
import { CClass } from "./CClass.js";
const gDestructorRegistry = new FinalizationRegistry((heldValue) => {
    CPool.Recycle(heldValue);
});
export class CPool {
    static sSpace = new Map();
    static sProductEvent = new Array();
    static sRecycleEvent = new Array();
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
    static async Product(type, _destructor = null) {
        let _typeName;
        if (typeof type === "function") {
            _typeName = type.name;
        }
        else if (typeof type === "object") {
            _typeName = type.constructor?.name ?? "Unknown";
        }
        else if (typeof type === "string") {
            _typeName = type;
        }
        else {
            throw new Error("Invalid type input to CPool.Product");
        }
        let p = null;
        let que = CPool.sSpace.get(_typeName);
        if (que == null || que.IsEmpty()) {
            if (CPool.sProductEvent[_typeName] == null) {
                p = CClass.New(_typeName);
                if (p == null)
                    return null;
                p.SetRecycleType(p.constructor.name);
            }
            else {
                p = await CPool.sProductEvent[_typeName].CallAsync();
            }
        }
        else {
            p = que.Dequeue();
            if (CPool.sRecycleEvent[_typeName] != null)
                CPool.sRecycleEvent[_typeName].CallAsync(p);
        }
        if (p.GetRecycleType() == null)
            p.SetRecycleType(_typeName);
        else
            p.SetRecycleType(p.GetRecycleType());
        if (_destructor != null)
            gDestructorRegistry.register(_destructor, p);
        return p;
    }
    static Recycle(_obj) {
        if (_obj.Recycle == null)
            return;
        let type = _obj.GetRecycleType();
        if (type == null)
            return;
        let que = CPool.sSpace.get(type);
        if (que == null) {
            que = new CQueue();
            CPool.sSpace.set(type, que);
        }
        que.Enqueue(_obj);
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
}
const gCheckStatic = CPool;
(function (CPool) {
    let ePool;
    (function (ePool) {
        ePool["Product"] = "Product";
        ePool["Recycle"] = "Recycle";
    })(ePool = CPool.ePool || (CPool.ePool = {}));
})(CPool || (CPool = {}));
