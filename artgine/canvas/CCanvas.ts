import {CSubject} from "./subject/CSubject.js"
import {CLight} from "./component/CLight.js"
import {CMath} from "../geometry/CMath.js"
import {CCamera} from "../render/CCamera.js"
import {CShader} from "../render/CShader.js"
import {CBrush} from "./CBrush.js"
import {CJSON} from "../basic/CJSON.js"
import {CArray} from "../basic/CArray.js"
import {CString} from "../basic/CString.js"
import {CVec3} from "../geometry/CVec3.js"
import {CStream} from "../basic/CStream.js"
import {CUniqueID} from "../basic/CUniqueID.js"
import {CBase64File} from "../util/CBase64File.js"
import {CCamComp} from "./component/CCamComp.js"
import { CGlobalGeometryInfo } from "./component/CGlobalGeometryInfo.js"
import {CRay} from "../geometry/CRay.js"
import {CCollider} from "./component/CCollider.js"
import {CAtlas} from "../util/CAtlas.js"
import { CUpdate, IAutoRender, IAutoUpdate } from "../basic/Basic.js"
import {CDomFactory} from "../basic/CDOMFactory.js"
import {CWebSocket} from "../network/CWebSocket.js"
import {CRoomClient} from "../server/CRoomClient.js"
import { CBlackBoardRef, CObject, CPointer } from "../basic/CObject.js"
import { CFrame } from "../util/CFrame.js"
import { CRouteMsg } from "./CRouteMsg.js"
import { CClass } from "../basic/CClass.js"
import { CUtil } from "../basic/CUtil.js"
import { CAlert } from "../basic/CAlert.js"
import { CUtilObj } from "../basic/CUtilObj.js"
import { IFile } from "../system/System.js"
import { CFile } from "../system/CFile.js"
import {RenderQueTool} from "../tool/RenderQueTool.js"
import { CConsol } from "../basic/CConsol.js"
import { CPaint } from "./component/paint/CPaint.js"
import { CRPMgr } from "./CRPMgr.js"


var gRenderQue=new Array<CCanvas>();
var gCanvas=new Array<CCanvas>();
export class CPairStrStr 
{
	first;
	second;
    constructor(t, r) { this.first = t, this.second = r; }
}
export class CCanvas extends CObject implements IAutoUpdate,IAutoRender,IFile
{
	protected mRemoveList = new Array<string>();
	protected mKeyChangeList = new Array();
	protected mGGI : CGlobalGeometryInfo= new CGlobalGeometryInfo();

	mWebSocket : CWebSocket=null;
	public mPacArr=new CArray<CStream>();
	protected mBrush : CBrush;
	private mSubMap = new Map<string,CSubject>();
	protected mAttachCanvas = new Array<CBlackBoardRef<CCanvas>>();
	
	protected mFrame : CFrame= null;
	//public m_subscribe=new Map<string,CArray<CComMsg>>();
	private mBroMsg=new Array<CRouteMsg>();
	private mBroLen=0;
	//protected m_navi : CNaviMgr=null;
	private mRPMgr : CRPMgr=null;
	//public m_cpMap=new Map<string,CCanvasPaintVec>();
	
	


	private mResMap = new Map<string, any>();
	//public m_bar : CHtmlBarCanvas = new CHtmlBarCanvas(this);
	private mCameraKey="2D";


	public mPause = false;
	public mPushObj=new CArray<CSubject>();
	public mSave=true;
	
	//public m_msgDummy : CArray<CComMsg>=null;



	//public m_matchShadow =new Set<string>();
	//public m_cas=1;
	constructor(_fw : CFrame,_brash : CBrush)
	{
		super();
		if(_fw==null)	return;
		this.mFrame=_fw;
		this.mBrush=_brash;
		if(_fw.PF().mIAuto)	_fw.PushIAuto(this);
		gCanvas.push(this);
		
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mBrush" || _member=="mRemoveList" || _member=="mFrame" || _member=="mPushObj" ||
			_member=="mBroMsg" || _member=="mBroLen" || _member=="mWebSocket" ||_member=="mPacArr" ||
			_member=="mKeyChangeList" || _member=="mGGI")
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
	Icon(){		return "bi bi-aspect-ratio";	}
	static GetCanvasList()
	{
		return gCanvas;
	}
	GetGGI()
	{
		return this.mGGI;
	}
	
	SetRPMgr(_rpMgr : CRPMgr) 
	{
		if(this.mRPMgr!=null)
		{
			for(let i=0;i<this.mRPMgr.mRPArr.length;++i)
			{
				this.mBrush.RemoveAutoRP(this.mRPMgr.Key()+"_"+i);
			}
			this.mBrush.mAutoRPUpdate=CUpdate.eType.Not;
			
			for(let i=0;i<this.mRPMgr.mSufArr.length;++i)
			{
				const obj = this.Find(this.mRPMgr.mSufArr[i].Key());
				if(obj) obj.Destroy();
				this.Detach(this.mRPMgr.mSufArr[i].Key());
			}
			this.mBrush.ClearRen();
		}
		for(let [key, obj] of this.mSubMap)
		{
			let ptVec=obj.FindComps(CPaint, true) as Array<CPaint>;
			for(let pt of ptVec)
			{
				
				pt.ClearCRPAuto();
			}
			
		}

		if(_rpMgr != null) {
			for(let i=0;i<_rpMgr.mRPArr.length;++i)
			{
				this.mBrush.SetAutoRP(_rpMgr.Key()+"_"+i,_rpMgr.mRPArr[i]);
			}
			for(let i=0;i<_rpMgr.mSufArr.length;++i)
			{
				let c=_rpMgr.mSufArr[i].Export(true, false) as CSubject;
				this.Push(c);
			}
			
			_rpMgr.SetCanvas(this);
		}

		this.mRPMgr = _rpMgr;
	}
	ClearBatch() {
		this.mBrush.ClearRen();
	}
	GetRPMgr() {
		return this.mRPMgr;
	}
	PushPac(_pac : CStream)
	{
		if(this.mWebSocket!=null)
		{
			if(this.mWebSocket.IsConnect())
			{
				//연결되면 이전 쌓아둔 폐킷 보냄
				if(this.mPacArr.Size()>0)
				{
					for(let i=0;i<this.mPacArr.Size();++i)
					{
						this.mWebSocket.Send(this.mPacArr.Find(i).Data());
					}
					this.mPacArr.Clear();
				}
				
				this.mWebSocket.Send(_pac.Data());
				return;
			}
			
		}
		
		this.mPacArr.Push(_pac);
	}
	SetWebSocket(_sc : CWebSocket)
	{
		this.mWebSocket=_sc;
		if(this.mWebSocket instanceof CRoomClient)
		{
			this.mWebSocket.On("Patch",(stream : CStream)=>{
				//CConsol.Log(stream.GetString());
				this.Patch(stream);
			});
			this.PatchTrackDefault();
		}
		
	}
	GetPac(_swap=null)
	{
		return this.mPacArr;
	}
	RenderOrder()	{	return new CArray();}
	
	// GetListener(_member : Array<string>)
	// {
	// 	if(_member.length==0)	return this;
	// 	var t=this;

	// 	for(var i=0;i<_member.length;++i)
	// 	{
	// 		if(_member[i].indexOf("(")!=-1)
	// 		{
	// 			var fun=CString.FunctionAnalyze(_member[i]);
	// 			if(t[fun.function]!=null)
	// 			{
	// 				t=FunctionFinder.Find(fun.function,fun.parameter,t);
	// 				if(t instanceof Array && t.length==1)	t=t[0];
	// 			}
					
	// 		}
	// 		else
	// 			t=t[_member[i]];
	// 		if(t==null)	break;
	// 	}
		
	// 	return t;
	// }
	// SetListener(_member : Array<string>,_value)
	// {
	// 	if(_member.length==0)	return 0;

	// 	var t=this;

	// 	for(var i=0;i<_member.length-1;++i)
	// 	{
	// 		if(_member[i].indexOf("(")!=-1)
	// 		{
	// 			var fun=CString.FunctionAnalyze(_member[i]);
	// 			if(t[fun.function]!=null)
	// 			{
	// 				t=FunctionFinder.Find(fun.function,fun.parameter,t);
	// 				if(t instanceof Array && t.length==1)	t=t[0];
	// 			}
					
	// 				//t=t[fun.function](fun.parameter[i]);
	// 		}
	// 		else
	// 			t=t[_member[i]];
	// 		if(t==null)	break;
	// 	}

		
	
	// 	if(t!=null)
	// 		t[_member[_member.length-1]]=_value;
	// }
	// Message(_function : string,_para : Array<any>)
	// {
	// 	var cm=new CComMsg(_function);
	// 	cm.m_msgData=_para;
		
	// 	if(this.m_fw==null)
	// 		cm.Call(this);
	// 	else
	// 		this.PushBroMsg(cm);
	// }
	// Call(_function : string,_para : Array<any>)
	// {	
	// 	FunctionFinder.Find(_function,_para,this);
	// 	return this;
	// }
	


	
	EditHTMLInit(_div: HTMLDivElement): void {
		super.EditHTMLInit(_div);
		var div=_div;
		if(window["CH5HelperTool"]!=null)
		{
			var button=document.createElement("button");
			button.innerText="CreateCH5";
			button.onclick=()=>{
				window["CH5HelperTool"](this, this.mFrame);
			};
			
			_div.append(button);
		}

		
		
		var button=document.createElement("button");
		button.innerText="RenderQueTool";
		button.onclick=()=>{
			RenderQueTool(this.mBrush);
		};
		
		_div.append(button);
		

		var input=document.createElement("input");
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
			CUtilObj.NullEdit(_pointer,_body,_input,new CRPMgr());
		else if(_pointer.member=="mAttachCanvas")
		{
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[new CBlackBoardRef<CCanvas>]);
		}
		else if(_pointer.refArr[_pointer.refArr.length-1]==this.mSubMap)
		{
			var subList=new Array();
			for(let subName of CClass.ExtendsList(CSubject,true)) {
				subList.push({
					"<>":"option", 
					"text":subName,
					"value":subName
				});
			}
			let ukey=CUniqueID.GetHash();
			var pushDiv={"<>":"div","class":"row","html":[
				{"<>":"div","class":"col-8","html":[
					//{"<>":"select","class":"form-select","id":ukey+"subPush","html":subList}
					{"<>":"input","type":"text","class":"form-control","id":ukey+"subPush","placeholder":"CSubject",
						"list":this.ObjHash()+"CSubjcet_list","onkeydown":(e)=>{
							if (e.key === "Enter") 
							{
								e.preventDefault();
								let sel=e.target.value;
								let newObj  : CSubject=CClass.New(sel);
								this.Push(newObj);
								this.EditRefresh();
								e.target.value="";
							}
						}
					},
					{"<>":"datalist","id":this.ObjHash()+"CSubjcet_list","html":subList}
				]},
				{"<>":"div","class":"col-4","html":[
					{"<>":"button","type":"button","class":"btn btn-primary","text":"Add",
						"onclick":()=>{
							let sel=CUtil.IDValue(ukey+"subPush");
							let newObj  : CSubject=CClass.New(sel);
							this.Push(newObj);
							this.EditRefresh();
							//CUtil.ID("m_obj_title").click();//??????????????????
						}
					}
				]},
			]};
			
			_input.prepend(CDomFactory.DataToDom(pushDiv));
		}
		if(_pointer.refArr[_pointer.refArr.length-1]==this.mResMap)
		{
			let ukey=CUniqueID.GetHash();
			var watchList=new Array();
			for(let wName of CClass.ExtendsList(CObject,true)) {
				watchList.push({
					"<>":"option", 
					//"text":subName.constructor.name,
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
							let sel=CUtil.IDValue(ukey+"resClass");
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
			_input.prepend(CDomFactory.DataToDom(res));
		}
	}

	
	override EditChange(_pointer : CPointer,_childe : boolean)
	{
		super.EditChange(_pointer,_childe);
		if(_childe==false)return;

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
		else if(_pointer.member=="mRPMgr")
		{
			this.mRPMgr.SetCanvas(this);
		}
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
		for (var eachKey of this.mSubMap)
		{
			var each0=eachKey[1];
			each0.SetFrame(this.mFrame);
		}
		const rpMgr = this.mRPMgr;
		this.mRPMgr = null;
		this.mBrush.AutoRP().clear();
		this.ClearBatch();
		this.SetRPMgr(rpMgr);
		
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
	override ToJSON(): { class: string } 
	{		
		//rpMgr에서 넣어준 오브젝트 / RP 제거
		let rpMgr = this.mRPMgr;
		this.SetRPMgr(null);
		this.mRPMgr = rpMgr;
		const json = super.ToJSON();
	
		//rpMgr 다시 세팅
		this.mRPMgr = null;
		this.SetRPMgr(rpMgr);
		
		return json;
	}
	Update(_delay)
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
		else
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

	Find<T  extends CSubject>(_key : string,_childe=false) : T
	{
		let data=this.mSubMap.get(_key) as T;
		if(data==null || data.IsDestroy())
		{
			if(_childe==true)
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
			for(let i=0;i<this.mPushObj.Size();++i)
			{
				if(this.mPushObj.Find(i).mKey==_key)
					return this.mPushObj.Find(i)  as T;
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
			if(_obj==subject)
				return this;
			const parent = this.FindParentIn(subject,_obj);
			if (parent) return parent;
		}
		return null;
	}
	private FindParentIn(_parent: CSubject,_target: CSubject): CSubject | null {
		for (const child of _parent.mChilde) {
			if (child === _target) {
				return _parent;
			}
			let r=this.FindParentIn(child, _target);
			if(r!=null)	return r;
			
		}
		return null;
	}
	New(_obj : CSubject)
	{
		this.Push(_obj);
		return _obj;
	}

	Push<T extends CSubject>(_obj : T)
	{
		let key=(_obj as CSubject).Key();
		let obj=this.Find(key) as CSubject;
		if (obj != null)
		{
			if (obj.GetRemove())
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
		//this.m_obj.set(obj.Key(),obj);
		

		obj.ClearKeyChange();
		if(obj.GetFrame()==null)
			obj.SetFrame(this.mFrame);
		
		this.mPushObj.Push(obj);

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
	
	CCamCompAck(_light : CCamComp)
	{
		_light.CCamCompReq(this.mBrush);
	}
	Patch(_stream : CStream,_sukPass=true)
	{
		let sendSUK=_stream.GetString();
		let readSUK=null;
		if(this.mWebSocket instanceof CRoomClient)
			readSUK=(this.mWebSocket as CRoomClient).GetSuk();
		if(_sukPass && sendSUK==readSUK)	return;

		while(_stream.IsEnd()==false)
		{
			let pathArr=_stream.GetString().split(".");
			
					
			

			let target=this.Find(pathArr[0]);
			if(target!=null)
			{
				target=CString.FullPathArrToLastTarget(target,pathArr);
				target.PatchStreamRead(_stream,pathArr[pathArr.length-1]);
			}
			else
			{
				CConsol.Log("잘못된 파싱");
				break;
			}

			
			
		}
	}
	PatchTrackDefault()
	{
		this.PatchTrack("mSubMap");
	}

}


import CCanvas_imple from "../canvas_imple/CCanvas.js";
CCanvas_imple();