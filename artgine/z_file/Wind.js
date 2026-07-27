import { NoiseGet } from "./Noise";
import { SDF } from "./SDF";
import { clamp, CVec2, CVec3, FloatToInt, IntToFloat, max, mix, Sam2DArrToV4, Sam2DArrV4, smoothstep, step, V3AddV3, V3Dot, V3Len, V3MulFloat, V3MulV3, V3Nor, V3SubV3 } from "./Shader";
export var windInfluence = 0.0;
export var windDir = new Sam2DArrV4(1, SDF.eUni.V4WindDir);
export var windPos = new Sam2DArrV4(1, SDF.eUni.V4WindPos);
export var windInfo = new Sam2DArrV4(1, SDF.eUni.V4WindInfo);
export var windCount = 0.0;
export function GetWind(_objPos, _size, _time) {
    if (windCount < 0.5) {
        return new CVec3(0.0, 0.0, 0.0);
    }
    var wind = new CVec3(0.0, 0.0, 0.0);
    for (var i = 0; i < SDF.TexSizeMax; i++) {
        if (i >= FloatToInt(windCount))
            break;
        var wDir = Sam2DArrToV4(windDir, IntToFloat(i));
        var wPos = Sam2DArrToV4(windPos, IntToFloat(i));
        var wInfo = Sam2DArrToV4(windInfo, IntToFloat(i));
        var pow = wDir.w * windInfluence / (100.0 * 100.0);
        if (pow < 0.01) {
            continue;
        }
        var dir = wDir.xyz;
        var pos = wPos.xyz;
        var inner = wInfo.x;
        var outer = wInfo.y;
        var freq = wInfo.z;
        var wave = wInfo.w;
        var w2oVec = V3SubV3(_objPos, pos);
        var dist = V3Len(w2oVec);
        var range = new CVec2(-0.5, 1.0);
        var hasRange = inner + outer < 0.1 ? 0.0 : 1.0;
        var needCalcDir = V3Dot(dir, dir) < 0.01 ? 1.0 : 0.0;
        if (hasRange > 0.5) {
            if (outer < dist) {
                continue;
            }
            if (needCalcDir > 0.5) {
                dir = w2oVec;
            }
            var wRatio = smoothstep(0.0, inner, dist) * (1.0 - smoothstep(inner, outer, dist));
            range.y = wRatio;
            range.x = -wRatio * 0.5;
        }
        if (V3Dot(dir, dir) < 0.01) {
            continue;
        }
        dir = V3Nor(dir);
        var speedFactor;
        if (needCalcDir > 0.5) {
            speedFactor = new CVec3(1.0, 1.0, 1.0);
        }
        else {
            speedFactor = dir;
        }
        var windScale = -1.0 / wave;
        var timed = V3MulFloat(speedFactor, _time * freq * 0.5);
        var noise = new CVec3(NoiseGet(new CVec3(V3Dot(_objPos, speedFactor) * windScale, timed.x, 0.0), SDF.eNoise.Perlin), NoiseGet(new CVec3(V3Dot(_objPos, speedFactor) * windScale, timed.y, 0.0), SDF.eNoise.Perlin), NoiseGet(new CVec3(V3Dot(_objPos, speedFactor) * windScale, timed.z, 0.0), SDF.eNoise.Perlin));
        noise = V3AddV3(V3MulFloat(noise, range.y - range.x), new CVec3(range.x, range.x, range.x));
        var windResult = V3MulV3(noise, dir);
        var windPower = V3MulFloat(_size, pow);
        var useWeight = wPos.w;
        if (useWeight > 0.5) {
            var upWeight = 1.0;
            var downWeight = 1.0;
            var verticalWeight = 1.0;
            windResult.x = clamp(windResult.x * verticalWeight, -1.0, 1.0);
            windResult.y = clamp(windResult.y * mix(downWeight, upWeight, step(0.0, windResult.y)), -1.0, 1.0);
        }
        wind = V3AddV3(wind, V3MulV3(windResult, windPower));
    }
    return wind;
}
export function ApplyWind(_worldPos, _skin, _weight, _time) {
    if (windInfluence > 0.01) {
        var mainWeight = max(_weight.x, max(_weight.y, max(_weight.z, _weight.w)));
        if (mainWeight > 0.5) {
            var windSize = 100.0 * max(0.0, 2.0 * mainWeight - 1.0);
            var wind = GetWind(_worldPos.xyz, new CVec3(windSize, windSize, windSize), _time);
            _worldPos.x += wind.x;
            _worldPos.y += wind.y;
            _worldPos.z += wind.z;
            var arcDown = wind.x * wind.x + wind.z * wind.z;
            _worldPos.y -= arcDown * 0.01;
        }
    }
    return _worldPos;
}
