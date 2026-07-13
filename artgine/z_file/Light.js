import { SDF } from "./SDF";
import { CMat3, CVec2, CVec3, CVec4, FloatToInt, IntToFloat, reflect, SamCubeLodToColor, SaturateFloat, Sam2DArrToV4, Sam2DArrV4, SamCubeSize, sqrt, abs, clamp, max, min, pow, mix, Exp2, log2, floor, V2AddV2, V2MulFloat, V3AddV3, V3Dot, V3Len, V3Max, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3SubV3, V4AddV4, V4MulFloat, round, } from "./Shader";
export var ambientColor = new CVec3(0.2, 0.2, 0.2);
export var material = new CVec4(0.0, 0.0, 0.0, 1.0);
export var cullMask = new CVec4(0.0, 0.0, 0.0, 0.0);
export var sam2DCount;
export var sam2DArrCount;
export var samCubeCount;
export var ligCount = 0;
export var ligStep0 = SDF.eLightStep0.HafeLambert;
export var ligStep1 = SDF.eLightStep1.Phong;
export var ligStep2 = SDF.eLightStep2.Emissive;
export var ligStep3 = SDF.eLightStep3.None;
export var envmapOn = 0.0;
export var ligDir = new Sam2DArrV4(1, SDF.eUni.V4LightDir);
export var ligCol = new Sam2DArrV4(1, SDF.eUni.V4LightColor);
export var ligMask = new Sam2DArrV4(1, SDF.eUni.V4LightMask);
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
function F_Schlick_Fast(_vDotH, _F0) {
    var fresnel = Exp2((-5.55473 * _vDotH - 6.98316) * _vDotH);
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
    var c0 = new CVec4(-1.0, -0.0275, -0.572, 0.022);
    var c1 = new CVec4(1.0, 0.0425, 1.04, -0.04);
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
export function LightCac3D(campos, position, albedo, normal, shadow, roughness, ao, metalic, maskIndex) {
    normal = V3Nor(normal);
    var viewDir = V3Nor(V3SubV3(campos, position.xyz));
    var nDotV = SaturateFloat(V3Dot(normal, viewDir));
    var orgRoughness = clamp(roughness, 0.0, 1.0);
    var smoothness = 1.0 - orgRoughness;
    roughness = mix(0.15, 1.0, orgRoughness);
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
        var lMask = Sam2DArrToV4(ligMask, IntToFloat(i));
        if ((FloatToInt(lMask.x) & FloatToInt(maskIndex)) == 0)
            continue;
        if (abs(lDir.w) <= 0.5)
            continue;
        var L = lDir.xyz;
        var radiance = lCol.rgb;
        var shadowIndex = round(min(lMask.w, 3.0));
        if (shadowIndex > -0.5 && shadow[FloatToInt(shadowIndex)] > -0.5) {
            radiance = V3MulFloat(radiance, shadow[FloatToInt(shadowIndex)]);
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
            var shininess = 20.0;
            var R = V3Nor(reflect(V3MulFloat(L, -1.0), normal));
            var vDotR = SaturateFloat(V3Dot(viewDir, R));
            var nDotV = SaturateFloat(V3Dot(normal, viewDir));
            var F = F_Schlick_Fast(nDotV, new CVec3(0.0625, 0.0625, 0.0625));
            var phongValue = (shininess * 0.5 + 1.0) * pow(vDotR, shininess);
            var phongSpecular = phongValue * smoothness * nDotL;
            specular = V3MulFloat(F, phongSpecular);
        }
        else if (ligStep1 < SDF.eLightStep1.BlinnPhong + 0.5) {
            var shininess = 30.0;
            var halfwayDir = V3Nor(V3AddV3(viewDir, L));
            var nDotH = SaturateFloat(V3Dot(normal, halfwayDir));
            var vDotH = SaturateFloat(V3Dot(viewDir, halfwayDir));
            var F = F_Schlick_Fast(vDotH, new CVec3(0.0625, 0.0625, 0.0625));
            var blinnValue = 0.25 * (shininess * 0.5 + 1.0) * pow(nDotH, shininess);
            var blinnSpecular = blinnValue * smoothness * nDotL;
            specular = V3MulFloat(F, blinnSpecular);
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
            diffuse = V3MulFloat(V3MulV3(kD, diffuse), 0.3183098861837907);
            specular = V3MulFloat(kS, D * G * nDotL);
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
    var DEnvAll;
    var SEnvAll;
    {
        if (envmapOn < 0.5) {
            DEnvAll = V3MulV3(albedo.xyz, ambientColor);
        }
        else {
            var maxReflectionLOD = floor(log2(SamCubeSize(0.0).x)) - 4.0;
            var R = reflect(V3MulFloat(viewDir, -1.0), normal);
            var baseReflectivity = new CVec3(0.04, 0.04, 0.04);
            var F0 = V3Mix(baseReflectivity, albedo.rgb, metalic);
            var F = FresnelSchlickRoughness(nDotV, F0, roughness);
            var kS = F;
            var kD = V3MulFloat(V3SubV3(new CVec3(1.0, 1.0, 1.0), kS), 1.0 - metalic);
            var irradiance = SamCubeLodToColor(0.0, normal, maxReflectionLOD).rgb;
            DEnvAll = V3MulV3(V3MulV3(albedo.rgb, irradiance), kD);
            var prefilteredColor = SamCubeLodToColor(0.0, R, orgRoughness * maxReflectionLOD).rgb;
            SEnvAll = V3MulV3(prefilteredColor, V3MulV3(kS, EnvBRDFApprox(F0, roughness, nDotV)));
        }
        DEnvAll = V3MulFloat(DEnvAll, ao);
        SEnvAll = V3MulFloat(SEnvAll, ComputeSpecularOcclusion(nDotV, ao, roughness));
    }
    DAll = V3AddV3(V3AddV3(DDirAll, DPtAll), DEnvAll);
    SAll = V3AddV3(V3AddV3(SDirAll, SPtAll), SEnvAll);
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
export function LightCac2D(position, albedo, normal, shadow, maskIndex) {
    albedo.rgb = V3Max(albedo.rgb, new CVec3(0.01, 0.01, 0.01));
    var DPtAll = new CVec3(0.0, 0.0, 0.0);
    var DDirAll = new CVec3(0.0, 0.0, 0.0);
    var norLen = V3Len(normal);
    if (norLen < 0.5)
        normal = new CVec3(0.0, 1.0, 0.0);
    for (var i = 0; i < SDF.TexSizeMax; ++i) {
        if (i >= FloatToInt(ligCount))
            break;
        var lDir = Sam2DArrToV4(ligDir, IntToFloat(i));
        var lCol = Sam2DArrToV4(ligCol, IntToFloat(i));
        var lMask = Sam2DArrToV4(ligMask, IntToFloat(i));
        if ((FloatToInt(lMask.x) & FloatToInt(maskIndex)) == 0)
            continue;
        if (abs(lDir.w) <= 0.5)
            continue;
        var L = lDir.xyz;
        var radiance = lCol.rgb;
        var shadowIndex = round(min(lMask.w, 3.0));
        if (shadowIndex > -0.5 && shadow[FloatToInt(shadowIndex)] > -0.5) {
            radiance = V3MulFloat(radiance, shadow[FloatToInt(shadowIndex)]);
        }
        var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
        if (isPointLight > 0.5) {
            L = V3SubV3(L, position.xyz);
            var dist = V3Len(L);
            if (dist > lDir.w)
                continue;
            var attenuation = 1.0 - max(0.0, (dist - lCol.w) / (lDir.w - lCol.w));
            radiance = V3MulFloat(radiance, attenuation);
            var diffuse = albedo.rgb;
            if (norLen > 0.5) {
                L.z = 0.0;
                L = V3Nor(L);
                var angle = max(0.0, V3Dot(normal, L));
                diffuse = V3MulFloat(diffuse, angle);
            }
            DPtAll = V3AddV3(DPtAll, V3MulV3(diffuse, radiance));
        }
        else {
            L = V3Nor(L);
            var angle = max(0.0, V3Dot(normal, L));
            var diffuse = V3MulFloat(radiance, angle);
            DDirAll = V3AddV3(DDirAll, V3MulV3(albedo.rgb, diffuse));
        }
    }
    var DAll = V3AddV3(DPtAll, DDirAll);
    var ambientLight = V3MulV3(albedo.xyz, ambientColor);
    DAll = V3Max(DAll, ambientLight);
    return new CMat3(DAll, new CVec3(0.0, 0.0, 0.0), new CVec3(0.0, 0.0, 0.0));
}
