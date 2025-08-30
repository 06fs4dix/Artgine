import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CModal } from "../basic/CModal.js";
import { CPreferences } from "../basic/CPreferences.js";
import { CUtil } from "../basic/CUtil.js";
import { CBrush, CRenPriority } from "../canvas/CBrush.js";
import { CCanvas } from "../canvas/CCanvas.js";
import { CRenPaint } from "../canvas/component/paint/CPaint.js";
import { CPaint2D, CPaintHTML } from "../canvas/component/paint/CPaint2D.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CRenderPass } from "../render/CRenderPass.js";
import { CCamCon2DFreeMove } from "../util/CCamCon.js";
import { CChecker } from "../util/CChecker.js";
import { CFrame } from "../util/CFrame.js";

let g_roBrush: CBrush;
let g_roPriority: CRenPriority;
let g_colorMap: Map<string, CVec4> = new Map();

let g_remains: Map<string, CRenPaint[]> = new Map();
let g_modal: CModal;
export function RenderQueTool(_brush: CBrush) {
    g_roBrush = _brush;

    g_modal = new CModal("RenderOrderModal");
    g_modal.mResize = true;
    g_modal.SetSize(1400, 600);
    g_modal.SetTitle(CModal.eTitle.TextMinFullClose);
    g_modal.SetHeader("RenderOrderModal");
    g_modal.SetBody(
        `<div style='height:100%;' id='RenderOrderTool_div'>
            <canvas id='renderOrderCanvas'/>
        </div>`
    );
    g_modal.On(CEvent.eType.Open,() => { Open(); });
    g_modal.On(CEvent.eType.Close,() => { Close(); });
    g_modal.Open();
}
var g_fw: CFrame = null;
var g_brush: CBrush = null;
var g_can: CCanvas = null;



function Open() {
    let pf = new CPreferences();
    // pf.m_width = 1350;
    // pf.m_height = 550;

    //CWebUtil.ID("RenderOrder_div").innerHTML = "<canvas id='renderOrderCanvas' />";
    g_fw = new CFrame(pf, "renderOrderCanvas");
    g_fw.PushEvent(CEvent.eType.Load,new CEvent(Load));
    g_fw.PushEvent(CEvent.eType.Init,new CEvent(Init));
    g_fw.PushEvent(CEvent.eType.Update,new CEvent(Update));
    g_fw.PushEvent(CEvent.eType.Render,new CEvent(Render));

    //CWebUtil.ID("RenPriority_Btn").onclick = (e) => {UpdateRenPriorityGraph()};
    //CWebUtil.ID("RenInfo_Btn").onclick = (e) => {UpdateRenInfoGraph()};

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

    var sub = g_can.PushSub(new CSubject());
    sub.PushComp(new CPaint2D(g_fw.Pal().GetNoneTex(), new CVec2(128, 128)));


    let posX = 0;
    let posY = 0;
    let ptArr=new Array<CPaintHTML>();
    let renderPassDivs: Array<{div: CPaintHTML, key: string}> = [];
    
    for (let [key, info] of g_roBrush.mRenInfoMap) 
    {
        if (!info.mRP || info.mShader==null) continue; // ✅ null이면 무시

        const rp = info.mRP;
        const fields = [];

        // === CRenInfo 고유 정보 ===
        fields.push(`show: ${info.mShow}`);
        const tagStr = info.mTag && info.mTag.size > 0
            ? Array.from(info.mTag).join(", ")
            : "-";
        fields.push(`tag: ${tagStr}`);

        // === m_rp 정보 ===
        if (rp.mDepthTest != null) fields.push(`depthTest: ${rp.mDepthTest}`);
        if (rp.mDepthWrite != null) fields.push(`depthWrite: ${rp.mDepthWrite}`);
        if (rp.mAlpha != null) fields.push(`alpha: ${rp.mAlpha}`);
        if (rp.mCullFace != null) fields.push(`cullFace: ${rp.mCullFace}`);
        if (rp.mCamera) fields.push(`camera: ${rp.mCamera}`);
        if (rp.mPriority != null) fields.push(`priority: ${rp.mPriority}`);
        if (rp.mRenderTarget) fields.push(`renderTarget: ${rp.mRenderTarget}`);
        if (rp.mRenderTargetUse != null) {
            const useList = Array.from(rp.mRenderTargetUse).join(", ");
            fields.push(`renderTargetUse: ${useList}`);
        }
        if (rp.mShaderAttr && rp.mShaderAttr.length > 0)
        {
            for(let sa of rp.mShaderAttr)
            {
                fields.push(`shaderAttr: ${sa.ToLog()}`);
            }
            
        }
         if (info.mShader.mDefault.length > 0)
        {
            for(let sa of info.mShader.mDefault)
            {
                fields.push(`default: ${sa.ToLog()}`);
            }
            
        }
        
        fields.push(`shader: ${info.mShader.mKey}`);
        if (rp.mShader) fields.push(`shaderKey: ${rp.mShader}`);
        if (rp.mClearDepth != null) fields.push(`clearDepth: ${rp.mClearDepth}`);
        if (rp.mClearColor != null) fields.push(`clearColor: ${rp.mClearColor}`);
        if (rp.mCycle != null) fields.push(`cycle: ${rp.mCycle}`);
        if (rp.mSort != null) {
            let sortStr = "";
            if (rp.mSort === CRenderPass.eSort.Distance) sortStr = "Distance";
            else if (rp.mSort === CRenderPass.eSort.AlphaGroup) sortStr = "AlphaGroup";
            else if (rp.mSort === CRenderPass.eSort.ReversAlphaGroup) sortStr = "ReversAlphaGroup";
            else if (rp.mSort === CRenderPass.eSort.None) sortStr = "None";

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

        const sub = g_can.PushSub(new CSubject());
        sub.SetKey(key);
        let pt=sub.PushComp(
            new CPaintHTML(
                CDomFactory.DataToDom(html),
                new CVec2(256, 0),
                CUtil.ID("RenderOrderTool_div")
            )
        );
        pt.SetPivot(new CVec3(0, 1, 0)); // 상단 기준 (위쪽으로 배치)
        sub.SetPos(new CVec3(posX, 0));
        ptArr.push(pt);
        renderPassDivs.push({div: pt, key: key});
        posX += 280;
    }

   
    
    

    const sortedRenPriEntries = Array.from(g_roBrush.mRenPriMap.entries())
    .sort((a, b) => a[0] - b[0]); // priority 기준 정렬

    posX=0;
    for (let [priority, renPri] of sortedRenPriEntries) {
        let alphaHTML = "";
        const alphaList = renPri.mAlphaList;
        
        let prev = null;
        let count = 1;
        let countKey="";

        for (let i = 0; i <= alphaList.Size(); i++) {
            const current = alphaList.Find(i);
            
            const key = current?.mRenInfoKey ?? "-";
            const show = current?.mShow;
            const type = current?.mPaint?.constructor?.name ?? "-";

            const sameAsPrev = prev &&
                prev.mRenInfoKey === key &&
                prev.mShow === show &&
                (prev.mPaint?.constructor?.name ?? "-") === type;

            if(current!=null && current.mPaint!=null)
                countKey+=current.mPaint.GetOwner().Key()+",";
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
                countKey="";
            }
            
            prev = current;
            count = 1;
            
        }
        countKey="";
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
            if(current!=null && current.mPaint!=null)
                countKey+=current.mPaint.GetOwner().Key()+",";
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
                countKey="";
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

        const sub = g_can.PushSub(new CSubject());
        let pt=sub.PushComp(
            new CPaintHTML(
                CDomFactory.DataToDom(html),
                new CVec2(256, 0),
                CUtil.ID("RenderOrderTool_div")
            )
        );
        pt.SetPivot(new CVec3(0, -1, 0)); // 하단 기준 (아래쪽으로 배치)
        sub.SetPos(new CVec3(posX, -50));
        ptArr.push(pt);
        posX += 280;
    }


    setTimeout(async () => {
    for(let pt of ptArr)
    { 
        await CChecker.Exe(
            async () => (pt.mAttach ? false : true),1
        );
        let size = new CVec2();
        let html = pt.GetElement();
        size.x = html.clientWidth || 150;
        size.y = html.clientHeight || 100;
        pt.SetSize(size);
    }});

    // 렌더패스 div들의 높이를 계산하기 위해 먼저 모든 렌더패스 div를 생성
    // setTimeout(async () => {
    //     for(let pt of ptArr)
    //     {
    //          await CChecker.Exe(
    //             async () => (pt.mAttach ? false : true),1
    //         );
    //     }
        
    //     // 렌더패스 div들의 최대 높이 계산
    //     let maxRenderPassHeight = 0;
    //     for(let renderPassDiv of renderPassDivs) {
    //         if(renderPassDiv.div.mOrgSize && renderPassDiv.div.mOrgSize.y > maxRenderPassHeight) {
    //             maxRenderPassHeight = renderPassDiv.div.mOrgSize.y;
    //         }
    //     }
        
    //     // 프리오리티 div들을 렌더패스 div 아래에 배치
    //     let priorityPosX = 0;
    //     let priorityPosY = posY - maxRenderPassHeight - 20; // 렌더패스 div 아래에 20px 여유
        
    //     for (let [priority, renPri] of sortedRenPriEntries) {
    //         let alphaHTML = "";
    //         const alphaList = renPri.mAlphaList;
            
    //         let prev = null;
    //         let count = 1;
    //         let countKey="";

    //         for (let i = 0; i <= alphaList.Size(); i++) {
    //             const current = alphaList.Find(i);
                
    //             const key = current?.mRenInfoKey ?? "-";
    //             const show = current?.mShow;
    //             const type = current?.mPaint?.constructor?.name ?? "-";

    //             const sameAsPrev = prev &&
    //                 prev.mRenInfoKey === key &&
    //                 prev.mShow === show &&
    //                 (prev.mPaint?.constructor?.name ?? "-") === type;

    //             if (i > 0 && sameAsPrev) {
    //                 count++;
    //                 countKey+=prev.mPaint.GetOwner().Key()+",";
    //                 continue;
    //             }

    //             if (prev) {
    //                 const grayClass = prev.mShow !== 0 ? "text-warning" : "";
    //                 alphaHTML += `
    //                     <li class="list-group-item p-1 ${grayClass}">
    //                         <div>key: ${prev.mRenInfoKey ?? "-"}</div>
    //                         <div>show: ${prev.mShow}</div>
    //                         <div>type: ${prev.mPaint?.constructor?.name ?? "-"}</div>
    //                         ${count > 1 ? `<div>+${count - 1} more <br><textarea style="pointer-events:auto;">${countKey}</textarea></div>` : ""}
    //                     </li>
    //                 `;
    //             }

    //             prev = current;
    //             count = 1;
    //             countKey="";
    //         }

    //         let distanceHTML = "";
    //         const distanceList = renPri.mDistanceList;
    //         for (let i = 0; i <= distanceList.Size(); i++) {
    //             const current = distanceList.Find(i);
                
    //             const key = current?.mRenInfoKey ?? "-";
    //             const show = current?.mShow;
    //             const type = current?.mPaint?.constructor?.name ?? "-";

    //             const sameAsPrev = prev &&
    //                 prev.mRenInfoKey === key &&
    //                 prev.mShow === show &&
    //                 (prev.mPaint?.constructor?.name ?? "-") === type;

    //             if (i > 0 && sameAsPrev) {
    //                 count++;
    //                 countKey+=prev.mPaint.GetOwner().Key()+",";
    //                 continue;
    //             }

    //             if (prev) {
    //                 const grayClass = prev.mShow !== 0 ? "text-warning" : "";
    //                 alphaHTML += `
    //                     <li class="list-group-item p-1  ${grayClass}">
    //                         <div>key: ${prev.mRenInfoKey ?? "-"}</div>
    //                         <div>show: ${prev.mShow}</div>
    //                         <div>type: ${prev.mPaint?.constructor?.name ?? "-"}</div>
    //                         ${count > 1 ? `<div>+${count - 1} more <br><textarea style="pointer-events:auto;">${countKey}</textarea></div>` : ""}
    //                     </li>
    //                 `;
    //             }

    //             prev = current;
    //             count = 1;
    //             countKey="";
    //         }

    //         const html = `
    //         <div class="border rounded bg-light p-2" style="width: 256px; font-size: 12px;">
    //             <h6 class="text-center text-primary mb-2">Priority: ${priority}</h6>

    //             <div>
    //                 <strong>Alpha List</strong>
    //                 <ul class="list-group mb-2">${alphaHTML}</ul>
    //             </div>

    //             <div>
    //                 <strong>Distance List</strong>
    //                 <ul class="list-group">${distanceHTML}</ul>
    //             </div>
    //         </div>
    //         `;

    //         const sub = g_can.Push(new CSubject());
    //         let pt=sub.PushComp(
    //             new CPaintHTML(
    //                 CDomFactory.DataToDom(html),
    //                 new CVec2(256, 0),
    //                 CUtil.ID("RenderOrderTool_div")
    //             )
    //         );
    //         pt.SetPivot(new CVec3(0, -1, 0)); // 하단 기준 (아래쪽으로 배치)
    //         sub.SetPos(new CVec3(priorityPosX, 0));
    //         priorityPosX += 280;
    //     }
    // }, 0);

    // 렌더패스 키를 클릭했을 때 해당 div로 카메라 포커스 이동
    (window as any).focusOnRenderPass = function(renderPassKey: string) {
        let sub=g_can.Find(renderPassKey);
        const camera = g_brush.GetCam2D();
        camera.EyeMoveAndViewCac(sub.GetPos());

        if(gBeforeSelect!=null)
        {
            // 이전 선택된 div의 보더 클래스 제거
            gBeforeSelect.classList.remove('border-danger', 'border-3');
            // border 클래스는 유지 (기본 보더)
        }
        let pt=sub.FindComp(CPaintHTML);
        gBeforeSelect=pt.GetElement();
        // 현재 선택된 div에 강조 보더 클래스 추가 (border 클래스는 유지)
        gBeforeSelect.classList.add('border-danger', 'border-3');


        // 해당 렌더패스 div 찾기
        // for (let renderPassDiv of renderPassDivs) {
        //     if (renderPassDiv.key === renderPassKey) {
        //         const div = renderPassDiv.div;
        //         if (div && div.mElement) {
        //             // div의 위치 계산
        //             const rect = div.mElement.getBoundingClientRect();
        //             const parentRect = div.mElement.parentElement.getBoundingClientRect();
                    
        //             // 상대 위치 계산
        //             const relativeX = rect.left - parentRect.left + rect.width / 2;
        //             const relativeY = rect.top - parentRect.top + rect.height / 2;
                    
        //             // 2D 카메라 위치 설정 (화면 중앙을 기준으로)
        //             const camera = g_brush.GetCam2D();
        //             if (camera) {
        //                 // 화면 좌표를 월드 좌표로 변환
        //                 const worldX = (relativeX - parentRect.width / 2) / camera.mZoom;
        //                 const worldY = -(relativeY - parentRect.height / 2) / camera.mZoom;
                        
        //                 camera.EyeMoveAndViewCac(new CVec3(worldX, worldY, 0));
                        
        //             }
        //         }
        //         break;
        //     }
        // }
    };



    


}
var gBeforeSelect : HTMLElement=null;
function Update(_delay: number) {
    g_brush.Update(_delay);
    g_can.Update(_delay);
    // g_graph.Update(_delay);
    // g_graphHelper.Update(_delay);
}

function Render() {
    g_fw.Dev().SetClearColor(true, new CVec4(1, 1, 1, 1));
    g_fw.Ren().Begin();
    CCanvas.RenderCanvas(g_brush, [g_can]);
    g_fw.Ren().End();
}
