import { SDF } from "./SDF";
import { 
    CMat, CVec2, CVec3, CVec4, 
    abs, floor, fract, mix, mod,
    V2AddV2, V2Mod, V2MulFloat, V2MulV2, V2SubV2,
    V3AddV3, V3Floor, V3Fract, V3MulFloat, V3MulV3,
    Sam2DToV4, FloatToInt,
    Hash13,
    CMat3,
    V3MulMat3Normal,
    V3Dot,
    V3SubV3,
    V3Step,
    V3Min,
    V3Max,
    V4MulV4,
    V4SubV4,
    V4AddV4,
    V4MulFloat,
    V4Floor,
    V4Abs,
    V4Step,
    V4Max,
    V4Dot,
    V4Mod,
    V3Mod,
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

// 심플렉스 노이즈 함수
function Permute(_x : CVec4) : CVec4
{
    return V4Mod(V4MulV4(V4AddV4(V4MulFloat(_x, 34.0), new CVec4(1.0,1.0,1.0,1.0)),_x), 289.0);
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
    // uv 조금씩 다르게 적용
    var xi : number = mod(floor(_uvw.x * 128.0), 128.0);
    var yi : number = mod(floor(_uvw.y * 128.0), 128.0);
    var zi : number = mod(floor(_uvw.z * 128.0), 128.0);
    var offX : number = xi + mod(yi, 16.0) * 128.0;
    var offY : number = floor(yi / 16.0) + floor(zi / 4.0) * 8.0;
    var v4 : CVec4 = Sam2DToV4(new CVec2(11, _type + offY), offX);
    var zMod4 : number = mod(zi, 4.0);
    return zMod4 < 0.5 ? v4.x : (zMod4 < 1.5 ? v4.y : (zMod4 < 2.5 ? v4.z : v4.w));
}

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
    return 1.0;
}

// linear mix라서 z축은 믹싱 안됨
// bilinear 구현하면 z축도 믹싱 가능(성능은 모르겠음)
export function NoiseGetLinear(_uvw : CVec3, _type : number) : number
{
    var textureSize : number = 128.0;

    var st: CVec2 = V2MulFloat(_uvw.xy, textureSize);

    var i: CVec2 = new CVec2(floor(st.x), floor(st.y));
    var f: CVec2 = new CVec2(fract(st.x), fract(st.y));

    var u: CVec2 = V2MulV2(V2MulV2(f, f), V2SubV2(new CVec2(3.0, 3.0), V2MulFloat(f, 2.0)));

    var invSize: number = 1.0 / textureSize;
    var uv_00: CVec3 = new CVec3(V2MulFloat(i, invSize), _uvw.z);
    var uv_10: CVec3 = new CVec3(V2MulFloat(V2AddV2(i, new CVec2(1.0, 0.0)), invSize), _uvw.z);
    var uv_01: CVec3 = new CVec3(V2MulFloat(V2AddV2(i, new CVec2(0.0, 1.0)), invSize), _uvw.z);
    var uv_11: CVec3 = new CVec3(V2MulFloat(V2AddV2(i, new CVec2(1.0, 1.0)), invSize), _uvw.z);

    var a: number = NoiseGet(uv_00, _type);
    var b: number = NoiseGet(uv_10, _type);
    var c: number = NoiseGet(uv_01, _type);
    var d: number = NoiseGet(uv_11, _type);

    // X축 믹스 -> Y축 믹스 (Bilinear Interpolation)
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}