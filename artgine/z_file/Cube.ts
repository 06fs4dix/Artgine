import { HSVToRGB, RGBToHSV } from "./ColorFun";
import { ligCol, ligCount, ligDir } from "./Light";
import { NoiseGet } from "./Noise";
import { SDF } from "./SDF";
import {
    Build, CMat, CVec3, CVec4, Mat4ToMat3, OutColor, OutPosition,
    V3Nor, Vertex3, V4MulMatCoordi, Mat3ToMat4, V3MulFloat,
    V3MulV3, acos, V3Dot, V3AddV3, V3Mix, smoothstep, sin,
    mod, V3Max, V3Len, SamCubeToColor, max, fract, CVec2, 
    pow, abs, floor, SaturateFloat, 
    FloatToInt, Exp, LWVPMul, 
    clamp, ToV3,
    Attribute,
    Null,
    BranchEnd,
    BranchBegin,
    int,
    BranchDefault,
    screenPos,
    IntToFloat,
    sqrt,
    V3SubV3,
    mix,
    min,
    Hash13,
    SaturateV3,
    V3Floor,
    V3DivV3,
    V3Fract,
    V3DivFloat,
    V3Min,
    V2Len,
    Sam2DArrToV4,
    ToV4,
    V3Cross,
    cos,
    Hammersley,
    SamCubeSize,
    log2,
    SamCubeLodToColor,
    V3Pow,
} from "./Shader"

var worldMat: CMat=Null();
var viewMat: CMat=Null();
var projectMat: CMat=Null();

var out_position: OutPosition=Null();
var out_color: OutColor=Null();

var to_uvw: ToV3=Null();
var to_worldPos: ToV4=Null();

var time: number = Attribute(0, "time");


var sunColorRTable: CMat = new CMat(1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25);
var sunColorGTable: CMat = new CMat(0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95);
var sunColorBTable: CMat = new CMat(0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85);

// star
// 123 : 별 색상 범위 1의 최소값
// 456 : 별 색상 범위 1의 최대값
// 789 : 별 색상 범위 2의 최소값
// 101112 : 별 색상 범위 2의 최대값
// 13 : 별 최소 사이즈 0-0.5
// 14 : 별 최대 사이즈 0-0.5
// 15 : 별 반짝이는 속도
// 16 : 별 밀도
var starLayer1ColorTable: CMat = new CMat(1.0,0.9,0.7,  1.0,1.0,0.9,  0.8,0.9,1.0,  0.7,0.8,1.0,  0.02, 0.07, 5.0, 2.0);
var starLayer2ColorTable: CMat = new CMat(1.6,0.0,0.0, 1.2,1.0,1.0,  0.0,0.0,1.6, 1.0,1.2,1.0,  0.20, 0.25, 5.0, 0.0);
var starLayer3ColorTable: CMat = new CMat(1.6,0.0,0.0, 1.2,1.0,1.0,  0.0,0.0,1.6, 1.0,1.2,1.0,  0.25, 0.30, 15.0, 0.0);

// Range1: G/K형 (황백~주황)  Range2: A/B형 (백색~청백)
// var starLayer1ColorTable: CMat = new CMat(
//     1.0,0.9,0.7,  1.0,1.0,0.9,    // Range1: 황백 ~ 따뜻한 흰색
//     1.0,1.0,1.0,  0.8,0.9,1.0,    // Range2: 흰색 ~ 청백
//     0.15, 0.20, 10.0, 3.0          // 속도↑ 밀도↓
// );
// var starLayer2ColorTable: CMat = new CMat(
//     1.0,0.75,0.45, 1.0,0.95,0.75, // Range1: 주황 ~ 황백 (K형)
//     1.0,1.0,1.0,   0.75,0.88,1.0, // Range2: 흰색 ~ 청백 (B형)
//     0.20, 0.25, 10.0, 1.5          // 속도↑ 밀도↓
// );
// var starLayer3ColorTable: CMat = new CMat(
//     1.0,0.55,0.25, 1.0,0.85,0.6,  // Range1: 적주황 ~ 주황 (M/K형 거성)
//     0.8,0.9,1.0,   0.65,0.78,1.0, // Range2: 청백 ~ 청색 (O/B형)
//     0.25, 0.30, 20.0, 0.5          // 속도↑, density 0→0.5 (큰 별 소량)
// );

// cloud
var cloudCoverage : number = 0.5;//구름 비율
var cloudStart : number = 15000.0;//구름 시작점
var cloudHeight : number = 10000.0;//구름 높이
var cloudLightDistance : number = 10000.0;//빛 최대 도달 거리

var cloudPlanetRadius : number = 6300000.0;//행성 크기
var cloudSpeed : CVec3 = new CVec3(1.0, 0.0, 0.0);

var cloudStep : number = 32.0;//구름 샘플링 수
var cloudLightStep : number = 4.0;//빛 샘플링 수(가는 방향)

var cloudScale : number = 100000.0;//텍스쳐 패턴 반복 스케일
var cloudExtinction : number = 3.5;//빛의 감쇠/소멸 계수
var cloudScatter : number = 10.0;//산란 계수
var cloudAmbient : number = 0.1;//앰비언트

var cloudDither : number = 0.0;


//aurora
var aurora : number = 0.2;
var auroraSpeed : number = 0.01;
var auroraScale : number = 0.000001;
var auroraColorBot : CVec3 = new CVec3(1.0, 1.0, 0.0);
var auroraColorMid : CVec3 = new CVec3(0.0, 1.0, 0.0);
var auroraColorTop : CVec3 = new CVec3(0.0, 1.0, 0.5);
var auroraOffset : number = 0.1;
var auroraDistort : number = 1.0;
var auroraSmoothness : number = 0.3;
var auroraMin : CVec3 = new CVec3(-20000.0, 15000.0, -20000.0);
var auroraMax : CVec3 = new CVec3(20000.0, 25000.0, 20000.0);
var auroraStep : number = 20.0;

var camPos : CVec3=Null();

var roughness : number;


//진짜 파란 하늘 - 지평선은 밝고 천정은 적당히 어둡게 조정
var SkyColorRTable: CMat = new CMat(0.22, 0.24, 0.27, 0.30,
    0.35, 0.45, 0.60, 0.78,
    0.90, 0.88, 0.85, 0.82,
    0.80, 0.78, 0.76, 0.75);
var SkyColorGTable: CMat = new CMat(0.50, 0.53, 0.56, 0.60,
    0.68, 0.78, 0.88, 0.96,
    1.00, 0.98, 0.96, 0.94,
    0.92, 0.90, 0.88, 0.87);
var SkyColorBTable: CMat = new CMat(0.92, 0.94, 0.96, 0.98,
    1.00, 1.00, 1.00, 1.00,
    1.00, 0.99, 0.98, 0.97,
    0.96, 0.95, 0.94, 0.93);



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

Build("Artgine/Shader/CubeIrradiance", ["irradiance"],
    vs_main_camBased, [worldMat, viewMat, projectMat],
    [out_position,to_uvw],
    ps_main_irradiance, [out_color]
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

// 결과값) xy : 충돌지점까지의 거리, z : 충돌했는지 여부
function RaySphereIntersection(_rayOrg : CVec3, _rayDir : CVec3, _sphere : CVec4) : CVec3
{
    var localPos : CVec3 = V3SubV3(_rayOrg, _sphere.xyz);
    var localPosSqrt : number = V3Dot(localPos, localPos);

    var quadCoef : CVec3 = new CVec3(
        V3Dot(_rayDir, _rayDir),
        2.0 * V3Dot(_rayDir, localPos),
        localPosSqrt - _sphere.w * _sphere.w
    );

    var disc : number = quadCoef.y * quadCoef.y - 4.0 * quadCoef.x * quadCoef.z;
    if(disc >= 0.0) {
        var sqrtDisc : number = sqrt(disc);
        return new CVec3((-quadCoef.y - sqrtDisc) / (2.0 * quadCoef.x), (-quadCoef.y + sqrtDisc) / (2.0 * quadCoef.x), 1.0);
    }
    return new CVec3(0.0, 0.0, 0.0);
}
function Cloud(_viewDir : CVec3, _sunDir : CVec3, _sunCol : CVec3) : CVec4 
{
    // yBlend
    var yBlend : number = smoothstep(0.0, 0.2, _viewDir.y);
    if(yBlend < 0.01) return new CVec4(0.0, 0.0, 0.0, 0.0);
    yBlend = yBlend * yBlend;

    // 뷰 레이
    var rayOrg : CVec3 = camPos;
    var rayDir : CVec3 = _viewDir;

    // 행성
    var planetRadius : number = cloudPlanetRadius;
    var planetCenter : CVec3 = new CVec3(0.0, -planetRadius, 0.0);

    // 레이어
    var bottomRadius : number = planetRadius + cloudStart;
    var topRadius : number = bottomRadius + cloudHeight;

    // 접점 계산
    var tMin : number;
    var tMax : number;
    var tTop : CVec3 = RaySphereIntersection(rayOrg, rayDir, new CVec4(planetCenter, bottomRadius));
    if(tTop.z > 0.5) {
        var tBot : CVec3 = RaySphereIntersection(rayOrg, rayDir, new CVec4(planetCenter, topRadius));
        if(tBot.z > 0.5) {
            var tempTop : number = (tTop.x > 0.0 && tTop.y > 0.0) ? min(tTop.x, tTop.y) : max(tTop.x, tTop.y);
            var tempBot : number = (tBot.x > 0.0 && tBot.y > 0.0) ? min(tBot.x, tBot.y) : max(tBot.x, tBot.y);
            if(tBot.x > 0.0 && tBot.y > 0.0) {
                tempTop = max(0.0, min(tTop.x, tTop.y));
            }
            tMin = min(tempBot, tempTop);
            tMax = max(tempBot, tempTop);
        } else {
            tMin = tTop.x;
            tMax = tTop.y;
        }
    }
    tMin = max(0.0, tMin);
    tMax = max(0.0, tMax);

    // 최대 가시거리 제한
    // var startMaxDistance : number = cloudStartMaxDistance;
    // if(tMax <= tMin || tMin > startMaxDistance) {
    //     return new CVec4(0.0, 0.0, 0.0, 0.0);
    // }

    // 레이마칭 최대 거리 제한

    var marchingDistance : number = tMax - tMin;
    tMax = tMin + marchingDistance;

    // 레이마칭 변수
    var rayMarchStep : number = marchingDistance / cloudStep;
    var rayMarchT : number = tMin + rayMarchStep * 0.5;
    if(cloudDither > 0.5) {
        rayMarchT += rayMarchStep * NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Gaussian);
    }

    // ✅ 라이트(태양) 마칭: 거리/스텝은 뷰길이와 분리
    // 태양이 위라고 가정 (원하면 ligDir로 바꿔도 됨)
    var lightDir : CVec3 = _sunDir;

    // 그림자 추적 거리: 구름 두께 기준으로 제한(너무 멀리 안 감)
    var lightStepSize : number = cloudLightDistance / cloudLightStep;
    var lightStepVector : CVec3 = V3MulFloat(lightDir, lightStepSize);

    // 구름 움직임
    var windScale : number = 0.015; // 1만큼 움직일 때 UV에서 한 프레임에 얼마나 움직일지 결정하는 값
    var wind : CVec3 = V3MulFloat(cloudSpeed, -time * windScale);

    var p : CVec3 = new CVec3(0.0, 0.0, 0.0);

    // ✅ 투과도/누적
    var T : number = 1.0;   // view transmittance
    var acc : CVec3 = new CVec3(0.0,0.0,0.0); // scattered light (grayscale)

    // ✅ 튜닝(NoiseGet 0..1 기준)
    var noiseScale : number = 1.0 / cloudScale;

    // ✅ 가장 중요: 단위 스케일 맞춘 extinction (미터 기반이면 이 근처부터 시작)
    var extinction : number = cloudExtinction / cloudHeight;

    // 밝기 보정(검정/하양 튀는 거 방지)
    var scatterK : number = cloudScatter / cloudHeight;
    var ambient : number = cloudAmbient;

    for(var i = 0; i < FloatToInt(cloudStep); i++)
    {
        // 로그스케일로 거리 계산(덧셈이 아니라 곱셈으로 늘어남, 뒤로 갈수록 거리가 빠르게 멀어짐)
        var samplePos : CVec3 = V3AddV3(rayOrg, V3MulFloat(rayDir, rayMarchT));
        
        var cloudY : number = V3Len(V3SubV3(samplePos, planetCenter)) - bottomRadius;
        var cloudYNorm : number = cloudY / cloudHeight;
        if(cloudYNorm < 0.0 || cloudYNorm > 1.0) {
            continue;  // 구름 밖이면 스킵
        }

        // 동일 단면 유지: y 고정
        p.x = samplePos.x * noiseScale + wind.x;
        p.y = (samplePos.y - cloudStart) * noiseScale + wind.y;
        p.z = samplePos.z * noiseScale + wind.z;

        // 구름이 존재하는지에 대한 FBM이 아닌 노이즈값을 먼저 돌려보고 
        // FBM은 이후에 밀도를 깎는 용도로만 사용하면 퍼포먼스 오를 듯
        var noise : number = NoiseGet(p, SDF.eNoise.PerlinFBM3);
        
        // 연속 밀도(0..1)
        var density : number = noise;//smoothstep(thresh0, thresh1, noise);
        density = ((density - cloudCoverage) / (1.0 - cloudCoverage));
        density *= yBlend;

        if(density > 0.01)
        {
            // ✅ 셀프 쉐도우(T_light)
            var tauL : number = 0.0;
            var poslight : CVec3 = V3AddV3(samplePos, V3MulFloat(lightStepVector, 0.5));

            for(var j = 0; j < FloatToInt(cloudLightStep); j++)
            {
                poslight = V3AddV3(poslight, lightStepVector);

                var ligCloudY : number = V3Len(V3SubV3(poslight, planetCenter)) - bottomRadius;
                var ligCloudYNorm : number = ligCloudY / cloudHeight;
                if(ligCloudYNorm < 0.0 || ligCloudYNorm > 1.0) continue;  // 구름 밖이면 스킵
                
                p.x = poslight.x * noiseScale + wind.x;
                p.y = (poslight.y - cloudStart) * noiseScale + wind.y;
                p.z = poslight.z * noiseScale + wind.z;
                
                var nL : number = NoiseGet(p, SDF.eNoise.PerlinFBM3);
                var dL : number = ((nL - cloudCoverage) / (1.0 - cloudCoverage));
                dL *= yBlend;
                
                tauL += dL * lightStepSize;
            }

            var lightT : number = Exp(-tauL * extinction); // 0..1

            // ✅ 산란 누적(환경광 포함)
            var lit : CVec3 = V3AddV3(V3MulFloat(new CVec3(1.0, 1.0, 1.0), ambient), V3MulFloat(_sunCol, lightT * (1.0 - ambient)));
            acc = V3AddV3(acc, V3MulFloat(lit, T * (density * scatterK) * rayMarchStep));

            // ✅ 뷰 투과도(T_view)
            T *= Exp(-density * extinction * rayMarchStep);

            if(T < 0.05) break;
        }

        rayMarchT += rayMarchStep;
    }

    var alpha : number = 1.0 - T;

    // 과노출 방지: 산란은 알파에 비례시켜 안정화(선택인데 강추)
    //acc *= alpha;
    acc = V3DivV3(acc, V3AddV3(acc, new CVec3(1.0,1.0,1.0)));

    return new CVec4(acc, alpha);
}

/************************************************************************************************/
function Aurora(_viewDir : CVec3) : CVec4 
{
    // 뷰 레이
    var rayOrg : CVec3 = camPos;
    var rayDir : CVec3 = _viewDir;

    var invDir : CVec3 = new CVec3(1.0 / rayDir.x, 1.0 / rayDir.y, 1.0 / rayDir.z);
    
    var t0 : CVec3 = V3MulV3(V3SubV3(auroraMin, rayOrg), invDir);
    var t1 : CVec3 = V3MulV3(V3SubV3(auroraMax, rayOrg), invDir);
    
    var tmin : CVec3 = V3Min(t0, t1);
    var tmax : CVec3 = V3Max(t0, t1);
    
    var tNear : number = max(max(tmin.x, tmin.y), tmin.z);
    var tFar : number = min(min(tmax.x, tmax.y), tmax.z);
    
    if(tNear > tFar || tFar <= 0.0) {
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    }

    var raymarchDistance : number = tFar - tNear;
    var raymarchStepSize : number = raymarchDistance / auroraStep;
    var raymarchStepVector : CVec3 = V3MulFloat(rayDir, raymarchStepSize);

    var curPos : CVec3 = V3AddV3(rayOrg, V3MulFloat(_viewDir, tNear));
    curPos = V3AddV3(curPos, V3MulFloat(raymarchStepVector, 0.5 + NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Blue)));

    var hsvBot : CVec3 = RGBToHSV(auroraColorBot);
    var hsvMid : CVec3 = RGBToHSV(auroraColorMid);
    var hsvTop : CVec3 = RGBToHSV(auroraColorTop);

    // ✅ 투과도/누적
    var Tr : number = 1.0;
    var result : CVec3 = new CVec3(0.0,0.0,0.0);   // view transmittance

    var scaleX : number = (auroraMax.x - auroraMin.x) * auroraScale;
    var scaleZ : number = (auroraMax.z - auroraMin.z) * auroraScale;
    var invBoxSize : CVec3 = new CVec3(1.0 / (auroraMax.x - auroraMin.x), 1.0 / (auroraMax.y - auroraMin.y), 1.0 / (auroraMax.z - auroraMin.z));
    var timeOffset : number = time * auroraSpeed;
    var invHeight : number = 1.0 / (auroraMax.y - auroraMin.y);
    var fadeWidth : number = 0.1 * V2Len(new CVec2(auroraMax.x - auroraMin.x, auroraMax.z - auroraMin.z));

    for(var i = 0; i < FloatToInt(auroraStep); i++)
    {
        var samplePos : CVec3 = curPos;

        var p : CVec3 = new CVec3(
            (samplePos.x - auroraMin.x) * invBoxSize.x,
            0.0,
            (samplePos.z - auroraMin.z) * invBoxSize.z
        );

        var noiseP : number = NoiseGet(p, SDF.eNoise.Perlin);
        var uvDistort : number = noiseP * auroraDistort * 0.5;

        var p1 : CVec3 = new CVec3(
            p.x * scaleX + timeOffset + uvDistort,
            p.z * scaleZ + timeOffset + uvDistort - auroraOffset,
            0.0
        );
        var p2 : CVec3 = new CVec3(
            p1.x,
            p1.y + 2.0 * auroraOffset,
            0.0
        );

        var n1 : number = NoiseGet(p1, SDF.eNoise.Perlin);
        var n2 : number = NoiseGet(p2, SDF.eNoise.Perlin);

        var interpolatedNoise : number = smoothstep(-auroraSmoothness, auroraSmoothness, n1 - n2);

        var intensity : number = 0.2 + clamp(0.5 - abs(interpolatedNoise - 0.5) * 1.5, 0.0, 1.0);
        intensity = clamp(intensity, 0.0, 1.0);
        intensity *= intensity;

        var wave : number = 0.0;
        wave += 0.000767 * intensity;
        intensity *= intensity;
        wave += 0.166504 * intensity;
        intensity *= intensity;
        wave += intensity;

        var h : number = clamp((auroraMax.y - samplePos.y) * invHeight, 0.0, 1.0);
        var hSplit : number = pow(h, 1.8);
        var hInv : number = 1.0 - hSplit;

        var dMin : CVec3 = V3SubV3(samplePos, auroraMin);
        var dMax : CVec3 = V3SubV3(auroraMax, samplePos);
        var edgeDist : number = min(dMin.x, dMin.z);
        edgeDist = min(edgeDist, min(dMax.x, dMax.z));
        edgeDist = clamp(edgeDist / fadeWidth, 0.0, 1.0);

        var density : number = 0.1 * raymarchStepSize * h * wave * edgeDist;
        var stepTr : number = Exp(-density);

        var baseHSV : CVec3;
        if(hSplit < 0.5) baseHSV = V3Mix(hsvBot, hsvMid, smoothstep(0.0, 0.5, hSplit));
        else baseHSV = V3Mix(hsvMid, hsvTop, smoothstep(0.5, 1.0, hSplit));

        var hShift : number = mix(-0.08, 0.12, hInv);
        hShift += NoiseGet(V3MulFloat(p, 0.05), SDF.eNoise.Perlin) * 0.03;

        baseHSV.x = fract(baseHSV.x + hShift * smoothstep(0.25, 0.75, hInv));
        baseHSV.y = clamp(baseHSV.y * (1.0 + wave * 0.4), 0.0, 1.0);
        baseHSV.z = clamp(baseHSV.z * (1.2 + wave), 0.0, 1.5);

        var final : CVec3 = HSVToRGB(baseHSV);

        result = V3AddV3(result, V3MulFloat(final, (1.0 - stepTr) * Tr));
        Tr *= stepTr;

        if(Tr < 0.01) break;

        curPos = V3AddV3(curPos, raymarchStepVector);
    }

    var alpha : number = aurora * (1.0 - Tr);
    return new CVec4(V3MulFloat(result, alpha), alpha);
}

/************************************************************************************************/
//star
function StarLayer(_viewDir : CVec3, _colorTable : CMat) : CVec3
{
    if(_colorTable[3][3] <= 0.0) return new CVec3(0.0, 0.0, 0.0);

    var scale : number = 40.0 * _colorTable[3][3];
    var density : number = 0.04 * _colorTable[3][3];

    var cell : CVec3 = V3Floor(V3MulFloat(_viewDir, scale));
    var local : CVec3 = V3SubV3(V3Fract(V3MulFloat(_viewDir, scale)), new CVec3(0.5,0.5,0.5));

    var h : number = Hash13(cell);
    if(h > density) return new CVec3(0.0, 0.0, 0.0);

    var color : CVec3;
    h /= density;
    if (h < 0.50)   color = V3Mix(new CVec3(_colorTable[0][0], _colorTable[0][1], _colorTable[0][2]), new CVec3(_colorTable[0][3], _colorTable[1][0], _colorTable[1][1]), (h - 0.00) / 0.50);
    else            color = V3Mix(new CVec3(_colorTable[1][2], _colorTable[1][3], _colorTable[2][0]), new CVec3(_colorTable[2][1], _colorTable[2][2], _colorTable[2][3]), (h - 0.50) / 0.50);
    color = V3DivFloat(color, max(1e-4, V3Dot(color, new CVec3(0.2126, 0.7152, 0.0722))));

    var s : number = mix(_colorTable[3][0], _colorTable[3][1], pow(Hash13(V3AddV3(cell, new CVec3(7.3, 7.3, 7.3))), 3.5));
    var d : number = V3Len(local);

    var phase : number = h * 6.2831;
    var speed : number = mix(0.2, 1.2, h);
    var twinkle : number = sin(time * _colorTable[3][2] * speed + phase);
    var twinkle2 : number = sin(time * _colorTable[3][2] * speed * 1.73 + phase * 2.39);
    twinkle = mix(0.75, 1.0, (twinkle * 0.5 + 0.5) * 0.6 + (twinkle2 * 0.5 + 0.5) * 0.4);

    var core : number = smoothstep(s, 0.0, d);
    var glow : number = Exp(-d * 25.0);  // 80→25
    return V3MulFloat(color, twinkle * (core * 8.0 + glow * 4.0));
}
function Star(_viewDir : CVec3) : CVec3
{
    var core : CVec3 = new CVec3(0.0, 0.0, 0.0);
    core = V3AddV3(core, StarLayer(_viewDir, starLayer1ColorTable));
    core = V3AddV3(core, StarLayer(_viewDir, starLayer2ColorTable));
    core = V3AddV3(core, StarLayer(_viewDir, starLayer3ColorTable));
    return core;
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
    
    // ── light branch 변수 선언 ─────────────────────────────────
    var ligSumSun   : CVec3  = new CVec3(0.0, 0.0, 0.0);  // 태양 디스크
    var ligMaxSun   : CVec3  = new CVec3(0.0, 0.0, 0.0);
    var ligSumNight : CVec3  = new CVec3(0.0, 0.0, 0.0);  // 달/기타 디스크
    var ligMaxNight : CVec3  = new CVec3(0.0, 0.0, 0.0);
    var sunsetCol   : CVec3  = new CVec3(0.0, 0.0, 0.0);
    var sunsetBlend : number = -1.0;
    var lDir : CVec4;
    var lCol : CVec4;
    var dir : CVec3;
    var angle     : number=0.0;
    var intensity : number=0.0;
    var col       : CVec3;
    var i : int;
    var sunIntensity : number;

    var sunPass   : number = 0.0;
    var sun_deg   : number = 1.0;
    var isSunDisc : number = 0.0;   // ← 추가: 현재 이터레이션이 태양인지 표시

    BranchBegin("light","L",[ligDir, ligCol, ligCount,sunColorRTable,sunColorGTable,sunColorBTable]);
    for(i.dummy = 0; i.dummy < 3; i.dummy++) 
    {
        if(i.dummy >= FloatToInt(ligCount)) break;

        lDir = Sam2DArrToV4(ligDir, IntToFloat(i));
        if(lDir.w>1.5) continue;
        dir = V3Nor(lDir.xyz);

        lCol = Sam2DArrToV4(ligCol, IntToFloat(i));
        angle = acos(V3Dot(dir, fragDir));
        intensity  = V3Len(lCol.rgb);

        isSunDisc = 0.0;   // ← 리셋

        if(sunPass < 0.5 && lDir.w > -1.5) {
            sunPass  = 1.0;
            isSunDisc = 1.0;   // ← 태양으로 마킹

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
            sun_deg = 1.0-abs(V3Dot(dir, new CVec3(0.0, 1.0, 0.0)));
            sunsetBlend = sun_deg*(1.0-dir_deg);
            sunIntensity = intensity;
        }
        
        col = V3MulFloat(lCol.rgb, 1.73 / max(intensity, 1e-7));
        col = V3MulFloat(col, 0.02 / max(angle, 1e-8));

        // ── 태양/달 디스크를 분리 누적 ─────────────────────────
        if(isSunDisc > 0.5) {
            ligMaxSun = V3Max(ligMaxSun, col);
            ligSumSun = V3AddV3(ligSumSun, col);
        } else {
            ligMaxNight = V3Max(ligMaxNight, col);
            ligSumNight = V3AddV3(ligSumNight, col);
        }
    }
    
    if(t<0.0)
        finalColor = V3MulV3(finalColor, V3Mix(new CVec3(1.0, 1.0, 1.0), sunsetCol, sunsetBlend));
    else
        finalColor = V3Mix(finalColor, sunsetCol, sunsetBlend);

    // 태양 디스크는 구름 앞 — 그대로 적용
    finalColor = V3Max(V3AddV3(finalColor, V3MulFloat(ligSumSun, 0.2)), ligMaxSun);
    BranchEnd();


    // ── 1. Cloud 먼저 ──────────────────────────────────────────
    var cloudAlpha : number = 0.0;
    BranchBegin("cloud","C",[cloudCoverage, cloudDither, cloudStart, cloudHeight, cloudPlanetRadius, cloudSpeed, cloudStep, cloudLightStep, cloudScale, cloudExtinction, cloudScatter, cloudAmbient, cloudLightDistance]);
    value = Cloud(fragDir, dir, lCol.rgb);
    cloudAlpha = value.w;
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - cloudAlpha)), V3MulFloat(value.rgb, cloudAlpha));
    BranchEnd();

    var nightVisMoon : number = SaturateFloat(1.0 - cloudAlpha);        // 달: 선형, 부드럽게
    var nightVis     : number = SaturateFloat(1.0 - cloudAlpha * 1.5);  // 별/오로라: 기존 유지

    // ── 2. 달 디스크 ────────────────────────────────────────────
    finalColor = V3Max(
        V3AddV3(finalColor, V3MulFloat(V3MulFloat(ligSumNight, 0.2), nightVisMoon)),
        V3Mix(finalColor, ligMaxNight, nightVisMoon)
    );
  

    // ── 3. 별 — 구름 뒤, cloudAlpha 마스킹 ────────────────────
    BranchBegin("star","S",[starLayer1ColorTable, starLayer2ColorTable, starLayer3ColorTable]);
    if(sunIntensity<0.99)
    {
        value.rgb = Star(fragDir);
        finalColor = V3AddV3(finalColor, V3MulFloat(value.xyz, SaturateFloat(1.0 - sunIntensity) * nightVis));
        finalColor = SaturateV3(finalColor);
    }
    BranchEnd();

    // ── 4. 오로라 — 구름 뒤, cloudAlpha 마스킹 ────────────────
    BranchBegin("aurora","A",[aurora, auroraSpeed, auroraColorBot, auroraColorMid, auroraColorTop, auroraOffset, auroraDistort, auroraSmoothness, auroraMin, auroraMax, auroraStep,auroraScale]);
    if(sunIntensity<0.99)
    {
        value = Aurora(fragDir);
        finalColor = V3AddV3(finalColor, V3MulFloat(value.rgb, nightVis));
        finalColor = SaturateV3(finalColor);
    }
    
    BranchEnd();

    out_color.rgb = finalColor;
    out_color.a = 1.0;
}

// 큐브맵이기 때문에 spherical 좌표계를 그대로 uvw로 변환 가능
// spherical 좌표계 기준으로 (360, 90, 0)만큼의 샘플을 평균내서 저장
// PI 곱해진 상태로 나오기 때문에 아웃풋 범위는 [0, PI]
function ps_main_irradiance()
{
    var PI : number = 3.14159265359;

    var N : CVec3 = V3Nor(to_uvw);
    var irradiance : CVec3 = new CVec3(0.0, 0.0, 0.0);

    var up : CVec3 = new CVec3(0.0, 1.0, 0.0);
    var right : CVec3 = V3Nor(V3Cross(up, N));
    up = V3Nor(V3Cross(N, right));

    var sampleDelta : number = 0.025;
    var nrSamples : number = 0.0;
    var phi : number = 0.0;
    for(; phi < 2.0 * PI; phi += sampleDelta)
    {
        var sinPhi : number = sin(phi);
        var cosPhi : number = cos(phi);
        
        var theta : number = 0.0;
        for(; theta < 0.5 * PI; theta += sampleDelta)
        {
            var sinTheta : number = sin(theta);
            var cosTheta : number = cos(theta);

            var tangentSample : CVec3 = new CVec3(sinTheta * cosPhi, sinTheta * sinPhi, cosTheta);
            var sampleVec : CVec3 = V3AddV3(V3AddV3(V3MulFloat(right, tangentSample.x), V3MulFloat(up, tangentSample.y)), V3MulFloat(N, tangentSample.z));

            var fragCol : CVec3 = V3MulFloat(SamCubeToColor(0.0, sampleVec).rgb, cosTheta * sinTheta);

            irradiance = V3AddV3(irradiance, fragCol);
            nrSamples += 1.0;
        }
    }

    irradiance = V3MulFloat(irradiance, PI / nrSamples);
    out_color = new CVec4(irradiance, 1.0);
}