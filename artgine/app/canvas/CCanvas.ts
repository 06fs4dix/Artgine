import { CBlackBoardRef, CObject, CPointer } from "../../basic/CObject.js";

import { CFrame } from "../../util/CFrame.js";
import { CUpdate, IAutoRender, IAutoUpdate } from "../../basic/Basic.js";
import { IFile } from "../../system/System.js";
import { CGeometryComp, CGeometryInfo } from "../component/CGeometryComp.js";
import { CStream } from "../../basic/CStream.js";
import { CArray } from "../../basic/CArray.js";
import { CSubject } from "../subject/CSubject.js";
import { CRouteMsg } from "../CRouteMsg.js";
import { CBrush } from "./CBrush.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CCamera } from "../../render/CCamera.js";
import { RenderQueTool } from "../../tool/RenderQueTool.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CClass } from "../../basic/CClass.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { CDOM } from "../../basic/CDOM.js";
import { CAlert } from "../../basic/CAlert.js";
import { CBase64File } from "../../util/CBase64File.js";
import { CAtlas } from "../../util/CAtlas.js";
import { CJSON } from "../../basic/CJSON.js";
import { CLight } from "../component/CLight.js";
import { CFile } from "../../system/CFile.js";
import { CShader } from "../../render/CShader.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CRay } from "../../geometry/CRay.js";
import { CCollider } from "../component/CCollider.js";
import { CBrushComp } from "../component/CBrushComp.js";





var gRenderQue=new Array<CCanvas>();
var gCanvas=new Map<CFrame,Array<CCanvas>>();
export class CPairStrStr 
{
	first;
	second;
    constructor(t, r) { this.first = t, this.second = r; }
}

export class CCanvasPlugin extends CObject
{
	mCanvas : CCanvas;
	mDestroy=false;
	constructor()
	{
		super();
	}
	override IsShould(_member: string, _type: CObject.eShould): boolean {

		if(_member=="mCanvas" || _member=="mCanvas")
			return false;
		return super.IsShould(_member,_type);
	}
	Exe(){};
	SetCanvas(_canvas : CCanvas)
	{
		this.mCanvas=_canvas;
	}
	Destroy()
	{
		this.mDestroy=true;
	}
}
export class CCanvas extends CObject implements IAutoUpdate,IAutoRender,IFile
{
	protected mRemoveList = new Array<string>();
	protected mKeyChangeList = new Array();
	protected mGI : CGeometryInfo= null;

	
	public mPacketArr=new CArray<CStream>();
	
	public mSubMap = new Map<string,CSubject>();
	protected mAttachCanvas = new Array<CBlackBoardRef<CCanvas>>();
	
	
	public mBroMsg=new Array<CRouteMsg>();
	public mBroLen=0;


	public mResMap = new Map<string, any>();
	private mCameraKey="2D";


	public mPause = false;
	public mPushSub=new CArray<CSubject>();
	public mSave=true;
	

	//mWebSocket : CWebSocket=null;

	protected mFrame : CFrame= null;
	protected mBrush : CBrush;
	
	mPlugin =new  Array<CCanvasPlugin>();



	
	constructor(_fw : CFrame,_brash : CBrush,_GI : CGeometryInfo)
	{
		super();

		this.mFrame=_fw;
		this.mBrush=_brash;
		this.mGI=_GI;

		
		if(_fw==null)	return;
		
		if(_fw.PF().mIAuto)	_fw.PushIAuto(this);
		
		let list=this.ListCanvas();
		if(list==null)
		{
			list=[];
			gCanvas.set(this.mFrame,list);
		}
		list.push(this);

		//gCanvas.set(_fw,this);
		
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		
		if(_member=="mBrush" || _member=="mRemoveList" || _member=="mFrame" || _member=="mPushSub" ||
			_member=="mBroMsg" || _member=="mBroLen"  ||_member=="mPacArr" ||
			_member=="mKeyChangeList" || _member=="mGI" || _member=="mChangeRPMgr")
			return false;
		return super.IsShould(_member,_type);
	}
	SetPause(_pause : boolean)
	{
		this.mPause=_pause;
	}
	IsPause(): boolean {
		return this.mPause;
	}
	override Icon(){		return "bi bi-aspect-ratio";	}

	PushPlugin(_plugin : CCanvasPlugin)
	{
		this.mPlugin.push(_plugin);
		_plugin.SetCanvas(this);

	}
	RemovePlugin(_className)
	{
		for(let i=0;i<this.mPlugin.length;++i)
		{
			if(this.mPlugin[i].constructor.name==_className || this.mPlugin[i] instanceof _className)
			{
				this.mPlugin[i].Destroy();
			}
		}
	}
	// gCanvas(모듈 스코프 전역)는 AS(big/artgine/wasm/app/canvas/ASMCanvas.ts)에서도 이 메서드를
	// _this(CCanvas 인스턴스) 기준 일반 인스턴스 호출(CASM.OCall_O(_this, K_ListCanvas))로 그대로
	// 부른다 — this.mFrame을 쓰는 평범한 인스턴스 메서드라 static 우회가 필요 없다.
	ListCanvas()
	{
		return gCanvas.get(this.mFrame);
	}
	Destroy()
	{
		this.Clear();
		let list=this.ListCanvas();
		let index = list.indexOf(this);
		if(index != -1) {
			list.splice(index, 1);
		}

	}
	
	// SetRPMgr(_rpMgr : CRPMgr) 
	// {


	// 	if(this.mRPMgr==null && _rpMgr==null)	
	// 	{
	// 		this.mChangeRPMgr=null;
	// 		return;
	// 	}
			

	// 	if(_rpMgr==null)
	// 		this.mChangeRPMgr=new CRPMgr();
	// 	else
	// 		this.mChangeRPMgr=_rpMgr;
	// }
	ClearBatch() {
		this.mBrush.ClearRen();
	}
	// GetRPMgr() {
	// 	return this.mRPMgr;
	// }
	PushPacket(_pac : CStream)
	{
		this.mPacketArr.Push(_pac);
	}
	GetPacketArr(_swap=null)
	{
		return this.mPacketArr;
	}
	RenderOrder()	{	return new CArray();}
	// 실제 구현은 app_imple/canvas/CCanvas.ts(CCanvas_imple)로 옮겼다 — Update()와 같은 관례
	// (선언부는 여기 스텁, 구현부는 app_imple 쪽).
	PTUpdate(_ptList : Array<CPaint>)
	{

	}
	

	
	override EditHTMLInit(_div: HTMLDivElement): void {
		super.EditHTMLInit(_div);
		var div=_div;
		if(window["CH5HelperTool"]!=null)
		{
			var button=CDOM.TagToDom("button");
			button.innerText="CreateCH5";
			button.onclick=()=>{
				window["CH5HelperTool"](this, this.mFrame);
			};
			
			_div.append(button);
		}

		
		
		var button=CDOM.TagToDom("button");
		button.innerText="RenderQueTool";
		button.onclick=()=>{
			RenderQueTool(this.mBrush);
		};
		
		_div.append(button);
		

		var input=CDOM.TagToDom("input");
		input.type="search";
		input.className="form-control";
		input.id="canvasSearch";
		input.placeholder="Search";
		input.onkeyup=(e)=>{
			var t=e.target as HTMLInputElement;
			var val=t.value;
			var ch=div.getElementsByClassName("border p-1 mt-1");
			for(var each0 of ch)
			{
				if(each0==t)	continue;

				var hel=each0 as HTMLElement;
				if(each0.textContent.indexOf("mSubMap : map")!=-1){}
				else if(each0.textContent.indexOf(val)!=-1)
					hel.style.display="";
				else
					hel.style.display="none";
				
			}
		};
		
		div.prepend(input);



	}
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)
	{
		super.EditForm(_pointer,_body,_input);

		if(_pointer.member=="mRPMgr")
			CUtilObj.NullEdit(_pointer,_body,_input,CClass.New("CRPMgr"));
		else if(_pointer.member=="mAttachCanvas")
		{
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[new CBlackBoardRef<CCanvas>]);
		}
		else if(_pointer.refArr[_pointer.refArr.length-1]==this.mSubMap)
		{
			CUtilObj.MapAdd(_pointer,_body,_input,CClass.ExtendsList(CSubject,true),(_obj)=>{
				this.PushSub(_obj,false);
			});
		}
		if(_pointer.refArr[_pointer.refArr.length-1]==this.mResMap)
		{

			

			let ukey=CUniqueID.GetHash();
			var watchList=new Array();
			for(let wName of CClass.ExtendsList(CObject,true)) {
				watchList.push({
					"<>":"option", 
					"value":wName
				});
			}
			var res={"<>":"div","class":"row","html":[
				{"<>":"div","class":"col-8","html":[
					{"<>":"input","type":"text","class":"form-control","id":ukey+"resClass","placeholder":"Class",
						"list":this.ObjHash()+"Class_list","onkeydown":(e)=>{
							if (e.key === "Enter") 
							{
								e.preventDefault();
								let sel=e.target.value;
								let newObj  : CSubject=CClass.New(sel);
								this.mResMap.set(newObj.Key(),newObj);
								this.EditRefresh();
								this["mObjectDiv"].querySelectorAll('span.text-warning').forEach(span => {
									if (span.textContent?.trim().startsWith("mResMap")) {
										const parentDiv = span.closest('div.border');
										if (parentDiv) {
											parentDiv.click();
										}
									}
								});
								e.target.value="";
							}
						}
					},
					{"<>":"datalist","id":this.ObjHash()+"Class_list","html":watchList}
				]},

				// {"<>":"div","class":"col","html":[
				// 	{"<>":"input","type":"text","class":"form-control","id":this.WTKey()+"resBlack","placehold":"BlackBoard"}
				// ]},
				{"<>":"div","class":"col-4","html":[
					{"<>":"button","type":"button","class":"btn btn-primary btn-block","text":"Add",
						"onclick":()=>{
							//let testtestest=CWebUtil.ID(this.WTKey()+"resClass");
							let sel=CDOM.IDValue(ukey+"resClass");
							let newObj  : CSubject=CClass.New(sel);
							if(newObj==null)
							{
								CAlert.E("unknow class");
							}
							else
							{
								this.mResMap.set(newObj.Key(),newObj);
								this.EditRefresh();
								this["mObjectDiv"].querySelectorAll('span.text-warning').forEach(span => {
									if (span.textContent?.trim().startsWith("mResMap")) {
										const parentDiv = span.closest('div.border');
										if (parentDiv) {
											parentDiv.click();
										}
									}
								});
								
							}
							
						}
					}
				]},
			]}
			_input.prepend(CDOM.DataToDom(res));
		}
	}

	
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);
		if(_child==false)return;

		if(_pointer.IsRef(this.mResMap) && _pointer.member=="mKey")
		{
			for(var key of this.mResMap.keys())
			{
				if(this.mResMap.get(key)==_pointer.target)
				{
					this.mResMap.delete(key);
					this.mResMap.set(_pointer.target.mKey,_pointer.target);

					this.mFrame.Res().Set(_pointer.target.mKey,_pointer.target);
					break;
				}
			}
			this.EditRefresh();
		}
		else if(_pointer.IsRef(this.mSubMap) && _pointer.member=="mKey" && _pointer.refArr.length==4)
		{
			_pointer.target.SetKey();
			for(var key of this.mSubMap.keys())
			{
				if(this.mSubMap.get(key)==_pointer.target)
				{
					this.mSubMap.delete(key);
					this.mSubMap.set(_pointer.target.mKey,_pointer.target);
					

					break;
				}
			}
			
			this.EditRefresh();
		}
		else if(_pointer.member=="mSubMap")
		{
			
			_pointer.target.Destroy();

		}
		// else if(_pointer.member=="mRPMgr")
		// {
		// 	this.mRPMgr.Reset();
		// }
	}
	GetFrame()	{	return this.mFrame;	}
	public async LoadRes() {
		const promises = [];
		for(let [fileName, res] of this.mResMap) 
		{
			if(res instanceof CBase64File) {
				promises.push(this.mFrame.Load().LoadSwitch(res.FileName(), res.mData, res.mOption));
			}
			else if(res instanceof CAtlas) {
				this.mFrame.Res().Set(fileName, res);
			}
		}

		await Promise.all(promises);
	}
	public CopyResMap(_canv : CCanvas) {
		//copy res
		for(let [fileName, clip] of _canv.mResMap) {
			this.mResMap.set(fileName, clip.CopyExport());
		}
		this.LoadRes();
	}
	override ImportCJSON(_json: CJSON) 
	{
		super.ImportCJSON(_json);	
		this.LoadRes();
		for (let eachKey of this.mSubMap)
		{
			let each0=eachKey[1];
			each0.SetFrame(this.mFrame);
		}

		for (let [key,value] of this.mResMap)
		{
			
			//this.mResMap.set(key,new Proxy(value,ProxyHandle));
			this.mResMap.set(key,CObject.ProxyTree(value));
			
		}

		for(let plugin of this.mPlugin)
		{
			plugin.mCanvas=this;
		}
		// const rpMgr = this.mRPMgr;
		// this.mRPMgr = null;
		// this.mBrush.AutoRP().clear();
		// this.ClearBatch();
		// this.SetRPMgr(rpMgr);
		
		return this;
	}
	GetBrush()	{	return this.mBrush;	}
	
	// }
	
	PushBroMsg(_msg :CRouteMsg)
	{
		if(this.mBroLen<this.mBroMsg.length)
		{
			this.mBroMsg[this.mBroLen]=_msg;
		}
		else
			this.mBroMsg.push(_msg);
		this.mBroLen++;
	}
	ResetBroMsg()
	{
		this.mBroLen=0;
	}
	
	
	Clear()
	{
		for(let i=0;i<this.mPushSub.Size();++i)
		{
			this.mPushSub.Find(i).Destroy();
		}
		this.mPushSub.Clear();
		
		for (var eachKey of this.mSubMap)
		{
			var each0=eachKey[1];
			each0.Destroy();
		}
		this.ClearBatch();
	}
	Detach(_key)
	{
		if(this.mSubMap.get(_key)==null)
			return;
		let obj=this.mSubMap.get(_key);
		obj.Reset();
		this.mSubMap.delete(_key);
		return obj;
	}
	DetachRes(_key)
	{
		if(this.mResMap.get(_key)==null)
			return;
		let obj=this.mResMap.get(_key);
		obj.Reset();
		this.mResMap.delete(_key);
		return obj;
	}

	DestroyLight(_light : CLight)
	{

	}
	
	
	PushColCan(_blackboard : CBlackBoardRef<CCanvas>) { this.mAttachCanvas.push(_blackboard); }
	GetCam() : CCamera
	{
		return this.mBrush.GetCamera(this.mCameraKey);
	}
	GetCameraKey()	{	return this.mCameraKey;	}
	SetCameraKey(_key : string)
	{
		this.mCameraKey=_key;
	}

	async LoadJSON(_file : string=null)
	{
		let buf=await CFile.Load(_file);
		if(buf==null)
			return true;
		this.ImportCJSON(new CJSON(buf));
		return false;
	}
	async SaveJSON(_file : string=null)
	{
		
		let keyArr = [];
		for(let [key, clip] of this.mResMap) {
			if(clip["mKey"]!=null && clip["mKey"]!=key)
			{
				this.mResMap.delete(key);
				keyArr.push(clip);
			}
			
		}
		for(let each0 of keyArr) 
		{
			this.mResMap.set(each0.Key(),each0);
		}
		
		if(this.mSave)	CFile.Save(this,_file+".json");
		
	}
	// override ExportJSON(): { class: string } 
	// {		
	// 	//rpMgr에서 넣어준 오브젝트 / RP 제거
	// 	let rpMgr = this.mRPMgr;
	// 	this.SetRPMgr(null);
	// 	this.mRPMgr = rpMgr;
	// 	const json = super.ExportJSON();
	
	// 	//rpMgr 다시 세팅
	// 	this.mRPMgr = null;
	// 	this.SetRPMgr(rpMgr);
		
	// 	return json;
	// }
	Update(_update : CUpdate)
	{

	}//update

	CComMsg(_delay)
	{
		
	}
	static RenderCanvas(_brush : CBrush,_canArr : Array<CCanvas>)
	{
		
	}
	RenderQue(_push : boolean)
	{
		if(_push)
		{
			if(gRenderQue.length!=0 && gRenderQue[0].mBrush!=this.mBrush)
			{
				CAlert.E("brush different!");
			}
				
			gRenderQue.push(this);
		}
		else if (gRenderQue.length>0)
		{
			CCanvas.RenderCanvas(this.mBrush,gRenderQue);
			gRenderQue.length=0;
		}
		return true;
	}
	
	Render()
	{
		

	}
	static GlobalVF(_brush : CBrush,_vf : CShader,_cam : CCamera)
	{
		
	}
	
	static RenderFinish(_brush : CBrush)
	{

	}
	CSubjectDestroy(_subject : CSubject)
	{

	}
	
	
	GetSubMap() { return this.mSubMap; }
	GetResMap() { return this.mResMap; }

	Find<T  extends CSubject>(_key : string,_child=false) : T
	{
		let data=this.mSubMap.get(_key) as T;
		if(data==null || data.IsDestroy())
		{
			if(_child==true)
			{
				for(var each0 of this.mSubMap.values())
				{
					var chArr=each0.FindChilds(_key,true);
					if(chArr.length>0)
					{
						return chArr[0]  as T;
					}
				}
			}
			for(let i=0;i<this.mPushSub.Size();++i)
			{
				if(this.mPushSub.Find(i).mKey==_key)
					return this.mPushSub.Find(i)  as T;
			}

			return null;
		}
		
			
		return data;
	}
	FindRes(_key : string)
	{
		return this.mResMap.get(_key);
	}
	FindParent(_obj: CSubject)
	{
		for (const subject of this.mSubMap.values()) 
		{
			if(_obj==subject)
				return this;
			const parent = this.FindParentIn(subject,_obj);
			if (parent) return parent;
		}
		for (const subject of this.mResMap.values()) 
		{
			if(subject instanceof CSubject==false)	continue;
			if(_obj==subject)
				return this;
			const parent = this.FindParentIn(subject,_obj);
			if (parent) return parent;
		}
		return null;
	}
	private FindParentIn(_parent: CSubject,_target: CSubject): CSubject | null {
		for (const child of _parent.mChild) {
			if (child === _target) {
				return _parent;
			}
			let r=this.FindParentIn(child, _target);
			if(r!=null)	return r;
			
		}
		return null;
	}
	PushSub<T extends CSubject>(_obj : T,_que=true)
	{
		let key=(_obj as CSubject).Key();
		let obj=this.Find(key) as CSubject;
		if (obj != null)
		{
			if (obj.IsDestroy())
			{
				
				this.mSubMap.delete(obj.Key());
				obj.SetKey("pass");
				
			}
			else
			{
				this.mSubMap.set(key,_obj);
				CAlert.W(key+"already key");
			}
				
		}
		obj=_obj as CSubject;
		//
		

		obj.ClearKeyChange();
		if(obj.GetFrame()==null)
			obj.SetFrame(this.mFrame);
		
		if(_que==false)
			this.mSubMap.set(obj.Key(),obj);
		else
			this.mPushSub.Push(obj);

		return _obj as T;		
	}
	KeyChange(_org : string, _tar : string)
	{

		var obj=this.mSubMap.get(_org);
		if (obj==null)
			return;
		if(_org==_tar)
		{
			obj.ClearKeyChange();
			return;
		}
		
		//obj.m_key=_tar;
		//obj.SetKey(_tar);
		obj.ClearKeyChange();
		this.mSubMap.set(_tar,obj);
		this.mSubMap.delete(_org);
	}
	FindNearLength(_pos : CVec3,_len)
	{
		var rVal = new Array();
		
		for (var eachKey of this.mSubMap)
		{
			var obj = eachKey[1];
			if (obj != null)
			{
				var len=CMath.V3Len(CMath.V3SubV3(_pos, obj.GetPos()));
				if (len < _len)
				{
				
					rVal.push(obj);
				}
			}
		}
		return rVal;
	}
	Pick(_ray : CRay)
	{
		let rVal=new Array<CCollider>();
		for (var eachKey of this.mSubMap)
		{
			var obj = eachKey[1];
			let clList=obj.FindComps(CCollider,true) as Array<CCollider>;
			for(let cl of clList)
			{
				if(cl.PickChk(_ray))
				{
					rVal.push(cl);
				}
			}
		}
		return rVal;
	}
	
	SendGetBrush(_camcomp : CBrushComp)
	{
		_camcomp.RecvGetBrush(this.mBrush);
	}
	SendGetGeometryInfo(_camcomp : CGeometryComp)
	{
		_camcomp.RecvGetGeometryInfo(this.mGI,this.Key());
	}
    SendGetCamera(_paint : CPaintTerrain)
    {
        _paint.RecvGetCamera(this.GetCam());
    }
	GetGI()	{	return this.mGI;	}
	
	
	// override PatchTrackDefault()
	// {
	// 	this.PatchTrack("mSubMap");
	// }

}





import CCanvas_imple from "../../app_imple/canvas/CCanvas.js";
import { CPaintTerrain } from "../component/paint/CPaintTerrain.js";
CCanvas_imple();