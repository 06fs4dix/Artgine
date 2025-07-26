import { 
	Build, CMat, CVec2, CVec3, CVec4,  OutColor, OutPosition,  
    Sam2DToColor,
	V4MulMatCoordi,
	ToV2, UV2, ToV3, Vertex3,
	V3Floor, V2MulV2, Sam2DV4,
	Null
} from "./Shader"


var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();
var brushType : number=0;
var brushInner : number=0;
var brushOuter : number=0;
var brushPos : CVec3=new CVec3(0,0,0);
var size : number=0;
var installTile: Sam2DV4 = new Sam2DV4(9);

var out_position : OutPosition=Null();
var out_color : OutColor=Null();

var to_uv : ToV2=Null();
var to_pos : ToV3=Null();

var uvRepeat : CVec2=new CVec2(1,1);

Build("PreTerrain",[],
	vs_main,[worldMat,viewMat,projectMat,brushType,brushInner,brushOuter,brushPos,size,uvRepeat],
	[out_position,to_uv,to_pos],
    ps_main,[out_color]
);

function vs_main(f3_ver : Vertex3,f2_uv : UV2)
{
	var P : CVec4=new CVec4(f3_ver,1.0);
	
	P=V4MulMatCoordi(P,worldMat);
    to_pos=P.xyz;
	P=V4MulMatCoordi(P,viewMat);
	P=V4MulMatCoordi(P,projectMat);
	to_uv=V2MulV2(f2_uv,uvRepeat);
	out_position=P;
}
function ps_main()
{
    var L_cor : CVec4=Sam2DToColor(0.0,to_uv);
	
	


	var tick : CVec3=V3Floor(new CVec3(brushPos.x/size,brushPos.y/size,brushPos.z/size));
	var offMin : CVec2=new CVec2(0.0,0.0);
	var offMax : CVec2=new CVec2(0.0,0.0);

	if(brushInner>0.5)	offMax.x+=brushInner;
	else if(brushInner<-0.5)	offMin.x+=brushInner;

	if(brushOuter>0.5)	offMax.y+=brushOuter;
	else if(brushOuter<-0.5)	offMin.y+=brushOuter;


	if((tick.x+offMin.x)*size<to_pos.x && to_pos.x<(tick.x+offMax.x)*size+size && (tick.z+offMin.y)*size<to_pos.z && to_pos.z<(tick.z+offMax.y)*size+size)
	{
		if(brushType>1.5)
			L_cor.r=1.0;
		else if(brushType>0.5)
			L_cor.b=1.0;
	}
		
	


	out_color=L_cor;
}

