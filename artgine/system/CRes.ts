import { CBlackBoard } from "../basic/CBlackBoard.js";
import { CConsol } from "../basic/CConsol.js";
import { CDOM } from "../basic/CDOM.js";
import { CLan } from "../basic/CLan.js";
import { CObject } from "../basic/CObject.js";
import { CPath } from "../basic/CPath.js"
import { CTree } from "../basic/CTree.js";
import { CUtil } from "../basic/CUtil.js";
import { CMesh } from "../render/CMesh.js";
import { CTexture } from "../render/CTexture.js";

export class CRes extends CObject {
	public mResMap = new Map<string, any>();
	HttpPathChange(_key) {


		let url = new URL(_key);
		url.host = location.host;

		//proj이름 변경
		let myProjName = "";
		let splitPathName = location.pathname.split("/");
		if (splitPathName.length > 1) {
			myProjName = splitPathName[1];
		}

		if (myProjName != "") {
			let resProjName = "";
			splitPathName = url.pathname.split("/");
			if (splitPathName.length > 1) {
				resProjName = url.pathname.split("/")[1];
			}

			if (resProjName != "") {
				url.pathname = "";
				for (let split of splitPathName) {
					if (split == resProjName) {
						split = myProjName;
					}
					if (split != "") {
						url.pathname += split;
						if (splitPathName[splitPathName.length - 1] != split) {
							url.pathname += "/";
						}
					}
				}
			}
		}
		return url.toString();
	}
	Keys() {
		return this.mResMap.keys();
	}
	Values() {
		return this.mResMap.values();
	}

	Find(_key: string): any {
		if (_key == null) return null;
		if (this.mResMap.has(_key)) {
			return this.mResMap.get(_key);
		}

		let key = _key;
		//만약 url이면 현재 host로 바꿔줌
		if (_key.startsWith("http") && (_key.indexOf(CPath.Join("root")) != -1 || _key.indexOf("localhost") != -1)) {


			key = this.HttpPathChange(_key);
			if (this.mResMap.has(key)) {
				this.mResMap.set(_key, this.mResMap.get(key));
			}
		}
		return this.mResMap.get(key);
	}
	Push(_key: string, _value: any) {
		this.mResMap.set(_key as string, _value);
		return this;
	}
	Remove(_key: string) {
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
	// override EditInit(): HTMLElement {
	// 	//이걸 등록해서 자동 생성되게 처리
	// 	this["blackboard"] = CBlackBoard.Map();
	// 	this["languge"] = CLan.Map();
	// 	var div = super.EditInit();
	// 	var input = document.createElement("input");
	// 	input.type = "search";
	// 	input.className = "form-control";
	// 	input.id = "resSearch";
	// 	input.placeholder = "Search";
	// 	input.onkeyup = (e) => {
	// 		var t = e.target as HTMLInputElement;
	// 		var val = t.value;
	// 		var ch = div.getElementsByClassName("border p-1 mt-1");
	// 		for (var each0 of ch) {


	// 			if (each0.id == "mResMap_title" || each0.id == "blackboard_title") continue;
	// 			if (each0 == t) continue;

	// 			var hel = each0 as HTMLElement;
	// 			if (each0.textContent.indexOf("mRes : map") != -1) { }
	// 			//else if(each0.textContent.indexOf(val)!=-1)
	// 			else if (each0.textContent.toLowerCase().indexOf(val.toLowerCase()) != -1)
	// 				hel.style.display = "";
	// 			else
	// 				hel.style.display = "none";

	// 		}
	// 	};
	// 	div.prepend(input);

	// 	// let tree=new CTree<any>();
	// 	// for(let [key,value] of this.mResMap)
	// 	// {
	// 	// 	if(value instanceof CTexture || value instanceof CMesh)
	// 	// 	{

	// 	// 	}
	// 	// }


	// 	// mResMap에서 텍스쳐/메쉬 && '/'가 있는 경로만 트리에 구성
	// 	let tree = new CTree<any>();

	// 	function normalizeKey(raw: string): string | null {
	// 		if (!raw) return null;
	// 		// URL이면 pathname만 사용
	// 		if (raw.startsWith("http://") || raw.startsWith("https://")) {
	// 			try {
	// 				const u = new URL(raw);
	// 				const p = u.pathname.replace(/^\/+/, "");
	// 				return p.includes("/") ? p : null;
	// 			} catch { return null; }
	// 		}
	// 		// 로컬/상대 경로
	// 		return raw.includes("/") ? raw.replace(/^\/+/, "") : null;
	// 	}

	// 	// parent의 '직계 자식들' 중 key가 일치하면 반환, 없으면 생성
	// 	function getOrMakeChild(parent: CTree<any>, key: string): CTree<any> {
	// 		if (!parent.mChild) return parent.PushChild(key) as CTree<any>; // 첫 자식 생성

	// 		// 첫 자식부터 형제들을 훑어 동일 key 찾기
	// 		let node: CTree<any> = parent.mChild;
	// 		while (true) {
	// 			if (node.mKey === key) return node;
	// 			if (!node.mColleague) break;
	// 			node = node.mColleague;
	// 		}
	// 		// 동일 key가 없으면 형제로 추가
	// 		return node.PushColleague(key) as CTree<any>;
	// 	}

	// 	for (const [key, value] of this.mResMap as Map<string, any>) {
	// 		// 1) 텍스쳐/메쉬만 통과
	// 		if (!(value instanceof CTexture) && !(value instanceof CMesh)) continue;

	// 		// 2) '/' 포함 경로만 통과
	// 		// const norm = normalizeKey(key);
	// 		// if (!norm) continue;

	// 		// 3) 경로 세그먼트별로 폴더 생성 → 파일 노드에 데이터 기록
	// 		const parts = key.split("/").filter(Boolean);
	// 		//if (parts.length < 2) continue; // 최소 "폴더/파일"

	// 		const fileName = parts.pop()!;
	// 		let cur = tree;
	// 		for (const seg of parts) {
	// 			cur = getOrMakeChild(cur, seg);
	// 		}

	// 		// 파일 노드(리프): 파일명으로 노드 찾거나 생성, mData에 리소스 저장
	// 		const leaf = getOrMakeChild(cur, fileName);
	// 		leaf.mData = value; // CTree의 mData 사용 :contentReference[oaicite:4]{index=4}

	// 		// [선택] 리프의 mKey를 전체 경로로 두고 싶다면 다음 한 줄 추가/교체:
	// 		// leaf.mKey = norm;  // 이 경우 getOrMakeChild 대신 그냥 새 노드 생성 로직이 더 적합
	// 	}


	// 	return div;
	// }




	// ===== CRes 클래스 내부 =====
	override EditInit(): HTMLElement {
		// 자동 생성 등록
		(this as any)["blackboard"] = CBlackBoard.Map();
		(this as any)["languge"] = CLan.Map();

		const div = super.EditInit();

		// ── 상단 검색 입력(기존 유지) ──
		const input = document.createElement("input");
		input.type = "search";
		input.className = "form-control";
		input.id = "resSearch";
		input.placeholder = "Search";
		input.onkeyup = (e) => {
			const t = e.target as HTMLInputElement;
			const val = t.value;
			let ch = div.getElementsByClassName("border p-1 mt-1");
			let resMapKey="";
			let bbMapKey="";
			
			
			for (const each0 of ch as any) {
				if ((each0 as HTMLElement).id === "mResMap_title") 
				{
					resMapKey=(each0 as HTMLElement).getAttribute("data-bs-target").substring(1,99);
					continue;
				}
				if ((each0 as HTMLElement).id === "blackboard_title") 
				{
					bbMapKey=(each0 as HTMLElement).getAttribute("data-bs-target").substring(1,99);;
					continue;
				}
				if (each0 === t) continue;
				const hel = each0 as HTMLElement;
				if ((each0 as HTMLElement).textContent?.toLowerCase().indexOf(val.toLowerCase()) !== -1)
					hel.style.display = "";
				else
					hel.style.display = "none";
			}
			if(val=="")
			{
				CDOM.ID(resMapKey).className="border border-top-0 ps-2 collapse";
				CDOM.ID(bbMapKey).className="border border-top-0 ps-2 collapse";	
				return;
			}
			CDOM.ID(resMapKey).className="border border-top-0 ps-2 collapse show";
			CDOM.ID(bbMapKey).className="border border-top-0 ps-2 collapse show";
			
			ch = div.getElementsByClassName("border border-top-0 ps-2 collapse show");
			for (const each0 of ch as any) {
				
				if(each0.id!=resMapKey && each0.id!=bbMapKey) 
					each0.className="border border-top-0 ps-2 collapse";
				// if (each0 === t) continue;


				// const hel = each0 as HTMLElement;
				// if ((each0 as HTMLElement).textContent?.toLowerCase().indexOf(val.toLowerCase()) != -1)
				// 	hel.style.display = "";
				// else
				// 	hel.style.display = "none";
			}
			
		};
		div.prepend(input);

		// ─────────────────────────────────────────
		// 1) gTree 생성/재사용 + 증분 반영
		// ─────────────────────────────────────────
		if (!(gTree instanceof CTree)) gTree = new CTree<CObject>(); // 루트(mKey="")

		// 직계 자식 중 key로 찾기
		const findChild = (parent: CTree<CObject>, key: string): CTree<CObject> | null => {
			let n = parent.mChild as CTree<CObject> | null;
			while (n) { if (n.mKey === key) return n; n = n.mColleague as any; }
			return null;
		};

		// 없으면 생성해서 반환(있으면 그대로)
		const getOrMakeChild = (parent: CTree<CObject>, key: string): CTree<CObject> => {
			const found = findChild(parent, key);
			if (found) return found;
			if (!parent.mChild) return parent.PushChild(key) as CTree<CObject>;
			let tail = parent.mChild as CTree<CObject>;
			while (tail.mColleague) tail = tail.mColleague as CTree<CObject>;
			return tail.PushColleague(key) as CTree<CObject>;
		};

		// mResMap → gTree에 증분 삽입(동일 경로/파일명이 이미 있으면 건너뜀)
		for (const [key, value] of this.mResMap as Map<string, any>) {
			//if (!(value instanceof CTexture) && !(value instanceof CMesh)) continue;

			const parts = String(key).split("/").filter(Boolean);
			if (parts.length === 0) continue;

			const fileName = parts.pop()!;
			let cur = gTree;
			for (const seg of parts) cur = getOrMakeChild(cur, seg);

			const existed = findChild(cur, fileName);
			if (existed) {
				// 이미 있으면 건너뜀(단, mData가 비어있다면 채워줌)
				if (existed.mData == null) existed.mData = value;
			} else {
				const leaf = getOrMakeChild(cur, fileName);
				if (leaf.mData == null) leaf.mData = value;
			}
		}

		// ★ 추가: 블랙보드 전부 병합(타입 필터 없음)
		for (const [key, value] of CBlackBoard.Map() as Map<string, CObject>) {
		if (!value) continue;

		const parts = String(key).split("/").filter(Boolean);
		if (parts.length === 0) continue;         // 빈 키는 스킵

		const fileName = parts.pop()!;
		let cur = gTree!;
		for (const seg of parts) cur = getOrMakeChild(cur, seg);

		const existed = findChild(cur, fileName);
		if (existed) {
			// 이미 노드가 있으면 건너뜀(단, 데이터가 비어있다면 채워줌)
			if (existed.mData == null) existed.mData = value;
		} else {
			const leaf = getOrMakeChild(cur, fileName);
			if (leaf.mData == null) leaf.mData = value;
		}
		}

		// ─────────────────────────────────────────
		// 2) CTree 기반 리소스 뷰어 렌더
		// ─────────────────────────────────────────
		const viewer = document.createElement("div");
		viewer.className = "mt-3";
		div.appendChild(viewer);

		const childrenOf = (node: CTree<CObject>): CTree<CObject>[] => {
			const arr: CTree<CObject>[] = [];
			let ch = node.mChild;
			while (ch) { arr.push(ch); ch = ch.mColleague; }
			return arr;
		};

		const pathOf = (node: CTree<CObject>): string => {
			const segs: string[] = [];
			let p: CTree<CObject> | null = node;
			while (p && p.mParent) { if (p.mKey) segs.push(p.mKey); p = p.mParent; }
			return segs.reverse().join("/") || "(root)";
		};

		// 현재 포커스 노드: gCurNode가 null이면 루트로
		let curNode: CTree<CObject> = gCurNode ?? gTree;

		const render = () => {
			viewer.innerHTML = "";

			// ── 상단 breadcrumb ──
			const pathBar = document.createElement("div");
			pathBar.className = "mb-2";

			const rootBtn = document.createElement("button");
			rootBtn.type = "button";
			rootBtn.className = "btn btn-sm btn-outline-warning me-1";
			rootBtn.textContent = "/";
			rootBtn.onclick = () => {
				curNode = gTree!;
				gCurNode = curNode;       // ← 마지막 위치 저장
				render();
			};
			pathBar.appendChild(rootBtn);

			const trail: CTree<any>[] = [];
			{ let p: CTree<any> | null = curNode; while (p) { trail.push(p); p = p.mParent; } trail.reverse(); }

			for (let i = 1; i < trail.length; i++) {
				const node = trail[i];
				const b = document.createElement("button");
				b.type = "button";
				b.className = "btn btn-sm btn-outline-danger me-1";
				b.textContent = node.mKey;
				b.onclick = () => {
					curNode = node as CTree<CObject>;
					gCurNode = curNode;     // ← 마지막 위치 저장
					render();
				};
				pathBar.appendChild(b);
			}

			// const curTxt = document.createElement("span");
			// curTxt.className = "ms-2 text-muted";
			// curTxt.textContent = pathOf(curNode);
			//pathBar.appendChild(curTxt);
			viewer.appendChild(pathBar);

			// ── 목록: 폴더 먼저, 파일 다음 ──
			const list = document.createElement("div");
			list.className = "d-flex flex-wrap gap-2";

			const children = childrenOf(curNode);
			children.sort((a, b) => {
				const aIsFolder = a.mData == null;
				const bIsFolder = b.mData == null;
				if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
				return a.mKey.localeCompare(b.mKey);
			});

			for (const n of children) {
				const isFolder = n.mData == null;
				const btn = document.createElement("button");
				btn.type = "button";

				const i = document.createElement("i");
				i.setAttribute("aria-hidden", "true");
				i.classList.add("me-1");

				if (isFolder) {
					i.className = "bi bi-folder me-1";
					btn.className = "btn btn-sm btn-warning border";
				} else {
					btn.setAttribute("draggable", "true");
					btn.addEventListener("dragstart", (ev) => {
						ev.stopPropagation();
						ev.dataTransfer?.setData("hash", (n.mData as any).Key());
						CObject.SetDrag("CObject", n.mData);
					});
					i.className = (typeof (n.mData as any)?.Icon === "function")
						? (n.mData as any).Icon()
						: "bi bi-file-earmark";
					if(n.mData instanceof CTexture || n.mData instanceof CMesh)
						btn.className = "btn btn-sm btn-light border";
					else if(n.mData instanceof CObject && n.mData.IsBlackBoard())
						btn.className = "btn btn-sm btn-outline-primary border";
					else 
						btn.className = "btn btn-sm btn-secondary border";
					

				}

				const nameSpan = document.createElement("span");
				nameSpan.textContent = ` ${n.mKey}`;
				btn.append(i, nameSpan);

				if (isFolder) {
					btn.title = "Open folder";
					btn.onclick = () => {
						curNode = n as CTree<CObject>;
						gCurNode = curNode;   // ← 마지막 위치 저장
						render();
					};
				} else {
					btn.title = pathOf(n);
					btn.onclick = () => {
						if(n.mData.Key==null)	return;
						input.value=n.mData.Key();
						input.dispatchEvent(new Event('keyup', {bubbles: true}));
						// const fullPath = pathOf(n);
						// try { navigator.clipboard?.writeText(fullPath); } catch { }
						// console.log("[Res]", fullPath, n.mData);
					};
				}

				list.appendChild(btn);
			}

			viewer.appendChild(list);
		};

		// 최초 진입 시에도 위치 저장(루트 또는 복구 위치)
		gCurNode = curNode;
		render();

		return div;
	}


}
let gTree: CTree<CObject> | null = null;
let gCurNode: CTree<CObject> | null = null;
