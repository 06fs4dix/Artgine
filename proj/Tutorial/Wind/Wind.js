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
gPF.mVersion = "mpukkmgs_3";
import { CAtelier } from "../../../artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CConfirm, CModal, CModalTitleBar } from "../../../artgine/basic/CModal.js";
import { CBGAttachButton } from "../../../artgine/util/CModalUtil.js";
import { CShaderAttr } from "../../../artgine/render/CShaderAttr.js";
import { CVec1 } from "../../../artgine/geometry/CVec1.js";
import { CLoaderOption } from "../../../artgine/util/CLoader.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CUtilWeb } from "../../../artgine/util/CUtilWeb.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CPaint2D } from "../../../artgine/app/component/paint/CPaint2D.js";
import { CWind } from "../../../artgine/app/component/CWind.js";
import { CPaint3D } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CColor } from "../../../artgine/render/CColor.js";
import { CAlpha } from "../../../artgine/render/CAlpha.js";
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
    sub.SetKey("Wind");
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
    gAtl.Brush().GetCam3D().Init(new CVec3(0, 900, 1000), new CVec3(0, -300, -500));
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
            pt.PushCShaderAttr(new CShaderAttr("alphaCut", new CVec1(0.7)));
        }
    }
    let sub = Main.PushSub(new CSubject());
    sub.SetKey("Wind");
    sub.SetSca(0.1);
    let pt = sub.PushComp(new CPaint3D());
    pt.SetColorModel(new CColor(1, 0.5, 0.5, CColor.eModel.RGBAdd));
    let wind = sub.PushComp(new CWind());
    let lo = new CLoaderOption();
    lo.mMipMap = CTexture.eMipmap.AlphaCac;
    for (let i = 0; i < 10; ++i) {
        sub = Main.PushSub(new CSubject());
        sub.SetPos(new CVec3(Math.random() * 1000 - 500, 0, Math.random() * 1000 - 500));
        pt = sub.PushComp(new CPaint3D("Res/tree.glb"));
        pt.SetAlphaModel(new CAlpha(1, 0.9));
        pt.SetAutoLoad(lo);
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
let test = CUtilWeb.MDReader("../../README.md");
