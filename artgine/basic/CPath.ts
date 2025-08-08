
/*
http://127.0.0.1:8080/Context/Main/Sub/Main.jsp


http://  - Protocol
127.0.0.1  - Host
8080  - Port
Context/ Context
Main/Sub/ Route
Main.jsp Endpoint

http://127.0.0.1:8080 - Origin
/Root/Main/Sub/Main.jsp - PathName
http://127.0.0.1:8080/Root/ - Root  -> PHPC
http://127.0.0.1:8080/Root/Main/Sub/ - Relative
*/

import {CUtil} from "./CUtil.js";

var g_root=null;
let path: typeof import("path") | null = null;
var __filename = "";  // ← 반드시 let으로 선언
var __dirname = "";
if(CUtil.IsNode())
{
	const urlMod = await import("url");
	path = await import("path");
	
	__filename = urlMod.fileURLToPath(import.meta.url);
	__dirname = path.dirname(__filename);
	
}
	

export class CPath
{
	static eUrl=
	{
		Protocol:"Protocol",
		Host:"Host",
		Port:"Port",
		Context:"Context",
		Route:"Route",
		Endpoint:"Endpoint",
		Resources:"Resources",//일렉트론 전용
	}
	static Origin()
	{
		return location.origin;
	}
	static PathName()
	{
		return location.pathname;
	}
	static FullPath()
	{
		return location.origin+location.pathname;
	}
	static PHPC()
	{
		if(g_root==null)
			g_root=CPath.Join(CPath.eUrl.Protocol+CPath.eUrl.Host+CPath.eUrl.Port+CPath.eUrl.Context);
		return g_root;
	}
	static PHPR()
	{
		if(g_root==null)
			g_root=CPath.Join(CPath.eUrl.Protocol+CPath.eUrl.Host+CPath.eUrl.Port+CPath.eUrl.Resources);
		return g_root;
	}
	static PHPCR()
	{
		return CPath.Join(CPath.eUrl.Protocol+CPath.eUrl.Host+CPath.eUrl.Port+CPath.eUrl.Context+CPath.eUrl.Route);
	}
	static Join(_type)
	{
		
		var str="";
		if (CUtil.IsNode()) {
			let str = "";
			let dir = __dirname.replace(/\\/g, "/");
			let parts = dir.split("/");
			let idx=0;

			// 기존 분기 로직 유지
			if (_type.includes(CPath.eUrl.Context)) 
			{
				const resourcesIdx = parts.map(p => p.toLowerCase()).lastIndexOf("resources");
				if(resourcesIdx>0)
				{
					parts = parts.slice(0, resourcesIdx); // 'resources' 상위까지만 자름
					idx = parts.length; // idx 재설정
				}
				else
					idx = parts.map(p => p.toLowerCase()).lastIndexOf("artgine");
				

				str += parts.slice(0, idx).join("/") + "/"; // ← 여기서 lib 포함하지 않음

				
			}
			else if (_type.includes(CPath.eUrl.Resources)) 
			{
				idx = parts.map(p => p.toLowerCase()).lastIndexOf("artgine");
				str += parts.slice(0, idx).join("/") + "/"; // ← 여기서 lib 포함하지 않음
			}
			
			return str;
		}


		else if (location != null && location.protocol === "file:") 
		{
			const pathName = decodeURI(location.pathname); // ex: /E:/MySvn/.../Sample.html
			const parts = pathName.split("/"); // ['', 'E:', 'MySvn', ..., 'Sample.html']

			let idxProj = parts.indexOf("proj");
			if(idxProj==-1)
				idxProj = parts.indexOf("App");
			let idxWebContent = parts.indexOf("WebContent");
			let baseIdx = idxProj >= 0 ? idxProj : idxWebContent;

			if (baseIdx >= 0) {
				if (_type.includes(CPath.eUrl.Context)) {
					// Root: WebContent까지만
					str += parts.slice(1, baseIdx).join("/") + "/";
				}
				if (_type.includes(CPath.eUrl.Route)) {
					// Sub: Sample 폴더까지
					str += parts.slice(baseIdx, parts.length - 1).join("/") + "/";
				}
				if (_type.includes(CPath.eUrl.Endpoint)) {
					// Page: Sample.html
					const page = parts[parts.length - 1];
					str += page;
				}
			}
		}

		
		else 
		{
			var count=0;
			if(_type.indexOf(CPath.eUrl.Protocol)!=-1)
			{
				str+=location.protocol;
				count++;
			}
			if(_type.indexOf(CPath.eUrl.Host)!=-1)
			{
				if(_type.indexOf(CPath.eUrl.Protocol)!=-1)
					str+="//";
				str+=location.hostname;
				count++;
			}
			if(_type.indexOf(CPath.eUrl.Port)!=-1)
			{
				
				if(_type.indexOf(CPath.eUrl.Host)!=-1 && location.port!="")
					str+=":";
				str+=location.port;
				count++;
			}
			if(_type.indexOf(CPath.eUrl.Context)!=-1)
			{
				
				if(_type.indexOf(CPath.eUrl.Host)!=-1 || _type.indexOf(CPath.eUrl.Port)!=-1)
					str+="/";
				var temp=location.pathname.substr(1,location.pathname.indexOf("/",1));
				str+=temp;
			}
			if(_type.indexOf(CPath.eUrl.Route)!=-1)
			{
				var temp=location.pathname.substr(0,location.pathname.lastIndexOf("/")+1);
				if(temp.indexOf("/",1)!=-1)
				{
					temp=temp.substr(temp.indexOf("/",1)+1,temp.length);
				}
				str+=temp;
			}
			if(_type.indexOf(CPath.eUrl.Endpoint)!=-1)
			{
				var temp=location.pathname.substr(location.pathname.lastIndexOf("/")+1,location.pathname.length);
				str+=temp;
			}
		}
		
		return str;
	}
	static LocalToWebPath(_A,_B){
		var src1 = _A.replace(/\\/g, '/');
		var src2 = _B.replace(/\\/g, '/');
		var src = "";
		var words1 = src1.split('/');
		var words2 = src2.split('/');
		var lastA = -1;
		var lastB = -1;
		for(var i = 0;i<words1.length;i++)
			for(var j = 0;j<words2.length;j++)
				if(words1[i] == words2[j]){
					lastA = words1[i];
					lastB = words2[j];
				}
		var src1_ = src1.indexOf(lastA);
		var src2_ = src2.indexOf(lastB);
		src = src2.slice(0,src2_) + src1.slice(src1_,_A.length);
		return src;
	}


}
