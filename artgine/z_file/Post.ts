import { envCube, ligCol, ligCount, ligDir, LightCac3D, ligStep0, ligStep1, ligStep2, ligStep3 } from "./Light";
import { SDF } from "./SDF";
import { 
    Attribute, BlendFun, Build, CMat, CMat3, CMath, CVec2, CVec3, CVec4, FloatToInt, IntToFloat, 
    MappingTexToV3, Null, OutColor, OutPosition,Sam2D0ToColor,Sam2DSize,Sam2DToColor, SaturateV3, 
    SaturateV4, ToV2, ToV3, UV2, V2Abs, V2AddV2, V2DivV2, V2Floor, V2Max, V2Min, V2MulFloat, 
    V2MulV2, V2SubV2, V3AddV3,V3DivV3,V3Dot, V3Exp, V3Floor, V3Max, V3Min, V3Mix, 
    V3Mod, V3MulFloat, V3MulV3, V3Pow, V3PowV3, V3Step, V3SubV3, V4Abs, V4AddV4, V4DivV4, 
    V4Dot, V4Floor, V4Max, V4Mod, V4MulFloat, V4MulMatCoordi, V4MulV4, V4Pow, V4Step, 
    V4SubV4, Vertex3, abs, clamp, discard, fract, gl_Position, max, min, pow, sampler2D, screenPos, sign, sin, smoothstep 
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

//Blend
Build("PostBlend",["blend"],
    vs_main,[
        worldMat,viewMat,projectMat,blend,opacity
    ],[out_position,to_uv],
    ps_main_blend,[out_color]);
//Blur
Build("PostBlur",["blur"],
    vs_main,[
        worldMat,viewMat,projectMat,renderCount,renderType
    ],[out_position,to_uv],
    ps_main_blur,[out_color]);
Build("PostFloodFill",["floodFill"],
        vs_main,[
            worldMat,viewMat,projectMat,
        ],[out_position,to_uv],
        ps_main_floodFill,[out_color]);
//Light
Build("PostLight",["light"],
    vs_main,[
        worldMat,viewMat,projectMat,
        viewMatInv3D, camPos3D,
        ligDir,ligCol,ligCount,shadowOn,
        envCube,ambientColor,
        ligStep0,ligStep1,ligStep2,ligStep3,
        time,renType,
        diffuse,position,normal,specular,shadow
    ],[out_position,to_uv],
    ps_main_light,[out_color]);
//Light MultiTex
Build("PostLightMulti",["lightMulti"],
    vs_main,[
        worldMat,viewMat,projectMat,
        viewMatInv3D, camPos3D,
        ligDir,ligCol,ligCount,shadowOn,
        envCube,ambientColor,
        ligStep0,ligStep1,ligStep2,ligStep3,
        time,
        diffuse,position,normal,specular,shadow
    ],[out_position,to_uv],
    ps_main_light_MultiTex,[out_color, out_specular, out_emissive]);
//Distort
Build("PostDistort",["distort"],
    vs_main,[
        worldMat,viewMat,projectMat,
        time,
        distortDistance
    ],[out_position,to_uv],
    ps_main_distort,[out_color]);
//Aberrate
Build("PostAberrate",["aberrate"],
    vs_main,[
        worldMat,viewMat,projectMat,
        time,
        abrBaseStr,abrAddedStr
    ],[out_position,to_uv],
    ps_main_aberrate,[out_color]);
//Pixel
Build("PostPixel",["pixel"],
    vs_main,[
        worldMat,viewMat,projectMat,
        pixelSize
    ],[out_position,to_uv],
    ps_main_pixel,[out_color]);
//Noise
Build("PostNoise",["noise"],
    vs_main_modelPos,[
        worldMat,viewMat,projectMat,
        time,
        noiseSpeed,noiseIntensity
    ],[out_position,to_uv, to_worldPos],
    ps_main_noise,[out_color]);
//tvBorder
Build("PostTVBorder",["tvBorder"],
    vs_main_modelPos,[
        worldMat,viewMat,projectMat,
        borderIntensity,borderThickness
    ],[out_position,to_uv, to_worldPos],
    ps_main_tvBorderLight,[out_color]);
//ScanLine
Build("PostScanLine",["scanline"],
    vs_main_modelPos,[
        worldMat,viewMat,projectMat,
        scanLineThickness,scanLineDensity,scanLineIntensity
    ],[out_position,to_uv, to_worldPos],
    ps_main_scanLine,[out_color]);
//Fxaa
Build("PostFXAA",["fxaa"],
    vs_main,[
        worldMat,viewMat,projectMat,
        span_max,reduce_mul,reduce_min,subpix_shift
    ],[out_position,to_uv],
    ps_main_fxaa,[out_color]);
//Gamma
Build("PostGamma",["gamma"],
    vs_main,[
        worldMat,viewMat,projectMat,
        gamma,brightness,toneMappingFactor,colorCorrection,exposure,contrast
    ],[out_position,to_uv],
    ps_main_gamma,[out_color]);
//baked light
Build("PostExpandBakedLight",["bake"],
    vs_main,[
        worldMat,viewMat,projectMat,
    ],[out_position,to_uv],
    ps_main_ExpandBakedLight,[out_color]);
//아래는 반드시 float texture텍스쳐를 받고 float texture로 내보내야 함
//https://catlikecoding.com/unity/tutorials/advanced-rendering/
Build("PostDownSample",["sample", "down"],
    vs_main, [
        worldMat,viewMat,projectMat,
        mipLevel,
        threshold,softThreshold
    ],[out_position,to_uv],
    ps_main_DownSample,[out_color]);
Build("PostUpSample",["sample", "up"],
    vs_main, [
        worldMat,viewMat,projectMat,
        blendFactor
    ],[out_position,to_uv],
    ps_main_UpSample,[out_color]);

function GetTexCodiedUV(_uv : CVec2, _texCodi : CVec4) : CVec2 {
    var result : CVec2 = new CVec2(_uv.x * _texCodi.x + _texCodi.z, _uv.y * _texCodi.y + _texCodi.w);
    if(result.x < 0.0)
        result.x = result.x * -1.0;
    if(result.y < 0.0)
        result.y = result.y * -1.0;
    return result;
}

function vs_main(f3_ver : Vertex3, f2_uv : UV2) {
    //to_uv = GetTexCodiedUV(f2_uv, texCodi);
    to_uv = f2_uv;
    //out_position = LWVPMul(f3_ver,worldMat,viewMat,projectMat);
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 0.2), 0.0, 1.0);
}

function vs_main_modelPos(f3_ver : Vertex3, f2_uv : UV2) {
    //to_uv = GetTexCodiedUV(f2_uv, texCodi);
    to_uv = f2_uv;
    to_worldPos = f3_ver;
    //out_position = LWVPMul(f3_ver,worldMat,viewMat,projectMat);
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 0.2), 0.0, 1.0);
}

function ps_main_blend() {
    var all : CVec4 = Sam2DToColor(0.0, to_uv);
    for(var i = 0; i < TexMax; i++) {
        if(blend[i] != 0.0) {
            var tCol : CVec4 = Sam2DToColor(IntToFloat(i + 1), to_uv);
            var op : number=opacity[i];
            if(SDF.eBlend.LinearDodge<=blend[i]+0.5)
            {
                // org + tar * per
                all = V4AddV4(all,V4MulFloat(tCol,op));
            }
            else if(SDF.eBlend.Multiply<=blend[i]+0.5)
            {
                // org * ( tar*per + (1-per) )
                all = V4MulV4(
                    all,
                    V4AddV4(
                        V4MulFloat(tCol,op),
                        V4SubV4(new CVec4(1.0,1.0,1.0,1.0),new CVec4(op,op,op,op))
                    )
                );
            }
            else if(SDF.eBlend.LerpPer<=blend[i]+0.5)
            {
                // org + (tar - org) * per
                var diff : CVec4 = V4SubV4(tCol, all);
                all = V4AddV4(all, V4MulFloat(diff, op));
            }
            else if(SDF.eBlend.LerpAlpha<=blend[i]+0.5)
            {
                // rgb: org.rgb*(1-org.a) + tar.rgb*tar.a, a=1
                var invOrgA : number = 1.0 - all.a;
                var srcA :number   = tCol.a;
                all = new CVec4(
                    all.r * invOrgA + tCol.r * srcA,
                    all.g * invOrgA + tCol.g * srcA,
                    all.b * invOrgA + tCol.b * srcA,
                    1.0
                );
            }
            else if(SDF.eBlend.Darken<=blend[i]+0.5)
            {
                var so : number = all.r + all.g + all.b;
                var st : number = tCol.r + tCol.g + tCol.b;
                all = so < st ? all : tCol;
            }
            else if(SDF.eBlend.Lighten<=blend[i]+0.5)
            {
                var so : number= all.r + all.g + all.b;
                var st : number= tCol.r + tCol.g + tCol.b;
                all = so > st ? all : tCol;
            }
            else if(SDF.eBlend.Tar<=blend[i]+0.5)
            {
                all = tCol;
            }
            else if(SDF.eBlend.DarkCut<=blend[i]+0.5)
            {
                var so : number = all.r + all.g + all.b;
                all = so < 2.5  ? new CVec4(0.0, 0.0, 0.0, 0.0): tCol;
            }
            
        } 
        else 
        {
            break;
        }
        all.rgb = SaturateV3(all.rgb);
        all.a = 1.0;
    }
    out_color = all;
    //out_color = new CVec4(1.0,1.0,1.0,1.0);
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
    if(shadowOn > 0.5) {
        shadow = Sam2DToColor(shadowOn, to_uv).x;
    }
    var L_cor : CVec4 = new CVec4(0.0,0.0,0.0,L_dif.a);
    
    var worldPos : CVec4 = V4MulMatCoordi(L_pos, viewMatInv3D);

    var Normal : CVec3 = MappingTexToV3(L_nor.rgb);
    // var SpecularStrength : number = L_spc.y;
    // var Emissive : number = L_spc.x;
    // var SpecularPower : number = L_spc.z;
  

    var dseMat : CMat3 = LightCac3D(camPos3D, worldPos, L_dif, Normal, shadow, L_spc.y, L_spc.x,L_spc.z, ambientColor);

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
    if(shadowOn > 0.5) {
        shadow = Sam2DToColor(shadowOn, to_uv).x;
    }
    
    var L_cor : CVec4 = new CVec4(0.0,0.0,0.0,L_dif.a);
    
    var worldPos : CVec4 = V4MulMatCoordi(L_pos, viewMatInv3D);

    var Normal : CVec3 = MappingTexToV3(L_nor.rgb);
    var SpecularStrength : number = L_spc.x;
    var Emissive : number = L_spc.y;
    var SpecularPower : number = L_spc.z;

    var dseMat : CMat3 = LightCac3D(camPos3D, worldPos, L_dif, Normal, shadow, SpecularStrength, Emissive,SpecularPower, ambientColor);

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

function GetDistortedUV(_uv : CVec2, _distance : CVec2, _t : number) : CVec2 {
    var line : number = max(0.0, sin(_uv.y * 3.8 + _t * 1.4) * sin(_uv.y * 0.6 + _t * 2.3));
    var horDis : number = sin(_uv.y * 2.0 + _t) + sin(_uv.y * 50.0 + _t * 5.7) * 0.3 +
        sin(_uv.y * 500.0 + _t * 20.0) * 0.1;
    horDis *= _distance.x * line;
    var verDis : number = sin(_uv.y * 2.5 + 5.1 + _t * 1.4) *
        sign(sin(_uv.y * 3.6 + _t * 2.4));
    verDis *= _distance.y * line;
    return V2AddV2(_uv, new CVec2(horDis, verDis));
}

function GetAberratedColor(_texOff : number, _uv : CVec2, _t : number, _baseStr : number, _addedStr : number) : CVec3 {
    var line : number = max(0.0, sin(_uv.y * 3.8 + _t * 1.4) * sin(_uv.y * 0.6 + _t * 2.3));
    var aberration_strength : number = (0.1 + line) * _addedStr + _baseStr;
    return SaturateV3(new CVec3(
        Sam2DToColor(_texOff, new CVec2(_uv.x - aberration_strength, _uv.y)).r,
        Sam2DToColor(_texOff, _uv).g,
        Sam2DToColor(_texOff, new CVec2(_uv.x + aberration_strength, _uv.y)).b
    ));
}

function GetPixelatedUV(_texSize : CVec2, _pixelSize : CVec2, _uv : CVec2) : CVec2 {
    var d : CVec2 = V2DivV2(_pixelSize, _texSize);
    return V2MulV2(d, V2AddV2(V2Floor(V2DivV2(_uv, d)), new CVec2(0.5,0.5)));
}

function permute(_x : CVec4) : CVec4 {
    var x : CVec4 = V4MulV4(_x, V4AddV4(V4MulFloat(_x, 34.0), new CVec4(10.0,10.0,10.0,10.0)));
    return V4Mod(x, 289.0);
}

function taylorInvSqrt(_r : CVec4) : CVec4 {
    return CMath.V4SubV4(new CVec4(1.79284291400159,1.79284291400159,1.79284291400159,1.79284291400159), CMath.V4MulFloat(_r, 0.85373472095314));
}

function SNoise(_v : CVec3) : number {
    var C : CVec2 = new CVec2(1.0 / 6.0, 1.0 / 3.0);
    var D : CVec4 = new CVec4(0.0,0.5,1.0,2.0);

    //first corner
    var dotVal : number = V3Dot(_v, new CVec3(C.y,C.y,C.y));
    var i : CVec3 = V3Floor(CMath.V3AddV3(_v, new CVec3(dotVal,dotVal,dotVal)));
    dotVal = V3Dot(i, new CVec3(C.x,C.x,C.x));
    var x0 : CVec3 = V3AddV3(CMath.V3SubV3(_v, i), new CVec3(dotVal,dotVal,dotVal));

    //other corner
    var g : CVec3 = V3Step(new CVec3(x0.y, x0.z, x0.x), x0);
    var l : CVec3 = CMath.V3SubV3(new CVec3(1.0,1.0,1.0), g);
    var i1 : CVec3 = V3Min(g, new CVec3(l.z, l.x, l.y));
    var i2 : CVec3 = V3Max(g, new CVec3(l.z, l.x, l.y));
    var x1 : CVec3 = V3AddV3(CMath.V3SubV3(x0, i1), new CVec3(C.x));
    var x2 : CVec3 = V3AddV3(CMath.V3SubV3(x0, i2), new CVec3(C.y));
    var x3 : CVec3 = CMath.V3SubV3(x0, new CVec3(D.y));
    
    //permutation
    i = V3Mod(i, 289.0);
    var p : CVec4 = permute(
        new CVec4(i.z,i.z + i1.z,i.z + i2.z,i.z + 1.0)
    );
    p = permute(
        new CVec4(p.x + i.y, p.y + i.y + i1.y, p.z + i.y + i2.y, p.w + i.y + 1.0)
    );
    p = permute(
        new CVec4(p.x + i.x, p.y + i.x + i1.x, p.z + i.x + i2.x, p.w + i.x + 1.0)
    );

    //gradient
    var n_ : number = 1.0 / 7.0;
    var ns : CVec3 = CMath.V3MulFloat(new CVec3(D.w, D.y, D.z), n_);
    ns = CMath.V3SubV3(ns, new CVec3(D.x, D.z, D.x));
    var floor_p : CVec4 = V4Floor(V4MulFloat(p, ns.z * ns.z));
    var j : CVec4 = V4SubV4(p, V4MulFloat(floor_p, 49.0));
    var x_ : CVec4 = V4Floor(CMath.V4MulFloat(j, ns.z));
    var y_ : CVec4 = V4Floor(CMath.V4SubV4(j, CMath.V4MulFloat(x_, 7.0)));

    var x : CVec4 = CMath.V4AddV4(CMath.V4MulFloat(x_, ns.x), new CVec4(ns.y));
    var y : CVec4 = CMath.V4AddV4(CMath.V4MulFloat(y_, ns.x), new CVec4(ns.y));
    var h : CVec4 = CMath.V4SubV4(CMath.V4SubV4(new CVec4(1.0,1.0,1.0,1.0), V4Abs(x)), V4Abs(y));

    var b0 : CVec4 = new CVec4(x.x, x.y, y.x, y.y);
    var b1 : CVec4 = new CVec4(x.z, x.w, y.z, y.w);

    var s0 : CVec4 = CMath.V4AddV4(CMath.V4MulFloat(V4Floor(b0), 2.0), new CVec4(1.0,1.0,1.0,1.0));
    var s1 : CVec4 = CMath.V4AddV4(CMath.V4MulFloat(V4Floor(b1), 2.0), new CVec4(1.0,1.0,1.0,1.0));
    var sh : CVec4 = CMath.V4MulFloat(V4Step(h, new CVec4(0.0,0.0,0.0,0.0)), -1.0);

    var a0 : CVec4 = CMath.V4AddV4(new CVec4(b0.x,b0.z,b0.y,b0.w), new CVec4(s0.x * sh.x, s0.z*sh.x,s0.y*sh.y,s0.w*sh.y));
    var a1 : CVec4 = CMath.V4AddV4(new CVec4(b1.x,b1.z,b1.y,b1.w), new CVec4(s1.x*sh.z,s1.z*sh.z,s1.y*sh.w,s1.w*sh.w));

    var p0 : CVec3 = new CVec3(a0.x,a0.y,h.x);
    var p1 : CVec3 = new CVec3(a0.z,a0.w,h.y);
    var p2 : CVec3 = new CVec3(a1.x,a1.y,h.z);
    var p3 : CVec3 = new CVec3(a1.z,a1.w,h.w);

    //normalize gradient
    var norm : CVec4 = taylorInvSqrt(new CVec4(V3Dot(p0, p0), V3Dot(p1, p1), V3Dot(p2, p2), V3Dot(p3, p3)));
    p0 = CMath.V3MulFloat(p0, norm.x);
    p1 = CMath.V3MulFloat(p1, norm.y);
    p2 = CMath.V3MulFloat(p2, norm.z);
    p3 = CMath.V3MulFloat(p3, norm.w);

    //mix final noise
    var mix : CVec4 = V4SubV4(new CVec4(0.5,0.5,0.5,0.5), new CVec4(V3Dot(x0, x0), V3Dot(x1, x1), V3Dot(x2, x2),  V3Dot(x3, x3)));
    mix = V4Max(mix, new CVec4(0.0,0.0,0.0,0.0));
    mix = V4Pow(mix, 4.0);
    var noise : CVec4 = new CVec4(V3Dot(p0, x0), V3Dot(p1, x1), V3Dot(p2, x2), V3Dot(p3, x3));
    return 105.0 * V4Dot(mix, noise);
}

function TimedNoise(_m : CVec3, _t : number) : number {
    return SNoise(new CVec3(_m.x * 500.0, _m.y * 500.0, _t));
}

function AddScanLine(_m : CVec3, _c : CVec4) : CVec4 {
    var t : number = 10.0 + _m.y / 10.0 * scanLineDensity;

    var distToFloor : number = fract(t);
    var distToCeil : number = 1.0 - distToFloor;
    var distToNearestInt : number = min(distToCeil, distToFloor);

    var intensity : number = 1.0 - smoothstep(0.0, scanLineThickness, distToNearestInt);
    var factor : number = max(0.0, 1.0 - intensity * scanLineIntensity);
    return CMath.V4MulFloat(_c, factor);
}

function AddNoise(_m : CVec3, _c : CVec4, _t : number) : CVec4 {
    var t : number = _t * noiseSpeed;
    var factor1 : number = 1.0 - TimedNoise(_m, t) * noiseIntensity;
    var baseColor : CVec3 = new CVec3(
        TimedNoise(_m, t),
        TimedNoise(_m, t * 2.0),
        TimedNoise(_m, t * 3.0)
    );
    baseColor = CMath.V3MulFloat(baseColor, 0.1 * noiseIntensity);
    baseColor = CMath.V3AddV3(baseColor, CMath.V3MulFloat(_c.rgb, factor1));
    return new CVec4(baseColor, _c.w * factor1 + 0.1 * noiseIntensity);
}

function AddBorder(_m : CVec3, _c : CVec4) : CVec4 {
    var distToBorderVec : CVec2 = V2Abs(V2SubV2(V2Abs(_m.xy), new CVec2(5.0,5.0)));
    var distToBorder : number = min(distToBorderVec.x, distToBorderVec.y);
    var f : number = 1.0 - smoothstep(0.0, borderThickness, distToBorder);
    return V4AddV4(_c, V4MulFloat(new CVec4(f,f,f,1.0), borderIntensity));
}

function ps_main_distort() {
    var image_uv : CVec2 = GetDistortedUV(to_uv, distortDistance, time);
    out_color = Sam2DToColor(0.0, image_uv);
}

function ps_main_aberrate() {
    out_color = new CVec4(GetAberratedColor(0.0, to_uv, time, abrBaseStr, abrAddedStr), 1.0);
}

function ps_main_pixel() {
    out_color = Sam2DToColor(0.0, GetPixelatedUV(Sam2DSize(0.0), pixelSize, to_uv));
}

function ps_main_noise() {
    out_color = AddNoise(to_worldPos, Sam2DToColor(0.0, to_uv), time);
}

function ps_main_tvBorderLight() {
    out_color = AddBorder(to_worldPos, Sam2DToColor(0.0, to_uv));
}

function ps_main_scanLine() {
    out_color = AddScanLine(to_worldPos, Sam2DToColor(0.0, to_uv));
}

function GetFxaaColor(_uv : CVec4, _tex : number, _rcpFrame : CVec2) : CVec3 {
    var rgbNW : CVec3 = Sam2DToColor(_tex, new CVec2(_uv.z, _uv.w)).xyz;
    var rgbNE : CVec3 = Sam2DToColor(_tex, new CVec2(_uv.z + _rcpFrame.x, _uv.w)).xyz;
    var rgbSW : CVec3 = Sam2DToColor(_tex, new CVec2(_uv.z, _uv.w + _rcpFrame.y)).xyz;
    var rgbSE : CVec3 = Sam2DToColor(_tex, new CVec2(_uv.z + _rcpFrame.x, _uv.w + _rcpFrame.y)).xyz;
    var rgbM : CVec3 = Sam2DToColor(_tex, new CVec2(_uv.x, _uv.y)).xyz;

    var lumen : CVec3 = new CVec3(0.299, 0.587, 0.114);
    var lumeNW : number = V3Dot(rgbNW, lumen);
    var lumeNE : number = V3Dot(rgbNE, lumen);
    var lumeSW : number = V3Dot(rgbSW, lumen);
    var lumeSE : number = V3Dot(rgbSE, lumen);
    var lumeM : number = V3Dot(rgbM, lumen);

    var lumeMin : number = min(lumeM, min(min(lumeNW, lumeNE), min(lumeSW, lumeSE)));
    var lumeMax : number = max(lumeM, max(max(lumeNW, lumeNE), max(lumeSW, lumeSE)));

    var dir : CVec2 = new CVec2(0.0, 0.0);
    dir.x = -((lumeNW + lumeNE) - (lumeSW + lumeSE));
    dir.y = ((lumeNW + lumeSW) - (lumeNE + lumeSE));

    var dirReduce : number = max(
        (lumeNW + lumeNE + lumeSW + lumeSE) * (0.25 * reduce_mul),
        reduce_min
    );
    var rcpDirMin : number = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

    dir = V2MulV2(V2Min(new CVec2(span_max, span_max), V2Max(new CVec2(-span_max, -span_max), V2MulFloat(dir, rcpDirMin))), _rcpFrame);

    var rgbA : CVec3 = V3MulFloat(
        V3AddV3(
            Sam2DToColor(_tex, V2AddV2(new CVec2(_uv.x, _uv.y), V2MulFloat(dir, 1.0 / 3.0 - 0.5))).xyz, 
            Sam2DToColor(_tex, V2AddV2(new CVec2(_uv.x, _uv.y), V2MulFloat(dir, 2.0 / 3.0 - 0.5))).xyz
        ),
        0.5);
    
    var rgbB : CVec3 = V3MulV3(V3MulFloat(rgbA, 0.5), V3MulFloat(
        V3AddV3(
            Sam2DToColor(_tex, V2AddV2(new CVec2(_uv.x, _uv.y), V2MulFloat(dir, -0.5))).xyz, 
            Sam2DToColor(_tex, V2AddV2(new CVec2(_uv.x, _uv.y), V2MulFloat(dir, 0.5))).xyz
        ),
        0.25));

    var lumeB : number = V3Dot(rgbB, lumen);

    if((lumeB < lumeMin) || (lumeB > lumeMax))
        return rgbA;

    return rgbB;
}

function ps_main_fxaa() {
    var texSize : CVec2 = Sam2DSize(0.0);
    var rcpFrame : CVec2 = V2DivV2(new CVec2(1.0,1.0), texSize);

    var uv : CVec4 = new CVec4(to_uv, V2SubV2(to_uv, V2MulFloat(rcpFrame, (0.5 + subpix_shift))));
    out_color.rgb = GetFxaaColor(uv, 0.0, rcpFrame);
    out_color.w = 1.0;
}

function ps_main_gamma() {
    var L_cor : CVec4 = Sam2DToColor(0.0, to_uv);
    //밝기 적용
    L_cor.rgb = V3MulFloat(L_cor.rgb, brightness);
    //컬러 코렉션
    L_cor.rgb = V3PowV3(L_cor.rgb, colorCorrection);
    //톤 매핑
    var Mapped_cor : CVec3 = V3DivV3(L_cor.rgb, V3AddV3(L_cor.rgb, new CVec3(1.0,1.0,1.0)));
    L_cor.rgb = V3Mix(L_cor.rgb, Mapped_cor, toneMappingFactor);
    L_cor.rgb = V3SubV3(new CVec3(1.0,1.0,1.0), V3Exp(V3MulFloat(L_cor.rgb, -1.0 * exposure)));
    //콘트라스트 조절
    L_cor.rgb = V3AddV3(V3MulFloat(V3SubV3(L_cor.rgb, new CVec3(0.5,0.5,0.5)), contrast), new CVec3(0.5,0.5,0.5));
    //감마 적용
    out_color.rgb = V3Pow(L_cor.rgb, 1.0 / gamma);
    out_color.a = L_cor.a;
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
    var texSize : CVec2 = Sam2DSize(0.0);  // 현재 텍스처 크기
    var x : number = 1.0 / texSize.x;      // 실제 픽셀 크기
    var y : number = 1.0 / texSize.y;      // 실제 픽셀 크기

    var a : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x - 2.0 * x, to_uv.y + 2.0 * y)).rgb;
    var b : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x          , to_uv.y + 2.0 * y)).rgb;
    var c : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x + 2.0 * x, to_uv.y + 2.0 * y)).rgb;

    var d : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x - 2.0 * x, to_uv.y)).rgb;
    var e : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x          , to_uv.y)).rgb;
    var f : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x + 2.0 * x, to_uv.y)).rgb;

    var g : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x - 2.0 * x, to_uv.y - 2.0 * y)).rgb;
    var h : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x          , to_uv.y - 2.0 * y)).rgb;
    var i : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x + 2.0 * x, to_uv.y - 2.0 * y)).rgb;

    var j : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x - x, to_uv.y + y)).rgb;
    var k : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x + x, to_uv.y + y)).rgb;
    var l : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x - x, to_uv.y - y)).rgb;
    var m : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x + x, to_uv.y - y)).rgb;

    if(mipLevel < 0.5) {
        var group0 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(a, b), V3AddV3(d,e)), 0.125/4.0);
        var group1 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(b, c), V3AddV3(e,f)), 0.125/4.0);
        var group2 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(d, e), V3AddV3(g,h)), 0.125/4.0);
        var group3 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(e, f), V3AddV3(h,i)), 0.125/4.0);
        var group4 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(j, k), V3AddV3(l,m)), 0.5/4.0);
        group0 = V3MulFloat(group0, KarisAverage(group0));
        group1 = V3MulFloat(group1, KarisAverage(group1));
        group2 = V3MulFloat(group2, KarisAverage(group2));
        group3 = V3MulFloat(group3, KarisAverage(group3));
        group4 = V3MulFloat(group4, KarisAverage(group4));
        out_color.rgb = V3AddV3(V3AddV3(V3AddV3(group0, group1),V3AddV3(group2,group3)),group4);
    }
    else {
        out_color.rgb = V3MulFloat(e,0.125);
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(a,c), V3AddV3(g,i)),0.03125));
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(b,d), V3AddV3(f,h)),0.0625));
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(j,k), V3AddV3(l,m)),0.125));
    }
    out_color.rgb = V3Max(out_color.rgb, new CVec3(0.0001, 0.0001, 0.0001));
    out_color.rgb = PreFilter(out_color.rgb);
    //out_color.rgb=new CVec3(1.0,1.0,1.0);
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
    // var x : number = 0.004 / aspect;
    // var y : number = 0.004;

    var texSize : CVec2 = Sam2DSize(0.0);  // 현재 텍스처 크기
    var x : number = 1.0 / texSize.x;      // 실제 픽셀 크기
    var y : number = 1.0 / texSize.y;      // 실제 픽셀 크기

    var a : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x - x, to_uv.y + y)).rgb;
    var b : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x    , to_uv.y + y)).rgb;
    var c : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x + x, to_uv.y + y)).rgb;

    var d : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x - x, to_uv.y)).rgb;
    var e : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x    , to_uv.y)).rgb;
    var f : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x + x, to_uv.y)).rgb;

    var g : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x - x, to_uv.y - y)).rgb;
    var h : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x    , to_uv.y - y)).rgb;
    var i : CVec3 = Sam2D0ToColor(new CVec2(to_uv.x + x, to_uv.y - y)).rgb;

    out_color.rgb = V3MulFloat(e, 0.25);
    out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(b,d), V3AddV3(f,h)), 0.125));
    out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(a,c), V3AddV3(g,i)), 0.0625));
    //out_color.rgb = V3MulFloat(out_color.rgb, blendFactor);
    out_color.w = blendFactor;
}
