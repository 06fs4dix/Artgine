import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
class CShaker extends CSubject {
    SubjectUpdate(_update) {
        super.SubjectUpdate(_update);
        CEffectScreen.Update(_update.DeltaTime());
    }
    toJSON() {
        return { class: "" };
    }
}
export class CEffectScreen {
    static sShake = 0;
    static sHitStopUntil = 0;
    static sTimeScale = 1;
    static sCamCon = null;
    static sBase = new CVec3();
    static sOffset = new CVec3();
    static Init(_canvas) {
        _canvas.PushSub(new CShaker());
    }
    static BindCamera(_camCon, _base) {
        CEffectScreen.sCamCon = _camCon;
        CEffectScreen.sBase = _base;
    }
    static Shake(_power) {
        if (_power > CEffectScreen.sShake)
            CEffectScreen.sShake = _power;
    }
    static HitStop(_ms) {
        CEffectScreen.sHitStopUntil = performance.now() + _ms;
    }
    static IsHitStop() {
        return performance.now() < CEffectScreen.sHitStopUntil;
    }
    static GetOffset() {
        return CEffectScreen.sOffset;
    }
    static Update(_dt) {
        let sx = 0, sy = 0;
        if (CEffectScreen.sShake > 0.05) {
            sx = (Math.random() - 0.5) * CEffectScreen.sShake;
            sy = (Math.random() - 0.5) * CEffectScreen.sShake;
            CEffectScreen.sShake *= Math.exp(-18 * _dt);
        }
        else
            CEffectScreen.sShake = 0;
        CEffectScreen.sOffset = new CVec3(sx, sy, 0);
        if (CEffectScreen.sCamCon != null) {
            const b = CEffectScreen.sBase;
            CEffectScreen.sCamCon.SetPos(new CVec3(b.x + sx, b.y + sy, b.z));
        }
    }
}
