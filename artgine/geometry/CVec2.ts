import { CDomFactory } from "../basic/CDOMFactory.js";
import { CPointer } from "../basic/CObject.js";
import {CWASM} from "../basic/CWASM.js";
import {CFloat32} from "./CFloat32.js";
import { CObject } from "../basic/CObject.js";

export class CVec2 extends CFloat32
{

	constructor();
	constructor(_arr : Array<number>);
	constructor(_x : number,_y : number);
	constructor(_x : number|Array<number>=0 ,_y=0)
	{
		super();
		this.mF32A=new Float32Array(2);

		if(typeof _x=="number")
		{
			this.mF32A[0]=_x;
			this.mF32A[1]=_y;
	
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

	EditHTMLInit(_div: HTMLDivElement, _pointer?: CPointer): void {
		//super.EditHTMLInit(_div,_pointer);
		_div.innerHTML="";
		const self = this;
		const row = CDomFactory.DataToDom({
			"tag": "div","class": "d-flex align-items-center gap-2 mb-1",
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
			]
		});
		_div.appendChild(row);

		// 마우스 다운 드래그로 값 조정 기능 추가
		const inputs = row.querySelectorAll('input[type="number"]');
		const setter = (vec: CVec2) => {
			this.x = vec.x;
			this.y = vec.y;
			if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") {
				_pointer.target.EditChange(_pointer, false);
			}
		};
		const getVec = () => new CVec2(
			parseFloat((inputs[0] as HTMLInputElement).value),
			parseFloat((inputs[1] as HTMLInputElement).value)
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
	}
}
