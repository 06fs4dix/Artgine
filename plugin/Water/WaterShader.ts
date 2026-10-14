import {  AlphaModalFun, ColorModalFun, GetTexCodiedUV } from "../../artgine/z_file/ColorFun";
import { ambientColor, envCount, GetMaterial, GetSunInfo, ligCol, ligCount, ligDir, LightCac3D, ligMask, ligStep0, ligStep1, ligStep2, ligStep3, cullMask, sam2DCount, samCubeCount, envPos } from "../../artgine/z_file/Light";
import { NoiseGet, NoiseNormalGet } from "../../artgine/z_file/Noise";
import { SDF } from "../../artgine/z_file/SDF";

import { 
    Attribute, BranchBegin, BranchDefault, BranchEnd, Build, clamp, CMat, CMat3, CVec2, CVec3, CVec4, dFdy, 
    MatTypeToMat, max, min, Null, OutColor, OutPosition, pow, reflect, 
    abs, floor, sin, fract, step, Sam2DArrToV4, Sam2DArrV4, Sam2DToColor, SamCubeToColor, SaturateFloat, smoothstep, TexOff3, ToV2, ToV3, ToV4, UV2, V2AddV2,
    V2Len, V2MulFloat, V3AddV3, V3Dot, V3Len, V3Mix,
    V3MulFloat, V3MulV3, V3Nor, V3Pow, V3SubV3, V3Sqrt, SaturateV3, V4MulFloat, V4MulMatCoordi, Vertex2, Vertex3
} from "../../artgine/z_file/Shader";
import { shadowOn } from "../../artgine/z_file/Shadow";

// out
var out_position : OutPosition=Null();
var out_color : OutColor=Null();

// varying
var to_uv : ToV2=Null();
//x:그 열의 수면 화면y, y:바닥 화면y, z:기준선(anchorY) 화면y. 반사 렌더타겟 좌표계
var to_edge : ToV3=Null();
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

var reflectMap : number = 1.0;
var refractMap : number = 2.0;
var normal1Map : number = 3.0;
var normal2Map : number = 4.0;

var normalflowDir : CVec2 = new CVec2(0.0, 0.0);
var normalRange : number = 1.0;

var texflowDir : CVec2 = new CVec2(1.0, 0.0);
var shallowColor : CVec3 = new CVec3(0.0,0.0,0.0);
var deepColor    : CVec3 = new CVec3(0.0,0.1,0.5);
var waterDeep : CVec4 = new CVec4(0.0,256.0,5.0,0.0);
var waterUnderFadeDist : CVec2 = new CVec2(2000.0, 3000.0);

var waterHeight : number = 1.0;

var waterTop : number=-1.0;

var waterTint : number = 0.35;
var wobble : number = 0.005;
var reflectRange : CVec2 = new CVec2(0.25, 0.85);
var reflectivity : number = 1.0;
//1이면 1:1 미러. 낮출수록 반사가 세로로 눌려 가까운 것만 비친다
var reflectScale : number = 1.0;

//미러 기준선. anchorY는 물에서 가장 높은 수면(로컬 좌표).
//reflectAnchor 0 = 전부 anchorY 기준(완전한 거울), 1 = 그 열의 수면 기준(물가에 정렬)
var anchorY : number = 0.0;
var reflectAnchor : number = 1.0;

//CPaintTrail이 채워주는 정점 배열. 짝수 인덱스=윗변, 홀수=아랫변, w=가로 진행도
var trailPos : Sam2DArrV4 = new Sam2DArrV4(1);
var lastHide : number = Null();

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
        waterViewMat,waterProjectMat,trailPos,lastHide,
        shallowColor,deepColor,waterTint,wobble,reflectRange,reflectivity,reflectScale,
        anchorY,reflectAnchor
    ],[out_position,to_uv,to_projPos,to_edge],
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

        var dist : number = V3Len(V3SubV3(camPos, world));
        var deltaDist : number = max(0.0, dist - 6000.0);
        var fallOff : number = 1.0 / (1.0 + deltaDist * 10.0 / 6000.0);
        normalDist = V3MulFloat(normalTS, 0.1 * V2Len(normalflowDir) * fallOff);
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
    // 굴절 패스가 알파에 실어준 수면 아래 깊이. 0~1 = 0~waterDeep.z*4, -1 = 정보 없음
    var contactDepth : number = -1.0;
    // 굴절색이 물색(shallowColor/deepColor) 그대로인지. 조명 안 받는 고정색이라 라이팅에서 밝기를 곱한다
    var bodyColor : number = 0.0;

    // 1. 물 텍스쳐
    BranchBegin("UseWaterTex","UseWaterTex",[]);
    uv = V2AddV2(uv, V2MulFloat(new CVec2(-texflowDir.x, texflowDir.y), time * 0.03));
    refractColor = Sam2DToColor(0.0, uv);
    refractType = 0.0;
    BranchEnd();

    // 2. refractor 랜더타겟
    BranchBegin("UseRefractTex","UseRefractTex",[refractMap]);
    refractColor = Sam2DToColor(refractMap, screenUV);
    if(refractColor.w > 0.75) {
        contactDepth = SaturateFloat((refractColor.w - 0.8) / 0.2);
        contactDepth = contactDepth * contactDepth;
    }
    if(refractColor.w < 0.75) {
        refractColor = new CVec4(shallowColor, 1.0);
        refractColor.rgb = V3Mix(deepColor, refractColor.rgb,1.0 - SaturateFloat(Remap(V3Len(V3SubV3(camPos, world)), waterUnderFadeDist.x, waterUnderFadeDist.y, 0.0, 0.8)));
        bodyColor = 1.0;
    }
    refractType = 1.0;
    BranchEnd();
    
    // 3. shallowColor 사용
    if(refractType < -0.5) {
        refractColor = new CVec4(shallowColor, 1.0);
        var distanceBlend : number = 1.0 - SaturateFloat(Remap(V3Len(V3SubV3(camPos, world)), waterUnderFadeDist.x, waterUnderFadeDist.y, 0.0, 0.8));
        refractColor.rgb = V3Mix(deepColor, refractColor.rgb, distanceBlend);
        refractType = 2.0;
        bodyColor = 1.0;
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
    var shadow : CVec4 = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow","S",[shadowOn]);
    if(shadowOn>0.5)
    {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, screenUV);  // <- 여기! 절대 size 곱하지 말기
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
    // 물색·거품에 곱할 밝기(감마 공간). 굴절 패스(3D.ts·Terrain.ts WaterProcessing)와 같은 식
    var waterLit : CVec3 = new CVec3(1.0, 1.0, 1.0);
    BranchBegin("light","L",[ligDir,ligCol,ligMask,ligCount,camPos,material,cullMask,ligStep0,ligStep1,ligStep2,ligStep3,ambientColor,envCount,envPos,sam2DCount,samCubeCount]);
    dseMat = GetSunInfo();
    waterLit = V3Sqrt(SaturateV3(V3AddV3(ambientColor, dseMat[1])));
    if(bodyColor > 0.5) {
        if(reflectType > 1.5)
            L_cor.rgb = V3MulV3(refractColor.rgb, waterLit);
        else
            L_cor.rgb = V3Mix(V3MulV3(refractColor.rgb, waterLit), reflectColor.rgb, fresnel);
    }
    lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    dseMat = LightCac3D(to_worldPos, reflectColor, normalWS, shadow, cullMask.x, camPos, lmaterial.y, lmaterial.x, lmaterial.z, -1.0);
    L_cor.rgb = V3AddV3(L_cor.rgb, dseMat[1]);
    if(shadow.a > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.a);
    }
    BranchEnd();

    // ---------------------------------------------------------
    // 접촉 거품
    // ---------------------------------------------------------
    if(contactDepth > -0.5) {
        var cn : number = NoiseGet(new CVec3(world.x / 80.0, world.z / 80.0, time * 0.2), SDF.eNoise.PerlinFBM);
        var breakN : number = NoiseGet(new CVec3(world.x / 250.0 + time * 0.03, world.z / 250.0, time * 0.1), SDF.eNoise.Perlin);
        var bubble : number = NoiseGet(new CVec3(world.x / 25.0, world.z / 25.0, time * 0.4), SDF.eNoise.PerlinFBM);
        // 멀리서 노이즈 주기가 픽셀보다 작아지면 깜빡이므로, 픽셀 크기(거리 기반 근사)에 맞춰 평균값으로 흐리고 경계를 넓힌다
        var pixW : number = V3Len(V3SubV3(camPos, world)) * 0.0012;
        var lodB : number = SaturateFloat(pixW / 12.0);
        var lodC : number = SaturateFloat(pixW / 40.0);
        bubble = bubble + (0.45 - bubble) * lodB;
        cn = cn + (0.45 - cn) * lodC;
        var aaD : number = pixW / (max(waterDeep.z, 1.0) * 4.0);
        var aaS : number = 0.15 * lodB;
        // 물결 세기. NormalFlow(1,0)일 때 약 0.67
        var waveK : number = SaturateFloat(V2Len(normalflowDir) / 1.5);
        var near : number = 1.0 - smoothstep(0.0, 0.2 + 0.45 * waveK, contactDepth);
        var core : number = 1.0 - smoothstep(0.0, (0.05 + 0.12 * cn) * (0.4 + 0.9 * waveK), contactDepth);
        // 충돌 물보라: 접촉면에서 터져 바깥으로 퍼지며 옅어진다. 위치마다 주기 위상이 달라 한꺼번에 터지지 않는다
        var splashRange : number = 0.2 + 0.45 * waveK;
        var cycle : number = fract(time * (0.15 + 0.25 * waveK) + breakN * 1.5);
        var front : number = cycle * splashRange;
        var frontW : number = (0.03 + 0.04 * cn) * (1.0 + 2.0 * cycle) + aaD * 2.0;
        var frontFoam : number = 1.0 - smoothstep(0.0, frontW, abs(contactDepth - front));
        var trail : number = (1.0 - smoothstep(0.0, 0.12, front - contactDepth)) * step(contactDepth, front) * 0.45;
        var splash : number = max(frontFoam, trail) * (1.0 - smoothstep(0.3, 1.0, cycle));
        splash *= smoothstep(0.4 + 0.2 * cycle - aaS, 0.65 + 0.2 * cycle + aaS, bubble * 0.7 + cn * 0.3);
        // 테두리도 물보라와 같은 조각 패턴을 쓰되, 접촉면에 가까울수록 문턱을 낮춰 빽빽하게 채운다
        var coreRange : number = (0.05 + 0.12 * cn) * (0.4 + 0.9 * waveK);
        var coreT : number = SaturateFloat(contactDepth / max(coreRange, 0.001));
        var corePatch : number = smoothstep(0.1 + 0.3 * coreT - aaS, 0.35 + 0.3 * coreT + aaS, bubble * 0.7 + cn * 0.3);
        // 패턴 구멍으로 아래 오브젝트가 비치지 않게 접촉선은 항상 채운다
        var contactLine : number = 1.0 - smoothstep(0.0, 0.015 + aaD * 2.0, contactDepth);
        var coreFoam : number = max(contactLine, core * corePatch);
        var contactFoam : number = max(coreFoam, splash);
        L_cor.rgb = V3Mix(L_cor.rgb, V3MulV3(new CVec3(0.9, 0.95, 0.95), waterLit), SaturateFloat(contactFoam) * 0.6 * smoothstep(0.0, 0.6, waveK) * (1.0 - 0.4 * SaturateFloat(pixW / 30.0)));
    }

    // ---------------------------------------------------------
    // 컬러 모델 합성
    // ---------------------------------------------------------
    BranchBegin("colorModel","CM",[colorModel]);
    L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
    BranchEnd();

    BranchBegin("alphaModel","AM",[alphaModel]);
    L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
    BranchEnd();

    out_color = L_cor;
}




//반사 렌더타겟(WaterCam) 기준 화면 y
function ToWaterScreenY(_x : number, _y : number, _wMat : CMat) : number
{
    var P : CVec4 = new CVec4(_x, _y, 0.0, 1.0);
    P = V4MulMatCoordi(P, _wMat);
    P = V4MulMatCoordi(P, waterViewMat);
    P = V4MulMatCoordi(P, waterProjectMat);
    var S : CVec4 = ProjToScreenPos(P);
    return S.y / S.w;
}

function vs_main(f2_ver : Vertex2)
{
    //f2_ver.x = trailPos 인덱스, f2_ver.y = +1 윗변 / -1 아랫변
    //한 열은 [윗변, 아랫변] 두 정점이라 열의 시작 인덱스는 짝수로 내림한 값
    var idx : number = f2_ver.x;
    var colUp : number = floor(idx * 0.5) * 2.0;

    var tpos : CVec4 = Sam2DArrToV4(trailPos, idx);
    var upos : CVec4 = Sam2DArrToV4(trailPos, colUp);
    var dpos : CVec4 = Sam2DArrToV4(trailPos, colUp + 1.0);

    to_uv.xy = new CVec2(1.0 - tpos.w, (f2_ver.y + 1.0) * 0.5);

    var wMat : CMat;
    BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
    wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
    BranchDefault();
    wMat=worldMat;
    BranchEnd();

    //z는 좌표가 아니라 미러/깊이 기준선을 실어나른다. 위치 계산에서는 0으로 쓴다
    var P : CVec4 = new CVec4(tpos.x, tpos.y, 0.0, 1.0);
    P = V4MulMatCoordi(P, wMat);

    var S : CVec4 = V4MulMatCoordi(P, viewMat);
    out_position = V4MulMatCoordi(S, projectMat);

    var Q : CVec4 = V4MulMatCoordi(P, waterViewMat);
    Q = V4MulMatCoordi(Q, waterProjectMat);
    to_projPos = ProjToScreenPos(Q);

    //수면/바닥 기준선. 외곽(정점 y)이 타일 경계로 계단지더라도 기준선은 z로 따로 받는다.
    //둘을 같은 값으로 쓰면 단차에서 미러 축이 한 칸씩 튀어 캐릭터 반사가 잘려 어긋난다
    to_edge.xyz = new CVec3(ToWaterScreenY(upos.x, upos.z, wMat),
                            ToWaterScreenY(dpos.x, dpos.z, wMat),
                            ToWaterScreenY(upos.x, anchorY, wMat));
}
function ps_main()
{
    // 반사 렌더타겟(WaterCam) 기준 화면 UV
    var uv : CVec2 = new CVec2(to_projPos.x / to_projPos.w, to_projPos.y / to_projPos.w);

    // 이 픽셀이 속한 열의 수면/바닥 (정점에서 그대로 실려온 값)
    var waterTopY : number = to_edge.x;
    var waterBottomY : number = to_edge.y;

    // 수면에서 아래로 진행되는 0~1 깊이
    var span : number = waterTopY - waterBottomY;
    var vFromTop : number = 0.0;
    if(abs(span) > 1e-6)
        vFromTop = (waterTopY - uv.y) / span;
    var depth : number = clamp(vFromTop, 0.0, 1.0);

    // 수면 경계에서 0 -> 1 로 커지는 페이드(경계선이 칼같이 끊기지 않게)
    var startV : number = 0.05;
    var fade : number = clamp(vFromTop / max(startV, 1e-6), 0.0, 1.0);
    fade = fade * fade * (3.0 - 2.0 * fade);

    // 노이즈 흔들림. 깊을수록(반사원이 멀수록) 강해진다
    var noise : number = NoiseGet(new CVec3(to_uv.x, to_uv.y + time * 0.1, time), SDF.eNoise.PerlinFBM);
    noise = noise * 2.0 - 1.0;
    var wob : number = noise * wobble * fade * (0.25 + depth);

    // 반사: 수면 기준 미러 / 바닥: 미러 없이 = 물 뒤에 실제로 그려져 있는 것
    // 미러 축. reflectAnchor 0이면 물 전체가 같은 기준선(anchorY)을 써서 기울어짐이 없고,
    // 1이면 그 열의 수면에 정확히 붙는다. 그 사이는 보정량을 비율로 먹인 것
    var reflAxis : number = to_edge.z + (waterTopY - to_edge.z) * reflectAnchor;
    var reflUV : CVec2 = new CVec2(uv.x + wob, reflAxis + (reflAxis - uv.y) * reflectScale);
    var floorUV : CVec2 = new CVec2(uv.x + wob * 0.5, uv.y);

    var reflColor : CVec4 = Sam2DToColor(0.0, reflUV);
    var floorColor : CVec4 = Sam2DToColor(0.0, floorUV);

    // 깊이에 따라 반사 -> 바닥
    var k : number = smoothstep(reflectRange.x, reflectRange.y, depth);

    // 미러 좌표가 렌더타겟 밖으로 나가면 반사원이 없으므로 바닥만 쓴다
    if(reflUV.y > 1.0) k = 1.0;
    if(reflUV.y < 0.0) k = 1.0;

    var reflAmount : number = clamp(reflectivity, 0.0, 1.0) * (1.0 - k);

    // 물색은 물 속을 통과한 빛(바닥)에만 흡수로 작용한다.
    // 수면 반사는 물 속을 통과하지 않으므로 틴트를 먹이지 않는다
    var tint : CVec3 = V3Mix(shallowColor, deepColor, depth);
    var throughColor : CVec3 = V3Mix(floorColor.rgb, tint, waterTint);

    var L_cor : CVec4 = new CVec4(V3Mix(throughColor, reflColor.rgb, reflAmount), 1.0);

    out_color = L_cor;
}
