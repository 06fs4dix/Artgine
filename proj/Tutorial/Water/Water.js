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
gPF.mVersion = "mpuhzq22_103";
import { CAtelier } from "../../../artgine/app/CAtelier.js";
import { CPlugin } from "../../../artgine/util/CPlugin.js";
CPlugin.PushPath('Water', '../../../plugin/Water/');
import "../../../plugin/Water/Water.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CWater3D } from "../../../plugin/Water/Water.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CVec1 } from "../../../artgine/geometry/CVec1.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CShaderAttr } from "../../../artgine/render/CShaderAttr.js";
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CRenderPass } from "../../../artgine/render/CRenderPass.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CLoaderOption } from "../../../artgine/util/CLoader.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CBGAttachButton, CModalFrameView } from "../../../artgine/util/CModalUtil.js";
import { CDOM } from "../../../artgine/basic/CDOM.js";
import { CFrame } from "../../../artgine/util/CFrame.js";
import { CRPAuto, CRPMgr } from "../../../artgine/app/canvas/CRPMgr.js";
import { CCondition } from "../../../artgine/util/CCondition.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CLight } from "../../../artgine/app/component/CLight.js";
import { CPaint3D, CPaintCube } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CPaint } from "../../../artgine/app/component/paint/CPaint.js";
import { CAlpha } from "../../../artgine/render/CAlpha.js";
import { CCanvasPluginRPMgr } from "../../../artgine/app/canvas/CCanvasPluginRPMgr.js";
import { SDF } from "../../../artgine/z_file/SDF.js";
import { CMat } from "../../../artgine/geometry/CMat.js";
var Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("3D");
gAtl.Brush().GetCam3D().SetEye(new CVec3(2500, 1000, -500));
gAtl.Brush().GetCam3D().SetLook(new CVec3(2900, 950, -650));
gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
Main.ClearBatch();
gAtl.Brush().ClearRen();
let PCF = new CVec1(1.0);
var bias = 5;
var normalBias = 1;
var shadowDistance = 0.7;
var digit = 1;
var shadowRate = 0.3;
var jitter = 1;
let forward = new CRPMgr();
let texKey = forward.PushTex("shadowread.tex", new CTexture());
let rp = forward.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class", "==", "CPaint3D"));
rp.PushAnd(new CCondition("mTag[shadow]", "==", true));
rp.mPriority = CRenderPass.ePriority.BackGround + 1;
rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, gAtl.Frame().Pal().GetShadowWriteTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowRate", shadowRate));
rp.mShaderAttr.push(new CShaderAttr("PCF", PCF));
rp.mShaderAttr.push(new CShaderAttr("bias", bias));
rp.mShaderAttr.push(new CShaderAttr("normalBias", normalBias));
rp.mShaderAttr.push(new CShaderAttr("jitter", jitter));
rp.mShader = gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget = "shadowread.tex";
rp.mTag.add("shadowRead");
rp = forward.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class", "==", "CPaint3D"));
rp.PushAnd(new CCondition("mTag[water]", "==", false));
rp.mShaderAttr.push(new CShaderAttr(7, "shadowread.tex"));
rp.mShaderAttr.push(new CShaderAttr("shadowOn", new CVec1(7)));
rp.mShader = gAtl.Frame().Pal().Sl3DKey();
Main.PushPlugin(new CCanvasPluginRPMgr(forward));
let L = Main.PushSub(new CSubject());
L.SetPos(new CVec3(0, 1, 0));
let lig = new CLight();
lig.SetShadow("test", 0, 1000 / 60);
lig.SetDirect();
lig.SetColor(new CVec3(1, 1, 1));
lig.mShadowDistance = shadowDistance;
lig.mDigit = digit;
L.PushComp(lig);
let back = Main.PushSub(new CSubject());
back.SetKey("plane");
back.SetSca(new CVec3(500, 0.01, 500));
let pt = back.PushComp(new CPaint3D("Res/plane/plane.FBX"));
pt.mAutoLoad.mMipMap = CTexture.eMipmap.None;
pt.mAutoLoad.mWrap = CTexture.eWrap.Repeat;
pt.PushTag(CPaint.eTag.Light);
pt.PushTag(CPaint.eTag.Parallax);
pt.PushTag(CPaint.eTag.Shadow);
pt.PushTag(CPaint.eTag.ShadowReadOnly);
pt.PushCShaderAttr(new CShaderAttr("parallaxNormal", 0.1));
pt.SetTexCodi(new CVec4(50, 50, 0, 0));
let box = Main.PushSub(new CSubject());
box.SetKey("box");
box.SetPos(new CVec3(0, 3500, 0));
box.PushComp(new CPaint3D());
var skyTexKey = ["Res/skybox/right.jpg", "Res/skybox/left.jpg", "Res/skybox/bottom.jpg", "Res/skybox/top.jpg", "Res/skybox/front.jpg", "Res/skybox/back.jpg"];
var skyTexList = [];
await gAtl.Frame().Load().Exe(skyTexKey);
for (let i = 0; i < skyTexKey.length; ++i) {
    let tex = gAtl.Frame().Res().Find(skyTexKey[i]);
    skyTexList.push(tex);
}
let cubeTex = gAtl.Frame().Ren().BuildCubeMap(skyTexList, true, "cube.tex");
let sub = Main.PushSub(new CSubject());
sub.SetKey("sky");
let ptCube = sub.PushComp(new CPaintCube(cubeTex));
ptCube.Sky(true, true, true, true, true);
ptCube.PushCShaderAttr(new CShaderAttr("cloudCoverage", 0.7));
ptCube.PushCShaderAttr(new CShaderAttr("cloudStart", 15000));
ptCube.PushCShaderAttr(new CShaderAttr("cloudHeight", 10000));
ptCube.PushCShaderAttr(new CShaderAttr("cloudLightDistance", 10000));
ptCube.PushCShaderAttr(new CShaderAttr("cloudPlanetRadius", 6300000));
ptCube.PushCShaderAttr(new CShaderAttr("cloudSpeed", new CVec3(1, 0, 0)));
ptCube.PushCShaderAttr(new CShaderAttr("cloudStep", 32));
ptCube.PushCShaderAttr(new CShaderAttr("cloudLightStep", 4));
ptCube.PushCShaderAttr(new CShaderAttr("cloudScale", 100000));
ptCube.PushCShaderAttr(new CShaderAttr("cloudExtinction", 3.5));
ptCube.PushCShaderAttr(new CShaderAttr("cloudScatter", 3));
ptCube.PushCShaderAttr(new CShaderAttr("cloudAmbient", 0.1));
ptCube.PushCShaderAttr(new CShaderAttr("cloudDither", 0));
const loaderOpt = new CLoaderOption();
loaderOpt.mWrap = CTexture.eWrap.Repeat;
CFrame.Main().Load().Exe("Res/Water0.jpg", loaderOpt);
CFrame.Main().Load().Exe("Res/Water1.jpg", loaderOpt);
let water = Main.PushSub(new CWater3D());
water.SetKey("water");
water.SetRot(new CVec3(-Math.PI / 2, 0, 0));
water.SetSca(new CVec3(5000, 5000, 5000));
water.SetPos(new CVec3(0, 100, 0));
water.GetPT().PushCShaderAttr(new CShaderAttr("waterTest", 0.0));
water.Light();
water.GetPT().SetTexCodi(new CVec4(10, 10, 0, 0));
water.NormalFlow(new CVec2(1, 0));
water.AddReflector();
water.AddRefractor();
water.AddCaustics(new CVec2(1, 0));
let Option_btn = new CBGAttachButton("Option", 101, new CVec2(320, 320));
Option_btn.SetTitleText("Option");
Option_btn.SetContent(`
<div>
    
    <select class="form-select form-select-sm" id='water_sel' onchange="ResetWater()">
        <option value="FakeTexFlow" selected>FakeTexFlow</option>
        <option value="FakeTex">FakeTex</option>

        <option value="DarkOcean">어두운 바다</option>
        <option value="EastSea">동해 바다</option>
        <option value="Maldive">몰디브</option>
        <option value="Muddy">진흙탕</option>
        <option value="SouthEastSea">푸켓 동남아 바다</option>
    </select>
    <br>


</div>`);
function ResetWater() {
    let water_sel = CDOM.IDValue("water_sel");
    Main.Find("water").Destroy();
    gAtl.Brush().ClearRen();
    L.SetPos(new CVec3(0, 1, 0));
    lig.SetDirect();
    lig.SetColor(new CVec3(1, 1, 1));
    let water = Main.PushSub(new CWater3D());
    water.SetKey("water");
    water.SetRot(new CVec3(-Math.PI / 2, 0, 0));
    water.SetSca(new CVec3(5000, 5000, 5000));
    water.SetPos(new CVec3(0, 100, 0));
    ptCube.PushCShaderAttr(new CShaderAttr("aurora", 0.0));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudCoverage", 0.7));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudStart", 15000));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudHeight", 10000));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudLightDistance", 10000));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudPlanetRadius", 6300000));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudSpeed", new CVec3(1, 0, 0)));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudStep", 32));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudLightStep", 4));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudScale", 100000));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudExtinction", 3.5));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudScatter", 10));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudAmbient", 0.1));
    ptCube.PushCShaderAttr(new CShaderAttr("cloudDither", 0));
    ptCube.PushCShaderAttr(new CShaderAttr("SkyColorRTable", new CMat([
        0.22, 0.24, 0.27, 0.30,
        0.35, 0.45, 0.60, 0.78,
        0.90, 0.88, 0.85, 0.82,
        0.80, 0.78, 0.76, 0.75
    ])));
    ptCube.PushCShaderAttr(new CShaderAttr("SkyColorGTable", new CMat([
        0.50, 0.53, 0.56, 0.60,
        0.68, 0.78, 0.88, 0.96,
        1.00, 0.98, 0.96, 0.94,
        0.92, 0.90, 0.88, 0.87
    ])));
    ptCube.PushCShaderAttr(new CShaderAttr("SkyColorBTable", new CMat([
        0.92, 0.94, 0.96, 0.98,
        1.00, 1.00, 1.00, 1.00,
        1.00, 0.99, 0.98, 0.97,
        0.96, 0.95, 0.94, 0.93
    ])));
    if ("FakeTexFlow" == water_sel) {
        water.GetPT().SetTexCodi(new CVec4(15, 15, 0, 0));
        water.NormalFlow(new CVec2(1, 0));
        water.AddReflector();
        water.AddRefractor("Res/clear-sea-water-512x512.png");
        water.GetPT().SetAlphaModel(new CAlpha(0.8));
        water.GetPT().PushTag(CPaint.eTag.Light);
    }
    else if ("FakeTex" == water_sel) {
        water.AddRefractor("Res/clear-sea-water-512x512.png", new CVec2(1, 0));
        water.GetPT().SetAlphaModel(new CAlpha(0.8));
    }
    else if (water_sel == "DarkOcean") {
        water.GetPT().SetTexCodi(new CVec4(128, 128, 10));
        water.AddRefractor();
        water.AddReflector();
        water.SetWaterDeep(40, 0, 4000, new CVec3(0.05, 0.15, 0.35), new CVec3(0.2, 0.5, 0.65));
        water.NormalFlow(new CVec2(2, 0.5));
        water.Light();
        ptCube.PushCShaderAttr(new CShaderAttr("aurora", 0.2));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudCoverage", 0.7));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStart", 15000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudHeight", 10000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightDistance", 10000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudPlanetRadius", 6300000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudSpeed", new CVec3(1, 0, 0)));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStep", 32));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightStep", 4));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScale", 100000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudExtinction", 3.5));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScatter", 3));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudAmbient", 0.1));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudDither", 0));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorRTable", new CMat([
            0.01, 0.01, 0.015, 0.02,
            0.025, 0.03, 0.035, 0.04,
            0.035, 0.03, 0.025, 0.02,
            0.01, 0.005, 0.00, 0.00
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorGTable", new CMat([
            0.02, 0.025, 0.03, 0.035,
            0.04, 0.045, 0.05, 0.055,
            0.05, 0.04, 0.03, 0.02,
            0.01, 0.005, 0.00, 0.00
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorBTable", new CMat([
            0.07, 0.09, 0.11, 0.12,
            0.14, 0.15, 0.16, 0.17,
            0.15, 0.12, 0.09, 0.06,
            0.04, 0.02, 0.01, 0.005
        ])));
        L.SetPos(new CVec3(1, 0.15, -0.4));
        lig.SetDirect(-2);
        lig.SetColor(new CVec3(0.96, 0.92, 0.84));
    }
    else if (water_sel == "EastSea") {
        water.GetPT().SetTexCodi(new CVec4(128, 128, 10));
        water.AddRefractor();
        water.AddReflector();
        water.SetWaterDeep(40, 0, 4000, new CVec3(0.05, 0.15, 0.35), new CVec3(0.2, 0.5, 0.65));
        water.NormalFlow(new CVec2(1, 0));
        water.Light();
        ptCube.PushCShaderAttr(new CShaderAttr("cloudCoverage", 0.7));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStart", 15000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudHeight", 10000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightDistance", 10000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudPlanetRadius", 6300000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudSpeed", new CVec3(1, 0, 0)));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStep", 32));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightStep", 4));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScale", 100000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudExtinction", 3.5));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScatter", 3));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudAmbient", 0.1));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudDither", 0));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorRTable", new CMat([
            0.02, 0.02, 0.03, 0.04,
            0.05, 0.06, 0.07, 0.08,
            0.07, 0.06, 0.05, 0.04,
            0.02, 0.01, 0.00, 0.00
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorGTable", new CMat([
            0.04, 0.05, 0.06, 0.07,
            0.08, 0.09, 0.10, 0.11,
            0.10, 0.08, 0.06, 0.04,
            0.02, 0.01, 0.00, 0.00
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorBTable", new CMat([
            0.15, 0.18, 0.22, 0.25,
            0.28, 0.30, 0.32, 0.35,
            0.30, 0.25, 0.18, 0.12,
            0.08, 0.05, 0.02, 0.01
        ])));
        L.SetPos(new CVec3(1, 0.15, -0.4));
        lig.SetColor(new CVec3(1.0, 0.5, 0.5));
    }
    else if (water_sel == "Maldive") {
        water.GetPT().SetTexCodi(new CVec4(64, 64, 8));
        water.AddRefractor();
        water.AddReflector();
        water.AddCaustics(new CVec2(1, 0), 0.5);
        water.SetWaterDeep(500, -5000, 1000000, new CVec3(0.25, 0.88, 0.82), new CVec3(0.0, 0.19, 0.47));
        water.mWaterHeight.x = 10;
        water.NormalFlow(new CVec2(1, 0));
        water.Light();
        ptCube.PushCShaderAttr(new CShaderAttr("cloudCoverage", 0.7));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStart", 40000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudHeight", 10000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightDistance", 10000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudPlanetRadius", 6300000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudSpeed", new CVec3(1, 0, 0)));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStep", 32));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightStep", 4));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScale", 100000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudExtinction", 3.5));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScatter", 10));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudAmbient", 0.1));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudDither", 0));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorRTable", new CMat([
            0.15, 0.20, 0.25, 0.35,
            0.45, 0.55, 0.65, 0.75,
            0.82, 0.88, 0.92, 0.95,
            0.98, 0.99, 1.00, 1.00
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorGTable", new CMat([
            0.55, 0.62, 0.70, 0.78,
            0.85, 0.90, 0.94, 0.97,
            0.98, 0.99, 1.00, 1.00,
            1.00, 1.00, 1.00, 1.00
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorBTable", new CMat([
            0.95, 0.97, 0.99, 1.00,
            1.00, 1.00, 1.00, 1.00,
            1.00, 1.00, 1.00, 1.00,
            1.00, 1.00, 1.00, 1.00
        ])));
    }
    else if (water_sel == "Muddy") {
        water.GetPT().SetTexCodi(new CVec4(64, 64, 6));
        water.AddRefractor();
        water.SetWaterDeep(150, -2000, 10000, new CVec3(0.18, 0.1, 0.02), new CVec3(0.42, 0.3, 0.08));
        water.mWaterDeep.z = 0;
        water.mWaterHeight.x = 10;
        water.NormalFlow(new CVec2(2, 0.5));
        water.Light();
        ptCube.PushCShaderAttr(new CShaderAttr("cloudCoverage", 0.2));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStart", 40000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudHeight", 20000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightDistance", 10000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudPlanetRadius", 6300000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudSpeed", new CVec3(1, 0, 0)));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStep", 32));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightStep", 4));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScale", 100000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudExtinction", 3.5));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScatter", 1));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudAmbient", 0));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudDither", 0));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorRTable", new CMat([
            0.15, 0.16, 0.18, 0.20,
            0.22, 0.25, 0.28, 0.30,
            0.25, 0.20, 0.15, 0.10,
            0.05, 0.03, 0.02, 0.01
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorGTable", new CMat([
            0.18, 0.19, 0.21, 0.23,
            0.25, 0.28, 0.31, 0.33,
            0.28, 0.22, 0.16, 0.11,
            0.06, 0.04, 0.02, 0.01
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorBTable", new CMat([
            0.22, 0.23, 0.25, 0.27,
            0.30, 0.33, 0.36, 0.38,
            0.35, 0.28, 0.20, 0.15,
            0.10, 0.07, 0.04, 0.02
        ])));
    }
    else if (water_sel == "SouthEastSea") {
        water.GetPT().SetTexCodi(new CVec4(32, 32, 10));
        water.AddRefractor();
        water.AddReflector();
        water.AddCaustics(new CVec2(2, 0), 1.2);
        water.SetWaterDeep(120, 0, 8000, new CVec3(0.0, 0.29, 0.39), new CVec3(0.25, 0.88, 0.82));
        water.NormalFlow(new CVec2(2, 0));
        water.Light();
        ptCube.PushCShaderAttr(new CShaderAttr("cloudCoverage", 0.75));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStart", 15000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudHeight", 5000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightDistance", 10000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudPlanetRadius", 6300000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudSpeed", new CVec3(1, 0, 0)));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudStep", 32));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudLightStep", 4));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScale", 100000));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudExtinction", 3.5));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudScatter", 3));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudAmbient", 0.1));
        ptCube.PushCShaderAttr(new CShaderAttr("cloudDither", 0));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorRTable", new CMat([
            0.00, 0.00, 0.00, 0.01,
            0.05, 0.15, 0.30, 0.45,
            0.45, 0.35, 0.25, 0.15,
            0.08, 0.04, 0.01, 0.00
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorGTable", new CMat([
            0.05, 0.10, 0.15, 0.25,
            0.40, 0.60, 0.75, 0.88,
            0.88, 0.75, 0.60, 0.45,
            0.35, 0.25, 0.18, 0.12
        ])));
        ptCube.PushCShaderAttr(new CShaderAttr("SkyColorBTable", new CMat([
            0.10, 0.20, 0.30, 0.45,
            0.65, 0.80, 0.90, 0.98,
            0.98, 1.00, 1.00, 0.95,
            0.85, 0.75, 0.65, 0.55
        ])));
        lig.SetColor(new CVec3(1.0, 0.92, 0.75));
    }
}
window["ResetWater"] = ResetWater;
new CModalFrameView();
