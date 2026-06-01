//Version
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
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = false;
gPF.mVersion = "mpufvoga_12";

import {CAtelier} from "../../../artgine/app/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
CPlugin.PushPath('ShadowPlane','../../../plugin/ShadowPlane/');
import "../../../plugin/ShadowPlane/ShadowPlane.js"
CPlugin.PushPath('Water','../../../plugin/Water/');
import "../../../plugin/Water/Water.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json'],"");
var Main = gAtl.Canvas('Main.json');
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CAlert } from "../../../artgine/basic/CAlert.js";
import { CMonacoViewer } from "../../../artgine/util/CModalUtil.js";
import { CUtilWeb } from "../../../artgine/util/CUtilWeb.js";
import { CModal } from "../../../artgine/basic/CModal.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CTimer } from "../../../artgine/system/CTimer.js";
import { CScript } from "../../../artgine/util/CScript.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CPaint2D } from "../../../artgine/app/component/paint/CPaint2D.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CPaint } from "../../../artgine/app/component/paint/CPaint.js";

//Main.Find("House").PushComp(new CPlaneShadow());
CAlert.Info("f3로 개발모드에서 라이팅 위치와 값을 수정해 보세요",60*1000);

// let sub=Main.PushSub(new CSubject());
// sub.SetPos(new CVec3(-200,0));
// let pt=sub.PushComp(new CPaint2D("Res/01.png",new CVec2(128,128)));
// //pt.PushTag("tail");
// pt.PushTag("shadowProj");


