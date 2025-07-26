import { CObject } from "./CObject.js";
export class CTree extends CObject {
    mKey;
    mData;
    mChilde;
    mColleague;
    mParent;
    mValueArr;
    constructor() {
        super();
        this.mKey = "";
        this.mData = null;
        this.mChilde = null;
        this.mColleague = null;
        this.mParent = null;
        this.mValueArr = null;
    }
    ImportCJSON(_json) {
        var obj = super.ImportCJSON(_json);
        if (this.mChilde != null) {
            this.mChilde.mParent = this;
            var node = this.mChilde.mColleague;
            while (node != null) {
                node.mParent = this;
                node = node.mColleague;
            }
        }
        return obj;
    }
    Deserial(_stream) {
        super.Deserial(_stream);
        if (this.mChilde != null) {
            this.mChilde.mParent = this;
            var node = this.mChilde.mColleague;
            while (node != null) {
                node.mParent = this;
                node = node.mColleague;
            }
        }
    }
    IsShould(_member, _type) {
        if (_member == "mParent" || _member == "mValueArr")
            return false;
        return super.IsShould(_member, _type);
    }
    PushColleague(_key) {
        this.mValueArr = null;
        if (this.mColleague == null) {
            if (typeof (_key) == "string" || typeof (_key) == "number") {
                this.mColleague = new CTree();
                this.mColleague.mKey = _key + "";
                this.mColleague.mParent = this.mParent;
            }
            else {
                this.mColleague = _key;
                this.mColleague.mParent = this.mParent;
            }
        }
        else {
            return this.mColleague.PushColleague(_key);
        }
        return this.mColleague;
    }
    PushChilde(_key) {
        this.mValueArr = null;
        if (this.mChilde == null) {
            if (typeof (_key) == "string" || typeof (_key) == "number") {
                this.mChilde = new CTree();
                this.mChilde.mKey = _key + "";
                this.mChilde.mParent = this;
            }
            else {
                this.mChilde = _key;
                this.mChilde.mParent = this;
            }
        }
        else {
            return this.mChilde.PushColleague(_key);
        }
        return this.mChilde;
    }
    Find(_key) {
        if (typeof _key == "number")
            _key = _key + "";
        if (_key == this.mKey)
            return this;
        var dum = null;
        if (this.mChilde != null) {
            dum = this.mChilde.Find(_key);
            if (dum != null)
                return dum;
        }
        if (this.mColleague != null) {
            dum = this.mColleague.Find(_key);
            if (dum != null)
                return dum;
        }
        return null;
    }
    Destroy() {
        if (this.mParent != null)
            this.mParent.mValueArr = null;
        if (this.mParent.mChilde == this) {
            this.mParent.mChilde = this.mColleague;
        }
        else if (this.mParent.mChilde != null) {
            var pct = this.mParent.mChilde;
            var pctb = pct;
            while (pct != this) {
                pct.mValueArr = null;
                pctb = pct;
                pct = pct.mColleague;
            }
            pctb.mColleague = this.mColleague;
        }
        this.mParent = null;
        this.mColleague = null;
        return this;
    }
    GetArray() {
        if (this.mValueArr != null)
            return this.mValueArr;
        this.mValueArr = new Array();
        var que = new Array();
        que.push(this);
        for (let off = 0; off < que.length; ++off) {
            let node = que[off];
            if (node.mData != null)
                this.mValueArr.push(node);
            if (node.mChilde != null)
                que.push(node.mChilde);
            if (node.mColleague != null)
                que.push(node.mColleague);
        }
        return this.mValueArr;
    }
    Keys(_childe = true) {
        var keyArr = new Array();
        var que = new Array();
        que.push(this);
        for (let off = 0; off < que.length; ++off) {
            let node = que[off];
            if (node.data != null)
                keyArr.push(node.key);
            if (node.childe != null && _childe)
                que.push(node.childe);
            if (node.colleague != null)
                que.push(node.colleague);
        }
        return keyArr;
    }
}
