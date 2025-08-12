import { ligCol, ligCount, ligDir } from "./Light";
import { NoiseFBM, HashIQ2D, NoiseRand1D, NoiseRand2D, NoiseTri2D } from "./Noise";
import { Build, CVec3, CVec4, Mat4ToMat3, V3Nor, V4MulMatCoordi, Mat3ToMat4, V3MulFloat, V3MulV3, acos, V3Dot, V3SubV3, cos, V3AddV3, V3Mix, smoothstep, sin, mod, V3Max, V3Len, SamCubeToColor, min, max, fract, CVec2, pow, abs, floor, SaturateFloat, Sam2DToV4, Sam2DMat, Sam2DToMat, FloatToInt, Exp, LWVPMul, clamp, V4Mix, V4AddV4, V4MulFloat, Exp2, TexSizeHalfInt, Attribute, Null } from "./Shader";
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
var starCount = 2000.0;
var starSize = 0.6;
var starRandCol = new CVec3(0.2, 0.3, 0.9);
var starBaseCol = new CVec3(0.5, 0.5, 0.5);
var cloudy = 0.5;
var cloudHeight = 15.0;
var cloudSpeed = 1.0;
var cloudStep = 25.0;
var cloudPlanetCenter = new CVec3(0.0, -450.0, 0.0);
var cloudPlanetRadius = 500.0;
var sunsetXYRatio = 0.0;
var sunsetRadius = 0.25;
var auroraColor = new CVec3(2.15, -0.5, 1.2);
var auroraHeight = 0.0;
var auroraCut = 0.0;
var auroraStep = 10.0;
var camPos = Null();
Build("CubeObject", [], vs_main, [worldMat, viewMat, projectMat], [out_position, to_uvw], ps_main, [out_color]);
Build("CubeSkybox", ["sky"], vs_main_camBased, [worldMat, viewMat, projectMat], [out_position, to_uvw], ps_main, [out_color]);
Build("CubeSkyGradient", ["gradient"], vs_main_camBased, [
    worldMat, viewMat, projectMat,
    camPos,
    horizon, sunset,
    ligDir, ligCol, ligCount,
    totalIntensity,
    RTable, GTable, BTable,
    tableNum, colorNum,
    sunRTable, sunGTable, sunBTable, sunColorNum,
    starCount, starRandCol, starBaseCol, starSize,
    cloudy, cloudHeight, cloudSpeed, cloudStep, cloudPlanetCenter, cloudPlanetRadius,
    sunsetXYRatio, sunsetRadius,
    auroraColor, auroraHeight, auroraCut, auroraStep,
    time
], [out_position, to_uvw], ps_main_skyGradient, [out_color]);
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
function RotateByYAxis(_uvw, _angle) {
    var uvw = _uvw;
    var cosTime = Math.cos(_angle);
    var sinTime = Math.sin(_angle);
    var prevX = uvw.x;
    uvw.x = cosTime * prevX + sinTime * uvw.z;
    uvw.z = -sinTime * prevX + cosTime * uvw.z;
    uvw = V3Nor(uvw);
    return uvw;
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
        var yBlend = smoothstep(0.0, 0.2, _dir.y);
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
function ps_main_skyGradient() {
    var fragDir = V3Nor(to_uvw);
    var sunPass = 0.0;
    var sun_cos = -1.0;
    var sun_deg = 1.0;
    var ligSum = new CVec3(0.0, 0.0, 0.0);
    var ligMax = new CVec3(0.0, 0.0, 0.0);
    var sunsetCol = new CVec3(0.0, 0.0, 0.0);
    var sunsetBlend = 0.0;
    for (var i = 0; i < TexSizeHalfInt; i++) {
        if (i >= FloatToInt(ligCount))
            break;
        var lDir = Sam2DToV4(ligDir, i);
        if (lDir.w > 1.5)
            continue;
        if (sunPass < 0.5 && lDir.w > -1.5) {
            sunPass = 1.0;
            sun_cos = V3Dot(lDir.xyz, new CVec3(0.0, 1.0, 0.0));
            sun_deg = (1.0 - sun_cos) * 0.5;
            var sunDir = V3Nor(lDir.xyz);
            var sun_a = V3Dot(sunDir, new CVec3(0.0, 1.0, 0.0));
            var sun_theta = acos(sun_a);
            var sunXdir_cos = V3Dot(sunDir, fragDir);
            var sunXdir_deg = (1.0 - sunXdir_cos) * 4.0;
            var sunSliceNum = sunColorNum - 1.0;
            var sunOffset = min(floor(sunSliceNum * sunXdir_deg), sunSliceNum - 1.0);
            var sunset_upCol = new CVec3(sunRTable[FloatToInt(floor(sunOffset / 4.0))][FloatToInt(mod(sunOffset, 4.0))], sunGTable[FloatToInt(floor(sunOffset / 4.0))][FloatToInt(mod(sunOffset, 4.0))], sunBTable[FloatToInt(floor(sunOffset / 4.0))][FloatToInt(mod(sunOffset, 4.0))]);
            var sunset_downCol = new CVec3(sunRTable[FloatToInt(floor((sunOffset + 1.0) / 4.0))][FloatToInt(mod(sunOffset + 1.0, 4.0))], sunGTable[FloatToInt(floor((sunOffset + 1.0) / 4.0))][FloatToInt(mod(sunOffset + 1.0, 4.0))], sunBTable[FloatToInt(floor((sunOffset + 1.0) / 4.0))][FloatToInt(mod(sunOffset + 1.0, 4.0))]);
            sunsetCol = V3Mix(sunset_upCol, sunset_downCol, smoothstep(sunOffset, sunOffset + 1.0, min(sunSliceNum * sunXdir_deg, sunSliceNum - 1.0)));
            sunsetBlend = smoothstep(sunset, 0.0, abs(sun_theta - horizon)) * smoothstep(sunsetRadius, 0.05, sunXdir_deg) * smoothstep(sunsetXYRatio, 0.0, abs(sunDir.y - fragDir.y)) * smoothstep(2.0, 0.0, totalIntensity);
        }
        var lCol = Sam2DToV4(ligCol, i);
        var dir = V3Nor(lDir.xyz);
        var angle = acos(V3Dot(dir, fragDir));
        var intensity = V3Len(lCol.rgb);
        var col = V3MulFloat(lCol.rgb, 1.73 / max(intensity, 1e-7));
        col = V3MulFloat(col, 0.02 / max(angle, 1e-8));
        ligMax = V3Max(ligMax, col);
        ligSum = V3AddV3(ligSum, col);
    }
    var dir_cos = V3Dot(fragDir, new CVec3(0.0, 1.0, 0.0));
    var dir_deg = (1.0 - dir_cos) * 0.5;
    var table = tableNum * sun_deg;
    var tableOffset = min(floor(table), tableNum - 1.0);
    var tableFract = fract(table * 0.9999999);
    var nextTableOffset = clamp(tableFract < 0.5 ? tableOffset - 1.0 : tableOffset + 1.0, 0.0, tableNum - 1.0);
    var rTable = Sam2DToMat(RTable, tableOffset);
    var gTable = Sam2DToMat(GTable, tableOffset);
    var bTable = Sam2DToMat(BTable, tableOffset);
    var next_rTable = Sam2DToMat(RTable, nextTableOffset);
    var next_gTable = Sam2DToMat(GTable, nextTableOffset);
    var next_bTable = Sam2DToMat(BTable, nextTableOffset);
    var skyCol = GetSkyByColTable(dir_deg, colorNum, tableFract, rTable, gTable, bTable, next_rTable, next_gTable, next_bTable);
    skyCol = V3Mix(skyCol, sunsetCol, sunsetBlend);
    skyCol = V3Max(V3AddV3(skyCol, V3MulFloat(ligSum, 0.2)), ligMax);
    if (fragDir.y > 0.0) {
        if (totalIntensity <= 0.1) {
            var nightBlend = smoothstep(0.1, 0.0, totalIntensity);
            if (starSize > 0.0) {
                var star = GetStars(fragDir, starCount, starSize, starBaseCol, starRandCol);
                skyCol = V3AddV3(skyCol, V3MulFloat(star, nightBlend));
            }
            var aurora = Aurora(fragDir, auroraHeight, auroraCut, auroraColor, auroraStep);
            skyCol = V3AddV3(V3MulFloat(skyCol, (1.0 - aurora.w)), V3MulFloat(aurora.rgb, nightBlend));
        }
        if (cloudy > 0.0) {
            var cloud = GetCloud(camPos, fragDir, cloudy, cloudHeight, cloudSpeed, cloudStep, cloudPlanetCenter, cloudPlanetRadius);
            skyCol = V3Mix(skyCol, V3MulFloat(cloud.rgb, 1.0 / max(1e-5, cloud.w)), cloud.w);
        }
    }
    out_color.rgb = skyCol;
    out_color.w = 1.0;
}
