import { CEvent } from "../../basic/CEvent.js";
import { CObject } from "../../basic/CObject.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CAniFlow } from "./CAniFlow.js";
import { CComponent } from "./CComponent.js";
import { CRigidBody } from "./CRigidBody.js";
export class CSMPattern extends CObject {
    mName = "";
    mInArr = new Array();
    mOutArr = new Array();
    constructor(_name, _in, _out = []) {
        super();
        this.mName = _name;
        this.mInArr = _in;
        this.mOutArr = _out;
        for (let i = 0; i < this.mInArr.length; ++i) {
            if (typeof this.mInArr[i] == "number")
                this.mInArr[i] = this.mInArr[i] + "";
        }
    }
}
export class CStateMachine extends CComponent {
    mPattern = new Array;
    mEvent = new Map();
    mStatePst = new Set();
    ;
    mStateLast = new Set();
    ;
    mNameSet = new Set();
    mOnList = new Set();
    constructor() {
        super();
    }
    On(_key, _event, _target = null) {
        this.mEvent.set(_key, CEvent.ToCEvent(_event));
    }
    Off(_key, _target) {
        throw new Error("Method not implemented.");
    }
    GetEvent(_key, _target) {
        throw new Error("Method not implemented.");
    }
    PushPattern(_smp) {
        this.mPattern.push(_smp);
    }
    IsOn(_state) {
        return this.mOnList.has(_state);
    }
    PushName(_Name) {
        this.mNameSet.add(_Name);
    }
    Update(_delay) {
        super.Update(_delay);
        this.mOnList.clear();
        for (let com of this.GetOwner().mComArr) {
            if (com instanceof CRigidBody) {
                for (let f of com.mForceArr) {
                    this.mNameSet.add(f.mKey);
                }
                let dirDot = [0, 0, 0, 0, 0, 0];
                dirDot[0] = CMath.V3Dot(CVec3.Left(), com.MoveDir());
                dirDot[1] = CMath.V3Dot(CVec3.Right(), com.MoveDir());
                dirDot[4] = CMath.V3Dot(CVec3.Front(), com.MoveDir());
                dirDot[5] = CMath.V3Dot(CVec3.Back(), com.MoveDir());
                let select = -1;
                let selectMax = 0;
                for (let i = 0; i < 6; ++i) {
                    if (dirDot[i] > selectMax) {
                        selectMax = dirDot[i];
                        select = i;
                    }
                }
                switch (select) {
                    case 0:
                        this.mNameSet.add(CVec3.eDir.Left + "");
                        break;
                    case 1:
                        this.mNameSet.add(CVec3.eDir.Right + "");
                        break;
                    case 2:
                        this.mNameSet.add(CVec3.eDir.Up + "");
                        break;
                    case 3:
                        this.mNameSet.add(CVec3.eDir.Down + "");
                        break;
                    case 4:
                        this.mNameSet.add(CVec3.eDir.Front + "");
                        break;
                    case 5:
                        this.mNameSet.add(CVec3.eDir.Back + "");
                        break;
                }
                if (com.IsJump())
                    this.mNameSet.add("Jump");
                if (com.IsFall())
                    this.mNameSet.add("Fall");
            }
            else if (com instanceof CAniFlow) {
                this.mNameSet.add(com.mAni.Key() + (com.IsEnd() ? "Stop" : "Play"));
            }
        }
        let callCount = 0;
        for (let pat of this.mPattern) {
            let call = true;
            for (let data of pat.mInArr) {
                if (this.mNameSet.has(data) == false)
                    call = false;
            }
            if (call && pat.mOutArr.length > 0) {
                for (let data of pat.mOutArr) {
                    if (this.mNameSet.has(data) == true)
                        call = false;
                }
            }
            if (call) {
                this.mStatePst.add(pat.mName);
                if (this.mStateLast.has(pat.mName) == false) {
                    let event = this.mEvent.get(pat.mName);
                    if (event != null)
                        event.Call();
                    this.mOnList.add(pat.mName);
                }
                callCount++;
            }
        }
        if (callCount == 0) {
            this.mStatePst.add("");
            if (this.mStateLast.has("") == false) {
                let event = this.mEvent.get("");
                if (event != null)
                    event.Call();
            }
        }
        var dummy = this.mStateLast;
        this.mStateLast = this.mStatePst;
        dummy.clear();
        this.mStatePst = dummy;
        this.mNameSet.clear();
    }
}
