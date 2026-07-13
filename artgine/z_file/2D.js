import { Build, CVec2, CVec3, CVec4, CMat3, Attribute, Null, LWVPMul, discard, screenPos, Sam2D0ToColor, Sam2DToColor, max, min, V2MulFloat, V2DivV2, V3AddV3, V3Len, V3MulFloat, V3SubV3, V3Cross, V3Nor, V4MulMatCoordi, BranchBegin, BranchEnd, BranchDefault, MappingTexToV3, MatTypeToMat, V2Abs, Sam2DArrV4, Sam2DArrToV4, V2AddV2, smoothstep, V3Abs, V3Sqrt, V3MulV3, } from "./Shader";
import { VFX, VFXDown2, GetTexCodiedUV, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, ColorModalFun, AlphaModalFun, vfxMat0, vfxMat1 } from "./ColorFun";
import { ambientColor, ligCol, ligDir, ligCount, LightCac2D, ligMask, cullMask } from "./Light";
import { shadowOn, shadowRate, shadowWrite } from "./Shadow";
import { GetWind, windCount, windDir, windInfluence, windInfo, windPos } from "./Wind";
import { SDF } from "./SDF";
var worldMat = Null();
var worldMatShort = Null();
var worldMatType = 0.0;
var viewMat = Null();
var projectMat = Null();
var billboard = Null();
var billboardMat = Null();
var texCodi = Null();
var alphaCut = 0.01;
var colorModel = Null();
var alphaModel = Null();
var out_position = Null();
var out_color = Null();
var to_uv = Null();
var to_worldPos = Null();
var time = Attribute(0, "time");
var mask = 1.0;
var lastHide = Null();
var trailPos = new Sam2DArrV4(1);
var screenSize;
var zDepth = 0.0;
var zDepthBias = 0.001;
var sam2DCount = Null();
Build("Artgine/Shader/2DPlane", [], vs_main, [
    worldMat,
    viewMat, projectMat,
], [
    out_position, to_uv, to_worldPos
], ps_main, [out_color]);
Build("Artgine/Shader/2DTail", ["tail"], vs_main_tail, [
    worldMat, viewMat, projectMat,
], [
    out_position, to_uv, to_worldPos
], ps_main, [out_color]);
Build("Artgine/Shader/2DTrail", ["trail"], vs_main_trail, [
    worldMat, viewMat, projectMat, trailPos, lastHide, texCodi,
], [
    out_position, to_uv, to_worldPos
], ps_main, [out_color]);
Build("Artgine/Shader/2DSimple", ["simple"], vs_main_simple, [
    worldMat,
    viewMat, projectMat
], [
    out_position, to_uv
], ps_main_simple, [out_color]);
Build("Artgine/Shader/2DMask", ["mask"], vs_main, [
    worldMat,
    viewMat, projectMat, mask
], [
    out_position, to_uv, to_worldPos
], ps_main_mask, [out_color]);
Build("Artgine/Shader/2DBlit", ["blit"], vs_main_blit, [], [
    out_position, to_uv
], ps_main_blit, [out_color]);
function vs_main_blit(f3_ver, f2_uv) {
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 2.0), 1.0, 1.0);
    to_uv = new CVec3(f2_uv, 1.0);
}
function ps_main_blit() {
    out_color = Sam2D0ToColor(to_uv.xy);
}
function vs_main_simple(f3_ver, f2_uv) {
    to_uv = new CVec3(f2_uv, 1.0);
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    out_position = LWVPMul(f3_ver, wMat, viewMat, projectMat);
}
function ps_main_simple() {
    var L_cor = Sam2D0ToColor(to_uv.xy);
    out_color = L_cor;
}
function vs_main_tail(f3_ver, f2_uv) {
    BranchBegin("codi", "C", [texCodi]);
    to_uv.xy = GetTexCodiedUV(f2_uv, texCodi);
    BranchDefault();
    to_uv.xy = f2_uv;
    BranchEnd();
    to_uv.z = 1.0;
    var rpos = new CVec4(f3_ver, 1.0);
    var size;
    var mid;
    var nor;
    BranchBegin("billboard", "B", [billboard, billboardMat]);
    if (billboard > 0.5) {
        if (billboard < 1.5) {
            nor = V3Nor(V3Cross(new CVec3(-viewMat[0][2], -viewMat[1][2], -viewMat[2][2]), V3SubV3(worldMat[0].xyz, worldMat[1].xyz)));
            if (f2_uv.x < 0.5 && f2_uv.y < 0.5) {
                rpos.xyz = V3SubV3(V3AddV3(worldMat[1].xyz, worldMat[3].xyz), V3MulFloat(nor, worldMat[2].x * 0.5));
                if (worldMat[2].w < 0.5)
                    to_uv.z = 0.0;
            }
            else if (f2_uv.x < 0.5 && f2_uv.y > 0.5) {
                rpos.xyz = V3SubV3(V3AddV3(worldMat[0].xyz, worldMat[3].xyz), V3MulFloat(nor, worldMat[2].x * 0.5));
                if (worldMat[0].w < 0.5)
                    to_uv.z = 0.0;
            }
            else if (f2_uv.x > 0.5 && f2_uv.y < 0.5) {
                rpos.xyz = V3AddV3(V3AddV3(worldMat[1].xyz, worldMat[3].xyz), V3MulFloat(nor, worldMat[2].x * 0.5));
                if (worldMat[3].w < 0.5)
                    to_uv.z = 0.0;
            }
            else {
                rpos.xyz = V3AddV3(V3AddV3(worldMat[0].xyz, worldMat[3].xyz), V3MulFloat(nor, worldMat[2].x * 0.5));
                if (worldMat[1].w < 0.5)
                    to_uv.z = 0.0;
            }
            mid = V3MulFloat(V3AddV3(worldMat[0].xyz, worldMat[1].xyz), 0.5);
            size = new CVec3(worldMat[2].xy, 0.0);
        }
        else if (billboard < 2.5) {
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
            mid = V3MulFloat(V3AddV3(V3AddV3(V3AddV3(worldMat[0].xyz, worldMat[1].xyz), worldMat[2].xyz), worldMat[3].xyz), 0.25);
            size = new CVec3(max(worldMat[0].x, worldMat[1].x) - min(worldMat[2].x, worldMat[3].x), max(worldMat[1].y, worldMat[3].y) - min(worldMat[0].y, worldMat[2].y), 0.0);
            rpos.xyz = V3SubV3(rpos.xyz, mid);
            rpos = V4MulMatCoordi(rpos, billboardMat);
            rpos.xyz = V3AddV3(rpos.xyz, mid);
        }
    }
    BranchDefault();
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
    mid = V3MulFloat(V3AddV3(V3AddV3(V3AddV3(worldMat[0].xyz, worldMat[1].xyz), worldMat[2].xyz), worldMat[3].xyz), 0.25);
    size = new CVec3(max(worldMat[0].x, worldMat[1].x) - min(worldMat[2].x, worldMat[3].x), max(worldMat[1].y, worldMat[3].y) - min(worldMat[0].y, worldMat[2].y), 0.0);
    BranchEnd();
    BranchBegin("wind", "W", [windDir, windPos, windInfo, windCount, windInfluence, time]);
    if (f2_uv.y > 0.5 && windInfluence > 0.01) {
        rpos.xyz = V3AddV3(rpos.xyz, GetWind(mid, size, time));
    }
    BranchEnd();
    var lDir;
    var lCol;
    BranchBegin("shadowPlaneV", "SPV", [ligDir, ligCol, ligCount, shadowWrite, shadowRate]);
    if (shadowWrite.x > ligCount - 0.5) {
        to_uv.z *= 0.0;
    }
    else {
        lDir = Sam2DArrToV4(ligDir, shadowWrite.x);
        lCol = Sam2DArrToV4(ligCol, shadowWrite.x);
        to_uv.z *= max(lCol.r, max(lCol.g, lCol.b)) * shadowRate;
        if (lDir.w > 0.5) {
            lDir.xyz = V3SubV3(rpos.xyz, lDir.xyz);
            if (V3Len(lDir.xyz) <= lCol.w)
                to_uv.z *= 1.0;
            else if (V3Len(lDir.xyz) >= lDir.w) {
                to_uv.z *= 0.0;
            }
            else
                to_uv.z *= 1.0 - smoothstep(0.0, 1.0, (V3Len(lDir.xyz) - lCol.w) / (lDir.w - lCol.w));
        }
        lDir.xyz = V3Nor(lDir.xyz);
        if (f2_uv.y > 0.5) {
            rpos.y -= size.y;
            rpos.xy = V2AddV2(rpos.xy, V2MulFloat(lDir.xy, size.y * (1.0 + lDir.y * 0.1)));
            rpos.z -= 0.1;
        }
    }
    BranchEnd();
    to_worldPos = rpos;
    rpos = V4MulMatCoordi(rpos, viewMat);
    rpos = V4MulMatCoordi(rpos, projectMat);
    BranchBegin("zDepth", "Z", [zDepth, zDepthBias]);
    rpos.z += zDepth * zDepthBias;
    BranchEnd();
    out_position = rpos;
}
function vs_main_trail(f2_ver) {
    var tpos = Sam2DArrToV4(trailPos, f2_ver.x);
    var rawUV = new CVec2(1.0 - tpos.w, (f2_ver.y + 1.0) * 0.5);
    BranchBegin("codi", "C", [texCodi]);
    to_uv.xy = GetTexCodiedUV(rawUV, texCodi);
    BranchDefault();
    to_uv.xy = rawUV;
    BranchEnd();
    if (lastHide < 0.5)
        to_uv.z = 1.0;
    else
        to_uv.z = tpos.w;
    var rpos = new CVec4(tpos.xyz, 1.0);
    to_worldPos = rpos;
    rpos = V4MulMatCoordi(rpos, viewMat);
    rpos = V4MulMatCoordi(rpos, projectMat);
    out_position = rpos;
}
function vs_main(f3_ver, f2_uv, f3_sca) {
    var uv = f2_uv;
    BranchBegin("codi", "C", [texCodi]);
    to_uv.xy = GetTexCodiedUV(V2Abs(f2_uv), texCodi);
    BranchDefault();
    to_uv.xy = V2Abs(f2_uv);
    BranchEnd();
    to_uv.z = 1.0;
    uv = new CVec2(f2_uv.x < 0.0 ? 0.0 : 1.0, f2_uv.y < 0.0 ? 0.0 : 1.0);
    var P = new CVec4(f3_ver, 1.0);
    var wMat;
    BranchBegin("worldType", "WT", [worldMatType, worldMatShort]);
    wMat = MatTypeToMat(worldMatType, worldMatShort, worldMat);
    BranchDefault();
    wMat = worldMat;
    BranchEnd();
    var isMerge;
    var isVertexBot;
    var isVertexLeft;
    var size;
    BranchBegin("merge", "MG", []);
    isMerge = 1.0;
    isVertexLeft = f3_sca.x < 0.0 ? 1.0 : 0.0;
    isVertexBot = f3_sca.y < 0.0 ? 1.0 : 0.0;
    size = V3Abs(f3_sca);
    BranchDefault();
    isMerge = 0.0;
    isVertexLeft = f3_sca.x < 0.0 ? 1.0 : 0.0;
    isVertexBot = f3_ver.y < 0.0 ? 1.0 : 0.0;
    size = new CVec3(V3Len(wMat[0].xyz) * 1.0, V3Len(wMat[1].xyz) * 1.0, V3Len(wMat[2].xyz) * 1.0);
    BranchEnd();
    var origin;
    BranchBegin("billboard", "B", [billboard, billboardMat]);
    if (billboard > 0.5) {
        if (isMerge > 0.5) {
            origin = new CVec3(isVertexLeft > 0.5 ? -0.5 : 0.5, isVertexBot > 0.5 ? -0.5 : 0.5, 0.0);
            P = new CVec4(origin, 1.0);
        }
        P.xyz = V3MulV3(P.xyz, size);
        P = V4MulMatCoordi(P, billboardMat);
        if (isMerge > 0.5)
            P.xyz = V3AddV3(P.xyz, V3SubV3(f3_ver, V3MulV3(origin, size)));
        else
            P.xyz = V3AddV3(P.xyz, wMat[3].xyz);
    }
    else
        P = V4MulMatCoordi(P, wMat);
    BranchDefault();
    P = V4MulMatCoordi(P, wMat);
    BranchEnd();
    BranchBegin("wind", "W", [windDir, windPos, windInfo, windCount, windInfluence, time]);
    if (isVertexBot < 0.5 && windInfluence > 0.01) {
        P.xyz = V3AddV3(P.xyz, GetWind(P.xyz, size, time));
    }
    BranchEnd();
    var lDir;
    var lCol;
    BranchBegin("shadowPlaneV", "SPV", [ligDir, ligCol, ligCount, shadowWrite, shadowRate]);
    if (shadowWrite.x > ligCount - 0.5) {
        to_uv.z *= 0.0;
    }
    else {
        lDir = Sam2DArrToV4(ligDir, shadowWrite.x);
        lCol = Sam2DArrToV4(ligCol, shadowWrite.x);
        to_uv.z *= max(lCol.r, max(lCol.g, lCol.b)) * shadowRate;
        if (lDir.w > 0.5) {
            lDir.xyz = V3SubV3(P.xyz, lDir.xyz);
            if (V3Len(lDir.xyz) <= lCol.w)
                to_uv.z *= 1.0;
            else if (V3Len(lDir.xyz) >= lDir.w) {
                to_uv.z *= 0.0;
            }
            else
                to_uv.z *= 1.0 - smoothstep(0.0, 1.0, (V3Len(lDir.xyz) - lCol.w) / (lDir.w - lCol.w));
        }
        lDir.xyz = V3Nor(lDir.xyz);
        if (isVertexBot < 0.5) {
            P.y -= size.y;
            P.xy = V2AddV2(P.xy, V2MulFloat(lDir.xy, size.y * (1.0 + lDir.y * 0.1)));
            P.z -= 0.1;
        }
    }
    BranchEnd();
    to_worldPos = P;
    P = V4MulMatCoordi(P, viewMat);
    out_position = V4MulMatCoordi(P, projectMat);
}
function ps_main() {
    var shadow = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow", "S", [shadowOn, screenSize]);
    if (shadowOn > 0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, V2DivV2(screenPos.xy, screenSize.xy));
    }
    BranchEnd();
    var L_cor;
    BranchBegin("vfx", "VFX", [VFX, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, time, vfxMat0, vfxMat1]);
    L_cor = VFXDown2(to_uv.xy, VFX, time, to_worldPos);
    BranchDefault();
    L_cor = Sam2DToColor(0.0, to_uv.xy);
    BranchEnd();
    L_cor.a *= to_uv.z;
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    BranchBegin("shadowPlaneF", "SPF", []);
    L_cor.rgb = new CVec3(0.0, 0.0, 0.0);
    BranchEnd();
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    BranchBegin("alphaCut", "AC", [alphaCut]);
    if (L_cor.a <= alphaCut)
        discard;
    BranchDefault();
    if (L_cor.a <= 0.01)
        discard;
    BranchEnd();
    var normal = new CVec3(0.0, 0.0, 0.0);
    BranchBegin("normalMap", "N", [sam2DCount]);
    if (sam2DCount > 1.0) {
        normal = Sam2DToColor(1.0, to_uv.xy).xyz;
        normal = MappingTexToV3(normal);
    }
    BranchEnd();
    var gamma = 1.0;
    var DSE = new CMat3(0);
    BranchBegin("light", "L", [ligDir, ligCol, ligMask, ligCount, cullMask, ambientColor]);
    gamma = 2.2;
    L_cor.rgb = V3MulV3(L_cor.rgb, L_cor.rgb);
    DSE = LightCac2D(to_worldPos, L_cor, normal, shadow, cullMask.x);
    L_cor.rgb = DSE[0];
    BranchDefault();
    if (shadow.a > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.a);
    }
    BranchEnd();
    out_color = L_cor;
    if (gamma > 1.1) {
        out_color.rgb = V3Sqrt(out_color.rgb);
    }
}
function ps_main_mask() {
    var L_cor = Sam2D0ToColor(to_uv.xy);
    BranchBegin("colorModel", "CM", [colorModel]);
    L_cor.rgb = ColorModalFun(L_cor.rgb, colorModel);
    BranchEnd();
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    BranchBegin("alphaCut", "AC", [alphaCut]);
    if (L_cor.a <= alphaCut)
        discard;
    BranchDefault();
    if (L_cor.a <= 0.01)
        discard;
    BranchEnd();
    L_cor.a = mask;
    out_color = L_cor;
}
