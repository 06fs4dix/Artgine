import { SDF } from "./SDF";
import { abs, clamp, CMat, CVec2, CVec3, CVec4, fract, max, min, mix, Sam2DArrMat, Sam2DArrSize, Sam2DArrToColor, Sam2DArrToMat, Sam2DArrV4, Sam2DToColor, screenPos, ShadowPosToUv, 
    sin, sqrt, V2AddV2, V2DivFloat, V2Dot, V2MulFloat, V2MulV2, V3AddV3, V3Dot, V3MulFloat, V3Nor, V4MulMatCoordi } from "./Shader";

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
function ApplyPCF(_uvZ0 : CVec3, _uvZ1 : CVec3, _uvZ2 : CVec3, _read : CVec4, _biasAll : number, _world : CVec4) : number
{
    var f16Bias : number = SDF.FloatTex16 > 0 ? abs(_uvZ0.z) * (2.0 / 1024.0) : 0.0;
    
    var texSize : CVec3 = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
    var texScale : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);

    // ★ cascade 선택은 중심 UV로만 판정 (PCF 횟수 무관)
    var cas0Valid : number = (_read.y > -0.5 && _uvZ0.x > 0.0 && _uvZ0.y > 0.0 && _uvZ0.x < 1.0 && _uvZ0.y < 1.0) ? 1.0 : 0.0;
    var cas1Valid : number = (_read.z > -0.5 && _uvZ1.x > 0.0 && _uvZ1.y > 0.0 && _uvZ1.x < 1.0 && _uvZ1.y < 1.0) ? 1.0 : 0.0;
    var cas2Valid : number = (_read.w > -0.5 && _uvZ2.x > 0.0 && _uvZ2.y > 0.0 && _uvZ2.x < 1.0 && _uvZ2.y < 1.0) ? 1.0 : 0.0;

    var blendEdge : number = 0.1;
    var edgeX : number = min(_uvZ0.x, 1.0 - _uvZ0.x);
    var edgeY : number = min(_uvZ0.y, 1.0 - _uvZ0.y);
    var blend0 : number = (cas0Valid > 0.5) ? clamp(min(edgeX, edgeY) / blendEdge, 0.0, 1.0) : 0.0;

    var edgeX1 : number = min(_uvZ1.x, 1.0 - _uvZ1.x);
    var edgeY1 : number = min(_uvZ1.y, 1.0 - _uvZ1.y);
    var blend1 : number = (cas1Valid > 0.5) ? clamp(min(edgeX1, edgeY1) / blendEdge, 0.0, 1.0) : 0.0;

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
                    sVal0 += (sp0.w == 0.0) ? 0.0 : ((_uvZ0.z + _biasAll + f16Bias) >= sp0.z ? 0.0 : 1.0);
                }
                // else: 범위 밖 샘플은 0.0(빛) 기여 — sVal0 증가 없음
            }

            if(cas1Valid > 0.5)
            {
                if(uv1N.x > 0.0 && uv1N.y > 0.0 && uv1N.x < 1.0 && uv1N.y < 1.0)
                {
                    var sp1 : CVec4 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv1N);
                    sVal1 += (sp1.w == 0.0) ? 0.0 : ((_uvZ1.z + _biasAll*4.0 + f16Bias) >= sp1.z ? 0.0 : 1.0);
                }
            }

            if(cas2Valid > 0.5)
            {
                if(uv2N.x > 0.0 && uv2N.y > 0.0 && uv2N.x < 1.0 && uv2N.y < 1.0)
                {
                    var sp2 : CVec4 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv2N);
                    sVal2 += (sp2.w == 0.0) ? 0.0 : ((_uvZ2.z + _biasAll*16.0 + f16Bias) >= sp2.z ? 0.0 : 1.0);
                }
            }
        }
    }

    var gridCount : number = (2.0 * PCF + 1.0) * (2.0 * PCF + 1.0);
    var res0 : number = 1.0 - sVal0 / gridCount;
    var res1 : number = 1.0 - sVal1 / gridCount;
    var res2 : number = 1.0 - sVal2 / gridCount;


    if(cas0Valid > 0.5 && cas1Valid > 0.5) return mix(res1, res0, blend0);
    if(cas0Valid > 0.5)                    return res0;
    if(cas1Valid > 0.5 && cas2Valid > 0.5) return mix(res2, res1, blend1);
    if(cas1Valid > 0.5)                    return res1;
    if(cas2Valid > 0.5)                    return res2;
    return 1.0;
}
function GetLightDir(_viewMatOff : Sam2DArrMat, _index : number) : CVec3
{
    var svm : CMat = Sam2DArrToMat(_viewMatOff, _index);
    return V3Nor(new CVec3(svm[0][2], svm[1][2], svm[2][2]));
}

function ProcessCascadeLevel(_isActive : number, _viewMatOff : Sam2DArrMat, _projMatOff : Sam2DArrMat, _offsetScale : number, _normalOffset : CVec3, _worldPos : CVec4, _index : number) : CVec3
{
    if(_isActive < -0.5) return new CVec3(0.0, 0.0, 0.0);
    
    var svm : CMat = Sam2DArrToMat(_viewMatOff, _index);
    var spm : CMat = Sam2DArrToMat(_projMatOff, _index);

    var world : CVec4 = new CVec4(V3AddV3(_worldPos.xyz, V3MulFloat(_normalOffset, _offsetScale)), _worldPos.w);
    var viewPos : CVec4 = V4MulMatCoordi(world, svm);
    var shadowPos : CVec4 = V4MulMatCoordi(viewPos, spm);
    
    // 결과 저장
    return new CVec3(ShadowPosToUv(shadowPos).xy, viewPos.z);
}

export function calcShadow(_read : CVec4, _index : number,_nor : CVec3, _worldPos : CVec4) : number
{
    // 빛 방향에 따른 바이어스 증감
    var ligDir : CVec3 = GetLightDir(shadowNearCasV0, _index);
    var NdotL : number = max(V3Dot(_nor, ligDir), 0.05);
    var tanTheta : number = sqrt(1.0 - NdotL * NdotL) / NdotL;

    // 노말 오프셋 계산 (셀프 섀도잉 방지)
    var normalScale : number = normalBias * (1.0 + clamp(tanTheta, 0.0, 4.0));
    var normalOffset : CVec3 = V3MulFloat(V3Nor(_nor), normalScale);

    // 바이어스 계산 (셀프 섀도잉 방지)
    var biasAll : number = bias * (1.0 + clamp(tanTheta * 0.5, 0.0, 2.0));

    var uvZ0 : CVec3=ProcessCascadeLevel(_read.y, shadowNearCasV0, shadowFarCasP0, 1.0, normalOffset, _worldPos, _index);
    var uvZ1 : CVec3=ProcessCascadeLevel(_read.z, shadowTopCasV1, shadowBottomCasP1, 1.0, normalOffset, _worldPos, _index);
    var uvZ2 : CVec3=ProcessCascadeLevel(_read.w, shadowLeftCasV2, shadowRightCasP2, 1.0, normalOffset, _worldPos, _index);

    var sVal : number = ApplyPCF(uvZ0, uvZ1, uvZ2, _read, biasAll, _worldPos);
    
    //최소 그림자 강도 적용
    return sVal * (1.0-shadowRate) + shadowRate;
}

export function calcParallaxShadow(_index : number, _uv : CVec2, _ligDir : CVec3, _heightScale : number) : number {
    if (_ligDir.z <= 0.0) return shadowRate;    // 아랫쪽에서 오는 빛은 그림자 처리(tangent space여서 아랫쪽 무조건 자를 수 있음)

    var minLayers : number = 4.0;
    var maxLayers : number = 16.0;
    var numLayers : number = mix(maxLayers, minLayers, abs(V3Dot(new CVec3(0.0, 0.0, 1.0), _ligDir)));

    var currentTexCoords : CVec2 = _uv;
    var currentDepthMapValue : number = 1.0 - Sam2DToColor(_index, currentTexCoords).a + 0.01;
    var currentLayerDepth : number = currentDepthMapValue;

    var layerDepth : number = 1.0 / numLayers;
    var P : CVec2 = V2MulFloat(V2DivFloat(_ligDir.xy, _ligDir.z + 0.2),_heightScale);   // 페이크 viewDir 적용
    var deltaTexCoords : CVec2 = V2DivFloat(P, numLayers);

    // 반대로 레이마칭
    while(currentLayerDepth <= currentDepthMapValue && currentLayerDepth > 0.0)
    {
        currentTexCoords=V2AddV2(currentTexCoords,deltaTexCoords);
        //currentTexCoords += deltaTexCoords;
        currentDepthMapValue = 1.0 - Sam2DToColor(_index, currentTexCoords).a;
        currentLayerDepth -= layerDepth;
    }

    var shadow : number;
    if(currentLayerDepth > currentDepthMapValue) shadow = 0.0;
    else shadow = 1.0;
    return shadow * (1.0-shadowRate) + shadowRate;
}
