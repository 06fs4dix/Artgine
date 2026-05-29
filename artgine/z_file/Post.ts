import { VFXDown2, VFX, LUT0, LUT1, LUT2, LUT3, LUT4, LUT5, TexOffBlendFactorFun, TexOffBlendFactor, vfxMat0, vfxMat1 } from "./ColorFun";
import { envCube, EnvmapApprox, IntegrateBRDF, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "./Light";
import { SDF } from "./SDF";
import { 
    Attribute, BlendFun, BranchBegin, BranchDefault, BranchEnd, Build, CMat, CMat3, CMath, CVec2, CVec3, CVec4, FloatToInt, IntToFloat, 
    MappingTexToV3, Null, OutColor, OutPosition,Sam2D0ToColor,Sam2DArrToV4,Sam2DSize,Sam2DToColor, SaturateV3, 
    SaturateV4, ToV2, ToV3, UV2, V2Abs, V2AddV2, V2DivV2, V2Floor, V2Max, V2Min, V2Mod, V2MulFloat, 
    V2MulV2, V2SubV2, V3AddV3,V3Clamp,V3DivV3,V3Dot, V3Exp, V3Floor, V3Max, V3Min, V3Mix, 
    V3Mod, V3MulFloat, V3MulV3, V3Pow, V3PowV3, V3Step, V3SubV3, V4Abs, V4AddV4, V4DivV4, 
    V4Dot, V4Floor, V4Max, V4Mod, V4MulFloat, V4MulMatCoordi, V4MulV4, V4Pow, V4Step, 
    V4SubV4, Vertex3, abs, clamp, discard, floor, fract, gl_Position, max, min, mod, pow, sampler2D, screenPos, sign, sin, smoothstep 
} from "./Shader";

//mat
var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();



//varying
var to_uv : ToV2 = new CVec2(0.0, 0.0);
var to_worldPos : ToV3 = new CVec3(0.0, 0.0, 0.0);

//out
var out_position : OutPosition = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_color : OutColor = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_emissive : OutColor = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_specular : OutColor = new CVec4(0.0, 0.0, 0.0, 0.0);

//common uniform
var texCodi : CVec4 = new CVec4(0.0,0.0,0.0,0.0);
var renderCount : number=Null();
var renderType : number=Null();
var viewMatInv3D : CMat=Null();
var camPos3D : CVec3=Null();
var time : number = Attribute(0,"time");
var ambientColor : CVec3 = new CVec3(0.2,0.2,0.2);
var shadowOn : number = -1.0;

//non multiTex uniform
var renType : number=Null();

//blend uniform
const TexMax = 12;
var blend : Array<number> = new Array(TexMax);
var opacity : Array<number> = new Array(TexMax);


//tex offset
var diffuse : sampler2D = 0.0;
var position : sampler2D = 1.0;
var normal : sampler2D = 2.0;
var specular : sampler2D = 3.0;
var shadow : sampler2D = 4.0;


//for noise
/********************************/
//좌우로 흔들리는 정도(1.0이면 가장 왼쪽 픽셀이 가장 오른쪽까지 흔들림)
var distortDistance : CVec2 = new CVec2(0.02, 0.05);

/********************************/

//for noise
/********************************/
//항상 적용되고 있는 애버레이션 강도
var abrBaseStr : number = 0.005;
//시간에 따라 시야가 흔들리는 효과를 주는 애버레이션의 흔들림 강도
var abrAddedStr : number = 0.02;

/********************************/

//for pixelated image
/********************************/
var pixelSize : CVec2 = new CVec2(15.0, 10.0);

/********************************/

//for 80 computer
/********************************/
var borderThickness : number = 0.3;
var borderIntensity : number = 0.3;
var noiseSpeed : number = 4.0;
var noiseIntensity : number = 0.25;
var scanLineDensity : number = 192.0;
var scanLineThickness : number = 0.3;
var scanLineIntensity : number = 0.5;

/********************************/

//for fxaa
/********************************/
var span_max : number = 8.0;
var reduce_mul : number = 0.125;
var reduce_min : number = 0.0078125;
var subpix_shift : number = 0.25;

/********************************/

//for gamma
/********************************/
var gamma : number = 2.2;
var exposure : number = 1.0;
var contrast : number = 1.5;
var brightness : number = 1.2;
var colorCorrection : CVec3 = new CVec3(1.2,1.1,1.0);
var toneMappingFactor : number = 0.5;

/********************************/

//for sample
/********************************/

var mipLevel : number=Null();
var threshold : number=Null();
var softThreshold : number=Null();
var mixFactor : number=Null();
var exposure : number=Null();

var blendFactor : number=Null();
/********************************/

/********************************/

//Blend
Build("Artgine/Shader/PostBlend",["blend"],
    vs_main,[
        worldMat,viewMat,projectMat,TexOffBlendFactor
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
        ligDir,ligCol,ligCount,
        envCube,ambientColor,
        ligStep0,ligStep1,ligStep2,ligStep3,
        time,renType,EnvmapApprox,
        diffuse,position,normal,specular,shadow
    ],[out_position,to_uv],
    ps_main_light,[out_color]);
//Light MultiTex
Build("Artgine/Shader/PostLightMulti",["lightMulti"],
    vs_main,[
        worldMat,viewMat,projectMat,
        viewMatInv3D, camPos3D,
        ligDir,ligCol,ligCount,
        envCube,ambientColor,
        ligStep0,ligStep1,ligStep2,ligStep3,
        time,EnvmapApprox,
        diffuse,position,normal,specular,shadow
    ],[out_position,to_uv],
    ps_main_light_MultiTex,[out_color, out_specular, out_emissive]);
//baked light
Build("Artgine/Shader/PostExpandBakedLight",["bake"],
    vs_main,[
        worldMat,viewMat,projectMat,
    ],[out_position,to_uv],
    ps_main_ExpandBakedLight,[out_color]);

//아래는 반드시 float texture텍스쳐를 받고 float texture로 내보내야 함
//https://catlikecoding.com/unity/tutorials/advanced-rendering/
Build("Artgine/Shader/PostDownSample",["sample", "down"],
    vs_main, [
        worldMat,viewMat,projectMat,
        mipLevel,
        threshold,softThreshold
    ],[out_position,to_uv],
    ps_main_DownSample,[out_color]);
Build("Artgine/Shader/PostUpSample",["sample", "up"],
    vs_main, [
        worldMat,viewMat,projectMat,
        blendFactor
    ],[out_position,to_uv],
    ps_main_UpSample,[out_color]);

Build("Artgine/Shader/PostVFX",["vfx"],
    vs_main, [
        worldMat,viewMat,projectMat,
        VFX, time,LUT0,LUT1,LUT2,LUT3,LUT4,LUT5,vfxMat0,vfxMat1
    ],[out_position,to_uv],
    ps_main_vfx,[out_color]);


Build("Artgine/Shader/PostBRDF",["brdf"],
    vs_main, [
        worldMat,viewMat,projectMat
    ],[out_position,to_uv],
    ps_main_brdf,[out_color]);

function vs_main(f3_ver : Vertex3, f2_uv : UV2) {
    to_uv = f2_uv;
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 0.2), 0.0, 1.0);
}

function ps_main_blend() {
    var all : CVec4 = Sam2DToColor(0.0, to_uv);

    out_color=TexOffBlendFactorFun(all,to_uv,TexOffBlendFactor);
}

function GetBlurColor(_uv : CVec2, _f : CVec2, _texScale : CVec2) : CVec4 {
    var uv : CVec2 = V2AddV2(_uv, V2MulV2(_f, _texScale));
    return Sam2DToColor(0.0, uv);
}

function ps_main_blur() {
    var all : CVec4 = new CVec4(0.0,0.0,0.0,0.0);

    var fx : number = -renderCount;
    var fy : number = -renderCount;
    var count : number = 0.0;
    if(renderCount > 32.0) {
        fx = -32.0;
        fy = -32.0;
    }
    var texScale : CVec2 = V2DivV2(new CVec2(1.0,1.0), Sam2DSize(0.0));

    //전체 블러
    if(renderType < 0.1) {
        for(var y = 0; y < 64; y++) {
            for(var x = 0; x < 64; x++) {
                if(fx <= renderCount && fy <= renderCount) {
                    var color : CVec4 = GetBlurColor(to_uv, new CVec2(fx, fy), texScale);
                    if(color.a > 0.01) {
                        all = V4AddV4(all, color);
                        count += 1.0;
                    }
                } else
                    break;
                fx += 1.0;
            }
            fx = -renderCount;
            fy += 1.0;
        }
        if(count > 0.01) {
            all = V4DivV4(all, new CVec4(count,count,count,count));
            all = SaturateV4(all);
        }
    }
    //x 블러
    else if(renderType < 1.1) {
        fy = 0.0;
        for(var x = 0; x <= 64; x++) {
            if(fx <= renderCount && fy <= renderCount) {
                var color : CVec4 = GetBlurColor(to_uv, new CVec2(fx, fy), texScale);
                if(color.a > 0.01) {
                    all = V4AddV4(all, color);
                    count += 1.0;
                }
            } else
                break;
            fx += 1.0;
        }
        if(count > 0.01) {
            all = V4DivV4(all, new CVec4(count,count,count,count));
            all = SaturateV4(all);
        }
    }
    //y 블러
    else if(renderType < 2.1) {
        fx = 0.0;
        for(var y = 0; y < 64; y++) {
            if(fx<=renderCount && fy <=renderCount) {
                var color : CVec4 = GetBlurColor(to_uv, new CVec2(fx, fy), texScale);
                if(color.a > 0.01) {
                    all = V4AddV4(all, color);
                    count += 1.0;
                }
            } else
                break;
            fy += 1.0;
        }
        if(count > 0.01) {
            all = V4DivV4(all, new CVec4(count,count,count,count));
            all = SaturateV4(all);
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
    var L_dif : CVec4 = Sam2DToColor(diffuse, to_uv);
    var L_pos : CVec4 = Sam2DToColor(position, to_uv);
    var L_nor : CVec4 = Sam2DToColor(normal, to_uv);
    var L_spc : CVec3 = Sam2DToColor(specular, to_uv).xyz;

    var shadow : number = -1.0;
    BranchBegin("shadow","S",[shadowOn]);
    if(shadowOn > 0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, to_uv).x;
    }
    BranchEnd();

    var L_cor : CVec4 = new CVec4(0.0,0.0,0.0,L_dif.a);
    
    var worldPos : CVec4 = V4MulMatCoordi(L_pos, viewMatInv3D);

    var Normal : CVec3 = MappingTexToV3(L_nor.rgb);
    // var SpecularStrength : number = L_spc.y;
    // var Emissive : number = L_spc.x;
    // var SpecularPower : number = L_spc.z;
  

    var dseMat : CMat3 = LightCac3D(camPos3D, worldPos, L_dif, Normal, shadow, L_spc.y, L_spc.x,L_spc.z, ambientColor, 1.0);

    //diffuse
    if(renType < 0.5)
        L_cor.rgb = dseMat[0];
    //specular
    else if(renType < 1.5)
    {
        //L_cor.rgb = L_spc.xyz;
        L_cor.rgb = dseMat[1];
    }
        
    //emissive
    else
        L_cor.rgb = dseMat[2];
    out_color = L_cor;
    //out_color = new CVec4(shadow,shadow,shadow,1.0);
}

function ps_main_light_MultiTex() {
    var L_dif : CVec4 = Sam2DToColor(diffuse, to_uv);
    var L_pos : CVec4 = Sam2DToColor(position, to_uv);
    var L_nor : CVec4 = Sam2DToColor(normal, to_uv);
    var L_spc : CVec3 = Sam2DToColor(specular, to_uv).xyz;

    var shadow : number = -1.0;
    BranchBegin("shadow","S",[shadowOn]);
    if(shadowOn > 0.5) {
        shadow = Sam2DToColor(SDF.eTexSlot.SingleShadowRead, to_uv).x;
    }
    BranchEnd();
    
    var L_cor : CVec4 = new CVec4(0.0,0.0,0.0,L_dif.a);
    
    var worldPos : CVec4 = V4MulMatCoordi(L_pos, viewMatInv3D);

    var Normal : CVec3 = MappingTexToV3(L_nor.rgb);
    var SpecularStrength : number = L_spc.x;
    var Emissive : number = L_spc.y;
    var SpecularPower : number = L_spc.z;

    var dseMat : CMat3 = LightCac3D(camPos3D, worldPos, L_dif, Normal, shadow, SpecularStrength, Emissive,SpecularPower, ambientColor, 1.0);

    //diffuse + 톤매핑
    out_color.rgb = dseMat[0];
    out_color.w = L_cor.w;

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

function TosRGB(_col : CVec3) : CVec3 {
    return new CVec3(pow(_col.x, 1.0/2.2),pow(_col.y, 1.0/2.2),pow(_col.z, 1.0/2.2));
}

function tonemapping_luminance(_col : CVec3) : number {
    return V3Dot(_col, new CVec3(0.2126, 0.7152, 0.0722));
}

function KarisAverage(_col : CVec3) : number {
    var sRGB : CVec3 = TosRGB(_col);
    var luman : number = tonemapping_luminance(sRGB) / 4.0;
    return 1.0 / (1.0 + luman);
}

function PreFilter(_col : CVec3) : CVec3 {
    var brightness : number = max(max(_col.x, _col.y), _col.z);
    var knee : number = threshold * softThreshold;
    var softness : number = brightness - (threshold - knee);
    softness = clamp(softness, 0.0, 2.0 * knee);
    softness = softness * softness * (4.0 * knee + 0.00001);
    var contribution : number= max(brightness - threshold, softness);
    contribution /= max(brightness, 0.00001);
    return V3MulFloat(_col, contribution);
}

/**     샘플링 방법
 *      a   1   b   3   c
 *      5   j   7   k   9
 *      d   11  e   13  f 
 *      15  l   17  m   19
 *      g   21  h   23  i
 * 
 *      point   :   weight  :   sum
 *      j,k,l,m :   0.125   :   0.125*4=0.5
 * 
 *      b,d,f,h :   0.0625  :   0.0625*4=0.25
 * 
 *      a,c,g,i :   0.03125 :   0.03125*4=0.125
 * 
 *      e       :   0.125   :   0.125
 * 
 */

function ps_main_DownSample() {
    var texSize : CVec2 = Sam2DSize(0.0);
    var x : number = 1.0 / texSize.x;
    var y : number = 1.0 / texSize.y;

    var uvx : number = to_uv.x;
    var uvy : number = to_uv.y;

    // 5x5 텐트형 표본(대칭 유지, half-texel 불가산)
    var a : CVec3 = Sam2D0ToColor(new CVec2(uvx - 2.0*x, uvy + 2.0*y)).rgb;
    var b : CVec3 = Sam2D0ToColor(new CVec2(uvx         , uvy + 2.0*y)).rgb;
    var c : CVec3 = Sam2D0ToColor(new CVec2(uvx + 2.0*x, uvy + 2.0*y)).rgb;

    var d : CVec3 = Sam2D0ToColor(new CVec2(uvx - 2.0*x, uvy          )).rgb;
    var e : CVec3 = Sam2D0ToColor(new CVec2(uvx         , uvy          )).rgb; // center
    var f : CVec3 = Sam2D0ToColor(new CVec2(uvx + 2.0*x, uvy          )).rgb;

    var g : CVec3 = Sam2D0ToColor(new CVec2(uvx - 2.0*x, uvy - 2.0*y)).rgb;
    var h : CVec3 = Sam2D0ToColor(new CVec2(uvx         , uvy - 2.0*y)).rgb;
    var i : CVec3 = Sam2D0ToColor(new CVec2(uvx + 2.0*x, uvy - 2.0*y)).rgb;

    var j : CVec3 = Sam2D0ToColor(new CVec2(uvx - 1.0*x, uvy + 1.0*y)).rgb;
    var k : CVec3 = Sam2D0ToColor(new CVec2(uvx + 1.0*x, uvy + 1.0*y)).rgb;
    var l : CVec3 = Sam2D0ToColor(new CVec2(uvx - 1.0*x, uvy - 1.0*y)).rgb;
    var m : CVec3 = Sam2D0ToColor(new CVec2(uvx + 1.0*x, uvy - 1.0*y)).rgb;

    if (mipLevel < 0.5) {
        var g0 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(a,b), V3AddV3(d,e)), 0.125/4.0);
        var g1 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(b,c), V3AddV3(e,f)), 0.125/4.0);
        var g2 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(d,e), V3AddV3(g,h)), 0.125/4.0);
        var g3 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(e,f), V3AddV3(h,i)), 0.125/4.0);
        var g4 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(j,k), V3AddV3(l,m)), 0.5/4.0);

        g0 = V3MulFloat(g0, KarisAverage(g0));
        g1 = V3MulFloat(g1, KarisAverage(g1));
        g2 = V3MulFloat(g2, KarisAverage(g2));
        g3 = V3MulFloat(g3, KarisAverage(g3));
        g4 = V3MulFloat(g4, KarisAverage(g4));

        out_color.rgb = V3AddV3(V3AddV3(V3AddV3(g0, g1), V3AddV3(g2, g3)), g4);
        out_color.rgb = PreFilter(out_color.rgb);  // mip0에서만
    } else {
        out_color.rgb  = V3MulFloat(e, 0.125);
        out_color.rgb  = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(a,c), V3AddV3(g,i)), 0.03125));
        out_color.rgb  = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(b,d), V3AddV3(f,h)), 0.0625));
        out_color.rgb  = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(j,k), V3AddV3(l,m)), 0.125));
    }

    out_color.w = 1.0;
}
/**     샘플링 방법
 *      
 *      a   b   c
 *      d   e   f
 *      g   h   i
 * 
 *      point   :   weight  :   sum
 *      e       :   0.25    :   0.25
 *      b,d,f,h :   0.125   :   0.125*4=0.5
 *      a,c,g,i :   0.0625  :   0.0625*4=0.25
 * 
 */
function ps_main_UpSample() {
    var texSize : CVec2 = Sam2DSize(0.0);
    var x : number = 1.0 / texSize.x;
    var y : number = 1.0 / texSize.y;

    var uvx : number = to_uv.x;
    var uvy : number = to_uv.y;

    var a : CVec3 = Sam2D0ToColor(new CVec2(uvx - x, uvy + y)).rgb;
    var b : CVec3 = Sam2D0ToColor(new CVec2(uvx    , uvy + y)).rgb;
    var c : CVec3 = Sam2D0ToColor(new CVec2(uvx + x, uvy + y)).rgb;

    var d : CVec3 = Sam2D0ToColor(new CVec2(uvx - x, uvy    )).rgb;
    var e : CVec3 = Sam2D0ToColor(new CVec2(uvx    , uvy    )).rgb;
    var f : CVec3 = Sam2D0ToColor(new CVec2(uvx + x, uvy    )).rgb;

    var g : CVec3 = Sam2D0ToColor(new CVec2(uvx - x, uvy - y)).rgb;
    var h : CVec3 = Sam2D0ToColor(new CVec2(uvx    , uvy - y)).rgb;
    var i : CVec3 = Sam2D0ToColor(new CVec2(uvx + x, uvy - y)).rgb;

    var col : CVec3 = V3MulFloat(e, 0.25);
    col = V3AddV3(col, V3MulFloat(V3AddV3(V3AddV3(b,d), V3AddV3(f,h)), 0.125));
    col = V3AddV3(col, V3MulFloat(V3AddV3(V3AddV3(a,c), V3AddV3(g,i)), 0.0625));

    // (현재 ONE,ONE) → 프리멀티로 팩터 적용
    col = V3MulFloat(col, blendFactor);

    out_color.rgb = col;
    out_color.w   = blendFactor; // 정보용
}

function ps_main_vfx()
{
    out_color = VFXDown2(to_uv, VFX, time, new CVec4(0.0,0.0,0.0,0.0));
}


function ps_main_brdf()
{
    var integratedBRDF : CVec2 = IntegrateBRDF(to_uv.x, to_uv.y);
    out_color = new CVec4(integratedBRDF, 0.0, 1.0);
}