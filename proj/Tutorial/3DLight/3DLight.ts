//Version
const version='mi8vige2_5';
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
gPF.mWASM = false;
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = true;

import {CAtelier} from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";

import {CPlugin} from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json'],"");
var Main = gAtl.Canvas('Main.json');
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint

import {CObject} from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js"
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CPaint3D, CPaintCube } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint3D.js";
import { CCamCon3DThirdPerson } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CRPAuto, CRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CRPMgr.js";
import { CTexture, CTextureInfo } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec1 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec1.js";
import { CLight } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CLight.js";
import { CShadowPlane } from "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js";
import { CModal, CModalTitleBar } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { SDF } from "https://06fs4dix.github.io/Artgine/artgine/z_file/SDF.js";
import { CSurface } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSurface.js";
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
import { CAnimation, CClip, CClipMesh, CClipPRS } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAnimation.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAniFlow.js";
import { CAlert } from "https://06fs4dix.github.io/Artgine/artgine/basic/CAlert.js";
import { CBGAttachButton, CMDViewer } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CUtilWeb } from "https://06fs4dix.github.io/Artgine/artgine/util/CUtilWeb.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CColor.js";
import { CCondition } from "https://06fs4dix.github.io/Artgine/artgine/util/CStateMachine.js";
import { CLoaderOption } from "https://06fs4dix.github.io/Artgine/artgine/util/CLoader.js";
import { CPaint } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint.js";



let lop=new CLoaderOption();
lop.mFilter=CTexture.eFilter.Linear;
lop.mWrap=CTexture.eWrap.Repeat;
await gAtl.Frame().Load().Exe("Res/teapot/1zflt0j.jpg",lop);
await gAtl.Frame().Load().Exe("Res/teapot/1zflt0j_NRM.jpg",lop);
await gAtl.Frame().Load().Exe("Res/teapot/1zflt0j_lig.jpg",lop);

var skyTexKey=["Res/skybox/right.jpg","Res/skybox/left.jpg","Res/skybox/bottom.jpg","Res/skybox/top.jpg","Res/skybox/front.jpg","Res/skybox/back.jpg"];
var skyTexList=[];
await gAtl.Frame().Load().Exe(skyTexKey);
for(let i=0;i<skyTexKey.length;++i)
{
    let tex=gAtl.Frame().Res().Find(skyTexKey[i]);
    skyTexList.push(tex);
}
let cubeTex=gAtl.Frame().Ren().BuildCubeMap(skyTexList,true,"cube.tex");


let PCF=new CVec1(1.0);
var bias : number = 10;
var normalBias : number = 5;
var bias : number = 5;
var normalBias : number = 0;
var shadowDistance=0.4;
var digit=1;
var shadowRate=0.7;

//====================================================
let DeferredSingle=new CRPMgr();
let gBufPosTex=new CTexture();
gBufPosTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA32F,1)]);
let gBufPos=DeferredSingle.PushTex("gBufPos.tex",gBufPosTex);
let rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal+0;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Position));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufPos;
rp.mTag.add("gBuf");



let gBufNorTex=new CTexture();
gBufNorTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
let gBufNor=DeferredSingle.PushTex("gBufNor.tex",gBufNorTex);
rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal+1;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Normal));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufNor;
rp.mTag.add("gBuf");


let gBufAlbTex=new CTexture();
gBufNorTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
let gBufAlb=DeferredSingle.PushTex("gBufAlb.tex",gBufAlbTex);
rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal+2;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Albedo));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufAlb;
rp.mTag.add("gBuf");


let gBufSPETex=new CTexture();
gBufNorTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
let gBufSPE=DeferredSingle.PushTex("gBufSPE.tex",gBufSPETex);
rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal+3;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.SpeculerPowEmissive));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufSPE;
rp.mTag.add("gBuf");

let ShadowKey=DeferredSingle.PushTex("shadowread.tex",new CTexture());
rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.BackGround+1;
rp.mShaderAttr.push(new CShaderAttr(0,gAtl.Frame().Pal().GetShadowWriteTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowRate",shadowRate));
rp.mShaderAttr.push(new CShaderAttr("PCF",PCF));
rp.mShaderAttr.push(new CShaderAttr("bias",bias));
rp.mShaderAttr.push(new CShaderAttr("normalBias",normalBias));

rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=ShadowKey;
rp.mTag.add("shadowRead");

let sufLig0=DeferredSingle.PushSuf(new CSurface());
let srp=sufLig0.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("light");
srp.mShaderAttr.push(new CShaderAttr(7,"shadowread.tex"));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(7)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufAlb));
srp.mShaderAttr.push(new CShaderAttr(1,gBufPos));
srp.mShaderAttr.push(new CShaderAttr(2,gBufNor));
srp.mShaderAttr.push(new CShaderAttr(3,gBufSPE));
srp.mShaderAttr.push(new CShaderAttr("renType",0));



let sufLig1=DeferredSingle.PushSuf(new CSurface());
srp=sufLig1.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("light");
srp.mShaderAttr.push(new CShaderAttr(7,"shadowread.tex"));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(7)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufAlb));
srp.mShaderAttr.push(new CShaderAttr(1,gBufPos));
srp.mShaderAttr.push(new CShaderAttr(2,gBufNor));
srp.mShaderAttr.push(new CShaderAttr(3,gBufSPE));
srp.mShaderAttr.push(new CShaderAttr("renType",1));

let sufLast=DeferredSingle.PushSuf(new CSurface());
srp=sufLast.GetRP();
sufLast.SetUseRT(false);
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("blend");
srp.mShaderAttr.push(new CShaderAttr(0,sufLig0.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr(1,sufLig1.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr("blend", 1, CRenderPass.eBlend.LinearDodge));
srp.mShaderAttr.push(new CShaderAttr("opacity",1,1));
//====================================================
let DeferredMulti=new CRPMgr();
let gBufMultiTex=new CTexture();
gBufMultiTex.PushInfo([
    new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1),
    new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA32F,1),
    new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1),
    new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1),]);
let gBufMulti=DeferredMulti.PushTex("gBufMulti.tex",gBufMultiTex);
rp=DeferredMulti.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal+0;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Position));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufMulti;
rp.mTag.add("gBufMulti");


ShadowKey=DeferredMulti.PushTex("shadowread.tex",new CTexture());
rp=DeferredMulti.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.BackGround+1;

rp.mShaderAttr.push(new CShaderAttr(0,gAtl.Frame().Pal().GetShadowWriteTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowRate",shadowRate));
rp.mShaderAttr.push(new CShaderAttr("PCF",PCF));
rp.mShaderAttr.push(new CShaderAttr("bias",bias));
rp.mShaderAttr.push(new CShaderAttr("normalBias",normalBias));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=ShadowKey;
rp.mTag.add("shadowRead");

sufLig0=DeferredMulti.PushSuf(new CSurface());
srp=sufLig0.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("light");
srp.mShaderAttr.push(new CShaderAttr(7,"shadowread.tex"));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(7)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufMulti));//순차적으로 등록된다
srp.mShaderAttr.push(new CShaderAttr("renType",0));

srp.mShaderAttr.push(new CShaderAttr("ligStep0",SDF.eLightStep0.None));
srp.mShaderAttr.push(new CShaderAttr("ligStep1",SDF.eLightStep1.CookTorrance));

srp.mShaderAttr.push(new CShaderAttr(0,cubeTex));
srp.mShaderAttr.push(new CShaderAttr("envCube",new CVec1(0)));



sufLig1=DeferredMulti.PushSuf(new CSurface());
srp=sufLig1.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("light");
srp.mShaderAttr.push(new CShaderAttr(7,"shadowread.tex"));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(7)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufMulti));//순차적으로 등록된다
srp.mShaderAttr.push(new CShaderAttr("renType",1));
srp.mShaderAttr.push(new CShaderAttr("ligStep0",SDF.eLightStep0.None));
srp.mShaderAttr.push(new CShaderAttr("ligStep1",SDF.eLightStep1.CookTorrance));

srp.mShaderAttr.push(new CShaderAttr(0,cubeTex));
srp.mShaderAttr.push(new CShaderAttr("envCube",new CVec1(0)));




rp=DeferredMulti.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaintCube"));
rp.mPriority=CRenderPass.ePriority.Normal+2;
rp.mShader=gAtl.Frame().Pal().SlCubeKey();
rp.mCullFace=CRenderPass.eCull.None;
rp.mCullFrustum=false;

let skyboxTex=new CTexture();
rp.mRenderTarget=DeferredMulti.PushTex("skyboxTex.tex",skyboxTex);
rp.mBlitRead=gBufMulti;
rp.mBlitType=1;



sufLast=DeferredMulti.PushSuf(new CSurface());
srp=sufLast.GetRP();
sufLast.SetUseRT(false);
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("blend");
srp.mShaderAttr.push(new CShaderAttr(0,sufLig0.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr(1,sufLig1.GetTexKey()));
// srp.mShaderAttr.push(new CShaderAttr(2,rp.mRenderTarget));
// srp.mShaderAttr.push(new CShaderAttr("blend", 2, CRenderPass.eBlend.LinearDodge,CRenderPass.eBlend.LerpAlpha));
// srp.mShaderAttr.push(new CShaderAttr("opacity",2,1,1));

srp.mShaderAttr.push(new CShaderAttr(2,rp.mRenderTarget));
srp.mShaderAttr.push(new CShaderAttr("blend", 1, CRenderPass.eBlend.LinearDodge,CRenderPass.eBlend.LerpAlpha));
srp.mShaderAttr.push(new CShaderAttr("opacity",1,1,1));


//=============================================
let forward=new CRPMgr();
let texKey=forward.PushTex("shadowread.tex",new CTexture());
//let texKey=forward.PushTex("shadowread.tex",new CTexture());
rp=forward.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.BackGround+1;

rp.mShaderAttr.push(new CShaderAttr(0,gAtl.Frame().Pal().GetShadowWriteTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowRate",shadowRate));
rp.mShaderAttr.push(new CShaderAttr("PCF",PCF));
rp.mShaderAttr.push(new CShaderAttr("bias",bias));
rp.mShaderAttr.push(new CShaderAttr("normalBias",normalBias));

rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget="shadowread.tex";
//rp.mRenderTarget=gAtl.Frame().Pal().GetShadowReadTex();
rp.mTag.add("shadowRead");

rp=forward.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mShaderAttr.push(new CShaderAttr(7,"shadowread.tex"));
//rp.mShaderAttr.push(new CShaderAttr(7,gAtl.Frame().Pal().GetShadowReadTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(7)));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
//=============================================



let camcon=new CCamCon3DThirdPerson(gAtl.Frame().Input());
gAtl.Brush().GetCam3D().SetCamCon(camcon);
camcon.SetPos(new CVec3());

let back=Main.PushSub(new CSubject());
let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_NRM.jpg","Res/teapot/1zflt0j_lig.jpg"]);
pt.PushTag(CPaint.eTag.Shadow);
back.SetSca(new CVec3(10,0.01,10));


let teapot=Main.PushSub(new CSubject());
let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
pt2.PushTag(CPaint.eTag.Shadow);

teapot=Main.PushSub(new CSubject());
teapot.SetPos(new CVec3(500,0,0));
pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
pt2.PushTag(CPaint.eTag.Shadow);




CModal.PushTitleBar(new CModalTitleBar("DevToolModal","ShadowPlane",()=>{
    Main.Clear();
    Main.SetRPMgr(null);
    gAtl.Brush().ClearRen();
    //Main.ClearBatch();
    //gAtl.Brush().ClearRen();


    let L=Main.PushSub(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    lig.mDigit=digit;
    L.PushComp(lig);

    let back=Main.PushSub(new CSubject());
    let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_NRM.jpg","Res/teapot/1zflt0j_lig.jpg"]);
    
    back.SetPos(new CVec3(0,-1,0))
    back.SetSca(new CVec3(10,0.01,10));


    let teapot=Main.PushSub(new CSubject());
    let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    let plane=teapot.PushComp(new CShadowPlane());


    teapot=Main.PushSub(new CSubject());
    teapot.SetPos(new CVec3(500,500,0))
    pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    plane=teapot.PushComp(new CShadowPlane());
    
    


}));
CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Forward",()=>{
    Main.Clear();
    //Main.ClearBatch();
    //gAtl.Brush().ClearRen();
    Main.SetRPMgr(forward);

    let L=Main.PushSub(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    lig.mDigit=digit;
    L.PushComp(lig);

    let back=Main.PushSub(new CSubject());
    let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_NRM.jpg","Res/teapot/1zflt0j_lig.jpg"]);
    pt.PushTag(CPaint.eTag.Shadow);
    back.SetSca(new CVec3(10,0.01,10));


    let teapot=Main.PushSub(new CSubject());
    let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    
    pt2.PushTag(CPaint.eTag.Shadow);


    let skybox=Main.PushSub(new CSubject());
    skybox.SetSca(new CVec3(10,10,10));
    let ptcube=skybox.PushComp(new CPaintCube(cubeTex));
    ptcube.Sky(false,false,false,false,false);
    
    // let player=Main.Push(new CSubject());
    // pt=player.PushComp(new CPaint3D("Res/character_woman_3/character_body.zip"));
    // pt.Shadow();
    // pt=player.PushComp(new CPaint3D("Res/character_woman_3/character_face.zip"));
    // pt.Shadow();
    // pt=player.PushComp(new CPaint3D("Res/character_woman_3/character_hair.zip"));
    // pt.Shadow();
    // pt=player.PushComp(new CPaint3D("Res/character_woman_3/character_pants.zip"));
    // pt.Shadow();
    // pt=player.PushComp(new CPaint3D("Res/character_woman_3/character_shoes.zip"));
    // pt.Shadow();
    // let ani=new CAnimation();
    // ani.Push(new CClipMesh(0,1000*60,null,"Take 001"));
    // player.PushComp(new CAniFlow(ani)).mPaintOff=0;
    // player.PushComp(new CAniFlow(ani)).mPaintOff=1;
    // player.PushComp(new CAniFlow(ani)).mPaintOff=2;
    // player.PushComp(new CAniFlow(ani)).mPaintOff=3;
    // player.PushComp(new CAniFlow(ani)).mPaintOff=4;
    
    // player.SetPos(new CVec3(200,0,0));
    

}));
CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Deferred",()=>{

}));

CModal.PushTitleBar(new CModalTitleBar("Deferred","DeferredSingle(HafeLambert+Phong)/Parallax",()=>{
    Main.Clear();
    Main.ClearBatch();
    gAtl.Brush().ClearRen();
    Main.SetRPMgr(DeferredSingle);

    let L=Main.PushSub(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0,100);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    lig.mDigit=digit;
    L.PushComp(lig);

    
    let ani=new CAnimation([new CClipPRS(0,10,[new CVec3(0,100,0),new CVec3(100,100,0),new CVec3(100,100,100),new CVec3(0,100,0)],CClipPRS.eType.Pos)]);    
    L.PushComp(new CAniFlow(ani));

    let back=Main.PushSub(new CSubject());
    let pt=back.PushComp(new CPaint3D("Res/plane/plane.FBX"));
    pt.mAutoLoad.mMipMap=CTexture.eMipmap.None;
    //pt.SetTexture(["Res/teapot/rocks.jpg","Res/teapot/rocks_NM_height.tga","Res/teapot/rocks_spec.tga"]);
    pt.PushTag(CPaint.eTag.Light);
    //pt.PushTag(CPaint.eTag.Shadow);
    pt.PushTag(CPaint.eTag.Parallax);
    pt.PushCShaderAttr(new CShaderAttr("parallaxNormal",0.1));
    back.SetSca(new CVec3(10,0.01,10));


    let teapot=Main.PushSub(new CSubject());
    let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    //pt2.SetMaterial(0.0,0.0,1.0,0.0);
    //teapot.SetSca(100);
    pt2.PushTag(CPaint.eTag.Light);
    pt2.PushTag(CPaint.eTag.Shadow);
    
}));
CModal.PushTitleBar(new CModalTitleBar("Deferred","DeferredMulti(None+CookTorrance(PBR)",()=>{
Main.Clear();
    Main.ClearBatch();
    gAtl.Brush().ClearRen();
    Main.SetRPMgr(DeferredMulti);

    let L=Main.PushSub(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0,100);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    lig.mDigit=digit;
    L.PushComp(lig);


    L=Main.PushSub(new CSubject());
    L.SetPos(new CVec3(500,200,0));
    L.SetSca(0.1);
    let ani=new CAnimation([new CClipPRS(0,10,[new CVec3(0,500,0),new CVec3(500,500,0),new CVec3(500,500,500),new CVec3(0,500,0)],CClipPRS.eType.Pos)]);    
    L.PushComp(new CAniFlow(ani));
    let ptl=L.PushComp(new CPaint3D());
    ptl.SetColorModel(new CColor(1,0.2,0.2,CColor.eModel.RGBAdd));
    
    lig=new CLight();
    lig.SetPoint(1000,500);
    lig.SetColor(new CVec3(3,0.2,0.2));
    L.PushComp(lig);


    let back=Main.PushSub(new CSubject());
    let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(["Res/teapot/1zflt0j.jpg"]);
    pt.PushTag(CPaint.eTag.Light);
    pt.PushTag(CPaint.eTag.Shadow);
    pt.SetMaterial(0.1,0.6);
    back.SetSca(new CVec3(10,0.01,10));


    let teapot=Main.PushSub(new CSubject());
    let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    pt2.PushTag(CPaint.eTag.Light);
    pt2.PushTag(CPaint.eTag.Shadow);


    let skybox=Main.PushSub(new CSubject());
    skybox.SetSca(new CVec3(10,10,10));
    let ptcube=skybox.PushComp(new CPaintCube(cubeTex));
    ptcube.Sky(false,false,false,false,false);
    
}));


// CModal.PushTitleBar(new CModalTitleBar("DevToolModal","ShadowBake",async ()=>{
//     Main.Clear();
//     //Main.ClearBatch();
//     //gAtl.Brush().ClearRen();


//     let L=Main.PushSub(new CSubject());
//     L.SetPos(new CVec3(0,1,0));

//     let lig=new CLight();
//     lig.SetShadow("test",0);
//     lig.SetDirect();
//     lig.SetColor(new CVec3(1,1,1));
//     lig.mShadowDistance=shadowDistance;
//     lig.mDigit=digit;
//     L.PushComp(lig);

//     let back=Main.PushSub(new CSubject());
//     let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
//     pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_NRM.jpg","Res/teapot/1zflt0j_lig.jpg"]);
//     pt.Shadow();
    
//     back.SetSca(new CVec3(10,0.01,10));


//     let teapot=Main.PushSub(new CSubject());
//     let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
//     pt2.Shadow();

//     setTimeout(async () => {
//         //Main.SetPause(true);
//         await CShadowBaker.Bake(Main);
//         //Main.SetPause(false);    
//     }, 0);
    

// }));


//CAlert.Info("F3로 개발자 모드로 가서, 왼쪽 상단 메뉴에 여러가지 쉐도우 방식을 테스트 해보세요!");
let mdviewer=new CMDViewer("README.md");

let Help=new CBGAttachButton("DevToolModal",101,new CVec2(320,320));
//gAtl.Frame().Win().HtmlPush(Option_btn);
Help.SetTitleText("Help");
Help.SetContent(await CUtilWeb.MDReader("README.md"));

























