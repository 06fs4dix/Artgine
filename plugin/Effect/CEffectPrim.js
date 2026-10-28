import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CEffectTex } from "./CEffectTex.js";
export function HexRGB(_hex) {
    const v = _hex.replace("#", "");
    return [parseInt(v.substr(0, 2), 16) / 255, parseInt(v.substr(2, 2), 16) / 255, parseInt(v.substr(4, 2), 16) / 255];
}
export class CEffectPrim {
    static sCanvas = null;
    static Init(_canvas) {
        CEffectPrim.sCanvas = _canvas;
    }
    static NoCut(_pt) {
        _pt.PushTag("alphaCut");
        _pt.PushCShaderAttr(new CShaderAttr("alphaCut", new CVec1(0)));
        return _pt;
    }
    static Tint(_pt, _c) {
        _pt.SetColorModel(new CColor(_c[0], _c[1], _c[2], CColor.eModel.RGBMul));
    }
    static Bloom(_pt, _mask = 1) {
        _pt.PushTag("bloom");
        _pt.PushCShaderAttr(new CShaderAttr("mask", new CVec1(_mask)));
    }
    static Additive(_pt) {
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
    static Solid(_w, _h, _add = false) {
        const pt = new CPaint2D(CEffectTex.kSolid, new CVec2(_w, _h));
        if (_add)
            CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }
    static SoftBar(_w, _h) {
        const pt = new CPaint2D(CEffectTex.kSoftBar, new CVec2(_w, _h));
        CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }
    static Glow(_w, _h, _c, _bloom = 0, _add = true) {
        const pt = new CPaint2D(CEffectTex.kGlow, new CVec2(_w, _h));
        CEffectPrim.Tint(pt, _c);
        if (_bloom > 0)
            CEffectPrim.Bloom(pt, _bloom);
        if (_add)
            CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }
    static Ring(_w, _h, _c, _bloom = 0, _add = true) {
        const pt = new CPaint2D(CEffectTex.kRing, new CVec2(_w, _h));
        CEffectPrim.Tint(pt, _c);
        if (_bloom > 0)
            CEffectPrim.Bloom(pt, _bloom);
        if (_add)
            CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }
}
