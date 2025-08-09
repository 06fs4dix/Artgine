import { CAlert } from "../basic/CAlert.js";
import { CPath } from "../basic/CPath.js";
import { CString } from "../basic/CString.js";
import { CUtil } from "../basic/CUtil.js";
import { ExtractImportPaths } from "../render/CShaderInterpret.js";
import { CFile } from "../system/CFile.js";
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
                    adjustedFullPath = "https://06fs4dix.github.io/Artgine/";
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
                    adjustedFullPath = "https://06fs4dix.github.io/Artgine/";
                fullPath = adjustedFullPath;
                adjustedFullPath = fullPath + path;
                _source = _source.replace(importPathArr[i], adjustedFullPath);
                importPathArr[i] = adjustedFullPath;
                processedPaths.set(importPathArr[i], adjustedFullPath);
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
        _target.innerHTML = "";
        if (gMonaco) {
            require.config({ paths: { vs: CPath.PHPC() + '/artgine/external/legacy/monaco-editor/min/vs' } });
            gMonaco = false;
        }
        if (_language == "typescript") {
            require(['vs/editor/editor.main'], async function () {
                _value = await CUtilWeb.TSImport(_value, true, _github);
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
        if (!window["ts"]) {
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
                await new Promise(r => setTimeout(r, 100));
            }
        }
        const jsCode = window["ts"].transpileModule(_source, {
            compilerOptions: { module: window["ts"].ModuleKind.ESNext }
        }).outputText;
        return patchImportPaths(jsCode);
    }
}
let gTSLoaded = false;
