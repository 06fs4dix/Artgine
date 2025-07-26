import { CClass } from "../basic/CClass.js";
export class CRouteMsg {
    mInter = null;
    mChilde;
    mIntra = null;
    mMsgName = "";
    mMsgData = new Array();
    constructor(_msgName, _msgData = null, _component = null, _objHD = null, _childe = false) {
        this.mMsgName = _msgName;
        if (_msgData != null)
            this.mMsgData = _msgData;
        this.mIntra = _component;
        this.mInter = _objHD;
        this.mChilde = _childe;
    }
    Call(_target) {
        CClass.Call(_target, this.mMsgName, this.mMsgData);
    }
}
