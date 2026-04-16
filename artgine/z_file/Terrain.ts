import { AlphaModalFun, ColorModalFun, GetTexCodiedUV, UnpackRGToGray } from "./ColorFun";
import { ambientColor, envCube, GetMaterial, GetSunInfo, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "./Light";
import { 
	Build, CMat, CVec2, CVec3, CVec4,  OutColor, OutPosition,  
    Sam2DToColor, V4MulMatCoordi, Sam2DV4,
    ToV2, UV2, ToV3, Vertex3, Null, 
	round, max, SaturateFloat, mix,
	V2MulV2, V2DivV2, V2Mix,
	V3Floor, V3SubV3, V3Abs, V3MulV3, V3MulFloat, SaturateV3, V3DivV3,
    BranchBegin, BranchEnd,
    min,
    clamp,
    V3DivFloat,
    V4AddV4,
    discard,
    CMat3,
    ToV4,
    screenPos,
    V2SubV2,
    V3AddV3,
    BranchDefault,
    V2AddV2,
    V3Nor,
    Sam2DTileToColor,
    V3Mix,
    Sam2DLodToColor,
    V2MulFloat,
    V2Fract,
    V2Abs,
    smoothstep,
    V4Mix,
    Sam2DSize,
    V2Floor,
    V3Pow,
    V3Dot,
    V4MulFloat,
    V4DivV4,
    log2,
    floor,
    pow,
} from "./Shader";
import { shadowOn } from "./Shadow";


var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();

var out_position : OutPosition=Null();
var out_color : OutColor=Null();

var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();
var texCodi : CVec4=Null();
var sam2DCount : number=Null();
var material: CVec4 = new CVec4(0.0,0.0,0.0,1.0);
var screenSize : CVec2;

var camPos: CVec3=Null();
var terrainOffset : CVec3;
var terrainSize : CVec3;
var cellSize : number;
var cellCount : CVec3;

var levelRepeat : number;
var splatMatTexCodi : CMat;

var to_uv : ToV2=Null();
var to_worldPos : ToV4=Null();
var to_normal : ToV3=Null();
var to_triPos : ToV3=Null();
var to_triNormal : ToV3=Null();

Build("Artgine/Shader/PreTerrain",[],
	vs_main,[worldMat,viewMat,projectMat,camPos,terrainOffset,terrainSize,cellSize,cellCount,levelRepeat,splatMatTexCodi,screenSize],
	[out_position,to_worldPos,to_uv,to_triPos,to_triNormal],
    ps_main,[out_color]
);

function WorldToUV(_worldPos : CVec4) : CVec2
{
    return V2DivV2(V2SubV2(_worldPos.xz, new CVec2(terrainOffset.x, terrainOffset.z)), new CVec2(terrainSize.x, terrainSize.z));
}

function GetMorphLerpK(_world : CVec4, _LODMult : number) : number
{
    // 비율 설정
    var distRatio : CVec2 = new CVec2(0.66, 1.01);

    var v2CellCount : CVec2 = new CVec2(cellCount.x, cellCount.z);
    var prevLODSize : CVec2 = V2MulFloat(V2MulFloat(v2CellCount, cellSize), 1.0);
    var curLODRadius : CVec2 = V2MulFloat(V2MulFloat(v2CellCount, cellSize), _LODMult);

    var dist : CVec2 = V2Abs(V2SubV2(new CVec2(camPos.x, camPos.z), _world.xz));
    var alpha : CVec2 = V2DivV2(V2SubV2(dist, prevLODSize), V2SubV2(curLODRadius, prevLODSize));
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
    var samSize : CVec2 = Sam2DSize(5.0);
    var heightMapHalfTexel : CVec2 = new CVec2(1.0 / samSize.x, 1.0 / samSize.y);
    var worldToTexScale : CVec2 = V2MulV2(new CVec2(samSize.x - 1.0, samSize.y - 1.0), heightMapHalfTexel);

    return V2AddV2(V2MulV2(_worldUV, worldToTexScale), V2MulFloat(heightMapHalfTexel, 0.5));
}

function SampleHeight(_uv : CVec2, _mipLevel : number, _bilinear : number) : number
{
    var heightSample : CVec4;
    if(_bilinear > 0.5) heightSample = Sam2DLODBilinearToColor(5.0, _uv, _mipLevel);
    else heightSample = Sam2DLodToColor(5.0, _uv, _mipLevel);
    return UnpackRGToGray(heightSample.xy) * terrainSize.y + terrainOffset.y;
}

function vs_main(f3_ver : Vertex3, f2_uv : UV2)
{
    var LODLevel : number = 0.0;
    var LODMult : number = levelRepeat + 1.0;
    
    // 현재 LOD 포지션
    var curPos : CVec4 = V4MulMatCoordi(new CVec4(f3_ver, 1.0), worldMat);
    curPos.xyz = V3MulFloat(V3Floor(V3DivFloat(curPos.xyz, cellSize)), cellSize);
    
    // 다음 (LOD + 1) 포지션
    var nextPos : CVec4 = curPos;
    nextPos.xyz = V3MulFloat(V3Floor(V3DivFloat(nextPos.xyz, cellSize * LODMult)), cellSize * LODMult);
    
    // 믹싱된 포지션
    var morphAlpha : number = GetMorphLerpK(curPos, LODMult);
    var morphPos : CVec4 = V4Mix(curPos, nextPos, morphAlpha);
    var worldUV : CVec2 = WorldToUV(morphPos);

    // 높이 샘플링
    var bilinear : number = 0.0;
    BranchBegin("bilinear","bi",[]);
    bilinear = 1.0;
    BranchEnd();
    curPos.y = SampleHeight(GetHeightMapUV(WorldToUV(curPos)), LODLevel, bilinear);
    nextPos.y = SampleHeight(GetHeightMapUV(WorldToUV(nextPos)), LODLevel, bilinear);
    morphPos.y = mix(curPos.y, nextPos.y, morphAlpha);

    // 노말 계산
    var normal : CVec3 = V3Nor(new CVec3(
        SampleHeight(GetHeightMapUV(WorldToUV(V4AddV4(morphPos, new CVec4(-cellSize, 0.0, 0.0, 0.0)))), LODLevel, bilinear) - SampleHeight(GetHeightMapUV(WorldToUV(V4AddV4(morphPos, new CVec4(cellSize, 0.0, 0.0, 0.0)))), LODLevel, bilinear), 
        2.0, 
        SampleHeight(GetHeightMapUV(WorldToUV(V4AddV4(morphPos, new CVec4(0.0, 0.0, -cellSize, 0.0)))), LODLevel, bilinear) - SampleHeight(GetHeightMapUV(WorldToUV(V4AddV4(morphPos, new CVec4(0.0, 0.0, cellSize, 0.0)))), LODLevel, bilinear)
    ));

    // LOD 사이 믹싱
    to_worldPos = morphPos;
    to_uv = worldUV;
    to_triPos = morphPos.xyz;
    to_triNormal = new CVec3(0.0, 1.0, 0.0);

    BranchBegin("triplanar","tri",[]);
    to_triNormal = V3Pow(V3Abs(normal), 150.0);
    to_triNormal = V3DivFloat(to_triNormal, V3Dot(to_triNormal, new CVec3(1.0, 1.0, 1.0)));
    to_triPos = V3MulV3(to_triPos, new CVec3(1.0, 1.0, -1.0));
    BranchEnd();

    out_position = V4MulMatCoordi(V4MulMatCoordi(to_worldPos, viewMat), projectMat);
}

function TriplanarTexture(_texOff : number, _texCodi : CVec4, _isNormal : number) : CVec4
{
    var samp : CVec4 = new CVec4(0.0, 0.0, 0.0, 0.0);
    var textureCodi : CVec4 = new CVec4(V2DivV2(_texCodi.xy, new CVec2(terrainSize.x, terrainSize.z)), new CVec2(_texCodi.z, _texCodi.w));    
    
    samp = V4AddV4(samp, V4MulFloat(Sam2DTileToColor(_texOff, V2AddV2(V2MulV2(to_triPos.xz, textureCodi.xy), new CVec2(textureCodi.z, textureCodi.w))), to_triNormal.y));
    samp = V4AddV4(samp, V4MulFloat(Sam2DTileToColor(_texOff, V2AddV2(V2MulV2(to_triPos.xy, textureCodi.xy), new CVec2(textureCodi.z, textureCodi.w))), to_triNormal.z));
    samp = V4AddV4(samp, V4MulFloat(Sam2DTileToColor(_texOff, V2AddV2(V2MulV2(new CVec2(-to_triPos.y, to_triPos.z), textureCodi.xy), new CVec2(textureCodi.z, textureCodi.w))), to_triNormal.x));
    return samp;
}

function ApplySplatting(_wPos : CVec3) : CVec4
{
    var splat : CVec4 = Sam2DToColor(4.0, to_uv);
    var splatBlend : CVec4 = new CVec4(1.0, splat.x, splat.y, splat.z);  // 이 부분 변경해서 블렌딩 비율 조절 가능

    var L_cor : CVec4;
    L_cor = V4Mix(L_cor, TriplanarTexture(0.0, splatMatTexCodi[0], 0.0), splatBlend.x);
    L_cor = V4Mix(L_cor, TriplanarTexture(1.0, splatMatTexCodi[1], 0.0), splatBlend.y);
    L_cor = V4Mix(L_cor, TriplanarTexture(2.0, splatMatTexCodi[2], 0.0), splatBlend.z);
    L_cor = V4Mix(L_cor, TriplanarTexture(3.0, splatMatTexCodi[3], 0.0), splatBlend.w);
    return L_cor;
}

function ps_main()
{
    if(to_uv.x < 0.0 || to_uv.x >= 1.0 || to_uv.y < 0.0 || to_uv.y >= 1.0)  // 터레인 밖은 discard
        discard;
    
    var L_cor : CVec4 = ApplySplatting(to_worldPos.xyz);

    BranchBegin("colorModel","CM",[colorModel]);
    L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
    BranchEnd();

    BranchBegin("alphaModel","AM",[alphaModel]);
    L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
    BranchEnd();

    out_color = L_cor;
}