import { CAlert } from "../basic/CAlert.js";
import {CPath} from "../basic/CPath.js";
import { CFile } from "../system/CFile.js";


var gMonaco=true;
export class CUtilWeb
{
	static ToastUI(_html : HTMLElement,_height=400)
	{
		if(window["toastui"]==null)
		{
			CAlert.W("toastui not import!");
			return null;
		}
		const editor = new window["toastui"].Editor({
			el: _html,
			height: _height+'px',
			initialEditType: 'wysiwyg',
			previewStyle: 'vertical'
		});
		return editor;
	}
	static Window(_title="Window",_width=640,_height=480)
	{
		return window.open(CPath.PHPC()+"lib/artgine/Window.html", _title, "width="+_width+",height"+_height+"toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes"); 
	}
	static Parameter(_name,_value=null) 
	{
		var source=window['g_requestParameter'];
		if(source==null)	source=location.search;
		_name = _name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		var regex = new RegExp("[\\?&]" + _name + "=([^&#]*)"),
		results = regex.exec(source);
		return results == null ? _value : decodeURIComponent(results[1].replace(/\+/g, " "));
	}
    static PageReload()
	{
		location.reload();
	}
	static PageCall(_link,_keyArr=new Array(),_valueArr=new Array(),_post=true)
    {
		 var form = document.createElement("form");
	    form.setAttribute("charset", "UTF-8");
	    form.setAttribute("method", _post?"Post":"Get");
	    form.setAttribute("action", _link);
	    
	    for(var i=0;i<_keyArr.length;++i)
	    {
			var hiddenField = document.createElement("input");
		    hiddenField.setAttribute("type", "hidden");
		    hiddenField.setAttribute("name", _keyArr[i]);
		    hiddenField.setAttribute("value", _valueArr[i]);
		    form.appendChild(hiddenField);	
		}
		document.body.appendChild(form);
    	form.submit();
	    
	}
    static PageBack()
	{
		window.history.back();
	}
	// value: 'console.log("Hello!");',
    //   language: 'javascript',
    //   theme: 'vs-dark'
	static MonacoEditer(_target : HTMLElement,_value : string,_language : "plaintext"|"json"|"typescript"|"javascript"|"wgsl"|"html"="plaintext",
		_theme : "vs"|"vs-dark"="vs-dark",_addExtraLib=null)
	{
		if(window["require"]==null)
		{
			_target.innerHTML="MonacoEditer not import!";

			return;
		}
		_target.innerHTML="";
		if(gMonaco)
		{
			require.config({ paths: { vs: CPath.PHPC()+'/artgine/external/legacy/monaco-editor/min/vs' } });
			gMonaco=false;
		}


		
		require(['vs/editor/editor.main'], function () {
			 // ✅ JS 파일에 대한 설정
			monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
				allowJs: true,
				checkJs: true,
				//allowNonTsExtensions: true,
				target: monaco.languages.typescript.ScriptTarget.ES2022,
				module: monaco.languages.typescript.ModuleKind.ESNext
			});
			let editor=monaco.editor.create(_target, {
				value: _value,
				language: _language,
				automaticLayout: true,
				readOnly: false,
				theme: _theme
			});
			if(_addExtraLib!=null)
				_addExtraLib(editor);

			


			// setTimeout(() => {
			// 	editor.getAction('editor.action.formatDocument').run();
			// }, 1000);

			// let once = editor.onDidLayoutChange(() => {
			// 	editor.getAction('editor.action.formatDocument')?.run();
			// 	once.dispose(); // 이벤트 한 번만 실행되도록 정리
			// });
		});

	}
	static async TSToJS(_source) {
		const patchImportPaths = (code) => {
			return code.replace(
				/from\s+['"]((?:https?:\/\/|file:\/\/)[^'"]+)['"]/g,
				(match, path) => {
				// 이미 .js/.ts/.json/.mjs 가 붙어 있으면 그대로 반환
				if (/\.(js|ts|json|mjs)$/.test(path)) {
					return match;
				}
				// 경로 부분만 .js 확장자 추가
				return match.replace(path, `${path}.js`);
				}
			);
		};

		// 1. typescript.js가 로드되어 있는지 확인
		if (!window.ts) {
			if (!gTSLoaded) {
				gTSLoaded = true;

				await new Promise((resolve, reject) => {
					const script = document.createElement("script");
					script.src = "https://unpkg.com/typescript@5.4.5/lib/typescript.js";
					script.onload = resolve;
					script.onerror = reject;
					document.head.appendChild(script);
				});
			} else {
				// 로딩 중인 경우 잠깐 기다리기
				await new Promise(r => setTimeout(r, 100));
			}
		}

		// 2. ts → js 변환
		const jsCode = ts.transpileModule(_source, {
			compilerOptions: { module: ts.ModuleKind.ESNext }
		}).outputText;

		// 3. import 경로 확장자 자동 패치
		return patchImportPaths(jsCode);
	}
}

let gTSLoaded = false;
