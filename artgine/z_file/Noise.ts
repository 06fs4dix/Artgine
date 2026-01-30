import { SDF } from "./SDF";
import { 
    CMat, CVec2, CVec3, CVec4, CMat3,
    abs, floor, mix, mod,
    V2Mod,
    V3AddV3, V3Floor, V3Fract, V3MulFloat, V3MulV3, V3MulMat3Normal, V3Dot, V3SubV3, V3Step, V3Min, V3Max, V3Mod,
    V4MulV4, V4SubV4, V4AddV4, V4MulFloat, V4Floor, V4Abs, V4Step, V4Max, V4Dot, V4Mod,
    Sam2DToV4, FloatToInt,
    Hash13,
} from "./Shader";

// 디더링용 베이어 필터
export function BayerFilter(_coord : CVec2) : number
{
    var uv : CVec2 = V2Mod(_coord.xy, 4.0);
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

function NoiseSimplex3(_v : CVec3) : number
{ 
    var C : CVec2 = new CVec2(1.0/6.0, 1.0/3.0);
    var D : CVec4 = new CVec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    var dotVal : number = V3Dot(_v, new CVec3(C.y, C.y, C.y));
    var i : CVec3 = V3Floor(V3AddV3(_v, new CVec3(dotVal, dotVal, dotVal)));
    dotVal = V3Dot(i, new CVec3(C.x, C.x, C.x));
    var x0 : CVec3 = V3AddV3(V3SubV3(_v, i), new CVec3(dotVal, dotVal, dotVal));

    // Other corners
    var g : CVec3 = V3Step(new CVec3(x0.y, x0.z, x0.x), x0.xyz);
    var l : CVec3 = V3SubV3(new CVec3(1.0,1.0,1.0), g);
    var i1 : CVec3 = V3Min( g.xyz, new CVec3(l.z,l.x,l.y));
    var i2 : CVec3 = V3Max( g.xyz, new CVec3(l.z,l.x,l.y));

    //  x0 = x0 - 0. + 0.0 * C 
    var x1 : CVec3 = V3AddV3(V3SubV3(x0, i1), new CVec3(C.x,C.x,C.x));
    var x2 : CVec3 = V3AddV3(V3SubV3(x0, i2), new CVec3(C.x*2.0,C.x*2.0,C.x*2.0));
    var x3 : CVec3 = V3AddV3(V3SubV3(x0, new CVec3(1.0,1.0,1.0)), new CVec3(C.x*3.0,C.x*3.0,C.x*3.0));

    // Permutations
    i = V3Mod(i, 289.0); 
    var p : CVec4 = new CVec4(i.z, i.z+i1.z, i.z+i2.z, i.z+1.0);
    p = V4Mod(V4MulV4(V4AddV4(V4MulFloat(p, 34.0), new CVec4(1.0,1.0,1.0,1.0)),p), 289.0);
    p = V4AddV4(p, new CVec4(i.y, i.y+i1.y, i.y+i2.y, i.y+1.0));
    p = V4Mod(V4MulV4(V4AddV4(V4MulFloat(p, 34.0), new CVec4(1.0,1.0,1.0,1.0)),p), 289.0);
    p = V4AddV4(p, new CVec4(i.x, i.x+i1.x, i.x+i2.x, i.x+1.0));
    p = V4Mod(V4MulV4(V4AddV4(V4MulFloat(p, 34.0), new CVec4(1.0,1.0,1.0,1.0)),p), 289.0);

    // Gradients
    // ( N*N points uniformly over a square, mapped onto an octahedron.)
    var n_ : number = 1.0/7.0; // N=7
    var ns : CVec3 = new CVec3(n_*D.w-D.x, n_*D.y-D.z, n_*D.z-D.x);

    var j : CVec4 = V4SubV4(p, V4MulFloat(V4Floor(V4MulFloat(p, ns.z *ns.z)), 49.0));  //  mod(p,N*N)

    var x_ : CVec4 = V4Floor(V4MulFloat(j, ns.z));
    var y_ : CVec4 = V4Floor(V4SubV4(j, V4MulFloat(x_, 7.0)));    // mod(j,N)

    var x : CVec4 = V4AddV4(V4MulFloat(x_, ns.x), new CVec4(ns.y,ns.y,ns.y,ns.y));
    var y : CVec4 = V4AddV4(V4MulFloat(y_, ns.x), new CVec4(ns.y,ns.y,ns.y,ns.y));
    var h : CVec4 = V4SubV4(V4SubV4(new CVec4(1.0,1.0,1.0,1.0), V4Abs(x)), V4Abs(y));

    var b0 : CVec4 = new CVec4( x.xy, y.xy );
    var b1 : CVec4 = new CVec4( x.z, x.w, y.z, y.w );

    var s0 : CVec4 = V4AddV4(V4MulFloat(V4Floor(b0), 2.0), new CVec4(1.0,1.0,1.0,1.0));
    var s1 : CVec4 = V4AddV4(V4MulFloat(V4Floor(b1), 2.0), new CVec4(1.0,1.0,1.0,1.0));
    var sh : CVec4 = V4MulFloat(V4Step(h, new CVec4(0.0,0.0,0.0,0.0)),-1.0);

    var a0 : CVec4 = V4AddV4(new CVec4(b0.x, b0.z, b0.y, b0.w), V4MulV4(new CVec4(s0.x, s0.z, s0.y, s0.w), new CVec4(sh.x, sh.x, sh.y, sh.y)));
    var a1 : CVec4 = V4AddV4(new CVec4(b1.x, b1.z, b1.y, b1.w), V4MulV4(new CVec4(s1.x, s1.z, s1.y, s1.w), new CVec4(sh.z, sh.z, sh.w, sh.w)));

    var p0 : CVec3 = new CVec3(a0.xy,h.x);
    var p1 : CVec3 = new CVec3(a0.z, a0.w,h.y);
    var p2 : CVec3 = new CVec3(a1.xy,h.z);
    var p3 : CVec3 = new CVec3(a1.z, a1.w,h.w);

    //Normalise gradients
    var norm : CVec4 = new CVec4(V3Dot(p0,p0), V3Dot(p1,p1), V3Dot(p2, p2), V3Dot(p3,p3));
    norm = V4SubV4(new CVec4(1.79284291400159,1.79284291400159,1.79284291400159,1.79284291400159), V4MulFloat(norm, 0.85373472095314));
    p0 = V3MulFloat(p0, norm.x);
    p1 = V3MulFloat(p1, norm.y);
    p2 = V3MulFloat(p2, norm.z);
    p3 = V3MulFloat(p3, norm.w);

    // Mix final noise value
    var m : CVec4 = V4Max(new CVec4(0.6 - V3Dot(x0,x0), 0.6 - V3Dot(x1,x1), 0.6 - V3Dot(x2,x2), 0.6 - V3Dot(x3,x3)), new CVec4(0.0,0.0,0.0,0.0));
    m = V4MulV4(m, m);
    m = V4MulV4(m, m);
    return 42.0 * V4Dot( m, new CVec4( V3Dot(p0,x0), V3Dot(p1,x1), V3Dot(p2,x2), V3Dot(p3,x3) ) );
}

function SampleNoise(_uvw : CVec3, _type : number) : number
{
    var size : number = 128.0;
    var coord : CVec3 = V3Mod(V3MulFloat(_uvw, size), size);
    var i0 : CVec3 = V3Floor(coord);
    
    var offX : number = i0.x + mod(i0.y, 16.0) * 128.0;
    var offY : number = floor(i0.y / 16.0) + floor(i0.z / 4.0) * 8.0;
    var v4 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY), offX);
    var zMod4 : number = mod(i0.z, 4.0);

    return zMod4 < 0.5 ? v4.x : (zMod4 < 1.5 ? v4.y : (zMod4 < 2.5 ? v4.z : v4.w));
}
// function SampleNoiseLinear(_uvw : CVec3, _type : number) : number
// {
//     var size : number = 128.0;
//     var coord : CVec3 = V3Mod(V3MulFloat(_uvw, size), size);
//     var i0 : CVec3 = V3Floor(coord);

//     // tri-linear 방식
//     var f : CVec3 = V3SubV3(coord, i0);
//     var i1 : CVec3 = V3Mod(V3AddV3(i0, new CVec3(1.0, 1.0, 1.0)), 128.0);
//     var zMod4_0 : number = mod(i0.z, 4.0);

//     // 하단 샘플 1
//     var offX_000 : number = i0.x + mod(i0.y, 16.0) * 128.0;
//     var offY_000 : number = floor(i0.y / 16.0) + floor(i0.z / 4.0) * 8.0;
//     var v4_000 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY_000), offX_000);
//     var sample_000 : number = zMod4_0 < 0.5 ? v4_000.x : (zMod4_0 < 1.5 ? v4_000.y : (zMod4_0 < 2.5 ? v4_000.z : v4_000.w));

//     // 하단 샘플 2
//     var offX_100 : number = i1.x + mod(i0.y, 16.0) * 128.0;
//     var offY_100 : number = floor(i0.y / 16.0) + floor(i0.z / 4.0) * 8.0;
//     var v4_100 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY_100), offX_100);
//     var sample_100 : number = zMod4_0 < 0.5 ? v4_100.x : (zMod4_0 < 1.5 ? v4_100.y : (zMod4_0 < 2.5 ? v4_100.z : v4_100.w));

//     // 하단 샘플 3
//     var offX_010 : number = i0.x + mod(i1.y, 16.0) * 128.0;
//     var offY_010 : number = floor(i1.y / 16.0) + floor(i0.z / 4.0) * 8.0;
//     var v4_010 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY_010), offX_010);
//     var sample_010 : number = zMod4_0 < 0.5 ? v4_010.x : (zMod4_0 < 1.5 ? v4_010.y : (zMod4_0 < 2.5 ? v4_010.z : v4_010.w));

//     // 하단 샘플 4
//     var offX_110 : number = i1.x + mod(i1.y, 16.0) * 128.0;
//     var offY_110 : number = floor(i1.y / 16.0) + floor(i0.z / 4.0) * 8.0;
//     var v4_110 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY_110), offX_110);
//     var sample_110 : number = zMod4_0 < 0.5 ? v4_110.x : (zMod4_0 < 1.5 ? v4_110.y : (zMod4_0 < 2.5 ? v4_110.z : v4_110.w));

//     // 하단 샘플
//     var sample_00 : number = mix(sample_000, sample_100, f.x);
//     var sample_10 : number = mix(sample_010, sample_110, f.x);
//     var sample_0 : number = mix(sample_00, sample_10, f.y);

//     var sample_001 : number;
//     var sample_101 : number;
//     var sample_011 : number;
//     var sample_111 : number;

//     if(zMod4_0 > 2.5) {
//         // 상하단 샘플이 다른 픽셀에 들어있음
        
//         // 상단 샘플 1
//         var offX_001 : number = i0.x + mod(i0.y, 16.0) * 128.0;
//         var offY_001 : number = floor(i0.y / 16.0) + floor(i1.z / 4.0) * 8.0;
//         var v4_001 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY_001), offX_001);
//         sample_001 = v4_001.x;

//         // 상단 샘플 2
//         var offX_101 : number = i1.x + mod(i0.y, 16.0) * 128.0;
//         var offY_101 : number = floor(i0.y / 16.0) + floor(i1.z / 4.0) * 8.0;
//         var v4_101 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY_101), offX_101);
//         sample_101 = v4_101.x;

//         // 상단 샘플 3
//         var offX_011 : number = i0.x + mod(i1.y, 16.0) * 128.0;
//         var offY_011 : number = floor(i1.y / 16.0) + floor(i1.z / 4.0) * 8.0;
//         var v4_011 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY_011), offX_011);
//         sample_011 = v4_011.x;
        
//         // 상단 샘플 4
//         var offX_111 : number = i1.x + mod(i1.y, 16.0) * 128.0;
//         var offY_111 : number = floor(i1.y / 16.0) + floor(i1.z / 4.0) * 8.0;
//         var v4_111 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY_111), offX_111);
//         sample_111 = v4_111.x;
//     }
//     else {
//         // 상하단 샘플이 같은 픽셀에 들어있음
//         // 상단 샘플 1
//         sample_001 = zMod4_0 < 0.5 ? v4_000.y : (zMod4_0 < 1.5 ? v4_000.z : v4_000.w);

//         // 상단 샘플 2
//         sample_101 = zMod4_0 < 0.5 ? v4_100.y : (zMod4_0 < 1.5 ? v4_100.z : v4_100.w);

//         // 상단 샘플 3
//         sample_011 = zMod4_0 < 0.5 ? v4_010.y : (zMod4_0 < 1.5 ? v4_010.z : v4_010.w);
        
//         // 상단 샘플 4
//         sample_111 = zMod4_0 < 0.5 ? v4_110.y : (zMod4_0 < 1.5 ? v4_110.z : v4_110.w);
//     }

//     // 상단 샘플
//     var sample_01 : number = mix(sample_001, sample_101, f.x);
//     var sample_11 : number = mix(sample_011, sample_111, f.x);
//     var sample_1 : number = mix(sample_01, sample_11, f.y);

//     return mix(sample_0, sample_1, f.z);
// }

export function NoiseGet(_uvw : CVec3, _type : number) : number
{
    if(_type<SDF.eNoise.Gaussian+0.5)
    {
        var xi : number = _uvw.x * 128.0;
        var yi : number = _uvw.y * 128.0;
        var zi : number = _uvw.z * 128.0;
        return NoiseValue3(new CVec3(xi, yi, zi));
    }
    else if(_type>SDF.eNoise.Perlin-0.5)
    {
        return SampleNoise(_uvw, SDF.eNoise.Perlin);
    }
    else if(_type>SDF.eNoise.Voronoi-0.5)
    {
        return SampleNoise(_uvw, SDF.eNoise.Voronoi);
    }
    else if(_type<SDF.eNoise.Billow+0.5)
    {
        return abs(SampleNoise(_uvw, SDF.eNoise.Perlin) * 2.0 - 1.0);
    }
    else if(_type<SDF.eNoise.Ridged+0.5)
    {
        return 1.0 - abs(SampleNoise(_uvw, SDF.eNoise.Perlin) * 2.0 - 1.0);
    }
    else if(_type<SDF.eNoise.DomainWarp+0.5)
    {
        // qx
        var uvw : CVec3 = _uvw;
        var qx : number = SampleNoise(uvw, SDF.eNoise.Perlin);

        // qy
        uvw = V3AddV3(_uvw, new CVec3(5.2, 1.3, 0.1));
        var qy : number = SampleNoise(uvw, SDF.eNoise.Perlin);

        // qz
        uvw = V3AddV3(_uvw, new CVec3(3.1, 9.2, 5.5));
        var qz : number = SampleNoise(uvw, SDF.eNoise.Perlin);

        // result
        var warpStrength : number = 0.2;
        uvw = V3AddV3(_uvw, V3MulFloat(new CVec3(qx, qy, qz), warpStrength));
        return SampleNoise(uvw, SDF.eNoise.Perlin);
    }
    else if(_type<SDF.eNoise.FBM+0.5)
    {
        // 회전 FBM
        var matVec1 : CVec3 = new CVec3(0.0, 0.8, 0.6);
        var matVec2 : CVec3 = new CVec3(-0.8, 0.36, -0.48);
        var matVec3 : CVec3 = new CVec3(-0.6, -0.48, 0.64);
        var mat : CMat3 = new CMat3(matVec1, matVec2, matVec3);

        var fbm : number;
        fbm += 0.500 * SampleNoise(_uvw, SDF.eNoise.Perlin); _uvw = V3MulFloat(V3MulMat3Normal(_uvw, mat), 2.76434);
        fbm += 0.250 * SampleNoise(_uvw, SDF.eNoise.Perlin); _uvw = V3MulFloat(V3MulMat3Normal(_uvw, mat), 2.76434);
        fbm += 0.125 * SampleNoise(_uvw, SDF.eNoise.Perlin);
        return fbm;
    }
    else if(_type<SDF.eNoise.Simplex+0.5)
    {
        var xi : number = _uvw.x * 128.0;
        var yi : number = _uvw.y * 128.0;
        var zi : number = _uvw.z * 128.0;
        return NoiseSimplex3(new CVec3(xi, yi, zi));
    }
    // else if(_type<SDF.eNoise.FBMLinear+0.5)
    // {
    //     // 회전 FBM
    //     var matVec1 : CVec3 = new CVec3(0.0, 0.8, 0.6);
    //     var matVec2 : CVec3 = new CVec3(-0.8, 0.36, -0.48);
    //     var matVec3 : CVec3 = new CVec3(-0.6, -0.48, 0.64);
    //     var mat : CMat3 = new CMat3(matVec1, matVec2, matVec3);

    //     var fbm : number;
    //     fbm += 0.500 * SampleNoiseLinear(_uvw, SDF.eNoise.Perlin); _uvw = V3MulFloat(V3MulMat3Normal(_uvw, mat), 2.76434);
    //     fbm += 0.250 * SampleNoiseLinear(_uvw, SDF.eNoise.Perlin); _uvw = V3MulFloat(V3MulMat3Normal(_uvw, mat), 2.76434);
    //     fbm += 0.125 * SampleNoiseLinear(_uvw, SDF.eNoise.Perlin);
    //     return fbm;
    // }
    // else if(_type<SDF.eNoise.PerlinLinear+0.5)
    // {
    //     return SampleNoiseLinear(_uvw, SDF.eNoise.Perlin);
    // }
    return 1.0;
}