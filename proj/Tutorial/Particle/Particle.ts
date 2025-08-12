//Version
const version='2025-08-09 22:38:49';
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
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([]);

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CParticle, CParticleShapeOut } from "../../../artgine/canvas/subject/CParticle.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CAnimation, CClipColorAlpha, CClipDestroy, CClipPRS } from "../../../artgine/canvas/component/CAnimation.js";
import { CAniFlow } from "../../../artgine/canvas/component/CAniFlow.js";
import { CExtract, CExtractMinMax, CExtractSample } from "../../../artgine/geometry/CExtract.js";
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CPaintTrail } from "../../../artgine/canvas/component/paint/CPaintTrail.js";
import { CAlpha, CColor } from "../../../artgine/canvas/component/CColor.js";
import { CRenderPass } from "../../../artgine/render/CRenderPass.js";
import { SDF } from "../../../artgine/z_file/SDF.js";

var Main=gAtl.NewCanvas("Main");
Main.SetCameraKey("3D");
gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
var obj=new CSubject();
var pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
let rp=new CRenderPass(gAtl.Frame().Pal().Sl3DKey());
//강제로 렌더링 순서를 조정했다.
rp.SetPriority(CRenderPass.ePriority.BackGround);
pt.PushRenderPass(rp);
pt.SetTexture(gAtl.Frame().Pal().GetNoneTex());
//pt.SetRenderPass(rp);
obj.PushComp(pt);
obj.SetSca(new CVec3(10,0.1,10));
//obj.SetSca(new CVec3(100,0.01,100));
Main.Push(obj);



//파티클 샘플
var particle=new CParticle();
var sub0=new CSubject();

let ptbill=new CPaint2D(gAtl.Frame().Pal().GetNoneTex(),new CVec2(100,100));
ptbill.SetBillBoard(true);
ptbill.SetColorModel(new CColor(0,1,0,CColor.eModel.RGBMul))
sub0.PushComp(ptbill);

var ani=new CAnimation();
ani.Push(new CClipColorAlpha(0,1000*5,new CAlpha(1,CAlpha.eModel.Mul),new CAlpha(0,CAlpha.eModel.Mul)));
ani.Push(new CClipDestroy(1000*5));
sub0.PushComp(new CAniFlow(ani));


var sub1=new CSubject();
ptbill=new CPaint2D(gAtl.Frame().Pal().GetNoneTex(),new CVec2(50,100));
ptbill.SetColorModel(new CColor(1,0,0,CColor.eModel.RGBMul))
//ptbill.SetBillBoard(true);
ptbill.Tail();
sub1.PushComp(ptbill);
var ani=new CAnimation();
ani.Push(new CClipDestroy(1000*5));
sub1.PushComp(new CAniFlow(ani));


var sub2=new CSubject();
ptbill=new CPaint2D(gAtl.Frame().Pal().GetNoneTex(),new CVec2(100,100));
ptbill.SetColorModel(new CColor(0,0,1,CColor.eModel.RGBMul))
//ptbill.SetBillBoard(true);
sub2.PushComp(ptbill);
var ani=new CAnimation();
ani.Push(new CClipDestroy(1000*5));
sub2.PushComp(new CAniFlow(ani));

//3가지 샘플을 4:2:1 비율로 선택함
var sam=new CExtractSample([sub0,sub1,sub2],[4,2,1]);
//var sam=new CExtractSample([sub1]);
particle.mSample=sam;
//particle.m_createCount=new CExtract(1);
//particle.m_createTime=1000*5;
//모든 방향으로 아웃함
particle.mShape=new CParticleShapeOut();
//(particle.mShape as CParticleShapeOut).mDir=new CExtractMinMax(new CVec3(0,0,0),new CVec3(0,1,0));
//particle.mCreateCount=new CExtract(1);
//particle.mCreateTime=5000;
Main.Push(particle);


//트레일 샘플
var trail=new CSubject();
var tpt=new CPaintTrail(gAtl.Frame().Pal().GetNoneTex(),1024);
tpt.mLastHide=false;
tpt.mEndTime=1000*2;
tpt.SetEdge(true,2,64);
trail.PushComp(tpt);
var ani=new CAnimation();
var before=new CVec3();
for(var i=0;i<10;++i)
{
    var pos=new CVec3(Math.random()*1000-500,500,Math.random()*1000-500);
    var clip=new CClipPRS(i*1000,1000,before,pos,0);
    ani.Push(clip);
    before=pos;
}


trail.PushComp(new CAniFlow(ani));
Main.Push(trail);