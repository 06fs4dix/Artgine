import { 
	Binormal3, Build, CMat, CVec2, CVec3, CVec4, CMat3, OutColor, OutPosition,
	ToV2, ToV3, ToV4, Shadow2, Normal3, TexOff3, Tangent4, UV2, Vertex3, Weight4, WeightIndexI4, InverseMat3, 
	LWVPMul, discard, screenPos,  MappingV3ToTex,
	Mat4ToMat3, MatAdd, MatMul, FloatMulMat, TransposeMat3,
	Sam2DToColor, Sam2DToMat, Sam2DToV4, Sam2DMat, Sam2DSize, 
	V2SubV2, V2MulFloat, V2DivV2, 
	V3AddV3, V3Dot, V3Nor, V3MulFloat, V3MulMat3Normal, V3ToMat3,
	V4MulMatCoordi, 
	ParallaxNormal, FloatToInt, IntToFloat, MappingTexToV3, 
	BranchBegin,BranchEnd,BranchDefault,
	Attribute, Null,
	clamp,
	floor,
	mod,
} from "./Shader"
import {
	SDF
} from "./SDF";
import { 
	ColorModelCac, ColorVFX
} from "./ColorFun";
import {
	ambientColor,
	envCube,GetMaterial,ligCol,ligCount,ligDir,LightCac3D,ligStep0,ligStep1,ligStep2,ligStep3
} from "./Light";
import { ApplyWind, windCount, windDir, windInfluence, windInfo, windPos } from "./Wind";
import { 
	bias, calcShadow, dotCac, normalBias, PCF, shadowCount, shadowOn, 
	shadowBottomCasP1, shadowFarCasP0, shadowLeftCasV2, shadowNearCasV0, shadowRightCasP2, shadowTopCasV1, 
	shadowPointProj, shadowRate, shadowReadList, shadowWrite, texture16f 
} from "./Shadow";

//uniform
var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();

var skin : number=Null();
var parallaxNormal : number=Attribute(0,"canvas");
var sam2DCount : number=Null();
var material: CVec4 = new CVec4(0.0,0.0,0.0,1.0);

var alphaCut : number = 0.1;
var colorVFX : CMat=Null();

//mat
var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();

//varying
var to_uv : ToV2=Null();
var to_normal : ToV3=Null();
var to_binormal : ToV3=Null();
var to_tangent : ToV3=Null();
var to_ref : ToV3=Null();
var to_worldPos : ToV4=Null();
var to_viewPos : ToV4=Null();

//out
var out_position : OutPosition=Null();
var out_color : OutColor=Null();
var out_pos : OutColor=Null();
var out_nor : OutColor=Null();
var out_spc : OutColor=Null();

//non multitex uniform
var outputType : number=Null();

//lighting uniform
var camPos: CVec3=Null();

//depthmap
var depthMap : number = 0.0;
var screenResolution : CVec2=new CVec2(1.0, 1.0);

//LUT
var weightArrMat: Sam2DMat = new Sam2DMat(9);

var time : number = Attribute(0,"time");

//Skin
Build("3DSkin",[],
	vs_main,[worldMat,viewMat,projectMat,alphaCut,skin,weightArrMat,sam2DCount],
	[out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos], 
	ps_main,[out_color]
);
//Simple
Build("3DSimple",["simple"],
	vs_main_simple,[worldMat,viewMat,projectMat,colorModel,alphaModel,alphaCut],
	[out_position,to_uv],
	ps_main_simple,[out_color]
);

//gBuffer
Build("3DGBuffer", ["gBuf"], 
	vs_main_gBuffer, [
		worldMat,viewMat,projectMat,skin,weightArrMat,alphaCut,
		sam2DCount,material,outputType,
	], [out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos,to_viewPos],
	ps_main_gBuffer,[out_color]
);
//gBuffer MultiTex
Build("3DGBufferMulti", ["gBufMulti"], 
	vs_main_gBuffer, [
		worldMat,viewMat,projectMat,skin,weightArrMat,alphaCut,
		sam2DCount,material,
	], [out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos,to_viewPos],
	ps_main_gBuffer_multi,[out_color, out_pos, out_nor, out_spc]
);

//shadow
Build("3DShadowWrite", ["shadowWrite"], 
	vs_main_shadow_write, [
		worldMat,viewMat,projectMat,skin,weightArrMat,alphaCut,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,
		shadowCount,shadowPointProj,shadowReadList,
	], [out_position,to_uv,to_viewPos],
	ps_main_shadow_write,[out_color]
);

Build("3DShadowRead", ["shadowRead"], 
	vs_main_shadow_read, [
		worldMat,viewMat,projectMat,skin,weightArrMat,alphaCut,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,
		shadowCount,shadowPointProj,shadowReadList,
		shadowRate,PCF,texture16f,bias,normalBias,dotCac,
		ligDir,ligCol,ligCount,
	], [out_position,to_uv,to_normal,to_worldPos],
	ps_main_shadow_read,[out_color]
);

//baking
Build("3DBake", ["bake"], 
	vs_main_bake, [
		worldMat,viewMat,projectMat,skin,weightArrMat,alphaCut
	], [out_position,to_uv,to_normal,to_worldPos,to_tangent,to_binormal,to_ref],
	ps_main_bake,[out_color]
);

function vs_main_simple(f3_ver : Vertex3,f2_uv : UV2)
{
	to_uv=f2_uv;		
	out_position=LWVPMul(f3_ver,worldMat,viewMat,projectMat);
}
function ps_main_simple()
{
    var L_cor : CVec4=Sam2DToColor(0.0,to_uv);
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	if(L_cor.a <= alphaCut) 
		discard;
	out_color=L_cor;
}

function GetWorldWeightMat(_weightArrMat : Sam2DMat, _weight : CVec4, _weightIndex : CVec4, _worldMat : CMat, _skin : number) : CMat {
	var woweMat : CMat = _worldMat;

	if(_skin > 0.5 && _weight.x+_weight.y+_weight.z+_weight.w>0.0)
	{
		if(_skin < SDF.eSkin.Bone + 0.5 && _weightArrMat.x>0.0)
		{	
			var weightMat:CMat = FloatMulMat(_weight.x,Sam2DToMat(_weightArrMat,_weightIndex.x));
			weightMat = MatAdd(FloatMulMat(_weight.y,Sam2DToMat(_weightArrMat,_weightIndex.y)),weightMat);
			weightMat = MatAdd(FloatMulMat(_weight.z,Sam2DToMat(_weightArrMat,_weightIndex.z)),weightMat);
			weightMat = MatAdd(FloatMulMat(_weight.w,Sam2DToMat(_weightArrMat,_weightIndex.w)),weightMat);
			woweMat = MatMul(weightMat,woweMat);
		}
	}

	return woweMat;
}

// function GetParallaxMappedUV(_uv : CVec2, _tan : CVec3, _bi : CVec3, _nor : CVec3, _wor : CVec4, _camPos : CVec3, _texOff : CVec3) : CVec2 {
// 	var uv : CVec2 = _uv;
// 	if(parallaxNormal>0.0001)
// 	{
// 		var TBN : CMat3 = TransposeMat3(V3ToMat3(_tan, _bi, _nor));
// 		uv=ParallaxNormal(V3MulMat3Normal(_camPos,TBN).xyz,V3MulMat3Normal(_wor.xyz,TBN).xyz,_texOff.y,uv,parallaxNormal);
// 	}
// 	return uv;
// }
function GetParallaxMappedUV(_uv : CVec2, _tan : CVec3, _bi : CVec3, _nor : CVec3, _wor : CVec4, _camPos : CVec3, _texOff : CVec3) : CVec2 {
    var uv : CVec2 = _uv;
    if(parallaxNormal>0.0001) {
        var TBN : CMat3 = TransposeMat3(V3ToMat3(_tan, _bi, _nor));
        uv = ParallaxNormal(V3MulMat3Normal(_camPos,TBN).xyz, V3MulMat3Normal(_wor.xyz,TBN).xyz, _texOff.y, uv, parallaxNormal);

        // // clamp slightly inside to avoid sampling border texels (tweak epsilon if needed)
        // uv.x = clamp(uv.x, 0.0005, 0.9995);
        // uv.y = clamp(uv.y, 0.0005, 0.9995);
    }
    return uv;
}

function GetTangentSpaceNormal(_uv : CVec2, _tan : CVec3, _bi : CVec3, _nor : CVec3, _texOff : CVec3) : CVec3 {
	var N : CVec3 = _nor;
	if(to_ref.y>0.5)
	{
		var TBN : CMat3 = V3ToMat3(_tan, _bi, _nor);

		N=Sam2DToColor(to_ref.y,_uv).xyz;
		N=MappingTexToV3(N);
		N.y=-N.y;
		if(V3Dot(N,new CVec3(0,0,1))>0.999)
			N=_nor;
		else	
			N=V3Nor(V3MulMat3Normal(N,TBN).xyz);
	}
	return N;
}

function vs_main(f3_ver : Vertex3,f2_uv : UV2,f4_we: Weight4,f4_wi : WeightIndexI4,
	f3_nor : Normal3,f4_tan : Tangent4,f3_bi : Binormal3,f3_ref : TexOff3)
{
	to_uv=f2_uv;

	var woweMat : CMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);
	var P : CVec4 = new CVec4(f3_ver, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();
	
	to_worldPos=P;
	P=V4MulMatCoordi(P,viewMat);
	out_position=V4MulMatCoordi(P, projectMat);

	to_tangent=V3Nor(V3MulMat3Normal(f4_tan.xyz,Mat4ToMat3(woweMat)).xyz);
	to_binormal=V3Nor(V3MulMat3Normal(f3_bi,Mat4ToMat3(woweMat)).xyz);
	if(f3_ref.y > 0.0) {
		to_normal=V3Nor(V3MulMat3Normal(f3_nor,Mat4ToMat3(woweMat)).xyz);
	} else {
		to_normal = V3Nor(V3MulMat3Normal(f3_nor,TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
	}
		
	to_ref=f3_ref;
}

function vs_main_gBuffer(f3_ver : Vertex3, f2_uv : UV2, f4_wi  : WeightIndexI4, f4_we : Weight4, f3_nor : Normal3, f4_tan : Tangent4, f3_bi : Binormal3, f3_ref : TexOff3) {
	to_uv = f2_uv;
	to_ref = f3_ref;
	var woweMat : CMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);

	to_tangent=V3Nor(V3MulMat3Normal(f4_tan.xyz,Mat4ToMat3(woweMat)).xyz);
	to_binormal=V3Nor(V3MulMat3Normal(f3_bi,Mat4ToMat3(woweMat)).xyz);
	if(f3_ref.y > 0.0) {
		to_normal=V3Nor(V3MulMat3Normal(f3_nor,Mat4ToMat3(woweMat)).xyz);
	} else {
		to_normal = V3Nor(V3MulMat3Normal(f3_nor,TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
	}

	var P : CVec4 = new CVec4(f3_ver, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();
	
	to_worldPos=P;

	P = V4MulMatCoordi(P, viewMat);
	to_viewPos = P;

	out_position = V4MulMatCoordi(P, projectMat);
}

function vs_main_bake(f3_ver : Vertex3, f4_wi : WeightIndexI4, f4_we : Weight4, f2_uv : UV2, f2_sha : Shadow2, f3_nor : Normal3, f4_tan : Tangent4, f3_bi : Binormal3, f3_ref : TexOff3) {
	to_uv = f2_uv;

	var clip_space_pos : CVec2 = V2SubV2(V2MulFloat(f2_sha, 2.0), new CVec2(1.0, 1.0));
	out_position = new CVec4(clip_space_pos, 0.0, 1.0);

	var woweMat : CMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);
	var P : CVec4 = new CVec4(f3_ver, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	//P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();

	to_worldPos=P;
	to_tangent=V3Nor(V3MulMat3Normal(f4_tan.xyz,Mat4ToMat3(woweMat)).xyz);
	to_binormal=V3Nor(V3MulMat3Normal(f3_bi,Mat4ToMat3(woweMat)).xyz);
	if(f3_ref.y > 0.0) {
		to_normal=V3Nor(V3MulMat3Normal(f3_nor,Mat4ToMat3(woweMat)).xyz);
	} else {
		to_normal = V3Nor(V3MulMat3Normal(f3_nor,TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
	}
	
	to_ref=f3_ref;
}

function ps_main()
{
	var shadowTex : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
	var shadow : number=-1.0;
	var occlusion : number=1.5;
	var high : number;
	var low : number;
	BranchBegin("shadow","S",[shadowOn]);
	if(shadowOn>0.5)
	{
		shadowTex = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
		shadow = shadowTex.x;
		high = shadowTex.y * 255.0;
		low = shadowTex.z * 255.0;

		occlusion = (high * 256.0 + low) / 65535.0;
	}
	BranchEnd();

	BranchBegin("occlusion","O",[]);
	if(occlusion < 1.1) {
		if(screenPos.z > occlusion + 2e-5) discard;
	}
	BranchEnd();

	var uv : CVec2 = to_uv;
	BranchBegin("parallax","P",[parallaxNormal, camPos]);
	uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
	BranchEnd();

	var L_cor : CVec4=Sam2DToColor(to_ref.x, uv);

	BranchBegin("color","C",[colorModel,alphaModel]);
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	BranchEnd();

	BranchBegin("vfx","V",[colorVFX,time]);
	L_cor=ColorVFX(L_cor,uv,colorVFX,time);
	BranchEnd();

	if(L_cor.a < alphaCut) discard;

	var dseMat : CMat3=new CMat3(0);
	var lmaterial : CVec4=new CVec4(1.0,1.0,1.0,1.0);
	BranchBegin("light","L",[ligDir,ligCol,ligCount,camPos,material,ligStep0,ligStep1,ligStep2,ligStep3,envCube,ambientColor]);

	
	lmaterial=GetMaterial(material,Sam2DToColor(to_ref.z,uv),sam2DCount);

	dseMat = LightCac3D(camPos, to_worldPos, L_cor, GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref), shadow, 
		lmaterial.y, lmaterial.x, lmaterial.z, ambientColor);


	L_cor.rgb = V3AddV3(dseMat[0],dseMat[1]);
	BranchDefault();
	if(shadow > -0.5) {
		L_cor.rgb = V3MulFloat(L_cor.rgb,shadow);
	}
	//L_cor.rgb = V3MulFloat(L_cor.rgb,shadow);
	BranchEnd();

	out_color=L_cor;
}

function ps_main_gBuffer() {
	var tempShadow : CVec4;
	var occlusion : number=1.5;
	BranchBegin("occlusion","O",[shadowOn]);
	if(shadowOn>0.5)
	{
		tempShadow = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
		occlusion = (tempShadow.y * 255.0 * 256.0 + tempShadow.z * 255.0) / 65535.0;
		if(screenPos.z > occlusion + 2e-5) discard;
	}
	BranchEnd();

	var uv : CVec2 = to_uv;
	BranchBegin("parallax","P",[parallaxNormal,camPos]);
	uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
	BranchEnd();

	var L_cor : CVec4;
	if(sam2DCount == 1.0)
		L_cor = Sam2DToColor(0.0, uv);
	else
		L_cor = Sam2DToColor(to_ref.x, uv);

	BranchBegin("color","C",[colorModel,alphaModel]);
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	BranchEnd();

	BranchBegin("vfx","V",[colorVFX,time]);
	L_cor=ColorVFX(L_cor,uv,colorVFX,time);
	BranchEnd();

	if(L_cor.a < alphaCut) discard;

	//position
	if(outputType < SDF.eGBuf.Position + 0.5) {
		out_color = new CVec4(to_viewPos.xyz, 0.5);
	}
	//normal
	else if(outputType < SDF.eGBuf.Normal + 0.5) {
		var N : CVec3 = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref);
		out_color = new CVec4(MappingV3ToTex(N), 1.0);
	}
	//diffuse
	else if(outputType < SDF.eGBuf.Albedo + 0.5) {
		out_color = L_cor;
	}
	//(specular strength, emissive, specular power)
	else if(outputType < SDF.eGBuf.SpeculerPowEmissive + 0.5)
	{
		var lmaterial : CVec4=GetMaterial(material,Sam2DToColor(to_ref.z,uv),sam2DCount);
		out_color = lmaterial;
	}
}

function ps_main_gBuffer_multi() {
	var tempShadow : CVec4;
	var occlusion : number=1.5;
	BranchBegin("occlusion","O",[shadowOn]);
	if(shadowOn>0.5)
	{
		tempShadow = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
		occlusion = (tempShadow.y * 255.0 * 256.0 + tempShadow.z * 255.0) / 65535.0;
		if(screenPos.z > occlusion + 2e-5) discard;
	}
	BranchEnd();

	var uv : CVec2 = to_uv;
	BranchBegin("parallax","P",[parallaxNormal,camPos]);
	uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
	BranchEnd();

	var L_cor : CVec4;
	if(sam2DCount == 1.0)
		L_cor = Sam2DToColor(0.0, uv);
	else
		L_cor = Sam2DToColor(to_ref.x, uv);

	BranchBegin("color","C",[colorModel,alphaModel]);
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	BranchEnd();

	BranchBegin("vfx","V",[colorVFX,time]);
	L_cor=ColorVFX(L_cor,uv,colorVFX,time);
	BranchEnd();

	if(L_cor.a < alphaCut) {
		discard;
	}

	//position
	out_pos = new CVec4(to_viewPos.xyz, 1.0);
	//normal
	var N : CVec3 = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref);
	out_nor = new CVec4(MappingV3ToTex(N), 1.0);
	//diffuse
	out_color = L_cor;

	var lmaterial : CVec4=GetMaterial(material,Sam2DToColor(to_ref.z,uv),sam2DCount);
	out_spc = lmaterial;
}

function vs_main_shadow_write(f3_ver : Vertex3,f4_wi : WeightIndexI4, f4_we : Weight4, f2_uv : UV2) 
{
	to_uv = f2_uv;

	var woweMat : CMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);

	var svm : CMat=new CMat(0);
	var spm : CMat=new CMat(0);
	
	if(shadowWrite.x<SDF.eShadow.Cas0 + 0.5)
	{
		svm =Sam2DToMat(shadowNearCasV0,shadowWrite.y);
		spm =Sam2DToMat(shadowFarCasP0,shadowWrite.y);
	}
	else if(shadowWrite.x<SDF.eShadow.Cas1 + 0.5)
	{
		svm =Sam2DToMat(shadowTopCasV1,shadowWrite.y);
		spm =Sam2DToMat(shadowBottomCasP1,shadowWrite.y);
	}
	else if(shadowWrite.x<SDF.eShadow.Cas2 + 0.5)
	{
		svm =Sam2DToMat(shadowLeftCasV2,shadowWrite.y);
		spm =Sam2DToMat(shadowRightCasP2,shadowWrite.y);
	}
	var P : CVec4 = new CVec4(f3_ver, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();

	P = V4MulMatCoordi(P, svm);
	to_viewPos = P;
	P = V4MulMatCoordi(P, spm);
	
	out_position = P;
}
function ps_main_shadow_write() 
{
	var L_cor : CVec4 = Sam2DToColor(0.0, to_uv);

	BranchBegin("color","C",[colorModel,alphaModel]);
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	BranchEnd();

	BranchBegin("vfx","V",[colorVFX,time]);
	L_cor=ColorVFX(L_cor,to_uv,colorVFX,time);
	BranchEnd();

	if(L_cor.a < alphaCut) {
		discard;
	}

	out_color = to_viewPos;
}
function vs_main_shadow_read(f3_ver : Vertex3,f4_wi : WeightIndexI4, f4_we : Weight4, f2_uv : UV2,f3_nor : Normal3) {
	var woweMat : CMat = GetWorldWeightMat(weightArrMat, f4_we, f4_wi, worldMat, skin);
	
	var P : CVec4 = new CVec4(f3_ver, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();

	to_worldPos = P;
	to_normal = V3Nor(V3MulMat3Normal(f3_nor,TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
	to_uv = f2_uv;

	P = V4MulMatCoordi(P, viewMat);
	out_position = V4MulMatCoordi(P, projectMat);
}
function GetParallaxShadowWorldPos(
    _uv : CVec2, _tan : CVec3, _bi : CVec3, _nor : CVec3,
    _wor : CVec4, _texOff : CVec3, _scale : number) : CVec4
{
    // 페럴렉스 후 uv에서 높이(A) 샘플 (노말맵 알파: _texOff.y)
    var h : number = Sam2DToColor(_texOff.y, _uv).a;    // 0..1
    // -0.5..+0.5로 가운데 정렬 후 스케일
    var disp : number = (h - 0.5) * _scale;

    // 탄젠트 노말(이미 사용 중)
    var N : CVec3 = GetTangentSpaceNormal(_uv, _tan, _bi, _nor, _texOff);

    // world pos를 노말 방향으로 살짝 이동
    var W : CVec3 = V3AddV3(_wor.xyz, V3MulFloat(N, disp));
    return new CVec4(W, _wor.w);
}
function ps_main_shadow_read() 
{	
	var L_cor : CVec4 = Sam2DToColor(0.0, to_uv);

	BranchBegin("color","C",[colorModel,alphaModel]);
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	BranchEnd();

	BranchBegin("vfx","V",[colorVFX,time]);
	L_cor=ColorVFX(L_cor,to_uv,colorVFX,time);
	BranchEnd();

	if(L_cor.a < alphaCut) {
		discard;
	}

	var all : number=0.0;
	for(var i = 0; i < FloatToInt(shadowCount); i++) {
		var shadowRead : CVec4=Sam2DToV4(shadowReadList,i);
		var sVal : number = calcShadow(shadowRead, IntToFloat(i),to_normal,to_worldPos);
		all+=sVal;
	}
	all/=shadowCount;
	if(all<0.0)all=0.0;


	var occlusion : number = screenPos.z;
	var scaled : number = occlusion * 65535.0;
	var high : number = floor(scaled / 256.0);
	var low : number = mod(scaled, 256.0);
	out_color = new CVec4(all, high / 255.0, low / 255.0, 1.0);
	//out_color = new CVec4(0.0,1.0,0.0,1.0);
}

function ps_main_bake() {
	var uv : CVec2 = to_uv;
	BranchBegin("parallax","P",[parallaxNormal,camPos]);
	uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
	BranchEnd();

	var L_cor : CVec4 = Sam2DToColor(to_ref.x,uv);

	BranchBegin("color","C",[colorModel,alphaModel]);
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	BranchEnd();

	BranchBegin("vfx","V",[colorVFX,time]);
	L_cor=ColorVFX(L_cor,to_uv,colorVFX,time);
	BranchEnd();

	if ( L_cor.a < alphaCut ) discard;

	var N : CVec3 = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref);

	//shadow
	var shadow : number=-1.0;
	var i : number = 0.0;
	BranchBegin("shadow","S",[shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,shadowCount,shadowPointProj,shadowReadList,ligDir,shadowRate,texture16f,bias,normalBias,PCF,dotCac]);
	if(shadowCount > 0.5) {
		shadow = 0.0;
		for(; i < shadowCount; i++) {
			shadow+=calcShadow(Sam2DToV4(shadowReadList, i), i, N, to_worldPos);
		}
		shadow/=shadowCount;
		if(shadow<0.0) shadow=0.0;
		

	}
	BranchEnd();
	

	var dseMat : CMat3=new CMat3(0);
	BranchBegin("light","L",[ligDir,ligCol,ligCount,camPos,material,ligStep0,ligStep1,ligStep2,ligStep3,envCube,ambientColor]);
	if(to_ref.z > 0.5 && material.w > 0.5) {
		dseMat = LightCac3D(camPos, to_worldPos, L_cor, N, shadow, Sam2DToColor(to_ref.z,uv).x, Sam2DToColor(to_ref.z,uv).y, Sam2DToColor(to_ref.z,uv).z, ambientColor);
	}
	else {
		dseMat = LightCac3D(camPos, to_worldPos, L_cor, N, shadow, material.x, material.y, material.z, ambientColor);
	}
	L_cor.rgb = V3AddV3(dseMat[0],dseMat[1]);
	BranchDefault();
	if(shadow > -0.5) {
		L_cor.rgb = V3MulFloat(L_cor.rgb,shadow);
	}
	BranchEnd();
	

	out_color = L_cor;
}