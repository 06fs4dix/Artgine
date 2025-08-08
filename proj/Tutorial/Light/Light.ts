//Version
const version='2025-08-07 14:45:48';
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
gPF.mServer = 'webServer';

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
CPlugin.PushPath('ShadowPlane','../../../plugin/ShadowPlane/');
import "../../../plugin/ShadowPlane/ShadowPlane.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json']);
var Main = gAtl.Canvas('Main.json');

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CAlert } from "../../../artgine/basic/CAlert.js";
import { CMonacoViewer } from "../../../artgine/util/CModalUtil.js";
import { CUtilWeb } from "../../../artgine/util/CUtilWeb.js";
import { CModal } from "../../../artgine/basic/CModal.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CTimer } from "../../../artgine/system/CTimer.js";
import { CScript } from "../../../artgine/util/CScript.js";

//Main.Find("House").PushComp(new CPlaneShadow());
CAlert.Info("f3로 개발모드에서 라이팅 위치와 값을 수정해 보세요",60*1000);



// let source=`
// import {CModal} from "artgine/basic/CModal.js"
// export function RoomStart1(_data )
// {
//     if(_data[0].test==0)
//         return "Test";
    
//     return null; //0 false
// }
// export function RoomStart0(_data )
// {
//     if(_data[0].test==0)
//         return "Test";
    
//     return null; //0 false
// }
// export function RoomStart2(_data )
// {
//     if(_data[0].test==0)
//         return "Test";
//     CModal.FindModal("test");
//     return null; //0 false
// }
// `;
// CScript.Build("test",await CUtilWeb.TSToJS(await CUtilWeb.TSImport(source,false)));
// new CMonacoViewer(source,"test.ts");
