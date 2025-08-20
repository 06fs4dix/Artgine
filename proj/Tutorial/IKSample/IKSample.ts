//Version
const version='2025-08-19 15:07:14';
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
gPF.mServer = 'local';
gPF.mGitHub = false;

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
CPlugin.PushPath('InverseKinematics','../../../plugin/InverseKinematics/');
import "../../../plugin/InverseKinematics/InverseKinematics.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([]);
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import {CBlackBoardRef, CObject} from "../../../artgine/basic/CObject.js"
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CAnimation, CClipMesh, CClipPRS } from "../../../artgine/canvas/component/CAnimation.js";
import { CAniFlow } from "../../../artgine/canvas/component/CAniFlow.js";
import { CIKLook, CIKReach } from "../../../plugin/InverseKinematics/InverseKinematics.js";
import { CSocketAttacher } from "../../../plugin/SocketAttacher/SocketAttacher.js";
import { CPaint } from "../../../artgine/canvas/component/paint/CPaint.js";


var Main=gAtl.NewCanvas("Main");
Main.SetCameraKey("3D");

gAtl.Brush().GetCam3D().Init(new CVec3(-1551.261, 1210, -1870.726), new CVec3(-914.317, 862.913, -1181.085));

let back = new CSubject();
back.PushComp(new CPaint3D(Main.GetFrame().Pal().GetBoxMesh())).SetTexture(Main.GetFrame().Pal().GetNoneTex());

back.SetSca(new CVec3(10, 0.01, 10));
Main.Push(back);
let pt : CPaint;
let target1 = new CSubject();
pt = new CPaint3D(Main.GetFrame().Pal().GetBoxMesh());
pt.SetRGBA(new CVec4(0,1,0,1));
target1.PushComp(pt);
target1.SetBlackBoard(true);
target1.SetSca(new CVec3(0.2, 0.2, 0.2));
target1.SetPos(new CVec3(-20,70,200));
Main.Push(target1);

let target2 = new CSubject();
pt = new CPaint3D(Main.GetFrame().Pal().GetBoxMesh());
pt.SetRGBA(new CVec4(0,0,1,1));
target2.PushComp(pt);
target2.SetBlackBoard(true);
target2.SetPos(new CVec3(0, 500, -500));
target2.SetSca(new CVec3(0.2, 0.2, 0.2));

let ani2=new CAnimation();
ani2.Push(new CClipPRS(0,5000,[new CVec3(0,500,-500),new CVec3(-500,500,-500),new CVec3(500,500,-500),new CVec3(0,500,-500)],CClipPRS.eType.Pos));
target2.PushComp(new CAniFlow(ani2));
Main.Push(target2);


let target3 = new CSubject();
pt = new CPaint3D(Main.GetFrame().Pal().GetBoxMesh());
pt.SetRGBA(new CVec4(1,1,0,1));
target3.PushComp(pt);
target3.SetBlackBoard(true);
target3.SetPos(new CVec3(0, 0, 0));
target3.SetSca(new CVec3(0.01, 0.3, 0.01));
target3.SetRot(new CVec3(1.5,0,0));
Main.Push(target3);

let obj = new CSubject();
//let pt3d = new CPaint3D("Res/Avocado.gltf");
let pt3d = new CPaint3D("Res/RiggedFigure.glb");
pt3d.SetTexture(Main.GetFrame().Pal().GetNoneTex());
//let pt3d = new CPaint3D("Res/ShovedReactionWithSpin.FBX");
//let pt3d = new CPaint3D("Res/fox.FBX");
obj.PushComp(pt3d);

var ani=new CAnimation();
ani.mClip.push(new CClipMesh(0,1000*10,null,0,100*100));
//ani.mLoop=true;
obj.PushComp(new CAniFlow(ani));
//obj.SetSca(new CVec3(100, 100, 100));
obj.SetSca(new CVec3(10, 10, 10));



obj.PushComp(new CIKReach(new CBlackBoardRef(target1.Key()), "leg_joint_R_5", 4,100));
obj.PushComp(new CSocketAttacher(new CBlackBoardRef(target3.Key()), "arm_joint_L_3"));
obj.PushComp(new CIKLook(new CBlackBoardRef(target2.Key()), "neck_joint_1"));
Main.Push(obj);

