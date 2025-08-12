const version = '2025-08-12 16:32:47';
import "../../../artgine/artgine.js";
import { CClass } from "../../../artgine/basic/CClass.js";
import { CUser } from "./CUser.js";
CClass.Push(CUser);
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
gPF.mServer = 'local';
gPF.mGitHub = false;
import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
import { CPlugin } from "../../../artgine/util/CPlugin.js";
CPlugin.PushPath('ShadowPlane', '../../../plugin/ShadowPlane/');
import "../../../plugin/ShadowPlane/ShadowPlane.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json', 'Real.json']);
var Main = gAtl.Canvas('Main.json');
var Real = gAtl.Canvas('Real.json');
let comcon = gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFollow(gAtl.Frame().Input()));
gAtl.Brush().GetCam2D().Set2DZoom(1.5);
import { CCIndex } from "../../../artgine/canvas/CCIndex.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CBlackBoard } from "../../../artgine/basic/CBlackBoard.js";
import { CBlackboardModal } from "../../../artgine/util/CModalUtil.js";
import { CModal, CModalTitleBar } from "../../../artgine/basic/CModal.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CCamCon2DFollow } from "../../../artgine/util/CCamCon.js";
import { CSysAuth } from "../../../artgine/system/CSysAuth.js";
import { CAudioTag } from "../../../artgine/system/audio/CAudio.js";
{
    const backVoxel = Main.Find("BackGround");
    if (backVoxel) {
        const decoNames = ["LTree", "MTree", "Flower1", "Flower2"];
        const decoObjs = decoNames.map(name => CBlackBoard.Find(name)).filter(obj => obj && obj.Export);
        const width = backVoxel.mCount?.x || 0;
        const height = backVoxel.mCount?.y || 0;
        const tileSize = backVoxel.mSize || 200;
        const placed = new Set();
        const minDist = 2;
        const placeProb = 0.1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = new CCIndex(x, y, 0);
                const vinfo = backVoxel.GetVInfo ? backVoxel.GetVInfo(idx) : 0;
                if (vinfo === 3 && Math.random() < placeProb) {
                    let overlap = false;
                    for (let dy = -minDist; dy <= minDist; dy++) {
                        for (let dx = -minDist; dx <= minDist; dx++) {
                            if (dx === 0 && dy === 0)
                                continue;
                            const key = (x + dx) + ',' + (y + dy);
                            if (placed.has(key)) {
                                overlap = true;
                                break;
                            }
                        }
                        if (overlap)
                            break;
                    }
                    if (overlap)
                        continue;
                    const deco = decoObjs[Math.floor(Math.random() * decoObjs.length)];
                    if (deco) {
                        const obj = deco.Export();
                        obj.SetPos(new CVec3(x * tileSize, y * tileSize, 0));
                        obj.SetSave(false);
                        Real.Push(obj);
                        placed.add(x + ',' + y);
                    }
                }
            }
        }
    }
}
CModal.PushTitleBar(new CModalTitleBar("DevToolModal", "Unit", async () => {
    let ba = [];
    let ta = [];
    let ca = [];
    for (let [key, value] of CBlackBoard.Map()) {
        if (value instanceof CSubject) {
            ba.push(key);
            let pt2d = value.FindComp(CPaint2D);
            const texName = pt2d.GetTexture()[0];
            ta.push(texName);
            ca.push(pt2d.GetLeftTopRightBottom(gAtl.Frame()));
        }
    }
    new CBlackboardModal(ba, ta, ca);
}));
Real.Push(new CUser()).SetPos(new CVec3(5200, 6500));
CSysAuth.Confirm(true).then(async (_enable) => {
    if (_enable == false)
        return;
    let audio = new CAudioTag("Res/sound/TownTheme.mp3");
    audio.Volume(0.5);
    audio.Play();
});
