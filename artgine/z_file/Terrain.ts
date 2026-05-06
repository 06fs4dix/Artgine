import { AlphaModalFun, ColorModalFun, UnpackRGToGray } from "./ColorFun";
import { ambientColor, envCube, GetSunInfo, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "./Light";
import { SDF } from "./SDF";
import { 
	Build, CMat, CVec2, CVec3, CVec4,  OutColor, OutPosition,  
    Sam2DToColor, V4MulMatCoordi, Sam2DLodToColor, Sam2DSize, Sam2DArrToMat, Sam2DArrToV4, Sam2DArrTileToColor,
    ToV2, Vertex3, Null, CMat3, ToV4, screenPos, FloatToInt, IntToFloat, ToV3,
	max, mix, smoothstep, floor, sqrt, clamp,
	V2MulV2, V2DivV2, V2SubV2, V2AddV2, V2MulFloat, V2Abs, V2Floor, V2DivFloat,
    V3Abs, V3DivFloat, V3AddV3, V3Pow, V3Dot, V3Nor, V3SubV3, V3Mix,
    V4AddV4, V4Mix, V4MulFloat,
    BranchBegin, BranchEnd, BranchDefault,
    MappingTexToV3,
    V3MulFloat,
    V3MulV3,
    ceil,
    Sam2DArrToColor
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
var camCanv : CVec3=Null();

var terrainOffset : CVec3;
var terrainSize : number;
var terrainHeight : number;
var level : number;
var levelRepeat : number;
var cellSize : number;
var cellCount : CVec3;
var splatMatTexCodi : CMat;

// 필요없는 유니폼인데 샘플러 쉽게 바꾸려고 추가
var splatSampler2D : number = 0.0;
var heightSampler2D : number = 1.0;

var to_uv : ToV2=Null();
var to_worldPos : ToV4=Null();
var to_viewPos : ToV4=Null();
var to_normal : ToV3=Null();

Build("Artgine/Shader/Terrain",[],
	vs_main,[
        worldMat,viewMat,projectMat,camPos,
        terrainOffset,terrainSize,terrainHeight,level,levelRepeat,cellSize,cellCount,splatMatTexCodi,
        splatSampler2D,heightSampler2D
    ],
	[out_position,to_uv,to_worldPos,to_normal],
    ps_main,[out_color]
);

Build("Artgine/Shader/TerrainShadowWrite", ["shadowWrite"], 
    vs_main_shadow_write, [
        worldMat,viewMat,projectMat,camCanv,
        terrainOffset,terrainSize,terrainHeight,level,levelRepeat,cellSize,cellCount,splatMatTexCodi,
        splatSampler2D,heightSampler2D,
        shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,shadowCount,shadowPointProj,shadowReadList
    ], [out_position,to_viewPos,to_uv],
    ps_main_shadow_write,[out_color]
);

Build("Artgine/Shader/TerrainShadowRead", ["shadowRead"], 
    vs_main_shadow_read, [
        worldMat,viewMat,projectMat,camPos,
        terrainOffset,terrainSize,terrainHeight,level,levelRepeat,cellSize,cellCount,splatMatTexCodi,
        splatSampler2D,heightSampler2D,
        shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,shadowCount,shadowPointProj,shadowReadList,
        shadowRate,PCF,texture16f,bias,normalBias,jitter
    ], [out_position,to_uv,to_worldPos,to_normal],
    ps_main_shadow_read,[out_color]
);

//-----------------------------------------------------------------------------------------------------
// vs -------------
//-----------------------------------------------------------------------------------------------------
function WorldToUV(_worldPos : CVec4, _terrainOffset : CVec3, _terrainSize : number) : CVec2
{
    return V2DivFloat(V2SubV2(_worldPos.xz, new CVec2(_terrainOffset.x, _terrainOffset.z)), _terrainSize);
}

function GetMorphLerpK(_world : CVec4, _camPos : CVec3) : number
{
    // 비율 설정
    var distRatio : CVec2 = new CVec2(0.66, 1.00);

    var prevLODSize : number = cellSize * cellCount.x;
    var curLODRadius : number = prevLODSize * (levelRepeat + 1.0);

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
    if(_splatBlend.x > 0.0)
        L_cor = V4Mix(L_cor, Sam2DArrToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, splatMatTexCodi[0].xy), splatMatTexCodi[0].zw), _off + 0.0)), _splatBlend.x);
    if(_splatBlend.y > 0.0)
        L_cor = V4Mix(L_cor, Sam2DArrToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, splatMatTexCodi[1].xy), splatMatTexCodi[1].zw), _off + 1.0)), _splatBlend.y);
    if(_splatBlend.z > 0.0)
        L_cor = V4Mix(L_cor, Sam2DArrToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, splatMatTexCodi[2].xy), splatMatTexCodi[2].zw), _off + 2.0)), _splatBlend.z);
    if(_splatBlend.w > 0.0)
        L_cor = V4Mix(L_cor, Sam2DArrToColor(0.0, new CVec3(V2AddV2(V2MulV2(_uv, splatMatTexCodi[3].xy), splatMatTexCodi[3].zw), _off + 3.0)), _splatBlend.w);
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

function vs_main(f3_ver : Vertex3)
{
    var worldCellSize : number = cellSize;
    var pWorldCellSize : number = worldCellSize * (levelRepeat + 1.0);
    
    // 현재 LOD 포지션
    var curPos : CVec4 = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.x = floor(curPos.x / worldCellSize) * worldCellSize;
    curPos.z = ceil(curPos.z / worldCellSize) * worldCellSize;

    // 다음 (LOD + 1) 포지션
    var nextPos : CVec4 = curPos;
    nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
    nextPos.z = ceil(nextPos.z / pWorldCellSize) * pWorldCellSize;
    
    // LOD 믹싱된 포지션
    var morphAlpha : number = GetMorphLerpK(curPos, camPos);
    var morphPos : CVec4 = V4Mix(curPos, nextPos, morphAlpha);

    // 높이 샘플링
    var curUV : CVec2 = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    var nextUV : CVec2 = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));
    var curSample : CVec4;
    var nextSample : CVec4;
    BranchBegin("bilinear","bi",[]);
    curSample = Sam2DLODBilinearToColor(heightSampler2D, curUV, 0.0);
    nextSample = Sam2DLODBilinearToColor(heightSampler2D, nextUV, 0.0);
    BranchDefault();
    curSample = Sam2DLodToColor(heightSampler2D, curUV, 0.0);
    nextSample = Sam2DLodToColor(heightSampler2D, nextUV, 0.0);
    BranchEnd();
    curPos.y = UnpackRGToGray(curSample.xy);
    nextPos.y = UnpackRGToGray(nextSample.xy);
    morphPos.y = mix(curPos.y, nextPos.y, morphAlpha) * terrainHeight + terrainOffset.y;
    morphPos.y += f3_ver.y * terrainHeight; // LOD seam 메꾸기 위한 메시 스커트
    var curNor : CVec3 = UnpackNormal(new CVec2(curSample.z, curSample.w));
    var nextNor : CVec3 = UnpackNormal(new CVec2(nextSample.z, nextSample.w));
    var normal : CVec3 = V3Mix(curNor, nextNor, morphAlpha);

    // 터레인 외곽에 구멍 뚫리는거 방지
    morphPos.x = clamp(morphPos.x, terrainOffset.x, terrainOffset.x + terrainSize);
    morphPos.z = clamp(morphPos.z, terrainOffset.z, terrainOffset.z + terrainSize);
    if(
        morphPos.x <= terrainOffset.x || terrainOffset.x + terrainSize <= morphPos.x ||
        morphPos.z <= terrainOffset.z || terrainOffset.z + terrainSize <= morphPos.z
    ) {
        morphPos.y = terrainOffset.y;
    }

    to_worldPos = morphPos;
    to_uv = WorldToUV(morphPos, terrainOffset, terrainSize);
    to_normal = normal;

    out_position = V4MulMatCoordi(V4MulMatCoordi(morphPos, viewMat), projectMat);
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
    var splatBlend : CVec4 = new CVec4(1.0, splat.x, splat.y, splat.z);  // 이 부분 변경해서 블렌딩 비율 조절 가능

    var L_cor : CVec4 = SampleSplatmap(splatBlend, to_uv, 0.0);

    var splatNormal : CVec3 = MappingTexToV3(V3Nor(SampleSplatmap(splatBlend, to_uv, 8.0).xyz));
    var temp : number = splatNormal.z;
    splatNormal.z = splatNormal.y;
    splatNormal.y = temp;
    var normal : CVec3 = CombineNormals(V3Nor(to_normal), splatNormal);

    BranchBegin("colorModel","CM",[colorModel]);
    L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
    BranchEnd();

    BranchBegin("alphaModel","AM",[alphaModel]);
    L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
    BranchEnd();

    var dseMat : CMat3=new CMat3(0);
	var lmaterial : CVec4=new CVec4(1.0,1.0,1.0,1.0);
    BranchBegin("light","L",[ligDir,ligCol,ligCount,camPos,material,ligStep0,ligStep1,ligStep2,ligStep3,envCube,ambientColor]);
    lmaterial = SampleSplatmap(splatBlend, to_uv, 4.0); // material 텍스쳐에서 가져옴
    dseMat = LightCac3D(camPos, to_worldPos, L_cor, normal, shadow, lmaterial.y, lmaterial.x, lmaterial.z, ambientColor);
    L_cor.rgb = V3AddV3(dseMat[0],dseMat[1]);
	BranchEnd();

    out_color = L_cor;
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

    var worldCellSize : number = cellSize;
    var pWorldCellSize : number = worldCellSize * (levelRepeat + 1.0);
    
    // 현재 LOD 포지션
    var curPos : CVec4 = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.x = floor(curPos.x / worldCellSize) * worldCellSize;
    curPos.z = ceil(curPos.z / worldCellSize) * worldCellSize;

    // 다음 (LOD + 1) 포지션
    var nextPos : CVec4 = curPos;
    nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
    nextPos.z = ceil(nextPos.z / pWorldCellSize) * pWorldCellSize;

    // 믹싱된 포지션
    var morphAlpha : number = GetMorphLerpK(curPos, camCanv);
    var morphPos : CVec4 = V4Mix(curPos, nextPos, morphAlpha);

    // 높이 샘플링
    var curUV : CVec2 = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    var nextUV : CVec2 = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));
    var curSample : CVec4;
    var nextSample : CVec4;
    BranchBegin("bilinear","bi",[]);
    curSample = Sam2DLODBilinearToColor(heightSampler2D, curUV, 0.0);
    nextSample = Sam2DLODBilinearToColor(heightSampler2D, nextUV, 0.0);
    BranchDefault();
    curSample = Sam2DLodToColor(heightSampler2D, curUV, 0.0);
    nextSample = Sam2DLodToColor(heightSampler2D, nextUV, 0.0);
    BranchEnd();
    curPos.y = UnpackRGToGray(curSample.xy);
    nextPos.y = UnpackRGToGray(nextSample.xy);
    morphPos.y = mix(curPos.y, nextPos.y, morphAlpha) * terrainHeight + terrainOffset.y;
    morphPos.y += f3_ver.y * terrainHeight; // LOD seam 메꾸기 위한 메시 스커트

    // 터레인 외곽에 구멍 뚫리는거 방지
    morphPos.x = clamp(morphPos.x, terrainOffset.x, terrainOffset.x + terrainSize);
    morphPos.z = clamp(morphPos.z, terrainOffset.z, terrainOffset.z + terrainSize);
    if(
        morphPos.x <= terrainOffset.x || terrainOffset.x + terrainSize <= morphPos.x ||
        morphPos.z <= terrainOffset.z || terrainOffset.z + terrainSize <= morphPos.z
    ) {
        morphPos.y = terrainOffset.y;
    }

    to_viewPos = V4MulMatCoordi(morphPos, svm);
    out_position = V4MulMatCoordi(to_viewPos, spm);
}

function ps_main_shadow_write() 
{
    out_color = to_viewPos;
}

function vs_main_shadow_read(f3_ver : Vertex3)
{
    var worldCellSize : number = cellSize;
    var pWorldCellSize : number = worldCellSize * (levelRepeat + 1.0);
    
    // 현재 LOD 포지션
    var curPos : CVec4 = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.x = floor(curPos.x / worldCellSize) * worldCellSize;
    curPos.z = ceil(curPos.z / worldCellSize) * worldCellSize;

    // 다음 (LOD + 1) 포지션
    var nextPos : CVec4 = curPos;
    nextPos.x = floor(nextPos.x / pWorldCellSize) * pWorldCellSize;
    nextPos.z = ceil(nextPos.z / pWorldCellSize) * pWorldCellSize;

    // 믹싱된 포지션
    var morphAlpha : number = GetMorphLerpK(curPos, camPos);
    var morphPos : CVec4 = V4Mix(curPos, nextPos, morphAlpha);

    // 높이 샘플링
    var curUV : CVec2 = GetHeightMapUV(WorldToUV(curPos, terrainOffset, terrainSize));
    var nextUV : CVec2 = GetHeightMapUV(WorldToUV(nextPos, terrainOffset, terrainSize));
    var curSample : CVec4;
    var nextSample : CVec4;
    BranchBegin("bilinear","bi",[]);
    curSample = Sam2DLODBilinearToColor(heightSampler2D, curUV, 0.0);
    nextSample = Sam2DLODBilinearToColor(heightSampler2D, nextUV, 0.0);
    BranchDefault();
    curSample = Sam2DLodToColor(heightSampler2D, curUV, 0.0);
    nextSample = Sam2DLodToColor(heightSampler2D, nextUV, 0.0);
    BranchEnd();
    curPos.y = UnpackRGToGray(curSample.xy);
    nextPos.y = UnpackRGToGray(nextSample.xy);
    morphPos.y = mix(curPos.y, nextPos.y, morphAlpha) * terrainHeight + terrainOffset.y;
    morphPos.y += f3_ver.y * terrainHeight; // LOD seam 메꾸기 위한 메시 스커트
    var curNor : CVec3 = UnpackNormal(new CVec2(curSample.z, curSample.w));
    var nextNor : CVec3 = UnpackNormal(new CVec2(nextSample.z, nextSample.w));
    var normal : CVec3 = V3Mix(curNor, nextNor, morphAlpha);

    // 터레인 외곽에 구멍 뚫리는거 방지
    morphPos.x = clamp(morphPos.x, terrainOffset.x, terrainOffset.x + terrainSize);
    morphPos.z = clamp(morphPos.z, terrainOffset.z, terrainOffset.z + terrainSize);
    if(
        morphPos.x <= terrainOffset.x || terrainOffset.x + terrainSize <= morphPos.x ||
        morphPos.z <= terrainOffset.z || terrainOffset.z + terrainSize <= morphPos.z
    ) {
        morphPos.y = terrainOffset.y;
    }

    to_worldPos = morphPos;
    to_uv = WorldToUV(morphPos, terrainOffset, terrainSize);
    to_normal = normal;

    out_position = V4MulMatCoordi(V4MulMatCoordi(morphPos, viewMat), projectMat);
}

function ps_main_shadow_read() 
{
    var splat : CVec4 = Sam2DToColor(splatSampler2D, to_uv);
    var splatBlend : CVec4 = new CVec4(1.0, splat.x, splat.y, splat.z);  // 이 부분 변경해서 블렌딩 비율 조절 가능    

    var splatNormal : CVec3 = MappingTexToV3(V3Nor(SampleSplatmap(splatBlend, to_uv, 8.0).xyz));
    var temp : number = splatNormal.z;
    splatNormal.z = splatNormal.y;
    splatNormal.y = temp;
    var normal : CVec3 = CombineNormals(V3Nor(to_normal), splatNormal);

    var all : number=0.0;
    var shadowRead : CVec4;
    var sVal : number;
    BranchBegin("shadowMulti","SDM",[]);
    for(var i = 0; i < FloatToInt(shadowCount); i++) {
        shadowRead =Sam2DArrToV4(shadowReadList,i);
        sVal  = calcShadow(shadowRead, IntToFloat(i), normal, to_worldPos);
        all+=sVal;
    }
    all/=shadowCount;
    if(all<0.0)all=0.0;
    BranchDefault();
    shadowRead =Sam2DArrToV4(shadowReadList,0.0);
    all  = calcShadow(shadowRead, 0.0, normal, to_worldPos);
    BranchEnd();
    
    out_color = new CVec4(all, all, all, 1.0);
}