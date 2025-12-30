import { CMat, CVec2, CVec3, CVec4, FloatToInt, floor, Hash13, min, mix, V2AddV2, V2Dot, V2Floor, V2Mix, V2Mod, V2MulFloat, V2MulV2, V2SubV2, V3Abs, V3AddV3, V3Dot, V3Floor, V3Fract, V3Max, V3Min, V3MulFloat, V3MulV3, V3Step, V3SubV3, V4Abs, V4AddV4, V4Dot, V4Floor, V4Fract, V4Max, V4Min, V4MulFloat, V4MulV4, V4Step, V4SubV4 } from "./Shader";
function Mod1(_x) {
    return _x - floor(_x / 289.0) * 289.0;
}
function Mod2(_x) {
    return V2SubV2(_x, V2MulFloat(V2Floor(V2MulFloat(_x, 1.0 / 289.0)), 289.0));
}
function Mod3(_x) {
    return V3SubV3(_x, V3MulFloat(V3Floor(V3MulFloat(_x, 1.0 / 289.0)), 289.0));
}
function Mod4(_x) {
    return V4SubV4(_x, V4MulFloat(V4Floor(V4MulFloat(_x, 1.0 / 289.0)), 289.0));
}
function Permute1(_x) {
    return Mod1((_x * 34.0 + 10.0) * _x);
}
function Permute2(_x) {
    return Mod2(V2MulV2(V2AddV2(V2MulFloat(_x, 34.0), new CVec2(10.0, 10.0)), _x));
}
function Permute3(_x) {
    return Mod3(V3MulV3(V3AddV3(V3MulFloat(_x, 34.0), new CVec3(10.0, 10.0, 10.0)), _x));
}
function Permute4(_x) {
    return Mod4(V4MulV4(V4AddV4(V4MulFloat(_x, 34.0), new CVec4(10.0, 10.0, 10.0, 10.0)), _x));
}
function TaylorInvSqrt1(_r) {
    return 1.79284291400159 - 0.85373472095314 * _r;
}
function TaylorInvSqrt2(_r) {
    return V2SubV2(new CVec2(1.79284291400159, 1.79284291400159), V2MulFloat(_r, 0.85373472095314));
}
function TaylorInvSqrt3(_r) {
    return V3SubV3(new CVec3(1.79284291400159, 1.79284291400159, 1.79284291400159), V3MulFloat(_r, 0.85373472095314));
}
function TaylorInvSqrt4(_r) {
    return V4SubV4(new CVec4(1.79284291400159, 1.79284291400159, 1.79284291400159, 1.79284291400159), V4MulFloat(_r, 0.85373472095314));
}
function Fade2(_t) {
    return V2MulV2(_t, V2MulV2(_t, V2MulV2(_t, V2AddV2(V2MulV2(_t, V2SubV2(V2MulFloat(_t, 6.0), new CVec2(15.0, 15.0))), new CVec2(10.0, 10.0)))));
}
export function BayerFilter(_uv) {
    var uv = V2Mod(_uv.xy, 4.0);
    var f = 0.0625;
    var bayerMat = new CMat(0.0 * f, 12.0 * f, 3.0 * f, 15.0 * f, 8.0 * f, 4.0 * f, 11.0 * f, 7.0 * f, 2.0 * f, 14.0 * f, 1.0 * f, 13.0 * f, 10.0 * f, 6.0 * f, 9.0 * f, 5.0 * f);
    return bayerMat[FloatToInt(uv.x)][FloatToInt(uv.y)];
}
export function NoiseValue3(_v) {
    var p = V3Floor(_v);
    var f = V3Fract(_v);
    f = V3MulV3(V3MulV3(f, f), new CVec3(3.0 - 2.0 * f.x, 3.0 - 2.0 * f.y, 3.0 - 2.0 * f.z));
    return mix(mix(mix(Hash13(V3AddV3(p, new CVec3(0, 0, 0))), Hash13(V3AddV3(p, new CVec3(1, 0, 0))), f.x), mix(Hash13(V3AddV3(p, new CVec3(0, 1, 0))), Hash13(V3AddV3(p, new CVec3(1, 1, 0))), f.x), f.y), mix(mix(Hash13(V3AddV3(p, new CVec3(0, 0, 1))), Hash13(V3AddV3(p, new CVec3(1, 0, 1))), f.x), mix(Hash13(V3AddV3(p, new CVec3(0, 1, 1))), Hash13(V3AddV3(p, new CVec3(1, 1, 1))), f.x), f.y), f.z);
}
export function NoiseSimplex2(_v) {
    var C = new CVec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    var dotVal;
    dotVal = V2Dot(_v, new CVec2(C.y, C.y));
    var i = V2Floor(V2AddV2(_v, new CVec2(dotVal, dotVal)));
    dotVal = V2Dot(_v, new CVec2(C.x, C.x));
    var x0 = V2AddV2(V2SubV2(_v, i), new CVec2(dotVal, dotVal));
    var i1;
    i1 = (x0.x > x0.y) ? new CVec2(1.0, 0.0) : new CVec2(0.0, 1.0);
    var x12 = V4AddV4(new CVec4(x0.x, x0.y, x0.x, x0.y), new CVec4(C.x, C.x, C.z, C.z));
    x12.xy = V2SubV2(x12.xy, i1);
    i = Mod2(i);
    var p = V3AddV3(Permute3(Permute3(new CVec3(i.y, i.y + i1.y, i.y + 1.0))), new CVec3(i.x, i.x + i1.x, i.x + 1.0));
    var m = V3Max(new CVec3(0.5 - V2Dot(x0, x0), 0.5 - V2Dot(x12.xy, x12.xy), 0.5 - V2Dot(new CVec2(x12.z, x12.w), new CVec2(x12.z, x12.w))), new CVec3(0.0, 0.0, 0.0));
    m = V3MulV3(m, m);
    m = V3MulV3(m, m);
    var x = V3SubV3(V3MulFloat(V3Fract(V3MulV3(p, new CVec3(C.w, C.w, C.w))), 2.0), new CVec3(1.0, 1.0, 1.0));
    var h = V3SubV3(V3Abs(x), new CVec3(0.5, 0.5, 0.5));
    var ox = V3Floor(V3AddV3(x, new CVec3(0.5, 0.5, 0.5)));
    var a0 = V3SubV3(x, ox);
    m = V3MulV3(m, TaylorInvSqrt3(V3AddV3(V3MulV3(a0, a0), V3MulV3(h, h))));
    var g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.y = a0.y * x12.x + h.y * x12.y;
    g.z = a0.z * x12.z + h.z * x12.w;
    return 130.0 * V3Dot(m, g);
}
export function NoiseSimplex3(_v) {
    var C = new CVec2(1.0 / 6.0, 1.0 / 3.0);
    var D = new CVec4(0.0, 0.5, 1.0, 2.0);
    var dotVal;
    dotVal = V3Dot(_v, new CVec3(C.y, C.y, C.y));
    var i = V3Floor(V3AddV3(_v, new CVec3(dotVal, dotVal, dotVal)));
    dotVal = V3Dot(i, new CVec3(C.x, C.x, C.x));
    var x0 = V3AddV3(V3SubV3(_v, i), new CVec3(dotVal, dotVal, dotVal));
    var g = V3Step(new CVec3(x0.y, x0.z, x0.x), x0.xyz);
    var l = V3SubV3(new CVec3(1.0, 1.0, 1.0), g);
    var i1 = V3Min(g.xyz, new CVec3(l.z, l.x, l.y));
    var i2 = V3Max(g.xyz, new CVec3(l.z, l.x, l.y));
    var x1 = V3SubV3(x0, V3MulV3(i1, new CVec3(C.x, C.x, C.x)));
    var x2 = V3SubV3(x0, V3MulV3(i2, new CVec3(C.y, C.y, C.y)));
    var x3 = V3SubV3(x0, new CVec3(D.y, D.y, D.y));
    i = Mod3(i);
    var p = new CVec4(i.z, i.z + i1.z, i.z + i2.z, i.z + 1.0);
    p = Permute4(p);
    p = V4AddV4(p, new CVec4(i.y, i.y + i1.y, i.y + i2.y, i.y + 1.0));
    p = Permute4(p);
    p = V4AddV4(p, new CVec4(i.x, i.x + i1.x, i.x + i2.x, i.x + 1.0));
    p = Permute4(p);
    var n_ = 0.142857142857;
    var ns = V3SubV3(V3MulFloat(new CVec3(D.w, D.y, D.z), n_), new CVec3(D.x, D.z, D.x));
    var j = V4SubV4(p, V4MulFloat(V4Floor(V4MulFloat(p, ns.z * ns.z)), 49.0));
    var x_ = V4Floor(V4MulFloat(j, ns.z));
    var y_ = V4Floor(V4SubV4(j, V4MulFloat(x_, 7.0)));
    var x = V4MulV4(V4MulFloat(x_, ns.x), new CVec4(ns.y, ns.y, ns.y, ns.y));
    var y = V4MulV4(V4MulFloat(y_, ns.x), new CVec4(ns.y, ns.y, ns.y, ns.y));
    var h = V4SubV4(V4SubV4(new CVec4(1.0, 1.0, 1.0, 1.0), V4Abs(x)), V4Abs(y));
    var b0 = new CVec4(x.xy, y.xy);
    var b1 = new CVec4(new CVec2(x.z, x.w), new CVec2(y.z, y.w));
    var s0 = V4AddV4(V4MulFloat(V4Floor(b0), 2.0), new CVec4(1.0, 1.0, 1.0, 1.0));
    var s1 = V4AddV4(V4MulFloat(V4Floor(b1), 2.0), new CVec4(1.0, 1.0, 1.0, 1.0));
    var sh = V4MulFloat(V4Step(h, new CVec4(0.0, 0.0, 0.0, 0.0)), -1.0);
    var a0 = V4AddV4(new CVec4(b0.x, b0.z, b0.y, b0.w), V4MulV4(new CVec4(s0.x, s0.z, s0.y, s0.w), new CVec4(sh.x, sh.x, sh.y, sh.y)));
    var a1 = V4AddV4(new CVec4(b1.x, b1.z, b1.y, b1.w), V4MulV4(new CVec4(s1.x, s1.z, s1.y, s1.w), new CVec4(sh.z, sh.z, sh.w, sh.w)));
    var p0 = new CVec3(a0.xy, h.x);
    var p1 = new CVec3(new CVec2(a0.z, a0.w), h.y);
    var p2 = new CVec3(a1.xy, h.z);
    var p3 = new CVec3(new CVec2(a1.z, a1.w), h.w);
    var norm = TaylorInvSqrt4(new CVec4(V3Dot(p0, p0), V3Dot(p1, p1), V3Dot(p2, p2), V3Dot(p3, p3)));
    p0 = V3MulFloat(p0, norm.x);
    p1 = V3MulFloat(p1, norm.y);
    p2 = V3MulFloat(p2, norm.z);
    p3 = V3MulFloat(p3, norm.w);
    var m = V4Max(new CVec4(0.5 - V3Dot(x0, x0), 0.5 - V3Dot(x1, x1), 0.5 - V3Dot(x2, x2), 0.5 - V3Dot(x3, x3)), new CVec4(0.0, 0.0, 0.0, 0.0));
    m = V4MulV4(m, m);
    return 105.0 * V4Dot(V4MulV4(m, m), new CVec4(V3Dot(p0, x0), V3Dot(p1, x1), V3Dot(p2, x2), V3Dot(p3, x3)));
}
export function NoisePerlin2(_p) {
    var Pi = V4AddV4(V4Floor(new CVec4(_p.xy, _p.xy)), new CVec4(0.0, 0.0, 1.0, 1.0));
    var Pf = V4SubV4(V4Fract(new CVec4(_p.xy, _p.xy)), new CVec4(0.0, 0.0, 1.0, 1.0));
    Pi = Mod4(Pi);
    var ix = new CVec4(Pi.x, Pi.z, Pi.x, Pi.z);
    var iy = new CVec4(Pi.y, Pi.y, Pi.w, Pi.w);
    var fx = new CVec4(Pf.x, Pf.z, Pf.x, Pf.z);
    var fy = new CVec4(Pf.y, Pf.y, Pf.w, Pf.w);
    var i = Permute4(V4AddV4(Permute4(ix), iy));
    var gx = V4SubV4(V4MulFloat(V4Fract(V4MulFloat(i, 1.0 / 41.0)), 2.0), new CVec4(1.0, 1.0, 1.0, 1.0));
    var gy = V4SubV4(V4Abs(gx), new CVec4(0.5, 0.5, 0.5, 0.5));
    var tx = V4Floor(V4AddV4(gx, new CVec4(0.5, 0.5, 0.5, 0.5)));
    gx = V4SubV4(gx, tx);
    var g00 = new CVec2(gx.x, gy.x);
    var g10 = new CVec2(gx.y, gy.y);
    var g01 = new CVec2(gx.z, gy.z);
    var g11 = new CVec2(gx.w, gy.w);
    var norm = TaylorInvSqrt4(new CVec4(V2Dot(g00, g00), V2Dot(g01, g01), V2Dot(g10, g10), V2Dot(g11, g11)));
    var n00 = norm.x * V2Dot(g00, new CVec2(fx.x, fy.x));
    var n10 = norm.x * V2Dot(g10, new CVec2(fx.y, fy.y));
    var n01 = norm.x * V2Dot(g01, new CVec2(fx.z, fy.z));
    var n11 = norm.x * V2Dot(g11, new CVec2(fx.w, fy.w));
    var fade_xy = Fade2(Pf.xy);
    var n_x = V2Mix(new CVec2(n00, n01), new CVec2(n10, n11), fade_xy.x);
    var n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
}
function ModForVoronoi(_x) {
    return V4SubV4(_x, V4MulFloat(V4Floor(V4MulFloat(_x, 1.0 / 7.0)), 7.0));
}
export function NoiseVoronoi3(_p) {
    var K = 0.142857142857;
    var Ko = 0.428571428571;
    var K2 = 0.020408163265306;
    var Kz = 0.166666666667;
    var Kzo = 0.416666666667;
    var jitter = 0.8;
    var Pi = Mod3(V3Floor(_p));
    var Pf = V3Fract(_p);
    var Pfx = V4AddV4(new CVec4(Pf.x, Pf.x, Pf.x, Pf.x), new CVec4(0.0, -1.0, 0.0, -1.0));
    var Pfy = V4AddV4(new CVec4(Pf.y, Pf.y, Pf.y, Pf.y), new CVec4(0.0, 0.0, -1.0, -1.0));
    var p = Permute4(V4AddV4(new CVec4(Pi.x, Pi.x, Pi.x, Pi.x), new CVec4(0.0, 1.0, 0.0, 1.0)));
    p = Permute4(V4AddV4(p, new CVec4(Pi.y, Pi.y, Pi.y + 1.0, Pi.y + 1.0)));
    var p1 = Permute4(V4AddV4(p, new CVec4(Pi.z, Pi.z, Pi.z, Pi.z)));
    var p2 = Permute4(V4AddV4(p, new CVec4(Pi.z + 1.0, Pi.z + 1.0, Pi.z + 1.0, Pi.z + 1.0)));
    var ox1 = V4SubV4(V4Fract(V4MulFloat(p1, K)), new CVec4(Ko, Ko, Ko, Ko));
    var oy1 = V4SubV4(V4MulFloat(ModForVoronoi(V4Floor(V4MulFloat(p1, K))), K), new CVec4(Ko, Ko, Ko, Ko));
    var oz1 = V4SubV4(V4MulFloat(V4Floor(V4MulFloat(p1, K2)), Kz), new CVec4(Kzo, Kzo, Kzo, Kzo));
    var ox2 = V4SubV4(V4Fract(V4MulFloat(p2, K)), new CVec4(Ko, Ko, Ko, Ko));
    var oy2 = V4SubV4(V4MulFloat(ModForVoronoi(V4Floor(V4MulFloat(p2, K))), K), new CVec4(Ko, Ko, Ko, Ko));
    var oz2 = V4SubV4(V4MulFloat(V4Floor(V4MulFloat(p2, K2)), Kz), new CVec4(Kzo, Kzo, Kzo, Kzo));
    var dx1 = V4AddV4(Pfx, V4MulFloat(ox1, jitter));
    var dy1 = V4AddV4(Pfy, V4MulFloat(oy1, jitter));
    var dz1 = V4AddV4(new CVec4(Pf.z, Pf.z, Pf.z, Pf.z), V4MulFloat(oz1, jitter));
    var dx2 = V4AddV4(Pfx, V4MulFloat(ox2, jitter));
    var dy2 = V4AddV4(Pfy, V4MulFloat(oy2, jitter));
    var dz2 = V4AddV4(new CVec4(Pf.z, Pf.z, Pf.z, Pf.z), V4MulFloat(oz2, jitter));
    var d1 = V4AddV4(V4AddV4(V4MulV4(dx1, dx1), V4MulV4(dy1, dy1)), V4MulV4(dz1, dz1));
    var d2 = V4AddV4(V4AddV4(V4MulV4(dx2, dx2), V4MulV4(dy2, dy2)), V4MulV4(dz2, dz2));
    var d = V4Min(d1, d2);
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
export function NoiseValue3FBM(_p) {
    var a = 0.51749673;
    var c = 0.0;
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
export function NoiseValue3FBMRest(_p, _baseNoise) {
    var a = 0.51749673;
    var c = a * _baseNoise;
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
export function NoiseValue2FBMWraping(_p, _octaves, _time) {
    var a = 0.51749673;
    var c = 0.0;
    for (var i = 0; i < FloatToInt(_octaves); i++) {
        var offset = NoiseSimplex2(V2AddV2(_p, new CVec2(_time, _time)));
        _p = V2AddV2(_p, V2MulFloat(new CVec2(offset, offset), 0.2));
        var n = 1.0 - Math.abs(NoiseSimplex2(_p));
        n = n * n;
        c += n * a;
        _p = V2MulFloat(_p, 2.76434);
        a *= 0.5;
    }
    return c;
}
