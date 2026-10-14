import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeGiwaGen, IForgeGiwaBuf } from "./CForgeGiwaGen.js";

export interface IForgeYaguraBuf extends IForgeGiwaBuf { plaster : CForgeMeshBuf; board : CForgeMeshBuf; wood : CForgeMeshBuf; dark : CForgeMeshBuf; }

//일본 성의 망루(櫓, 문루·모서리 망루): 층마다 흰 회벽(아래쪽은 검은 판벽) + 격자 창·狭間(총구멍).
//아래층은 우진각 차양 지붕(위층 몸체가 뚫고 올라가 지붕 가운데를 가린다), 맨 위는 팔작 기와지붕. 처마 밑까지 흰 회칠
export class CForgeYaguraGen
{
    static sShrink = 0.17;

    static Bufs() : IForgeYaguraBuf
    {
        return { plaster : new CForgeMeshBuf(), board : new CForgeMeshBuf(), wood : new CForgeMeshBuf(), dark : new CForgeMeshBuf(), roof : new CForgeMeshBuf(), under : new CForgeMeshBuf(),
            edge : new CForgeMeshBuf(), ridge : new CForgeMeshBuf(), mortar : new CForgeMeshBuf(), gable : new CForgeMeshBuf() };
    }
    //층 k의 바닥 높이·크기(위층일수록 줄어든다)
    static Floor(_L : number, _D : number, _y0 : number, _h : number, _k : number) { const f = 1 - CForgeYaguraGen.sShrink * _k; return { L : _L * f, D : _D * f, y : _y0 + _h * _k }; }
    //바닥에서 맨 위 용마루 장식까지 높이(충돌체도 쓴다)
    static Height(_L : number, _D : number, _floors : number, _h : number) : number
    {
        const t = CForgeYaguraGen.Floor(_L, _D, 0, _h, _floors - 1);
        return t.y + _h - 0.08 + 0.5 + Math.min(t.L, t.D) * 0.5 * 0.75 + 0.62;
    }

    //중심 (cx, cz), 길이 방향 (ux, uz)의 L×D 망루를 바닥 _y0부터 _floors층(층 높이 _h)
    static Build(B : IForgeYaguraBuf, _cx : number, _cz : number, _ux : number, _uz : number, _L : number, _D : number, _y0 : number, _floors : number, _h : number = 2.5)
    {
        const vx = -_uz, vz = _ux, ang = Math.atan2(_uz, _ux);
        const V3 = (_a : number, _b : number, _y : number) => [_cx + _ux * _a + vx * _b, _y, _cz + _uz * _a + vz * _b];
        for(let k = 0; k < _floors; k++)
        {
            const F = CForgeYaguraGen.Floor(_L, _D, _y0, _h, k), y = F.y, yt = y + _h, last = k == _floors - 1, yb = y - (k == 0 ? 0.3 : 0.5);
            CForgeShape.Box(B.plaster, _cx, _cz, F.L, F.D, yb, yt, ang);
            CForgeShape.Box(B.board, _cx, _cz, F.L + 0.04, F.D + 0.04, yb, y + _h * 0.38, ang);
            //긴 변은 칸마다 창, 창 사이 판벽에 총구멍. 짧은 변은 넓으면 가운데 창 하나
            for(const [along, half, other] of [[true, F.L * 0.5, F.D * 0.5], [false, F.D * 0.5, F.L * 0.5]] as [boolean, number, number][])
            {
                const n = along ? Math.max(1, Math.round(F.L / 2.2)) : half * 2 > 2.6 ? 1 : 0;
                for(const sd of [-1, 1])
                    for(let j = 0; j < n; j++)
                    {
                        const t = -half + half * 2 * (j + 0.5) / n, W = (_t : number, _o : number) => along ? V3(_t, sd * (other + _o), 0) : V3(sd * (other + _o), _t, 0);
                        const tx = along ? _ux : vx, tz = along ? _uz : vz, nx = along ? vx * sd : _ux * sd, nz = along ? vz * sd : _uz * sd;
                        const p = W(t, 0), wy = y + _h * 0.62, ww = 0.9, wh = 0.72;
                        CForgeShape.Decal(B.dark, p[0], wy, p[2], tx, tz, nx, nz, ww, wh);
                        for(let b = 0; b < 5; b++) { const q = W(t - ww * 0.5 + ww * (b + 0.5) / 5, 0.04); CForgeShape.Box(B.plaster, q[0], q[2], 0.05, 0.05, wy - wh * 0.5, wy + wh * 0.5, Math.atan2(tz, tx)); }
                        const sill = W(t, 0.06);
                        CForgeShape.Box(B.plaster, sill[0], sill[2], ww + 0.24, 0.12, wy - wh * 0.5 - 0.1, wy - wh * 0.5, Math.atan2(tz, tx));
                        if(!along) continue;
                        const h = W(t + half / n, 0.02);
                        if(j + 1 < n) CForgeShape.Decal(B.dark, h[0], y + _h * 0.2, h[2], tx, tz, nx, nz, 0.18, 0.18);
                    }
            }
            const alongU = F.L >= F.D, ha = (alongU ? F.L : F.D) * 0.5, hb = (alongU ? F.D : F.L) * 0.5, ye = yt - 0.08;
            const Wr = alongU ? V3 : (_a : number, _b : number, _y : number) => V3(_b, _a, _y);
            if(!last) CForgeGiwaGen.Roof(B, Wr, -ha, ha, -hb, hb, ye, ye + (hb + 0.8) * 0.5, { e : 0.8, lift : 0.15, bulge : 0.08, sg : 1, prof : 1.25, T : 0.22, tile : true, nu : 10, ns : 5 });
            else CForgeGiwaGen.Roof(B, Wr, -ha, ha, -hb, hb, ye, ye + 0.5 + hb * 0.75, { e : 0.85, lift : 0.18, bulge : 0.08, sg : 0.55, prof : 1.3, T : 0.24, tile : true, nu : 12, ns : 6 });
        }
    }

    static Parts(B : IForgeYaguraBuf, T : CForgeTheme, _seed : number) : IForgePart[]
    {
        const rc = T.mRoof[_seed % T.mRoof.length], wall = T.mTowerBody;
        return [
            { buf : B.plaster, rgb : wall, tex : CForgeTex.sPlaster }, { buf : B.board, rgb : T.mBoard, tex : CForgeTex.sShitami },
            { buf : B.wood, rgb : T.mWood, tex : CForgeTex.sWood }, { buf : B.dark, rgb : T.mDark },
            { buf : B.roof, rgb : rc, tex : CForgeTex.sKawara }, { buf : B.under, rgb : wall.map(_v => _v * 0.92), tex : CForgeTex.sPlaster },
            { buf : B.edge, rgb : wall, tex : CForgeTex.sPlaster }, { buf : B.ridge, rgb : rc.map(_v => _v * 0.85), tex : CForgeTex.sKawara },
            { buf : B.mortar, rgb : [0.9, 0.89, 0.85], tex : CForgeTex.sPlaster }, { buf : B.gable, rgb : wall, tex : CForgeTex.sPlaster },
        ].filter(_p => _p.buf.mIdx.length > 0);
    }
}
