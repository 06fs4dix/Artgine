import { CObject } from "../basic/CObject.js";
import { CAction } from "./CAction.js";
import { CCondition } from "./CCondition.js";
export class CRole extends CObject {
    constructor(_and = null, _ex = null) {
        super();
        if (_and == null) { }
        else if (_and instanceof Array)
            this.mAnd = _and;
        else
            this.mAnd.push(_and);
        if (_ex == null) { }
        else if (_ex instanceof Array)
            this.mExecute = _ex;
        else
            this.mExecute.push(_ex);
    }
    mPriority = 10000;
    mAnd = new Array;
    mOr = new Array;
    mExecute = new Array;
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
                this.mExecute.push(sma);
            }
        }
        return this;
    }
    IsCondition(_state) {
        let execute = true;
        for (let con of this.mAnd) {
            if (con.Excute(_state) == false) {
                execute = false;
                break;
            }
        }
        if (execute == false)
            return false;
        execute = this.mOr.length == 0;
        for (let con of this.mOr) {
            if (con.Excute(_state) == true) {
                execute = true;
                break;
            }
        }
        return execute;
    }
}
export class CRoleMgr extends CObject {
    mRoleArr = new Array;
    mType = "";
    mStateArr = new Array;
    constructor() {
        super();
    }
    GetType() { return this.mType; }
    SetStateValue(_key, _value, _temp = true) {
        if (_temp)
            this.Temp(_key, _value);
        else
            this[_key] = _value;
    }
    PushRole(_p) {
        if (_p instanceof CRole) {
            for (let i = 0; i < this.mRoleArr.length; ++i) {
                if (this.mRoleArr[i].mPriority < _p.mPriority) {
                    this.mRoleArr.splice(i, 0, _p);
                    break;
                }
            }
            this.mRoleArr.push(_p);
        }
        else if (_p instanceof Array) {
            for (let json of _p) {
                let p = new CRole([], null);
                p.ImportJSON(json);
                this.PushRole(p);
            }
        }
        else {
            let p = new CRole([], null);
            p.ImportJSON(_p);
            this.PushRole(p);
        }
    }
    async Update(_update, _target) {
        let stateArr = [];
        _target.Provider(this.mType, this.mStateArr);
        for (let key of this.mStateArr) {
            this.Temp(key, 1);
        }
        for (let pat of this.mRoleArr) {
            if (pat.IsCondition(this)) {
                for (let ac of pat.mExecute) {
                    ac.Excute(_target, false, null, null, "", _update);
                }
            }
        }
        for (let key of this.mStateArr) {
            this.Temp(key, 0);
        }
        this.mStateArr.length = 0;
    }
}
