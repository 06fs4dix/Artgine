//Import
//Class

//Atelier
import CPreferences from "../../lib/artgine/core/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "GL";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = false;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDevTool = true;
gPF.mIAuto = true;
gPF.mWASM = false;

//EntryPoint
import "../../lib/artgine/core/Core.js"
import CObject from "../../lib/artgine/core/basic/CObject.js"