import { CDOM } from "../basic/CDOM.js";
import { CObject, CPointer } from "../basic/CObject.js";
import {CVec3} from "../geometry/CVec3.js"
import {CFloat32} from "./CFloat32.js";


export class CVec4 extends CFloat32
{
	constructor(_x : number|Array<number>=0 ,_y=0,_z=0,_w=0)
	{
		super();
		
		this.mF32A=new Float32Array(4);
		
		
		
		

		if(typeof _x=="number")
		{
			this.mF32A[0]=_x;
			this.mF32A[1]=_y;
			this.mF32A[2]=_z;
			this.mF32A[3]=_w;
		}
		else
		{
			for(let i=0;i<_x.length;++i)
				this.mF32A[i]=_x[i];	
		}
		


		
	}
	set x(_val : number)	{		this.mF32A[0]=_val;	}
	get x(){	return this.mF32A[0];	}
	set y(_val : number)	{		this.mF32A[1]=_val;	}
	get y(){	return this.mF32A[1];	}
	set z(_val : number)	{		this.mF32A[2]=_val;	}
	get z(){	return this.mF32A[2];	}
	set w(_val : number)	{		this.mF32A[3]=_val;	}
	get w(){	return this.mF32A[3];	}
	get xyz(){	return new CVec3(this.mF32A[0],this.mF32A[1],this.mF32A[2]);	}
	set xyz(_val : CVec3)	{		this.mF32A[0]=_val.mF32A[0];this.mF32A[1]=_val.mF32A[1];this.mF32A[2]=_val.mF32A[2];	}

	static Vec4(_x,_y,_z,_w)
	{
		gVec4.mF32A[0]=_x;
		gVec4.mF32A[1]=_y;
		gVec4.mF32A[2]=_z;
		gVec4.mF32A[3]=_w;
		

		return gVec4;
	}
	EditHTMLInit(_div: HTMLDivElement, _pointer?: CPointer): void {
			//super.EditHTMLInit(_div,_pointer);
			_div.innerHTML="";
			const self = this;
			const row = CDOM.DataToDom({
				"tag": "div","class": "d-flex align-items-center",
				"html": [
					{"tag": "input","type": "number","class": "form-control form-control-sm",
						"value": this.x,"onchange": (e: Event) => {
							const v = parseFloat((e.target as HTMLInputElement).value);
							if (!isNaN(v)) { this.x = v; if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") { _pointer.target.EditChange(_pointer, false); } }
						}
					},
					{"tag": "input","type": "number","class": "form-control form-control-sm",
						"value": this.y,"onchange": (e: Event) => {
							const v = parseFloat((e.target as HTMLInputElement).value);
							if (!isNaN(v)) { this.y = v; if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") { _pointer.target.EditChange(_pointer, false); } }
						}
					},
					{"tag": "input","type": "number","class": "form-control form-control-sm",
						"value": this.z,"onchange": (e: Event) => {
							const v = parseFloat((e.target as HTMLInputElement).value);
							if (!isNaN(v)) { this.z = v; if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") { _pointer.target.EditChange(_pointer, false); } }
						}
					},
					{"tag": "input","type": "number","class": "form-control form-control-sm",
						"value": this.w,"onchange": (e: Event) => {
							const v = parseFloat((e.target as HTMLInputElement).value);
							if (!isNaN(v)) { this.w = v; if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") { _pointer.target.EditChange(_pointer, false); } }
						}
					}
				]
			});
			_div.appendChild(row);
	
			// 마우스 다운 드래그로 값 조정 기능 추가
			const inputs = row.querySelectorAll('input[type="number"]');
			const setter = (vec: CVec4) => {
				this.x = vec.x;
				this.y = vec.y;
				this.z = vec.z;
				this.w = vec.w;
				if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") {
					_pointer.target.EditChange(_pointer, false);
				}
			};
			const getVec = () => new CVec4(
				parseFloat((inputs[0] as HTMLInputElement).value),
				parseFloat((inputs[1] as HTMLInputElement).value),
				parseFloat((inputs[2] as HTMLInputElement).value),
				parseFloat((inputs[3] as HTMLInputElement).value)
			);
			const MounsDownFun = (_event: MouseEvent) => {
				if (_event.button === 1) {
					_event.preventDefault();
					const ct = _event.currentTarget as HTMLInputElement;
					CObject.FocusInputNumberChange(ct, (_value: number) => {
						const vec = getVec();
						setter(vec);
					});
				}
			};
			(inputs[0] as HTMLInputElement).onmousedown = MounsDownFun;
			(inputs[1] as HTMLInputElement).onmousedown = MounsDownFun;
			(inputs[2] as HTMLInputElement).onmousedown = MounsDownFun;
			(inputs[3] as HTMLInputElement).onmousedown = MounsDownFun;
		}
}
var gVec4=new CVec4();

