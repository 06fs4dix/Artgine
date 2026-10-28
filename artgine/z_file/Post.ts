import { VFXDown2, VFX, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, TexOffBlendFactorFun, vfxMat0, vfxMat1, BlendColor0, BlendColor1, BlendColor2, BlendColor3, BlendColor4, BlendColor5, BlendColor6, BlendColor7, BlendColor9, BlendColor8, BlendColor10, BlendColor11, BlendColor12, BlendColor13, BlendColor14, BlendColor15 } from "./ColorFun";
import { ambientColor, envCount,envPos, EnvNearest, ligCol, ligCount, ligDir, LightCac3D, ligMask, ligStep0, ligStep1, ligStep2, ligStep3, sam2DCount, samCubeCount, envmapOn, emission, emissiveIntensity } from "./Light";
import { SDF } from "./SDF";
import { 
    Attribute, BranchBegin, BranchEnd, Build, CMat, CMat3, CVec2, CVec3, CVec4, FloatToInt, IntToFloat, ToV2, UV2, 
    MappingTexToV3, Null, OutColor, OutPosition,Sam2D0ToColor,Sam2DSize,Sam2DToColor, Vertex3,
    V2MulV2, V2AddV2, V2DivV2, V2MulFloat, 
    V3AddV3, V3Dot, V3MulFloat, 
    V4AddV4, V4DivV4, V4MulFloat, V4MulMatCoordi, clamp, discard, max, pow, sampler2D, 
    SamCubeToColor,
    V3Nor,
    SamCubeLodToColor,
    Sam2DArrToV4,
    V3Sqrt
} from "./Shader";
import { shadowOn } from "./Shadow";
import { exposure, Tonemap, tonemappingType } from "./ToneMapping";

//mat
var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();
var viewMatInv3D : CMat=Null();

//varying
var to_uv : ToV2 = new CVec2(0.0, 0.0);

//out
var out_position : OutPosition = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_color : OutColor = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_emissive : OutColor = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_specular : OutColor = new CVec4(0.0, 0.0, 0.0, 0.0);

//common uniform
var renderCount : number=Null();
var renderType : number=Null();

var camPos3D : CVec3=Null();
var time : number = Attribute(0,"time");

//non multiTex uniform
var renType : number=0.0;

//tex offset
var sam2DDiffuse : sampler2D = 0.0;
var sam2DPosition : sampler2D = 1.0;
var sam2DNormal : sampler2D = 2.0;
var sam2DSpecular : sampler2D = 3.0;
var sam2DShadow : sampler2D = 4.0;


//Blend
Build("Artgine/Shader/PostBlend",["blend"],
    vs_main,[
        worldMat,viewMat,projectMat,
        BlendColor0,BlendColor1,BlendColor2,BlendColor3,
        BlendColor4,BlendColor5,BlendColor6,BlendColor7,
        BlendColor8,BlendColor9,BlendColor10,BlendColor11,
        BlendColor12,BlendColor13,BlendColor14,BlendColor15,
    ],[out_position,to_uv],
    ps_main_blend,[out_color]);
//Blur
Build("Artgine/Shader/PostBlur",["blur"],
    vs_main,[
        worldMat,viewMat,projectMat,renderCount,renderType
    ],[out_position,to_uv],
    ps_main_blur,[out_color]);
Build("Artgine/Shader/PostFloodFill",["floodFill"],
    vs_main,[
        worldMat,viewMat,projectMat,
    ],[out_position,to_uv],
    ps_main_floodFill,[out_color]);
//Light
Build("Artgine/Shader/PostLight",["light"],
    vs_main,[
        worldMat,viewMat,projectMat,
        viewMatInv3D, camPos3D,
        ligDir,ligCol,ligMask,ligCount,emission,emissiveIntensity,
        ambientColor,sam2DCount,samCubeCount,envmapOn,envCount,envPos,
        ligStep0,ligStep1,ligStep2,ligStep3,
        time,renType,
        sam2DDiffuse,sam2DPosition,sam2DNormal,sam2DSpecular,sam2DShadow
    ],[out_position,to_uv],
    ps_main_light,[out_color, out_specular, out_emissive]);
//baked light
Build("Artgine/Shader/PostExpandBakedLight",["bake"],
    vs_main,[
        worldMat,viewMat,projectMat,
    ],[out_position,to_uv],
    ps_main_ExpandBakedLight,[out_color]);

Build("Artgine/Shader/PostVFX",["vfx"],
    vs_main, [
        worldMat,viewMat,projectMat,
        VFX, time,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,vfxMat0,vfxMat1
    ],[out_position,to_uv],
    ps_main_vfx,[out_color]);

function vs_main(f3_ver : Vertex3, f2_uv : UV2) {
    to_uv = f2_uv;
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 2.0), 0.0, 1.0);
}

function ps_main_blend() {
    out_color = TexOffBlendFactorFun(to_uv);
}

function GetBlurColor(_uv : CVec2, _f : CVec2, _texScale : CVec2) : CVec4 {
    var uv : CVec2 = V2AddV2(_uv, V2MulV2(_f, _texScale));
    return Sam2DToColor(0.0, uv);
}

function ps_main_blur() {
    var all : CVec4 = new CVec4(0.0,0.0,0.0,0.0);

    var fCount : number = renderCount > 32.0 ? 32.0 : renderCount;
    var fx : number = -fCount;
    var fy : number = -fCount;
    var count : number = 0.0;
    var texScale : CVec2 = V2DivV2(new CVec2(1.0,1.0), Sam2DSize(0.0));

    if(renderType < 0.5) {
        // 0 전체 블러
        for(var y = 0; y < 64; y++) {
            for(var x = 0; x < 64; x++) {
                if(fx > fCount || fy > fCount) {
                    break;
                }
                var color : CVec4 = GetBlurColor(to_uv, new CVec2(fx, fy), texScale);
                if(color.a > 0.01) {
                    all = V4AddV4(all, color);
                    count += 1.0;
                }
                fx += 1.0;
            }
            fx = -fCount;
            fy += 1.0;
        }
        if(count > 0.5) {
            all = V4DivV4(all, new CVec4(count,count,count,count));
        }
    }
    else if(renderType < 1.5) {
        // 1 x블러
        fy = 0.0;
        for(var x = 0; x <= 64; x++) {
            if(fx > fCount) {
                break;
            }
            var color : CVec4 = GetBlurColor(to_uv, new CVec2(fx, fy), texScale);
            if(color.a > 0.01) {
                all = V4AddV4(all, color);
                count += 1.0;
            }
            fx += 1.0;
        }
        if(count > 0.5) {
            all = V4DivV4(all, new CVec4(count,count,count,count));
        }
    }
    else if(renderType < 2.5) {
        // 2 y블러
        fx = 0.0;
        for(var y = 0; y < 64; y++) {
            if(fy > fCount) {
                break;
            }
            var color : CVec4 = GetBlurColor(to_uv, new CVec2(fx, fy), texScale);
            if(color.a > 0.01) {
                all = V4AddV4(all, color);
                count += 1.0;
            }
            fy += 1.0;
        }
        if(count > 0.5) {
            all = V4DivV4(all, new CVec4(count,count,count,count));
        }
    }

    out_color = all;
}
function ps_main_floodFill() {
    var all : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
    var texScale : CVec2 = V2DivV2(new CVec2(1.0,1.0), Sam2DSize(0.0));
    var count : number=1.0;
    var x : number = -count;
    var foundShadow : number = 0.0;
    for(; x <= count + 0.5; x += 1.0) 
    {
        var y : number = -count;
        for(; y <= count + 0.5; y += 1.0) 
        {
            var uv : CVec2 = new CVec2(to_uv.x + x * texScale.x, to_uv.y + y * texScale.y);
            var color : CVec4 = Sam2DToColor(0.0, uv);
            if (color.r < 0.99) {
                foundShadow = color.r;
                break;
            }
        }
        if (foundShadow>0.5) break;
    }
  
    if (foundShadow>0.01) 
    {
        all = new CVec4(foundShadow, foundShadow, foundShadow, 1.0);  // 그림자 색
    } else {
        all = new CVec4(1.0, 1.0, 1.0, 1.0);  // 밝은 색 (비그림자)
    }
    
    

    //all=Sam2DToColor(0.0, to_uv);

    out_color = all;
}

function ps_main_light() {
    var L_dif : CVec4 = Sam2DToColor(sam2DDiffuse, to_uv);
    var L_pos : CVec4 = Sam2DToColor(sam2DPosition, to_uv);
    var L_nor : CVec4 = Sam2DToColor(sam2DNormal, to_uv);
    var L_spc : CVec4 = Sam2DToColor(sam2DSpecular, to_uv);

    var shadow : CVec4 = new CVec4(-1.0, -1.0, -1.0, -1.0);
    BranchBegin("shadow","S",[shadowOn]);
    if(shadowOn>0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, to_uv);
    }
    BranchEnd();

    var L_cor : CVec4 = L_dif;
    var worldPos : CVec4 = V4MulMatCoordi(new CVec4(L_pos.xyz, 1.0), viewMatInv3D);
    var normal : CVec3 = MappingTexToV3(L_nor.rgb);
    var maskIndex : number = L_pos.w;
    
    var envIdx : number = -1.0;
    BranchBegin("env","E",[envCount,envPos]);
    envIdx = EnvNearest(worldPos.xyz, normal);
    BranchEnd();

    var dseMat : CMat3 = LightCac3D(worldPos, L_dif, normal, shadow, maskIndex, L_spc.w, camPos3D, L_spc.y, L_spc.x, L_spc.z, envIdx);

    if(renType < 0.5) {
        // 0 diffuse
        out_color.rgb = dseMat[0];
        out_color.w = L_cor.w;
    }
    else if(renType < 1.5) {
        // 1 specular
        out_color.rgb = dseMat[1];
        out_color.w = L_cor.w;
    }
    else {
        // 2 emissive
        out_color.rgb = dseMat[2];
        out_color.w = L_cor.w;
    }

    //specular
    out_specular.rgb = dseMat[1];
    out_specular.w = L_cor.w;

    //emissive
    out_emissive.rgb = dseMat[2];
    out_emissive.w = L_cor.w;
}

function ps_main_ExpandBakedLight() {
    var L_cor : CVec4 = Sam2DToColor(0.0, to_uv);
    //(0, 0, 0, 0)아니면 그대로 출력
    if(L_cor.x >= 0.01 || L_cor.y >= 0.01 || L_cor.z >= 0.01 || L_cor.w >= 0.01) {
        out_color = L_cor;
        return;
    }

    //근처 픽셀 합성
    var accurate_cor : CVec4= new CVec4(0.0, 0.0, 0.0, 0.0);
    var texSize : CVec2 = Sam2DSize(0.0);
    var texScale : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);
    var count : number = 0.0;
    
    //얼마나 많은 주위 픽셀 변경할지 정함
    var adj_pixel_num : number = 3.0;
    for(var x = -FloatToInt(adj_pixel_num); x < FloatToInt(adj_pixel_num) + 1; x++) {
        for(var y = -FloatToInt(adj_pixel_num); y < FloatToInt(adj_pixel_num) + 1; y++) {
            var adjacentUV : CVec2 = new CVec2(
                texScale.x * IntToFloat(x) + to_uv.x, 
                texScale.y * IntToFloat(y) + to_uv.y
            );
            var adjacent_cor : CVec4= Sam2DToColor(0.0, adjacentUV);

            if(adjacent_cor.x >= 0.01 || adjacent_cor.y >= 0.01 || adjacent_cor.z >= 0.01 || adjacent_cor.w >= 0.01) {
                count += 1.0;
                accurate_cor = V4AddV4(accurate_cor, adjacent_cor);
            }
        }
    }

    if(count < 0.5) {
        discard;
    }

    out_color = V4MulFloat(accurate_cor, 1.0 / count);
}

function ps_main_vfx()
{
    out_color = VFXDown2(to_uv, VFX, time, new CVec4(0.0,0.0,0.0,0.0));
}