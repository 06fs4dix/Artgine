//Version
import "../../../artgine/artgine.js"

//Class
import {CClass} from "../../../artgine/basic/CClass.js";
import { ULPCChar } from "./ULPCChar.js";
CClass.Push(ULPCChar);
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
gPF.mVersion = "mpul7pt0_16";

import {CAtelier} from "../../../artgine/app/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import { CCamCon2DFollow } from "../../../artgine/util/CCamCon.js";
import { CPad } from "../../../artgine/app/subject/CPad.js";
import { CParserULPC } from "../../../artgine/util/parser/CParserULPC.js";

let Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("2D");
gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFollow(gAtl.Frame().Input()));

//CParserULPC.SetGlobalResBase("../../../big/ULPC");
//CParserULPC.SetGlobalResBase("../../../big/NEW_ULPC");

const hero = new ULPCChar();
//hero.Setup("sample.json");
hero.Setup("ulpc_selection.json");
hero.PushChild(new CPad()).mSave = false;
Main.PushSub(hero);

// ===== 애니메이션 테스트 키 입력 =====
const KEY_ANIM: Record<string, string> = {
    '1': 'slash',      '2': 'thrust',    '3': 'spellcast', '4': 'shoot',
    '5': 'backslash',  '6': 'halfslash', '7': 'run',       '8': 'emote',
    '9': 'jump',       '0': 'sit',       'h': 'hurt',      'c': 'climb',
    'g': 'combat_idle',
};

window.addEventListener('keydown', (e: KeyboardEvent) => {
    const anim = KEY_ANIM[e.key.toLowerCase()];
    if (anim) { hero.mState = anim; hero.mLockState = true; }
});
window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (KEY_ANIM[e.key.toLowerCase()]) { hero.mLockState = false; hero.mState = 'idle'; }
});

// ===== 키 가이드 오버레이 =====
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






















