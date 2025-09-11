import { CArray } from "../basic/CArray.js";
import { CClass } from "../basic/CClass.js";
import { CObject } from "../basic/CObject.js";
export class CSMC extends CObject {
    constructor(_stage, _op = "==", _value = 1) {
        super();
        this.mState = _stage;
        this.mOperator = _op == null ? "==" : _op;
        this.mValue = _value == null ? 1 : _value;
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
    };
    Excute(_state) {
        if (this.mOperator == "==")
            return _state == this.mValue;
        if (this.mOperator == "!=")
            return _state != this.mValue;
        if (this.mOperator == "<=")
            return _state <= this.mValue;
        if (this.mOperator == ">=")
            return _state >= this.mValue;
        if (this.mOperator == "<")
            return _state < this.mValue;
        if (this.mOperator == ">")
            return _state > this.mValue;
        return true;
    }
}
export class CSMA extends CObject {
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
    };
    mType = "Function";
    mAction = "";
    mParameter = new Array();
    mDelay = 0;
    mCount = 1;
    mBegin = 0;
    mEnd = 0;
    mTimeAll = 0;
    mTimeDelay = 0;
    mExcute = 0;
    mUpdate = 0;
    async Excute(_target, _delay, _update = 1, _async = false) {
        if (_update - 1 != this.mUpdate) {
            this.mTimeAll = 0;
            this.mExcute = 0;
            this.mTimeDelay = 0;
        }
        this.mUpdate = _update;
        if (this.mTimeAll < this.mBegin || (this.mCount != 0 && this.mCount <= this.mExcute) ||
            (this.mEnd != 0 && this.mEnd < this.mTimeAll) || (0 < this.mTimeDelay)) {
            this.mTimeAll += _delay;
            this.mTimeDelay -= _delay;
            return;
        }
        this.mTimeAll += _delay;
        this.mTimeDelay = this.mDelay;
        this.mExcute++;
        if (this.mType == CSMA.eType.Function) {
            if (_async)
                return await CClass.CallAsync(_target, this.mAction, this.mParameter);
            else
                CClass.Call(_target, this.mAction, this.mParameter);
        }
        else if (this.mType == CSMA.eType.Listener) {
            if (_async)
                return await _target.GetEvent(this.mAction).CallAsync(this.mParameter);
            else
                _target.GetEvent(this.mAction).Call(this.mParameter);
        }
        else if (this.mType == CSMA.eType.Message) {
            let mag = _target.NewInMsg(this.mAction);
            mag.mMsgData = this.mParameter;
        }
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
    ImportJSON(_json) {
        let and = _json["mAnd"] == null ? _json["and"] : _json["mAnd"];
        if (and != null) {
            this.mAnd.length = 0;
            for (let con of and) {
                let state = con["mState"] == null ? con["s"] : con["mState"];
                let operator = con["mOperator"] == null ? con["o"] : con["mOperator"];
                let value = con["mValue"] == null ? con["v"] : con["mValue"];
                let SMC = new CSMC(state, operator, value);
                this.mAnd.push(SMC);
            }
        }
        let or = _json["mAnd"] == null ? _json["or"] : _json["mOr"];
        if (or != null) {
            this.mOr.length = 0;
            for (let con of or) {
                let state = con["mState"] == null ? con["s"] : con["mState"];
                let operator = con["mOperator"] == null ? con["o"] : con["mOperator"];
                let value = con["mValue"] == null ? con["v"] : con["mValue"];
                let SMC = new CSMC(state, operator, value);
                this.mOr.push(SMC);
            }
        }
        this.mPriority = _json["mPriority"] == null ? _json["priority"] : _json["mPriority"];
        let exe = _json["mExcute"] == null ? _json["exe"] : _json["mExcute"];
        if (exe != null) {
            for (let ac of exe) {
                let type = exe["mType"] == null ? ac["t"] : ac["mType"];
                let action = exe["mAction"] == null ? ac["a"] : ac["mAction"];
                let parameter = exe["mParameter"] == null ? ac["p"] : ac["mParameter"];
                let sma = new CSMA(type, action, parameter);
                if (ac["mDelay"] != null)
                    sma.mDelay = ac["mDelay"];
                if (ac["mCount"] != null)
                    sma.mCount = ac["mCount"];
                if (ac["mBegin"] != null)
                    sma.mBegin = ac["mBegin"];
                if (ac["mEnd"] != null)
                    sma.mEnd = ac["mEnd"];
                this.mExcute.push(sma);
            }
        }
    }
    IsCondition(_state) {
        let excute = true;
        for (let con of this.mAnd) {
            if (con.Excute(_state.Get(con.mState)) == false) {
                excute = false;
                break;
            }
        }
        if (excute == false)
            return false;
        excute = this.mOr.length == 0;
        for (let con of this.mOr) {
            if (con.Excute(_state.Get(con.mState)) == true) {
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
