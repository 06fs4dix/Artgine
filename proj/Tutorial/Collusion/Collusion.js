import "../../../artgine/artgine.js";
import { CPreferences } from "../../../artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "GL";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = true;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = true;
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = false;
gPF.mVersion = "mpuhzq22_109";
import { CAtelier } from "../../../artgine/app/CAtelier.js";
import { CPlugin } from "../../../artgine/util/CPlugin.js";
CPlugin.PushPath('Rapier', '../../../plugin/Rapier/');
import "../../../plugin/Rapier/Rapier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json'], "");
var Main = gAtl.Canvas('Main.json');
import { CPool } from "../../../artgine/basic/CPool.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CBound } from "../../../artgine/geometry/CBound.js";
import { CUpdate } from "../../../artgine/basic/Basic.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CBGAttachButton } from "../../../artgine/util/CModalUtil.js";
import { CRapier, CRapierCollider, CRapierRigidBody } from "../../../plugin/Rapier/Rapier.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CDOM } from "../../../artgine/basic/CDOM.js";
import { CCollider } from "../../../artgine/app/component/CCollider.js";
import { CColor } from "../../../artgine/render/CColor.js";
import { CPaint } from "../../../artgine/app/component/paint/CPaint.js";
import { CRigidBody } from "../../../artgine/app/component/CRigidBody.js";
import { CForce } from "../../../artgine/app/component/CForce.js";
import { CPaint3D } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CBehavior } from "../../../artgine/app/component/CBehavior.js";
var gPushMode = false;
class CControl extends CBehavior {
    mCollision = CUpdate.eType.Not;
    mPush = new CVec3();
    mSleep = 0;
    Trigger(_org, _size, _tar) {
        this.GetOwner().FindComp(CPaint).SetColorModel(new CColor(1, 0, 0, CColor.eModel.RGBMul));
        this.mCollision = CUpdate.eType.Updated;
    }
    Collision(_org, _size, _tar, _push) {
        this.GetOwner().FindComp(CPaint).SetColorModel(new CColor(1, 0, 0, CColor.eModel.RGBMul));
        this.mCollision = CUpdate.eType.Updated;
        this.mPush = CMath.V3MulFloat(_push[0], -1);
    }
    Start() {
        this.mCollision = CUpdate.eType.Not;
        this.mSleep = 0;
        this.mPush = new CVec3();
        this.NewForce();
    }
    Update(_update) {
        if (this.mCollision == CUpdate.eType.Updated) {
            this.mCollision = CUpdate.eType.Already;
            if (gPushMode)
                this.GetOwner().FindComp(CRigidBody).Clear();
        }
        else if (this.mCollision == CUpdate.eType.Already) {
            this.GetOwner().FindComp(CPaint).SetColorModel(new CColor(0, 0, 0, CColor.eModel.None));
            if (gPushMode)
                this.GetOwner().FindComp(CRigidBody).Push(new CForce("move", CMath.V3Nor(this.mPush), 200));
            this.mCollision = CUpdate.eType.Not;
        }
        let pos = this.GetOwner().GetPos();
        let len = CMath.V3Len(pos);
        if (this.mSleep <= 0) {
            if (len > 1000) {
                this.GetOwner().FindComp(CRigidBody).Clear();
                let force = new CForce("move", CMath.V3MulFloat(CMath.V3Nor(pos), -1), 200);
                this.GetOwner().FindComp(CRigidBody).Push(force);
                this.mSleep = 1000;
            }
            else if (len < 10) {
                this.GetOwner().FindComp(CRigidBody).Clear();
                this.NewForce();
                this.mSleep = 1000;
            }
        }
        else
            this.mSleep -= _update.DeltaMil();
    }
    NewForce() {
        this.GetOwner().FindComp(CRigidBody).Push(new CForce("move", CMath.V3Nor(new CVec3(Math.random() - 0.5, Math.random() - 0.5)), 200));
    }
}
CPool.On("Box", () => {
    let sub = new CSubject();
    let pt = sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(gAtl.Frame().Pal().GetNoneTex());
    let cl = sub.PushComp(new CCollider(pt));
    cl.SetLayer("basic");
    cl.PushCollisionLayer("basic");
    let rb = sub.PushComp(new CRigidBody());
    cl.SetRestitution();
    sub.SetSca(new CVec3(0.1, 0.1, 0.1));
    sub.PushComp(new CControl());
    return sub;
}, CPool.ePool.Product);
CPool.On("Sphere", () => {
    let sub = new CSubject();
    let pt = sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetSphereMesh()));
    pt.SetTexture(gAtl.Frame().Pal().GetNoneTex());
    let cl = sub.PushComp(new CCollider(pt));
    cl.SetLayer("basic");
    cl.PushCollisionLayer("basic");
    cl.SetBoundType(CBound.eType.Sphere);
    let rb = sub.PushComp(new CRigidBody());
    cl.SetRestitution();
    sub.SetSca(new CVec3(0.1, 0.1, 0.1));
    sub.PushComp(new CControl());
    return sub;
}, CPool.ePool.Product);
var gRapier = false;
await CRapier.Init();
const h = 500;
const t = 10000;
const hz = 10000;
CRapier.PushCuboid(-gAtl.PF().mWidth * 0.5 - h, 0, 0, h, t, hz);
CRapier.PushCuboid(gAtl.PF().mWidth * 0.5 + h, 0, 0, h, t, hz);
CRapier.PushCuboid(0, -gAtl.PF().mHeight * 0.5 - h, 0, t, h, hz);
CRapier.PushCuboid(0, gAtl.PF().mHeight * 0.5 + h, 0, t, h, hz);
CRapier.PushCuboid(0, 0, -t, t, t, h);
CRapier.PushCuboid(0, 0, t, t, t, h);
gAtl.Frame().PushEvent(CEvent.eType.Update, (_delay) => {
    CRapier.Update(_delay);
});
async function Init() {
    Main.Clear();
    const pushCheckbox = CDOM.IDInput('pushCheckbox');
    const countInput = CDOM.IDInput('countInput');
    const typeSelect = CDOM.IDInput('typeSelect');
    gPushMode = pushCheckbox.checked;
    let count = Number(countInput.value);
    for (let i = 0; i < count; ++i) {
        if (gRapier) {
            let sub = Main.PushSub(new CSubject());
            let pt = sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
            pt.SetTexture(gAtl.Frame().Pal().GetNoneTex());
            let bound = new CBound();
            bound.mMin.x = -10;
            bound.mMin.y = -10;
            bound.mMin.z = -10;
            bound.mMax.x = 10;
            bound.mMax.y = 10;
            bound.mMax.z = 10;
            const tick = 10000000;
            let rrb = sub.PushComp(new CRapierRigidBody());
            rrb.SetFreezePos(false, false, true);
            let rcl = sub.PushComp(new CRapierCollider(pt, rrb));
            rcl.SetFriction(0);
            rcl.SetRestitution(1);
            if (gPushMode) {
                rcl.SetEvent(CCollider.eEvent.Collision);
                rrb.SetGravity(100);
                rcl.SetFriction(1);
            }
            else {
                rcl.SetEvent(CCollider.eEvent.Trigger);
                sub.Update = () => {
                    let pos = sub.GetPos();
                    let len = CMath.V3Len(pos);
                    if (len > 1000) {
                        let dir = CMath.V3MulFloat(CMath.V3Nor(pos), -1);
                        rrb.Linvel(new CVec3(200 * dir.x, 200 * dir.y));
                    }
                };
            }
            sub.SetPos(new CVec3(Math.random() * 1000 - 500, Math.random() * 500 - 250));
            sub.SetSca(new CVec3(0.1, 0.1, 0.1));
            rrb.Impulse(new CVec3(tick * Math.random() - tick * 0.5, tick * Math.random() - tick * 0.5));
        }
        else {
            let type = typeSelect.value;
            if (type == "Box_Sphere") {
                if (Math.random() > 0.5)
                    type = "Sphere";
                else
                    type = "Box";
            }
            let sub = await CPool.Product(type);
            sub.SetPos(new CVec3(Math.random() * 1000 - 500, Math.random() * 1000 - 500));
            sub.SetSca(new CVec3(0.1, 0.1, 0.1));
            let col = sub.FindComp(CCollider);
            if (gPushMode == false) {
                col.SetEvent(CCollider.eEvent.Trigger);
            }
            else {
                col.SetEvent(CCollider.eEvent.Collision);
                col.SetRestitution(0.5);
            }
            Main.PushSub(sub);
        }
    }
}
let option = new CBGAttachButton("option_btn");
option.SetTitleText("Option");
option.SetContent(`
    
  <div class="form-check mb-3">
    <input class="form-check-input" type="checkbox" id="pushCheckbox">
    <label class="form-check-label" for="pushCheckbox">
      Push
    </label>
  </div>
 

  <div class="mb-3">
    <label for="countInput" class="form-label">Count</label>
    <input type="number" class="form-control" id="countInput" placeholder="Enter count" value='100'>
  </div>

  <div class="mb-3">
    <label for="typeSelect" class="form-label">Type</label>
    <select class="form-select" id="typeSelect">
      <option value="Box">Box</option>
      <option value="Sphere">Sphere</option>
      <option value="Box_Sphere">BoxSphere</option>
    </select>
  </div>

   <div class="form-check mb-3">
    <input class="form-check-input" type="checkbox" id="rapierCheckbox">
    <label class="form-check-label" for="rapierCheckbox">
      Rapier(Plugin)
    </label>
  </div>

    
`);
const pushCheckbox = CDOM.IDInput('pushCheckbox');
const rapierCheckbox = CDOM.IDInput('rapierCheckbox');
const countInput = CDOM.IDInput('countInput');
const typeSelect = CDOM.IDInput('typeSelect');
pushCheckbox.addEventListener('change', () => {
    Init();
});
countInput.addEventListener('input', () => {
    Init();
});
typeSelect.addEventListener('change', () => {
    Init();
});
rapierCheckbox.addEventListener('change', () => {
    gRapier = rapierCheckbox.checked;
    Init();
});
Init();
