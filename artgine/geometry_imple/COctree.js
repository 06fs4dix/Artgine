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
    COctreeMgr.prototype["CorrectPosition"]=eval(__cwasmDecode__.Decode("artgine/geometry_imple/COctree.js","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",0));
    COctreeMgr.prototype["Find"]=eval(__cwasmDecode__.Decode("artgine/geometry_imple/COctree.js","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",2157));
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
