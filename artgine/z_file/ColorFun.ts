import { NoiseGet, NoiseValue3, SampleNoise, SampleNoiseVec2 } from "./Noise";
import { SDF } from "./SDF";
import { 
    abs, clamp, max, min, mod, pow, sign, sin, smoothstep,
    CMat, CVec2, CVec3, CVec4, Sam2DSize, Sam2DToColor, SaturateV4, 
    V2Abs, V2AddV2, V2DivV2, V2Floor, V2MulFloat, V2MulV2, V2SubV2, 
    V3AddV3, V3Clamp, V3Dot, V3Floor, V3Max, V3Min, V3Mod, V3MulFloat, V3MulV3, V3Step, V3SubV3, 
    V4Abs, V4AddV4, V4Dot, V4Floor, V4Max, V4Mod, V4MulFloat, V4MulV4, V4Pow, V4Step, V4SubV4,
    step,
    V3Abs,
    V3Fract,
    V4Mix,
    V3Mix,
    SaturateV3,
    floor,
    screenPos,
    V4DivV4,
    int,
    FloatToInt,
    Null,
    Sam2DToV4,
    Sam2DV4,
    mix,
    sqrt,
    V2Dot,
    V2Mod,
    V4MulMatCoordi,
    V3Nor,
    V3Cross,
    cos,
    InverseMat3,
    Sam2DArrV4,
    Sam2DArrToV4,
    fract
} from "./Shader";

export function GetTexCodiedUV(_uv : CVec2, _texCodi : CVec4) : CVec2 {
    var result : CVec2 = new CVec2(0.0,0.0);

    result.x = _uv.x*_texCodi.x+_texCodi.z;
    result.y = _uv.y*_texCodi.y+_texCodi.w;

    // 음수인지에 대한 if문 제거하고 abs로 대체(똑같은 역할 함)
    // if(result.x<0.0) 
    // 	result.x=result.x*-1.0;
    // if(result.y<0.0) 
    // 	result.y=result.y*-1.0;
    return V2Abs(result);
}
// 코딩된(to_uv.xy) 좌표를 원본 uv(0..1)로 복원
export function GetTexDecodedUV(_coded: CVec2, _texCodi: CVec4): CVec2 {
    // texCodi 해석: (sx, sy, ox, oy)
    var sx :number= (_texCodi.x == 0.0) ? 1.0 : _texCodi.x;
    var sy :number= (_texCodi.y == 0.0) ? 1.0 : _texCodi.y;

    // GetTexCodiedUV에서 음수면 부호를 뒤집는(abs 유사) 보정이 있어 정보가 애매해질 수 있음.
    // 일반적으로 coded는 양수일 테니 그대로 사용, 혹시 음수면 대칭 복원 시도.
    var cx :number= abs(_coded.x); // if (cx < 0.0) cx = -cx;
    var cy :number= abs(_coded.y); // if (cy < 0.0) cy = -cy;

    // 오프셋 제거 후 스케일 역변환
    var u :number= (cx - _texCodi.z) / sx;
    var v :number= (cy - _texCodi.w) / sy;

    // 필요 시 범위 정리
    // u = clamp(u, 0.0, 1.0);
    // v = clamp(v, 0.0, 1.0);

    return new CVec2(u, v);
}

// Pack / Unpack
export function PackGrayToRG(_v : number): CVec2 {
    if(_v <= 0.0) return new CVec2(0.0, 0.0);
    if(_v >= 1.0) return new CVec2(1.0, 1.0);
    var rf : number; var gf : number;
    rf = _v * 256.0; gf = fract(rf);
    return new CVec2(floor(rf) / 255.0, gf);
}
export function PackGrayToRGB(_v : number): CVec3 {
    if(_v <= 0.0) return new CVec3(0.0, 0.0, 0.0);
    if(_v >= 1.0) return new CVec3(1.0, 1.0, 1.0);
    var rf : number; var gf : number; var bf : number;
    gf = _v * 256.0 * 256.0; bf = fract(gf);
    rf = floor(gf) / 256.0; gf = fract(rf);
    return new CVec3(floor(rf) / 255.0, gf * 256.0 / 255.0, bf);
}
export function PackGrayToRGBA(_v : number): CVec4 {
    if(_v <= 0.0) return new CVec4(0.0, 0.0, 0.0, 0.0);
    if(_v >= 1.0) return new CVec4(1.0, 1.0, 1.0, 1.0);
    var rf : number; var gf : number; var bf : number; var af : number;
    bf = _v * 256.0 * 256.0 * 256.0; af = fract(bf);
    gf = floor(bf) / 256.0; bf = fract(gf);
    rf = floor(gf) / 256.0; gf = fract(rf);
    return new CVec4(floor(rf) / 255.0, gf * 256.0 / 255.0, bf * 256.0 / 255.0, af);
}
export function UnpackRGToGray(_v: CVec2): number {
    return _v.x * 255.0 / 256.0 + _v.y * 1.0 / 256.0;
}
export function UnpackRGBToGray(_v: CVec3): number {
    return _v.x * 255.0 / 256.0 + _v.y * 255.0 / (256.0 * 256.0) + _v.z * 1.0 / (256.0 * 256.0);
}
export function UnpackRGBAToGray(_v: CVec4): number {
    return _v.x * 255.0 / 256.0 + _v.y * 255.0 / (256.0 * 256.0) + _v.z * 255.0 / (256.0 * 256.0 * 256.0) + _v.w * 1.0 / (256.0 * 256.0 * 256.0);
}

// hsv <-> rgb
// GPU 고려가 안되어있어 수정
export function HSVToRGB(_vec3 : CVec3) : CVec3 {
    var K : CVec4 = new CVec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    var p : CVec3 = V3Abs(
        V3SubV3(
            V3MulFloat(V3Fract(V3AddV3(new CVec3(_vec3.x, _vec3.x, _vec3.x), K.xyz)), 6.0), 
            new CVec3(K.w,K.w,K.w)
        )
    );
    return V3MulFloat(
        V3Mix(
            new CVec3(K.x,K.x,K.x), 
            V3Clamp(V3SubV3(p, new CVec3(K.x,K.x,K.x)), 0.0, 1.0), 
            _vec3.y
        ), 
        _vec3.z
    );
}
export function RGBToHSV(_vec3 : CVec3) : CVec3 {
    var K : CVec4 = new CVec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    var p : CVec4 = V4Mix(
        new CVec4(new CVec2(_vec3.z, _vec3.y), new CVec2(K.w, K.z)), 
        new CVec4(new CVec2(_vec3.y, _vec3.z), new CVec2(K.x, K.y)),
        step(_vec3.z, _vec3.y)
    );
    var q : CVec4 = V4Mix(
        new CVec4(new CVec3(p.x, p.y, p.w), _vec3.x),
        new CVec4(_vec3.x, new CVec3(p.y, p.z, p.x)),
        step(p.x, _vec3.x)
    );
    var d : number = q.x - min(q.w, q.y);
    var e : number = 1.0e-10;
    return new CVec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}


// hsl <-> rgb
export function HSLToRGB(_vec3 : CVec3) : CVec3
{
    var RGB : CVec3 = SaturateV3(new CVec3(
       abs(_vec3.x * 6.0 - 3.0) - 1.0,
       2.0 - abs(_vec3.x * 6.0 - 2.0),
       2.0 - abs(_vec3.x * 6.0 - 4.0) 
    ));
    var C : number = (1.0 - abs(2.0 * _vec3.z - 1.0)) * _vec3.y;
    return V3MulFloat(V3SubV3(RGB, new CVec3(0.5,0.5,0.5)), C * _vec3.z);
}
export function RGBToHSL(_vec3 : CVec3) : CVec3
{
    var P : CVec4 = (_vec3.y < _vec3.z) ? new CVec4(new CVec2(_vec3.z,_vec3.y),-1.0,2.0/3.0) : new CVec4(new CVec2(_vec3.y,_vec3.z),0.0,-1.0/3.0);
    var Q : CVec4 = (_vec3.x < P.x) ? new CVec4(new CVec3(P.x,P.y,P.w),_vec3.x) : new CVec4(_vec3.x,new CVec3(P.y,P.z,P.x));
    var C : number = Q.x-min(Q.w,Q.y);
    var H : number = abs((Q.w-Q.y) / (6.0*C+1e-10)+Q.z);
    var L : number = Q.x - C * 0.5;
    var S : number = C / (1.0 - abs(L * 2.0 - 1.0) + 1e-10);
    return new CVec3(H, S, L);
}

export function ColorModalFun(_rgb : CVec3, _colorModel : CVec4) : CVec3 {
    var rgb : CVec3;
    if(_colorModel.a < SDF.eColorModel.RGBAdd + 0.5)
        rgb = V3AddV3(_rgb, _colorModel.rgb);
    else if(_colorModel.a < SDF.eColorModel.RGBMul + 0.5)
        rgb = V3MulV3(_rgb, _colorModel.rgb);
    else if(_colorModel.a < SDF.eColorModel.HSVBaseHSPercent + 0.5)
    {
        var hsv : CVec3=RGBToHSV(_rgb);
        hsv.y=_colorModel.y;
        hsv.x=_colorModel.x;

        rgb =HSVToRGB(hsv);
        rgb.x = _rgb.x*(1.0-_colorModel.z)+ rgb.x*_colorModel.z;
        rgb.y = _rgb.y*(1.0-_colorModel.z)+ rgb.y*_colorModel.z;
        rgb.z = _rgb.z*(1.0-_colorModel.z)+ rgb.z*_colorModel.z;
    }
    else if(_colorModel.a < SDF.eColorModel.HSV + 0.5)
        rgb = HSVToRGB(_colorModel.rgb);    
    else if(_colorModel.a < SDF.eColorModel.HSL + 0.5)
        rgb = HSLToRGB(_colorModel.rgb);
    else if(_colorModel.a < SDF.eColorModel.None + 0.5)
        rgb = _rgb;
    else if(_colorModel.a < SDF.eColorModel.Unpack + 0.5)
    {
        var stop0 : CVec3 = new CVec3(0.0, 0.0, 0.5);
        var stop1 : CVec3 = new CVec3(0.0, 0.5, 1.0);
        var stop2 : CVec3 = new CVec3(0.94, 0.94, 0.25);
        var stop3 : CVec3 = new CVec3(0.13, 0.55, 0.13);
        var stop4 : CVec3 = new CVec3(0.55, 0.27, 0.07);
        var stop5 : CVec3 = new CVec3(1.0, 1.0, 1.0);

        var stopT0 : number = 0.0;
        var stopT1 : number = 0.2;
        var stopT2 : number = 0.25;
        var stopT3 : number = 0.5;
        var stopT4 : number = 0.8;
        var stopT5 : number = 1.0;
        
        var gray : number = _rgb.x;//UnpackRGToGray(_rgb.xy);
        var col0 : CVec3;
        var col1 : CVec3;
        var range : number;
        if(gray < stopT1) {
            col0 = stop0;
            col1 = stop1;
            range = (gray - stopT0) / (stopT1 - stopT0);
        }
        else if(gray < stopT2) {
            col0 = stop1;
            col1 = stop2;
            range = (gray - stopT1) / (stopT2 - stopT1);
        }
        else if(gray < stopT3) {
            col0 = stop2;
            col1 = stop3;
            range = (gray - stopT2) / (stopT3 - stopT2);
        }
        else if(gray < stopT4) {
            col0 = stop3;
            col1 = stop4;
            range = (gray - stopT3) / (stopT4 - stopT3);
        }
        else {
            col0 = stop4;
            col1 = stop5;
            range = (gray - stopT4) / (stopT5 - stopT4);
        }
        rgb = V3Mix(col0, col1, range);
    }
    else
        rgb = _rgb;
    rgb = V3Clamp(rgb, 0.0, 1.0);

    
    
    return rgb;
}
export function AlphaModalFun(_a : number,_alphaModel : CVec2) : number
{
    var a : number = _a * _alphaModel.x;
    a = clamp(a, 0.0, 1.0);
    if ( a <= _alphaModel.y ) a=0.0;
    
    return a;
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



function GetPixelatedUV(_texSize : CVec2, _pixelSize : CVec2, _uv : CVec2) : CVec2 {
    var d : CVec2 = V2DivV2(_pixelSize, _texSize);
    return V2MulV2(d, V2AddV2(V2Floor(V2DivV2(_uv, d)), new CVec2(0.5,0.5)));
}

function UV_Curve(_uv : CVec2) : CVec2
{
    _uv = V2MulFloat(V2SubV2(_uv, new CVec2(0.5,0.5)), 2.0);

    _uv.x *= 1.0 + pow(abs(_uv.x) / 3.0, 2.0);
    _uv.y *= 1.0 + pow(abs(_uv.y) / 3.0, 2.0);

    _uv.x /= 1.2;
    _uv.y /= 1.2;

    _uv = V2AddV2(V2MulFloat(_uv, 0.5), new CVec2(0.5,0.5));
    return _uv;
}

function AddScanLine(_c : CVec4, _uv : CVec2, _time : number, _count : number, _lineSpeed : number) : CVec4 {
    var scanline : number = sin(UV_Curve(_uv).y * _count * 3.14 * 2.0 + _time * _lineSpeed);
    scanline = (scanline * 0.5 + 0.5) * 0.9 + 0.1;
    scanline = pow(scanline, 0.25);
    var sLine : CVec4 = new CVec4(new CVec3(scanline, scanline, scanline), 1.0);
    _c = V4MulV4(_c, sLine);
    return _c;
}

function MapToPaletteIndex(_color : CVec3, _cellSize : number,_palSize : CVec2) : number
{
    _color = V3Clamp(_color, 0.0, 0.9999);
    var mappedColor : CVec3 = V3Floor(V3MulFloat(_color, _cellSize));

    var mappedIndex : number = mappedColor.x + mappedColor.y * _cellSize + mappedColor.z * _cellSize * _cellSize;
    return floor(mappedIndex / _palSize.x) + mod(mappedIndex, _palSize.y) * _palSize.x;
}

export var VFX : CMat=Null();
export var LUT0: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4LookUpTable0);
export var LUT1: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4LookUpTable1);
export var LUT2: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4LookUpTable2);
export var LUT3: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4LookUpTable3);
export var LUT4: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4LookUpTable4);
export var LUT5: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4LookUpTable5);

export var vfxMat0: CMat=Null();
export var vfxMat1: CMat=Null();

//offset 키워드가 있으면 int로
function VFXDown0(_uv : CVec2, _value : CMat,_time : number, _worldPos : CVec4) : CVec4
{
    var para : CVec4 = new CVec4(_value[0].y, _value[0].z, _value[0].w, _value[1].x);
    var type : number = _value[0].x;

    var outColor : CVec4=Sam2DToColor(0.0, _uv);
    if(type<SDF.eVFX.Distort+0.5)
    {
        var distortedUV : CVec2 = GetDistortedUV(_uv, new CVec2(para.x, para.y), _time);
               
        outColor = Sam2DToColor(0.0, distortedUV);
    }
    else if(type<SDF.eVFX.Aberrate+0.5)
    {
        var line : number = max(0.0, sin(_uv.y * 3.8 + _time * 1.4) * sin(_uv.y * 0.6 + _time * 2.3));
        var aberration_strength : number = (0.1 + line) * para.y + para.x;
        var r : CVec4 = Sam2DToColor(0.0, new CVec2(_uv.x - aberration_strength, _uv.y));
        var g : CVec4 = Sam2DToColor(0.0, _uv);
        var b : CVec4 = Sam2DToColor(0.0, new CVec2(_uv.x + aberration_strength, _uv.y));
        outColor= SaturateV4(new CVec4(r.r,g.g,b.b,max(r.a, max(g.a, b.a))));
    }
     //아웃라인xyz : rgb
    else if(type<SDF.eVFX.Outline+0.5)
    {
        
        var org:CVec4=Sam2DToColor(0.0,_uv);

        if(org.a<=0.99)
        {
            var size:CVec2=Sam2DSize(0.0);
            size.x=1.0/size.x;
            size.y=1.0/size.y;

            var lc:CVec4=Sam2DToColor(0.0,new CVec2(_uv.x-size.x,_uv.y));
            var rc:CVec4=Sam2DToColor(0.0,new CVec2(_uv.x+size.x,_uv.y));
            var tc:CVec4=Sam2DToColor(0.0,new CVec2(_uv.x,_uv.y-size.y));
            var bc:CVec4=Sam2DToColor(0.0,new CVec2(_uv.x,_uv.y+size.y));
            if(lc.a>0.0 || rc.a>0.0 || tc.a>0.0 || bc.a>0.0)
            {
                outColor=new CVec4(para.xyz,1.0);
            }
            else
                outColor = org;
        }
        else 
            outColor = org;
    
        
    }
    else if(type<SDF.eVFX.Pixel+0.5)
    {
        var pixelatedUV : CVec2 = GetPixelatedUV(Sam2DSize(0.0), new CVec2(para.x, para.y), _uv);
        outColor = Sam2DToColor(0.0, pixelatedUV);
    }
    else if(type<SDF.eVFX.Noise+0.5)
    {
        var noiseColor : CVec3 = new CVec3(0.0, 0.0, 0.0);
        var frame : number = _time * para.y / 60.0;

        // 가우시안 (20)
        if(para.x > SDF.eNoise.Gaussian - 0.5)
        {
            var xi : number = _uv.x * para.w * 128.0;
            var yi : number = _uv.y * para.w * 128.0;
            var zi : number = frame * 128.0;
            noiseColor.x = NoiseValue3(new CVec3(xi, yi, zi));
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        // 블루 노이즈 (4)
        else if(para.x > SDF.eNoise.Blue - 0.5)
        {
            var coord : CVec2 = V2Floor(V2Mod(V2MulFloat(V2AddV2(_uv, new CVec2(frame, frame)), para.w * 64.0), 64.0));
            var index : number = coord.y * 64.0 + coord.x;
            var modIndex : number = mod(index, 2048.0);
            var v4 : CVec4 = Sam2DToV4(new CVec2(11, SDF.eNoise.Blue), modIndex);
            noiseColor.x = index < 2048.0 ? v4.x : v4.y;
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        // grayscale 클라우드 (3)
        else if(para.x > SDF.eNoise.PerlinFBM3 - 0.5)
        {
            noiseColor.x = SampleNoise(new CVec3(V2MulFloat(_uv, para.w), frame), SDF.eNoise.PerlinFBM3);
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        // RGB 펄린 노말 (2)
        else if(para.x > SDF.eNoise.PerlinNormal - 0.5)
        {
            var noise : CVec2 = SampleNoiseVec2(new CVec3(V2MulFloat(_uv, para.w), frame), SDF.eNoise.PerlinNormal);
            noiseColor.xyz = new CVec3(noise.x, sqrt(1.0 - V2Dot(noise, noise)), noise.y);
        }
        // grayscale 펄린 (1)
        else
        {
            noiseColor.x = SampleNoise(new CVec3(V2MulFloat(_uv, para.w), frame), SDF.eNoise.Perlin);
            noiseColor.y = noiseColor.x;
            noiseColor.z = noiseColor.x;
        }
        outColor.rgb = V3MulV3(outColor.rgb, V3Mix(noiseColor, new CVec3(1,1,1), 1.0 - para.z));
    }
    else if(type<SDF.eVFX.Scanline+0.5)
    {
        outColor = AddScanLine(outColor, _uv, _time, para.x, para.y);
    }
    else if(type<SDF.eVFX.LookUpTable+0.5)
    {
        var palSize : CVec2 = new CVec2(32.0,32.0);
        var cellSize : number = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
        
        var ditherStrength : number = (NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Blue) - 0.5) / (cellSize - 1.0) * para.y;
        outColor.rgb = V3AddV3(outColor.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
        var palIndex : number = MapToPaletteIndex(outColor.rgb, cellSize,palSize);
        

        outColor=Sam2DArrToV4(new CVec3(1.0,para.x,0.0),palIndex);
    }
    else if(type<SDF.eVFX.Blur+0.5)
    {
        outColor=new CVec4(0.0,0.0,0.0,0.0);
        var fx : number = max(-para.x*0.5, -2.0);    
        var fy : number = max(-para.y*0.5, -2.0);

        var count : number = 0.0;
        var loopX : int;
        var loopY : int;
        loopX.dummy=FloatToInt(para.x);
        loopY.dummy=FloatToInt(para.y);
        var texScale : CVec2 = V2DivV2(new CVec2(1.0, 1.0), Sam2DSize(0.0));

        for(var y = 0; y < 4; y++) 
        {
            if(y<loopY.dummy)
            {
                for(var x = 0; x < 4; x++) 
                {
                    if(x<loopX.dummy)
                    {
                        
                        var uv : CVec2 = V2AddV2(_uv, V2MulV2(new CVec2(fx, fy), texScale));
                        var bout : CVec4 = Sam2DToColor(0.0,uv);

                        outColor = V4AddV4(outColor, bout);
                        count += 1.0;
                    } 
                    else   break;
                    
                    fx += 1.0;
                }
                fx = -_value[2].x*0.5;
                fy += 1.0;
            }
            else    break;
        }
        if(count > 0.01) {
            outColor = V4DivV4(outColor, new CVec4(count,count,count,count));
            outColor = SaturateV4(outColor);
        }

    }
    else if(type<SDF.eVFX.Decal+0.5 || type<SDF.eVFX.DecalTexture+0.5)
    {
        var decalDir : CVec3 = new CVec3(vfxMat0[0][0], vfxMat0[0][1], vfxMat0[0][2]);
        var decalRot : number = vfxMat0[0][3];
        var decalSca : CVec3 = new CVec3(vfxMat0[1][0], vfxMat0[1][1], vfxMat0[1][2]);
        var decalPos : CVec3 = new CVec3(vfxMat0[1][3], vfxMat0[2][0], vfxMat0[2][1]);

        var zAxis : CVec3 = V3Nor(decalDir);
        var up : CVec3 = abs(zAxis.y) > 1.0-1e-8 ? new CVec3(0.0, 0.0, -1.0) : new CVec3(0.0, 1.0, 0.0);
        var xAxis : CVec3 = V3Cross(up, zAxis);
        var yAxis : CVec3 = V3Cross(zAxis, xAxis);

        var rx : CVec3 = xAxis;
        var ry : CVec3 = yAxis;
        if(abs(decalRot) > 1e-8) {
            var cosT : number = cos(decalRot);
            var sinT : number = sin(decalRot);
            rx = V3Nor(V3AddV3(V3MulFloat(xAxis, cosT), V3MulFloat(yAxis, sinT)));
            ry = V3Nor(V3SubV3(V3MulFloat(yAxis, cosT), V3MulFloat(xAxis, sinT)));
        }

        var decalMat : CMat = new CMat(
            rx.x / decalSca.x, rx.y / decalSca.x, rx.z / decalSca.x, 0.0,
            ry.x / decalSca.y, ry.y / decalSca.y, ry.z / decalSca.y, 0.0,
            zAxis.x / decalSca.z, zAxis.y / decalSca.z, zAxis.z / decalSca.z, 0.0,
            0.0, 0.0, 0.0, 1.0
        );
        decalMat[3][0] = -(decalPos.x * decalMat[0][0] + decalPos.y * decalMat[0][1] + decalPos.z * decalMat[0][2]);
        decalMat[3][1] = -(decalPos.x * decalMat[1][0] + decalPos.y * decalMat[1][1] + decalPos.z * decalMat[1][2]);
        decalMat[3][2] = -(decalPos.x * decalMat[2][0] + decalPos.y * decalMat[2][1] + decalPos.z * decalMat[2][2]);

        var decalUV : CVec4 = V4MulMatCoordi(_worldPos, decalMat);
        decalUV = V4MulFloat(decalUV, 1.0 / decalUV.w);

        // 데칼 범위 내에 있음
        if(decalUV.x >= -0.5 && decalUV.x <= 0.5 && decalUV.y >= -0.5 && decalUV.y <= 0.5 && decalUV.z >= -0.5 && decalUV.z <= 0.5)
        {
            if(type<SDF.eVFX.Decal+0.5) {
                var decalColor : CVec4 = para;
                outColor = new CVec4(
                    V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a),
                    outColor.a
                );
            }
            else if(type<SDF.eVFX.DecalTexture+0.5) {
                var decalColor : CVec4 = Sam2DToColor(para.x, new CVec2(decalUV.x * -1.0 + 0.5, decalUV.y * 1.0 + 0.5));
                decalColor.a *= para.y;
                outColor = new CVec4(
                    V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a),
                    outColor.a
                );
                if(para.z > 0.5 && decalColor.a > 0.001) {
                    outColor.r = 1.0 - outColor.r;
                    outColor.g = 1.0 - outColor.g;
                    outColor.b = 1.0 - outColor.b;
                }
            }
            
        }
    }
    
    return outColor;
}
export function VFXDown1(_uv : CVec2, _value : CMat,_time : number, _worldPos : CVec4) : CVec4
{
    var para : CVec4 = new CVec4(_value[1].z, _value[1].w, _value[2].x, _value[2].y);
    var type : number = _value[1].y;

    var outColor : CVec4=VFXDown0(_uv,_value,_time,_worldPos);
    if(type<SDF.eVFX.Distort+0.5)
    {
        var distortedUV : CVec2 = GetDistortedUV(_uv, new CVec2(para.x, para.y), _time);
        
        outColor=VFXDown0(distortedUV,_value,_time,_worldPos);
        
    }
    // else if(type<SDF.eVFX.Aberrate+0.5)
    // {
    //     var line : number = max(0.0, sin(_uv.y * 3.8 + _time * 1.4) * sin(_uv.y * 0.6 + _time * 2.3));
    //     var aberration_strength : number = (0.1 + line) * para.y + para.x;
    //     var r : CVec4 = VFXDown0(new CVec2(_uv.x - aberration_strength, _uv.y),_value,_time);
    //     var g : CVec4 = VFXDown0(_uv,_value,_time);
    //     var b : CVec4 = VFXDown0(new CVec2(_uv.x + aberration_strength, _uv.y),_value,_time);
    //     outColor= SaturateV4(new CVec4(r.r,g.g,b.b,max(r.a, max(g.a, b.a))));
    // }
    //  //아웃라인xyz : rgb
    // else if(type<SDF.eVFX.Outline+0.5)
    // {
       
    //     var org:CVec4=VFXDown0(new CVec2(_uv.x,_uv.y),_value,_time);

    //     if(org.a<=0.99)
    //     {
    //         var size:CVec2=Sam2DSize(0.0);
    //         size.x=1.0/size.x;
    //         size.y=1.0/size.y;

    //         var lc:CVec4=VFXDown0(new CVec2(_uv.x-size.x,_uv.y),_value,_time);
    //         var rc:CVec4=VFXDown0(new CVec2(_uv.x+size.x,_uv.y),_value,_time);
    //         var tc:CVec4=VFXDown0(new CVec2(_uv.x,_uv.y-size.y),_value,_time);
    //         var bc:CVec4=VFXDown0(new CVec2(_uv.x,_uv.y+size.y),_value,_time);
    //         if(lc.a>0.0 || rc.a>0.0 || tc.a>0.0 || bc.a>0.0)
    //         {
    //             outColor=new CVec4(para.xyz,1.0);
    //         }
    //     }
    //      else 
    //         outColor = org;
    // }
    else if(type<SDF.eVFX.Pixel+0.5)
    {
        var pixelatedUV : CVec2 = GetPixelatedUV(Sam2DSize(0.0), new CVec2(para.x, para.y), _uv);
        outColor=VFXDown0(pixelatedUV,_value,_time,_worldPos);
    }
    else if(type<SDF.eVFX.Scanline+0.5)
    {
        
        outColor = AddScanLine(outColor, _uv, _time, para.x, para.y);
    }
    else if(type<SDF.eVFX.LookUpTable+0.5)
    {
        
        var palSize : CVec2 = new CVec2(32.0,32.0);
        var cellSize : number = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
        
        var ditherStrength : number = (NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Blue) - 0.5) / (cellSize - 1.0) * para.y;
        outColor.rgb = V3AddV3(outColor.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
        var palIndex : number = MapToPaletteIndex(outColor.rgb, cellSize,palSize);
        

        outColor=Sam2DToV4(new CVec2(11,para.x),palIndex);
        
    }
    else if(type<SDF.eVFX.Decal+0.5 || type<SDF.eVFX.DecalTexture+0.5)
    {
        var decalDir : CVec3 = new CVec3(vfxMat0[2][2], vfxMat0[2][3], vfxMat0[3][0]);
        var decalRot : number = vfxMat0[3][1];
        var decalSca : CVec3 = new CVec3(vfxMat0[3][2], vfxMat0[3][3], vfxMat1[0][0]);
        var decalPos : CVec3 = new CVec3(vfxMat1[0][1], vfxMat1[0][2], vfxMat1[0][3]);

        var zAxis : CVec3 = V3Nor(decalDir);
        var up : CVec3 = abs(zAxis.y) > 1.0-1e-8 ? new CVec3(0.0, 0.0, -1.0) : new CVec3(0.0, 1.0, 0.0);
        var xAxis : CVec3 = V3Cross(up, zAxis);
        var yAxis : CVec3 = V3Cross(zAxis, xAxis);

        var rx : CVec3 = xAxis;
        var ry : CVec3 = yAxis;
        if(decalRot > 1e-8) {
            var cosT : number = cos(decalRot);
            var sinT : number = sin(decalRot);
            rx = V3Nor(V3AddV3(V3MulFloat(xAxis, cosT), V3MulFloat(yAxis, sinT)));
            ry = V3Nor(V3SubV3(V3MulFloat(yAxis, cosT), V3MulFloat(xAxis, sinT)));
        }

        var decalMat : CMat = new CMat(
            rx.x / decalSca.x, rx.y / decalSca.x, rx.z / decalSca.x, 0.0,
            ry.x / decalSca.y, ry.y / decalSca.y, ry.z / decalSca.y, 0.0,
            zAxis.x / decalSca.z, zAxis.y / decalSca.z, zAxis.z / decalSca.z, 0.0,
            0.0, 0.0, 0.0, 1.0
        );
        decalMat[3][0] = -(decalPos.x * decalMat[0][0] + decalPos.y * decalMat[0][1] + decalPos.z * decalMat[0][2]);
        decalMat[3][1] = -(decalPos.x * decalMat[1][0] + decalPos.y * decalMat[1][1] + decalPos.z * decalMat[1][2]);
        decalMat[3][2] = -(decalPos.x * decalMat[2][0] + decalPos.y * decalMat[2][1] + decalPos.z * decalMat[2][2]);

        var decalUV : CVec4 = V4MulMatCoordi(_worldPos, decalMat);
        decalUV = V4MulFloat(decalUV, 1.0 / decalUV.w);

        // 데칼 범위 내에 있음
        if(decalUV.x >= -0.5 && decalUV.x <= 0.5 && decalUV.y >= -0.5 && decalUV.y <= 0.5 && decalUV.z >= -0.5 && decalUV.z <= 0.5)
        {
            if(type<SDF.eVFX.Decal+0.5) {
                var decalColor : CVec4 = para;
                outColor = new CVec4(
                    V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a),
                    outColor.a
                );
            }
            else if(type<SDF.eVFX.DecalTexture+0.5) {
                var decalColor : CVec4 = Sam2DToColor(para.x, new CVec2(decalUV.x * -1.0 + 0.5, decalUV.y * 1.0 + 0.5));
                decalColor.a *= para.y;
                outColor = new CVec4(
                    V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a),
                    outColor.a
                );
                if(para.z > 0.5 && decalColor.a > 0.001) {
                    outColor.r = 1.0 - outColor.r;
                    outColor.g = 1.0 - outColor.g;
                    outColor.b = 1.0 - outColor.b;
                }
            }
        }
    }
   
    return outColor;
}

export function VFXDown2(_uv : CVec2, _value : CMat,_time : number, _worldPos : CVec4) : CVec4
{
    var para : CVec4 = new CVec4(_value[2].w, _value[3].x, _value[3].y, _value[3].z);
    var type : number = _value[2].z;

    var outColor : CVec4=VFXDown1(_uv,_value,_time,_worldPos);
    if(type<SDF.eVFX.Distort+0.5)
    {
        var distortedUV : CVec2 = GetDistortedUV(_uv, new CVec2(para.x, para.y), _time);
        
        outColor=VFXDown1(distortedUV,_value,_time,_worldPos);
        
    }
    // else if(type<SDF.eVFX.Aberrate+0.5)
    // {
    //     var line : number = max(0.0, sin(_uv.y * 3.8 + _time * 1.4) * sin(_uv.y * 0.6 + _time * 2.3));
    //     var aberration_strength : number = (0.1 + line) * para.y + para.x;
    //     var r : CVec4 = VFXDown1(new CVec2(_uv.x - aberration_strength, _uv.y),_value,_time);
    //     var g : CVec4 = VFXDown1(_uv,_value,_time);
    //     var b : CVec4 = VFXDown1(new CVec2(_uv.x + aberration_strength, _uv.y),_value,_time);
    //     outColor= SaturateV4(new CVec4(r.r,g.g,b.b,max(r.a, max(g.a, b.a))));
    // }
    //  //아웃라인xyz : rgb
    // else if(type<SDF.eVFX.Outline+0.5)
    // {
       
    //     var org:CVec4=VFXDown1(new CVec2(_uv.x,_uv.y),_value,_time);

    //     if(org.a<=0.99)
    //     {
    //         var size:CVec2=Sam2DSize(0.0);
    //         size.x=1.0/size.x;
    //         size.y=1.0/size.y;

    //         var lc:CVec4=VFXDown1(new CVec2(_uv.x-size.x,_uv.y),_value,_time);
    //         var rc:CVec4=VFXDown1(new CVec2(_uv.x+size.x,_uv.y),_value,_time);
    //         var tc:CVec4=VFXDown1(new CVec2(_uv.x,_uv.y-size.y),_value,_time);
    //         var bc:CVec4=VFXDown1(new CVec2(_uv.x,_uv.y+size.y),_value,_time);
    //         if(lc.a>0.0 || rc.a>0.0 || tc.a>0.0 || bc.a>0.0)
    //         {
    //             outColor=new CVec4(para.xyz,1.0);
    //         }
    //     }
    //      else 
    //         outColor = org;
    // }
    else if(type<SDF.eVFX.Pixel+0.5)
    {
        var pixelatedUV : CVec2 = GetPixelatedUV(Sam2DSize(0.0), new CVec2(para.x, para.y), _uv);
        outColor=VFXDown1(pixelatedUV,_value,_time,_worldPos);
    }
    else if(type<SDF.eVFX.Scanline+0.5)
    {
        outColor = AddScanLine(outColor, _uv, _time, para.x, para.y);
    }
    else if(type<SDF.eVFX.LookUpTable+0.5)
    {
        var palSize : CVec2 = new CVec2(32.0,32.0);
        var cellSize : number = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
        
        var ditherStrength : number = (NoiseGet(new CVec3(screenPos.xy, 0.0), SDF.eNoise.Blue) - 0.5) / (cellSize - 1.0) * para.y;
        outColor.rgb = V3AddV3(outColor.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
        var palIndex : number = MapToPaletteIndex(outColor.rgb, cellSize,palSize);
        

        outColor=Sam2DToV4(new CVec2(11,para.x),palIndex);
        
    }
    else if(type<SDF.eVFX.Decal+0.5 || type<SDF.eVFX.DecalTexture+0.5)
    {
        var decalDir : CVec3 = new CVec3(vfxMat1[1][0], vfxMat1[1][1], vfxMat1[1][2]);
        var decalRot : number = vfxMat1[1][3];
        var decalSca : CVec3 = new CVec3(vfxMat1[2][0], vfxMat1[2][1], vfxMat1[2][2]);
        var decalPos : CVec3 = new CVec3(vfxMat1[2][3], vfxMat1[3][0], vfxMat1[3][1]);

        var zAxis : CVec3 = V3Nor(decalDir);
        var up : CVec3 = abs(zAxis.y) > 1.0-1e-8 ? new CVec3(0.0, 0.0, -1.0) : new CVec3(0.0, 1.0, 0.0);
        var xAxis : CVec3 = V3Cross(up, zAxis);
        var yAxis : CVec3 = V3Cross(zAxis, xAxis);

        var rx : CVec3 = xAxis;
        var ry : CVec3 = yAxis;
        if(decalRot > 1e-8) {
            var cosT : number = cos(decalRot);
            var sinT : number = sin(decalRot);
            rx = V3Nor(V3AddV3(V3MulFloat(xAxis, cosT), V3MulFloat(yAxis, sinT)));
            ry = V3Nor(V3SubV3(V3MulFloat(yAxis, cosT), V3MulFloat(xAxis, sinT)));
        }

        var decalMat : CMat = new CMat(
            rx.x / decalSca.x, rx.y / decalSca.x, rx.z / decalSca.x, 0.0,
            ry.x / decalSca.y, ry.y / decalSca.y, ry.z / decalSca.y, 0.0,
            zAxis.x / decalSca.z, zAxis.y / decalSca.z, zAxis.z / decalSca.z, 0.0,
            0.0, 0.0, 0.0, 1.0
        );
        decalMat[3][0] = -(decalPos.x * decalMat[0][0] + decalPos.y * decalMat[0][1] + decalPos.z * decalMat[0][2]);
        decalMat[3][1] = -(decalPos.x * decalMat[1][0] + decalPos.y * decalMat[1][1] + decalPos.z * decalMat[1][2]);
        decalMat[3][2] = -(decalPos.x * decalMat[2][0] + decalPos.y * decalMat[2][1] + decalPos.z * decalMat[2][2]);

        var decalUV : CVec4 = V4MulMatCoordi(_worldPos, decalMat);
        decalUV = V4MulFloat(decalUV, 1.0 / decalUV.w);

        // 데칼 범위 내에 있음
        if(decalUV.x >= -0.5 && decalUV.x <= 0.5 && decalUV.y >= -0.5 && decalUV.y <= 0.5 && decalUV.z >= -0.5 && decalUV.z <= 0.5)
        {
            if(type<SDF.eVFX.Decal+0.5) {
                var decalColor : CVec4 = para;
                outColor = new CVec4(
                    V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a),
                    outColor.a
                );
            }
            else if(type<SDF.eVFX.DecalTexture+0.5) {
                var decalColor : CVec4 = Sam2DToColor(para.x, new CVec2(decalUV.x * -1.0 + 0.5, decalUV.y * 1.0 + 0.5));
                decalColor.a *= para.y;
                outColor = new CVec4(
                    V3Mix(outColor.rgb, decalColor.rgb, outColor.a * decalColor.a),
                    outColor.a
                );
                if(para.z > 0.5 && decalColor.a > 0.001) {
                    outColor.r = 1.0 - outColor.r;
                    outColor.g = 1.0 - outColor.g;
                    outColor.b = 1.0 - outColor.b;
                }
            }
        }
    }
    
    return outColor;
}



//=============================================================
export var TexOffBlendFactor : CMat=Null();
export function TexOffBlendFactorFun(_color : CVec4,_uv : CVec2,_obo : CMat) : CVec4
{
    for(var i = 0; i < 4; i++) 
    {
        var tCol : CVec4 = Sam2DToColor(_obo[i].x, _uv);
        var op : number=_obo[i].z;

        if(SDF.eBlend.Null>_obo[i].y-0.5) 
        {
            _color=_color;
        }
        else if(SDF.eBlend.LinearDodge>_obo[i].y-0.5)
        {
            // org + tar * per
            _color = V4AddV4(_color,V4MulFloat(tCol,op));
        }
        else if(SDF.eBlend.Multiply>_obo[i].y-0.5)
        {
            // org * ( tar*per + (1-per) )
            _color = V4MulV4(
                _color,
                V4AddV4(
                    V4MulFloat(tCol,op),
                    V4SubV4(new CVec4(1.0,1.0,1.0,1.0),new CVec4(op,op,op,op))
                )
            );
        }
        else if(SDF.eBlend.LerpPer>_obo[i].y-0.5)
        {
            // org + (tar - org) * per
            var diff : CVec4 = V4SubV4(tCol, _color);
            _color = V4AddV4(_color, V4MulFloat(diff, op));
        }
        else if(SDF.eBlend.LerpAlpha>_obo[i].y-0.5)
        {
            // rgb: org.rgb*(1-org.a) + tar.rgb*tar.a, a=1
            var invOrgA : number = 1.0 - _color.a;
            var srcA :number   = tCol.a;
            _color = new CVec4(
                _color.r * invOrgA + tCol.r * srcA,
                _color.g * invOrgA + tCol.g * srcA,
                _color.b * invOrgA + tCol.b * srcA,
                1.0
            );
        }
        else if(SDF.eBlend.Darken>_obo[i].y-0.5)
        {
            var so : number = _color.r + _color.g + _color.b;
            var st : number = tCol.r + tCol.g + tCol.b;
            _color = so < st ? _color : tCol;
        }
        else if(SDF.eBlend.Lighten>_obo[i].y-0.5)
        {
            var so : number= _color.r + _color.g + _color.b;
            var st : number= tCol.r + tCol.g + tCol.b;
            _color = so > st ? _color : tCol;
        }
        else if(SDF.eBlend.Tar>_obo[i].y-0.5)
        {
            _color = tCol;
        }
        else if(SDF.eBlend.DarkCut>_obo[i].y-0.5)
        {
            var so : number = _color.r + _color.g + _color.b;
            _color = so < 2.5  ? new CVec4(0.0, 0.0, 0.0, 0.0): tCol;
        }
    }

    return _color;
}