import { CComponent } from "../../artgine/app/component/CComponent.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CTree } from "../../artgine/basic/CTree.js";
import { CMat, IMat } from "../../artgine/geometry/CMat.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CMeshCopyNode } from "../../artgine/render/CMeshCopyNode.js";
import { CFile } from "../../artgine/system/CFile.js";
import { CMesh } from "../../artgine/render/CMesh.js";
import { CMeshDataNode } from "../../artgine/render/CMeshDataNode.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CResolver, CResolverAttach, CResolverIKFABR, CResolverIKLook, CResolverSpring, CSpringChain, CSpringCollider } from "../../artgine/render/CResolver.js";
export { CSpringChain, CSpringCollider };


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

    private m_ready = false;
    private m_waitFrame = 0;
    private m_checkMat = new CMat();
    //리졸버는 첫 계산에서 기준 방향/회전을 저장해 두고 계속 쓴다. 페인트의 최종 행렬이 아직 계산 전(단위행렬)일 때
    //첫 계산이 돌면 기준이 틀어지므로, 최종 행렬이 계산된 뒤에야 시작한다
    protected IsReady(_p3d : CPaint3D) : boolean {
        if(this.m_ready) return true;
        CMath.MatMul(_p3d.GetMat(), this.mOwner.GetMat(), this.m_checkMat, true);
        const a = this.m_checkMat.mF32A;
        const b = _p3d.GetFMat().mF32A;
        let same = true;
        for(let i = 0; i < 16; i++) {
            if(a[i] != b[i]) { same = false; break; }
        }
        //최종 행렬을 따로 지정하는 경우처럼 끝내 일치하지 않아도 IK가 멈추지 않게 한다
        if(same || ++this.m_waitFrame > 10) this.m_ready = true;
        return this.m_ready;
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
        if(!this.IsReady(this.m_p3d)) return;
        this.Resolve(tree, _delay);
        this.m_p3d.UpdateFMat();
    }
    protected Resolve(_tree : CTree<CMeshCopyNode>, _delay : any) {
        this.m_sourceBone = _tree.Find(this.m_bone);
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
        if(!this.IsReady(this.m_p3d)) return;
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

//hitRadius는 미터, 지정하면 메시 두께 계산 대신 사용. thick은 계산된 두께 배율
export interface ISpringLinkOption {
    stiffness? : number;
    drag? : number;
    gravity? : number;
    maxAngle? : number;
    hitRadius? : number;
    thick? : number;
}
class CSpringLink {
    constructor(public mSpring : string | string[], public mCollider : string[], public mOption : ISpringLinkOption) {}
}
const LINK_GROUP_BASE = 1000;
const LINK_WEIGHT = 0.5;

//흔들림(스프링 본). 계산은 엔진 CResolverSpring, 이 컴포넌트는 체인 구성과 VRM 정의 읽기를 맡는다
export class CSpringBone extends CResolverComp
{
    m_resolver : CResolverSpring = undefined;
    public mChain : Array<CSpringChain>;
    public mCollider : Array<CSpringCollider>;
    private m_link = new Array<CSpringLink>();
    private m_boneGroup = new Map<string, number>();

    constructor() {
        super("", null);
        this.m_resolver = new CResolverSpring();
        this.mChain = this.m_resolver.m_chain;
        this.mCollider = this.m_resolver.m_collider;
        this.mSysc = CComponent.eSysn.IK + 1;
    }

    PushChain(_chain : CSpringChain) : CSpringChain {
        this.mChain.push(_chain);
        this.m_resolver.Rebuild();
        return _chain;
    }
    PushCollider(_collider : CSpringCollider) : CSpringCollider {
        this.mCollider.push(_collider);
        this.m_resolver.Rebuild();
        return _collider;
    }
    FindChain(_root : string) : CSpringChain {
        for (const chain of this.mChain)
            if (chain.mRoot == _root) return chain;
        return null;
    }
    Reset() {
        this.m_resolver.Reset();
    }
    override Start() {
        super.Start();
        this.m_resolver.Reset();
    }

    //VRM 0.x(secondaryAnimation) / 1.0(VRMC_springBone) 정의를 체인/충돌체로 옮긴다. 미터 값은 _unit(GLTF 인치 변환 39.37)을 곱한다
    async ImportVRM(_file : string, _unit = 39.37) : Promise<boolean> {
        //엔진 로더가 같은 파일을 받는 중이면 브라우저 캐시 쓰기 충돌로 null이 올 수 있어 캐시 없이 한 번 더 받는다
        const buf = await CFile.Load(_file) ?? await CFile.Load(_file, false, true);
        if (buf == null) return false;
        const view = new DataView(buf as ArrayBuffer);
        if (view.getUint32(0, true) != 0x46546C67) return false;
        const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf as ArrayBuffer, 20, view.getUint32(12, true))));
        const ext = json.extensions ?? {};
        const name = (_node : number) => json.nodes[_node].name as string;
        const v3 = (_v : any, _s : number) => Array.isArray(_v) ? new CVec3(_v[0] * _s, _v[1] * _s, _v[2] * _s) : new CVec3(_v.x * _s, _v.y * _s, _v.z * _s);
        this.m_resolver.m_unit = _unit;

        if (ext.VRMC_springBone != null) {
            const sb = ext.VRMC_springBone;
            const groups = sb.colliderGroups ?? [];
            for (let g = 0; g < groups.length; g++) {
                for (const ci of groups[g].colliders) {
                    const col = sb.colliders[ci];
                    const shape = col.shape.sphere ?? col.shape.capsule;
                    this.PushCollider(new CSpringCollider(name(col.node), v3(shape.offset, _unit), shape.radius * _unit,
                        col.shape.capsule != null ? v3(shape.tail, _unit) : null, g));
                }
            }
            for (const spring of sb.springs ?? []) {
                const j0 = spring.joints[0];
                const chain = new CSpringChain(name(j0.node), j0.stiffness ?? 1, j0.dragForce ?? 0.5, j0.gravityPower ?? 0, (j0.hitRadius ?? 0) * _unit);
                if (j0.gravityDir != null) chain.mGravityDir = v3(j0.gravityDir, 1);
                chain.mVRM = true;
                chain.mColliderGroup = spring.colliderGroups ?? [];
                chain.mCollision = chain.mColliderGroup.length > 0;
                this.PushChain(chain);
            }
            return true;
        }
        const sa = ext.VRM?.secondaryAnimation;
        if (sa == null) return false;
        const groups = sa.colliderGroups ?? [];
        for (let g = 0; g < groups.length; g++) {
            for (const col of groups[g].colliders) {
                //VRM0 충돌체 오프셋은 Unity 좌표라 z 부호가 반대다(three-vrm 동일 처리)
                const off = v3(col.offset, _unit);
                off.z = -off.z;
                this.PushCollider(new CSpringCollider(name(groups[g].node), off, col.radius * _unit, null, g));
            }
        }
        for (const bg of sa.boneGroups ?? []) {
            for (const bone of bg.bones ?? []) {
                const chain = new CSpringChain(name(bone), bg.stiffiness ?? 1, bg.dragForce ?? 0.5, bg.gravityPower ?? 0, (bg.hitRadius ?? 0) * _unit);
                if (bg.gravityDir != null) chain.mGravityDir = v3(bg.gravityDir, 1);
                chain.mVRM = true;
                chain.mColliderGroup = bg.colliderGroups ?? [];
                chain.mCollision = chain.mColliderGroup.length > 0;
                this.PushChain(chain);
            }
        }
        return true;
    }

    //흔들 본(이름, 배열, "접두사*")과 충돌 대상 본 이름만 받는다. 충돌체 모양과 본 반경은 메시가 준비된 첫 프레임에 정점에서 계산한다.
    //충돌 대상 본마다 그룹이 하나씩 생기고, 같은 호출의 흔들 본은 그 그룹들과만 충돌한다
    PushLink(_spring : string | string[], _collider : string[] = [], _option : ISpringLinkOption = {}) {
        this.m_link.push(new CSpringLink(_spring, _collider, _option));
    }

    private BuildLink(_tree : CTree<CMeshCopyNode>) : boolean {
        const mesh = this.m_p3d.mMeshRes;
        if (mesh == null || mesh.skin.length == 0) return false;
        const links = this.m_link;
        this.m_link = [];
        const unit = this.m_resolver.m_unit;

        const rootList = links.map((_l) => this.FindRoots(_tree, _l.mSpring));
        const need = new Set<string>();
        for (let i = 0; i < links.length; i++) {
            for (const name of links[i].mCollider) need.add(name);
            for (const root of rootList[i]) this.EachNode(root, (_n) => { need.add(_n.mKey); });
        }
        const points = this.CollectPoints(mesh, need);

        for (const link of links) {
            for (const bone of link.mCollider) {
                if (this.m_boneGroup.has(bone)) continue;
                const pts = points.get(bone);
                if (pts == null || pts.length < 8) continue;
                const group = LINK_GROUP_BASE + this.m_boneGroup.size;
                this.m_boneGroup.set(bone, group);
                this.PushCollider(this.FitCollider(bone, pts, group));
            }
        }
        for (let i = 0; i < links.length; i++) {
            const opt = links[i].mOption;
            const groups = links[i].mCollider.filter((_b) => this.m_boneGroup.has(_b)).map((_b) => this.m_boneGroup.get(_b));
            for (const root of rootList[i]) {
                const hit = opt.hitRadius != null ? opt.hitRadius * unit : this.FitThick(root, points) * (opt.thick ?? 1);
                const chain = new CSpringChain(root.mKey, opt.stiffness ?? 0.5, opt.drag ?? 0.4, opt.gravity ?? 0, hit, opt.maxAngle ?? 0);
                chain.mVRM = true;
                chain.mColliderGroup = groups;
                chain.mCollision = groups.length > 0;
                this.PushChain(chain);
            }
        }
        return true;
    }
    private FindRoots(_tree : CTree<CMeshCopyNode>, _spring : string | string[]) : CTree<CMeshCopyNode>[] {
        const out = new Array<CTree<CMeshCopyNode>>();
        if (typeof _spring == "string" && _spring.endsWith("*")) {
            const prefix = _spring.substring(0, _spring.length - 1);
            this.EachNode(_tree, (_n) => {
                if (_n.mKey.startsWith(prefix) && (_n.mParent == null || !_n.mParent.mKey.startsWith(prefix)))
                    out.push(_n);
            });
            return out;
        }
        for (const name of (typeof _spring == "string" ? [_spring] : _spring)) {
            const node = _tree.Find(name);
            if (node != null) out.push(node);
        }
        return out;
    }
    private EachNode<T>(_node : CTree<T>, _fn : (_n : CTree<T>) => void) {
        _fn(_node);
        for (let ch = _node.mChild; ch != null; ch = ch.mColleague)
            this.EachNode(ch, _fn);
    }
    //가중치가 LINK_WEIGHT 이상인 정점을 바인드 역행렬로 그 본의 로컬 좌표로 옮겨 모은다
    private CollectPoints(_mesh : CMesh, _need : Set<string>) : Map<string, CVec3[]> {
        const idxBone = new Array<string>(_mesh.skin.length);
        for (let i = 0; i < _mesh.skin.length; i++) {
            const key = _mesh.skin[i].key;
            for (const name of _need)
                if (key == name || key.endsWith(" " + name)) idxBone[i] = name;
        }
        const out = new Map<string, CVec3[]>();
        const pos = new CVec3();
        this.EachNode<CMeshDataNode>(_mesh.meshTree, (_n) => {
            const ci = _n.mData?.ci;
            if (ci == null) return;
            const pb = ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
            const wb = ci.GetVFType(CVertexFormat.eIdentifier.Weight)[0];
            const ib = ci.GetVFType(CVertexFormat.eIdentifier.WeightIndex)[0];
            if (pb == null || wb == null || ib == null) return;
            const p = pb.bufF.GetArray(), w = wb.bufF.GetArray(), j = ib.bufF.GetArray();
            const count = Math.min(pb.bufF.Size(3), wb.bufF.Size(4), ib.bufF.Size(4));
            for (let v = 0; v < count; v++) {
                for (let k = 0; k < 4; k++) {
                    if (w[v * 4 + k] < LINK_WEIGHT) continue;
                    const si = j[v * 4 + k];
                    const bone = idxBone[si];
                    if (bone == null) continue;
                    pos.x = p[v * 3]; pos.y = p[v * 3 + 1]; pos.z = p[v * 3 + 2];
                    let list = out.get(bone);
                    if (list == null) out.set(bone, list = []);
                    list.push(CMath.V3MulMatCoordi(pos, _mesh.skin[si].mat));
                }
            }
        });
        return out;
    }
    //주축(공분산 거듭제곱법)으로 길쭉하면 캡슐, 아니면 구. 튀는 정점에 끌려가지 않게 분위수로 크기를 잡는다
    private FitCollider(_bone : string, _pts : CVec3[], _group : number) : CSpringCollider {
        const c = new CVec3();
        for (const p of _pts) { c.x += p.x; c.y += p.y; c.z += p.z; }
        c.x /= _pts.length; c.y /= _pts.length; c.z /= _pts.length;
        let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
        for (const p of _pts) {
            const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
            xx += dx * dx; xy += dx * dy; xz += dx * dz; yy += dy * dy; yz += dy * dz; zz += dz * dz;
        }
        let a = new CVec3(1, 1, 1);
        for (let it = 0; it < 24; it++) {
            a = CMath.V3Nor(new CVec3(xx * a.x + xy * a.y + xz * a.z, xy * a.x + yy * a.y + yz * a.z, xz * a.x + yz * a.y + zz * a.z));
        }
        const t = new Array<number>(), d = new Array<number>();
        for (const p of _pts) {
            const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
            const s = dx * a.x + dy * a.y + dz * a.z;
            t.push(s);
            d.push(Math.hypot(dx - a.x * s, dy - a.y * s, dz - a.z * s));
        }
        const q = (_v : number[], _p : number) => { _v.sort((_x, _y) => _x - _y); return _v[Math.min(_v.length - 1, Math.floor(_v.length * _p))]; };
        const rad = q(d, 0.7), tMin = q(t, 0.05), tMax = q(t, 0.95);
        if (tMax - tMin > rad * 2.5) {
            const head = new CVec3(c.x + a.x * (tMin + rad), c.y + a.y * (tMin + rad), c.z + a.z * (tMin + rad));
            const tail = new CVec3(c.x + a.x * (tMax - rad), c.y + a.y * (tMax - rad), c.z + a.z * (tMax - rad));
            return new CSpringCollider(_bone, head, rad, tail, _group);
        }
        //정점 밀도가 한쪽에 몰려도 중심이 치우치지 않게 축별 분위수 범위의 가운데를 중심으로 쓴다
        const mid = (_f : (_p : CVec3) => number) => { const v = _pts.map(_f); return (q(v, 0.05) + q(v, 0.95)) * 0.5; };
        const center = new CVec3(mid((_p) => _p.x), mid((_p) => _p.y), mid((_p) => _p.z));
        return new CSpringCollider(_bone, center, q(_pts.map((_p) => CMath.V3Distance(_p, center)), 0.6), null, _group);
    }
    //체인 각 본에 붙은 정점이 본 선분에서 떨어진 거리의 하위 30% 값 = 메시 두께. 넓은 판 모양 머리카락은 폭 방향 거리가 커서 중앙값을 쓰면 과하게 뜬다
    private FitThick(_root : CTree<CMeshCopyNode>, _points : Map<string, CVec3[]>) : number {
        const dist = new Array<number>();
        this.EachNode(_root, (_n) => {
            const pts = _points.get(_n.mKey);
            if (pts == null || _n.mChild == null) return;
            const seg = _n.mChild.mData.pos;
            const l2 = CMath.V3Dot(seg, seg);
            if (l2 < 1e-8) return;
            for (const p of pts) {
                const s = Math.max(0, Math.min(1, CMath.V3Dot(p, seg) / l2));
                dist.push(CMath.V3Distance(p, new CVec3(seg.x * s, seg.y * s, seg.z * s)));
            }
        });
        if (dist.length == 0) return 0;
        dist.sort((_x, _y) => _x - _y);
        return dist[Math.floor(dist.length * 0.3)];
    }

    protected override Resolve(_tree : CTree<CMeshCopyNode>, _delay : CUpdate) {
        if (this.GetOwner().IsDestroy()) return;
        if (this.m_link.length > 0 && !this.BuildLink(_tree)) return;
        this.m_resolver.m_source = _tree;
        this.m_resolver.m_worldMat = this.m_p3d.GetFMat();
        this.m_resolver.m_delay = _delay.DeltaTime();
        this.m_resolver.SolveIK();
    }
}

CClass.Push(CAttacher);
CClass.Push(CLookAtIK);
CClass.Push(CAimIK);
CClass.Push(CSpringBone);
CClass.Push(CResolverSpring);
CClass.Push(CSpringChain);
CClass.Push(CSpringCollider);
