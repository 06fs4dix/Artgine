import { CAlert } from "../basic/CAlert.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CPath } from "../basic/CPath.js";
import { CString } from "../basic/CString.js";
import { CUtil } from "../basic/CUtil.js";
import { ExtractImportPaths } from "../render/CShaderInterpret.js";
import { CFile } from "../system/CFile.js";
import { CChecker } from "./CChecker.js";
var gMonaco = true;
export class CUtilWeb {
    static ToastUI(_html, _height = 400) {
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
        if (source == null)
            source = location.search;
        _name = _name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + _name + "=([^&#]*)"), results = regex.exec(source);
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
    static async TSImport(_source, _monaco = true, _github = false) {
        let importPathArr = [];
        importPathArr = ExtractImportPaths(_source, false);
        let fullPath = CPath.FullPath();
        fullPath = CString.PathSub(fullPath);
        let processedPaths = new Map();
        for (let i = 0; i < importPathArr.length; ++i) {
            let path = importPathArr[i];
            if (processedPaths.has(path)) {
                continue;
            }
            let count = 0;
            while (path.startsWith("../")) {
                count++;
                path = path.substring(3);
            }
            path = CString.ReplaceAll(path, "./", "");
            if (_monaco == true)
                path = CString.ReplaceAll(path, ".js", "");
            else if (_monaco == false && path.indexOf(".js") == -1)
                path += ".js";
            if (count > 0) {
                let adjustedFullPath = CString.PathSub(fullPath, count);
                if (_github)
                    adjustedFullPath = "https://06fs4dix.github.io/Artgine";
                adjustedFullPath = adjustedFullPath + "/" + path;
                _source = _source.replace(importPathArr[i], adjustedFullPath);
                importPathArr[i] = adjustedFullPath;
                processedPaths.set(importPathArr[i], adjustedFullPath);
            }
            else {
                let aChk = path.indexOf("artgine");
                if (aChk != -1)
                    path = path.substring(aChk);
                let adjustedFullPath = CPath.PHPC();
                if (_github)
                    adjustedFullPath = "https://06fs4dix.github.io/Artgine";
                fullPath = adjustedFullPath;
                adjustedFullPath = fullPath + path;
                _source = _source.replace(importPathArr[i], adjustedFullPath);
                processedPaths.set(importPathArr[i], adjustedFullPath);
                importPathArr[i] = adjustedFullPath;
            }
            if (_monaco && window["require"] != null) {
                let fName = importPathArr[i];
                fName += ".ts";
                let buf = await CFile.Load(fName);
                window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(CUtil.ArrayToString(buf), fName);
            }
        }
        return _source;
    }
    static MonacoEditer(_target, _value, _language = "plaintext", _theme = "vs-dark", _exeFun = null, _github = false) {
        if (window["require"] == null) {
            _target.innerHTML = "MonacoEditer not import!";
            return;
        }
        if (gMonaco) {
            require.config({ paths: { vs: CPath.PHPC() + '/artgine/external/legacy/monaco-editor/min/vs' } });
            gMonaco = false;
        }
        require(['vs/editor/editor.main'], async function () {
            if (_language == "typescript")
                _value = await CUtilWeb.TSImport(_value, true, _github);
            _target.innerHTML = "";
            window["monaco"].languages.typescript.javascriptDefaults.setCompilerOptions({
                allowJs: true,
                checkJs: true,
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
    static async TSToJS(_source) {
        const patchImportPaths = (code) => {
            return code.replace(/from\s+['"]((?:https?:\/\/|file:\/\/)[^'"]+)['"]/g, (match, path) => {
                if (/\.(js|ts|json|mjs)$/.test(path)) {
                    return match;
                }
                return match.replace(path, `${path}.js`);
            });
        };
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
            }
            else {
                await CChecker.Exe(async () => {
                    if (window["ts"] != null && window["ts"].transpileModule != null)
                        return false;
                    return true;
                });
            }
        }
        const jsCode = window["ts"].transpileModule(_source, {
            compilerOptions: { module: window["ts"].ModuleKind.ESNext }
        }).outputText;
        return patchImportPaths(jsCode);
    }
    static async MDReader(_url) {
        const root = CDomFactory.DataToDom(null);
        const scopeClass = `mdr-scope-${Math.random().toString(36).slice(2)}`;
        root.classList.add(scopeClass);
        const getStyleHost = (node) => {
            const rn = node?.getRootNode?.();
            return (rn && rn instanceof ShadowRoot) ? rn : document.head;
        };
        const upsertStyle = (id, css, host) => {
            let el = host.querySelector?.(`#${id}`);
            if (!el) {
                el = document.createElement('style');
                el.id = id;
                host.appendChild(el);
            }
            el.textContent = css;
        };
        const host = getStyleHost(root);
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
        CPath.PHPC();
        const { marked } = await import('../external/esnext/md/marked.esm.js');
        const hljs = (await import('../external/esnext/md/highlight.min.js')).default;
        const javascript = (await import('../external/esnext/md/javascript.min.js')).default;
        const typescript = (await import('../external/esnext/md/typescript.min.js')).default;
        hljs.registerLanguage('javascript', javascript);
        hljs.registerLanguage('typescript', typescript);
        marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: true });
        const buf = await CFile.Load(_url);
        if (!buf)
            return root;
        const md = CUtil.ArrayToString(buf);
        const rawHtml = marked.parse(md, { xhtml: false });
        root.innerHTML = rawHtml;
        root.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
            block.classList.add('hljs');
        });
        root.querySelectorAll('a[href^="http"]').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener');
        });
        root.querySelectorAll('img, video, canvas, svg').forEach(el => {
            el.style.maxWidth = '100%';
            el.style.height = 'auto';
        });
        {
            const GH_BASE_NO_SLASH = "https://06fs4dix.github.io/Artgine";
            const GH_BASE = GH_BASE_NO_SLASH + "/";
            const LOCAL_BASE_RAW = CPath.PHPC();
            const LOCAL_BASE = LOCAL_BASE_RAW.endsWith("/") ? LOCAL_BASE_RAW : (LOCAL_BASE_RAW + "/");
            root.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href') ?? "";
                if (href.startsWith(GH_BASE)) {
                    const rest = href.slice(GH_BASE.length);
                    a.setAttribute('href', LOCAL_BASE + rest.replace(/^\/+/, ""));
                    return;
                }
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
