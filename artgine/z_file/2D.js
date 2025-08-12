import { Build, CVec2, CVec3, CVec4, CMat3, LWVPMul, discard, screenPos, Sam2D0ToColor, Sam2DToColor, Sam2DToV4, Sam2DV4, Sam2DSize, V2MulFloat, V2DivV2, V3AddV3, V3Len, V3MulFloat, V3SubV3, V4MulMatCoordi, BranchBegin, BranchEnd, BranchDefault, Attribute, Null, MappingTexToV3, max, min, } from "./Shader";
import { ColorModelCac, ColorVFX, GetTexCodiedUV } from "./ColorFun";
import { ambientColor, ligCol, ligCount, ligDir, LightCac2D } from "./Light";
import { shadowOn } from "./Shadow";
import { GetWind, windCount, windDir, windInfluence, windInfo, windPos } from "./Wind";
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
var billboard = Null();
var billboardMat = Null();
var texCodi = Null();
var reverse = new CVec2(0, 0);
var colorModel = Null();
var alphaModel = Null();
var colorVFX = Null();
var alphaCut = 0.1;
var out_position = Null();
var out_color = Null();
var to_uv = Null();
var to_worldPos = Null();
var time = Attribute(0, "time");
var mask = 1.0;
var lastHide = Null();
var trailPos = new Sam2DV4(9);
var depthMap = 0.0;
var screenResolution = new CVec2(1.0, 1.0);
var sam2DCount = Null();
Build("2DPlane", [], vs_main, [
    worldMat, viewMat, projectMat, texCodi, reverse,
    alphaCut
], [
    out_position, to_uv, to_worldPos
], ps_main, [out_color]);
Build("2DTail", ["tail"], vs_main_tail, [
    worldMat, viewMat, projectMat, texCodi, reverse,
    alphaCut
], [
    out_position, to_uv, to_worldPos
], ps_main, [out_color]);
Build("2DTrail", ["trail"], vs_main_trail, [
    worldMat, viewMat, projectMat, texCodi, reverse, trailPos, lastHide,
    alphaCut
], [
    out_position, to_uv, to_worldPos
], ps_main, [out_color]);
Build("2DSimple", ["simple"], vs_main_simple, [
    worldMat, viewMat, projectMat, alphaCut
], [
    out_position, to_uv
], ps_main_simple, [out_color]);
Build("2DMask", ["mask"], vs_main, [
    worldMat, viewMat, projectMat, texCodi, reverse, alphaCut, mask
], [
    out_position, to_uv, to_worldPos
], ps_main_mask, [out_color]);
Build("2DBlit", ["blit"], vs_main_blit, [], [
    out_position, to_uv
], ps_main_blit, [out_color]);
function vs_main_blit(f3_ver, f2_uv) {
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 0.2), 0.0, 1.0);
    to_uv = new CVec3(f2_uv, 1.0);
}
function ps_main_blit() {
    out_color = Sam2D0ToColor(to_uv.xy);
}
function vs_main_simple(f3_ver, f2_uv) {
    to_uv = new CVec3(f2_uv, 1.0);
    out_position = LWVPMul(f3_ver, worldMat, viewMat, projectMat);
}
function ps_main_simple() {
    var L_cor = Sam2D0ToColor(to_uv.xy);
    if (L_cor.a <= alphaCut)
        discard;
    out_color = L_cor;
}
function vs_main_tail(f3_ver, f2_uv) {
    to_uv = GetTexCodiedUV(f2_uv, texCodi, reverse);
    var rpos = new CVec4(f3_ver.xyz, 1.0);
    if (f2_uv.x < 0.5 && f2_uv.y < 0.5) {
        rpos.xyz = worldMat[2].xyz;
        if (worldMat[2].w < 0.5)
            to_uv.z = 0.0;
    }
    else if (f2_uv.x < 0.5 && f2_uv.y > 0.5) {
        rpos.xyz = worldMat[0].xyz;
        if (worldMat[0].w < 0.5)
            to_uv.z = 0.0;
    }
    else if (f2_uv.x > 0.5 && f2_uv.y < 0.5) {
        rpos.xyz = worldMat[3].xyz;
        if (worldMat[3].w < 0.5)
            to_uv.z = 0.0;
    }
    else {
        rpos.xyz = worldMat[1].xyz;
        if (worldMat[1].w < 0.5)
            to_uv.z = 0.0;
    }
    var size;
    BranchBegin("wind", "W", [windDir, windPos, windInfo, windCount, windInfluence, time]);
    if (f2_uv.y > 0.5 && windInfluence > 0.01) {
        size = new CVec3(max(worldMat[0].x, worldMat[1].x) - min(worldMat[2].x, worldMat[3].x), max(worldMat[1].y, worldMat[3].y) - min(worldMat[0].y, worldMat[2].y), 0.0);
        rpos.xyz = V3AddV3(rpos.xyz, GetWind(V3MulFloat(V3AddV3(worldMat[2].xyz, worldMat[3].xyz), 0.5), size, time));
    }
    BranchEnd();
    var center = new CVec3(0.0, 0.0, 0.0);
    BranchBegin("billboard", "B", [billboard, billboardMat]);
    if (billboard > 0.5) {
        center = V3AddV3(V3AddV3(V3AddV3(worldMat[0].xyz, worldMat[1].xyz), worldMat[2].xyz), worldMat[3].xyz);
        center = V3MulFloat(center, 0.25);
        rpos.xyz = V3SubV3(rpos.xyz, center);
        rpos = V4MulMatCoordi(rpos, billboardMat);
        rpos.xyz = V3AddV3(rpos.xyz, center);
    }
    BranchEnd();
    to_worldPos = rpos;
    rpos = V4MulMatCoordi(rpos, viewMat);
    rpos = V4MulMatCoordi(rpos, projectMat);
    out_position = rpos;
}
function vs_main_trail(f3_ver) {
    var tpos = Sam2DToV4(trailPos, f3_ver.z);
    to_uv = new CVec3(tpos.w * texCodi.x, f3_ver.y, 1.0);
    if (tpos.w > 1.0)
        to_uv.z = 0.0;
    else if (lastHide < 0.5)
        to_uv.z = 1.0;
    else
        to_uv.z = tpos.w;
    var rpos = new CVec4(tpos.xyz, 1.0);
    to_worldPos = rpos;
    rpos = V4MulMatCoordi(rpos, viewMat);
    rpos = V4MulMatCoordi(rpos, projectMat);
    out_position = rpos;
}
function vs_main(f3_ver, f2_uv) {
    to_uv = GetTexCodiedUV(f2_uv, texCodi, reverse);
    var P = new CVec4(f3_ver, 1.0);
    var scaleX = 0.0;
    var scaleY = 0.0;
    var scaleZ = 0.0;
    BranchBegin("billboard", "B", [billboard, billboardMat]);
    if (billboard > 0.5) {
        scaleX = V3Len(worldMat[0].xyz);
        scaleY = V3Len(worldMat[1].xyz);
        scaleZ = V3Len(worldMat[2].xyz);
        P.x *= scaleX;
        P.y *= scaleY;
        P.z *= scaleZ;
        P = V4MulMatCoordi(P, billboardMat);
        P.x += worldMat[3].x;
        P.y += worldMat[3].y;
        P.z += worldMat[3].z;
    }
    else
        P = V4MulMatCoordi(P, worldMat);
    BranchDefault();
    P = V4MulMatCoordi(P, worldMat);
    BranchEnd();
    to_worldPos = P;
    P = V4MulMatCoordi(P, viewMat);
    out_position = V4MulMatCoordi(P, projectMat);
}
function ps_main() {
    var shadowTex = new CVec4(0.0, 0.0, 0.0, 0.0);
    var shadow = -1.0;
    BranchBegin("shadow", "S", [shadowOn]);
    if (shadowOn > 0.5) {
        shadowTex = Sam2DToColor(shadowOn, V2DivV2(screenPos.xy, Sam2DSize(shadowOn)));
        shadow = shadowTex.x;
    }
    BranchEnd();
    var L_cor = Sam2DToColor(0.0, to_uv.xy);
    L_cor.a *= to_uv.z;
    BranchBegin("color", "C", [colorModel, alphaModel]);
    L_cor = ColorModelCac(L_cor, colorModel, alphaModel);
    BranchEnd();
    BranchBegin("vfx", "V", [colorVFX, time]);
    L_cor = ColorVFX(L_cor, to_uv.xy, colorVFX, time);
    BranchEnd();
    if (L_cor.a <= alphaCut)
        discard;
    var normal = new CVec3(0.0, 0.0, 0.0);
    BranchBegin("normalMap", "N", [sam2DCount]);
    if (sam2DCount > 1.0) {
        normal = Sam2DToColor(1.0, to_uv.xy).xyz;
        normal = MappingTexToV3(normal);
    }
    BranchEnd();
    var DSE = new CMat3(0);
    BranchBegin("light", "L", [ligDir, ligCol, ligCount, ambientColor]);
    DSE = LightCac2D(to_worldPos, L_cor, normal, ambientColor);
    L_cor.rgb = DSE[0];
    BranchEnd();
    if (shadow > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow);
    }
    out_color = L_cor;
}
function ps_main_mask() {
    var L_cor = Sam2D0ToColor(to_uv.xy);
    if (L_cor.a <= alphaCut)
        discard;
    L_cor.a = mask;
    out_color = L_cor;
}
