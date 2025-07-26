import { CAlert } from "../basic/CAlert.js";
import { CPath } from "../basic/CPath.js";
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
    static MonacoEditer(_target, _value, _language = "plaintext", _theme = "vs-dark", _addExtraLib = null) {
        if (window["require"] == null) {
            _target.innerHTML = "MonacoEditer not import!";
            return;
        }
        _target.innerHTML = "";
        if (gMonaco) {
            require.config({ paths: { vs: CPath.PHPC() + '/artgine/external/legacy/monaco-editor/min/vs' } });
            gMonaco = false;
        }
        require(['vs/editor/editor.main'], function () {
            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                allowJs: true,
                checkJs: true,
                target: monaco.languages.typescript.ScriptTarget.ES2022,
                module: monaco.languages.typescript.ModuleKind.ESNext
            });
            let editor = monaco.editor.create(_target, {
                value: _value,
                language: _language,
                automaticLayout: true,
                readOnly: false,
                theme: _theme
            });
            if (_addExtraLib != null)
                _addExtraLib(editor);
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
            }
            else {
                await new Promise(r => setTimeout(r, 100));
            }
        }
        const jsCode = ts.transpileModule(_source, {
            compilerOptions: { module: ts.ModuleKind.ESNext }
        }).outputText;
        return patchImportPaths(jsCode);
    }
}
let gTSLoaded = false;
