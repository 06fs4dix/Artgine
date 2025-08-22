import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CModal } from "../basic/CModal.js";
import { CPreferences } from "../basic/CPreferences.js";
import { CUtil } from "../basic/CUtil.js";
import { CBrush } from "../canvas/CBrush.js";
import { CCanvas } from "../canvas/CCanvas.js";
import { CPaint2D, CPaintHTML } from "../canvas/component/paint/CPaint2D.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CRenderPass } from "../render/CRenderPass.js";
import { CCamCon2DFreeMove } from "../util/CCamCon.js";
import { CChecker } from "../util/CChecker.js";
import { CFrame } from "../util/CFrame.js";
let g_roBrush;
let g_roPriority;
let g_colorMap = new Map();
let g_remains = new Map();
let g_modal;
export function RenderQueTool(_brush) {
    g_roBrush = _brush;
    g_modal = new CModal("RenderOrderModal");
    g_modal.mResize = true;
    g_modal.SetSize(1400, 600);
    g_modal.SetTitle(CModal.eTitle.TextMinFullClose);
    g_modal.SetHeader("RenderOrderModal");
    g_modal.SetBody(`<div style='height:100%;' id='RenderOrderTool_div'>
            <canvas id='renderOrderCanvas'/>
        </div>`);
    g_modal.On(CEvent.eType.Open, () => { Open(); });
    g_modal.On(CEvent.eType.Close, () => { Close(); });
    g_modal.Open();
}
var g_fw = null;
var g_brush = null;
var g_can = null;
function Open() {
    let pf = new CPreferences();
    g_fw = new CFrame(pf, "renderOrderCanvas");
    g_fw.PushEvent(CEvent.eType.Load, new CEvent(Load));
    g_fw.PushEvent(CEvent.eType.Init, new CEvent(Init));
    g_fw.PushEvent(CEvent.eType.Update, new CEvent(Update));
    g_fw.PushEvent(CEvent.eType.Render, new CEvent(Render));
    g_fw.Process();
}
function Close() {
    if (g_fw) {
        g_fw.Win().Handle().remove();
        g_fw.Destroy();
        g_fw = null;
    }
    g_roBrush = null;
    g_colorMap.clear();
}
async function Load() {
    await g_fw.Pal().Load(g_fw);
}
function Init() {
    g_fw.Pal().Init(g_fw);
    g_brush = new CBrush(g_fw);
    g_brush.InitCamera();
    g_can = new CCanvas(g_fw, g_brush);
    g_brush.GetCam2D().SetCamCon(new CCamCon2DFreeMove(g_fw.Input()));
    var sub = g_can.Push(new CSubject());
    sub.PushComp(new CPaint2D(g_fw.Pal().GetNoneTex(), new CVec2(128, 128)));
    let posX = 0;
    let posY = 0;
    let ptArr = new Array();
    let renderPassDivs = [];
    for (let [key, info] of g_roBrush.mRenInfoMap) {
        if (!info.mRP || info.mShader == null)
            continue;
        const rp = info.mRP;
        const fields = [];
        fields.push(`show: ${info.mShow}`);
        const tagStr = info.mTag && info.mTag.size > 0
            ? Array.from(info.mTag).join(", ")
            : "-";
        fields.push(`tag: ${tagStr}`);
        if (rp.mDepthTest != null)
            fields.push(`depthTest: ${rp.mDepthTest}`);
        if (rp.mDepthWrite != null)
            fields.push(`depthWrite: ${rp.mDepthWrite}`);
        if (rp.mAlpha != null)
            fields.push(`alpha: ${rp.mAlpha}`);
        if (rp.mCullFace != null)
            fields.push(`cullFace: ${rp.mCullFace}`);
        if (rp.mCamera)
            fields.push(`camera: ${rp.mCamera}`);
        if (rp.mPriority != null)
            fields.push(`priority: ${rp.mPriority}`);
        if (rp.mRenderTarget)
            fields.push(`renderTarget: ${rp.mRenderTarget}`);
        if (rp.mRenderTargetUse != null) {
            const useList = Array.from(rp.mRenderTargetUse).join(", ");
            fields.push(`renderTargetUse: ${useList}`);
        }
        if (rp.mShaderAttr && rp.mShaderAttr.length > 0) {
            for (let sa of rp.mShaderAttr) {
                fields.push(`shaderAttr: ${sa.ToLog()}`);
            }
        }
        if (info.mShader.mDefault.length > 0) {
            for (let sa of info.mShader.mDefault) {
                fields.push(`default: ${sa.ToLog()}`);
            }
        }
        fields.push(`shader: ${info.mShader.mKey}`);
        if (rp.mShader)
            fields.push(`shaderKey: ${rp.mShader}`);
        if (rp.mClearDepth != null)
            fields.push(`clearDepth: ${rp.mClearDepth}`);
        if (rp.mClearColor != null)
            fields.push(`clearColor: ${rp.mClearColor}`);
        if (rp.mCycle != null)
            fields.push(`cycle: ${rp.mCycle}`);
        if (rp.mSort != null) {
            let sortStr = "";
            if (rp.mSort === CRenderPass.eSort.Distance)
                sortStr = "Distance";
            else if (rp.mSort === CRenderPass.eSort.AlphaGroup)
                sortStr = "AlphaGroup";
            else if (rp.mSort === CRenderPass.eSort.ReversAlphaGroup)
                sortStr = "ReversAlphaGroup";
            else if (rp.mSort === CRenderPass.eSort.None)
                sortStr = "None";
            fields.push(`sort: ${sortStr}`);
        }
        const html = `
        <div class="border rounded bg-light p-2" style="width: 256px; font-size: 12px;">
            <h6 class="text-center text-danger mb-2">RenderPass: ${key}</h6>
            <ul class="list-group">
                ${fields.map(f => `<li class="list-group-item p-1">${f}</li>`).join("")}
            </ul>
        </div>
        `;
        const sub = g_can.Push(new CSubject());
        sub.SetKey(key);
        let pt = sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(html), new CVec2(256, 0), CUtil.ID("RenderOrderTool_div")));
        pt.SetPivot(new CVec3(0, 1, 0));
        sub.SetPos(new CVec3(posX, 0));
        ptArr.push(pt);
        renderPassDivs.push({ div: pt, key: key });
        posX += 280;
    }
    const sortedRenPriEntries = Array.from(g_roBrush.mRenPriMap.entries())
        .sort((a, b) => a[0] - b[0]);
    posX = 0;
    for (let [priority, renPri] of sortedRenPriEntries) {
        let alphaHTML = "";
        const alphaList = renPri.mAlphaList;
        let prev = null;
        let count = 1;
        let countKey = "";
        for (let i = 0; i <= alphaList.Size(); i++) {
            const current = alphaList.Find(i);
            const key = current?.mRenInfoKey ?? "-";
            const show = current?.mShow;
            const type = current?.mPaint?.constructor?.name ?? "-";
            const sameAsPrev = prev &&
                prev.mRenInfoKey === key &&
                prev.mShow === show &&
                (prev.mPaint?.constructor?.name ?? "-") === type;
            if (current != null && current.mPaint != null)
                countKey += current.mPaint.GetOwner().Key() + ",";
            if (i > 0 && sameAsPrev) {
                count++;
                continue;
            }
            if (prev) {
                const grayClass = prev.mShow !== 0 ? "text-warning" : "";
                alphaHTML += `
                    <li class="list-group-item p-1 ${grayClass}">
                        <div>key: <span style="cursor: pointer; color: blue; text-decoration: underline; pointer-events:auto;" 
                            onclick="focusOnRenderPass('${prev.mRenInfoKey}')">${prev.mRenInfoKey ?? "-"}</span></div>
                        <div>show: ${prev.mShow}</div>
                        <div>type: ${prev.mPaint?.constructor?.name ?? "-"}</div>
                        ${count > 1 ? `<div>+${count - 1} more <br><textarea style="pointer-events:auto;">${countKey}</textarea></div>` : `<div>${prev.mPaint.GetOwner().Key()}</div>`}
                    </li>
                `;
                countKey = "";
            }
            prev = current;
            count = 1;
        }
        countKey = "";
        let distanceHTML = "";
        const distanceList = renPri.mDistanceList;
        for (let i = 0; i <= distanceList.Size(); i++) {
            const current = distanceList.Find(i);
            const key = current?.mRenInfoKey ?? "-";
            const show = current?.mShow;
            const type = current?.mPaint?.constructor?.name ?? "-";
            const sameAsPrev = prev &&
                prev.mRenInfoKey === key &&
                prev.mShow === show &&
                (prev.mPaint?.constructor?.name ?? "-") === type;
            if (current != null && current.mPaint != null)
                countKey += current.mPaint.GetOwner().Key() + ",";
            if (i > 0 && sameAsPrev) {
                count++;
                continue;
            }
            if (prev) {
                const grayClass = prev.mShow !== 0 ? "text-warning" : "";
                alphaHTML += `
                    <li class="list-group-item p-1  ${grayClass}">
                        <div>key: <span style="cursor: pointer; color: blue; text-decoration: underline; pointer-events:auto;" onclick="focusOnRenderPass('${prev.mRenInfoKey}')">${prev.mRenInfoKey ?? "-"}</span></div>
                        <div>show: ${prev.mShow}</div>
                        <div>type: ${prev.mPaint?.constructor?.name ?? "-"}</div>
                        ${count > 1 ? `<div>+${count - 1} more <br><textarea style="pointer-events:auto;">${countKey}</textarea></div>` : `<div>${prev.mPaint.GetOwner().Key()}</div>`}
                    </li>
                `;
                countKey = "";
            }
            prev = current;
            count = 1;
        }
        const html = `
        <div class="border rounded bg-light p-2" style="width: 256px; font-size: 12px;">
            <h6 class="text-center text-primary mb-2">Priority: ${priority}</h6>

            <div>
                <strong>Alpha List</strong>
                <ul class="list-group mb-2">${alphaHTML}</ul>
            </div>

            <div>
                <strong>Distance List</strong>
                <ul class="list-group">${distanceHTML}</ul>
            </div>
        </div>
        `;
        const sub = g_can.Push(new CSubject());
        let pt = sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(html), new CVec2(256, 0), CUtil.ID("RenderOrderTool_div")));
        pt.SetPivot(new CVec3(0, -1, 0));
        sub.SetPos(new CVec3(posX, -50));
        ptArr.push(pt);
        posX += 280;
    }
    setTimeout(async () => {
        for (let pt of ptArr) {
            await CChecker.Exe(async () => (pt.mAttach ? false : true), 1);
            let size = new CVec2();
            let html = pt.GetElement();
            size.x = html.clientWidth || 150;
            size.y = html.clientHeight || 100;
            pt.SetSize(size);
        }
    });
    window.focusOnRenderPass = function (renderPassKey) {
        let sub = g_can.Find(renderPassKey);
        const camera = g_brush.GetCam2D();
        camera.EyeMoveAndViewCac(sub.GetPos());
        if (gBeforeSelect != null) {
            gBeforeSelect.classList.remove('border-danger', 'border-3');
        }
        let pt = sub.FindComp(CPaintHTML);
        gBeforeSelect = pt.GetElement();
        gBeforeSelect.classList.add('border-danger', 'border-3');
    };
}
var gBeforeSelect = null;
function Update(_delay) {
    g_brush.Update(_delay);
    g_can.Update(_delay);
}
function Render() {
    g_fw.Dev().SetClearColor(true, new CVec4(1, 1, 1, 1));
    g_fw.Ren().Begin();
    CCanvas.RenderCanvas(g_brush, [g_can]);
    g_fw.Ren().End();
}
