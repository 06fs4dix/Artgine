import {CBlackBoard} from "../basic/CBlackBoard.js";
import {CConsol} from "../basic/CConsol.js";
import { CLan } from "../basic/CLan.js";
import {CObject} from "../basic/CObject.js";
import {CPath} from "../basic/CPath.js"

export class CRes extends CObject
{
	public mResMap=new Map<string,any>();
	HttpPathChange(_key)
	{
		
		
		let url = new URL(_key);
		url.host = location.host;

		//proj이름 변경
		let myProjName = "";
		let splitPathName = location.pathname.split("/");
		if(splitPathName.length > 1) {
			myProjName = splitPathName[1];
		}

		if(myProjName != "") {
			let resProjName = "";
			splitPathName = url.pathname.split("/");
			if(splitPathName.length > 1) {
				resProjName = url.pathname.split("/")[1];
			}

			if(resProjName != "") {
				url.pathname = "";
				for(let split of splitPathName) {
					if(split == resProjName) {
						split = myProjName;
					}
					if(split != "") {
						url.pathname += split;
						if(splitPathName[splitPathName.length - 1] != split) {
							url.pathname += "/";
						}
					}
				}
			}
		}
		return url.toString();
	}
	Keys()
	{
		return this.mResMap.keys();
	}
	Values()
	{
		return this.mResMap.values();
	}
	
	Find(_key : string) : any
	{
		if(_key==null)	return null;
		if(this.mResMap.has(_key)) {
			return this.mResMap.get(_key);
		}

		let key = _key;
		//만약 url이면 현재 host로 바꿔줌
		if(_key.startsWith("http") && (_key.indexOf(CPath.Join("root")) != -1 || _key.indexOf("localhost")!=-1))
		{
			
			
			key = this.HttpPathChange(_key);
			if(this.mResMap.has(key)) {
				this.mResMap.set(_key, this.mResMap.get(key));
			}
		}
		return this.mResMap.get(key);
	}
	Push(_key: string, _value: any)
	{
		this.mResMap.set(_key as string,_value);
		return this;
	}
	Remove(_key: string)
	{
		this.mResMap.delete(_key);
	}
	// toString()
	// {
	// 	var list=new Array();
	// 	for(var eachKey of this.m_res.keys())
	// 	{
	// 		var ext=eachKey.substr(eachKey.indexOf("."),eachKey.length-eachKey.indexOf("."));
			
	// 		if(ext==".FBX" || ext==".jpg" || ext==".png" || ext==".sl")
	// 		{
	// 			var key=eachKey;
	// 			if(eachKey.indexOf(CPath.Combine("Host"))!=-1 || eachKey.indexOf("localhost"))
	// 			{
					
	// 				key="RootPath/"+eachKey.substring(eachKey.indexOf(CPath.Combine("Root")),eachKey.length);
	// 			}
				
	// 			var rl={"file":key,"option":"{}"};
	// 			var data=this.m_res.get(eachKey);
	// 			if(data["LoaderOption"]!=null)
	// 				rl.option=data["LoaderOption"]();
			
	// 			list.push(rl);
	// 		}
	// 	}
	// 	var str="";
		
	// 	for(var each0 of list)
	// 	{
	// 		str+=each0.file+"#323"+each0.option+"~728";
	// 	}
		
	// 	return str;
	// }
	// Parsing(_str : string)
	// {
	// 	alert("만들고 확인은 안함");
	// 	var list=new Array();
	// 	var col=_str.split("~728");
	// 	for(var each0 of col)
	// 	{
	// 		var row=each0.split("#323");
	// 		var rl={"file":row[0],"option":row[1]};
	// 		if(rl.file.indexOf("RootPath/")!=-1)
	// 			rl.file.replace("RootPath/",CPath.Combine("Protocol"+"Host"+"Port")+"/");
	// 		list.push(rl);
	// 	}
		
	// 	return list;
	// }
	override EditInit() : HTMLElement
	{
		//이걸 등록해서 자동 생성되게 처리
		this["blackboard"]=CBlackBoard.Map();
		this["languge"]=CLan.Map();
		var div=super.EditInit();
		var input=document.createElement("input");
		input.type="search";
		input.className="form-control";
		input.id="resSearch";
		input.placeholder="Search";
		input.onkeyup=(e)=>{
			var t=e.target as HTMLInputElement;
			var val=t.value;
			var ch=div.getElementsByClassName("border p-1 mt-1");
			for(var each0 of ch)
			{

				
				if(each0.id=="mResMap_title" || each0.id=="blackboard_title")	continue;
				if(each0==t)	continue;

				var hel=each0 as HTMLElement;
				if(each0.textContent.indexOf("mRes : map")!=-1){}
				//else if(each0.textContent.indexOf(val)!=-1)
				else if(each0.textContent.toLowerCase().indexOf(val.toLowerCase()) != -1)
					hel.style.display="";
				else
					hel.style.display="none";
				
			}
		};
		div.prepend(input);

		

		return div; 
	}
}