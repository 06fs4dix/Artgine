import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CPad.js";
import { CUIText } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CUI.js";
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
    }
    Update(_delay) {
        super.Update(_delay);
        if (this.mPad == null) {
            let pad = this.GetOwner().FindChild(CPad);
            if (pad != null)
                this.mPad = pad;
            else
                return;
        }
        this.mShotTime -= _delay;
        if (this.mPad.IsEnable() && this.mPad.GetButtonEvent(0) == CEvent.eType.Press && this.mShotTime <= 0) {
            this.GetOwner().PushPac(CPacShooting.UserShot(this.GetOwner().GetPos()));
            this.mShotTime = 200;
        }
    }
    SetNick(_nick) {
        let uit = new CUIText();
        uit.Init(_nick);
        uit.SetPos(new CVec3(0, -40));
        this.GetOwner().PushChilde(uit);
    }
}
