//Version
const version='2025-08-30 10:09:37';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js"

//Class
import {CClass} from "https://06fs4dix.github.io/Artgine/artgine/basic/CClass.js";

//Atelier
import {CPreferences} from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
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

import {CAtelier} from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";

import {CPlugin} from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import {CObject} from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js"
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CPaint3D, CPaintCube } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint3D.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CColor.js";
import { CCamCon3DFirstPerson } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CLight } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CLight.js";
var Main=gAtl.NewCanvas("Main");
Main.SetCameraKey(gAtl.Brush().GetCam3D().Key());
gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));

gAtl.Brush().GetCam3D().Init(new CVec3(1000,500,0),new CVec3());


var texKey=["Res/skybox/right.jpg","Res/skybox/left.jpg","Res/skybox/bottom.jpg","Res/skybox/top.jpg","Res/skybox/front.jpg","Res/skybox/back.jpg"];
var texList=[];
await gAtl.Frame().Load().Load(texKey);
for(let i=0;i<texKey.length;++i)
{
    let tex=gAtl.Frame().Res().Find(texKey[i]);
    texList.push(tex);
}
let cubeTex=gAtl.Frame().Ren().BuildCubeMap(texList,true);


let ligSub=Main.PushSub(new CSubject());
let ligComp=ligSub.PushComp(new CLight());
ligComp.SetDirect();
//ligComp.SetDirectPos(new CVec3(-1,0,0));
ligComp.SetColor(new CVec3(1,0.5,0.5));
ligSub.SetPos(new CVec3(1,0,0));

let sub=Main.PushSub(new CSubject());
sub.SetPos(new CVec3(0,0,-300));
let pt=sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
pt.PushRenderPass(new CRenderPass(gAtl.Frame().Pal().SlCubeKey()))
pt.SetTexture(cubeTex);

sub=Main.PushSub(new CSubject());
sub.SetPos(new CVec3(0,0,300));
sub.PushComp(new CPaintCube(cubeTex));




sub=Main.PushSub(new CSubject());
sub.SetSca(new CVec3(10,10,10));
let ptcube=sub.PushComp(new CPaintCube(cubeTex));
ptcube.Sky(true,true,false,true,true);

//ptcube.Sky();


























