import { CAModelCac, GetTexCodiedUV } from "../../artgine/z_file/ColorFun";
import { ambientColor, envCube, GetMaterial, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "../../artgine/z_file/Light";
import { NoiseFBM } from "../../artgine/z_file/Noise";
import { abs, Attribute, BranchBegin, BranchDefault, BranchEnd, Build, CMat, CMat3, cos, CVec2, CVec3, CVec4, dFdx, dFdy, MappingTexToV3, MatTypeToMat, max, min, mix, mod, Normal3, Null, OutColor, OutPosition, pow, reflect, Sam2D0ToColor, Sam2DMat, Sam2DToColor, SamCubeToColor, SaturateFloat, sign, sin, TexOff3, ToV2, ToV3, ToV4, TransposeMat3, UV2, V2AddV2, V2Dot, V2Len, V2Mod, V2MulFloat, V2MulV2, V2Nor, V2SubV2, V3AddV3, V3Cross, V3Dot, V3Mix, V3MulFloat, V3Nor, V3SubV3, V3ToMat3, V4Mix, V4MulFloat, V4MulMatCoordi, Vertex3 } from "../../artgine/z_file/Shader";

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
var material: CVec4 = new CVec4(0.0,0.0,0.0,1.0);

var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();

var texCodi : CVec4=Null();

var skin : number=Null();
var weightArrMat: Sam2DMat = new Sam2DMat(11,10);
var weightBakeMat: number = 9.0;
var weightBakeIndex : number;

var camPos: CVec3=Null();
var time : number = Attribute(0,"time");
var sam2DCount : number=Null();

var reflectMap : number = 1.0;
var refractMap : number = 2.0;
var normal0Map : number = 3.0;
var normal1Map : number = 4.0;


var normalflowDir : CVec2 = new CVec2(1.0, 0.0);
var normalRange : number = 1.0;

var texflowDir : CVec2 = new CVec2(1.0, 0.0);

//water
Build("3DWater", ["water"], 
    vs_main_water, [
        worldMat,
        viewMat, projectMat, skin, sam2DCount,
        camPos, time,
        reflectMap, refractMap, normal0Map, normal1Map,
        normalRange,
        normalflowDir,texflowDir
    ], [out_position,to_uv,to_worldPos,to_projPos,to_ref],
    ps_main_water,[out_color]
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

// 노말맵 2개 사용하는 버전(성능 가장 좋음)
function NormalFlow(_flow : CVec3) : CVec3
{
    var halfCycle : number = 0.075;
    var cycle : number = halfCycle * 2.0;

    var normalColor : CVec4 = V4Mix(
        Sam2DToColor(normal0Map, V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z, cycle)))),
        Sam2DToColor(normal1Map, V2AddV2(V2MulV2(to_uv, new CVec2(1.2, 0.8)), V2MulFloat(_flow.xy, mod(_flow.z + halfCycle, cycle)))),
        abs((mod(_flow.z, cycle) / cycle - 0.5) * 2.0)
    );
    return V3Nor(new CVec3(normalColor.r * 2.0 - 1.0, normalColor.b, normalColor.g * 2.0 - 1.0));
}
// 노말맵 사용하지 않고 절차적으로 생성
function ProceduralFlowNormal(_flow : CVec3) : CVec3
{
    var halfCycle : number = 0.075;
    var cycle : number = halfCycle * 2.0;

    var uv0 : CVec2 = V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z, cycle)));
    var uv1 : CVec2 = V2AddV2(to_uv, V2MulFloat(_flow.xy, mod(_flow.z + halfCycle, cycle)));

    // 결과에 핵심적인 파라미터
    var freq : number = 40.0;
    var amp : number = 20.0;

    var h0 : number = amp * NoiseFBM(new CVec3(V2MulFloat(uv0, freq), 0.0), 0.5);
    var h1 : number = amp * NoiseFBM(new CVec3(V2MulFloat(uv1, freq), 0.0), 0.5);

    var normal0 : CVec3 = V3Nor(new CVec3(dFdx(h0), 1.0, dFdy(h0)));
    var normal1 : CVec3 = V3Nor(new CVec3(dFdx(h1), 1.0, dFdy(h1)));

    return V3Nor(V3Mix(normal0, normal1,abs((mod(_flow.z, cycle) / cycle - 0.5) * 2.0)));
}

function ps_main_water()
{
    var to_screenUV : CVec3 = V3MulFloat(to_projPos.xyz, 1.0 / to_projPos.w);

    var world : CVec3 = V3MulFloat(to_worldPos.xyz, 1.0 / to_worldPos.w);
    var view : CVec3 = V3Nor(V3SubV3(camPos, world));

    var flowLen : number = V2Len(normalflowDir);
    var flow : CVec3 = new CVec3(-normalflowDir.x / max(flowLen, 1e-6), normalflowDir.y / max(flowLen, 1e-6), flowLen * time * 0.03);

    // 노말 플로우
    var normalTS : CVec3 = new CVec3(0.0, 1.0, 0.0);
    BranchBegin("normalMap","N0",[]);
    normalTS = V3Mix(new CVec3(0.0, 1.0, 0.0), NormalFlow(flow), sign(flowLen));
    BranchDefault();
    normalTS = V3Mix(new CVec3(0.0, 1.0, 0.0), ProceduralFlowNormal(flow), sign(flowLen));
    BranchEnd();
    var normalWS : CVec3 = V3Nor(new CVec3(normalTS.x * normalRange, max(normalTS.y * 0.72, 0.18), normalTS.z * normalRange));

    // normal에 따른 uv 변환
    var normalUV : CVec2 = V2MulFloat(new CVec2(normalWS.x, normalWS.z), 0.1 * flowLen);
    var screenUV : CVec2 = V2AddV2(to_screenUV.xy, normalUV);
    var uv : CVec2 = V2AddV2(to_uv, normalUV);

    var refractColor : CVec4;
    BranchBegin("UseWaterTex","UseWaterTex",[]);
    flowLen = V2Len(texflowDir);
    flow = new CVec3(-texflowDir.x / max(flowLen, 1e-6), texflowDir.y / max(flowLen, 1e-6), flowLen * time * 0.03);
    uv = V2AddV2(uv, V2MulFloat(flow.xy, flow.z));
    uv = V2Mod(uv, 1.0);
    refractColor = Sam2D0ToColor(uv);
    BranchDefault();
    refractColor = Sam2DToColor(refractMap, screenUV);
    // refractColor.xyz=V3Mix(deepColor,refractColor.xyz,refractColor.a);
    BranchEnd();

    var L_cor : CVec4;
    var reflectColor : CVec3;
    BranchBegin("UseWaterReflect","UseWaterReflect",[]);
    reflectColor = Sam2DToColor(reflectMap, new CVec2(1.0 - screenUV.x, screenUV.y)).rgb;
    L_cor = new CVec4(V3Mix(refractColor.xyz, reflectColor, mix(pow(1.0 - max(V3Dot(view, normalWS), 0.0), 5.0), 1.0, 0.02)), 1.0);
    BranchDefault();
    L_cor = new CVec4(refractColor.xyz, 1.0);
    BranchEnd();

    // 컬러 그레이딩
    BranchBegin("CAModel","CA",[colorModel,alphaModel]);
    L_cor = CAModelCac(L_cor,colorModel,alphaModel);
    BranchEnd();

    // 라이팅
    var dseMat : CMat3;
    var lmaterial : CVec4=new CVec4(1.0,1.0,1.0,1.0);
    var ambient : CVec3 = new CVec3(0.0, 0.0, 0.0);
    var shadow : number = -1.0;
    BranchBegin("light","L",[ligDir,ligCol,ligCount,material,camPos,ligStep0,ligStep1,ligStep2,ligStep3,envCube,ambientColor]);
    lmaterial = GetMaterial(material, Sam2DToColor(to_ref.z, uv), sam2DCount);
    dseMat = LightCac3D(camPos, to_worldPos, L_cor, normalWS, shadow, lmaterial.y, lmaterial.x, lmaterial.z, ambient);
    L_cor.rgb = V3AddV3(dseMat[0], dseMat[1]);
    BranchEnd();

    out_color = L_cor;
}
