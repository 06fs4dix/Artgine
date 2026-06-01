import { SDF } from "./SDF";
import { CVec2, CVec3, CVec4, CMat3, abs, floor, mix, mod, V2Mod, V2MulFloat, V2Floor, V3AddV3, V3Floor, V3Fract, V3MulFloat, V3MulV3, V3MulMat3Normal, V3Dot, V3SubV3, V3Step, V3Min, V3Max, V3Mod, V3Nor, V4MulV4, V4SubV4, V4AddV4, V4MulFloat, V4Floor, V4Abs, V4Step, V4Max, V4Dot, V4Mod, Hash13, Sam2DArrToV4, } from "./Shader";
export function NoiseValue3(_v) {
    var p = V3Floor(_v);
    var f = V3Fract(_v);
    f = V3MulV3(V3MulV3(f, f), new CVec3(3.0 - 2.0 * f.x, 3.0 - 2.0 * f.y, 3.0 - 2.0 * f.z));
    return mix(mix(mix(Hash13(V3AddV3(p, new CVec3(0, 0, 0))), Hash13(V3AddV3(p, new CVec3(1, 0, 0))), f.x), mix(Hash13(V3AddV3(p, new CVec3(0, 1, 0))), Hash13(V3AddV3(p, new CVec3(1, 1, 0))), f.x), f.y), mix(mix(Hash13(V3AddV3(p, new CVec3(0, 0, 1))), Hash13(V3AddV3(p, new CVec3(1, 0, 1))), f.x), mix(Hash13(V3AddV3(p, new CVec3(0, 1, 1))), Hash13(V3AddV3(p, new CVec3(1, 1, 1))), f.x), f.y), f.z);
}
function NoiseSimplex3(_v) {
    var C = new CVec2(1.0 / 6.0, 1.0 / 3.0);
    var D = new CVec4(0.0, 0.5, 1.0, 2.0);
    var dotVal = V3Dot(_v, new CVec3(C.y, C.y, C.y));
    var i = V3Floor(V3AddV3(_v, new CVec3(dotVal, dotVal, dotVal)));
    dotVal = V3Dot(i, new CVec3(C.x, C.x, C.x));
    var x0 = V3AddV3(V3SubV3(_v, i), new CVec3(dotVal, dotVal, dotVal));
    var g = V3Step(new CVec3(x0.y, x0.z, x0.x), x0.xyz);
    var l = V3SubV3(new CVec3(1.0, 1.0, 1.0), g);
    var i1 = V3Min(g.xyz, new CVec3(l.z, l.x, l.y));
    var i2 = V3Max(g.xyz, new CVec3(l.z, l.x, l.y));
    var x1 = V3AddV3(V3SubV3(x0, i1), new CVec3(C.x, C.x, C.x));
    var x2 = V3AddV3(V3SubV3(x0, i2), new CVec3(C.x * 2.0, C.x * 2.0, C.x * 2.0));
    var x3 = V3AddV3(V3SubV3(x0, new CVec3(1.0, 1.0, 1.0)), new CVec3(C.x * 3.0, C.x * 3.0, C.x * 3.0));
    i = V3Mod(i, 289.0);
    var p = new CVec4(i.z, i.z + i1.z, i.z + i2.z, i.z + 1.0);
    p = V4Mod(V4MulV4(V4AddV4(V4MulFloat(p, 34.0), new CVec4(1.0, 1.0, 1.0, 1.0)), p), 289.0);
    p = V4AddV4(p, new CVec4(i.y, i.y + i1.y, i.y + i2.y, i.y + 1.0));
    p = V4Mod(V4MulV4(V4AddV4(V4MulFloat(p, 34.0), new CVec4(1.0, 1.0, 1.0, 1.0)), p), 289.0);
    p = V4AddV4(p, new CVec4(i.x, i.x + i1.x, i.x + i2.x, i.x + 1.0));
    p = V4Mod(V4MulV4(V4AddV4(V4MulFloat(p, 34.0), new CVec4(1.0, 1.0, 1.0, 1.0)), p), 289.0);
    var n_ = 1.0 / 7.0;
    var ns = new CVec3(n_ * D.w - D.x, n_ * D.y - D.z, n_ * D.z - D.x);
    var j = V4SubV4(p, V4MulFloat(V4Floor(V4MulFloat(p, ns.z * ns.z)), 49.0));
    var x_ = V4Floor(V4MulFloat(j, ns.z));
    var y_ = V4Floor(V4SubV4(j, V4MulFloat(x_, 7.0)));
    var x = V4AddV4(V4MulFloat(x_, ns.x), new CVec4(ns.y, ns.y, ns.y, ns.y));
    var y = V4AddV4(V4MulFloat(y_, ns.x), new CVec4(ns.y, ns.y, ns.y, ns.y));
    var h = V4SubV4(V4SubV4(new CVec4(1.0, 1.0, 1.0, 1.0), V4Abs(x)), V4Abs(y));
    var b0 = new CVec4(x.xy, y.xy);
    var b1 = new CVec4(x.z, x.w, y.z, y.w);
    var s0 = V4AddV4(V4MulFloat(V4Floor(b0), 2.0), new CVec4(1.0, 1.0, 1.0, 1.0));
    var s1 = V4AddV4(V4MulFloat(V4Floor(b1), 2.0), new CVec4(1.0, 1.0, 1.0, 1.0));
    var sh = V4MulFloat(V4Step(h, new CVec4(0.0, 0.0, 0.0, 0.0)), -1.0);
    var a0 = V4AddV4(new CVec4(b0.x, b0.z, b0.y, b0.w), V4MulV4(new CVec4(s0.x, s0.z, s0.y, s0.w), new CVec4(sh.x, sh.x, sh.y, sh.y)));
    var a1 = V4AddV4(new CVec4(b1.x, b1.z, b1.y, b1.w), V4MulV4(new CVec4(s1.x, s1.z, s1.y, s1.w), new CVec4(sh.z, sh.z, sh.w, sh.w)));
    var p0 = new CVec3(a0.xy, h.x);
    var p1 = new CVec3(a0.z, a0.w, h.y);
    var p2 = new CVec3(a1.xy, h.z);
    var p3 = new CVec3(a1.z, a1.w, h.w);
    var norm = new CVec4(V3Dot(p0, p0), V3Dot(p1, p1), V3Dot(p2, p2), V3Dot(p3, p3));
    norm = V4SubV4(new CVec4(1.79284291400159, 1.79284291400159, 1.79284291400159, 1.79284291400159), V4MulFloat(norm, 0.85373472095314));
    p0 = V3MulFloat(p0, norm.x);
    p1 = V3MulFloat(p1, norm.y);
    p2 = V3MulFloat(p2, norm.z);
    p3 = V3MulFloat(p3, norm.w);
    var m = V4Max(new CVec4(0.6 - V3Dot(x0, x0), 0.6 - V3Dot(x1, x1), 0.6 - V3Dot(x2, x2), 0.6 - V3Dot(x3, x3)), new CVec4(0.0, 0.0, 0.0, 0.0));
    m = V4MulV4(m, m);
    m = V4MulV4(m, m);
    return 42.0 * V4Dot(m, new CVec4(V3Dot(p0, x0), V3Dot(p1, x1), V3Dot(p2, x2), V3Dot(p3, x3)));
}
export function SampleNoise(_uvw, _type) {
    var coord = new CVec3(V2Mod(V2MulFloat(_uvw.xy, 126.0), 126.0), mod(_uvw.z * 128.0, 128.0));
    coord.x = coord.x + 1.0;
    coord.y = coord.y + 1.0;
    var tileIndex = floor(coord.z / 4.0);
    var tileX = mod(tileIndex, 16.0);
    var tileY = floor(tileIndex / 16.0);
    var offX = tileX * 128.0 + coord.x;
    var offY = tileY * 128.0 + coord.y;
    var v4 = Sam2DArrToV4(new CVec3(1, offY, _type), offX);
    var zMod4 = mod(coord.z, 4.0);
    if (zMod4 < 0.5)
        return v4.x;
    else if (zMod4 < 1.5)
        return v4.y;
    else if (zMod4 < 2.5)
        return v4.z;
    else
        return v4.w;
}
export function SampleNoiseVec2(_uvw, _type) {
    var coord = new CVec3(V2Mod(V2MulFloat(_uvw.xy, 126.0), 126.0), mod(_uvw.z * 64.0, 64.0));
    coord.x = coord.x + 1.0;
    coord.y = coord.y + 1.0;
    var tileIndex = floor(coord.z / 2.0);
    var tileX = mod(tileIndex, 16.0);
    var tileY = floor(tileIndex / 16.0);
    var offX = tileX * 128.0 + coord.x;
    var offY = tileY * 128.0 + coord.y;
    var v4 = Sam2DArrToV4(new CVec3(1, offY, _type), offX);
    var zMod4 = mod(coord.z, 2.0);
    if (zMod4 < 0.5) {
        return new CVec2(v4.x, v4.y);
    }
    else {
        return new CVec2(v4.z, v4.w);
    }
}
function SampleNoiseLinear(_uvw, _type) {
    var coord = new CVec3(V2Mod(V2MulFloat(_uvw.xy, 126.0), 126.0), mod(_uvw.z * 96.0, 96.0));
    coord.x = coord.x + 1.0;
    coord.y = coord.y + 1.0;
    var tileIndex = floor(coord.z / 3.0);
    var tileX = mod(tileIndex, 16.0);
    var tileY = floor(tileIndex / 16.0);
    var offX = tileX * 128.0 + coord.x;
    var offY = tileY * 128.0 + coord.y;
    var v4 = Sam2DArrToV4(new CVec3(1, offY, _type), offX);
    var zMod4 = mod(coord.z, 3.0);
    if (zMod4 < 1.0)
        return mix(v4.x, v4.y, zMod4);
    else if (zMod4 < 2.0)
        return mix(v4.y, v4.z, zMod4 - 1.0);
    else
        return mix(v4.z, v4.w, zMod4 - 2.0);
}
export function NoiseNormalGet(_uvw, _type) {
    if (_type > SDF.eNoise.PerlinNormal - 0.5) {
        var noise = SampleNoiseVec2(_uvw, SDF.eNoise.PerlinNormal);
        return V3Nor(new CVec3(noise.x * 2.0 - 1.0, 1.0, noise.y * 2.0 - 1.0));
    }
    return new CVec3(0.0, 1.0, 0.0);
}
export function NoiseGet(_uvw, _type) {
    if (_type > SDF.eNoise.Simplex - 0.5) {
        return NoiseSimplex3(new CVec3(_uvw.x * 128.0, _uvw.y * 128.0, _uvw.z * 128.0));
    }
    else if (_type > SDF.eNoise.Gaussian - 0.5) {
        return NoiseValue3(new CVec3(_uvw.x * 128.0, _uvw.y * 128.0, _uvw.z * 128.0));
    }
    else if (_type > SDF.eNoise.PerlinFBM - 0.5) {
        var matVec1 = new CVec3(0.0, 0.8, 0.6);
        var matVec2 = new CVec3(-0.8, 0.36, -0.48);
        var matVec3 = new CVec3(-0.6, -0.48, 0.64);
        var mat = new CMat3(matVec1, matVec2, matVec3);
        var fbm = 0.0;
        fbm += 0.500 * SampleNoise(_uvw, SDF.eNoise.Perlin);
        _uvw = V3MulFloat(V3MulMat3Normal(_uvw, mat), 2.76434);
        fbm += 0.250 * SampleNoise(_uvw, SDF.eNoise.Perlin);
        _uvw = V3MulFloat(V3MulMat3Normal(_uvw, mat), 2.76434);
        fbm += 0.125 * SampleNoise(_uvw, SDF.eNoise.Perlin);
        return fbm;
    }
    else if (_type > SDF.eNoise.PerlinDomainWarp - 0.5) {
        var uvw = _uvw;
        var qx = SampleNoise(uvw, SDF.eNoise.Perlin);
        uvw = V3AddV3(_uvw, new CVec3(5.2, 1.3, 0.1));
        var qy = SampleNoise(uvw, SDF.eNoise.Perlin);
        uvw = V3AddV3(_uvw, new CVec3(3.1, 9.2, 5.5));
        var qz = SampleNoise(uvw, SDF.eNoise.Perlin);
        uvw = V3AddV3(_uvw, V3MulFloat(new CVec3(qx, qy, qz), 0.2));
        return SampleNoise(uvw, SDF.eNoise.Perlin);
    }
    else if (_type > SDF.eNoise.PerlinRidged - 0.5) {
        return 1.0 - abs(SampleNoise(_uvw, SDF.eNoise.Perlin) * 2.0 - 1.0);
    }
    else if (_type > SDF.eNoise.PerlinBillow - 0.5) {
        return abs(SampleNoise(_uvw, SDF.eNoise.Perlin) * 2.0 - 1.0);
    }
    else if (_type > SDF.eNoise.Blue - 0.5) {
        var coord = V2Floor(V2Mod(_uvw.xy, 64.0));
        var index = coord.y * 64.0 + coord.x;
        var modIndex = mod(index, 2048.0);
        var v4 = Sam2DArrToV4(new CVec3(1, 0.0, SDF.eNoise.Blue), modIndex);
        return index < 2048.0 ? v4.x : v4.y;
    }
    else if (_type > SDF.eNoise.PerlinFBM3 - 0.5) {
        return SampleNoiseLinear(_uvw, SDF.eNoise.PerlinFBM3);
    }
    else if (_type > SDF.eNoise.PerlinNormal - 0.5) {
        return SampleNoise(_uvw, SDF.eNoise.PerlinNormal);
    }
    else {
        return SampleNoise(_uvw, SDF.eNoise.Perlin);
    }
}
