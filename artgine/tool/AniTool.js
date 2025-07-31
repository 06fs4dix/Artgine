import { CAlert } from "../basic/CAlert.js";
import { CClass } from "../basic/CClass.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CDrop } from "../basic/CModal.js";
import { CString } from "../basic/CString.js";
import { CUtil } from "../basic/CUtil.js";
import { CAtelier } from "../canvas/CAtelier.js";
import { CAniFlow } from "../canvas/component/CAniFlow.js";
import { CClip, CClipBase64, CClipCoodi, CClipImg, CClipMesh } from "../canvas/component/CAnimation.js";
import { CPaint2D, CPaintHTML } from "../canvas/component/paint/CPaint2D.js";
import { CPaint3D } from "../canvas/component/paint/CPaint3D.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CMath } from "../geometry/CMath.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CTexture } from "../render/CTexture.js";
import { CInput } from "../system/CInput.js";
import { CCamCon2DFreeMove, CCamCon3DThirdPerson } from "../util/CCamCon.js";
import { CChecker } from "../util/CChecker.js";
import { CModalFlex } from "../util/CModalUtil.js";
var gAtlas = null;
var gCloseEvent = null;
export function AniToolAtlasEvent(_atl, _event) {
    gAtlas = _atl;
    gCloseEvent = CEvent.ToCEvent(_event);
}
var gTexcodiPaint = null;
export function AniToolTexcodiEvent(_texcodi, _event) {
    gTexcodiPaint = _texcodi;
    gCloseEvent = CEvent.ToCEvent(_event);
}
var gModal;
var gAtl;
var gAni;
var gSubject;
var gMode = 0;
var gImg = null;
var gUpdateEvent;
var gSelect = null;
var gBasicTex = null;
var gBasicMesh = null;
export function AniTool(_ani, _basicTex = null, _basicMesh = null) {
    gAni = _ani;
    gBasicTex = _basicTex;
    gBasicMesh = _basicMesh;
    gModal = new CModalFlex([0.7, 0.3], "AniToolModal");
    gModal.SetHeader("AniTool");
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
  <div style="display: flex; flex-direction: column; height: 100%;">
    <div style="flex: 9 1 0%;" id="AniToolLeft_div">
        <canvas id="AniToolLeft_can" style="width: 100%; height: 100%;" />
    </div>
    <div id="AniToolView_div" style="flex: 1 1 0%; overflow-x: auto;" class="d-flex align-items-center"></div>
  </div>
`);
    leftPanel.append(canvas);
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    let rightDiv = `
<div class="container p-0">
  <!-- 탭 버튼 -->
  <ul class="nav nav-tabs" id="toolTabs" role="tablist">
    <li class="nav-item">
      <a class="nav-link active" id="list-tab" data-bs-toggle="tab" href="#list" role="tab" >List</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" id="tab2d-tab" data-bs-toggle="tab" href="#tab2d" role="tab">2D</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" id="tab3d-tab" data-bs-toggle="tab" href="#tab3d" role="tab">3D</a>
    </li>
  </ul>

  <!-- 탭 컨텐츠 -->
  <div class="tab-content">
    <!-- List -->
    <div class="tab-pane fade show active" id="list" role="tabpanel">
      

      <div class="card mt-2">
        <div class="card-header">Animation</div>
        <div class="card-body p-1">

            <div class="form-check me-3">
    <input class="form-check-input" type="checkbox" id="loopCheck">
    <label class="form-check-label" for="loopCheck">Loop</label>
  </div>
          <div class="d-flex justify-content-between align-items-center small">
            <label for="defaultDelay" class="form-label mb-0">Default Delay</label>
            <input type="number" class="form-control form-control-sm w-50" id="defaultDelay" value='100'>
          </div>

          <div class="d-flex align-items-center mt-2">
            <div class="flex-grow-1">
              <label for="speedRange" class="form-label" id='speedRange_la'>Speed</label>
              <input type="range" class="form-range" id="speedRange" value='1' max='4' min='0.01' step='0.01'>
            </div>
            <div class="d-flex align-items-end gap-2 ms-2 pb-1">
              <button class="btn btn-outline-primary btn-sm" id='AniPlay_btn'><i class="bi bi-play-fill"></i></button>
              <button class="btn btn-outline-secondary btn-sm" id='AniPause_btn'><i class="bi bi-pause-fill"></i></button>
            </div>
          </div>
          <hr class="my-2">
            <div class="d-flex align-items-center gap-2">
            <select class="form-select form-select-sm flex-grow-1" id="clipTypeSelect">
                <!-- JS에서 동적으로 추가됨 -->
            </select>
            <button class="btn btn-sm btn-success" id="addClipBtn">+</button>
            </div>
            <div class="input-group input-group-sm mt-1">
                <input type="file" class="form-control" id="clipFileInput" multiple>
            </div>
        </div>
      </div>

      <div class="card mt-2">
        <div class="card-header">List</div>
        <div class="card-body p-1" id="listDiv">
          <!-- 리스트 콘텐츠 동적으로 추가 -->
        </div>
      </div>
    </div>

    <!-- 2D -->
    <div class="tab-pane fade" id="tab2d" role="tabpanel">
      <div class="card">
        <div class="card-header">Codi</div>
        <div class="card-body p-1 d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-primary" id='ModeMove_btn'><i class="bi bi-arrows-move"></i> 이동</button>
          <button class="btn btn-outline-success" id='ModeCreate_btn' ><i class="bi bi-plus-square"></i> 생성</button>
          <button class="btn btn-outline-danger" id='ModeDelete_btn'><i class="bi bi-trash"></i> 지우기</button>

          <div class="form-check mt-2">
            <input class="form-check-input" type="checkbox" id="autoCheck">
            <label class="form-check-label" for="autoCheck">자동</label>
          </div>
        </div>
      </div>

      <div class="card mt-2">
        <div class="card-header">Cut</div>
        <div class="card-body p-1">

            <div class="mt-3 d-flex gap-2">
            <button class="btn btn-primary btn-sm" id='CutExc_btn'>
                <i class="bi bi-play-fill me-1"></i> Execute
            </button>
            <button class="btn btn-outline-secondary btn-sm" id='ModeRange_btn'>
                <i class="bi bi-bounding-box me-1"></i> Range
            </button>
        </div>

          <div class="row">
            <div class="col">
              <label class="form-label">Division X</label>
              <input type="number" class="form-control" value='1' id="DivX_num">
            </div>
            <div class="col">
              <label class="form-label">Division Y</label>
              <input type="number" class="form-control" value='1' id="DivY_num">
            </div>
          </div>
          <div class="row mt-2">
            <div class="col">
              <label class="form-label">Start X</label>
              <input type="number" class="form-control" value='0' id="STX_num">
            </div>
            <div class="col">
              <label class="form-label">Start Y</label>
              <input type="number" class="form-control" value='0' id="STY_num">
            </div>
          </div>
          <div class="row mt-2">
            <div class="col">
              <label class="form-label">End X</label>
              <input type="number" class="form-control" value='0' id="EDX_num">
            </div>
            <div class="col">
              <label class="form-label">End Y</label>
              <input type="number" class="form-control" value='0' id="EDY_num">
            </div>
          </div>
        <div class="form-check me-3">
    <input class="form-check-input" type="checkbox" id='CutVertical'>
    <label class="form-check-label" for="CutVertical">Vertical</label>
  </div>
          
        </div>
      </div>
    </div>

    <!-- 3D -->
<div class="tab-pane fade" id="tab3d" role="tabpanel">
  <div class="card mt-2">
    <div class="card-header">3D Tool</div>
    <div class="card-body p-1" id='3DTool_div'>
      
    </div>
  </div>
</div>
  </div>
</div>

    
    `;
    rightPanel.append(CDomFactory.DataToDom(rightDiv));
    gAtl.Init([], "AniToolLeft_can", false).then(() => {
        if (gBasicTex == null)
            gBasicTex = gAtl.Frame().Pal().GetNoneTex();
        if (gBasicMesh == null)
            gBasicMesh = gAtl.Frame().Pal().GetBoxMesh();
        gAtl.NewCanvas("AniTool");
        gAtl.Canvas("AniTool").SetCameraKey("2D");
        AniToolAniListInit();
        gUpdateEvent = new CEvent(AniToolUpdate);
        gAtl.Frame().PushEvent(CEvent.eType.Update, gUpdateEvent);
        AniToolSubjectInit();
    });
    const selectEl = CUtil.ID("clipTypeSelect");
    const addBtn = CUtil.ID("addClipBtn");
    const classMap = CClass.ExtendsList(CClip);
    for (const key in classMap) {
        const opt = document.createElement("option");
        let name = classMap[key].constructor.name;
        opt.value = name;
        opt.textContent = name;
        selectEl.appendChild(opt);
    }
    addBtn.addEventListener("click", () => {
        const selected = selectEl.value;
        let newClip = CClass.New(selected);
        newClip.mDelay = Number(CUtil.IDValue("defaultDelay"));
        newClip.mTime = -1;
        gAni.Push(newClip);
        AniToolAniListInit();
    });
    const clipFileInput = CUtil.ID("clipFileInput");
    clipFileInput.addEventListener("change", async (e) => {
        const input = e.target;
        const files = input.files;
        CAlert.Info("Drag and Drop Use!Select File->Only Base64");
        if (files?.length) {
            let dorp = new CDrop();
            dorp.mFiles = files;
            dorp.mPaths = new Array(files.length);
            AniToolDrop(dorp);
        }
    });
    CUtil.ID("AniPlay_btn").onclick = AniToolPlay;
    CUtil.ID("AniPause_btn").onclick = AniToolSubjectInit;
    CUtil.ID("CutExc_btn").onclick = AniToolCutExe;
    const loopCheck = CUtil.ID("loopCheck");
    loopCheck.checked = gAni.mLoop ?? false;
    loopCheck.addEventListener("change", () => {
        gAni.mLoop = loopCheck.checked;
    });
    gModal.On(CEvent.eType.Drop, AniToolDrop);
    gModal.On(CEvent.eType.Close, async () => {
        gAtl.Frame().RemoveEvent(gUpdateEvent);
        gMode = 0;
        gAni.EditRefresh();
        if (gTexcodiPaint != null && gImg != null) {
            for (let clip of gAni.mClip) {
                if (clip instanceof CClipCoodi) {
                    gTexcodiPaint.SetTexCodi(clip.mSTX, clip.mSTY, clip.mEDX, clip.mEDY, gImg.GetWidth(), gImg.GetHeight());
                    break;
                }
            }
            gTexcodiPaint = null;
        }
        gImg = null;
        if (gAtlas != null) {
            let buf = null;
            let file = "";
            let codiArr = new Array();
            for (let clip of gAni.mClip) {
                if (clip instanceof CClipBase64) {
                    buf = clip.mBase64File.mData;
                    file = clip.mBase64File.mHash;
                }
                else if (clip instanceof CClipImg) {
                    file = clip.mImg;
                }
                else if (clip instanceof CClipCoodi) {
                    codiArr.push(new CVec4(clip.mSTX, clip.mSTY, clip.mEDX, clip.mEDY));
                }
            }
            if (file != "")
                await gAtlas.Push(file, buf, codiArr);
            gAtlas = null;
        }
        if (gCloseEvent != null) {
            gCloseEvent.Call();
            gCloseEvent = null;
        }
    });
    CUtil.ID("ModeMove_btn").onclick = () => { AniToolSetMode(1); };
    CUtil.ID("ModeCreate_btn").onclick = () => { AniToolSetMode(2); };
    CUtil.ID("ModeDelete_btn").onclick = () => { AniToolSetMode(3); };
    CUtil.ID("ModeRange_btn").onclick = () => { AniToolSetMode(4); };
    CUtil.ID("list-tab").onclick = () => { AniToolSetMode(0); };
    CUtil.ID("STX_num").onchange = AniToolRangeInit;
    CUtil.ID("STY_num").onchange = AniToolRangeInit;
    CUtil.ID("EDX_num").onchange = AniToolRangeInit;
    CUtil.ID("EDY_num").onchange = AniToolRangeInit;
}
async function AniToolDrop(_drop) {
    if (_drop.mFiles != null) {
        let fileDrop = _drop;
        for (let i = 0; i < fileDrop.mPaths.length; ++i) {
            if (fileDrop.mPaths.length > 0 && fileDrop.mPaths[i] != null) {
                gAtl.Frame().Load().Load(fileDrop.mPaths[i]);
                let info = CString.ExtCut(fileDrop.mPaths[i]);
                let defaultDelay = Number(CUtil.IDValue("defaultDelay"));
                if (info.ext == "png" || info.ext == "jpg") {
                    let img = new CClipImg(-1, defaultDelay, fileDrop.mPaths[i]);
                    gAni.Push(img);
                }
                else {
                    let mesh = new CClipMesh(-1, defaultDelay, fileDrop.mPaths[i], "");
                    gAni.Push(mesh);
                }
            }
            else {
                let clipBase64 = new CClipBase64(0);
                gAni.Push(clipBase64);
                const file = fileDrop.mFiles[i];
                const ext = file.name.split('.').pop()?.toLowerCase() ?? "";
                if (ext === "gltf" || ext === "fbx") {
                    const arrayBuffer = await file.arrayBuffer();
                    let base64 = clipBase64.mBase64File;
                    base64.mExt = file.name.split('.').pop()?.toLowerCase() ?? "bin";
                    base64.mData = arrayBuffer;
                    base64.RefreshHash();
                    base64.mOption = clipBase64.mBase64File.mOption;
                    base64.mOption.mAutoLoad = false;
                    let clip = new CClipMesh(0, 0, base64.FileName(), "");
                    gAni.Push(clip);
                }
                else {
                    const arrayBuffer = await file.arrayBuffer();
                    let base64 = clipBase64.mBase64File;
                    base64.mExt = ext;
                    base64.mData = arrayBuffer;
                    base64.RefreshHash();
                    base64.mOption = clipBase64.mBase64File.mOption;
                    let defaultDelay = Number(CUtil.IDValue("defaultDelay"));
                    let clip = new CClipImg(-1, defaultDelay, base64.FileName());
                    gAni.Push(clip);
                }
            }
        }
        AniToolAniListInit();
    }
}
function DragBoxToPoint(_bound) {
    let stMouse = _bound.mMin;
    let edMouse = _bound.mMax;
    const cam = gAtl.Brush().GetCam2D();
    let stRay = cam.GetRay(stMouse.x, stMouse.y);
    let edRay = cam.GetRay(edMouse.x, edMouse.y);
    if (stRay.GetDirect().z == 0 || edRay.GetDirect().z == 0)
        return;
    let stWorld = CMath.V3AddV3(stRay.GetOriginal(), CMath.V3MulFloat(stRay.GetDirect(), -stRay.GetOriginal().z / stRay.GetDirect().z));
    let edWorld = CMath.V3AddV3(edRay.GetOriginal(), CMath.V3MulFloat(edRay.GetDirect(), -edRay.GetOriginal().z / edRay.GetDirect().z));
    if (gImg == null) {
        CAlert.W("No Img");
        return;
    }
    let clipSt = new CVec3();
    let clipEd = new CVec3();
    clipSt.x = stWorld.x;
    clipEd.x = edWorld.x;
    clipSt.y = edWorld.y;
    clipEd.y = stWorld.y;
    let stX = Math.trunc(clipSt.x), edX = Math.trunc(clipEd.x), stY = Math.trunc(clipSt.y), edY = Math.trunc(clipEd.y);
    return [stX, -stY, edX, -edY];
}
function AniToolUpdate(_delay) {
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.LButton)) {
        if (gMode == 4 || gMode == 2) {
            gAtl.Frame().Input().SetDragBox(true);
        }
        else if (gMode == 1) {
            let mouse = gAtl.Frame().Input().Mouse();
            const cam = gAtl.Brush().GetCam2D();
            let ray = cam.GetRay(mouse.x, mouse.y);
            let world = CMath.V3AddV3(ray.GetOriginal(), CMath.V3MulFloat(ray.GetDirect(), -ray.GetOriginal().z / ray.GetDirect().z));
            world.x = Math.trunc(world.x);
            world.y = Math.trunc(world.y);
            world.z = Math.trunc(world.z);
            if (gSelect == null) {
                for (let i = 0; i < gAni.mClip.length; ++i) {
                    let clip = gAni.mClip[i];
                    if (clip instanceof CClipCoodi) {
                        if (clip.mSTX < world.x && world.x < clip.mEDX && clip.mSTY < -world.y && -world.y < clip.mEDY) {
                            gSelect = gAtl.Canvas("AniTool").Find(i + "");
                        }
                    }
                }
            }
            else {
                world.z = 0;
                gSelect.SetPos(world);
            }
        }
    }
    else if (gAtl.Frame().Input().KeyUp(CInput.eKey.LButton)) {
        if (gMode == 4) {
            let point = DragBoxToPoint(gAtl.Frame().Input().GetDragBound());
            gAtl.Frame().Input().SetDragBox(false);
            CUtil.IDValue("STX_num", point[0]);
            CUtil.IDValue("STY_num", point[1]);
            CUtil.IDValue("EDX_num", point[2]);
            CUtil.IDValue("EDY_num", point[3]);
            AniToolRangeInit();
        }
        else if (gMode == 2) {
            let point = DragBoxToPoint(gAtl.Frame().Input().GetDragBound());
            gAtl.Frame().Input().SetDragBox(false);
            let defaultDelay = Number(CUtil.IDValue("defaultDelay"));
            gAni.Push(new CClipCoodi(-1, defaultDelay, point[0], point[1], point[2], point[3]));
            AniToolAniListInit();
        }
        else if (gMode == 1 && gSelect != null) {
            let codi = gAni.mClip[Number(gSelect.Key())];
            let sizeX = codi.mEDX - codi.mSTX;
            let sizeY = codi.mEDY - codi.mSTY;
            let pos = gSelect.GetPos();
            pos.x -= sizeX * 0.5;
            pos.y += sizeY * 0.5;
            codi.mSTX = pos.x;
            codi.mSTY = -pos.y;
            codi.mEDX = pos.x + sizeX;
            codi.mEDY = -pos.y + sizeY;
            gSelect = null;
            AniToolAniListInit();
        }
        if (gMode == 3) {
            let mouse = gAtl.Frame().Input().Mouse();
            const cam = gAtl.Brush().GetCam2D();
            let ray = cam.GetRay(mouse.x, mouse.y);
            let world = CMath.V3AddV3(ray.GetOriginal(), CMath.V3MulFloat(ray.GetDirect(), -ray.GetOriginal().z / ray.GetDirect().z));
            world.x = Math.trunc(world.x);
            world.y = Math.trunc(world.y);
            world.z = Math.trunc(world.z);
            for (let i = 0; i < gAni.mClip.length; ++i) {
                let clip = gAni.mClip[i];
                if (clip instanceof CClipCoodi) {
                    if (clip.mSTX < world.x && world.x < clip.mEDX && clip.mSTY < -world.y && -world.y < clip.mEDY) {
                        gAni.mClip.splice(i, 1);
                    }
                }
            }
            AniToolAniListInit();
        }
        AniToolSetMode(0);
    }
}
function AniToolSetMode(_mode) {
    gMode = _mode;
    CUtil.ID("ModeMove_btn").className = "btn btn-outline-primary";
    CUtil.ID("ModeCreate_btn").className = "btn btn-outline-success";
    CUtil.ID("ModeDelete_btn").className = "btn btn-outline-danger";
    CUtil.ID("ModeRange_btn").className = "btn btn-outline-secondary";
    switch (gMode) {
        case 1:
            CUtil.ID("ModeMove_btn").className = "btn btn-primary";
            break;
        case 2:
            CUtil.ID("ModeCreate_btn").className = "btn btn-success";
            break;
        case 3:
            CUtil.ID("ModeDelete_btn").className = "btn btn-danger";
            break;
        case 4:
            CUtil.ID("ModeRange_btn").className = "btn btn-secondary";
            break;
    }
}
function AniToolCutExe() {
    let DivX_num = Number(CUtil.IDValue("DivX_num"));
    let DivY_num = Number(CUtil.IDValue("DivY_num"));
    let STX_num = Number(CUtil.IDValue("STX_num"));
    let STY_num = Number(CUtil.IDValue("STY_num"));
    let EDX_num = Number(CUtil.IDValue("EDX_num"));
    let EDY_num = Number(CUtil.IDValue("EDY_num"));
    let defaultDelay = Number(CUtil.IDValue("defaultDelay"));
    let CutVertical = CUtil.IDChecked("CutVertical");
    let tickX = (EDX_num - STX_num) / DivX_num;
    let tickY = (EDY_num - STY_num) / DivY_num;
    if (CutVertical) {
        for (let y = 0; y < DivY_num * tickY; y += tickY) {
            for (let x = 0; x < DivX_num * tickX; x += tickX) {
                let codi = new CClipCoodi(-1, defaultDelay, x, y, x + tickX, y + tickY);
                gAni.Push(codi);
            }
        }
    }
    else {
        for (let x = 0; x < DivX_num * tickX; x += tickX) {
            for (let y = 0; y < DivY_num * tickY; y += tickY) {
                let codi = new CClipCoodi(-1, defaultDelay, x, y, x + tickX, y + tickY);
                gAni.Push(codi);
            }
        }
    }
    AniToolAniListInit();
}
function AniToolPlay() {
    gAtl.Canvas("AniTool").Clear();
    let d2 = AniToolIs2D();
    let speedRange = Number(CUtil.IDValue("speedRange"));
    CUtil.ID("speedRange_la").innerText = speedRange + "";
    if (d2 == false) {
        gAtl.Canvas("AniTool").SetCameraKey("3D");
        let camcon = new CCamCon3DThirdPerson(gAtl.Frame().Input());
        gAtl.Brush().GetCam3D().SetCamCon(camcon);
        camcon.SetPos(new CVec3());
        camcon.SetZoom(500);
        gSubject = gAtl.Canvas("AniTool").Push(new CSubject());
        let pt = gSubject.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
        let af = gSubject.PushComp(new CAniFlow(gAni));
        af.mSpeed = speedRange;
    }
    else {
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
        gSubject = gAtl.Canvas("AniTool").Push(new CSubject());
        let pt = gSubject.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
        pt.mAutoLoad.mFilter = CTexture.eFilter.Neaest;
        let af = gSubject.PushComp(new CAniFlow(gAni));
        af.mSpeed = speedRange;
    }
}
function AniToolRangeInit() {
    let b = gAtl.Canvas("AniTool").Find("Range");
    if (b != null)
        b.Destroy();
    let STX_num = Number(CUtil.IDValue("STX_num"));
    let STY_num = Number(CUtil.IDValue("STY_num"));
    let EDX_num = Number(CUtil.IDValue("EDX_num"));
    let EDY_num = Number(CUtil.IDValue("EDY_num"));
    let ClipSub = gAtl.Canvas("AniTool").Push(new CSubject());
    ClipSub.SetKey("Range");
    let pt = ClipSub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class='border border-primary' style='color:red;font-size: x-small;'></div>`), new CVec2(EDX_num - STX_num, EDY_num - STY_num), CUtil.ID("AniToolLeft_div")));
    pt.SetPivot(new CVec3(1, -1, 1));
    ClipSub.SetPos(new CVec3(STX_num, -STY_num));
}
function AniToolIs2D() {
    for (let i = 0; i < gAni.mClip.length; ++i) {
        let clip = gAni.mClip[i];
        if (clip instanceof CClipMesh) {
            return false;
        }
    }
    return true;
}
async function AniToolSubjectInit() {
    gAtl.Canvas("AniTool").Clear();
    let d2 = AniToolIs2D();
    if (d2 == false) {
        gAtl.Canvas("AniTool").SetCameraKey("3D");
        let camcon = new CCamCon3DThirdPerson(gAtl.Frame().Input());
        gAtl.Brush().GetCam3D().SetCamCon(camcon);
        camcon.SetPos(new CVec3());
        camcon.SetZoom(500);
        gSubject = gAtl.Canvas("AniTool").Push(new CSubject());
        let pt = gSubject.PushComp(new CPaint3D(gBasicMesh));
        pt.SetTexture(gAtl.Frame().Pal().GetNoneTex());
    }
    else {
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
        gSubject = gAtl.Canvas("AniTool").Push(new CSubject());
        await gAtl.Frame().Load().Load(gBasicTex);
        gImg = gAtl.Frame().Res().Find(gBasicTex);
        let pt = gSubject.PushComp(new CPaint2D(gBasicTex));
        pt.SetPivot(new CVec3(1, -1, 1));
        pt.mAutoLoad.mFilter = CTexture.eFilter.Neaest;
        AniToolRangeInit();
    }
    let pt2D = gSubject.FindComp(CPaint2D);
    let pt3D = gSubject.FindComp(CPaint3D);
    for (let i = 0; i < gAni.mClip.length; ++i) {
        let clip = gAni.mClip[i];
        if (clip instanceof CClipImg) {
            pt2D.SetPivot(new CVec3(1, -1, 1));
            pt2D.SetTexture(clip.mImg);
            CChecker.Exe(async () => {
                let tex = gAtl.Frame().Res().Find(clip.mImg);
                if (tex != null) {
                    if (gImg != tex) {
                        gImg = tex;
                        CUtil.IDValue("EDX_num", gImg.GetWidth());
                        CUtil.IDValue("EDY_num", gImg.GetHeight());
                        pt2D.SetSize(new CVec2(gImg.GetWidth(), gImg.GetHeight()));
                    }
                    AniToolRangeInit();
                    return false;
                }
                return true;
            }, 200);
        }
        else if (clip instanceof CClipCoodi) {
            let ClipSub = gAtl.Canvas("AniTool").Push(new CSubject());
            ClipSub.SetKey(i);
            let pt = ClipSub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class='border border-danger' style='color:red;font-size: x-small;'>${i}</div>`), new CVec2(clip.mEDX - clip.mSTX, clip.mEDY - clip.mSTY), CUtil.ID("AniToolLeft_div")));
            ClipSub.SetPos(new CVec3(clip.mSTX + pt.GetSize().x * 0.5, -(clip.mSTY + pt.GetSize().y * 0.5)));
        }
        else if (clip instanceof CClipBase64) {
            let cb64 = clip;
            var fw = gAtl.Frame();
            if (fw.Res().Find(cb64.mBase64File.FileName()) == null)
                await fw.Load().LoadSwitch(cb64.mBase64File.FileName(), cb64.mBase64File.mData, cb64.mBase64File.mOption);
        }
        else if (clip instanceof CClipMesh) {
            let mesh = gAtl.Frame().Res().Find(clip.mMesh);
            pt3D.SetMesh(clip.mMesh);
            CChecker.Exe(async () => {
                let mesh = gAtl.Frame().Res().Find(clip.mMesh);
                if (mesh != null) {
                    if (mesh && mesh.aniMap && mesh.aniMap.size > 0) {
                        const select = document.createElement("select");
                        select.className = "form-select";
                        select.size = 3;
                        select.setAttribute("aria-label", "size 3 select example");
                        for (const [key, aniInfo] of mesh.aniMap.entries()) {
                            const option = document.createElement("option");
                            option.value = key;
                            option.textContent = key + ` (${aniInfo.start} ~ ${aniInfo.end})`;
                            select.appendChild(option);
                        }
                        select.addEventListener("change", (e) => {
                            const target = e.target;
                            clip.mST = target.value;
                            AniToolAniListInit();
                        });
                        const div = document.getElementById("3DTool_div");
                        div.innerHTML = "";
                        if (div) {
                            div.appendChild(select);
                        }
                        else {
                            console.warn("3DTool_div not found");
                        }
                    }
                    return false;
                }
                return true;
            }, 200);
        }
    }
}
function AniToolViewRender() {
    const viewDiv = CUtil.ID("AniToolView_div");
    viewDiv.innerHTML = "";
    if (!gAni?.mClip?.length)
        return;
    const pixelsPerMs = 1;
    const totalEnd = Math.max(...gAni.mClip.map(c => c.mTime + c.mDelay), 1);
    const totalWidth = totalEnd * pixelsPerMs;
    viewDiv.className = "bg-light border overflow-x-auto";
    viewDiv.style.position = "relative";
    viewDiv.style.height = "20px";
    viewDiv.style.minWidth = "100%";
    viewDiv.style.overflowY = "hidden";
    viewDiv.style.whiteSpace = "nowrap";
    viewDiv.style.paddingBottom = "2px";
    const innerWrapper = document.createElement("div");
    innerWrapper.style.width = `${totalWidth}px`;
    innerWrapper.style.height = "100%";
    innerWrapper.style.position = "relative";
    for (let i = 0; i < gAni.mClip.length; ++i) {
        const clip = gAni.mClip[i];
        const left = clip.mTime * pixelsPerMs;
        const width = clip.mDelay * pixelsPerMs;
        const block = document.createElement("div");
        block.className = "bg-primary bg-opacity-50 border border-white text-white text-center small";
        block.style.position = "absolute";
        block.style.left = `${left}px`;
        block.style.width = `${width}px`;
        block.style.height = "100%";
        block.style.lineHeight = "20px";
        block.style.fontSize = "11px";
        block.style.cursor = "pointer";
        block.style.whiteSpace = "normal";
        block.style.wordBreak = "break-all";
        block.textContent = `${clip.constructor.name}[${i}]`;
        block.addEventListener("click", () => {
            const target = document.getElementById(`aniClipCard_${i}`);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
        innerWrapper.appendChild(block);
    }
    viewDiv.appendChild(innerWrapper);
}
function AniToolAniListInit() {
    const listDiv = CUtil.ID("listDiv");
    listDiv.innerHTML = "";
    const AniToolView_div = CUtil.ID("AniToolView_div");
    for (let i = 0; i < gAni.mClip.length; ++i) {
        const clip = gAni.mClip[i];
        const card = document.createElement("div");
        card.className = "card mt-2";
        card.id = `aniClipCard_${i}`;
        const header = document.createElement("div");
        header.className = "card-header d-flex justify-content-between align-items-center p-1";
        const title = document.createElement("span");
        title.textContent = `${clip.constructor.name}[${i}]`;
        const btnUp = document.createElement("button");
        btnUp.className = "btn btn-sm btn-outline-secondary me-1";
        btnUp.innerHTML = `<i class="bi bi-arrow-up"></i>`;
        btnUp.addEventListener("click", () => {
            if (i <= 0)
                return;
            const tmpTime = gAni.mClip[i].mTime;
            gAni.mClip[i].mTime = gAni.mClip[i - 1].mTime;
            gAni.mClip[i - 1].mTime = tmpTime;
            gAni.Sort();
            AniToolAniListInit();
        });
        const btnDown = document.createElement("button");
        btnDown.className = "btn btn-sm btn-outline-secondary me-1";
        btnDown.innerHTML = `<i class="bi bi-arrow-down"></i>`;
        btnDown.addEventListener("click", () => {
            if (i >= gAni.mClip.length - 1)
                return;
            const tmpTime = gAni.mClip[i].mTime;
            gAni.mClip[i].mTime = gAni.mClip[i + 1].mTime;
            gAni.mClip[i + 1].mTime = tmpTime;
            gAni.Sort();
            AniToolAniListInit();
        });
        const btnClose = document.createElement("button");
        btnClose.className = "btn-close btn-close-sm";
        btnClose.type = "button";
        btnClose.addEventListener("click", () => {
            gAni.mClip.splice(i, 1);
            AniToolAniListInit();
        });
        header.appendChild(title);
        header.appendChild(btnUp);
        header.appendChild(btnDown);
        header.appendChild(btnClose);
        const body = clip.EditInit();
        body.classList.add("card-body", "p-1");
        clip.EditChangeEx = () => {
            gAni.Sort();
            AniToolAniListInit();
        };
        card.appendChild(header);
        card.appendChild(body);
        listDiv.appendChild(card);
    }
    AniToolViewRender();
    AniToolSubjectInit();
}
