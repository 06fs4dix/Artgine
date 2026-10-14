import { CUpdate } from "../../basic/Basic.js";
import { CDOM } from "../../basic/CDOM.js";
import { CJSON } from "../../basic/CJSON.js";
import { CObject } from "../../basic/CObject.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CTexture } from "../../render/CTexture.js";
import { CFile } from "../../system/CFile.js";
import { IFile } from "../../system/System.js";
import { CCondition } from "../../util/CCondition.js";
import { CSurface } from "../subject/CSurface.js";

export class CRPAuto extends CRenderPass 
{
	static eState={
		"class":"class",
		"mTag":"mTag",
	};
	mAnd=new Array<CCondition>();
	mOr=new Array<CCondition>();
	public mCopy:boolean=false;//rp가 복사되서 페인트에 들어감
	PushAnd(_con : CCondition)
	{
		this.mAnd.push(_con);
	}
	PushOr(_con : CCondition|CCondition[])
	{
		if(_con instanceof Array)
			this.mOr.push(..._con);
		else
			this.mOr.push(_con);
	}
}

export class CRPMgr extends CObject implements IFile
{
	public mRPArr : Array<CRPAuto> = new Array<CRPAuto>();
	public mSufArr : Array<CSurface> =new Array<CSurface>();
	public mTexMap : Map<string, CTexture> = new Map<string, CTexture>();

	public mUpdate=CUpdate.eType.Not;

	override IsShould(_member: string, _type: CObject.eShould): boolean {
		if(_member == "mUpdate") return false;
		return super.IsShould(_member, _type);
	}

	PushRP(_data : CRPAuto)
	{
		this.mRPArr.push(_data);
		this.mUpdate=CUpdate.eType.Updated;
		return _data;
	}
	PushSuf(_data : CSurface)
	{
		this.mSufArr.push(_data);
		this.mUpdate=CUpdate.eType.Updated;
		return _data;
	}
	PushTex(_key : string,_data : CTexture)
	{
		this.mTexMap.set(_key,_data);
		this.mUpdate=CUpdate.eType.Updated;
		return _key;
	}
	
	RemoveRP(_data : CRPAuto)
	{
		const i = this.mRPArr.indexOf(_data);
		if(i >= 0) this.mRPArr.splice(i, 1);
	}
	RemoveSuf(_data : CSurface)
	{
		const i = this.mSufArr.indexOf(_data);
		if(i >= 0) this.mSufArr.splice(i, 1);
	}
	RemoveTex(_key : string)
	{
		this.mTexMap.delete(_key);
	}

	async LoadJSON(_file=null)
	{
		let buf=await CFile.Load(_file);
		if(buf==null)	return true;
		this.ImportCJSON(new CJSON(buf));
		return false;
	}
	async SaveJSON(_file=null)
	{
		CFile.Save(this.ToStr(),_file);
	}
	override EditHTMLInit(_div : HTMLDivElement)
	{
		super.EditHTMLInit(_div);
		var button=CDOM.TagToDom("button");
		button.innerText="RPMgrTool";
		button.onclick=()=>{
			if(window["RPMgrTool"]!=null)
				window["RPMgrTool"](this);
		};
		_div.append(button);
	}
}