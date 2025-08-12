import { CComponent } from "./CComponent.js";
import { CBound } from "../../geometry/CBound.js";
import { CGJK_EPA, CGJKSphere } from "../../geometry/CGJK_EPA.js";
import { CArray } from "../../basic/CArray.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CTree } from "../../basic/CTree.js";
import { CMeshCopyNode } from "../../render/CMeshCopyNode.js";
import { CMeshTreeUpdate } from "../../render/CMeshTreeUpdate.js";
import { CMat } from "../../geometry/CMat.js";
import { CPaint2D } from "./paint/CPaint2D.js";
import { CUpdate } from "../../basic/Basic.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
export class CCollisionObject {
    mTar = null;
    mOrg = null;
    mPush = null;
    constructor(_org, _tar, _push) {
        this.mOrg = _org;
        this.mTar = _tar;
        this.mPush = _push;
    }
}
export class CCollider extends CComponent {
    mPaintLoad = null;
    mBound = new CBound;
    mLayer = "";
    mPickRay = new Set();
    mPlaneOut = null;
    mPlaneOutLast = false;
    mCollision = new Set();
    mPushVec = new CVec3();
    mElevator = false;
    mStairs = false;
    mDynamic = true;
    mTrigger = false;
    mOneWayDir = new CVec3();
    mOneWayArc = -1;
    mGGI = null;
    mGJK = null;
    mGJKShape = null;
    mBoundGJK = null;
    mCenterGJK = new CVec3();
    mSizeGJK = new CVec3();
    m2D;
    mUpdateMat = CUpdate.eType.Updated;
    mColTarget = new CArray();
    mColPush = new CArray();
    mColPair = new Map();
    mBoundType = CBound.eType.Null;
    constructor(_paint = null, _2d = false) {
        super();
        this.m2D = _2d;
        if (_paint != null)
            this.InitBound(_paint);
        else {
            this.mBound = new CBound();
        }
        this.mSysc = CComponent.eSysn.Collider;
        this.mBoundGJK = new CBound();
    }
    Icon() { return "bi bi-sign-railroad"; }
    RegistHeap(_F32A) {
    }
    EditForm(_pointer, _body, _input) {
        if (_pointer.member == "mCollision" || _pointer.member == "mGGI")
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [""]);
    }
    EditChange(_pointer, _childe) {
        super.EditChange(_pointer, _childe);
        if (_pointer.IsRef(this.mBound)) {
            this.InitBound(this.mBound);
            this.mUpdateMat = CUpdate.eType.Updated;
        }
        else if (_pointer.member == "mLayer") {
            this.mUpdateMat = CUpdate.eType.Updated;
        }
    }
    IsShould(_member, _type) {
        if (_member == "mUpdateMat" || _member == "mGJK" || _member == "m_colMsg" || _member == "mPaintLoad" ||
            _member == "mGJKShape" || _member == "mPushVec" || _member == "mGGI" ||
            _member == "mBoundGJK" || _member == "mCenterGJK" || _member == "mSizeGJK" ||
            _member == "mColTarget" || _member == "mColPush")
            return false;
        return super.IsShould(_member, _type);
    }
    Export(_copy = true, _resetKey = true) {
        let dummy = super.Export(_copy, _resetKey);
        dummy.Import(this);
        dummy.mPaintLoad = this.mPaintLoad;
        return dummy;
    }
    ImportCJSON(_json) {
        let wat = super.ImportCJSON(_json);
        this.InitBound(this.mBound);
        if ((_json).GetBool("m_pickMouse"))
            this.SetPickMouse(true);
        if ((_json).GetBool("m_cameraOut"))
            this.SetCameraOut(true);
        return wat;
    }
    SetOneWay(_radian, _dir = new CVec3(0, 1)) {
        this.mOneWayArc = 1 - _radian / CMath.PI();
        this.mOneWayDir = _dir;
    }
    static MeshToColliderList(_mesh) {
        var lmesh = _mesh;
        var tree = new CTree();
        tree.mData = new CMeshCopyNode();
        var boundList = new Array();
        var colList = new Array();
        CMeshTreeUpdate.TreeCopy(lmesh.meshTree, tree, new CMat(), boundList);
        for (var each0 of boundList) {
            var col = new CCollider(each0);
            col.PushCollisionLayer("");
            colList.push(col);
        }
        return colList;
    }
    GeometryUpdate(_ggi) {
        this.mGGI = _ggi;
        this.UpdateMat();
        if (this.IsEnable() == false || this.GetLayer() == "" || this.GetOwner().IsEnable() == false)
            return;
        _ggi.mOctree.Insert(this.mCenterGJK, this.mSizeGJK, this, this.mBoundGJK.mMin, this.mBoundGJK.mMax);
    }
    Prefab(_owner) {
        if (this.mPaintLoad != null) {
            if (this.m2D ? this.mPaintLoad.GetSize() != null : this.mPaintLoad.GetBound().GetType() != CBound.eType.Null) {
                this.InitBound(this.mPaintLoad);
                this.mPaintLoad = null;
                this.UpdateMat();
            }
        }
    }
    StartChk() {
        if (this.mPaintLoad != null) {
            if (this.m2D ? this.mPaintLoad.GetSize() != null : this.mPaintLoad.GetBound().GetType() != CBound.eType.Null) {
                this.InitBound(this.mPaintLoad);
                this.mPaintLoad = null;
                this.UpdateMat();
            }
            else
                return;
        }
        if (this.mGJKShape == null || this.mGGI == null)
            return;
        if (this.mBound.GetType() == CBound.eType.Voxel) {
            this.mUpdateMat = CUpdate.eType.Not;
            return;
        }
        this.mStartChk = false;
        this.Start();
    }
    SetOwner(_obj) {
        super.SetOwner(_obj);
        if (this.mPaintLoad == null)
            this.InitBound(this.mBound);
        this.UpdateMat();
    }
    InitBound(_paint) {
        if (_paint instanceof CBound) {
            this.mBound.Import(_paint);
        }
        else {
            if (_paint instanceof CPaint2D) {
                this.m2D = true;
                if (_paint.GetSize() == null)
                    _paint.SizeCac();
                if (_paint.GetSize() == null) {
                    this.mPaintLoad = _paint;
                    return;
                }
            }
            if (_paint.GetBound().GetType() == CBound.eType.Null) {
                this.mPaintLoad = _paint;
                return;
            }
            let bound = _paint.GetBound().Export();
            this.mBound.Reset();
            this.mBound.InitBound(CMath.V3MulMatCoordi(bound.mMin, _paint.GetLMat()));
            this.mBound.InitBound(CMath.V3MulMatCoordi(bound.mMax, _paint.GetLMat()));
            let size = this.mBound.GetSize();
            let center = this.mBound.GetCenter();
            this.mBound.mMin.x = -size.x * 0.5;
            this.mBound.mMin.y = -size.y * 0.5;
            this.mBound.mMin.z = -size.z * 0.5;
            this.mBound.mMax.x = size.x * 0.5;
            this.mBound.mMax.y = size.y * 0.5;
            this.mBound.mMax.z = size.z * 0.5;
            if (this.mBoundType == CBound.eType.Null) {
                this.mBound.SetType(bound.GetType());
                this.mBoundType = bound.GetType();
            }
            else
                this.mBound.SetType(this.mBoundType);
        }
        if (this.m2D) {
            this.mBound.mMax.z = this.mBound.GetInRadius();
            this.mBound.mMin.z = -this.mBound.mMax.z;
        }
        this.mGJK = new CGJK_EPA();
        this.mGJKShape = CGJKSphere.NewCBound(this.mBound, this.m2D);
        this.mUpdateMat = CUpdate.eType.Updated;
        if (this.GetOwner() != null)
            this.UpdateMat();
    }
    SetDynamic(_dynamic) { this.mDynamic = _dynamic; }
    GetDynamic() { return this.mDynamic; }
    SetLayer(_key) {
        this.mLayer = _key;
        this.mUpdateMat = CUpdate.eType.Updated;
    }
    GetLayer() { return this.mLayer; }
    GetElevator() { return this.mElevator; }
    SetElevator(_elevator) { this.mElevator = _elevator; }
    GetTrigger() { return this.mTrigger; }
    SetTrigger(_enable) { this.mTrigger = _enable; }
    GetStairs() { return this.mStairs; }
    SetStairs(_stairs) { this.mStairs = _stairs; }
    Update(_delay) {
    }
    SetBoundType(_type) {
        this.mBoundType = _type;
        if (this.mBound.GetType() != CBound.eType.Null) {
            this.mGJKShape = CGJKSphere.NewCBound(this.mBound, this.m2D);
            this.mUpdateMat = CUpdate.eType.Updated;
            this.ResetBoundGJK();
        }
    }
    PushCollisionLayer(_val) {
        if (typeof _val == "string")
            this.mCollision.add(_val);
        else {
            for (let lay of _val) {
                this.mCollision.add(lay);
            }
        }
    }
    ClearCollisionLayer() {
        this.mCollision = new Set();
    }
    SetPickMouse(_val) { this.mPickRay.add("Main"); }
    SetCameraOut(_val) { this.mPlaneOut = "Main"; }
    PushPickRay(_val) {
        this.mPickRay.add(_val);
    }
    SetGJK(_wMat) {
        if (this.mGJKShape == null)
            return;
        this.mGJKShape.SetMatrix(_wMat);
    }
    UpdateMat() {
        if (this.mGJKShape == null)
            return;
        if (this.mUpdateMat != CUpdate.eType.Not || this.GetOwner().mUpdateMat != 0) {
            this.mGJKShape.SetMatrix(this.GetOwner().GetWMat());
            this.ResetBoundGJK();
            if (this.mUpdateMat == CUpdate.eType.Updated)
                this.mUpdateMat = CUpdate.eType.Already;
        }
    }
    GetCollision() {
        return this.mCollision;
    }
    GetBound() {
        return this.mBound;
    }
    GetWBound() {
        if (this.mLayer == "")
            this.ResetBoundGJK(false);
        return this.mBoundGJK;
    }
    ResetBoundGJK(_layerChk = true) {
        if (this.mLayer == "" && _layerChk)
            return;
        let dPos = CPoolGeo.ProductV3();
        let oPos = CPoolGeo.ProductV3();
        if (this.mGJKShape instanceof CGJKSphere) {
            let r = this.mGJKShape.GetRadian();
            this.mCenterGJK.mF32A[0] = this.mGJKShape.GetMatrix().mF32A[12];
            this.mCenterGJK.mF32A[1] = this.mGJKShape.GetMatrix().mF32A[13];
            this.mCenterGJK.mF32A[2] = this.mGJKShape.GetMatrix().mF32A[14];
            this.mSizeGJK.mF32A[0] = r;
            this.mSizeGJK.mF32A[1] = r;
            this.mSizeGJK.mF32A[2] = r;
            this.mBoundGJK.mMax.mF32A[0] = this.mCenterGJK.mF32A[0] + r;
            this.mBoundGJK.mMax.mF32A[1] = this.mCenterGJK.mF32A[1] + r;
            this.mBoundGJK.mMax.mF32A[2] = this.mCenterGJK.mF32A[2] + r;
            this.mBoundGJK.mMin.mF32A[0] = this.mCenterGJK.mF32A[0] - r;
            this.mBoundGJK.mMin.mF32A[1] = this.mCenterGJK.mF32A[1] - r;
            this.mBoundGJK.mMin.mF32A[2] = this.mCenterGJK.mF32A[2] - r;
        }
        else if (this.mGJKShape.GetMatrix().IsRotUnit()) {
            this.mCenterGJK.mF32A[0] = this.mGJKShape.GetMatrix().mF32A[12];
            this.mCenterGJK.mF32A[1] = this.mGJKShape.GetMatrix().mF32A[13];
            this.mCenterGJK.mF32A[2] = this.mGJKShape.GetMatrix().mF32A[14];
            CMath.V3AddV3(this.GetBound().mMin, this.mCenterGJK, this.mBoundGJK.mMin);
            CMath.V3AddV3(this.GetBound().mMax, this.mCenterGJK, this.mBoundGJK.mMax);
            this.mBoundGJK.GetSize(this.mSizeGJK);
        }
        else {
            this.mBoundGJK.mMin.mF32A[0] = 100000;
            this.mBoundGJK.mMin.mF32A[1] = 100000;
            this.mBoundGJK.mMin.mF32A[2] = 100000;
            this.mBoundGJK.mMax.mF32A[0] = -100000;
            this.mBoundGJK.mMax.mF32A[1] = -100000;
            this.mBoundGJK.mMax.mF32A[2] = -100000;
            dPos.x = this.GetBound().mMin.x;
            dPos.y = this.GetBound().mMin.y;
            dPos.z = this.GetBound().mMin.z;
            this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(), oPos));
            dPos.x = this.GetBound().mMin.x;
            dPos.y = this.GetBound().mMin.y;
            dPos.z = this.GetBound().mMax.z;
            this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(), oPos));
            dPos.x = this.GetBound().mMin.x;
            dPos.y = this.GetBound().mMax.y;
            dPos.z = this.GetBound().mMin.z;
            this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(), oPos));
            dPos.x = this.GetBound().mMin.x;
            dPos.y = this.GetBound().mMax.y;
            dPos.z = this.GetBound().mMax.z;
            this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(), oPos));
            dPos.x = this.GetBound().mMax.x;
            dPos.y = this.GetBound().mMin.y;
            dPos.z = this.GetBound().mMin.z;
            this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(), oPos));
            dPos.x = this.GetBound().mMax.x;
            dPos.y = this.GetBound().mMin.y;
            dPos.z = this.GetBound().mMax.z;
            this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(), oPos));
            dPos.x = this.GetBound().mMax.x;
            dPos.y = this.GetBound().mMax.y;
            dPos.z = this.GetBound().mMin.z;
            this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(), oPos));
            dPos.x = this.GetBound().mMax.x;
            dPos.y = this.GetBound().mMax.y;
            dPos.z = this.GetBound().mMax.z;
            this.mBoundGJK.InitBound(CMath.V3MulMatCoordi(dPos, this.mGJKShape.GetMatrix(), oPos));
            this.mBoundGJK.GetCenter(this.mCenterGJK);
            this.mBoundGJK.GetSize(this.mSizeGJK);
        }
        CPoolGeo.RecycleV3(oPos);
        CPoolGeo.RecycleV3(dPos);
        this.mBoundGJK.mType = CBound.eType.Box;
    }
    GetBoundGJK() {
        return this.mBoundGJK;
    }
    CollisionChk(_co) {
        return null;
    }
    Pushing(_co) {
        return null;
    }
    static PushingSphere(_a, _b) {
        return null;
    }
    static PushingBox(_a, _b) {
        return null;
    }
    PushingGJK(_co) {
        return null;
    }
    PickChk(_tVec3) {
        return true;
    }
    CameraOutChk(_plane) {
        return null;
    }
}
import CCollider_imple from "../../canvas_imple/component/CCollider.js";
CCollider_imple();
