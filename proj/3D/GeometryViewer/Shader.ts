import { Build, CMat, Color3, CVec3, CVec4, LWVPMul, Null, OutColor, OutPosition, ToV3, Vertex3 } from "https://06fs4dix.github.io/Artgine/artgine/z_file/Shader";

//mat
var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();

var to_col : ToV3 = Null();

var out_position : OutPosition=Null();
var out_color : OutColor=Null();

Build("Pre3Test",["simple"],
    vs_main_simple,[worldMat,viewMat,projectMat],
    [out_position,to_col],
    ps_main_simple,[out_color]
);

function vs_main_simple(f3_ver : Vertex3, f3_col : Color3)
{
    to_col=f3_col;
    out_position=LWVPMul(f3_ver,worldMat,viewMat,projectMat);
}
function ps_main_simple()
{
    out_color=new CVec4(to_col, 1.0);
}