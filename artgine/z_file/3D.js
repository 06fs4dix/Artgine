import { Build, CMat, CVec2, CVec3, CVec4, CMat3, InverseMat3, LWVPMul, discard, screenPos, MappingV3ToTex, Mat4ToMat3, MatAdd, MatMul, FloatMulMat, TransposeMat3, Sam2DToColor, Sam2DToMat, Sam2DToV4, Sam2DMat, Sam2DSize, V2SubV2, V2MulFloat, V2DivV2, V3AddV3, V3Dot, V3Nor, V3MulFloat, V3MulMat3Normal, V3ToMat3, V4MulMatCoordi, ParallaxNormal, FloatToInt, IntToFloat, MappingTexToV3, BranchBegin, BranchEnd, BranchDefault, Attribute, Null, floor, mod, } from "./Shader";
import { SDF } from "./SDF";
import { ColorModelCac, ColorVFX } from "./ColorFun";
import { ambientColor, envCube, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "./Light";
import { ApplyWind, windCount, windDir, windInfluence, windInfo, windPos } from "./Wind";
import { bias, calcShadow, dotCac, normalBias, PCF, shadowCount, shadowOn, shadowBottomCasP1, shadowFarCasP0, shadowLeftCasV2, shadowNearCasV0, shadowRightCasP2, shadowTopCasV1, shadowPointProj, shadowRate, shadowReadList, shadowWrite, texture16f } from "./Shadow";
var colorModel = Null();
var alphaModel = Null();
var skin = Null();
var parallaxNormal = Attribute(0, "canvas");
var sam2DCount = Null();
var material = new CVec4(0.0, 0.0, 0.0, 1.0);
var alphaCut = 0.1;
var colorVFX = Null();
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
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
var weightArrMat = new Sam2DMat(9);
var time = Attribute(0, "time");
Build("3DSkin", [], vs_main, [worldMat, viewMat, projectMat, alphaCut, skin, weightArrMat], [out_position, to_uv, to_normal, to_binormal, to_tangent, to_ref, to_worldPos], ps_main, [out_color]);
Build("3DSimple", ["simple"], vs_main_simple, [worldMat, viewMat, projectMat, colorModel, alphaModel, alphaCut], [out_position, to_uv], ps_main_simple, [out_color]);
Build("3DGBuffer", ["gBuf"], vs_main_gBuffer, [
    worldMat, viewMat, projectMat, skin, weightArrMat, alphaCut,
    sam2DCount, material, outputType,
], [out_position, to_uv, to_normal, to_binormal, to_tangent, to_ref, to_worldPos, to_viewPos], ps_main_gBuffer, [out_color]);
Build("3DGBufferMulti", ["gBufMulti"], vs_main_gBuffer, [
    worldMat, viewMat, projectMat, skin, weightArrMat, alphaCut,
    sam2DCount, material,
], [out_position, to_uv, to_normal, to_binormal, to_tangent, to_ref, to_worldPos, to_viewPos], ps_main_gBuffer_multi, [out_color, out_pos, out_nor, out_spc]);
Build("3DShadowWrite", ["shadowWrite"], vs_main_shadow_write, [
    worldMat, viewMat, projectMat, skin, weightArrMat, alphaCut,
    shadowNearCasV0, shadowFarCasP0, shadowTopCasV1, shadowBottomCasP1, shadowLeftCasV2, shadowRightCasP2, shadowWrite,
    shadowCount, shadowPointProj, shadowReadList,
], [out_position, to_uv, to_viewPos], ps_main_shadow_write, [out_color]);
Build("3DShadowRead", ["shadowRead"], vs_main_shadow_read, [
    worldMat, viewMat, projectMat, skin, weightArrMat, alphaCut,
    shadowNearCasV0, shadowFarCasP0, shadowTopCasV1, shadowBottomCasP1, shadowLeftCasV2, shadowRightCasP2, shadowWrite,
    shadowCount, shadowPointProj, shadowReadList,
    shadowRate, PCF, texture16f, bias, normalBias, dotCac,
    ligDir, ligCol, ligCount,
], [out_position, to_uv, to_normal, to_worldPos], ps_main_shadow_read, [out_color]);
Build("3DBake", ["bake"], vs_main_bake, [
    worldMat, viewMat, projectMat, skin, weightArrMat, alphaCut
], [out_position, to_uv, to_normal, to_worldPos, to_tangent, to_binormal, to_ref], ps_main_bake, [out_color]);
function vs_main_simple(f3_ver, f2_uv) {
    to_uv = f2_uv;
    out_position = LWVPMul(f3_ver, worldMat, viewMat, projectMat);
}
function ps_main_simple() {
    var L_cor = Sam2DToColor(0.0, to_uv);
    L_cor = ColorModelCac(L_cor, colorModel, alphaModel);
    if (L_cor.a <= alphaCut)
        discard;
    out_color = L_cor;
}
function GetWorldWeightMat(_weightArrMat, _weight, _weightIndex, _worldMat, _skin) {
    var woweMat = _worldMat;
    if (_skin > 0.5 && _weight.x + _weight.y + _weight.z + _weight.w > 0.0) {
        if (_skin < SDF.eSkin.Bone + 0.5 && _weightArrMat.x > 0.0) {
            var weightMat = FloatMulMat(_weight.x, Sam2DToMat(_weightArrMat, _weightIndex.x));
            weightMat = MatAdd(FloatMulMat(_weight.y, Sam2DToMat(_weightArrMat, _weightIndex.y)), weightMat);
            weightMat = MatAdd(FloatMulMat(_weight.z, Sam2DToMat(_weightArrMat, _weightIndex.z)), weightMat);
            weightMat = MatAdd(FloatMulMat(_weight.w, Sam2DToMat(_weightArrMat, _weightIndex.w)), weightMat);
            woweMat = MatMul(weightMat, woweMat);
        }
    }
    return woweMat;
}
function GetParallaxMappedUV(_uv, _tan, _bi, _nor, _wor, _camPos, _texOff) {
    var uv = _uv;
    if (parallaxNormal > 0.0001) {
        var TBN = TransposeMat3(V3ToMat3(_tan, _bi, _nor));
        uv = ParallaxNormal(V3MulMat3Normal(_camPos, TBN).xyz, V3MulMat3Normal(_wor.xyz, TBN).xyz, _texOff.y, uv, parallaxNormal);
    }
    return uv;
}
function GetTangentSpaceNormal(_uv, _tan, _bi, _nor, _texOff) {
    var N = _nor;
    if (to_ref.y > 0.5) {
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
    to_uv = f2_uv;
    var woweMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, woweMat);
    BranchBegin("wind", "W", [windInfluence, windDir, windPos, windInfo, windCount, time]);
    P = ApplyWind(P, skin, f4_we, time);
    BranchEnd();
    to_worldPos = P;
    P = V4MulMatCoordi(P, viewMat);
    out_position = V4MulMatCoordi(P, projectMat);
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
    to_uv = f2_uv;
    to_ref = f3_ref;
    var woweMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);
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
    to_uv = f2_uv;
    var clip_space_pos = V2SubV2(V2MulFloat(f2_sha, 2.0), new CVec2(1.0, 1.0));
    out_position = new CVec4(clip_space_pos, 0.0, 1.0);
    var woweMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);
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
function ps_main() {
    var shadowTex = new CVec4(0.0, 0.0, 0.0, 0.0);
    var shadow = -1.0;
    var occlusion = 1.5;
    var high;
    var low;
    BranchBegin("shadow", "S", [shadowOn]);
    if (shadowOn > 0.5) {
        shadowTex = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
        shadow = shadowTex.x;
        high = shadowTex.y * 255.0;
        low = shadowTex.z * 255.0;
        occlusion = (high * 256.0 + low) / 65535.0;
    }
    BranchEnd();
    BranchBegin("occlusion", "O", []);
    if (occlusion < 1.1) {
        if (screenPos.z > occlusion + 2e-5)
            discard;
    }
    BranchEnd();
    var uv = to_uv;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
    BranchEnd();
    var L_cor = Sam2DToColor(to_ref.x, uv);
    BranchBegin("color", "C", [colorModel, alphaModel]);
    L_cor = ColorModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "V", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, uv, colorVFX, time);
    BranchEnd();
    if (L_cor.a < alphaCut)
        discard;
    var dseMat = new CMat3(0);
    BranchBegin("light", "L", [ligDir, ligCol, ligCount, camPos, material, ligStep0, ligStep1, ligStep2, ligStep3, envCube, ambientColor]);
    if (to_ref.z > 0.5 && material.w > 0.5) {
        dseMat = LightCac3D(camPos, to_worldPos, L_cor, GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref), shadow, Sam2DToColor(to_ref.z, uv).x, Sam2DToColor(to_ref.z, uv).y, Sam2DToColor(to_ref.z, uv).z, ambientColor);
    }
    else {
        dseMat = LightCac3D(camPos, to_worldPos, L_cor, GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref), shadow, material.x, material.y, material.z, ambientColor);
    }
    L_cor.rgb = V3AddV3(dseMat[0], dseMat[1]);
    BranchDefault();
    if (shadow > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow);
    }
    BranchEnd();
    out_color = L_cor;
}
function ps_main_gBuffer() {
    var tempShadow;
    var occlusion = 1.5;
    BranchBegin("occlusion", "O", [shadowOn]);
    if (shadowOn > 0.5) {
        tempShadow = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
        occlusion = (tempShadow.y * 255.0 * 256.0 + tempShadow.z * 255.0) / 65535.0;
        if (screenPos.z > occlusion + 2e-5)
            discard;
    }
    BranchEnd();
    var uv = to_uv;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
    BranchEnd();
    var L_cor;
    if (sam2DCount == 1.0)
        L_cor = Sam2DToColor(0.0, uv);
    else
        L_cor = Sam2DToColor(to_ref.x, uv);
    BranchBegin("color", "C", [colorModel, alphaModel]);
    L_cor = ColorModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "V", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, uv, colorVFX, time);
    BranchEnd();
    if (L_cor.a < alphaCut)
        discard;
    if (outputType < SDF.eGBuf.Position + 0.5) {
        out_color = new CVec4(to_viewPos.xyz, 0.5);
    }
    else if (outputType < SDF.eGBuf.Normal + 0.5) {
        var N = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref);
        out_color = new CVec4(MappingV3ToTex(N), 1.0);
    }
    else if (outputType < SDF.eGBuf.Albedo + 0.5) {
        out_color = L_cor;
    }
    else if (outputType < SDF.eGBuf.SpeculerPowEmissive + 0.5) {
        var texUse = material.w;
        if ((to_ref.z > 0.5 || sam2DCount >= 2.5) && texUse > 0.5) {
            L_cor = Sam2DToColor(to_ref.z, uv);
        }
        else {
            L_cor.xyz = material.xyz;
        }
        out_color = new CVec4(L_cor.x, L_cor.y, L_cor.z, 1.0);
    }
}
function ps_main_gBuffer_multi() {
    var tempShadow;
    var occlusion = 1.5;
    BranchBegin("occlusion", "O", [shadowOn]);
    if (shadowOn > 0.5) {
        tempShadow = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
        occlusion = (tempShadow.y * 255.0 * 256.0 + tempShadow.z * 255.0) / 65535.0;
        if (screenPos.z > occlusion + 2e-5)
            discard;
    }
    BranchEnd();
    var uv = to_uv;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
    BranchEnd();
    var L_cor;
    if (sam2DCount == 1.0)
        L_cor = Sam2DToColor(0.0, uv);
    else
        L_cor = Sam2DToColor(to_ref.x, uv);
    BranchBegin("color", "C", [colorModel, alphaModel]);
    L_cor = ColorModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "V", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, uv, colorVFX, time);
    BranchEnd();
    if (L_cor.a < alphaCut) {
        discard;
    }
    out_pos = new CVec4(to_viewPos.xyz, 1.0);
    var N = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref);
    out_nor = new CVec4(MappingV3ToTex(N), 1.0);
    out_color = L_cor;
    var texUse = material.w;
    if ((to_ref.z > 0.5 || sam2DCount >= 2.5) && texUse > 0.5)
        L_cor = Sam2DToColor(to_ref.z, uv);
    else
        L_cor.xyz = material.xyz;
    out_spc = new CVec4(L_cor.r, L_cor.g, L_cor.b, 1.0);
}
function vs_main_shadow_write(f3_ver, f4_wi, f4_we, f2_uv) {
    to_uv = f2_uv;
    var woweMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);
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
    BranchBegin("color", "C", [colorModel, alphaModel]);
    L_cor = ColorModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "V", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, to_uv, colorVFX, time);
    BranchEnd();
    if (L_cor.a < alphaCut) {
        discard;
    }
    out_color = to_viewPos;
}
function vs_main_shadow_read(f3_ver, f4_wi, f4_we, f2_uv, f3_nor) {
    var woweMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, woweMat);
    BranchBegin("wind", "W", [windInfluence, windDir, windPos, windInfo, windCount, time]);
    P = ApplyWind(P, skin, f4_we, time);
    BranchEnd();
    to_worldPos = P;
    to_normal = V3Nor(V3MulMat3Normal(f3_nor, TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
    to_uv = f2_uv;
    P = V4MulMatCoordi(P, viewMat);
    out_position = V4MulMatCoordi(P, projectMat);
}
function ps_main_shadow_read() {
    var L_cor = Sam2DToColor(0.0, to_uv);
    BranchBegin("color", "C", [colorModel, alphaModel]);
    L_cor = ColorModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "V", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, to_uv, colorVFX, time);
    BranchEnd();
    if (L_cor.a < alphaCut) {
        discard;
    }
    var all = 0.0;
    for (var i = 0; i < FloatToInt(shadowCount); i++) {
        var shadowRead = Sam2DToV4(shadowReadList, i);
        var sVal = calcShadow(shadowRead, IntToFloat(i), to_normal, to_worldPos);
        all += sVal;
    }
    all /= shadowCount;
    if (all < 0.0)
        all = 0.0;
    var occlusion = screenPos.z;
    var scaled = occlusion * 65535.0;
    var high = floor(scaled / 256.0);
    var low = mod(scaled, 256.0);
    out_color = new CVec4(all, high / 255.0, low / 255.0, 1.0);
}
function ps_main_bake() {
    var uv = to_uv;
    BranchBegin("parallax", "P", [parallaxNormal, camPos]);
    uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
    BranchEnd();
    var L_cor = Sam2DToColor(to_ref.x, uv);
    BranchBegin("color", "C", [colorModel, alphaModel]);
    L_cor = ColorModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "V", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, to_uv, colorVFX, time);
    BranchEnd();
    if (L_cor.a < alphaCut)
        discard;
    var N = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref);
    var shadow = -1.0;
    var i = 0.0;
    BranchBegin("shadow", "S", [shadowNearCasV0, shadowFarCasP0, shadowTopCasV1, shadowBottomCasP1, shadowLeftCasV2, shadowRightCasP2, shadowWrite, shadowCount, shadowPointProj, shadowReadList, ligDir, shadowRate, texture16f, bias, normalBias, PCF, dotCac]);
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
