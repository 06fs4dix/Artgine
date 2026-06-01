import { CComponent } from "../component/CComponent.js";
import { CForce } from "./CForce.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CMath } from "../../geometry/CMath.js";
import { CPhysics } from "../component/CPhysics.js";
import { CObject } from "../../basic/CObject.js";
import { CGeometryComp } from "./CGeometryComp.js";
var yPath = true;
export class CRigidBody extends CGeometryComp {
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
    mLastDir = CVec3.eDir.Null;
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
    Provider(_type, _state) {
        for (let f of this.mForceArr) {
            _state.push("/rigidBody/force/" + f.Key());
            if (f.Key() == "g")
                continue;
            let dirDot = [0, 0, 0, 0, 0, 0];
            dirDot[CVec3.eDir.Up] = CMath.V3Dot(CVec3.Up(), f.mDirection);
            dirDot[CVec3.eDir.Down] = CMath.V3Dot(CVec3.Down(), f.mDirection);
            dirDot[CVec3.eDir.Left] = CMath.V3Dot(CVec3.Left(), f.mDirection);
            dirDot[CVec3.eDir.Right] = CMath.V3Dot(CVec3.Right(), f.mDirection);
            dirDot[CVec3.eDir.Front] = CMath.V3Dot(CVec3.Front(), f.mDirection);
            dirDot[CVec3.eDir.Back] = CMath.V3Dot(CVec3.Back(), f.mDirection);
            let select = -1;
            let selectMax = 0;
            for (let i = 0; i < 6; ++i) {
                if (dirDot[i] > selectMax) {
                    selectMax = dirDot[i];
                    select = i;
                }
            }
            if (select != -1)
                this.mLastDir = select;
            _state.push("/rigidBody/force/" + f.mKey + select);
        }
        _state.push("/rigidBody/force/" + this.mLastDir);
        if (this.IsJump())
            _state.push("/rigidBody/force/Jump");
        if (this.IsFall())
            _state.push("/rigidBody/force/Fall");
    }
    IsShould(_member, _type) {
        if (_type == CObject.eShould.Watch) {
            if (_member == "mForceArr")
                return true;
            else
                return false;
        }
        if (_member == "mForceGravity")
            return true;
        if (_member == "mLastDir")
            return false;
        return super.IsShould(_member, _type);
    }
    Update(_update) {
        if (this.GetGI() != null)
            this.GetGI().mFixedComp.Push(this);
    }
    GetForceArr() { return this.mForceArr; }
    GetForceArrGravity() {
        for (let each1 of this.mForceArr)
            if (each1.mKey == CPhysics.GravityKey)
                return each1;
        return null;
    }
    Fixed(_update) {
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
            if (duplication == false) {
                for (var i = 0; i < this.mForceArr.length; ++i) {
                    if (this.mForceArr[i].mKey == move.mKey) {
                        this.mForceArr[i].Import(move);
                        return this.mForceArr[i];
                    }
                }
            }
            this.mForceArr.push(move);
        }
        else {
            this.mStopover = move;
            for (let i = 0; i < this.mForceArr.length; ++i) {
                if (this.mForceArr[i].mKey == this.mStopover.mKey) {
                    this.mForceArr.splice(i, 1);
                    i--;
                }
            }
        }
        return move;
    }
    Remove(_key) {
        for (var i = 0; i < this.mForceArr.length; ++i) {
            if (this.mForceArr[i].mKey == (_key + "")) {
                if (this.mForceArr[i] == this.mForceGravity)
                    this.mForceGravity = null;
                this.mForceArr.splice(i, 1);
                break;
            }
        }
    }
    Find(_key) {
        for (var i = 0; i < this.mForceArr.length; ++i) {
            if (this.mForceArr[i].mKey == _key) {
                return this.mForceArr[i];
            }
        }
        return null;
    }
    Clear() {
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
}
import CRigidBody_imple from "../../app_imple/component/CRigidBody.js";
CRigidBody_imple();
