import {CDomFactory} from "../../basic/CDOMFactory.js";
import { CObject, CPointer } from "../../basic/CObject.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { CUtil } from "../../basic/CUtil.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import {CMat} from "../../geometry/CMat.js";
import { CUtilColor } from "../../geometry/CUtilColor.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CVec4} from "../../geometry/CVec4.js";
import { SDF } from "../../z_file/SDF.js";


export class CColor extends CVec4
{
    constructor(_r : number=0, _g : number=0, _b : number=0, _model : number = SDF.eColorModel.None) {
        super(_r, _g, _b, _model);
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

        _div.append(CDomFactory.DataToDom({"tag":"input","type":"color","class":"form-control form-control-color",
            "id":tempKey+"_color","value":code,"onchange":(e)=>{
                let value=CUtil.IDValue(tempKey+"_color");

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
                this.EditRefresh();
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
            this.EditRefresh();
        };
        _div.append(select);
    }

    EditChange(_pointer : CPointer,_childe : boolean): void {
        super.EditChange(_pointer,_childe);
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

export class CAlpha extends CVec2
{
    static eModel=SDF.eAlphaModel;
    constructor(_a : number=1, _model : number = SDF.eAlphaModel.None) {
        super(_a, _model);
    }

    EditHTMLInit(_div: HTMLDivElement,_pointer : CPointer=null): void {
        super.EditHTMLInit(_div,_pointer);
        let input = _div.lastChild as HTMLElement;

        _div.append(CDomFactory.DataToDom({"tag":"input","type":"range","class":"form-range",
            "min":"0","max":"1", "step":"0.05","value":this.mF32A[0],"onchange":(e)=>{
                let value=(e.target as HTMLInputElement).value;

                this.mF32A[0]=value;
                this.EditRefresh();
            }
        }));

        let textArr = [], valArr = [];
        for(let [text, val] of Object.entries(SDF.eAlphaModel)) {
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
            if(this.m_model==valArr[i])
                opt.selected=true;
            select.add(opt);
        }
        select.onchange=(_event)=>{
            var ct=_event.currentTarget as HTMLSelectElement;
            this.mF32A[1] = valArr[ct.selectedIndex];
            this.EditRefresh(_pointer);
        };
        _div.append(select);
    }

    set m_model(_val : number)	{	this.mF32A[1]=_val;	}
    get m_model() {	return this.mF32A[1];	}
}
type CDescription = {
    _xDesc? : string, _yDesc? : string, _zDesc? : string,
    _xMin? : number, _xMax? : number, _yMin? : number, _yMax? : number, _zMin? : number, _zMax? : number,
    _xStep? : number, _yStep? : number, _zStep? : number,
    _xDefault? : number, _yDefault? : number, _zDefault? : number
};
export class CColorVFX extends CMat
{
    constructor(_F32A : Float32Array|Array<number>=null)
    {
        super([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
    }
    m_description : CDescription[] = [
        {}, // None
        {	
            _xDesc:"Strength_X", _yDesc:"Strength_Y",
            _xMin:0, _xMax:0.5, _yMin:0, _yMax:0.5,
            _xStep:0.02, _yStep:0.02,
            _xDefault:0.05, _yDefault:0.05
        }, // 1 : Distort
        {	
            _xDesc:"Base_Strength", _yDesc:"Added_Strength",
            _xMin:0, _xMax:0.1, _yMin:0, _yMax:0.1,
            _xStep:0.01, _yStep:0.01,
            _xDefault:0.1, _yDefault:0.05
        }, // 2 : Aberrate
        {	
            _xDesc:"R", _yDesc:"G", _zDesc:"B",
            _xMin:0, _xMax:1, _yMin:0, _yMax:1, _zMin:0, _zMax:1,
            _xStep:0.1, _yStep:0.1, _zStep:0.1,
            _xDefault:1, _yDefault:0, _zDefault:0
        }, // 3 : Outline
        {	
            _xDesc:"Size_X", _yDesc:"Size_Y",
            _xMin:0, _xMax:10, _yMin:0, _yMax:10,
            _xStep:1, _yStep:1,
            _xDefault:2, _yDefault:2
        }, // 4 : Pixel
        {	
            _xDesc:"Speed", _yDesc:"Strength", _zDesc:"Size",
            _xMin:0, _xMax:10, _yMin:0, _yMax:0.5, _zMin:0, _zMax:10,
            _xStep:0.1, _yStep:0.05, _zStep:0.1,
            _xDefault:4, _yDefault:0.25, _zDefault:1
        }, // 5 : Noise
       
        {	
            _xDesc:"NumOfLines", _yDesc:"Speed",
            _xMin:0, _xMax:50, _yMin:0, _yMax:10,
            _xStep:5, _yStep:1,
            _xDefault:25, _yDefault:5
        }, // 7 : Scanline
        {	
            _xDesc:"", _yDesc:"", _zDesc:"",
            _xMin:0, _xMax:1, _yMin:0, _yMax:1, _zMin:0, _zMax:1,
            _xStep:0.1, _yStep:0.1, _zStep:0.1
        }, // 8 : Hologram
    ];

    override IsShould(_member: string, _type: CObject.eShould) 
    {
        if(_member == "m_description") {
            return false;
        }
        return super.IsShould(_member,_type);
    }

    EditHTMLInit(_div: HTMLDivElement): void {
        super.EditHTMLInit(_div);

        _div.innerHTML = "";

        let arr : [text : string, val : number][] = [];
        for(let [text, val] of Object.entries(SDF.eColorVFX)) {
            arr.push([text, val]);
        }

        for(let i = 0; i < arr.length; i++) {
            let [text, val] = arr[i];
            if(val == 0) continue;
            
            let checked = -1;
            for(let i = 0; i < 4; i++) {
                if(this.mF32A[i * 4 + 3] == val) {
                    checked = i;
                    break;
                }
            }
            let checkbox = {"<>":"div", "class":"form-check", "html":[
                {"<>":"input", "class":"form-check-input", "type":"checkbox", "id":"checkbox_" + text, "checked":checked != -1 ? " " : "", "onchange":(e) => {
                    if(!e.target.checked) {
                        this.mF32A[checked * 4 + 3] = 0;
                        //앞으로 한칸씩 당김
                        for(let k = checked; k < 4 - 1; k++) {
                            this.mF32A[k * 4 + 0] = this.mF32A[(k + 1) * 4 + 0];
                            this.mF32A[k * 4 + 1] = this.mF32A[(k + 1) * 4 + 1];
                            this.mF32A[k * 4 + 2] = this.mF32A[(k + 1) * 4 + 2];
                            this.mF32A[k * 4 + 3] = this.mF32A[(k + 1) * 4 + 3];
                        }
                        //가장 뒤는 0으로 초기화
                        this.mF32A[3 * 4 + 0] = 0;
                        this.mF32A[3 * 4 + 1] = 0;
                        this.mF32A[3 * 4 + 2] = 0;
                        this.mF32A[3 * 4 + 3] = 0;
                    }
                    else {
                        for(let j = 0; j < 4; j++) {
                            //뒤로 한칸씩 다 밈
                            if(this.mF32A[j * 4 + 3] > val) {
                                for(let k = 3; k > j; k--) {
                                    this.mF32A[k * 4 + 0] = this.mF32A[(k - 1) * 4 + 0];
                                    this.mF32A[k * 4 + 1] = this.mF32A[(k - 1) * 4 + 1];
                                    this.mF32A[k * 4 + 2] = this.mF32A[(k - 1) * 4 + 2];
                                    this.mF32A[k * 4 + 3] = this.mF32A[(k - 1) * 4 + 3];
                                }
                                this.mF32A[j * 4 + 3] = 0;
                            }
                            //0인 칸이면 채움
                            if(this.mF32A[j * 4 + 3] == 0) {
                                this.mF32A[j * 4 + 3] = val;
                                let description = this.m_description[i];
                                this.mF32A[j * 4 + 0] = description._xDefault||0;
                                this.mF32A[j * 4 + 1] = description._yDefault||0;
                                this.mF32A[j * 4 + 2] = description._zDefault||0;
                                break;
                            }
                        }
                    }
                    this.EditRefresh();
                }},
                {"<>":"label", "class":"form-check-label checkbox-label", "for":"checkbox_" + text, "text":text}
            ]};
            _div.appendChild(CDomFactory.DataToDom(checkbox));

            if(checked != -1) {
                let description = this.m_description[i];
                let sliders = [];
                if(description._xDesc) {
                    sliders.push({"<>":"label", "for":"xVal_" + text, "class":"form-label", "text":description._xDesc,id:'xVal_'+text+"_lab"});
                    sliders.push({"<>":"input", "type":"range", "class":"form-range", "style":"width:100%", "id":"xVal_" + text, "min":description._xMin||0, 
                        "max":description._xMax||1, "step":description._xStep||0.01, "value":this.mF32A[checked * 4 + 0], "oninput":(e) => {
                            let result = Number(e.target.value);
                            this.mF32A[checked * 4 + 0] = result;
                            let str=CUtil.ID(e.target.id+"_lab").innerText;
                            let pos=str.indexOf(":");
                            if(pos!=-1) str=str.substr(0,pos);
                            str+=":"+result;
                            CUtil.ID(e.target.id+"_lab").innerText=str;

                        }, "list":"xticks_" + text});
                    
                    let ticks = [];
                    let min = description._xMin||0;
                    let range = (description._xMax||1) - min;
                    let step = description._xStep||0.01;
                    let rDs = range / step;
                    for(let i = 0; i < rDs + 1; i++) {
                        ticks.push({"<>":"option", "value":min+step*i, "text":min+step*i});
                    }
                    sliders.push({"<>":"datalist", "id":"xticks_" + text, "html":ticks});
                }

                if(description._yDesc) {
                    sliders.push({"<>":"label", "for":"yVal_" + text, "class":"form-label", "text":description._yDesc,id:'yVal_'+text+"_lab"});
                    sliders.push({"<>":"input", "type":"range", "class":"form-range", "style":"width:100%", "id":"yVal_" + text, "min":description._yMin||0, 
                        "max":description._yMax||0, "step":description._yStep||0.01, "value":this.mF32A[checked * 4 + 1], "oninput":(e) => {
                            let result = Number(e.target.value);
                            this.mF32A[checked * 4 + 1] = result;

                            let str=CUtil.ID(e.target.id+"_lab").innerText;
                            let pos=str.indexOf(":");
                            if(pos!=-1) str=str.substr(0,pos);
                            str+=":"+result;
                            CUtil.ID(e.target.id+"_lab").innerText=str;

                        }, "list":"yticks_" + text});

                    let ticks = [];
                    let min = description._yMin||0;
                    let range = (description._yMax||1) - min;
                    let step = description._yStep||0.01;
                    let rDs = range / step;
                    for(let i = 0; i < rDs + 1; i++) {
                        ticks.push({"<>":"option", "value":min+step*i, "text":min+step*i});
                    }
                    sliders.push({"<>":"datalist", "id":"yticks_" + text, "html":ticks});
                }

                if(description._zDesc) {
                    sliders.push({"<>":"label", "for":"zVal_" + text, "class":"form-label", "text":description._zDesc,id:'zVal_'+text+"_lab"});
                    sliders.push({"<>":"input", "type":"range", "class":"form-range", "style":"width:100%", "id":"zVal_" + text, "min":description._zMin||0, 
                        "max":description._zMax||0, "step":description._zStep||0.01, "value":this.mF32A[checked * 4 + 2], "oninput":(e) => {
                            let result = Number(e.target.value);
                            this.mF32A[checked * 4 + 2] = result;

                            let str=CUtil.ID(e.target.id+"_lab").innerText;
                            let pos=str.indexOf(":");
                            if(pos!=-1) str=str.substr(0,pos);
                            str+=":"+result;
                            CUtil.ID(e.target.id+"_lab").innerText=str;

                        }, "list":"zticks_" + text});

                    let ticks = [];
                    let min = description._zMin||0;
                    let range = (description._zMax||1) - min;
                    let step = description._zStep||0.01;
                    let rDs = range / step;
                    for(let i = 0; i < rDs + 1; i++) {
                        ticks.push({"<>":"option", "value":min+step*i, "text":min+step*i});
                    }
                    sliders.push({"<>":"datalist", "id":"zticks_" + text, "html":ticks});
                }
                let slider = {"<>":"div", "id":"controls_" + text, "html":sliders};
                _div.appendChild(CDomFactory.DataToDom(slider));
            }
        }
    }
}