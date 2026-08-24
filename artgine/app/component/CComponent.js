import { CObject } from "../../basic/CObject.js";
import { CRouteMsg } from "../CRouteMsg.js";
export class CComponent extends CObject {
    mEnable;
    mSave;
    mDestroy;
    mSysc = CComponent.eSysn.Event;
    mComMsg = null;
    mComMsgSwap = new Array();
    mComMsgLen = 0;
    mOwner = null;
    mStartChk = true;
    constructor() {
        super();
        this.mDestroy = false;
        this.mEnable = true;
        this.mSave = true;
        this.mComMsg = new Array();
    }
    Provider(_type, _state) { }
    GetSysc() { return this.mSysc; }
    IsStart() {
        return this.mStartChk == false;
    }
    IsShould(_member, _type) {
        if (_type == CObject.eShould.Proxy) {
            if (_member == "mEnable")
                return false;
        }
        if (_member == "mComMsg" || _member == "mComMsgLen" || _member == "mComMsgSwap" || _member == "mStartChk" ||
            _member == "mOwner" || _member == "mDestroy" || _member == "mSysc")
            return false;
        return super.IsShould(_member, _type);
    }
    PushMsg(_msg) {
        if (this.mDestroy)
            return;
        if (this.mComMsg.length > this.mComMsgLen)
            this.mComMsg[this.mComMsgLen] = _msg;
        else
            this.mComMsg.push(_msg);
        this.mComMsgLen++;
    }
    Fixed(_update) {
    }
    Update(_update) {
    }
    BuildGI() {
    }
    SubUpdate() {
    }
    ProductMsg(_name) {
        if (this.mDestroy)
            return new CRouteMsg(_name);
        ;
        this.mComMsgLen++;
        var cm = null;
        if (this.mComMsg.length > this.mComMsgLen - 1) {
            cm = this.mComMsg[this.mComMsgLen - 1];
            cm.mMsgName = _name;
            cm.mIntra = null;
            cm.mInter = null;
            cm.mChild = false;
        }
        else {
            cm = new CRouteMsg(_name);
            this.mComMsg.push(cm);
        }
        return cm;
    }
    RemoveMsg(_name) {
        for (var i = 0; i < this.mComMsg.length; ++i) {
            if (this.mComMsg[i].mMsgName == _name) {
                this.mComMsg.splice(i, 1);
                this.mComMsgLen--;
                break;
            }
        }
    }
    ClearMsg() {
        if (this.mComMsgLen == 0)
            return;
        var dummy = this.mComMsg;
        this.mComMsg = this.mComMsgSwap;
        this.mComMsgSwap = dummy;
        this.mComMsgLen = 0;
    }
    Reset() {
        this.mStartChk = true;
        this.mComMsgLen = 0;
        this.mOwner = null;
    }
    Recycle() {
        if (this.GetRecycleType() != null && this.IsRecycle() == false) {
            super.Recycle();
            return;
        }
        this.mStartChk = true;
        this.mComMsgLen = 0;
    }
    IsEnable() {
        if (this.IsDestroy())
            return false;
        return this.mEnable;
    }
    SetEnable(_val) {
        this.mEnable = _val;
        if (this.mOwner != null)
            this.mOwner.UpdateComp();
    }
    IsDestroy() {
        if (this.IsRecycle())
            return true;
        return this.mDestroy;
    }
    StartChk() {
        if (this.mStartChk == true) {
            this.mStartChk = false;
            return true;
        }
        return false;
    }
    Start() { }
    SetOwner(_obj) {
        this.mOwner = _obj;
    }
    GetOwner() { return this.mOwner; }
    Destroy() {
        if (this.mDestroy)
            return;
        if (this.GetRecycleType() != null) {
            this.Recycle();
            return;
        }
        this.mDestroy = true;
        this.mEnable = false;
        this.mStartChk = true;
        this.ClearMsg();
        this.mComMsg = null;
    }
    Prefab(_owner) {
    }
}
;
(function (CComponent) {
    let eSysn;
    (function (eSysn) {
        eSysn[eSysn["First"] = 0] = "First";
        eSysn[eSysn["Move"] = 50] = "Move";
        eSysn[eSysn["Collider"] = 100] = "Collider";
        eSysn[eSysn["Light"] = 201] = "Light";
        eSysn[eSysn["CamComp"] = 401] = "CamComp";
        eSysn[eSysn["RigidBody"] = 500] = "RigidBody";
        eSysn[eSysn["Wind"] = 501] = "Wind";
        eSysn[eSysn["WorkFlow"] = 600] = "WorkFlow";
        eSysn[eSysn["Event"] = 601] = "Event";
        eSysn[eSysn["AniFlow"] = 800] = "AniFlow";
        eSysn[eSysn["IK"] = 801] = "IK";
        eSysn[eSysn["Paint"] = 900] = "Paint";
    })(eSysn = CComponent.eSysn || (CComponent.eSysn = {}));
    ;
})(CComponent || (CComponent = {}));
