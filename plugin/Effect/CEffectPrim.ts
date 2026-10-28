import { CCanvas } from "../../artgine/app/canvas/CCanvas.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CEffectTex } from "./CEffectTex.js";

export type TRGB = [number, number, number];

export function HexRGB(_hex: string): TRGB
{
    const v = _hex.replace("#", "");
    return [parseInt(v.substr(0, 2), 16) / 255, parseInt(v.substr(2, 2), 16) / 255, parseInt(v.substr(4, 2), 16) / 255];
}

export class CEffectPrim
{
    static sCanvas: CCanvas = null;

    static Init(_canvas: CCanvas)
    {
        CEffectPrim.sCanvas = _canvas;
    }

    // 셰이더의 기본 알파 컷(0.01)은 낮은 알파의 번짐 가장자리를 잘라 버리므로 0 으로 낮춘다
    static NoCut(_pt: CPaint2D): CPaint2D
    {
        _pt.PushTag("alphaCut");
        _pt.PushCShaderAttr(new CShaderAttr("alphaCut", new CVec1(0)));
        return _pt;
    }

    static Tint(_pt: CPaint2D, _c: TRGB)
    {
        _pt.SetColorModel(new CColor(_c[0], _c[1], _c[2], CColor.eModel.RGBMul));
    }

    static Bloom(_pt: CPaint2D, _mask = 1)
    {
        _pt.PushTag("bloom");
        _pt.PushCShaderAttr(new CShaderAttr("mask", new CVec1(_mask)));
    }

    static Additive(_pt: CPaint2D)
    {
        const pal = CEffectPrim.sCanvas.GetFrame().Pal();
        const rp = new CRenderPass(pal.Sl2DKey());
        rp.mCullFace = CRenderPass.eCull.None;
        rp.mDepthWrite = false;
        const B = CRenderPass.eBlend;
        rp.mBlend = [B.FUNC_ADD, B.FUNC_ADD, B.SRC_ALPHA, B.ONE, B.ONE, B.ONE];
        rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));
        _pt.PushRenderPass(rp);
        return _pt;
    }

    static Solid(_w: number, _h: number, _add = false): CPaint2D
    {
        const pt = new CPaint2D(CEffectTex.kSolid, new CVec2(_w, _h));
        if (_add) CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }

    static SoftBar(_w: number, _h: number): CPaint2D
    {
        const pt = new CPaint2D(CEffectTex.kSoftBar, new CVec2(_w, _h));
        CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }

    static Glow(_w: number, _h: number, _c: TRGB, _bloom = 0, _add = true): CPaint2D
    {
        const pt = new CPaint2D(CEffectTex.kGlow, new CVec2(_w, _h));
        CEffectPrim.Tint(pt, _c);
        if (_bloom > 0) CEffectPrim.Bloom(pt, _bloom);
        if (_add) CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }

    static Ring(_w: number, _h: number, _c: TRGB, _bloom = 0, _add = true): CPaint2D
    {
        const pt = new CPaint2D(CEffectTex.kRing, new CVec2(_w, _h));
        CEffectPrim.Tint(pt, _c);
        if (_bloom > 0) CEffectPrim.Bloom(pt, _bloom);
        if (_add) CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }
}
