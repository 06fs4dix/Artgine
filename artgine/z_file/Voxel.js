import { AlphaModalFun, vfxMat0, vfxMat1, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, VFX, VFXDown2 } from "./ColorFun";
import { ambientColor, ligCol, ligCount, ligDir, LightCac2D, ligMask, cullMask, LightCac3D, GetMaterial, material, ligStep0, ligStep1, ligStep2, ligStep3, envCount, envPos, EnvNearest, sam2DCount, samCubeCount, emission, envmapOn, emissiveIntensity } from "./Light";
import { SDF } from "./SDF";
import { Build, CVec3, CVec4, CMat3, Sam2DToColor, FloatToInt, IntToFloat, screenPos, discard, V2DivV2, V3AddV3, V3MulFloat, V4MulMatCoordi, Null, BranchBegin, BranchEnd, BranchDefault, Attribute, min, V3SubV3, V3Nor, V3MulV3, V3Sqrt, } from "./Shader";
import { bias, normalBias, PCF, shadowCount, shadowRate, shadowWrite, texture16f, shadowZOffset, shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow, shadowCas4VPMatWithZRow, shadowCas5VPMatWithZRow, jitter, CalcShadow, shadowInfoList, PCFStep, } from "./Shadow";
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
var to_envIdx = Null();
var screenSize;
var shadowOn = -1.0;
var sun = 1.0;
var voxelCount = new CVec3(16, 16, 16);
var time = Attribute(0, "time");
Build("Artgine/Shader/Voxel", [], vs_main, [worldMat, viewMat, projectMat, colorModel, alphaModel, size, shadowOn, sun, voxelCount], [out_position, to_uv, to_worldPos, to_normal, to_envIdx], ps_main, [out_color]);
Build("Artgine/Shader/VoxelShadowWrite", ["shadowWrite"], vs_main_shadow_write, [
    worldMat, viewMat, projectMat, colorModel, alphaModel, size,
    ligDir, ligCol, ligCount,
    shadowCount, shadowWrite, shadowZOffset,
    shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow, shadowCas4VPMatWithZRow, shadowCas5VPMatWithZRow,
    shadowInfoList,
    shadowRate, PCF, texture16f, bias, normalBias
], [out_position, to_uv, to_viewPos, to_shadowBias], ps_main_shadow_write, [out_color]);
Build("Artgine/Shader/VoxelShadowRead", ["shadowRead"], vs_main_shadow_read, [
    worldMat, viewMat, projectMat, colorModel, alphaModel, size,
    ligDir, ligCol, ligCount,
    shadowCount, shadowWrite,
    shadowCas0VPMatWithZRow, shadowCas1VPMatWithZRow, shadowCas2VPMatWithZRow, shadowCas3VPMatWithZRow, shadowCas4VPMatWithZRow, shadowCas5VPMatWithZRow,
    shadowInfoList,
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
function VoxelTBN(_n) {
    var m = new CMat3(0);
    m[0] = new CVec3(1.0, 0.0, 0.0);
    m[1] = new CVec3(0.0, 1.0, 0.0);
    m[2] = _n;
    if (_n.y > 0.5)
        m[1] = new CVec3(0.0, 0.0, -1.0);
    else if (_n.y < -0.5)
        m[1] = new CVec3(0.0, 0.0, 1.0);
    else if (_n.x < -0.5)
        m[0] = new CVec3(0.0, 0.0, 1.0);
    else if (_n.x > 0.5)
        m[0] = new CVec3(0.0, 0.0, -1.0);
    return m;
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
    to_envIdx.x = -1.0;
    BranchBegin("env", "E", [envCount, envPos]);
    to_envIdx.x = EnvNearest(to_worldPos.xyz, to_normal);
    BranchEnd();
    out_position = P;
}
function ps_main() {
    var L_cor = new CVec4(0.0, 0.0, 0.0, 1.0);
    var light = to_uv.w;
    var useMap = 1.0;
    var normal = to_normal;
    var lmaterial = new CVec4(1.0, 1.0, 1.0, 1.0);
    var tn = new CVec3(0.0, 0.0, 1.0);
    var tbn = new CMat3(0);
    if (to_uv.w > 1.5) {
        discard;
        return;
    }
    else if (light < -0.5) {
        L_cor.xyz = to_uv.xyz;
        light = -light;
        useMap = 0.0;
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
    if (L_cor.a <= 0.01)
        discard;
    var shadow = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow", "S", [shadowOn, screenSize]);
    if (shadowOn > 0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, V2DivV2(screenPos.xy, screenSize.xy));
    }
    BranchEnd();
    var DSE = new CMat3(0);
    BranchBegin("light", "L", [ligDir, ligCol, ligMask, ligCount, camPos, material, emission, emissiveIntensity, ligStep0, ligStep1, ligStep2, ligStep3, ambientColor, envmapOn, envCount, envPos, sam2DCount, samCubeCount, cullMask]);
    L_cor.rgb = V3MulV3(L_cor.rgb, L_cor.rgb);
    if (voxelCount.z < 1.5)
        DSE = LightCac2D(to_worldPos, L_cor, new CVec3(0.0, 0.0, 0.0), shadow, cullMask.x, material.w);
    else {
        lmaterial = new CVec4(material.x, material.y, material.z, material.w);
        if (useMap > 0.5 && sam2DCount > 2.5) {
            lmaterial = GetMaterial(material, Sam2DToColor(2.0, to_uv.xy), sam2DCount);
            tn = V3SubV3(V3MulFloat(Sam2DToColor(1.0, to_uv.xy).xyz, 2.0), new CVec3(1.0, 1.0, 1.0));
            tbn = VoxelTBN(V3Nor(to_normal));
            normal = V3Nor(V3AddV3(V3AddV3(V3MulFloat(tbn[0], tn.x), V3MulFloat(tbn[1], tn.y)), V3MulFloat(tbn[2], tn.z)));
        }
        DSE = LightCac3D(to_worldPos, L_cor, normal, shadow, cullMask.x, lmaterial.w, camPos, lmaterial.y, lmaterial.x, lmaterial.z, to_envIdx.x);
    }
    L_cor.rgb = V3AddV3(DSE[0], DSE[1]);
    L_cor.rgb = V3Sqrt(L_cor.rgb);
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
    to_viewPos = viewPos;
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
    out_color = to_viewPos;
    out_color.z += shadowZOffset;
    out_color.a = 1.0;
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
    var sv;
    var outputIndex;
    var all = new CVec4(1.0, 1.0, 1.0, 1.0);
    BranchBegin("shadowMulti", "SDM", [alphaModel]);
    outputIndex = 0.0;
    all = new CVec4(0.0, 0.0, 0.0, 0.0);
    for (var i = 0; i < SDF.TexSizeMax; ++i) {
        if (i >= FloatToInt(shadowCount))
            break;
        sv = CalcShadow(IntToFloat(i), V3Nor(to_normal), to_worldPos, camPos, to_viewPos.xyz);
        all[FloatToInt(outputIndex)] = i > 3 ? min(all.a, sv) : sv;
        outputIndex = min(outputIndex + 1.0, 3.0);
    }
    BranchDefault();
    all.r = CalcShadow(0.0, V3Nor(to_normal), to_worldPos, camPos, to_viewPos.xyz);
    all.rgb = new CVec3(all.r, all.r, all.r);
    all.a = 1.0;
    BranchEnd();
    out_color = all;
}
