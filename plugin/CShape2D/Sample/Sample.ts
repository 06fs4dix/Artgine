//Version
import "../../../artgine/artgine.js"

//Class
import {CClass} from "../../../artgine/basic/CClass.js";

//Atelier
import {CPreferences} from "../../../artgine/basic/CPreferences.js";
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
gPF.mServer = 'webServer';
gPF.mGitHub = false;
gPF.mVersion = "shape2d_v1";

import {CAtelier} from "../../../artgine/app/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint

import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CCamCon2DFollow } from "../../../artgine/util/CCamCon.js";
import { CColor } from "../../../artgine/render/CColor.js";
import { CAlpha } from "../../../artgine/render/CAlpha.js";
import { CShape2D } from "../../../plugin/CShape2D/CShape2D.js";
import { CAnimation } from "../../../artgine/app/component/CAnimation.js";
import { CClipPRS } from "../../../artgine/app/component/CAnimation.js";
import { CClipColor } from "../../../artgine/app/component/CAnimation.js";

var Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("2D");
Main.GetCam().SetCamCon(new CCamCon2DFollow(gAtl.Frame().Input()));

// ============================================================
// 1~7: 기능별 샘플 (가로 배치)
// ============================================================

// 1. 단색 사각형 (텍스처 없이 색상만)
Main.PushSub(new CShape2D({
    size: new CVec2(80, 80),
    pos: new CVec3(-320, 0, 0),
    color: new CColor(1, 0.2, 0.2, CColor.eModel.RGBAdd),
}));

// 2. 텍스처 스프라이트
Main.PushSub(new CShape2D({
    texture: gAtl.Frame().Pal().GetNoneTex(),
    size: new CVec2(80, 80),
    pos: new CVec3(-220, 0, 0),
}));

// 3. Alpha (반투명)
{
    // 뒤쪽 사각형
    Main.PushSub(new CShape2D({
        size: new CVec2(100, 100),
        pos: new CVec3(-120, 0, -1),
        color: new CColor(0.2, 0.2, 1, CColor.eModel.RGBAdd),
    }));
    // 앞쪽 반투명 사각형
    Main.PushSub(new CShape2D({
        size: new CVec2(80, 80),
        pos: new CVec3(-120, 0, 0),
        color: new CColor(1, 0.3, 0.3, CColor.eModel.RGBAdd),
        alpha: new CAlpha(0.4),
    }));
}

// 4. Y-Sort (앞뒤 정렬)
{
    Main.PushSub(new CShape2D({
        size: new CVec2(60, 90),
        pos: new CVec3(-30, 20, 0),
        color: new CColor(0.3, 0.8, 0.3, CColor.eModel.RGBAdd),
        ySort: true,
    }));
    Main.PushSub(new CShape2D({
        size: new CVec2(60, 90),
        pos: new CVec3(0, -10, 0),
        color: new CColor(0.8, 0.6, 0.2, CColor.eModel.RGBAdd),
        ySort: true,
    }));
}

// 5. RigidBody + Collider (충돌 박스)
{
    Main.PushSub(new CShape2D({
        size: new CVec2(60, 60),
        pos: new CVec3(80, 0, 0),
        color: new CColor(0.9, 0.9, 0.2, CColor.eModel.RGBAdd),
        rigidBody: { gravity: 0, freezePos: [false, false, true] },
        collider: { event: 1, layer: "shape2d" },
    }));
}

// 6. 회전 + 스케일 애니메이션
let rotAni = new CAnimation();
rotAni.mLoop = true;
rotAni.Push(new CClipPRS(0, 3, new CVec3(0, 0, 0), new CVec3(0, 0, Math.PI * 2), CClipPRS.eType.Rot));
Main.PushSub(new CShape2D({
    size: new CVec2(70, 70),
    pos: new CVec3(180, 0, 0),
    color: new CColor(0.6, 0.3, 1, CColor.eModel.RGBAdd),
    animation: rotAni,
}));

let scaAni = new CAnimation();
scaAni.mLoop = true;
scaAni.Push(new CClipPRS(0, 1, new CVec3(1, 1, 1), new CVec3(1.4, 1.4, 1.4), CClipPRS.eType.Sca));
scaAni.Push(new CClipPRS(1, 1, new CVec3(1.4, 1.4, 1.4), new CVec3(1, 1, 1), CClipPRS.eType.Sca));
Main.PushSub(new CShape2D({
    size: new CVec2(60, 60),
    pos: new CVec3(270, 0, 0),
    color: new CColor(0.3, 0.8, 1, CColor.eModel.RGBAdd),
    animation: scaAni,
}));

// 7. 색상 펄스 애니메이션
let colAni = new CAnimation();
colAni.mLoop = true;
colAni.Push(new CClipColor(0, 1.5, new CColor(0.2, 0.2, 1, CColor.eModel.RGBAdd), new CColor(1, 0.4, 0.2, CColor.eModel.RGBAdd)));
colAni.Push(new CClipColor(1.5, 1.5, new CColor(1, 0.4, 0.2, CColor.eModel.RGBAdd), new CColor(0.2, 0.2, 1, CColor.eModel.RGBAdd)));
Main.PushSub(new CShape2D({
    size: new CVec2(70, 70),
    pos: new CVec3(360, 0, 0),
    animation: colAni,
}));
