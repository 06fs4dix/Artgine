import { CDomFactory } from "../basic/CDOMFactory.js";
import { CFloat32 } from "./CFloat32.js";
import { CObject } from "../basic/CObject.js";
export class CVec1 extends CFloat32 {
    constructor(_x = 0) {
        super();
        this.mF32A = new Float32Array(1);
        this.mF32A[0] = _x;
    }
    set x(_val) { this.mF32A[0] = _val; }
    get x() { return this.mF32A[0]; }
    EditHTMLInit(_div, _pointer) {
        _div.innerHTML = "";
        const self = this;
        const row = CDomFactory.DataToDom({
            "tag": "div", "class": "d-flex align-items-center gap-2 mb-1",
            "html": [
                { "tag": "input", "type": "number", "class": "form-control form-control-sm",
                    "value": this.x, "onchange": (e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) {
                            this.x = v;
                            if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") {
                                _pointer.target.EditChange(_pointer, false);
                            }
                        }
                    }
                },
            ]
        });
        _div.appendChild(row);
        const input = row.querySelector('input[type="number"]');
        const setter = (vec) => {
            this.x = vec.x;
            if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") {
                _pointer.target.EditChange(_pointer, false);
            }
        };
        const getVec = () => new CVec1(parseFloat(input.value));
        const MounsDownFun = (_event) => {
            if (_event.button === 1) {
                _event.preventDefault();
                const ct = _event.currentTarget;
                CObject.FocusInputNumberChange(ct, (_value) => {
                    const vec = getVec();
                    setter(vec);
                });
            }
        };
        input.onmousedown = MounsDownFun;
    }
}
