import { 
	Build, CMat, CVec2, CVec3, CVec4, CMat3, OutColor, OutPosition,
	ToV3, ToV4, UV2, Vertex3, Attribute, Null,
	LWVPMul, discard, screenPos,
	Sam2D0ToColor, Sam2DToColor, Sam2DSize,
	max, min,
	V2MulFloat, V2DivV2,
	V3AddV3, V3Len, V3MulFloat, V3SubV3, V3Cross, V3Nor,
	V4MulMatCoordi, 
	BranchBegin, BranchEnd, BranchDefault,
	MappingTexToV3, MatTypeToMat,
    V2Abs,
	Sam2DArrV4,
	Sam2DArrToV4,
	Vertex2,
    V2AddV2,
    smoothstep,
    V3Abs,
} from "./Shader";
import {
	VFX, VFXDown2, GetTexCodiedUV,
	LUT0, LUT1, LUT2, LUT3, LUT4, LUT5,
	ColorModalFun, AlphaModalFun,
	vfxMat0,
	vfxMat1
} from "./ColorFun";
import {
	ambientColor,
	ligCol, ligDir, ligCount,
	LightCac2D
} from "./Light";
import { shadowOn, shadowRate } from "./Shadow";
import { 
	GetWind, windCount, windDir, windInfluence, windInfo, windPos 
} from "./Wind";

var worldMat : CMat=Null();
var worldMatShort : CVec4=Null();
var worldMatType : number=0.0;

var viewMat : CMat=Null();
var projectMat : CMat=Null();

var billboard : number=Null();
var billboardMat : CMat=Null();

var texCodi : CVec4=Null();


var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();

var out_position : OutPosition=Null();
var out_color : OutColor=Null();

var to_uv : ToV3=Null();
var to_worldPos : ToV4=Null();

var time : number=Attribute(0,"time");
var mask: number=1.0;
var lastHide : number=Null();
var trailPos: Sam2DArrV4=new Sam2DArrV4(1);

//depthmap
var zDepth : number=0.0;
var zDepthBias : number=0.001;
var sam2DCount : number=Null();

// 2d shadow
var lightIndex : number;

Build("Artgine/Shader/2DPlane",[],
	vs_main,[
		worldMat,
		viewMat,projectMat,
	],[
		out_position,to_uv,to_worldPos
	],ps_main,[out_color]
);

Build("Artgine/Shader/2DTail",["tail"],
	vs_main_tail,[
		worldMat,viewMat,projectMat,
	],[
		out_position,to_uv,to_worldPos
	],ps_main,[out_color]
);
Build("Artgine/Shader/2DTrail",["trail"],
	vs_main_trail,[
		worldMat,viewMat,projectMat,trailPos,lastHide,texCodi,
	],[
		out_position,to_uv,to_worldPos
	],ps_main,[out_color]
);
Build("Artgine/Shader/2DSimple",["simple"],
	vs_main_simple,[
		worldMat,
		viewMat,projectMat
	],[
		out_position,to_uv
	],ps_main_simple,[out_color]
);
Build("Artgine/Shader/2DMask",["mask"],
	vs_main,[
		worldMat,
		viewMat,projectMat,mask
	],[
		out_position,to_uv,to_worldPos
	],ps_main_mask,[out_color]
);
Build("Artgine/Shader/2DBlit",["blit"],vs_main_blit,[

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
	BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
	wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
	BranchDefault();
	wMat=worldMat;
	BranchEnd();
	

	out_position=LWVPMul(f3_ver,wMat,viewMat,projectMat);	
}
function ps_main_simple()
{
    var L_cor : CVec4=Sam2D0ToColor(to_uv.xy);
	// BranchBegin("alphaCut","A",[alphaCut]);
	// if ( L_cor.a <= alphaCut ) discard;
	// BranchEnd();
	out_color=L_cor;
}

function vs_main_tail(f3_ver : Vertex3,f2_uv : UV2)
{
	BranchBegin("codi","C",[texCodi]);
    to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);	
	BranchDefault();
	to_uv.xy=f2_uv;
	BranchEnd();
	to_uv.z=1.0;

	var rpos : CVec4=new CVec4(f3_ver,1.0);	// 이거빼니까 랜더링이 안됨. 뭐지?
	var size : CVec3;
	var mid : CVec3;
	var nor : CVec3;
	BranchBegin("billboard","B",[billboard,billboardMat]);
	if(billboard>0.5)
	{
		if(billboard<1.5)
		{
			nor = V3Nor(V3Cross(new CVec3(-viewMat[0][2],-viewMat[1][2],-viewMat[2][2]), V3SubV3(worldMat[0].xyz, worldMat[1].xyz)));
			if(f2_uv.x<0.5 && f2_uv.y<0.5) {	// left bot
				rpos.xyz=V3SubV3(V3AddV3(worldMat[1].xyz,worldMat[3].xyz),V3MulFloat(nor,worldMat[2].x*0.5));
				if(worldMat[2].w<0.5) to_uv.z=0.0;
			}
			else if(f2_uv.x<0.5 && f2_uv.y>0.5) {	// left top
				rpos.xyz=V3SubV3(V3AddV3(worldMat[0].xyz,worldMat[3].xyz),V3MulFloat(nor,worldMat[2].x*0.5));
				if(worldMat[0].w<0.5) to_uv.z=0.0;
			}
			else if(f2_uv.x>0.5 && f2_uv.y<0.5) {	// right bot
				rpos.xyz=V3AddV3(V3AddV3(worldMat[1].xyz,worldMat[3].xyz),V3MulFloat(nor,worldMat[2].x*0.5));
				if(worldMat[3].w<0.5) to_uv.z=0.0;
			}
			else {	// right top
				rpos.xyz=V3AddV3(V3AddV3(worldMat[0].xyz,worldMat[3].xyz),V3MulFloat(nor,worldMat[2].x*0.5));
				if(worldMat[1].w<0.5) to_uv.z=0.0;
			}
			mid = V3MulFloat(V3AddV3(worldMat[0].xyz, worldMat[1].xyz),0.5);
			size = new CVec3(worldMat[2].xy, 0.0);
		}
		else if(billboard<2.5)
		{
			if(f2_uv.x<0.5 && f2_uv.y<0.5) {	//left bot
				rpos.xyz = worldMat[2].xyz;
				if(worldMat[2].w < 0.5) to_uv.z=0.0;
			}
			else if(f2_uv.x<0.5 && f2_uv.y>0.5) {	//left top
				rpos.xyz = worldMat[0].xyz;
				if(worldMat[0].w < 0.5) to_uv.z=0.0;
			}
			else if(f2_uv.x>0.5 && f2_uv.y<0.5) {	//right bot
				rpos.xyz = worldMat[3].xyz;
				if(worldMat[3].w < 0.5) to_uv.z=0.0;
			}
			else {	//right top
				rpos.xyz = worldMat[1].xyz;
				if(worldMat[1].w < 0.5) to_uv.z=0.0;
			}
			mid = V3MulFloat(V3AddV3(V3AddV3(V3AddV3(worldMat[0].xyz, worldMat[1].xyz), worldMat[2].xyz), worldMat[3].xyz),0.25);
			size = new CVec3(
				max(worldMat[0].x, worldMat[1].x) - min(worldMat[2].x, worldMat[3].x), 
				max(worldMat[1].y, worldMat[3].y) - min(worldMat[0].y, worldMat[2].y),
				0.0
			);
			rpos.xyz = V3SubV3(rpos.xyz, mid);
			rpos = V4MulMatCoordi(rpos, billboardMat);
			rpos.xyz = V3AddV3(rpos.xyz, mid);
		}
	}
	BranchDefault();
	if(f2_uv.x<0.5 && f2_uv.y<0.5) {	//left bot
		rpos.xyz = worldMat[2].xyz;
		if(worldMat[2].w < 0.5) to_uv.z=0.0;
	}
	else if(f2_uv.x<0.5 && f2_uv.y>0.5) {	//left top
		rpos.xyz = worldMat[0].xyz;
		if(worldMat[0].w < 0.5) to_uv.z=0.0;
	}
	else if(f2_uv.x>0.5 && f2_uv.y<0.5) {	//right bot
		rpos.xyz = worldMat[3].xyz;
		if(worldMat[3].w < 0.5) to_uv.z=0.0;
	}
	else {	//right top
		rpos.xyz = worldMat[1].xyz;
		if(worldMat[1].w < 0.5) to_uv.z=0.0;
	}
	mid = V3MulFloat(V3AddV3(V3AddV3(V3AddV3(worldMat[0].xyz, worldMat[1].xyz), worldMat[2].xyz), worldMat[3].xyz),0.25);
	size = new CVec3(
		max(worldMat[0].x, worldMat[1].x) - min(worldMat[2].x, worldMat[3].x), 
		max(worldMat[1].y, worldMat[3].y) - min(worldMat[0].y, worldMat[2].y),
		0.0
	);
	BranchEnd();

	BranchBegin("wind","W",[windDir, windPos, windInfo, windCount, windInfluence, time]);
	if(f2_uv.y > 0.5 && windInfluence > 0.01) {
		rpos.xyz = V3AddV3(rpos.xyz, GetWind(mid, size, time));
	}
	BranchEnd();
	
	var lDir : CVec4;
    var lCol : CVec4;
    BranchBegin("shadowPlaneV","SPV",[ligDir, ligCol, ligCount, lightIndex, shadowRate]);
    if(lightIndex < ligCount) {
        lDir = Sam2DArrToV4(ligDir,lightIndex);
        lCol = Sam2DArrToV4(ligCol,lightIndex);

        to_uv.z *= max(max(lCol.x, lCol.y), lCol.z) * shadowRate;

        if(lDir.w > 0.5) {    // point light
            lDir.xyz = V3SubV3(mid, lDir.xyz);
            if(V3Len(lDir.xyz) <= lCol.w) to_uv.z *= 1.0;
            else if(V3Len(lDir.xyz) >= lDir.w) to_uv.z *= 0.0;
            else to_uv.z *= 1.0 - smoothstep(0.0, 1.0, (V3Len(lDir.xyz) - lCol.w) / (lDir.w - lCol.w));
        }
        lDir.xyz = V3Nor(lDir.xyz);

        if(f2_uv.y > 0.5) {
            rpos.y -= size.y;

            rpos.xy = V2AddV2(rpos.xy, V2MulFloat(lDir.xy, size.y * (1.0 + lDir.y * 0.1)));
            rpos.z -= 0.1; // z fighting 막기 위해 뒤로 조금 보냄
        }
    } else {
        rpos.xyz = new CVec3(0.0, 0.0, 0.0);
    }
    BranchEnd();

	to_worldPos=rpos;
	rpos=V4MulMatCoordi(rpos,viewMat);
	rpos=V4MulMatCoordi(rpos,projectMat);
	BranchBegin("zDepth","Z",[zDepth,zDepthBias]);
	rpos.z+=zDepth*zDepthBias;
	BranchEnd();
	out_position=rpos;
}
function vs_main_trail(f2_ver : Vertex2)
{
    var tpos : CVec4=Sam2DArrToV4(trailPos, f2_ver.x);
    var rawUV : CVec2 = new CVec2(1.0-tpos.w,(f2_ver.y + 1.0) * 0.5);

	BranchBegin("codi","C",[texCodi]);
	to_uv.xy = GetTexCodiedUV(rawUV, texCodi);
	BranchDefault();
	to_uv.xy = rawUV;
	BranchEnd();

	if(lastHide<0.5)
		to_uv.z = 1.0;
	else
		to_uv.z = tpos.w;

	var rpos : CVec4=new CVec4(tpos.xyz,1.0);
	to_worldPos=rpos;
	rpos=V4MulMatCoordi(rpos,viewMat);
	rpos=V4MulMatCoordi(rpos,projectMat);
	
	out_position=rpos;
}

function vs_main(f3_ver : Vertex3,f2_uv : UV2,f3_sca : Vertex3)
{
    var uv : CVec2 = f2_uv;
	BranchBegin("codi","C",[texCodi]);
    to_uv.xy = GetTexCodiedUV(V2Abs(f2_uv), texCodi);	
	BranchDefault();
	to_uv.xy=V2Abs(f2_uv);
	BranchEnd();
	to_uv.z=1.0;

    // codi 적용된 상태로 메시를 새로 만든 페인트를 위해 음수이면 0으로 변환
	uv = new CVec2(f2_uv.x < 0.0 ? 0.0 : 1.0, f2_uv.y < 0.0 ? 0.0 : 1.0);


	var P : CVec4 = new CVec4(f3_ver, 1.0);
	
	var scaleX :number=0.0;
	var scaleY :number=0.0;
	var scaleZ :number=0.0;

	var wMat : CMat;
	BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
	wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
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

    var isVertexTop : number;
	var size : CVec3;
    BranchBegin("merge","MG",[]);
    isVertexTop = f3_sca.x < 0.0 ? 1.0 : 0.0;
    size = V3Abs(f3_sca);
    BranchDefault();
    isVertexTop = f2_uv.y > 0.5 ? 1.0 : 0.0;
    size = new CVec3(V3Len(wMat[0].xyz)*10.0,V3Len(wMat[1].xyz)*10.0,0.0);
    BranchEnd();
    
	BranchBegin("wind","W",[windDir, windPos, windInfo, windCount, windInfluence, time]);
	if(isVertexTop > 0.5 && windInfluence > 0.01) {
		P.xyz = V3AddV3(P.xyz, GetWind(P.xyz, size, time));
	}
	BranchEnd();

    var lDir : CVec4;
    var lCol : CVec4;
    BranchBegin("shadowPlaneV","SPV",[ligDir, ligCol, ligCount, lightIndex, shadowRate]);
    if(lightIndex < ligCount) {
        lDir = Sam2DArrToV4(ligDir,lightIndex);
        lCol = Sam2DArrToV4(ligCol,lightIndex);

        to_uv.z *= max(max(lCol.x, lCol.y), lCol.z) * shadowRate;

        if(lDir.w > 0.5) {    // point light
            lDir.xyz = V3SubV3(P.xyz, lDir.xyz);
            if(V3Len(lDir.xyz) <= lCol.w) to_uv.z *= 1.0;
            else if(V3Len(lDir.xyz) >= lDir.w) {
                to_uv.z *= 0.0;
                return; // 랜더링 안되는 그림자
            }
            else to_uv.z *= 1.0 - smoothstep(0.0, 1.0, (V3Len(lDir.xyz) - lCol.w) / (lDir.w - lCol.w));
        }
        lDir.xyz = V3Nor(lDir.xyz);

        if(isVertexTop > 0.5) {
            P.y -= size.y;

            P.xy = V2AddV2(P.xy, V2MulFloat(lDir.xy, size.y * (1.0 + lDir.y * 0.1)));
            P.z -= 0.1; // z fighting 막기 위해 뒤로 조금 보냄
        }
    } else {
        return; // 랜더링 안되는 그림자
    }
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

    var L_cor : CVec4;

	BranchBegin("vfx","VFX",[VFX,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,time,vfxMat0,vfxMat1]);
	L_cor=VFXDown2(to_uv.xy,VFX,time,to_worldPos);
	BranchDefault();
	L_cor=Sam2DToColor(0.0,to_uv.xy);
	BranchEnd();

	L_cor.a *= to_uv.z;

	BranchBegin("colorModel","CM",[colorModel]);
	L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
	BranchEnd();
	
	BranchBegin("shadowPlaneF","SPF",[]);
    L_cor.rgb=new CVec3(0.0, 0.0, 0.0);
    BranchEnd();


	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();
	if ( L_cor.a <= 0.01 ) discard;



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
	DSE =LightCac2D(to_worldPos,L_cor,normal);
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
	
	BranchBegin("colorModel","CM",[colorModel]);
	L_cor.rgb=ColorModalFun(L_cor.rgb,colorModel);
	BranchEnd();


	BranchBegin("alphaModel","AM",[alphaModel]);
	L_cor.a=AlphaModalFun(L_cor.a,alphaModel);
	BranchEnd();
	if ( L_cor.a <= 0.01 ) discard;
	
	L_cor.a=mask;
	out_color=L_cor;
}