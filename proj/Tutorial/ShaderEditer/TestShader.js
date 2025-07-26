import { Build, LWVPMul, discard, Sam2D0ToColor, Null } from "../../../artgine/z_file/Shader";
var worldMat;
var viewMat;
var projectMat;
var out_position;
var out_color;
var to_uv = Null();
Build("TestShader", [], vs_main_uv, [worldMat, viewMat, projectMat], [out_position, to_uv], ps_main_uv, [out_color]);
function vs_main_uv(f3_ver, f2_ver) {
    out_position = LWVPMul(f3_ver, worldMat, viewMat, projectMat);
    to_uv = f2_ver;
}
function ps_main_uv() {
    var L_cor = Sam2D0ToColor(to_uv);
    if (L_cor.a <= 0.1) {
        discard;
    }
    out_color = L_cor;
}
