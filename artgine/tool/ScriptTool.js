import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CUtil } from "../basic/CUtil.js";
import { CAtelier } from "../canvas/CAtelier.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CPaint2D, CPaintHTML } from "../canvas/component/paint/CPaint2D.js";
import { CPaintTrail } from "../canvas/component/paint/CPaintTrail.js";
import { CCamCon2DFreeMove } from "../util/CCamCon.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CScript } from "../util/CScript.js";
import { CUtilWeb } from "../util/CUtilWeb.js";
import { CChecker } from "../util/CChecker.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CColor } from "../canvas/component/CColor.js";
var gModal;
var gAtl;
var gSC;
var gUpdateEvent;
var gEditer;
var gActiveBorder = null;
var gFunctionCards = [];
export function ScriptTool(_sc) {
    gSC = _sc;
    gModal = new CModalFlex([0.6, 0.4], "ScriptToolModal");
    gModal.mResize = true;
    gModal.SetHeader("ScriptTool");
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
    <canvas id="ScriptToolLeft_can"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;">
    </canvas>
    <div id="ScriptToolLeft_div"
         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events:none;">
    </div>
  </div>
    `);
    leftPanel.append(canvas);
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "ScriptToolLeft_can", false).then(() => {
        ScriptToolInit();
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
    });
    gAtl.NewCanvas("ScriptTool");
    gAtl.Canvas("ScriptTool").SetCameraKey("2D");
    gUpdateEvent = new CEvent(ScriptToolUpdate);
    gAtl.Frame().PushEvent(CEvent.eType.Update, gUpdateEvent);
    CUtilWeb.MonacoEditer(rightPanel, gSC.mSource, "typescript", "vs-dark", (_editer) => {
        gEditer = _editer;
        gEditer.onDidBlurEditorWidget(() => {
            gSC.mSource = gEditer.getModel().getValue();
            CScript.Remove(gSC.mKey);
            CUtilWeb.TSImport(gSC.mSource, true);
            ScriptToolInit();
        });
    });
    gModal.On(CEvent.eType.Close, () => {
        gSC.mSource = gEditer.getModel().getValue();
        CScript.Remove(gSC.mKey);
    });
}
var gLastActive = "";
var gActiveElement = null;
function ScriptToolUpdate(_delay) {
    if (gSC && gAtl && gLastActive != gSC.mActiveFun) {
        if (gActiveElement) {
            gActiveElement.classList.remove('border-danger', 'border-3');
            gActiveElement.style.border = '';
            gActiveElement = null;
        }
        let acSub = gAtl.Canvas("ScriptTool").Find(gSC.mActiveFun);
        if (acSub) {
            let pt = acSub.FindComp(CPaintHTML);
            if (pt) {
                const element = pt.GetElement();
                if (element) {
                    element.classList.add('border-danger', 'border-3');
                    gActiveElement = element;
                }
            }
        }
        gLastActive = gSC.mActiveFun;
    }
}
function ScriptToolInit() {
    gLastActive = "";
    const scriptStructure = ExtractScriptStructure(gSC.mSource);
    ScriptToolLeftInit(scriptStructure);
}
function ScriptToolLeftInit(scriptStructure) {
    const leftPanel = CUtil.ID("ScriptToolLeft_div");
    leftPanel.innerHTML = "";
    gAtl.Canvas("ScriptTool").Clear();
    let bgSub = gAtl.Canvas("ScriptTool").PushSub(new CSubject());
    bgSub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
    const functionCards = [];
    const centerX = gAtl.PF().mWidth / 2;
    const centerY = gAtl.PF().mHeight / 2;
    for (let func of scriptStructure) {
        const sub = gAtl.Canvas("ScriptTool").PushSub(new CSubject());
        sub.SetKey(func.function);
        const html = CreateFunctionCard(func);
        const pt = sub.PushComp(new CPaintHTML(html, null, leftPanel));
        const el = pt.GetElement();
        functionCards.push({ sub, pt, el, func });
    }
    setTimeout(async () => {
        for (let i = 0; i < functionCards.length; i++) {
            const card = functionCards[i];
            await CChecker.Exe(async () => {
                if (card.pt.mAttach)
                    return false;
                return true;
            }, 1);
            const w = card.el.clientWidth || 280;
            const h = card.el.clientHeight || 200;
            card.pt.SetSize(new CVec2(w, h));
            const angleStep = (2 * Math.PI) / functionCards.length;
            const angle = angleStep * i;
            const cardDiagonal = Math.sqrt(w * w + h * h);
            const minSpacing = cardDiagonal + 20;
            const minRadius = minSpacing / (2 * Math.sin(angleStep / 2));
            const radius = Math.max(minRadius, 200);
            const x = centerX + radius * Math.cos(angle) - w / 2;
            const y = centerY + radius * Math.sin(angle) - h / 2;
            card.sub.SetPos(new CVec3(x, y, 0));
        }
        if (functionCards.length > 0) {
            let sumX = 0;
            let sumY = 0;
            for (let card of functionCards) {
                const pos = card.sub.GetPos();
                sumX += pos.x;
                sumY += pos.y;
            }
            const avgX = sumX / functionCards.length;
            const avgY = sumY / functionCards.length;
            const center = new CVec3(avgX, avgY, 0);
            gAtl.Brush().GetCam2D().EyeMoveAndViewCac(center);
        }
        DrawFunctionConnections(functionCards);
    }, 0);
}
function CreateFunctionCard(func) {
    const conditionReturnPairs = [];
    for (let i = 0; i < func.if.length; i++) {
        const condition = func.if[i];
        const returnValue = func.return[i] || "null";
        conditionReturnPairs.push(`${condition} → ${returnValue}`);
    }
    for (let i = func.if.length; i < func.return.length; i++) {
        const returnValue = func.return[i];
        if (returnValue !== "null") {
            conditionReturnPairs.push(`→ ${returnValue}`);
        }
    }
    const html = CDomFactory.DataToDom(`
        <div class="card shadow-sm" style="width: 280px;">
            <div class="card-header text-center py-3">
                <h6 class="mb-0 fw-bold">${func.function}</h6>
            </div>
            <div class="card-body p-3">
                <div>
                    <div class="mt-2">
                        ${conditionReturnPairs.length > 0 ?
        conditionReturnPairs.map((pair) => `<div class="badge bg-info text-white me-1 mb-1 fs-6">${pair}</div>`).join('') :
        '<span class="text-muted opacity-50">null</span>'}
                    </div>
                </div>
            </div>
        </div>
    `);
    return html;
}
function DrawFunctionConnections(functionCards) {
    for (let card of functionCards) {
        const fromPos = card.sub.GetPos();
        const fromSize = card.pt.GetSize();
        for (let i = 0; i < card.func.return.length; i++) {
            const returnValue = card.func.return[i];
            if (returnValue !== "null") {
                const targetCard = functionCards.find(c => c.func.function === returnValue);
                if (targetCard) {
                    const toPos = targetCard.sub.GetPos();
                    const toSize = targetCard.pt.GetSize();
                    let startPos;
                    let endPos;
                    if (card.func.function === returnValue) {
                        startPos = new CVec3(fromPos.x, fromPos.y + fromSize.y * 0.5, fromPos.z);
                        endPos = new CVec3(toPos.x, toPos.y - toSize.y * 0.3, toPos.z);
                    }
                    else {
                        startPos = new CVec3(fromPos.x, fromPos.y + fromSize.y * 0.5, fromPos.z);
                        endPos = new CVec3(toPos.x, toPos.y - toSize.y * 0.3, toPos.z);
                    }
                    const line = gAtl.Canvas("ScriptTool").PushSub(new CSubject());
                    const trail = line.PushComp(new CPaintTrail(gAtl.Frame().Pal().GetBlackTex()));
                    trail.SetLen(10);
                    trail.SetStaticPosList([startPos, endPos]);
                    trail.SetColorModel(new CColor(1, 0.5, 0, CColor.eModel.RGBAdd));
                }
            }
        }
    }
}
function ExtractIfReturnStructure(source) {
    const results = [];
    const functionRegex = /export\s+function\s+(\w+)\s*\([^)]*\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
    let match;
    while ((match = functionRegex.exec(source)) !== null) {
        const functionName = match[1];
        const functionBody = match[2];
        const ifConditions = [];
        const returnValues = [];
        const ifRegex = /if\s*\(([^)]+)\)\s*\{?\s*return\s+["']([^"']+)["']\s*;?\s*\}?/g;
        let ifMatch;
        while ((ifMatch = ifRegex.exec(functionBody)) !== null) {
            ifConditions.push(ifMatch[1].trim());
            returnValues.push(ifMatch[2]);
        }
        const simpleReturnRegex = /return\s+["']([^"']+)["']\s*;?/g;
        let returnMatch;
        while ((returnMatch = simpleReturnRegex.exec(functionBody)) !== null) {
            const returnValue = returnMatch[1];
            if (!returnValues.includes(returnValue)) {
                returnValues.push(returnValue);
            }
        }
        const nullReturnRegex = /return\s+null\s*;?/g;
        if (nullReturnRegex.test(functionBody) && !returnValues.includes("null")) {
            returnValues.push("null");
        }
        results.push({
            "function": functionName,
            "if": ifConditions,
            "return": returnValues
        });
    }
    return results;
}
function ExtractScriptStructure(source) {
    const ifReturnStructure = ExtractIfReturnStructure(source);
    const functionNames = ifReturnStructure.map(item => item.function);
    return ifReturnStructure;
}
