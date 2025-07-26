import { Binormal3, Build, CMat, CVec2, CVec3, CVec4,  FloatMulMat,  LWVPMul,
	Mat4ToMat3, MatAdd, MatMul,  Normal3,  OutColor, OutPosition, RGBAAdd, TexOff3,
	Sam2DToColor, Sam2DToMat, Sam2DToV4, Tangent4, UV2,  V3AddV3, V3Dot,
	V3Nor, Vertex3, Weight4, WeightIndexI4, discard, V4MulMatCoordi,
	V3MulMat3Normal, CMat3,  TransposeMat3, V3ToMat3, 
	ParallaxNormal, Sam2DMat, Sam2DV4, FloatToInt, 
	MappingTexToV3, Sam2D0ToColor, Sam2DSize, IntToFloat, V2DivV2, 
	screenPos, InverseMat3, MappingV3ToTex, Mat3ToMat4, abs, SaturateFloat, pow, clamp, V3SubV3,
	ToV2,
	ToV3,
	ToV4,
	ToV1,
	Instance4,
	Instance16,
	Instance1,
	Shadow2,
	V2SubV2,
	V2MulFloat,
	V2AddV2,
	V4Fract,
	Null} from "../../../artgine/z_file/shader"

import {
	SDF
} from "../../../artgine/z_file/SDF";

var worldMat : CMat;
var viewMat : CMat;
var projectMat : CMat;
var out_position : OutPosition;
var out_color : OutColor;
var to_uv : ToV2=Null();

Build("TestShader",[],vs_main,[worldMat,viewMat,projectMat],[out_position],ps_main,[out_color]);
Build("TestShaderUV",[],vs_main_uv,[worldMat,viewMat,projectMat],[out_position,to_uv],ps_main_uv,[out_color]);

function vs_main(f3_ver : Vertex3)
{
	out_position=LWVPMul(f3_ver,worldMat,viewMat,projectMat);
}
function ps_main()
{
    
	
	out_color=new CVec4(1.0,1.0,1.0,1.0);
}

function vs_main_uv(f3_ver : Vertex3,f2_ver : UV2)
{
	out_position=LWVPMul(f3_ver,worldMat,viewMat,projectMat);
	to_uv=f2_ver;
}
function ps_main_uv()
{
    
	var L_cor : CVec4=Sam2D0ToColor(to_uv);

	if(L_cor.a <= 0.1)
	{
		discard;
	}

	out_color=L_cor;
}