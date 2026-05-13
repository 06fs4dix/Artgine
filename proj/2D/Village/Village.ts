//Version
const version='mp4216w1_23';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js"

//Class
import {CClass} from "https://06fs4dix.github.io/Artgine/artgine/basic/CClass.js";
import { CNPC } from "./CNPC.js";
CClass.Push(CNPC);
import { CUser } from "./CUser.js";
CClass.Push(CUser);
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

import {CAtelier} from "https://06fs4dix.github.io/Artgine/artgine/app/CAtelier.js";

import {CPlugin} from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
CPlugin.PushPath('Inventory','https://06fs4dix.github.io/Artgine/plugin/Inventory/');
import "https://06fs4dix.github.io/Artgine/plugin/Inventory/Inventory.js"
CPlugin.PushPath('ShadowPlane','https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/');
import "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js"
CPlugin.PushPath('Water','https://06fs4dix.github.io/Artgine/plugin/Water/');
import "https://06fs4dix.github.io/Artgine/plugin/Water/Water.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json','Real.json'],"");
var Main = gAtl.Canvas('Main.json');
var Real = gAtl.Canvas('Real.json');
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
let comcon=gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFollow(gAtl.Frame().Input()));
gAtl.Brush().GetCam2D().Set2DZoom(1.5);
import {CObject} from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js"

// === vinfo==3 위치에 랜덤 조형물 배치 (Village) ===

import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";

import { CBlackBoard } from "https://06fs4dix.github.io/Artgine/artgine/basic/CBlackBoard.js";

import { CBGAttachButton, CBlackboardModal, CLoadingBack, CMDViewer, CModalBackGround } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CModal, CModalTitleBar } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";

import { CTexture, CTextureInfo } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CCamCon2DFollow } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CSysAuth } from "https://06fs4dix.github.io/Artgine/artgine/system/CSysAuth.js";
import { CAudioTag } from "https://06fs4dix.github.io/Artgine/artgine/system/audio/CAudio.js";
import { CDOM } from "https://06fs4dix.github.io/Artgine/artgine/basic/CDOM.js";

import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec1 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec1.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";

import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CSurfaceBloom } from "https://06fs4dix.github.io/Artgine/plugin/Bloom/Bloom.js";

import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CShadowPlane } from "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js";


import { SDF } from "https://06fs4dix.github.io/Artgine/artgine/z_file/SDF.js";
import { CSing, CSingOption } from "https://06fs4dix.github.io/Artgine/artgine/server/CSing.js";

import { CSocketIO } from "https://06fs4dix.github.io/Artgine/artgine/network/CSocketIO.js";
import { CStream } from "https://06fs4dix.github.io/Artgine/artgine/basic/CStream.js";
import { CAlert } from "https://06fs4dix.github.io/Artgine/artgine/basic/CAlert.js";
import { CCIndex } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCIndex.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CCanvasPluginRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCanvasPluginRPMgr.js";
import { CRPAuto, CRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CRPMgr.js";
import { CCondition } from "https://06fs4dix.github.io/Artgine/artgine/util/CCondition.js";
import { CSurface } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSurface.js";
import { CLight } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CLight.js";
import { CUI, CUIPicture } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CUI.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CUpdate } from "https://06fs4dix.github.io/Artgine/artgine/basic/Basic.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CUniqueID } from "https://06fs4dix.github.io/Artgine/artgine/basic/CUniqueID.js";


import { CMat } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMat.js";
import { Bootstrap } from "https://06fs4dix.github.io/Artgine/artgine/basic/Bootstrap.js";

import { CHTMLDropdown } from "https://06fs4dix.github.io/Artgine/artgine/util/CHTMLBar.js";
import { CVoxelMap } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CVoxelMap.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/render/CColor.js";


// //Real.Clear();

// let gTex=CImgPro.Square(1024,1024,new CVec4(0,0,1,1));
// //MapTool(null,gTex);



// gAtl.Frame().Res().Push("sample.tex",gTex);
// let map=new CMap();
// map.SetTexture("sample.tex");
// let density=map.PushDensity(new CDensity2D(0,0,100,"Res/item/food/apple.png",new CSampler(new CVec2(100,100))));
// density.mWind=100;
// density.mYSort=true;
// Main.PushSub(map);

// === Maze 방식: vinfo==3 위치에 CSubject + 랜덤 조형물 배치 (블랙보드에서 직접 가져오기) ===
{
    const backVoxel = Main.Find("BackGround") as CVoxelMap;
    if (backVoxel) {
        const decoNames = ["Prefab/LTree", "Prefab/MTree", "Prefab/Flower1", "Prefab/Flower2"];
        // 블랙보드에서 직접 가져오기
        const decoObjs = decoNames.map(name => CBlackBoard.Find(name)).filter(obj => obj && obj.Export);

        const width = backVoxel.mBuf.mCount?.x || 0;
        const height = backVoxel.mBuf.mCount?.y || 0;
        const tileSize = backVoxel.mBuf.mSize || 200;

        const placed = new Set<string>();
        const minDist = 2; // 최소 거리(칸 단위)
        const placeProb = 0.1; // 10% 확률

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {

                let pos=new CVec3(x * tileSize, y * tileSize, 0);
                if(pos.x<1000 || pos.x>15000 || pos.y<1000 || pos.y>15000) continue;
                const idx = new CCIndex(x, y, 0);
                const vinfo = backVoxel.mBuf.RGB(idx);
                if ((vinfo == 0x0000ff00 || vinfo == 0x00001000 || vinfo == 0x00002000 || vinfo == 0x00003000 || vinfo == 0x00004000)
                    && Math.random() < placeProb) {
                    // 주변에 이미 배치된 조형물이 있는지 체크
                    let overlap = false;
                    for (let dy = -minDist; dy <= minDist; dy++) {
                        for (let dx = -minDist; dx <= minDist; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const key = (x + dx) + ',' + (y + dy);
                            if (placed.has(key)) {
                                overlap = true;
                                break;
                            }
                        }
                        if (overlap) break;
                    }
                    if (overlap) continue;

                    // 배치
                    const deco = decoObjs[Math.floor(Math.random() * decoObjs.length)];
                    if (deco) {
                        //const obj = deco.Export() as CSubject;
                        const obj = deco.ExportProxy() as CSubject;
                        obj.SetPos(pos);
                        obj.SetSave(false);
                        Real.PushSub(obj);
                        placed.add(x + ',' + y);
                    }
                }
            }
        }
    }
}
CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Unit", async () => {
    let ba: string[] = [];
  

    for (let [key, value] of CBlackBoard.Map()) {
        if (value instanceof CSubject) {
            ba.push(key);
        }
    }

    new CBlackboardModal(ba);
}));

Real.PushSub(new CNPC("Dante")).SetPos(new CVec3(6600,6400));
Real.PushSub(new CNPC("Miles")).SetPos(new CVec3(6200,9200));
Real.PushSub(new CNPC("Poppy")).SetPos(new CVec3(11000,8000));







let rpPlug=new CCanvasPluginRPMgr(null);
Real.PushPlugin(rpPlug);
let AM7RP=new CRPMgr();
let rp=AM7RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({"s":"class","v":"CPaint2D"}));
rp.PushAnd(new CCondition({"s":"mTag[shadowPlane]","v":0}));
//rp.PushInPaint(CPaint2D);
//rp.PushOutTag("shadowPlane");
rp.mShader=gAtl.Frame().Pal().Sl2DKey();
rp.mTag.add("light");


rp=AM7RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({"s":"class","v":"CPaintVoxel"}));
rp.mShader=gAtl.Frame().Pal().SlVoxelKey();
rp.mTag.add("light");
//rpPlug.SetRPMgr(AM7RP);
//Real.SetRPMgr(AM7RP);

// let voxel=Main.Find("BackGround") as CVoxel;
// voxel.mLight=true;
// voxel.mUpdateRes=true;

let PM1RP=new CRPMgr();
rp=PM1RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({"s":"class","v":"CPaint2D"}));
rp.PushAnd(new CCondition({"s":"mTag[shadowPlane]","v":0}));

rp.mShader=gAtl.Frame().Pal().Sl2DKey();


rp=PM1RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({"s":"class","v":"CPaintVoxel"}));
rp.mShader=gAtl.Frame().Pal().SlVoxelKey();

//Real.SetRPMgr(PM1RP);
rpPlug.SetRPMgr(PM1RP);


let PM11RP=new CRPMgr();


let emissiveTex=new CTexture();
emissiveTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
let emissiveTexKey=PM11RP.PushTex("Bloom/emissiveTex.tex",emissiveTex);
rp=PM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({"s":"class","v":"CPaint2D"}));
rp.PushAnd(new CCondition({"s":"mTag[bloom]"}));
rp.mShader=gAtl.Frame().Pal().Sl2DKey();
rp.mRenderTarget=emissiveTexKey;
rp.mTag.add("mask");



let basiceTex=new CTexture();
basiceTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
let basiceTexKey=PM11RP.PushTex("Bloom/basiceTex.tex",basiceTex);
rp=PM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({"s":"class","v":"CPaint2D"}));
rp.PushAnd(new CCondition({"s":"mTag[shadowPlane]","v":0}));
rp.mShader=gAtl.Frame().Pal().Sl2DKey();
rp.mTag.add("light");
rp.mRenderTarget=basiceTexKey;


rp=PM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({"s":"class","v":"CPaintVoxel"}));
rp.mShader=gAtl.Frame().Pal().SlVoxelKey();
rp.mTag.add("light");
rp.mRenderTarget=basiceTexKey;


rp=PM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({"s":"class","v":"CShadowPlane"}));
rp.PushAnd(new CCondition({"s":"mTag[shadowPlane]"}));
rp.mShader=gAtl.Frame().Pal().Sl2DKey();
rp.mRenderTarget=basiceTexKey;



let sufBloom=PM11RP.PushSuf(new CSurfaceBloom()) as CSurfaceBloom;
let srp=sufBloom.GetRP();
srp.mShader=gAtl.Frame().Pal().Sl2DKey();
srp.mTag.add("blit");
srp.mShaderAttr.push(new CShaderAttr(0,emissiveTexKey));
sufBloom.OldSchool();
// sufBloom.m_intensity = 1000.0;//업샘플 합성의 기본 강도
sufBloom.m_threshold = 1.0;//이 값보다 어두운 픽셀은 블룸 입력에서 배제
sufBloom.m_softThreshold = 1.0;//임계 부근이 점진적으로 섞여 더 자연스러운 하이라이트 선택
// sufBloom.m_lowFrequencyBoost = 100.0;//값을 올리면 멀리 퍼져 보이는 느낌이 커짐.
// sufBloom.m_lowFrequencyBoostCurvation = 200.0;//멀리 퍼지는 긴 꼬리
// sufBloom.m_highPassFrequency = 1.0;//코드상 1.0이면 모든 mip 기여 허용, 값이 작아질수록 큰 mip(멀리 퍼지는 부분) 기여가 빠르게 줄어듭니다. 즉 멀리 퍼지게 하려면 1.0 유지가 유리
// sufBloom.Refresh();

let sufLast=PM11RP.PushSuf(new CSurface());
srp=sufLast.GetRP();
sufLast.SetUseRT(false);


srp.mShader=gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("blend");
srp.mShaderAttr.push(new CShaderAttr(0,basiceTexKey));
srp.mShaderAttr.push(new CShaderAttr(1,sufBloom.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr("TexOffBlendFactor",new CMat([1,1,CRenderPass.eBlend.LinearDodge])));

//srp.mShaderAttr.push(new CShaderAttr("blend", 1, CRenderPass.eBlend.LinearDodge));
//srp.mShaderAttr.push(new CShaderAttr("opacity",1,1));







function AM7()
{
    //Real.SetRPMgr(AM7RP);
    rpPlug.SetRPMgr(AM7RP);
    let Direct=Main.Find("Direct");
    let PointList=Main.Find("PointList");

    let dirLight=Direct.FindComp(CLight);
    //dirLight.SetColor(new CVec3(1,0.8,0.8));
    Direct.SetPos(new CVec3(1,1,0));

    PointList.SetEnable(false);
    // let ptLights=PointList.FindComps(CLight,true);
    // for(let pt of ptLights)
    // {
    //     pt.SetColor(new CVec3());
    // }
    

}
window["AM7"]=AM7;


function PM1()
{
    //Real.SetRPMgr(PM1RP);
    rpPlug.SetRPMgr(PM1RP);
    //Real.SetRPMgr(lightAM7RP);
    let Direct=Main.Find("Direct");
    let PointList=Main.Find("PointList");

    let dirLight=Direct.FindComp(CLight);
    //dirLight.SetColor(new CVec3(1,1,1));
    Direct.SetPos(new CVec3(0,1,0));

    PointList.SetEnable(false);
    // let ptLights=PointList.FindComps(CLight,true);
    // for(let pt of ptLights)
    // {
    //     //pt.SetEnable(false);
    //     pt.SetColor(new CVec3());
    // }
    

}
window["PM1"]=PM1;



function PM11()
{
    //Real.SetRPMgr(PM11RP);
    rpPlug.SetRPMgr(PM11RP);
    let Direct=Main.Find("Direct");
    let PointList=Main.Find("PointList");

    // let dirLight=Direct.FindComp(CLight);
    // //dirLight.SetColor(new CVec3());
    Direct.SetPos(new CVec3(1,0,0));

    PointList.SetEnable(true);
    
}
window["PM11"]=PM11;



PM1();

let audioEnable= await CSysAuth.Confirm(true);
if(audioEnable)
{
    let audio=new CAudioTag("Res/sound/TownTheme.mp3");
    audio.Volume(0.5);
    audio.Play();
}
    


//Real.Clear();
new CMDViewer("README.md");

// Main.Find("Direct").Destroy();

// let ls=Main.PushSub(new CSubject());
// ls.SetKey("Direct");
// let lp=ls.PushComp(new CLightPlanet())
// lp.Push(new CDayCycle(new CVec3(0,1),new CColor(1,1,1)));
// lp.Push(new CDayCycle(new CVec3(1,1),new CColor(1,0.5,0.5)));
// lp.Push(new CDayCycle(new CVec3(-1,1),new CColor(1,0.5,0.5)));
// lp.Push(new CDayCycle(new CVec3(1,0),new CColor(0,0,0)));
// lp.Push(new CDayCycle(new CVec3(-1,0),new CColor(0,0,0)));



//이 부분은 미니맵 샘플이다! 지우지마!!!!!!!!!!!!!!!!!!
//let miniMapTex=gAtl.Frame().Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8)],new CVec2(512,512));


// rp=PM1RP.PushRP(new CRPAuto());
// rp.PushAnd(new CCondition({"s":"class","v":"CPaintVoxel"}));
// rp.mShader=gAtl.Frame().Pal().SlVoxelKey();
// rp.mRenderTarget=miniMapTex;
// //Real.SetRPMgr(PM1RP);
// rpPlug.SetRPMgr(PM1RP);


// let uipic=Main.PushSub(new CUIPicture());
// uipic.Init(miniMapTex);
// uipic.SetSize(128,128);
// uipic.SetAnchorX(CUI.eAnchor.Min,10);
// uipic.SetAnchorY(CUI.eAnchor.Max,10);
// uipic.GetPt().SetVFX(0,[25,50,0],SDF.eColorVFX.Scanline)








    let user=Real.PushSub(new CUser());
    user.SetPos(new CVec3(5200,6500));
    user.PushChild(new CPad()).mSave=false;


    // let item=Real.PushSub(new CSubjectInven(new CInventory("test0")));
    // item.SetPos(new CVec3(5200,6500));
    // let pt=user.FindComp(CPaint);
    // let durl=pt.CaptureTextureToDataURL();
    // CAlert.Info(`<img src='${durl}' />`);






let mg=new CModalBackGround("barRoot");
let arr: CHTMLDropdown[] = [];
arr.push(new CHTMLDropdown("root", "OptionBar", "Option", Bootstrap.eColor.warning));


arr.push(new CHTMLDropdown("OptionBar", "OptionAM7", `<div onclick="AM7()">AM7</div>`, Bootstrap.eColor.light));
arr.push(new CHTMLDropdown("OptionBar", "OptionPM1", `<div onclick="PM1()">PM1</div>`, Bootstrap.eColor.light));
arr.push(new CHTMLDropdown("OptionBar", "OptionPM11", `<div onclick="PM11()">PM11</div>`, Bootstrap.eColor.light));


const dummy = CHTMLDropdown.Attach(arr, "left");
let rightDiv=CDOM.DataToDom(`<div class="position-fixed top-0 end-0" style="z-index:2000;"></div>`);
rightDiv.append(dummy);
mg.SetBody(rightDiv);

















































































































































































