



import {CH5Canvas} from "./CH5Canvas.js";
import {CEvent} from "../basic/CEvent.js";

import {CModal} from "../basic/CModal.js";
import {CDomFactory} from "../basic/CDOMFactory.js";
import {CObject,  CPointer } from "../basic/CObject.js";
import {CUtilObj} from "../basic/CUtilObj.js";
import {CAlert} from "../basic/CAlert.js";


export class CTextureInfo extends CObject
{
	constructor(_target,_format,_count=1)
	{
		super();
		this.mTarget=_target;
		this.mFormat=_format;
		this.mCount=_count;
	}
	mTarget;
	mFormat;
	mCount;
	
	EditForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {

		
	

		if(_pointer.member == "mTarget") {
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CTexture.eTarget)) {
				if (isNaN(Number(text))) {
					textArr.push(text);
					valArr.push(val);
				}
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
		else if(_pointer.member == "mFormat") {
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CTexture.eFormat)) {
				if (isNaN(Number(text))) {
					textArr.push(text);
					valArr.push(val);
				}
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
	}
}
export class CTexture extends CObject 
{
	
	
	private mWidth : number = 0;
	private mHeight : number = 0;
	private mBuffer : Array<any> = new Array<any>;
	private mGBuffer : Array<any> = new Array<any>;
	private mMipMap : number = CTexture.eMipmap.None;
	private mWrap : number = CTexture.eWrap.Clamp;
	private mFilter : number = CTexture.eFilter.Neaest;
	private mInfo : Array<CTextureInfo> = [new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8)];
	//리사이즈시 화면 비율을 유지하려고 필요한 변수
	//화면 100사이즈에 50으로 만들면 50으로 화면이 줄면 25로 유지하려고 존재함
	private mRWidth : number=0;
	private mRHeight : number=0;
	private mAnti : number = 0;
	private mAlpha =false;
	private mAutoResize = true;

	public mUpdate=new Set<number>();

	//두개 사용중인 이유는 anti때문이다 절대 지우지 마라!!!
	public mFrameBuf : Array<any>=new Array();
	public mAntiBuf : Array<any>=new Array();
	public mRemoveBuf : Array<any>=new Array();

	public mDepthBuf=null;
	public mColorBuf : Array<any>=new Array();
	public mVideo=false;
	public mFrame=false;//webgpu용이다
	public mReadPixelEvent : CEvent=null;

	
	constructor()
	{
		super();
	}
	Icon(){		return "bi bi-image";	}
	LoaderOption() : string
	{
		return JSON.stringify({wrap:this.mWrap,filter:this.mFilter,mipMap:this.mMipMap});
	}
	IsFrameBuf(){	return this.mFrameBuf.length!=0;	}
	IsBindFrame(){	return this.mFrame;	}
	BindFrame(_ena)	{	this.mFrame=_ena;	}
	override IsShould(_member: string, _type: CObject.eShould): boolean 
	{
		if(_member == "mBuffer" || _member == "mGBuffer" || _member == "mFrameBuf" || _member == "mDepthBuf" || 
			_member == "mColorBuf" || _member == "mReadPixelEvent" || _member == "mAntiBuf" || _member == "mRemoveBuf" || 
			_member == "mUpdate" || _member == "mVideo" || _member == "mFrame") 
		{
			return false;
		}
		return super.IsShould(_member,_type);
	}
	
	override EditHTMLInit(_div: HTMLDivElement): void 
	{
		super.EditHTMLInit(_div);

		//버퍼 없으면 생성, 이후 리로드 눌러야 재생성함
		if(this.mBuffer.length == 0 && this.mReadPixelEvent!=null) {
			this.mReadPixelEvent.Call(this);
		}

		let isCubemap = this.mInfo[0].mTarget == CTexture.eTarget.Cube;
		let isTexArr = this.mInfo[0].mTarget == CTexture.eTarget.Array;
		let count = this.mInfo[0].mCount - 1;

		for(var i = 0; i < this.mBuffer.length; i++)
		{
			let buf = this.mBuffer[i];
			if(isCubemap) {
				if(buf instanceof Uint8Array)
				{
					CH5Canvas.Init(this.GetWidth() * 4,this.GetHeight() * 3);
					CH5Canvas.PushImgData(this.mBuffer[i],this.GetWidth()*2,this.GetHeight()*1,this.GetWidth(),this.GetHeight());
					CH5Canvas.PushImgData(this.mBuffer[i + 1],this.GetWidth()*0,this.GetHeight()*1,this.GetWidth(),this.GetHeight());
					CH5Canvas.PushImgData(this.mBuffer[i + 2],this.GetWidth()*1,this.GetHeight()*2,this.GetWidth(),this.GetHeight());
					CH5Canvas.PushImgData(this.mBuffer[i + 3],this.GetWidth()*1,this.GetHeight()*0,this.GetWidth(),this.GetHeight());
					CH5Canvas.PushImgData(this.mBuffer[i + 4],this.GetWidth()*1,this.GetHeight()*1,this.GetWidth(),this.GetHeight());
					CH5Canvas.PushImgData(this.mBuffer[i + 5],this.GetWidth()*3,this.GetHeight()*1,this.GetWidth(),this.GetHeight());
					buf["src"]=CH5Canvas.GetDataURL();
				}
				i += 5;
			}
			else if(isTexArr) {
				if(buf instanceof Uint8Array)
				{
					CH5Canvas.Init(this.GetWidth() * 4,this.GetHeight() * Math.ceil(count/4));
					for(let j = 0; j < count; j++) {
						CH5Canvas.PushImgData(this.mBuffer[i + j],this.GetWidth()*(j%4),this.GetHeight()*Math.floor(j/4),this.GetWidth(),this.GetHeight());
					}
					buf["src"]=CH5Canvas.GetDataURL();
				}
				i += count;
			}
			else if(!(buf instanceof Image))
			{
				if(buf instanceof Uint8Array)
				{
					CH5Canvas.Init(this.GetWidth(),this.GetHeight());
					CH5Canvas.PushImgData(buf,0,0);
					buf["src"]=CH5Canvas.GetDataURL();
				}
			}
			let img = {
				"<>": "img",
				"src": buf["src"],
				"style": "max-width:256px; max-height:512px; image-rendering:pixelated;",
				"onclick":(e) => {
					let modal=new CModal();
					modal.SetBody("<img src=" + buf["src"] + " style='min-width:128px;height:auto;max-width:100%;max-height:100%;image-rendering:pixelated;'>");
					modal.SetBodyClose(true);
					modal.SetLimitPush(true);
					
					modal.SetZIndex(CModal.eSort.Manual,2000);
					modal.Open(CModal.ePos.Center);
					modal.FullSwitch();
					// let jbox = new CJBox(CJBox.Df.Modal, {
					// 	//width:"100%",height:"auto",
					// 	content:"<img src=" + buf["src"] + " style='min-width:128px;height:auto;max-width:100%;max-height:100%;'>",
					// 	onCloseComplete:(e) => {
					// 		jbox.destroy();
					// 	}
					// });
					// jbox.open();
				}
			};
			_div.prepend(CDomFactory.DataToDom(img));
			//break;
		}
	}
	EditForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {
		if(_pointer.member == "mMipMap") 
		{
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CTexture.eMipmap)) 
			{
				if (isNaN(Number(text))) {
					textArr.push(text);
					valArr.push(val);
				}
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr,true,()=>{CAlert.E("밉맵은 중간 변경 안됌");}));
		}
		else if(_pointer.member == "mWrap") {
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CTexture.eWrap)) {
				if (isNaN(Number(text))) {
					textArr.push(text);
					valArr.push(val);
				}
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
		else if(_pointer.member == "mFilter") {
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CTexture.eFilter)) {
				if (isNaN(Number(text))) {
					textArr.push(text);
					valArr.push(val);
				}
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
		else if(_pointer.member == "mAutoResize") {
			_div.innerHTML = "";
			_div.append(CDomFactory.DataToDom({
				'<>':'button', 'text':'ReLoad','style':'width:100%;', 'onclick':(e) => {
					this.mUpdate.clear();
					if(this.mReadPixelEvent!=null)
						this.mReadPixelEvent.Call(this);
					this.EditRefresh();
				}
			}));
		}

		

	}
	
	CreateBuf() : void
	{
		this.mBuffer = new Array<any>();

		for(var info of this.mInfo)
		{
			if(info.mFormat==CTexture.eFormat.RGBA8)
				this.mBuffer.push(new Uint8Array(this.mWidth*this.mHeight * 4*info.mCount));
			else
				this.mBuffer.push(new Float32Array(this.mWidth*this.mHeight * 4*info.mCount));
		}
		
	}
	
	SetAnti(_sample)	
	{	
		this.mAnti=_sample;	

		for(let buf of this.mFrameBuf)
		{
			this.mRemoveBuf.push(buf);
		}
		for(let buf of this.mColorBuf)
		{
			this.mRemoveBuf.push(buf);
		}
		this.mRemoveBuf.push(this.mDepthBuf);
		this.mColorBuf=new Array();;
		this.mFrameBuf=new Array();;
		this.mDepthBuf=null;
		
	}
	GetAnti()	{	return this.mAnti;	}

	SetBuf(_buf : HTMLImageElement);
	SetBuf(_buf : ArrayBuffer);
	SetBuf(_buf : ArrayBuffer);
	SetBuf(_buf : HTMLVideoElement);
	SetBuf(_buf : any)
	{
		if(_buf instanceof HTMLVideoElement)
			this.mVideo=true;
		if(this.mBuffer.length==0)
			this.mBuffer.push(_buf);	
		else
			this.mBuffer[0]=_buf;
	}
	GetGBuf()	{	return this.mGBuffer;	}
	SetGBuf(_gbuf)	{	this.mGBuffer=_gbuf;	}
	GetBuf() { return this.mBuffer; }
	GetAlpha()	{	return this.mAlpha;	}
	SetAlpha(_a)	{	this.mAlpha=_a;	}
	
	SetFilter(_option) {this.mFilter= _option;this.mUpdate.clear(); }
	SetWrap(_option) { this.mWrap = _option;this.mUpdate.clear(); }
	SetMipMap(_option) { this.mMipMap = _option; }
	GetWrap() { return this.mWrap;	 }
	GetFilter() { return this.mFilter; }
	GetWidth() { return this.mWidth; }
	GetHeight() { return this.mHeight; }
	GetMipMap() { return this.mMipMap; }
	
	GetInfo()	{	return this.mInfo;	}
	PushInfo(_info : Array<CTextureInfo>)
	{
		this.mInfo=_info;
	}

	GetRWidth() { return this.mRWidth; }
	GetRHeight() { return this.mRHeight; }
	SetResize(_width,_height)
	{
		this.mRWidth=_width;
		this.mRHeight=_height;
	}
	SetSize(_width,_height)
	{
		this.mWidth=_width;
		this.mHeight=_height;
	}
	GetAutoResize() {
		return this.mAutoResize;
	}
	SetAutoResize(_resize) {
		this.mAutoResize = _resize;
	}
}


export namespace CTexture
{
	export enum eFilter{
		Neaest=4,
		Linear=3,
	};
	export enum eWrap{
		Clamp=0,
		Repeat=1,
		Mirrored=2,
	};
	export enum eFormat{
		RGBA32F=5,
		RGBA8=6,
	};
	export enum eMipmap{
		None=0,
		GL=1,
		AlphaCac=2,
	};
	export enum eTarget{
		Sigle=7,
		Array=8,
		Cube=9,
	};
}