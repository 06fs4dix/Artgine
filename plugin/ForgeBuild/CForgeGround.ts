import { ForgeGround } from "./CForgeShape.js";

//지면 높이는 호출자가 점마다 넣어 준 y로만 안다. 점 사이는 보간하고, 생성기는 기단을 지면 아래로 깊게 묻어 틈을 가린다
export class CForgeGround
{
    //[x, z, y] 점들의 역거리 가중 보간(집·탑처럼 점이 몇 개뿐인 경우)
    static Points(_p : number[][]) : ForgeGround
    {
        if(_p.length == 0) return () => 0;
        if(_p.length == 1) { const y = _p[0][2]; return () => y; }
        return (_x : number, _z : number) =>
        {
            let s = 0, w = 0;
            for(const q of _p)
            {
                const d2 = (q[0] - _x) * (q[0] - _x) + (q[1] - _z) * (q[1] - _z);
                if(d2 < 1e-8) return q[2];
                const k = 1 / d2;
                s += q[2] * k; w += k;
            }
            return s / w;
        };
    }
    //[x, z, y] 폴리라인에서 가장 가까운 선분 위 y(벽·길·울타리)
    static Line(_p : number[][]) : ForgeGround
    {
        if(_p.length < 2) return CForgeGround.Points(_p);
        return (_x : number, _z : number) =>
        {
            let best = Infinity, y = _p[0][2];
            for(let i = 0; i + 1 < _p.length; i++)
            {
                const a = _p[i], b = _p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
                const t = l2 > 0 ? Math.min(1, Math.max(0, ((_x - a[0]) * dx + (_z - a[1]) * dz) / l2)) : 0;
                const d = Math.hypot(_x - a[0] - dx * t, _z - a[1] - dz * t);
                if(d < best) { best = d; y = a[2] + (b[2] - a[2]) * t; }
            }
            return y;
        };
    }
}
