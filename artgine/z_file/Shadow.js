import { ligDir } from "./Light";
import { SDF } from "./SDF";
import { abs, acos, clamp, CMat, CVec2, CVec3, CVec4, FloatToInt, fract, GridSamplingDisk, max, min, mix, mod, round, Sam2DArrMat, Sam2DArrSize, Sam2DArrToColor, Sam2DArrToV4, Sam2DArrV4, Sam2DToColor, screenPos, ShadowPosToUv, sin, step, tan, TransposeMat3, TransposeMat4, V2AddV2, V2DivFloat, V2Dot, V2MulFloat, V2MulV2, V3Abs, V3AddV3, V3Dot, V3Len, V3MulFloat, V3MulMat3Normal, V3Nor, V3SubV3, V3ToMat3, V4Dot, V4MulMatCoordi } from "./Shader";
export var shadowCas0VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas0VPWithZRow);
export var shadowCas1VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas1VPWithZRow);
export var shadowCas2VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas2VPWithZRow);
export var shadowCas3VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas3VPWithZRow);
export var shadowNear = new Sam2DArrMat(1, SDF.eUni.MatShadowNear);
export var shadowFar = new Sam2DArrMat(1, SDF.eUni.MatShadowFar);
export var shadowTop = new Sam2DArrMat(1, SDF.eUni.MatShadowTop);
export var shadowBottom = new Sam2DArrMat(1, SDF.eUni.MatShadowBottom);
export var shadowLeft = new Sam2DArrMat(1, SDF.eUni.MatShadowLeft);
export var shadowRight = new Sam2DArrMat(1, SDF.eUni.MatShadowRight);
export var shadowOn = -1.0;
export var shadowReadList = new Sam2DArrV4(1, SDF.eUni.V4ShadowReadList);
export var shadowInfoList = new Sam2DArrV4(1, SDF.eUni.V4ShadowInfoList);
export var shadowCascadeDataList = new Sam2DArrV4(1, SDF.eUni.V4ShadowCascadeDataList);
export var shadowDivideList = new Sam2DArrV4(1, SDF.eUni.V4ShadowDivideList);
export var texture16f = 0;
export var shadowCount = 0;
export var shadowWrite = new CVec3(0, 0, 0);
export var shadowRate = 0.3;
export var bias = 4.0;
export var normalBias = 0.6;
export var PCF = 2.0;
export var PCFStep = 1.0;
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
function SampleShadowTexel(_uv, _layer, _depth) {
    var sp0 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, new CVec3(_uv, _layer));
    return (sp0.w == 0.0) ? 0.0 : step(_depth, sp0.z);
}
function ApplyPCF(_uvZ, _texZ, _texScale, _bias, _world) {
    var f16Bias = texture16f > 0.5 ? abs(_uvZ.z) * (1.0 / 1024.0) : 0.0;
    var depth = _uvZ.z + _bias + f16Bias;
    if (PCF < 0.5)
        return 1.0 - SampleShadowTexel(_uvZ.xy, _texZ, depth);
    var sVal = 0.0;
    var jitterVal = jitter > 0.01 ? randomJitter(new CVec2(_world.x, _world.y), jitter) : new CVec2(0.0, 0.0);
    var step = max(1.0, round(PCFStep));
    var offset = new CVec2(mod(screenPos.x, step), mod(screenPos.y, step));
    var count = 0.0;
    var x = -PCF * 0.5;
    for (; x <= PCF * 0.5; x += step) {
        var y = -PCF * 0.5;
        for (; y <= PCF * 0.5; y += step) {
            sVal += SampleShadowTexel(V2AddV2(_uvZ.xy, V2MulV2(new CVec2(x + jitterVal.x + offset.x, y + jitterVal.y + offset.y), _texScale)), _texZ, depth);
            count += 1.0;
        }
    }
    return 1.0 - sVal / count;
}
function ProcessCascadeLevel(_casMatOff, _shadowIndex, _world, _normal, _normalBiasTileScale) {
    _world.xyz = V3AddV3(_world.xyz, V3MulFloat(_normal, _normalBiasTileScale));
    var shadowViewZRow = Sam2DArrToV4(_casMatOff, _shadowIndex * 4.0 + 3.0);
    var shadowVPMat = TransposeMat4(new CMat(Sam2DArrToV4(_casMatOff, _shadowIndex * 4.0 + 0.0), Sam2DArrToV4(_casMatOff, _shadowIndex * 4.0 + 1.0), Sam2DArrToV4(_casMatOff, _shadowIndex * 4.0 + 2.0), new CVec4(0.0, 0.0, 0.0, 1.0)));
    var shadowPos = V4MulMatCoordi(_world, shadowVPMat);
    return new CVec3(ShadowPosToUv(shadowPos).xy, V4Dot(shadowViewZRow, _world));
}
function CalcShadowDirectional(_index, _world, _normal, _ligDir, _viewPos, _bias) {
    var shadowInfo = Sam2DArrToV4(shadowInfoList, _index);
    var shadowRead = Sam2DArrToV4(shadowReadList, _index);
    var shadowCascadeData = Sam2DArrToV4(shadowCascadeDataList, _index);
    var shadowDivide = Sam2DArrToV4(shadowDivideList, _index);
    var linearDepth = -_viewPos.z / shadowInfo.z;
    if (linearDepth > 1.0)
        return 1.0;
    var texSize = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
    var texScale = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
    var shadowCasMat = new CMat(0);
    shadowCasMat[0].xyz = shadowCas0VPMatWithZRow;
    shadowCasMat[1].xyz = shadowCas1VPMatWithZRow;
    shadowCasMat[2].xyz = shadowCas2VPMatWithZRow;
    shadowCasMat[3].xyz = shadowCas3VPMatWithZRow;
    var lastCascadeIndex = shadowRead[3] > -0.5 ? 3.0 : (shadowRead[2] > -0.5 ? 2.0 : (shadowRead[1] > -0.5 ? 1.0 : 0.0));
    var shadowSum = 0.0;
    var weightSum = 0.0;
    var nearDepth = 0.0;
    for (let i = 0; i < 4; i++) {
        if (shadowRead[i] < -0.5)
            continue;
        var farDepth = nearDepth + shadowDivide[i];
        var centerDepth = (nearDepth + farDepth) * 0.5;
        var closestEdge = linearDepth < centerDepth ? nearDepth : farDepth;
        var margin = shadowInfo.w * closestEdge * closestEdge;
        var csmx = nearDepth - margin * 0.5;
        var csmy = farDepth + margin * 0.5;
        if (csmx <= linearDepth && (linearDepth < csmy || i == FloatToInt(lastCascadeIndex))) {
            var dist = min(linearDepth - csmx, csmy - linearDepth);
            var ratio = clamp(dist / margin, 0.0, 1.0);
            var shouldFadeLastCascade = (i == FloatToInt(lastCascadeIndex) && linearDepth > centerDepth) ? 1.0 : 0.0;
            var shouldBlend = (i != FloatToInt(lastCascadeIndex) || (i == FloatToInt(lastCascadeIndex) && linearDepth < centerDepth)) ? 1.0 : 0.0;
            var blendRatio = (shouldFadeLastCascade > 0.5 || shouldBlend > 0.5) ? ratio : 1.0;
            var uvZ = ProcessCascadeLevel(shadowCasMat[i].xyz, _index, _world, _normal, shadowCascadeData[i]);
            var curShadow = ApplyPCF(uvZ, shadowRead[i], texScale, _bias, _world);
            shadowSum += curShadow * blendRatio;
            weightSum += blendRatio;
        }
        nearDepth = farDepth;
    }
    return clamp(shadowSum + 1.0 - weightSum, 0.0, 1.0);
}
function CubeToUV(_cubeUVW, _texelSize, _nearTexOff) {
    _cubeUVW = V3Nor(_cubeUVW);
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
function CalcShadowPoint(_index, _world, _normal, _ligDir, _camPos, _info, _bias) {
    var shadowCascadeData = Sam2DArrToV4(shadowCascadeDataList, _index);
    var filterSize = shadowCascadeData.x * max(PCF + 1.0, 1.0);
    _world.xyz = V3AddV3(_world.xyz, V3MulFloat(_normal, filterSize));
    var ligToPos = V3SubV3(_world.xyz, _ligDir.xyz);
    var ligToPosLength = V3Len(ligToPos);
    var sVal = 1.0;
    if (ligToPosLength <= _info.w && ligToPosLength >= _info.z) {
        var depth = (ligToPosLength - _info.z) / (_info.w - _info.z);
        var texSize = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
        var texScale = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
        var depthBias = _bias / 1024.0;
        var viewDistance = V3Len(V3SubV3(_world.xyz, _camPos));
        var diskRadius = (1.0 + (viewDistance - _info.z) / (_info.w - _info.z)) / 25.0 * 20.0;
        var samples = clamp((PCF + 1.0) * (PCF + 1.0), 1.0, 20.0);
        sVal = 0.0;
        var i = 0.0;
        for (; i < samples; i++) {
            var uvw = CubeToUV(V3AddV3(ligToPos, V3MulFloat(GridSamplingDisk(i), diskRadius)), texScale, _info.y);
            var sp = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, uvw);
            sVal += (sp.w == 0.0) ? 1.0 : ((depth - depthBias) >= sp.z ? 0.0 : 1.0);
        }
        sVal /= samples;
    }
    return sVal;
}
export function CalcShadow(_index, _normal, _world, _camPos, _viewPos) {
    var shadowInfo = Sam2DArrToV4(shadowInfoList, _index);
    var lDir = Sam2DArrToV4(ligDir, shadowInfo.x);
    var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
    var NdotL = clamp(V3Dot(_normal, V3Nor(lDir.xyz)), 0.001, 1.0);
    var tanTheta = tan(acos(NdotL));
    var normalScale = normalBias * min(tanTheta, 5.0);
    _normal = V3MulFloat(_normal, normalScale);
    var biasSlope = bias * min(tanTheta, 4.0);
    var sVal;
    if (isPointLight > 0.5)
        sVal = CalcShadowPoint(_index, _world, _normal, lDir, _camPos, shadowInfo, biasSlope);
    else
        sVal = CalcShadowDirectional(_index, _world, _normal, lDir, _viewPos, biasSlope);
    return mix(shadowRate, 1.0, sVal);
}
export function CalcParallaxShadow(_shadowIndex, _world, _uv, _texOff, _heightScale, _tan, _bi, _nor) {
    var shadowInfo = Sam2DArrToV4(shadowInfoList, _shadowIndex);
    var lDir = Sam2DArrToV4(ligDir, shadowInfo.x);
    var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
    if (isPointLight > 0.5) {
        var outRadius = shadowInfo.w;
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
