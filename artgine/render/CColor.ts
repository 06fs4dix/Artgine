import { CDOM } from "../basic/CDOM.js";
import { CObject, CPointer } from "../basic/CObject.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CMat } from "../geometry/CMat.js";
import { CUtilColor } from "../geometry/CUtilColor.js";
import { CVec4 } from "../geometry/CVec4.js";
import { SDF } from "../z_file/SDF.js";

export class CColor extends CVec4
{
    constructor(_r : number=0, _g : number=0, _b : number=0, _model : number = SDF.eColorModel.None) {
        super(_r, _g, _b, _model);
        this.Snap(8);
    }
    static eModel=SDF.eColorModel;

    GetString() {
        if(this.mF32A[3] == SDF.eColorModel.RGBAdd || this.mF32A[3] == SDF.eColorModel.RGBMul) {
            return `rgb(${Math.round(255*this.mF32A[0])},${Math.round(255*this.mF32A[1])},${Math.round(255*this.mF32A[2])})`;
        }
        else if(this.mF32A[3] == SDF.eColorModel.HSV || this.mF32A[3] == SDF.eColorModel.HSVBaseHSPercent) {
            return `hsv(${Math.round(360*this.mF32A[0])},${Math.round(100*this.mF32A[1])},${Math.round(100*this.mF32A[2])})`;
        }
        else if(this.mF32A[3] == SDF.eColorModel.HSL) {
            return `hsl(${Math.round(360*this.mF32A[0])},${Math.round(100*this.mF32A[1])},${Math.round(100*this.mF32A[2])})`;
        }
        return "";
    }
    static Color(_r : number=0, _g : number=0, _b : number=0, _model : number = SDF.eColorModel.None)
    {
        gColor.mF32A[0]=_r;
        gColor.mF32A[1]=_g;
        gColor.mF32A[2]=_b;
        gColor.mF32A[3]=_model;

        return gColor;
    }
    ToRGBA()
    {
        //let inputColor = new CVec4(this.mF32A[0], this.mF32A[1], this.mF32A[2], this.mF32A[3]); // 유지되는 알파 포함
                
        if (this.mF32A[3] == SDF.eColorModel.HSVBaseHSPercent || this.mF32A[3] == SDF.eColorModel.HSV) 
            return CUtilColor.RGBAToHSVA(this);
        else if (this.mF32A[3] == SDF.eColorModel.HSL) 
            return CUtilColor.RGBAToHSLA(this);
        

        return this;
    }
    override EditHTMLInit(_div: HTMLDivElement,_pointer : CPointer=null): void {
        super.EditHTMLInit(_div,_pointer);
       
       
        let code="#ffffff";
        let color: CVec4;

        if (this.mF32A[3] == SDF.eColorModel.HSVBaseHSPercent || this.mF32A[3] == SDF.eColorModel.HSV) {
            color = CUtilColor.HSVAToRGBA(this);
        } else if (this.mF32A[3] == SDF.eColorModel.HSL) {
            color = CUtilColor.HSLAToRGBA(this);
        } else {
            color =this;
        }

        let tempKey=CUniqueID.GetHash();
        const r = Math.max(0, Math.min(255, Math.round(color.x * 255)));
        const g = Math.max(0, Math.min(255, Math.round(color.y * 255)));
        const b = Math.max(0, Math.min(255, Math.round(color.z * 255)));

        // HEX로 변환
        code = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

        _div.append(CDOM.DataToDom({"tag":"input","type":"color","class":"form-control form-control-color",
            "id":tempKey+"_color","value":code,"onchange":(e)=>{
                let value=CDOM.IDValue(tempKey+"_color");

                const r = parseInt(value.substring(1, 3), 16) / 255;
                const g = parseInt(value.substring(3, 5), 16) / 255;
                const b = parseInt(value.substring(5, 7), 16) / 255;

                const inputColor = new CVec4(r, g, b, this.w); // 유지되는 알파 포함
                
                if (this.mF32A[3] == SDF.eColorModel.HSVBaseHSPercent || this.mF32A[3] == SDF.eColorModel.HSV) {
                    this.xyz = CUtilColor.RGBAToHSVA(inputColor).xyz;
                } else if (this.mF32A[3] == SDF.eColorModel.HSL) {
                    this.xyz = CUtilColor.RGBAToHSLA(inputColor).xyz;
                } else {
                    this.xyz =inputColor.xyz;
                }
                this.EditChange(_pointer,false);
                //this.EditRefresh(_pointer);
            }
        }));
                
    

        let textArr = [], valArr = [];
        for(let [text, val] of Object.entries(SDF.eColorModel)) {
            textArr.push(text);
            valArr.push(val);
        }
        var select=document.createElement("select") as HTMLSelectElement;
        select.className="form-select";
        for(var i=0;i<textArr.length;++i)
        {
            var opt = document.createElement("option");
            opt.value=valArr[i];
            opt.text=textArr[i];
            if(this.mModel==valArr[i])
                opt.selected=true;
            select.add(opt);
        }
        select.onchange=(_event)=>{
            var ct=_event.currentTarget as HTMLSelectElement;
            this.mF32A[3] = valArr[ct.selectedIndex];
            this.EditChange(_pointer,false);
            //this.EditRefresh();
        };
        _div.append(select);
    }

    override EditChange(_pointer : CPointer,_child : boolean): void {
        super.EditChange(_pointer,_child);
        if(_pointer.member == "mF32A" && _pointer.key == 3) {
            this.EditRefresh();
        }
    }

    set r(_val : number)	{	this.mF32A[0]=_val;	}
    get r() {	return this.mF32A[0];	}
    set g(_val : number)	{	this.mF32A[1]=_val;	}
    get g() {	return this.mF32A[1];	}
    set b(_val : number)	{	this.mF32A[2]=_val;	}
    get b() {	return this.mF32A[2];	}
    set mModel(_val : number)	{	this.mF32A[3]=_val;	}
    get mModel() {	return this.mF32A[3];	}

    static black : CColor = new CColor(0, 0, 0);
    static blue : CColor = new CColor(0, 0, 1);
    static cyan : CColor = new CColor(0, 1, 1);
    static gray : CColor = new CColor(0.5, 0.5, 0.5);
    static green : CColor = new CColor(0, 1, 0);
    static grey : CColor = new CColor(0.5, 0.5, 0.5);
    static magenta : CColor = new CColor(1, 0, 1);
    static red : CColor = new CColor(1, 0, 0);
    static white : CColor = new CColor(1, 1, 1);
    static yellow : CColor = new CColor(1, 0.92, 0.016);
}
var gColor=new CColor(0,0,0,0);

