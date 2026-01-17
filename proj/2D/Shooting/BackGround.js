import { CAniFlow } from "../../../artgine/app/component/CAniFlow.js";
import CBehavior from "../../../artgine/app/component/CBehavior.js";
import { CCollider } from "../../../artgine/app/component/CCollider.js";
import { CForce } from "../../../artgine/app/component/CForce.js";
import { CRigidBody } from "../../../artgine/app/component/CRigidBody.js";
import { CPaint2D } from "../../../artgine/app/component/paint/CPaint2D.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CLoaderOption } from "../../../artgine/util/CLoader.js";
export class BackGround extends CSubject {
    mMoon = null;
    Start() {
        this.SetPos(new CVec3(0, 0, -1));
        this.GetFrame().Load().Exe("Res/bg.png", new CLoaderOption().Set("mWrap", CTexture.eWrap.Mirrored));
        let pt = this.PushComp(new CPaint2D("Res/bg.png", new CVec2(600, 800)));
        pt.SubUpdate = () => {
            let delay = this.GetFrame().DeltaTime();
            let AllDelay = pt.Get("AllDelay", 0);
            pt.Set("AllDelay", AllDelay + delay);
            pt.SetTexCodi(new CVec4(1, 1, 0, AllDelay / 100000));
        };
    }
    Update(_update) {
        if (this.mMoon == null || this.mMoon.IsDestroy()) {
            this.mMoon = this.PushChild(new CSubject());
            let pt = this.mMoon.PushComp(new CPaint2D());
            this.mMoon.PushComp(new CAniFlow("BlueMoon"));
            this.mMoon.SetSca(new CVec3(0.1, 0.1, 0.1));
            this.mMoon.SetPos(new CVec3(Math.random() * 600 - 300, 400, 0.1));
            let cl = this.mMoon.PushComp(new CCollider(pt));
            cl.SetCameraOut(true);
            let bv = this.mMoon.PushComp(new CBehavior());
            bv.CameraOut = (_pArr) => {
                if (_pArr.length == 0)
                    return;
                if (_pArr[0].mLen > 2) {
                    this.mMoon.Destroy();
                    this.mMoon = null;
                }
            };
            let rb = this.mMoon.PushComp(new CRigidBody());
            rb.Push(new CForce("move", new CVec3(0, -1), 50));
        }
    }
}
