import { CCanvas } from "../../artgine/app/canvas/CCanvas.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CCamCon2DFollow } from "../../artgine/util/CCamCon.js";
import { CEffectPrim } from "./CEffectPrim.js";
import { CEffectScreen } from "./CEffectScreen.js";
import { CEffectShape, IShapeDef } from "./CEffectShape.js";
import { CEffectSubject, IEffectOption } from "./CEffectSubject.js";
import { CEffectTex } from "./CEffectTex.js";

export type { IEffectOption } from "./CEffectSubject.js";

// 이름 → 이펙트 서브젝트를 만드는 함수. CEffectSubject 파생이면 Setup 까지, 파티클 같은 다른 서브젝트면 그대로 올린다
export type TEffectMake = (_opt: IEffectOption) => CSubject;

export class CEffectMgr
{
    static sCanvas: CCanvas = null;
    static sStyle = new Map<string, { make: TEffectMake, life: number }>();
    static sInitHook: Array<(_canvas: CCanvas) => void | Promise<void>> = [];

    static async Init(_canvas: CCanvas)
    {
        CEffectMgr.sCanvas = _canvas;
        CEffectPrim.Init(_canvas);
        await CEffectTex.Init(_canvas);
        await CEffectShape.Init(_canvas);
        CEffectScreen.Init(_canvas);
        for (const hook of CEffectMgr.sInitHook) await hook(_canvas);
    }

    // 스타일 모듈이 Init 때 해야 할 일(텍스처 굽기, 풀 등록 등)을 맡긴다
    static OnInit(_hook: (_canvas: CCanvas) => void | Promise<void>)
    {
        CEffectMgr.sInitHook.push(_hook);
    }

    static async RegisterShape(_def: IShapeDef)
    {
        await CEffectShape.RegisterShape(CEffectMgr.sCanvas, _def);
    }

    static BindCamera(_camCon: CCamCon2DFollow, _base: CVec3)
    {
        CEffectScreen.BindCamera(_camCon, _base);
    }

    static Shake(_power: number)
    {
        CEffectScreen.Shake(_power);
    }

    static SetTimeScale(_v: number)
    {
        CEffectSubject.sTimeScale = _v;
    }

    static HitStop(_ms: number)
    {
        CEffectScreen.HitStop(_ms);
    }

    static IsHitStop(): boolean
    {
        return CEffectScreen.IsHitStop();
    }

    static GetShakeOffset(): CVec3
    {
        return CEffectScreen.GetOffset();
    }

    static Register(_name: string, _make: TEffectMake, _life = 0.4)
    {
        CEffectMgr.sStyle.set(_name, { make: _make, life: _life });
    }

    static List(): string[]
    {
        return Array.from(CEffectMgr.sStyle.keys());
    }

    static Play(_name: string, _x: number, _y: number, _opt: IEffectOption = {}): CSubject
    {
        const style = CEffectMgr.sStyle.get(_name);
        if (style == null) return null;
        const fx = style.make(_opt);
        fx.SetPos(new CVec3(_x, _y, _opt.z ?? 0.3));
        const sc = _opt.scale ?? 1;
        if (sc != 1) fx.SetSca(new CVec3(sc, sc, 1));
        if (_opt.rot) fx.SetRot(new CVec3(0, 0, _opt.rot));
        if (fx instanceof CEffectSubject) fx.Setup(_opt, style.life);
        CEffectMgr.sCanvas.PushSub(fx);
        return fx;
    }

    static Burst(_x: number, _y: number, _opt: IEffectOption = {})
    {
        return CEffectMgr.Play("burst", _x, _y, { z: 0.35, ..._opt });
    }

    static Ring(_x: number, _y: number, _opt: IEffectOption = {})
    {
        return CEffectMgr.Play("ring", _x, _y, _opt);
    }

    static Glow(_x: number, _y: number, _opt: IEffectOption = {})
    {
        return CEffectMgr.Play("glow", _x, _y, _opt);
    }
}
