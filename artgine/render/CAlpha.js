import { CDOM } from "../basic/CDOM.js";
import { CVec2 } from "../geometry/CVec2.js";
import { SDF } from "../z_file/SDF.js";
export class CAlpha extends CVec2 {
    static eModel = SDF.eAlphaModel;
    constructor(_a = 1, _model = SDF.eAlphaModel.None) {
        super(_a, _model);
    }
    EditHTMLInit(_div, _pointer = null) {
        super.EditHTMLInit(_div, _pointer);
        let input = _div.lastChild;
        _div.append(CDOM.DataToDom({ "tag": "input", "type": "range", "class": "form-range",
            "min": "0", "max": "1", "step": "0.05", "value": this.mF32A[0], "onchange": (e) => {
                let value = e.target.value;
                this.mF32A[0] = Number(value);
                this.EditChange(_pointer, false);
            }
        }));
        let textArr = [], valArr = [];
        for (let [text, val] of Object.entries(SDF.eAlphaModel)) {
            textArr.push(text);
            valArr.push(val);
        }
        var select = document.createElement("select");
        select.className = "form-select";
        for (var i = 0; i < textArr.length; ++i) {
            var opt = document.createElement("option");
            opt.value = valArr[i];
            opt.text = textArr[i];
            if (this.m_model == valArr[i])
                opt.selected = true;
            select.add(opt);
        }
        select.onchange = (_event) => {
            var ct = _event.currentTarget;
            this.mF32A[1] = valArr[ct.selectedIndex];
            this.EditChange(_pointer, false);
        };
        _div.append(select);
    }
    set m_model(_val) { this.mF32A[1] = _val; }
    get m_model() { return this.mF32A[1]; }
}
