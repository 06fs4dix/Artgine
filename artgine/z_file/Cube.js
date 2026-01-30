import { ligCol, ligCount, ligDir } from "./Light";
import { BayerFilter, NoiseGet } from "./Noise";
import { SDF } from "./SDF";
import { Build, CMat, CVec3, CVec4, Mat4ToMat3, V3Nor, V4MulMatCoordi, Mat3ToMat4, V3MulFloat, V3MulV3, acos, V3Dot, V3AddV3, V3Mix, smoothstep, sin, mod, V3Max, V3Len, SamCubeToColor, max, fract, CVec2, pow, abs, floor, Sam2DToV4, FloatToInt, Exp, LWVPMul, Attribute, Null, BranchEnd, BranchBegin, BranchDefault, screenPos, sqrt, V3SubV3, min, Hash13, SaturateV3, Sam2DToColor, V3Abs, V3Pow, V3Floor, V3DivV3, } from "./Shader";
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
var out_position = Null();
var out_color = Null();
var to_uvw = Null();
var time = Attribute(0, "time");
var sunColorRTable = new CMat(1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25);
var sunColorGTable = new CMat(0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95);
var sunColorBTable = new CMat(0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85);
var star = 1.0;
var starSize = 80.0;
var cloudStart = 15000.0;
var cloudHeight = 10000.0;
var cloudPlanetRadius = 6300000.0;
var cloudSpeed = new CVec3(1.0, 0.0, 0.0);
var cloudStep = 16.0;
var cloudLightStep = 8.0;
var cloudStartMaxDistance = 1500000.0;
var cloudTracingMaxDistance = 500000.0;
var cloudScale = 100000.0;
var cloudExtinction = 0.00035;
var cloudScatter = 0.001;
var cloudAmbient = 0.1;
var cloudDetailRange = 0.3;
var cloudDither = 1.0;
var aurora = 1.0;
var auroraStart = 15000.0;
var auroraHeight = 500000.0;
var auroraPlanetRadius = 6300000.0;
var auroraStep = 10.0;
var auroraStartMaxDistance = 1500000.0;
var auroraTracingMaxDistance = 500000.0;
var auroraScale = 100000.0;
var auroraColor = new CVec3(2.15, -0.5, 1.2);
var camPos = Null();
var SkyColorRTable = new CMat(0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.015, 0.01, 0.005);
var SkyColorGTable = new CMat(0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.04, 0.02, 0.01);
var SkyColorBTable = new CMat(0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15);
Build("Artgine/Shader/CubeObject", [], vs_main, [worldMat, viewMat, projectMat], [out_position, to_uvw], ps_main, [out_color]);
Build("Artgine/Shader/CubeSky", ["sky"], vs_main_camBased, [worldMat, viewMat, projectMat, time, camPos], [out_position, to_uvw], ps_main, [out_color]);
function vs_main(f3_ver) {
    to_uvw = f3_ver;
    out_position = LWVPMul(f3_ver, worldMat, viewMat, projectMat);
}
function vs_main_camBased(f3_ver) {
    to_uvw = f3_ver;
    var v4 = new CVec4(f3_ver, 1.0);
    var P = V4MulMatCoordi(v4, Mat3ToMat4(Mat4ToMat3(viewMat)));
    P = V4MulMatCoordi(P, projectMat);
    out_position = new CVec4(P.x, P.y, P.w, P.w);
}
function RaySphereIntersection(_rayOrg, _rayDir, _sphere) {
    var localPos = V3SubV3(_rayOrg, _sphere.xyz);
    var localPosSqrt = V3Dot(localPos, localPos);
    var quadCoef = new CVec3(V3Dot(_rayDir, _rayDir), 2.0 * V3Dot(_rayDir, localPos), localPosSqrt - _sphere.w * _sphere.w);
    var disc = quadCoef.y * quadCoef.y - 4.0 * quadCoef.x * quadCoef.z;
    if (disc >= 0.0) {
        var sqrtDisc = sqrt(disc);
        return new CVec3((-quadCoef.y - sqrtDisc) / (2.0 * quadCoef.x), (-quadCoef.y + sqrtDisc) / (2.0 * quadCoef.x), 1.0);
    }
    return new CVec3(0.0, 0.0, 0.0);
}
function Cloud(_viewDir, _sunDir, _sunCol) {
    var yBlend = smoothstep(0.0, 0.2, _viewDir.y);
    if (yBlend < 0.01)
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    yBlend = yBlend * yBlend;
    var rayOrg = camPos;
    var rayDir = _viewDir;
    var planetRadius = cloudPlanetRadius;
    var planetCenter = new CVec3(0.0, -planetRadius, 0.0);
    var bottomRadius = planetRadius + cloudStart;
    var topRadius = bottomRadius + cloudHeight;
    var tMin;
    var tMax;
    var tTop = RaySphereIntersection(rayOrg, rayDir, new CVec4(planetCenter, bottomRadius));
    if (tTop.z > 0.5) {
        var tBot = RaySphereIntersection(rayOrg, rayDir, new CVec4(planetCenter, topRadius));
        if (tBot.z > 0.5) {
            var tempTop = (tTop.x > 0.0 && tTop.y > 0.0) ? min(tTop.x, tTop.y) : max(tTop.x, tTop.y);
            var tempBot = (tBot.x > 0.0 && tBot.y > 0.0) ? min(tBot.x, tBot.y) : max(tBot.x, tBot.y);
            if (tBot.x > 0.0 && tBot.y > 0.0) {
                tempTop = max(0.0, min(tTop.x, tTop.y));
            }
            tMin = min(tempBot, tempTop);
            tMax = max(tempBot, tempTop);
        }
        else {
            tMin = tTop.x;
            tMax = tTop.y;
        }
    }
    tMin = max(0.0, tMin);
    tMax = max(0.0, tMax);
    var startMaxDistance = cloudStartMaxDistance;
    if (tMax <= tMin || tMin > startMaxDistance) {
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    }
    var traceMaxDistance = cloudTracingMaxDistance;
    var marchingDistance = min(traceMaxDistance, tMax - tMin);
    tMax = tMin + marchingDistance;
    var ratio = tMax / tMin;
    var logStepRatio = pow(ratio, 1.0 / cloudStep);
    var lightDir = _sunDir;
    var shadowLen = cloudHeight * 1.5;
    var lightStepSize = shadowLen / (1.0 + cloudLightStep);
    var lightStepVector = V3MulFloat(lightDir, lightStepSize);
    var windScale = 0.015;
    var wind = V3MulFloat(cloudSpeed, -time * windScale);
    var curDist;
    if (cloudDither > 0.5) {
        var dither = BayerFilter(screenPos.xy);
        curDist = tMin * pow(logStepRatio, 0.5 + dither);
    }
    else {
        curDist = tMin * pow(logStepRatio, 0.5);
    }
    var p = new CVec3(0.0, 0.0, 0.0);
    var T = 1.0;
    var acc = new CVec3(0.0, 0.0, 0.0);
    var noiseScale = 1.0 / cloudScale;
    var thresh0 = 0.45;
    var thresh1 = 0.65;
    var extinction = cloudExtinction;
    var gg = cloudScatter * cloudScatter;
    var scatterK = cloudScatter;
    var ambient = cloudAmbient;
    for (var i = 0; i < FloatToInt(cloudStep); i++) {
        var samplePos = V3AddV3(rayOrg, V3MulFloat(rayDir, curDist));
        var nextDist = curDist * logStepRatio;
        var stepLength = nextDist - curDist;
        var cloudY = V3Len(V3SubV3(samplePos, planetCenter)) - bottomRadius;
        var cloudYNorm = cloudY / cloudHeight;
        if (cloudYNorm < 0.0 || cloudYNorm > 1.0) {
            continue;
        }
        p.x = samplePos.x * noiseScale + wind.x;
        p.y = samplePos.y * noiseScale + wind.y;
        p.z = samplePos.z * noiseScale + wind.z;
        var noise;
        if (cloudYNorm < cloudDetailRange)
            noise = NoiseGet(p, SDF.eNoise.FBM);
        else
            noise = NoiseGet(p, SDF.eNoise.Perlin);
        var density = smoothstep(thresh0, thresh1, noise);
        density *= yBlend;
        if (density > 0.001) {
            var tauL = 0.0;
            var poslight = V3AddV3(samplePos, V3MulFloat(lightStepVector, 0.5));
            for (var j = 0; j < FloatToInt(cloudLightStep); j++) {
                poslight = V3AddV3(poslight, lightStepVector);
                var ligCloudY = V3Len(V3SubV3(poslight, planetCenter)) - bottomRadius;
                var ligCloudYNorm = ligCloudY / cloudHeight;
                if (ligCloudYNorm < 0.0 || ligCloudYNorm > 1.0)
                    continue;
                p.x = poslight.x * noiseScale + wind.x;
                p.y = poslight.y * noiseScale + wind.y;
                p.z = poslight.z * noiseScale + wind.z;
                var nL;
                if (ligCloudYNorm < cloudDetailRange)
                    nL = NoiseGet(p, SDF.eNoise.FBM);
                else
                    nL = NoiseGet(p, SDF.eNoise.Perlin);
                var dL = smoothstep(thresh0, thresh1, nL);
                tauL += dL * lightStepSize;
            }
            var lightT = Exp(-tauL * extinction);
            var lit = V3AddV3(V3MulFloat(new CVec3(1.0, 1.0, 1.0), ambient), V3MulFloat(_sunCol, lightT * (1.0 - ambient)));
            acc = V3AddV3(acc, V3MulFloat(lit, T * (density * scatterK) * stepLength));
            T *= Exp(-density * extinction * stepLength);
            if (T < 0.05)
                break;
        }
        curDist = nextDist;
    }
    var alpha = 1.0 - T;
    acc = V3DivV3(acc, V3AddV3(acc, new CVec3(1.0, 1.0, 1.0)));
    return new CVec4(acc, alpha);
}
function Aurora(_viewDir) {
    var yBlend = smoothstep(0.0, 0.2, _viewDir.y);
    if (yBlend < 0.01)
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    yBlend = yBlend * yBlend;
    var rayOrg = camPos;
    var rayDir = _viewDir;
    var planetRadius = auroraPlanetRadius;
    var planetCenter = new CVec3(0.0, -planetRadius, 0.0);
    var bottomRadius = planetRadius + auroraStart;
    var topRadius = bottomRadius + auroraHeight;
    var tMin;
    var tMax;
    var tTop = RaySphereIntersection(rayOrg, rayDir, new CVec4(planetCenter, bottomRadius));
    if (tTop.z > 0.5) {
        var tBot = RaySphereIntersection(rayOrg, rayDir, new CVec4(planetCenter, topRadius));
        if (tBot.z > 0.5) {
            var tempTop = (tTop.x > 0.0 && tTop.y > 0.0) ? min(tTop.x, tTop.y) : max(tTop.x, tTop.y);
            var tempBot = (tBot.x > 0.0 && tBot.y > 0.0) ? min(tBot.x, tBot.y) : max(tBot.x, tBot.y);
            if (tBot.x > 0.0 && tBot.y > 0.0) {
                tempTop = max(0.0, min(tTop.x, tTop.y));
            }
            tMin = min(tempBot, tempTop);
            tMax = max(tempBot, tempTop);
        }
        else {
            tMin = tTop.x;
            tMax = tTop.y;
        }
    }
    tMin = max(0.0, tMin);
    tMax = max(0.0, tMax);
    var startMaxDistance = auroraStartMaxDistance;
    if (tMax <= tMin || tMin > startMaxDistance) {
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    }
    var traceMaxDistance = auroraTracingMaxDistance;
    var marchingDistance = min(traceMaxDistance, tMax - tMin);
    tMax = tMin + marchingDistance;
    var raymarchStepSize = marchingDistance / auroraStep;
    var raymarchStepVector = V3MulFloat(_viewDir, raymarchStepSize);
    var curPos = V3AddV3(rayOrg, V3MulFloat(_viewDir, tMin));
    var p = new CVec3(0.0, 0.0, 0.0);
    var thresh0 = 0.3;
    var thresh1 = 0.7;
    var T = 0.0;
    var acc = new CVec3(0.0, 0.0, 0.0);
    var noiseScale = 1.0 / auroraScale;
    for (var i = 0; i < FloatToInt(auroraStep); i++) {
        var samplePos = V3AddV3(curPos, V3MulFloat(raymarchStepVector, 0.5));
        var altitude = V3Len(V3SubV3(samplePos, planetCenter)) - bottomRadius;
        var altitudeNorm = altitude / auroraHeight;
        if (altitudeNorm < 0.0 || altitudeNorm > 1.0) {
            continue;
        }
        var edgeFade = smoothstep(0.0, 0.2, altitudeNorm) * (1.0 - smoothstep(0.7, 1.0, altitudeNorm));
        p.x = samplePos.x * noiseScale;
        p.y = samplePos.y * noiseScale;
        p.z = samplePos.z * noiseScale;
        var warp = NoiseGet(p, SDF.eNoise.Perlin);
        var pWarped = new CVec3(p.x + warp * 0.3, p.y * 0.05, p.z + warp * 0.3);
        var n1 = NoiseGet(pWarped, SDF.eNoise.Perlin);
        var n2 = NoiseGet(V3MulFloat(pWarped, 2.0), SDF.eNoise.Voronoi);
        var density = smoothstep(thresh0, thresh1, n1 * (1.0 - n2));
        if (density > 0.01) {
            acc = V3AddV3(acc, V3MulFloat(auroraColor, density * T));
            T += density;
        }
    }
    acc = V3DivV3(acc, V3AddV3(acc, new CVec3(1.0, 1.0, 1.0)));
    var alpha = 1.0 - T;
    return new CVec4(acc, alpha);
}
function Stars(_viewDir) {
    var weights = V3Abs(_viewDir);
    weights = V3Pow(weights, 4.0);
    weights = V3MulFloat(weights, 1.0 / (weights.x + weights.y + weights.z));
    var uvY = new CVec2(_viewDir.x * 4.0, _viewDir.z * 4.0);
    var uvX = new CVec2(_viewDir.z * 4.0, _viewDir.y * 4.0);
    var uvZ = new CVec2(_viewDir.x * 4.0, _viewDir.y * 4.0);
    var colY = Sam2DToColor(2.0, uvY).rgb;
    var colX = Sam2DToColor(2.0, uvX).rgb;
    var colZ = Sam2DToColor(2.0, uvZ).rgb;
    var col = V3AddV3(V3AddV3(V3MulFloat(colX, weights.x), V3MulFloat(colY, weights.y)), V3MulFloat(colZ, weights.z));
    var lightIntensity = col.x * 0.299 + col.y * 0.587 + col.z * 0.114;
    if (lightIntensity < 0.1)
        return new CVec3(0.0, 0.0, 0.0);
    var starID = Hash13(V3MulFloat(V3Floor(V3MulFloat(_viewDir, starSize)), 0.25 / starSize));
    return V3MulFloat(col, sin(time * (2.0 + starID * 4.0) + starID * 6.2831) * 0.35 + 0.65);
}
function ps_main() {
    var fragDir = V3Nor(to_uvw);
    var value;
    var dir_cos;
    var dir_deg;
    var curIndex;
    var curColor;
    var nextIndex;
    var nextColor;
    var t = 0.0;
    var finalColor = new CVec3(0.0, 0.0, 0.0);
    BranchBegin("table", "T", [SkyColorRTable, SkyColorGTable, SkyColorBTable]);
    dir_cos = V3Dot(fragDir, new CVec3(0.0, 1.0, 0.0));
    dir_deg = (1.0 - dir_cos) * 0.5;
    curIndex = floor(dir_deg * 14.0);
    curColor = new CVec3(SkyColorRTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))], SkyColorGTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))], SkyColorBTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))]);
    nextIndex = curIndex + 1.0;
    nextColor = new CVec3(SkyColorRTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))], SkyColorGTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))], SkyColorBTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))]);
    t = fract(dir_deg * 14.0);
    finalColor = V3Mix(curColor, nextColor, t);
    BranchDefault();
    finalColor = SamCubeToColor(0.0, to_uvw).xyz;
    t = -1.0;
    BranchEnd();
    var ligSum = new CVec3(0.0, 0.0, 0.0);
    var ligMax = new CVec3(0.0, 0.0, 0.0);
    var sunsetCol = new CVec3(0.0, 0.0, 0.0);
    var sunsetBlend = -1.0;
    var lDir;
    var lCol;
    var dir;
    var angle = 0.0;
    var intensity = 0.0;
    var col;
    var i;
    var sunPass = 0.0;
    var sun_deg = 1.0;
    BranchBegin("light", "L", [ligDir, ligCol, ligCount, sunColorRTable, sunColorGTable, sunColorBTable]);
    for (i.dummy = 0; i.dummy < 3; i.dummy++) {
        if (i.dummy >= FloatToInt(ligCount))
            break;
        lDir = Sam2DToV4(ligDir, i);
        if (lDir.w > 1.5)
            continue;
        dir = V3Nor(lDir.xyz);
        if (sunPass < 0.5 && lDir.w > -1.5) {
            sunPass = 1.0;
            dir_cos = V3Dot(dir, fragDir);
            dir_deg = (1.0 - dir_cos) * 0.5;
            curIndex = floor(dir_deg * 14.0);
            curColor = new CVec3(sunColorRTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))], sunColorGTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))], sunColorBTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))]);
            nextIndex = curIndex + 1.0;
            nextColor = new CVec3(sunColorRTable[FloatToInt(floor((nextIndex) / 4.0))][FloatToInt(mod(nextIndex, 4.0))], sunColorGTable[FloatToInt(floor((nextIndex) / 4.0))][FloatToInt(mod(nextIndex, 4.0))], sunColorBTable[FloatToInt(floor((nextIndex) / 4.0))][FloatToInt(mod(nextIndex, 4.0))]);
            t = fract(dir_deg * 14.0);
            sunsetCol = V3Mix(curColor, nextColor, t);
            sun_deg = 1.0 - abs(V3Dot(dir, new CVec3(0.0, 1.0, 0.0)));
            sunsetBlend = sun_deg * (1.0 - dir_deg);
        }
        lCol = Sam2DToV4(ligCol, i);
        angle = acos(V3Dot(dir, fragDir));
        intensity = V3Len(lCol.rgb);
        col = V3MulFloat(lCol.rgb, 1.73 / max(intensity, 1e-7));
        col = V3MulFloat(col, 0.02 / max(angle, 1e-8));
        ligMax = V3Max(ligMax, col);
        ligSum = V3AddV3(ligSum, col);
    }
    if (t < 0.0)
        finalColor = V3MulV3(finalColor, V3Mix(new CVec3(1.0, 1.0, 1.0), sunsetCol, sunsetBlend));
    else
        finalColor = V3Mix(finalColor, sunsetCol, sunsetBlend);
    finalColor = V3Max(V3AddV3(finalColor, V3MulFloat(ligSum, 0.2)), ligMax);
    BranchEnd();
    BranchBegin("star", "S", [star, starSize]);
    value.rgb = Stars(fragDir);
    finalColor = V3AddV3(finalColor, V3MulFloat(value.xyz, star));
    finalColor = SaturateV3(finalColor);
    BranchEnd();
    BranchBegin("aurora", "A", [aurora, auroraStart, auroraHeight, auroraPlanetRadius, auroraStep, auroraStartMaxDistance, auroraTracingMaxDistance, auroraScale, auroraColor]);
    value = Aurora(fragDir);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), V3MulFloat(value.rgb, aurora));
    BranchEnd();
    BranchBegin("cloud", "C", [cloudStart, cloudHeight, cloudPlanetRadius, cloudSpeed, cloudStep, cloudLightStep, cloudStartMaxDistance, cloudTracingMaxDistance, cloudScale, cloudExtinction, cloudScatter, cloudAmbient, cloudDetailRange, cloudDither]);
    value = Cloud(fragDir, dir, lCol.rgb);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), V3MulFloat(value.rgb, value.w));
    BranchEnd();
    out_color.rgb = finalColor;
    out_color.a = 1.0;
}
