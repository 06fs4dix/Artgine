import { CAlert } from "../basic/CAlert.js";
import { CEvent } from "../basic/CEvent.js";
import { CDOM } from "../basic/CDOM.js";
import { CPath } from "../basic/CPath.js";
import { CString } from "../basic/CString.js";
import { CUtil } from "../basic/CUtil.js";
import { ExtractImportPaths } from "../render/CShaderInterpret.js";
import { CFile } from "../system/CFile.js";
import { CChecker } from "./CChecker.js";
var gMonaco = true;
export class CUtilWeb {
    static mNotifPool = new Set();
    static async Notify(_title, _body = "", _icon = "", _onClick = null) {
        if (!("Notification" in window))
            return true;
        if (Notification.permission === "denied")
            return true;
        if (Notification.permission === "default") {
            const permission = await Notification.requestPermission();
            if (permission !== "granted")
                return true;
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
        return window.open(CPath.WebRootUrl() + "lib/artgine/Window.html", _title, "width=" + _width + ",height" + _height + "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes");
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
    static async TSImport(_source, _monaco = true, _github = false, _filePath = null, _rewriteSource = true) {
        let importPathArr = ExtractImportPaths(_source, false);
        const fileDir = CString.PathSub(_filePath ?? CPath.FullPath());
        const rootBase = (_github ? "https://06fs4dix.github.io/Artgine" : CPath.WebRootUrl()).replace(/\/$/, "");
        const engineBase = (_github ? "https://06fs4dix.github.io/Artgine" : CPath.WebRootArtgineUrl()).replace(/\/$/, "");
        const engineRoots = ["artgine/", "desktop/", "plugin/", "ai/"];
        const PickBase = (_path) => engineRoots.some(r => _path.startsWith(r)) ? engineBase : rootBase;
        const processedPaths = new Map();
        for (let i = 0; i < importPathArr.length; ++i) {
            const originalPath = importPathArr[i];
            if (processedPaths.has(originalPath))
                continue;
            if (/^https?:\/\//.test(originalPath) || /^file:\/\/\//.test(originalPath)) {
                processedPaths.set(originalPath, originalPath);
                continue;
            }
            let path = originalPath;
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
            if (_monaco)
                path = CString.ReplaceAll(path, ".js", "");
            else if (path.indexOf(".js") == -1)
                path += ".js";
            let adjustedFullPath;
            if (path.startsWith("../") || path.startsWith("./")) {
                let count = 0;
                while (path.startsWith("../")) {
                    count++;
                    path = path.substring(3);
                }
                if (path.startsWith("./"))
                    path = path.substring(2);
                if (_github || path.startsWith("artgine/")) {
                    adjustedFullPath = PickBase(path) + "/" + path;
                }
                else {
                    const base = count > 0 ? CString.PathSub(fileDir, count) : fileDir;
                    adjustedFullPath = base + "/" + path;
                }
            }
            else {
                adjustedFullPath = PickBase(path) + "/" + path;
            }
            if (_rewriteSource)
                _source = _source.replaceAll(originalPath, adjustedFullPath);
            processedPaths.set(originalPath, adjustedFullPath);
            importPathArr[i] = adjustedFullPath;
            if (_monaco && window["require"] != null) {
                const fName = adjustedFullPath + ".ts";
                const buf = await CFile.Load(fName);
                const libSource = CUtil.ArrayToString(buf);
                window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, fName);
                if (!_rewriteSource && hadJsExt) {
                    window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, adjustedFullPath + ".js");
                }
            }
        }
        return _source;
    }
    static MonacoEditer(_target, _value, _language = "plaintext", _theme = "vs-dark", _exeFun = null, _github = false, _filePath = null) {
        if (window["require"] == null) {
            _target.innerHTML = "MonacoEditer not import!";
            return;
        }
        if (gMonaco) {
            require.config({ paths: { vs: CPath.WebRootArtgineUrl() + 'artgine/external/legacy/monaco-editor/min/vs' } });
            gMonaco = false;
        }
        require(['vs/editor/editor.main'], async function () {
            const hasFilePath = _language == "typescript" && !!_filePath;
            if (_language == "typescript")
                _value = await CUtilWeb.TSImport(_value, true, _github, _filePath, !hasFilePath);
            _target.innerHTML = "";
            window["monaco"].languages.typescript.javascriptDefaults.setCompilerOptions({
                allowJs: true,
                checkJs: true,
                target: window["monaco"].languages.typescript.ScriptTarget.ES2022,
                module: window["monaco"].languages.typescript.ModuleKind.ESNext
            });
            let model = null;
            if (hasFilePath) {
                const uri = window["monaco"].Uri.parse(_filePath);
                model = window["monaco"].editor.getModel(uri);
                if (model)
                    model.setValue(_value);
                else
                    model = window["monaco"].editor.createModel(_value, _language, uri);
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
    static async TSToJS(_source) {
        const patchImportPaths = (code) => {
            return code.replace(/from\s+['"]([^'"]+)['"]/g, (match, path) => {
                if (/\.(js|ts|json|mjs)$/.test(path)) {
                    return match;
                }
                if (/^[A-Za-z]:[\\/]/.test(path)) {
                    const fixedPath = `file:///${path.replace(/\\/g, '/')}.js`;
                    return match.replace(path, fixedPath);
                }
                if (/^(https?:\/\/|file:\/\/)/.test(path)) {
                    return match.replace(path, `${path}.js`);
                }
                return match;
            });
        };
        const transpileOptions = {
            compilerOptions: {
                module: 99,
                target: 7,
                downlevelIteration: true,
                lib: ["es2015", "dom"]
            }
        };
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
            compilerOptions: {
                module: window["ts"].ModuleKind.ESNext,
                target: window["ts"].ScriptTarget.ES2020,
                downlevelIteration: true,
                lib: ["es2015", "dom"]
            }
        }).outputText;
        return patchImportPaths(jsCode);
    }
    static async MDReader(_urlOrText) {
        const root = CDOM.DataToDom(null);
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
        CPath.WebRootUrl();
        const { marked } = await import('../external/esnext/md/marked.esm.js');
        const hljs = (await import('../external/esnext/md/highlight.min.js')).default;
        const javascript = (await import('../external/esnext/md/javascript.min.js')).default;
        const typescript = (await import('../external/esnext/md/typescript.min.js')).default;
        hljs.registerLanguage('javascript', javascript);
        hljs.registerLanguage('typescript', typescript);
        marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: true });
        let buf = null;
        let md = "";
        let ext = CString.ExtCut(_urlOrText);
        if (ext.ext == "md") {
            buf = await CFile.Load(_urlOrText);
            if (!buf)
                return root;
            md = CUtil.ArrayToString(buf);
        }
        else
            md = _urlOrText;
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
            const LOCAL_BASE_RAW = CPath.WebRootUrl();
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
    static QRCode(_text, _size = 256) {
        return new Promise((resolve, reject) => {
            window.QRCode.toDataURL(_text, { width: _size, margin: 1 }, (err, url) => {
                if (err)
                    reject(err);
                else
                    resolve(url);
            });
        });
    }
}
let gTSLoaded = false;
