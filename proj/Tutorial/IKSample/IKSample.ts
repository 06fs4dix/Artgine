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
gPF.mServer = 'local';
gPF.mGitHub = false;
gPF.mVersion = "mpuhzq22_12";

import {CAtelier} from "../../../artgine/app/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import { CObject } from "../../../artgine/basic/CObject.js"
import { CComponent } from "../../../artgine/app/component/CComponent.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CPaint3D } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CAnimation, CClipMesh, CClipPRS } from "../../../artgine/app/component/CAnimation.js";
import { CAniFlow } from "../../../artgine/app/component/CAniFlow.js";
import { CPaint } from "../../../artgine/app/component/paint/CPaint.js";
import { CLoaderOption } from "../../../artgine/util/CLoader.js";
import { CResolverAttach, CResolverIKFABR, CResolverIKLook } from "../../../artgine/render/CResolver.js";
import { CColor } from "../../../artgine/render/CColor.js";
import { CAimIK, CAttacher, CLookAtIK } from "../../../plugin/CResolverComp/CResolverComp.js";


var Main=gAtl.NewCanvas("Main");
Main.SetCameraKey("3D");

gAtl.Brush().GetCam3D().Init(new CVec3(-1551.261, 1210, -1870.726), new CVec3(-914.317, 862.913, -1181.085));

let back = new CSubject();
back.PushComp(new CPaint3D(Main.GetFrame().Pal().GetBoxMesh())).SetTexture(Main.GetFrame().Pal().GetNoneTex());

back.SetSca(new CVec3(10, 0.01, 10));
Main.PushSub(back);
let pt : CPaint;
let target1 = new CSubject();
pt = new CPaint3D(Main.GetFrame().Pal().GetBoxMesh());
pt.SetColorModel(new CColor(0,1,0,CColor.eModel.RGBAdd));
target1.PushComp(pt);
target1.SetBlackBoard(true);
target1.SetSca(new CVec3(0.2, 0.2, 0.2));
target1.SetPos(new CVec3(-20,70,200));
Main.PushSub(target1);

let target2 = new CSubject();
pt = new CPaint3D(Main.GetFrame().Pal().GetBoxMesh());
pt.SetColorModel(new CColor(0,0,1,CColor.eModel.RGBAdd));
target2.PushComp(pt);
target2.SetBlackBoard(true);
target2.SetPos(new CVec3(0, 500, -500));
target2.SetSca(new CVec3(0.2, 0.2, 0.2));

let ani2=new CAnimation();
ani2.Push(new CClipPRS(0,5,[new CVec3(0,500,-500),new CVec3(-500,500,-500),new CVec3(500,500,-500),new CVec3(0,500,-500)],CClipPRS.eType.Pos));
target2.PushComp(new CAniFlow(ani2));
Main.PushSub(target2);


let target3 = new CSubject();
pt = new CPaint3D(Main.GetFrame().Pal().GetBoxMesh());
pt.SetColorModel(new CColor(1,1,0,CColor.eModel.RGBAdd));
target3.PushComp(pt);
target3.SetBlackBoard(true);
target3.SetPos(new CVec3(0, 0, 0));
target3.SetSca(new CVec3(0.01, 0.3, 0.01));
target3.SetRot(new CVec3(1.5,0,0));
Main.PushSub(target3);

gAtl.Frame().Load().Exe("Res/RiggedFigure.glb",new CLoaderOption().Set("mColorTex",true));
let obj = new CSubject();
//let pt3d = new CPaint3D("Res/Avocado.gltf");
let pt3d = new CPaint3D("Res/RiggedFigure.glb");
pt3d.SetTexture(Main.GetFrame().Pal().GetNoneTex());
//let pt3d = new CPaint3D("Res/ShovedReactionWithSpin.FBX");
//let pt3d = new CPaint3D("Res/fox.FBX");
obj.PushComp(pt3d);

var ani=new CAnimation();
ani.mClip.push(new CClipMesh(0,10,0,100*100));
//ani.mLoop=true;
obj.PushComp(new CAniFlow(ani));
//obj.SetSca(new CVec3(100, 100, 100));
obj.SetSca(new CVec3(10, 10, 10));




obj.PushComp(new CAimIK("leg_joint_R_5",target1,4));
obj.PushComp(new CAttacher("arm_joint_L_3",target3));
obj.PushComp(new CLookAtIK("neck_joint_1",target2));

Main.PushSub(obj);



























