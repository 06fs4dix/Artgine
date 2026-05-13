const version = 'mp4216w1_12';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js";
import { CPreferences } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "GL";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = false;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mCanvas = "";
gPF.mWASM = false;
gPF.mServer = 'local';
gPF.mGitHub = true;
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/app/CAtelier.js";
import { CPlugin } from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
CPlugin.PushPath('ShadowPlane', 'https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/');
import "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json'], "");
var Main = gAtl.Canvas('Main.json');
import { CTexture } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec1 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec1.js";
import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { SDF } from "https://06fs4dix.github.io/Artgine/artgine/z_file/SDF.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CBound } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CBound.js";
import { CCamCon3DThirdPerson } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CRPAuto, CRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CRPMgr.js";
import { CCondition } from "https://06fs4dix.github.io/Artgine/artgine/util/CCondition.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CPaint3D, CPaintCube } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint3D.js";
import { CDayCycle, CLightPlanet } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CLightPlanet.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/render/CColor.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CPaint } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint.js";
import { CAnimation, CClipMesh } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAnimation.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAniFlow.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CCanvasPluginRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCanvasPluginRPMgr.js";
import { CDensityInfo3D, CDensityMap } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CDensityMap.js";
import { CAlert } from "https://06fs4dix.github.io/Artgine/artgine/basic/CAlert.js";
let PCF = new CVec1(0.0);
var bias = 5;
var normalBias = 4;
var shadowRate = 0.7;
let forward = new CRPMgr();
let rtex = new CTexture();
rtex.SetSize(512, 512);
if (await gAtl.Frame().Dev().BenchmarkScore() > 100) {
    rtex.SetSize(2048, 2048);
    PCF = new CVec1(2.0);
    bias = 20;
    normalBias = 10;
    CAlert.Info("고사양");
}
let texKey = forward.PushTex("shadowread.tex", rtex);
let rp = forward.PushRP(new CRPAuto());
rp.PushOr(new CCondition("class", "==", "CPaint3D"));
rp.PushOr(new CCondition("class", "==", "CPaint3DMerge"));
rp.mPriority = CRenderPass.ePriority.BackGround + 1;
rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, gAtl.Frame().Pal().GetShadowWriteTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowRate", shadowRate));
rp.mShaderAttr.push(new CShaderAttr("PCF", PCF));
rp.mShaderAttr.push(new CShaderAttr("bias", bias));
rp.mShaderAttr.push(new CShaderAttr("normalBias", normalBias));
rp.mShaderAttr.push(new CShaderAttr("jitter", 0.2));
rp.mShader = gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget = "shadowread.tex";
rp.mTag.add("shadowRead");
rp = forward.PushRP(new CRPAuto());
rp.PushOr(new CCondition("class", "==", "CPaint3D"));
rp.PushOr(new CCondition("class", "==", "CPaint3DMerge"));
rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, "shadowread.tex"));
rp.mShaderAttr.push(new CShaderAttr("shadowOn", new CVec1(SDF.eTexSlot.SingleShadowRead)));
rp.mShader = gAtl.Frame().Pal().Sl3DKey();
rp.mShaderAttr.push(new CShaderAttr("ligStep1", new CVec1(SDF.eLightStep1.None)));
rp.mTag.add("light");
Main.PushPlugin(new CCanvasPluginRPMgr(forward));
Main.Find("Ground").Destroy();
let densityMap = new CDensityMap();
densityMap.mDiv = 16;
densityMap.mBuf.Reset(new CVec3(32, 32, 1), 100);
let info = densityMap.PushDensityInfo(new CDensityInfo3D(0, new CVec3(100, 100, 100), "Res/ModularVillage/Cobblestone_Dirt_Transition_1.obj"));
info.mColor = 0;
info.mColliderLayer = "ground";
info.mPaintTag.push(CPaint.eTag.Shadow);
info.mPaintTag.push(CPaint.eTag.Light);
Main.PushSub(densityMap);
let cubeSub = Main.PushSub(new CSubject());
cubeSub.SetKey("Sky");
cubeSub.SetSca(new CVec3(10, 10, 10));
let ptcube = cubeSub.PushComp(new CPaintCube(""));
ptcube.Sky(true, false, false, false, false);
gAtl.Brush().GetCam3D().Init(new CVec3(1580, 670, 1980), new CVec3(830, 300, 1220));
Main.Find("Light").Destroy();
let sl = Main.PushSub(new CSubject());
sl.SetKey("Light");
let lp = sl.PushComp(new CLightPlanet());
lp.SetShadow("Test", 0);
lp.SetShadowDistance(1);
sl.SetPos(new CVec3(0.3, 1, 0));
lp.Push(new CDayCycle(new CVec3(0, 1, 0), new CColor(1, 1, 1)));
lp.Push(new CDayCycle(new CVec3(2, 0.5, 0), new CColor(1, 0.8, 0.8)));
lp.Push(new CDayCycle(new CVec3(-2, 0.5, 0), new CColor(1, 0.8, 0.8)));
lp.Push(new CDayCycle(new CVec3(-1, 0, 0), new CColor(1, 0.5, 0.5)));
lp.Push(new CDayCycle(new CVec3(1, 0, 0), new CColor(1, 0.5, 0.5)));
lp.Push(new CDayCycle(new CVec3(0, -1, 0), new CColor(0, 0, 0)));
let chsub = Main.PushSub(new CSubject());
chsub.SetKey("User");
let ptRes = "Res/blocky/blocky.FBX";
let aniRes = "Res/blocky/blocky.FBX";
let pt3 = chsub.PushComp(new CPaint3D(ptRes, true, 100));
pt3.PushTag(CPaint.eTag.Shadow);
chsub.SetPos(new CVec3(590, 600, 892));
let bound = new CBound();
bound.InitBound(60);
bound.SetType(CBound.eType.Sphere);
let cl = chsub.PushComp(new CCollider(bound));
cl.SetLayer("user");
cl.PushCollisionLayer("ground");
cl.SetRestitution(1);
let rb = chsub.PushComp(new CRigidBody());
rb.SetGravity(1);
let aniStand = new CAnimation();
let cm = aniStand.Push(new CClipMesh(0, 1, 2500, 4500, aniRes));
let aniWalk = new CAnimation();
cm = aniWalk.Push(new CClipMesh(0, 1.5, 0, 2000, aniRes));
let af = chsub.PushComp(new CAniFlow(aniWalk));
let camCon = new CCamCon3DThirdPerson(gAtl.Frame().Input());
gAtl.Brush().GetCam3D().SetCamCon(camCon);
let can2d = gAtl.NewCanvas("2D");
can2d.SetCameraKey("2D");
let pad = can2d.PushSub(new CPad());
chsub.Update = (_update) => {
    camCon.SetPos(chsub.GetPos());
    if (pad.IsOn())
        camCon.SetPause(true);
    else
        camCon.SetPause(false);
    let dir = pad.GetDir();
    rb.Remove("move");
    let angle = CMath.V3SignedAngle(new CVec3(0, 0, 1), gAtl.Brush().GetCam3D().GetFront(), new CVec3(0, 1, 0));
    if (dir.IsZero() == false) {
        var vArr = new Array();
        vArr.push(CVec3.Up());
        vArr.push(CVec3.Down());
        vArr.push(CVec3.Left());
        vArr.push(CVec3.Right());
        var maxd = -1;
        var maxI = 0;
        for (var i = 0; i < vArr.length; ++i) {
            var dVal = CMath.V3Dot(vArr[i], dir);
            if (maxd < dVal) {
                maxd = dVal;
                maxI = i;
            }
        }
        switch (maxI) {
            case 0:
                rb.Push(new CForce("move", CMath.V3MulFloat(gAtl.Brush().GetCam3D().GetFront(), 1), 300));
                break;
            case 1:
                rb.Push(new CForce("move", CMath.V3MulFloat(gAtl.Brush().GetCam3D().GetFront(), -1), 300));
                angle = 3.14 + angle;
                break;
            case 2:
                rb.Push(new CForce("move", CMath.V3MulFloat(gAtl.Brush().GetCam3D().GetCross(), 1), 300));
                angle = 3.14 / 2 + angle;
                break;
            case 3:
                rb.Push(new CForce("move", CMath.V3MulFloat(gAtl.Brush().GetCam3D().GetCross(), -1), 300));
                angle = -(3.14 / 2) + angle;
                break;
        }
        chsub.SetRot(new CVec3(0, angle, 0));
        if (af.GetAni() != aniWalk)
            af.SetAni(aniWalk);
    }
    else {
        if (af.GetAni() != aniStand)
            af.SetAni(aniStand);
    }
    if (pad.GetButtonEvent(0) == CEvent.eType.Click) {
        var jump = new CForce("jump");
        jump.SetDirVel(new CVec3(0, 1), 500, new CVec3(0, 1), 200);
        jump.SetDelay(0.5);
        jump.mRemove = true;
        rb.Push(jump);
    }
};
