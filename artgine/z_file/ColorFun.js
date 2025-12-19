import { SDF } from "./SDF";
import { abs, clamp, max, min, mod, pow, sign, sin, smoothstep, CVec2, CVec3, CVec4, Sam2DSize, Sam2DToColor, SaturateV4, V2Abs, V2AddV2, V2DivV2, V2Floor, V2MulFloat, V2MulV2, V2SubV2, V3AddV3, V3Clamp, V3Dot, V3Floor, V3Max, V3Min, V3Mod, V3MulFloat, V3MulV3, V3Step, V3SubV3, V4Abs, V4AddV4, V4Dot, V4Floor, V4Max, V4Mod, V4MulFloat, V4MulV4, V4Pow, V4Step, V4SubV4, step, V3Abs, V3Fract, V4Mix, V3Mix, SaturateV3, floor, screenPos, V4DivV4 } from "./Shader";
export function GetTexCodiedUV(_uv, _texCodi) {
    var result = new CVec2(0.0, 0.0);
    result.x = _uv.x * _texCodi.x + _texCodi.z;
    result.y = _uv.y * _texCodi.y + _texCodi.w;
    return V2Abs(result);
}
export function GetTexDecodedUV(_coded, _texCodi) {
    var sx = (_texCodi.x == 0.0) ? 1.0 : _texCodi.x;
    var sy = (_texCodi.y == 0.0) ? 1.0 : _texCodi.y;
    var cx = abs(_coded.x);
    var cy = abs(_coded.y);
    var u = (cx - _texCodi.z) / sx;
    var v = (cy - _texCodi.w) / sy;
    return new CVec2(u, v);
}
export function HSVToRGB(_vec3) {
    var K = new CVec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    var p = V3Abs(V3SubV3(V3MulFloat(V3Fract(V3AddV3(new CVec3(_vec3.x, _vec3.x, _vec3.x), K.xyz)), 6.0), new CVec3(K.w, K.w, K.w)));
    return V3MulFloat(V3Mix(new CVec3(K.x, K.x, K.x), V3Clamp(V3SubV3(p, new CVec3(K.x, K.x, K.x)), 0.0, 1.0), _vec3.y), _vec3.z);
}
export function RGBToHSV(_vec3) {
    var K = new CVec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    var p = V4Mix(new CVec4(new CVec2(_vec3.z, _vec3.y), new CVec2(K.w, K.z)), new CVec4(new CVec2(_vec3.y, _vec3.z), new CVec2(K.x, K.y)), step(_vec3.z, _vec3.y));
    var q = V4Mix(new CVec4(new CVec3(p.x, p.y, p.w), _vec3.x), new CVec4(_vec3.x, new CVec3(p.y, p.z, p.x)), step(p.x, _vec3.x));
    var d = q.x - min(q.w, q.y);
    var e = 1.0e-10;
    return new CVec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
export function HSLToRGB(_vec3) {
    var RGB = SaturateV3(new CVec3(abs(_vec3.x * 6.0 - 3.0) - 1.0, 2.0 - abs(_vec3.x * 6.0 - 2.0), 2.0 - abs(_vec3.x * 6.0 - 4.0)));
    var C = (1.0 - abs(2.0 * _vec3.z - 1.0)) * _vec3.y;
    return V3MulFloat(V3SubV3(RGB, new CVec3(0.5, 0.5, 0.5)), C * _vec3.z);
}
export function RGBToHSL(_vec3) {
    var P = (_vec3.y < _vec3.z) ? new CVec4(new CVec2(_vec3.z, _vec3.y), -1.0, 2.0 / 3.0) : new CVec4(new CVec2(_vec3.y, _vec3.z), 0.0, -1.0 / 3.0);
    var Q = (_vec3.x < P.x) ? new CVec4(new CVec3(P.x, P.y, P.w), _vec3.x) : new CVec4(_vec3.x, new CVec3(P.y, P.z, P.x));
    var C = Q.x - min(Q.w, Q.y);
    var H = abs((Q.w - Q.y) / (6.0 * C + 1e-10) + Q.z);
    var L = Q.x - C * 0.5;
    var S = C / (1.0 - abs(L * 2.0 - 1.0) + 1e-10);
    return new CVec3(H, S, L);
}
export function CAModelCac(_rgba, _cModel, _aModel) {
    var rgb;
    if (_cModel.a < SDF.eColorModel.RGBAdd + 0.5)
        rgb = V3AddV3(_rgba.rgb, _cModel.rgb);
    else if (_cModel.a < SDF.eColorModel.RGBMul + 0.5)
        rgb = V3MulV3(_rgba.rgb, _cModel.rgb);
    else if (_cModel.a < SDF.eColorModel.HSVBaseHSPercent + 0.5) {
        var hsv = RGBToHSV(_rgba.rgb);
        hsv.y = _cModel.y;
        hsv.x = _cModel.x;
        rgb = HSVToRGB(hsv);
        rgb.x = _rgba.x * (1.0 - _cModel.z) + rgb.x * _cModel.z;
        rgb.y = _rgba.y * (1.0 - _cModel.z) + rgb.y * _cModel.z;
        rgb.z = _rgba.z * (1.0 - _cModel.z) + rgb.z * _cModel.z;
    }
    else if (_cModel.a < SDF.eColorModel.HSV + 0.5)
        rgb = HSVToRGB(_cModel.rgb);
    else if (_cModel.a < SDF.eColorModel.HSL + 0.5)
        rgb = HSLToRGB(_cModel.rgb);
    else
        rgb = _rgba.rgb;
    rgb = V3Clamp(rgb, 0.0, 1.0);
    var a;
    if (_aModel.y < SDF.eAlphaModel.Add + 0.5)
        a = _rgba.a + _aModel.x;
    else if (_aModel.y < SDF.eAlphaModel.Mul + 0.5)
        a = _rgba.a * _aModel.x;
    else
        a = _rgba.a;
    a = clamp(a, 0.0, 1.0);
    return new CVec4(rgb, a);
}
function GetDistortedUV(_uv, _distance, _t) {
    var line = max(0.0, sin(_uv.y * 3.8 + _t * 1.4) * sin(_uv.y * 0.6 + _t * 2.3));
    var horDis = sin(_uv.y * 2.0 + _t) + sin(_uv.y * 50.0 + _t * 5.7) * 0.3 +
        sin(_uv.y * 500.0 + _t * 20.0) * 0.1;
    horDis *= _distance.x * line;
    var verDis = sin(_uv.y * 2.5 + 5.1 + _t * 1.4) *
        sign(sin(_uv.y * 3.6 + _t * 2.4));
    verDis *= _distance.y * line;
    return V2AddV2(_uv, new CVec2(horDis, verDis));
}
function GetAberratedColor(_texOff, _uv, _t, _baseStr, _addedStr) {
    var line = max(0.0, sin(_uv.y * 3.8 + _t * 1.4) * sin(_uv.y * 0.6 + _t * 2.3));
    var aberration_strength = (0.1 + line) * _addedStr + _baseStr;
    var r = Sam2DToColor(_texOff, new CVec2(_uv.x - aberration_strength, _uv.y));
    var g = Sam2DToColor(_texOff, _uv);
    var b = Sam2DToColor(_texOff, new CVec2(_uv.x + aberration_strength, _uv.y));
    return SaturateV4(new CVec4(r.r, g.g, b.b, max(r.a, max(g.a, b.a))));
}
function GetPixelatedUV(_texSize, _pixelSize, _uv) {
    var d = V2DivV2(_pixelSize, _texSize);
    return V2MulV2(d, V2AddV2(V2Floor(V2DivV2(_uv, d)), new CVec2(0.5, 0.5)));
}
function permute(_x) {
    var x = V4MulV4(_x, V4AddV4(V4MulFloat(_x, 34.0), new CVec4(10.0, 10.0, 10.0, 10.0)));
    return V4Mod(x, 289.0);
}
function taylorInvSqrt(_r) {
    return V4SubV4(new CVec4(1.79284291400159, 1.79284291400159, 1.79284291400159, 1.79284291400159), V4MulFloat(_r, 0.85373472095314));
}
function SNoise(_v) {
    var C = new CVec2(1.0 / 6.0, 1.0 / 3.0);
    var D = new CVec4(0.0, 0.5, 1.0, 2.0);
    var dotVal = V3Dot(_v, new CVec3(C.y, C.y, C.y));
    var i = V3Floor(V3AddV3(_v, new CVec3(dotVal, dotVal, dotVal)));
    dotVal = V3Dot(i, new CVec3(C.x, C.x, C.x));
    var x0 = V3AddV3(V3SubV3(_v, i), new CVec3(dotVal, dotVal, dotVal));
    var g = V3Step(new CVec3(x0.y, x0.z, x0.x), x0);
    var l = V3SubV3(new CVec3(1.0, 1.0, 1.0), g);
    var i1 = V3Min(g, new CVec3(l.z, l.x, l.y));
    var i2 = V3Max(g, new CVec3(l.z, l.x, l.y));
    var x1 = V3AddV3(V3SubV3(x0, i1), new CVec3(C.x));
    var x2 = V3AddV3(V3SubV3(x0, i2), new CVec3(C.y));
    var x3 = V3SubV3(x0, new CVec3(D.y));
    i = V3Mod(i, 289.0);
    var p = permute(new CVec4(i.z, i.z + i1.z, i.z + i2.z, i.z + 1.0));
    p = permute(new CVec4(p.x + i.y, p.y + i.y + i1.y, p.z + i.y + i2.y, p.w + i.y + 1.0));
    p = permute(new CVec4(p.x + i.x, p.y + i.x + i1.x, p.z + i.x + i2.x, p.w + i.x + 1.0));
    var n_ = 1.0 / 7.0;
    var ns = V3MulFloat(new CVec3(D.w, D.y, D.z), n_);
    ns = V3SubV3(ns, new CVec3(D.x, D.z, D.x));
    var floor_p = V4Floor(V4MulFloat(p, ns.z * ns.z));
    var j = V4SubV4(p, V4MulFloat(floor_p, 49.0));
    var x_ = V4Floor(V4MulFloat(j, ns.z));
    var y_ = V4Floor(V4SubV4(j, V4MulFloat(x_, 7.0)));
    var x = V4AddV4(V4MulFloat(x_, ns.x), new CVec4(ns.y));
    var y = V4AddV4(V4MulFloat(y_, ns.x), new CVec4(ns.y));
    var h = V4SubV4(V4SubV4(new CVec4(1.0, 1.0, 1.0, 1.0), V4Abs(x)), V4Abs(y));
    var b0 = new CVec4(x.x, x.y, y.x, y.y);
    var b1 = new CVec4(x.z, x.w, y.z, y.w);
    var s0 = V4AddV4(V4MulFloat(V4Floor(b0), 2.0), new CVec4(1.0, 1.0, 1.0, 1.0));
    var s1 = V4AddV4(V4MulFloat(V4Floor(b1), 2.0), new CVec4(1.0, 1.0, 1.0, 1.0));
    var sh = V4MulFloat(V4Step(h, new CVec4(0.0, 0.0, 0.0, 0.0)), -1.0);
    var a0 = V4AddV4(new CVec4(b0.x, b0.z, b0.y, b0.w), new CVec4(s0.x * sh.x, s0.z * sh.x, s0.y * sh.y, s0.w * sh.y));
    var a1 = V4AddV4(new CVec4(b1.x, b1.z, b1.y, b1.w), new CVec4(s1.x * sh.z, s1.z * sh.z, s1.y * sh.w, s1.w * sh.w));
    var p0 = new CVec3(a0.x, a0.y, h.x);
    var p1 = new CVec3(a0.z, a0.w, h.y);
    var p2 = new CVec3(a1.x, a1.y, h.z);
    var p3 = new CVec3(a1.z, a1.w, h.w);
    var norm = taylorInvSqrt(new CVec4(V3Dot(p0, p0), V3Dot(p1, p1), V3Dot(p2, p2), V3Dot(p3, p3)));
    p0 = V3MulFloat(p0, norm.x);
    p1 = V3MulFloat(p1, norm.y);
    p2 = V3MulFloat(p2, norm.z);
    p3 = V3MulFloat(p3, norm.w);
    var mix = V4SubV4(new CVec4(0.5, 0.5, 0.5, 0.5), new CVec4(V3Dot(x0, x0), V3Dot(x1, x1), V3Dot(x2, x2), V3Dot(x3, x3)));
    mix = V4Max(mix, new CVec4(0.0, 0.0, 0.0, 0.0));
    mix = V4Pow(mix, 4.0);
    var noise = new CVec4(V3Dot(p0, x0), V3Dot(p1, x1), V3Dot(p2, x2), V3Dot(p3, x3));
    return 105.0 * V4Dot(mix, noise);
}
function TimedNoise(_m, _t) {
    return SNoise(new CVec3(_m.x * 500.0, _m.y * 500.0, _t));
}
function AddNoise(_randomSeed, _col, _time, _speed, _intensity) {
    var t = _time * _speed;
    var m = new CVec3(_randomSeed, 0.0);
    var factor1 = 1.0 - TimedNoise(m, t) * _intensity;
    var baseColor = new CVec3(TimedNoise(m, t), TimedNoise(m, t * 2.0), TimedNoise(m, t * 3.0));
    baseColor = V3MulFloat(baseColor, 0.1 * _intensity);
    baseColor = V3AddV3(baseColor, V3MulFloat(_col.rgb, factor1 * (_col.w * factor1 + 0.1 * _intensity)));
    return new CVec4(baseColor, _col.w);
}
function AddBorder(_m, _c, _intensity, _thickness) {
    var distToBorderVec = V2Abs(V2SubV2(V2Abs(_m.xy), new CVec2(5.0, 5.0)));
    var distToBorder = min(distToBorderVec.x, distToBorderVec.y);
    var f = 1.0 - smoothstep(0.0, _thickness, distToBorder);
    return V4AddV4(_c, V4MulFloat(new CVec4(f, f, f, 1.0), _intensity));
}
function UV_Curve(_uv) {
    _uv = V2MulFloat(V2SubV2(_uv, new CVec2(0.5, 0.5)), 2.0);
    _uv.x *= 1.0 + pow(abs(_uv.x) / 3.0, 2.0);
    _uv.y *= 1.0 + pow(abs(_uv.y) / 3.0, 2.0);
    _uv.x /= 1.2;
    _uv.y /= 1.2;
    _uv = V2AddV2(V2MulFloat(_uv, 0.5), new CVec2(0.5, 0.5));
    return _uv;
}
function AddScanLine(_c, _uv, _time, _count, _lineSpeed) {
    var scanline = sin(UV_Curve(_uv).y * _count * 3.14 * 2.0 + _time * _lineSpeed);
    scanline = (scanline * 0.5 + 0.5) * 0.9 + 0.1;
    scanline = pow(scanline, 0.25);
    var sLine = new CVec4(new CVec3(scanline, scanline, scanline), 1.0);
    _c = V4MulV4(_c, sLine);
    return _c;
}
function DitherMatrix4x4(_p) {
    var x = floor(mod(_p.x, 4.0));
    var y = floor(mod(_p.y, 4.0));
    if (y < 0.5) {
        if (x < 0.5)
            return 0.0 / 16.0;
        if (x < 1.5)
            return 8.0 / 16.0;
        if (x < 2.5)
            return 2.0 / 16.0;
        if (x < 3.5)
            return 10.0 / 16.0;
    }
    else if (y < 1.5) {
        if (x < 0.5)
            return 12.0 / 16.0;
        if (x < 1.5)
            return 4.0 / 16.0;
        if (x < 2.5)
            return 14.0 / 16.0;
        if (x < 3.5)
            return 6.0 / 16.0;
    }
    else if (y < 2.5) {
        if (x < 0.5)
            return 3.0 / 16.0;
        if (x < 1.5)
            return 11.0 / 16.0;
        if (x < 2.5)
            return 1.0 / 16.0;
        if (x < 3.5)
            return 9.0 / 16.0;
    }
    else if (y < 3.5) {
        if (x < 0.5)
            return 15.0 / 16.0;
        if (x < 1.5)
            return 7.0 / 16.0;
        if (x < 2.5)
            return 13.0 / 16.0;
        if (x < 3.5)
            return 5.0 / 16.0;
    }
    return 0.0;
}
function MapToPaletteUV(_color, _cellSize) {
    var palSize = Sam2DSize(1.0);
    _color = V3Clamp(_color, 0.0, 0.9999);
    var mappedColor = V3Floor(V3MulFloat(_color, _cellSize));
    var mappedIndex = mappedColor.x + mappedColor.y * _cellSize + mappedColor.z * _cellSize * _cellSize;
    return new CVec2(floor(mappedIndex / palSize.x) / palSize.x, mod(mappedIndex, palSize.y) / palSize.y);
}
function GetBlurColor(_uv, _f, _texScale) {
    var uv = V2AddV2(_uv, V2MulV2(_f, _texScale));
    return Sam2DToColor(0.0, uv);
}
function Blur(_color, _uv, _renderType, _renderCount) {
    var all = new CVec4(0.0, 0.0, 0.0, 0.0);
    var fx = max(-_renderCount, -32.0);
    var fy = max(-_renderCount, -32.0);
    var count = 0.0;
    var texScale = V2DivV2(new CVec2(1.0, 1.0), Sam2DSize(0.0));
    if (_renderType < 0.5) {
        for (var y = 0; y < 64; y++) {
            for (var x = 0; x < 64; x++) {
                if (fx <= _renderCount && fy <= _renderCount) {
                    var color = GetBlurColor(_uv, new CVec2(fx, fy), texScale);
                    if (color.a > 0.01) {
                        all = V4AddV4(all, color);
                        count += 1.0;
                    }
                }
                else
                    break;
                fx += 1.0;
            }
            fx = -_renderCount;
            fy += 1.0;
        }
        if (count > 0.01) {
            all = V4DivV4(all, new CVec4(count, count, count, count));
            all = SaturateV4(all);
        }
    }
    else if (_renderType < 1.1) {
        fy = 0.0;
        for (var x = 0; x <= 64; x++) {
            if (fx <= _renderCount && fy <= _renderCount) {
                var color = GetBlurColor(_uv, new CVec2(fx, fy), texScale);
                if (color.a > 0.01) {
                    all = V4AddV4(all, color);
                    count += 1.0;
                }
            }
            else
                break;
            fx += 1.0;
        }
        if (count > 0.01) {
            all = V4DivV4(all, new CVec4(count, count, count, count));
            all = SaturateV4(all);
        }
    }
    else if (_renderType < 2.1) {
        fx = 0.0;
        for (var y = 0; y < 64; y++) {
            if (fx <= _renderCount && fy <= _renderCount) {
                var color = GetBlurColor(_uv, new CVec2(fx, fy), texScale);
                if (color.a > 0.01) {
                    all = V4AddV4(all, color);
                    count += 1.0;
                }
            }
            else
                break;
            fy += 1.0;
        }
        if (count > 0.01) {
            all = V4DivV4(all, new CVec4(count, count, count, count));
            all = SaturateV4(all);
        }
    }
    return all;
}
export function ColorVFX(_color, _uv, _ruv, _value, _time) {
    for (var i = 0; i < 4; ++i) {
        if (_value[i].w < SDF.eColorVFX.None + 0.5) {
            return _color;
        }
        else if (_value[i].w < SDF.eColorVFX.Distort + 0.5) {
            var distortedUV = GetDistortedUV(_uv, new CVec2(_value[i].x, _value[i].y), _time);
            _color = Sam2DToColor(0.0, distortedUV);
        }
        else if (_value[i].w < SDF.eColorVFX.Aberrate + 0.5) {
            _color = GetAberratedColor(0.0, _uv, _time, _value[i].x, _value[i].y);
        }
        else if (_value[i].w < SDF.eColorVFX.Outline + 0.5) {
            if (_color.a <= 0.0) {
                var size = Sam2DSize(0.0);
                size.x = 1.0 / size.x;
                size.y = 1.0 / size.y;
                var lc = Sam2DToColor(0.0, new CVec2(_uv.x - size.x, _uv.y));
                var rc = Sam2DToColor(0.0, new CVec2(_uv.x + size.x, _uv.y));
                var tc = Sam2DToColor(0.0, new CVec2(_uv.x, _uv.y - size.y));
                var bc = Sam2DToColor(0.0, new CVec2(_uv.x, _uv.y + size.y));
                if (lc.a > 0.0 || rc.a > 0.0 || tc.a > 0.0 || bc.a > 0.0) {
                    _color = new CVec4(_value[i].xyz, 1.0);
                }
            }
        }
        else if (_value[i].w < SDF.eColorVFX.Pixel + 0.5) {
            var pixelatedUV = GetPixelatedUV(Sam2DSize(0.0), new CVec2(_value[i].x, _value[i].y), _uv);
            _color = Sam2DToColor(0.0, pixelatedUV);
        }
        else if (_value[i].w < SDF.eColorVFX.Noise + 0.5) {
            var texSize = Sam2DSize(0.0);
            var fragCoord = V2Floor(V2DivV2(V2MulV2(_uv, texSize), new CVec2(_value[i].z, _value[i].z)));
            _color = AddNoise(fragCoord, _color, _time, _value[i].x, _value[i].y);
        }
        else if (_value[i].w < SDF.eColorVFX.Scanline + 0.5) {
            _color = AddScanLine(_color, _uv, _time, _value[i].x, _value[i].y);
        }
        else if (_value[i].w < SDF.eColorVFX.ColorPalette + 0.5) {
            var palSize = Sam2DSize(_value[i].x);
            var cellSize = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
            var ditherStrength = (DitherMatrix4x4(screenPos.xy) - 0.5) / (cellSize - 1.0) * _value[i].y;
            _color.rgb = V3AddV3(_color.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
            var palUV = MapToPaletteUV(_color.rgb, cellSize);
            _color = Sam2DToColor(_value[i].x, palUV);
        }
        else if (_value[i].w < SDF.eColorVFX.Blur + 0.5) {
            _color = Blur(_color, _uv, _value[i].x, _value[i].y);
        }
    }
    return _color;
}
