import { CDOM } from "../basic/CDOM.js";
import { CPointer } from "../basic/CObject.js";
import { CVec2 } from "../geometry/CVec2.js";
import { SDF } from "../z_file/SDF.js";

export class CAlpha extends CVec2
{
   
    constructor(_opacity : number=1, _cut : number = 0.1) {
        super(_opacity, _cut);
    }

    // EditHTMLInit(_div: HTMLDivElement,_pointer : CPointer=null): void {
    //     super.EditHTMLInit(_div,_pointer);
    //     let input = _div.lastChild as HTMLElement;

    //     _div.append(CDOM.DataToDom({"tag":"input","type":"range","class":"form-range",
    //         "min":"0","max":"1", "step":"0.05","value":this.mF32A[0],"onchange":(e)=>{
    //             let value=(e.target as HTMLInputElement).value;

    //             this.mF32A[0]=Number(value);
    //             this.EditChange(_pointer,false);
    //             //this.EditRefresh();
    //         }
    //     }));

    //     let textArr = [], valArr = [];
    //     for(let [text, val] of Object.entries(SDF.eAlphaModel)) {
    //         textArr.push(text);
    //         valArr.push(val);
    //     }
    //     var select=document.createElement("select") as HTMLSelectElement;
    //     select.className="form-select";
    //     for(var i=0;i<textArr.length;++i)
    //     {
    //         var opt = document.createElement("option");
    //         opt.value=valArr[i];
    //         opt.text=textArr[i];
    //         if(this.m_model==valArr[i])
    //             opt.selected=true;
    //         select.add(opt);
    //     }
    //     select.onchange=(_event)=>{
    //         var ct=_event.currentTarget as HTMLSelectElement;
    //         this.mF32A[1] = valArr[ct.selectedIndex];
    //         this.EditChange(_pointer,false);
    //     };
    //     _div.append(select);
    // }

    // set m_model(_val : number)	{	this.mF32A[1]=_val;	}
    // get m_model() {	return this.mF32A[1];	}
}