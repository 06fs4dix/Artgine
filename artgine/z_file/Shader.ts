/*
[변수 목록]
-Canvas
rtSize : V2 렌더타겟 사이즈
viewMat
projectMat
farClip
camPos
time
texture16f
screenSize
ligDir
ligCol
ligCount
viewMatInv3D
camPos3D

-Paint
worldMat
RGBA
alphaCut
skin
weightArrMat
sam2DCount

*/



export class ToV1{uniOff;}
export class ToV2 {
    x;y;xy;
    constructor(_x : number, _y : number);
    constructor(_x : CVec2);
    constructor(_x : number|CVec2,_y? : number){this.x=_x;this.y=_y;}
}
export class ToV3 {
    x;y;z;xy : CVec2;xyz : CVec3;
    notUsedCVec3Param;
    constructor(_x : number, _y : number, _z : number);
    constructor(_x : number, _y : CVec2);
    constructor(_x : CVec2, _y : number);
    constructor(_x : CVec3);
    constructor(_x:CVec2|CVec3|number,_y? : CVec2|number,_z? : number){this.x=_x;this.y=_y;this.z=_z;  }
}
export class ToV4{
    x;y;z;w;r;g;b;a;xy:CVec2;
    xyz : CVec3;rgb : CVec3;
    notUsedCVec4Param;
    constructor(_x : number, _y : number, _z : number, _w : number);
    constructor(_x : number, _y : CVec3);
    constructor(_x : number, _y : CVec2, _z : number);
    constructor(_x : CVec2, _y : number, _z : number);
    constructor(_x : CVec2, _y : CVec2);
    constructor(_x : CVec3, _y : number);
    constructor(_x : CVec4);
    constructor(_x : CVec4|CVec3|CVec2|number=null ,_y? : CVec3|CVec2|number,_z? : CVec2|number,_w? : number){this.x=_x;this.y=_y;}}



export class float{}
export class CVec2 {
    x;y;xy;
    constructor(_x : number, _y : number);
    constructor(_x : CVec2);
    constructor(_x : number|CVec2,_y? : number){this.x=_x;this.y=_y;}
}
export class CVec3 {
    x;y;z;xy : CVec2;xyz : CVec3;
    notUsedCVec3Param;
    constructor(_x : number, _y : number, _z : number);
    constructor(_x : number, _y : CVec2);
    constructor(_x : CVec2, _y : number);
    constructor(_x : CVec3);
    constructor(_x:CVec2|CVec3|number,_y? : CVec2|number,_z? : number){this.x=_x;this.y=_y;this.z=_z;  }
}
export class CVec4{
    x;y;z;w;r;g;b;a;xy:CVec2;
    xyz : CVec3;rgb : CVec3;
    notUsedCVec4Param;
    constructor(_x : number, _y : number, _z : number, _w : number);
    constructor(_x : number, _y : CVec3);
    constructor(_x : number, _y : CVec2, _z : number);
    constructor(_x : CVec2, _y : number, _z : number);
    constructor(_x : CVec2, _y : CVec2);
    constructor(_x : CVec3, _y : number);
    constructor(_x : CVec4);
    constructor(_x : CVec4|CVec3|CVec2|number=null ,_y? : CVec3|CVec2|number,_z? : CVec2|number,_w? : number){this.x=_x;this.y=_y;}}
export class CMat{constructor(_x){}public b;}//4*4
export class CMat3{
    public a;
    constructor(_x);
    constructor(_x,_y,_z);
    constructor(_x:CVec3|number,_y?:CVec3,_z?:CVec3){}
}//3*3
export class CMat34{constructor(_x){} public a;}//3*4
export class CMat42{constructor(_x){} public a;}//3*4


export class Vertex1 extends float{}
export class Vertex2 extends CVec2{}
export class Vertex3 extends CVec3{}
export class Vertex4 extends CVec4{}
export class Vertex16{x;y;z;w;}
export class Position1 extends float{}
export class Position2 extends CVec2{}
export class Position3 extends CVec3{}
export class Position4 extends CVec4{}
export class Position16{x;y;z;w;}


export class OutColor extends CVec4{}
export class OutPosition extends CVec4{}

export class Color1{uniOff;}
export class Color2 extends CVec2{}
export class Color3 extends CVec3{}
export class Color4 extends CVec4{}

export class UV1 extends float{}
export class UV2 extends CVec2{}
export class UV3 extends CVec3{}
export class UV4 extends CVec4{}
export class UV16{x;y;z;w;}

export class Instance1 extends float{uniOff;}
export class Instance2 extends CVec2{}
export class Instance3 extends CVec3{}
export class Instance4 extends CVec4{}
export class Instance16 extends CMat {x;y;z;w;}

export class Weight4 extends CVec4{}
export class WeightIndexI4 extends CVec4{}

export class Normal3 extends CVec3{}
export class Tangent3 extends CVec3{}
export class Tangent4 extends CVec4{}
export class Binormal3 extends CVec3{}
export class TexOff3 extends CVec3{}
export class Shadow2 extends CVec2{}

export class TexOff1{dummy;}
export class Sam2DV4{constructor(_x,_y=-1){}x;y;}
export class Sam2DMat{constructor(_x,_y=-1){}x;y;}

export class sampler2D{}
export class sampler2DArray{}
export class sampler2DCube{}

//export class UniToSam2DArr0{x;y;}
//export class UniToSam2DArr1{x;y;}

//global var
export var TexSizeHalfInt=1024;
export var TexSizeHalfFloat=1024.0;
export var sam2D=0;
export var gl_Position : CVec4;
export var discard=0;
export var screenPos : CVec4;

//glsl func
export function Build(_key,_tag : Array<{name : string, tag : string, assign : string}|string>,
    _vs : Function,_attribute : Array<any>,_VsToPs :  Array<any>,//_vsOut :  Array<any>,
    _ps : Function,_psOut :  Array<any>,_insCount=10) {}
export function Attribute(_value : any,_tag="") : any {}
export function Null() : any {}

//vs func
export function LWVPMul(_vertex : CVec3,_w : CMat,_v : CMat,_p : CMat) : CVec4 { return new CVec4(0,0,0,0);}
export function LW34VPMul(_vertex : CVec3,_w : CMat34,_v : CMat,_p : CMat) : CVec4 { return new CVec4(0,0,0,0);}

export function VLWVPMul(_vertex : CVec3, _l : CMat, _w : CMat, _v : CMat, _p : CMat) : CVec4 { return new CVec4(0,0,0,0); }

//ps func
export function Sam2D0ToColor(_uv : CVec2) : CVec4{    return new CVec4(0,0,0,0);}
export function Sam2DToColor(_number,_uv : CVec2) : CVec4{    return new CVec4(0,0,0,0);}
export function Sam2DArrToColor(_number,_uv : CVec3) : CVec4{    return new CVec4(0,0,0,0);}
export function SamCubeToColor(_number,_uv : CVec3) : CVec4{    return new CVec4(0,0,0,0);}
export function SamCubeLodToColor(_number,_uv : CVec3,_lod : float) : CVec4{    return new CVec4(0,0,0,0);}
export function Sam2DToV4(_uni : Sam2DV4,_off : number|any) : CVec4{    return new CVec4(0,0,0,0);}
export function Sam2DToMat(_uni : Sam2DMat,_off : number|any) : CMat{    return new CVec4(0,0,0,0);}
export function Sam2DSize(_off : number) : CVec2 { return new CVec2(0,0);}
export function Sam2DArrSize(_off : number) : CVec3 { return new CVec3(0,0,0);}
export function ParallaxNormal(TangentViewPos : CVec3,TangentFragPos : CVec3,_index:number,_uv:CVec2,height_scale:number) : CVec2{    return new CVec2(0,0);}

//mapping range
export function MappingV3ToTex(_a : CVec3) : CVec3 { return new CVec3(0,0,0);}
export function MappingTexToV3(_a : CVec3) : CVec3 { return new CVec3(0,0,0);}
export function MappingV4ToTex(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function MappingTexToV4(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}

export function RGBAAdd(_color : CVec4,_rgba : CVec4) : CVec4{    return new CVec4(0,0,0,0);}

//CMath func
//translation
export function V4MulMatCoordi(_v4 : CVec4,_mat : CMat) : CVec4{    return new CVec4(0,0,0,0);}
//export function V4MulMat34Coordi(_v4 : CVec4,_mat : CMat34) : CVec4{    return new CVec4(0,0,0,0);}
export function V3MulMatCoordi(_v4 : CVec3,_mat : CMat) : CVec4{    return new CVec4(0,0,0,0);}
//export function V3MulMat34Coordi(_v3 : CVec3,_mat : CMat34) : CVec3{    return new CVec3(0,0,0);}
export function V3MulMat3Normal(_v3 : CVec3,_mat : CMat3) : CVec3{    return new CVec3(0,0,0);}

//mat4
export function FloatMulMat(_val : number,_mat : CMat) : CMat{    return new CMat(0);}
export function MatAdd(_a : CMat,_b : CMat) : CMat{    return new CMat(0);}
export function MatMul(_a : CMat,_b : CMat) : CMat{    return new CMat(0);}

//mat3
export function TransposeMat3(_a : CMat3) : CMat3{    return new CMat3(0);}
export function InverseMat3(_a : CMat3) : CMat3 { return new CMat3(0); }

//V2
export function V2SubV2(_a : CVec2,_b : CVec2) : CVec2{    return new CVec2(0,0);}
export function V2AddV2(_a : CVec2,_b : CVec2) : CVec2{    return new CVec2(0,0);}
export function V2MulFloat(_a : CVec2,_b : number) : CVec2{    return new CVec2(0,0);}
export function V2MulV2(_a : CVec2,_b : CVec2) : CVec2{    return new CVec2(0,0);}
export function V2DivV2(_a : CVec2,_b : CVec2) : CVec2{    return new CVec2(0,0);}
export function V2Len(_a : CVec2) : number{    return 0;}
export function V2Dot(_a : CVec2,_b : CVec2) : number{    return 0;}
export function V2Nor(_a : CVec2) : CVec2{    return new CVec2(0,0);}
export function V2Mix(_a : CVec2, _b : CVec2, _c : number) : CVec2{    return new CVec2(0,0);}
export function V2Fract(_a : CVec2) : CVec2 { return new CVec2(0,0);}

//V3
export function V3SubV3(_a : CVec3,_b : CVec3) : CVec3{    return new CVec3(0,0,0);}
export function V3AddV3(_a : CVec3,_b : CVec3) : CVec3{    return new CVec3(0,0,0);}
export function V3MulFloat(_a : CVec3,_b : number) : CVec3{    return new CVec3(0,0,0);}
export function V3DivFloat(_a : CVec3,_b : number) : CVec3{    return new CVec3(0,0,0);}
export function V3MulV3(_a : CVec3,_b : CVec3) : CVec3{    return new CVec3(0,0,0);}
export function V3DivV3(_a : CVec3,_b : CVec3) : CVec3{    return new CVec3(0,0,0);}
export function V3Len(_v3 : CVec3) : number{    return 0;}
export function V3Dot(_a : CVec3,_b : CVec3) : number{    return 0;}
export function V3Nor(_a : CVec3) : CVec3{    return new CVec3(0,0,0);}
export function V3Cross(_a : CVec3, _b : CVec3) : CVec3 { return new CVec3(0,0,0);}
export function V3Fract(_a : CVec3) : CVec3 { return new CVec3(0,0,0);}

//V4
export function V4SubV4(_a : CVec4,_b : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
export function V4AddV4(_a : CVec4,_b : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
export function V4MulFloat(_a : CVec4,_b : number) : CVec4{    return new CVec4(0,0,0,0);}
export function V4MulV4(_a : CVec4,_b : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
export function V4DivV4(_a : CVec4,_b : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
export function V4Len(_a : CVec4) : number{    return 0;}
export function V4Dot(_a : CVec4,_b : CVec4) : number{    return 0;}
export function V4Nor(_a : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
export function V4Fract(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function V4Mix(_a : CVec4, _b : CVec4, _c : number) : CVec4 { return new CVec4(0,0,0,0);}

//js Math func
//number
export function max(_a : number,_b : number) : number{    return 0;}
export function min(_a : number, _b : number) : number { return 0;}
export function abs(_a : number) : number { return 0;}
export function floor(_a : number) : number { return 0;}
export function ceil(_a : number) : number { return 0;}
export function round(_a : number) : number { return 0;}
export function sin(_rad : number) : number { return 0;}
export function cos(_rad : number) : number { return 0;}
export function acos(_rad : number) : number { return 0;}
export function asin(_rad : number) : number { return 0;}
export function atan(_x : number, _y : number) : number { return 0;}
export function sign(_x : number) : number { return 0;}
export function smoothstep(_st : number, _ed : number, _ratio : number|CVec2|CVec3|CVec4) : number { return 0;} 
export function step(_a : number, _b : number) : number { return 0;}
export function mod(_v : number, _mod : number) : number { return 0; }
export function fract(_t : number) { return 0;}
export function pow(_a : number, _pow : number) : number { return 0;}
export function Exp(_a : number) : number { return 0;}
export function reflect(_a : CVec3,_b : CVec3) : CVec3 { return new CVec3(0,0,0);}
export function log2(_a : number) : number { return 0;}
export function radians(_degree : number) : number { return 0;}
export function mix(_a : number, _b : number, _c : number) : number { return 0; }
export function clamp(_a : number, _b : number, _c : number) : number { return 0; }
export function Exp2(_a : number) : number { return 0; }
export function random(_uv : CVec2) : number { return 0; }


//V2
export function V2Max(_a : CVec2,_b : CVec2) : CVec2{    return new CVec2(0, 0);}
export function V2Min(_a : CVec2, _b : CVec2) : CVec2 { return new CVec2(0, 0);}
export function V2Abs(_a : CVec2) : CVec2 { return new CVec2(0, 0);}
export function V2Floor(_a : CVec2) : CVec2 { return new CVec2(0, 0);}
export function V2Ceil(_a : CVec2) : CVec2 { return new CVec2(0, 0);}
export function V2Round(_a : CVec2) : CVec2 { return new CVec2(0,0);}
export function V2Sign(_x : CVec2) : CVec2 { return new CVec2(0, 0);}
export function V2Step(_a : CVec2, _b : CVec2) : CVec2 { return new CVec2(0, 0);}
export function V2Mod(_v : CVec2, _mod : number) : CVec2 { return new CVec2(0,0); }
export function V2Pow(_a : CVec2, _pow : number) : CVec2 { return new CVec2(0, 0);}
export function V2Exp(_a : CVec2) : CVec2 { return new CVec2(0,0);}

//V3
export function V3Max(_a : CVec3,_b : CVec3) : CVec3{    return new CVec3(0, 0,0);}
export function V3Min(_a : CVec3, _b : CVec3) : CVec3 { return new CVec3(0, 0,0);}
export function V3Abs(_a : CVec3) : CVec3 { return new CVec3(0, 0,0);}
export function V3Floor(_a : CVec3) : CVec3 { return new CVec3(0, 0,0);}
export function V3Ceil(_a : CVec3) : CVec3 { return new CVec3(0, 0,0);}
export function V3Round(_a : CVec3) : CVec3 { return new CVec3(0,0,0);}
export function V3Sign(_x : CVec3) : CVec3 { return new CVec3(0, 0,0);}
export function V3Step(_a : CVec3, _b : CVec3) : CVec3 { return new CVec3(0, 0,0);}
export function V3Mod(_v : CVec3, _mod : number|CVec3) : CVec3 { return new CVec3(0,0,0); }
//export function V3Pow(_a : CVec3, _pow : number);
//export function V3Pow(_a : CVec3, _pow : CVec3);
export function V3Pow(_a : CVec3, _pow : number) : CVec3 { return new CVec3(0,0,0);}
export function V3PowV3(_a : CVec3, _pow : CVec3) : CVec3 { return new CVec3(0,0,0);}
export function V3Exp(_a : CVec3) : CVec3 { return new CVec3(0,0,0);}
export function V3Mix(_a : CVec3, _b : CVec3, _fac : number) : CVec3 { return new CVec3(0,0,0);}
export function V3Clamp(_a : CVec3, _min : number|CVec3, _max : number|CVec3) { return new CVec3(0, 0, 0); }

//V4
export function V4Max(_a : CVec4,_b : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
export function V4Min(_a : CVec4, _b : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function V4Abs(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function V4Floor(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function V4Ceil(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function V4Round(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function V4Sign(_x : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function V4Step(_a : CVec4, _b : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function V4Mod(_v : CVec4, _mod : number) : CVec4 { return new CVec4(0,0,0,0); }
export function V4Pow(_a : CVec4, _pow : number) : CVec4 { return new CVec4(0,0,0,0);}
export function V4Exp(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}

//type casting
export function IntToFloat(_a : number|sampler2D) : number { return 0;}
export function FloatToInt(_a : number) : number { return 0;}
export function Mat4ToMat3(_a : CMat) : CMat3{    return new CMat3(0);}
export function Mat3ToMat4(_a : CMat3) : CMat{    return new CMat(0);}
export function V3ToMat3(_a : CVec3,_b : CVec3,_c : CVec3) : CMat3{    return new CMat3(0);}
export function FloatToVec2(_a : number) : CVec2 { return new CVec2(0,0); }
export function FloatToVec3(_a : number) : CVec3 { return new CVec3(0,0,0); }
export function FloatToVec4(_a : number) : CVec4 { return new CVec4(0,0,0,0); }

//glsl math func
export function SaturateFloat(_a : number) : number{    return 0;}
export function SaturateV3(_a : CVec3) : CVec3{    return new CVec3(0,0,0);}
export function SaturateV4(_a : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
export function MatDecompRot(_a : CMat) : CMat3{    return new CMat3(0);}
export function ShadowPosToUv(_a : CVec4) : CVec2 { return new CVec2(0,0);}
export function BlendFun(_blendRatio : number, _org : CVec4, _add : CVec4, _opacityRatio : number) : CVec4 { return new CVec4(0.0,0.0,0.0,0.0);}
export function Reflect(_normal : CVec3, _direct : CVec3) : CVec3 {return new CVec3(0,0,0);}
//export function TNormalToWNormal(_a : CVec3) : CVec3{    return new CVec3(0,0,0);}
//export function WNormalToTNormal(_a : CVec3) : CVec3{    return new CVec3(0,0,0);}

//color convert
export function RGBAToHSVA(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function HSVAToRGBA(_a : CVec4) : CVec4 { return new CVec4(0,0,0,0);}
export function BranchBegin(_tag : string,_keyword : string,_attribute : Array<any>) { return true;}
export function BranchDefault() { }
export function BranchEnd() { }

export class CMath
{
    constructor(){}

    //v2
    static V2SubV2(_a : CVec2,_b : CVec2) : CVec2{    return new CVec2(0,0);}
    static V2AddV2(_a : CVec2,_b : CVec2) : CVec2{    return new CVec2(0,0);}
    static V2MulFloat(_a : CVec2,_b : number) : CVec2{    return new CVec2(0,0);}
    static V2MulV2(_a : CVec2,_b : CVec2) : CVec2{    return new CVec2(0,0);}
    static V2DivV2(_a : CVec2,_b : CVec2) : CVec2{    return new CVec2(0,0);}
    static V2Len(_a : CVec2) : number{    return 0;}
    static V2Dot(_a : CVec2,_b : CVec2) : number{    return 0;}
    static V2Nor(_a : CVec2) : CVec2{    return new CVec2(0,0);}

    //v3
    static V3SubV3(_a : CVec3,_b : CVec3) : CVec3{    return new CVec3(0,0,0);}
    static V3AddV3(_a : CVec3,_b : CVec3) : CVec3{    return new CVec3(0,0,0);}
    static V3MulFloat(_a : CVec3,_b : number) : CVec3{    return new CVec3(0,0,0);}
    static V3DivFloat(_a : CVec3,_b : number) : CVec3{    return new CVec3(0,0,0);}
    
    static V3MulV3(_a : CVec3,_b : CVec3) : CVec3{    return new CVec3(0,0,0);}
    
    static V3DivV3(_a : CVec3,_b : CVec3) : CVec3{    return new CVec3(0,0,0);}
    static V3Len(_v3 : CVec3) : number{    return 0;}
    static V3Dot(_a : CVec3,_b : CVec3) : number{    return 0;}
    static V3Nor(_a : CVec3) : CVec3{    return new CVec3(0,0,0);}
    static V3Cross(_a : CVec3, _b : CVec3) : CVec3 { return new CVec3(0,0,0);}

    //v4
    static V4SubV4(_a : CVec4,_b : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
    static V4AddV4(_a : CVec4,_b : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
    static V4MulFloat(_a : CVec4,_b : number) : CVec4{    return new CVec4(0,0,0,0);}
    static V4MulV4(_a : CVec4,_b : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
    static V4DivV4(_a : CVec4,_b : CVec4) : CVec4{    return new CVec4(0,0,0,0);}
    static V4Len(_a : CVec4) : number{    return 0;}
    static V4Dot(_a : CVec4,_b : CVec4) : number{    return 0;}
    static V4Nor(_a : CVec4) : CVec4{    return new CVec4(0,0,0,0);}

    //mat
    static FloatMulMat()   : CMat { return new CMat(0);  }
}