import { CTree } from "../../basic/CTree.js";
import { CMath } from "../../geometry/CMath.js";
import { CMeshCopyNode } from "../../render/CMeshCopyNode.js";
import { CResolverAttach, CResolverIKFABR, CResolverIKLook } from "../../render/CResolver.js";
import { CComponent } from "./CComponent.js";
import { CPaint3D } from "./paint/CPaint3D.js";
class CResolverComp extends CComponent {
    m_paintOff;
    m_bone;
    m_target;
    m_resolver;
    m_p3d;
    m_sourceBone;
    m_targetBone;
    constructor(_bone, _target) {
        super();
        this.m_paintOff = 0;
        this.m_bone = _bone;
        this.m_target = _target;
        this.mSysc = CComponent.eSysn.IK;
    }
    SetTarget(_target) {
        this.m_resolver.m_target = _target;
    }
    Update(_delay) {
        super.Update(_delay);
        const ptVec = this.mOwner.FindComps(CPaint3D);
        if (ptVec.length == 0 || ptVec.length <= this.m_paintOff)
            return;
        this.m_p3d = ptVec[this.m_paintOff];
        const tree = this.m_p3d.GetTree();
        if (tree == null)
            return;
        this.m_sourceBone = tree.Find(this.m_bone);
        if (this.m_sourceBone == null)
            return;
        this.m_resolver.m_source = this.m_sourceBone;
        this.m_resolver.m_invWorldMat = CMath.MatInvert(this.m_p3d.GetFMat());
        this.m_resolver.m_target = this.m_target;
        this.m_resolver.SolveIK();
    }
}
export class CAttacher extends CResolverComp {
    m_resolver = undefined;
    m_targetTemp;
    m_sourceTemp;
    constructor(_bone, _target) {
        super(_bone, _target);
        this.m_resolver = new CResolverAttach(null, null);
        this.m_sourceTemp = new CTree();
        this.m_sourceTemp.mData = new CMeshCopyNode();
        this.m_targetTemp = new CTree();
        this.m_targetTemp.mData = new CMeshCopyNode();
    }
    Update(_delay) {
        const ptVec = this.GetOwner().FindComps(CPaint3D);
        if (ptVec.length == 0 || ptVec.length <= this.m_paintOff)
            return;
        this.m_p3d = ptVec[this.m_paintOff];
        const stree = this.m_p3d.GetTree();
        if (stree == null)
            return;
        this.m_targetBone = stree.Find(this.m_bone);
        if (this.m_targetBone == null)
            return;
        CMath.MatMul(this.m_targetBone.mData.pst, this.m_p3d.GetFMat(), this.m_targetTemp.mData.pst);
        this.m_resolver.m_target = this.m_targetTemp.mData;
        this.m_sourceTemp.mData.PRSReset();
        this.m_resolver.m_source = this.m_sourceTemp;
        this.m_resolver.SolveIK();
        this.m_target.SetMat(this.m_sourceTemp.mData.pst);
    }
    SetPosOffset(_offset) {
        this.m_resolver.m_offsetPos.Import(_offset);
    }
    SetRotOffset(_offset) {
        this.m_resolver.m_offsetRot.Import(_offset);
    }
    SetScaOffset(_offset) {
        this.m_resolver.m_offsetSca.Import(_offset);
    }
    SetPosMix(_mix) {
        this.m_resolver.m_mixPos.Import(_mix);
    }
    SetRotMix(_mix) {
        this.m_resolver.m_mixRot = _mix;
    }
    SetScaMix(_mix) {
        this.m_resolver.m_mixSca.Import(_mix);
    }
}
export class CLookAtIK extends CResolverComp {
    m_resolver = undefined;
    constructor(_bone, _target) {
        super(_bone, _target);
        this.m_resolver = new CResolverIKLook(null, _target);
    }
}
export class CAimIK extends CResolverComp {
    m_resolver = undefined;
    constructor(_bone, _target, _boneNum = 2) {
        super(_bone, _target);
        this.m_resolver = new CResolverIKFABR(null, _target, _boneNum);
    }
    SetPole(_pole) {
        this.m_resolver.m_pole = _pole;
    }
    SetIteration(_iter) {
        this.m_resolver.m_iteration = _iter;
    }
    SetTolerance(_tol) {
        this.m_resolver.m_tolerance = _tol;
    }
    SetMix(_mix) {
        this.m_resolver.m_mix = _mix;
    }
}
