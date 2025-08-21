import { ligCol, ligCount, ligDir } from "./Light";
import { 
    NoiseFBM, HashIQ2D, NoiseRand1D, NoiseRand2D, NoiseTri2D 
} from "./Noise";
import {
    Build, CMat, CVec3, CVec4, Mat4ToMat3, OutColor, OutPosition,
    V3Nor, Vertex3, V4MulMatCoordi, Mat3ToMat4, V3MulFloat,
    V3MulV3, acos, V3Dot, V3SubV3, cos, V3AddV3, V3Mix, smoothstep, sin,
    mod, V3Max, V3Len, SamCubeToColor, min, max, fract, CVec2, 
    pow, abs, floor, SaturateFloat, 
    Sam2DToV4, Sam2DMat, Sam2DToMat, FloatToInt, Exp, LWVPMul, 
    clamp, V4Mix, V4AddV4, V4MulFloat, Exp2, ToV3,
    TexSizeHalfInt,
    Attribute,
    Null,
    BranchEnd,
    BranchBegin
} from "./Shader"

var worldMat: CMat=Null();
var viewMat: CMat=Null();
var projectMat: CMat=Null();

var out_position: OutPosition=Null();
var out_color: OutColor=Null();

var to_uvw: ToV3=Null();

var time: number = Attribute(0, "time");

var horizon: number = 0.54;
var sunset: number = 0.1;

var RTable: Sam2DMat = new Sam2DMat(9);
var GTable: Sam2DMat = new Sam2DMat(9);
var BTable: Sam2DMat = new Sam2DMat(9);

var sunRTable: CMat=Null();
var sunGTable: CMat=Null();
var sunBTable: CMat=Null();

var tableNum: number = 0.0;
var colorNum: number = 0.0;

var totalIntensity : number = 1.0;

var sunColorNum : number = 0.0;

var star : number = 1.0;
var starCount: number = 2000.0;
var starSize: number = 0.6;
var starRandCol: CVec3 = new CVec3(0.2, 0.3, 0.9);
var starBaseCol: CVec3 = new CVec3(0.5, 0.5, 0.5);

// 구름 밀도 (0.0: 맑음, 1.0: 매우 흐림)
var cloud : number = 0.3;
// 구름 레이어의 두께 (높을수록 구름이 두껍게 보임)
var cloudHeight : number = 10.0;
// 구름 이동 속도 (높을수록 빠르게 움직임)
var cloudSpeed : number = 0.1;
// 구름 레이마칭 단계 수 (높을수록 품질이 좋지만 성능 저하)
var cloudStep : number = 50.0;
// 구름이 존재할 구형 공간의 중심점
var cloudPlanetCenter : CVec3 = new CVec3(0.0, 0.0, 0.0);
// 구름이 존재할 수 있는 최대 반지름 (클수록 구름이 멀리 보임)
var cloudPlanetRadius : number = 500.0;
// 구름이 어디서 시작해서 어디부터 완전히 나올지 -1~1
var cloudHorizon : CVec2 = new CVec2(0.0,0.2);



var sunsetXYRatio : number = 0.0;
var sunsetRadius : number = 0.25;

var aurora : number = 1.0;
var auroraColor : CVec3 = new CVec3(2.15, -0.5, 1.2);
var auroraHeight : number = 0.0;
var auroraCut : number = 0.0;
var auroraStep : number = 10.0;

var camPos : CVec3=Null();




//진짜 파란 하늘 - 지평선은 밝고 천정은 적당히 어둡게 조정
var SkyColorRTable: CMat = new CMat(0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.015, 0.01, 0.005);
var SkyColorGTable: CMat = new CMat(0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.04, 0.02, 0.01);
var SkyColorBTable: CMat = new CMat(0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15);



Build("CubeObject", [], 
    vs_main, [worldMat, viewMat, projectMat], 
    [out_position,to_uvw], 
    ps_main, [out_color]
);

Build("CubeSky", ["sky"], 
    vs_main_camBased, [worldMat, viewMat, projectMat], 
    [out_position,to_uvw], 
    ps_main, [out_color]
);
Build("CubeTable", ["table"], 
    vs_main_camBased, [worldMat, viewMat, projectMat,
        
        SkyColorRTable,SkyColorGTable,SkyColorBTable,

        time,camPos,
    ], 
    [out_position,to_uvw], 
    ps_main_table, [out_color]
);

// Build("CubeSkyGradient", ["gradient"], vs_main_camBased, [
//     worldMat, viewMat, projectMat,

//     camPos,

//     horizon, sunset,

//     ligDir, ligCol, ligCount,
//     totalIntensity,

//     RTable, GTable, BTable, 
//     tableNum, colorNum,

//     sunRTable, sunGTable, sunBTable, sunColorNum,

//     starCount, starRandCol, starBaseCol, starSize,

//     cloudy, cloudHeight, cloudSpeed, cloudStep, cloudPlanetCenter, cloudPlanetRadius,

//     sunsetXYRatio, sunsetRadius,

//     auroraColor, auroraHeight, auroraCut, auroraStep,

//     time
// ], [out_position,to_uvw], ps_main_skyGradient, [out_color]);

function vs_main(f3_ver: Vertex3) {
    to_uvw = f3_ver;

    out_position = LWVPMul(f3_ver, worldMat, viewMat, projectMat);
}

function vs_main_camBased(f3_ver: Vertex3) {
    to_uvw = f3_ver;

    var v4: CVec4 = new CVec4(f3_ver, 1.0);

    //view에서 eye position 제거함(스카이박스 끝에 닫는거 방지)
    var P: CVec4 = V4MulMatCoordi(v4, Mat3ToMat4(Mat4ToMat3(viewMat)));
    P = V4MulMatCoordi(P, projectMat);

    //z값 1로 고정 => 마지막 랜더패스에 랜더링해서 depth test하면 빈공간에만 스카이박스 랜더링됨
    //만약 z값이 1로 고정된 다른 물체 있으면 depth test를 less대신 lequal로 바꿔야함
    out_position = new CVec4(P.x, P.y, P.w, P.w);
}



function ps_main() {
    var uvw : CVec3 = V3Nor(to_uvw);

    var aCol : CVec3 = SamCubeToColor(0.0, uvw).xyz;

    //var bCol : CVec3 = SamCubeToColor(1, uvw).xyz;
    //var mixCol : CVec3 = V3Mix(aCol, bCol, blendFactor);
	//out_color.rgb = ApplyFog(mixCol, fogColor, lowerFog, upperFog, uvw);

    out_color.rgb=aCol.xyz;
    //out_color.rgb=new CVec3(1.0,1.0,1.0);
    out_color.a = 1.0;
}































/************************************************************************************************/
//cloud

//fbm 텍스쳐로 사용하면 더 빠름(대신 해상도에 따라 여러 장 준비해야 최적의 성능 나옴)
function GetDensity(_pos : CVec3, _wind : CVec3, _cov : number) : number {
    var p : CVec3 = V3AddV3(V3MulFloat(_pos, 0.0212242), _wind);
    var dens : number = NoiseFBM(p, 2.76434);

    var cov : number = _cov;
    dens *= smoothstep(cov + 0.05, cov, dens);
    dens = SaturateFloat(dens);

    return dens;
}

//atmosphere 범위 고정해둠
//플레이어 중심으로 구성해서 origin이 무조건 000임, 만약 구름을 플레이어와 분리하려면 플레이어 기준에서의 위치를 찾아야 함.
//이전 프레임의 구름을 가져와서 사용할 수 있으면 한 프레임에 1 / 16씩 업데이트해서 성능 최적화 가능
function GetCloud(_eye : CVec3, _dir : CVec3, _cloudy : number, _height : number, _windSpeed : number, _step : number, _planetCenter : CVec3, _planetRadius : number) : CVec4 {
    var eye : CVec3 = new CVec3(0.0,1.0,0.0);//new CVec3(0.0, _eye.y, 0.0);
    var atmosphereCenter : CVec3 = _planetCenter;
    var atmosphereRadius : number = _planetRadius;

    var impact : CVec3;

    var radius2 : number = atmosphereRadius * atmosphereRadius;
    var L : CVec3 = V3SubV3(eye, atmosphereCenter);
    var a : number = V3Dot(_dir, _dir);
    var b : number = 2.0 * V3Dot(_dir, L);
    var c : number = V3Dot(L, L) - radius2;

    var discR : number = b*b - 4.0*c*a;
    if(discR < 0.0) {
        //no hit
        return new CVec4(0.0,0.0,0.0,0.0);
    }
    var t : number = max(0.0, (-b + pow(discR, 0.5)) * 0.5);
    if(t < 0.0) {
        return new CVec4(0.0,0.0,0.0,0.0);
    }

    impact = V3AddV3(eye, V3MulFloat(_dir, max(0.0, t)));

    var thickness : number = _height;
    var steps : number = _step;
    var march_steps : number = thickness / steps;

    //y값으로 나누면 y = 1인 같은 높이에 나옴
    var projection : CVec3 = _dir;//V3MulFloat(_dir, 1.0 / _dir.y);
    var iter : CVec3 = V3MulFloat(projection, march_steps);

    var pos : CVec3 = impact;
    var transmitance : number = 1.0;
    var C : CVec3 = new CVec3(0.0,0.0,0.0);
    var alpha : number = 0.0;
    var wind : CVec3 = new CVec3(0.0, 0.0, time * _windSpeed);

    var i : number = 0.0;
    for(; i < steps; i++) {
        //calc dens
        var dens : number = GetDensity(pos, wind, _cloudy);
        //y=0에서 자연스럽게 사라지게 하기 위해서 블렌딩함
        var yBlend : number = smoothstep(cloudHorizon.x, cloudHorizon.y, _dir.y);
        dens *= yBlend * yBlend;

        //투과도(구름 뒤가 얼마나 보이는지 정도) 너무 낮아지면 브레이크
        var transmitance_i : number = Exp(-1.0 * dens * march_steps);
        //y=0으로 갈때 자연스럽게 사라지도록 y값 제곱 곱해줌
        transmitance *= transmitance_i;
        if(transmitance < 0.01) {
            break;
        }

        var result : number = transmitance * dens * march_steps;
        C = V3AddV3(C,new CVec3(result,result,result));
        alpha += (1.0 - transmitance_i) * (1.0 - alpha);

        pos = V3AddV3(pos, iter);
    }

    //0 ~ 0.2는 잘라냄
    return new CVec4(C, alpha);
}

/************************************************************************************************/
//TriNoise 텍스쳐 사용하면 더 빠름
function Aurora(_dir : CVec3, _height : number, _cut : number, _color : CVec3, _steps : number) : CVec4 {
    var eye : CVec3 = new CVec3(0.0, 0.0, _height);
    var col : CVec4 = new CVec4(0.0, 0.0,0.0,0.0);
    var avgCol : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
    eye = V3MulFloat(eye, 1e-5);
    var mt : number = 10.0;

    var i : number = 0.0;
    for(; i < _steps; i++) {
        var of : number = 0.006 * HashIQ2D(_dir.xy) * smoothstep(0.0, 15.0, i*mt);
        var pt : number = ((0.8 + pow(i*mt, 1.4) * 0.001) - eye.y) / (_dir.y * 2.0 + 0.4);
        pt -= of;
        var bpos : CVec3 = V3AddV3(eye, V3MulFloat(_dir, pt));
        var p : CVec2 = new CVec2(bpos.z, bpos.x);
        var rzt : number = NoiseTri2D(p, 0.06, time);
        var col2 : CVec4 = new CVec4(0.0,0.0,0.0,rzt);
        col2.rgb = V3MulFloat(new CVec3(
            sin(1.0-_color.x + (i*mt) * 0.053) * 0.5*mt,
            sin(1.0-_color.y + (i*mt) * 0.053) * 0.5*mt,
            sin(1.0-_color.z + (i*mt) * 0.053) * 0.5*mt
        ), rzt);
        avgCol = V4Mix(avgCol, col2, 0.5);
        col = V4AddV4(col, V4MulFloat(avgCol, Exp2(-i *mt* 0.065 - 2.5) * smoothstep(0.0, 5.0, i*mt)));
    }

    return V4MulFloat(col, clamp(_dir.y * 15.0 - _cut, 0.0, 1.0) * 2.8);
}

/************************************************************************************************/
//star
function GetDir(_theta: number, _phi: number): CVec3 {
    return V3Nor(new CVec3(
        sin(_theta) * cos(_phi),
        sin(_theta) * sin(_phi),
        cos(_theta)
    ));
}

function GetDistFromStar(_dir: CVec3, _starDir : CVec3) : number {
    return 0.5 + 0.5 * V3Dot(_starDir, _dir);
}

//별 거리, 반지름, 밝기
function GetGlow(_angle: number, _radius: number, _flare : number, _theta_diff : CVec3): number {
    //분모 0 안나오게 방지
    var lig : number = pow(5e-6 * _radius / max(_angle, 5e-7), 1.5);

    //ray 생성 - 잘 안되서 일단 보류
    //var rays : number = max(0.0, 1.0 - abs(_theta_diff.x*_theta_diff.y*starDepth));
    //lig += rays * _flare;

    return lig;
}

function GetStars(_dir: CVec3, _count: number, _size : number, _baseCol : CVec3, _randCol : CVec3): CVec3 {
    var theta: number = acos(_dir.z);
    var width: number = 3.141592 / _count;
    var level: number = floor((theta / 3.141592) * _count);

    //영향을 미칠 수 있는 레벨 범위
    var maxAffectLevel : number = cos(width * 7.0);
    //최소 크기랑 동일함
    var minAffectLevel : number = cos(width * 0.5);

    //10칸까지 그림(10칸 이상의 크기가 되면 이상하게 보임)
    var result: CVec3 = new CVec3(0.0, 0.0, 0.0);
    var i: number = -10.0;
    for (; i <= 10.0; i++) {
        var level_i : number = min(_count - 1.0, max(0.0, level + i));
        var theta_i : number = (level_i) * width;

        //theta_i가 작거나 PI에 가까울수록(theta가 저위도에서 실제 크기가 작으니까) 별이 많이 생겨서,
        //sin(theta_i)가 0에 가까울수록 별이 덜 생기게 방지함
        if (sin(theta_i) <= NoiseRand2D(new CVec2(theta_i, 0.0))) {
            continue;
        }

        var rnd: number = NoiseRand1D(3.141592 + theta_i);
        var phi: number = 3.141592 * 2.0 * NoiseRand1D(level_i);
        var starDir: CVec3 = GetDir(theta_i, phi);
        var cosAngle : number = GetDistFromStar(_dir, starDir);

        var size : number = rnd * _size;

        //star intensity
        var star : number = GetGlow(1.0 - cosAngle, size, smoothstep(0.9, 1.0, rnd) * 0.6, V3SubV3(_dir, starDir));
        //star 크기를 띠크기보다 작게 줄임, i 늘리면 바꿔야함
        star += smoothstep(cos(width * rnd), cos(0.0), cosAngle) * 10.0;
        //최대 띠크기보다 커지지 않도록 조절
        star *= smoothstep(maxAffectLevel, minAffectLevel, cosAngle);
        //y값 블렌딩
        var yBlend : number = smoothstep(0.0, 0.2, _dir.y);
        star *= yBlend * yBlend;

        //random color
        var color : CVec3 = V3MulFloat(new CVec3(0.2, 0.3, 0.9), fract(rnd * 2345.2) * 123.2);
        //map to 0 ~ 1
        color = new CVec3(sin(color.x) * 0.5 + 0.5, sin(color.y) * 0.5 + 0.5, sin(color.z) * 0.5 + 0.5);
        color = V3AddV3(V3MulV3(color, _randCol), _baseCol);

        //flicker
        star *= sin(time * 3.0 + rnd * 6.2831) * 0.35 + 0.65;

        result = V3AddV3(result, V3MulFloat(color, star));
    }

    var starCol : CVec3 = result;
    return starCol;
}

/************************************************************************************************/
function GetSkyByColTable(
    _dirDeg : number,
    _colNum : number, _tableFract : number,
    _rT : CMat, _gT : CMat, _bT : CMat,
    _rTNext : CMat, _gTNext : CMat, _bTNext : CMat
): CVec3 {
    //top bottom sky color
    var sliceNum: number = _colNum - 1.0;
    var colorOffset: number = min(floor(sliceNum * _dirDeg), sliceNum - 1.0);

    var cur_upSkyCol: CVec3 = new CVec3(
        _rT[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))],
        _gT[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))],
        _bT[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))]
    );
    var next_upSkyCol: CVec3 = new CVec3(
        _rTNext[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))],
        _gTNext[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))],
        _bTNext[FloatToInt(floor(colorOffset / 4.0))][FloatToInt(mod(colorOffset, 4.0))]
    );
    next_upSkyCol = V3Mix(cur_upSkyCol, next_upSkyCol, 0.5);
    var upSkyCol: CVec3 = V3Mix(cur_upSkyCol, next_upSkyCol, smoothstep(
        0.0, 0.5,
        abs(_tableFract - 0.5)
    ));

    var cur_downSkyCol: CVec3 = new CVec3(
        _rT[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))],
        _gT[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))],
        _bT[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))]
    );
    var next_downSkyCol: CVec3 = new CVec3(
        _rTNext[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))],
        _gTNext[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))],
        _bTNext[FloatToInt(floor((colorOffset + 1.0) / 4.0))][FloatToInt(mod(colorOffset + 1.0, 4.0))]
    );
    next_downSkyCol = V3Mix(cur_downSkyCol, next_downSkyCol, 0.5);
    var downSkyCol: CVec3 = V3Mix(cur_downSkyCol, next_downSkyCol, smoothstep(
        0.0, 0.5,
        abs(_tableFract - 0.5)
    ));

    //blending final
    var skyCol: CVec3 = V3Mix(upSkyCol, downSkyCol, smoothstep(
        colorOffset, colorOffset + 1.0,
        min(sliceNum * _dirDeg, sliceNum - 1.0)
    ));

    return skyCol;
}

// function ps_main_skyGradient() {
//     //view Direction
//     var fragDir: CVec3 = V3Nor(to_uvw);

//     //sunset 초기화
//     var sunPass : number =  0.0;
//     var sun_cos : number = -1.0;
//     var sun_deg : number =  1.0;

//     var ligSum      : CVec3  = new CVec3(0.0, 0.0, 0.0);
//     var ligMax      : CVec3  = new CVec3(0.0, 0.0, 0.0);
//     var sunsetCol   : CVec3  = new CVec3(0.0, 0.0, 0.0);
//     var sunsetBlend : number = 0.0;

//     for(var i = 0; i < TexSizeHalfInt; i++) {
//         if(i >= FloatToInt(ligCount)) break;

//         var lDir : CVec4 = Sam2DToV4(ligDir, i);
//         if(lDir.w>1.5) continue;

//         //태양 설정
//         if(sunPass < 0.5 && lDir.w > -1.5) {
//             sunPass = 1.0;
//             sun_cos = V3Dot(lDir.xyz, new CVec3(0.0, 1.0, 0.0));
//             sun_deg = (1.0 - sun_cos) * 0.5;

//             var sunDir : CVec3 = V3Nor(lDir.xyz);
//             var sun_a : number = V3Dot(sunDir, new CVec3(0.0, 1.0, 0.0));

//             //석양 색상 테이블 인덱스 계산
//             var sun_theta   : number = acos(sun_a);
//             var sunXdir_cos : number = V3Dot(sunDir, fragDir);
//             var sunXdir_deg : number = (1.0 - sunXdir_cos) * 4.0;
//             var sunSliceNum : number = sunColorNum - 1.0;
//             var sunOffset   : number = min(floor(sunSliceNum * sunXdir_deg), sunSliceNum - 1.0);
    
//             var sunset_upCol: CVec3 = new CVec3(
//                 sunRTable[FloatToInt(floor(sunOffset / 4.0))][FloatToInt(mod(sunOffset, 4.0))],
//                 sunGTable[FloatToInt(floor(sunOffset / 4.0))][FloatToInt(mod(sunOffset, 4.0))],
//                 sunBTable[FloatToInt(floor(sunOffset / 4.0))][FloatToInt(mod(sunOffset, 4.0))]
//             );
//             var sunset_downCol: CVec3 = new CVec3(
//                 sunRTable[FloatToInt(floor((sunOffset + 1.0) / 4.0))][FloatToInt(mod(sunOffset + 1.0, 4.0))],
//                 sunGTable[FloatToInt(floor((sunOffset + 1.0) / 4.0))][FloatToInt(mod(sunOffset + 1.0, 4.0))],
//                 sunBTable[FloatToInt(floor((sunOffset + 1.0) / 4.0))][FloatToInt(mod(sunOffset + 1.0, 4.0))]
//             );
    
//             sunsetCol = V3Mix(sunset_upCol, sunset_downCol, smoothstep(
//                 sunOffset, sunOffset + 1.0,
//                 min(sunSliceNum * sunXdir_deg, sunSliceNum - 1.0)
//             ));

//             sunsetBlend = smoothstep(sunset, 0.0, abs(sun_theta - horizon)) * smoothstep(sunsetRadius, 0.05, sunXdir_deg) * smoothstep(sunsetXYRatio, 0.0, abs(sunDir.y - fragDir.y)) * smoothstep(2.0, 0.0, totalIntensity);
//         }

//         //일반 광원 색상 누적
//         var lCol      : CVec4  = Sam2DToV4(ligCol, i);
//         var dir       : CVec3  = V3Nor(lDir.xyz);
//         var angle     : number = acos(V3Dot(dir, fragDir));
//         var intensity : number = V3Len(lCol.rgb);
//         var col       : CVec3  = V3MulFloat(lCol.rgb, 1.73 / max(intensity, 1e-7));
//         col = V3MulFloat(col, 0.02 / max(angle, 1e-8));
//         ligMax = V3Max(ligMax, col);
//         ligSum = V3AddV3(ligSum, col);
//     }

//     //기본 하늘 색상 계산
//     var dir_cos         : number = V3Dot(fragDir, new CVec3(0.0, 1.0, 0.0));
//     var dir_deg         : number = (1.0 - dir_cos) * 0.5;
//     var table           : number = tableNum * sun_deg;
//     var tableOffset     : number = min(floor(table), tableNum - 1.0);
//     var tableFract      : number = fract(table * 0.9999999); //1되면 fract 0되서 문제생김
//     var nextTableOffset : number = clamp(tableFract < 0.5 ? tableOffset - 1.0 : tableOffset + 1.0, 0.0, tableNum - 1.0);

//     var rTable: CMat = Sam2DToMat(RTable, tableOffset);
//     var gTable: CMat = Sam2DToMat(GTable, tableOffset);
//     var bTable: CMat = Sam2DToMat(BTable, tableOffset);

//     var next_rTable: CMat = Sam2DToMat(RTable, nextTableOffset);
//     var next_gTable: CMat = Sam2DToMat(GTable, nextTableOffset);
//     var next_bTable: CMat = Sam2DToMat(BTable, nextTableOffset);

//     //skyCol
//     var skyCol : CVec3 = GetSkyByColTable(dir_deg, colorNum, tableFract, rTable, gTable, bTable, next_rTable, next_gTable, next_bTable);
//     skyCol = V3Mix(skyCol,sunsetCol,sunsetBlend);
//     skyCol = V3Max(V3AddV3(skyCol, V3MulFloat(ligSum, 0.2)), ligMax);

//     //하늘임
//     if(fragDir.y > 0.0) 
//     {
//         //밤하늘 처리
//         if(totalIntensity <= 0.1) {
//             var nightBlend : number = smoothstep(0.1, 0.0, totalIntensity);
//             //별이 존재함
//             if(starSize > 0.0) {
//                 var star: CVec3 = GetStars(fragDir, starCount, starSize, starBaseCol, starRandCol);
//                 skyCol = V3AddV3(skyCol, V3MulFloat(star, nightBlend));
//             }

//             //오로라
//             var aurora : CVec4 = Aurora(fragDir, auroraHeight, auroraCut, auroraColor, auroraStep);
//             skyCol = V3AddV3(V3MulFloat(skyCol, (1.0 - aurora.w)), V3MulFloat(aurora.rgb, nightBlend));
//         }

//         //cloud
//         if(cloudy > 0.0) {
//             var cloud: CVec4 = GetCloud(camPos, fragDir, cloudy, cloudHeight, cloudSpeed, cloudStep, cloudPlanetCenter, cloudPlanetRadius);

//             //멀리 있는 구름 자연스럽게 자름
//             skyCol = V3Mix(skyCol, V3MulFloat(cloud.rgb, 1.0 / max(1e-5, cloud.w)), cloud.w);
//         }
//     }

//     out_color.rgb = skyCol;
//     out_color.w = 1.0;
// }


function ps_main_table() {
    var fragDir: CVec3 = V3Nor(to_uvw);
    
    // 방향을 16개 구간으로 변환
    var dir_cos: number = V3Dot(fragDir, new CVec3(0.0, 1.0, 0.0));
    var dir_deg: number = (1.0 - dir_cos) * 0.5;
    
    // 16개 방향 중 현재 방향에 해당하는 인덱스 계산
    var directionIndex: number = floor(dir_deg * 14.0);
    
    
    
    // 현재 구간과 다음 구간의 색상 가져오기
    var currentColor: CVec3 = new CVec3(
        SkyColorRTable[FloatToInt(floor(directionIndex / 4.0))][FloatToInt(mod(directionIndex, 4.0))],
        SkyColorGTable[FloatToInt(floor(directionIndex / 4.0))][FloatToInt(mod(directionIndex, 4.0))],
        SkyColorBTable[FloatToInt(floor(directionIndex / 4.0))][FloatToInt(mod(directionIndex, 4.0))]
    );
    
    // 다음 구간의 색상 (16번째 구간이면 0번째 구간으로)
    var nextIndex: number = directionIndex + 1.0;
    var nextColor: CVec3 = new CVec3(
        SkyColorRTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))],
        SkyColorGTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))],
        SkyColorBTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))]
    );
    
    
    // 현재 구간 내에서의 위치 (0.0 ~ 1.0)
    var t: number = fract(dir_deg * 14.0);

    // 두 색상을 선형 보간으로 부드럽게 혼합
    var finalColor: CVec3 = V3Mix(currentColor, nextColor, t);
    
    var value: CVec4;
    
    
    
    BranchBegin("star","S",[star,starCount, starSize, starBaseCol, starRandCol]);
    value.xyz = GetStars(fragDir, starCount, starSize, starBaseCol, starRandCol);
    finalColor = V3AddV3(finalColor, V3MulFloat(value.xyz, star));
    BranchEnd();

    
    BranchBegin("aurora","A",[aurora,auroraHeight, auroraCut, auroraColor, auroraStep]);
    value = Aurora(fragDir, auroraHeight, auroraCut, auroraColor, auroraStep);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), V3MulFloat(value.rgb, aurora));
    BranchEnd();
    BranchBegin("cloud","C",[cloud, cloudHeight, cloudSpeed, cloudStep, cloudPlanetCenter, cloudPlanetRadius,cloudHorizon]);
    value = GetCloud(camPos, fragDir, cloud, cloudHeight, cloudSpeed, cloudStep, cloudPlanetCenter, cloudPlanetRadius);
        //멀리 있는 구름 자연스럽게 자름
    finalColor = V3Mix(finalColor, V3MulFloat(value.rgb, 1.0 / max(1e-5, value.w)), value.w);
    BranchEnd();

    out_color.rgb = finalColor;
    //out_color.rgb = new CVec3(1.0,1.0,1.0);
    out_color.a = 1.0;
}