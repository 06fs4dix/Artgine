import { CObject } from "../basic/CObject.js";
import { CUpdate } from "../basic/Basic.js";
import { CMat } from "../geometry/CMat.js";
import { CMath } from "../geometry/CMath.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
export class CResolver extends CObject {
    m_source;
    m_target;
    m_invWorldMat = null;
    constructor(_tip, _tgt) {
        super();
        this.m_source = _tip;
        this.m_target = _tgt;
    }
    SolveIK() { }
    ApplyToBone(_bone, _pos, _sca, _rot) {
        if (_bone.mParent != null) {
            const wMat = CMath.MatMul(CMath.QutToMat(_rot), CMath.MatScale(_sca));
            wMat.SetV3(3, _pos);
            wMat.UnitCheck();
            _bone.mData.pst = wMat;
            const pMat = CMath.MatMul(wMat, CMath.MatInvert(_bone.mParent.mData.pst));
            _bone.mData.pos.Import(pMat.xyz);
            _bone.mData.sca.Import(CMath.MatDecomposeSca(pMat));
            _bone.mData.rot.Import(CMath.MatDecomposeRot(pMat));
        }
        else {
            _bone.mData.pos.Import(_pos);
            _bone.mData.sca.Import(_sca);
            _bone.mData.rot.Import(_rot);
            _bone.mData.MatUpdate();
        }
    }
    ApplyToChild(_bone, _excludeBones = []) {
        if (!_bone)
            return;
        if (_bone.mParent && !_excludeBones.includes(_bone)) {
            _bone.mData.MatUpdate();
            _bone.mData.pst = CMath.MatMul(_bone.mData.pst, _bone.mParent.mData.pst);
        }
        if (_bone.mColleague)
            this.ApplyToChild(_bone.mColleague, _excludeBones);
        if (_bone.mChild)
            this.ApplyToChild(_bone.mChild, _excludeBones);
    }
}
export class CResolverAttach extends CResolver {
    m_offsetRot = new CVec4(0, 0, 0, 1);
    m_offsetPos = new CVec3(0, 0, 0);
    m_offsetSca = new CVec3(1, 1, 1);
    m_mixRot = 1;
    m_mixPos = new CVec3(1, 1, 1);
    m_mixSca = new CVec3(1, 1, 1);
    SolveIK() {
        if (!this.m_source || !this.m_target) {
            return;
        }
        const tMat = this.m_target.GetMat();
        const tPos = tMat.xyz;
        const tSca = CMath.MatDecomposeSca(tMat);
        const tRot = CMath.MatDecomposeRot(tMat);
        const sPos = this.m_source.mData.pst.xyz;
        const sSca = CMath.MatDecomposeSca(this.m_source.mData.pst);
        const sRot = CMath.MatDecomposeRot(this.m_source.mData.pst);
        CMath.V3AddV3(tPos, this.m_offsetPos, tPos);
        CMath.V3MulV3(tSca, this.m_offsetSca, tSca);
        CMath.QutMul(tRot, this.m_offsetRot, tRot);
        const mPos = new CVec3();
        mPos.x = CMath.FloatInterpolate(sPos.x, tPos.x, this.m_mixPos.x);
        mPos.y = CMath.FloatInterpolate(sPos.y, tPos.y, this.m_mixPos.y);
        mPos.z = CMath.FloatInterpolate(sPos.z, tPos.z, this.m_mixPos.z);
        const mSca = new CVec3();
        mSca.x = CMath.FloatInterpolate(sSca.x, tSca.x, this.m_mixSca.x);
        mSca.y = CMath.FloatInterpolate(sSca.y, tSca.y, this.m_mixSca.y);
        mSca.z = CMath.FloatInterpolate(sSca.z, tSca.z, this.m_mixSca.z);
        const mRot = CMath.QutInterpolate(sRot, tRot, this.m_mixRot);
        this.ApplyToBone(this.m_source, mPos, mSca, mRot);
        this.ApplyToChild(this.m_source, [this.m_source]);
    }
}
export class CResolverIKLook extends CResolver {
    m_dirOrigin;
    m_rotOrigin;
    SolveIK() {
        if (!this.m_source || !this.m_target) {
            return;
        }
        let tMat = this.m_target.GetMat();
        if (this.m_invWorldMat != null) {
            tMat = CMath.MatMul(tMat, this.m_invWorldMat);
        }
        const tPos = tMat.xyz;
        const sPos = this.m_source.mData.pst.xyz;
        const curDir = CMath.V3SubV3(tPos, sPos);
        if (!this.m_dirOrigin || !this.m_rotOrigin) {
            this.m_dirOrigin = CMath.V3Nor(curDir);
            this.m_rotOrigin = CMath.MatDecomposeRot(this.m_source.mData.pst);
        }
        const rot = CMath.QutMul(this.m_rotOrigin, CMath.FromToRotation(this.m_dirOrigin, curDir));
        this.ApplyToBone(this.m_source, sPos, CMath.MatDecomposeSca(this.m_source.mData.pst), rot);
        this.ApplyToChild(this.m_source, [this.m_source]);
    }
}
export class CResolverIKFABR extends CResolver {
    m_pole;
    m_iteration = 10;
    m_tolerance = 0.05;
    m_mix = 1;
    m_targetPos;
    m_boneRotOrigin;
    m_boneDirOrigin;
    m_bonePosOrigin;
    m_boneLenTotal;
    m_boneLen;
    m_bones;
    m_bonePos;
    m_boneRot;
    constructor(_tip, _tgt, _numOfBones = 1) {
        super(_tip, _tgt);
        this.m_bones = new Array(_numOfBones);
        this.m_bonePos = new Array(_numOfBones);
        this.m_boneRot = new Array(_numOfBones);
        this.m_boneLen = new Array(_numOfBones);
        this.m_boneRotOrigin = new Array(_numOfBones);
        this.m_boneDirOrigin = new Array(_numOfBones);
        this.m_bonePosOrigin = new Array(_numOfBones);
    }
    SolveIK() {
        if (!this.m_source || !this.m_target) {
            return;
        }
        let tMat = this.m_target.GetMat();
        if (this.m_invWorldMat != null) {
            tMat = CMath.MatMul(tMat, this.m_invWorldMat);
        }
        if (!this.m_targetPos) {
            this.m_targetPos = tMat.xyz;
            this.m_boneLenTotal = 0;
            let previousBone = null;
            let currentBone = this.m_source;
            for (let i = this.m_bonePos.length - 1; i >= 0; i--) {
                this.m_bones[i] = currentBone;
                this.m_boneRotOrigin[i] = CMath.MatDecomposeRot(currentBone.mData.pst);
                if (i == this.m_bonePos.length - 1) {
                    this.m_boneDirOrigin[i] = CMath.V3SubV3(this.m_targetPos, currentBone.mData.pst.xyz);
                }
                else {
                    this.m_boneDirOrigin[i] = CMath.V3SubV3(previousBone.mData.pst.xyz, currentBone.mData.pst.xyz);
                    this.m_boneLen[i] = CMath.V3Len(this.m_boneDirOrigin[i]);
                    this.m_boneLenTotal += this.m_boneLen[i];
                }
                previousBone = currentBone;
                currentBone = currentBone.mParent;
            }
        }
        for (let i = 0; i < this.m_bones.length; i++) {
            this.m_bonePos[i] = this.m_bones[i].mData.pst.xyz;
            this.m_bonePosOrigin[i] = this.m_bones[i].mData.pst.xyz;
        }
        const tPos = tMat.xyz;
        let distToTarget = CMath.V3Distance(tPos, this.m_bonePos[0]);
        if (distToTarget >= this.m_boneLenTotal) {
            let dir = CMath.V3SubV3(tPos, this.m_bonePos[0]);
            CMath.V3Nor(dir, dir);
            for (let i = 1; i < this.m_bonePos.length; i++) {
                this.m_bonePos[i] = CMath.V3AddV3(this.m_bonePos[i - 1], CMath.V3MulFloat(dir, this.m_boneLen[i - 1]));
            }
        }
        else {
            distToTarget = CMath.V3Distance(this.m_bonePos[this.m_bonePos.length - 1], tPos);
            let count = 0;
            while (distToTarget > this.m_tolerance) {
                count++;
                if (count > this.m_iteration) {
                    break;
                }
                const sPos = this.m_bonePos[0];
                this.Backward(tPos);
                this.Forward(sPos);
            }
        }
        this.PoleConstraint();
        for (let i = 0; i < this.m_bonePos.length; i++) {
            this.m_bonePos[i] = CMath.V3Interpolate(this.m_bonePosOrigin[i], this.m_bonePos[i], this.m_mix);
        }
        for (let i = 0; i < this.m_bonePos.length - 1; i++) {
            const curDir = CMath.V3SubV3(this.m_bonePos[i + 1], this.m_bonePos[i]);
            const rotQut = CMath.FromToRotation(this.m_boneDirOrigin[i], curDir);
            this.m_boneRot[i] = CMath.QutMul(this.m_boneRotOrigin[i], rotQut);
        }
        const lastIndex = this.m_bonePos.length - 1;
        this.m_boneRot[lastIndex] = this.m_boneRotOrigin[lastIndex];
        for (let i = 0; i < this.m_bones.length; i++) {
            this.ApplyToBone(this.m_bones[i], this.m_bonePos[i], CMath.MatDecomposeSca(this.m_bones[i].mData.pst), this.m_boneRot[i]);
        }
        this.ApplyToChild(this.m_bones[0], this.m_bones);
    }
    Backward(_tPos) {
        for (let i = this.m_bonePos.length - 1; i >= 0; i--) {
            if (i == this.m_bonePos.length - 1) {
                this.m_bonePos[i] = _tPos;
            }
            else {
                let dir = CMath.V3SubV3(this.m_bonePos[i], this.m_bonePos[i + 1]);
                CMath.V3Nor(dir, dir);
                this.m_bonePos[i] = CMath.V3AddV3(this.m_bonePos[i + 1], CMath.V3MulFloat(dir, this.m_boneLen[i]));
            }
        }
    }
    Forward(_sPos) {
        for (let i = 0; i < this.m_bonePos.length; i++) {
            if (i == 0) {
                this.m_bonePos[i] = _sPos;
            }
            else {
                let dir = CMath.V3SubV3(this.m_bonePos[i], this.m_bonePos[i - 1]);
                CMath.V3Nor(dir, dir);
                this.m_bonePos[i] = CMath.V3AddV3(this.m_bonePos[i - 1], CMath.V3MulFloat(dir, this.m_boneLen[i - 1]));
            }
        }
    }
    PoleConstraint() {
        if (this.m_pole != null) {
            let pPos = this.m_pole.GetMat().xyz;
            for (let i = 1; i < this.m_bonePos.length - 1; i++) {
                let tipBone = this.m_bonePos[i + 1];
                let movBone = this.m_bonePos[i];
                let botBone = this.m_bonePos[i - 1];
                let planeNormal = CMath.V3Nor(CMath.V3SubV3(tipBone, botBone));
                let planeDistance = -CMath.V3Dot(planeNormal, botBone);
                let projPole = ClosestPointOnPlane(planeNormal, planeDistance, pPos);
                let projBone = ClosestPointOnPlane(planeNormal, planeDistance, movBone);
                let angle = CMath.V3SignedAngle(CMath.V3SubV3(projBone, botBone), CMath.V3SubV3(projPole, botBone), planeNormal);
                let newRot = CMath.QutAxisToRotation(planeNormal, angle);
                this.m_bonePos[i] = CMath.V3AddV3(CMath.V3MulMatCoordi(CMath.V3SubV3(movBone, botBone), CMath.QutToMat(newRot)), botBone);
            }
        }
    }
}
function ClosestPointOnPlane(_planeNor, _planeDist, _point) {
    let dis = CMath.V3Dot(_planeNor, _point) + _planeDist;
    return CMath.V3SubV3(_point, CMath.V3MulFloat(_planeNor, dis));
}
export class CSpringCollider extends CObject {
    mBone;
    mOffset;
    mRadius;
    mTail;
    mGroup;
    mWPos = new CVec3();
    mWTail = new CVec3();
    mWRadius = 0;
    constructor(_bone = "", _offset = new CVec3(), _radius = 1, _tail = null, _group = 0) {
        super();
        this.mBone = _bone;
        this.mOffset = _offset.Export();
        this.mRadius = _radius;
        this.mTail = _tail != null ? _tail.Export() : null;
        this.mGroup = _group;
    }
}
class CSpringJoint {
    mNode;
    mTailLocal = new CVec3();
    mCur = new CVec3();
    mPrev = new CVec3();
    mJCur = new CVec3();
    mJPrev = new CVec3();
    mJTarget = new CVec3();
}
export class CSpringChain extends CObject {
    mRoot;
    mStiffness;
    mDrag;
    mGravity;
    mGravityDir = new CVec3(0, -1, 0);
    mHitRadius;
    mMaxAngle;
    mCollision = true;
    mColliderGroup = new Array();
    mVRM = false;
    mJiggle = 0;
    mJiggleStiffness = 12;
    mJiggleDrag = 0.15;
    mJiggleStretch = 0;
    constructor(_root = "", _stiffness = 6, _drag = 0.15, _gravity = 0.5, _hitRadius = 0, _maxAngle = 0) {
        super();
        this.mRoot = _root;
        this.mStiffness = _stiffness;
        this.mDrag = _drag;
        this.mGravity = _gravity;
        this.mHitRadius = _hitRadius;
        this.mMaxAngle = _maxAngle;
    }
}
class CSpringRun {
    mChain;
    mJoint = new Array();
    mCollider = new Array();
    constructor(_chain) {
        this.mChain = _chain;
    }
}
const gSpTmpMat = new CMat();
const gSpRotMat = new CMat();
const gSpInvF = new CMat();
const gSpHeadM = new CVec3();
const gSpHeadW = new CVec3();
const gSpTailM = new CVec3();
const gSpTailW = new CVec3();
const gSpNext = new CVec3();
const gSpNextM = new CVec3();
const gSpVA = new CVec3();
const gSpVB = new CVec3();
export class CResolverSpring extends CResolver {
    m_chain = new Array();
    m_collider = new Array();
    m_worldMat = null;
    m_delay = 1 / 60;
    m_maxDelay = 1 / 30;
    m_unit = 39.37;
    m_run = new Array();
    m_buildTree = null;
    m_init = false;
    constructor() {
        super(null, null);
    }
    Rebuild() {
        this.m_buildTree = null;
    }
    Reset() {
        this.m_init = false;
    }
    BuildChain(_tree) {
        this.m_buildTree = _tree;
        this.m_init = false;
        this.m_run.length = 0;
        for (const chain of this.m_chain) {
            const start = _tree.Find(chain.mRoot);
            if (start == null || start.mParent == null)
                continue;
            const colliders = this.m_collider.filter((_c) => chain.mColliderGroup.length == 0 || chain.mColliderGroup.includes(_c.mGroup));
            const pending = [start];
            while (pending.length > 0) {
                let node = pending.shift();
                const run = new CSpringRun(chain);
                run.mCollider = colliders;
                while (node != null) {
                    const joint = new CSpringJoint();
                    joint.mNode = node;
                    run.mJoint.push(joint);
                    if (node.mChild != null) {
                        for (let sib = node.mChild.mColleague; sib != null; sib = sib.mColleague)
                            pending.push(sib);
                    }
                    node = node.mChild;
                }
                for (let i = 0; i < run.mJoint.length; i++) {
                    const joint = run.mJoint[i];
                    if (i + 1 < run.mJoint.length) {
                        joint.mTailLocal.Import(run.mJoint[i + 1].mNode.mData.pos);
                    }
                    else {
                        const pst = joint.mNode.mData.pst;
                        const ppst = joint.mNode.mParent.mData.pst;
                        gSpVA.x = pst.mF32A[12] - ppst.mF32A[12];
                        gSpVA.y = pst.mF32A[13] - ppst.mF32A[13];
                        gSpVA.z = pst.mF32A[14] - ppst.mF32A[14];
                        const plen = CMath.V3Len(gSpVA);
                        const ext = plen > 1e-6 ? 0.07 * this.m_unit / plen : 1;
                        gSpTailM.x = pst.mF32A[12] + gSpVA.x * ext;
                        gSpTailM.y = pst.mF32A[13] + gSpVA.y * ext;
                        gSpTailM.z = pst.mF32A[14] + gSpVA.z * ext;
                        CMath.MatInvert(pst, gSpTmpMat);
                        CMath.V3MulMatCoordi(gSpTailM, gSpTmpMat, joint.mTailLocal);
                    }
                }
                this.m_run.push(run);
            }
        }
    }
    SolveIK() {
        const tree = this.m_source;
        if (tree == null || this.m_worldMat == null)
            return;
        if (this.m_buildTree != tree)
            this.BuildChain(tree);
        const dt = Math.min(this.m_delay, this.m_maxDelay);
        const fMat = this.m_worldMat;
        CMath.MatInvert(fMat, gSpInvF);
        const fSca = Math.hypot(fMat.mF32A[0], fMat.mF32A[1], fMat.mF32A[2]);
        const unit = this.m_unit * fSca;
        for (const col of this.m_collider) {
            const node = tree.Find(col.mBone);
            if (node == null) {
                col.mWRadius = 0;
                continue;
            }
            CMath.V3MulMatCoordi(col.mOffset, node.mData.pst, gSpVA);
            CMath.V3MulMatCoordi(gSpVA, fMat, col.mWPos);
            if (col.mTail != null) {
                CMath.V3MulMatCoordi(col.mTail, node.mData.pst, gSpVA);
                CMath.V3MulMatCoordi(gSpVA, fMat, col.mWTail);
            }
            else
                col.mWTail.Import(col.mWPos);
            col.mWRadius = col.mRadius * fSca;
        }
        for (const run of this.m_run) {
            const chain = run.mChain;
            let parentPst = run.mJoint[0].mNode.mParent.mData.pst;
            for (let ji = 0; ji < run.mJoint.length; ji++) {
                const joint = run.mJoint[ji];
                const data = joint.mNode.mData;
                data.MatUpdate();
                CMath.MatMul(data.pst, parentPst, gSpTmpMat);
                data.pst.Import(gSpTmpMat);
                data.pst.UnitCheck();
                gSpHeadM.x = data.pst.mF32A[12];
                gSpHeadM.y = data.pst.mF32A[13];
                gSpHeadM.z = data.pst.mF32A[14];
                CMath.V3MulMatCoordi(joint.mTailLocal, data.pst, gSpTailM);
                CMath.V3MulMatCoordi(gSpHeadM, fMat, gSpHeadW);
                CMath.V3MulMatCoordi(gSpTailM, fMat, gSpTailW);
                if (ji == 0 && chain.mJiggle > 0)
                    this.Jiggle(joint, chain, data, dt, unit);
                const len = CMath.V3Distance(gSpHeadW, gSpTailW);
                if (this.m_init == false || len <= 0) {
                    joint.mCur.Import(gSpTailW);
                    joint.mPrev.Import(gSpTailW);
                }
                const keep = 1 - chain.mDrag;
                if (chain.mVRM) {
                    const push = len > 1e-6 ? chain.mStiffness * dt * unit / len : 0;
                    const grav = chain.mGravity * dt * unit;
                    gSpNext.x = joint.mCur.x + (joint.mCur.x - joint.mPrev.x) * keep + (gSpTailW.x - gSpHeadW.x) * push + chain.mGravityDir.x * grav;
                    gSpNext.y = joint.mCur.y + (joint.mCur.y - joint.mPrev.y) * keep + (gSpTailW.y - gSpHeadW.y) * push + chain.mGravityDir.y * grav;
                    gSpNext.z = joint.mCur.z + (joint.mCur.z - joint.mPrev.z) * keep + (gSpTailW.z - gSpHeadW.z) * push + chain.mGravityDir.z * grav;
                }
                else {
                    const pull = Math.min(1, chain.mStiffness * dt);
                    const grav = chain.mGravity * dt * len;
                    gSpNext.x = joint.mCur.x + (joint.mCur.x - joint.mPrev.x) * keep + (gSpTailW.x - joint.mCur.x) * pull + chain.mGravityDir.x * grav;
                    gSpNext.y = joint.mCur.y + (joint.mCur.y - joint.mPrev.y) * keep + (gSpTailW.y - joint.mCur.y) * pull + chain.mGravityDir.y * grav;
                    gSpNext.z = joint.mCur.z + (joint.mCur.z - joint.mPrev.z) * keep + (gSpTailW.z - joint.mCur.z) * pull + chain.mGravityDir.z * grav;
                }
                this.KeepLength(gSpHeadW, gSpNext, len);
                if (chain.mMaxAngle > 0)
                    this.LimitAngle(gSpHeadW, gSpTailW, gSpNext, len, chain.mMaxAngle * Math.PI / 180);
                if (chain.mCollision) {
                    for (const col of run.mCollider) {
                        const r = col.mWRadius + chain.mHitRadius * fSca;
                        if (r <= 0)
                            continue;
                        CMath.V3SubV3(col.mWTail, col.mWPos, gSpVB);
                        const segLen2 = CMath.V3Dot(gSpVB, gSpVB);
                        let t = 0;
                        if (segLen2 > 1e-8) {
                            CMath.V3SubV3(gSpNext, col.mWPos, gSpVA);
                            t = Math.max(0, Math.min(1, CMath.V3Dot(gSpVA, gSpVB) / segLen2));
                        }
                        const cx = col.mWPos.x + gSpVB.x * t, cy = col.mWPos.y + gSpVB.y * t, cz = col.mWPos.z + gSpVB.z * t;
                        gSpVA.x = gSpNext.x - cx;
                        gSpVA.y = gSpNext.y - cy;
                        gSpVA.z = gSpNext.z - cz;
                        const d = CMath.V3Len(gSpVA);
                        if (d >= r || d <= 1e-6)
                            continue;
                        const s = r / d;
                        gSpNext.x = cx + gSpVA.x * s;
                        gSpNext.y = cy + gSpVA.y * s;
                        gSpNext.z = cz + gSpVA.z * s;
                        this.KeepLength(gSpHeadW, gSpNext, len);
                    }
                }
                joint.mPrev.Import(joint.mCur);
                joint.mCur.Import(gSpNext);
                CMath.V3MulMatCoordi(gSpNext, gSpInvF, gSpNextM);
                CMath.V3SubV3(gSpTailM, gSpHeadM, gSpVA);
                CMath.V3SubV3(gSpNextM, gSpHeadM, gSpVB);
                const la = CMath.V3Len(gSpVA), lb = CMath.V3Len(gSpVB);
                if (la > 1e-6 && lb > 1e-6 && CMath.V3Dot(gSpVA, gSpVB) / (la * lb) < 0.999999) {
                    CMath.QutToMat(CMath.FromToRotation(gSpVA, gSpVB), gSpRotMat);
                    gSpTmpMat.Import(data.pst);
                    gSpTmpMat.mF32A[12] = 0;
                    gSpTmpMat.mF32A[13] = 0;
                    gSpTmpMat.mF32A[14] = 0;
                    gSpTmpMat.UnitCheck();
                    CMath.MatMul(gSpTmpMat, gSpRotMat, data.pst);
                    data.pst.mF32A[12] = gSpHeadM.x;
                    data.pst.mF32A[13] = gSpHeadM.y;
                    data.pst.mF32A[14] = gSpHeadM.z;
                    data.pst.UnitCheck();
                }
                data.updateMat = CUpdate.eType.Updated;
                parentPst = data.pst;
            }
        }
        this.m_init = true;
    }
    Jiggle(_joint, _chain, _data, _dt, _unit) {
        if (this.m_init == false) {
            _joint.mJCur.Import(gSpHeadW);
            _joint.mJPrev.Import(gSpHeadW);
            _joint.mJTarget.Import(gSpHeadW);
        }
        const keep = 1 - _chain.mJiggleDrag;
        const pull = Math.min(1, _chain.mJiggleStiffness * _dt);
        const cur = _joint.mJCur, prev = _joint.mJPrev, tgt = _joint.mJTarget;
        gSpNext.x = cur.x + ((cur.x - prev.x) - (gSpHeadW.x - tgt.x)) * keep + (gSpHeadW.x - tgt.x);
        gSpNext.y = cur.y + ((cur.y - prev.y) - (gSpHeadW.y - tgt.y)) * keep + (gSpHeadW.y - tgt.y);
        gSpNext.z = cur.z + ((cur.z - prev.z) - (gSpHeadW.z - tgt.z)) * keep + (gSpHeadW.z - tgt.z);
        gSpNext.x += (gSpHeadW.x - gSpNext.x) * pull;
        gSpNext.y += (gSpHeadW.y - gSpNext.y) * pull;
        gSpNext.z += (gSpHeadW.z - gSpNext.z) * pull;
        CMath.V3SubV3(gSpNext, gSpHeadW, gSpVA);
        const d = CMath.V3Len(gSpVA);
        const maxD = _chain.mJiggle * _unit;
        if (d > maxD && d > 1e-6) {
            const s = maxD / d;
            gSpVA.x *= s;
            gSpVA.y *= s;
            gSpVA.z *= s;
            CMath.V3AddV3(gSpHeadW, gSpVA, gSpNext);
        }
        prev.Import(cur);
        cur.Import(gSpNext);
        tgt.Import(gSpHeadW);
        CMath.V3MulMatNormal(gSpVA, gSpInvF, gSpVB);
        _data.pst.mF32A[12] += gSpVB.x;
        _data.pst.mF32A[13] += gSpVB.y;
        _data.pst.mF32A[14] += gSpVB.z;
        const lb = CMath.V3Len(gSpVB);
        if (_chain.mJiggleStretch > 0 && lb > 1e-6 && maxD > 0) {
            const k = 1 + _chain.mJiggleStretch * Math.min(1, d / maxD);
            const side = 1 / Math.sqrt(k);
            const ux = gSpVB.x / lb, uy = gSpVB.y / lb, uz = gSpVB.z / lb;
            const m = _data.pst.mF32A;
            for (let r = 0; r < 12; r += 4) {
                const dot = (m[r] * ux + m[r + 1] * uy + m[r + 2] * uz) * (k - side);
                m[r] = m[r] * side + dot * ux;
                m[r + 1] = m[r + 1] * side + dot * uy;
                m[r + 2] = m[r + 2] * side + dot * uz;
            }
        }
        _data.pst.UnitCheck();
        CMath.V3AddV3(gSpHeadM, gSpVB, gSpHeadM);
        CMath.V3AddV3(gSpHeadW, gSpVA, gSpHeadW);
        CMath.V3MulMatCoordi(_joint.mTailLocal, _data.pst, gSpTailM);
        CMath.V3MulMatCoordi(gSpTailM, this.m_worldMat, gSpTailW);
    }
    LimitAngle(_head, _rest, _tail, _len, _max) {
        CMath.V3SubV3(_rest, _head, gSpVA);
        CMath.V3SubV3(_tail, _head, gSpVB);
        const la = CMath.V3Len(gSpVA), lb = CMath.V3Len(gSpVB);
        if (la <= 1e-6 || lb <= 1e-6)
            return;
        const cos = Math.max(-1, Math.min(1, CMath.V3Dot(gSpVA, gSpVB) / (la * lb)));
        const ang = Math.acos(cos);
        if (ang <= _max)
            return;
        const sinAng = Math.sin(ang);
        if (sinAng <= 1e-6) {
            _tail.x = _head.x + gSpVA.x / la * _len;
            _tail.y = _head.y + gSpVA.y / la * _len;
            _tail.z = _head.z + gSpVA.z / la * _len;
            return;
        }
        const wa = Math.sin(ang - _max) / sinAng / la;
        const wb = Math.sin(_max) / sinAng / lb;
        _tail.x = _head.x + (gSpVA.x * wa + gSpVB.x * wb) * _len;
        _tail.y = _head.y + (gSpVA.y * wa + gSpVB.y * wb) * _len;
        _tail.z = _head.z + (gSpVA.z * wa + gSpVB.z * wb) * _len;
    }
    KeepLength(_head, _tail, _len) {
        CMath.V3SubV3(_tail, _head, gSpVA);
        const d = CMath.V3Len(gSpVA);
        if (d <= 1e-6)
            return;
        const s = _len / d;
        _tail.x = _head.x + gSpVA.x * s;
        _tail.y = _head.y + gSpVA.y * s;
        _tail.z = _head.z + gSpVA.z * s;
    }
}
