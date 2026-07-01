import { CMat3, CVec3, max, min, SaturateV3, V3AddV3, V3DivV3, V3Mix, V3MulFloat, V3MulMat3Normal, V3MulV3, V3SubV3 } from "./Shader";

export var exposure : number = 1.0;
export var tonemappingType : number = 0.0;

function Tonemap_Neutral(_color : CVec3, _exposure : number) : CVec3 {
    var StartCompression : number = 0.76;
    var Desaturation : number = 0.15;
    _color = V3MulFloat(_color, _exposure);
    var x : number = min(_color.x, min(_color.y, _color.z));
    var offset : number = x < 0.08 ? x - 6.25 * x * x : 0.04;
    _color = V3SubV3(_color, new CVec3(offset, offset, offset));
    var peak : number = max(_color.x, max(_color.y, _color.z));
    if(peak < StartCompression) return _color;
    var d : number = 1.0 - StartCompression;
    var nPeak : number = 1.0 - d * d / (peak + d - StartCompression);
    _color = V3MulFloat(_color, nPeak / peak);
    var g : number = 1.0 - 1.0 / (Desaturation * (peak - nPeak) + 1.0);
    return V3Mix(_color, new CVec3(nPeak, nPeak, nPeak), g);
}
function RRTAndODTFit(_v : CVec3) : CVec3 {
    var a : CVec3 = V3SubV3(V3MulV3(_v, V3AddV3(_v, new CVec3(0.0245786, 0.0245786, 0.0245786))), new CVec3(0.000090537, 0.000090537, 0.000090537));
	var b : CVec3 = V3AddV3(V3MulV3(_v, V3AddV3(V3MulFloat(_v, 0.983729), new CVec3(0.4329510, 0.4329510, 0.4329510))), new CVec3(0.238081, 0.238081, 0.238081));
	return V3DivV3(a, b);
}
function Tonemap_ACES(_color : CVec3, _exposure : number) : CVec3 {
    var ACESInputMat : CMat3 = new CMat3(
        new CVec3(0.59719, 0.07600, 0.02840),
        new CVec3(0.35458, 0.90834, 0.13383),
        new CVec3(0.04823, 0.01566, 0.83777)
    );
    var ACESOutputMat : CMat3 = new CMat3(
        new CVec3( 1.60475, -0.10208, -0.00327),
        new CVec3(-0.53108,  1.10813, -0.07276),
        new CVec3(-0.07367, -0.00605,  1.07602)
    );

    _color = V3MulFloat(_color, _exposure / 0.6);
    _color = V3MulMat3Normal(_color, ACESInputMat);
    _color = RRTAndODTFit(_color);
    _color = V3MulMat3Normal(_color, ACESOutputMat);
    return SaturateV3(_color);
}
function Reinhard(_color : CVec3, _exposure : number) : CVec3 {
    _color = V3MulFloat(_color, _exposure);
    return SaturateV3(V3DivV3(_color, V3AddV3(_color, new CVec3(1.0,1.0,1.0))));
}

export function Tonemap(_color: CVec3, _exposure: number, _type: number) : CVec3
{
    if(_type < 0.5) {
        // 0 : None
        _color = V3MulFloat(_color, _exposure);
    }
    else if(_type < 1.5) {
        // 1 : Neutral
        _color = Tonemap_Neutral(_color, _exposure);
    }
    else if(_type < 2.5) {
        // 2 : ACES
        _color = Tonemap_ACES(_color, _exposure);
    }
    else if(_type < 3.5) {
        // 3 : Reinhard
        _color = Reinhard(_color, _exposure);
    }
    return _color;
}