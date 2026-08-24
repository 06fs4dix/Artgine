import { CUpdate } from "../../basic/Basic.js";
import { CBlackBoardRef, CObject } from "../../basic/CObject.js";
import { CTree } from "../../basic/CTree.js";
import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CColor } from "../../render/CColor.js";
import { CMesh } from "../../render/CMesh.js";
import { CMeshCopyNode } from "../../render/CMeshCopyNode.js";
import { CMeshTreeUpdate } from "../../render/CMeshTreeUpdate.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CCollider } from "../component/CCollider.js";
import { CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3DMerge } from "../component/paint/CPaint3D.js";
import { CMapBuf } from "./CMapBuf.js";
import { CSubject } from "./CSubject.js";
import { CTerrainMap } from "./CTerrainMap.js";
export class CLODInfo {
    mRes;
    mAmount;
    mDistance;
    mHysteresis;
    mPaintTag = new Array();
    mPaintShaderAttr = new Array();
    constructor(_res, _amount, _dist, _hysteresis, _paintTag = [], _paintShaderAttr = []) {
        this.mRes = _res;
        this.mAmount = _amount;
        this.mDistance = _dist;
        this.mHysteresis = _hysteresis;
        this.mPaintTag = _paintTag;
        this.mPaintShaderAttr = _paintShaderAttr;
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
    mColliderLayer = null;
    mColliderBound = null;
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
    AddLODLevel(_resOrList, _distance = 0, _hysteresis = 0, _amount = 1) {
        if (Array.isArray(_resOrList)) {
            for (const info of _resOrList) {
                this.InsertLODInfo(new CLODInfo(info.mRes ?? null, info.mAmount ?? 1, info.mDistance ?? 0, info.mHysteresis ?? 0, info.mPaintTag ?? [], info.mPaintShaderAttr ?? []));
            }
            return;
        }
        this.InsertLODInfo(new CLODInfo(_resOrList, _amount, Math.abs(_distance), _hysteresis));
    }
    InsertLODInfo(_info) {
        const insertIndex = this.mLODInfo.findIndex(existing => _info.mDistance < existing.mDistance);
        const index = insertIndex === -1 ? this.mLODInfo.length : insertIndex;
        this.mLODInfo.splice(index, 0, _info);
    }
}
class CLODGroup {
    mDensity = null;
    mPtMergeArr = new Array();
    mCurLODLevel = 0;
    mPrevLODLevel = 0;
}
export class CChunk extends CSubject {
    mBound;
    mBuf;
    mDensityArr;
    mTerrain = new CBlackBoardRef(CTerrainMap);
    mBoundXZ = false;
    mCamera;
    mInit = true;
    mGroupArr = new Array();
    Update(_update) {
        super.Update(_update);
        if (this.mCamera == null)
            return;
        if (this.mBound == null)
            return;
        if (this.mInit != true && this.mCamera.mUpdateMat == CUpdate.eType.Not)
            return;
        if (this.mInit == true)
            this.mInit = false;
        const distSq = this.ComputeCameraDistanceSq();
        for (const group of this.mGroupArr) {
            this.UpdateGroupLOD(group, distSq);
        }
    }
    ComputeCameraDistanceSq() {
        const eye = this.mCamera.GetEye();
        const center = CPoolGeo.ProductV3();
        center.x = CMath.Clamp(eye.x, this.mBound.mMin.x, this.mBound.mMax.x);
        center.y = CMath.Clamp(eye.y, this.mBound.mMin.y, this.mBound.mMax.y);
        center.z = CMath.Clamp(eye.z, this.mBound.mMin.z, this.mBound.mMax.z);
        const distSq = Math.max(0, CMath.V3DistancePseudo(eye, center));
        CPoolGeo.RecycleV3(center);
        return distSq;
    }
    UpdateGroupLOD(_group, _distSq) {
        const lodInfo = _group.mDensity.mLODInfo;
        let level = 0;
        for (let i = lodInfo.length - 1; i >= 0; i--) {
            let edge = lodInfo[i].mDistance;
            if (i <= _group.mCurLODLevel) {
                edge = Math.max(0, edge - lodInfo[i].mHysteresis);
            }
            if (_distSq >= edge * edge) {
                level = i;
                break;
            }
        }
        const prevMerge = _group.mPtMergeArr[_group.mPrevLODLevel];
        if (_group.mPrevLODLevel != _group.mCurLODLevel && prevMerge != null) {
            if (prevMerge.IsEnable() == true)
                prevMerge.SetEnable(false);
        }
        _group.mPrevLODLevel = _group.mCurLODLevel;
        _group.mCurLODLevel = level;
        const curMerge = _group.mPtMergeArr[level];
        if (level >= 0 && curMerge != null) {
            if (curMerge.IsEnable() == false)
                curMerge.SetEnable(true);
        }
    }
    Build() {
        this.RemoveComps(CPaint2DMerge);
        this.RemoveComps(CPaint3DMerge);
        this.RemoveComps(CCollider);
        this.mGroupArr = [];
        if (this.mBuf == null || this.mDensityArr == null)
            return;
        for (let density of this.mDensityArr) {
            const group = this.BuildGroup(density);
            if (group != null)
                this.mGroupArr.push(group);
        }
        if (this.mBoundXZ) {
            [this.mBound.mMin.y, this.mBound.mMin.z] = [this.mBound.mMin.z, this.mBound.mMin.y];
            [this.mBound.mMax.y, this.mBound.mMax.z] = [this.mBound.mMax.z, this.mBound.mMax.y];
        }
    }
    BuildGroup(_density) {
        const { matArr, codiArr } = this.PlaceInstances(_density);
        if (matArr.length == 0)
            return null;
        const group = new CLODGroup();
        group.mDensity = _density;
        for (let info of _density.mLODInfo) {
            group.mPtMergeArr.push(this.BuildLevelMerge(_density, info, matArr, codiArr));
        }
        return group.mPtMergeArr.some(p => p != null) ? group : null;
    }
    BuildLevelMerge(_density, _info, _matArr, _codiArr) {
        if (_info.mRes == null)
            return null;
        const { matArr, codiArr } = this.ReduceByAmount(_matArr, _codiArr, _info.mAmount);
        if (matArr.length == 0)
            return null;
        const isMesh = this.GetFrame().Res().Find(_info.mRes) instanceof CMesh;
        let ptMerge = isMesh
            ? this.PushComp(new CPaint3DMerge(new Array(matArr.length).fill(_info.mRes), matArr, true, 1))
            : this.PushComp(new CPaint2DMerge(_info.mRes, matArr, codiArr));
        if (isMesh == false) {
            const pt2 = ptMerge;
            pt2.SetYSort(_density.mYSort);
            if (this.mBoundXZ) {
                pt2.PushTag("billboard");
                pt2.PushCShaderAttr(new CShaderAttr("billboard", 1.0));
            }
        }
        ptMerge.SetEnable(false);
        if (_density.mWind > 0)
            ptMerge.Wind(_density.mWind);
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
        const worldW = this.mBuf.mCount.x * this.mBuf.mSize;
        const worldH = this.mBuf.mCount.y * this.mBuf.mSize;
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
        for (let cx = cxStart; cx < cxEnd; cx++) {
            for (let cy = cyStart; cy < cyEnd; cy++) {
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
                    const bx = Math.floor(wx / this.mBuf.mSize);
                    const by = Math.floor(wy / this.mBuf.mSize);
                    const idx = new CCIndex(bx, by, 0);
                    if (this.mBuf.IndexOut(idx))
                        continue;
                    if (this.mBuf.RGB(idx) === targetRGB) {
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
                if (this.mBoundXZ) {
                    pos.x += worldX;
                    pos.z += worldY;
                    if (this.mTerrain.Ref() != null)
                        pos.y += this.mTerrain.Ref().GetHeight(pos.x, pos.z);
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
                if (_density.mColliderLayer != null) {
                    const srcBound = _density.mColliderBound ?? defaultBound;
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
                    cl.SetLayer(_density.mColliderLayer);
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
export class CDensityMap extends CSubject {
    mBuf = new CMapBuf();
    mDensityArr = new Array();
    mDiv = 100;
    mBoundXZ;
    mTerrain = new CBlackBoardRef(CTerrainMap);
    mUpdate = true;
    mCamera = null;
    constructor(_boundXZ = false) {
        super();
        this.mBoundXZ = _boundXZ;
    }
    RecvGetCamera(_cam) {
        this.mCamera = _cam;
    }
    IsShould(_member, _type) {
        if (_member == "mUpdate" || _member == "mCamera")
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
    ToStr() {
        const detachedChildren = Array.from(this.FindChilds(CChunk));
        for (const child of detachedChildren) {
            this.DetachChild(child.Key());
        }
        const result = super.ToStr();
        for (const child of detachedChildren) {
            this.PushChild(child);
        }
        return result;
    }
    LoadJSON(_file) {
        return super.LoadJSON(_file).finally(() => {
            this.mUpdate = true;
        });
    }
    Update(_update) {
        super.Update(_update);
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
    }
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
        for (let chunk of this.FindChilds(CChunk))
            chunk.Destroy();
        const div = Math.max(1, this.mDiv);
        const cntX = Math.ceil(this.mBuf.mCount.x / div);
        const cntY = Math.ceil(this.mBuf.mCount.y / div);
        const chunkWorldSize = this.mBuf.mSize * div;
        let spare = null;
        for (let cy = 0; cy < cntY; cy++) {
            for (let cx = 0; cx < cntX; cx++) {
                let chunk;
                if (spare != null) {
                    chunk = spare;
                    spare = null;
                }
                else {
                    chunk = new CChunk();
                    this.PushChild(chunk);
                }
                if (chunk.mBound == null) {
                    chunk.mBound = new CBound();
                    chunk.mBound.SetType(CBound.eType.Box);
                }
                chunk.mBound.mMin.Import(new CVec3(cx * chunkWorldSize, cy * chunkWorldSize, 0));
                chunk.mBound.mMax.Import(new CVec3((cx + 1) * chunkWorldSize, (cy + 1) * chunkWorldSize, 0));
                chunk.mBuf = this.mBuf;
                chunk.mDensityArr = this.mDensityArr;
                chunk.mTerrain.mKey = this.mTerrain.mKey;
                chunk.mBoundXZ = this.mBoundXZ;
                chunk.mCamera = this.mCamera;
                chunk.Build();
                if (chunk.mComArr.length == 0)
                    spare = chunk;
            }
        }
        if (spare != null)
            spare.Destroy();
        return true;
    }
    SetPos(_pos, _reset = true) {
        super.SetPos(_pos, _reset);
        this.mUpdate = true;
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
