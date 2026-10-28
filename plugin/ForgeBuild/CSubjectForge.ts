import { CUpdate } from "../../artgine/basic/Basic.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CCollider } from "../../artgine/app/component/CCollider.js";
import { IForgeAnim } from "./CForgeMeshBuf.js";

interface IForgeMover { def : IForgeAnim; sub : CSubject; col : CCollider[]; p : number; to : number; play : boolean; block : boolean; }

//포지 계열 서브젝트. 문·의자처럼 건물 메시에서 떼어 낸 부품을 자식 서브젝트로 들고 ForgeAction으로 움직인다.
//부품의 충돌체는 닫혀 있을 때(p가 거의 0)만 막고, 열리기 시작하면 끈다
export class CSubjectForge extends CSubject
{
    static sUnit = 100;
    //이 값 이하면 닫힌 것으로 보고 충돌체를 켠다
    static sClosed = 0.02;
    //충돌체를 켤 때 쓰는 이벤트(팩토리가 정한 값). 끌 때는 None
    mBlockEvent : number = CCollider.eEvent.Static;
    private mMover = new Map<string, IForgeMover>();

    AddPart(_def : IForgeAnim, _sub : CSubject, _col : CCollider[])
    {
        const m : IForgeMover = { def : _def, sub : _sub, col : _col, p : 0, to : 0, play : false, block : true };
        this.mMover.set(_def.key, m);
        this.Pose(m);
    }

    //상호작용 대상 목록. pos는 부품 중심(m, 월드), on은 열린 쪽(진행도 절반 이상)인지
    GetActions() : { key : string, kind : string, pos : number[], p : number, on : boolean, play : boolean }[]
    {
        const out : { key : string, kind : string, pos : number[], p : number, on : boolean, play : boolean }[] = [];
        for(const m of this.mMover.values())
        {
            const d = m.def, h = d.hull;
            let cx = 0, cy = 0, cz = 0;
            if(h != null && h.length > 0) { for(const q of h) { cx += q[0]; cy += q[1]; cz += q[2]; } cx /= h.length; cy /= h.length; cz /= h.length; }
            else if(d.focus != null) { cx = d.focus[0]; cy = d.focus[1]; cz = d.focus[2]; }
            else cy = 0.4;
            out.push({ key : d.key, kind : d.kind, pos : [d.pivot[0] + cx, d.pivot[1] + cy, d.pivot[2] + cz], p : m.p, on : m.to >= 0.5, play : m.play });
        }
        return out;
    }

    //지금 막고 있는 부품의 충돌 볼록체(월드 좌표 m, 점 3개씩). 닫힌 자세에서만 나온다
    GetBlockers() : number[][][]
    {
        const out : number[][][] = [];
        for(const m of this.mMover.values())
        {
            const d = m.def;
            if(!m.block || d.hull == null || m.p > CSubjectForge.sClosed) continue;
            out.push(d.hull.map(q => [q[0] + d.pivot[0], q[1] + d.pivot[1], q[2] + d.pivot[2]]));
        }
        return out;
    }

    GetKeys() : string[] { return [...this.mMover.keys()]; }
    GetProgress(_key : string) : number { return this.mMover.get(_key)?.p ?? -1; }
    IsPlaying(_key : string) : boolean { return this.mMover.get(_key)?.play ?? false; }

    //키가 "*"로 끝나면 그 앞 글자로 시작하는 부품 전부(예: "door:*"). 반환값은 움직인 부품 수.
    //숫자 : 0~1 위치로 바로 가서 멈춘다(진행 중이던 애니메이션은 멈춘다). 불 : true면 열리고 false면 닫히는 애니메이션을 재생한다
    ForgeAction(_key : string, _value : number | boolean) : number
    {
        let n = 0;
        const all = _key.endsWith("*"), head = _key.slice(0, -1);
        for(const [k, m] of this.mMover)
        {
            if(all ? !k.startsWith(head) : k != _key) continue;
            n++;
            if(typeof _value == "boolean") { m.to = _value ? 1 : 0; m.play = m.p != m.to; }
            else { m.p = Math.min(1, Math.max(0, _value)); m.to = m.p; m.play = false; this.Pose(m); }
        }
        return n;
    }

    override Update(_update : CUpdate) : void
    {
        super.Update(_update);
        if(this.mMover.size == 0) return;
        const dt = Math.min(Math.max(_update.DeltaTime(), 0), 0.1);
        for(const m of this.mMover.values())
        {
            if(!m.play) continue;
            //양 끝에서 천천히, 가운데에서 빠르게(평균 속도가 1 / dur이 되게 맞춘 값)
            const x = 2 * m.p - 1, speed = (0.2 + 1.2 * (1 - x * x)) / Math.max(0.05, m.def.dur), step = speed * dt;
            if(m.to > m.p) m.p = Math.min(m.to, m.p + step); else m.p = Math.max(m.to, m.p - step);
            if(m.p == m.to) m.play = false;
            this.Pose(m);
        }
    }

    private Pose(_m : IForgeMover)
    {
        const d = _m.def, U = CSubjectForge.sUnit, p = _m.p;
        _m.sub.SetPos(new CVec3((d.pivot[0] + d.slide[0] * p) * U, (d.pivot[1] + d.slide[1] * p) * U, (d.pivot[2] + d.slide[2] * p) * U));
        const a = d.angle * p;
        _m.sub.SetRot(new CVec3(d.axis[0] * a, d.axis[1] * a, d.axis[2] * a));
        const block = p <= CSubjectForge.sClosed;
        if(block == _m.block) return;
        _m.block = block;
        //정적 충돌체는 이벤트를 바꿔야 정적 옥트리가 다시 만들어진다(SetEnable만으로는 옥트리에 남는다)
        for(const c of _m.col) c.SetEvent(block ? this.mBlockEvent : CCollider.eEvent.None);
    }
}
