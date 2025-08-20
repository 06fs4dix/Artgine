//Version
const version='2025-08-13 11:05:14';
import "../../../artgine/artgine.js"

//Class
import {CClass} from "../../../artgine/basic/CClass.js";

//Atelier
import {CPreferences} from "../../../artgine/basic/CPreferences.js";
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
gPF.mServer = 'local';
gPF.mGitHub = false;

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json']);
var Main = gAtl.Canvas('Main.json');
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";

import { CModal, CModalTitleBar } from "../../../artgine/basic/CModal.js";
import { CWind } from "../../../artgine/canvas/component/CWind.js";
import { CBGAttachButton } from "../../../artgine/util/CModalUtil.js";


let gXSize=10;
let gYSize=10;
for(let y=-gYSize;y<=gYSize;++y)
{
    for(let x=-gXSize;x<=gXSize;++x)
    {
        let sub=Main.Push(new CSubject());
        let pt=sub.PushComp(new CPaint2D("Res/grass.png",new CVec2(50,50)));
        sub.SetPos(new CVec3(x*50,y*50));
        pt.SetWindInfluence(100);
        //pt.SetWindInfluence(1);
    }
}

let sub=Main.Push(new CSubject());
let pt=sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
let wind=sub.PushComp(new CWind());

CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Global",()=>{
    wind.SetDirect(new CVec3(1,0,0));
    wind.SetInnerOuter(0,0);
    wind.SetFrequency(1);
}));

CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Pos",()=>{
    wind.SetDirect(new CVec3(0,0,0));
    wind.SetInnerOuter(100,500);
    wind.SetFrequency(10);
}));
//3D 오브젝트는 본이 있으면 윈드로 작동함

let Help=new CBGAttachButton("DevToolModal",101,new CVec2(320,240));
//gAtl.Frame().Win().HtmlPush(Option_btn);
Help.SetTitleText("Help");
Help.SetContent(`
<div>
[Global] Global Wind, [Pos]Local Wind
</div>`);