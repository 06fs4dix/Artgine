import { ligDir } from "./Light";
import { SDF } from "./SDF";
import { abs, acos, clamp, CMat, CMat3, CVec2, CVec3, CVec4, FloatToInt, floor, fract, GridSamplingDisk, int, IntToFloat, max, min, mix, mod, round, Sam2DArrMat, Sam2DArrSize, Sam2DArrToColor, Sam2DArrNearestToV4, Sam2DArrV4, Sam2DToColor, screenPos, ShadowPosToUv, 
    sin, sqrt, step, tan, TransposeMat3, TransposeMat4, V2AddV2, V2DivFloat, V2Dot, V2Floor, V2Mod, V2MulFloat, V2MulV2, V3Abs, V3AddV3, V3DivFloat, V3Dot, V3Floor, V3Len, V3MulFloat, V3MulMat3Normal, V3Nor, V3SubV3, V3ToMat3, V4Dot, V4MulMatCoordi } from "./Shader";

export var shadowCas0VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas0VPWithZRow);
export var shadowCas1VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas1VPWithZRow);
export var shadowCas2VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas2VPWithZRow);
export var shadowCas3VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas3VPWithZRow);
export var shadowCas4VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas4VPWithZRow);
export var shadowCas5VPMatWithZRow: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowCas5VPWithZRow);

export var shadowNear:   Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowNear);
export var shadowFar:    Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowFar);
export var shadowTop:    Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowTop);
export var shadowBottom: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowBottom);
export var shadowLeft:   Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowLeft);
export var shadowRight:  Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.MatShadowRight);

//shadow uniform
export var shadowOn : number = -1.0;
export var shadowInfoList: Sam2DArrMat=new Sam2DArrMat(1,SDF.eUni.V4ShadowInfoList);

//uniform
export var texture16f : number =0;

//아래 두개는 쉐도우맵 곗수. 케스케이드 유무이다 총 6장 사용
export var shadowCount : number = 0;
export var shadowWrite : CVec3 = new CVec3(0,0,0);
//방향광 그림자맵에 쓰는 깊이를 캐스케이드 박스 앞면 기준(0 근처)으로 옮기는 값. CLight가 캐스케이드별 쓰기 RP에 넣는다.
//라이트 카메라가 박스 앞면에서 20000 뒤라 깊이가 20000대면 16F 그림자맵은 간격이 16이 되어 작은 물체 그림자가 사라진다.
//읽기 쪽은 CLight가 ShadowView zRow 상수항에 같은 값을 더해 맞추므로 ProcessCascadeLevel은 그대로다.
export var shadowZOffset : number = 0.0;

//최대 쉐도우 색상
export var shadowRate : number = 0.3;
//오차범위 : 이걸 높이면 더 많은 오차를 그림자 영역으로 만듬
export var bias : number = 1.0;
//노말값에서 보정받을 오차범위(빛에 방향으로 인해 오차가 생기는걸 보정받음)
export var normalBias : number = 0.2;
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
function Sam2DCompare(_number: number, _uv: CVec3, _compare: number): number
{
    var sp0 : CVec4 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, _uv);
    return sp0.w < 1.0 ? 0.0 : step(_compare, sp0.z);
}
function ApplyPCF(_uvZ : CVec3, _texLayer : number, _depthBias : number, _offset : CVec2, _texelSize : CVec2) : number
{
    var f16Bias : number = texture16f > 0.5 ? abs(_uvZ.z) * (1.0 / 1024.0) : 0.0;
    _uvZ.z += _depthBias + f16Bias;

    var inFrustum : number = (_uvZ.x >= 0.0 && _uvZ.x <= 1.0 && _uvZ.y >= 0.0 && _uvZ.y <= 1.0) ? 1.0 : 0.0;
    if(inFrustum < 0.5) return 1.0;

    var sVal : number = 0.0;
    var count : number = 0.0;
    var halfPCF : number = floor(PCF) * 0.5;
    var step : number = max(1.0, floor(PCFStep));

    var x : number = -halfPCF;
    for(; x <= halfPCF; x += step)
    {
        var sampleU : number = _uvZ.x + (x + _offset.x) * _texelSize.x;
        var y : number = -halfPCF;
        for(; y <= halfPCF; y += step)
        {
            var sampleV : number = _uvZ.y + (y + _offset.y) * _texelSize.y;
            sVal += Sam2DCompare(SDF.eTexSlot.ArrShadowWrite, new CVec3(sampleU, sampleV, _texLayer), _uvZ.z);
            count += 1.0;
        }
    }
    return 1.0 - (sVal / count);
}
function ProcessCascadeLevel(_casMatOff : Sam2DArrMat, _shadowIndex : number, _world : CVec3) : CVec3
{
    var baseIdx : number = _shadowIndex * 4.0;
    var shadowViewZRow : CVec4 = Sam2DArrNearestToV4(_casMatOff, baseIdx + 3.0);
    var shadowVPMat : CMat = TransposeMat4(new CMat(
        Sam2DArrNearestToV4(_casMatOff, baseIdx + 0.0),
        Sam2DArrNearestToV4(_casMatOff, baseIdx + 1.0),
        Sam2DArrNearestToV4(_casMatOff, baseIdx + 2.0),
        new CVec4(0.0, 0.0, 0.0, 1.0)
    ));
    var shadowPos : CVec4 = V4MulMatCoordi(new CVec4(_world, 1.0), shadowVPMat);
    return new CVec3(ShadowPosToUv(shadowPos).xy, V4Dot(shadowViewZRow, new CVec4(_world, 1.0)));
}
function GetCasInfo(_casIndex : number, _row2 : CVec4, _row3 : CVec4) : CVec4    // xyz:VPMat샘플러, w:텍셀 폭
{
    var index : int; index.dummy = FloatToInt(_casIndex);
    if(index.dummy == 0) return new CVec4(shadowCas0VPMatWithZRow.x, shadowCas0VPMatWithZRow.y, shadowCas0VPMatWithZRow.z, _row2[2]);
    if(index.dummy == 1) return new CVec4(shadowCas1VPMatWithZRow.x, shadowCas1VPMatWithZRow.y, shadowCas1VPMatWithZRow.z, _row2[3]);
    if(index.dummy == 2) return new CVec4(shadowCas2VPMatWithZRow.x, shadowCas2VPMatWithZRow.y, shadowCas2VPMatWithZRow.z, _row3[0]);
    if(index.dummy == 3) return new CVec4(shadowCas3VPMatWithZRow.x, shadowCas3VPMatWithZRow.y, shadowCas3VPMatWithZRow.z, _row3[1]);
    if(index.dummy == 4) return new CVec4(shadowCas4VPMatWithZRow.x, shadowCas4VPMatWithZRow.y, shadowCas4VPMatWithZRow.z, _row3[2]);
    if(index.dummy == 5) return new CVec4(shadowCas5VPMatWithZRow.x, shadowCas5VPMatWithZRow.y, shadowCas5VPMatWithZRow.z, _row3[3]);
    //WGSL은 모든 경로에 return이 있어야 컴파일된다(GLSL은 허용)
    return new CVec4(0.0, 0.0, 0.0, 0.0);
}
function GetCasDepth(_casIndex : number, _row1 : CVec4, _row2 : CVec4) : number
{
    var index : int; index.dummy = FloatToInt(_casIndex);
    if(index.dummy == 0) return _row1[0];
    if(index.dummy == 1) return _row1[1];
    if(index.dummy == 2) return _row1[2];
    if(index.dummy == 3) return _row1[3];
    if(index.dummy == 4) return _row2[0];
    if(index.dummy == 5) return 1.0 - (_row1[0] + _row1[1] + _row1[2] + _row1[3] + _row2[0]);
    //WGSL은 모든 경로에 return이 있어야 컴파일된다(GLSL은 허용)
    return 0.0;
}
function CalcShadowDirectional(_index : number, _world : CVec4, _normal : CVec3, _ligDir : CVec4, _camPos : CVec3, _row0: CVec4, _viewPos: CVec3) : number
{
    //row0: 라이트인덱스x 그림자텍스쳐레이어인덱스y 그림자유효거리z 페이드비율w
    var linearDepth : number = -_viewPos.z / _row0.z;
    if(linearDepth > 1.0) return 1.0;   // 그림자 범위 바깥임

    // 텍셀 사이즈 1회만 계산
    var texSize : CVec3 = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
    var texelSize : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);

    // 바이어스 계산
    var NdotL : number = clamp(V3Dot(_normal, V3Nor(_ligDir.xyz)), 0.0, 1.0);
    var tanT : number = min(sqrt(1.0 - NdotL * NdotL) / max(NdotL, 0.05), 10.0);
    var kernel : number = 1.0 + floor(PCF) * 0.5 + jitter * 0.5;

    // 디더링 + PCFStep으로 인한 최적화 보정
    var offset : CVec2 = V2Mod(V2Floor(screenPos.xy), max(1.0, floor(PCFStep)));    // screenPos가 0.5가 더해져있는 값이기때문에 floor해줌
    var jitterVal : CVec2 = randomJitter(new CVec2(_world.xy), jitter);
    var totalOffset : CVec2 = V2AddV2(jitterVal, offset);

    var row1: CVec4 = Sam2DArrNearestToV4(shadowInfoList, _index * 4.0 + 1.0); //케스케이드0거리비율x 케스케이드1거리비율y 케스케이드2거리비율z 케스케이드3거리비율w
    var row2: CVec4 = Sam2DArrNearestToV4(shadowInfoList, _index * 4.0 + 2.0); //케스케이드4거리비율x 케스케이드개수y 케스케이드0노말바이어스z 케스케이드1노말바이어스w
    var row3: CVec4 = Sam2DArrNearestToV4(shadowInfoList, _index * 4.0 + 3.0); //케스케이드2노말바이어스x 케스케이드3노말바이어스y 케스케이드4노말바이어스z 케스케이드5노말바이어스w

    // 16비트 지원을 위해 camPos를 제거하여 그림자를 원점부터 출발시킨다
    var refPos : CVec3 = V3MulFloat(V3Floor(V3MulFloat(_camPos, 1.0 / 1024.0)), 1024.0);
    var world : CVec3 = V3SubV3(_world.xyz, refPos);
    
    var lastCasIndex : int; lastCasIndex.dummy = FloatToInt(row2.y);
    var fade : number = _row0.w;
    var texIndex : number = _row0.y;
    var shadow : number = 1.0;

    var cascade : CVec2 = new CVec2(0.0, 0.0);
    for(var i = 0; i <= lastCasIndex.dummy; i++)
    {
        cascade.x = cascade.y;
        cascade.y += GetCasDepth(IntToFloat(i), row1, row2);
        var casCenter: number = (cascade.x + cascade.y) * 0.5;
        var closestEdge: number = linearDepth < casCenter ? cascade.x : cascade.y;
        var margin: number = fade * closestEdge;
        var csmx: number = cascade.x - margin * 0.5;
        var csmy: number = cascade.y + margin * 0.5;

        if(linearDepth >= csmx && (linearDepth < csmy || i == lastCasIndex.dummy))
        {
            var dist : number = min(linearDepth - csmx, csmy - linearDepth);
            var ratio : number = clamp(dist / margin, 0.0, 1.0);

            var casInfo : CVec4 = GetCasInfo(IntToFloat(i), row2, row3); //xyz캐스케이드텍스쳐UVW, w텍셀 폭
            var casMatOff : CVec3 = casInfo.xyz;
            var texel : number = casInfo.w;

            // 픽셀이 월드에서 차지하는 크기가 클수록 깊이, 노말 차이가 커진다고 가정하고 바이어스도 키워줌
            var scaledNormalBias : number = normalBias * texel * (0.5 + floor(PCF) * 0.5);  // (월드 크기 / 케스케이드 해상도)가 클수록, 또 PCF가 클수록 옆 픽셀과의 뎁스차이가 클 가능성이 높아서 값이 커짐
            var slopedDepthBias : number = 0.1414 * bias * texel * kernel * (0.1 + tanT);    // 빛을 비스듬하게 받을수록, 또 PCF/Jitter가 클수록 값이 커짐

            var uvZ : CVec3 = ProcessCascadeLevel(casMatOff, _index, V3AddV3(world.xyz, V3MulFloat(_normal, scaledNormalBias)));
            var curShadow : number = ApplyPCF(uvZ, texIndex + IntToFloat(i), slopedDepthBias, totalOffset, texelSize);

            var shouldFadeLastCascade : number = (i == lastCasIndex.dummy && linearDepth > casCenter) ? 1.0 : 0.0;
            curShadow = mix(1.0, curShadow, shouldFadeLastCascade > 0.5 ? 2.0 * ratio - 1.0 : 1.0);

            var shouldBlend : number = linearDepth < casCenter ? 1.0 : 0.0;
            shadow = mix(shadow, curShadow, shouldBlend > 0.5 ? ratio : 1.0);
        }
    }

    return shadow;
}

function CubeToUV(_cubeUVW : CVec3, _texelSize : CVec2, _texOff : number) : CVec3
{
    _cubeUVW = V3Nor(_cubeUVW);
    var absDir : CVec3 = V3Abs(_cubeUVW);

    var scaleToCube : number = 1.0 / max(absDir.x, max(absDir.y, absDir.z));
    absDir = V3MulFloat(absDir, scaleToCube);

    // _cubeUVW = V3MulFloat(_cubeUVW, scaleToCube);
    _cubeUVW = V3MulFloat(_cubeUVW, scaleToCube * (1.0 - 2.0 * _texelSize.y));

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
    _cubeUVW.z += _texOff - SDF.eShadow.Near;
    return _cubeUVW;
}
function CalcShadowPoint(_index : number, _world : CVec4, _normal : CVec3, _ligDir : CVec4, _camPos: CVec3, _row0: CVec4) : number
{
    var texOff: number = _row0.y;
    var far: number = _row0.z;
    var normalBiasTileScale : number = _row0.w;

    // 바이어스 계산
    var NdotL : number = clamp(V3Dot(_normal, V3Nor(V3SubV3(_world.xyz, _ligDir.xyz))), 0.1, 0.9);  // tan이 무한으로 발산하지 않게 0과 1은 제외
    var slopedNormalBias : number = normalBias * (1.0 - NdotL) * (1.0 + PCF * 0.5);
    var slopedDepthBias : number = bias * (1.0 - NdotL);

    _world.xyz = V3AddV3(_world.xyz, V3MulFloat(_normal, slopedNormalBias * normalBiasTileScale));

    var ligToPos : CVec3 = V3SubV3(_world.xyz, _ligDir.xyz);
    var ligToPosLength : number = V3Len(ligToPos);

    if(ligToPosLength <= far)
    {
        var depth : number = -ligToPosLength / far;

        var texSize : CVec3 = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
        var texScale : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);

        var depthBias : number = slopedDepthBias * texScale.x;
        depth += depthBias;

        var viewDistance : number = V3Len(V3SubV3(_world.xyz, _camPos));
        var diskRadius : number = (1.0 + viewDistance / far) * 0.8;    // 디스크 크기가 카메라의 거리와 비례

        var samples : number = clamp((PCF + 1.0) * (PCF + 1.0), 1.0, 20.0); // 샘플이 20개밖에 없음, 0번 샘플이 1,1,1

        var sVal : number = 0.0;
        for(var i = 0; i < FloatToInt(samples); i++)
        {
            var uvw : CVec3 = CubeToUV(V3AddV3(ligToPos, V3MulFloat(GridSamplingDisk(IntToFloat(i)), diskRadius)), texScale, texOff);
            sVal += Sam2DCompare(SDF.eTexSlot.ArrShadowWrite, uvw, depth);
        }
        return 1.0 - sVal / samples;
    }
    return 1.0;
}

export function CalcShadow(_index: number, _normal: CVec3, _world: CVec4, _camPos: CVec3, _viewPos: CVec3): number
{
    var row0: CVec4 = Sam2DArrNearestToV4(shadowInfoList, _index * 4.0); // 라이트인덱스x
    var lDir: CVec4 = Sam2DArrNearestToV4(ligDir, row0.x);
    var isPointLight: number = lDir.w>1.1 ? 1.0 : 0.0;
    return mix(shadowRate, 1.0, isPointLight > 0.5 ? CalcShadowPoint(_index, _world, _normal, lDir, _camPos, row0) : CalcShadowDirectional(_index, _world, _normal, lDir, _camPos, row0, _viewPos));
}

export function CalcParallaxShadow(_shadowIndex: number, _world: CVec4, _uv: CVec2, _texOff: CVec3, _heightScale: number, _tan: CVec3, _bi: CVec3, _nor: CVec3): number
{
    // shadowRead
    var row0: CVec4 = Sam2DArrNearestToV4(shadowInfoList, _shadowIndex * 4.0);

    // light 정보
    var lDir: CVec4 = Sam2DArrNearestToV4(ligDir, row0.x);
    var isPointLight: number = lDir.w>1.1 ? 1.0 : 0.0;
    if(isPointLight > 0.5) {
        var outRadius : number = row0.z;
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
    for(var i = 0; i < 32; i++) {
        if(currentLayerDepth <= 0.0) break;
        if (currentDepthMapValue < currentLayerDepth)
            shadowMultiplier = max(shadowMultiplier, (currentLayerDepth - currentDepthMapValue) * (1.0 - stepIndex / numLayers) * 10.0);
        stepIndex += 1.0;
        currentTexCoords = V2AddV2(currentTexCoords, deltaTexCoords);
        currentDepthMapValue = 1.0 - Sam2DToColor(_texOff.y, currentTexCoords).a;
        currentLayerDepth -= layerDepth;
    }

    return mix(shadowRate, 1.0, 1.0 - shadowMultiplier);
}