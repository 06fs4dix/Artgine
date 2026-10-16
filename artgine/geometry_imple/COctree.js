import { CWASM as __cwasmDecode__ } from "../basic/CWASM.js";
import { CArray } from "../basic/CArray.js";
import { CConsol } from "../basic/CConsol.js";
import { CPriorityQueue } from "../basic/CPriorityQueue.js";
import { CWASM } from "../basic/CWASM.js";
import { CMath } from "../geometry/CMath.js";
import { COctree, COctreeData, COctreeMgr } from "../geometry/COctree.js";
import { CPoolGeo } from "../geometry/CPoolGeo.js";
import { CUtilMath } from "../geometry/CUtilMath.js";
import { CVec3 } from "../geometry/CVec3.js";
function _octEnsure(mgr) {
    if (mgr["_h"] == null) {
        mgr["_h"] = CWASM.COctreeMgr_New();
        mgr["_dataToId"] = new Map();
        mgr["_idToWrap"] = new Map();
        mgr["_nextId"] = 1;
    }
}
function _octIdFor(mgr, _data) {
    _octEnsure(mgr);
    let id = mgr["_dataToId"].get(_data);
    if (id == null) {
        id = mgr["_nextId"]++;
        mgr["_dataToId"].set(_data, id);
        mgr["_idToWrap"].set(id, new COctreeData());
    }
    return id;
}
function _octWrap(mgr, id) {
    let w = mgr["_idToWrap"].get(id);
    if (w == null) {
        w = new COctreeData();
        mgr["_idToWrap"].set(id, w);
    }
    return w;
}
function _octDispatch(mgr, id, _results) {
    const w = mgr["_idToWrap"].get(id);
    if (w == null)
        return;
    _results(w);
}
const gDirectionList = [
    new CVec3(1, 0, 0),
    new CVec3(-1, 0, 0),
    new CVec3(0, 1, 0),
    new CVec3(0, -1, 0),
    new CVec3(1, 1, 0),
    new CVec3(1, -1, 0),
    new CVec3(-1, -1, 0),
    new CVec3(-1, 1, 0),
];
let openList = new CPriorityQueue((a, b) => a.total - b.total);
let closeMap = new Map();
let apool = new CArray();
const _ir_boxMin = new CVec3();
const _ir_boxMax = new CVec3();
const _ir_childMin = new CVec3();
const _ir_childMax = new CVec3();
function _octJSMode() {
    if (CWASM.JSMode())
        return true;
    try {
        if (typeof location == "undefined")
            return false;
        return new URLSearchParams(location.search).get("octjs") == "1";
    }
    catch {
        return false;
    }
}
export default function COctree_imple() {
    if (_octJSMode()) {
        COctree.prototype.ContainingPoint = function (point) {
            let oct = 0;
            if (point.mF32A[0] >= this.mCenter.mF32A[0])
                oct |= 1;
            if (point.mF32A[1] >= this.mCenter.mF32A[1])
                oct |= 2;
            if (point.mF32A[2] >= this.mCenter.mF32A[2])
                oct |= 4;
            return oct;
        };
        COctree.prototype.SelectChild = function (point) {
            let oct = 0;
            if (point.mF32A[0] >= this.mCenter.mF32A[0])
                oct |= 1;
            if (point.mF32A[1] >= this.mCenter.mF32A[1])
                oct |= 2;
            if (point.mF32A[2] >= this.mCenter.mF32A[2])
                oct |= 4;
            if (this.mChild[oct] == null) {
                let newOrigin = new CVec3(this.mCenter.mF32A[0] + this.mHalf.mF32A[0] * (oct & 1 ? 0.5 : -0.5), this.mCenter.mF32A[1] + this.mHalf.mF32A[1] * (oct & 2 ? 0.5 : -0.5), this.mCenter.mF32A[2] + this.mHalf.mF32A[2] * (oct & 4 ? 0.5 : -0.5));
                let newHalf = CMath.V3MulFloat(this.mHalf, 0.5);
                this.mChild[oct] = this.NewChild(newOrigin, newHalf);
            }
            return this.mChild[oct];
        };
        COctree.prototype.ResetBound = function (_max) {
            this.mBound.mMax.mF32A[0] = this.mCenter.mF32A[0] + this.mHalf.mF32A[0] + _max.mF32A[0];
            this.mBound.mMax.mF32A[1] = this.mCenter.mF32A[1] + this.mHalf.mF32A[1] + _max.mF32A[1];
            this.mBound.mMax.mF32A[2] = this.mCenter.mF32A[2] + this.mHalf.mF32A[2] + _max.mF32A[2];
            this.mBound.mMin.mF32A[0] = this.mCenter.mF32A[0] - this.mHalf.mF32A[0] - _max.mF32A[0];
            this.mBound.mMin.mF32A[1] = this.mCenter.mF32A[1] - this.mHalf.mF32A[1] - _max.mF32A[1];
            this.mBound.mMin.mF32A[2] = this.mCenter.mF32A[2] - this.mHalf.mF32A[2] - _max.mF32A[2];
        };
        COctree.prototype.SortXMinData = function () {
            if (this.mData != null && this.mData.length > 0) {
                this.mData.sort((a, b) => a.mMin.mF32A[0] - b.mMin.mF32A[0]);
            }
            if (this.mChild != null) {
                let off = 0;
                for (let i = 0; i < this.mChild.length; ++i) {
                    if (this.mChild[i] == null)
                        continue;
                    this.mChild[i].SortXMinData();
                    this.mChild[i].ResetBound(this.mMax);
                    let j = off;
                    for (; j < i; ++j) {
                        if (this.mChild[j] == null) {
                            this.mChild[j] = this.mChild[i];
                            this.mChild[i] = null;
                            off++;
                            break;
                        }
                    }
                    if (i == j)
                        off = i;
                }
            }
        };
        const MAX_LEAF_SIZE = 512;
        COctree.prototype.Insert = function (_ocData, _depth) {
            if (_ocData.mSize.mF32A[0] > this.mMax.mF32A[0]) {
                this.mMax.mF32A[0] = _ocData.mSize.mF32A[0];
            }
            if (_ocData.mSize.mF32A[1] > this.mMax.mF32A[1]) {
                this.mMax.mF32A[1] = _ocData.mSize.mF32A[1];
            }
            if (_ocData.mSize.mF32A[2] > this.mMax.mF32A[2]) {
                this.mMax.mF32A[2] = _ocData.mSize.mF32A[2];
            }
            if (this.IsLeafNode()) {
                if (this.mData === null) {
                    this.mData = [_ocData];
                }
                else if (this.mData[0].mCenter.Equals(_ocData.mCenter) || (_depth <= 0 && this.mData.length < MAX_LEAF_SIZE)) {
                    this.mData.push(_ocData);
                }
                else {
                    if (this.mData.length > MAX_LEAF_SIZE) {
                        CConsol.Log("test");
                    }
                    this.mChild = new Array(8).fill(null);
                    for (var j = 0; j < this.mData.length; ++j) {
                        this.SelectChild(this.mData[j].mCenter).Insert(this.mData[j], _depth - 1);
                    }
                    this.SelectChild(_ocData.mCenter).Insert(_ocData, _depth - 1);
                    this.mData = null;
                }
            }
            else {
                this.SelectChild(_ocData.mCenter).Insert(_ocData, _depth - 1);
            }
        };
        COctree.prototype.InsideRay = function (_ray, _RayLength, _boundary, results) {
            const vecList = _ray.GetVecList();
            const rayDir = vecList[0];
            const rayOrigin = vecList[2];
            const ox = rayOrigin.mF32A[0], oy = rayOrigin.mF32A[1], oz = rayOrigin.mF32A[2];
            const ex = ox + rayDir.mF32A[0] * _RayLength;
            const ey = oy + rayDir.mF32A[1] * _RayLength;
            const ez = oz + rayDir.mF32A[2] * _RayLength;
            const rsEps = 1e-5 * (Math.abs(ox) + Math.abs(oy) + Math.abs(oz) + _RayLength) + 1e-5;
            const rsMinX = (ox < ex ? ox : ex) - rsEps, rsMaxX = (ox > ex ? ox : ex) + rsEps;
            const rsMinY = (oy < ey ? oy : ey) - rsEps, rsMaxY = (oy > ey ? oy : ey) + rsEps;
            const rsMinZ = (oz < ez ? oz : ez) - rsEps, rsMaxZ = (oz > ez ? oz : ez) + rsEps;
            if (this.IsLeafNode()) {
                if (this.mData == null)
                    return;
                const boxMin = _ir_boxMin;
                const boxMax = _ir_boxMax;
                const arr = this.mData;
                const exMinX = rsMinX - _boundary, exMaxX = rsMaxX + _boundary;
                const exMinY = rsMinY - _boundary, exMaxY = rsMaxY + _boundary;
                const exMinZ = rsMinZ - _boundary, exMaxZ = rsMaxZ + _boundary;
                for (var i = 0; i < arr.length; ++i) {
                    const od = arr[i];
                    const mn = od.mMin.mF32A;
                    if (mn[0] > exMaxX)
                        break;
                    const mx = od.mMax.mF32A;
                    if (mx[0] < exMinX)
                        continue;
                    if (mn[1] > exMaxY || mx[1] < exMinY)
                        continue;
                    if (mn[2] > exMaxZ || mx[2] < exMinZ)
                        continue;
                    boxMax.mF32A[0] = mx[0] + _boundary;
                    boxMax.mF32A[1] = mx[1] + _boundary;
                    boxMax.mF32A[2] = mx[2] + _boundary;
                    boxMin.mF32A[0] = mn[0] - _boundary;
                    boxMin.mF32A[1] = mn[1] - _boundary;
                    boxMin.mF32A[2] = mn[2] - _boundary;
                    if (CUtilMath.RayBoxIS(boxMin, boxMax, _ray)) {
                        const oF = vecList[2].mF32A, pF = vecList[1].mF32A;
                        const dx = Math.fround(oF[0] - pF[0]);
                        const dy = Math.fround(oF[1] - pF[1]);
                        const dz = Math.fround(oF[2] - pF[2]);
                        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (len == 0 || len + _boundary <= _RayLength) {
                            results(od);
                        }
                    }
                }
            }
            else {
                const childMin = _ir_childMin;
                const childMax = _ir_childMax;
                for (let i = 0; i < this.mChild.length; ++i) {
                    if (this.mChild[i] == null)
                        continue;
                    const ch = this.mChild[i];
                    childMax.mF32A[0] = ch.mCenter.mF32A[0] + ch.mHalf.mF32A[0] + this.mMax.mF32A[0] + _boundary;
                    childMax.mF32A[1] = ch.mCenter.mF32A[1] + ch.mHalf.mF32A[1] + this.mMax.mF32A[1] + _boundary;
                    childMax.mF32A[2] = ch.mCenter.mF32A[2] + ch.mHalf.mF32A[2] + this.mMax.mF32A[2] + _boundary;
                    childMin.mF32A[0] = ch.mCenter.mF32A[0] - ch.mHalf.mF32A[0] - this.mMax.mF32A[0] - _boundary;
                    childMin.mF32A[1] = ch.mCenter.mF32A[1] - ch.mHalf.mF32A[1] - this.mMax.mF32A[1] - _boundary;
                    childMin.mF32A[2] = ch.mCenter.mF32A[2] - ch.mHalf.mF32A[2] - this.mMax.mF32A[2] - _boundary;
                    if (childMin.mF32A[0] > rsMaxX || childMax.mF32A[0] < rsMinX)
                        continue;
                    if (childMin.mF32A[1] > rsMaxY || childMax.mF32A[1] < rsMinY)
                        continue;
                    if (childMin.mF32A[2] > rsMaxZ || childMax.mF32A[2] < rsMinZ)
                        continue;
                    if (CUtilMath.RayBoxIS(childMin, childMax, _ray)) {
                        const oF = vecList[2].mF32A, pF = vecList[1].mF32A;
                        const dx = Math.fround(oF[0] - pF[0]);
                        const dy = Math.fround(oF[1] - pF[1]);
                        const dz = Math.fround(oF[2] - pF[2]);
                        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (len == 0 || len + _boundary <= _RayLength) {
                            ch.InsideRay(_ray, _RayLength, _boundary, results);
                        }
                    }
                }
            }
        };
        COctree.prototype.InsideBox = function (bmin, bmax, results, _ocd = null) {
            if (this.IsLeafNode()) {
                if (this.mData == null)
                    return;
                for (var i = 0; i < this.mData.length; ++i) {
                    if (bmax.mF32A[0] < this.mData[i].mMin.mF32A[0])
                        break;
                    if (this.mData[i].mMin.mF32A[1] > bmax.mF32A[1] || this.mData[i].mMin.mF32A[2] > bmax.mF32A[2])
                        continue;
                    if (this.mData[i].mMax.mF32A[0] < bmin.mF32A[0] || this.mData[i].mMax.mF32A[1] < bmin.mF32A[1] ||
                        this.mData[i].mMax.mF32A[2] < bmin.mF32A[2])
                        continue;
                    if (_ocd == this.mData[i]) {
                        this.mData.splice(i, 1);
                        i--;
                        continue;
                    }
                    results(this.mData[i]);
                    if (_ocd != null)
                        this.mData[i].mCol.Push(_ocd);
                }
            }
            else {
                for (let i = 0; i < this.mChild.length; ++i) {
                    const child = this.mChild[i];
                    if (child == null)
                        continue;
                    if (child.mBound.mMax.mF32A[0] < bmin.mF32A[0] ||
                        child.mBound.mMin.mF32A[0] > bmax.mF32A[0] ||
                        child.mBound.mMax.mF32A[1] < bmin.mF32A[1] ||
                        child.mBound.mMin.mF32A[1] > bmax.mF32A[1] ||
                        child.mBound.mMax.mF32A[2] < bmin.mF32A[2] ||
                        child.mBound.mMin.mF32A[2] > bmax.mF32A[2]) {
                        continue;
                    }
                    child.InsideBox(bmin, bmax, results, _ocd);
                }
            }
        };
        COctreeMgr.prototype.Build = function () {
            this.mPool.Clear();
            let size = this.mOCDMap.size;
            let n = 64;
            let depth = 1;
            while (n < size) {
                n *= 32;
                depth++;
            }
            let DummyCenter = null;
            let DummyHalf = null;
            if (this.mDynamic != null) {
                DummyCenter = this.mDynamic.mCenter;
                DummyHalf = this.mDynamic.mHalf;
            }
            else {
                DummyCenter = new CVec3();
                DummyHalf = new CVec3();
            }
            CMath.V3MulFloat(this.mDBound.GetSize(), 0.5, DummyHalf);
            this.mDBound.GetCenter(DummyCenter);
            this.mDynamic = new COctree(DummyCenter, DummyHalf, this.mPool);
            for (let ocd of this.mOCDMap.values()) {
                if (ocd.mUpdate == this.mUpdate)
                    this.mDynamic.Insert(ocd, depth);
            }
            this.mDynamic.SortXMinData();
            this.mDBound.mMin.x = -100;
            this.mDBound.mMin.y = -100;
            this.mDBound.mMin.z = -100;
            this.mDBound.mMax.x = 100;
            this.mDBound.mMax.y = 100;
            this.mDBound.mMax.z = 100;
            if (this.mStaticBuild) {
                size = this.mOCSMap.size;
                n = 64;
                depth = 1;
                while (n < size) {
                    n *= 32;
                    depth++;
                }
                this.mStaticBuild = false;
                if (this.mStatic != null) {
                    DummyCenter = this.mStatic.mCenter;
                    DummyHalf = this.mStatic.mHalf;
                }
                else {
                    DummyCenter = new CVec3();
                    DummyHalf = new CVec3();
                }
                CMath.V3MulFloat(this.mSBound.GetSize(), 0.5, DummyHalf);
                this.mSBound.GetCenter(DummyCenter);
                this.mStatic = new COctree(DummyCenter, DummyHalf, null);
                for (let ocs of this.mOCSMap.values()) {
                    if (ocs.mUpdate == this.mUpdate)
                        this.mStatic.Insert(ocs, depth);
                }
                this.mStatic.SortXMinData();
                this.mSBound.mMin.x = -100;
                this.mSBound.mMin.y = -100;
                this.mSBound.mMin.z = -100;
                this.mSBound.mMax.x = 100;
                this.mSBound.mMax.y = 100;
                this.mSBound.mMax.z = 100;
            }
            this.mUpdate++;
            if (this.mStaticUpdate) {
                this.mStaticUpdate = false;
                this.mStaticBuild = true;
            }
        };
        COctreeMgr.prototype.Insert = function (_center, _size, _data, _min = null, _max = null, _static = false) {
            let ocmap;
            let ocbound;
            if (_static) {
                ocmap = this.mOCSMap;
                ocbound = this.mSBound;
            }
            else {
                ocmap = this.mOCDMap;
                ocbound = this.mDBound;
            }
            let odata = ocmap.get(_data);
            if (odata == null) {
                odata = new COctreeData();
                ocmap.set(_data, odata);
            }
            let jitter = Math.random();
            odata.mCenter.mF32A[0] = _center.mF32A[0];
            odata.mCenter.mF32A[1] = _center.mF32A[1];
            odata.mCenter.mF32A[2] = _center.mF32A[2];
            odata.mSize.mF32A[0] = _size.mF32A[0];
            odata.mSize.mF32A[1] = _size.mF32A[1];
            odata.mSize.mF32A[2] = _size.mF32A[2];
            odata.mUpdate = this.mUpdate;
            odata.mCol.Clear();
            odata.mData = _data;
            odata.mStatic = _static;
            if (_min == null) {
                let size = CPoolGeo.ProductV3();
                CMath.V3MulFloat(odata.mSize, 0.5, size);
                CMath.V3AddV3(odata.mCenter, size, odata.mMax);
                CMath.V3SubV3(odata.mCenter, size, odata.mMin);
                CPoolGeo.RecycleV3(size);
            }
            else {
                odata.mMin = _min;
                odata.mMax = _max;
            }
            ocbound.InitBound(odata.mMax);
            ocbound.InitBound(odata.mMin);
        };
        COctreeMgr.prototype.InsideRay = function (_ray, _RayLength, _boundary, results) {
            this.mDynamic.InsideRay(_ray, _RayLength, _boundary, results);
            if (this.mStatic != null)
                this.mStatic.InsideRay(_ray, _RayLength, _boundary, results);
        };
        COctreeMgr.prototype.InsidePlane = function (_bplane, _results) {
            this.mDynamic.InsidePlane(_bplane, _results);
        };
        COctreeMgr.prototype.InsideBoxData = function (_bmin, _bmax, _results, _data) {
            let odata = this.mOCDMap.get(_data);
            if (odata == null)
                return;
            for (let i = 0; i < odata.mCol.Size(); ++i) {
                _results(odata.mCol.Find(i));
            }
            this.mDynamic.InsideBox(_bmin, _bmax, _results, odata);
            if (this.mStatic != null)
                this.mStatic.InsideBox(_bmin, _bmax, _results);
        };
        COctreeMgr.prototype.InsideBox = function (_bmin, _bmax, _results) {
            this.mDynamic.InsideBox(_bmin, _bmax, _results);
            if (this.mStatic != null)
                this.mStatic.InsideBox(_bmin, _bmax, _results);
        };
        COctreeMgr.prototype.Remove = function (_data) {
            this.mOCDMap.delete(_data);
            this.mOCSMap.delete(_data);
        };
    }
    else {
        COctreeMgr.prototype.Build = function () {
            _octEnsure(this);
            CWASM.COctreeMgr_Build(this["_h"], this, this.mStaticUpdate);
            if (this.mStaticBuild)
                this.mStaticBuild = false;
            this.mUpdate++;
            if (this.mStaticUpdate) {
                this.mStaticUpdate = false;
                this.mStaticBuild = true;
            }
        };
        COctreeMgr.prototype.Insert = function (_center, _size, _data, _min = null, _max = null, _static = false) {
            _octEnsure(this);
            const id = _octIdFor(this, _data);
            const hasMinMax = (_min != null);
            CWASM.COctreeMgr_Insert(this, id, _center.mF32A[0], _center.mF32A[1], _center.mF32A[2], _size.mF32A[0], _size.mF32A[1], _size.mF32A[2], hasMinMax, hasMinMax ? _min.mF32A[0] : 0, hasMinMax ? _min.mF32A[1] : 0, hasMinMax ? _min.mF32A[2] : 0, hasMinMax ? _max.mF32A[0] : 0, hasMinMax ? _max.mF32A[1] : 0, hasMinMax ? _max.mF32A[2] : 0, _static);
            const wrap = this["_idToWrap"].get(id);
            wrap.mCenter.mF32A[0] = _center.mF32A[0];
            wrap.mCenter.mF32A[1] = _center.mF32A[1];
            wrap.mCenter.mF32A[2] = _center.mF32A[2];
            wrap.mSize.mF32A[0] = _size.mF32A[0];
            wrap.mSize.mF32A[1] = _size.mF32A[1];
            wrap.mSize.mF32A[2] = _size.mF32A[2];
            wrap.mData = _data;
            wrap.mStatic = _static;
            if (hasMinMax) {
                wrap.mMin.mF32A[0] = _min.mF32A[0];
                wrap.mMin.mF32A[1] = _min.mF32A[1];
                wrap.mMin.mF32A[2] = _min.mF32A[2];
                wrap.mMax.mF32A[0] = _max.mF32A[0];
                wrap.mMax.mF32A[1] = _max.mF32A[1];
                wrap.mMax.mF32A[2] = _max.mF32A[2];
            }
            else {
                wrap.mMin.mF32A[0] = _center.mF32A[0] - _size.mF32A[0] * 0.5;
                wrap.mMin.mF32A[1] = _center.mF32A[1] - _size.mF32A[1] * 0.5;
                wrap.mMin.mF32A[2] = _center.mF32A[2] - _size.mF32A[2] * 0.5;
                wrap.mMax.mF32A[0] = _center.mF32A[0] + _size.mF32A[0] * 0.5;
                wrap.mMax.mF32A[1] = _center.mF32A[1] + _size.mF32A[1] * 0.5;
                wrap.mMax.mF32A[2] = _center.mF32A[2] + _size.mF32A[2] * 0.5;
            }
        };
        COctreeMgr.prototype.InsideRay = function (_ray, _RayLength, _boundary, results) {
            _octEnsure(this);
            const dir = _ray.GetDirect(), origin = _ray.GetOriginal();
            const ids = CWASM.COctreeMgr_InsideRay(this["_h"], origin.mF32A[0], origin.mF32A[1], origin.mF32A[2], dir.mF32A[0], dir.mF32A[1], dir.mF32A[2], _RayLength, _boundary);
            for (let i = 0; i < ids.length; ++i)
                _octDispatch(this, ids[i], results);
        };
        COctreeMgr.prototype.InsidePlane = function (_bplane, _results) {
            _octEnsure(this);
            const ids = CWASM.COctreeMgr_InsidePlane(this["_h"], _bplane);
            for (let i = 0; i < ids.length; ++i)
                _octDispatch(this, ids[i], _results);
        };
        COctreeMgr.prototype.InsideBoxData = function (_bmin, _bmax, _results, _data) {
            _octEnsure(this);
            const excludeId = this["_dataToId"].get(_data);
            if (excludeId == null)
                return;
            const ids = CWASM.COctreeMgr_InsideBox(this["_h"], _bmin.mF32A[0], _bmin.mF32A[1], _bmin.mF32A[2], _bmax.mF32A[0], _bmax.mF32A[1], _bmax.mF32A[2], excludeId);
            for (let i = 0; i < ids.length; ++i)
                _octDispatch(this, ids[i], _results);
        };
        COctreeMgr.prototype.InsideBox = function (_bmin, _bmax, _results) {
            _octEnsure(this);
            const ids = CWASM.COctreeMgr_InsideBox(this["_h"], _bmin.mF32A[0], _bmin.mF32A[1], _bmin.mF32A[2], _bmax.mF32A[0], _bmax.mF32A[1], _bmax.mF32A[2], -1);
            for (let i = 0; i < ids.length; ++i)
                _octDispatch(this, ids[i], _results);
        };
        COctreeMgr.prototype.Remove = function (_data) {
            if (this["_dataToId"] == null)
                return;
            const id = this["_dataToId"].get(_data);
            if (id == null)
                return;
            CWASM.COctreeMgr_RemoveQueue(this, id);
            this["_dataToId"].delete(_data);
            this["_idToWrap"].delete(id);
        };
    }
    COctreeMgr.prototype["CorrectPosition"]=eval(__cwasmDecode__.Decode("artgine/geometry_imple/COctree.js","JSJT6wJeJ06rJGLXLPL6L8quqPLqqpLuLU6oqG6Kq56OJNqdJnJ2LiLqLUL7qK6RqFqe6rLJ6ALI6l6mLVJzJdLVqfqDq8qLq9JFqILwJoJbJhJQLvqH6nqOLNoqJ36i67oo6uJj6B65JnL9656nq3JELTLl66Jso6qd6y6X6J6KJx6l6r6v6pLALk6AqD6wq0JSLu6XJqJxLV6J6E6jJk6wJ0qmJKLoLr6mqzJKLPLZJB6LLQLEJn67L9JkqPqiqO6PJ1LrqyqhJjLiLfql6tqZLIJg6jJJLfLNqV6xLIJkq0JBLboeqyq96sLoqPJdJ3JNJeL46J6c63JUqxqCqH6Dqb6C6fLTLt6lLGJG6TJcJ7q1JT6SqnLvqXLTJw6B6NJBLzLw6g6I6pL26lJ7qeqpoq6KqrLpqpLCoLqN6OLaLRLdJ2LGLxqNLCqhqVLrqBL96E6hJLqK6vJh6aq3JXLxJ5qHLuqTqSqzqpqnqW6ZLiLIJS6sJ16P69JPJcJLLPLZqUJsJQJiqDLz60Jy6ZJVL6L8qD6FLnqrqNqQ6gqPJs6n6IqnqvoUJXqtLaLf6E6yLMqOqJJFJr6eJvLrJ3q46d606dLLoJq0qDqz646n6Bqs6Y6jqQJNJKJuLAqvqZ6jJDLqJ56Hqj6VJF6WJMqNLpq7qSJfLU65J0LM6l6K6xJLq7LALRqOLwJ5JCL9LeJbJYLZ62Ja6qqI6a6YqYJ7Llq1LqJkLGJ6qDL4LU6EJM6ULx67JFLNqnLp6z6K6GqwqsqKJpqnoe67q7JxLw61qX6V63LrJILVqV6OLQqk6Xq86nqEq46t6VLuJqJU6nqHLRJxqcLsJlq6J7LMqW6Iq8JP6E68JhJNJtqC6RLdqFqeqA6R6eL1JA62qkLI6qJMLjqE6z6bqD6QLeqw63qaq36bLVLeqEqfJy6Sqb6OLvLoJwqZ69JXqcJTLkJLqJ6oJoLeqpLlLbLO6sLvqnLS6Booqw6lLUL9Jk62qe6WJCLK6r6FJiLKLHq6qNLgJB65L26lLKL4LPJroLqU6Rq0JSqWLSJrJqLg6X6Jqdqxq1qTL46UJXLe6NJfLd6jJmL7JXqlqAJ8qe6nJ0LCJkLV6ro5LbqFqSqxJBJJLKqDLo6TqKq3JPJp6d6h62L7LN6rJXo5qKqv6tJYqZLiqw6ALMJf6E63JCLYqdLpL8qhJgLQLSJYJILT6JJ96goU6GLQqRJk6rJIJQJCJeJnLwJr6mLl6gqSLjJwJfoqLTLUqu6sLX6PqOJkqOJ1JHLQqLqgq9LlqeJDJaqzLQJPqZqLoL64qjqbJL6zLtqYq4q96YJs6eqDLmLE6pJmJUJ0LFJBJaJ96hLX61qgLWJbLmLAq5L2L3qRLaJrJKJh6Gqtq3LwJxL5JMqDJl6xLkqnLZLOqxqG6S6WLKJG6C6Tqf6TLC6sL5LgLP6gLeLm6RqzLM6KqzLrJBJtLuqEJSquJ9qZLiql6M6vJ8JL6M6HL2Lt69JZJKqcJZLIJALy6K6ELKLq6oLdLp6nJ2Lq6NqOL1qpLDJUJ9q9JbL1626J6Lq5LGqeqOLx62JYLBJ5Jt6hJcqe6Qq0L6JX6iLN6lLdLtL8LhJK6N67qzLSqLqPLq6BqW6E6zJSJj6U66qFqPq9q2Lj65JTJhoULKJPJUJc6gLIoq6J63J1LTJrJhoeqWLmJRLdLqJOqoL36z6R6mJoLGJ9JXqdL7JY6Zq6JiqwLj6rqGqZqzJ0qQqEoJq0q56r6X6tqL6Iqz6m6G6VL7JvJpL7qlJOqwLnLXqP6rLWLG6JJo6J6qqFJqLq6g6Z6zqlqRJR6fLd6yqoJCLC6N6Sq66B6NJr6CJPJL6564qBLQq4Jk6SJuLKoeq6q9Ld6mJEJqqdL3qB6aqJL4JJqPquqtqFL2LCLa6hqkJXLRJa6T6eJZLwJSLOLoLwJqqiJS6tLSJ0JCJL6WJCL9JEJWLoJQLvqv6lqmq1oeLaJ0qAJiq36cqm6GooJV60qj6gJA6f6SJTLxLRLHoLqwqsJTqr6Y6NqCqz6IJLLp6hLCLSqF6o6oqa6NL669616Y6GLhLfqDoLLbJLqBqELq6i626gL4J8JgLlJg6hLAJxJaJ2Li6S6nLlJe6CJM6w6TL0Jk6Eqtq264Ja6jLZJoLnLJLfJyLILXLOJDLh666Dq9qUq7qpqq6gL9qtLsquJtLoJMqTJ3JuJGLILVJZqDLSJmJcJR6YLf6Tqe6UqpJg6Bo66BLLJEqCJR6dLcqDqmLML9qGqeLCqhJu6AqXLkqhLA6t6Nq5qDLKL6LVL96CJ56QqSqD676l6eJiLGJf6QJ06y6bJa6Z6fJEqAqkJrooquJDqaJJ65JYLrLg6P6rLZL9JnJcL5qiooL0q9q46Jq566J5q66YqXLVLyqT6l6L6ZqQJCJd6tqhqRq9qJLOLXoe6mLNJW6vJ5qYL7qXqbJD6ho5oqqOqcLc6wLp6gqNLAJzJ96Dqn6PJNLM676IqxL9qvoq6BqsJRqYoo63J66XJP6S6sJF67LRLpqEq0JKq1LRqIJdLb6Fq36pql6y6GLOqG6tqc6e6sJgJA6Dq1LiLzqjJb6a63LYJmJH646RJR6Z6RJm6xJiq3qzqE6cJ7Jx6AqnLAqtLq6T6BqRJVLzJOLuJE6dL9LBq56hqKLyqM6B6rJjJqJjJN626KLNJrJDLMJOqmL0qTJnqNJKq8Jv6i66LBLtqgJMJ4qO68q9qTq1JsqwJc6G6lLELeJqqWJjJdoqLa6ZqvLV6AJt626yLnqT6cJ2JWqTJx6t6j6CqAqfJaJeqIqyLN6MqZ6DLPLhqp6h6Z6ELPJTqyJ6q9LpqPqPJGJEqfqOq46do6LtJsJsoqJG6KJlLqLLJbL1q9JPJYJk6aLuLHqEJOqzqBLQ6n6Jqj6l64JN6lqhLe6xoUJMJpLIJmJuq1JoqhJALmJPqs6X6qL3JrLjLl6r6l6RJJqSJTqGL9JF6ILj6UJiqw6IqY62qw6y6YqhJQL56s64J1JLLiqILRLZJvLIJPLF6wql6xJc6jo6qlqhLYJVL3LCJA6ELrqm6bJA6tL1LwLNLbLg6I6LLMqrqWLTLz6OJVJMqPLDLYLPqP64Jr636hqF62JRJvJMLfJ5LFqA6aLFJBJFJUJj61L06L6CJV6F6moUJWqiLN6l6OJNqG6IJWqnqKqeLvqOLxqiLRLUqKJb6e6mJdqeJS6EJ0LAJ0qt6VqBL26v6G6YJVqS6uqoqVJkLeqGLPLi6MJLJJqfJAqY6f65LTLqJFoeqLLHqX6H6Tq0qV6xLqLFLmLfLcLV6wqYJb6EqU6cL1Jc6I6WJKJCqPqH6lquLg6aLO6ZJCJq6iq5JyLXqlLHL0qnLVqPLJLR6UJpJ3JlJwo6qe6fL5JqJWLmJx6OJ366qbqfLyqRJpL66sLYLcL5JqLQJUq0616rqCL5JY65qeL4qCJbqFq16oq5qR6cqE6O6ELDq9LKLI6QLz6j61L16lqU6wLIJq6m6J63J1LuqaJbJzJuqTqoLC60qQJ6JwLcq0JOJJJSJtJOqT6HqBL46mJy6TLdLQLEJxJY6E6UqVqJLOJf65JALiL2Ln66qpq8LyqM6WqtqDLM68q1LEqaJ767JGJpqmqP6DLA6qquqTLdJMJEqQJ96t6moLLwJB6tJ3JCJsqbJ5LPJiJBoJqG6eJnqIqO6rLJqkLZLEqZJkJkLDqVJRqsJ7J9JN68JULTL6LcoqqZJV6NLFqB6PJgqxqmJzq7LYLQqJLNJw68JVLz6VLDJMqdqZLaLoLP626Uq5LqLH6cqAJLLDqI6aLR606WqULj6yJMJkL0qIJ0JAqR6A6vqQLZLK61J6qjLjLKL1JzoeL4qVLb6H6xJbq6q1Li6BLwJo6VJTJXLxoqLRJY6ZJhqB6x6Kq4J1LKooJg6Zq0LjJGJhJMJOqPLtqdqTqm6jJwJMoL6IqWLYJxoqJHqjq4qpLx6YLxLj6h6xL36TJqqDL5qz6cq56Wqlqr6nJuqcJoLgJFq2LfLaJLLcqJqqqX6FJ3LKJXL1LJ6pJvJXqzqNJl6rJKq7L4qZL260LIJeoULjLK6lqsJOLPLFJaoUqtLhqlLmqKqGL4JDJX6G6v65L6JHLBJE6CJUo5LJ6b6iLV6UqjJTL7LnLB6Hqk6PLy6FJ1JXqlqrJeJvL762LYJkJKLWJWJXqzoUJ5qnJILxqRo6JELxLELTJT67J36g6TLyJaL7LV69LdqOqEJP6FLK68JvJpLtqp6VqSJdLcJuL561J1L1Jr6DJYoLLSq7qB6rLy6oqj6jJaqlLWJ76zqo6RqtJI6n6NLrLE6eLX6wL0J06BJfqRqxLIJC6zJk6TLZ6sqAJsJmLvJzJ7L3LV6uJGJRLTLk6O6G6YoLJHqhqgJALi6j6A6OJV64L5JV6TJ5JwLMqw6K6lLcqGLPo6J9LkJy6oqjLVLF6YLVJkqnqaLX6HJy6GqDJ5JzLuq8JTLr6Y6nL4Jm6kqlJCL2JFLTqsLGLxLPJNJQLU6iLrLLqpLdJdJ1JZJ4LmLDJF6DJiLV6Gqaq86qLgqh6t69qDqgJDJYqq6K6WqqqpqMLQLgqMooq1JqLjLM",0));
    COctreeMgr.prototype["Find"]=eval(__cwasmDecode__.Decode("artgine/geometry_imple/COctree.js","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",2297));
}
class CASterNode {
    cur = null;
    pre = null;
    cost = 0;
    total = 0;
    Offset(size = 100) {
        return GridKey(this.cur, size);
    }
}
function GridKey(_pos, _size) {
    const gridX = Math.floor(_pos.x / _size) + 65536;
    const gridY = Math.floor(_pos.y / _size) + 65536;
    const gridZ = Math.floor(_pos.z / _size) + 65536;
    return (gridX * 131072 + gridY) * 131072 + gridZ;
}
