import "../../../artgine/artgine.js";
import { CPreferences } from "../../../artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "GL";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = true;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = false;
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = false;
gPF.mVersion = "mpuhzq22_2";
import { CAtelier } from "../../../artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CInput } from "../../../artgine/system/CInput.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CModalBackGround, CMDViewer } from "../../../artgine/util/CModalUtil.js";
import { CUtil } from "../../../artgine/basic/CUtil.js";
import { CUtilObj } from "../../../artgine/basic/CUtilObj.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CUtilWeb } from "../../../artgine/util/CUtilWeb.js";
import { CString } from "../../../artgine/basic/CString.js";
import { CPath } from "../../../artgine/basic/CPath.js";
import { CConfirm, CModal } from "../../../artgine/basic/CModal.js";
import { CChecker } from "../../../artgine/util/CChecker.js";
import { CTimer } from "../../../artgine/system/CTimer.js";
import { CTutorial } from "../../../artgine/util/CTutorial.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CLan } from "../../../artgine/basic/CLan.js";
import { CStorage } from "../../../artgine/system/CStorage.js";
import { GetDevToolScriptViewer, InitDevToolScriptViewer } from "../../../artgine/tool/DevTool.js";
import { CFile } from "../../../artgine/system/CFile.js";
import { CTooltip } from "../../../artgine/util/CTooltip.js";
import { Bootstrap } from "../../../artgine/basic/Bootstrap.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CPaint2D } from "../../../artgine/app/component/paint/CPaint2D.js";
import { CPaint3D } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CDOM } from "../../../artgine/basic/CDOM.js";
let can = gAtl.NewCanvas("2DCan");
can.SetCameraKey("2D");
let sub = can.PushSub(new CSubject());
sub.SetKey("2DSubject");
sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
can = gAtl.NewCanvas("3DCan");
can.SetCameraKey("3D");
sub = can.PushSub(new CSubject());
sub.SetKey("3DSubject");
sub.SetPos(new CVec3(-300, 0, 0));
let pt = sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
pt.SetTexture([gAtl.Frame().Pal().GetNoneTex()]);
let back = new CModalBackGround("back");
back.SetBody("<p style='color:red;' data-en='Try changing camera mode with number keys 2,3! Move with mouse' >숫자키 2,3 으로 카메라 모드를 변경해보세요!마우스로 이동<p>");
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.Num2)) {
        gAtl.Brush().GetCam3D().SetCamCon(null);
        let con = gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
        back.SetBody("<p style='color:red;' data-en='2D / Mouse right-click to move'>2D / 마우스 우클릭 이동<p>");
    }
    else if (gAtl.Frame().Input().KeyUp(CInput.eKey.Num3)) {
        gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
        gAtl.Brush().GetCam2D().SetCamCon(null);
        back.SetBody("<p style='color:red;' data-en='3D / Mouse right-click to move, left-click to rotate'>3D / 마우스 우클릭 이동, 좌클릭 회전<p>");
    }
    else if (gAtl.Frame().Input().KeyUp(CInput.eKey.F)) {
        CUtilObj.ShowModal(can);
    }
});
CLan.Set("en", "tuto1", "Welcome!<br>Click [Tutorial] to watch the tutorial, or click [Code] to continue with code editing");
CLan.Set("en", "tuto2", "If this is your first time, please click Tutorial");
CLan.Set("en", "tuto3", "Tutorial");
CLan.Set("en", "tuto4", "Code");
CLan.Set("en", "tuto5", "Press F1 to see shortcut key descriptions. Please close the window after checking");
CLan.Set("en", "tuto6", "Press F3 to enter developer mode");
CLan.Set("en", "tuto7", "Press F2 to check currently loaded resources");
CLan.Set("en", "tuto8", "Press F4 to check the current project code");
CLan.Set("en", "tuto9", "This project is a 2D/3D canvas mixed example.<br>You can check subjects in the left hierarchy-canvas");
CLan.Set("en", "tuto9-1", "Select the 3D Canvas, then select the 3D Subject to change its position.");
CLan.Set("en", "tuto10", "Press [N] key to code directly.<br>Check the comments and test it");
CLan.Set("en", "tuto11-1", "Now, try changing the texture");
CLan.Set("en", "tuto12", `
In the left hierarchy, select 3DCan.<br>
<br>
Select 3DSubject.<br>
<br>
Move Pos using either of the two methods below.<br>
A. Grab the red square at the center of the subject and move it.<br>
B. Edit the numbers in the top-right Pos field (e.g., [-300][0][0]).<br>
`);
CLan.Set("en", "tuto13", "Click the [RunTime] button in the top-left.");
if (CUtil.IsMobile()) {
    CConfirm.List(CLan.Get("tutoMobile", "튜토리얼은 모바일 미지원!"), [() => { CUtilWeb.PageBack(); }], ["Back"]);
    await CChecker.Exe(async () => {
        return true;
    });
}
var mode = 0;
await CTutorial.Exe(CTutorial.eWait.ModalClose, null, `<div class="p-3 border rounded bg-light">
  <p class="mb-3 fs-5" data-CLan='tuto1'>환영합니다.<br> 튜토리얼을 보고싶으면 [튜토리얼]을 이어서 코드편집을 하려면 [코드] 눌러주세요</p>
  <p data-CLan='tuto2'>처음이시면 튜토리얼을 눌러주세요</p>
  <button type="button" class="btn btn-primary" id='tuto' data-CLan='tuto3'>튜토리얼</button>
  <button type="button" class="btn btn-primary" id='code' data-CLan='tuto4'>코드</button>
</div>`, { call: () => {
        CDOM.ID("code").addEventListener("click", () => { mode = 1; });
    } });
if (mode == 0) {
    await CTutorial.Exe(CTutorial.eWait.KeyUp, CInput.eKey.F1, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto5'>F1을누르면 단축키 설명이 나옵니다. 확인후 창을 닫아주세요</p>
    </div>`, { bodyClose: false });
    await CTutorial.Exe(CTutorial.eWait.ModalClose, "HelpModal", null);
    await CTutorial.Exe(CTutorial.eWait.KeyUp, CInput.eKey.F3, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto6'>F3를 눌러 개발자 모드로 갈수있습니다.</p>
    </div>`, { bodyClose: false });
    await CChecker.Exe(async () => {
        if (CDOM.ID("RunTime_btn") != null)
            return false;
        return true;
    });
    await CTutorial.Exe(CTutorial.eWait.Click, "RunTime_btn", `<div data-CLan='tuto13'>왼쪽 상단에 [RunTime]버튼을 누르세요.</div>`, { bodyClose: false, timeOut: 3 });
    let md = new CMDViewer("SampleCode.md", CModal.eTitle.Text);
    md.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 10);
    await CChecker.Exe(async () => {
        let test = gAtl.Canvas("2DCan").Find("test");
        if (test != null && test.FindComp(CPaint2D) != null)
            return false;
        return true;
    });
    md.Close();
    GetDevToolScriptViewer().Close();
    var timer = new CTimer();
    await CTutorial.Exe(CTutorial.eWait.ModalClose, null, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto9'>현재 프로젝트는 2D/3D 캔버스 혼합 예제입니다.<br> 왼쪽 Hierarchy에서 서브젝트를 확인가능합니다.</p>
    <p class="mb-3 fs-5" data-CLan='tuto9-1'>3DSubject 선택하여 위치를 변경해 보세요</p>
    </div>`, { bodyClose: false, timeOut: 10 });
    timer.Delay();
    let tip = new CTooltip(CDOM.DataToDom(`<div style='white-space: nowrap;' data-CLan='tuto_12'>
        1.왼쪽 Hierarchy에서 3DCan를 선택해주세요.<br>
        2.3DSubject 선택해 주세요.<br>
        3.두가지 방식중 원하는 방법으로 Pos 이동해 주세요.<br>
        A.서브젝트에 중심에있는 빨강 네모를 잡고 움직이세요.<br>
        B.오른쪽 상단에 Pos : [-300][0][0] 숫자를 수정해 주세요.<br>
        </div>`), CDOM.ID(can.ObjHash() + "_li"), CTooltip.eTrigger.Manual, CTooltip.ePlacement.Auto, Bootstrap.eColor.danger);
    tip.Focus(CModal.eAction.Shake);
    tip.Open();
    await CChecker.Exe(async () => {
        if (sub.GetPos().Equals(new CVec3(-300, 0, 0)) == false) {
            tip.Close();
            return false;
        }
        if (timer.Delay(false) > 5) {
            tip.Focus(CModal.eAction.Shake);
            timer.Delay();
        }
        return true;
    });
    await CTutorial.Exe(CTutorial.eWait.KeyUp, CInput.eKey.F2, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto7'>F2를 눌러 현재 로드한 리소스를 확인 가능합니다.</p>
    </div>`, { bodyClose: false });
    timer.Delay();
    await CChecker.Exe(async () => {
        if (timer.Delay(false) > 10)
            return false;
        return true;
    });
    await CTutorial.Exe(CTutorial.eWait.ModalClose, null, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto_11-1'>이제 텍스쳐를 변경해보세요</p>
    </div>`);
    let can2D = gAtl.Canvas("2DCan");
    let orgTex = can2D.Find("test").FindComp(CPaint2D).GetTexture()[0];
    md = new CMDViewer("TexChange.md", CModal.eTitle.Text);
    md.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 10);
    await CChecker.Exe(async () => {
        if (can2D.Find("test").FindComp(CPaint2D).GetTexture()[0] != orgTex)
            return false;
        return true;
    });
    md.Close();
    await CTutorial.Exe(CTutorial.eWait.KeyUp, CInput.eKey.N, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto10'>튜토리얼이 끝났습니다.<br> [N]키를 누르면 더 코딩해볼수 있습니다.<br>주석을 확인하고 테스트 해보세요.</p>
    </div>`, { bodyClose: false });
}
var modalList = CModal.GetModalList();
for (let i = modalList.length - 1; i >= 0; --i) {
    if (modalList[i].Key() == "back")
        continue;
    modalList[i].Close();
}
let svmodal = await InitDevToolScriptViewer(gAtl.PF().mGitHub);
let data = CStorage.Get(CPath.PHPCR() + "Save.json");
if (data == null) {
    let path = CPath.FullPath();
    path = CString.PathSub(path);
    let buf = await CFile.Load(path + "/Test.ts");
    svmodal.SetSource(CUtil.ArrayToString(buf));
}
