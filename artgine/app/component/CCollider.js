import { CComponent } from "./CComponent.js";
import { CBound } from "../../geometry/CBound.js";
import { CGJK_EPA } from "../../geometry/CGJK_EPA.js";
import { CArray } from "../../basic/CArray.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CTree } from "../../basic/CTree.js";
import { CMeshCopyNode } from "../../render/CMeshCopyNode.js";
import { CMeshTreeUpdate } from "../../render/CMeshTreeUpdate.js";
import { CMat } from "../../geometry/CMat.js";
import { CUpdate } from "../../basic/Basic.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CBoundWorldCollider } from "./CBoundWorld.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";
import { CPhysics } from "./CPhysics.js";
import { CGeometryComp } from "./CGeometryComp.js";
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
export class CCollider extends CGeometryComp {
    static eEvent = {
        None: 0,
        Trigger: 1,
        Collision: 2
    };
    mPaintLoad = null;
    mBound = new CBound;
    mLayer = "";
    mPickRay = new Set();
    mCameraOut = null;
    mCameraOutLast = false;
    mCollision = new Set();
    mPushVec = new CVec3();
    mElevator = false;
    mStairs = false;
    mEvent = CCollider.eEvent.Collision;
    mOneWayDir = new CVec3();
    mOneWayArc = -1;
    mGI = null;
    mGJK = null;
    mBW = new CBoundWorldCollider();
    m2D;
    mUpdateMat = CUpdate.eType.Updated;
    mColTarget = new CArray();
    mColPush = new CArray();
    mColPair = new Map();
    constructor(_paint = null, _rb = null, _2d = false) {
        super();
        this.mRB = _rb;
        this.m2D = _2d;
        if (_paint != null)
            this.InitBound(_paint);
        else
            this.mBound = new CBound();
        this.mSysc = CComponent.eSysn.Collider;
    }
    Icon() { return "bi bi-sign-railroad"; }
    RegistHeap(_F32A) {
    }
    EditForm(_pointer, _body, _input) {
        if (_pointer.member == "mCollision" || _pointer.member == "mGI")
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [""]);
        else if (_pointer.member == "mCameraOut")
            CUtilObj.NullEdit(_pointer, _body, _input, "");
    }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_pointer.IsRef(this.mBound)) {
            this.InitBound(this.mBound);
            this.mBW.mBound.mType = this.mBound.mType;
            this.mUpdateMat = CUpdate.eType.Updated;
        }
        else if (_pointer.member == "mLayer") {
            this.mUpdateMat = CUpdate.eType.Updated;
        }
    }
    IsShould(_member, _type) {
        if (_member == "mUpdateMat" || _member == "mGJK" || _member == "mPaintLoad" ||
            _member == "mPushVec" || _member == "mGI" || _member == "mBW" ||
            _member == "mColTarget" || _member == "mColPush" || _member == "mColPair" ||
            _member == "mOneWayMap" || _member == "mRB" || _member == "mCameraOutLast")
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
    Update(_update) {
        if (this.mGI != null)
            this.mGI.mFixedComp.Push(this);
        if (this.GetOwner().mUpdateRS != CUpdate.eType.Not || this.mBW.mRadian == 0) {
            this.mBW.Init(this.mBound, this.mOwner.GetMat());
        }
    }
    BuildGI() {
        this.UpdateMat();
        if (this.IsEnable() == false || this.GetLayer() == "" || this.GetOwner().IsEnable() == false)
            return;
        this.mGI.mOctree.Insert(this.mBW.mPos, this.mBW.mSize, this, this.mBW.mWBound.mMin, this.mBW.mWBound.mMax);
    }
    GetBoundGJK() {
        return this.mBW.mWBound;
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
    Start() {
        super.Start();
        this.mBW.Init(this.mBound, this.GetOwner().GetMat());
        this.mBW.UpdateMat(this.GetOwner().GetMat());
    }
    StartChk() {
        let start = super.StartChk();
        if (this.mPaintLoad != null) {
            this.InitBound(this.mPaintLoad);
            if (this.mPaintLoad != null) {
                this.mStartChk = true;
                return false;
            }
        }
        if (this.mBound.GetType() == CBound.eType.Voxel) {
            this.mUpdateMat = CUpdate.eType.Not;
            return true;
        }
        return start;
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
            if (_paint.IsStart() == false) {
                this.mPaintLoad = _paint;
                return;
            }
            this.mPaintLoad = null;
            let bound = _paint.GetBound().Export();
            this.mBound.Reset();
            this.mBound.mMin.Import(bound.mMin);
            this.mBound.mMax.Import(bound.mMax);
            this.mBound.SetType(bound.GetType());
        }
        this.mGJK = new CGJK_EPA();
        this.mUpdateMat = CUpdate.eType.Updated;
        if (this.GetOwner() != null)
            this.UpdateMat();
    }
    SetEvent(_event) {
        this.mEvent = _event;
    }
    SetLayer(_key) {
        this.mLayer = _key;
        this.mUpdateMat = CUpdate.eType.Updated;
    }
    GetLayer() { return this.mLayer; }
    GetElevator() { return this.mElevator; }
    SetElevator(_elevator) { this.mElevator = _elevator; }
    GetStairs() { return this.mStairs; }
    SetStairs(_stairs) { this.mStairs = _stairs; }
    Fixed(_update) {
    }
    SetBoundType(_type) {
        this.mBound.SetType(_type);
        this.mBW.mBound.SetType(_type);
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
    SetPickMouse(_val) { this.mPickRay.add(""); }
    SetCameraOut(_val) { this.mCameraOut = ""; }
    PushPickRay(_val) {
        this.mPickRay.add(_val);
    }
    UpdateMat() {
        if (this.mUpdateMat != CUpdate.eType.Not || this.GetOwner().mUpdateMat != 0) {
            this.mBW.UpdateMat(this.GetOwner().GetMat());
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
    CollisionChk(_co, _colTarget, _colPush) {
        let push = null;
        push = this.mColPair.get(_co);
        if (push) {
            if (_colTarget != null)
                _colTarget.Push(_co);
            if (_colPush != null)
                _colPush.Push(CMath.V3MulFloat(push, -1));
            return true;
        }
        if (this.mBound.GetType() == _co.mBound.GetType() && this.mEvent == CCollider.eEvent.Trigger &&
            this.mBW.mMat.IsRotUnit() && _co.mBW.mMat.IsRotUnit()) {
            if (_colTarget != null)
                _colTarget.Push(_co);
            if (_colPush != null)
                _colPush.Push(this.mPushVec);
            return true;
        }
        else if (this.mBound.GetType() == CBound.eType.Sphere && _co.mBound.GetType() == CBound.eType.Sphere) {
            const aRadius = this.mBW.mRadian;
            const bRadius = _co.mBW.mRadian;
            var dir = CMath.V3SubV3(this.mBW.mPos, _co.mBW.mPos);
            var vlen = CMath.V3Len(dir);
            if (vlen <= aRadius + bRadius) {
                CMath.V3Nor(dir, dir);
                vlen = aRadius + bRadius - vlen;
                if (vlen < 0.01)
                    vlen = 0.0;
                else
                    vlen += 0.01;
                push = CMath.V3MulFloat(dir, -vlen);
            }
            else
                return false;
        }
        else if (this.mBound.GetType() == CBound.eType.Box && _co.mBound.GetType() == CBound.eType.Box) {
            if (this.mBW.mMat.IsRotUnit() == false || _co.mBW.mMat.IsRotUnit() == false)
                push = CUtilMath.ColBoxBoxOBB(this.mBound, this.mBW.mMat, _co.mBound, _co.mBW.mMat);
            else
                push = CUtilMath.ColBoxBoxAABB(this.mBound, this.mBW.mMat, _co.mBound, _co.mBW.mMat);
        }
        else if (this.mBound.GetType() == CBound.eType.Sphere && _co.mBound.GetType() == CBound.eType.Box) {
            push = CUtilMath.ColSphereBox(this.mBW.mPos, this.mBW.mRadian, _co.mBound, _co.mBW.mMat);
            if (push != null)
                push = CMath.V3MulFloat(push, -1);
        }
        else if (_co.mBound.GetType() == CBound.eType.Sphere && this.mBound.GetType() == CBound.eType.Box) {
            push = CUtilMath.ColSphereBox(_co.mBW.mPos, _co.mBW.mRadian, this.mBound, this.mBW.mMat);
        }
        else if (this.mGJK.Intersect(this.mBW, _co.mBW)) {
            push = this.mGJK.EPA(this.mBW, _co.mBW);
            var ocen = this.mBW.mPos;
            var tcen = _co.mBW.mPos;
            var cen = CMath.V3SubV3(ocen, tcen);
            if (_co.GetBound().mMax.Equals(this.GetBound().mMax) &&
                _co.GetBound().mMin.Equals(this.GetBound().mMin) && CMath.V3Len(push) < 0.000001) {
                if (cen.IsZero()) {
                    push.x = Math.random() - 0.5;
                    push.y = Math.random() - 0.5;
                    push.z = Math.random() - 0.5;
                }
                else
                    push = CCollider.PushingSphere(this.mBW.mWBound, _co.mBW.mWBound);
            }
            else {
                if (push.x > 0 && ocen.x > tcen.x)
                    push.x = -push.x;
                else if (push.x < 0 && ocen.x < tcen.x)
                    push.x = -push.x;
                if (push.y > 0 && ocen.y > tcen.y)
                    push.y = -push.y;
                else if (push.y < 0 && ocen.y < tcen.y)
                    push.y = -push.y;
                if (push.z > 0 && ocen.z > tcen.z)
                    push.z = -push.z;
                else if (push.z < 0 && ocen.z < tcen.z)
                    push.z = -push.z;
            }
        }
        if (push != null) {
            if (Math.abs(push.x) < CPhysics.CutMinPushValue)
                push.x = 0;
            if (Math.abs(push.y) < CPhysics.CutMinPushValue)
                push.y = 0;
            if (Math.abs(push.z) < CPhysics.CutMinPushValue)
                push.z = 0;
            if (push.IsZero())
                return false;
            _co.mColPair.set(this, push);
            if (_colTarget != null)
                _colTarget.Push(_co);
            if (_colPush != null)
                _colPush.Push(push);
            return true;
        }
        return false;
    }
    static PushingSphere(_a, _b) {
        var aRadius = _a.GetInRadius();
        var aCenter = _a.GetCenter();
        var bRadius = _b.GetInRadius();
        var bCenter = _b.GetCenter();
        var dir = CMath.V3SubV3(aCenter, bCenter);
        var len = CMath.V3Len(dir);
        dir = CMath.V3Nor(dir);
        len = aRadius + bRadius - len;
        if (len < 0.01)
            len = 0.0;
        else
            len += 0.01;
        return CMath.V3MulFloat(dir, -len);
    }
    static PushingBox(_a, _b) {
        var aBound = _a;
        var bBound = _b;
        var rate = 0.001;
        var pushPos = new CVec3();
        var minVal = 100000000;
        var val = 0;
        val = aBound.mMin.x - bBound.mMax.x;
        if (minVal > Math.abs(val)) {
            if (val > 0)
                val += rate;
            else
                val -= rate;
            minVal = Math.abs(val);
            pushPos.x = val;
            pushPos.y = 0;
            pushPos.z = 0;
        }
        val = aBound.mMax.x - bBound.mMin.x;
        if (minVal > Math.abs(val)) {
            if (val > 0)
                val += rate;
            else
                val -= rate;
            minVal = Math.abs(val);
            pushPos.x = val;
            pushPos.y = 0;
            pushPos.z = 0;
        }
        val = aBound.mMin.y - bBound.mMax.y;
        if (minVal > Math.abs(val)) {
            if (val > 0)
                val += rate;
            else
                val -= rate;
            minVal = Math.abs(val);
            pushPos.y = val;
            pushPos.x = 0;
            pushPos.z = 0;
        }
        val = aBound.mMax.y - bBound.mMin.y;
        if (minVal > Math.abs(val)) {
            if (val > 0)
                val += rate;
            else
                val -= rate;
            minVal = Math.abs(val);
            pushPos.y = val;
            pushPos.x = 0;
            pushPos.z = 0;
        }
        val = aBound.mMin.z - bBound.mMax.z;
        if (minVal > Math.abs(val)) {
            if (val > 0)
                val += rate;
            else
                val -= rate;
            minVal = Math.abs(val);
            pushPos.z = val;
            pushPos.x = 0;
            pushPos.y = 0;
        }
        val = aBound.mMax.z - bBound.mMin.z;
        if (minVal > Math.abs(val)) {
            if (val > 0)
                val += rate;
            else
                val -= rate;
            minVal = Math.abs(val);
            pushPos.z = val;
            pushPos.x = 0;
            pushPos.y = 0;
        }
        return pushPos;
    }
    PickChk(_tVec3) {
        return null;
    }
    CameraOutChk(_plane) {
        return null;
    }
    mRestitution = 0;
    mRB = null;
    mOneWayMap = new Map();
    SetRestitution(_restitution = 0.5) { this.mRestitution = _restitution; }
    GetRestitution() { return this.mRestitution; }
    PushExe(_org, _size, _tar, _push) {
    }
}
import CCollider_imple from "../../app_imple/component/CCollider.js";
CCollider_imple();
