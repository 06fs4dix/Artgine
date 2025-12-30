import { 
    CMat,
    CVec2, CVec3, CVec4, 
    FloatToInt, 
    floor, fract, Hash13, min, mix,
    V2AddV2, V2Dot, V2Floor, V2Mix, V2Mod, V2MulFloat, V2MulV2, V2SubV2, 
    V3Abs, V3AddV3, V3Dot, V3Floor, V3Fract, V3Max, V3Min, V3MulFloat, V3MulV3, V3Step, V3SubV3, 
    V4Abs, V4AddV4, V4Dot, V4Floor, V4Fract, V4Max, V4Min, V4MulFloat, V4MulV4, V4Step, V4SubV4
} from "./Shader";

// 모바일용 노이즈 함수 찾아서
// webgl-noise 함수 구현함
// https://github.com/ashima/webgl-noise/tree/master

// 노이즈 종류는
// ValueNoise   : 일반적인 Hash로 만든 노이즈. tv화면 노이즈가 이거랑 같게 나옴
// SimplexNoise : PerlinNoise가 vec3받을 때 계산량이 n^3이어서 개발됨. n+3으로 계산가능. 각진 부분이 생기는 단점이 있음.
// PerlinNoise  : 둥근 형태의 노이즈. 자연스러운 노이즈를 필요로 할 때 사용.
// VoronoiNoise : 세포 형태의 노이즈. 나눠져있는 노이즈를 필요로 할 때 사용. Worley 노이즈라고도 부름
// FBM          : 위의 노이즈를 여러번 중첩해서 더 풍부한 노이즈를 만듬
// 예를 들어 구름 같은 경우는 Perlin + Voronoi로 나눠져있는 자연스러운 노이즈 사용하는 경우가 많음

// sin 피하기 위한 Permute 함수
// 모바일에서 sin 사용하면 퍼포먼스, 정확도에 오류가 있어서 Mod 사용
function Mod1(_x : number) : number {
    return _x - floor(_x / 289.0) * 289.0;
}
function Mod2(_x : CVec2) : CVec2 {
    return V2SubV2(_x, V2MulFloat(V2Floor(V2MulFloat(_x, 1.0 / 289.0)), 289.0));
}
function Mod3(_x : CVec3) : CVec3 {
    return V3SubV3(_x, V3MulFloat(V3Floor(V3MulFloat(_x, 1.0 / 289.0)), 289.0));
}
function Mod4(_x : CVec4) : CVec4 {
    return V4SubV4(_x, V4MulFloat(V4Floor(V4MulFloat(_x, 1.0 / 289.0)), 289.0));
}
function Permute1(_x : number) : number {
    return Mod1((_x * 34.0 + 10.0) * _x);
}
function Permute2(_x : CVec2) : CVec2 {
    return Mod2(V2MulV2(V2AddV2(V2MulFloat(_x,34.0),new CVec2(10.0,10.0)),_x));
}
function Permute3(_x : CVec3) : CVec3 {
    return Mod3(V3MulV3(V3AddV3(V3MulFloat(_x,34.0),new CVec3(10.0,10.0,10.0)),_x));
}
function Permute4(_x : CVec4) : CVec4 {
    return Mod4(V4MulV4(V4AddV4(V4MulFloat(_x,34.0),new CVec4(10.0,10.0,10.0,10.0)),_x));
}
function TaylorInvSqrt1(_r : number) : number {
    return 1.79284291400159 - 0.85373472095314 * _r;
}
function TaylorInvSqrt2(_r : CVec2) : CVec2 {
    return V2SubV2(new CVec2(1.79284291400159,1.79284291400159), V2MulFloat(_r, 0.85373472095314));
}
function TaylorInvSqrt3(_r : CVec3) : CVec3 {
    return V3SubV3(new CVec3(1.79284291400159,1.79284291400159,1.79284291400159), V3MulFloat(_r, 0.85373472095314));
}
function TaylorInvSqrt4(_r : CVec4) : CVec4 {
    return V4SubV4(new CVec4(1.79284291400159,1.79284291400159,1.79284291400159,1.79284291400159), V4MulFloat(_r, 0.85373472095314));
}
function Fade2(_t : CVec2) : CVec2 {
    return V2MulV2(_t, V2MulV2(_t, V2MulV2(_t, V2AddV2(V2MulV2(_t, V2SubV2(V2MulFloat(_t, 6.0), new CVec2(15.0, 15.0))), new CVec2(10.0,10.0)))));
}

// 디더링용 베이어 필터
export function BayerFilter(_uv : CVec2) : number
{
    var uv : CVec2 = V2Mod(_uv.xy, 4.0);
    var f : number = 0.0625;
    var bayerMat : CMat = new CMat(
        0.0*f, 12.0*f,  3.0*f, 15.0*f,
        8.0*f,  4.0*f, 11.0*f,  7.0*f,
        2.0*f, 14.0*f,  1.0*f, 13.0*f,
        10.0*f, 6.0*f,  9.0*f,  5.0*f 
    );
    return bayerMat[FloatToInt(uv.x)][FloatToInt(uv.y)];
}

// 밸류 노이즈 함수
export function NoiseValue3(_v : CVec3) : number
{
    var p : CVec3 = V3Floor(_v);
    var f : CVec3 = V3Fract(_v);
    f = V3MulV3(V3MulV3(f, f), new CVec3(3.0-2.0*f.x,3.0-2.0*f.y,3.0-2.0*f.z));

    return mix(mix(mix( Hash13(V3AddV3(p,new CVec3(0,0,0))), 
                        Hash13(V3AddV3(p,new CVec3(1,0,0))),f.x),
                   mix( Hash13(V3AddV3(p,new CVec3(0,1,0))), 
                        Hash13(V3AddV3(p,new CVec3(1,1,0))),f.x),f.y),
               mix(mix( Hash13(V3AddV3(p,new CVec3(0,0,1))), 
                        Hash13(V3AddV3(p,new CVec3(1,0,1))),f.x),
                   mix( Hash13(V3AddV3(p,new CVec3(0,1,1))), 
                        Hash13(V3AddV3(p,new CVec3(1,1,1))),f.x),f.y),f.z);
}

// 심플렉스 노이즈 함수
// Perlin 노이즈는 계산량이 2^n, 심플렉스 노이즈는 계산량이 n+1
// 결과값이 더 날카롭게 바뀜
// 마인크래프트 지형 생성 시에 사용하는 노이즈임
// 노이즈를 쌓아서 만드는 FBM, Voronoi 등에서 성능 차이가 많이 남
export function NoiseSimplex2(_v : CVec2) : number
{
    // 상수 미리 계산해둠
    var C : CVec4 = new CVec4(
        0.211324865405187,      // (3.0-sqrt(3.0))/6.0
        0.366025403784439,      // 0.5*(sqrt(3.0)-1.0)
       -0.577350269189626,      // -1.0 + 2.0 * C.x
        0.024390243902439       // 1.0 / 41.0
    );

    // 계산용 헬퍼 변수
    var dotVal : number;

    // 첫 번째 코너
    dotVal = V2Dot(_v, new CVec2(C.y, C.y));
    var i : CVec2  = V2Floor(V2AddV2(_v, new CVec2(dotVal, dotVal)));
    dotVal = V2Dot(_v, new CVec2(C.x, C.x));
    var x0 : CVec2 = V2AddV2(V2SubV2(_v, i), new CVec2(dotVal, dotVal));

    // 다른 코너(총 코너 3개)
    var i1 : CVec2;
    i1 = (x0.x > x0.y) ? new CVec2(1.0, 0.0) : new CVec2(0.0, 1.0);
    var x12 : CVec4 = V4AddV4(new CVec4(x0.x,x0.y,x0.x,x0.y), new CVec4(C.x,C.x,C.z,C.z));
    x12.xy = V2SubV2(x12.xy, i1);

    // 해시
    i = Mod2(i);
    var p : CVec3 = V3AddV3(Permute3(Permute3(new CVec3(i.y, i.y + i1.y, i.y + 1.0))), new CVec3(i.x, i.x + i1.x, i.x + 1.0));

    var m : CVec3 = V3Max(new CVec3(0.5 - V2Dot(x0, x0), 0.5 - V2Dot(x12.xy, x12.xy), 0.5 - V2Dot(new CVec2(x12.z, x12.w), new CVec2(x12.z, x12.w))), new CVec3(0.0, 0.0, 0.0));
    m = V3MulV3(m, m);  // 제곱
    m = V3MulV3(m, m);  // 네제곱

    // 그라디언트
    var x : CVec3 = V3SubV3(V3MulFloat(V3Fract(V3MulV3(p, new CVec3(C.w, C.w, C.w))), 2.0), new CVec3(1.0, 1.0, 1.0));
    var h : CVec3 = V3SubV3(V3Abs(x), new CVec3(0.5, 0.5, 0.5));
    var ox : CVec3 = V3Floor(V3AddV3(x, new CVec3(0.5, 0.5, 0.5)));
    var a0 : CVec3 = V3SubV3(x, ox);

    // taylor sqrt 사용한 normalize
    m = V3MulV3(m, TaylorInvSqrt3(V3AddV3(V3MulV3(a0, a0), V3MulV3(h, h))));

    // P에서의 노이즈 밸류 계산
    var g : CVec3;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.y = a0.y * x12.x + h.y * x12.y;
    g.z = a0.z * x12.z + h.z * x12.w;

    return 130.0 * V3Dot(m, g);
}
export function NoiseSimplex3(_v : CVec3) : number
{
    var C : CVec2 = new CVec2(1.0/6.0, 1.0/3.0);
    var D : CVec4 = new CVec4(0.0,0.5,1.0,2.0);

    // 계산용 헬퍼 변수
    var dotVal : number;

    // 첫 번째 코너
    dotVal = V3Dot(_v, new CVec3(C.y,C.y,C.y));
    var i : CVec3 = V3Floor(V3AddV3(_v, new CVec3(dotVal, dotVal, dotVal)));
    dotVal = V3Dot(i, new CVec3(C.x,C.x,C.x));
    var x0 : CVec3 = V3AddV3(V3SubV3(_v, i), new CVec3(dotVal, dotVal, dotVal));

    // 다른 코너(총 코너 4개)
    var g : CVec3 = V3Step(new CVec3(x0.y,x0.z,x0.x),x0.xyz);
    var l : CVec3 = V3SubV3(new CVec3(1.0,1.0,1.0),g);
    var i1 : CVec3 = V3Min(g.xyz, new CVec3(l.z,l.x,l.y));
    var i2 : CVec3 = V3Max(g.xyz, new CVec3(l.z,l.x,l.y));

    var x1 : CVec3 = V3SubV3(x0, V3MulV3(i1,new CVec3(C.x,C.x,C.x)));
    var x2 : CVec3 = V3SubV3(x0, V3MulV3(i2,new CVec3(C.y,C.y,C.y)));
    var x3 : CVec3 = V3SubV3(x0, new CVec3(D.y,D.y,D.y));

    // 해시
    i = Mod3(i);
    var p : CVec4 = new CVec4(i.z,i.z+i1.z,i.z+i2.z,i.z+1.0);
    p = Permute4(p);
    p = V4AddV4(p, new CVec4(i.y,i.y+i1.y,i.y+i2.y,i.y+1.0));
    p = Permute4(p);
    p = V4AddV4(p, new CVec4(i.x,i.x+i1.x,i.x+i2.x,i.x+1.0));
    p = Permute4(p);

    // 그라디언트
    var n_ : number = 0.142857142857;   // 1.0/7.0
    var ns : CVec3 = V3SubV3(V3MulFloat(new CVec3(D.w,D.y,D.z), n_), new CVec3(D.x,D.z,D.x));

    var j : CVec4 = V4SubV4(p, V4MulFloat(V4Floor(V4MulFloat(p, ns.z*ns.z)), 49.0));

    var x_ : CVec4 = V4Floor(V4MulFloat(j, ns.z));
    var y_ : CVec4 = V4Floor(V4SubV4(j, V4MulFloat(x_, 7.0)));

    var x : CVec4 = V4MulV4(V4MulFloat(x_, ns.x), new CVec4(ns.y,ns.y,ns.y,ns.y));
    var y : CVec4 = V4MulV4(V4MulFloat(y_, ns.x), new CVec4(ns.y,ns.y,ns.y,ns.y));
    var h : CVec4 = V4SubV4(V4SubV4(new CVec4(1.0,1.0,1.0,1.0),V4Abs(x)),V4Abs(y));

    var b0 : CVec4 = new CVec4(x.xy, y.xy);
    var b1 : CVec4 = new CVec4(new CVec2(x.z,x.w), new CVec2(y.z,y.w));

    var s0 : CVec4 = V4AddV4(V4MulFloat(V4Floor(b0),2.0),new CVec4(1.0,1.0,1.0,1.0));
    var s1 : CVec4 = V4AddV4(V4MulFloat(V4Floor(b1),2.0),new CVec4(1.0,1.0,1.0,1.0));
    var sh : CVec4 = V4MulFloat(V4Step(h, new CVec4(0.0,0.0,0.0,0.0)), -1.0);

    var a0 : CVec4 = V4AddV4(new CVec4(b0.x,b0.z,b0.y,b0.w),V4MulV4(new CVec4(s0.x,s0.z,s0.y,s0.w),new CVec4(sh.x,sh.x,sh.y,sh.y)));
    var a1 : CVec4 = V4AddV4(new CVec4(b1.x,b1.z,b1.y,b1.w),V4MulV4(new CVec4(s1.x,s1.z,s1.y,s1.w),new CVec4(sh.z,sh.z,sh.w,sh.w)));

    var p0 : CVec3 = new CVec3(a0.xy,h.x);
    var p1 : CVec3 = new CVec3(new CVec2(a0.z,a0.w),h.y);
    var p2 : CVec3 = new CVec3(a1.xy,h.z);
    var p3 : CVec3 = new CVec3(new CVec2(a1.z,a1.w),h.w);

    // taylor sqrt 사용한 normalize
    var norm : CVec4 = TaylorInvSqrt4(new CVec4(V3Dot(p0,p0),V3Dot(p1,p1),V3Dot(p2,p2),V3Dot(p3,p3)));
    p0 = V3MulFloat(p0, norm.x);
    p1 = V3MulFloat(p1, norm.y);
    p2 = V3MulFloat(p2, norm.z);
    p3 = V3MulFloat(p3, norm.w);

    // P에서의 노이즈 밸류 계산
    var m : CVec4 = V4Max(new CVec4(0.5 - V3Dot(x0, x0), 0.5 - V3Dot(x1, x1), 0.5 - V3Dot(x2,x2), 0.5 - V3Dot(x3,x3)), new CVec4(0.0, 0.0, 0.0, 0.0));
    m = V4MulV4(m, m);

    return 105.0 * V4Dot(V4MulV4(m, m), new CVec4(V3Dot(p0,x0), V3Dot(p1,x1), V3Dot(p2,x2), V3Dot(p3,x3)));
}

// Perlin 노이즈
// 심플렉스와 달리 정사각형 격자를 사용함
// 2D에서는 성능차이 적음
// 심플렉스 노이즈와 비교해서 둥글고 자연스러운 느낌 강함
export function NoisePerlin2(_p : CVec2) : number
{
    var Pi : CVec4 = V4AddV4(V4Floor(new CVec4(_p.xy,_p.xy)), new CVec4(0.0,0.0,1.0,1.0));
    var Pf : CVec4 = V4SubV4(V4Fract(new CVec4(_p.xy,_p.xy)), new CVec4(0.0,0.0,1.0,1.0));
    Pi = Mod4(Pi);
    var ix : CVec4 = new CVec4(Pi.x,Pi.z,Pi.x,Pi.z);
    var iy : CVec4 = new CVec4(Pi.y,Pi.y,Pi.w,Pi.w);
    var fx : CVec4 = new CVec4(Pf.x,Pf.z,Pf.x,Pf.z);
    var fy : CVec4 = new CVec4(Pf.y,Pf.y,Pf.w,Pf.w);

    var i : CVec4 = Permute4(V4AddV4(Permute4(ix), iy));

    var gx : CVec4 = V4SubV4(V4MulFloat(V4Fract(V4MulFloat(i, 1.0 / 41.0)), 2.0), new CVec4(1.0,1.0,1.0,1.0));
    var gy : CVec4 = V4SubV4(V4Abs(gx), new CVec4(0.5,0.5,0.5,0.5));
    var tx : CVec4 = V4Floor(V4AddV4(gx, new CVec4(0.5,0.5,0.5,0.5)));
    gx = V4SubV4(gx, tx);

    var g00 : CVec2 = new CVec2(gx.x, gy.x);
    var g10 : CVec2 = new CVec2(gx.y, gy.y);
    var g01 : CVec2 = new CVec2(gx.z, gy.z);
    var g11 : CVec2 = new CVec2(gx.w, gy.w);

    var norm : CVec4 = TaylorInvSqrt4(new CVec4(V2Dot(g00,g00),V2Dot(g01,g01),V2Dot(g10,g10),V2Dot(g11,g11)));

    var n00 : number = norm.x * V2Dot(g00, new CVec2(fx.x, fy.x));
    var n10 : number = norm.x * V2Dot(g10, new CVec2(fx.y, fy.y));
    var n01 : number = norm.x * V2Dot(g01, new CVec2(fx.z, fy.z));
    var n11 : number = norm.x * V2Dot(g11, new CVec2(fx.w, fy.w));

    var fade_xy : CVec2 = Fade2(Pf.xy);
    var n_x : CVec2 = V2Mix(new CVec2(n00, n01), new CVec2(n10, n11), fade_xy.x);
    var n_xy : number = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
}

// Voronoi 노이즈
// 조각난 파편 / 세포 조직같은 노이즈값을 리턴함
// 명확한 경계선이 있기 때문에 경계면을 만드는데 유효함
// F1(가장 가까운 거리), F2(두 번째로 가까운 거리)를 리턴함
// UVoronoi 형식을 F1 - F2로 만들수도 있고 구름같은 형태를 1 - F1으로 만들 수도 있음
function ModForVoronoi(_x : CVec4) : CVec4 {
    return V4SubV4(_x, V4MulFloat(V4Floor(V4MulFloat(_x, 1.0 / 7.0)), 7.0));
}
export function NoiseVoronoi3(_p : CVec3) : CVec2
{
    var K : number = 0.142857142857;    // 1.0/7.0
    var Ko : number = 0.428571428571;   // 1.0/2.0-K/2.0
    var K2 : number = 0.020408163265306;// 1.0/(7.0*7.0)
    var Kz : number = 0.166666666667;   // 1.0/6.0
    var Kzo : number = 0.416666666667;  // 1.0/2.0-1.0/6.0*2.0
    var jitter : number = 0.8;          // 작을수록 f2 에러가 작아지지만 더 랜덤성이 낮은 노이즈가 나옴

    var Pi : CVec3 = Mod3(V3Floor(_p));
    var Pf : CVec3 = V3Fract(_p);

    var Pfx : CVec4 = V4AddV4(new CVec4(Pf.x,Pf.x,Pf.x,Pf.x),new CVec4(0.0,-1.0,0.0,-1.0));
    var Pfy : CVec4 = V4AddV4(new CVec4(Pf.y,Pf.y,Pf.y,Pf.y),new CVec4(0.0,0.0,-1.0,-1.0));
    
    var p : CVec4 = Permute4(V4AddV4(new CVec4(Pi.x,Pi.x,Pi.x,Pi.x),new CVec4(0.0,1.0,0.0,1.0)));
    p = Permute4(V4AddV4(p, new CVec4(Pi.y,Pi.y,Pi.y+1.0,Pi.y+1.0)));
    var p1 : CVec4 = Permute4(V4AddV4(p, new CVec4(Pi.z,Pi.z,Pi.z,Pi.z)));
    var p2 : CVec4 = Permute4(V4AddV4(p, new CVec4(Pi.z+1.0,Pi.z+1.0,Pi.z+1.0,Pi.z+1.0)));

    var ox1 : CVec4 = V4SubV4(V4Fract(V4MulFloat(p1, K)), new CVec4(Ko,Ko,Ko,Ko));
    var oy1 : CVec4 = V4SubV4(V4MulFloat(ModForVoronoi(V4Floor(V4MulFloat(p1, K))),K),new CVec4(Ko,Ko,Ko,Ko));
    var oz1 : CVec4 = V4SubV4(V4MulFloat(V4Floor(V4MulFloat(p1,K2)),Kz),new CVec4(Kzo,Kzo,Kzo,Kzo));
    
    var ox2 : CVec4 = V4SubV4(V4Fract(V4MulFloat(p2, K)), new CVec4(Ko,Ko,Ko,Ko));
    var oy2 : CVec4 = V4SubV4(V4MulFloat(ModForVoronoi(V4Floor(V4MulFloat(p2, K))),K),new CVec4(Ko,Ko,Ko,Ko));
    var oz2 : CVec4 = V4SubV4(V4MulFloat(V4Floor(V4MulFloat(p2,K2)),Kz),new CVec4(Kzo,Kzo,Kzo,Kzo));

    var dx1 : CVec4 = V4AddV4(Pfx, V4MulFloat(ox1, jitter));
    var dy1 : CVec4 = V4AddV4(Pfy, V4MulFloat(oy1, jitter));
    var dz1 : CVec4 = V4AddV4(new CVec4(Pf.z,Pf.z,Pf.z,Pf.z), V4MulFloat(oz1, jitter));

    var dx2 : CVec4 = V4AddV4(Pfx, V4MulFloat(ox2, jitter));
    var dy2 : CVec4 = V4AddV4(Pfy, V4MulFloat(oy2, jitter));
    var dz2 : CVec4 = V4AddV4(new CVec4(Pf.z,Pf.z,Pf.z,Pf.z), V4MulFloat(oz2, jitter));

    var d1 : CVec4 = V4AddV4(V4AddV4(V4MulV4(dx1,dx1), V4MulV4(dy1,dy1)), V4MulV4(dz1,dz1));
    var d2 : CVec4 = V4AddV4(V4AddV4(V4MulV4(dx2,dx2), V4MulV4(dy2,dy2)), V4MulV4(dz2,dz2));

    var d : CVec4 = V4Min(d1, d2);
    d2 = V4Max(d1, d2);
    d.xy = (d.x < d.y) ? d.xy : d.yz;
    d.xz = (d.x < d.z) ? d.xz : d.zx;
    d.xw = (d.x < d.w) ? d.xw : d.wx;
    d.yzw = V3Min(d.yzw, d2.yzw);
    d.y = min(d.y, d.z);
    d.y = min(d.y, d.w);
    d.y = min(d.y, d2.x);
    return d.xy;
}

// FBM
// 노이즈를 쌓아서 더 자연스럽고 풍성한 노이즈맵 생성 가능
// 구름, 연기같은 모양으로 보통 나옴
// vec4 리턴하는 이유는 텍스쳐와 혼용해서 사용하기 위함
export function NoiseValue3FBM(_p : CVec3) : number
{
    var a : number = 0.51749673;
    var c : number = 0.0;

    c += a * NoiseValue3(_p);
    _p = V3MulFloat(_p, 2.76434);
    a *= 0.5;

    c += a * NoiseValue3(_p);
    _p = V3MulFloat(_p, 2.76434);
    a *= 0.5;

    c += a * NoiseValue3(_p);
    _p = V3MulFloat(_p, 2.76434);
    a *= 0.5;

    c += a * NoiseValue3(_p);
    _p = V3MulFloat(_p, 2.76434);
    a *= 0.5;

    c += a * NoiseValue3(_p);

    return c;
}

export function NoiseValue3FBMRest(_p : CVec3, _baseNoise : number) : number
{
    var a : number = 0.51749673;
    var c : number = a * _baseNoise;

    _p = V3MulFloat(_p, 2.76434);
    a *= 0.5;

    c += a * NoiseValue3(_p);
    _p = V3MulFloat(_p, 2.76434);
    a *= 0.5;

    c += a * NoiseValue3(_p);
    _p = V3MulFloat(_p, 2.76434);
    a *= 0.5;

    c += a * NoiseValue3(_p);
    _p = V3MulFloat(_p, 2.76434);
    a *= 0.5;

    c += a * NoiseValue3(_p);

    return c;
}

export function NoiseValue2FBMWraping(_p : CVec2, _octaves : number, _time : number) : number
{
    var a : number = 0.51749673;
    var c : number = 0.0;
    
    for(var i = 0; i < FloatToInt(_octaves); i++) {
        var offset : number = NoiseSimplex2(V2AddV2(_p, new CVec2(_time, _time)));
        _p = V2AddV2(_p, V2MulFloat(new CVec2(offset, offset), 0.2));

        var n : number = 1.0 - Math.abs(NoiseSimplex2(_p));
        n = n* n;

        c += n * a;

        _p = V2MulFloat(_p, 2.76434);
        a *= 0.5;
    }

    return c;
}