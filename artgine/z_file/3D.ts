import { 
	Binormal3, Build, CMat, CVec2, CVec3, CVec4, CMat3, OutColor, OutPosition,
	ToV2, ToV3, ToV4, Normal3, TexOff3, Tangent4, UV2, Vertex3, Weight4, WeightIndexI4, InverseMat3, 
	LWVPMul, discard, screenPos, MappingV3ToTex,
	Mat4ToMat3, MatAdd, MatMul, FloatMulMat, TransposeMat3, MatMix, MatTypeToMat,
	Sam2DToColor, Sam2DGradToColor, Sam2DToMat, Sam2DArrMat, Sam2D0ToColor, Sam2DArrNearestToMat,
    clamp, floor, min, abs, max, dFdy, dFdx, length, SaturateFloat, smoothstep,
	V2SubV2, V2MulFloat, V2DivV2, V2AddV2, V2Len,
	V3AddV3, V3Dot, V3Nor, V3MulFloat, V3MulMat3Normal, V3ToMat3, V3Len, V3Mix, V3SubV3, SaturateV3, V3Cross, V3Sqrt, V3MulV3,
	V4MulMatCoordi, V4Min,
	ParallaxNormal, FloatToInt, IntToFloat, MappingTexToV3, 
	BranchBegin,BranchEnd,BranchDefault,
	Attribute, Null,
    Sam2DArrNearestToV4,
    gl_Position,
    V4Dot,
    TransposeMat4,
	sqrt,
	sin,
	Sam2DToV4,
	vertexID,
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
	vfxMat1,
    PackGrayToRGBA
} from "./ColorFun";
import {
	ambientColor,envCount,envPos,EnvNearest,GetMaterial,GetSunInfo,ligCol,ligCount,ligDir,LightCac3D,ligMask,ligStep0,ligStep1,ligStep2,ligStep3,
    material,
    cullMask,
    sam2DCount,
    samCubeCount,
    emission,
	envmapOn,
	emissiveIntensity
} from "./Light";
import { ApplyWind, windCount, windDir, windInfluence, windInfo, windPos } from "./Wind";
import { 
	bias, normalBias, PCF, shadowCount, shadowOn, 
	shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow, shadowCas4VPMatWithZRow, shadowCas5VPMatWithZRow,
    shadowRate, shadowWrite, texture16f, shadowZOffset,
	jitter,
    CalcShadow,
    CalcParallaxShadow,
    shadowInfoList,
    shadowNear,
    shadowFar,
    shadowTop,
    shadowBottom,
    shadowLeft,
    shadowRight,
    PCFStep
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
//x 이내는 전체 깊이, y까지 줄어들다 그 밖은 시차 반복을 건너뜀(노말맵은 유지)
var parallaxDist : CVec2 = new CVec2(1500.0, 3000.0);
//시차만큼 깊이(픽셀 위치)를 뒤로 미는 배율. 1 기본, 0이면 밀지 않음. 붙어 있는 면이 비쳐 보이면 줄인다
var parallaxDepth : number = 1.0;

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
var to_envIdx : ToV2=Null();

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

//x:정점 수 y:델타 텍스처 가로. 델타 텍스처의 텍셀 번호는 타깃*정점수+정점 번호
var morphTex : number = 8.0;
var morphInfo : CVec4 = new CVec4(0.0, 2048.0, 0.0, 0.0);
var morphIdx0 : CVec4 = new CVec4(-1.0, -1.0, -1.0, -1.0);
var morphIdx1 : CVec4 = new CVec4(-1.0, -1.0, -1.0, -1.0);
var morphW0 : CVec4 = new CVec4(0.0, 0.0, 0.0, 0.0);
var morphW1 : CVec4 = new CVec4(0.0, 0.0, 0.0, 0.0);

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
	[out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos,to_envIdx],
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
		outputType,material,cullMask
	], [out_position,to_uv,to_normal,to_binormal,to_tangent,to_ref,to_worldPos,to_viewPos],
	ps_main_gBuffer,[out_color, out_pos, out_nor, out_spc]
);

//shadow
Build("Artgine/Shader/3DShadowWrite", ["shadowWrite"], 
	vs_main_shadow_write, [
		worldMat,viewMat,projectMat,skin,
        shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow, shadowCas4VPMatWithZRow, shadowCas5VPMatWithZRow,
        shadowInfoList,
		shadowWrite,shadowCount,shadowZOffset,
	], [out_position,to_uv,to_viewPos,to_ref],
	ps_main_shadow_write,[out_color]
);
Build("Artgine/Shader/3DShadowRead", ["shadowRead"], 
	vs_main_shadow_read, [
		worldMat,viewMat,projectMat,skin,
        shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow, shadowCas4VPMatWithZRow, shadowCas5VPMatWithZRow,
        shadowInfoList,
        shadowWrite,shadowCount,
		shadowRate,PCF,PCFStep,texture16f,bias,normalBias,jitter,
        ligDir,ligCol,ligMask,ligCount,cullMask,
        camPos
	], [out_position,to_uv,to_normal,to_worldPos,to_binormal,to_tangent,to_ref,to_viewPos],
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
			var weightMat:CMat = FloatMulMat(_weight.x,Sam2DArrNearestToMat(_weightArrMat,_weightIndex.x));
			weightMat = MatAdd(FloatMulMat(_weight.y,Sam2DArrNearestToMat(_weightArrMat,_weightIndex.y)),weightMat);
			weightMat = MatAdd(FloatMulMat(_weight.z,Sam2DArrNearestToMat(_weightArrMat,_weightIndex.z)),weightMat);
			weightMat = MatAdd(FloatMulMat(_weight.w,Sam2DArrNearestToMat(_weightArrMat,_weightIndex.w)),weightMat);
			woweMat = MatMul(weightMat,woweMat);
			
		}
		else if(_skin < SDF.eSkin.Bake + 0.5 && _index>-0.5)
		{
			var st : number=floor(_index);
			var ed : number=st+1.0;

			
			var weightSTMat:CMat = FloatMulMat(_weight.x,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.x));
            // var weightEDMat:CMat = FloatMulMat(_weight.x,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.x));
			if(_weight.y > 0.0) {
                weightSTMat = MatAdd(FloatMulMat(_weight.y,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.y)),weightSTMat);
                // weightEDMat = MatAdd(FloatMulMat(_weight.y,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.y)),weightEDMat);
                if(_weight.z > 0.0) {
                    weightSTMat = MatAdd(FloatMulMat(_weight.z,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.z)),weightSTMat);
                    // weightEDMat = MatAdd(FloatMulMat(_weight.z,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.z)),weightEDMat);
                    if(_weight.w > 0.0) {
                        weightSTMat = MatAdd(FloatMulMat(_weight.w,Sam2DToMat(new CVec2(_weightBakeArrMat,st),_weightIndex.w)),weightSTMat);
                        // weightEDMat = MatAdd(FloatMulMat(_weight.w,Sam2DToMat(new CVec2(_weightBakeArrMat,ed),_weightIndex.w)),weightEDMat);
                    }
                }
            }
			


			// var weightSTMat:CMat = Sam2DToMat(new CVec2(9.0,0.0),0.0);
			// woweMat = MatMul(weightSTMat,woweMat);
			//woweMat = weightSTMat;
			// var weightMat:CMat = MatMix(weightSTMat, weightEDMat, _index-st);
			woweMat = MatMul(weightSTMat,woweMat);
			
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
	//UV가 한 방향으로 늘어난 면은 그 방향 오프셋이 실제 깊이보다 커져 번진다.
	//화면 미분으로 탄젠트/바이노멀 방향 UV 밀도(su, sv)를 구해 밀도가 낮은 방향의 오프셋을 줄인다
	var dpx : CVec3 = dFdx(_wor.xyz);
	var dpy : CVec3 = dFdy(_wor.xyz);
	var duvx : CVec2 = dFdx(_uv);
	var duvy : CVec2 = dFdy(_uv);
    if(parallaxNormal>0.0001) {
		var tx : number = V3Dot(dpx, _tan);
		var ty : number = V3Dot(dpy, _tan);
		var bx : number = V3Dot(dpx, _bi);
		var by : number = V3Dot(dpy, _bi);
		var det : number = tx * by - ty * bx;
		var aniso : CVec2 = new CVec2(1.0, 1.0);
		//UV가 한 축으로 뭉친 삼각형은 탄젠트가 0/NaN이라 TBN 변환이 NaN이 되어 엉뚱한 텍스셀을 읽는다. NaN은 비교가 모두 거짓이라 아래 조건에서 걸러진다
		//UV가 면 전체에서 상수인 면(UV 면적 0)은 CPU가 임의 탄젠트를 넣어 위 조건을 통과하지만, 화면 UV 미분이 0/±수ulp 노이즈라 aniso·분모가 쿼드마다 널뛴다. 시차 끔.
		//ulp는 UV 절대값에 비례(uv=256이면 3e-5)하므로 미분을 ulp 단위로 재서 4~16ulp 사이를 램프로 끈다.
		//이진 판정이면 UV가 큰 면에서 픽셀당 UV가 기준 근처인 거리에 쿼드마다 켜짐/꺼짐이 갈려 점 무늬·계단 경계가 생긴다
		var valid : number = 0.0;
		if(V3Len(_tan) > 0.5 && V3Len(_bi) > 0.5 && abs(det) > 0.0000001) {
			valid = smoothstep(4.0, 16.0, (V2Len(duvx) + V2Len(duvy)) / (1.2e-7 * max(1.0, max(abs(_uv.x), abs(_uv.y)))));
		}
		if(abs(det) > 0.0000001) {
			var su : number = abs((duvx.x * by - duvy.x * bx) / det);
			var sv : number = abs((duvy.y * tx - duvx.y * ty) / det);
			var sMax : number = max(max(su, sv), 0.0000001);
			aniso = new CVec2(su / sMax, sv / sMax);
		}
		var toCam : CVec3 = V3SubV3(_camPos, _wor.xyz);
		//노말이 카메라 반대쪽인 면(안쪽 노말·양면)은 접선공간 시선 z가 음수라 ParallaxNormal의 xy/(z+0.2)가 z≈-0.2 띠에서 발산한다. 노말을 카메라 쪽으로 뒤집는다
		var facing : number = 1.0;
		if(V3Dot(_nor, toCam) < 0.0) facing = -1.0;
        var TBN : CMat3 = TransposeMat3(V3ToMat3(V3MulFloat(_tan, aniso.x), V3MulFloat(_bi, aniso.y), V3MulFloat(_nor, facing)));
		var fade : number = valid * (1.0 - smoothstep(parallaxDist.x, parallaxDist.y, V3Len(toCam))) * smoothstep(0.08, 0.3, abs(V3Dot(_nor, V3Nor(toCam))));
		uvh = ParallaxNormal(V3MulMat3Normal(_camPos,TBN).xyz, V3MulMat3Normal(_wor.xyz,TBN).xyz, _texOff.y, _uv, parallaxNormal * fade);
		// if(uvh.x > 1.0 || uvh.y > 1.0 || uvh.x <= 0.0 || uvh.y <= 0.0)
		// 	discard;
    }
    return uvh;
}


//_dx,_dy: 밉 선택용 원래 UV 기울기. 시차로 밀린 UV의 기울기는 계단처럼 튀어 UV가 촘촘한 면에 점 노이즈가 생긴다
function GetTangentSpaceNormal(_uv : CVec2, _tan : CVec3, _bi : CVec3, _nor : CVec3, _texOff : CVec3,sam2DCount :number, _dx : CVec2, _dy : CVec2) : CVec3 {
	var N : CVec3 = _nor;
	if(to_ref.y>0.5 && sam2DCount>1.5)
	{
		var TBN : CMat3 = V3ToMat3(_tan, _bi, _nor);

		N=Sam2DGradToColor(to_ref.y,_uv,_dx,_dy).xyz;
		N=MappingTexToV3(N);
		// N.y=-N.y;
		if(V3Dot(N,new CVec3(0,0,1))>0.999)
			N=_nor;
		else	
			N=V3Nor(V3MulMat3Normal(N,TBN).xyz);
	}
	return N;
}

function MorphOne(_pos : CVec3, _idx : number, _w : number) : CVec3
{
	var rPos : CVec3 = _pos;
	if(_idx > -0.5 && _w != 0.0)
	{
		var id : number = _idx * morphInfo.x + vertexID;
		var row : number = floor(id / morphInfo.y);
		var d : CVec4 = Sam2DToV4(new CVec2(morphTex, row), id - row * morphInfo.y);
		rPos = V3AddV3(_pos, V3MulFloat(d.xyz, _w));
	}
	return rPos;
}
function ApplyMorph(_pos : CVec3) : CVec3
{
	var p : CVec3 = MorphOne(_pos, morphIdx0.x, morphW0.x);
	p = MorphOne(p, morphIdx0.y, morphW0.y);
	p = MorphOne(p, morphIdx0.z, morphW0.z);
	p = MorphOne(p, morphIdx0.w, morphW0.w);
	p = MorphOne(p, morphIdx1.x, morphW1.x);
	p = MorphOne(p, morphIdx1.y, morphW1.y);
	p = MorphOne(p, morphIdx1.z, morphW1.z);
	p = MorphOne(p, morphIdx1.w, morphW1.w);
	return p;
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

	
	var morphPos : CVec3 = f3_ver;
	BranchBegin("morph","MP",[morphTex,morphInfo,morphIdx0,morphIdx1,morphW0,morphW1]);
	morphPos = ApplyMorph(f3_ver);
	BranchEnd();
	var P : CVec4 = new CVec4(morphPos, 1.0);
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

	to_envIdx.x = -1.0;
	BranchBegin("env","E",[envCount,envPos]);
	to_envIdx.x = EnvNearest(to_worldPos.xyz, to_normal);
	BranchEnd();
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

	var morphPos : CVec3 = f3_ver;
	BranchBegin("morph","MP",[morphTex,morphInfo,morphIdx0,morphIdx1,morphW0,morphW1]);
	morphPos = ApplyMorph(f3_ver);
	BranchEnd();
	var P : CVec4 = new CVec4(morphPos, 1.0);
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

// 수직 깊이 -> 해안선까지 수평 거리 배율(cot). 완만한 해변은 얕은 깊이가 넓게 퍼져 거품이 띠처럼 넓어지므로 보정한다
function ShoreSlopeScale(_nor : CVec3) : number
{
    var ny : number = abs(_nor.y);
    return clamp(ny / max(sqrt(SaturateFloat(1.0 - ny * ny)), 0.001), 1.0, 40.0);
}

//_lit: 물색·거품에 곱할 밝기(감마 공간). 이 색들은 조명을 안 받는 고정색이라 안 곱하면 밤에도 밝다
function WaterProcessing(_color : CVec3, _caustics : CVec3, _world : CVec4, _slope : number, _lit : CVec3) : CVec3
{
    var deep : CVec3 = V3MulV3(deepColor, _lit);
	var shallow : CVec3 = V3MulV3(shallowColor, _lit);
    var heightDiff : number = abs(waterDeep.x - _world.y);

    var depthBlend : number = 1.0 - SaturateFloat(heightDiff / waterDeep.y);
    var dist : number = V3Len(V3SubV3(camPos, _world.xyz));
    var t : number = smoothstep(waterUnderFadeDist.x, waterUnderFadeDist.y, dist);
    var luma : number = (_color.x * 0.299 + _color.y * 0.587 + _color.z * 0.114);   // 바닥 색상이 너무 약하면 물리적으로는 맞는데 시각적으로 이상해 보여서 곱해줌

    var shoreNoise : number = NoiseGet(new CVec3(_world.x / 400.0, _world.z / 400.0, time * 0.05), SDF.eNoise.Perlin);
    var waveK : number = SaturateFloat(V2Len(normalflowDir) / 1.5);
    var lap : number = 0.5 + 0.5 * sin(time * (0.5 + 1.5 * waveK) + shoreNoise * 12.0);
    // waterRefract 패스가 waterDeep.z 위를 discard하므로 띠가 그보다 두꺼워지면 윗부분이 잘린다
    var foamThreshold : number = min(waterDeep.z, min(waterDeep.z, waterDeep.z * waterHeight) * (0.4 + 0.9 * shoreNoise) * (0.6 + 0.6 * lap));
    var foamMask : number = 1.0 - smoothstep(0.0, foamThreshold, heightDiff * _slope);

    _color = V3Mix(deep, V3Mix(_color, shallow, 0.1), depthBlend);

    _caustics = V3MulFloat(_caustics, depthBlend * luma * (1.0 - foamMask));
    _color = V3AddV3(_color, _caustics);

    _color = V3Mix(deep, _color, 0.6 * (1.0 - t));

    // foam mask
    if(foamMask > 0.0) {
        var foam : CVec3 = V3MulV3(new CVec3(0.55, 0.58, 0.58), _lit);

        var noise : number = NoiseGet(new CVec3(
            _world.x / 120.0 + _world.y / 240.0 - normalflowDir.x * time * 0.1,
            _world.z / 120.0 - _world.y / 240.0 + normalflowDir.y * time * 0.1,
            time * 0.15
        ), SDF.eNoise.PerlinFBM);
        // 멀리서 노이즈 주기가 픽셀보다 작아지면 깜빡이므로 평균값으로 흐리고 경계를 넓힌다
        var foamLod : number = SaturateFloat(dist * 0.0012 / 50.0);
        noise = noise + (0.45 - noise) * foamLod;
        var edgeFade : number = foamMask * smoothstep(0.35 - 0.15 * foamLod, 0.65 + 0.15 * foamLod, noise + foamMask * 0.3) * smoothstep(0.0, 0.6, waveK);

        _color = V3AddV3(_color, V3MulFloat(foam, 0.2 * edgeFade));
        _color = V3Mix(_color, foam, 0.25 * edgeFade);
    }

    return _color;
}

function ps_main()
{
	var uvDx : CVec2 = dFdx(to_uv);
	var uvDy : CVec2 = dFdy(to_uv);
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
	BranchBegin("parallax","P",[parallaxNormal, camPos, parallaxDist, parallaxDepth]);
	uvh = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
	uv = uvh.xy;

	world.xyz = V3SubV3(world.xyz, V3MulFloat(
		V3Nor(V3SubV3(camPos, world.xyz)),
		parallaxDepth * V3Len(new CVec3(V2SubV2(uvh.xy,to_uv), parallaxNormal * uvh.z)) / max(1e-6, max(
			length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)),
			length(abs(dFdy(to_uv))) / length(dFdy(world.xyz))
		))
	));
	
	// depth offset 적용
	//깊이 출력을 쓰는 셰이더는 모든 경로에서 써야 한다(안 쓴 경로는 값이 정의되지 않음).
	//안 밀 때 비율 계산으로 다시 만들면 부동소수 오차로 같은 평면에 겹친 면과 z-fighting이 나서 원래 깊이를 그대로 쓴다
	if(parallaxNormal > 0.0001 && parallaxDepth > 0.0001) {
		ratio = V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])));
		screenDepth = SDF.ClipControl > 0
			? clamp(screenPos.z * ratio, 0.0, 1.0)
			: clamp(((screenPos.z * 2.0 - 1.0) * ratio) * 0.5 + 0.5, 0.0, 1.0);
	}
	else {
		screenDepth = screenPos.z;
	}	
	BranchEnd();

	BranchBegin("waterReflect","waterReflect",[waterDeep]);
	if(world.y <= waterDeep.x) discard;	// 물 높이보다 높은 것만 랜더링
	BranchEnd();

	BranchBegin("waterRefract","waterRefract",[waterDeep]);
	if(world.y > waterDeep.x + waterDeep.z) discard;	// 물 높이보다 낮은 것만 랜더링
	BranchEnd();

	var normal : CVec3 = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref,sam2DCount, uvDx, uvDy);

	var L_cor : CVec4;

	BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	L_cor=VFXDown2(uv,VFX,time,world);
	BranchDefault();
	L_cor=Sam2DGradToColor(to_ref.x, uv, uvDx, uvDy);
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
	var waterLit : CVec3 = new CVec3(1.0, 1.0, 1.0);
    var gamma : number = 1.0;
	BranchBegin("light","L",[ligDir,ligCol,ligMask,ligCount,camPos,material,emission,emissiveIntensity,cullMask,ligStep0,ligStep1,ligStep2,ligStep3,ambientColor,envmapOn,envCount,envPos,sam2DCount,samCubeCount]);
    gamma = 2.2;
    L_cor.rgb = V3MulV3(L_cor.rgb, L_cor.rgb);

	lmaterial=GetMaterial(material,Sam2DGradToColor(to_ref.z,uv,uvDx,uvDy),sam2DCount);
	dseMat = GetSunInfo();
	sunDir = dseMat[0];
	sunCol = dseMat[1];
	waterLit = SaturateV3(V3AddV3(ambientColor, sunCol));

	dseMat = LightCac3D(to_worldPos, L_cor, normal, shadow, cullMask.x, lmaterial.w, camPos, lmaterial.y, lmaterial.x, lmaterial.z, to_envIdx.x);
 
	L_cor.rgb = V3AddV3(V3AddV3(dseMat[0],dseMat[1]),dseMat[2]);
    
	BranchDefault();
	if(shadow.a > -0.5) {
		L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.r);
	}
	//L_cor.rgb = V3MulFloat(L_cor.rgb,shadow);
	BranchEnd();

	out_color=L_cor;

    BranchBegin("tonemapping","tonemapping",[exposure, tonemappingType]);
    out_color.rgb = Tonemap(out_color.rgb, exposure, tonemappingType);
    BranchEnd();

    if(gamma > 1.1) {
        out_color.rgb = V3Sqrt(out_color.rgb);
    }

    var caustics : CVec3;
	var shoreSlope : number = 1.0;
	BranchBegin("waterProcessing","waterProcessing",[waterDeep, waterUnderFadeDist, shallowColor, deepColor, causticFlowDir, causticFlowFreq, waterHeight, camPos, time, normalflowDir, normalRange]);
	caustics = Caustics(world.xyz, causticFlowDir,sunDir,sunCol);
	shoreSlope = ShoreSlopeScale(V3Nor(to_normal));
	out_color.rgb = WaterProcessing(out_color.rgb, caustics, world, shoreSlope, waterLit);
	// 알파에 수면 아래 깊이를 싣는다. 물 셰이더가 0.75 미만을 빈 픽셀로 보므로 0.8~1.0으로 인코딩
	// 8비트라 단계가 적어 접촉 거품에 계단이 생기므로, sqrt로 얕은 쪽에 정밀도를 몰아준다
	out_color.a = 0.8 + 0.2 * sqrt(SaturateFloat(max(waterDeep.x - world.y, 0.0) * shoreSlope / (max(waterDeep.z, 1.0) * 4.0)));
	BranchEnd();
}


function ps_main_gBuffer()
{
	var uv : CVec2 = to_uv;
	var uvDx : CVec2 = dFdx(to_uv);
	var uvDy : CVec2 = dFdy(to_uv);

    var world : CVec4 = to_worldPos;
    var view : CVec4 = to_viewPos;

    var uvh : CVec3;
    var ratio : number;
	BranchBegin("parallax","P",[parallaxNormal,camPos,parallaxDist,parallaxDepth]);
	uvh = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, to_worldPos, camPos, to_ref);
    uv = uvh.xy;

	world.xyz = V3SubV3(world.xyz, V3MulFloat(
		V3Nor(V3SubV3(camPos, world.xyz)),
		parallaxDepth * V3Len(new CVec3(V2SubV2(uvh.xy,to_uv), parallaxNormal * uvh.z)) / max(1e-6, max(
			length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)),
			length(abs(dFdy(to_uv))) / length(dFdy(world.xyz))
		))
	));

    view.xyz = V4MulMatCoordi(world, viewMat).xyz;

	// depth offset 적용
	//깊이 출력을 쓰는 셰이더는 모든 경로에서 써야 한다(안 쓴 경로는 값이 정의되지 않음).
	//안 밀 때 비율 계산으로 다시 만들면 부동소수 오차로 같은 평면에 겹친 면과 z-fighting이 나서 원래 깊이를 그대로 쓴다
	if(parallaxNormal > 0.0001 && parallaxDepth > 0.0001) {
		ratio = V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])));
		screenDepth = SDF.ClipControl > 0
			? clamp(screenPos.z * ratio, 0.0, 1.0)
			: clamp(((screenPos.z * 2.0 - 1.0) * ratio) * 0.5 + 0.5, 0.0, 1.0);
	}
	else {
		screenDepth = screenPos.z;
	}

	BranchEnd();

	var L_cor : CVec4;

	BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	L_cor=VFXDown2(uv,VFX,time,world);
	BranchDefault();
	if(sam2DCount == 1.0)
		L_cor = Sam2DGradToColor(0.0, uv, uvDx, uvDy);
	else
		L_cor = Sam2DGradToColor(to_ref.x, uv, uvDx, uvDy);
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
	out_pos = new CVec4(view.xyz, cullMask.x);

	// 1 normal
	var N : CVec3 = GetTangentSpaceNormal(uv, to_tangent, to_binormal, to_normal, to_ref, sam2DCount, uvDx, uvDy);
	out_nor = new CVec4(MappingV3ToTex(N), 1.0);

    // 3 material (ao, roughness, metalic, emissive)
    var lmaterial : CVec4=GetMaterial(material,Sam2DGradToColor(to_ref.z,uv,uvDx,uvDy),sam2DCount);
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

function vs_main_shadow_write(f3_ver : Vertex3,f4_wi : WeightIndexI4, f4_we : Weight4, f2_uv : UV2, f3_ref : TexOff3)
{
	to_ref=f3_ref;
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

	var morphPos : CVec3 = f3_ver;
	BranchBegin("morph","MP",[morphTex,morphInfo,morphIdx0,morphIdx1,morphW0,morphW1]);
	morphPos = ApplyMorph(f3_ver);
	BranchEnd();
	var P : CVec4 = new CVec4(morphPos, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();

    var viewPos : CVec4=V4MulMatCoordi(P,viewMat);
    out_position=V4MulMatCoordi(viewPos, projectMat);

    to_viewPos = viewPos;

    out_position.z = min(out_position.z, out_position.w);
}
function ps_main_shadow_write()
{
	//슬롯 0 고정이면 텍스처가 여러 장인 메시(나무: 껍질 다음 잎)는 잎이 껍질 알파로 판정돼 알파 0 영역까지 그림자가 생긴다
	var L_cor : CVec4 = Sam2DToColor(to_ref.x, to_uv);

	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();
	
    BranchBegin("alphaCut","AC",[alphaCut]);
    if ( L_cor.a <= alphaCut ) discard;
    BranchDefault();
    if ( L_cor.a <= 0.01 ) discard;
	BranchEnd();

    out_color = to_viewPos;
    out_color.z += shadowZOffset;
    out_color.a = 1.0;
}
function vs_main_shadow_read(f3_ver : Vertex3,f2_uv : UV2,f4_we : Weight4,f4_wi : WeightIndexI4,
	f3_nor : Normal3,f4_tan : Tangent4,f3_ref : TexOff3)
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

	var woweMat : CMat = wMat;
	BranchBegin("weightMat","WG",[weightArrMat,weightBakeMat,weightBakeIndex]);
	woweMat = GetWorldWeightMat(weightArrMat,weightBakeMat,weightBakeIndex, f4_we, f4_wi, wMat, skin);
	BranchEnd();
	
	var morphPos : CVec3 = f3_ver;
	BranchBegin("morph","MP",[morphTex,morphInfo,morphIdx0,morphIdx1,morphW0,morphW1]);
	morphPos = ApplyMorph(f3_ver);
	BranchEnd();
	var P : CVec4 = new CVec4(morphPos, 1.0);
	P = V4MulMatCoordi(P, woweMat);

	BranchBegin("wind","W",[windInfluence, windDir, windPos, windInfo, windCount, time]);
	P = ApplyWind(P, skin, f4_we, time);
	BranchEnd();

	to_worldPos = P;
	P = V4MulMatCoordi(P, viewMat);
    to_viewPos = P;
	BranchBegin("zDepth","Z",[zDepth,zDepthBias]);
	P.z+=zDepth*zDepthBias;
	BranchEnd();
	out_position = V4MulMatCoordi(P, projectMat);


	var nMat3 : CMat3;
	if(f3_ref.y > 0.0)	nMat3 = Mat4ToMat3(woweMat);
	else nMat3 = TransposeMat3(InverseMat3(Mat4ToMat3(woweMat)));

	to_normal  = V3Nor(V3MulMat3Normal(f3_nor,     nMat3).xyz);
	to_tangent = V3Nor(V3MulMat3Normal(f4_tan.xyz, nMat3).xyz);

	to_tangent = V3Nor(V3SubV3(to_tangent,V3MulFloat(to_normal, V3Dot(to_normal, to_tangent))));

	to_binormal = V3Nor(V3MulFloat(V3Cross(to_normal, to_tangent),f4_tan.w));

	to_ref=f3_ref;
}

function ps_main_shadow_read() 
{
    var temp : CVec3;
    var outputIndex: number;
    
	var uv : CVec2 = to_uv;
    var world : CVec4 = to_worldPos;
    var pShadow : CVec4 = new CVec4(1.0,1.0,1.0,1.0);
	BranchBegin("parallax","P",[parallaxNormal, camPos, parallaxDist, parallaxDepth]);
	temp = GetParallaxMappedUV(to_uv, to_tangent, to_binormal, to_normal, world, camPos, to_ref);
    uv = temp.xy;
	world.xyz = V3SubV3(world.xyz, V3MulFloat(
		V3Nor(V3SubV3(camPos, world.xyz)),
		parallaxDepth * V3Len(new CVec3(V2SubV2(temp.xy,to_uv), parallaxNormal * temp.z)) / max(1e-6, max(
			length(abs(dFdx(to_uv))) / length(dFdx(world.xyz)),
			length(abs(dFdy(to_uv))) / length(dFdy(world.xyz))
		))
	));
	screenDepth = screenPos.z;
	if(parallaxNormal > 0.0001) {
		if(parallaxDepth > 0.0001) {
			temp.x = V3Dot(V3SubV3(to_worldPos.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]))) / V3Dot(V3SubV3(world.xyz, camPos), V3Nor(new CVec3(viewMat[0][2], viewMat[1][2], viewMat[2][2])));
			screenDepth = SDF.ClipControl > 0
				? clamp(screenPos.z * temp.x, 0.0, 1.0)
				: clamp(((screenPos.z * 2.0 - 1.0) * temp.x) * 0.5 + 0.5, 0.0, 1.0);
		}

        outputIndex = 0.0;
        pShadow = new CVec4(0.0,0.0,0.0,0.0);
        for(var i=0;i<SDF.TexSizeMax;++i) {
            if(i >= FloatToInt(shadowCount)) break;
            var psv : number = CalcParallaxShadow(IntToFloat(i), world, uv, to_ref, parallaxNormal, to_tangent, to_binormal, to_normal);
            pShadow[FloatToInt(outputIndex)] = i > 3 ? min(pShadow.a, psv) : psv;
            outputIndex = min(outputIndex + 1.0, 3.0);
        }
	}
	BranchEnd();

	var L_cor : CVec4;

	BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	L_cor=VFXDown2(uv,VFX,time,world);
	BranchDefault();
	//ps_main_shadow_write와 같은 이유로 슬롯 0 고정 금지. 텍스처가 여러 장인 메시(풀 줄기 다음 꽃·잎 카드)는 카드가 불투명 슬롯 알파로 판정돼 투명 영역까지 그림자 읽기에 찍힌다
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
	
	var dsv : number;
    var dShadow : CVec4 = new CVec4(1.0,1.0,1.0,1.0);
	BranchBegin("shadowMulti","SDM",[]);
    outputIndex = 0.0;
    dShadow = new CVec4(0.0,0.0,0.0,0.0);
    for(var i=0;i<SDF.TexSizeMax;++i) {
        if(i >= FloatToInt(shadowCount)) break;
        dsv = CalcShadow(IntToFloat(i), to_normal, world, camPos, to_viewPos.xyz);
        dShadow[FloatToInt(outputIndex)] = i > 3 ? min(dShadow.a, dsv) : dsv;
        outputIndex = min(outputIndex + 1.0, 3.0);
    }
	BranchDefault();
    dShadow.r = CalcShadow(0.0, to_normal, world, camPos, to_viewPos.xyz);
    dShadow.rgb = new CVec3(dShadow.r, dShadow.r, dShadow.r);   // 하나만 사용하기 때문에 rgba 같은값으로 넣어줌
    dShadow.a = 1.0;
	BranchEnd();

    out_color = V4Min(dShadow, pShadow);
}