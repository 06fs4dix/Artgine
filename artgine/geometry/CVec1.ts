
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CPointer } from "../basic/CObject.js";
import {CFloat32} from "./CFloat32.js";
import {CObject} from "../basic/CObject.js";

export class CVec1 extends CFloat32
{
	constructor(_x : number=0)
	{
		super();
		
		this.mF32A=new Float32Array(1);
		//this.mF32A=new Array(1);
		this.mF32A[0]=_x;
			
	}
	set x(_val : number)	{		this.mF32A[0]=_val;	}
	get x(){	return this.mF32A[0];	}
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
			]
		});
		_div.appendChild(row);

		// 마우스 다운 드래그로 값 조정 기능 추가
		const input = row.querySelector('input[type="number"]') as HTMLInputElement;
		const setter = (vec: CVec1) => {
			this.x = vec.x;
			if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") {
				_pointer.target.EditChange(_pointer, false);
			}
		};
		const getVec = () => new CVec1(
			parseFloat(input.value)
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
		input.onmousedown = MounsDownFun;
	}
}
