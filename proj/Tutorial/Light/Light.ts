//Version
const version='2025-07-25 10:31:10';
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

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPluging} from "../../../artgine/util/CPluging.js";
CPluging.PushPath('ShadowPlane','../../../plugin/ShadowPlane/');
import "../../../plugin/ShadowPlane/ShadowPlane.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json']);
var Main = gAtl.Canvas('Main.json');

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CAlert } from "../../../artgine/basic/CAlert.js";

//Main.Find("House").PushComp(new CPlaneShadow());
CAlert.Info("f3로 개발모드에서 라이팅 위치와 값을 수정해 보세요",60*1000);


