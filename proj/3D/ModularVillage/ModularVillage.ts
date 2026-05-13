//Version
const version='mp4216w1_12';
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
gPF.mAnti = false;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mCanvas = "";
gPF.mWASM = false;
gPF.mServer = 'local';
gPF.mGitHub = true;

import {CAtelier} from "https://06fs4dix.github.io/Artgine/artgine/app/CAtelier.js";

import {CPlugin} from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
CPlugin.PushPath('ShadowPlane','https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/');
import "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json'],"");
var Main = gAtl.Canvas('Main.json');
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint

import {CObject} from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js"

import { CTexture } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";

import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec1 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec1.js";


import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";

import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
import { SDF } from "https://06fs4dix.github.io/Artgine/artgine/z_file/SDF.js";

import { CInput } from "https://06fs4dix.github.io/Artgine/artgine/system/CInput.js";
import { CFrame } from "https://06fs4dix.github.io/Artgine/artgine/util/CFrame.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CLoaderOption } from "https://06fs4dix.github.io/Artgine/artgine/util/CLoader.js";

import { CBound } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CBound.js";
import { CCamCon3DThirdPerson } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";


import { CUpdate } from "https://06fs4dix.github.io/Artgine/artgine/basic/Basic.js";
import { CMat } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMat.js";
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
import { CDensityInfo2D, CDensityInfo3D, CDensityMap } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CDensityMap.js";
import { CAlert } from "https://06fs4dix.github.io/Artgine/artgine/basic/CAlert.js";



let PCF=new CVec1(0.0);
var bias : number = 5;
var normalBias : number = 4;
var shadowRate=0.7;
let forward=new CRPMgr();
let rtex=new CTexture();
rtex.SetSize(512,512);

if(await gAtl.Frame().Dev().BenchmarkScore()>100)
{
    rtex.SetSize(2048,2048);
    PCF=new CVec1(2.0);
    bias  = 20;
    normalBias  = 10;
    CAlert.Info("고사양");
}


let texKey=forward.PushTex("shadowread.tex",rtex);
let rp=forward.PushRP(new CRPAuto());
rp.PushOr(new CCondition("class","==","CPaint3D"));
rp.PushOr(new CCondition("class","==","CPaint3DMerge"));
rp.mPriority=CRenderPass.ePriority.BackGround+1;
rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite,gAtl.Frame().Pal().GetShadowWriteTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowRate",shadowRate));
rp.mShaderAttr.push(new CShaderAttr("PCF",PCF));
rp.mShaderAttr.push(new CShaderAttr("bias",bias));
rp.mShaderAttr.push(new CShaderAttr("normalBias",normalBias));
rp.mShaderAttr.push(new CShaderAttr("jitter",0.2));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget="shadowread.tex";
//rp.mRenderTarget=gAtl.Frame().Pal().GetShadowReadTex();
rp.mTag.add("shadowRead");

rp=forward.PushRP(new CRPAuto());
rp.PushOr(new CCondition("class","==","CPaint3D"));
rp.PushOr(new CCondition("class","==","CPaint3DMerge"));
rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead,"shadowread.tex"));
//rp.mShaderAttr.push(new CShaderAttr(7,gAtl.Frame().Pal().GetShadowReadTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(SDF.eTexSlot.SingleShadowRead)));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mShaderAttr.push(new CShaderAttr("ligStep1",new CVec1(SDF.eLightStep1.None)));
rp.mTag.add("light");



Main.PushPlugin(new CCanvasPluginRPMgr(forward));
//Main.SetRPMgr(null);


Main.Find("Ground").Destroy();
// Main.Find("Prop_Barrel_2").Destroy();
// Main.Find("Prop_Barrel_1").Destroy();
// Main.Find("Prop_Well_1").Destroy();

// Main.Find("Stucco_Prop_Support_Pillar_1").Destroy();
// Main.Find("Prop_Lamp_Street").Destroy();

// Main.Find("Prop_Crate_1").Destroy();
let densityMap=new CDensityMap();
densityMap.mDiv=16;
densityMap.mBuf.Reset(new CVec3(32,32,1),100);
let info=densityMap.PushDensityInfo(new CDensityInfo3D(0,new CVec3(100,100,100),"Res/ModularVillage/Cobblestone_Dirt_Transition_1.obj"));
info.mColor=0;
info.mColliderLayer="ground";
info.mPaintTag.push(CPaint.eTag.Shadow);
info.mPaintTag.push(CPaint.eTag.Light);
Main.PushSub(densityMap);


// let gsub=Main.PushSub(new CSubject());
// let gpt=gsub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
// gpt.PushTag(CPaint.eTag.Shadow);
// gpt.PushTag(CPaint.eTag.Light);
// gpt.SetColorModel(new CColor(1,1,1,CColor.eModel.RGBAdd));
// gsub.SetSca(new CVec3(50,0.1,50));
// let gcl=gsub.PushComp(new CCollider(gpt));
// gcl.SetLayer("ground");
//Main.Find("Prop_Well_1").Destroy();




// Main.Clear();
// let sub=new CSubject();
// let meshList=[];
// let matList=[];

// let countX=16;
// let countZ=16;
// let size=200;
// for(let x=0;x<countX;++x)
// for(let z=0;z<countZ;++z)
// {
//     let rand=Math.trunc(Math.random()*4)+1;//랜덤패턴 추가시
//     meshList.push("Res/Cobblestone_Dirt_Transition_"+rand+".obj");
//     let mat=CMath.MatScale(new CVec3(1,1,1));
//     mat.SetV3(3,new CVec3(size*x,0,size*z));
//     matList.push(mat);
// }

// let pt=sub.PushComp(new CPaintMeshMerge(meshList,matList,false,200));
// pt.Shadow();
// //pt.SetMaterial(0.9);
// sub.SetKey("Ground");
// //Main.PushSub(sub);

// size=200;
// let countY=1;
// let sizeY=80;
// for(let y=0;y<countY;++y)
// for(let x=0;x<countX;++x)
// for(let z=0;z<countZ;++z)
// {
//     if(x==0 || z==0 || x==countX-1 || z==countZ-1)
//     {
//         let rand=Math.trunc(Math.random()*4)+1;//랜덤패턴 추가시
//         meshList.push("Res/Stone_Curb_"+rand+".obj");
//         let mat=CMath.MatScale(new CVec3(1,1,1));
//         if(x==0)
//         {
//             mat.SetV3(3,new CVec3(size*x+20,sizeY*y,size*z+50));
//         }
//         else if(x==countX-1 )
//         {
//             mat.SetV3(3,new CVec3(size*x-125,sizeY*y,size*z+50));
//         }
//         else if(z==countX-1 )
//         {
//             mat=CMath.MatRotation(new CVec3(0,3.14/2,0));
//             mat.SetV3(3,new CVec3(size*x-195,sizeY*y,size*z-20));
//         }
//         else
//         {
//             mat=CMath.MatRotation(new CVec3(0,-3.14/2,0));
//             mat.SetV3(3,new CVec3(size*x-195,sizeY*y,size*z+120));
//         }

        
//         matList.push(mat);
//     }
    
// }

// pt=sub.PushComp(new CPaintMeshMerge(meshList,matList,false,200));
// pt.Shadow();
// //pt.SetMaterial(0.9);
// //sub.SetKey("Ground");
// Main.PushSub(sub);


let cubeSub=Main.PushSub(new CSubject());
cubeSub.SetKey("Sky");
cubeSub.SetSca(new CVec3(10,10,10));
let ptcube=cubeSub.PushComp(new CPaintCube(""));
ptcube.Sky(true,false,false,false,false);
gAtl.Brush().GetCam3D().Init(new CVec3(1580,670,1980),new CVec3(830,300,1220));


Main.Find("Light").Destroy();
//Main.Detach("Light");

let sl=Main.PushSub(new CSubject());
sl.SetKey("Light");
let lp=sl.PushComp(new CLightPlanet());
lp.SetShadow("Test",0);
lp.SetShadowDistance(1);
sl.SetPos(new CVec3(0.3,1,0));
lp.Push(new CDayCycle(new CVec3(0,1,0),new CColor(1,1,1)));
lp.Push(new CDayCycle(new CVec3(2,0.5,0),new CColor(1,0.8,0.8)));
lp.Push(new CDayCycle(new CVec3(-2,0.5,0),new CColor(1,0.8,0.8)));
lp.Push(new CDayCycle(new CVec3(-1,0,0),new CColor(1,0.5,0.5)));
lp.Push(new CDayCycle(new CVec3(1,0,0),new CColor(1,0.5,0.5)));
lp.Push(new CDayCycle(new CVec3(0,-1,0),new CColor(0,0,0)));

//await gAtl.Frame().Load().Exe("blocky_short_scale_reset/blocky_short_scale_reset.FBX");
//await gAtl.Frame().Load().Exe("blocky_short/blocky_short.FBX");



let chsub=Main.PushSub(new CSubject());
chsub.SetKey("User");
//chsub.SetEnable(false);

let ptRes="Res/blocky/blocky.FBX";
let aniRes="Res/blocky/blocky.FBX";
let pt3=chsub.PushComp(new CPaint3D(ptRes,true,100));
pt3.PushTag(CPaint.eTag.Shadow);
chsub.SetPos(new CVec3(590,600,892));
//chsub.SetRot(new CVec3(0,3.14/2,0));
let bound=new CBound();
bound.InitBound(60);
bound.SetType(CBound.eType.Sphere);
let cl=chsub.PushComp(new CCollider(bound));
cl.SetLayer("user");
cl.PushCollisionLayer("ground");
cl.SetRestitution(1);
let rb=chsub.PushComp(new CRigidBody());
rb.SetGravity(1);
let aniStand=new CAnimation();
let cm=aniStand.Push(new CClipMesh(0,1,2500,4500,aniRes));
//cm.mBake=true;

//aniStand.Push(new CClipMesh(0,2,500,2500,"blocky_short/blocky_short.FBX"));
let aniWalk=new CAnimation();
cm=aniWalk.Push(new CClipMesh(0,1.5,0,2000,aniRes));
//cm.mBake=true;
let af=chsub.PushComp(new CAniFlow(aniWalk));
let camCon=new CCamCon3DThirdPerson(gAtl.Frame().Input());
gAtl.Brush().GetCam3D().SetCamCon(camCon);


let can2d=gAtl.NewCanvas("2D");
can2d.SetCameraKey("2D");
let pad=can2d.PushSub(new CPad());

//gAtl.Brush().GetCam3D().ResetPerspective();
chsub.Update=(_update : CUpdate)=>{
    camCon.SetPos(chsub.GetPos());


    
    if(pad.IsOn())     camCon.SetPause(true);
    else      camCon.SetPause(false);
    let dir=pad.GetDir();



    rb.Remove("move");
    
    let angle=CMath.V3SignedAngle(new CVec3(0,0,1),gAtl.Brush().GetCam3D().GetFront(),new CVec3(0,1,0));
    if(dir.IsZero()==false)
    {
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
        
        
        switch(maxI)
        {
            case 0:rb.Push(new CForce("move",CMath.V3MulFloat(gAtl.Brush().GetCam3D().GetFront(),1),300));break;
            case 1:
                rb.Push(new CForce("move",CMath.V3MulFloat(gAtl.Brush().GetCam3D().GetFront(),-1),300));
                angle=3.14+angle;
                break;
            case 2:
                rb.Push(new CForce("move",CMath.V3MulFloat(gAtl.Brush().GetCam3D().GetCross(),1),300));
                angle=3.14/2+angle;
                break;

            case 3:
                rb.Push(new CForce("move",CMath.V3MulFloat(gAtl.Brush().GetCam3D().GetCross(),-1),300));
                angle=-(3.14/2)+angle;
                break;
        }
        chsub.SetRot(new CVec3(0,angle,0));
       
        
        if(af.GetAni()!=aniWalk)
            af.SetAni(aniWalk);
    }
    else
    {
        if(af.GetAni()!=aniStand)
            af.SetAni(aniStand);
    }
    if(pad.GetButtonEvent(0)==CEvent.eType.Click)
    {
        //rb.Push(new CForce("jump",CMath.V3MulFloat(gAtl.Brush().GetCam3D().GetCross(),-1),300));
        var jump = new CForce("jump");
        jump.SetDirVel(new CVec3(0, 1), 500, new CVec3(0, 1), 200);
        jump.SetDelay(0.5);
        jump.mRemove = true;
        rb.Push(jump);
    }

};

// gAtl.Frame().PushEvent(CEvent.eType.Update,()=>{

//     if(gAtl.Frame().Input().KeyUp(CInput.eKey.F))
//     {
//         chsub.RemoveComps(CAniFlow);
//         let ani=new CAnimation();
//         ani.Push(new CClipMesh(0,2000,500,2500,"blocky_short_head/blocky_short_head.FBX"));
//         let af=chsub.PushComp(new CAniFlow(ani));
//         //af.SetInter(1000);

//         ani=new CAnimation();
//         ani.Push(new CClipMesh(0,2000,500,2500,"blocky_short_body/blocky_short_body.FBX"));
//         af=chsub.PushComp(new CAniFlow(ani));
//     }
//     if(gAtl.Frame().Input().KeyUp(CInput.eKey.G))
//     {
//         chsub.RemoveComps(CAniFlow);
//         let ani=new CAnimation();
//         ani.Push(new CClipMesh(0,2000,500,2500,"blocky_short/blocky_short.FBX"));
//         let af=chsub.PushComp(new CAniFlow(ani));
        

//     }

// });






























// gAtl.Frame().PushEvent(CEvent.eType.Update,()=>{

//     if(gAtl.Frame().Input().KeyUp(CInput.eKey.F))
//     {
//         let m=gAtl.Frame().Input().Mouse();
//         let ray=gAtl.Brush().GetCam3D().GetRay(m.x,m.y);
//         let ground=Main.Find("Ground");
//         let pt=ground.FindComp(CPaint);
//         let sub=new CSubject();
//         sub.PushComp(new CPaint3DDecal([gAtl.Frame().Pal().GetNoneTex()],pt.GetBound().mPos.Array(),pt.GetFMat(),ray,new CVec3(50,50,200)));

//         Main.PushSub(sub);

//     }
// });















































































































