import { SDF } from "./SDF";
import { abs, clamp, CVec2, CVec3, CVec4, fract, max, min, mix, Sam2DArrMat, Sam2DArrSize, Sam2DArrToColor, Sam2DArrToMat, Sam2DArrV4, Sam2DToColor, ShadowPosToUv, sin, sqrt, V2AddV2, V2DivFloat, V2Dot, V2MulFloat, V2MulV2, V3AddV3, V3Dot, V3MulFloat, V3Nor, V4MulMatCoordi } from "./Shader";
export var shadowNearCasV0 = new Sam2DArrMat(1, SDF.eUni.MatShadowNearCasV0);
export var shadowFarCasP0 = new Sam2DArrMat(1, SDF.eUni.MatShadowFarCasP0);
export var shadowTopCasV1 = new Sam2DArrMat(1, SDF.eUni.MatShadowTopCasV1);
export var shadowBottomCasP1 = new Sam2DArrMat(1, SDF.eUni.MatShadowBottomCasP1);
export var shadowLeftCasV2 = new Sam2DArrMat(1, SDF.eUni.MatShadowLeftCasV2);
export var shadowRightCasP2 = new Sam2DArrMat(1, SDF.eUni.MatShadowRightCasP2);
export var shadowPointProj = new Sam2DArrMat(1, SDF.eUni.MatShadowPointProj);
export var shadowOn = -1.0;
export var shadowReadList = new Sam2DArrV4(1, SDF.eUni.V4ShadowReadList);
export var texture16f = 0;
export var shadowCount = 0;
export var shadowWrite = new CVec3(0, 0, 0);
export var shadowRate = 0.3;
export var bias = 5.0;
export var normalBias = 1.0;
export var PCF = 2.0;
export var jitter = 0.0;
function Hash22(p) {
    var n1 = V2Dot(p, new CVec2(127.1, 311.7));
    var n2 = V2Dot(p, new CVec2(269.5, 183.3));
    var h1 = fract(sin(n1) * 43758.5453);
    var h2 = fract(sin(n2) * 43758.5453);
    return new CVec2(h1, h2);
}
function randomJitter(fragCoord, _strength) {
    var h = Hash22(fragCoord);
    return new CVec2((h.x - 0.5) * _strength, (h.y - 0.5) * _strength);
}
function ApplyPCF(_uvZ0, _uvZ1, _uvZ2, _read, _biasAll, _world) {
    var f16Bias = SDF.FloatTex16 > 0 ? abs(_uvZ0.z) * (2.0 / 1024.0) : 0.0;
    var texSize = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
    var texScale = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
    var cas0Valid = (_read.y > -0.5 && _uvZ0.x > 0.0 && _uvZ0.y > 0.0 && _uvZ0.x < 1.0 && _uvZ0.y < 1.0) ? 1.0 : 0.0;
    var cas1Valid = (_read.z > -0.5 && _uvZ1.x > 0.0 && _uvZ1.y > 0.0 && _uvZ1.x < 1.0 && _uvZ1.y < 1.0) ? 1.0 : 0.0;
    var cas2Valid = (_read.w > -0.5 && _uvZ2.x > 0.0 && _uvZ2.y > 0.0 && _uvZ2.x < 1.0 && _uvZ2.y < 1.0) ? 1.0 : 0.0;
    var blendEdge = 0.1;
    var edgeX = min(_uvZ0.x, 1.0 - _uvZ0.x);
    var edgeY = min(_uvZ0.y, 1.0 - _uvZ0.y);
    var blend0 = (cas0Valid > 0.5) ? clamp(min(edgeX, edgeY) / blendEdge, 0.0, 1.0) : 0.0;
    var edgeX1 = min(_uvZ1.x, 1.0 - _uvZ1.x);
    var edgeY1 = min(_uvZ1.y, 1.0 - _uvZ1.y);
    var blend1 = (cas1Valid > 0.5) ? clamp(min(edgeX1, edgeY1) / blendEdge, 0.0, 1.0) : 0.0;
    var sVal0 = 0.0;
    var sVal1 = 0.0;
    var sVal2 = 0.0;
    var x = -PCF;
    for (; x <= PCF + 0.5; x += 1.0) {
        var y = -PCF;
        for (; y <= PCF + 0.5; y += 1.0) {
            var uv0N = new CVec3(_uvZ0.x + x * texScale.x, _uvZ0.y + y * texScale.y, _read.y);
            var uv1N = new CVec3(_uvZ1.x + x * texScale.x, _uvZ1.y + y * texScale.y, _read.z);
            var uv2N = new CVec3(_uvZ2.x + x * texScale.x, _uvZ2.y + y * texScale.y, _read.w);
            if (jitter > 0.01) {
                var jitterVal = V2MulV2(randomJitter(new CVec2(x + _world.x, y + _world.y), jitter), texScale);
                uv0N.xy = V2AddV2(uv0N.xy, jitterVal);
            }
            if (cas0Valid > 0.5) {
                if (uv0N.x > 0.0 && uv0N.y > 0.0 && uv0N.x < 1.0 && uv0N.y < 1.0) {
                    var sp0 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv0N);
                    sVal0 += (sp0.w == 0.0) ? 0.0 : ((_uvZ0.z + _biasAll + f16Bias) >= sp0.z ? 0.0 : 1.0);
                }
            }
            if (cas1Valid > 0.5) {
                if (uv1N.x > 0.0 && uv1N.y > 0.0 && uv1N.x < 1.0 && uv1N.y < 1.0) {
                    var sp1 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv1N);
                    sVal1 += (sp1.w == 0.0) ? 0.0 : ((_uvZ1.z + _biasAll * 2.0 + f16Bias) >= sp1.z ? 0.0 : 1.0);
                }
            }
            if (cas2Valid > 0.5) {
                if (uv2N.x > 0.0 && uv2N.y > 0.0 && uv2N.x < 1.0 && uv2N.y < 1.0) {
                    var sp2 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv2N);
                    sVal2 += (sp2.w == 0.0) ? 0.0 : ((_uvZ2.z + _biasAll * 4.0 + f16Bias) >= sp2.z ? 0.0 : 1.0);
                }
            }
        }
    }
    var gridCount = (2.0 * PCF + 1.0) * (2.0 * PCF + 1.0);
    var res0 = 1.0 - sVal0 / gridCount;
    var res1 = 1.0 - sVal1 / gridCount;
    var res2 = 1.0 - sVal2 / gridCount;
    if (cas0Valid > 0.5 && cas1Valid > 0.5)
        return mix(res1, res0, blend0);
    if (cas0Valid > 0.5)
        return res0;
    if (cas1Valid > 0.5 && cas2Valid > 0.5)
        return mix(res2, res1, blend1);
    if (cas1Valid > 0.5)
        return res1;
    if (cas2Valid > 0.5)
        return res2;
    return 1.0;
}
function GetLightDir(_viewMatOff, _index) {
    var svm = Sam2DArrToMat(_viewMatOff, _index);
    return V3Nor(new CVec3(svm[0][2], svm[1][2], svm[2][2]));
}
function ProcessCascadeLevel(_isActive, _viewMatOff, _projMatOff, _offsetScale, _normalOffset, _worldPos, _index) {
    if (_isActive < -0.5)
        return new CVec3(0.0, 0.0, 0.0);
    var svm = Sam2DArrToMat(_viewMatOff, _index);
    var spm = Sam2DArrToMat(_projMatOff, _index);
    var world = new CVec4(V3AddV3(_worldPos.xyz, V3MulFloat(_normalOffset, _offsetScale)), _worldPos.w);
    var viewPos = V4MulMatCoordi(world, svm);
    var shadowPos = V4MulMatCoordi(viewPos, spm);
    return new CVec3(ShadowPosToUv(shadowPos).xy, viewPos.z);
}
export function calcShadow(_read, _index, _nor, _worldPos) {
    var ligDir = GetLightDir(shadowNearCasV0, _index);
    var NdotL = max(V3Dot(_nor, ligDir), 0.05);
    var tanTheta = sqrt(1.0 - NdotL * NdotL) / NdotL;
    var normalScale = normalBias * (1.0 + clamp(tanTheta, 0.0, 4.0));
    var normalOffset = V3MulFloat(V3Nor(_nor), normalScale);
    var biasAll = bias * (1.0 + clamp(tanTheta * 0.5, 0.0, 2.0));
    var uvZ0 = ProcessCascadeLevel(_read.y, shadowNearCasV0, shadowFarCasP0, 1.0, normalOffset, _worldPos, _index);
    var uvZ1 = ProcessCascadeLevel(_read.z, shadowTopCasV1, shadowBottomCasP1, 1.0, normalOffset, _worldPos, _index);
    var uvZ2 = ProcessCascadeLevel(_read.w, shadowLeftCasV2, shadowRightCasP2, 1.0, normalOffset, _worldPos, _index);
    var sVal = ApplyPCF(uvZ0, uvZ1, uvZ2, _read, biasAll, _worldPos);
    return sVal * (1.0 - shadowRate) + shadowRate;
}
export function calcParallaxShadow(_index, _uv, _ligDir, _heightScale) {
    var minLayers = 4.0;
    var maxLayers = 16.0;
    var numLayers = mix(maxLayers, minLayers, abs(V3Dot(new CVec3(0.0, 0.0, 1.0), _ligDir)));
    var currentTexCoords = _uv;
    var currentDepthMapValue = 1.0 - Sam2DToColor(_index, currentTexCoords).a + 0.01;
    var currentLayerDepth = currentDepthMapValue;
    var layerDepth = 1.0 / numLayers;
    var P = V2MulFloat(V2DivFloat(_ligDir.xy, _ligDir.z + 0.2), _heightScale);
    var deltaTexCoords = V2DivFloat(P, numLayers);
    while (currentLayerDepth <= currentDepthMapValue && currentLayerDepth > 0.0) {
        currentTexCoords = V2AddV2(currentTexCoords, deltaTexCoords);
        currentDepthMapValue = 1.0 - Sam2DToColor(_index, currentTexCoords).a;
        currentLayerDepth -= layerDepth;
    }
    var shadow;
    if (currentLayerDepth > currentDepthMapValue)
        shadow = 0.0;
    else
        shadow = 1.0;
    return shadow * (1.0 - shadowRate) + shadowRate;
}
