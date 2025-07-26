import { CEvent } from "../basic/CEvent.js";
import { CQueue } from "../basic/CQueue.js";
export class CRollBackInfo {
    constructor(_name, _data = null) {
        this.mName = _name;
        this.mData = _data;
    }
    mName = "";
    mData = null;
}
var gQueue = new CQueue();
var gEventMap = new Map();
export class CRollBack {
    On(_key, _event, _target) {
        throw new Error("Method not implemented.");
    }
    Off(_key, _target) {
        throw new Error("Method not implemented.");
    }
    GetEvent(_key, _target) {
        throw new Error("Method not implemented.");
    }
    static On(_key, _event, _target = null) {
        gEventMap.set(_key, CEvent.ToCEvent(_event));
    }
    static Off(_key, _target = null) {
        gEventMap.delete(_key);
    }
    static GetEvent(_key, _target = null) {
        return gEventMap.get(_key);
    }
    static Push(_info) {
        gQueue.Enqueue(_info);
        if (gQueue.Size() > 30)
            gQueue.Dequeue();
    }
    static Claear() {
        gQueue.Clear();
    }
    static Exe() {
        while (gQueue.IsEmpty() == false) {
            let info = gQueue.Pop();
            if (info != null) {
                let event = CRollBack.GetEvent(info.mName);
                if (event != null) {
                    event.Call(info.mData);
                    return true;
                }
            }
        }
        return false;
    }
}
