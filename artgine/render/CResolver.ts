import { CObject } from "../basic/CObject.js";
import { CTree } from "../basic/CTree.js";
import { CMat, IMat } from "../geometry/CMat.js";
import { CMath } from "../geometry/CMath.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CMeshCopyNode } from "./CMeshCopyNode.js";


export class CResolver extends CObject
{
    m_source : CTree<CMeshCopyNode>;
    m_target : IMat;

    constructor(_tip : CTree<CMeshCopyNode>, _tgt : IMat) {
        super();
        this.m_source = _tip;
        this.m_target = _tgt;
    }
    public SolveIK() {}
    protected ApplyToBone(_bone : CTree<CMeshCopyNode>, _pos : CVec3, _sca : CVec3, _rot : CVec4) {
        const wMat = CMath.MatMul(CMath.QutToMat(_rot), CMath.MatScale(_sca));
        wMat.SetV3(3, _pos);
        wMat.UnitCheck();
        _bone.mData.pst = wMat;

        // 이후에 사용할 수도 있으므로 local도 변경
        //const lMat = CMath.MatMul(wMat, CMath.MatInvert(_bone.mParent.mData.pst));
        let lMat = wMat;
        if(_bone.mParent) 
            lMat = CMath.MatMul(lMat, CMath.MatInvert(_bone.mParent.mData.pst));
        
        _bone.mData.rot = MatDecomposeRot(lMat);
        _bone.mData.pos = lMat.xyz;
    }
    protected ApplyToChild(_bone : CTree<CMeshCopyNode>, _excludeBones : CTree<CMeshCopyNode>[] = []) {
        if(!_bone) return;
        if(_bone.mParent && !_excludeBones.includes(_bone)) {
            _bone.mData.PRSReset();
            _bone.mData.pst = CMath.MatMul(_bone.mData.pst, _bone.mParent.mData.pst);
        }
        if(_bone.mColleague) this.ApplyToChild(_bone.mColleague, _excludeBones);
        if(_bone.mChild) this.ApplyToChild(_bone.mChild, _excludeBones);
    }
    
}

export class CResolverAttach extends CResolver
{
    // 오프셋
    m_offsetRot : CVec4 = new CVec4(0, 0, 0, 1);
    m_offsetPos : CVec3 = new CVec3(0, 0, 0);
    m_offsetSca : CVec3 = new CVec3(1, 1, 1);

    // 믹싱
    m_mixRot : number = 1;
    m_mixPos : CVec3 = new CVec3(1, 1, 1);
    m_mixSca : CVec3 = new CVec3(1, 1, 1);


    SolveIK() {
        // 타겟 trs 계산
        const tMat = this.m_target.GetMat();
        const tPos = tMat.xyz;
        const tSca = CMath.MatDecomposeSca(tMat);
        const tRot = MatDecomposeRot(tMat);

        // 소스 trs 계산
        const sPos = this.m_source.mData.pst.xyz;
        const sSca = CMath.MatDecomposeSca(this.m_source.mData.pst);
        const sRot = MatDecomposeRot(this.m_source.mData.pst);

        // 타겟에 offset 적용
        CMath.V3AddV3(tPos, this.m_offsetPos, tPos);
        CMath.V3MulV3(tSca, this.m_offsetSca, tSca);
        CMath.QutMul(tRot, this.m_offsetRot, tRot);

        // mix
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
        this.ApplyToChild(this.m_source);
    }
}

export class CResolverIKLook extends CResolver
{
    private m_dirOrigin : CVec3;
    private m_rotOrigin : CVec4;

    SolveIK() {
        const tPos = this.m_target.GetMat().xyz;
        const sPos = this.m_source.mData.pst.xyz;
        const curDir = CMath.V3SubV3(tPos, sPos);
        if(!this.m_dirOrigin || !this.m_rotOrigin) {
            this.m_dirOrigin = CMath.V3Nor(curDir);
            this.m_rotOrigin = MatDecomposeRot(this.m_source.mData.pst);
        }
        const rot = CMath.QutMul(this.m_rotOrigin, CMath.FromToRotation(this.m_dirOrigin, curDir));
        this.ApplyToBone(this.m_source, sPos, CMath.MatDecomposeSca(this.m_source.mData.pst), rot);
        this.ApplyToChild(this.m_source);
    }
}

export class CResolverIKFABR extends CResolver
{
    /*
        options

        pole : 중간 본이 있는 경우 어떤 방향으로 굽을 지를 결정함. pole.GetPos() 방향으로 굽음.
        iteration : 그리디 알고리즘이라 결과를 내기 위해 몇 번까지 반복할 지 결정
        tolerance : 그리디 알고리즘이라 오차율이 변수 이내이면 종료할 지 결정
        mix : 원본 pos와 얼마나 믹싱할지 결정

        tolerance보다 오차율 작으면 무조건 종료 => 작지 않으면 iteration번까지 반복
    */
    public m_pole : IMat;
    public m_iteration : number = 10;
    public m_tolerance : number = 0.05;
    public m_mix : number = 1;
    
    private m_targetPos : CVec3;
    private m_boneRotOrigin : CVec4[];
    private m_boneDirOrigin : CVec3[];
    private m_bonePosOrigin : CVec3[];

    private m_boneLenTotal : number;
    private m_boneLen : number[];

    private m_bones : CTree<CMeshCopyNode>[];
    private m_bonePos : CVec3[];
    private m_boneRot : CVec4[];

    constructor(_tip : CTree<CMeshCopyNode>, _tgt : IMat, _numOfBones : number = 1) {
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
        if(!this.m_source || !this.m_target) {
            return;
        }

        if(!this.m_targetPos) {
            this.m_targetPos = this.m_target.GetMat().xyz;
            this.m_boneLenTotal = 0;
            let previousBone  : CTree<CMeshCopyNode>= null;
            let currentBone = this.m_source;
            for(let i = this.m_bonePos.length - 1; i >= 0; i--) {
                this.m_bones[i] = currentBone;
                this.m_boneRotOrigin[i] = MatDecomposeRot(currentBone.mData.pst);
                if(i == this.m_bonePos.length - 1) {
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

        for(let i = 0; i < this.m_bones.length; i++) {
            this.m_bonePos[i] = this.m_bones[i].mData.pst.xyz;
            this.m_bonePosOrigin[i] = this.m_bones[i].mData.pst.xyz;
            
        }

        const tPos = this.m_target.GetMat().xyz;
        let distToTarget = CMath.V3Distance(tPos, this.m_bonePos[0]);
        if(distToTarget >= this.m_boneLenTotal) {
            let dir = CMath.V3SubV3(tPos, this.m_bonePos[0]);
            CMath.V3Nor(dir, dir);
            for(let i = 1; i < this.m_bonePos.length; i++) {
                this.m_bonePos[i] = CMath.V3AddV3(this.m_bonePos[i - 1], CMath.V3MulFloat(dir, this.m_boneLen[i - 1]));
            }
        }
        else {
            distToTarget = CMath.V3Distance(this.m_bonePos[this.m_bonePos.length - 1], tPos);
            let count = 0;
            while(distToTarget > this.m_tolerance) {
                count++;
                if(count > this.m_iteration) {
                    break;
                }

                const sPos = this.m_bonePos[0];
                this.Backward(tPos);
                this.Forward(sPos);
            }
        }
        this.PoleConstraint();
        // mix
        for(let i = 0; i < this.m_bonePos.length; i++) {
            this.m_bonePos[i] = CMath.V3Interpolate(this.m_bonePosOrigin[i], this.m_bonePos[i], this.m_mix);
        }

        for(let i = 0; i < this.m_bonePos.length - 1; i++) {
            const curDir = CMath.V3SubV3(this.m_bonePos[i + 1], this.m_bonePos[i]);
            const rotQut = CMath.FromToRotation(this.m_boneDirOrigin[i], curDir);
            this.m_boneRot[i] = CMath.QutMul(this.m_boneRotOrigin[i], rotQut);
        }
        const lastIndex = this.m_bonePos.length - 1;
        this.m_boneRot[lastIndex] = this.m_boneRotOrigin[lastIndex];

        for(let i = 0; i < this.m_bones.length; i++) {
            this.ApplyToBone(this.m_bones[i], this.m_bonePos[i], CMath.MatDecomposeSca(this.m_bones[i].mData.pst), this.m_boneRot[i]);
        }
        this.ApplyToChild(this.m_bones[0], this.m_bones);
    }

    protected Backward(_tPos : CVec3) {
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
    protected Forward(_sPos : CVec3) {
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
    protected PoleConstraint() {
        if(this.m_pole != null) {
            let pPos = this.m_pole.GetMat().xyz;

            //  * ------ * ------ *
            // tip      mov      bot
            // center bone이 어느쪽으로 꺾일지 결정
            for(let i = 1; i < this.m_bonePos.length - 1; i++) {
                let tipBone = this.m_bonePos[i + 1];
                let movBone = this.m_bonePos[i];
                let botBone = this.m_bonePos[i - 1];

                let planeNormal = CMath.V3Nor(CMath.V3SubV3(tipBone, botBone));
                let planeDistance = -CMath.V3Dot(planeNormal, botBone);

                let projPole = ClosestPointOnPlane(planeNormal, planeDistance, pPos);
                let projBone = ClosestPointOnPlane(planeNormal, planeDistance, movBone);
                let angle = CMath.V3SignedAngle(CMath.V3SubV3(projBone, botBone), CMath.V3SubV3(projPole, botBone), planeNormal);
                let newRot = CMath.QutAxisToRotation(planeNormal, angle);
                this.m_bonePos[i] = CMath.V3AddV3(CMath.V3MulMatCoordi(
                    CMath.V3SubV3(movBone, botBone),
                    CMath.QutToMat(newRot)
                ), botBone);
            }
        }
    }
}





function ClosestPointOnPlane(_planeNor : CVec3, _planeDist : number, _point : CVec3)
{
    let dis = CMath.V3Dot(_planeNor, _point) + _planeDist;
    return CMath.V3SubV3(_point, CMath.V3MulFloat(_planeNor, dis));
}
function MatDecomposeRot(_mat : CMat) {
    const sca = CMath.MatDecomposeSca(_mat);
    sca.x = 1 / sca.x; sca.y = 1 / sca.y; sca.z = 1 / sca.z;
    const scaMat = CMath.MatScale(sca);
    return CMath.MatToQut(CMath.MatMul(_mat, scaMat));
}