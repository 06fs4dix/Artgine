import { ligCol, ligCount, ligDir } from "./Light";
import { BayerFilter, NoiseValue3, NoiseValue3FBM, NoiseValue3FBMRest } from "./Noise";
import {
    Build, CMat, CVec3, CVec4, Mat4ToMat3, OutColor, OutPosition,
    V3Nor, Vertex3, V4MulMatCoordi, Mat3ToMat4, V3MulFloat,
    V3MulV3, acos, V3Dot, V3SubV3, cos, V3AddV3, V3Mix, smoothstep, sin,
    mod, V3Max, V3Len, SamCubeToColor, max, fract, CVec2, 
    pow, abs, floor, SaturateFloat, 
    Sam2DToV4, FloatToInt, Exp, LWVPMul, 
    clamp, V4Mix, V4AddV4, V4MulFloat, Exp2, ToV3,
    Attribute,
    Null,
    BranchEnd,
    BranchBegin,
    int,
    BranchDefault,
    V2Dot,
    screenPos,
    IntToFloat,
    V2Floor,
    V2AddV2,
    step,
    sqrt,
    min,
    Hash12,
    Hash11,
    mix,
    V2Mod
} from "./Shader"

var worldMat: CMat=Null();
var viewMat: CMat=Null();
var projectMat: CMat=Null();

var out_position: OutPosition=Null();
var out_color: OutColor=Null();

var to_uvw: ToV3=Null();

var time: number = Attribute(0, "time");


var sunColorRTable: CMat = new CMat(1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25);
var sunColorGTable: CMat = new CMat(0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95);
var sunColorBTable: CMat = new CMat(0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85);


var star : number = 1.0;
var starCount: number = 2000.0;
var starSize: number = 0.6;
var starRandCol: CVec3 = new CVec3(0.2, 0.3, 0.9);
var starBaseCol: CVec3 = new CVec3(0.5, 0.5, 0.5);

// 구름 밀도 (0.0: 맑음, 1.0: 매우 흐림)
var cloud : number = 0.4;
// 구름 레이어의 두께 (높을수록 구름이 두껍게 보임)
var cloudHeight : number = 10.0;
// 구름 이동 속도 (높을수록 빠르게 움직임)
var cloudSpeed : CVec3 = new CVec3(0.0, 0.0, 5.0);
// 구름 레이마칭 단계 수 (높을수록 품질이 좋지만 성능 저하)
var cloudStep : number = 16.0;
// 구름이 존재할 수 있는 최대 반지름 (클수록 구름이 멀리 보임)
var cloudPlanetRadius : number = 700.0;
// 구름이 어디서 시작해서 어디부터 완전히 나올지 -1~1
var cloudHorizon : CVec2 = new CVec2(0.0,0.2);
// 구름이 보이는 최대 거리
var cloudMaxDistance : number = 150000.0;


var aurora : number = 1.0;
var auroraSpeed : number = 0.6;
var auroraColor : CVec3 = new CVec3(2.15, -0.5, 1.2);
var auroraHeight : number = 0.0;
var auroraCut : number = 0.0;
var auroraStep : number = 10.0;

var camPos : CVec3=Null();




//진짜 파란 하늘 - 지평선은 밝고 천정은 적당히 어둡게 조정
var SkyColorRTable: CMat = new CMat(0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.015, 0.01, 0.005);
var SkyColorGTable: CMat = new CMat(0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.04, 0.02, 0.01);
var SkyColorBTable: CMat = new CMat(0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15);



Build("Artgine/Shader/CubeObject", [], 
    vs_main, [worldMat, viewMat, projectMat], 
    [out_position,to_uvw], 
    ps_main, [out_color]
);

Build("Artgine/Shader/CubeSky", ["sky"], 
    vs_main_camBased, [worldMat, viewMat, projectMat,time,camPos], 
    [out_position,to_uvw], 
    ps_main, [out_color]
);

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



/************************************************************************************************/
//cloud

// 밀도 계산
function CloudDensity(_pos : CVec3) : number {
    var adjustedWindDir : CVec3 = new CVec3(cloudSpeed.x, -cloudSpeed.y, cloudSpeed.z);
    _pos = V3AddV3(_pos, V3MulFloat(adjustedWindDir, time));

    // const
    var softness : number = 0.05;               // 구름 경계면의 부드러운 정도
    var meterToNoise : number = 0.0212242;      // pos가 meter 단위여서 노이즈맵의 단위로 바꾸기 위한 값, 클수록 구름이 작아지고, 작을수록 구름이 커짐
    var p : CVec3 = V3MulFloat(_pos, meterToNoise);

    var baseNoise : number = NoiseValue3(p);
    if(baseNoise > 0.6) {
        return 0.0;
    }
    
    var noiseFBM : number = NoiseValue3FBMRest(p, baseNoise);
    var dens : number = noiseFBM * smoothstep(cloud + softness, cloud, noiseFBM);
    return SaturateFloat(dens);
}

// 결과값) xyz : 충돌지점, w : 충돌했는지 여부
function RaySphereIntersection(_rayOrg : CVec3, _rayDir : CVec3, _sphereRadius : number, _maxIntersectionDist : number) : CVec4
{
    var b : number = 2.0 * V3Dot(_rayDir, _rayOrg);
    var c : number = V3Dot(_rayOrg, _rayOrg) - _sphereRadius * _sphereRadius;
    var disc : number = b * b - 4.0 * c;
    if(disc < 0.0) return new CVec4(0.0, 0.0, 0.0, 0.0);

    var squareRoot : number = sqrt(disc);
    var t1 : number = (-b - squareRoot) * 0.5;
    var t2 : number = (-b + squareRoot) * 0.5;
    var tMax : number = max(t1, t2);
    if(tMax < 0.0) return new CVec4(0.0, 0.0, 0.0, 0.0);

    var intersectPoint : CVec3 = V3AddV3(_rayOrg, V3MulFloat(_rayDir, tMax));

    if(tMax > _maxIntersectionDist) return new CVec4(intersectPoint, 0.0);
    return new CVec4(intersectPoint, 1.0);
}

function Cloud(_viewDir : CVec3) : CVec4 {
    var cameraPos : CVec3 = new CVec3(0.0, 1.0, 0.0);

    // yBlend
    var yBlend : number = smoothstep(cloudHorizon.x, cloudHorizon.y, _viewDir.y);
    if(yBlend < 0.01) return new CVec4(0.0, 0.0, 0.0, 0.0);
    yBlend = yBlend * yBlend;

    var intersection : CVec4 = RaySphereIntersection(cameraPos, _viewDir, cloudPlanetRadius, cloudMaxDistance);
    if(intersection.w < 0.5) return new CVec4(0.0, 0.0, 0.0, 0.0);

    // 레이마칭 변수
    var sampleCount : number = cloudStep;
    var raymarchStepSize : number = cloudHeight / sampleCount;
    var raymarchStepVector : CVec3 = V3MulFloat(_viewDir, raymarchStepSize);

    // 디더링
    var ditherVal : number = BayerFilter(screenPos.xy);
    var posInCloudVolume : CVec3 = V3AddV3(intersection.xyz, V3MulFloat(raymarchStepVector, ditherVal));

    // 축적 변수
    var transmitance : number = 1.0;
    var color : number = 0.0;
    var alpha : number = 0.0;

    for(var i = 0; i < FloatToInt(sampleCount); i++) {
        // 베이스 밀도 샘플링(가벼움)
        var dens : number = CloudDensity(posInCloudVolume);

        if(dens > 0.01) {
            var lightSample : number = dens * raymarchStepSize;

            // 투과율 계산, 1.442695는 Exp와 Exp2의 차이
            var transmitance_i : number = Exp(-lightSample);
            transmitance *= transmitance_i;

            color += transmitance * dens * raymarchStepSize;
            alpha += (1.0 - transmitance_i) * (1.0 - alpha);
        }

        if(transmitance < 0.01) break;
        posInCloudVolume = V3AddV3(posInCloudVolume, raymarchStepVector);
    }

    color *= yBlend;
    alpha *= yBlend;


    // if(V3Len(V3SubV3(intersection.xyz,new CVec3(0.0,1000.0,0.0)))<500.0)
    //     return new CVec4(1.0, 1.0, 1.0, 1.0);


    return new CVec4(color, color, color, alpha);
}

/************************************************************************************************/
//TriNoise 텍스쳐 사용하면 더 빠름
function Aurora(_viewDir : CVec3, _height : number, _cut : number, _color : CVec3, _steps : number) : CVec4 {
    var col : CVec4 = new CVec4(0.0, 0.0, 0.0, 0.0);
    var eye : CVec3 = new CVec3(0.0, 0.0, _height);
    
    var avgCol : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
    eye = V3MulFloat(eye, 1e-5);
    var mt : number = 10.0;

    var i : number = 0.0;
    for(; i < _steps; i++) {
        var of : number = 0.006 * Hash12(_viewDir.xy) * smoothstep(0.0, 15.0, i*mt);
        var pt : number = ((0.8 + pow(i*mt, 1.4) * 0.001) - eye.y) / (_viewDir.y * 2.0 + 0.4);
        pt -= of;
        var bpos : CVec3 = V3AddV3(eye, V3MulFloat(_viewDir, pt));
        var p : CVec2 = new CVec2(bpos.z, bpos.x);
        var rzt : number = NoiseValue3FBM(new CVec3(p, 0.06 * time));
        var col2 : CVec4 = new CVec4(0.0,0.0,0.0,rzt);
        col2.rgb = V3MulFloat(new CVec3(
            sin(1.0-_color.x + (i*mt) * 0.053) * 0.5*mt,
            sin(1.0-_color.y + (i*mt) * 0.053) * 0.5*mt,
            sin(1.0-_color.z + (i*mt) * 0.053) * 0.5*mt
        ), rzt);
        avgCol = V4Mix(avgCol, col2, 0.5);
        col = V4AddV4(col, V4MulFloat(avgCol, Exp2(-i *mt* 0.065 - 2.5) * smoothstep(0.0, 5.0, i*mt)));
    }

    return V4MulFloat(col, clamp(_viewDir.y * 15.0 - _cut, 0.0, 1.0) * 2.8);
}

/************************************************************************************************/
//star
function StarDir(_cosTheta: number, _sinTheta: number, _phi: number): CVec3 {
    return new CVec3(_sinTheta * cos(_phi), _sinTheta * sin(_phi), _cosTheta);
}

function Stars(_viewDir: CVec3, _count: number, _size : number, _baseCol : CVec3, _randCol : CVec3): CVec3 {
    var PI2 : number = 6.283185;

    var theta: number = acos(_viewDir.z);
    var width: number = 3.141592 / _count;
    var level: number = floor((theta / 3.141592) * _count);

    //영향을 미칠 수 있는 레벨 범위
    var maxAffectLevel : number = cos(width * 7.0);
    //최소 크기랑 동일함
    var minAffectLevel : number = cos(width * 0.5);

    var result: CVec3 = new CVec3(0.0, 0.0, 0.0);
    var yBlend : number = smoothstep(0.0, 0.2, _viewDir.y);
    if(yBlend < 0.01) {
        return result;
    }
    yBlend = yBlend * yBlend;

    // 9 loop, voronoi로 바꾸면 퀄리티 상승 있지만 어려워보임
    for (var i = -4; i <= 4; i++) {
        var level_i : number = clamp(level + IntToFloat(i), 0.0, _count - 1.0);
        var theta_i : number = (level_i) * width;

        //theta_i가 작거나 PI에 가까울수록(theta가 저위도에서 실제 크기가 작으니까) 별이 많이 생겨서,
        //sin(theta_i)가 0에 가까울수록 별이 덜 생기게 방지함
        //gpu최적화로 if 제거
        var sinTheta : number = sin(theta_i);
        var starMask : number = step(Hash12(new CVec2(theta_i, 0.0)), sinTheta);

        var rnd: number = Hash11(3.141592 + theta_i);
        var phi: number = PI2 * Hash11(level_i);
        var starDir: CVec3 = StarDir(cos(theta_i), sinTheta, phi);

        var cosAngle : number = 0.5 + 0.5 * V3Dot(starDir, _viewDir);
        var size : number = rnd * _size;

        var angleVal : number = 1.0 - cosAngle;
        var lig : number = 5e-6 * size / max(angleVal, 5e-7);
        lig = lig * lig * lig;

        var starVal : number = lig * starMask;
        starVal += smoothstep(cos(width * rnd), 1.0, cosAngle) * 10.0;
        starVal *= smoothstep(maxAffectLevel, minAffectLevel, cosAngle);

        starVal *= yBlend;

        var color : CVec3 = V3MulFloat(new CVec3(0.2, 0.3, 0.9), fract(rnd * 2345.2) * 123.2);
        color = new CVec3(sin(color.x) * 0.5 + 0.5, sin(color.y) * 0.5 + 0.5, sin(color.z) * 0.5 + 0.5);
        color = V3AddV3(V3MulV3(color, _randCol), _baseCol);

        starVal *= sin(time * 3.0 + rnd * 6.2831) * 0.35 + 0.65;
        result = V3AddV3(result, V3MulFloat(color, starVal));
    }

    var starCol : CVec3 = result;
    return starCol;
}

/************************************************************************************************/
function FastSkyColor(_rayDir : CVec3) : CVec3
{
    var maxDir : number = max(_rayDir.y,0.01)*max(_rayDir.y,0.01)*0.5;
	var col : CVec3 = new CVec3(0.22-maxDir,0.55-maxDir,0.935-maxDir);
    col = V3Mix( col, new CVec3(0.595,0.6375,0.7225), pow(1.0-max(_rayDir.y,0.0), 6.0) );
    col = V3AddV3(col, V3MulFloat(new CVec3(0.0,0.1,0.2), clamp((0.1-_rayDir.y)*10.0, 0.0, 1.0)));
    return col;
}

function FastSunColor(_skyCol : CVec3, _rayDir : CVec3, _sunDir : CVec3, _sunCol : CVec3) : CVec3
{
    var sundot : number = clamp(V3Dot(_rayDir,_sunDir),0.0,1.0);

    // 태양 블룸 효과
    _skyCol = V3AddV3(_skyCol, V3MulFloat(V3MulFloat(_sunCol, 0.25),pow( sundot,5.0 )));
    _skyCol = V3AddV3(_skyCol, V3MulFloat(V3MulFloat(V3Mix(_sunCol, new CVec3(1.0,1.0,1.0), 0.5), 0.25),pow( sundot,64.0 )));
    _skyCol = V3AddV3(_skyCol, V3MulFloat(V3MulFloat(V3Mix(_sunCol, new CVec3(1.0,1.0,1.0), 0.9), 0.2),pow( sundot,512.0 )));
    
    // 앰비언트 추가
    _skyCol = V3AddV3(_skyCol, V3MulFloat(V3MulFloat(_sunCol, 0.2), pow( sundot, 8.0 )));

    return _skyCol;
}
/************************************************************************************************/

function ps_main() {
    var fragDir: CVec3 = V3Nor(to_uvw);
    
    
    var value: CVec4;



    // 방향을 16개 구간으로 변환
    var dir_cos: number;
    var dir_deg: number;
    
    // 16개 방향 중 현재 방향에 해당하는 인덱스 계산
    var curIndex: number;
    var curColor: CVec3;
    
    // 다음 구간의 색상 (16번째 구간이면 0번째 구간으로)
    var nextIndex: number;
    var nextColor: CVec3;
    
    // 현재 구간 내에서의 위치 (0.0 ~ 1.0)
    var t: number = 0.0;

    // 두 색상을 선형 보간으로 부드럽게 혼합
    var finalColor: CVec3 = new CVec3(0.0,0.0,0.0);

    BranchBegin("table","T",[SkyColorRTable,SkyColorGTable,SkyColorBTable]);
    // 방향을 16개 구간으로 변환
    dir_cos = V3Dot(fragDir, new CVec3(0.0, 1.0, 0.0));
    dir_deg = (1.0 - dir_cos) * 0.5;
    
    // 16개 방향 중 현재 방향에 해당하는 인덱스 계산
    curIndex = floor(dir_deg * 14.0);
    
    // 현재 구간과 다음 구간의 색상 가져오기
    curColor = new CVec3(
        SkyColorRTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))],
        SkyColorGTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))],
        SkyColorBTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))]
    );
    
    // 다음 구간의 색상 (16번째 구간이면 0번째 구간으로)
    nextIndex = curIndex + 1.0;
    nextColor = new CVec3(
        SkyColorRTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))],
        SkyColorGTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))],
        SkyColorBTable[FloatToInt(floor(nextIndex / 4.0))][FloatToInt(mod(nextIndex, 4.0))]
    );
    
    // 현재 구간 내에서의 위치 (0.0 ~ 1.0)
    t = fract(dir_deg * 14.0);

    // 두 색상을 선형 보간으로 부드럽게 혼합
    finalColor = V3Mix(curColor, nextColor, t);

    BranchDefault();
    finalColor = SamCubeToColor(0.0, to_uvw).xyz;
    //아래서 곱연산으로 처리하려고
    t=-1.0;
    BranchEnd();


    
    var ligSum      : CVec3  = new CVec3(0.0, 0.0, 0.0);
    var ligMax      : CVec3  = new CVec3(0.0, 0.0, 0.0);
    var sunsetCol   : CVec3  = new CVec3(0.0, 0.0, 0.0);
    var sunsetBlend : number = -1.0;
    var lDir : CVec4;
    var lCol : CVec4;
    var dir : CVec3;
    var angle     : number=0.0;
    var intensity : number=0.0;
    var col       : CVec3;
    var i : int;

    var sunPass : number =  0.0;
    var sun_deg : number =  1.0;
    BranchBegin("light","L",[ligDir, ligCol, ligCount,sunColorRTable,sunColorGTable,sunColorBTable]);
    for(i.dummy = 0; i.dummy < 3; i.dummy++) 
    {
        if(i.dummy >= FloatToInt(ligCount)) break;

        lDir = Sam2DToV4(ligDir, i);
        if(lDir.w>1.5) continue;
        dir = V3Nor(lDir.xyz);

        //태양 설정
        if(sunPass < 0.5 && lDir.w > -1.5) {
            sunPass = 1.0;

            //내가 바라보는 픽셀이랑 라이트랑 같으면 최대 컬러 가져옴
            dir_cos  = V3Dot(dir, fragDir);
            dir_deg = (1.0 - dir_cos) * 0.5;

            curIndex = floor(dir_deg * 14.0);
            curColor = new CVec3(
                sunColorRTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))],
                sunColorGTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))],
                sunColorBTable[FloatToInt(floor(curIndex / 4.0))][FloatToInt(mod(curIndex, 4.0))]
            );

            nextIndex = curIndex + 1.0;
            nextColor = new CVec3(
                sunColorRTable[FloatToInt(floor((nextIndex) / 4.0))][FloatToInt(mod(nextIndex, 4.0))],
                sunColorGTable[FloatToInt(floor((nextIndex) / 4.0))][FloatToInt(mod(nextIndex, 4.0))],
                sunColorBTable[FloatToInt(floor((nextIndex) / 4.0))][FloatToInt(mod(nextIndex, 4.0))]
            );

            t = fract(dir_deg * 14.0);
            sunsetCol = V3Mix(curColor, nextColor, t);

            //하늘방향에서 태양이 내려오면 파장이 길어져서 빨개진다.
            //위아래일때 0이고 옆면일때 1이다
            sun_deg = 1.0-abs(V3Dot(dir, new CVec3(0.0, 1.0, 0.0)));
            
            
            sunsetBlend=sun_deg*(1.0-dir_deg);
            
        }

        //일반 광원 색상 누적
        lCol = Sam2DToV4(ligCol, i);
        angle = acos(V3Dot(dir, fragDir));
        intensity  = V3Len(lCol.rgb);
        
        col = V3MulFloat(lCol.rgb, 1.73 / max(intensity, 1e-7));
        col = V3MulFloat(col, 0.02 / max(angle, 1e-8));

        ligMax = V3Max(ligMax, col);
        ligSum = V3AddV3(ligSum, col);
    }
    
    //finalColor = V3Mix(finalColor,sunsetCol,sunsetBlend);
    if(t<0.0)
        finalColor = V3MulV3(finalColor, V3Mix(new CVec3(1.0, 1.0, 1.0), sunsetCol, sunsetBlend));
    else
        finalColor = V3Mix(finalColor, sunsetCol, sunsetBlend);

    finalColor = V3Max(V3AddV3(finalColor, V3MulFloat(ligSum, 0.2)), ligMax);
    BranchEnd();


    BranchBegin("star","S",[star,starCount, starSize, starBaseCol, starRandCol]);
    value.xyz = Stars(fragDir, starCount, starSize, starBaseCol, starRandCol);
    finalColor = V3AddV3(finalColor, V3MulFloat(value.xyz, star));
    BranchEnd();

    
    BranchBegin("aurora","A",[aurora, auroraHeight, auroraCut, auroraColor, auroraStep]);
    value = Aurora(fragDir, auroraHeight, auroraCut, auroraColor, auroraStep);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), V3MulFloat(value.rgb, aurora));
    BranchEnd();

    BranchBegin("cloud","C",[cloud, cloudHeight, cloudSpeed, cloudStep, cloudPlanetRadius, cloudHorizon, cloudMaxDistance]);
    value = Cloud(fragDir);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), value.rgb);
    BranchEnd();

    out_color.rgb = finalColor;
    //out_color.rgb = new CVec3(1.0,1.0,1.0);
    out_color.a = 1.0;
}