import { CUpdate } from "../basic/Basic.js";
import { CClass } from "../basic/CClass.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CShaderAttr } from "../render/CShaderAttr.js";
import { CTexture } from "../render/CTexture.js";
import { CModal } from "../basic/CModal.js";
import { CRPAuto } from "../app/canvas/CRPMgr.js";
import { CSurface } from "../app/subject/CSurface.js";
var gModal;
var gRPMgr;
var gShaderArr = [];
var gTexArr = [];
var gSelectedKey = null;
var gSelectedType = null;
var gGraphCols;
var gGraphSvg;
var gLeftPanel;
var gRightPanel;
export function RPMgrTool(_rpMgr) {
    gRPMgr = _rpMgr;
    gSelectedKey = null;
    gSelectedType = null;
    gModal = new CModalFlex([0.65, 0.35], "RPModal");
    gModal.SetHeader("RPMgrTool");
    gModal.SetSize(1300, 800);
    gModal.SetZIndex(CModal.eSort.Manual, CModal.eSort.ZIndexTool);
    gModal.Open();
    gLeftPanel = gModal.FindFlex(0);
    gRightPanel = gModal.FindFlex(1);
    [gLeftPanel, gRightPanel].forEach(panel => {
        panel.style.maxHeight = "calc(100vh - 10px)";
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
        panel.style.overflow = "hidden";
    });
    gLeftPanel.innerHTML = `
		<div style="padding:6px; border-bottom:1px solid #ddd; display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
			<button id="rp_add_rp" class="btn btn-sm btn-primary">+ RPAuto</button>
			<select id="rp_add_suf_select" class="form-select form-select-sm" style="width:auto;"></select>
			<button id="rp_add_suf" class="btn btn-sm btn-primary">+ Surface</button>
			<button id="rp_add_tex" class="btn btn-sm btn-primary">+ Texture</button>
		</div>
		<div id="rp_graph_scroll" style="flex:1 1 auto; overflow:auto; position:relative; background:#f8f9fa;">
			<div id="rp_graph_cols" style="position:relative; display:inline-flex; gap:60px; padding:24px;"></div>
		</div>
	`;
    gRightPanel.innerHTML = `<div id="rp_inspector" style="padding:8px; overflow-y:auto; flex:1 1 auto;"></div>`;
    const addRPBtn = gLeftPanel.querySelector("#rp_add_rp");
    addRPBtn.onclick = () => {
        const rp = new CRPAuto();
        gRPMgr.PushRP(rp);
        RPToolRPEx(rp);
        Select(rp.ObjHash(), "rp");
        RPToolBuildGraph();
    };
    const sufSelect = gLeftPanel.querySelector("#rp_add_suf_select");
    for (let name of CClass.ExtendsList(CSurface, true)) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        sufSelect.appendChild(opt);
    }
    const addSufBtn = gLeftPanel.querySelector("#rp_add_suf");
    addSufBtn.onclick = () => {
        if (sufSelect.value == "")
            return;
        const suf = CClass.New(sufSelect.value);
        gRPMgr.PushSuf(suf);
        RPToolRPEx(suf.GetRP());
        suf.EditChangeEx = () => RPToolBuildGraph();
        Select(suf.ObjHash(), "suf");
        RPToolBuildGraph();
    };
    const addTexBtn = gLeftPanel.querySelector("#rp_add_tex");
    addTexBtn.onclick = () => {
        const tex = new CTexture();
        tex.SetKey(CUniqueID.Get());
        gRPMgr.PushTex(tex.Key(), tex);
        Select(tex.Key(), "tex");
        RPToolBuildGraph();
    };
    gModal.On(CEvent.eType.Resize, () => RPToolDrawLines());
    RPToolBuildGraph();
}
function Select(_key, _type) {
    gSelectedKey = _key;
    gSelectedType = _type;
}
function MarkDirty() {
    gRPMgr.mUpdate = CUpdate.eType.Updated;
}
function RPToolGoto(_key, _type) {
    Select(_key, _type);
    RPToolBuildGraph();
    requestAnimationFrame(() => {
        gGraphCols.querySelector(`[data-key="${CSS.escape(_key)}"][data-type="${_type}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
}
function RPToolBindTexGoto(_btn, _getKey) {
    const refresh = () => {
        const key = _getKey();
        const exists = key != "" && gRPMgr.mTexMap.has(key);
        _btn.disabled = !exists;
        _btn.title = exists ? `${key}로 이동` : "존재하는 텍스쳐가 아님";
    };
    refresh();
    _btn.onclick = () => RPToolGoto(_getKey(), "tex");
    return refresh;
}
function RPToolResChk() {
    gShaderArr = [];
    gTexArr = [""];
    const shaderSet = new Set();
    for (let rp of gRPMgr.mRPArr)
        if (rp.mShader)
            shaderSet.add(rp.mShader);
    for (let suf of gRPMgr.mSufArr)
        if (suf.GetRP().mShader)
            shaderSet.add(suf.GetRP().mShader);
    gShaderArr = Array.from(shaderSet);
    for (let [key] of gRPMgr.mTexMap)
        gTexArr.push(key);
    for (let suf of gRPMgr.mSufArr)
        gTexArr.push(suf.GetTexKey());
    gTexArr = Array.from(new Set(gTexArr));
}
function RPToolBindTexCombo(_input, _box, _onChange) {
    const renderList = () => {
        const q = _input.value.trim().toLowerCase();
        const matches = gTexArr.filter(t => t != "" && (q == "" || t.toLowerCase().includes(q)));
        if (matches.length == 0) {
            _box.style.display = "none";
            return;
        }
        _box.innerHTML = matches.map(t => `<button type="button" class="list-group-item list-group-item-action py-1 px-2" style="font-size:12px;">${t}</button>`).join("");
        _box.querySelectorAll("button").forEach(btn => {
            btn.onclick = () => {
                _input.value = btn.textContent;
                _box.style.display = "none";
                _onChange();
            };
        });
        _box.style.display = "block";
    };
    _input.addEventListener("focus", renderList);
    _input.addEventListener("input", () => { _onChange(); renderList(); });
    _input.addEventListener("keydown", (e) => { if (e.key == "Escape")
        _box.style.display = "none"; });
    _input.addEventListener("blur", () => setTimeout(() => _box.style.display = "none", 150));
}
function RPToolRPEx(_rp) {
    _rp.EditFormEx = (_pointer, _body, _input) => {
        if (_pointer.member == "mShader") {
            _body.append(CUtilObj.Select(_pointer, _input, gShaderArr, gShaderArr, true));
        }
    };
    _rp.EditChangeEx = () => {
        RPToolBuildGraph();
    };
}
function RPInOutTexForm(_rp, _reFun) {
    const hash = _rp.ObjHash();
    const texContainer = document.createElement("div");
    texContainer.className = "mb-3";
    texContainer.innerHTML = `
		<div class="card mb-2">
			<div class="card-header py-1"><h6 class="mb-0">In</h6></div>
			<div class="card-body p-1">
				<button class="btn btn-primary btn-sm" id="add_intex_${hash}">[add]</button>
				<div id="intex_inputs_${hash}"></div>
			</div>
		</div>
		<div class="card mb-2">
			<div class="card-header py-1"><h6 class="mb-0">Out</h6></div>
			<div class="card-body p-1">
				<div class="d-flex gap-2 mb-2 align-items-center">
					<div class="position-relative" style="flex:1 1 auto; min-width:140px;">
						<input type="text" class="form-control form-control-sm" placeholder="텍스쳐 검색 또는 직접 입력" id="outtex_target_${hash}" autocomplete="off">
						<div class="list-group" id="outtex_suggest_${hash}" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:20; max-height:160px; overflow-y:auto; box-shadow:0 2px 6px rgba(0,0,0,.15);"></div>
					</div>
					<button type="button" class="btn btn-outline-success btn-sm" id="outtex_goto_${hash}" title="텍스쳐로 이동" style="min-width: 28px;">→</button>
				</div>
				<div class="d-flex gap-2 align-items-center">
					<input type="number" class="form-control form-control-sm" placeholder="level" style="width: 80px;" id="outtex_level_${hash}">
					<input type="text" class="form-control form-control-sm" placeholder="use: 0,1,2" id="outtex_use_${hash}">
				</div>
			</div>
		</div>
	`;
    for (let attr of _rp.mShaderAttr) {
        if (attr.mType != -2)
            continue;
        const inputsContainer = texContainer.querySelector(`#intex_inputs_${hash}`);
        const inputGroup = document.createElement("div");
        inputGroup.className = "mb-2";
        inputGroup.innerHTML = `
			<div class="d-flex gap-2 mb-1 align-items-center">
				<div class="position-relative" style="flex:1 1 auto; min-width:140px;">
					<input type="text" class="form-control form-control-sm" placeholder="텍스쳐 검색 또는 직접 입력" value="${attr.mKey || ""}" autocomplete="off">
					<div class="list-group" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:20; max-height:160px; overflow-y:auto; box-shadow:0 2px 6px rgba(0,0,0,.15);"></div>
				</div>
				<input type="number" class="form-control form-control-sm" placeholder="off" style="width: 70px; flex:0 0 auto;" value="${attr.mEach || 0}">
				<button type="button" class="btn btn-outline-success btn-sm" title="텍스쳐로 이동" style="min-width: 28px; flex:0 0 auto;">→</button>
				<button class="btn btn-danger btn-sm" style="min-width: 24px; flex:0 0 auto;">×</button>
			</div>
		`;
        const textInput = inputGroup.querySelector('input[type="text"]');
        const suggestBox = inputGroup.querySelector(".list-group");
        const numberInput = inputGroup.querySelector('input[type="number"]');
        const gotoBtn = inputGroup.querySelector(".btn-outline-success");
        const refreshGoto = RPToolBindTexGoto(gotoBtn, () => textInput.value.trim());
        const applyKey = () => { attr.mKey = textInput.value; _rp.Reset(); MarkDirty(); refreshGoto(); };
        RPToolBindTexCombo(textInput, suggestBox, applyKey);
        numberInput.addEventListener("input", () => { attr.mEach = parseFloat(numberInput.value) || 0; _rp.Reset(); MarkDirty(); });
        const removeBtn = inputGroup.querySelector(".btn-danger");
        removeBtn.addEventListener("click", () => {
            const index = _rp.mShaderAttr.indexOf(attr);
            if (index > -1)
                _rp.mShaderAttr.splice(index, 1);
            _rp.Reset();
            MarkDirty();
            _reFun();
        });
        inputsContainer.appendChild(inputGroup);
    }
    const addInTexBtn = texContainer.querySelector(`#add_intex_${hash}`);
    addInTexBtn.addEventListener("click", () => {
        const newAttr = new CShaderAttr(-2, "");
        newAttr.mData = [];
        _rp.mShaderAttr.push(newAttr);
        MarkDirty();
        _reFun();
    });
    const renderTargetInput = texContainer.querySelector(`#outtex_target_${hash}`);
    const renderTargetSuggest = texContainer.querySelector(`#outtex_suggest_${hash}`);
    const renderTargetLevelInput = texContainer.querySelector(`#outtex_level_${hash}`);
    const renderTargetUseInput = texContainer.querySelector(`#outtex_use_${hash}`);
    const renderTargetGotoBtn = texContainer.querySelector(`#outtex_goto_${hash}`);
    renderTargetInput.value = _rp.mRenderTarget || "";
    renderTargetLevelInput.value = _rp.mRenderTargetLevel?.toString() || "0";
    renderTargetUseInput.value = _rp.mRenderTargetUse && _rp.mRenderTargetUse.size > 0 ?
        Array.from(_rp.mRenderTargetUse).join(",") : "";
    const refreshOutGoto = RPToolBindTexGoto(renderTargetGotoBtn, () => renderTargetInput.value.trim());
    const applyRenderTarget = () => { _rp.mRenderTarget = renderTargetInput.value; _rp.Reset(); MarkDirty(); refreshOutGoto(); };
    RPToolBindTexCombo(renderTargetInput, renderTargetSuggest, applyRenderTarget);
    renderTargetLevelInput.addEventListener("input", () => { _rp.mRenderTargetLevel = parseInt(renderTargetLevelInput.value) || 0; MarkDirty(); });
    renderTargetUseInput.addEventListener("input", () => {
        _rp.mRenderTargetUse.clear();
        const inputValue = renderTargetUseInput.value.trim();
        if (inputValue) {
            for (let numStr of inputValue.split(",").map(s => s.trim()).filter(s => s !== "")) {
                const num = parseInt(numStr);
                if (!isNaN(num))
                    _rp.mRenderTargetUse.add(num);
            }
        }
        MarkDirty();
    });
    return texContainer;
}
function RPToolCollectNodes() {
    const nodes = [];
    for (let [key, tex] of gRPMgr.mTexMap)
        nodes.push({ key, type: "tex", tex, level: 0 });
    for (let rp of gRPMgr.mRPArr)
        nodes.push({ key: rp.ObjHash(), type: "rp", rp, level: -1 });
    for (let suf of gRPMgr.mSufArr)
        nodes.push({ key: suf.ObjHash(), type: "suf", rp: suf.GetRP(), suf, level: -1 });
    const findProducerLevel = (_texKey) => {
        for (let n of nodes)
            if (n.type != "tex" && n.rp.mRenderTarget == _texKey && n.level >= 0)
                return n.level;
        for (let n of nodes)
            if (n.type == "tex" && n.key == _texKey)
                return n.level;
        return -1;
    };
    let changed = true;
    let guard = 0;
    while (changed && guard++ < nodes.length + 2) {
        changed = false;
        for (let n of nodes) {
            if (n.type == "tex")
                continue;
            const inKeys = n.rp.mShaderAttr.filter(sa => sa.mType == -2).map(sa => sa.mKey);
            let maxLevel = -1;
            for (let inKey of inKeys)
                maxLevel = Math.max(maxLevel, findProducerLevel(inKey));
            const newLevel = maxLevel + 1;
            if (n.level != newLevel) {
                n.level = newLevel;
                changed = true;
            }
        }
    }
    for (let n of nodes) {
        if (n.type != "tex")
            continue;
        let minConsumer = Infinity;
        for (let m of nodes) {
            if (m.type == "tex")
                continue;
            if (m.rp.mShaderAttr.some(sa => sa.mType == -2 && sa.mKey == n.key))
                minConsumer = Math.min(minConsumer, m.level);
        }
        n.level = minConsumer == Infinity ? 0 : Math.max(0, minConsumer - 1);
    }
    return nodes;
}
function RPToolTexUsers(_texKey) {
    const users = [];
    for (let rp of gRPMgr.mRPArr)
        if (rp.mShaderAttr.some(sa => sa.mType == -2 && sa.mKey == _texKey))
            users.push({ key: rp.ObjHash(), type: "rp", label: `RP·P${rp.mPriority}` });
    for (let suf of gRPMgr.mSufArr)
        if (suf.GetRP().mShaderAttr.some(sa => sa.mType == -2 && sa.mKey == _texKey))
            users.push({ key: suf.ObjHash(), type: "suf", label: `Suf·P${suf.GetRP().mPriority}` });
    return users;
}
function RPToolBuildGraph() {
    RPToolResChk();
    const nodes = RPToolCollectNodes();
    const cols = gLeftPanel.querySelector("#rp_graph_cols");
    cols.innerHTML = "";
    gGraphCols = cols;
    gGraphSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    gGraphSvg.style.position = "absolute";
    gGraphSvg.style.top = "0";
    gGraphSvg.style.left = "0";
    gGraphSvg.style.pointerEvents = "none";
    gGraphSvg.style.overflow = "visible";
    const marker = `
		<defs>
			<marker id="rp_arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
				<path d="M0,0 L6,3 L0,6 Z" fill="#6c757d"/>
			</marker>
		</defs>`;
    gGraphSvg.innerHTML = marker;
    cols.appendChild(gGraphSvg);
    const maxLevel = nodes.reduce((m, n) => Math.max(m, n.level), 0);
    for (let level = 0; level <= maxLevel; level++) {
        const colDiv = document.createElement("div");
        colDiv.className = "rp_graph_col";
        colDiv.style.display = "flex";
        colDiv.style.flexDirection = "column";
        colDiv.style.gap = "20px";
        colDiv.style.position = "relative";
        colDiv.style.zIndex = "1";
        for (let n of nodes.filter(n => n.level == level))
            colDiv.appendChild(RPToolNodeCard(n));
        cols.appendChild(colDiv);
    }
    requestAnimationFrame(() => RPToolDrawLines());
    RPToolInspector();
}
function RPToolNodeColor(_type) {
    if (_type == "tex")
        return { border: "#28a745", label: "CTexture", labelColor: "green" };
    if (_type == "suf")
        return { border: "#dc3545", label: "CSurface", labelColor: "red" };
    return { border: "#0d6efd", label: "CAutoRP", labelColor: "blue" };
}
function RPToolNodeCard(_node) {
    const color = RPToolNodeColor(_node.type);
    const selected = _node.key == gSelectedKey && _node.type == gSelectedType;
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.key = _node.key;
    card.dataset.type = _node.type;
    card.style.width = "220px";
    card.style.cursor = "pointer";
    card.style.borderColor = color.border;
    card.style.borderWidth = selected ? "3px" : "1px";
    card.style.boxShadow = selected ? `0 0 0 2px ${color.border}55` : "none";
    let bodyHtml = "";
    if (_node.type == "tex") {
        const users = RPToolTexUsers(_node.key);
        bodyHtml = `
			<div class="fw-bold text-truncate" title="${_node.key}" style="font-size:11px;">${_node.key}</div>
			<div class="small text-muted">${_node.tex.IsFrameBuf() ? "FrameBuf" : "Texture"}</div>
			<div class="small border-top pt-1 mt-1">${users.length ? "Used by: " + users.map(u => u.label).join(", ") : `<span class="text-muted">(unused)</span>`}</div>
		`;
    }
    else {
        const rp = _node.rp;
        let inHtml = "";
        for (let sa of rp.mShaderAttr)
            if (sa.mType == -2)
                inHtml += `<div>▶ ${sa.mKey}</div>`;
        let outHtml = rp.mRenderTarget ? `<div>${rp.mRenderTarget} ▶</div>` : `<div class="text-muted">(screen) ▶</div>`;
        bodyHtml = `
			<div class="small">${inHtml}</div>
			<div class="small text-muted border-top pt-1 mt-1">P${rp.mPriority} · ${rp.mShader || "-"}${rp.mTag.size ? " · " + [...rp.mTag].join(",") : ""}</div>
			<div class="small border-top pt-1 mt-1">${outHtml}</div>
		`;
    }
    card.innerHTML = `
		<div class="card-header py-1 px-2 d-flex justify-content-between align-items-center">
			<span class="fw-bold text-truncate" style="color:${color.labelColor}; font-size:12px;">${color.label}</span>
			<button class="btn btn-sm btn-close" style="min-width:20px;"></button>
		</div>
		<div class="card-body p-2" style="font-size:12px;">${bodyHtml}</div>
	`;
    card.querySelector(".card-body").addEventListener("click", () => {
        Select(_node.key, _node.type);
        RPToolBuildGraph();
    });
    card.querySelector(".card-header span").addEventListener("click", () => {
        Select(_node.key, _node.type);
        RPToolBuildGraph();
    });
    card.querySelector(".btn-close").addEventListener("click", (e) => {
        e.stopPropagation();
        if (_node.type == "tex")
            gRPMgr.RemoveTex(_node.key);
        else if (_node.type == "suf")
            gRPMgr.RemoveSuf(_node.suf);
        else
            gRPMgr.RemoveRP(_node.rp);
        MarkDirty();
        if (gSelectedKey == _node.key) {
            gSelectedKey = null;
            gSelectedType = null;
        }
        RPToolBuildGraph();
    });
    return card;
}
function RPToolDrawLines() {
    if (gGraphCols == null || gGraphSvg == null)
        return;
    const containerRect = gGraphCols.getBoundingClientRect();
    gGraphSvg.setAttribute("width", gGraphCols.scrollWidth + "");
    gGraphSvg.setAttribute("height", gGraphCols.scrollHeight + "");
    gGraphSvg.querySelectorAll("line").forEach(l => l.remove());
    const cardRect = (_key, _type) => {
        const el = gGraphCols.querySelector(`[data-key="${CSS.escape(_key)}"][data-type="${_type}"]`);
        if (el == null)
            return null;
        const r = el.getBoundingClientRect();
        return { right: r.right - containerRect.left, left: r.left - containerRect.left, midY: r.top - containerRect.top + r.height / 2 };
    };
    const findProducer = (_texKey) => {
        for (let rp of gRPMgr.mRPArr)
            if (rp.mRenderTarget == _texKey)
                return { key: rp.ObjHash(), type: "rp" };
        for (let suf of gRPMgr.mSufArr)
            if (suf.GetRP().mRenderTarget == _texKey)
                return { key: suf.ObjHash(), type: "suf" };
        if (gRPMgr.mTexMap.has(_texKey))
            return { key: _texKey, type: "tex" };
        return null;
    };
    const drawEdge = (_from, _toKey, _toType) => {
        const a = cardRect(_from.key, _from.type);
        const b = cardRect(_toKey, _toType);
        if (a == null || b == null)
            return;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", a.right + "");
        line.setAttribute("y1", a.midY + "");
        line.setAttribute("x2", (b.left - 6) + "");
        line.setAttribute("y2", b.midY + "");
        line.setAttribute("stroke", "#6c757d");
        line.setAttribute("stroke-width", "2");
        line.setAttribute("marker-end", "url(#rp_arrow)");
        gGraphSvg.appendChild(line);
    };
    const allRP = [];
    for (let rp of gRPMgr.mRPArr)
        allRP.push({ key: rp.ObjHash(), type: "rp", rp });
    for (let suf of gRPMgr.mSufArr)
        allRP.push({ key: suf.ObjHash(), type: "suf", rp: suf.GetRP() });
    for (let { key, type, rp } of allRP) {
        for (let sa of rp.mShaderAttr) {
            if (sa.mType != -2)
                continue;
            const producer = findProducer(sa.mKey);
            if (producer != null)
                drawEdge(producer, key, type);
        }
    }
}
function RPToolInspector() {
    const div = gRightPanel.querySelector("#rp_inspector");
    div.innerHTML = "";
    if (gSelectedKey == null) {
        div.innerHTML = `<div class="text-muted p-2">좌측 그래프에서 노드를 선택하세요.</div>`;
        return;
    }
    if (gSelectedType == "tex") {
        const tex = gRPMgr.mTexMap.get(gSelectedKey);
        if (tex == null) {
            gSelectedKey = null;
            RPToolInspector();
            return;
        }
        const users = RPToolTexUsers(tex.Key());
        const wrap = document.createElement("div");
        wrap.innerHTML = `<h6 class="text-success mb-2">CTexture</h6>
			<div class="mb-2 d-flex align-items-center gap-2">
				<span class="text-muted">Key</span>
				<input type="text" class="form-control form-control-sm" id="rp_tex_key" value="${tex.Key()}">
			</div>
			<div class="text-muted small mb-1">Used by (${users.length})</div>
			${users.length ?
            `<ul class="list-group mb-2">${users.map(u => `<li class="list-group-item list-group-item-action p-1" style="cursor:pointer; font-size:12px;" data-jkey="${u.key}" data-jtype="${u.type}">${u.label}</li>`).join("")}</ul>` :
            `<div class="text-muted small mb-2">(사용하는 RP 없음)</div>`}`;
        const keyInput = wrap.querySelector("#rp_tex_key");
        keyInput.addEventListener("change", () => {
            const newKey = keyInput.value.trim();
            if (newKey == "" || newKey == tex.Key())
                return;
            gRPMgr.RemoveTex(tex.Key());
            tex.SetKey(newKey);
            gRPMgr.PushTex(newKey, tex);
            gSelectedKey = newKey;
            RPToolBuildGraph();
        });
        wrap.querySelectorAll("[data-jkey]").forEach(li => {
            li.addEventListener("click", () => RPToolGoto(li.dataset.jkey, li.dataset.jtype));
        });
        wrap.append(tex.EditInit(null));
        div.append(wrap);
        return;
    }
    let rp = null;
    let suf = null;
    if (gSelectedType == "rp")
        rp = gRPMgr.mRPArr.find(r => r.ObjHash() == gSelectedKey) ?? null;
    else
        suf = gRPMgr.mSufArr.find(s => s.ObjHash() == gSelectedKey) ?? null;
    if (suf != null)
        rp = suf.GetRP();
    if (rp == null) {
        gSelectedKey = null;
        RPToolInspector();
        return;
    }
    const title = gSelectedType == "suf" ? "CSurface" : "CAutoRP";
    const wrap = document.createElement("div");
    wrap.innerHTML = `<h6 class="mb-2" style="color:${gSelectedType == "suf" ? "red" : "blue"};">${title}</h6>`;
    wrap.append(RPInOutTexForm(rp, () => RPToolBuildGraph()));
    wrap.append((suf ?? rp).EditInit(null));
    div.append(wrap);
}
