const version = '2025-08-09 22:36:14';
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
gPF.mServer = 'local';
gPF.mGitHub = true;
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([]);
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CPaint2D, CPaintHTML } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CAnimation, CClipCoodi, CClipImg, CClipMesh } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAnimation.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAniFlow.js";
import { CInput } from "https://06fs4dix.github.io/Artgine/artgine/system/CInput.js";
import { CUtilObj } from "https://06fs4dix.github.io/Artgine/artgine/basic/CUtilObj.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CPaint3D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint3D.js";
import { CDomFactory } from "https://06fs4dix.github.io/Artgine/artgine/basic/CDOMFactory.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
gAtl.NewCanvas("Main");
gAtl.Canvas("Main").SetCameraKey("2D");
let sub = gAtl.Canvas("Main").Push(new CSubject());
sub.PushComp(new CPaint2D());
let ani = new CAnimation();
ani.Push(new CClipImg(0, 0, "Res/Slime/Slime.png"));
let off = 0;
for (let x = 0; x < 4; ++x) {
    for (let y = 0; y < 4; ++y) {
        ani.Push(new CClipCoodi(off * 100, 100, x * 16, y * 16, (x + 1) * 16, (y + 1) * 16));
        off++;
    }
}
sub.SetKey("Ani2DSub");
sub.PushComp(new CAniFlow(ani));
let pth = sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class="text-center border rounded p-2 bg-light shadow-sm"
     style="width: 200px;" data-en="Change animation with numbers 1,2<br>Press F to view info<br>↓">
  숫자 1,2로 애니메이션 변경<br>F로 정보보기<br>↓
</div>`), null, null));
pth.SetPos(new CVec3(0, 200));
ani = new CAnimation();
ani.SetKey("top");
ani.SetBlackBoard(true);
ani.Push(new CClipImg(0, 0, "Res/Slime/Slime.png"));
off = 0;
for (let y = 0; y < 4; ++y) {
    ani.Push(new CClipCoodi(off * 100, 100, 0 * 16, y * 16, (0 + 1) * 16, (y + 1) * 16));
    off++;
}
ani = new CAnimation();
ani.SetKey("bottom");
ani.SetBlackBoard(true);
ani.Push(new CClipImg(0, 0, "Res/Slime/Slime.png"));
off = 0;
for (let y = 0; y < 4; ++y) {
    ani.Push(new CClipCoodi(off * 100, 100, 1 * 16, y * 16, (1 + 1) * 16, (y + 1) * 16));
    off++;
}
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
    let Ani2DSub = gAtl.Canvas("Main").Find("Ani2DSub");
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.Num1)) {
        Ani2DSub.FindComp(CAniFlow).ResetAni("top");
    }
    else if (gAtl.Frame().Input().KeyUp(CInput.eKey.Num2)) {
        Ani2DSub.FindComp(CAniFlow).ResetAni("bottom");
    }
    else if (gAtl.Frame().Input().KeyUp(CInput.eKey.F)) {
        CUtilObj.ShowModal(Ani2DSub);
    }
});
sub = gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(200, 0, 0));
let pt = sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
pt.SetYSort(true);
pth = sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class="text-center border rounded p-2 bg-light shadow-sm"
     style="width: 200px;" data-en="YSort test<br>↓">
  YSort 테스트<br>↓
</div>`), null, null));
pth.SetPos(new CVec3(0, 200));
sub = gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(220, 40, 0));
pt = sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
pt.SetYSort(true);
sub = gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(240, 80, 0));
pt = sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
pt.SetYSort(true);
sub = gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(400, 0, 0));
pt = sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
pt.SetPivot(new CVec3(1, 1, 1));
pth = sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class="text-center border rounded p-2 bg-light shadow-sm"
     style="width: 200px;" data-en="Pivot change<br>↓">
  피벗 변경<br>↓
</div>`), null, null));
pth.SetPos(new CVec3(0, 200));
sub = gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(-200, 0, 0));
let pt3d = sub.PushComp(new CPaint3D("Res/teapot/teapot.gltf"));
ani = new CAnimation();
ani.Push(new CClipMesh(0, 1000, "Res/teapot/teapot.gltf", "left"));
sub.PushComp(new CAniFlow(ani));
pth = sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class="text-center border rounded p-2 bg-light shadow-sm"
     style="width: 200px;" data-en="3D Animation<br>↓">
  3D 애니메이션<br>↓
</div>`), null, null));
pth.SetPos(new CVec3(0, 200));
