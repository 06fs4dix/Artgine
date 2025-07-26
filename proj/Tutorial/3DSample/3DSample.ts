//Version
const version='2025-07-17 10:26:15';
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
gPF.mAnti = false;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = false;
gPF.mLocal = true;

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPluging} from "../../../artgine/util/CPluging.js";
CPluging.PushPath('ShadowBake','../../../plugin/ShadowBake/');
import "../../../plugin/ShadowBake/ShadowBake.js"
CPluging.PushPath('ShadowPlane','../../../plugin/ShadowPlane/');
import "../../../plugin/ShadowPlane/ShadowPlane.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json']);
var Main = gAtl.Canvas('Main.json');

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CCamCon3DThirdPerson } from "../../../artgine/util/CCamCon.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CRPAuto, CRPMgr } from "../../../artgine/canvas/CRPMgr.js";
import { CTexture, CTextureInfo } from "../../../artgine/render/CTexture.js";
import { CRenderPass } from "../../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../../artgine/render/CShaderAttr.js";
import { CVec1 } from "../../../artgine/geometry/CVec1.js";
import { CLight } from "../../../artgine/canvas/component/CLight.js";
import { CShadowPlane } from "../../../plugin/ShadowPlane/ShadowPlane.js";
import { CModal, CModalTitleBar } from "../../../artgine/basic/CModal.js";
import { SDF } from "../../../artgine/z_file/SDF.js";
import { CSurface } from "../../../artgine/canvas/subject/CSurface.js";
import { CShadowBaker } from "../../../plugin/ShadowBake/ShadowBake.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CAnimation, CClip, CClipMesh } from "../../../artgine/canvas/component/CAnimation.js";
import { CAniFlow } from "../../../artgine/canvas/component/CAniFlow.js";



let PCF=new CVec1(1.0);
var bias : number = 10;
var normalBias : number = 5;
var shadowDistance=0.4;
var digit=1;
var shadowRate=0.7;
//====================================================
let DeferredSingle=new CRPMgr();
let gBufPosTex=new CTexture();
gBufPosTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA32F,1)]);
let gBufPos=DeferredSingle.PushTex("gBufPos.tex",gBufPosTex);
let rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAutoPaint(CPaint3D);
rp.mPriority=CRenderPass.ePriority.Normal+0;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Position));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufPos;
rp.mTag="gBuf";



let gBufNorTex=new CTexture();
gBufNorTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
let gBufNor=DeferredSingle.PushTex("gBufNor.tex",gBufNorTex);
rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAutoPaint(CPaint3D);
rp.mPriority=CRenderPass.ePriority.Normal+1;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Normal));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufNor;
rp.mTag="gBuf";


let gBufAlbTex=new CTexture();
gBufNorTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
let gBufAlb=DeferredSingle.PushTex("gBufAlb.tex",gBufAlbTex);
rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAutoPaint(CPaint3D);
rp.mPriority=CRenderPass.ePriority.Normal+2;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Albedo));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufAlb;
rp.mTag="gBuf";


let gBufSPETex=new CTexture();
gBufNorTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
let gBufSPE=DeferredSingle.PushTex("gBufSPE.tex",gBufSPETex);
rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAutoPaint(CPaint3D);
rp.mPriority=CRenderPass.ePriority.Normal+3;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.SpeculerPowEmissive));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufSPE;
rp.mTag="gBuf";

let ShadowKey=DeferredSingle.PushTex("shadowread.tex",new CTexture());
rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAutoPaint(CPaint3D);
rp.mPriority=CRenderPass.ePriority.BackGround+1;
rp.mShaderAttr.push(new CShaderAttr(0,gAtl.Frame().Pal().GetShadowArrTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowRate",shadowRate));
rp.mShaderAttr.push(new CShaderAttr("PCF",PCF));
rp.mShaderAttr.push(new CShaderAttr("bias",bias));
rp.mShaderAttr.push(new CShaderAttr("normalBias",normalBias));
//rp.mShaderAttr.push(new CShaderAttr("dotCac",new CVec1(0.0)));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=ShadowKey;
rp.mTag="shadowRead";

let sufLig0=DeferredSingle.PushSuf(new CSurface());
let srp=sufLig0.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag="light";
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
srp.mTag="light";
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
srp.mTag="blend";
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
rp.PushAutoPaint(CPaint3D);
rp.mPriority=CRenderPass.ePriority.Normal+0;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Position));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufMulti;
rp.mTag="gBufMulti";


ShadowKey=DeferredMulti.PushTex("shadowread.tex",new CTexture());
rp=DeferredMulti.PushRP(new CRPAuto());
rp.PushAutoPaint(CPaint3D);
rp.mPriority=CRenderPass.ePriority.BackGround+1;
rp.mShaderAttr.push(new CShaderAttr(0,gAtl.Frame().Pal().GetShadowArrTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowRate",shadowRate));
rp.mShaderAttr.push(new CShaderAttr("PCF",PCF));
rp.mShaderAttr.push(new CShaderAttr("bias",bias));
rp.mShaderAttr.push(new CShaderAttr("normalBias",normalBias));
//rp.mShaderAttr.push(new CShaderAttr("dotCac",new CVec1(0.0)));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=ShadowKey;
rp.mTag="shadowRead";

sufLig0=DeferredMulti.PushSuf(new CSurface());
srp=sufLig0.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag="light";
srp.mShaderAttr.push(new CShaderAttr(7,"shadowread.tex"));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(7)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufMulti));//순차적으로 등록된다
srp.mShaderAttr.push(new CShaderAttr("renType",0));



sufLig1=DeferredMulti.PushSuf(new CSurface());
srp=sufLig1.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag="light";
srp.mShaderAttr.push(new CShaderAttr(7,"shadowread.tex"));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(7)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufMulti));//순차적으로 등록된다
srp.mShaderAttr.push(new CShaderAttr("renType",1));

sufLast=DeferredMulti.PushSuf(new CSurface());
srp=sufLast.GetRP();
sufLast.SetUseRT(false);
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag="blend";
srp.mShaderAttr.push(new CShaderAttr(0,sufLig0.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr(1,sufLig1.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr("blend", 1, CRenderPass.eBlend.LinearDodge));
srp.mShaderAttr.push(new CShaderAttr("opacity",1,1));

//=============================================
let forward=new CRPMgr();
let texKey=forward.PushTex("shadowread.tex",new CTexture());
rp=forward.PushRP(new CRPAuto());
rp.PushAutoPaint(CPaint3D);
rp.mPriority=CRenderPass.ePriority.BackGround+1;
rp.mShaderAttr.push(new CShaderAttr(0,gAtl.Frame().Pal().GetShadowArrTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowRate",shadowRate));
rp.mShaderAttr.push(new CShaderAttr("PCF",PCF));
rp.mShaderAttr.push(new CShaderAttr("bias",bias));
rp.mShaderAttr.push(new CShaderAttr("normalBias",normalBias));
//rp.mShaderAttr.push(new CShaderAttr("dotCac",new CVec1(0.0)));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget="shadowread.tex";
rp.mTag="shadowRead";

rp=forward.PushRP(new CRPAuto());
rp.PushAutoPaint(CPaint3D);
rp.mShaderAttr.push(new CShaderAttr(7,"shadowread.tex"));
rp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(7)));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
//=============================================



let camcon=new CCamCon3DThirdPerson(gAtl.Frame().Input());
gAtl.Brush().GetCam3D().SetCamCon(camcon);
camcon.SetPos(new CVec3());

let back=Main.Push(new CSubject());
let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_NRM.jpg","Res/teapot/1zflt0j_lig.jpg"]);
pt.Shadow();
back.SetSca(new CVec3(10,0.01,10));


let teapot=Main.Push(new CSubject());
let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
pt2.Shadow();


//pt.ShadowRead(7);





CModal.PushTitleBar(new CModalTitleBar("DevToolModal","ShadowPlane",()=>{
    Main.Clear();
    //Main.ClearBatch();
    //gAtl.Brush().ClearRen();


    let L=Main.Push(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    lig.mDigit=digit;
    L.PushComp(lig);

    let back=Main.Push(new CSubject());
    let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_NRM.jpg","Res/teapot/1zflt0j_lig.jpg"]);
    
    back.SetSca(new CVec3(10,0.01,10));


    let teapot=Main.Push(new CSubject());
    let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    let plane=teapot.PushComp(new CShadowPlane());
    //plane.m
    


}));
CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Forward",()=>{
    Main.Clear();
    //Main.ClearBatch();
    //gAtl.Brush().ClearRen();
    Main.SetRPMgr(forward);

    let L=Main.Push(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    lig.mDigit=digit;
    L.PushComp(lig);

    let back=Main.Push(new CSubject());
    let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_NRM.jpg","Res/teapot/1zflt0j_lig.jpg"]);
    pt.Shadow();
    back.SetSca(new CVec3(10,0.01,10));


    let teapot=Main.Push(new CSubject());
    let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    pt2.Shadow();


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

CModal.PushTitleBar(new CModalTitleBar("Deferred","DeferredSingle",()=>{
    Main.Clear();
    Main.ClearBatch();
    gAtl.Brush().ClearRen();
    Main.SetRPMgr(DeferredSingle);

    let L=Main.Push(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    lig.mDigit=digit;
    L.PushComp(lig);

    let back=Main.Push(new CSubject());
    let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_lig.jpg","Res/teapot/1zflt0j_NRM.jpg"]);
    pt.Shadow();
    pt.Light();
    back.SetSca(new CVec3(10,0.01,10));


    let teapot=Main.Push(new CSubject());
    let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    //pt2.SetMaterial(0.0,0.0,1.0,0.0);
    //teapot.SetSca(100);
    pt2.Light();
    pt2.Shadow();
}));
CModal.PushTitleBar(new CModalTitleBar("Deferred","DeferredMulti",()=>{
Main.Clear();
    Main.ClearBatch();
    gAtl.Brush().ClearRen();
    Main.SetRPMgr(DeferredMulti);

    let L=Main.Push(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    lig.mDigit=digit;
    L.PushComp(lig);

    let back=Main.Push(new CSubject());
    let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_lig.jpg","Res/teapot/1zflt0j_NRM.jpg"]);
    pt.Shadow();
    pt.Light();
    back.SetSca(new CVec3(10,0.01,10));


    let teapot=Main.Push(new CSubject());
    let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    pt2.Light();
    pt2.Shadow();
}));


CModal.PushTitleBar(new CModalTitleBar("DevToolModal","ShadowBake",async ()=>{
    Main.Clear();
    //Main.ClearBatch();
    //gAtl.Brush().ClearRen();


    let L=Main.Push(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    lig.mDigit=digit;
    L.PushComp(lig);

    // let back=Main.Push(new CSubject());
    // let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    // pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_NRM.jpg","Res/teapot/1zflt0j_lig.jpg"]);
    // pt.Shadow();
    
    // back.SetSca(new CVec3(10,0.01,10));


    let teapot=Main.Push(new CSubject());
    let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    pt2.Shadow();

    setTimeout(async () => {
        //Main.SetPause(true);
        await CShadowBaker.Bake(Main);
        //Main.SetPause(false);    
    }, 0);
    

}));