import { ligDir } from "./Light";
import { SDF } from "./SDF";
import { abs, acos, clamp, CMat, CMat3, CVec2, CVec3, CVec4, FloatToInt, fract, GridSamplingDisk, max, min, mix, mod, round, Sam2DArrMat, Sam2DArrSize, Sam2DArrToColor, Sam2DArrToV4, Sam2DArrV4, Sam2DToColor, screenPos, ShadowPosToUv, 
    sin, step, tan, TransposeMat3, TransposeMat4, V2AddV2, V2DivFloat, V2Dot, V2MulFloat, V2MulV2, V3Abs, V3AddV3, V3Dot, V3Len, V3MulFloat, V3MulMat3Normal, V3Nor, V3SubV3, V3ToMat3, V4Dot, V4MulMatCoordi } from "./Shader";

export var shadowCas0VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas0VPWithZRow);
export var shadowCas1VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas1VPWithZRow);
export var shadowCas2VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas2VPWithZRow);
export var shadowCas3VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas3VPWithZRow);

export var shadowNear:   Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowNear);
export var shadowFar:    Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowFar);
export var shadowTop:    Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowTop);
export var shadowBottom: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowBottom);
export var shadowLeft:   Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowLeft);
export var shadowRight:  Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowRight);

//shadow uniform
export var shadowOn : number = -1.0;
export var shadowReadList: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4ShadowReadList);
export var shadowInfoList: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4ShadowInfoList);
export var shadowCascadeDataList: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4ShadowCascadeDataList);
export var shadowDivideList: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4ShadowDivideList);

//uniform
export var texture16f : number =0;

//아래 두개는 쉐도우맵 곗수. 케스케이드 유무이다 총 3장 사용
export var shadowCount : number = 0;
export var shadowWrite : CVec3 = new CVec3(0,0,0);

//최대 쉐도우 색상
export var shadowRate : number = 0.3;
//오차범위 : 이걸 높이면 더 많은 오차를 그림자 영역으로 만듬
export var bias : number = 4.0;
//노말값에서 보정받을 오차범위(빛에 방향으로 인해 오차가 생기는걸 보정받음)
export var normalBias : number = 0.6;
//percentage-closer filtering 
//경계면을 샘플링 해서 다듬는다. 다듬는 횟수
export var PCF : number = 3.0;
export var PCFStep : number = 1.0;
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
function SampleShadowTexel(_uv: CVec2, _layer: number, _depth: number): number
{
    var sp0 : CVec4 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, new CVec3(_uv, _layer));
    return sp0.w < 1.0 ? 0.0 : step(_depth, sp0.z);
}
function ApplyPCF(_uvZ : CVec3, _texZ : number, _texScale : CVec2, _bias : number, _world : CVec4) : number
{
    var f16Bias : number = texture16f > 0.5 ? abs(_uvZ.z) * (1.0 / 1024.0) : 0.0;
    var depth : number = _uvZ.z + _bias + f16Bias;
    if(PCF < 0.5) return 1.0 - SampleShadowTexel(_uvZ.xy, _texZ, depth);
    
    var sVal : number = 0.0;
    var jitterVal : CVec2 = jitter > 0.01 ? randomJitter(new CVec2(_world.x, _world.y), jitter) : new CVec2(0.0, 0.0);
    var step : number = max(1.0, round(PCFStep));
    var offset : CVec2 = new CVec2(
        mod(screenPos.x, step),
        mod(screenPos.y, step)
    );

    var count : number = 0.0;
    var x : number = -PCF * 0.5;
    for(; x <= PCF * 0.5; x += step)
    {
        var y : number = -PCF * 0.5;
        for(; y <= PCF * 0.5; y += step)
        {
            sVal += SampleShadowTexel(V2AddV2(_uvZ.xy, V2MulV2(new CVec2(x + jitterVal.x + offset.x, y + jitterVal.y + offset.y), _texScale)), _texZ, depth);
            count += 1.0;
        }
    }
    return 1.0 - sVal / count;
}
function ProcessCascadeLevel(_casMatOff : Sam2DArrMat, _shadowIndex : number, _world : CVec4, _normal : CVec3, _normalBiasTileScale : number) : CVec3
{
    _world.xyz = V3AddV3(_world.xyz, V3MulFloat(_normal, _normalBiasTileScale * max(PCF * 0.5, 1.0)));
    var shadowViewZRow : CVec4 = Sam2DArrToV4(_casMatOff,_shadowIndex*4.0+3.0);
    var shadowVPMat : CMat = TransposeMat4(new CMat(
        Sam2DArrToV4(_casMatOff,_shadowIndex*4.0+0.0),
        Sam2DArrToV4(_casMatOff,_shadowIndex*4.0+1.0),
        Sam2DArrToV4(_casMatOff,_shadowIndex*4.0+2.0),
        new CVec4(0.0, 0.0, 0.0, 1.0)
    ));
    var shadowPos : CVec4 = V4MulMatCoordi(_world, shadowVPMat);
    return new CVec3(ShadowPosToUv(shadowPos).xy, V4Dot(shadowViewZRow, _world));
}
function CalcShadowDirectional(_index : number, _world : CVec4, _normal : CVec3, _ligDir : CVec4, _viewPos: CVec3, _bias: number) : number
{
    var shadowInfo: CVec4 = Sam2DArrToV4(shadowInfoList, _index);
    var shadowRead: CVec4 = Sam2DArrToV4(shadowReadList, _index);
    var shadowCascadeData: CVec4 = Sam2DArrToV4(shadowCascadeDataList, _index);
    var shadowDivide: CVec4 = Sam2DArrToV4(shadowDivideList, _index);

    var linearDepth : number = -_viewPos.z / shadowInfo.z;
    if(linearDepth > 1.0) return 1.0;   // 그림자 범위 바깥임

    var texSize : CVec3 = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
    var texScale : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);

    // 루핑 위해서 생성
    var shadowCasMat : CMat = new CMat(0);
    shadowCasMat[0].xyz = shadowCas0VPMatWithZRow;
    shadowCasMat[1].xyz = shadowCas1VPMatWithZRow;
    shadowCasMat[2].xyz = shadowCas2VPMatWithZRow;
    shadowCasMat[3].xyz = shadowCas3VPMatWithZRow;
    var lastCascadeIndex : number = shadowRead[3] > -0.5 ? 3.0 : (shadowRead[2] > -0.5 ? 2.0 : (shadowRead[1] > -0.5 ? 1.0 : 0.0));

    // ProcessCascadeLevel도 샘플링 코스트 있어서 루핑으로 최대한 생략함
    var shadowSum : number = 0.0;
    var weightSum : number = 0.0;
    var nearDepth : number = 0.0;
    for(let i = 0; i < 4; i++)
    {
        if(shadowRead[i] < -0.5) continue;

        var farDepth : number = nearDepth + shadowDivide[i];
        
        var centerDepth : number = (nearDepth + farDepth) * 0.5;
        var closestEdge : number = linearDepth < centerDepth ? nearDepth : farDepth;
        var margin : number = shadowInfo.w * closestEdge * closestEdge;
        var csmx : number = nearDepth - margin * 0.5;
        var csmy : number = farDepth + margin * 0.5;

        // 현재 이 부분에서 한 픽셀에 최대 PCF가 두 번 적용되는데 디더링 또는 더 가까운 캐스케이드만 PCF를 적용하는 방식으로 최대 한번 적용되도록 수정할 수 있음
        if(csmx <= linearDepth && (linearDepth < csmy || i == FloatToInt(lastCascadeIndex)))
        {
            var dist : number = min(linearDepth - csmx, csmy - linearDepth);
            var ratio : number = clamp(dist / margin, 0.0, 1.0);

            // 가장 멀리 있는 cascade이고, cascade의 절반 이상임
            var shouldFadeLastCascade : number = (i == FloatToInt(lastCascadeIndex) && linearDepth > centerDepth) ? 1.0 : 0.0;
            // 가장 멀리 있는 cascade가 아니거나 가장 멀리 있지만 cascade의 절반 이하임
            var shouldBlend : number = (i != FloatToInt(lastCascadeIndex) || (i == FloatToInt(lastCascadeIndex) && linearDepth < centerDepth)) ? 1.0 : 0.0;
            var blendRatio : number = (shouldFadeLastCascade > 0.5 || shouldBlend > 0.5) ? ratio : 1.0;

            var uvZ : CVec3 = ProcessCascadeLevel(shadowCasMat[i].xyz, _index, _world, _normal, shadowCascadeData[i]);
            var curShadow : number = ApplyPCF(uvZ, shadowRead[i], texScale, _bias, _world);

            shadowSum += curShadow * blendRatio;
            weightSum += blendRatio;
        }

        nearDepth = farDepth;
    }

    return clamp(shadowSum + 1.0 - weightSum, 0.0, 1.0);    // fade
}

function CubeToUV(_cubeUVW : CVec3, _texelSize : CVec2, _nearTexOff : number) : CVec3
{
    _cubeUVW = V3Nor(_cubeUVW);
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
function CalcShadowPoint(_index : number, _world : CVec4, _normal : CVec3, _ligDir : CVec4, _camPos: CVec3, _info: CVec4, _bias: number) : number
{
    var shadowCascadeData: CVec4 = Sam2DArrToV4(shadowCascadeDataList, _index);
    
    var filterSize : number = shadowCascadeData.x * max(PCF + 1.0, 1.0);
    _world.xyz = V3AddV3(_world.xyz, V3MulFloat(_normal, filterSize));

    var ligToPos : CVec3 = V3SubV3(_world.xyz, _ligDir.xyz);
    var ligToPosLength : number = V3Len(ligToPos);

    var sVal : number = 1.0;
    if(ligToPosLength <= _info.w && ligToPosLength >= _info.z)
    {
        var depth : number = (ligToPosLength - _info.z) / (_info.w - _info.z);

        var texSize : CVec3 = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
        var texScale : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);

        var depthBias : number = _bias / 1024.0;    // viewPos => projPos로 바꾸기 위한 적절한 나누기

        var viewDistance : number = V3Len(V3SubV3(_world.xyz, _camPos));
        var diskRadius : number = (1.0 + (viewDistance - _info.z) / (_info.w - _info.z)) / 25.0 * 20.0;    // 0.04 - 0.08 * 20.0

        var samples : number = clamp((PCF + 1.0) * (PCF + 1.0), 1.0, 20.0); // 샘플이 20개밖에 없음, 0번 샘플이 1,1,1

        sVal = 0.0;
        var i : number = 0.0;
        for(; i < samples; i++)
        {
            var uvw : CVec3 = CubeToUV(V3AddV3(ligToPos, V3MulFloat(GridSamplingDisk(i), diskRadius)), texScale, _info.y);
            var sp : CVec4 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uvw);
            sVal += (sp.w == 0.0) ? 1.0 : ((depth - depthBias) >= sp.z ? 0.0 : 1.0);
        }
        sVal /= samples;
    }
    return sVal;
}

export function CalcShadow(_index: number, _normal: CVec3, _world: CVec4, _camPos: CVec3, _viewPos: CVec3): number
{
    // shadowRead
    var shadowInfo: CVec4 = Sam2DArrToV4(shadowInfoList, _index);
    
    // light 정보
    var lDir: CVec4 = Sam2DArrToV4(ligDir, shadowInfo.x);
    var isPointLight: number = lDir.w>1.1 ? 1.0 : 0.0;

    var NdotL : number = clamp(V3Dot(_normal, V3Nor(lDir.xyz)), 0.001, 0.999);  // tan이 무한으로 발산하지 않게 0과 1은 제외
    var tanTheta : number = tan(acos(NdotL));

    // 노말 바이어스 계산
    var normalScale : number = normalBias * min(tanTheta, 5.0);
    _normal = V3MulFloat(_normal, normalScale);

    // bias 계산
    var biasSlope : number = bias * min(tanTheta, 4.0);
    
    var sVal: number;
    if(isPointLight > 0.5) sVal = CalcShadowPoint(_index, _world, _normal, lDir, _camPos, shadowInfo, biasSlope);
    else sVal = CalcShadowDirectional(_index, _world, _normal, lDir, _viewPos, biasSlope);
    return mix(shadowRate, 1.0, sVal);
}

export function CalcParallaxShadow(_shadowIndex: number, _world: CVec4, _uv: CVec2, _texOff: CVec3, _heightScale: number, _tan: CVec3, _bi: CVec3, _nor: CVec3): number
{
    // shadowRead
    var shadowInfo: CVec4 = Sam2DArrToV4(shadowInfoList, _shadowIndex);

    // light 정보
    var lDir: CVec4 = Sam2DArrToV4(ligDir, shadowInfo.x);
    var isPointLight: number = lDir.w>1.1 ? 1.0 : 0.0;
    if(isPointLight > 0.5) {
        var outRadius : number = shadowInfo.w;
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