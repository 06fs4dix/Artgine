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
                this.mStaticDepth = depth;
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
        const IncChild = function (_node, _c, _make) {
            let oct = 0;
            if (_c.mF32A[0] >= _node.mCenter.mF32A[0])
                oct |= 1;
            if (_c.mF32A[1] >= _node.mCenter.mF32A[1])
                oct |= 2;
            if (_c.mF32A[2] >= _node.mCenter.mF32A[2])
                oct |= 4;
            const cx = _node.mCenter.mF32A[0] + _node.mHalf.mF32A[0] * (oct & 1 ? 0.5 : -0.5);
            const cy = _node.mCenter.mF32A[1] + _node.mHalf.mF32A[1] * (oct & 2 ? 0.5 : -0.5);
            const cz = _node.mCenter.mF32A[2] + _node.mHalf.mF32A[2] * (oct & 4 ? 0.5 : -0.5);
            for (let i = 0; i < _node.mChild.length; ++i) {
                const ch = _node.mChild[i];
                if (ch == null)
                    continue;
                if (Math.abs(ch.mCenter.mF32A[0] - cx) < 0.001 && Math.abs(ch.mCenter.mF32A[1] - cy) < 0.001 && Math.abs(ch.mCenter.mF32A[2] - cz) < 0.001)
                    return ch;
            }
            if (_make == false)
                return null;
            const nc = _node.NewChild(new CVec3(cx, cy, cz), CMath.V3MulFloat(_node.mHalf, 0.5));
            for (let i = 0; i < _node.mChild.length; ++i) {
                if (_node.mChild[i] == null) {
                    _node.mChild[i] = nc;
                    break;
                }
            }
            return nc;
        };
        const IncRemove = function (_root, _d) {
            let node = _root;
            while (node.IsLeafNode() == false) {
                node = IncChild(node, _d.mCenter, false);
                if (node == null)
                    return false;
            }
            if (node.mData == null)
                return false;
            const i = node.mData.indexOf(_d);
            if (i < 0)
                return false;
            node.mData.splice(i, 1);
            if (node.mData.length == 0)
                node.mData = null;
            return true;
        };
        COctreeMgr.prototype.StaticInsert = function (_center, _size, _data, _min = null, _max = null) {
            const old = this.mOCSMap.get(_data);
            if (old != null && this.mStatic != null && this.mStaticBuild == false)
                IncRemove(this.mStatic, old);
            this.Insert(_center, _size, _data, _min, _max, true);
            const root = this.mStatic;
            if (this.mStaticUpdate || this.mStaticBuild)
                return;
            const d = this.mOCSMap.get(_data);
            if (root == null ||
                d.mMin.mF32A[0] < root.mCenter.mF32A[0] - root.mHalf.mF32A[0] || d.mMax.mF32A[0] > root.mCenter.mF32A[0] + root.mHalf.mF32A[0] ||
                d.mMin.mF32A[1] < root.mCenter.mF32A[1] - root.mHalf.mF32A[1] || d.mMax.mF32A[1] > root.mCenter.mF32A[1] + root.mHalf.mF32A[1] ||
                d.mMin.mF32A[2] < root.mCenter.mF32A[2] - root.mHalf.mF32A[2] || d.mMax.mF32A[2] > root.mCenter.mF32A[2] + root.mHalf.mF32A[2]) {
                this.mStaticUpdate = true;
                return;
            }
            const path = new Array();
            let node = root;
            let depth = this.mStaticDepth;
            while (node.IsLeafNode() == false) {
                for (let k = 0; k < 3; ++k)
                    if (d.mSize.mF32A[k] > node.mMax.mF32A[k])
                        node.mMax.mF32A[k] = d.mSize.mF32A[k];
                path.push(node);
                node = IncChild(node, d.mCenter, true);
                depth--;
            }
            node.Insert(d, depth);
            node.SortXMinData();
            for (let i = path.length - 1; i >= 0; --i) {
                const a = path[i];
                for (let j = 0; j < a.mChild.length; ++j)
                    if (a.mChild[j] != null)
                        a.mChild[j].ResetBound(a.mMax);
            }
        };
        COctreeMgr.prototype.StaticRemove = function (_data) {
            const d = this.mOCSMap.get(_data);
            if (d == null)
                return;
            if (this.mStatic != null && this.mStaticBuild == false)
                IncRemove(this.mStatic, d);
            this.mOCSMap.delete(_data);
        };
    }
    else {
        COctreeMgr.prototype.Build = function () {
            _octEnsure(this);
            const incFail = CWASM.COctreeMgr_Build(this["_h"], this, this.mStaticUpdate);
            if (this.mStaticBuild)
                this["_hasStatic"] = true;
            if (this.mStaticBuild)
                this.mStaticBuild = false;
            this.mUpdate++;
            if (this.mStaticUpdate) {
                this.mStaticUpdate = false;
                this.mStaticBuild = true;
            }
            if (incFail)
                this.mStaticUpdate = true;
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
        const IncReady = function (_mgr) {
            return _mgr["_hasStatic"] == true && _mgr.mStaticUpdate == false && _mgr.mStaticBuild == false;
        };
        COctreeMgr.prototype.StaticInsert = function (_center, _size, _data, _min = null, _max = null) {
            const inc = IncReady(this);
            this.Insert(_center, _size, _data, _min, _max, true);
            if (inc)
                CWASM.COctreeMgr_SetLastMode(this, 3);
            else if (this.mStaticBuild == false)
                this.mStaticUpdate = true;
        };
        COctreeMgr.prototype.StaticRemove = function (_data) {
            if (this["_dataToId"] == null)
                return;
            const id = this["_dataToId"].get(_data);
            if (id == null)
                return;
            CWASM.COctreeMgr_RemoveQueue(this, id, IncReady(this) ? 4 : 2);
            this["_dataToId"].delete(_data);
            this["_idToWrap"].delete(id);
        };
    }
    COctreeMgr.prototype["CorrectPosition"]=eval(__cwasmDecode__.Decode("artgine/geometry_imple/COctree.js","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",0));
    COctreeMgr.prototype["Find"]=eval(__cwasmDecode__.Decode("artgine/geometry_imple/COctree.js","6OJBLHLbLZJvqaJiqPqY6v6NLvJg6yqGqmLpLWqtLlqooeooJiqBJMJ4qGqnJ76oLu6oLF6C6S6f6n6kqHqNJe6eJKJ6Jw6PLtJPLQJPJ3Lr6166qJJ1JyJUL8qWJ3Lb6BqBLBq3LrquJjquJ96xJaJIq2LmJf6RooJ8JrLxLoo66HLY6mLu6Vq8JYJELv6Aq76jJAJOJBLiq5J1qRLL666bJvqQ6DqLJ3LPJW6r696TJPqaq6LM6QoqJVL9Lr6JLYLBJoJDJKLpqQqXJUqdLaJ8686JLUqJJqJ7Lr6dLXqj6UqJLZJPJs60J26A65L76JJKqiLaJGLY6R6E6WLLJPJDJg6KLZJ3LEqeLk6rLG6Eq4qtL9qBqkqdJg6CL5Lv636c6l6rJcqxo5JsLEqCLdqPLiLvqzJF6xqxLIJA6NJk6TL4qOqAJsJgLdJzJ7LFLw6uJGJRJGJPqR6pqG6WLeqS6kJaJy6aqg65Lb6zJcLH6VJbJwLMqw6t6lLcqjLTo6J9L4Js6oqjLdJ66YLVJkqnqaLX6HJy6GqDJGJzLuqtJnLr6Y6TLZJm6kqaJAL2JFLT6OLGLxLbJbJQLU60L2JQqRLvLGqJLDLcJJLyLaqRJeLU6Pqpquq2Jb6b6d6A6QqbJvLCLc6E6iJ86F6QLVLTq4qk6wLaL5Jyq3LRJfqQo5q46XJ56A6PqXJm6vLNoUqKJcLaJAJh6aqiJ16k64oULlJKo6qbqnJx6gJPqRLjL0qBJoJgqQJ76jqRqD6c6V63LzqBqI6NLALh6PL960LSq2JwLjq2LLJ8oeLQJoq9LXL7q765LXqq64qJJCJcqJJVq4LpJo6OLL6uJIJV6eqWLJJ1LqLcLRJZJp6SLjL5LTqT6hqD6roeLbo6JeLnLp6mqvLTqt6QLw6FLcLXJEqmqy6pLOLH6yLjJZqVqzJFLqqGJm6boL6Uq2qFqbLvL3Lf6jJpqT6b6HqFJqLX606O6Iq1LDq6LQooLAJL6OJSLlqz62qyJwLmJOLRqI6c63qSqeqFJmLPqgLdqp6QLF6d6pqUJRL2JVqOqS6HJTL4qYqwJzJG6oqFJ5qOLZqtooJDJtLFJU6a6LLkqmLhJLJrqAJULFJCq7oULwLQquJUq66d6kLvLoqjLyqvqV6RL6JlJmoqJX6CJT6J6AJ9LVJG6AL868JdL5qWJL6VJXLBJ7JeqGLX6ELfJRJZ6UJeLQqlqYoeqgLhoJoqJE6H66qxqbJdJG6pqo6EL3L1qkLeoLqvLmq4L1Jy6SqNJhLULfJBq3626JJFJ86uLJL4qeLWLx6GJRqzqj62JI6EL46D65qKJ6LvJDqRL7Laql6N686qLMoU6OLPqv6NL5JuJFqho5JPqGJVqBLwJgLqoULo676I6Oq16oLnLPqHLyLO6U6f6gLb6hLs6r6rq56oLFL762JDqhqCJWqJJ0qh6A6Z6RLhoLJAqeqeq5Lv6vJLJiq5qi6D6FJFLNLA6GJ9LzqHLOJ06YJZLJ6q6nLEL16E65L2JEq9qPJn65q8qm6qJPLlJoLnq2LOJu6kLH6lLBJUJlL4qy68LEJgqnq3LoLeqBJhLOLKJ26fqJ666MLtqfJpLhJdqILB6dJRLDJa6pL1Jwqd6BqIJDLVLH6Dqz6ALsq76Hqrqnq3LIq06B6yJJqfqPoLL7LjqK62qEoUJbLE6Q68LILLq0J8JoL8qKJFq46q6ILiqgJC6S6WJgq3qaqtJmq26zLxLXLm6hLv6mLfLOqfJyL9Jy6mqlJr6rJq69LGqvLyJv6vqfJLLY6jJpqw6xqIJ2LXq7qHqG6CqJLCqpqZJaqxJX61LsL6J9ququ6r6Eq1qN6NJeqJLDJGJPLh6z6oqcLpqmLXJfq8Lo6cJxq8LVqHqSLeL9qkoLLVJFLYJGLWJyJKJYo56MqR6hqt6E6xLS6uL96VL1LB6l6lqzJ1qN6dqfLd6vqGLtLWJl6lqb6xqF636Iq16s6B6vLAJ3JL6LLSJKLiqLqeLi6m6iJEJDq4qZL5JELGL966JnJrJzLt636RqUL968qv6gq06qJL6VJkLn6l6P6S6eL76XqNqXqeLRJaqcLOqPqxqZL76ZJ3J4JC676PqiLRJPJpLLJ4Lq6EqG6RJDJwqeLDqp6GJXJBJXJpLlJ4Jj6kLX6V6NLvLHLi6CLEJc6sJTL4qXooJnLiqPLF6bLTJz6vLcLzJg6ILy6SJRqqJPLLJn6D6SLkqiLP6QJhLUJA6yqxqYqzLvJK6TLjquqe6Lq5L4JfLlq7JJJioo6QqaqqLCL9LeJ5LVqMq96Hq7LDL4LoJhqxqHqeJ16KLLLI6UqI6I6d6XLOJa64JSJkJq61LtJELpLmLQqtJk6Rqp6DqsLFLzLC6MLaqR676IqyJRLSLm6760JI6k6YJYqRLFq0oJ6SLPJaJJJbJB6xLXJqJg6PJGqvJQqpqxquqHqeLsqeqmqTJ2L6J2qc6oqHqzJpL1JJLhoqqCJV64LoqU6b61JR6h6OJQJrLG61Jt6O6aLmqh6boL6yLjqC6q6uLW6P6iLe6TLZJo6nJZLrJX6vJmqk6W636DLh6Xo6qIq0LkJ2oLJKJwo666Ja68qHLCJdJhLRLYqQLsLq6eLkJnquJILxJ3LvJyLMLq6kLq6wLKo5LlJW6ELKJp6Vq3J1JtJ0qzoJJ46L6qqiLILJqh6j6oL8LY6K6a6DJT6zJZJ7qbLT6SLYLVJoqx61JoqEqaJuqm6iLzLsJYJuJh6GoeoULfLP66qNqeq2qK6vJNLJLpJ0JUJJ6cqNqN6t6Bo5LRLPqYqyJ4L0LtJu6WqE646YLT6lJhqA6TL5JG6HqUJZqjq2L26xLIquJro5JWJ3LVo5Ja6lJQJIJpqt69LwoJ6LqELH63LFLmJF6a6Z6QLB6Y63qH65JZqP6OJmqlqC6L6g6GqHqoL6oUqVJJJDJg6zqOLbLtJN61qVLFqi6q6Q6kLl6A6aJ76CJeqvLJ6yLEJp6ZLToqJVLy6Z6N6EJmLiJ8qP68J8J3qIqpqto5JLJs6tJULrL7Lr6MJIL2Jq6yJqLZqkJX6hqZoqJ0qtLTLpJjLNLdq8oeLxqAJP6l6z6JJsLEq8oo6sqIJWJU61LJJI6sLhJP65qTJCqfJc6Qqtqt6c63L2Lo6Nqdqd6eLHLMqrJCJE64JSJT6L6oL26S6CJLql6xJFqmqRJsJZ6AqTJjqQqkJ5Jqqr67qI6RqzoULt6yLlL66cqz6G6i6fJiqTqrqEqOJ36qJjLpq5JloJ6tLDJyLlquL4JWqB6ZqAqaqzJn6ALKqKLRJ2LMJLJtJBLYLCLzJDJ4Lr6CJRqK6CJbL0qFJtJsLg6NLYq8Jn6YJNoJqQqLqaJlLyqQqSqRJq6uJNoe64JdJDqIq1L26F6Pq2Lhoq6kquqyqZqhqxJUJe6FooqVLE6XJGqcJJqxJ4J4qwLIoJq3J9L6L5qPJkqsqT6kJQJXLOJxqF6bJk6mJWLgLVJmL86KJ6LHqUJG64qjq0LEJlqxLBqz6JLn6Eq6LFLILKqY6BJiLJqEJ9qsq7Ly6sJELw6uJ9qrL1qTJV6yqZqhqDLJ6OqMLZJd62JDJtqp6FqzLcLZ61JnJ3JGJkqwLqqQJXJJ6UJuJxJU6oJNq9qm6UJVqSLmLdqBqzJFJoJqJRo6JjLQJg6qLi6nqcJDqvLTJnLC6x6vLaLV646ZL1JaJfJXJOLoq46mqmJnqNq5qPLsJcLKqaJTJmLzJNqQq2Lg6iLYLvJ26YJFqwqnJUJlq3J36aJdJAqwJN6kLZLuLYJ16gqVJ9o5qoL2JIJXJd6a6B6RLVLz6j6wLuqxLa6TLZJUJLqPq5qm6SLK6DJM64Ja6U6rLqLKLB6GJDJnq0LP6061LKJjLY6WqP6BJl6bqjqj6l646AqIqaqHJ4qvJI62LaqVLeoJJGqcJlLP6VJY6xqU696sJAqa6pJ8LJqNLqLNqQLaJ8qAqN6Wq4q36sqNqKL0qvqOLXq06OquJGLhLfLALLJJoL6LqpqPqpJXLXLG6gJaLo6m65Lt66JIL6JAoo6o68Jjq0LCLZqyJp6a6vJBJcq7LDLvJNJZ6uJJqgqy60LGLL6co66RLUJrquLN6j6LLwLRqJLjJkqxqe6WJELvoeqVqIJULFLM6m6WLXqEqpJLqiqQqSLjL0LeqvJ96NL7JL6eLxLbLwJAoqJmJHL9LZ6K6S61qgqCJzLIq8JV6G6f6jq2Lo6jqjqhJj6a6Bq9J4qsLaLToeJBJG6VLt66q3Lv646qLy6nqF6eqC6v6y6HqO6hqoJPqNqiqy6KJqoUqQ6qqAq5q96rLMqQLuqCLToeLSqSJs6m6F6kLyqoJvLXqqJ56Q6pJYJp6T6D68q2JrqcLU626z65LUJcLUqO64qrLf6e6ULEqkJuJG6uqY6tqGJIJlLZqcLuqJJxqTLGJWq1LSqfJtLeqaLaJEqb6WJtqcqPqxLjJ5qEJQ68LoJ3qBLkLKqdJT6pJ6LiLKLAJ163JN6so5qc6cqcLOJv6LqYqAJuqiqXJHqkqK6SJfqF68qj6IqT6W63qTq5J7JoLoLnqR63J6LTLVoL6T6YJn6GoqJUJE6Voq6o6Q6a6s6wq0LrqsJPq16uqt6oqTLVLCJgLP6QJMJgqV6EJPJJLhLUqjqVJKqgqULRJE6s6OJkqfJ8JAJqJDJ0LLJS6CqYLOqnLEqmLZLr6J61JlLzqg6ELj6yJj6iqa6ooULTqZqIJKL7LRqMoUJf6n6N6B6EJ0JxJIJXLBLx6h67qwL4606rJIJJLSLW68o5qs6moeJa6zq96TLXJ9L86i6dJbo6oeqTJ3LMJtLoLKJpJwL2LyqaLbJz60JdoJ6u6i6q646XLOLmqtL9LwLEJjJILYJIq2LrqK6Jqx6wqEqhLtJu6UJMLULPJ9LvJe6PJYqeqAJyJ5Jo6M6G6PLLJbqf6KJ2JWqaLFLtJkq7J06oJLqQJx6S6cJ5q8LRqT6vLsJtqvLR6nLcqD6SJAqz6WqHqR6NLEqFqqJL6P6fJZL0qIqn6jq2JyL4qH6QJx6XJlJmqkqVqd6P6QJcq3L8LEJcoeoJq7LPLZJ0JeLbJ4oJJ9JN6jJ1JJLyJZJ0LoLzoL6Q6Gq6q2qNqzoq6s6yLhL1Lyqg696H6BJtLboU6BLVqvJz6kJ9JPLGqQJNJuqL6PqpLuLSqJql6XJCqi6J6BLOLdLvqso6LRJILAoUJMLh6Y6FJE6kq3J66OLuq9LQqH64LU6GqbL9LiJBqBJgLPqP6H65JCoJ6jqzqWLUJ8qIJy6RJNo66VL6qy6CLAJBJNJc6mqF67JBq5L5J9LsqYq7L3qNq2qBo5JtqN60LGqgqCLkqELlJQ6VL96B6b6W6lJ6LEL0L4Lq6GLLqZL2qPLKJLqbLmqBL1qWqPqcJ26X6QqRoqLb6d6LqBLu6c6VJ3LoqkLA66JP6f6sLXqCLxqoL6q6qVLR6fJN6kJqqfLAq5JTLqq36W6WqAJQLaqULN6tLt6aJ2L9qvJVJfqnqtJ9JdqRqxq8JkJc6tLMqnLrq565qHLYLV63J4JbLT6DLU6NJALK6vJyqWJhJ061JIJLo6qvL167oJJy6Y6EqHqB6YLbq5LfJTLQLSqRL3qy6cqtLaqU6uJzqnLuLsqvLGqx6y6NL0LAJqJ56TJ9qvLnqi6f6TJA6TqlJFLk6CLkqDquJ9quqt676lLLq4LfLP6tLv62qZLvqGJqLwLf6yL3qm6C6T646xLx6XLDJ4qmJHJAqiLtqeJL6uoUqmJxJmqCLjJz6uLlJsqkJWqILD6KJrqUJyJI6YqHLPLjqq6Mqmq76VJEJP6mLULuLdoe67L3JCoLqoqxLiqBLS6e6a6TqqJLLmLIJcJ86KqD6Mqo6b6cqcLhL5qgo569JfJvJ5JSLaql68qFJDq6J1LO63LILQJvJT6wqZLzqoqSJALb6GLi6NJCLcLl6HqzqI6HLdJbJzqtqRL56WLf6nJVLxLOqwLSJmL0LA6Eqaqxq9oUJ96w6ILdLZLaJwJCLrJ46lqO6G6l68oeoJqgLkJqJA62L4qB6aqKLXLoqx6h6RqLJGJtLULALSq6JFLGqJ6eLnJzqRLNJBJaJJLNqaJCqPqNJwJELiqYL26yLlLDJVqDJ56SJ9Jf69qpJ76uqoLf6DL6JMJOLbLs6kqALHJp6bLoqw6Lq2JP68JsL4LqLPq1Jh6noq69qi6YLl6rJcLPqULbLTLELxJmLFqA6QoLL5JVJlqIqN6pqK6i6U6hqOqKq6J56HqU6zLtqaLGLroJLVJa6JJyqeJoq4Laqt6HJFLO636h6xJpLgJ2qSJMLNqcqXq8qXqgL4qd6sJqJO66LyL5LWJu6uL86MJvLPL5LSq6Ltq06EqtqSqnJhJOL76164JXqaLVq669q5q7JYq3Lk68Lxqh6PLtL5JmJxLdJU6cq46Q6o616uJxLUJHJMJaq36g6qLKJrqVqnJKLXLJqx6EJCJbLGLk67qpLNLeqFqdJW6iJr6RL6LNJ6JvJboL6xqNqsq8LIJlLML3LqLKqL6uLmqq6G6uLZqU6NLlL46xLUqcJBLmLPLeLLqVqMoqLfJHL3LoJ0JOJIoUJq6sqlqx63LmJgJAqt67LU6l6k69J06WJpqiqZ6FqkL66jq4Ly6tqS6GLJqQ6oJKJkLQ6JLgJVq06equqfq6qfqXqLqt6oLPJAJoL46pJ2LpJALsLfLWLIJoq8JpJK6wJrJCJYJ7LzLGJHJtoeJGo5JTJt6zJ8q5qpLIoJJ9L66PLn6tqWqHo668JbJm6Uqy6U6v64Je69JfJzqiLPLNJ1Lhq3JpqELGLiLb6dJELRLJL9JtJOqxqd6zJC6U6G6QJgqyJCqq6R68qrqsL5qBLuLqqgqQJOq168JrqCLtooLHJBqiq76M6NLk6N6ALgLlqxqqqI616EqJLpqpqULR6nLCL7J7L6L4JKLnqn6ULiLqJDqCJe6a6qJbqfqgLHqdJMLKJKqfLI65J9JkJLJiqmJWJP6AJ0Lwqr6HqPLbqX6MquJ6JHLP6m6mq46TJiqdqgJoL86mJoq8LjJ2JjJrJyLSJF6iqfJxLKqB6gJEqmo56d6OLXLqq76pJCqdLWJ96KJ0LV6fLxoqLhLsLn6DqiJTJhLxqw6d6O6xqXo5JtJj6W6wJG68LLqk6DqcqSJYq3oo63LY64LD6r6yJfqYJ36tLw6JqwoeJJ6cLsqjqm60616b6mJ3J26GJ26iqyqnqgJZLBLlJj6aqs616aJELCJBL2LS6aqcJoL76Lq7JwJDq36iLpqBLtLLJGJ6JCJrJ7LFqLqRqLqaqzLS6DLMqLJMoeJCqWLP6oJJJaJf6J6g61LKLELTLX6WqW6Woqqq6YqxqfLu62qC6yqJqoJ2J0JP6yqtJmJoJAoUqXooq8JvLmLeqVLjqO6r61quq2LoLuoeqpqZ6bLsJPL2qzLUqnJbLXLJLLqG6XLWJzqgLjJDJrL0q2JIqtJu6XJJqwLDJF6yJiLrLJ6aJtJLJEJ7qaJrJj6ULQJ3JW6rqBqOJt6HLjLzJfJwqq6jLsqfqEJIJJoo6pqjJpqR6m6PJCqLqeLbJoJb67LW6t6n6oLCJ0qBLlqHqgqrqEJN6A6xqiqI6I6oLN6s6dJ5o5LELi6NLSJWJNJu6Tqd60quq9JV65LZqnJhq3qIJV6X6VLIJeqfLfLxL3LR6r6F6eJu68LJLH6G6PqFLULXLlJWLJo66oqf6RLkqgLSLeLuL36eJeJqqLLgqlLt6lqdqEJ0q2LQJEqM6lqoJ6J16GLqqCJbLRJmqh6kLLqzLTL06TJmqtLeqpqeqzqQJALgqhJWqIL3LrJ6Lp6nJjLu6a6joUJBJwLx6i6tLUqRqVJEq766qiJKJaLuJULAJyJI6B6Nq06eqg6TLyLMqJJqo6L4LnJ8qG6o6cJW6MJn6b6iJtqh6cJb6JqGL86QJZo6Jrq46KqLLiqJ6rLnqeqoq7LIJ5L9J5qH65qL6L6B6CJbLGLvq8qNq4LpLt6IJDLW6BJ96O6XJR6SqsLT6n6YqcLho5q5JC6eLQ6XLrLc62Jcqr6p6qJ7qZ6hqTJyJhJlLsqiq3q3qhJzL8qHJdqnJoqEL8LsqKqeqNJAJgoqqEq56Oo5oULCJo6q6lqQ6uJyLb6WJ3JQo660L0qYJfLAJBJOqC6G6sL8LPJSJ5LC6dLqJfLzJsL2qd6HJv6uJr676H6xLPqQJaJEqnqwJZLzqA6Vq0qgLrJdLD6a6sqdLV6vqi6kJfJD6aLXLeJKJlqjqP6W6eLAqUL7LmLLJUqnLIqJLkoqJBqeJTJa6qqBqbJEJtJzLqLIq6qUqMqv6b606YJEJloeJDLF6hJsqgqgJQqDLkLS6BLP6yoLooqjJLJaoeJrLpqd6VqhqsqwoJ6uJg626Mo5JPJbqX6SqK6xo56q6iooLEJoLiJsJaJs6uJHLRq56hL5qQqy6g6U6qJS6CJFLUo6JULG6VLw6s6N6nJ86qqeJAJHLEooqAqEJoJBq9qZ6j6zLaqPJkqK6NqKLQJ5L6LJJMJ6J4o6JrJCq4LDLdqf6l6IJl6xJX6aL4LH6BJmJiqTqlJT6SqQqm6e6qJwLXLEqUqXLzJRq8Lg6T6VqNJDJwqqL9LGJlJtqPLWqT6c6dJzqNoe6dqr6T6Bo5LMJPLU686L6KqLq06nJIJN65L86VL1JpqOqQ6WJZLkJ9L1qfqQ62LxoeLrLKL1LGLvJpJKLTJt6qJLooJJLKJbL1q0qBqLq8q5qOLb6LLdquqLJxqbLvL1JwqAq2JM66qLJHJcJ6qfJJJOqH6v60Le6YqPqjLbJHJk6D6QL9JwJ46fLLL7LiqGJwqvq1JVqY6KJBq1Lqo5q8Lp6boqJVLPLJqDq9q5JqJnLOJjLzqkJ8J96wJdL3JcLQ6H6RqvJX62JDJfLQqn686BJzq1LULq63qcJmqnJbJvLz6oJHq067oUL8LbLmqooU6mqVq7oLLO6Bq3Jdq3JeJ9qEJq636kJrL5LyJsJn6KLy6EL0q9o6qe6oJbJvq9qqJUq46Z6fqI6TJmJ96f6GJbLGLz6uL5JM6wqyqrqnqboJLrqOLoLqqEqfJi6r6wJO6eJyLd6s6q6BqX6YJKJZJr6kJBq8JKLGLe6lJIL96CLnJsJA6kqMqkJo6jJoLCLBLfL1JVLI6X6T6dJsJRJRJvJZqzqDqdqYLsq9L9JnqzLLqv6gLcqbLtq1JYJdJbJqJwqBqpJ96P6m6lLZ6Gqxooqcq8LYJcoUJRLhqHJX6MqE6rqX61LRLgJKo66qqNLuq0JI6fLzJTJwqjJbLnLoLL6wqDJN6Hqiq26OqA6HLe6t6VJ4LkLdJTqpJP6cqHJtLMJv6dqA6iqVLm676eLGqqJCqDq96yLTqKJiJ96M6bJp6Xq4LCqE6XLVJ16mqG6kqsJmqtqKqkJGLzqjLTJ8oLLiLz6xJDq3JaqtLP6QqVJXJSLlJALjJtqLLEoJqqLjJr6rq0JsJC6FqDqI6GJB62JLJTJIo5q2qpL0q7qoqO6AqeLfqjLgJQ6aLPJDJYLPqrL3qsqbJeLkqCJQLWqD6iLILS6DJcq0Jn6hLrJE6TLhq16VJY6eLTq3LCqYJTqSJ0qgLvJr6ao661Jy6yJML4qtL7J7LV6R6N6o65Jy646W6Pqt6Y6TqQ6NqdJbJFLj6j6kJrJtq0qoLL6oqq6NLDLWoqJQJmq4L16N6Y6fLuqQ6eqI6q61LQLLqZ6nqbLR65LaooqfJ7JNq0JpL9LuJkLy6aJJJiLgJb6EJ66Q6BJ6qBLyLLLyJrq2JzLB6vJk66J0q2JEJyqJqf6XLYqhJRqs6ALQqRLTqK6G6wL1LTLEJLJVLZ6wqtLSL0Jsqz6OJh6rqdLvLcLkJkqJoeLwLRLSJhLfq3ooqcqSJDo56qJZo66Tqf6zqE6d6fqL6yqULb6hJ46l6k6BqRJ6q06qqqqRLZ6uqyqsJrJb69qc6c6f6G6ZJtLRJB6UqVJxqF6TJB6660JfJGqZquqMLaoUJGL4q1J9LsJRLA6TJ1Js6MLL6PLu6LqULzLh6tqfqULNJOLoLTJpJbLnJgJYq6J06CL8JZqMq5qqJm6VoJ6RqhLc6aJMLQqaqpqnLaL8LX6nJCLR6G6ELe6EL5JzqzJbqb656q6Kq2L56RLlL5JF656EJhLaLRqQJDLFqALu6U6RLzL6JT6b6N6eoLJFqzL6LTLqqtLoJyqFLjqlLDJE6Eqi6iL0LZ6kJz6eLhqdqJJbLIJYqfqmqpLnLjLIJYL16ULbqULqLtJRqqLhJoL16pqUqFLTJ2qVLt6n6gqjLoquq2Jnq6J6JBJzJLLiJq6wqK6nquqD6e6B67LcL0qKJDJyJP6wqgLM6fqyLBJX6j6XJrJL6cqvJEJ9Lv6tLQJWq4LXLEJpq3JJJl6gJ0qtLOJn6kL5qjqW6yqA6xL7qtJKLWJLJPLxJnJeLmLrJ2L3LsLAqX6yqO6NJuJ1JIJvJp6v6yLNJTq9LIJpLd6X6xLRLSqLLFJpLvJfqb6x626wJJLDJVL7Li666S6S6r6k65JRLtq3LMJ3qxLuJ5LZ6eqsJwLUJnqRJaoJLWq1LTqjq4Ll6pqZ6pJE6sL86wqbLyJyqq6Tqa6cJCJP6sLNqQLSLxLLL6qJqVJ7LD6T6v66JWqc6XqHLLLI6WL9qpLMLuqa69qeLrJoL86ZqELxqjqXqUqr67Juo6qWJyLjJwqDJc6xqx606w6n6a6B6QLKqr6XL5Lg66qG6p6s6H6iqQLaJPoUJOJjLgJ2qO6F6ZqILp6UJaLHJcLi6N6aLPq9Jh6f6oLJqPqUq5qj6jqWq96FJ66HqHL9JILEqsLU6QqEJgJGJyqV",1959));
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
