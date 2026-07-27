import { ligDir } from "./Light";
import { SDF } from "./SDF";
import { abs, clamp, CVec2, CVec3, fract, max, min, mix, Sam2DArrMat, Sam2DArrSize, Sam2DArrToColor, Sam2DArrToMat, Sam2DArrToV4, Sam2DArrV4, Sam2DToColor, ShadowPosToUv, sin, sqrt, TransposeMat3, V2AddV2, V2DivFloat, V2Dot, V2MulFloat, V2MulV2, V3Abs, V3AddV3, V3Dot, V3Len, V3MulFloat, V3MulMat3Normal, V3Nor, V3SubV3, V3ToMat3, V4MulMatCoordi } from "./Shader";
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
function ApplyPCF(_uvZ0, _uvZ1, _uvZ2, _read, _biasConst, _biasSlope, _world) {
    var f16Bias = SDF.FloatTex16 > 0 ? abs(_uvZ0.z) * (2.0 / 1024.0) : 0.0;
    var bias0 = _biasConst + _biasSlope * 1.0;
    var bias1 = _biasConst + _biasSlope * 4.0;
    var bias2 = _biasConst + _biasSlope * 16.0;
    var texSize = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
    var texScale = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
    var cas0Valid = (_read.y > -0.5 && _uvZ0.x > 0.0 && _uvZ0.y > 0.0 && _uvZ0.x < 1.0 && _uvZ0.y < 1.0) ? 1.0 : 0.0;
    var cas1Valid = (_read.z > -0.5 && _uvZ1.x > 0.0 && _uvZ1.y > 0.0 && _uvZ1.x < 1.0 && _uvZ1.y < 1.0) ? 1.0 : 0.0;
    var cas2Valid = (_read.w > -0.5 && _uvZ2.x > 0.0 && _uvZ2.y > 0.0 && _uvZ2.x < 1.0 && _uvZ2.y < 1.0) ? 1.0 : 0.0;
    var blendEdge0 = 0.4;
    var blendEdge1 = 0.2;
    var cen0 = new CVec2(_uvZ0.x - 0.5, _uvZ0.y - 0.5);
    var r0 = sqrt(V2Dot(cen0, cen0));
    var blend0 = (cas0Valid > 0.5) ? clamp((0.5 - r0) / blendEdge0, 0.0, 1.0) : 0.0;
    var cen1 = new CVec2(_uvZ1.x - 0.5, _uvZ1.y - 0.5);
    var r1 = sqrt(V2Dot(cen1, cen1));
    var blend1 = (cas1Valid > 0.5) ? clamp((0.5 - r1) / blendEdge1, 0.0, 1.0) : 0.0;
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
                    sVal0 += (sp0.w == 0.0) ? 0.0 : ((_uvZ0.z + bias0 + f16Bias) >= sp0.z ? 0.0 : 1.0);
                }
            }
            if (cas1Valid > 0.5) {
                if (uv1N.x > 0.0 && uv1N.y > 0.0 && uv1N.x < 1.0 && uv1N.y < 1.0) {
                    var sp1 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv1N);
                    sVal1 += (sp1.w == 0.0) ? 0.0 : ((_uvZ1.z + bias1 + f16Bias) >= sp1.z ? 0.0 : 1.0);
                }
            }
            if (cas2Valid > 0.5) {
                if (uv2N.x > 0.0 && uv2N.y > 0.0 && uv2N.x < 1.0 && uv2N.y < 1.0) {
                    var sp2 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uv2N);
                    sVal2 += (sp2.w == 0.0) ? 0.0 : ((_uvZ2.z + bias2 + f16Bias) >= sp2.z ? 0.0 : 1.0);
                }
            }
        }
    }
    var gridCount = (2.0 * PCF + 1.0) * (2.0 * PCF + 1.0);
    var res0 = 1.0 - sVal0 / gridCount;
    var res1 = 1.0 - sVal1 / gridCount;
    var res2 = 1.0 - sVal2 / gridCount;
    if (cas0Valid > 0.5 && cas1Valid > 0.5)
        return min(min(mix(res1, res0, blend0), res1), (cas2Valid > 0.5) ? res2 : 1.0);
    if (cas0Valid > 0.5)
        return res0;
    if (cas1Valid > 0.5 && cas2Valid > 0.5)
        return min(mix(res2, res1, blend1), res2);
    if (cas1Valid > 0.5)
        return res1;
    if (cas2Valid > 0.5)
        return res2;
    return 1.0;
}
function ProcessCascadeLevel(_isActive, _viewMatOff, _projMatOff, _shadowIndex, _world, _normal, _normalBias) {
    if (_isActive < -0.5)
        return new CVec3(0.0, 0.0, 0.0);
    var viewMat = Sam2DArrToMat(_viewMatOff, _shadowIndex);
    var cascadeTexelSize = viewMat[0][3];
    viewMat[0][3] = 0.0;
    _world.xyz = V3AddV3(_world.xyz, V3MulFloat(_normal, _normalBias * cascadeTexelSize));
    var viewPos = V4MulMatCoordi(_world, viewMat);
    var shadowPos = V4MulMatCoordi(viewPos, Sam2DArrToMat(_projMatOff, _shadowIndex));
    return new CVec3(ShadowPosToUv(shadowPos).xy, viewPos.z);
}
function CalcShadowDirectional(_read, _index, _world, _normal, _ligDir, _bias) {
    var uvZ0 = ProcessCascadeLevel(_read.y, shadowNearCasV0, shadowFarCasP0, _index, _world, _normal, _bias.z);
    var uvZ1 = ProcessCascadeLevel(_read.z, shadowTopCasV1, shadowBottomCasP1, _index, _world, _normal, _bias.z);
    var uvZ2 = ProcessCascadeLevel(_read.w, shadowLeftCasV2, shadowRightCasP2, _index, _world, _normal, _bias.z);
    return ApplyPCF(uvZ0, uvZ1, uvZ2, _read, _bias.x, _bias.y, _world);
}
function CubeToUV(_cubeUVW, _texelSize, _nearTexOff) {
    var absDir = V3Abs(_cubeUVW);
    var scaleToCube = 1.0 / max(absDir.x, max(absDir.y, absDir.z));
    absDir = V3MulFloat(absDir, scaleToCube);
    _cubeUVW = V3MulFloat(_cubeUVW, scaleToCube);
    if (absDir.x >= absDir.y && absDir.x >= absDir.z) {
        if (_cubeUVW.x > 0.0)
            _cubeUVW = new CVec3(_cubeUVW.z, _cubeUVW.y, SDF.eShadow.Near);
        else
            _cubeUVW = new CVec3(-_cubeUVW.z, _cubeUVW.y, SDF.eShadow.Far);
    }
    else if (absDir.y >= absDir.x && absDir.y >= absDir.z) {
        if (_cubeUVW.y > 0.0)
            _cubeUVW = new CVec3(_cubeUVW.x, _cubeUVW.z, SDF.eShadow.Top);
        else
            _cubeUVW = new CVec3(_cubeUVW.x, -_cubeUVW.z, SDF.eShadow.Bottom);
    }
    else {
        if (_cubeUVW.z > 0.0)
            _cubeUVW = new CVec3(-_cubeUVW.x, _cubeUVW.y, SDF.eShadow.Left);
        else
            _cubeUVW = new CVec3(_cubeUVW.x, _cubeUVW.y, SDF.eShadow.Right);
    }
    _cubeUVW.xy = V2AddV2(V2MulFloat(_cubeUVW.xy, 0.5), new CVec2(0.5, 0.5));
    _cubeUVW.z += _nearTexOff - SDF.eShadow.Near;
    return _cubeUVW;
}
function CalcShadowPoint(_read, _index, _world, _normal, _ligDir, _bias) {
    var shadowCamNear = _read.z;
    var shadowCamFar = _read.w;
    var ligToPos = V3SubV3(_world.xyz, _ligDir.xyz);
    var ligToPosLength = V3Len(ligToPos);
    var sVal = 1.0;
    if (ligToPosLength <= shadowCamFar && ligToPosLength >= shadowCamNear) {
        var depth = (ligToPosLength - shadowCamNear) / (shadowCamFar - shadowCamNear);
        var ligDir = V3Nor(ligToPos);
        var texSize = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
        var texScale = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
        var pcf = max(PCF + 1.0, 1.0);
        var offset = 0.01;
        sVal = 0.0;
        var x = -offset;
        for (; x < offset; x += offset / (pcf * 0.5)) {
            var y = -offset;
            for (; y < offset; y += offset / (pcf * 0.5)) {
                var z = -offset;
                for (; z < offset; z += offset / (pcf * 0.5)) {
                    var uvw = CubeToUV(V3AddV3(ligDir, new CVec3(x, y, z)), texScale, _read.y);
                    var sp = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uvw);
                    sVal += (sp.w == 0.0) ? 1.0 : (depth >= sp.z ? 0.0 : 1.0);
                }
            }
        }
        sVal /= (PCF + 1.0) * (PCF + 1.0);
    }
    return sVal;
}
export function CalcShadow(_shadowIndex, _normal, _world) {
    var shadowRead = Sam2DArrToV4(shadowReadList, _shadowIndex);
    var lDir = Sam2DArrToV4(ligDir, shadowRead.x);
    var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
    var NdotL = max(V3Dot(_normal, V3Nor(lDir.xyz)), 0.05);
    var tanTheta = sqrt(1.0 - NdotL * NdotL) / NdotL;
    var normalScale = normalBias * (1.0 + clamp(tanTheta, 0.0, 4.0));
    var biasConst = bias;
    var biasSlope = bias * clamp(tanTheta * 0.5, 0.0, 2.0);
    var biasAll = new CVec3(biasConst, biasSlope, normalScale);
    var sVal;
    if (isPointLight > 0.5)
        sVal = CalcShadowPoint(shadowRead, _shadowIndex, _world, _normal, lDir, biasAll);
    else
        sVal = CalcShadowDirectional(shadowRead, _shadowIndex, _world, _normal, lDir, biasAll);
    return mix(shadowRate, 1.0, sVal);
}
export function CalcParallaxShadow(_shadowIndex, _world, _uv, _texOff, _heightScale, _tan, _bi, _nor) {
    var shadowRead = Sam2DArrToV4(shadowReadList, _shadowIndex);
    var lDir = Sam2DArrToV4(ligDir, shadowRead.x);
    var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
    if (isPointLight > 0.5) {
        var outRadius = shadowRead.w;
        lDir.xyz = V3SubV3(lDir.xyz, _world.xyz);
        var dist = V3Len(lDir.xyz);
        if (dist > outRadius)
            return shadowRate;
    }
    lDir.xyz = V3Nor(lDir.xyz);
    var TBN = TransposeMat3(V3ToMat3(_tan, _bi, _nor));
    lDir.xyz = V3MulMat3Normal(lDir.xyz, TBN);
    if (lDir.z <= 0.0)
        return shadowRate;
    var minLayers = 4.0;
    var maxLayers = 16.0;
    var numLayers = mix(maxLayers, minLayers, abs(V3Dot(new CVec3(0.0, 0.0, 1.0), lDir.xyz)));
    lDir.z += 0.2;
    var P = V2MulFloat(V2DivFloat(lDir.xy, lDir.z), _heightScale);
    var deltaTexCoords = V2DivFloat(P, numLayers);
    var currentTexCoords = _uv;
    var currentDepthMapValue = 1.0 - Sam2DToColor(_texOff.y, currentTexCoords).a;
    var currentLayerDepth = currentDepthMapValue;
    var layerDepth = currentDepthMapValue / numLayers;
    var shadowMultiplier = 0.0;
    var stepIndex = 0.0;
    while (currentLayerDepth > 0.0) {
        if (currentDepthMapValue < currentLayerDepth)
            shadowMultiplier = max(shadowMultiplier, (currentLayerDepth - currentDepthMapValue) * (1.0 - stepIndex / numLayers) * 10.0);
        stepIndex += 1.0;
        currentTexCoords = V2AddV2(currentTexCoords, deltaTexCoords);
        currentDepthMapValue = 1.0 - Sam2DToColor(_texOff.y, currentTexCoords).a;
        currentLayerDepth -= layerDepth;
    }
    return mix(shadowRate, 1.0, 1.0 - shadowMultiplier);
}
