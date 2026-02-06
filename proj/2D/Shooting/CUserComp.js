import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CUIText } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CUI.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";
import { CProComp } from "./CProComp.js";
export class CUserComp extends CProComp {
    mShotTime = 0;
    mPad = null;
    Start() {
        this.mSpeed = 300;
        super.Start();
        this.mCL.SetLayer("user");
        this.mCL.PushCollisionLayer("mon");
    }
    Update(_update) {
        super.Update(_update);
        if (this.mPad == null) {
            let pad = this.GetOwner().FindChild(CPad);
            if (pad != null)
                this.mPad = pad;
            else
                return;
        }
        this.mShotTime -= _update.DeltaMil();
        if (this.mPad.IsEnable() && this.mPad.GetButtonEvent(0) == CEvent.eType.Press && this.mShotTime <= 0) {
            this.GetOwner().PushPacket(CPacShooting.UserShot(this.GetOwner().GetPos()));
            this.mShotTime = 200;
        }
    }
    SetNick(_nick) {
        let uit = new CUIText();
        uit.Init(_nick);
        uit.SetPos(new CVec3(0, -40));
        this.GetOwner().PushChild(uit);
    }
    Collision(_org, _size, _tar, _push) {
        this.GetOwner().PushPacket(CPacShooting.Dead(this.GetOwner().Key()));
        this.GetOwner().PushPacket(CPacShooting.Effect("Flash", this.GetOwner().GetPos(), new CVec2(50, 50)));
        this.GetOwner().Destroy();
    }
    CameraOut(_pArr) {
    }
}
