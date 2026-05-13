

import {CTexture} from "../render/CTexture.js"
import {CRenderer} from "../render/CRenderer.js"
import {CJSON} from "../basic/CJSON.js"
import {CH5Canvas} from "../render/CH5Canvas.js"
import {CString} from "../basic/CString.js"
import {CHash} from "../basic/CHash.js"
import {CPath} from "../basic/CPath.js"
import {CParserTGA} from "./parser/CParserTGA.js"
import {CParser} from "./parser/CParser.js"
import {CParserFBX} from "./parser/CParserFBX.js"
import {CMesh} from "../render/CMesh.js"

import { CObject, CPointer } from "../basic/CObject.js"
import { CUtilObj } from "../basic/CUtilObj.js"
import { CRes } from "../system/CRes.js"
import { CAlert } from "../basic/CAlert.js"
import { CShaderInterpret } from "../render/CShaderInterpret.js"
import { CUtil } from "../basic/CUtil.js"
import CParserGLTF from "./parser/CParserGLTF.js"
import { CParserIMG } from "./parser/CParserIMG.js"
import { CChecker } from "./CChecker.js"
import { CFile } from "../system/CFile.js"
import { CConsol } from "../basic/CConsol.js"
import { CParserOBJ } from "./parser/CParserOBJ.js"
import CParserSpine from "./parser/CParserSpine.js"
import { CUniqueID } from "../basic/CUniqueID.js"
import { CEvent } from "../basic/CEvent.js"
import { CClass } from "../basic/CClass.js"
import { CVec3 } from "../geometry/CVec3.js"
import { CParserULPC, CULPC } from "./parser/CParserULPC.js"
//https://github.com/JordiRos/GLGif
//gif animation은 이걸로

export class CLoaderOption extends CObject
{
	public mAutoLoad=true;
	public mFilter=CTexture.eFilter.Linear;
	public mWrap=CTexture.eWrap.Clamp;
	public mMipMap=CTexture.eMipmap.GL;
	public mColorTex=false;
	public mAlphaCut=0x09;
	public mAlphaBleed =true;
	mCache=null;//버퍼 등록용
	mGPU=true;
	mTexBufRaw=false;
	
	
	public mInch=false;
	//public simplify=100;
	
	
	override EditForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {
		if(_pointer.member == "mMipMap") 
		{
			let textArr = [], valArr = [];
			for (let [text, val] of Object.entries(CTexture.eMipmap)) {
				if (typeof val === "number") {  // ✅ 숫자 값만 필터링
					textArr.push(text);
					valArr.push(val);
				}
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
		else if (_pointer.member == "mWrap") {
			let textArr = [], valArr = [];
			for (let [text, val] of Object.entries(CTexture.eWrap)) {
				if (typeof val === "number") {
					textArr.push(text);
					valArr.push(val);
				}
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
		else if (_pointer.member == "mFilter") {
			let textArr = [], valArr = [];
			for (let [text, val] of Object.entries(CTexture.eFilter)) {
				if (typeof val === "number") {
					textArr.push(text);
					valArr.push(val);
				}
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
		
		
	}
}
export class CLoader
{
	public mLoadSet=new Set();
	public mRender : CRenderer=null;
	public mRes : CRes=null;
	constructor(_renderer : CRenderer=null,_res : CRes=null)
	{
		this.mRender=_renderer;
		this.mRes=_res;
	}
	IsLoad(_key : string)
	{
		if(this.mRes.Find(_key)!=null)
			return true;

		return this.mLoadSet.has(_key);
	}
	LoadSet()	{	return this.mLoadSet;	}
	LoadCompleteChk()
	{
	
		return this.mLoadSet.size==0;
	}
	// ResSet(_file : string,_data,_option : CLoaderOption)
	// {
	// 	this.mRes.Set(_file,_data);
	// }
	async LoadSwitch(_file : string,_buffer : ArrayBufferLike,_option : CLoaderOption)
	{
		if(_option!=null &&_option.mCache!=null)
		{
			CFile.PushCache(_option.mCache,_buffer);
		}
			

		var pos=_file.lastIndexOf(".")+1;
		var ext=_file.substr(pos,_file.length-pos).toLowerCase();
		if(ext=="png" || ext=="jpg" || ext=="jpeg" || ext=="tga" || ext=="gif")
		{
			
			return await this.TextureLoad(_file,_buffer,_option);
		}
		else if(ext=="ts")
		{
			
			await this.ShaderLoad(_file,_buffer);
			this.mLoadSet.delete(_file);
			return true;
			
		}
		else if(ext=="mp3" || ext=="ogg")
		{
			let r=this.SoundLoad(_file,_buffer);;
			this.mLoadSet.delete(_file);
			return r;
			
		}
		else if(ext=="mp4" || ext=="webm")
		{
			
			this.VideoLoad(_file,_buffer);
			return true;
		
		}
		else if(ext=="fbx" || ext=="gltf" || ext=="glb" || ext=="obj")
		{
			let r=await this.MeshLoad(_file,_buffer,_option);;
			this.mLoadSet.delete(_file);
			
			return r;
			
			
		}
		else if(ext=="json")
		{
		
			let r=await this.JSONLoad(_file,_buffer,_option);
			this.mLoadSet.delete(_file);
			return r;
			
			
		}
		else if(ext=="js")
		{
			await this.JSLoad(_file);
			return true;
		}
		else if(ext=="csv")
		{
			let r=await this.CSVLoad(_file,_buffer);
			this.mLoadSet.delete(_file);
			return r;
			
		}
		else if(ext=="zip")
		{
			if(window["JSZip"] ==null)
			{
				CAlert.E("JSZip not define!");
				return false;
			}
			var rootPath="";
			var spos=_file.lastIndexOf("/");
			var fileName=_file;
			if(spos!=-1)
			{
				rootPath=_file.substr(0,spos)+"/";
			}
			let zip=await window["JSZip"].loadAsync( _buffer );
			
			let flieList=new Array();
			zip.loader=this;
			//bin 파일 저장
			let readPromises = [];
			zip.forEach( (relativePath, entry )=> {
				if (entry.dir == false) {
					let ext=CString.ExtCut(entry.name);
					if(ext.ext=="bin")
					{
						readPromises.push(
							zip.file(entry.name).async("arraybuffer").then(data => {
								this.mRes.Push(rootPath + entry.name, data);
							})
						);
					}
				}
			});
			await Promise.all(readPromises);
			//bin 저장 후 load
			zip.forEach( (relativePath, entry )=>
			{
				flieList.push(rootPath+entry.name);	
				if(entry.dir==false)
				{
					zip.file( entry.name ).async("arraybuffer").then((data)=>
					{
						this.mLoadSet.add(rootPath+entry.name);
						let ext=CString.ExtCut(entry.name);
						
						if(ext.ext=="fbx" || ext.ext=="gltf" || ext.ext=="glb")
						{
							//texture zip에 같이 들어있는 경우가 많아서 자동으로 꺼줌
							let opcopy;
							if(_option) opcopy=_option.Export();
							else opcopy = new CLoaderOption();
							opcopy.textureLoad=false;
							zip.loader.LoadSwitch(rootPath+entry.name,data,opcopy);
						}
						else
							zip.loader.LoadSwitch(rootPath+entry.name,data,_option);
					});
				}
			});
			this.mLoadSet.delete(_file);
			if(this.mRes!=null)			this.mRes.Push(fileName,flieList);
			return flieList;
			
			
		}
		else if(ext=="bin" || ext=="mtl")
		{
			return new Promise((resolve, reject) => {
				if(this.mRes!=null)	this.mRes.Push(_file,_buffer);
				
				
				this.mLoadSet.delete(_file);
				resolve(_buffer);
			});
		}
		else if(_file.indexOf("docs.google.com")!=-1)
		{
			this.mLoadSet.delete(_file);
			return await this.CSVLoad(_file,_buffer);
			
		}
		
		CAlert.E(_file+"미지원");

		return false;
	}
	
	async Exe(_file : Array<string>) : Promise<any>
	async Exe(_file : string) : Promise<any>
	async Exe(_file : string,_option : CLoaderOption) : Promise<any>
	async Exe(_file : any,_option : CLoaderOption=null) : Promise<any>
	{
		if(_file=="")	return true;
		
		if(_file instanceof Array)
		{
			var parr=new Array();
			for(var eahc0 of _file)
			{
				parr.push(this.Exe(eahc0,_option));
			}
			parr=await Promise.all(parr);
			
			return parr.includes(false)==true?null:true;//실패가 있으면 최종 실패다
		}
			
		let res=this.mRes.Find(_file);
		if (null!= res)	return res;

		//로딩중이라면
		if(this.mLoadSet.has(_file))
		{
			//될때까지 기다려 준다
			await CChecker.Exe(async ()=>{

				let res2=this.mRes.Find(_file);
				if (null!= res2)	return false;
				return true;
			});
		}


		this.mLoadSet.add(_file);
		var pos=_file.lastIndexOf(".")+1;
		var ext=_file.substr(pos,_file.length-pos).toLowerCase();

		if (ext=="png" || ext=="jpg" || ext=="jpeg")
		{
			return await this.TextureLoad(_file, _file, _option);	
		}
		else if (ext=="mp4")
		{
			this.VideoLoad(_file,null);
			return true;
		}
		else if (ext=="ulpc")
		{
			this.mLoadSet.delete(_file);
			let jsonFile = _file.replace(/\.ulpc$/i, ".json");
			await this.Exe(jsonFile, _option);	
			return this.mRes.Find(_file);
		}
		else if (ext=="tex" || ext=="rgba" || ext=="mesh")
		{
			this.mLoadSet.delete(_file);
			return true;
		}
		else if (ext=="js" || ext=="jsm")
		{
			
			await this.JSLoad(_file);
			return true;
		}
	
		
		let buf= await CFile.Load(_file);
		if(buf==null)
		{
			this.mLoadSet.delete(_file);
			return false;
		}
		return await this.LoadSwitch(_file,buf,_option);
	}
	async TextureLoad(_file,_buffer,_option : CLoaderOption)
	{	
		if(_option==null)	_option=new CLoaderOption();
		
		
		let tex=new CTexture();

		tex.SetFilter(_option.mFilter);
		tex.SetWrap(_option.mWrap);
		tex.SetMipMap(_option.mMipMap);
		tex.SetSize(1,1);
		tex.CreateBuf();
		
		if( this.mRender!=null && _option.mGPU)	this.mRender.BuildTexture(tex);
		
		var pos=_file.lastIndexOf(".")+1;
		var ext=_file.substr(pos,_file.length-pos).toLowerCase();

		var par :CParserIMG|CParserTGA=null;
		if(ext!="tga")	par = new CParserIMG();
		else 	par = new CParserTGA();
	
		par.mAlphaCut=_option.mAlphaCut;
		par.mAlphaBleed=_option.mAlphaBleed;
		if(typeof _buffer!="string")
			par.SetBuffer(new Uint8Array(_buffer),_buffer.byteLength);
		await par.Load(_file)
		if(par.GetResult()!=null && _option.mGPU)
		{
			par.GetResult().SetFilter(_option.mFilter);
			par.GetResult().SetWrap(_option.mWrap);
			par.GetResult().SetMipMap(_option.mMipMap);
			if( this.mRender!=null)	
			{
				this.mRender.BuildTexture(par.GetResult());
				this.mRender.ReleaseTexture(tex);
			}
		}
		
		
		tex=par.GetResult();
		tex.SetKey(_file);
		tex.mModifyEvent=new CEvent(async ()=>{
			await CClass.CallAsync(null,"BufferTool",[tex.GetBuf()[0],new CVec3(tex.GetWidth(),tex.GetHeight(),1),true]);
		
			
		});

		let result=par.GetResult();
		if(this.mRes!=null)	this.mRes.Push(_file,result);

		this.mLoadSet.delete(_file);
		return result;
	}
	
	private async ShaderLoad(_file : string,_buffer : ArrayBufferLike)
	{
		if( this.mRender==null)	return null;
		
		var text = '';
		var bytes = new Uint8Array( _buffer );
		var len = bytes.byteLength;
		for (var i = 0; i < len; i++) 
		{
			text += String.fromCharCode( bytes[ i ] );
		}
		
		let shaMgr=this.mRender.SInter().New();
		await shaMgr.Exe(_file,text)
		let sl=shaMgr.GetShaderList();
		this.mRes.Push(_file,sl);

		
		let basePath="";
		if(_file.indexOf("z_file")==-1)
		{
			basePath="/"+CString.PathSub(_file);
		}
		for(var each01 of sl.mShader)
		{
			this.mRes.Push(basePath+each01.mKey,each01);
		}
		return sl;
		
	}
	private async MeshLoad(_file : string,_buffer : ArrayBufferLike,_option : CLoaderOption)
	{
		_option = _option ?? new CLoaderOption();
		var pos=_file.lastIndexOf(".")+1;
		var ext=_file.substr(pos,_file.length-pos).toLowerCase();
		
		
		var par :CParser=null;
		if(ext=="fbx")	par = new CParserFBX(_option.mColorTex);
		else if(ext=="obj") 	par = new CParserOBJ();
		else 	par = new CParserGLTF(_option.mInch,_option.mColorTex,_option.mTexBufRaw);
		
		

		par.SetBuffer(new Uint8Array(_buffer),_buffer.byteLength);
		await par.Load(_file)
		var mesh : CMesh = par.GetResult();


		
		if(this.mRes!=null)	this.mRes.Push(_file,mesh);

		await this.MeshTexLoad(_file,mesh,_option);
	
		return mesh;
	}
	async MeshTexLoad(_file : string,mesh : CMesh,_option : CLoaderOption)
	{
		let option=_option.Export();
		if(mesh.clamp==false)
			option.mWrap=CTexture.eWrap.Repeat;

		
		let path=_file.substring(0,_file.lastIndexOf("/"))+"/";

		let texMap=new Map<string,ArrayBuffer>();
		for (let i = 0; i < mesh.texture.length; i++)
		{
			if(mesh.texture[i] as any instanceof Uint8Array)
			{
				
				let buf = mesh.texture[i] as any;
				let newName = path+CUniqueID.GetHash() + ".png";
				mesh.texture[i] = newName;
				this.mLoadSet.add(newName);
				texMap.set(newName,buf);
			}
			else 
			{
				let texStr=(mesh.texture[i] as string);
				if(texStr.indexOf("base64:")!=-1)
				{
					
					let base64Header = "base64:";
					let base64data = texStr.substring(base64Header.length);
					let newName = path+(CHash.SHA256(base64data).substr(0, 16)) + ".png";
					mesh.texture[i] = newName;
					this.mLoadSet.add(newName);
					texMap.set(newName,CUtil.Base64ToArray(base64data));
					

				
				}
				else if(texStr.indexOf(".rgba")!=-1)
				{
					let ne = CString.LeftRightCut(texStr,"rgba",".rgba");
					CH5Canvas.Init(1,1);
					var para=[CH5Canvas.Cmd("fillStyle","rgba"+ne),CH5Canvas.Cmd("fillRect",[0,0,1,1])];
					CH5Canvas.Draw(para);
					var tex=CH5Canvas.GetNewTex();
					this.mRender.BuildTexture(tex);
					this.mRes.Push(texStr,tex);
				}
				else
					await this.Exe(texStr,option);
			}
			
		}
		for(let [key,value] of texMap)		
		{
			await this.LoadSwitch(key, value, option);
		}
	}
	private VideoLoad(_file : string,_buffer : ArrayBufferLike)
	{
		this.mLoadSet.delete(_file);
		var video = document.createElement('video');
		video.autoplay = true;
		video.muted = true;
		video.loop = true;
		video.playsInline = true;
		video.crossOrigin="anonymous";
	
		var pos=_file.lastIndexOf(".")+1;
		var ext=_file.substr(pos,_file.length-pos);
		var url=null;
		if(_buffer==null)
		{
			url=_file;
		}
		else
		{
			let blob = new Blob([_buffer as ArrayBuffer], { type: "video/"+ext });
			url = window.URL.createObjectURL(blob);
		}
		
		video.src = url;
		video.load();


		this.mRender.BuildVideo(video,_file);
		
	}
	private SoundLoad(_file : string,_buffer : ArrayBufferLike)
	{
		if(this.mRes!=null)	this.mRes.Push(_file,_buffer);

		return _buffer;
	}
	//리소스에도 저장되고,file window에도 등록됌
	private async JSONLoad(_file : string,_buffer : ArrayBufferLike,_option : CLoaderOption)
	{
		let str=CUtil.ArrayToString(_buffer);
		let jData=new CJSON(str);

		if(jData.Get("skeleton")!=null)
		{
			let par :CParserSpine=new CParserSpine();
			par.SetBuffer(new Uint8Array(_buffer),_buffer.byteLength);
			await par.Load(_file);
			let mesh : CMesh = par.GetResult();
			if(this.mRes!=null)			this.mRes.Push(_file,mesh);
			await this.MeshTexLoad(_file,mesh,_option);
			return mesh;
		}
		else if(jData.GetStr("bodyType")!=null || jData.Get("selections")!=null)
		{
			let par :CParserULPC=new CParserULPC();
			par.SetBuffer(new Uint8Array(_buffer),_buffer.byteLength);
			// par.mResBase=jData.GetStr("resBase")
			// if(par.mResBase==null)	return null;

			await par.Load(_file);
			let ulpc : CULPC = par.GetResult();
			
			if(this.mRes!=null)
			{
				this.mRes.Push(ulpc.Key(),ulpc);
				//ulpc.SetKey(_file);
				//let textureFile = _file.replace(/\.json$/i, ".ulpc"); 
				this.mRes.Push(ulpc.mTexture.Key(), ulpc.mTexture);
			}
			
			return ulpc;
		}
		else if(jData.GetStr("class")!=null)
		{
			let obj=CClass.New(jData.GetStr("class")) as CObject;
			obj.ImportCJSON(jData);
			if(this.mRes!=null)			this.mRes.Push(_file,obj);

			return obj;
		}
		
		if(this.mRes!=null)	this.mRes.Push(_file,jData);

		return jData;
	}

	private async CSVLoad(_file: string, _buffer: ArrayBufferLike)
	{
		let arr = [];
		let str = CUtil.ArrayToString(_buffer);

		const lines = str.split(/\r?\n/);
		const headers = lines[0].split(",").map(h => h.trim());

		for (let i = 1; i < lines.length; i++)
		{
			const line = lines[i].trim();
			if (!line) continue;

			const values = line.split(",");
			const row: Record<string, string> = {};
			for (let j = 0; j < headers.length; j++)
			{
				row[headers[j]] = values[j]?.trim() ?? "";
				row[j] = values[j]?.trim() ?? "";
			}
				

			arr.push(row);
		}

		if(this.mRes!=null)		this.mRes.Push(_file, arr);
		return arr;
	}

	//동적 로드인데 버퍼로는 안되고 파일명으로만 가능
	private async JSLoad(_file : string)
	{
		this.mLoadSet.delete(_file);
		let _classic=false;
		return new Promise(async (resolve, reject)=>{
			
			let loadFun=()=>{
				resolve("");
			};
			if(_file.indexOf("css")!=-1)
			{
				var link= document.createElement('link');
				link.href=_file;
				link.crossOrigin="anonymous";
				link.onload=loadFun;
				var head= document.getElementsByTagName('head')[0];
				head.appendChild(link);
			}
			else
			{
				if(_classic)
				{
						
					var head= document.getElementsByTagName('head')[0];
					var script= document.createElement('script');
					if(_file.indexOf("jsm")!=-1)
						script.type= 'module';
					else
						script.type= 'text/javascript';
					
					script.src= _file;
					script.defer=true;
					script.async=false;
					script.crossOrigin="anonymous";
					script.onload=loadFun;
					head.appendChild(script);
				}
				else
				{
					import(CPath.PHPCR()+_file).then((_im)=>{
						for(var each0 in _im)
						{
							window[each0] = _im[each0];
						}
						loadFun();
					});
				}
			}
		});
	}

	
}