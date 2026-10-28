import { CTree } from "../../artgine/basic/CTree.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CMeshCopyNode } from "../../artgine/render/CMeshCopyNode.js";

type Node = CTree<CMeshCopyNode>;

//애니메이션이 만든 본 행렬(pst, 메시 공간) 위에 최소 회전만 더하는 해석식 2본 IK.
//엔진 CAimIK(FABRIK)는 첫 프레임 자세를 기준으로 저장해 걷는 동안 발 방향이 굳어서 쓰지 않는다
export class CAvatarIK
{
    private mTmp = new CMat();

    static Pos(_n : Node) : CVec3 { const a = _n.mData.pst.mF32A; return new CVec3(a[12], a[13], a[14]); }
    private static Sub(_n : Node, _out : Node[] = []) : Node[]
    {
        _out.push(_n);
        for(let c = _n.mChild; c != null; c = c.mColleague) CAvatarIK.Sub(c, _out);
        return _out;
    }
    //점 _p를 중심으로 회전 _q를 _n과 그 아래 모든 노드에 적용
    private Rotate(_n : Node, _p : CVec3, _q : CVec4)
    {
        const r = CMath.QutToMat(_q);
        const m = this.mTmp;
        m.Import(r);
        const a = m.mF32A;
        //T(-p) * R * T(p) 의 이동 성분(행 벡터 규약)
        a[12] = _p.x - (_p.x * a[0] + _p.y * a[4] + _p.z * a[8]);
        a[13] = _p.y - (_p.x * a[1] + _p.y * a[5] + _p.z * a[9]);
        a[14] = _p.z - (_p.x * a[2] + _p.y * a[6] + _p.z * a[10]);
        m.UnitCheck();
        for(const s of CAvatarIK.Sub(_n))
        {
            const pst = s.mData.pst;
            pst.Import(CMath.MatMul(pst, m));
        }
    }

    //_hip(허벅지)·_knee(종아리)·_foot을 _target(메시 공간)으로. 발의 방향은 애니메이션 그대로 둔다
    TwoBone(_hip : Node, _knee : Node, _foot : Node, _target : CVec3)
    {
        const footRot = new CMat();
        footRot.Import(_foot.mData.pst);
        const h = CAvatarIK.Pos(_hip), k = CAvatarIK.Pos(_knee), f = CAvatarIK.Pos(_foot);
        const a = CMath.V3Distance(h, k), b = CMath.V3Distance(k, f);
        if(a < 1e-5 || b < 1e-5) return;
        const d = Math.min(CMath.V3Distance(h, _target), a + b - 1e-3);
        const cosK = Math.min(1, Math.max(-1, (a * a + b * b - d * d) / (2 * a * b)));
        const want = Math.acos(cosK);
        const kh = CMath.V3Nor(CMath.V3SubV3(h, k)), kf = CMath.V3Nor(CMath.V3SubV3(f, k));
        const now = Math.acos(Math.min(1, Math.max(-1, CMath.V3Dot(kh, kf))));
        let axis = CMath.V3Cross(kh, kf);
        if(CMath.V3Len(axis) > 1e-6 && Math.abs(want - now) > 1e-4)
        {
            axis = CMath.V3Nor(axis);
            //kh에서 kf로 가는 회전축이라 각을 키우려면 같은 방향으로 돈다
            const s = Math.sin((want - now) * 0.5);
            this.Rotate(_knee, k, new CVec4(axis.x * s, axis.y * s, axis.z * s, Math.cos((want - now) * 0.5)));
        }
        const f2 = CAvatarIK.Pos(_foot);
        const from = CMath.V3Nor(CMath.V3SubV3(f2, h)), to = CMath.V3Nor(CMath.V3SubV3(_target, h));
        this.Rotate(_hip, h, CMath.FromToRotation(from, to));
        //발과 그 아래는 원래 방향으로 되돌리고 새 발목 위치만 쓴다
        const fp = _foot.mData.pst, now2 = new CMat();
        now2.Import(fp);
        footRot.mF32A[12] = fp.mF32A[12]; footRot.mF32A[13] = fp.mF32A[13]; footRot.mF32A[14] = fp.mF32A[14];
        const fix = CMath.MatMul(CMath.MatInvert(now2), footRot);
        for(const s of CAvatarIK.Sub(_foot)) s.mData.pst.Import(CMath.MatMul(s.mData.pst, fix));
    }
}

//지면 맞춤. 두 발 아래 지면 중 낮은 쪽에 맞게 골반(모델)을 내리고, 높은 쪽 발은 IK로 들어 올린다
export class CAvatarFoot
{
    mIK = new CAvatarIK();
    mDrop = 0;
    mLift = [0, 0];
    //이 높이(엔진 단위) 아래 차이는 무시한다
    static sMin = 0.5;
    static sSmooth = 12;

    //_ground : 월드 x,z → 지면 y. _fmat : 페인트 월드 행렬. 반환값은 모델을 내릴 양(엔진 단위)
    Apply(_tree : Node, _fmat : CMat, _ground : (_x : number, _z : number) => number, _baseY : number, _dt : number) : number
    {
        const legs : [string, string, string][] = [["thigh_l", "calf_l", "foot_l"], ["thigh_r", "calf_r", "foot_r"]];
        const nodes = legs.map(l => l.map(n => _tree.Find(n)));
        if(nodes.some(l => l.some(n => n == null))) return 0;
        const g = nodes.map(l =>
        {
            const w = CMath.V3MulMatCoordi(CAvatarIK.Pos(l[2]), _fmat);
            return { w, h : _ground(w.x, w.z) - _baseY };
        });
        const k = Math.min(1, _dt * CAvatarFoot.sSmooth);
        const drop = Math.max(0, -Math.min(g[0].h, g[1].h));
        this.mDrop += (drop - this.mDrop) * k;
        const inv = CMath.MatInvert(_fmat);
        for(let i = 0; i < 2; i++)
        {
            const lift = g[i].h + this.mDrop;
            this.mLift[i] += (lift - this.mLift[i]) * k;
            if(this.mLift[i] < CAvatarFoot.sMin) continue;
            const t = CMath.V3MulMatCoordi(new CVec3(g[i].w.x, g[i].w.y + this.mLift[i], g[i].w.z), inv);
            this.mIK.TwoBone(nodes[i][0], nodes[i][1], nodes[i][2], t);
        }
        return this.mDrop;
    }
}
