import { CAlert } from "../basic/CAlert.js";
import { CEvent } from "../basic/CEvent.js";
import { CConsol } from "../basic/CConsol.js";
import { CDOM } from "../basic/CDOM.js";
import { CPath } from "../basic/CPath.js";
import { CString } from "../basic/CString.js";
import { CUtil } from "../basic/CUtil.js";
import { ExtractImportPaths } from "../render/CShaderInterpret.js";
import { CFile } from "../system/CFile.js";
import { CChecker } from "./CChecker.js";


var gMonaco = true;
export class CUtilWeb {
	private static mNotifPool: Set<Notification> = new Set();
	static async Notify(_title: string, _body = "", _icon = "", _onClick: ((...args: any[]) => any) | CEvent<(...args: any[]) => any> | null = null): Promise<boolean> {
		if (!("Notification" in window)) return true;
		if (Notification.permission === "denied") return true;
		if (Notification.permission === "default") {
			const permission = await Notification.requestPermission();
			if (permission !== "granted") return true;
		}
		const noti = new Notification(_title, { body: _body, icon: _icon || undefined });
		CUtilWeb.mNotifPool.add(noti);
		noti.onclose = () => CUtilWeb.mNotifPool.delete(noti);
		if (_onClick != null) {
			const ev = CEvent.ToCEvent(_onClick);
			noti.onclick = () => { window.focus(); ev.Call(); };
		}
		return false;
	}
	static ToastUI(_html: HTMLElement, _height = 400) {
		if (window["toastui"] == null) {
			CAlert.W("toastui not import!");
			return null;
		}
		const editor = new window["toastui"].Editor({
			el: _html,
			height: _height + 'px',
			initialEditType: 'wysiwyg',
			previewStyle: 'vertical'
		});
		return editor;
	}
	static Window(_title = "Window", _width = 640, _height = 480) {
		return window.open(CPath.PHPC() + "lib/artgine/Window.html", _title, "width=" + _width + ",height" + _height + "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes");
	}
	static Parameter(_name, _value = null) {
		var source = window['g_requestParameter'];
		if (source == null) source = location.search;
		_name = _name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		var regex = new RegExp("[\\?&]" + _name + "=([^&#]*)"),
			results = regex.exec(source);
		return results == null ? _value : decodeURIComponent(results[1].replace(/\+/g, " "));
	}
	static PageReload() {
		location.reload();
	}
	static PageCall(_link, _keyArr = new Array(), _valueArr = new Array(), _post = true) {
		var form = document.createElement("form");
		form.setAttribute("charset", "UTF-8");
		form.setAttribute("method", _post ? "Post" : "Get");
		form.setAttribute("action", _link);

		for (var i = 0; i < _keyArr.length; ++i) {
			var hiddenField = document.createElement("input");
			hiddenField.setAttribute("type", "hidden");
			hiddenField.setAttribute("name", _keyArr[i]);
			hiddenField.setAttribute("value", _valueArr[i]);
			form.appendChild(hiddenField);
		}
		document.body.appendChild(form);
		form.submit();

	}
	static PageBack() {
		window.history.back();
	}
	// value: 'console.log("Hello!");',
	//   language: 'javascript',
	//   theme: 'vs-dark'
	// static async MonacoEditerArtgineLibAdd()
	// {
	// 	let buf=await CFile.Load(CPath.PHPC()+"/artgine/artgine.ts");

	// 	let importPathArr=ExtractImportPaths(CUtil.ArrayToString(buf),false);//"../../../artgine/z_file/Shader"
	// 	let fullPath=CPath.FullPath();//file://E:/svn/Artgine/WebContent/"Artgine/proj/Tutorial/ShaderEditer/"
	// 	fullPath=CString.PathSub(fullPath);

	// 	for(let i=0;i<importPathArr.length;++i)
	// 	{
	// 		let path=importPathArr[i];

	// 		let count = 0;
	// 		while (path.startsWith("../")) {
	// 			count++;
	// 			path = path.substring(3);
	// 		}

	// 		path=CString.ReplaceAll(path,"./","");
	// 		path=CString.ReplaceAll(path,".js","");

	// 		// 상위 디렉토리 개수만큼 fullPath에서 제거
	// 		let adjustedFullPath = CString.PathSub(fullPath, count);
	// 		adjustedFullPath = adjustedFullPath + "/" + path;
	// 		importPathArr[i]=adjustedFullPath;

	// 		let fName=importPathArr[i];		
	// 		fName+=".ts";
	// 		let buf=await CFile.Load(fName);

	// 		window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(
	// 			CUtil.ArrayToString(buf),
	// 			fName
	// 		);


	// 	}


	// }
	static async TSImport(_source: string, _monaco = true, _github = false, _filePath: string = null) {
		let importPathArr = ExtractImportPaths(_source, false);
		const fileDir = CString.PathSub(_filePath ?? CPath.FullPath());
		const rootBase = (_github ? "https://06fs4dix.github.io/Artgine" : CPath.PHPC()).replace(/\/$/, "");

		const processedPaths = new Map<string, string>();

		for (let i = 0; i < importPathArr.length; ++i) {
			const originalPath = importPathArr[i];
			if (processedPaths.has(originalPath)) continue;

			// 이미 절대 URL이면 스킵
			if (/^https?:\/\//.test(originalPath)) {
				processedPaths.set(originalPath, originalPath);
				continue;
			}

			let path = originalPath;
			if (_monaco) path = CString.ReplaceAll(path, ".js", "");
			else if (path.indexOf(".js") == -1) path += ".js";

			let adjustedFullPath: string;

			if (path.startsWith("../") || path.startsWith("./")) {
				// 상대경로: 현재 파일 디렉토리 기준
				let count = 0;
				while (path.startsWith("../")) { count++; path = path.substring(3); }
				if (path.startsWith("./")) path = path.substring(2);

				if (_github) {
					// github 모드: 상대경로도 github 루트 기준으로 치환
					adjustedFullPath = rootBase + "/" + path;
				} else {
					const base = count > 0 ? CString.PathSub(fileDir, count) : fileDir;
					adjustedFullPath = base + "/" + path;
				}
			} else {
				// 프로젝트 루트 절대경로 (artgine/..., plugin/... 등)
				adjustedFullPath = rootBase + "/" + path;
			}

			_source = _source.replace(originalPath, adjustedFullPath);
			processedPaths.set(originalPath, adjustedFullPath);
			importPathArr[i] = adjustedFullPath;

			if (_monaco && window["require"] != null) {
				const fName = adjustedFullPath + ".ts";
				const buf = await CFile.Load(fName);
				window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(
					CUtil.ArrayToString(buf), fName
				);
			}
		}

		return _source;
	}

	static MonacoEditer(_target: HTMLElement, _value: string, _language: "plaintext" | "json" | "typescript" | "javascript" | "wgsl" | "html" = "plaintext",
		_theme: "vs" | "vs-dark" = "vs-dark", _exeFun = null, _github = false, _filePath: string = null) {
		if (window["require"] == null) {
			_target.innerHTML = "MonacoEditer not import!";

			return;
		}

		if (gMonaco) {
			(require as any).config({ paths: { vs: CPath.PHPC() + '/artgine/external/legacy/monaco-editor/min/vs' } });
			gMonaco = false;
		}

		(require as any)(['vs/editor/editor.main'], async function () {
			if (_language == "typescript")
				_value = await CUtilWeb.TSImport(_value, true, _github, _filePath);

			_target.innerHTML = "";
			// ✅ JS 파일에 대한 설정
			window["monaco"].languages.typescript.javascriptDefaults.setCompilerOptions({
				allowJs: true,
				checkJs: true,
				//allowNonTsExtensions: true,
				target: window["monaco"].languages.typescript.ScriptTarget.ES2022,
				module: window["monaco"].languages.typescript.ModuleKind.ESNext
			});
			let editor = window["monaco"].editor.create(_target, {
				value: _value,
				language: _language,
				automaticLayout: true,
				readOnly: false,
				theme: _theme
			});

			if (_exeFun != null)
				_exeFun(editor, _value);
		});




	}
	// static async TSToJS(_source) {
	// 	const patchImportPaths = (code) => {
	// 		return code.replace(
	// 			/from\s+['"]((?:https?:\/\/|file:\/\/)[^'"]+)['"]/g,
	// 			(match, path) => {
	// 				// 이미 .js/.ts/.json/.mjs 가 붙어 있으면 그대로 반환
	// 				if (/\.(js|ts|json|mjs)$/.test(path)) {
	// 					return match;
	// 				}
	// 				// 경로 부분만 .js 확장자 추가
	// 				return match.replace(path, `${path}.js`);
	// 			}
	// 		);
	// 	};

	// 	// 1. typescript.js가 로드되어 있는지 확인
	// 	if (window["ts"]==null || window["ts"].transpileModule==null) 
	// 	{
	// 		if (!gTSLoaded) {
	// 			gTSLoaded = true;

	// 			await new Promise((resolve, reject) => {
	// 				const script = document.createElement("script");
	// 				script.src = CPath.PHPC() + "artgine/external/legacy/typescript.js";
	// 				script.onload = resolve;
	// 				script.onerror = reject;
	// 				document.head.appendChild(script);
	// 			});
	// 		} else {
	// 			// 로딩 중인 경우 잠깐 기다리기
	// 			//await new Promise(r => setTimeout(r, 100));
	// 			await CChecker.Exe(async ()=>{
	// 				if(window["ts"]!=null && window["ts"].transpileModule!=null)
	// 					return false;
	// 				return true;
	// 			});
	// 		}
	// 	}

	// 	// 2. ts → js 변환
	// 	const jsCode = window["ts"].transpileModule(_source, {
	// 		compilerOptions: { 
	// 			module: window["ts"].ModuleKind.ESNext,
	// 			target: window["ts"].ScriptTarget.ES2020,           // 또는 ES2015 이상으로 올리기
	// 			downlevelIteration: true,              // ★ 중요
	// 			lib: ["es2015", "dom"]                 // Map/Iterator 타입 인식
	// 		}
	// 	}).outputText;

	// 	// 3. import 경로 확장자 자동 패치
	// 	return patchImportPaths(jsCode);
	// }
	static async TSToJS(_source: string): Promise<string> {
		const patchImportPaths = (code: string) => {
			return code.replace(
				/from\s+['"]([^'"]+)['"]/g,
				(match, path) => {
					// 이미 확장자가 있으면 그대로
					if (/\.(js|ts|json|mjs)$/.test(path)) {
						return match;
					}

					// Windows 절대경로 (E:/... 형태) → file:///E:/...js 로 변환
					if (/^[A-Za-z]:[\\/]/.test(path)) {
						const fixedPath = `file:///${path.replace(/\\/g, '/')}.js`;
						return match.replace(path, fixedPath);
					}

					// 기존: http/https/file:// 경로에 .js 추가
					if (/^(https?:\/\/|file:\/\/)/.test(path)) {
						return match.replace(path, `${path}.js`);
					}

					return match;
				}
			);
		};

		const transpileOptions = {
			compilerOptions: {
				module: 99,  // ESNext
				target: 7,   // ES2020
				downlevelIteration: true,
				lib: ["es2015", "dom"]
			}
		};

		// Node.js 환경
		if (CUtil.IsNode()) {
			const ts = (await import('typescript')).default;
			const jsCode = ts.transpileModule(_source, {
				compilerOptions: {
					module: ts.ModuleKind.ESNext,
					target: ts.ScriptTarget.ES2020,
					downlevelIteration: true,
				}
			}).outputText;
			return patchImportPaths(jsCode);
		}

		// 브라우저 환경 - typescript.js 로드 확인
		if (window["ts"] == null || window["ts"].transpileModule == null) {
			if (!gTSLoaded) {
				gTSLoaded = true;
				await new Promise((resolve, reject) => {
					const script = document.createElement("script");
					script.src = CPath.PHPC() + "artgine/external/legacy/typescript.js";
					script.onload = resolve;
					script.onerror = reject;
					document.head.appendChild(script);
				});
			} else {
				await CChecker.Exe(async () => {
					if (window["ts"] != null && window["ts"].transpileModule != null)
						return false;
					return true;
				});
			}
		}

		const jsCode = window["ts"].transpileModule(_source, {
			compilerOptions: {
				module: window["ts"].ModuleKind.ESNext,
				target: window["ts"].ScriptTarget.ES2020,
				downlevelIteration: true,
				lib: ["es2015", "dom"]
			}
		}).outputText;

		return patchImportPaths(jsCode);
	}
	static async MDReader(_urlOrText : string) {
		// ---------- root & scope ----------
		const root = CDOM.DataToDom(null);
		const scopeClass = `mdr-scope-${Math.random().toString(36).slice(2)}`;
		root.classList.add(scopeClass); // 필요하면 'markdown-body'도 추가 가능

		// ---------- 스타일 주입 (host = ShadowRoot or document.head) ----------
		const getStyleHost = (node) => {
			const rn = node?.getRootNode?.();
			return (rn && rn instanceof ShadowRoot) ? rn : document.head;
		};
		const upsertStyle = (id, css, host) => {
			let el = host.querySelector?.(`#${id}`);
			if (!el) { el = document.createElement('style'); el.id = id; host.appendChild(el); }
			el.textContent = css;
		};
		const host = getStyleHost(root);

		// (1) 헤딩 밑줄/HR — 스코프 프리픽스
		upsertStyle(`mdr-style-1-${scopeClass}`, `
    .${scopeClass} h1, .${scopeClass} h2 {
      padding-bottom: .3em;
      border-bottom: 1px solid #d0d7de;
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    .${scopeClass} hr {
      height: 0;
      border: 0;
      border-top: 1px solid #d0d7de;
      margin: 24px 0;
    }
  `, host);

		// (2) 코드/인라인코드 — 스코프 프리픽스 + .hljs 유무 무관하게 적용
upsertStyle(`mdr-style-2-${scopeClass}`, `
  .${scopeClass} pre > code,
  .${scopeClass} pre > code.hljs {
    display: block;
    background: #f6f8fa !important; /* 원하는 색 */
    padding: 12px !important;
    border-radius: 8px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.05);
  }
  .${scopeClass} :not(pre) > code {
    background: #f6f8fa;
    padding: .2em .4em;
    border-radius: 4px;
  }

  /* ▼▼ 텍스트 선택 강제 허용 (중요) ▼▼ */
  .${scopeClass} pre,
  .${scopeClass} code,
  .${scopeClass} .hljs,
  .${scopeClass} .hljs * {
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    user-select: text !important;
  }
  .${scopeClass} pre,
  .${scopeClass} code,
  .${scopeClass} .hljs {
    cursor: text;
  }
`, host);
			
		// (3) 블록쿼트 — 스코프 프리픽스
		upsertStyle(`mdr-style-3-${scopeClass}`, `
    .${scopeClass} blockquote {
      margin: 1em 0;
      padding: 0.6em 1em;
      color: #57606a;
      border-left: 0.25em solid #d0d7de;
      background: #f8f9fb;
      border-radius: 6px;
    }
    .${scopeClass} blockquote > :first-child { margin-top: 0; }
    .${scopeClass} blockquote > :last-child  { margin-bottom: 0; }
    .${scopeClass} blockquote pre > code,
    .${scopeClass} blockquote pre > code.hljs {
      background: #eef2ff !important;
      border-radius: 8px;
      padding: 12px;
	  
    }
  `, host);
			CPath.PHPC()
		// ---------- 동적 import ----------
		const { marked } = await import('../external/esnext/md/marked.esm.js');
		const hljs = (await import('../external/esnext/md/highlight.min.js')).default;
		const javascript = (await import('../external/esnext/md/javascript.min.js')).default;
		const typescript = (await import('../external/esnext/md/typescript.min.js')).default;
		hljs.registerLanguage('javascript', javascript);
		hljs.registerLanguage('typescript', typescript);

		marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: true });

		// ---------- MD -> HTML ----------
		let buf=null;
		let md="";
		let ext=CString.ExtCut(_urlOrText);
		if(ext.ext=="md")
		{
			buf = await CFile.Load(_urlOrText);
			if (!buf) return root;
			md = CUtil.ArrayToString(buf);
		}
		else
			md=_urlOrText;
		
		
		const rawHtml = marked.parse(md, { xhtml: false });
		root.innerHTML = rawHtml;

		// ---------- 하이라이트: "root 내부만" 처리 ----------
		root.querySelectorAll('pre code').forEach(block => {
			hljs.highlightElement(block);
			block.classList.add('hljs'); // 선택자 매칭 보강
		});

		// ---------- 외부 링크 새탭 ----------
		root.querySelectorAll('a[href^="http"]').forEach(a => {
			a.setAttribute('target', '_blank');
			a.setAttribute('rel', 'noopener');
		});

		root.querySelectorAll('img, video, canvas, svg').forEach(el => {
			// 기본: CSS로 해결
			el.style.maxWidth = '100%';
			el.style.height = 'auto';
		});

		{
			const GH_BASE_NO_SLASH = "https://06fs4dix.github.io/Artgine";
			const GH_BASE = GH_BASE_NO_SLASH + "/";
			const LOCAL_BASE_RAW = CPath.PHPC();
			// LOCAL_BASE: 끝이 항상 "/"가 되도록 보정
			const LOCAL_BASE = LOCAL_BASE_RAW.endsWith("/") ? LOCAL_BASE_RAW : (LOCAL_BASE_RAW + "/");

			root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(a => {
				const href = a.getAttribute('href') ?? "";

				// 1) 정확히 GH_BASE로 시작하는 경우
				if (href.startsWith(GH_BASE)) {
				const rest = href.slice(GH_BASE.length); // query/hash 포함
				a.setAttribute('href', LOCAL_BASE + rest.replace(/^\/+/, "")); // 중복 "/" 방지
				return;
				}

				// 2) 끝 슬래시 없이 "…/Artgine"로 시작하는 경우도 안전 처리
				if (href.startsWith(GH_BASE_NO_SLASH)) {
				const rest = href.slice(GH_BASE_NO_SLASH.length);
				a.setAttribute('href', LOCAL_BASE + rest.replace(/^\/+/, ""));
				return;
				}
			});
		}

		return root;
	}


}

let gTSLoaded = false;
