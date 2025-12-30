import { ligCol, ligCount, ligDir } from "./Light";
import { BayerFilter, NoiseValue3, NoiseValue3FBM, NoiseValue3FBMRest } from "./Noise";
import { Build, CMat, CVec3, CVec4, Mat4ToMat3, V3Nor, V4MulMatCoordi, Mat3ToMat4, V3MulFloat, V3MulV3, acos, V3Dot, cos, V3AddV3, V3Mix, smoothstep, sin, mod, V3Max, V3Len, SamCubeToColor, max, fract, CVec2, pow, abs, floor, SaturateFloat, Sam2DToV4, FloatToInt, Exp, LWVPMul, clamp, V4Mix, V4AddV4, V4MulFloat, Exp2, Attribute, Null, BranchEnd, BranchBegin, BranchDefault, screenPos, IntToFloat, step, sqrt, Hash12, Hash11 } from "./Shader";
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
var starCount = 2000.0;
var starSize = 0.6;
var starRandCol = new CVec3(0.2, 0.3, 0.9);
var starBaseCol = new CVec3(0.5, 0.5, 0.5);
var cloud = 0.4;
var cloudHeight = 10.0;
var cloudSpeed = new CVec3(0.0, 0.0, 5.0);
var cloudStep = 16.0;
var cloudPlanetRadius = 700.0;
var cloudHorizon = new CVec2(0.0, 0.2);
var cloudMaxDistance = 150000.0;
var aurora = 1.0;
var auroraSpeed = 0.6;
var auroraColor = new CVec3(2.15, -0.5, 1.2);
var auroraHeight = 0.0;
var auroraCut = 0.0;
var auroraStep = 10.0;
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
function CloudDensity(_pos) {
    var adjustedWindDir = new CVec3(cloudSpeed.x, -cloudSpeed.y, cloudSpeed.z);
    _pos = V3AddV3(_pos, V3MulFloat(adjustedWindDir, time));
    var softness = 0.05;
    var meterToNoise = 0.0212242;
    var p = V3MulFloat(_pos, meterToNoise);
    var baseNoise = NoiseValue3(p);
    if (baseNoise > 0.6) {
        return 0.0;
    }
    var noiseFBM = NoiseValue3FBMRest(p, baseNoise);
    var dens = noiseFBM * smoothstep(cloud + softness, cloud, noiseFBM);
    return SaturateFloat(dens);
}
function RaySphereIntersection(_rayOrg, _rayDir, _sphereRadius, _maxIntersectionDist) {
    var b = 2.0 * V3Dot(_rayDir, _rayOrg);
    var c = V3Dot(_rayOrg, _rayOrg) - _sphereRadius * _sphereRadius;
    var disc = b * b - 4.0 * c;
    if (disc < 0.0)
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    var squareRoot = sqrt(disc);
    var t1 = (-b - squareRoot) * 0.5;
    var t2 = (-b + squareRoot) * 0.5;
    var tMax = max(t1, t2);
    if (tMax < 0.0)
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    var intersectPoint = V3AddV3(_rayOrg, V3MulFloat(_rayDir, tMax));
    if (tMax > _maxIntersectionDist)
        return new CVec4(intersectPoint, 0.0);
    return new CVec4(intersectPoint, 1.0);
}
function Cloud(_viewDir) {
    var cameraPos = new CVec3(0.0, 1.0, 0.0);
    var yBlend = smoothstep(cloudHorizon.x, cloudHorizon.y, _viewDir.y);
    if (yBlend < 0.01)
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    yBlend = yBlend * yBlend;
    var intersection = RaySphereIntersection(cameraPos, _viewDir, cloudPlanetRadius, cloudMaxDistance);
    if (intersection.w < 0.5)
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    var sampleCount = cloudStep;
    var raymarchStepSize = cloudHeight / sampleCount;
    var raymarchStepVector = V3MulFloat(_viewDir, raymarchStepSize);
    var ditherVal = BayerFilter(screenPos.xy);
    var posInCloudVolume = V3AddV3(intersection.xyz, V3MulFloat(raymarchStepVector, ditherVal));
    var transmitance = 1.0;
    var color = 0.0;
    var alpha = 0.0;
    for (var i = 0; i < FloatToInt(sampleCount); i++) {
        var dens = CloudDensity(posInCloudVolume);
        if (dens > 0.01) {
            var lightSample = dens * raymarchStepSize;
            var transmitance_i = Exp(-lightSample);
            transmitance *= transmitance_i;
            color += transmitance * dens * raymarchStepSize;
            alpha += (1.0 - transmitance_i) * (1.0 - alpha);
        }
        if (transmitance < 0.01)
            break;
        posInCloudVolume = V3AddV3(posInCloudVolume, raymarchStepVector);
    }
    color *= yBlend;
    alpha *= yBlend;
    return new CVec4(color, color, color, alpha);
}
function Aurora(_viewDir, _height, _cut, _color, _steps) {
    var col = new CVec4(0.0, 0.0, 0.0, 0.0);
    var eye = new CVec3(0.0, 0.0, _height);
    var avgCol = new CVec4(0.0, 0.0, 0.0, 0.0);
    eye = V3MulFloat(eye, 1e-5);
    var mt = 10.0;
    var i = 0.0;
    for (; i < _steps; i++) {
        var of = 0.006 * Hash12(_viewDir.xy) * smoothstep(0.0, 15.0, i * mt);
        var pt = ((0.8 + pow(i * mt, 1.4) * 0.001) - eye.y) / (_viewDir.y * 2.0 + 0.4);
        pt -= of;
        var bpos = V3AddV3(eye, V3MulFloat(_viewDir, pt));
        var p = new CVec2(bpos.z, bpos.x);
        var rzt = NoiseValue3FBM(new CVec3(p, 0.06 * time));
        var col2 = new CVec4(0.0, 0.0, 0.0, rzt);
        col2.rgb = V3MulFloat(new CVec3(sin(1.0 - _color.x + (i * mt) * 0.053) * 0.5 * mt, sin(1.0 - _color.y + (i * mt) * 0.053) * 0.5 * mt, sin(1.0 - _color.z + (i * mt) * 0.053) * 0.5 * mt), rzt);
        avgCol = V4Mix(avgCol, col2, 0.5);
        col = V4AddV4(col, V4MulFloat(avgCol, Exp2(-i * mt * 0.065 - 2.5) * smoothstep(0.0, 5.0, i * mt)));
    }
    return V4MulFloat(col, clamp(_viewDir.y * 15.0 - _cut, 0.0, 1.0) * 2.8);
}
function StarDir(_cosTheta, _sinTheta, _phi) {
    return new CVec3(_sinTheta * cos(_phi), _sinTheta * sin(_phi), _cosTheta);
}
function Stars(_viewDir, _count, _size, _baseCol, _randCol) {
    var PI2 = 6.283185;
    var theta = acos(_viewDir.z);
    var width = 3.141592 / _count;
    var level = floor((theta / 3.141592) * _count);
    var maxAffectLevel = cos(width * 7.0);
    var minAffectLevel = cos(width * 0.5);
    var result = new CVec3(0.0, 0.0, 0.0);
    var yBlend = smoothstep(0.0, 0.2, _viewDir.y);
    if (yBlend < 0.01) {
        return result;
    }
    yBlend = yBlend * yBlend;
    for (var i = -4; i <= 4; i++) {
        var level_i = clamp(level + IntToFloat(i), 0.0, _count - 1.0);
        var theta_i = (level_i) * width;
        var sinTheta = sin(theta_i);
        var starMask = step(Hash12(new CVec2(theta_i, 0.0)), sinTheta);
        var rnd = Hash11(3.141592 + theta_i);
        var phi = PI2 * Hash11(level_i);
        var starDir = StarDir(cos(theta_i), sinTheta, phi);
        var cosAngle = 0.5 + 0.5 * V3Dot(starDir, _viewDir);
        var size = rnd * _size;
        var angleVal = 1.0 - cosAngle;
        var lig = 5e-6 * size / max(angleVal, 5e-7);
        lig = lig * lig * lig;
        var starVal = lig * starMask;
        starVal += smoothstep(cos(width * rnd), 1.0, cosAngle) * 10.0;
        starVal *= smoothstep(maxAffectLevel, minAffectLevel, cosAngle);
        starVal *= yBlend;
        var color = V3MulFloat(new CVec3(0.2, 0.3, 0.9), fract(rnd * 2345.2) * 123.2);
        color = new CVec3(sin(color.x) * 0.5 + 0.5, sin(color.y) * 0.5 + 0.5, sin(color.z) * 0.5 + 0.5);
        color = V3AddV3(V3MulV3(color, _randCol), _baseCol);
        starVal *= sin(time * 3.0 + rnd * 6.2831) * 0.35 + 0.65;
        result = V3AddV3(result, V3MulFloat(color, starVal));
    }
    var starCol = result;
    return starCol;
}
function FastSkyColor(_rayDir) {
    var maxDir = max(_rayDir.y, 0.01) * max(_rayDir.y, 0.01) * 0.5;
    var col = new CVec3(0.22 - maxDir, 0.55 - maxDir, 0.935 - maxDir);
    col = V3Mix(col, new CVec3(0.595, 0.6375, 0.7225), pow(1.0 - max(_rayDir.y, 0.0), 6.0));
    col = V3AddV3(col, V3MulFloat(new CVec3(0.0, 0.1, 0.2), clamp((0.1 - _rayDir.y) * 10.0, 0.0, 1.0)));
    return col;
}
function FastSunColor(_skyCol, _rayDir, _sunDir, _sunCol) {
    var sundot = clamp(V3Dot(_rayDir, _sunDir), 0.0, 1.0);
    _skyCol = V3AddV3(_skyCol, V3MulFloat(V3MulFloat(_sunCol, 0.25), pow(sundot, 5.0)));
    _skyCol = V3AddV3(_skyCol, V3MulFloat(V3MulFloat(V3Mix(_sunCol, new CVec3(1.0, 1.0, 1.0), 0.5), 0.25), pow(sundot, 64.0)));
    _skyCol = V3AddV3(_skyCol, V3MulFloat(V3MulFloat(V3Mix(_sunCol, new CVec3(1.0, 1.0, 1.0), 0.9), 0.2), pow(sundot, 512.0)));
    _skyCol = V3AddV3(_skyCol, V3MulFloat(V3MulFloat(_sunCol, 0.2), pow(sundot, 8.0)));
    return _skyCol;
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
    BranchBegin("star", "S", [star, starCount, starSize, starBaseCol, starRandCol]);
    value.xyz = Stars(fragDir, starCount, starSize, starBaseCol, starRandCol);
    finalColor = V3AddV3(finalColor, V3MulFloat(value.xyz, star));
    BranchEnd();
    BranchBegin("aurora", "A", [aurora, auroraHeight, auroraCut, auroraColor, auroraStep]);
    value = Aurora(fragDir, auroraHeight, auroraCut, auroraColor, auroraStep);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), V3MulFloat(value.rgb, aurora));
    BranchEnd();
    BranchBegin("cloud", "C", [cloud, cloudHeight, cloudSpeed, cloudStep, cloudPlanetRadius, cloudHorizon, cloudMaxDistance]);
    value = Cloud(fragDir);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), value.rgb);
    BranchEnd();
    out_color.rgb = finalColor;
    out_color.a = 1.0;
}
