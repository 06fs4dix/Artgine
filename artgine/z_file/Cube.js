import { NoiseFBM, HashIQ2D, NoiseRand1D, NoiseRand2D, NoiseTri2D } from "./Noise";
import { Build, CMat, CVec3, CVec4, Mat4ToMat3, V3Nor, V4MulMatCoordi, Mat3ToMat4, V3MulFloat, V3MulV3, acos, V3Dot, V3SubV3, cos, V3AddV3, V3Mix, smoothstep, sin, mod, SamCubeToColor, min, max, fract, CVec2, pow, abs, floor, SaturateFloat, Sam2DMat, FloatToInt, Exp, LWVPMul, clamp, V4Mix, V4AddV4, V4MulFloat, Exp2, Attribute, Null, BranchEnd, BranchBegin } from "./Shader";
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
var out_position = Null();
var out_color = Null();
var to_uvw = Null();
var time = Attribute(0, "time");
var horizon = 0.54;
var sunset = 0.1;
var RTable = new Sam2DMat(9);
var GTable = new Sam2DMat(9);
var BTable = new Sam2DMat(9);
var sunRTable = Null();
var sunGTable = Null();
var sunBTable = Null();
var tableNum = 0.0;
var colorNum = 0.0;
var totalIntensity = 1.0;
var sunColorNum = 0.0;
var star = 1.0;
var starCount = 2000.0;
var starSize = 0.6;
var starRandCol = new CVec3(0.2, 0.3, 0.9);
var starBaseCol = new CVec3(0.5, 0.5, 0.5);
var cloud = 0.3;
var cloudHeight = 10.0;
var cloudSpeed = 0.1;
var cloudStep = 50.0;
var cloudPlanetCenter = new CVec3(0.0, 0.0, 0.0);
var cloudPlanetRadius = 500.0;
var cloudHorizon = new CVec2(0.0, 0.2);
var sunsetXYRatio = 0.0;
var sunsetRadius = 0.25;
var aurora = 1.0;
var auroraColor = new CVec3(2.15, -0.5, 1.2);
var auroraHeight = 0.0;
var auroraCut = 0.0;
var auroraStep = 10.0;
var camPos = Null();
var SkyColorRTable = new CMat(0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.015, 0.01, 0.005);
var SkyColorGTable = new CMat(0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.04, 0.02, 0.01);
var SkyColorBTable = new CMat(0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15);
Build("CubeObject", [], vs_main, [worldMat, viewMat, projectMat], [out_position, to_uvw], ps_main, [out_color]);
Build("CubeSky", ["sky"], vs_main_camBased, [worldMat, viewMat, projectMat], [out_position, to_uvw], ps_main, [out_color]);
Build("CubeTable", ["table"], vs_main_camBased, [worldMat, viewMat, projectMat,
    SkyColorRTable, SkyColorGTable, SkyColorBTable,
    time, camPos,
], [out_position, to_uvw], ps_main_table, [out_color]);
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
function ps_main() {
    var uvw = V3Nor(to_uvw);
    var aCol = SamCubeToColor(0.0, uvw).xyz;
    out_color.rgb = aCol.xyz;
    out_color.a = 1.0;
}
function GetDensity(_pos, _wind, _cov) {
    var p = V3AddV3(V3MulFloat(_pos, 0.0212242), _wind);
    var dens = NoiseFBM(p, 2.76434);
    var cov = _cov;
    dens *= smoothstep(cov + 0.05, cov, dens);
    dens = SaturateFloat(dens);
    return dens;
}
function GetCloud(_eye, _dir, _cloudy, _height, _windSpeed, _step, _planetCenter, _planetRadius) {
    var eye = new CVec3(0.0, 1.0, 0.0);
    var atmosphereCenter = _planetCenter;
    var atmosphereRadius = _planetRadius;
    var impact;
    var radius2 = atmosphereRadius * atmosphereRadius;
    var L = V3SubV3(eye, atmosphereCenter);
    var a = V3Dot(_dir, _dir);
    var b = 2.0 * V3Dot(_dir, L);
    var c = V3Dot(L, L) - radius2;
    var discR = b * b - 4.0 * c * a;
    if (discR < 0.0) {
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    }
    var t = max(0.0, (-b + pow(discR, 0.5)) * 0.5);
    if (t < 0.0) {
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    }
    impact = V3AddV3(eye, V3MulFloat(_dir, max(0.0, t)));
    var thickness = _height;
    var steps = _step;
    var march_steps = thickness / steps;
    var projection = _dir;
    var iter = V3MulFloat(projection, march_steps);
    var pos = impact;
    var transmitance = 1.0;
    var C = new CVec3(0.0, 0.0, 0.0);
    var alpha = 0.0;
    var wind = new CVec3(0.0, 0.0, time * _windSpeed);
    var i = 0.0;
    for (; i < steps; i++) {
        var dens = GetDensity(pos, wind, _cloudy);
        var yBlend = smoothstep(cloudHorizon.x, cloudHorizon.y, _dir.y);
        dens *= yBlend * yBlend;
        var transmitance_i = Exp(-1.0 * dens * march_steps);
        transmitance *= transmitance_i;
        if (transmitance < 0.01) {
            break;
        }
        var result = transmitance * dens * march_steps;
        C = V3AddV3(C, new CVec3(result, result, result));
        alpha += (1.0 - transmitance_i) * (1.0 - alpha);
        pos = V3AddV3(pos, iter);
    }
    return new CVec4(C, alpha);
}
function Aurora(_dir, _height, _cut, _color, _steps) {
    var eye = new CVec3(0.0, 0.0, _height);
    var col = new CVec4(0.0, 0.0, 0.0, 0.0);
    var avgCol = new CVec4(0.0, 0.0, 0.0, 0.0);
    eye = V3MulFloat(eye, 1e-5);
    var mt = 10.0;
    var i = 0.0;
    for (; i < _steps; i++) {
        var of = 0.006 * HashIQ2D(_dir.xy) * smoothstep(0.0, 15.0, i * mt);
        var pt = ((0.8 + pow(i * mt, 1.4) * 0.001) - eye.y) / (_dir.y * 2.0 + 0.4);
        pt -= of;
        var bpos = V3AddV3(eye, V3MulFloat(_dir, pt));
        var p = new CVec2(bpos.z, bpos.x);
        var rzt = NoiseTri2D(p, 0.06, time);
        var col2 = new CVec4(0.0, 0.0, 0.0, rzt);
        col2.rgb = V3MulFloat(new CVec3(sin(1.0 - _color.x + (i * mt) * 0.053) * 0.5 * mt, sin(1.0 - _color.y + (i * mt) * 0.053) * 0.5 * mt, sin(1.0 - _color.z + (i * mt) * 0.053) * 0.5 * mt), rzt);
        avgCol = V4Mix(avgCol, col2, 0.5);
        col = V4AddV4(col, V4MulFloat(avgCol, Exp2(-i * mt * 0.065 - 2.5) * smoothstep(0.0, 5.0, i * mt)));
    }
    return V4MulFloat(col, clamp(_dir.y * 15.0 - _cut, 0.0, 1.0) * 2.8);
}
function GetDir(_theta, _phi) {
    return V3Nor(new CVec3(sin(_theta) * cos(_phi), sin(_theta) * sin(_phi), cos(_theta)));
}
function GetDistFromStar(_dir, _starDir) {
    return 0.5 + 0.5 * V3Dot(_starDir, _dir);
}
function GetGlow(_angle, _radius, _flare, _theta_diff) {
    var lig = pow(5e-6 * _radius / max(_angle, 5e-7), 1.5);
    return lig;
}
function GetStars(_dir, _count, _size, _baseCol, _randCol) {
    var theta = acos(_dir.z);
    var width = 3.141592 / _count;
    var level = floor((theta / 3.141592) * _count);
    var maxAffectLevel = cos(width * 7.0);
    var minAffectLevel = cos(width * 0.5);
    var result = new CVec3(0.0, 0.0, 0.0);
    var i = -10.0;
    for (; i <= 10.0; i++) {
        var level_i = min(_count - 1.0, max(0.0, level + i));
        var theta_i = (level_i) * width;
        if (sin(theta_i) <= NoiseRand2D(new CVec2(theta_i, 0.0))) {
            continue;
        }
        var rnd = NoiseRand1D(3.141592 + theta_i);
        var phi = 3.141592 * 2.0 * NoiseRand1D(level_i);
        var starDir = GetDir(theta_i, phi);
        var cosAngle = GetDistFromStar(_dir, starDir);
        var size = rnd * _size;
        var star = GetGlow(1.0 - cosAngle, size, smoothstep(0.9, 1.0, rnd) * 0.6, V3SubV3(_dir, starDir));
        star += smoothstep(cos(width * rnd), cos(0.0), cosAngle) * 10.0;
        star *= smoothstep(maxAffectLevel, minAffectLevel, cosAngle);
        var yBlend = smoothstep(0.0, 0.2, _dir.y);
        star *= yBlend * yBlend;
        var color = V3MulFloat(new CVec3(0.2, 0.3, 0.9), fract(rnd * 2345.2) * 123.2);
        color = new CVec3(sin(color.x) * 0.5 + 0.5, sin(color.y) * 0.5 + 0.5, sin(color.z) * 0.5 + 0.5);
        color = V3AddV3(V3MulV3(color, _randCol), _baseCol);
        star *= sin(time * 3.0 + rnd * 6.2831) * 0.35 + 0.65;
        result = V3AddV3(result, V3MulFloat(color, star));
    }
    var starCol = result;
    return starCol;
}
function GetSkyByColTable(_dirDeg, _colNum, _tableFract, _rT, _gT, _bT, _rTNext, _gTNext, _bTNext) {
    var sliceNum = _colNum - 1.0;
    var colorOffset = min(floor(sliceNum * _dirDeg), sliceNum - 1.0);
    var cur_upSkyCol = new CVec3(_rT[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))], _gT[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))], _bT[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))]);
    var next_upSkyCol = new CVec3(_rTNext[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))], _gTNext[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))], _bTNext[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))]);
    next_upSkyCol = V3Mix(cur_upSkyCol, next_upSkyCol, 0.5);
    var upSkyCol = V3Mix(cur_upSkyCol, next_upSkyCol, smoothstep(0.0, 0.5, abs(_tableFract - 0.5)));
    var cur_downSkyCol = new CVec3(_rT[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))], _gT[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))], _bT[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))]);
    var next_downSkyCol = new CVec3(_rTNext[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))], _gTNext[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))], _bTNext[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))]);
    next_downSkyCol = V3Mix(cur_downSkyCol, next_downSkyCol, 0.5);
    var downSkyCol = V3Mix(cur_downSkyCol, next_downSkyCol, smoothstep(0.0, 0.5, abs(_tableFract - 0.5)));
    var skyCol = V3Mix(upSkyCol, downSkyCol, smoothstep(colorOffset, colorOffset + 1.0, min(sliceNum * _dirDeg, sliceNum - 1.0)));
    return skyCol;
}
function ps_main_table() {
    var fragDir = V3Nor(to_uvw);
    var dir_cos = V3Dot(fragDir, new CVec3(0.0, 1.0, 0.0));
    var dir_deg = (1.0 - dir_cos) * 0.5;
    var directionIndex = floor(dir_deg * 14.0);
    var currentColor = new CVec3(SkyColorRTable[FloatToInt(floor(directionIndex / 4.0))][FloatToInt(mod(directionIndex, 4.0))], SkyColorGTable[FloatToInt(floor(directionIndex / 4.0))][FloatToInt(mod(directionIndex, 4.0))], SkyColorBTable[FloatToInt(floor(directionIndex / 4.0))][FloatToInt(mod(directionIndex, 4.0))]);
    var nextIndex = directionIndex + 1.0;
    var nextColor = new CVec3(SkyColorRTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))], SkyColorGTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))], SkyColorBTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))]);
    var t = fract(dir_deg * 14.0);
    var finalColor = V3Mix(currentColor, nextColor, t);
    var value;
    BranchBegin("star", "S", [star, starCount, starSize, starBaseCol, starRandCol]);
    value.xyz = GetStars(fragDir, starCount, starSize, starBaseCol, starRandCol);
    finalColor = V3AddV3(finalColor, V3MulFloat(value.xyz, star));
    BranchEnd();
    BranchBegin("aurora", "A", [aurora, auroraHeight, auroraCut, auroraColor, auroraStep]);
    value = Aurora(fragDir, auroraHeight, auroraCut, auroraColor, auroraStep);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), V3MulFloat(value.rgb, aurora));
    BranchEnd();
    BranchBegin("cloud", "C", [cloud, cloudHeight, cloudSpeed, cloudStep, cloudPlanetCenter, cloudPlanetRadius, cloudHorizon]);
    value = GetCloud(camPos, fragDir, cloud, cloudHeight, cloudSpeed, cloudStep, cloudPlanetCenter, cloudPlanetRadius);
    finalColor = V3Mix(finalColor, V3MulFloat(value.rgb, 1.0 / max(1e-5, value.w)), value.w);
    BranchEnd();
    out_color.rgb = finalColor;
    out_color.a = 1.0;
}
