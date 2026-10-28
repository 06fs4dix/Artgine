import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
export class CAvatarIK {
    mTmp = new CMat();
    static Pos(_n) { const a = _n.mData.pst.mF32A; return new CVec3(a[12], a[13], a[14]); }
    static Sub(_n, _out = []) {
        _out.push(_n);
        for (let c = _n.mChild; c != null; c = c.mColleague)
            CAvatarIK.Sub(c, _out);
        return _out;
    }
    Rotate(_n, _p, _q) {
        const r = CMath.QutToMat(_q);
        const m = this.mTmp;
        m.Import(r);
        const a = m.mF32A;
        a[12] = _p.x - (_p.x * a[0] + _p.y * a[4] + _p.z * a[8]);
        a[13] = _p.y - (_p.x * a[1] + _p.y * a[5] + _p.z * a[9]);
        a[14] = _p.z - (_p.x * a[2] + _p.y * a[6] + _p.z * a[10]);
        m.UnitCheck();
        for (const s of CAvatarIK.Sub(_n)) {
            const pst = s.mData.pst;
            pst.Import(CMath.MatMul(pst, m));
        }
    }
    TwoBone(_hip, _knee, _foot, _target) {
        const footRot = new CMat();
        footRot.Import(_foot.mData.pst);
        const h = CAvatarIK.Pos(_hip), k = CAvatarIK.Pos(_knee), f = CAvatarIK.Pos(_foot);
        const a = CMath.V3Distance(h, k), b = CMath.V3Distance(k, f);
        if (a < 1e-5 || b < 1e-5)
            return;
        const d = Math.min(CMath.V3Distance(h, _target), a + b - 1e-3);
        const cosK = Math.min(1, Math.max(-1, (a * a + b * b - d * d) / (2 * a * b)));
        const want = Math.acos(cosK);
        const kh = CMath.V3Nor(CMath.V3SubV3(h, k)), kf = CMath.V3Nor(CMath.V3SubV3(f, k));
        const now = Math.acos(Math.min(1, Math.max(-1, CMath.V3Dot(kh, kf))));
        let axis = CMath.V3Cross(kh, kf);
        if (CMath.V3Len(axis) > 1e-6 && Math.abs(want - now) > 1e-4) {
            axis = CMath.V3Nor(axis);
            const s = Math.sin((want - now) * 0.5);
            this.Rotate(_knee, k, new CVec4(axis.x * s, axis.y * s, axis.z * s, Math.cos((want - now) * 0.5)));
        }
        const f2 = CAvatarIK.Pos(_foot);
        const from = CMath.V3Nor(CMath.V3SubV3(f2, h)), to = CMath.V3Nor(CMath.V3SubV3(_target, h));
        this.Rotate(_hip, h, CMath.FromToRotation(from, to));
        const fp = _foot.mData.pst, now2 = new CMat();
        now2.Import(fp);
        footRot.mF32A[12] = fp.mF32A[12];
        footRot.mF32A[13] = fp.mF32A[13];
        footRot.mF32A[14] = fp.mF32A[14];
        const fix = CMath.MatMul(CMath.MatInvert(now2), footRot);
        for (const s of CAvatarIK.Sub(_foot))
            s.mData.pst.Import(CMath.MatMul(s.mData.pst, fix));
    }
}
export class CAvatarFoot {
    mIK = new CAvatarIK();
    mDrop = 0;
    mLift = [0, 0];
    static sMin = 0.5;
    static sSmooth = 12;
    Apply(_tree, _fmat, _ground, _baseY, _dt) {
        const legs = [["thigh_l", "calf_l", "foot_l"], ["thigh_r", "calf_r", "foot_r"]];
        const nodes = legs.map(l => l.map(n => _tree.Find(n)));
        if (nodes.some(l => l.some(n => n == null)))
            return 0;
        const g = nodes.map(l => {
            const w = CMath.V3MulMatCoordi(CAvatarIK.Pos(l[2]), _fmat);
            return { w, h: _ground(w.x, w.z) - _baseY };
        });
        const k = Math.min(1, _dt * CAvatarFoot.sSmooth);
        const drop = Math.max(0, -Math.min(g[0].h, g[1].h));
        this.mDrop += (drop - this.mDrop) * k;
        const inv = CMath.MatInvert(_fmat);
        for (let i = 0; i < 2; i++) {
            const lift = g[i].h + this.mDrop;
            this.mLift[i] += (lift - this.mLift[i]) * k;
            if (this.mLift[i] < CAvatarFoot.sMin)
                continue;
            const t = CMath.V3MulMatCoordi(new CVec3(g[i].w.x, g[i].w.y + this.mLift[i], g[i].w.z), inv);
            this.mIK.TwoBone(nodes[i][0], nodes[i][1], nodes[i][2], t);
        }
        return this.mDrop;
    }
}
