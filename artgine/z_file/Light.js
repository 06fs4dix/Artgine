import { SDF } from "./SDF";
import { CMat3, CVec2, CVec3, CVec4, FloatToInt, IntToFloat, Sam2DToColor, SamCubeLodToColor, SamCubeToColor, SaturateFloat, Sam2DArrToV4, Sam2DArrV4, sin, sqrt, abs, clamp, cos, max, min, pow, V2AddV2, V2MulFloat, V3AddV3, V3Cross, V3Dot, V3Len, V3Max, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3Pow, V3SubV3, V4AddV4, V4MulFloat, Hammersley, reflect, Exp2, V3DivV3, mix, SamCubeSize, log2, floor, } from "./Shader";
export var ambientColor = new CVec3(0.2, 0.2, 0.2);
export var ligCount = 0;
export var ligStep0 = SDF.eLightStep0.HafeLambert;
export var ligStep1 = SDF.eLightStep1.Phong;
export var ligStep2 = SDF.eLightStep2.Emissive;
export var ligStep3 = 0;
export var ligDir = new Sam2DArrV4(1, SDF.eUni.V4LightDir);
export var ligCol = new Sam2DArrV4(1, SDF.eUni.V4LightColor);
export var EnvmapApprox = 1;
export var envCube = -1;
export function GetMaterial(_material, _texColor, sam2DCount) {
    var tm = new CVec4(_material.x, _material.y, _material.z, _material.w);
    if (sam2DCount > 1.0) {
        if (tm.x < -0.5)
            tm.x = _texColor.x;
        if (tm.y < -0.5)
            tm.y = _texColor.y;
        if (tm.z < -0.5)
            tm.z = _texColor.z;
        if (tm.w < -0.5)
            tm.w = _texColor.w;
    }
    return tm;
}
function F_Schlick(_vDotH, _F0) {
    var fresnel = pow(clamp(1.0 - _vDotH, 0.0, 1.0), 5.0);
    return V3AddV3(_F0, V3MulFloat(V3SubV3(new CVec3(1.0, 1.0, 1.0), _F0), fresnel));
}
function D_GGX(_alpha, _nDotH) {
    var a2 = _alpha * _alpha;
    var denom = (_nDotH * _nDotH) * (a2 - 1.0) + 1.0;
    return 0.3183098861837907 * a2 / (denom * denom);
}
function V_GGX(_alpha, _nDotL, _nDotV) {
    var a2 = _alpha * _alpha;
    var visV = _nDotL * sqrt(_nDotV * _nDotV * (1.0 - a2) + a2);
    var visL = _nDotV * sqrt(_nDotL * _nDotL * (1.0 - a2) + a2);
    return 0.5 / max(visV + visL, 1e-7);
}
function EnvBRDFApprox(_specularColor, _roughness, _nDotV) {
    var c0 = new CVec4(-1, -0.0275, -0.572, 0.022);
    var c1 = new CVec4(1, 0.0425, 1.04, -0.04);
    var r = V4AddV4(V4MulFloat(c0, _roughness), c1);
    var a004 = min(r.x * r.x, Exp2(-9.28 * _nDotV)) * r.x + r.y;
    var AB = V2AddV2(V2MulFloat(new CVec2(-1.04, 1.04), a004), new CVec2(r.z, r.w));
    return V3AddV3(V3MulFloat(_specularColor, AB.x), new CVec3(AB.y, AB.y, AB.y));
}
function FresnelSchlickRoughness(_nDotV, _F0, _roughness) {
    var oneMinusCosTheta = pow(clamp(1.0 - _nDotV, 0.0, 1.0), 5.0);
    var oneMinusRoughness = 1.0 - _roughness;
    var oneMinusRoughnessVec3 = new CVec3(oneMinusRoughness, oneMinusRoughness, oneMinusRoughness);
    return V3AddV3(_F0, V3MulFloat(V3SubV3(V3Max(oneMinusRoughnessVec3, _F0), _F0), oneMinusCosTheta));
}
function ComputeSpecularOcclusion(_nDotV, _ao, _roughness) {
    return SaturateFloat(pow(_nDotV + _ao, Exp2(-16.0 * _roughness - 1.0)) - 1.0 + _ao);
}
export function LightCac3D(campos, position, albedo, normal, shadow, roughness, ao, metalic, ambient_color, gamma) {
    var viewDir = V3Nor(V3SubV3(campos, position.xyz));
    var nDotV = SaturateFloat(V3Dot(normal, viewDir));
    albedo.rgb = V3Pow(albedo.rgb, gamma);
    normal = V3Nor(normal);
    roughness = mix(0.15, 1.0, clamp(roughness, 0.0, 1.0));
    var smoothness = 1.0 - roughness;
    metalic = clamp(metalic, 0.0, 1.0);
    var DAll = new CVec3(0, 0, 0);
    var SAll = new CVec3(0, 0, 0);
    var emAll = new CVec3(0, 0, 0);
    var DDirAll = new CVec3(0, 0, 0);
    var DPtAll = new CVec3(0, 0, 0);
    var SDirAll = new CVec3(0, 0, 0);
    var SPtAll = new CVec3(0, 0, 0);
    for (var i = 0; i < SDF.TexSizeMax; ++i) {
        if (i >= FloatToInt(ligCount))
            break;
        var lDir = Sam2DArrToV4(ligDir, IntToFloat(i));
        var lCol = Sam2DArrToV4(ligCol, IntToFloat(i));
        if (abs(lDir.w) <= 0.5)
            continue;
        var L = lDir.xyz;
        var radiance = lCol.rgb;
        if (shadow > -0.5) {
            radiance = V3MulFloat(radiance, shadow);
        }
        var dist = 0.0;
        var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
        if (isPointLight > 0.5) {
            var inRadius = lCol.w;
            var outRadius = lDir.w;
            L = V3SubV3(L, position.xyz);
            dist = V3Len(L);
            if (dist > outRadius)
                continue;
            var distAttenuation = (outRadius - dist) / (outRadius - inRadius);
            radiance = V3MulFloat(radiance, distAttenuation);
        }
        L = V3Nor(L);
        var nDotL = SaturateFloat(V3Dot(normal, L));
        var diffuse = new CVec3(0.0, 0.0, 0.0);
        var specular = new CVec3(0.0, 0.0, 0.0);
        if (ligStep0 < SDF.eLightStep0.None + 0.5 && ligStep1 < SDF.eLightStep0.None + 0.5)
            continue;
        if (ligStep0 < SDF.eLightStep0.None + 0.5) {
            ;
        }
        else if (ligStep0 < SDF.eLightStep0.Distance + 0.5) {
            var distanceFromLightPos = 1.0 - dist / (lDir.w < 1.0 ? 1.0 : lDir.w);
            diffuse = V3MulFloat(albedo.rgb, distanceFromLightPos);
        }
        else if (ligStep0 < SDF.eLightStep0.Lambert + 0.5) {
            var lambertTerm = nDotL;
            diffuse = V3MulFloat(albedo.rgb, lambertTerm);
        }
        else if (ligStep0 < SDF.eLightStep0.HafeLambert + 0.5) {
            var halfLabert = V3Dot(normal, L) * 0.5 + 0.5;
            diffuse = V3MulFloat(albedo.rgb, halfLabert);
        }
        if (ligStep1 < SDF.eLightStep1.None + 0.5) {
            ;
        }
        else if (ligStep1 < SDF.eLightStep1.Phong + 0.5) {
            var R = V3Nor(reflect(V3MulFloat(L, -1.0), normal));
            var vDotR = SaturateFloat(V3Dot(viewDir, R));
            var phongValue = Math.pow(vDotR, 20.0);
            var phongSpecular = phongValue * smoothness * nDotL;
            specular = new CVec3(phongSpecular, phongSpecular, phongSpecular);
        }
        else if (ligStep1 < SDF.eLightStep1.BlinnPhong + 0.5) {
            var halfwayDir = V3Nor(V3AddV3(viewDir, L));
            var nDotH = SaturateFloat(V3Dot(normal, halfwayDir));
            var blinnValue = Math.pow(nDotH, 20.0 * 4.0);
            var blinnSpecular = blinnValue * smoothness * nDotL;
            specular = new CVec3(blinnSpecular, blinnSpecular, blinnSpecular);
        }
        else if (ligStep1 < SDF.eLightStep1.CookTorrance + 0.5) {
            var halfwayDir = V3Nor(V3AddV3(viewDir, L));
            var nDotH = SaturateFloat(V3Dot(normal, halfwayDir));
            var vDotH = SaturateFloat(V3Dot(viewDir, halfwayDir));
            var baseReflectivity = new CVec3(0.04, 0.04, 0.04);
            var F0 = V3Mix(baseReflectivity, albedo.rgb, metalic);
            var F = F_Schlick(vDotH, F0);
            var kS = F;
            var kD = V3MulFloat(V3SubV3(new CVec3(1.0, 1.0, 1.0), kS), 1.0 - metalic);
            var alpha = roughness * roughness;
            var D = D_GGX(alpha, nDotH);
            var G = V_GGX(alpha, nDotL, nDotV);
            diffuse = V3MulV3(kD, V3MulFloat(albedo.rgb, nDotL));
            specular = V3MulFloat(kS, D * G * nDotL * 3.14159265359);
        }
        if (ligStep2 < SDF.eLightStep2.None + 0.5) {
            ;
        }
        else if (ligStep2 < SDF.eLightStep2.Emissive + 0.5) {
            emAll = V3AddV3(emAll, V3MulFloat(radiance, nDotL));
        }
        if (isPointLight > 0.5) {
            DPtAll = V3AddV3(DPtAll, V3MulV3(diffuse, radiance));
            SPtAll = V3AddV3(SPtAll, V3MulV3(specular, radiance));
        }
        else {
            DDirAll = V3AddV3(DDirAll, V3MulV3(diffuse, radiance));
            SDirAll = V3AddV3(SDirAll, V3MulV3(specular, radiance));
        }
    }
    DAll = V3AddV3(DDirAll, DPtAll);
    SAll = V3AddV3(SDirAll, SPtAll);
    var diffuse_Indirect;
    var specular_Indirect;
    if (envCube < SDF.eEnvCube.None + 0.5) {
        diffuse_Indirect = V3MulV3(albedo.xyz, ambient_color);
    }
    else if (envCube < SDF.eEnvCube.Texture + 0.5) {
        if (ligStep1 < SDF.eLightStep1.CookTorrance + 0.5 && ligStep1 > SDF.eLightStep1.CookTorrance - 0.5 && envCube > SDF.eEnvCube.Texture - 0.5) {
            var maxReflectionLOD = floor(log2(SamCubeSize(1.0).x)) - 4.0;
            var R = reflect(V3MulFloat(viewDir, -1.0), normal);
            var baseReflectivity = new CVec3(0.04, 0.04, 0.04);
            var F0 = V3Mix(baseReflectivity, albedo.rgb, metalic);
            var F = FresnelSchlickRoughness(nDotV, F0, roughness);
            var kS = F;
            var kD = V3MulFloat(V3SubV3(new CVec3(1.0, 1.0, 1.0), kS), 1.0 - metalic);
            if (EnvmapApprox > 0.5) {
                var irradiance = SamCubeLodToColor(1.0, normal, maxReflectionLOD).rgb;
                diffuse_Indirect = V3MulV3(V3MulV3(albedo.rgb, irradiance), kD);
                var prefilteredColor = SamCubeLodToColor(1.0, R, roughness * maxReflectionLOD).rgb;
                specular_Indirect = V3MulV3(prefilteredColor, V3MulV3(kS, EnvBRDFApprox(F0, roughness, nDotV)));
            }
            else {
                var irradiance = SamCubeToColor(0.0, normal).rgb;
                diffuse_Indirect = V3MulV3(V3MulV3(albedo.rgb, irradiance), kD);
                var brdf = Sam2DToColor(9.0, new CVec2(nDotV, roughness)).xy;
                var prefilteredColor = SamCubeLodToColor(1.0, R, roughness * maxReflectionLOD).rgb;
                specular_Indirect = V3MulV3(prefilteredColor, V3AddV3(V3MulFloat(kS, brdf.x), new CVec3(brdf.y, brdf.y, brdf.y)));
            }
        }
        else {
            var cubeD = SamCubeLodToColor(0.0, normal, 0.0).rgb;
            diffuse_Indirect = V3MulV3(V3MulV3(albedo.xyz, cubeD), ambient_color);
        }
    }
    DAll = V3AddV3(DAll, V3MulFloat(diffuse_Indirect, ao));
    SAll = V3AddV3(SAll, V3MulFloat(specular_Indirect, ComputeSpecularOcclusion(nDotV, ao, roughness)));
    if (ligStep1 < SDF.eLightStep1.CookTorrance + 0.5 && ligStep1 > SDF.eLightStep1.CookTorrance - 0.5) {
        var blended = V3AddV3(DAll, SAll);
        blended = new CVec3(sqrt(blended.x), sqrt(blended.y), sqrt(blended.z));
        DAll = new CVec3(sqrt(DAll.x), sqrt(DAll.y), sqrt(DAll.z));
        SAll = new CVec3(sqrt(SAll.x), sqrt(SAll.y), sqrt(SAll.z));
        var k = V3DivV3(blended, V3AddV3(DAll, SAll));
        DAll = V3MulV3(DAll, k);
        SAll = V3MulV3(SAll, k);
    }
    return new CMat3(DAll, SAll, emAll);
}
export function GetSunInfo() {
    for (var i = 0; i < SDF.TexSizeMax; ++i) {
        if (i >= FloatToInt(ligCount))
            break;
        var dir = Sam2DArrToV4(ligDir, IntToFloat(i));
        var col = Sam2DArrToV4(ligCol, IntToFloat(i));
        if (abs(dir.w) <= 0.5)
            continue;
        var isPointLight = dir.w > 1.1 ? 1.0 : 0.0;
        if (isPointLight < 0.5) {
            return new CMat3(dir.xyz, col.xyz, new CVec3(0.0, 0.0, 0.0));
        }
    }
    return new CMat3(new CVec3(0.0, 1.0, 0.0), new CVec3(0.0, 0.0, 0.0), new CVec3(0.0, 0.0, 0.0));
}
export function LightCac2D(position, albedo, normal, ambientColor) {
    var DPtAll = new CVec3(0.0, 0.0, 0.0);
    var DDirAll = new CVec3(0.0, 0.0, 0.0);
    if (albedo.x < 0.01)
        albedo.x = 0.01;
    if (albedo.y < 0.01)
        albedo.y = 0.01;
    if (albedo.z < 0.01)
        albedo.z = 0.01;
    var norLen = V3Len(normal);
    if (norLen < 0.5)
        normal = new CVec3(0.0, 1.0, 0.0);
    for (var i = 0; i < SDF.TexSizeMax; ++i) {
        if (i >= FloatToInt(ligCount))
            break;
        var lDir = Sam2DArrToV4(ligDir, IntToFloat(i));
        var lCol = Sam2DArrToV4(ligCol, IntToFloat(i));
        if (abs(lDir.w) <= 0.5)
            continue;
        var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
        var L = lDir.xyz;
        if (isPointLight > 0.5) {
            var attenuation = 1.0;
            L = V3SubV3(L, position.xyz);
            var dist = V3Len(L);
            if (dist > lDir.w)
                continue;
            if (lCol.w <= dist) {
                attenuation = 1.0 - ((dist - lCol.w) / (lDir.w - lCol.w));
            }
            if (norLen < 0.5) {
                var diffuse = V3MulFloat(lCol.xyz, attenuation);
                DPtAll = V3AddV3(DPtAll, V3MulV3(albedo.rgb, diffuse));
            }
            else {
                L.z = 0.0;
                L = V3Nor(L);
                var angle = max(0.0, V3Dot(normal, L));
                var diffuse = V3MulFloat(lCol.xyz, angle * attenuation);
                DPtAll = V3AddV3(DPtAll, V3MulV3(albedo.rgb, diffuse));
            }
        }
        else {
            var angle = max(0.0, V3Dot(normal, L));
            var diffuse = V3MulFloat(lCol.xyz, angle);
            DDirAll = V3AddV3(DDirAll, V3MulV3(albedo.rgb, diffuse));
        }
    }
    var ambientLight = V3MulV3(albedo.xyz, ambientColor);
    if (DDirAll.x < ambientLight.x)
        DDirAll.x = ambientLight.x;
    if (DDirAll.y < ambientLight.y)
        DDirAll.y = ambientLight.y;
    if (DDirAll.z < ambientLight.z)
        DDirAll.z = ambientLight.z;
    return new CMat3(V3AddV3(DPtAll, DDirAll), new CVec3(0.0, 0.0, 0.0), new CVec3(0.0, 0.0, 0.0));
}
function ImportanceSampleGGX(_Xi, _N, _roughness) {
    var a = _roughness * _roughness;
    var phi = 2.0 * 3.14159265359 * _Xi.x;
    var cosTheta = sqrt((1.0 - _Xi.y) / (1.0 + (a * a - 1.0) * _Xi.y));
    var sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    var H;
    H.x = cos(phi) * sinTheta;
    H.y = sin(phi) * sinTheta;
    H.z = cosTheta;
    var up = abs(_N.z) < 0.999 ? new CVec3(0.0, 0.0, 1.0) : new CVec3(1.0, 0.0, 0.0);
    var tangent = V3Nor(V3Cross(up, _N));
    var bitangent = V3Cross(_N, tangent);
    var sampleVec = V3AddV3(V3AddV3(V3MulFloat(tangent, H.x), V3MulFloat(bitangent, H.y)), V3MulFloat(_N, H.z));
    return V3Nor(sampleVec);
}
function V_GGX_BRDF(_alpha, _nDotV, _nDotL) {
    var k = _alpha * 0.5;
    return (_nDotV * _nDotL) / ((_nDotV * (1.0 - k) + k) * (_nDotL * (1.0 - k) + k));
}
export function IntegrateBRDF(_NdotV, _roughness) {
    var V;
    V.x = sqrt(1.0 - _NdotV * _NdotV);
    V.y = 0.0;
    V.z = _NdotV;
    var A = 0.0;
    var B = 0.0;
    var N = new CVec3(0.0, 0.0, 1.0);
    var alpha = _roughness * _roughness;
    var numSamples = 1024.0;
    for (var i = 0; i < FloatToInt(numSamples); ++i) {
        var Xi = Hammersley(i, FloatToInt(numSamples));
        var H = ImportanceSampleGGX(Xi, N, _roughness);
        var L = V3Nor(V3SubV3(V3MulFloat(H, 2.0 * V3Dot(V, H)), V));
        var NdotL = max(L.z, 0.0);
        var NdotH = max(H.z, 0.0);
        var VdotH = max(V3Dot(V, H), 0.0);
        if (NdotL > 0.0) {
            var G = V_GGX_BRDF(alpha, NdotL, _NdotV);
            var G_Vis = (G * VdotH) / (_NdotV * NdotH);
            var Fc = pow(1.0 - VdotH, 5.0);
            A += (1.0 - Fc) * G_Vis;
            B += Fc * G_Vis;
        }
    }
    A /= numSamples;
    B /= numSamples;
    return new CVec2(A, B);
}
