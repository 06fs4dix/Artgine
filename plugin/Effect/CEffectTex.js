import { CH5Canvas } from "../../artgine/render/CH5Canvas.js";
export class CEffectTex {
    static kGlow = "fx/glow.tex";
    static kRing = "fx/ring.tex";
    static kSolid = "fx/solid.tex";
    static kSoftBar = "fx/softbar.tex";
    static async Init(_canvas) {
        const fw = _canvas.GetFrame();
        await CEffectTex.BakeRadial(fw, CEffectTex.kGlow, 128, [
            { per: 0, color: "rgba(255,255,255,1)" },
            { per: 0.2, color: "rgba(255,255,255,0.72)" },
            { per: 0.45, color: "rgba(255,255,255,0.28)" },
            { per: 0.75, color: "rgba(255,255,255,0.05)" },
            { per: 1, color: "rgba(255,255,255,0)" },
        ]);
        await CEffectTex.BakeRadial(fw, CEffectTex.kRing, 256, [
            { per: 0, color: "rgba(255,255,255,0)" },
            { per: 0.8, color: "rgba(255,255,255,0)" },
            { per: 0.89, color: "rgba(255,255,255,0.75)" },
            { per: 0.92, color: "rgba(255,255,255,1)" },
            { per: 0.95, color: "rgba(255,255,255,0.75)" },
            { per: 1, color: "rgba(255,255,255,0)" },
        ]);
        if (fw.Res().Find(CEffectTex.kSoftBar) == null) {
            const stop = [];
            for (let i = 0; i <= 16; i++)
                stop.push({ per: i / 16, color: `rgba(255,255,255,${Math.exp(-4.5 * Math.pow(2 * i / 16 - 1, 2)).toFixed(3)})` });
            CH5Canvas.Init(8, 64);
            CH5Canvas.FillLinearGradient(0, 0, 0, 64, stop);
            CH5Canvas.AddCmd([CH5Canvas.Cmd("fillRect", [0, 0, 8, 64])]);
            await CH5Canvas.Draw();
            CEffectTex.Push(fw, CEffectTex.kSoftBar);
        }
        if (fw.Res().Find(CEffectTex.kSolid) == null) {
            CH5Canvas.Init(8, 8);
            CH5Canvas.AddCmd([CH5Canvas.Cmd("fillStyle", "#ffffff"), CH5Canvas.Cmd("fillRect", [0, 0, 8, 8])]);
            await CH5Canvas.Draw();
            CEffectTex.Push(fw, CEffectTex.kSolid);
        }
    }
    static async BakeRadial(_fw, _key, _size, _stop) {
        if (_fw.Res().Find(_key) != null)
            return;
        const c = _size / 2;
        CH5Canvas.Init(_size, _size);
        CH5Canvas.FillRadialGradient(c, c, c, c, 0, c, _stop);
        CH5Canvas.AddCmd([CH5Canvas.Cmd("fillRect", [0, 0, _size, _size])]);
        await CH5Canvas.Draw();
        CEffectTex.Push(_fw, _key);
    }
    static Push(_fw, _key) {
        const tex = CH5Canvas.GetNewTex();
        _fw.Ren().BuildTexture(tex);
        _fw.Res().Push(_key, tex);
    }
}
