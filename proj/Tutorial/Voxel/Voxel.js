const version = '2025-07-24 11:42:05';
import "../../../artgine/artgine.js";
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
import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json']);
var Main = gAtl.Canvas('Main.json');
import { CConfirm } from "../../../artgine/basic/CModal.js";
import { CVoxel, CVoxelLightSpace, CVTile, CVTileMold, CVTileSurface } from "../../../artgine/canvas/subject/CVoxel.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CCIndex } from "../../../artgine/canvas/CCIndex.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CAlpha, CColor } from "../../../artgine/canvas/component/CColor.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import CBehavior from "../../../artgine/canvas/component/CBehavior.js";
import { CUpdate } from "../../../artgine/basic/Basic.js";
import { CNaviMgr } from "../../../artgine/canvas/CNavigationMgr.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CInput } from "../../../artgine/system/CInput.js";
import { CNavigation } from "../../../artgine/canvas/component/CNavigation.js";
import { CAlert } from "../../../artgine/basic/CAlert.js";
import { CBlackBoardRef } from "../../../artgine/basic/CObject.js";
var gVoxel = new CVoxel();
gVoxel.SetBlackBoard(true);
await gVoxel.mAtlas.Push("Res/floor/tutorial_pad.png");
await gVoxel.mAtlas.Push("Res/floor/pedestal_full.png");
await gVoxel.mAtlas.Push("Res/floor/dirt0.png");
await gVoxel.mAtlas.Push("Res/floor/floor_sand_stone0.png");
await gVoxel.mAtlas.Push("Res/water/dngn_shoals_shallow_water1.png");
let mode2D = true;
let naniMgr = new CNaviMgr();
let tile = new CVTile();
tile.mVInfo = 1;
tile.mPattern.push(new CVTileSurface(1));
tile.mCollider = CVoxel.eColliderEvent.Null;
gVoxel.PushTile(tile);
tile = new CVTile();
tile.mVInfo = 2;
tile.mPattern.push(new CVTileSurface(2));
tile.mCollider = CVoxel.eColliderEvent.Collision;
gVoxel.PushTile(tile);
tile = new CVTile();
tile.mVInfo = 3;
tile.mPattern.push(new CVTileSurface(3));
tile.mCollider = CVoxel.eColliderEvent.Collision;
gVoxel.PushTile(tile);
tile = new CVTile();
tile.mVInfo = 4;
tile.mPattern.push(new CVTileSurface(4));
tile.mCollider = CVoxel.eColliderEvent.Collision;
gVoxel.PushTile(tile);
tile = new CVTile();
tile.mVInfo = 5;
tile.mPattern.push(new CVTileSurface(5));
tile.mCollider = CVoxel.eColliderEvent.Collision;
gVoxel.PushTile(tile);
var gVoxelSub = new CVoxel();
gVoxelSub.SetBlackBoard(true);
await gVoxelSub.mAtlas.Push("Res/firespitter_statue.png");
await gVoxelSub.mAtlas.Push("Res/water/deep_water_wave_E.png");
await gVoxelSub.mAtlas.Push("Res/water/deep_water_wave_W.png");
gVoxel.mLayer.push(new CBlackBoardRef(gVoxelSub.Key()));
gVoxelSub.mLayer.push(new CBlackBoardRef(gVoxel.Key()));
tile = new CVTile();
tile.mVInfo = 1;
tile.mPattern.push(new CVTileSurface(1));
gVoxelSub.PushTile(tile);
tile = new CVTile();
tile.mVInfo = 2;
tile.mPattern.push(new CVTileSurface(2));
gVoxelSub.PushTile(tile);
tile = new CVTile();
tile.mVInfo = 3;
tile.mPattern.push(new CVTileSurface(3));
gVoxelSub.PushTile(tile);
var mold = new CVTileMold(2, 1);
mold.mTileVInfoArr[0] = 2;
mold.mTileVInfoArr[1] = 3;
gVoxelSub.mTileMoldArr.push(mold);
let A = Main.Push(new CSubject());
let pt = A.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
pt.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBAdd));
let nv = A.PushComp(new CNavigation(pt));
let cl = A.PushComp(new CCollider(pt));
cl.SetLayer("test");
cl.PushCollisionLayer("voxel");
let bh = A.PushComp(new CBehavior());
bh.Collision = () => {
    bh["mCollision"] = CUpdate.eType.Updated;
    pt.SetColorModel(new CColor(1, 0, 0, CColor.eModel.RGBAdd));
};
bh.Update = () => {
    if (bh["mCollision"] == CUpdate.eType.Updated) {
        bh["mCollision"] = CUpdate.eType.Already;
    }
    else if (bh["mCollision"] == CUpdate.eType.Already) {
        bh["mCollision"] = CUpdate.eType.Not;
        pt.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBAdd));
    }
};
let B = Main.Push(new CSubject());
let pt2 = B.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
pt2.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBAdd));
nv = B.PushComp(new CNavigation(pt2));
cl = B.PushComp(new CCollider(pt2));
cl.SetLayer("test");
cl.PushCollisionLayer("voxel");
let vls = new CVoxelLightSpace();
CConfirm.List("Voxel Mode Select!", [() => {
        gVoxel.ResetInfo(new CVec3(16, 16, 1), 100, true);
        Main.Push(gVoxel);
        gVoxel.BondsFill(new CCIndex(0, 0, 0), new CCIndex(15, 15, 0), 1);
        gVoxel.BondsFill(new CCIndex(5, 5, 0), new CCIndex(10, 10, 0), 2);
        naniMgr.Init(new CVec3(16, 16, 1));
        Main.GetGGI().mNavi = naniMgr;
        A.SetPos(new CVec3(0, 0, 1));
        B.SetPos(new CVec3(1200, 1000, 1));
        gVoxelSub.ResetInfo(new CVec3(16, 16, 1), 100, true);
        for (let i = 0; i < 5; ++i) {
            gVoxelSub.Bonds(new CCIndex(Math.trunc(Math.random() * 16), Math.trunc(Math.random() * 16), 0), 1);
        }
        gVoxelSub.SetPos(new CVec3(0, 0, 2));
        Main.Push(gVoxelSub);
    }, () => {
        mode2D = false;
        gVoxel.ResetInfo(new CVec3(16, 16, 16), 100, false);
        Main.Push(gVoxel);
        Main.SetCameraKey("3D");
        Main.ClearBatch();
        naniMgr.Init(new CVec3(16, 16, 16));
        Main.GetGGI().mNavi = naniMgr;
        A.SetPos(new CVec3(0, 200, 0));
        B.SetPos(new CVec3(1200, 200, 1000));
        gVoxel.BondsFill(new CCIndex(0, 0, 0), new CCIndex(15, 0, 15), 1);
        gVoxel.BondsFill(new CCIndex(6, 0, 6), new CCIndex(9, 1, 9), 2);
    }], ["2D", "3D"]);
let gTileList = new Array();
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.L)) {
        gVoxel.ResetInfo(new CVec3(16, 16, 16), 100, false);
        gVoxel.BondsFill(new CCIndex(0, 0, 0), new CCIndex(15, 0, 15), 1);
        gVoxel.BondsFill(new CCIndex(6, 0, 6), new CCIndex(9, 1, 9), 2);
        vls.AttachVoxel(new CCIndex(0, 0, 0), gVoxel);
        for (var z = 0; z < gVoxel.mCount.z / 2; ++z)
            for (var x = 0; x < gVoxel.mCount.x / 2; ++x) {
                vls.Sun(new CCIndex(x, 0, z));
            }
    }
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.F)) {
        for (var each0 of gTileList) {
            each0.Destroy();
        }
        gTileList = new Array();
        let path = [];
        if (mode2D == true) {
            for (var y = 0; y < 16; ++y)
                for (var x = 0; x < 16; ++x) {
                    let C = Main.Push(new CSubject());
                    C.SetPos(new CVec3(x * CNavigation.Normal + 50, y * CNavigation.Normal + 50, 110));
                    C.SetSca(new CVec3(0.4, 0.4, 0.4));
                    let pt = C.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
                    if (naniMgr.W().mKeyN[x + y * 16] != 0)
                        pt.SetColorModel(new CColor(1, 0, 0, CColor.eModel.RGBAdd));
                    else
                        pt.SetColorModel(new CColor(0, 0, 0.5, CColor.eModel.RGBAdd));
                    gTileList.push(C);
                }
            let pass = new Set();
            pass.add(B.FindComp(CNavigation).GetNaviHash());
            if (gAtl.Frame().Input().KeyDown(CInput.eKey.LControl))
                path = naniMgr.PathAll(A.GetPos(), B.GetPos(), A.FindComp(CNavigation).mBound, true, pass);
            else
                path = naniMgr.Path(A.GetPos(), B.GetPos(), A.FindComp(CNavigation).mBound, pass, true, false);
            for (var i = 0; i < path.length; ++i) {
                let C = Main.Push(new CSubject());
                path[i].z = 120;
                C.SetPos(path[i]);
                C.SetSca(new CVec3(0.4, 0.4, 0.4));
                let pt = C.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
                pt.SetColorModel(new CColor(0, 1, 0, CColor.eModel.RGBAdd));
                gTileList.push(C);
            }
        }
        else {
            for (var z = 0; z < 16; ++z)
                for (var y = 1; y < 2; ++y)
                    for (var x = 0; x < 16; ++x) {
                        let C = Main.Push(new CSubject());
                        C.SetPos(new CVec3(x * CNavigation.Normal + 50, y * CNavigation.Normal + 50 + 100, z * CNavigation.Normal + 50));
                        C.SetSca(new CVec3(0.1, 0.1, 0.1));
                        let pt = C.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
                        if (naniMgr.W().mKeyN[x + y * 16 + z * 16 * 16] != 0)
                            pt.SetColorModel(new CColor(1, 0, 0, CColor.eModel.RGBAdd));
                        else
                            pt.SetColorModel(new CColor(0, 0, 0.5, CColor.eModel.RGBAdd));
                        pt.SetAlphaModel(new CAlpha(0.5, CAlpha.eModel.Mul));
                        gTileList.push(C);
                    }
            let pass = new Set();
            pass.add(B.FindComp(CNavigation).GetNaviHash());
            if (gAtl.Frame().Input().KeyDown(CInput.eKey.LControl))
                path = naniMgr.PathAll(A.GetPos(), B.GetPos(), A.FindComp(CNavigation).mBound, false, pass);
            else
                path = naniMgr.Path(A.GetPos(), B.GetPos(), A.FindComp(CNavigation).mBound, pass, false, false);
            for (var i = 0; i < path.length; ++i) {
                let C = Main.Push(new CSubject());
                path[i].y = 200;
                C.SetPos(path[i]);
                C.SetSca(new CVec3(0.1, 0.1, 0.1));
                let pt = C.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
                pt.SetColorModel(new CColor(0, 1, 0, CColor.eModel.RGBAdd));
                gTileList.push(C);
            }
        }
    }
});
CAlert.Info("2D/3D 선택후 F를 누르면 A->B로 길찾기 실행<br>컨트롤 누르고 누르면 최적화 길찾기<br>3D에서 L누르면 라이팅 적용");
