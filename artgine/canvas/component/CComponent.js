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
    GetSysc() { return this.mSysc; }
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
    Update(_delay) {
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
        this.mStartChk = false;
        this.mComMsgLen = 0;
    }
    IsEnable() { return this.mEnable; }
    SetEnable(_val) { this.mEnable = _val; }
    IsDestroy() { return this.mDestroy; }
    StartChk() {
        if (this.mStartChk == true) {
            this.mStartChk = false;
            this.Start();
        }
    }
    Start() { }
    SetOwner(_obj) {
        this.mOwner = _obj;
    }
    GetOwner() { return this.mOwner; }
    Destroy() {
        if (this.mDestroy)
            return;
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
        eSysn[eSysn["Collider"] = 100] = "Collider";
        eSysn[eSysn["AniFlow"] = 200] = "AniFlow";
        eSysn[eSysn["Light"] = 201] = "Light";
        eSysn[eSysn["IK"] = 300] = "IK";
        eSysn[eSysn["CamComp"] = 401] = "CamComp";
        eSysn[eSysn["Paint"] = 402] = "Paint";
        eSysn[eSysn["RigidBody"] = 500] = "RigidBody";
        eSysn[eSysn["Wind"] = 501] = "Wind";
        eSysn[eSysn["WorkFlow"] = 600] = "WorkFlow";
        eSysn[eSysn["Event"] = 601] = "Event";
    })(eSysn = CComponent.eSysn || (CComponent.eSysn = {}));
    ;
})(CComponent || (CComponent = {}));
