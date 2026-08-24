import { CArray } from "../basic/CArray.js";
import { CBound } from "./CBound.js";
import { CMath } from "./CMath.js";
import { CVec3 } from "./CVec3.js";
import { CUtilMath } from "./CUtilMath.js";
import COctree_imple from "../geometry_imple/COctree.js";
export class COctreeData {
    mData = null;
    mCenter = new CVec3();
    mSize = new CVec3();
    mMin = new CVec3();
    mMax = new CVec3();
    mCol = new CArray();
    mUpdate = 0;
    mStatic = false;
    constructor() {
    }
}
let gOctreePool = [];
let gOCCount = 0;
export class COctree {
    mPool;
    mCenter;
    mHalf;
    mChild = null;
    mData = null;
    mMax = new CVec3();
    mBound;
    constructor(_center, _half, _pool = null) {
        this.mCenter = _center;
        this.mHalf = _half;
        this.mBound = new CBound();
        this.mPool = _pool;
    }
    NewChild(_center, _half) {
        if (this.mPool == null)
            return new COctree(_center, _half);
        let oc = this.mPool.New(COctree);
        oc.mCenter = _center;
        oc.mHalf = _half;
        oc.mPool = this.mPool;
        oc.mChild = null;
        oc.mData = null;
        oc.mBound.Reset();
        oc.mMax.Zero();
        return oc;
    }
    ContainingPoint(point) {
        return 0;
    }
    IsLeafNode() {
        return this.mChild == null;
    }
    SelectChild(point) {
        return null;
    }
    ResetBound(_max) {
    }
    SortXMinData() {
    }
    Insert(_ocData, _depth) {
    }
    InsideRay(_ray, _RayLength, _boundary, results) {
    }
    InsidePlane(bplane, results) {
        if (this.IsLeafNode()) {
            for (var i = 0; i < this.mData.length; ++i) {
                results(this.mData[i]);
            }
        }
        else {
            for (let i = 0; i < this.mChild.length; ++i) {
                if (this.mChild[i] == null)
                    continue;
                var r = CMath.Max(CMath.Max(this.mHalf.mF32A[0], this.mHalf.mF32A[1]), this.mHalf.mF32A[2]);
                var rad = Math.sqrt(r * r + r * r + r * r);
                if (CUtilMath.PlaneSphereInside(bplane, this.mChild[i].mCenter, rad, null)) {
                    this.mChild[i].InsidePlane(bplane, results);
                }
            }
        }
    }
    InsideBox(bmin, bmax, results, _ocd = null) {
    }
}
export class COctreeMgr {
    mDynamic;
    mStatic;
    mStaticUpdate = true;
    mStaticBuild = false;
    mOCDMap = new Map();
    mOCSMap = new Map();
    mDBound;
    mSBound;
    mUpdate = 0;
    mPool = new CArray;
    constructor(_wasm = null) {
        this.mDBound = new CBound();
        this.mDBound.mMin.x = -100;
        this.mDBound.mMin.y = -100;
        this.mDBound.mMin.z = -100;
        this.mDBound.mMax.x = 100;
        this.mDBound.mMax.y = 100;
        this.mDBound.mMax.z = 100;
        this.mSBound = new CBound();
        this.mSBound.mMin.x = -100;
        this.mSBound.mMin.y = -100;
        this.mSBound.mMin.z = -100;
        this.mSBound.mMax.x = 100;
        this.mSBound.mMax.y = 100;
        this.mSBound.mMax.z = 100;
        this.mDynamic = null;
    }
    RegistHeap(_F32A) {
    }
    GetBound() {
        let bList = new Array();
        let que = new Array();
        if (this.mDynamic.mChild == null) {
            return bList;
        }
        for (let i = 0; i < this.mDynamic.mChild.length; ++i) {
            if (this.mDynamic.mChild[i] != null)
                que.push(this.mDynamic.mChild[i]);
        }
        while (que.length > 0) {
            let pst = que.splice(0, 1)[0];
            if (pst == null)
                continue;
            bList.push(pst.mBound);
            if (pst.mChild != null) {
                for (let i = 0; i < pst.mChild.length; ++i)
                    que.push(pst.mChild[i]);
            }
        }
        return bList;
    }
    Build() {
    }
    Insert(_center, _size, _data, _min = null, _max = null, _static = false) {
    }
    InsideRay(_ray, _RayLength, _boundary, results) {
    }
    InsidePlane(_bplane, _results) {
    }
    InsideBoxData(_bmin, _bmax, _results, _data) {
    }
    InsideBox(_bmin, _bmax, _results) {
    }
    Find(_st, _ed, _bound, _layerPass = null, _path, _size = 100, _loopScale = 1) {
        return null;
    }
    CorrectPosition(_pos, _boundary, _size, _layerPass = null) {
        return _pos;
    }
}
COctree_imple();
