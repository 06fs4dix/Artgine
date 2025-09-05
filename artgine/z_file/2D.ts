import { 
	Build, CMat, CVec2, CVec3, CVec4, CMat3, OutColor, OutPosition,
	ToV1, ToV2, ToV4, UV2, Vertex3,
	LWVPMul, discard, screenPos,
	Sam2D0ToColor, Sam2DToColor, Sam2DToV4, Sam2DV4, Sam2DSize,
	V2MulFloat, V2DivV2,
	V3AddV3, V3Len, V3MulFloat, V3SubV3,
	V4MulMatCoordi, 
	BranchBegin, BranchEnd, BranchDefault,
	Attribute, Null,
	MappingTexToV3,Mat34ToMat,
	ToV3,
	max,
	min,
	CMat12,
	CMat34,
} from "./Shader"
import {
	ColorModelCac, ColorVFX, GetTexCodiedUV
} from "./ColorFun";
import {
	ambientColor,
	ligCol,
	ligCount,
	ligDir,
	LightCac2D
} from "./Light";
import { shadowOn } from "./Shadow";
import { NoisePerlin2D } from "./Noise";
import { 
	GetWind, windCount, windDir, windInfluence, windInfo, windPos 
} from "./Wind";

var worldMat : CMat=Null();
var worldMat34 : CMat34=Null();

var viewMat : CMat=Null();
var projectMat : CMat=Null();

var billboard : number=Null();
var billboardMat : CMat=Null();

var texCodi : CVec4=Null();
var reverse : CVec2=new CVec2(0,0);

var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();
var colorVFX : CMat=Null();
var alphaCut : number=0.1;

var out_position : OutPosition=Null();
var out_color : OutColor=Null();

var to_uv : ToV3=Null();
var to_worldPos : ToV4=Null();


var time : number=Attribute(0,"time");
var mask: number=1.0;
var lastHide : number=Null();
var trailPos: Sam2DV4=new Sam2DV4(9);

//depthmap
var depthMap : number = 0.0;
var screenResolution : CVec2=new CVec2(1.0, 1.0);
var sam2DCount : number=Null();

Build("2DPlane",[],
	vs_main,[
		worldMat,viewMat,projectMat,texCodi,reverse,
	],[
		out_position,to_uv,to_worldPos
	],ps_main,[out_color]
);

Build("2DTail",["tail"],
	vs_main_tail,[
		worldMat,viewMat,projectMat,texCodi,reverse,
	],[
		out_position,to_uv,to_worldPos
	],ps_main,[out_color]
);
Build("2DTrail",["trail"],
	vs_main_trail,[
		worldMat,viewMat,projectMat,texCodi,reverse,trailPos,lastHide,
	],[
		out_position,to_uv,to_worldPos
	],ps_main,[out_color]
);
Build("2DSimple",["simple"],
	vs_main_simple,[
		worldMat,viewMat,projectMat
	],[
		out_position,to_uv
	],ps_main_simple,[out_color]
);
Build("2DMask",["mask"],
	vs_main,[
		worldMat,viewMat,projectMat,texCodi,reverse,mask
	],[
		out_position,to_uv,to_worldPos
	],ps_main_mask,[out_color]
);
Build("2DBlit",["blit"],vs_main_blit,[

	],[
		out_position,to_uv
	],ps_main_blit,[out_color]
);

function vs_main_blit(f3_ver : Vertex3, f2_uv : UV2)
{
	out_position = new CVec4(V2MulFloat(f3_ver.xy, 0.2), 0.0, 1.0);
	to_uv = new CVec3(f2_uv, 1.0);
}
function ps_main_blit()
{
	out_color = Sam2D0ToColor(to_uv.xy);
}
function vs_main_simple(f3_ver : Vertex3,f2_uv : UV2)
{
	to_uv = new CVec3(f2_uv, 1.0);
	var wMat : CMat;
	BranchBegin("wasm","WASM",[worldMat34]);
	wMat=Mat34ToMat(worldMat34);
	BranchDefault();
	wMat=worldMat;
	BranchEnd();

	out_position=LWVPMul(f3_ver,wMat,viewMat,projectMat);	
}
function ps_main_simple()
{
    var L_cor : CVec4=Sam2D0ToColor(to_uv.xy);
	BranchBegin("alphaCut","A",[alphaCut]);
	if ( L_cor.a <= alphaCut ) discard;
	BranchEnd();
	out_color=L_cor;
}

function vs_main_tail(f3_ver : Vertex3,f2_uv : UV2)
{
    to_uv = GetTexCodiedUV(f2_uv, texCodi,reverse);	
	
	var rpos : CVec4=new CVec4(f3_ver.xyz,1.0);	

	
	//left bot
	if(f2_uv.x<0.5 && f2_uv.y<0.5)
	{
		rpos.xyz=worldMat[2].xyz;
		if(worldMat[2].w<0.5)
			to_uv.z=0.0;
	}
	//left top
	else if(f2_uv.x<0.5 && f2_uv.y>0.5)
	{
		rpos.xyz=worldMat[0].xyz;
		if(worldMat[0].w<0.5)
			to_uv.z=0.0;
	}
	//right bot
	else if(f2_uv.x>0.5 && f2_uv.y<0.5)
	{
		rpos.xyz=worldMat[3].xyz;
		if(worldMat[3].w<0.5)
			to_uv.z=0.0;
	}
	//right top
	else
	{
		rpos.xyz=worldMat[1].xyz;
		if(worldMat[1].w<0.5)
			to_uv.z=0.0;
	}
	var size : CVec3;
	BranchBegin("wind","W",[windDir, windPos, windInfo, windCount, windInfluence, time]);
	if(f2_uv.y > 0.5 && windInfluence > 0.01) {
		//왼쪽 버텍스와 오른쪽 버텍스가 같은 크기만큼 움직이게 하기 위해서 둘의 사이값 사용
		//rpos.xyz = V3AddV3(rpos.xyz, GetWind(V3MulFloat(V3AddV3(worldMat[0].xyz, worldMat[1].xyz), 0.5), time));

		size = new CVec3(
			max(worldMat[0].x, worldMat[1].x) - min(worldMat[2].x, worldMat[3].x), 
			max(worldMat[1].y, worldMat[3].y) - min(worldMat[0].y, worldMat[2].y),
			0.0
		);
		//왼쪽 버텍스와 오른쪽 버텍스가 같은 크기만큼 움직이게 하기 위해서 둘의 사이값 사용
		rpos.xyz = V3AddV3(
			rpos.xyz, GetWind(V3MulFloat(V3AddV3(worldMat[2].xyz, worldMat[3].xyz), 0.5), size,time)
		);
	}
	BranchEnd();

	var center : CVec3 = new CVec3(0.0,0.0,0.0);
	BranchBegin("billboard","B",[billboard,billboardMat]);
	if(billboard>0.5)
	{
		center = V3AddV3(V3AddV3(V3AddV3(worldMat[0].xyz, worldMat[1].xyz), worldMat[2].xyz), worldMat[3].xyz);
		center = V3MulFloat(center, 0.25);
		
		//world pos를 빼줘서 원하는 위치에서 로테이션, 스케일 함
		rpos.xyz = V3SubV3(rpos.xyz, center);
		rpos = V4MulMatCoordi(rpos, billboardMat);
		rpos.xyz = V3AddV3(rpos.xyz, center);
	}
	BranchEnd();

	to_worldPos=rpos;
	rpos=V4MulMatCoordi(rpos,viewMat);
	rpos=V4MulMatCoordi(rpos,projectMat);
	
	out_position=rpos;
}
function vs_main_trail(f3_ver : Vertex3)
{
	var tpos : CVec4=Sam2DToV4(trailPos,f3_ver.z);
	to_uv = new CVec3(tpos.w*texCodi.x,f3_ver.y,1.0);
	if(tpos.w>1.0)
		to_uv.z = 0.0;
	else if(lastHide<0.5)
		to_uv.z = 1.0;
	else
		to_uv.z = tpos.w;

	

	var rpos : CVec4=new CVec4(tpos.xyz,1.0);
	to_worldPos=rpos;
	rpos=V4MulMatCoordi(rpos,viewMat);
	rpos=V4MulMatCoordi(rpos,projectMat);
	
	out_position=rpos;
}

function vs_main(f3_ver : Vertex3,f2_uv : UV2)
{
	to_uv = GetTexCodiedUV(f2_uv, texCodi, reverse);


	var P : CVec4 = new CVec4(f3_ver, 1.0);
	
	var scaleX :number=0.0;
	var scaleY :number=0.0;
	var scaleZ :number=0.0;

	var wMat : CMat;
	BranchBegin("wasm","WASM",[worldMat34]);
	wMat=Mat34ToMat(worldMat34);
	BranchDefault();
	wMat=worldMat;
	BranchEnd();
	
	BranchBegin("billboard","B",[billboard,billboardMat]);
	if(billboard>0.5)
	{
		scaleX = V3Len(wMat[0].xyz);
		scaleY = V3Len(wMat[1].xyz);
		scaleZ = V3Len(wMat[2].xyz);
		P.x*=scaleX;
		P.y*=scaleY;
		P.z*=scaleZ;
		P = V4MulMatCoordi(P, billboardMat);

		P.x+=wMat[3].x;
		P.y+=wMat[3].y;
		P.z+=wMat[3].z;
	}
	else
		P = V4MulMatCoordi(P, wMat);
	BranchDefault();
	P = V4MulMatCoordi(P, wMat);
	BranchEnd();

	to_worldPos=P;
	P=V4MulMatCoordi(P,viewMat);
	out_position=V4MulMatCoordi(P, projectMat);
}

function ps_main()
{
	var shadowTex : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
	var shadow : number=-1.0;
	BranchBegin("shadow","S",[shadowOn]);
	if(shadowOn>0.5)
	{
		shadowTex = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
		shadow = shadowTex.x;
	}
	BranchEnd();

    var L_cor : CVec4=Sam2DToColor(0.0,to_uv.xy);
	L_cor.a *= to_uv.z;

	BranchBegin("color","C",[colorModel,alphaModel]);
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	BranchEnd();

	BranchBegin("vfx","V",[colorVFX,time]);
	L_cor=ColorVFX(L_cor,to_uv.xy,colorVFX,time);
	BranchEnd();

	BranchBegin("alphaCut","A",[alphaCut]);
	if ( L_cor.a <= alphaCut ) discard;
	BranchEnd();
	

	var normal : CVec3=new CVec3(0.0,0.0,0.0);
	
	BranchBegin("normalMap","N",[sam2DCount]);
	if(sam2DCount>1.0)
	{
		normal=Sam2DToColor(1.0,to_uv.xy).xyz;
		normal=MappingTexToV3(normal);
	}
	BranchEnd();
	var DSE : CMat3=new CMat3(0);
	BranchBegin("light","L",[ligDir,ligCol,ligCount,ambientColor]);
	DSE =LightCac2D(to_worldPos,L_cor,normal,ambientColor);
	L_cor.rgb=DSE[0];
	BranchEnd();
	
	if(shadow > -0.5) {
		L_cor.rgb = V3MulFloat(L_cor.rgb,shadow);
	}
	
	out_color=L_cor;
}

function ps_main_mask()
{
    var L_cor : CVec4=Sam2D0ToColor(to_uv.xy);
	BranchBegin("alphaCut","A",[alphaCut]);
	if ( L_cor.a <= alphaCut ) discard;
	BranchEnd();
	L_cor.a=mask;
	out_color=L_cor;
}