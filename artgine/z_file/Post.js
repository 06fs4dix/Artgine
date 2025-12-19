import { ColorVFX } from "./ColorFun";
import { envCube, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "./Light";
import { SDF } from "./SDF";
import { Attribute, BranchBegin, BranchEnd, Build, CVec2, CVec3, CVec4, FloatToInt, IntToFloat, MappingTexToV3, Null, Sam2D0ToColor, Sam2DSize, Sam2DToColor, SaturateV3, SaturateV4, V2AddV2, V2DivV2, V2MulFloat, V2MulV2, V3AddV3, V3Dot, V3MulFloat, V4AddV4, V4DivV4, V4MulFloat, V4MulMatCoordi, V4MulV4, V4SubV4, clamp, discard, max, pow } from "./Shader";
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
var colorVFX = Null();
var to_uv = new CVec2(0.0, 0.0);
var to_worldPos = new CVec3(0.0, 0.0, 0.0);
var out_position = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_color = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_emissive = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_specular = new CVec4(0.0, 0.0, 0.0, 0.0);
var texCodi = new CVec4(0.0, 0.0, 0.0, 0.0);
var renderCount = Null();
var renderType = Null();
var viewMatInv3D = Null();
var camPos3D = Null();
var time = Attribute(0, "time");
var ambientColor = new CVec3(0.2, 0.2, 0.2);
var shadowOn = -1.0;
var renType = Null();
const TexMax = 12;
var blend = new Array(TexMax);
var opacity = new Array(TexMax);
var diffuse = 0.0;
var position = 1.0;
var normal = 2.0;
var specular = 3.0;
var shadow = 4.0;
var distortDistance = new CVec2(0.02, 0.05);
var abrBaseStr = 0.005;
var abrAddedStr = 0.02;
var pixelSize = new CVec2(15.0, 10.0);
var borderThickness = 0.3;
var borderIntensity = 0.3;
var noiseSpeed = 4.0;
var noiseIntensity = 0.25;
var scanLineDensity = 192.0;
var scanLineThickness = 0.3;
var scanLineIntensity = 0.5;
var span_max = 8.0;
var reduce_mul = 0.125;
var reduce_min = 0.0078125;
var subpix_shift = 0.25;
var gamma = 2.2;
var exposure = 1.0;
var contrast = 1.5;
var brightness = 1.2;
var colorCorrection = new CVec3(1.2, 1.1, 1.0);
var toneMappingFactor = 0.5;
var mipLevel = Null();
var threshold = Null();
var softThreshold = Null();
var mixFactor = Null();
var exposure = Null();
var blendFactor = Null();
Build("Artgine/Shader/PostBlend", ["blend"], vs_main, [
    worldMat, viewMat, projectMat, blend, opacity
], [out_position, to_uv], ps_main_blend, [out_color]);
Build("Artgine/Shader/PostBlur", ["blur"], vs_main, [
    worldMat, viewMat, projectMat, renderCount, renderType
], [out_position, to_uv], ps_main_blur, [out_color]);
Build("Artgine/Shader/PostFloodFill", ["floodFill"], vs_main, [
    worldMat, viewMat, projectMat,
], [out_position, to_uv], ps_main_floodFill, [out_color]);
Build("Artgine/Shader/PostLight", ["light"], vs_main, [
    worldMat, viewMat, projectMat,
    viewMatInv3D, camPos3D,
    ligDir, ligCol, ligCount,
    envCube, ambientColor,
    ligStep0, ligStep1, ligStep2, ligStep3,
    time, renType,
    diffuse, position, normal, specular, shadow
], [out_position, to_uv], ps_main_light, [out_color]);
Build("Artgine/Shader/PostLightMulti", ["lightMulti"], vs_main, [
    worldMat, viewMat, projectMat,
    viewMatInv3D, camPos3D,
    ligDir, ligCol, ligCount,
    envCube, ambientColor,
    ligStep0, ligStep1, ligStep2, ligStep3,
    time,
    diffuse, position, normal, specular, shadow
], [out_position, to_uv], ps_main_light_MultiTex, [out_color, out_specular, out_emissive]);
Build("Artgine/Shader/PostExpandBakedLight", ["bake"], vs_main, [
    worldMat, viewMat, projectMat,
], [out_position, to_uv], ps_main_ExpandBakedLight, [out_color]);
Build("Artgine/Shader/PostDownSample", ["sample", "down"], vs_main, [
    worldMat, viewMat, projectMat,
    mipLevel,
    threshold, softThreshold
], [out_position, to_uv], ps_main_DownSample, [out_color]);
Build("Artgine/Shader/PostUpSample", ["sample", "up"], vs_main, [
    worldMat, viewMat, projectMat,
    blendFactor
], [out_position, to_uv], ps_main_UpSample, [out_color]);
Build("Artgine/Shader/PostVFX", ["vfx"], vs_main, [
    worldMat, viewMat, projectMat,
    colorVFX, time
], [out_position, to_uv], ps_main_vfx, [out_color]);
function vs_main(f3_ver, f2_uv) {
    to_uv = f2_uv;
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 0.2), 0.0, 1.0);
}
function ps_main_blend() {
    var all = Sam2DToColor(0.0, to_uv);
    for (var i = 0; i < TexMax; i++) {
        if (blend[i] != 0.0) {
            var tCol = Sam2DToColor(IntToFloat(i + 1), to_uv);
            var op = opacity[i];
            if (SDF.eBlend.LinearDodge <= blend[i] + 0.5) {
                all = V4AddV4(all, V4MulFloat(tCol, op));
            }
            else if (SDF.eBlend.Multiply <= blend[i] + 0.5) {
                all = V4MulV4(all, V4AddV4(V4MulFloat(tCol, op), V4SubV4(new CVec4(1.0, 1.0, 1.0, 1.0), new CVec4(op, op, op, op))));
            }
            else if (SDF.eBlend.LerpPer <= blend[i] + 0.5) {
                var diff = V4SubV4(tCol, all);
                all = V4AddV4(all, V4MulFloat(diff, op));
            }
            else if (SDF.eBlend.LerpAlpha <= blend[i] + 0.5) {
                var invOrgA = 1.0 - all.a;
                var srcA = tCol.a;
                all = new CVec4(all.r * invOrgA + tCol.r * srcA, all.g * invOrgA + tCol.g * srcA, all.b * invOrgA + tCol.b * srcA, 1.0);
            }
            else if (SDF.eBlend.Darken <= blend[i] + 0.5) {
                var so = all.r + all.g + all.b;
                var st = tCol.r + tCol.g + tCol.b;
                all = so < st ? all : tCol;
            }
            else if (SDF.eBlend.Lighten <= blend[i] + 0.5) {
                var so = all.r + all.g + all.b;
                var st = tCol.r + tCol.g + tCol.b;
                all = so > st ? all : tCol;
            }
            else if (SDF.eBlend.Tar <= blend[i] + 0.5) {
                all = tCol;
            }
            else if (SDF.eBlend.DarkCut <= blend[i] + 0.5) {
                var so = all.r + all.g + all.b;
                all = so < 2.5 ? new CVec4(0.0, 0.0, 0.0, 0.0) : tCol;
            }
        }
        else {
            break;
        }
        all.rgb = SaturateV3(all.rgb);
        all.a = 1.0;
    }
    out_color = all;
}
function GetBlurColor(_uv, _f, _texScale) {
    var uv = V2AddV2(_uv, V2MulV2(_f, _texScale));
    return Sam2DToColor(0.0, uv);
}
function ps_main_blur() {
    var all = new CVec4(0.0, 0.0, 0.0, 0.0);
    var fx = -renderCount;
    var fy = -renderCount;
    var count = 0.0;
    if (renderCount > 32.0) {
        fx = -32.0;
        fy = -32.0;
    }
    var texScale = V2DivV2(new CVec2(1.0, 1.0), Sam2DSize(0.0));
    if (renderType < 0.1) {
        for (var y = 0; y < 64; y++) {
            for (var x = 0; x < 64; x++) {
                if (fx <= renderCount && fy <= renderCount) {
                    var color = GetBlurColor(to_uv, new CVec2(fx, fy), texScale);
                    if (color.a > 0.01) {
                        all = V4AddV4(all, color);
                        count += 1.0;
                    }
                }
                else
                    break;
                fx += 1.0;
            }
            fx = -renderCount;
            fy += 1.0;
        }
        if (count > 0.01) {
            all = V4DivV4(all, new CVec4(count, count, count, count));
            all = SaturateV4(all);
        }
    }
    else if (renderType < 1.1) {
        fy = 0.0;
        for (var x = 0; x <= 64; x++) {
            if (fx <= renderCount && fy <= renderCount) {
                var color = GetBlurColor(to_uv, new CVec2(fx, fy), texScale);
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
    else if (renderType < 2.1) {
        fx = 0.0;
        for (var y = 0; y < 64; y++) {
            if (fx <= renderCount && fy <= renderCount) {
                var color = GetBlurColor(to_uv, new CVec2(fx, fy), texScale);
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
    out_color = all;
}
function ps_main_floodFill() {
    var all = new CVec4(0.0, 0.0, 0.0, 0.0);
    var texScale = V2DivV2(new CVec2(1.0, 1.0), Sam2DSize(0.0));
    var count = 1.0;
    var x = -count;
    var foundShadow = 0.0;
    for (; x <= count + 0.5; x += 1.0) {
        var y = -count;
        for (; y <= count + 0.5; y += 1.0) {
            var uv = new CVec2(to_uv.x + x * texScale.x, to_uv.y + y * texScale.y);
            var color = Sam2DToColor(0.0, uv);
            if (color.r < 0.99) {
                foundShadow = color.r;
                break;
            }
        }
        if (foundShadow > 0.5)
            break;
    }
    if (foundShadow > 0.01) {
        all = new CVec4(foundShadow, foundShadow, foundShadow, 1.0);
    }
    else {
        all = new CVec4(1.0, 1.0, 1.0, 1.0);
    }
    out_color = all;
}
function ps_main_light() {
    var L_dif = Sam2DToColor(diffuse, to_uv);
    var L_pos = Sam2DToColor(position, to_uv);
    var L_nor = Sam2DToColor(normal, to_uv);
    var L_spc = Sam2DToColor(specular, to_uv).xyz;
    var shadow = -1.0;
    BranchBegin("shadow", "S", [shadowOn]);
    if (shadowOn > 0.5) {
        shadow = Sam2DToColor(shadowOn, to_uv).x;
    }
    BranchEnd();
    var L_cor = new CVec4(0.0, 0.0, 0.0, L_dif.a);
    var worldPos = V4MulMatCoordi(L_pos, viewMatInv3D);
    var Normal = MappingTexToV3(L_nor.rgb);
    var dseMat = LightCac3D(camPos3D, worldPos, L_dif, Normal, shadow, L_spc.y, L_spc.x, L_spc.z, ambientColor);
    if (renType < 0.5)
        L_cor.rgb = dseMat[0];
    else if (renType < 1.5) {
        L_cor.rgb = dseMat[1];
    }
    else
        L_cor.rgb = dseMat[2];
    out_color = L_cor;
}
function ps_main_light_MultiTex() {
    var L_dif = Sam2DToColor(diffuse, to_uv);
    var L_pos = Sam2DToColor(position, to_uv);
    var L_nor = Sam2DToColor(normal, to_uv);
    var L_spc = Sam2DToColor(specular, to_uv).xyz;
    var shadow = -1.0;
    BranchBegin("shadow", "S", [shadowOn]);
    if (shadowOn > 0.5) {
        shadow = Sam2DToColor(shadowOn, to_uv).x;
    }
    BranchEnd();
    var L_cor = new CVec4(0.0, 0.0, 0.0, L_dif.a);
    var worldPos = V4MulMatCoordi(L_pos, viewMatInv3D);
    var Normal = MappingTexToV3(L_nor.rgb);
    var SpecularStrength = L_spc.x;
    var Emissive = L_spc.y;
    var SpecularPower = L_spc.z;
    var dseMat = LightCac3D(camPos3D, worldPos, L_dif, Normal, shadow, SpecularStrength, Emissive, SpecularPower, ambientColor);
    out_color.rgb = dseMat[0];
    out_color.w = L_cor.w;
    out_specular.rgb = dseMat[1];
    out_specular.w = L_cor.w;
    out_emissive.rgb = dseMat[2];
    out_emissive.w = L_cor.w;
}
function ps_main_ExpandBakedLight() {
    var L_cor = Sam2DToColor(0.0, to_uv);
    if (L_cor.x >= 0.01 || L_cor.y >= 0.01 || L_cor.z >= 0.01 || L_cor.w >= 0.01) {
        out_color = L_cor;
        return;
    }
    var accurate_cor = new CVec4(0.0, 0.0, 0.0, 0.0);
    var texSize = Sam2DSize(0.0);
    var texScale = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
    var count = 0.0;
    var adj_pixel_num = 3.0;
    for (var x = -FloatToInt(adj_pixel_num); x < FloatToInt(adj_pixel_num) + 1; x++) {
        for (var y = -FloatToInt(adj_pixel_num); y < FloatToInt(adj_pixel_num) + 1; y++) {
            var adjacentUV = new CVec2(texScale.x * IntToFloat(x) + to_uv.x, texScale.y * IntToFloat(y) + to_uv.y);
            var adjacent_cor = Sam2DToColor(0.0, adjacentUV);
            if (adjacent_cor.x >= 0.01 || adjacent_cor.y >= 0.01 || adjacent_cor.z >= 0.01 || adjacent_cor.w >= 0.01) {
                count += 1.0;
                accurate_cor = V4AddV4(accurate_cor, adjacent_cor);
            }
        }
    }
    if (count < 0.5) {
        discard;
    }
    out_color = V4MulFloat(accurate_cor, 1.0 / count);
}
function TosRGB(_col) {
    return new CVec3(pow(_col.x, 1.0 / 2.2), pow(_col.y, 1.0 / 2.2), pow(_col.z, 1.0 / 2.2));
}
function tonemapping_luminance(_col) {
    return V3Dot(_col, new CVec3(0.2126, 0.7152, 0.0722));
}
function KarisAverage(_col) {
    var sRGB = TosRGB(_col);
    var luman = tonemapping_luminance(sRGB) / 4.0;
    return 1.0 / (1.0 + luman);
}
function PreFilter(_col) {
    var brightness = max(max(_col.x, _col.y), _col.z);
    var knee = threshold * softThreshold;
    var softness = brightness - (threshold - knee);
    softness = clamp(softness, 0.0, 2.0 * knee);
    softness = softness * softness * (4.0 * knee + 0.00001);
    var contribution = max(brightness - threshold, softness);
    contribution /= max(brightness, 0.00001);
    return V3MulFloat(_col, contribution);
}
function ps_main_DownSample() {
    var texSize = Sam2DSize(0.0);
    var x = 1.0 / texSize.x;
    var y = 1.0 / texSize.y;
    var uvx = to_uv.x;
    var uvy = to_uv.y;
    var a = Sam2D0ToColor(new CVec2(uvx - 2.0 * x, uvy + 2.0 * y)).rgb;
    var b = Sam2D0ToColor(new CVec2(uvx, uvy + 2.0 * y)).rgb;
    var c = Sam2D0ToColor(new CVec2(uvx + 2.0 * x, uvy + 2.0 * y)).rgb;
    var d = Sam2D0ToColor(new CVec2(uvx - 2.0 * x, uvy)).rgb;
    var e = Sam2D0ToColor(new CVec2(uvx, uvy)).rgb;
    var f = Sam2D0ToColor(new CVec2(uvx + 2.0 * x, uvy)).rgb;
    var g = Sam2D0ToColor(new CVec2(uvx - 2.0 * x, uvy - 2.0 * y)).rgb;
    var h = Sam2D0ToColor(new CVec2(uvx, uvy - 2.0 * y)).rgb;
    var i = Sam2D0ToColor(new CVec2(uvx + 2.0 * x, uvy - 2.0 * y)).rgb;
    var j = Sam2D0ToColor(new CVec2(uvx - 1.0 * x, uvy + 1.0 * y)).rgb;
    var k = Sam2D0ToColor(new CVec2(uvx + 1.0 * x, uvy + 1.0 * y)).rgb;
    var l = Sam2D0ToColor(new CVec2(uvx - 1.0 * x, uvy - 1.0 * y)).rgb;
    var m = Sam2D0ToColor(new CVec2(uvx + 1.0 * x, uvy - 1.0 * y)).rgb;
    if (mipLevel < 0.5) {
        var g0 = V3MulFloat(V3AddV3(V3AddV3(a, b), V3AddV3(d, e)), 0.125 / 4.0);
        var g1 = V3MulFloat(V3AddV3(V3AddV3(b, c), V3AddV3(e, f)), 0.125 / 4.0);
        var g2 = V3MulFloat(V3AddV3(V3AddV3(d, e), V3AddV3(g, h)), 0.125 / 4.0);
        var g3 = V3MulFloat(V3AddV3(V3AddV3(e, f), V3AddV3(h, i)), 0.125 / 4.0);
        var g4 = V3MulFloat(V3AddV3(V3AddV3(j, k), V3AddV3(l, m)), 0.5 / 4.0);
        g0 = V3MulFloat(g0, KarisAverage(g0));
        g1 = V3MulFloat(g1, KarisAverage(g1));
        g2 = V3MulFloat(g2, KarisAverage(g2));
        g3 = V3MulFloat(g3, KarisAverage(g3));
        g4 = V3MulFloat(g4, KarisAverage(g4));
        out_color.rgb = V3AddV3(V3AddV3(V3AddV3(g0, g1), V3AddV3(g2, g3)), g4);
        out_color.rgb = PreFilter(out_color.rgb);
    }
    else {
        out_color.rgb = V3MulFloat(e, 0.125);
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(a, c), V3AddV3(g, i)), 0.03125));
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(b, d), V3AddV3(f, h)), 0.0625));
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(j, k), V3AddV3(l, m)), 0.125));
    }
    out_color.w = 1.0;
}
function ps_main_UpSample() {
    var texSize = Sam2DSize(0.0);
    var x = 1.0 / texSize.x;
    var y = 1.0 / texSize.y;
    var uvx = to_uv.x;
    var uvy = to_uv.y;
    var a = Sam2D0ToColor(new CVec2(uvx - x, uvy + y)).rgb;
    var b = Sam2D0ToColor(new CVec2(uvx, uvy + y)).rgb;
    var c = Sam2D0ToColor(new CVec2(uvx + x, uvy + y)).rgb;
    var d = Sam2D0ToColor(new CVec2(uvx - x, uvy)).rgb;
    var e = Sam2D0ToColor(new CVec2(uvx, uvy)).rgb;
    var f = Sam2D0ToColor(new CVec2(uvx + x, uvy)).rgb;
    var g = Sam2D0ToColor(new CVec2(uvx - x, uvy - y)).rgb;
    var h = Sam2D0ToColor(new CVec2(uvx, uvy - y)).rgb;
    var i = Sam2D0ToColor(new CVec2(uvx + x, uvy - y)).rgb;
    var col = V3MulFloat(e, 0.25);
    col = V3AddV3(col, V3MulFloat(V3AddV3(V3AddV3(b, d), V3AddV3(f, h)), 0.125));
    col = V3AddV3(col, V3MulFloat(V3AddV3(V3AddV3(a, c), V3AddV3(g, i)), 0.0625));
    col = V3MulFloat(col, blendFactor);
    out_color.rgb = col;
    out_color.w = blendFactor;
}
function ps_main_vfx() {
    var src = Sam2DToColor(0.0, to_uv);
    out_color = ColorVFX(src, to_uv, to_uv, colorVFX, time);
}
