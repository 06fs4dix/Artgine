//Version
const version='mf7fleec_3';
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
gPF.mWASM = false;
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = true;

import {CAtelier} from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";

import {CPlugin} from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json'],"");
var Main = gAtl.Canvas('Main.json');
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import { CObject } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js"
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CAniFlow.js";
import { CInput } from "https://06fs4dix.github.io/Artgine/artgine/system/CInput.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CPad.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CCollider.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CRigidBody.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CForce.js";
import { CSMA, CSMComp, CSMC, CSMP } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CStateMachine.js";
import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CFileViewer } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CPath } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPath.js";
import { CString } from "https://06fs4dix.github.io/Artgine/artgine/basic/CString.js";
import { CCanvas } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CCanvas.js";
import { CUtilWeb } from "https://06fs4dix.github.io/Artgine/artgine/util/CUtilWeb.js";


let back = Main.PushSub(new CSubject());
back.PushComp(new CPaint2D("Res/back.jpg", new CVec2(gAtl.PF().mWidth, gAtl.PF().mHeight)));

//맵만들기
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
    brick.SetPos(new CVec3(-gAtl.PF().mWidth * 0.5 + i * 32 + 500, -gAtl.PF().mHeight * 0.5 + 96 + i * 32, 1));
}

//캐릭터 설정
let mary = Main.PushSub(new CSubject());
mary.SetKey("mary");
let pt = mary.PushComp(new CPaint2D("Res/mary.png", new CVec2(52, 62)));
let cl = mary.PushComp(new CCollider(pt));
cl.SetLayer("mary");
cl.PushCollisionLayer("brick");
let rb = mary.PushComp(new CRigidBody());
rb.SetRestitution(1);
rb.SetGravity(true);
let af = mary.PushComp(new CAniFlow("MaryStand"));
af.SetSpeed(0.4);
let pad = mary.PushChild(new CPad());

//상태머신
let sm = mary.PushComp(new CSMComp());

let test=sm.GetSM();
// sm.GetSM().PushPattern({
//     "and":[
//         {"mState":"Jump","mOperator":"!=","mValue":1},
//         {"s":"Jump","o":"!=","v":1},
//         {"s":"Fall","o":"!=","v":1},
//         {"s":"Down","o":"!=","v":1}
//     ],
//     "exe":[{"t":"Message","a":"MaryWalk"}]
// });
sm.GetSM().PushPattern(new CSMP([new CSMC("Jump","!="),new CSMC("move","!="),new CSMC("Fall","!="),new CSMC("Down","!=")],new CSMA(CSMA.eType.Message,"Default")));
sm.GetSM().PushPattern(new CSMP([new CSMC("move"),new CSMC("Jump","!=")],new CSMA(CSMA.eType.Message,"MaryWalk")));
sm.GetSM().PushPattern(new CSMP([new CSMC("move"+CVec3.eDir.Left)],new CSMA(CSMA.eType.Message,"Left")));
sm.GetSM().PushPattern(new CSMP([new CSMC("move"+CVec3.eDir.Right)],new CSMA(CSMA.eType.Message,"Right")));


sm.GetSM().PushPattern(new CSMP([new CSMC("Jump")],new CSMA(CSMA.eType.Message,"MaryJumpStart")));
sm.GetSM().PushPattern(new CSMP([new CSMC("Jump"),new CSMC("MaryJumpStartStop")],new CSMA(CSMA.eType.Message,"MaryJumpLoop")));

sm.GetSM().PushPattern(new CSMP([new CSMC("Down"),new CSMC("Jump","!="),new CSMC("move","!=")],new CSMA(CSMA.eType.Message,"MaryDown")));

sm.GetSM().PushPattern(new CSMP([new CSMC("Fall"),new CSMC("Jump","!=")],new CSMA(CSMA.eType.Message,"MaryJumpStart")));
sm.GetSM().PushPattern(new CSMP([new CSMC("Fall"),new CSMC("MaryJumpStartStop","!=")],new CSMA(CSMA.eType.Message,"MaryJumpLoop")));




sm["Default"]= () => {
    af.ResetAni("MaryStand");
};
sm["MaryWalk"]= () => {
    af.ResetAni("MaryWalk");
};
sm["Left"]= () => {
    pt.SetReverse(true, false);
};
sm["Right"]= () => {
    pt.SetReverse(false, false);
};
sm["MaryJumpStart"]= () => {
    af.ResetAni("MaryJumpStart");
};
sm["MaryJumpLoop"]= () => {
    af.ResetAni("MaryJumpLoop");
};
sm["MaryDown"]= () => {
    af.ResetAni("MaryDown");
};
//키조작시 이동처리
mary.Update = () => {
    let dir = pad.GetDir();

    if (dir.y < 0)
        sm.GetSM().GetState()["Down"]=1;
    else
        sm.GetSM().GetState()["Down"]=0;


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












