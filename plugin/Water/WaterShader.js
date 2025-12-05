import { CAModelCac, GetTexCodiedUV } from "../../artgine/z_file/ColorFun";
import { ambientColor, envCube, GetMaterial, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "../../artgine/z_file/Light";
import { NoiseFBM } from "../../artgine/z_file/Noise";
import { abs, Attribute, BranchBegin, BranchDefault, BranchEnd, Build, CVec2, CVec3, CVec4, dFdx, dFdy, MatTypeToMat, max, mix, mod, Null, pow, Sam2D0ToColor, Sam2DMat, Sam2DToColor, sign, V2AddV2, V2Len, V2Mod, V2MulFloat, V2MulV2, V3AddV3, V3Dot, V3Mix, V3MulFloat, V3Nor, V3SubV3, V4Mix, V4MulFloat, V4MulMatCoordi } from "../../artgine/z_file/Shader";
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
var weightArrMat = new Sam2DMat(11, 10);
var weightBakeMat = 9.0;
var weightBakeIndex;
var camPos = Null();
var time = Attribute(0, "time");
var sam2DCount = Null();
var reflectMap = 1.0;
var refractMap = 2.0;
var normal0Map = 3.0;
var normal1Map = 4.0;
var normalflowDir = new CVec2(1.0, 0.0);
var normalRange = 1.0;
var texflowDir = new CVec2(1.0, 0.0);
Build("3DWater", ["water"], vs_main_water, [
    worldMat,
    viewMat, projectMat, skin, sam2DCount,
    camPos, time,
    reflectMap, refractMap, normal0Map, normal1Map,
    normalRange,
    normalflowDir, texflowDir
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
    var normalColor = V4Mix(Sam2DToColor(normal0Map, V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z, cycle)))), Sam2DToColor(normal1Map, V2AddV2(V2MulV2(to_uv, new CVec2(1.2, 0.8)), V2MulFloat(_flow.xy, mod(_flow.z + halfCycle, cycle)))), abs((mod(_flow.z, cycle) / cycle - 0.5) * 2.0));
    return V3Nor(new CVec3(normalColor.r * 2.0 - 1.0, normalColor.b, normalColor.g * 2.0 - 1.0));
}
function ProceduralFlowNormal(_flow) {
    var halfCycle = 0.075;
    var cycle = halfCycle * 2.0;
    var uv0 = V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z, cycle)));
    var uv1 = V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z + halfCycle, cycle)));
    var freq = 40.0;
    var amp = 20.0;
    var h0 = amp * NoiseFBM(new CVec3(V2MulFloat(uv0, freq), 0.0), 0.5);
    var h1 = amp * NoiseFBM(new CVec3(V2MulFloat(uv1, freq), 0.0), 0.5);
    var normal0 = V3Nor(new CVec3(dFdx(h0), 1.0, dFdy(h0)));
    var normal1 = V3Nor(new CVec3(dFdx(h1), 1.0, dFdy(h1)));
    return V3Nor(V3Mix(normal0, normal1, abs((mod(_flow.z, cycle) / cycle - 0.5) * 2.0)));
}
function ps_main_water() {
    var to_screenUV = V3MulFloat(to_projPos.xyz, 1.0 / to_projPos.w);
    var world = V3MulFloat(to_worldPos.xyz, 1.0 / to_worldPos.w);
    var view = V3Nor(V3SubV3(camPos, world));
    var flowLen = V2Len(normalflowDir);
    var flow = new CVec3(-normalflowDir.x / max(flowLen, 1e-6), normalflowDir.y / max(flowLen, 1e-6), flowLen * time * 0.03);
    var normalTS = new CVec3(0.0, 1.0, 0.0);
    BranchBegin("normalMap", "N0", []);
    normalTS = V3Mix(new CVec3(0.0, 1.0, 0.0), NormalFlow(flow), sign(flowLen));
    BranchDefault();
    normalTS = V3Mix(new CVec3(0.0, 1.0, 0.0), ProceduralFlowNormal(flow), sign(flowLen));
    BranchEnd();
    var normalWS = V3Nor(new CVec3(normalTS.x * normalRange, max(normalTS.y * 0.72, 0.18), normalTS.z * normalRange));
    var normalUV = V2MulFloat(new CVec2(normalWS.x, normalWS.z), 0.1 * flowLen);
    var screenUV = V2AddV2(to_screenUV.xy, normalUV);
    var uv = V2AddV2(to_uv, normalUV);
    var refractColor;
    BranchBegin("UseWaterTex", "UseWaterTex", []);
    flowLen = V2Len(texflowDir);
    flow = new CVec3(-texflowDir.x / max(flowLen, 1e-6), texflowDir.y / max(flowLen, 1e-6), flowLen * time * 0.03);
    uv = V2AddV2(uv, V2MulFloat(flow.xy, flow.z));
    uv = V2Mod(uv, 1.0);
    refractColor = Sam2D0ToColor(uv);
    BranchDefault();
    refractColor = Sam2DToColor(refractMap, screenUV);
    BranchEnd();
    var L_cor;
    var reflectColor;
    BranchBegin("UseWaterReflect", "UseWaterReflect", []);
    reflectColor = Sam2DToColor(reflectMap, new CVec2(1.0 - screenUV.x, screenUV.y)).rgb;
    L_cor = new CVec4(V3Mix(refractColor.xyz, reflectColor, mix(pow(1.0 - max(V3Dot(view, normalWS), 0.0), 5.0), 1.0, 0.02)), 1.0);
    BranchDefault();
    L_cor = new CVec4(refractColor.xyz, 1.0);
    BranchEnd();
    BranchBegin("CAModel", "CA", [colorModel, alphaModel]);
    L_cor = CAModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    var dseMat;
    var lmaterial = new CVec4(1.0, 1.0, 1.0, 1.0);
    var ambient = new CVec3(0.0, 0.0, 0.0);
    var shadow = -1.0;
    BranchBegin("light", "L", [ligDir, ligCol, ligCount, material, camPos, ligStep0, ligStep1, ligStep2, ligStep3, envCube, ambientColor]);
    lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    dseMat = LightCac3D(camPos, to_worldPos, L_cor, normalWS, shadow, lmaterial.y, lmaterial.x, lmaterial.z, ambient);
    L_cor.rgb = V3AddV3(dseMat[0], dseMat[1]);
    BranchEnd();
    out_color = L_cor;
}
