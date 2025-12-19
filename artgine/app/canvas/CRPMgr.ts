import { CClass } from "../../basic/CClass.js";
import { CDOM } from "../../basic/CDOM.js";
import { CJSON } from "../../basic/CJSON.js";
import { CObject, CPointer } from "../../basic/CObject.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CTexture } from "../../render/CTexture.js";
import { CFile } from "../../system/CFile.js";
import { IFile } from "../../system/System.js";
import { CCondition } from "../../util/CCondition.js";
import { CFrame } from "../../util/CFrame.js";
import { CPaint } from "../component/paint/CPaint.js";
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
	PushOr(_con : CCondition)
	{
		this.mOr.push(_con);
	}
}

export class CRPMgr extends CObject implements IFile
{
	//private mCanvas : CCanvas = null;
	mFrame : CFrame;

	public mRPArr : Array<CRPAuto> = new Array<CRPAuto>();
	public mSufArr : Array<CSurface> =new Array<CSurface>();
	public mTexMap : Map<string, CTexture> = new Map<string, CTexture>();

	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member == "mCanvas") {
			return false;
		}
		return super.IsShould(_member, _type);
	}

	SetFrame(_frame : CFrame) {
		this.mFrame = _frame;

		//create new texture
		this.Reset();
	}
	//GetCanvas()	{	return this.mCanvas;	}

	PushRP(_data : CRPAuto)
	{
		this.mRPArr.push(_data);
		return _data;
	}
	PushSuf(_data : CSurface)
	{
		this.mSufArr.push(_data);
		//더미로 일단 만들어둠
		if(this.mFrame!=null)
		{
			let tex=new CTexture();
			this.mFrame.Res().Push(_data.GetTexKey(),tex);
			tex.mFrameBuf.push(null);
		}
		return _data;
	}
	PushTex(_key : string,_data : CTexture)
	{
		this.mTexMap.set(_key,_data);
		if(this.mFrame!=null)
		{
			this.mFrame.Res().Push(_key,_data);
			_data.mFrameBuf.push(null);
		}
		return _key;
	}
	//GBuf까지 지워야함!
	RemoveTex(_key : string)
	{
		this.mTexMap.delete(_key);

		if(this.mFrame!=null)
		{
			this.mFrame.Res().Remove(_key);
			//_data.mFrameBuf.push(null);
		}
	}
	RemoveRP(_data : CRPAuto)
	{
		for(let i=0;i<this.mRPArr.length;++i)
		{
			if(this.mRPArr[i]==_data)
			{
				this.mRPArr.splice(i,1);
				return;
			}
		}
	}
	RemoveSuf(_data : CSurface)
	{
		for(let i=0;i<this.mSufArr.length;++i)
		{
			if(this.mSufArr[i]==_data)
			{
				this.mSufArr.splice(i,1);
				return;
			}
		}
	}

	//json save : m_rpCons의 텍스쳐 가져와서 저장(fw있어야 되는데 생각해봐야 할듯)
	//json load : m_rtCons에서 rt 생성

	SaveTexture()
	{
		for(let rp of this.mRPArr) {
			const texKey = rp.mRenderTarget;
			if(texKey == "" || this.mTexMap.has(texKey)) continue;


			const tex : CTexture = this.mFrame.Res().Find(texKey);
			if(tex == null) continue;


			const newTex = new CTexture();
			newTex.SetSize(tex.GetWidth(), tex.GetHeight());
			newTex.SetResize(tex.GetRWidth(), tex.GetRHeight());
			newTex.SetAlpha(tex.GetAlpha());
			newTex.SetAnti(tex.GetAnti());
			newTex.SetFilter(tex.GetFilter());
			newTex.PushInfo(tex.GetInfo());
			if(tex.IsKey()) {
				newTex.SetKey(tex.Key());
			}
			newTex.SetMipMap(tex.GetMipMap());
			newTex.SetWrap(tex.GetWrap());
			this.mTexMap.set(texKey, newTex);
		}
	}

	public Reset() 
	{
		if(this.mFrame == null) return;

		for(let [key, tex] of this.mTexMap) {
			let size : CVec2 = null;
			if(tex.GetWidth() != 0 && tex.GetHeight() != 0)
			{
				size=new CVec2()
				size.x = tex.GetWidth();
				size.y = tex.GetHeight();
			}
			this.mFrame.Ren().BuildRenderTarget(tex.GetInfo(),size,key);

			//this.m_can.GetFrame().Ren().ChangeAnti(key,tex.GetAnti());
			//this.m_can.GetFrame().Ren().ChangeFilter(key,tex.GetFilter());
		}
		// for(let key of this.mTexMap.keys())
		// {
		// 	let tex=this.mFrame.Res().Find(key);
		// 	this.mTexMap.set(key,tex);
			
		// }

	}

	public ExportCJSON(): CJSON {
		this.SaveTexture();
		return super.ExportCJSON();
	}

	
	async LoadJSON(_file=null)
	{
		let buf=await CFile.Load(_file);
		if(buf==null)	return true;
		this.ImportCJSON(new CJSON(buf));

		// this.mCanvas.SetRPMgr(this);
		// this.mCanvas.ClearBatch();
		// this.SetCanvas(this.mCanvas);

		return false;
	}

	async SaveJSON(_file=null)
	{
		CFile.Save(this.ToStr(),_file);
	}
	EditHTMLInit(_div : HTMLDivElement)
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