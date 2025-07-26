const version = '2025-06-24 16:18:01';
import { CClass } from "../../../artgine/basic/CClass.js";
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
import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
import { CPluging } from "../../../artgine/util/CPluging.js";
CPluging.PushPath('test', '../../../plugin/test/');
import "../../../plugin/test/test.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json']);
var Main = gAtl.Canvas('Main.json');
import { CConsol } from "../../../artgine/basic/CConsol.js";
import { CPool } from "../../../artgine/basic/CPool.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CFrame } from "../../../artgine/util/CFrame.js";
import { CInput } from "../../../artgine/system/CInput.js";
import { CAlert } from "../../../artgine/basic/CAlert.js";
let CTest = CClass.New("CTest");
CConsol.Log(CTest["v"]);
Main.Push(await CPool.Product("test"));
let rpMgr = gAtl.Frame().Res().Find("testUVRPMgr");
Main.SetRPMgr(rpMgr);
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
    if (CFrame.Main().Input().KeyUp(CInput.eKey.Num1)) {
        let rpMgr = gAtl.Frame().Res().Find("testRPMgr");
        Main.SetRPMgr(rpMgr);
    }
    if (CFrame.Main().Input().KeyUp(CInput.eKey.Num2)) {
        let rpMgr = gAtl.Frame().Res().Find("testUVRPMgr");
        Main.SetRPMgr(rpMgr);
    }
});
CAlert.Info("숫자1,2로 플러그인에서 만든 정보로 RP를 변경합니다", 60 * 1000);
