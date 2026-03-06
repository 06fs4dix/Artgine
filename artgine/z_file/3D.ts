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
	Mat34ToMat,
	CMat12,
	CMat43,
	Sam2DArrSize,
	MatMix,
	Sam2D0ToColor,
	CMat42,
	MatTypeToMat,
	min,
	abs,
	max,
	dFdy,
	V3Len,
	length,
	dFdx,
	V3MulV3,
	V3Mix,
	Exp,
	V3SubV3,
	SaturateFloat,
	sin,
	cos,
	V2AddV2,
	V2MulV2,
	pow,
	V3Min,
	V2Len,
	SaturateV3,
	V4Dot,
	V3Cross,
	V2Nor,
	smoothstep,
	
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
	ambientColor,
	envCube,GetMaterial,GetSunInfo,ligCol,ligCount,ligDir,LightCac3D,ligStep0,ligStep1,ligStep2,ligStep3
} from "./Light";
import { ApplyWind, windCount, windDir, windInfluence, windInfo, windPos } from "./Wind";
import { 
	bias, calcShadow,  normalBias, PCF, shadowCount, shadowOn, 
	shadowBottomCasP1, shadowFarCasP0, shadowLeftCasV2, shadowNearCasV0, shadowRightCasP2, shadowTopCasV1, 
	shadowPointProj, shadowRate, shadowReadList, shadowWrite, texture16f, 
	jitter,
	calcParallaxShadow
} from "./Shadow";
import { NoiseNormalGet } from "./Noise";


var screenDepth : number;
//uniform
var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();
var texCodi : CVec4=Null();
var screenSize : CVec2;
var skin : number=Null();
var parallaxNormal : number=Attribute(0,"canvas");
var sam2DCount : number=Null();
var material: CVec4 = new CVec4(0.0,0.0,0.0,1.0);

//var alphaCut : number = 0.1;


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
var outputType : number=Null();

//lighting uniform
var camPos: CVec3=Null();

//depthmap
var depthMap : number = 0.0;
var screenResolution : CVec2=new CVec2(1.0, 1.0);

//LUT
var weightArrMat: Sam2DMat = new Sam2DMat(11,10);
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

//Skin
Build("Artgine/Shader/3DSkin",[],
	vs_main,[worldMat,viewMat,projectMat,skin,sam2DCount,
		screenSize
	],
	[out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos], 
	ps_main,[out_color]
);
//Simple
Build("Artgine/Shader/3DSimple",["simple"],
	vs_main_simple,[worldMat,
		viewMat,projectMat],
	[out_position,to_uv],
	ps_main_simple,[out_color]
);

//gBuffer
Build("Artgine/Shader/3DGBuffer", ["gBuf"], 
	vs_main_gBuffer, [
		worldMat,
		viewMat,projectMat,skin,
		sam2DCount,material,outputType,
	], [out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos,to_viewPos],
	ps_main_gBuffer,[out_color]
);
//gBuffer MultiTex
Build("Artgine/Shader/3DGBufferMulti", ["gBufMulti"], 
	vs_main_gBuffer, [
		worldMat,
		viewMat,projectMat,skin,
		sam2DCount,material,
	], [out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos,to_viewPos],
	ps_main_gBuffer_multi,[out_color, out_pos, out_nor, out_spc]
);

//shadow
Build("Artgine/Shader/3DShadowWrite", ["shadowWrite"], 
	vs_main_shadow_write, [
		worldMat,
		viewMat,projectMat,skin,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,
		shadowCount,shadowPointProj,shadowReadList,jitter
	], [out_position,to_uv,to_viewPos],
	ps_main_shadow_write,[out_color]
);

Build("Artgine/Shader/3DShadowRead", ["shadowRead"], 
	vs_main_shadow_read, [
		worldMat,
		viewMat,projectMat,skin,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowWrite,
		shadowCount,shadowPointProj,shadowReadList,
		shadowRate,PCF,texture16f,bias,normalBias,jitter,
		ligDir,ligCol,ligCount,
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

function GetWorldWeightMat(_weightArrMat : Sam2DMat,_weightBakeArrMat : number,_index : number, 
	_weight : CVec4, _weightIndex : CVec4, _worldMat : CMat, _skin : number) : CMat 
{
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

        // // clamp slightly inside to avoid sampling border texels (tweak epsilon if needed)
        // uv.x = clamp(uv.x, 0.0005, 0.9995);
        // uv.y = clamp(uv.y, 0.0005, 0.9995);
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
		N.y=-N.y;
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


	// 노말 변환 매트릭스 선택을 공통화
	var nMat3 : CMat3;
	if(f3_ref.y > 0.0)	nMat3 = Mat4ToMat3(woweMat);
	else nMat3 = TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)));
	

	// N, T를 같은 규칙으로 월드 변환
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
	//var woweMat : CMat = GetWorldWeightMat(weightArrMat,weightBakeMat,weightBakeIndex, f4_we, f4_wi, wMat, skin);

	// to_tangent=V3Nor(V3MulMat3Normal(f4_tan.xyz,Mat4ToMat3(woweMat)).xyz);
	// to_binormal=V3Nor(V3MulMat3Normal(f3_bi,Mat4ToMat3(woweMat)).xyz);
	// if(f3_ref.y > 0.0) {
	// 	to_normal=V3Nor(V3MulMat3Normal(f3_nor,Mat4ToMat3(woweMat)).xyz);
	// } else {
	// 	to_normal = V3Nor(V3MulMat3Normal(f3_nor,TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)))).xyz);
	// }

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

function ps_main()
{
	var shadowTex : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
	var shadow : number=-1.0;
	
	var uvScreen : CVec2;
	BranchBegin("shadow","S",[shadowOn]);
	if(shadowOn>0.5)
	{
		// shadowTex = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
		// shadow = shadowTex.x;

		//uvScreen = V2DivV2(screenPos.xy, screenSize.xy); // 0~1
		uvScreen = V2DivV2(V2SubV2(screenPos.xy, new CVec2(0.5, 0.5)), screenSize.xy);
	
		shadowTex = Sam2DToColor(shadowOn, uvScreen);  // <- 여기! 절대 size 곱하지 말기
		shadow = shadowTex.x;
	}
	BranchEnd();


	
	var world : CVec4 = to_worldPos;

	var uv : CVec2 = to_uv;
	var uvh : CVec3;
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
	screenDepth = screenPos.z;
	if(parallaxNormal > 0.0001) {
		screenDepth = clamp((1.0 + ((screenPos.z * 2.0 - 1.0) - 1.0) * V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])))) * 0.5 + 0.5, 0.0, 1.0);
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
	if ( L_cor.a <= 0.01 ) discard;

	
	
	var dseMat : CMat3=new CMat3(0);
	var lmaterial : CVec4=new CVec4(1.0,1.0,1.0,1.0);
	var sunDir : CVec3 = new CVec3(0.0, 1.0, 0.0);
	var sunCol : CVec3 = new CVec3(1.0, 1.0, 1.0);
	BranchBegin("light","L",[ligDir,ligCol,ligCount,camPos,material,ligStep0,ligStep1,ligStep2,ligStep3,envCube,ambientColor]);

	
	lmaterial=GetMaterial(material,Sam2DToColor(to_ref.z,uv),sam2DCount);
	dseMat = GetSunInfo();
	sunDir = dseMat[0];
	sunCol = dseMat[1];
	

	dseMat = LightCac3D(camPos, to_worldPos, L_cor, normal, shadow, 
		lmaterial.y, lmaterial.x, lmaterial.z, ambientColor);

	L_cor.rgb = V3AddV3(dseMat[0],dseMat[1]);
	BranchDefault();
	if(shadow > -0.5) {
		L_cor.rgb = V3MulFloat(L_cor.rgb,shadow);
	}
	//L_cor.rgb = V3MulFloat(L_cor.rgb,shadow);
	BranchEnd();

	out_color=L_cor;

	

	BranchBegin("waterReflect","waterReflect",[waterDeep]);
	if(world.y <= waterDeep.x) discard;	// 물 높이보다 높은 것만 랜더링
	BranchEnd();

	BranchBegin("waterRefract","waterRefract",[waterDeep, waterUnderFadeDist, shallowColor, deepColor, causticFlowDir, causticFlowFreq, waterHeight, camPos, time]);
	if(world.y > waterDeep.x + waterDeep.z) discard; // (물 높이 + 거품이 생기는 깊이)보다 낮은 것만 랜더링
	//out_color.rgb = Caustics(out_color.rgb, world.xyz, causticFlowDir, sunDir, sunCol);
	out_color.rgb = Caustics(out_color.rgb, world.xyz, causticFlowDir,sunDir,sunCol);
	out_color.rgb = WaterProcessing(out_color.rgb, world);
	BranchEnd();

	// BranchBegin("waterRefract","waterRefract",[waterDeep, waterUnderFadeDist, shallowColor, deepColor, causticFlowDir, causticFlowFreq, waterHeight, camPos, time]);
	// if(world.y <= waterDeep.x) discard;	// 물 높이보다 높은 것만 랜더링
	// if(world.y > waterDeep.x + waterDeep.z) discard; // (물 높이 + 거품이 생기는 깊이)보다 낮은 것만 랜더링
	// out_color.rgb = Caustics(out_color.rgb, world.xyz, causticFlowDir,new CVec3(0,1,0),new CVec3(1,1,1));
	// out_color.rgb = WaterProcessing(out_color.rgb, world);
	// BranchEnd();
}


function ps_main_gBuffer() {
	

	


	var uv : CVec2 = to_uv;
	BranchBegin("parallax","P",[parallaxNormal,camPos]);
	uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref).xy;
	BranchEnd();

	var L_cor : CVec4;
	


	BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	L_cor=VFXDown2(uv,VFX,time,to_worldPos);
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
	if ( L_cor.a <= 0.01 ) discard;

	//position
	if(outputType < SDF.eGBuf.Position + 0.5) {
		out_color = new CVec4(to_viewPos.xyz, 0.5);
	}
	//normal
	else if(outputType < SDF.eGBuf.Normal + 0.5) {
		var N : CVec3 = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref,sam2DCount);
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
	

	var uv : CVec2 = to_uv;
	BranchBegin("parallax","P",[parallaxNormal,camPos]);
	uv = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref).xy;
	BranchEnd();

	var L_cor : CVec4;

	BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	L_cor=VFXDown2(uv,VFX,time,to_worldPos);
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
	if ( L_cor.a <= 0.01 ) discard;

	//position
	out_pos = new CVec4(to_viewPos.xyz, 1.0);
	//normal
	var N : CVec3 = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref,sam2DCount);
	out_nor = new CVec4(MappingV3ToTex(N), 1.0);
	//diffuse
	out_color = L_cor;

	var lmaterial : CVec4=GetMaterial(material,Sam2DToColor(to_ref.z,uv),sam2DCount);
	out_spc = lmaterial;
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
	if ( L_cor.a <= 0.01 ) discard;
	

	out_color = to_viewPos;
}
function vs_main_shadow_read(f3_ver : Vertex3,f4_wi : WeightIndexI4, f4_we : Weight4, f2_uv : UV2,f3_nor : Normal3,f4_tan : Tangent4,f3_bi : Binormal3,f3_ref : TexOff3) {

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

	var world : CVec4 = to_worldPos;

	var uv : CVec2 = to_uv;
	var uvh : CVec3;

	var pAll : number = 1.0;
	var worldLigDir : CVec4;
	var worldNormal : CVec4;

	BranchBegin("parallax","P",[parallaxNormal, camPos]);

	// 패럴렉스 uv, 높이 계산
	uvh = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, world, camPos, to_ref);
	uv = uvh.xy;


	world.xyz = V3SubV3(world.xyz, V3MulFloat(
		V3Nor(V3SubV3(camPos, world.xyz)), 
		V3Len(new CVec3(V2SubV2(uvh.xy,to_uv), parallaxNormal * uvh.z)) / max(
			length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)),
			length(abs(dFdy(to_uv))) / length(dFdy(world.xyz))
		)
	));

	worldNormal = Sam2DToColor(to_ref.y, uv);
	worldNormal.xyz = MappingTexToV3(worldNormal.xyz);
	worldNormal.y = -worldNormal.y;

	pAll = 0.0;
	for(var i = 0; i < FloatToInt(shadowCount); i++) {
		worldLigDir = Sam2DToV4(ligDir, Sam2DToV4(shadowReadList,i).x);

		// 디렉셔널 라이팅이고, 라이팅을 받는 영역임
		if(worldLigDir.w < 1.5) {
			// ligDir을 tangent space로 변환
			worldLigDir.xyz = V3MulMat3Normal(V3Nor(worldLigDir.xyz), TransposeMat3(V3ToMat3(to_tangent, to_binormal, to_normal))).xyz;
			if(V3Dot(worldNormal.xyz, worldLigDir.xyz) > 0.0) {
				pAll += calcParallaxShadow(to_ref.y, uv, worldLigDir.xyz, parallaxNormal);
			}
			else {	// 빛 방향과 반대면임
				pAll += shadowRate;	
			}
		}
	}
	pAll /= shadowCount;
	if(pAll < 0.0) pAll=0.0;

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
	if ( L_cor.a <= 0.01 ) discard;
	

	var all : number=0.0;
	var shadowRead : CVec4;
	var sVal : number;
	BranchBegin("shadowMulti","SDM",[alphaModel]);
	
	for(var i = 0; i < FloatToInt(shadowCount); i++) {
		shadowRead =Sam2DToV4(shadowReadList,i);
		sVal  = calcShadow(shadowRead, IntToFloat(i), to_normal, world);
		all+=sVal;
	}
	all/=shadowCount;
	if(all<0.0)all=0.0;
	BranchDefault();
	shadowRead =Sam2DToV4(shadowReadList,0.0);
	all  = calcShadow(shadowRead, 0.0, to_normal, world);
	BranchEnd();
	
	

	// parallax self shadow 곱해줌
	all = min(all, pAll);

	out_color = new CVec4(all, all,all, 1.0);
}
