import { 
	Build, CMat, CVec2, CVec3, CVec4, CMat3, OutColor, OutPosition,
	ToV2, ToV3, ToV4, UV2, Vertex3, Attribute, Null,
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
	Sam2DArrNearestToV4,
	Vertex2,
    V2AddV2,
    smoothstep,
    V3Abs,
    V3Sqrt,
    V3MulV3,
    FloatToInt,
    IntToFloat,
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
	LightCac2D,
    ligMask,
    cullMask
} from "./Light";
import { shadowOn, shadowRate, shadowWrite } from "./Shadow";
import { 
	GetWind, windCount, windDir, windInfluence, windInfo, windPos 
} from "./Wind";
import { SDF } from "./SDF";

var worldMat : CMat=Null();
var worldMatShort : CVec4=Null();
var worldMatType : number=0.0;

var viewMat : CMat=Null();
var projectMat : CMat=Null();

var billboard : number=Null();
var billboardMat : CMat=Null();

var texCodi : CVec4=Null();

var alphaCut : number = 0.01;

var colorModel : CVec4=Null();
var alphaModel : CVec2=Null();

var out_position : OutPosition=Null();
var out_color : OutColor=Null();

var to_uv : ToV3=Null();
var to_worldPos : ToV4=Null();

// cutout : 캐릭터 주위를 원형으로 뚫어 가려진 캐릭터가 비쳐 보이게 한다
// cutoutPos  xy=기준(캐릭터 발밑) 월드좌표, z=구멍 반경, w=구멍 안 알파 배율
var cutoutPos : CVec4=Null();
var to_cutout : ToV2=Null();

// shadowHeight : 2D 그림자를 눕힐 때 쓸 몸 높이(월드 단위). 그림자는 원래 쿼드 높이를 키로 알고 눕히는데,
// ULPC 오버사이즈 포즈는 프레임을 배율만큼 키워 그 가운데에 몸을 그린다(CParserULPC scale → CPaint2D.SetSca).
// 그대로 두면 그림자가 발밑에서 떨어져 밀린다. "shadowHeight" 태그가 붙은 페인트만 이 값을 쓰고,
// 나머지는 기본 경로라 유니폼을 읽지 않는다(직전 드로우 값이 남아 섞일 일이 없다).
var shadowHeight : number=Null();

var time : number=Attribute(0,"time");
var mask: number=1.0;
var lastHide : number=Null();
var trailPos: Sam2DArrV4=new Sam2DArrV4(1);

var screenSize : CVec2;

//depthmap
var zDepth : number=0.0;
var zDepthBias : number=0.001;
var sam2DCount : number=Null();

Build("Artgine/Shader/2DPlane",[],
	vs_main,[
		worldMat,
		viewMat,projectMat,
	],[
		out_position,to_uv,to_worldPos,to_cutout
	],ps_main,[out_color]
);

Build("Artgine/Shader/2DTail",["tail"],
	vs_main_tail,[
		worldMat,viewMat,projectMat,
	],[
		out_position,to_uv,to_worldPos,to_cutout
	],ps_main,[out_color]
);
Build("Artgine/Shader/2DTrail",["trail"],
	vs_main_trail,[
		worldMat,viewMat,projectMat,trailPos,lastHide,texCodi,
	],[
		out_position,to_uv,to_worldPos,to_cutout
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
		out_position,to_uv,to_worldPos,to_cutout
	],ps_main_mask,[out_color]
);
Build("Artgine/Shader/2DBlit",["blit"],vs_main_blit,[

	],[
		out_position,to_uv
	],ps_main_blit,[out_color]
);

function vs_main_blit(f3_ver : Vertex3, f2_uv : UV2)
{
	out_position = new CVec4(V2MulFloat(f3_ver.xy, 2.0), 1.0, 1.0);
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
	var dir : CVec3;
	var dist : number;
    BranchBegin("shadowPlaneV","SPV",[ligDir, ligCol, ligCount, shadowWrite, shadowRate]);
    if(shadowWrite.x > ligCount - 0.5) {
        to_uv.z *= 0.0;
    }
    else {
        lDir =Sam2DArrNearestToV4(ligDir,shadowWrite.x);
        lCol =Sam2DArrNearestToV4(ligCol,shadowWrite.x);

        to_uv.z *= max(lCol.r, max(lCol.g, lCol.b)) * shadowRate;

		dir = lDir.xyz;
        if(lDir.w > 0.5) {    // point light
            dir = V3SubV3(rpos.xyz, dir);
        }
        dir = V3Nor(dir);

		if(f2_uv.y > 0.5) {
			rpos.y -= size.y;
            rpos.xy = V2AddV2(rpos.xy, V2MulFloat(dir.xy, size.y * (1.0 + dir.y * 0.1)));
            rpos.z -= 0.1; // z fighting 막기 위해 뒤로 조금 보냄
        }

		if(lDir.w > 0.5) {    // point light
			dist = V3Len(V3SubV3(rpos.xyz, lDir.xyz));
			to_uv.z *= 1.0 - max(0.0, (dist - lCol.w) / (lDir.w - lCol.w));
        }
    }
    BranchEnd();

	BranchBegin("cutout","CO",[cutoutPos]);
	to_cutout.x = mid.y - size.y * 0.5;
	to_cutout.y = size.y;
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
    var tpos : CVec4=Sam2DArrNearestToV4(trailPos, f2_ver.x);
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
	// 트레일은 컷아웃 대상이 아니므로 판정에서 항상 빠지게 둔다
	BranchBegin("cutout","CO",[cutoutPos]);
	to_cutout.x = 1000000.0;
	to_cutout.y = 0.0;
	BranchEnd();
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

	var wMat : CMat;
	BranchBegin("worldType","WT",[worldMatType,worldMatShort]);
	wMat=MatTypeToMat(worldMatType,worldMatShort,worldMat);
	BranchDefault();
	wMat=worldMat;
	BranchEnd();
	
    var isMerge : number;
    var isVertexBot : number;
    var isVertexLeft : number;
	var size : CVec3;
    BranchBegin("merge","MG",[]);
    isMerge = 1.0;
    isVertexLeft = f3_sca.x < 0.0 ? 1.0 : 0.0;
    isVertexBot = f3_sca.y < 0.0 ? 1.0 : 0.0;
    size = V3Abs(f3_sca);
    BranchDefault();
    isMerge = 0.0;
    isVertexLeft = f3_sca.x < 0.0 ? 1.0 : 0.0;
    isVertexBot = f3_ver.y < 0.0 ? 1.0 : 0.0;
    size = new CVec3(V3Len(wMat[0].xyz)*1.0,V3Len(wMat[1].xyz)*1.0,V3Len(wMat[2].xyz)*1.0);
    BranchEnd();

    var origin: CVec3;
	BranchBegin("billboard","B",[billboard,billboardMat]);
	if(billboard>0.5)
	{
        if(isMerge > 0.5) {
            origin = new CVec3(isVertexLeft > 0.5 ? -0.5 : 0.5, isVertexBot > 0.5 ? -0.5 : 0.5, 0.0);
            P = new CVec4(origin, 1.0);
        }
        P.xyz = V3MulV3(P.xyz, size);
		P = V4MulMatCoordi(P, billboardMat);

        if(isMerge > 0.5)
            P.xyz = V3AddV3(P.xyz, V3SubV3(f3_ver, V3MulV3(origin, size)));
        else
            P.xyz = V3AddV3(P.xyz, wMat[3].xyz);
	}
	else
		P = V4MulMatCoordi(P, wMat);
	BranchDefault();
	P = V4MulMatCoordi(P, wMat);
	BranchEnd();

	// 바람/그림자로 P가 흔들리기 전에 이 스프라이트의 바닥 y(YSort 기준)를 기록해 둔다.
	// 머지는 정점이 이미 월드라 부호 있는 scale로, 비머지는 월드행렬의 이동+높이로 구한다.
	BranchBegin("cutout","CO",[cutoutPos]);
	to_cutout.x = isMerge > 0.5 ? (isVertexBot > 0.5 ? P.y : P.y - size.y) : (wMat[3].y - size.y * 0.5);
	to_cutout.y = size.y;
	BranchEnd();

	BranchBegin("wind","W",[windDir, windPos, windInfo, windCount, windInfluence, time]);
	if(isVertexBot < 0.5 && windInfluence > 0.01) {
		P.xyz = V3AddV3(P.xyz, GetWind(P.xyz, size, time));
	}
	BranchEnd();

    var lDir : CVec4;
    var lCol : CVec4;
	var dir : CVec3;
	var dist : number;

	// 몸 높이 / 쿼드 높이. 1이면 쿼드가 곧 몸이다(프리팹처럼 그림에 맞춰 자른 스프라이트).
	var shadowH : number;
	BranchBegin("shadowHeight","SH",[shadowHeight]);
	shadowH = min(1.0, shadowHeight / max(size.y, 0.0001));
	BranchDefault();
	shadowH = 1.0;
	BranchEnd();

    BranchBegin("shadowPlaneV","SPV",[ligDir, ligCol, ligCount, shadowWrite, shadowRate]);
    if(shadowWrite.x > ligCount - 0.5) {
        to_uv.z *= 0.0;
    }
    else {
        lDir =Sam2DArrNearestToV4(ligDir,shadowWrite.x);
        lCol =Sam2DArrNearestToV4(ligCol,shadowWrite.x);

        to_uv.z *= max(lCol.r, max(lCol.g, lCol.b)) * shadowRate;

		dir = lDir.xyz;
        if(lDir.w > 0.5) {    // point light
            dir = V3SubV3(P.xyz, dir);
        }
        dir = V3Nor(dir);

        // 몸이 프레임 세로 가운데에 있다고 보고 발밑(쿼드 중심 - 몸높이/2)을 접지점으로 삼는다.
        // 위 정점은 발밑까지 내려 빛 방향으로 눕히고, 아래 정점은 발밑까지 올려 반대쪽으로 민다 —
        // 그래야 텍스처 속 발이 접지점에 붙는다. shadowH=1이면 아래 정점은 그대로라 예전과 같다.
        if(isVertexBot < 0.5) {
            P.y -= size.y * (1.0 + shadowH) * 0.5;
            P.xy = V2AddV2(P.xy, V2MulFloat(dir.xy, size.y * (1.0 + dir.y * 0.1) * (1.0 + shadowH) * 0.5));
            P.z -= 0.1; // z fighting 막기 위해 뒤로 조금 보냄
        }
        else {
            P.y += size.y * (1.0 - shadowH) * 0.5;
            P.xy = V2AddV2(P.xy, V2MulFloat(dir.xy, size.y * (1.0 + dir.y * 0.1) * (shadowH - 1.0) * 0.5));
        }

		if(lDir.w > 0.5) {    // point light
			dist = V3Len(V3SubV3(P.xyz, lDir.xyz));
			to_uv.z *= 1.0 - max(0.0, (dist - lCol.w) / (lDir.w - lCol.w));
        }
    }

    BranchEnd();
	
	to_worldPos=P;
	P=V4MulMatCoordi(P,viewMat);
	out_position=V4MulMatCoordi(P, projectMat);
}

function ps_main()
{
    var shadow : CVec4 = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow","S",[shadowOn, screenSize]);
    if(shadowOn>0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, V2DivV2(screenPos.xy, screenSize.xy));  // <- 여기! 절대 size 곱하지 말기
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

	// cutout : YSort상 기준점보다 앞에 그려지는(바닥 y가 더 낮은) 스프라이트만 뚫는다
	// 바닥이 기준선보다 아래인 스프라이트만 뚫는다. 캐릭터 자신은 바닥이 기준선이라 제외된다.
	// DSL이 중첩 블록 안의 discard / 복합대입을 제대로 만들지 못해, 계산만 안에서 하고 적용은 밖에서 한다.
	// 반경(z)이 0 이하면 꺼짐. 0으로 나누지 않도록 반경을 최소 1로 묶고 결과를 스위치로 죽인다.
	// 브랜치 안에서는 변수 선언이 금지되어 있어 선언은 전부 밖에서 한다.
	var coOn : number = 0.0;
	var coR : number = 1.0;
	var coFront : number = 0.0;
	var coX : number = 0.0;
	var coY : number = 0.0;
	var coD : number = 0.0;
	var coIn : number = 0.0;
	var coCover : number = 0.0;
	BranchBegin("cutout","CO",[cutoutPos]);
	coOn = cutoutPos.z > 0.0 ? 1.0 : 0.0;
	coR = max(cutoutPos.z, 1.0);
	// 앞에 그려지고(바닥이 더 낮고) 스프라이트 윗변이 기준선을 넘어야 = 실제로 캐릭터를 가린다
	coFront = to_cutout.x < cutoutPos.y ? 1.0 : 0.0;
	coCover = (to_cutout.x + to_cutout.y) > cutoutPos.y ? 1.0 : 0.0;
	// 기준선은 발밑이라 원 중심을 그대로 쓰면 아래로 치우친다. 반경에 비례해 몸통 높이로 올린다.
	coX = (to_worldPos.x - cutoutPos.x) / coR;
	coY = (to_worldPos.y - (cutoutPos.y + coR * 0.5)) / coR;
	coD = coX * coX + coY * coY;
	coIn = coD < 1.0 ? 1.0 : 0.0;
	L_cor.a = L_cor.a * (1.0 - coOn * coFront * coCover * coIn * (1.0 - cutoutPos.w));
	BranchEnd();

    BranchBegin("alphaCut","AC",[alphaCut]);
    if ( L_cor.a <= alphaCut ) discard;
    BranchDefault();
    if ( L_cor.a <= 0.01 ) discard;
    BranchEnd();

	var normal : CVec3=new CVec3(0.0,0.0,0.0);
	BranchBegin("normalMap","N",[sam2DCount]);
	if(sam2DCount>1.0)
	{
		normal=Sam2DToColor(1.0,to_uv.xy).xyz;
		normal=MappingTexToV3(normal);
	}
	BranchEnd();

    var gamma : number = 1.0;
	var DSE : CMat3=new CMat3(0);
	BranchBegin("light","L",[ligDir,ligCol,ligMask,ligCount,cullMask,ambientColor]);
    gamma = 2.2;
    L_cor.rgb = V3MulV3(L_cor.rgb, L_cor.rgb);

	DSE =LightCac2D(to_worldPos,L_cor,normal,shadow,cullMask.x);
	L_cor.rgb=DSE[0];
    BranchDefault();
    if(shadow.r > -0.5) {
		L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.r);
	}
	BranchEnd();
	
	out_color=L_cor;

    if(gamma > 1.1) {
        out_color.rgb = V3Sqrt(out_color.rgb);
    }
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
	
    BranchBegin("alphaCut","AC",[alphaCut]);
    if ( L_cor.a <= alphaCut ) discard;
    BranchDefault();
    if ( L_cor.a <= 0.01 ) discard;
    BranchEnd();
	
	L_cor.a=L_cor.a*mask;
	out_color=L_cor;
}