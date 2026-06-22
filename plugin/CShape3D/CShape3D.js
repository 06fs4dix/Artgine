import { CAniFlow } from "../../artgine/app/component/CAniFlow.js";
import { CAtelier } from "../../artgine/app/CAtelier.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CCollider } from "../../artgine/app/component/CCollider.js";
import { CCondition } from "../../artgine/util/CCondition.js";
import CEnvMap from "../../artgine/app/component/CEnvMap.js";
import { CForce } from "../../artgine/app/component/CForce.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CLight } from "../../artgine/app/component/CLight.js";
import { CLoaderOption } from "../../artgine/util/CLoader.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CRPAuto } from "../../artgine/app/canvas/CRPMgr.js";
import { CRigidBody } from "../../artgine/app/component/CRigidBody.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
export class CShape3D extends CSubject {
    static sDefaultTag = "CS3D";
    static sDefaultRPRegistered = false;
    mPaint;
    constructor(_opt = {}) {
        super();
        let meshKey;
        if (_opt.model) {
            meshKey = _opt.model;
        }
        else {
            const pal = CFrame.Main().Pal();
            switch (_opt.shape || 'box') {
                case 'sphere':
                    meshKey = pal.GetSphereMesh();
                    break;
                case 'plane':
                    meshKey = pal.GetPlaneMesh();
                    break;
                default:
                    meshKey = pal.GetBoxMesh();
                    break;
            }
        }
        this.mPaint = new CPaint3D(meshKey, _opt.centerPos || false, _opt.targetScale || 0);
        if (_opt.autoLoad !== false) {
            this.mPaint.SetAutoLoad(_opt.autoLoad instanceof CLoaderOption ? _opt.autoLoad : true);
        }
        if (_opt.pos)
            this.SetPos(_opt.pos);
        if (_opt.rot)
            this.SetRot(_opt.rot);
        if (_opt.sca !== undefined) {
            this.SetSca(_opt.sca instanceof CVec3 ? _opt.sca : new CVec3(_opt.sca, _opt.sca, _opt.sca));
        }
        if (_opt.color)
            this.mPaint.SetColorModel(_opt.color);
        if (_opt.alpha)
            this.mPaint.SetAlphaModel(_opt.alpha);
        if (_opt.texture) {
            if (Array.isArray(_opt.texture)) {
                const [a, b, c, d, e] = _opt.texture;
                this.mPaint.SetTexture(a, b, c, d, e);
            }
            else {
                this.mPaint.SetTexture(_opt.texture);
            }
        }
        if (_opt.texCodi)
            this.mPaint.SetTexCodi(_opt.texCodi);
        if (_opt.roughness !== undefined || _opt.metallic !== undefined ||
            _opt.emissive !== undefined || _opt.ambientOcclusion !== undefined) {
            this.mPaint.SetMaterial(_opt.roughness ?? -1, _opt.metallic ?? -1, _opt.emissive ?? 1, _opt.ambientOcclusion ?? 1);
        }
        if (_opt.vfx) {
            for (const v of _opt.vfx) {
                this.mPaint.SetVFX(v.slot, v.type, v.params);
            }
        }
        if (_opt.shadow) {
            this.mPaint.PushTag(_opt.shadow === 'readOnly' ? 'shadowReadOnly' : 'shadow');
        }
        if (_opt.wind !== undefined)
            this.mPaint.Wind(_opt.wind);
        if (_opt.parallax !== undefined)
            this.mPaint.ParallaxNormal(_opt.parallax);
        if (_opt.env) {
            if (_opt.env === true) {
                this.mPaint.Env();
            }
            else {
                const env = _opt.env;
                const envMap = new CEnvMap(env.cycle || 0);
                if (env.readTag)
                    envMap.mReadTag = env.readTag;
                if (env.readLen !== undefined)
                    envMap.mReadLen = env.readLen;
                this.PushComp(envMap);
                this.mPaint.Env();
            }
        }
        if (_opt.bake)
            this.mPaint.Bake();
        if (_opt.cullFace !== undefined || _opt.wireframe !== undefined || _opt.priority !== undefined) {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
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
        if (_opt.light) {
            const lit = new CLight();
            if (_opt.light.type === 'point') {
                lit.SetPoint(_opt.light.outerRadius || 100, _opt.light.innerRadius || 1);
            }
            else {
                lit.SetDirect(-1);
            }
            if (_opt.light.dirPos)
                lit.SetDirectPos(_opt.light.dirPos);
            if (_opt.light.color)
                lit.SetColor(_opt.light.color);
            if (_opt.light.shadowDistance !== undefined)
                lit.SetShadowDistance(_opt.light.shadowDistance);
            this.PushComp(lit);
        }
        if (_opt.tags) {
            for (const tag of _opt.tags) {
                this.mPaint.PushTag(tag);
            }
        }
        if (_opt.animation) {
            this.PushComp(new CAniFlow(_opt.animation));
        }
        this.mPaint.PushTag(CShape3D.sDefaultTag);
        if (!CShape3D.sDefaultRPRegistered) {
            const defRP = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            defRP.PushAnd(new CCondition("mTag[" + CShape3D.sDefaultTag + "]"));
            CAtelier.Main().Brush().SetAutoRP("CShape3D_Default", defRP);
            CShape3D.sDefaultRPRegistered = true;
        }
        this.PushComp(this.mPaint);
    }
    GetPaint() { return this.mPaint; }
}
CClass.Push(CShape3D);
