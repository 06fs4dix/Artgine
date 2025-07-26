import { CComponent } from "../component/CComponent.js";
import { CForce } from "./CForce.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CPhysics } from "../component/CPhysics.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";
import { CString } from "../../basic/CString.js";
var yPath = true;
export class CRigidBody extends CComponent {
    mStartPos = null;
    mForceArr = new Array();
    mForceGravity = null;
    mStopover = null;
    mFreezePos = new Array(false, false, false);
    mRestitution = 0;
    mElastic = false;
    mDamping = 0;
    mMass = 0;
    mGravity = false;
    mFall = false;
    mJump = false;
    mAutoDetrude = true;
    mElevatorPos = null;
    mElevator = null;
    mMoveDir = new CVec3();
    mOneWayMap = new Map();
    Icon() { return "bi bi-person-walking"; }
    SetGravity(_gravity) { this.mGravity = _gravity; }
    GetGravity() { return this.mGravity; }
    SetRestitution(_restitution = 0.5) { this.mRestitution = _restitution; }
    GetRestitution() { return this.mRestitution; }
    SetFreezePos(_xfreeze, _yfreeze, _zfreeze) {
        this.mFreezePos = [_xfreeze, _yfreeze, _zfreeze];
    }
    constructor() {
        super();
        this.mSysc = CComponent.eSysn.Wind;
    }
    EditChange(_pointer) {
        if (_pointer.member == "mGravity") {
            this.mForceGravity = null;
            this.Remove("g");
        }
    }
    IsJump() {
        return this.mJump;
    }
    IsFall() {
        return this.mFall;
    }
    IsShould(_member, _type) {
        if (_member == "mAutoDetrude" || _member == "mForceGravity" || _member == "mOneWayMap")
            return true;
        return super.IsShould(_member, _type);
    }
    GetMoveQue() { return this.mForceArr; }
    GetMoveQueGravity() {
        for (let each1 of this.mForceArr)
            if (each1.mKey == CPhysics.GravityKey)
                return each1;
        return null;
    }
    Start() {
        this.mStartPos = this.GetOwner().GetPos().Export();
    }
    Update(_delay) {
        if (this.mGravity) {
            if (this.mForceGravity == null) {
                this.mForceGravity = new CForce("g");
                this.mForceGravity.SetDirVel(CPhysics.GravityDir, CPhysics.GravityPow, CPhysics.GravityDir, CPhysics.GravityMaxPow);
                this.mForceGravity.SetDelay(1200);
                this.Remove("g");
                this.Push(this.mForceGravity);
            }
        }
        this.mMoveDir.Zero();
        if (this.mForceArr.length > 0) {
            for (var i = 0; i < this.mForceArr.length; ++i) {
                if (this.mGravity && CMath.V3Dot(CMath.V3Nor(CPhysics.GravityDir), this.mForceArr[i].mDirection) < 0) {
                    this.mJump = true;
                    this.mElevator = null;
                    this.mElevatorPos = null;
                }
                CMath.V3AddV3(this.mMoveDir, this.mForceArr[i].Cac(_delay), this.mMoveDir);
                if (this.mForceArr[i].IsRemove()) {
                    this.mForceArr.splice(i, 1);
                    i--;
                }
            }
            if (this.mMoveDir.IsZero() == false) {
                CMath.V3AddV3(this.mMoveDir, this.GetOwner().GetPos(), this.GetOwner().mPos);
                this.GetOwner().PRSReset(false);
                let len = CMath.V3Len(this.mMoveDir);
                if (len < CPhysics.GravityPow * 0.05)
                    this.mMoveDir.Zero();
            }
        }
        if (this.mStopover != null) {
            if (this.mStopover.m_delay == 0) {
                let so = this.mStopover;
                so.mPos.unshift(this.GetOwner().mPos.Export());
                let sumLen = 0;
                let bPos = so.mPos[0];
                for (let i = 1; i < so.mPos.length; ++i) {
                    if (bPos.Equals(so.mPos[i])) {
                        so.mPos.splice(i, 1);
                        --i;
                    }
                    let len = CMath.V3Distance(so.mPos[i], bPos);
                    bPos = so.mPos[i];
                    sumLen += len;
                }
                so.m_delay += (sumLen / so.m_velocity) * 1000;
            }
            this.mStopover.m_time += _delay;
            var t = 0;
            if (this.mStopover.m_time > this.mStopover.m_delay)
                t = 1;
            else
                t = (this.mStopover.m_time + _delay) / this.mStopover.m_delay;
            let pos = null;
            if (this.mStopover.m_bezier)
                pos = CUtilMath.Bezier(this.mStopover.mPos, t, 0, 0);
            else
                pos = CUtilMath.WeightVec3(this.mStopover.mPos, t);
            let dir = CMath.V3SubV3(pos, this.GetOwner().GetPos());
            if (CMath.V3Len(dir) <= (_delay * 0.001) * this.mStopover.m_velocity) {
                this.Remove("path");
                this.GetOwner().SetPos(pos, true, false);
            }
            else {
                this.Push(new CForce("path", CMath.V3Nor(dir), this.mStopover.m_velocity));
                this.mStopover.m_delay += _delay;
            }
            if (this.mStopover.m_time > this.mStopover.m_delay) {
                this.mStopover = null;
                this.Remove("path");
            }
        }
        if (this.mForceGravity != null) {
            if (this.mForceGravity.mVelocity > CPhysics.GravityAcc * 0.15) {
                this.mFall = true;
            }
            else
                this.mFall = false;
        }
        if (this.mFreezePos[0])
            this.GetOwner().mPos.x = this.mStartPos.x;
        if (this.mFreezePos[1])
            this.GetOwner().mPos.y = this.mStartPos.y;
        if (this.mFreezePos[2])
            this.GetOwner().mPos.z = this.mStartPos.z;
        if (this.mOneWayMap.size > 0) {
            for (let [key, value] of this.mOneWayMap.entries()) {
                if (value - 1 == 0)
                    this.mOneWayMap.delete(key);
                else
                    this.mOneWayMap.set(key, 1);
            }
        }
    }
    deltacount = 0;
    Push(move, duplication = false) {
        if (move == null)
            return;
        if (move instanceof Array) {
            for (var i = 0; i < move.length; ++i) {
                this.Push(move[i]);
            }
        }
        else if (move instanceof CForce) {
            this.PatchExe("mForceArr");
            if (duplication == false) {
                for (var i = 0; i < this.mForceArr.length; ++i) {
                    if (this.mForceArr[i].mKey == move.mKey) {
                        this.mForceArr[i].Import(move);
                        return;
                    }
                }
            }
            this.mForceArr.push(move);
        }
        else {
            this.mStopover = move;
            for (let i = 0; i < this.mForceArr.length; ++i) {
                if (this.mForceArr[i].mKey == "path") {
                    this.mForceArr.splice(i, 1);
                    break;
                }
            }
        }
    }
    Remove(_key) {
        this.PatchExe("mForceArr");
        for (var i = 0; i < this.mForceArr.length; ++i) {
            if (this.mForceArr[i].mKey == (_key + "")) {
                this.mForceArr.splice(i, 1);
                break;
            }
        }
    }
    IsEmpty(_key) {
        for (var i = 0; i < this.mForceArr.length; ++i) {
            if (this.mForceArr[i].mKey == _key) {
                return false;
            }
        }
        return true;
    }
    Clear() {
        this.PatchExe("mForceArr");
        this.mForceArr = new Array();
        this.mStopover = null;
    }
    MoveDir(_key = null) {
        if (_key == null)
            return this.mMoveDir;
        var rVal = new CVec3();
        for (var i = 0; i < this.mForceArr.length; ++i) {
            if (this.mForceArr[i].mKey == _key || _key == null) {
                var dirPower = CMath.V3MulFloat(this.mForceArr[i].mDirection, this.mForceArr[i].mVelocity);
                rVal = CMath.V3AddV3(rVal, dirPower);
                break;
            }
        }
        if (rVal.x == 0 && rVal.y == 0 && rVal.z == 0) {
        }
        else {
            rVal = rVal;
        }
        return rVal;
    }
    ResetGravity() {
        if (this.mForceGravity != null) {
            this.mForceGravity.mTime = 0;
        }
    }
    Collision(_org, _size, _tar, _push) {
    }
    Jump(_power) {
    }
    Move(_dir, _power) {
    }
    Ground(_co) {
    }
    ImportCJSON(_json) {
        this.Remove("g");
        return super.ImportCJSON(_json);
    }
    PatchStreamUpdate(_stream, _path) {
        if (this.IsPatchUpdate("mForceArr"))
            this.GetOwner().PatchStreamWrite(_stream, CString.PathArrToFullPath(_path, -1), "mPos");
        super.PatchStreamUpdate(_stream, _path);
    }
    PatchTrackDefault() {
        this.PatchTrack("mForceArr");
    }
}
import CRigidBody_imple from "../../canvas_imple/component/CRigidBody.js";
CRigidBody_imple();
