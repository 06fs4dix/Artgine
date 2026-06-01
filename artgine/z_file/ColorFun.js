import { NoiseGet, NoiseValue3, SampleNoise, SampleNoiseVec2 } from "./Noise";
import { SDF } from "./SDF";
import { abs, clamp, max, min, mod, pow, sign, sin, CMat, CVec2, CVec3, CVec4, Sam2DSize, Sam2DToColor, SaturateV4, V2Abs, V2AddV2, V2DivV2, V2Floor, V2MulFloat, V2MulV2, V2SubV2, V3AddV3, V3Clamp, V3Floor, V3MulFloat, V3MulV3, V3SubV3, V4AddV4, V4MulFloat, V4MulV4, V4SubV4, step, V3Abs, V3Fract, V4Mix, V3Mix, SaturateV3, floor, screenPos, V4DivV4, FloatToInt, Null, Sam2DToV4, sqrt, V2Dot, V2Mod, V4MulMatCoordi, V3Nor, V3Cross, cos, Sam2DArrV4, Sam2DArrToV4, fract } from "./Shader";
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
function VFXDown0(_uv, _value, _time, _worldPos) {
    var para = new CVec4(_value[0].y, _value[0].z, _value[0].w, _value[1].x);
    var type = _value[0].x;
    var outColor = Sam2DToColor(0.0, _uv);
    if (type < SDF.eVFX.Distort + 0.5) {
        var distortedUV = GetDistortedUV(_uv, new CVec2(para.x, para.y), _time);
        outColor = Sam2DToColor(0.0, distortedUV);
    }
    else if (type < SDF.eVFX.Aberrate + 0.5) {
        var line = max(0.0, sin(_uv.y * 3.8 + _time * 1.4) * sin(_uv.y * 0.6 + _time * 2.3));
        var aberration_strength = (0.1 + line) * para.y + para.x;
        var r = Sam2DToColor(0.0, new CVec2(_uv.x - aberration_strength, _uv.y));
        var g = Sam2DToColor(0.0, _uv);
        var b = Sam2DToColor(0.0, new CVec2(_uv.x + aberration_strength, _uv.y));
        outColor = SaturateV4(new CVec4(r.r, g.g, b.b, max(r.a, max(g.a, b.a))));
    }
    else if (type < SDF.eVFX.Outline + 0.5) {
        var org = Sam2DToColor(0.0, _uv);
        if (org.a <= 0.99) {
            var size = Sam2DSize(0.0);
            size.x = 1.0 / size.x;
            size.y = 1.0 / size.y;
            var lc = Sam2DToColor(0.0, new CVec2(_uv.x - size.x, _uv.y));
            var rc = Sam2DToColor(0.0, new CVec2(_uv.x + size.x, _uv.y));
            var tc = Sam2DToColor(0.0, new CVec2(_uv.x, _uv.y - size.y));
            var bc = Sam2DToColor(0.0, new CVec2(_uv.x, _uv.y + size.y));
            if (lc.a > 0.0 || rc.a > 0.0 || tc.a > 0.0 || bc.a > 0.0) {
                outColor = new CVec4(para.xyz, 1.0);
            }
            else
                outColor = org;
        }
        else
            outColor = org;
    }
    else if (type < SDF.eVFX.Pixel + 0.5) {
        var pixelatedUV = GetPixelatedUV(Sam2DSize(0.0), new CVec2(para.x, para.y), _uv);
        outColor = Sam2DToColor(0.0, pixelatedUV);
    }
    else if (type < SDF.eVFX.Noise + 0.5) {
        var noiseColor = new CVec3(0.0, 0.0, 0.0);
        var frame = _time * para.y / 60.0;
        if (para.x > SDF.eNoise.Gaussian - 0.5) {
            var xi = _uv.x * para.w * 128.0;
            var yi = _uv.y * para.w * 128.0;
            var zi = frame * 128.0;
            noiseColor.x = NoiseValue3(new CVec3(xi, yi, zi));
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        else if (para.x > SDF.eNoise.Blue - 0.5) {
            var coord = V2Floor(V2Mod(V2MulFloat(V2AddV2(_uv, new CVec2(frame, frame)), para.w * 64.0), 64.0));
            var index = coord.y * 64.0 + coord.x;
            var modIndex = mod(index, 2048.0);
            var v4 = Sam2DToV4(new CVec2(11, SDF.eNoise.Blue), modIndex);
            noiseColor.x = index < 2048.0 ? v4.x : v4.y;
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        else if (para.x > SDF.eNoise.PerlinFBM3 - 0.5) {
            noiseColor.x = SampleNoise(new CVec3(V2MulFloat(_uv, para.w), frame), SDF.eNoise.PerlinFBM3);
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        else if (para.x > SDF.eNoise.PerlinNormal - 0.5) {
            var noise = SampleNoiseVec2(new CVec3(V2MulFloat(_uv, para.w), frame), SDF.eNoise.PerlinNormal);
            noiseColor.xyz = new CVec3(noise.x, sqrt(1.0 - V2Dot(noise, noise)), noise.y);
        }
        else {
            noiseColor.x = SampleNoise(new CVec3(V2MulFloat(_uv, para.w), frame), SDF.eNoise.Perlin);
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        outColor.rgb = V3MulV3(outColor.rgb, V3Mix(noiseColor, new CVec3(1, 1, 1), 1.0 - para.z));
    }
    else if (type < SDF.eVFX.Scanline + 0.5) {
        outColor = AddScanLine(outColor, _uv, _time, para.x, para.y);
    }
    else if (type < SDF.eVFX.LookUpTable + 0.5) {
        var palSize = new CVec2(32.0, 32.0);
        var cellSize = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
        var ditherStrength = (NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Blue) - 0.5) / (cellSize - 1.0) * para.y;
        outColor.rgb = V3AddV3(outColor.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
        var palIndex = MapToPaletteIndex(outColor.rgb, cellSize, palSize);
        outColor = Sam2DArrToV4(new CVec3(1.0, para.x, 0.0), palIndex);
    }
    else if (type < SDF.eVFX.Blur + 0.5) {
        outColor = new CVec4(0.0, 0.0, 0.0, 0.0);
        var fx = max(-para.x * 0.5, -2.0);
        var fy = max(-para.y * 0.5, -2.0);
        var count = 0.0;
        var loopX;
        var loopY;
        loopX.dummy = FloatToInt(para.x);
        loopY.dummy = FloatToInt(para.y);
        var texScale = V2DivV2(new CVec2(1.0, 1.0), Sam2DSize(0.0));
        for (var y = 0; y < 4; y++) {
            if (y < loopY.dummy) {
                for (var x = 0; x < 4; x++) {
                    if (x < loopX.dummy) {
                        var uv = V2AddV2(_uv, V2MulV2(new CVec2(fx, fy), texScale));
                        var bout = Sam2DToColor(0.0, uv);
                        outColor = V4AddV4(outColor, bout);
                        count += 1.0;
                    }
                    else
                        break;
                    fx += 1.0;
                }
                fx = -_value[2].x * 0.5;
                fy += 1.0;
            }
            else
                break;
        }
        if (count > 0.01) {
            outColor = V4DivV4(outColor, new CVec4(count, count, count, count));
            outColor = SaturateV4(outColor);
        }
    }
    else if (type < SDF.eVFX.Decal + 0.5 || type < SDF.eVFX.DecalTexture + 0.5) {
        var decalDir = new CVec3(vfxMat0[0][0], vfxMat0[0][1], vfxMat0[0][2]);
        var decalRot = vfxMat0[0][3];
        var decalSca = new CVec3(vfxMat0[1][0], vfxMat0[1][1], vfxMat0[1][2]);
        var decalPos = new CVec3(vfxMat0[1][3], vfxMat0[2][0], vfxMat0[2][1]);
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
            if (type < SDF.eVFX.Decal + 0.5) {
                var decalColor = para;
                outColor = new CVec4(V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a), outColor.a);
            }
            else if (type < SDF.eVFX.DecalTexture + 0.5) {
                var decalColor = Sam2DToColor(para.x, new CVec2(decalUV.x * -1.0 + 0.5, decalUV.y * 1.0 + 0.5));
                decalColor.a *= para.y;
                outColor = new CVec4(V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a), outColor.a);
                if (para.z > 0.5 && decalColor.a > 0.001) {
                    outColor.r = 1.0 - outColor.r;
                    outColor.g = 1.0 - outColor.g;
                    outColor.b = 1.0 - outColor.b;
                }
            }
        }
    }
    return outColor;
}
export function VFXDown1(_uv, _value, _time, _worldPos) {
    var para = new CVec4(_value[1].z, _value[1].w, _value[2].x, _value[2].y);
    var type = _value[1].y;
    var outColor = VFXDown0(_uv, _value, _time, _worldPos);
    if (type < SDF.eVFX.Distort + 0.5) {
        var distortedUV = GetDistortedUV(_uv, new CVec2(para.x, para.y), _time);
        outColor = VFXDown0(distortedUV, _value, _time, _worldPos);
    }
    else if (type < SDF.eVFX.Pixel + 0.5) {
        var pixelatedUV = GetPixelatedUV(Sam2DSize(0.0), new CVec2(para.x, para.y), _uv);
        outColor = VFXDown0(pixelatedUV, _value, _time, _worldPos);
    }
    else if (type < SDF.eVFX.Scanline + 0.5) {
        outColor = AddScanLine(outColor, _uv, _time, para.x, para.y);
    }
    else if (type < SDF.eVFX.LookUpTable + 0.5) {
        var palSize = new CVec2(32.0, 32.0);
        var cellSize = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
        var ditherStrength = (NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Blue) - 0.5) / (cellSize - 1.0) * para.y;
        outColor.rgb = V3AddV3(outColor.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
        var palIndex = MapToPaletteIndex(outColor.rgb, cellSize, palSize);
        outColor = Sam2DToV4(new CVec2(11, para.x), palIndex);
    }
    else if (type < SDF.eVFX.Decal + 0.5 || type < SDF.eVFX.DecalTexture + 0.5) {
        var decalDir = new CVec3(vfxMat0[2][2], vfxMat0[2][3], vfxMat0[3][0]);
        var decalRot = vfxMat0[3][1];
        var decalSca = new CVec3(vfxMat0[3][2], vfxMat0[3][3], vfxMat1[0][0]);
        var decalPos = new CVec3(vfxMat1[0][1], vfxMat1[0][2], vfxMat1[0][3]);
        var zAxis = V3Nor(decalDir);
        var up = abs(zAxis.y) > 1.0 - 1e-8 ? new CVec3(0.0, 0.0, -1.0) : new CVec3(0.0, 1.0, 0.0);
        var xAxis = V3Cross(up, zAxis);
        var yAxis = V3Cross(zAxis, xAxis);
        var rx = xAxis;
        var ry = yAxis;
        if (decalRot > 1e-8) {
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
            if (type < SDF.eVFX.Decal + 0.5) {
                var decalColor = para;
                outColor = new CVec4(V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a), outColor.a);
            }
            else if (type < SDF.eVFX.DecalTexture + 0.5) {
                var decalColor = Sam2DToColor(para.x, new CVec2(decalUV.x * -1.0 + 0.5, decalUV.y * 1.0 + 0.5));
                decalColor.a *= para.y;
                outColor = new CVec4(V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a), outColor.a);
                if (para.z > 0.5 && decalColor.a > 0.001) {
                    outColor.r = 1.0 - outColor.r;
                    outColor.g = 1.0 - outColor.g;
                    outColor.b = 1.0 - outColor.b;
                }
            }
        }
    }
    return outColor;
}
export function VFXDown2(_uv, _value, _time, _worldPos) {
    var para = new CVec4(_value[2].w, _value[3].x, _value[3].y, _value[3].z);
    var type = _value[2].z;
    var outColor = VFXDown1(_uv, _value, _time, _worldPos);
    if (type < SDF.eVFX.Distort + 0.5) {
        var distortedUV = GetDistortedUV(_uv, new CVec2(para.x, para.y), _time);
        outColor = VFXDown1(distortedUV, _value, _time, _worldPos);
    }
    else if (type < SDF.eVFX.Pixel + 0.5) {
        var pixelatedUV = GetPixelatedUV(Sam2DSize(0.0), new CVec2(para.x, para.y), _uv);
        outColor = VFXDown1(pixelatedUV, _value, _time, _worldPos);
    }
    else if (type < SDF.eVFX.Scanline + 0.5) {
        outColor = AddScanLine(outColor, _uv, _time, para.x, para.y);
    }
    else if (type < SDF.eVFX.LookUpTable + 0.5) {
        var palSize = new CVec2(32.0, 32.0);
        var cellSize = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
        var ditherStrength = (NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Blue) - 0.5) / (cellSize - 1.0) * para.y;
        outColor.rgb = V3AddV3(outColor.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
        var palIndex = MapToPaletteIndex(outColor.rgb, cellSize, palSize);
        outColor = Sam2DToV4(new CVec2(11, para.x), palIndex);
    }
    else if (type < SDF.eVFX.Decal + 0.5 || type < SDF.eVFX.DecalTexture + 0.5) {
        var decalDir = new CVec3(vfxMat1[1][0], vfxMat1[1][1], vfxMat1[1][2]);
        var decalRot = vfxMat1[1][3];
        var decalSca = new CVec3(vfxMat1[2][0], vfxMat1[2][1], vfxMat1[2][2]);
        var decalPos = new CVec3(vfxMat1[2][3], vfxMat1[3][0], vfxMat1[3][1]);
        var zAxis = V3Nor(decalDir);
        var up = abs(zAxis.y) > 1.0 - 1e-8 ? new CVec3(0.0, 0.0, -1.0) : new CVec3(0.0, 1.0, 0.0);
        var xAxis = V3Cross(up, zAxis);
        var yAxis = V3Cross(zAxis, xAxis);
        var rx = xAxis;
        var ry = yAxis;
        if (decalRot > 1e-8) {
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
            if (type < SDF.eVFX.Decal + 0.5) {
                var decalColor = para;
                outColor = new CVec4(V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a), outColor.a);
            }
            else if (type < SDF.eVFX.DecalTexture + 0.5) {
                var decalColor = Sam2DToColor(para.x, new CVec2(decalUV.x * -1.0 + 0.5, decalUV.y * 1.0 + 0.5));
                decalColor.a *= para.y;
                outColor = new CVec4(V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a), outColor.a);
                if (para.z > 0.5 && decalColor.a > 0.001) {
                    outColor.r = 1.0 - outColor.r;
                    outColor.g = 1.0 - outColor.g;
                    outColor.b = 1.0 - outColor.b;
                }
            }
        }
    }
    return outColor;
}
export var TexOffBlendFactor = Null();
export function TexOffBlendFactorFun(_color, _uv, _obo) {
    for (var i = 0; i < 4; i++) {
        var tCol = Sam2DToColor(_obo[i].x, _uv);
        var op = _obo[i].z;
        if (SDF.eBlend.Null > _obo[i].y - 0.5) {
            _color = _color;
        }
        else if (SDF.eBlend.LinearDodge > _obo[i].y - 0.5) {
            _color = V4AddV4(_color, V4MulFloat(tCol, op));
        }
        else if (SDF.eBlend.Multiply > _obo[i].y - 0.5) {
            _color = V4MulV4(_color, V4AddV4(V4MulFloat(tCol, op), V4SubV4(new CVec4(1.0, 1.0, 1.0, 1.0), new CVec4(op, op, op, op))));
        }
        else if (SDF.eBlend.LerpPer > _obo[i].y - 0.5) {
            var diff = V4SubV4(tCol, _color);
            _color = V4AddV4(_color, V4MulFloat(diff, op));
        }
        else if (SDF.eBlend.LerpAlpha > _obo[i].y - 0.5) {
            var invOrgA = 1.0 - _color.a;
            var srcA = tCol.a;
            _color = new CVec4(_color.r * invOrgA + tCol.r * srcA, _color.g * invOrgA + tCol.g * srcA, _color.b * invOrgA + tCol.b * srcA, 1.0);
        }
        else if (SDF.eBlend.Darken > _obo[i].y - 0.5) {
            var so = _color.r + _color.g + _color.b;
            var st = tCol.r + tCol.g + tCol.b;
            _color = so < st ? _color : tCol;
        }
        else if (SDF.eBlend.Lighten > _obo[i].y - 0.5) {
            var so = _color.r + _color.g + _color.b;
            var st = tCol.r + tCol.g + tCol.b;
            _color = so > st ? _color : tCol;
        }
        else if (SDF.eBlend.Tar > _obo[i].y - 0.5) {
            _color = tCol;
        }
        else if (SDF.eBlend.DarkCut > _obo[i].y - 0.5) {
            var so = _color.r + _color.g + _color.b;
            _color = so < 2.5 ? new CVec4(0.0, 0.0, 0.0, 0.0) : tCol;
        }
    }
    return _color;
}
