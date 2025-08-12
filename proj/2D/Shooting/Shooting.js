const version = '2025-08-12 22:17:41';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js";
import { CClass } from "https://06fs4dix.github.io/Artgine/artgine/basic/CClass.js";
import { BackGround } from "./BackGround.js";
CClass.Push(BackGround);
import { CBulletComp } from "./CBulletComp.js";
CClass.Push(CBulletComp);
import { CMoveComp } from "./CMoveComp.js";
CClass.Push(CMoveComp);
import { CPacShooting } from "./CPacShooting.js";
CClass.Push(CPacShooting);
import { CProComp } from "./CProComp.js";
CClass.Push(CProComp);
import { CUserComp } from "./CUserComp.js";
CClass.Push(CUserComp);
import { RoomSystem } from "./RoomSystem.js";
CClass.Push(RoomSystem);
import { CPreferences } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 600;
gPF.mTargetHeight = 800;
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
gPF.mGitHub = true;
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";
import { CPlugin } from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
CPlugin.PushPath('test', 'https://06fs4dix.github.io/Artgine/plugin/test/');
import "https://06fs4dix.github.io/Artgine/plugin/test/test.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json', 'Res.json', 'UI.json']);
var Main = gAtl.Canvas('Main.json');
var Res = gAtl.Canvas('Res.json');
var UI = gAtl.Canvas('UI.json');
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CTexture, CTextureInfo } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CModalChat, CModalEvent } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CPacRoom, CRoomClient } from "https://06fs4dix.github.io/Artgine/artgine/server/CRoomClient.js";
import { CStream } from "https://06fs4dix.github.io/Artgine/artgine/basic/CStream.js";
import { CBlackBoard } from "https://06fs4dix.github.io/Artgine/artgine/basic/CBlackBoard.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec1 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec1.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CCollider.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CRigidBody.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CForce.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAniFlow.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CPool } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPool.js";
import { CRPAuto, CRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CRPMgr.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CSurface } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSurface.js";
import { CSurfaceBloom } from "../../../plugin/Bloom/Bloom.js";
import { CModal, CModalTitleBar } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
gAtl.Brush().GetCam2D().SetSize(600, 800);
let back = Main.Push(new BackGround());
let gStartBtn = new CModalEvent("StartBtn");
gStartBtn.SetBody(`
        <div id="MainContainer" class="min-vh-100 d-flex flex-column align-items-center justify-content-center">
  <button type="button" class="btn btn-primary" style="font-size:120px; pointer-events:auto;" id="StartBtn">Start</button>
</div>
    `);
let gRoomKey = "";
let gSuk = "";
let gNick = "";
let socket = new CRoomClient(gPF.mServer == "local");
let gOwner = false;
socket.On(CRoomClient.eEvent.RoomConnect, (_stream) => {
    let packet = CPacRoom.GetRoomConnect(_stream);
    let userBB = CBlackBoard.Find("User");
    let user = userBB.Export(true, true);
    user.SetKey(packet.suk);
    user.FindComp(CUserComp).SetNick(packet.nick);
    Main.Push(user);
    if (packet.suk == socket.GetSuk()) {
        gRoomKey = packet.roomKey;
        gSuk = packet.suk;
        gNick = packet.nick;
        user.PatchTrackDefault();
    }
    else
        user.FindChild("pad").SetEnable(false);
    if (packet.owner == 1) {
        gOwner = true;
    }
    else {
        let me = Main.Find(gSuk);
        let pos = me.GetPos();
        let dStream = new CStream();
        dStream.Push("Pos");
        dStream.Push(gSuk);
        dStream.Push(gNick);
        dStream.Push(pos);
        dStream.Push(new CVec3());
        socket.Send(CPacRoom.SetSUKSend([packet.suk], dStream));
    }
});
socket.On(CRoomClient.eEvent.RoomClose, (_stream) => {
    if (gOwner) {
        Main.Push(new RoomSystem());
    }
    gStartBtn.Close();
});
socket.On(CRoomClient.eEvent.RoomDisConnect, (_stream) => {
    let packet = CPacRoom.GetRoomDisConnect(_stream);
    Main.Find(packet.suk).Destroy();
});
socket.On(CPacShooting.eHeader.UserShot, (_stream) => {
    let packet = CPacShooting.UserShot(_stream);
    let ball = new CSubject();
    let pt = new CPaint2D("Res/shmup_obj/airplane_05_48x48_002.png");
    pt.PushTag("bloom");
    pt.PushCShaderAttr(new CShaderAttr("mask", new CVec1(1.0)));
    ball.PushComp(pt);
    let cl = new CCollider(pt);
    cl.SetLayer("shot");
    cl.SetCameraOut(true);
    cl.PushCollisionLayer("mon");
    ball.PushComp(cl);
    let rb = new CRigidBody();
    rb.Push(new CForce("move", CVec3.Up(), 500));
    ball.PushComp(rb);
    ball.PushComp(new CBulletComp());
    packet.pos.z -= 0.1;
    ball.SetPos(packet.pos);
    ball.SetKey("bullet" + ball.Key());
    Main.Push(ball);
});
socket.On(CPacShooting.eHeader.Pos, (_stream) => {
    let packet = CPacShooting.Pos(_stream);
    let user = Main.Find(packet.suk);
    if (user == null) {
        let userPF = CBlackBoard.Find("User");
        user = userPF.Export();
        user.SetKey(packet.suk);
        user.FindComp(CUserComp).SetNick(packet.nick);
        Main.Push(user);
        user.FindChild("pad").SetEnable(false);
    }
    user.SetPos(packet.pos);
    let rb = user.FindComp(CRigidBody);
    rb.Clear();
    rb.Push(new CForce("move", packet.dir, 400));
});
CPool.On("Monster", () => {
    let Mon = CBlackBoard.Find("Monster");
    let mon = Mon.Export(true, true);
    mon.FindComp(CRigidBody).Push(new CForce("move", new CVec3(0, -1), 200));
    return mon;
}, CPool.ePool.Product);
socket.On(CPacShooting.eHeader.MonCreate, async (_stream) => {
    let packet = CPacShooting.MonCreate(_stream);
    let mon = await CPool.Product("Monster");
    mon.SetKey(packet.monKey);
    mon.SetPos(packet.pos);
    mon.FindComp(CProComp).SetHP(50);
    Main.Push(mon);
});
socket.On(CPacShooting.eHeader.Effect, (stream) => {
    let packet = CPacShooting.Effect(stream);
    packet.pos.z = 1;
    let flash = new CSubject();
    flash.SetPos(packet.pos);
    let size = new CVec2(50, 50);
    if (packet.key == "Explosion")
        size = new CVec2(200, 200);
    let pt = new CPaint2D(null, size);
    pt.PushTag("bloom");
    flash.PushComp(pt);
    let af = flash.PushComp(new CAniFlow(packet.key));
    af.SetSpeed(1.5);
    Main.Push(flash);
});
socket.Connect().then(() => {
    if (socket.mAddrPortPath == "local") {
        gStartBtn.SetChangeEvent(() => {
            socket.Send(new CStream().Push("RoomConnect").Push(1).Push(socket.GetSuk()).Push("User").Push("").Data());
            socket.Send(CPacRoom.SetRoomClose(gRoomKey));
        });
    }
    else {
        socket.Send(CPacRoom.SetRoomConnect("User" + Math.trunc(Math.random() * 100), "Shooting", 2));
        gStartBtn.SetChangeEvent(() => {
            socket.Send(CPacRoom.SetRoomClose(gRoomKey));
        });
    }
    Main.SetWebSocket(socket);
});
let chat = new CModalChat("chatModal");
chat.SetPosition(gAtl.PF().mLeft, gAtl.PF().mTop);
chat.Open();
chat.SetSize(gAtl.PF().mWidth * 0.4, gAtl.PF().mHeight * 0.2);
chat.ChatAdd("스타트를 누르기전까지 기다립니다.");
chat.On(CEvent.eType.Chat, (msg) => {
    socket.Send(CPacRoom.SetBroadcasting("Chat", gNick + " : " + msg));
});
socket.On("Chat", (_stream) => {
    chat.ChatAdd(_stream.GetString());
});
gAtl.Frame().PushEvent(CEvent.eType.Resize, new CEvent(() => {
    chat.SetPosition(gAtl.PF().mLeft, gAtl.PF().mTop);
    chat.SetSize(gAtl.PF().mWidth * 0.5, gAtl.PF().mHeight * 0.4);
}));
CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Bloom", async () => {
    let BloomRPM = new CRPMgr();
    let emissiveTex = new CTexture();
    emissiveTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
    let emissiveTexKey = BloomRPM.PushTex("emissiveTex.tex", emissiveTex);
    let rp = BloomRPM.PushRP(new CRPAuto());
    rp.PushAutoPaint(CPaint2D);
    rp.PushAutoTag("bloom");
    rp.mShader = gAtl.Frame().Pal().Sl2DKey();
    rp.mRenderTarget = emissiveTexKey;
    rp.mTag = "mask";
    let basiceTex = new CTexture();
    basiceTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
    let basiceTexKey = BloomRPM.PushTex("basiceTex.tex", basiceTex);
    rp = BloomRPM.PushRP(new CRPAuto());
    rp.PushAutoPaint(CPaint2D);
    rp.mShader = gAtl.Frame().Pal().Sl2DKey();
    rp.mRenderTarget = basiceTexKey;
    let sufBloom = BloomRPM.PushSuf(new CSurfaceBloom());
    let srp = sufBloom.GetRP();
    srp.mShader = gAtl.Frame().Pal().Sl2DKey();
    srp.mTag = "blit";
    srp.mShaderAttr.push(new CShaderAttr(0, emissiveTexKey));
    let sufLast = BloomRPM.PushSuf(new CSurface());
    srp = sufLast.GetRP();
    sufLast.SetUseRT(false);
    srp.mShader = gAtl.Frame().Pal().SlPostKey();
    srp.mTag = "blend";
    srp.mShaderAttr.push(new CShaderAttr(0, basiceTexKey));
    srp.mShaderAttr.push(new CShaderAttr(1, sufBloom.GetTexKey()));
    srp.mShaderAttr.push(new CShaderAttr("blend", 1, CRenderPass.eBlend.LinearDodge));
    srp.mShaderAttr.push(new CShaderAttr("opacity", 1, 1));
    Main.SetRPMgr(BloomRPM);
}));
CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Basic", async () => {
    Main.SetRPMgr(null);
}));
