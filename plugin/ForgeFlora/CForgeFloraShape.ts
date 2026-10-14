import { CForgeRand } from "../ForgeBuild/CForgeRand.js";
import { CForgeFloraMeshBuf, ForgeFloraV3 } from "./CForgeFloraMeshBuf.js";

//_flex : 점마다 흔들림(0~1). _u0·_u1 : 둘레 방향 UV 범위(아틀라스 칸 안에 가두려면 좁힌다)
export interface IForgeFloraTubeOpt { slot : number; u0 : number; u1 : number; vScale : number; flex : number[]; v0? : number; }

export class CForgeFloraShape
{
    static Add(_a : ForgeFloraV3, _b : ForgeFloraV3) : ForgeFloraV3 { return [_a[0] + _b[0], _a[1] + _b[1], _a[2] + _b[2]]; }
    static Sub(_a : ForgeFloraV3, _b : ForgeFloraV3) : ForgeFloraV3 { return [_a[0] - _b[0], _a[1] - _b[1], _a[2] - _b[2]]; }
    static Mul(_a : ForgeFloraV3, _s : number) : ForgeFloraV3 { return [_a[0] * _s, _a[1] * _s, _a[2] * _s]; }
    static Dot(_a : ForgeFloraV3, _b : ForgeFloraV3) : number { return _a[0] * _b[0] + _a[1] * _b[1] + _a[2] * _b[2]; }
    static Cross(_a : ForgeFloraV3, _b : ForgeFloraV3) : ForgeFloraV3 { return [_a[1] * _b[2] - _a[2] * _b[1], _a[2] * _b[0] - _a[0] * _b[2], _a[0] * _b[1] - _a[1] * _b[0]]; }
    static Len(_a : ForgeFloraV3) : number { return Math.hypot(_a[0], _a[1], _a[2]); }
    static Nor(_a : ForgeFloraV3) : ForgeFloraV3 { const l = CForgeFloraShape.Len(_a) || 1; return [_a[0] / l, _a[1] / l, _a[2] / l]; }
    static Lerp(_a : ForgeFloraV3, _b : ForgeFloraV3, _t : number) : ForgeFloraV3 { return [_a[0] + (_b[0] - _a[0]) * _t, _a[1] + (_b[1] - _a[1]) * _t, _a[2] + (_b[2] - _a[2]) * _t]; }
    //_a에 수직인 단위 벡터 하나
    static Perp(_a : ForgeFloraV3) : ForgeFloraV3 { return CForgeFloraShape.Nor(CForgeFloraShape.Cross(_a, Math.abs(_a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])); }
    //_axis(단위) 둘레로 _ang 회전(로드리게스)
    static Rot(_v : ForgeFloraV3, _axis : ForgeFloraV3, _ang : number) : ForgeFloraV3
    {
        const c = Math.cos(_ang), s = Math.sin(_ang), d = CForgeFloraShape.Dot(_axis, _v), x = CForgeFloraShape.Cross(_axis, _v);
        return [_v[0] * c + x[0] * s + _axis[0] * d * (1 - c), _v[1] * c + x[1] * s + _axis[1] * d * (1 - c), _v[2] * c + x[2] * s + _axis[2] * d * (1 - c)];
    }
    static RandDir(_r : CForgeRand) : ForgeFloraV3
    {
        const y = _r.Range(-1, 1), a = _r.Range(0, Math.PI * 2), s = Math.sqrt(1 - y * y);
        return [Math.cos(a) * s, y, Math.sin(a) * s];
    }
    //폴리라인 위 비율 _t(0~1, 길이 기준) 점과 방향
    static At(_p : ForgeFloraV3[], _t : number) : { p : ForgeFloraV3, d : ForgeFloraV3, i : number, f : number }
    {
        const seg : number[] = [];
        let L = 0;
        for(let i = 1; i < _p.length; i++) { const l = CForgeFloraShape.Len(CForgeFloraShape.Sub(_p[i], _p[i - 1])); seg.push(l); L += l; }
        let s = Math.max(0, Math.min(1, _t)) * L;
        for(let i = 0; i < seg.length; i++)
        {
            if(s <= seg[i] || i == seg.length - 1)
            {
                const f = seg[i] > 0 ? Math.min(1, s / seg[i]) : 0;
                return { p : CForgeFloraShape.Lerp(_p[i], _p[i + 1], f), d : CForgeFloraShape.Nor(CForgeFloraShape.Sub(_p[i + 1], _p[i])), i, f };
            }
            s -= seg[i];
        }
        return { p : _p[0], d : [0, 1, 0], i : 0, f : 0 };
    }

    //가지·줄기. 고리 기준 축은 앞 고리 축을 접선에 투영해 이어 가 꼬이지 않게 한다(끝은 막지 않는다)
    static Tube(_b : CForgeFloraMeshBuf, _p : ForgeFloraV3[], _r : number[], _side : number, _o : IForgeFloraTubeOpt)
    {
        const S = CForgeFloraShape, n = _p.length;
        if(n < 2) return;
        const T = _p.map((_q, _i) => S.Nor(S.Sub(_p[Math.min(n - 1, _i + 1)], _p[Math.max(0, _i - 1)])));
        let N = S.Perp(T[0]), v = _o.v0 ?? 0, prev = -1;
        for(let i = 0; i < n; i++)
        {
            if(i > 0)
            {
                const t = S.Sub(N, S.Mul(T[i], S.Dot(N, T[i])));
                N = S.Len(t) < 1e-6 ? S.Perp(T[i]) : S.Nor(t);
                v += S.Len(S.Sub(_p[i], _p[i - 1])) * _o.vScale;
            }
            const B = S.Cross(T[i], N), base = _b.Count();
            for(let k = 0; k <= _side; k++)
            {
                const a = k / _side * Math.PI * 2, d = S.Add(S.Mul(N, Math.cos(a)), S.Mul(B, Math.sin(a)));
                _b.Vert(S.Add(_p[i], S.Mul(d, _r[i])), _o.u0 + (_o.u1 - _o.u0) * k / _side, v + 0.01, d, _o.slot, _o.flex[i]);
            }
            if(prev >= 0)
                for(let k = 0; k < _side; k++)
                {
                    const a = prev + k, b = prev + k + 1, c = base + k + 1, d = base + k;
                    const f = S.Add([_b.mNor[a * 3], _b.mNor[a * 3 + 1], _b.mNor[a * 3 + 2]], [_b.mNor[c * 3], _b.mNor[c * 3 + 1], _b.mNor[c * 3 + 2]]);
                    _b.Tri(a, b, c, f);
                    _b.Tri(a, c, d, f);
                }
            prev = base;
        }
    }

    //양면 사각 카드. _o에서 _ax(u 방향 변)·_ay(v 방향 변). _n : 조명용 법선(잎 덩어리는 수관 바깥쪽으로 준다). _f : 네 모서리 흔들림
    static Card(_b : CForgeFloraMeshBuf, _o : ForgeFloraV3, _ax : ForgeFloraV3, _ay : ForgeFloraV3, _uv : number[], _n : ForgeFloraV3, _slot : number, _f : number[])
    {
        const S = CForgeFloraShape;
        const p = [_o, S.Add(_o, _ax), S.Add(S.Add(_o, _ax), _ay), S.Add(_o, _ay)];
        const uv = [[_uv[0], _uv[1]], [_uv[2], _uv[1]], [_uv[2], _uv[3]], [_uv[0], _uv[3]]];
        const i = p.map((_q, _k) => _b.Vert(_q, uv[_k][0], uv[_k][1], _n, _slot, _f[_k]));
        const fn = S.Cross(_ax, _ay);
        _b.TwoSide(i[0], i[1], i[2], fn);
        _b.TwoSide(i[0], i[2], i[3], fn);
    }

    //풀잎 하나. 아래에서 _lean만큼 기울어 출발해 끝으로 갈수록 _bend만큼 더 눕는다. 끝은 한 점으로 모은다
    static Blade(_b : CForgeFloraMeshBuf, _base : ForgeFloraV3, _yaw : number, _h : number, _w : number, _lean : number, _bend : number, _seg : number,
        _u0 : number, _u1 : number, _slot : number, _hMax : number)
    {
        const S = CForgeFloraShape, d : ForgeFloraV3 = [Math.cos(_yaw), 0, Math.sin(_yaw)], side : ForgeFloraV3 = [-d[2], 0, d[0]], L = _h / _seg;
        let p = _base, prevL = -1, prevR = -1;
        for(let k = 0; k <= _seg; k++)
        {
            const t = k / _seg, th = _lean + _bend * t;
            const T : ForgeFloraV3 = S.Add(S.Mul(d, Math.sin(th)), [0, Math.cos(th), 0]);
            let n = S.Cross(side, T);
            if(n[1] < 0) n = S.Mul(n, -1);
            n = S.Nor(S.Add(S.Nor(n), [0, 0.6, 0]));
            //메시 원점이 땅이라 절대 높이로 구한다. 줄기 끝에 붙인 잎(까끄라기·이삭 가닥)을 자기 밑동 기준으로 구하면 0이 돼 줄기만 흔들리고 남는다
            const flex = Math.pow(Math.max(0, Math.min(1, p[1] / _hMax)), 1.5);
            const v = 0.02 + 0.96 * t;
            if(k < _seg)
            {
                const hw = _w * 0.5 * Math.pow(1 - t, 0.6);
                const l = _b.Vert(S.Sub(p, S.Mul(side, hw)), _u0, v, n, _slot, flex);
                const r = _b.Vert(S.Add(p, S.Mul(side, hw)), _u1, v, n, _slot, flex);
                if(prevL >= 0) { _b.TwoSide(prevL, prevR, r, n); _b.TwoSide(prevL, r, l, n); }
                prevL = l; prevR = r;
            }
            else
            {
                const tip = _b.Vert(p, (_u0 + _u1) * 0.5, v, n, _slot, flex);
                _b.TwoSide(prevL, prevR, tip, n);
            }
            p = S.Add(p, S.Mul(T, L));
        }
    }

    //Blade와 같은 휨 규칙으로 _seg마디를 지난 끝점과 마지막 마디 방향
    static BladeTip(_base : ForgeFloraV3, _yaw : number, _h : number, _lean : number, _bend : number, _seg : number) : { p : ForgeFloraV3, d : ForgeFloraV3 }
    {
        const S = CForgeFloraShape, d : ForgeFloraV3 = [Math.cos(_yaw), 0, Math.sin(_yaw)], L = _h / _seg;
        let p = _base, T : ForgeFloraV3 = [0, 1, 0];
        for(let k = 0; k < _seg; k++)
        {
            const th = _lean + _bend * k / _seg;
            T = S.Add(S.Mul(d, Math.sin(th)), [0, Math.cos(th), 0]);
            p = S.Add(p, S.Mul(T, L));
        }
        return { p, d : T };
    }

    //넓은 아치형 잎(고사리 등). Blade처럼 휘지만 폭을 거의 유지하고 텍스처 칸 _uv 전체를 쓴다(u = 폭, v = 길이)
    static Frond(_b : CForgeFloraMeshBuf, _base : ForgeFloraV3, _yaw : number, _h : number, _w : number, _lean : number, _bend : number, _seg : number, _uv : number[], _slot : number, _hMax : number)
    {
        const S = CForgeFloraShape, d : ForgeFloraV3 = [Math.cos(_yaw), 0, Math.sin(_yaw)], side : ForgeFloraV3 = [-d[2], 0, d[0]], L = _h / _seg;
        let p = _base, prevL = -1, prevR = -1;
        for(let k = 0; k <= _seg; k++)
        {
            const t = k / _seg, th = _lean + _bend * t;
            const T : ForgeFloraV3 = S.Add(S.Mul(d, Math.sin(th)), [0, Math.cos(th), 0]);
            let n = S.Cross(side, T);
            if(n[1] < 0) n = S.Mul(n, -1);
            n = S.Nor(S.Add(S.Nor(n), [0, 0.5, 0]));
            const flex = Math.pow(Math.max(0, Math.min(1, p[1] / _hMax)), 1.5) * 0.5 + t * 0.5;
            const hw = _w * 0.5 * (1 - 0.35 * t), v = _uv[1] + (_uv[3] - _uv[1]) * t;
            const l = _b.Vert(S.Sub(p, S.Mul(side, hw)), _uv[0], v, n, _slot, flex);
            const r = _b.Vert(S.Add(p, S.Mul(side, hw)), _uv[2], v, n, _slot, flex);
            if(prevL >= 0) { _b.TwoSide(prevL, prevR, r, n); _b.TwoSide(prevL, r, l, n); }
            prevL = l; prevR = r;
            p = S.Add(p, S.Mul(T, L));
        }
    }

    //단위 구 위 정점과 삼각형(정이십면체를 _sub번 나눈다)
    static Icosphere(_sub : number) : { v : ForgeFloraV3[], f : number[][] }
    {
        const t = (1 + Math.sqrt(5)) / 2;
        let v : ForgeFloraV3[] = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(_q => CForgeFloraShape.Nor(_q));
        let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
        for(let s = 0; s < _sub; s++)
        {
            const mid = new Map<string, number>(), nf : number[][] = [];
            const M = (_a : number, _c : number) =>
            {
                const k = _a < _c ? _a + "_" + _c : _c + "_" + _a;
                let i = mid.get(k);
                if(i == null) { i = v.push(CForgeFloraShape.Nor(CForgeFloraShape.Lerp(v[_a], v[_c], 0.5))) - 1; mid.set(k, i); }
                return i;
            };
            for(const [a, b, c] of f)
            {
                const ab = M(a, b), bc = M(b, c), ca = M(c, a);
                nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
            }
            f = nf;
        }
        return { v, f };
    }

    static Noise3(_x : number, _y : number, _z : number, _seed : number) : number
    {
        const xi = Math.floor(_x), yi = Math.floor(_y), zi = Math.floor(_z);
        const S = (_t : number) => _t * _t * (3 - 2 * _t);
        const u = S(_x - xi), v = S(_y - yi), w = S(_z - zi);
        const H = (_i : number, _j : number, _k : number) => CForgeRand.Hash(xi + _i, yi + _j, zi + _k, _seed) / 4294967296;
        const L = (_a : number, _b : number, _t : number) => _a + (_b - _a) * _t;
        return L(L(L(H(0, 0, 0), H(1, 0, 0), u), L(H(0, 1, 0), H(1, 1, 0), u), v), L(L(H(0, 0, 1), H(1, 0, 1), u), L(H(0, 1, 1), H(1, 1, 1), u), v), w);
    }
    static Fbm3(_x : number, _y : number, _z : number, _oct : number, _seed : number) : number
    {
        let s = 0, amp = 0.5, n = 0, f = 1;
        for(let o = 0; o < _oct; o++) { s += CForgeFloraShape.Noise3(_x * f, _y * f, _z * f, _seed + o * 101) * amp; n += amp; amp *= 0.5; f *= 2; }
        return s / n;
    }
}
