import { CArray } from "../basic/CArray.js";
import { CClass } from "../basic/CClass.js";
import { CObject } from "../basic/CObject.js";
import { CSamplerTimer } from "../geometry/CSampler.js";
export class CCondition extends CObject {
    constructor(_stage, _op = "==", _value = 1) {
        super();
        this.mOperator = _op == null ? "==" : _op;
        this.mValue = _value == null ? 1 : _value;
        if (_stage == null) { }
        else if (typeof _stage == "string") {
            this.mState = _stage;
        }
        else {
            this.ImportJSON(_stage);
        }
    }
    mState = "";
    mValue = 1;
    mOperator = "==";
    static eOperator = {
        "==": "==",
        "!=": "!=",
        "<=": "<=",
        ">=": ">=",
        "<": "<",
        ">": ">",
        Equal: "==",
        NotEqual: "!=",
        LessEqual: "<=",
        GreaterEqual: ">=",
        Less: "<",
        Greater: ">"
    };
    Excute(_state) {
        let st = _state.Get(this.mState);
        if (this.mOperator == "==")
            return st == this.mValue;
        if (this.mOperator == "!=")
            return st != this.mValue;
        if (this.mOperator == "<=")
            return st <= this.mValue;
        if (this.mOperator == ">=")
            return st >= this.mValue;
        if (this.mOperator == "<")
            return st < this.mValue;
        if (this.mOperator == ">")
            return st > this.mValue;
        return true;
    }
    ImportCJSON(_json) {
        let json = _json.mDocument;
        this.mState = json["mState"] == null ? json["s"] : json["mState"];
        this.mOperator = json["mOperator"] == null ? json["o"] : json["mOperator"];
        if (this.mOperator == null)
            this.mOperator = "==";
        this.mValue = json["mValue"] == null ? json["v"] : json["mValue"];
        if (this.mValue == null)
            this.mValue = 1;
        return this;
    }
}
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
        "Code": "Code",
        "Ramda": "Ramda",
    };
    mType = "Function";
    mAction = "";
    mParameter = new Array();
    mSamplerTimer = new CSamplerTimer(true);
    async Excute(_target, _delay, _update = 1, _async = false) {
        if (this.mSamplerTimer.Excute(_delay, _update) == false)
            return;
        if (this.mType == CAction.eType.Function) {
            if (_async)
                return await CClass.CallAsync(_target, this.mAction, this.mParameter);
            else
                CClass.Call(_target, this.mAction, this.mParameter);
        }
        else if (this.mType == CAction.eType.Listener) {
            if (_async)
                return await _target.GetEvent(this.mAction).CallAsync(this.mParameter);
            else
                _target.GetEvent(this.mAction).Call(this.mParameter);
        }
        else if (this.mType == CAction.eType.Message) {
            let mag = _target.NewInMsg(this.mAction);
            mag.mMsgData = this.mParameter;
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
            this.mSamplerTimer.mBegin = json["mBegin"] == null ? json["b"] : json["mBegin"];
        if (json["mEnd"] != null)
            this.mSamplerTimer.mEnd = json["mEnd"] == null ? json["e"] : json["mEnd"];
        return this;
    }
}
export class CSMP extends CObject {
    constructor(_and, _ex) {
        super();
        if (_and == null) { }
        else if (_and instanceof Array)
            this.mAnd = _and;
        else
            this.mAnd.push(_and);
        if (_ex == null) { }
        else if (_ex instanceof Array)
            this.mExcute = _ex;
        else
            this.mExcute.push(_ex);
    }
    mPriority = 10000;
    mAnd = new Array;
    mOr = new Array;
    mExcute = new Array;
    ImportCJSON(_json) {
        let json = _json.mDocument;
        let and = json["mAnd"] == null ? json["and"] : json["mAnd"];
        if (and != null) {
            this.mAnd.length = 0;
            for (let con of and) {
                let SMC = new CCondition(null);
                SMC.ImportJSON(con);
                this.mAnd.push(SMC);
            }
        }
        let or = json["mOr"] == null ? json["or"] : json["mOr"];
        if (or != null) {
            this.mOr.length = 0;
            for (let con of or) {
                let SMC = new CCondition(null);
                SMC.ImportJSON(con);
                this.mOr.push(SMC);
            }
        }
        this.mPriority = json["mPriority"] == null ? json["priority"] : json["mPriority"];
        let exe = json["mExcute"] == null ? json["exe"] : json["mExcute"];
        if (exe != null) {
            for (let ac of exe) {
                let sma = new CAction(null, null);
                sma.ImportJSON(ac);
                this.mExcute.push(sma);
            }
        }
        return this;
    }
    IsCondition(_state) {
        let excute = true;
        for (let con of this.mAnd) {
            if (con.Excute(_state) == false) {
                excute = false;
                break;
            }
        }
        if (excute == false)
            return false;
        excute = this.mOr.length == 0;
        for (let con of this.mOr) {
            if (con.Excute(_state) == true) {
                excute = true;
                break;
            }
        }
        return excute;
    }
}
export class CStateMachine extends CObject {
    mPattern = new Array;
    mState = new CObject();
    mExcuteList = new CArray();
    mExcuteLock = null;
    mUpdateOffset = 0;
    GetState() { return this.mState; }
    PushPattern(_p) {
        if (_p instanceof CSMP) {
            for (let i = 0; i < this.mPattern.length; ++i) {
                if (this.mPattern[i].mPriority < _p.mPriority) {
                    this.mPattern.splice(i, 0, _p);
                    break;
                }
            }
            this.mPattern.push(_p);
        }
        else if (_p instanceof Array) {
            for (let json of _p) {
                let p = new CSMP([], null);
                p.ImportJSON(json);
                this.PushPattern(p);
            }
        }
        else {
            let p = new CSMP([], null);
            p.ImportJSON(_p);
            this.PushPattern(p);
        }
    }
    PatternUpdate() {
        if (this.mExcuteList.Size() != 0)
            return;
        this.mUpdateOffset++;
        for (let pat of this.mPattern) {
            if (pat.IsCondition(this.mState)) {
                for (let ac of pat.mExcute)
                    this.mExcuteList.Push(ac);
            }
        }
    }
    async ExcuteListUpdate(_target, _delay, _async = false) {
        if (this.mExcuteLock != null)
            return;
        for (let i = 0; i < this.mExcuteList.Size(); ++i) {
            this.mExcuteLock = this.mExcuteList.Find(i);
            if (_async) {
                await this.mExcuteLock.Excute(_target, _delay, this.mUpdateOffset, _async);
            }
            else
                this.mExcuteLock.Excute(_target, _delay, this.mUpdateOffset);
        }
        this.mExcuteList.Clear();
        this.mExcuteLock = null;
    }
}
