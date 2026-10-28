import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CEffectPrim } from "./CEffectPrim.js";
import { CEffectScreen } from "./CEffectScreen.js";
import { CEffectShape } from "./CEffectShape.js";
import { CEffectSubject } from "./CEffectSubject.js";
import { CEffectTex } from "./CEffectTex.js";
export class CEffectMgr {
    static sCanvas = null;
    static sStyle = new Map();
    static sInitHook = [];
    static async Init(_canvas) {
        CEffectMgr.sCanvas = _canvas;
        CEffectPrim.Init(_canvas);
        await CEffectTex.Init(_canvas);
        await CEffectShape.Init(_canvas);
        CEffectScreen.Init(_canvas);
        for (const hook of CEffectMgr.sInitHook)
            await hook(_canvas);
    }
    static OnInit(_hook) {
        CEffectMgr.sInitHook.push(_hook);
    }
    static async RegisterShape(_def) {
        await CEffectShape.RegisterShape(CEffectMgr.sCanvas, _def);
    }
    static BindCamera(_camCon, _base) {
        CEffectScreen.BindCamera(_camCon, _base);
    }
    static Shake(_power) {
        CEffectScreen.Shake(_power);
    }
    static SetTimeScale(_v) {
        CEffectSubject.sTimeScale = _v;
    }
    static HitStop(_ms) {
        CEffectScreen.HitStop(_ms);
    }
    static IsHitStop() {
        return CEffectScreen.IsHitStop();
    }
    static GetShakeOffset() {
        return CEffectScreen.GetOffset();
    }
    static Register(_name, _make, _life = 0.4) {
        CEffectMgr.sStyle.set(_name, { make: _make, life: _life });
    }
    static List() {
        return Array.from(CEffectMgr.sStyle.keys());
    }
    static Play(_name, _x, _y, _opt = {}) {
        const style = CEffectMgr.sStyle.get(_name);
        if (style == null)
            return null;
        const fx = style.make(_opt);
        fx.SetPos(new CVec3(_x, _y, _opt.z ?? 0.3));
        const sc = _opt.scale ?? 1;
        if (sc != 1)
            fx.SetSca(new CVec3(sc, sc, 1));
        if (_opt.rot)
            fx.SetRot(new CVec3(0, 0, _opt.rot));
        if (fx instanceof CEffectSubject)
            fx.Setup(_opt, style.life);
        CEffectMgr.sCanvas.PushSub(fx);
        return fx;
    }
    static Burst(_x, _y, _opt = {}) {
        return CEffectMgr.Play("burst", _x, _y, { z: 0.35, ..._opt });
    }
    static Ring(_x, _y, _opt = {}) {
        return CEffectMgr.Play("ring", _x, _y, _opt);
    }
    static Glow(_x, _y, _opt = {}) {
        return CEffectMgr.Play("glow", _x, _y, _opt);
    }
}
