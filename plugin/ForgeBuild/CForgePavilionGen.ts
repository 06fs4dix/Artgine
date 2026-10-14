import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeGiwaGen, IForgeGiwaBuf } from "./CForgeGiwaGen.js";

export interface IForgePavBuf extends IForgeGiwaBuf { pillar : CForgeMeshBuf; beam : CForgeMeshBuf; plank : CForgeMeshBuf; }

//누각(문루·포루·일주문 지붕 등): 마루, 둘레 기둥(주칠), 창방·공포 띠(녹색), 낮은 난간, 팔작 곡선 기와지붕
export class CForgePavilionGen
{
    static Bufs() : IForgePavBuf
    {
        return { pillar : new CForgeMeshBuf(), beam : new CForgeMeshBuf(), plank : new CForgeMeshBuf(), roof : new CForgeMeshBuf(), under : new CForgeMeshBuf(),
            edge : new CForgeMeshBuf(), ridge : new CForgeMeshBuf(), mortar : new CForgeMeshBuf(), gable : new CForgeMeshBuf() };
    }

    //중심 (cx, cz), 길이 방향 (ux, uz)의 L×D 누각. 마루 윗면 y0, 기둥 높이 h. sg는 지붕 팔작 비율(1이면 모임지붕).
    //_base가 있으면 기둥을 그 높이부터 세워 마루 아래를 비운 2층 누각(아래층은 통로)이 된다
    static Build(B : IForgePavBuf, _cx : number, _cz : number, _ux : number, _uz : number, _L : number, _D : number, _y0 : number, _h : number, _rail : boolean, _sg : number = 0.66, _base : number = null)
    {
        const vx = -_uz, vz = _ux, ang = Math.atan2(_uz, _ux), hl = _L * 0.5, hd = _D * 0.5, yt = _y0 + _h;
        const W = (_a : number, _b : number, _y : number) => [_cx + _ux * _a + vx * _b, _y, _cz + _uz * _a + vz * _b];
        CForgeShape.Box(B.plank, _cx, _cz, _L + 0.3, _D + 0.3, _y0 - 0.16, _y0, ang);
        const nl = Math.max(1, Math.round(_L / 2.4)), nd = Math.max(1, Math.round(_D / 2.4));
        for(let i = 0; i <= nl; i++)
            for(let j = 0; j <= nd; j++)
            {
                if(i != 0 && i != nl && j != 0 && j != nd) continue;
                const p = W(-hl + _L * i / nl, -hd + _D * j / nd, 0);
                CForgeShape.Prism(B.pillar, p[0], p[2], 0.17, 0.15, _base ?? _y0, yt, 8);
            }
        for(const s of [-1, 1])
        {
            const pu = W(0, s * hd, 0), pv = W(s * hl, 0, 0);
            CForgeShape.Box(B.beam, pu[0], pu[2], _L + 0.34, 0.24, yt - 0.42, yt, ang);
            CForgeShape.Box(B.beam, pv[0], pv[2], 0.24, _D + 0.34, yt - 0.42, yt, ang);
            if(!_rail) continue;
            for(const [y0, y1] of [[_y0 + 0.08, _y0 + 0.18], [_y0 + 0.72, _y0 + 0.8]])
            {
                CForgeShape.Box(B.pillar, pu[0], pu[2], _L, 0.09, y0, y1, ang);
                CForgeShape.Box(B.pillar, pv[0], pv[2], 0.09, _D, y0, y1, ang);
            }
        }
        if(_rail)
        {
            const Post = (_a : number, _b : number) => { const p = W(_a, _b, 0); CForgeShape.Box(B.pillar, p[0], p[2], 0.07, 0.07, _y0 + 0.18, _y0 + 0.72, ang); };
            for(let k = 1, n = Math.round(_L / 0.5); k < n; k++) for(const s of [-1, 1]) Post(-hl + _L * k / n, s * hd);
            for(let k = 1, n = Math.round(_D / 0.5); k < n; k++) for(const s of [-1, 1]) Post(s * hl, -hd + _D * k / n);
        }
        //공포: 창방 위로 두 단 내민 받침을 0.75m마다
        CForgeShape.Box(B.pillar, _cx, _cz, _L + 0.3, _D + 0.3, yt, yt + 0.14, ang);
        for(const s of [-1, 1])
        {
            for(let k = 0, n = Math.max(2, Math.round(_L / 0.75)); k <= n; k++)
            {
                const p = W(-hl + _L * k / n, s * hd, 0);
                CForgeShape.Box(B.beam, p[0], p[2], 0.24, 0.6, yt + 0.14, yt + 0.32, ang);
                CForgeShape.Box(B.beam, p[0], p[2], 0.24, 0.95, yt + 0.32, yt + 0.5, ang);
            }
            for(let k = 1, n = Math.max(2, Math.round(_D / 0.75)); k < n; k++)
            {
                const p = W(s * hl, -hd + _D * k / n, 0);
                CForgeShape.Box(B.beam, p[0], p[2], 0.6, 0.24, yt + 0.14, yt + 0.32, ang);
                CForgeShape.Box(B.beam, p[0], p[2], 0.95, 0.24, yt + 0.32, yt + 0.5, ang);
            }
        }
        const alongU = _L >= _D, hw = (alongU ? _D : _L) * 0.5, ha = (alongU ? _L : _D) * 0.5, ye = yt + 0.45;
        const Wr = alongU ? W : (_a : number, _b : number, _y : number) => W(_b, _a, _y);
        CForgeGiwaGen.Roof(B, Wr, -ha - 0.15, ha + 0.15, -hw - 0.15, hw + 0.15, ye, ye + 0.7 + hw * 0.85,
            { e : 0.95 + hw * 0.12, lift : 0.5, bulge : 0.35, sg : _sg, prof : 1.6, T : 0.28, tile : true, nu : 12, ns : 6 });
    }

    static Parts(B : IForgePavBuf, T : CForgeTheme, _seed : number) : IForgePart[]
    {
        const rc = T.mRoof[_seed % T.mRoof.length], tile = T.mCulture == CForgeTheme.eCulture.Japan ? CForgeTex.sKawara : CForgeTex.sGiwa;
        return [
            { buf : B.pillar, rgb : T.mPillar, tex : CForgeTex.sWood }, { buf : B.beam, rgb : T.mBeam, tex : CForgeTex.sWood },
            { buf : B.plank, rgb : T.mWood.map(_v => Math.min(1, _v * 1.2)), tex : CForgeTex.sPlank },
            { buf : B.roof, rgb : rc, tex : tile }, { buf : B.under, rgb : T.mBeam, tex : CForgeTex.sWood },
            { buf : B.edge, rgb : rc.map(_v => _v * 0.75), tex : tile }, { buf : B.ridge, rgb : rc.map(_v => _v * 0.82), tex : tile },
            { buf : B.mortar, rgb : [0.9, 0.89, 0.85], tex : CForgeTex.sPlaster }, { buf : B.gable, rgb : T.mPillar, tex : CForgeTex.sWood },
        ].filter(_p => _p.buf.mIdx.length > 0);
    }
}
