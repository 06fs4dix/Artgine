import { AlphaModalFun, ColorModalFun, UnpackRGToGray } from "./ColorFun";
import { ambientColor, envCube, GetSunInfo, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "./Light";
import { NoiseNormalGet } from "./Noise";
import { SDF } from "./SDF";
import { 
	Build, CMat, CVec2, CVec3, CVec4,  OutColor, OutPosition,  
    Sam2DToColor, V4MulMatCoordi, Sam2DLodToColor, Sam2DSize, Sam2DArrToMat, Sam2DArrToV4, Sam2DArrToColor, Sam2DArrTileToColor, Sam2DArrTileToNormal, 
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

function Sam2DLODBilinearToColor(_texOff : number, _uv : CVec2, _mipLevel : number) : CVec4
{
    var samSize : CVec2 = Sam2DSize(_texOff);
    var texelSize : CVec2 = V2DivV2(new CVec2(1.0, 1.0), samSize);
    _uv = V2SubV2(V2MulV2(_uv, samSize), new CVec2(0.5, 0.5));
    var uvf : CVec2 = V2Floor(_uv);
    var f : CVec2 = V2SubV2(_uv, uvf);
    _uv = V2MulV2(V2AddV2(uvf, new CVec2(0.5, 0.5)), texelSize);

    var uv00 : CVec2 = V2AddV2(_uv, new CVec2(0.0,         0.0));
    var uv10 : CVec2 = V2AddV2(_uv, new CVec2(texelSize.x, 0.0));
    var uv01 : CVec2 = V2AddV2(_uv, new CVec2(0.0,         texelSize.y));
    var uv11 : CVec2 = V2AddV2(_uv, new CVec2(texelSize.x, texelSize.y));

    var col00 : CVec4 = Sam2DLodToColor(_texOff, uv00, _mipLevel);
    var col10 : CVec4 = Sam2DLodToColor(_texOff, uv10, _mipLevel);
    var col01 : CVec4 = Sam2DLodToColor(_texOff, uv01, _mipLevel);
    var col11 : CVec4 = Sam2DLodToColor(_texOff, uv11, _mipLevel);

    return V4Mix(V4Mix(col00, col10, f.x), V4Mix(col01, col11, f.x), f.y);
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
        L_cor = V4Mix(L_cor, Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[3].xy)), splatMatTexCodi[3].zw), _off + 3.0), step(0.0,splatMatTexCodi[3].x)*0.5, step(0.0,splatMatTexCodi[3].y)*0.5), blendAlpha);
        blendAlpha -= _splatBlend.w;
    }
    if(blendAlpha > 0.0 && _splatBlend.z > 0.0) {
        L_cor = V4Mix(L_cor, Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[2].xy)), splatMatTexCodi[2].zw), _off + 2.0), step(0.0,splatMatTexCodi[2].x)*0.5, step(0.0,splatMatTexCodi[2].y)*0.5), blendAlpha);
        blendAlpha -= _splatBlend.z;
    }
    if(blendAlpha > 0.0 && _splatBlend.y > 0.0) {
        L_cor = V4Mix(L_cor, Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[1].xy)), splatMatTexCodi[1].zw), _off + 1.0), step(0.0,splatMatTexCodi[1].x)*0.5, step(0.0,splatMatTexCodi[1].y)*0.5), blendAlpha);
        blendAlpha -= _splatBlend.y;
    }
    if(blendAlpha > 0.0 && _splatBlend.x > 0.0) {
        L_cor = V4Mix(L_cor, Sam2DArrTileToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[0].xy)), splatMatTexCodi[0].zw), _off + 0.0), step(0.0,splatMatTexCodi[0].x)*0.5, step(0.0,splatMatTexCodi[0].y)*0.5), blendAlpha);
        blendAlpha -= _splatBlend.x;
    }
    return L_cor;
}

function SampleSplatmapNormal(_splatBlend : CVec4, _uv : CVec2, _off : number) : CVec4
{
    var L_cor : CVec4;
    var blendAlpha : number = 1.0;
    if(blendAlpha > 0.0 && _splatBlend.w > 0.0) {
        L_cor = V4Mix(L_cor, Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[3].xy)), splatMatTexCodi[3].zw), _off + 3.0), step(0.0,splatMatTexCodi[3].x)*0.5, step(0.0,splatMatTexCodi[3].y)*0.5), blendAlpha);
        blendAlpha -= _splatBlend.w;
    }
    if(blendAlpha > 0.0 && _splatBlend.z > 0.0) {
        L_cor = V4Mix(L_cor, Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[2].xy)), splatMatTexCodi[2].zw), _off + 2.0), step(0.0,splatMatTexCodi[2].x)*0.5, step(0.0,splatMatTexCodi[2].y)*0.5), blendAlpha);
        blendAlpha -= _splatBlend.z;
    }
    if(blendAlpha > 0.0 && _splatBlend.y > 0.0) {
        L_cor = V4Mix(L_cor, Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[1].xy)), splatMatTexCodi[1].zw), _off + 1.0), step(0.0,splatMatTexCodi[1].x)*0.5, step(0.0,splatMatTexCodi[1].y)*0.5), blendAlpha);
        blendAlpha -= _splatBlend.y;
    }
    if(blendAlpha > 0.0 && _splatBlend.x > 0.0) {
        L_cor = V4Mix(L_cor, Sam2DArrTileToNormal(0.0, new CVec3(V2AddV2(V2MulV2(_uv, V2Abs(splatMatTexCodi[0].xy)), splatMatTexCodi[0].zw), _off + 0.0), step(0.0,splatMatTexCodi[0].x)*0.5, step(0.0,splatMatTexCodi[0].y)*0.5), blendAlpha);
        blendAlpha -= _splatBlend.x;
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

function Caustics(_color : CVec3, _world : CVec3, _flowDir : CVec2, _ligDir : CVec3, _ligCol : CVec3) : CVec3
{
    if(V2Len(_flowDir) == 0.0) return _color;

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

    _color = V3AddV3(_color, tex);
    return SaturateV3(_color);
}
//-----------------------------------------------------------------------------------------------------
// ------------- water
//-----------------------------------------------------------------------------------------------------

function WaterProcessing(_color : CVec3, _world : CVec4) : CVec3
{
    var heightDiff : number = abs(waterDeep.x - _world.y);

    var depthBlend : number = 1.0 - SaturateFloat(heightDiff / waterDeep.y);
    _color = V3Mix(deepColor, V3Mix(_color, shallowColor, 0.1), depthBlend);	// 색상이 물 색상과 크게 다르면 곱셈으로 했을 때 이상한 값이 나옴
    var dist : number = V3Len(V3SubV3(camPos, _world.xyz));
    var t : number = smoothstep(waterUnderFadeDist.x, waterUnderFadeDist.y, dist);
    _color = V3Mix(deepColor, _color, 0.6 * (1.0 - t));

    // foam mask
    if(heightDiff < min(waterDeep.z, waterDeep.z * waterHeight)) {
        var foam : CVec3 = new CVec3(0.6, 0.6, 0.6);
        _color = V3AddV3(_color, V3MulFloat(foam, 0.35));
        _color = V3Mix(_color, foam, 0.4);
    }

    return _color;
}



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
    var curUV : CVec2 = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    // var curSample : CVec4 = Sam2DLODBilinearToColor(heightSampler2D, curUV, 0.0);
    var curSample : CVec4 = Sam2DLodToColor(heightSampler2D, curUV, 0.0);
    curPos.y = UnpackRGToGray(curSample.xy) * terrainSize.y + terrainOffset.y;
    var curNor : CVec3 = UnpackNormal(new CVec2(curSample.z, curSample.w));

    // 최종
    var normal : CVec3 = curNor;
    var morphPos : CVec4 = curPos;

    var morphAlpha : number = GetMorphLerpK(curPos, camMain, worldCellSize, pWorldCellSize);
    if(morphAlpha > 0.0)
    {
        // 다음 (LOD + 1) 포지션
        var nextPos : CVec4 = curPos;
        nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
        nextPos.z = floor(nextPos.z / pWorldCellSize) * pWorldCellSize;
        var nextUV : CVec2 = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));
        // var nextSample : CVec4 = Sam2DLODBilinearToColor(heightSampler2D, nextUV, 0.0);
        var nextSample : CVec4 = Sam2DLodToColor(heightSampler2D, nextUV, 0.0);
        nextPos.y = UnpackRGToGray(nextSample.xy) * terrainSize.y + terrainOffset.y;
        var nextNor : CVec3 = UnpackNormal(new CVec2(nextSample.z, nextSample.w));

        // LOD 모핑
        morphPos = V4Mix(curPos, nextPos, morphAlpha);
        morphPos.y = f3_ver.y * terrainSize.y; // LOD seam 메꾸기 위한 메시 스커트
        morphPos.y += mix(curPos.y, nextPos.y, morphAlpha);

        normal = V3Mix(curNor, nextNor, morphAlpha);
        normal.y = sqrt(1.0 - SaturateFloat(normal.x * normal.x + normal.z * normal.z));
    }

    // 터레인 외곽에 구멍 뚫리는거 방지
    var terrainMin : CVec3 = terrainOffset;
    var terrainMax : CVec3 = V3AddV3(terrainOffset, terrainSize);
    if(
        morphPos.x < terrainMin.x || terrainMax.x < morphPos.x ||
        morphPos.z < terrainMin.z || terrainMax.z < morphPos.z
    ) {
        morphPos.y = terrainMin.y;
    }
    morphPos.x = clamp(morphPos.x, terrainMin.x, terrainMax.x);
    morphPos.z = clamp(morphPos.z, terrainMin.z, terrainMax.z);

    to_worldPos = morphPos;
    out_position = V4MulMatCoordi(V4MulMatCoordi(morphPos, viewMat), projectMat);

    to_uv = WorldToUV(morphPos, terrainOffset, terrainSize);
    to_normal = normal;
}
function ps_main()
{
    var shadowTex : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
    var shadow : number=-1.0;
    var uvScreen : CVec2;
   
    BranchBegin("shadow","S",[screenSize]);
    uvScreen = V2DivV2(V2SubV2(screenPos.xy, new CVec2(0.5, 0.5)), screenSize.xy);
    shadowTex = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, uvScreen);  // <- 여기! 절대 size 곱하지 말기
    shadow = shadowTex.x;
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
    BranchBegin("light","L",[ligDir,ligCol,ligCount,camPos,material,ligStep0,ligStep1,ligStep2,ligStep3,envCube,ambientColor]);
    lmaterial = SampleSplatmap(splatBlend, to_uv, 4.0); // material 텍스쳐에서 가져옴
    normal = MappingTexToV3(V3Nor(SampleSplatmapNormal(splatBlend, to_uv, 8.0).xyz));
    normal = CombineNormals(V3Nor(to_normal), new CVec3(normal.x, normal.z, normal.y));
    dseMat = GetSunInfo();
    sunDir = dseMat[0];
    sunCol = dseMat[1];
    dseMat = LightCac3D(camPos, to_worldPos, L_cor, normal, shadow, lmaterial.y, lmaterial.x, lmaterial.z, ambientColor);
    L_cor.rgb = V3AddV3(dseMat[0],dseMat[1]);
	BranchEnd();

    out_color = L_cor;

    BranchBegin("waterReflect","waterReflect",[waterDeep]);
    if(to_worldPos.y <= waterDeep.x) discard;	// 물 높이보다 높은 것만 랜더링
    BranchEnd();

    BranchBegin("waterRefract","waterRefract",[waterDeep, waterUnderFadeDist, shallowColor, deepColor, causticFlowDir, causticFlowFreq, waterHeight, camPos, time]);
    if(to_worldPos.y > waterDeep.x + waterDeep.z) discard; // (물 높이 + 거품이 생기는 깊이)보다 낮은 것만 랜더링
    out_color.rgb = Caustics(out_color.rgb, to_worldPos.xyz, causticFlowDir,sunDir,sunCol);
    out_color.rgb = WaterProcessing(out_color.rgb, to_worldPos);
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
    var curUV : CVec2 = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    // var curSample : CVec4 = Sam2DLODBilinearToColor(heightSampler2D, curUV, 0.0);
    var curSample : CVec4 = Sam2DLodToColor(heightSampler2D, curUV, 0.0);
    curPos.y = UnpackRGToGray(curSample.xy) * terrainSize.y + terrainOffset.y;

    // 최종
    var morphPos : CVec4 = curPos;

    var morphAlpha : number = GetMorphLerpK(curPos, camMain, worldCellSize, pWorldCellSize);
    if(morphAlpha > 0.0)
    {
        // 다음 (LOD + 1) 포지션
        var nextPos : CVec4 = curPos;
        nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
        nextPos.z = floor(nextPos.z / pWorldCellSize) * pWorldCellSize;
        var nextUV : CVec2 = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));
        // var nextSample : CVec4 = Sam2DLODBilinearToColor(heightSampler2D, nextUV, 0.0);
        var nextSample : CVec4 = Sam2DLodToColor(heightSampler2D, nextUV, 0.0);
        nextPos.y = UnpackRGToGray(nextSample.xy) * terrainSize.y + terrainOffset.y;

        // LOD 모핑
        morphPos = V4Mix(curPos, nextPos, morphAlpha);
        morphPos.y = f3_ver.y * terrainSize.y; // LOD seam 메꾸기 위한 메시 스커트
        morphPos.y += mix(curPos.y, nextPos.y, morphAlpha);
    }

    // 터레인 외곽에 구멍 뚫리는거 방지
    var terrainMin : CVec3 = terrainOffset;
    var terrainMax : CVec3 = V3AddV3(terrainOffset, terrainSize);
    if(
        morphPos.x < terrainMin.x || terrainMax.x < morphPos.x ||
        morphPos.z < terrainMin.z || terrainMax.z < morphPos.z
    ) {
        morphPos.y = terrainMin.y;
    }
    morphPos.x = clamp(morphPos.x, terrainMin.x, terrainMax.x);
    morphPos.z = clamp(morphPos.z, terrainMin.z, terrainMax.z);

    to_viewPos = V4MulMatCoordi(morphPos, svm);
    out_position = V4MulMatCoordi(to_viewPos, spm);
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
    var curUV : CVec2 = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    // var curSample : CVec4 = Sam2DLODBilinearToColor(heightSampler2D, curUV, 0.0);
    var curSample : CVec4 = Sam2DLodToColor(heightSampler2D, curUV, 0.0);
    curPos.y = UnpackRGToGray(curSample.xy) * terrainSize.y + terrainOffset.y;
    var curNor : CVec3 = UnpackNormal(new CVec2(curSample.z, curSample.w));

    // 최종
    var normal : CVec3 = curNor;
    var morphPos : CVec4 = curPos;

    var morphAlpha : number = GetMorphLerpK(curPos, camMain, worldCellSize, pWorldCellSize);
    if(morphAlpha > 0.0)
    {
        // 다음 (LOD + 1) 포지션
        var nextPos : CVec4 = curPos;
        nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
        nextPos.z = floor(nextPos.z / pWorldCellSize) * pWorldCellSize;
        var nextUV : CVec2 = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));
        // var nextSample : CVec4 = Sam2DLODBilinearToColor(heightSampler2D, nextUV, 0.0);
        var nextSample : CVec4 = Sam2DLodToColor(heightSampler2D, nextUV, 0.0);
        nextPos.y = UnpackRGToGray(nextSample.xy) * terrainSize.y + terrainOffset.y;
        var nextNor : CVec3 = UnpackNormal(new CVec2(nextSample.z, nextSample.w));

        // LOD 모핑
        morphPos = V4Mix(curPos, nextPos, morphAlpha);
        morphPos.y = f3_ver.y * terrainSize.y; // LOD seam 메꾸기 위한 메시 스커트
        morphPos.y += mix(curPos.y, nextPos.y, morphAlpha);

        normal = V3Mix(curNor, nextNor, morphAlpha);
        normal.y = sqrt(1.0 - SaturateFloat(normal.x * normal.x + normal.z * normal.z));
    }

    // 터레인 외곽에 구멍 뚫리는거 방지
    var terrainMin : CVec3 = terrainOffset;
    var terrainMax : CVec3 = V3AddV3(terrainOffset, terrainSize);
    if(
        morphPos.x < terrainMin.x || terrainMax.x < morphPos.x ||
        morphPos.z < terrainMin.z || terrainMax.z < morphPos.z
    ) {
        morphPos.y = terrainMin.y;
    }
    morphPos.x = clamp(morphPos.x, terrainMin.x, terrainMax.x);
    morphPos.z = clamp(morphPos.z, terrainMin.z, terrainMax.z);

    to_worldPos = morphPos;
    to_uv = WorldToUV(morphPos, terrainOffset, terrainSize);
    to_normal = normal;

    out_position = V4MulMatCoordi(V4MulMatCoordi(morphPos, viewMat), projectMat);
}

function ps_main_shadow_read() 
{
    var splat : CVec4 = Sam2DToColor(splatSampler2D, to_uv);
    //var splatBlend : CVec4 = new CVec4(1.0, splat.x, splat.y, splat.z);  // 이 부분 변경해서 블렌딩 비율 조절 가능    

    // var normal : CVec3;
    // normal = MappingTexToV3(V3Nor(SampleSplatmapNormal(splatBlend, to_uv, 8.0).xyz));
    // normal = CombineNormals(V3Nor(to_normal), new CVec3(normal.x, normal.z, normal.y));

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