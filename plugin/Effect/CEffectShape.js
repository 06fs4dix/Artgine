import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CH5Canvas } from "../../artgine/render/CH5Canvas.js";
import { CEffectPrim } from "./CEffectPrim.js";
const poly = (_pts, _fill, _stroke, _lw) => {
    const o = [["beginPath", []]];
    _pts.forEach((p, i) => o.push([i ? "lineTo" : "moveTo", [p[0], p[1]]]));
    o.push(["closePath", []]);
    if (_fill)
        o.push(["fillStyle", _fill], ["fill", []]);
    if (_stroke)
        o.push(["strokeStyle", _stroke], ["lineWidth", _lw], ["stroke", []]);
    return o;
};
const line = (_ax, _ay, _bx, _by, _color, _lw) => [["strokeStyle", _color], ["lineWidth", _lw], ["beginPath", []], ["moveTo", [_ax, _ay]], ["lineTo", [_bx, _by]], ["stroke", []]];
const circle = (_x, _y, _r, _fill, _stroke, _lw) => {
    const o = [["beginPath", []], ["arc", [_x, _y, Math.max(0.01, _r), 0, Math.PI * 2]]];
    if (_fill)
        o.push(["fillStyle", _fill], ["fill", []]);
    if (_stroke)
        o.push(["strokeStyle", _stroke], ["lineWidth", _lw], ["stroke", []]);
    return o;
};
const starPts = (_n) => {
    const pp = [];
    for (let a = 0; a < 2 * _n; a++) {
        const ang = a * Math.PI / _n - Math.PI / 2, r = a % 2 ? 0.42 : 1;
        pp.push([Math.cos(ang) * r, Math.sin(ang) * r]);
    }
    return pp;
};
const StarO = (_n) => poly(starPts(_n), "", "#ffffff", 0.05);
const Star = (_n) => poly(starPts(_n), "#ffffff", "", 0);
function BallHalf(_top) {
    const rect = (x, y, w, h, c) => [["fillStyle", c], ["fillRect", [x, y, w, h]]];
    return [
        ...rect(-6, _top ? -7 : 0, 12, 7, "#151b2b"), ...rect(-8, _top ? -5 : 0, 16, 5, "#151b2b"),
        ...rect(-5, _top ? -6 : 1, 10, 5, _top ? "#d85562" : "#e4e7df"), ...rect(-7, _top ? -4 : 1, 14, 3, _top ? "#d85562" : "#e4e7df"),
        ...rect(-4, _top ? -5 : 1, 5, 2, _top ? "#ff8990" : "#ffffff"),
    ];
}
function BallBand() {
    return [["fillStyle", "#172036"], ["fillRect", [-8, -1, 16, 3]], ["fillRect", [-3, -3, 6, 7]], ["fillStyle", "#e8e9df"], ["fillRect", [-2, -2, 4, 5]], ["fillStyle", "#afc4cd"], ["fillRect", [-1, -1, 2, 2]]];
}
const gaussStop = () => {
    const s = [];
    for (let i = 0; i <= 12; i++)
        s.push({ per: i / 12, color: `rgba(255,255,255,${Math.exp(-4.5 * (i / 12) * (i / 12)).toFixed(3)})` });
    return s;
};
const SHAPES = [
    { key: "leaf", w: 128, h: 128, cx: 64, cy: 64, scale: 52, ops: [["fillStyle", "#a8ef73"], ["beginPath", []], ["moveTo", [1, 0]], ["quadraticCurveTo", [-1, -1, -1, 0]], ["quadraticCurveTo", [-1, 1, 1, 0]], ["fill", []], ...line(-0.7, 0, 0.8, 0, "#e4ffc4", 0.04)] },
    { key: "shard", w: 128, h: 128, cx: 50, cy: 64, scale: 34, ops: poly([[1.7, 0], [-0.6, -0.55], [-1, 0], [-0.6, 0.55]], "#ffffff", "", 0) },
    { key: "shard_o", w: 128, h: 128, cx: 50, cy: 64, scale: 34, ops: [...poly([[1.7, 0], [-0.6, -0.55], [-1, 0], [-0.6, 0.55]], "", "#ffffffbf", 0.05), ...line(-1, 0, 1.7, 0, "#ffffffbf", 0.05)] },
    { key: "star", w: 128, h: 128, cx: 64, cy: 64, scale: 58, ops: Star(5) },
    { key: "star_o", w: 128, h: 128, cx: 64, cy: 64, scale: 58, ops: StarO(5) },
    { key: "star4_o", w: 128, h: 128, cx: 64, cy: 64, scale: 58, ops: StarO(4) },
    { key: "star6_o", w: 128, h: 128, cx: 64, cy: 64, scale: 58, ops: StarO(6) },
    { key: "star8_o", w: 128, h: 128, cx: 64, cy: 64, scale: 58, ops: StarO(8) },
    { key: "star4", w: 128, h: 128, cx: 64, cy: 64, scale: 58, ops: Star(4) },
    { key: "star6", w: 128, h: 128, cx: 64, cy: 64, scale: 58, ops: Star(6) },
    { key: "star8", w: 128, h: 128, cx: 64, cy: 64, scale: 58, ops: Star(8) },
    { key: "chunk", w: 32, h: 32, cx: 16, cy: 16, scale: 1, ops: poly([[-4, -6], [5, -9], [8, 3], [-2, 6]], "#ffffff", "", 0) },
    { key: "chunk_o", w: 32, h: 32, cx: 16, cy: 16, scale: 1, ops: poly([[-4, -6], [5, -9], [8, 3], [-2, 6]], "", "#e1d3b1", 1) },
    { key: "chip", w: 32, h: 32, cx: 16, cy: 16, scale: 1, ops: poly([[-4, -5], [5, -3], [3, 5], [-5, 2]], "#ffffff", "", 0) },
    { key: "chip_o", w: 32, h: 32, cx: 16, cy: 16, scale: 1, ops: poly([[-4, -5], [5, -3], [3, 5], [-5, 2]], "", "#e9dabd", 1) },
    { key: "rock", w: 128, h: 128, cx: 64, cy: 64, scale: 54, ops: [...poly([[-1, -0.45], [-0.2, -1], [0.7, -0.65], [1, 0.4], [0.1, 1], [-0.75, 0.55]], "#a99b83", "#e2d6b6", 0.06), ...poly([[-0.2, -1], [0.7, -0.65], [0.25, 0], [-0.65, 0.3]], "#c9bd9d", "", 0)] },
    { key: "meteor", w: 128, h: 128, cx: 64, cy: 64, scale: 54, ops: [...poly([[-1, -0.45], [-0.2, -1], [0.7, -0.65], [1, 0.4], [0.1, 1], [-0.75, 0.55]], "#8267b0", "#e2d6b6", 0.06), ...poly([[-0.2, -1], [0.7, -0.65], [0.25, 0], [-0.65, 0.3]], "#cf94b1", "", 0)] },
    { key: "seed", w: 128, h: 128, cx: 64, cy: 64, scale: 54, ops: [...poly([[-1, -0.6], [0, -1], [1, 0.1], [0.4, 1], [-0.7, 0.65]], "#a5b96a", "#f4ebaf", 0.06), ...line(-0.5, -0.5, 0.35, 0.5, "#63734c", 0.06)] },
    { key: "shield", w: 80, h: 90, cx: 40, cy: 56, scale: 1, ops: poly([[0, -49], [-27, -30], [-24, 2], [0, 20], [24, 2], [27, -30]], "#a5dfff26", "#d2f3ff", 2) },
    { key: "sword", w: 32, h: 48, cx: 16, cy: 28, scale: 1, ops: [...poly([[-3, 12], [-3, -15], [0, -24], [3, -15], [3, 12]], "#e9eef4", "#ffffff", 1), ["fillStyle", "#d5b873"], ["fillRect", [-8, 8, 16, 3]], ["fillRect", [-2, 10, 4, 9]]] },
    { key: "bubble", w: 64, h: 64, cx: 32, cy: 32, scale: 28, ops: [...circle(0, 0, 1, "#65d5ef66", "#c8fdff", 0.07), ...circle(-0.3, -0.3, 0.16, "#ffffff", "", 0)] },
    { key: "plus", w: 16, h: 16, cx: 8, cy: 8, scale: 1, ops: [["fillStyle", "#baffc4"], ["fillRect", [-4, -1, 8, 3]], ["fillRect", [-1, -4, 3, 8]]] },
    { key: "fist", w: 72, h: 40, cx: 40, cy: 20, scale: 1, ops: poly([[-14, -10], [-4, -15], [3, -12], [11, -12], [15, -5], [15, 7], [6, 13], [-8, 11], [-16, 3]], "#ffffff", "", 0) },
    { key: "fist_o", w: 72, h: 40, cx: 40, cy: 20, scale: 1, ops: [...poly([[-14, -10], [-4, -15], [3, -12], [11, -12], [15, -5], [15, 7], [6, 13], [-8, 11], [-16, 3]], "", "#fff6dc", 1), ...line(1, -9, 1, -2, "#ffffff", 2), ...line(7, -9, 7, -2, "#ffffff", 2), ...line(13, -9, 13, -2, "#ffffff", 2), ...line(-25, -12, -16, -10, "#ffffff", 2), ...line(-25, -4, -16, -3, "#ffffff", 2), ...line(-25, 4, -16, 4, "#ffffff", 2), ...line(-25, 12, -16, 11, "#ffffff", 2)] },
    { key: "claw", w: 56, h: 40, cx: 28, cy: 20, scale: 1, ops: poly([[-18, -10], [-7, 7], [0, -7], [9, 9], [20, -11]], "#ffffff", "", 0) },
    { key: "claw_o", w: 56, h: 40, cx: 28, cy: 20, scale: 1, ops: poly([[-18, -10], [-7, 7], [0, -7], [9, 9], [20, -11]], "", "#fff5e8", 1) },
    { key: "snow", w: 40, h: 40, cx: 20, cy: 20, scale: 1, ops: [["strokeStyle", "#ffffff"], ["lineWidth", 1.6], ["beginPath", []], ["moveTo", [-9, 0]], ["lineTo", [9, 0]], ["moveTo", [-4.5, -7.8]], ["lineTo", [4.5, 7.8]], ["moveTo", [-4.5, 7.8]], ["lineTo", [4.5, -7.8]], ["stroke", []]] },
    { key: "crescent", w: 128, h: 128, cx: 40, cy: 64, scale: 1, ops: [["fillStyle", "#ffffff"], ["beginPath", []], ["arc", [0, 0, 56, -1.15, 1.15]], ["arc", [-26, 0, 62, 1.0, -1.0, true]], ["closePath", []], ["fill", []]] },
    { key: "lobe", w: 128, h: 80, cx: 76, cy: 40, scale: 40, ops: [["fillStyle", "#ffffff"], ["beginPath", []], ["moveTo", [1, 0]], ["quadraticCurveTo", [-0.1, -1, -1.8, 0]], ["quadraticCurveTo", [-0.1, 1, 1, 0]], ["fill", []]] },
    { key: "moon", w: 64, h: 64, cx: 32, cy: 32, scale: 28, ops: [...circle(0, 0, 1, "#ead6ff", "#fff7ff", 0.06), ["fillStyle", "#a880de"], ["beginPath", []], ["ellipse", [0.15, 0, 0.55, 0.88, 0.2, 0, Math.PI * 2]], ["fill", []], ...circle(0.32, -0.3, 0.13, "#ffffff", "", 0)] },
    { key: "dot", w: 32, h: 32, cx: 16, cy: 16, scale: 12, ops: circle(0, 0, 1, "#ffffff", "", 0) },
    { key: "dot_o", w: 32, h: 32, cx: 16, cy: 16, scale: 12, ops: circle(0, 0, 1, "", "#ffffffb0", 0.3) },
    { key: "egA", w: 128, h: 128, cx: 64, cy: 64, scale: 60, ops: [], stop: [{ per: 0, color: "rgba(255,255,255,1)" }, { per: 0.22, color: "rgba(255,255,255,1)" }, { per: 1, color: "rgba(255,255,255,0)" }] },
    { key: "egB", w: 128, h: 128, cx: 64, cy: 64, scale: 60, ops: [], stop: [{ per: 0, color: "rgba(255,255,255,1)" }, { per: 1, color: "rgba(255,255,255,0)" }] },
    { key: "egG", w: 128, h: 128, cx: 64, cy: 64, scale: 60, ops: [], stop: gaussStop() },
    { key: "ballglow", w: 128, h: 128, cx: 64, cy: 64, scale: 60, ops: [], stop: [{ per: 0, color: "rgba(255,255,235,1)" }, { per: 1, color: "rgba(143,213,255,0)" }] },
    { key: "iceblock", w: 64, h: 64, cx: 32, cy: 52, scale: 1, ops: [...poly([[-23, -2], [-25, -24], [-13, -42], [5, -49], [23, -31], [25, -4], [10, 7], [-12, 7]], "#8fd0ee66", "#b9f4ff", 1.6), ["strokeStyle", "#e2ffffaa"], ["lineWidth", 0.8], ["beginPath", []], ["moveTo", [-13, -42]], ["lineTo", [-7, -17]], ["lineTo", [-23, -2]], ["moveTo", [5, -49]], ["lineTo", [10, -21]], ["lineTo", [25, -4]], ["moveTo", [-7, -17]], ["lineTo", [10, -21]], ["lineTo", [10, 7]], ["stroke", []]] },
    { key: "drop", w: 24, h: 24, cx: 12, cy: 12, scale: 1, ops: [["fillStyle", "#ffffff"], ["beginPath", []], ["moveTo", [0, -6]], ["quadraticCurveTo", [6, 5, 0, 6]], ["quadraticCurveTo", [-5, 4, 0, -6]], ["fill", []]] },
    { key: "zglyph", w: 24, h: 24, cx: 12, cy: 12, scale: 1, ops: [["font", "700 10px Arial, sans-serif"], ["textAlign", "center"], ["fillStyle", "#d6e5f5"], ["fillText", ["z", 0, 4]]] },
    { key: "arrow", w: 96, h: 96, cx: 40, cy: 48, scale: 40, ops: poly([[1, 0], [-0.3, -0.6], [-0.1, 0], [-0.3, 0.6]], "#ffffff", "", 0) },
    { key: "ell", w: 128, h: 128, cx: 64, cy: 64, scale: 60, ops: circle(0, 0, 1, "#ffffff", "", 0) },
    { key: "windarc", w: 128, h: 128, cx: 64, cy: 64, scale: 54, ops: [["strokeStyle", "#ffffff"], ["lineWidth", 0.08], ["beginPath", []], ["arc", [0, 0, 1, -1, 1]], ["stroke", []]] },
    { key: "ball", w: 24, h: 24, cx: 12, cy: 12, scale: 1, ops: [...BallHalf(true), ...BallHalf(false), ...BallBand()] },
    { key: "balltop", w: 24, h: 24, cx: 12, cy: 12, scale: 1, ops: BallHalf(true) },
    { key: "ballbot", w: 24, h: 24, cx: 12, cy: 12, scale: 1, ops: BallHalf(false) },
];
export const RING_STEPS = 10;
const HALO_BUCKET = [1, 3, 9, 27, 80];
export const ringRatio = (_i) => 0.8 / Math.pow(1.55, _i);
const RING_BOOST = 1.3;
const LINE_BOOST = 1.3;
for (let i = 0; i < RING_STEPS; i++)
    SHAPES.push({ key: "ellring" + i, w: 128, h: 128, cx: 64, cy: 64, scale: 60 / (1 + ringRatio(i) / 2), ops: circle(0, 0, 1, "", "#ffffff", ringRatio(i) * RING_BOOST) });
const BoostLine = (_key, _o) => _o[0] == "lineWidth" && !_key.startsWith("ellring") ? Number(_o[1]) * LINE_BOOST : _o[1];
export class CEffectShape {
    static sScale = new Map();
    static sKey = new Map();
    static sVersion = 0;
    static Key(_k) {
        return CEffectShape.sKey.get(_k) ?? "fx/" + _k + ".tex";
    }
    static async Init(_canvas) {
        const fw = _canvas.GetFrame();
        for (const s of SHAPES) {
            CEffectShape.sScale.set(s.key, { scale: s.scale, w: s.w });
            const key = CEffectShape.Key(s.key);
            if (fw.Res().Find(key) != null)
                continue;
            await CEffectShape.Bake(fw, s, key);
        }
    }
    static async RegisterShape(_canvas, _def) {
        const i = SHAPES.findIndex(s => s.key == _def.key);
        if (i >= 0)
            SHAPES[i] = _def;
        else
            SHAPES.push(_def);
        CEffectShape.sScale.set(_def.key, { scale: _def.scale, w: _def.w });
        const key = "fx/" + _def.key + "#" + (++CEffectShape.sVersion) + ".tex";
        await CEffectShape.Bake(_canvas.GetFrame(), _def, key);
        CEffectShape.sKey.set(_def.key, key);
    }
    static async Bake(_fw, _s, _key) {
        CH5Canvas.Init(_s.w, _s.h);
        if (_s.stop) {
            CH5Canvas.FillRadialGradient(_s.cx, _s.cy, _s.cx, _s.cy, 0, _s.scale, _s.stop);
            CH5Canvas.AddCmd([CH5Canvas.Cmd("fillRect", [0, 0, _s.w, _s.h])]);
        }
        else {
            const cmds = [CH5Canvas.Cmd("translate", [_s.cx, _s.cy]), CH5Canvas.Cmd("scale", [_s.scale, _s.scale]), CH5Canvas.Cmd("lineJoin", "round"), CH5Canvas.Cmd("lineCap", "round")];
            for (const o of _s.ops)
                cmds.push(CH5Canvas.Cmd(o[0], BoostLine(_s.key, o)));
            CH5Canvas.AddCmd(cmds);
        }
        await CH5Canvas.Draw();
        const tex = CH5Canvas.GetNewTex();
        _fw.Ren().BuildTexture(tex);
        _fw.Res().Push(_key, tex);
        const k = _s.key;
        if (_s.stop || k.endsWith("_o") || k.startsWith("ball") || k == "zglyph")
            return;
        for (let b = 0; b < HALO_BUCKET.length; ++b)
            await CEffectShape.BakeHalo(_fw, _s, _key + "_h" + b, Math.min(70, 14 * _s.scale / HALO_BUCKET[b]), k + "#" + b);
        CEffectShape.sHalo.set(k, CEffectShape.sHalo.get(k + "#1"));
    }
    static sHalo = new Map();
    static Bucket(_world) {
        let best = 0, bd = 1e9;
        for (let b = 0; b < HALO_BUCKET.length; ++b) {
            const d = Math.abs(Math.log(Math.max(0.5, _world) / HALO_BUCKET[b]));
            if (d < bd) {
                bd = d;
                best = b;
            }
        }
        return best;
    }
    static HaloKey(_k, _b) {
        return CEffectShape.Key(_k) + "_h" + _b;
    }
    static HaloPad(_k, _b) {
        return CEffectShape.sHalo.get(_k + "#" + _b).pad;
    }
    static async BakeHalo(_fw, _s, _key, _blur, _padKey) {
        const blur = _blur;
        const pad = Math.ceil(blur * 2.2);
        const off = 2000;
        CH5Canvas.Init(_s.w + pad * 2, _s.h + pad * 2);
        const cmds = [
            CH5Canvas.Cmd("shadowColor", "#ffffff"), CH5Canvas.Cmd("shadowBlur", blur), CH5Canvas.Cmd("shadowOffsetX", off),
            CH5Canvas.Cmd("translate", [_s.cx + pad - off, _s.cy + pad]), CH5Canvas.Cmd("scale", [_s.scale, _s.scale]),
            CH5Canvas.Cmd("lineJoin", "round"), CH5Canvas.Cmd("lineCap", "round"),
        ];
        for (const o of _s.ops)
            cmds.push(CH5Canvas.Cmd(o[0], o[1]));
        CH5Canvas.AddCmd(cmds);
        await CH5Canvas.Draw();
        const tex = CH5Canvas.GetNewTex();
        _fw.Ren().BuildTexture(tex);
        _fw.Res().Push(_key, tex);
        CEffectShape.sHalo.set(_padKey, { pad });
    }
    static HasHalo(_k) {
        return CEffectShape.sHalo.has(_k);
    }
    static HaloPaint(_k, _units, _rgb, _bucket = 1, _add = true) {
        const info = CEffectShape.sScale.get(_k);
        const shape = CEffectShape.Find(_k);
        const pad = CEffectShape.HaloPad(_k, _bucket);
        const f = _units / info.scale;
        const pt = new CPaint2D(CEffectShape.HaloKey(_k, _bucket), new CVec2((shape.w + pad * 2) * f, (shape.h + pad * 2) * f));
        pt.SetColorModel(new CColor(_rgb[0], _rgb[1], _rgb[2], CColor.eModel.RGBMul));
        if (_add)
            CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }
    static Find(_k) {
        return SHAPES.find(s => s.key == _k);
    }
    static Paint(_k, _units, _rgb = null, _add = false) {
        const info = CEffectShape.sScale.get(_k);
        const shape = CEffectShape.Find(_k);
        const f = _units / info.scale;
        const pt = new CPaint2D(CEffectShape.Key(_k), new CVec2(shape.w * f, shape.h * f));
        if (_rgb)
            pt.SetColorModel(new CColor(_rgb[0], _rgb[1], _rgb[2], CColor.eModel.RGBMul));
        if (_add)
            CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }
    static PaintWH(_k, _wu, _hu, _rgb = null, _add = false) {
        const info = CEffectShape.sScale.get(_k);
        const shape = CEffectShape.Find(_k);
        const pt = new CPaint2D(CEffectShape.Key(_k), new CVec2(shape.w * _wu / info.scale, shape.h * _hu / info.scale));
        if (_rgb)
            pt.SetColorModel(new CColor(_rgb[0], _rgb[1], _rgb[2], CColor.eModel.RGBMul));
        if (_add)
            CEffectPrim.Additive(pt);
        return CEffectPrim.NoCut(pt);
    }
    static Offset(_k, _units) {
        const s = CEffectShape.Find(_k);
        const f = _units / s.scale;
        return new CVec3((s.w / 2 - s.cx) * f, -(s.h / 2 - s.cy) * f, 0);
    }
}
