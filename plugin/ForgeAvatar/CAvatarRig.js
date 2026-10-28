import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
export class CAvatarRig {
    static eRig = { Auto: "Auto", R15: "R15", R6: "R6" };
    static sR15 = {
        LowerTorso: ["pelvis"],
        UpperTorso: ["spine_01", "spine_02", "spine_03"],
        Head: ["neck_01", "Head"],
        LeftUpperArm: ["clavicle_l", "upperarm_l"], LeftLowerArm: ["lowerarm_l"], LeftHand: ["hand_l"],
        RightUpperArm: ["clavicle_r", "upperarm_r"], RightLowerArm: ["lowerarm_r"], RightHand: ["hand_r"],
        LeftUpperLeg: ["thigh_l"], LeftLowerLeg: ["calf_l"], LeftFoot: ["foot_l", "ball_l"],
        RightUpperLeg: ["thigh_r"], RightLowerLeg: ["calf_r"], RightFoot: ["foot_r", "ball_r"],
    };
    static sR6Driver = new Set(["root", "pelvis", "Head", "upperarm_l", "upperarm_r", "thigh_l", "thigh_r", "bust_l", "bust_r"]);
    static sAlias = null;
    static sChain = null;
    static Chain() {
        if (CAvatarRig.sChain != null)
            return CAvatarRig.sChain;
        const m = {
            pelvis: "spine_01", spine_01: "spine_02", spine_02: "spine_03", spine_03: "neck_01", neck_01: "Head",
        };
        for (const s of ["l", "r"]) {
            m["clavicle_" + s] = "upperarm_" + s;
            m["upperarm_" + s] = "lowerarm_" + s;
            m["lowerarm_" + s] = "hand_" + s;
            m["thigh_" + s] = "calf_" + s;
            m["calf_" + s] = "foot_" + s;
            m["foot_" + s] = "ball_" + s;
        }
        CAvatarRig.sChain = m;
        return m;
    }
    static Alias() {
        if (CAvatarRig.sAlias != null)
            return CAvatarRig.sAlias;
        const m = new Map();
        const C = [
            ["Hips", "J_Bip_C_Hips", "LowerTorso", "pelvis"],
            ["Spine", "J_Bip_C_Spine", "UpperTorso", "spine_01"],
            ["Spine1", "J_Bip_C_Chest", "Spine", "spine_02"],
            ["Spine2", "J_Bip_C_UpperChest", "Chest", "spine_03"],
            ["Neck", "J_Bip_C_Neck", "HeadBase", "neck_01"],
            ["Head", "J_Bip_C_Head", "Head", "Head"],
        ];
        const S = [
            ["Shoulder", "Shoulder", "Clavicle", "clavicle"],
            ["Arm", "UpperArm", "UpperArm", "upperarm"],
            ["ForeArm", "LowerArm", "LowerArm", "lowerarm"],
            ["Hand", "Hand", "Hand", "hand"],
            ["UpLeg", "UpperLeg", "UpperLeg", "thigh"],
            ["Leg", "LowerLeg", "LowerLeg", "calf"],
            ["Foot", "Foot", "Foot", "foot"],
            ["ToeBase", "ToeBase", "ToeBase", "ball"],
        ];
        for (const [mix, vrm, rbx, std] of C) {
            m.set(mix, std);
            m.set(vrm, std);
            m.set(rbx, std);
        }
        for (const [side, v, s] of [["Left", "L", "l"], ["Right", "R", "r"]])
            for (const [mix, vrm, rbx, std] of S) {
                m.set(side + mix, std + "_" + s);
                m.set("J_Bip_" + v + "_" + vrm, std + "_" + s);
                m.set(side + rbx, std + "_" + s);
            }
        const H = [
            ["hips", "pelvis"], ["spine", "spine_01"], ["chest", "spine_02"], ["upperChest", "spine_03"],
            ["neck", "neck_01"], ["head", "Head"],
        ];
        const HS = [
            ["Shoulder", "clavicle"], ["UpperArm", "upperarm"], ["LowerArm", "lowerarm"], ["Hand", "hand"],
            ["UpperLeg", "thigh"], ["LowerLeg", "calf"], ["Foot", "foot"], ["Toes", "ball"],
        ];
        for (const [bone, std] of H)
            m.set(bone, std);
        for (const [side, s] of [["left", "l"], ["right", "r"]])
            for (const [bone, std] of HS)
                m.set(side + bone, std + "_" + s);
        m.set("Root", "root");
        CAvatarRig.sAlias = m;
        return m;
    }
    static Standard(_name) {
        const bare = _name.replace(/^mixamorig\d*[:_]?/i, "");
        return CAvatarRig.Alias().get(bare) ?? _name;
    }
    static Retarget(_mesh) {
        let n = 0;
        for (const node of _mesh.meshTree.GetArray()) {
            const std = CAvatarRig.Standard(node.mKey);
            if (std == node.mKey)
                continue;
            node.mKey = std;
            n++;
        }
        if (n > 0)
            _mesh.hash = null;
        return n;
    }
    static ApplyClip(_pose, _body, _anim) {
        if (_pose == null || _body?.meshTree == null || _anim?.meshTree == null)
            return false;
        const ident = new CVec4(0, 0, 0, 1);
        const Unit = (_q) => {
            if (_q == null)
                return ident;
            const s = _q.x * _q.x + _q.y * _q.y + _q.z * _q.z + _q.w * _q.w;
            return s > 0.5 ? _q : ident;
        };
        const Mul = (_a, _b) => CMath.QutMul(_b, _a);
        const Axis = (_n, _child) => {
            if (_n == null || _child == null)
                return null;
            for (let c = _n.mChild; c != null; c = c.mColleague) {
                if (c.mKey != _child)
                    continue;
                const p = c.mData?.pos;
                if (p == null)
                    return null;
                const l = p.x * p.x + p.y * p.y + p.z * p.z;
                if (l < 1e-8)
                    return null;
                const s = Math.sqrt(l);
                return new CVec3(p.x / s, p.y / s, p.z / s);
            }
            return null;
        };
        const Up = (_from, _to) => {
            const d = _from.x * _to.x + _from.y * _to.y + _from.z * _to.z;
            if (d > 0.999)
                return ident;
            if (d > -0.5)
                return CMath.FromToRotation(_from, _to);
            let ax = new CVec3(0, 1, 0);
            const du = _from.x * ax.x + _from.y * ax.y + _from.z * ax.z;
            ax = new CVec3(ax.x - _from.x * du, ax.y - _from.y * du, ax.z - _from.z * du);
            let l = ax.x * ax.x + ax.y * ax.y + ax.z * ax.z;
            if (l < 1e-6) {
                ax = new CVec3(0, 0, 1);
                const df = _from.x * ax.x + _from.y * ax.y + _from.z * ax.z;
                ax = new CVec3(ax.x - _from.x * df, ax.y - _from.y * df, ax.z - _from.z * df);
                l = ax.x * ax.x + ax.y * ax.y + ax.z * ax.z;
            }
            const s = Math.sqrt(l);
            return CMath.QutAxisToRotation(new CVec3(ax.x / s, ax.y / s, ax.z / s), Math.PI);
        };
        const Refresh = (_n) => {
            const d = _n.mData;
            const q = d.rot;
            if (q != null && q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w <= 0.5)
                d.rot = new CVec4(0, 0, 0, 1);
            d.MatUpdate();
            if (_n.mParent?.mData?.pst != null)
                d.pst = CMath.MatMul(d.pst, _n.mParent.mData.pst);
            for (let ch = _n.mChild; ch != null; ch = ch.mColleague)
                Refresh(ch);
        };
        const chain = CAvatarRig.Chain();
        let changed = false;
        const Walk = (_n) => {
            for (let c = _n; c != null; c = c.mColleague) {
                const body = c.mKey == "Armature" || c.mData?.rot == null ? null : _body.meshTree.Find(c.mKey);
                const anim = body?.mData?.rot == null ? null : _anim.meshTree.Find(c.mKey);
                if (anim?.mData?.rot != null) {
                    const bd = Axis(body, chain[c.mKey]);
                    const ad = bd != null ? Axis(anim, chain[c.mKey]) : null;
                    const dot = bd != null && ad != null ? bd.x * ad.x + bd.y * ad.y + bd.z * ad.z : 1;
                    const raw = c.mData.rot;
                    const br = Unit(body.mData.rot), ar = Unit(anim.mData.rot), key = Unit(raw);
                    let out;
                    if (dot < 0.5) {
                        const F = Up(ad, bd);
                        out = Mul(br, Mul(F, Mul(Mul(CMath.QutInverse(ar), key), CMath.QutInverse(F))));
                    }
                    else
                        out = Mul(Mul(br, CMath.QutInverse(ar)), key);
                    const len = raw == null ? 0 : raw.x * raw.x + raw.y * raw.y + raw.z * raw.z + raw.w * raw.w;
                    const same = len > 0.5 && Number.isFinite(out.w) && Math.abs(out.x * key.x + out.y * key.y + out.z * key.z + out.w * key.w) > 0.9995;
                    if (!same && Number.isFinite(out.w)) {
                        c.mData.rot = out;
                        changed = true;
                    }
                }
                if (c.mChild != null)
                    Walk(c.mChild);
            }
        };
        Walk(_pose);
        if (changed)
            for (let n = _pose; n != null; n = n.mColleague)
                Refresh(n);
        return changed;
    }
    static Adapt(_mesh) {
        if (_mesh?.meshTree == null)
            return 0;
        const ren = new Map();
        for (const node of _mesh.meshTree.GetArray()) {
            const std = CAvatarRig.Standard(node.mKey);
            if (std == node.mKey)
                continue;
            ren.set(node.mKey, std);
            node.mKey = std;
        }
        if (ren.size == 0)
            return 0;
        const Rename = (_key) => {
            const bone = _key.substring(_key.lastIndexOf(" ") + 1);
            const std = ren.get(bone);
            return std == null ? _key : _key.slice(0, _key.length - bone.length) + std;
        };
        for (const s of _mesh.skin ?? [])
            s.key = Rename(s.key);
        for (const node of _mesh.meshTree.GetArray()) {
            const keys = node.mData?.skinKey;
            if (keys == null)
                continue;
            for (let i = 0; i < keys.length; i++)
                keys[i] = Rename(keys[i]);
        }
        _mesh.meshTree.mValueArr = null;
        _mesh.hash = null;
        return ren.size;
    }
    static Prune(_anim, _keep) {
        let n = 0;
        const Walk = (_t) => {
            const out = [];
            for (let ch = _t.mChild; ch != null; ch = ch.mColleague) {
                Walk(ch);
                if (_keep.has(ch.mKey)) {
                    out.push(ch);
                    continue;
                }
                n++;
                for (let g = ch.mChild; g != null; g = g.mColleague)
                    out.push(g);
            }
            _t.mChild = out.length > 0 ? out[0] : null;
            for (let i = 0; i < out.length; i++) {
                out[i].mParent = _t;
                out[i].mColleague = i + 1 < out.length ? out[i + 1] : null;
            }
        };
        Walk(_anim.meshTree);
        if (n > 0) {
            _anim.meshTree.mValueArr = null;
            _anim.hash = null;
        }
        return n;
    }
    static SkinMat(_mesh, _bone) {
        for (const s of _mesh.skin)
            if (s.key == _bone || s.key.endsWith(" " + _bone))
                return s.mat;
        return null;
    }
    static IsBone(_node, _mesh) {
        return CAvatarRig.SkinMat(_mesh, _node.mKey) != null;
    }
}
export class CAvatarPoseFix {
    mTree;
    mMesh;
    mR6 = null;
    mOrig = new Map();
    mHead = null;
    mTmp = new CMat();
    mTmp2 = new CMat();
    constructor(mTree, mMesh) {
        this.mTree = mTree;
        this.mMesh = mMesh;
    }
    BuildR6() {
        this.mR6 = [];
        const Walk = (_n, _driver) => {
            let driver = _driver;
            const mat = CAvatarRig.SkinMat(this.mMesh, _n.mKey);
            if (mat != null) {
                const drive = CAvatarRig.sR6Driver.has(_n.mKey) || _driver == null;
                let rel = null;
                if (!drive) {
                    rel = new CMat();
                    CMath.MatMul(CMath.MatInvert(mat), CAvatarRig.SkinMat(this.mMesh, _driver.mKey), rel);
                }
                this.mR6.push({ node: _n, parent: _n.mParent, driver: _driver, rel, drive });
                this.mOrig.set(_n, new CMat());
                if (drive)
                    driver = _n;
            }
            for (let ch = _n.mChild; ch != null; ch = ch.mColleague)
                Walk(ch, driver);
        };
        Walk(this.mTree, null);
    }
    ApplyR6() {
        if (this.mR6 == null)
            this.BuildR6();
        for (const b of this.mR6)
            this.mOrig.get(b.node).Import(b.node.mData.pst);
        for (const b of this.mR6) {
            const pst = b.node.mData.pst;
            if (b.drive) {
                const po = b.parent == null ? null : this.mOrig.get(b.parent);
                if (po == null)
                    continue;
                CMath.MatMul(this.mOrig.get(b.node), CMath.MatInvert(po, this.mTmp2), this.mTmp);
                CMath.MatMul(this.mTmp, b.parent.mData.pst, pst);
            }
            else
                CMath.MatMul(b.rel, b.driver.mData.pst, pst);
        }
    }
    ApplyHead(_scale) {
        if (Math.abs(_scale - 1) < 1e-4)
            return;
        if (this.mHead == null) {
            const head = this.mTree.Find("Head");
            this.mHead = head == null ? [] : [head];
            for (let i = 0; i < this.mHead.length; i++)
                for (let ch = this.mHead[i].mChild; ch != null; ch = ch.mColleague)
                    this.mHead.push(ch);
        }
        if (this.mHead.length == 0)
            return;
        const head = this.mHead[0].mData.pst;
        const inv = CMath.MatInvert(head, this.mTmp2);
        const next = CMath.MatMul(CMath.MatScale(new CVec3(_scale, _scale, _scale)), head);
        for (let i = 1; i < this.mHead.length; i++) {
            const p = this.mHead[i].mData.pst;
            CMath.MatMul(CMath.MatMul(p, inv), next, p);
        }
        head.Import(next);
    }
}
