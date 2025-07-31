const version = '2025-07-07 23:27:58';
import "../../../artgine/artgine.js";
import { CClass } from "../../../artgine/basic/CClass.js";
import CMonster from "./CMonster.js";
CClass.Push(CMonster);
import CStage from "./CStage.js";
CClass.Push(CStage);
import CUser from "./CUser.js";
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
import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json']);
var Main = gAtl.Canvas('Main.json');
import { CNavigation } from "../../../artgine/canvas/component/CNavigation.js";
import { CBGAttachButton, CBGFadeEffect } from "../../../artgine/util/CModalUtil.js";
import { CNaviMgr } from "../../../artgine/canvas/CNavigationMgr.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CAlpha, CColor } from "../../../artgine/canvas/component/CColor.js";
import { SDF } from "../../../artgine/z_file/SDF.js";
import { CBlackBoard } from "../../../artgine/basic/CBlackBoard.js";
import { CRay } from "../../../artgine/geometry/CRay.js";
import { CConsol } from "../../../artgine/basic/CConsol.js";
import { CRenderPass } from "../../../artgine/render/CRenderPass.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import { CCamCon2DFollow } from "../../../artgine/util/CCamCon.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CAlert } from "../../../artgine/basic/CAlert.js";
import { CPWA } from "../../../artgine/system/CPWA.js";
import { CUtil } from "../../../artgine/basic/CUtil.js";
import { CInput } from "../../../artgine/system/CInput.js";
import { CSysAuth } from "../../../artgine/system/CSysAuth.js";
import { CAudioTag } from "../../../artgine/system/audio/CAudio.js";
import { CWindow } from "../../../artgine/system/CWindow.js";
CNavigation.Normal = 50;
CNavigation.Small = 10;
var g_camMode = 0;
let g_fadeEffect = new CBGFadeEffect("test");
Main.GetGGI().mNavi = new CNaviMgr();
Main.GetGGI().mNavi.Init(new CVec3(100, 100, 1));
let tileList = new Array();
let FindPath = (_target, _end) => {
    for (let each0 of tileList) {
        each0.Destroy();
    }
    let bound = _target.FindComp(CNavigation).mBound;
    console.time();
    let path = Main.GetGGI().mNavi.PathAll(_target.GetPos(), _end, bound, true);
    console.timeEnd();
    for (var i = 0; i < path.length; ++i) {
        let C = Main.Push(new CSubject());
        C.SetPos(CMath.V3AddV3(path[i], new CVec3(0, 0, 2)));
        C.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(), new CVec2(20, 20)));
        tileList.push(C);
    }
    for (var y = 0; y < 20; ++y)
        for (var x = 0; x < 20; ++x) {
            let C = Main.Push(new CSubject());
            C.SetPos(new CVec3(x * CNavigation.Normal + CNavigation.Normal * 0.5, y * CNavigation.Normal + CNavigation.Normal * 0.5, 1));
            let pt = C.PushComp(new CPaint2D(gAtl.Frame().Pal().GetBlackTex(), new CVec2(CNavigation.Normal * 0.9, CNavigation.Normal * 0.9)));
            if (Main.GetGGI().mNavi.R().mKeyN[x + y * 100] != 0)
                pt.SetColorModel(new CColor(1, 0, 0, SDF.eColorModel.RGBAdd));
            else
                pt.SetColorModel(new CColor(0, 0, 0.5, SDF.eColorModel.RGBAdd));
            pt.SetAlphaModel(new CAlpha(0.5, SDF.eAlphaModel.Mul));
            tileList.push(C);
        }
};
CBlackBoard.Push("FindPath", FindPath);
let size = 100;
let count = new CVec2(5, 5);
let maze = new Array();
let resetCount = 1;
let RayExtrapolate = (_st, _ed, _target) => {
    let ray = new CRay();
    let dir = CMath.V3SubV3(_ed, _st);
    let len = CMath.V3Len(dir);
    dir = CMath.V3Nor(dir);
    ray.SetDirect(dir);
    ray.SetOriginal(_st);
    let clList = Main.Pick(ray);
    for (let cl of clList) {
        if (_target == cl.GetOwner() || cl.GetLayer() != "block")
            continue;
        let abLen = CMath.V3Distance(_st, cl.GetOwner().GetPos());
        if (abLen < len + 32) {
            CConsol.Log("뚤림");
            return true;
        }
    }
    return false;
};
CBlackBoard.Push("RayExtrapolate", RayExtrapolate);
let ResetMaze = (_xCount, _yCount) => {
    g_fadeEffect.AniStart("Level : " + CStage.level);
    Main.GetGGI().mNavi.Reset(true);
    let rp = new CRenderPass(gAtl.Frame().Pal().Sl2DKey());
    if (CStage.fog)
        rp.mTag = "light";
    resetCount++;
    Main.Clear();
    count.x = _xCount;
    count.y = _yCount;
    count.x = CStage.mazeSize.x;
    count.y = CStage.mazeSize.y;
    maze = new Array(count.x * count.y);
    maze.fill(1);
    let lastDig = 0;
    let maxDeep = 0;
    let MoveDig = (_x, _y, _map, _deep) => {
        if (maxDeep <= _deep) {
            maxDeep = _deep;
            lastDig = _x + _y * count.x;
        }
        let rDir = [0, 1, 2, 3];
        rDir.sort(() => Math.random() - 0.5);
        _map[_x + _y * count.x] = 0;
        for (let i = 0; i < 4; ++i) {
            let dirX = 0;
            let dirY = 0;
            switch (rDir[i]) {
                case 0:
                    dirX = 2;
                    break;
                case 1:
                    dirX = -2;
                    break;
                case 2:
                    dirY = 2;
                    break;
                case 3:
                    dirY = -2;
                    break;
            }
            let nx = _x + dirX;
            let ny = _y + dirY;
            if (nx < count.x - 1 && nx > 0 && ny < count.y - 1 && ny > 0 && _map[nx + ny * count.x] == 1) {
                if (ny != _y)
                    _map[nx + Math.trunc((ny + _y) / 2) * count.x] = 0;
                else
                    _map[Math.trunc((nx + _x) / 2) + ny * count.x] = 0;
                MoveDig(nx, ny, _map, _deep + 1);
            }
        }
    };
    MoveDig(1, 1, maze, 0);
    maze[1 + 1 * count.x] = 2;
    maze[lastDig] = 3;
    let RandBasicTile = (x, y) => {
        let rand = Math.trunc(Math.random() * 4);
        let pt = new CPaint2D("floor/rect_gray" + rand + ".png", new CVec2(size / 3, size / 3));
        pt.SetPos(new CVec3(size / 3 * x, size / 3 * y));
        pt.SetRenderPass(rp);
        return pt;
    };
    let IsBlockFun = (x, y) => {
        let xChk = false;
        if (x >= 0 && y >= 0 && x < count.x && y < count.y && maze[x + y * count.x] == 1)
            return 1;
        return 0;
    };
    for (let y = 0; y < count.y; ++y)
        for (let x = 0; x < count.x; ++x) {
            let sub = Main.Push(new CSubject());
            sub.SetKey(resetCount + "/" + x + "/" + y);
            sub.SetPos(new CVec3(x * size, y * size, -1));
            let pt;
            if (maze[x + y * count.x] == 0) {
                for (let sy = -1; sy <= 1; ++sy)
                    for (let sx = -1; sx <= 1; ++sx)
                        sub.PushComp(RandBasicTile(sx, sy));
            }
            else if (maze[x + y * count.x] == 2) {
                pt = sub.PushComp(new CPaint2D("floor/tomb0.png", new CVec2(size, size)));
                pt.SetRenderPass(rp);
                pt.mAutoLoad.mFilter = CTexture.eFilter.Neaest;
            }
            else if (maze[x + y * count.x] == 3) {
                pt = sub.PushComp(new CPaint2D("floor/tutorial_pad.png", new CVec2(size, size)));
                pt.SetRenderPass(rp);
                pt.mAutoLoad.mFilter = CTexture.eFilter.Neaest;
                let cl = sub.PushComp(new CCollider(pt));
                cl.SetLayer("endpoint");
            }
            else {
                pt = sub.PushComp(new CPaint2D("floor/sandstone_floor0.png", new CVec2(size / 3, size / 3)));
                pt.SetRenderPass(rp);
                let cl = sub.PushComp(new CCollider(pt));
                cl.SetLayer("block");
                let navi = sub.PushComp(new CNavigation());
                navi.InitBound(pt);
                if (IsBlockFun(x - 1, y) == 1) {
                    pt = sub.PushComp(new CPaint2D("floor/sandstone_floor0.png", new CVec2(size / 3, size / 3)));
                    pt.SetRenderPass(rp);
                    pt.SetPos(new CVec3(-size / 3, 0));
                    cl = sub.PushComp(new CCollider(pt));
                    cl.SetLayer("block");
                    navi = sub.PushComp(new CNavigation());
                    navi.InitBound(pt);
                }
                else
                    sub.PushComp(RandBasicTile(-1, 0));
                if (IsBlockFun(x + 1, y) == 1) {
                    pt = sub.PushComp(new CPaint2D("floor/sandstone_floor0.png", new CVec2(size / 3, size / 3)));
                    pt.SetRenderPass(rp);
                    pt.SetPos(new CVec3(size / 3, 0));
                    cl = sub.PushComp(new CCollider(pt));
                    cl.SetLayer("block");
                    navi = sub.PushComp(new CNavigation());
                    navi.InitBound(pt);
                }
                else
                    sub.PushComp(RandBasicTile(1, 0));
                if (IsBlockFun(x, y - 1) == 1) {
                    pt = sub.PushComp(new CPaint2D("floor/sandstone_floor0.png", new CVec2(size / 3, size / 3)));
                    pt.SetRenderPass(rp);
                    pt.SetPos(new CVec3(0, -size / 3));
                    cl = sub.PushComp(new CCollider(pt));
                    cl.SetLayer("block");
                    navi = sub.PushComp(new CNavigation());
                    navi.InitBound(pt);
                }
                else
                    sub.PushComp(RandBasicTile(0, -1));
                if (IsBlockFun(x, y + 1) == 1) {
                    pt = sub.PushComp(new CPaint2D("floor/sandstone_floor0.png", new CVec2(size / 3, size / 3)));
                    pt.SetRenderPass(rp);
                    pt.SetPos(new CVec3(0, size / 3));
                    cl = sub.PushComp(new CCollider(pt));
                    cl.SetLayer("block");
                    navi = sub.PushComp(new CNavigation());
                    navi.InitBound(pt);
                }
                else
                    sub.PushComp(RandBasicTile(0, 1));
                sub.PushComp(RandBasicTile(-1, -1));
                sub.PushComp(RandBasicTile(1, -1));
                sub.PushComp(RandBasicTile(-1, 1));
                sub.PushComp(RandBasicTile(1, 1));
            }
        }
    for (let i = 0; i < CStage.small; ++i) {
        let x = Math.trunc(Math.random() * CStage.mazeSize.x);
        let y = Math.trunc(Math.random() * CStage.mazeSize.y);
        if (maze[x + y * CStage.mazeSize.x] == 1) {
            Main.Find(resetCount + "/" + x + "/" + y).Destroy();
            let sub = Main.Push(new CSubject());
            sub.SetKey(resetCount + "/" + x + "/" + y);
            sub.SetPos(new CVec3(x * size, y * size));
            for (let sy = -1; sy <= 1; ++sy)
                for (let sx = -1; sx <= 1; ++sx) {
                    let pt = sub.PushComp(new CPaint2D("floor/sandstone_floor0.png", new CVec2(size / 3, size / 3)));
                    pt.SetRenderPass(rp);
                    pt.SetPos(new CVec3(size / 3 * sx, size / 3 * sy));
                    let cl = sub.PushComp(new CCollider(pt));
                    cl.SetLayer("block");
                    let navi = sub.PushComp(new CNavigation());
                    navi.InitBound(pt);
                }
        }
    }
    CBlackBoard.Delete("User");
    let sub = new CSubject();
    sub.SetKey("User");
    sub.SetBlackBoard(true);
    sub.PushComp(new CUser());
    sub.SetPos(new CVec3(100, 100));
    Main.Push(sub);
    gAtl.Brush().GetCam2D().SetBlackBoard(true);
    let camcon = gAtl.Brush().GetCam2D().GetCamCon();
    if (camcon == null) {
        camcon = new CCamCon2DFollow(gAtl.Frame().Input());
        gAtl.Brush().GetCam2D().SetCamCon(camcon);
        camcon.m_smoothSpeed = 0.05;
    }
    sub.FindComp(CUser).m_camMode = g_camMode;
    let FineRoad = () => {
        while (true) {
            let x = Math.trunc(Math.random() * CStage.mazeSize.x);
            let y = Math.trunc(Math.random() * CStage.mazeSize.y);
            if (x == 1 && y == 1)
                continue;
            if (maze[x + y * CStage.mazeSize.x] == 0) {
                return new CVec2(x, y);
            }
        }
        return null;
    };
    for (let i = 0; i < CStage.monCount; ++i) {
        let sub = new CSubject();
        sub.SetKey(resetCount + "/" + "mon" + i);
        sub.PushComp(new CMonster(rp, "acid_blob"));
        let road = FineRoad();
        sub.SetPos(new CVec3(road.x * size, road.y * size));
        Main.Push(sub);
    }
};
ResetMaze(5, 5);
CBlackBoard.Push("ResetMaze", ResetMaze);
let cam2D = gAtl.Brush().GetCam2D();
cam2D.Set2DZoom(1.5);
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
});
gAtl.Frame().PushEvent(CEvent.eType.Resume, new CEvent(() => {
    ResetMaze(5, 5);
    CAlert.Info("화면 전환시 다시 시작");
}));
let Option_btn = new CBGAttachButton("Option_btn", 101, new CVec2(320, 240));
Option_btn.SetTitleText("Option");
Option_btn.SetContent(`
<div>
    <div class="form-group">
        <label for="zoomSize">줌</label>
        <input type="range" class="form-control-range" id="zoomSize" min="0.5" max="3" step="0.1" value="1.5" onchange='ClickCamOption("zoomSize")'>
    </div>
    <button id='Restart_btn' onclick='ClickCamOption("Restart_btn")'>재시작</button>
    
    <button id='PWAInstall_btn'>앱 설치</button>
    <button id='FlowCam' onclick='ClickCamOption("FlowCam")'>카메라 따라가기</button>
    <button id='StopCam' onclick='ClickCamOption("StopCam")'>카메라 멈추기</button>
    <button id='StopCam' onclick='ClickScreenFull()'>풀화면</button>
    
</div>`);
function ClickScreenFull() {
    CWindow.ScreenFull();
}
window["ClickScreenFull"] = ClickScreenFull;
document.getElementById("PWAInstall_btn").addEventListener("click", () => {
    CPWA.Install();
});
function ClickCamOption(_id) {
    let value = CUtil.IDValue(_id);
    if (_id == "zoomSize") {
        cam2D.Set2DZoom(Number(value));
    }
    else if (_id == "Restart_btn") {
        ResetMaze(5, 5);
    }
    else if (_id == "FlowCam") {
        g_camMode = 1;
        let user = CBlackBoard.Find("User");
        user.FindComp(CUser).m_camMode = g_camMode;
        let camcon = new CCamCon2DFollow(gAtl.Frame().Input());
        camcon.m_smoothSpeed = 0.05;
        cam2D.SetCamCon(camcon);
        camcon.SetPosKey(CInput.eKey.LButton);
        camcon.SetRotKey(CInput.eKey.RButton);
    }
    else if (_id == "StopCam") {
        cam2D.SetCamCon(null);
        g_camMode = 0;
    }
}
window["ClickCamOption"] = ClickCamOption;
CSysAuth.Confirm(true).then(async (_enable) => {
    if (_enable == false)
        return;
    let audio = new CAudioTag("Rolemusic - A ninja among culturachippers.mp3");
    audio.Volume(0.5);
    audio.Play();
});
