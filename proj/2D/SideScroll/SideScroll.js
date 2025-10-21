const version = 'mgynxomz_13';
import "../../../artgine/artgine.js";
import { CPreferences } from "../../../artgine/basic/CPreferences.js";
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
gPF.mGitHub = false;
import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json'], "");
var Main = gAtl.Canvas('Main.json');
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CAniFlow } from "../../../artgine/canvas/component/CAniFlow.js";
import { CPad } from "../../../artgine/canvas/subject/CPad.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import { CRigidBody } from "../../../artgine/canvas/component/CRigidBody.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CForce } from "../../../artgine/canvas/component/CForce.js";
import { CAction, CCondition, CSMP } from "../../../artgine/util/CStateMachine.js";
import { CSMComp } from "../../../artgine/canvas/component/CSMComp.js";
let back = Main.PushSub(new CSubject());
back.PushComp(new CPaint2D("Res/back.jpg", new CVec2(gAtl.PF().mWidth, gAtl.PF().mHeight)));
function CreateBrick() {
    let brick = Main.PushSub(new CSubject());
    let pt = brick.PushComp(new CPaint2D("Res/brick-1.png"));
    let cl = brick.PushComp(new CCollider(pt));
    cl.SetLayer("brick");
    return brick;
}
for (let i = 0; i < 20; ++i) {
    let brick = CreateBrick();
    brick.SetPos(new CVec3(-gAtl.PF().mWidth * 0.5 + i * 32, 0, 1));
}
for (let i = 0; i < 40; ++i) {
    let brick = CreateBrick();
    brick.SetPos(new CVec3(-gAtl.PF().mWidth * 0.5 + i * 32, -gAtl.PF().mHeight * 0.5 + 32, 1));
}
for (let i = 1; i < 10; ++i) {
    let brick = CreateBrick();
    brick.FindComp(CCollider).SetStairs(true);
    brick.SetPos(new CVec3(-gAtl.PF().mWidth * 0.5 + i * 32 + 500, -gAtl.PF().mHeight * 0.5 + 96 + i * 32, 1));
}
let mary = Main.PushSub(new CSubject());
mary.SetKey("mary");
let pt = mary.PushComp(new CPaint2D("Res/mary.png", new CVec2(52, 62)));
let cl = mary.PushComp(new CCollider(pt));
cl.SetLayer("mary");
cl.PushCollisionLayer("brick");
let rb = mary.PushComp(new CRigidBody());
cl.SetRestitution(1);
rb.SetGravity(1);
let af = mary.PushComp(new CAniFlow("MaryStand"));
af.SetSpeed(0.4);
let pad = mary.PushChild(new CPad());
let sm = mary.PushComp(new CSMComp());
let test = sm.GetSM();
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
mary.Update = () => {
    let dir = pad.GetDir();
    if (dir.y < 0)
        sm.GetSM().GetState()["Down"] = 1;
    else
        sm.GetSM().GetState()["Down"] = 0;
    if (dir.x > 0)
        rb.Push(new CForce("move", new CVec3(1, 0, 0), 200));
    else if (dir.x < 0)
        rb.Push(new CForce("move", new CVec3(-1, 0, 0), 200));
    else
        rb.Remove("move");
    if (pad.GetButtonEvent(0) == CEvent.eType.Click) {
        var jump = new CForce("jump");
        jump.SetDirVel(new CVec3(0, 1), 500, new CVec3(0, 1), 200);
        jump.SetDelay(500);
        jump.mRemove = true;
        rb.Push(jump);
    }
};
