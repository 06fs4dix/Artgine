import { CObject } from "../basic/CObject.js";
export class CCondition extends CObject {
    constructor(_state, _op = "==", _value = 1, _group = "") {
        super();
        this.mOperator = _op == null ? "==" : _op;
        this.mValue = _value == null ? 1 : _value;
        this.mGroup = _group;
        if (_state == null) { }
        else if (typeof _state == "number") {
            this.mState = _state + "";
        }
        else if (typeof _state == "string") {
            this.mState = _state;
        }
        else {
            this.ImportJSON(_state);
        }
    }
    mState = "";
    mValue = 1;
    mOperator = "==";
    mGroup = "";
    static eOperator = {
        "==": "==",
        "!=": "!=",
        "<=": "<=",
        ">=": ">=",
        "<": "<",
        ">": ">",
        "&": "&",
        Equal: "==",
        NotEqual: "!=",
        LessEqual: "<=",
        GreaterEqual: ">=",
        Less: "<",
        Greater: ">",
        And: "&",
    };
    Excute(_state) {
        let st = null;
        if (this.mState[0] == "/")
            st = _state.Temp(this.mState);
        else
            st = _state.Get(this.mState);
        if (st == null && typeof this.mValue == "number")
            st = 0;
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
        if (this.mOperator == "&")
            return st & this.mValue;
        return true;
    }
    ImportCJSON(_json) {
        let json = _json.mDocument;
        this.mState = json["mState"] == null ? json["s"] : json["mState"];
        if (typeof this.mState == "number")
            this.mState = this.mState + "";
        this.mOperator = json["mOperator"] == null ? json["o"] : json["mOperator"];
        if (this.mOperator == null)
            this.mOperator = "==";
        let val = json["mValue"] == null ? json["v"] : json["mValue"];
        if (val != null && typeof val === "object" && (this.mOperator === "every" || this.mOperator === "some")) {
            let inner = new CCondition(null);
            inner.ImportJSON(val);
            this.mValue = inner;
        }
        else {
            this.mValue = val == null ? 1 : val;
        }
        return this;
    }
}
