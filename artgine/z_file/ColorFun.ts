import { SDF } from "./SDF";
import { 
    abs, clamp, max, min, mod, pow, sign, sin, smoothstep,
    CMat, CVec2, CVec3, CVec4, Sam2DSize, Sam2DToColor, SaturateV4, 
    V2Abs, V2AddV2, V2DivV2, V2Floor, V2MulFloat, V2MulV2, V2SubV2, 
    V3AddV3, V3Clamp, V3Dot, V3Floor, V3Max, V3Min, V3Mod, V3MulFloat, V3MulV3, V3Step, V3SubV3, 
    V4Abs, V4AddV4, V4Dot, V4Floor, V4Max, V4Mod, V4MulFloat, V4MulV4, V4Pow, V4Step, V4SubV4
} from "./Shader";

function HSVF(_k : number,_s : number,_v : number) : number {
	return _v - _v * _s * max(min(min(_k, 4.0 - _k), 1.0), 0.0);
}
export function GetTexCodiedUV(_uv : CVec2, _texCodi : CVec4,_reverse : CVec2) : CVec3 {
	var result : CVec3 = new CVec3(0.0,0.0,1.0);
	if(_reverse.x>0.5)
		result.x = (1.0-_uv.x)*_texCodi.x+_texCodi.z;
	else
		result.x = _uv.x*_texCodi.x+_texCodi.z;
	if(_reverse.y>0.5)
		result.y = (1.0-_uv.y)*_texCodi.y+_texCodi.w;
	else
		result.y = _uv.y*_texCodi.y+_texCodi.w;

	if(result.x<0.0) 
		result.x=result.x*-1.0;
	if(result.y<0.0) 
		result.y=result.y*-1.0;
	return result;
}
export function HSVToRGB(_vec3 : CVec3) : CVec3
{
    var hk : number = mod(5.0 + _vec3.x * 6.0, 6.0);
    var sk : number = mod(3.0 + _vec3.x * 6.0, 6.0);
    var vk : number = mod(1.0 + _vec3.x * 6.0, 6.0);

    return new CVec3(HSVF(hk,_vec3.y,_vec3.z), HSVF(sk,_vec3.y,_vec3.z), HSVF(vk,_vec3.y,_vec3.z));
}

export function RGBToHSV(_vec3 : CVec3) : CVec3
{
    var cmax : number = max(_vec3.x, max(_vec3.y, _vec3.z));
    var cmin : number = min(_vec3.x, min(_vec3.y, _vec3.z));
    var delta : number = cmax - cmin;
    var h : number = 0.0;
    if(delta > 0.0) {
        if(cmax == _vec3.x) {
            h = mod((_vec3.y - _vec3.z) / delta, 6.0);
        } 
        else if(cmax == _vec3.y) {
            h = (_vec3.z - _vec3.x) / delta + 2.0;
        }
        else {
            h = (_vec3.x - _vec3.y) / delta + 4.0;
        }
        h /= 6.0;
    }
    var s : number = (cmax == 0.0) ? 0.0 : (delta / cmax);
    var v : number = cmax;
    return new CVec3(h, s, v);
}

function HSLF(_k : number, _a : number, _v : number) : number {
    return _v - _a * max(-1.0, min(_k - 3.0, min(9.0 - _k, 1.0)));
}

export function HSLToRGB(_vec3 : CVec3) : CVec3
{
    var hk : number = mod(0.0 + _vec3.x * 12.0, 12.0);
    var sk : number = mod(8.0 + _vec3.x * 12.0, 12.0);
    var lk : number = mod(4.0 + _vec3.x * 12.0, 12.0);
    var a : number = _vec3.y * min(_vec3.z, 1.0 - _vec3.z);
    return new CVec3(HSLF(hk, a, _vec3.z), HSLF(sk, a, _vec3.z), HSLF(lk, a, _vec3.z));
}

export function RGBToHSL(_vec3 : CVec3) : CVec3
{
    var cmax : number = max(_vec3.x, max(_vec3.y, _vec3.z));
    var cmin : number = min(_vec3.x, min(_vec3.y, _vec3.z));
    var delta : number = cmax - cmin;
    var h : number = 0.0;
    var s : number = 0.0;
    var l : number = (cmax + cmin) / 2.0;
    if(delta > 0.0) {
        s = (l > 0.5) ? (delta / (2.0 - cmax - cmin)) : (delta / (cmax + cmin));
        if(cmax == _vec3.x) {
            h = (_vec3.y - _vec3.z) / delta + ((_vec3.y < _vec3.z) ? 6.0 : 0.0);
        } else {
            h = (cmax == _vec3.y) ? ((_vec3.z - _vec3.x) / delta + 2.0) : ((_vec3.x - _vec3.y) / delta + 4.0);
        }
        h /= 6.0;
    }
    return new CVec3(h, s, l);
}

export function ColorModelCac(_rgba : CVec4, _cModel : CVec4, _aModel : CVec2) : CVec4 {
    var rgb : CVec3;
    if(_cModel.a < SDF.eColorModel.RGBAdd + 0.5)
        rgb = V3AddV3(_rgba.rgb, _cModel.rgb);
    else if(_cModel.a < SDF.eColorModel.RGBMul + 0.5)
        rgb = V3MulV3(_rgba.rgb, _cModel.rgb);
    else if(_cModel.a < SDF.eColorModel.HSVBaseHSPercent + 0.5)
    {
        var hsv : CVec3=RGBToHSV(_rgba.rgb);
        hsv.y=_cModel.y;
        hsv.x=_cModel.x;

        rgb =HSVToRGB(hsv);
        rgb.x = _rgba.x*(1.0-_cModel.z)+ rgb.x*_cModel.z;
        rgb.y = _rgba.y*(1.0-_cModel.z)+ rgb.y*_cModel.z;
        rgb.z = _rgba.z*(1.0-_cModel.z)+ rgb.z*_cModel.z;
    }
    else if(_cModel.a < SDF.eColorModel.HSV + 0.5)
        rgb = HSVToRGB(_cModel.rgb);    
    else if(_cModel.a < SDF.eColorModel.HSL + 0.5)
        rgb = HSLToRGB(_cModel.rgb);
    else
        rgb = _rgba.rgb;
    rgb = V3Clamp(rgb, 0.0, 1.0);

    var a : number;
    if(_aModel.y < SDF.eAlphaModel.Add + 0.5)
        a = _rgba.a + _aModel.x;
    else if(_aModel.y < SDF.eAlphaModel.Mul + 0.5)
        a = _rgba.a * _aModel.x;
    else
        a = _rgba.a;
    a = clamp(a, 0.0, 1.0);
    
    return new CVec4(rgb, a);
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

export function ColorVFX(_color : CVec4,_uv : CVec2, _value : CMat, _time : number) : CVec4
{

    for(var i=0;i<4;++i)
    {
        if(_value[i].w<SDF.eColorVFX.None+0.5){    return _color;  }
        //왜곡 xy 간격
        else if(_value[i].w<SDF.eColorVFX.Distort+0.5)
        {
            var distortedUV : CVec2 = GetDistortedUV(_uv, new CVec2(_value[i].x, _value[i].y), _time);
            _color = Sam2DToColor(0.0, distortedUV);
        }
        //카메라 이탈 x 기본 강도 y 랜덤 강도
        else if(_value[i].w<SDF.eColorVFX.Aberrate+0.5)
        {
            _color = GetAberratedColor(0.0, _uv, _time, _value[i].x, _value[i].y);
        }
        //아웃라인xyz : rgb
        else if(_value[i].w<SDF.eColorVFX.Outline+0.5)
        {
            if(_color.a<=0.0)
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
                    _color=new CVec4(_value[i].xyz,1.0);
                }
            }
        }
        //픽셀화 xy 픽셀사이즈
        else if(_value[i].w<SDF.eColorVFX.Pixel+0.5)
        {
            var pixelatedUV : CVec2 = GetPixelatedUV(Sam2DSize(0.0), new CVec2(_value[i].x, _value[i].y), _uv);
            _color = Sam2DToColor(0.0, pixelatedUV);
        }
        //티비노이즈 x 속도 y 강도 z 픽셀사이즈
        else if(_value[i].w<SDF.eColorVFX.Noise+0.5)
        {
            var texSize : CVec2 = Sam2DSize(0.0);
            var fragCoord : CVec2 = V2Floor(V2DivV2(V2MulV2(_uv, texSize), new CVec2(_value[i].z, _value[i].z)));
            _color = AddNoise(fragCoord, _color, _time, _value[i].x, _value[i].y);
        }
        // //티비보더 x 강도 y 두께
        // else if(_value[i].w<SDF.eColorVFX.BorderLight+0.5)
        // {
        //     _color = AddBorder(_mpos, _color, _value[i].x, _value[i].y);
        // }
        //스캔라인 x 두께 y 밀도 z 강도
        else if(_value[i].w<SDF.eColorVFX.Scanline+0.5)
        {
            _color = AddScanLine(_color, _uv, _time, _value[i].x, _value[i].y);
        }
        else if(_value[i].w<SDF.eColorVFX.Hologram+0.5)
        {
            
        }
    }
	
	return _color;
}