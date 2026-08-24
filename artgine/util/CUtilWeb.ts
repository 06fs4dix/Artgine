import { CAlert } from "../basic/CAlert.js";
import { CConfirm } from "../basic/CModal.js";
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

/** CUtilWeb.SheetEditor가 다루는 시트 배열(JSON) 형태. rows[0]=헤더, rows[1..]=데이터 */
export type CSheetData = { name: string, rows: any[][] }[];

export class CUtilWeb {
	private static mNotifPool: Set<Notification> = new Set();

	/**
	 * Monaco 지원 확장자(소문자, 점 없음) → 언어 ID.
	 * File Manager / Editor / CFileViewer 등에서 공통으로 참조한다.
	 * 문법 강조(Monarch) 기준. TS 언어 서비스는 typescript일 때만 MonacoEditer 내부에서 별도 처리.
	 */
	static sMonacoExtToLang: Record<string, string> = {
		// TypeScript / JavaScript / JSON / HTML / WGSL
		ts: "typescript", tsx: "typescript", cts: "typescript", mts: "typescript",
		js: "javascript", es6: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
		json: "json",
		html: "html", htm: "html", shtml: "html", xhtml: "html", mdoc: "html", jsp: "html",
		asp: "html", aspx: "html", jshtm: "html",
		wgsl: "wgsl",

		// C / C++ (c·h → c, 나머지 → cpp)
		c: "c", h: "c",
		cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", hh: "cpp", hxx: "cpp",

		// 주요 언어
		java: "java", jav: "java",
		cs: "csharp", csx: "csharp", cake: "csharp",
		py: "python", rpy: "python", pyw: "python", cpy: "python", gyp: "python", gypi: "python",
		go: "go",
		rs: "rust", rlib: "rust",
		php: "php", php4: "php", php5: "php", phtml: "php", ctp: "php",
		rb: "ruby", rbx: "ruby", rjs: "ruby", gemspec: "ruby",
		kt: "kotlin", kts: "kotlin",
		swift: "swift",
		lua: "lua",
		pl: "perl", pm: "perl",
		r: "r", rhistory: "r", rmd: "r", rprofile: "r", rt: "r",
		dart: "dart",
		scala: "scala", sc: "scala", sbt: "scala",
		fs: "fsharp", fsi: "fsharp", ml: "fsharp", mli: "fsharp", fsx: "fsharp", fsscript: "fsharp",
		vb: "vb",
		m: "objective-c",

		// 셸 / 배치 / 파워셸
		sh: "shell", bash: "shell",
		bat: "bat", cmd: "bat",
		ps1: "powershell", psm1: "powershell", psd1: "powershell",

		// 웹 / 마크업 / 스타일
		css: "css",
		scss: "scss",
		less: "less",
		md: "markdown", markdown: "markdown", mdown: "markdown", mkdn: "markdown",
		mkd: "markdown", mdwn: "markdown", mdtxt: "markdown", mdtext: "markdown",
		mdx: "mdx",
		xml: "xml", xsd: "xml", dtd: "xml", ascx: "xml", csproj: "xml", config: "xml",
		props: "xml", targets: "xml", wxi: "xml", wxl: "xml", wxs: "xml", xaml: "xml",
		svg: "xml", svgz: "xml", opf: "xml", xslt: "xml", xsl: "xml",
		yaml: "yaml", yml: "yaml",
		handlebars: "handlebars", hbs: "handlebars",
		twig: "twig",
		liquid: "liquid",
		pug: "pug", jade: "pug",
		razor: "razor", cshtml: "razor",

		// 데이터 / 쿼리 / 설정
		sql: "sql",
		graphql: "graphql", gql: "graphql",
		cypher: "cypher", cyp: "cypher",
		sparql: "sparql", rq: "sparql",
		redis: "redis",
		ini: "ini", properties: "ini", gitconfig: "ini",
		hcl: "hcl", tf: "hcl", tfvars: "hcl",
		proto: "proto",
		bicep: "bicep",

		// 기타 언어
		abap: "abap",
		cls: "apex",
		azcli: "azcli",
		mligo: "cameligo",
		clj: "clojure", cljs: "clojure", cljc: "clojure", edn: "clojure",
		coffee: "coffeescript",
		csp: "csp",
		dockerfile: "dockerfile",
		ecl: "ecl",
		ex: "elixir", exs: "elixir",
		flow: "flow9",
		ftl: "freemarker2", ftlh: "freemarker2", ftlx: "freemarker2",
		jl: "julia",
		lex: "lexon",
		m3: "m3", i3: "m3", mg: "m3", ig: "m3",
		s: "mips",
		dax: "msdax", msdax: "msdax",
		pas: "pascal", p: "pascal", pp: "pascal",
		ligo: "pascaligo",
		pla: "pla",
		dats: "postiats", sats: "postiats", hats: "postiats",
		pq: "powerquery", pqm: "powerquery",
		qs: "qsharp",
		rst: "restructuredtext",
		sb: "sb",
		scm: "scheme", ss: "scheme", sch: "scheme", rkt: "scheme",
		sol: "sol",
		aes: "aes",
		st: "st", iecst: "st", iecplc: "st", lc3lib: "st", tcpou: "st", tcdut: "st", tcgvl: "st", tcio: "st",
		sv: "systemverilog", svh: "systemverilog",
		v: "verilog", vh: "verilog",
		tcl: "tcl",
		tsp: "typespec",
		// 일반 텍스트도 코드 에디터로 연다
		txt: "plaintext",
	};
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
		return window.open(CPath.WebRootUrl() + "lib/artgine/Window.html", _title, "width=" + _width + ",height" + _height + "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes");
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
	// 프로젝트에서 실제로 import하는 Node 내장 모듈만 화이트리스트로 등록(전체 @types/node는 2.5MB라 무겁다).
	// 값은 node_modules/@types/node/ 기준 상대 경로. 파일 자체가 declare module "모듈명" 형태의 ambient
	// 선언이라 어떤 가상 경로로 등록하든 import 해석에 문제없다(참조 체인도 없음).
	private static sNodeBuiltinTypeFiles: Record<string, string> = {
		fs: "fs.d.ts",
		"fs/promises": "fs/promises.d.ts",
		path: "path.d.ts",
		os: "os.d.ts",
		http: "http.d.ts",
		https: "https.d.ts",
		net: "net.d.ts",
		tls: "tls.d.ts",
		child_process: "child_process.d.ts",
		crypto: "crypto.d.ts",
		stream: "stream.d.ts",
		util: "util.d.ts",
		url: "url.d.ts",
		worker_threads: "worker_threads.d.ts",
		events: "events.d.ts",
		buffer: "buffer.d.ts",
	};
	// Node 모듈을 하나라도 쓰면 같이 필요한 전역 선언(NodeJS 네임스페이스, process, Buffer 등).
	private static sNodeBaseTypeFiles: string[] = ["globals.d.ts", "globals.typedarray.d.ts", "buffer.buffer.d.ts", "process.d.ts"];
	// 페이지 생애주기 동안 한 번만 로드하도록 하는 캐시(에디터를 여러 번 열어도 중복 addExtraLib 안 함).
	private static mNodeTypesLoaded: Set<string> = new Set();

	private static async LoadNodeTypeFile(_relPath: string) {
		if (CUtilWeb.mNodeTypesLoaded.has(_relPath)) return;
		CUtilWeb.mNodeTypesLoaded.add(_relPath);
		const uri = "node_modules/@types/node/" + _relPath;
		const buf = await CFile.Load(CPath.WebRootUrl().replace(/\/$/, "") + "/" + uri);
		if (buf == null) return;
		window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(CUtil.ArrayToString(buf), "file:///" + uri);
	}

	/** _module: "fs", "node:fs" 등. 화이트리스트에 없으면 아무것도 하지 않는다. */
	static async LoadNodeBuiltinTypes(_module: string) {
		const name = _module.replace(/^node:/, "");
		const relPath = CUtilWeb.sNodeBuiltinTypeFiles[name];
		if (relPath == null) return;
		if (CUtilWeb.mNodeTypesLoaded.size == 0) {
			for (const f of CUtilWeb.sNodeBaseTypeFiles) await CUtilWeb.LoadNodeTypeFile(f);
		}
		await CUtilWeb.LoadNodeTypeFile(relPath);
	}

	// _rewriteSource=false면 소스 텍스트(상대경로 import문)는 그대로 두고 extra lib만 등록한다.
	// MonacoEditer가 실제 파일 URI로 모델을 만들 때 쓰는 모드 - TS가 상대경로를 스스로 해석하므로
	// 화면/저장 시 원본 소스가 그대로 보존된다.
	static async TSImport(_source: string, _monaco = true, _github = false, _filePath: string = null, _rewriteSource = true, _visited: Set<string> = new Set()) {
		let importPathArr = ExtractImportPaths(_source, false);
		const fileDir = CString.PathSub(_filePath ?? CPath.FullPath());
		const rootBase = (_github ? "https://06fs4dix.github.io/Artgine" : CPath.WebRootUrl()).replace(/\/$/, "");
		// 워킹 루트와 아티젠 엔진 루트가 다른 프로젝트(엔진이 서브폴더로 중첩된 구조) 대응.
		// artgine/desktop/plugin/ai는 항상 엔진 실제 위치(WebRootArtgineUrl) 기준으로 해석한다.
		const engineBase = (_github ? "https://06fs4dix.github.io/Artgine" : CPath.WebRootArtgineUrl()).replace(/\/$/, "");
		const engineRoots = ["artgine/", "desktop/", "plugin/", "ai/"];
		const PickBase = (_path: string) => engineRoots.some(r => _path.startsWith(r)) ? engineBase : rootBase;

		const processedPaths = new Map<string, string>();

		for (let i = 0; i < importPathArr.length; ++i) {
			const originalPath = importPathArr[i];
			if (processedPaths.has(originalPath)) continue;

			// Node 내장 모듈(fs, path 등)은 프로젝트 경로가 아니므로 URL로 치환하지 않고
			// @types/node에서 타입만 등록한다. 화이트리스트에 없는 모듈은 그대로 기존 로직으로 흘려보낸다.
			if (_monaco && window["require"] != null && CUtilWeb.sNodeBuiltinTypeFiles[originalPath.replace(/^node:/, "")] != null) {
				processedPaths.set(originalPath, originalPath);
				await CUtilWeb.LoadNodeBuiltinTypes(originalPath);
				continue;
			}

			// 이미 HTTP URL이면 스킵
			if (/^https?:\/\//.test(originalPath) || /^file:\/\/\//.test(originalPath)) {
				processedPaths.set(originalPath, originalPath);
				continue;
			}

			let path = originalPath;

			// Windows 절대경로(E:/...) → 프로젝트 루트 기준 상대경로로 변환 후 rootBase HTTP URL로 처리
			if (/^[A-Za-z]:[\\/]/.test(path)) {
				const normalized = path.replace(/\\/g, '/');
				const knownRoots = ['/artgine/', '/proj/', '/plugin/', '/desktop/'];
				let found = false;
				for (const root of knownRoots) {
					const idx = normalized.indexOf(root);
					if (idx !== -1) {
						path = normalized.substring(idx + 1);
						found = true;
						break;
					}
				}
				if (!found) {
					processedPaths.set(originalPath, originalPath);
					continue;
				}
			}

			const hadJsExt = _monaco && path.indexOf(".js") !== -1;
			if (_monaco) path = CString.ReplaceAll(path, ".js", "");
			else if (path.indexOf(".js") == -1) path += ".js";

			let adjustedFullPath: string;
			// Monaco 모델 URI가 File/Root 프록시("/RootN")를 경유하는 경우, Monaco의 TS 언어 서비스는
			// 실제 fileDir(=모델 URI) 기준으로 "../../../artgine/..."를 그대로 상대 해석한다.
			// 아래 artgine 특수 분기는 항상 엔진의 "진짜" 고정 위치로 재해석하므로, 두 좌표계가 달라지면
			// (즉 fileDir가 rootBase가 아닌 다른 프록시 경로일 때) extraLib을 아무리 정확히 등록해도
			// Monaco가 실제로 찾으려는 키와 어긋나 "Cannot find module"이 뜬다. 이를 위해 별칭 경로를
			// 하나 더 계산해 같은 내용으로 extraLib을 중복 등록해준다(택스트/치환 결과에는 영향 없음).
			let monacoAliasPath: string = null;

			if (path.startsWith("../") || path.startsWith("./")) {
				// 상대경로: 현재 파일 디렉토리 기준
				let count = 0;
				while (path.startsWith("../")) { count++; path = path.substring(3); }
				if (path.startsWith("./")) path = path.substring(2);

				if (_github || path.startsWith("artgine/")) {
					// artgine 경로: ../개수와 무관하게 엔진 루트에서 해석
					adjustedFullPath = PickBase(path) + "/" + path;
					if (!_github) {
						const base = count > 0 ? CString.PathSub(fileDir, count) : fileDir;
						const aliasPath = base + "/" + path;
						if (aliasPath !== adjustedFullPath) monacoAliasPath = aliasPath;
					}
				} else {
					const base = count > 0 ? CString.PathSub(fileDir, count) : fileDir;
					adjustedFullPath = base + "/" + path;
				}
			} else {
				// 프로젝트 루트 절대경로 (artgine/..., plugin/... 등)
				adjustedFullPath = PickBase(path) + "/" + path;
			}

			if (_rewriteSource) _source = _source.replaceAll(originalPath, adjustedFullPath);
			processedPaths.set(originalPath, adjustedFullPath);
			importPathArr[i] = adjustedFullPath;

			if (_monaco && window["require"] != null && !_visited.has(adjustedFullPath)) {
				_visited.add(adjustedFullPath);
				const fName = adjustedFullPath + ".ts";
				const buf = await CFile.Load(fName);
				const libSource = CUtil.ArrayToString(buf);
				window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, fName);
				// 소스를 치환하지 않으면 원본 import문(보통 ".js" 확장자)이 그대로 남으므로,
				// TS가 실제로 찾는 키(확장자 그대로의 절대경로)에도 동일 내용을 등록해준다.
				if (!_rewriteSource && hadJsExt) {
					window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, adjustedFullPath + ".js");
				}
				if (monacoAliasPath != null) {
					window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, monacoAliasPath + ".ts");
					if (!_rewriteSource && hadJsExt) {
						window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, monacoAliasPath + ".js");
					}
				}
				// A->B->C처럼 간접 상속/참조되는 파일도 타입을 찾을 수 있도록, 방금 로드한 파일의
				// import도 재귀적으로 처리한다. _visited로 순환 참조/중복 로드를 막는다.
				await CUtilWeb.TSImport(libSource, _monaco, _github, adjustedFullPath, false, _visited);
			}
		}

		return _source;
	}

	/** Monaco/텍스트 소스로 열 수 있는 확장자인지. 언어 ID는 sMonacoExtToLang[ext] ?? "plaintext". */
	static IsMonacoSourceExt(_ext: string): boolean {
		if (!_ext) return false;
		return _ext.toLowerCase() in CUtilWeb.sMonacoExtToLang;
	}

	// _language: Monaco 언어 ID 문자열 (plaintext/json/typescript 등 basic-languages 전체 및 내장 언어 서비스)
	static MonacoEditer(_target: HTMLElement, _value: string, _language: string = "plaintext",
		_theme: "vs" | "vs-dark" = "vs-dark", _exeFun = null, _github = false, _filePath: string = null) {
		if (window["require"] == null) {
			_target.innerHTML = "MonacoEditer not import!";

			return;
		}

		if (gMonaco) {
			(require as any).config({ paths: { vs: CPath.WebRootArtgineUrl() + 'artgine/external/legacy/monaco-editor/min/vs' } });
			gMonaco = false;
		}

		(require as any)(['vs/editor/editor.main'], async function () {
			// 실제 파일 경로(_filePath)를 알면 그 URL을 모델 URI로 써서 TypeScript가 상대경로 import를
			// 스스로 정확히 해석하게 하고, 소스 텍스트는 원본(상대경로) 그대로 둔다(화면/저장 모두 원본 유지).
			// 파일 경로를 모르면(스니펫 등) 예전처럼 소스를 절대경로로 치환해서 억지로 맞춘다.
			const hasFilePath = _language == "typescript" && !!_filePath;
			if (_language == "typescript")
				_value = await CUtilWeb.TSImport(_value, true, _github, _filePath, !hasFilePath);

			_target.innerHTML = "";
			// ✅ JS 파일에 대한 설정
			window["monaco"].languages.typescript.javascriptDefaults.setCompilerOptions({
				allowJs: true,
				checkJs: true,
				//allowNonTsExtensions: true,
				target: window["monaco"].languages.typescript.ScriptTarget.ES2022,
				module: window["monaco"].languages.typescript.ModuleKind.ESNext
			});

			let model = null;
			if (hasFilePath) {
				const uri = window["monaco"].Uri.parse(_filePath);
				model = window["monaco"].editor.getModel(uri);
				if (model) model.setValue(_value);
				else model = window["monaco"].editor.createModel(_value, _language, uri);
			}
			let editor = window["monaco"].editor.create(_target, model ? {
				model,
				automaticLayout: true,
				readOnly: false,
				theme: _theme
			} : {
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

	/**
	 * 시트 배열(JSON)을 테이블로 _target에 렌더링하고, 더블클릭 인라인 편집을 붙인다.
	 * 시트가 2개 이상이면 Bootstrap 탭으로, 1개면 단일 테이블로 렌더링한다.
	 * _editable이 true면 변경이 발생할 때마다 액션 이름과 최소 단위 payload를 _onChange(함수 포인터)로 넘겨준다.
	 * 최초 렌더링 시에는 호출하지 않는다 (호출 측이 이미 원본 데이터를 들고 있음).
	 * CSV/XLSX 파싱 등 1차 가공은 호출 측(예: CSheetViewer)에서 끝내고 CSheetData 형태로 넘겨야 한다.
	 *
	 * _onChange(action, payload)의 action별 payload (row/col은 rows[1..] 기준 0-based 데이터 인덱스):
	 *   update       { sheet, row, col, value }  셀 값 수정
	 *   insert       { sheet, row, values }      row 위치에 새 행 삽입
	 *   delete       { sheet, row }              row 위치의 행 삭제
	 *   alter        { sheet, col, name }        col 위치의 열 이름 변경/신규 추가(헤더 스키마 변경)
	 *   insertSheet  { name, index }             index 위치에 새 시트 추가
	 *   deleteSheet  { name }                    시트 삭제
	 */
	static SheetEditor(_target: HTMLElement, _data: CSheetData,
		_editable: boolean = true,
		_onChange: (_action: string, _payload: any) => void = null): void {

		if (!_data || _data.length === 0) {
			_target.innerHTML = `<div class="p-3 text-muted">데이터가 없습니다.</div>`;
			return;
		}

		if (_data.length === 1) {
			_target.innerHTML = `<div class="overflow-auto h-100" data-sheet-name="${CUtilWeb.SheetEscapeHtml(_data[0].name)}">${CUtilWeb.SheetBuildTable(_data[0].rows)}</div>`;
			if (_editable)
				CUtilWeb.SheetAttachEditMode(_target, _onChange);
			return;
		}

		const uid = 'sheet_' + Math.random().toString(36).slice(2);
		let tabSeq = _data.length;

		const tabsHtml = _data.map((s, i) =>
			`<li class="nav-item" role="presentation">
				<button class="nav-link${i === 0 ? ' active' : ''}"
					id="${uid}_tab_t${i}" type="button" role="tab"
					data-tab-key="t${i}" data-sheet-name="${CUtilWeb.SheetEscapeHtml(s.name)}">
					${CUtilWeb.SheetEscapeHtml(s.name)}
					${_editable ? `<span class="ms-1 text-danger sheet-tab-del" title="시트 삭제">✕</span>` : ''}
				</button>
			</li>`
		).join('');
		const addTabHtml = _editable
			? `<li class="nav-item" role="presentation">
				<button class="nav-link sheet-tab-add" type="button" title="시트 추가">+</button>
			</li>`
			: '';

		const pagesHtml = _data.map((s, i) =>
			`<div class="tab-pane${i === 0 ? ' show active' : ''} overflow-auto"
						style="height:100%"
						id="${uid}_pane_t${i}" data-tab-key="t${i}" data-sheet-name="${CUtilWeb.SheetEscapeHtml(s.name)}" role="tabpanel">
				${CUtilWeb.SheetBuildTable(s.rows)}
			</div>`
		).join('');

		_target.innerHTML = `
			<div class="d-flex flex-column h-100">
				<ul class="nav nav-tabs flex-shrink-0 px-1 pt-1 flex-wrap" role="tablist">
					${tabsHtml}${addTabHtml}
				</ul>
				<div class="tab-content flex-grow-1 overflow-hidden position-relative">
					${pagesHtml}
				</div>
			</div>`;

		const activateTab = (_key: string) => {
			_target.querySelectorAll('.nav-link[data-tab-key]').forEach(b => b.classList.remove('active'));
			_target.querySelectorAll('.tab-pane[data-tab-key]').forEach(p => p.classList.remove('show', 'active'));
			_target.querySelector(`.nav-link[data-tab-key="${_key}"]`)?.classList.add('active');
			_target.querySelector(`.tab-pane[data-tab-key="${_key}"]`)?.classList.add('show', 'active');
		};

		const wireTabButton = (_btn: HTMLElement, _pane: HTMLElement) => {
			_btn.addEventListener('click', (e) => {
				if ((e.target as HTMLElement).closest('.sheet-tab-del')) return;
				activateTab(_btn.dataset.tabKey);
			});
			if (!_editable) return;
			_btn.querySelector('.sheet-tab-del')?.addEventListener('click', (e) => {
				e.stopPropagation();
				if (_target.querySelectorAll('.nav-link[data-tab-key]').length <= 1) return;
				const name = _btn.dataset.sheetName;
				const confirm = new CConfirm();
				confirm.SetBody(`Delete sheet '${CUtilWeb.SheetEscapeHtml(name)}'?`);
				confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
					() => {
						const wasActive = _btn.classList.contains('active');
						_btn.closest('li').remove();
						_pane.remove();
						if (wasActive) {
							const remain = _target.querySelector('.nav-link[data-tab-key]') as HTMLElement;
							if (remain) activateTab(remain.dataset.tabKey);
						}
						_onChange?.('deleteSheet', { name });
					},
					() => {},
				], ["Delete", "Cancel"]);
				confirm.Open();
			});
		};

		_target.querySelectorAll<HTMLElement>('.nav-link[data-tab-key]').forEach(btn => {
			const pane = _target.querySelector(`.tab-pane[data-tab-key="${btn.dataset.tabKey}"]`) as HTMLElement;
			wireTabButton(btn, pane);
		});

		if (_editable) {
			const addTabBtn = _target.querySelector('.sheet-tab-add') as HTMLElement;
			addTabBtn?.addEventListener('click', () => {
				const name = window.prompt('새 시트 이름을 입력하세요');
				if (!name || !name.trim()) return;

				const index = _target.querySelectorAll('.nav-link[data-tab-key]').length;
				const key = 't' + (tabSeq++);

				const li = document.createElement('li');
				li.className = 'nav-item';
				li.setAttribute('role', 'presentation');
				li.innerHTML = `<button class="nav-link" id="${uid}_tab_${key}" type="button" role="tab"
					data-tab-key="${key}" data-sheet-name="${CUtilWeb.SheetEscapeHtml(name)}">
					${CUtilWeb.SheetEscapeHtml(name)}<span class="ms-1 text-danger sheet-tab-del" title="시트 삭제">✕</span>
				</button>`;
				addTabBtn.closest('li').before(li);

				const pane = document.createElement('div');
				pane.className = 'tab-pane overflow-auto';
				pane.style.height = '100%';
				pane.id = `${uid}_pane_${key}`;
				pane.dataset.tabKey = key;
				pane.dataset.sheetName = name;
				pane.setAttribute('role', 'tabpanel');
				pane.innerHTML = CUtilWeb.SheetBuildTable([['']]);
				_target.querySelector('.tab-content').appendChild(pane);

				const newBtn = li.querySelector('.nav-link[data-tab-key]') as HTMLElement;
				wireTabButton(newBtn, pane);

				activateTab(key);
				_onChange?.('insertSheet', { name, index });
			});
		}

		if (_editable)
			CUtilWeb.SheetAttachEditMode(_target, _onChange);
	}

	/** rows[0] = 헤더, rows[1..] = 데이터 */
	private static SheetBuildTable(rows: any[][]): string {
		if (!rows || rows.length === 0)
			return `<div class="p-3 text-muted">데이터가 없습니다.</div>`;

		const colCount = Math.max(...rows.map(r => r.length));

		// 각 열의 최대 문자 길이 계산
		const maxLens: number[] = new Array(colCount).fill(0);
		for (const row of rows)
			for (let c = 0; c < row.length; c++) {
				const len = String(row[c] ?? '').length;
				if (len > maxLens[c]) maxLens[c] = len;
			}

		// 문자 길이 → 픽셀, 맨 끝 액션 열(헤더=열추가, 데이터행=삭제, 마지막행=행추가)은 44px 고정
		const widths = [
			...maxLens.map(l => Math.max(40, l * 8 + 16)),
			44
		];
		const colsHtml = widths.map(w => `<col style="width:${w}px">`).join('');

		const colAddTh = `<th class="px-1 text-center text-white-50 sheet-col-add" title="더블클릭하여 열 추가">+</th>`;
		const delBtnTd = `<td class="px-1 text-center"><button type="button" class="btn btn-sm btn-outline-danger py-0 px-1 sheet-row-del">✕</button></td>`;

		let html = `<table class="table table-sm table-bordered table-hover table-striped mb-0"
			style="font-size:0.85em;white-space:nowrap;table-layout:fixed;width:auto">
			<colgroup>${colsHtml}</colgroup>
			<thead class="table-dark sticky-top">
				<tr>${rows[0].map(c => `<th class="px-2">${CUtilWeb.SheetEscapeHtml(String(c ?? ''))}</th>`).join('')}${colAddTh}</tr>
			</thead>
			<tbody>`;

		for (let i = 1; i < rows.length; i++)
			html += `<tr>${rows[i].map((c: any) => `<td class="px-2">${CUtilWeb.SheetEscapeHtml(String(c ?? ''))}</td>`).join('')}${delBtnTd}</tr>`;

		// 맨 아래 Add 전용 placeholder 행 (읽기 시 데이터에서 제외됨)
		const blankCells = new Array(colCount).fill(`<td class="px-2"></td>`).join('');
		html += `<tr class="sheet-row-add-placeholder">${blankCells}<td class="px-1 text-center"><button type="button" class="btn btn-sm btn-outline-primary py-0 px-1 sheet-row-add">+</button></td></tr>`;

		html += `</tbody></table>`;
		return html;
	}

	/** 셀/행이 속한 시트 이름을 가장 가까운 [data-sheet-name] 조상에서 읽어온다. */
	private static SheetNameOf(_el: Element): string {
		return _el.closest('[data-sheet-name]')?.getAttribute('data-sheet-name') ?? '';
	}

	/** 맨 아래 Add placeholder 행(_tr)을 실제 데이터 행으로 전환하고 그 아래에 새 placeholder 행을 추가한 뒤 insert 이벤트를 전파한다. */
	private static SheetConvertAddRow(_tr: HTMLElement, _onChange: (_action: string, _payload: any) => void = null): void {
		const actionTd = _tr.querySelector('td:last-child');
		if (actionTd) actionTd.innerHTML = `<button type="button" class="btn btn-sm btn-outline-danger py-0 px-1 sheet-row-del">✕</button>`;
		_tr.classList.remove('sheet-row-add-placeholder');

		const dataCellCount = _tr.querySelectorAll('td').length - 1;
		const blankCells = new Array(dataCellCount).fill(`<td class="px-2"></td>`).join('');
		const newRow = document.createElement('tr');
		newRow.className = 'sheet-row-add-placeholder';
		newRow.innerHTML = `${blankCells}<td class="px-1 text-center"><button type="button" class="btn btn-sm btn-outline-primary py-0 px-1 sheet-row-add">+</button></td>`;
		_tr.after(newRow);

		const tbody = _tr.closest('tbody');
		const row = Array.from(tbody.querySelectorAll('tr:not(.sheet-row-add-placeholder)')).indexOf(_tr);
		const sheet = CUtilWeb.SheetNameOf(_tr);
		_onChange?.('insert', { sheet, row, values: new Array(dataCellCount).fill('') });
	}

	/**
	 * tbody/thead 셀 더블클릭 → 인라인 편집. 행 끝의 Delete/Add 버튼 클릭도 함께 처리.
	 * 변경이 발생할 때마다(update/insert/delete/alter) _onChange(action, payload)를 호출한다.
	 */
	private static SheetAttachEditMode(_container: HTMLElement, _onChange: (_action: string, _payload: any) => void = null): void {
		_container.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;

			const delBtn = target.closest('.sheet-row-del');
			if (delBtn) {
				const tr = delBtn.closest('tr');
				const tbody = tr.closest('tbody');
				const row = Array.from(tbody.querySelectorAll('tr:not(.sheet-row-add-placeholder)')).indexOf(tr);
				const sheet = CUtilWeb.SheetNameOf(tr);
				const confirm = new CConfirm();
				confirm.SetBody("Delete this row?");
				confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
					() => {
						tr.remove();
						_onChange?.('delete', { sheet, row });
					},
					() => {},
				], ["Delete", "Cancel"]);
				confirm.Open();
				return;
			}

			const addBtn = target.closest('.sheet-row-add');
			if (addBtn) {
				const tr = addBtn.closest('tr');
				if (tr) CUtilWeb.SheetConvertAddRow(tr, _onChange);
			}
		});

		_container.addEventListener('dblclick', (e) => {
			const target = e.target as HTMLElement;
			if (target.closest('.sheet-row-del, .sheet-row-add')) return;

			const td = target.closest('td, th');
			if (!td || td.querySelector('.sheet-row-del, .sheet-row-add')) return;

			const placeholderTr = td.closest('tr');
			if (placeholderTr?.classList.contains('sheet-row-add-placeholder')) {
				// 추가행의 빈 셀을 바로 더블클릭한 경우: 먼저 실제 행으로 전환한 뒤 같은 위치 셀 편집을 이어간다.
				const colIndex = Array.from(placeholderTr.children).indexOf(td);
				CUtilWeb.SheetConvertAddRow(placeholderTr, _onChange);
				const newTd = placeholderTr.children[colIndex] as HTMLElement;
				newTd?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
				return;
			}

			const isColAdd = td.classList.contains('sheet-col-add');
			const isHeader = td.tagName === 'TH';
			const original = isColAdd ? '' : (td.textContent ?? '');
			let committed = false;

			td.innerHTML = '';
			const input = document.createElement('input');
			input.type = 'text';
			input.className = 'form-control form-control-sm p-0 px-1 border-0';
			input.style.cssText = 'width:100%;min-width:60px;font-size:inherit;';
			input.value = original;
			td.appendChild(input);
			input.focus();
			input.select();

			const commit = () => {
				if (committed) return;
				committed = true;
				const sheet = CUtilWeb.SheetNameOf(td);
				const col = Array.from(td.parentElement.children).indexOf(td);

				if (isColAdd) {
					if (input.value.trim() === '') { td.innerHTML = '+'; return; }
					CUtilWeb.SheetAddColumn(td as HTMLElement, input.value);
					_onChange?.('alter', { sheet, col, name: input.value });
					return;
				}
				td.innerHTML = CUtilWeb.SheetEscapeHtml(input.value);
				if (isHeader)
					_onChange?.('alter', { sheet, col, name: input.value });
				else {
					const tbody = td.closest('tbody');
					const row = Array.from(tbody.querySelectorAll('tr:not(.sheet-row-add-placeholder)')).indexOf(td.closest('tr'));
					_onChange?.('update', { sheet, row, col, value: input.value });
				}
			};
			const cancel = () => {
				if (committed) return;
				committed = true;
				td.innerHTML = isColAdd ? '+' : CUtilWeb.SheetEscapeHtml(original);
			};

			input.addEventListener('blur', commit);
			input.addEventListener('keydown', (ke) => {
				if (ke.key === 'Enter')  { ke.preventDefault(); commit(); }
				if (ke.key === 'Escape') { ke.preventDefault(); cancel(); input.blur(); }
				if (ke.key === 'Tab') {
					ke.preventDefault();
					commit();
					const cells = Array.from(td.closest('table')?.querySelectorAll('td, th') ?? []);
					const next = cells[cells.indexOf(td as HTMLElement) + (ke.shiftKey ? -1 : 1)] as HTMLElement;
					if (next) next.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
				}
			});
		});
	}

	/**
	 * 액션 열의 헤더 칸(+)에 입력된 이름으로 새 데이터 열을 그 앞에 삽입한다.
	 * 액션 열 자체(헤더=+, 데이터행=삭제버튼, 마지막행=추가버튼)는 그대로 유지되어 다음 열 추가에도 재사용된다.
	 */
	private static SheetAddColumn(_actionTh: HTMLElement, _name: string): void {
		const table = _actionTh.closest('table');
		const headerRow = _actionTh.closest('tr');
		if (!table || !headerRow) { _actionTh.innerHTML = '+'; return; }

		const cellIndex = Array.from(headerRow.children).indexOf(_actionTh);

		const newTh = document.createElement('th');
		newTh.className = 'px-2';
		newTh.textContent = _name;
		_actionTh.before(newTh);
		_actionTh.innerHTML = '+';

		table.querySelectorAll('tbody tr').forEach(tr => {
			const refCell = tr.children[cellIndex] as HTMLElement;
			const newTd = document.createElement('td');
			newTd.className = 'px-2';
			if (refCell) refCell.before(newTd);
			else tr.appendChild(newTd);
		});

		const colgroup = table.querySelector('colgroup');
		if (colgroup) {
			const refCol = colgroup.children[cellIndex] as HTMLElement;
			const newCol = document.createElement('col');
			newCol.style.width = '80px';
			if (refCol) refCol.before(newCol);
			else colgroup.appendChild(newCol);
		}
	}

	private static SheetEscapeHtml(_str: string): string {
		return _str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
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
					script.src = CPath.WebRootArtgineUrl() + "artgine/external/legacy/typescript.js";
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
			CPath.WebRootUrl()
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
			const LOCAL_BASE_RAW = CPath.WebRootUrl();
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

	static QRCode(_text: string, _size: number = 256): Promise<string> {
		return new Promise((resolve, reject) => {
			(window as any).QRCode.toDataURL(_text, { width: _size, margin: 1 }, (err, url) => {
				if (err) reject(err);
				else resolve(url);
			});
		});
	}

}

let gTSLoaded = false;
