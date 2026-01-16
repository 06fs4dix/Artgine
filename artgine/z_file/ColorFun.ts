import { BayerFilter, NoiseGet } from "./Noise";
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
    discard
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
// function HSLF(_k : number, _a : number, _v : number) : number {
//     return _v - _a * max(-1.0, min(_k - 3.0, min(9.0 - _k, 1.0)));
// }
// export function HSLToRGB(_vec3 : CVec3) : CVec3
// {
//     var hk : number = mod(0.0 + _vec3.x * 12.0, 12.0);
//     var sk : number = mod(8.0 + _vec3.x * 12.0, 12.0);
//     var lk : number = mod(4.0 + _vec3.x * 12.0, 12.0);
//     var a : number = _vec3.y * min(_vec3.z, 1.0 - _vec3.z);
//     return new CVec3(HSLF(hk, a, _vec3.z), HSLF(sk, a, _vec3.z), HSLF(lk, a, _vec3.z));
// }
// export function RGBToHSL(_vec3 : CVec3) : CVec3
// {
//     var cmax : number = max(_vec3.x, max(_vec3.y, _vec3.z));
//     var cmin : number = min(_vec3.x, min(_vec3.y, _vec3.z));
//     var delta : number = cmax - cmin;
//     var h : number = 0.0;
//     var s : number = 0.0;
//     var l : number = (cmax + cmin) / 2.0;
//     if(delta > 0.0) {
//         s = (l > 0.5) ? (delta / (2.0 - cmax - cmin)) : (delta / (cmax + cmin));
//         if(cmax == _vec3.x) {
//             h = (_vec3.y - _vec3.z) / delta + ((_vec3.y < _vec3.z) ? 6.0 : 0.0);
//         } else {
//             h = (cmax == _vec3.y) ? ((_vec3.z - _vec3.x) / delta + 2.0) : ((_vec3.x - _vec3.y) / delta + 4.0);
//         }
//         h /= 6.0;
//     }
//     return new CVec3(h, s, l);
// }

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

function GetAberratedColor(_texOff : number, _uv : CVec2, _t : number, _baseStr : number, _addedStr : number) : CVec4 {
    var line : number = max(0.0, sin(_uv.y * 3.8 + _t * 1.4) * sin(_uv.y * 0.6 + _t * 2.3));
    var aberration_strength : number = (0.1 + line) * _addedStr + _baseStr;
    var r : CVec4 = Sam2DToColor(_texOff, new CVec2(_uv.x - aberration_strength, _uv.y));
    var g : CVec4 = Sam2DToColor(_texOff, _uv);
    var b : CVec4 = Sam2DToColor(_texOff, new CVec2(_uv.x + aberration_strength, _uv.y));
    return SaturateV4(new CVec4(
        r.r,
        g.g,
        b.b,
        max(r.a, max(g.a, b.a))
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
    return V4SubV4(new CVec4(1.79284291400159,1.79284291400159,1.79284291400159,1.79284291400159), V4MulFloat(_r, 0.85373472095314));
}

function SNoise(_v : CVec3) : number {
    var C : CVec2 = new CVec2(1.0 / 6.0, 1.0 / 3.0);
    var D : CVec4 = new CVec4(0.0,0.5,1.0,2.0);

    //first corner
    var dotVal : number = V3Dot(_v, new CVec3(C.y,C.y,C.y));
    var i : CVec3 = V3Floor(V3AddV3(_v, new CVec3(dotVal,dotVal,dotVal)));
    dotVal = V3Dot(i, new CVec3(C.x,C.x,C.x));
    var x0 : CVec3 = V3AddV3(V3SubV3(_v, i), new CVec3(dotVal,dotVal,dotVal));

    //other corner
    var g : CVec3 = V3Step(new CVec3(x0.y, x0.z, x0.x), x0);
    var l : CVec3 = V3SubV3(new CVec3(1.0,1.0,1.0), g);
    var i1 : CVec3 = V3Min(g, new CVec3(l.z, l.x, l.y));
    var i2 : CVec3 = V3Max(g, new CVec3(l.z, l.x, l.y));
    var x1 : CVec3 = V3AddV3(V3SubV3(x0, i1), new CVec3(C.x));
    var x2 : CVec3 = V3AddV3(V3SubV3(x0, i2), new CVec3(C.y));
    var x3 : CVec3 = V3SubV3(x0, new CVec3(D.y));
    
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
    var ns : CVec3 = V3MulFloat(new CVec3(D.w, D.y, D.z), n_);
    ns = V3SubV3(ns, new CVec3(D.x, D.z, D.x));
    var floor_p : CVec4 = V4Floor(V4MulFloat(p, ns.z * ns.z));
    var j : CVec4 = V4SubV4(p, V4MulFloat(floor_p, 49.0));
    var x_ : CVec4 = V4Floor(V4MulFloat(j, ns.z));
    var y_ : CVec4 = V4Floor(V4SubV4(j, V4MulFloat(x_, 7.0)));

    var x : CVec4 = V4AddV4(V4MulFloat(x_, ns.x), new CVec4(ns.y));
    var y : CVec4 = V4AddV4(V4MulFloat(y_, ns.x), new CVec4(ns.y));
    var h : CVec4 = V4SubV4(V4SubV4(new CVec4(1.0,1.0,1.0,1.0), V4Abs(x)), V4Abs(y));

    var b0 : CVec4 = new CVec4(x.x, x.y, y.x, y.y);
    var b1 : CVec4 = new CVec4(x.z, x.w, y.z, y.w);

    var s0 : CVec4 = V4AddV4(V4MulFloat(V4Floor(b0), 2.0), new CVec4(1.0,1.0,1.0,1.0));
    var s1 : CVec4 = V4AddV4(V4MulFloat(V4Floor(b1), 2.0), new CVec4(1.0,1.0,1.0,1.0));
    var sh : CVec4 = V4MulFloat(V4Step(h, new CVec4(0.0,0.0,0.0,0.0)), -1.0);

    var a0 : CVec4 = V4AddV4(new CVec4(b0.x,b0.z,b0.y,b0.w), new CVec4(s0.x * sh.x, s0.z*sh.x,s0.y*sh.y,s0.w*sh.y));
    var a1 : CVec4 = V4AddV4(new CVec4(b1.x,b1.z,b1.y,b1.w), new CVec4(s1.x*sh.z,s1.z*sh.z,s1.y*sh.w,s1.w*sh.w));

    var p0 : CVec3 = new CVec3(a0.x,a0.y,h.x);
    var p1 : CVec3 = new CVec3(a0.z,a0.w,h.y);
    var p2 : CVec3 = new CVec3(a1.x,a1.y,h.z);
    var p3 : CVec3 = new CVec3(a1.z,a1.w,h.w);

    //normalize gradient
    var norm : CVec4 = taylorInvSqrt(new CVec4(V3Dot(p0, p0), V3Dot(p1, p1), V3Dot(p2, p2), V3Dot(p3, p3)));
    p0 = V3MulFloat(p0, norm.x);
    p1 = V3MulFloat(p1, norm.y);
    p2 = V3MulFloat(p2, norm.z);
    p3 = V3MulFloat(p3, norm.w);

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

function AddNoise(_randomSeed : CVec2, _col : CVec4, _time : number, _speed : number, _intensity : number) : CVec4 {
    var t : number = _time * _speed;
    var m : CVec3 = new CVec3(_randomSeed, 0.0);
    var factor1 : number = 1.0 - TimedNoise(m, t) * _intensity;
    var baseColor : CVec3 = new CVec3(
        TimedNoise(m, t),
        TimedNoise(m, t * 2.0),
        TimedNoise(m, t * 3.0)
    );
    baseColor = V3MulFloat(baseColor, 0.1 * _intensity);
    baseColor = V3AddV3(baseColor, V3MulFloat(_col.rgb, factor1 * (_col.w * factor1 + 0.1 * _intensity)));
    return new CVec4(baseColor, _col.w);
}

function AddBorder(_m : CVec3, _c : CVec4, _intensity : number, _thickness : number) : CVec4 {
    var distToBorderVec : CVec2 = V2Abs(V2SubV2(V2Abs(_m.xy), new CVec2(5.0,5.0)));
    var distToBorder : number = min(distToBorderVec.x, distToBorderVec.y);
    var f : number = 1.0 - smoothstep(0.0, _thickness, distToBorder);
    return V4AddV4(_c, V4MulFloat(new CVec4(f,f,f,1.0), _intensity));
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
export var LUT0: Sam2DV4=new Sam2DV4(11, 281);
export var LUT1: Sam2DV4=new Sam2DV4(11, 282);
export var LUT2: Sam2DV4=new Sam2DV4(11, 283);
export var LUT3: Sam2DV4=new Sam2DV4(11, 284);
export var LUT4: Sam2DV4=new Sam2DV4(11, 285);
export var LUT5: Sam2DV4=new Sam2DV4(11, 286);

// function NoiseGet(_uv : CVec2,_frame : number,_type : number) : CVec4
// {
//     var outColor : CVec4;
//     if(_type<1)
//     {
//         //실시간
        
//     }
//     else if(_type>SDF.eNoise.Perlin-0.5)
//     {
//         var off : number=_uv.x+_uv.y*128.0+_frame*128*128;
//         var offX=mod(off,2048.0);
//         var offY=floor(off/2048.0);
//         Sam2DToV4(new CVec2(11,SDF.eNoise.Perlin+offY),offX);
//     }
//     return outColor;
// }
//offset 키워드가 있으면 int로
function VFXDown0(_uv : CVec2, _value : CMat,_time : number) : CVec4
{
    var outColor : CVec4=new CVec4(0.0,0.0,0.0,0.0);
    if(_value[1].w<SDF.eColorVFX.None+0.5)
    {     
        outColor = Sam2DToColor(0.0, _uv);
    }
    //왜곡 xy 간격
    else if(_value[1].w<SDF.eColorVFX.Distort+0.5)
    {
        var distortedUV : CVec2 = GetDistortedUV(_uv, new CVec2(_value[0].x, _value[0].y), _time);
               
        outColor = Sam2DToColor(0.0, distortedUV);
    }
    else if(_value[1].w<SDF.eColorVFX.Aberrate+0.5)
    {
        outColor = GetAberratedColor(0.0, _uv, _time, _value[0].x, _value[0].y);
    }
     //아웃라인xyz : rgb
    else if(_value[1].w<SDF.eColorVFX.Outline+0.5)
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
                outColor=new CVec4(_value[0].xyz,1.0);
            }
            else
                outColor = org;
        }
        else 
            outColor = org;
    
        
    }
    else if(_value[1].w<SDF.eColorVFX.Pixel+0.5)
    {
        var pixelatedUV : CVec2 = GetPixelatedUV(Sam2DSize(0.0), new CVec2(_value[0].x, _value[0].y), _uv);
        outColor = Sam2DToColor(0.0, pixelatedUV);
    }
    else if(_value[1].w<SDF.eColorVFX.Noise+0.5)
    {
        var texSize : CVec2 = Sam2DSize(0.0);
        var fragCoord : CVec2 = V2Floor(V2DivV2(V2MulV2(_uv, texSize), new CVec2(_value[0].z, _value[0].z)));
        outColor = Sam2DToColor(0.0, _uv);
        outColor = AddNoise(fragCoord, outColor, _time, _value[0].x, _value[0].y);
    }
    else if(_value[1].w<SDF.eColorVFX.Scanline+0.5)
    {
        outColor = Sam2DToColor(0.0, _uv);
        outColor = AddScanLine(outColor, _uv, _time, _value[0].x, _value[0].y);
    }
    else if(_value[1].w<SDF.eColorVFX.LookUpTable+0.5)
    {
        outColor = Sam2DToColor(0.0, _uv);
        var palSize : CVec2 = new CVec2(32.0,32.0);
        var cellSize : number = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
        
        var ditherStrength : number = (BayerFilter(screenPos.xy) - 0.5) / (cellSize - 1.0) * _value[0].y;
        outColor.rgb = V3AddV3(outColor.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
        var palIndex : number = MapToPaletteIndex(outColor.rgb, cellSize,palSize);
        

        outColor=Sam2DToV4(new CVec2(11,_value[0].x),palIndex);
    }
    // else if(_value[1].w<SDF.eColorVFX.Blur+0.5)
    // {
    //     var fx : number = max(-_value[0].x*0.5, -2.0);    
    //     var fy : number = max(-_value[0].y*0.5, -2.0);


    //     var count : number = 0.0;
    //     var loopX : int;
    //     var loopY : int;
    //     loopX.dummy=FloatToInt(_value[0].x);
    //     loopY.dummy=FloatToInt(_value[0].y);
    //     var texScale : CVec2 = V2DivV2(new CVec2(1.0, 1.0), Sam2DSize(0.0));

    //     for(var y = 0; y < 4; y++) 
    //     {
    //         if(y<loopY.dummy)
    //         {
    //             for(var x = 0; x < 4; x++) 
    //             {
    //                 if(x<loopX.dummy)
    //                 {
                        
    //                     var uv : CVec2 = V2AddV2(_uv, V2MulV2(new CVec2(fx, fy), texScale));
    //                     var bout : CVec4 = Sam2DToColor(0.0, uv);

    //                     outColor = V4AddV4(outColor, bout);
    //                     count += 1.0;
    //                 } 
    //                 else   break;
                    
    //                 fx += 1.0;
    //             }
    //             fx = -_value[0].x*0.5;
    //             fy += 1.0;
    //         }
    //         else    break;
    //     }
    //     if(count > 0.01) {
    //         outColor = V4DivV4(outColor, new CVec4(count,count,count,count));
    //         outColor = SaturateV4(outColor);
    //     }

    // }
    
    return outColor;
}
export function VFXDown2(_uv : CVec2, _value : CMat,_time : number) : CVec4
{
    var outColor : CVec4=new CVec4(0.0,0.0,0.0,0.0);
    if(_value[3].w<SDF.eColorVFX.None+0.5)
    {     
        outColor=VFXDown0(_uv,_value,_time);
    }
    //왜곡 xy 간격
    else if(_value[3].w<SDF.eColorVFX.Distort+0.5)
    {
        var distortedUV : CVec2 = GetDistortedUV(_uv, new CVec2(_value[2].x, _value[2].y), _time);
        
        outColor=VFXDown0(distortedUV,_value,_time);
        
    }
    else if(_value[3].w<SDF.eColorVFX.Aberrate+0.5)
    {
        var line : number = max(0.0, sin(_uv.y * 3.8 + _time * 1.4) * sin(_uv.y * 0.6 + _time * 2.3));
        var aberration_strength : number = (0.1 + line) * _value[2].y + _value[2].x;
        var r : CVec4 = VFXDown0(new CVec2(_uv.x - aberration_strength, _uv.y),_value,_time);
        var g : CVec4 = VFXDown0(_uv,_value,_time);
        var b : CVec4 = VFXDown0(new CVec2(_uv.x + aberration_strength, _uv.y),_value,_time);
        outColor= SaturateV4(new CVec4(r.r,g.g,b.b,max(r.a, max(g.a, b.a))));
    }
     //아웃라인xyz : rgb
    else if(_value[3].w<SDF.eColorVFX.Outline+0.5)
    {
       
        var org:CVec4=VFXDown0(new CVec2(_uv.x,_uv.y),_value,_time);

        if(org.a<=0.99)
        {
            var size:CVec2=Sam2DSize(0.0);
            size.x=1.0/size.x;
            size.y=1.0/size.y;

            var lc:CVec4=VFXDown0(new CVec2(_uv.x-size.x,_uv.y),_value,_time);
            var rc:CVec4=VFXDown0(new CVec2(_uv.x+size.x,_uv.y),_value,_time);
            var tc:CVec4=VFXDown0(new CVec2(_uv.x,_uv.y-size.y),_value,_time);
            var bc:CVec4=VFXDown0(new CVec2(_uv.x,_uv.y+size.y),_value,_time);
            if(lc.a>0.0 || rc.a>0.0 || tc.a>0.0 || bc.a>0.0)
            {
                outColor=new CVec4(_value[2].xyz,1.0);
            }
        }
         else 
            outColor = org;
    }
    else if(_value[3].w<SDF.eColorVFX.Pixel+0.5)
    {
        var pixelatedUV : CVec2 = GetPixelatedUV(Sam2DSize(0.0), new CVec2(_value[2].x, _value[2].y), _uv);
        outColor=VFXDown0(pixelatedUV,_value,_time);
    }
    else if(_value[3].w<SDF.eColorVFX.Noise+0.5)
    {
        
        outColor = VFXDown0(_uv,_value,_time);

        var scaledUV : CVec2 = V2DivV2(_uv, new CVec2(_value[2].z, _value[2].z));
        var t : number = _time * _value[2].x;
        var baseColor : CVec4;
        baseColor.r = NoiseGet(new CVec3(scaledUV, t), _value[3].x);
        //scaledUV = V2MulFloat(scaledUV, 2.76434);
        t*=1.17;
        baseColor.g = NoiseGet(new CVec3(scaledUV, t), _value[3].x);
        //scaledUV = V2MulFloat(scaledUV, 2.76434);
        t*=0.913;
        baseColor.b = NoiseGet(new CVec3(scaledUV, t), _value[3].x);
        //scaledUV = V2MulFloat(scaledUV, 2.76434);
        t*=0.79;
        baseColor.a = NoiseGet(new CVec3(scaledUV, t), _value[3].x);

        
        //그레이
        if(_value[2].w<0.5)
        {
            t=mix(1.0,baseColor.r,_value[2].y);
            outColor.r=outColor.r*t;
            outColor.g=outColor.g*t;
            outColor.b=outColor.b*t;
        }
        else if(_value[2].w<1.5)//R
        {
            t=mix(1.0,baseColor.r,_value[2].y);
            outColor.r=outColor.r*t;
        }
        else if(_value[2].w<2.5)//G
        {
            t=mix(1.0,baseColor.r,_value[2].y);
            outColor.g=outColor.g*t;
        }
        else if(_value[2].w<3.5)//B
        {
            t=mix(1.0,baseColor.r,_value[2].y);
            outColor.b=outColor.b*t;
        }
        else if(_value[2].w<4.5)//A
        {
            t=mix(1.0,baseColor.r,_value[2].y);
            outColor.a=outColor.a*t;
        }
        else if(_value[2].w<5.5)//RGB
        {
            baseColor=V4Mix(new CVec4(1.0,1.0,1.0,1.0),baseColor,_value[2].y);
            outColor.r=outColor.r*baseColor.r;
            outColor.g=outColor.g*baseColor.g;
            outColor.b=outColor.b*baseColor.b;
        }
        else
        {
            baseColor=V4Mix(new CVec4(1.0,1.0,1.0,1.0),baseColor,_value[2].y);
            outColor.r=outColor.r*baseColor.r;
            outColor.g=outColor.g*baseColor.g;
            outColor.b=outColor.b*baseColor.b;
            outColor.a=outColor.a*baseColor.a;
        }

        outColor.rgb=SaturateV3(outColor.rgb);
        
        //outColor = V4Mix(baseColor,outColor,_value[2].y);
    }
    else if(_value[3].w<SDF.eColorVFX.Scanline+0.5)
    {
        outColor = VFXDown0(_uv,_value,_time);
        

        var scanline : number = sin(UV_Curve(_uv).y * _value[2].x * 3.14 * 2.0 + _time * _value[2].y);
        scanline = (scanline * 0.5 + 0.5) * 0.9 + 0.1;
        scanline = pow(scanline, 0.25);
        var sLine : CVec4 = new CVec4(new CVec3(scanline, scanline, scanline), 1.0);
        outColor = V4MulV4(outColor, sLine);
    }
    else if(_value[3].w<SDF.eColorVFX.LookUpTable+0.5)
    {
        outColor = VFXDown0(_uv,_value,_time);
        var palSize : CVec2 = new CVec2(32.0,32.0);
        var cellSize : number = floor(pow(palSize.x * palSize.y, 1.0 / 3.0));
        
        var ditherStrength : number = (BayerFilter(screenPos.xy) - 0.5) / (cellSize - 1.0) * _value[2].y;
        outColor.rgb = V3AddV3(outColor.rgb, new CVec3(ditherStrength, ditherStrength, ditherStrength));
        var palIndex : number = MapToPaletteIndex(outColor.rgb, cellSize,palSize);
        

        outColor=Sam2DToV4(new CVec2(11,_value[2].x),palIndex);
        
    }
    // else if(_value[3].w<SDF.eColorVFX.Blur+0.5)
    // {

    //     var fx : number = max(-_value[2].x*0.5, -2.0);    
    //     var fy : number = max(-_value[2].y*0.5, -2.0);


    //     var count : number = 0.0;
    //     var loopX : int;
    //     var loopY : int;
    //     loopX.dummy=FloatToInt(_value[2].x);
    //     loopY.dummy=FloatToInt(_value[2].y);
    //     var texScale : CVec2 = V2DivV2(new CVec2(1.0, 1.0), Sam2DSize(0.0));

    //     for(var y = 0; y < 4; y++) 
    //     {
    //         if(y<loopY.dummy)
    //         {
    //             for(var x = 0; x < 4; x++) 
    //             {
    //                 if(x<loopX.dummy)
    //                 {
                        
    //                     var uv : CVec2 = V2AddV2(_uv, V2MulV2(new CVec2(fx, fy), texScale));
    //                     var bout : CVec4 = VFXDown0(uv,_value,_time);

    //                     outColor = V4AddV4(outColor, bout);
    //                     count += 1.0;
    //                 } 
    //                 else   break;
                    
    //                 fx += 1.0;
    //             }
    //             fx = -_value[2].x*0.5;
    //             fy += 1.0;
    //         }
    //         else    break;
    //     }
    //     if(count > 0.01) {
    //         outColor = V4DivV4(outColor, new CVec4(count,count,count,count));
    //         outColor = SaturateV4(outColor);
    //     }
    

    // }
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
