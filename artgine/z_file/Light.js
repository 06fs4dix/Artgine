import { SDF } from "./SDF";
import { abs, clamp, CMat3, CVec2, CVec3, CVec4, Exp, FloatToInt, max, min, pow, reflect, Sam2DToV4, Sam2DV4, SamCubeLodToColor, TexSizeHalfInt, V2AddV2, V2MulFloat, V3AddV3, V3DivFloat, V3DivV3, V3Dot, V3Len, V3Max, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3SubV3, V4AddV4, V4MulFloat } from "./Shader";
export var ambientColor = new CVec3(0.2, 0.2, 0.2);
export var ligCount = 0;
export var ligStep0 = SDF.eLightStep0.HafeLambert;
export var ligStep1 = SDF.eLightStep1.Phong;
export var ligStep2 = SDF.eLightStep2.Emissive;
export var ligStep3 = 0;
export var ligDir = new Sam2DV4(9, 503);
export var ligCol = new Sam2DV4(9, 504);
export var envCube = -1;
function DistributionGGX(_normal, _halfwayVector, _roughness) {
    var roughnessSquared = _roughness * _roughness;
    var roughnessSquared2 = roughnessSquared * roughnessSquared;
    var nDotH = max(V3Dot(_normal, _halfwayVector), 0.0);
    var nDotHSquared = nDotH * nDotH;
    var nominator = roughnessSquared2;
    var denominator = (nDotHSquared * (roughnessSquared2 - 1.0) + 1.0);
    return nominator / (3.141592 * denominator * denominator);
}
function GeometrySchlickGGX(_nDotV, _roughness) {
    var k = (_roughness * _roughness) / 8.0;
    return _nDotV / (_nDotV * (1.0 - k) + k);
}
function GeometrySmith(_normal, _viewDir, _lightDir, _roughness) {
    var nDotV = max(V3Dot(_normal, _viewDir), 0.0);
    var nDotL = max(V3Dot(_normal, _lightDir), 0.0);
    var ggx1 = GeometrySchlickGGX(nDotV, _roughness);
    var ggx2 = GeometrySchlickGGX(nDotL, _roughness);
    return ggx1 * ggx2;
}
function FresnelSchlick(_cosTheta, F0) {
    var oneMinusCosTheta = pow(clamp(1.0 - _cosTheta, 0.0, 1.0), 5.0);
    return V3AddV3(F0, V3MulFloat(V3SubV3(new CVec3(1.0, 1.0, 1.0), F0), oneMinusCosTheta));
}
function FresnelSchlickRoughness(_cosTheta, _F0, _roughness) {
    var oneMinusCosTheta = pow(clamp(1.0 - _cosTheta, 0.0, 1.0), 5.0);
    var oneMinusRoughness = 1.0 - _roughness;
    var oneMinusRoughnessVec3 = new CVec3(oneMinusRoughness, oneMinusRoughness, oneMinusRoughness);
    return V3AddV3(_F0, V3MulFloat(V3SubV3(V3Max(oneMinusRoughnessVec3, _F0), _F0), oneMinusCosTheta));
}
function EnvBRDFApprox(_color, _roughness, _nDotV) {
    var c0 = new CVec4(-1, -0.0275, -0.572, 0.022);
    var c1 = new CVec4(1, 0.0425, 1.0, -0.04);
    var r = V4AddV4(V4MulFloat(c0, _roughness), c1);
    var a004 = min(r.x * r.x, Exp(-9.28 * _nDotV)) * r.x + r.y;
    var AB = V2AddV2(V2MulFloat(new CVec2(-1.04, 1.04), a004), new CVec2(r.z, r.w));
    return V3MulFloat(_color, AB.x + AB.y);
}
function EnvBRDFApproxNonMetal(_color, _roughness, _nDotV) {
    var c0 = new CVec2(-1.0, -0.0275);
    var c1 = new CVec2(1.0, 0.0425);
    var r = V2AddV2(V2MulFloat(c0, _roughness), c1);
    return V3MulFloat(_color, min(r.x * r.x, Exp(-9.28 * _nDotV) * r.x + r.y));
}
export function LightCac3D(campos, position, albedo, normal, shadow, roughness, emissive, metalic, ambient_color) {
    roughness = clamp(roughness, 0.0, 1.0);
    metalic = clamp(metalic, 0.0, 1.0);
    roughness = max(0.01, roughness);
    var smoothness = 1.0 - roughness;
    var viewDir = V3Nor(V3SubV3(campos, position.xyz));
    var DAll = new CVec3(0, 0, 0);
    var SAll = new CVec3(0, 0, 0);
    var emAll = new CVec3(0, 0, 0);
    var DDirAll = new CVec3(0, 0, 0);
    var DPtAll = new CVec3(0, 0, 0);
    var SDirAll = new CVec3(0, 0, 0);
    var SPtAll = new CVec3(0, 0, 0);
    for (var i = 0; i < TexSizeHalfInt; ++i) {
        if (i >= FloatToInt(ligCount))
            break;
        var lDir = Sam2DToV4(ligDir, i);
        var lCol = Sam2DToV4(ligCol, i);
        if (abs(lDir.w) <= 0.5)
            continue;
        var L = lDir.xyz;
        var angle = 0.0;
        var distAttenuation = 1.0;
        var dist = 0.0;
        var radiance = lCol.rgb;
        var diffuse = new CVec3(0.0, 0.0, 0.0);
        var specular = new CVec3(0.0, 0.0, 0.0);
        var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
        if (isPointLight > 0.5) {
            L = V3SubV3(L, position.xyz);
            dist = V3Len(L);
            if (dist > lDir.w)
                continue;
            if (lCol.w <= dist) {
                distAttenuation = 1.0 - ((dist - lCol.w) / (lDir.w - lCol.w));
            }
            radiance = V3MulFloat(radiance, distAttenuation);
        }
        L = V3Nor(L);
        angle = V3Dot(normal, L);
        if (ligStep0 < SDF.eLightStep0.None + 0.5 && ligStep1 < SDF.eLightStep0.None + 0.5)
            continue;
        var nDotL = max(angle, 0.0);
        if (ligStep0 < SDF.eLightStep0.None + 0.5) {
            ;
        }
        else if (ligStep0 < SDF.eLightStep0.Distance + 0.5) {
            var distanceFromLightPos = 1.0 - dist / (lDir.w < 1.0 ? 1.0 : lDir.w);
            diffuse = V3MulFloat(albedo.rgb, distanceFromLightPos);
        }
        else if (ligStep0 < SDF.eLightStep0.Lambert + 0.5) {
            var lambertTerm = max(angle, 0.0);
            if (lambertTerm > shadow && shadow > -0.5) {
                lambertTerm = shadow;
            }
            diffuse = V3MulFloat(albedo.rgb, lambertTerm);
        }
        else if (ligStep0 < SDF.eLightStep0.HafeLambert + 0.5) {
            var halfLabert = angle * 0.5 + 0.5;
            diffuse = V3MulFloat(albedo.rgb, halfLabert);
        }
        if (ligStep1 < SDF.eLightStep1.None + 0.5) {
            ;
        }
        else if (ligStep1 < SDF.eLightStep1.Phong + 0.5) {
            var R = V3Nor(V3AddV3(V3MulFloat(L, -1.0), V3MulFloat(normal, 2.0 * angle)));
            var phongValue = Math.pow(max(0.0, V3Dot(viewDir, R)), 20.0);
            var phongSpecular = phongValue * smoothness * nDotL;
            specular = new CVec3(phongSpecular, phongSpecular, phongSpecular);
        }
        else if (ligStep1 < SDF.eLightStep1.BlinnPhong + 0.5) {
            var halfwayDir = V3Nor(V3AddV3(L, viewDir));
            var blinnValue = Math.pow(max(0.0, V3Dot(normal, halfwayDir)), 20.0 * 4.0);
            var blinnSpecular = blinnValue * smoothness * nDotL;
            specular = new CVec3(blinnSpecular, blinnSpecular, blinnSpecular);
        }
        else if (ligStep1 < SDF.eLightStep1.CookTorrance + 0.5) {
            var V = V3Nor(viewDir);
            var N = V3Nor(normal);
            var H = V3Nor(V3AddV3(V, L));
            var NDF = DistributionGGX(N, H, roughness);
            var G = GeometrySmith(N, V, L, roughness);
            var baseReflectivity = new CVec3(0.04, 0.04, 0.04);
            var F0 = V3Mix(baseReflectivity, albedo.rgb, metalic);
            var F = FresnelSchlick(max(V3Dot(H, V), 0.0), F0);
            var kS = F;
            var kD = V3MulFloat(V3SubV3(new CVec3(1.0, 1.0, 1.0), kS), 1.0 - metalic);
            var numerator = V3MulFloat(F, NDF * G);
            var denominator = max(2.0 * max(V3Dot(N, V), 0.0) * max(V3Dot(N, L), 0.0), 0.0001);
            specular = V3MulFloat(numerator, denominator);
            if (nDotL > shadow && shadow > -0.5)
                nDotL = shadow;
            diffuse = V3MulV3(radiance, V3MulFloat(V3DivFloat(V3MulV3(kD, albedo.xyz), 3.141592), nDotL));
            specular = V3MulFloat(specular, nDotL);
            diffuse = V3MulFloat(diffuse, 4.0);
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
    DAll = DDirAll;
    SAll = SDirAll;
    if (ligStep2 > SDF.eLightStep2.Emissive - 0.5 && ligStep2 < SDF.eLightStep2.Emissive + 0.5) {
        emAll = V3MulFloat(albedo.rgb, emissive);
    }
    if (shadow > -0.5) {
        DAll = V3MulFloat(DAll, shadow);
        SAll = V3MulFloat(SAll, shadow);
    }
    DAll = V3AddV3(DAll, V3DivV3(DPtAll, V3AddV3(DPtAll, new CVec3(1.0, 1.0, 1.0))));
    SAll = V3AddV3(SAll, V3DivV3(SPtAll, V3AddV3(SPtAll, new CVec3(1.0, 1.0, 1.0))));
    if (envCube > SDF.eEnvCube.None + 0.5) {
        if (ligStep1 < SDF.eLightStep1.CookTorrance + 0.5 && ligStep1 > SDF.eLightStep1.CookTorrance - 0.5) {
            var posToCam = V3Nor(V3SubV3(position.xyz, campos));
            var R2 = reflect(posToCam, normal);
            if (envCube > SDF.eEnvCube.Texture - 0.5) {
                var cubeD = SamCubeLodToColor(0.0, normal, 20.0).xyz;
                var ambientLight = V3MulV3(V3MulV3(albedo.xyz, cubeD), ambient_color);
                DAll = V3AddV3(ambientLight, DAll);
                var cubeS = SamCubeLodToColor(0.0, R2, roughness * 20.0).xyz;
                SAll = V3AddV3(SAll, V3MulV3(V3MulFloat(cubeS, metalic * 0.5 + 0.5 * (1.0 - roughness)), albedo.rgb));
            }
        }
        else {
            var cubeD = SamCubeLodToColor(0.0, normal, 20.0).rgb;
            var ambientLight = V3MulV3(V3MulV3(albedo.xyz, cubeD), ambient_color);
            DAll = V3AddV3(ambientLight, DAll);
        }
    }
    else {
        var ambientLight = V3MulV3(albedo.xyz, ambient_color);
        DAll = V3AddV3(ambientLight, DAll);
    }
    return new CMat3(DAll, SAll, emAll);
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
    for (var i = 0; i < TexSizeHalfInt; ++i) {
        if (i >= FloatToInt(ligCount))
            break;
        var lDir = Sam2DToV4(ligDir, i);
        var lCol = Sam2DToV4(ligCol, i);
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
    return new CMat3(V3AddV3(DPtAll, DDirAll), new CVec3(0.0, 0.0, 0.0), new CVec3(0.0, 0.0, 0.0));
}
