import { Build, CVec2, CVec3, CVec4, Sam2DToColor, V4MulMatCoordi, V3Floor, V2MulV2, Sam2DV4, Null } from "./Shader";
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
var brushType = 0;
var brushInner = 0;
var brushOuter = 0;
var brushPos = new CVec3(0, 0, 0);
var size = 0;
var installTile = new Sam2DV4(9);
var out_position = Null();
var out_color = Null();
var to_uv = Null();
var to_pos = Null();
var uvRepeat = new CVec2(1, 1);
Build("PreTerrain", [], vs_main, [worldMat, viewMat, projectMat, brushType, brushInner, brushOuter, brushPos, size, uvRepeat], [out_position, to_uv, to_pos], ps_main, [out_color]);
function vs_main(f3_ver, f2_uv) {
    var P = new CVec4(f3_ver, 1.0);
    P = V4MulMatCoordi(P, worldMat);
    to_pos = P.xyz;
    P = V4MulMatCoordi(P, viewMat);
    P = V4MulMatCoordi(P, projectMat);
    to_uv = V2MulV2(f2_uv, uvRepeat);
    out_position = P;
}
function ps_main() {
    var L_cor = Sam2DToColor(0.0, to_uv);
    var tick = V3Floor(new CVec3(brushPos.x / size, brushPos.y / size, brushPos.z / size));
    var offMin = new CVec2(0.0, 0.0);
    var offMax = new CVec2(0.0, 0.0);
    if (brushInner > 0.5)
        offMax.x += brushInner;
    else if (brushInner < -0.5)
        offMin.x += brushInner;
    if (brushOuter > 0.5)
        offMax.y += brushOuter;
    else if (brushOuter < -0.5)
        offMin.y += brushOuter;
    if ((tick.x + offMin.x) * size < to_pos.x && to_pos.x < (tick.x + offMax.x) * size + size && (tick.z + offMin.y) * size < to_pos.z && to_pos.z < (tick.z + offMax.y) * size + size) {
        if (brushType > 1.5)
            L_cor.r = 1.0;
        else if (brushType > 0.5)
            L_cor.b = 1.0;
    }
    out_color = L_cor;
}
