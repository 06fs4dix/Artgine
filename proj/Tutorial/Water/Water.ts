//Version
const version='mjcwa2up_33';
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
gPF.mCanvas = "";
gPF.mWASM = false;
gPF.mServer = 'local';
gPF.mGitHub = true;

import {CAtelier} from "https://06fs4dix.github.io/Artgine/artgine/app/CAtelier.js";

import {CPlugin} from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
CPlugin.PushPath('Water','https://06fs4dix.github.io/Artgine/plugin/Water/');
import "https://06fs4dix.github.io/Artgine/plugin/Water/Water.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint

import {CObject} from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js"
import {CWater} from "https://06fs4dix.github.io/Artgine/plugin/Water/Water.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CVec1 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec1.js";
import { CTexture } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CCamCon3DFirstPerson } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CLoaderOption } from "https://06fs4dix.github.io/Artgine/artgine/util/CLoader.js";
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
import { CBGAttachButton } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CDOM } from "https://06fs4dix.github.io/Artgine/artgine/basic/CDOM.js";
import { CFrame } from "https://06fs4dix.github.io/Artgine/artgine/util/CFrame.js";
import { CRPAuto, CRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CRPMgr.js";
import { CCondition } from "https://06fs4dix.github.io/Artgine/artgine/util/CCondition.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CLight } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CLight.js";
import { CPaint3D, CPaintCube } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint3D.js";
import { CPaint } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint.js";
import { CAlpha } from "https://06fs4dix.github.io/Artgine/artgine/render/CAlpha.js";
import { CCanvasPluginRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCanvasPluginRPMgr.js";
var Main=gAtl.NewCanvas("Main");
Main.SetCameraKey("3D");
gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));


Main.ClearBatch();
gAtl.Brush().ClearRen();

let PCF=new CVec1(1.0);
var bias : number = 10;
var normalBias : number = 5;
var bias : number = 5;
var normalBias : number = 0;
var shadowDistance=0.4;
var digit=1;
var shadowRate=0.7;

//========================
let forward=new CRPMgr();
let texKey=forward.PushTex("shadowread.tex",new CTexture());
//let texKey=forward.PushTex("shadowread.tex",new CTexture());
let rp=forward.PushRP(new CRPAuto());
rp.PushAnd(new CCondition("class","==","CPaint3D"));
rp.PushAnd(new CCondition("mTag[water]","==",false));
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
rp.PushAnd(new CCondition("mTag[water]","==",false));
rp.mShaderAttr.push(new CShaderAttr(7,"shadowread.tex"));
//rp.mShaderAttr.push(new CShaderAttr(7,gAtl.Frame().Pal().GetShadowReadTex()));
rp.mShaderAttr.push(new CShaderAttr("shadowOn",new CVec1(7)));
rp.mShader=gAtl.Frame().Pal().Sl3DKey();
Main.PushPlugin(new CCanvasPluginRPMgr(forward))




let L=Main.PushSub(new CSubject());
L.SetPos(new CVec3(0,1,0));

let lig=new CLight();
lig.SetShadow("test",0);
lig.SetDirect();
lig.SetColor(new CVec3(1,1,1));
lig.mShadowDistance=shadowDistance;
lig.mDigit=digit;
L.PushComp(lig);
//let ani=new CAnimation([new CClipPRS(0,10,[new CVec3(0,100,0),new CVec3(100,100,0),new CVec3(100,100,100),new CVec3(0,100,0)],CClipPRS.eType.Pos)]);    
//L.PushComp(new CAniFlow(ani));

// let op=new CLoaderOption();
// op.mWrap=CTexture.eWrap.Repeat;
let back=Main.PushSub(new CSubject());
let pt=back.PushComp(new CPaint3D("Res/plane/plane.FBX"));
pt.mAutoLoad.mMipMap=CTexture.eMipmap.None;
pt.mAutoLoad.mWrap=CTexture.eWrap.Repeat;;
//pt.SetTexCodi(new CVec4(2,2,0,0));
//pt.SetTexture(["Res/teapot/rocks.jpg","Res/teapot/rocks_NM_height.tga","Res/teapot/rocks_spec.tga"]);
// pt.Shadow();
pt.PushTag(CPaint.eTag.Light);
pt.PushTag(CPaint.eTag.Parallax);
pt.PushTag(CPaint.eTag.Shadow);
pt.PushTag(CPaint.eTag.ShadowReadOnly);
pt.PushCShaderAttr(new CShaderAttr("parallaxNormal",0.1));
pt.SetTexCodi(new CVec4(10,10,0,0));
back.SetSca(new CVec3(100,0.01,100));




let box = Main.PushSub(new CSubject());
box.PushComp(new CPaint3D());


// water.SetRot(new CVec3(-Math.PI / 2, 0, 0));
// water.SetSca(new CVec3(100, 100, 100));
// water.SetPos(new CVec3(0, 10, 0));
// water.NormalFlow(new CVec2(1, 0), "Res/Water0.jpg", "Res/Water1.jpg");
// water.Preset(CWater.ePreset.Caribbean);




var skyTexKey=["Res/skybox/right.jpg","Res/skybox/left.jpg","Res/skybox/bottom.jpg","Res/skybox/top.jpg","Res/skybox/front.jpg","Res/skybox/back.jpg"];
var skyTexList=[];
await gAtl.Frame().Load().Exe(skyTexKey);
for(let i=0;i<skyTexKey.length;++i)
{
    let tex=gAtl.Frame().Res().Find(skyTexKey[i]);
    skyTexList.push(tex);
}
let cubeTex=gAtl.Frame().Ren().BuildCubeMap(skyTexList,true,"cube.tex");

let sub=Main.PushSub(new CSubject());
let ptCube = sub.PushComp(new CPaintCube(cubeTex));
ptCube.Sky();



// let teapot=Main.PushSub(new CSubject());
// teapot.SetPos(new CVec3(0,100,0));
// let pt2=teapot.PushComp(new CPaint3D("Res/teapot/teapot.FBX"));
// pt2.PushTag(CPaint.eTag.Light);
// pt2.PushTag(CPaint.eTag.Shadow);






const loaderOpt = new CLoaderOption();
loaderOpt.mWrap = CTexture.eWrap.Repeat;
CFrame.Main().Load().Exe("Res/Water0.jpg", loaderOpt);
CFrame.Main().Load().Exe("Res/Water1.jpg", loaderOpt);


let water = Main.PushSub(new CWater());
water.SetKey("water");
water.SetRot(new CVec3(-Math.PI / 2, 0, 0));
water.SetSca(new CVec3(1000, 1000, 1000));
water.SetPos(new CVec3(0, 10, 0));
//water.Preset(CWater.ePreset.Caribbean);
water.GetPT().SetTexCodi(new CVec4(10,10,0,0));
water.NormalFlow(new CVec2(1, 0), "Res/Water0.jpg", "Res/Water1.jpg");
water.AddReflector();
water.AddRefractor();
water.AddCaustics("Res/Water0.jpg");
//water.AddCaustics("Res/caustics.png");
//water.GetPT().PushTag(CPaint.eTag.Light);

// water.UseWaterTexture("Res/clear-sea-water-512x512.png", 1);
// water.m_paint.SetAlphaModel(new CAlpha(0.8, CAlpha.eModel.Mul));





let Option_btn=new CBGAttachButton("Option",101,new CVec2(320,320));
Option_btn.SetTitleText("Option");
Option_btn.SetContent(`
<div>
    
    <select class="form-select form-select-sm" id='water_sel' onchange="ResetWater()">
        <option value="FakeTexFlow" selected>FakeTexFlow</option>
        <option value="FakeTex">FakeTex</option>
        <option value="RealClear">RealClear</option>
        <option value="RealDeep">RealDeep</option>
        <option value="RealMuddy">RealMuddy</option>
    </select>
    <br>


</div>`);



function ResetWater()
{

    let water_sel=CDOM.IDValue("water_sel");

    //Main.Clear();
    Main.Find("water").Destroy();
    gAtl.Brush().ClearRen();

    if("FakeTexFlow"==water_sel)
    {
        

        let water = Main.PushSub(new CWater());
        water.SetKey("water");
        water.SetRot(new CVec3(-Math.PI / 2, 0, 0));
        water.SetSca(new CVec3(100, 100, 100));
        water.SetPos(new CVec3(0, 10, 0));
        water.SetSca(new CVec3(1000, 1000, 1000));
        water.GetPT().SetTexCodi(new CVec4(15,15,0,0));
        

        water.NormalFlow(new CVec2(1, 0), "Res/Water0.jpg", "Res/Water1.jpg");
        //water.mRefractor.mWaterDeep.z=10000;
        //water.UseDepth();
        //water.GetPT().PushTag(CPaint.eTag.Light);

        water.AddReflector();
        water.AddRefractor("Res/clear-sea-water-512x512.png");
        water.GetPT().SetAlphaModel(new CAlpha(0.8, CAlpha.eModel.Mul));
        water.GetPT().PushTag(CPaint.eTag.Light);
    }
    else if("FakeTex"==water_sel)
    {
        let water = Main.PushSub(new CWater());
        water.SetKey("water");
        water.SetRot(new CVec3(-Math.PI / 2, 0, 0));
        water.SetSca(new CVec3(1000, 1000, 1000));
        water.SetPos(new CVec3(0, 10, 0));
        

        //water.NormalFlow(new CVec2(1, 0),null,null);
        //water.UseDepth();
        //water.GetPT().PushTag(CPaint.eTag.Light);

        water.AddRefractor("Res/clear-sea-water-512x512.png",new CVec2(1,0));
        water.GetPT().SetAlphaModel(new CAlpha(0.8, CAlpha.eModel.Mul));
    }
    else if("RealClear"==water_sel)
    {
        let water = Main.PushSub(new CWater());
        water.SetKey("water");
        water.SetRot(new CVec3(-Math.PI / 2, 0, 0));
        water.SetSca(new CVec3(1000, 1000, 1000));
        water.SetPos(new CVec3(0, 10, 0));
        water.GetPT().SetTexCodi(new CVec4(15,15,0,0));
        

        water.GetPT().PushTag(CPaint.eTag.Light);
        water.AddReflector();
        water.AddRefractor();
        water.SetWaterDeep(1000,4000,null,new CVec3(0.6,0.88,1));
        water.AddCaustics("Res/Water0.jpg",new CVec2(1,0),0.5);
        water.NormalFlow(new CVec2(1, 0), "Res/Water0.jpg", "Res/Water1.jpg");
        //water.GetPT().SetTexCodi(new CVec4(0.1,0.1,0,0));



    }
    else if("RealDeep"==water_sel)
    {
             let water = Main.PushSub(new CWater());
        water.SetKey("water");
        water.SetRot(new CVec3(-Math.PI / 2, 0, 0));
        water.SetSca(new CVec3(1000, 1000, 1000));
        water.SetPos(new CVec3(0, 10, 0));
        
        water.AddRefractor();
        water.SetWaterDeep(50,3000,new CVec3(0.0,0.01,0.1),new CVec3(0.1,0.3,0.6));
        
        

        water.NormalFlow(new CVec2(0.2, 0.2), "Res/Water0.jpg", "Res/Water1.jpg");
        
    }
    else if("RealMuddy"==water_sel)
    {
             let water = Main.PushSub(new CWater());
        water.SetKey("water");
        water.SetRot(new CVec3(-Math.PI / 2, 0, 0));
        water.SetSca(new CVec3(1000, 1000, 1000));
        water.SetPos(new CVec3(0, 10, 0));
        
        water.GetPT().SetTexCodi(new CVec4(10,10,10));
        water.AddRefractor();
        water.SetWaterDeep(10,10000,new CVec3(0.1,0.1,0.01),new CVec3(0.5,0.5,0.1));
        

        water.NormalFlow(new CVec2(5, 1), "Res/Water0.jpg", "Res/Water1.jpg");
        
    }


}
window["ResetWater"]=ResetWater;

































