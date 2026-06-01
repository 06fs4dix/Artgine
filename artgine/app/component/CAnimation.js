import { CClass } from "../../basic/CClass.js";
import { CDOM } from "../../basic/CDOM.js";
import { CObject } from "../../basic/CObject.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CAlpha } from "../../render/CAlpha.js";
import { CColor } from "../../render/CColor.js";
import { CVFX } from "../../render/CVFX.js";
import { CBase64File } from "../../util/CBase64File.js";
import { CCurve } from "../../util/CCurve.js";
export class CClip extends CObject {
    mTime;
    mDelay;
    constructor(_time = 0, _delay = 0) {
        super();
        this.mTime = _time;
        this.mDelay = _delay;
    }
    GetCClipType() { }
}
;
export class CClipImg extends CClip {
    mImg;
    mAutoCreate = true;
    constructor(_time, _delay, _img = "") {
        super(_time, _delay);
        this.mImg = _img;
    }
}
;
export class CClipCoodi extends CClip {
    mSTX;
    mSTY;
    mEDX;
    mEDY;
    m2DScale;
    constructor(_time, _delay, _stX = 0, _stY = 0, _edX = 0, _edY = 0, _2DScale = new CVec2(1, 1)) {
        super(_time, _delay);
        this.mSTX = _stX;
        this.mSTY = _stY;
        this.mEDX = _edX;
        this.mEDY = _edY;
        this.m2DScale = _2DScale;
    }
}
;
export class CClipColor extends CClip {
    mSTColor;
    mEDColor;
    mCurve = new CCurve();
    constructor(_time, _delay, _st = new CColor, _ed = new CColor) {
        super(_time, _delay);
        this.mSTColor = _st;
        this.mEDColor = _ed;
    }
}
;
export class CClipAlpha extends CClip {
    mSTAlpha;
    mEDAlpha;
    mCurve = new CCurve();
    constructor(_time, _delay, _st = new CAlpha, _ed = new CAlpha) {
        super(_time, _delay);
        this.mSTAlpha = _st;
        this.mEDAlpha = _ed;
    }
}
;
export class CClipVFX extends CClip {
    mSTVFX;
    mEDVFX;
    mCurve = new CCurve();
    constructor(_time, _delay, _st = new CVFX, _ed = new CVFX) {
        super(_time, _delay);
        this.mSTVFX = _st;
        this.mEDVFX = _ed;
    }
}
;
export class CClipPRS extends CClip {
    static eType = {
        Pos: 0,
        Rot: 1,
        Sca: 2,
    };
    mValue = new Array();
    mPRSType = 0;
    mCurve = new CCurve();
    mBezierRangeX = -1;
    mBezierRangeY = -1;
    constructor(_time, _delay, _value0 = new Array(), _value1 = 0, _value2 = 0) {
        super(_time, _delay);
        if (_value0 instanceof CVec3) {
            this.mValue.push(_value0);
            this.mValue.push(_value1);
            this.mPRSType = _value2;
        }
        else {
            this.mValue = _value0;
            this.mPRSType = _value1;
        }
    }
    EditForm(_pointer, _div, _input) {
        if (_pointer.member == "mPRSType") {
            let textArr = [], valArr = [];
            for (let [text, val] of Object.entries(CClipPRS.eType)) {
                textArr.push(text);
                valArr.push(val);
            }
            _div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
        }
        else if (_pointer.member == "mValue") {
            CUtilObj.ArrayAddSelectList(_pointer, _div, _input, [new CVec3()]);
        }
    }
}
export class CClipMesh extends CClip {
    mST;
    mED;
    mMesh;
    mAutoCreate = true;
    mBake = false;
    constructor(_time, _delay, _st, _ed = null, _mesh = null) {
        super(_time, _delay);
        if (typeof _st == "number")
            this.mST = _st;
        else
            this.mST = _st;
        if (_ed != null) {
            if (typeof _ed == "number")
                this.mED = _ed;
            else
                this.mMesh = _ed;
        }
        if (_mesh != null) {
            this.mMesh = _mesh;
        }
    }
    WTForm(_pointer, _div, _input) {
        if (_pointer.member == "mST") {
            let val = typeof (_pointer.member) == "string" ? 0 : 1;
            _div.insertBefore(CDOM.DataToDom({
                '<>': 'select', 'class': 'form-select', 'style': 'width:100%;', 'html': [
                    { '<>': 'option', 'text': 'AniKey', 'value': 0, 'selected': val == 0 ? ' ' : null },
                    { '<>': 'option', 'text': 'Start-End', 'value': 1, 'selected': val == 1 ? ' ' : null }
                ], 'onchange': (e) => {
                    _div.removeChild(_div.lastChild);
                    let target = e.target;
                    if (target.value == "0") {
                        _div.append(CDOM.DataToDom({
                            '<>': 'input', 'class': 'form-control', 'type': 'string', "placeholder": "AniKey", 'onchange': (e) => {
                                this.mST = target.value;
                            }
                        }));
                    }
                    else {
                        _div.append(CDOM.DataToDom({
                            '<>': 'input', 'class': 'form-control', 'type': 'number', "placeholder": "start", 'onchange': (e) => {
                                this.mST = Number(target.value);
                            }
                        }));
                        _div.append(CDOM.DataToDom({
                            '<>': 'input', 'class': 'form-control', 'type': 'number', "placeholder": "end", 'onchange': (e) => {
                                this.mED = Number(target.value);
                            }
                        }));
                    }
                }
            }), _input);
        }
    }
}
;
export class CClipDestroy extends CClip {
    mSubject = true;
    constructor(_time, _subject = true) {
        super(_time, 1);
        this.mSubject = _subject;
    }
}
;
export class CClipShaderAttr extends CClip {
    mKey;
    mST;
    mED;
    mCurve = new CCurve();
    constructor(_time, _delay, _key, _st, _ed) {
        super(_time, _delay);
        this.mKey = _key;
        this.mST = _st;
        this.mED = _ed;
    }
}
;
export class CClipForce extends CClip {
    mForce;
    constructor(_time, _force) {
        super(_time, 1);
        this.mForce = _force;
    }
}
export class CClipBase64 extends CClip {
    mBase64File;
    constructor(_time, _data = new CBase64File()) {
        super(_time, 0);
        this.mBase64File = _data;
    }
}
;
export class CClipAudio extends CClip {
    mAudio = "";
    mSpeed = 1;
    mVolume = 1;
}
export class CClipVideo extends CClip {
    mSource;
    mRes;
    constructor(_time, _delay, _source = "", _ctexture_cres = "") {
        super(_time, _delay);
        this.mSource = _source;
        this.mRes = _ctexture_cres;
    }
}
;
export class CAnimation extends CObject {
    mLoop;
    mClip;
    constructor(_clip = new Array()) {
        super();
        this.mLoop = true;
        this.mClip = _clip;
    }
    Push(_clip) {
        if (_clip.mDelay < 0)
            _clip.mDelay = 0;
        if (_clip.mTime == -1) {
            if (this.mClip.length > 0)
                _clip.mTime = this.mClip[this.mClip.length - 1].mTime + this.mClip[this.mClip.length - 1].mDelay;
            else
                _clip.mTime = 0;
        }
        var pOff = this.mClip.length;
        for (var i = 0; i < this.mClip.length; ++i) {
            if (this.mClip[i].mTime > _clip.mTime) {
                pOff = i;
                break;
            }
            else if (this.mClip[i].mTime == _clip.mTime) {
                if (this.mClip[i].mDelay > _clip.mDelay) {
                    pOff = i;
                    break;
                }
            }
        }
        this.mClip.splice(pOff, 0, _clip);
        return _clip;
    }
    Sort() {
        for (var i = 0; i < this.mClip.length; ++i) {
            for (var j = i; j < this.mClip.length; ++j) {
                if (this.mClip[i].mTime > this.mClip[j].mTime) {
                    var dummy = this.mClip[j];
                    this.mClip[j] = this.mClip[i];
                    this.mClip[i] = dummy;
                }
            }
        }
    }
    ClicpTimeCac() {
        for (var i = 0; i < this.mClip.length; ++i) {
            if (this.mClip[i].mTime == -1) {
                if (i == 0) {
                    this.mClip[i].mTime = 0;
                }
                else {
                    this.mClip[i].mTime = this.mClip[i - 1].mTime + this.mClip[i].mDelay;
                }
            }
        }
    }
    EditChange(_pointer, _childe) {
        super.EditChange(_pointer, _childe);
        if (_pointer.member == "mClip" || _pointer.member == "mTime") {
            this.Sort();
            this.EditRefresh();
        }
    }
    EditForm(_pointer, _body, _input) {
        if (_pointer.member == "mClip")
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, CClass.ExtendsList(CClip));
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        if (window["AniTool"] != null) {
            var button = CDOM.TagToDom("button");
            button.innerText = "AniTool";
            button.onclick = () => {
                window["AniTool"](this);
            };
            _div.append(button);
        }
    }
    Icon() {
        return "bi bi-fast-forward-circle";
    }
}
;
