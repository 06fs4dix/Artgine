import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeGiwaGen, IForgeGiwaBuf } from "./CForgeGiwaGen.js";

export interface IForgeHallBuf extends IForgeGiwaBuf { stone : CForgeMeshBuf; pillar : CForgeMeshBuf; wall : CForgeMeshBuf; door : CForgeMeshBuf; beam : CForgeMeshBuf; }

//중국 전각(성루·각루·대웅보전 공용): 돌 기단 위 붉은 벽 몸체(긴 면은 칸마다 격자문), 둘레 회랑 기둥 줄, 기둥 위 청록 단청 들보와 두공 받침.
//겹처마면 아래는 회랑을 덮는 우진각 차양(몸체가 뚫고 올라간다) + 위는 팔작, 홑처마면 회랑까지 덮는 팔작 하나. 처마 끝이 크게 들리고 용마루 양끝에 높은 치문
export class CForgeChineseHallGen
{
    static sGallery = 0.9;

    static Bufs() : IForgeHallBuf
    {
        return { stone : new CForgeMeshBuf(), pillar : new CForgeMeshBuf(), wall : new CForgeMeshBuf(), door : new CForgeMeshBuf(), beam : new CForgeMeshBuf(),
            roof : new CForgeMeshBuf(), under : new CForgeMeshBuf(), edge : new CForgeMeshBuf(), ridge : new CForgeMeshBuf(), mortar : new CForgeMeshBuf(), gable : new CForgeMeshBuf() };
    }
    //전체 L×D(회랑 포함), 바닥 _y0, 회랑 기둥 높이 _h. 몸체 크기 l×d, 아래 처마 ye1·용마루 yr1, 몸체 윗선 top, 위 처마 ye2·용마루 yr2
    static Dim(_L : number, _D : number, _y0 : number, _h : number, _double : boolean)
    {
        const g = CForgeChineseHallGen.sGallery, l = Math.max(1.6, _L - g * 2), d = Math.max(1.6, _D - g * 2), hw = Math.min(l, d) * 0.5, hwo = Math.min(_L, _D) * 0.5;
        const ye1 = _y0 + _h + 0.35, yr1 = ye1 + (hwo + 0.8) * 0.42;
        const top = _double ? Math.max(yr1 + 0.6, ye1 + 1.6) : _y0 + _h, ye2 = top + 0.35;
        return { g, l, d, hw : _double ? hw : hwo, ye1, yr1, top, ye2, yr2 : ye2 + 0.7 + (_double ? hw : hwo) * 0.85 };
    }
    //바닥에서 맨 위 치문까지 높이(충돌체도 쓴다)
    static Height(_L : number, _D : number, _h : number, _double : boolean) : number { return CForgeChineseHallGen.Dim(_L, _D, 0, _h, _double).yr2 + 1.0; }

    //_lift : 처마 들림 배율(남방 1.5 · 송 0.55)
    static Build(B : IForgeHallBuf, _cx : number, _cz : number, _ux : number, _uz : number, _L : number, _D : number, _y0 : number, _h : number, _double : boolean, _lift : number = 1)
    {
        const vx = -_uz, vz = _ux, ang = Math.atan2(_uz, _ux), M = CForgeChineseHallGen.Dim(_L, _D, _y0, _h, _double), { l, d } = M;
        const W = (_a : number, _b : number) => [_cx + _ux * _a + vx * _b, _cz + _uz * _a + vz * _b];
        const V3 = (_a : number, _b : number, _y : number) => { const q = W(_a, _b); return [q[0], _y, q[1]]; };
        CForgeShape.Box(B.stone, _cx, _cz, _L + 0.5, _D + 0.5, _y0 - 0.35, _y0, ang);
        CForgeShape.Box(B.wall, _cx, _cz, l, d, _y0, M.top, ang);
        //몸체 긴 면: 칸마다 격자문(칸 사이 기둥), 짧은 면: 가운데 격자창
        const nb = Math.max(1, Math.round(l / 2.2)), bw = l / nb, dy1 = Math.min(_y0 + _h - 0.3, _y0 + 3.2);
        for(const sd of [-1, 1])
        {
            for(let k = 0; k <= nb; k++) { const q = W(-l * 0.5 + bw * k, sd * d * 0.5); CForgeShape.Prism(B.pillar, q[0], q[1], 0.17, 0.16, _y0, M.top, 8); }
            for(let k = 0; k < nb; k++)
            {
                const bc = -l * 0.5 + bw * (k + 0.5), hw = bw * 0.5 - 0.2, bf = sd * (d * 0.5 + 0.01), y0 = _y0 + 0.12;
                B.door.Quad([V3(bc - hw, bf, y0), V3(bc + hw, bf, y0), V3(bc + hw, bf, dy1), V3(bc - hw, bf, dy1)], [[64, y0], [64 + hw * 2, y0], [64 + hw * 2, dy1], [64, dy1]], [vx * sd, 0, vz * sd]);
            }
            const ww = Math.min(1.4, d * 0.4), y0 = _y0 + 1.0, af = sd * (l * 0.5 + 0.01);
            B.door.Quad([V3(af, -ww * 0.5, y0), V3(af, ww * 0.5, y0), V3(af, ww * 0.5, dy1), V3(af, -ww * 0.5, dy1)], [[64, y0], [64 + ww, y0], [64 + ww, dy1], [64, dy1]], [_ux * sd, 0, _uz * sd]);
        }
        //회랑 기둥 줄과 그 위 들보·두공
        const nl = Math.max(1, Math.round(_L / 2.2)), nd = Math.max(1, Math.round(_D / 2.2));
        for(let i = 0; i <= nl; i++)
            for(let j = 0; j <= nd; j++)
            {
                if(i != 0 && i != nl && j != 0 && j != nd) continue;
                const q = W(-_L * 0.5 + _L * i / nl, -_D * 0.5 + _D * j / nd);
                CForgeShape.Prism(B.pillar, q[0], q[1], 0.17, 0.16, _y0, _y0 + _h, 8);
            }
        CForgeChineseHallGen.Bracket(B, W, _L, _D, _y0 + _h, ang);
        const Wr = (_l : number, _d : number) => _l >= _d ? V3 : (_a : number, _b : number, _y : number) => V3(_b, _a, _y);
        const Ext = (_l : number, _d : number) => [Math.max(_l, _d) * 0.5, Math.min(_l, _d) * 0.5];
        if(_double)
        {
            const [ha, hb] = Ext(_L, _D);
            CForgeGiwaGen.Roof(B, Wr(_L, _D), -ha - 0.1, ha + 0.1, -hb - 0.1, hb + 0.1, M.ye1, M.yr1, { e : 0.8, lift : 0.45 * _lift, bulge : 0.25 * _lift, sg : 1, prof : 1.5, T : 0.25, tile : true, nu : 12, ns : 5, endH : 0.3 });
            CForgeChineseHallGen.Bracket(B, W, l, d, M.top, ang);
        }
        const [la, lb] = _double ? [l, d] : [_L, _D], [ha, hb] = Ext(la, lb);
        CForgeGiwaGen.Roof(B, Wr(la, lb), -ha - 0.1, ha + 0.1, -hb - 0.1, hb + 0.1, M.ye2, M.yr2,
            { e : 0.9 + M.hw * 0.2, lift : 0.85 * _lift, bulge : 0.45 * _lift, sg : 0.55, prof : _lift < 1 ? 1.4 : 1.8, T : 0.3, tile : true, nu : 14, ns : 7, endH : 0.9 });
    }
    //기둥 윗선(_y)의 청록 들보 띠 + 0.6m마다 두 단 내민 두공
    private static Bracket(B : IForgeHallBuf, W : (_a : number, _b : number) => number[], _L : number, _D : number, _y : number, _ang : number)
    {
        const c = W(0, 0);
        CForgeShape.Box(B.beam, c[0], c[1], _L + 0.12, _D + 0.12, _y - 0.45, _y, _ang);
        CForgeShape.Box(B.pillar, c[0], c[1], _L + 0.3, _D + 0.3, _y, _y + 0.1, _ang);
        for(const s of [-1, 1])
        {
            for(let k = 0, n = Math.max(2, Math.round(_L / 0.6)); k <= n; k++)
            {
                const q = W(-_L * 0.5 + _L * k / n, s * _D * 0.5);
                CForgeShape.Box(B.beam, q[0], q[1], 0.2, 0.55, _y + 0.1, _y + 0.26, _ang);
                CForgeShape.Box(B.beam, q[0], q[1], 0.2, 0.85, _y + 0.26, _y + 0.4, _ang);
            }
            for(let k = 1, n = Math.max(2, Math.round(_D / 0.6)); k < n; k++)
            {
                const q = W(s * _L * 0.5, -_D * 0.5 + _D * k / n);
                CForgeShape.Box(B.beam, q[0], q[1], 0.55, 0.2, _y + 0.1, _y + 0.26, _ang);
                CForgeShape.Box(B.beam, q[0], q[1], 0.85, 0.2, _y + 0.26, _y + 0.4, _ang);
            }
        }
    }

    //_rc : 지붕 색(사찰은 노란 유리기와, 성루는 회색 기와)
    static Parts(B : IForgeHallBuf, T : CForgeTheme, _rc : number[]) : IForgePart[]
    {
        return [
            { buf : B.stone, rgb : T.mStone, tex : CForgeTex.sStone }, { buf : B.wall, rgb : T.mPillar.map(_v => _v * 0.92), tex : CForgeTex.sPlaster },
            { buf : B.pillar, rgb : T.mPillar, tex : CForgeTex.sWood }, { buf : B.door, rgb : T.mPillar.map(_v => _v * 0.85), tex : CForgeTex.sChuang },
            { buf : B.beam, rgb : T.mBeam, tex : CForgeTex.sWood }, { buf : B.roof, rgb : _rc, tex : CForgeTex.sGiwa }, { buf : B.under, rgb : T.mBeam, tex : CForgeTex.sWood },
            { buf : B.edge, rgb : _rc.map(_v => _v * 0.8), tex : CForgeTex.sGiwa }, { buf : B.ridge, rgb : _rc.map(_v => _v * 0.85), tex : CForgeTex.sGiwa },
            { buf : B.mortar, rgb : _rc.map(_v => _v * 0.9), tex : CForgeTex.sGiwa }, { buf : B.gable, rgb : T.mPillar, tex : CForgeTex.sWood },
        ].filter(_p => _p.buf.mIdx.length > 0);
    }
}
