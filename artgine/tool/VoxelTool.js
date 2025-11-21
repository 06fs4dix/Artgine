import { CAlert } from "../basic/CAlert.js";
import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CAtelier } from "../canvas/CAtelier.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CColor } from "../canvas/component/CColor.js";
import { CPaint3D } from "../canvas/component/paint/CPaint3D.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CVoxel, CVTile, CVTileMold, CVTileRole, CVTileSurfacePattern } from "../canvas/subject/CVoxel.js";
import { CMat } from "../geometry/CMat.js";
import { CMath } from "../geometry/CMath.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CH5Canvas } from "../render/CH5Canvas.js";
import { CInput } from "../system/CInput.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "../util/CCamCon.js";
import { CUtilMath } from "../geometry/CUtilMath.js";
import { CRollBack, CRollBackInfo } from "../util/CRollBack.js";
import { CArray } from "../basic/CArray.js";
import { CString } from "../basic/CString.js";
import { CBound } from "../geometry/CBound.js";
var gModal;
var gAtl;
var gVoxelOrg;
var gVoxelTar;
var gVoxelLayer;
var gCurser;
var gPress;
var gCurserXSize = 1;
var gCurserYSize = 1;
var gUpdateEvent = new CEvent(VoxelToolUpdate);
var gSelectMap = new Map();
var gCamMove = true;
var gSelectedTile = -1;
let roll = new CRollBackInfo("Voxel", new CArray());
let gColorImgMap = new Map();
async function VoxelAtlasCodiDiv(_tileSurfacePattern, _width = 200, _vinfo) {
    if (gVoxelTar == null)
        return null;
    if (_tileSurfacePattern == null || (_tileSurfacePattern instanceof CVTileSurfacePattern && _tileSurfacePattern.mPattern.length == 0)) {
        return CDOM.JSONToDom({
            "<>": "div", "class": "border position-relative", "style": "width:" + _width + "px;height:" + _width + "px;overflow:hidden;"
        });
    }
    let imgsrc = "";
    let pat;
    if (_tileSurfacePattern instanceof CVTileSurfacePattern)
        pat = _tileSurfacePattern.mPattern[0];
    else
        pat = _tileSurfacePattern;
    if (pat.mColor != null) {
        let colorStr = pat.mColor.ToStr();
        imgsrc = gColorImgMap.get(colorStr);
        if (imgsrc == null) {
            let color = new CColor(pat.mColor.x, pat.mColor.y, pat.mColor.z, CColor.eModel.RGBMul);
            CH5Canvas.Init(1, 1);
            CH5Canvas.Draw([
                CH5Canvas.Cmd("fillStyle", color.GetString()),
                ...CH5Canvas.FillRect(0, 0, 1, 1)
            ]);
            imgsrc = CH5Canvas.GetDataURL();
            gColorImgMap.set(colorStr, imgsrc);
        }
        let baseDiv = CDOM.JSONToDom({
            "<>": "div", "class": "position-relative", "style": "width:" + _width + "px;height:" + _width + "px;overflow:hidden;" +
                "background-image:url('" + imgsrc + "');background-size:contain;image-rendering: pixelated;" +
                "background-position:center;background-repeat:no-repeat;"
        });
        if (_vinfo !== undefined) {
            const badge = CDOM.JSONToDom({
                "<>": "span", "class": "position-absolute top-0 end-0 badge rounded-pill bg-primary m-1 fs-6", "text": _vinfo + ""
            });
            baseDiv.appendChild(badge);
        }
        return baseDiv;
    }
    let codi = gVoxelTar.mAtlas.mTexCodi[pat.mAtlOff];
    imgsrc = await gVoxelTar.mAtlas.GetImgURL(pat.mAtlOff);
    let width = codi.z - codi.x;
    let height = codi.w - codi.y;
    let aspect = width / height;
    let imgHeight = _width * aspect;
    let reverseX = pat.mRevers == CCIndex.eRevers.X1Y0 || pat.mRevers == CCIndex.eRevers.X1Y1 ? -1 : 1;
    let reverseY = pat.mRevers == CCIndex.eRevers.X0Y1 || pat.mRevers == CCIndex.eRevers.X1Y1 ? -1 : 1;
    let baseDiv = CDOM.JSONToDom({
        "<>": "div", "class": "position-relative", "style": "width:" + _width + "px;height:" + imgHeight + "px;overflow:hidden;" +
            "background-image:url('" + imgsrc + "');background-size:contain;transform:scaleX(" + reverseX + ") scaleY(" + reverseY + ");image-rendering: pixelated;" +
            "background-position:center;background-repeat:no-repeat;"
    });
    if (_vinfo !== undefined) {
        const badge = CDOM.JSONToDom({
            "<>": "span", "class": "position-absolute top-0 end-0 badge rounded-pill bg-primary m-1 fs-6", "text": _vinfo + ""
        });
        baseDiv.appendChild(badge);
    }
    return baseDiv;
}
export function VoxelTool(_voxel) {
    gVoxelOrg = _voxel;
    gVoxelTar = _voxel.Export();
    CRollBack.On("Voxel", (_data) => {
        for (let info of _data.mArray) {
            gVoxelTar.Bonds(info.index, info.VInfo);
        }
    });
    gModal = new CModalFlex([0.7, 0.3], "VoxelModal");
    gModal.SetHeader("VoxelTool");
    gModal.SetHelp(CDOM.DataToDom(`
        <span>shift : 선택 취소</span><br>
        <span>ctrl : 셀렉트 모드시 누르상태 타일선택시 매직봉</span><br>
        <span>middle : 모드 변경</span><br>
    `));
    gModal.SetSize(1000, 800);
    gModal.Open();
    const maxHeight = "calc(100vh - 10px)";
    const leftPanel = gModal.FindFlex(0);
    const rightPanel = gModal.FindFlex(1);
    [leftPanel, rightPanel].forEach(panel => {
        panel.style.maxHeight = maxHeight;
        panel.style.overflowY = "auto";
    });
    let canvas = CDOM.DataToDom(`
        <div style="position: relative; width: 100%; height: 100%;">
        <canvas id="VoxelLeft_can"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;">
        </canvas>
      </div>
    `);
    leftPanel.append(canvas);
    let rightHTML = CDOM.DataToDom(`<ul class="nav nav-tabs" id="myTab" role="tablist">
        <li class="nav-item" role="presentation">
            <button class="nav-link active" id="main-tab" data-bs-toggle="tab" data-bs-target="#main" type="button" role="tab" aria-controls="main" aria-selected="true">Main</button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="tile-tab" data-bs-toggle="tab" data-bs-target="#tile" type="button" role="tab" aria-controls="tile" aria-selected="false">Tile</button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="role-tab" data-bs-toggle="tab" data-bs-target="#role" type="button" role="tab" aria-controls="role" aria-selected="false">Role</button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="mold-tab" data-bs-toggle="tab" data-bs-target="#mold" type="button" role="tab" aria-controls="mold" aria-selected="false">Mold</button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="script-tab" data-bs-toggle="tab" data-bs-target="#script" type="button" role="tab" aria-controls="script" aria-selected="false">Script</button>
        </li>
    </ul>

    <!-- 탭 콘텐츠 -->
    <div class="tab-content p-1 border border-top-0" id="myTabContent">
        <div class="tab-pane fade show active" id="main" role="tabpanel" aria-labelledby="main-tab">

            <button type="button" class="btn btn-danger" id="atlas_btn" >Atlas</button>
            <button type="button" class="btn btn-primary" id="ground_btn" >Ground Fill</button>
            <!-- Row 1: 셀렉트 박스 -->
            <div class="row mb-3">
                <div class="col-md-6">
                <label for="modeSelect" class="form-label">모드</label>
                <select class="form-select" id="modeSelect">
                    <option value="2D" ${gVoxelTar.m2D ? "selected" : ""}>2D</option>
                    <option value="3D" ${gVoxelTar.m2D ? "" : "selected"}>3D</option>
                </select>
                </div>
                <div class="col-md-6">
                <label for="actionSelect" class="form-label">Change(Ctrl)</label>
                <select class="form-select" id="actionSelect">
                    <option value="move">Move</option>
                    <option value="create">Create</option>
                    <option value="modify">Modify</option>
                    <option value="select">Select</option>
                </select>
                </div>
            </div>

            <!-- Row 2: Count (X, Y, Z) -->
            <div class="row mb-3">
                <label class="form-label">Count</label>
                <div class="col">
                <input type="number" class="form-control" id="countX" placeholder="X" value='${gVoxelTar.mCount.x}'>
                </div>
                <div class="col">
                <input type="number" class="form-control" id="countY" placeholder="Y" value='${gVoxelTar.mCount.y}'>
                </div>
                <div class="col">
                <input type="number" class="form-control" id="countZ" placeholder="Z" value='${gVoxelTar.mCount.z}'>
                </div>
            </div>

            <!-- Row 3: Size -->
            <div class="row mb-3">
                <label for="sizeInput" class="form-label">Size</label>
                <div class="col">
                <input type="number" class="form-control" id="sizeInput" placeholder="Size" value='${gVoxelTar.mSize}'>
                </div>
            </div>
            <div class="row mb-3">
                <label for="TileMold_sel" class="form-label">Tile,Mold</label>
                <select class="form-select" id="TileMold_sel">
                </select>
            </div>
            <div class="row mb-3">
                <label for="moldArr_div" class="form-label">Mold</label>
                <div id='moldArr_div' style="display: flex; flex-wrap: wrap; gap: 1px;"></div>
            </div>
            
            
            
            
            
        </div>
        <div class="tab-pane fade" id="tile" role="tabpanel" aria-labelledby="tile-tab">
            <div class="d-flex align-items-center gap-2">
                <select class="form-select" style="width: auto;" id='TileDelete_sel'>
                    <option selected>Delete</option>
                </select>
                <button class="btn btn-primary" id='TileAdd_btn'>New</button>
            </div>
            <div id="tileArrModify_div" style="display: flex; flex-wrap: wrap; gap: 1px;"></div>
            <div id="tileModify_div"></div>
        </div>
        <div class="tab-pane fade" id="role" role="tabpanel" aria-labelledby="role-tab">
            <div class="d-flex align-items-center gap-2">
                <select class="form-select" style="width: auto;" id='RoleDelete_sel'>
                    <option selected>Delete</option>
                </select>
                <button class="btn btn-primary" id='RoleAdd_btn'>New</button>
            </div>
            <div id="RoleArrModify_div" style="display: flex; flex-wrap: wrap; gap: 1px;"></div>
            <div id="RoleModify_div"></div>
        </div>
        <div class="tab-pane fade" id="mold" role="tabpanel" aria-labelledby="mold-tab">
            <div class="d-flex align-items-center gap-2">
                <select class="form-select" style="width: auto;" id='MoldDelete_sel'>
                    <option selected>Delete</option>
                </select>
                <button class="btn btn-primary" id='MoldAdd_btn'>New</button>
            </div>
            <div id="MoldArrModify_div" style="display: flex; flex-wrap: wrap; gap: 1px;"></div>
            <div id="MoldModify_div"></div>
        </div>
        <div class="tab-pane fade" id="script" role="tabpanel" aria-labelledby="script-tab">
            <div id='Map_div'></div>
        </div>
        
    </div>`);
    rightPanel.append(rightHTML);
    CDOM.ID("atlas_btn").addEventListener("click", () => {
        gVoxelTar.mAtlas.ModifyModal();
    });
    CDOM.ID("ground_btn").addEventListener("click", () => {
        if (gSelectedTile == -1) {
            CAlert.Info("타일을 선택해 주세요");
            return;
        }
        let tile = null;
        for (let t of gVoxelTar.mTileArr) {
            if (t.mVInfo == gSelectedTile) {
                tile = t;
                break;
            }
        }
        if (tile == null)
            return;
        if (gVoxelTar.m2D) {
            for (var y = 0; y < gVoxelTar.mCount.y; ++y)
                for (var x = 0; x < gVoxelTar.mCount.x; ++x) {
                    gVoxelTar.mVInfo[x + 0 + y * gVoxelTar.mCount.x] = tile.mVInfo;
                    gVoxelTar.mTexInfo[x + 0 + y * gVoxelTar.mCount.x] = tile.GetTile();
                }
        }
        else {
            for (var z = 0; z < gVoxelTar.mCount.z; ++z)
                for (var x = 0; x < gVoxelTar.mCount.x; ++x) {
                    gVoxelTar.mVInfo[x + 0 + z * gVoxelTar.mCount.x * gVoxelTar.mCount.y] = tile.mVInfo;
                    gVoxelTar.mTexInfo[x + 0 + z * gVoxelTar.mCount.x * gVoxelTar.mCount.y] = tile.GetTile();
                }
        }
        gVoxelTar.mUpdateRes = true;
    });
    const ids = ["countX", "countY", "countZ", "sizeInput", "modeSelect"];
    for (const id of ids) {
        const el = CDOM.ID(id);
        if (el) {
            el.addEventListener("change", VoxelToolResetVoxel);
        }
    }
    gModal.On(CEvent.eType.Close, () => {
        CRollBack.Off("Voxel");
        var pos = gVoxelOrg.GetPos().Export();
        var rot = gVoxelOrg.GetRot().Export();
        var sca = gVoxelOrg.GetSca().Export();
        gVoxelOrg.ResetInfo(gVoxelTar.mCount, gVoxelTar.mSize, gVoxelTar.m2D);
        gVoxelOrg.Import(gVoxelTar);
        gVoxelOrg.SetPos(pos);
        gVoxelOrg.SetRot(rot);
        gVoxelOrg.SetSca(sca);
        gAtl.Frame().Destroy();
        gCamMove = true;
        gAtl.Frame().RemoveEvent(gUpdateEvent);
        gSelectedTile = -1;
    });
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "VoxelLeft_can", false).then(() => {
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
        gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
        gAtl.NewCanvas("VoxelTool");
        gAtl.Canvas("VoxelTool").PushSub(gVoxelTar);
        gVoxelTar.GetPos().Zero();
        gVoxelTar.GetRot().Zero();
        gVoxelTar.SetSca(new CVec3(1, 1, 1));
        gVoxelTar.GetMat().Unit();
        gCurser = gAtl.Canvas("VoxelTool").PushSub(new CSubject());
        gPress = gAtl.Canvas("VoxelTool").PushSub(new CSubject());
        gAtl.Frame().PushEvent(CEvent.eType.Update, gUpdateEvent);
        for (let i = 0; i < _voxel.mLayer.length; ++i) {
            if (_voxel.mLayer[i].Ref() instanceof CVoxel) {
                let lay = _voxel.mLayer[i].Ref().Export();
                let pos = CMath.V3SubV3(lay.GetPos(), gVoxelOrg.GetPos());
                lay.SetPos(pos);
                lay.GetRot().Zero();
                lay.SetSca(new CVec3(1, 1, 1));
                lay.mUpdateRes = true;
                gAtl.Canvas("VoxelTool").PushSub(lay);
            }
        }
        VoxelToolResetCam();
        VoxelToolResetCurser();
        VoxelToolSelectTileArrReset();
        CDOM.ID("main-tab").onclick = () => { VoxelToolSelectTileArrReset(); };
        CDOM.ID("tile-tab").onclick = () => { VoxelToolTileArrModifyReset(); };
        CDOM.ID("role-tab").onclick = () => { VoxelToolRoleArrModifyReset(); };
        CDOM.ID("mold-tab").onclick = () => { VoxelToolMoldArrModifyReset(); };
        MapDiv();
        CDOM.ID("actionSelect").onchange = () => {
            gSelectMap.clear();
            SelectMapRefresh();
            CDOM.IDValue("TileMold_sel", 0);
            gSelectedTile = 0;
        };
    });
}
async function VoxelToolSelectTileArrReset() {
    let TileMold_sel = CDOM.ID("TileMold_sel");
    TileMold_sel.innerHTML = "";
    TileMold_sel.onchange = () => {
        let tmValue = CDOM.IDValue("TileMold_sel");
        let actionSelect = CDOM.IDValue("actionSelect");
        if (actionSelect == "select") {
            CDOM.IDValue("TileMold_sel", 0);
            if (tmValue.indexOf("tile") != -1) {
                tmValue = Number(CString.ReplaceAll(tmValue, "tile", ""));
                for (let index of gSelectMap.values()) {
                    roll.mData.Push({ index: index.Export(), VInfo: gVoxelTar.GetVInfo(index) });
                    gVoxelTar.Bonds(index, tmValue);
                }
                gSelectMap.clear();
                SelectMapRefresh();
                CRollBack.Push(roll);
            }
            else if (tmValue.indexOf("mold") == -1) {
                let bound = new CBound();
                for (let index of gSelectMap.values()) {
                    bound.InitBound(new CVec3(index.x, index.y, index.z));
                }
                let mold = new CVTileMold();
                mold.mSize = bound.GetSize();
                mold.mSize.x += 1;
                mold.mSize.y += 1;
                mold.mSize.z += 1;
                mold.mTileVInfoArr.length = 0;
                for (let z = 0; z < mold.mSize.z; ++z)
                    for (let y = 0; y < mold.mSize.y; ++y)
                        for (let x = 0; x < mold.mSize.x; ++x) {
                            let index = bound.mMin.Export();
                            index.x += x;
                            index.y += y;
                            index.z += z;
                            mold.mTileVInfoArr.push(gVoxelTar.mVInfo[index.x + index.y * gVoxelTar.mCount.x + index.z * gVoxelTar.mCount.x * gVoxelTar.mCount.y]);
                        }
                gVoxelTar.mTileMoldArr.push(mold);
                gSelectMap.clear();
                SelectMapRefresh();
                CRollBack.Push(roll);
                VoxelToolSelectTileArrReset();
            }
            return;
        }
        gSelectedTile = tmValue;
        if (gSelectedTile.indexOf("tile") != -1) {
            gSelectedTile = CString.ReplaceAll(gSelectedTile, "tile", "");
            gSelectedTile = Number(gSelectedTile);
        }
        else if (gSelectedTile.indexOf("mold") != -1) {
            gSelectedTile = CString.ReplaceAll(gSelectedTile, "mold", "");
            gSelectedTile = Number(gSelectedTile);
            gSelectedTile = gVoxelTar.mTileMoldArr[gSelectedTile];
        }
        else
            gSelectedTile = -1;
    };
    TileMold_sel.append(CDOM.DataToDom({ "tag": "option", "value": 0, "text": "empty" }));
    for (let i = 0; i < gVoxelTar.mTileArr.length; ++i) {
        let tile = gVoxelTar.mTileArr[i];
        let key = tile.mVInfo + ":" + tile.mKey;
        TileMold_sel.append(CDOM.DataToDom({ "tag": "option", "value": "tile" + tile.mVInfo, "text": key }));
    }
    for (let i = 0; i < gVoxelTar.mTileMoldArr.length; ++i) {
        let mold = gVoxelTar.mTileMoldArr[i];
        let key = mold.mSize.x + "/" + mold.mSize.y + "/" + mold.mSize.z + ":" + mold.mKey;
        TileMold_sel.append(CDOM.DataToDom({ "tag": "option", "value": "mold" + i, "text": key }));
    }
    TileMold_sel.append(CDOM.DataToDom({ "tag": "option", "value": -1, "text": "MoldCopy" }));
}
async function CVTileSurfaceEX(_pointer, _div, _input) {
    if (_pointer.member == "mRevers") {
        if (_pointer.target.mAtlOff >= 0) {
            _div.append(CUtilObj.Select(_pointer, _input, ["X0Y0", "X1Y0", "X0Y1", "X1Y1"], [CCIndex.eRevers.X0Y0, CCIndex.eRevers.X1Y0, CCIndex.eRevers.X0Y1, CCIndex.eRevers.X1Y1], true));
        }
        else {
            _div.hidden = true;
        }
    }
    else if (_pointer.member == "mAtlOff") {
        let updateAtlOff = (_off) => {
            if (_off < 0)
                _pointer.target.mColor = new CVec3();
            else
                _pointer.target.mColor = null;
            _pointer.target.mAtlOff = _off;
            _pointer.refArr.splice(_pointer.refArr.length - 1, 1);
            _pointer.target.EditRefresh(_pointer);
            _div.innerHTML = "";
            _div.append(_input);
        };
        _input.onclick = () => {
            gVoxelTar.mAtlas.ModifyModal((_off) => {
                updateAtlOff(_off);
            });
        };
        _input.onchange = (e) => {
            updateAtlOff(Number(e.target.value));
        };
        if (_pointer.target.mAtlOff >= 0) {
            let tileHTML = await VoxelAtlasCodiDiv(_pointer.target);
            _div.append(tileHTML);
        }
        else {
            if (_pointer.target.mColor == null) {
                _pointer.target.mColor = new CVec3();
            }
            const r = Math.max(0, Math.min(255, Math.round(_pointer.target.mColor.x * 255)));
            const g = Math.max(0, Math.min(255, Math.round(_pointer.target.mColor.y * 255)));
            const b = Math.max(0, Math.min(255, Math.round(_pointer.target.mColor.z * 255)));
            let code = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            let chtml = CDOM.DataToDom({ "tag": "input", "type": "color", "class": "form-control form-control-color",
                "id": _pointer.target.ObjHash() + "_color", "value": code, "onchange": (e) => {
                    let value = CDOM.IDValue(_pointer.target.ObjHash() + "_color");
                    const r = parseInt(value.substring(1, 3), 16) / 255;
                    const g = parseInt(value.substring(3, 5), 16) / 255;
                    const b = parseInt(value.substring(5, 7), 16) / 255;
                    _pointer.target.mColor.x = r;
                    _pointer.target.mColor.y = g;
                    _pointer.target.mColor.z = b;
                }
            });
            _div.append(chtml);
        }
    }
    if (_pointer.member == "mColor") {
        _div.hidden = true;
    }
}
async function VoxelToolTileArrModifyReset() {
    let TileDelete_sel = CDOM.ID("TileDelete_sel");
    let TileAdd_btn = CDOM.ID("TileAdd_btn");
    TileDelete_sel.innerHTML = "";
    TileDelete_sel.onchange = () => {
        let tds = Number(CDOM.IDValue("TileDelete_sel"));
        for (let i = 0; i < gVoxelTar.mTileArr.length; ++i) {
            if (gVoxelTar.mTileArr[i].mVInfo == tds) {
                gVoxelTar.mTileArr.splice(i, 1);
                VoxelToolTileArrModifyReset();
                break;
            }
        }
    };
    let option = CDOM.DataToDom(`<option value='-1'>Delete..</option>`);
    TileDelete_sel.append(option);
    for (let t of gVoxelTar.mTileArr) {
        let option = CDOM.DataToDom(`<option value='${t.mVInfo}'>${t.mVInfo}</option>`);
        TileDelete_sel.append(option);
    }
    TileAdd_btn.onclick = () => {
        let tile = new CVTile();
        for (let t of gVoxelTar.mTileArr) {
            if (t.mVInfo > tile.mVInfo)
                tile.mVInfo = t.mVInfo;
        }
        tile.mVInfo++;
        gVoxelTar.mTileArr.push(tile);
        VoxelToolTileArrModifyReset();
    };
    let EditEXPush = (tile) => {
        tile.EditChangeEx = (_pointer, _child) => {
            if (_child)
                return;
            if (_pointer.member == "mVInfo") {
                gVoxelTar.ColliderEventReset();
            }
            if (_pointer.member == "mPattern" && _pointer.state == 1) {
                EditEXPush(tile);
            }
        };
        for (let pat of tile.mPattern) {
            pat.EditFormEx = CVTileSurfaceEX;
        }
    };
    let SelectChange = (_select) => {
        let tile = null;
        for (let t of gVoxelTar.mTileArr) {
            if (_select == t.mVInfo) {
                tile = t;
                break;
            }
        }
        let html = tile.EditInit(null);
        CDOM.ID("tileModify_div").innerHTML = "";
        CDOM.ID("tileModify_div").append(html);
        EditEXPush(tile);
    };
    let tileArrModify_div = CDOM.ID("tileArrModify_div");
    tileArrModify_div.innerHTML = "";
    for (let tile of gVoxelTar.mTileArr) {
        let tileDiv2 = await VoxelAtlasCodiDiv(tile, 50);
        tileDiv2.id = "tileM_" + tile.mVInfo;
        tileDiv2.onclick = () => {
            SelectChange(tile.mVInfo);
        };
        tileArrModify_div.append(tileDiv2);
    }
}
async function VoxelToolRoleArrModifyReset() {
    let RoleDelete_sel = CDOM.ID("RoleDelete_sel");
    let RoleAdd_btn = CDOM.ID("RoleAdd_btn");
    RoleDelete_sel.innerHTML = "";
    RoleDelete_sel.onchange = () => {
        let tds = CDOM.IDValue("RoleDelete_sel");
        for (let i = 0; i < gVoxelTar.mTileRoleArr.length; ++i) {
            if (gVoxelTar.mTileRoleArr[i].ObjHash() == tds) {
                gVoxelTar.mTileRoleArr.splice(i, 1);
                VoxelToolRoleArrModifyReset();
                break;
            }
        }
    };
    let option = CDOM.DataToDom(`<option value='-1'>Delete..</option>`);
    RoleDelete_sel.append(option);
    for (let t of gVoxelTar.mTileRoleArr) {
        let option = CDOM.DataToDom(`<option value='${t.ObjHash()}'>${t.ObjHash()}</option>`);
        RoleDelete_sel.append(option);
    }
    RoleAdd_btn.onclick = () => {
        let role = new CVTileRole();
        gVoxelTar.mTileRoleArr.push(role);
        VoxelToolRoleArrModifyReset();
    };
    let RoleArrModify_div = CDOM.ID("RoleArrModify_div");
    RoleArrModify_div.innerHTML = "";
    let EditEXPush = (role) => {
        role.EditChangeEx = (_pointer, _child) => {
            if (_pointer.member == "mPattern" && _pointer.state == 1) {
                EditEXPush(role);
            }
        };
        role.EditFormEx = async (_pointer, _div, _input) => {
            if (_pointer.member == "mRole") {
                let sjson = { "tag": "select", "class": "form-select", "html": [
                        { "tag": "option", "value": "16383", "text": "Pass" },
                        { "tag": "option", "value": "0", "text": "Zero" },
                    ] };
                for (let tile of gVoxelTar.mTileArr) {
                    sjson.html.push({ "tag": "option", "value": tile.mVInfo + "", "text": tile.mVInfo + "" });
                }
                let html = { "tag": "div", "class": "row row-cols-3 me-0", "html": [
                        { "tag": "div", "class": "col p-1", "html": [] },
                        { "tag": "div", "class": "col p-1", "html": [] },
                        { "tag": "div", "class": "col p-1", "html": [] },
                        { "tag": "div", "class": "col p-1", "html": [] },
                        { "tag": "div", "class": "col p-1", "html": [] },
                        { "tag": "div", "class": "col p-1", "html": [] },
                        { "tag": "div", "class": "col p-1", "html": [] },
                        { "tag": "div", "class": "col p-1", "html": [] },
                        { "tag": "div", "class": "col p-1", "html": [] },
                    ] };
                let html2 = { "tag": "div", "class": "row row-cols-3 m-0", "html": [
                        { "tag": "div", "class": "col p-0", "html": [] },
                        { "tag": "div", "class": "col p-0", "html": [] },
                        { "tag": "div", "class": "col p-0", "html": [] },
                        { "tag": "div", "class": "col p-0", "html": [] },
                        { "tag": "div", "class": "col p-0", "html": [] },
                        { "tag": "div", "class": "col p-0", "html": [] },
                        { "tag": "div", "class": "col p-0", "html": [] },
                        { "tag": "div", "class": "col p-0", "html": [] },
                        { "tag": "div", "class": "col p-0", "html": [] },
                    ] };
                for (let i = 0; i < role.mRole.length; ++i) {
                    let copy = JSON.parse(JSON.stringify(sjson));
                    copy["title"] = i;
                    let tile = null;
                    for (let o of copy.html) {
                        if (o.value == role.mRole[i] + "") {
                            o["selected"] = "selected";
                            break;
                        }
                    }
                    for (let t of gVoxelTar.mTileArr) {
                        if (t.mVInfo == role.mRole[i]) {
                            tile = t;
                        }
                    }
                    copy["onchange"] = async (e) => {
                        let target = e.target;
                        let off = Number(target.title);
                        role.mRole[off] = Number(target.value);
                        CDOM.ID(off + "_Role").innerHTML = "";
                        let tile2 = null;
                        for (let t of gVoxelTar.mTileArr) {
                            if (t.mVInfo == role.mRole[i]) {
                                tile2 = t;
                            }
                        }
                        CDOM.ID(off + "_Role").append(await VoxelAtlasCodiDiv(tile2, 50));
                    };
                    html.html[i].html.push(copy);
                    html2.html[i]["id"] = i + "_Role";
                    html2.html[i].html.push(await VoxelAtlasCodiDiv(tile, 50));
                }
                _input.innerHTML = "";
                _input.append(CDOM.DataToDom(html2));
                _input.append(CDOM.DataToDom(html));
            }
        };
        for (let pat of role.mPattern) {
            pat.EditFormEx = CVTileSurfaceEX;
        }
    };
    let SelectChange = (_select) => {
        let role = null;
        for (let t of gVoxelTar.mTileRoleArr) {
            if (_select == t.ObjHash()) {
                role = t;
                break;
            }
        }
        EditEXPush(role);
        let html = role.EditInit(null);
        CDOM.ID("RoleModify_div").innerHTML = "";
        CDOM.ID("RoleModify_div").append(html);
    };
    CDOM.ID("RoleModify_div").innerHTML = "";
    for (let role of gVoxelTar.mTileRoleArr) {
        let roleDiv2 = await VoxelAtlasCodiDiv(role, 50);
        roleDiv2.id = "roleM_" + role.ObjHash();
        roleDiv2.onclick = () => {
            SelectChange(role.ObjHash());
        };
        RoleArrModify_div.append(roleDiv2);
    }
}
async function VoxelToolMoldArrModifyReset() {
    let MoldDelete_sel = CDOM.ID("MoldDelete_sel");
    let MoldAdd_btn = CDOM.ID("MoldAdd_btn");
    MoldDelete_sel.innerHTML = "";
    MoldDelete_sel.onchange = () => {
        let tds = CDOM.IDValue("MoldDelete_sel");
        for (let i = 0; i < gVoxelTar.mTileMoldArr.length; ++i) {
            if (gVoxelTar.mTileMoldArr[i].ObjHash() == tds) {
                gVoxelTar.mTileMoldArr.splice(i, 1);
                VoxelToolMoldArrModifyReset();
                break;
            }
        }
    };
    let option = CDOM.DataToDom(`<option value='-1'>Delete..</option>`);
    MoldDelete_sel.append(option);
    for (let t of gVoxelTar.mTileMoldArr) {
        let option = CDOM.DataToDom(`<option value='${t.ObjHash()}'>${t.ObjHash()}</option>`);
        MoldDelete_sel.append(option);
    }
    let SelectChange = (_select) => {
        let mold = null;
        for (let t of gVoxelTar.mTileMoldArr) {
            if (_select == t.ObjHash()) {
                mold = t;
                break;
            }
        }
        let html = mold.EditInit(null);
        CDOM.ID("MoldModify_div").innerHTML = "";
        CDOM.ID("MoldModify_div").append(html);
    };
    MoldAdd_btn.onclick = () => {
        let role = new CVTileMold();
        gVoxelTar.mTileMoldArr.push(role);
        VoxelToolMoldArrModifyReset();
    };
    let MoldArrModify_div = CDOM.ID("MoldArrModify_div");
    MoldArrModify_div.innerHTML = "";
    CDOM.ID("MoldModify_div").innerHTML = "";
    for (let mold of gVoxelTar.mTileMoldArr) {
        let key = mold.mSize.x + "/" + mold.mSize.y + "/" + mold.mSize.z + ":" + mold.mKey;
        let upDiv = CDOM.DataToDom({ "tag": "button", "text": key });
        upDiv.onclick = () => {
            SelectChange(mold.ObjHash());
        };
        MoldArrModify_div.append(upDiv);
    }
}
function VoxelToolResetVoxel() {
    let countX = Number(CDOM.IDValue("countX"));
    let countY = Number(CDOM.IDValue("countY"));
    let countZ = Number(CDOM.IDValue("countZ"));
    let sizeInput = Number(CDOM.IDValue("sizeInput"));
    let modeSelect = CDOM.IDValue("modeSelect");
    gVoxelTar.ResetInfo(new CVec3(countX, countY, countZ), sizeInput, modeSelect == "2D" ? true : false);
    gAtl.Canvas("VoxelTool").ClearBatch();
    VoxelToolResetCam();
    VoxelToolResetCurser();
    CRollBack.Claear();
}
function VoxelToolResetCurser(_xSize = 1, _ySize = 1) {
    gCurserXSize = _xSize;
    gCurserYSize = _ySize;
    gCurser.RemoveComps(CPaint3D);
    if (gVoxelTar.m2D) {
        for (let y = _ySize - 1; y >= 0; y--)
            for (let x = 0; x < _xSize; x++) {
                let index = x + y * _xSize;
                let pt = new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
                let pos = new CVec3();
                pos.x = x * 200;
                pos.y = -y * 200;
                let mat = new CMat();
                mat.xyz = pos;
                pt.SetLMat(mat);
                gCurser.PushComp(pt);
                pt.SetRGBA(new CVec4(1, 0, 0, -0.5));
            }
        let pt = new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        let mat = new CMat();
        mat.mF32A[5] = 0.2;
        mat.xyz = new CVec3(200 * (_xSize), 0, 0);
        pt.SetLMat(mat);
        gCurser.PushComp(pt);
        pt.SetRGBA(new CVec4(0, 0, 1, -0.6));
        pt = new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        mat = new CMat();
        mat.mF32A[0] = 0.2;
        mat.xyz = new CVec3(0, 200, 0);
        pt.SetLMat(mat);
        gCurser.PushComp(pt);
        pt.SetRGBA(new CVec4(0, 1, 0, -0.6));
    }
    else {
        let i = 0;
        for (; i < _xSize * _ySize; i++) {
            let pt = new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
            gCurser.PushComp(pt);
            pt.SetRGBA(new CVec4(1, 0, 0, -0.5));
        }
        let pt = new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        let mat = new CMat();
        mat.mF32A[10] = 0.2;
        mat.xyz = new CVec3(200 * (_xSize), 0, 0);
        pt.SetLMat(mat);
        gCurser.PushComp(pt);
        pt.SetRGBA(new CVec4(0, 0, 1, -0.6));
        pt = new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        mat = new CMat();
        mat.mF32A[0] = 0.2;
        mat.xyz = new CVec3(0, 0, 200 * (_ySize));
        pt.SetLMat(mat);
        gCurser.PushComp(pt);
        pt.SetRGBA(new CVec4(0, 1, 0, -0.6));
    }
    gCurser.SetSca(new CVec3(0.55, 0.55, 0.55));
}
function VoxelToolResetCam() {
    if (gVoxelTar.m2D) {
        gAtl.Brush().GetCam2D().Init(new CVec3(0, 0.1, 100), new CVec3(0, 0.1, 0));
        gAtl.Canvas("VoxelTool").SetCameraKey("2D");
    }
    else {
        gAtl.Brush().GetCam2D().Init(new CVec3(0, 1000, 1), new CVec3(0, 0, 0));
        gAtl.Canvas("VoxelTool").SetCameraKey("3D");
    }
}
function SelectMapRefresh() {
    let sca = (gVoxelTar.mSize / 200) * 1.1;
    gPress.RemoveComps(CPaint3D);
    for (let index of gSelectMap.values()) {
        let mat = new CMat();
        mat.mF32A[0] = sca;
        mat.mF32A[5] = sca;
        mat.mF32A[10] = sca;
        mat.xyz = CMath.V3AddV3(index.M2Pos(gVoxelTar.mSize), gVoxelTar.GetPos());
        let pt = new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        pt.SetRGBA(new CVec4(0, 1, 0, -0.5));
        pt.SetLMat(mat);
        gPress.PushComp(pt);
    }
}
function VoxelToolUpdate(_delay) {
    let input = gAtl.Frame().Input();
    let actionSelect = CDOM.IDValue("actionSelect");
    let mouse = gAtl.Frame().Input().Mouse();
    let ray = gAtl.Brush().GetCam3D().GetRay(mouse.x, mouse.y);
    if (gVoxelTar.m2D)
        ray = gAtl.Brush().GetCam2D().GetRay(mouse.x, mouse.y);
    let pick = gVoxelTar.PickBox(ray);
    if (gVoxelTar.m2D) {
        pick.x = Math.trunc((ray.GetOriginal().x) / gVoxelTar.mSize);
        pick.y = Math.trunc((ray.GetOriginal().y) / gVoxelTar.mSize);
        pick.z = 0;
        pick.pick = CCIndex.eDir.Up;
    }
    else if (pick.pick == CCIndex.eDir.Null)
        return;
    if (actionSelect == "create")
        pick.PickMove();
    let pos = CMath.V3AddV3(pick.M2Pos(gVoxelTar.mSize), gVoxelTar.GetPos());
    if (gSelectedTile instanceof CVTileMold) {
        let sca = (gVoxelTar.mSize / 200) * 1.1;
        pos.x += (gSelectedTile.mSize.x - 1) * gVoxelTar.mSize * 0.5;
        pos.y += (gSelectedTile.mSize.y - 1) * gVoxelTar.mSize * 0.5;
        pos.z += (gSelectedTile.mSize.z - 1) * gVoxelTar.mSize * 0.5;
        gCurser.SetSca(new CVec3(sca * gSelectedTile.mSize.x, sca * gSelectedTile.mSize.y, sca * gSelectedTile.mSize.z));
    }
    else {
        let sca = (gVoxelTar.mSize / 200) * 1.1;
        gCurser.SetSca(new CVec3(sca, sca, sca));
    }
    if (actionSelect == "move") {
        gAtl.Brush().GetCam3D().GetCamCon().SetRotKey(CInput.eKey.LButton);
        gAtl.Brush().GetCam2D().GetCamCon().SetRotKey(CInput.eKey.LButton);
    }
    else {
        gAtl.Brush().GetCam3D().GetCamCon().SetRotKey(0);
        gAtl.Brush().GetCam2D().GetCamCon().SetRotKey(0);
    }
    if (gAtl.Frame().Input().KeyUp(CInput.eKey.MiddleButton)) {
        if (actionSelect == "move")
            actionSelect = "create";
        else if (actionSelect == "create")
            actionSelect = "modify";
        else if (actionSelect == "modify")
            actionSelect = "select";
        else
            actionSelect = "move";
        if (gSelectMap.size > 0 && actionSelect == "move") { }
        else
            CDOM.IDValue("actionSelect", actionSelect);
        gSelectMap.clear();
        SelectMapRefresh();
    }
    if (actionSelect == "move") {
        gCurser.SetPos(new CVec3(-1000, -1000, 0));
        return;
    }
    gCurser.SetPos(pos);
    if (input.KeyUp(CInput.eKey.Up)) {
        let nIndexArr = [];
        for (let index of gSelectMap.values()) {
            nIndexArr.push(index);
            let nIndex = index.Export();
            nIndex.y += 1;
            nIndexArr.push(nIndex);
        }
        gSelectMap.clear();
        for (let index of nIndexArr) {
            let off = index.Offset(gVoxelTar.mCount);
            gSelectMap.set(off, index);
        }
        SelectMapRefresh();
    }
    if (input.KeyUp(CInput.eKey.Down)) {
        let nIndexArr = [];
        let minY = 1000000000;
        for (let index of gSelectMap.values()) {
            if (index.y < minY)
                minY = index.y;
            nIndexArr.push(index);
        }
        for (let index of nIndexArr) {
            if (index.y == minY)
                continue;
            index.y -= 1;
        }
        gSelectMap.clear();
        for (let index of nIndexArr) {
            let off = index.Offset(gVoxelTar.mCount);
            gSelectMap.set(off, index);
        }
        SelectMapRefresh();
    }
    if (input.KeyUp(CInput.eKey.Right)) {
        let nIndexArr = [];
        for (let index of gSelectMap.values()) {
            nIndexArr.push(index);
            let nIndex = index.Export();
            nIndex.x += 1;
            nIndexArr.push(nIndex);
        }
        gSelectMap.clear();
        for (let index of nIndexArr) {
            let off = index.Offset(gVoxelTar.mCount);
            gSelectMap.set(off, index);
        }
        SelectMapRefresh();
    }
    if (input.KeyUp(CInput.eKey.Left)) {
        let nIndexArr = [];
        let minX = 1000000000;
        for (let index of gSelectMap.values()) {
            if (index.x < minX)
                minX = index.x;
            nIndexArr.push(index);
        }
        for (let index of nIndexArr) {
            if (index.x == minX)
                continue;
            index.x -= 1;
        }
        gSelectMap.clear();
        for (let index of nIndexArr) {
            let off = index.Offset(gVoxelTar.mCount);
            gSelectMap.set(off, index);
        }
        SelectMapRefresh();
    }
    if (input.KeyDown(CInput.eKey.LButton, true)) {
        roll = new CRollBackInfo("Voxel", new CArray());
    }
    if (input.KeyDown(CInput.eKey.LButton)) {
        let off = pick.Offset(gVoxelTar.mCount);
        if (input.KeyDown(CInput.eKey.Shift)) {
            if (gSelectMap.get(off) != null) {
                gSelectMap.delete(pick.Offset(gVoxelTar.mCount));
                SelectMapRefresh();
            }
        }
        else {
            if (gSelectMap.get(off) == null) {
                gSelectMap.set(pick.Offset(gVoxelTar.mCount), pick);
                SelectMapRefresh();
            }
        }
    }
    if (input.KeyUp(CInput.eKey.LButton)) {
        if (actionSelect == "select") {
            if (input.KeyDown(CInput.eKey.LControl)) {
                let off = 0;
                let search = new Array();
                search.push(pick.Export());
                let p = search[0];
                let sameTile = gVoxelTar.mVInfo[p.x + p.y * gVoxelTar.mCount.x + p.z * gVoxelTar.mCount.x * gVoxelTar.mCount.y];
                for (let i = 0; i < search.length; ++i) {
                    p = search[i].Export();
                    p.x += 1;
                    off = p.Offset(gVoxelTar.mCount);
                    if (gSelectMap.get(off) == null && gVoxelTar.mVInfo[p.x + p.y * gVoxelTar.mCount.x + p.z * gVoxelTar.mCount.x * gVoxelTar.mCount.y] == sameTile) {
                        gSelectMap.set(p.Offset(gVoxelTar.mCount), p);
                        search.push(p);
                    }
                    p = search[i].Export();
                    p.x -= 1;
                    off = p.Offset(gVoxelTar.mCount);
                    if (gSelectMap.get(off) == null && gVoxelTar.mVInfo[p.x + p.y * gVoxelTar.mCount.x + p.z * gVoxelTar.mCount.x * gVoxelTar.mCount.y] == sameTile) {
                        gSelectMap.set(p.Offset(gVoxelTar.mCount), p);
                        search.push(p);
                    }
                    p = search[i].Export();
                    p.y += 1;
                    off = p.Offset(gVoxelTar.mCount);
                    if (gSelectMap.get(off) == null && gVoxelTar.mVInfo[p.x + p.y * gVoxelTar.mCount.x + p.z * gVoxelTar.mCount.x * gVoxelTar.mCount.y] == sameTile) {
                        gSelectMap.set(p.Offset(gVoxelTar.mCount), p);
                        search.push(p);
                    }
                    p = search[i].Export();
                    p.y -= 1;
                    off = p.Offset(gVoxelTar.mCount);
                    if (gSelectMap.get(off) == null && gVoxelTar.mVInfo[p.x + p.y * gVoxelTar.mCount.x + p.z * gVoxelTar.mCount.x * gVoxelTar.mCount.y] == sameTile) {
                        gSelectMap.set(p.Offset(gVoxelTar.mCount), p);
                        search.push(p);
                    }
                    p = search[i].Export();
                    p.z += 1;
                    off = p.Offset(gVoxelTar.mCount);
                    if (gSelectMap.get(off) == null && gVoxelTar.mVInfo[p.x + p.y * gVoxelTar.mCount.x + p.z * gVoxelTar.mCount.x * gVoxelTar.mCount.y] == sameTile) {
                        gSelectMap.set(p.Offset(gVoxelTar.mCount), p);
                        search.push(p);
                    }
                    p = search[i].Export();
                    p.z -= 1;
                    off = p.Offset(gVoxelTar.mCount);
                    if (gSelectMap.get(off) == null && gVoxelTar.mVInfo[p.x + p.y * gVoxelTar.mCount.x + p.z * gVoxelTar.mCount.x * gVoxelTar.mCount.y] == sameTile) {
                        gSelectMap.set(p.Offset(gVoxelTar.mCount), p);
                        search.push(p);
                    }
                }
            }
            SelectMapRefresh();
            return;
        }
        for (let index of gSelectMap.values()) {
            if (typeof gSelectedTile == "number") {
                roll.mData.Push({ index: index.Export(), VInfo: gVoxelTar.GetVInfo(index) });
                gVoxelTar.Bonds(index, gSelectedTile);
            }
            else {
                let nIndex = index.Export();
                let mold = gSelectedTile;
                for (let z = 0; z < mold.mSize.z; ++z)
                    for (let y = 0; y < mold.mSize.y; ++y)
                        for (let x = 0; x < mold.mSize.x; ++x) {
                            nIndex.Import(index);
                            nIndex.x += x;
                            nIndex.y += y;
                            nIndex.z += z;
                            let off = mold.mTileVInfoArr[x + y * mold.mSize.x + z * mold.mSize.x * mold.mSize.y];
                            if (off != -1) {
                                roll.mData.Push({ index: nIndex.Export(), VInfo: gVoxelTar.GetVInfo(nIndex) });
                                gVoxelTar.Bonds(nIndex, off);
                            }
                        }
                break;
            }
        }
        gSelectMap.clear();
        SelectMapRefresh();
        CRollBack.Push(roll);
    }
}
function MapDiv() {
    let Map_div = CDOM.ID("Map_div");
    Map_div.append(CDOM.DataToDom(`
        <div class="card">
            <!-- 헤더 -->
            <div class="card-header" id="headingNoise">
                <h5 class="mb-0">
                <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapseNoise" aria-expanded="false"
                    aria-controls="collapseNoise" >Noise</button>
                </h5>
            </div>

            <!-- 바디 -->
            <div    id="collapseNoise" class="collapse" aria-labelledby="headingNoise">
                <div class="card-body p-1">
                    
                    <button type="button" class="btn btn-primary" id='MapCreate_btn'>Map Create</button>
                    <label for="WaterDepth_sli" class="form-label">InValue</label>
                    <input type="range" class="form-range" id="NoiseInValue_sli" min='0' max='1' step='0.01' value='0.5'>
                    <div class="input-group mb-3">
                        <span class="input-group-text" >Tile</span>
                        <input type="number" class="form-control" id="NoiseTile_num" placeholder="VInfo" value='0'>
                    </div>
                    <div class="mb-2">
                        <label for="NoiseTarget" class="form-label">이 Tile에서만 적용 VInfo[1,2,3...]</label>
                        <input type="text" class="form-control form-control-sm" id="NoiseTarget" value="0">
                    </div>

                    
                </div>
            </div>
        </div>
    `));
    CDOM.ID("MapCreate_btn").onclick = () => {
        let NoiseTile_num = Number(CDOM.IDValue("NoiseTile_num"));
        let NoiseInValue_sli = Number(CDOM.IDValue("NoiseInValue_sli"));
        const NoiseTarget = CDOM.IDValue("NoiseTarget").split(",")
            .map(v => Number(v.trim()))
            .filter(v => !isNaN(v));
        if (NoiseTile_num == 0) {
            CAlert.Info("VInfo값을 모두 넣어주세요");
            return;
        }
        if (gVoxelTar.m2D == false) {
            CAlert.Info("2D만 지원");
            return;
        }
        let width = gVoxelTar.mCount.x;
        let height = gVoxelTar.mCount.y;
        let frequency = 8;
        let index = new CCIndex();
        let seed = Math.random();
        roll = new CRollBackInfo("Voxel", new CArray());
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                index.x = x;
                index.y = y;
                const nx = x / width * frequency;
                const ny = y / height * frequency;
                const value = CUtilMath.Noise(nx + seed, ny + seed);
                let info = gVoxelTar.GetVInfo(index);
                if (value < NoiseInValue_sli && NoiseTarget.includes(info)) {
                    roll.mData.Push({ index: index.Export(), VInfo: gVoxelTar.GetVInfo(index) });
                    gVoxelTar.Bonds(index, NoiseTile_num);
                }
            }
        }
        CRollBack.Push(roll);
    };
    Map_div.append(CDOM.DataToDom(`
        <div class="card">
            <div class="card-header" id="headingPGRW">
                <h5 class="mb-0">
                    <button class="btn btn-link" type="button" data-bs-toggle="collapse"
                        data-bs-target="#collapsePGRW" aria-expanded="false" aria-controls="collapsePGRW">PerlinGuidedRandomWalk</button>
                </h5>
            </div>

            <div id="collapsePGRW" class="collapse" aria-labelledby="headingPGRW">
                <div class="card-body p-1">
                    <form>
                        <div class="mb-2">
                            <button type="button" class="btn btn-success w-100" id="PGRWCreate_btn">길 생성</button>
                        </div>

                        <div class="mb-2">
                            <label for="PGRWTarget" class="form-label">이 Tile에서만 적용 VInfo[1,2,3...]</label>
                            <input type="text" class="form-control form-control-sm" id="PGRWTarget" value="0">
                        </div>

                        <div class="input-group mb-2">
                            <span class="input-group-text">Tile</span>
                            <input type="number" class="form-control" id="PGRWTile_num" placeholder="VInfo" value="0">
                        </div>

                        <!-- maxStep 배수 -->
                        <div class="mb-2">
                            <label for="PGRWStepSlider" class="form-label">생성 횟수</label>
                            <input type="range" class="form-range" min="1" max="100" value="1" id="PGRWStepSlider">
                        </div>

                        <div class="mb-2">
                            <label for="PGRWSpikeChance" class="form-label">튀는 확률</label>
                            <input type="range" class="form-range" min="0" max="50" value="10" id="PGRWSpikeChance">
                        </div>

                        <div class="mb-2">
                            <label class="form-label">생성 위치</label>
                            <input type="range" class="form-range" id="PGRWX" min="0" max="1" step="0.01" value="0.5">
                            <input type="range" class="form-range" id="PGRWY" min="0" max="1" step="0.01" value="0.5">
                        </div>


                    </form>
                </div>
            </div>
        </div>
    `));
    CDOM.ID("PGRWStepSlider").oninput = (e) => {
        CDOM.ID("PGRWStepValue").innerText = CDOM.IDValue("PGRWStepSlider");
    };
    CDOM.ID("PGRWSpikeChance").oninput = (e) => {
        CDOM.ID("PGRWSpikeValue").innerText = CDOM.IDValue("PGRWSpikeChance");
    };
    CDOM.ID("PGRWCreate_btn").onclick = () => {
        const PGRWTargetList = CDOM.IDValue("PGRWTarget").split(",")
            .map(v => Number(v.trim()))
            .filter(v => !isNaN(v));
        const PGRWTile_num = Number(CDOM.IDValue("PGRWTile_num"));
        const stepMul = Number(CDOM.IDValue("PGRWStepSlider"));
        const spikeChance = Number(CDOM.IDValue("PGRWSpikeChance"));
        const PGRWX = Number(CDOM.IDValue("PGRWX"));
        const PGRWY = Number(CDOM.IDValue("PGRWY"));
        if (PGRWTargetList.length === 0) {
            CAlert.E("적용할 타일 VInfo가 필요합니다.");
            return;
        }
        if (!gVoxelTar.m2D) {
            CAlert.E("2D에서만 지원됩니다.");
            return;
        }
        const width = gVoxelTar.mCount.x;
        const height = gVoxelTar.mCount.y;
        const maxSteps = Math.floor(width * stepMul);
        const seed = Math.random();
        const visited = new Set();
        const queue = [];
        const sx = Math.floor(width * Math.max(0, Math.min(1, PGRWX)));
        const sy = Math.floor(height * Math.max(0, Math.min(1, PGRWY)));
        const start = new CCIndex(sx, sy, 0);
        queue.push(start);
        roll = new CRollBackInfo("Voxel", new CArray());
        const directions = [
            { dx: 0, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }
        ];
        let steps = 0;
        while (queue.length > 0 && steps < maxSteps) {
            const curr = queue.shift();
            const key = `${curr.x},${curr.y}`;
            if (visited.has(key))
                continue;
            visited.add(key);
            const vinfo = gVoxelTar.GetVInfo(curr);
            if (!PGRWTargetList.includes(vinfo))
                continue;
            roll.mData.Push({ index: curr.Export(), VInfo: vinfo });
            gVoxelTar.Bonds(curr, PGRWTile_num);
            steps++;
            for (const dir of directions) {
                const dist = (Math.random() * 100 < spikeChance) ? 3 : 1;
                const nx = curr.x + dir.dx * dist;
                const ny = curr.y + dir.dy * dist;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                    continue;
                const nextIndex = new CCIndex(nx, ny, 0);
                const nextKey = `${nx},${ny}`;
                if (visited.has(nextKey))
                    continue;
                const nVal = CUtilMath.Noise(nx * 0.1 + seed, ny * 0.1 + seed);
                const chance = nVal * 0.8 + 0.2;
                if (Math.random() < chance) {
                    queue.push(nextIndex);
                }
            }
        }
        CRollBack.Push(roll);
    };
    Map_div.append(CDOM.DataToDom(`
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">
                    <button class="btn btn-link" type="button" data-bs-toggle="collapse"
                        data-bs-target="#collapseFractal" aria-expanded="false" aria-controls="collapseFractal">
                        Fractal
                    </button>
                </h5>
            </div>
            <div id="collapseFractal" class="collapse">
                <div class="card-body p-1">
                    <div class="mb-2">
                        <button type="button" class="btn btn-warning w-100" id="FractalCreate_btn">프렉탈 생성</button>
                    </div>
                    
                    <div class="mb-2">
                        <label class="form-label">시드 위치 퍼센트(X,Y)</label>
                        <input type="range" class="form-range" id="FractalSeedX" min="0" max="1" step="0.01" value="0.5">
                        <input type="range" class="form-range" id="FractalSeedY" min="0" max="1" step="0.01" value="0.5">
                    </div>
                    <div class="mb-2">
                        <label class="form-label">프렉탈 길이</label>
                        <input type="number" class="form-control" id="FractalLen_num" value="5">
                    </div>
                    <div class="mb-2">
                        <label class="form-label">프렉탈 감쇠</label>
                        <input type="number" class="form-control" id="FractalGrowth_num" min="0" max="1" value="0.5" step='0.01' >
                    </div>

                    <div class="mb-2">
                        <label class="form-label">프렉탈 각도</label>
                        <input type="number" class="form-control" id="FractalAngle_num" min="0" max="360" value="30"  >
                    </div>
                    <div class="mb-2">
                        <label class="form-label">프렉탈 시작 각도</label>
                        <input type="number" class="form-control" id="FractalStartAngle_num" min="0" max="360" value="0"  >
                    </div>
                    <div class="input-group mb-2">
                        <span class="input-group-text">Tile</span>
                        <input type="number" class="form-control" id="FractalTile_num" value="3">
                    </div>
                    <div class="mb-2">
                        <label class="form-label">적용 대상 VInfo (쉼표로 구분)</label>
                        <input type="text" class="form-control form-control-sm" id="FractalTarget" value="1">
                    </div>
                </div>
            </div>
        </div>
    `));
    function drawLine(x0, y0, x1, y1, tileNum, roll) {
        let fx = x0;
        let fy = y0;
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0)
            return;
        const stepX = dx / len;
        const stepY = dy / len;
        for (let i = 0; i <= len; i++) {
            const ix = Math.round(fx);
            const iy = Math.round(fy);
            const key = new CCIndex(ix, iy, 0);
            const oldVal = gVoxelTar.GetVInfo(key);
            if (tileNum != oldVal)
                roll.mData.Push({ index: key.Export(), VInfo: oldVal });
            gVoxelTar.Bonds(key, tileNum);
            fx += stepX;
            fy += stepY;
        }
    }
    function branch(startX, startY, degree, length, rotate, growth, tileNum, roll) {
        if (length > 1) {
            const rad = degree * Math.PI / 180;
            const endX = Math.round(startX - length * Math.cos(rad));
            const endY = Math.round(startY - length * Math.sin(rad));
            drawLine(startX, startY, endX, endY, tileNum, roll);
            const nextLen = Math.floor(length * growth);
            branch(endX, endY, degree - rotate, nextLen, rotate, growth, tileNum, roll);
            branch(endX, endY, degree + rotate, nextLen, rotate, growth, tileNum, roll);
        }
    }
    CDOM.ID("FractalCreate_btn").onclick = () => {
        const W = gVoxelTar.mCount.x;
        const H = gVoxelTar.mCount.y;
        const FractalLen_num = Number(CDOM.IDValue("FractalLen_num"));
        const FractalGrowth_num = Number(CDOM.IDValue("FractalGrowth_num"));
        const FractalAngle_num = Number(CDOM.IDValue("FractalAngle_num"));
        const FractalStartAngle_num = Number(CDOM.IDValue("FractalStartAngle_num"));
        const tileNum = Number(CDOM.IDValue("FractalTile_num"));
        const targetList = CDOM.IDValue("FractalTarget")
            .split(",").map(v => Number(v.trim())).filter(v => !isNaN(v));
        const seedX = Math.floor(W * parseFloat(CDOM.IDValue("FractalSeedX")));
        const seedY = Math.floor(H * parseFloat(CDOM.IDValue("FractalSeedY")));
        if (!gVoxelTar.m2D) {
            CAlert.E("2D 모드에서만 지원됩니다.");
            return;
        }
        const roll = new CRollBackInfo("Voxel", new CArray());
        branch(seedX, seedY, FractalStartAngle_num, FractalLen_num, FractalAngle_num, FractalGrowth_num, tileNum, roll);
        CRollBack.Push(roll);
    };
    Map_div.append(CDOM.DataToDom(`
<div class="card">
    <div class="card-header" id="headingCityBlock">
        <h5 class="mb-0">
            <button class="btn btn-link" type="button" data-bs-toggle="collapse"
                data-bs-target="#collapseCityBlock" aria-expanded="false" aria-controls="collapseCityBlock">
                도시 구역 + 길 생성
            </button>
        </h5>
    </div>
    <div id="collapseCityBlock" class="collapse" aria-labelledby="headingCityBlock">
        <div class="card-body p-1">
            <div class="input-group mb-2">
                <span class="input-group-text">길 타일 번호</span>
                <input type="number" class="form-control" id="CityRoadTile_num" value="3">
            </div>
            <div class="row mb-2">
                <div class="col">
                    <label class="form-label">Start X</label>
                    <input type="number" class="form-control form-control-sm" id="CityStartX" value="0">
                </div>
                <div class="col">
                    <label class="form-label">Start Y</label>
                    <input type="number" class="form-control form-control-sm" id="CityStartY" value="0">
                </div>
            </div>
            <div class="row mb-2">
                <div class="col">
                    <label class="form-label">End X</label>
                    <input type="number" class="form-control form-control-sm" id="CityEndX" value="${gVoxelTar?.mCount.x ?? 32}">
                </div>
                <div class="col">
                    <label class="form-label">End Y</label>
                    <input type="number" class="form-control form-control-sm" id="CityEndY" value="${gVoxelTar?.mCount.y ?? 32}">
                </div>
            </div>

            <label class="form-label mt-2 mb-1">최소 블록 크기</label>
            <input type="range" class="form-range" id="CityMinSize" min="2" max="20" value="6">
            <div class="text-end small mb-2"><span id="CityMinSize_val">6</span></div>

            <label class="form-label mt-2 mb-1">분할 횟수</label>
            <input type="range" class="form-range" id="CitySplitCount" min="1" max="50" value="1">
            <div class="text-end small mb-2"><span id="CitySplitCount_val">1</span></div>

            <label class="form-label mt-2 mb-1">분할 확률 (%)</label>
            <input type="range" class="form-range" id="CitySplitChance" min="0" max="100" value="50">
            <div class="text-end small mb-2"><span id="CitySplitChance_val">50</span>%</div>

            <button type="button" class="btn btn-primary w-100 mt-2" id="CityBlockRoad_btn">도시 길 생성</button>
        </div>
    </div>
</div>
`));
    CDOM.ID("CityBlockRoad_btn").onclick = () => {
        const roadTile = Number(CDOM.IDValue("CityRoadTile_num"));
        const sx = Number(CDOM.IDValue("CityStartX"));
        const sy = Number(CDOM.IDValue("CityStartY"));
        const ex = Number(CDOM.IDValue("CityEndX"));
        const ey = Number(CDOM.IDValue("CityEndY"));
        const minSize = Number(CDOM.IDValue("CityMinSize"));
        const splitCount = Number(CDOM.IDValue("CitySplitCount"));
        if (!gVoxelTar.m2D) {
            CAlert.E("2D에서만 지원됩니다.");
            return;
        }
        const blocks = [{ x: sx, y: sy, w: ex - sx, h: ey - sy }];
        const roll = new CRollBackInfo("Voxel", new CArray());
        for (let i = 0; i < splitCount; i++) {
            const idx = Math.floor(Math.random() * blocks.length);
            const b = blocks[idx];
            const vertical = Math.random() < 0.5;
            if (vertical && b.w > minSize * 2) {
                const sw = minSize + Math.floor(Math.random() * (b.w - minSize * 2));
                blocks.splice(idx, 1, { x: b.x, y: b.y, w: sw, h: b.h }, { x: b.x + sw, y: b.y, w: b.w - sw, h: b.h });
            }
            else if (!vertical && b.h > minSize * 2) {
                const sh = minSize + Math.floor(Math.random() * (b.h - minSize * 2));
                blocks.splice(idx, 1, { x: b.x, y: b.y, w: b.w, h: sh }, { x: b.x, y: b.y + sh, w: b.w, h: b.h - sh });
            }
        }
        const centers = blocks.map(b => ({
            x: Math.floor(b.x + b.w / 2),
            y: Math.floor(b.y + b.h / 2)
        }));
        for (let i = 0; i < centers.length - 1; i++) {
            const a = centers[i];
            const b = centers[i + 1];
            drawLine(a.x, a.y, b.x, a.y, roadTile, roll);
            drawLine(b.x, a.y, b.x, b.y, roadTile, roll);
        }
        CRollBack.Push(roll);
    };
}
