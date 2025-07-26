import { CAlert } from "../basic/CAlert.js";
import { CBlackBoard } from "../basic/CBlackBoard.js";
import { CClass } from "../basic/CClass.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { CAtelier } from "../canvas/CAtelier.js";
import { CColor } from "../canvas/component/CColor.js";
import { CPaint2D, CPaintHTML } from "../canvas/component/paint/CPaint2D.js";
import { CPaintTrail } from "../canvas/component/paint/CPaintTrail.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CCamCon2DFreeMove } from "../util/CCamCon.js";
import { CChecker } from "../util/CChecker.js";
import { CTooltip, CTooltipListAuto } from "../util/CTooltip.js";
import { CWFAction, CWFCondition, CWFOperator, CWFSystemSingle, CWFTask } from "../util/CWorkFlow.js";
var gModal;
var gAtl;
var gWF;
var gToolTip;
var gUpdateEvent;
export function WorkTool(_wf) {
    gWF = _wf;
    gModal = new CModalFlex([0.7, 0.3], "WorkToolModal");
    gModal.SetHeader("WorkTool");
    gModal.SetSize(1000, 800);
    gModal.Open();
    const maxHeight = "calc(100vh - 10px)";
    const leftPanel = gModal.FindFlex(0);
    const rightPanel = gModal.FindFlex(1);
    [leftPanel, rightPanel].forEach(panel => {
        panel.style.maxHeight = maxHeight;
        panel.style.overflowY = "auto";
    });
    let canvas = CDomFactory.DataToDom(`
      <div style="position: relative; width: 100%; height: 100%;">
    <canvas id="WorkToolLeft_can"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;">
    </canvas>
    <div id="WorkToolLeft_div"
         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events:none;">
    </div>
  </div>
    `);
    leftPanel.append(canvas);
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "WorkToolLeft_can", false).then(() => {
        WFTInit();
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
    });
    gAtl.NewCanvas("WorkTool");
    gAtl.Canvas("WorkTool").SetCameraKey("2D");
    gUpdateEvent = new CEvent(WFTUpdate);
    gAtl.Frame().PushEvent(CEvent.eType.Update, gUpdateEvent);
}
function WFTUpdate(_delay) {
    if (gWF instanceof CWFSystemSingle) {
        let wfs = gWF;
        const activeKeys = Array.from(wfs.mTaskActive.keys());
        for (let task of wfs.mTaskList) {
            const sub = gAtl.Canvas("WorkTool").Find(task.Key());
            if (!sub)
                continue;
            const htmlPaint = sub.FindComp(CPaintHTML);
            if (!htmlPaint)
                continue;
            const el = htmlPaint.GetElement();
            if (!el)
                continue;
            const isActive = activeKeys.includes(task.mKey);
            if (isActive)
                el.style.border = "3px solid red";
        }
    }
}
function WFTActionInit(_task, _action, _seed = 1) {
    const collapseId = `collapse_loop_${_action.ObjHash(_seed)}`;
    const labelId = `loop_title_${_action.ObjHash(_seed)}`;
    const html = CDomFactory.DataToDom(`
        <div class="card mb-2 border border-danger bg-danger bg-opacity-10">
            
            <!-- Loop Header -->
            <div class="card-header py-2 px-1" style="cursor: pointer;" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="true" aria-controls="${collapseId}">
                <div class="fw-bold text-danger" id="${labelId}">Loop</div>
            </div>
            
            <!-- Collapsible Loop Body -->
            <div id="${collapseId}" class="collapse">
                <div class="card-body d-flex flex-column gap-1 p-1">
                    ${["mStart", "mDelay", "mCount", "mEnd"].map(member => `
                        <div class="row g-1 align-items-center">
                            <div class="col-auto">
                                <label class="col-form-label col-form-label-sm">${member}:</label>
                            </div>
                            <div class="col">
                                <input id="input_${member}_${_action.ObjHash(_seed)}" type="number" class="form-control form-control-sm" value="${_action[member]}" />
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>

            <!-- Command 고정 영역 -->
            <div class="d-flex align-items-center gap-1">
                <label class="form-label mb-0">Command</label>
                <button id="btn_delete_action_${_action.ObjHash(_seed)}" class="btn btn-outline-danger btn-sm">X</button>
            </div>
            <textarea id="cmd_${_action.ObjHash(_seed)}" rows="3" class="form-control form-control-sm">${_action.DataToStr()}</textarea>
        </div>
    `);
    const miliSecToMiniteStr = (ms) => {
        if (ms === -1)
            return "";
        let sec = ms / 1000;
        const min = Math.floor(sec / 60);
        sec = sec % 60;
        return min > 0 ? `${min}m${sec}s` : `${sec}s`;
    };
    const updateLoopTitle = () => {
        const start = parseInt(html.querySelector(`#input_mStart_${_action.ObjHash(_seed)}`)?.value || "-1");
        const end = parseInt(html.querySelector(`#input_mEnd_${_action.ObjHash(_seed)}`)?.value || "-1");
        const delay = parseInt(html.querySelector(`#input_mDelay_${_action.ObjHash(_seed)}`)?.value || "-1");
        const count = parseInt(html.querySelector(`#input_mCount_${_action.ObjHash(_seed)}`)?.value || "-1");
        let title = "";
        const beginStr = miliSecToMiniteStr(start);
        const endStr = miliSecToMiniteStr(end);
        const delayStr = miliSecToMiniteStr(delay);
        if (beginStr || endStr) {
            title += `${beginStr}~${endStr} / `;
        }
        title += (count === -1 ? "∞" : count.toString());
        if (delayStr) {
            title += ` / ${delayStr}`;
        }
        const labelEl = html.querySelector(`#${labelId}`);
        if (labelEl)
            labelEl.textContent = title || "Loop";
    };
    ["mStart", "mDelay", "mCount", "mEnd"].forEach(member => {
        const input = html.querySelector(`#input_${member}_${_action.ObjHash(_seed)}`);
        if (input) {
            input.addEventListener("change", () => {
                const val = parseInt(input.value.trim());
                if (!isNaN(val))
                    _action[member] = val;
                updateLoopTitle();
            });
        }
    });
    updateLoopTitle();
    const textarea = html.querySelector("textarea");
    ToolTipAttach(textarea);
    textarea.addEventListener("blur", () => {
        const str = textarea.value.trim();
        _action.StrToData(str);
    });
    const deleteBtn = html.querySelector(`#btn_delete_action_${_action.ObjHash(_seed)}`);
    deleteBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        for (let i = 0; i < _task.mAction.length; ++i) {
            if (_task.mAction[i] == _action) {
                _task.mAction.splice(i, 1);
                WFTInit();
            }
        }
    });
    return html;
}
function WFTConditionInit(_task, _condition, _seed = 1) {
    const isReadonly = _seed === 2;
    const html = CDomFactory.DataToDom(`
        <div class="card mb-2 border border-primary bg-primary bg-opacity-10 p-1">
            <div class="card-header d-flex align-items-center justify-content-between gap-1 p-1">
                <div class="d-flex align-items-center gap-1">
                    <select id="logic_${_condition.ObjHash(_seed)}" class="form-select form-select-sm">
                        <option value="&&">&&</option>
                        <option value="||">||</option>
                    </select>
                </div>
                <div class="d-flex align-items-center gap-1">
                    <label class="form-label mb-0">Link</label>
                    <input id="link_${_condition.ObjHash(_seed)}" type="text" class="form-control form-control-sm" value="${_condition.mLink || ""}" />
                </div>
            </div>

            <div class="card-body d-flex flex-column gap-2 p-1">
                ${!isReadonly ? `
                <div class="d-flex gap-1 align-self-start">
                    <button id="btn_add_operator_${_condition.ObjHash(_seed)}" class="btn btn-outline-primary btn-sm">+ Operator</button>
                    <button id="btn_delete_condition_${_condition.ObjHash(_seed)}" class="btn btn-outline-danger btn-sm">X</button>
                </div>
            ` : ""}
                <div id="container_operator_${_condition.ObjHash(_seed)}" class="d-flex flex-column gap-2"></div>
            </div>
        </div>
    `);
    if (_seed == 2) {
        html.addEventListener('drop', (ev) => {
            ev.preventDefault();
            const sourceKey = ev.dataTransfer?.getData('sourceKey');
            _condition.mLink = sourceKey;
            WFTInit();
        });
    }
    const select = html.querySelector(`#logic_${_condition.ObjHash(_seed)}`);
    select.value = _condition.mLogic === "||" ? "||" : "&&";
    _condition.mLogic = select.value;
    select.addEventListener("change", () => {
        _condition.mLogic = select.value;
        WFTLeftInit();
    });
    const input = html.querySelector(`#link_${_condition.ObjHash(_seed)}`);
    input.addEventListener("change", () => {
        _condition.mLink = input.value.trim();
        WFTLeftInit();
    });
    const datalistId = `datalist_link_${_condition.ObjHash(_seed)}`;
    const dataList = document.createElement("datalist");
    dataList.id = datalistId;
    getAllTaskKeys().forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        dataList.appendChild(opt);
    });
    input.setAttribute("list", datalistId);
    input.parentElement?.appendChild(dataList);
    const container = html.querySelector(`#container_operator_${_condition.ObjHash(_seed)}`);
    const refreshOperatorView = () => {
        container.innerHTML = "";
        for (let op of _condition.mOperator) {
            const opTextarea = document.createElement("textarea");
            opTextarea.className = "form-control form-control-sm";
            opTextarea.rows = 2;
            opTextarea.value = op.DataToStr();
            ToolTipAttach(opTextarea);
            opTextarea.addEventListener("blur", () => {
                const str = opTextarea.value.trim();
                op.StrToData(str);
                WFTLeftInit();
            });
            container.appendChild(opTextarea);
        }
    };
    if (!isReadonly) {
        const btnAdd = html.querySelector(`#btn_add_operator_${_condition.ObjHash(_seed)}`);
        const btnDelete = html.querySelector(`#btn_delete_condition_${_condition.ObjHash(_seed)}`);
        btnAdd?.addEventListener("click", () => {
            _condition.mOperator.push(new CWFOperator());
            refreshOperatorView();
            WFTLeftInit();
        });
        btnDelete?.addEventListener("click", () => {
            for (let i = 0; i < _task.mCondition.length; ++i) {
                if (_task.mCondition[i] == _condition) {
                    _task.mCondition.splice(i, 1);
                    WFTInit();
                }
            }
        });
    }
    refreshOperatorView();
    return html;
}
function getAllTaskKeys() {
    if (gWF instanceof CWFSystemSingle) {
        return gWF.mTaskList.map(t => t.mKey);
    }
    else {
        return gWF.mTaskTree.GetArray().map(n => n.mKey);
    }
}
function WFTTaskInit(_task, _parent = null, _seed) {
    const collapseId = `task_body_${_task.ObjHash(_seed)}`;
    const collapseClass = _seed === 2 ? "collapse show" : "collapse";
    const html = CDomFactory.DataToDom(`
        <div class="card mb-2">
            <div class="card-header d-flex flex-column gap-2"
                style="cursor: pointer;"
                data-bs-toggle="collapse"
                data-bs-target="#${collapseId}"
                aria-expanded="false"
                aria-controls="${collapseId}">
                
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="min-width: 60px;">Key:</label>
                    <input id="input_key_${_task.ObjHash(_seed)}" type="text" class="form-control form-control-sm" value="${_task.mKey}" />
                    <button id="btn_delete_task_${_task.ObjHash(_seed)}" class="btn btn-outline-danger btn-sm">X</button>
                </div>
                ${_parent !== null ? `
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="min-width: 60px;">Parent:</label>
                    <input type="text" class="form-control form-control-sm" id="input_parent_${_task.ObjHash(_seed)}" value="${_parent}" />
                </div>
                ` : ""}
                
            </div>

            <div id="${collapseId}" class="${collapseClass}">
                <div class="card-body p-1">
                    <div class="d-flex justify-content-between mb-2">
                        <button id="btn_add_action_${_task.ObjHash(_seed)}" class="btn btn-danger btn-sm">+ Action</button>
                        <button id="btn_add_condition_${_task.ObjHash(_seed)}" class="btn btn-primary btn-sm">+ Condition</button>
                    </div>
                    <div id="container_action_${_task.ObjHash(_seed)}" class="d-flex flex-column gap-2 mb-2"></div>
                    <div id="container_condition_${_task.ObjHash(_seed)}" class="d-flex flex-column gap-2"></div>
                </div>
            </div>
        </div>
    `);
    if (_seed == 2) {
        html.setAttribute('draggable', 'true');
        html.addEventListener('dragstart', (ev) => {
            ev.dataTransfer?.setData('sourceKey', _task.Key());
        });
    }
    const keyInput = html.querySelector(`#input_key_${_task.ObjHash(_seed)}`);
    keyInput?.addEventListener("change", () => {
        const newKey = keyInput.value.trim();
        if (newKey !== "" && newKey !== _task.mKey) {
            _task.mKey = newKey;
            WFTInit();
        }
    });
    keyInput.addEventListener("click", (e) => {
        e.stopPropagation();
    });
    const parentInput = html.querySelector(`#input_parent_${_task.ObjHash(_seed)}`);
    if (parentInput) {
        parentInput?.addEventListener("change", () => {
            const pKey = parentInput.value;
            const tKey = keyInput.value;
            let wfm = gWF;
            let pNode = wfm.mTaskTree.Find(pKey);
            let tNode = wfm.mTaskTree.Find(tKey);
            if (pNode != null) {
                tNode.Destroy();
                let nNode = pNode.PushChilde(tKey);
                nNode.mData = tNode.mData;
                WFTInit();
            }
            else {
                CAlert.Info("parent find fail!");
            }
        });
        const datalistId = `datalist_parent_${_task.ObjHash(_seed)}`;
        const dataList = document.createElement("datalist");
        dataList.id = datalistId;
        getAllTaskKeys().forEach(key => {
            const opt = document.createElement("option");
            opt.value = key;
            dataList.appendChild(opt);
        });
        parentInput.setAttribute("list", datalistId);
        parentInput.parentElement?.appendChild(dataList);
        parentInput.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }
    const containerAction = html.querySelector(`#container_action_${_task.ObjHash(_seed)}`);
    const containerCondition = html.querySelector(`#container_condition_${_task.ObjHash(_seed)}`);
    for (let act of _task.mAction) {
        containerAction.appendChild(WFTActionInit(_task, act, _seed));
    }
    for (let cond of _task.mCondition) {
        containerCondition.appendChild(WFTConditionInit(_task, cond, _seed));
    }
    if (_seed != 2) {
        const btnAddAction = html.querySelector(`#btn_add_action_${_task.ObjHash(_seed)}`);
        btnAddAction?.addEventListener("click", () => {
            const action = new CWFAction();
            _task.mAction.push(action);
            containerAction.appendChild(WFTActionInit(_task, action, _seed));
            WFTLeftInit();
        });
        const btnAddCondition = html.querySelector(`#btn_add_condition_${_task.ObjHash(_seed)}`);
        btnAddCondition?.addEventListener("click", () => {
            const condition = new CWFCondition();
            _task.mCondition.push(condition);
            containerCondition.appendChild(WFTConditionInit(_task, condition, _seed));
            WFTLeftInit();
        });
    }
    else {
        const collapseHeaders = html.querySelectorAll(".card-header");
        collapseHeaders.forEach((collapseHeader) => {
            collapseHeader.removeAttribute("data-bs-toggle");
            collapseHeader.removeAttribute("data-bs-target");
            collapseHeader.removeAttribute("aria-expanded");
            collapseHeader.removeAttribute("aria-controls");
            collapseHeader.style.cursor = "default";
            collapseHeader.style.opacity = "0.6";
        });
        const addButtonGroup = html.querySelector(`#${collapseId} .card-body > .d-flex`);
        if (addButtonGroup) {
            addButtonGroup.remove();
        }
        const inputs = html.querySelectorAll("input, textarea, select, button");
        inputs.forEach(el => {
            if (el.tagName === "BUTTON") {
                el.hidden = true;
            }
            else if (el.tagName === "SELECT") {
                el.disabled = true;
            }
            else {
                el.readOnly = true;
            }
        });
        html.style.pointerEvents = "auto";
        html.style.cursor = "pointer";
        html.addEventListener("click", () => {
            const rightPanel = gModal.FindFlex(1);
            const selector = `#input_key_${_task.ObjHash(1)}`;
            const target = rightPanel.querySelector(selector);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "center" });
                target.focus();
            }
        });
    }
    const deleteBtn = html.querySelector(`#btn_delete_task_${_task.ObjHash(_seed)}`);
    deleteBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (gWF instanceof CWFSystemSingle) {
            const wfs = gWF;
            const idx = wfs.mTaskList.indexOf(_task);
            if (idx !== -1) {
                wfs.mTaskList.splice(idx, 1);
                WFTInit();
            }
        }
        else {
            const tKey = keyInput.value;
            let wfm = gWF;
            let tNode = wfm.mTaskTree.Find(tKey);
            tNode.Destroy();
            WFTInit();
        }
    });
    return html;
}
function WFTInit() {
    WFTLeftInit();
    WFTRightInit();
}
async function WFTLeftInit_Multi(wfm) {
    const leftPanel = CUtil.ID("WorkToolLeft_div");
    const root = wfm.mTaskTree;
    const seed = 2;
    const safeSpacing = 20;
    const renderMap = new Map();
    const depthHeightMap = new Map();
    function buildList(node, depth = 0) {
        if (!node)
            return;
        if (node.mData != null) {
            const subject = gAtl.Canvas("WorkTool").Push(new CSubject());
            subject.SetKey(node.mData.mKey);
            const html = WFTTaskInit(node.mData, node.mParent?.mKey, seed);
            const pt = subject.PushComp(new CPaintHTML(html, null, leftPanel));
            renderMap.set(node, {
                el: html,
                pt,
                subject,
                node,
                width: 0,
                height: 0,
                subtreeWidth: 0,
                depth,
            });
        }
        buildList(node.mChilde, depth + 1);
        buildList(node.mColleague, depth);
    }
    buildList(root.mChilde);
    for (const item of renderMap.values()) {
        await CChecker.Exe(async () => {
            if (item.pt.mAttach)
                return false;
            return true;
        }, 1);
        item.width = item.el.clientWidth || 150;
        item.height = item.el.clientHeight || 100;
        item.pt.SetSize(new CVec2(item.width, item.height));
        const prev = depthHeightMap.get(item.depth) || 0;
        if (item.height > prev) {
            depthHeightMap.set(item.depth, item.height);
        }
    }
    const depthTotalHeightMap = new Map();
    for (const [depth, height] of depthHeightMap) {
        let pHeight = depthHeightMap.get(depth - 1) || 0;
        depthTotalHeightMap.set(depth, height + pHeight);
    }
    function calcSubtreeWidth(node) {
        if (!node)
            return 0;
        const item = renderMap.get(node);
        let width = 0;
        let child = node.mChilde;
        while (child) {
            width += calcSubtreeWidth(child) + safeSpacing;
            child = child.mColleague;
        }
        if (node.mChilde)
            width -= safeSpacing;
        item.subtreeWidth = Math.max(width, item.width);
        return item.subtreeWidth;
    }
    calcSubtreeWidth(root.mChilde);
    function layout(node, startX, depth) {
        let x = startX;
        while (node) {
            const item = renderMap.get(node);
            let y = -depthTotalHeightMap.get(depth - 1) || 0;
            y -= (item.height * 0.5 + safeSpacing * depth);
            item.subject.SetPos(new CVec3(x, y, 0));
            let usedWidth = item.width;
            if (node.mChilde) {
                const childUsedWidth = layout(node.mChilde, x, depth + 1);
                usedWidth = Math.max(usedWidth, childUsedWidth - x);
            }
            const totalWidth = Math.max(usedWidth, item.subtreeWidth);
            x += totalWidth + safeSpacing;
            node = node.mColleague;
        }
        return x;
    }
    layout(root.mChilde, 0, 0);
    for (let task of wfm.mTaskTree.GetArray()) {
        WFTLinkLine(task.mData);
        let tSub = gAtl.Canvas("WorkTool").Find(task.mData.mKey);
        if (task.mParent != null && task.mParent.mKey != "") {
            let pSub = gAtl.Canvas("WorkTool").Find(task.mParent.mKey);
            const line = gAtl.Canvas("WorkTool").Push(new CSubject());
            let trail = line.PushComp(new CPaintTrail(gAtl.Frame().Pal().GetBlackTex()));
            trail.SetLen(10);
            trail.SetStaticPosList([tSub.GetPos(), pSub.GetPos()]);
            trail.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBAdd));
        }
    }
}
function WFTLinkLine(_task) {
    let sub = gAtl.Canvas("WorkTool").Find(_task.mKey);
    for (let con of _task.mCondition) {
        if (con.mLink != "") {
            let link = gAtl.Canvas("WorkTool").Find(con.mLink);
            const line = gAtl.Canvas("WorkTool").Push(new CSubject());
            let trail = line.PushComp(new CPaintTrail(gAtl.Frame().Pal().GetBlackTex()));
            trail.SetLen(10);
            trail.SetStaticPosList([sub.GetPos(), link.GetPos()]);
            trail.SetColorModel(new CColor(1, 0, 0, CColor.eModel.RGBAdd));
        }
    }
}
async function WFTLeftInit() {
    const leftPanel = CUtil.ID("WorkToolLeft_div");
    leftPanel.innerHTML = "";
    leftPanel.style.width = gAtl.PF().mWidth + "px";
    leftPanel.style.height = gAtl.PF().mHeight + "px";
    gAtl.Canvas("WorkTool").Clear();
    let bgSub = gAtl.Canvas("WorkTool").Push(new CSubject());
    bgSub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
    if (gWF instanceof CWFSystemSingle) {
        let wfs = gWF;
        const taskList = wfs.mTaskList;
        const taskCount = taskList.length;
        const centerX = gAtl.PF().mWidth / 2;
        const centerY = gAtl.PF().mHeight / 2;
        const cards = [];
        for (let task of taskList) {
            const sub = gAtl.Canvas("WorkTool").Push(new CSubject());
            sub.SetKey(task.Key());
            const html = WFTTaskInit(task, null, 2);
            const pt = sub.PushComp(new CPaintHTML(html, null, leftPanel));
            const el = pt.GetElement();
            cards.push({ sub, pt, el });
        }
        const safeSpacing = 50;
        const angleStep = (2 * Math.PI) / taskCount;
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < cards.length; ++i) {
            let pt = cards[i].pt;
            let el = cards[i].el;
            await CChecker.Exe(async () => {
                if (pt.mAttach)
                    return false;
                return true;
            }, 0);
            const w = el.clientWidth || 150;
            const h = el.clientHeight || 100;
            pt.SetSize(new CVec2(w, h));
            const rawRadiusX = (w + safeSpacing) / (2 * Math.sin(angleStep / 2));
            const rawRadiusY = (h + safeSpacing) / (2 * Math.sin(angleStep / 2));
            const expandFactor = 1.2;
            const radius = expandFactor * Math.min(1000, Math.max(rawRadiusX, rawRadiusY));
            const angle = angleStep * i;
            const x = centerX + radius * Math.cos(angle) - w / 2;
            const y = centerY + radius * Math.sin(angle) - h / 2;
            cards[i].sub.SetPos(new CVec3(x, y, 0));
            sumX += x;
            sumY += y;
        }
        if (cards.length > 0) {
            const avgX = sumX / cards.length;
            const avgY = sumY / cards.length;
            const center = new CVec3(avgX, avgY, 0);
            gAtl.Brush().GetCam2D().EyeMoveAndViewCac(center);
        }
        for (let task of taskList) {
            WFTLinkLine(task);
        }
    }
    else {
        let wfm = gWF;
        const taskTree = wfm.mTaskTree;
        taskTree.mColleague;
        taskTree.mChilde;
        taskTree.mData;
        WFTLeftInit_Multi(wfm);
    }
}
function WFTRightInit() {
    const rightPanel = gModal.FindFlex(1);
    rightPanel.innerHTML = "";
    const html = CDomFactory.DataToDom(`
        <div class="input-group mb-3">
            <input id="wf_add_input" type="text" class="form-control" placeholder="Enter value">
            <button id="wf_add_btn" class="btn btn-outline-secondary" type="button">Add</button>
        </div>
    `);
    rightPanel.appendChild(html);
    const input = CUtil.ID("wf_add_input");
    const button = CUtil.ID("wf_add_btn");
    if (gWF instanceof CWFSystemSingle) {
        let wfs = gWF;
        button.addEventListener("click", () => {
            const key = input.value.trim();
            const taskKey = key !== "" ? key : CUniqueID.GetHash(8);
            const exist = wfs.mTaskList.some(task => task.mKey === key);
            if (exist) {
                CAlert.E("동일한 키가 이미 존재합니다.");
                return;
            }
            wfs.mTaskList.push(new CWFTask(taskKey));
            input.value = "";
            WFTInit();
        });
        for (let task of wfs.mTaskList) {
            rightPanel.appendChild(WFTTaskInit(task, null, 1));
        }
    }
    else {
        let wfm = gWF;
        button.addEventListener("click", () => {
            const key = input.value.trim();
            const taskKey = key !== "" ? key : CUniqueID.GetHash(8);
            const exist = wfm.mTaskTree.Find(taskKey);
            if (exist != null) {
                CAlert.E("동일한 키가 이미 존재합니다.");
                return;
            }
            let node = wfm.mTaskTree.PushChilde(taskKey);
            node.mData = new CWFTask(taskKey);
            input.value = "";
            WFTInit();
        });
        for (let task of wfm.mTaskTree.GetArray()) {
            rightPanel.appendChild(WFTTaskInit(task.mData, task.mParent.mKey, 1));
        }
    }
}
function CutToolTip(_str, _index) {
    let i = _index - 1;
    let depth = 0;
    while (i >= 0) {
        const ch = _str[i];
        if (ch === ')') {
            depth++;
        }
        else if (ch === '(') {
            if (depth === 0)
                break;
            depth--;
        }
        else if (depth === 0 && /[\s;+\-*/=<>!&|^%?:,()[\]{}]/.test(ch)) {
            break;
        }
        i--;
    }
    let expr = _str.slice(i + 1, _index).trim();
    if (expr.endsWith(".")) {
        expr = expr.slice(0, -1);
    }
    expr = expr.replace(/\(\s*\)$/, "()");
    return expr;
}
function ToolTipAttach(_input) {
    function logCutResult() {
        const text = _input.value;
        const cursorIndex = _input.selectionStart ?? text.length;
        const result = CutToolTip(text, cursorIndex);
        console.log("✂️ CutToolTip 결과:", result);
        if (gToolTip != null)
            gToolTip.Destroy();
        let list = [];
        if (result == "") {
            for (let [key, value] of gWF.mLastEnv.mListener) {
                list.push([key, "Listener"]);
            }
            for (let [key, value] of CBlackBoard.Map()) {
                list.push([key, "BlackBoard"]);
            }
            let className = CClass.ClassName();
            for (let key of className) {
                list.push([key, "Class"]);
            }
        }
        else {
            let target;
            let pos = result.indexOf(".");
            if (pos != -1) {
                let first = result.substring(0, pos);
                let second = result.substring(pos + 1);
                target = gWF.mLastEnv.GetListener(first);
                if (target.Get != null)
                    target = target.Get(second);
                else
                    target = target[second];
            }
            else {
                target = gWF.mLastEnv.GetListener(result);
            }
            if (typeof target === "function") {
                let smhName = CClass.StaticMethodName(target);
                for (let key of smhName) {
                    list.push([key, "Static"]);
                }
                let smbName = CClass.StaticMemberName(target);
                for (let key of smbName) {
                    list.push([key, "Static"]);
                }
            }
            else if (typeof target === "object") {
                let mhName = CClass.MethodName(target, true);
                for (let key of mhName) {
                    list.push([key, "Function"]);
                }
                let mbName = CClass.MemberName(target, true);
                for (let key of mbName) {
                    list.push([key, "Member"]);
                }
            }
        }
        gToolTip = new CTooltipListAuto(list, _input, CTooltip.eTrigger.Manual);
        gToolTip.Open();
        gToolTip.SetMaxWidth(400);
        gToolTip.SetMaxHeight(400);
    }
    _input.addEventListener("mouseup", logCutResult);
    _input.addEventListener("keyup", (e) => {
        if (["ArrowRight"].includes(e.key)) {
            setTimeout(() => {
                logCutResult();
            }, 100);
        }
    });
    _input.addEventListener("input", () => {
        const cursor = _input.selectionStart ?? 0;
        const text = _input.value;
        const lastChar = text[cursor - 1];
        const triggerChars = ".;+-*/=%&|!<>^?:,";
        if (triggerChars.includes(lastChar) || text == "") {
            logCutResult();
        }
    });
    _input.addEventListener("blur", () => {
        WFTLeftInit();
        if (gToolTip)
            gToolTip.Destroy();
        gToolTip = null;
    });
}
