import { CTree } from "../../artgine/basic/CTree.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CMesh } from "../../artgine/render/CMesh.js";
import { CMeshCopyNode } from "../../artgine/render/CMeshCopyNode.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CAvatarCloth } from "./CAvatarCloth.js";

//본 하나의 체중 변형 기준(본 로컬 공간). a : 본 길이 방향, c : 축이 지나는 점, f : 정면(+Z) 방향, k : 살 붙는 정도, sag : 아래로 처짐
interface IFatBone { name : string; a : number[]; c : number[]; f : number[]; down : number[]; r : number; k : number; front : number; sag : number; }

//체중(살찌고 빠지고). 매 프레임 애니메이션이 만든 본 행렬에 "본 길이에 수직인 방향 스케일"을 곱해 메시를 다시 만들지 않고 바로 반영한다.
//축은 본 선이 아니라 그 본에 붙은 정점들의 중심을 지난다(척추처럼 본이 등 쪽에 붙어 있으면 배만 홀쭉해진다).
//배·골반은 등 쪽 표면을 축으로 삼아 살이 찔 때 앞으로만 나온다
export class CAvatarFat
{
    //체중 1에서 반지름이 늘어나는 비율(부위 가중치를 곱한다). -1은 sThin만큼 준다
    static sFat = 0.6;
    //마를 때는 뼈·근육은 그대로이고 지방만 빠진다. 베이스 몸이 이미 날씬해(WHtR 약 0.35) 크게 줄이면 기아처럼 보인다
    static sThin = 0.12;
    //본 이름 앞부분 → [살 붙는 정도, 앞으로 나오는 정도, 처짐, 축을 등 쪽 표면으로 옮기는 비율(1이면 등은 그대로)]
    static sBone : [string, number, number, number, number][] = [
        ["pelvis", 0.85, 0.6, 0.15, 0.6], ["spine_01", 1.0, 1.0, 0.3, 1.0], ["spine_02", 0.85, 0.6, 0.15, 0.85], ["spine_03", 0.75, 0.2, 0.05, 0.5], ["clavicle", 0.35, 0, 0, 0],
        ["neck", 0.85, 0, 0, 0], ["Head", 0.12, 0, 0, 0], ["upperarm", 0.85, 0, 0, 0], ["lowerarm", 0.5, 0, 0, 0], ["hand", 0.1, 0, 0, 0],
        ["thigh", 0.55, 0, 0, 0], ["calf", 0.3, 0, 0, 0], ["foot", 0.05, 0, 0, 0],
    ];

    mBone : IFatBone[] = [];

    static Build(_body : CMesh) : CAvatarFat
    {
        const out = new CAvatarFat();
        const geo = CAvatarCloth.BodyNodes(_body).map(n =>
        {
            const ci = n.mData.ci;
            return { g : CAvatarCloth.Geo(ci), w : ci.GetVFType(CVertexFormat.eIdentifier.Weight)[0]?.bufF.GetArray(), j : ci.GetVFType(CVertexFormat.eIdentifier.WeightIndex)[0]?.bufF.GetArray() };
        }).filter(e => e.g != null && e.w != null && e.j != null);
        const Name = (_k : string) => _k.substring(_k.lastIndexOf(" ") + 1);
        const Local = (_m : CMat, _x : number, _y : number, _z : number) : number[] =>
        {
            const a = _m.mF32A;
            return [_x * a[0] + _y * a[4] + _z * a[8] + a[12], _x * a[1] + _y * a[5] + _z * a[9] + a[13], _x * a[2] + _y * a[6] + _z * a[10] + a[14]];
        };
        const Dir = (_m : CMat, _x : number, _y : number, _z : number) : number[] =>
        {
            const a = _m.mF32A, v = [_x * a[0] + _y * a[4] + _z * a[8], _x * a[1] + _y * a[5] + _z * a[9], _x * a[2] + _y * a[6] + _z * a[10]];
            const l = Math.hypot(v[0], v[1], v[2]) || 1;
            return [v[0] / l, v[1] / l, v[2] / l];
        };
        const Dot = (_a : number[], _b : number[]) => _a[0] * _b[0] + _a[1] * _b[1] + _a[2] * _b[2];
        _body.skin.forEach((s, i) =>
        {
            const name = Name(s.key), m = s.mat;
            const t = CAvatarFat.sBone.find(b => name.startsWith(b[0]));
            //길이 방향: 첫 자식 본 쪽. 자식이 없으면(머리) 위쪽
            let a : number[] = null;
            for(let c = _body.meshTree.Find(name)?.mChild; c != null && a == null; c = c.mColleague)
            {
                const cs = _body.skin.find(x => Name(x.key) == c.mKey);
                if(cs == null) continue;
                const cb = CMath.MatInvert(cs.mat).mF32A;
                const v = Local(m, cb[12], cb[13], cb[14]), l = Math.hypot(v[0], v[1], v[2]);
                if(l > 1e-5) a = [v[0] / l, v[1] / l, v[2] / l];
            }
            if(a == null) a = Dir(m, 0, 1, 0);
            const f0 = Dir(m, 0, 0, 1), fa = Dot(f0, a);
            let f = [f0[0] - a[0] * fa, f0[1] - a[1] * fa, f0[2] - a[2] * fa];
            const fl = Math.hypot(f[0], f[1], f[2]) || 1;
            f = [f[0] / fl, f[1] / fl, f[2] / fl];
            //이 본에 0.4 이상 붙은 정점들의 중심과 정면 방향 최소값(등 쪽 표면)
            let cx = 0, cy = 0, cz = 0, n = 0, back = Infinity;
            const pts : number[][] = [];
            for(const e of geo)
                for(let v = 0; v < e.g.count; v++)
                    for(let k = 0; k < 4; k++)
                        if(e.j[v * 4 + k] == i && e.w[v * 4 + k] >= 0.4)
                        {
                            const p = Local(m, e.g.pos[v * 3], e.g.pos[v * 3 + 1], e.g.pos[v * 3 + 2]);
                            pts.push(p); cx += p[0]; cy += p[1]; cz += p[2]; n++;
                        }
            let c = [0, 0, 0];
            if(n > 0)
            {
                c = [cx / n, cy / n, cz / n];
                const ca = Dot(c, a);
                c = [c[0] - a[0] * ca, c[1] - a[1] * ca, c[2] - a[2] * ca];
                for(const p of pts) back = Math.min(back, Dot([p[0] - c[0], p[1] - c[1], p[2] - c[2]], f));
            }
            const front = t?.[2] ?? 0;
            //앞으로 나오는 부위는 축을 등 쪽 표면 가까이로 옮긴다
            const shift = t?.[4] ?? 0;
            if(shift > 0 && isFinite(back)) c = [c[0] + f[0] * back * shift, c[1] + f[1] * back * shift, c[2] + f[2] * back * shift];
            let r = 0;
            for(const p of pts) { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], da = Dot(d, a); r += Math.hypot(d[0] - a[0] * da, d[1] - a[1] * da, d[2] - a[2] * da); }
            out.mBone.push({ name, a, c, f, down : Dir(m, 0, -1, 0), r : pts.length > 0 ? r / pts.length : 0, k : t?.[1] ?? 0, front, sag : t?.[3] ?? 0 });
        });
        return out;
    }

    private mNode : CTree<CMeshCopyNode>[] = null;
    private mTree : CTree<CMeshCopyNode> = null;
    private mM = new CMat();

    //_tree : 페인트 본 트리(pst = 메시 공간). _skinName : 이 메시의 스킨 순서(경량 R6 메시도 이름으로 찾는다)
    Apply(_tree : CTree<CMeshCopyNode>, _fat : number)
    {
        if(Math.abs(_fat) < 1e-3) return;
        if(this.mTree != _tree)
        {
            this.mTree = _tree;
            this.mNode = this.mBone.map(b => _tree.Find(b.name));
        }
        const m = this.mM.mF32A;
        for(let i = 0; i < this.mBone.length; i++)
        {
            const b = this.mBone[i], node = this.mNode[i];
            if(b.k == 0 || node == null) continue;
            const s = _fat > 0 ? 1 + b.k * CAvatarFat.sFat * _fat : Math.max(0.5, 1 + b.k * CAvatarFat.sThin * _fat);
            const sf = _fat > 0 ? s + (s - 1) * b.front : s;
            //A = I + (s-1)(I - aa^T) + (sf-s) ff^T  (길이 방향은 그대로, 정면은 sf)
            const a = b.a, f = b.f;
            for(let r = 0; r < 3; r++)
                for(let c = 0; c < 3; c++)
                    m[r * 4 + c] = (r == c ? 1 : 0) + (s - 1) * ((r == c ? 1 : 0) - a[r] * a[c]) + (sf - s) * f[r] * f[c];
            m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
            //(v - c)A + c, 살찐 배는 모델 아래쪽으로 반지름 비례만큼 처진다
            const cx = b.c[0], cy = b.c[1], cz = b.c[2];
            const sag = _fat > 0 ? b.sag * (sf - 1) * b.r : 0;
            m[12] = cx - (cx * m[0] + cy * m[4] + cz * m[8]) + b.down[0] * sag;
            m[13] = cy - (cx * m[1] + cy * m[5] + cz * m[9]) + b.down[1] * sag;
            m[14] = cz - (cx * m[2] + cy * m[6] + cz * m[10]) + b.down[2] * sag;
            this.mM.UnitCheck();
            const pst = node.mData.pst;
            pst.Import(CMath.MatMul(this.mM, pst));
        }
    }
}
