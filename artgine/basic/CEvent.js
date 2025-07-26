import { CClass } from "./CClass.js";
export class CEvent {
    mKey = null;
    mStop = false;
    mEvent = null;
    mClass = null;
    constructor(a = null, b = null, c = null) {
        if (typeof a === "function" || typeof a === "string") {
            this.mEvent = a;
        }
        if (typeof b === "object") {
            this.mClass = b;
            this.mKey = c;
        }
        else {
            this.mKey = b;
        }
    }
    static Default() { return gEvent; }
    ;
    static ToCEvent(_e, _type = null) {
        if (_e == null)
            return new CEvent();
        if (_e instanceof CEvent) {
            if (_type != null)
                _e.mKey = _type;
            return _e;
        }
        return new CEvent(_e, _type);
    }
    GetKey() {
        return this.mKey;
    }
    Stop() {
        this.mStop = true;
    }
    Play() {
        this.mStop = false;
    }
    SetClass(_class) {
        this.mClass = _class;
    }
    Call(..._args) {
        if (this.mEvent == null)
            return null;
        const argArray = _args.length === 1 && Array.isArray(_args[0]) ? _args[0] : _args;
        if (typeof this.mEvent === "string") {
            return CClass.Call(this.mClass, this.mEvent, argArray);
        }
        else {
            if (this.mClass != null) {
                return this.mEvent.call(this.mClass, ...argArray);
            }
            else {
                return this.mEvent(...argArray);
            }
        }
    }
    async CallAsync(..._args) {
        if (this.mEvent == null)
            return;
        const argArray = _args.length === 1 && Array.isArray(_args[0]) ? _args[0] : _args;
        if (typeof this.mEvent === "string") {
            return CClass.Call(this.mClass, this.mEvent, argArray);
        }
        else {
            if (this.mClass != null) {
                return await this.mEvent.call(this.mClass, ...argArray);
            }
            else {
                return await this.mEvent(...argArray);
            }
        }
    }
    IsCall() {
        return (this.mClass != null || this.mEvent != null) == true && this.mStop == false;
    }
}
(function (CEvent) {
    let eType;
    (function (eType) {
        eType["Load"] = "Load";
        eType["Init"] = "Init";
        eType["Update"] = "Update";
        eType["Render"] = "Render";
        eType["Resize"] = "Resize";
        eType["SubUpdate"] = "SubUpdate";
        eType["LoadUpdate"] = "LoadUpdate";
        eType["RenderXR"] = "RenderXR";
        eType["Freeze"] = "Freeze";
        eType["Resume"] = "Resume";
        eType["Null"] = "null";
        eType["Click"] = "click";
        eType["Press"] = "press";
        eType["Pick"] = "pick";
        eType["LongPress"] = "lpress";
        eType["DoubleClick"] = "dbclick";
        eType["Open"] = "Open";
        eType["Close"] = "Close";
        eType["Drop"] = "Drop";
        eType["Chat"] = "Chat";
        eType["Connect"] = "Connect";
        eType["Message"] = "Message";
    })(eType = CEvent.eType || (CEvent.eType = {}));
    ;
})(CEvent || (CEvent = {}));
CEvent.eType = CEvent.eType;
var gEvent = new CEvent();
