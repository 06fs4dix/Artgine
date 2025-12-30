const version = 'mjsmax7p_4';
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
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/app/CAtelier.js";
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
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CBlackBoard } from "https://06fs4dix.github.io/Artgine/artgine/basic/CBlackBoard.js";
import { CBGAttachButton, CBlackboardModal, CMDViewer } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CModal, CModalTitleBar } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CTexture, CTextureInfo } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CCamCon2DFollow } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CSysAuth } from "https://06fs4dix.github.io/Artgine/artgine/system/CSysAuth.js";
import { CAudioTag } from "https://06fs4dix.github.io/Artgine/artgine/system/audio/CAudio.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CSurfaceBloom } from "https://06fs4dix.github.io/Artgine/plugin/Bloom/Bloom.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { SDF } from "https://06fs4dix.github.io/Artgine/artgine/z_file/SDF.js";
import { CSing, CSingOption } from "https://06fs4dix.github.io/Artgine/artgine/server/CSing.js";
import { CSocketIO } from "https://06fs4dix.github.io/Artgine/artgine/network/CSocketIO.js";
import { CStream } from "https://06fs4dix.github.io/Artgine/artgine/basic/CStream.js";
import { CCIndex } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCIndex.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CCanvasPluginRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCanvasPluginRPMgr.js";
import { CRPAuto, CRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CRPMgr.js";
import { CCondition } from "https://06fs4dix.github.io/Artgine/artgine/util/CCondition.js";
import { CSurface } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSurface.js";
import { CLight } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CLight.js";
import { CUI, CUIPicture } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CUI.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CUniqueID } from "https://06fs4dix.github.io/Artgine/artgine/basic/CUniqueID.js";
import { PacketWorld } from "https://06fs4dix.github.io/Artgine/artgine/server/PacketWorld.js";
import { PacketVillage } from "./Server/PacketVillage.js";
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
    for (let [key, value] of CBlackBoard.Map()) {
        if (value instanceof CSubject) {
            ba.push(key);
        }
    }
    new CBlackboardModal(ba);
}));
Real.PushSub(new CNPC("Dante", "Res/Actor/Villager2/SeparateAnim/Walk.png")).SetPos(new CVec3(6600, 6400));
Real.PushSub(new CNPC("Miles", "Res/Actor/Villager3/SeparateAnim/Walk.png")).SetPos(new CVec3(6200, 9200));
Real.PushSub(new CNPC("Poppy", "Res/Actor/Villager4/SeparateAnim/Walk.png")).SetPos(new CVec3(11000, 8000));
let rpPlug = new CCanvasPluginRPMgr(null);
Real.PushPlugin(rpPlug);
let AM7RP = new CRPMgr();
let rp = AM7RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaint2D" }));
rp.PushAnd(new CCondition({ "s": "mTag[shadowPlane]", "v": 0 }));
rp.mShader = gAtl.Frame().Pal().Sl2DKey();
rp.mTag.add("light");
rp = AM7RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaintVoxel" }));
rp.mShader = gAtl.Frame().Pal().SlVoxelKey();
rp.mTag.add("light");
let PM1RP = new CRPMgr();
rp = PM1RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaint2D" }));
rp.PushAnd(new CCondition({ "s": "mTag[shadowPlane]", "v": 0 }));
rp.mShader = gAtl.Frame().Pal().Sl2DKey();
rp = PM1RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaintVoxel" }));
rp.mShader = gAtl.Frame().Pal().SlVoxelKey();
rpPlug.SetRPMgr(PM1RP);
let PM11RP = new CRPMgr();
let emissiveTex = new CTexture();
emissiveTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
let emissiveTexKey = PM11RP.PushTex("Bloom/emissiveTex.tex", emissiveTex);
rp = PM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaint2D" }));
rp.PushAnd(new CCondition({ "s": "mTag[bloom]" }));
rp.mShader = gAtl.Frame().Pal().Sl2DKey();
rp.mRenderTarget = emissiveTexKey;
rp.mTag.add("mask");
let basiceTex = new CTexture();
basiceTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
let basiceTexKey = PM11RP.PushTex("Bloom/basiceTex.tex", basiceTex);
rp = PM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaint2D" }));
rp.PushAnd(new CCondition({ "s": "mTag[shadowPlane]", "v": 0 }));
rp.mShader = gAtl.Frame().Pal().Sl2DKey();
rp.mTag.add("light");
rp.mRenderTarget = basiceTexKey;
rp = PM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaintVoxel" }));
rp.mShader = gAtl.Frame().Pal().SlVoxelKey();
rp.mTag.add("light");
rp.mRenderTarget = basiceTexKey;
rp = PM11RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CShadowPlane" }));
rp.PushAnd(new CCondition({ "s": "mTag[shadowPlane]" }));
rp.mShader = gAtl.Frame().Pal().Sl2DKey();
rp.mRenderTarget = basiceTexKey;
let sufBloom = PM11RP.PushSuf(new CSurfaceBloom());
let srp = sufBloom.GetRP();
srp.mShader = gAtl.Frame().Pal().Sl2DKey();
srp.mTag.add("blit");
srp.mShaderAttr.push(new CShaderAttr(0, emissiveTexKey));
sufBloom.OldSchool();
sufBloom.m_threshold = 1.0;
sufBloom.m_softThreshold = 1.0;
let sufLast = PM11RP.PushSuf(new CSurface());
srp = sufLast.GetRP();
sufLast.SetUseRT(false);
srp.mShader = gAtl.Frame().Pal().SlPostKey();
srp.mTag.add("blend");
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
    rpPlug.SetRPMgr(AM7RP);
    let Direct = Main.Find("Direct");
    let PointList = Main.Find("PointList");
    let dirLight = Direct.FindComp(CLight);
    Direct.SetPos(new CVec3(1, 1, 0));
    PointList.SetEnable(false);
}
window["AM7"] = AM7;
function PM1() {
    rpPlug.SetRPMgr(PM1RP);
    let Direct = Main.Find("Direct");
    let PointList = Main.Find("PointList");
    let dirLight = Direct.FindComp(CLight);
    Direct.SetPos(new CVec3(0, 1, 0));
    PointList.SetEnable(false);
}
window["PM1"] = PM1;
function PM11() {
    rpPlug.SetRPMgr(PM11RP);
    let Direct = Main.Find("Direct");
    let PointList = Main.Find("PointList");
    Direct.SetPos(new CVec3(1, 0, 0));
    PointList.SetEnable(true);
}
window["PM11"] = PM11;
PM1();
let audioEnable = await CSysAuth.Confirm(true);
if (audioEnable) {
    let audio = new CAudioTag("Res/sound/TownTheme.mp3");
    audio.Volume(0.5);
    audio.Play();
}
new CMDViewer("README.md");
let miniMapTex = gAtl.Frame().Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)], new CVec2(512, 512));
rp = PM1RP.PushRP(new CRPAuto());
rp.PushAnd(new CCondition({ "s": "class", "v": "CPaintVoxel" }));
rp.mShader = gAtl.Frame().Pal().SlVoxelKey();
rp.mRenderTarget = miniMapTex;
rpPlug.SetRPMgr(PM1RP);
let uipic = Main.PushSub(new CUIPicture());
uipic.Init(miniMapTex);
uipic.SetSize(128, 128);
uipic.SetAnchorX(CUI.eAnchor.Min, 10);
uipic.SetAnchorY(CUI.eAnchor.Max, 10);
uipic.GetPt().SetVFX(0, [25, 50, 0], SDF.eColorVFX.Scanline);
CSing.On(CSing.eEvent.State, () => {
    if (CSing.PrivateKey() != null) {
        loginModal.Close();
    }
});
let loginModal;
if (gPF.mServer == "local") {
    let user = Real.PushSub(new CUser());
    user.SetPos(new CVec3(5200, 6500));
    user.PushChild(new CPad()).mSave = false;
}
else {
    Real.Clear();
    let option = new CSingOption();
    let html = await CSing.InitForm(option);
    let uniqueKey = "";
    let camcon = gAtl.Brush().GetCam2D().GetCamCon();
    camcon.SetPos(new CVec3(5200, 6500));
    loginModal = new CModal();
    loginModal.SetHeader("Info");
    loginModal.SetTitle(CModal.eTitle.Text);
    loginModal.SetBody(html);
    loginModal.SetZIndex(CModal.eSort.Top);
    loginModal.Open(CModal.ePos.Center);
    let socket = new CSocketIO(false, "world");
    if (await socket.Connect()) {
        let ConnectAck = PacketWorld.WorldConnect(CSing.PrivateKey(), CUniqueID.Get());
        socket.Send(ConnectAck.Data());
    }
    socket.On(PacketWorld.eHeader.WorldInfo, (_stream) => {
        let WorldInfo = PacketWorld.WorldInfo(_stream);
        let pad = Real.PushSub(new CPad());
        let lastDir = new CVec3();
        pad["Update"] = (_update) => {
            let dir = pad.GetDir();
            if (dir.Equals(lastDir) == false) {
                lastDir.Import(dir);
                let UserPad = PacketVillage.UserPad(uniqueKey, dir, new CVec3());
                socket.Send(UserPad);
            }
        };
        uniqueKey = WorldInfo.uniqueKey;
        let stream = new CStream(WorldInfo.dataList);
        while (stream.IsEnd() == false) {
            let type = stream.GetString();
            let nick = stream.GetString();
            if (type == "user") {
                let user = Real.PushSub(new CUser());
                user.SetKey(stream.GetString());
                user.SetPos(stream.GetIStream(new CVec3()));
            }
            else {
                const obj = CBlackBoard.Find(type).ExportProxy();
                obj.SetKey(stream.GetString());
                obj.SetPos(stream.GetIStream(new CVec3()));
                obj.SetSave(false);
                Real.PushSub(obj);
            }
        }
        CConsol.Log(_stream.Data());
    });
    socket.On(PacketWorld.eHeader.WorldPushUser, (_stream) => {
        let WorldPushUser = PacketWorld.WorldPushUser(_stream);
        let stream = new CStream(WorldPushUser.data);
        let nick = stream.GetString();
        let uk = stream.GetString();
        let pos = stream.GetIStream(new CVec3());
        let user = Real.Find(WorldPushUser.uniqueKey);
        if (user == null) {
            let user = Real.PushSub(new CUser());
            user.SetKey(uk);
            user.SetPos(pos);
        }
    });
    socket.On(PacketVillage.eHeader.UserPad, (_stream) => {
        let UserPad = PacketVillage.UserPad(_stream);
        let user = Real.Find(UserPad.uniqueKey);
        user.mRB.Clear();
        user.SetPos(UserPad.pos);
        if (UserPad.dir.IsZero() == false) {
            user.mRB.Push(new CForce("move", UserPad.dir, 200));
        }
    });
    socket.On(PacketWorld.eHeader.WorldRemoveUser, (_stream) => {
        let UserClose = PacketWorld.WorldRemoveUser(_stream);
        let user = Real.Find(UserClose.uniqueKey);
        user.Destroy();
    });
    gAtl.Frame().PushEvent(CEvent.eType.Update, (_update) => {
        if (uniqueKey == "")
            return;
        let user = Real.Find(uniqueKey);
        if (user == null)
            return;
        let camcon = gAtl.Brush().GetCam2D().GetCamCon();
        camcon.SetPos(user.GetPos());
    });
}
