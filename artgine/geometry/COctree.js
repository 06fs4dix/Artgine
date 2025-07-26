import { CArray } from "../basic/CArray.js";
import { CBound } from "./CBound.js";
import { CMath } from "./CMath.js";
import { CVec3 } from "./CVec3.js";
import { CUtilMath } from "./CUtilMath.js";
export class COctreeData {
    mData = null;
    mCenter = new CVec3();
    mSize = new CVec3();
    mMin = new CVec3();
    mMax = new CVec3();
    mCol = new CArray();
    mUpdate = 0;
    constructor() {
    }
}
export class COctree {
    mCenter = new CVec3();
    mHalf = new CVec3();
    mChilde = null;
    mData = null;
    mMax = new CVec3();
    mBound;
    constructor(_center, _half) {
        this.mCenter.Import(_center);
        this.mHalf.Import(_half);
        this.mBound = new CBound();
    }
    ContainingPoint(point) {
        return 0;
    }
    IsLeafNode() {
        return this.mChilde == null;
    }
    SelectChilde(point) {
        return null;
    }
    ResetBound(_max) {
    }
    SortXMinData() {
    }
    Insert(_ocData, _depth) {
    }
    InsidePlane(bplane, results) {
        if (this.IsLeafNode()) {
            for (var i = 0; i < this.mData.length; ++i) {
                results(this.mData[i]);
            }
        }
        else {
            for (let i = 0; i < this.mChilde.length; ++i) {
                if (this.mChilde[i] == null)
                    continue;
                var r = CMath.Max(CMath.Max(this.mHalf.mF32A[0], this.mHalf.mF32A[1]), this.mHalf.mF32A[2]);
                var rad = Math.sqrt(r * r + r * r + r * r);
                if (CUtilMath.PlaneSphereInside(bplane, this.mChilde[i].mCenter, rad, null)) {
                    this.mChilde[i].InsidePlane(bplane, results);
                }
            }
        }
    }
    InsideBox(bmin, bmax, results, _ocd = null) {
    }
}
export class COctreeMgr {
    mOctree;
    mOCDMap = new Map();
    mBound;
    mUpdate = 0;
    constructor(_wasm = null) {
        this.mBound = new CBound();
        this.mBound.mMin.x = -100;
        this.mBound.mMin.y = -100;
        this.mBound.mMin.z = -100;
        this.mBound.mMax.x = 100;
        this.mBound.mMax.y = 100;
        this.mBound.mMax.z = 100;
        this.mOctree = null;
    }
    RegistHeap(_F32A) {
    }
    GetBound() {
        let bList = new Array();
        let que = new Array();
        if (this.mOctree.mChilde == null) {
            return bList;
        }
        for (let i = 0; i < this.mOctree.mChilde.length; ++i) {
            if (this.mOctree.mChilde[i] != null)
                que.push(this.mOctree.mChilde[i]);
        }
        while (que.length > 0) {
            let pst = que.splice(0, 1)[0];
            if (pst == null)
                continue;
            bList.push(pst.mBound);
            if (pst.mChilde != null) {
                for (let i = 0; i < pst.mChilde.length; ++i)
                    que.push(pst.mChilde[i]);
            }
        }
        return bList;
    }
    Build() {
    }
    Insert(_center, _size, _data, _min = null, _max = null) {
    }
    InsidePlane(_bplane, _results) {
        this.mOctree.InsidePlane(_bplane, _results);
    }
    InsideBoxData(_bmin, _bmax, _results, _data) {
        let odata = this.mOCDMap.get(_data);
        if (odata == null)
            return;
        for (let i = 0; i < odata.mCol.Size(); ++i) {
            _results(odata.mCol.Find(i));
        }
        this.mOctree.InsideBox(_bmin, _bmax, _results, odata);
    }
    InsideBox(_bmin, _bmax, _results) {
        this.mOctree.InsideBox(_bmin, _bmax, _results);
    }
    InsideBoxArr(_bmin, _bmax, _results) {
        this.mOctree.InsideBox(_bmin, _bmax, (_ocData) => {
            _results.Push(_ocData.mData);
        });
    }
}
import COctree_imple from "../geometry_imple/COctree.js";
COctree_imple();
