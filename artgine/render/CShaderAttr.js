import { CVec1 } from "../geometry/CVec1.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CMat } from "../geometry/CMat.js";
import { CObject, CPointer } from "../basic/CObject.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CDOM } from "../basic/CDOM.js";
import { CAlert } from "../basic/CAlert.js";
import { SDF } from "../z_file/SDF.js";
export class CShaderAttr extends CObject {
    mKey = "";
    mData = null;
    mEach = 0;
    mType = 0;
    mTag = null;
    constructor(_keyOff, _countValue, _val0 = null, _val1 = null, _val2 = null, _val3 = null) {
        super();
        if (_keyOff == null)
            return;
        else if (typeof _keyOff == "number") {
            this.mEach = _keyOff;
            this.mKey = _countValue;
            this.mData = _val0;
            this.mType = -2;
        }
        else {
            this.mKey = _keyOff;
            if (_val0 == null) {
                this.mEach = 0;
                this.mData = _countValue;
                if (_countValue instanceof CVec4)
                    this.mType = 4;
                else if (_countValue instanceof CVec3)
                    this.mType = 3;
                else if (_countValue instanceof CVec2)
                    this.mType = 2;
                else if (_countValue instanceof CMat)
                    this.mType = 16;
                else {
                    this.mType = 1;
                    if (typeof _countValue == "number")
                        this.mData = new CVec1(_countValue);
                }
            }
            else {
                this.mEach = _countValue;
                this.mType = -1;
                if (_val0 instanceof Array || _val0 instanceof Float32Array) {
                    this.mData = _val0;
                    if (_val0 instanceof Array) {
                        let fa = new Float32Array(this.mData.length);
                        for (let i = 0; i < this.mData.length; ++i) {
                            if (typeof this.mData[i] == "string") {
                                const parts = this.mData[i].split(".");
                                let val = { SDF };
                                for (const p of parts)
                                    val = val?.[p];
                                if (typeof val === "number")
                                    fa[i] = val;
                                else
                                    CAlert.E("SDF resolve error: " + this.mData[i]);
                            }
                            else
                                fa[i] = this.mData[i];
                        }
                        this.mData = fa;
                    }
                }
                else {
                    this.mData = new Array();
                    this.mData.push(_val0);
                    if (_val1 != null)
                        this.mData.push(_val1);
                    if (_val2 != null)
                        this.mData.push(_val2);
                    if (_val3 != null)
                        this.mData.push(_val3);
                    this.mData;
                    let fa = new Float32Array(this.mData.length);
                    for (let i = 0; i < this.mData.length; ++i) {
                        fa[i] = this.mData[i];
                    }
                    this.mData = fa;
                }
            }
        }
    }
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member == "mData" && this.mType == -2) {
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [false]);
        }
    }
    ToLog() {
        let str = this.mKey + "/";
        switch (this.mType) {
            case -2:
                str += "Tex" + this.mEach;
                break;
            case 1:
            case 2:
            case 3:
            case 4:
            case 16:
                {
                    for (let i = 0; i < this.mData.mF32A.length; ++i)
                        str += this.mData.mF32A[i] + ",";
                }
                break;
            case -1:
                {
                    let arr = this.mData.mF32A;
                    if (arr == null)
                        arr = this.mData;
                    for (let i = 0; i < arr.length; ++i)
                        str += arr[i] + ",";
                }
                break;
        }
        return str;
    }
    EditHTMLInit(_div, _pointer) {
        let KeyInputFun = () => {
            const keyRow = CDOM.DataToDom({
                "tag": "div", "class": "d-flex align-items-center",
                "html": [
                    { "tag": "div", "class": "text-danger ps-1 pe-1", "text": "mKey" },
                    {
                        "tag": "input", "type": "text", "class": "form-control form-control-sm",
                        "value": this.mKey,
                        "onchange": (e) => {
                            const v = e.target.value ?? "";
                            this.mKey = v;
                            if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") {
                                const keyPtr = new CPointer(this, "mKey");
                                keyPtr.refArr.push(..._pointer.refArr);
                                _pointer.target.EditChange(keyPtr, false);
                            }
                        }
                    }
                ]
            });
            _div.prepend(keyRow);
        };
        let str = "";
        switch (this.mType) {
            case -2: break;
            case 1:
            case 2:
            case 3:
            case 4:
            case 16:
                {
                    _div.innerHTML = "";
                    let pointer = new CPointer(this, "mData");
                    pointer.refArr.push(..._pointer.refArr);
                    this.mData.EditHTMLInit(_div, pointer);
                    KeyInputFun();
                }
                break;
            case -1:
                {
                }
                break;
        }
    }
}
;
