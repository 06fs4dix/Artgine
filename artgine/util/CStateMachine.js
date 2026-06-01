import { CArray } from "../basic/CArray.js";
import { CObject } from "../basic/CObject.js";
import { CAction } from "./CAction.js";
import { CCondition } from "./CCondition.js";
export class CSMP extends CObject {
    constructor(_and = null, _ex = null) {
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
    mState;
    mExcuteList = new CArray();
    mExcuteSet = new Set();
    mExcuteLock = null;
    constructor(_state = new CObject()) {
        super();
        this.mState = _state;
    }
    IsShould(_member, _type) {
        if (_member == "mState" || _member == "mExcuteList" || _member == "mExcuteSet" || _member == "mExcuteLock")
            return false;
        return super.IsShould(_member, _type);
    }
    SetState(_state) { this.mState = _state; }
    SetStateValue(_key, _value, _temp = true) {
        if (_temp) {
            if (this.mState["mTemp"] == null)
                this.mState["mTemp"] = {};
            this.mState["mTemp"][_key] = _value;
        }
        else
            this.mState[_key] = _value;
    }
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
    async Update(_update, _target) {
        for (let pat of this.mPattern) {
            if (pat.IsCondition(this.mState)) {
                for (let ac of pat.mExcute) {
                    ac.Excute(_target, false, null, null, "", _update);
                }
            }
        }
    }
}
