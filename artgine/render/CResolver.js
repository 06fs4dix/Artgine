import { CObject } from "../basic/CObject.js";
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
