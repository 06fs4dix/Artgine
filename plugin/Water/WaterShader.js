import { ColorModalFun, GetTexCodiedUV } from "../../artgine/z_file/ColorFun";
import { ambientColor, envmapOn, GetMaterial, ligCol, ligCount, ligDir, LightCac3D, ligMask, ligStep0, ligStep1, ligStep2, ligStep3, cullMask, sam2DCount, samCubeCount } from "../../artgine/z_file/Light";
import { NoiseGet, NoiseNormalGet } from "../../artgine/z_file/Noise";
import { SDF } from "../../artgine/z_file/SDF";
import { Attribute, BranchBegin, BranchDefault, BranchEnd, Build, clamp, CVec2, CVec3, CVec4, dFdy, MatTypeToMat, max, min, Null, pow, reflect, Sam2DToColor, SamCubeToColor, SaturateFloat, smoothstep, V2AddV2, V2Len, V2MulFloat, V3AddV3, V3Dot, V3Len, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3Pow, V3SubV3, V4MulFloat, V4MulMatCoordi } from "../../artgine/z_file/Shader";
import { shadowOn } from "../../artgine/z_file/Shadow";
var out_position = Null();
var out_color = Null();
var to_uv = Null();
var to_worldPos = Null();
var to_projPos = Null();
var to_ref = Null();
var worldMat = Null();
var worldMatShort = Null();
var worldMatType = 16.0;
var viewMat = Null();
var projectMat = Null();
var waterViewMat = Null();
var waterProjectMat = Null();
var material = new CVec4(0.0, 0.0, 0.0, 1.0);
var colorModel = Null();
var alphaModel = Null();
var texCodi = Null();
var skin = Null();
var camPos = Null();
var time = Attribute(0, "time");
var reflectMap = 1.0;
var refractMap = 2.0;
var normal1Map = 3.0;
var normal2Map = 4.0;
var normalflowDir = new CVec2(0.0, 0.0);
var normalRange = 1.0;
var texflowDir = new CVec2(1.0, 0.0);
var shallowColor = new CVec3(0.0, 0.0, 0.0);
var deepColor = new CVec3(0.0, 0.1, 0.5);
var waterDeep = new CVec4(0.0, 256.0, 5.0, 0.0);
var waterUnderFadeDist = new CVec2(2000.0, 3000.0);
var waterHeight = 1.0;
var waterTop = -1.0;
Build("Water3D", ["water", "3D"], vs_main_water, [
    worldMat,
    viewMat, projectMat, skin, sam2DCount,
    camPos, time,
    normalRange,
    normalflowDir, texflowDir,
    shallowColor, deepColor, waterDeep, waterHeight,
    waterUnderFadeDist
], [out_position, to_uv, to_worldPos, to_projPos, to_ref], ps_main_water, [out_color]);
Build("Water2D", ["water", "2D"], vs_main, [
    worldMat, viewMat, projectMat, waterTop, time,
    waterViewMat, waterProjectMat
], [out_position, to_uv, to_projPos], ps_main, [out_color]);
function ProjToScreenPos(_pos) {
    var sPos = V4MulFloat(_pos, 0.5);
    sPos.xy = V2AddV2(sPos.xy, new CVec2(sPos.w, sPos.w));
    sPos.z = _pos.z;
    sPos.w = _pos.w;
    return sPos;
}
function vs_main_water(f3_ver, f2_uv, f3_ref) {
    BranchBegin("codi", "C", [texCodi]);
    to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);
    BranchDefault();
    to_uv.xy = f2_uv;
    BranchEnd();
    to_ref = f3_ref;
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, wMat);
    to_worldPos = P;
    P = V4MulMatCoordi(P, viewMat);
    P = V4MulMatCoordi(P, projectMat);
    out_position = P;
    to_projPos = ProjToScreenPos(out_position);
}
function Remap(_val, _min1, _max1, _min2, _max2) {
    return _min2 + (_val - _min1) / (_max1 - _min1) * (_max2 - _min2);
}
function NormalFlow(_uv, _timedWindDir) {
    var waveIntensity = new CVec4(3.0, 2.0, 1.5, 1.0);
    var animSpeed = 0.5;
    var texCoordA = new CVec3(_uv.x * 1.6 + _timedWindDir.x * 0.16, _uv.y * 1.6 + _timedWindDir.y * 0.16, time * animSpeed * 1.0);
    var texCoordB = new CVec3(_uv.x * 0.8 + _timedWindDir.x * 0.04, _uv.y * 0.8 + _timedWindDir.y * 0.04, time * animSpeed * 0.8);
    var texCoordC = new CVec3(_uv.x * 0.5 + _timedWindDir.x * 0.01, _uv.y * 0.5 + _timedWindDir.y * 0.01, time * animSpeed * 0.5);
    var normal = new CVec3(0.0, 1.0, 0.0);
    var tempNormal;
    tempNormal = NoiseNormalGet(texCoordA, SDF.eNoise.PerlinNormal);
    tempNormal = new CVec3(tempNormal.x * waterHeight / 10.0, tempNormal.y, tempNormal.z * waterHeight / 10.0);
    normal = V3AddV3(normal, V3MulFloat(tempNormal, waveIntensity.x));
    tempNormal = NoiseNormalGet(texCoordB, SDF.eNoise.PerlinNormal);
    tempNormal = new CVec3(tempNormal.x * waterHeight / 10.0, tempNormal.y, tempNormal.z * waterHeight / 10.0);
    normal = V3AddV3(normal, V3MulFloat(tempNormal, waveIntensity.y));
    tempNormal = NoiseNormalGet(texCoordC, SDF.eNoise.PerlinNormal);
    tempNormal = new CVec3(tempNormal.x * waterHeight / 10.0, tempNormal.y, tempNormal.z * waterHeight / 10.0);
    normal = V3AddV3(normal, V3MulFloat(tempNormal, waveIntensity.z));
    normal = V3Nor(new CVec3(normal.x * normalRange, max(normal.y, 0.1), normal.z * normalRange));
    return normal;
}
function ps_main_water() {
    var to_screenUV = V3MulFloat(to_projPos.xyz, 1.0 / to_projPos.w);
    var world = V3MulFloat(to_worldPos.xyz, 1.0 / to_worldPos.w);
    var view = V3Nor(V3SubV3(camPos, world));
    var normalTS = new CVec3(0.0, 1.0, 0.0);
    var normalDist = new CVec3(0.0, 0.0, 0.0);
    if (V2Len(normalflowDir) > 0.0) {
        normalTS = NormalFlow(to_uv, V2MulFloat(new CVec2(-normalflowDir.x, normalflowDir.y), time));
        var dist = V3Len(V3SubV3(camPos, world));
        var deltaDist = max(0.0, dist - 6000.0);
        var fallOff = 1.0 / (1.0 + deltaDist * 10.0 / 6000.0);
        normalDist = V3MulFloat(normalTS, 0.1 * V2Len(normalflowDir) * fallOff);
    }
    var normalWS = normalTS;
    var screenUV = V2AddV2(to_screenUV.xy, new CVec2(normalDist.x, normalDist.z));
    var uv = V2AddV2(to_uv, new CVec2(normalDist.x, normalDist.z));
    var uvw;
    var refractColor;
    var refractType = -1.0;
    BranchBegin("UseWaterTex", "UseWaterTex", []);
    uv = V2AddV2(uv, V2MulFloat(new CVec2(-texflowDir.x, texflowDir.y), time * 0.03));
    refractColor = Sam2DToColor(0.0, uv);
    refractType = 0.0;
    BranchEnd();
    BranchBegin("UseRefractTex", "UseRefractTex", [refractMap]);
    refractColor = Sam2DToColor(refractMap, screenUV);
    if (refractColor.w < 0.75) {
        refractColor = new CVec4(shallowColor, 1.0);
        refractColor.rgb = V3Mix(deepColor, refractColor.rgb, 1.0 - SaturateFloat(Remap(V3Len(V3SubV3(camPos, world)), waterUnderFadeDist.x, waterUnderFadeDist.y, 0.0, 0.8)));
    }
    refractType = 1.0;
    BranchEnd();
    if (refractType < -0.5) {
        refractColor = new CVec4(shallowColor, 1.0);
        var distanceBlend = 1.0 - SaturateFloat(Remap(V3Len(V3SubV3(camPos, world)), waterUnderFadeDist.x, waterUnderFadeDist.y, 0.0, 0.8));
        refractColor.rgb = V3Mix(deepColor, refractColor.rgb, distanceBlend);
        refractType = 2.0;
    }
    var reflectColor;
    var reflectType = -1.0;
    BranchBegin("UseCubeTex", "UseCubeTex", [reflectMap]);
    uvw = reflect(V3MulFloat(view, -1.0), new CVec3(0.0, 1.0, 0.0));
    uvw = V3AddV3(uvw, new CVec3(normalDist.x, normalDist.y * 0.2, normalDist.z));
    reflectColor = SamCubeToColor(reflectMap, uvw);
    reflectColor.rgb = V3Pow(reflectColor.rgb, 1.0 / 2.2);
    reflectType = 0.0;
    BranchEnd();
    BranchBegin("UseWaterReflect", "UseWaterReflect", [reflectMap]);
    reflectColor = Sam2DToColor(reflectMap, new CVec2(1.0 - screenUV.x, screenUV.y));
    reflectColor.rgb = V3MulV3(reflectColor.rgb, new CVec3(0.9, 0.95, 1.0));
    reflectType = 1.0;
    BranchEnd();
    if (reflectType < -0.5) {
        reflectType = 2.0;
    }
    var shadow = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow", "S", [shadowOn]);
    if (shadowOn > 0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, screenUV);
    }
    BranchEnd();
    var L_cor;
    var dotRes = clamp(V3Dot(view, normalWS), 0.0, 1.0);
    var fresnel = 0.02 + 0.98 * pow(1.0 - clamp(dotRes, 0.0, 1.0), 5.0);
    var facingWeight = smoothstep(0.0, 0.15, dotRes);
    fresnel *= facingWeight;
    if (reflectType > 1.5) {
        L_cor = new CVec4(refractColor.rgb, 1.0);
    }
    else {
        L_cor = new CVec4(V3Mix(refractColor.rgb, reflectColor.rgb, fresnel), 1.0);
    }
    var dseMat;
    var lmaterial = new CVec4(1.0, 1.0, 1.0, 1.0);
    BranchBegin("light", "L", [ligDir, ligCol, ligMask, ligCount, camPos, material, cullMask, ligStep0, ligStep1, ligStep2, ligStep3, ambientColor, envmapOn, sam2DCount, samCubeCount]);
    lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    dseMat = LightCac3D(camPos, to_worldPos, reflectColor, normalWS, shadow, lmaterial.y, lmaterial.x, lmaterial.z, cullMask.x);
    L_cor.rgb = V3AddV3(L_cor.rgb, dseMat[1]);
    if (shadow.a > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.a);
    }
    BranchEnd();
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    out_color = L_cor;
}
function vs_main(f3_ver, f2_uv) {
    to_uv.xy = f2_uv;
    var P = new CVec4(f3_ver, 1.0);
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    P = V4MulMatCoordi(P, wMat);
    P = V4MulMatCoordi(P, viewMat);
    out_position = V4MulMatCoordi(P, projectMat);
    to_projPos = ProjToScreenPos(out_position);
    P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, wMat);
    P = V4MulMatCoordi(P, waterViewMat);
    P = V4MulMatCoordi(P, waterProjectMat);
    to_projPos = ProjToScreenPos(P);
}
function ps_main() {
    var uv = new CVec2(to_projPos.x / to_projPos.w, to_projPos.y / to_projPos.w);
    var scaleY = dFdy(uv.y) / dFdy(to_uv.y);
    var y0 = uv.y - to_uv.y * scaleY;
    var y1 = y0 + scaleY;
    var waterTopY;
    if (waterTop < 0.0)
        waterTopY = max(y0, y1);
    else
        waterTopY = min(y0, y1);
    var srcUV = new CVec2(uv.x, 2.0 * waterTopY - uv.y);
    var vFromTop;
    if (waterTop < 0.0)
        vFromTop = 1.0 - to_uv.y;
    else
        vFromTop = to_uv.y;
    var startV = 0.05;
    var fade = vFromTop / max(startV, 1e-6);
    fade = min(max(fade, 0.0), 1.0);
    fade = fade * fade * (3.0 - 2.0 * fade);
    var noise = NoiseGet(new CVec3(to_uv.x, to_uv.y + time * 0.1, time), SDF.eNoise.PerlinFBM);
    noise = noise * 2.0 - 1.0;
    srcUV.x += noise * (0.005 * fade);
    var L_cor = Sam2DToColor(0.0, srcUV);
    out_color = L_cor;
}
