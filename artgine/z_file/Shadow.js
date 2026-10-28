import { ligDir } from "./Light";
import { SDF } from "./SDF";
import { abs, clamp, CMat, CVec2, CVec3, CVec4, FloatToInt, floor, fract, GridSamplingDisk, IntToFloat, max, min, mix, Sam2DArrMat, Sam2DArrSize, Sam2DArrToColor, Sam2DArrNearestToV4, Sam2DToColor, screenPos, ShadowPosToUv, sin, sqrt, step, TransposeMat3, TransposeMat4, V2AddV2, V2DivFloat, V2Dot, V2Floor, V2Mod, V2MulFloat, V3Abs, V3AddV3, V3Dot, V3Len, V3MulFloat, V3MulMat3Normal, V3Nor, V3SubV3, V3ToMat3, V4Dot, V4MulMatCoordi } from "./Shader";
export var shadowCas0VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas0VPWithZRow);
export var shadowCas1VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas1VPWithZRow);
export var shadowCas2VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas2VPWithZRow);
export var shadowCas3VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas3VPWithZRow);
export var shadowCas4VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas4VPWithZRow);
export var shadowCas5VPMatWithZRow = new Sam2DArrMat(1, SDF.eUni.MatShadowCas5VPWithZRow);
export var shadowNear = new Sam2DArrMat(1, SDF.eUni.MatShadowNear);
export var shadowFar = new Sam2DArrMat(1, SDF.eUni.MatShadowFar);
export var shadowTop = new Sam2DArrMat(1, SDF.eUni.MatShadowTop);
export var shadowBottom = new Sam2DArrMat(1, SDF.eUni.MatShadowBottom);
export var shadowLeft = new Sam2DArrMat(1, SDF.eUni.MatShadowLeft);
export var shadowRight = new Sam2DArrMat(1, SDF.eUni.MatShadowRight);
export var shadowOn = -1.0;
export var shadowInfoList = new Sam2DArrMat(1, SDF.eUni.V4ShadowInfoList);
export var texture16f = 0;
export var shadowCount = 0;
export var shadowWrite = new CVec3(0, 0, 0);
export var shadowZOffset = 0.0;
export var shadowRate = 0.3;
export var bias = 1.0;
export var normalBias = 0.2;
export var PCF = 3.0;
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
function Sam2DCompare(_number, _uv, _compare) {
    var sp0 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, _uv);
    return sp0.w < 1.0 ? 0.0 : step(_compare, sp0.z);
}
function ApplyPCF(_uvZ, _texLayer, _depthBias, _offset, _texelSize) {
    var f16Bias = texture16f > 0.5 ? abs(_uvZ.z) * (1.0 / 1024.0) : 0.0;
    _uvZ.z += _depthBias + f16Bias;
    var inFrustum = (_uvZ.x >= 0.0 && _uvZ.x <= 1.0 && _uvZ.y >= 0.0 && _uvZ.y <= 1.0) ? 1.0 : 0.0;
    if (inFrustum < 0.5)
        return 1.0;
    var sVal = 0.0;
    var count = 0.0;
    var halfPCF = floor(PCF) * 0.5;
    var step = max(1.0, floor(PCFStep));
    var x = -halfPCF;
    for (; x <= halfPCF; x += step) {
        var sampleU = _uvZ.x + (x + _offset.x) * _texelSize.x;
        var y = -halfPCF;
        for (; y <= halfPCF; y += step) {
            var sampleV = _uvZ.y + (y + _offset.y) * _texelSize.y;
            sVal += Sam2DCompare(SDF.eTexSlot.ArrShadowWrite, new CVec3(sampleU, sampleV, _texLayer), _uvZ.z);
            count += 1.0;
        }
    }
    return 1.0 - (sVal / count);
}
function ProcessCascadeLevel(_casMatOff, _shadowIndex, _world) {
    var baseIdx = _shadowIndex * 4.0;
    var shadowViewZRow = Sam2DArrNearestToV4(_casMatOff, baseIdx + 3.0);
    var shadowVPMat = TransposeMat4(new CMat(Sam2DArrNearestToV4(_casMatOff, baseIdx + 0.0), Sam2DArrNearestToV4(_casMatOff, baseIdx + 1.0), Sam2DArrNearestToV4(_casMatOff, baseIdx + 2.0), new CVec4(0.0, 0.0, 0.0, 1.0)));
    var shadowPos = V4MulMatCoordi(new CVec4(_world, 1.0), shadowVPMat);
    return new CVec3(ShadowPosToUv(shadowPos).xy, V4Dot(shadowViewZRow, new CVec4(_world, 1.0)));
}
function GetCasInfo(_casIndex, _row2, _row3) {
    var index;
    index.dummy = FloatToInt(_casIndex);
    if (index.dummy == 0)
        return new CVec4(shadowCas0VPMatWithZRow.x, shadowCas0VPMatWithZRow.y, shadowCas0VPMatWithZRow.z, _row2[2]);
    if (index.dummy == 1)
        return new CVec4(shadowCas1VPMatWithZRow.x, shadowCas1VPMatWithZRow.y, shadowCas1VPMatWithZRow.z, _row2[3]);
    if (index.dummy == 2)
        return new CVec4(shadowCas2VPMatWithZRow.x, shadowCas2VPMatWithZRow.y, shadowCas2VPMatWithZRow.z, _row3[0]);
    if (index.dummy == 3)
        return new CVec4(shadowCas3VPMatWithZRow.x, shadowCas3VPMatWithZRow.y, shadowCas3VPMatWithZRow.z, _row3[1]);
    if (index.dummy == 4)
        return new CVec4(shadowCas4VPMatWithZRow.x, shadowCas4VPMatWithZRow.y, shadowCas4VPMatWithZRow.z, _row3[2]);
    if (index.dummy == 5)
        return new CVec4(shadowCas5VPMatWithZRow.x, shadowCas5VPMatWithZRow.y, shadowCas5VPMatWithZRow.z, _row3[3]);
    return new CVec4(0.0, 0.0, 0.0, 0.0);
}
function GetCasDepth(_casIndex, _row1, _row2) {
    var index;
    index.dummy = FloatToInt(_casIndex);
    if (index.dummy == 0)
        return _row1[0];
    if (index.dummy == 1)
        return _row1[1];
    if (index.dummy == 2)
        return _row1[2];
    if (index.dummy == 3)
        return _row1[3];
    if (index.dummy == 4)
        return _row2[0];
    if (index.dummy == 5)
        return 1.0 - (_row1[0] + _row1[1] + _row1[2] + _row1[3] + _row2[0]);
    return 0.0;
}
function CalcShadowDirectional(_index, _world, _normal, _ligDir, _camPos, _row0, _viewPos) {
    var linearDepth = -_viewPos.z / _row0.z;
    if (linearDepth > 1.0)
        return 1.0;
    var texSize = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
    var texelSize = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
    var NdotL = clamp(V3Dot(_normal, V3Nor(_ligDir.xyz)), 0.0, 1.0);
    var tanT = min(sqrt(1.0 - NdotL * NdotL) / max(NdotL, 0.05), 10.0);
    var kernel = 1.0 + floor(PCF) * 0.5 + jitter * 0.5;
    var offset = V2Mod(V2Floor(screenPos.xy), max(1.0, floor(PCFStep)));
    var jitterVal = randomJitter(new CVec2(_world.xy), jitter);
    var totalOffset = V2AddV2(jitterVal, offset);
    var row1 = Sam2DArrNearestToV4(shadowInfoList, _index * 4.0 + 1.0);
    var row2 = Sam2DArrNearestToV4(shadowInfoList, _index * 4.0 + 2.0);
    var row3 = Sam2DArrNearestToV4(shadowInfoList, _index * 4.0 + 3.0);
    var world = V3SubV3(_world.xyz, _camPos);
    var lastCasIndex;
    lastCasIndex.dummy = FloatToInt(row2.y);
    var fade = _row0.w;
    var texIndex = _row0.y;
    var shadow = 1.0;
    var cascade = new CVec2(0.0, 0.0);
    for (var i = 0; i <= lastCasIndex.dummy; i++) {
        cascade.x = cascade.y;
        cascade.y += GetCasDepth(IntToFloat(i), row1, row2);
        var casCenter = (cascade.x + cascade.y) * 0.5;
        var closestEdge = linearDepth < casCenter ? cascade.x : cascade.y;
        var margin = fade * closestEdge;
        var csmx = cascade.x - margin * 0.5;
        var csmy = cascade.y + margin * 0.5;
        if (linearDepth >= csmx && (linearDepth < csmy || i == lastCasIndex.dummy)) {
            var dist = min(linearDepth - csmx, csmy - linearDepth);
            var ratio = clamp(dist / margin, 0.0, 1.0);
            var casInfo = GetCasInfo(IntToFloat(i), row2, row3);
            var casMatOff = casInfo.xyz;
            var texel = casInfo.w;
            var scaledNormalBias = normalBias * texel * (0.5 + floor(PCF) * 0.5);
            var slopedDepthBias = 0.1414 * bias * texel * kernel * (0.1 + tanT);
            var uvZ = ProcessCascadeLevel(casMatOff, _index, V3AddV3(world.xyz, V3MulFloat(_normal, scaledNormalBias)));
            var curShadow = ApplyPCF(uvZ, texIndex + IntToFloat(i), slopedDepthBias, totalOffset, texelSize);
            var shouldFadeLastCascade = (i == lastCasIndex.dummy && linearDepth > casCenter) ? 1.0 : 0.0;
            curShadow = mix(1.0, curShadow, shouldFadeLastCascade > 0.5 ? 2.0 * ratio - 1.0 : 1.0);
            var shouldBlend = linearDepth < casCenter ? 1.0 : 0.0;
            shadow = mix(shadow, curShadow, shouldBlend > 0.5 ? ratio : 1.0);
        }
    }
    return shadow;
}
function CubeToUV(_cubeUVW, _texelSize, _texOff) {
    _cubeUVW = V3Nor(_cubeUVW);
    var absDir = V3Abs(_cubeUVW);
    var scaleToCube = 1.0 / max(absDir.x, max(absDir.y, absDir.z));
    absDir = V3MulFloat(absDir, scaleToCube);
    _cubeUVW = V3MulFloat(_cubeUVW, scaleToCube * (1.0 - 2.0 * _texelSize.y));
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
    _cubeUVW.z += _texOff - SDF.eShadow.Near;
    return _cubeUVW;
}
function Sam2DCompareCube(_uv, _compare) {
    var sp0 = Sam2DArrToColor(SDF.eTexSlot.ArrShadowWrite, _uv);
    return sp0.w < 1.0 ? 0.0 : step(_compare, -abs(sp0.z));
}
function CubeAxisDepth(_dir, _pos) {
    var a = V3Abs(_dir);
    if (a.x >= a.y && a.x >= a.z)
        return abs(_pos.x);
    if (a.y >= a.z)
        return abs(_pos.y);
    return abs(_pos.z);
}
function CalcShadowPoint(_index, _world, _normal, _ligDir, _camPos, _row0) {
    var texOff = _row0.y;
    var far = _row0.z;
    var normalBiasTileScale = _row0.w;
    var NdotL = clamp(V3Dot(_normal, V3Nor(V3SubV3(_world.xyz, _ligDir.xyz))), 0.1, 0.9);
    var slopedNormalBias = normalBias * (1.0 - NdotL) * (1.0 + PCF * 0.5);
    var slopedDepthBias = bias * (1.0 - NdotL);
    _world.xyz = V3AddV3(_world.xyz, V3MulFloat(_normal, slopedNormalBias * normalBiasTileScale));
    var ligToPos = V3SubV3(_world.xyz, _ligDir.xyz);
    var ligToPosLength = V3Len(ligToPos);
    if (ligToPosLength <= far) {
        var texSize = Sam2DArrSize(SDF.eTexSlot.ArrShadowWrite);
        var texScale = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
        var depthBias = slopedDepthBias * texScale.x * far;
        var viewDistance = V3Len(V3SubV3(_world.xyz, _camPos));
        var diskRadius = (1.0 + viewDistance / far) * 0.8;
        var samples = clamp((PCF + 1.0) * (PCF + 1.0), 1.0, 20.0);
        var sVal = 0.0;
        for (var i = 0; i < FloatToInt(samples); i++) {
            var sampleDir = V3AddV3(ligToPos, V3MulFloat(GridSamplingDisk(IntToFloat(i)), diskRadius));
            var uvw = CubeToUV(sampleDir, texScale, texOff);
            var sampleU = V3Nor(sampleDir);
            var planeDot = V3Dot(_normal, sampleU);
            var rayLen = abs(planeDot) > 0.05 ? V3Dot(_normal, ligToPos) / planeDot : ligToPosLength;
            rayLen = clamp(rayLen, ligToPosLength * 0.5, ligToPosLength * 2.0);
            sVal += Sam2DCompareCube(uvw, -CubeAxisDepth(sampleDir, V3MulFloat(sampleU, rayLen)) + depthBias);
        }
        return 1.0 - sVal / samples;
    }
    return 1.0;
}
export function CalcShadow(_index, _normal, _world, _camPos, _viewPos) {
    var row0 = Sam2DArrNearestToV4(shadowInfoList, _index * 4.0);
    var lDir = Sam2DArrNearestToV4(ligDir, row0.x);
    var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
    return mix(shadowRate, 1.0, isPointLight > 0.5 ? CalcShadowPoint(_index, _world, _normal, lDir, _camPos, row0) : CalcShadowDirectional(_index, _world, _normal, lDir, _camPos, row0, _viewPos));
}
export function CalcParallaxShadow(_shadowIndex, _world, _uv, _texOff, _heightScale, _tan, _bi, _nor) {
    var row0 = Sam2DArrNearestToV4(shadowInfoList, _shadowIndex * 4.0);
    var lDir = Sam2DArrNearestToV4(ligDir, row0.x);
    var isPointLight = lDir.w > 1.1 ? 1.0 : 0.0;
    if (isPointLight > 0.5) {
        var outRadius = row0.z;
        lDir.xyz = V3SubV3(lDir.xyz, _world.xyz);
        var dist = V3Len(lDir.xyz);
        if (dist > outRadius)
            return 1.0;
    }
    lDir.xyz = V3Nor(lDir.xyz);
    var TBN = TransposeMat3(V3ToMat3(_tan, _bi, _nor));
    lDir.xyz = V3MulMat3Normal(lDir.xyz, TBN);
    if (lDir.z <= 0.0)
        return isPointLight > 0.5 ? 1.0 : shadowRate;
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
    for (var i = 0; i < 32; i++) {
        if (currentLayerDepth <= 0.0)
            break;
        if (currentDepthMapValue < currentLayerDepth)
            shadowMultiplier = max(shadowMultiplier, (currentLayerDepth - currentDepthMapValue) * (1.0 - stepIndex / numLayers) * 10.0);
        stepIndex += 1.0;
        currentTexCoords = V2AddV2(currentTexCoords, deltaTexCoords);
        currentDepthMapValue = 1.0 - Sam2DToColor(_texOff.y, currentTexCoords).a;
        currentLayerDepth -= layerDepth;
    }
    return mix(shadowRate, 1.0, 1.0 - shadowMultiplier);
}
