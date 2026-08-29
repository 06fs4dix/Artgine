import { AlphaModalFun, vfxMat0, vfxMat1, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, VFX, VFXDown2 } from "./ColorFun";
import { ambientColor, ligCol, ligCount, ligDir, ligMask, cullMask, LightCac3D, material, ligStep0, ligStep1, ligStep2, ligStep3, envmapOn, sam2DCount, samCubeCount } from "./Light";
import { SDF } from "./SDF";
import { Build, CVec3, CVec4, CMat3, Sam2DToColor, FloatToInt, IntToFloat, screenPos, discard, V2DivV2, V3AddV3, V3MulFloat, V4MulMatCoordi, Null, BranchBegin, BranchEnd, BranchDefault, Attribute, Sam2DArrToV4, min, max, V3Len, V3SubV3, V3Nor, } from "./Shader";
import { bias, normalBias, PCF, shadowCount, shadowRate, shadowWrite, texture16f, shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow, jitter, shadowReadList, CalcShadow, shadowInfoList, shadowCascadeDataList, shadowDivideList, PCFStep, } from "./Shadow";
var size = 100;
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
var colorModel = Null();
var alphaModel = Null();
var camPos = Null();
var out_position = Null();
var out_color = Null();
var to_uv = Null();
var to_viewPos = Null();
var to_shadowBias = Null();
var to_worldPos = Null();
var to_normal = Null();
var screenSize;
var shadowOn = -1.0;
var sun = 1.0;
var time = Attribute(0, "time");
Build("Artgine/Shader/Voxel", [], vs_main, [worldMat, viewMat, projectMat, colorModel, alphaModel, size, shadowOn, sun], [out_position, to_uv, to_worldPos, to_normal], ps_main, [out_color]);
Build("Artgine/Shader/VoxelShadowWrite", ["shadowWrite"], vs_main_shadow_write, [
    worldMat, viewMat, projectMat, colorModel, alphaModel, size,
    ligDir, ligCol, ligCount,
    shadowCount, shadowWrite,
    shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow,
    shadowReadList, shadowInfoList, shadowCascadeDataList, shadowDivideList,
    shadowRate, PCF, texture16f, bias, normalBias
], [out_position, to_uv, to_viewPos, to_shadowBias], ps_main_shadow_write, [out_color]);
Build("Artgine/Shader/VoxelShadowRead", ["shadowRead"], vs_main_shadow_read, [
    worldMat, viewMat, projectMat, colorModel, alphaModel, size,
    ligDir, ligCol, ligCount,
    shadowCount, shadowWrite,
    shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow,
    shadowReadList, shadowInfoList, shadowCascadeDataList, shadowDivideList,
    shadowRate, PCF, PCFStep, texture16f, bias, normalBias, sun, jitter,
    camPos
], [out_position, to_uv, to_normal, to_worldPos, to_viewPos], ps_main_shadow_read, [out_color]);
function VoxelDirData(_dir, _f4_uv) {
    var data = new CMat3(0);
    if (_dir < 9.0) {
        data[1] = new CVec3(0.0, 1.0, 0.0);
        if (_dir - 0.0 < 0.5) {
            data[0] = new CVec3(0, size, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.y, 1.0);
        }
        else if (_dir - 0.0 < 1.5) {
            data[0] = new CVec3(size, size, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.w, 1.0);
        }
        else if (_dir - 0.0 < 2.5) {
            data[0] = new CVec3(size, size, 0);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 1.0);
        }
        else if (_dir - 0.0 < 3.5) {
            data[0] = new CVec3(size, size, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.w, 1.0);
        }
        else if (_dir - 0.0 < 4.5) {
            data[0] = new CVec3(0, size, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.y, 1.0);
        }
        else if (_dir - 0.0 < 5.5) {
            data[0] = new CVec3(0, size, size);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 1.0);
        }
    }
    else if (_dir < 19.0) {
        data[1] = new CVec3(0.0, -1.0, 0.0);
        if (_dir - 10.0 < 0.5) {
            data[0] = new CVec3(0, 0, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 1.0);
        }
        else if (_dir - 10.0 < 1.5) {
            data[0] = new CVec3(size, 0, 0);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.w, 1.0);
        }
        else if (_dir - 10.0 < 2.5) {
            data[0] = new CVec3(size, 0, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 1.0);
        }
        else if (_dir - 10.0 < 3.5) {
            data[0] = new CVec3(0, 0, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 1.0);
        }
        else if (_dir - 10.0 < 4.5) {
            data[0] = new CVec3(size, 0, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 1.0);
        }
        else if (_dir - 10.0 < 5.5) {
            data[0] = new CVec3(0, 0, size);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.y, 1.0);
        }
    }
    else if (_dir < 29.0) {
        data[1] = new CVec3(-1.0, 0.0, 0.0);
        if (_dir - 20.0 < 0.5) {
            data[0] = new CVec3(0, 0, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 0.8);
        }
        else if (_dir - 20.0 < 1.5) {
            data[0] = new CVec3(0, 0, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.w, 0.8);
        }
        else if (_dir - 20.0 < 2.5) {
            data[0] = new CVec3(0, size, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.y, 0.8);
        }
        else if (_dir - 20.0 < 3.5) {
            data[0] = new CVec3(0, size, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.y, 0.8);
        }
        else if (_dir - 20.0 < 4.5) {
            data[0] = new CVec3(0, 0, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.w, 0.8);
        }
        else if (_dir - 20.0 < 5.5) {
            data[0] = new CVec3(0, size, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 0.8);
        }
    }
    else if (_dir < 39.0) {
        data[1] = new CVec3(1.0, 0.0, 0.0);
        if (_dir - 30.0 < 0.5) {
            data[0] = new CVec3(size, 0, 0);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.w, 0.8);
        }
        else if (_dir - 30.0 < 1.5) {
            data[0] = new CVec3(size, size, 0);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 0.8);
        }
        else if (_dir - 30.0 < 2.5) {
            data[0] = new CVec3(size, 0, size);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 0.8);
        }
        else if (_dir - 30.0 < 3.5) {
            data[0] = new CVec3(size, size, 0);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 0.8);
        }
        else if (_dir - 30.0 < 4.5) {
            data[0] = new CVec3(size, size, size);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.y, 0.8);
        }
        else if (_dir - 30.0 < 5.5) {
            data[0] = new CVec3(size, 0, size);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 0.8);
        }
    }
    else if (_dir < 49.0) {
        data[1] = new CVec3(0.0, 0.0, -1.0);
        if (_dir - 40.0 < 0.5) {
            data[0] = new CVec3(0, 0, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 0.9);
        }
        else if (_dir - 40.0 < 1.5) {
            data[0] = new CVec3(size, size, 0);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 0.9);
        }
        else if (_dir - 40.0 < 2.5) {
            data[0] = new CVec3(size, 0, 0);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.w, 0.9);
        }
        else if (_dir - 40.0 < 3.5) {
            data[0] = new CVec3(0, size, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.y, 0.9);
        }
        else if (_dir - 40.0 < 4.5) {
            data[0] = new CVec3(size, size, 0);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 0.9);
        }
        else if (_dir - 40.0 < 5.5) {
            data[0] = new CVec3(0, 0, 0);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 0.9);
        }
    }
    else if (_dir < 59.0) {
        data[1] = new CVec3(0.0, 0.0, 1.0);
        if (_dir - 50.0 < 0.5) {
            data[0] = new CVec3(0, 0, size);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 1.0);
        }
        else if (_dir - 50.0 < 1.5) {
            data[0] = new CVec3(size, 0, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.w, 1.0);
        }
        else if (_dir - 50.0 < 2.5) {
            data[0] = new CVec3(size, size, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 1.0);
        }
        else if (_dir - 50.0 < 3.5) {
            data[0] = new CVec3(0, size, size);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.y, 1.0);
        }
        else if (_dir - 50.0 < 4.5) {
            data[0] = new CVec3(0, 0, size);
            data[2] = new CVec3(_f4_uv.x, _f4_uv.w, 1.0);
        }
        else if (_dir - 50.0 < 5.5) {
            data[0] = new CVec3(size, size, size);
            data[2] = new CVec3(_f4_uv.z, _f4_uv.y, 1.0);
        }
    }
    return data;
}
function vs_main(f4_ver, f4_uv, f2_color) {
    if (f4_ver.w > 65.0) {
        out_position = new CVec4(0.0, 0.0, 0.0, 0.0);
        to_uv = new CVec4(0.0, 0.0, 0.0, 2.0);
        return;
    }
    var data = VoxelDirData(f4_ver.w, f4_uv);
    var P = new CVec4(f4_ver.xyz, 1.0);
    P.xyz = V3AddV3(P.xyz, data[0]);
    to_uv.xyz = data[2];
    var light = f2_color.x * sun;
    if (light < f2_color.y)
        light = f2_color.y;
    light *= data[2].z;
    if (f4_uv.w < -0.5) {
        to_uv.xyz = f4_uv.xyz;
        to_uv.w = -light;
    }
    else
        to_uv.w = light;
    to_normal = data[1];
    P = V4MulMatCoordi(P, worldMat);
    to_worldPos = P;
    P = V4MulMatCoordi(P, viewMat);
    P = V4MulMatCoordi(P, projectMat);
    out_position = P;
}
function ps_main() {
    var L_cor = new CVec4(0.0, 0.0, 0.0, 1.0);
    var light = to_uv.w;
    if (to_uv.w > 1.5) {
        discard;
        return;
    }
    else if (light < -0.5) {
        L_cor.xyz = to_uv.xyz;
        light = -light;
    }
    else {
        BranchBegin("vfx", "VFX", [VFX, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, time, vfxMat0, vfxMat1]);
        L_cor = VFXDown2(to_uv.xy, VFX, time, to_worldPos);
        BranchDefault();
        L_cor = Sam2DToColor(0.0, to_uv.xy);
        BranchEnd();
    }
    L_cor.rgb = V3MulFloat(L_cor.rgb, light);
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    var shadow = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow", "S", [shadowOn, screenSize]);
    if (shadowOn > 0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, V2DivV2(screenPos.xy, screenSize.xy));
    }
    BranchEnd();
    var DSE = new CMat3(0);
    BranchBegin("light", "L", [ligDir, ligCol, ligMask, ligCount, camPos, material, ligStep0, ligStep1, ligStep2, ligStep3, ambientColor, envmapOn, sam2DCount, samCubeCount, cullMask]);
    DSE = LightCac3D(camPos, to_worldPos, L_cor, to_normal, shadow, material.y, material.x, material.z, cullMask.x);
    L_cor.rgb = V3AddV3(DSE[0], DSE[1]);
    BranchDefault();
    if (shadow.r > -0.5) {
        L_cor.rgb = V3MulFloat(L_cor.rgb, shadow.r);
    }
    BranchEnd();
    out_color = L_cor;
}
function vs_main_shadow_write(f4_ver, f4_uv, f2_color) {
    var data = VoxelDirData(f4_ver.w, f4_uv);
    var P = new CVec4(f4_ver.xyz, 1.0);
    P.xyz = V3AddV3(P.xyz, data[0]);
    to_uv.xyz = data[2];
    if (f4_uv.w < -0.5) {
        to_uv.xyz = f4_uv.xyz;
        to_uv.w = -f2_color.x;
    }
    else
        to_uv.w = f2_color.x;
    P = V4MulMatCoordi(P, worldMat);
    var viewPos = V4MulMatCoordi(P, viewMat);
    out_position = V4MulMatCoordi(viewPos, projectMat);
    BranchBegin("PointLightShadowV", "PLSV", []);
    to_viewPos = P;
    BranchDefault();
    to_viewPos = viewPos;
    BranchEnd();
    out_position.z = min(out_position.z, out_position.w);
}
function ps_main_shadow_write() {
    var L_cor = new CVec4(0.0, 0.0, 0.0, 1.0);
    if (to_uv.w > 1.5) {
        discard;
        return;
    }
    else if (to_uv.w > 0.5) {
        L_cor = Sam2DToColor(0.0, to_uv.xy);
    }
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    if (L_cor.a <= 0.01)
        discard;
    var shadowRead;
    var lDir;
    BranchBegin("PointLightShadowF", "PLSF", [ligDir]);
    shadowRead = Sam2DArrToV4(shadowReadList, shadowWrite.y);
    lDir = Sam2DArrToV4(ligDir, shadowRead.x);
    out_color.b = (V3Len(V3SubV3(to_viewPos.xyz, lDir.xyz)) - shadowRead.z) / (shadowRead.w - shadowRead.z);
    out_color.a = 1.0;
    BranchDefault();
    out_color = to_viewPos;
    out_color.a = 1.0;
    BranchEnd();
}
function vs_main_shadow_read(f4_ver, f4_uv, f2_color) {
    var data = VoxelDirData(f4_ver.w, f4_uv);
    var P = new CVec4(f4_ver.xyz, 1.0);
    P.xyz = V3AddV3(P.xyz, data[0]);
    to_uv.xyz = data[2];
    var light = f2_color.x * sun;
    if (light < f2_color.y)
        light = f2_color.y;
    if (f4_uv.w < -0.5) {
        to_uv.xyz = f4_uv.xyz;
        to_uv.w = -light;
    }
    else
        to_uv.w = light;
    P = V4MulMatCoordi(P, worldMat);
    to_worldPos = P;
    to_normal = data[1];
    P = V4MulMatCoordi(P, viewMat);
    to_viewPos = P;
    out_position = V4MulMatCoordi(P, projectMat);
}
function ps_main_shadow_read() {
    var L_cor = new CVec4(0.0, 0.0, 0.0, 1.0);
    if (to_uv.w > 1.5) {
        discard;
        return;
    }
    else if (to_uv.w < -0.5) {
        L_cor.xyz = to_uv.xyz;
        L_cor.rgb = V3MulFloat(L_cor.rgb, -to_uv.w);
    }
    else {
        L_cor = Sam2DToColor(0.0, to_uv.xy);
        L_cor.rgb = V3MulFloat(L_cor.rgb, to_uv.w);
        L_cor.rgb = V3MulFloat(L_cor.rgb, to_uv.z);
    }
    BranchBegin("alphaModel", "AM", [alphaModel]);
    L_cor.a = AlphaModalFun(L_cor.a, alphaModel);
    BranchEnd();
    if (L_cor.a <= 0.01)
        discard;
    var outputIndex;
    var all = new CVec4(1.0, 1.0, 1.0, 1.0);
    BranchBegin("shadowMulti", "SDM", [alphaModel]);
    outputIndex = 0.0;
    all = new CVec4(0.0, 0.0, 0.0, 0.0);
    for (var i = 0; i < SDF.TexSizeMax; ++i) {
        if (i >= FloatToInt(shadowCount))
            break;
        all[FloatToInt(outputIndex)] += CalcShadow(IntToFloat(i), V3Nor(to_normal), to_worldPos, camPos, to_viewPos.xyz);
        outputIndex = min(outputIndex + 1.0, 3.0);
    }
    all.a /= max(shadowCount - 3.0, 1.0);
    BranchDefault();
    all.r = CalcShadow(0.0, V3Nor(to_normal), to_worldPos, camPos, to_viewPos.xyz);
    all.rgb = new CVec3(all.r, all.r, all.r);
    all.a = 1.0;
    BranchEnd();
    out_color = all;
}
