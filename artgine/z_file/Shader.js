export class ToV1 {
    uniOff;
}
export class ToV2 {
    x;
    y;
    xy;
    constructor(_x, _y) { this.x = _x; this.y = _y; }
}
export class ToV3 {
    x;
    y;
    z;
    xy;
    xyz;
    notUsedCVec3Param;
    constructor(_x, _y, _z) { this.x = _x; this.y = _y; this.z = _z; }
}
export class ToV4 {
    x;
    y;
    z;
    w;
    r;
    g;
    b;
    a;
    xy;
    xyz;
    rgb;
    notUsedCVec4Param;
    constructor(_x = null, _y, _z, _w) { this.x = _x; this.y = _y; }
}
export class int {
    dummy;
}
export class float {
}
export class CVec2 {
    x;
    y;
    xy;
    constructor(_x, _y) { this.x = _x; this.y = _y; }
}
export class CVec3 {
    x;
    y;
    z;
    xy;
    xyz;
    notUsedCVec3Param;
    constructor(_x, _y, _z) { this.x = _x; this.y = _y; this.z = _z; }
}
export class CVec4 {
    x;
    y;
    z;
    w;
    r;
    g;
    b;
    a;
    xy;
    xyz;
    rgb;
    notUsedCVec4Param;
    constructor(_x = null, _y, _z, _w) { this.x = _x; this.y = _y; }
}
export class CMat {
    constructor(_x) { }
    b;
}
export class CMat12 {
    constructor(_x) { }
    b;
}
export class CMat3 {
    a;
    constructor(_x, _y, _z) { }
}
export class CMat34 {
    constructor(_x) { }
    a;
}
export class CMat42 {
    constructor(_x) { }
    a;
}
export class Vertex1 extends float {
}
export class Vertex2 extends CVec2 {
}
export class Vertex3 extends CVec3 {
}
export class Vertex4 extends CVec4 {
}
export class Vertex16 {
    x;
    y;
    z;
    w;
}
export class Position1 extends float {
}
export class Position2 extends CVec2 {
}
export class Position3 extends CVec3 {
}
export class Position4 extends CVec4 {
}
export class Position16 {
    x;
    y;
    z;
    w;
}
export class OutColor extends CVec4 {
}
export class OutPosition extends CVec4 {
}
export class Color1 {
    uniOff;
}
export class Color2 extends CVec2 {
}
export class Color3 extends CVec3 {
}
export class Color4 extends CVec4 {
}
export class UV1 extends float {
}
export class UV2 extends CVec2 {
}
export class UV3 extends CVec3 {
}
export class UV4 extends CVec4 {
}
export class UV16 {
    x;
    y;
    z;
    w;
}
export class Instance1 extends float {
    uniOff;
}
export class Instance2 extends CVec2 {
}
export class Instance3 extends CVec3 {
}
export class Instance4 extends CVec4 {
}
export class Instance16 extends CMat {
    x;
    y;
    z;
    w;
}
export class Weight4 extends CVec4 {
}
export class WeightIndexI4 extends CVec4 {
}
export class Normal3 extends CVec3 {
}
export class Tangent3 extends CVec3 {
}
export class Tangent4 extends CVec4 {
}
export class Binormal3 extends CVec3 {
}
export class TexOff3 extends CVec3 {
}
export class Shadow2 extends CVec2 {
}
export class TexOff1 {
    dummy;
}
export class Sam2DV4 {
    constructor(_x, _y = -1) { }
    x;
    y;
}
export class Sam2DMat {
    constructor(_x, _y = -1) { }
    x;
    y;
}
export class sampler2D {
}
export class sampler2DArray {
}
export class sampler2DCube {
}
export var TexSizeHalfInt = 1024;
export var TexSizeHalfFloat = 1024.0;
export var sam2D = 0;
export var gl_Position;
export var discard = 0;
export var screenPos;
export function Build(_key, _tag, _vs, _attribute, _VsToPs, _ps, _psOut, _insCount = 10) { }
export function Attribute(_value, _tag = "") { }
export function Null() { }
export function LWVPMul(_vertex, _w, _v, _p) { return new CVec4(0, 0, 0, 0); }
export function LW34VPMul(_vertex, _w, _v, _p) { return new CVec4(0, 0, 0, 0); }
export function VLWVPMul(_vertex, _l, _w, _v, _p) { return new CVec4(0, 0, 0, 0); }
export function Sam2D0ToColor(_uv) { return new CVec4(0, 0, 0, 0); }
export function Sam2DToColor(_number, _uv) { return new CVec4(0, 0, 0, 0); }
export function Sam2DArrToColor(_number, _uv) { return new CVec4(0, 0, 0, 0); }
export function SamCubeToColor(_number, _uv) { return new CVec4(0, 0, 0, 0); }
export function SamCubeLodToColor(_number, _uv, _lod) { return new CVec4(0, 0, 0, 0); }
export function Sam2DToV4(_uni, _off) { return new CVec4(0, 0, 0, 0); }
export function Sam2DToMat(_uni, _off) { return new CVec4(0, 0, 0, 0); }
export function Sam2DSize(_off) { return new CVec2(0, 0); }
export function Sam2DArrSize(_off) { return new CVec3(0, 0, 0); }
export function SamCubeMaxLod(_off) { return 0; }
export function ParallaxNormal(TangentViewPos, TangentFragPos, _index, _uv, height_scale) { return new CVec2(0, 0); }
export function MappingV3ToTex(_a) { return new CVec3(0, 0, 0); }
export function MappingTexToV3(_a) { return new CVec3(0, 0, 0); }
export function MappingV4ToTex(_a) { return new CVec4(0, 0, 0, 0); }
export function MappingTexToV4(_a) { return new CVec4(0, 0, 0, 0); }
export function RGBAAdd(_color, _rgba) { return new CVec4(0, 0, 0, 0); }
export function V4MulMatCoordi(_v4, _mat) { return new CVec4(0, 0, 0, 0); }
export function V3MulMatCoordi(_v4, _mat) { return new CVec4(0, 0, 0, 0); }
export function V3MulMat3Normal(_v3, _mat) { return new CVec3(0, 0, 0); }
export function FloatMulMat(_val, _mat) { return new CMat(0); }
export function MatAdd(_a, _b) { return new CMat(0); }
export function MatMul(_a, _b) { return new CMat(0); }
export function Mat34ToMat(_mat) { return new CMat(0); }
export function TransposeMat3(_a) { return new CMat3(0); }
export function InverseMat3(_a) { return new CMat3(0); }
export function V2SubV2(_a, _b) { return new CVec2(0, 0); }
export function V2AddV2(_a, _b) { return new CVec2(0, 0); }
export function V2MulFloat(_a, _b) { return new CVec2(0, 0); }
export function V2MulV2(_a, _b) { return new CVec2(0, 0); }
export function V2DivV2(_a, _b) { return new CVec2(0, 0); }
export function V2Len(_a) { return 0; }
export function V2Dot(_a, _b) { return 0; }
export function V2Nor(_a) { return new CVec2(0, 0); }
export function V2Mix(_a, _b, _c) { return new CVec2(0, 0); }
export function V2Fract(_a) { return new CVec2(0, 0); }
export function V3SubV3(_a, _b) { return new CVec3(0, 0, 0); }
export function V3AddV3(_a, _b) { return new CVec3(0, 0, 0); }
export function V3MulFloat(_a, _b) { return new CVec3(0, 0, 0); }
export function V3DivFloat(_a, _b) { return new CVec3(0, 0, 0); }
export function V3MulV3(_a, _b) { return new CVec3(0, 0, 0); }
export function V3DivV3(_a, _b) { return new CVec3(0, 0, 0); }
export function V3Len(_v3) { return 0; }
export function V3Dot(_a, _b) { return 0; }
export function V3Nor(_a) { return new CVec3(0, 0, 0); }
export function V3Cross(_a, _b) { return new CVec3(0, 0, 0); }
export function V3Fract(_a) { return new CVec3(0, 0, 0); }
export function V4SubV4(_a, _b) { return new CVec4(0, 0, 0, 0); }
export function V4AddV4(_a, _b) { return new CVec4(0, 0, 0, 0); }
export function V4MulFloat(_a, _b) { return new CVec4(0, 0, 0, 0); }
export function V4MulV4(_a, _b) { return new CVec4(0, 0, 0, 0); }
export function V4DivV4(_a, _b) { return new CVec4(0, 0, 0, 0); }
export function V4Len(_a) { return 0; }
export function V4Dot(_a, _b) { return 0; }
export function V4Nor(_a) { return new CVec4(0, 0, 0, 0); }
export function V4Fract(_a) { return new CVec4(0, 0, 0, 0); }
export function V4Mix(_a, _b, _c) { return new CVec4(0, 0, 0, 0); }
export function max(_a, _b) { return 0; }
export function min(_a, _b) { return 0; }
export function abs(_a) { return 0; }
export function floor(_a) { return 0; }
export function ceil(_a) { return 0; }
export function round(_a) { return 0; }
export function sin(_rad) { return 0; }
export function cos(_rad) { return 0; }
export function acos(_rad) { return 0; }
export function asin(_rad) { return 0; }
export function atan(_x, _y) { return 0; }
export function sign(_x) { return 0; }
export function smoothstep(_st, _ed, _ratio) { return 0; }
export function step(_a, _b) { return 0; }
export function mod(_v, _mod) { return 0; }
export function fract(_t) { return 0; }
export function pow(_a, _pow) { return 0; }
export function Exp(_a) { return 0; }
export function reflect(_a, _b) { return new CVec3(0, 0, 0); }
export function log2(_a) { return 0; }
export function radians(_degree) { return 0; }
export function mix(_a, _b, _c) { return 0; }
export function clamp(_a, _b, _c) { return 0; }
export function Exp2(_a) { return 0; }
export function random(_uv) { return 0; }
export function V2Max(_a, _b) { return new CVec2(0, 0); }
export function V2Min(_a, _b) { return new CVec2(0, 0); }
export function V2Abs(_a) { return new CVec2(0, 0); }
export function V2Floor(_a) { return new CVec2(0, 0); }
export function V2Ceil(_a) { return new CVec2(0, 0); }
export function V2Round(_a) { return new CVec2(0, 0); }
export function V2Sign(_x) { return new CVec2(0, 0); }
export function V2Step(_a, _b) { return new CVec2(0, 0); }
export function V2Mod(_v, _mod) { return new CVec2(0, 0); }
export function V2Pow(_a, _pow) { return new CVec2(0, 0); }
export function V2Exp(_a) { return new CVec2(0, 0); }
export function V3Max(_a, _b) { return new CVec3(0, 0, 0); }
export function V3Min(_a, _b) { return new CVec3(0, 0, 0); }
export function V3Abs(_a) { return new CVec3(0, 0, 0); }
export function V3Floor(_a) { return new CVec3(0, 0, 0); }
export function V3Ceil(_a) { return new CVec3(0, 0, 0); }
export function V3Round(_a) { return new CVec3(0, 0, 0); }
export function V3Sign(_x) { return new CVec3(0, 0, 0); }
export function V3Step(_a, _b) { return new CVec3(0, 0, 0); }
export function V3Mod(_v, _mod) { return new CVec3(0, 0, 0); }
export function V3Pow(_a, _pow) { return new CVec3(0, 0, 0); }
export function V3PowV3(_a, _pow) { return new CVec3(0, 0, 0); }
export function V3Exp(_a) { return new CVec3(0, 0, 0); }
export function V3Mix(_a, _b, _fac) { return new CVec3(0, 0, 0); }
export function V3Clamp(_a, _min, _max) { return new CVec3(0, 0, 0); }
export function V4Max(_a, _b) { return new CVec4(0, 0, 0, 0); }
export function V4Min(_a, _b) { return new CVec4(0, 0, 0, 0); }
export function V4Abs(_a) { return new CVec4(0, 0, 0, 0); }
export function V4Floor(_a) { return new CVec4(0, 0, 0, 0); }
export function V4Ceil(_a) { return new CVec4(0, 0, 0, 0); }
export function V4Round(_a) { return new CVec4(0, 0, 0, 0); }
export function V4Sign(_x) { return new CVec4(0, 0, 0, 0); }
export function V4Step(_a, _b) { return new CVec4(0, 0, 0, 0); }
export function V4Mod(_v, _mod) { return new CVec4(0, 0, 0, 0); }
export function V4Pow(_a, _pow) { return new CVec4(0, 0, 0, 0); }
export function V4Exp(_a) { return new CVec4(0, 0, 0, 0); }
export function IntToFloat(_a) { return 0; }
export function FloatToInt(_a) { return 0; }
export function Mat4ToMat3(_a) { return new CMat3(0); }
export function Mat3ToMat4(_a) { return new CMat(0); }
export function V3ToMat3(_a, _b, _c) { return new CMat3(0); }
export function FloatToVec2(_a) { return new CVec2(0, 0); }
export function FloatToVec3(_a) { return new CVec3(0, 0, 0); }
export function FloatToVec4(_a) { return new CVec4(0, 0, 0, 0); }
export function SaturateFloat(_a) { return 0; }
export function SaturateV3(_a) { return new CVec3(0, 0, 0); }
export function SaturateV4(_a) { return new CVec4(0, 0, 0, 0); }
export function MatDecompRot(_a) { return new CMat3(0); }
export function ShadowPosToUv(_a) { return new CVec2(0, 0); }
export function BlendFun(_blendRatio, _org, _add, _opacityRatio) { return new CVec4(0.0, 0.0, 0.0, 0.0); }
export function Reflect(_normal, _direct) { return new CVec3(0, 0, 0); }
export function RGBAToHSVA(_a) { return new CVec4(0, 0, 0, 0); }
export function HSVAToRGBA(_a) { return new CVec4(0, 0, 0, 0); }
export function BranchBegin(_tag, _keyword, _attribute) { return true; }
export function BranchDefault() { }
export function BranchEnd() { }
export class CMath {
    constructor() { }
    static V2SubV2(_a, _b) { return new CVec2(0, 0); }
    static V2AddV2(_a, _b) { return new CVec2(0, 0); }
    static V2MulFloat(_a, _b) { return new CVec2(0, 0); }
    static V2MulV2(_a, _b) { return new CVec2(0, 0); }
    static V2DivV2(_a, _b) { return new CVec2(0, 0); }
    static V2Len(_a) { return 0; }
    static V2Dot(_a, _b) { return 0; }
    static V2Nor(_a) { return new CVec2(0, 0); }
    static V3SubV3(_a, _b) { return new CVec3(0, 0, 0); }
    static V3AddV3(_a, _b) { return new CVec3(0, 0, 0); }
    static V3MulFloat(_a, _b) { return new CVec3(0, 0, 0); }
    static V3DivFloat(_a, _b) { return new CVec3(0, 0, 0); }
    static V3MulV3(_a, _b) { return new CVec3(0, 0, 0); }
    static V3DivV3(_a, _b) { return new CVec3(0, 0, 0); }
    static V3Len(_v3) { return 0; }
    static V3Dot(_a, _b) { return 0; }
    static V3Nor(_a) { return new CVec3(0, 0, 0); }
    static V3Cross(_a, _b) { return new CVec3(0, 0, 0); }
    static V4SubV4(_a, _b) { return new CVec4(0, 0, 0, 0); }
    static V4AddV4(_a, _b) { return new CVec4(0, 0, 0, 0); }
    static V4MulFloat(_a, _b) { return new CVec4(0, 0, 0, 0); }
    static V4MulV4(_a, _b) { return new CVec4(0, 0, 0, 0); }
    static V4DivV4(_a, _b) { return new CVec4(0, 0, 0, 0); }
    static V4Len(_a) { return 0; }
    static V4Dot(_a, _b) { return 0; }
    static V4Nor(_a) { return new CVec4(0, 0, 0, 0); }
    static FloatMulMat() { return new CMat(0); }
}
