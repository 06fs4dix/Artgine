import { ForgeV2 } from "./CForgeScene.js";
import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeShape, ForgeGround } from "./CForgeShape.js";
import { IForgeChurchR } from "./CForgeAdjust.js";
import { CForgeBridgeGen } from "./CForgeBridgeGen.js";
import { CForgeOpening } from "./CForgeOpening.js";
import { CForgeTempleGen } from "./CForgeTempleGen.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeArabGen } from "./CForgeArabGen.js";
import { CForgeEgyptGen } from "./CForgeEgyptGen.js";
import { CForgeIncaGen } from "./CForgeIncaGen.js";
import { CForgeAfricaGen } from "./CForgeAfricaGen.js";
import { CForgeHutGen } from "./CForgeHutGen.js";

//교회 생성기. 로컬 축 a(정문 방향 u)·b(왼쪽 v). 뒤에서부터 반원 앱스 → 본당 → 종탑(정문)
export class CForgeChurchGen
{
    static sPitch = 1.15;
    static sGlass = [0.5, 0.58, 0.72];
    static sPorch = 1.3;
    static sCopper = [0.36, 0.56, 0.48];

    //본당 벽 높이·종탑 한 변·종탑 높이 등 생성기와 충돌체가 같이 쓰는 치수
    static Dim(_r : IForgeChurchR, _g : ForgeGround)
    {
        //정문 현관이 긴 면 밖으로 PD만큼 나오므로 본당을 반대쪽으로 밀고 폭을 줄여 현관까지 부지 안에 들게 한다
        const { u, L, fs } = _r, v : ForgeV2 = [-u[1], u[0]], PD = CForgeChurchGen.sPorch, W = Math.max(5, _r.W - PD);
        const o : ForgeV2 = [_r.o[0] - v[0] * fs * PD * 0.5, _r.o[1] - v[1] * fs * PD * 0.5];
        const P = (_a : number, _b : number) : ForgeV2 => [o[0] + u[0] * _a + v[0] * _b, o[1] + u[1] * _a + v[1] * _b];
        let gmin = Infinity, gmax = -Infinity;
        for(const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const q = P(a * L * 0.5, b * W * 0.5), g = _g(q[0], q[1]); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
        const floor = gmax + 0.2, H = W * 0.8 + 1.6, ts = Math.min(5, W * 0.6), ra = W * 0.42;
        const uBack = -L * 0.5 + ra, uTower = L * 0.5 - ts, ridge = floor + H + W * 0.5 * CForgeChurchGen.sPitch;
        return { v, P, W, fs, base : gmin - 0.6, floor, H, ts, ra, uBack, uTower, ridge, top : ridge + Math.max(2, ts * 0.9), ang : Math.atan2(u[1], u[0]) };
    }

    //교회 변형 공용 로컬 틀: a = 긴 축 u(정면 쪽 +), b = v. 지면 최저·최고
    static Frame(_r : IForgeChurchR, _g : ForgeGround)
    {
        const { o, u, L, W } = _r, v : ForgeV2 = [-u[1], u[0]];
        const P = (_a : number, _b : number) : ForgeV2 => [o[0] + u[0] * _a + v[0] * _b, o[1] + u[1] * _a + v[1] * _b];
        let gmin = Infinity, gmax = -Infinity;
        for(const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const q = P(a * L * 0.5, b * W * 0.5), g = _g(q[0], q[1]); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
        const V3 = (_a : number, _b : number, _y : number) => { const q = P(_a, _b); return [q[0], _y, q[1]]; };
        return { v, P, V3, base : gmin - 0.6, floor : gmax + 0.2, ang : Math.atan2(u[1], u[0]) };
    }
    //변형 교회 치수(생성기·충돌체 공용). 돔: 본당 폭 wn·높이 hn, 교차부 중심 ac·한 변 cw, 드럼 반지름 rd, 돔 바닥 yd. 로마네스크: 본당 b 중심 nb·폭 wn, 종탑 한 변 ts·중심 tb·높이 th
    static Var(_r : IForgeChurchR, _g : ForgeGround)
    {
        const F = CForgeChurchGen.Frame(_r, _g), { L, W, fs } = _r, T = CForgeTheme.Of(_r);
        const wn = Math.min(W * 0.62, 7.5), hn = wn * 0.9 + 2.2, ac = -L * 0.18, cw = Math.min(W, wn + 3), rd = cw * 0.4, yd = F.floor + hn + 2.2 + rd * 0.5;
        const ts = Math.min(4, W * 0.36), nwR = Math.max(4, W - ts - 0.6), nb = fs * (W * 0.5 - nwR * 0.5), tb = -fs * (W * 0.5 - ts * 0.5), th = Math.min(22, (nwR * 0.8 + 2) * 2.2);
        return { ...F, kind : T.mChurch, wn, hn, ac, cw, rd, yd, ts, nwR, nb, tb, th, hr : nwR * 0.8 + 2 };
    }
    //아랍·이집트·남미·아프리카·몽골 교회 자리(mChurch 4~): 모스크·신전·대울타리·족장 대형 집
    static World(_r : IForgeChurchR, _g : ForgeGround, T : CForgeTheme) : IForgePart[]
    {
        const F = CForgeChurchGen.Frame(_r, _g), k = T.mChurch;
        if(k == 4) return CForgeArabGen.Mosque(_r, _g, F);
        if(k == 5) return CForgeEgyptGen.Temple(_r, F);
        if(k == 6) return CForgeAfricaGen.Mosque(_r, _g, F);
        if(k == 7) return CForgeIncaGen.Temple(_r, _g, F);
        if(k == 8) return CForgeAfricaGen.Enclosure(_r, _g, F);
        return CForgeHutGen.Great(_r, _g, F);
    }
    static WorldHull(_r : IForgeChurchR, _g : ForgeGround, T : CForgeTheme) : number[][]
    {
        const F = CForgeChurchGen.Frame(_r, _g), k = T.mChurch;
        if(k == 4) return CForgeArabGen.MosqueHull(_r, F);
        if(k == 5) return CForgeEgyptGen.TempleHull(_r, F);
        if(k == 6) return CForgeAfricaGen.MosqueHull(_r, F);
        if(k == 7) return CForgeIncaGen.TempleHull(_r, _g, F);
        if(k == 8) return CForgeAfricaGen.EnclosureHull(_r, F);
        return CForgeHutGen.GreatHull(_r, _g, F);
    }
    //변형 교회 충돌 상자 [중심 a, 중심 b, 반길이, 반폭, 아래, 위]
    static Hull(_r : IForgeChurchR, _g : ForgeGround) : number[][]
    {
        const TW = CForgeTheme.Of(_r);
        if(TW.mChurch >= 4) return CForgeChurchGen.WorldHull(_r, _g, TW);
        const D = CForgeChurchGen.Var(_r, _g), { L, W } = _r, b0 = D.base, f = D.floor;
        if(D.kind == 3) return [[0, 0, L * 0.5, D.wn * 0.5 + 0.3, b0, f + D.hn + D.wn * 0.19 + 0.3], [D.ac, 0, D.cw * 0.5, D.cw * 0.5, b0, D.yd], [D.ac, 0, D.rd + 0.12, D.rd + 0.12, D.yd, D.yd + D.rd * 1.65]];
        if(D.kind == 2)
        {
            const ra = D.nwR * 0.4;
            return [[ra * 0.5, D.nb, (L - ra) * 0.5 + ra, D.nwR * 0.5 + 0.3, b0, f + D.hr + D.nwR * 0.21 + 0.2], [-L * 0.5 + D.ts * 0.5 + 0.3, D.tb, D.ts * 0.5, D.ts * 0.5, b0, f + D.th + D.ts * 0.45]];
        }
        //스타브: 회랑 포함 아래 칸, 몸체·지붕, 윗단·탑
        const nw = Math.min(W * 0.6, 6.5), nl = L * 0.6, na = L * 0.08, ry = f + 3.2 + nw * 0.75, ry2 = ry + 0.2 + nw * 0.29 * 1.7;
        return [[na - L * 0.1, 0, nl * 0.5 + L * 0.1, nw * 0.5 + 1.2, b0, f + 2.4], [na, 0, nl * 0.5, nw * 0.5, b0, ry], [na, 0, nl * 0.25, nw * 0.29, ry - 1.2, ry2], [na, 0, 0.8, 0.8, ry2, ry2 + 1.4 + nw * 0.26 * 2.8]];
    }

    static Build(_r : IForgeChurchR, _g : ForgeGround) : IForgePart[]
    {
        const T = CForgeTheme.Of(_r), wood = CForgeBridgeGen.IsWood(_r) || T.mChurchMat == 1 || T.mChurchMat == 3, { u, L } = _r;
        if(T.Temple()) return CForgeTempleGen.Build(_r, _g);
        if(T.mChurch >= 4) return CForgeChurchGen.World(_r, _g, T);
        if(T.mChurch == 1) return CForgeChurchGen.Stave(_r, _g, T);
        if(T.mChurch == 2) return CForgeChurchGen.Romanesque(_r, _g, T);
        if(T.mChurch == 3) return CForgeChurchGen.Dome(_r, _g, T);
        const D = CForgeChurchGen.Dim(_r, _g), { v, P, W, fs, base, floor, H, ts, ra, uBack, uTower, ridge, top, ang } = D;
        const body = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), metal = new CForgeMeshBuf(), glass = new CForgeMeshBuf(), door = new CForgeMeshBuf();
        const V3 = (_a : number, _b : number, _y : number) => { const q = P(_a, _b); return [q[0], _y, q[1]]; };

        //본당
        const naveL = uTower - uBack, nc = P((uTower + uBack) * 0.5, 0);
        CForgeShape.Box(body, nc[0], nc[1], naveL + 0.02, W, base, floor + H, ang);
        CForgeShape.Box(trim, nc[0], nc[1], naveL + 0.2, W + 0.26, base, floor + 0.7, ang);
        const e = 0.5, k = CForgeChurchGen.sPitch, ye = floor + H - e * k, a0 = uBack - 0.4, a1 = uTower + 0.2;
        for(const s of [1, -1])
        {
            const q = [V3(a0, s * (W * 0.5 + e), ye), V3(a1, s * (W * 0.5 + e), ye), V3(a1, 0, ridge), V3(a0, 0, ridge)];
            const n = [v[0] * s * k, 1, v[1] * s * k];
            roof.Quad(q, null, n);
            roof.Quad(q, null, n.map(_x => -_x));
        }
        for(const [a, s] of [[uBack, -1], [uTower, 1]])
            body.Poly([V3(a, -W * 0.5, floor + H), V3(a, W * 0.5, floor + H), V3(a, 0, ridge - 0.05)], [u[0] * s, 0, u[1] * s]);

        //앱스
        const ac = P(uBack, 0), ah = floor + H * 0.78;
        //Prism은 UV가 0~1이라 돌 무늬가 늘어난다. m 단위 UV인 Extrude로 세운다
        const Ring = (_r : number) => CForgePoly.Orient(Array.from({ length : 14 }, (_v, _k) => [ac[0] + Math.cos(_k / 14 * Math.PI * 2) * _r, ac[1] + Math.sin(_k / 14 * Math.PI * 2) * _r] as ForgeV2));
        CForgeShape.Extrude(body, Ring(ra), base, ah);
        CForgeShape.Extrude(trim, Ring(ra + 0.13), base, floor + 0.7);
        CForgeShape.Cone(roof, ac[0], ac[1], ra + 0.4, ah - 0.15, ra * 1.05, 14);
        const K = CForgeOpening.eKind, OB = { stone : trim, fill : glass, dark }, Belfry = { stone : trim, fill : dark, dark };
        for(const t of [-0.75, 0, 0.75])
        {
            const ca = Math.PI + t, nx = u[0] * Math.cos(ca) + v[0] * Math.sin(ca), nz = u[1] * Math.cos(ca) + v[1] * Math.sin(ca), rr = ra * Math.cos(Math.PI / 14);
            CForgeOpening.Window(OB, ac[0] + nx * rr, floor + H * 0.26, ac[1] + nz * rr, -nz, nx, nx, nz, 0.62, H * 0.4, K.Pointed);
        }

        //본당 옆: 버팀벽 사이마다 뾰족 아치 창(가운데 돌 세로대). 정문 쪽 긴 면은 현관 자리를 비운다
        const nb = Math.max(2, Math.round(naveL / 3.4)), step = naveL / nb, pa = (uTower + uBack) * 0.5, pw = Math.min(3.4, naveL * 0.32);
        const InPorch = (_a : number, _s : number, _pad : number) => _s == fs && Math.abs(_a - pa) < pw * 0.5 + _pad;
        for(const s of [1, -1])
        {
            const nx = v[0] * s, nz = v[1] * s;
            for(let i = 0; i < nb; i++)
            {
                const q = P(uBack + (i + 0.5) * step, s * W * 0.5);
                if(!InPorch(uBack + (i + 0.5) * step, s, 0.7)) CForgeOpening.Window(OB, q[0], floor + H * 0.3, q[1], u[0], u[1], nx, nz, Math.min(1.2, step * 0.36), H * 0.48, K.Pointed, true);
                if(i == 0 || wood || InPorch(uBack + i * step, s, 0.5)) continue;
                const b = P(uBack + i * step, s * W * 0.5);
                CForgeShape.Wedge(trim, b[0], b[1], u[0], u[1], nx, nz, 0.7, 1.0, 0.18, base, floor + H * 0.82);
            }
        }

        //정문 현관: 길 쪽 긴 면 가운데로 나온 박공 현관 + 뾰족 아치 정문(두 겹 문틀) + 박공의 둥근 창
        {
            const PD = CForgeChurchGen.sPorch, b0 = fs * W * 0.5, bf = fs * (W * 0.5 + PD), pc = P(pa, fs * (W * 0.5 + PD * 0.5)), ye2 = floor + 4.3, e2 = 0.3, k2 = 1.0;
            const rp = ye2 + pw * 0.5 * k2, nx = v[0] * fs, nz = v[1] * fs;
            CForgeShape.Box(body, pc[0], pc[1], pw, PD, base, ye2, ang);
            for(const s of [1, -1])
            {
                const q = [V3(pa + s * (pw * 0.5 + e2), b0 - fs * 0.1, ye2 - e2 * k2), V3(pa + s * (pw * 0.5 + e2), bf + fs * 0.3, ye2 - e2 * k2), V3(pa, bf + fs * 0.3, rp), V3(pa, b0 - fs * 0.1, rp)];
                const n = [u[0] * s * k2, 1, u[1] * s * k2];
                roof.Quad(q, null, n);
                roof.Quad(q, null, n.map(_x => -_x));
            }
            body.Poly([V3(pa - pw * 0.5, bf, ye2), V3(pa + pw * 0.5, bf, ye2), V3(pa, bf, rp - 0.05)], [nx, 0, nz]);
            //문·창은 현관 앞면에서 조금 띄운다(채움판이 벽면과 겹쳐 깜빡이지 않게)
            const fr = P(pa, bf + fs * 0.04);
            CForgeOpening.Door({ ...OB, door }, fr[0], floor, fr[1], u[0], u[1], nx, nz, Math.min(1.7, pw * 0.45), 3.0, K.Pointed, 2);
            CForgeOpening.Window(OB, fr[0], ye2 + 0.2, fr[1], u[0], u[1], nx, nz, 0.5, 0.6, K.Round);
        }

        //종탑: 몸체·띠·종루 창·첨탑·십자가(정문은 옆 현관으로 옮겨 끝면엔 높은 창만)
        const tc = P(L * 0.5 - ts * 0.5, 0);
        CForgeShape.Box(body, tc[0], tc[1], ts, ts, base, top, ang);
        CForgeShape.Box(trim, tc[0], tc[1], ts + 0.26, ts + 0.26, base, floor + 0.7, ang);
        CForgeShape.Box(trim, tc[0], tc[1], ts + 0.3, ts + 0.3, top - 0.28, top, ang);
        CForgeShape.Box(trim, tc[0], tc[1], ts + 0.18, ts + 0.18, ridge - 0.2, ridge, ang);
        for(const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        {
            const nx = u[0] * du + v[0] * dv, nz = u[1] * du + v[1] * dv;
            for(const off of [-0.2, 0.2])
                CForgeOpening.Window(Belfry, tc[0] + nx * ts * 0.5 - nz * ts * off, top - 2.3, tc[1] + nz * ts * 0.5 + nx * ts * off, -nz, nx, nx, nz, ts * 0.15, 1.7, K.Round);
        }
        const sq : ForgeV2[] = [P(L * 0.5 - ts, -ts * 0.5), P(L * 0.5, -ts * 0.5), P(L * 0.5, ts * 0.5), P(L * 0.5 - ts, ts * 0.5)];
        //첨탑, 또는 바로크 양파 모자(구리 녹색: 종 모양 → 잘록한 목 → 작은 등롱 → 작은 양파 → 바늘)
        const onion = T.mSpire == 1, sh = onion ? ts * 1.9 : ts * 2.3, cop = new CForgeMeshBuf();
        if(onion)
        {
            const r = ts * 0.5;
            CForgeTowerGen.Lathe(cop, tc[0], tc[1], [[r * 1.05, top], [r * 1.12, top + r * 0.35], [r * 0.95, top + r * 0.8], [r * 0.45, top + r * 1.15], [r * 0.32, top + r * 1.3],
                [r * 0.32, top + r * 1.75], [r * 0.5, top + r * 1.95], [r * 0.38, top + r * 2.25], [r * 0.12, top + r * 2.5], [0.06, top + r * 3.2], [0, top + sh]], 12);
            CForgeShape.Box(cop, tc[0], tc[1], ts + 0.1, ts + 0.1, top - 0.05, top + 0.05, ang);
        }
        else CForgeShape.Pyramid(roof, CForgePoly.Orient(sq), top, sh, 0.2);
        CForgeShape.Box(metal, tc[0], tc[1], 0.12, 0.12, top + sh - 0.1, top + sh + 1.3, ang);
        CForgeShape.Box(metal, tc[0], tc[1], 0.12, 0.75, top + sh + 0.75, top + sh + 0.87, ang);
        const fr = P(L * 0.5, 0);
        CForgeOpening.Window(OB, fr[0], floor + 2.4, fr[1], v[0], v[1], u[0], u[1], Math.min(1.1, ts * 0.26), 2.6, K.Pointed, true);

        const rc = T.mRoof[_r.seed % T.mRoof.length], mat = T.mChurchMat;
        const parts : IForgePart[] = mat == 3 ? [
            { buf : body, rgb : T.mClapboard[0], tex : CForgeTex.sShitami }, { buf : trim, rgb : [0.95, 0.95, 0.93], tex : CForgeTex.sPlaster },
            { buf : roof, rgb : rc, tex : CForgeTex.sTile },
        ] : wood ? [
            { buf : body, rgb : T.mPlankWall[_r.seed % T.mPlankWall.length], tex : CForgeTex.sPlank }, { buf : trim, rgb : T.mWallStone, tex : CForgeTex.sStone },
            { buf : roof, rgb : T.mShingle[_r.seed % T.mShingle.length], tex : CForgeTex.sShingle },
        ] : mat == 2 ? [
            { buf : body, rgb : T.mBrick, tex : CForgeTex.sBrickWall }, { buf : trim, rgb : T.mStone, tex : CForgeTex.sStone },
            { buf : roof, rgb : rc, tex : CForgeTex.sTile },
        ] : [
            { buf : body, rgb : T.mTowerBody, tex : CForgeTex.sStone }, { buf : trim, rgb : T.mWallStone, tex : CForgeTex.sStone },
            { buf : roof, rgb : rc, tex : CForgeTex.sTile },
        ];
        parts.push({ buf : dark, rgb : T.mDark }, { buf : metal, rgb : T.mMetal }, { buf : glass, rgb : CForgeChurchGen.sGlass, tex : CForgeTex.sGlass },
            { buf : door, rgb : T.mWood.map(_v => Math.min(1, _v * 1.15)), tex : CForgeTex.sPlank }, { buf : cop, rgb : CForgeChurchGen.sCopper, tex : CForgeTex.sPlank });
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //맞배 지붕 판(앞뒤 면, 아래에서도 보이게 양면) + 양끝 삼각 박공벽. a0~a1 용마루 방향, b = bc ± hw, 벽 윗선 ye, 경사 k, 처마 내밈 e
    private static Gable(_roof : CForgeMeshBuf, _wall : CForgeMeshBuf, F : { v : ForgeV2, V3 : (_a : number, _b : number, _y : number) => number[] }, _u : ForgeV2,
        a0 : number, a1 : number, bc : number, hw : number, ye : number, k : number, e : number) : number
    {
        const ry = ye + hw * k, { v, V3 } = F;
        for(const s of [1, -1])
        {
            const q = [V3(a0 - e * 0.4, bc + s * (hw + e), ye - e * k), V3(a1 + e * 0.4, bc + s * (hw + e), ye - e * k), V3(a1 + e * 0.4, bc, ry), V3(a0 - e * 0.4, bc, ry)];
            const n = [v[0] * s * k, 1, v[1] * s * k];
            _roof.Quad(q, null, n);
            _roof.Quad(q, null, n.map(_x => -_x));
        }
        for(const [a, s] of [[a0, -1], [a1, 1]]) _wall.Poly([V3(a, bc - hw, ye), V3(a, bc + hw, ye), V3(a, bc, ry - 0.04)], [_u[0] * s, 0, _u[1] * s]);
        return ry;
    }

    //스타브 교회(북유럽 중세): 검게 칠한 널판 몸체를 낮은 회랑(차양 지붕)이 두르고, 가파른 너와 지붕을 두 단으로 겹쳐 올려 그 위 작은 탑·첨탑, 박공 끝마다 용머리
    private static Stave(_r : IForgeChurchR, _g : ForgeGround, T : CForgeTheme) : IForgePart[]
    {
        const F = CForgeChurchGen.Frame(_r, _g), { L, W, u } = _r, { v, P, V3, base, floor, ang } = F;
        const body = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), metal = new CForgeMeshBuf();
        const nw = Math.min(W * 0.6, 6.5), nl = L * 0.6, na = L * 0.08, h1 = 3.2, k = 1.5;
        let q = P(na, 0);
        CForgeShape.Box(body, q[0], q[1], nl, nw, base, floor + h1, ang);
        const ry = CForgeChurchGen.Gable(roof, body, F, u, na - nl * 0.5, na + nl * 0.5, 0, nw * 0.5, floor + h1, k, 0.35);
        //내진(뒤쪽 작은 칸)
        const cl = L * 0.2, cwid = nw * 0.62, ca = na - nl * 0.5 - cl * 0.5;
        q = P(ca, 0);
        CForgeShape.Box(body, q[0], q[1], cl + 0.1, cwid, base, floor + h1 * 0.8, ang);
        CForgeChurchGen.Gable(roof, body, F, u, ca - cl * 0.5, ca + cl * 0.5, 0, cwid * 0.5, floor + h1 * 0.8, k, 0.3);
        //회랑: 몸체 둘레 낮은 판벽 + 몸체 벽에서 내려오는 차양
        const g = 1.0, gy0 = floor + 2.3, gy1 = floor + 1.5;
        for(const s of [1, -1])
        {
            q = P(na, s * (nw * 0.5 + g));
            CForgeShape.Box(trim, q[0], q[1], nl + g * 2, 0.12, base, floor + 1.0, ang);
            const r = [V3(na - nl * 0.5 - g, s * nw * 0.5, gy0), V3(na + nl * 0.5 + g, s * nw * 0.5, gy0), V3(na + nl * 0.5 + g, s * (nw * 0.5 + g + 0.2), gy1), V3(na - nl * 0.5 - g, s * (nw * 0.5 + g + 0.2), gy1)];
            const n = [v[0] * s * 0.8, 1, v[1] * s * 0.8];
            roof.Quad(r, null, n); roof.Quad(r, null, n.map(_x => -_x));
        }
        q = P(na + nl * 0.5 + g, 0);
        CForgeShape.Box(trim, q[0], q[1], 0.12, nw + g * 2, base, floor + 1.0, ang);
        //윗단: 지붕을 뚫고 올라온 좁은 몸체 + 더 가파른 지붕, 그 위 탑과 첨탑
        const uw = nw * 0.58, ul = nl * 0.5, y2 = ry + 0.2;
        q = P(na, 0);
        CForgeShape.Box(body, q[0], q[1], ul, uw, ry - 1.2, y2, ang);
        const ry2 = CForgeChurchGen.Gable(roof, body, F, u, na - ul * 0.5, na + ul * 0.5, 0, uw * 0.5, y2, 1.7, 0.25);
        const ts = Math.min(1.6, uw * 0.45);
        CForgeShape.Box(body, q[0], q[1], ts, ts, ry2 - 0.8, ry2 + 1.4, ang);
        const sq : ForgeV2[] = [P(na - ts * 0.5, -ts * 0.5), P(na + ts * 0.5, -ts * 0.5), P(na + ts * 0.5, ts * 0.5), P(na - ts * 0.5, ts * 0.5)];
        CForgeShape.Pyramid(roof, CForgePoly.Orient(sq), ry2 + 1.4, ts * 2.8, 0.25);
        CForgeShape.Box(metal, q[0], q[1], 0.08, 0.08, ry2 + 1.4 + ts * 2.7, ry2 + 1.4 + ts * 2.7 + 0.8, ang);
        //용머리: 박공 꼭대기에서 바깥 위로 휜 장식
        for(const [a, s, y] of [[na - nl * 0.5, -1, ry], [na + nl * 0.5, 1, ry], [na - ul * 0.5, -1, ry2], [na + ul * 0.5, 1, ry2]])
            CForgeTowerGen.Strut(trim, V3(a, 0, y - 0.1), V3(a + s * 0.9, 0, y + 0.8), 0.14);
        //문: 정면 끝 네모 문
        const fr = P(na + nl * 0.5 + 0.03, 0);
        CForgeOpening.Door({ stone : trim, fill : dark, dark, door : dark }, fr[0], floor, fr[1], v[0], v[1], u[0], u[1], 1.1, 2.3, CForgeOpening.eKind.Round, 1);
        const parts : IForgePart[] = [
            { buf : body, rgb : T.mWood.map(_v => _v * 0.72), tex : CForgeTex.sPlank }, { buf : roof, rgb : T.mShingle[_r.seed % T.mShingle.length], tex : CForgeTex.sShingle },
            { buf : trim, rgb : T.mWood, tex : CForgeTex.sWood }, { buf : dark, rgb : T.mDark }, { buf : metal, rgb : T.mMetal },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //로마네스크 교회(지중해 중세): 낮은 경사 테라코타 지붕의 본당, 정면 겹 반원 아치 문과 둥근 창, 반원 앱스, 옆으로 따로 선 네모 종탑(층 띠·쌍 아치 종루·낮은 모임지붕)
    private static Romanesque(_r : IForgeChurchR, _g : ForgeGround, T : CForgeTheme) : IForgePart[]
    {
        const D = CForgeChurchGen.Var(_r, _g), { L, u } = _r, { v, P, V3, base, floor, ang, nb, nwR : nw, ts, tb, th, hr : h } = D;
        const body = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), glass = new CForgeMeshBuf(), door = new CForgeMeshBuf(), metal = new CForgeMeshBuf();
        const ra = nw * 0.4, a0 = -L * 0.5 + ra, a1 = L * 0.5, k = 0.42, K = CForgeOpening.eKind, OB = { stone : trim, fill : glass, dark };
        let q = P((a0 + a1) * 0.5, nb);
        CForgeShape.Box(body, q[0], q[1], a1 - a0, nw, base, floor + h, ang);
        CForgeShape.Box(trim, q[0], q[1], a1 - a0 + 0.2, nw + 0.2, base, floor + 0.5, ang);
        CForgeChurchGen.Gable(roof, body, D, u, a0 - 0.1, a1 + 0.1, nb, nw * 0.5, floor + h, k, 0.45);
        //정면: 겹 아치 문 + 둥근 창 + 박공 아래 돌 띠
        const fr = P(a1 + 0.03, nb);
        CForgeOpening.Door({ ...OB, door }, fr[0], floor, fr[1], v[0], v[1], u[0], u[1], Math.min(2.0, nw * 0.3), 3.2, K.Round, 3);
        CForgeOpening.Window(OB, fr[0], floor + h * 0.62, fr[1], v[0], v[1], u[0], u[1], 1.3, 1.3, K.Round);
        q = P(a1 + 0.05, nb);
        CForgeShape.Box(trim, q[0], q[1], 0.12, nw + 0.2, floor + h - 0.2, floor + h, ang);
        //옆 창: 높고 작은 반원 아치 창
        const nwin = Math.max(2, Math.round((a1 - a0) / 3.2));
        for(const s of [1, -1])
            for(let i = 0; i < nwin; i++)
            {
                const w = P(a0 + (a1 - a0) * (i + 0.5) / nwin, nb + s * nw * 0.5);
                CForgeOpening.Window(OB, w[0], floor + h * 0.45, w[1], u[0], u[1], v[0] * s, v[1] * s, 0.55, 1.5, K.Round);
            }
        //앱스
        const ac = P(a0, nb), ah = floor + h * 0.75, ring = CForgePoly.Orient(Array.from({ length : 14 }, (_v, _k) => [ac[0] + Math.cos(_k / 14 * Math.PI * 2) * ra, ac[1] + Math.sin(_k / 14 * Math.PI * 2) * ra] as ForgeV2));
        CForgeShape.Extrude(body, ring, base, ah);
        CForgeShape.Cone(roof, ac[0], ac[1], ra + 0.35, ah - 0.1, ra * 0.42, 14);
        //종탑
        const tc = P(-L * 0.5 + ts * 0.5 + 0.3, tb), ty = floor + th;
        CForgeShape.Box(body, tc[0], tc[1], ts, ts, base, ty, ang);
        for(let y = floor + 4; y < ty - 2; y += 3.6) CForgeShape.Box(trim, tc[0], tc[1], ts + 0.16, ts + 0.16, y - 0.1, y + 0.1, ang);
        CForgeShape.Box(trim, tc[0], tc[1], ts + 0.3, ts + 0.3, ty - 0.2, ty, ang);
        for(const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        {
            const nx = u[0] * du + v[0] * dv, nz = u[1] * du + v[1] * dv;
            for(const off of [-0.2, 0.2])
                CForgeOpening.Window({ stone : trim, fill : dark, dark }, tc[0] + nx * ts * 0.5 - nz * ts * off, ty - 2.2, tc[1] + nz * ts * 0.5 + nx * ts * off, -nz, nx, nx, nz, ts * 0.17, 1.5, K.Round);
        }
        const sq : ForgeV2[] = [P(-L * 0.5 + 0.3, tb - ts * 0.5), P(-L * 0.5 + 0.3 + ts, tb - ts * 0.5), P(-L * 0.5 + 0.3 + ts, tb + ts * 0.5), P(-L * 0.5 + 0.3, tb + ts * 0.5)];
        CForgeShape.Pyramid(roof, CForgePoly.Orient(sq), ty, ts * 0.45, 0.3);
        CForgeShape.Box(metal, tc[0], tc[1], 0.1, 0.1, ty + ts * 0.42, ty + ts * 0.42 + 1.0, ang);
        CForgeShape.Box(metal, tc[0], tc[1], 0.1, 0.55, ty + ts * 0.42 + 0.6, ty + ts * 0.42 + 0.7, ang);
        const parts : IForgePart[] = [
            { buf : body, rgb : T.mTowerBody, tex : CForgeTex.sStone }, { buf : trim, rgb : T.mWallStone, tex : CForgeTex.sStone },
            { buf : roof, rgb : T.mRoof[_r.seed % T.mRoof.length], tex : CForgeTex.sGiwa }, { buf : dark, rgb : T.mDark }, { buf : metal, rgb : T.mMetal },
            { buf : glass, rgb : CForgeChurchGen.sGlass, tex : CForgeTex.sGlass }, { buf : door, rgb : T.mWood.map(_v => Math.min(1, _v * 1.15)), tex : CForgeTex.sPlank },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //돔 교회(르네상스·신고전): 낮은 박공 본당(앞·뒤 칸)과 그보다 높은 교차부, 창 난 원통 드럼 위 반구 돔과 등롱·십자가, 정면에 기둥 줄과 세모 박공 현관(포르티코)
    private static Dome(_r : IForgeChurchR, _g : ForgeGround, T : CForgeTheme) : IForgePart[]
    {
        const D = CForgeChurchGen.Var(_r, _g), { L, u } = _r, { v, P, V3, base, floor, ang, wn, hn, ac, cw, rd, yd } = D;
        const body = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), glass = new CForgeMeshBuf(), door = new CForgeMeshBuf(), metal = new CForgeMeshBuf();
        const K = CForgeOpening.eKind, OB = { stone : trim, fill : glass, dark }, pd = 2.4, a1 = L * 0.5 - pd, a0 = -L * 0.5 + 0.4, k = 0.38;
        const Hall = (_a0 : number, _a1 : number) =>
        {
            if(_a1 - _a0 < 0.5) return;
            const q = P((_a0 + _a1) * 0.5, 0);
            CForgeShape.Box(body, q[0], q[1], _a1 - _a0, wn, base, floor + hn, ang);
            CForgeShape.Box(trim, q[0], q[1], _a1 - _a0 + 0.1, wn + 0.3, floor + hn - 0.3, floor + hn, ang);
            CForgeShape.Box(trim, q[0], q[1], _a1 - _a0 + 0.1, wn + 0.24, base, floor + 0.6, ang);
            CForgeChurchGen.Gable(roof, body, D, u, _a0, _a1, 0, wn * 0.5, floor + hn, k, 0.3);
            const nwin = Math.max(1, Math.round((_a1 - _a0) / 3.4));
            for(const s of [1, -1])
                for(let i = 0; i < nwin; i++)
                {
                    const w = P(_a0 + (_a1 - _a0) * (i + 0.5) / nwin, s * wn * 0.5);
                    CForgeOpening.Window(OB, w[0], floor + hn * 0.35, w[1], u[0], u[1], v[0] * s, v[1] * s, 0.9, hn * 0.4, K.Round);
                }
        };
        Hall(ac + cw * 0.5, a1);
        Hall(a0, ac - cw * 0.5);
        //교차부와 드럼·돔·등롱
        const cc = P(ac, 0), yc = floor + hn + 2.2;
        CForgeShape.Box(body, cc[0], cc[1], cw, cw, base, yc, ang);
        CForgeShape.Box(trim, cc[0], cc[1], cw + 0.3, cw + 0.3, yc - 0.3, yc, ang);
        CForgeShape.Box(trim, cc[0], cc[1], cw + 0.24, cw + 0.24, base, floor + 0.6, ang);
        //교차부 모서리 붙임기둥과 옆면 큰 반원 아치 창(앞뒤 면은 본당이 붙는다)
        for(const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const q = P(ac + a * (cw * 0.5 - 0.2), b * (cw * 0.5 - 0.2)); CForgeShape.Box(trim, q[0], q[1], 0.6, 0.6, floor, yc - 0.3, ang); }
        for(const s of [1, -1])
        {
            const w = P(ac, s * cw * 0.5);
            CForgeOpening.Window(OB, w[0], floor + hn * 0.3, w[1], u[0], u[1], v[0] * s, v[1] * s, cw * 0.24, hn * 0.7, K.Round, true);
            CForgeOpening.Window(OB, w[0], floor + hn + 0.5, w[1], u[0], u[1], v[0] * s, v[1] * s, 1.0, 1.0, K.Round);
        }
        CForgeTowerGen.Lathe(body, cc[0], cc[1], [[rd, yc], [rd, yd]], 16);
        CForgeTowerGen.Ring(trim, cc[0], cc[1], rd - 0.1, rd + 0.18, yd - 0.25, yd, 16);
        for(let i = 0; i < 8; i++) CForgeTowerGen.ArchDecal(dark, cc[0], cc[1], rd, i / 8 * Math.PI * 2 + 0.2, yc + (yd - yc) * 0.25, 0.5, (yd - yc) * 0.55);
        const prof : number[][] = [];
        for(let i = 0; i <= 8; i++) { const t = i / 8 * Math.PI * 0.5; prof.push([(rd + 0.12) * Math.cos(t), yd + rd * 1.05 * Math.sin(t)]); }
        CForgeTowerGen.Lathe(roof, cc[0], cc[1], prof, 16);
        const yt = yd + rd * 1.05 - 0.1, lr = rd * 0.2;
        CForgeTowerGen.Lathe(trim, cc[0], cc[1], [[lr, yt], [lr, yt + lr * 1.6], [lr * 1.2, yt + lr * 1.7], [0.05, yt + lr * 2.6]], 8);
        CForgeShape.Box(metal, cc[0], cc[1], 0.1, 0.1, yt + lr * 2.5, yt + lr * 2.5 + 1.1, ang);
        CForgeShape.Box(metal, cc[0], cc[1], 0.1, 0.6, yt + lr * 2.5 + 0.7, yt + lr * 2.5 + 0.8, ang);
        //정면: 문 + 포르티코(기둥 줄·들보·세모 박공·지붕)
        const fr = P(a1 + 0.03, 0);
        CForgeOpening.Door({ ...OB, door }, fr[0], floor, fr[1], v[0], v[1], u[0], u[1], Math.min(1.8, wn * 0.25), 3.2, K.Rect, 2);
        const pc = Math.max(4, Math.round(wn / 1.6) | 0) & ~1, ph = hn - 0.6, pw = wn + 0.4;
        for(let i = 0; i < pc; i++)
        {
            const c = P(L * 0.5 - 0.45, -pw * 0.5 + 0.35 + (pw - 0.7) * i / (pc - 1));
            CForgeTowerGen.Lathe(trim, c[0], c[1], [[0.3, floor], [0.28, floor + ph * 0.92], [0.36, floor + ph]], 10);
        }
        let q = P(a1 + pd * 0.5, 0);
        CForgeShape.Box(trim, q[0], q[1], pd + 0.1, pw + 0.2, floor - 0.6, floor, ang);
        CForgeShape.Box(trim, q[0], q[1], pd + 0.1, pw + 0.2, floor + ph, floor + hn, ang);
        CForgeChurchGen.Gable(roof, trim, D, u, a1, L * 0.5, 0, pw * 0.5 + 0.1, floor + hn, k, 0.15);
        const parts : IForgePart[] = [
            { buf : body, rgb : T.mTowerBody, tex : T.mChurchMat == 0 ? CForgeTex.sPlaster : CForgeTex.sStone }, { buf : trim, rgb : T.mStone, tex : CForgeTex.sStone },
            { buf : roof, rgb : T.mRoof[_r.seed % T.mRoof.length], tex : CForgeTex.sTile }, { buf : dark, rgb : T.mDark }, { buf : metal, rgb : T.mMetal },
            { buf : glass, rgb : CForgeChurchGen.sGlass, tex : CForgeTex.sGlass }, { buf : door, rgb : T.mWood.map(_v => Math.min(1, _v * 1.15)), tex : CForgeTex.sPlank },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
}
