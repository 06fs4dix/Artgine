//Version
const version='mf2jnnjd_2';
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


import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPluging.js";
CPlugin.PushPath('test','../../../plugin/test/')
import "../../../plugin/test/test.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json']);
var Main = gAtl.Canvas('Main.json');

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CConsol } from "../../../artgine/basic/CConsol.js";
import { CPool } from "../../../artgine/basic/CPool.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CRPMgr } from "../../../artgine/canvas/CRPMgr.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CFrame } from "../../../artgine/util/CFrame.js";
import { CInput } from "../../../artgine/system/CInput.js";
import { CAlert } from "../../../artgine/basic/CAlert.js";

//플러그인에서 정의한 클래스 사용
let CTest=CClass.New("CTest");
CConsol.Log(CTest["v"]);

//플러그인에서 설정한 생산자를 이용
Main.PushSub(await CPool.Product<CSubject>("test"));

//플러그인에서 RPMgr가져오기
let rpMgr=gAtl.Frame().Res().Find("testUVRPMgr") as CRPMgr;
Main.SetRPMgr(rpMgr);


gAtl.Frame().PushEvent(CEvent.eType.Update,()=>{
    if(CFrame.Main().Input().KeyUp(CInput.eKey.Num1))
    {
        let rpMgr=gAtl.Frame().Res().Find("testRPMgr") as CRPMgr;
        Main.SetRPMgr(rpMgr);
    }
    if(CFrame.Main().Input().KeyUp(CInput.eKey.Num2))
    {
        let rpMgr=gAtl.Frame().Res().Find("testUVRPMgr") as CRPMgr;
        Main.SetRPMgr(rpMgr);
    }
});

CAlert.Info("숫자1,2로 플러그인에서 만든 정보로 RP를 변경합니다",60*1000);