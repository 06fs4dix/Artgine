import { ligDir, ligMask } from "./Light";
import { SDF } from "./SDF";
import { abs, clamp, CMat3, CVec2, CVec3, CVec4, FloatToInt, fract, max, min, mix, round, Sam2DArrMat, Sam2DArrSize, Sam2DArrToColor, Sam2DArrToMat, Sam2DArrToV4, Sam2DArrV4, Sam2DToColor, ShadowPosToUv, 
    sin, sqrt, TransposeMat3, V2AddV2, V2DivFloat, V2Dot, V2MulFloat, V2MulV2, V3Abs, V3AddV3, V3Dot, V3Len, V3MulFloat, V3MulMat3Normal, V3Nor, V3SubV3, V3ToMat3, V4MulMatCoordi } from "./Shader";

export var shadowNearCasV0: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowNearCasV0);
export var shadowFarCasP0: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowFarCasP0);
export var shadowTopCasV1: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowTopCasV1);
export var shadowBottomCasP1: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowBottomCasP1);
export var shadowLeftCasV2: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowLeftCasV2);
export var shadowRightCasP2: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowRightCasP2);
export var shadowPointProj: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowPointProj);

//shadow uniform
export var shadowOn : number = -1.0;
export var shadowReadList: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4ShadowReadList);

//uniform
export var texture16f : number =0;

//아래 두개는 쉐도우맵 곗수. 케스케이드 유무이다 총 3장 사용
export var shadowCount : number = 0;
export var shadowWrite : CVec3 = new CVec3(0,0,0);

//최대 쉐도우 색상
export var shadowRate : number = 0.3;
//오차범위 : 이걸 높이면 더 많은 오차를 그림자 영역으로 만듬
export var bias : number = 5.0;
//노말값에서 보정받을 오차범위(빛에 방향으로 인해 오차가 생기는걸 보정받음)
export var normalBias : number = 1.0;
//percentage-closer filtering 
//경계면을 샘플링 해서 다듬는다. 다듬는 횟수
export var PCF : number = 2.0;
export var jitter : number = 0.0;

// 2D 해시 → 2D 난수 (0~1) 생성
function Hash22(p : CVec2) : CVec2
{
    // 화면좌표/격자 좌표 등 연속 좌표와 잘 맞는 정사영 해시
    // (정수 변환 없이 dot+sin 기반이라 WebGL 정밀도에서 안정적)
    var n1 : number = V2Dot(p, new CVec2(127.1, 311.7));
    var n2 : number = V2Dot(p, new CVec2(269.5, 183.3));
    var h1 : number = fract(sin(n1) * 43758.5453);
    var h2 : number = fract(sin(n2) * 43758.5453);
    return new CVec2(h1, h2);
}
// 프래그먼트(또는 화면) 좌표 기반 난수 지터 (-0.5 ~ 0.5)
function randomJitter(fragCoord : CVec2,_strength : number) : CVec2
{
    // 기존 시그니처/반환 범위를 유지해 ApplyPCF에 바로 연동 가능
    var h : CVec2 = Hash22(fragCoord);
    return new CVec2((h.x - 0.5)*_strength, (h.y - 0.5)*_strength);
}
function ApplyPCF(_uvZ0 : CVec3, _uvZ1 : CVec3, _uvZ2 : CVec3, _read : CVec4, _biasConst : number, _biasSlope : number, _world : CVec4) : number
{
    var f16Bias : number = SDF.FloatTex16 > 0 ? abs(_uvZ0.z) * (2.0 / 1024.0) : 0.0;

    // 평지 공통 바이어스(캐스케이드 동일) + 경사 의존 바이어스(텍셀 크기 배율 1/4/16).
    // 평지(경사0)에서는 _biasSlope=0 이라 세 캐스케이드 바이어스가 같아져 그림자 위치가 정렬된다.
    var bias0 : number = _biasConst + _biasSlope * 1.0;
    var bias1 : number = _biasConst + _biasSlope * 4.0;
    var bias2 : number = _biasConst + _biasSlope * 16.0;

    var texSize : CVec3 = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
    var texScale : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);

    // ★ cascade 선택은 중심 UV로만 판정 (PCF 횟수 무관)
    var cas0Valid : number = (_read.y > -0.5 && _uvZ0.x > 0.0 && _uvZ0.y > 0.0 && _uvZ0.x < 1.0 && _uvZ0.y < 1.0) ? 1.0 : 0.0;
    var cas1Valid : number = (_read.z > -0.5 && _uvZ1.x > 0.0 && _uvZ1.y > 0.0 && _uvZ1.x < 1.0 && _uvZ1.y < 1.0) ? 1.0 : 0.0;
    var cas2Valid : number = (_read.w > -0.5 && _uvZ2.x > 0.0 && _uvZ2.y > 0.0 && _uvZ2.x < 1.0 && _uvZ2.y < 1.0) ? 1.0 : 0.0;

    // 캐스케이드 전이 밴드 (각 캐스케이드 UV 기준, 독립 튜너블).
    // 박스 최소거리(min) 대신 중심으로부터의 방사거리를 써서 사각 경계(각짐)를 완화한다.
    // cas0 는 박스가 작아(2w) blendEdge0 가 0.5 에 닿으면 순수 영역이 사라지므로 0.4 로 둔다.
    // cas1↔cas2 는 해상도 차가 커 더 넓게 섞어야 자연스러워서 따로 키운다.
    var blendEdge0 : number = 0.4;  // cas0↔cas1 (cas0 UV) : world 0.8w
    var blendEdge1 : number = 0.2;  // cas1↔cas2 (cas1 UV) : world 1.6w - 차이 크면 더 키울 것

    var cen0 : CVec2 = new CVec2(_uvZ0.x - 0.5, _uvZ0.y - 0.5);
    var r0 : number = sqrt(V2Dot(cen0, cen0));   // 0(중심) ~ 0.707(모서리)
    var blend0 : number = (cas0Valid > 0.5) ? clamp((0.5 - r0) / blendEdge0, 0.0, 1.0) : 0.0;

    var cen1 : CVec2 = new CVec2(_uvZ1.x - 0.5, _uvZ1.y - 0.5);
    var r1 : number = sqrt(V2Dot(cen1, cen1));
    var blend1 : number = (cas1Valid > 0.5) ? clamp((0.5 - r1) / blendEdge1, 0.0, 1.0) : 0.0;

    var sVal0 : number = 0.0;
    var sVal1 : number = 0.0;
    var sVal2 : number = 0.0;

    var x : number = -PCF;
    for(; x <= PCF + 0.5; x += 1.0)
    {
        var y : number = -PCF;
        for(; y <= PCF + 0.5; y += 1.0)
        {
            var uv0N : CVec3 = new CVec3(_uvZ0.x + x * texScale.x, _uvZ0.y + y * texScale.y, _read.y);
            var uv1N : CVec3 = new CVec3(_uvZ1.x + x * texScale.x, _uvZ1.y + y * texScale.y, _read.z);
            var uv2N : CVec3 = new CVec3(_uvZ2.x + x * texScale.x, _uvZ2.y + y * texScale.y, _read.w);

            if(jitter > 0.01)
            {
                var jitterVal : CVec2 = V2MulV2(randomJitter(new CVec2(x + _world.x, y + _world.y), jitter), texScale);
                uv0N.xy = V2AddV2(uv0N.xy, jitterVal);
            }

            // ★ 개별 샘플 범위 벗어나면 1.0(빛)으로 처리 — cascade 선택엔 영향 없음
            if(cas0Valid > 0.5)
            {
                if(uv0N.x > 0.0 && uv0N.y > 0.0 && uv0N.x < 1.0 && uv0N.y < 1.0)
                {
                    var sp0 : CVec4 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv0N);
                    sVal0 += (sp0.w == 0.0) ? 0.0 : ((_uvZ0.z + bias0 + f16Bias) >= sp0.z ? 0.0 : 1.0);
                }
                // else: 범위 밖 샘플은 0.0(빛) 기여 — sVal0 증가 없음
            }

            if(cas1Valid > 0.5)
            {
                if(uv1N.x > 0.0 && uv1N.y > 0.0 && uv1N.x < 1.0 && uv1N.y < 1.0)
                {
                    var sp1 : CVec4 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv1N);
                    sVal1 += (sp1.w == 0.0) ? 0.0 : ((_uvZ1.z + bias1 + f16Bias) >= sp1.z ? 0.0 : 1.0);
                }
            }

            if(cas2Valid > 0.5)
            {
                if(uv2N.x > 0.0 && uv2N.y > 0.0 && uv2N.x < 1.0 && uv2N.y < 1.0)
                {
                    var sp2 : CVec4 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv2N);
                    sVal2 += (sp2.w == 0.0) ? 0.0 : ((_uvZ2.z + bias2 + f16Bias) >= sp2.z ? 0.0 : 1.0);
                }
            }
        }
    }

    var gridCount : number = (2.0 * PCF + 1.0) * (2.0 * PCF + 1.0);
    var res0 : number = 1.0 - sVal0 / gridCount;
    var res1 : number = 1.0 - sVal1 / gridCount;
    var res2 : number = 1.0 - sVal2 / gridCount;


    // 보수적 블렌딩: 미세 캐스케이드가 (occluder 가 박스 밖이라) 그림자를 잃는 경우
    // 거친 캐스케이드의 그림자를 유지하도록 거친 쪽보다 밝아지지 않게 클램프(min).
    // 미세 쪽이 더 어두우면(디테일 추가) 기존처럼 부드럽게 섞인다.
    if(cas0Valid > 0.5 && cas1Valid > 0.5) return min(min(mix(res1, res0, blend0), res1), (cas2Valid > 0.5) ? res2 : 1.0);
    if(cas0Valid > 0.5)                    return res0;
    if(cas1Valid > 0.5 && cas2Valid > 0.5) return min(mix(res2, res1, blend1), res2);
    if(cas1Valid > 0.5)                    return res1;
    if(cas2Valid > 0.5)                    return res2;
    return 1.0;
}
function ProcessCascadeLevel(_isActive : number, _viewMatOff : Sam2DArrMat, _projMatOff : Sam2DArrMat, _world : CVec4, _shadowIndex : number) : CVec3
{
    if(_isActive < -0.5) return new CVec3(0.0, 0.0, 0.0);
    var viewPos : CVec4 = V4MulMatCoordi(_world, Sam2DArrToMat(_viewMatOff, _shadowIndex));
    var shadowPos : CVec4 = V4MulMatCoordi(viewPos, Sam2DArrToMat(_projMatOff, _shadowIndex));
    return new CVec3(ShadowPosToUv(shadowPos).xy, viewPos.z);
}
function CalcShadowDirectional(_read : CVec4, _index : number, _world : CVec4, _ligDir : CVec4, _bias: CVec2) : number
{
    var uvZ0 : CVec3=ProcessCascadeLevel(_read.y, shadowNearCasV0, shadowFarCasP0, _world, _index);
    var uvZ1 : CVec3=ProcessCascadeLevel(_read.z, shadowTopCasV1, shadowBottomCasP1, _world, _index);
    var uvZ2 : CVec3=ProcessCascadeLevel(_read.w, shadowLeftCasV2, shadowRightCasP2, _world, _index);
    return ApplyPCF(uvZ0, uvZ1, uvZ2, _read, _bias.x, _bias.y, _world);
}

function CubeToUV(_cubeUVW : CVec3, _texelSize : CVec2, _nearTexOff : number) : CVec3
{
    var absDir : CVec3 = V3Abs(_cubeUVW);

    var scaleToCube : number = 1.0 / max(absDir.x, max(absDir.y, absDir.z));
    absDir = V3MulFloat(absDir, scaleToCube);

    _cubeUVW = V3MulFloat(_cubeUVW, scaleToCube);
    // _cubeUVW = V3MulFloat(_cubeUVW, scaleToCube * (1.0 - 2.0 * _texelSize.y));

    if(absDir.x >= absDir.y && absDir.x >= absDir.z) {
        if(_cubeUVW.x > 0.0) _cubeUVW = new CVec3(_cubeUVW.z, _cubeUVW.y, SDF.eShadow.Near);   // Near(+X)
        else _cubeUVW = new CVec3(-_cubeUVW.z, _cubeUVW.y, SDF.eShadow.Far);                    // Far(-X)
    }
    else if(absDir.y >= absDir.x && absDir.y >= absDir.z) {
        if(_cubeUVW.y > 0.0) _cubeUVW = new CVec3(_cubeUVW.x, _cubeUVW.z, SDF.eShadow.Top);    // Top(+Y)
        else _cubeUVW = new CVec3(_cubeUVW.x, -_cubeUVW.z, SDF.eShadow.Bottom);                // Bottom(-Y)
    }
    else {
        if(_cubeUVW.z > 0.0) _cubeUVW = new CVec3(-_cubeUVW.x, _cubeUVW.y, SDF.eShadow.Left);  // Left(+Z)
        else _cubeUVW = new CVec3(_cubeUVW.x, _cubeUVW.y, SDF.eShadow.Right);                  // Right(-Z)
    }
    _cubeUVW.xy = V2AddV2(V2MulFloat(_cubeUVW.xy, 0.5), new CVec2(0.5, 0.5));
    _cubeUVW.z += _nearTexOff - SDF.eShadow.Near;
    return _cubeUVW;
}
function CalcShadowPoint(_read : CVec4, _index : number, _world : CVec4, _ligDir : CVec4, _bias: CVec2) : number
{
    var shadowCamNear : number = _read.z;
    var shadowCamFar : number = _read.w;

    var ligToPos : CVec3 = V3SubV3(_world.xyz, _ligDir.xyz);
    var ligToPosLength : number = V3Len(ligToPos);

    var sVal : number = 1.0;
    if(ligToPosLength <= shadowCamFar && ligToPosLength >= shadowCamNear)
    {
        var depth : number = (ligToPosLength - shadowCamNear) / (shadowCamFar - shadowCamNear);
        var ligDir : CVec3 = V3Nor(ligToPos);

        var texSize : CVec3 = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
        var texScale : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);

        var pcf: number = max(PCF + 1.0, 1.0);
        var offset : number = 0.01;

        sVal = 0.0;
        var x: number = -offset;
        for(; x < offset; x += offset / (pcf * 0.5)) {
            var y: number = -offset;
            for(; y < offset; y += offset / (pcf * 0.5)) {
                var z: number = -offset;
                for(; z < offset; z += offset / (pcf * 0.5)) {
                    var uvw : CVec3 = CubeToUV(V3AddV3(ligDir, new CVec3(x, y, z)), texScale, _read.y);
                    var sp : CVec4 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uvw);
                    sVal += (sp.w == 0.0) ? 1.0 : (depth >= sp.z ? 0.0 : 1.0);
                }
            }
        }
        sVal /= (PCF + 1.0) * (PCF + 1.0);
        
    }
    return sVal;
}

export function CalcShadow(_shadowIndex: number, _normal: CVec3, _world: CVec4): number
{
    // shadowRead
    var shadowRead: CVec4 = Sam2DArrToV4(shadowReadList, _shadowIndex);

    // light 정보
    var lDir: CVec4 = Sam2DArrToV4(ligDir, shadowRead.x);
    var isPointLight: number = lDir.w>1.1 ? 1.0 : 0.0;

    var NdotL : number = max(V3Dot(_normal, V3Nor(lDir.xyz)), 0.05);
    var tanTheta : number = sqrt(1.0 - NdotL * NdotL) / NdotL;

    // 노말 바이어스 적용
    var normalScale : number = normalBias * (1.0 + clamp(tanTheta, 0.0, 4.0));
    var normalOffset : CVec3 = V3MulFloat(V3Nor(_normal), normalScale);
    _world.xyz = V3AddV3(_world.xyz, normalOffset);

    // bias 계산
    var biasConst : number = bias;                                   // 캐스케이드 공통
    var biasSlope : number = bias * clamp(tanTheta * 0.5, 0.0, 2.0); // 텍셀 배율(1/4/16) 적용 대상
    var biasAll: CVec2 = new CVec2(biasConst, biasSlope);
    
    var sVal: number;
    if(isPointLight > 0.5) sVal = CalcShadowPoint(shadowRead, _shadowIndex, _world, lDir, biasAll);
    else sVal = CalcShadowDirectional(shadowRead, _shadowIndex, _world, lDir, biasAll);
    return mix(shadowRate, 1.0, sVal);
}

export function CalcParallaxShadow(_shadowIndex: number, _world: CVec4, _uv: CVec2, _texOff: CVec3, _heightScale: number, _tan: CVec3, _bi: CVec3, _nor: CVec3): number
{
    // shadowRead
    var shadowRead: CVec4 = Sam2DArrToV4(shadowReadList, _shadowIndex);

    // light 정보
    var lDir: CVec4 = Sam2DArrToV4(ligDir, shadowRead.x);
    var isPointLight: number = lDir.w>1.1 ? 1.0 : 0.0;
    if(isPointLight > 0.5) {
        var outRadius : number = shadowRead.w;
        lDir.xyz = V3SubV3(lDir.xyz, _world.xyz);
        var dist : number = V3Len(lDir.xyz);
        if(dist > outRadius) return shadowRate;
    }
    lDir.xyz = V3Nor(lDir.xyz);
    
    // ligDir을 탄젠트 공간으로 이동
    var TBN : CMat3 = TransposeMat3(V3ToMat3(_tan, _bi, _nor));
    lDir.xyz = V3MulMat3Normal(lDir.xyz, TBN);
    if (lDir.z <= 0.0) return shadowRate; // 아랫쪽에서 오는 빛은 전체 그림자 처리

    var minLayers : number = 4.0;
    var maxLayers : number = 16.0;
    var numLayers : number = mix(maxLayers, minLayers, abs(V3Dot(new CVec3(0.0, 0.0, 1.0), lDir.xyz)));

    lDir.z += 0.2;
    var P : CVec2 = V2MulFloat(V2DivFloat(lDir.xy, lDir.z), _heightScale);
    var deltaTexCoords : CVec2 = V2DivFloat(P, numLayers);
    
    var currentTexCoords : CVec2 = _uv;
    var currentDepthMapValue : number = 1.0 - Sam2DToColor(_texOff.y, currentTexCoords).a;
    var currentLayerDepth : number = currentDepthMapValue;

    var layerDepth : number = currentDepthMapValue / numLayers;

    var shadowMultiplier : number = 0.0;
    var stepIndex : number = 0.0;   // soft shadow 위한 용도
    while(currentLayerDepth > 0.0) {
        if (currentDepthMapValue < currentLayerDepth)
            shadowMultiplier = max(shadowMultiplier, (currentLayerDepth - currentDepthMapValue) * (1.0 - stepIndex / numLayers) * 10.0);
        stepIndex += 1.0;
        currentTexCoords = V2AddV2(currentTexCoords, deltaTexCoords);
        currentDepthMapValue = 1.0 - Sam2DToColor(_texOff.y, currentTexCoords).a;
        currentLayerDepth -= layerDepth;
    }

    return mix(shadowRate, 1.0, 1.0 - shadowMultiplier);
}