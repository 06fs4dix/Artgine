import { 
	Binormal3, Build, CMat, CVec2, CVec3, CVec4, CMat3, OutColor, OutPosition,
	ToV2, ToV3, ToV4, Normal3, TexOff3, Tangent4, UV2, Vertex3, Weight4, WeightIndexI4, InverseMat3, 
	LWVPMul, discard, screenPos,  MappingV3ToTex,
	Mat4ToMat3, MatAdd, MatMul, FloatMulMat, TransposeMat3,
	Sam2DToColor, Sam2DToMat, 
	V2SubV2, V2MulFloat, V2DivV2, 
	V3AddV3, V3Dot, V3Nor, V3MulFloat, V3MulMat3Normal, V3ToMat3,
	V4MulMatCoordi, 
	ParallaxNormal, FloatToInt, IntToFloat, MappingTexToV3, 
	BranchBegin,BranchEnd,BranchDefault,
	Attribute, Null,
	clamp,
	floor,
	MatMix,
	Sam2D0ToColor,
	MatTypeToMat,
	min,
	abs,
	max,
	dFdy,
	V3Len,
	length,
	dFdx,
	V3Mix,
	V3SubV3,
	SaturateFloat,
	V2AddV2,
	V2Len,
	SaturateV3,
	V3Cross,
	smoothstep,
	Sam2DArrMat,
	Sam2DArrToMat,
	Sam2DArrToV4,
    V3MulMatCoordi,
    V2Dot,
    sin,
    fract,
    V2Fract,
    V3Pow,
    V4Min,
    V2MulV2,
    V3Sqrt,
    V3MulV3,
    V3DivFloat,
	
} from "./Shader"
import {
	SDF
} from "./SDF";
import { 
	VFXDown2,
	GetTexCodiedUV,
	VFX,
	LUT0,
	LUT1,
	LUT2,
	LUT3,
	LUT4,
	LUT5,
	ColorModalFun,
	AlphaModalFun,
	vfxMat0,
	vfxMat1
} from "./ColorFun";
import {
	ambientColor,envmapOn,GetMaterial,GetSunInfo,ligCol,ligCount,ligDir,LightCac3D,ligMask,ligStep0,ligStep1,ligStep2,ligStep3,
    mask,
    material,
    sam2DCount,
    samCubeCount
} from "./Light";
import { ApplyWind, windCount, windDir, windInfluence, windInfo, windPos } from "./Wind";
import { 
	bias, normalBias, PCF, shadowCount, shadowOn, 
	shadowBottomCasP1, shadowFarCasP0, shadowLeftCasV2, shadowNearCasV0, shadowRightCasP2, shadowTopCasV1, 
	shadowPointProj, shadowRate, shadowReadList, shadowWrite, texture16f, 
	jitter,
    shadowNearFar,
    shadowLigPos,
    shadowTest,
    CalcShadow,
    CalcParallaxShadow
} from "./Shadow";
import { NoiseGet, NoiseNormalGet } from "./Noise";
import { exposure, Tonemap, tonemappingType } from "./ToneMapping";


var screenDepth : number;
//uniform
var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();
var texCodi : CVec4=Null();
var screenSize : CVec2;
var skin : number=Null();
var parallaxNormal : number=Attribute(0,"canvas");

var alphaCut : number = 0.01;

//mat
var worldMat : CMat=Null();
var worldMatShort : CVec4=Null();
var worldMatType : number=16.0;


var viewMat : CMat=Null();
var projectMat : CMat=Null();
var zDepth : number=0.0;
var zDepthBias : number=0.001;
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
var outputType : number=SDF.eGBuf.Albedo;

//lighting uniform
var camPos: CVec3=Null();

//depthmap
var depthMap : number = 0.0;
var screenResolution : CVec2=new CVec2(1.0, 1.0);


var weightArrMat: Sam2DArrMat = new Sam2DArrMat(1,SDF.eUni.MatSkin);
var weightBakeMat: number = 9.0;
var weightBakeIndex : number;

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

//Skin
Build("Artgine/Shader/3DSkin",[],
	vs_main,[
        worldMat,viewMat,projectMat,skin,sam2DCount
	],
	[out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos], 
	ps_main,[out_color]
);
//Simple
Build("Artgine/Shader/3DSimple",["simple"],
	vs_main_simple,[
        worldMat,viewMat,projectMat
    ],
	[out_position,to_uv],
	ps_main_simple,[out_color]
);

//gBuffer
Build("Artgine/Shader/3DGBuffer", ["gBuf"], 
	vs_main_gBuffer, [
		worldMat,viewMat,projectMat,skin,
        sam2DCount,
		outputType,material,mask
	], [out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos,to_viewPos],
	ps_main_gBuffer,[out_color, out_pos, out_nor, out_spc]
);

//shadow
Build("Artgine/Shader/3DShadowWrite", ["shadowWrite"], 
	vs_main_shadow_write, [
		worldMat,viewMat,projectMat,skin,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,
		shadowCount,shadowPointProj,shadowReadList,jitter,
        shadowNearFar,shadowLigPos
	], [out_position,to_uv,to_viewPos,to_worldPos],
	ps_main_shadow_write,[out_color]
);
Build("Artgine/Shader/3DShadowRead", ["shadowRead"], 
	vs_main_shadow_read, [
		worldMat,viewMat,projectMat,skin,
        mask,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,
		shadowCount,shadowPointProj,shadowReadList,
		shadowRate,PCF,texture16f,bias,normalBias,jitter,
        ligDir,ligCol,ligMask,ligCount,shadowTest
	], [out_position,to_uv,to_normal,to_worldPos,to_binormal,to_tangent,to_ref],
	ps_main_shadow_read,[out_color]
);



function vs_main_simple(f3_ver : Vertex3,f2_uv : UV2)
{
	to_uv=f2_uv;
	var wMat : CMat;
	BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
	wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
	BranchDefault();
	wMat=worldMat;
	BranchEnd();
	

	out_position=LWVPMul(f3_ver,wMat,viewMat,projectMat);
}
function ps_main_simple()
{
    var L_cor : CVec4=Sam2D0ToColor(to_uv);
	BranchBegin("colorModel","CM",[colorModel]);
	L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
	BranchEnd();


	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();
	if ( L_cor.a <= 0.01 ) discard;
	out_color=L_cor;
}

// function GetWorldWeightMat(_weightArrMat : Sam2DMat,_weightBakeArrMat : number,_index : number, 
// 	_weight : CVec4, _weightIndex : CVec4, _worldMat : CMat, _skin : number) : CMat 
// {
// 	var woweMat : CMat = _worldMat;

// 	if(_skin > 0.5 && _weight.x+_weight.y+_weight.z+_weight.w>0.0)
// 	{
// 		if(_skin < SDF.eSkin.Bone + 0.5 && _weightArrMat.x>0.0)
// 		{
// 			var weightMat:CMat = FloatMulMat(_weight.x,Sam2DToMat(_weightArrMat,_weightIndex.x));
// 			weightMat = MatAdd(FloatMulMat(_weight.y,Sam2DToMat(_weightArrMat,_weightIndex.y)),weightMat);
// 			weightMat = MatAdd(FloatMulMat(_weight.z,Sam2DToMat(_weightArrMat,_weightIndex.z)),weightMat);
// 			weightMat = MatAdd(FloatMulMat(_weight.w,Sam2DToMat(_weightArrMat,_weightIndex.w)),weightMat);
// 			woweMat = MatMul(weightMat,woweMat);
			
// 		}
// 		else if(_skin < SDF.eSkin.Bake + 0.5 && _index>-0.5)
// 		{
// 			var st : number=floor(_index);
// 			var ed : number=st+1.0;

			
// 			var weightSTMat:CMat = FloatMulMat(_weight.x,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.x));
// 			weightSTMat = MatAdd(FloatMulMat(_weight.y,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.y)),weightSTMat);
// 			weightSTMat = MatAdd(FloatMulMat(_weight.z,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.z)),weightSTMat);
// 			weightSTMat = MatAdd(FloatMulMat(_weight.w,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.w)),weightSTMat);


// 			var weightEDMat:CMat = FloatMulMat(_weight.x,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.x));
// 			weightEDMat = MatAdd(FloatMulMat(_weight.y,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.y)),weightEDMat);
// 			weightEDMat = MatAdd(FloatMulMat(_weight.z,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.z)),weightEDMat);
// 			weightEDMat = MatAdd(FloatMulMat(_weight.w,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.w)),weightEDMat);


// 			// var weightSTMat:CMat = Sam2DToMat(new CVec2(9.0,0.0),0.0);
// 			// woweMat = MatMul(weightSTMat,woweMat);
// 			//woweMat = weightSTMat;
// 			var weightMat:CMat = MatMix(weightSTMat, weightEDMat, _index-st);
// 			woweMat = MatMul(weightMat,woweMat);
			
// 		}
		
		
		
// 	}

// 	return woweMat;
// }

function GetWorldWeightMat(_weightArrMat : Sam2DArrMat,_weightBakeArrMat : number,_index : number, 
	_weight : CVec4, _weightIndex : CVec4, _worldMat : CMat, _skin : number) : CMat 
{
	var woweMat : CMat = _worldMat;

	if(_skin > 0.5 && _weight.x+_weight.y+_weight.z+_weight.w>0.0)
	{
		if(_skin < SDF.eSkin.Bone + 0.5 && _weightArrMat.x>0.0)
		{
			var weightMat:CMat = FloatMulMat(_weight.x,Sam2DArrToMat(_weightArrMat,_weightIndex.x));
			weightMat = MatAdd(FloatMulMat(_weight.y,Sam2DArrToMat(_weightArrMat,_weightIndex.y)),weightMat);
			weightMat = MatAdd(FloatMulMat(_weight.z,Sam2DArrToMat(_weightArrMat,_weightIndex.z)),weightMat);
			weightMat = MatAdd(FloatMulMat(_weight.w,Sam2DArrToMat(_weightArrMat,_weightIndex.w)),weightMat);
			woweMat = MatMul(weightMat,woweMat);
			
		}
		else if(_skin < SDF.eSkin.Bake + 0.5 && _index>-0.5)
		{
			var st : number=floor(_index);
			var ed : number=st+1.0;

			
			var weightSTMat:CMat = FloatMulMat(_weight.x,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.x));
			weightSTMat = MatAdd(FloatMulMat(_weight.y,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.y)),weightSTMat);
			weightSTMat = MatAdd(FloatMulMat(_weight.z,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.z)),weightSTMat);
			weightSTMat = MatAdd(FloatMulMat(_weight.w,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.w)),weightSTMat);


			var weightEDMat:CMat = FloatMulMat(_weight.x,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.x));
			weightEDMat = MatAdd(FloatMulMat(_weight.y,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.y)),weightEDMat);
			weightEDMat = MatAdd(FloatMulMat(_weight.z,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.z)),weightEDMat);
			weightEDMat = MatAdd(FloatMulMat(_weight.w,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.w)),weightEDMat);


			// var weightSTMat:CMat = Sam2DToMat(new CVec2(9.0,0.0),0.0);
			// woweMat = MatMul(weightSTMat,woweMat);
			//woweMat = weightSTMat;
			var weightMat:CMat = MatMix(weightSTMat, weightEDMat, _index-st);
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
function GetParallaxMappedUV(_uv : CVec2, _tan : CVec3, _bi : CVec3, _nor : CVec3, _wor : CVec4, _camPos : CVec3, _texOff : CVec3) : CVec3 {
    var uvh : CVec3 = new CVec3(_uv, 0.0);
    if(parallaxNormal>0.0001) {
        var TBN : CMat3 = TransposeMat3(V3ToMat3(_tan, _bi, _nor));
		uvh = ParallaxNormal(V3MulMat3Normal(_camPos,TBN).xyz, V3MulMat3Normal(_wor.xyz,TBN).xyz, _texOff.y, _uv, parallaxNormal);
		// if(uvh.x > 1.0 || uvh.y > 1.0 || uvh.x <= 0.0 || uvh.y <= 0.0)
		// 	discard;
    }
    return uvh;
}


function GetTangentSpaceNormal(_uv : CVec2, _tan : CVec3, _bi : CVec3, _nor : CVec3, _texOff : CVec3,sam2DCount :number) : CVec3 {
	var N : CVec3 = _nor;
	if(to_ref.y>0.5 && sam2DCount>1.5)
	{
		var TBN : CMat3 = V3ToMat3(_tan, _bi, _nor);

		N=Sam2DToColor(to_ref.y,_uv).xyz;
		N=MappingTexToV3(N);
		// N.y=-N.y;
		if(V3Dot(N,new CVec3(0,0,1))>0.999)
			N=_nor;
		else	
			N=V3Nor(V3MulMat3Normal(N,TBN).xyz);
	}
	return N;
}

function vs_main(f3_ver : Vertex3,f2_uv : UV2,f4_we: Weight4,f4_wi : WeightIndexI4,
	f3_nor : Normal3,f4_tan : Tangent4,f3_ref : TexOff3)
{
	
	//to_uv=f2_uv;

	BranchBegin("codi","C",[texCodi]);
	to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);	
	BranchDefault();
	to_uv.xy=f2_uv;
	BranchEnd();


	var wMat : CMat;
	BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
	wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
	BranchDefault();
	wMat=worldMat;
	BranchEnd();

	
	var woweMat : CMat = wMat;
	BranchBegin("weightMat","WG",[weightArrMat,weightBakeMat,weightBakeIndex]);
	woweMat = GetWorldWeightMat(weightArrMat,weightBakeMat,weightBakeIndex, f4_we, f4_wi, wMat, skin);
	BranchEnd();

	
	var P : CVec4 = new CVec4(f3_ver, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();
	
	to_worldPos=P;
	P=V4MulMatCoordi(P,viewMat);
	P=V4MulMatCoordi(P, projectMat);;
	// BranchBegin("zDepth","Z",[zDepth]);
	// P.z+=zDepth;
	// BranchEnd();
	BranchBegin("zDepth","Z",[zDepth,zDepthBias]);
	P.z+=zDepth*zDepthBias;
	BranchEnd();
	out_position=P;


	// normal map 있을 때: N과 T를 같은 raw 행렬로 변환 → TBN 공간 일관성 유지
	// normal map 없을 때: N을 inv-transpose로 변환 → 기하 노말 정확도 우선
	var nMat3 : CMat3;
	if(f3_ref.y > 0.0)	nMat3 = Mat4ToMat3(woweMat);
	else nMat3 = TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)));

	to_normal  = V3Nor(V3MulMat3Normal(f3_nor,     nMat3).xyz);
	to_tangent = V3Nor(V3MulMat3Normal(f4_tan.xyz, nMat3).xyz);

	// (권장) T를 N에 대해 직교화해서 보간/스케일 오차 줄이기
	// xyz스케일이 다른경우+픽셀에서 다시 노말라이즈 해서 사용할경우 필요 없음+스킨 매트릭스로 인해 틀어질경우
	// T = normalize(T - N * dot(N,T)); 
	to_tangent = V3Nor(V3SubV3(to_tangent,V3MulFloat(to_normal, V3Dot(to_normal, to_tangent))));

	// 바이노말은 cross로 재구성 (+ handedness = f4_tan.w)
	to_binormal = V3Nor(V3MulFloat(V3Cross(to_normal, to_tangent),f4_tan.w));
		
	to_ref=f3_ref;
}

function vs_main_gBuffer(f3_ver : Vertex3, f2_uv : UV2, f4_wi  : WeightIndexI4, f4_we : Weight4, f3_nor : Normal3, f4_tan : Tangent4, f3_ref : TexOff3) {
	BranchBegin("codi","C",[texCodi]);
	to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);	
	BranchDefault();
	to_uv.xy=f2_uv;
	BranchEnd();
	to_ref = f3_ref;
	var wMat : CMat;
	BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
	wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
	BranchDefault();
	wMat=worldMat;
	BranchEnd();

	var woweMat : CMat = wMat;
	BranchBegin("weightMat","WG",[weightArrMat,weightBakeMat,weightBakeIndex]);
	woweMat = GetWorldWeightMat(weightArrMat,weightBakeMat,weightBakeIndex, f4_we, f4_wi, wMat, skin);
	BranchEnd();

	// 노말 변환 매트릭스 선택을 공통화
	var nMat3 : CMat3;
	if(f3_ref.y > 0.0) {
		nMat3 = Mat4ToMat3(woweMat);
	} else {
		nMat3 = TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)));
	}

	// N, T를 같은 규칙으로 월드 변환
	to_normal  = V3Nor(V3MulMat3Normal(f3_nor,     nMat3).xyz);
	to_tangent = V3Nor(V3MulMat3Normal(f4_tan.xyz, nMat3).xyz);

	// (권장) T를 N에 대해 직교화해서 보간/스케일 오차 줄이기
	// T = normalize(T - N * dot(N,T));
	to_tangent = V3Nor(
		V3SubV3(
			to_tangent,
			V3MulFloat(to_normal, V3Dot(to_normal, to_tangent))
		)
	);

	// 바이노말은 cross로 재구성 (+ handedness = f4_tan.w)
	to_binormal = V3Nor(
		V3MulFloat(
			V3Cross(to_normal, to_tangent),
			f4_tan.w
		)
	);

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

        var noise : number = NoiseGet(new CVec3(_world.x / 300.0 - normalflowDir.x * time * 0.1, _world.z / 300.0 + normalflowDir.y * time * 0.1, 0.0), SDF.eNoise.Perlin);
        var edgeFade : number = foamMask * smoothstep(0.25, 1.0, noise);

        _color = V3AddV3(_color, V3MulFloat(foam, 0.35 * edgeFade));
        _color = V3Mix(_color, foam, 0.4 * edgeFade);
    }

    return _color;
}

function ps_main()
{
	var shadow : CVec4 = new CVec4(-1.0, -1.0, -1.0, -1.0);
	BranchBegin("shadow","S",[shadowOn, screenSize]);
	if(shadowOn>0.5) {
		shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, V2DivV2(screenPos.xy, screenSize.xy));  // <- 여기! 절대 size 곱하지 말기
	}
	BranchEnd();

	
	var world : CVec4 = to_worldPos;

	var uv : CVec2 = to_uv;
	var uvh : CVec3;
	var ratio : number;
	BranchBegin("parallax","P",[parallaxNormal, camPos]);
	uvh = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
	uv = uvh.xy;

	world.xyz = V3SubV3(world.xyz, V3MulFloat(
		V3Nor(V3SubV3(camPos, world.xyz)), 
		V3Len(new CVec3(V2SubV2(uvh.xy,to_uv), parallaxNormal * uvh.z)) / max(
			length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)),
			length(abs(dFdy(to_uv))) / length(dFdy(world.xyz))
		)
	));

	// depth offset 적용
	if(parallaxNormal > 0.0001) {
		ratio = V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])));
		screenDepth = SDF.ClipControl > 0
			? clamp(screenPos.z * ratio, 0.0, 1.0)
			: clamp(((screenPos.z * 2.0 - 1.0) * ratio) * 0.5 + 0.5, 0.0, 1.0);
	}

	BranchEnd();

	var normal : CVec3 = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref,sam2DCount);

	var L_cor : CVec4;

	BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	L_cor=VFXDown2(uv,VFX,time,world);
	BranchDefault();
	L_cor=Sam2DToColor(to_ref.x, uv);
	BranchEnd();


	BranchBegin("colorModel","CM",[colorModel]);
	L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
	BranchEnd();


	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();

    BranchBegin("alphaCut","AC",[alphaCut]);
    if ( L_cor.a <= alphaCut ) discard;
    BranchDefault();
    if ( L_cor.a <= 0.01 ) discard;
	BranchEnd();

	var dseMat : CMat3=new CMat3(0);
	var lmaterial : CVec4=new CVec4(1.0,1.0,1.0,1.0);
	var sunDir : CVec3 = new CVec3(0.0, 1.0, 0.0);
	var sunCol : CVec3 = new CVec3(1.0, 1.0, 1.0);
    var gamma : number = 1.0;
	BranchBegin("light","L",[ligDir,ligCol,ligMask,ligCount,camPos,material,mask,ligStep0,ligStep1,ligStep2,ligStep3,ambientColor,envmapOn,sam2DCount,samCubeCount]);
    gamma = 2.2;
    L_cor.rgb = V3MulV3(L_cor.rgb, L_cor.rgb);
	
	lmaterial=GetMaterial(material,Sam2DToColor(to_ref.z,uv),sam2DCount);
	dseMat = GetSunInfo();
	sunDir = dseMat[0];
	sunCol = dseMat[1];
	
	dseMat = LightCac3D(camPos, to_worldPos, L_cor, normal, shadow, lmaterial.y, lmaterial.x, lmaterial.z, mask.x);
 
	L_cor.rgb = V3AddV3(dseMat[0],dseMat[1]);
    
	BranchDefault();
	if(shadow.a > -0.5) {
		L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.a);
	}
	//L_cor.rgb = V3MulFloat(L_cor.rgb,shadow);
	BranchEnd();

	out_color=L_cor;

	BranchBegin("waterReflect","waterReflect",[waterDeep]);
	if(world.y <= waterDeep.x) discard;	// 물 높이보다 높은 것만 랜더링
	BranchEnd();

    var caustics : CVec3;
	BranchBegin("waterRefract","waterRefract",[waterDeep, waterUnderFadeDist, shallowColor, deepColor, causticFlowDir, causticFlowFreq, waterHeight, camPos, time, normalflowDir, normalRange]);
	if(world.y > waterDeep.x + waterDeep.z) discard; // (물 높이 + 거품이 생기는 깊이)보다 낮은 것만 랜더링
	//out_color.rgb = Caustics(out_color.rgb, world.xyz, causticFlowDir, sunDir, sunCol);
	caustics = Caustics(world.xyz, causticFlowDir,sunDir,sunCol);
	out_color.rgb = WaterProcessing(out_color.rgb, caustics, world);
	BranchEnd();

    BranchBegin("tonemapping","tonemapping",[exposure, tonemappingType]);
    out_color.rgb = Tonemap(out_color.rgb, exposure, tonemappingType);
    BranchEnd();

    if(gamma > 1.1) {
        out_color.rgb = V3Sqrt(out_color.rgb);
    }
}


function ps_main_gBuffer() 
{
	var uv : CVec2 = to_uv;

    var world : CVec4 = to_worldPos;
    var view : CVec4 = to_viewPos;

    var uvh : CVec3;
    var ratio : number;
	BranchBegin("parallax","P",[parallaxNormal,camPos]);
	uvh = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
    uv = uvh.xy;

	world.xyz = V3SubV3(world.xyz, V3MulFloat(
		V3Nor(V3SubV3(camPos, world.xyz)), 
		V3Len(new CVec3(V2SubV2(uvh.xy,to_uv), parallaxNormal * uvh.z)) / max(
			length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)),
			length(abs(dFdy(to_uv))) / length(dFdy(world.xyz))
		)
	));

    view.xyz = V4MulMatCoordi(world, viewMat).xyz;

	// depth offset 적용
	if(parallaxNormal > 0.0001) {
		ratio = V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])));
		screenDepth = SDF.ClipControl > 0
			? clamp(screenPos.z * ratio, 0.0, 1.0)
			: clamp(((screenPos.z * 2.0 - 1.0) * ratio) * 0.5 + 0.5, 0.0, 1.0);
	}

	BranchEnd();

	var L_cor : CVec4;

	BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	L_cor=VFXDown2(uv,VFX,time,world);
	BranchDefault();
	if(sam2DCount == 1.0)
		L_cor = Sam2DToColor(0.0, uv);
	else
		L_cor = Sam2DToColor(to_ref.x, uv);
	BranchEnd();
	

	BranchBegin("colorModel","CM",[colorModel]);
	L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
	BranchEnd();

	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();
	
    BranchBegin("alphaCut","AC",[alphaCut]);
    if ( L_cor.a <= alphaCut ) discard;
    BranchDefault();
    if ( L_cor.a <= 0.01 ) discard;
	BranchEnd();

    // 0 position
	out_pos = new CVec4(view.xyz, mask.x);

	// 1 normal
	var N : CVec3 = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref, sam2DCount);
	out_nor = new CVec4(MappingV3ToTex(N), 1.0);

    // 3 material (ao, roughness, metalic, emissive)
    var lmaterial : CVec4=GetMaterial(material,Sam2DToColor(to_ref.z,uv),sam2DCount);
	out_spc = lmaterial;
	
    if(outputType < SDF.eGBuf.Albedo + 0.5) {
        // 0 albedo
		out_color = L_cor;
	}
	else if(outputType < SDF.eGBuf.Position + 0.5) {
        // 1 position
		out_color = out_pos;
	}
	else if(outputType < SDF.eGBuf.Normal + 0.5) {
        // 2 normal
		out_color = out_nor;
	}
	else if(outputType < SDF.eGBuf.SpeculerPowEmissive + 0.5) {
        // 3 material (ao, roughness, metalic, emissive)
		out_color = out_spc;
	}
}

function vs_main_shadow_write(f3_ver : Vertex3,f4_wi : WeightIndexI4, f4_we : Weight4, f2_uv : UV2) 
{
	BranchBegin("codi","C",[texCodi]);
	to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);	
	BranchDefault();
	to_uv.xy=f2_uv;
	BranchEnd();

	var wMat : CMat;
	BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
	wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
	BranchDefault();
	wMat=worldMat;
	BranchEnd();
	//var woweMat : CMat = GetWorldWeightMat(weightArrMat,weightBakeMat,weightBakeIndex, f4_we, f4_wi, wMat, skin);

	var woweMat : CMat = wMat;
	BranchBegin("weightMat","WG",[weightArrMat,weightBakeMat,weightBakeIndex]);
	woweMat = GetWorldWeightMat(weightArrMat,weightBakeMat,weightBakeIndex, f4_we, f4_wi, wMat, skin);
	BranchEnd();

	var P : CVec4 = new CVec4(f3_ver, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();

    // 디렉셔널
    if(shadowWrite.z < 0.5) {
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

        P = V4MulMatCoordi(P, svm);
        to_viewPos = P;
        P = V4MulMatCoordi(P, spm);
    }
    // 포인트
    else {
        var spvm : CMat=new CMat(0);
        if(shadowWrite.x<SDF.eShadow.Near + 0.5)
        {
            spvm = Sam2DArrToMat(shadowNearCasV0,shadowWrite.y);
        }
        else if(shadowWrite.x<SDF.eShadow.Far + 0.5)
        {
            spvm = Sam2DArrToMat(shadowFarCasP0,shadowWrite.y);
        }
        else if(shadowWrite.x<SDF.eShadow.Top + 0.5)
        {
            spvm = Sam2DArrToMat(shadowTopCasV1,shadowWrite.y);
        }
        else if(shadowWrite.x<SDF.eShadow.Bottom + 0.5)
        {
            spvm = Sam2DArrToMat(shadowBottomCasP1,shadowWrite.y);
        }
        else if(shadowWrite.x<SDF.eShadow.Left + 0.5)
        {
            spvm = Sam2DArrToMat(shadowLeftCasV2,shadowWrite.y);
        }
        else if(shadowWrite.x<SDF.eShadow.Right + 0.5)
        {
            spvm = Sam2DArrToMat(shadowRightCasP2,shadowWrite.y);
        }
        to_worldPos = P;
        P = V4MulMatCoordi(P, spvm);
    }
	
	out_position = P;
}
function ps_main_shadow_write() 
{
	var L_cor : CVec4;

	// BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	// L_cor=VFXDown2(to_uv,VFX,time,new CVec4(0.0,0.0,0.0,0.0));
	// BranchDefault();
	// L_cor = Sam2DToColor(0.0, to_uv);
	// BranchEnd();
	L_cor = Sam2DToColor(0.0, to_uv);

	// BranchBegin("colorModel","CM",[colorModel]);
	// L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
	// BranchEnd();

	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();
	
    BranchBegin("alphaCut","AC",[alphaCut]);
    if ( L_cor.a <= alphaCut ) discard;
    BranchDefault();
    if ( L_cor.a <= 0.01 ) discard;
	BranchEnd();
	
    // 디렉셔널
    if(shadowWrite.z < 0.5) {
        out_color = to_viewPos;
    }
    else {
        var lightToWorldPos : CVec3 = V3SubV3(to_worldPos.xyz, shadowLigPos.xyz);
        var distance : number = (V3Len(lightToWorldPos) - shadowNearFar.x) / (shadowNearFar.y - shadowNearFar.x);
        out_color = new CVec4(distance, distance, distance, 1.0);
    }
}
function vs_main_shadow_read(f3_ver : Vertex3,f4_wi : WeightIndexI4, f4_we : Weight4, f2_uv : UV2,f3_nor : Normal3,f4_tan : Tangent4,f3_bi : Binormal3,f3_ref : TexOff3) {

	var wMat : CMat;
	BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
	wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
	BranchDefault();
	wMat=worldMat;
	BranchEnd();
	var woweMat : CMat = wMat;
	BranchBegin("weightMat","WG",[weightArrMat,weightBakeMat,weightBakeIndex]);
	woweMat = GetWorldWeightMat(weightArrMat,weightBakeMat,weightBakeIndex, f4_we, f4_wi, wMat, skin);
	BranchEnd();
	
	var P : CVec4 = new CVec4(f3_ver, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();

	to_worldPos = P;
	to_normal = V3Nor(V3MulMat3Normal(f3_nor,TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
	BranchBegin("codi","C",[texCodi]);
	to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);	
	BranchDefault();
	to_uv.xy=f2_uv;
	BranchEnd();

	to_tangent=V3Nor(V3MulMat3Normal(f4_tan.xyz,Mat4ToMat3(woweMat)).xyz);
	to_binormal=V3Nor(V3MulMat3Normal(f3_bi,Mat4ToMat3(woweMat)).xyz);
	if(f3_ref.y > 0.0) {
		to_normal=V3Nor(V3MulMat3Normal(f3_nor,Mat4ToMat3(woweMat)).xyz);
	} else {
		to_normal = V3Nor(V3MulMat3Normal(f3_nor,TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
	}
	to_ref=f3_ref;

	P = V4MulMatCoordi(P, viewMat);
	out_position = V4MulMatCoordi(P, projectMat);
}

function ps_main_shadow_read() 
{
    var temp : CVec3;
    var outputIndex: number;
    
	var uv : CVec2 = to_uv;
    var world : CVec4 = to_worldPos;
    var pShadow : CVec4 = new CVec4(1.0,1.0,1.0,1.0);
	BranchBegin("parallax","P",[parallaxNormal, camPos]);
	temp = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, world, camPos, to_ref);
    uv = temp.xy;
	world.xyz = V3SubV3(world.xyz, V3MulFloat(
		V3Nor(V3SubV3(camPos, world.xyz)), 
		V3Len(new CVec3(V2SubV2(temp.xy,to_uv), parallaxNormal * temp.z)) / max(
			length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)),
			length(abs(dFdy(to_uv))) / length(dFdy(world.xyz))
		)
	));
	if(parallaxNormal > 0.0001) {
		temp.x = V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])));
		screenDepth = SDF.ClipControl > 0
			? clamp(screenPos.z * temp.x, 0.0, 1.0)
			: clamp(((screenPos.z * 2.0 - 1.0) * temp.x) * 0.5 + 0.5, 0.0, 1.0);

        outputIndex = 0.0;
        pShadow = new CVec4(0.0,0.0,0.0,0.0);
        for(var i=0;i<SDF.TexSizeMax;++i) {
            if(i >= FloatToInt(shadowCount)) break;
            pShadow[FloatToInt(outputIndex)] += CalcParallaxShadow(IntToFloat(i), world, uv, to_ref, parallaxNormal, to_tangent, to_binormal, to_normal);
            outputIndex = min(outputIndex + 1.0, 3.0);
        }
        pShadow.a /= max(shadowCount - 3.0, 1.0);
	}
	BranchEnd();

	var L_cor : CVec4;

	BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	L_cor=VFXDown2(uv,VFX,time,world);
	BranchDefault();
	L_cor = Sam2DToColor(0.0, uv);
	BranchEnd();

	BranchBegin("colorModel","CM",[colorModel]);
	L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
	BranchEnd();

	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();
	
    BranchBegin("alphaCut","AC",[alphaCut]);
    if ( L_cor.a <= alphaCut ) discard;
    BranchDefault();
    if ( L_cor.a <= 0.01 ) discard;
	BranchEnd();
	
    var dShadow : CVec4 = new CVec4(1.0,1.0,1.0,1.0);
	BranchBegin("shadowMulti","SDM",[]);
    outputIndex = 0.0;
    dShadow = new CVec4(0.0,0.0,0.0,0.0);
    for(var i=0;i<SDF.TexSizeMax;++i) {
        if(i >= FloatToInt(shadowCount)) break;
        dShadow[FloatToInt(outputIndex)] += CalcShadow(IntToFloat(i), to_normal, world);
        outputIndex = min(outputIndex + 1.0, 3.0);
    }
    dShadow.a /= max(shadowCount - 3.0, 1.0);
	BranchDefault();
    dShadow.a = CalcShadow(0.0, to_normal, world);
    dShadow.rgb = new CVec3(dShadow.a, dShadow.a, dShadow.a);   // 하나만 사용하기 때문에 rgba 같은값으로 넣어줌
	BranchEnd();

    out_color = V4Min(dShadow, pShadow);
}