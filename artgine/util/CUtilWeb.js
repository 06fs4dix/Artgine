import { CAlert } from "../basic/CAlert.js";
import { CConfirm } from "../basic/CModal.js";
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
    static sMonacoExtToLang = {
        ts: "typescript", tsx: "typescript", cts: "typescript", mts: "typescript",
        js: "javascript", es6: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
        json: "json",
        html: "html", htm: "html", shtml: "html", xhtml: "html", mdoc: "html", jsp: "html",
        asp: "html", aspx: "html", jshtm: "html",
        wgsl: "wgsl",
        c: "c", h: "c",
        cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", hh: "cpp", hxx: "cpp",
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
        sh: "shell", bash: "shell",
        bat: "bat", cmd: "bat",
        ps1: "powershell", psm1: "powershell", psd1: "powershell",
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
        sql: "sql",
        graphql: "graphql", gql: "graphql",
        cypher: "cypher", cyp: "cypher",
        sparql: "sparql", rq: "sparql",
        redis: "redis",
        ini: "ini", properties: "ini", gitconfig: "ini",
        hcl: "hcl", tf: "hcl", tfvars: "hcl",
        proto: "proto",
        bicep: "bicep",
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
        txt: "plaintext",
    };
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
    static async TSImport(_source, _monaco = true, _github = false, _filePath = null, _rewriteSource = true, _visited = new Set()) {
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
            let monacoAliasPath = null;
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
                    if (!_github) {
                        const base = count > 0 ? CString.PathSub(fileDir, count) : fileDir;
                        const aliasPath = base + "/" + path;
                        if (aliasPath !== adjustedFullPath)
                            monacoAliasPath = aliasPath;
                    }
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
            if (_monaco && window["require"] != null && !_visited.has(adjustedFullPath)) {
                _visited.add(adjustedFullPath);
                const fName = adjustedFullPath + ".ts";
                const buf = await CFile.Load(fName);
                const libSource = CUtil.ArrayToString(buf);
                window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, fName);
                if (!_rewriteSource && hadJsExt) {
                    window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, adjustedFullPath + ".js");
                }
                if (monacoAliasPath != null) {
                    window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, monacoAliasPath + ".ts");
                    if (!_rewriteSource && hadJsExt) {
                        window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(libSource, monacoAliasPath + ".js");
                    }
                }
                await CUtilWeb.TSImport(libSource, _monaco, _github, adjustedFullPath, false, _visited);
            }
        }
        return _source;
    }
    static IsMonacoSourceExt(_ext) {
        if (!_ext)
            return false;
        return _ext.toLowerCase() in CUtilWeb.sMonacoExtToLang;
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
    static SheetEditor(_target, _data, _editable = true, _onChange = null) {
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
        const tabsHtml = _data.map((s, i) => `<li class="nav-item" role="presentation">
				<button class="nav-link${i === 0 ? ' active' : ''}"
					id="${uid}_tab_t${i}" type="button" role="tab"
					data-tab-key="t${i}" data-sheet-name="${CUtilWeb.SheetEscapeHtml(s.name)}">
					${CUtilWeb.SheetEscapeHtml(s.name)}
					${_editable ? `<span class="ms-1 text-danger sheet-tab-del" title="시트 삭제">✕</span>` : ''}
				</button>
			</li>`).join('');
        const addTabHtml = _editable
            ? `<li class="nav-item" role="presentation">
				<button class="nav-link sheet-tab-add" type="button" title="시트 추가">+</button>
			</li>`
            : '';
        const pagesHtml = _data.map((s, i) => `<div class="tab-pane${i === 0 ? ' show active' : ''} overflow-auto"
						style="height:100%"
						id="${uid}_pane_t${i}" data-tab-key="t${i}" data-sheet-name="${CUtilWeb.SheetEscapeHtml(s.name)}" role="tabpanel">
				${CUtilWeb.SheetBuildTable(s.rows)}
			</div>`).join('');
        _target.innerHTML = `
			<div class="d-flex flex-column h-100">
				<ul class="nav nav-tabs flex-shrink-0 px-1 pt-1 flex-wrap" role="tablist">
					${tabsHtml}${addTabHtml}
				</ul>
				<div class="tab-content flex-grow-1 overflow-hidden position-relative">
					${pagesHtml}
				</div>
			</div>`;
        const activateTab = (_key) => {
            _target.querySelectorAll('.nav-link[data-tab-key]').forEach(b => b.classList.remove('active'));
            _target.querySelectorAll('.tab-pane[data-tab-key]').forEach(p => p.classList.remove('show', 'active'));
            _target.querySelector(`.nav-link[data-tab-key="${_key}"]`)?.classList.add('active');
            _target.querySelector(`.tab-pane[data-tab-key="${_key}"]`)?.classList.add('show', 'active');
        };
        const wireTabButton = (_btn, _pane) => {
            _btn.addEventListener('click', (e) => {
                if (e.target.closest('.sheet-tab-del'))
                    return;
                activateTab(_btn.dataset.tabKey);
            });
            if (!_editable)
                return;
            _btn.querySelector('.sheet-tab-del')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (_target.querySelectorAll('.nav-link[data-tab-key]').length <= 1)
                    return;
                const name = _btn.dataset.sheetName;
                const confirm = new CConfirm();
                confirm.SetBody(`Delete sheet '${CUtilWeb.SheetEscapeHtml(name)}'?`);
                confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
                    () => {
                        const wasActive = _btn.classList.contains('active');
                        _btn.closest('li').remove();
                        _pane.remove();
                        if (wasActive) {
                            const remain = _target.querySelector('.nav-link[data-tab-key]');
                            if (remain)
                                activateTab(remain.dataset.tabKey);
                        }
                        _onChange?.('deleteSheet', { name });
                    },
                    () => { },
                ], ["Delete", "Cancel"]);
                confirm.Open();
            });
        };
        _target.querySelectorAll('.nav-link[data-tab-key]').forEach(btn => {
            const pane = _target.querySelector(`.tab-pane[data-tab-key="${btn.dataset.tabKey}"]`);
            wireTabButton(btn, pane);
        });
        if (_editable) {
            const addTabBtn = _target.querySelector('.sheet-tab-add');
            addTabBtn?.addEventListener('click', () => {
                const name = window.prompt('새 시트 이름을 입력하세요');
                if (!name || !name.trim())
                    return;
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
                const newBtn = li.querySelector('.nav-link[data-tab-key]');
                wireTabButton(newBtn, pane);
                activateTab(key);
                _onChange?.('insertSheet', { name, index });
            });
        }
        if (_editable)
            CUtilWeb.SheetAttachEditMode(_target, _onChange);
    }
    static SheetBuildTable(rows) {
        if (!rows || rows.length === 0)
            return `<div class="p-3 text-muted">데이터가 없습니다.</div>`;
        const colCount = Math.max(...rows.map(r => r.length));
        const maxLens = new Array(colCount).fill(0);
        for (const row of rows)
            for (let c = 0; c < row.length; c++) {
                const len = String(row[c] ?? '').length;
                if (len > maxLens[c])
                    maxLens[c] = len;
            }
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
            html += `<tr>${rows[i].map((c) => `<td class="px-2">${CUtilWeb.SheetEscapeHtml(String(c ?? ''))}</td>`).join('')}${delBtnTd}</tr>`;
        const blankCells = new Array(colCount).fill(`<td class="px-2"></td>`).join('');
        html += `<tr class="sheet-row-add-placeholder">${blankCells}<td class="px-1 text-center"><button type="button" class="btn btn-sm btn-outline-primary py-0 px-1 sheet-row-add">+</button></td></tr>`;
        html += `</tbody></table>`;
        return html;
    }
    static SheetNameOf(_el) {
        return _el.closest('[data-sheet-name]')?.getAttribute('data-sheet-name') ?? '';
    }
    static SheetConvertAddRow(_tr, _onChange = null) {
        const actionTd = _tr.querySelector('td:last-child');
        if (actionTd)
            actionTd.innerHTML = `<button type="button" class="btn btn-sm btn-outline-danger py-0 px-1 sheet-row-del">✕</button>`;
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
    static SheetAttachEditMode(_container, _onChange = null) {
        _container.addEventListener('click', (e) => {
            const target = e.target;
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
                    () => { },
                ], ["Delete", "Cancel"]);
                confirm.Open();
                return;
            }
            const addBtn = target.closest('.sheet-row-add');
            if (addBtn) {
                const tr = addBtn.closest('tr');
                if (tr)
                    CUtilWeb.SheetConvertAddRow(tr, _onChange);
            }
        });
        _container.addEventListener('dblclick', (e) => {
            const target = e.target;
            if (target.closest('.sheet-row-del, .sheet-row-add'))
                return;
            const td = target.closest('td, th');
            if (!td || td.querySelector('.sheet-row-del, .sheet-row-add'))
                return;
            const placeholderTr = td.closest('tr');
            if (placeholderTr?.classList.contains('sheet-row-add-placeholder')) {
                const colIndex = Array.from(placeholderTr.children).indexOf(td);
                CUtilWeb.SheetConvertAddRow(placeholderTr, _onChange);
                const newTd = placeholderTr.children[colIndex];
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
                if (committed)
                    return;
                committed = true;
                const sheet = CUtilWeb.SheetNameOf(td);
                const col = Array.from(td.parentElement.children).indexOf(td);
                if (isColAdd) {
                    if (input.value.trim() === '') {
                        td.innerHTML = '+';
                        return;
                    }
                    CUtilWeb.SheetAddColumn(td, input.value);
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
                if (committed)
                    return;
                committed = true;
                td.innerHTML = isColAdd ? '+' : CUtilWeb.SheetEscapeHtml(original);
            };
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (ke) => {
                if (ke.key === 'Enter') {
                    ke.preventDefault();
                    commit();
                }
                if (ke.key === 'Escape') {
                    ke.preventDefault();
                    cancel();
                    input.blur();
                }
                if (ke.key === 'Tab') {
                    ke.preventDefault();
                    commit();
                    const cells = Array.from(td.closest('table')?.querySelectorAll('td, th') ?? []);
                    const next = cells[cells.indexOf(td) + (ke.shiftKey ? -1 : 1)];
                    if (next)
                        next.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                }
            });
        });
    }
    static SheetAddColumn(_actionTh, _name) {
        const table = _actionTh.closest('table');
        const headerRow = _actionTh.closest('tr');
        if (!table || !headerRow) {
            _actionTh.innerHTML = '+';
            return;
        }
        const cellIndex = Array.from(headerRow.children).indexOf(_actionTh);
        const newTh = document.createElement('th');
        newTh.className = 'px-2';
        newTh.textContent = _name;
        _actionTh.before(newTh);
        _actionTh.innerHTML = '+';
        table.querySelectorAll('tbody tr').forEach(tr => {
            const refCell = tr.children[cellIndex];
            const newTd = document.createElement('td');
            newTd.className = 'px-2';
            if (refCell)
                refCell.before(newTd);
            else
                tr.appendChild(newTd);
        });
        const colgroup = table.querySelector('colgroup');
        if (colgroup) {
            const refCol = colgroup.children[cellIndex];
            const newCol = document.createElement('col');
            newCol.style.width = '80px';
            if (refCol)
                refCol.before(newCol);
            else
                colgroup.appendChild(newCol);
        }
    }
    static SheetEscapeHtml(_str) {
        return _str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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
