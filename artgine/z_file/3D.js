import { Build, CMat, CVec2, CVec3, CVec4, CMat3, InverseMat3, LWVPMul, discard, screenPos, MappingV3ToTex, Mat4ToMat3, MatAdd, MatMul, FloatMulMat, TransposeMat3, Sam2DToColor, Sam2DToMat, Sam2DToV4, Sam2DMat, Sam2DSize, V2SubV2, V2MulFloat, V2DivV2, V3AddV3, V3Dot, V3Nor, V3MulFloat, V3MulMat3Normal, V3ToMat3, V4MulMatCoordi, ParallaxNormal, FloatToInt, IntToFloat, MappingTexToV3, BranchBegin, BranchEnd, BranchDefault, Attribute, Null, clamp, floor, MatMix, Sam2D0ToColor, MatTypeToMat, min, abs, max, dFdy, V3Len, length, dFdx, V3MulV3, V3Mix, V3SubV3, SaturateFloat, V2AddV2, V2MulV2, V3Min, V2Len, SaturateV3, } from "./Shader";
import { SDF } from "./SDF";
import { CAModelCac, ColorVFX, GetTexCodiedUV } from "./ColorFun";
import { ambientColor, envCube, GetMaterial, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "./Light";
import { ApplyWind, windCount, windDir, windInfluence, windInfo, windPos } from "./Wind";
import { bias, calcShadow, normalBias, PCF, shadowCount, shadowOn, shadowBottomCasP1, shadowFarCasP0, shadowLeftCasV2, shadowNearCasV0, shadowRightCasP2, shadowTopCasV1, shadowPointProj, shadowRate, shadowReadList, shadowWrite, texture16f, jitter, calcParallaxShadow } from "./Shadow";
var colorModel = Null();
var alphaModel = Null();
var texCodi = Null();
var skin = Null();
var parallaxNormal = Attribute(0, "canvas");
var sam2DCount = Null();
var material = new CVec4(0.0, 0.0, 0.0, 1.0);
var alphaCut = 0.1;
var colorVFX = Null();
var worldMat = Null();
var worldMatShort = Null();
var worldMatType = 16.0;
var viewMat = Null();
var projectMat = Null();
var zDepth = 0.0;
var zDepthBias = 0.001;
var to_uv = Null();
var to_normal = Null();
var to_binormal = Null();
var to_tangent = Null();
var to_ref = Null();
var to_worldPos = Null();
var to_viewPos = Null();
var out_position = Null();
var out_color = Null();
var out_pos = Null();
var out_nor = Null();
var out_spc = Null();
var outputType = Null();
var camPos = Null();
var depthMap = 0.0;
var screenResolution = new CVec2(1.0, 1.0);
var weightArrMat = new Sam2DMat(11, 10);
var weightBakeMat = 9.0;
var weightBakeIndex;
var time = Attribute(0, "time");
var waterDeep = new CVec2(0.0, 256.0);
var shallowColor = new CVec3(0.0, 0.0, 0.0);
var deepColor = new CVec3(0.0, 0.1, 0.5);
var causticMap = 5.0;
var causticFlowDir = new CVec2(1.0, 0.0);
Build("Artgine/Shader/3DSkin", [], vs_main, [worldMat,
    viewMat, projectMat, skin, weightArrMat, weightBakeMat, weightBakeIndex, sam2DCount], [out_position, to_uv, to_normal, to_binormal, to_tangent, to_ref, to_worldPos], ps_main, [out_color]);
Build("Artgine/Shader/3DSimple", ["simple"], vs_main_simple, [worldMat,
    viewMat, projectMat], [out_position, to_uv], ps_main_simple, [out_color]);
Build("Artgine/Shader/3DGBuffer", ["gBuf"], vs_main_gBuffer, [
    worldMat,
    viewMat, projectMat, skin, weightArrMat, weightBakeMat, weightBakeIndex,
    sam2DCount, material, outputType,
], [out_position, to_uv, to_normal, to_binormal, to_tangent, to_ref, to_worldPos, to_viewPos], ps_main_gBuffer, [out_color]);
Build("Artgine/Shader/3DGBufferMulti", ["gBufMulti"], vs_main_gBuffer, [
    worldMat,
    viewMat, projectMat, skin, weightArrMat, weightBakeMat, weightBakeIndex,
    sam2DCount, material,
], [out_position, to_uv, to_normal, to_binormal, to_tangent, to_ref, to_worldPos, to_viewPos], ps_main_gBuffer_multi, [out_color, out_pos, out_nor, out_spc]);
Build("Artgine/Shader/3DShadowWrite", ["shadowWrite"], vs_main_shadow_write, [
    worldMat,
    viewMat, projectMat, skin, weightArrMat, weightBakeMat, weightBakeIndex,
    shadowNearCasV0, shadowFarCasP0, shadowTopCasV1, shadowBottomCasP1, shadowLeftCasV2, shadowRightCasP2, shadowWrite,
    shadowCount, shadowPointProj, shadowReadList, jitter
], [out_position, to_uv, to_viewPos], ps_main_shadow_write, [out_color]);
Build("Artgine/Shader/3DShadowRead", ["shadowRead"], vs_main_shadow_read, [
    worldMat,
    viewMat, projectMat, skin, weightArrMat, weightBakeMat, weightBakeIndex,
    shadowNearCasV0, shadowFarCasP0, shadowTopCasV1, shadowBottomCasP1, shadowLeftCasV2, shadowRightCasP2, shadowWrite,
    shadowCount, shadowPointProj, shadowReadList,
    shadowRate, PCF, texture16f, bias, normalBias, jitter,
    ligDir, ligCol, ligCount,
], [out_position, to_uv, to_normal, to_worldPos, to_binormal, to_tangent, to_ref], ps_main_shadow_read, [out_color]);
Build("Artgine/Shader/3DBake", ["bake"], vs_main_bake, [
    worldMat,
    viewMat, projectMat, skin, weightArrMat, weightBakeMat, weightBakeIndex
], [out_position, to_uv, to_normal, to_worldPos, to_tangent, to_binormal, to_ref], ps_main_bake, [out_color]);
function vs_main_simple(f3_ver, f2_uv) {
    to_uv = f2_uv;
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    out_position = LWVPMul(f3_ver, wMat, viewMat, projectMat);
}
function ps_main_simple() {
    var L_cor = Sam2D0ToColor(to_uv);
    BranchBegin("CAModel", "CA", [colorModel, alphaModel]);
    L_cor = CAModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("alphaCut", "A", [alphaCut]);
    if (L_cor.a <= alphaCut)
        discard;
    BranchEnd();
    out_color = L_cor;
}
function GetWorldWeightMat(_weightArrMat, _weightBakeArrMat, _index, _weight, _weightIndex, _worldMat, _skin) {
    var woweMat = _worldMat;
    if (_skin > 0.5 && _weight.x + _weight.y + _weight.z + _weight.w > 0.0) {
        if (_skin < SDF.eSkin.Bone + 0.5 && _weightArrMat.x > 0.0) {
            var weightMat = FloatMulMat(_weight.x, Sam2DToMat(_weightArrMat, _weightIndex.x));
            weightMat = MatAdd(FloatMulMat(_weight.y, Sam2DToMat(_weightArrMat, _weightIndex.y)), weightMat);
            weightMat = MatAdd(FloatMulMat(_weight.z, Sam2DToMat(_weightArrMat, _weightIndex.z)), weightMat);
            weightMat = MatAdd(FloatMulMat(_weight.w, Sam2DToMat(_weightArrMat, _weightIndex.w)), weightMat);
            woweMat = MatMul(weightMat, woweMat);
        }
        else if (_skin < SDF.eSkin.Bake + 0.5 && _index > -0.5) {
            var st = floor(_index);
            var ed = st + 1.0;
            var weightSTMat = FloatMulMat(_weight.x, Sam2DToMat(new CVec2(_weightBakeArrMat, st), _weightIndex.x));
            weightSTMat = MatAdd(FloatMulMat(_weight.y, Sam2DToMat(new CVec2(_weightBakeArrMat, st), _weightIndex.y)), weightSTMat);
            weightSTMat = MatAdd(FloatMulMat(_weight.z, Sam2DToMat(new CVec2(_weightBakeArrMat, st), _weightIndex.z)), weightSTMat);
            weightSTMat = MatAdd(FloatMulMat(_weight.w, Sam2DToMat(new CVec2(_weightBakeArrMat, st), _weightIndex.w)), weightSTMat);
            var weightEDMat = FloatMulMat(_weight.x, Sam2DToMat(new CVec2(_weightBakeArrMat, ed), _weightIndex.x));
            weightEDMat = MatAdd(FloatMulMat(_weight.y, Sam2DToMat(new CVec2(_weightBakeArrMat, ed), _weightIndex.y)), weightEDMat);
            weightEDMat = MatAdd(FloatMulMat(_weight.z, Sam2DToMat(new CVec2(_weightBakeArrMat, ed), _weightIndex.z)), weightEDMat);
            weightEDMat = MatAdd(FloatMulMat(_weight.w, Sam2DToMat(new CVec2(_weightBakeArrMat, ed), _weightIndex.w)), weightEDMat);
            var weightMat = MatMix(weightSTMat, weightEDMat, _index - st);
            woweMat = MatMul(weightMat, woweMat);
        }
    }
    return woweMat;
}
function GetParallaxMappedUV(_uv, _tan, _bi, _nor, _wor, _camPos, _texOff) {
    var uvh = new CVec3(_uv, 0.0);
    if (parallaxNormal > 0.0001) {
        var TBN = TransposeMat3(V3ToMat3(_tan, _bi, _nor));
        uvh = ParallaxNormal(V3MulMat3Normal(_camPos, TBN).xyz, V3MulMat3Normal(_wor.xyz, TBN).xyz, _texOff.y, _uv, parallaxNormal);
    }
    return uvh;
}
function GetTangentSpaceNormal(_uv, _tan, _bi, _nor, _texOff, sam2DCount) {
    var N = _nor;
    if (to_ref.y > 0.5 && sam2DCount > 1.5) {
        var TBN = V3ToMat3(_tan, _bi, _nor);
        N = Sam2DToColor(to_ref.y, _uv).xyz;
        N = MappingTexToV3(N);
        N.y = -N.y;
        if (V3Dot(N, new CVec3(0, 0, 1)) > 0.999)
            N = _nor;
        else
            N = V3Nor(V3MulMat3Normal(N, TBN).xyz);
    }
    return N;
}
function vs_main(f3_ver, f2_uv, f4_we, f4_wi, f3_nor, f4_tan, f3_bi, f3_ref) {
    BranchBegin("codi", "C", [texCodi]);
    to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);
    BranchDefault();
    to_uv.xy = f2_uv;
    BranchEnd();
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    var woweMat = GetWorldWeightMat(weightArrMat, weightBakeMat, weightBakeIndex, f4_we, f4_wi, wMat, skin);
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, woweMat);
    BranchBegin("wind", "W", [windInfluence, windDir, windPos, windInfo, windCount, time]);
    P = ApplyWind(P, skin, f4_we, time);
    BranchEnd();
    to_worldPos = P;
    P = V4MulMatCoordi(P, viewMat);
    P = V4MulMatCoordi(P, projectMat);
    ;
    BranchBegin("zDepth", "Z", [zDepth, zDepthBias]);
    P.z += zDepth * zDepthBias;
    BranchEnd();
    out_position = P;
    to_tangent = V3Nor(V3MulMat3Normal(f4_tan.xyz, Mat4ToMat3(woweMat)).xyz);
    to_binormal = V3Nor(V3MulMat3Normal(f3_bi, Mat4ToMat3(woweMat)).xyz);
    if (f3_ref.y > 0.0) {
        to_normal = V3Nor(V3MulMat3Normal(f3_nor, Mat4ToMat3(woweMat)).xyz);
    }
    else {
        to_normal = V3Nor(V3MulMat3Normal(f3_nor, TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
    }
    to_ref = f3_ref;
}
function vs_main_gBuffer(f3_ver, f2_uv, f4_wi, f4_we, f3_nor, f4_tan, f3_bi, f3_ref) {
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
    var woweMat = GetWorldWeightMat(weightArrMat, weightBakeMat, weightBakeIndex, f4_we, f4_wi, wMat, skin);
    to_tangent = V3Nor(V3MulMat3Normal(f4_tan.xyz, Mat4ToMat3(woweMat)).xyz);
    to_binormal = V3Nor(V3MulMat3Normal(f3_bi, Mat4ToMat3(woweMat)).xyz);
    if (f3_ref.y > 0.0) {
        to_normal = V3Nor(V3MulMat3Normal(f3_nor, Mat4ToMat3(woweMat)).xyz);
    }
    else {
        to_normal = V3Nor(V3MulMat3Normal(f3_nor, TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
    }
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, woweMat);
    BranchBegin("wind", "W", [windInfluence, windDir, windPos, windInfo, windCount, time]);
    P = ApplyWind(P, skin, f4_we, time);
    BranchEnd();
    to_worldPos = P;
    P = V4MulMatCoordi(P, viewMat);
    to_viewPos = P;
    out_position = V4MulMatCoordi(P, projectMat);
}
function vs_main_bake(f3_ver, f4_wi, f4_we, f2_uv, f2_sha, f3_nor, f4_tan, f3_bi, f3_ref) {
    BranchBegin("codi", "C", [texCodi]);
    to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);
    BranchDefault();
    to_uv.xy = f2_uv;
    BranchEnd();
    var clip_space_pos = V2SubV2(V2MulFloat(f2_sha, 2.0), new CVec2(1.0, 1.0));
    out_position = new CVec4(clip_space_pos, 0.0, 1.0);
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    var woweMat = GetWorldWeightMat(weightArrMat, weightBakeMat, weightBakeIndex, f4_we, f4_wi, wMat, skin);
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, woweMat);
    BranchBegin("wind", "W", [windInfluence, windDir, windPos, windInfo, windCount, time]);
    BranchEnd();
    to_worldPos = P;
    to_tangent = V3Nor(V3MulMat3Normal(f4_tan.xyz, Mat4ToMat3(woweMat)).xyz);
    to_binormal = V3Nor(V3MulMat3Normal(f3_bi, Mat4ToMat3(woweMat)).xyz);
    if (f3_ref.y > 0.0) {
        to_normal = V3Nor(V3MulMat3Normal(f3_nor, Mat4ToMat3(woweMat)).xyz);
    }
    else {
        to_normal = V3Nor(V3MulMat3Normal(f3_nor, TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
    }
    to_ref = f3_ref;
}
function SampleNormalMapToCaustic(_map, _uv) {
    var N = Sam2DToColor(_map, _uv).rgb;
    N = V3Nor(V3SubV3(V3MulFloat(N, 2.0), new CVec3(1.0, 1.0, 1.0)));
    var L = V3Nor(new CVec3(0.0, 1.0, 0.0));
    var b = clamp(V3Dot(N, L), 0.0, 1.0);
    return new CVec4(b, b, b, 1.0);
}
function SampleCaustics(_map, _uv, _split) {
    var uv1 = V2AddV2(_uv, new CVec2(_split, _split));
    var uv2 = V2AddV2(_uv, new CVec2(_split, -_split));
    var uv3 = V2AddV2(_uv, new CVec2(-_split, -_split));
    var r = SampleNormalMapToCaustic(_map, uv1).r;
    var g = SampleNormalMapToCaustic(_map, uv2).g;
    var b = SampleNormalMapToCaustic(_map, uv3).b;
    return new CVec3(r, g, b);
}
function Caustics(_map, _world, _flow) {
    var split = 1.0 / 500.0;
    var worldToUV = V3MulFloat(_world, split);
    var uv = new CVec2(worldToUV.x, worldToUV.z);
    var uv1 = V2AddV2(V2MulV2(uv, new CVec2(1.0, 1.0)), V2MulFloat(_flow.xy, _flow.z));
    var uv2 = V2AddV2(V2MulV2(uv, new CVec2(-1.0, -1.0)), V2MulFloat(_flow.xy, _flow.z * 0.75));
    var tex1 = SampleCaustics(_map, uv1, split);
    var tex2 = SampleCaustics(_map, uv2, split);
    return V3Min(tex1, tex2);
}
function ps_main() {
    var shadowTex = new CVec4(0.0, 0.0, 0.0, 0.0);
    var shadow = -1.0;
    BranchBegin("shadow", "S", [shadowOn]);
    if (shadowOn > 0.5) {
        shadowTex = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
        shadow = shadowTex.x;
    }
    BranchEnd();
    var world = to_worldPos;
    var uv = to_uv;
    var uvh;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uvh = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
    uv = uvh.xy;
    world.xyz -= V3MulFloat(V3Nor(V3SubV3(camPos, world.xyz)), V3Len(new CVec3(V2SubV2(uvh.xy, to_uv), parallaxNormal * uvh.z)) / max(length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)), length(abs(dFdy(to_uv))) / length(dFdy(world.xyz))));
    BranchEnd();
    var L_cor = Sam2DToColor(to_ref.x, uv);
    BranchBegin("CAModel", "CA", [colorModel, alphaModel]);
    L_cor = CAModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "VFX", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, uv, uv, colorVFX, time);
    BranchEnd();
    BranchBegin("alphaCut", "A", [alphaCut]);
    if (L_cor.a < alphaCut)
        discard;
    BranchEnd();
    var dseMat = new CMat3(0);
    var lmaterial = new CVec4(1.0, 1.0, 1.0, 1.0);
    BranchBegin("light", "L", [ligDir, ligCol, ligCount, camPos, material, ligStep0, ligStep1, ligStep2, ligStep3, envCube, ambientColor]);
    lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    dseMat = LightCac3D(camPos, to_worldPos, L_cor, GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref, sam2DCount), shadow, lmaterial.y, lmaterial.x, lmaterial.z, ambientColor);
    L_cor.rgb = V3AddV3(dseMat[0], dseMat[1]);
    BranchDefault();
    if (shadow > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow);
    }
    BranchEnd();
    out_color = L_cor;
    BranchBegin("waterRefract", "waterRefract", [waterDeep, shallowColor, deepColor, causticMap, causticFlowDir, time]);
    if (V2Len(causticFlowDir) > 0.0) {
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(Caustics(causticMap, world.xyz, new CVec3(-causticFlowDir.x / max(V2Len(causticFlowDir), 1e-6), causticFlowDir.y / max(V2Len(causticFlowDir), 1e-6), V2Len(causticFlowDir) * time * 0.03)), 0.5));
        out_color.rgb = SaturateV3(out_color.rgb);
    }
    if (waterDeep.x > world.y) {
        out_color.rgb = V3Mix(deepColor, V3MulV3(out_color.rgb, shallowColor), 1.0 - SaturateFloat((waterDeep.x - world.y) / waterDeep.y));
    }
    BranchEnd();
}
function ps_main_gBuffer() {
    var uv = to_uv;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref).xy;
    BranchEnd();
    var L_cor;
    if (sam2DCount == 1.0)
        L_cor = Sam2DToColor(0.0, uv);
    else
        L_cor = Sam2DToColor(to_ref.x, uv);
    BranchBegin("CAModel", "CA", [colorModel, alphaModel]);
    L_cor = CAModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "VFX", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, uv, uv, colorVFX, time);
    BranchEnd();
    BranchBegin("alphaCut", "A", [alphaCut]);
    if (L_cor.a < alphaCut)
        discard;
    BranchEnd();
    if (outputType < SDF.eGBuf.Position + 0.5) {
        out_color = new CVec4(to_viewPos.xyz, 0.5);
    }
    else if (outputType < SDF.eGBuf.Normal + 0.5) {
        var N = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref, sam2DCount);
        out_color = new CVec4(MappingV3ToTex(N), 1.0);
    }
    else if (outputType < SDF.eGBuf.Albedo + 0.5) {
        out_color = L_cor;
    }
    else if (outputType < SDF.eGBuf.SpeculerPowEmissive + 0.5) {
        var lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
        out_color = lmaterial;
    }
}
function ps_main_gBuffer_multi() {
    var uv = to_uv;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref).xy;
    BranchEnd();
    var L_cor;
    if (sam2DCount == 1.0)
        L_cor = Sam2DToColor(0.0, uv);
    else
        L_cor = Sam2DToColor(to_ref.x, uv);
    BranchBegin("CAModel", "CA", [colorModel, alphaModel]);
    L_cor = CAModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "VFX", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, uv, uv, colorVFX, time);
    BranchEnd();
    BranchBegin("alphaCut", "A", [alphaCut]);
    if (L_cor.a < alphaCut)
        discard;
    BranchEnd();
    out_pos = new CVec4(to_viewPos.xyz, 1.0);
    var N = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref, sam2DCount);
    out_nor = new CVec4(MappingV3ToTex(N), 1.0);
    out_color = L_cor;
    var lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    out_spc = lmaterial;
}
function vs_main_shadow_write(f3_ver, f4_wi, f4_we, f2_uv) {
    BranchBegin("codi", "C", [texCodi]);
    to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);
    BranchDefault();
    to_uv.xy = f2_uv;
    BranchEnd();
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    var woweMat = GetWorldWeightMat(weightArrMat, weightBakeMat, weightBakeIndex, f4_we, f4_wi, wMat, skin);
    var svm = new CMat(0);
    var spm = new CMat(0);
    if (shadowWrite.x < SDF.eShadow.Cas0 + 0.5) {
        svm = Sam2DToMat(shadowNearCasV0, shadowWrite.y);
        spm = Sam2DToMat(shadowFarCasP0, shadowWrite.y);
    }
    else if (shadowWrite.x < SDF.eShadow.Cas1 + 0.5) {
        svm = Sam2DToMat(shadowTopCasV1, shadowWrite.y);
        spm = Sam2DToMat(shadowBottomCasP1, shadowWrite.y);
    }
    else if (shadowWrite.x < SDF.eShadow.Cas2 + 0.5) {
        svm = Sam2DToMat(shadowLeftCasV2, shadowWrite.y);
        spm = Sam2DToMat(shadowRightCasP2, shadowWrite.y);
    }
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, woweMat);
    BranchBegin("wind", "W", [windInfluence, windDir, windPos, windInfo, windCount, time]);
    P = ApplyWind(P, skin, f4_we, time);
    BranchEnd();
    P = V4MulMatCoordi(P, svm);
    to_viewPos = P;
    P = V4MulMatCoordi(P, spm);
    out_position = P;
}
function ps_main_shadow_write() {
    var L_cor = Sam2DToColor(0.0, to_uv);
    BranchBegin("CAModel", "CA", [colorModel, alphaModel]);
    L_cor = CAModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "VFX", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, to_uv, to_uv, colorVFX, time);
    BranchEnd();
    BranchBegin("alphaCut", "A", [alphaCut]);
    if (L_cor.a < alphaCut)
        discard;
    BranchEnd();
    out_color = to_viewPos;
}
function vs_main_shadow_read(f3_ver, f4_wi, f4_we, f2_uv, f3_nor, f4_tan, f3_bi, f3_ref) {
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    var woweMat = GetWorldWeightMat(weightArrMat, weightBakeMat, weightBakeIndex, f4_we, f4_wi, wMat, skin);
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, woweMat);
    BranchBegin("wind", "W", [windInfluence, windDir, windPos, windInfo, windCount, time]);
    P = ApplyWind(P, skin, f4_we, time);
    BranchEnd();
    to_worldPos = P;
    to_normal = V3Nor(V3MulMat3Normal(f3_nor, TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
    BranchBegin("codi", "C", [texCodi]);
    to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);
    BranchDefault();
    to_uv.xy = f2_uv;
    BranchEnd();
    to_tangent = V3Nor(V3MulMat3Normal(f4_tan.xyz, Mat4ToMat3(woweMat)).xyz);
    to_binormal = V3Nor(V3MulMat3Normal(f3_bi, Mat4ToMat3(woweMat)).xyz);
    if (f3_ref.y > 0.0) {
        to_normal = V3Nor(V3MulMat3Normal(f3_nor, Mat4ToMat3(woweMat)).xyz);
    }
    else {
        to_normal = V3Nor(V3MulMat3Normal(f3_nor, TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
    }
    to_ref = f3_ref;
    P = V4MulMatCoordi(P, viewMat);
    out_position = V4MulMatCoordi(P, projectMat);
}
function ps_main_shadow_read() {
    var world = to_worldPos;
    var uv = to_uv;
    var uvh;
    var pAll = 1.0;
    var worldLigDir;
    var worldNormal;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uvh = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, world, camPos, to_ref);
    uv = uvh.xy;
    world.xyz -= V3MulFloat(V3Nor(V3SubV3(camPos, world.xyz)), V3Len(new CVec3(V2SubV2(uvh.xy, to_uv), parallaxNormal * uvh.z)) / max(length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)), length(abs(dFdy(to_uv))) / length(dFdy(world.xyz))));
    worldNormal = Sam2DToColor(to_ref.y, uv);
    worldNormal.xyz = MappingTexToV3(worldNormal.xyz);
    worldNormal.y = -worldNormal.y;
    pAll = 0.0;
    for (var i = 0; i < FloatToInt(shadowCount); i++) {
        worldLigDir = Sam2DToV4(ligDir, Sam2DToV4(shadowReadList, i).x);
        if (worldLigDir.w < 1.5) {
            worldLigDir.xyz = V3MulMat3Normal(V3Nor(worldLigDir.xyz), TransposeMat3(V3ToMat3(to_tangent, to_binormal, to_normal))).xyz;
            if (V3Dot(worldNormal.xyz, worldLigDir.xyz) > 0.0) {
                pAll += calcParallaxShadow(to_ref.y, uv, worldLigDir.xyz, parallaxNormal);
            }
            else {
                pAll += 1.0;
            }
        }
    }
    pAll /= shadowCount;
    if (pAll < 0.0)
        pAll = 0.0;
    BranchEnd();
    var L_cor = Sam2DToColor(0.0, uv);
    BranchBegin("CAModel", "CA", [colorModel, alphaModel]);
    L_cor = CAModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "VFX", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, to_uv, to_uv, colorVFX, time);
    BranchEnd();
    BranchBegin("alphaCut", "A", [alphaCut]);
    if (L_cor.a < alphaCut)
        discard;
    BranchEnd();
    var all = 0.0;
    for (var i = 0; i < FloatToInt(shadowCount); i++) {
        var shadowRead = Sam2DToV4(shadowReadList, i);
        var sVal = calcShadow(shadowRead, IntToFloat(i), to_normal, world);
        all += sVal;
    }
    all /= shadowCount;
    if (all < 0.0)
        all = 0.0;
    all = min(all, pAll);
    out_color = new CVec4(all, all, all, 1.0);
}
function ps_main_bake() {
    var uv = to_uv;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref).xy;
    BranchEnd();
    var L_cor = Sam2DToColor(to_ref.x, uv);
    BranchBegin("CAModel", "CA", [colorModel, alphaModel]);
    L_cor = CAModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "VFX", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, to_uv, to_uv, colorVFX, time);
    BranchEnd();
    BranchBegin("alphaCut", "A", [alphaCut]);
    if (L_cor.a < alphaCut)
        discard;
    BranchEnd();
    var N = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref);
    var shadow = -1.0;
    var i = 0.0;
    BranchBegin("shadow", "S", [shadowNearCasV0, shadowFarCasP0, shadowTopCasV1, shadowBottomCasP1, shadowLeftCasV2, shadowRightCasP2, shadowWrite, shadowCount, shadowPointProj, shadowReadList, ligDir, shadowRate, texture16f, bias, normalBias, PCF, jitter]);
    if (shadowCount > 0.5) {
        shadow = 0.0;
        for (; i < shadowCount; i++) {
            shadow += calcShadow(Sam2DToV4(shadowReadList, i), i, N, to_worldPos);
        }
        shadow /= shadowCount;
        if (shadow < 0.0)
            shadow = 0.0;
    }
    BranchEnd();
    var dseMat = new CMat3(0);
    BranchBegin("light", "L", [ligDir, ligCol, ligCount, camPos, material, ligStep0, ligStep1, ligStep2, ligStep3, envCube, ambientColor]);
    if (to_ref.z > 0.5 && material.w > 0.5) {
        dseMat = LightCac3D(camPos, to_worldPos, L_cor, N, shadow, Sam2DToColor(to_ref.z, uv).x, Sam2DToColor(to_ref.z, uv).y, Sam2DToColor(to_ref.z, uv).z, ambientColor);
    }
    else {
        dseMat = LightCac3D(camPos, to_worldPos, L_cor, N, shadow, material.x, material.y, material.z, ambientColor);
    }
    L_cor.rgb = V3AddV3(dseMat[0], dseMat[1]);
    BranchDefault();
    if (shadow > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow);
    }
    BranchEnd();
    out_color = L_cor;
}
