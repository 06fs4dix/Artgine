import { CDOM } from "../basic/CDOM.js";
import { CObject, CPointer } from "../basic/CObject.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { SDF } from "../z_file/SDF.js";

export class CColor extends CVec4
{
    constructor(_r: number = 0, _g: number = 0, _b: number = 0, _model: number = SDF.eColorModel.None) {
        super(_r, _g, _b, _model);
        this.Snap(8);
    }
    static eModel = SDF.eColorModel;
    static eRange = {
        Float   : 0,   // 입력 0~1
        Windows : 1,   // 입력 H:0~239, S/L/V:0~240, RGB:0~255  (내부 저장은 항상 Float)
    };
    private static readonly WIN_H_MAX  = 239;
    private static readonly WIN_SL_MAX = 240;

    GetString() {
        if (this.mF32A[3] == SDF.eColorModel.HSV || this.mF32A[3] == SDF.eColorModel.HSVBaseHSPercent)
            return `hsv(${Math.round(360*this.mF32A[0])},${Math.round(100*this.mF32A[1])},${Math.round(100*this.mF32A[2])})`;
        if (this.mF32A[3] == SDF.eColorModel.HSL)
            return `hsl(${Math.round(360*this.mF32A[0])},${Math.round(100*this.mF32A[1])},${Math.round(100*this.mF32A[2])})`;
        return `rgb(${Math.round(255*this.mF32A[0])},${Math.round(255*this.mF32A[1])},${Math.round(255*this.mF32A[2])})`;
    }

    static Color(_r: number = 0, _g: number = 0, _b: number = 0, _model: number = SDF.eColorModel.None) {
        gColor.mF32A[0] = _r;
        gColor.mF32A[1] = _g;
        gColor.mF32A[2] = _b;
        gColor.mF32A[3] = _model;
        return gColor;
    }

    // ── HSV ────────────────────────────────────────────────
    static HSVToRGB(_h: number, _s: number, _v: number, _range = CColor.eRange.Float): CColor {
        if (_range === CColor.eRange.Windows) {
            _h /= CColor.WIN_H_MAX; _s /= CColor.WIN_SL_MAX; _v /= CColor.WIN_SL_MAX;
        }
        const f = (n: number, k = (n + _h * 6) % 6) =>
            _v - _v * _s * Math.max(Math.min(k, 4 - k, 1), 0);
        return new CColor(f(5), f(3), f(1), SDF.eColorModel.RGBAdd);
    }
    static RGBToHSV(_r: number, _g: number, _b: number, _range = CColor.eRange.Float): CColor {
        if (_range === CColor.eRange.Windows) {
            _r /= 255; _g /= 255; _b /= 255;
        }
        const max = Math.max(_r, _g, _b), min = Math.min(_r, _g, _b);
        const d = max - min;
        let h = 0;
        if (d) h = max == _r ? (_g - _b) / d + (_g < _b ? 6 : 0) : max == _g ? (_b - _r) / d + 2 : (_r - _g) / d + 4;
        return new CColor(h / 6, max == 0 ? 0 : d / max, max, SDF.eColorModel.HSV);
    }

    // ── HSL ────────────────────────────────────────────────
    static HSLToRGB(_h: number, _s: number, _l: number, _range = CColor.eRange.Float): CColor {
        if (_range === CColor.eRange.Windows) {
            _h /= CColor.WIN_H_MAX; _s /= CColor.WIN_SL_MAX; _l /= CColor.WIN_SL_MAX;
        }
        const k = (n: number) => (n + _h * 12) % 12;
        const a = _s * Math.min(_l, 1 - _l);
        const f = (n: number) => _l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return new CColor(f(0), f(8), f(4), SDF.eColorModel.RGBAdd);
    }
    static RGBToHSL(_r: number, _g: number, _b: number, _range = CColor.eRange.Float): CColor {
        if (_range === CColor.eRange.Windows) {
            _r /= 255; _g /= 255; _b /= 255;
        }
        const max = Math.max(_r, _g, _b), min = Math.min(_r, _g, _b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            h = max == _r ? (_g - _b) / d + (_g < _b ? 6 : 0) : max == _g ? (_b - _r) / d + 2 : (_r - _g) / d + 4;
            h /= 6;
        }
        return new CColor(h, s, l, SDF.eColorModel.HSL);
    }

    // ── HSL ↔ HSV ──────────────────────────────────────────
    static HSLToHSV(_h: number, _s: number, _l: number, _range = CColor.eRange.Float): CColor {
        if (_range === CColor.eRange.Windows) {
            _h /= CColor.WIN_H_MAX; _s /= CColor.WIN_SL_MAX; _l /= CColor.WIN_SL_MAX;
        }
        const hsv1 = _s * (_l < 0.5 ? _l : 1 - _l);
        const hsvS = hsv1 === 0 ? 0 : 2 * hsv1 / (_l + hsv1);
        return new CColor(_h, hsvS, _l + hsv1, SDF.eColorModel.HSV);
    }
    static HSVToHSL(_h: number, _s: number, _v: number, _range = CColor.eRange.Float): CColor {
        if (_range === CColor.eRange.Windows) {
            _h /= CColor.WIN_H_MAX; _s /= CColor.WIN_SL_MAX; _v /= CColor.WIN_SL_MAX;
        }
        const hslL = (2 - _s) * _v;
        const hslS = hslL == 0 || hslL == 2 ? 0 : _s * _v / (hslL <= 1 ? hslL : 2 - hslL);
        return new CColor(_h, hslS, hslL / 2, SDF.eColorModel.HSL);
    }

    // ── Hex ────────────────────────────────────────────────
    static RGBToHex(_r: number, _g: number, _b: number, _alpha: number = null, _range = CColor.eRange.Float): number {
            if (_range === CColor.eRange.Float) {
                _r = Math.round(_r * 255); _g = Math.round(_g * 255); _b = Math.round(_b * 255);
            }
            if (_alpha == null) return ((_r << 16) | (_g << 8) | _b) >>> 0;
            const a = Math.round(_alpha * 255);
            return ((_r << 24) | (_g << 16) | (_b << 8) | a) >>> 0;
        }
        private static ParseHexString(_hex: string): { value: number, alpha: boolean } {
        let str = _hex.trim().replace(/^(0x|#)/i, '');
        const alpha = str.length === 8;
        return { value: parseInt(str, 16), alpha };
    }

    static HexToRGB(_hex: number, _alpha?: boolean): CColor;
    static HexToRGB(_hex: string): CColor;
    static HexToRGB(_hex: number | string, _alpha: boolean = false): CColor {
        if (typeof _hex === 'string') {
            const { value, alpha } = CColor.ParseHexString(_hex);
            return CColor.HexToRGB(value, alpha);
        }
        if (_alpha == false) {
            const r = (_hex >> 16) & 0xFF;
            const g = (_hex >>  8) & 0xFF;
            const b =  _hex        & 0xFF;
            return new CColor(r / 255, g / 255, b / 255, SDF.eColorModel.RGBAdd);
        }
        const r = (_hex >> 24) & 0xFF;
        const g = (_hex >> 16) & 0xFF;
        const b = (_hex >>  8) & 0xFF;
        return new CColor(r / 255, g / 255, b / 255, SDF.eColorModel.RGBAdd);
    }

    HexToRGB(_hex: number, _alpha?: boolean): this;
    HexToRGB(_hex: string): this;
    HexToRGB(_hex: number | string, _alpha: boolean = false): this {
        if (typeof _hex === 'string') {
            const { value, alpha } = CColor.ParseHexString(_hex);
            return this.HexToRGB(value, alpha);
        }
        if (_alpha == false) {
            this.mF32A[0] = ((_hex >> 16) & 0xFF) / 255;
            this.mF32A[1] = ((_hex >>  8) & 0xFF) / 255;
            this.mF32A[2] = ( _hex        & 0xFF) / 255;
        } else {
            this.mF32A[0] = ((_hex >> 24) & 0xFF) / 255;
            this.mF32A[1] = ((_hex >> 16) & 0xFF) / 255;
            this.mF32A[2] = ((_hex >>  8) & 0xFF) / 255;
        }
        return this;
    }

    ToRGB(): CVec3 {
        const e = SDF.eColorModel;
        if (this.mF32A[3] == e.HSVBaseHSPercent || this.mF32A[3] == e.HSV)
            return CColor.HSVToRGB(this.mF32A[0], this.mF32A[1], this.mF32A[2]).xyz;
        if (this.mF32A[3] == e.HSL)
            return CColor.HSLToRGB(this.mF32A[0], this.mF32A[1], this.mF32A[2]).xyz;
        return this.xyz;
    }

    ToUInt32(_alpha: number = null): number {
        const rgb = this.ToRGB();
        const r = Math.max(0, Math.min(255, Math.round(rgb.x * 255)));
        const g = Math.max(0, Math.min(255, Math.round(rgb.y * 255)));
        const b = Math.max(0, Math.min(255, Math.round(rgb.z * 255)));
        if (_alpha == null) return (r << 16) | (g << 8) | b;
        const a = Math.max(0, Math.min(255, Math.round(_alpha * 255)));
        return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
    }
    ToHex(_alpha: number = null): string {
        const rgb = this.ToRGB();
        const r = Math.max(0, Math.min(255, Math.round(rgb.x * 255)));
        const g = Math.max(0, Math.min(255, Math.round(rgb.y * 255)));
        const b = Math.max(0, Math.min(255, Math.round(rgb.z * 255)));
        const hex = (n: number) => n.toString(16).padStart(2, '0');
        if (_alpha == null) return `${hex(r)}${hex(g)}${hex(b)}`;           // 0000ff
        const a = Math.max(0, Math.min(255, Math.round(_alpha * 255)));
        return `${hex(r)}${hex(g)}${hex(b)}${hex(a)}`;                      // 0000ff00
    }

    override EditHTMLInit(_div: HTMLDivElement, _pointer: CPointer = null): void {
        super.EditHTMLInit(_div, _pointer);

        const color: CVec3 = this.ToRGB();
        const tempKey = CUniqueID.GetHash();
        const r = Math.max(0, Math.min(255, Math.round(color.x * 255)));
        const g = Math.max(0, Math.min(255, Math.round(color.y * 255)));
        const b = Math.max(0, Math.min(255, Math.round(color.z * 255)));
        const code = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;

        _div.append(CDOM.DataToDom({
            "tag": "input", "type": "color", "class": "form-control form-control-color",
            "id": tempKey + "_color", "value": code,
            "onchange": (e) => {
                const value = CDOM.IDValue(tempKey + "_color");
                const r = parseInt(value.substring(1, 3), 16) / 255;
                const g = parseInt(value.substring(3, 5), 16) / 255;
                const b = parseInt(value.substring(5, 7), 16) / 255;
                const inputColor = new CVec3(r, g, b);

                if (this.mF32A[3] == SDF.eColorModel.HSVBaseHSPercent || this.mF32A[3] == SDF.eColorModel.HSV)
                    this.xyz = CColor.RGBToHSV(r, g, b).xyz;
                else if (this.mF32A[3] == SDF.eColorModel.HSL)
                    this.xyz = CColor.RGBToHSL(r, g, b).xyz;
                else
                    this.xyz = inputColor;

                this.EditChange(_pointer, false);
            }
        }));

        const textArr = [], valArr = [];
        for (const [text, val] of Object.entries(SDF.eColorModel)) {
            textArr.push(text);
            valArr.push(val);
        }
        const select = document.createElement("select") as HTMLSelectElement;
        select.className = "form-select";
        for (let i = 0; i < textArr.length; ++i) {
            const opt = document.createElement("option");
            opt.value = valArr[i];
            opt.text = textArr[i];
            if (this.mModel == valArr[i]) opt.selected = true;
            select.add(opt);
        }
        select.onchange = (_event) => {
            const ct = _event.currentTarget as HTMLSelectElement;
            this.mF32A[3] = valArr[ct.selectedIndex];
            this.EditChange(_pointer, false);
        };
        _div.append(select);
    }

    override EditChange(_pointer: CPointer, _child: boolean): void {
        super.EditChange(_pointer, _child);
        if (_pointer.member == "mF32A" && _pointer.key == 3)
            this.EditRefresh();
    }

    set r(_val: number)     { this.mF32A[0] = _val; }
    get r()                 { return this.mF32A[0]; }
    set g(_val: number)     { this.mF32A[1] = _val; }
    get g()                 { return this.mF32A[1]; }
    set b(_val: number)     { this.mF32A[2] = _val; }
    get b()                 { return this.mF32A[2]; }
    set mModel(_val: number){ this.mF32A[3] = _val; }
    get mModel()            { return this.mF32A[3]; }

    static black   = new CColor(0,    0,    0   );
    static blue    = new CColor(0,    0,    1   );
    static cyan    = new CColor(0,    1,    1   );
    static gray    = new CColor(0.5,  0.5,  0.5 );
    static green   = new CColor(0,    1,    0   );
    static grey    = new CColor(0.5,  0.5,  0.5 );
    static magenta = new CColor(1,    0,    1   );
    static red     = new CColor(1,    0,    0   );
    static white   = new CColor(1,    1,    1   );
    static yellow  = new CColor(1,    0.92, 0.016);
}
var gColor = new CColor(0, 0, 0, 0);