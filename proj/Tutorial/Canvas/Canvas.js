const version = '2025-08-21 06:35:18';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js";
import { CPreferences } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
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
gPF.mGitHub = true;
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CInput } from "https://06fs4dix.github.io/Artgine/artgine/system/CInput.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CModalBackGround, CFileViewer } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CPaint3D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint3D.js";
import { CUtil } from "https://06fs4dix.github.io/Artgine/artgine/basic/CUtil.js";
import { CUtilObj } from "https://06fs4dix.github.io/Artgine/artgine/basic/CUtilObj.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CUtilWeb } from "https://06fs4dix.github.io/Artgine/artgine/util/CUtilWeb.js";
import { CString } from "https://06fs4dix.github.io/Artgine/artgine/basic/CString.js";
import { CPath } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPath.js";
import { CConfirm, CModal } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CChecker } from "https://06fs4dix.github.io/Artgine/artgine/util/CChecker.js";
import { CTimer } from "https://06fs4dix.github.io/Artgine/artgine/system/CTimer.js";
import { CTutorial } from "https://06fs4dix.github.io/Artgine/artgine/util/CTutorial.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CLan } from "https://06fs4dix.github.io/Artgine/artgine/basic/CLan.js";
import { CScript } from "https://06fs4dix.github.io/Artgine/artgine/util/CScript.js";
let can = gAtl.NewCanvas("2DCan");
can.SetCameraKey("2D");
let sub = can.Push(new CSubject());
sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
can = gAtl.NewCanvas("3DCan");
can.SetCameraKey("3D");
sub = can.Push(new CSubject());
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
CLan.Set("en", "tuto10", "Press [N] key to code directly.<br>Check the comments and test it");
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
        CUtil.ID("code").addEventListener("click", () => { mode = 1; });
    } });
if (mode == 0) {
    await CTutorial.Exe(CTutorial.eWait.KeyUp, CInput.eKey.F1, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto5'>F1을누르면 단축키 설명이 나옵니다. 확인후 창을 닫아주세요</p>
    </div>`, { bodyClose: false });
    await CTutorial.Exe(CTutorial.eWait.ModalClose, "HelpModal", null);
    await CTutorial.Exe(CTutorial.eWait.KeyUp, CInput.eKey.F3, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto6'>F3를 눌러 개발자 모드로 갈수있습니다.</p>
    </div>`, { bodyClose: false });
    await CTutorial.Exe(CTutorial.eWait.KeyUp, CInput.eKey.F2, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto7'>F2를 눌러 현재 로드한 리소스를 확인 가능합니다.</p>
    </div>`, { bodyClose: false });
    var timer = new CTimer();
    await CChecker.Exe(async () => {
        if (timer.Delay(false) > 10)
            return false;
        return true;
    });
    await CTutorial.Exe(CTutorial.eWait.KeyUp, CInput.eKey.F4, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto8'>F4를 눌러서 현재 프로젝트 코드를 확인가능합니다.</p>
    </div>`, { bodyClose: false });
    timer.Delay();
    await CChecker.Exe(async () => {
        if (timer.Delay(false) > 10)
            return false;
        return true;
    });
    await CTutorial.Exe(CTutorial.eWait.ModalClose, null, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto9'>현재 프로젝트는 2D/3D 캔버스 혼합 예제입니다.<br> 왼쪽 하이라키-캔버스에서 서브젝트를 확인가능합니다.</p>
    </div>`);
    timer.Delay();
    await CChecker.Exe(async () => {
        if (timer.Delay(false) > 10)
            return false;
        return true;
    });
    await CTutorial.Exe(CTutorial.eWait.KeyUp, CInput.eKey.N, `<div class="p-3 border rounded bg-light">
    <p class="mb-3 fs-5" data-CLan='tuto10'>[N]키를 누르면 직접 코딩해볼수 있습니다.<br>주석을 확인하고 테스트 해보세요.</p>
    </div>`, { bodyClose: false });
}
var modalList = CModal.GetModalList();
for (let i = modalList.length - 1; i >= 0; --i) {
    if (modalList[i].Key() == "back")
        continue;
    modalList[i].Close();
}
let path = CPath.FullPath();
path = CString.PathSub(path);
let sv = new CFileViewer([path + "/Test.ts"], async (_file, _source) => {
    let moudle = await CScript.Build("Test.ts", _source, gAtl.mPF.mGitHub);
    sv.Close();
}, gAtl.mPF.mGitHub);
sv.Open();
