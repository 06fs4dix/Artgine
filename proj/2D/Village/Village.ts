//Version
const version='mffeu6vk_17';
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
gPF.mWASM = true;
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = true;

import {CAtelier} from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";

import {CPlugin} from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
CPlugin.PushPath('ShadowPlane','https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/');
import "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js"
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
import { CCIndex } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CCIndex.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CBlackBoard } from "https://06fs4dix.github.io/Artgine/artgine/basic/CBlackBoard.js";
import { CPaint } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint.js";
import { CBGAttachButton, CBlackboardModal, CLoadingBack, CMDViewer } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CModal, CModalTitleBar } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CTexture } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CCamCon2DFollow } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CSysAuth } from "https://06fs4dix.github.io/Artgine/artgine/system/CSysAuth.js";
import { CAudioTag } from "https://06fs4dix.github.io/Artgine/artgine/system/audio/CAudio.js";
import { CDomFactory } from "https://06fs4dix.github.io/Artgine/artgine/basic/CDOMFactory.js";
import { CRPAuto, CRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CRPMgr.js";
import { CVoxel } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CVoxel.js";
import { CPaintVoxel } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaintVoxel.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec1 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec1.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CLight } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CLight.js";
import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
//Real.Clear();

// === Maze 방식: vinfo==3 위치에 CSubject + 랜덤 조형물 배치 (블랙보드에서 직접 가져오기) ===
{
    const backVoxel = Main.Find("BackGround") as any;
    if (backVoxel) {
        const decoNames = ["LTree", "MTree", "Flower1", "Flower2"];
        // 블랙보드에서 직접 가져오기
        const decoObjs = decoNames.map(name => CBlackBoard.Find(name)).filter(obj => obj && obj.Export);

        const width = backVoxel.mCount?.x || 0;
        const height = backVoxel.mCount?.y || 0;
        const tileSize = backVoxel.mSize || 200;

        const placed = new Set<string>();
        const minDist = 2; // 최소 거리(칸 단위)
        const placeProb = 0.1; // 10% 확률

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = new CCIndex(x, y, 0);
                const vinfo = backVoxel.GetVInfo ? backVoxel.GetVInfo(idx) : 0;
                if (vinfo === 3 && Math.random() < placeProb) {
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
                        obj.SetPos(new CVec3(x * tileSize, y * tileSize, 0));
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
    let ta: string[] = [];
    let ca: CVec4[] = [];

    for (let [key, value] of CBlackBoard.Map()) {
        if (value instanceof CSubject) {
            ba.push(key);

            let pt2d = value.FindComp(CPaint2D);
            const texName = pt2d.GetTexture()[0];
            ta.push(texName);
            ca.push(pt2d.GetLeftTopRightBottom(gAtl.Frame()));
        }
    }

    new CBlackboardModal(ba, ta, ca);
}));
Real.PushSub(new CUser()).SetPos(new CVec3(5200,6500));
Real.PushSub(new CNPC("Dante","Res/Actor/Villager2/SeparateAnim/Walk.png")).SetPos(new CVec3(6400,6400));
Real.PushSub(new CNPC("Miles","Res/Actor/Villager3/SeparateAnim/Walk.png")).SetPos(new CVec3(6200,9200));
Real.PushSub(new CNPC("Poppy","Res/Actor/Villager4/SeparateAnim/Walk.png")).SetPos(new CVec3(11000,8000));


CSysAuth.Confirm(true).then(async (_enable)=>{
    
    if(_enable==false)  return;
    let audio=new CAudioTag("Res/sound/TownTheme.mp3");
    audio.Volume(0.5);
    audio.Play();


});





let lightRP=new CRPMgr();
let rp=lightRP.PushRP(new CRPAuto());
rp.PushInPaint(CPaint2D);
rp.PushOutTag("shadowPlane");
rp.mShader=gAtl.Frame().Pal().Sl2DKey();
rp.mTag="light";


rp=lightRP.PushRP(new CRPAuto());
rp.PushInPaint(CPaintVoxel);
rp.mShader=gAtl.Frame().Pal().SlVoxelKey();
rp.mTag="light";
Real.SetRPMgr(lightRP);

// let voxel=Main.Find("BackGround") as CVoxel;
// voxel.mLight=true;
// voxel.mUpdateRes=true;



let Option_btn=new CBGAttachButton("Test",101,new CVec2(320,120));
Option_btn.SetTitleText("Option");
Option_btn.SetContent(`
<div>
    <button onclick="AM7()">AM7</button>
    <button onclick="PM1()">PM1</button>
    <button onclick="PM11()">PM11</button>
</div>`);

function AM7()
{
    let Direct=Main.Find("Direct");
    let PointList=Main.Find("PointList");

    let dirLight=Direct.FindComp(CLight);
    dirLight.SetColor(new CVec3(1,0.8,0.8));
    Direct.SetPos(new CVec3(1,0.5,0));

    let ptLights=PointList.FindComps(CLight,true);
    for(let pt of ptLights)
    {
        pt.SetColor(new CVec3());
    }
    Real.SetRPMgr(lightRP);

}
window["AM7"]=AM7;


function PM1()
{
    let Direct=Main.Find("Direct");
    let PointList=Main.Find("PointList");

    let dirLight=Direct.FindComp(CLight);
    dirLight.SetColor(new CVec3(1,1,1));
    Direct.SetPos(new CVec3(0,1,0));

    let ptLights=PointList.FindComps(CLight,true);
    for(let pt of ptLights)
    {
        pt.SetColor(new CVec3());
    }
    Real.SetRPMgr(null);

}
window["PM1"]=PM1;



function PM11()
{
    let Direct=Main.Find("Direct");
    let PointList=Main.Find("PointList");

    let dirLight=Direct.FindComp(CLight);
    dirLight.SetColor(new CVec3());
    Direct.SetPos(new CVec3(0,1,0));

    let ptLights=PointList.FindComps(CLight,true);
    for(let pt of ptLights)
    {
        pt.SetColor(new CVec3(1,1,1));
    }
    Real.SetRPMgr(lightRP);

}
window["PM11"]=PM11;




class CTest extends CObject
{
    mKey="a";
    mValue=1;
    mArr=new Array<CVec3>();
    IsShould(_member: string, _type: CObject.eShould): boolean 
    {
        if(_type==CObject.eShould.Proxy)
        {
            if(_member=="mKey")
                return false;
        }
        return super.IsShould(_member,_type);
    }
}
new CMDViewer("README.md");



