import { CMath } from "../../artgine/geometry/CMath.js";
import { CMesh, CMeshMorph } from "../../artgine/render/CMesh.js";
import { CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CAvatarCloth } from "./CAvatarCloth.js";
import { CAvatarRig } from "./CAvatarRig.js";

//bust·belly·hip : -1~1. eye : 배율. 체중은 메시가 아니라 본 행렬로 매 프레임 바꾼다(CAvatarFat)
export interface IAvatarShape { bust : number; belly : number; hip : number; eye : number; }

//둥근 살덩이(가슴·배·엉덩이). c : 몸 안쪽 중심, d : 바깥 방향(단위), r : 덩이 반지름
//up·dn : 위·아래 영향 범위 배수(엉덩이는 위를 짧게 해 허리 뒤를 건드리지 않는다)
interface IBulge { c : number[]; d : number[]; r : number; up : number; dn : number; }
//유방. c : 꼭지(가장 앞), d : 바깥 방향, r : 밑면 반경, e : 꼭지가 흉벽에서 솟은 높이.
//흉벽은 위로 갈수록 뒤로 기우는 선 z = wz + (y - wy) * ws 로 본다(수직 면으로 보면 유방 위 피부가 모두 흉벽 뒤로 잡힌다)
interface IBreast { c : number[]; d : number[]; r : number; e : number; wy : number; wz : number; ws : number; }
//베이스 몸에서 한 번 구하는 기준(메시 공간). 정면은 +Z
export interface IAvatarAnchor { h : number; bust : IBreast[]; belly : IBulge[]; hip : IBulge[]; eye : { c : number[]; r : number }[]; }

//바인드 자세 공간의 변형 필드. 같은 필드를 몸·옷·머리카락에 똑같이 적용해 옷이 체형을 따라온다(로블록스 케이지 맞춤의 대용).
//가슴은 모프 타깃이다. 엔진 가중치는 타깃당 하나라, 정점마다 다른 영향은 delta에 넣는다.
//컵 안만 밀고 가장자리를 두면 큰 삼각형이 쐐기가 되므로, 컵 전체는 같은 비율로 커지고 바깥만 0까지 줄어든다
export class CAvatarShape
{
    static sStep = 0.05;
    //[1에서 덩이 반지름이 커지는 비율, 클수록 아래로 처지는 정도(반지름 배수), -1에서 줄어드는 비율].
    //줄일 때는 납작해지는 정도에서 멈춰야 한다(크게 줄이면 갈비뼈 안으로 꺼진다)
    //유방 모프(+1). [가슴 중심에서 커지는 비율, 처짐(반지름 배수)]. 음수 가중치는 같은 delta의 반대라 줄어든다
    static sBust = [0.55, 0.05];
    static sBelly = [0.5, 0.25, 0.4];
    static sHip = [0.3, 0.1, 0.3];

    static Key(_s : IAvatarShape) : string
    {
        const Q = (_v : number) => Math.round(_v / CAvatarShape.sStep) * CAvatarShape.sStep;
        return [Q(_s.bust), Q(_s.belly), Q(_s.hip), Q(_s.eye)].map(v => v.toFixed(2)).join(",");
    }
    static IsNone(_s : IAvatarShape) : boolean { return CAvatarShape.Key(_s) == "0.00,0.00,0.00,1.00"; }

    private static BonePos(_mesh : CMesh, _bone : string) : number[]
    {
        const m = CAvatarRig.SkinMat(_mesh, _bone);
        if(m == null) return null;
        const a = CMath.MatInvert(m).mF32A;
        return [a[12], a[13], a[14]];
    }
    static Anchor(_body : CMesh) : IAvatarAnchor
    {
        const h = CAvatarCloth.Height(_body);
        const P = (_n : string) => CAvatarShape.BonePos(_body, _n);
        const body = CAvatarCloth.BodyNodes(_body).map(n => CAvatarCloth.Geo(n.mData.ci)).filter(g => g != null);
        //높이 띠·좌우 범위 안에서 _score가 가장 큰 표면 점
        const Pick = (_y0 : number, _y1 : number, _x0 : number, _x1 : number, _score : (_x : number, _y : number, _z : number) => number) : number[] =>
        {
            let best : number[] = null, bs = -Infinity;
            for(const g of body)
                for(let i = 0; i < g.count; i++)
                {
                    const x = g.pos[i * 3], y = g.pos[i * 3 + 1], z = g.pos[i * 3 + 2];
                    if(y < _y0 || y > _y1 || x < _x0 || x > _x1) continue;
                    const s = _score(x, y, z);
                    if(s > bs) { bs = s; best = [x, y, z]; }
                }
            return best;
        };
        const out : IAvatarAnchor = { h, bust : [], belly : [], hip : [], eye : [] };
        const s1 = P("spine_01"), s2 = P("spine_02"), s3 = P("spine_03"), pv = P("pelvis"), nk = P("neck_01");
        //표면 점 _s에서 바깥 방향 _d 반대로 반지름만큼 들어간 곳을 덩이 중심으로
        const Bulge = (_s : number[], _d : number[], _r : number, _up = 1, _dn = 1) : IBulge =>
        {
            const l = Math.hypot(_d[0], _d[1], _d[2]) || 1, d = [_d[0] / l, _d[1] / l, _d[2] / l];
            return { c : [_s[0] - d[0] * _r, _s[1] - d[1] * _r, _s[2] - d[2] * _r], d, r : _r, up : _up, dn : _dn };
        };
        if(s2 != null && s3 != null && nk != null)
            for(const side of [-1, 1])
            {
                const p = Pick(s2[1], s3[1] + (nk[1] - s3[1]) * 0.3, side < 0 ? -h * 0.15 : h * 0.02, side < 0 ? -h * 0.02 : h * 0.15, (_x, _y, _z) => _z);
                if(p == null) continue;
                //흉벽: 유방 밑 주름 아래 몸통 앞면과 꼭지 위 키 10% 높이의 윗가슴 앞면을 잇는 기운 선
                const lo = Pick(p[1] - h * 0.06, p[1] - h * 0.045, p[0] - h * 0.012, p[0] + h * 0.012, (_x, _y, _z) => _z);
                const hi = Pick(p[1] + h * 0.095, p[1] + h * 0.105, p[0] - h * 0.012, p[0] + h * 0.012, (_x, _y, _z) => _z);
                const wy = lo?.[1] ?? p[1] - h * 0.05, wz = lo?.[2] ?? p[2] - h * 0.02;
                const ws = hi != null && lo != null ? (hi[2] - lo[2]) / (hi[1] - lo[1]) : 0;
                const l = Math.hypot(side * 0.12, 0.05, 1);
                out.bust.push({ c : p, d : [side * 0.12 / l, 0.05 / l, 1 / l], r : h * 0.055, e : Math.max(h * 0.005, p[2] - (wz + (p[1] - wy) * ws)), wy, wz, ws });
            }
        if(s1 != null && pv != null)
        {
            const y = (s1[1] * 2 + pv[1]) / 3;
            const p = Pick(y - h * 0.02, y + h * 0.02, -h * 0.03, h * 0.03, (_x, _y, _z) => _z);
            if(p != null) out.belly.push(Bulge(p, [0, -0.1, 1], h * 0.085, 0.8, 1));
        }
        if(pv != null)
            for(const side of [-1, 1])
            {
                const x0 = side < 0 ? -h * 0.2 : h * 0.01, x1 = side < 0 ? -h * 0.01 : h * 0.2;
                const back = Pick(pv[1] - h * 0.08, pv[1], x0, x1, (_x, _y, _z) => -_z);
                if(back != null) out.hip.push(Bulge(back, [side * 0.25, -0.1, -1], h * 0.075, 0.55, 1));
                const out2 = Pick(pv[1] - h * 0.06, pv[1] + h * 0.01, x0, x1, (_x) => _x * side);
                if(out2 != null) out.hip.push(Bulge(out2, [side, 0, 0], h * 0.055, 0.6, 1));
            }
        const eyes = CAvatarCloth.SkinNodes(_body).filter(n => /^eyes$/i.test(n.mKey)).map(n => CAvatarCloth.Geo(n.mData.ci));
        for(const side of [-1, 1])
        {
            let n = 0, x = 0, y = 0, z = 0, w = 0;
            for(const g of eyes)
                for(let i = 0; i < g.count; i++)
                {
                    if(g.pos[i * 3] * side <= 0) continue;
                    x += g.pos[i * 3]; y += g.pos[i * 3 + 1]; z += g.pos[i * 3 + 2]; n++;
                }
            if(n == 0) continue;
            x /= n; y /= n; z /= n;
            for(const g of eyes)
                for(let i = 0; i < g.count; i++)
                    if(g.pos[i * 3] * side > 0) w = Math.max(w, Math.hypot(g.pos[i * 3] - x, g.pos[i * 3 + 1] - y));
            out.eye.push({ c : [x, y, z], r : Math.max(w, h * 0.005) * 2.2 });
        }
        return out;
    }

    private static Fall(_d : number, _r : number) : number
    {
        if(_d >= _r) return 0;
        const t = 1 - _d / _r;
        return t * t * (3 - 2 * t);
    }

    //덩이 중심에서 구 모양으로 부풀린다(음수면 줄어든다). 반지름 안쪽은 균일하게, 바깥 0.7r 동안 부드럽게 줄이고,
    //바깥 방향 반구에만 적용해 몸 안쪽이 끌려 나오지 않게 한다. 커질수록 아래로 조금 처진다
    private static Bulge(_b : IBulge[], _k : number, _cfg : number[], _p : Float32Array, _o : number)
    {
        if(_k == 0) return;
        for(const b of _b)
        {
            const rx = _p[_o] - b.c[0], ry = _p[_o + 1] - b.c[1], rz = _p[_o + 2] - b.c[2];
            const dist = Math.hypot(rx, ry / (ry > 0 ? b.up : b.dn), rz);
            if(dist >= b.r * 1.5 || dist < 1e-6) continue;
            const w = dist <= b.r ? 1 : CAvatarShape.Fall(dist - b.r, b.r * 0.5);
            const along = (rx * b.d[0] + ry * b.d[1] + rz * b.d[2]) / dist;
            const t = Math.min(1, Math.max(0, (along + 0.3) / 0.6)), hemi = t * t * (3 - 2 * t);
            const s = (_k > 0 ? _k * _cfg[0] : _k * _cfg[2]) * w * hemi;
            if(s == 0) continue;
            const sag = s > 0 ? s * _cfg[1] * b.r : 0;
            _p[_o] = b.c[0] + rx * (1 + s);
            _p[_o + 1] = b.c[1] + ry * (1 + s) - sag;
            _p[_o + 2] = b.c[2] + rz * (1 + s);
        }
    }
    private static Smooth(_a : number, _b : number, _x : number) : number
    {
        const t = Math.min(1, Math.max(0, (_x - _a) / (_b - _a)));
        return t * t * (3 - 2 * t);
    }
    //보컬로이드 가슴 본 스케일과 같다. 중심은 흉벽이고, 컵(rn<=1)은 가중치 1로 같이 커진다. 그 바깥 0.6 동안만 0으로 줄어든다
    private static BreastInf(_b : IBreast, _x : number, _y : number, _z : number) : { w : number; vx : number; vy : number; vz : number }
    {
        const back = Math.max(_b.e * 0.85, _b.r * 0.25);
        const cx = _b.c[0] - _b.d[0] * back, cy = _b.c[1] - _b.d[1] * back, cz = _b.c[2] - _b.d[2] * back;
        const vx = _x - cx, vy = _y - cy, vz = _z - cz;
        const along = vx * _b.d[0] + vy * _b.d[1] + vz * _b.d[2];
        let ux = -_b.d[0] * _b.d[1], uy = 1 - _b.d[1] * _b.d[1], uz = -_b.d[2] * _b.d[1];
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul; uy /= ul; uz /= ul;
        const sx = uy * _b.d[2] - uz * _b.d[1], sy = uz * _b.d[0] - ux * _b.d[2], sz = ux * _b.d[1] - uy * _b.d[0];
        const fs = vx * sx + vy * sy + vz * sz, fu = vx * ux + vy * uy + vz * uz;
        const reach = Math.max(_b.e, _b.r * 0.35);
        const rn = Math.hypot(fs / (_b.r * 1.05), fu / (_b.r * (fu > 0 ? 1.25 : 1.05)), Math.max(along, 0) / (reach * 1.15));
        const w = (rn <= 1 ? 1 : CAvatarShape.Smooth(1.6, 1, rn)) * CAvatarShape.Smooth(-_b.r * 0.2, _b.r * 0.05, along);
        return { w, vx, vy, vz };
    }
    //k=1이 모프 타깃. 가중치를 곱하면 같은 모양이 되므로 여기서 k에 비례해야 한다
    private static AddBust(_a : IAvatarAnchor, _k : number, _p : Float32Array, _o : number)
    {
        if(_k == 0 || _a.bust.length == 0) return;
        const x = _p[_o], y = _p[_o + 1], z = _p[_o + 2];
        let dx = 0, dy = 0, dz = 0, ws = 0;
        const g = _k * CAvatarShape.sBust[0], sag = _k * CAvatarShape.sBust[1];
        for(const b of _a.bust)
        {
            const inf = CAvatarShape.BreastInf(b, x, y, z);
            if(inf.w <= 0) continue;
            dx += inf.vx * g * inf.w;
            dy += inf.vy * g * inf.w - b.r * sag * inf.w;
            dz += inf.vz * g * inf.w;
            ws += inf.w;
        }
        if(ws > 1) { dx /= ws; dy /= ws; dz /= ws; }
        _p[_o] = x + dx; _p[_o + 1] = y + dy; _p[_o + 2] = z + dz;
    }
    //페인트는 모프를 하나만 쓴다. 몸 노드에만 붙이고, 옷은 같은 delta를 위치에 구워 따라온다
    static AttachBust(_mesh : CMesh, _a : IAvatarAnchor)
    {
        if(_a.bust.length == 0) return;
        for(const n of CAvatarCloth.SkinNodes(_mesh))
        {
            if(n.mData.morph != null && n.mData.morph.names.indexOf("bust") >= 0) continue;
            const g = CAvatarCloth.Geo(n.mData.ci);
            if(g == null) continue;
            const d = new Float32Array(g.count * 3), p = new Float32Array(3);
            let peak = 0;
            for(let i = 0; i < g.count; i++)
            {
                const o = i * 3;
                p[0] = g.pos[o]; p[1] = g.pos[o + 1]; p[2] = g.pos[o + 2];
                CAvatarShape.AddBust(_a, 1, p, 0);
                d[o] = p[0] - g.pos[o]; d[o + 1] = p[1] - g.pos[o + 1]; d[o + 2] = p[2] - g.pos[o + 2];
                peak = Math.max(peak, d[o] * d[o] + d[o + 1] * d[o + 1] + d[o + 2] * d[o + 2]);
            }
            if(peak < 1e-8) continue;
            const m = new CMeshMorph();
            m.names.push("bust");
            m.delta.Resize(d.length);
            m.delta.GetArray().set(d);
            n.mData.morph = m;
        }
    }
    static Apply(_a : IAvatarAnchor, _s : IAvatarShape, _p : Float32Array, _o : number)
    {
        CAvatarShape.AddBust(_a, _s.bust, _p, _o);
        CAvatarShape.Bulge(_a.belly, _s.belly, CAvatarShape.sBelly, _p, _o);
        CAvatarShape.Bulge(_a.hip, _s.hip, CAvatarShape.sHip, _p, _o);
        if(_s.eye != 1)
            for(const e of _a.eye)
            {
                const x = _p[_o], y = _p[_o + 1], z = _p[_o + 2];
                const dx = x - e.c[0], dy = y - e.c[1], dz = z - e.c[2];
                const d = Math.hypot(dx, dy, dz * 1.5), r0 = e.r * 0.45;
                const w = d <= r0 ? 1 : CAvatarShape.Fall(d - r0, e.r - r0);
                const s = w * (_s.eye - 1);
                _p[_o] = x + dx * s; _p[_o + 1] = y + dy * s; _p[_o + 2] = z + dz * s * 0.5;
            }
    }
    //이미 움직인 정점만 이웃 평균으로 당긴다. 안 움직인 정점까지 따라오게 하면 쇄골이 찢어진다
    private static Round(_ci : CMeshCreateInfo, _orig : ArrayLike<number>, _p : Float32Array)
    {
        const ib = _ci.GetVFType(CVertexFormat.eIdentifier.Index)[0];
        if(ib == null || ib.bufI == null) return;
        const idx = ib.bufI, nv = _p.length / 3;
        for(let pass = 0; pass < 3; pass++)
        {
            const acc = new Float32Array(_p.length);
            const cnt = new Uint16Array(nv);
            for(let i = 0; i + 2 < idx.length; i += 3)
            {
                const t0 = idx[i], t1 = idx[i + 1], t2 = idx[i + 2];
                if(t0 >= nv || t1 >= nv || t2 >= nv) continue;
                const add = (_a : number, _b : number) =>
                {
                    acc[_a * 3] += _p[_b * 3]; acc[_a * 3 + 1] += _p[_b * 3 + 1]; acc[_a * 3 + 2] += _p[_b * 3 + 2];
                    cnt[_a]++;
                };
                add(t0, t1); add(t0, t2); add(t1, t0); add(t1, t2); add(t2, t0); add(t2, t1);
            }
            for(let i = 0; i < nv; i++)
            {
                if(cnt[i] < 3) continue;
                const dx = _p[i * 3] - _orig[i * 3], dy = _p[i * 3 + 1] - _orig[i * 3 + 1], dz = _p[i * 3 + 2] - _orig[i * 3 + 2];
                if(dx * dx + dy * dy + dz * dz < 1e-4) continue;
                const ax = acc[i * 3] / cnt[i], ay = acc[i * 3 + 1] / cnt[i], az = acc[i * 3 + 2] / cnt[i];
                const dev = Math.hypot(_p[i * 3] - ax, _p[i * 3 + 1] - ay, _p[i * 3 + 2] - az);
                if(dev < 0.2) continue;
                const t = Math.min(0.7, (dev - 0.2) / dev);
                _p[i * 3] += (ax - _p[i * 3]) * t;
                _p[i * 3 + 1] += (ay - _p[i * 3 + 1]) * t;
                _p[i * 3 + 2] += (az - _p[i * 3 + 2]) * t;
            }
        }
    }

    //메시의 모든 스킨 노드 위치를 변형한 새 위치 배열(노드 키 → 배열)
    static Positions(_mesh : CMesh, _a : IAvatarAnchor, _s : IAvatarShape) : Map<string, Float32Array>
    {
        const out = new Map<string, Float32Array>();
        for(const n of CAvatarCloth.SkinNodes(_mesh))
        {
            const ci = n.mData.ci, g = CAvatarCloth.Geo(ci);
            if(g == null) continue;
            const p = new Float32Array(g.count * 3);
            for(let i = 0; i < p.length; i++) p[i] = g.pos[i];
            for(let i = 0; i < g.count; i++) CAvatarShape.Apply(_a, _s, p, i * 3);
            CAvatarShape.Round(ci, g.pos, p);
            out.set(n.mKey, p);
        }
        return out;
    }
}
