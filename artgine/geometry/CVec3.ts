import { CPointer, CObject } from "../basic/CObject.js";
import {CFloat32} from "./CFloat32.js";
import { CDomFactory } from '../basic/CDOMFactory.js';

export class CVec3 extends CFloat32
{
	constructor();
	constructor(_x : number ,_y : number);
	constructor(_x : number ,_y : number,_z : number);
	constructor(_arr : Array<number>);
	constructor(_x : number|Array<number>=0 ,_y=0,_z=0)
	{
		super();
		
	
		this.mF32A=new Float32Array(3);
	
		

		if(typeof _x=="number")
		{
			this.mF32A[0]=_x;
			this.mF32A[1]=_y;
			this.mF32A[2]=_z;
	
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
	
	
	static Left() {	return g_left;}
	static Right() {	return g_right;}
	static Up() {	return g_up;}
	static Down() {	return g_down;}
	static Front() {	return g_front;}
	static Back() {	return g_back;}
	static eDir=
    {
        "Up":0,
        "Down":1,
        "Left":2,
        "Right":3,
        "Front":4,
        "Back":5,

		// "LastUp":10,
        // "LastDown":11,
        // "LastLeft":12,
        // "LastRight":13,
        // "LastFront":14,
        // "LastBack":15,
	}
	// static Right2D() : CVec3
	// {
	// 	return new CVec3(1, 0);
	// }
	// static Up2D() : CVec3
	// {
	// 	return new CVec3(0, 1);
	// }
	// static Down2D() : CVec3
	// {
	// 	return new CVec3(0, -1);
	// }
	// static SetLeft3D(_vec : CVec3) : void
	// {
	// 	g_left3d = _vec;
	// }
	// static SetRight3D(_vec : CVec3) : void
	// {
	// 	g_right3d = _vec;
	// }
	// static SetUp3D(_vec : CVec3) : void
	// {
	// 	g_up3d = _vec;
	// }
	// static SetDown3D(_vec : CVec3) : void
	// {
	// 	g_down3d = _vec;
	// }
	// EditForm(_pointer: CPointer, _body: HTMLDivElement, _input: HTMLElement): void {
	// 	// mF32A 등 기존 배열 에디터 완전 숨김
	// 	_body.hidden=true;
	// }
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
				{"tag": "input","type": "number","class": "form-control form-control-sm",
					"value": this.z,"onchange": (e: Event) => {
						const v = parseFloat((e.target as HTMLInputElement).value);
						if (!isNaN(v)) { this.z = v; if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") { _pointer.target.EditChange(_pointer, false); } }
					}
				}
			]
		});
		_div.appendChild(row);

		// 마우스 다운 드래그로 값 조정 기능 추가
		const inputs = row.querySelectorAll('input[type="number"]');
		const setter = (vec: CVec3) => {
			this.x = vec.x;
			this.y = vec.y;
			this.z = vec.z;
			if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") {
				_pointer.target.EditChange(_pointer, false);
			}
		};
		const getVec = () => new CVec3(
			parseFloat((inputs[0] as HTMLInputElement).value),
			parseFloat((inputs[1] as HTMLInputElement).value),
			parseFloat((inputs[2] as HTMLInputElement).value)
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
	}

	
};
var g_left=new CVec3(-1, 0, 0);
var g_right=new CVec3(1, 0, 0);
var g_up=new CVec3(0, 1, 0);
var g_down=new CVec3(0, -1, 0);
var g_front=new CVec3(0, 0, 1);
var g_back=new CVec3(0, 0, -1);