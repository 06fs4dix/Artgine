

import { CObject, CPointer } from "../basic/CObject.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import {CMath} from "../geometry/CMath.js";
import { CUtilMath } from "../geometry/CUtilMath.js";
import {CVec2} from "../geometry/CVec2.js";
import {CVec3} from "../geometry/CVec3.js";


//https://easings.net/
export class CCurve extends CObject
{
	mType : number;
	public mPosArr : Array<CVec2> = new Array<CVec2>();
	constructor(_type=CCurve.eType.Linear)
	{
		super();
		this.mType=_type;
	}
	
	static Cac(x : number, _type : number, _posArr : Array<CVec2> = null) : number {
		switch(_type) {
			case CCurve.eType.Linear:
				return x;
			case CCurve.eType.FadeIn:
				return (1.0075-Math.pow(1.25,-x * 22.0022463022));
			case CCurve.eType.FadeIn:
				return (1.0075-Math.pow(1.25,-x * 22.0022463022));
			case CCurve.eType.FadeOut:
				return Math.pow(x,3.6734111115);
			case CCurve.eType.InSine:
				return 1.0-Math.cos((x*Math.PI)/2);
			case CCurve.eType.OutSine:
				return Math.sin((x*Math.PI)/2);
			case CCurve.eType.InOutSine:
				return -(Math.cos(Math.PI*x)-1)/2;
			case CCurve.eType.InQuad:
				return x*x;
			case CCurve.eType.OutQuad:
				return 1-(1-x)*(1-x);
			case CCurve.eType.InOutQuad:
				return x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
			case CCurve.eType.InCubic:
				return x*x*x;
			case CCurve.eType.OutCubic:
				return 1-Math.pow(1-x,3);
			case CCurve.eType.InOutCubic:
				return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3);
			case CCurve.eType.InQuart:
				return x*x*x*x;
			case CCurve.eType.OutQuart:
				return 1-Math.pow(1-x,4);
			case CCurve.eType.InOutQuart:
				return x<0.5?8*x*x*x*x:1-Math.pow(-2*x+2,4)/2;
			case CCurve.eType.InCirc:
				return 1-Math.sqrt(1-Math.pow(x,2));
			case CCurve.eType.OutCirc:
				return Math.sqrt(1-Math.pow(x-1,2));
			case CCurve.eType.InOutCirc:
				return x<0.5?(1-Math.sqrt(1-Math.pow(2*x,2)))/2:(Math.sqrt(1-Math.pow(-2*x+2,2))+1)/2;
			case CCurve.eType.InBack:
				return 2.70158*x*x*x-1.70158*x*x;
			case CCurve.eType.OutBack:
				return 1+2.70158*Math.pow(x-1,3)+1.70158*Math.pow(x-1,2);
			case CCurve.eType.InOutBack:
				return x<0.5?(Math.pow(2*x,2)*(3.5949095*2*x-2.5949095))/2:(Math.pow(2*x-2,2)*(3.5949095*(x*2-2)+2.5949095)+2)/2;
			case CCurve.eType.InElastic:
				return x==0?0:x==1?1:-Math.pow(2,10*x-10)*Math.sin((x*10-10.75)*2*Math.PI/3);
			case CCurve.eType.OutElastic:
				return x==0?0:x==1?1:Math.pow(2,-10*x)*Math.sin((x*10-0.75)*2*Math.PI/3)+1;
			case CCurve.eType.InOutElastic:
				const c5 = Math.PI*2/4.5;
				return x==0?0:x==1?1:x<0.5?-(Math.pow(2,20*x-10)*Math.sin((20*x-11.125)*c5))/2:(Math.pow(2,-20*x+10)*Math.sin((20*x-11.125)*c5))/2+1;
			case CCurve.eType.InBounce:
				return 1-CCurve.Cac(x,CCurve.eType.OutBounce);
			case CCurve.eType.OutBounce:
				const n1 = 7.5625;
				const d1 = 2.75;
				if(x<1/d1) {
					return n1*x*x;
				} else if(x<2/d1) {
					return n1*(x-=1.5/d1)*x+0.75;
				} else if(x<2.5/d1) {
					return n1*(x-=2.25/d1)*x+0.9375;
				} else {
					return n1*(x-=2.625/d1)*x+0.984375;
				}
			case CCurve.eType.InOutBounce:
				return x<0.5?(1-CCurve.Cac(1-2*x,CCurve.eType.OutBounce))/2:(1+CCurve.Cac(2*x-1,CCurve.eType.OutBounce))/2;
			case CCurve.eType.LinearCoodi:
				let s = new CVec2(), e = new CVec2(0,0);
				for(let pos of _posArr) {
					if(pos.x >= x) 
					{
						s = e;
						e = pos;
						break;
					}
					s = e;
					e = pos;
					
				}
				return s.y + (e.y - s.y) / (e.x - s.x) * (x - s.x);
			case CCurve.eType.BezierCoodi:
				let vec3Arr = [new CVec3()];
				for(let pos of _posArr) {
					vec3Arr.push(new CVec3(pos.x, pos.y));
				}
				vec3Arr.push(new CVec3(1.0,1.0));
				return CUtilMath.Bezier(vec3Arr, x, 0.0, 0.0).y;
		}
	}
	

	GetCurve(_val : number)
	{
		let val=CCurve.Cac(_val, this.mType, this.mPosArr);
		if(val<0)	val=0;
		if(val>1)	val=1;
		return val;
	}

	EditForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {
		//super.EditForm(_pointer,_div,_input);
		if(_pointer.member == "mType") {
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CCurve.eType)) {
				//역방향 매핑이 자동으로 생성되서 숫자인 경우 제외시킴
				if (isNaN(Number(text))) {
					textArr.push(text);
					valArr.push(val);
				}
			}
			let select = CUtilObj.Select(_pointer, _input, textArr, valArr);
			select.addEventListener("change", (e) => {
				this.EditRefresh();
			});
			_div.append(select);
		}
		else if(_pointer.member == "mPosArr") {
			let colorSpacePointer : CPointer = new CPointer(_pointer.target, "mType");
			let curve = CCurve.Curve(_pointer, colorSpacePointer, _div.lastChild as HTMLElement);
			(curve as HTMLElement).classList.add("show");
			_div.append(curve);
		}
	}
	static Curve(_pointer : CPointer|Array<CVec2>, _type : CPointer|number, _container : HTMLElement, _hidden : boolean = true) : HTMLElement {
		let container = _container.cloneNode() as HTMLElement;
		if(_hidden) {
			_container.hidden = true;
		}

		let path : Array<CVec2>;
		if(_pointer instanceof CPointer) {
			path = _pointer.target[_pointer.member];
		} else {
			path = _pointer;
		}

		let type : number;
		if(_type instanceof CPointer) {
			type = _type.target[_type.member];
		} else {
			type = _type;
		}

		let width = 300;
		let height = 300;

		let canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		container.appendChild(canvas);

		let ctx = canvas.getContext("2d");

		//0 ~ 1을 캔버스 사이즈로 매핑
		let tToPos = (t : CVec2) : CVec2 => {
			return new CVec2(
				width * 1 / 6 + (width * 2 / 3) * t.x, 
				height * 5 / 6 - (height * 2 / 3) * t.y
			);
		};

		//캔버스에서 0~1로 매핑
		let posToT = (c : CVec2) : CVec2 => {
			return new CVec2(
				(c.x - width * 1 / 6) / (width * 2 / 3), 
				(height * 5 / 6 - c.y) / (height * 2 / 3)
			);
		};

		let path2DArr : Array<Path2D> = [];
		let select : CVec2 = null;
		let px = 0;
		let py = 0;
		let ctrlDown = false;
		let drawRect = (_ctx : CanvasRenderingContext2D, _width : number, _height : number) => {
			//outer Rect
			let outerRect = [_width * 1 / 6, _height * 1 / 6];

			_ctx.clearRect(0,0,_width,_height);
			_ctx.strokeStyle = "rgb(0, 0, 0)";
			ctx.beginPath();
			ctx.moveTo(outerRect[0], outerRect[1]);
			ctx.lineTo(outerRect[0], _height - outerRect[1]);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(outerRect[0], outerRect[1]);
			ctx.lineTo(_width - outerRect[0], outerRect[1]);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(_width - outerRect[0], _height - outerRect[1]);
			ctx.lineTo(_width - outerRect[0], outerRect[1]);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(_width - outerRect[0], _height - outerRect[1]);
			ctx.lineTo(outerRect[0], _height - outerRect[1]);
			ctx.stroke();

			//xy Axis
			let axis = [_width * 1 / 2, _height * 1 / 2];
			ctx.beginPath();
			ctx.moveTo(axis[0], 0);
			ctx.lineTo(axis[0], _height);
			ctx.setLineDash([5]);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(0, axis[1]);
			ctx.lineTo(_width, axis[1]);
			ctx.setLineDash([5]);
			ctx.stroke();

			//sort path
			path.sort((a,b)=>{ 
				return (a.x>b.x)?1:-1;
			});

			//point
			if(type == CCurve.eType.LinearCoodi || type == CCurve.eType.BezierCoodi) {
				//clear path2D
				path2DArr.length = 0;
				for(let t of path)
				{
					let c = tToPos(t);
					let p = new Path2D();
					p.arc(c.x,c.y,5,0,2*Math.PI,true);
					ctx.fillStyle = "rgb(255, 0, 0)";
					ctx.fill(p);
					path2DArr.push(p);
				}
			}

			//point to axis and text
			if(select) {
				let selectInCanvas = tToPos(select);

				//x
				ctx.beginPath();
				ctx.moveTo(selectInCanvas.x, selectInCanvas.y);
				ctx.lineTo(selectInCanvas.x, axis[1]);
				ctx.setLineDash([5]);
				ctx.stroke();

				//y
				ctx.beginPath();
				ctx.moveTo(selectInCanvas.x, selectInCanvas.y);
				ctx.lineTo(axis[0], selectInCanvas.y);
				ctx.setLineDash([5]);
				ctx.stroke();

				//x text
				if(selectInCanvas.x < 0) {
					ctx.font = "20px malgun gothic";
					ctx.fillStyle = "rgba(0, 0, 0, 1)";
					ctx.fillText(select.x.toString(), selectInCanvas.x, axis[1]);
				} else {
					ctx.font = "20px malgun gothic";
					ctx.fillStyle = "rgba(0, 0, 0, 1)";
					ctx.fillText(select.x.toString(), selectInCanvas.x, axis[1]);
				}

				//y text
				if(selectInCanvas.y < 0) {
					ctx.font = "20px malgun gothic";
					ctx.fillStyle = "rgba(0, 0, 0, 1)";
					ctx.fillText(select.y.toString(), axis[0], selectInCanvas.y);
				} else {
					ctx.font = "20px malgun gothic";
					ctx.fillStyle = "rgba(0, 0, 0, 1)";
					ctx.fillText(select.y.toString(), axis[0], selectInCanvas.y);
				}
			}

			//직선
			let drawLine = (_ctx : CanvasRenderingContext2D, fx : Function, fy : Function, xArr : Array<number>) => {
				_ctx.strokeStyle = "rgb(0, 0, 255)";
				_ctx.setLineDash([0]);
				for(let i = 0; i < xArr.length - 1; i++) {
					let t1 = new CVec2(fx(xArr[i]), fy(xArr[i]));
					let t2 = new CVec2(fx(xArr[i + 1]), fy(xArr[i + 1]));
					_ctx.beginPath();
					let c1 : CVec2 = tToPos(t1);
					_ctx.moveTo(c1.x, c1.y);
					let c2 = tToPos(t2);
					_ctx.lineTo(c2.x, c2.y);
					_ctx.stroke();
				}
			};

			//얼마나 세밀하게 그릴지 범위
			let range = (low : number, high : number, N : number) => {
				let dt : number = (high - low);
				let step : number = dt / N;
				let arr : Array<number> = [];

				for(let i = 0; i < (N + 1); i++) {
					arr.push(low + step * i);
				}

				return arr;
			};

			drawLine(_ctx, function(t) {return t;}, function(t) {return CCurve.Cac(t,type,path);}, range(0, 1, 100));
		};
		drawRect(ctx, width, height);

		canvas.onmousedown = (e) => {
			let curPath;
			if(_pointer instanceof CPointer) {
				curPath = _pointer.target[_pointer.member];
			} else {
				curPath = _pointer;
			}

			for(let i = 0; i < path2DArr.length; i++) {
				let p = path2DArr[i];
				if(ctx.isPointInPath(p, e.offsetX, e.offsetY)) {
					select = path[i];
					break;
				}
			}
			if(select != null) {
				let newPos = posToT(new CVec2(e.offsetX, e.offsetY));
				select.x = newPos.x;
				select.y = newPos.y;
				px = e.offsetX;
				py = e.offsetY;
			}
		};
		canvas.onmousemove = (e) => {
			if(select != null) {
				let newPos = posToT(new CVec2(e.offsetX, e.offsetY));
				//컨트롤 누르면 0.1씩 이동
				if(e.ctrlKey) {
					select.x = Math.round(newPos.x * 10) / 10;
					select.y = Math.round(newPos.y * 10) / 10;
				} else {
					select.x = newPos.x;
					select.y = newPos.y;
				}
			}
			drawRect(ctx, width, height);
		};
		canvas.onmouseup = (e) => {
			let curType;
			if(_type instanceof CPointer) {
				curType = _type.target[_type.member];
			} else {
				curType = _type;
			}
			if(!(curType == CCurve.eType.LinearCoodi || curType == CCurve.eType.BezierCoodi)) {
				return;
			}

			let curPath;
			if(_pointer instanceof CPointer) {
				curPath = _pointer.target[_pointer.member];
			} else {
				curPath = _pointer;
			}

			if(select != null) {
				if(px == e.offsetX && py == e.offsetY) {
					for(var i = 0; i < curPath.length; i++) {
						if(curPath[i] == select) {
							curPath.splice(i, 1);
							break;
						}
					}
				}
				else {
					let newPos = posToT(new CVec2(e.offsetX, e.offsetY));
					select.x = newPos.x;
					select.y = newPos.y;
				}
				select = null;
			}
			else {
				let c = posToT(new CVec2(e.offsetX, e.offsetY));
				curPath.push(c);
			}
			drawRect(ctx, width, height);
		};

		return container;
	}
	SetType(_type : CCurve.eType)
	{
		this.mType=_type;
	}
	
}
export namespace CCurve
{
	export enum eType{
		Linear = 0,
		FadeIn = 1,
		FadeOut = 2,
		InSine = 3,
		OutSine = 4,
		InOutSine = 5,
		InQuad = 6,
		OutQuad = 7,
		InOutQuad = 8,
		InCubic = 9,
		OutCubic = 10,
		InOutCubic = 11,
		InQuart = 12,
		OutQuart = 13,
		InOutQuart = 14,
		InCirc = 15,
		OutCirc = 16,
		InOutCirc = 17,
		InBack = 18,
		OutBack = 19,
		InOutBack = 20,
		InElastic = 21,
		OutElastic = 22,
		InOutElastic = 23,
		InBounce = 24,
		OutBounce = 25,
		InOutBounce = 26,
		LinearCoodi = 27,
		BezierCoodi = 28
	};
}