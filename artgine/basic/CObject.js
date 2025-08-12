import { CBlackBoard } from "./CBlackBoard.js";
import { CClass } from "./CClass.js";
import { CJSON } from "./CJSON.js";
import { CPool } from "./CPool.js";
import { CStream } from "./CStream.js";
import { CString } from "./CString.js";
import { CUniqueID } from "./CUniqueID.js";
export var ProxyHandle = {
    get: (obj, name) => {
        if (typeof obj[name] == "function" || name == "mProxy") { }
        else if (obj.IsShould(name, CObject.eShould.Proxy)) {
            let bb = CBlackBoard.Find(obj.Key());
            if (bb != null)
                return bb[name];
        }
        return obj[name];
    },
    set: (obj, name, value) => {
        if (typeof obj[name] == "function") { }
        else if (obj.IsShould(name, CObject.eShould.Proxy)) {
            let bb = CBlackBoard.Find(obj.Key());
            if (bb != null)
                bb[name] = value;
            return true;
        }
        obj[name] = value;
        return true;
    },
};
export class CPointer {
    target;
    member;
    key = null;
    refArr = [];
    state = 0;
    constructor(_target, _member, _array = null) {
        this.target = _target;
        this.member = _member;
        this.key = _array;
    }
    Get() {
        if (this.key == null)
            return this.target[this.member];
        if (this.target[this.member] instanceof Set)
            return this.key;
        else if (this.target[this.member] instanceof Map) {
            return this.target[this.member].get(this.key);
        }
        return this.target[this.member][this.key];
    }
    Set(_value) {
        if (this.key == null)
            this.target[this.member] = _value;
        else if (this.target[this.member] instanceof Set) {
            this.target[this.member].delete(this.key);
            this.target[this.member].add(_value);
        }
        else if (typeof this.key == "string")
            this.target[this.member].set(this.key, _value);
        else
            this.target[this.member][this.key] = _value;
    }
    Member() {
        if (this.key == null)
            return this.member;
        return this.member + "[" + this.key + "]";
    }
    IsRef(_obj) {
        for (let ref of this.refArr) {
            if (ref == _obj)
                return true;
        }
        return false;
    }
}
export class CObject {
    Icon() { return ""; }
    Key() {
        if (this["mKey"] == null)
            this["mKey"] = CUniqueID.GetHash();
        return this["mKey"];
    }
    SetKey(_key) {
        if (_key == "")
            delete this["mKey"];
        else
            this["mKey"] = _key;
    }
    IsKey() {
        return this["mKey"] != null;
    }
    SetBlackBoard(_write = true) {
        let target = this;
        if (this["mProxy"] != null)
            target = this["mProxy"];
        if (_write == false)
            delete target["mBlackboard"];
        else {
            CBlackBoard.Push(this.Key(), target);
            target["mBlackboard"] = _write;
        }
        this.EditRefresh();
    }
    static Export(obj, _copy, _resetKey) {
        return null;
    }
    static Import(_tar, _org) {
    }
    ExportProxy(_resetKey = true) {
        return new Proxy(this.Export(false, _resetKey), ProxyHandle);
    }
    Export(_copy = true, _resetKey = true) {
        return CObject.Export(this, _copy, _resetKey);
    }
    Import(_target) {
        CObject.Import(this, _target);
    }
    IsBlackBoard() {
        return this["mBlackboard"];
    }
    IsShould(_member, _type) {
        if (_type == CObject.eShould.Patch) {
            if (this["mPatch"] != null && this["mPatch"].has(_member))
                return true;
            else
                return false;
        }
        else if (_member.indexOf('mObject') != -1 || _member == 'class' || _member == "mProxy" || _member == "mPatchUpdate" ||
            _member == "mRecycleType" || _member == "mRecycle" || _member == "mTemp")
            return false;
        return true;
    }
    EditRefresh(_pt = null) {
        if (this["mObjectDiv"] != null) {
            var orgDiv = this["mObjectDiv"];
            var newDiv = this.EditInit(_pt);
            orgDiv.innerHTML = "";
            orgDiv.append(...newDiv.childNodes);
            this["mObjectDiv"] = orgDiv;
        }
        this.EditRefreshEx();
    }
    EditForm(_pointer, _body, _input) {
        this.EditFormEx(_pointer, _body, _input);
    }
    EditFormEx(_pointer, _body, _input) {
    }
    EditInit(_pointer = null) {
        return null;
    }
    static EditInit = function (_target, _point = null) {
        return null;
    };
    static EditArrayInit(_arr, _open = false, _pointer = null) {
        var dir = document.createElement("div");
        var arrList = new Array();
        for (var each0 of _arr) {
            arrList.push(each0);
            var span = document.createElement("div");
            span.className = "border border-primary";
            if (_open == false) {
                span.innerText = each0.Key();
                span.id = each0.Key();
                span.onclick = (e) => {
                    var obj = e.target;
                    for (var each0 of arrList) {
                        if (each0.Key() == obj.id) {
                            obj.innerHTML = "";
                            obj.append(each0.EditInit(_pointer));
                        }
                    }
                };
            }
            else {
                span.append(each0.EditInit(_pointer));
            }
            dir.append(span);
        }
        return dir;
    }
    static EditValue(_point) {
        return null;
    }
    static EditArrayItem(_parent, _point) {
    }
    EditChange(_pointer, _childe) {
    }
    EditChangeEx(_pointer, _childe) {
    }
    EditDrop(_object) {
        if (this.constructor.name == _object.constructor.name) {
            this.Import(_object);
        }
    }
    static GetDragObj() { return null; }
    static SetDrag(_type, _obj) {
    }
    static FocusInputNumberChange(_input, _function) {
    }
    EditRefreshEx() {
    }
    EditHTMLInit(_div, _pointer = null) {
    }
    Recycle() {
        if (this["mRecycleType"] != null) {
            this["mRecycle"] = true;
            CPool.Recycle(this);
        }
    }
    GetRecycleType() {
        return this["mRecycleType"];
    }
    SetRecycleType(_type) {
        if (_type != this["mRecycleType"])
            this["mRecycleType"] = _type;
        this["mRecycle"] = false;
    }
    IsRecycle() {
        if (this["mRecycleType"] == null)
            return false;
        return this["mRecycle"];
    }
    static NewImportCJSON(_obj) {
        if (_obj.GetStr("class") != null) {
            let obj = CClass.New(_obj.GetStr("class"));
            if (obj == null)
                return;
            if (_obj.GetBool("mBlackboard") == true) {
                obj.SetKey(_obj.GetStr("mKey"));
                if (CBlackBoard.Find(obj.Key()) != null) {
                    let p = new Proxy(obj, ProxyHandle);
                    obj["mProxy"] = CBlackBoard.Find(obj.Key());
                    return p;
                }
            }
            if (obj != null) {
                obj.ImportCJSON(_obj);
            }
            return obj;
        }
        return _obj.GetDocument();
    }
    ToLog() {
        return this.ToStr();
    }
    ToStr() {
        return this.ExportCJSON().ToStr();
    }
    ToJSON() {
        var jData = { "class": this.constructor.name };
        return jData;
    }
    ExportCJSON() {
        return new CJSON(this.ToJSON());
    }
    ImportJSON(_json) {
        this.ImportCJSON(new CJSON(_json));
    }
    ImportCJSON(_json) {
        return this;
    }
    Serial(_stream = new CStream()) {
        _stream.PushName(this);
        _stream.PushMember(this);
        return _stream;
    }
    Deserial(_stream) {
        _stream.GetName();
        _stream.GetMember(this);
    }
    ObjHash(_seed = 1) {
        if (this["mObjectKey" + _seed] == null)
            this["mObjectKey" + _seed] = CUniqueID.GetHash();
        return this["mObjectKey" + _seed];
    }
    Get(_member, _default) {
        let t = this;
        const path = Array.isArray(_member) ? _member : _member.split(".");
        for (let key of path) {
            if (key.includes("(")) {
                const fun = CString.FunctionAnalyze(key);
                if (t?.[fun.function] != null) {
                    t = CClass.Call(t, fun.function, fun.parameter);
                    if (Array.isArray(t) && t.length === 1)
                        t = t[0];
                }
                else {
                    t = null;
                }
            }
            else if (key.includes("[")) {
                const index = Number(key.substring(key.indexOf("[") + 1, key.length - 1));
                t = t?.[index];
            }
            else {
                t = t?.[key];
            }
            if (t == null)
                break;
        }
        return t == null ? _default : t;
    }
    Set(_member, _value) {
        var t = this;
        if (_member instanceof Array) {
            if (_member.length == 0)
                return this;
        }
        else {
            _member = _member.split(".");
        }
        for (var i = 0; i < _member.length - 1; ++i) {
            if (_member[i].indexOf("(") != -1) {
                var fun = CString.FunctionAnalyze(_member[i]);
                if (t[fun.function] != null) {
                    t = CClass.Call(t, fun.function, fun.parameter);
                    if (t instanceof Array && t.length == 1)
                        t = t[0];
                }
            }
            else if (_member[i].indexOf("[") != -1) {
                let off = _member[i].indexOf("[");
                let index = Number(_member[i].substring(off + 1, _member[i].length - 1));
                t = t[index];
            }
            else
                t = t[_member[i]];
            if (t == null)
                break;
        }
        if (_member[_member.length - 1].indexOf("[") != -1) {
            let off = _member[i].indexOf("[");
            let index = Number(_member[i].substring(off + 1, _member[i].length - 1));
            t[index] = _value;
        }
        else {
            t[_member[_member.length - 1]] = _value;
        }
        return this;
    }
    Call(_function, _para) {
        CClass.Call(this, _function, _para);
    }
    static Get(_member, _default) {
        let t = this;
        const path = Array.isArray(_member) ? _member : _member.split(".");
        for (let key of path) {
            if (key.includes("(")) {
                const fun = CString.FunctionAnalyze(key);
                if (t?.[fun.function] != null) {
                    t = CClass.Call(t, fun.function, fun.parameter);
                    if (Array.isArray(t) && t.length === 1)
                        t = t[0];
                }
                else {
                    t = null;
                }
            }
            else if (key.includes("[")) {
                const index = Number(key.substring(key.indexOf("[") + 1, key.length - 1));
                t = t?.[index];
            }
            else {
                t = t?.[key];
            }
            if (t == null)
                break;
        }
        return t == null ? _default : t;
    }
    PatchStreamWrite(_stream, _fullPath, _member) {
        _stream.Push(_fullPath + "." + _member);
        _stream.Push(this[_member]);
    }
    PatchStreamUpdate(_stream, _path) {
        if (this["mPatchUpdate"] == null || this["mPatchUpdate"].size == 0)
            return;
        for (let key of this["mPatchUpdate"]) {
            this.PatchStreamWrite(_stream, CString.PathArrToFullPath(_path), key);
        }
        this["mPatchUpdate"].clear();
        return;
    }
    PatchStreamRead(_stream, _member) {
        if (typeof this[_member] == "number")
            this[_member] = _stream.GetFloat();
        else if (typeof this[_member] == "string")
            this[_member] = _stream.GetString();
        else if (typeof this[_member] == "boolean")
            this[_member] = _stream.GetBool();
        else if (this[_member] instanceof Array) {
            this[_member] = new Array();
            _stream.GetArray(this[_member]);
        }
        else if (this[_member] instanceof Map) {
            this[_member] = new Map();
            _stream.GetMap(this[_member]);
        }
        else if (this[_member] instanceof CObject) {
            this[_member] = CClass.New(this[_member]);
            _stream.GetIStream(this[_member]);
        }
    }
    IsPatchUpdate(_member) {
        if (this["mPatchUpdate"] == null)
            return false;
        return this["mPatchUpdate"].has(_member);
    }
    PatchTrackDefault() {
    }
    PatchTrack(_fullPath) {
        let pathArr = _fullPath.split(".");
        let target = CString.FullPathArrToLastTarget(this, pathArr);
        if (target["mPatch"] == null) {
            target["mPatch"] = new Set();
        }
        target["mPatch"].add(pathArr[pathArr.length - 1]);
    }
    PatchExe(_member) {
        if (this.IsShould(_member, CObject.eShould.Patch) == false)
            return;
        if (this["mPatchUpdate"] == null)
            this["mPatchUpdate"] = new Set();
        this["mPatchUpdate"].add(_member);
    }
    static PushEditerBtn(_obj) {
        gObjectEditerBtn.push(_obj);
    }
    static GetEditerBtn() {
        return gObjectEditerBtn;
    }
}
export class CBlackBoardRef extends CObject {
    mKey = "";
    mTemplate;
    constructor(param) {
        super();
        if (typeof param === "string") {
            this.mKey = param;
        }
        else if (typeof param === "function") {
            this.mTemplate = param.name;
            this.mKey = "";
        }
    }
    IsShould(_member, _type) {
        if (_member === "mTemplate")
            return false;
        return super.IsShould(_member, _type);
    }
    Ref(_ref = null) {
        if (_ref != null)
            this.mKey = _ref;
        return CBlackBoard.Find(this.mKey);
    }
    Icon() { return "bi bi-link"; }
    EditDrop(_object) {
        if (CBlackBoard.Find(_object.Key()) != null) {
            if (this.mTemplate != null && this.mTemplate != _object.constructor.name) {
                alert("class Type Diffrent");
            }
            this.mKey = _object.Key();
            this.EditRefresh();
        }
    }
}
(function (CObject) {
    let eShould;
    (function (eShould) {
        eShould["Data"] = "D";
        eShould["Editer"] = "E";
        eShould["Patch"] = "P";
        eShould["Proxy"] = "X";
    })(eShould = CObject.eShould || (CObject.eShould = {}));
})(CObject || (CObject = {}));
export class CObjectEditerBtn {
    constructor(_fun, _text, _event = null, _class = "btn btn-primary btn-sm") {
        this.mFunction = _fun;
        this.mText = _text;
        this.mClass = _class;
        this.mEvent = _event;
    }
    mFunction = "";
    mText = "";
    mClass = "";
    mEvent = null;
}
var gObjectEditerBtn = new Array();
gObjectEditerBtn.push(new CObjectEditerBtn("SaveJSON", "Save", (_target) => {
    let para = [];
    para.push(_target.Key());
    return para;
}));
gObjectEditerBtn.push(new CObjectEditerBtn("LoadJSON", "Load", (_target) => {
    let para = [];
    return para;
}));
import CObject_imple from "../basic_impl/CObject.js";
CObject_imple();
