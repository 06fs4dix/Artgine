
import { CClass } from "../../basic/CClass.js";
import {CDomFactory} from "../../basic/CDOMFactory.js";
import {CJSON} from "../../basic/CJSON.js";
import { CObject, CObjectEditerBtn, CPointer } from "../../basic/CObject.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CVec4} from "../../geometry/CVec4.js";
import {CBase64File} from "../../util/CBase64File.js";
import {CCurve} from "../../util/CCurve.js";
import { SDF } from "../../z_file/SDF.js";
import {CColor,  CAlpha, CColorVFX } from "./CColor.js";
import {CForce} from "./CForce.js";



export class CClip extends CObject
{
	public mTime : number;
	public mDelay : number;
	constructor(_time : number=0,_delay : number=0)
	{
		super();
		this.mTime = _time;
		this.mDelay = _delay;
		//this.m_paintOff=0;
	}
	GetCClipType() {}
};
export class CClipImg extends CClip
{
	public mImg : string;
	//public m_alphaCut : number;
	public mAutoCreate=true;
	constructor(_time : number,_delay : number,_img : string="")
	{
		super(_time,_delay);
		this.mImg = _img;
		//this.m_alphaCut=_alphaCut;
		
	}
	// WTChange(_pointer: CPointer): void {
	// 	if(_pointer.member=="m_img")
	// 	{
	// 		this.m_img=CString.ReplaceAll(this.m_img,"\\","/");
	// 		let sub=CPath.Combine("Sub");
	// 		sub=sub.substr(0,sub.length-1);
	// 		let pos=this.m_img.indexOf(sub);
	// 		if(pos!=-1)
	// 		{
	// 			this.m_img=this.m_img.substr(pos,this.m_img.length-(pos+sub.length));
	// 			this.WTRefresh();
	// 		}
			
	// 	}
	// }

};

export class CClipCoodi extends CClip
{
	public mSTX : number;
	public mSTY : number;
	public mEDX : number;
	public mEDY : number;
	public mResize=false;//코디에 맞게 SetSize다시 맞춰줌 128,128 인걸 100,100 이면 이걸로 변경, 바운딩은 변경이 없다
	//public test=new CVec3();
	
	constructor(_time : number,_delay : number,_stX : number=0, _stY : number=0,_edX : number=0,_edY : number=0,_resize=false)
	{
		super(_time,_delay);
		this.mSTX = _stX;
		this.mSTY = _stY;
		this.mEDX = _edX;
		this.mEDY = _edY;
		this.mResize=_resize;
	}
};


// input: h in [0,1] and s,v in [0,1] - output: r,g,b in [0,1]
export class CClipColorAlpha extends CClip
{
	// static eSpace={
	// 	RGBA:0,
	// 	HSV:1,
	// 	HSL:2,
	// };
	public mSTColor : CColor;
	public mEDColor : CColor;
	public mSTAlpha : CAlpha;
	public mEDAlpha : CAlpha;
	public mSTColorVFX : CColorVFX;
	public mEDColorVFX : CColorVFX;

	public mCurve=new CCurve();

	//기존 생성자
	constructor(_time : number,_delay : number,_stRGBA:CVec4,_edRGBA:CVec4);
	//새로운 생성자
	//stColor기준으로 계산함(stColor가 HSV면 edColor가 다른 스페이스에 있어도 HSV기준으로 계산)
	constructor(_time : number,_delay : number,_stCol:CColor,_edCol:CColor,_stA:CAlpha,_edA:CAlpha,_stVFX:CColorVFX,_edVFX:CColorVFX);
	constructor(_time : number,_delay : number,_st:CColor,_ed:CColor);
	constructor(_time : number,_delay : number,_st:CAlpha,_ed:CAlpha);
	constructor(_time : number,_delay : number,_st:CColorVFX,_ed:CColorVFX);


	constructor(_time : number,_delay : number,_a : CVec4|CColor|CAlpha|CColorVFX,_b: CVec4|CColor|CAlpha|CColorVFX,_c=null,_d=null,_e=null,_f=null)
	{
		super(_time,_delay);

		//새로운 생성자
		
		if(_b instanceof CColor) 
		{
			this.mSTColor = _a as any;
			this.mEDColor = _b;
			
		}
		else if(_b instanceof CAlpha) 
		{
			this.mSTAlpha = _a as any;
			this.mEDAlpha = _b;
			
		}
		else if(_b instanceof CColorVFX) 
		{
			
			this.mSTColorVFX = _a as any;
			this.mEDColorVFX = _b;
		}
		else if(_a instanceof CVec4 && _b instanceof CVec4) 
		{
			this.mSTColor = new CColor(_a.x,_a.y,_a.z,SDF.eColorModel.RGBAdd);
			this.mSTAlpha = new CAlpha(_a.w,SDF.eAlphaModel.Add);
			this.mEDColor = new CColor(_b.x,_b.y,_b.z,SDF.eColorModel.RGBAdd);
			this.mEDAlpha = new CAlpha(_b.w,SDF.eAlphaModel.Add);
			
		}

		if(_d instanceof CAlpha) 
		{
			this.mSTAlpha = _c as any;
			this.mEDAlpha = _d;
		}
		if(_f instanceof CColorVFX) 
		{
			this.mSTColorVFX = _e as any;
			this.mEDColorVFX = _f;
		}
		if(this.mSTColor==null)
		{
			this.mSTColor = new CColor();
			this.mSTColor.w=SDF.eColorModel.None;
	
		}
		if(this.mEDColor==null)
		{
			this.mEDColor = new CColor();
			this.mEDColor.w=SDF.eColorModel.None;
		}
		if(this.mSTAlpha==null)
		{
			this.mSTAlpha = new CAlpha();
			this.mSTAlpha.y=SDF.eAlphaModel.None;

		}
		if(this.mEDAlpha==null)
		{
			this.mEDAlpha = new CAlpha();
			this.mEDAlpha.y=SDF.eAlphaModel.None;
		}
		if(this.mSTColorVFX==null)
		{
			this.mSTColorVFX=new CColorVFX();
		}
		if(this.mEDColorVFX==null)
		{
			this.mEDColorVFX=new CColorVFX();
		}
		
		
		
	}

	EditForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {
		if(_pointer.member=="mSTColorVFX" && this.mSTColorVFX==null)
		{
			let btn=CDomFactory.TagToDom("button");
			btn.innerText="생성";
			btn.onclick=()=>{
				this.mSTColorVFX = new CColorVFX();
				this.EditRefresh();
			};
			_div.append(btn);
		}
		if(_pointer.member=="m_edColorVFX" && this.mEDColorVFX==null)
		{
			let btn=CDomFactory.TagToDom("button");
			btn.innerText="생성";
			btn.onclick=()=>{
				this.mEDColorVFX = new CColorVFX();
				this.EditRefresh();
			};
			_div.append(btn);
		}
	}

	
	
};

export class CClipPRS extends CClip
{
	static eType={
		Pos:0,
		Rot:1,
		Sca:2,
	};
	public mValue =new Array<CVec3>();
	public mPRSType : number=0;//p0r1s2
	public mCurve=new CCurve();
	public mBezierRangeX=-1;
	public mBezierRangeY=-1;
	public mSubject=true;

	constructor(_time : number,_delay : number,_value0 : Array<CVec3>,_type : number);
	constructor(_time : number,_delay : number,_value0 : CVec3,_value1 : CVec3,_type : number);
	constructor(_time : number,_delay : number,_value0 : any=new Array<CVec3>(),_value1 : any=0,_value2 : any=0)
	{
		super(_time,_delay);
		
		if(_value0 instanceof CVec3)
		{
			this.mValue.push(_value0);
			this.mValue.push(_value1);
			this.mPRSType=_value2;
		}
		else
		{
			this.mValue=_value0;
			this.mPRSType=_value1;
		}
		
		
		
		
	}
	override EditForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLElement): void 
	{
		if(_pointer.member == "mPRSType") 
		{
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CClipPRS.eType)) {
				textArr.push(text);
				valArr.push(val);
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
		else if(_pointer.member=="mValue")
		{
			CUtilObj.ArrayAddSelectList(_pointer,_div,_input,[new CVec3()]);
		}
	}
	
}
//max 기준 0~30tick  -> 0~3000mil
export class CClipMesh extends CClip
{
	public mST : number|string;
	public mED : number;
	public mMesh : string;
	public mAutoCreate=true;
	
	constructor(_time : number,_delay : number,_mesh : string,_key : string);
	constructor(_time : number,_delay : number,_mesh : string,_st : number,_ed : number);
	constructor(_time : number,_delay : number,_mesh : string,_st : number|string,_ed : number=null)
	{
		super(_time,_delay);
		
		if(typeof _st =="number")
			this.mST=_st;
		else
			this.mST=_st;
			
		if(_ed!=null)
		{
			this.mED=_ed;
		}
		
		this.mMesh=_mesh;
	}

	WTForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {
		if(_pointer.member == "mST") 
		{
			let val = typeof(_pointer.member) == "string"? 0 : 1;
			_div.insertBefore(CDomFactory.DataToDom({
				'<>':'select', 'class':'form-select','style':'width:100%;', 'html':[
					{'<>':'option', 'text':'AniKey', 'value':0, 'selected':val == 0? ' ': null},
					{'<>':'option', 'text':'Start-End', 'value':1, 'selected':val == 1? ' ': null}
				], 'onchange':(e) => {
					_div.removeChild(_div.lastChild);
					let target=e.target as HTMLSelectElement;
					if(target.value == "0") {
						_div.append(CDomFactory.DataToDom({
							'<>':'input', 'class':'form-control', 'type':'string', "placeholder":"AniKey",'onchange':(e) => {
								this.mST = target.value;
							}
						}));
					} else {
						_div.append(CDomFactory.DataToDom({
							'<>':'input', 'class':'form-control', 'type':'number', "placeholder":"start",'onchange':(e) => {
								this.mST = Number(target.value);
							}
						}));
						_div.append(CDomFactory.DataToDom({
							'<>':'input', 'class':'form-control', 'type':'number', "placeholder":"end", 'onchange':(e) => {
								this.mED = Number(target.value);
							}
						}));
					}
				}
			}), _input);

		}
	}
};
export class CClipDestroy extends CClip
{	
	constructor(_time : number)
	{
		super(_time,1);
	}
	
};
export class CClipShaderAttr extends CClip
{
	public mKey : string;
	public mST : any;
	public mED : any;

	public mCurve=new CCurve();
	constructor(_time : number,_delay : number,_key : string,_st : number,_ed : number);
	constructor(_time : number,_delay : number,_key : string,_st : CVec2,_ed : CVec2);
	constructor(_time : number,_delay : number,_key : string,_st : CVec3,_ed : CVec3);
	constructor(_time : number,_delay : number,_key : string,_st : CVec4,_ed : CVec4);
	constructor(_time : number,_delay : number,_key : string,_st,_ed)
	{
		super(_time,_delay);
		this.mKey=_key;
		this.mST=_st;
		this.mED=_ed;
		
	}
};
export class CClipForce extends CClip
{
	public mForce : CForce;
	
	constructor(_time : number,_force : CForce)
	{
		super(_time,1);
		this.mForce=_force;
	}
}
export class CClipBase64 extends CClip
{
	
	public mBase64File : CBase64File;

	constructor(_time : number, _data : CBase64File = new CBase64File())
	{
		super(_time,0);
		this.mBase64File = _data;
	}
};
export class CClipAudio extends CClip
{
	mAudio="";
	mSpeed=1;
	mVolume=1;
}

//==================================================================================
export class CClipVideo extends CClip
{
	public mSource : string;
	public mRes : string;
	
	constructor(_time : number,_delay : number,_source : string="",_ctexture_cres : string="")
	{
		super(_time,_delay);
		this.mSource = _source;
		this.mRes = _ctexture_cres;
	}
};



export class CAnimation extends CObject
{
	public mLoop : boolean;
	//public mRemove : boolean;
	public mClip : Array<CClip>;
	//public m_res : boolean;
	
	constructor(_clip=new Array())
	{
		super();
		this.mLoop = true;
		//this.mRemove = false;
		this.mClip=_clip;

	}
	Push<T extends CClip>(_clip : T) : T
	{
        //this.m_clip.push(_clip);
        if(_clip.mDelay<0)
        	_clip.mDelay=0;
        
        if(_clip.mTime==-1)
        {
			if(this.mClip.length>0)
				_clip.mTime=this.mClip[this.mClip.length-1].mTime+this.mClip[this.mClip.length-1].mDelay;
			else
				_clip.mTime=0;
		}
        	
        var pOff = this.mClip.length;
        for (var i = 0; i < this.mClip.length; ++i)
        {
            if (this.mClip[i].mTime > _clip.mTime)
			{
                pOff = i;
                break;
            } else if(this.mClip[i].mTime == _clip.mTime) {
				if(this.mClip[i].mDelay > _clip.mDelay) {
					pOff = i;
					break;
				}
			}
        }
        this.mClip.splice(pOff, 0, _clip);
		return _clip;
    }
	Sort()
	{
		for(var i=0;i<this.mClip.length;++i)
		{
			for(var j=i;j<this.mClip.length;++j)
			{
				if(this.mClip[i].mTime>this.mClip[j].mTime)
				{
					var dummy=this.mClip[j];
					this.mClip[j]=this.mClip[i];
					this.mClip[i]=dummy;	
				}
			}
		}
	}
	//여러 클립이 동시에 있으면 버그 생길수도 있다
	ClicpTimeCac()
	{
		for(var i=0;i<this.mClip.length;++i)
		{
			if(this.mClip[i].mTime==-1)
			{
				if(i==0)
				{
					this.mClip[i].mTime=0;
				}
				else
				{
					this.mClip[i].mTime=this.mClip[i-1].mTime+this.mClip[i].mDelay;
				}
			}
		}
	}
	override EditChange(_pointer : CPointer,_childe : boolean)
	{
		super.EditChange(_pointer,_childe);
		if(_pointer.member=="mClip" || _pointer.member=="mTime")
		{
			this.Sort();
			this.EditRefresh();
		}
	}
	
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		if(_pointer.member=="mClip")
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,CClass.ExtendsList(CClip));

	}
	EditHTMLInit(_div : HTMLDivElement)
	{
		super.EditHTMLInit(_div);
		if(window["AniTool"]!=null)
		{
			var button=document.createElement("button");
			button.innerText="AniTool";
			button.onclick=()=>{
				window["AniTool"](this);
			};
			
			_div.append(button);
		}
		
	}
};



