import "https://06fs4dix.github.io/Artgine/artgine/artgine.js";
import { CClass } from "https://06fs4dix.github.io/Artgine/artgine/basic/CClass.js";
import { ULPCChar } from "./ULPCChar.js";
CClass.Push(ULPCChar);
import { CPreferences } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
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
gPF.mCanvas = "";
gPF.mWASM = false;
gPF.mServer = 'webServer';
gPF.mGitHub = true;
gPF.mVersion = "mp6zcg65_12";
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CCamCon2DFollow } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CUtil } from "https://06fs4dix.github.io/Artgine/artgine/basic/CUtil.js";
import { CUtilWeb } from "https://06fs4dix.github.io/Artgine/artgine/util/CUtilWeb.js";
let Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("2D");
gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFollow(gAtl.Frame().Input()));
const hero = new ULPCChar();
const jsonParam = CUtilWeb.Parameter('json');
if (jsonParam) {
    hero.SetupFromData(CUtil.Base64ToString(jsonParam));
}
else {
    hero.Setup("ulpc_selection.json");
}
hero.PushChild(new CPad()).mSave = false;
Main.PushSub(hero);
const KEY_ANIM = {
    '1': 'slash', '2': 'thrust', '3': 'spellcast', '4': 'shoot',
    '5': 'backslash', '6': 'halfslash', '7': 'run', '8': 'emote',
    '9': 'jump', '0': 'sit', 'h': 'hurt', 'c': 'climb',
    'g': 'combat_idle',
};
window.addEventListener('keydown', (e) => {
    const anim = KEY_ANIM[e.key.toLowerCase()];
    if (anim) {
        hero.mState = anim;
        hero.mLockState = true;
    }
});
window.addEventListener('keyup', (e) => {
    if (KEY_ANIM[e.key.toLowerCase()]) {
        hero.mLockState = false;
        hero.mState = 'idle';
    }
});
const guide = document.createElement('div');
guide.style.cssText = [
    'position:fixed', 'top:12px', 'left:12px',
    'background:rgba(0,0,0,0.55)', 'color:#fff',
    'font:13px/1.6 monospace', 'padding:10px 14px',
    'border-radius:8px', 'pointer-events:none', 'z-index:9000',
    'white-space:pre',
].join(';');
guide.textContent = [
    '방향키  walk',
    '─────────────',
    '1  slash      2  thrust',
    '3  spellcast  4  shoot',
    '5  backslash  6  halfslash',
    '7  run        8  emote',
    '9  jump       0  sit',
    'H  hurt       C  climb',
    'G  combat_idle',
    '',
    '(키 누르는 동안 재생)',
].join('\n');
document.body.appendChild(guide);
