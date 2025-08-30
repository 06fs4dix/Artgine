import { ColorModelCac } from "./ColorFun";
import { ambientColor, ligCol, ligCount, ligDir, LightCac2D } from "./Light";
import { SDF } from "./SDF";
import { 
	Build, CMat, CVec2, CVec3, CVec4, CMat3, OutColor, OutPosition,   
    Sam2DToColor, Sam2DToMat, Sam2DV4, Sam2DToV4, Sam2DSize,
	FloatToInt, IntToFloat, screenPos,
	discard, Vertex4, UV4, ToV1, ToV4, ToV3, Color2,
	V2DivV2,
	V3AddV3, V3MulFloat,
	V4MulMatCoordi,
	Null,
	BranchBegin,
	BranchEnd,
} from "./Shader"
import { 
	bias, normalBias, PCF, shadowCount, shadowRate, shadowWrite, texture16f,
	shadowBottomCasP1, shadowFarCasP0, shadowLeftCasV2, shadowNearCasV0, 
	shadowPointProj, shadowRightCasP2, shadowTopCasV1, dotCac,
	calcShadow, 
} from "./Shadow";

var size : number=100;
var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();
var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();

var out_position : OutPosition=Null();
var out_color : OutColor=Null();

var to_uv : ToV4=Null();
var to_viewPos : ToV4=Null();
var to_shadowBias : ToV1=Null();
var to_worldPos : ToV4=Null();
var to_normal : ToV3=Null();

var shadowReadList: Sam2DV4=new Sam2DV4(9);
var shadowOn : number = -1.0;
var sun : number=0.0;

Build("Voxel",[],
	vs_main,[worldMat,viewMat,projectMat,colorModel,alphaModel,size,shadowOn,sun],[out_position,to_uv,to_worldPos],
    ps_main,[out_color]
);
	
Build("VoxelShadowWrite",["shadowWrite"],
	vs_main_shadow_write,[
		worldMat,viewMat,projectMat,colorModel,alphaModel,size,
		ligDir,ligCol,ligCount,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowCount,
		shadowWrite,shadowPointProj,shadowReadList,
		shadowRate,PCF,texture16f,bias,normalBias
	],[out_position,to_uv,to_viewPos,to_shadowBias],
    ps_main_shadow_write,[out_color]
);

Build("VoxelShadowRead",["shadowRead"],
	vs_main_shadow_read,[
		worldMat,viewMat,projectMat,colorModel,alphaModel,size,
		ligDir,ligCol,ligCount,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowCount,
		shadowWrite,shadowPointProj,shadowReadList,
		shadowRate,PCF,texture16f,bias,normalBias,sun,dotCac
	],[out_position,to_uv,to_normal,to_worldPos],
	ps_main_shadow_read,[out_color]
);

//P,N,UV
function VoxelDirData(_dir : number,_f4_uv : CVec4) : CMat3
{
	var data : CMat3=new CMat3(0);
	if(_dir<9.0)
	{
		data[1]=new CVec3(0.0,1.0,0.0);
		if(_dir-0.0<0.5)
		{
			data[0]=new CVec3(0,size,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.y,1.0);
		}
		else if(_dir-0.0<1.5)
		{
			data[0]=new CVec3(size,size,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.w,1.0);
		}
		else if(_dir-0.0<2.5)
		{
			data[0]=new CVec3(size,size,0);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,1.0);
		}
		else if(_dir-0.0<3.5)
		{
			data[0]=new CVec3(size,size,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.w,1.0);
		}
		else if(_dir-0.0<4.5)
		{
			data[0]=new CVec3(0,size,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.y,1.0);
		}
		else if(_dir-0.0<5.5)
		{
			data[0]=new CVec3(0,size,size);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,1.0);
		}
		
	}
	else if(_dir<19.0)
	{
		data[1]=new CVec3(0.0,-1.0,0.0);
		if(_dir-10.0<0.5)
		{
			data[0]=new CVec3(0,0,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,1.0);
		}
		else if(_dir-10.0<1.5)
		{
			data[0]=new CVec3(size,0,0);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.w,1.0);
		}
		else if(_dir-10.0<2.5)
		{
			data[0]=new CVec3(size,0,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,1.0);
		}
		else if(_dir-10.0<3.5)
		{
			data[0]=new CVec3(0,0,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,1.0);
		}
		else if(_dir-10.0<4.5)
		{
			data[0]=new CVec3(size,0,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,1.0);
		}
		else if(_dir-10.0<5.5)
		{
			data[0]=new CVec3(0,0,size);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.y,1.0);
		}
		
	}
	else if(_dir<29.0)
	{
		data[1]=new CVec3(-1.0,0.0,0.0);
		if(_dir-20.0<0.5)
		{
			data[0]=new CVec3(0,0,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,0.8);
		}
		else if(_dir-20.0<1.5)
		{
			data[0]=new CVec3(0,0,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.w,0.8);	
		}
		else if(_dir-20.0<2.5)
		{
			data[0]=new CVec3(0,size,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.y,0.8);
		}
		else if(_dir-20.0<3.5)
		{
			data[0]=new CVec3(0,size,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.y,0.8);
		}
		else if(_dir-20.0<4.5)
		{
			data[0]=new CVec3(0,0,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.w,0.8);
		}
		else if(_dir-20.0<5.5)
		{
			data[0]=new CVec3(0,size,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,0.8);
		}
		
	}
	else if(_dir<39.0)
	{
		data[1]=new CVec3(1.0,0.0,0.0);
		if(_dir-30.0<0.5)
		{
			data[0]=new CVec3(size,0,0);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.w,0.8);
		}
		else if(_dir-30.0<1.5)
		{
			data[0]=new CVec3(size,size,0);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,0.8);
		}
		else if(_dir-30.0<2.5)
		{
			data[0]=new CVec3(size,0,size);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,0.8);
		}
		else if(_dir-30.0<3.5)
		{
			data[0]=new CVec3(size,size,0);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,0.8);
		}
		else if(_dir-30.0<4.5)
		{
			data[0]=new CVec3(size,size,size);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.y,0.8);
		}
		else if(_dir-30.0<5.5)
		{
			data[0]=new CVec3(size,0,size);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,0.8);
		}
	}
	else if(_dir<49.0)
	{
		data[1]=new CVec3(0.0,0.0,-1.0);
		if(_dir-40.0<0.5)
		{
			data[0]=new CVec3(0,0,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,0.9);
		}
		else if(_dir-40.0<1.5)
		{
			data[0]=new CVec3(size,size,0);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,0.9);
		}
		else if(_dir-40.0<2.5)
		{
			data[0]=new CVec3(size,0,0);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.w,0.9);
		}
		else if(_dir-40.0<3.5)
		{
			data[0]=new CVec3(0,size,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.y,0.9);
		}
		else if(_dir-40.0<4.5)
		{
			data[0]=new CVec3(size,size,0);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,0.9);
		}
		else if(_dir-40.0<5.5)
		{
			data[0]=new CVec3(0,0,0);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,0.9);
		}
		
	}
	else if(_dir<59.0)
	{
		data[1]=new CVec3(0.0,0.0,1.0);
		if(_dir-50.0<0.5)
		{
			data[0]=new CVec3(0,0,size);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,1.0);
		}
		else if(_dir-50.0<1.5)
		{
			data[0]=new CVec3(size,0,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.w,1.0);
		}
		else if(_dir-50.0<2.5)
		{
			data[0]=new CVec3(size,size,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,1.0);
		}
		else if(_dir-50.0<3.5)
		{
			data[0]=new CVec3(0,size,size);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.y,1.0);
		}
		else if(_dir-50.0<4.5)
		{
			data[0]=new CVec3(0,0,size);
			data[2]=new CVec3(_f4_uv.x,_f4_uv.w,1.0);
		}
		else if(_dir-50.0<5.5)
		{
			data[0]=new CVec3(size,size,size);
			data[2]=new CVec3(_f4_uv.z,_f4_uv.y,1.0);
		}
		
	}
	return data;
}

//uv에서 w값이 0보다 작으면 컬러값으로 사용한다
function vs_main(f4_ver : Vertex4,f4_uv : UV4,f2_color : Color2)
{
	if(f4_ver.w>65.0)
	{
		out_position=new CVec4(0.0,0.0,0.0,0.0);
		to_uv=new CVec4(0.0,0.0,0.0,2.0);
		return;
	}

	var data : CMat3=VoxelDirData(f4_ver.w,f4_uv);
	var P : CVec4=new CVec4(f4_ver.xyz,1.0);
	P.xyz=V3AddV3(P.xyz,data[0]);
	to_uv.xyz=data[2];
	var light : number=f2_color.x*sun;

	if(light<f2_color.y)	light=f2_color.y;
	

	if(f4_uv.w<-0.5)
	{
		to_uv.xyz=f4_uv.xyz;
		to_uv.w=-light;
	}
		
	else
		to_uv.w=light;


	P=V4MulMatCoordi(P,worldMat);
	to_worldPos=P;
	P=V4MulMatCoordi(P,viewMat);
	P=V4MulMatCoordi(P,projectMat);
	
	out_position=P;
}



function ps_main()
{
	var L_cor : CVec4=new CVec4(0.0,0.0,0.0,1.0);
	var light : number =to_uv.w;
	//렌더링 패스
	if(to_uv.w>1.5)
	{
		discard;
		return;
	}
	
	//음수 컬러모드 
	else if(light<-0.5)
	{
		L_cor.xyz=to_uv.xyz;
		light=-light;
	}
	else
	{
		L_cor=Sam2DToColor(0.0,to_uv.xy);
	}
	//L_cor.rgb=V3MulFloat(L_cor.rgb,light);
	

	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	var DSE : CMat3=new CMat3(0);
	BranchBegin("light","L",[ligDir,ligCol,ligCount,ambientColor]);
	DSE =LightCac2D(to_worldPos,L_cor,new CVec3(0.0,0.0,0.0),ambientColor);
	L_cor.rgb=DSE[0];
	BranchEnd();
    
	// if ( L_cor.a <= 0.1 ) 
	// 	discard;


	var shadow : number = 1.0;
	if(shadowOn > 0.5) {
		var shadowSize : CVec2 = Sam2DSize(shadowOn);
		shadow = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, shadowSize)).x;
	}
	else 
	{
		shadow=1.0;
	}
	L_cor.xyz=V3MulFloat(L_cor.xyz,shadow);

	out_color=L_cor;




	//out_color=new CVec4(1.0,1.0,1.0,1.0);
}


function vs_main_shadow_write(f4_ver : Vertex4,f4_uv : UV4,f2_color : Color2)
{
	var data : CMat3=VoxelDirData(f4_ver.w,f4_uv);
	var P : CVec4=new CVec4(f4_ver.xyz,1.0);
	P.xyz=V3AddV3(P.xyz,data[0]);
	to_uv.xyz=data[2];

	if(f4_uv.w<-0.5)
	{
		to_uv.xyz=f4_uv.xyz;
		to_uv.w=-f2_color.x;
	}
		
	else
		to_uv.w=f2_color.x;

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
	
	P = V4MulMatCoordi(P, worldMat);
	P = V4MulMatCoordi(P, svm);
	to_viewPos = P;
	P = V4MulMatCoordi(P, spm);
	out_position = P;
}
function ps_main_shadow_write()
{
	var L_cor : CVec4=new CVec4(0.0,0.0,0.0,1.0);
	if(to_uv.w>1.5)
	{
		discard;
		return;
	}
	else if(to_uv.w>0.5)
	{
		L_cor=Sam2DToColor(0.0,to_uv.xy);	
	}
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	
    
	if ( L_cor.a <= 0.1 ) 
		discard;
	out_color=to_viewPos;
}

function vs_main_shadow_read(f4_ver : Vertex4,f4_uv : UV4,f2_color : Color2)
{
	
	var data : CMat3=VoxelDirData(f4_ver.w,f4_uv);
	var P : CVec4=new CVec4(f4_ver.xyz,1.0);
	P.xyz=V3AddV3(P.xyz,data[0]);
	to_uv.xyz=data[2];

	var light : number=f2_color.x*sun;
	if(light<f2_color.y)	light=f2_color.y;

	if(f4_uv.w<-0.5)
	{
		to_uv.xyz=f4_uv.xyz;
		to_uv.w=-light;
	}
		
	else
		to_uv.w=light;
	

	P = V4MulMatCoordi(P, worldMat);
	to_worldPos = P;
	to_normal = data[1];
	
	P = V4MulMatCoordi(P, viewMat);
	out_position = V4MulMatCoordi(P, projectMat);
}
function ps_main_shadow_read()
{
	

	var L_cor : CVec4=new CVec4(0.0,0.0,0.0,1.0);
	if(to_uv.w>1.5)
	{
		discard;
		return;
	}
	else if(to_uv.w<-0.5)
	{
		L_cor.xyz=to_uv.xyz;
		L_cor.rgb=V3MulFloat(L_cor.rgb,-to_uv.w);
	}
	else
	{
		L_cor=Sam2DToColor(0.0,to_uv.xy);
		L_cor.rgb=V3MulFloat(L_cor.rgb,to_uv.w);
		L_cor.rgb=V3MulFloat(L_cor.rgb,to_uv.z);
		
	}
	L_cor=ColorModelCac(L_cor,colorModel,alphaModel);
	
    
	if ( L_cor.a <= 0.1 ) 
		discard;

	var all : number=0.0;
	for(var i = 0; i < FloatToInt(shadowCount); i++) {
		var shadowRead : CVec4=Sam2DToV4(shadowReadList,i);
		var sVal : number = calcShadow(shadowRead, IntToFloat(i),to_normal,to_worldPos);
		all+=sVal;
		//all=all-(1.0-sVal);
		
	}
	all/=shadowCount;
	if(all<0.0)all=0.0;
	out_color = new CVec4(all,all,all,1.0);

	
}