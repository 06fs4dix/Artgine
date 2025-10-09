const version = 'mgjgxfbu_7';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js";
import { CClass } from "https://06fs4dix.github.io/Artgine/artgine/basic/CClass.js";
import { CNPC } from "./CNPC.js";
CClass.Push(CNPC);
import { CUser } from "./CUser.js";
CClass.Push(CUser);
import { CPreferences } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
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
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";
import { CPlugin } from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
CPlugin.PushPath('ShadowPlane', 'https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/');
import "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json', 'Real.json'], "");
var Main = gAtl.Canvas('Main.json');
var Real = gAtl.Canvas('Real.json');
let comcon = gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFollow(gAtl.Frame().Input()));
gAtl.Brush().GetCam2D().Set2DZoom(1.5);
import { CCIndex } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CCIndex.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CBlackBoard } from "https://06fs4dix.github.io/Artgine/artgine/basic/CBlackBoard.js";
import { CBGAttachButton, CBlackboardModal, CMDViewer } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CModal, CModalTitleBar } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CTexture, CTextureInfo } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CCamCon2DFollow } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CSysAuth } from "https://06fs4dix.github.io/Artgine/artgine/system/CSysAuth.js";
import { CAudioTag } from "https://06fs4dix.github.io/Artgine/artgine/system/audio/CAudio.js";
import { CRPAuto, CRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CRPMgr.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CLight } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CLight.js";
import { CSurfaceBloom } from "https://06fs4dix.github.io/Artgine/plugin/Bloom/Bloom.js";
import { CSurface } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSurface.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CCondition } from "https://06fs4dix.github.io/Artgine/artgine/util/CStateMachine.js";
{
    const backVoxel = Main.Find("BackGround");
    if (backVoxel) {
        const decoNames = ["Prefab/LTree", "Prefab/MTree", "Prefab/Flower1", "Prefab/Flower2"];
        const decoObjs = decoNames.map(name => CBlackBoard.Find(name)).filter(obj => obj && obj.Export);
        const width = backVoxel.mCount?.x || 0;
        const height = backVoxel.mCount?.y || 0;
        const tileSize = backVoxel.mSize || 200;
        const placed = new Set();
        const minDist = 2;
        const placeProb = 0.1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = new CCIndex(x, y, 0);
                const vinfo = backVoxel.GetVInfo ? backVoxel.GetVInfo(idx) : 0;
                if (vinfo === 3 && Math.random() < placeProb) {
                    let overlap = false;
                    for (let dy = -minDist; dy <= minDist; dy++) {
                        for (let dx = -minDist; dx <= minDist; dx++) {
                            if (dx === 0 && dy === 0)
                                continue;
                            const key = (x + dx) + ',' + (y + dy);
                            if (placed.has(key)) {
                                overlap = true;
                                break;
                            }
                        }
                        if (overlap)
                            break;
                    }
                    if (overlap)
                        continue;
                    const deco = decoObjs[Math.floor(Math.random() * decoObjs.length)];
                    if (deco) {
                        const obj = deco.ExportProxy();
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
    let ba = [];
    let ta = [];
    let ca = [];
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
Real.PushSub(new CUser()).SetPos(new CVec3(5200, 6500));
Real.PushSub(new CNPC("Dante", "Res/Actor/Villager2/SeparateAnim/Walk.png")).SetPos(new CVec3(6600, 6400));
Real.PushSub(new CNPC("Miles", "Res/Actor/Villager3/SeparateAnim/Walk.png")).SetPos(new CVec3(6200, 9200));
Real.PushSub(new CNPC("Poppy", "Res/Actor/Villager4/SeparateAnim/Walk.png")).SetPos(new CVec3(11000, 8000));
CSysAuth.Confirm(true).then(async (_enable) => {
    if (_enable == false)
        return;
    let audio = new CAudioTag("Res/sound/TownTheme.mp3");
    audio.Volume(0.5);
    audio.Play();
});
let lightAM7RP = new CRPMgr();
let rp = lightAM7RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaint2D" }));
rp.PushAnd(new CCondition({ "s": "mTag[shadowPlane]", "v": 0 }));
rp.mShader = gAtl.Frame().Pal().Sl2DKey();
rp.mTag = "light";
rp = lightAM7RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaintVoxel" }));
rp.mShader = gAtl.Frame().Pal().SlVoxelKey();
rp.mTag = "light";
Real.SetRPMgr(lightAM7RP);
let lightPM11RP = new CRPMgr();
let emissiveTex = new CTexture();
emissiveTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
let emissiveTexKey = lightPM11RP.PushTex("Bloom/emissiveTex.tex", emissiveTex);
rp = lightPM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaint2D" }));
rp.PushAnd(new CCondition({ "s": "mTag[bloom]" }));
rp.mShader = gAtl.Frame().Pal().Sl2DKey();
rp.mRenderTarget = emissiveTexKey;
rp.mTag = "mask";
let basiceTex = new CTexture();
basiceTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
let basiceTexKey = lightPM11RP.PushTex("Bloom/basiceTex.tex", basiceTex);
rp = lightPM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaint2D" }));
rp.PushAnd(new CCondition({ "s": "mTag[shadowPlane]", "v": 0 }));
rp.mShader = gAtl.Frame().Pal().Sl2DKey();
rp.mTag = "light";
rp.mRenderTarget = basiceTexKey;
rp = lightPM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaintVoxel" }));
rp.mShader = gAtl.Frame().Pal().SlVoxelKey();
rp.mTag = "light";
rp.mRenderTarget = basiceTexKey;
rp = lightPM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CShadowPlane" }));
rp.PushAnd(new CCondition({ "s": "mTag[shadowPlane]" }));
rp.mShader = gAtl.Frame().Pal().Sl2DKey();
rp.mRenderTarget = basiceTexKey;
let sufBloom = lightPM11RP.PushSuf(new CSurfaceBloom());
let srp = sufBloom.GetRP();
srp.mShader = gAtl.Frame().Pal().Sl2DKey();
srp.mTag = "blit";
srp.mShaderAttr.push(new CShaderAttr(0, emissiveTexKey));
sufBloom.OldSchool();
sufBloom.m_threshold = 1.0;
sufBloom.m_softThreshold = 1.0;
let sufLast = lightPM11RP.PushSuf(new CSurface());
srp = sufLast.GetRP();
sufLast.SetUseRT(false);
srp.mShader = gAtl.Frame().Pal().SlPostKey();
srp.mTag = "blend";
srp.mShaderAttr.push(new CShaderAttr(0, basiceTexKey));
srp.mShaderAttr.push(new CShaderAttr(1, sufBloom.GetTexKey()));
srp.mShaderAttr.push(new CShaderAttr("blend", 1, CRenderPass.eBlend.LinearDodge));
srp.mShaderAttr.push(new CShaderAttr("opacity", 1, 1));
let Option_btn = new CBGAttachButton("Test", 101, new CVec2(320, 120));
Option_btn.SetTitleText("Option");
Option_btn.SetContent(`
<div>
    <button onclick="AM7()">AM7</button>
    <button onclick="PM1()">PM1</button>
    <button onclick="PM11()">PM11</button>
</div>`);
function AM7() {
    Real.SetRPMgr(lightAM7RP);
    let Direct = Main.Find("Direct");
    let PointList = Main.Find("PointList");
    let dirLight = Direct.FindComp(CLight);
    dirLight.SetColor(new CVec3(1, 0.8, 0.8));
    Direct.SetPos(new CVec3(1, 0.5, 0));
    PointList.SetEnable(false);
}
window["AM7"] = AM7;
function PM1() {
    Real.SetRPMgr(null);
    let Direct = Main.Find("Direct");
    let PointList = Main.Find("PointList");
    let dirLight = Direct.FindComp(CLight);
    dirLight.SetColor(new CVec3(1, 1, 1));
    Direct.SetPos(new CVec3(0, 1, 0));
    PointList.SetEnable(false);
}
window["PM1"] = PM1;
function PM11() {
    Real.SetRPMgr(lightPM11RP);
    let Direct = Main.Find("Direct");
    let PointList = Main.Find("PointList");
    let dirLight = Direct.FindComp(CLight);
    dirLight.SetColor(new CVec3());
    Direct.SetPos(new CVec3(0, 1, 0));
    PointList.SetEnable(true);
}
window["PM11"] = PM11;
new CMDViewer("README.md");
PM11();
