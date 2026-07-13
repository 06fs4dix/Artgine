import { CVec3 } from "../../geometry/CVec3.js";
import { CAtlas } from "../../util/CAtlas.js";
import { CCollider } from "../component/CCollider.js";
import { CPaintVoxel } from "../component/paint/CPaintVoxel.js";
import { CSubject } from "./CSubject.js";
import { CObject } from "../../basic/CObject.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CUtil } from "../../basic/CUtil.js";
import { CAlert } from "../../basic/CAlert.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CMapBuf } from "./CMapBuf.js";
export class CCIndexPick extends CCIndex {
    pick = CCIndex.eDir.Null;
    PickMove() {
        switch (this.pick) {
            case CCIndex.eDir.Front:
                this.z += 1;
                break;
            case CCIndex.eDir.Back:
                this.z -= 1;
                break;
            case CCIndex.eDir.Up:
                this.y += 1;
                break;
            case CCIndex.eDir.Down:
                this.y -= 1;
                break;
            case CCIndex.eDir.Left:
                this.x -= 1;
                break;
            case CCIndex.eDir.Right:
                this.x += 1;
                break;
        }
        this.pick = CCIndex.eDir.Null;
    }
}
export class CVTile extends CObject {
    mLabel = "";
    mColliderLayer = "";
    mColor = 0;
    mAtlas = 0;
    constructor(_color, _atlas, _collider = "", _label = "") {
        super();
        if (_color == null || _color <= 0) {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            this.mColor = ((r << 24) | (g << 16) | (b << 8) | 0x00) >>> 0;
        }
        else {
            this.mColor = (_color & 0xFFFFFF00) >>> 0;
        }
        this.mAtlas = _atlas;
        this.mColliderLayer = _collider;
        this.mLabel = _label;
    }
    Label() {
        return this.mLabel;
    }
    Color() {
        return this.mColor;
    }
    Size() {
        return null;
    }
    EditForm(_pointer, _div, _input) {
        super.EditForm(_pointer, _div, _input);
        if (_pointer.member == "mCollider") {
            let textArr = [], valArr = [];
            for (let [text, val] of Object.entries(CCollider.eEvent)) {
                textArr.push(text);
                valArr.push(val);
            }
            _div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
        }
    }
}
class CVTillPattern extends CObject {
    mColor = 0;
    mRate = 1;
}
export class CVTileRole extends CObject {
    mLabel = "";
    mRole;
    mPattern = new Array();
    constructor() {
        super();
        this.mRole = [
            16383, 16383, 16383, 16383, 16383, 16383, 16383, 16383, 16383
        ];
    }
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member == "mPattern") {
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [new CVTillPattern]);
        }
    }
    GetTile() {
        let sum = 0;
        for (let i = 0; i < this.mPattern.length; ++i) {
            sum += this.mPattern[i].mRate;
        }
        let ran = Math.random() * sum;
        for (let i = 0; i < this.mPattern.length; ++i) {
            ran -= this.mPattern[i].mRate;
            if (ran < 0) {
                return this.mPattern[i].mColor;
            }
        }
        return 0;
    }
}
export class CVTileMold extends CObject {
    mLabel = "";
    mSize;
    mColorArr;
    constructor(_width = 1, _height = 1) {
        super();
        this.mSize = new CVec3(1, 1, 1);
        this.mColorArr = new Array(this.mSize.x * this.mSize.y * this.mSize.z);
        this.mColorArr.fill(0);
    }
}
export class CVoxelMap extends CSubject {
    mToolMode = false;
    mAtlas = new CAtlas("Voxel/");
    mBuf = new CMapBuf();
    mTileMap = new Map();
    mTileRoleArr = new Array();
    mTileMoldArr = new Array();
    mColliderArr = Array();
    mPaintArr = new Array();
    mDiv = 16;
    mPlane = new Array();
    mUpdateRes = true;
    mUpdateModify = new Set();
    mLight = false;
    static SunValue = 1.0;
    mLayer = new Array();
    IsShould(_member, _type) {
        if (_member == "mComArr" && _type == CObject.eShould.Editer)
            return true;
        if (_member == "mPaint" || _member == "mUpdateRes" || _member == "mPlane" || _member == "mColliderArr" || _member == "mComArr")
            return false;
        return super.IsShould(_member, _type);
    }
    constructor() {
        super();
        this.ResetInfo(new CVec3(8, 8, 8), 100);
        if (CUtil.IsNode() == false)
            this.mAtlas.Push("test.png", CUtil.Base64ToArray("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABuSURBVDhPlY9RDoAwCEM9iJ/e/2aeARmtZGEw8aU/0r7EHfITCvd5IficCdUQ/DQXYK0SQWPj/J4LVSg0HSwpKKEO4WgWlDDysDa+BXYvrV/iwug+GjNlCKGrshOqo5IIKJT0Ht+AT2e9U+gi8gD5Qf9Q2ZUDNwAAAABJRU5ErkJggg=="));
    }
    MapLog() {
        let json = {};
        json["countX"] = this.mBuf.mCount.x;
        json["countY"] = this.mBuf.mCount.y;
        json["countZ"] = this.mBuf.mCount.z;
        json["size"] = this.mBuf.mSize;
        json["labelArr"] = new Array();
        let size = new CVec3(this.mBuf.mSize, this.mBuf.mSize, this.mBuf.mSize);
        for (let tile of this.mTileMap.values()) {
            json["labelArr"].push({ "label": tile.Label(), "color": CColor.HexToRGB(tile.Color(), true).ToHex(), "sizeX": size.x, "sizeY": size.y, "sizeZ": size.z });
        }
        return JSON.stringify(json);
    }
    PushTile(_tile) {
        this.mTileMap.set(_tile.mColor, _tile);
    }
    ResetInfo(_count, _size) {
        this.mPlane.length = 0;
        this.mComArr.length = 0;
        this.mComEnableArr.length = 0;
        this.mPaintArr.length = 0;
        this.mPTArr = null;
        this.mBuf.Reset(_count, _size);
        this.mUpdateRes = true;
        if (_count.z == 1 && this.mPos.z == 0) {
            let pos = this.mPos.Export();
            pos.z = -101;
            this.SetPos(pos);
        }
    }
    RefreshModify() {
        let cntX = Math.ceil(this.mBuf.mCount.x / this.mDiv);
        let cntY = Math.ceil(this.mBuf.mCount.y / this.mDiv);
        let chunkMap = new Map();
        for (let m of this.mUpdateModify) {
            this.PlaneRefresh(m);
            let cx = Math.floor(m.x / this.mDiv);
            let cy = Math.floor(m.y / this.mDiv);
            let cz = Math.floor(m.z / this.mDiv);
            let pi = cx + cy * cntX + cz * cntX * cntY;
            if (!chunkMap.has(pi))
                chunkMap.set(pi, []);
            chunkMap.get(pi).push(m);
        }
        for (let [pi, cells] of chunkMap) {
            let paint = this.mPaintArr[pi];
            if (paint == null)
                continue;
            let cz = Math.floor(pi / (cntX * cntY));
            let cy = Math.floor((pi % (cntX * cntY)) / cntX);
            let cx = pi % cntX;
            let x0 = cx * this.mDiv, y0 = cy * this.mDiv, z0 = cz * this.mDiv;
            let chunkW = Math.min(this.mDiv, this.mBuf.mCount.x - x0);
            let chunkH = Math.min(this.mDiv, this.mBuf.mCount.y - y0);
            let chunkPlanes = new Array();
            for (let m of cells) {
                let lx = m.x - x0, ly = m.y - y0, lz = m.z - z0;
                let localBase = (lx + ly * chunkW + lz * chunkW * chunkH) * 6;
                let globalBase = m.x * 6 + m.y * this.mBuf.mCount.x * 6
                    + m.z * this.mBuf.mCount.x * this.mBuf.mCount.y * 6;
                for (let j = 0; j < 6; ++j) {
                    let plane = this.mPlane[globalBase + j];
                    plane.mOff = localBase + j;
                    chunkPlanes.push(plane);
                }
            }
            paint.Rebuild(chunkPlanes);
        }
        this.mUpdateModify.clear();
    }
    PlaneRefresh(_index) {
    }
    IndexOut(_index) {
        if (_index.x < 0 || _index.x >= this.mBuf.mCount.x || _index.y < 0 || _index.y >= this.mBuf.mCount.y || _index.z < 0 || _index.z >= this.mBuf.mCount.z)
            return true;
        return false;
    }
    IsBlock(_cim, _add) {
        let x = _cim.x + _add.x;
        let y = _cim.y + _add.y;
        let z = _cim.z + _add.z;
        if (x < 0 || x >= this.mBuf.mCount.x || y < 0 || y >= this.mBuf.mCount.y ||
            z < 0 || z >= this.mBuf.mCount.z)
            return false;
        return this.mBuf.RGB(x + this.mBuf.mCount.x * y + this.mBuf.mCount.x * this.mBuf.mCount.y * z) != 0;
    }
    GetTexCodi(_color, _texCodi) {
        let tile = this.mTileMap.get(_color);
        if (tile == null)
            this.mAtlas.GetUV(0, _texCodi);
        else
            this.mAtlas.GetUV(tile.mAtlas, _texCodi);
    }
    GetLight(_index, _dir, _light) {
        let x = _index.x + _dir.x;
        let y = _index.y + _dir.y;
        let z = _index.z + _dir.z;
        _light.x = 1.0;
        _light.y = 0.0;
    }
    RefreshRes() {
    }
    Update(_update) {
        if (this.mUpdateRes)
            this.RefreshRes();
        if (this.mUpdateModify.size > 0)
            this.RefreshModify();
    }
    PickBox(_ray) {
        return null;
    }
    Bonds(_index, _data) {
        if (this.IndexOut(_index))
            return;
        this.mBuf.RGB(_index, _data);
        if (_data == 0) {
            this.mBuf.RGB(_index, 0);
            this.mUpdateModify.add(_index.Export());
            if (this.mBuf.mCount.z != 1) {
                _index.Add(1, 0, 0);
                this.mUpdateModify.add(_index.Export());
                _index.Add(-2, 0, 0);
                this.mUpdateModify.add(_index.Export());
                _index.Add(1, 1, 0);
                this.mUpdateModify.add(_index.Export());
                _index.Add(0, -2, 0);
                this.mUpdateModify.add(_index.Export());
                _index.Add(0, 1, 1);
                this.mUpdateModify.add(_index.Export());
                _index.Add(0, 0, -2);
                this.mUpdateModify.add(_index.Export());
            }
            return;
        }
        let select = this.mTileMap.get(_data);
        if (select == null) {
            CAlert.E("select가 없음");
            return;
        }
        this.mUpdateModify.add(_index.Export());
        this.RoleChk(_index);
    }
    RoleChk(_index) {
        let data = [16383, 16383, 16383, 16383, 16383, 16383, 16383, 16383, 16383];
        let ix = new CCIndex();
        let mo = 0;
        if (this.mBuf.mCount.z == 1) {
            for (var y = _index.y + 1; y >= _index.y - 1; --y) {
                for (var x = _index.x - 1; x <= _index.x + 1; ++x) {
                    ix.x = x;
                    ix.y = y;
                    ix.z = 0;
                    if (ix.x < 0 || ix.x >= this.mBuf.mCount.x || ix.y < 0 || ix.y >= this.mBuf.mCount.y || ix.z < 0 || ix.z >= this.mBuf.mCount.z) {
                        mo++;
                        continue;
                    }
                    let off = ix.Offset(this.mBuf.mCount);
                    data[mo] = this.mBuf.RGB(off);
                    mo++;
                }
            }
        }
        else {
            for (var x = _index.x + 1; x >= _index.x - 1; --x) {
                for (var z = _index.z - 1; z <= _index.z + 1; ++z) {
                    ix.x = x;
                    ix.y = _index.y;
                    ix.z = z;
                    if (ix.x < 0 || ix.x >= this.mBuf.mCount.x || ix.y < 0 || ix.y >= this.mBuf.mCount.y || ix.z < 0 || ix.z >= this.mBuf.mCount.z) {
                        mo++;
                        continue;
                    }
                    let off = ix.Offset(this.mBuf.mCount);
                    data[mo] = this.mBuf.RGB(off);
                    mo++;
                }
            }
        }
        for (let j = 0; j < this.mTileRoleArr.length; ++j) {
            let modify = true;
            for (let i = 0; i < 9; ++i) {
                if (this.mTileRoleArr[j].mRole[i] == 16383 || data[i] == 16383)
                    continue;
                else if (data[i] != this.mTileRoleArr[j].mRole[i])
                    modify = false;
            }
            if (modify) {
                let role = this.mTileRoleArr[j];
                let off = _index.Offset(this.mBuf.mCount);
                this.mBuf.RGB(off, role.GetTile());
                break;
            }
        }
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        var button = document.createElement("button");
        button.innerText = "VoxelTool";
        button.onclick = () => {
            window["VoxelTool"](this);
        };
        _div.append(button);
        var button = document.createElement("button");
        button.innerText = "BufferTool";
        button.onclick = () => {
            window["BufferTool"](this.mBuf.GetBuf(), this.mBuf.mCount, Array.from(this.mTileMap.values()), null, false, true).then(() => {
                this.mPlane.length = 0;
                this.mComArr.length = 0;
                this.mComEnableArr.length = 0;
                this.mPaintArr.length = 0;
                this.mPTArr = null;
                this.mUpdateRes = true;
            });
        };
        _div.append(button);
    }
    SetPos(_pos, _reset = true) {
        super.SetPos(_pos, _reset);
        this.RemoveComps(CPaintVoxel);
        this.RemoveComps(CCollider);
    }
    static Sun = 5;
    static Torch = 10;
    static GSun(_texInfo) {
        return (_texInfo >>> 25) & 0b111;
    }
    static GTorch(_texInfo) {
        return (_texInfo >>> 28) & 0b1111;
    }
    static SSun(_texInfo, _val) {
        _texInfo &= ~(0b111 << 25);
        _texInfo |= (_val << 25);
        return _texInfo;
    }
    static STorch(_texInfo, _val) {
        _texInfo &= ~(0b1111 << 28);
        _texInfo |= (_val << 28);
        return _texInfo;
    }
}
import CVoxel_imple from "../../app_imple/subject/CVoxelMap.js";
import { CColor } from "../../render/CColor.js";
CVoxel_imple();
