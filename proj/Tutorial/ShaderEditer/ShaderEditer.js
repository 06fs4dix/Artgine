const version = '2025-08-10 16:22:00';
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
gPF.mServer = 'local';
gPF.mGitHub = false;
import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([]);
import { CFileViewer } from "../../../artgine/util/CModalUtil.js";
import { CCamCon3DThirdPerson } from "../../../artgine/util/CCamCon.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CRenderPass } from "../../../artgine/render/CRenderPass.js";
import { CWASM } from "../../../artgine/basic/CWASM.js";
import { CConsol } from "../../../artgine/basic/CConsol.js";
let Main = gAtl.NewCanvas("Main");
let camCon = new CCamCon3DThirdPerson(gAtl.Frame().Input());
gAtl.Brush().GetCam3D().SetCamCon(camCon);
gAtl.Brush().GetCam3D().EyeMoveAndViewCac(new CVec3());
let editer = new CFileViewer(["TestShader.ts", "ShaderEditer.json", "ShaderEditer.html", "ShaderEditer.js", "ShaderEditer.ts"], async (_file, _source) => {
    if (_file != "TestShader.ts")
        return;
    let shaMgr = gAtl.Frame().Ren().SInter().New();
    await shaMgr.Exe("TestShader.ts", _source);
    let sl = shaMgr.GetShaderList();
    gAtl.Frame().Res().Remove("TestShader.ts");
    gAtl.Frame().Res().Push("TestShader.ts", sl);
    for (var each01 of sl.mShader) {
        gAtl.Frame().Res().Remove(each01.mKey);
        gAtl.Frame().Res().Push(each01.mKey, each01);
    }
    Init();
});
editer.Open();
await gAtl.Frame().Load().Load("TestShader.ts");
function Init() {
    Main.Clear();
    Main.ClearBatch();
    gAtl.Brush().ClearRen();
    Main.SetCameraKey("3D");
    let sub = Main.PushSub(new CSubject());
    let pt = sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(gAtl.Frame().Pal().GetNoneTex());
    let rp = new CRenderPass("TestShader.ts");
    pt.PushRenderPass(rp);
}
Init();
CConsol.Log(CWASM.Checker(10000));
