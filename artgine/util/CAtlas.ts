import {CVec4} from "../geometry/CVec4.js"
import {CTexture} from "../render/CTexture.js"
import {CH5Canvas} from "../render/CH5Canvas.js"
import {CBase64File} from "./CBase64File.js"
import {CMath} from "../geometry/CMath.js"
import {CString} from "../basic/CString.js"
import {CParserTGA,  CTARGA } from "./parser/CParserTGA.js"
import {CUniqueID} from "../basic/CUniqueID.js"
import {CJSON} from "../basic/CJSON.js"
import {CModal} from "../basic/CModal.js"
import {CVec2} from "../geometry/CVec2.js"
import {CDomFactory} from "../basic/CDOMFactory.js"
import {CObject, CPointer} from "../basic/CObject.js"
import { CClass } from "../basic/CClass.js"
import { CUtilObj } from "../basic/CUtilObj.js"
import { CUtil } from "../basic/CUtil.js"
import { CUtilRender } from "../render/CUtilRender.js"


let g_atlJBox : CModal;

// let g_atlJBox=new CJBox(CJBox.Df.Modal,{
// 	width: 640,
// 	height: 480,
// 	content:"<div id='atl_div'></div>",
// 	createOnInit:true,
// 	theme: 'TooltipGray',
// 	closeOnClick: 'body'
// });

export class CAtlas extends CObject
{
	public mTexCodi=new Array<CVec4>();
	mWidth=0;
	mHeight=0;
	mPadding=1;
	public mBase64=new CBase64File();
	mTex : CTexture=null;
	mTexFilter=CTexture.eFilter.Neaest;
	mTexMipMap=CTexture.eMipmap.GL;
	mCreate=false;
	mBase64Map=new Map<number,string>();
	constructor()
	{
		super();
		this.SetKey(CUniqueID.GetHash() + ".atl");
	}
	IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mTex" && _type!=CObject.eShould.Editer)	return false;
		if(_member=="mCreate" || _member=="mBase64Map")	return false;

		return super.IsShould(_member,_type);
	}
	async CreateTex() 
	{
		if(this.mCreate) {
			while(this.mTex == null) {
				await setTimeout(() => {}, 100);
			}
			return;
		}

		if(this.mBase64.mData==null)	return;
		this.mCreate=true;
		var par=new CParserTGA();
		par.SetBuffer(new Uint8Array(this.mBase64.mData),this.mBase64.mData.byteLength);
		await par.Load("test");
		this.mTex=par.GetResult() as CTexture;
		this.mTex.SetFilter(this.mTexFilter);
		this.mTex.SetMipMap(this.mTexMipMap);
		this.mCreate=false;
	}
	GetTex()
	{
		return this.mTex;
	}
	async GetImgURL(_index : number = -1)
	{
		await this.CreateTex();
		let tex = this.GetTex();
		if(!tex) return "";
		let url=this.mBase64Map.get(_index);
		if(url!=null)	return url;

		let codi = this.mTexCodi[_index];
		if(_index == -1) {
			CH5Canvas.Init(tex.GetWidth(),tex.GetHeight());
			CH5Canvas.PushImgData(tex.GetBuf()[0],0,0);
		}
		else if(codi == null) {
			CH5Canvas.Init(1,1);
			CH5Canvas.Draw([
				CH5Canvas.Cmd("fillStyle", "black"),
				...CH5Canvas.FillRect(0,0,1,1)
			]);
		}
		else {
			let w = codi.z - codi.x;
			let h = codi.w - codi.y;
			CH5Canvas.Init(w, h);
			CH5Canvas.PushSlicedImgData(tex.GetBuf()[0],tex.GetWidth(), codi.x, codi.y, w, h);
		}
		url=CH5Canvas.GetDataURL();
		this.mBase64Map.set(_index,url);
		return url;
	}
	async GetImgTexture(_index : number = -1)
	{
		await this.CreateTex();
		let tex = this.GetTex();
		if(!tex) return null;
		let codi = this.mTexCodi[_index];
		if(_index == -1) {
			CH5Canvas.Init(tex.GetWidth(),tex.GetHeight());
			CH5Canvas.PushImgData(tex.GetBuf()[0],0,0);
		}
		else if(codi == null) {
			CH5Canvas.Init(1,1);
			CH5Canvas.Draw([
				CH5Canvas.Cmd("fillStyle", "black"),
				...CH5Canvas.FillRect(0,0,1,1)
			]);
		}
		else {
			let w = codi.z - codi.x;
			let h = codi.w - codi.y;
			CH5Canvas.Init(w, h);
			CH5Canvas.PushSlicedImgData(tex.GetBuf()[0],tex.GetWidth(), codi.x, codi.y, w, h);
		}
		return CH5Canvas.GetNewTex();
	}
	EditHTMLInit(_div: HTMLDivElement): void {
		super.EditHTMLInit(_div);
		// let inputElement = document.createElement('input');
        // inputElement.type = 'file';
		// inputElement.accept="image/png, image/jpeg, image/tga";
		// inputElement.multiple=true;
		// inputElement.onchange=(e : any)=>{
		// 	if(e.target.files && e.target.files.length > 0) 
		// 	{
		// 		let done = [];
		// 		for(var i = 0; i < e.target.files.length; i++) {
		// 			let file = e.target.files[0];
		// 			done.push(false);
		// 			var reader = new FileReader();
		// 			reader.onload = (evt) =>{
		// 				if (evt.target.readyState == FileReader.DONE) 
		// 				{
		// 					this.Push(file.name,evt.target.result as ArrayBuffer);
		// 				}
		// 				done[i] = true;
		// 				if(done.every((v)=>v==true)) {
		// 					this.EditRefresh();
		// 				}
		// 			};
		// 			reader.readAsArrayBuffer(file);
		// 		}
		// 	}
		// };
		// _div.append(inputElement);
		
		// if(window["AniTool"]!=null)
		// {
		// 	_div.append(CDomFactory.DataToDom({"<>":"button","text":"AniTool","onclick":()=>{
		// 		let ani=CClass.New("CAnimation");
		// 		window["AniTool"](ani);
		// 		window["AniToolAtlasEvent"](this,async()=>{
		// 			await this.CreateTex();
		// 			this.GetTex();
		// 			this.EditRefresh();
		// 		});
		// 	}}));
		// }
		_div.append(CDomFactory.DataToDom({"<>":"button","text":"Modify","onclick":()=>{
			this.ModifyModal();
		}}));
		_div.append(CDomFactory.DataToDom({"<>":"button","text":"Reload Texture","onclick":()=>{
			this.mTex = null;
			this.CreateTex();
		}}));
	}
	WTForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {
		if(_pointer.member == "mTexFilter") {
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CTexture.eFilter)) {
				textArr.push(text);
				valArr.push(val);
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
		if(_pointer.member == "mTexMipMap") {
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CTexture.eMipmap)) {
				textArr.push(text);
				valArr.push(val);
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
	}
	async ModifyModal(_clickEvent : Function=null, _remove : boolean = false)
	{
		
		//파일 인풋 이벤트
		let AtlasPush = (e) => {
			if(e.target.files && e.target.files.length > 0) {
				for(var file of e.target.files) {
					var reader = new FileReader();
					reader.onload = async (evt) => {
						if (evt.target.readyState == FileReader.DONE) {
							await this.Push("file",evt.target.result as ArrayBuffer);
							this.ModifyModal(_clickEvent, clickToRemove);
						}
					};
					reader.readAsArrayBuffer(file);
				}
			}
		};
		//클릭 시 이벤트
		let mainOnClick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			for(let i=0;i<this.mTexCodi.length;++i) {
				let codi=this.mTexCodi[i];
				if(codi == null) {
					continue;
				}
				if(codi.x<=e.offsetX && codi.z>=e.offsetX && codi.y<=e.offsetY && codi.w>=e.offsetY) {
					if(_clickEvent!=null) {
						_clickEvent(i);
						if(g_atlJBox) g_atlJBox.Close();
						return;
					}
					if(clickToRemove) {
						this.RemoveTexCodi(i);
						this.ModifyModal(_clickEvent, clickToRemove);
						return;
					}
				}
			}
			if(_clickEvent!=null) {
				_clickEvent(-1);
				if(g_atlJBox) g_atlJBox.Close();
			}
		};
		//마우스 무브 이벤트
		let curIndex = -1;
		let mainOnMouseMove = (e) => {
			e.preventDefault();
			e.stopPropagation();
			let index = curIndex;
			let notInside = true;
			for(let i=0;i<this.mTexCodi.length;++i) {
				let codi=this.mTexCodi[i];
				if(codi == null) {
					continue;
				}
				if(codi.x<=e.offsetX && codi.z>=e.offsetX && codi.y<=e.offsetY && codi.w>=e.offsetY) {
					notInside = false;
					index = i;
					break;
				}
			}
			
			if(notInside == false && index != curIndex) {
				drawImgOnCanvas(index);
				curIndex = index;
			}
			else if(notInside == true && curIndex != -1) {
				drawImgOnCanvas();
				curIndex = -1;
			}
		};

		//카드
		let cardMain={"<>":"div", "html":[
			{"<>":"div","id":"atlCan_card","style":"width:100%;"}
		]};
		let drawImgOnCard = (_index = -1) => {
			let AtlCan_Div = CUtil.ID("atlCan_card");
			AtlCan_Div.innerHTML = "";

			let height100Container = document.createElement("div");
			AtlCan_Div.appendChild(height100Container);
			let height200Container = document.createElement("div");
			AtlCan_Div.appendChild(height200Container);

			let create100Div = () => {
				let div = document.createElement("div");
				div.style.display = "flex";
				height100Container.append(div);
				return div;
			};
			let create200Div = () => {
				let div = document.createElement("div");
				div.style.display = "flex";
				height200Container.append(div);
				return div;
			};

			let maxWidth = 6;

			//height 100인 경우 들어갈 div
			let height100_childNum = 0;
			let height100_oneRemainDiv : HTMLDivElement = null;
			let height100_Div = create100Div();

			//height 200인 경우 들어갈 div
			let height200_childNum = 0;
			let height200_Div = create200Div();

			//always용 타일 추가
			let imgDiv = document.createElement("div");
			imgDiv.style.overflow = "hidden";
			imgDiv.style.backgroundSize = "contain";
			imgDiv.style.backgroundPosition = "center";
			imgDiv.style.backgroundRepeat = "no-repeat";
			imgDiv.style.imageRendering = "pixelated";
			imgDiv.style.backgroundColor = "white";
			imgDiv.style.backgroundBlendMode = "multiply";
			imgDiv.style.border = "1px solid red";

			imgDiv.onclick = (e) => {
				e.preventDefault();
				e.stopPropagation();
				if(_clickEvent!=null) {
					_clickEvent(-1);
					if(g_atlJBox) g_atlJBox.Close();
				}
			};
			imgDiv.onmouseenter = (e) => {
				imgDiv.style.backgroundColor = "#8888FF";
			};
			imgDiv.onmouseleave = (e) => {
				imgDiv.style.backgroundColor = "white";
			};

			imgDiv.style.width = "calc(100% / 6)";
			imgDiv.style.height = "100px";
			if(height100_oneRemainDiv) {
				height100_oneRemainDiv.appendChild(imgDiv);
				height100_oneRemainDiv = null;
			}
			else {
				height100_childNum++;
				height100_Div.appendChild(imgDiv);
				if(height100_childNum >= maxWidth) {
					height100_childNum = 0;
					height100_Div = create100Div();
				}
			}

			for(let i = 0; i < this.mTexCodi.length; i++) {
				let codi = this.mTexCodi[i];
				if(codi == null) {
					continue;
				}
				this.GetImgURL(i).then(slicedBase64Img => {
					let imgDiv = document.createElement("div");
					imgDiv.style.overflow = "hidden";
					imgDiv.style.backgroundSize = "contain";
					imgDiv.style.backgroundPosition = "center";
					imgDiv.style.backgroundRepeat = "no-repeat";
					imgDiv.style.imageRendering = "pixelated";
					imgDiv.style.backgroundImage = "url(" + slicedBase64Img + ")";
					imgDiv.style.backgroundBlendMode = "multiply";
					imgDiv.style.border = "1px solid red";

					let width = codi.z - codi.x;
					let height = codi.w - codi.y;
					let aspect = width / height;

					imgDiv.onclick = (e) => {
						e.preventDefault();
						e.stopPropagation();
						if(_clickEvent!=null) {
							_clickEvent(i);
							if(g_atlJBox) g_atlJBox.Close();
						}
						if(clickToRemove) {
							this.RemoveTexCodi(i);
							this.ModifyModal(_clickEvent, clickToRemove);
						}
					};
					imgDiv.onmouseenter = (e) => {
						imgDiv.style.backgroundColor = "#8888FF";
					};
					imgDiv.onmouseleave = (e) => {
						imgDiv.style.backgroundColor = "";
					};

					//width가 height보다 큼
					if(aspect > 1) {
						imgDiv.style.width = "calc(100% / 6)";
						imgDiv.style.height = "100px";

						if(height100_childNum > maxWidth - 2) {
							height100_oneRemainDiv = height100_Div;
							height100_Div = create100Div();
							height100_childNum = 0;
						}

						height100_childNum += 2;
						height100_Div.appendChild(imgDiv);
						if(height100_childNum >= maxWidth) {
							height100_childNum = 0;
							height100_Div = create100Div();
						}
					}

					//height가 width보다 큼
					else if(aspect < 1) {
						imgDiv.style.width = "calc(100% / 6)";
						imgDiv.style.height = "200px";

						height200_childNum++;
						height200_Div.appendChild(imgDiv);
						if(height200_childNum >= maxWidth) {
							height200_childNum = 0;
							height200_Div = create200Div();
						}
					}

					//width height가 같음
					else {
						imgDiv.style.width = "calc(100% / 6)";
						imgDiv.style.height = "100px";
						if(height100_oneRemainDiv) {
							height100_oneRemainDiv.appendChild(imgDiv);
							height100_oneRemainDiv = null;
						}
						else {
							height100_childNum++;
							height100_Div.appendChild(imgDiv);
							if(height100_childNum >= maxWidth) {
								height100_childNum = 0;
								height100_Div = create100Div();
							}
						}
					}
				});
			}
		};
		
		//캔버스
		let canvMain={"<>":"div","html":[
			{"<>":"canvas","id":"atlCan_can","width":this.mWidth,"height":this.mHeight,"style":"border: 1px solid red;","onclick":mainOnClick,"onmousemove":mainOnMouseMove},
		]};
		let drawImgOnCanvas = async (_index = -1) => {
			let fontSize = 16;
			let canvas = CUtil.ID("atlCan_can")as HTMLCanvasElement;
			let ctx = canvas.getContext("2d");
			let adjustFontSize = (_text : string, _maxWidth : number, _maxHeight : number) => {
				let textWidth, textHeight;
				do {
					ctx.font = "bold " + fontSize + "px arial";
					textWidth = ctx.measureText(_text).width;
					textHeight = fontSize;
					if(textWidth > _maxWidth || textHeight > _maxHeight) {
						fontSize--;
					}
				} while(textWidth > _maxWidth || textHeight > _maxHeight)
				return fontSize;
			};
			let img = new Image();
			img.onload = ()=> {
				ctx.clearRect(0,0,canvas.width,canvas.height);
				ctx.drawImage(img, 0, 0);
				for(let i=0;i<this.mTexCodi.length;++i)
				{
					let codi=this.mTexCodi[i];
					if(codi == null) {
						continue;
					}
					let text = i + "";
					fontSize = 20;
					adjustFontSize(text, codi.z-codi.x, codi.w-codi.y);
					ctx.fillStyle="#FF0000";
					ctx.font="bold " + fontSize + "px arial";
					let width = ctx.measureText(text).width;
					ctx.fillText(text, codi.x + (codi.z - codi.x) * 0.5 - width * 0.5, codi.y + (codi.w - codi.y) * 0.5 + fontSize * 0.5);
		
					//아웃라인 추가
					if(i == _index) {
						ctx.fillStyle="#0000FF44";
						ctx.fillRect(codi.x, codi.y, codi.z-codi.x, codi.w-codi.y);
					}
				}
			};
			let base64Img = await this.GetImgURL();
			img.src = base64Img;
		};

		//탭
		let clickToRemove = _remove;
		let prevCanvTab = CUtil.ID("vCanvStyle_tab");
		let prevActiveTabIndex = (prevCanvTab != null && prevCanvTab.classList.contains("active"))? 1 : 0;
		let prevDiv = CUtil.ID("CAtlas_Div");
		let st = prevDiv == null? 0 : prevDiv.scrollTop;
		let tabs : any = {"<>":"div", "html":[
			{"<>":"div", "style":"display:flex;", "html":[
				{"<>":"div", "id":"CAtlas_Div", "style":"width:100%;overflow:auto;", "html":[
					{"<>":"ul", "class":"nav nav-tabs", "html":[
						{"<>":"li", "class":"nav-item", "html":[
							{"<>":"a", "class":"nav-link" + (prevActiveTabIndex == 0? " active" : ""), "data-bs-toggle":"tab", "href":"#vCardStyle_tab", "text":"Card", "onclick":()=>{drawImgOnCard();}},
						]},
						{"<>":"li", "class":"nav-item", "html":[
							{"<>":"a", "class":"nav-link" + (prevActiveTabIndex == 1? " active" : ""), "data-bs-toggle":"tab", "href":"#vCanvStyle_tab", "text":"Canv", "onclick":()=>{drawImgOnCanvas();}}
						]}
					]},
					{"<>":"div", "class":"tab-content", "html":[
						{"<>":"div", "class":"tab-pane fade" + (prevActiveTabIndex == 0? " show active" : ""), "id":"vCardStyle_tab", "html":[cardMain]},
						{"<>":"div", "class":"tab-pane fade" + (prevActiveTabIndex == 1? " show active" : ""), "id":"vCanvStyle_tab", "html":[canvMain]}
					]}
				]},
			]},
			{"<>":"input","type":"file","multiple":"multiple","onchange":AtlasPush},
			{"<>":"button","type":"button","class":"btn btn-primary float-right","text":"AniEditer","onclick":()=>{
					let ani=CClass.New("CAnimation");
					window["AniTool"](ani,null);
					window["AniToolAtlasEvent"](this, ()=>{
						this.ModifyModal(_clickEvent, clickToRemove);
					});
				}
			},
		]};
		if(_clickEvent == null) {
			tabs.html.push(
				{"<>":"button","type":"button","class":"btn float-right " + (_remove?"btn-danger":"btn-primary"),"text":"Delete",
					"onclick":(e)=>{
						if(e.target.classList.contains("btn-primary")) {
							e.target.classList.remove("btn-primary");
							e.target.classList.add("btn-danger");
							clickToRemove = true;
						}
						else {
							e.target.classList.remove("btn-danger");
							e.target.classList.add("btn-primary");
							clickToRemove = false;
						}
					}
			});
		}
		if(g_atlJBox) g_atlJBox.Close();
		g_atlJBox = new CModal();
		g_atlJBox.SetTitle(CModal.eTitle.TextClose);
		g_atlJBox.SetSize(640, 480);
		g_atlJBox.SetBody("<div id='atl_div'></div>");
		g_atlJBox.SetResize(true);
		// g_atlJBox.SetBodyClose(true);
		g_atlJBox.Open();
		CUtil.ID("atl_div").append(CDomFactory.DataToDom(tabs));
		// g_atlJBox.setContent(CDomFactory.DataToDom(tabs));

		if(prevActiveTabIndex == 0) {
			drawImgOnCard();
		}
		else if(prevActiveTabIndex == 1) {
			drawImgOnCanvas();
		}

		CUtil.ID("CAtlas_Div").scrollTop = st;
	}



	async RemoveTexCodi(_off : number) {
		if(this.mBase64.mData==null) return;

		this.mTexCodi[_off] = null;
		let tex = await this.RebuildRect(this.mWidth, this.mHeight);

		var targa=new CTARGA(tex.GetBuf()[0]);
		this.mWidth=targa.imageWidth=tex.GetWidth();
		this.mHeight=targa.imageHeight=tex.GetHeight();
		this.mBase64.mData=targa.GetResult();
		this.mBase64.mExt="tga";
		this.mBase64.RefreshHash();
		this.mTex=null;
		
		this.EditRefresh();
	}
    GetTexCodi(_off : number,_texCodi : CVec4)
	{
		if(this.mTexCodi[_off] == null) {
			_texCodi.x=0;
			_texCodi.y=0;
			_texCodi.z=1/this.mWidth;
			_texCodi.w=1/this.mHeight;
			return;
		}

		_texCodi.x=this.mTexCodi[_off].x/this.mWidth;
		_texCodi.y=(this.mHeight-this.mTexCodi[_off].y)/this.mHeight;
		_texCodi.z=this.mTexCodi[_off].z/this.mWidth;
		_texCodi.w=(this.mHeight-this.mTexCodi[_off].w)/this.mHeight;

		
	}

	static s_atlasLoadMap : Map<string, CBase64File> = new Map();
	override ImportCJSON(_json: CJSON)  
	{
		let base64 : CBase64File = null;
		//if(_json instanceof CJSON) 
		{
			if(CAtlas.s_atlasLoadMap.has(_json.GetStr("m_key"))) {
				base64 = CAtlas.s_atlasLoadMap.get(_json.GetStr("m_key"));
				_json.Set("m_base64", null);
			}
		}
		// else {
		// 	if(CAtlas.s_atlasLoadMap.has(_json["m_key"])) {
		// 		base64 = CAtlas.s_atlasLoadMap.get(_json["m_key"]);
		// 		_json["m_base64"] = null;
		// 	}
		// }
		let result = super.ImportCJSON(_json);
		if(base64 == null) {
			CAtlas.s_atlasLoadMap.set(result.Key(), this.mBase64);
		}
		else {
			(result as CAtlas).mBase64 = base64;
			this.mBase64 = base64;
		}
		return result;
	}


	private m_rect : AtlasMaxRects;
	Push(_texName : string, _buf : ArrayBuffer = null, _codi = new Array<CVec4>()) {
		return new Promise((resolve, reject)=>{
			if(_buf!=null)
			{
				
				let blob = new Blob([_buf], { type: "image/"+CString.ExtCut(_texName).ext });
				_texName = window.URL.createObjectURL(blob);
			}

			const img = new Image();
			img.crossOrigin = "Anonymous";
			img.addEventListener('load', async (_event)=>
			{
				//rect 없는 경우 생성
				if(this.m_rect == null) {
					this.m_rect = new AtlasMaxRects(this.mWidth==0?128:this.mWidth, this.mHeight==0?128:this.mHeight);
					for(let codi of this.mTexCodi) {
						const w = codi.z - codi.x + 1;
						const h = codi.w - codi.y + 1;
						this.m_rect.Insert(w, h);
					}
					this.mWidth=this.m_rect.mWidth;
					this.mHeight=this.m_rect.mHeight;
				}

				//이미지 버퍼 생성
				const img =_event.currentTarget as HTMLImageElement;
				CH5Canvas.Init(img.width,img.height);
				CH5Canvas.Draw(CH5Canvas.DrawImage(img,0,0,img.width,img.height));
				const imgTex=CH5Canvas.GetNewTex();
				const imgTexBuf=imgTex.GetBuf()[0] as Uint8Array;

				//codi 없는 경우 전체 이미지 사용
				if(_codi.length==0)
					_codi.push(new CVec4(0,0,img.width,img.height));
				
				//아틀라스 텍스쳐 버퍼 생성
				let atlTex : CTexture=null;
				if(this.mBase64.mData!=null) {
					await this.CreateTex();
					atlTex= this.GetTex();
				}
				else {
					atlTex=new CTexture();
					atlTex.SetSize(128,128);
					atlTex.CreateBuf();
				}
				let atlTexBuf=atlTex.GetBuf()[0] as Uint8Array;

				for(let k=0;k<_codi.length;++k)
				{
					const codi=_codi[k];
					const w = codi.z - codi.x;
					const h = codi.w - codi.y;
					if(w==0 || h==0) continue;

					const paddedW = w + this.mPadding * 2;
					const paddedH = h + this.mPadding * 2;

					let insertRect = this.m_rect.Insert(paddedW, paddedH);
					if(insertRect == null) {
						const newW = CUtilRender.CloseToExp(this.mWidth + paddedW);
						const newH = CUtilRender.CloseToExp(this.mHeight + paddedH);
						const higherOne = Math.max(newW, newH);
						
						let newTex = await this.RebuildRect(higherOne, higherOne,atlTex);
						

						atlTex=newTex;
						atlTexBuf=newTex.GetBuf()[0] as Uint8Array;

						insertRect = this.m_rect.Insert(paddedW, paddedH);
					}

					//앞에 삭제된 texCodi공간이 있으면 그곳에 넣어줌
					let texCodiIdx = this.mTexCodi.indexOf(null);
					if(texCodiIdx != -1) {
						this.mTexCodi[texCodiIdx] = 
							new CVec4(insertRect.x+this.mPadding,insertRect.y+this.mPadding,insertRect.x+w+this.mPadding,insertRect.y+h+this.mPadding);
					}
					else {
						this.mTexCodi.push(new CVec4(insertRect.x+this.mPadding,insertRect.y+this.mPadding,insertRect.x+w+this.mPadding,insertRect.y+h+this.mPadding));
					}

					const srcX = codi.x;
					const srcY = codi.y;
					const dstX = insertRect.x + this.mPadding;
					const dstY = insertRect.y + this.mPadding;

					for(let y = 0; y < h; y++) {
						const src = (srcX + (srcY + y) * imgTex.GetWidth()) * 4;
						const dst = (dstX + (dstY + y) * atlTex.GetWidth()) * 4;
						atlTexBuf.set(imgTexBuf.subarray(src, src + 4 * w), dst);
					}
					//상하좌우에 패딩 넣음
					for(let x = 0; x < w; x++) {
						//top
						const from = ((dstX + x) + (dstY) * atlTex.GetWidth()) * 4;
						for(let pc=0;pc<this.mPadding;++pc)
						{
							const to = ((dstX + x) + (dstY - pc-1) * atlTex.GetWidth()) * 4;
							atlTexBuf.set(atlTexBuf.subarray(from, from + 4), to);
						}
						

						//bot
						const fromB = ((dstX + x) + (dstY + h - 1) * atlTex.GetWidth()) * 4;
						for(let pc=0;pc<this.mPadding;++pc)
						{
							const toB = ((dstX + x) + (dstY + h+pc) * atlTex.GetWidth()) * 4;
							atlTexBuf.set(atlTexBuf.subarray(fromB, fromB + 4), toB);
						}
						
					}

					for(let y = -this.mPadding; y < h+this.mPadding; y++) {
						//left
						const from = ((dstX) + (dstY + y) * atlTex.GetWidth()) * 4;
						for(let pc=0;pc<this.mPadding;++pc)
						{
							const to = ((dstX - pc-1) + (dstY + y) * atlTex.GetWidth()) * 4;
							atlTexBuf.set(atlTexBuf.subarray(from, from + 4), to);
						}
						

						//right
						const fromB = ((dstX + w-1) + (dstY + y) * atlTex.GetWidth()) * 4;
						for(let pc=0;pc<this.mPadding;++pc)
						{
							const toB = ((dstX + w+pc) + (dstY + y) * atlTex.GetWidth()) * 4;
							atlTexBuf.set(atlTexBuf.subarray(fromB, fromB + 4), toB);
						}
						
					}
				}

				var targa=new CTARGA(atlTexBuf);
				this.mWidth=targa.imageWidth=atlTex.GetWidth();
				this.mHeight=targa.imageHeight=atlTex.GetHeight();
				this.mBase64.mData=targa.GetResult();
				this.mBase64.mExt="tga";
				this.mBase64.RefreshHash();
				this.mTex=null;

				resolve(true);
			});//load


			img.src=_texName;
		});
	}

	private async RebuildRect(_w : number, _h : number,_beforeTex : CTexture=null) : Promise<CTexture> {
		this.m_rect = new AtlasMaxRects(_w, _h);
		let newTexCodi = [];
		for(let oldTexCodi of this.mTexCodi) {
			if(oldTexCodi == null) {
				newTexCodi.push(null);
				continue;
			}
			const w = oldTexCodi.z - oldTexCodi.x;
			const h = oldTexCodi.w - oldTexCodi.y;
			let rect = this.m_rect.Insert(w + this.mPadding*2, h + this.mPadding*2);
			newTexCodi.push(new CVec4(rect.x + this.mPadding, rect.y + this.mPadding, rect.x + w+this.mPadding, rect.y + h+this.mPadding));
		}

		const newTex = new CTexture();
		newTex.SetSize(_w, _h);
		newTex.CreateBuf();
		const newBuf = newTex.GetBuf()[0] as Uint8Array;

		let oldTex : CTexture=null;
		if(_beforeTex!=null) 
		{
			let oldWidth = _beforeTex.GetWidth();
			let oldHeight = _beforeTex.GetHeight();
			let oldTexBuf = _beforeTex.GetBuf()[0] as Uint8Array;

			for (let y = 0; y < oldHeight; y++) {
				const srcStart = y * oldWidth * 4;
				const dstStart = y * _w * 4;
				const rowLength = oldWidth * 4;

				newBuf.set(oldTexBuf.subarray(srcStart, srcStart + rowLength), dstStart);
			}
			
			
		}
		else if(this.mBase64.mData!=null) 
		{
			await this.CreateTex();
			oldTex= this.GetTex();
			let oldTexBuf=oldTex.GetBuf()[0] as Uint8Array;

			for(let codiIdx = 0; codiIdx < this.mTexCodi.length; codiIdx++) {
				let oldCodi = this.mTexCodi[codiIdx];
				let newCodi = newTexCodi[codiIdx];
				if(oldCodi == null) continue;
				if(newCodi == null) continue;
				const oldCodiW = oldCodi.z - oldCodi.x;
				const oldCodiH = oldCodi.w - oldCodi.y;
	
				for(let y = -this.mPadding; y < oldCodiH+this.mPadding; y++) {
					let src = ((oldCodi.y + y) * this.mWidth + (oldCodi.x - this.mPadding)) * 4;
					let dst = ((newCodi.y + y) * _w + (newCodi.x - this.mPadding)) * 4;
					newBuf.set(oldTexBuf.subarray(src, src + (oldCodiW + this.mPadding*2) * 4), dst);
				}
			}
		}
		

		this.mTexCodi = newTexCodi;
		this.mWidth=_w;
		this.mHeight=_h;
		return newTex;
	}
}



// class AtlasNode {
// 	x: number;
// 	y: number;
// 	width: number;
// 	height: number;
// 	used: boolean = false;
// 	right: AtlasNode = null;
// 	down: AtlasNode = null;

// 	constructor(x: number, y: number, width: number, height: number) {
// 		this.x = x;
// 		this.y = y;
// 		this.width = width;
// 		this.height = height;
// 	}

// 	insert(w: number, h: number): AtlasNode | null {
// 		if (this.used) {
// 			return this.right?.insert(w, h) || this.down?.insert(w, h) || null;
// 		}

// 		if (w > this.width || h > this.height) return null;
// 		if (w === this.width && h === this.height) {
// 			this.used = true;
// 			return this;
// 		}

// 		this.used = true;
// 		const dw = this.width - w;
// 		const dh = this.height - h;
// 		if (dw > dh) {
// 			this.right = new AtlasNode(this.x + w, this.y, this.width - w, h);
// 			this.down = new AtlasNode(this.x, this.y + h, this.width, this.height - h);
// 		} else {
// 			this.right = new AtlasNode(this.x + w, this.y, this.width - w, this.height);
// 			this.down = new AtlasNode(this.x, this.y + h, w, this.height - h);
// 		}
// 		return this;
// 	}
// }

class AtlasMaxRects {
	mWidth: number;
	mHeight: number;
	freeRectangles: Array<CVec4>;
  
	constructor(_width: number, _height: number) {
		this.mWidth = _width;
		this.mHeight = _height;
	
		// 초기에는 전체 공간이 하나의 사각형으로 빈 공간 리스트를 구성
		this.freeRectangles = [new CVec4(0,0,_width,_height)];
	}
  
	/**
		* 이미지 삽입
		* @param w 삽입할 이미지의 너비
		* @param h 삽입할 이미지의 높이
		* @returns 배치된 위치 또는 null(삽입 실패)
	*/
	Insert(w: number, h: number): CVec2 | null {
		// 1. 적합한 빈 공간을 찾기
		const bestNode = this.FindBestNode(w, h);
		if (!bestNode) return null;
	
		// 2. 빈 공간 리스트 업데이트
		this.SplitFreeRectangles(new CVec4(bestNode.x, bestNode.y, w, h));
	
		// 3. 빈 공간 리스트에서 겹치는 항목 제거
		this.PruneFreeRectangles();
	
		return new CVec2(bestNode.x, bestNode.y);
	}
  
	/**
		* 적합한 빈 공간을 찾는 함수
		* @param w 삽입할 이미지의 너비
		* @param h 삽입할 이미지의 높이
	*/
	FindBestNode(w: number, h: number): CVec4 | null {
		let bestNode : CVec4 = null;
		let bestScore = Infinity;
	
		for (const rect of this.freeRectangles) {
			if (rect.z >= w && rect.w >= h) {
				const score = this.ScoreRect(rect, w, h);
				if (score < bestScore) {
					bestScore = score;
					bestNode = new CVec4(rect.x, rect.y, rect.z, rect.w);
				}
			}
		}
	
		return bestNode;
	}
  
	/**
		* 공간 저장 효율성을 계산하는 점수 함수
		* 기본적으로 공간 낭비를 최소화하는 방식
	*/
	ScoreRect(rect: CVec4, w: number, h: number): number {
		return rect.z * rect.w - w * h; // 남은 공간이 작을수록 더 나은 배치 선택
	}
  
	/**
	 * 빈 공간 리스트 업데이트 – 새로운 사각형을 추가하면 기존 빈 공간을 분할
	 * @param usedRect 사용된 사각형 (삽입 후의 위치와 크기)
	 */
	SplitFreeRectangles(usedRect: CVec4): void {
		const newFreeRectangles : Array<CVec4> = [];
	
		for (const rect of this.freeRectangles) {
			// 충돌하지 않으면 그대로 유지
			if (
				usedRect.x >= rect.x + rect.z ||
				usedRect.x + usedRect.z <= rect.x ||
				usedRect.y >= rect.y + rect.w ||
				usedRect.y + usedRect.w <= rect.y
			) {
				newFreeRectangles.push(rect);
				continue;
			}
	
			// 충돌하는 경우에는
			// 나누어진 공간을 계산
			if (usedRect.x > rect.x) {
				newFreeRectangles.push(new CVec4(
					rect.x,
					rect.y,
					usedRect.x - rect.x,
					rect.w
				));
			}
			if (usedRect.x + usedRect.z < rect.x + rect.z) {
				newFreeRectangles.push(new CVec4(
					usedRect.x + usedRect.z,
					rect.y,
					rect.x + rect.z - (usedRect.x + usedRect.z),
					rect.w
				));
			}
			if (usedRect.y > rect.y) {
				newFreeRectangles.push(new CVec4(
					rect.x,
					rect.y,
					rect.z,
					usedRect.y - rect.y
				));
			}
			if (usedRect.y + usedRect.w < rect.y + rect.w) {
				newFreeRectangles.push(new CVec4(
					rect.x,
					usedRect.y + usedRect.w,
					rect.z,
					rect.y + rect.w - (usedRect.y + usedRect.w)
				));
			}
		}
	
		this.freeRectangles = newFreeRectangles;
	}
  
	/**
	 * 공간 낭비 제거 – 빈 공간 리스트를 정리하여 중복 제거 및 최적화
	 */
	PruneFreeRectangles(): void {
		const pruned = [];
	
		for (let i = 0; i < this.freeRectangles.length; i++) {
			let keep = true;
			for (let j = 0; j < this.freeRectangles.length; j++) {
				if (i !== j && this.IsContainedIn(this.freeRectangles[i], this.freeRectangles[j])) {
					keep = false;
					break;
				}
			}
			if (keep) {
				pruned.push(this.freeRectangles[i]);
			}
		}
	
		this.freeRectangles = pruned;
	}
  
	/**
	 * 사각형 A가 사각형 B 안에 포함되는지 확인
	 */
	IsContainedIn(rectA: CVec4, rectB: CVec4): boolean {
		return (
			rectA.x >= rectB.x &&
			rectA.y >= rectB.y &&
			rectA.x + rectA.z <= rectB.x + rectB.z &&
			rectA.y + rectA.w <= rectB.y + rectB.w
		);
	}
}