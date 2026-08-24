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
gPF.mServer = 'webServer';
gPF.mGitHub = false;
gPF.mVersion = "mqt5xyuo_7";
import { CAtelier } from "../../../artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CLight } from "../../../artgine/app/component/CLight.js";
import { CAlpha } from "../../../artgine/render/CAlpha.js";
import { CColor } from "../../../artgine/render/CColor.js";
import { CShape3D } from "../../../plugin/CShape3D/CShape3D.js";
import { CAnimation } from "../../../artgine/app/component/CAnimation.js";
import { CClipPRS } from "../../../artgine/app/component/CAnimation.js";
import { CClipColor } from "../../../artgine/app/component/CAnimation.js";
import { CRPAuto } from "../../../artgine/app/canvas/CRPMgr.js";
import { CRenderPass } from "../../../artgine/render/CRenderPass.js";
import { CCondition } from "../../../artgine/util/CCondition.js";
import { CPaintCube } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
var Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("3D");
var camCon = new CCamCon3DFirstPerson(gAtl.Frame().Input());
camCon.mPosSensitivity = 0.3;
camCon.mRotSensitivity = 0.3;
Main.GetCam().SetCamCon(camCon);
gAtl.Brush().GetCam3D().Init(new CVec3(0, 5, 40), new CVec3(0, 0, 0));
let skySub = Main.PushSub(new CSubject());
skySub.SetKey("Sky");
skySub.SetSca(new CVec3(100, 100, 100));
let skyPt = skySub.PushComp(new CPaintCube(""));
skyPt.Sky(true, false, false, false, false);
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
    skySub.SetPos(gAtl.Brush().GetCam3D().GetEye());
});
let ligSub = Main.PushSub(new CSubject());
ligSub.SetPos(new CVec3(0, 1, 0));
let ligComp = ligSub.PushComp(new CLight());
ligComp.SetDirect(-1);
Main.PushSub(new CShape3D({
    shape: 'sphere',
    pos: new CVec3(-40, 0, 0),
    sca: 3,
    color: new CColor(1, 0.2, 0.2, CColor.eModel.RGBAdd),
    roughness: 0.5,
    metallic: 0.1,
    shadow: true,
}));
Main.PushSub(new CShape3D({
    shape: 'box',
    pos: new CVec3(-30, 0, 0),
    sca: 3,
    color: new CColor(0.2, 1, 0.2, CColor.eModel.RGBAdd),
    roughness: 0.5,
    metallic: 0.1,
    shadow: true,
}));
Main.PushSub(new CShape3D({
    shape: 'plane',
    pos: new CVec3(-20, 0, 0),
    sca: 3,
    color: new CColor(0.2, 0.2, 1, CColor.eModel.RGBAdd),
    roughness: 0.5,
    metallic: 0.1,
    shadow: true,
}));
{
    let rp = new CRPAuto(gAtl.Frame().Pal().Sl3D().mKey);
    rp.mDepthWrite = false;
    rp.mPaintSort = CRenderPass.ePaintSort.Revers;
    rp.PushAnd(new CCondition("mTag", "==", "alphaModel"));
    gAtl.Brush().SetAutoRP("alphaRP", rp);
    Main.PushSub(new CShape3D({
        shape: 'plane',
        pos: new CVec3(-10, 0, -2),
        sca: 6,
        color: new CColor(0.2, 0.2, 1, CColor.eModel.RGBAdd),
        shadow: true,
    }));
    Main.PushSub(new CShape3D({
        shape: 'box',
        pos: new CVec3(-10, 0, 0),
        sca: 3,
        color: new CColor(1, 0.3, 0.3, CColor.eModel.RGBAdd),
        alpha: new CAlpha(0.4),
        roughness: 0.4,
        metallic: 0.1,
    }));
}
{
    Main.PushSub(new CShape3D({
        shape: 'box',
        pos: new CVec3(-2, 1.5, 0),
        sca: 0.5,
        color: new CColor(1, 0.8, 0.3, CColor.eModel.RGBAdd),
        emissive: 3,
        light: {
            type: 'point',
            color: new CVec3(1, 0.6, 0.2),
            outerRadius: 30,
            innerRadius: 1,
        },
    }));
    Main.PushSub(new CShape3D({
        shape: 'sphere',
        pos: new CVec3(2, 0, 0),
        sca: 3,
        color: new CColor(0.9, 0.9, 0.9, CColor.eModel.RGBAdd),
        roughness: 0.5,
        metallic: 0.0,
        shadow: true,
        tags: ["light"],
        env: { cycle: 60, readTag: "env", readLen: 50 },
    }));
}
{
    const PX = 10;
    const STEP = 6;
    function pbr(_y, _z, _r, _m, _col) {
        return new CShape3D({
            shape: 'sphere',
            pos: new CVec3(PX, _y, _z),
            sca: 2,
            color: _col,
            roughness: _r,
            metallic: _m,
            emissive: 1,
            shadow: true,
            tags: ["light", "env"],
        });
    }
    const roughnessSteps = [0.0, 0.5, 1.0];
    const metallicSteps = [0.0, 0.5, 1.0];
    for (let ri = 0; ri < roughnessSteps.length; ri++) {
        for (let mi = 0; mi < metallicSteps.length; mi++) {
            const y = (1 - ri) * STEP;
            const z = (mi - 1) * STEP;
            const col = metallicSteps[mi] > 0.5
                ? CColor.Color(1, 0.15, 0.15, CColor.eModel.RGBAdd)
                : CColor.Color(1, 0.2, 0.2, CColor.eModel.RGBAdd);
            Main.PushSub(pbr(y, z, roughnessSteps[ri], metallicSteps[mi], col));
        }
    }
}
let rotAni = new CAnimation();
rotAni.mLoop = true;
rotAni.Push(new CClipPRS(0, 3, new CVec3(0, 0, 0), new CVec3(0, Math.PI * 2, 0), CClipPRS.eType.Rot));
Main.PushSub(new CShape3D({
    shape: 'box',
    pos: new CVec3(20, 0, 0),
    sca: 3,
    color: new CColor(1, 0.3, 0.7, CColor.eModel.RGBAdd),
    roughness: 0.4,
    metallic: 0.2,
    shadow: true,
    animation: rotAni,
}));
let scaAni = new CAnimation();
scaAni.mLoop = true;
scaAni.Push(new CClipPRS(0, 1, new CVec3(3, 3, 3), new CVec3(5, 5, 5), CClipPRS.eType.Sca));
scaAni.Push(new CClipPRS(1, 1, new CVec3(5, 5, 5), new CVec3(3, 3, 3), CClipPRS.eType.Sca));
Main.PushSub(new CShape3D({
    shape: 'box',
    pos: new CVec3(30, 0, 0),
    sca: 3,
    color: new CColor(0.3, 0.8, 1, CColor.eModel.RGBAdd),
    roughness: 0.4,
    metallic: 0.2,
    shadow: true,
    animation: scaAni,
}));
let colAni = new CAnimation();
colAni.mLoop = true;
colAni.Push(new CClipColor(0, 1.5, new CColor(0.2, 0.2, 1, CColor.eModel.RGBAdd), new CColor(1, 0.4, 0.2, CColor.eModel.RGBAdd)));
colAni.Push(new CClipColor(1.5, 1.5, new CColor(1, 0.4, 0.2, CColor.eModel.RGBAdd), new CColor(0.2, 0.2, 1, CColor.eModel.RGBAdd)));
Main.PushSub(new CShape3D({
    shape: 'box',
    pos: new CVec3(40, 0, 0),
    sca: 3,
    roughness: 0.4,
    metallic: 0.2,
    shadow: true,
    animation: colAni,
}));
{
    Main.PushSub(new CShape3D({
        shape: 'sphere',
        pos: new CVec3(50, 0, 0),
        sca: 3,
        color: new CColor(0.9, 0.9, 0.9, CColor.eModel.RGBAdd),
        roughness: 0.5,
        metallic: 0.0,
        tags: ["light"],
    }));
    Main.PushSub(new CShape3D({
        shape: 'plane',
        pos: new CVec3(50, -3, 0),
        sca: 7.5,
        rot: new CVec3(-Math.PI / 2, 0, 0),
        color: new CColor(0.15, 0.15, 0.25, CColor.eModel.RGBAdd),
        roughness: 0.9,
        metallic: 0.0,
        tags: ["light"],
    }));
}
