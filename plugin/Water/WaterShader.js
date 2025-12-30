import { CAModelCac, GetTexCodiedUV } from "../../artgine/z_file/ColorFun";
import { ambientColor, envCube, GetMaterial, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "../../artgine/z_file/Light";
import { NoiseValue3FBMRest } from "../../artgine/z_file/Noise";
import { abs, Attribute, BranchBegin, BranchDefault, BranchEnd, Build, CVec2, CVec3, CVec4, dFdx, dFdy, MatTypeToMat, max, min, mod, Null, pow, reflect, Sam2D0ToColor, Sam2DToColor, SamCubeToColor, SaturateFloat, V2AddV2, V2Len, V2Mod, V2MulFloat, V2MulV2, V3AddV3, V3Dot, V3Len, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3Pow, V3SubV3, V4Mix, V4MulFloat, V4MulMatCoordi } from "../../artgine/z_file/Shader";
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
var normalflowDir = new CVec2(0.0, 0.0);
var normalRange = 1.0;
var texflowDir = new CVec2(1.0, 0.0);
var shallowColor = new CVec3(0.0, 0.0, 0.0);
var deepColor = new CVec3(0.0, 0.1, 0.5);
var waterDeep = new CVec4(0.0, 256.0, 2000.0, 5.0);
Build("3DWater", ["water"], vs_main_water, [
    worldMat,
    viewMat, projectMat, skin, sam2DCount,
    camPos, time,
    normalRange,
    normalflowDir, texflowDir,
    shallowColor, deepColor, waterDeep
], [out_position, to_uv, to_worldPos, to_projPos, to_ref], ps_main_water, [out_color]);
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
    var normalColor = V4Mix(Sam2DToColor(normal1Map, V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z, cycle)))), Sam2DToColor(normal2Map, V2AddV2(V2MulV2(to_uv, new CVec2(1.2, 0.8)), V2MulFloat(_flow.xy, mod(_flow.z + halfCycle, cycle)))), abs((mod(_flow.z, cycle) / cycle - 0.5) * 2.0));
    return V3Nor(new CVec3(normalColor.r * 2.0 - 1.0, normalColor.b * 2.0 - 1.0, normalColor.g * 2.0 - 1.0));
}
function ProceduralFlowNormal(_flow) {
    var halfCycle = 0.075;
    var cycle = halfCycle * 2.0;
    var uv0 = V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z, cycle)));
    var uv1 = V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z + halfCycle, cycle)));
    var freq = 40.0;
    var amp = 20.0;
    var h0 = amp * NoiseValue3FBMRest(new CVec3(V2MulFloat(uv0, freq), 0.0), 0.5);
    var h1 = amp * NoiseValue3FBMRest(new CVec3(V2MulFloat(uv1, freq), 0.5), 0.5);
    var normal0 = V3Nor(new CVec3(dFdx(h0), 1.0, dFdy(h0)));
    var normal1 = V3Nor(new CVec3(dFdx(h1), 1.0, dFdy(h1)));
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
    BranchBegin("CAModel", "CA", [colorModel, alphaModel]);
    L_cor = CAModelCac(L_cor, colorModel, alphaModel);
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
