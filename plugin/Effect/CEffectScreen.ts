import { CCanvas } from "../../artgine/app/canvas/CCanvas.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CCamCon2DFollow } from "../../artgine/util/CCamCon.js";

class CShaker extends CSubject
{
    override SubjectUpdate(_update: CUpdate)
    {
        super.SubjectUpdate(_update);
        CEffectScreen.Update(_update.DeltaTime());
    }

    toJSON(): { class: string; }
    {
        return { class: "" };
    }
}

export class CEffectScreen
{
    static sShake = 0;
    static sHitStopUntil = 0;
    static sTimeScale = 1;
    static sCamCon: CCamCon2DFollow = null;
    static sBase = new CVec3();
    static sOffset = new CVec3();

    static Init(_canvas: CCanvas)
    {
        _canvas.PushSub(new CShaker());
    }

    static BindCamera(_camCon: CCamCon2DFollow, _base: CVec3)
    {
        CEffectScreen.sCamCon = _camCon;
        CEffectScreen.sBase = _base;
    }

    static Shake(_power: number)
    {
        if (_power > CEffectScreen.sShake) CEffectScreen.sShake = _power;
    }

    static HitStop(_ms: number)
    {
        CEffectScreen.sHitStopUntil = performance.now() + _ms;
    }

    static IsHitStop(): boolean
    {
        return performance.now() < CEffectScreen.sHitStopUntil;
    }

    static GetOffset(): CVec3
    {
        return CEffectScreen.sOffset;
    }

    static Update(_dt: number)
    {
        let sx = 0, sy = 0;
        if (CEffectScreen.sShake > 0.05)
        {
            sx = (Math.random() - 0.5) * CEffectScreen.sShake;
            sy = (Math.random() - 0.5) * CEffectScreen.sShake;
            CEffectScreen.sShake *= Math.exp(-18 * _dt);
        }
        else CEffectScreen.sShake = 0;
        CEffectScreen.sOffset = new CVec3(sx, sy, 0);
        if (CEffectScreen.sCamCon != null)
        {
            const b = CEffectScreen.sBase;
            CEffectScreen.sCamCon.SetPos(new CVec3(b.x + sx, b.y + sy, b.z));
        }
    }
}
