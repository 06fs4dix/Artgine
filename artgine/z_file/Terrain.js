import { AlphaModalFun, ColorModalFun, UnpackRGToGray } from "./ColorFun";
import { ambientColor, envmapOn, GetSunInfo, ligCol, ligCount, ligDir, LightCac3D, ligMask, ligStep0, ligStep1, ligStep2, ligStep3, cullMask, sam2DCount, samCubeCount } from "./Light";
import { NoiseGet, NoiseNormalGet } from "./Noise";
import { SDF } from "./SDF";
import { Build, CMat, CVec2, CVec3, CVec4, Sam2DToColor, V4MulMatCoordi, Sam2DSize, Sam2DArrToMat, Sam2DArrToV4, Sam2DArrTileToColor, Sam2DArrTileToNormal, Null, CMat3, screenPos, FloatToInt, IntToFloat, SaturateFloat, MappingTexToV3, max, mix, step, smoothstep, floor, sqrt, clamp, V2MulV2, V2DivV2, V2SubV2, V2AddV2, V2MulFloat, V2Abs, V2Floor, V3AddV3, V3Dot, V3Nor, V3SubV3, V3Mix, V3MulFloat, V3MulV3, V4Mix, BranchBegin, BranchEnd, BranchDefault, discard, V2Len, Attribute, SaturateV3, abs, V3Len, min, V2Mix, V2Fract, V4AddV4, V4MulFloat, V3Sqrt, } from "./Shader";
import { bias, CalcShadow, jitter, normalBias, PCF, shadowBottomCasP1, shadowCount, shadowFarCasP0, shadowLeftCasV2, shadowNearCasV0, shadowOn, shadowPointProj, shadowRate, shadowReadList, shadowRightCasP2, shadowTopCasV1, shadowWrite, texture16f } from "./Shadow";
import { exposure, Tonemap, tonemappingType } from "./ToneMapping";
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
var out_position = Null();
var out_color = Null();
var colorModel = Null();
var alphaModel = Null();
var material = new CVec4(0.0, 0.0, 0.0, 1.0);
var screenSize;
var camPos = Null();
var camMain = Null();
var terrainOffset;
var terrainHeight;
var level;
var levelRepeat;
var levelScale;
var cellSize;
var cellCount;
var splatMatTexCodi;
var heightScale;
var splatSampler2D = 0.0;
var heightSampler2D = 1.0;
var to_uv = Null();
var to_worldPos = Null();
var to_viewPos = Null();
var to_normal = Null();
var time = Attribute(0, "time");
var waterDeep = new CVec4(0.0, 0.0, 0.0, 0.0);
var shallowColor = new CVec3(0.0, 0.0, 0.0);
var deepColor = new CVec3(0.0, 0.1, 0.5);
var causticFlowDir = new CVec2(0.0, 0.0);
var causticFlowFreq = 1.0;
var waterHeight = 1.0;
var waterUnderFadeDist = new CVec2(2000.0, 3000.0);
var normalflowDir = new CVec2(0.0, 0.0);
var normalRange = 1.0;
Build("Artgine/Shader/Terrain", [], vs_main, [
    worldMat, viewMat, projectMat, camMain,
    terrainOffset, terrainHeight,
    level, levelRepeat, levelScale,
    cellSize, cellCount, splatMatTexCodi, heightScale,
    splatSampler2D, heightSampler2D
], [out_position, to_uv, to_worldPos, to_normal], ps_main, [out_color]);
Build("Artgine/Shader/TerrainShadowWrite", ["shadowWrite"], vs_main_shadow_write, [
    worldMat, viewMat, projectMat, camMain,
    terrainOffset, terrainHeight,
    level, levelRepeat, levelScale,
    cellSize, cellCount, splatMatTexCodi, heightScale,
    splatSampler2D, heightSampler2D,
    shadowNearCasV0, shadowFarCasP0, shadowTopCasV1, shadowBottomCasP1, shadowLeftCasV2, shadowRightCasP2, shadowWrite, shadowCount, shadowPointProj, shadowReadList
], [out_position, to_viewPos, to_uv, to_worldPos], ps_main_shadow_write, [out_color]);
Build("Artgine/Shader/TerrainShadowRead", ["shadowRead"], vs_main_shadow_read, [
    worldMat, viewMat, projectMat, camMain,
    terrainOffset, terrainHeight,
    level, levelRepeat, levelScale,
    cellSize, cellCount, splatMatTexCodi, heightScale,
    splatSampler2D, heightSampler2D,
    shadowNearCasV0, shadowFarCasP0, shadowTopCasV1, shadowBottomCasP1, shadowLeftCasV2, shadowRightCasP2, shadowWrite, shadowCount, shadowPointProj, shadowReadList,
    shadowRate, PCF, texture16f, bias, normalBias, jitter,
    ligDir, ligCol, ligMask, ligCount
], [out_position, to_uv, to_worldPos, to_normal], ps_main_shadow_read, [out_color]);
function WorldToUV(_worldPos, _off, _size) {
    return V2DivV2(V2SubV2(_worldPos.xz, new CVec2(_off.x, _off.z)), new CVec2(_size.x, _size.z));
}
function GetMorphLerpK(_world, _camPos, _cellSize, _pCellSize) {
    var distRatio = new CVec2(0.33, 1.00);
    var prevLODSize = _cellSize * cellCount;
    var curLODRadius = _pCellSize * cellCount;
    var dist = V2Abs(V2SubV2(new CVec2(_camPos.x, _camPos.z), _world.xz));
    var alpha = new CVec2((dist.x - prevLODSize) / (curLODRadius - prevLODSize), (dist.y - prevLODSize) / (curLODRadius - prevLODSize));
    var rawAlpha = max(alpha.x, alpha.y);
    return smoothstep(distRatio.x, distRatio.y, rawAlpha);
}
function Sam2DLODBiCubicToColor(_texOff, _uv, _texSize) {
    var texelPos = V2SubV2(V2MulV2(_uv, _texSize), new CVec2(0.5, 0.5));
    var f = V2Fract(texelPos);
    var idx = V2Floor(texelPos);
    var f2 = V2MulV2(f, f);
    var f3 = V2MulV2(f2, f);
    var k0 = V2AddV2(V2AddV2(V2AddV2(V2MulFloat(f3, -1.0 / 6.0), V2MulFloat(f2, 0.5)), V2MulFloat(f, -0.5)), new CVec2(1.0 / 6.0, 1.0 / 6.0));
    var k1 = V2AddV2(V2AddV2(V2MulFloat(f3, 0.5), V2MulFloat(f2, -1.0)), new CVec2(2.0 / 3.0, 2.0 / 3.0));
    var k2 = V2AddV2(V2AddV2(V2AddV2(V2MulFloat(f3, -0.5), V2MulFloat(f2, 0.5)), V2MulFloat(f, 0.5)), new CVec2(1.0 / 6.0, 1.0 / 6.0));
    var k3 = V2MulFloat(f3, 1.0 / 6.0);
    var g0 = V2AddV2(k0, k1);
    var g1 = V2AddV2(k2, k3);
    var h0 = V2AddV2(V2DivV2(k1, g0), new CVec2(-0.5, -0.5));
    var h1 = V2AddV2(V2DivV2(k3, g1), new CVec2(1.5, 1.5));
    var uv00 = V2DivV2(V2AddV2(idx, h0), _texSize);
    var uv10 = V2DivV2(V2AddV2(idx, new CVec2(h1.x, h0.y)), _texSize);
    var uv01 = V2DivV2(V2AddV2(idx, new CVec2(h0.x, h1.y)), _texSize);
    var uv11 = V2DivV2(V2AddV2(idx, h1), _texSize);
    var tex00 = Sam2DToColor(_texOff, uv00);
    var tex10 = Sam2DToColor(_texOff, uv10);
    var tex01 = Sam2DToColor(_texOff, uv01);
    var tex11 = Sam2DToColor(_texOff, uv11);
    var tex0 = V4Mix(tex01, tex00, g0.y);
    var tex1 = V4Mix(tex11, tex10, g0.y);
    return V4Mix(tex1, tex0, g0.x);
}
function GetHeightMapUV(_worldUV) {
    var samSize = Sam2DSize(heightSampler2D);
    var heightMapHalfTexel = new CVec2(1.0 / samSize.x, 1.0 / samSize.y);
    var worldToTexScale = V2MulV2(new CVec2(samSize.x - 1.0, samSize.y - 1.0), heightMapHalfTexel);
    return V2AddV2(V2MulV2(_worldUV, worldToTexScale), V2MulFloat(heightMapHalfTexel, 0.5));
}
function UnpackNormal(_rg) {
    var normal = new CVec3(_rg.x * 2.0 - 1.0, 0.0, _rg.y * 2.0 - 1.0);
    normal.y = sqrt(max(0.0, 1.0 - V3Dot(normal, normal)));
    return V3Nor(normal);
}
function SampleSplatmap(_splatBlend, _uv, _off) {
    var L_cor;
    var blendAlpha = 1.0;
    if (blendAlpha > 0.0 && _splatBlend.w > 0.0) {
        L_cor = V4AddV4(L_cor, V4MulFloat(Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[3].xy)), splatMatTexCodi[3].zw), _off + 3.0), step(0.0, splatMatTexCodi[3].x) * 0.5, step(0.0, splatMatTexCodi[3].y) * 0.5), blendAlpha * _splatBlend.w));
        blendAlpha -= blendAlpha * _splatBlend.w;
    }
    if (blendAlpha > 0.0 && _splatBlend.z > 0.0) {
        L_cor = V4AddV4(L_cor, V4MulFloat(Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[2].xy)), splatMatTexCodi[2].zw), _off + 2.0), step(0.0, splatMatTexCodi[2].x) * 0.5, step(0.0, splatMatTexCodi[2].y) * 0.5), blendAlpha * _splatBlend.z));
        blendAlpha -= blendAlpha * _splatBlend.z;
    }
    if (blendAlpha > 0.0 && _splatBlend.y > 0.0) {
        L_cor = V4AddV4(L_cor, V4MulFloat(Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[1].xy)), splatMatTexCodi[1].zw), _off + 1.0), step(0.0, splatMatTexCodi[1].x) * 0.5, step(0.0, splatMatTexCodi[1].y) * 0.5), blendAlpha * _splatBlend.y));
        blendAlpha -= blendAlpha * _splatBlend.y;
    }
    if (blendAlpha > 0.0 && _splatBlend.x > 0.0) {
        L_cor = V4AddV4(L_cor, V4MulFloat(Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[0].xy)), splatMatTexCodi[0].zw), _off + 0.0), step(0.0, splatMatTexCodi[0].x) * 0.5, step(0.0, splatMatTexCodi[0].y) * 0.5), blendAlpha * _splatBlend.x));
        blendAlpha -= blendAlpha * _splatBlend.x;
    }
    return L_cor;
}
function SampleSplatmapNormal(_splatBlend, _uv, _off) {
    var L_cor = new CVec4(0.0, 0.0, 0.0, 0.0);
    var blendAlpha = 1.0;
    if (blendAlpha > 0.0 && _splatBlend.w > 0.0) {
        L_cor = V4AddV4(L_cor, V4Mix(new CVec4(0.0, 0.0, 0.0, 0.0), Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[3].xy)), splatMatTexCodi[3].zw), _off + 3.0), step(0.0, splatMatTexCodi[3].x) * 0.5, step(0.0, splatMatTexCodi[3].y) * 0.5), blendAlpha * _splatBlend.w));
        blendAlpha -= blendAlpha * _splatBlend.w;
    }
    if (blendAlpha > 0.0 && _splatBlend.z > 0.0) {
        L_cor = V4AddV4(L_cor, V4Mix(new CVec4(0.0, 0.0, 0.0, 0.0), Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[2].xy)), splatMatTexCodi[2].zw), _off + 2.0), step(0.0, splatMatTexCodi[2].x) * 0.5, step(0.0, splatMatTexCodi[2].y) * 0.5), blendAlpha * _splatBlend.z));
        blendAlpha -= blendAlpha * _splatBlend.z;
    }
    if (blendAlpha > 0.0 && _splatBlend.y > 0.0) {
        L_cor = V4AddV4(L_cor, V4Mix(new CVec4(0.0, 0.0, 0.0, 0.0), Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[1].xy)), splatMatTexCodi[1].zw), _off + 1.0), step(0.0, splatMatTexCodi[1].x) * 0.5, step(0.0, splatMatTexCodi[1].y) * 0.5), blendAlpha * _splatBlend.y));
        blendAlpha -= blendAlpha * _splatBlend.y;
    }
    if (blendAlpha > 0.0 && _splatBlend.x > 0.0) {
        L_cor = V4AddV4(L_cor, V4Mix(new CVec4(0.0, 0.0, 0.0, 0.0), Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[0].xy)), splatMatTexCodi[0].zw), _off + 0.0), step(0.0, splatMatTexCodi[0].x) * 0.5, step(0.0, splatMatTexCodi[0].y) * 0.5), blendAlpha * _splatBlend.x));
        blendAlpha -= blendAlpha * _splatBlend.x;
    }
    return L_cor;
}
function CombineNormals(_base, _detail) {
    _base = V3AddV3(_base, new CVec3(0.0, 1.0, 0.0));
    _detail = V3MulV3(_detail, new CVec3(-1.0, 1.0, -1.0));
    return V3Nor(V3SubV3(V3MulFloat(_base, V3Dot(_base, _detail) / _base.y), _detail));
}
function Remap(_val, _min1, _max1, _min2, _max2) {
    return _min2 + (_val - _min1) / (_max1 - _min1) * (_max2 - _min2);
}
function SampleNormalMapToCaustic(_uvw, _ligCol) {
    var normal = NoiseNormalGet(_uvw, SDF.eNoise.PerlinNormal);
    normal = V3Nor(new CVec3(normal.x / 10.0, normal.y, normal.z / 10.0));
    var L = new CVec3(0.0, 1.0, 0.0);
    var NdotL = max(0.0, V3Dot(normal, L));
    var curRange = 0.0001 * causticFlowFreq;
    var threshold = 1.0 - curRange;
    var b = clamp(Remap(NdotL, threshold, 1.0, 0.0, 0.2), 0.0, 1.0);
    return V3MulFloat(_ligCol, b);
}
function SampleCaustics(_uvw, _split, _ligDir, _ligCol) {
    var angleWeight = clamp(1.0 / (_ligDir.y + 0.1), 1.0, 5.0);
    var dynamicSplit = _split * angleWeight;
    var xzLen = V2Len(new CVec2(_ligDir.x, _ligDir.z));
    var offsetDir = (xzLen < 0.0001) ? new CVec2(1.0, 1.0) : new CVec2(_ligDir.x / xzLen, _ligDir.z / xzLen);
    var uvw1 = new CVec3(V2AddV2(_uvw.xy, V2MulFloat(offsetDir, dynamicSplit)), _uvw.z);
    var uvw2 = new CVec3(_uvw.xy, _uvw.z);
    var uvw3 = new CVec3(V2AddV2(_uvw.xy, V2MulFloat(offsetDir, -dynamicSplit)), _uvw.z);
    var r = SampleNormalMapToCaustic(uvw1, _ligCol).x;
    var g = SampleNormalMapToCaustic(uvw2, _ligCol).y;
    var b = SampleNormalMapToCaustic(uvw3, _ligCol).z;
    return new CVec3(r, g, b);
}
function Caustics(_world, _flowDir, _ligDir, _ligCol) {
    if (V2Len(_flowDir) == 0.0)
        return new CVec3(0.0, 0.0, 0.0);
    var flow = new CVec3(-causticFlowDir.x / max(V2Len(causticFlowDir), 1e-6), causticFlowDir.y / max(V2Len(causticFlowDir), 1e-6), V2Len(causticFlowDir) * time * 0.1);
    var split = 1.0 / 1000.0;
    var worldToUV = V3MulFloat(_world, split);
    var L = new CVec3(0, 1, 0);
    var refractOffset = new CVec2(L.x, L.z);
    refractOffset = V2MulFloat(refractOffset, -0.2);
    var uvw = new CVec3(V2AddV2(new CVec2(worldToUV.x + refractOffset.x, worldToUV.z + refractOffset.y), V2MulFloat(flow.xy, flow.z)), flow.z * 3.0);
    var tex = SampleCaustics(uvw, 1.0 / 128.0, L, _ligCol);
    return SaturateV3(tex);
}
function WaterProcessing(_color, _caustics, _world) {
    var heightDiff = abs(waterDeep.x - _world.y);
    var depthBlend = 1.0 - SaturateFloat(heightDiff / waterDeep.y);
    var dist = V3Len(V3SubV3(camPos, _world.xyz));
    var t = smoothstep(waterUnderFadeDist.x, waterUnderFadeDist.y, dist);
    var luma = (_color.x * 0.299 + _color.y * 0.587 + _color.z * 0.114);
    var foamThreshold = min(waterDeep.z, waterDeep.z * waterHeight);
    var foamMask = 1.0 - smoothstep(0.0, foamThreshold, heightDiff);
    _color = V3Mix(deepColor, V3Mix(_color, shallowColor, 0.1), depthBlend);
    _caustics = V3MulFloat(_caustics, depthBlend * luma * (1.0 - foamMask));
    _color = V3AddV3(_color, _caustics);
    _color = V3Mix(deepColor, _color, 0.6 * (1.0 - t));
    if (foamMask > 0.0) {
        var foam = new CVec3(0.55, 0.58, 0.58);
        var foamFlowMag = V2Len(causticFlowDir);
        var noise = NoiseGet(new CVec3(_world.x / 300.0 - causticFlowDir.x * time * 0.5, _world.z / 300.0 + causticFlowDir.y * time * 0.5, foamFlowMag * time * 0.3), SDF.eNoise.Perlin);
        var edgeFade = foamMask * smoothstep(0.25, 1.0, noise);
        _color = V3AddV3(_color, V3MulFloat(foam, 0.35 * edgeFade));
        _color = V3Mix(_color, foam, 0.4 * edgeFade);
    }
    return _color;
}
function vs_main(f3_ver) {
    var heightmapSize = Sam2DSize(heightSampler2D);
    var terrainSize = new CVec3(heightmapSize.x * cellSize, terrainHeight, heightmapSize.y * cellSize);
    var worldCellSize = cellSize * levelScale * heightScale;
    var pWorldCellSize = worldCellSize * (levelRepeat + 1.0);
    var curPos = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.x = floor(curPos.x / worldCellSize) * worldCellSize;
    curPos.z = floor(curPos.z / worldCellSize) * worldCellSize;
    var nextPos = curPos;
    nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
    nextPos.z = floor(nextPos.z / pWorldCellSize) * pWorldCellSize;
    var curUV = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    var nextUV = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));
    var curSample = Sam2DLODBiCubicToColor(heightSampler2D, curUV, heightmapSize);
    var nextSample = Sam2DLODBiCubicToColor(heightSampler2D, nextUV, heightmapSize);
    curPos.y = UnpackRGToGray(curSample.xy) * terrainSize.y + terrainOffset.y;
    nextPos.y = UnpackRGToGray(nextSample.xy) * terrainSize.y + terrainOffset.y;
    var curNor = UnpackNormal(new CVec2(curSample.z, curSample.w));
    var nextNor = UnpackNormal(new CVec2(nextSample.z, nextSample.w));
    var morphAlpha = GetMorphLerpK(curPos, camMain, worldCellSize, pWorldCellSize);
    to_worldPos = V4Mix(curPos, nextPos, morphAlpha);
    to_worldPos.y = f3_ver.y * terrainSize.y;
    to_worldPos.y += mix(curPos.y, nextPos.y, morphAlpha);
    to_normal = V3Mix(curNor, nextNor, morphAlpha);
    to_normal.y = sqrt(1.0 - SaturateFloat(to_normal.x * to_normal.x + to_normal.z * to_normal.z));
    to_uv = V2Mix(curUV, nextUV, morphAlpha);
    var terrainMin = terrainOffset;
    var terrainMax = V3AddV3(terrainOffset, terrainSize);
    if (to_worldPos.x < terrainMin.x || terrainMax.x < to_worldPos.x ||
        to_worldPos.z < terrainMin.z || terrainMax.z < to_worldPos.z) {
        to_worldPos.y = terrainMin.y;
    }
    to_worldPos.x = clamp(to_worldPos.x, terrainMin.x, terrainMax.x);
    to_worldPos.z = clamp(to_worldPos.z, terrainMin.z, terrainMax.z);
    out_position = V4MulMatCoordi(V4MulMatCoordi(to_worldPos, viewMat), projectMat);
}
function ps_main() {
    var shadow = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow", "S", [shadowOn, screenSize]);
    if (shadowOn > 0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, V2DivV2(screenPos.xy, screenSize.xy));
    }
    BranchEnd();
    var splat = Sam2DToColor(splatSampler2D, to_uv);
    var splatBlend = new CVec4(1.0, splat.xyz);
    var L_cor = SampleSplatmap(splatBlend, to_uv, 0.0);
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    var dseMat = new CMat3(0);
    var lmaterial = new CVec4(1.0, 1.0, 1.0, 1.0);
    var normal = new CVec3(0.0, 1.0, 0.0);
    var sunDir = new CVec3(0.0, 1.0, 0.0);
    var sunCol = new CVec3(1.0, 1.0, 1.0);
    var gamma = 1.0;
    BranchBegin("light", "L", [ligDir, ligCol, ligMask, ligCount, camPos, material, cullMask, ligStep0, ligStep1, ligStep2, ligStep3, ambientColor, envmapOn, sam2DCount, samCubeCount]);
    gamma = 2.2;
    L_cor.rgb = V3MulV3(L_cor.rgb, L_cor.rgb);
    normal = MappingTexToV3(V3Nor(SampleSplatmapNormal(splatBlend, to_uv, 8.0).xyz));
    normal = CombineNormals(V3Nor(to_normal), new CVec3(normal.x, normal.z, normal.y));
    lmaterial = SampleSplatmap(splatBlend, to_uv, 4.0);
    dseMat = GetSunInfo();
    sunDir = dseMat[0];
    sunCol = dseMat[1];
    dseMat = LightCac3D(camPos, to_worldPos, L_cor, normal, shadow, lmaterial.y, lmaterial.x, lmaterial.z, cullMask.x);
    L_cor.rgb = V3AddV3(dseMat[0], dseMat[1]);
    BranchEnd();
    out_color = L_cor;
    BranchBegin("tonemapping", "tonemapping", [exposure, tonemappingType]);
    out_color.rgb = Tonemap(out_color.rgb, exposure, tonemappingType);
    BranchEnd();
    if (gamma > 1.1) {
        out_color.rgb = V3Sqrt(out_color.rgb);
    }
    BranchBegin("waterReflect", "waterReflect", [waterDeep]);
    if (to_worldPos.y <= waterDeep.x)
        discard;
    BranchEnd();
    var caustics;
    BranchBegin("waterRefract", "waterRefract", [waterDeep, waterUnderFadeDist, shallowColor, deepColor, causticFlowDir, causticFlowFreq, waterHeight, camPos, time, normalflowDir, normalRange]);
    if (to_worldPos.y > waterDeep.x + waterDeep.z)
        discard;
    caustics = Caustics(to_worldPos.xyz, causticFlowDir, sunDir, sunCol);
    out_color.rgb = WaterProcessing(out_color.rgb, caustics, to_worldPos);
    BranchEnd();
}
function vs_main_shadow_write(f3_ver) {
    var heightmapSize = Sam2DSize(heightSampler2D);
    var terrainSize = new CVec3(heightmapSize.x * cellSize, terrainHeight, heightmapSize.y * cellSize);
    var worldCellSize = cellSize * levelScale * heightScale;
    var pWorldCellSize = worldCellSize * (levelRepeat + 1.0);
    var curPos = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.x = floor(curPos.x / worldCellSize) * worldCellSize;
    curPos.z = floor(curPos.z / worldCellSize) * worldCellSize;
    var nextPos = curPos;
    nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
    nextPos.z = floor(nextPos.z / pWorldCellSize) * pWorldCellSize;
    var curUV = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    var nextUV = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));
    var curSample = Sam2DLODBiCubicToColor(heightSampler2D, curUV, heightmapSize);
    var nextSample = Sam2DLODBiCubicToColor(heightSampler2D, nextUV, heightmapSize);
    curPos.y = UnpackRGToGray(curSample.xy) * terrainSize.y + terrainOffset.y;
    nextPos.y = UnpackRGToGray(nextSample.xy) * terrainSize.y + terrainOffset.y;
    var morphAlpha = GetMorphLerpK(curPos, camMain, worldCellSize, pWorldCellSize);
    var worldPos = V4Mix(curPos, nextPos, morphAlpha);
    worldPos.y = f3_ver.y * terrainSize.y;
    worldPos.y += mix(curPos.y, nextPos.y, morphAlpha);
    to_uv = V2Mix(curUV, nextUV, morphAlpha);
    var terrainMin = terrainOffset;
    var terrainMax = V3AddV3(terrainOffset, terrainSize);
    if (worldPos.x < terrainMin.x || terrainMax.x < worldPos.x ||
        worldPos.z < terrainMin.z || terrainMax.z < worldPos.z) {
        worldPos.y = terrainMin.y;
    }
    worldPos.x = clamp(worldPos.x, terrainMin.x, terrainMax.x);
    worldPos.z = clamp(worldPos.z, terrainMin.z, terrainMax.z);
    var svm = new CMat(0);
    var spm = new CMat(0);
    BranchBegin("PointLightShadowV", "PLSV", []);
    if (shadowWrite.x < SDF.eShadow.Near + 0.5)
        svm = Sam2DArrToMat(shadowNearCasV0, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Far + 0.5)
        svm = Sam2DArrToMat(shadowFarCasP0, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Top + 0.5)
        svm = Sam2DArrToMat(shadowTopCasV1, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Bottom + 0.5)
        svm = Sam2DArrToMat(shadowBottomCasP1, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Left + 0.5)
        svm = Sam2DArrToMat(shadowLeftCasV2, shadowWrite.y);
    else if (shadowWrite.x < SDF.eShadow.Right + 0.5)
        svm = Sam2DArrToMat(shadowRightCasP2, shadowWrite.y);
    to_viewPos = worldPos;
    out_position = V4MulMatCoordi(worldPos, svm);
    BranchDefault();
    if (shadowWrite.x < SDF.eShadow.Cas0 + 0.5) {
        svm = Sam2DArrToMat(shadowNearCasV0, shadowWrite.y);
        spm = Sam2DArrToMat(shadowFarCasP0, shadowWrite.y);
    }
    else if (shadowWrite.x < SDF.eShadow.Cas1 + 0.5) {
        svm = Sam2DArrToMat(shadowTopCasV1, shadowWrite.y);
        spm = Sam2DArrToMat(shadowBottomCasP1, shadowWrite.y);
    }
    else if (shadowWrite.x < SDF.eShadow.Cas2 + 0.5) {
        svm = Sam2DArrToMat(shadowLeftCasV2, shadowWrite.y);
        spm = Sam2DArrToMat(shadowRightCasP2, shadowWrite.y);
    }
    to_viewPos = V4MulMatCoordi(worldPos, svm);
    out_position = V4MulMatCoordi(to_viewPos, spm);
    BranchEnd();
    out_position.z = max(out_position.z, 0.0);
}
function ps_main_shadow_write() {
    var shadowRead;
    var lDir;
    BranchBegin("PointLightShadowF", "PLSF", [ligDir]);
    shadowRead = Sam2DArrToV4(shadowReadList, shadowWrite.y);
    lDir = Sam2DArrToV4(ligDir, shadowRead.x);
    out_color.b = (V3Len(V3SubV3(to_viewPos.xyz, lDir.xyz)) - shadowRead.z) / (shadowRead.w - shadowRead.z);
    out_color.a = 1.0;
    BranchDefault();
    out_color = to_viewPos;
    BranchEnd();
}
function vs_main_shadow_read(f3_ver) {
    var heightmapSize = Sam2DSize(heightSampler2D);
    var terrainSize = new CVec3(heightmapSize.x * cellSize, terrainHeight, heightmapSize.y * cellSize);
    var worldCellSize = cellSize * levelScale * heightScale;
    var pWorldCellSize = worldCellSize * (levelRepeat + 1.0);
    var curPos = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.x = floor(curPos.x / worldCellSize) * worldCellSize;
    curPos.z = floor(curPos.z / worldCellSize) * worldCellSize;
    var nextPos = curPos;
    nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
    nextPos.z = floor(nextPos.z / pWorldCellSize) * pWorldCellSize;
    var curUV = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    var nextUV = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));
    var curSample = Sam2DLODBiCubicToColor(heightSampler2D, curUV, heightmapSize);
    var nextSample = Sam2DLODBiCubicToColor(heightSampler2D, nextUV, heightmapSize);
    curPos.y = UnpackRGToGray(curSample.xy) * terrainSize.y + terrainOffset.y;
    nextPos.y = UnpackRGToGray(nextSample.xy) * terrainSize.y + terrainOffset.y;
    var curNor = UnpackNormal(new CVec2(curSample.z, curSample.w));
    var nextNor = UnpackNormal(new CVec2(nextSample.z, nextSample.w));
    var morphAlpha = GetMorphLerpK(curPos, camMain, worldCellSize, pWorldCellSize);
    to_worldPos = V4Mix(curPos, nextPos, morphAlpha);
    to_worldPos.y = f3_ver.y * terrainSize.y;
    to_worldPos.y += mix(curPos.y, nextPos.y, morphAlpha);
    to_normal = V3Mix(curNor, nextNor, morphAlpha);
    to_normal.y = sqrt(1.0 - SaturateFloat(to_normal.x * to_normal.x + to_normal.z * to_normal.z));
    to_uv = V2Mix(curUV, nextUV, morphAlpha);
    var terrainMin = terrainOffset;
    var terrainMax = V3AddV3(terrainOffset, terrainSize);
    if (to_worldPos.x < terrainMin.x || terrainMax.x < to_worldPos.x ||
        to_worldPos.z < terrainMin.z || terrainMax.z < to_worldPos.z) {
        to_worldPos.y = terrainMin.y;
    }
    to_worldPos.x = clamp(to_worldPos.x, terrainMin.x, terrainMax.x);
    to_worldPos.z = clamp(to_worldPos.z, terrainMin.z, terrainMax.z);
    out_position = V4MulMatCoordi(V4MulMatCoordi(to_worldPos, viewMat), projectMat);
}
function ps_main_shadow_read() {
    var outputIndex;
    var all = new CVec4(1.0, 1.0, 1.0, 1.0);
    BranchBegin("shadowMulti", "SDM", []);
    outputIndex = 0.0;
    all = new CVec4(0.0, 0.0, 0.0, 0.0);
    for (var i = 0; i < SDF.TexSizeMax; ++i) {
        if (i >= FloatToInt(shadowCount))
            break;
        all[FloatToInt(outputIndex)] += CalcShadow(IntToFloat(i), to_normal, to_worldPos);
        outputIndex = min(outputIndex + 1.0, 3.0);
    }
    all.a /= max(shadowCount - 3.0, 1.0);
    BranchDefault();
    all.a = CalcShadow(0.0, to_normal, to_worldPos);
    all.rgb = new CVec3(all.a, all.a, all.a);
    BranchEnd();
    out_color = all;
}
