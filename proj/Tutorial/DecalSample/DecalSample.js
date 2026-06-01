const version = 'mp25fgx1_39';
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
gPF.mCanvas = "";
gPF.mWASM = false;
gPF.mServer = 'local';
gPF.mGitHub = false;
import { CAtelier } from "../../../artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CPaint3D } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CInput } from "../../../artgine/system/CInput.js";
import { CPaint3DDecalMesh } from "../../../plugin/DecalMesh/DecalMesh.js";
import { CCollider } from "../../../artgine/app/component/CCollider.js";
import { CAlert } from "../../../artgine/basic/CAlert.js";
let Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("3D");
let camcon = new CCamCon3DFirstPerson(gAtl.Frame().Input());
gAtl.Brush().GetCam3D().SetCamCon(camcon);
let back = Main.PushSub(new CSubject());
let pt = back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
pt.SetTexture("cat2.jpg");
back.SetSca(new CVec3(10, 10, 10));
let ray;
let scroll = 0;
let VS = true;
function UpdateRay() {
    const mouse = gAtl.Frame().Input().Mouse();
    ray = gAtl.Brush().GetCam3D().GetRay(mouse.x, mouse.y);
    new CCollider(pt.GetBoundFMat()).PickChk(ray);
}
function DrawDecal() {
    if (VS) {
        pt.ResetDecal(gAtl.Frame().Pal().GetNoneTex(), ray.GetPosition(), new CVec3(250, 250, 1000), new CVec3(0, -1, 0), scroll);
    }
    else {
        pt.ResetDecal(gAtl.Frame().Pal().GetNoneTex(), ray.GetPosition(), new CVec3(250, 250, 1000), ray.GetDirect(), scroll);
    }
}
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.L, true)) {
        VS = !VS;
    }
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.Wheel)) {
        scroll += gAtl.Frame().Input().Wheel() * 0.05 / (Math.PI * 2);
        DrawDecal();
    }
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.F)) {
        UpdateRay();
        DrawDecal();
    }
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.G)) {
        UpdateRay();
        let sub = Main.PushSub(new CSubject());
        sub.PushComp(new CPaint3DDecalMesh([gAtl.Frame().Pal().GetNoneTex()], pt.GetBound().mPos.Array(), pt.GetFMat(), ray.GetPosition(), new CVec3(250, 250, 1000)));
    }
});
CAlert.Info("F/G Decal Create!");
