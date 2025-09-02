import { NoisePerlin2D } from "./Noise";
import { abs, clamp, CVec2, CVec3, CVec4, FloatToInt, MappingTexToV3, max, mix, Sam2DToV4, Sam2DV4, 
    smoothstep, 
    step, 
    TexSizeHalfInt, 
    V3AddV3, V3Dot, V3Len, V3MulFloat, V3MulV3, V3Nor, V3SubV3 } from "./Shader";

export var windInfluence : number = 0.0;
export var windDir : Sam2DV4 = new Sam2DV4(9,500);
export var windPos : Sam2DV4 = new Sam2DV4(9,501);
export var windInfo : Sam2DV4 = new Sam2DV4(9,502);
export var windCount : number = 0.0;

export function GetWind(_objPos : CVec3, _size : CVec3, _time : number) : CVec3
{
    if(windCount < 0.5) {
        return new CVec3(0.0, 0.0, 0.0);
    }

    var wind : CVec3 = new CVec3(0.0, 0.0, 0.0);
    for(var i = 0; i < TexSizeHalfInt; i++) {
        if(i >= FloatToInt(windCount))
            break;

        var wDir : CVec4 = Sam2DToV4(windDir, i);
        var wPos : CVec4 = Sam2DToV4(windPos, i);
        var wInfo : CVec4 = Sam2DToV4(windInfo, i);

        var pow : number = wDir.w * windInfluence / (100.0 * 100.0);
        if(pow < 0.01) {
            continue;   // power가 매우 작으면 계산 필요 x
        }

        var dir : CVec3 = wDir.xyz;
        var pos : CVec3 = wPos.xyz;

        var inner : number = wInfo.x;
        var outer : number = wInfo.y;

        var freq : number = wInfo.z;
        var wave : number = wInfo.w;

        var w2oVec : CVec3 = V3SubV3(_objPos, pos);
        var dist : number = V3Len(w2oVec);

        var range : CVec2 = new CVec2(-0.5, 1.0);

        var hasRange : number = inner + outer < 0.1 ? 0.0 : 1.0;
        var needCalcDir : number = V3Dot(dir, dir) < 0.01 ? 1.0 : 0.0;
        //var hasZVal : number = abs(dir.z) < 0.01 ? 0.0 : 1.0;

        if(hasRange > 0.5) {
            if(outer < dist) {
                continue;   // 바람이 범위 밖에 있음
            }

            if(needCalcDir > 0.5) {
                dir = w2oVec;
            }

            var wRatio : number = smoothstep(0.0, inner, dist) * (1.0 - smoothstep(inner, outer, dist));
            range.y = wRatio;
            range.x = -wRatio * 0.5;
        }

        if(V3Dot(dir, dir) < 0.01) {
            continue;   // dir이 계산 후에 크기가 0이면 패스
        }

        dir = V3Nor(dir);

        var speedFactor : CVec3;
        if(needCalcDir > 0.5) {
            speedFactor = new CVec3(1.0, 1.0, 1.0);
        }
        else {
            speedFactor = dir;
        }
        
        // noise는 반드시 -1 ~ 1사이로 나와야 함, 그 이상 나오는 계산이면 nor필요
        // NoisePerlin2D 파라미터는 0 ~ 1범위임, 1 넘어가면 반복됨, 1.1은 0.1과 같은 값이 나옴
        // var noise : CVec3 = new CVec3(
        //     NoisePerlin2D(new CVec2(V3Dot(_objPos, speedFactor) / -wave, speedFactor.x * freq * _time)),
        //     NoisePerlin2D(new CVec2(V3Dot(_objPos, speedFactor) / -wave, speedFactor.y * freq * _time)),
        //     NoisePerlin2D(new CVec2(V3Dot(_objPos, speedFactor) / -wave, speedFactor.z * freq * _time))
        // );
        var noise : CVec3 = new CVec3(
            NoisePerlin2D(new CVec2(_objPos.x / -wave, speedFactor.x * freq * _time)),
            NoisePerlin2D(new CVec2(_objPos.y / -wave, speedFactor.y * freq * _time)),
            NoisePerlin2D(new CVec2(_objPos.z / -wave, speedFactor.z * freq * _time))
        );

        // 0 ~ 1 범위에서 -0.75 ~ 1.0 범위로 변환
        noise = V3AddV3(V3MulFloat(noise, range.y - range.x), new CVec3(range.x, range.x, range.x));

        // if(_2d>0.5) 
        // {
        //     noise.z = 0.0;  // 3d에서는 z값이 흔들리는게 자연스럽지만 2d에서는 문제생겨서 없앰
        // }

        var windResult : CVec3 = V3MulV3(noise, dir);
        var windPower : CVec3 = V3MulFloat(_size, pow);

        //방향따라 weight 적용
        var useWeight : number = wPos.w;
        if(useWeight > 0.5) {
            var upWeight : number = 1.0;
            var downWeight : number = 1.0;
            var verticalWeight : number = 1.0;

            windResult.x = clamp(windResult.x * verticalWeight, -1.0, 1.0);
            windResult.y = clamp(windResult.y * mix(downWeight, upWeight, step(0.0, windResult.y)), -1.0, 1.0);            
            //windResult.z = clamp(windResult.z * verticalWeight, -1.0, 1.0);
        }

        wind = V3AddV3(wind, V3MulV3(windResult, windPower));
    }

    return wind;
}

export function ApplyWind(_worldPos : CVec4, _skin : number, _weight : CVec4, _time : number) : CVec4 
{
	if(_skin > 0.5 && _weight.x+_weight.y+_weight.z+_weight.w>0.0)
	{
		if(windInfluence > 0.01) {
			var wind : CVec3 = GetWind(_worldPos.xyz, new CVec3(100.0, 100.0, 100.0), _time);
			_worldPos.x += wind.x;
			_worldPos.y += wind.y;
			_worldPos.z += wind.z;
		}
	}
	return _worldPos;
}
