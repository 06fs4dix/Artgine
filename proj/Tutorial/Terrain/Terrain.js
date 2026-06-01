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
gPF.mVersion = "mpuhzq22_99";
import { CAtelier } from "../../../artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CLoaderOption } from "../../../artgine/util/CLoader.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CMat } from "../../../artgine/geometry/CMat.js";
import { CTerrainMap } from "../../../artgine/app/subject/CTerrainMap.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CLight } from "../../../artgine/app/component/CLight.js";
import { CRPAuto, CRPMgr } from "../../../artgine/app/canvas/CRPMgr.js";
import { CCondition } from "../../../artgine/util/CCondition.js";
import { CRenderPass } from "../../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../../artgine/render/CShaderAttr.js";
import { SDF } from "../../../artgine/z_file/SDF.js";
import { CCanvasPluginRPMgr } from "../../../artgine/app/canvas/CCanvasPluginRPMgr.js";
import { CPaint3D } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CVec1 } from "../../../artgine/geometry/CVec1.js";
import { CModalBackGround, CModalFrameView } from "../../../artgine/util/CModalUtil.js";
import { CComponent } from "../../../artgine/app/component/CComponent.js";
import { CColor } from "../../../artgine/render/CColor.js";
import { CCollider } from "../../../artgine/app/component/CCollider.js";
import { CRigidBody } from "../../../artgine/app/component/CRigidBody.js";
import { CHTMLDropdown } from "../../../artgine/util/CHTMLBar.js";
import { Bootstrap } from "../../../artgine/basic/Bootstrap.js";
import { CDOM } from "../../../artgine/basic/CDOM.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CBehavior } from "../../../artgine/app/component/CBehavior.js";
var Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("3D");
gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
gAtl.Brush().GetCam3D().Init(new CVec3(1000, 3000, 1000), new CVec3(1001, 2800, 1000));
let ligSub = Main.PushSub(new CSubject());
ligSub.SetPos(new CVec3(0, 1, 1));
let ligComp = ligSub.PushComp(new CLight());
ligComp.SetShadow("shadow", 0, 2000);
class CTestComp extends CComponent {
    PCF = new CVec1(1);
    bias = new CVec1(40);
    normalBias = new CVec1(1);
    shadowRate = new CVec1(0.3);
    jitter = new CVec1(1);
}
let sub = Main.PushSub(new CSubject());
let testComp = sub.PushComp(new CTestComp());
let forward = new CRPMgr();
Main.PushPlugin(new CCanvasPluginRPMgr(forward));
forward.PushTex(gAtl.Frame().Pal().GetShadowReadTex(), new CTexture());
{
    let rp = forward.PushRP(new CRPAuto());
    rp.PushOr(new CCondition("class", "==", "CPaint3D"));
    rp.PushOr(new CCondition("class", "==", "CPaint3DMerge"));
    rp.PushAnd(new CCondition("mTag[shadow]", "==", true));
    rp.mPriority = CRenderPass.ePriority.BackGround + 1;
    rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, gAtl.Frame().Pal().GetShadowWriteTex()));
    rp.mShaderAttr.push(new CShaderAttr("PCF", testComp.PCF));
    rp.mShaderAttr.push(new CShaderAttr("bias", testComp.bias));
    rp.mShaderAttr.push(new CShaderAttr("normalBias", testComp.normalBias));
    rp.mShaderAttr.push(new CShaderAttr("shadowRate", testComp.shadowRate));
    rp.mShaderAttr.push(new CShaderAttr("jitter", testComp.jitter));
    rp.mShader = gAtl.Frame().Pal().Sl3DKey();
    rp.mRenderTarget = gAtl.Frame().Pal().GetShadowReadTex();
    rp.mTag.add("shadowRead");
}
{
    let rp = forward.PushRP(new CRPAuto());
    rp.PushOr(new CCondition("class", "==", "CPaint3D"));
    rp.PushOr(new CCondition("class", "==", "CPaint3DMerge"));
    rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, gAtl.Frame().Pal().GetShadowReadTex()));
    rp.mShaderAttr.push(new CShaderAttr("shadowOn", new CVec1(1)));
    rp.mShader = gAtl.Frame().Pal().Sl3DKey();
}
{
    let rp = forward.PushRP(new CRPAuto());
    rp.PushOr(new CCondition("class", "==", "CPaintTerrain"));
    rp.PushAnd(new CCondition("mTag[shadow]", "==", true));
    rp.mPriority = CRenderPass.ePriority.BackGround + 1;
    rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, gAtl.Frame().Pal().GetShadowWriteTex()));
    rp.mShaderAttr.push(new CShaderAttr("PCF", testComp.PCF));
    rp.mShaderAttr.push(new CShaderAttr("bias", testComp.bias));
    rp.mShaderAttr.push(new CShaderAttr("normalBias", testComp.normalBias));
    rp.mShaderAttr.push(new CShaderAttr("shadowRate", testComp.shadowRate));
    rp.mShaderAttr.push(new CShaderAttr("jitter", testComp.jitter));
    rp.mShader = gAtl.Frame().Pal().SlTerrainKey();
    rp.mRenderTarget = gAtl.Frame().Pal().GetShadowReadTex();
    rp.mTag.add("shadowRead");
}
{
    let rp = forward.PushRP(new CRPAuto());
    rp.PushOr(new CCondition("class", "==", "CPaintTerrain"));
    rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, gAtl.Frame().Pal().GetShadowReadTex()));
    rp.mShaderAttr.push(new CShaderAttr("shadowOn", new CVec1(1)));
    rp.mShader = gAtl.Frame().Pal().SlTerrainKey();
}
const heightMap = Main.PushSub(new CTerrainMap());
heightMap.SetLevel([1, 1, 1, 1, 1]);
heightMap.SetSplat(["Res/tile10.png", "Res/tile11.png", "Res/tile12.png", "Res/tile13.png"], new CMat([
    32, 32, 0, 0,
    32, 32, 0, 0,
    32, 32, 0, 0,
    32, 32, 0, 0,
]));
heightMap.mTerrainHeight = 2048;
heightMap.mTag.add("light");
heightMap.mTag.add("shadow");
heightMap.mCollider.SetLayer("test");
heightMap.mCollider.PushCollisionLayer("test");
const player = Main.PushSub(new CSubject());
player.SetPos(new CVec3(1000, 1000, 1000));
const playerPt = player.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
playerPt.PushTag("light");
playerPt.PushTag("shadow");
const playerRb = player.PushComp(new CRigidBody());
playerRb.SetGravity(10);
const playerCol = player.PushComp(new CCollider(playerPt, playerRb));
playerCol.SetLayer("test");
playerCol.PushCollisionLayer("test");
playerCol.SetRestitution();
class CBehaviorTest extends CBehavior {
    Collision(_org, _size, _tar, _push) {
        super.Collision(_org, _size, _tar, _push);
    }
    CollisionEnter(_org, _tar) {
        super.CollisionEnter(_org, _tar);
        console.log("enter");
        playerPt.SetColorModel(new CColor(1, 0, 0, CColor.eModel.RGBAdd));
    }
    CollisionExit(_org, _tar) {
        super.CollisionExit(_org, _tar);
        console.log("exit");
        playerPt.SetColorModel(new CColor(0, 0, 1, CColor.eModel.RGBAdd));
    }
}
const behavior = player.PushComp(new CBehaviorTest());
new CModalFrameView();
async function Mars() {
    heightMap.mTag.delete("light");
    heightMap.mTag.delete("shadow");
    const loaderOpt = new CLoaderOption();
    loaderOpt.mAlphaBleed = false;
    loaderOpt.mMipMap = CTexture.eMipmap.None;
    const heightTex = await gAtl.Frame().Load().Exe("Res/mars_height.png", loaderOpt);
    heightMap.mHeightBuf.Reset(new CVec3(1024, 1024, 1), 10);
    heightMap.mHeightBuf.SetTexture(heightTex);
    heightMap.mSplatBuf.Reset(new CVec3(1024, 1024, 1), 10);
    heightMap.mSplatBuf.mBuffer.fill(0x7F0000FF);
    heightMap.SetSplat([
        "Res/mars_diffuse.png", "Res/mars_detail.png", "Res/tile10.png", "Res/tile10.png"
    ], new CMat([
        1, 1, 0, 0,
        200, 200, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0,
    ]));
    heightMap.ClearAll();
}
window["Mars"] = Mars;
async function Brush() {
    heightMap.mTag.add("light");
    heightMap.mTag.add("shadow");
    const loaderOpt = new CLoaderOption();
    loaderOpt.mAlphaBleed = false;
    const heightTex = await gAtl.Frame().Load().Exe("Res/test2.tga", loaderOpt);
    const splatTex = await gAtl.Frame().Load().Exe("Res/test2Splat.png", loaderOpt);
    heightMap.mHeightBuf.Reset(new CVec3(heightTex.GetWidth(), heightTex.GetHeight(), 1), 10);
    heightMap.mHeightBuf.SetTexture(heightTex);
    heightMap.mSplatBuf.Reset(new CVec3(splatTex.GetWidth(), splatTex.GetHeight(), 1), 10);
    heightMap.mSplatBuf.SetTexture(splatTex);
    heightMap.SetSplat([
        "Res/tile11.png", "Res/tile13.png", "Res/tile14.png", "Res/tile10.png",
        new CVec4(0.5, 0.9, 0.0, 0.0), new CVec4(0.5, 0.9, 0.0, 0.0), new CVec4(0.5, 0.9, 0.0, 0.0), new CVec4(0.5, 0.9, 0.0, 0.0),
        "Res/tile11_nm.png", "Res/tile13_nm.png", "Res/tile14_nm.png", "Res/tile10_nm.png"
    ], new CMat([
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0,
    ]));
    heightMap.ClearAll();
}
window["Brush"] = Brush;
let mg = new CModalBackGround("barRoot");
let arr = [];
arr.push(new CHTMLDropdown("root", "OptionBar", "Option", Bootstrap.eColor.warning));
arr.push(new CHTMLDropdown("OptionBar", "OptionMars", `<div onclick="Mars()">Mars</div>`, Bootstrap.eColor.light));
arr.push(new CHTMLDropdown("OptionBar", "OptionBrush", `<div onclick="Brush()">Brush</div>`, Bootstrap.eColor.light));
const dummy = CHTMLDropdown.Attach(arr, "left");
let rightDiv = CDOM.DataToDom(`<div class="position-fixed top-0 end-0" style="z-index:2000;"></div>`);
rightDiv.append(dummy);
mg.SetBody(rightDiv);
await Mars();
