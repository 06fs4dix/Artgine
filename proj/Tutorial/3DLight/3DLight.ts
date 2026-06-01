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
gPF.mAnti = false;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = false;
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = false;
gPF.mVersion = "mpufvoga_17";

import {CAtelier} from "../../../artgine/app/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json'],"");
var Main = gAtl.Canvas('Main.json');
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint

import {CObject} from "../../../artgine/basic/CObject.js"

import { CCamCon3DFirstPerson, CCamCon3DThirdPerson } from "../../../artgine/util/CCamCon.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";

import { CTexture, CTextureInfo } from "../../../artgine/render/CTexture.js";
import { CRenderPass } from "../../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../../artgine/render/CShaderAttr.js";
import { CVec1 } from "../../../artgine/geometry/CVec1.js";

import { CShadowPlane } from "../../../plugin/ShadowPlane/ShadowPlane.js";
import { CModal, CModalTitleBar } from "../../../artgine/basic/CModal.js";
import { SDF } from "../../../artgine/z_file/SDF.js";

import { CVec4 } from "../../../artgine/geometry/CVec4.js";


import { CBGAttachButton, CMDViewer, CModalFrameView } from "../../../artgine/util/CModalUtil.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";

import { CUtilWeb } from "../../../artgine/util/CUtilWeb.js";


import { CLoaderOption } from "../../../artgine/util/CLoader.js";
import { CRPAuto, CRPMgr } from "../../../artgine/app/canvas/CRPMgr.js";
import { CSurface } from "../../../artgine/app/subject/CSurface.js";
import { CCanvasPluginRPMgr } from "../../../artgine/app/canvas/CCanvasPluginRPMgr.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CPaint3D, CPaintCube } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CPaint } from "../../../artgine/app/component/paint/CPaint.js";
import { CLight } from "../../../artgine/app/component/CLight.js";
import { CColor } from "../../../artgine/render/CColor.js";
import { CCondition } from "../../../artgine/util/CCondition.js";
import { CMat } from "../../../artgine/geometry/CMat.js";
import { CPaint2D } from "../../../artgine/app/component/paint/CPaint2D.js";
import { CFont, CFontOption } from "../../../artgine/util/CFont.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CUpdate } from "../../../artgine/basic/Basic.js";

//====================================================
// 텍스쳐 로딩
//====================================================
const opt=new CLoaderOption();
opt.mFilter=CTexture.eFilter.Linear;
opt.mWrap=CTexture.eWrap.Repeat;
await gAtl.Frame().Load().Exe("Res/teapot/1zflt0j.jpg",opt);
await gAtl.Frame().Load().Exe("Res/teapot/1zflt0j_NRM.jpg",opt);
await gAtl.Frame().Load().Exe("Res/teapot/1zflt0j_lig.jpg",opt);

const skyTexKey=["Res/skybox/right.jpg","Res/skybox/left.jpg","Res/skybox/bottom.jpg","Res/skybox/top.jpg","Res/skybox/front.jpg","Res/skybox/back.jpg"];
const skyTexList=[];
await gAtl.Frame().Load().Exe(skyTexKey);
for(let i=0;i<skyTexKey.length;++i)
{
    skyTexList.push(gAtl.Frame().Res().Find(skyTexKey[i]));
}
const cubeTexKey=gAtl.Frame().Ren().BuildCubeMap(skyTexList,true,"cube.tex");

//====================================================
// 옵션
//====================================================

let PCF : CVec1 = new CVec1(1.0);
let bias : CVec1 = new CVec1(10);
let normalBias : CVec1 = new CVec1(5);
let shadowRate : CVec1 = new CVec1(0.0);

let shadowDistance = 0.4;

const shadowShaderAttrs = [
    new CShaderAttr("PCF", PCF),
    new CShaderAttr("bias", bias),
    new CShaderAttr("normalBias", normalBias),
    new CShaderAttr("shadowRate", shadowRate),
];

//====================================================
// Base
//====================================================
let rp : CRPAuto;
let srp : CRenderPass;

//====================================================
// DeferredSingle
//====================================================
const DeferredSingle=new CRPMgr();

// gBuf - Position
const gBufPosTex=new CTexture();
gBufPosTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA32F,1)]);
const gBufPosTexKey=DeferredSingle.PushTex("gBufPos.tex",gBufPosTex);

rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Position));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mTag.add("gBuf");
rp.mRenderTarget=gBufPosTexKey;

// gBuf - Normal
const gBufNorTex=new CTexture();
gBufNorTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA32F,1)]);
const gBufNorTexKey=DeferredSingle.PushTex("gBufNor.tex",gBufNorTex);

rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Normal));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mTag.add("gBuf");
rp.mRenderTarget=gBufNorTexKey;

// gBuf - Albedo
const gBufAlbTex=new CTexture();
gBufNorTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
const gBufAlbTexKey=DeferredSingle.PushTex("gBufAlb.tex",gBufAlbTex);

rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Albedo));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mTag.add("gBuf");
rp.mRenderTarget=gBufAlbTexKey;

// gBuf - SPE
const gBufSPETex=new CTexture();
gBufNorTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
const gBufSPE=DeferredSingle.PushTex("gBufSPE.tex",gBufSPETex);

rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.SpeculerPowEmissive));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mTag.add("gBuf");
rp.mRenderTarget=gBufSPE;

// ShadowRead
let ShadowReadTexKey=DeferredSingle.PushTex(gAtl.Frame().Pal().GetShadowReadTex(),new CTexture());

rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.BackGround;
rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, gAtl.Frame().Pal().GetShadowWriteTex()));
for(const attr of shadowShaderAttrs) {
    rp.mShaderAttr.push(attr);
}
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=ShadowReadTexKey;
rp.mTag.add("shadowRead");

// Surface - Diffuse LIGHT
let sufLig0=DeferredSingle.PushSuf(new CSurface());
srp=sufLig0.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("light");
srp.mTag.add("shadow");
srp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead,gAtl.Frame().Pal().GetShadowReadTex()));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(1)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufAlbTexKey));
srp.mShaderAttr.push(new CShaderAttr(1,gBufPosTexKey));
srp.mShaderAttr.push(new CShaderAttr(2,gBufNorTexKey));
srp.mShaderAttr.push(new CShaderAttr(3,gBufSPE));
srp.mShaderAttr.push(new CShaderAttr("renType",0));

// Surface - Specular LIGHT
let sufLig1=DeferredSingle.PushSuf(new CSurface());
srp=sufLig1.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("light");
srp.mTag.add("shadow");
srp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead,gAtl.Frame().Pal().GetShadowReadTex()));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(1)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufAlbTexKey));
srp.mShaderAttr.push(new CShaderAttr(1,gBufPosTexKey));
srp.mShaderAttr.push(new CShaderAttr(2,gBufNorTexKey));
srp.mShaderAttr.push(new CShaderAttr(3,gBufSPE));
srp.mShaderAttr.push(new CShaderAttr("renType",1));

// Cubemap - Sky
rp=DeferredSingle.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaintCube"));
rp.mPriority=CRenderPass.ePriority.Surface;
rp.mShader=gAtl.Frame().Pal().SlCubeKey();
rp.mCullFace=CRenderPass.eCull.None;
rp.mCullFrustum=false;
rp.mRenderTarget=DeferredSingle.PushTex("skyboxTex.tex",new CTexture());
rp.mBlitRead=gBufPosTexKey;
rp.mBlitType=1;//depth

// Surface - Blend
let sufLast=DeferredSingle.PushSuf(new CSurface());
sufLast.SetUseRT(false);    // to screen
srp=sufLast.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("blend");
srp.mShaderAttr.push(new CShaderAttr(0,sufLig0.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr(1,sufLig1.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr(2,rp.mRenderTarget));
srp.mShaderAttr.push(new CShaderAttr("TexOffBlendFactor",new CMat([
    1,CRenderPass.eBlend.LinearDodge,1,0,
    2,CRenderPass.eBlend.LinearDodge,1,0
])));

//====================================================
// DeferredMulti
//====================================================
const DeferredMulti=new CRPMgr();

// gBuf
const gBufMultiTex=new CTexture();
gBufMultiTex.PushInfo([
    new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1),
    new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA32F,1),
    new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA32F,1),
    new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)
]);
const gBufMultiTexKey=DeferredMulti.PushTex("gBufMulti.tex",gBufMultiTex);

rp=DeferredMulti.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.Normal;
rp.mShaderAttr.push(new CShaderAttr("outputType",SDF.eGBuf.Position));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gBufMultiTexKey;
rp.mTag.add("gBufMulti");

// camera setting
const camDirList = [
    new CVec3(1, 0, 0),new CVec3(-1, 0, 0),new CVec3(0, -1, 0),
    new CVec3(0, 1, 0),new CVec3(0, 0, 1),new CVec3(0, 0, -1)
];
for(let i = 0; i < 6; i++) {
    gAtl.Brush().GetCamera("noMove");

    const camDir = camDirList[i];
    const eye = new CVec3();
    const look = CMath.V3AddV3(eye, camDir);

    // envmap camera
    const envmapCam = gAtl.Brush().GetCamera("envmap"+i);
    if(envmapCam.Init(eye, look))
    {
        envmapCam.SetFov(Math.PI * 0.5);   // 90도
        envmapCam.SetSize(128, 128);
        envmapCam.mRCS = false;
        envmapCam.ResetPerspective();
    }
}

// Irradiance
const irradianceTex=new CTexture();
irradianceTex.SetSize(32, 32);
irradianceTex.PushInfo([new CTextureInfo(CTexture.eTarget.Cube,CTexture.eFormat.RGBA32F,1)]);
irradianceTex.SetFilter(CTexture.eFilter.Linear);
irradianceTex.SetAutoResize(false);
gAtl.Frame().Ren().BuildTexture(irradianceTex);
const irradianceTexKey=DeferredMulti.PushTex("irradiance.tex",irradianceTex);
for(let i = 0; i < 6; i++) {
    rp=DeferredMulti.PushRP(new CRPAuto());
    rp.PushAnd(new CCondition("class","==","CPaintCube"));
    rp.mPriority=CRenderPass.ePriority.BackGround;
    rp.mShader=gAtl.Frame().Pal().SlCube().GetShader("Artgine/Shader/CubeIrradiance").Key();
    rp.mRenderTarget=irradianceTexKey;
    rp.mRenderTargetUse.add(i);
    rp.mCamera="envmap"+i;
    rp.mCullFace=CRenderPass.eCull.None;
    rp.mCullFrustum=false;
    rp.mCycle = 100000000;  // 한 번만 랜더링
}

// Prefilter cubemap
gAtl.Frame().Ren().BuildRenderTarget(
    [new CTextureInfo(CTexture.eTarget.Cube,CTexture.eFormat.RGBA32F,1)],
    new CVec2(128, 128),
    "prefilter.tex"
);
const prefilterTex=gAtl.Frame().Res().Find("prefilter.tex");
prefilterTex.SetAutoResize(false);
prefilterTex.SetFilter(CTexture.eFilter.Linear);
prefilterTex.SetMipMap(CTexture.eMipmap.EnvFilter);
const prefilterTexKey=DeferredMulti.PushTex("prefilter.tex",prefilterTex);
for(let i = 0; i < 6; i++) {
    rp=DeferredMulti.PushRP(new CRPAuto());
    rp.PushAnd(new CCondition("class","==","CPaintCube"));
    rp.mPriority=CRenderPass.ePriority.BackGround;
    rp.mShader=gAtl.Frame().Pal().SlCubeKey();
    rp.mRenderTarget=prefilterTexKey;
    rp.mRenderTargetUse.add(i);
    rp.mCamera="envmap"+i;
    rp.mCullFace=CRenderPass.eCull.None;
    rp.mCullFrustum=false;
    rp.mCycle = 100000000;  // 한 번만 랜더링
}

// brdf
const brdfTex=new CTexture();
brdfTex.SetSize(512, 512);
brdfTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA32F,1)]);
const brdfTexKey=DeferredMulti.PushTex("brdf.tex",brdfTex);
brdfTex.SetAutoResize(false);

const brdfSuf=DeferredMulti.PushSuf(new CSurface());
srp=brdfSuf.GetRP();
srp.mPriority=CRenderPass.ePriority.BackGround;
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("brdf");
srp.mCamera="noMove";
srp.mRenderTarget=brdfTexKey;
srp.mCycle=1000000000;  // 한번만 랜더링

// ShadowRead
ShadowReadTexKey=DeferredMulti.PushTex(gAtl.Frame().Pal().GetShadowReadTex(),new CTexture());

rp=DeferredMulti.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.BackGround;
rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite,gAtl.Frame().Pal().GetShadowWriteTex()));
for(const attr of shadowShaderAttrs) {
    rp.mShaderAttr.push(attr);
}
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=ShadowReadTexKey;
rp.mTag.add("shadowRead");

// Surface Cubemaps
const cubemapShaderAttr0 = new CShaderAttr(0,irradianceTexKey);
const cubemapShaderAttr1 = new CShaderAttr(1,prefilterTexKey);
const envApproxShaderAttr = new CShaderAttr("EnvmapApprox",1);

// Surface - Diffuse Light
sufLig0=DeferredMulti.PushSuf(new CSurface());
sufLig0.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F, 1)]);
srp=sufLig0.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("light");
srp.mTag.add("shadow");
srp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead,gAtl.Frame().Pal().GetShadowReadTex()));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(1)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufMultiTexKey));//순차적으로 등록된다
srp.mShaderAttr.push(new CShaderAttr(9,brdfTexKey));//brdf 텍스쳐
srp.mShaderAttr.push(envApproxShaderAttr);
srp.mShaderAttr.push(new CShaderAttr("renType",0));

srp.mShaderAttr.push(new CShaderAttr("ligStep0",SDF.eLightStep0.None));
srp.mShaderAttr.push(new CShaderAttr("ligStep1",SDF.eLightStep1.CookTorrance));

srp.mShaderAttr.push(cubemapShaderAttr0);//큐브맵
srp.mShaderAttr.push(cubemapShaderAttr1);//큐브맵
srp.mShaderAttr.push(new CShaderAttr("envCube",SDF.eEnvCube.Texture));

// Surface - Specular Light
sufLig1=DeferredMulti.PushSuf(new CSurface());
sufLig1.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F, 1)]);
srp=sufLig1.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("light");
srp.mTag.add("shadow");
srp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead,gAtl.Frame().Pal().GetShadowReadTex()));
srp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(1)));
srp.mShaderAttr.push(new CShaderAttr(0,gBufMultiTexKey));//순차적으로 등록된다
srp.mShaderAttr.push(new CShaderAttr(9,brdfTexKey));//brdf 텍스쳐
srp.mShaderAttr.push(envApproxShaderAttr);
srp.mShaderAttr.push(new CShaderAttr("renType",1));

srp.mShaderAttr.push(new CShaderAttr("ligStep0",SDF.eLightStep0.None));
srp.mShaderAttr.push(new CShaderAttr("ligStep1",SDF.eLightStep1.CookTorrance));

srp.mShaderAttr.push(cubemapShaderAttr0);//큐브맵
srp.mShaderAttr.push(cubemapShaderAttr1);//큐브맵
srp.mShaderAttr.push(new CShaderAttr("envCube",SDF.eEnvCube.Texture));

// Cubemap - Sky
rp=DeferredMulti.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaintCube"));
rp.mPriority=CRenderPass.ePriority.Surface;
rp.mShader=gAtl.Frame().Pal().SlCubeKey();
rp.mCullFace=CRenderPass.eCull.None;
rp.mCullFrustum=false;
rp.mRenderTarget=DeferredMulti.PushTex("skyboxTex.tex",new CTexture());
rp.mBlitRead=gBufMultiTexKey;
rp.mBlitType=1;//depth

// Surface - Blend
sufLast=DeferredMulti.PushSuf(new CSurface());
sufLast.SetUseRT(false);
srp=sufLast.GetRP();
srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("blend");
srp.mShaderAttr.push(new CShaderAttr(0,sufLig0.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr(1,sufLig1.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr(2,rp.mRenderTarget));
srp.mShaderAttr.push(new CShaderAttr("TexOffBlendFactor",new CMat([
    1,CRenderPass.eBlend.LinearDodge,1,0,
    2,CRenderPass.eBlend.LinearDodge,1,0
])));

//=============================================
// forward
//=============================================
const forward=new CRPMgr();

// ShadowRead
ShadowReadTexKey=forward.PushTex(gAtl.Frame().Pal().GetShadowReadTex(),new CTexture());

rp=forward.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mPriority=CRenderPass.ePriority.BackGround+1;
rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite,gAtl.Frame().Pal().GetShadowWriteTex()));
for(const attr of shadowShaderAttrs) {
    rp.mShaderAttr.push(attr);
}
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
rp.mRenderTarget=gAtl.Frame().Pal().GetShadowReadTex();
rp.mTag.add("shadowRead");

// Light
rp=forward.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead,gAtl.Frame().Pal().GetShadowReadTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowOn", 1));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();

//=============================================

//=============================================
let rpPlug=new CCanvasPluginRPMgr(null);
Main.PushPlugin(rpPlug);

//=============================================
// 카메라 / 오브젝트 세팅
//=============================================
let camcon=new CCamCon3DThirdPerson(gAtl.Frame().Input());
gAtl.Brush().GetCam3D().SetCamCon(camcon);
camcon.SetPos(new CVec3());

let back=Main.PushSub(new CSubject());
let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
pt.SetTexture(["Res/teapot/1zflt0j.jpg","Res/teapot/1zflt0j_NRM.jpg","Res/teapot/1zflt0j_lig.jpg"]);
pt.PushTag(CPaint.eTag.Shadow);
//pt.AddDecal(new CVec4(1,0,0,1),new CVec3(),new CVec3(),new CVec3(100,100,100));
back.SetSca(new CVec3(10,0.01,10));

let teapot=Main.PushSub(new CSubject());
let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
pt2.PushTag(CPaint.eTag.Shadow);

teapot=Main.PushSub(new CSubject());
teapot.SetPos(new CVec3(500,0,0));
pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
pt2.PushTag(CPaint.eTag.Shadow);

//=============================================
// plane shadow
//=============================================
CModal.PushTitleBar(new CModalTitleBar("DevToolModal","ShadowPlane",()=>{
    Main.Clear();
    rpPlug.SetRPMgr(null);
    gAtl.Brush().ClearRen();

    let L=Main.PushSub(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
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

//=============================================
// forward
//=============================================
CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Forward",()=>{
    Main.Clear();
    //Main.ClearBatch();
    //gAtl.Brush().ClearRen();
    rpPlug.SetRPMgr(forward);

    let L=Main.PushSub(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
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
    let ptcube=skybox.PushComp(new CPaintCube(cubeTexKey));
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

//=============================================
// deferred - halfLambert + phong
//=============================================
CModal.PushTitleBar(new CModalTitleBar("Deferred","DeferredSingle(HafeLambert+Phong)/Parallax",()=>{
    Main.Clear();
    Main.ClearBatch();
    gAtl.Brush().ClearRen();
    rpPlug.SetRPMgr(DeferredSingle);

    let L=Main.PushSub(new CSubject());
    L.SetPos(new CVec3(0,1,0));

    let lig=new CLight();
    lig.SetShadow("test",0,100);
    lig.SetDirect();
    lig.SetColor(new CVec3(1,1,1));
    lig.mShadowDistance=shadowDistance;
    L.PushComp(lig);

    
    // let ani=new CAnimation([new CClipPRS(0,10,[new CVec3(0,100,0),new CVec3(100,100,0),new CVec3(100,100,100),new CVec3(0,100,0)],CClipPRS.eType.Pos)]);    
    // L.PushComp(new CAniFlow(ani));

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

    let skybox=Main.PushSub(new CSubject());
    skybox.SetSca(new CVec3(10,10,10));
    let ptcube=skybox.PushComp(new CPaintCube(cubeTexKey));
    ptcube.Sky(false,false,false,false,false);
    
}));



//=============================================
// deferred - halfLambert + phong
//=============================================
CModal.PushTitleBar(new CModalTitleBar("Deferred","DeferredMulti(None+CookTorrance(PBR)",()=>{
    Main.Clear();
    Main.ClearBatch();
    gAtl.Brush().ClearRen();
    rpPlug.SetRPMgr(DeferredMulti);

    for(let i = 0; i < 1; i++) {
        let L=Main.PushSub(new CSubject());
        L.SetKey("lig");

        let lig=new CLight();
        lig.SetShadow("test",0,100);
        lig.SetDirect();
        lig.SetColor(new CVec3(1,1,1));
        lig.mShadowDistance=shadowDistance;
        L.PushComp(lig);

        switch(i)
        {
            case 0:
                L.SetPos(new CVec3(-0.496,0.592,-0.629));
                break;
            case 1:
                L.SetPos(new CVec3(0,1,1));
                break;
            case 2:
                L.SetPos(new CVec3(-1,1,0));
                break;
            case 3:
                L.SetPos(new CVec3(0,1,-1));
                break;
        }
    }

    let back=Main.PushSub(new CSubject());
    let pt=back.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(["Res/teapot/1zflt0j.jpg"]);
    pt.PushTag(CPaint.eTag.Light);
    pt.PushTag(CPaint.eTag.Shadow);
    pt.SetMaterial(0.1,0.6);
    back.SetSca(new CVec3(10,0.01,10));

    for(let x=-1;x<=1;x+=1)
    for(let z=-1;z<=1;z+=1)
    {
        let teapot=Main.PushSub(new CSubject());
        let pt2=teapot.PushComp(new CPaint3D(gAtl.Frame().Pal().GetSphereMesh()));
        pt2.SetColorModel(new CColor(1,0,0,CColor.eModel.RGBAdd));
        //pt2.SetTexture(["Res/teapot/1zflt0j.jpg"]);
        pt2.PushTag(CPaint.eTag.Light);
        pt2.PushTag(CPaint.eTag.Shadow);
        pt2.SetMaterial((x+1)*0.5,(z+1)*0.5);
        teapot.SetPos(new CVec3(x*500,100,z*500));
    }

    // teapot=Main.PushSub(new CSubject());
    // teapot.SetPos(new CVec3(500,0,0))
    // pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    // pt2.SetMaterial(0.1,0.9);
    // pt2.PushTag(CPaint.eTag.Light);
    // pt2.PushTag(CPaint.eTag.Shadow);

    // teapot=Main.PushSub(new CSubject());
    // teapot.SetPos(new CVec3(-500,0,0))
    // pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    // pt2.SetMaterial(0.1,0.1);
    // pt2.PushTag(CPaint.eTag.Light);
    // pt2.PushTag(CPaint.eTag.Shadow);

    // teapot=Main.PushSub(new CSubject());
    // teapot.SetPos(new CVec3(0,0,500))
    // pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    // pt2.SetMaterial(0.9,0.1);
    // pt2.PushTag(CPaint.eTag.Light);
    // pt2.PushTag(CPaint.eTag.Shadow);

    // teapot=Main.PushSub(new CSubject());
    // teapot.SetPos(new CVec3(0,0,-500))
    // pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
    // pt2.SetMaterial(0.9,0.9);
    // pt2.PushTag(CPaint.eTag.Light);
    // pt2.PushTag(CPaint.eTag.Shadow);


    let skybox=Main.PushSub(new CSubject());
    skybox.SetSca(new CVec3(10,10,10));
    let ptcube=skybox.PushComp(new CPaintCube(cubeTexKey));
    ptcube.Sky(false,false,false,false,false);
}));

CModal.PushTitleBar(new CModalTitleBar("DevToolModal","DeferredOption",()=>{

}));

//=============================================
// deferred - 옵션
//=============================================
CModal.PushTitleBar(new CModalTitleBar("DeferredOption","Approx Envmap",()=>{
    envApproxShaderAttr.mData = 0;
    Main.ClearBatch();
    gAtl.Brush().ClearRen();
    rpPlug.SetRPMgr(DeferredMulti);
}));
CModal.PushTitleBar(new CModalTitleBar("DeferredOption","Prefilterd Envmap",()=>{
    envApproxShaderAttr.mData = 1;
    Main.ClearBatch();
    gAtl.Brush().ClearRen();
    rpPlug.SetRPMgr(DeferredMulti);
}));
let firstLightPos = new CVec3(0, 1, 0);
const moveLightEvent = new CEvent(() => {
    const lig = Main.Find("lig");
    if(lig) {
        const timer = Date.now() * 0.00025;
        lig.SetPos(new CVec3(
            Math.sin(timer * 7) * 3,
            Math.cos(timer * 5) * 4,
            Math.cos(timer * 3) * 3
        ));
    }
});
CModal.PushTitleBar(new CModalTitleBar("DeferredOption","Const Light",()=>{
    const lig = Main.Find("lig");
    lig?.SetPos(firstLightPos);
    gAtl.Frame().RemoveEvent(moveLightEvent);
}));
CModal.PushTitleBar(new CModalTitleBar("DeferredOption","Moving Light",()=>{
    const lig = Main.Find("lig");
    if(lig) firstLightPos = lig.GetPos();
    gAtl.Frame().PushEvent(CEvent.eType.Update, moveLightEvent);
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




new CModalFrameView();


















































































