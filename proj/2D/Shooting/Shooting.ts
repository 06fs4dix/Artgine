//Version
const version='mluvqq4j_52';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js"

//Class
import {CClass} from "https://06fs4dix.github.io/Artgine/artgine/basic/CClass.js";
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
//Atelier
import {CPreferences} from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
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
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = true;

import {CAtelier} from "https://06fs4dix.github.io/Artgine/artgine/app/CAtelier.js";

import {CPlugin} from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json','Res.json','UI.json'],"");
var Main = gAtl.Canvas('Main.json');
var Res = gAtl.Canvas('Res.json');
var UI = gAtl.Canvas('UI.json');
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import {CObject} from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js"
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CTexture, CTextureInfo } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CFrame } from "https://06fs4dix.github.io/Artgine/artgine/util/CFrame.js";
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
import { CLoaderOption } from "https://06fs4dix.github.io/Artgine/artgine/util/CLoader.js";
import { CBGAttachButton, CModalChat, CModalEvent } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CStream } from "https://06fs4dix.github.io/Artgine/artgine/basic/CStream.js";
import { CBlackBoard } from "https://06fs4dix.github.io/Artgine/artgine/basic/CBlackBoard.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CShaderAttr } from "https://06fs4dix.github.io/Artgine/artgine/render/CShaderAttr.js";
import { CVec1 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec1.js";

import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CPool } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPool.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CSurfaceBloom } from "https://06fs4dix.github.io/Artgine/plugin/Bloom/Bloom.js";
import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CConfirm, CModal, CModalTitleBar } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CTimer } from "https://06fs4dix.github.io/Artgine/artgine/system/CTimer.js";
import { CScore } from "https://06fs4dix.github.io/Artgine/artgine/server/CScore.js";
import { CDOM } from "https://06fs4dix.github.io/Artgine/artgine/basic/CDOM.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint2D.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAniFlow.js";
import { CCanvasPluginSocket } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCanvasPluginSocket.js";
import { CRPAuto, CRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CRPMgr.js";
import { CCondition } from "https://06fs4dix.github.io/Artgine/artgine/util/CCondition.js";
import { CSurface } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSurface.js";
import { CCanvasPluginRPMgr } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCanvasPluginRPMgr.js";
import { CMat } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMat.js";
import { CSignalingClient } from "https://06fs4dix.github.io/Artgine/artgine/server/signaling/CSignalingClient.js";
import { PacketSN } from "https://06fs4dix.github.io/Artgine/artgine/server/signaling/PacketSN.js";


gAtl.Brush().GetCam2D().SetSize(600,800);
gAtl.Frame().PushEvent(CEvent.eType.Init,()=>{
    gAtl.Frame().Load().Exe("Res/shmup_effects/explosion1.png");
    gAtl.Frame().Load().Exe("Res/shmup_effects/flash5_64x64x4x2.png");
});

let back=Main.PushSub(new BackGround());


let gStartBtn=new CModalEvent("StartBtn");
gStartBtn.SetBody(`
        <div id="MainContainer" class="min-vh-100 d-flex flex-column align-items-center justify-content-center">
  <button type="button" class="btn btn-primary" style="font-size:120px; pointer-events:auto;" id="StartBtn">Start</button>
</div>
    `);
let gRoomKey="";
let gSuk="";
let gNick="";
let socket=new CSignalingClient(gPF.mServer=="local");
let gOwner=false;
let gTimer=new CTimer();


socket.On(PacketSN.eHeader.RoomConnectReq,(_stream : CStream)=>{
    let RoomConnectReq=PacketSN.RoomConnectReq(_stream);
    let userBB=CBlackBoard.Find<CSubject>("User");
    let user=userBB.Export(true,true);
    user.SetKey(RoomConnectReq.userKey);
    user.FindComp(CUserComp).SetNick(RoomConnectReq.nick);
    Main.PushSub(user);
    if(RoomConnectReq.userKey==socket.GetOwnerKey())
    {
        gRoomKey=RoomConnectReq.roomKey;
        gSuk=RoomConnectReq.userKey;
        gNick=RoomConnectReq.nick;
        //user.PatchTrackDefault();//패치할 오브젝트만 선택함
    }
    else
        user.FindChild("pad").SetEnable(false);
    //방장은 최초접속자라서 룸 권한을 가진다
    if(RoomConnectReq.owner==1)
    {
        gOwner=true;
    }
    else
    {
        //접속한 유저에게 내 정보를 보내준다
        let me=Main.Find(gSuk);
        let pos=me.GetPos();
        
        let dStream=new CStream();
        dStream.Push("Pos");
        dStream.Push(gSuk);
        dStream.Push(gNick);
        dStream.Push(pos);
        dStream.Push(new CVec3());
        socket.Send(PacketSN.SendDataUserKey([RoomConnectReq.userKey],dStream));
    }
});
socket.On(PacketSN.eHeader.RoomClose,(_stream : CStream)=>{
    if(gOwner)
    {
        Main.PushSub(new RoomSystem());
    }
    gStartBtn.Close();
    gTimer.Delay();

});
socket.On(PacketSN.eHeader.RoomDisConnect,(_stream : CStream)=>{
    let RoomDisConnect=PacketSN.RoomDisConnect(_stream);
    Main.Find(RoomDisConnect.userKey).Destroy();

});
socket.On(CPacShooting.eHeader.Dead,(_stream : CStream)=>{
    let packet=CPacShooting.Dead(_stream);
    if(gPF.mServer=="webServer")
    {
        CConfirm.List("Nick : <br><input type='text' id='nick_txt'/>",[async ()=>{
            let nick_txt=CDOM.IDValue("nick_txt");
            await CScore.Write("Shooting",nick_txt,gTimer.Delay());
            CScore.Read("Shooting");
        }]);
    }
    
    chat.ChatAdd(packet.nick+"플레이어가 죽었습니다. time : "+gTimer.Delay());

});
socket.On(CPacShooting.eHeader.UserShot,(_stream : CStream)=>{


    let packet=CPacShooting.UserShot(_stream);
    let ball=new CSubject();
    let pt=new CPaint2D("Res/shmup_obj/airplane_05_48x48_002.png");
    pt.PushTag("bloom");
    pt.PushCShaderAttr(new CShaderAttr("mask",new CVec1(1.0)));
    ball.PushComp(pt);
    let cl=new CCollider(pt);
    cl.SetLayer("shot")
    cl.SetCameraOut(true);
    cl.PushCollisionLayer("mon");
    ball.PushComp(cl);
    let rb=new CRigidBody();
    rb.Push(new CForce("move",CVec3.Up(),500));
    ball.PushComp(rb);
    ball.PushComp(new CBulletComp());
    packet.pos.z-=0.1;
    ball.SetPos(packet.pos);
    ball.SetKey("bullet"+ball.Key());

    Main.PushSub(ball);
});
socket.On(CPacShooting.eHeader.Pos,(_stream : CStream)=>{
    let packet=CPacShooting.Pos(_stream);

    let user=Main.Find(packet.suk) as CSubject;
    if(user==null)
    {
        let userPF=CBlackBoard.Find<CSubject>("User");
        user=userPF.Export();
        user.SetKey(packet.suk);
        //user.FindComp(CUserComp).SetNick(packet.nick)
        Main.PushSub(user);
        user.FindChild("pad").SetEnable(false);
        
    }
    user.SetPos(packet.pos);
    let rb=user.FindComp(CRigidBody);
    rb.Clear();
    rb.Push(new CForce("move",packet.dir,400));
});
//pool을 사용하면 재활용 된다
CPool.On("Monster",()=>{
    let Mon=CBlackBoard.Find<CSubject>("Monster");
    let mon=Mon.Export(true,true) as CSubject;
    
    mon.FindComp(CRigidBody).Push(new CForce("move",new CVec3(0,-1),100));
    return mon;
},CPool.ePool.Product);

socket.On(CPacShooting.eHeader.MonCreate,async (_stream : CStream)=>{
    let packet=CPacShooting.MonCreate(_stream);
    let mon=await CPool.Product<CSubject>("Monster");
    if(mon.GetFrame()!=null)
    {
        CConsol.Log(packet.monKey);
    }   
    mon.SetKey(packet.monKey);
    mon.SetPos(packet.pos);
    mon.FindComp(CProComp).SetHP(5+packet.type*5);
    
    Main.PushSub(mon);
    //
});
socket.On(CPacShooting.eHeader.Effect,(stream : CStream)=>{
    let packet=CPacShooting.Effect(stream);

    packet.pos.z=1;
    let flash=new CSubject();
    flash.SetPos(packet.pos);
    let size=new CVec2(50,50);
    
        
    let pt = new CPaint2D(null,size);
    pt.PushTag("bloom");
    if(packet.key=="Explosion")
    {
        pt.SetPivot(new CVec3(0,-1,0));
    }
    
    //특정 오브젝트만 블룸값을 조절할수 있다
    //지금은 전체 오브젝트 줄임
    pt.PushCShaderAttr(new CShaderAttr("mask",new CVec1(0.1)));
    flash.PushComp(pt);
    let af=flash.PushComp(new CAniFlow(packet.key));
    af.SetSpeed(1.5);
    Main.PushSub(flash);
});

socket.Connect().then(()=>{
    if(socket.mAddrPortPath=="local")
    {
        gStartBtn.SetChangeEvent(()=>{
            //socket.Send(new CStream().Push("RoomConnect").Push(1).Push(socket.GetUserKey()).Push("User").Push("").Data());
            socket.Send(PacketSN.RoomConnectReq(1,socket.GetOwnerKey(),"User",""));
            socket.Send(PacketSN.RoomClose(gRoomKey));
        });
    }
    else
    {
        socket.Send(PacketSN.RoomConnectAck("User"+Math.trunc(Math.random()*100),"Shooting",2));
        gStartBtn.SetChangeEvent(()=>{
            socket.Send(PacketSN.RoomClose(gRoomKey));
        });
    }
        
        
    Main.PushPlugin(new CCanvasPluginSocket(socket));

});

let chat=new CModalChat("chatModal");
chat.SetPosition(gAtl.PF().mLeft,gAtl.PF().mTop);
chat.Open();
chat.SetSize(gAtl.PF().mWidth*0.4,gAtl.PF().mHeight*0.2);
chat.ChatAdd("스타트를 누르기전까지 기다립니다.");
chat.On(CEvent.eType.Chat,(msg)=>{
    socket.Send(PacketSN.SendData("Chat",gNick+" : "+msg));
});
socket.On("Chat",(_stream : CStream)=>{
    chat.ChatAdd(_stream.GetString());
});

gAtl.Frame().PushEvent(CEvent.eType.Resize,new CEvent(()=>{
    chat.SetPosition(gAtl.PF().mLeft,gAtl.PF().mTop);
    chat.SetSize(gAtl.PF().mWidth*0.5,gAtl.PF().mHeight*0.4);
}))


CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Bloom", async () => {

    let BloomRPM=new CRPMgr();
    let emissiveTex=new CTexture();
    emissiveTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
    let emissiveTexKey=BloomRPM.PushTex("emissiveTex.tex",emissiveTex);
    let rp=BloomRPM.PushRP(new CRPAuto());
    rp.PushAnd(new CCondition("class","==","CPaint2D"));
    rp.PushAnd(new CCondition("mTag[bloom]"));
    rp.mShader=gAtl.Frame().Pal().Sl2DKey();
    rp.mRenderTarget=emissiveTexKey;
    rp.mTag.add("mask");


    let basiceTex=new CTexture();
    basiceTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8,1)]);
    let basiceTexKey=BloomRPM.PushTex("basiceTex.tex",basiceTex);
    rp=BloomRPM.PushRP(new CRPAuto());
    rp.PushAnd(new CCondition("class","==","CPaint2D"));
    rp.mShader=gAtl.Frame().Pal().Sl2DKey();
    rp.mRenderTarget=basiceTexKey;


    let sufBloom=BloomRPM.PushSuf(new CSurfaceBloom()) as CSurfaceBloom;
    let srp=sufBloom.GetRP();
    srp.mShader=gAtl.Frame().Pal().Sl2DKey();
    srp.mTag.add("blit");
    srp.mShaderAttr.push(new CShaderAttr(0,emissiveTexKey));
    // sufBloom.m_intensity = 100.0;
    // sufBloom.m_threshold = 1.0;
    // sufBloom.m_softThreshold = 1.0;
    // sufBloom.m_lowFrequencyBoost = 20.0;
    // sufBloom.m_lowFrequencyBoostCurvation = 0.95;
    // sufBloom.m_highPassFrequency = 1.0;
    // sufBloom.Refresh();


    

    let sufLast=BloomRPM.PushSuf(new CSurface());
    srp=sufLast.GetRP();
    sufLast.SetUseRT(false);


    srp.mShader=gAtl.Frame().Pal().SlPostKey();
    srp.mTag.add("blend");
    srp.mShaderAttr.push(new CShaderAttr(0,basiceTexKey));
    srp.mShaderAttr.push(new CShaderAttr(1,sufBloom.GetTexKey()));
    srp.mShaderAttr.push(new CShaderAttr("TexOffBlendFactor",new CMat([1,1,CRenderPass.eBlend.LinearDodge])));
    //srp.mShaderAttr.push(new CShaderAttr("blend", 1, CRenderPass.eBlend.LinearDodge));
    //srp.mShaderAttr.push(new CShaderAttr("opacity",1,1));

    Main.PushPlugin(new CCanvasPluginRPMgr(BloomRPM));
}));
CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Basic", async () => {
    Main.RemovePlugin(CCanvasPluginRPMgr);
}));



let Option_btn=new CBGAttachButton("DevToolModal",101,new CVec2(320,120));
//gAtl.Frame().Win().HtmlPush(Option_btn);
Option_btn.SetTitleText("Option");
Option_btn.SetContent(`
<div>
    블룸,기본 설정 가능
</div>`);
if(gPF.mServer=="webServer")    CScore.Read("Shooting");







































