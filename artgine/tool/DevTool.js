import { CAlert } from "../basic/CAlert.js";
import { CClass } from "../basic/CClass.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CConfirm, CModal, CModalTitleBar } from "../basic/CModal.js";
import { CModalFlex, CMonacoViewer } from "../util/CModalUtil.js";
import { CObject } from "../basic/CObject.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { CBrush } from "../canvas/CBrush.js";
import { CCanvas } from "../canvas/CCanvas.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CCamera } from "../render/CCamera.js";
import { CWebView } from "../system/CWebView.js";
import { CBase64File } from "../util/CBase64File.js";
import { CLoaderOption } from "../util/CLoader.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "../util/CCamCon.js";
import { CPaint } from "../canvas/component/paint/CPaint.js";
import { CCollider } from "../canvas/component/CCollider.js";
import { CAlpha, CColor } from "../canvas/component/CColor.js";
import { CMeshDrawNode } from "../render/CMeshDrawNode.js";
import { SDF } from "../z_file/SDF.js";
import { CMat } from "../geometry/CMat.js";
import { CPaint2D } from "../canvas/component/paint/CPaint2D.js";
import { CInput } from "../system/CInput.js";
import { CMath } from "../geometry/CMath.js";
import { CUtilMath } from "../geometry/CUtilMath.js";
import { CJSON } from "../basic/CJSON.js";
import { CBound } from "../geometry/CBound.js";
import { CFile } from "../system/CFile.js";
import { CStorage } from "../system/CStorage.js";
import { CPath } from "../basic/CPath.js";
import { CScript } from "../util/CScript.js";
import { CChecker } from "../util/CChecker.js";
var gModal;
var gAtl;
var gLeftItem = new Map();
var gLeftSelect = null;
var gUpdateEvent;
var gRenderEvent;
var gToolUpdate = 1;
var gCanvasCam = new Map();
let gBoundXY = new CBound();
let gBoundYZ = new CBound();
let gBoundZX = new CBound();
let gBoundTick = 40;
let gDragBound = 0;
let gMouse = null;
let gBTargetWidth = 0;
let gBTargetHeight = 0;
let gBWidth = 0;
let gBHeight = 0;
let gSelectBound = new CBound();
let gAddMove = new CVec3();
let gLastCanvas = null;
let gCanStyle = null;
function ResetBoxXYZ(_subject) {
    let pos = _subject.GetWMat().xyz;
    gBoundXY.mMin.Import(pos);
    gBoundXY.mMax.Import(pos);
    gBoundXY.mMax.x += gBoundTick;
    gBoundXY.mMax.y += gBoundTick;
    gBoundXY.mMax.z += 1;
    gBoundYZ.mMin.Import(pos);
    gBoundYZ.mMax.Import(pos);
    gBoundYZ.mMax.x += 1;
    gBoundYZ.mMax.y += gBoundTick;
    gBoundYZ.mMax.z += gBoundTick;
    gBoundZX.mMin.Import(pos);
    gBoundZX.mMax.Import(pos);
    gBoundZX.mMax.x += gBoundTick;
    gBoundZX.mMax.y += 1;
    gBoundZX.mMax.z += gBoundTick;
}
let gScriptViewer = null;
export async function InitDevToolScriptViewer(_github) {
    let json = { brash: "", canvas: [], script: "" };
    let data = CStorage.Get(CPath.PHPCR() + "Save.json");
    if (data != null)
        json = JSON.parse(data);
    if (json.script == "") {
        let buf = await CFile.Load(CPath.PHPC() + "App/Template/RuntimeScript.ts");
        json.script = CUtil.ArrayToString(buf);
    }
    gScriptViewer = new CMonacoViewer(json.script, "Runtime.ts", _github);
    gScriptViewer.mHeader.prepend(CDomFactory.DataToDom("<button type='button' class='btn btn-success' id='mvExcute_btn'>Excute</button>" +
        "<button type='button' class='btn btn-primary' id='mvSave_btn'>Save</button>" +
        "<button type='button' class='btn btn-info' id='mvGPT_btn'>GPT</button>"));
    CUtil.ID("mvGPT_btn").addEventListener("click", async () => {
        const URL_ARTGINE = "https://chatgpt.com/g/g-68ad603d9b3081918273f3d352f995fc-artgine-bot";
        const modal = new CModal("mvGPT_link_modal");
        modal.SetOverlay(true);
        modal.SetHeader("GPT Artgine bot Link");
        modal.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 2);
        modal.SetBody(`
            <div style="padding:12px;">
                <p>Get help from GPT</p>
                <a href="${URL_ARTGINE}" target="_blank" rel="noopener noreferrer">
                    ${URL_ARTGINE}
                </a>
                <div style="margin-top:10px;">
                    <input id="mvGPT_link_copy" type="text" value="${URL_ARTGINE}" readonly style="width:100%;"/>
                </div>
            </div>
        `);
        modal.Open();
        modal.Show();
    });
    CUtil.ID("mvExcute_btn").addEventListener("click", async () => {
        let moudle = await CScript.Build("Test.ts", gScriptViewer.GetSource());
    });
    CUtil.ID("mvExcute_btn").addEventListener("click", async () => {
        let moudle = await CScript.Build(CUniqueID.Get() + ".ts", gScriptViewer.GetSource());
    });
    CUtil.ID("mvSave_btn").addEventListener("click", async () => {
        data = CStorage.Get(CPath.PHPCR() + "Save.json");
        if (data != null)
            json = JSON.parse(data);
        json.script = gScriptViewer.GetSource();
        CStorage.Set(CPath.PHPCR() + "Save.json", JSON.stringify(json));
        CAlert.Info("Script Save!");
    });
    await CChecker.Exe(async () => {
        if (gScriptViewer.mEditor != null)
            return false;
        return true;
    });
    return gScriptViewer;
}
export async function GetDevToolScriptViewer() {
    return gScriptViewer;
}
export function DevTool(_atl) {
    CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "RunTime", async () => {
        InitDevToolScriptViewer(_atl.PF().mGitHub);
    }));
    gAtl = _atl;
    const _frame = _atl.Frame();
    const canvas = _frame.Win().Handle();
    const parent = canvas.parentElement;
    _frame.PF().mDebugMode = true;
    gBTargetWidth = _frame.PF().mTargetWidth;
    gBTargetHeight = _frame.PF().mTargetHeight;
    gCanStyle = {
        width: canvas.style.width,
        height: canvas.style.height,
        position: canvas.style.position,
        top: canvas.style.top,
        left: canvas.style.left,
        right: canvas.style.right,
        bottom: canvas.style.bottom,
        margin: canvas.style.margin,
        padding: canvas.style.padding,
        border: canvas.style.border,
        borderRadius: canvas.style.borderRadius,
        boxShadow: canvas.style.boxShadow,
        backgroundColor: canvas.style.backgroundColor,
        overflow: canvas.style.overflow,
        display: canvas.style.display,
        flex: canvas.style.flex,
        flexDirection: canvas.style.flexDirection,
        justifyContent: canvas.style.justifyContent,
        alignItems: canvas.style.alignItems,
        minWidth: canvas.style.minWidth,
        minHeight: canvas.style.minHeight,
        maxWidth: canvas.style.maxWidth,
        maxHeight: canvas.style.maxHeight,
        pointerEvents: canvas.style.pointerEvents
    };
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.style.position = '';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.right = '0';
    canvas.style.bottom = '0';
    canvas.style.margin = '0';
    canvas.style.padding = '0';
    canvas.style.border = 'none';
    canvas.style.borderRadius = '0';
    canvas.style.boxShadow = 'none';
    canvas.style.overflow = 'hidden';
    canvas.style.display = 'block';
    canvas.style.flex = 'none';
    canvas.style.flexDirection = 'initial';
    canvas.style.justifyContent = 'initial';
    canvas.style.alignItems = 'initial';
    canvas.style.minWidth = '';
    canvas.style.minHeight = '';
    canvas.style.maxWidth = '';
    canvas.style.maxHeight = '';
    canvas.style.pointerEvents = 'auto';
    _frame.PF().mTargetWidth = 0;
    _frame.PF().mTargetHeight = 0;
    if (!parent) {
        CAlert.W("캔버스의 부모 요소가 없습니다.");
        return;
    }
    let devCamInit = false;
    for (let canvas of gAtl.mCanvasMap.values()) {
        gCanvasCam.set(canvas, canvas.GetCameraKey());
        if (devCamInit == false) {
            devCamInit = true;
            let cam = gAtl.Brush().GetCamera(canvas.GetCameraKey());
            if (cam.GetCamCon() != null)
                cam.GetCamCon().SetInput(null);
            gAtl.Brush().GetCamDev().Import(cam);
            gAtl.Brush().GetCamDev().SetKey("Dev");
            gAtl.Brush().GetCamDev().SetSize(0, 0);
            gAtl.Brush().GetCamDev().mReset = true;
            if (gAtl.Brush().GetCamDev().mOrthographic)
                gAtl.Brush().GetCamDev().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
            else
                gAtl.Brush().GetCamDev().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
        }
    }
    DevToolCamKeyChange("Dev");
    const devToolTempDiv = document.createElement("div");
    devToolTempDiv.innerText = "🛠 DevTool";
    devToolTempDiv.className = "w-100 h-100 d-flex justify-content-center align-items-center border border-2 border-secondary text-muted bg-light";
    const syncSize = () => {
        const w = document.documentElement.clientWidth;
        const h = document.documentElement.clientHeight;
        devToolTempDiv.style.minWidth = w + "px";
        devToolTempDiv.style.minHeight = h + "px";
    };
    syncSize();
    parent.replaceChild(devToolTempDiv, canvas);
    gModal = new CModalFlex([0.2, 0.6, 0.2], "DevToolModal");
    gModal.SetHeader("DevTool");
    gModal.SetSize(800, 600);
    gModal.Open();
    gModal.On(CEvent.eType.Drop, DevToolDrop);
    gModal.FullSwitch();
    const maxHeight = "calc(100vh - 10px)";
    const leftPanel = gModal.FindFlex(0);
    const rightPanel = gModal.FindFlex(2);
    [leftPanel, rightPanel].forEach(panel => {
        panel.style.maxHeight = maxHeight;
        panel.style.overflowY = "auto";
    });
    const middle = gModal.FindFlex(1);
    middle.innerHTML = "";
    middle.appendChild(canvas);
    DevToolLeft();
    gModal.On(CEvent.eType.Close, () => {
        gScriptViewer = null;
        _frame.PF().mDebugMode = false;
        _frame.PF().mTargetWidth = gBTargetWidth;
        _frame.PF().mTargetHeight = gBTargetHeight;
        if (gCanStyle) {
            canvas.style.position = gCanStyle.position;
            canvas.style.top = gCanStyle.top;
            canvas.style.left = gCanStyle.left;
            canvas.style.right = gCanStyle.right;
            canvas.style.bottom = gCanStyle.bottom;
            canvas.style.margin = gCanStyle.margin;
            canvas.style.padding = gCanStyle.padding;
            canvas.style.border = gCanStyle.border;
            canvas.style.borderRadius = gCanStyle.borderRadius;
            canvas.style.boxShadow = gCanStyle.boxShadow;
            canvas.style.backgroundColor = gCanStyle.backgroundColor;
            canvas.style.overflow = gCanStyle.overflow;
            canvas.style.display = gCanStyle.display;
            canvas.style.flex = gCanStyle.flex;
            canvas.style.flexDirection = gCanStyle.flexDirection;
            canvas.style.justifyContent = gCanStyle.justifyContent;
            canvas.style.alignItems = gCanStyle.alignItems;
            canvas.style.minWidth = gCanStyle.minWidth;
            canvas.style.minHeight = gCanStyle.minHeight;
            canvas.style.maxWidth = gCanStyle.maxWidth;
            canvas.style.maxHeight = gCanStyle.maxHeight;
            canvas.style.pointerEvents = gCanStyle.pointerEvents;
        }
        if (canvas.parentElement === middle) {
            middle.removeChild(canvas);
        }
        if (devToolTempDiv.parentElement === parent) {
            parent.replaceChild(canvas, devToolTempDiv);
        }
        gAtl.Frame().RemoveEvent(gUpdateEvent);
        gAtl.Frame().RemoveEvent(gRenderEvent);
        for (let [key, value] of gCanvasCam) {
            if (key.GetCameraKey() == "Dev")
                key.SetCameraKey(value);
            let cam = gAtl.Brush().GetCamera(value);
            if (cam.GetCamCon() != null)
                cam.GetCamCon().SetInput(key.GetFrame().Input());
            key.ClearBatch();
        }
        gLeftSelect = null;
    });
    gUpdateEvent = new CEvent(DevToolUpdate);
    gRenderEvent = new CEvent(DevToolRender);
    gAtl.Frame().PushEvent(CEvent.eType.Update, gUpdateEvent);
    gAtl.Frame().PushEvent(CEvent.eType.Render, gRenderEvent);
    let ctrlPressed = false;
    gModal.mBody.tabIndex = 0;
    const IsFocusInput = () => {
        const el = document.activeElement;
        if (!el)
            return false;
        const tag = el.tagName.toUpperCase();
        return (tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            el.isContentEditable === true);
    };
    gModal.mBody.addEventListener("keydown", (e) => {
        if (IsFocusInput())
            return;
        if (e.key === "Control")
            ctrlPressed = true;
        if (ctrlPressed && e.key.toLowerCase() === "c") {
            if (gLeftSelect instanceof CSubject) {
                navigator.clipboard.writeText(gLeftSelect.ToStr());
                CAlert.Info("Copy!");
                e.preventDefault();
            }
        }
        if (ctrlPressed && e.key.toLowerCase() === "v") {
            if (!(gLeftSelect instanceof CCanvas)) {
                e.preventDefault();
                return;
            }
            navigator.clipboard.readText().then((_str) => {
                try {
                    let json = new CJSON(_str);
                    if (json.mDocument["class"] == null) {
                        CAlert.E("Paste Failed: str unknow!");
                        return;
                    }
                    let wa = CClass.New(json.mDocument["class"]);
                    wa.ImportCJSON(json);
                    wa.SetKey(CUniqueID.GetHash());
                    gLeftSelect.PushSub(wa);
                    CAlert.Info("Paste!");
                }
                catch (err) {
                    CAlert.E("Paste Failed: " + err);
                }
            });
            e.preventDefault();
        }
    });
    gModal.mBody.addEventListener("keyup", (e) => {
        if (e.key === "Control")
            ctrlPressed = false;
        if (e.key === "F6") {
            gAtl.Brush().SetPause(!gAtl.Brush().IsPause());
        }
    });
}
function DevToolRender() {
    if (gLeftSelect == null || gLeftSelect instanceof CSubject == false)
        return;
    let subject = gLeftSelect;
    let ptArr = subject.FindComps(CPaint);
    let clArr = subject.FindComps(CCollider);
    const render = gAtl.Frame().Ren();
    let shader = gAtl.Frame().Res().Find("3DSimple");
    let meshDraw = gAtl.Frame().Res().Find(gAtl.Frame().Pal().GetBoxMesh() + "Dev");
    if (meshDraw == null) {
        let mesh = gAtl.Frame().Res().Find(gAtl.Frame().Pal().GetBoxMesh());
        meshDraw = new CMeshDrawNode();
        gAtl.Frame().Ren().BuildMeshDrawNodeAutoFix(meshDraw, shader, mesh.meshTree.mData.ci);
        gAtl.Frame().Res().Push(gAtl.Frame().Pal().GetBoxMesh() + "Dev", meshDraw);
    }
    render.UseShader(shader);
    render.SendGPU(shader, gAtl.Brush().GetCamDev().GetViewMat(), "viewMat");
    render.SendGPU(shader, gAtl.Brush().GetCamDev().GetProjMat(), "projectMat");
    render.SendGPU(shader, [gAtl.Frame().Pal().GetBlackTex()]);
    ResetBoxXYZ(subject);
    let color = new CColor();
    color.w = SDF.eColorModel.RGBAdd;
    let alpha = new CAlpha();
    let wmat = new CMat();
    gAtl.Frame().Dev().SetLine(true);
    gAtl.Frame().Dev().SetDepthTest(false);
    {
        color.x = 1;
        color.y = 0;
        color.z = 0;
        wmat.xyz = gBoundXY.mMin;
        wmat.mF32A[12] += gBoundTick * 0.5;
        wmat.mF32A[13] += gBoundTick * 0.5;
        wmat.mF32A[0] = 0.2;
        wmat.mF32A[5] = 0.2;
        wmat.mF32A[10] = 0.01;
        if (gDragBound == 1)
            gAtl.Frame().Dev().SetLine(false);
        render.SendGPU(shader, color, "colorModel");
        render.SendGPU(shader, alpha, "alphaModel");
        render.SendGPU(shader, wmat, "worldMat");
        render.MeshDrawNodeRender(shader, meshDraw);
        gAtl.Frame().Dev().SetLine(true);
        color.x = 0;
        color.y = 1;
        color.z = 0;
        wmat.xyz = gBoundYZ.mMin;
        wmat.mF32A[13] += gBoundTick * 0.5;
        wmat.mF32A[14] += gBoundTick * 0.5;
        wmat.mF32A[0] = 0.01;
        wmat.mF32A[5] = 0.2;
        wmat.mF32A[10] = 0.2;
        if (gDragBound == 2)
            gAtl.Frame().Dev().SetLine(false);
        render.SendGPU(shader, color, "colorModel");
        render.SendGPU(shader, alpha, "alphaModel");
        render.SendGPU(shader, wmat, "worldMat");
        render.MeshDrawNodeRender(shader, meshDraw);
        gAtl.Frame().Dev().SetLine(true);
        color.x = 0;
        color.y = 0;
        color.z = 1;
        wmat.xyz = gBoundZX.mMin;
        wmat.mF32A[12] += gBoundTick * 0.5;
        wmat.mF32A[14] += gBoundTick * 0.5;
        wmat.mF32A[0] = 0.2;
        wmat.mF32A[5] = 0.01;
        wmat.mF32A[10] = 0.2;
        if (gDragBound == 3)
            gAtl.Frame().Dev().SetLine(false);
        render.SendGPU(shader, color, "colorModel");
        render.SendGPU(shader, alpha, "alphaModel");
        render.SendGPU(shader, wmat, "worldMat");
        render.MeshDrawNodeRender(shader, meshDraw);
        gAtl.Frame().Dev().SetLine(true);
    }
    for (let pt of ptArr) {
        color.x = 1;
        color.y = 0;
        color.z = 0;
        let bound = pt.GetBoundFMat();
        bound.mMax;
        bound.mMin;
        const min = bound.mMin;
        const max = bound.mMax;
        const center = new CVec3((min.x + max.x) * 0.5, (min.y + max.y) * 0.5, (min.z + max.z) * 0.5);
        const boxSize = 200;
        const scale = new CVec3((max.x - min.x) / boxSize, (max.y - min.y) / boxSize, (max.z - min.z) / boxSize);
        wmat.xyz = center;
        wmat.mF32A[0] = scale.x;
        wmat.mF32A[5] = scale.y;
        wmat.mF32A[10] = scale.z;
        render.SendGPU(shader, color, "colorModel");
        render.SendGPU(shader, alpha, "alphaModel");
        render.SendGPU(shader, wmat, "worldMat");
        render.MeshDrawNodeRender(shader, meshDraw);
        if (pt instanceof CPaint2D) {
            if (pt.mYSort) {
                color.x = 0;
                color.y = 1;
                color.z = 0;
                wmat.xyz = CMath.V3AddV3(pt.GetHalf(), subject.GetPos());
                wmat.y += pt.mYSortOrigin;
                wmat.mF32A[0] = 0.02;
                wmat.mF32A[5] = 0.02;
                wmat.mF32A[10] = 0.02;
                render.SendGPU(shader, color, "colorModel");
                render.SendGPU(shader, alpha, "alphaModel");
                render.SendGPU(shader, wmat, "worldMat");
                render.MeshDrawNodeRender(shader, meshDraw);
            }
        }
    }
    color.x = 0;
    color.y = 0;
    color.z = 1;
    color.w = SDF.eColorModel.RGBAdd;
    for (let pt of clArr) {
        let bound = pt.GetBoundGJK();
        bound.mMax;
        bound.mMin;
        const min = bound.mMin;
        const max = bound.mMax;
        const center = new CVec3((min.x + max.x) * 0.5, (min.y + max.y) * 0.5, (min.z + max.z) * 0.5);
        const boxSize = 200;
        const scale = new CVec3((max.x - min.x) / boxSize, (max.y - min.y) / boxSize, (max.z - min.z) / boxSize);
        wmat.xyz = center;
        wmat.mF32A[0] = scale.x;
        wmat.mF32A[5] = scale.y;
        wmat.mF32A[10] = scale.z;
        render.SendGPU(shader, wmat, "worldMat");
        render.SendGPU(shader, color, "colorModel");
        render.SendGPU(shader, alpha, "alphaModel");
        render.SendGPU(shader, [gAtl.Frame().Pal().GetBlackTex()]);
        render.MeshDrawNodeRender(shader, meshDraw);
    }
    gAtl.Frame().Dev().SetLine(false);
    gAtl.Frame().Dev().SetDepthTest(true);
}
function DevToolDrop(_drop) {
    if (_drop.mFiles != null) {
        let fileDrop = _drop;
        let pathLoad = true;
        for (let i = 0; i < fileDrop.mPaths.length; ++i) {
            if (fileDrop.mPaths[i] == null) {
                pathLoad = false;
            }
        }
        if ((gLeftSelect == null || gLeftSelect instanceof CCanvas == false) && pathLoad == false) {
            CAlert.E("Empty Path! Load Target Canvas Select!");
            return;
        }
        const GetIconClass = (path) => {
            if (!path)
                return "bi bi-question-circle";
            const ext = path.split('.').pop()?.toLowerCase();
            switch (ext) {
                case "tga":
                case "jpg":
                case "jpeg":
                case "png":
                    return "bi bi-image";
                case "fbx":
                case "gltf":
                    return "bi bi-globe";
                case "ts":
                    return "bi bi-filetype-sh";
                default:
                    return "bi bi-file-earmark";
            }
        };
        const listGroup = CDomFactory.DataToDom("ul");
        listGroup.className = "list-group";
        for (let i = 0; i < fileDrop.mFiles.length; ++i) {
            const path = fileDrop.mPaths[i];
            const file = fileDrop.mFiles[i];
            const li = CDomFactory.DataToDom("li");
            li.className = "list-group-item d-flex align-items-center";
            const icon = CDomFactory.DataToDom("i");
            icon.className = GetIconClass(file.name);
            icon.style.marginRight = "0.5rem";
            const pathText = path ?? `${file.name}(base64)`;
            const pre = document.createElement("pre");
            pre.className = "form-control user-select-all mb-0 me-2";
            pre.style.width = "auto";
            pre.style.display = "inline-block";
            pre.textContent = pathText;
            const labelDiv = document.createElement("div");
            labelDiv.className = "d-flex align-items-center";
            labelDiv.append(pre);
            li.append(icon, labelDiv);
            listGroup.appendChild(li);
        }
        let option = new CLoaderOption();
        listGroup.append(option.EditInit());
        let confirm = CConfirm.List(listGroup, [async () => {
                let loadName = [];
                if (pathLoad) {
                    for (let i = 0; i < fileDrop.mPaths.length; ++i) {
                        gAtl.Frame().Load().Load(fileDrop.mPaths[i], option);
                    }
                }
                else {
                    const canvas = gLeftSelect;
                    const textureMap = new Map();
                    const meshFiles = [];
                    for (let i = 0; i < fileDrop.mFiles.length; ++i) {
                        const file = fileDrop.mFiles[i];
                        const ext = file.name.split('.').pop()?.toLowerCase() ?? "";
                        loadName.push(file.name);
                        if (ext === "gltf" || ext === "fbx") {
                            meshFiles.push(file);
                        }
                        else {
                            const arrayBuffer = await file.arrayBuffer();
                            const base64 = new CBase64File();
                            base64.mExt = ext;
                            base64.mData = arrayBuffer;
                            base64.RefreshHash();
                            base64.mOption = option.Export();
                            canvas.GetResMap().set(base64.mHash, base64);
                            textureMap.set(file.name.toLowerCase(), base64.FileName());
                            base64.mOption.mCache = file.name;
                            await gAtl.Frame().Load().LoadSwitch(base64.FileName(), base64.mData, base64.mOption);
                        }
                    }
                    for (const file of meshFiles) {
                        const arrayBuffer = await file.arrayBuffer();
                        const base64 = new CBase64File();
                        base64.mExt = file.name.split('.').pop()?.toLowerCase() ?? "bin";
                        base64.mData = arrayBuffer;
                        base64.RefreshHash();
                        base64.mOption = option.Export();
                        canvas.GetResMap().set(base64.mHash, base64);
                        base64.mOption.mAutoLoad = false;
                        await gAtl.Frame().Load().LoadSwitch(base64.FileName(), base64.mData, base64.mOption);
                        const mesh = gAtl.Frame().Res().Find(base64.FileName());
                        if (mesh?.texture instanceof Array) {
                            for (let ti = 0; ti < mesh.texture.length; ++ti) {
                                const texPath = mesh.texture[ti];
                                const texName = texPath.split("/").pop()?.toLowerCase() ?? "";
                                if (textureMap.has(texName)) {
                                    mesh.texture[ti] = textureMap.get(texName);
                                }
                            }
                        }
                    }
                }
                CAlert.Info(loadName + " load!");
            }, () => { }], ["OK", "Cancel"]);
    }
    else {
        if (gLastCanvas == null) {
            CAlert.Info("캔버스를 선택해주세요");
            return;
        }
        if (_drop.mObject instanceof CSubject == false) {
            return;
        }
        let cobject = null;
        if (CInput.Key(CInput.eKey.LControl)) {
            cobject = _drop.mObject.ExportProxy();
        }
        else
            cobject = _drop.mObject.Export();
        cobject.SetBlackBoard(false);
        let can = gLastCanvas;
        if (gAtl.Brush().GetCamDev().GetOrthographic()) {
            let pos = gAtl.Brush().GetCamDev().ScreenToWorld2DPoint(_drop.mX, _drop.mY);
            let z = cobject.GetPos().z;
            cobject.SetPos(new CVec3(pos.x, pos.y, z));
        }
        can.PushSub(cobject);
    }
}
function DevToolUpdate(_delay) {
    let collapse = CUtil.ID(gAtl.Brush().ObjHash() + "_collapse");
    if (collapse == null)
        return;
    if (collapse.className.indexOf("show") != -1) {
        const bdiv = CUtil.ID(gAtl.Brush().ObjHash() + "_ul");
        for (let obj0 of gAtl.Brush().mCameraMap.values()) {
            let item = gLeftItem.get(obj0.ObjHash());
            if (item != null) {
                const li = CUtil.ID(obj0.ObjHash() + "_li");
                const nameDiv = li.querySelector(".card-body .d-flex.align-items-center > div:nth-child(2)");
                if (nameDiv && nameDiv.textContent !== obj0.Key()) {
                    nameDiv.textContent = obj0.Key();
                }
            }
            else {
                const newItem = CDomFactory.DataToDom(LeftNewItem(obj0));
                bdiv.append(newItem);
                gLeftItem.set(obj0.ObjHash(), obj0);
                LeftModifyItem(gAtl.Brush().ObjHash());
            }
        }
    }
    for (let canvas of gAtl.mCanvasMap.values()) {
        let item = gLeftItem.get(canvas.ObjHash());
        if (item != null) {
            const li = CUtil.ID(canvas.ObjHash() + "_li");
            const nameDiv = li.querySelector(".card-body .d-flex.align-items-center > div:nth-child(2)");
            if (nameDiv && nameDiv.textContent !== canvas.Key()) {
                nameDiv.textContent = canvas.Key();
            }
            const iconEl = li.querySelector(".card-body .d-flex.align-items-center > i");
            if (iconEl) {
                const targetClass = canvas.IsPause() ? "bi bi-aspect-ratio-fill" : "bi bi-aspect-ratio";
                if (iconEl.className !== targetClass) {
                    iconEl.className = targetClass;
                }
            }
        }
        for (let subject of canvas.GetSubMap().values()) {
            SyncSubjectTreeRecursive(canvas, subject, false);
        }
        for (let subject of canvas.GetResMap().values()) {
            if (subject instanceof CSubject)
                SyncSubjectTreeRecursive(canvas, subject, true);
        }
    }
    for (let [objHash, obj] of gLeftItem.entries()) {
        if (obj instanceof CSubject && obj.IsDestroy()) {
            const li = CUtil.ID(obj.ObjHash() + "_li");
            const parentUl = li?.parentElement;
            li?.remove();
            if (gLeftSelect === obj) {
                const rightPanel = gModal.FindFlex(2);
                rightPanel.innerHTML = "";
                gLeftSelect = null;
            }
            if (parentUl && parentUl.id.endsWith("_ul")) {
                const parentHash = parentUl.id.replace(/_ul$/, "");
                LeftModifyItem(parentHash);
            }
            gLeftItem.delete(objHash);
        }
    }
    if (gDragBound != 0 && gDragBound != 4) {
        let mouse = gAtl.Frame().Input().Mouse().Export();
        ;
        let x = (mouse.x - gMouse.x);
        let y = (mouse.y - gMouse.y);
        let subject = gLeftSelect;
        let pos = subject.GetPos().Export();
        if (gAtl.Brush().GetCamDev().GetOrthographic() == true) {
            x *= gAtl.Brush().GetCamDev().GetZoom();
            y *= gAtl.Brush().GetCamDev().GetZoom();
            if (gDragBound == 1) {
                if (gAtl.Frame().Input().KeyDown(CInput.eKey.Shift)) {
                    gAddMove = CMath.V3AddV3(gAddMove, new CVec3(x, y));
                    let size = gSelectBound.GetSize();
                    if (Math.abs(gAddMove.x) > size.x) {
                        pos.x += Math.round(gAddMove.x / size.x) * size.x;
                        gAddMove.x = 0;
                    }
                    if (Math.abs(gAddMove.y) > size.y) {
                        pos.y += Math.round(gAddMove.y / size.y) * size.y;
                        gAddMove.y = 0;
                    }
                }
                else
                    pos = CMath.V3AddV3(pos, new CVec3(x, y));
            }
            else if (gDragBound == 2)
                pos = CMath.V3AddV3(pos, new CVec3(0, x, y));
            else if (gDragBound == 3)
                pos = CMath.V3AddV3(pos, new CVec3(y, 0, x));
        }
        else {
            if (gAtl.Brush().GetCamDev().GetCamCon() != null)
                gAtl.Brush().GetCamDev().GetCamCon().SetInput(null);
            let cross = gAtl.Brush().GetCamDev().GetCross();
            let up = gAtl.Brush().GetCamDev().GetUp();
            let front = gAtl.Brush().GetCamDev().GetFront();
            let len = CMath.V3Distance(gAtl.Brush().GetCamDev().GetEye(), pos);
            len *= 0.0007;
            x *= len;
            y *= len;
            let moveVec = new CVec3(0, 0, 0);
            if (gDragBound == 1) {
                moveVec = CMath.V3AddV3(CMath.V3MulFloat(cross, -x), CMath.V3MulFloat(up, y));
            }
            else if (gDragBound == 2) {
                moveVec = CMath.V3AddV3(CMath.V3MulFloat(up, y), CMath.V3MulFloat(cross, -x));
            }
            else if (gDragBound == 3) {
                moveVec = CMath.V3AddV3(CMath.V3MulFloat(front, y), CMath.V3MulFloat(cross, -x));
            }
            pos = CMath.V3AddV3(pos, moveVec);
        }
        CUtil.IDValue("PosX", Number(pos.x.toFixed(2)));
        CUtil.IDValue("PosY", Number(pos.y.toFixed(2)));
        CUtil.IDValue("PosZ", Number(pos.z.toFixed(2)));
        subject.SetPos(pos);
        gMouse = mouse;
    }
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.LButton) && gDragBound == 0 && gLeftSelect instanceof CSubject &&
        CInput.eDragState.None == gAtl.Frame().Input().DragState()) {
        let ray = gAtl.Brush().GetCamDev().GetRay(gAtl.Frame().Input().Mouse().x, gAtl.Frame().Input().Mouse().y);
        if (gAtl.Brush().GetCamDev().GetOrthographic() && ray.GetDirect().z < -0.9)
            ray.GetOriginal().z += 1000;
        ResetBoxXYZ(gLeftSelect);
        let lenMin = 1000000;
        if (CUtilMath.RayBoxIS(gBoundXY.mMin, gBoundXY.mMax, ray)) {
            lenMin = CMath.V3Distance(ray.GetOriginal(), ray.GetPosition());
            gDragBound = 1;
        }
        if (CUtilMath.RayBoxIS(gBoundYZ.mMin, gBoundYZ.mMax, ray)) {
            let len = CMath.V3Distance(ray.GetOriginal(), ray.GetPosition());
            if (len < lenMin) {
                gDragBound = 2;
                lenMin = len;
            }
        }
        if (CUtilMath.RayBoxIS(gBoundZX.mMin, gBoundZX.mMax, ray)) {
            let len = CMath.V3Distance(ray.GetOriginal(), ray.GetPosition());
            if (len < lenMin) {
                gDragBound = 3;
            }
        }
        gMouse = gAtl.Frame().Input().Mouse().Export();
    }
    if (gAtl.Frame().Input().DragState() == CInput.eDragState.Move && gLeftSelect == null)
        gDragBound = 4;
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.LButton)) {
        gAddMove.Zero();
        if (gAtl.Brush().GetCamDev().GetCamCon() != null)
            gAtl.Brush().GetCamDev().GetCamCon().SetInput(gAtl.Frame().Input());
        if (gDragBound == 4) {
            gDragBound = 0;
            return;
        }
        if (gDragBound != 0 || gAtl.Frame().Input().DragState() != CInput.eDragState.None) {
            gDragBound = 0;
            return;
        }
        let selectLen = 1000000000;
        let selectSub = null;
        let bselectSub = null;
        let ray = gAtl.Brush().GetCamDev().GetRay(gAtl.Frame().Input().Mouse().x, gAtl.Frame().Input().Mouse().y);
        if (gAtl.Brush().GetCamDev().GetOrthographic() && ray.GetDirect().z < -0.9)
            ray.GetOriginal().z += 1000;
        for (let canvas of gAtl.mCanvasMap.values()) {
            for (let subject of canvas.GetSubMap().values()) {
                let ptArr = subject.FindComps(CPaint);
                let clArr = subject.FindComps(CCollider);
                for (let pt of ptArr) {
                    let bound = pt.GetBoundFMat();
                    if (CUtilMath.RayBoxIS(bound.mMin, bound.mMax, ray)) {
                        let len = CMath.V3Distance(ray.GetOriginal(), ray.GetPosition());
                        if (len < selectLen) {
                            bselectSub = selectSub;
                            selectLen = len;
                            selectSub = subject;
                            gSelectBound = bound;
                            break;
                        }
                    }
                }
                for (let cl of clArr) {
                    let bound = cl.GetBoundGJK();
                    if (bound.GetType() != CBound.eType.Null && CUtilMath.RayBoxIS(bound.mMin, bound.mMax, ray)) {
                        let len = CMath.V3Distance(ray.GetOriginal(), ray.GetPosition());
                        if (len < selectLen) {
                            bselectSub = selectSub;
                            selectLen = len;
                            selectSub = subject;
                            gSelectBound = bound;
                            break;
                        }
                    }
                }
            }
        }
        if (selectSub != null) {
            if (gLeftSelect == selectSub && bselectSub != null)
                selectSub = bselectSub;
            LeftSelect(selectSub);
        }
        else
            LeftSelect(null);
    }
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.Delete)) {
        DevToolLeftRemove();
    }
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.Esc)) {
        LeftSelect(null);
    }
}
function DevToolCamKeyChange(_key) {
    for (let canvas of gAtl.mCanvasMap.values()) {
        canvas.SetCameraKey(_key);
        canvas.ClearBatch();
    }
}
function SyncSubjectTreeRecursive(_parent, _target, _gift) {
    if (_target.IsDestroy())
        return;
    const parentUl = CUtil.ID(_parent.ObjHash() + "_ul");
    if (!parentUl)
        return;
    let li = CUtil.ID(_target.ObjHash() + "_li");
    if (!li) {
        const newItem = CDomFactory.DataToDom(LeftNewItem(_target));
        parentUl.append(newItem);
        const hash = _target.ObjHash();
        gLeftItem.set(_target.ObjHash(), _target);
        newItem.setAttribute('draggable', 'true');
        newItem.addEventListener('dragstart', (ev) => {
            ev.stopPropagation();
            ev.dataTransfer?.setData('hash', hash);
            CObject.SetDrag("CObject", _target);
        });
        newItem.addEventListener('dragover', (ev) => ev.preventDefault());
        newItem.addEventListener('drop', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const sourceKey = ev.dataTransfer?.getData('hash');
            if (sourceKey == hash || sourceKey == "")
                return;
            let cutObj = gLeftItem.get(sourceKey);
            for (let can of gAtl.mCanvasMap.values()) {
                let parent = can.FindParent(cutObj);
                if (parent instanceof CCanvas) {
                    let obj = can.Find(cutObj.Key(), true);
                    if (obj != null)
                        can.Detach(cutObj.Key());
                    else
                        can.DetachRes(cutObj.Key());
                }
                else if (parent instanceof CSubject) {
                    if (_target != parent)
                        parent.DetachChild(cutObj.Key());
                }
            }
            _target.PushChild(cutObj);
            DevToolLeft();
        });
    }
    else {
        const nameDiv = li.querySelector(".card-body .d-flex.align-items-center > div:nth-child(2)");
        if (nameDiv && nameDiv.textContent !== _target.Key()) {
            nameDiv.textContent = _target.Key();
        }
        const iconEl = li.querySelector(".card-body .d-flex.align-items-center > i");
        if (iconEl) {
            let icon = _target.Icon();
            if (_gift)
                icon = "bi bi-gift";
            const targetClass = _target.IsEnable() == false ? icon + "-fill" : icon;
            if (iconEl.className !== targetClass) {
                iconEl.className = targetClass;
            }
        }
    }
    if (_gift)
        _target.Prefab(gAtl.Frame());
    LeftModifyItem(_parent.ObjHash());
    const collapseDiv = CUtil.ID(_parent.ObjHash() + "_collapse");
    const childUl = CUtil.ID(_target.ObjHash() + "_ul");
    const isOpen = collapseDiv && collapseDiv.className.indexOf("show") !== -1;
    if (isOpen) {
        const currentHashes = new Set();
        for (let child of _target.mChild) {
            currentHashes.add(child.ObjHash());
        }
        for (let child of Array.from(childUl.children)) {
            const id = child.id;
            if (id.endsWith("_li")) {
                const objHash = id.replace(/_li$/, "");
                if (!currentHashes.has(objHash)) {
                    child.remove();
                    if (gLeftSelect == gLeftItem.get(objHash)) {
                        const rightPanel = gModal.FindFlex(2);
                        rightPanel.innerHTML = "";
                        gLeftSelect = null;
                    }
                    gLeftItem.delete(objHash);
                }
            }
        }
    }
    else
        return;
    for (let ch of _target.mChild)
        SyncSubjectTreeRecursive(_target, ch, _gift);
}
function DevToolLeftPush() {
    if (gLeftSelect instanceof CCanvas || gLeftSelect instanceof CSubject) {
        let list = CClass.ExtendsList(CSubject);
        const datalistId = "DevToolLeftAdd_List";
        let datalistHtml = `<datalist id="${datalistId}">`;
        for (let item of list) {
            datalistHtml += `<option value="${item.constructor.name}"></option>`;
        }
        datalistHtml += `</datalist>`;
        const div = CDomFactory.DataToDom(`
            <div>
                <label class="form-label">Enter or choose a type to add:</label>
                <input class="form-control" list="${datalistId}" id="DevToolLeftAdd_Input" placeholder="Type name...">
                ${datalistHtml}
            </div>
        `);
        const onPush = () => {
            let value = CUtil.IDValue("DevToolLeftAdd_Input");
            let cls = CClass.New(value);
            if (cls == null) {
                CAlert.E("class not def");
            }
            else {
                let item = LeftNewItem(cls);
                let bdiv = CUtil.ID(gLeftSelect.ObjHash() + "_ul");
                let lhtml = CDomFactory.DataToDom(item);
                LeftModifyItem(gLeftSelect.ObjHash());
                if (gLeftSelect instanceof CCanvas)
                    gLeftSelect.PushSub(cls);
                else if (gLeftSelect instanceof CSubject)
                    gLeftSelect.PushChild(cls);
            }
            confirm.Close();
        };
        const confirm = CConfirm.List(div, [onPush, () => { }], ["Push", "Cancel"]);
        const input = div.querySelector("#DevToolLeftAdd_Input");
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                onPush();
            }
        });
    }
    else if (gLeftSelect instanceof CBrush) {
        CConfirm.List("Camere Push?", [() => {
                let cam = new CCamera(gAtl.PF());
                let item = LeftNewItem(cam);
                let bdiv = CUtil.ID(gLeftSelect.ObjHash() + "_ul");
                bdiv.append(CDomFactory.DataToDom(item));
                LeftModifyItem(gLeftSelect.ObjHash());
                gLeftSelect.mCameraMap.set(cam.Key(), cam);
            }, () => { }], ["Push", "Cancel"]);
    }
    else {
        CConfirm.List("CCanvas Push?", [() => {
                let can = gAtl.NewCanvas(CUniqueID.GetHash());
                let item = LeftNewItem(can);
                let bdiv = CUtil.ID("DevToolLeft");
                bdiv.append(CDomFactory.DataToDom(item));
                DevToolLeft();
            }, () => { }], ["Push", "Cancel"]);
    }
}
window["DevToolLeftPush"] = DevToolLeftPush;
function DevToolLeftRemove(_destry = true) {
    if (_destry == false) { }
    else if (gLeftSelect instanceof CSubject)
        gLeftSelect.Destroy();
    else if (gLeftSelect instanceof CCanvas) {
        gAtl.Frame().RemoveIAuto(gLeftSelect);
        gAtl.mCanvasMap.delete(gLeftSelect.Key());
    }
    else if (gLeftSelect instanceof CCamera)
        gAtl.mBrush.mCameraMap.delete(gLeftSelect.Key());
    else
        return;
    let li = CUtil.ID(gLeftSelect.ObjHash() + "_li");
    const parentUl = li.parentElement;
    li.remove();
    gLeftItem.delete(gLeftSelect.ObjHash());
    if (parentUl.id.endsWith("_ul")) {
        const parentObjHash = parentUl.id.replace(/_ul$/, "");
        LeftModifyItem(parentObjHash);
    }
    const rightPanel = gModal.FindFlex(2);
    rightPanel.innerHTML = "";
    gLeftSelect = null;
}
window["DevToolLeftRemove"] = DevToolLeftRemove;
function DevToolGiftSwap(_obj) {
    for (let can of gAtl.mCanvasMap.values()) {
        let parent = can.FindParent(_obj);
        if (parent instanceof CCanvas) {
            let obj = can.Find(_obj.Key(), true);
            if (obj != null) {
                can.Detach(_obj.Key());
                _obj.mPTArr = null;
                can.GetResMap().set(_obj.Key(), _obj);
                DevToolLeftRemove(false);
            }
            else {
                can.DetachRes(_obj.Key());
                can.PushSub(_obj);
                _obj.mPTArr = null;
                DevToolLeftRemove(false);
            }
        }
        else if (parent instanceof CSubject) {
            CAlert.E("자식만 따로 프리팹 불가능");
        }
    }
}
function DevToolRight(_obj) {
    const rightPanel = gModal.FindFlex(2);
    rightPanel.innerHTML = "";
    if (_obj instanceof CSubject) {
        const pos = _obj.GetPos();
        const rot = _obj.GetRot();
        const sca = _obj.GetSca();
        const enabled = _obj.IsEnable();
        const headerCard = CDomFactory.DataToDom(`
            <div class="card m-2">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <input type="checkbox" id="SubjectEnable" ${enabled ? "checked" : ""}>
                        <span class="fw-bold">${_obj.constructor.name}-${_obj.Key()}</span>
                    </div>
                    <div class="d-flex gap-2">
                        <i class="bi ${_obj.IsBlackBoard() ? "bi-bookmark-fill" : "bi-bookmark"}" 
                        style="cursor: pointer;" title="Blackboard" id="DevToolBB"></i>
                        <i class="bi bi-clipboard-plus" style="cursor: pointer;" title="Copy" id="DevToolCopy"></i>
                        <i class="bi bi-gift" style="cursor: pointer;" title="Gift" id="DevToolGift"></i>
                        <i class="bi bi-trash" style="cursor: pointer;" title="Delete" id="DevToolDelete"></i>
                    </div>
                </div>
            </div>
        `);
        const transformDiv = CDomFactory.DataToDom(`
            <div class="d-flex flex-column gap-2 m-2">
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Pos:</label>
                    <input type="number" class="form-control form-control-sm" id="PosX" value="${pos.x}">
                    <input type="number" class="form-control form-control-sm" id="PosY" value="${pos.y}">
                    <input type="number" class="form-control form-control-sm" id="PosZ" value="${pos.z}">
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Rot:</label>
                    <input type="number" class="form-control form-control-sm" id="RotX" value="${rot.x}">
                    <input type="number" class="form-control form-control-sm" id="RotY" value="${rot.y}">
                    <input type="number" class="form-control form-control-sm" id="RotZ" value="${rot.z}">
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Sca:</label>
                    <input type="number" class="form-control form-control-sm" id="ScaX" value="${sca.x}">
                    <input type="number" class="form-control form-control-sm" id="ScaY" value="${sca.y}">
                    <input type="number" class="form-control form-control-sm" id="ScaZ" value="${sca.z}">
                </div>
            </div>
        `);
        rightPanel.append(headerCard);
        rightPanel.append(transformDiv);
        const enableCheckbox = CUtil.ID("SubjectEnable");
        enableCheckbox.onchange = () => {
            _obj.SetEnable(enableCheckbox.checked);
        };
        const setVec3 = (prefix, setter) => {
            const x = CUtil.ID(prefix + "X");
            const y = CUtil.ID(prefix + "Y");
            const z = CUtil.ID(prefix + "Z");
            const ChangeFun = () => {
                const vec = new CVec3(parseFloat(x.value), parseFloat(y.value), parseFloat(z.value));
                setter(vec);
            };
            x.onchange = y.onchange = z.onchange = ChangeFun;
            const MounsDownFun = (_event) => {
                if (_event.button === 1) {
                    _event.preventDefault();
                    var ct = _event.currentTarget;
                    CObject.FocusInputNumberChange(ct, (_value) => {
                        const vec = new CVec3(parseFloat(x.value), parseFloat(y.value), parseFloat(z.value));
                        setter(vec);
                    });
                }
            };
            x.onmousedown = y.onmousedown = z.onmousedown = MounsDownFun;
        };
        setVec3("Pos", v => _obj.SetPos(v));
        setVec3("Rot", v => _obj.SetRot(v));
        setVec3("Sca", v => _obj.SetSca(v));
        const bbIcon = CUtil.ID("DevToolBB");
        if (bbIcon) {
            bbIcon.onclick = () => {
                const newState = !_obj.IsBlackBoard();
                _obj.SetBlackBoard(newState);
                if (newState) {
                    bbIcon.classList.remove("bi-bookmark");
                    bbIcon.classList.add("bi-bookmark-fill");
                }
                else {
                    bbIcon.classList.remove("bi-bookmark-fill");
                    bbIcon.classList.add("bi-bookmark");
                }
            };
        }
        const copyIcon = CUtil.ID("DevToolCopy");
        if (copyIcon) {
            copyIcon.onclick = () => {
                navigator.clipboard.writeText(_obj.ToStr());
                CAlert.Info("Copy!");
            };
        }
        const giftIcon = CUtil.ID("DevToolGift");
        if (giftIcon) {
            giftIcon.onclick = () => {
                DevToolGiftSwap(_obj);
            };
        }
        const deleteIcon = CUtil.ID("DevToolDelete");
        if (deleteIcon) {
            deleteIcon.onclick = () => {
                _obj.Destroy();
                DevToolLeftRemove();
            };
        }
    }
    else if (_obj instanceof CCamera) {
        const eye = _obj.GetEye();
        const look = _obj.GetLook();
        const cameraDiv = CDomFactory.DataToDom(`

            <div class="card m-2">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold">${_obj.constructor.name}-${_obj.Key()}</span>
                    </div>
                    <div class="d-flex gap-2">
                        <i class="bi ${_obj.IsBlackBoard() ? "bi-bookmark-fill" : "bi-bookmark"}" 
                            style="cursor: pointer;" title="Blackboard" id="DevToolBB"></i>
                        <i class="bi bi-trash" style="cursor: pointer;" title="Delete" id="DevToolDelete"></i>
                    </div>
                </div>
            </div>

            <div class="d-flex flex-column gap-2 m-2">
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Eye:</label>
                    <input type="number" class="form-control form-control-sm" id="EyeX" value="${eye.x}">
                    <input type="number" class="form-control form-control-sm" id="EyeY" value="${eye.y}">
                    <input type="number" class="form-control form-control-sm" id="EyeZ" value="${eye.z}">
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Look:</label>
                    <input type="number" class="form-control form-control-sm" id="LookX" value="${look.x}">
                    <input type="number" class="form-control form-control-sm" id="LookY" value="${look.y}">
                    <input type="number" class="form-control form-control-sm" id="LookZ" value="${look.z}">
                </div>
            </div>
        `);
        rightPanel.append(cameraDiv);
        const setVec3 = (prefix, setter) => {
            const x = CUtil.ID(prefix + "X");
            const y = CUtil.ID(prefix + "Y");
            const z = CUtil.ID(prefix + "Z");
            const update = () => {
                const vec = new CVec3(parseFloat(x.value), parseFloat(y.value), parseFloat(z.value));
                setter(vec);
            };
            x.onchange = y.onchange = z.onchange = update;
        };
        setVec3("Eye", v => { _obj.SetEye(v); _obj.mReset = true; });
        setVec3("Look", v => { _obj.SetLook(v); _obj.mReset = true; });
        const bbIcon = CUtil.ID("DevToolBB");
        if (bbIcon) {
            bbIcon.onclick = () => {
                const newState = !_obj.IsBlackBoard();
                _obj.SetBlackBoard(newState);
                if (newState) {
                    bbIcon.classList.remove("bi-bookmark");
                    bbIcon.classList.add("bi-bookmark-fill");
                }
                else {
                    bbIcon.classList.remove("bi-bookmark-fill");
                    bbIcon.classList.add("bi-bookmark");
                }
            };
        }
        const deleteIcon = CUtil.ID("DevToolDelete");
        if (deleteIcon) {
            deleteIcon.onclick = () => {
                DevToolLeftRemove();
            };
        }
    }
    else if (_obj instanceof CCanvas) {
        const paused = _obj.IsPause();
        const canvasCard = CDomFactory.DataToDom(`
            <div class="card m-2">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <input type="checkbox" id="CanvasPause" ${paused ? "checked" : ""}>
                        <span class="fw-bold">${_obj.constructor.name}-${_obj.Key()}</span>
                    </div>
                    <div class="d-flex gap-2">
                        <i class="bi ${_obj.IsBlackBoard() ? "bi-bookmark-fill" : "bi-bookmark"}" 
                            style="cursor: pointer;" title="Blackboard" id="DevToolBB"></i>
                        <i class="bi bi-save" style="cursor: pointer;" title="Save" id="DevToolSave"></i>
                        <i class="bi bi-clipboard-plus" style="cursor: pointer;" title="Copy" id="DevToolCopy"></i>
                        <i class="bi bi-trash" style="cursor: pointer;" title="Delete" id="DevToolDelete"></i>
                    </div>
                </div>
            </div>
        `);
        rightPanel.append(canvasCard);
        const bbIcon = CUtil.ID("DevToolBB");
        if (bbIcon) {
            bbIcon.onclick = () => {
                const newState = !_obj.IsBlackBoard();
                _obj.SetBlackBoard(newState);
                if (newState) {
                    bbIcon.classList.remove("bi-bookmark");
                    bbIcon.classList.add("bi-bookmark-fill");
                }
                else {
                    bbIcon.classList.remove("bi-bookmark-fill");
                    bbIcon.classList.add("bi-bookmark");
                }
            };
        }
        const pauseCheckbox = CUtil.ID("CanvasPause");
        pauseCheckbox.onchange = () => {
            _obj.SetPause(pauseCheckbox.checked);
        };
        const saveIcon = CUtil.ID("DevToolSave");
        if (saveIcon) {
            saveIcon.onclick = async () => {
                if (_obj.GetCameraKey() == "Dev")
                    _obj.SetCameraKey(gCanvasCam.get(_obj));
                if (_obj.GetCameraKey() == null)
                    _obj.SetCameraKey("2D");
                await CWebView.JToWFileSave("CCanvas", _obj.Key() + ".json", _obj.ToStr());
                _obj.SetCameraKey("Dev");
                CAlert.Info(_obj.Key() + " Saved!");
            };
        }
        const copyIcon = CUtil.ID("DevToolCopy");
        if (copyIcon) {
            copyIcon.onclick = () => {
                navigator.clipboard.writeText(_obj.ToStr());
                CAlert.Info("Copy!");
            };
        }
        const deleteIcon = CUtil.ID("DevToolDelete");
        if (deleteIcon) {
            deleteIcon.onclick = () => {
                DevToolLeftRemove();
            };
        }
    }
    else if (_obj instanceof CBrush) {
        const paused = _obj.IsPause();
        const brushCard = CDomFactory.DataToDom(`
            <div class="card m-2">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <input type="checkbox" id="BrushPause" ${paused ? "checked" : ""}>
                        <span class="fw-bold">${_obj.constructor.name}</span>
                    </div>
                    <div class="d-flex gap-2">
                        <i class="bi bi-save" style="cursor: pointer;" title="Save" id="DevToolSave"></i>
                    </div>
                </div>
            </div>
            
            <label for="BrushCameraSelect" class="form-label ps-1">카메라 선택:</label>
            <select id="BrushCameraSelect" class="form-select form-select-sm"></select>
            
        `);
        rightPanel.append(brushCard);
        const pauseCheckbox = CUtil.ID("BrushPause");
        pauseCheckbox.onchange = () => {
            _obj.SetPause(pauseCheckbox.checked);
        };
        const saveIcon = CUtil.ID("DevToolSave");
        if (saveIcon) {
            saveIcon.onclick = async () => {
                CAlert.Info("Brush Saved!");
                await CWebView.JToWFileSave("CBrush", "Brush.json", _obj.ToStr());
            };
        }
        const camSelect = brushCard.querySelector("#BrushCameraSelect");
        for (let [key, cam] of _obj.mCameraMap) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = key;
            if (key === gAtl.Brush().GetCamDev().Key()) {
                option.selected = true;
            }
            camSelect.appendChild(option);
        }
        camSelect.onchange = () => {
            const selectedKey = camSelect.value;
            const devCam = gAtl.Brush().GetCamDev();
            if (selectedKey == "Dev") {
                const firstCanvas = gCanvasCam.keys().next().value;
                const firstCamKey = gCanvasCam.get(firstCanvas);
                if (firstCamKey) {
                    const firstCam = gAtl.Brush().GetCamera(firstCamKey);
                    if (firstCam) {
                        devCam.Import(firstCam);
                        devCam.SetKey("Dev");
                        devCam.mReset = true;
                        if (devCam.mOrthographic)
                            devCam.SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
                        else
                            devCam.SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
                    }
                }
            }
            DevToolCamKeyChange(selectedKey);
        };
    }
}
function DevToolLeft() {
    let listDiv = { "tag": "ul", "class": "list-group w-100 h-100", "id": "DevToolLeft", "html": [] };
    listDiv.html.push(`
        <div class="card bg-warning p-0">
            <div class="card-body p-1 d-flex justify-content-between align-items-center">
                <div class="text-start ms-2 fw-bold">Hierarchy</div>
                <div class="d-flex gap-2 me-2">
                    <i class="bi bi-save" style="cursor: pointer;" title="Save" id="DevToolAllSave"></i>
                    <i class="bi bi-file-earmark-plus" style="cursor: pointer;" title="Push" onclick='DevToolLeftPush()'></i>
                    <i class="bi bi-trash" style="cursor: pointer;" title="Remove" onclick='DevToolLeftRemove()'></i>
                </div>
            </div>
        </div>
    `);
    listDiv.html.push(LeftNewItem(gAtl.Brush()));
    for (let can of gAtl.mCanvasMap.values()) {
        listDiv.html.push(LeftNewItem(can));
    }
    const leftPanel = gModal.FindFlex(0);
    leftPanel.innerHTML = "";
    leftPanel.append(CDomFactory.DataToDom(listDiv));
    const saveIcon = CUtil.ID("DevToolAllSave");
    if (saveIcon) {
        saveIcon.onclick = async () => {
            let SaveFun = async () => {
                await CWebView.JToWFileSave("CBrush", "Brush.json", gAtl.Brush().ToStr());
                for (let [key, value] of gAtl.mCanvasMap) {
                    if (value.GetCameraKey() == "Dev")
                        value.SetCameraKey(gCanvasCam.get(value));
                    if (value.GetCameraKey() == null)
                        value.SetCameraKey("2D");
                    if (value.mSave)
                        await CWebView.JToWFileSave("CCanvas", value.Key() + ".json", value.ToStr());
                    value.SetCameraKey("Dev");
                }
                CAlert.Info("All Saved!");
            };
            if (CWebView.IsWebView() != CWebView.eType.None) {
                SaveFun();
            }
            else {
                CConfirm.List("Save Type Select!", [
                    () => {
                        let json = { brash: "", canvas: [], script: "" };
                        let data = CStorage.Get(CPath.PHPCR() + "Save.json");
                        if (data != null)
                            json = JSON.parse(data);
                        json.brash = gAtl.Brush().ToStr();
                        for (let [key, value] of gAtl.mCanvasMap) {
                            if (value.GetCameraKey() == "Dev")
                                value.SetCameraKey(gCanvasCam.get(value));
                            if (value.GetCameraKey() == null)
                                value.SetCameraKey("2D");
                            if (value.mSave)
                                json.canvas.push(value.ToStr());
                            value.SetCameraKey("Dev");
                        }
                        CStorage.Set(CPath.PHPCR() + "Save.json", JSON.stringify(json));
                        CAlert.Info("All Saved!");
                    },
                    async () => {
                        await SaveFun();
                    }
                ], ["Web", "File"]);
            }
        };
    }
    const ulRoot = CUtil.ID("DevToolLeft");
    ulRoot?.addEventListener("click", (e) => {
        const target = e.target;
        if (target.className == "bi bi-file-earmark-plus" || target.className == "bi bi-trash")
            return;
        const li = target.closest("li[id$='_li']");
        if (!li) {
            LeftSelect(null);
            return;
        }
        const objHash = li.id.replace(/_li$/, "");
        const obj = gLeftItem.get(objHash);
        if (!obj)
            return;
        LeftSelect(obj);
    });
    ulRoot?.addEventListener("dblclick", (e) => {
        const target = e.target;
        if (target.tagName == "I")
            return;
        const li = target.closest("li[id$='_li']");
        if (!li)
            return;
        const objHash = li.id.replace(/_li$/, "");
        const onRename = () => {
            const key = CUtil.IDValue("DevToolLeftRename");
            const textDiv = li.querySelector(".card-body .d-flex.align-items-center > div:nth-child(2)");
            if (textDiv instanceof HTMLElement) {
                textDiv.textContent = key;
            }
            gLeftItem.get(objHash).SetKey(key);
        };
        const renameHtml = `
            Rename?<br>
            <input type='text' id='DevToolLeftRename' value='${gLeftItem.get(objHash).Key()}' class="form-control"/>
        `;
        const confirm = CConfirm.List(renameHtml, [onRename, () => { }], ["OK", "Cancel"]);
        setTimeout(() => {
            const input = document.getElementById("DevToolLeftRename");
            if (input) {
                input.focus();
                input.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        onRename();
                        confirm.Close();
                    }
                });
            }
        }, 0);
    });
    for (let [key, value] of gAtl.Brush().mCameraMap) {
        let item = LeftNewItem(value);
        let bdiv = CUtil.ID(gAtl.Brush().ObjHash() + "_ul");
        bdiv.append(CDomFactory.DataToDom(item));
    }
    LeftModifyItem(gAtl.Brush().ObjHash());
    for (let can of gAtl.mCanvasMap.values()) {
        listDiv.html.push(LeftNewItem(can));
        let canDiv = CUtil.ID(can.ObjHash() + "_li");
        canDiv.addEventListener('dragover', (ev) => ev.preventDefault());
        canDiv.addEventListener('drop', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const sourceKey = ev.dataTransfer?.getData('hash');
            let cutObj = gLeftItem.get(sourceKey);
            for (let can of gAtl.mCanvasMap.values()) {
                let parent = can.FindParent(cutObj);
                if (parent instanceof CCanvas) {
                    let obj = can.Find(cutObj.Key(), true);
                    if (obj != null)
                        can.Detach(cutObj.Key());
                    else
                        can.DetachRes(cutObj.Key());
                }
                else if (parent instanceof CSubject) {
                    parent.DetachChild(cutObj.Key());
                }
            }
            can.PushSub(cutObj);
            DevToolLeft();
        });
        const parentCaret = CUtil.ID(can.ObjHash() + "_caret");
        if (parentCaret instanceof HTMLElement && parentCaret.hasAttribute("hidden")) {
            parentCaret.removeAttribute("hidden");
        }
        const countSpan = CUtil.ID(can.ObjHash() + "_count");
        if (countSpan) {
            countSpan.textContent = `(${can.GetSubMap().size})`;
        }
    }
}
function LeftSelect(_obj) {
    if (gLeftSelect) {
        const prevCard = CUtil.ID(gLeftSelect.ObjHash() + "_li")?.querySelector(".card");
        if (prevCard)
            prevCard.classList.remove("bg-secondary-subtle");
    }
    if (_obj == null) {
        gLeftSelect = null;
        const rightPanel = gModal.FindFlex(2);
        rightPanel.innerHTML = "";
        return;
    }
    let li = CUtil.ID(_obj.ObjHash() + "_li");
    const curCard = li.querySelector(".card");
    if (curCard)
        curCard.classList.add("bg-secondary-subtle");
    const rightPanel = gModal.FindFlex(2);
    rightPanel.innerHTML = "";
    DevToolRight(_obj);
    rightPanel.append(_obj.EditInit());
    gLeftSelect = _obj;
    if (_obj instanceof CCanvas) {
        gLastCanvas = _obj;
        const bdiv = CUtil.ID(_obj.ObjHash() + "_ul");
        if (bdiv.children.length === 0) {
            for (let [key, value] of _obj.GetSubMap()) {
                const item = LeftNewItem(value);
                bdiv.append(CDomFactory.DataToDom(item));
            }
        }
    }
}
function LeftNewItem(_obj) {
    gLeftItem.set(_obj.ObjHash(), _obj);
    const collapseId = `${_obj.ObjHash()}_collapse`;
    let str = `<li id='${_obj.ObjHash()}_li'>
        <div class="card p-0">
            <div class="card-body p-0 d-flex overflow-hidden white-space-nowrap cursor-pointer">
                <div style="width: 0rem; opacity: 0;"></div>
                <i class="bi bi-caret-down-fill me-1" data-bs-toggle="collapse" 
                    href="#${collapseId}" aria-expanded="true" hidden id='${_obj.ObjHash()}_caret'></i>
                <div class="d-flex align-items-center">
                <i class="bi ${_obj.Icon()} me-1"></i>
                <div>${_obj.Key()}</div>
                <div class="ms-1" id='${_obj.ObjHash()}_count'></div>
                </div>
            </div>
        </div>
        <div class="collapse ms-2" id="${collapseId}">
            <ul id="${_obj.ObjHash()}_ul" class='list-group w-100 h-100' style="list-style-type: none;"></ul>
        </div>
    </li>`;
    return str;
}
function LeftModifyItem(_key) {
    const myUl = CUtil.ID(_key + "_ul");
    if (!myUl)
        return;
    const count = myUl.children.length;
    const caret = CUtil.ID(_key + "_caret");
    if (caret) {
        if (count === 0) {
            caret.setAttribute("hidden", "true");
        }
        else {
            caret.removeAttribute("hidden");
        }
    }
    const countSpan = CUtil.ID(_key + "_count");
    if (countSpan) {
        countSpan.textContent = count > 0 ? `(${count})` : "";
    }
}
