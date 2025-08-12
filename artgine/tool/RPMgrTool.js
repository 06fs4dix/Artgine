import { CAlert } from "../basic/CAlert.js";
import { CClass } from "../basic/CClass.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CAtelier } from "../canvas/CAtelier.js";
import { CColor } from "../canvas/component/CColor.js";
import { CPaintHTML } from "../canvas/component/paint/CPaint2D.js";
import { CPaintTrail } from "../canvas/component/paint/CPaintTrail.js";
import { CRPAuto } from "../canvas/CRPMgr.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CSurface } from "../canvas/subject/CSurface.js";
import { CMath } from "../geometry/CMath.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CShader, CShaderList } from "../render/CShader.js";
import { CShaderAttr } from "../render/CShaderAttr.js";
import { CTexture } from "../render/CTexture.js";
import { CCamCon2DFreeMove } from "../util/CCamCon.js";
import { CChecker } from "../util/CChecker.js";
var gModal;
var gAtl;
var gRPMgr;
var gShaderListArr = [];
var gShaderArr = [];
var gTexArr = [];
export function RPMgrTool(_rpMgr) {
    gRPMgr = _rpMgr;
    gModal = new CModalFlex([0.7, 0.3], "RPModal");
    gModal.SetHeader("RPMgrTool");
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
        <canvas id="RPLeft_can"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;">
        </canvas>
        <div id="RPLeft_div"
             style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events:none;">
        </div>
      </div>
    `);
    leftPanel.append(canvas);
    gModal.On(CEvent.eType.Close, () => {
        if (gRPMgr.GetCanvas() != null) {
            gRPMgr.GetCanvas().SetRPMgr(gRPMgr);
        }
    });
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "RPLeft_can", false).then(() => {
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
        RPToolInit();
    });
    gAtl.NewCanvas("RPTool");
    gAtl.Canvas("RPTool").SetCameraKey("2D");
}
function RPToolResChk() {
    gShaderListArr = [];
    gShaderArr = [];
    gTexArr = [""];
    if (gRPMgr.GetCanvas() != null) {
        for (let key of gRPMgr.GetCanvas().GetFrame().Res().Keys()) {
            let value = gRPMgr.GetCanvas().GetFrame().Res().Find(key);
            if (value instanceof CShaderList) {
                gShaderListArr.push(key);
            }
            else if (value instanceof CShader) {
                gShaderArr.push(key);
            }
            else if (value instanceof CTexture && value.IsFrameBuf()) {
                gTexArr.push(key);
            }
        }
    }
    else {
        for (let [key, value] of gRPMgr.mTexMap) {
            gTexArr.push(key);
        }
        for (let value of gRPMgr.mSufArr) {
            gTexArr.push(value.GetTexKey());
        }
        for (let key of gAtl.Frame().Res().Keys()) {
            let value = gRPMgr.GetCanvas().GetFrame().Res().Find(key);
            if (value instanceof CShaderList) {
                gShaderListArr.push(key);
            }
            else if (value instanceof CShader) {
                gShaderArr.push(key);
            }
        }
    }
}
function RPToolRPEx(_rp) {
    _rp.EditFormEx = (_pointer, _body, _input) => {
        if (_pointer.member == "mShader") {
            let sList = [];
            sList.push(...gShaderListArr);
            sList.push(...gShaderArr);
            _body.append(CUtilObj.Select(_pointer, _input, sList, sList, true));
        }
        else if (_pointer.member == "mRenderTarget") {
            let sList = [];
            sList.push(...gTexArr);
            _body.append(CUtilObj.Select(_pointer, _input, sList, sList, false));
        }
        else if (_pointer.member == "mShaderAttr") {
            for (let sa of _rp.mShaderAttr) {
                if (sa.mType == -2) {
                    sa.EditFormEx = (_pointer2, _body2, _input2) => {
                        if (_pointer2.member == "mKey") {
                            let sList = [];
                            sList.push(...gTexArr);
                            _body2.append(CUtilObj.Select(_pointer2, _input2, sList, sList, false));
                        }
                    };
                }
            }
        }
    };
    _rp.EditChangeEx = (_pointer, _childe) => {
        RPToolLeftInit();
    };
}
function RPToolRPAutoInit(_rp) {
    const hash = _rp.ObjHash();
    const collapseId = `collapse_${hash}`;
    const html = CDomFactory.DataToDom(`
        <div class="card mb-2" id="cardRight_${hash}">
            <div class="card-header d-flex justify-content-between align-items-center"
                 style="cursor: pointer;"
                 data-bs-toggle="collapse"
                 data-bs-target="#${collapseId}"
                 aria-expanded="false"
                 aria-controls="${collapseId}">
                <div class="flex-grow-1" style="min-width: 0; overflow: hidden;">
                    <div class="fw-bold text-primary text-truncate">${hash}</div>
                    <div class="text-truncate">${_rp.mPriority}-${_rp.mShader}</div>
                </div>
                <button class="btn btn-sm btn-close ms-auto" style="pointer-events:auto; flex-shrink: 0; min-width: 24px;"></button>
            </div>
            <div class="collapse" id="${collapseId}">
                <div class="card-body" id="${collapseId}_body"></div>
            </div>
        </div>
    `);
    const body = html.querySelector(`#${collapseId}_body`);
    if (body) {
        body.append(_rp.EditInit(null));
    }
    const closeBtn = html.querySelector(".btn-close");
    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        gRPMgr.RemoveRP(_rp);
        const parent = gModal.FindFlex(1)?.querySelector("#tab-content");
        parent.innerHTML = "";
        RPToolRightRPTabInit(parent);
    });
    RPToolRPEx(_rp);
    return html;
}
function RPToolTexInit(_tex) {
    const hash = _tex.ObjHash();
    const collapseId = `collapse_${hash}`;
    const html = CDomFactory.DataToDom(`
        <div class="card mb-2" id="cardRight_${hash}">
            <div class="card-header d-flex justify-content-between align-items-center"
                 style="cursor: pointer;"
                 data-bs-toggle="collapse"
                 data-bs-target="#${collapseId}"
                 aria-expanded="false"
                 aria-controls="${collapseId}">
                <div class="flex-grow-1" style="min-width: 0; overflow: hidden;">
                    <input type="text" class="form-control form-control-sm mb-1" id="${collapseId}_key_input" value="${_tex.Key() || ""}" style="width:100%; max-width: 200px;" />
                </div>
                <button class="btn btn-sm btn-close ms-auto" style="pointer-events:auto; flex-shrink: 0; min-width: 24px;"></button>
            </div>
            <div class="collapse" id="${collapseId}">
                <div class="card-body" id="${collapseId}_body"></div>
            </div>
        </div>
    `);
    const body = html.querySelector(`#${collapseId}_body`);
    if (body) {
        body.append(_tex.EditInit(null));
    }
    const keyInput = html.querySelector(`#${collapseId}_key_input`);
    if (keyInput) {
        keyInput.addEventListener('change', () => {
            const newKey = keyInput.value.trim();
            if (newKey) {
                gRPMgr.RemoveTex(_tex.Key());
                _tex.SetKey(newKey);
                gRPMgr.PushTex(newKey, _tex);
            }
        });
    }
    const closeBtn = html.querySelector(".btn-close");
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        gRPMgr.RemoveTex(_tex.Key());
        const parent = gModal.FindFlex(1)?.querySelector("#tab-content");
        parent.innerHTML = "";
        RPToolRightTexTabInit(parent);
    });
    return html;
}
function RPToolSufInit(_suf) {
    const hash = _suf.ObjHash();
    const collapseId = `collapse_${hash}`;
    const html = CDomFactory.DataToDom(`
        <div class="card mb-2" id="cardRight_${hash}">
            <div class="card-header d-flex justify-content-between align-items-center"
                 style="cursor: pointer;"
                 data-bs-toggle="collapse"
                 data-bs-target="#${collapseId}"
                 aria-expanded="false"
                 aria-controls="${collapseId}">
                <div class="flex-grow-1 fw-bold text-primary" style="min-width: 0; overflow: hidden; text-truncate;">${_suf.ObjHash()}</div>
                <button class="btn btn-sm btn-close ms-auto" style="pointer-events:auto; flex-shrink: 0; min-width: 24px;"></button>
            </div>
            <div class="collapse" id="${collapseId}">
                <div class="card-body" id="${collapseId}_body"></div>
            </div>
        </div>
    `);
    const body = html.querySelector(`#${collapseId}_body`);
    if (body) {
        body.append(_suf.EditInit(null));
    }
    const closeBtn = html.querySelector(".btn-close");
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        gRPMgr.RemoveSuf(_suf);
        const parent = gModal.FindFlex(1)?.querySelector("#tab-content");
        parent.innerHTML = "";
        RPToolRightSufTabInit(parent);
    });
    RPToolRPEx(_suf.GetRP());
    _suf.EditChangeEx = () => {
        const parent = gModal.FindFlex(1)?.querySelector("#tab-content");
        parent.innerHTML = "";
        RPToolRightSufTabInit(parent);
    };
    return html;
}
function RPToolRightRPTabInit(container) {
    RPToolResChk();
    RPToolLeftInit();
    const addHTML = CDomFactory.DataToDom(`
        <div class="mb-3">
            <button id="btn_add_rp" class="btn btn-primary">RPAuto Add</button>
        </div>
    `);
    container.appendChild(addHTML);
    const addBtn = addHTML.querySelector("#btn_add_rp");
    addBtn.onclick = () => {
        container.innerHTML = "";
        const newRP = new CRPAuto();
        gRPMgr.PushRP(newRP);
        RPToolRightRPTabInit(container);
    };
    gRPMgr.mRPArr.forEach((rp) => {
        container.appendChild(RPToolRPAutoInit(rp));
    });
}
function RPToolRightTexTabInit(container) {
    RPToolResChk();
    const addHTML = CDomFactory.DataToDom(`
        <div class="mb-3">
            <button id="btn_add_tex" class="btn btn-primary">RenderTarget Add</button>
        </div>
    `);
    container.appendChild(addHTML);
    const addBtn = addHTML.querySelector("#btn_add_tex");
    addBtn.onclick = () => {
        container.innerHTML = "";
        const newTex = new CTexture();
        newTex.SetKey(CUniqueID.Get());
        gRPMgr.PushTex(newTex.Key(), newTex);
        RPToolRightTexTabInit(container);
    };
    gRPMgr.mTexMap.forEach((tex) => {
        container.appendChild(RPToolTexInit(tex));
    });
}
function RPToolRightSufTabInit(container) {
    RPToolLeftInit();
    const addHTML = CDomFactory.DataToDom(`
        <div class="mb-3 d-flex align-items-center gap-2">
            <select id="suf_select" class="form-select form-select-sm"></select>
            <button id="btn_add_suf" class="btn btn-primary btn-sm">Add Surface</button>
        </div>
    `);
    container.appendChild(addHTML);
    let ext = CClass.ExtendsList(CSurface);
    const select = addHTML.querySelector("#suf_select");
    ext.forEach(cls => {
        const option = document.createElement("option");
        option.value = cls.constructor.name;
        option.textContent = cls.constructor.name;
        select.appendChild(option);
    });
    const addBtn = addHTML.querySelector("#btn_add_suf");
    addBtn.onclick = () => {
        container.innerHTML = "";
        const selectedClass = select.value;
        if (selectedClass) {
            const newSuf = CClass.New(selectedClass);
            gRPMgr.PushSuf(newSuf);
        }
        RPToolRightSufTabInit(container);
    };
    gRPMgr.mSufArr.forEach((suf) => {
        container.appendChild(RPToolSufInit(suf));
    });
}
function RPToolInit() {
    RPToolLeftInit();
    RPToolRightInit();
}
function RPToolRightInit() {
    const rightPanel = gModal.FindFlex(1);
    rightPanel.innerHTML = "";
    const tabs = CDomFactory.DataToDom(`
        <ul class="nav nav-tabs mb-2" id="rpTabMenu">
            <li class="nav-item"><a class="nav-link active" id="tab-rp" href="#">RP</a></li>
            <li class="nav-item"><a class="nav-link" id="tab-suf" href="#">Suf</a></li>
            <li class="nav-item"><a class="nav-link" id="tab-tex" href="#">Tex</a></li>
        </ul>
        <div id="tab-content" class="tab-content"></div>
    `);
    rightPanel.appendChild(tabs);
    const contentDiv = rightPanel.querySelector("#tab-content");
    const switchTab = (target) => {
        ["rp", "suf", "tex"].forEach(id => {
            const tab = document.getElementById(`tab-${id}`);
            if (tab)
                tab.classList.toggle("active", id === target);
        });
        contentDiv.innerHTML = "";
        if (target === "rp")
            RPToolRightRPTabInit(contentDiv);
        if (target === "suf")
            RPToolRightSufTabInit(contentDiv);
        if (target === "tex")
            RPToolRightTexTabInit(contentDiv);
    };
    ["rp", "suf", "tex"].forEach(id => {
        const tab = document.getElementById(`tab-${id}`);
        if (tab)
            tab.addEventListener("click", e => {
                e.preventDefault();
                switchTab(id);
            });
    });
    switchTab("rp");
}
var gLeftInit = false;
async function RPToolLeftInit() {
    if (gLeftInit == true)
        return;
    gLeftInit = true;
    gAtl.Canvas("RPTool").Clear();
    const leftPanel = CUtil.ID("RPLeft_div");
    const marginX = 30;
    const marginY = 30;
    let rpArr = [];
    for (let i = 0; i < gTexArr.length; ++i) {
        let texKey = gTexArr[i];
        const simpleHtml = `
            <div class="card mb-2" id="cardLeft_tex_${texKey}">
                <div class="card-header fw-bold" style="pointer-events:auto; cursor:pointer;">
                    <span style="color: green;">CTexture</span> : 
                </div>
                <div class="card-body p-2 small text-muted">
                    ${texKey}
                </div>
            </div>
        `;
        let sub = gAtl.Canvas("RPTool").Push(new CSubject());
        let html = CDomFactory.DataToDom(simpleHtml);
        html.style.pointerEvents = "auto";
        html.style.cursor = "pointer";
        let pt = sub.PushComp(new CPaintHTML(html, null, leftPanel));
        pt.SetSize(new CVec2(200, 100));
        sub.SetPos(new CVec3(-100 - marginX, -i * (100 + marginY), 0));
        html.setAttribute('draggable', 'true');
        html.addEventListener('dragstart', (ev) => {
            ev.dataTransfer?.setData('sourceKey', texKey);
        });
    }
    for (let rp of gRPMgr.mRPArr) {
        rpArr.push({ key: rp.ObjHash(), value: rp });
    }
    for (let suf of gRPMgr.mSufArr) {
        rpArr.push({ key: suf.ObjHash(), value: suf.GetRP() });
    }
    rpArr.sort((a, b) => a.value.mPriority - b.value.mPriority);
    for (let { key, value } of rpArr) {
        let cardBodyTop = 'In : ';
        let cardBodyCenter = '';
        let cardBodyBottom = 'Out : ';
        if (value.mDepthTest != null)
            cardBodyCenter += `<div>DepthTest: ${value.mDepthTest}</div>`;
        if (value.mDepthWrite != null)
            cardBodyCenter += `<div>DepthWrite: ${value.mDepthWrite}</div>`;
        if (value.mAlpha != null)
            cardBodyCenter += `<div>Alpha: ${value.mAlpha}</div>`;
        if (value.mCullFace != null)
            cardBodyCenter += `<div>CullFace: ${value.mCullFace}</div>`;
        if (value.mCamera != null)
            cardBodyCenter += `<div>Camera: ${value.mCamera}</div>`;
        if (value.mCullFrustum != true)
            cardBodyCenter += `<div>CullFrustum: ${value.mCullFrustum}</div>`;
        if (value.mClearDepth != null)
            cardBodyCenter += `<div>ClearDepth: ${value.mClearDepth}</div>`;
        if (value.mClearColor != null)
            cardBodyCenter += `<div>ClearColor: ${value.mClearColor}</div>`;
        if (value.mBlitType != 0)
            cardBodyCenter += `<div>BlitType: ${value.mBlitType}</div>`;
        if (value.mLine != null)
            cardBodyCenter += `<div>Line: ${value.mLine}</div>`;
        if (value.mTag !== '')
            cardBodyCenter += `<div>Tag: ${value.mTag}</div>`;
        for (let sa of value.mShaderAttr) {
            if (sa.mType == -2) {
                cardBodyTop += sa.mKey + " Off-" + sa.mEach + "<br>";
            }
            else
                cardBodyCenter += `<div>${sa.ToLog()}</div>`;
        }
        if (value.mRenderTarget != "") {
            cardBodyBottom += value.mRenderTarget + " ";
            for (let use of value.mRenderTargetUse) {
                cardBodyBottom += use + " ";
            }
            cardBodyBottom += "Levle-" + value.mRenderTargetLevel;
        }
        let header = "";
        if (gRPMgr.mRPArr.some(rp => rp.ObjHash() === value.ObjHash())) {
            header = `
               
                    <span style="color: blue;">CAutoRP</span> : ${value.mPriority}<br>${key}
              
            `;
        }
        else {
            header = `
                
                    <span style="color: red;">CSurface</span> : ${value.mPriority}<br>${key}
                
            `;
        }
        let cardHtml = `
            <div class="card mb-2" id="cardLeft_${key}">
                <div class="card-header fw-bold"
                    data-key="${key}"
                    data-type="${gRPMgr.mRPArr.some(rp => rp.ObjHash() === value.ObjHash()) ? "rp" : "suf"}"
                
                >${header}</div>
                <div class="card-body p-2">
                    <div class="card-body-top">
                        ${cardBodyTop || ""}
                    </div>
                    <div class="card-body-center border-top pt-2 mt-2">
                        ${cardBodyCenter || ""}
                    </div>
                    <div class="card-body-bottom border-top pt-2 mt-2 text-muted small">
                        ${cardBodyBottom || ""}
                    </div>
                </div>
            </div>
        `;
        let sub = gAtl.Canvas("RPTool").Push(new CSubject());
        sub.SetKey(key);
        let html = CDomFactory.DataToDom(cardHtml);
        html.style.pointerEvents = "auto";
        html.style.cursor = "pointer";
        sub.PushComp(new CPaintHTML(html, null, leftPanel));
        sub.SetPos(new CVec3(0, 0, 0));
        html.setAttribute('draggable', 'true');
        html.addEventListener('dragstart', (ev) => {
            ev.dataTransfer?.setData('sourceKey', key);
        });
        html.addEventListener('dragover', (ev) => ev.preventDefault());
        html.addEventListener('drop', (ev) => {
            ev.preventDefault();
            const sourceKey = ev.dataTransfer?.getData('sourceKey');
            const targetKey = key;
            if (sourceKey != targetKey) {
                const sourceRP = rpArr.find(r => r.key === sourceKey)?.value;
                const targetRP = rpArr.find(r => r.key === targetKey)?.value;
                if (sourceRP == null)
                    targetRP.mRenderTarget = sourceKey;
                else if (sourceRP.mRenderTarget != "")
                    targetRP.mShaderAttr.push(new CShaderAttr(0, sourceRP.mRenderTarget));
                RPToolLeftInit();
            }
        });
    }
    let lastPriority = null;
    let currentX = 0;
    let currentY = 0;
    let columnMaxWidth = 0;
    for (let { key, value } of rpArr) {
        let sub = gAtl.Canvas("RPTool").Find(key);
        let pt = sub.FindComp(CPaintHTML);
        if (pt == null) {
            CAlert.E(key + "error");
            gAtl.Canvas("RPTool").Find(key);
        }
        await CChecker.Exe(async () => (pt.mAttach ? false : true), 1);
        let size = new CVec2();
        let html = pt.GetElement();
        size.x = html.clientWidth + 10 || 150;
        size.y = html.clientHeight + 10 || 100;
        pt.SetSize(size);
        pt.SetPivot(new CVec3(1, -1, 1));
        if (lastPriority === null || value.mPriority !== lastPriority) {
            if (lastPriority !== null) {
                currentX += columnMaxWidth + marginX;
            }
            lastPriority = value.mPriority;
            columnMaxWidth = size.x;
            currentY = 0;
        }
        else {
            currentY += size.y + marginY;
            columnMaxWidth = Math.max(columnMaxWidth, size.x);
        }
        sub.SetPos(new CVec3(currentX, -currentY, 0));
        let headerDiv = html.querySelector(".card-header");
        headerDiv.addEventListener("click", () => {
            let type = headerDiv.getAttribute("data-type");
            let id = headerDiv.getAttribute("data-key");
            let activeTab = document.querySelector(".nav-tabs .nav-link.active");
            let targetTab = document.getElementById(type === "rp" ? "tab-rp" : "tab-suf");
            if (targetTab && targetTab !== activeTab) {
                targetTab.click();
            }
            setTimeout(() => {
                let cardElem = document.getElementById(`cardRight_${id}`);
                if (cardElem) {
                    const trigger = cardElem.querySelector('[data-bs-toggle="collapse"]');
                    if (trigger) {
                        let isExpanded = trigger.getAttribute('aria-expanded') === 'true';
                        if (!isExpanded) {
                            trigger.click();
                        }
                    }
                    cardElem.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 100);
        });
    }
    gLeftInit = false;
    RPToolLeftLine();
}
function RPToolLeftLine() {
    let rpArr = [];
    for (let rp of gRPMgr.mRPArr) {
        rpArr.push({ key: rp.ObjHash(), value: rp });
    }
    for (let suf of gRPMgr.mSufArr) {
        rpArr.push({ key: suf.ObjHash(), value: suf.GetRP() });
    }
    let FindTex = (_find) => {
        for (let { key, value } of rpArr) {
            if (value.mRenderTarget == _find)
                return key;
        }
        return null;
    };
    for (let { key, value } of rpArr) {
        for (let sa of value.mShaderAttr) {
            if (sa.mType == -2) {
                let texObj = FindTex(sa.mKey);
                let org = gAtl.Canvas("RPTool").Find(key);
                let tar = gAtl.Canvas("RPTool").Find(texObj);
                if (org != null && tar != null) {
                    const line = gAtl.Canvas("RPTool").Push(new CSubject());
                    let trail = line.PushComp(new CPaintTrail(gAtl.Frame().Pal().GetBlackTex()));
                    trail.SetLen(5);
                    trail.SetLastHide(false);
                    let orgSize = org.FindComp(CPaintHTML).mOrgSize;
                    let tarSize = tar.FindComp(CPaintHTML).mOrgSize;
                    trail.SetStaticPosList([CMath.V3AddV3(org.GetPos(), new CVec3(orgSize.x * 0.5, -orgSize.y * 0.5)),
                        CMath.V3AddV3(tar.GetPos(), new CVec3(tarSize.x * 0.5, -tarSize.y * 0.5))]);
                    trail.SetColorModel(new CColor(1, 0, 0, CColor.eModel.RGBAdd));
                }
            }
        }
    }
}
