import { CClass } from "../basic/CClass.js";
import { CEvent } from "../basic/CEvent.js";
import { CObject } from "../basic/CObject.js";
import { CSchedule } from "./CSchedule.js";
export class CAction extends CObject {
    constructor(_type, _action, _para = []) {
        super();
        this.mAction = _action;
        this.mParameter = _para == null ? [] : _para;
        this.mType = _type;
    }
    static eType = {
        "Function": "Function",
        "Listener": "Listener",
        "Message": "Message",
        "Event": "Event",
    };
    mType = "Function";
    mAction = "";
    mParameter = new Array();
    mSamplerTimer = new CSchedule();
    mTemp = null;
    mRun = "";
    static Excute(_temp, _event, count = 0, delay = 0, start = 0, _end = 0) {
        if (CSchedule.Update(_temp, count, delay, start, _end)) {
            if (_event instanceof CEvent)
                _event.Call(_temp);
            else
                _event(_temp);
        }
    }
    async Excute(_actionTarget, _async = false, _parameter = null, _tempTarget = null, _run = "", _update = null) {
        if (_tempTarget == null)
            this.mTemp = this;
        else
            this.mTemp = _tempTarget;
        this.mRun = _run;
        if (this.mSamplerTimer.Execute(this.mTemp, this.mRun, _update) == false)
            return;
        if (_parameter == null)
            _parameter = this.mParameter;
        if (typeof this.mAction != "string") {
            this.mAction.Call(_parameter);
        }
        else if (this.mType == CAction.eType.Function) {
            if (_async)
                return await CClass.CallAsync(_actionTarget, this.mAction, _parameter);
            else
                CClass.Call(_actionTarget, this.mAction, _parameter);
        }
        else if (this.mType == CAction.eType.Listener) {
            if (_async)
                return await _actionTarget.GetEvent(this.mAction).CallAsync(_parameter);
            else
                _actionTarget.GetEvent(this.mAction).Call(_parameter);
        }
        else if (this.mType == CAction.eType.Message) {
            let mag = _actionTarget.NewInMsg(this.mAction);
            mag.mMsgData = _parameter;
        }
    }
    ImportCJSON(_json) {
        let json = _json.mDocument;
        this.mType = json["mType"] == null ? json["t"] : json["mType"];
        this.mAction = json["mAction"] == null ? json["a"] : json["mAction"];
        this.mParameter = json["mParameter"] == null ? json["p"] : json["mParameter"];
        if (json["mDelay"] != null)
            this.mSamplerTimer.mDelay = json["mDelay"] == null ? json["d"] : json["mDelay"];
        if (json["mCount"] != null)
            this.mSamplerTimer.mCount = json["mCount"] == null ? json["c"] : json["mCount"];
        if (json["mBegin"] != null)
            this.mSamplerTimer.mStart = json["mBegin"] == null ? json["b"] : json["mBegin"];
        if (json["mEnd"] != null)
            this.mSamplerTimer.mEnd = json["mEnd"] == null ? json["e"] : json["mEnd"];
        return this;
    }
    IsEndReset() {
        if (this.mTemp == null)
            return false;
        return CSchedule.IsEndReset(this.mTemp, this.mRun);
    }
}
