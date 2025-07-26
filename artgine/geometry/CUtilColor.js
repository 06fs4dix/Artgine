import { CVec4 } from "./CVec4.js";
export class CUtilColor {
    static HSVAToRGBA(_hsva, _result = new CVec4()) {
        let f = (n, k = (n + _hsva.mF32A[0] * 6) % 6) => _hsva.mF32A[2] - _hsva.mF32A[2] * _hsva.mF32A[1] * Math.max(Math.min(k, 4 - k, 1), 0);
        _result.mF32A[0] = f(5);
        _result.mF32A[1] = f(3);
        _result.mF32A[2] = f(1);
        _result.mF32A[3] = _hsva.w;
        return _result;
    }
    static RGBAToHSVA(_rgba, _result = new CVec4()) {
        let [r, g, b] = [_rgba.mF32A[0], _rgba.mF32A[1], _rgba.mF32A[2]];
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let d = max - min, h = 0;
        if (d)
            h = max == r ? (g - b) / d + (g < b ? 6 : 0) : max == g ? (b - r) / d + 2 : (r - g) / d + 4;
        _result.mF32A[0] = h / 6;
        _result.mF32A[1] = max == 0 ? 0 : d / max;
        _result.mF32A[2] = max;
        _result.mF32A[3] = _rgba.mF32A[3];
        return _result;
    }
    static HSLAToRGBA(_hsla, _result = new CVec4()) {
        const k = n => (n + _hsla.mF32A[0] * 12) % 12;
        const a = _hsla.mF32A[1] * Math.min(_hsla.mF32A[2], 1 - _hsla.mF32A[2]);
        const f = n => _hsla.mF32A[2] - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        _result.mF32A[0] = f(0);
        _result.mF32A[1] = f(8);
        _result.mF32A[2] = f(4);
        _result.mF32A[3] = _hsla.mF32A[3];
        return _result;
    }
    static RGBAToHSLA(_rgba, _result = new CVec4()) {
        let [r, g, b] = [_rgba.mF32A[0], _rgba.mF32A[1], _rgba.mF32A[2]];
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            h = max == r ? (g - b) / d + (g < b ? 6 : 0) : max == g ? (b - r) / d + 2 : (r - g) / d + 4;
            h /= 6;
        }
        _result.mF32A[0] = h;
        _result.mF32A[1] = s;
        _result.mF32A[2] = l;
        _result.mF32A[3] = _rgba.mF32A[3];
        return _result;
    }
    static HSLAToHSVA(_hsla, _result = new CVec4()) {
        const hsv1 = _hsla.mF32A[1] * (_hsla.mF32A[2] < 0.5 ? _hsla.mF32A[2] : 1 - _hsla.mF32A[2]);
        const hsvS = hsv1 === 0 ? 0 : 2 * hsv1 / (_hsla.mF32A[2] + hsv1);
        const hsvV = _hsla.mF32A[2] + hsv1;
        _result.mF32A[0] = _hsla.mF32A[0];
        _result.mF32A[1] = hsvS;
        _result.mF32A[2] = hsvV;
        _result.mF32A[3] = _hsla.mF32A[3];
        return _result;
    }
    static HSVAToHSLA(_hsva, _result = new CVec4()) {
        const hslL = (2 - _hsva.y) * _hsva.z;
        const [hslS, hslV] = [
            hslL == 0 || hslL == 2 ? 0 : _hsva.y * _hsva.z / (hslL <= 1 ? hslL : 2 - hslL),
            hslL / 2
        ];
        _result.mF32A[0] = _hsva.x;
        _result.mF32A[1] = hslS;
        _result.mF32A[2] = hslV;
        _result.mF32A[3] = _hsva.w;
        return _result;
    }
    static BrightenColor(_color, _brighter) {
        return new CVec4((1.0 - _color.x) * _brighter + _color.x, (1.0 - _color.y) * _brighter + _color.y, (1.0 - _color.z) * _brighter + _color.z, 0.0);
    }
    static DarkenColor(_color, _darker) {
        return new CVec4(-(1.0 - _color.x) * _darker + _color.x, -(1.0 - _color.y) * _darker + _color.y, -(1.0 - _color.z) * _darker + _color.z, 0.0);
    }
}
