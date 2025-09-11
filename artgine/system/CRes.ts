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


// 	override EditInit(): HTMLElement {
//   // 기존 등록 유지
//   (this as any)["blackboard"] = CBlackBoard.Map();
//   (this as any)["languge"] = CLan.Map();

//   const div = super.EditInit();

//   // ── 검색 인풋(기존 유지) ──
//   const input = document.createElement("input");
//   input.type = "search";
//   input.className = "form-control";
//   input.id = "resSearch";
//   input.placeholder = "Search";

//   // ── 경로 트리 빌드 ──
//   type Node = { name: string; children: Map<string, Node>; files: string[] };
//   const root: Node = { name: "", children: new Map(), files: [] };

//   const normalizeKey = (raw: string): string | null => {
//     if (!raw || raw.indexOf("/") === -1) return null; // '/' 없는 건 제외
//     try {
//       if (raw.startsWith("http")) {
//         const u = new URL(raw);
//         return u.pathname.replace(/^\/+/, "");
//       }
//     } catch { /* ignore */ }
//     return raw.replace(/^\/+/, "");
//   };

//   for (const [key] of this.mResMap as Map<string, any>) {
//     const norm = normalizeKey(key);
//     if (!norm) continue;

//     const parts = norm.split("/").filter(Boolean);
//     if (parts.length === 0) continue;

//     const file = parts.pop()!;
//     let cur = root;
//     for (const p of parts) {
//       let child = cur.children.get(p);
//       if (!child) {
//         child = { name: p, children: new Map(), files: [] };
//         cur.children.set(p, child);
//       }
//       cur = child;
//     }
//     cur.files.push(key); // 원본 키 저장
//   }

//   const section = document.createElement("div");
//   section.className = "mt-2";

//   const countFiles = (n: Node): number =>
//     n.files.length + [...n.children.values()].reduce((a, c) => a + countFiles(c), 0);

//   const extIcon = (name: string) => {
//     const ext = (name.split(".").pop() || "").toLowerCase();
//     if (["png","jpg","jpeg","gif","webp","bmp","tga"].includes(ext)) return "🖼️";
//     if (["gltf","glb","obj","fbx","dae","stl","ply"].includes(ext)) return "📦";
//     if (["sl","wgsl","glsl","vert","frag"].includes(ext)) return "💡";
//     if (["mp3","wav","ogg"].includes(ext)) return "🔊";
//     return "📄";
//   };

//   const makeFileEl = (key: string) => {
//     const el = document.createElement("button");
//     el.type = "button";
//     el.className = "btn btn-sm btn-light border d-inline-flex align-items-center gap-2 px-2 py-1 res-file";
//     el.setAttribute("data-key", key.toLowerCase());
//     el.title = key;

//     const icon = document.createElement("span");
//     const filename = key.split("/").pop() || key;
//     icon.textContent = extIcon(filename);

//     const label = document.createElement("span");
//     label.textContent = filename;

//     el.appendChild(icon);
//     el.appendChild(label);

//     el.onclick = () => { try { navigator.clipboard?.writeText(key); } catch {} console.log("[Res]", key); };
//     return el;
//   };

//   const makeFolderEl = (node: Node): HTMLElement => {
//     // 루트면 하위만 나열
//     if (node === root) {
//       const wrap = document.createElement("div");
//       for (const child of [...node.children.values()].sort((a,b)=>a.name.localeCompare(b.name))) {
//         wrap.appendChild(makeFolderEl(child));
//       }
//       for (const f of node.files.sort()) wrap.appendChild(makeFileEl(f));
//       return wrap;
//     }

//     const details = document.createElement("details");
//     details.className = "res-folder";
//     details.open = false;

//     const summary = document.createElement("summary");
//     summary.className = "d-flex align-items-center gap-2 py-1";
//     summary.style.cursor = "pointer";

//     const title = document.createElement("span");
//     title.textContent = node.name;

//     const badge = document.createElement("span");
//     badge.textContent = String(countFiles(node));
//     badge.className = "badge bg-light text-muted";
//     badge.style.border = "1px solid rgba(0,0,0,.08)";

//     summary.appendChild(title);
//     summary.appendChild(badge);
//     details.appendChild(summary);

//     const inner = document.createElement("div");
//     inner.className = "ms-3 mt-1 d-flex flex-column gap-1";

//     for (const child of [...node.children.values()].sort((a,b)=>a.name.localeCompare(b.name))) {
//       inner.appendChild(makeFolderEl(child));
//     }
//     for (const f of node.files.sort()) inner.appendChild(makeFileEl(f));

//     details.appendChild(inner);
//     return details;
//   };

//   section.appendChild(makeFolderEl(root));
//   div.appendChild(section);

//   // ── 검색 시 트리 필터링(조상 폴더 자동 open) ──
//   const applyTreeFilter = (q: string) => {
//     const needle = (q || "").trim().toLowerCase();
//     const folders = section.querySelectorAll<HTMLDetailsElement>("details.res-folder");
//     const files = section.querySelectorAll<HTMLElement>(".res-file");

//     if (!needle) {
//       files.forEach(f => f.style.display = "");
//       folders.forEach(d => { d.style.display = ""; d.open = false; });
//       return;
//     }
//     files.forEach(f => f.style.display = "none");
//     folders.forEach(d => { d.style.display = "none"; d.open = false; });

//     files.forEach(f => {
//       const key = f.getAttribute("data-key") || "";
//       if (key.indexOf(needle) !== -1) {
//         f.style.display = "";
//         // 조상 폴더들 보여주고 open
//         let p: HTMLElement | null = f.parentElement;
//         while (p && p !== section) {
//           if (p.tagName.toLowerCase() === "details") {
//             (p as HTMLDetailsElement).style.display = "";
//             (p as HTMLDetailsElement).open = true;
//           }
//           p = p.parentElement;
//         }
//       }
//     });
//   };

//   // 기존 onkeyup 확장: 기존 필터 + 트리 필터
//   const prevOnKeyUp = input.onkeyup;
//   input.onkeyup = (e: any) => {
//     prevOnKeyUp?.call(input, e);  // 기존 필터 로직 유지(기존 에디터 영역)
//     applyTreeFilter((e.target as HTMLInputElement).value);
//   };

//   // 입력창을 맨 위에
//   div.prepend(input);
//   return div;
// }


}