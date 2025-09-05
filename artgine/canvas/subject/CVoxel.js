import { CVec3 } from "../../geometry/CVec3.js";
import { CAtlas } from "../../util/CAtlas.js";
import { CCollider } from "../component/CCollider.js";
import { CPaintVoxel } from "../component/paint/CPaintVoxel.js";
import { CSubject } from "./CSubject.js";
import { CBlackBoardRef, CObject } from "../../basic/CObject.js";
import { CCIndex } from "../CCIndex.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CUtil } from "../../basic/CUtil.js";
import { CClass } from "../../basic/CClass.js";
import { CNavigation } from "../component/CNavigation.js";
import { CAlert } from "../../basic/CAlert.js";
import { CColor } from "../component/CColor.js";
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
export class CVTileSurface extends CObject {
    mAtlOff = 0;
    mRevers = CCIndex.eRevers.X0Y0;
    mRate = 1;
    mColor = null;
    constructor(_int32 = null) {
        super();
        if (_int32 != null) {
            if (_int32 instanceof CColor || _int32 instanceof CVec3) {
                this.mAtlOff = -1;
                this.mColor.x = _int32.x;
                this.mColor.y = _int32.y;
                this.mColor.z = _int32.z;
            }
            else if (((_int32 >> 24) & 0xFF) == 1) {
                this.mAtlOff = -1;
                this.mColor = new CVec3((_int32 >> 16) & 0xFF, (_int32 >> 8) & 0xFF, (_int32 >> 0) & 0xFF);
            }
            else {
                this.mAtlOff = (_int32 >> 0) & 0x3FFF;
                this.mRevers = (_int32 >> 14) & 0x03;
            }
        }
    }
    ToUInt32() {
        if (this.mAtlOff < 0) {
            if (this.mColor == null) {
                this.mColor = new CVec3();
            }
            return ((1 << 24) + (Math.round(255 * this.mColor.x) << 16) + (Math.round(255 * this.mColor.y) << 8) + (Math.round(255 * this.mColor.z) << 0));
        }
        else
            return this.mAtlOff + (this.mRevers << 14);
    }
}
export class CVTileSurfacePattern extends CObject {
    mPattern = new Array();
    GetTile() {
        let sum = 0;
        for (let i = 0; i < this.mPattern.length; ++i) {
            sum += this.mPattern[i].mRate;
        }
        let ran = Math.random() * sum;
        for (let i = 0; i < this.mPattern.length; ++i) {
            ran -= this.mPattern[i].mRate;
            if (ran < 0) {
                return this.mPattern[i].ToUInt32();
            }
        }
        return 0;
    }
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member == "mPattern") {
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [new CVTileSurface]);
        }
    }
}
export class CVTile extends CVTileSurfacePattern {
    mVInfo = 0;
    mCollider = CVoxel.eColliderEvent.Null;
    constructor() {
        super();
    }
    EditForm(_pointer, _div, _input) {
        super.EditForm(_pointer, _div, _input);
        if (_pointer.member == "mCollider") {
            let textArr = [], valArr = [];
            for (let [text, val] of Object.entries(CVoxel.eColliderEvent)) {
                textArr.push(text);
                valArr.push(val);
            }
            _div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
        }
    }
}
export class CVTileRole extends CVTileSurfacePattern {
    mRole;
    constructor() {
        super();
        this.mRole = [
            16383, 16383, 16383, 16383, 16383, 16383, 16383, 16383, 16383
        ];
    }
}
export class CVTileMold extends CObject {
    mWidth;
    mHeight;
    mTileVInfoArr;
    constructor(_width = 1, _height = 1) {
        super();
        this.mWidth = _width;
        this.mHeight = _height;
        this.mTileVInfoArr = new Array(this.mWidth * this.mHeight);
        this.mTileVInfoArr.fill(-1);
    }
}
CClass.Push(CVTile);
CClass.Push(CVTileRole);
CClass.Push(CVTileSurfacePattern);
CClass.Push(CVTileSurface);
CClass.Push(CVTileMold);
export class CVoxel extends CSubject {
    static eColliderEvent = {
        Null: 0,
        Collision: 1,
        Trigger: 2,
    };
    mAtlas = new CAtlas();
    mVInfo = null;
    mTexInfo = null;
    mColliderEvent = new Array(256);
    mTileArr = new Array();
    mTileRoleArr = new Array();
    mTileMoldArr = new Array();
    mPaint = null;
    mPlane = new Array();
    mCount = new CVec3();
    mSize = 0;
    mUpdateRes = true;
    mUpdateModify = new Set();
    m2D = false;
    mLight = false;
    static SunValue = 1.0;
    mLayer = new Array();
    IsShould(_member, _type) {
        if (_member == "mPaint" || _member == "mUpdateRes" || _member == "mPlane")
            return false;
        return super.IsShould(_member, _type);
    }
    constructor() {
        super();
        this.ResetInfo(new CVec3(8, 8, 8), 100, true);
        this.mAtlas.Push("test.png", CUtil.Base64ToArray("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABuSURBVDhPlY9RDoAwCEM9iJ/e/2aeARmtZGEw8aU/0r7EHfITCvd5IficCdUQ/DQXYK0SQWPj/J4LVSg0HSwpKKEO4WgWlDDysDa+BXYvrV/iwug+GjNlCKGrshOqo5IIKJT0Ht+AT2e9U+gi8gD5Qf9Q2ZUDNwAAAABJRU5ErkJggg=="));
        this.mColliderEvent.fill(0);
    }
    ColliderEventReset() {
        this.mColliderEvent.fill(0);
        for (let s of this.mTileArr) {
            if (s.mCollider) {
                this.mColliderEvent[s.mVInfo] = s.mCollider;
            }
        }
    }
    PushTile(_tile) {
        this.mColliderEvent[_tile.mVInfo] = _tile.mCollider;
        this.mTileArr.push(_tile);
    }
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member == "mAtlas") {
        }
        if (_pointer.member == "mLayer") {
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [new CBlackBoardRef]);
        }
    }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_child == false)
            return;
        if (_pointer.member == "mCollider") {
            this.mColliderEvent.fill(0);
            for (let s of this.mTileArr) {
                if (s.mCollider) {
                    this.mColliderEvent[s.mVInfo] = s.mCollider;
                }
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
    }
    SubjectUpdate(_delay) {
        super.SubjectUpdate(_delay);
        if (this.mAtlas.mBase64.mData == null) {
            return;
        }
        if (this.mUpdateRes)
            this.RefreshRes();
        if (this.mPaint && this.mPaint.mMD.vGBufEx && this.mUpdateModify.size > 0)
            this.RefreshModify();
    }
    IsBlock(_cim, _add) {
        let x = _cim.x + _add.x;
        let y = _cim.y + _add.y;
        let z = _cim.z + _add.z;
        if (x < 0 || x >= this.mCount.x || y < 0 || y >= this.mCount.y ||
            z < 0 || z >= this.mCount.z)
            return false;
        return this.mVInfo[x + this.mCount.x * y + this.mCount.x * this.mCount.y * z] != 0;
    }
    ResetInfo(_count, _size, _2d) {
        this.m2D = _2d;
        this.mPlane.length = 0;
        this.RemoveComps(CPaintVoxel);
        this.RemoveComps(CCollider);
        this.RemoveComps(CNavigation);
        this.mSize = _size;
        this.mCount = _count;
        if (this.m2D) {
            this.mCount.z = 1;
        }
        this.mVInfo = new Uint8Array(this.mCount.x * this.mCount.y * this.mCount.z);
        this.mTexInfo = new Uint32Array(this.mCount.x * this.mCount.y * this.mCount.z);
        this.mVInfo.fill(0);
        this.mTexInfo.fill(0);
        this.mUpdateRes = true;
    }
    RefreshModify() {
        let pArr = new Array();
        for (let m of this.mUpdateModify) {
            this.PlaneRefresh(m);
            var loff = m.x * 6 + m.y * this.mCount.x * 6 + m.z * this.mCount.y * this.mCount.z * 6;
            for (let i = 0; i < 6; ++i)
                pArr.push(this.mPlane[loff + i]);
        }
        this.mPaint.Rebuild(pArr);
        this.mUpdateModify.clear();
    }
    PlaneRefresh(_index) {
    }
    RefreshRes(_fw = null) {
    }
    GetLight(_index, _dir, _light) {
        let x = _index.x + _dir.x;
        let y = _index.y + _dir.y;
        let z = _index.z + _dir.z;
        if (this.m2D) {
            _light.x = 1.0;
            _light.y = 0.0;
            return;
        }
        if (x < 0 || x >= this.mCount.x || y < 0 || y >= this.mCount.y ||
            z < 0 || z >= this.mCount.z)
            return 0;
        if (this.mLight) {
            _light.x = CVoxel.GSun(this.mTexInfo[x + this.mCount.x * y + this.mCount.x * this.mCount.y * z]) / CVoxel.Sun;
            _light.y = CVoxel.GTorch(this.mTexInfo[x + this.mCount.x * y + this.mCount.x * this.mCount.y * z]) / CVoxel.Torch;
        }
    }
    GetTexCodi(_texInfo, _texCodi) {
        let isCol = (_texInfo >>> 24) & 0b1;
        if (isCol) {
            _texCodi.x = ((_texInfo >> 16) & 0xff) / 255;
            _texCodi.y = ((_texInfo >> 8) & 0xff) / 255;
            _texCodi.z = ((_texInfo >> 0) & 0xff) / 255;
            _texCodi.w = -1;
            return;
        }
        let off = _texInfo & 0x3fff;
        let rev = _texInfo >> 14;
        this.mAtlas.GetTexCodi(off, _texCodi);
        let dummy = 0;
        switch (rev) {
            case CCIndex.eRevers.X0Y1:
                dummy = _texCodi.y;
                _texCodi.y = _texCodi.w;
                _texCodi.w = dummy;
                break;
            case CCIndex.eRevers.X1Y1:
                dummy = _texCodi.y;
                _texCodi.y = _texCodi.w;
                _texCodi.w = dummy;
                dummy = _texCodi.x;
                _texCodi.x = _texCodi.z;
                _texCodi.z = dummy;
                break;
            case CCIndex.eRevers.X1Y0:
                dummy = _texCodi.x;
                _texCodi.x = _texCodi.z;
                _texCodi.z = dummy;
                break;
        }
    }
    CollisionChk(_tar, _cList) {
    }
    PickBox(_ray) {
        return null;
    }
    Export(_copy, _resetKey) {
        var copy = super.Export(_copy, _resetKey);
        copy.DetachComp(CPaintVoxel);
        copy.DetachComp(CCollider);
        copy.DetachComp(CNavigation);
        return copy;
    }
    Import(_target) {
        this.ResetInfo(_target.mCount, _target.mSize, _target.m2D);
        let dfw = this.mFrame;
        let dkey = this.mKey;
        super.Import(_target);
        this.DetachComp(CPaintVoxel);
        this.DetachComp(CCollider);
        this.DetachComp(CNavigation);
        this.mFrame = dfw;
        this.mKey = dkey;
    }
    ExportJSON() {
        let ptVoxel = this.DetachComp(CPaintVoxel);
        let col = this.DetachComp(CCollider);
        let navi = this.DetachComp(CNavigation);
        let json = super.ExportJSON();
        if (ptVoxel)
            this.PushComp(ptVoxel);
        if (col)
            this.PushComp(col);
        if (navi)
            this.PushComp(navi);
        return json;
    }
    ImportCJSON(_json) {
        this.mAtlas = new CAtlas();
        let count = _json.GetVal("mCount");
        if (typeof count == "number") {
            if (_json.GetBool("m2D"))
                _json.Set("mCount", new CVec3(count, count, 1));
            else
                _json.Set("mCount", new CVec3(count, count, count));
        }
        let result = super.ImportCJSON(_json);
        this.mUpdateRes = true;
        this.mUpdateModify = new Set();
        return result;
    }
    Reset() {
        super.Reset();
        this.mPaint = null;
        this.mPlane.length = 0;
    }
    RoleChk(_index) {
        let data = [16383, 16383, 16383, 16383, 16383, 16383, 16383, 16383, 16383];
        let ix = new CCIndex();
        let mo = 0;
        if (this.m2D) {
            for (var y = _index.y + 1; y >= _index.y - 1; --y) {
                for (var x = _index.x - 1; x <= _index.x + 1; ++x) {
                    ix.x = x;
                    ix.y = y;
                    ix.z = 0;
                    if (ix.x < 0 || ix.x >= this.mCount.x || ix.y < 0 || ix.y >= this.mCount.y || ix.z < 0 || ix.z >= this.mCount.z) {
                        mo++;
                        continue;
                    }
                    let off = ix.Offset(this.mCount);
                    data[mo] = this.mVInfo[off];
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
                    if (ix.x < 0 || ix.x >= this.mCount.x || ix.y < 0 || ix.y >= this.mCount.y || ix.z < 0 || ix.z >= this.mCount.z) {
                        mo++;
                        continue;
                    }
                    let off = ix.Offset(this.mCount);
                    data[mo] = this.mVInfo[off];
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
                if (this.m2D) {
                    let off = _index.Offset(this.mCount);
                    this.mTexInfo[off] = role.GetTile();
                    this.mUpdateModify.add(ix.Export());
                }
                else {
                    let off = _index.Offset(this.mCount);
                    this.mTexInfo[off] = role.GetTile();
                    this.mUpdateModify.add(ix.Export());
                    mo++;
                }
                break;
            }
        }
    }
    BondsFill(_min, _max, _data) {
        for (let z = _min.z; z <= _max.z; ++z)
            for (let y = _min.y; y <= _max.y; ++y)
                for (let x = _min.x; x <= _max.x; ++x)
                    this.Bonds(new CCIndex(x, y, z), _data);
    }
    IndexOut(_index) {
        if (_index.x < 0 || _index.x >= this.mCount.x || _index.y < 0 || _index.y >= this.mCount.y || _index.z < 0 || _index.z >= this.mCount.z)
            return true;
        return false;
    }
    GetVInfo(_index) {
        if (this.IndexOut(_index))
            return null;
        return this.mVInfo[_index.Offset(this.mCount)];
    }
    Bonds(_index, _data) {
        if (this.IndexOut(_index))
            return;
        this.mVInfo[_index.Offset(this.mCount)] = _data;
        if (_data == 0) {
            this.mTexInfo[_index.Offset(this.mCount)] = 0;
            this.mUpdateModify.add(_index.Export());
            if (this.m2D == false) {
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
        let select = null;
        for (var ts of this.mTileArr) {
            if (ts.mVInfo == _data) {
                select = ts;
                break;
            }
        }
        if (select == null) {
            CAlert.E("select가 없음");
            return;
        }
        let tile = ts.GetTile();
        this.mTexInfo[_index.Offset(this.mCount)] = ts.GetTile();
        this.mUpdateModify.add(_index.Export());
        this.RoleChk(_index);
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
export class CVoxelLightSpace {
    mVoxelList = new Array();
    mIMap;
    constructor() {
        this.mIMap = new Uint32Array(64 * 16 * 16 * 16 * 64 * 16);
        this.mIMap.fill(0xffffffff);
    }
    AttachVoxel(_stIndex, _voxel) {
    }
    ST(_offset, _sun, _val) {
        let indexData = this.mIMap[_offset];
        if (indexData == 0xffffffff)
            return null;
        let cellIndex = indexData >>> 16;
        let localIndex = indexData & 0xFFFF;
        if (_sun) {
            this.mVoxelList[cellIndex].mTexInfo[localIndex] = CVoxel.SSun(this.mVoxelList[cellIndex].mTexInfo[localIndex], _val);
        }
        else {
            this.mVoxelList[cellIndex].mTexInfo[localIndex] = CVoxel.STorch(this.mVoxelList[cellIndex].mTexInfo[localIndex], _val);
        }
    }
    ITO(_index) {
        return _index.x + _index.y * 1024 + _index.z * 262144;
    }
    OTI(_offset, _index = new CCIndex()) {
        _index.z = Math.floor(_offset / 262144);
        _index.y = Math.floor((_offset % 262144) / 1024);
        _index.x = _offset % 1024;
        return _index;
    }
    GT(_offset) {
        let indexData = this.mIMap[_offset];
        if (indexData == 0xffffffff)
            return null;
        let cellIndex = indexData >>> 16;
        let localIndex = indexData & 0xFFFF;
        return this.mVoxelList[cellIndex].mTexInfo[localIndex];
    }
    GV(_offset) {
        let indexData = this.mIMap[_offset];
        if (indexData == 0xffffffff)
            return null;
        let cellIndex = indexData >>> 16;
        let localIndex = indexData & 0xFFFF;
        return this.mVoxelList[cellIndex].mVInfo[localIndex];
    }
    Sun(_index) {
    }
    RFloodFill(_list, _maxLight, _sun, _blockSet, _step, _lightArr, _dist, _zeroSet) {
    }
    FloodFill(_list, _maxLight, _sun, _blockSet, _step, _first) {
    }
    TorchCreate(_index) {
    }
    TorchRemove(_index) {
    }
    BlockSetUpdate(_blockSet) {
    }
}
import CVoxel_imple from "../../canvas_imple/subject/CVoxel.js";
CVoxel_imple();
