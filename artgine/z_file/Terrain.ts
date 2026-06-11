import { AlphaModalFun, ColorModalFun, UnpackRGToGray } from "./ColorFun";
import { ambientColor, envmapOn, GetSunInfo, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3, sam2DCount, samCubeCount } from "./Light";
import { NoiseGet, NoiseNormalGet } from "./Noise";
import { SDF } from "./SDF";
import { 
	Build, CMat, CVec2, CVec3, CVec4,  OutColor, OutPosition,  
    Sam2DToColor, V4MulMatCoordi, Sam2DSize, Sam2DArrToMat, Sam2DArrToV4, Sam2DArrTileToColor, Sam2DArrTileToNormal, 
    ToV2, Vertex3, Null, CMat3, ToV4, screenPos, FloatToInt, IntToFloat, ToV3, SaturateFloat, MappingTexToV3,
	max, mix, step, smoothstep, floor, sqrt, clamp,
	V2MulV2, V2DivV2, V2SubV2, V2AddV2, V2MulFloat, V2Abs, V2Floor,
    V3AddV3, V3Dot, V3Nor, V3SubV3, V3Mix, V3MulFloat, V3MulV3, 
    V4Mix, 
    BranchBegin, BranchEnd, BranchDefault,
    discard,
    V2Len,
    Attribute,
    SaturateV3,
    abs,
    V3Len,
    min,
    V2Mix,
    V2Fract,
    V4AddV4,
    V4MulFloat,
} from "./Shader";
import { bias, calcShadow, jitter, normalBias, PCF, shadowBottomCasP1, shadowCount, shadowFarCasP0, shadowLeftCasV2, shadowNearCasV0, shadowOn, shadowPointProj, shadowRate, shadowReadList, shadowRightCasP2, shadowTopCasV1, shadowWrite, texture16f } from "./Shadow";


var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();

var out_position : OutPosition=Null();
var out_color : OutColor=Null();

var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();
var material: CVec4 = new CVec4(0.0,0.0,0.0,1.0);
var screenSize : CVec2;

var camPos: CVec3=Null();
var camMain : CVec3=Null();

var terrainOffset : CVec3;
var terrainHeight : number;

var level : number;
var levelRepeat : number;
var levelScale : number;

var cellSize : number;
var cellCount : number;

var splatMatTexCodi : CMat;
var heightScale : number;

// 필요없는 유니폼인데 샘플러 쉽게 바꾸려고 추가
var splatSampler2D : number = 0.0;
var heightSampler2D : number = 1.0;

var to_uv : ToV2=Null();
var to_worldPos : ToV4=Null();
var to_viewPos : ToV4=Null();
var to_normal : ToV3=Null();

var time : number = Attribute(0,"time");

var waterDeep : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
var shallowColor : CVec3 = new CVec3(0.0,0.0,0.0);
var deepColor    : CVec3 = new CVec3(0.0,0.1,0.5);
var causticFlowDir : CVec2 = new CVec2(0.0, 0.0);
var causticFlowFreq : number = 1.0;
var waterHeight : number = 1.0;
var waterUnderFadeDist : CVec2 = new CVec2(2000.0, 3000.0);
var normalflowDir : CVec2 = new CVec2(0.0, 0.0);
var normalRange : number = 1.0;

Build("Artgine/Shader/Terrain",[],
	vs_main,[
        worldMat,viewMat,projectMat,camMain,
        terrainOffset,terrainHeight,
        level,levelRepeat,levelScale,
        cellSize,cellCount,splatMatTexCodi,heightScale,
        splatSampler2D,heightSampler2D
    ],
	[out_position,to_uv,to_worldPos,to_normal],
    ps_main,[out_color]
);

Build("Artgine/Shader/TerrainShadowWrite", ["shadowWrite"], 
    vs_main_shadow_write, [
        worldMat,viewMat,projectMat,camMain,
        terrainOffset,terrainHeight,
        level,levelRepeat,levelScale,
        cellSize,cellCount,splatMatTexCodi,heightScale,
        splatSampler2D,heightSampler2D,
        shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,shadowCount,shadowPointProj,shadowReadList
    ], [out_position,to_viewPos,to_uv],
    ps_main_shadow_write,[out_color]
);

Build("Artgine/Shader/TerrainShadowRead", ["shadowRead"], 
    vs_main_shadow_read, [
        worldMat,viewMat,projectMat,camMain,
        terrainOffset,terrainHeight,
        level,levelRepeat,levelScale,
        cellSize,cellCount,splatMatTexCodi,heightScale,
        splatSampler2D,heightSampler2D,
        shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,shadowCount,shadowPointProj,shadowReadList,
        shadowRate,PCF,texture16f,bias,normalBias,jitter
    ], [out_position,to_uv,to_worldPos,to_normal],
    ps_main_shadow_read,[out_color]
);

//-----------------------------------------------------------------------------------------------------
// vs -------------
//-----------------------------------------------------------------------------------------------------
function WorldToUV(_worldPos : CVec4, _off : CVec3, _size : CVec3) : CVec2
{
    return V2DivV2(V2SubV2(_worldPos.xz, new CVec2(_off.x, _off.z)), new CVec2(_size.x, _size.z));
}

function GetMorphLerpK(_world : CVec4, _camPos : CVec3, _cellSize : number, _pCellSize : number) : number
{
    // 비율 설정
    var distRatio : CVec2 = new CVec2(0.33, 1.00);

    var prevLODSize : number = _cellSize * cellCount;
    var curLODRadius : number = _pCellSize * cellCount;

    var dist : CVec2 = V2Abs(V2SubV2(new CVec2(_camPos.x, _camPos.z), _world.xz));
    var alpha : CVec2 = new CVec2((dist.x - prevLODSize) / (curLODRadius - prevLODSize), (dist.y - prevLODSize) / (curLODRadius - prevLODSize));
    var rawAlpha : number = max(alpha.x, alpha.y);

    return smoothstep(distRatio.x, distRatio.y, rawAlpha);
}

function Sam2DLODBiCubicToColor(_texOff : number, _uv : CVec2, _texSize : CVec2) : CVec4
{
    var texelPos : CVec2 = V2SubV2(V2MulV2(_uv, _texSize), new CVec2(0.5, 0.5));
    var f : CVec2 = V2Fract(texelPos);
    var idx : CVec2 = V2Floor(texelPos);

    var f2 : CVec2 = V2MulV2(f, f);
    var f3 : CVec2 = V2MulV2(f2, f);

    var k0 : CVec2 = V2AddV2(V2AddV2(V2AddV2(V2MulFloat(f3, -1.0 / 6.0), V2MulFloat(f2, 0.5)), V2MulFloat(f, -0.5)), new CVec2(1.0 / 6.0, 1.0 / 6.0));
    var k1 : CVec2 = V2AddV2(V2AddV2(V2MulFloat(f3, 0.5), V2MulFloat(f2, -1.0)), new CVec2(2.0 / 3.0, 2.0 / 3.0));
    var k2 : CVec2 = V2AddV2(V2AddV2(V2AddV2(V2MulFloat(f3, -0.5), V2MulFloat(f2, 0.5)), V2MulFloat(f, 0.5)), new CVec2(1.0 / 6.0, 1.0 / 6.0));
    var k3 : CVec2 = V2MulFloat(f3, 1.0 / 6.0);

    var g0 : CVec2 = V2AddV2(k0, k1);
    var g1 : CVec2 = V2AddV2(k2, k3);

    var h0 : CVec2 = V2AddV2(V2DivV2(k1, g0), new CVec2(-0.5, -0.5));
    var h1 : CVec2 = V2AddV2(V2DivV2(k3, g1), new CVec2(1.5, 1.5));

    var uv00 : CVec2 = V2DivV2(V2AddV2(idx, h0), _texSize);
    var uv10 : CVec2 = V2DivV2(V2AddV2(idx, new CVec2(h1.x, h0.y)), _texSize);
    var uv01 : CVec2 = V2DivV2(V2AddV2(idx, new CVec2(h0.x, h1.y)), _texSize);
    var uv11 : CVec2 = V2DivV2(V2AddV2(idx, h1), _texSize);

    var tex00 : CVec4 = Sam2DToColor(_texOff, uv00);
    var tex10 : CVec4 = Sam2DToColor(_texOff, uv10);
    var tex01 : CVec4 = Sam2DToColor(_texOff, uv01);
    var tex11 : CVec4 = Sam2DToColor(_texOff, uv11);

    var tex0 : CVec4 = V4Mix(tex01, tex00, g0.y);
    var tex1 : CVec4 = V4Mix(tex11, tex10, g0.y);

    return V4Mix(tex1, tex0, g0.x);
}

function GetHeightMapUV(_worldUV : CVec2) : CVec2
{
    var samSize : CVec2 = Sam2DSize(heightSampler2D);
    var heightMapHalfTexel : CVec2 = new CVec2(1.0 / samSize.x, 1.0 / samSize.y);
    var worldToTexScale : CVec2 = V2MulV2(new CVec2(samSize.x - 1.0, samSize.y - 1.0), heightMapHalfTexel);

    return V2AddV2(V2MulV2(_worldUV, worldToTexScale), V2MulFloat(heightMapHalfTexel, 0.5));
}
//-----------------------------------------------------------------------------------------------------
// ------------- vs
//-----------------------------------------------------------------------------------------------------

//-----------------------------------------------------------------------------------------------------
// ps -------------
//-----------------------------------------------------------------------------------------------------
function UnpackNormal(_rg : CVec2) : CVec3
{
    var normal : CVec3 = new CVec3(_rg.x * 2.0 - 1.0, 0.0, _rg.y * 2.0 - 1.0);
    normal.y = sqrt(max(0.0, 1.0 - V3Dot(normal, normal)));
    return V3Nor(normal);
}

function SampleSplatmap(_splatBlend : CVec4, _uv : CVec2, _off : number) : CVec4
{
    var L_cor : CVec4;
    var blendAlpha : number = 1.0;
    if(blendAlpha > 0.0 && _splatBlend.w > 0.0) {
        L_cor = V4AddV4(L_cor, V4MulFloat(Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[3].xy)), splatMatTexCodi[3].zw), _off + 3.0), step(0.0,splatMatTexCodi[3].x)*0.5, step(0.0,splatMatTexCodi[3].y)*0.5), blendAlpha * _splatBlend.w));
        blendAlpha -= blendAlpha * _splatBlend.w;
    }
    if(blendAlpha > 0.0 && _splatBlend.z > 0.0) {
        L_cor = V4AddV4(L_cor, V4MulFloat(Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[2].xy)), splatMatTexCodi[2].zw), _off + 2.0), step(0.0,splatMatTexCodi[2].x)*0.5, step(0.0,splatMatTexCodi[2].y)*0.5), blendAlpha * _splatBlend.z));
        blendAlpha -= blendAlpha * _splatBlend.z;
    }
    if(blendAlpha > 0.0 && _splatBlend.y > 0.0) {
        L_cor = V4AddV4(L_cor, V4MulFloat(Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[1].xy)), splatMatTexCodi[1].zw), _off + 1.0), step(0.0,splatMatTexCodi[1].x)*0.5, step(0.0,splatMatTexCodi[1].y)*0.5), blendAlpha * _splatBlend.y));
        blendAlpha -= blendAlpha * _splatBlend.y;
    }
    if(blendAlpha > 0.0 && _splatBlend.x > 0.0) {
        L_cor = V4AddV4(L_cor, V4MulFloat(Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[0].xy)), splatMatTexCodi[0].zw), _off + 0.0), step(0.0,splatMatTexCodi[0].x)*0.5, step(0.0,splatMatTexCodi[0].y)*0.5), blendAlpha * _splatBlend.x));
        blendAlpha -= blendAlpha * _splatBlend.x;
    }
    return L_cor;
}

function SampleSplatmapNormal(_splatBlend : CVec4, _uv : CVec2, _off : number) : CVec4
{
    var L_cor : CVec4 = new CVec4(0.0, 0.0, 0.0, 0.0);
    var blendAlpha : number = 1.0;
    if(blendAlpha > 0.0 && _splatBlend.w > 0.0) {
        L_cor = V4AddV4(L_cor, V4Mix(new CVec4(0.0,0.0,0.0,0.0), Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[3].xy)), splatMatTexCodi[3].zw), _off + 3.0), step(0.0,splatMatTexCodi[3].x)*0.5, step(0.0,splatMatTexCodi[3].y)*0.5), blendAlpha * _splatBlend.w));
        blendAlpha -= blendAlpha * _splatBlend.w;
    }
    if(blendAlpha > 0.0 && _splatBlend.z > 0.0) {
        L_cor = V4AddV4(L_cor, V4Mix(new CVec4(0.0,0.0,0.0,0.0), Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[2].xy)), splatMatTexCodi[2].zw), _off + 2.0), step(0.0,splatMatTexCodi[2].x)*0.5, step(0.0,splatMatTexCodi[2].y)*0.5), blendAlpha * _splatBlend.z));
        blendAlpha -= blendAlpha * _splatBlend.z;
    }
    if(blendAlpha > 0.0 && _splatBlend.y > 0.0) {
        L_cor = V4AddV4(L_cor, V4Mix(new CVec4(0.0,0.0,0.0,0.0), Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[1].xy)), splatMatTexCodi[1].zw), _off + 1.0), step(0.0,splatMatTexCodi[1].x)*0.5, step(0.0,splatMatTexCodi[1].y)*0.5), blendAlpha * _splatBlend.y));
        blendAlpha -= blendAlpha * _splatBlend.y;
    }
    if(blendAlpha > 0.0 && _splatBlend.x > 0.0) {
        L_cor = V4AddV4(L_cor, V4Mix(new CVec4(0.0,0.0,0.0,0.0), Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[0].xy)), splatMatTexCodi[0].zw), _off + 0.0), step(0.0,splatMatTexCodi[0].x)*0.5, step(0.0,splatMatTexCodi[0].y)*0.5), blendAlpha * _splatBlend.x));
        blendAlpha -= blendAlpha * _splatBlend.x;
    }
    return L_cor;
}

// RNM 방식
// http://wiki.polycount.com/wiki/Normal_map
function CombineNormals(_base : CVec3, _detail : CVec3) : CVec3
{
    _base = V3AddV3(_base, new CVec3(0.0, 1.0, 0.0));
    _detail = V3MulV3(_detail, new CVec3(-1.0, 1.0, -1.0));
    return V3Nor(V3SubV3(V3MulFloat(_base, V3Dot(_base, _detail) / _base.y), _detail));
}
//-----------------------------------------------------------------------------------------------------
// ------------- ps
//-----------------------------------------------------------------------------------------------------

//-----------------------------------------------------------------------------------------------------
// water -------------
//-----------------------------------------------------------------------------------------------------
function Remap(_val : number, _min1 : number, _max1 : number, _min2 : number, _max2 : number) : number
{
    return _min2 + (_val - _min1) / (_max1 - _min1) * (_max2 - _min2);
}

function SampleNormalMapToCaustic(_uvw : CVec3, _ligCol : CVec3) : CVec3
{
    var normal : CVec3 = NoiseNormalGet(_uvw, SDF.eNoise.PerlinNormal);
    normal = V3Nor(new CVec3(normal.x/10.0,normal.y,normal.z/10.0));
    var L : CVec3 = new CVec3(0.0, 1.0, 0.0);
    var NdotL : number = max(0.0, V3Dot(normal, L));
    var curRange : number = 0.0001 * causticFlowFreq;
    var threshold : number = 1.0 - curRange;
    var b : number = clamp(Remap(NdotL, threshold, 1.0, 0.0, 0.2), 0.0, 1.0);
    return V3MulFloat(_ligCol, b);
}

function SampleCaustics(_uvw : CVec3, _split : number, _ligDir : CVec3, _ligCol : CVec3) : CVec3
{
    var angleWeight : number = clamp(1.0 / (_ligDir.y + 0.1), 1.0, 5.0);
    var dynamicSplit : number = _split * angleWeight;

    var xzLen : number = V2Len(new CVec2(_ligDir.x, _ligDir.z));
    var offsetDir : CVec2 = (xzLen < 0.0001) ? new CVec2(1.0, 1.0) : new CVec2(_ligDir.x / xzLen, _ligDir.z / xzLen);

    var uvw1 : CVec3 = new CVec3(V2AddV2(_uvw.xy, V2MulFloat(offsetDir, dynamicSplit)), _uvw.z);
    var uvw2 : CVec3 = new CVec3(_uvw.xy, _uvw.z);
    var uvw3 : CVec3 = new CVec3(V2AddV2(_uvw.xy, V2MulFloat(offsetDir, -dynamicSplit)), _uvw.z);

    var r : number = SampleNormalMapToCaustic(uvw1, _ligCol).x;
    var g : number = SampleNormalMapToCaustic(uvw2, _ligCol).y;
    var b : number = SampleNormalMapToCaustic(uvw3, _ligCol).z;

    return new CVec3(r, g, b);
}

function Caustics(_world : CVec3, _flowDir : CVec2, _ligDir : CVec3, _ligCol : CVec3) : CVec3
{
    if(V2Len(_flowDir) == 0.0) return new CVec3(0.0, 0.0, 0.0);

    var flow : CVec3 = new CVec3(
        -causticFlowDir.x / max(V2Len(causticFlowDir), 1e-6), 
        causticFlowDir.y / max(V2Len(causticFlowDir), 1e-6), 
        V2Len(causticFlowDir) * time * 0.1
    );
    var split : number = 1.0 / 1000.0;
    var worldToUV : CVec3 = V3MulFloat(_world, split);
    
    var L : CVec3 = new CVec3(0,1,0);
    var refractOffset : CVec2 = new CVec2(L.x, L.z);
    refractOffset = V2MulFloat(refractOffset, -0.2);

    var uvw : CVec3 = new CVec3(V2AddV2(new CVec2(worldToUV.x + refractOffset.x, worldToUV.z + refractOffset.y), V2MulFloat(flow.xy, flow.z)), flow.z * 3.0);
    var tex : CVec3 = SampleCaustics(uvw, 1.0 / 128.0, L, _ligCol);

    return SaturateV3(tex);
}

function WaterProcessing(_color : CVec3, _caustics : CVec3, _world : CVec4) : CVec3
{
    var heightDiff : number = abs(waterDeep.x - _world.y);

    var depthBlend : number = 1.0 - SaturateFloat(heightDiff / waterDeep.y);
    var dist : number = V3Len(V3SubV3(camPos, _world.xyz));
    var t : number = smoothstep(waterUnderFadeDist.x, waterUnderFadeDist.y, dist);
    var luma : number = (_color.x * 0.299 + _color.y * 0.587 + _color.z * 0.114);   // 바닥 색상이 너무 약하면 물리적으로는 맞는데 시각적으로 이상해 보여서 곱해줌

    var foamThreshold : number = min(waterDeep.z, waterDeep.z * waterHeight);
    var foamMask : number = 1.0 - smoothstep(0.0, foamThreshold, heightDiff);

    _color = V3Mix(deepColor, V3Mix(_color, shallowColor, 0.1), depthBlend);

    _caustics = V3MulFloat(_caustics, depthBlend * luma * (1.0 - foamMask));
    _color = V3AddV3(_color, _caustics);
    
    _color = V3Mix(deepColor, _color, 0.6 * (1.0 - t));

    // foam mask
    if(foamMask > 0.0) {
        var foam : CVec3 = new CVec3(0.55, 0.58, 0.58);

        // 캐스틱과 동일한 흐름 벡터/시간 스케일을 써서 물 표면 흔들림과 foam을 동기화.
        // z(시간) 축을 살려 노이즈 패턴 자체가 시간에 따라 morph되도록 — 캐스틱의 flow.z와 동일한 거동.
        var foamFlowMag : number = V2Len(causticFlowDir);
        var noise : number = NoiseGet(new CVec3(
            _world.x / 300.0 - causticFlowDir.x * time * 0.5,
            _world.z / 300.0 + causticFlowDir.y * time * 0.5,
            foamFlowMag * time * 0.3
        ), SDF.eNoise.Perlin);
        var edgeFade : number = foamMask * smoothstep(0.25, 1.0, noise);

        _color = V3AddV3(_color, V3MulFloat(foam, 0.35 * edgeFade));
        _color = V3Mix(_color, foam, 0.4 * edgeFade);
    }

    return _color;
}

//-----------------------------------------------------------------------------------------------------
// ------------- water
//-----------------------------------------------------------------------------------------------------



function vs_main(f3_ver : Vertex3)
{
    var heightmapSize : CVec2 = Sam2DSize(heightSampler2D);
    var terrainSize : CVec3 = new CVec3(heightmapSize.x * cellSize, terrainHeight, heightmapSize.y * cellSize);

    var worldCellSize : number = cellSize * levelScale * heightScale;
    var pWorldCellSize : number = worldCellSize * (levelRepeat + 1.0);
    
    // 현재 LOD 포지션
    var curPos : CVec4 = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.x = floor(curPos.x / worldCellSize) * worldCellSize;
    curPos.z = floor(curPos.z / worldCellSize) * worldCellSize;

    // 다음 (LOD + 1) 포지션
    var nextPos : CVec4 = curPos;
    nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
    nextPos.z = floor(nextPos.z / pWorldCellSize) * pWorldCellSize;

    var curUV : CVec2 = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    var nextUV : CVec2 = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));

    var curSample : CVec4 = Sam2DLODBiCubicToColor(heightSampler2D, curUV, heightmapSize);
    var nextSample : CVec4 = Sam2DLODBiCubicToColor(heightSampler2D, nextUV, heightmapSize);

    curPos.y = UnpackRGToGray(curSample.xy) * terrainSize.y + terrainOffset.y;
    nextPos.y = UnpackRGToGray(nextSample.xy) * terrainSize.y + terrainOffset.y;

    var curNor : CVec3 = UnpackNormal(new CVec2(curSample.z, curSample.w));
    var nextNor : CVec3 = UnpackNormal(new CVec2(nextSample.z, nextSample.w));

    // LOD 모핑
    var morphAlpha : number = GetMorphLerpK(curPos, camMain, worldCellSize, pWorldCellSize);
    to_worldPos = V4Mix(curPos, nextPos, morphAlpha);
    to_worldPos.y = f3_ver.y * terrainSize.y; // LOD seam 메꾸기 위한 메시 스커트
    to_worldPos.y += mix(curPos.y, nextPos.y, morphAlpha);

    to_normal = V3Mix(curNor, nextNor, morphAlpha);
    to_normal.y = sqrt(1.0 - SaturateFloat(to_normal.x * to_normal.x + to_normal.z * to_normal.z));

    to_uv = V2Mix(curUV, nextUV, morphAlpha);

    // 터레인 외곽에 구멍 뚫리는거 방지
    var terrainMin : CVec3 = terrainOffset;
    var terrainMax : CVec3 = V3AddV3(terrainOffset, terrainSize);
    if(
        to_worldPos.x < terrainMin.x || terrainMax.x < to_worldPos.x ||
        to_worldPos.z < terrainMin.z || terrainMax.z < to_worldPos.z
    ) {
        to_worldPos.y = terrainMin.y;
    }
    to_worldPos.x = clamp(to_worldPos.x, terrainMin.x, terrainMax.x);
    to_worldPos.z = clamp(to_worldPos.z, terrainMin.z, terrainMax.z);

    out_position = V4MulMatCoordi(V4MulMatCoordi(to_worldPos, viewMat), projectMat);
}
function ps_main()
{
    var shadowTex : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
    var shadow : number=-1.0;
    var uvScreen : CVec2;
   
    BranchBegin("shadow","S",[screenSize,shadowOn]);
    if(shadowOn>0.5) {
        uvScreen = V2DivV2(V2SubV2(screenPos.xy, new CVec2(0.5, 0.5)), screenSize.xy);
        shadowTex = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, uvScreen);  // <- 여기! 절대 size 곱하지 말기
        shadow = shadowTex.x;
    }
    BranchEnd();

    var splat : CVec4 = Sam2DToColor(splatSampler2D, to_uv);
    var splatBlend : CVec4 = new CVec4(1.0, splat.xyz);  // 이 부분 변경해서 블렌딩 비율 조절 가능

    var L_cor : CVec4 = SampleSplatmap(splatBlend, to_uv, 0.0);

    BranchBegin("colorModel","CM",[colorModel]);
    L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
    BranchEnd();

    BranchBegin("alphaModel","AM",[alphaModel]);
    L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
    BranchEnd();

    var dseMat : CMat3=new CMat3(0);
	var lmaterial : CVec4=new CVec4(1.0,1.0,1.0,1.0);
    var normal : CVec3 = new CVec3(0.0, 1.0, 0.0);
    var sunDir : CVec3 = new CVec3(0.0, 1.0, 0.0);
	var sunCol : CVec3 = new CVec3(1.0, 1.0, 1.0);
    BranchBegin("light","L",[ligDir,ligCol,ligCount,camPos,material,ligStep0,ligStep1,ligStep2,ligStep3,ambientColor,envmapOn,sam2DCount,samCubeCount]);
    lmaterial = SampleSplatmap(splatBlend, to_uv, 4.0); // material 텍스쳐에서 가져옴
    normal = MappingTexToV3(V3Nor(SampleSplatmapNormal(splatBlend, to_uv, 8.0).xyz));
    normal = CombineNormals(V3Nor(to_normal), new CVec3(normal.x, normal.z, normal.y));
    dseMat = GetSunInfo();
    sunDir = dseMat[0];
    sunCol = dseMat[1];
    dseMat = LightCac3D(camPos, to_worldPos, L_cor, normal, shadow, lmaterial.y, lmaterial.x, lmaterial.z, 1.0);
    L_cor.rgb = V3AddV3(dseMat[0],dseMat[1]);
	BranchEnd();

    out_color = L_cor;

    BranchBegin("waterReflect","waterReflect",[waterDeep]);
    if(to_worldPos.y <= waterDeep.x) discard;	// 물 높이보다 높은 것만 랜더링
    BranchEnd();

    var caustics : CVec3;
    BranchBegin("waterRefract","waterRefract",[waterDeep, waterUnderFadeDist, shallowColor, deepColor, causticFlowDir, causticFlowFreq, waterHeight, camPos, time, normalflowDir, normalRange]);
    if(to_worldPos.y > waterDeep.x + waterDeep.z) discard; // (물 높이 + 거품이 생기는 깊이)보다 낮은 것만 랜더링
    caustics = Caustics(to_worldPos.xyz, causticFlowDir, sunDir, sunCol);
    out_color.rgb = WaterProcessing(out_color.rgb, caustics, to_worldPos);
    BranchEnd();
}

function vs_main_shadow_write(f3_ver : Vertex3)
{
    var svm : CMat=new CMat(0);
	var spm : CMat=new CMat(0);
    if(shadowWrite.x<SDF.eShadow.Cas0 + 0.5)
    {
        svm =Sam2DArrToMat(shadowNearCasV0,shadowWrite.y);
        spm =Sam2DArrToMat(shadowFarCasP0,shadowWrite.y);
    }
    else if(shadowWrite.x<SDF.eShadow.Cas1 + 0.5)
    {
        svm =Sam2DArrToMat(shadowTopCasV1,shadowWrite.y);
        spm =Sam2DArrToMat(shadowBottomCasP1,shadowWrite.y);
    }
    else if(shadowWrite.x<SDF.eShadow.Cas2 + 0.5)
    {
        svm =Sam2DArrToMat(shadowLeftCasV2,shadowWrite.y);
        spm =Sam2DArrToMat(shadowRightCasP2,shadowWrite.y);
    }

    var heightmapSize : CVec2 = Sam2DSize(heightSampler2D);
    var terrainSize : CVec3 = new CVec3(heightmapSize.x * cellSize, terrainHeight, heightmapSize.y * cellSize);

    var worldCellSize : number = cellSize * levelScale * heightScale;
    var pWorldCellSize : number = worldCellSize * (levelRepeat + 1.0);
    
    // 현재 LOD 포지션
    var curPos : CVec4 = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.x = floor(curPos.x / worldCellSize) * worldCellSize;
    curPos.z = floor(curPos.z / worldCellSize) * worldCellSize;

    // 다음 (LOD + 1) 포지션
    var nextPos : CVec4 = curPos;
    nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
    nextPos.z = floor(nextPos.z / pWorldCellSize) * pWorldCellSize;

    var curUV : CVec2 = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    var nextUV : CVec2 = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));

    var curSample : CVec4 = Sam2DLODBiCubicToColor(heightSampler2D, curUV, heightmapSize);
    var nextSample : CVec4 = Sam2DLODBiCubicToColor(heightSampler2D, nextUV, heightmapSize);

    curPos.y = UnpackRGToGray(curSample.xy) * terrainSize.y + terrainOffset.y;
    nextPos.y = UnpackRGToGray(nextSample.xy) * terrainSize.y + terrainOffset.y;

    // LOD 모핑
    var morphAlpha : number = GetMorphLerpK(curPos, camMain, worldCellSize, pWorldCellSize);
    var worldPos : CVec4 = V4Mix(curPos, nextPos, morphAlpha);
    worldPos.y = f3_ver.y * terrainSize.y; // LOD seam 메꾸기 위한 메시 스커트
    worldPos.y += mix(curPos.y, nextPos.y, morphAlpha);

    to_uv = V2Mix(curUV, nextUV, morphAlpha);

    // 터레인 외곽에 구멍 뚫리는거 방지
    var terrainMin : CVec3 = terrainOffset;
    var terrainMax : CVec3 = V3AddV3(terrainOffset, terrainSize);
    if(
        worldPos.x < terrainMin.x || terrainMax.x < worldPos.x ||
        worldPos.z < terrainMin.z || terrainMax.z < worldPos.z
    ) {
        worldPos.y = terrainMin.y;
    }
    worldPos.x = clamp(worldPos.x, terrainMin.x, terrainMax.x);
    worldPos.z = clamp(worldPos.z, terrainMin.z, terrainMax.z);

    to_viewPos = V4MulMatCoordi(worldPos, svm);
    out_position = V4MulMatCoordi(to_viewPos, spm);

    // pancacking
    out_position.z = max(out_position.z, 0.0);
}

function ps_main_shadow_write() 
{
    out_color = to_viewPos;
}

function vs_main_shadow_read(f3_ver : Vertex3)
{
    var heightmapSize : CVec2 = Sam2DSize(heightSampler2D);
    var terrainSize : CVec3 = new CVec3(heightmapSize.x * cellSize, terrainHeight, heightmapSize.y * cellSize);

    var worldCellSize : number = cellSize * levelScale * heightScale;
    var pWorldCellSize : number = worldCellSize * (levelRepeat + 1.0);
    
    // 현재 LOD 포지션
    var curPos : CVec4 = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.x = floor(curPos.x / worldCellSize) * worldCellSize;
    curPos.z = floor(curPos.z / worldCellSize) * worldCellSize;

    // 다음 (LOD + 1) 포지션
    var nextPos : CVec4 = curPos;
    nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
    nextPos.z = floor(nextPos.z / pWorldCellSize) * pWorldCellSize;

    var curUV : CVec2 = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    var nextUV : CVec2 = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));

    var curSample : CVec4 = Sam2DLODBiCubicToColor(heightSampler2D, curUV, heightmapSize);
    var nextSample : CVec4 = Sam2DLODBiCubicToColor(heightSampler2D, nextUV, heightmapSize);

    curPos.y = UnpackRGToGray(curSample.xy) * terrainSize.y + terrainOffset.y;
    nextPos.y = UnpackRGToGray(nextSample.xy) * terrainSize.y + terrainOffset.y;

    var curNor : CVec3 = UnpackNormal(new CVec2(curSample.z, curSample.w));
    var nextNor : CVec3 = UnpackNormal(new CVec2(nextSample.z, nextSample.w));

    // LOD 모핑
    var morphAlpha : number = GetMorphLerpK(curPos, camMain, worldCellSize, pWorldCellSize);
    to_worldPos = V4Mix(curPos, nextPos, morphAlpha);
    to_worldPos.y = f3_ver.y * terrainSize.y; // LOD seam 메꾸기 위한 메시 스커트
    to_worldPos.y += mix(curPos.y, nextPos.y, morphAlpha);

    to_normal = V3Mix(curNor, nextNor, morphAlpha);
    to_normal.y = sqrt(1.0 - SaturateFloat(to_normal.x * to_normal.x + to_normal.z * to_normal.z));

    to_uv = V2Mix(curUV, nextUV, morphAlpha);

    // 터레인 외곽에 구멍 뚫리는거 방지
    var terrainMin : CVec3 = terrainOffset;
    var terrainMax : CVec3 = V3AddV3(terrainOffset, terrainSize);
    if(
        to_worldPos.x < terrainMin.x || terrainMax.x < to_worldPos.x ||
        to_worldPos.z < terrainMin.z || terrainMax.z < to_worldPos.z
    ) {
        to_worldPos.y = terrainMin.y;
    }
    to_worldPos.x = clamp(to_worldPos.x, terrainMin.x, terrainMax.x);
    to_worldPos.z = clamp(to_worldPos.z, terrainMin.z, terrainMax.z);

    out_position = V4MulMatCoordi(V4MulMatCoordi(to_worldPos, viewMat), projectMat);
}

function ps_main_shadow_read() 
{
    var all : number=0.0;
    var shadowRead : CVec4;
    var sVal : number;
    BranchBegin("shadowMulti","SDM",[]);
    for(var i = 0; i < FloatToInt(shadowCount); i++) {
        shadowRead =Sam2DArrToV4(shadowReadList,i);
        sVal  = calcShadow(shadowRead, IntToFloat(i), to_normal, to_worldPos);
        all+=sVal;
    }
    all/=shadowCount;
    if(all<0.0)all=0.0;
    BranchDefault();
    shadowRead =Sam2DArrToV4(shadowReadList,0.0);
    all  = calcShadow(shadowRead, 0.0, to_normal, to_worldPos);
    BranchEnd();
    
    out_color = new CVec4(all, all, all, 1.0);
}