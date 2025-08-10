import { CClass } from "./CClass.js";
import { CDomFactory } from "./CDOMFactory.js";
import { CEvent } from "./CEvent.js";
import { CString } from "./CString.js";
export class CDrop {
    mFiles;
    mPaths;
    mObject;
    mX;
    mY;
}
export class CModalTitleBar {
    constructor(_parent, _key, _event = null) {
        this.mParent = _parent;
        this.mKey = _key;
        this.mEvent = CEvent.ToCEvent(_event);
    }
    mParent = "";
    mKey = "";
    mEvent;
}
var gIndex = -1;
export class CModal {
    static FindModal(_key) {
        return null;
    }
    static GetModalList() {
        return null;
    }
    static Index() { return gIndex; }
    ;
    mResizeObserver;
    mKey = "";
    mSort = CModal.eSort.Auto;
    mZIndex = 1000;
    mCloseToHide = false;
    mOT = null;
    mOL = null;
    mOW = 0;
    mOH = 0;
    mCard = null;
    mHeader = null;
    mBody = null;
    mOverlayDiv = null;
    mBodyClose = false;
    mTitle = CModal.eTitle.TextFullClose;
    mDrag = true;
    mLimitPush = false;
    mFull = false;
    mResize = true;
    mOverlay = false;
    mHeaderData = null;
    mBodyData = null;
    mBG = null;
    mWindow = null;
    mEventMap = new Map();
    mShow = true;
    mDebugMode = null;
    mPause = true;
    constructor(_key = null) {
        this.mKey = _key;
        if (this.mKey == null) {
            this.mTitle = CModal.eTitle.None;
            this.mResize = false;
            this.mLimitPush = true;
        }
        this.mZIndex = gIndex;
        gIndex -= 1;
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
    On(_key, _event, _target = null) {
        this.mEventMap.set(_key, CEvent.ToCEvent(_event));
    }
    Off(_key, _target) {
    }
    GetEvent(_key, _target = null) {
        return this.mEventMap.get(_key);
    }
    IsShow() {
        return this.mShow;
    }
    SetCloseToHide(_enable) {
        this.mCloseToHide = _enable;
    }
    IsPause() {
        return this.mPause;
    }
    Update(_delay) { }
    Key() {
        if (this.mKey == null)
            this.mKey = CUniqueID.Get();
        return this.mKey;
    }
    SetPause(_enable) {
        this.mPause = _enable;
    }
    SetBG(_bg) {
        this.mBG = _bg;
    }
    SetBodyClose(_enable) {
        this.mBodyClose = _enable;
    }
    SetResize(_enable) {
        this.mResize = _enable;
    }
    SetBody(_data) {
        if (this.mBody == null) {
            this.mBodyData = _data;
        }
        else {
            this.mBody.innerHTML = "";
            this.mBody.append(CDomFactory.DataToDom(_data));
        }
    }
    SetHeader(_html) {
        if (this.mHeader == null) {
            this.mHeaderData = _html;
        }
        else {
            if (typeof _html == "string")
                this.mHeader.innerHTML = _html;
            else {
                this.mHeader.innerHTML = "";
                this.mHeader.append(_html);
            }
        }
    }
    SetZIndex(_sort, _index = 1000) {
        this.mSort = _sort;
        switch (_sort) {
            case CModal.eSort.Manual:
                this.mZIndex = _index;
                break;
            case CModal.eSort.Auto:
                this.mZIndex = this.mZIndex;
                break;
            case CModal.eSort.Top:
                this.mZIndex = CModal.eSort.Top;
                break;
        }
    }
    FullSwitch(_enable = null) {
    }
    SetOverlay(_overlay) {
        this.mOverlay = _overlay;
    }
    SetSize(_width, _height) {
        if (typeof _width === "string" && _width.endsWith("%")) {
            const percent = parseFloat(_width) / 100;
            _width = window.innerWidth * percent;
        }
        if (typeof _height === "string" && _height.endsWith("%")) {
            const percent = parseFloat(_height) / 100;
            _height = window.innerHeight * percent;
        }
        this.mOW = _width;
        this.mOH = _height;
        if (this.mCard != null) {
            this.mCard.style.width = this.mOW + "px";
            this.mCard.style.maxWidth = this.mOW + "px";
            this.mCard.style.height = this.mOH + "px";
            this.mCard.style.maxHeight = this.mOH + "px";
            if (this.mLimitPush)
                this.LimitPushChk();
        }
    }
    GetBody() { return this.mBody; }
    GetHeader() { return this.mHeader; }
    SetTitle(_type) {
        this.mTitle = _type;
    }
    Close(_delayTime = 0) {
    }
    Hide(_animationTime = 300) {
        this.mShow = false;
        if (this.mOverlayDiv != null)
            this.mOverlayDiv.style.display = "none";
        if (this.mCard) {
            this.mCard.style.transition = `opacity ${_animationTime}ms ease-out, transform ${_animationTime}ms ease-out`;
            this.mCard.style.opacity = "0";
            this.mCard.style.transform = "scale(0.95)";
            if (_animationTime == 0) {
                this.mCard.style.display = "none";
            }
            else {
                setTimeout(() => {
                    this.mCard.style.display = "none";
                }, _animationTime);
            }
        }
    }
    Show() {
        if (this.mShow)
            return;
        this.mShow = true;
        if (this.mOverlayDiv != null)
            this.mOverlayDiv.style.display = "";
        if (this.mCard) {
            this.mCard.style.display = "";
            setTimeout(() => {
                if (this.mCard == null)
                    return;
                this.mCard.style.opacity = "1";
                this.mCard.style.transform = "scale(1)";
                this.mBody.style.width = "100%";
                this.mBody.style.height = "100%";
            }, 10);
        }
    }
    Open(_startPos = CModal.ePos.Random) {
    }
    SetPosition(_x, _y = null) {
    }
    SetLimitPush(_push) {
        this.mLimitPush = _push;
    }
    LimitPushChk() {
        if (this.mOW == 0 && this.mCard.offsetWidth != 0)
            this.mOW = this.mCard.offsetWidth + 3;
        if (this.mOH == 0 && this.mCard.offsetHeight != 0)
            this.mOH = this.mCard.offsetHeight;
        let w = window.innerWidth;
        let h = window.innerHeight;
        let right = this.mCard.offsetLeft + this.mOW;
        let bottom = this.mCard.offsetTop + this.mOH;
        if (this.mOW > w)
            this.mCard.style.width = w + "px";
        else
            this.mCard.style.width = this.mOW + "px";
        if (this.mOH > h)
            this.mCard.style.height = h + "px";
        else
            this.mCard.style.height = this.mOH + "px";
        if (w < right)
            this.mCard.style.left = (w - this.mOW) + "px";
        else if (0 > this.mCard.offsetLeft) {
            this.mCard.style.left = "0px";
        }
        if (h < bottom)
            this.mCard.style.top = (h - this.mOH) + "px";
        else if (0 > this.mCard.offsetTop) {
            this.mCard.style.top = "0px";
        }
    }
    Focus(_action) {
    }
    static ListShow(_div = null) {
    }
    static PushTitleBar(_tb) {
    }
}
(function (CModal) {
    let eTitle;
    (function (eTitle) {
        eTitle[eTitle["None"] = -1] = "None";
        eTitle[eTitle["Text"] = 0] = "Text";
        eTitle[eTitle["TextClose"] = 1] = "TextClose";
        eTitle[eTitle["TextFullClose"] = 2] = "TextFullClose";
        eTitle[eTitle["TextMinFullClose"] = 3] = "TextMinFullClose";
        eTitle[eTitle["Window"] = 5] = "Window";
    })(eTitle = CModal.eTitle || (CModal.eTitle = {}));
    let eSort;
    (function (eSort) {
        eSort[eSort["Auto"] = 1000] = "Auto";
        eSort[eSort["Manual"] = 0] = "Manual";
        eSort[eSort["Top"] = 10000] = "Top";
    })(eSort = CModal.eSort || (CModal.eSort = {}));
    let ePos;
    (function (ePos) {
        ePos[ePos["Center"] = 0] = "Center";
        ePos[ePos["Stair"] = 1] = "Stair";
        ePos[ePos["Random"] = 2] = "Random";
        ePos[ePos["TopLeft"] = 3] = "TopLeft";
        ePos[ePos["TopRight"] = 4] = "TopRight";
        ePos[ePos["BottomLeft"] = 5] = "BottomLeft";
        ePos[ePos["BottomRight"] = 6] = "BottomRight";
    })(ePos = CModal.ePos || (CModal.ePos = {}));
    let eAction;
    (function (eAction) {
        eAction[eAction["None"] = 0] = "None";
        eAction[eAction["Shake"] = 1] = "Shake";
        eAction[eAction["FadeIn"] = 2] = "FadeIn";
        eAction[eAction["Bounce"] = 3] = "Bounce";
        eAction[eAction["SlideUp"] = 4] = "SlideUp";
        eAction[eAction["SlideDown"] = 5] = "SlideDown";
    })(eAction = CModal.eAction || (CModal.eAction = {}));
})(CModal || (CModal = {}));
export class CConfirm extends CModal {
    m_footer;
    m_eventList = new Array();
    m_textList = new Array();
    m_themaList = new Array();
    static List(_body, _eventList, _text = new Array()) {
        let list = new CConfirm();
        list.SetBody(_body);
        if (_eventList.length == 1)
            list.SetConfirm(CConfirm.eConfirm.OK, _eventList, _text);
        else if (_eventList.length == 2)
            list.SetConfirm(CConfirm.eConfirm.YesNo, _eventList, _text);
        else
            list.SetConfirm(CConfirm.eConfirm.List, _eventList, _text);
        list.SetZIndex(CModal.eSort.Top);
        list.Open();
        return list;
    }
    SetConfirm(_type, _eventList, _text = new Array()) {
        if (_type == CConfirm.eConfirm.OK) {
            this.m_eventList[0] = CEvent.ToCEvent(_eventList[0]);
            this.m_textList[0] = _text[0];
            if (this.m_textList[0] == null)
                this.m_textList[0] = "OK";
            this.m_themaList[0] = "btn btn-primary";
        }
        else if (_type == CConfirm.eConfirm.YesNo) {
            this.m_eventList[0] = CEvent.ToCEvent(_eventList[0]);
            this.m_textList[0] = _text[0];
            if (this.m_textList[0] == null)
                this.m_textList[0] = "Yes";
            this.m_themaList[0] = "btn btn-primary";
            this.m_eventList[1] = CEvent.ToCEvent(_eventList[1]);
            this.m_textList[1] = _text[1];
            if (this.m_textList[1] == null)
                this.m_textList[1] = "No";
            this.m_themaList[1] = "btn btn-danger";
        }
        else {
            for (let i = 0; i < _text.length; ++i) {
                this.m_eventList[i] = CEvent.ToCEvent(_eventList[i]);
                this.m_textList[i] = _text[i];
                this.m_themaList[i] = "btn btn-success";
            }
        }
    }
    Open(_startPos = CModal.ePos.Center) {
        this.mResize = false;
        this.mLimitPush = true;
        super.Open(_startPos);
        this.m_footer = document.createElement("div");
        this.m_footer.className = "card-footer text-muted p-1";
        let buttonContainer = document.createElement("div");
        buttonContainer.className = "d-flex justify-content-between";
        for (let i = 0; i < this.m_textList.length; ++i) {
            let event = this.m_eventList[i];
            let button = document.createElement("button");
            button.textContent = this.m_textList[i];
            button.className = this.m_themaList[i];
            if (i != 0)
                button.className += button.className + " ms-2";
            button.onclick = () => {
                if (event) {
                    event.Call(this.m_textList[i]);
                }
                this.Close();
            };
            buttonContainer.appendChild(button);
        }
        this.m_footer.appendChild(buttonContainer);
        this.mCard.appendChild(this.m_footer);
        this.SetPosition(CModal.ePos.Center);
    }
}
(function (CConfirm) {
    let eConfirm;
    (function (eConfirm) {
        eConfirm[eConfirm["OK"] = 1] = "OK";
        eConfirm[eConfirm["YesNo"] = 2] = "YesNo";
        eConfirm[eConfirm["List"] = 3] = "List";
    })(eConfirm = CConfirm.eConfirm || (CConfirm.eConfirm = {}));
})(CConfirm || (CConfirm = {}));
import CModal_imple from "../basic_impl/CModal.js";
import { CUniqueID } from "./CUniqueID.js";
CModal_imple();
