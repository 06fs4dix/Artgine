

import {CComponent} from "../component/CComponent.js"
import {CAnimation,CClip,CClipImg,CClipVideo,CClipCoodi, CClipDestroy,CClipPRS, CClipMesh,  CClipShaderAttr, CClipForce} from "../component/CAnimation.js"
import { CBlackBoardRef, CObject, CPointer } from "../../basic/CObject.js";
import { CUpdate } from "../../basic/Basic.js";


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
		this.SetAni(_ani);
	}
	override Icon(){		return "bi bi-recycle";	}
	SetInter(_max)
	{
		this.mInterMax=_max;
		this.mInterTime=0;
	
	}
	GetAni()
	{
		return this.mAni;
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
	override Recycle(): void {
		super.Recycle();
		this.ResetTime();
	}
	override Provider(_type: string, _state : Array<string>): void 
	{
		if(this.mAni!=null)
			_state.push("/aniFlow/"+this.mAni.Key()+(this.IsEnd()?"Stop":"Play"));
	}
	SetAni();
	SetAni(_ani : string);
	SetAni(_ani : CBlackBoardRef<CAnimation>);
	SetAni(_ani : CAnimation);
	SetAni(_ani : string|CAnimation);
	SetAni(_ani=null,_key=null)
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
			if(this.mAni==_ani)	return;
			this.mAni=_ani;
		}
		
		this.ResetTime();
		//this.mFClip=new Array<CClip>();
		
	
		
		
		
		
		//if(this.m_owner!=null)
		//	this.Update(1);
	}
	SetSpeed(_speed : number)	{	this.mSpeed=_speed;}
	override Update(_update : CUpdate)
	{
		
		
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="m_ani" && this.mBlackBoard!=null)
			return false;
		
		

		return super.IsShould(_member,_type);
	}
	override EditForm(_pointer : CPointer,_div : HTMLDivElement,_input : HTMLInputElement)
	{
		super.EditForm(_pointer,_div,_input);
		if(_pointer.member=="mAni" )
		{
			let btn=CDOM.TagToDom("button");
			btn.innerText="생성";
			btn.onclick=()=>{
				this.mAni=new CAnimation();
				this.mBlackBoard=null;
				this.EditRefresh();
			};
			_div.append(btn);
		}
	}
	override EditHTMLInit(_div : HTMLDivElement)
	{
		super.EditHTMLInit(_div);
		if(this.mAni==null)
		{
			var button=CDOM.TagToDom("button");
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


import CAniFlow_imple from "../../app_imple/component/CAniFlow.js";
import { CDOM } from "../../basic/CDOM.js";
CAniFlow_imple();