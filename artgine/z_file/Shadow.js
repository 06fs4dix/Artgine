import { abs, cos, CVec2, CVec3, CVec4, fract, mix, round, Sam2DArrSize, Sam2DArrToColor, Sam2DMat, Sam2DToColor, Sam2DToMat, Sam2DV4, screenPos, ShadowPosToUv, sin, V2AddV2, V2DivFloat, V2Dot, V2MulFloat, V3AddV3, V3Dot, V3MulFloat, V3Nor, V4MulMatCoordi } from "./Shader";
export var shadowNearCasV0 = new Sam2DMat(11, 252);
export var shadowFarCasP0 = new Sam2DMat(11, 256);
export var shadowTopCasV1 = new Sam2DMat(11, 260);
export var shadowBottomCasP1 = new Sam2DMat(11, 264);
export var shadowLeftCasV2 = new Sam2DMat(11, 268);
export var shadowRightCasP2 = new Sam2DMat(11, 272);
export var shadowPointProj = new Sam2DMat(11, 276);
export var shadowOn = -1.0;
export var shadowReadList = new Sam2DV4(11, 280);
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
function ApplyPCF(_uvZ0, _uvZ1, _uvZ2, _read, _biasAll) {
    var f16Chk = 1.0;
    if (texture16f > 0.0)
        f16Chk = 4.0;
    var texSize = Sam2DArrSize(0.0);
    var texScale = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
    var sVal = 0.0;
    var count = 0.0;
    var x = -PCF;
    var depthChk = 0.0;
    var jitterValue;
    for (; x <= PCF + 0.5; x += 1.0) {
        var y = -PCF;
        for (; y <= PCF + 0.5; y += 1.0) {
            if (jitter > 0.01) {
                jitterValue = randomJitter(new CVec2(x + screenPos.x, y + screenPos.y), jitter);
            }
            var uv0N = new CVec3(_uvZ0.x + (x + jitterValue.x) * texScale.x, _uvZ0.y + (y + jitterValue.y) * texScale.y, _read.y);
            var uv1N = new CVec3(_uvZ1.x + x * texScale.x, _uvZ1.y + y * texScale.y, _read.z);
            var uv2N = new CVec3(_uvZ2.x + x * texScale.x, _uvZ2.y + y * texScale.y, _read.w);
            if (_read.y > -0.5 && uv0N.x > 0.0 && uv0N.y > 0.0 && uv0N.x < 1.0 && uv0N.y < 1.0) {
                var shadowParam = Sam2DArrToColor(0.0, uv0N);
                var depth = shadowParam.z;
                if (shadowParam.w == 0.0)
                    sVal += 1.0;
                else
                    sVal += (_uvZ0.z + _biasAll * f16Chk) >= depth ? 1.0 : 0.0;
                count += 1.0;
            }
            else if (_read.z > -0.5 && uv1N.x > 0.0 && uv1N.y > 0.0 && uv1N.x < 1.0 && uv1N.y < 1.0) {
                var shadowParam = Sam2DArrToColor(0.0, uv1N);
                var depth = shadowParam.z;
                if (shadowParam.w == 0.0)
                    sVal += 1.0;
                else
                    sVal += (_uvZ1.z + _biasAll * f16Chk * 2.0) >= depth ? 1.0 : 0.0;
                count += 1.0;
                if (shadowParam.w == 0.0)
                    sVal += 1.0;
            }
            else if (_read.w > -0.5 && uv2N.x > 0.0 && uv2N.y > 0.0 && uv2N.x < 1.0 && uv2N.y < 1.0) {
                var shadowParam = Sam2DArrToColor(0.0, uv2N);
                var depth = shadowParam.z;
                if (shadowParam.w == 0.0)
                    sVal += 1.0;
                else
                    sVal += (_uvZ2.z + _biasAll * f16Chk * 4.0) >= depth ? 1.0 : 0.0;
                count += 1.0;
            }
        }
    }
    return new CVec2(sVal, count);
}
function ApplyJitteredPCF(_uvZ0, _uvZ1, _uvZ2, _read, _biasAll, _worldPos) {
    var f16Chk = 1.0;
    if (texture16f > 0.0)
        f16Chk = 4.0;
    var sVal = 0.0;
    var count = 0.0;
    var texSize = Sam2DArrSize(0.0);
    var texScale = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
    var rotAngle = sin(round(_worldPos.x / 50.0) * 50.0 + round(_worldPos.z / 50.0) * 50.0) * 3.14;
    var sinVal = sin(rotAngle);
    var cosVal = cos(rotAngle);
    var poissonDisk0 = new CVec2(-0.94201624, -0.39906216);
    var poissonDisk1 = new CVec2(0.94558609, -0.76890725);
    var poissonDisk2 = new CVec2(-0.09418410, -0.92938870);
    var poissonDisk3 = new CVec2(0.34495938, 0.29387760);
    var poissonDisk4 = new CVec2(-0.91588581, 0.45771432);
    var poissonDisk5 = new CVec2(-0.81544232, -0.87912464);
    var poissonDisk6 = new CVec2(-0.38277543, 0.27676845);
    var poissonDisk7 = new CVec2(0.97484398, 0.75648379);
    var sampleCount = 8.0;
    var c = 0.0;
    for (; c < sampleCount; c += 1.0) {
        var poissonSample = new CVec2(0.0, 0.0);
        if (c < 0.5) {
            poissonSample = poissonDisk0;
        }
        else if (c < 1.5) {
            poissonSample = poissonDisk1;
        }
        else if (c < 2.5) {
            poissonSample = poissonDisk2;
        }
        else if (c < 3.5) {
            poissonSample = poissonDisk3;
        }
        else if (c < 4.5) {
            poissonSample = poissonDisk4;
        }
        else if (c < 5.5) {
            poissonSample = poissonDisk5;
        }
        else if (c < 6.5) {
            poissonSample = poissonDisk6;
        }
        else if (c < 7.5) {
            poissonSample = poissonDisk7;
        }
        else {
            continue;
        }
        var rotatedOffset = new CVec2(poissonSample.x * cosVal - poissonSample.y * sinVal, poissonSample.x * sinVal + poissonSample.y * cosVal);
        rotatedOffset.x *= texScale.x * 2.0;
        rotatedOffset.y *= texScale.y * 2.0;
        var uv0N = new CVec3(_uvZ0.x + rotatedOffset.x, _uvZ0.y + rotatedOffset.y, _read.y);
        var uv1N = new CVec3(_uvZ1.x + rotatedOffset.x, _uvZ1.y + rotatedOffset.y, _read.z);
        var uv2N = new CVec3(_uvZ2.x + rotatedOffset.x, _uvZ2.y + rotatedOffset.y, _read.w);
        if (_read.y > -0.5 && uv0N.x > 0.0 && uv0N.y > 0.0 && uv0N.x < 1.0 && uv0N.y < 1.0) {
            var shadowParam = Sam2DArrToColor(0.0, uv0N);
            var depth = shadowParam.z;
            sVal += (_uvZ0.z + _biasAll) >= depth ? 1.0 : 0.0;
            count += 1.0;
        }
        else if (_read.z > -0.5 && uv1N.x > 0.0 && uv1N.y > 0.0 && uv1N.x < 1.0 && uv1N.y < 1.0) {
            var shadowParam = Sam2DArrToColor(0.0, uv1N);
            var depth = shadowParam.z;
            sVal += (_uvZ1.z + _biasAll * f16Chk * 2.0) >= depth ? 1.0 : 0.0;
            count += 1.0;
        }
        else if (_read.w > -0.5 && uv2N.x > 0.0 && uv2N.y > 0.0 && uv2N.x < 1.0 && uv2N.y < 1.0) {
            var shadowParam = Sam2DArrToColor(0.0, uv2N);
            var depth = shadowParam.z;
            sVal += (_uvZ2.z + _biasAll * f16Chk * 4.0) >= depth ? 1.0 : 0.0;
            count += 1.0;
        }
    }
    return new CVec2(sVal, count);
}
function ProcessCascadeLevel(_isActive, _viewMatOff, _projMatOff, _offsetScale, _normalOffset, _worldPos, _index) {
    if (_isActive < -0.5) {
        return new CVec3(0.0, 0.0, 0.0);
    }
    var svm = Sam2DToMat(_viewMatOff, _index);
    var spm = Sam2DToMat(_projMatOff, _index);
    var world = new CVec4(V3AddV3(_worldPos.xyz, V3MulFloat(_normalOffset, _offsetScale)), _worldPos.w);
    var viewPos = V4MulMatCoordi(world, svm);
    var shadowPos = V4MulMatCoordi(viewPos, spm);
    return new CVec3(ShadowPosToUv(shadowPos).xy, viewPos.z);
}
export function calcShadow(_read, _index, _nor, _worldPos) {
    var normalScale = normalBias;
    var normalOffset = V3MulFloat(V3Nor(_nor), normalScale);
    var biasAll = bias;
    var uvZ0 = ProcessCascadeLevel(_read.y, shadowNearCasV0, shadowFarCasP0, 1.0, normalOffset, _worldPos, _index);
    var uvZ1 = ProcessCascadeLevel(_read.z, shadowTopCasV1, shadowBottomCasP1, 1.0, normalOffset, _worldPos, _index);
    var uvZ2 = ProcessCascadeLevel(_read.w, shadowLeftCasV2, shadowRightCasP2, 1.0, normalOffset, _worldPos, _index);
    var sVal_count = ApplyPCF(uvZ0, uvZ1, uvZ2, _read, biasAll);
    var sVal = sVal_count.x;
    var count = sVal_count.y;
    if (count >= 0.1) {
        sVal /= count;
    }
    else {
        sVal = 1.0;
    }
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
    var P = V2MulFloat(V2DivFloat(_ligDir.xy, _ligDir.z), _heightScale);
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
