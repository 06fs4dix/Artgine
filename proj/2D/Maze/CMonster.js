import { CAniFlow } from "../../../artgine/canvas/component/CAniFlow.js";
import { CAnimation, CClipColorAlpha, CClipDestroy } from "../../../artgine/canvas/component/CAnimation.js";
import CBehavior from "../../../artgine/canvas/component/CBehavior.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import { CForce } from "../../../artgine/canvas/component/CForce.js";
import { CRigidBody } from "../../../artgine/canvas/component/CRigidBody.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CBound } from "../../../artgine/geometry/CBound.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CH5Canvas } from "../../../artgine/render/CH5Canvas.js";
import { CCurve } from "../../../artgine/util/CCurve.js";
export default class CMonster extends CBehavior {
    m_enemy = null;
    m_rp;
    m_time = 0;
    m_monType = "";
    constructor(_rp, _monType = "") {
        super();
        this.m_rp = _rp;
        this.m_monType = _monType;
    }
    Start() {
        let sub = this.GetOwner();
        CH5Canvas.Init(128, 128);
        CH5Canvas.StrokeStyle("black");
        CH5Canvas.StrokeCircle(64, 64, 60, 8);
        CH5Canvas.FillStyle("green");
        CH5Canvas.FillCircle(64, 64, 60);
        CH5Canvas.Draw(null);
        let tex = CH5Canvas.GetNewTex();
        sub.GetFrame().Res().Push("circle_mon.tex", tex);
        sub.GetFrame().Ren().BuildTexture(tex);
        let pt;
        if (this.m_monType == "acid_blob")
            pt = sub.PushComp(new CPaint2D("dc-mon/acid_blob.png", new CVec2(32, 32)));
        else
            pt = sub.PushComp(new CPaint2D("circle_mon.tex", new CVec2(32, 32)));
        pt.SetPos(new CVec3(0, 0, 1));
        pt.SetRenderPass(this.m_rp);
        let cl = sub.PushComp(new CCollider(pt));
        cl.SetLayer("mon");
        cl.PushCollisionLayer(["block", "user"]);
        let bound = new CBound();
        bound.mMin = new CVec3(-300, -300, -300);
        bound.mMax = new CVec3(300, 300, 300);
        bound.mType = CBound.eType.Box;
        cl = sub.PushComp(new CCollider(bound));
        cl.SetLayer("monSearch");
        cl.SetTrigger(true);
        cl.PushCollisionLayer("user");
        let rb = sub.PushComp(new CRigidBody());
        rb.SetRestitution(2);
    }
    Trigger(_org, _size, _tar) {
        this.m_enemy = _tar[0];
    }
    Collision(_org, _size, _tar, _push) {
        if (_tar[0].GetLayer() != "user")
            return;
        this.m_time = -4000;
        this.GetOwner().FindComp(CRigidBody).Clear();
        this.GetOwner().RemoveComps(CAniFlow);
        let ani = new CAnimation();
        let clip = ani.Push(new CClipColorAlpha(0, 4000, new CVec4(0, 0, 0, 0), new CVec4(1, 1, 1, 0)));
        clip.mCurve.mType = CCurve.eType.LinearCoodi;
        clip.mCurve.mPosArr.push(new CVec2(0.15, 1));
        clip.mCurve.mPosArr.push(new CVec2(0.3, 0));
        clip.mCurve.mPosArr.push(new CVec2(0.45, 1));
        clip.mCurve.mPosArr.push(new CVec2(0.6, 0));
        clip.mCurve.mPosArr.push(new CVec2(0.75, 1));
        clip.mCurve.mPosArr.push(new CVec2(0.9, 0));
        clip.mCurve.mPosArr.push(new CVec2(1, 0));
        ani.Push(new CClipDestroy(4000));
        this.GetOwner().PushComp(new CAniFlow(ani));
    }
    Update(_delay) {
        if (this.m_time > 200) {
            this.m_time = 0;
            this.GetOwner().FindComp(CRigidBody).Clear();
            if (this.m_enemy != null) {
                let dir = CMath.V3SubV3(this.m_enemy.GetOwner().GetPos(), this.GetOwner().GetPos());
                dir = CMath.V3Nor(dir);
                this.GetOwner().FindComp(CRigidBody).Push(new CForce("move", dir, 50));
            }
        }
        this.m_time += _delay;
        this.m_enemy = null;
    }
}
