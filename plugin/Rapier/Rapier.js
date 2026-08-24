import { CCollider } from "../../artgine/app/component/CCollider.js";
import { CComponent } from "../../artgine/app/component/CComponent.js";
import { CRigidBody } from "../../artgine/app/component/CRigidBody.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CArray } from "../../artgine/basic/CArray.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import RAPIER from './rapier.mjs';
var gWorld;
var gEventQut;
var gColliderMap = new Map();
export class CRapierCollider extends CCollider {
    constructor(_paint, _rb = null) {
        super(null);
        this.mRestitutionInit = null;
        this.mEvent = null;
        this.mRB = _rb;
        if (_paint instanceof CBound)
            this.mBound.Import(_paint);
        else
            this.mPaintLoad = _paint;
        this.mSysc = CComponent.eSysn.RigidBody;
    }
    SetFrictionCombineRule(_role) {
        this.mCL.setFrictionCombineRule(_role);
    }
    SetRestitutionCombineRule(_role) {
        this.mCL.setRestitutionCombineRule(_role);
    }
    SetRestitution(_value = 1) {
        if (this.mCL == null) {
            this.mRestitutionInit = _value;
            return;
        }
        this.mCL.setRestitution(_value);
    }
    SetFriction(_value) {
        if (this.mCL == null) {
            this.mFrictionInit = _value;
            return;
        }
        this.mCL.setFriction(_value);
    }
    SetDensity(_value) {
        if (this.mCL == null) {
            this.mDensity = _value;
            return;
        }
        this.mCL.setDensity(_value);
    }
    SetEvent(_event) {
        if (this.mCL == null) {
            this.mEvent = _event;
            return;
        }
        this.mCL.setSensor(true);
        if (_event == CCollider.eEvent.Trigger) {
            this.mCL.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        }
        else if (_event == CCollider.eEvent.Collision) {
            this.mCL.setSensor(false);
            this.mCL.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS);
            this.mCL.setContactForceEventThreshold(0.0);
        }
    }
    mCL;
    mDensity = null;
    mColTargetSwap = new CArray();
    mColPushSwap = new CArray();
    mRestitutionInit = null;
    mFrictionInit = null;
    SetOwner(_obj) {
        this.mOwner = _obj;
    }
    StartChk() {
        if (this.mStartChk == true) {
            this.mStartChk = false;
            return true;
        }
        return false;
    }
    InitBound(_bound) {
        if (this.GetOwner() == null)
            return;
        if (this.mRB == null) {
            if (this.GetOwner() == null)
                return;
            this.mRB = this.GetOwner().FindComp(CRapierRigidBody);
            if (this.mRB == null)
                return;
        }
        let rb = this.mRB;
        if (_bound instanceof CPaint) {
            if (_bound instanceof CPaint2D) {
                if (_bound.GetSize() == null)
                    _bound.SizeCac();
                if (_bound.GetSize() == null) {
                    this.mPaintLoad = _bound;
                    return;
                }
            }
            if (_bound.GetBound().GetType() == CBound.eType.Null) {
                this.mPaintLoad = _bound;
                return;
            }
            let mat = this.GetOwner().GetMat().Export();
            mat.mF32A[3] = 0;
            mat.mF32A[7] = 0;
            mat.mF32A[11] = 0;
            this.mBound.InitBound(CMath.V3MulMatCoordi(_bound.GetBound().mMin, mat));
            this.mBound.InitBound(CMath.V3MulMatCoordi(_bound.GetBound().mMax, mat));
        }
        let size = this.mBound.GetSize();
        let cub = RAPIER.ColliderDesc.cuboid(size.x * 0.5, size.y * 0.5, size.z * 0.5);
        this.mCL = gWorld.createCollider(cub, rb.mRB);
        gColliderMap.set(this.mCL, this);
        this.mPaintLoad = null;
        const { bits } = CRapier.ResolveGroups(this.mLayer, this.mCollision);
        this.mCL.setCollisionGroups(bits);
        if (this.mEvent != null) {
            this.SetEvent(this.mEvent);
            this.mEvent = null;
        }
        if (this.mRestitutionInit != null) {
            this.SetRestitution(this.mRestitutionInit);
            this.mRestitutionInit = null;
        }
        if (this.mFrictionInit != null) {
            this.SetFriction(this.mFrictionInit);
            this.mFrictionInit = null;
        }
        if (this.mDensity != null) {
            this.SetDensity(this.mDensity);
            this.mDensity = null;
        }
    }
    Update(_update) {
        if (this.mPaintLoad != null || this.mCL == null) {
            if (this.GetOwner() == null)
                return;
            this.InitBound(this.mPaintLoad);
            if (this.mPaintLoad != null)
                return;
        }
        if (this.mEvent != CCollider.eEvent.None && this.mColTarget.Size() != 0) {
            let ctd = this.mColTargetSwap;
            let cpd = this.mColPushSwap;
            this.mColTargetSwap = this.mColTarget;
            this.mColPushSwap = this.mColPush;
            this.mColTarget = ctd;
            this.mColPush = cpd;
            this.mColTarget.Clear();
            this.mColPush.Clear();
            let msg;
            if (this.mEvent == CCollider.eEvent.Trigger)
                msg = this.GetOwner().NewInMsg("Trigger");
            else
                msg = this.GetOwner().NewInMsg("Collision");
            msg.mMsgData[0] = this;
            msg.mMsgData[1] = this.mColTargetSwap.Size();
            msg.mMsgData[2] = this.mColTargetSwap.mArray;
            msg.mMsgData[3] = this.mColPushSwap.mArray;
        }
    }
    Destroy() {
        super.Destroy();
        gColliderMap.delete(this.mCL);
        if (this.mCL) {
            gWorld.removeCollider(this.mCL, true);
            this.mCL = null;
        }
    }
    EditHTMLInit(_div, _pointer) {
        _div.innerHTML = "Not Support";
    }
}
export class CRapierRigidBody extends CRigidBody {
    constructor(_dynamic = true) {
        super();
        if (_dynamic)
            this.mRB = gWorld.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0));
        else
            this.mRB = gWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0));
        this.mRB.setGravityScale(0, true);
    }
    mUpdate = CUpdate.eType.Updated;
    mRB;
    mCenter = new CVec3();
    mLateImpulse = null;
    Start() {
        const wMat = this.GetOwner().GetMat();
        const wPos = CMath.V3MulMatCoordi(new CVec3(0, 0, 0), wMat);
        const wRot = CMath.MatDecomposeRot(wMat);
        this.mRB.setTranslation({ x: wPos.x + this.mCenter.x, y: wPos.y + this.mCenter.y, z: wPos.z + this.mCenter.z }, true);
        this.mRB.setRotation({ x: wRot.x, y: wRot.y, z: wRot.z, w: wRot.w });
    }
    SetGravity(_scale) {
        this.mRB.setGravityScale(_scale, true);
    }
    SetFreezePos(_x, _y, _z) {
        this.mRB.setEnabledTranslations(!_x, !_y, !_z, true);
    }
    SetFreezeRot(_x, _y, _z) {
        this.mRB.setEnabledRotations(!_x, !_y, !_z, true);
    }
    Update(_update) {
        if (this.mLateImpulse != null) {
            if (this.mRB.mass() != 0) {
                this.mRB.applyImpulse(this.mLateImpulse, true);
                this.mLateImpulse = null;
            }
        }
        if (this.GetOwner().mUpdateMat != 0 && this.mUpdate == CUpdate.eType.Not) {
            let wMat = this.GetOwner().GetMat();
            const wPos = CMath.V3MulMatCoordi(new CVec3(0, 0, 0), wMat);
            this.mRB.setTranslation({ x: wPos.x + this.mCenter.x, y: wPos.y + this.mCenter.y, z: wPos.z + this.mCenter.z }, true);
        }
        this.mUpdate = CUpdate.eType.Not;
        if (this.mRB.isSleeping() == false) {
            let pos = this.mRB.translation();
            const q = this.mRB.rotation();
            this.GetOwner().SetPos(CVec3.Vec3(pos.x - this.mCenter.x, pos.y - this.mCenter.y, pos.z - this.mCenter.z));
            this.GetOwner().SetRot(CVec4.Vec4(q.x, q.y, q.z, q.w));
            this.mUpdate = CUpdate.eType.Updated;
        }
    }
    Impulse(_value) {
        if (this.mRB.mass() == 0) {
            this.mLateImpulse = _value;
            return;
        }
        this.mRB.applyImpulse(_value, true);
    }
    Linvel(_value) {
        if (this.mRB != null)
            this.mRB.setLinvel(_value, true);
    }
    Clear() {
        if (this.mRB != null) {
            this.mRB.setLinvel({ x: 0, y: 0, z: 0 }, true);
            this.mRB.setAngvel({ x: 0, y: 0, z: 0 }, true);
            this.mRB.resetForces(true);
            this.mRB.resetTorques(true);
            this.mRB.sleep();
        }
    }
    WakeUp() {
        this.mRB.wakeUp();
    }
    Push(move, duplication) {
        CAlert.E("Not Support!");
    }
    Destroy() {
        super.Destroy();
        if (this.mRB) {
            gWorld.removeRigidBody(this.mRB);
            this.mRB = null;
            return;
        }
    }
    EditHTMLInit(_div, _pointer) {
        _div.innerHTML = "Not Support";
    }
}
export class CRapier extends CComponent {
    static eCombineRule = {
        Min: RAPIER.CoefficientCombineRule.Min,
        Max: RAPIER.CoefficientCombineRule.Max,
        Average: RAPIER.CoefficientCombineRule.Average,
        Multiply: RAPIER.CoefficientCombineRule.Multiply,
    };
    static async Init() {
        await RAPIER.init();
        const gravity = { x: 0, y: -9.8, z: 0 };
        gWorld = new RAPIER.World(gravity);
        gEventQut = new RAPIER.EventQueue(true);
    }
    static Update(_delay) {
        gWorld.step(gEventQut);
        gEventQut.drainCollisionEvents((h1, h2, started) => {
            if (!started)
                return;
            const a = gColliderMap.get(gWorld.getCollider(h1));
            const b = gColliderMap.get(gWorld.getCollider(h2));
            if (a == null || b == null)
                return;
            a.mColTarget.Push(b);
        });
        gEventQut.drainContactForceEvents((e) => {
            const ca = gWorld.getCollider(e.collider1());
            const cb = gWorld.getCollider(e.collider2());
            const a = gColliderMap.get(ca);
            const b = gColliderMap.get(cb);
            if (a == null || b == null)
                return;
            let dir = e.totalForce ? e.totalForce() : e.maxForceDirection();
            let mag = e.totalForceMagnitude ? e.totalForceMagnitude()
                : e.maxForceMagnitude();
            if (e.totalForce) {
                const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
                mag = len;
                dir = { x: dir.x / len, y: dir.y / len, z: dir.z / len };
            }
            const pair = gWorld.contactPair?.(ca, cb) ?? gWorld.narrowPhase?.contactPair?.(ca, cb);
            if (pair && pair.numContactManifolds) {
                const m = pair.contactManifold(0);
                if (m) {
                    const n = m.normal();
                    const dot = dir.x * n.x + dir.y * n.y + dir.z * n.z;
                    if (dot < 0)
                        dir = { x: -dir.x, y: -dir.y, z: -dir.z };
                }
            }
            a.mColTarget.Push(b);
            b.mColTarget.Push(a);
            a.mColPush.Push(new CVec3(-dir.x * mag, -dir.y * mag, -dir.z * mag));
            b.mColPush.Push(new CVec3(dir.x * mag, dir.y * mag, dir.z * mag));
        });
    }
    static PushCuboid(px, py, pz, hx, hy, hz) {
        const rb = gWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(px, py, pz));
        const cd = RAPIER.ColliderDesc.cuboid(hx, hy, hz);
        cd.setRestitution(1);
        cd.setFriction(0);
        gWorld.createCollider(cd, rb);
    }
    static _layerBits = new Map();
    static _nextBit = 0;
    static GetLayerMask(name) {
        const key = name && name.length ? name : "Default";
        let bit = this._layerBits.get(key);
        if (bit == null) {
            if (this._nextBit >= 16) {
                console.warn(`[CRapier] 레이어는 최대 16개까지 권장됩니다. '${key}'를 'Default(1<<0)'로 대체합니다.`);
                bit = 1 << 0;
            }
            else {
                bit = 1 << this._nextBit++;
                this._layerBits.set(key, bit);
            }
        }
        return bit;
    }
    static GetFilterMask(set) {
        if (!set || set.size === 0)
            return 0xFFFF;
        let mask = 0;
        for (const name of set)
            mask |= this.GetLayerMask(name);
        return mask & 0xFFFF;
    }
    static MakeCollisionGroups(membershipMask, filterMask) {
        if (RAPIER.InteractionGroups?.get) {
            return RAPIER.InteractionGroups.get(membershipMask & 0xFFFF, filterMask & 0xFFFF);
        }
        return (((membershipMask & 0xFFFF) << 16) | (filterMask & 0xFFFF)) >>> 0;
    }
    static ResolveGroups(layerName, targets) {
        const membership = this.GetLayerMask(layerName);
        const filter = this.GetFilterMask(targets);
        const bits = this.MakeCollisionGroups(membership, filter);
        return { membership, filter, bits };
    }
}
CClass.Push(CRapier);
CClass.Push(CRapierCollider);
CClass.Push(CRapierRigidBody);
