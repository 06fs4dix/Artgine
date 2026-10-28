import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CAvatarCloth } from "./CAvatarCloth.js";
export class CAvatarFat {
    static sFat = 0.6;
    static sThin = 0.12;
    static sBone = [
        ["pelvis", 0.85, 0.6, 0.15, 0.6], ["spine_01", 1.0, 1.0, 0.3, 1.0], ["spine_02", 0.85, 0.6, 0.15, 0.85], ["spine_03", 0.75, 0.2, 0.05, 0.5], ["clavicle", 0.35, 0, 0, 0],
        ["neck", 0.85, 0, 0, 0], ["Head", 0.12, 0, 0, 0], ["upperarm", 0.85, 0, 0, 0], ["lowerarm", 0.5, 0, 0, 0], ["hand", 0.1, 0, 0, 0],
        ["thigh", 0.55, 0, 0, 0], ["calf", 0.3, 0, 0, 0], ["foot", 0.05, 0, 0, 0],
    ];
    mBone = [];
    static Build(_body) {
        const out = new CAvatarFat();
        const geo = CAvatarCloth.BodyNodes(_body).map(n => {
            const ci = n.mData.ci;
            return { g: CAvatarCloth.Geo(ci), w: ci.GetVFType(CVertexFormat.eIdentifier.Weight)[0]?.bufF.GetArray(), j: ci.GetVFType(CVertexFormat.eIdentifier.WeightIndex)[0]?.bufF.GetArray() };
        }).filter(e => e.g != null && e.w != null && e.j != null);
        const Name = (_k) => _k.substring(_k.lastIndexOf(" ") + 1);
        const Local = (_m, _x, _y, _z) => {
            const a = _m.mF32A;
            return [_x * a[0] + _y * a[4] + _z * a[8] + a[12], _x * a[1] + _y * a[5] + _z * a[9] + a[13], _x * a[2] + _y * a[6] + _z * a[10] + a[14]];
        };
        const Dir = (_m, _x, _y, _z) => {
            const a = _m.mF32A, v = [_x * a[0] + _y * a[4] + _z * a[8], _x * a[1] + _y * a[5] + _z * a[9], _x * a[2] + _y * a[6] + _z * a[10]];
            const l = Math.hypot(v[0], v[1], v[2]) || 1;
            return [v[0] / l, v[1] / l, v[2] / l];
        };
        const Dot = (_a, _b) => _a[0] * _b[0] + _a[1] * _b[1] + _a[2] * _b[2];
        _body.skin.forEach((s, i) => {
            const name = Name(s.key), m = s.mat;
            const t = CAvatarFat.sBone.find(b => name.startsWith(b[0]));
            let a = null;
            for (let c = _body.meshTree.Find(name)?.mChild; c != null && a == null; c = c.mColleague) {
                const cs = _body.skin.find(x => Name(x.key) == c.mKey);
                if (cs == null)
                    continue;
                const cb = CMath.MatInvert(cs.mat).mF32A;
                const v = Local(m, cb[12], cb[13], cb[14]), l = Math.hypot(v[0], v[1], v[2]);
                if (l > 1e-5)
                    a = [v[0] / l, v[1] / l, v[2] / l];
            }
            if (a == null)
                a = Dir(m, 0, 1, 0);
            const f0 = Dir(m, 0, 0, 1), fa = Dot(f0, a);
            let f = [f0[0] - a[0] * fa, f0[1] - a[1] * fa, f0[2] - a[2] * fa];
            const fl = Math.hypot(f[0], f[1], f[2]) || 1;
            f = [f[0] / fl, f[1] / fl, f[2] / fl];
            let cx = 0, cy = 0, cz = 0, n = 0, back = Infinity;
            const pts = [];
            for (const e of geo)
                for (let v = 0; v < e.g.count; v++)
                    for (let k = 0; k < 4; k++)
                        if (e.j[v * 4 + k] == i && e.w[v * 4 + k] >= 0.4) {
                            const p = Local(m, e.g.pos[v * 3], e.g.pos[v * 3 + 1], e.g.pos[v * 3 + 2]);
                            pts.push(p);
                            cx += p[0];
                            cy += p[1];
                            cz += p[2];
                            n++;
                        }
            let c = [0, 0, 0];
            if (n > 0) {
                c = [cx / n, cy / n, cz / n];
                const ca = Dot(c, a);
                c = [c[0] - a[0] * ca, c[1] - a[1] * ca, c[2] - a[2] * ca];
                for (const p of pts)
                    back = Math.min(back, Dot([p[0] - c[0], p[1] - c[1], p[2] - c[2]], f));
            }
            const front = t?.[2] ?? 0;
            const shift = t?.[4] ?? 0;
            if (shift > 0 && isFinite(back))
                c = [c[0] + f[0] * back * shift, c[1] + f[1] * back * shift, c[2] + f[2] * back * shift];
            let r = 0;
            for (const p of pts) {
                const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], da = Dot(d, a);
                r += Math.hypot(d[0] - a[0] * da, d[1] - a[1] * da, d[2] - a[2] * da);
            }
            out.mBone.push({ name, a, c, f, down: Dir(m, 0, -1, 0), r: pts.length > 0 ? r / pts.length : 0, k: t?.[1] ?? 0, front, sag: t?.[3] ?? 0 });
        });
        return out;
    }
    mNode = null;
    mTree = null;
    mM = new CMat();
    Apply(_tree, _fat) {
        if (Math.abs(_fat) < 1e-3)
            return;
        if (this.mTree != _tree) {
            this.mTree = _tree;
            this.mNode = this.mBone.map(b => _tree.Find(b.name));
        }
        const m = this.mM.mF32A;
        for (let i = 0; i < this.mBone.length; i++) {
            const b = this.mBone[i], node = this.mNode[i];
            if (b.k == 0 || node == null)
                continue;
            const s = _fat > 0 ? 1 + b.k * CAvatarFat.sFat * _fat : Math.max(0.5, 1 + b.k * CAvatarFat.sThin * _fat);
            const sf = _fat > 0 ? s + (s - 1) * b.front : s;
            const a = b.a, f = b.f;
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    m[r * 4 + c] = (r == c ? 1 : 0) + (s - 1) * ((r == c ? 1 : 0) - a[r] * a[c]) + (sf - s) * f[r] * f[c];
            m[3] = 0;
            m[7] = 0;
            m[11] = 0;
            m[15] = 1;
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
