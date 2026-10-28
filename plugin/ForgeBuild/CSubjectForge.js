import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CCollider } from "../../artgine/app/component/CCollider.js";
export class CSubjectForge extends CSubject {
    static sUnit = 100;
    static sClosed = 0.02;
    mBlockEvent = CCollider.eEvent.Static;
    mMover = new Map();
    AddPart(_def, _sub, _col) {
        const m = { def: _def, sub: _sub, col: _col, p: 0, to: 0, play: false, block: true };
        this.mMover.set(_def.key, m);
        this.Pose(m);
    }
    GetActions() {
        const out = [];
        for (const m of this.mMover.values()) {
            const d = m.def, h = d.hull;
            let cx = 0, cy = 0, cz = 0;
            if (h != null && h.length > 0) {
                for (const q of h) {
                    cx += q[0];
                    cy += q[1];
                    cz += q[2];
                }
                cx /= h.length;
                cy /= h.length;
                cz /= h.length;
            }
            else if (d.focus != null) {
                cx = d.focus[0];
                cy = d.focus[1];
                cz = d.focus[2];
            }
            else
                cy = 0.4;
            out.push({ key: d.key, kind: d.kind, pos: [d.pivot[0] + cx, d.pivot[1] + cy, d.pivot[2] + cz], p: m.p, on: m.to >= 0.5, play: m.play });
        }
        return out;
    }
    GetBlockers() {
        const out = [];
        for (const m of this.mMover.values()) {
            const d = m.def;
            if (!m.block || d.hull == null || m.p > CSubjectForge.sClosed)
                continue;
            out.push(d.hull.map(q => [q[0] + d.pivot[0], q[1] + d.pivot[1], q[2] + d.pivot[2]]));
        }
        return out;
    }
    GetKeys() { return [...this.mMover.keys()]; }
    GetProgress(_key) { return this.mMover.get(_key)?.p ?? -1; }
    IsPlaying(_key) { return this.mMover.get(_key)?.play ?? false; }
    ForgeAction(_key, _value) {
        let n = 0;
        const all = _key.endsWith("*"), head = _key.slice(0, -1);
        for (const [k, m] of this.mMover) {
            if (all ? !k.startsWith(head) : k != _key)
                continue;
            n++;
            if (typeof _value == "boolean") {
                m.to = _value ? 1 : 0;
                m.play = m.p != m.to;
            }
            else {
                m.p = Math.min(1, Math.max(0, _value));
                m.to = m.p;
                m.play = false;
                this.Pose(m);
            }
        }
        return n;
    }
    Update(_update) {
        super.Update(_update);
        if (this.mMover.size == 0)
            return;
        const dt = Math.min(Math.max(_update.DeltaTime(), 0), 0.1);
        for (const m of this.mMover.values()) {
            if (!m.play)
                continue;
            const x = 2 * m.p - 1, speed = (0.2 + 1.2 * (1 - x * x)) / Math.max(0.05, m.def.dur), step = speed * dt;
            if (m.to > m.p)
                m.p = Math.min(m.to, m.p + step);
            else
                m.p = Math.max(m.to, m.p - step);
            if (m.p == m.to)
                m.play = false;
            this.Pose(m);
        }
    }
    Pose(_m) {
        const d = _m.def, U = CSubjectForge.sUnit, p = _m.p;
        _m.sub.SetPos(new CVec3((d.pivot[0] + d.slide[0] * p) * U, (d.pivot[1] + d.slide[1] * p) * U, (d.pivot[2] + d.slide[2] * p) * U));
        const a = d.angle * p;
        _m.sub.SetRot(new CVec3(d.axis[0] * a, d.axis[1] * a, d.axis[2] * a));
        const block = p <= CSubjectForge.sClosed;
        if (block == _m.block)
            return;
        _m.block = block;
        for (const c of _m.col)
            c.SetEvent(block ? this.mBlockEvent : CCollider.eEvent.None);
    }
}
