import { CForgeRand } from "../ForgeBuild/CForgeRand.js";
import { CForgeFloraMeshBuf, ForgeFloraV3 } from "./CForgeFloraMeshBuf.js";
import { CForgeFloraShape } from "./CForgeFloraShape.js";

//sca : 축별 크기(m), amp·freq : 표면 울퉁불퉁함, cut : 깎는 평면 수(많을수록 각진다), cutD : 평면 거리(작을수록 많이 깎인다)
interface IForgeFloraRockP { sca : number[][]; amp : number; freq : number; cut : number; cutD : number[]; }

//정이십면체 구를 노이즈로 부풀리고 무작위 평면으로 깎은 뒤 바닥을 평평하게 자른다. 형태 함수가 방향만 보므로 분할 수가 달라도 같은 돌이 된다.
//면마다 정점을 따로 두고 면 방향 기준 상자 투영 UV를 써 구 UV의 이음매·극점 뭉침을 피한다(법선은 공유 정점 평균이라 매끈하다)
export class CForgeFloraRockGen
{
    static ePreset = { Round : "round", Flat : "flat", Sharp : "sharp" } as const;
    static sPreset : Record<string, IForgeFloraRockP> = {
        round : { sca : [[0.9, 1.1], [0.6, 0.8], [0.8, 1.0]], amp : 0.18, freq : 1.6, cut : 3, cutD : [0.8, 0.92] },
        flat : { sca : [[1.0, 1.3], [0.3, 0.45], [0.8, 1.1]], amp : 0.12, freq : 2.0, cut : 4, cutD : [0.82, 0.92] },
        sharp : { sca : [[0.8, 1.0], [0.8, 1.1], [0.7, 0.9]], amp : 0.1, freq : 2.4, cut : 8, cutD : [0.66, 0.84] },
    };

    static Build(_preset : string, _seed : number, _lod : number) : CForgeFloraMeshBuf
    {
        const S = CForgeFloraShape, P = CForgeFloraRockGen.sPreset[_preset] ?? CForgeFloraRockGen.sPreset.round, r = new CForgeRand(CForgeRand.Hash(_seed, 83));
        const sca = P.sca.map(_q => r.Range(_q[0], _q[1])), cuts : { n : ForgeFloraV3, d : number }[] = [];
        for(let i = 0; i < P.cut; i++) cuts.push({ n : S.RandDir(r), d : r.Range(P.cutD[0], P.cutD[1]) });
        const ns = r.Int(1, 100000), floor = -sca[1] * 0.55;
        const ico = S.Icosphere(_lod == 0 ? 3 : 1);
        const pos = ico.v.map(_v =>
        {
            let p = S.Mul(_v, 1 + P.amp * (S.Fbm3(_v[0] * P.freq + 5, _v[1] * P.freq + 5, _v[2] * P.freq + 5, 3, ns) - 0.5) * 2);
            for(const c of cuts) { const d = S.Dot(p, c.n); if(d > c.d) p = S.Sub(p, S.Mul(c.n, d - c.d)); }
            const q : ForgeFloraV3 = [p[0] * sca[0], p[1] * sca[1], p[2] * sca[2]];
            q[1] = Math.max(q[1], floor);
            return q;
        });
        const vn : ForgeFloraV3[] = pos.map(() => [0, 0, 0]);
        const fn = ico.f.map(_f =>
        {
            const n = S.Cross(S.Sub(pos[_f[1]], pos[_f[0]]), S.Sub(pos[_f[2]], pos[_f[0]]));
            const o = S.Add(S.Add(pos[_f[0]], pos[_f[1]]), pos[_f[2]]);
            const fo = S.Dot(n, o) < 0 ? S.Mul(n, -1) : n;
            for(const i of _f) vn[i] = S.Add(vn[i], fo);
            return fo;
        });
        const b = new CForgeFloraMeshBuf();
        ico.f.forEach((_f, _k) =>
        {
            const f = fn[_k], ax = Math.abs(f[0]), ay = Math.abs(f[1]), az = Math.abs(f[2]);
            const UV = (_p : ForgeFloraV3) => ay >= ax && ay >= az ? [_p[0] + 8, _p[2] + 8] : ax >= az ? [_p[2] + 8, _p[1] + 8] : [_p[0] + 8, _p[1] + 8];
            const flat = pos[_f[0]][1] <= floor + 1e-4 && pos[_f[1]][1] <= floor + 1e-4 && pos[_f[2]][1] <= floor + 1e-4;
            const i = _f.map(_v => { const uv = UV(pos[_v]); return b.Vert(pos[_v], uv[0], uv[1], flat ? [0, -1, 0] : vn[_v], 0, 0); });
            b.Tri(i[0], i[1], i[2], f);
        });
        return b;
    }
}
