const version = 'mf7foteo_5';
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
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CConfirm, CModal, CModalTitleBar } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CWind } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CWind.js";
import { CBGAttachButton } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CPaint3D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint3D.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CColor.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec1 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec1.js";
let Main = gAtl.NewCanvas("Main");
function Init2D() {
    Main.SetCameraKey("2D");
    let gXSize = 10;
    let gYSize = 10;
    for (let y = -gYSize; y <= gYSize; ++y) {
        for (let x = -gXSize; x <= gXSize; ++x) {
            let sub = Main.PushSub(new CSubject());
            let pt = sub.PushComp(new CPaint2D("Res/grass.png", new CVec2(50, 50)));
            sub.SetPos(new CVec3(x * 50, y * 50));
            pt.Wind(100);
        }
    }
    let sub = Main.PushSub(new CSubject());
    let pt = sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
    let wind = sub.PushComp(new CWind());
    CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Global", () => {
        wind.SetDirect(new CVec3(1, 0, 0));
        wind.SetInnerOuter(0, 0);
        wind.SetFrequency(1);
    }));
    CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Pos", () => {
        wind.SetDirect(new CVec3(0, 0, 0));
        wind.SetInnerOuter(100, 500);
        wind.SetFrequency(10);
    }));
    let Help = new CBGAttachButton("DevToolModal", 101, new CVec2(320, 240));
    Help.SetTitleText("Help");
    Help.SetContent(`
    <div>
    [Global] Global Wind, [Pos]Local Wind
    </div>`);
}
function Init3D() {
    Main.SetCameraKey("3D");
    let gXSize = 20;
    let gZSize = 20;
    for (let z = -gZSize; z <= gZSize; ++z) {
        for (let x = -gXSize; x <= gXSize; ++x) {
            let sub = Main.PushSub(new CSubject());
            let pt = sub.PushComp(new CPaint2D("Res/grass.png", new CVec2(50, 50)));
            sub.SetPos(new CVec3(x * 50, 0, z * 50));
            pt.Wind(100);
            pt.SetBillBoard(true);
            pt.SetTexCodi(null, 0.02);
            pt.AlphaCut();
            pt.PushCShaderAttr(new CShaderAttr("alphaCut", new CVec1(0.7)));
        }
    }
    let sub = Main.PushSub(new CSubject());
    sub.SetSca(0.1);
    let pt = sub.PushComp(new CPaint3D());
    pt.SetColorModel(new CColor(1, 0.5, 0.5, CColor.eModel.RGBAdd));
    let wind = sub.PushComp(new CWind());
    for (let i = 0; i < 10; ++i) {
        sub = Main.PushSub(new CSubject());
        sub.SetPos(new CVec3(Math.random() * 1000 - 500, 0, Math.random() * 1000 - 500));
        pt = sub.PushComp(new CPaint3D("Res/tree.fbx"));
        pt.Wind(100);
    }
    CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Global", () => {
        wind.SetDirect(new CVec3(1, 0, 0));
        wind.SetInnerOuter(0, 0);
        wind.SetFrequency(1);
    }));
    CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Pos", () => {
        wind.SetDirect(new CVec3(0, 0, 0));
        wind.SetInnerOuter(100, 500);
        wind.SetFrequency(10);
    }));
    let Help = new CBGAttachButton("DevToolModal", 101, new CVec2(320, 240));
    Help.SetTitleText("Help");
    Help.SetContent(`
    <div>
    [Global] Global Wind, [Pos]Local Wind
    </div>`);
}
CConfirm.List("Select Init!", [
    async () => {
        Init2D();
    },
    async () => {
        Init3D();
    }
], ["2D", "3D"]);
