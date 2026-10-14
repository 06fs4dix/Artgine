import { AlphaModalFun, ColorModalFun, GetTexCodiedUV } from "../../artgine/z_file/ColorFun";
import { ambientColor, envCount, GetMaterial, GetSunInfo, ligCol, ligCount, ligDir, LightCac3D, ligMask, ligStep0, ligStep1, ligStep2, ligStep3, cullMask, sam2DCount, samCubeCount, envPos } from "../../artgine/z_file/Light";
import { NoiseGet, NoiseNormalGet } from "../../artgine/z_file/Noise";
import { SDF } from "../../artgine/z_file/SDF";
import { Attribute, BranchBegin, BranchDefault, BranchEnd, Build, clamp, CVec2, CVec3, CVec4, MatTypeToMat, max, Null, pow, reflect, abs, floor, fract, step, Sam2DArrToV4, Sam2DArrV4, Sam2DToColor, SamCubeToColor, SaturateFloat, smoothstep, V2AddV2, V2Len, V2MulFloat, V3AddV3, V3Dot, V3Len, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3Pow, V3SubV3, V3Sqrt, SaturateV3, V4MulFloat, V4MulMatCoordi } from "../../artgine/z_file/Shader";
import { shadowOn } from "../../artgine/z_file/Shadow";
var out_position = Null();
var out_color = Null();
var to_uv = Null();
var to_edge = Null();
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
var waterTint = 0.35;
var wobble = 0.005;
var reflectRange = new CVec2(0.25, 0.85);
var reflectivity = 1.0;
var reflectScale = 1.0;
var anchorY = 0.0;
var reflectAnchor = 1.0;
var trailPos = new Sam2DArrV4(1);
var lastHide = Null();
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
    waterViewMat, waterProjectMat, trailPos, lastHide,
    shallowColor, deepColor, waterTint, wobble, reflectRange, reflectivity, reflectScale,
    anchorY, reflectAnchor
], [out_position, to_uv, to_projPos, to_edge], ps_main, [out_color]);
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
    var contactDepth = -1.0;
    var bodyColor = 0.0;
    BranchBegin("UseWaterTex", "UseWaterTex", []);
    uv = V2AddV2(uv, V2MulFloat(new CVec2(-texflowDir.x, texflowDir.y), time * 0.03));
    refractColor = Sam2DToColor(0.0, uv);
    refractType = 0.0;
    BranchEnd();
    BranchBegin("UseRefractTex", "UseRefractTex", [refractMap]);
    refractColor = Sam2DToColor(refractMap, screenUV);
    if (refractColor.w > 0.75) {
        contactDepth = SaturateFloat((refractColor.w - 0.8) / 0.2);
        contactDepth = contactDepth * contactDepth;
    }
    if (refractColor.w < 0.75) {
        refractColor = new CVec4(shallowColor, 1.0);
        refractColor.rgb = V3Mix(deepColor, refractColor.rgb, 1.0 - SaturateFloat(Remap(V3Len(V3SubV3(camPos, world)), waterUnderFadeDist.x, waterUnderFadeDist.y, 0.0, 0.8)));
        bodyColor = 1.0;
    }
    refractType = 1.0;
    BranchEnd();
    if (refractType < -0.5) {
        refractColor = new CVec4(shallowColor, 1.0);
        var distanceBlend = 1.0 - SaturateFloat(Remap(V3Len(V3SubV3(camPos, world)), waterUnderFadeDist.x, waterUnderFadeDist.y, 0.0, 0.8));
        refractColor.rgb = V3Mix(deepColor, refractColor.rgb, distanceBlend);
        refractType = 2.0;
        bodyColor = 1.0;
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
    var waterLit = new CVec3(1.0, 1.0, 1.0);
    BranchBegin("light", "L", [ligDir, ligCol, ligMask, ligCount, camPos, material, cullMask, ligStep0, ligStep1, ligStep2, ligStep3, ambientColor, envCount, envPos, sam2DCount, samCubeCount]);
    dseMat = GetSunInfo();
    waterLit = V3Sqrt(SaturateV3(V3AddV3(ambientColor, dseMat[1])));
    if (bodyColor > 0.5) {
        if (reflectType > 1.5)
            L_cor.rgb = V3MulV3(refractColor.rgb, waterLit);
        else
            L_cor.rgb = V3Mix(V3MulV3(refractColor.rgb, waterLit), reflectColor.rgb, fresnel);
    }
    lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    dseMat = LightCac3D(to_worldPos, reflectColor, normalWS, shadow, cullMask.x, camPos, lmaterial.y, lmaterial.x, lmaterial.z, -1.0);
    L_cor.rgb = V3AddV3(L_cor.rgb, dseMat[1]);
    if (shadow.a > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.a);
    }
    BranchEnd();
    if (contactDepth > -0.5) {
        var cn = NoiseGet(new CVec3(world.x / 80.0, world.z / 80.0, time * 0.2), SDF.eNoise.PerlinFBM);
        var breakN = NoiseGet(new CVec3(world.x / 250.0 + time * 0.03, world.z / 250.0, time * 0.1), SDF.eNoise.Perlin);
        var bubble = NoiseGet(new CVec3(world.x / 25.0, world.z / 25.0, time * 0.4), SDF.eNoise.PerlinFBM);
        var pixW = V3Len(V3SubV3(camPos, world)) * 0.0012;
        var lodB = SaturateFloat(pixW / 12.0);
        var lodC = SaturateFloat(pixW / 40.0);
        bubble = bubble + (0.45 - bubble) * lodB;
        cn = cn + (0.45 - cn) * lodC;
        var aaD = pixW / (max(waterDeep.z, 1.0) * 4.0);
        var aaS = 0.15 * lodB;
        var waveK = SaturateFloat(V2Len(normalflowDir) / 1.5);
        var near = 1.0 - smoothstep(0.0, 0.2 + 0.45 * waveK, contactDepth);
        var core = 1.0 - smoothstep(0.0, (0.05 + 0.12 * cn) * (0.4 + 0.9 * waveK), contactDepth);
        var splashRange = 0.2 + 0.45 * waveK;
        var cycle = fract(time * (0.15 + 0.25 * waveK) + breakN * 1.5);
        var front = cycle * splashRange;
        var frontW = (0.03 + 0.04 * cn) * (1.0 + 2.0 * cycle) + aaD * 2.0;
        var frontFoam = 1.0 - smoothstep(0.0, frontW, abs(contactDepth - front));
        var trail = (1.0 - smoothstep(0.0, 0.12, front - contactDepth)) * step(contactDepth, front) * 0.45;
        var splash = max(frontFoam, trail) * (1.0 - smoothstep(0.3, 1.0, cycle));
        splash *= smoothstep(0.4 + 0.2 * cycle - aaS, 0.65 + 0.2 * cycle + aaS, bubble * 0.7 + cn * 0.3);
        var coreRange = (0.05 + 0.12 * cn) * (0.4 + 0.9 * waveK);
        var coreT = SaturateFloat(contactDepth / max(coreRange, 0.001));
        var corePatch = smoothstep(0.1 + 0.3 * coreT - aaS, 0.35 + 0.3 * coreT + aaS, bubble * 0.7 + cn * 0.3);
        var contactLine = 1.0 - smoothstep(0.0, 0.015 + aaD * 2.0, contactDepth);
        var coreFoam = max(contactLine, core * corePatch);
        var contactFoam = max(coreFoam, splash);
        L_cor.rgb = V3Mix(L_cor.rgb, V3MulV3(new CVec3(0.9, 0.95, 0.95), waterLit), SaturateFloat(contactFoam) * 0.6 * smoothstep(0.0, 0.6, waveK) * (1.0 - 0.4 * SaturateFloat(pixW / 30.0)));
    }
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    out_color = L_cor;
}
function ToWaterScreenY(_x, _y, _wMat) {
    var P = new CVec4(_x, _y, 0.0, 1.0);
    P = V4MulMatCoordi(P, _wMat);
    P = V4MulMatCoordi(P, waterViewMat);
    P = V4MulMatCoordi(P, waterProjectMat);
    var S = ProjToScreenPos(P);
    return S.y / S.w;
}
function vs_main(f2_ver) {
    var idx = f2_ver.x;
    var colUp = floor(idx * 0.5) * 2.0;
    var tpos = Sam2DArrToV4(trailPos, idx);
    var upos = Sam2DArrToV4(trailPos, colUp);
    var dpos = Sam2DArrToV4(trailPos, colUp + 1.0);
    to_uv.xy = new CVec2(1.0 - tpos.w, (f2_ver.y + 1.0) * 0.5);
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    var P = new CVec4(tpos.x, tpos.y, 0.0, 1.0);
    P = V4MulMatCoordi(P, wMat);
    var S = V4MulMatCoordi(P, viewMat);
    out_position = V4MulMatCoordi(S, projectMat);
    var Q = V4MulMatCoordi(P, waterViewMat);
    Q = V4MulMatCoordi(Q, waterProjectMat);
    to_projPos = ProjToScreenPos(Q);
    to_edge.xyz = new CVec3(ToWaterScreenY(upos.x, upos.z, wMat), ToWaterScreenY(dpos.x, dpos.z, wMat), ToWaterScreenY(upos.x, anchorY, wMat));
}
function ps_main() {
    var uv = new CVec2(to_projPos.x / to_projPos.w, to_projPos.y / to_projPos.w);
    var waterTopY = to_edge.x;
    var waterBottomY = to_edge.y;
    var span = waterTopY - waterBottomY;
    var vFromTop = 0.0;
    if (abs(span) > 1e-6)
        vFromTop = (waterTopY - uv.y) / span;
    var depth = clamp(vFromTop, 0.0, 1.0);
    var startV = 0.05;
    var fade = clamp(vFromTop / max(startV, 1e-6), 0.0, 1.0);
    fade = fade * fade * (3.0 - 2.0 * fade);
    var noise = NoiseGet(new CVec3(to_uv.x, to_uv.y + time * 0.1, time), SDF.eNoise.PerlinFBM);
    noise = noise * 2.0 - 1.0;
    var wob = noise * wobble * fade * (0.25 + depth);
    var reflAxis = to_edge.z + (waterTopY - to_edge.z) * reflectAnchor;
    var reflUV = new CVec2(uv.x + wob, reflAxis + (reflAxis - uv.y) * reflectScale);
    var floorUV = new CVec2(uv.x + wob * 0.5, uv.y);
    var reflColor = Sam2DToColor(0.0, reflUV);
    var floorColor = Sam2DToColor(0.0, floorUV);
    var k = smoothstep(reflectRange.x, reflectRange.y, depth);
    if (reflUV.y > 1.0)
        k = 1.0;
    if (reflUV.y < 0.0)
        k = 1.0;
    var reflAmount = clamp(reflectivity, 0.0, 1.0) * (1.0 - k);
    var tint = V3Mix(shallowColor, deepColor, depth);
    var throughColor = V3Mix(floorColor.rgb, tint, waterTint);
    var L_cor = new CVec4(V3Mix(throughColor, reflColor.rgb, reflAmount), 1.0);
    out_color = L_cor;
}
