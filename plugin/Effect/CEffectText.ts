import { CCanvas } from "../../artgine/app/canvas/CCanvas.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CH5Canvas } from "../../artgine/render/CH5Canvas.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { clamp, SetAlpha, SetPos } from "./CEffectPiece.js";
import { CEffectSubject, IEffectOption } from "./CEffectSubject.js";
import { TRGB } from "./CEffectPrim.js";

export function RGBHex(_c: TRGB): string
{
    return "#" + _c.map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}

export class CEffectText
{
    static sCanvas: CCanvas = null;
    static sCache = new Map<string, { key: string, w: number, h: number }>();
    static sMeasure: CanvasRenderingContext2D = null;
    static kFont = '800 56px "Barlow Condensed",sans-serif';
    static kPx = 56;

    static Init(_canvas: CCanvas)
    {
        CEffectText.sCanvas = _canvas;
        CEffectText.sCache.clear();
    }

    static Get(_text: string, _fill: string, _stroke = "#081323", _strokeW = 12): { key: string, w: number, h: number }
    {
        const id = _fill + "|" + _stroke + "|" + _text;
        let c = CEffectText.sCache.get(id);
        if (c) return c;
        if (!CEffectText.sMeasure) CEffectText.sMeasure = document.createElement("canvas").getContext("2d");
        CEffectText.sMeasure.font = CEffectText.kFont;
        const padX = _strokeW + 2;
        const w = Math.ceil(CEffectText.sMeasure.measureText(_text).width) + padX * 2;
        const h = Math.ceil(CEffectText.kPx * 1.5 + _strokeW * 2);
        const key = "fx/text" + CEffectText.sCache.size + ".tex";
        CH5Canvas.Init(w, h, true, false);
        CH5Canvas.AddCmd([
            CH5Canvas.Cmd("font", CEffectText.kFont), CH5Canvas.Cmd("textAlign", "center"), CH5Canvas.Cmd("textBaseline", "middle"), CH5Canvas.Cmd("lineJoin", "round"),
            CH5Canvas.Cmd("lineWidth", _strokeW), CH5Canvas.Cmd("strokeStyle", _stroke), CH5Canvas.Cmd("strokeText", [_text, w / 2, h / 2]),
            CH5Canvas.Cmd("fillStyle", _fill), CH5Canvas.Cmd("fillText", [_text, w / 2, h / 2]),
        ]);
        CH5Canvas.Draw();
        const tex = CH5Canvas.GetNewTex();
        const fw = CEffectText.sCanvas.GetFrame();
        fw.Ren().BuildTexture(tex);
        fw.Res().Push(key, tex);
        c = { key, w, h };
        CEffectText.sCache.set(id, c);
        return c;
    }

    static Paint(_text: string, _fill: string, _worldPx: number): CPaint2D
    {
        const t = CEffectText.Get(_text, _fill);
        const k = _worldPx / CEffectText.kPx;
        return new CPaint2D(t.key, new CVec2(t.w * k, t.h * k));
    }
}

CEffectMgr.OnInit((_canvas) => CEffectText.Init(_canvas));

// 옵션: text, size(글자 월드 높이, 기본 숫자 16 / 글자 11), 색 = color
export class CEffectLabel extends CEffectSubject
{
    mPt: CPaint2D;

    protected Build(_o: IEffectOption)
    {
        const text = String(_o.text ?? "");
        const size = _o.size ?? (/^\+?\d+$/.test(text) ? 16 : 11);
        this.mPt = CEffectText.Paint(text, RGBHex(this.mColor), size);
        SetAlpha(this.mPt, 1);
        this.PushComp(this.mPt);
    }

    protected Tick(_r: number)
    {
        SetPos(this.mPt, 0, 25 * this.mLife * _r);
        SetAlpha(this.mPt, Math.max(0.03, clamp((this.mLife * (1 - _r)) / 0.25, 0, 1)));
    }
}

CEffectMgr.Register("label", () => new CEffectLabel(), 0.9);
