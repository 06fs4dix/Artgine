const version = 'mluvqq4j_47';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js";
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
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = true;
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json'], "");
var Main = gAtl.Canvas('Main.json');
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CCamCon2DFollow } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CPlane } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CPlane.js";
import { CScore } from "https://06fs4dix.github.io/Artgine/artgine/server/CScore.js";
import { CConfirm } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CDOM } from "https://06fs4dix.github.io/Artgine/artgine/basic/CDOM.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint2D.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/render/CColor.js";
import CBehavior from "https://06fs4dix.github.io/Artgine/artgine/app/component/CBehavior.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAniFlow.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CSMComp } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CSMComp.js";
import { CSMP } from "https://06fs4dix.github.io/Artgine/artgine/util/CStateMachine.js";
import { CCondition } from "https://06fs4dix.github.io/Artgine/artgine/util/CCondition.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CAction } from "https://06fs4dix.github.io/Artgine/artgine/util/CAction.js";
gAtl.Brush().GetCam2D().SetSize(600, 800);
let camcon = gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFollow(gAtl.Frame().Input()));
let back = Main.PushSub(new CSubject());
back.SetPos(new CVec3(0, 0, -1));
let bpt = back.PushComp(new CPaint2D(gAtl.Frame().Pal().GetBlackTex(), new CVec2(600, gAtl.PF().mHeight)));
bpt.SetColorModel(new CColor(0.6, 0.8, 1, CColor.eModel.RGBAdd));
class CCameraOutComp extends CBehavior {
    CameraOut(_pArr) {
        for (let pi of _pArr) {
            if (pi.mPlane == CPlane.eDir.Bottom && pi.mLen > -1.5) {
                this.GetOwner().Destroy();
            }
        }
    }
}
function CreateBrick(_type, _per = 1) {
    let brick = Main.PushSub(new CSubject());
    let pt = brick.PushComp(new CPaint2D("Res/brick-" + _type + ".png"));
    pt.SetColorModel(new CColor(_per, _per, _per, CColor.eModel.RGBMul));
    if (_type == 2)
        pt.SetPos(new CVec3(0, 8));
    let cl = brick.PushComp(new CCollider(pt));
    cl.SetCameraOut(true);
    if (_type == 2)
        cl.SetOneWay(3.14);
    brick.PushComp(new CCameraOutComp());
    cl.SetLayer("brick");
    return brick;
}
for (let i = -9; i <= 9; ++i) {
    let brick = CreateBrick(1);
    brick.SetPos(new CVec3(i * 32, 0, 1));
}
let brickStair = CreateBrick(1);
brickStair.SetPos(new CVec3(200, 32, 1));
brickStair.FindComp(CCollider).SetStairs(true);
brickStair = CreateBrick(1);
brickStair.SetPos(new CVec3(232, 64, 1));
brickStair.FindComp(CCollider).SetStairs(true);
let mary = Main.PushSub(new CSubject());
mary.SetPos(new CVec3(0, 32));
mary.SetKey("mary");
let pt = mary.PushComp(new CPaint2D("Res/mary.png", new CVec2(40, 47)));
let cl = mary.PushComp(new CCollider(pt));
cl.SetLayer("mary");
cl.PushCollisionLayer("brick");
cl.SetCameraOut(true);
let rb = mary.PushComp(new CRigidBody());
cl.SetRestitution(1);
rb.SetGravity(1);
let af = mary.PushComp(new CAniFlow("MaryStand"));
af.SetSpeed(0.4);
let pad = mary.PushChild(new CPad());
let sm = mary.PushComp(new CSMComp());
sm.GetSM().PushPattern(new CSMP([new CCondition("Jump", "!="), new CCondition("move", "!="), new CCondition("Fall", "!="), new CCondition("Down", "!=")], new CAction(CAction.eType.Message, "Default")));
sm.GetSM().PushPattern(new CSMP([new CCondition("move"), new CCondition("Jump", "!=")], new CAction(CAction.eType.Message, "MaryWalk")));
sm.GetSM().PushPattern(new CSMP([new CCondition("move" + CVec3.eDir.Left)], new CAction(CAction.eType.Message, "Left")));
sm.GetSM().PushPattern(new CSMP([new CCondition("move" + CVec3.eDir.Right)], new CAction(CAction.eType.Message, "Right")));
sm.GetSM().PushPattern(new CSMP([new CCondition("Jump")], new CAction(CAction.eType.Message, "MaryJumpStart")));
sm.GetSM().PushPattern(new CSMP([new CCondition("Jump"), new CCondition("MaryJumpStartStop")], new CAction(CAction.eType.Message, "MaryJumpLoop")));
sm.GetSM().PushPattern(new CSMP([new CCondition("Down"), new CCondition("Jump", "!="), new CCondition("move", "!=")], new CAction(CAction.eType.Message, "MaryDown")));
sm.GetSM().PushPattern(new CSMP([new CCondition("Fall"), new CCondition("Jump", "!=")], new CAction(CAction.eType.Message, "MaryJumpStart")));
sm.GetSM().PushPattern(new CSMP([new CCondition("Fall"), new CCondition("MaryJumpStartStop", "!=")], new CAction(CAction.eType.Message, "MaryJumpLoop")));
sm["Default"] = () => {
    af.ResetAni("MaryStand");
};
sm["MaryWalk"] = () => {
    af.ResetAni("MaryWalk");
};
sm["Left"] = () => {
    pt.SetReverse(true, false);
};
sm["Right"] = () => {
    pt.SetReverse(false, false);
};
sm["MaryJumpStart"] = () => {
    af.ResetAni("MaryJumpStart");
};
sm["MaryJumpLoop"] = () => {
    af.ResetAni("MaryJumpLoop");
};
sm["MaryDown"] = () => {
    af.ResetAni("MaryDown");
};
let beforeCamY = 0;
mary.Update = (_update) => {
    let dir = pad.GetDir();
    if (dir.y < 0)
        sm.GetSM().SetStateValue("Down", 1);
    else
        sm.GetSM().SetStateValue("Down", 0);
    if (dir.x > 0)
        rb.Push(new CForce("move", new CVec3(1, 0, 0), 200));
    else if (dir.x < 0)
        rb.Push(new CForce("move", new CVec3(-1, 0, 0), 200));
    else
        rb.Remove("move");
    if (pad.GetButtonEvent(0) == CEvent.eType.Click && rb.IsJump() == false && rb.IsFall() == false) {
        var jump = new CForce("jump");
        jump.SetDirVel(new CVec3(0, 1), 600, new CVec3(0, 1), 300);
        jump.SetDelay(0.5);
        jump.mRemove = true;
        rb.Push(jump);
    }
    if (beforeCamY < mary.GetPos().y) {
        beforeCamY = mary.GetPos().y;
        camcon.SetPos(new CVec3(0, beforeCamY));
    }
    BlockChk();
};
mary["CameraOut"] = async (_pArr) => {
    for (let p of _pArr) {
        if (p.mLen > 1 && p.mPlane == CPlane.eDir.Bottom) {
            mary.Destroy();
            if (gPF.mServer == "webServer") {
                CConfirm.List("Nick : <br><input type='text' id='nick_txt'/>", [async () => {
                        let nick_txt = CDOM.IDValue("nick_txt");
                        await CScore.Write("SideScroll", nick_txt, maxBlockY);
                        CScore.Read("SideScroll");
                    }]);
            }
        }
    }
};
let maxBlockY = 150;
function BlockChk() {
    let pos = mary.GetPos();
    let yb = Math.trunc(maxBlockY * 0.10) % 3;
    if (maxBlockY < pos.y + 800 && yb % 4 == 0) {
        let per = 1 - maxBlockY * 0.0001;
        if (per < 0)
            per = 0;
        let back = Main.PushSub(new CSubject());
        let pt = back.PushComp(new CPaint2D(gAtl.Frame().Pal().GetBlackTex(), new CVec2(600, 150)));
        pt.SetColorModel(new CColor(0.6 * per, 0.8 * per, 1 * per, CColor.eModel.RGBAdd));
        back.SetPos(new CVec3(0, maxBlockY, -1));
        back.PushComp(new CCameraOutComp());
        for (let i = -9; i <= 9; ++i) {
            if (Math.random() < 0.6)
                continue;
            let type = Math.trunc(Math.random() + 1.2);
            let brick = CreateBrick(type, per);
            brick.SetPos(new CVec3(i * 32, maxBlockY, 1));
        }
        maxBlockY += 150;
    }
}
if (gPF.mServer == "webServer")
    CScore.Read("SideScroll");
