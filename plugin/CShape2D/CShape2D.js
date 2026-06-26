import { CAniFlow } from "../../artgine/app/component/CAniFlow.js";
import { CAtelier } from "../../artgine/app/CAtelier.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CCollider } from "../../artgine/app/component/CCollider.js";
import { CCondition } from "../../artgine/util/CCondition.js";
import { CForce } from "../../artgine/app/component/CForce.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CRPAuto } from "../../artgine/app/canvas/CRPMgr.js";
import { CRigidBody } from "../../artgine/app/component/CRigidBody.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
export class CShape2D extends CSubject {
    static sDefaultTag = "CS2D";
    static sDefaultRPRegistered = false;
    mPaint;
    constructor(_opt = {}) {
        super();
        let texKey = null;
        let normalKey = null;
        if (_opt.texture) {
            if (Array.isArray(_opt.texture)) {
                [texKey, normalKey] = _opt.texture;
            }
            else {
                texKey = _opt.texture;
            }
        }
        this.mPaint = new CPaint2D(texKey, _opt.size || null);
        if (normalKey)
            this.mPaint.PushNormalMap(normalKey);
        if (_opt.pos)
            this.SetPos(_opt.pos);
        if (_opt.rot)
            this.SetRot(_opt.rot);
        if (_opt.sca !== undefined) {
            this.SetSca(_opt.sca instanceof CVec3 ? _opt.sca : new CVec3(_opt.sca, _opt.sca, _opt.sca));
        }
        if (_opt.pivot)
            this.mPaint.SetPivot(_opt.pivot);
        if (_opt.color)
            this.mPaint.SetColorModel(_opt.color);
        if (_opt.alpha)
            this.mPaint.SetAlphaModel(_opt.alpha);
        if (_opt.texCodi)
            this.mPaint.SetTexCodi(_opt.texCodi);
        if (_opt.billboard)
            this.mPaint.SetBillBoard(true);
        if (_opt.ySort) {
            this.mPaint.SetYSort(true);
            if (typeof _opt.ySort === 'object' && _opt.ySort.origin !== undefined) {
                this.mPaint.SetYSortOrigin(_opt.ySort.origin);
            }
        }
        if (_opt.wind !== undefined)
            this.mPaint.Wind(_opt.wind);
        if (_opt.cullFace !== undefined || _opt.wireframe !== undefined || _opt.priority !== undefined) {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            if (_opt.cullFace !== undefined)
                rp.mCullFace = _opt.cullFace;
            if (_opt.wireframe !== undefined)
                rp.mLine = _opt.wireframe;
            if (_opt.priority !== undefined)
                rp.mPriority = _opt.priority;
            this.mPaint.PushRenderPass(rp);
        }
        if (_opt.uniforms) {
            for (const u of _opt.uniforms) {
                this.mPaint.PushCShaderAttr(new CShaderAttr(u.key, u.val));
            }
        }
        let rb;
        if (_opt.rigidBody) {
            rb = new CRigidBody();
            if (_opt.rigidBody.gravity !== undefined)
                rb.SetGravity(_opt.rigidBody.gravity);
            if (_opt.rigidBody.freezePos)
                rb.mFreezePos = _opt.rigidBody.freezePos;
            this.PushComp(rb);
        }
        if (_opt.forces) {
            if (!rb) {
                rb = new CRigidBody();
                this.PushComp(rb);
            }
            for (const f of _opt.forces) {
                rb.Push(new CForce(f.key, f.dir, f.vel));
            }
        }
        if (_opt.collider) {
            const col = new CCollider(this.mPaint, rb);
            col.SetEvent(_opt.collider.event);
            if (_opt.collider.layer)
                col.SetLayer(_opt.collider.layer);
            if (_opt.collider.collisionWith)
                col.PushCollisionLayer(_opt.collider.collisionWith);
            if (_opt.collider.boundType !== undefined)
                col.SetBoundType(_opt.collider.boundType);
            if (_opt.collider.pickMouse)
                col.SetPickMouse(true);
            this.PushComp(col);
        }
        if (_opt.tags) {
            for (const tag of _opt.tags) {
                this.mPaint.PushTag(tag);
            }
        }
        if (_opt.animation) {
            this.PushComp(new CAniFlow(_opt.animation));
        }
        this.mPaint.PushTag(CShape2D.sDefaultTag);
        if (!CShape2D.sDefaultRPRegistered) {
            const defRP = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            defRP.PushAnd(new CCondition("mTag[" + CShape2D.sDefaultTag + "]"));
            CAtelier.Main().Brush().SetAutoRP("CShape2D_Default", defRP);
            CShape2D.sDefaultRPRegistered = true;
        }
        this.PushComp(this.mPaint);
    }
    GetPaint() { return this.mPaint; }
}
CClass.Push(CShape2D);
