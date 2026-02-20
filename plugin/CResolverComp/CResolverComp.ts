import { CComponent } from "../../artgine/app/component/CComponent.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CTree } from "../../artgine/basic/CTree.js";
import { IMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CMeshCopyNode } from "../../artgine/render/CMeshCopyNode.js";
import { CResolver, CResolverAttach, CResolverIKFABR, CResolverIKLook } from "../../artgine/render/CResolver.js";


class CResolverComp extends CComponent
{
    // source는 같은 오브젝트 내의 페인트에서 찾아옴
    public m_paintOff : number;
    public m_bone : string;

    public m_target : IMat;

    public m_resolver : CResolver;

    protected m_p3d : CPaint3D;
    
    protected m_sourceBone : CTree<CMeshCopyNode>;
    protected m_targetBone : CTree<CMeshCopyNode>;

    protected constructor(_bone : string, _target : IMat) {
        super();

        this.m_paintOff = 0;
        this.m_bone = _bone;

        this.m_target = _target;

        this.mSysc = CComponent.eSysn.IK; // aniflow 이후에 하기 위해서
    }

    SetTarget(_target : IMat) {
        this.m_resolver.m_target = _target;
    }
    
    Update(_delay: any): void {
        super.Update(_delay);

        // find bone
        const ptVec = this.mOwner.FindComps(CPaint3D);
        if(ptVec.length == 0 || ptVec.length <= this.m_paintOff)
            return;
        this.m_p3d = ptVec[this.m_paintOff] as CPaint3D;
        const tree = this.m_p3d.GetTree();
        if(tree == null) return;
        this.m_sourceBone = tree.Find(this.m_bone);
        if(this.m_sourceBone == null) return;
        this.m_resolver.m_source = this.m_sourceBone;
        this.m_resolver.m_invWorldMat = CMath.MatInvert(this.m_p3d.GetFMat());

        // resolve
        this.m_resolver.m_target = this.m_target;
        this.m_resolver.SolveIK();
    }
}
//특정 위치에 붙이기
export class CAttacher extends CResolverComp
{
    m_resolver : CResolverAttach = undefined;

    private m_targetTemp : CTree<CMeshCopyNode>;
    private m_sourceTemp : CTree<CMeshCopyNode>;

    constructor(_bone : string, _target : CSubject) {
        super(_bone, _target);

        this.m_resolver = new CResolverAttach(null, null);


        this.m_sourceTemp = new CTree<CMeshCopyNode>();
        this.m_sourceTemp.mData = new CMeshCopyNode();

        this.m_targetTemp = new CTree<CMeshCopyNode>();
        this.m_targetTemp.mData = new CMeshCopyNode();
    }

    Update(_delay: any): void {
        const ptVec = this.GetOwner().FindComps(CPaint3D);
        if(ptVec.length == 0 || ptVec.length <= this.m_paintOff)
            return;
        this.m_p3d = ptVec[this.m_paintOff] as CPaint3D;
        const stree = this.m_p3d.GetTree();
        if(stree == null) return;
        this.m_targetBone = stree.Find(this.m_bone);
        if(this.m_targetBone == null) return;

        CMath.MatMul(this.m_targetBone.mData.pst, this.m_p3d.GetFMat(), this.m_targetTemp.mData.pst);
        this.m_resolver.m_target = this.m_targetTemp.mData;

        // find target bone
        this.m_sourceTemp.mData.MatUpdate();
        this.m_resolver.m_source = this.m_sourceTemp;

        // resolve
        this.m_resolver.SolveIK();

        // pMat에 추가
        this.m_target.SetMat(this.m_sourceTemp.mData.pst);
        
    }

    SetPosOffset(_offset : CVec3) {
        this.m_resolver.m_offsetPos.Import(_offset);
    }
    SetRotOffset(_offset : CVec4) {
        this.m_resolver.m_offsetRot.Import(_offset);
    }
    SetScaOffset(_offset : CVec3) {
        this.m_resolver.m_offsetSca.Import(_offset);
    }

    SetPosMix(_mix : CVec3) {
        this.m_resolver.m_mixPos.Import(_mix);
    }
    SetRotMix(_mix : number) {
        this.m_resolver.m_mixRot = _mix;
    }
    SetScaMix(_mix : CVec3) {
        this.m_resolver.m_mixSca.Import(_mix);
    }
}
//바라보기
export class CLookAtIK extends CResolverComp
{
    m_resolver : CResolverIKLook = undefined;

    constructor(_bone : string, _target : IMat) {
        super(_bone, _target);

        this.m_resolver = new CResolverIKLook(null, _target);
    }
}
//역계산 특정 위치로 계단 등에 사용함
export class CAimIK extends CResolverComp
{
    m_resolver : CResolverIKFABR = undefined;

    constructor(_bone : string, _target : IMat, _boneNum : number = 2) {
        super(_bone, _target);

        this.m_resolver = new CResolverIKFABR(null, _target, _boneNum);
    }
    //어느 방향으로 꺽일지(포지션 정보만 사용)
    SetPole(_pole : IMat) {
        this.m_resolver.m_pole = _pole;
    }
    //몇번 반복할지
    SetIteration(_iter : number) {
        this.m_resolver.m_iteration = _iter;
    }
    //0~1 목표위치와 얼만큼 동일하면 끝낼지 정도. 0이면 모든 이터레이터를 다 소모해버린다
    SetTolerance(_tol : number) {
        this.m_resolver.m_tolerance = _tol;
    }
    //기존 위치랑 얼만큼 믹스할지임.
    SetMix(_mix : number) {
        this.m_resolver.m_mix = _mix;
    }
}
CClass.Push(CAttacher);
CClass.Push(CLookAtIK);
CClass.Push(CAimIK);