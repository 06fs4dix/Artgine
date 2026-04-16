import {CVec1} from "../geometry/CVec1.js";
import {CVec2} from "../geometry/CVec2.js";
import {CVec3} from "../geometry/CVec3.js";
import {CVec4} from "../geometry/CVec4.js";
import {CMat} from "../geometry/CMat.js";
import {CObject, CPointer} from "../basic/CObject.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CDOM } from "../basic/CDOM.js";
import { CAlert } from "../basic/CAlert.js";
import { SDF } from "../z_file/SDF.js";




export class CShaderAttr extends CObject
{
	public mKey : string="";
	public mData : any=null;
	public mEach : number=0;
	public mType : number=0;
	public mTag : string=null;
	
	//텍스쳐 등록할때
	constructor(_texOff : number,_texKey : string);
	constructor(_texOff : number,_texKey : string,_texUse : Array<boolean>);
	
	constructor(_key : string,_val : CVec1);
	constructor(_key : string,_val : CVec2);
	constructor(_key : string,_val : CVec3);
	constructor(_key : string,_val : CVec4);
	constructor(_key : string,_val : CMat);
	
	
	
	//이건 다중 어레이 일때 1,2,3,4,16
	constructor(_key : string,_each : number,_vec : Array<number>);
	constructor(_key : string,_each : number,_val : Float32Array);
	//하나씩 넣는 타입, 1개 어레이 타입에서 많이 사용
	constructor(_key : string,_each : any);
	constructor(_key : string,_each : any,_val0 : any);
	constructor(_key : string,_each : any,_val0 : any,_val1 : any);
	constructor(_key : string,_each : any,_val0 : any,_val1 : any,_val2 : any);
	
	
	constructor(_keyOff : any,_countValue : any,_val0=null,_val1=null,_val2=null,_val3=null)
	{
		super();
		if(_keyOff==null)
			return;
		else if(typeof _keyOff =="number")
		{
			this.mEach=_keyOff;
			this.mKey=_countValue;
			this.mData=_val0;
			this.mType=-2;
		}
		else
		{
			this.mKey=_keyOff;
			if(_val0==null)
			{
				this.mEach=0;
				this.mData=_countValue;
				
				
				if(_countValue instanceof CVec4)
					this.mType=4;
				else if(_countValue instanceof CVec3)
					this.mType=3;
				else if(_countValue instanceof CVec2)
					this.mType=2;
				else if(_countValue instanceof CMat)
					this.mType=16;
				else
				{
					this.mType=1;
					if(typeof _countValue=="number")
						this.mData=new CVec1(_countValue);

				}
					
			}
			else
			{
				this.mEach=_countValue;
				this.mType=-1;
				if(_val0 instanceof Array || _val0 instanceof Float32Array)
				{
					
					this.mData=_val0;
					if(_val0 instanceof Array)
					{
						let fa=new Float32Array(this.mData.length);
						for(let i=0;i<this.mData.length;++i)
						{
							if(typeof this.mData[i] =="string")
							{
								const parts = this.mData[i].split(".");
								// parts = ["SDF", "eUni", "SkinMat"]
								let val: any = { SDF };
								for(const p of parts)
									val = val?.[p];
								
								if(typeof val === "number")
									fa[i] = val;
								else
									CAlert.E("SDF resolve error: " + this.mData[i]);
							}
							else
								fa[i]=this.mData[i];
						}
						this.mData=fa;
					}
					
				}
				else
				{
					this.mData=new Array();
					this.mData.push(_val0);
					if(_val1!=null)
						this.mData.push(_val1);
					if(_val2!=null)
						this.mData.push(_val2);
					if(_val3!=null)
						this.mData.push(_val3);
					this.mData
					let fa=new Float32Array(this.mData.length);
					for(let i=0;i<this.mData.length;++i)
					{
						fa[i]=this.mData[i];
					}
					this.mData=fa;
				}
				
				
			}
		}
	}
	override EditForm(_pointer: CPointer, _body: HTMLDivElement, _input: HTMLElement): void 
	{
		super.EditForm(_pointer,_body,_input);
		if(_pointer.member=="mData" && this.mType==-2)
		{
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[false]);
		}
	}
	override ToLog(): string {
		let str=this.mKey+"/";
		switch(this.mType)
		{
			case -2:	str+="Tex"+this.mEach;	break;
			case 1:case 2:case 3:case 4:case 16:	
			{
				//if(this.mData.mF32A==null)
				//	alert("1");
				for(let i=0;i<this.mData.mF32A.length;++i)
					str+=this.mData.mF32A[i]+",";
			}break;
			case -1:
			{
				let arr=this.mData.mF32A;
				if(arr==null)	arr=this.mData;
				for(let i=0;i<arr.length;++i)
					str+=arr[i]+",";
			}break;
			

		}
		
	

		return str;
	}
	override EditHTMLInit(_div: HTMLDivElement, _pointer?: CPointer): void {
		//super.EditHTMLInit(_div,_pointer);
		let KeyInputFun=()=>{
			const keyRow = CDOM.DataToDom({
				"tag": "div", "class": "d-flex align-items-center",
				"html": [
					{ "tag": "div", "class": "text-danger ps-1 pe-1", "text": "mKey" },
					{
						"tag": "input", "type": "text", "class": "form-control form-control-sm",
						"value": this.mKey,
						"onchange": (e: Event) => {
							const v = (e.target as HTMLInputElement).value ?? "";
							// 값 반영
							this.mKey = v;

							// EditChange 통지 (CVec1의 패턴과 동일한 호출 흐름)
							if (_pointer && _pointer.target && typeof _pointer.target.EditChange === "function") {
								// mKey를 가리키는 포인터 구성
								const keyPtr = new CPointer(this, "mKey");
								keyPtr.refArr.push(..._pointer.refArr);
								_pointer.target.EditChange(keyPtr, false);
							}
						}
					}
				]
			});
			_div.prepend(keyRow);

		};
		let str="";
		switch(this.mType)
		{
			case -2:		break;
			case 1:case 2:case 3:case 4:case 16:	
			{
				_div.innerHTML="";
				let pointer=new CPointer(this,"mData");
				pointer.refArr.push(..._pointer.refArr);
				this.mData.EditHTMLInit(_div,pointer);
				KeyInputFun();
			}break;
			case -1:
			{
				
			}break;
		}
	}
};