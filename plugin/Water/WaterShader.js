import { ColorModalFun, GetTexCodiedUV } from "../../artgine/z_file/ColorFun";
import { ambientColor, envCube, GetMaterial, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "../../artgine/z_file/Light";
import { NoiseGet } from "../../artgine/z_file/Noise";
import { SDF } from "../../artgine/z_file/SDF";
import { abs, Attribute, BranchBegin, BranchDefault, BranchEnd, Build, CVec2, CVec3, CVec4, dFdy, MatTypeToMat, max, min, mod, Null, pow, reflect, Sam2D0ToColor, Sam2DToColor, SamCubeToColor, SaturateFloat, V2AddV2, V2Len, V2Mod, V2MulFloat, V3AddV3, V3Dot, V3Len, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3Pow, V3SubV3, V4Mix, V4MulFloat, V4MulMatCoordi } from "../../artgine/z_file/Shader";
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
var sam2DCount = Null();
var reflectMap = 1.0;
var refractMap = 2.0;
var normal1Map = 3.0;
var normal2Map = 4.0;
var normalflowDir = new CVec2(1.0, 0.0);
var normalRange = 1.0;
var texflowDir = new CVec2(1.0, 0.0);
var shallowColor = new CVec3(0.0, 0.0, 0.0);
var deepColor = new CVec3(0.0, 0.1, 0.5);
var waterDeep = new CVec4(0.0, 256.0, 2000.0, 5.0);
var waterTop = -1.0;
Build("Water3D", ["water", "3D"], vs_main_water, [
    worldMat,
    viewMat, projectMat, skin, sam2DCount,
    camPos, time,
    normalRange,
    normalflowDir, texflowDir,
    shallowColor, deepColor, waterDeep,
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
function NormalFlow(_flow) {
    var halfCycle = 0.075;
    var cycle = halfCycle * 2.0;
    var normalColor = V4Mix(Sam2DToColor(normal1Map, V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z, cycle)))), Sam2DToColor(normal2Map, V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z + halfCycle, cycle)))), abs((mod(_flow.z, cycle) / cycle - 0.5) * 2.0));
    return V3Nor(new CVec3(normalColor.r * 2.0 - 1.0, normalColor.b * 2.0 - 1.0, normalColor.g * 2.0 - 1.0));
}
function GetWaterHeight(_uvw, _type) {
    var offset = NoiseGet(V3MulFloat(_uvw, 0.5), SDF.eNoise.Perlin);
    _uvw = new CVec3(_uvw.x + offset * 0.1, _uvw.y + offset * 0.1, 0.0);
    var h = NoiseGet(_uvw, _type);
    var uvw2 = V3AddV3(V3MulFloat(_uvw, 2.13), new CVec3(12.34, 56.78, 0.0));
    uvw2 = new CVec3(uvw2.x * 0.88294759285 - uvw2.y * 0.46947156278, uvw2.x * 0.46947156278 + uvw2.y * 0.88294759285, uvw2.z);
    h += 0.5 * NoiseGet(uvw2, _type);
    return h;
}
function ProceduralFlowNormal(_flow) {
    var halfCycle = 0.075;
    var cycle = halfCycle * 2.0;
    var uv0 = V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z, cycle)));
    var uv1 = V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z + halfCycle, cycle)));
    var uvScale = 1.0;
    var heightScale = 8.0;
    uv0 = V2MulFloat(uv0, uvScale);
    uv1 = V2MulFloat(uv1, uvScale);
    var eps = 1.0 / 64.0;
    var deltaU = new CVec2(eps, 0.0);
    var deltaV = new CVec2(0.0, eps);
    var h0 = GetWaterHeight(new CVec3(uv0, 0.0), SDF.eNoise.Perlin);
    var h0U = GetWaterHeight(new CVec3(V2AddV2(uv0, deltaU), 0.0), SDF.eNoise.Perlin);
    var h0V = GetWaterHeight(new CVec3(V2AddV2(uv0, deltaV), 0.0), SDF.eNoise.Perlin);
    var h1 = GetWaterHeight(new CVec3(uv1, 0.5), SDF.eNoise.Perlin);
    var h1U = GetWaterHeight(new CVec3(V2AddV2(uv1, deltaU), 0.5), SDF.eNoise.Perlin);
    var h1V = GetWaterHeight(new CVec3(V2AddV2(uv1, deltaV), 0.5), SDF.eNoise.Perlin);
    var normal0 = V3Nor(new CVec3(heightScale * (h0 - h0U), 1.0, heightScale * (h0 - h0V)));
    var normal1 = V3Nor(new CVec3(heightScale * (h1 - h1U), 1.0, heightScale * (h1 - h1V)));
    return V3Nor(V3Mix(normal0, normal1, abs((mod(_flow.z, cycle) / cycle - 0.5) * 2.0)));
}
function CorrectedReflect(_view, _normal, _boxPos, _boxSize) {
    var rayDir = V3Nor(reflect(_view, _normal));
    var invDir = new CVec3(1.0 / rayDir.x, 1.0 / rayDir.y, 1.0 / rayDir.z);
    var rbmax = V3MulV3(V3SubV3(V3MulFloat(V3SubV3(_boxSize, _boxPos), 0.5), to_worldPos.xyz), invDir);
    var rbmin = V3MulV3(V3SubV3(V3MulFloat(V3SubV3(_boxSize, _boxPos), -0.5), to_worldPos.xyz), invDir);
    var rbminmax = new CVec3(rayDir.x > 0.0 ? rbmax.x : rbmin.x, rayDir.y > 0.0 ? rbmax.y : rbmin.y, rayDir.z > 0.0 ? rbmax.z : rbmin.z);
    var correction = min(min(rbminmax.x, rbminmax.y), rbminmax.z);
    var intersection = V3AddV3(to_worldPos.xyz, V3MulFloat(rayDir, correction));
    return V3SubV3(intersection, _boxPos);
}
function ps_main_water() {
    var to_screenUV = V3MulFloat(to_projPos.xyz, 1.0 / to_projPos.w);
    var world = V3MulFloat(to_worldPos.xyz, 1.0 / to_worldPos.w);
    var view = V3Nor(V3SubV3(camPos, world));
    var flowLen = V2Len(normalflowDir);
    var flow = new CVec3(-normalflowDir.x / max(flowLen, 1e-6), normalflowDir.y / max(flowLen, 1e-6), flowLen * time * 0.03);
    var normalTS = new CVec3(0.0, 1.0, 0.0);
    var normalDist = new CVec3(0.0, 0.0, 0.0);
    if (flowLen > 0.0) {
        BranchBegin("normalMap", "N0", [normal1Map, normal2Map]);
        normalTS = NormalFlow(flow);
        BranchDefault();
        normalTS = ProceduralFlowNormal(flow);
        BranchEnd();
        var deltaDist = max(0.0, V3Len(V3SubV3(camPos, world)) - waterDeep.z * 0.5);
        var fallOff = 1.0 / (1.0 + deltaDist * 10.0 / waterDeep.z);
        normalDist = V3MulFloat(normalTS, 0.1 * flowLen * to_screenUV.z * fallOff);
    }
    var normalWS = V3Nor(new CVec3(normalTS.x * normalRange, max(normalTS.y * 0.72, 0.18), normalTS.z * normalRange));
    var screenUV = V2AddV2(to_screenUV.xy, new CVec2(normalDist.x, normalDist.z));
    var uv = V2AddV2(to_uv, new CVec2(normalDist.x, normalDist.z));
    var uvw;
    var refractColor;
    var refractType = -1.0;
    BranchBegin("UseWaterTex", "UseWaterTex", []);
    flowLen = V2Len(texflowDir);
    flow = new CVec3(-texflowDir.x / max(flowLen, 1e-6), texflowDir.y / max(flowLen, 1e-6), flowLen * time * 0.03);
    uv = V2AddV2(uv, V2MulFloat(flow.xy, flow.z));
    uv = V2Mod(uv, 1.0);
    refractColor = Sam2D0ToColor(uv);
    refractType = 0.0;
    BranchEnd();
    BranchBegin("UseRefractTex", "UseRefractTex", [refractMap]);
    refractColor = Sam2DToColor(refractMap, screenUV);
    refractType = 1.0;
    BranchEnd();
    if (refractType < -0.5) {
        refractColor = new CVec4(shallowColor, 1.0);
        refractColor.rgb = V3Mix(deepColor, refractColor.rgb, 1.0 - SaturateFloat(V3Len(V3SubV3(camPos, world)) / waterDeep.z));
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
    reflectType = 1.0;
    BranchEnd();
    if (reflectType < -0.5) {
        reflectType = 2.0;
    }
    var L_cor;
    if (reflectType > 1.5) {
        L_cor = new CVec4(refractColor.rgb, 1.0);
    }
    else {
        var theta = max(V3Dot(view, normalWS), 0.0);
        var fresnel = 0.02 + 0.98 * pow(1.0 - theta, 5.0);
        L_cor = new CVec4(V3Mix(refractColor.xyz, reflectColor.rgb, fresnel), 1.0);
    }
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    var dseMat;
    var lmaterial = new CVec4(1.0, 1.0, 1.0, 1.0);
    BranchBegin("light", "L", [ligDir, ligCol, ligCount, material, camPos, ligStep0, ligStep1, ligStep2, ligStep3, envCube, ambientColor]);
    lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    dseMat = LightCac3D(camPos, to_worldPos, L_cor, normalWS, -1.0, lmaterial.y, lmaterial.x, lmaterial.z, new CVec3(0.0, 0.0, 0.0));
    L_cor.rgb = V3AddV3(dseMat[0], dseMat[1]);
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
    var noise = NoiseGet(new CVec3(to_uv.x, to_uv.y + time * 0.1, time), SDF.eNoise.FBM);
    noise = noise * 2.0 - 1.0;
    srcUV.x += noise * (0.005 * fade);
    var L_cor = Sam2DToColor(0.0, srcUV);
    out_color = L_cor;
}
