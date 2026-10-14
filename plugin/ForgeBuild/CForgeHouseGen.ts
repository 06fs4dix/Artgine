import { ForgeV2 } from "./CForgeScene.js";
import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { IForgePart } from "./CForgeMeshBuf.js";
import { CForgeShape, ForgeGround } from "./CForgeShape.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeRand } from "./CForgeRand.js";
import { IForgeBuildingR } from "./CForgeAdjust.js";
import { CForgeHanokGen } from "./CForgeHanokGen.js";
import { CForgeMachiyaGen } from "./CForgeMachiyaGen.js";
import { CForgeChineseHouseGen } from "./CForgeChineseHouseGen.js";
import { CForgeAdobeGen } from "./CForgeAdobeGen.js";
import { CForgeHutGen } from "./CForgeHutGen.js";
import { CForgeIncaGen } from "./CForgeIncaGen.js";

//건물 생성기. 바닥은 가장 높은 모서리 기준으로 평평하게 두고 내리막 쪽은 돌 기단이 드러난다.
//지붕은 사각형마다 같은 경사로 올려(박공/모임) 서로 만나는 곳에 골이 생기게 한다
export class CForgeHouseGen
{
    static sEave = 0.4;
    static sRoofT = 0.16;
    static sFloorH = 2.8;
    static sWallSink = 0.05;

    static sPlaster = [[0.96, 0.94, 0.88], [0.95, 0.9, 0.78], [0.93, 0.89, 0.84], [0.97, 0.93, 0.86]];
    static sRoof = [[0.74, 0.34, 0.24], [0.62, 0.3, 0.22], [0.47, 0.36, 0.3], [0.42, 0.45, 0.56]];
    static sShutter = [[0.36, 0.55, 0.38], [0.33, 0.47, 0.66], [0.66, 0.3, 0.24], [0.5, 0.38, 0.24]];
    static sStone = [0.66, 0.62, 0.56];
    static sWood = [0.38, 0.26, 0.17];
    static sDark = [0.17, 0.16, 0.17];
    static sBrick = [0.6, 0.33, 0.25];
    static sFlower = [[0.92, 0.42, 0.55], [0.95, 0.78, 0.3], [0.85, 0.3, 0.3], [0.7, 0.5, 0.9]];
    //세부 단계: 0 = 전부, 1 = 중거리(작은 장식을 빼고 창·덧창·각재를 앞면만), 2 = 원거리(벽·지붕·굴뚝·유리면만)
    static sLod = 0;
    //지금 만드는 집의 타입(지붕·창·문 보조 함수가 형식 플래그를 읽는다)
    static sTheme : CForgeTheme = null;

    //지붕 판 두께·용마루 크기(지붕 재질에 따라 Build가 정한다)
    static sCurT = 0.16;
    static sRidgeW = 0.26;
    static sRidgeH = 0.16;

    //벽·지붕 재질: 옵션으로 정했으면 그 값, 아니면 테마 후보 중 시드로
    static WallOf(_b : IForgeBuildingR) : number
    {
        if(_b.wall != null && _b.wall >= 0) return _b.wall;
        const T = CForgeTheme.Of(_b), l = T.mHouseWall;
        //동아시아 양식(한국 4·5, 일본 6·7, 중국 8·9): 큰 집 쪽·작은 집 쪽이 둘 다 후보면 아주 큰 집은 앞쪽(기와집·마치야·사합원채), 그 밖은 시드로 섞는다(넓을수록 앞쪽이 잦다)
        const E = CForgeTheme.eCulture, tile = T.mCulture == E.Japan ? 6 : T.mCulture == E.China ? 8 : 4, thatch = tile + 1;
        //후보에 초가가 더 많으면(고려) 기와집 비율을 그만큼 줄인다
        if(T.East() && l.includes(tile) && l.includes(thatch) && l.every(_v => _v == tile || _v == thatch))
        {
            const area = Math.abs(CForgePoly.Area(_b.poly)), k = l.filter(_v => _v == tile).length * 2 / l.length;
            return area > 70 / k || CForgeRand.Hash(_b.seed, 121) % 100 < (30 + Math.min(30, area * 0.5)) * k ? tile : thatch;
        }
        return l[CForgeRand.Hash(_b.seed, 121) % l.length];
    }
    //지붕 경사(높이/수평). 초가는 가파르고 잔디 지붕은 완만하다. 타입 경사 배율(mPitch)을 곱한다
    static Pitch(_b : IForgeBuildingR) : number
    {
        const rk = CForgeHouseGen.RoofOf(_b);
        return (rk == 1 ? Math.min(1.45, _b.pitch * 1.3) : rk == 3 ? _b.pitch * 0.7 : _b.pitch) * CForgeTheme.Of(_b).mPitch;
    }
    //망사르드: 아래 가파른 면 높이 mh·안쪽으로 들어가는 폭 ins, 위 완만한 면 경사 sMansardTop
    static sMansardTop = 0.35;
    static Mansard(_hw : number) { const mh = Math.min(2.2, Math.max(1.2, _hw * 1.1)), ins = Math.min(_hw * 0.45, mh * 0.3); return { mh, ins, rise : mh + (_hw - ins) * CForgeHouseGen.sMansardTop }; }
    //벽 윗선에서 용마루까지 높이
    static RoofRise(_b : IForgeBuildingR, _hw : number) : number
    {
        return CForgeTheme.Of(_b).mMansard ? CForgeHouseGen.Mansard(_hw).rise : _hw * CForgeHouseGen.Pitch(_b);
    }
    static RoofOf(_b : IForgeBuildingR) : number
    {
        if(_b.roofKind != null && _b.roofKind >= 0) return _b.roofKind;
        const l = CForgeTheme.Of(_b).mRoofKind;
        return l[CForgeRand.Hash(_b.seed, 122) % l.length];
    }
    //벽 재질이 회벽이 아니면 회벽용 장식(목조 골조·모서리 돌·벗겨진 자국·1층 돌벽)을 끈다.
    //초가는 두꺼운 처마가 문 위를 덮어 차양·벽등이 없고, 지붕창도 내지 않는다
    static StyleOf(_b : IForgeBuildingR)
    {
        const S = CForgeHouseGen.Style(_b.seed), w = CForgeHouseGen.WallOf(_b), T = CForgeTheme.Of(_b);
        if(w != 0) { S.timber = false; S.quoin = false; S.patches = false; S.stoneGround = false; }
        if(!T.mFlowerBox) S.flowers = false;
        if(!T.mTimber) S.timber = false;
        if(!T.mDormer || T.mStepGable) S.dormer = false;
        if(!T.mIvy) { S.ivy = false; S.patches = false; }
        if(T.mArchWin) S.shutters = false;
        //고전식(르네상스 이후): 회벽 집은 1층을 돌로 쌓고 모서리 돌을 두며, 문 차양·벽등 대신 돌 문틀
        if(T.mClassical) { S.canopy = false; S.lantern = false; S.patches = false; S.smallTop = false; if(w == 0) { S.stoneGround = true; S.quoin = true; } }
        if(CForgeHouseGen.RoofOf(_b) == 1) { S.dormer = false; S.canopy = false; S.lantern = false; S.stoneGround = false; S.quoin = false; }
        return S;
    }

    static Build(_b : IForgeBuildingR, _g : ForgeGround, _lod : number = 0) : IForgePart[]
    {
        const poly = _b.poly;
        if(poly.length < 3) return [];
        CForgeHouseGen.sLod = _lod;
        const R = new CForgeRand(_b.seed), L = _lod, wall = CForgeHouseGen.WallOf(_b), rk = CForgeHouseGen.RoofOf(_b);
        if(wall == 12 || wall == 16 || wall == 17) return CForgeAdobeGen.Build(_b, _g, _lod, wall);
        if(wall == 13) return CForgeHutGen.Build(_b, _g, _lod);
        if(wall == 14 || wall == 15) return CForgeIncaGen.House(_b, _g, _lod, wall);
        if(wall == 8 || wall == 9) return CForgeChineseHouseGen.Build(_b, _g, _lod, wall);
        if(wall == 6 || wall == 7) return CForgeMachiyaGen.Build(_b, _g, _lod, wall);
        if(wall == 4 || wall == 5) return CForgeHanokGen.Build(_b, _g, _lod, wall);
        const TH = CForgeTheme.Of(_b);
        const k = CForgeHouseGen.Pitch(_b), e = rk == 1 ? 0.65 : rk == 3 ? 0.5 : TH.mStepGable ? 0.25 : TH.mMansard ? 0.12 : CForgeHouseGen.sEave;
        CForgeHouseGen.sCurT = rk == 1 ? 0.35 : rk == 3 ? 0.3 : rk == 2 || rk == 5 ? 0.08 : rk == 4 ? 0.14 : CForgeHouseGen.sRoofT;
        CForgeHouseGen.sRidgeW = rk == 1 ? 0.6 : rk == 3 ? 0.45 : rk == 4 ? 0.32 : 0.26;
        CForgeHouseGen.sRidgeH = rk == 1 ? 0.3 : rk == 4 ? 0.2 : 0.16;
        CForgeHouseGen.sTheme = TH;
        const B : Record<string, CForgeMeshBuf> = { body : new CForgeMeshBuf(), stone : new CForgeMeshBuf(), wood : new CForgeMeshBuf(), dark : new CForgeMeshBuf(), shutter : new CForgeMeshBuf(), roof : new CForgeMeshBuf(), ridge : new CForgeMeshBuf(), brick : new CForgeMeshBuf(),
            green : new CForgeMeshBuf(), flower : new CForgeMeshBuf(), glass : new CForgeMeshBuf(), door : new CForgeMeshBuf(), ivy : new CForgeMeshBuf(), lamp : new CForgeMeshBuf(), iron : new CForgeMeshBuf() };
        const S = CForgeHouseGen.StyleOf(_b), fh = _b.height / _b.floors, stoneGround = S.stoneGround && _b.floors >= 2;
        let gmin = Infinity, gmax = -Infinity;
        for(const q of poly) { const g = _g(q[0], q[1]); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
        const floor = gmax + 0.25, top = floor + _b.height;

        CForgeShape.Extrude(B.stone, CForgePoly.Offset(poly, 0.08), _q => _g(_q[0], _q[1]) - 1.0, floor + 0.3);
        if(L < 2) CForgeShape.Cap(B.stone, CForgePoly.Offset(poly, 0.08), floor + 0.3);
        //벽 윗선을 지붕 표면과 같은 높이에 두면 그 선을 따라 벽이 지붕 위로 비쳐 깜빡인다. 지붕 판 두께 안으로 조금 내린다.
        //각뿔 지붕(자유 외곽선)은 변마다 경사가 달라 무게중심에서 먼 변은 지붕이 더 낮으므로 처마 밑면 높이까지 내린다
        const sink = _b.rects == null ? e * k : CForgeHouseGen.sWallSink;
        //1층 돌벽 집은 1층을 돌로, 그 위를 회벽으로 쌓고 이음매는 층 띠(나무)가 덮는다
        if(stoneGround) CForgeShape.Extrude(B.stone, poly, floor + 0.25, floor + fh);
        CForgeShape.Extrude(B.body, poly, stoneGround ? floor + fh : floor + 0.25, top - sink);
        for(let k = 1; k < _b.floors && L < 2; k++)
        {
            const y = floor + _b.height * k / _b.floors;
            if(TH.mTimber || TH.mClassical) CForgeShape.Extrude(TH.mClassical ? B.stone : B.wood, CForgePoly.Offset(poly, 0.05), y - 0.1, y + 0.1);
        }
        for(let i = 0; i < poly.length && L < 2; i++)
        {
            const a = poly[(i + poly.length - 1) % poly.length], p = poly[i], c = poly[(i + 1) % poly.length];
            if(CForgePoly.Cross(a, p, c) <= 0) continue;
            const ang = Math.atan2(c[1] - p[1], c[0] - p[0]), py1 = top - Math.max(0.17, sink + 0.02);
            //기둥 윗면을 지붕 판 두께 안에서 끝낸다(지붕 면 높이까지 올리면 처마 모서리에서 지붕을 뚫고 겹쳐 깜빡인다)
            //통나무 집은 모서리에서 엇걸린 통나무 끝이 쌓인 기둥(통나무 텍스처가 벽 단과 이어진다), 돌집은 기둥 없음
            if(wall == 2) CForgeShape.Box(B.body, p[0], p[1], 0.36, 0.36, floor + 0.25, py1, ang);
            else if(wall == 3 || wall == 10) {}
            else if(wall == 11) CForgeShape.Box(B.stone, p[0], p[1], 0.22, 0.22, floor + 0.3, py1, ang);
            else if(S.quoin) CForgeHouseGen.Quoins(B.stone, a, p, c, stoneGround ? floor + fh + 0.12 : floor + 0.3, py1, _b.seed + i);
            else if(TH.mTimber) CForgeShape.Box(B.wood, p[0], p[1], 0.26, 0.26, floor + 0.3, py1, ang);
        }
        CForgeHouseGen.Openings(B, _b, floor, R);
        //고전식 처마 코니스: 벽 윗선 아래 두 단 돌 띠
        if(TH.mClassical && L < 2 && _b.rects != null)
        {
            CForgeShape.Extrude(B.stone, CForgePoly.Offset(poly, 0.08), top - 0.42, top - 0.3);
            CForgeShape.Extrude(B.stone, CForgePoly.Offset(poly, 0.16), top - 0.3, top - CForgeHouseGen.sWallSink - 0.02);
        }

        const W = (_u : number, _v : number, _y : number) : number[] => { const w = CForgePoly.ToWorld([[_u, _v]], _b.o, _b.u)[0]; return [w[0], _y, w[1]]; };
        let chimney : number[] = null, bestArea = 0;
        if(_b.rects != null)
        {
            for(const [ri, r] of _b.rects.entries())
            {
                const ru = r[2] - r[0], rv = r[3] - r[1];
                const alongU = ru >= rv, hw = (alongU ? rv : ru) * 0.5, len = alongU ? ru : rv;
                const hip = TH.mMansard || (!TH.mStepGable && (_b.roof == 2 || (_b.roof == 0 && len / Math.max(0.1, hw * 2) < 1.25)));
                const ridgeY = top + CForgeHouseGen.RoofRise(_b, hw);
                const Wr = alongU ? (_a : number, _c : number, _y : number) => W(_a, _c, _y) : (_a : number, _c : number, _y : number) => W(_c, _a, _y);
                const a0 = alongU ? r[0] : r[1], a1 = alongU ? r[2] : r[3], b0 = alongU ? r[1] : r[0], b1 = alongU ? r[3] : r[2];
                CForgeHouseGen.Roof(B, Wr, a0, a1, b0, b1, top, k, e, hip, CForgeRand.Hash(_b.seed, ri, 55), S.dormer && L < 2, poly);
                if(ru * rv > bestArea && TH.mChimney)
                {
                    bestArea = ru * rv;
                    const side = R.Chance(0.5) ? 1 : -1, ca = (a0 + a1) * 0.5 + side * (a1 - a0) * 0.25, cb = (b0 + b1) * 0.5 + hw * 0.45;
                    chimney = [...Wr(ca, cb, 0), TH.mMansard ? top + CForgeHouseGen.Mansard(hw).mh : top + (hw - hw * 0.45) * k, ridgeY + 0.8];
                }
            }
        }
        else
        {
            const wid = Math.max(1, CForgePoly.OBB(poly).vMax - CForgePoly.OBB(poly).vMin);
            CForgeShape.Pyramid(B.roof, poly, top - e * k, wid * 0.5 * k + e * k, e);
        }
        if(chimney != null)
        {
            const ang = Math.atan2(_b.u[1], _b.u[0]);
            CForgeShape.Box(B.brick, chimney[0], chimney[2], 0.6, 0.6, chimney[3] - 0.6, chimney[4], ang);
            if(L < 2) CForgeShape.Box(B.stone, chimney[0], chimney[2], 0.76, 0.76, chimney[4], chimney[4] + 0.12, ang);
        }

        const pick = (_arr : number[][], _salt : number) => _arr[CForgeRand.Hash(_b.seed, _salt) % _arr.length];
        const body = wall == 1 ? { rgb : pick(TH.mPlankWall, 1), tex : CForgeTex.sPlank } : wall == 2 ? { rgb : pick(TH.mLogWall, 1), tex : CForgeTex.sLog }
            : wall == 3 ? { rgb : TH.mStone.map(_v => _v * 1.04), tex : CForgeTex.sStone } : wall == 10 ? { rgb : TH.mBrick, tex : CForgeTex.sBrickWall }
            : wall == 11 ? { rgb : pick(TH.mClapboard, 1), tex : CForgeTex.sShitami } : { rgb : pick(TH.mPlaster, 1), tex : CForgeTex.sPlaster };
        //초가는 용마루·처마 단면도 짚, 너와는 용마루를 널판으로 덮는다. 잔디는 흙빛 용마루, 둥근 테라코타는 같은 기와, 금속판은 이음 줄
        const rc = rk == 1 ? pick(TH.mThatch, 3) : rk == 2 ? pick(TH.mShingle, 3) : rk == 3 ? pick(TH.mTurf, 3) : pick(TH.mRoof, 3);
        const rtex = [CForgeTex.sTile, CForgeTex.sThatch, CForgeTex.sShingle, CForgeTex.sTurf, CForgeTex.sGiwa, CForgeTex.sPlank][rk] ?? CForgeTex.sTile;
        const roof : IForgePart = { buf : B.roof, rgb : rc, tex : rtex };
        const ridge : IForgePart = rk == 1 ? { buf : B.ridge, rgb : rc.map(_v => _v * 0.82), tex : CForgeTex.sThatch } : rk == 2 ? { buf : B.ridge, rgb : TH.mWood.map(_v => _v * 1.2), tex : CForgeTex.sWood }
            : rk == 3 ? { buf : B.ridge, rgb : TH.mWood, tex : CForgeTex.sWood } : rk == 4 ? { buf : B.ridge, rgb : rc.map(_v => _v * 0.85), tex : CForgeTex.sGiwa } : { buf : B.ridge, rgb : rc.map(_v => _v * 0.8) };
        //오르내리창 집은 창틀·층 띠를 흰 칠로
        const wood = TH.mSash ? { rgb : [0.92, 0.91, 0.87], tex : CForgeTex.sPlaster } : { rgb : TH.mWood, tex : CForgeTex.sWood };
        const parts : IForgePart[] = [
            !TH.mGlazed ? { buf : B.glass, rgb : TH.mWood.map(_v => _v * 0.85), tex : CForgeTex.sPlank } : { buf : B.glass, rgb : TH.mSash ? [0.9, 0.92, 0.95] : [0.82, 0.78, 0.7], tex : TH.mSash ? CForgeTex.sSash : CForgeTex.sGlass }, { buf : B.door, rgb : TH.mWood.map(_v => Math.min(1, _v * 1.15)), tex : CForgeTex.sPlank },
            { buf : B.body, rgb : body.rgb, tex : body.tex }, { buf : B.stone, rgb : TH.mStone, tex : CForgeTex.sStone }, { buf : B.wood, rgb : wood.rgb, tex : wood.tex },
            { buf : B.dark, rgb : TH.mDark }, { buf : B.shutter, rgb : pick(TH.mShutter, 2).map(_v => _v * 0.85 + 0.05), tex : CForgeTex.sPlank }, roof, ridge,
            { buf : B.brick, rgb : TH.mBrick, tex : CForgeTex.sBrickWall }, { buf : B.iron, rgb : TH.mIron },
            { buf : B.green, rgb : TH.mGreen }, { buf : B.flower, rgb : pick(TH.mFlower, 4) },
            { buf : B.ivy, rgb : TH.mGreen.map(_v => _v * 0.72) }, { buf : B.lamp, rgb : [1.0, 0.82, 0.45] },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //a: 용마루 방향, b: 가로 방향. 경사면은 벽 윗선(b0/b1, top)과 용마루를 지나는 평면이고 처마는 같은 평면으로 _e만큼 더 나간다
    private static Roof(B : Record<string, CForgeMeshBuf>, W : (_a : number, _b : number, _y : number) => number[],
        a0 : number, a1 : number, b0 : number, b1 : number, top : number, k : number, e : number, hip : boolean, _seed : number, _dormer : boolean, _poly : ForgeV2[])
    {
        const hw = (b1 - b0) * 0.5, bc = (b0 + b1) * 0.5, ry = top + hw * k, ey = top - e * k, T = CForgeHouseGen.sCurT, RW = CForgeHouseGen.sRidgeW, RH = CForgeHouseGen.sRidgeH, far = CForgeHouseGen.sLod >= 2;
        const uv : number[][] = null;
        const N = (p : number[][]) => { const ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1], az = p[1][2] - p[0][2], bx = p[2][0] - p[0][0], by = p[2][1] - p[0][1], bz = p[2][2] - p[0][2]; let n = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]; if(n[1] < 0) n = n.map(_v => -_v); return n; };
        const Face = (p : number[][]) => B.roof.Poly(p, N(p));
        const Under = (p : number[][]) => { if(far) return; const i = B.roof.Count(); for(const q of p) B.roof.Vert(q[0], q[1] - T, q[2], 0, 0, 0, -1, 0); for(let j = 1; j + 1 < p.length; j++) B.roof.Tri(i, i + j, i + j + 1, 0, -1, 0); };
        const Edge = (p : number[], q : number[], out : number[]) => { if(!far) B.ridge.Quad([p, q, [q[0], q[1] - T, q[2]], [p[0], p[1] - T, p[2]]], uv, out); };
        const out = (_da : number, _db : number) => { const o = W(0, 0, 0), d = W(_da, _db, 0); return [d[0] - o[0], 0, d[2] - o[2]]; };
        if(CForgeHouseGen.sTheme?.mMansard)
        {
            //망사르드: 처마에서 안쪽 테두리(ins만큼 들어간 높이 mh)까지 가파른 네 면, 그 위는 완만한 모임지붕. 긴 두 면 아래 면에 돌 지붕창
            const { mh, ins } = CForgeHouseGen.Mansard(hw), yb = top + mh, hw2 = hw - ins, yt = yb + hw2 * CForgeHouseGen.sMansardTop, ye = top - 0.06;
            const E = [W(a0 - e, b0 - e, ye), W(a1 + e, b0 - e, ye), W(a1 + e, b1 + e, ye), W(a0 - e, b1 + e, ye)];
            const I = [W(a0 + ins, b0 + ins, yb), W(a1 - ins, b0 + ins, yb), W(a1 - ins, b1 - ins, yb), W(a0 + ins, b1 - ins, yb)];
            for(let i = 0; i < 4; i++) Face([E[i], E[(i + 1) % 4], I[(i + 1) % 4], I[i]]);
            Under(E);
            Edge(E[0], E[1], out(0, -1)); Edge(E[1], E[2], out(1, 0)); Edge(E[2], E[3], out(0, 1)); Edge(E[3], E[0], out(-1, 0));
            const m = (a0 + a1) * 0.5, r0 = Math.min(a0 + ins + hw2, m), r1 = Math.max(a1 - ins - hw2, m), R0 = W(r0, bc, yt), R1 = W(r1, bc, yt);
            Face([I[0], I[1], R1, R0]); Face([I[2], I[3], R0, R1]); Face([I[1], I[2], R1]); Face([I[3], I[0], R0]);
            if(far) return;
            for(let i = 0; i < 4; i++)
            {
                const p = I[i], q = I[(i + 1) % 4], ax = q[0] - p[0], az = q[2] - p[2];
                CForgeShape.Box(B.ridge, (p[0] + q[0]) * 0.5, (p[2] + q[2]) * 0.5, Math.hypot(ax, az) + 0.12, 0.12, yb - 0.04, yb + 0.06, Math.atan2(az, ax));
            }
            if(r1 - r0 > 0.05) { const ax = R1[0] - R0[0], az = R1[2] - R0[2]; CForgeShape.Box(B.ridge, (R0[0] + R1[0]) * 0.5, (R0[2] + R1[2]) * 0.5, Math.hypot(ax, az) + 0.2, RW * 0.8, yt - 0.04, yt + 0.08, Math.atan2(az, ax)); }
            const nd = Math.floor((a1 - a0 - 1.2) / 2.2), dy0 = top + 0.15, dy1 = top + Math.min(1.5, mh - 0.25);
            if(nd < 1 || dy1 - dy0 < 0.9) return;
            const t0 = W(0, 0, 0), t1 = W(1, 0, 0), angA = Math.atan2(t1[2] - t0[2], t1[0] - t0[0]);
            for(const [bf, sg] of [[b0 + 0.05, -1], [b1 - 0.05, 1]])
            {
                const o = out(0, sg), ol = Math.hypot(o[0], o[2]) || 1, nx = o[0] / ol, nz = o[2] / ol;
                for(let j = 0; j < nd; j++)
                {
                    const a = a0 + (a1 - a0) * (j + 0.5) / nd, f = W(a, bf + sg * 0.35, 0);
                    if(CForgePoly.InPoly(f[0], f[2], _poly)) continue;
                    const c = W(a, bf - sg * 0.35, 0);
                    CForgeShape.Box(B.body, c[0], c[2], 1.0, 0.7, dy0, dy1, angA);
                    CForgeShape.Box(B.stone, c[0], c[2], 1.16, 0.8, dy1, dy1 + 0.1, angA);
                    B.stone.Poly([W(a - 0.58, bf + sg * 0.03, dy1 + 0.1), W(a + 0.58, bf + sg * 0.03, dy1 + 0.1), W(a, bf + sg * 0.03, dy1 + 0.42)], [nx, 0, nz]);
                    const wc = W(a, bf, (dy0 + dy1) * 0.5 + 0.05);
                    CForgeHouseGen.Window(B, wc[0], wc[1], wc[2], -nz, nx, nx, nz, 0.5, Math.min(0.9, dy1 - dy0 - 0.35), false);
                }
            }
            return;
        }
        if(!hip)
        {
            const step = CForgeHouseGen.sTheme?.mStepGable ?? false, ev = step ? 0.02 : e, A0 = a0 - ev, A1 = a1 + ev;
            //계단식 박공: 박공벽을 지붕 위로 올려 가운데가 가장 높은 계단으로 끊고 단마다 돌 갓돌
            if(step && !far)
                for(const a of [a0, a1])
                {
                    const n = Math.max(2, Math.min(4, Math.round(hw / 0.7))), segW = hw / (n + 0.5), o = W(0, 0, 0), pb = W(0, 1, 0), angB = Math.atan2(pb[2] - o[2], pb[0] - o[0]);
                    for(let j = -n; j <= n; j++)
                    {
                        const c0 = j == 0 ? -segW * 0.5 : j < 0 ? -segW * (0.5 - j) : segW * (j - 0.5), c1 = c0 + segW, inner = j == 0 ? 0 : Math.min(Math.abs(c0), Math.abs(c1));
                        const st = top + (hw - inner) * k + 0.35, q = W(a, bc + (c0 + c1) * 0.5, 0);
                        CForgeShape.Box(B.body, q[0], q[2], c1 - c0, 0.34, top - 0.3, st, angB);
                        CForgeShape.Box(B.stone, q[0], q[2], c1 - c0 + 0.06, 0.42, st, st + 0.08, angB);
                    }
                }
            const s1 = [W(A0, b0 - e, ey), W(A1, b0 - e, ey), W(A1, bc, ry), W(A0, bc, ry)];
            const s2 = [W(A1, b1 + e, ey), W(A0, b1 + e, ey), W(A0, bc, ry), W(A1, bc, ry)];
            Face(s1); Face(s2); Under(s1); Under(s2);
            Edge(s1[0], s1[1], out(0, -1)); Edge(s2[0], s2[1], out(0, 1));
            Edge(s1[0], s1[3], out(-1, 0)); Edge(s2[1], s2[2], out(-1, 0)); Edge(s1[1], s1[2], out(1, 0)); Edge(s2[0], s2[3], out(1, 0));
            for(const [a, sg] of [[a0, -1], [a1, 1]])
            {
                const ws = CForgeHouseGen.sWallSink, p = [W(a, b0, top - ws), W(a, b1, top - ws), W(a, bc, ry - ws)], n = out(sg, 0);
                B.body.Poly(p, [n[0], 0, n[2]]);
                //박공 삼각벽 다락 창(끝마다 해시로 있을지 정한다). 삼각벽이 낮으면 넣지 않는다
                if(!far && hw * k > 1.3 && CForgeRand.Hash(_seed, sg + 2) % 100 < 60 && !CForgeHouseGen.sTheme?.mClassical)
                {
                    const c = W(a, bc, top - ws + hw * k * 0.36), t0 = W(a, 0, 0), t1 = W(a, 1, 0), nl = Math.hypot(n[0], n[2]) || 1, tl = Math.hypot(t1[0] - t0[0], t1[2] - t0[2]) || 1;
                    CForgeHouseGen.Window(B, c[0], c[1], c[2], (t1[0] - t0[0]) / tl, (t1[2] - t0[2]) / tl, n[0] / nl, n[2] / nl, 0.4, 0.6, false);
                }
            }
            if(_dormer) CForgeHouseGen.Dormers(B, W, a0, a1, b0, bc, top, k, ry, false, _poly, Face, Under, Edge, out);
            const ra = W(A0, bc, ry + 0.02), rb = W(A1, bc, ry + 0.02), ax = rb[0] - ra[0], az = rb[2] - ra[2];
            if(!far) CForgeShape.Box(B.ridge, (ra[0] + rb[0]) * 0.5, (ra[2] + rb[2]) * 0.5, Math.hypot(ax, az), RW, ry - 0.06, ry - 0.06 + RH, Math.atan2(az, ax));
            return;
        }
        const r0 = Math.min(a0 + hw, (a0 + a1) * 0.5), r1 = Math.max(a1 - hw, (a0 + a1) * 0.5);
        const E = [W(a0 - e, b0 - e, ey), W(a1 + e, b0 - e, ey), W(a1 + e, b1 + e, ey), W(a0 - e, b1 + e, ey)];
        const R0 = W(r0, bc, ry), R1 = W(r1, bc, ry);
        Face([E[0], E[1], R1, R0]); Face([E[2], E[3], R0, R1]); Face([E[1], E[2], R1]); Face([E[3], E[0], R0]);
        Under(E);
        Edge(E[0], E[1], out(0, -1)); Edge(E[1], E[2], out(1, 0)); Edge(E[2], E[3], out(0, 1)); Edge(E[3], E[0], out(-1, 0));
        if(_dormer) CForgeHouseGen.Dormers(B, W, a0, a1, b0, bc, top, k, ry, true, _poly, Face, Under, Edge, out);
        if(!far && r1 - r0 > 0.05)
        {
            const ax = R1[0] - R0[0], az = R1[2] - R0[2];
            CForgeShape.Box(B.ridge, (R0[0] + R1[0]) * 0.5, (R0[2] + R1[2]) * 0.5, Math.hypot(ax, az) + 0.2, RW * 0.92, ry - 0.06, ry - 0.06 + RH, Math.atan2(az, ax));
        }
    }

    //지붕창: b0 쪽 경사면(굴뚝 반대편)에 1~3개. 오각형 앞벽 + 삼각 옆벽 + 작은 박공지붕 + 창.
    //뒤쪽은 큰 지붕 높이가 같아지는 곳까지만 뻗어 큰 지붕 속으로 묻힌다. 앞이 다른 날개(L자 안쪽)면 넣지 않는다
    private static Dormers(B : Record<string, CForgeMeshBuf>, W : (_a : number, _b : number, _y : number) => number[], a0 : number, a1 : number, b0 : number, bc : number,
        top : number, k : number, ry : number, _hip : boolean, _poly : ForgeV2[], Face : (_p : number[][]) => void, Under : (_p : number[][]) => void,
        Edge : (_p : number[], _q : number[], _o : number[]) => void, out : (_da : number, _db : number) => number[])
    {
        const h = 0.58, o = 0.15, pk = 0.42, bf = b0 + 0.4;
        //앞벽 높이는 용마루 아래 남는 만큼(최대 1.15m), 0.8m가 안 나오면 넣지 않는다
        const y0 = top + (bf - b0) * k, wallH = Math.min(_hip ? 0.9 : 1.15, ry - 0.25 - pk - y0), ye = y0 + wallH, yp = ye + pk, Yb = (_y : number) => b0 + (_y - top) / k;
        if(wallH < 0.8 || bf + 0.6 > bc) return;
        //모임지붕은 양 끝이 삼각 경사면(앞 경사면은 b-b0 < a-a0인 곳)이라 지붕창 용마루 끝(bp)과 처마 모서리(beo, a±(h+o))가 모두 앞 경사면 안에 들도록 양끝을 비운다
        const margin = _hip ? Math.max(Yb(yp) - b0, Yb(ye - o * pk / h) - b0 + h + o) + 0.1 : h + o + 0.5, A0 = a0 + margin, A1 = a1 - margin, len = A1 - A0;
        if(len < 0) return;
        const n = len < 1.4 ? 1 : Math.min(3, Math.max(1, Math.floor((len + 1.4) / 3.2)));
        const no = out(0, -1), nl = Math.hypot(no[0], no[2]) || 1, nx = no[0] / nl, nz = no[2] / nl, sl = out(-1, 0), sr = out(1, 0);
        const t0 = W(0, 0, 0), t1 = W(1, 0, 0), tl = Math.hypot(t1[0] - t0[0], t1[2] - t0[2]) || 1, tx = (t1[0] - t0[0]) / tl, tz = (t1[2] - t0[2]) / tl;
        for(let j = 0; j < n; j++)
        {
            const a = n == 1 ? (A0 + A1) * 0.5 : A0 + len * j / (n - 1), f = W(a, b0 - 0.3, 0);
            if(CForgePoly.InPoly(f[0], f[2], _poly)) continue;
            const yb = y0 - 0.15, be = Yb(ye);
            B.body.Poly([W(a - h, bf, yb), W(a + h, bf, yb), W(a + h, bf, ye), W(a, bf, yp), W(a - h, bf, ye)], [nx, 0, nz]);
            B.body.Poly([W(a - h, bf, yb), W(a - h, be, ye), W(a - h, bf, ye)], [sl[0], 0, sl[2]]);
            B.body.Poly([W(a + h, bf, yb), W(a + h, bf, ye), W(a + h, be, ye)], [sr[0], 0, sr[2]]);
            const yeo = ye - o * pk / h, bfo = bf - o, bp = Yb(yp), beo = Yb(yeo);
            const L = [W(a - h - o, bfo, yeo), W(a, bfo, yp), W(a, bp, yp), W(a - h - o, beo, yeo)];
            const Rr = [W(a, bfo, yp), W(a + h + o, bfo, yeo), W(a + h + o, beo, yeo), W(a, bp, yp)];
            Face(L); Face(Rr); Under(L); Under(Rr);
            Edge(L[0], L[1], no); Edge(Rr[0], Rr[1], no);
            const wh = Math.min(0.62, wallH - 0.42), c = W(a, bf, y0 + 0.24 + wh * 0.5);
            CForgeHouseGen.Window(B, c[0], c[1], c[2], tx, tz, nx, nz, 0.5, wh, false);
        }
    }
    //모서리 돌: 긴 돌·짧은 돌을 두 면에 엇갈려 쌓는다. 앞면만 만들고 모서리 너머로 두께만큼 더 뻗어 두 면의 돌이 모서리에서 맞닿게 한다
    private static Quoins(_b : CForgeMeshBuf, _a : ForgeV2, _p : ForgeV2, _c : ForgeV2, _y0 : number, _y1 : number, _seed : number)
    {
        const d = 0.03, rh = 0.3, gap = 0.04;
        const l1 = Math.hypot(_c[0] - _p[0], _c[1] - _p[1]) || 1, t1x = (_c[0] - _p[0]) / l1, t1z = (_c[1] - _p[1]) / l1;
        const l0 = Math.hypot(_p[0] - _a[0], _p[1] - _a[1]) || 1, t0x = (_p[0] - _a[0]) / l0, t0z = (_p[1] - _a[1]) / l0;
        //중거리: 돌 하나하나 대신 모서리 양면에 돌 띠 한 장씩
        if(CForgeHouseGen.sLod > 0)
        {
            const w = 0.44, yc = (_y0 + _y1) * 0.5, hh = _y1 - _y0;
            if(w + 0.2 < l1) CForgeHouseGen.Beam(_b, _p[0] + t1x * (w - d) * 0.5, yc, _p[1] + t1z * (w - d) * 0.5, t1x, t1z, t1z, -t1x, 0, 1, hh, w + d, 0, d, false);
            if(w + 0.2 < l0) CForgeHouseGen.Beam(_b, _p[0] - t0x * (w - d) * 0.5, yc, _p[1] - t0z * (w - d) * 0.5, t0x, t0z, t0z, -t0x, 0, 1, hh, w + d, 0, d, false);
            return;
        }
        let r = CForgeRand.Hash(_seed, 71) % 2;
        for(let y = _y0 + gap; y + rh <= _y1; y += rh + gap, r++)
        {
            const la = r % 2 == 0 ? 0.55 : 0.32, lb = r % 2 == 0 ? 0.32 : 0.55, yc = y + rh * 0.5;
            if(la + 0.2 < l1) CForgeHouseGen.Beam(_b, _p[0] + t1x * (la - d) * 0.5, yc, _p[1] + t1z * (la - d) * 0.5, t1x, t1z, t1z, -t1x, 1, 0, la + d, rh, 0, d, false);
            if(lb + 0.2 < l0) CForgeHouseGen.Beam(_b, _p[0] - t0x * (lb - d) * 0.5, yc, _p[1] - t0z * (lb - d) * 0.5, t0x, t0z, t0z, -t0x, 1, 0, lb + d, rh, 0, d, false);
        }
    }
    //담쟁이 잎 뭉치: 벽에 붙인 납작한 반타원체(벽 쪽 면은 없음). 가장자리 반지름을 흔들어 잎 덩어리처럼 울퉁불퉁하게
    private static Blob(_b : CForgeMeshBuf, _x : number, _y : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number, _rw : number, _rh : number, _d : number, _seed : number)
    {
        const seg = 7, base = _b.Count();
        _b.Vert(_x + _nx * _d, _y, _z + _nz * _d, 0, 0, _nx, 0, _nz);
        for(let ring = 1; ring <= 2; ring++)
        {
            const f = ring == 1 ? 0.65 : 1, o = ring == 1 ? 0.78 : 0.05, rn = 1 - o;
            for(let q = 0; q < seg; q++)
            {
                const a = (q + ring * 0.5) / seg * Math.PI * 2, j = 0.75 + CForgeRand.Hash(_seed, q, ring) % 100 / 200;
                const cu = Math.cos(a) * _rw * f * j, cv = Math.sin(a) * _rh * f * j;
                _b.Vert(_x + _tx * cu + _nx * _d * o, _y + cv, _z + _tz * cu + _nz * _d * o, cu, cv,
                    _nx * (o + 0.35) + _tx * Math.cos(a) * rn, Math.sin(a) * rn, _nz * (o + 0.35) + _tz * Math.cos(a) * rn);
            }
        }
        for(let q = 0; q < seg; q++)
        {
            const q1 = (q + 1) % seg, am = (q + 1) / seg * Math.PI * 2;
            _b.Tri(base, base + 1 + q, base + 1 + q1, _nx, 0, _nz);
            _b.QuadIdx(base + 1 + q, base + 1 + q1, base + 1 + seg + q1, base + 1 + seg + q, _nx * 0.5 + _tx * Math.cos(am), Math.sin(am), _nz * 0.5 + _tz * Math.cos(am));
        }
    }
    //담쟁이: 바닥에서 위로 타고 오르는 잎 뭉치 줄기. 위로 갈수록 작아지고 좌우로 흔들리며 가끔 옆가지를 낸다. u는 _umin~_umax(벽 안)로 묶는다
    private static Ivy(_b : CForgeMeshBuf, _b2 : CForgeMeshBuf, _x : number, _y : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number,
        _h : number, _umin : number, _umax : number, _seed : number)
    {
        const R = (_k : number) => CForgeRand.Hash(_seed, _k, 31) % 1000 / 1000, C = (_u : number) => Math.max(_umin, Math.min(_umax, _u));
        const n = 12 + Math.floor(R(0) * 6);
        let u = 0;
        for(let i = 0; i < n; i++)
        {
            const t = i / (n - 1), sz = (1 - t * 0.45) * (0.4 + R(i + 1) * 0.2), y = _y + t * _h;
            u = C(u + (R(i + 50) - 0.5) * 0.45);
            CForgeHouseGen.Blob(R(i + 100) < 0.55 ? _b : _b2, _x + _tx * u, y + sz * 0.5, _z + _tz * u, _tx, _tz, _nx, _nz, sz * 1.15, sz * 0.85, 0.08 + sz * 0.3, _seed + i * 7);
            if(i % 3 != 1) continue;
            const su = C(u + (R(i + 150) < 0.5 ? -1 : 1) * sz * 1.3);
            CForgeHouseGen.Blob(R(i + 200) < 0.5 ? _b : _b2, _x + _tx * su, y + sz * 0.2, _z + _tz * su, _tx, _tz, _nx, _nz, sz * 0.8, sz * 0.65, 0.06 + sz * 0.22, _seed + i * 7 + 3);
        }
    }
    //회벽이 떨어져 속돌이 드러난 자국: 들쭉날쭉한 별 모양 다각형 하나에 돌 텍스처(가운데서 부채꼴로 나눠 오목해도 된다)
    private static Patch(_b : CForgeMeshBuf, _x : number, _y : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number, _rw : number, _rh : number, _seed : number)
    {
        const seg = 10, off = 0.012, base = _b.Count(), R = (_k : number) => CForgeRand.Hash(_seed, _k, 61) % 1000 / 1000, u0 = R(90) * 2, v0 = R(91) * 2;
        _b.Vert(_x + _nx * off, _y, _z + _nz * off, u0, v0, _nx, 0, _nz);
        for(let q = 0; q < seg; q++)
        {
            const a = q / seg * Math.PI * 2, j = 0.55 + R(q) * 0.5, cu = Math.cos(a) * _rw * j, cv = Math.sin(a) * _rh * j;
            _b.Vert(_x + _tx * cu + _nx * off, _y + cv, _z + _tz * cu + _nz * off, u0 + cu, v0 + cv, _nx, 0, _nz);
        }
        for(let q = 0; q < seg; q++) _b.Tri(base, base + 1 + q, base + 1 + (q + 1) % seg, _nx, 0, _nz);
    }

    //건물 단위 창 스타일. 한 벽면 안에서는 규칙적으로 두고, 변화는 건물끼리 준다(전통 입면은 벽면 안에서 칸이 고르다)
    static Style(_seed : number)
    {
        const H = (_k : number) => CForgeRand.Hash(_seed, _k);
        //중세 시골 창: 작고 좁은 세로창(폭 0.55~0.75m, 높이 1.6~1.9배)
        const w = 0.55 + (H(90) % 3) * 0.1, timber = H(92) % 100 < 45;
        return {
            w, h : w * (1.6 + (H(93) % 4) * 0.1),
            shutters : H(91) % 100 < 35, timber,
            ivy : H(100) % 100 < 45, dormer : H(101) % 100 < 55, patches : H(102) % 100 < 50,
            quoin : !timber && H(103) % 100 < 55, stoneGround : H(104) % 100 < 35, lantern : H(105) % 100 < 50,
            smallTop : H(94) % 100 < 40, wideCenter : H(95) % 100 < 30, flowers : H(96) % 100 < 70,
            canopy : H(98) % 100 < 50,
        };
    }
    static sFrameW = 0.1;
    static sFrameD = 0.12;
    static ShutterW(_w : number) : number { return _w * 0.5 + CForgeHouseGen.sFrameW; }

    //창 칸 위치(벽 시작점부터의 거리). 창 사이·모서리 여백은 창 폭의 0.8~2배로 맞추고 가운데 대칭으로 고르게 놓는다.
    //여백이 창 폭과 거의 같으면 어색하므로 한 칸 줄여 피한다. _odd면 가운데 칸이 생기게 홀수를 고른다(정면은 현관이 축)
    static Bays(_len : number, _w : number, _minGap : number, _max : number, _odd : boolean) : number[]
    {
        const Gap = (_k : number) => (_len - _k * _w) / (_k + 1), maxGap = _w * 2.2;
        let n = 0;
        for(let k = 1; k <= _max; k++) if(Gap(k) >= _minGap) n = k;
        if(n == 0) return _len >= _w + 0.6 ? [_len * 0.5] : [];
        if(_odd && n % 2 == 0 && n > 1 && Gap(n - 1) <= maxGap) n--;
        if(n > 1 && Math.abs(Gap(n) - _w) < _w * 0.12 && Gap(n - 1) <= maxGap) n--;
        const g = Gap(n), out : number[] = [];
        for(let j = 0; j < n; j++) out.push(g + _w * 0.5 + j * (_w + g));
        return out;
    }
    //벽면에 붙인 각재. (_x,_y,_z)는 벽면 위 중심, (_du,_dv)는 벽면 안의 길이 방향(가로 = 벽 접선, 세로 = 위).
    //벽에서 _off ~ _off+_d만큼 나오고 뒷면은 벽에 묻혀 만들지 않는다. 앞면 v를 길이 방향으로 둬 나뭇결이 각재를 따라가게 한다.
    //겹치는 각재끼리 앞면 깊이(_off+_d)를 다르게 줘야 깜빡이지 않는다
    private static Beam(_b : CForgeMeshBuf, _x : number, _y : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number,
        _du : number, _dv : number, _len : number, _w : number, _off : number, _d : number, _sides : boolean = true)
    {
        const l = Math.hypot(_du, _dv) || 1, du = _du / l, dv = _dv / l;
        const ax = [_tx * du, dv, _tz * du], sx = [-_tx * dv, du, -_tz * dv];
        const P = (_a : number, _s : number, _o : number) => [_x + ax[0] * _a + sx[0] * _s + _nx * _o, _y + ax[1] * _a + sx[1] * _s, _z + ax[2] * _a + sx[2] * _s + _nz * _o];
        const hl = _len * 0.5, hw = _w * 0.5, o0 = _off, o1 = _off + _d;
        _b.Quad([P(-hl, -hw, o1), P(-hl, hw, o1), P(hl, hw, o1), P(hl, -hw, o1)], [[0, 0], [_w, 0], [_w, _len], [0, _len]], [_nx, 0, _nz]);
        if(!_sides || CForgeHouseGen.sLod > 0) return;
        _b.Quad([P(-hl, hw, o0), P(hl, hw, o0), P(hl, hw, o1), P(-hl, hw, o1)], null, sx);
        _b.Quad([P(hl, -hw, o0), P(-hl, -hw, o0), P(-hl, -hw, o1), P(hl, -hw, o1)], null, [-sx[0], -sx[1], -sx[2]]);
        _b.Quad([P(hl, -hw, o0), P(hl, -hw, o1), P(hl, hw, o1), P(hl, hw, o0)], null, ax);
        _b.Quad([P(-hl, hw, o0), P(-hl, hw, o1), P(-hl, -hw, o1), P(-hl, -hw, o0)], null, [-ax[0], -ax[1], -ax[2]]);
    }
    //중세 창: 두꺼운 원목 틀(벽 두께 속에 든 것처럼 깊게) 안쪽에 납틀 유리 + 돌 창턱. 마름모 격자는 텍스처라 정점이 늘지 않는다. _split이면 가운데 세로 틀로 두 칸
    static Window(B : Record<string, CForgeMeshBuf>, _x : number, _y : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number,
        _w : number, _h : number, _split : boolean)
    {
        const fw = CForgeHouseGen.sFrameW, fd = CForgeHouseGen.sFrameD;
        const Bm = (_buf : CForgeMeshBuf, _u : number, _v : number, _hor : boolean, _len : number, _bw : number, _off : number, _d : number, _sides = true) =>
            CForgeHouseGen.Beam(_buf, _x + _tx * _u, _y + _v, _z + _tz * _u, _tx, _tz, _nx, _nz, _hor ? 1 : 0, _hor ? 0 : 1, _len, _bw, _off, _d, _sides);
        Bm(B.glass, 0, 0, false, _h, _w, 0, 0.02, false);
        //중거리는 유리 뒤 틀 판 한 장, 원거리는 유리만
        if(CForgeHouseGen.sLod > 0)
        {
            if(CForgeHouseGen.sLod == 1) Bm(B.wood, 0, 0, false, _h + fw * 2, _w + fw * 2, 0, 0.01, false);
            return;
        }
        for(const sg of [-1, 1])
        {
            Bm(B.wood, 0, sg * (_h + fw) * 0.5, true, _w + fw * 2, fw, 0, fd);
            Bm(B.wood, sg * (_w + fw) * 0.5, 0, false, _h, fw, 0, fd);
        }
        if(_split) Bm(B.wood, 0, 0, false, _h, fw * 0.7, 0, fd * 0.8);
        Bm(B.stone, 0, -_h * 0.5 - fw - 0.045, true, _w + fw * 2 + 0.12, 0.09, 0, fd + 0.06);
    }
    //덧창: 세로 널판 판(텍스처) + 위·아래 가로대(앞면만)
    private static Shutter(_b : CForgeMeshBuf, _x : number, _y : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number, _w : number, _h : number)
    {
        CForgeHouseGen.Beam(_b, _x, _y, _z, _tx, _tz, _nx, _nz, 0, 1, _h, _w, 0, 0.04);
        if(CForgeHouseGen.sLod > 0) return;
        for(const v of [-0.32, 0.32]) CForgeHouseGen.Beam(_b, _x, _y + v * _h, _z, _tx, _tz, _nx, _nz, 1, 0, _w - 0.06, 0.08, 0.04, 0.015, false);
    }
    //현관문: 둥근 아치 널판문(다각형 하나에 널판 텍스처) + 철 경첩띠·손잡이 + 돌 아치 문틀 + 디딤돌(+ 작은 차양)
    private static Door(B : Record<string, CForgeMeshBuf>, _x : number, _y0 : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number, _w : number, _h : number, _canopy : boolean, _ang : number, _lantern : number)
    {
        if(CForgeHouseGen.sTheme?.mClassical) { CForgeHouseGen.DoorClassic(B, _x, _y0, _z, _tx, _tz, _nx, _nz, _w, _h, _ang); return; }
        const Bm = (_buf : CForgeMeshBuf, _u : number, _v : number, _hor : boolean, _len : number, _bw : number, _off : number, _d : number, _sides = true) =>
            CForgeHouseGen.Beam(_buf, _x + _tx * _u, _y0 + _v, _z + _tz * _u, _tx, _tz, _nx, _nz, _hor ? 1 : 0, _hor ? 0 : 1, _len, _bw, _off, _d, _sides);
        const r = _w * 0.5, spring = _h - r, seg = 8, jw = 0.18, fd = 0.08;
        const P = (_q : number[], _o : number) => [_x + _tx * _q[0] + _nx * _o, _y0 + _q[1], _z + _tz * _q[0] + _nz * _o];
        const Arc = (_k : number, _r : number) => { const a = Math.PI * _k / seg; return [Math.cos(a) * _r, spring + Math.sin(a) * _r]; };
        const panel = [P([-r, 0], 0.03), P([r, 0], 0.03)];
        for(let k = 0; k <= seg; k++) panel.push(P(Arc(k, r), 0.03));
        B.door.Poly(panel, [_nx, 0, _nz]);
        if(CForgeHouseGen.sLod > 0) return;
        for(const v of [0.25, 0.62]) Bm(B.dark, -_w * 0.1, _h * v, true, _w * 0.75, 0.05, 0.03, 0.008, false);
        Bm(B.dark, _w * 0.32, 1.0, false, 0.12, 0.04, 0.03, 0.05);
        for(const sg of [-1, 1]) Bm(B.stone, sg * (r + jw * 0.5), spring * 0.5, false, spring, jw, 0, fd);
        for(let k = 0; k < seg; k++)
        {
            const i0 = Arc(k, r), i1 = Arc(k + 1, r), o0 = Arc(k, r + jw), o1 = Arc(k + 1, r + jw), am = Math.PI * (k + 0.5) / seg;
            B.stone.Quad([P(i0, fd), P(o0, fd), P(o1, fd), P(i1, fd)], null, [_nx, 0, _nz]);
            B.stone.Quad([P(i0, 0), P(i1, 0), P(i1, fd), P(i0, fd)], null, [-_tx * Math.cos(am), -Math.sin(am), -_tz * Math.cos(am)]);
        }
        CForgeShape.Box(B.stone, _x + _nx * 0.25, _z + _nz * 0.25, _w + 0.35, 0.5, _y0 - 1.6, _y0 + 0.02, _ang);
        //문 옆 벽등(_lantern = 좌우 방향, 0이면 없음): 벽에서 나온 팔에 매달린 등
        if(_lantern != 0)
        {
            const u = _lantern * (r + jw + 0.32), yl = _y0 + _h * 0.8, lx = _x + _tx * u, lz = _z + _tz * u;
            CForgeShape.Box(B.dark, lx + _nx * 0.16, lz + _nz * 0.16, 0.04, 0.32, yl + 0.18, yl + 0.22, _ang);
            const cx = lx + _nx * 0.28, cz = lz + _nz * 0.28;
            CForgeShape.Box(B.dark, cx, cz, 0.16, 0.16, yl - 0.12, yl - 0.08, _ang);
            CForgeShape.Box(B.lamp, cx, cz, 0.12, 0.12, yl - 0.08, yl + 0.12, _ang);
            CForgeShape.Box(B.dark, cx, cz, 0.19, 0.19, yl + 0.12, yl + 0.18, _ang);
        }
        if(!_canopy) return;
        const cw = _w + 0.9, y1 = _y0 + _h + 0.55, y2 = y1 - 0.32, dep = 0.8, T = 0.06;
        const C = (_u : number, _o : number, _y : number) => [_x + _tx * _u + _nx * _o, _y, _z + _tz * _u + _nz * _o];
        const top = [C(-cw / 2, 0.02, y1), C(cw / 2, 0.02, y1), C(cw / 2, dep, y2), C(-cw / 2, dep, y2)];
        const ny = dep, nn = y1 - y2, nl = Math.hypot(ny, nn);
        B.roof.Quad(top, null, [_nx * nn / nl, ny / nl, _nz * nn / nl]);
        B.roof.Quad(top.map(_p => [_p[0], _p[1] - T, _p[2]]), null, [0, -1, 0]);
        B.ridge.Quad([top[3], top[2], [top[2][0], top[2][1] - T, top[2][2]], [top[3][0], top[3][1] - T, top[3][2]]], null, [_nx, 0, _nz]);
        for(const sg of [-1, 1])
        {
            const u = sg * (cw / 2 - 0.15), c = C(u, dep * 0.45, 0);
            CForgeShape.Box(B.wood, c[0], c[2], 0.08, dep * 0.9, y2 - 0.2, y2 + (y1 - y2) * 0.08 - T - 0.01, _ang);
        }
    }

    //고전식 현관(르네상스 이후): 네모 판문 + 위 반원 채광창(유리) + 돌 문설주·상인방 + 세모 박공 머리 + 돌계단
    private static DoorClassic(B : Record<string, CForgeMeshBuf>, _x : number, _y0 : number, _z : number, _tx : number, _tz : number, _nx : number, _nz : number, _w : number, _h : number, _ang : number)
    {
        const hw = _w * 0.5, hd = _h - hw * 0.9, P = (_u : number, _y : number, _o : number) => [_x + _tx * _u + _nx * _o, _y, _z + _tz * _u + _nz * _o];
        B.door.Quad([P(-hw, _y0, 0.03), P(hw, _y0, 0.03), P(hw, _y0 + hd, 0.03), P(-hw, _y0 + hd, 0.03)], null, [_nx, 0, _nz]);
        if(CForgeHouseGen.sLod > 0) return;
        const fan = [P(-hw, _y0 + hd, 0.03)];
        for(let k = 0; k <= 8; k++) { const a = Math.PI * (1 - k / 8); fan.push(P(Math.cos(a) * hw, _y0 + hd + Math.sin(a) * hw * 0.9, 0.03)); }
        B.glass.Poly(fan, [_nx, 0, _nz]);
        const top = _y0 + hd + hw * 0.9;
        for(const sg of [-1, 1]) { const q = P(sg * (hw + 0.12), 0, 0.08); CForgeShape.Box(B.stone, q[0], q[2], 0.24, 0.16, _y0, top + 0.1, _ang); }
        const q = P(0, 0, 0.1);
        CForgeShape.Box(B.stone, q[0], q[2], _w + 0.7, 0.2, top + 0.1, top + 0.3, _ang);
        B.stone.Poly([P(-hw - 0.35, top + 0.3, 0.2), P(hw + 0.35, top + 0.3, 0.2), P(0, top + 0.3 + (hw + 0.35) * 0.38, 0.2)], [_nx, 0, _nz]);
        CForgeShape.Box(B.stone, _x + _nx * 0.35, _z + _nz * 0.35, _w + 0.6, 0.7, _y0 - 1.6, _y0 + 0.02, _ang);
        CForgeShape.Box(B.stone, _x + _nx * 0.8, _z + _nz * 0.8, _w + 0.6, 0.4, _y0 - 1.6, _y0 - 0.15, _ang);
    }

    //창·덧창·창턱과 문. 벽면마다 고른 칸(Bays)에 위아래 층을 맞춰 세운다.
    //정면(문 있는 면)은 홀수 칸으로 문을 칸에 맞추고, 짧은 옆면은 2칸까지만 둔다. 다른 건물 속으로 들어간 칸만 비운다
    private static Openings(B : Record<string, CForgeMeshBuf>, _b : IForgeBuildingR, _floor : number, _R : CForgeRand)
    {
        const poly = _b.poly, n = poly.length, S = CForgeHouseGen.StyleOf(_b), L = CForgeHouseGen.sLod;
        const Hidden = (_x : number, _z : number) => _b.others.some(_o => CForgePoly.InPoly(_x, _z, _o));
        const fh = _b.height / _b.floors;
        //덧창이 있으면 덧창까지 한 덩어리(창 칸)로 보고 칸 사이를 띄운다(창 폭만 쓰면 덧창끼리 붙어 빽빽해진다)
        const fw = CForgeHouseGen.sFrameW, sw = CForgeHouseGen.ShutterW(S.w), side = fw + (S.shutters ? sw + 0.03 : 0);
        const unit = S.w + side * 2, minGap = S.w * 0.9, stoneGround = S.stoneGround && _b.floors >= 2;
        let ivyN = 0;
        for(let i = 0; i < n; i++)
        {
            const a = poly[i], c = poly[(i + 1) % n], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
            if(l < 1.6) continue;
            const tx = (c[0] - a[0]) / l, tz = (c[1] - a[1]) / l, nx = tz, nz = -tx, ang = Math.atan2(tz, tx);
            const front = _b.door != null && _b.door.edge == i;
            const bays = CForgeHouseGen.Bays(l, unit, minGap, l < 5.5 ? 2 : 7, front);
            let doorBay = -1;
            if(front)
            {
                const ds = _b.door.t * l;
                bays.forEach((_s, _j) => { if(doorBay < 0 || Math.abs(_s - ds) < Math.abs(bays[doorBay] - ds)) doorBay = _j; });
            }
            const nb = bays.length, mid = (nb - 1) * 0.5;
            for(let f = 0; f < _b.floors; f++)
            {
                const y = _floor + fh * f + Math.min(fh * 0.55, 0.9 + S.h * 0.5);
                const top = f == _b.floors - 1 && _b.floors >= 2 && S.smallTop;
                for(let j = 0; j < nb; j++)
                {
                    if(f == 0 && j == doorBay) continue;
                    const s = bays[j], x = a[0] + tx * s, z = a[1] + tz * s;
                    if(Hidden(x + nx * 0.4, z + nz * 0.4)) continue;
                    const wide = front && S.wideCenter && f > 0 && nb % 2 == 1 && Math.abs(j - mid) < 0.1;
                    const ww = wide ? S.w * 1.6 : top ? S.w * 0.8 : S.w, wh = top ? S.h * 0.65 : S.h, wy = top ? y + S.h * 0.15 : y;
                    CForgeHouseGen.Window(B, x, wy, z, tx, tz, nx, nz, ww, wh, wide);
                    const TC = CForgeHouseGen.sTheme;
                    //르네상스 아치 창: 창 위 반원 유리 + 돌 아치 테
                    if(TC?.mArchWin && L < 2 && wy + wh * 0.5 + ww * 0.5 + 0.45 < _floor + _b.height - 0.5)
                    {
                        const yh = wy + wh * 0.5 + CForgeHouseGen.sFrameW, r = ww * 0.5 + CForgeHouseGen.sFrameW, seg = 8, jw = 0.16;
                        const P = (_u : number, _y : number, _o : number) => [x + tx * _u + nx * _o, _y, z + tz * _u + nz * _o];
                        const Arc = (_k : number, _r : number, _o : number) => { const t = Math.PI * _k / seg; return P(Math.cos(t) * _r, yh + Math.sin(t) * _r, _o); };
                        const fan = [P(-r, yh, 0.02)];
                        for(let q = 0; q <= seg; q++) fan.push(Arc(q, r, 0.02));
                        B.glass.Poly(fan, [nx, 0, nz]);
                        for(let q = 0; q < seg; q++) B.stone.Quad([Arc(q, r, 0.07), Arc(q, r + jw, 0.07), Arc(q + 1, r + jw, 0.07), Arc(q + 1, r, 0.07)], null, [nx, 0, nz]);
                    }
                    //고전식 창 머리: 돌 상인방, 2층(주층)은 세모 박공 머리
                    else if(TC?.mClassical && L < 2)
                    {
                        const yh = wy + wh * 0.5 + CForgeHouseGen.sFrameW, hw2 = ww * 0.5 + 0.22;
                        CForgeShape.Box(B.stone, x + nx * 0.08, z + nz * 0.08, hw2 * 2, 0.16, yh, yh + 0.14, ang);
                        if(f == 1 && _b.floors >= 2)
                        {
                            const P = (_u : number, _y : number) => [x + tx * _u + nx * 0.16, _y, z + tz * _u + nz * 0.16];
                            B.stone.Poly([P(-hw2, yh + 0.14), P(hw2, yh + 0.14), P(0, yh + 0.14 + hw2 * 0.4)], [nx, 0, nz]);
                        }
                    }
                    //철 발코니: 위층 창마다 돌 바닥판 + 철 난간(위 가로대·세로 살)
                    if(TC?.mBalcony && f > 0 && L < 2)
                    {
                        const yb = wy - wh * 0.5 - CForgeHouseGen.sFrameW - 0.05, bw = ww + 0.5, d = 0.45, P = (_u : number, _o : number) => [x + tx * _u + nx * _o, z + tz * _u + nz * _o];
                        const c = P(0, d * 0.5);
                        CForgeShape.Box(B.stone, c[0], c[1], bw, d, yb - 0.12, yb, ang);
                        const r = P(0, d - 0.03);
                        CForgeShape.Box(B.iron, r[0], r[1], bw, 0.04, yb + 0.85, yb + 0.9, ang);
                        for(let q = 0, nq = Math.round(bw / 0.12); q <= nq; q++) { const p = P(-bw * 0.5 + bw * q / nq, d - 0.03); CForgeShape.Box(B.iron, p[0], p[1], 0.025, 0.025, yb, yb + 0.86, ang); }
                    }
                    if(S.shutters && !wide && L < 2)
                        for(const sg of [-1, 1])
                        {
                            const ssw = CForgeHouseGen.ShutterW(ww), u = sg * (ww * 0.5 + fw + 0.03 + ssw * 0.5);
                            CForgeHouseGen.Shutter(B.shutter, x + tx * u, wy, z + tz * u, tx, tz, nx, nz, ssw, wh + fw * 2);
                        }
                    //화분은 가운데를 축으로 좌우 대칭이 되게 (거울 칸 번호) 해시로 정한다. 창턱 바로 아래에 단다
                    if(L == 0 && S.flowers && !top && f > 0 && CForgeRand.Hash(_b.seed, i, f, Math.min(j, nb - 1 - j)) % 100 < 45)
                    {
                        const sb = wy - wh * 0.5 - fw - 0.09;
                        CForgeShape.Box(B.wood, x + nx * 0.2, z + nz * 0.2, ww + 0.1, 0.24, sb - 0.22, sb, ang);
                        const fc = Math.max(3, Math.round((ww + 0.1) / 0.16));
                        for(let fl = 0; fl < fc; fl++)
                        {
                            const u = (fl - (fc - 1) * 0.5) * 0.16, hh = 0.12 + (CForgeRand.Hash(_b.seed, i, j, fl) % 10) * 0.012;
                            CForgeShape.Box(fl % 2 == 0 ? B.flower : B.green, x + nx * 0.24 + tx * u, z + nz * 0.24 + tz * u, 0.14, 0.14, sb, sb + hh, ang);
                        }
                    }
                }
                //목조 집 위층: 창 위 가로 들보 + 빈 벽 여백 양끝 기둥 + 그 사이 X자 가새
                if(S.timber && f > 0 && L < 2)
                {
                    const wh = top ? S.h * 0.65 : S.h, wy = top ? y + S.h * 0.15 : y, y0 = _floor + fh * f + 0.1, y1 = wy + wh * 0.5 + fw;
                    const Bm = (_u : number, _v : number, _du : number, _dv : number, _len : number, _bw : number, _off : number, _d : number) =>
                        CForgeHouseGen.Beam(B.wood, a[0] + tx * _u, _v, a[1] + tz * _u, tx, tz, nx, nz, _du, _dv, _len, _bw, _off, _d);
                    Bm(l * 0.5, y1 + 0.07, 1, 0, l - 0.3, 0.14, 0, 0.05);
                    const ws = top ? S.w * 0.8 : S.w, edges = [0.15, ...bays.map(_s => [_s - ws * 0.5 - side, _s + ws * 0.5 + side]).flat(), l - 0.15];
                    for(let k = 0; k + 1 < edges.length; k += 2)
                    {
                        const g0 = edges[k] + 0.12, g1 = edges[k + 1] - 0.12, sm = (g0 + g1) * 0.5;
                        if(g1 - g0 < 0.9 || Hidden(a[0] + tx * sm + nx * 0.4, a[1] + tz * sm + nz * 0.4)) continue;
                        const hgt = y1 - y0, pw = 0.14;
                        for(const g of [g0 + pw * 0.5, g1 - pw * 0.5]) Bm(g, y0 + hgt * 0.5, 0, 1, hgt, pw, 0, 0.05);
                        const bw = g1 - g0 - pw * 2;
                        if(bw < 0.5) continue;
                        Bm(sm, y0 + hgt * 0.5, bw, hgt, Math.hypot(bw, hgt), 0.11, 0, 0.038);
                        Bm(sm, y0 + hgt * 0.5, bw, -hgt, Math.hypot(bw, hgt), 0.11, 0, 0.044);
                    }
                }
            }
            const ds = front ? (doorBay >= 0 ? bays[doorBay] : l * 0.5) : -99;
            if(front && L < 2)
            {
                //벽등은 옆 창과 겹치지 않는 쪽에만 단다
                const clear = (_sg : number) => bays.every((_s, _j) => _j == doorBay || Math.abs(_s - (ds + _sg * 0.85)) > S.w * 0.5 + side + 0.15) && ds + _sg * 0.85 > 0.3 && ds + _sg * 0.85 < l - 0.3;
                const lsg = !S.lantern ? 0 : clear(1) ? 1 : clear(-1) ? -1 : 0;
                CForgeHouseGen.Door(B, a[0] + tx * ds, _floor + 0.3, a[1] + tz * ds, tx, tz, nx, nz, 1.05, 2.0, S.canopy, ang, lsg);
            }
            const H2 = (_s : number) => CForgeRand.Hash(_b.seed, i, _s);
            //회벽이 벗겨진 돌 자국: 창 사이 빈 벽에 하나. 돌벽 층·목조 위층은 뺀다
            if(L == 0 && S.patches && H2(202) % 100 < 55)
            {
                const edges = [0.3, ...bays.map(_s => [_s - S.w * 0.5 - side, _s + S.w * 0.5 + side]).flat(), l - 0.3], gaps : number[][] = [];
                for(let q = 0; q + 1 < edges.length; q += 2) if(edges[q + 1] - edges[q] >= 0.9) gaps.push([edges[q], edges[q + 1]]);
                const fls = [...Array(_b.floors).keys()].filter(_f => !(S.timber && _f > 0) && !(stoneGround && _f == 0) && !(front && _f == 0));
                if(gaps.length > 0 && fls.length > 0)
                {
                    const gp = gaps[H2(203) % gaps.length], f = fls[H2(204) % fls.length], gw = gp[1] - gp[0];
                    const sm = (gp[0] + gp[1]) * 0.5 + (H2(205) % 100 / 100 - 0.5) * Math.max(0, gw - 0.9) * 0.5, yc = _floor + fh * f + fh * (0.35 + H2(206) % 30 / 100);
                    if(!Hidden(a[0] + tx * sm + nx * 0.4, a[1] + tz * sm + nz * 0.4))
                        CForgeHouseGen.Patch(B.stone, a[0] + tx * sm, yc, a[1] + tz * sm, tx, tz, nx, nz, Math.min(0.8, gw * 0.45), 0.5, H2(207));
                }
            }
            //담쟁이: 벽 끝 모서리 쪽에서 타고 오른다(집당 2군데까지, 문 근처는 피한다)
            if(L == 0 && S.ivy && ivyN < 2 && H2(208) % 100 < 45)
            {
                const s = H2(209) % 2 == 0 ? 0.35 : l - 0.35;
                if(Math.abs(s - ds) > 1.3 && !Hidden(a[0] + tx * s + nx * 0.4, a[1] + tz * s + nz * 0.4))
                {
                    CForgeHouseGen.Ivy(B.ivy, B.green, a[0] + tx * s, _floor - 0.3, a[1] + tz * s, tx, tz, nx, nz, _b.height * (0.45 + H2(210) % 40 / 100), 0.3 - s, l - 0.3 - s, H2(211));
                    ivyN++;
                }
            }
        }
    }
}
