import { CComponent } from "../component/CComponent.js";
import { CForce } from "./CForce.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CPhysics } from "../component/CPhysics.js";
import { CString } from "../../basic/CString.js";
var yPath = true;
export class CRigidBody extends CComponent {
    mForceArr = new Array();
    mForceGravity = null;
    mStopover = null;
    mGravity = 0;
    mFall = false;
    mJump = false;
    mMoveDir = new CVec3();
    mPosUpdate = true;
    mFreezePos = new Array(false, false, false);
    mStartPos = null;
    Icon() { return "bi bi-person-walking"; }
    SetGravity(_scale) { this.mGravity = _scale; }
    GetGravity() { return this.mGravity; }
    constructor() {
        super();
        this.mSysc = CComponent.eSysn.Wind;
    }
    Start() {
        this.mStartPos = this.GetOwner().GetPos().Export();
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
        if (_member == "mForceGravity")
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
    Update(_delay) {
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
                if (this.mForceArr[i] == this.mForceGravity)
                    this.mForceGravity = null;
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
        this.mForceGravity = null;
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
