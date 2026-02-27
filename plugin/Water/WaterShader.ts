import {  ColorModalFun, GetTexCodiedUV } from "../../artgine/z_file/ColorFun";
import { ambientColor, envCube, GetMaterial, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "../../artgine/z_file/Light";
import { NoiseGet, NoiseNormalGet } from "../../artgine/z_file/Noise";
import { SDF } from "../../artgine/z_file/SDF";

import { 
    abs, Attribute, BranchBegin, BranchDefault, BranchEnd, Build, clamp, CMat, CMat3, CVec2, CVec3, CVec4, dFdx, dFdy, 
    MatTypeToMat, max, min, mix, mod, Null, OutColor, OutPosition, pow, reflect, Sam2D0ToColor, 
    Sam2DToColor, SamCubeToColor, SaturateFloat, screenPos, smoothstep, TexOff3, ToV2, ToV3, ToV4, UV2, V2AddV2, 
    V2DivV2, 
    V2Dot, 
    V2Len, V2Mod, V2MulFloat, V2MulV2, V2SubV2, V3AddV3, V3Dot, V3Len, V3Mix, 
    V3MulFloat, V3MulV3, V3Nor, V3Pow, V3SubV3, V4AddV4, V4Mix, V4MulFloat, V4MulMatCoordi, V4MulV4, Vertex3 
} from "../../artgine/z_file/Shader";
import { shadowOn } from "../../artgine/z_file/Shadow";

// out
var out_position : OutPosition=Null();
var out_color : OutColor=Null();

// varying
var to_uv : ToV2=Null();
var to_worldPos : ToV4=Null();
var to_projPos : ToV4=Null();
var to_ref : ToV3=Null();

// uniform
var worldMat : CMat=Null();
var worldMatShort : CVec4=Null();
var worldMatType : number=16.0;

var viewMat : CMat=Null();
var projectMat : CMat=Null();
var waterViewMat : CMat=Null();
var waterProjectMat : CMat=Null();
var material: CVec4 = new CVec4(0.0,0.0,0.0,1.0);

var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();

var texCodi : CVec4=Null();

var skin : number=Null();

var camPos: CVec3=Null();
var time : number = Attribute(0,"time");
var sam2DCount : number=Null();

var reflectMap : number = 1.0;
var refractMap : number = 2.0;
var normal1Map : number = 3.0;
var normal2Map : number = 4.0;

var normalflowDir : CVec2 = new CVec2(1.0, 0.0);
var normalRange : number = 1.0;

var texflowDir : CVec2 = new CVec2(1.0, 0.0);
var shallowColor : CVec3 = new CVec3(0.0,0.0,0.0);
var deepColor    : CVec3 = new CVec3(0.0,0.1,0.5);
var waterDeep : CVec4 = new CVec4(0.0,256.0,5.0,0.0);
var waterUnderFadeDist : CVec2 = new CVec2(2000.0, 3000.0);

var waterHeight : number = 1.0;

var waterTop : number=-1.0;

// var cubeMapPos : CVec3 = new CVec3(0.0, 0.0, 0.0);
// var cubeMapSize : CVec3 = new CVec3(0.0, 0.0, 0.0);

//water
Build("Water3D", ["water","3D"], 
    vs_main_water, [
        worldMat,
        viewMat, projectMat, skin, sam2DCount,
        camPos, time,
        normalRange,
        normalflowDir,texflowDir,
        shallowColor, deepColor, waterDeep, waterHeight,
        waterUnderFadeDist
    ], [out_position,to_uv,to_worldPos,to_projPos,to_ref],
    ps_main_water,[out_color]
);

Build("Water2D",["water","2D"],
    vs_main,[
        worldMat,viewMat,projectMat,waterTop,time,
        waterViewMat,waterProjectMat
    ],[out_position,to_uv,to_projPos],
    ps_main,[out_color]
);

function ProjToScreenPos(_pos : CVec4) : CVec4
{
    var sPos : CVec4 = V4MulFloat(_pos, 0.5);               // [-w/2, w/2]
    sPos.xy = V2AddV2(sPos.xy, new CVec2(sPos.w, sPos.w));  // [0, w]
    sPos.z = _pos.z;
    sPos.w = _pos.w;
    return sPos;
}

function vs_main_water(f3_ver : Vertex3, f2_uv : UV2, f3_ref : TexOff3)
{
    BranchBegin("codi","C",[texCodi]);
    to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);
    BranchDefault();
    to_uv.xy=f2_uv;
    BranchEnd();

    to_ref = f3_ref;

    var wMat : CMat;
    BranchBegin("worldType","WT",[worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();

    var P : CVec4 = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, wMat);
    to_worldPos = P;

    P = V4MulMatCoordi(P, viewMat);
    P = V4MulMatCoordi(P, projectMat);
    out_position=P;
    to_projPos = ProjToScreenPos(out_position);
}

function Remap(_val : number, _min1 : number, _max1 : number, _min2 : number, _max2 : number) : number
{
    return _min2 + (_val - _min1) / (_max1 - _min1) * (_max2 - _min2);
}

// 노말맵 2개 사용하는 버전(성능 가장 좋음)
function NormalFlow(_uv : CVec2, _timedWindDir : CVec2) : CVec3
{
    //var waveIntensity : CVec4 = new CVec4(3.0, 2.0, 10.0, 10.0);
    var waveIntensity : CVec4 = new CVec4(3.0, 2.0, 1.5, 1.0);

    var animSpeed : number = 0.5;

    var texCoordA : CVec3 = new CVec3(_uv.x * 1.6 + _timedWindDir.x * 0.16, _uv.y * 1.6 + _timedWindDir.y * 0.16, time * animSpeed * 1.0);
    var texCoordB : CVec3 = new CVec3(_uv.x * 0.8 + _timedWindDir.x * 0.04, _uv.y * 0.8 + _timedWindDir.y * 0.04, time * animSpeed * 0.8);
    var texCoordC : CVec3 = new CVec3(_uv.x * 0.5 + _timedWindDir.x * 0.01, _uv.y * 0.5 + _timedWindDir.y * 0.01, time * animSpeed * 0.5);
    // var texCoordD : CVec3 = new CVec3(_uv.x * 0.3 + _timedWindDir.x * 0.008, _uv.y * 0.3 + _timedWindDir.y * 0.008, time * animSpeed * 0.3);

    var normal : CVec3 = new CVec3(0.0, 1.0, 0.0);
    var tempNormal : CVec3;
    tempNormal = NoiseNormalGet(texCoordA, SDF.eNoise.PerlinNormal);
    tempNormal = new CVec3(tempNormal.x*waterHeight/10.0,tempNormal.y,tempNormal.z*waterHeight/10.0);
    normal = V3AddV3(normal, V3MulFloat(tempNormal, waveIntensity.x));

    tempNormal = NoiseNormalGet(texCoordB, SDF.eNoise.PerlinNormal);
    tempNormal = new CVec3(tempNormal.x*waterHeight/10.0,tempNormal.y,tempNormal.z*waterHeight/10.0);
    normal = V3AddV3(normal, V3MulFloat(tempNormal, waveIntensity.y));

    tempNormal = NoiseNormalGet(texCoordC, SDF.eNoise.PerlinNormal);
    tempNormal = new CVec3(tempNormal.x*waterHeight/10.0,tempNormal.y,tempNormal.z*waterHeight/10.0);
    normal = V3AddV3(normal, V3MulFloat(tempNormal, waveIntensity.z));

    // tempNormal = NoiseNormalGet(texCoordD, SDF.eNoise.PerlinNormal);
    // tempNormal = new CVec3(tempNormal.x*waterHeight/10.0,tempNormal.y,tempNormal.z*waterHeight/10.0);
    // normal = V3AddV3(normal, V3MulFloat(tempNormal, waveIntensity.w));

    // normal.y = 1.0;
    // normal = V3Nor(V3Mix(new CVec3(0.0, 1.0, 0.0), normal, 0.5));

    normal = V3Nor(new CVec3(normal.x * normalRange, max(normal.y, 0.1), normal.z * normalRange));

    // var normal : CVec3 = NoiseNormalGet(new CVec3(V2AddV2(_uv, V2MulFloat(_timedWindDir, 0.1)), V2Len(_timedWindDir) * 0.3), SDF.eNoise.PerlinNormal);
    // normal = V3Nor(new CVec3(normal.x*waterHeight/10.0,normal.y,normal.z*waterHeight/10.0));

    return normal;
}

function ps_main_water()
{
    var to_screenUV : CVec3 = V3MulFloat(to_projPos.xyz, 1.0 / to_projPos.w);

    var world : CVec3 = V3MulFloat(to_worldPos.xyz, 1.0 / to_worldPos.w);
    var view : CVec3 = V3Nor(V3SubV3(camPos, world));

    // ---------------------------------------------------------
    // 노말 플로우
    // ---------------------------------------------------------
    var normalTS : CVec3 = new CVec3(0.0, 1.0, 0.0);
    var normalDist : CVec3 = new CVec3(0.0, 0.0, 0.0);
    if(V2Len(normalflowDir) > 0.0) {
        normalTS = NormalFlow(to_uv, V2MulFloat(new CVec2(-normalflowDir.x, normalflowDir.y), time));

        // 화면에서 멀수록 픽셀 수가 적어지는데 움직이는 정도는 같아서 줄여줌
        var deltaDist : number = max(0.0, V3Len(V3SubV3(camPos, world)) - 6000.0);  // 카메라 거리 - 최대 가시거리 / 2
        var fallOff : number = 1.0 / (1.0 + deltaDist * 10.0 / 6000.0);             // 선형적인 감소 피하기 위해 1 / 1 + a로 계산
        normalDist = V3MulFloat(normalTS, 0.1 * V2Len(normalflowDir) * to_screenUV.z * fallOff);
        // to_screenUV.z를 여기에 곱해주면 화면이 매우 가까울 때의 아티팩트를 해결할 수 있다고 하는데 잘 모르겠음
    }
    var normalWS : CVec3 = normalTS;

    // ---------------------------------------------------------
    // UV 애니메이션
    // ---------------------------------------------------------
    var screenUV : CVec2 = V2AddV2(to_screenUV.xy, new CVec2(normalDist.x, normalDist.z));
    var uv : CVec2 = V2AddV2(to_uv, new CVec2(normalDist.x, normalDist.z));
    var uvw : CVec3;

    // ---------------------------------------------------------
    // 굴절 색상
    // ---------------------------------------------------------
    var refractColor : CVec4;
    var refractType : number = -1.0;    // 0 : 물 텍스쳐, 1 : 랜더타겟, 2 : shallowColor

    // 1. 물 텍스쳐
    BranchBegin("UseWaterTex","UseWaterTex",[]);
    uv = V2AddV2(to_uv, V2MulFloat(new CVec2(-texflowDir.x, texflowDir.y), time * 0.03));
    uv = V2Mod(uv, 1.0);
    refractColor = Sam2D0ToColor(uv);
    refractType = 0.0;
    BranchEnd();

    // 2. refractor 랜더타겟
    BranchBegin("UseRefractTex","UseRefractTex",[refractMap]);
    refractColor = Sam2DToColor(refractMap, screenUV);
    refractType = 1.0;
    BranchEnd();
    
    // 3. shallowColor 사용
    if(refractType < -0.5) {
        refractColor = new CVec4(shallowColor, 1.0);
        var dist : number = V3Len(V3SubV3(camPos, world));
        var distanceBlend : number = 1.0 - SaturateFloat(Remap(dist, waterUnderFadeDist.x, waterUnderFadeDist.y, 0.0, 0.8));
        refractColor.rgb = V3Mix(deepColor, refractColor.rgb, distanceBlend);
        refractType = 2.0;
    }

    // ---------------------------------------------------------
    // 반사 색상
    // ---------------------------------------------------------
    var reflectColor : CVec4;
    var reflectType : number = -1.0;    // 0 : 큐브 텍스쳐, 1 : 랜더타겟, 2 : deepColor

    // 1. cubemap 사용
    BranchBegin("UseCubeTex","UseCubeTex",[reflectMap]);
    // uvw = CorrectedReflect(V3MulFloat(view, -1.0), new CVec3(0.0, 1.0, 0.0), cubeMapPos, cubeMapSize);
    uvw = reflect(V3MulFloat(view, -1.0), new CVec3(0.0, 1.0, 0.0));
    uvw = V3AddV3(uvw, new CVec3(normalDist.x, normalDist.y * 0.2, normalDist.z));
    reflectColor = SamCubeToColor(reflectMap, uvw);
    reflectColor.rgb = V3Pow(reflectColor.rgb, 1.0 / 2.2);  // ??
    reflectType = 0.0;
    BranchEnd();
    
    // 2. reflector 랜더타겟
    BranchBegin("UseWaterReflect","UseWaterReflect",[reflectMap]);
    reflectColor = Sam2DToColor(reflectMap, new CVec2(1.0 - screenUV.x, screenUV.y));
    reflectColor.rgb = V3MulV3(reflectColor.rgb, new CVec3(0.9, 0.95, 1.0));    //  물 색상 조금 섞어줌(반사 색상 좀 이상한 경우 많아서 넣음)
    reflectType = 1.0;
    BranchEnd();

    // 3. 반사 색상 없음
    if(reflectType < -0.5) {
        reflectType = 2.0;
    }

    // ---------------------------------------------------------
    // 그림자
    // ---------------------------------------------------------
    var shadowTex : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
    var shadow : number=-1.0;

    BranchBegin("shadow","S",[shadowOn]);
    if(shadowOn>0.5)
    {
        shadowTex = Sam2DToColor(shadowOn, screenUV);  // <- 여기! 절대 size 곱하지 말기
        shadow = shadowTex.x;
    }
    BranchEnd();

    // ---------------------------------------------------------
    // 반사 + 굴절 합성
    // ---------------------------------------------------------
    var L_cor : CVec4;
    var dotRes : number = clamp(V3Dot(view, normalWS), 0.0, 1.0);
    var fresnel : number = 0.02 + 0.98 * pow(1.0 - clamp(dotRes, 0.0, 1.0), 5.0);

    //var facingWeight : number = clamp(dotRes * 10.0, 0.0, 1.0);  // 반대쪽 면은 굴절만 나오도록 적용, 반대쪽면과 붙어있는 부분 조금 제거
    var facingWeight : number = smoothstep(0.0, 0.15, dotRes);
    fresnel *= facingWeight;

    // 반사 색상이 없음
    if(reflectType > 1.5) {
        L_cor = new CVec4(refractColor.rgb, 1.0);
    }
    
    // 반사 색상이 존재함
    else {
        L_cor = new CVec4(V3Mix(refractColor.rgb, reflectColor.rgb, fresnel), 1.0);
    }

    // ---------------------------------------------------------
    // 라이팅
    // ---------------------------------------------------------
    var dseMat : CMat3;
    var lmaterial : CVec4=new CVec4(1.0,1.0,1.0,1.0);
    BranchBegin("light","L",[ligDir,ligCol,ligCount,material,camPos,ligStep0,ligStep1,ligStep2,ligStep3,envCube,ambientColor]);
    lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    dseMat = LightCac3D(camPos, to_worldPos, reflectColor, normalWS, shadow, lmaterial.y, lmaterial.x, lmaterial.z, new CVec3(0.0, 0.0, 0.0));
    L_cor.rgb = V3AddV3(L_cor.rgb, dseMat[1]);    // 반사만 적용
    if(shadow > -0.5) { // 그림자
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow);
    }
    BranchEnd();

    // ---------------------------------------------------------
    // 컬러 모델 합성
    // ---------------------------------------------------------
    BranchBegin("colorModel","CM",[colorModel]);
    L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
    BranchEnd();

    out_color = L_cor;
}




function vs_main(f3_ver : Vertex3,f2_uv : UV2)
{
    to_uv.xy=f2_uv;
    var P : CVec4 = new CVec4(f3_ver, 1.0);
    var wMat : CMat;
    BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
    wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
    BranchDefault();
    wMat=worldMat;
    BranchEnd();
    
    P = V4MulMatCoordi(P, wMat);
    P=V4MulMatCoordi(P,viewMat);
    out_position=V4MulMatCoordi(P, projectMat);
    to_projPos = ProjToScreenPos(out_position);
    P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, wMat);
    P=V4MulMatCoordi(P,waterViewMat);
    P=V4MulMatCoordi(P,waterProjectMat);

    to_projPos = ProjToScreenPos(P);
}
function ps_main()
{
   
    // 화면 UV (0~1 가정)
    var uv : CVec2 = new CVec2(to_projPos.x / to_projPos.w, to_projPos.y / to_projPos.w);
    // uv.x*=0.5;
    // uv.y*=0.5;

    // var L_cor : CVec4 = Sam2DToColor(0.0, uv);
    // out_color = L_cor;

    // 물 사각형의 세로 스케일(uv.y 변화량 / to_uv.y 변화량)
    var scaleY : number = dFdy(uv.y) / dFdy(to_uv.y);

    // to_uv.y=0 위치의 screen y, to_uv.y=1 위치의 screen y
    var y0 : number = uv.y - to_uv.y * scaleY;
    var y1 : number = y0 + scaleY;

    // 물 "윗변"
    var waterTopY : number;
    if(waterTop < 0.0) waterTopY = max(y0, y1);
    else               waterTopY = min(y0, y1);

    // 수면(윗변) 기준 미러
    var srcUV : CVec2 = new CVec2(uv.x, 2.0 * waterTopY - uv.y);
   
    // "경계에서 아래로" 진행되는 v 값 만들기
    // waterTop 부호에 따라 위쪽이 to_uv.y=0 또는 1일 수 있어서 보정
    var vFromTop : number;
    if(waterTop < 0.0) vFromTop = 1.0 - to_uv.y;
    else               vFromTop = to_uv.y;

    // 0~0.1 사이에서 0->1로 커지는 페이드
    var startV : number = 0.05;
    var fade : number = vFromTop / max(startV, 1e-6);
    fade = min(max(fade, 0.0), 1.0);

    // 더 "점진적"으로 만들고 싶으면(선택): 부드러운 곡선
    // (smoothstep이 있으면 fade = smoothstep(0.0, 1.0, fade)로 바꿔도 됨)
    fade = fade * fade * (3.0 - 2.0 * fade);

    // 노이즈
    var noise : number = NoiseGet(new CVec3(to_uv.x, to_uv.y+time*0.1, time), SDF.eNoise.PerlinFBM);

    // 만약 NoiseGet이 0~1 이면 흔들림이 한쪽으로만 밀림 -> 아래 한 줄 켜
    noise = noise * 2.0 - 1.0;

    // 기존 0.005 강도에 fade만 곱해주기
    srcUV.x += noise * (0.005 * fade);

    var L_cor : CVec4 = Sam2DToColor(0.0, srcUV);


    // noise = NoiseGet(new CVec3(uv.x+time*0.1, uv.y+time*0.1, time), SDF.eNoise.Voronoi);
    // if(noise>0.9)
    // {
    //     L_cor.rgb=V3Mix(L_cor.rgb,new CVec3(0.8,0.8,0.8),1.0);
    // }
    //L_cor.rgb=new CVec3(noise,noise,noise);

    out_color = L_cor;
}
