

import {CComponent} from "../component/CComponent.js"
import {CAnimation,CClip,CClipImg,CClipVideo,CClipCoodi, CClipDestroy,CClipPRS, CClipMesh, CClipColorAlpha, CClipShaderAttr, CClipForce} from "../component/CAnimation.js"
import { CBlackBoardRef, CObject, CPointer } from "../../basic/CObject.js";

export class CAniFlow extends CComponent
{
	public mFClip : Array<CClip>=new Array<CClip>();
	public mTime : number=0;
	public mOffset : number=0;
	public mSpeed : number=1;
	public mPlay : boolean=true;
	public mBlackBoard : string=null;
	public mAni : CAnimation=null;


	public mPaintOff : number;
	public mInterMax : number=0;
	public mInterTime : number=0;
	public mLoopCount : number=0;

	constructor();
	constructor(_blackBoard : string);
	constructor(_ani : CAnimation);
	constructor(_ani : any=null)
	{
		super();
		this.mSysc=CComponent.eSysn.AniFlow;
		this.mPaintOff=0;
		this.ResetAni(_ani);
	}
	Icon(){		return "bi bi-recycle";	}
	SetInter(_max)
	{
		this.mInterMax=_max;
		this.mInterTime=0;
	
	}
	IsEnd()
	{
		return this.mFClip.length == 0 && this.mOffset >= this.mAni.mClip.length;
	}
	ResetTime()
	{
		this.mPlay=true;
		this.mTime=0;
		this.mOffset=0;
		this.mLoopCount=0;
		this.mFClip=[];
	}
	ResetAni();
	ResetAni(_ani : string);
	ResetAni(_ani : CBlackBoardRef<CAnimation>);
	ResetAni(_ani : CAnimation);
	ResetAni(_ani=null,_key=null)
	{
		if(_key!=null)
		{
			if(_key!=this.IsKey() || this.Key()!=_key)
				return;
		}
		if(typeof _ani == "string")
		{
			this.mBlackBoard=_ani;
			this.mAni=null;
		}
		else if(_ani instanceof CBlackBoardRef) {
			this.mBlackBoard=_ani.mKey;
			this.mAni = null;
		}
		else if(_ani!=null)
		{
			this.mAni=_ani;
		}
		
		this.ResetTime();
		this.mFClip=new Array<CClip>();
		
	
		
		
		
		
		//if(this.m_owner!=null)
		//	this.Update(1);
	}
	SetSpeed(_speed : number)	{	this.mSpeed=_speed;}
	Update(_delay : number)
	{
		
		
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="m_ani" && this.mBlackBoard!=null)
			return false;
		
		

		return super.IsShould(_member,_type);
	}
	EditForm(_pointer : CPointer,_div : HTMLDivElement,_input : HTMLInputElement)
	{
		super.EditForm(_pointer,_div,_input);
		if(_pointer.member=="m_ani" )
		{
			let btn=document.createElement("button");
			btn.innerText="생성";
			btn.onclick=()=>{
				this.mAni=new CAnimation();
				this.mBlackBoard=null;
				this.EditRefresh();
			};
			_div.append(btn);
		}
	}
	EditHTMLInit(_div : HTMLDivElement)
	{
		super.EditHTMLInit(_div);
		if(this.mAni==null)
		{
			var button=document.createElement("button");
			button.innerText="AniCreate";
			button.onclick=()=>{
				this.mAni=new CAnimation();
				this.EditRefresh();
			};
			
			_div.append(button);
		}
		
	}
	// GetBlackBoardAni(_str : string)
	// {
		
	// 	this.ResetAni(_str);
	// }
}
import CAniFlow_imple from "../../canvas_imple/component/CAniFlow.js";


CAniFlow_imple();