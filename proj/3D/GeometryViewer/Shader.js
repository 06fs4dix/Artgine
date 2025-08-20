import { Build, CVec4, LWVPMul, Null } from "../../../artgine/z_file/Shader";
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
var to_col = Null();
var out_position = Null();
var out_color = Null();
Build("Pre3Test", ["simple"], vs_main_simple, [worldMat, viewMat, projectMat], [out_position, to_col], ps_main_simple, [out_color]);
function vs_main_simple(f3_ver, f3_col) {
    to_col = f3_col;
    out_position = LWVPMul(f3_ver, worldMat, viewMat, projectMat);
}
function ps_main_simple() {
    out_color = new CVec4(to_col, 1.0);
}
