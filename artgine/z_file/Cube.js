import { HSVToRGB, RGBToHSV } from "./ColorFun";
import { ligCol, ligCount, ligDir } from "./Light";
import { NoiseGet } from "./Noise";
import { SDF } from "./SDF";
import { Build, CMat, CVec3, CVec4, Mat4ToMat3, V3Nor, V4MulMatCoordi, Mat3ToMat4, V3MulFloat, V3MulV3, acos, V3Dot, V3AddV3, V3Mix, smoothstep, sin, mod, V3Max, V3Len, SamCubeToColor, max, fract, CVec2, pow, abs, floor, SaturateFloat, FloatToInt, Exp, LWVPMul, clamp, Attribute, Null, BranchEnd, BranchBegin, BranchDefault, screenPos, IntToFloat, sqrt, V3SubV3, mix, min, Hash13, SaturateV3, V3Floor, V3DivV3, V3Fract, V3DivFloat, V3Min, V2Len, Sam2DArrToV4, } from "./Shader";
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
var starLayer1ColorTable = new CMat(1.0, 0.9, 0.7, 1.0, 1.0, 0.9, 0.8, 0.9, 1.0, 0.7, 0.8, 1.0, 0.02, 0.07, 5.0, 2.0);
var starLayer2ColorTable = new CMat(1.6, 0.0, 0.0, 1.2, 1.0, 1.0, 0.0, 0.0, 1.6, 1.0, 1.2, 1.0, 0.20, 0.25, 5.0, 0.0);
var starLayer3ColorTable = new CMat(1.6, 0.0, 0.0, 1.2, 1.0, 1.0, 0.0, 0.0, 1.6, 1.0, 1.2, 1.0, 0.25, 0.30, 15.0, 0.0);
var cloudCoverage = 0.5;
var cloudStart = 15000.0;
var cloudHeight = 10000.0;
var cloudLightDistance = 10000.0;
var cloudPlanetRadius = 6300000.0;
var cloudSpeed = new CVec3(1.0, 0.0, 0.0);
var cloudStep = 32.0;
var cloudLightStep = 4.0;
var cloudScale = 100000.0;
var cloudExtinction = 3.5;
var cloudScatter = 10.0;
var cloudAmbient = 0.1;
var cloudDither = 0.0;
var aurora = 0.2;
var auroraSpeed = 0.01;
var auroraScale = 0.000001;
var auroraColorBot = new CVec3(1.0, 1.0, 0.0);
var auroraColorMid = new CVec3(0.0, 1.0, 0.0);
var auroraColorTop = new CVec3(0.0, 1.0, 0.5);
var auroraOffset = 0.1;
var auroraDistort = 1.0;
var auroraSmoothness = 0.3;
var auroraMin = new CVec3(-20000.0, 15000.0, -20000.0);
var auroraMax = new CVec3(20000.0, 25000.0, 20000.0);
var auroraStep = 20.0;
var camPos = Null();
var roughness;
var SkyColorRTable = new CMat(0.22, 0.24, 0.27, 0.30, 0.35, 0.45, 0.60, 0.78, 0.90, 0.88, 0.85, 0.82, 0.80, 0.78, 0.76, 0.75);
var SkyColorGTable = new CMat(0.50, 0.53, 0.56, 0.60, 0.68, 0.78, 0.88, 0.96, 1.00, 0.98, 0.96, 0.94, 0.92, 0.90, 0.88, 0.87);
var SkyColorBTable = new CMat(0.92, 0.94, 0.96, 0.98, 1.00, 1.00, 1.00, 1.00, 1.00, 0.99, 0.98, 0.97, 0.96, 0.95, 0.94, 0.93);
Build("Artgine/Shader/CubeObject", [], vs_main, [worldMat, viewMat, projectMat], [out_position, to_uvw], ps_main, [out_color]);
Build("Artgine/Shader/CubeSky", ["sky"], vs_main_camBased, [worldMat, viewMat, projectMat, time, camPos], [out_position, to_uvw], ps_main, [out_color]);
function vs_main(f3_ver) {
    to_uvw = f3_ver;
    out_position = LWVPMul(f3_ver, worldMat, viewMat, projectMat);
}
function vs_main_camBased(f3_ver) {
    to_uvw = f3_ver;
    var v4 = new CVec4(V3MulFloat(V3Nor(f3_ver), 1000.0), 1.0);
    var P = V4MulMatCoordi(v4, Mat3ToMat4(Mat4ToMat3(viewMat)));
    P = V4MulMatCoordi(P, projectMat);
    out_position = new CVec4(P.x, P.y, 0.0, P.w);
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
    var marchingDistance = tMax - tMin;
    tMax = tMin + marchingDistance;
    var rayMarchStep = marchingDistance / cloudStep;
    var rayMarchT = tMin + rayMarchStep * 0.5;
    if (cloudDither > 0.5) {
        rayMarchT += rayMarchStep * NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Gaussian);
    }
    var lightDir = _sunDir;
    var lightStepSize = cloudLightDistance / cloudLightStep;
    var lightStepVector = V3MulFloat(lightDir, lightStepSize);
    var windScale = 0.015;
    var wind = V3MulFloat(cloudSpeed, -time * windScale);
    var p = new CVec3(0.0, 0.0, 0.0);
    var T = 1.0;
    var acc = new CVec3(0.0, 0.0, 0.0);
    var noiseScale = 1.0 / cloudScale;
    var extinction = cloudExtinction / cloudHeight;
    var scatterK = cloudScatter / cloudHeight;
    var ambient = cloudAmbient;
    for (var i = 0; i < FloatToInt(cloudStep); i++) {
        var samplePos = V3AddV3(rayOrg, V3MulFloat(rayDir, rayMarchT));
        var cloudY = V3Len(V3SubV3(samplePos, planetCenter)) - bottomRadius;
        var cloudYNorm = cloudY / cloudHeight;
        if (cloudYNorm < 0.0 || cloudYNorm > 1.0) {
            continue;
        }
        p.x = samplePos.x * noiseScale + wind.x;
        p.y = (samplePos.y - cloudStart) * noiseScale + wind.y;
        p.z = samplePos.z * noiseScale + wind.z;
        var noise = NoiseGet(p, SDF.eNoise.PerlinFBM3);
        var density = noise;
        density = ((density - cloudCoverage) / (1.0 - cloudCoverage));
        density *= yBlend;
        if (density > 0.01) {
            var tauL = 0.0;
            var poslight = V3AddV3(samplePos, V3MulFloat(lightStepVector, 0.5));
            for (var j = 0; j < FloatToInt(cloudLightStep); j++) {
                poslight = V3AddV3(poslight, lightStepVector);
                var ligCloudY = V3Len(V3SubV3(poslight, planetCenter)) - bottomRadius;
                var ligCloudYNorm = ligCloudY / cloudHeight;
                if (ligCloudYNorm < 0.0 || ligCloudYNorm > 1.0)
                    continue;
                p.x = poslight.x * noiseScale + wind.x;
                p.y = (poslight.y - cloudStart) * noiseScale + wind.y;
                p.z = poslight.z * noiseScale + wind.z;
                var nL = NoiseGet(p, SDF.eNoise.PerlinFBM3);
                var dL = ((nL - cloudCoverage) / (1.0 - cloudCoverage));
                dL *= yBlend;
                tauL += dL * lightStepSize;
            }
            var lightT = Exp(-tauL * extinction);
            var lit = V3AddV3(V3MulFloat(new CVec3(1.0, 1.0, 1.0), ambient), V3MulFloat(_sunCol, lightT * (1.0 - ambient)));
            acc = V3AddV3(acc, V3MulFloat(lit, T * (density * scatterK) * rayMarchStep));
            T *= Exp(-density * extinction * rayMarchStep);
            if (T < 0.05)
                break;
        }
        rayMarchT += rayMarchStep;
    }
    var alpha = 1.0 - T;
    acc = V3DivV3(acc, V3AddV3(acc, new CVec3(1.0, 1.0, 1.0)));
    return new CVec4(acc, alpha);
}
function Aurora(_viewDir) {
    var rayOrg = camPos;
    var rayDir = _viewDir;
    var invDir = new CVec3(1.0 / rayDir.x, 1.0 / rayDir.y, 1.0 / rayDir.z);
    var t0 = V3MulV3(V3SubV3(auroraMin, rayOrg), invDir);
    var t1 = V3MulV3(V3SubV3(auroraMax, rayOrg), invDir);
    var tmin = V3Min(t0, t1);
    var tmax = V3Max(t0, t1);
    var tNear = max(max(tmin.x, tmin.y), tmin.z);
    var tFar = min(min(tmax.x, tmax.y), tmax.z);
    if (tNear > tFar || tFar <= 0.0) {
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    }
    var raymarchDistance = tFar - tNear;
    var raymarchStepSize = raymarchDistance / auroraStep;
    var raymarchStepVector = V3MulFloat(rayDir, raymarchStepSize);
    var curPos = V3AddV3(rayOrg, V3MulFloat(_viewDir, tNear));
    curPos = V3AddV3(curPos, V3MulFloat(raymarchStepVector, 0.5 + NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Blue)));
    var hsvBot = RGBToHSV(auroraColorBot);
    var hsvMid = RGBToHSV(auroraColorMid);
    var hsvTop = RGBToHSV(auroraColorTop);
    var Tr = 1.0;
    var result = new CVec3(0.0, 0.0, 0.0);
    var scaleX = (auroraMax.x - auroraMin.x) * auroraScale;
    var scaleZ = (auroraMax.z - auroraMin.z) * auroraScale;
    var invBoxSize = new CVec3(1.0 / (auroraMax.x - auroraMin.x), 1.0 / (auroraMax.y - auroraMin.y), 1.0 / (auroraMax.z - auroraMin.z));
    var timeOffset = time * auroraSpeed;
    var invHeight = 1.0 / (auroraMax.y - auroraMin.y);
    var fadeWidth = 0.1 * V2Len(new CVec2(auroraMax.x - auroraMin.x, auroraMax.z - auroraMin.z));
    for (var i = 0; i < FloatToInt(auroraStep); i++) {
        var samplePos = curPos;
        var p = new CVec3((samplePos.x - auroraMin.x) * invBoxSize.x, 0.0, (samplePos.z - auroraMin.z) * invBoxSize.z);
        var noiseP = NoiseGet(p, SDF.eNoise.Perlin);
        var uvDistort = noiseP * auroraDistort * 0.5;
        var p1 = new CVec3(p.x * scaleX + timeOffset + uvDistort, p.z * scaleZ + timeOffset + uvDistort - auroraOffset, 0.0);
        var p2 = new CVec3(p1.x, p1.y + 2.0 * auroraOffset, 0.0);
        var n1 = NoiseGet(p1, SDF.eNoise.Perlin);
        var n2 = NoiseGet(p2, SDF.eNoise.Perlin);
        var interpolatedNoise = smoothstep(-auroraSmoothness, auroraSmoothness, n1 - n2);
        var intensity = 0.2 + clamp(0.5 - abs(interpolatedNoise - 0.5) * 1.5, 0.0, 1.0);
        intensity = clamp(intensity, 0.0, 1.0);
        intensity *= intensity;
        var wave = 0.0;
        wave += 0.000767 * intensity;
        intensity *= intensity;
        wave += 0.166504 * intensity;
        intensity *= intensity;
        wave += intensity;
        var h = clamp((auroraMax.y - samplePos.y) * invHeight, 0.0, 1.0);
        var hSplit = pow(h, 1.8);
        var hInv = 1.0 - hSplit;
        var dMin = V3SubV3(samplePos, auroraMin);
        var dMax = V3SubV3(auroraMax, samplePos);
        var edgeDist = min(dMin.x, dMin.z);
        edgeDist = min(edgeDist, min(dMax.x, dMax.z));
        edgeDist = clamp(edgeDist / fadeWidth, 0.0, 1.0);
        var density = 0.1 * raymarchStepSize * h * wave * edgeDist;
        var stepTr = Exp(-density);
        var baseHSV;
        if (hSplit < 0.5)
            baseHSV = V3Mix(hsvBot, hsvMid, smoothstep(0.0, 0.5, hSplit));
        else
            baseHSV = V3Mix(hsvMid, hsvTop, smoothstep(0.5, 1.0, hSplit));
        var hShift = mix(-0.08, 0.12, hInv);
        hShift += NoiseGet(V3MulFloat(p, 0.05), SDF.eNoise.Perlin) * 0.03;
        baseHSV.x = fract(baseHSV.x + hShift * smoothstep(0.25, 0.75, hInv));
        baseHSV.y = clamp(baseHSV.y * (1.0 + wave * 0.4), 0.0, 1.0);
        baseHSV.z = clamp(baseHSV.z * (1.2 + wave), 0.0, 1.5);
        var auroraCol = HSVToRGB(baseHSV);
        result = V3AddV3(result, V3MulFloat(auroraCol, (1.0 - stepTr) * Tr));
        Tr *= stepTr;
        if (Tr < 0.01)
            break;
        curPos = V3AddV3(curPos, raymarchStepVector);
    }
    var alpha = aurora * (1.0 - Tr);
    return new CVec4(V3MulFloat(result, alpha), alpha);
}
function StarLayer(_viewDir, _colorTable) {
    if (_colorTable[3][3] <= 0.0)
        return new CVec3(0.0, 0.0, 0.0);
    var scale = 40.0 * _colorTable[3][3];
    var density = 0.04 * _colorTable[3][3];
    var cell = V3Floor(V3MulFloat(_viewDir, scale));
    var local = V3SubV3(V3Fract(V3MulFloat(_viewDir, scale)), new CVec3(0.5, 0.5, 0.5));
    var h = Hash13(cell);
    if (h > density)
        return new CVec3(0.0, 0.0, 0.0);
    var color;
    h /= density;
    if (h < 0.50)
        color = V3Mix(new CVec3(_colorTable[0][0], _colorTable[0][1], _colorTable[0][2]), new CVec3(_colorTable[0][3], _colorTable[1][0], _colorTable[1][1]), (h - 0.00) / 0.50);
    else
        color = V3Mix(new CVec3(_colorTable[1][2], _colorTable[1][3], _colorTable[2][0]), new CVec3(_colorTable[2][1], _colorTable[2][2], _colorTable[2][3]), (h - 0.50) / 0.50);
    color = V3DivFloat(color, max(1e-4, V3Dot(color, new CVec3(0.2126, 0.7152, 0.0722))));
    var s = mix(_colorTable[3][0], _colorTable[3][1], pow(Hash13(V3AddV3(cell, new CVec3(7.3, 7.3, 7.3))), 3.5));
    var d = V3Len(local);
    var phase = h * 6.2831;
    var speed = mix(0.2, 1.2, h);
    var twinkle = sin(time * _colorTable[3][2] * speed + phase);
    var twinkle2 = sin(time * _colorTable[3][2] * speed * 1.73 + phase * 2.39);
    twinkle = mix(0.75, 1.0, (twinkle * 0.5 + 0.5) * 0.6 + (twinkle2 * 0.5 + 0.5) * 0.4);
    var core = smoothstep(s, 0.0, d);
    var glow = Exp(-d * 25.0);
    return V3MulFloat(color, twinkle * (core * 8.0 + glow * 4.0));
}
function Star(_viewDir) {
    var core = new CVec3(0.0, 0.0, 0.0);
    core = V3AddV3(core, StarLayer(_viewDir, starLayer1ColorTable));
    core = V3AddV3(core, StarLayer(_viewDir, starLayer2ColorTable));
    core = V3AddV3(core, StarLayer(_viewDir, starLayer3ColorTable));
    return core;
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
    var ligSumSun = new CVec3(0.0, 0.0, 0.0);
    var ligMaxSun = new CVec3(0.0, 0.0, 0.0);
    var ligSumNight = new CVec3(0.0, 0.0, 0.0);
    var ligMaxNight = new CVec3(0.0, 0.0, 0.0);
    var sunsetCol = new CVec3(0.0, 0.0, 0.0);
    var sunsetBlend = -1.0;
    var lDir;
    var lCol;
    var dir;
    var angle = 0.0;
    var intensity = 0.0;
    var col;
    var i;
    var sunIntensity;
    var sunPass = 0.0;
    var sun_deg = 1.0;
    var isSunDisc = 0.0;
    BranchBegin("light", "L", [ligDir, ligCol, ligCount, sunColorRTable, sunColorGTable, sunColorBTable]);
    for (i.dummy = 0; i.dummy < 3; i.dummy++) {
        if (i.dummy >= FloatToInt(ligCount))
            break;
        lDir = Sam2DArrToV4(ligDir, IntToFloat(i));
        if (lDir.w > 1.5)
            continue;
        dir = V3Nor(lDir.xyz);
        lCol = Sam2DArrToV4(ligCol, IntToFloat(i));
        angle = acos(V3Dot(dir, fragDir));
        intensity = V3Len(lCol.rgb);
        isSunDisc = 0.0;
        if (sunPass < 0.5 && lDir.w > -1.5) {
            sunPass = 1.0;
            isSunDisc = 1.0;
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
            sunIntensity = intensity;
        }
        col = V3MulFloat(lCol.rgb, 1.73 / max(intensity, 1e-7));
        col = V3MulFloat(col, 0.02 / max(angle, 1e-8));
        if (isSunDisc > 0.5) {
            ligMaxSun = V3Max(ligMaxSun, col);
            ligSumSun = V3AddV3(ligSumSun, col);
        }
        else {
            ligMaxNight = V3Max(ligMaxNight, col);
            ligSumNight = V3AddV3(ligSumNight, col);
        }
    }
    if (t < 0.0)
        finalColor = V3MulV3(finalColor, V3Mix(new CVec3(1.0, 1.0, 1.0), sunsetCol, sunsetBlend));
    else
        finalColor = V3Mix(finalColor, sunsetCol, sunsetBlend);
    finalColor = V3Max(V3AddV3(finalColor, V3MulFloat(ligSumSun, 0.2)), ligMaxSun);
    BranchEnd();
    var cloudAlpha = 0.0;
    BranchBegin("cloud", "C", [cloudCoverage, cloudDither, cloudStart, cloudHeight, cloudPlanetRadius, cloudSpeed, cloudStep, cloudLightStep, cloudScale, cloudExtinction, cloudScatter, cloudAmbient, cloudLightDistance]);
    value = Cloud(fragDir, dir, lCol.rgb);
    cloudAlpha = value.w;
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - cloudAlpha)), V3MulFloat(value.rgb, cloudAlpha));
    BranchEnd();
    var nightVisMoon = SaturateFloat(1.0 - cloudAlpha);
    var nightVis = SaturateFloat(1.0 - cloudAlpha * 1.5);
    finalColor = V3Max(V3AddV3(finalColor, V3MulFloat(V3MulFloat(ligSumNight, 0.2), nightVisMoon)), V3Mix(finalColor, ligMaxNight, nightVisMoon));
    BranchBegin("star", "S", [starLayer1ColorTable, starLayer2ColorTable, starLayer3ColorTable]);
    if (sunIntensity < 0.99) {
        value.rgb = Star(fragDir);
        finalColor = V3AddV3(finalColor, V3MulFloat(value.xyz, SaturateFloat(1.0 - sunIntensity) * nightVis));
        finalColor = SaturateV3(finalColor);
    }
    BranchEnd();
    BranchBegin("aurora", "A", [aurora, auroraSpeed, auroraColorBot, auroraColorMid, auroraColorTop, auroraOffset, auroraDistort, auroraSmoothness, auroraMin, auroraMax, auroraStep, auroraScale]);
    if (sunIntensity < 0.99) {
        value = Aurora(fragDir);
        finalColor = V3AddV3(finalColor, V3MulFloat(value.rgb, nightVis));
        finalColor = SaturateV3(finalColor);
    }
    BranchEnd();
    out_color.rgb = finalColor;
    out_color.a = 1.0;
}
