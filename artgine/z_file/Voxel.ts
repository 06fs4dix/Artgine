
import { AlphaModalFun, vfxMat0, vfxMat1, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, VFX, VFXDown2 } from "./ColorFun";
import { DecalCac, decalInvWorldMat, decalParam } from "./Decal";
import { ambientColor, ligCol, ligCount, ligDir, LightCac2D, ligMask, cullMask, LightCac3D, material, ligStep0, ligStep1, ligStep2, ligStep3, envmapOn, sam2DCount, samCubeCount } from "./Light";
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
	BranchDefault,
	ToV2,
	UV2,
	V4MulFloat,
	V4Mix,
	Attribute,
	Sam2DArrToV4,
	Sam2DArrToMat,
    min,
    max,
    V3Len,
    V3SubV3,
    V3Nor,
} from "./Shader"
import { 
	bias, normalBias, PCF, shadowCount, shadowRate, shadowWrite, texture16f,
	shadowBottomCasP1, shadowFarCasP0, shadowLeftCasV2, shadowNearCasV0, 
	shadowPointProj, shadowRightCasP2, shadowTopCasV1,
	jitter,
	shadowReadList,
    CalcShadow, 
} from "./Shadow";

var size : number=100;
var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();
var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();

var camPos: CVec3=Null();

var out_position : OutPosition=Null();
var out_color : OutColor=Null();

var to_uv : ToV4=Null();
var to_viewPos : ToV4=Null();
var to_shadowBias : ToV1=Null();
var to_worldPos : ToV4=Null();
var to_normal : ToV3=Null();

var screenSize : CVec2;

var shadowOn : number = -1.0;
var sun : number=1.0;

var time : number=Attribute(0,"time");

Build("Artgine/Shader/Voxel",[],
	vs_main,[worldMat,viewMat,projectMat,colorModel,alphaModel,size,shadowOn,sun],[out_position,to_uv,to_worldPos,to_normal],
    ps_main,[out_color]
);
	
Build("Artgine/Shader/VoxelShadowWrite",["shadowWrite"],
	vs_main_shadow_write,[
		worldMat,viewMat,projectMat,colorModel,alphaModel,size,
		ligDir,ligCol,ligCount,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowCount,
		shadowWrite,shadowPointProj,shadowReadList,
		shadowRate,PCF,texture16f,bias,normalBias
	],[out_position,to_uv,to_viewPos,to_shadowBias],
    ps_main_shadow_write,[out_color]
);

Build("Artgine/Shader/VoxelShadowRead",["shadowRead"],
	vs_main_shadow_read,[
		worldMat,viewMat,projectMat,colorModel,alphaModel,size,
		ligDir,ligCol,ligCount,
		shadowNearCasV0,shadowFarCasP0,shadowTopCasV1,shadowBottomCasP1,shadowLeftCasV2,shadowRightCasP2,shadowCount,
		shadowWrite,shadowPointProj,shadowReadList,
		shadowRate,PCF,texture16f,bias,normalBias,sun,jitter
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
	

	light*=data[2].z;
	if(f4_uv.w<-0.5)
	{
		to_uv.xyz=f4_uv.xyz;
		to_uv.w=-light;
	}
		
	else
		to_uv.w=light;

    to_normal = data[1];

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
		BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
		L_cor=VFXDown2(to_uv.xy,VFX,time,to_worldPos);
		BranchDefault();
		L_cor=Sam2DToColor(0.0,to_uv.xy);
		BranchEnd();
	}




	L_cor.rgb=V3MulFloat(L_cor.rgb,light);
	
	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();

    var shadow : CVec4 = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow","S",[shadowOn, screenSize]);
    if(shadowOn>0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, V2DivV2(screenPos.xy, screenSize.xy));  // <- 여기! 절대 size 곱하지 말기
    }
    BranchEnd();

	var DSE : CMat3=new CMat3(0);
	BranchBegin("light","L",[ligDir,ligCol,ligMask,ligCount,camPos,material,ligStep0,ligStep1,ligStep2,ligStep3,ambientColor,envmapOn,sam2DCount,samCubeCount,cullMask]);
	DSE = LightCac3D(camPos,to_worldPos,L_cor,to_normal,shadow,material.y,material.x,material.z,cullMask.x);
	L_cor.rgb=V3AddV3(DSE[0],DSE[1]);
    BranchDefault();
    if(shadow.r > -0.5) {
		L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.r);
	}
	BranchEnd();

	out_color=L_cor;
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

    P = V4MulMatCoordi(P, worldMat);

	var svm : CMat=new CMat(0);
	var spm : CMat=new CMat(0);
    BranchBegin("PointLightShadowV","PLSV",[]);
    if(shadowWrite.x<SDF.eShadow.Near + 0.5)
        svm = Sam2DArrToMat(shadowNearCasV0,shadowWrite.y);
    else if(shadowWrite.x<SDF.eShadow.Far + 0.5)
        svm = Sam2DArrToMat(shadowFarCasP0,shadowWrite.y);
    else if(shadowWrite.x<SDF.eShadow.Top + 0.5)
        svm = Sam2DArrToMat(shadowTopCasV1,shadowWrite.y);
    else if(shadowWrite.x<SDF.eShadow.Bottom + 0.5)
        svm = Sam2DArrToMat(shadowBottomCasP1,shadowWrite.y);
    else if(shadowWrite.x<SDF.eShadow.Left + 0.5)
        svm = Sam2DArrToMat(shadowLeftCasV2,shadowWrite.y);
    else if(shadowWrite.x<SDF.eShadow.Right + 0.5)
        svm = Sam2DArrToMat(shadowRightCasP2,shadowWrite.y);
    to_viewPos = P;
    out_position = V4MulMatCoordi(P, svm);
    BranchDefault();
    if(shadowWrite.x<SDF.eShadow.Cas0 + 0.5) {
        svm =Sam2DArrToMat(shadowNearCasV0,shadowWrite.y);
        svm[0][3] = 0.0;
        spm =Sam2DArrToMat(shadowFarCasP0,shadowWrite.y);
    }
    else if(shadowWrite.x<SDF.eShadow.Cas1 + 0.5) {
        svm =Sam2DArrToMat(shadowTopCasV1,shadowWrite.y);
        svm[0][3] = 0.0;
        spm =Sam2DArrToMat(shadowBottomCasP1,shadowWrite.y);
    }
    else if(shadowWrite.x<SDF.eShadow.Cas2 + 0.5) {
        svm =Sam2DArrToMat(shadowLeftCasV2,shadowWrite.y);
        svm[0][3] = 0.0;
        spm =Sam2DArrToMat(shadowRightCasP2,shadowWrite.y);
    }
    to_viewPos = V4MulMatCoordi(P, svm);
    out_position = V4MulMatCoordi(to_viewPos, spm);
	BranchEnd();

    // pancacking
    out_position.z = min(out_position.z, out_position.w);
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

	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();
	if ( L_cor.a <= 0.01 ) discard;

    var shadowRead: CVec4;
    var lDir: CVec4;
    BranchBegin("PointLightShadowF","PLSF",[ligDir]);
    shadowRead = Sam2DArrToV4(shadowReadList, shadowWrite.y);
    lDir = Sam2DArrToV4(ligDir, shadowRead.x);
    out_color.b = (V3Len(V3SubV3(to_viewPos.xyz, lDir.xyz)) - shadowRead.z) / (shadowRead.w - shadowRead.z);
    out_color.a = 1.0;
    BranchDefault();
    out_color = to_viewPos;
    BranchEnd();
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
	

	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();
	if ( L_cor.a <= 0.01 ) discard;

	var outputIndex: number;
    var all : CVec4=new CVec4(1.0,1.0,1.0,1.0);
	BranchBegin("shadowMulti","SDM",[alphaModel]);
	outputIndex = 0.0;
    all = new CVec4(0.0,0.0,0.0,0.0);
    for(var i=0;i<SDF.TexSizeMax;++i) {
        if(i >= FloatToInt(shadowCount)) break;
        all[FloatToInt(outputIndex)] += CalcShadow(IntToFloat(i), V3Nor(to_normal), to_worldPos);
        outputIndex = min(outputIndex + 1.0, 3.0);
    }
    all.a /= max(shadowCount - 3.0, 1.0);
	BranchDefault();
	all.r = CalcShadow(0.0, V3Nor(to_normal), to_worldPos);
    all.rgb = new CVec3(all.r, all.r, all.r);
    all.a = 1.0;
	BranchEnd();
	
	out_color = all;
}