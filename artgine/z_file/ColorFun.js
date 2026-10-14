import { NoiseGet, NoiseValue3, SampleNoise, SampleNoiseVec2 } from "./Noise";
import { SDF } from "./SDF";
import { abs, clamp, max, min, mod, pow, sign, sin, CMat, CVec2, CVec3, CVec4, Sam2DSize, Sam2DToColor, SaturateV4, V2Abs, V2AddV2, V2DivV2, V2Floor, V2MulFloat, V2MulV2, V2SubV2, V3AddV3, V3Clamp, V3Floor, V3MulFloat, V3MulV3, V3SubV3, V4AddV4, V4MulFloat, V4MulV4, step, V3Abs, V3Fract, V4Mix, V3Mix, SaturateV3, floor, screenPos, FloatToInt, IntToFloat, Null, Sam2DToV4, sqrt, V2Dot, V2Mod, V4MulMatCoordi, V3Nor, V3Cross, cos, Sam2DArrV4, Sam2DArrNearestToV4, fract, V3Sqrt } from "./Shader";
import { Tonemap } from "./ToneMapping";
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
export function PackGrayToRG(_v) {
    if (_v <= 0.0)
        return new CVec2(0.0, 0.0);
    if (_v >= 1.0)
        return new CVec2(1.0, 1.0);
    var rf;
    var gf;
    rf = _v * 256.0;
    gf = fract(rf);
    return new CVec2(floor(rf) / 255.0, gf);
}
export function PackGrayToRGB(_v) {
    if (_v <= 0.0)
        return new CVec3(0.0, 0.0, 0.0);
    if (_v >= 1.0)
        return new CVec3(1.0, 1.0, 1.0);
    var rf;
    var gf;
    var bf;
    gf = _v * 256.0 * 256.0;
    bf = fract(gf);
    rf = floor(gf) / 256.0;
    gf = fract(rf);
    return new CVec3(floor(rf) / 255.0, gf * 256.0 / 255.0, bf);
}
export function PackGrayToRGBA(_v) {
    if (_v <= 0.0)
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    if (_v >= 1.0)
        return new CVec4(1.0, 1.0, 1.0, 1.0);
    var rf;
    var gf;
    var bf;
    var af;
    bf = _v * 256.0 * 256.0 * 256.0;
    af = fract(bf);
    gf = floor(bf) / 256.0;
    bf = fract(gf);
    rf = floor(gf) / 256.0;
    gf = fract(rf);
    return new CVec4(floor(rf) / 255.0, gf * 256.0 / 255.0, bf * 256.0 / 255.0, af);
}
export function UnpackRGToGray(_v) {
    return _v.x * 255.0 / 256.0 + _v.y * 1.0 / 256.0;
}
export function UnpackRGBToGray(_v) {
    return _v.x * 255.0 / 256.0 + _v.y * 255.0 / (256.0 * 256.0) + _v.z * 1.0 / (256.0 * 256.0);
}
export function UnpackRGBAToGray(_v) {
    return _v.x * 255.0 / 256.0 + _v.y * 255.0 / (256.0 * 256.0) + _v.z * 255.0 / (256.0 * 256.0 * 256.0) + _v.w * 1.0 / (256.0 * 256.0 * 256.0);
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
export function ColorModalFun(_rgb, _colorModel) {
    var rgb;
    if (_colorModel.a < SDF.eColorModel.RGBAdd + 0.5)
        rgb = V3AddV3(_rgb, _colorModel.rgb);
    else if (_colorModel.a < SDF.eColorModel.RGBMul + 0.5)
        rgb = V3MulV3(_rgb, _colorModel.rgb);
    else if (_colorModel.a < SDF.eColorModel.HSVBaseHSPercent + 0.5) {
        var hsv = RGBToHSV(_rgb);
        hsv.y = _colorModel.y;
        hsv.x = _colorModel.x;
        rgb = HSVToRGB(hsv);
        rgb.x = _rgb.x * (1.0 - _colorModel.z) + rgb.x * _colorModel.z;
        rgb.y = _rgb.y * (1.0 - _colorModel.z) + rgb.y * _colorModel.z;
        rgb.z = _rgb.z * (1.0 - _colorModel.z) + rgb.z * _colorModel.z;
    }
    else if (_colorModel.a < SDF.eColorModel.HSV + 0.5)
        rgb = HSVToRGB(_colorModel.rgb);
    else if (_colorModel.a < SDF.eColorModel.HSL + 0.5)
        rgb = HSLToRGB(_colorModel.rgb);
    else if (_colorModel.a < SDF.eColorModel.None + 0.5)
        rgb = _rgb;
    else if (_colorModel.a < SDF.eColorModel.Unpack + 0.5) {
        var stop0 = new CVec3(0.0, 0.0, 0.5);
        var stop1 = new CVec3(0.0, 0.5, 1.0);
        var stop2 = new CVec3(0.94, 0.94, 0.25);
        var stop3 = new CVec3(0.13, 0.55, 0.13);
        var stop4 = new CVec3(0.55, 0.27, 0.07);
        var stop5 = new CVec3(1.0, 1.0, 1.0);
        var stopT0 = 0.0;
        var stopT1 = 0.2;
        var stopT2 = 0.25;
        var stopT3 = 0.5;
        var stopT4 = 0.8;
        var stopT5 = 1.0;
        var gray = _rgb.x;
        var col0;
        var col1;
        var range;
        if (gray < stopT1) {
            col0 = stop0;
            col1 = stop1;
            range = (gray - stopT0) / (stopT1 - stopT0);
        }
        else if (gray < stopT2) {
            col0 = stop1;
            col1 = stop2;
            range = (gray - stopT1) / (stopT2 - stopT1);
        }
        else if (gray < stopT3) {
            col0 = stop2;
            col1 = stop3;
            range = (gray - stopT2) / (stopT3 - stopT2);
        }
        else if (gray < stopT4) {
            col0 = stop3;
            col1 = stop4;
            range = (gray - stopT3) / (stopT4 - stopT3);
        }
        else {
            col0 = stop4;
            col1 = stop5;
            range = (gray - stopT4) / (stopT5 - stopT4);
        }
        rgb = V3Mix(col0, col1, range);
    }
    else
        rgb = _rgb;
    rgb = V3Clamp(rgb, 0.0, 1.0);
    return rgb;
}
export function AlphaModalFun(_a, _alphaModel) {
    var a = _a * _alphaModel.x;
    a = clamp(a, 0.0, 1.0);
    if (a <= _alphaModel.y)
        a = 0.0;
    return a;
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
function GetPixelatedUV(_texSize, _pixelSize, _uv) {
    var d = V2DivV2(_pixelSize, _texSize);
    return V2MulV2(d, V2AddV2(V2Floor(V2DivV2(_uv, d)), new CVec2(0.5, 0.5)));
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
function MapToPaletteIndex(_color, _cellSize, _palSize) {
    _color = V3Clamp(_color, 0.0, 0.9999);
    var mappedColor = V3Floor(V3MulFloat(_color, _cellSize));
    var mappedIndex = mappedColor.x + mappedColor.y * _cellSize + mappedColor.z * _cellSize * _cellSize;
    return floor(mappedIndex / _palSize.x) + mod(mappedIndex, _palSize.y) * _palSize.x;
}
export var VFX = Null();
export var LUT0 = new Sam2DArrV4(1, SDF.eUni.V4LookUpTable0);
export var LUT1 = new Sam2DArrV4(1, SDF.eUni.V4LookUpTable1);
export var LUT2 = new Sam2DArrV4(1, SDF.eUni.V4LookUpTable2);
export var LUT3 = new Sam2DArrV4(1, SDF.eUni.V4LookUpTable3);
export var LUT4 = new Sam2DArrV4(1, SDF.eUni.V4LookUpTable4);
export var LUT5 = new Sam2DArrV4(1, SDF.eUni.V4LookUpTable5);
export var vfxMat0 = Null();
export var vfxMat1 = Null();
function VFXSlotType(_value, _slot) {
    if (_slot < 0.5)
        return _value[0].x;
    if (_slot < 1.5)
        return _value[1].y;
    return _value[2].z;
}
function VFXSlotPara(_value, _slot) {
    if (_slot < 0.5)
        return new CVec4(_value[0].y, _value[0].z, _value[0].w, _value[1].x);
    if (_slot < 1.5)
        return new CVec4(_value[1].z, _value[1].w, _value[2].x, _value[2].y);
    return new CVec4(_value[2].w, _value[3].x, _value[3].y, _value[3].z);
}
function VFXIsTap(_type) {
    if (abs(_type - SDF.eVFX.Aberrate) < 0.5 || abs(_type - SDF.eVFX.Outline) < 0.5 || abs(_type - SDF.eVFX.Blur) < 0.5)
        return 1.0;
    return 0.0;
}
function VFXUV(_uv, _type, _para, _time) {
    if (abs(_type - SDF.eVFX.Distort) < 0.5)
        return GetDistortedUV(_uv, new CVec2(_para.x, _para.y), _time);
    if (abs(_type - SDF.eVFX.Pixel) < 0.5)
        return GetPixelatedUV(Sam2DSize(0.0), new CVec2(_para.x, _para.y), _uv);
    return _uv;
}
function VFXColor(_color, _uv, _type, _para, _slot, _time, _worldPos) {
    var outColor = _color;
    if (abs(_type - SDF.eVFX.Noise) < 0.5) {
        var noiseColor = new CVec3(0.0, 0.0, 0.0);
        var frame = _time * _para.y / 60.0;
        if (_para.x > SDF.eNoise.Gaussian - 0.5) {
            var xi = _uv.x * _para.w * 128.0;
            var yi = _uv.y * _para.w * 128.0;
            var zi = frame * 128.0;
            noiseColor.x = NoiseValue3(new CVec3(xi, yi, zi));
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        else if (_para.x > SDF.eNoise.Blue - 0.5) {
            var coord = V2Floor(V2Mod(V2MulFloat(V2AddV2(_uv, new CVec2(frame, frame)), _para.w * 64.0), 64.0));
            var index = coord.y * 64.0 + coord.x;
            var modIndex = mod(index, 2048.0);
            var v4 = Sam2DToV4(new CVec2(11, SDF.eNoise.Blue), modIndex);
            noiseColor.x = index < 2048.0 ? v4.x : v4.y;
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        else if (_para.x > SDF.eNoise.PerlinFBM3 - 0.5) {
            noiseColor.x = SampleNoise(new CVec3(V2MulFloat(_uv, _para.w), frame), SDF.eNoise.PerlinFBM3);
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        else if (_para.x > SDF.eNoise.PerlinNormal - 0.5) {
            var noise = SampleNoiseVec2(new CVec3(V2MulFloat(_uv, _para.w), frame), SDF.eNoise.PerlinNormal);
            noiseColor.xyz = new CVec3(noise.x, sqrt(1.0 - V2Dot(noise, noise)), noise.y);
        }
        else {
            noiseColor.x = SampleNoise(new CVec3(V2MulFloat(_uv, _para.w), frame), SDF.eNoise.Perlin);
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        outColor.rgb = V3MulV3(outColor.rgb, V3Mix(noiseColor, new CVec3(1, 1, 1), 1.0 - _para.z));
    }
    else if (abs(_type - SDF.eVFX.Scanline) < 0.5) {
        outColor = AddScanLine(outColor, _uv, _time, _para.x, _para.y);
    }
    else if (abs(_type - SDF.eVFX.LookUpTable) < 0.5) {
        var palSize = new CVec2(32.0, 32.0);
        var cellSize = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
        var ditherStrength = (NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Blue) - 0.5) / (cellSize - 1.0) * _para.y;
        outColor.rgb = V3AddV3(outColor.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
        var palIndex = MapToPaletteIndex(outColor.rgb, cellSize, palSize);
        outColor = Sam2DArrNearestToV4(new CVec3(1.0, _para.x, 0.0), palIndex);
    }
    else if (abs(_type - SDF.eVFX.Decal) < 0.5 || abs(_type - SDF.eVFX.DecalTexture) < 0.5) {
        var decalDir;
        var decalRot;
        var decalSca;
        var decalPos;
        if (_slot < 0.5) {
            decalDir = new CVec3(vfxMat0[0][0], vfxMat0[0][1], vfxMat0[0][2]);
            decalRot = vfxMat0[0][3];
            decalSca = new CVec3(vfxMat0[1][0], vfxMat0[1][1], vfxMat0[1][2]);
            decalPos = new CVec3(vfxMat0[1][3], vfxMat0[2][0], vfxMat0[2][1]);
        }
        else if (_slot < 1.5) {
            decalDir = new CVec3(vfxMat0[2][2], vfxMat0[2][3], vfxMat0[3][0]);
            decalRot = vfxMat0[3][1];
            decalSca = new CVec3(vfxMat0[3][2], vfxMat0[3][3], vfxMat1[0][0]);
            decalPos = new CVec3(vfxMat1[0][1], vfxMat1[0][2], vfxMat1[0][3]);
        }
        else {
            decalDir = new CVec3(vfxMat1[1][0], vfxMat1[1][1], vfxMat1[1][2]);
            decalRot = vfxMat1[1][3];
            decalSca = new CVec3(vfxMat1[2][0], vfxMat1[2][1], vfxMat1[2][2]);
            decalPos = new CVec3(vfxMat1[2][3], vfxMat1[3][0], vfxMat1[3][1]);
        }
        var zAxis = V3Nor(decalDir);
        var up = abs(zAxis.y) > 1.0 - 1e-8 ? new CVec3(0.0, 0.0, -1.0) : new CVec3(0.0, 1.0, 0.0);
        var xAxis = V3Cross(up, zAxis);
        var yAxis = V3Cross(zAxis, xAxis);
        var rx = xAxis;
        var ry = yAxis;
        if (abs(decalRot) > 1e-8) {
            var cosT = cos(decalRot);
            var sinT = sin(decalRot);
            rx = V3Nor(V3AddV3(V3MulFloat(xAxis, cosT), V3MulFloat(yAxis, sinT)));
            ry = V3Nor(V3SubV3(V3MulFloat(yAxis, cosT), V3MulFloat(xAxis, sinT)));
        }
        var decalMat = new CMat(rx.x / decalSca.x, rx.y / decalSca.x, rx.z / decalSca.x, 0.0, ry.x / decalSca.y, ry.y / decalSca.y, ry.z / decalSca.y, 0.0, zAxis.x / decalSca.z, zAxis.y / decalSca.z, zAxis.z / decalSca.z, 0.0, 0.0, 0.0, 0.0, 1.0);
        decalMat[3][0] = -(decalPos.x * decalMat[0][0] + decalPos.y * decalMat[0][1] + decalPos.z * decalMat[0][2]);
        decalMat[3][1] = -(decalPos.x * decalMat[1][0] + decalPos.y * decalMat[1][1] + decalPos.z * decalMat[1][2]);
        decalMat[3][2] = -(decalPos.x * decalMat[2][0] + decalPos.y * decalMat[2][1] + decalPos.z * decalMat[2][2]);
        var decalUV = V4MulMatCoordi(_worldPos, decalMat);
        decalUV = V4MulFloat(decalUV, 1.0 / decalUV.w);
        if (decalUV.x >= -0.5 && decalUV.x <= 0.5 && decalUV.y >= -0.5 && decalUV.y <= 0.5 && decalUV.z >= -0.5 && decalUV.z <= 0.5) {
            if (abs(_type - SDF.eVFX.Decal) < 0.5) {
                var decalColor = _para;
                outColor = new CVec4(V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a), outColor.a);
            }
            else {
                var decalTex = Sam2DToColor(_para.x, new CVec2(decalUV.x * -1.0 + 0.5, decalUV.y * 1.0 + 0.5));
                decalTex.a *= _para.y;
                outColor = new CVec4(V3Mix(outColor.rgb, decalTex.rgb, outColor.a * decalTex.a), outColor.a);
                if (_para.z > 0.5 && decalTex.a > 0.001) {
                    outColor.r = 1.0 - outColor.r;
                    outColor.g = 1.0 - outColor.g;
                    outColor.b = 1.0 - outColor.b;
                }
            }
        }
    }
    return outColor;
}
function VFXChain(_uv, _end, _value, _time, _worldPos) {
    var uv = _uv;
    var uv1 = _uv;
    var uv2 = _uv;
    if (_end > 2.5) {
        uv2 = uv;
        uv = VFXUV(uv, _value[2].z, VFXSlotPara(_value, 2.0), _time);
    }
    if (_end > 1.5) {
        uv1 = uv;
        uv = VFXUV(uv, _value[1].y, VFXSlotPara(_value, 1.0), _time);
    }
    var uv0 = uv;
    if (_end > 0.5)
        uv = VFXUV(uv, _value[0].x, VFXSlotPara(_value, 0.0), _time);
    var outColor = Sam2DToColor(0.0, uv);
    for (var i = 0; i < 3; ++i) {
        if (i >= FloatToInt(_end))
            break;
        var slot = IntToFloat(i);
        var slotUV = slot < 0.5 ? uv0 : (slot < 1.5 ? uv1 : uv2);
        outColor = VFXColor(outColor, slotUV, VFXSlotType(_value, slot), VFXSlotPara(_value, slot), slot, _time, _worldPos);
    }
    return outColor;
}
export function VFXDown2(_uv, _value, _time, _worldPos) {
    var tapSlot = 3.0;
    if (VFXIsTap(_value[0].x) > 0.5)
        tapSlot = 0.0;
    else if (VFXIsTap(_value[1].y) > 0.5)
        tapSlot = 1.0;
    else if (VFXIsTap(_value[2].z) > 0.5)
        tapSlot = 2.0;
    var uv = _uv;
    var uv1 = _uv;
    if (tapSlot < 1.5)
        uv = VFXUV(uv, _value[2].z, VFXSlotPara(_value, 2.0), _time);
    if (tapSlot < 0.5) {
        uv1 = uv;
        uv = VFXUV(uv, _value[1].y, VFXSlotPara(_value, 1.0), _time);
    }
    var tapType = 0.0;
    var para = new CVec4(0.0, 0.0, 0.0, 0.0);
    if (tapSlot < 2.5) {
        tapType = VFXSlotType(_value, tapSlot);
        para = VFXSlotPara(_value, tapSlot);
    }
    var texel = V2DivV2(new CVec2(1.0, 1.0), Sam2DSize(0.0));
    var tapCount = 1.0;
    var aberration = 0.0;
    var blurCol = 1.0;
    var blurStart = new CVec2(0.0, 0.0);
    if (abs(tapType - SDF.eVFX.Aberrate) < 0.5) {
        var line = max(0.0, sin(uv.y * 3.8 + _time * 1.4) * sin(uv.y * 0.6 + _time * 2.3));
        aberration = (0.1 + line) * para.y + para.x;
        tapCount = 3.0;
    }
    else if (abs(tapType - SDF.eVFX.Outline) < 0.5) {
        tapCount = 5.0;
    }
    else if (abs(tapType - SDF.eVFX.Blur) < 0.5) {
        blurCol = clamp(floor(para.x), 1.0, 4.0);
        tapCount = blurCol * clamp(floor(para.y), 1.0, 4.0);
        blurStart = new CVec2(max(-para.x * 0.5, -2.0), max(-para.y * 0.5, -2.0));
    }
    var acc = new CVec4(0.0, 0.0, 0.0, 0.0);
    var org = new CVec4(0.0, 0.0, 0.0, 0.0);
    var edge = 0.0;
    for (var i = 0; i < 16; ++i) {
        if (i >= FloatToInt(tapCount))
            break;
        var tap = IntToFloat(i);
        var off = new CVec2(0.0, 0.0);
        if (abs(tapType - SDF.eVFX.Aberrate) < 0.5) {
            off.x = (tap - 1.0) * aberration;
        }
        else if (abs(tapType - SDF.eVFX.Outline) < 0.5) {
            if (tap > 3.5)
                off.y = texel.y;
            else if (tap > 2.5)
                off.y = -texel.y;
            else if (tap > 1.5)
                off.x = texel.x;
            else if (tap > 0.5)
                off.x = -texel.x;
        }
        else if (abs(tapType - SDF.eVFX.Blur) < 0.5) {
            off = V2MulV2(new CVec2(blurStart.x + mod(tap, blurCol), blurStart.y + floor(tap / blurCol)), texel);
        }
        var tc = VFXChain(V2AddV2(uv, off), tapSlot, _value, _time, _worldPos);
        if (tap < 0.5)
            org = tc;
        if (abs(tapType - SDF.eVFX.Aberrate) < 0.5) {
            if (tap < 0.5)
                acc.r = tc.r;
            else if (tap < 1.5)
                acc.g = tc.g;
            else
                acc.b = tc.b;
            acc.a = max(acc.a, tc.a);
        }
        else {
            acc = V4AddV4(acc, tc);
            if (tap > 0.5 && tc.a > 0.0)
                edge = 1.0;
        }
        if (abs(tapType - SDF.eVFX.Outline) < 0.5 && org.a > 0.99)
            break;
    }
    var outColor = org;
    if (abs(tapType - SDF.eVFX.Aberrate) < 0.5) {
        outColor = SaturateV4(acc);
    }
    else if (abs(tapType - SDF.eVFX.Outline) < 0.5) {
        if (org.a <= 0.99 && edge > 0.5)
            outColor = new CVec4(para.x, para.y, para.z, 1.0);
    }
    else if (abs(tapType - SDF.eVFX.Blur) < 0.5) {
        outColor = SaturateV4(V4MulFloat(acc, 1.0 / tapCount));
    }
    for (var j = 0; j < 3; ++j) {
        var slot = IntToFloat(j);
        if (slot > tapSlot + 0.5)
            outColor = VFXColor(outColor, slot < 1.5 ? uv1 : _uv, VFXSlotType(_value, slot), VFXSlotPara(_value, slot), slot, _time, _worldPos);
    }
    return outColor;
}
export var BlendColor0 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor1 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor2 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor3 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor4 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor5 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor6 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor7 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor8 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor9 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor10 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor11 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor12 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor13 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor14 = new CVec4(0.0, 0.0, 0.0, 0.0);
export var BlendColor15 = new CVec4(0.0, 0.0, 0.0, 0.0);
function GetColorByIndex(_index, _tempMat0, _tempMat1, _tempMat2, _tempMat3) {
    if (_index < -0.5)
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    else if (_index < 4.0 - 0.5)
        return _tempMat0[FloatToInt(mod(_index, 4.0))];
    else if (_index < 8.0 - 0.5)
        return _tempMat1[FloatToInt(mod(_index, 4.0))];
    else if (_index < 12.0 - 0.5)
        return _tempMat2[FloatToInt(mod(_index, 4.0))];
    else if (_index < 16.0 - 0.5)
        return _tempMat3[FloatToInt(mod(_index, 4.0))];
    return new CVec4(0.0, 0.0, 0.0, 0.0);
}
function BlendFactorFun(_index, _uv, _obo, _tempMat0, _tempMat1, _tempMat2, _tempMat3) {
    var type = _obo[0] - 0.5;
    var orgIndex = _obo[1];
    var value0 = _obo[2];
    var value1 = _obo[3];
    var org = GetColorByIndex(orgIndex, _tempMat0, _tempMat1, _tempMat2, _tempMat3);
    var tar = GetColorByIndex(value0, _tempMat0, _tempMat1, _tempMat2, _tempMat3);
    if (type < SDF.eBlend.Null) {
        return GetColorByIndex(_index - 1.0, _tempMat0, _tempMat1, _tempMat2, _tempMat3);
    }
    else if (type < SDF.eBlend.LinearDodge) {
        return V4AddV4(org, V4MulFloat(tar, value1));
    }
    else if (type < SDF.eBlend.Multiply) {
        return V4Mix(org, V4MulV4(org, tar), value1);
    }
    else if (type < SDF.eBlend.LerpPer) {
        return V4Mix(org, tar, value1);
    }
    else if (type < SDF.eBlend.LerpAlpha) {
        return new CVec4(V3AddV3(V3MulFloat(org.rgb, 1.0 - org.a), V3MulFloat(tar.rgb, tar.a)), 1.0);
    }
    else if (type < SDF.eBlend.Darken) {
        var so = org.r + org.g + org.b;
        var st = tar.r + tar.g + tar.b;
        return so < st ? org : tar;
    }
    else if (type < SDF.eBlend.Lighten) {
        var so = org.r + org.g + org.b;
        var st = tar.r + tar.g + tar.b;
        return so >= st ? org : tar;
    }
    else if (type < SDF.eBlend.Org) {
        return org;
    }
    else if (type < SDF.eBlend.Tar) {
        return tar;
    }
    else if (type < SDF.eBlend.DarkCut) {
        var so = org.r + org.g + org.b;
        return so < 2.5 ? new CVec4(0.0, 0.0, 0.0, 0.0) : tar;
    }
    else if (type < SDF.eBlend.Texture) {
        return Sam2DToColor(orgIndex, _uv);
    }
    else if (type < SDF.eBlend.Tonemap) {
        return new CVec4(Tonemap(org.rgb, value0, value1), org.a);
    }
    else if (type < SDF.eBlend.GammaCorrect) {
        return new CVec4(V3Sqrt(org.rgb), org.a);
    }
    return org;
}
export function TexOffBlendFactorFun(_uv) {
    var tempColor0 = new CMat(0);
    var tempColor1 = new CMat(0);
    var tempColor2 = new CMat(0);
    var tempColor3 = new CMat(0);
    tempColor0[0] = BlendFactorFun(0.0, _uv, BlendColor0, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor0[1] = BlendFactorFun(1.0, _uv, BlendColor1, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor0[2] = BlendFactorFun(2.0, _uv, BlendColor2, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor0[3] = BlendFactorFun(3.0, _uv, BlendColor3, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor1[0] = BlendFactorFun(4.0, _uv, BlendColor4, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor1[1] = BlendFactorFun(5.0, _uv, BlendColor5, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor1[2] = BlendFactorFun(6.0, _uv, BlendColor6, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor1[3] = BlendFactorFun(7.0, _uv, BlendColor7, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor2[0] = BlendFactorFun(8.0, _uv, BlendColor8, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor2[1] = BlendFactorFun(9.0, _uv, BlendColor9, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor2[2] = BlendFactorFun(10.0, _uv, BlendColor10, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor2[3] = BlendFactorFun(11.0, _uv, BlendColor11, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor3[0] = BlendFactorFun(12.0, _uv, BlendColor12, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor3[1] = BlendFactorFun(13.0, _uv, BlendColor13, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor3[2] = BlendFactorFun(14.0, _uv, BlendColor14, tempColor0, tempColor1, tempColor2, tempColor3);
    tempColor3[3] = BlendFactorFun(15.0, _uv, BlendColor15, tempColor0, tempColor1, tempColor2, tempColor3);
    return tempColor3[3];
}
