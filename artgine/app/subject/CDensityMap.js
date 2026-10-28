import { CUpdate } from "../../basic/Basic.js";
import { CBlackBoardRef, CObject } from "../../basic/CObject.js";
import { CTree } from "../../basic/CTree.js";
import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CColor } from "../../render/CColor.js";
import { CMesh } from "../../render/CMesh.js";
import { CMeshCopyNode } from "../../render/CMeshCopyNode.js";
import { CMeshTreeUpdate } from "../../render/CMeshTreeUpdate.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CLOD } from "../component/CLOD.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CCollider } from "../component/CCollider.js";
import { CPaint2D, CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3D, CPaint3DMerge } from "../component/paint/CPaint3D.js";
import { CMapBuf } from "./CMapBuf.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CUtilRender } from "../../render/CUtilRender.js";
import { CSubjectMap } from "./CSubjectMap.js";
import { CTerrainMap } from "./CTerrainMap.js";
export { CLOD } from "../component/CLOD.js";
export class CDensityColliderInfo extends CObject {
    mLayer = "";
    mBound = null;
    constructor(_layer = "", _bound = null) {
        super();
        this.mLayer = _layer;
        this.mBound = _bound;
    }
}
export class CDensityInfo extends CObject {
    mLabel = "";
    mSize;
    mColor;
    mPos = null;
    mSca = null;
    mRot = null;
    mBottomPos = false;
    mWind = 0;
    mColorModel;
    mCodi = null;
    mYSort = false;
    mCollider = new Array();
    mLODInfo = [];
    constructor(_color, _size, _lodInfo = null) {
        super();
        this.mColor = CDensityInfo.ResolveColor(_color);
        this.mSize = _size;
        if (_lodInfo != null)
            this.AddLODLevel(_lodInfo);
    }
    static ResolveColor(color) {
        if (color == null || color <= 0) {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            return ((r << 24) | (g << 16) | (b << 8) | 0x00) >>> 0;
        }
        return (color & 0xFFFFFF00) >>> 0;
    }
    Label() { return this.mLabel; }
    Color() { return this.mColor; }
    Size() { return this.mSize; }
    AddLODLevel(_resOrList, _distance = 0, _hysteresis = 0, _amount = 1, _paintTag = [], _paintShaderAttr = []) {
        CLOD.Add(this.mLODInfo, _resOrList, _distance, _hysteresis, _amount, _paintTag, _paintShaderAttr);
    }
}
class CLODGroup {
    mDensity = null;
    mPtMergeArr = new Array();
    mMatArr = null;
    mCodiArr = null;
    mCurLODLevel = 0;
    mPrevLODLevel = 0;
}
export class CChunk {
    mBound;
    mOwner;
    mInit = true;
    mPending = false;
    mGroupArr = new Array();
    constructor(_owner, _bound) {
        this.mOwner = _owner;
        this.mBound = _bound;
    }
    IsEmpty() { return this.mGroupArr.length == 0; }
    Update(_camera) {
        if (_camera == null)
            return;
        if (this.mBound == null)
            return;
        if (this.mInit != true && this.mPending != true && _camera.mUpdateMat == CUpdate.eType.Not)
            return;
        if (this.mInit == true)
            this.mInit = false;
        this.mPending = false;
        const dist = this.ComputeCameraDistance(_camera);
        for (const group of this.mGroupArr) {
            this.UpdateGroupLOD(group, dist);
        }
    }
    PushComp(_com) {
        return this.mOwner.PushChunkComp(_com);
    }
    GetFrame() { return this.mOwner.GetFrame(); }
    ComputeCameraDistance(_camera) {
        const eye = _camera.GetEye();
        const center = CPoolGeo.ProductV3();
        center.x = CMath.Clamp(eye.x, this.mBound.mMin.x, this.mBound.mMax.x);
        center.y = CMath.Clamp(eye.y, this.mBound.mMin.y, this.mBound.mMax.y);
        center.z = CMath.Clamp(eye.z, this.mBound.mMin.z, this.mBound.mMax.z);
        const dist = CMath.V3Distance(eye, center);
        CPoolGeo.RecycleV3(center);
        return dist;
    }
    UpdateGroupLOD(_group, _dist) {
        const level = CLOD.Select(_group.mDensity.mLODInfo, _dist, _group.mCurLODLevel);
        const prevMerge = _group.mPtMergeArr[_group.mPrevLODLevel];
        if (_group.mPrevLODLevel != _group.mCurLODLevel && prevMerge != null) {
            if (prevMerge.IsEnable() == true)
                prevMerge.SetEnable(false);
        }
        _group.mPrevLODLevel = _group.mCurLODLevel;
        if (_group.mPtMergeArr[level] === undefined) {
            const info = _group.mDensity.mLODInfo[level];
            if (info.mRes != null && this.mOwner.TakeLODBuild() == false) {
                this.mPending = true;
                return;
            }
            _group.mPtMergeArr[level] = this.BuildLevelMerge(_group.mDensity, info, _group.mMatArr, _group.mCodiArr);
        }
        _group.mCurLODLevel = level;
        const curMerge = _group.mPtMergeArr[level];
        if (level >= 0 && curMerge != null) {
            if (curMerge.IsEnable() == false)
                curMerge.SetEnable(true);
        }
    }
    Build() {
        this.mGroupArr = [];
        if (this.mOwner.mBuf == null || this.mOwner.mDensityArr == null)
            return;
        for (let density of this.mOwner.mDensityArr) {
            const group = this.BuildGroup(density);
            if (group != null)
                this.mGroupArr.push(group);
        }
        if (this.mOwner.mBoundXZ) {
            [this.mBound.mMin.y, this.mBound.mMin.z] = [this.mBound.mMin.z, this.mBound.mMin.y];
            [this.mBound.mMax.y, this.mBound.mMax.z] = [this.mBound.mMax.z, this.mBound.mMax.y];
            let y0 = Infinity, y1 = -Infinity;
            for (const group of this.mGroupArr) {
                for (const m of group.mMatArr) {
                    const a = m.mF32A, half = Math.hypot(a[4], a[5], a[6]) * 0.5;
                    y0 = Math.min(y0, a[13] - half);
                    y1 = Math.max(y1, a[13] + half);
                }
            }
            if (y0 <= y1) {
                this.mBound.mMin.y = y0;
                this.mBound.mMax.y = y1;
            }
        }
    }
    BuildGroup(_density) {
        const { matArr, codiArr } = this.PlaceInstances(_density);
        if (matArr.length == 0)
            return null;
        if (_density.mLODInfo.some(info => info.mRes != null) == false)
            return null;
        const group = new CLODGroup();
        group.mDensity = _density;
        group.mMatArr = matArr;
        group.mCodiArr = codiArr;
        group.mPtMergeArr = new Array(_density.mLODInfo.length);
        return group;
    }
    BuildLevelMerge(_density, _info, _matArr, _codiArr) {
        if (_info.mRes == null)
            return null;
        const { matArr, codiArr } = this.ReduceByAmount(_matArr, _codiArr, _info.mAmount);
        if (matArr.length == 0)
            return null;
        const isMesh = this.GetFrame().Res().Find(_info.mRes) instanceof CMesh;
        const billboard = isMesh == false && (this.mOwner.mBoundXZ || _info.mPaintTag.includes("billboard"));
        const mergeMat = billboard ? matArr.map(_m => CChunk.StripRotation(_m)) : matArr;
        let ptMerge = isMesh
            ? this.PushComp(new CPaint3DMerge(new Array(matArr.length).fill(_info.mRes), matArr, true, 1))
            : this.PushComp(new CPaint2DMerge(_info.mRes, mergeMat, codiArr));
        if (isMesh == false) {
            const pt2 = ptMerge;
            pt2.SetYSort(_density.mYSort);
            if (this.mOwner.mBoundXZ) {
                pt2.PushTag("billboard");
                pt2.PushCShaderAttr(new CShaderAttr("billboard", 1.0));
            }
        }
        ptMerge.SetEnable(false);
        const wind = _info.mWind >= 0 ? _info.mWind : _density.mWind;
        if (wind > 0)
            ptMerge.Wind(wind);
        if (_density.mColorModel != null)
            ptMerge.SetColorModel(_density.mColorModel);
        for (let tag of _info.mPaintTag)
            ptMerge.PushTag(tag);
        for (let shaderAttr of _info.mPaintShaderAttr)
            ptMerge.PushCShaderAttr(shaderAttr);
        if (ptMerge.StartChk())
            ptMerge.Start();
        return ptMerge;
    }
    static StripRotation(_m) {
        const s = _m.mF32A;
        const out = new CMat();
        const o = out.mF32A;
        o[0] = Math.hypot(s[0], s[1], s[2]);
        o[5] = Math.hypot(s[4], s[5], s[6]);
        o[10] = Math.hypot(s[8], s[9], s[10]);
        o[12] = s[12];
        o[13] = s[13];
        o[14] = s[14];
        out.UnitCheck();
        return out;
    }
    ReduceByAmount(_matArr, _codiArr, _amount) {
        const ratio = Math.max(0, Math.min(1, _amount));
        if (ratio >= 1)
            return { matArr: _matArr, codiArr: _codiArr };
        const matArr = new Array();
        const codiArr = new Array();
        const pos = CPoolGeo.ProductV3();
        const freq = 0.15;
        for (let i = 0; i < _matArr.length; i++) {
            _matArr[i].GetV3(3, pos);
            const n = this.PatchNoise(pos.x * freq, pos.z * freq);
            if (n > ratio)
                continue;
            matArr.push(_matArr[i]);
            if (_codiArr.length > 0)
                codiArr.push(_codiArr[i]);
        }
        CPoolGeo.RecycleV3(pos);
        return { matArr, codiArr };
    }
    PatchNoise(_x, _y) {
        const x0 = Math.floor(_x), y0 = Math.floor(_y);
        const fx = _x - x0, fy = _y - y0;
        const h = (ix, iy) => {
            const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
            return s - Math.floor(s);
        };
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
        return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
    PlaceInstances(_density) {
        const matArr = new Array();
        const codiArr = new Array();
        if (_density.mLODInfo.length == 0)
            return { matArr, codiArr };
        const refIsMesh = this.GetFrame().Res().Find(_density.mLODInfo[0].mRes) instanceof CMesh;
        const cellW = _density.mSize.x;
        const cellH = _density.mSize.y;
        if (cellW <= 0 || cellH <= 0)
            return { matArr, codiArr };
        const buf = this.mOwner.mBuf;
        const worldW = buf.mCount.x * buf.mSize;
        const worldH = buf.mCount.y * buf.mSize;
        const countX = Math.floor(worldW / cellW);
        const countY = Math.floor(worldH / cellH);
        const cxStart = Math.max(0, Math.floor(this.mBound.mMin.x / cellW) - 1);
        const cxEnd = Math.min(countX, Math.ceil(this.mBound.mMax.x / cellW) + 1);
        const cyStart = Math.max(0, Math.floor(this.mBound.mMin.y / cellH) - 1);
        const cyEnd = Math.min(countY, Math.ceil(this.mBound.mMax.y / cellH) + 1);
        if (cxStart >= cxEnd || cyStart >= cyEnd)
            return { matArr, codiArr };
        const targetRGB = (_density.mColor & 0xFFFFFF00) >>> 0;
        const pos = CPoolGeo.ProductV3();
        const scale = CPoolGeo.ProductV3();
        const rotation = CPoolGeo.ProductV3();
        const cbound = CPoolGeo.ProductBound();
        cbound.SetType(CBound.eType.Box);
        const rMat = CPoolGeo.ProductMat();
        const sMat = CPoolGeo.ProductMat();
        const defaultBound = new CBound();
        defaultBound.SetType(CBound.eType.Box);
        if (refIsMesh) {
            const mesh = this.GetFrame().Res().Find(_density.mLODInfo[0].mRes);
            const dummy = new CTree();
            dummy.mData = new CMeshCopyNode();
            CMeshTreeUpdate.TreeCopy(mesh.meshTree, dummy, new CMat(), defaultBound);
            const size = defaultBound.GetSize();
            const maxSize = CMath.Max(CMath.Max(size.x, size.y), size.z);
            defaultBound.mMin.x /= maxSize;
            defaultBound.mMin.y /= maxSize;
            defaultBound.mMin.z /= maxSize;
            defaultBound.mMax.x /= maxSize;
            defaultBound.mMax.y /= maxSize;
            defaultBound.mMax.z /= maxSize;
            const center = defaultBound.GetCenter();
            defaultBound.mMin.x -= center.x;
            defaultBound.mMin.y -= center.y;
            defaultBound.mMin.z -= center.z;
            defaultBound.mMax.x -= center.x;
            defaultBound.mMax.y -= center.y;
            defaultBound.mMax.z -= center.z;
        }
        else {
            defaultBound.InitBound(0.5);
        }
        const stride = countY + 1;
        for (const packed of this.mOwner.GetPlaceCell(_density)) {
            const cx = Math.floor(packed / stride);
            const cy = packed - cx * stride;
            if (cx < cxStart || cx >= cxEnd || cy < cyStart || cy >= cyEnd)
                continue;
            {
                const worldX = (cx + 0.5) * cellW;
                const worldY = (cy + 0.5) * cellH;
                if (worldX < this.mBound.mMin.x || worldX >= this.mBound.mMax.x)
                    continue;
                if (worldY < this.mBound.mMin.y || worldY >= this.mBound.mMax.y)
                    continue;
                const eps = 0.01;
                const checkPoints = [
                    [worldX, worldY],
                    [cx * cellW + eps, cy * cellH + eps],
                    [(cx + 1) * cellW - eps, cy * cellH + eps],
                    [cx * cellW + eps, (cy + 1) * cellH - eps],
                    [(cx + 1) * cellW - eps, (cy + 1) * cellH - eps],
                ];
                let anyMatch = false;
                for (const [wx, wy] of checkPoints) {
                    const bx = Math.floor(wx / buf.mSize);
                    const by = Math.floor(wy / buf.mSize);
                    const idx = new CCIndex(bx, by, 0);
                    if (buf.IndexOut(idx))
                        continue;
                    if (buf.RGB(idx) === targetRGB) {
                        anyMatch = true;
                        break;
                    }
                }
                if (!anyMatch)
                    continue;
                pos.Zero();
                if (_density.mPos != null)
                    CMath.V3AddV3(pos, _density.mPos.Execute(), pos);
                if (_density.mSca != null)
                    scale.Import(_density.mSca.Execute());
                else {
                    scale.Import(_density.mSize);
                }
                if (_density.mBottomPos != false)
                    pos.y += scale.y * 0.5;
                if (_density.mRot != null)
                    rotation.Import(_density.mRot.Execute());
                else
                    rotation.Zero();
                if (this.mOwner.mBoundXZ) {
                    pos.x += worldX;
                    pos.z += worldY;
                    const terrain = this.mOwner.mTerrain.Ref();
                    if (terrain != null)
                        pos.y += terrain.GetHeight(pos.x, pos.z);
                }
                else {
                    pos.x += worldX;
                    pos.y += worldY;
                }
                const trsMat = CMath.MatMul(CMath.MatScale(scale, sMat), CMath.MatRotation(rotation, rMat));
                trsMat.SetV3(3, pos);
                matArr.push(trsMat);
                if (!refIsMesh) {
                    if (_density.mCodi != null)
                        codiArr.push(_density.mCodi.Execute());
                }
                for (const colInfo of _density.mCollider) {
                    if (colInfo.mLayer == null || colInfo.mLayer == "")
                        continue;
                    const srcBound = colInfo.mBound ?? defaultBound;
                    CMath.V3MulMatCoordi(srcBound.mMin, trsMat, cbound.mMin);
                    CMath.V3MulMatCoordi(srcBound.mMax, trsMat, cbound.mMax);
                    if (!refIsMesh) {
                        const xHalf = (cbound.mMax.x - cbound.mMin.x) * 0.5;
                        const yHalf = (cbound.mMax.y - cbound.mMin.y) * 0.5;
                        const zHalf = Math.max(xHalf, Math.abs(yHalf));
                        const zCenter = (cbound.mMin.z + cbound.mMax.z) * 0.5;
                        cbound.mMin.z = zCenter - zHalf;
                        cbound.mMax.z = zCenter + zHalf;
                    }
                    const cl = this.PushComp(new CCollider());
                    cl.SetLayer(colInfo.mLayer);
                    cl.SetEvent(CCollider.eEvent.Static);
                    cl.InitBound(cbound);
                }
            }
        }
        CPoolGeo.RecycleV3(pos);
        CPoolGeo.RecycleV3(scale);
        CPoolGeo.RecycleV3(rotation);
        CPoolGeo.RecycleBound(cbound);
        CPoolGeo.RecycleMat(sMat);
        CPoolGeo.RecycleMat(rMat);
        return { matArr, codiArr };
    }
}
class CMapSubject {
    mSubject = null;
    mPaint = null;
    mCollider = new Array();
    mGroup = null;
    mSlot = -1;
    mWMat = new CMat();
    mDistance = 0;
    mDetach = false;
}
class CSubjectGroup {
    mKey = "";
    mMerge = null;
    mDistance = 0;
    mBuildID = -1;
    mPending = false;
    mItem = new Array();
}
class CSubjectChunk {
    mMin = new CVec3(Infinity, Infinity, Infinity);
    mMax = new CVec3(-Infinity, -Infinity, -Infinity);
    mGroup = new Map();
    mDirty = true;
}
export class CDensityMap extends CSubjectMap {
    mBuf = new CMapBuf();
    mDensityArr = new Array();
    mDiv = 100;
    mBoundXZ;
    mTerrain = new CBlackBoardRef(CTerrainMap);
    mUpdate = true;
    mLODBuildMs = 8;
    mLODBuildStart = 0;
    mLODBuildCount = 0;
    mLODPending = false;
    mCamera = null;
    mChunkArr = new Array();
    mColorCell = new Map();
    mPlaceCell = new Map();
    mChunkComp = new Array();
    mSubject = new Map();
    mSubjectWait = new Array();
    mSubjectChunk = new Map();
    mSubjectGroup = new Array();
    mSubjectMove = false;
    mSlotMat = new CMat();
    mMapInv = new CMat();
    mCodi = new CVec4();
    constructor(_boundXZ = false) {
        super();
        this.mBoundXZ = _boundXZ;
    }
    RecvGetCamera(_cam) {
        this.mCamera = _cam;
    }
    IsShould(_member, _type) {
        if (_member == "mUpdate" || _member == "mCamera" || _member == "mChunkArr" ||
            _member == "mColorCell" || _member == "mPlaceCell" || _member == "mLODBuildStart" || _member == "mLODBuildCount" || _member == "mLODPending" ||
            _member == "mChunkComp" || _member.startsWith("mSubject") || _member == "mSlotMat" || _member == "mMapInv" || _member == "mCodi")
            return false;
        return super.IsShould(_member, _type);
    }
    MapLog() {
        let json = {};
        json["countX"] = this.mBuf.mCount.x;
        json["countY"] = this.mBuf.mCount.y;
        json["countZ"] = this.mBuf.mCount.z;
        json["size"] = this.mBuf.mSize;
        json["labelArr"] = new Array();
        let size = new CVec3(this.mBuf.mSize, this.mBuf.mSize, this.mBuf.mSize);
        for (let tile of this.mDensityArr) {
            json["labelArr"].push({ "label": tile.Label(), "color": CColor.HexToRGB(tile.Color(), true).ToHex(), "sizeX": size.x, "sizeY": size.y, "sizeZ": size.z });
        }
        return JSON.stringify(json);
    }
    PushDensityInfo(_density) {
        this.mDensityArr.push(_density);
        return _density;
    }
    Push(_obj) {
        if (_obj instanceof CDensityInfo) {
            this.PushDensityInfo(_obj);
            return;
        }
        return super.Push(_obj);
    }
    SetTerrain(_terrain) {
        if (!_terrain.IsBlackBoard())
            _terrain.SetBlackBoard(true);
        this.mTerrain.Ref(_terrain.Key());
    }
    LoadJSON(_file) {
        return super.LoadJSON(_file).finally(() => {
            this.mUpdate = true;
        });
    }
    Update(_update) {
        super.Update(_update);
        this.UpdateSubjectSlot();
        this.UpdateChunkLOD();
        this.FlushComp();
    }
    UpdateChunkLOD() {
        if (this.mCamera == null) {
            var cm = this.NewOutMsg("SendGetCamera");
            cm.mInter = "canvas";
            cm.mMsgData[0] = this;
            return;
        }
        if (this.mUpdate == true) {
            if (this.UpdateChunks() == false)
                return;
            this.mUpdate = false;
        }
        this.mLODBuildStart = performance.now();
        this.mLODBuildCount = 0;
        this.mLODPending = false;
        for (const chunk of this.mChunkArr)
            chunk.Update(this.mCamera);
    }
    TakeLODBuild() {
        if (this.mLODBuildCount > 0 && performance.now() - this.mLODBuildStart >= this.mLODBuildMs) {
            this.mLODPending = true;
            return false;
        }
        this.mLODBuildCount++;
        return true;
    }
    IsLODPending() { return this.mUpdate || this.mLODPending; }
    UpdateChunks() {
        for (let density of this.mDensityArr) {
            for (let info of density.mLODInfo) {
                if (info.mRes == null)
                    continue;
                if (this.GetFrame().Res().Find(info.mRes) == null) {
                    this.GetFrame().Load().Exe(info.mRes);
                    return false;
                }
            }
        }
        for (const com of this.mChunkComp)
            com.Destroy();
        this.mChunkComp = [];
        this.ReleaseMapComp();
        this.mChunkArr = [];
        this.BuildColorCell();
        const div = Math.max(1, this.mDiv);
        const cntX = Math.ceil(this.mBuf.mCount.x / div);
        const cntY = Math.ceil(this.mBuf.mCount.y / div);
        const chunkWorldSize = this.mBuf.mSize * div;
        for (let cy = 0; cy < cntY; cy++) {
            for (let cx = 0; cx < cntX; cx++) {
                const bound = new CBound();
                bound.SetType(CBound.eType.Box);
                bound.mMin.Import(new CVec3(cx * chunkWorldSize, cy * chunkWorldSize, 0));
                bound.mMax.Import(new CVec3((cx + 1) * chunkWorldSize, (cy + 1) * chunkWorldSize, 0));
                const chunk = new CChunk(this, bound);
                chunk.Build();
                if (chunk.IsEmpty() == false)
                    this.mChunkArr.push(chunk);
            }
        }
        return true;
    }
    BuildColorCell() {
        this.mColorCell.clear();
        this.mPlaceCell.clear();
        const buf = this.mBuf.GetBuf();
        if (buf == null)
            return;
        const len = this.mBuf.mCount.x * this.mBuf.mCount.y;
        for (let i = 0; i < len; i++) {
            const rgb = (buf[i] & 0xFFFFFF00) >>> 0;
            if (rgb == 0)
                continue;
            let arr = this.mColorCell.get(rgb);
            if (arr == null) {
                arr = [];
                this.mColorCell.set(rgb, arr);
            }
            arr.push(i);
        }
    }
    GetPlaceCell(_density) {
        let arr = this.mPlaceCell.get(_density);
        if (arr != null)
            return arr;
        const cellW = _density.mSize.x;
        const cellH = _density.mSize.y;
        const size = this.mBuf.mSize;
        const cntX = this.mBuf.mCount.x;
        const stride = Math.floor(this.mBuf.mCount.y * size / cellH) + 1;
        const set = new Set();
        for (const i of this.mColorCell.get((_density.mColor & 0xFFFFFF00) >>> 0) ?? []) {
            const bx = i % cntX, by = Math.floor(i / cntX);
            const x0 = Math.floor(bx * size / cellW), x1 = Math.floor(((bx + 1) * size - 0.01) / cellW);
            const y0 = Math.floor(by * size / cellH), y1 = Math.floor(((by + 1) * size - 0.01) / cellH);
            for (let cx = x0; cx <= x1; cx++)
                for (let cy = y0; cy <= y1 && cy < stride; cy++)
                    set.add(cx * stride + cy);
        }
        arr = Array.from(set).sort((a, b) => a - b);
        this.mPlaceCell.set(_density, arr);
        return arr;
    }
    SetPos(_pos, _reset = true) {
        super.SetPos(_pos, _reset);
        this.mUpdate = true;
        this.mSubjectMove = true;
    }
    Destroy() {
        for (const sub of this.mSubject.keys())
            sub.Destroy();
        this.mSubject.clear();
        this.mSubjectWait.length = 0;
        super.Destroy();
    }
    PushChunkComp(_com) {
        this.mChunkComp.push(_com);
        return this.PushComp(_com);
    }
    HasSubject(_sub) { return this.mSubject.has(_sub); }
    PushSubject(_sub, _distance = 0) {
        if (_sub == null || _sub === this || this.mSubject.has(_sub))
            return false;
        const item = new CMapSubject();
        item.mSubject = _sub;
        item.mDistance = _distance;
        item.mPaint = this.SubjectPaint(_sub);
        if (_sub.GetFrame() != null) {
            item.mDetach = true;
            const cm = this.NewOutMsg("Detach");
            cm.mInter = "canvas";
            cm.mMsgData[0] = _sub.Key();
        }
        _sub.mUpdateMat = CUpdate.eType.Not;
        _sub.mUpdateRS = CUpdate.eType.Not;
        for (const cl of _sub.FindComps(CCollider)) {
            if (cl.IsEnable() == false)
                continue;
            const ci = _sub.mComArr.indexOf(cl);
            if (ci >= 0)
                _sub.mComArr.splice(ci, 1);
            _sub.UpdateComp();
            cl.SetEvent(CCollider.eEvent.Static);
            item.mCollider.push(this.PushComp(cl));
        }
        this.mSubject.set(_sub, item);
        if (item.mPaint != null && this.AttachSubject(item) == false)
            this.mSubjectWait.push(item);
        return true;
    }
    PopSubject(_sub) {
        const item = this.mSubject.get(_sub);
        if (item == null)
            return false;
        this.ReleaseSubject(item, true);
        if (_sub.GetFrame() == null)
            _sub.SetFrame(this.GetFrame());
        _sub.mUpdateMat = CUpdate.eType.Updated;
        _sub.mUpdateRS = CUpdate.eType.Updated;
        const cm = this.NewOutMsg("PushSub");
        cm.mInter = "canvas";
        cm.mMsgData[0] = _sub;
        if (item.mDetach)
            cm.mMsgData[1] = false;
        return true;
    }
    SubjectPaint(_sub) {
        for (const pt of _sub.FindComps(CPaint)) {
            const ctor = pt.constructor;
            if (ctor !== CPaint2D && ctor !== CPaint3D)
                continue;
            if (pt.IsEnable() == false)
                continue;
            if (pt.GetTag().has("tail") && pt.mWindInfluence.x <= 0)
                continue;
            return pt;
        }
        return null;
    }
    ReleaseSubject(_item, _giveBack = false) {
        this.mSubject.delete(_item.mSubject);
        const wi = this.mSubjectWait.indexOf(_item);
        if (wi >= 0)
            this.mSubjectWait.splice(wi, 1);
        const group = _item.mGroup;
        if (group != null) {
            if (_item.mSlot >= 0)
                group.mMerge.Remove(_item.mSlot);
            const gi = group.mItem.indexOf(_item);
            if (gi >= 0) {
                group.mItem[gi] = group.mItem[group.mItem.length - 1];
                group.mItem.pop();
            }
        }
        _item.mGroup = null;
        _item.mSlot = -1;
        if (_item.mCollider.length > 0) {
            for (const cl of _item.mCollider) {
                this.DetachMapCollider(cl);
                if (_giveBack)
                    _item.mSubject.PushComp(cl);
                else
                    cl.Destroy();
            }
            _item.mCollider.length = 0;
            if (_giveBack == false)
                this.ReleaseMapComp();
        }
    }
    AttachSubject(_item) {
        const pt = _item.mPaint;
        if (pt.GetOwner() == null || pt.GetOwner().GetFrame() == null)
            pt.SetOwner(this);
        if (pt instanceof CPaint2D) {
            if (pt.mInit == false) {
                pt.InitChk();
                if (pt.mInit == false)
                    return false;
            }
            pt.MatUpdate();
        }
        else if (pt.GetTexture().length > 0)
            pt.SetTexture(pt.GetTexture());
        this.BakeSubjectMat(_item);
        const mat = this.SubjectSlotMat(_item);
        const chunk = this.SubjectChunk(mat);
        const key = this.SubjectGroupKey(pt) + "|" + _item.mDistance;
        let group = chunk.mGroup.get(key);
        if (group == null) {
            group = new CSubjectGroup();
            group.mKey = key;
            group.mDistance = _item.mDistance;
            group.mMerge = this.NewSubjectMerge(pt);
            chunk.mGroup.set(key, group);
            this.mSubjectGroup.push(group);
        }
        _item.mGroup = group;
        _item.mSlot = -1;
        group.mItem.push(_item);
        group.mPending = true;
        const a = mat.mF32A;
        const half = Math.max(Math.hypot(a[0], a[1], a[2]), Math.hypot(a[4], a[5], a[6]), Math.hypot(a[8], a[9], a[10])) * 0.5;
        chunk.mMin.x = Math.min(chunk.mMin.x, a[12] - half);
        chunk.mMax.x = Math.max(chunk.mMax.x, a[12] + half);
        chunk.mMin.y = Math.min(chunk.mMin.y, a[13] - half);
        chunk.mMax.y = Math.max(chunk.mMax.y, a[13] + half);
        chunk.mMin.z = Math.min(chunk.mMin.z, a[14] - half);
        chunk.mMax.z = Math.max(chunk.mMax.z, a[14] + half);
        chunk.mDirty = true;
        return true;
    }
    BakeSubjectMat(_item) {
        const pt = _item.mPaint;
        const m = this.mSlotMat.mF32A;
        m.set(pt.GetMat().mF32A);
        if (pt instanceof CPaint2D) {
            const s = CUtilRender.Mesh2DSize;
            m[0] *= s;
            m[1] *= s;
            m[2] *= s;
            m[4] *= s;
            m[5] *= s;
            m[6] *= s;
        }
        this.mSlotMat.UnitCheck();
        CMath.MatMul(this.mSlotMat, _item.mSubject.GetMat(), _item.mWMat);
    }
    SubjectSlotMat(_item) {
        if (this.GetMat().IsUnit())
            return _item.mWMat;
        CMath.MatInvert(this.GetMat(), this.mMapInv);
        return CMath.MatMul(_item.mWMat, this.mMapInv, this.mSlotMat);
    }
    SubjectChunk(_mat) {
        const size = this.mBuf.mSize * Math.max(1, this.mDiv);
        const a = _mat.mF32A;
        let key = "0";
        if (size > 0)
            key = Math.floor(a[12] / size) + "_" + Math.floor((this.mBoundXZ ? a[14] : a[13]) / size);
        let chunk = this.mSubjectChunk.get(key);
        if (chunk == null) {
            chunk = new CSubjectChunk();
            this.mSubjectChunk.set(key, chunk);
        }
        return chunk;
    }
    SubjectGroupKey(_pt) {
        const tag = [..._pt.GetTag()].filter(_t => CDensityMap.IsMergeTag(_t)).sort().join(",");
        let key = tag + "|" + _pt.GetTexture().join(",") + "|" + _pt.GetColorModel().mF32A.join(",") + "|" + _pt.GetAlphaModel().mF32A.join(",");
        if (_pt instanceof CPaint2D)
            key = "2D|" + key + "|" + _pt.mYSort + "|" + _pt.mWindInfluence.x;
        else {
            const pt3D = _pt;
            key = "3D|" + key + "|" + pt3D.mMesh + "|" + "|" + pt3D.mWindInfluence.x;
        }
        return key;
    }
    NewSubjectMerge(_pt) {
        let merge;
        if (_pt instanceof CPaint2D) {
            const m2D = new CPaint2DMerge(null);
            m2D.SetYSort(_pt.mYSort);
            if (_pt.mWindInfluence.x > 0)
                m2D.Wind(_pt.mWindInfluence.x);
            m2D.SetTexture([..._pt.GetTexture()]);
            merge = m2D;
        }
        else {
            const pt3D = _pt;
            const m3D = new CPaint3DMerge([], []);
            if (pt3D.mWindInfluence.x > 0)
                m3D.Wind(pt3D.mWindInfluence.x);
            if (pt3D.GetTexture().length > 0)
                m3D.mTexOverride = [...pt3D.GetTexture()];
            merge = m3D;
        }
        for (const tag of _pt.GetTag())
            if (CDensityMap.IsMergeTag(tag))
                merge.PushTag(tag);
        if (_pt.GetTag().has("colorModel"))
            merge.SetColorModel(_pt.GetColorModel());
        if (_pt.GetTag().has("alphaModel"))
            merge.SetAlphaModel(_pt.GetAlphaModel());
        this.PushComp(merge);
        return merge;
    }
    static IsMergeTag(_tag) { return _tag != "codi" && _tag != "tail" && _tag != "wind"; }
    PushSubjectSlot(_merge, _item) {
        const mat = this.SubjectSlotMat(_item);
        if (_merge instanceof CPaint3DMerge)
            _item.mSlot = _merge.Push(_item.mPaint.mMesh, mat);
        else {
            this.mCodi.mF32A.set(_item.mPaint.GetTexCodi().mF32A);
            _item.mSlot = _merge.Push(mat, this.mCodi);
        }
    }
    UpdateSubjectSlot() {
        if (this.mSubject.size == 0)
            return;
        for (const item of this.mSubject.values()) {
            const sub = item.mSubject;
            if (sub.IsDestroy())
                this.ReleaseSubject(item);
            else if (sub.mUpdateMat != CUpdate.eType.Not || sub.mUpdateRS != CUpdate.eType.Not) {
                sub.mUpdateMat = CUpdate.eType.Not;
                sub.mUpdateRS = CUpdate.eType.Not;
            }
        }
        for (let i = 0; i < this.mSubjectWait.length; ++i) {
            if (this.AttachSubject(this.mSubjectWait[i]) == false)
                continue;
            this.mSubjectWait.splice(i, 1);
            --i;
        }
        const move = this.mSubjectMove;
        this.mSubjectMove = false;
        for (const group of this.mSubjectGroup) {
            const merge = group.mMerge;
            if (merge.IsReady() == false)
                continue;
            if (group.mBuildID != merge.GetBuildID()) {
                group.mBuildID = merge.GetBuildID();
                for (const item of group.mItem)
                    item.mSlot = -1;
                group.mPending = true;
            }
            if (group.mPending) {
                for (const item of group.mItem)
                    if (item.mSlot < 0)
                        this.PushSubjectSlot(merge, item);
                group.mPending = false;
            }
            else if (move) {
                for (const item of group.mItem)
                    if (item.mSlot >= 0)
                        merge.Modify(item.mSlot, this.SubjectSlotMat(item));
            }
        }
        const cam = this.mCamera;
        if (cam == null)
            return;
        for (const chunk of this.mSubjectChunk.values()) {
            if (chunk.mDirty == false && cam.mUpdateMat == CUpdate.eType.Not)
                continue;
            chunk.mDirty = false;
            const eye = cam.GetEye();
            const dist = Math.hypot(eye.x - CMath.Clamp(eye.x, chunk.mMin.x, chunk.mMax.x), eye.y - CMath.Clamp(eye.y, chunk.mMin.y, chunk.mMax.y), this.mBoundXZ ? eye.z - CMath.Clamp(eye.z, chunk.mMin.z, chunk.mMax.z) : 0);
            for (const group of chunk.mGroup.values()) {
                const show = group.mDistance <= 0 || dist <= group.mDistance;
                if (group.mMerge.IsEnable() != show)
                    group.mMerge.SetEnable(show);
            }
        }
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        var button = document.createElement("button");
        button.innerText = "BufferTool";
        button.onclick = () => {
            window["BufferTool"](this.mBuf.mBuffer, this.mBuf.mCount, this.mDensityArr, this.mBuf.mSize, false, true).then(() => {
                this.SetPos(this.GetPos());
            });
        };
        _div.append(button);
    }
}
