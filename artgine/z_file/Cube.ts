import { ligCol, ligCount, ligDir } from "./Light";
import { BayerFilter, NoiseGet } from "./Noise";
import { SDF } from "./SDF";
import {
    Build, CMat, CVec3, CVec4, Mat4ToMat3, OutColor, OutPosition,
    V3Nor, Vertex3, V4MulMatCoordi, Mat3ToMat4, V3MulFloat,
    V3MulV3, acos, V3Dot, cos, V3AddV3, V3Mix, smoothstep, sin,
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
    screenPos,
    IntToFloat,
    step,
    sqrt,
    Hash12,
    Hash11,
    V3SubV3,
    mix,
    V2MulFloat,
    V3Cross,
    min,
    V2AddV2,
    Hash13,
    SaturateV3,
    Sam2DToColor,
    V3Abs,
    V3Pow,
    V3Floor,
    V3DivV3,
    V2Fract,
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

// star
var star : number = 1.0;
var starSize: number = 80.0;

// cloud
// var cloudCoverage : number = 0.55;
var cloudStart : number = 15000.0;
var cloudHeight : number = 10000.0;
var cloudPlanetRadius : number = 6300000.0;
var cloudSpeed : CVec3 = new CVec3(0.0, 0.0, 0.0);
var cloudStep : number = 16.0;
var cloudLightStep : number = 8.0;
//var cloudLinear : number = 0.0;
var cloudStartMaxDistance : number = 1500000.0;
var cloudTracingMaxDistance : number = 500000.0;
var cloudScale : number = 100000.0;
var cloudExtinction : number = 0.00035;
var cloudScatter : number = 0.001;
var cloudAmbient : number = 0.1;
var cloudDetailRange : number = 0.3;
var cloudDither : number = 1.0;

//aurora
var aurora : number = 1.0;
var auroraStart : number = 15000.0;
var auroraHeight : number = 500000.0;
var auroraPlanetRadius : number = 6300000.0;
var auroraStep : number = 10.0;
var auroraStartMaxDistance : number = 1500000.0;
var auroraTracingMaxDistance : number = 500000.0;
var auroraScale : number = 100000.0;
var auroraColor : CVec3 = new CVec3(2.15, -0.5, 1.2);


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
    var startMaxDistance : number = cloudStartMaxDistance;
    if(tMax <= tMin || tMin > startMaxDistance) {
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    }

    // 레이마칭 최대 거리 제한
    var traceMaxDistance : number = cloudTracingMaxDistance;
    var marchingDistance : number = min(traceMaxDistance, tMax - tMin);
    tMax = tMin + marchingDistance;

    // 로그스케일 변수
    var ratio : number = tMax / tMin;
    var logStepRatio : number = pow(ratio, 1.0 / cloudStep);

    // ✅ 라이트(태양) 마칭: 거리/스텝은 뷰길이와 분리
    // 태양이 위라고 가정 (원하면 ligDir로 바꿔도 됨)
    var lightDir : CVec3 = _sunDir;

    // 그림자 추적 거리: 구름 두께 기준으로 제한(너무 멀리 안 감)
    var shadowLen : number = cloudHeight * 1.5;
    var lightStepSize : number = shadowLen / (1.0 + cloudLightStep);
    var lightStepVector : CVec3 = V3MulFloat(lightDir, lightStepSize);

    // 구름 움직임
    var windScale : number = 0.015; // 1만큼 움직일 때 UV에서 한 프레임에 얼마나 움직일지 결정하는 값
    var wind : CVec3 = V3MulFloat(cloudSpeed, -time * windScale);

    //dither
    var curDist : number;
    if(cloudDither > 0.5) {
        var dither : number = BayerFilter(screenPos.xy);
        curDist = tMin * pow(logStepRatio, 0.5 + dither);
    }
    else {
        curDist = tMin * pow(logStepRatio, 0.5);
    }

    var p : CVec3 = new CVec3(0.0, 0.0, 0.0);

    // ✅ 투과도/누적
    var T : number = 1.0;   // view transmittance
    var acc : CVec3 = new CVec3(0.0,0.0,0.0); // scattered light (grayscale)

    // ✅ 튜닝(NoiseGet 0..1 기준)
    var noiseScale : number = 1.0 / cloudScale;

    // density 추출 임계(0..1)
    var thresh0 : number = 0.45;
    var thresh1 : number = 0.65;

    // ✅ 가장 중요: 단위 스케일 맞춘 extinction (미터 기반이면 이 근처부터 시작)
    var extinction : number = cloudExtinction;

    // 밝기 보정(검정/하양 튀는 거 방지)
    var gg : number = cloudScatter * cloudScatter;
    var scatterK : number = cloudScatter;//(1.0 - gg) / pow(1.0 + gg - 2.0 * cloudScatter * V3Dot(_viewDir, _sunDir), 1.5);
    var ambient : number = cloudAmbient;

    for(var i = 0; i < FloatToInt(cloudStep); i++)
    {
        // 로그스케일로 거리 계산(덧셈이 아니라 곱셈으로 늘어남, 뒤로 갈수록 거리가 빠르게 멀어짐)
        var samplePos : CVec3 = V3AddV3(rayOrg, V3MulFloat(rayDir, curDist));
        var nextDist : number = curDist * logStepRatio;
        var stepLength : number = nextDist - curDist;
        
        var cloudY : number = V3Len(V3SubV3(samplePos, planetCenter)) - bottomRadius;
        var cloudYNorm : number = cloudY / cloudHeight;
        if(cloudYNorm < 0.0 || cloudYNorm > 1.0) {
            continue;  // 구름 밖이면 스킵
        }

        // 동일 단면 유지: y 고정
        p.x = samplePos.x * noiseScale + wind.x;
        p.y = samplePos.y * noiseScale + wind.y;
        p.z = samplePos.z * noiseScale + wind.z;

        // 구름이 존재하는지에 대한 FBM이 아닌 노이즈값을 먼저 돌려보고 
        // FBM은 이후에 밀도를 깎는 용도로만 사용하면 퍼포먼스 오를 듯
        var noise : number;
        // if(cloudLinear < 0.5) {
            if(cloudYNorm < cloudDetailRange) noise = NoiseGet(p, SDF.eNoise.FBM);
            else noise = NoiseGet(p, SDF.eNoise.Perlin);
        // }
        // else {
        //     if(cloudYNorm < cloudDetailRange) noise = NoiseGet(p, SDF.eNoise.FBMLinear);
        //     else noise = NoiseGet(p, SDF.eNoise.PerlinLinear);
        // }

        // 연속 밀도(0..1)
        var density : number = smoothstep(thresh0, thresh1, noise);
        density *= yBlend;

        if(density > 0.001)
        {
            // ✅ 셀프 쉐도우(T_light)
            var tauL : number = 0.0;
            var poslight : CVec3 = V3AddV3(samplePos, V3MulFloat(lightStepVector, 0.5));
            //var lightStep : number = floor(mix(2.0, cloudLightStep, smoothstep(0.0, 0.5, density)));    // 밀도가 낮으면 어짜피 시각적으로 중요한 스텝이 아니니 라이트 스텝도 줄여줌

            for(var j = 0; j < FloatToInt(cloudLightStep); j++)
            {
                poslight = V3AddV3(poslight, lightStepVector);

                var ligCloudY : number = V3Len(V3SubV3(poslight, planetCenter)) - bottomRadius;
                var ligCloudYNorm : number = ligCloudY / cloudHeight;
                if(ligCloudYNorm < 0.0 || ligCloudYNorm > 1.0) continue;  // 구름 밖이면 스킵
                
                p.x = poslight.x * noiseScale + wind.x;
                p.y = poslight.y * noiseScale + wind.y;
                p.z = poslight.z * noiseScale + wind.z;
                
                var nL : number;
                //if(cloudLinear < 0.5) {
                    if(ligCloudYNorm < cloudDetailRange) nL = NoiseGet(p, SDF.eNoise.FBM);
                    else nL = NoiseGet(p, SDF.eNoise.Perlin);
                // }
                // else {
                //     if(ligCloudYNorm < cloudDetailRange) nL = NoiseGet(p, SDF.eNoise.FBMLinear);
                //     else nL = NoiseGet(p, SDF.eNoise.PerlinLinear);
                // }
                var dL : number = smoothstep(thresh0, thresh1, nL);
                
                tauL += dL * lightStepSize;
            }

            var lightT : number = Exp(-tauL * extinction); // 0..1

            // ✅ 산란 누적(환경광 포함)
            var lit : CVec3 = V3AddV3(V3MulFloat(new CVec3(1.0, 1.0, 1.0), ambient), V3MulFloat(_sunCol, lightT * (1.0 - ambient)));
            acc = V3AddV3(acc, V3MulFloat(lit, T * (density * scatterK) * stepLength));

            // ✅ 뷰 투과도(T_view)
            T *= Exp(-density * extinction * stepLength);

            if(T < 0.05) break;
        }

        curDist = nextDist;
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
    // yBlend
    var yBlend : number = smoothstep(0.0, 0.2, _viewDir.y);
    if(yBlend < 0.01) return new CVec4(0.0, 0.0, 0.0, 0.0);
    yBlend = yBlend * yBlend;

    // 뷰 레이
    var rayOrg : CVec3 = camPos;
    var rayDir : CVec3 = _viewDir;

    // 행성
    var planetRadius : number = auroraPlanetRadius;
    var planetCenter : CVec3 = new CVec3(0.0, -planetRadius, 0.0);

    // 레이어
    var bottomRadius : number = planetRadius + auroraStart;
    var topRadius : number = bottomRadius + auroraHeight;

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
    var startMaxDistance : number = auroraStartMaxDistance;
    if(tMax <= tMin || tMin > startMaxDistance) {
        return new CVec4(0.0, 0.0, 0.0, 0.0);
    }

    // 레이마칭 최대 거리 제한
    var traceMaxDistance : number = auroraTracingMaxDistance;
    var marchingDistance : number = min(traceMaxDistance, tMax - tMin);
    tMax = tMin + marchingDistance;

    // 레이마칭 변수
    var raymarchStepSize : number = marchingDistance / auroraStep;
    var raymarchStepVector : CVec3 = V3MulFloat(_viewDir, raymarchStepSize);

    var curPos : CVec3 = V3AddV3(rayOrg, V3MulFloat(_viewDir, tMin));

    var p : CVec3 = new CVec3(0.0, 0.0, 0.0);

    // density 추출 임계(0..1)
    var thresh0 : number = 0.3;
    var thresh1 : number = 0.7;

    // ✅ 투과도/누적
    var T : number = 0.0;   // view transmittance
    var acc : CVec3 = new CVec3(0.0, 0.0, 0.0); // scattered light

    // ✅ 튜닝(NoiseGet 0..1 기준)
    var noiseScale : number = 1.0 / auroraScale;

    for(var i = 0; i < FloatToInt(auroraStep); i++)
    {
        var samplePos : CVec3 = V3AddV3(curPos, V3MulFloat(raymarchStepVector, 0.5));

        var altitude : number = V3Len(V3SubV3(samplePos, planetCenter)) - bottomRadius;
        var altitudeNorm : number = altitude / auroraHeight;
        if(altitudeNorm < 0.0 || altitudeNorm > 1.0) {
            continue;  // 구름 밖이면 스킵
        }

        var edgeFade : number = smoothstep(0.0, 0.2, altitudeNorm) * (1.0 - smoothstep(0.7, 1.0, altitudeNorm));

        // 동일 단면 유지: y 고정
        p.x = samplePos.x * noiseScale;
        p.y = samplePos.y * noiseScale;
        p.z = samplePos.z * noiseScale;

        var warp : number = NoiseGet(p, SDF.eNoise.Perlin);
        var pWarped : CVec3 = new CVec3(p.x + warp * 0.3, p.y * 0.05, p.z + warp * 0.3);

        var n1 : number = NoiseGet(pWarped, SDF.eNoise.Perlin);
        var n2 : number = NoiseGet(V3MulFloat(pWarped, 2.0), SDF.eNoise.Voronoi);

        // 연속 밀도(0..1)
        var density : number = smoothstep(thresh0, thresh1, n1 * (1.0 - n2));

        if(density > 0.01) {
            acc = V3AddV3(acc, V3MulFloat(auroraColor, density * T));
            T += density;
        }
    }

    acc = V3DivV3(acc, V3AddV3(acc, new CVec3(1.0, 1.0, 1.0)));

    var alpha : number = 1.0 - T;
    return new CVec4(acc, alpha);
}

/************************************************************************************************/
//star

function Stars(_viewDir : CVec3) : CVec3
{    
    var weights : CVec3 = V3Abs(_viewDir);
    weights = V3Pow(weights, 4.0);
    weights = V3MulFloat(weights, 1.0 / (weights.x + weights.y + weights.z));

    var uvY : CVec2 = new CVec2(_viewDir.x * 4.0, _viewDir.z * 4.0);
    var uvX : CVec2 = new CVec2(_viewDir.z * 4.0, _viewDir.y * 4.0);
    var uvZ : CVec2 = new CVec2(_viewDir.x * 4.0, _viewDir.y * 4.0);

    var colY : CVec3 = Sam2DToColor(2.0, uvY).rgb;
    var colX : CVec3 = Sam2DToColor(2.0, uvX).rgb;
    var colZ : CVec3 = Sam2DToColor(2.0, uvZ).rgb;

    var col : CVec3 = V3AddV3(V3AddV3(V3MulFloat(colX, weights.x), V3MulFloat(colY, weights.y)), V3MulFloat(colZ, weights.z));

    var lightIntensity : number = col.x * 0.299 + col.y * 0.587 + col.z * 0.114;
    if(lightIntensity < 0.1) return new CVec3(0.0, 0.0, 0.0);

    var starID : number = Hash13(V3MulFloat(V3Floor(V3MulFloat(_viewDir, starSize)), 0.25/starSize));
    return V3MulFloat(col, sin(time * (2.0 + starID * 4.0) + starID * 6.2831) * 0.35 + 0.65);
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


    BranchBegin("star","S",[star, starSize]);
    value.rgb = Stars(fragDir);
    finalColor = V3AddV3(finalColor, V3MulFloat(value.xyz, star));
    finalColor = SaturateV3(finalColor);
    BranchEnd();
    
    BranchBegin("aurora","A",[aurora, auroraStart, auroraHeight, auroraPlanetRadius, auroraStep, auroraStartMaxDistance, auroraTracingMaxDistance, auroraScale, auroraColor]);
    value = Aurora(fragDir);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), V3MulFloat(value.rgb, aurora));
    BranchEnd();

    BranchBegin("cloud","C",[cloudStart, cloudHeight, cloudPlanetRadius, cloudSpeed, cloudStep, cloudLightStep, cloudStartMaxDistance, cloudTracingMaxDistance, cloudScale, cloudExtinction, cloudScatter, cloudAmbient, cloudDetailRange, cloudDither]);
    value = Cloud(fragDir, dir, lCol.rgb);
    //finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)), value.rgb);
    finalColor = V3AddV3(V3MulFloat(finalColor, (1.0 - value.w)),V3MulFloat(value.rgb, value.w));
    BranchEnd();

    out_color.rgb = finalColor;
    //out_color.rgb = new CVec3(1.0,1.0,1.0);
    out_color.a = 1.0;
}