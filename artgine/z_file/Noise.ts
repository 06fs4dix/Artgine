import { abs, clamp, cos, CVec2, CVec3, FloatToInt, floor, fract, mix, mod, pow, sin, V2AddV2, V2Dot, V2Floor, V2MulFloat, 
    V2SubV2, V3Floor, V3Fract, V3MulFloat, V3MulV3, V3SubV3 } from "./Shader";


//Hash
//IQ가 만든 Hash방식, Tri에 사용하기 위해 값을 수정함
export function HashIQ1D(_x : number) : number {
    return fract(sin(_x) * 753.5453123);
}

export function HashIQ2D(_n : CVec2) : number {
    return fract(sin(V2Dot(_n, new CVec2(12.9898, 4.1414))) * 43758.5453);
}

//일반적인 Hash방식, 일반적인 Hash값이 나옴
export function Hash2D(_p : CVec2) : number {
    return fract(sin(V2Dot(_p, new CVec2(127.1, 311.7))) * 43758.5453123);
}

function Rot(_p : CVec2, _a : number) : CVec2 {
    var c : number = cos(_a);
    var s : number = sin(_a);
    var temp : number = _p.x;
    _p.x = c * temp + s * _p.y;
    _p.y = -s * temp + c * _p.y;

    return _p;
}

function Tri1D(_x : number) : number {
    return clamp(abs(fract(_x) - 0.5), 0.01, 0.49);
}

//TriNoise
//삼각형 기반의 해시 구조로 노이즈 생성하는 방식
//노이즈 생성 방식 중 가장 빠름
export function NoiseTri2D(_p : CVec2, _spd : number, _time : number) : number {    
    var z : number = 1.8;
    var z2 : number = 2.5;
    var rz : number = 0.0;
    _p = Rot(_p, _p.x * 0.06);
    var bp : CVec2 = _p;
    for(var i = 0; i < 5; i++) {
        var tri2d : CVec2 = V2MulFloat(bp, 1.85);
        tri2d = new CVec2(Tri1D(tri2d.x) + Tri1D(tri2d.y), Tri1D(tri2d.y + Tri1D(tri2d.x)));
        var dg : CVec2 = V2MulFloat(tri2d, 0.75);
        dg = Rot(dg, _time * _spd);
        _p = V2SubV2(_p, V2MulFloat(dg, 1.0 / z2));

        bp = V2MulFloat(bp, 1.3);
        z2 *= 1.45;
        z *= 0.42;
        _p = V2MulFloat(_p, 1.21 + (rz - 1.0) * 0.02);

        rz += Tri1D(_p.x + Tri1D(_p.y)) * z;

        var temp : number = _p.x;
        _p.x = 0.95534 * temp + 0.29552 * _p.y;
        _p.y = -0.29552 * temp + 0.95534 * _p.y;
    }
    return clamp(1.0 / pow(rz * 29.0, 1.3), 0.0, 0.55);
}

export function NoiseTri3D(_x : CVec3) : number {
    var p : CVec3 = V3Floor(_x);
    var f : CVec3 = V3Fract(_x);
    f = V3MulV3(V3MulV3(f, f), V3SubV3(new CVec3(3.0, 3.0, 3.0), V3MulFloat(f, 2.0)));

    var n : number = p.x + p.y * 157.0 + 113.0 * p.z;
    return mix(mix(mix(HashIQ1D(n + 0.0), HashIQ1D(n + 1.0), f.x),
                   mix(HashIQ1D(n + 157.0), HashIQ1D(n + 158.0), f.x), f.y),
               mix(mix(HashIQ1D(n + 113.0), HashIQ1D(n + 114.0), f.x),
                   mix(HashIQ1D(n + 270.0), HashIQ1D(n + 271.0), f.x), f.y), f.z);
}

//FBM : 노이즈를 중첩해서 만든 프랙탈구조
//크기가 크고 디테일한 노이즈맵을 만들기 위해 사용, 노이즈를 여러번 사용해서 중첩해야 하므로 느림
//높이맵, 구름, 연기 등 큰 규모의 자연스러움을 구현할 때 사용
export function NoiseFBM(_p : CVec3, _lacunarity : number) : number {
    var p : CVec3 = _p;
    var t : number = 0.51749673 * NoiseTri3D(p);
    p = V3MulFloat(p, _lacunarity);
    t += 0.25584929 * NoiseTri3D(p);
    p = V3MulFloat(p, _lacunarity);
    t += 0.12527603 * NoiseTri3D(p);
    p = V3MulFloat(p, _lacunarity);
    t += 0.06255931 * NoiseTri3D(p);

    return t;
}

function Fade(_t : number) : number {
    return _t * _t * _t * (_t * (_t * 6.0 - 15.0) + 10.0);
}

//hash값 사용해서 퍼뮤테이션 테이블 대체함
//덜 랜덤한 값이 들어감
function Grad(_h : number, _pos : CVec2) : number {
    switch(FloatToInt(floor(mod(_h * 4.0, 4.0)))) {
        case 0: return  _pos.x + _pos.y;
        case 1: return -_pos.x + _pos.y;
        case 2: return -_pos.x - _pos.y;
        case 3: return  _pos.x - _pos.y;
    }
    return 0.0;
}

//PerlinNoise
//해시 사용해서 그레디언트 대체함(정밀도 떨어짐)
//TriNoise보다 느리지만 좀 더 스무스한 노이즈맵을 얻을 수 있음
//자연 배경에 주로 사용
export function NoisePerlin2D(_p : CVec2) : number {
    var pi : CVec2 = V2Floor(_p);
    var pf : CVec2 = new CVec2(fract(_p.x), fract(_p.y));

    //uv
    var u : number = Fade(pf.x);
    var v : number = Fade(pf.y);

    var aa : number = Hash2D(V2AddV2(pi, new CVec2(0.0, 0.0)));
    var ab : number = Hash2D(V2AddV2(pi, new CVec2(0.0, 1.0)));
    var ba : number = Hash2D(V2AddV2(pi, new CVec2(1.0, 0.0)));
    var bb : number = Hash2D(V2AddV2(pi, new CVec2(1.0, 1.0)));

    var x1 : number = mix(Grad(aa, pf), Grad(ba, V2SubV2(pf, new CVec2(1.0, 0.0))), u);
    var x2 : number = mix(Grad(ab, V2SubV2(pf, new CVec2(0.0, 1.0))), Grad(bb, V2SubV2(pf, new CVec2(1.0, 1.0))), u);

    return (mix(x1, x2, v) + 1.0) * 0.5;
}

//Random
export function NoiseRand1D(_x: number): number {
    _x = fract(_x * 0.1031);
    _x *= _x + 33.33;
    _x *= _x + _x;
    return fract(_x);
}

export function NoiseRand2D(_x: CVec2): number {
    return fract(sin(V2Dot(_x, new CVec2(12.9898, 78.233))) * 43758.5453);
}
