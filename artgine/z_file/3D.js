import { Build, CMat, CVec2, CVec3, CVec4, CMat3, InverseMat3, LWVPMul, discard, screenPos, MappingV3ToTex, Mat4ToMat3, MatAdd, MatMul, FloatMulMat, TransposeMat3, MatTypeToMat, Sam2DToColor, Sam2DToMat, Sam2DArrMat, Sam2D0ToColor, Sam2DArrToMat, clamp, floor, min, abs, max, dFdy, dFdx, length, SaturateFloat, smoothstep, V2SubV2, V2MulFloat, V2DivV2, V2AddV2, V2Len, V3AddV3, V3Dot, V3Nor, V3MulFloat, V3MulMat3Normal, V3ToMat3, V3Len, V3Mix, V3SubV3, SaturateV3, V3Cross, V3Sqrt, V3MulV3, V4MulMatCoordi, V4Min, ParallaxNormal, FloatToInt, IntToFloat, MappingTexToV3, BranchBegin, BranchEnd, BranchDefault, Attribute, Null, Sam2DArrToV4, V4Dot, TransposeMat4, } from "./Shader";
import { SDF } from "./SDF";
import { VFXDown2, GetTexCodiedUV, VFX, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, ColorModalFun, AlphaModalFun, vfxMat0, vfxMat1 } from "./ColorFun";
import { ambientColor, envmapOn, GetMaterial, GetSunInfo, ligCol, ligCount, ligDir, LightCac3D, ligMask, ligStep0, ligStep1, ligStep2, ligStep3, material, cullMask, sam2DCount, samCubeCount } from "./Light";
import { ApplyWind, windCount, windDir, windInfluence, windInfo, windPos } from "./Wind";
import { bias, normalBias, PCF, shadowCount, shadowOn, shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow, shadowRate, shadowReadList, shadowWrite, texture16f, jitter, CalcShadow, CalcParallaxShadow, shadowInfoList, shadowCascadeDataList, shadowNear, shadowFar, shadowTop, shadowBottom, shadowLeft, shadowRight, shadowDivideList, PCFStep } from "./Shadow";
import { NoiseGet, NoiseNormalGet } from "./Noise";
import { exposure, Tonemap, tonemappingType } from "./ToneMapping";
var screenDepth;
var colorModel = Null();
var alphaModel = Null();
var texCodi = Null();
var screenSize;
var skin = Null();
var parallaxNormal = Attribute(0, "canvas");
var alphaCut = 0.01;
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
var outputType = SDF.eGBuf.Albedo;
var camPos = Null();
var depthMap = 0.0;
var screenResolution = new CVec2(1.0, 1.0);
var weightArrMat = new Sam2DArrMat(1, SDF.eUni.MatSkin);
var weightBakeMat = 9.0;
var weightBakeIndex;
var time = Attribute(0, "time");
var waterDeep = new CVec4(0.0, 0.0, 0.0, 0.0);
var shallowColor = new CVec3(0.0, 0.0, 0.0);
var deepColor = new CVec3(0.0, 0.1, 0.5);
var causticFlowDir = new CVec2(0.0, 0.0);
var causticFlowFreq = 1.0;
var waterHeight = 1.0;
var waterUnderFadeDist = new CVec2(2000.0, 3000.0);
var normalflowDir = new CVec2(0.0, 0.0);
var normalRange = 1.0;
Build("Artgine/Shader/3DSkin", [], vs_main, [
    worldMat, viewMat, projectMat, skin, sam2DCount
], [out_position, to_uv, to_normal, to_binormal, to_tangent, to_ref, to_worldPos], ps_main, [out_color]);
Build("Artgine/Shader/3DSimple", ["simple"], vs_main_simple, [
    worldMat, viewMat, projectMat
], [out_position, to_uv], ps_main_simple, [out_color]);
Build("Artgine/Shader/3DGBuffer", ["gBuf"], vs_main_gBuffer, [
    worldMat, viewMat, projectMat, skin,
    sam2DCount,
    outputType, material, cullMask
], [out_position, to_uv, to_normal, to_binormal, to_tangent, to_ref, to_worldPos, to_viewPos], ps_main_gBuffer, [out_color, out_pos, out_nor, out_spc]);
Build("Artgine/Shader/3DShadowWrite", ["shadowWrite"], vs_main_shadow_write, [
    worldMat, viewMat, projectMat, skin,
    shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow,
    shadowReadList, shadowInfoList, shadowCascadeDataList, shadowDivideList,
    shadowWrite, shadowCount,
], [out_position, to_uv, to_viewPos], ps_main_shadow_write, [out_color]);
Build("Artgine/Shader/3DShadowRead", ["shadowRead"], vs_main_shadow_read, [
    worldMat, viewMat, projectMat, skin,
    shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow,
    shadowReadList, shadowInfoList, shadowCascadeDataList, shadowDivideList,
    shadowWrite, shadowCount,
    shadowRate, PCF, PCFStep, texture16f, bias, normalBias, jitter,
    ligDir, ligCol, ligMask, ligCount, cullMask,
    camPos
], [out_position, to_uv, to_normal, to_worldPos, to_binormal, to_tangent, to_ref, to_viewPos], ps_main_shadow_read, [out_color]);
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
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    if (L_cor.a <= 0.01)
        discard;
    out_color = L_cor;
}
function GetWorldWeightMat(_weightArrMat, _weightBakeArrMat, _index, _weight, _weightIndex, _worldMat, _skin) {
    var woweMat = _worldMat;
    if (_skin > 0.5 && _weight.x + _weight.y + _weight.z + _weight.w > 0.0) {
        if (_skin < SDF.eSkin.Bone + 0.5 && _weightArrMat.x > 0.0) {
            var weightMat = FloatMulMat(_weight.x, Sam2DArrToMat(_weightArrMat, _weightIndex.x));
            weightMat = MatAdd(FloatMulMat(_weight.y, Sam2DArrToMat(_weightArrMat, _weightIndex.y)), weightMat);
            weightMat = MatAdd(FloatMulMat(_weight.z, Sam2DArrToMat(_weightArrMat, _weightIndex.z)), weightMat);
            weightMat = MatAdd(FloatMulMat(_weight.w, Sam2DArrToMat(_weightArrMat, _weightIndex.w)), weightMat);
            woweMat = MatMul(weightMat, woweMat);
        }
        else if (_skin < SDF.eSkin.Bake + 0.5 && _index > -0.5) {
            var st = floor(_index);
            var ed = st + 1.0;
            var weightSTMat = FloatMulMat(_weight.x, Sam2DToMat(new CVec2(_weightBakeArrMat, st), _weightIndex.x));
            if (_weight.y > 0.0) {
                weightSTMat = MatAdd(FloatMulMat(_weight.y, Sam2DToMat(new CVec2(_weightBakeArrMat, st), _weightIndex.y)), weightSTMat);
                if (_weight.z > 0.0) {
                    weightSTMat = MatAdd(FloatMulMat(_weight.z, Sam2DToMat(new CVec2(_weightBakeArrMat, st), _weightIndex.z)), weightSTMat);
                    if (_weight.w > 0.0) {
                        weightSTMat = MatAdd(FloatMulMat(_weight.w, Sam2DToMat(new CVec2(_weightBakeArrMat, st), _weightIndex.w)), weightSTMat);
                    }
                }
            }
            woweMat = MatMul(weightSTMat, woweMat);
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
        if (V3Dot(N, new CVec3(0, 0, 1)) > 0.999)
            N = _nor;
        else
            N = V3Nor(V3MulMat3Normal(N, TBN).xyz);
    }
    return N;
}
function vs_main(f3_ver, f2_uv, f4_we, f4_wi, f3_nor, f4_tan, f3_ref) {
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
    var woweMat = wMat;
    BranchBegin("weightMat", "WG", [weightArrMat, weightBakeMat, weightBakeIndex]);
    woweMat = GetWorldWeightMat(weightArrMat, weightBakeMat, weightBakeIndex, f4_we, f4_wi, wMat, skin);
    BranchEnd();
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
    var nMat3;
    if (f3_ref.y > 0.0)
        nMat3 = Mat4ToMat3(woweMat);
    else
        nMat3 = TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)));
    to_normal = V3Nor(V3MulMat3Normal(f3_nor, nMat3).xyz);
    to_tangent = V3Nor(V3MulMat3Normal(f4_tan.xyz, nMat3).xyz);
    to_tangent = V3Nor(V3SubV3(to_tangent, V3MulFloat(to_normal, V3Dot(to_normal, to_tangent))));
    to_binormal = V3Nor(V3MulFloat(V3Cross(to_normal, to_tangent), f4_tan.w));
    to_ref = f3_ref;
}
function vs_main_gBuffer(f3_ver, f2_uv, f4_wi, f4_we, f3_nor, f4_tan, f3_ref) {
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
    var woweMat = wMat;
    BranchBegin("weightMat", "WG", [weightArrMat, weightBakeMat, weightBakeIndex]);
    woweMat = GetWorldWeightMat(weightArrMat, weightBakeMat, weightBakeIndex, f4_we, f4_wi, wMat, skin);
    BranchEnd();
    var nMat3;
    if (f3_ref.y > 0.0) {
        nMat3 = Mat4ToMat3(woweMat);
    }
    else {
        nMat3 = TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)));
    }
    to_normal = V3Nor(V3MulMat3Normal(f3_nor, nMat3).xyz);
    to_tangent = V3Nor(V3MulMat3Normal(f4_tan.xyz, nMat3).xyz);
    to_tangent = V3Nor(V3SubV3(to_tangent, V3MulFloat(to_normal, V3Dot(to_normal, to_tangent))));
    to_binormal = V3Nor(V3MulFloat(V3Cross(to_normal, to_tangent), f4_tan.w));
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
function Remap(_val, _min1, _max1, _min2, _max2) {
    return _min2 + (_val - _min1) / (_max1 - _min1) * (_max2 - _min2);
}
function SampleNormalMapToCaustic(_uvw, _ligCol) {
    var normal = NoiseNormalGet(_uvw, SDF.eNoise.PerlinNormal);
    normal = V3Nor(new CVec3(normal.x / 10.0, normal.y, normal.z / 10.0));
    var L = new CVec3(0.0, 1.0, 0.0);
    var NdotL = max(0.0, V3Dot(normal, L));
    var curRange = 0.0001 * causticFlowFreq;
    var threshold = 1.0 - curRange;
    var b = clamp(Remap(NdotL, threshold, 1.0, 0.0, 0.2), 0.0, 1.0);
    return V3MulFloat(_ligCol, b);
}
function SampleCaustics(_uvw, _split, _ligDir, _ligCol) {
    var angleWeight = clamp(1.0 / (_ligDir.y + 0.1), 1.0, 5.0);
    var dynamicSplit = _split * angleWeight;
    var xzLen = V2Len(new CVec2(_ligDir.x, _ligDir.z));
    var offsetDir = (xzLen < 0.0001) ? new CVec2(1.0, 1.0) : new CVec2(_ligDir.x / xzLen, _ligDir.z / xzLen);
    var uvw1 = new CVec3(V2AddV2(_uvw.xy, V2MulFloat(offsetDir, dynamicSplit)), _uvw.z);
    var uvw2 = new CVec3(_uvw.xy, _uvw.z);
    var uvw3 = new CVec3(V2AddV2(_uvw.xy, V2MulFloat(offsetDir, -dynamicSplit)), _uvw.z);
    var r = SampleNormalMapToCaustic(uvw1, _ligCol).x;
    var g = SampleNormalMapToCaustic(uvw2, _ligCol).y;
    var b = SampleNormalMapToCaustic(uvw3, _ligCol).z;
    return new CVec3(r, g, b);
}
function Caustics(_world, _flowDir, _ligDir, _ligCol) {
    if (V2Len(_flowDir) == 0.0)
        return new CVec3(0.0, 0.0, 0.0);
    var flow = new CVec3(-causticFlowDir.x / max(V2Len(causticFlowDir), 1e-6), causticFlowDir.y / max(V2Len(causticFlowDir), 1e-6), V2Len(causticFlowDir) * time * 0.1);
    var split = 1.0 / 1000.0;
    var worldToUV = V3MulFloat(_world, split);
    var L = new CVec3(0, 1, 0);
    var refractOffset = new CVec2(L.x, L.z);
    refractOffset = V2MulFloat(refractOffset, -0.2);
    var uvw = new CVec3(V2AddV2(new CVec2(worldToUV.x + refractOffset.x, worldToUV.z + refractOffset.y), V2MulFloat(flow.xy, flow.z)), flow.z * 3.0);
    var tex = SampleCaustics(uvw, 1.0 / 128.0, L, _ligCol);
    return SaturateV3(tex);
}
function WaterProcessing(_color, _caustics, _world) {
    var heightDiff = abs(waterDeep.x - _world.y);
    var depthBlend = 1.0 - SaturateFloat(heightDiff / waterDeep.y);
    var dist = V3Len(V3SubV3(camPos, _world.xyz));
    var t = smoothstep(waterUnderFadeDist.x, waterUnderFadeDist.y, dist);
    var luma = (_color.x * 0.299 + _color.y * 0.587 + _color.z * 0.114);
    var foamThreshold = min(waterDeep.z, waterDeep.z * waterHeight);
    var foamMask = 1.0 - smoothstep(0.0, foamThreshold, heightDiff);
    _color = V3Mix(deepColor, V3Mix(_color, shallowColor, 0.1), depthBlend);
    _caustics = V3MulFloat(_caustics, depthBlend * luma * (1.0 - foamMask));
    _color = V3AddV3(_color, _caustics);
    _color = V3Mix(deepColor, _color, 0.6 * (1.0 - t));
    if (foamMask > 0.0) {
        var foam = new CVec3(0.55, 0.58, 0.58);
        var noise = NoiseGet(new CVec3(_world.x / 300.0 - normalflowDir.x * time * 0.1, _world.z / 300.0 + normalflowDir.y * time * 0.1, 0.0), SDF.eNoise.Perlin);
        var edgeFade = foamMask * smoothstep(0.25, 1.0, noise);
        _color = V3AddV3(_color, V3MulFloat(foam, 0.35 * edgeFade));
        _color = V3Mix(_color, foam, 0.4 * edgeFade);
    }
    return _color;
}
function ps_main() {
    var shadow = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow", "S", [shadowOn, screenSize]);
    if (shadowOn > 0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, V2DivV2(screenPos.xy, screenSize.xy));
    }
    BranchEnd();
    var world = to_worldPos;
    var uv = to_uv;
    var uvh;
    var ratio;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uvh = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
    uv = uvh.xy;
    world.xyz = V3SubV3(world.xyz, V3MulFloat(V3Nor(V3SubV3(camPos, world.xyz)), V3Len(new CVec3(V2SubV2(uvh.xy, to_uv), parallaxNormal * uvh.z)) / max(length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)), length(abs(dFdy(to_uv))) / length(dFdy(world.xyz)))));
    if (parallaxNormal > 0.0001) {
        ratio = V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])));
        screenDepth = SDF.ClipControl > 0
            ? clamp(screenPos.z * ratio, 0.0, 1.0)
            : clamp(((screenPos.z * 2.0 - 1.0) * ratio) * 0.5 + 0.5, 0.0, 1.0);
    }
    BranchEnd();
    var normal = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref, sam2DCount);
    var L_cor;
    BranchBegin("vfx", "VFX", [VFX, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, time, vfxMat0, vfxMat1]);
    L_cor = VFXDown2(uv, VFX, time, world);
    BranchDefault();
    L_cor = Sam2DToColor(to_ref.x, uv);
    BranchEnd();
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    BranchBegin("alphaCut", "AC", [alphaCut]);
    if (L_cor.a <= alphaCut)
        discard;
    BranchDefault();
    if (L_cor.a <= 0.01)
        discard;
    BranchEnd();
    var dseMat = new CMat3(0);
    var lmaterial = new CVec4(1.0, 1.0, 1.0, 1.0);
    var sunDir = new CVec3(0.0, 1.0, 0.0);
    var sunCol = new CVec3(1.0, 1.0, 1.0);
    var gamma = 1.0;
    BranchBegin("light", "L", [ligDir, ligCol, ligMask, ligCount, camPos, material, cullMask, ligStep0, ligStep1, ligStep2, ligStep3, ambientColor, envmapOn, sam2DCount, samCubeCount]);
    gamma = 2.2;
    L_cor.rgb = V3MulV3(L_cor.rgb, L_cor.rgb);
    lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    dseMat = GetSunInfo();
    sunDir = dseMat[0];
    sunCol = dseMat[1];
    dseMat = LightCac3D(camPos, to_worldPos, L_cor, normal, shadow, lmaterial.y, lmaterial.x, lmaterial.z, cullMask.x);
    L_cor.rgb = V3AddV3(dseMat[0], dseMat[1]);
    BranchDefault();
    if (shadow.a > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.r);
    }
    BranchEnd();
    out_color = L_cor;
    BranchBegin("tonemapping", "tonemapping", [exposure, tonemappingType]);
    out_color.rgb = Tonemap(out_color.rgb, exposure, tonemappingType);
    BranchEnd();
    if (gamma > 1.1) {
        out_color.rgb = V3Sqrt(out_color.rgb);
    }
    BranchBegin("waterReflect", "waterReflect", [waterDeep]);
    if (world.y <= waterDeep.x)
        discard;
    BranchEnd();
    var caustics;
    BranchBegin("waterRefract", "waterRefract", [waterDeep, waterUnderFadeDist, shallowColor, deepColor, causticFlowDir, causticFlowFreq, waterHeight, camPos, time, normalflowDir, normalRange]);
    if (world.y > waterDeep.x + waterDeep.z)
        discard;
    caustics = Caustics(world.xyz, causticFlowDir, sunDir, sunCol);
    out_color.rgb = WaterProcessing(out_color.rgb, caustics, world);
    BranchEnd();
}
function ps_main_gBuffer() {
    var uv = to_uv;
    var world = to_worldPos;
    var view = to_viewPos;
    var uvh;
    var ratio;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uvh = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
    uv = uvh.xy;
    world.xyz = V3SubV3(world.xyz, V3MulFloat(V3Nor(V3SubV3(camPos, world.xyz)), V3Len(new CVec3(V2SubV2(uvh.xy, to_uv), parallaxNormal * uvh.z)) / max(length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)), length(abs(dFdy(to_uv))) / length(dFdy(world.xyz)))));
    view.xyz = V4MulMatCoordi(world, viewMat).xyz;
    if (parallaxNormal > 0.0001) {
        ratio = V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])));
        screenDepth = SDF.ClipControl > 0
            ? clamp(screenPos.z * ratio, 0.0, 1.0)
            : clamp(((screenPos.z * 2.0 - 1.0) * ratio) * 0.5 + 0.5, 0.0, 1.0);
    }
    BranchEnd();
    var L_cor;
    BranchBegin("vfx", "VFX", [VFX, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, time, vfxMat0, vfxMat1]);
    L_cor = VFXDown2(uv, VFX, time, world);
    BranchDefault();
    if (sam2DCount == 1.0)
        L_cor = Sam2DToColor(0.0, uv);
    else
        L_cor = Sam2DToColor(to_ref.x, uv);
    BranchEnd();
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    BranchBegin("alphaCut", "AC", [alphaCut]);
    if (L_cor.a <= alphaCut)
        discard;
    BranchDefault();
    if (L_cor.a <= 0.01)
        discard;
    BranchEnd();
    out_pos = new CVec4(view.xyz, cullMask.x);
    var N = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref, sam2DCount);
    out_nor = new CVec4(MappingV3ToTex(N), 1.0);
    var lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    out_spc = lmaterial;
    if (outputType < SDF.eGBuf.Albedo + 0.5) {
        out_color = L_cor;
    }
    else if (outputType < SDF.eGBuf.Position + 0.5) {
        out_color = out_pos;
    }
    else if (outputType < SDF.eGBuf.Normal + 0.5) {
        out_color = out_nor;
    }
    else if (outputType < SDF.eGBuf.SpeculerPowEmissive + 0.5) {
        out_color = out_spc;
    }
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
    var woweMat = wMat;
    BranchBegin("weightMat", "WG", [weightArrMat, weightBakeMat, weightBakeIndex]);
    woweMat = GetWorldWeightMat(weightArrMat, weightBakeMat, weightBakeIndex, f4_we, f4_wi, wMat, skin);
    BranchEnd();
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, woweMat);
    BranchBegin("wind", "W", [windInfluence, windDir, windPos, windInfo, windCount, time]);
    P = ApplyWind(P, skin, f4_we, time);
    BranchEnd();
    var zRow;
    var spvm;
    BranchBegin("PointLightShadowV", "PLSV", [shadowNear, shadowFar, shadowTop, shadowBottom, shadowLeft, shadowRight]);
    if (shadowWrite.x < SDF.eShadow.Near + 0.5)
        spvm = Sam2DArrToMat(shadowNear, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Far + 0.5)
        spvm = Sam2DArrToMat(shadowFar, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Top + 0.5)
        spvm = Sam2DArrToMat(shadowTop, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Bottom + 0.5)
        spvm = Sam2DArrToMat(shadowBottom, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Left + 0.5)
        spvm = Sam2DArrToMat(shadowLeft, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Right + 0.5)
        spvm = Sam2DArrToMat(shadowRight, shadowWrite.y);
    to_viewPos = P;
    BranchDefault();
    if (shadowWrite.x < SDF.eShadow.Cas0 + 0.5) {
        zRow = Sam2DArrToV4(shadowCas0VPMatWithZRow, shadowWrite.y * 4.0 + 3.0);
        spvm = TransposeMat4(new CMat(Sam2DArrToV4(shadowCas0VPMatWithZRow, shadowWrite.y * 4.0 + 0.0), Sam2DArrToV4(shadowCas0VPMatWithZRow, shadowWrite.y * 4.0 + 1.0), Sam2DArrToV4(shadowCas0VPMatWithZRow, shadowWrite.y * 4.0 + 2.0), new CVec4(0.0, 0.0, 0.0, 1.0)));
    }
    else if (shadowWrite.x < SDF.eShadow.Cas1 + 0.5) {
        zRow = Sam2DArrToV4(shadowCas1VPMatWithZRow, shadowWrite.y * 4.0 + 3.0);
        spvm = TransposeMat4(new CMat(Sam2DArrToV4(shadowCas1VPMatWithZRow, shadowWrite.y * 4.0 + 0.0), Sam2DArrToV4(shadowCas1VPMatWithZRow, shadowWrite.y * 4.0 + 1.0), Sam2DArrToV4(shadowCas1VPMatWithZRow, shadowWrite.y * 4.0 + 2.0), new CVec4(0.0, 0.0, 0.0, 1.0)));
    }
    else if (shadowWrite.x < SDF.eShadow.Cas2 + 0.5) {
        zRow = Sam2DArrToV4(shadowCas2VPMatWithZRow, shadowWrite.y * 4.0 + 3.0);
        spvm = TransposeMat4(new CMat(Sam2DArrToV4(shadowCas2VPMatWithZRow, shadowWrite.y * 4.0 + 0.0), Sam2DArrToV4(shadowCas2VPMatWithZRow, shadowWrite.y * 4.0 + 1.0), Sam2DArrToV4(shadowCas2VPMatWithZRow, shadowWrite.y * 4.0 + 2.0), new CVec4(0.0, 0.0, 0.0, 1.0)));
    }
    else if (shadowWrite.x < SDF.eShadow.Cas3 + 0.5) {
        zRow = Sam2DArrToV4(shadowCas3VPMatWithZRow, shadowWrite.y * 4.0 + 3.0);
        spvm = TransposeMat4(new CMat(Sam2DArrToV4(shadowCas3VPMatWithZRow, shadowWrite.y * 4.0 + 0.0), Sam2DArrToV4(shadowCas3VPMatWithZRow, shadowWrite.y * 4.0 + 1.0), Sam2DArrToV4(shadowCas3VPMatWithZRow, shadowWrite.y * 4.0 + 2.0), new CVec4(0.0, 0.0, 0.0, 1.0)));
    }
    to_viewPos = new CVec4(0.0, 0.0, V4Dot(zRow, P), 1.0);
    BranchEnd();
    out_position = V4MulMatCoordi(P, spvm);
    out_position.z = min(out_position.z, out_position.w);
}
function ps_main_shadow_write() {
    var L_cor = Sam2DToColor(0.0, to_uv);
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    BranchBegin("alphaCut", "AC", [alphaCut]);
    if (L_cor.a <= alphaCut)
        discard;
    BranchDefault();
    if (L_cor.a <= 0.01)
        discard;
    BranchEnd();
    var shadowInfo;
    var lDir;
    BranchBegin("PointLightShadowF", "PLSF", [ligDir]);
    shadowInfo = Sam2DArrToV4(shadowInfoList, shadowWrite.y);
    lDir = Sam2DArrToV4(ligDir, shadowInfo.x);
    out_color.b = (V3Len(V3SubV3(to_viewPos.xyz, lDir.xyz)) - shadowInfo.z) / (shadowInfo.w - shadowInfo.z);
    out_color.a = 1.0;
    BranchDefault();
    out_color = to_viewPos;
    BranchEnd();
}
function vs_main_shadow_read(f3_ver, f4_wi, f4_we, f2_uv, f3_nor, f4_tan, f3_bi, f3_ref) {
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    var woweMat = wMat;
    BranchBegin("weightMat", "WG", [weightArrMat, weightBakeMat, weightBakeIndex]);
    woweMat = GetWorldWeightMat(weightArrMat, weightBakeMat, weightBakeIndex, f4_we, f4_wi, wMat, skin);
    BranchEnd();
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
    to_viewPos = P;
    out_position = V4MulMatCoordi(P, projectMat);
}
function ps_main_shadow_read() {
    var temp;
    var outputIndex;
    var uv = to_uv;
    var world = to_worldPos;
    var pShadow = new CVec4(1.0, 1.0, 1.0, 1.0);
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    temp = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, world, camPos, to_ref);
    uv = temp.xy;
    world.xyz = V3SubV3(world.xyz, V3MulFloat(V3Nor(V3SubV3(camPos, world.xyz)), V3Len(new CVec3(V2SubV2(temp.xy, to_uv), parallaxNormal * temp.z)) / max(length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)), length(abs(dFdy(to_uv))) / length(dFdy(world.xyz)))));
    if (parallaxNormal > 0.0001) {
        temp.x = V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])));
        screenDepth = SDF.ClipControl > 0
            ? clamp(screenPos.z * temp.x, 0.0, 1.0)
            : clamp(((screenPos.z * 2.0 - 1.0) * temp.x) * 0.5 + 0.5, 0.0, 1.0);
        outputIndex = 0.0;
        pShadow = new CVec4(0.0, 0.0, 0.0, 0.0);
        for (var i = 0; i < SDF.TexSizeMax; ++i) {
            if (i >= FloatToInt(shadowCount))
                break;
            pShadow[FloatToInt(outputIndex)] += CalcParallaxShadow(IntToFloat(i), world, uv, to_ref, parallaxNormal, to_tangent, to_binormal, to_normal);
            outputIndex = min(outputIndex + 1.0, 3.0);
        }
        pShadow.a /= max(shadowCount - 3.0, 1.0);
    }
    BranchEnd();
    var L_cor;
    BranchBegin("vfx", "VFX", [VFX, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, time, vfxMat0, vfxMat1]);
    L_cor = VFXDown2(uv, VFX, time, world);
    BranchDefault();
    L_cor = Sam2DToColor(0.0, uv);
    BranchEnd();
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    BranchBegin("alphaCut", "AC", [alphaCut]);
    if (L_cor.a <= alphaCut)
        discard;
    BranchDefault();
    if (L_cor.a <= 0.01)
        discard;
    BranchEnd();
    var dShadow = new CVec4(1.0, 1.0, 1.0, 1.0);
    BranchBegin("shadowMulti", "SDM", []);
    outputIndex = 0.0;
    dShadow = new CVec4(0.0, 0.0, 0.0, 0.0);
    for (var i = 0; i < SDF.TexSizeMax; ++i) {
        if (i >= FloatToInt(shadowCount))
            break;
        dShadow[FloatToInt(outputIndex)] += CalcShadow(IntToFloat(i), to_normal, world, camPos, to_viewPos.xyz);
        outputIndex = min(outputIndex + 1.0, 3.0);
    }
    dShadow.a /= max(shadowCount - 3.0, 1.0);
    BranchDefault();
    dShadow.r = CalcShadow(0.0, to_normal, world, camPos, to_viewPos.xyz);
    dShadow.rgb = new CVec3(dShadow.r, dShadow.r, dShadow.r);
    dShadow.a = 1.0;
    BranchEnd();
    out_color = V4Min(dShadow, pShadow);
}
