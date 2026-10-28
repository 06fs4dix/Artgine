import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgePoly } from "./CForgePoly.js";
import { ForgeV2 } from "./CForgeScene.js";
import { IForgeMonumentR } from "./CForgeAdjust.js";
import { IForgeFire, IForgeLight } from "./CForgeFire.js";

//거리 시설: 가로등(CForgeTheme.eMonument.Lamp)과 상점 매대(Shop). 정면(+u)이 가까운 길을 향한다. 모양은 테마의 양식·시대가, 변형은 시드가 정한다.
//가로등 크기 _r.size(s) → 높이, 상점 크기 → 매대 폭
export class CForgeStreetGen
{
    static eLamp = { Hanging : 0, Brazier : 1, Gas : 2, Paper : 3, Stone : 4, Brass : 5, Torch : 6 } as const;
    static eShop = { Cloth : 0, Ger : 1, Sahel : 2, Hut : 3, Andean : 4, Timber : 5, Norse : 6, Arch : 7, Front : 8, Souk : 9, Reed : 10,
        Jumak : 11, Janglang : 12, Machiya : 13, Cart : 14, Open : 15, Qing : 16, Water : 17, Song : 18 } as const;

    //거리 조명을 그 시대 방식으로 풀어 쓴다. 근대 = 주철 가스등(전 문화권) / 유럽 중세 = 횃불 기둥·화톳불(가끔 매단 등), 근세 = 기름 등롱 기둥
    //한국 = 청사초롱·화톳불 / 일본 = 종이 등롱(가끔 참배길 석등롱) / 중국 = 붉은 등롱 / 아랍 = 놋 등 / 이집트·안데스·아프리카 = 횃불 / 몽골 = 화톳불
    static LampStyle(_r : IForgeMonumentR, T : CForgeTheme) : number
    {
        const C = CForgeTheme.eCulture, E = CForgeTheme.eEra, L = CForgeStreetGen.eLamp, R = new CForgeRand(CForgeRand.Hash(_r.seed, 931)), c = T.mCulture;
        if(T.mEra == E.Modern) return L.Gas;
        if(c == C.Europe) return T.mEra >= E.EarlyModern ? L.Hanging : T.mRegion == "north" ? L.Brazier : R.Chance(0.25) ? L.Hanging : L.Torch;
        if(c == C.Korea) return R.Chance(0.3) ? L.Brazier : L.Paper;
        if(c == C.Japan) return R.Chance(0.3) ? L.Stone : L.Paper;
        if(c == C.China) return L.Paper;
        if(c == C.Arab) return L.Brass;
        if(c == C.Mongol) return L.Brazier;
        return L.Torch;
    }
    static LampSpec(_r : IForgeMonumentR, T : CForgeTheme)
    {
        const R = new CForgeRand(CForgeRand.Hash(_r.seed, 932)), L = CForgeStreetGen.eLamp, st = CForgeStreetGen.LampStyle(_r, T), s = _r.size;
        const base = st == L.Stone ? 1.9 + s * 0.5 : st == L.Brass ? 2.6 + s * 0.6 : st == L.Torch ? 2.3 + s * 0.5 : st == L.Gas ? (T.mEra == CForgeTheme.eEra.Modern ? 3.2 : 2.6) + s * 0.8 : 2.2 + s * 0.9;
        return { st, H : base * R.Range(0.93, 1.07), twin : R.Chance(0.35), round : R.Chance(0.5) };
    }

    //가로등 불빛 색(불꽃·유리 발광·점광원이 같이 쓴다). 레퍼런스 사진의 광원 종류별: 횃불·화톳불 = 주황 불, 기름 등롱·촛불 = 따뜻한 황색, 가스등 = 노르스름한 백색,
    //중국 홍등 = 붉은 주황, 일본 초롱 = 연한 황색, 석등 = 어두운 주황, 아랍 놋등 = 호박색
    static LampRgb(_st : number, T : CForgeTheme) : number[]
    {
        const C = CForgeTheme.eCulture, L = CForgeStreetGen.eLamp, c = T.mCulture;
        if(_st == L.Gas) return [1.0, 0.86, 0.58];
        if(_st == L.Hanging) return [1.0, 0.7, 0.32];
        if(_st == L.Brazier) return [1.0, 0.46, 0.12];
        if(_st == L.Torch) return [1.0, 0.52, 0.16];
        if(_st == L.Stone) return [1.0, 0.62, 0.24];
        if(_st == L.Brass) return [1.0, 0.68, 0.28];
        if(c == C.China) return [1.0, 0.38, 0.14];
        if(c == C.Japan) return [1.0, 0.7, 0.34];
        return [1.0, 0.62, 0.26];
    }

    //상점 형식: 한국 = 맞배 지붕 노점, 중국 = 사모지붕 가게, 일본 = 포렴 단 야타이, 그 밖(근대 포함) = 차양 매대
    static ShopStyle(_r : IForgeMonumentR, T : CForgeTheme) : number
    {
        const C = CForgeTheme.eCulture, S = CForgeStreetGen.eShop, c = T.mCulture;
        if(T.mEra == CForgeTheme.eEra.Modern) return S.Cloth;
        if(c == C.Europe)
        {
            if(T.mEra == CForgeTheme.eEra.EarlyModern) return T.mRegion == "italy" ? S.Arch : S.Front;
            return T.mRegion == "north" ? S.Norse : T.mRegion == "mediterranean" ? S.Arch : S.Timber;
        }
        if(c == C.Arab) return S.Souk;
        if(c == C.Egypt) return S.Reed;
        if(c == C.Korea) return T.mEra == CForgeTheme.eEra.Medieval ? S.Janglang : S.Jumak;
        if(c == C.China) return T.mRegion == "north" ? S.Qing : T.mRegion == "south" ? S.Water : S.Song;
        if(c == C.Japan) return T.mEra == CForgeTheme.eEra.Medieval ? S.Open : new CForgeRand(CForgeRand.Hash(_r.seed, 936)).Chance(0.35) ? S.Cart : S.Machiya;
        if(c == C.Mongol) return S.Ger;
        if(c == C.Andes) return S.Andean;
        if(c == C.Africa) return T.mRegion == "sahel" ? S.Sahel : S.Hut;
        return S.Cloth;
    }
    static ShopSpec(_r : IForgeMonumentR, T : CForgeTheme)
    {
        const R = new CForgeRand(CForgeRand.Hash(_r.seed, 937)), st = CForgeStreetGen.ShopStyle(_r, T), S = CForgeStreetGen.eShop, s = _r.size;
        let W = 1.8 + s * 0.9, D = 1.6 + s * 0.45, Hf = 2.1, Hr = st == S.Cloth ? 2.6 + R.Range(-0.1, 0.2) : Hf;
        if(st == S.Ger) { W = D = 3.2 + s * 1.0; Hf = Hr = 2.9; }
        else if(st == S.Hut) { W = D = 2.4 + s * 0.9; Hf = Hr = 3.4; }
        else if(st == S.Sahel) { W = 2.2 + s * 0.4; D = 2.2 + s * 0.3; Hf = Hr = 2.9; }
        else if(st == S.Andean) { W = 2.4 + s * 0.5; D = 1.8 + s * 0.3; Hf = 1.9; Hr = 2.3; }
        else if(st == S.Timber) { W = 3.0 + s * 0.4; D = 2.6; Hf = Hr = 5.0; }
        else if(st == S.Norse) { W = 3.4 + s * 0.4; D = 2.8; Hf = Hr = 3.2; }
        else if(st == S.Arch) { W = 3.2 + s * 0.4; D = 2.8; Hf = Hr = 3.9; }
        else if(st == S.Front) { W = 3.4 + s * 0.4; D = 3.0; Hf = Hr = 6.6; }
        else if(st == S.Souk) { W = 2.6 + s * 0.4; D = 3.2; Hf = Hr = 3.4; }
        else if(st == S.Reed) { W = 2.4 + s * 0.5; D = 2.0; Hf = 1.85; Hr = 1.95; }
        else if(st == S.Jumak) { W = 3.8 + s * 0.4; D = 3.0; Hf = Hr = 3.6; }
        else if(st == S.Janglang) { W = 3.6 + s * 0.3; D = 3.0; Hf = Hr = 4.0; }
        else if(st == S.Machiya) { W = 3.6 + s * 0.3; D = 3.6; Hf = Hr = 5.2; }
        else if(st == S.Cart) { W = 2.0 + s * 0.3; D = 1.6; Hf = Hr = 2.2; }
        else if(st == S.Open) { W = 4.0; D = 3.0; Hf = Hr = 4.0; }
        else if(st == S.Qing) { W = 4.4 + s * 0.2; D = 3.4; Hf = Hr = 6.2; }
        else if(st == S.Water) { W = 3.6 + s * 0.3; D = 3.0; Hf = Hr = 4.8; }
        else if(st == S.Song) { W = 3.0 + s * 0.3; D = 2.4; Hf = Hr = 5.2; }
        //mStyle = 건물 깊이(dm). 줄지은 상점가가 부지 깊이에 맞춰 길게 지을 때 쓴다(집형 점포만)
        if((_r.style ?? 0) > 0 && (st == S.Timber || st == S.Front || st == S.Arch || st == S.Norse)) D = Math.max(D, _r.style / 10);
        return { st, W, D, Hf, Hr, goods : R.Int(3, 5), thatch : R.Chance(0.5), bright : R.Chance(0.5) };
    }

    static Height(_r : IForgeMonumentR, T : CForgeTheme) : number
    {
        if(T.mMonument == CForgeTheme.eMonument.Lamp) return CForgeStreetGen.LampSpec(_r, T).H + 0.3;
        const F = CForgeStreetGen.ShopSpec(_r, T);
        return Math.max(F.Hr, F.Hf) + 0.9;
    }
    static Half(_r : IForgeMonumentR, T : CForgeTheme) : number[]
    {
        if(T.mMonument == CForgeTheme.eMonument.Lamp) return [0.3, 0.3];
        const F = CForgeStreetGen.ShopSpec(_r, T);
        return [F.D * 0.5 + 0.3, F.W * 0.5 + 0.15];
    }

    static Build(_r : IForgeMonumentR, T : CForgeTheme, _g : number) : IForgePart[]
    {
        return T.mMonument == CForgeTheme.eMonument.Lamp ? CForgeStreetGen.Lamp(_r, T, _g) : CForgeStreetGen.Shop(_r, T, _g);
    }

    private static Lamp(_r : IForgeMonumentR, T : CForgeTheme, _g : number) : IForgePart[]
    {
        const C = CForgeTheme.eCulture, L = CForgeStreetGen.eLamp, F = CForgeStreetGen.LampSpec(_r, T), H = F.H, [cx, cz] = _r.c, ang = _r.ang, ux = Math.cos(ang), uz = Math.sin(ang);
        const wood = new CForgeMeshBuf(), lamp = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), iron = new CForgeMeshBuf(), glow = new CForgeMeshBuf(), paper = new CForgeMeshBuf(), gold = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), blue = new CForgeMeshBuf();
        const P = (_a : number, _b : number) : ForgeV2 => [cx + ux * _a - uz * _b, cz + uz * _a + ux * _b];
        const V = (_a : number, _b : number, _y : number) => { const q = P(_a, _b); return [q[0], _y, q[1]]; };
        const y0 = _g, c = T.mCulture, Lathe = CForgeTowerGen.Lathe, Strut = CForgeTowerGen.Strut;
        let stoneTex = CForgeTex.sStone, paperRgb = T.mPaper;
        const fires : IForgeFire[] = [], lights : IForgeLight[] = [], rgb = CForgeStreetGen.LampRgb(F.st, T);
        const Fire = (_a : number, _b : number, _y : number, _r : number, _h : number) => { const q = P(_a, _b); fires.push({ pos : [q[0], _y, q[1]], r : _r, h : _h, rgb }); };
        //블룸 색 = Emission 색 × 알베도다. 점광원도 같은 색이어야 해서, 빛나는 메시의 알베도를 곱해 가장 큰 채널을 1로 맞춘다(예: 붉은 종이 등 = 붉은 빛)
        const Mix = (_c : number[], _alb : number[]) => { const m = _c.map((_v, _i) => _v * _alb[_i]), k = Math.max(...m, 1e-3); return m.map(_v => _v / k); };
        const glowAlb = rgb.map(_v => _v + (1 - _v) * 0.5);
        const Light = (_a : number, _b : number, _y : number, _r : number, _c : number[] = Mix(rgb, glowAlb)) => { const q = P(_a, _b); lights.push({ pos : [q[0], _y, q[1]], r : _r, rgb : _c }); };

        //육각 모서리 기둥. Lathe(seg 6)의 꼭짓점 각도와 같아서 면 모서리에 정확히 붙는다
        const Hex = (_buf : CForgeMeshBuf, _q : ForgeV2, _r0 : number, _y0 : number, _r1 : number, _y1 : number, _w : number) =>
        {
            for(let k = 0; k < 6; k++)
            {
                const a = k / 6 * Math.PI * 2, co = Math.cos(a), si = Math.sin(a);
                Strut(_buf, [_q[0] + co * _r0, _y0, _q[1] + si * _r0], [_q[0] + co * _r1, _y1, _q[1] + si * _r1], _w);
            }
        };
        //유리 등롱: 받침 접시 + 위로 벌어진 육각 유리 + 모서리 쇠기둥 + 테두리 + 갓 + 꼭지. _horn = 이탈리아식 휜 뿔. 꼭대기 높이를 돌려준다
        const Lantern = (_a : number, _b : number, _yb : number, _w : number, _horn : boolean = false) : number =>
        {
            const q = P(_a, _b);
            Lathe(lamp, q[0], q[1], [[0, _yb], [_w * 0.5, _yb], [_w * 0.62, _yb + _w * 0.12], [_w * 0.56, _yb + _w * 0.22]], 6);
            Lathe(glow, q[0], q[1], [[0, _yb + _w * 0.22], [_w * 0.54, _yb + _w * 0.22], [_w * 0.84, _yb + _w * 1.5], [0, _yb + _w * 1.5]], 6);
            Hex(lamp, q, _w * 0.58, _yb + _w * 0.2, _w * 0.9, _yb + _w * 1.52, _w * 0.09);
            Lathe(lamp, q[0], q[1], [[_w * 0.86, _yb + _w * 1.48], [_w * 1.0, _yb + _w * 1.5], [_w * 1.0, _yb + _w * 1.58], [_w * 0.8, _yb + _w * 1.7], [_w * 0.45, _yb + _w * 2.15], [_w * 0.2, _yb + _w * 2.3], [_w * 0.2, _yb + _w * 2.4]], 6);
            Lathe(lamp, q[0], q[1], [[_w * 0.14, _yb + _w * 2.38], [_w * 0.18, _yb + _w * 2.5], [_w * 0.08, _yb + _w * 2.7], [0, _yb + _w * 2.85]], 6);
            if(_horn)
                for(let k = 0; k < 6; k++)
                {
                    const a = (k + 0.5) / 6 * Math.PI * 2, co = Math.cos(a), si = Math.sin(a);
                    Strut(lamp, [q[0] + co * _w * 0.3, _yb + _w * 2.0, q[1] + si * _w * 0.3], [q[0] + co * _w * 0.9, _yb + _w * 3.0, q[1] + si * _w * 0.9], _w * 0.07);
                    Strut(lamp, [q[0] + co * _w * 0.9, _yb + _w * 3.0, q[1] + si * _w * 0.9], [q[0] + co * _w * 1.5, _yb + _w * 3.5, q[1] + si * _w * 1.5], _w * 0.05);
                }
            Light(_a, _b, _yb + _w * 0.9, 6);
            return _yb + _w * 2.85;
        };

        if(F.st == L.Hanging)
        {
            const top = y0 + H, w = 0.22, horn = T.mRegion == "italy";
            CForgeShape.Frustum(stone, cx, cz, 0.56, 0.56, 0.4, 0.4, y0 - 0.4, y0 + 0.35, ang);
            CForgeShape.Frustum(stone, cx, cz, 0.44, 0.44, 0.44, 0.44, y0 + 0.35, y0 + 0.43, ang);
            CForgeShape.Box(wood, cx, cz, 0.2, 0.2, y0 + 0.43, top, ang);
            CForgeShape.Box(iron, cx, cz, 0.24, 0.24, y0 + 0.75, y0 + 0.82, ang);
            CForgeShape.Box(iron, cx, cz, 0.24, 0.24, top - 0.62, top - 0.55, ang);
            CForgeShape.Box(wood, cx, cz, 0.3, 0.3, top, top + 0.08, ang);
            for(const s of F.twin ? [1, -1] : [1])
            {
                const yb = top - 0.12 - 0.32 - w * 2.85;
                Strut(wood, V(0, 0, top - 0.1), V(0.9 * s, 0, top - 0.1), 0.1);
                Strut(wood, V(0, 0, top - 0.8), V(0.72 * s, 0, top - 0.12), 0.07);
                Strut(iron, V(0.2 * s, 0, top - 0.1), V(0.2 * s, 0, top + 0.12), 0.03);
                Strut(iron, V(0.2 * s, 0, top + 0.12), V(0.9 * s, 0, top + 0.12), 0.03);
                Strut(iron, V(0.9 * s, 0, top + 0.12), V(0.9 * s, 0, top - 0.1), 0.03);
                Strut(iron, V(0.9 * s, 0, top - 0.1), V(0.9 * s, 0, yb + w * 2.85), 0.02);
                Lantern(0.9 * s, 0, yb, w, horn);
            }
        }
        else if(F.st == L.Brazier)
        {
            const stonePillar = c == C.Egypt || c == C.Andes, yb = y0 + (stonePillar ? H * 0.8 : H), rim = yb + 0.36, bot = yb + 0.04;
            if(c == C.Andes) stoneTex = CForgeTex.sInca;
            if(stonePillar)
            {
                CForgeShape.Frustum(stone, cx, cz, 0.78, 0.78, 0.58, 0.58, y0 - 0.4, y0 + 0.3, ang);
                CForgeShape.Frustum(stone, cx, cz, 0.62, 0.62, 0.4, 0.4, y0 + 0.3, yb - 0.15, ang);
                CForgeShape.Frustum(stone, cx, cz, 0.5, 0.5, 0.7, 0.7, yb - 0.15, yb, ang);
            }
            else
            {
                CForgeShape.Frustum(stone, cx, cz, 0.6, 0.6, 0.4, 0.4, y0 - 0.3, y0 + 0.2, ang);
                CForgeShape.Box(wood, cx, cz, 0.18, 0.18, y0 + 0.2, yb - 0.1, ang);
                CForgeShape.Box(iron, cx, cz, 0.22, 0.22, y0 + H * 0.45, y0 + H * 0.45 + 0.06, ang);
                for(const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) Strut(wood, V(a * 0.45, b * 0.45, yb - 0.05), V(0, 0, yb - 0.55), 0.07);
            }
            CForgeTowerGen.Ring(iron, cx, cz, 0.34, 0.42, rim - 0.05, rim, 12);
            CForgeTowerGen.Ring(iron, cx, cz, 0.23, 0.28, yb + 0.16, yb + 0.2, 12);
            Lathe(iron, cx, cz, [[0, bot - 0.02], [0.16, bot - 0.02], [0.16, bot + 0.04], [0, bot + 0.06]], 10);
            for(let k = 0; k < 8; k++)
            {
                const a = k / 8 * Math.PI * 2, co = Math.cos(a), si = Math.sin(a);
                Strut(iron, [cx + co * 0.38, rim, cz + si * 0.38], [cx + co * 0.14, bot, cz + si * 0.14], 0.035);
            }
            for(let k = 0; k < 3; k++) CForgeShape.Box(dark, cx, cz, 0.46, 0.1, yb + 0.1 + k * 0.07, yb + 0.2 + k * 0.07, ang + k * Math.PI / 3 + (_r.seed % 5) * 0.1);
            Fire(0, 0, yb + 0.32, 0.24, 0.95);
            Light(0, 0, yb + 0.7, 9, rgb);
        }
        else if(F.st == L.Torch)
        {
            const stonePillar = c == C.Egypt || c == C.Andes, yb = y0 + (stonePillar ? H * 0.62 : H - 1.0);
            if(c == C.Andes) stoneTex = CForgeTex.sInca;
            if(stonePillar)
            {
                CForgeShape.Frustum(stone, cx, cz, 0.74, 0.74, 0.56, 0.56, y0 - 0.4, y0 + 0.3, ang);
                CForgeShape.Frustum(stone, cx, cz, 0.58, 0.58, 0.38, 0.38, y0 + 0.3, yb, ang);
            }
            else
            {
                CForgeShape.Frustum(wood, cx, cz, 0.2, 0.2, 0.13, 0.13, y0 - 0.3, yb - 0.1, ang);
                for(let k = 0; k < 5; k++)
                {
                    const a = k / 5 * Math.PI * 2 + (_r.seed % 7) * 0.2, co = Math.cos(a), si = Math.sin(a);
                    CForgeShape.Box(stone, cx + co * 0.3, cz + si * 0.3, 0.3, 0.24, y0 - 0.1, y0 + 0.14 + (k % 2) * 0.08, a);
                }
                CForgeShape.Box(iron, cx, cz, 0.16, 0.16, y0 + 0.5, y0 + 0.56, ang);
            }
            Lathe(iron, cx, cz, [[0.06, yb - 0.2], [0.12, yb - 0.06], [0.2, yb + 0.14], [0.22, yb + 0.16], [0.2, yb + 0.18], [0.14, yb + 0.06], [0.06, yb - 0.06]], 8);
            CForgeShape.Box(wood, cx, cz, 0.07, 0.07, yb - 0.1, yb + 0.14, ang);
            Lathe(dark, cx, cz, [[0.05, yb + 0.1], [0.12, yb + 0.2], [0.15, yb + 0.38], [0.11, yb + 0.56], [0.06, yb + 0.62]], 8);
            Fire(0, 0, yb + 0.55, 0.12, 0.6);
            Light(0, 0, yb + 0.8, 7, rgb);
        }
        else if(F.st == L.Gas)
        {
            const top = y0 + H;
            Lathe(iron, cx, cz, [[0.36, y0 - 0.3], [0.36, y0 + 0.08], [0.3, y0 + 0.14], [0.27, y0 + 0.2], [0.27, y0 + 0.5], [0.2, y0 + 0.62], [0.2, y0 + 0.7], [0.13, y0 + 0.82], [0.12, y0 + 1.1],
                [0.16, y0 + 1.16], [0.16, y0 + 1.22], [0.1, y0 + 1.3], [0.075, y0 + 1.45], [0.07, top - 0.9], [0.1, top - 0.82], [0.1, top - 0.76], [0.07, top - 0.7], [0.065, top - 0.4],
                [0.1, top - 0.34], [0.1, top - 0.26], [0.065, top - 0.2], [0.05, top - 0.1]], 8);
            Strut(iron, V(0, -0.3, top - 0.95), V(0, 0.3, top - 0.95), 0.04);
            for(const s of [1, -1]) CForgeShape.Box(iron, ...P(0, 0.3 * s), 0.07, 0.07, top - 0.99, top - 0.91, ang);
            if(F.twin)
            {
                for(const s of [1, -1])
                {
                    Strut(iron, V(0, 0, top - 0.55), V(0, 0.28 * s, top - 0.3), 0.05);
                    Strut(iron, V(0, 0.28 * s, top - 0.3), V(0, 0.62 * s, top - 0.2), 0.045);
                    Strut(iron, V(0, 0.62 * s, top - 0.2), V(0, 0.66 * s, top - 0.1), 0.04);
                    Lantern(0, 0.66 * s, top - 0.1, 0.2);
                }
                Lathe(iron, cx, cz, [[0.05, top - 0.1], [0.07, top + 0.04], [0.04, top + 0.24], [0, top + 0.36]], 8);
            }
            else
            {
                for(const s of [1, -1])
                {
                    Strut(iron, V(0, 0.07 * s, top - 0.3), V(0, 0.2 * s, top - 0.15), 0.035);
                    Strut(iron, V(0, 0.2 * s, top - 0.15), V(0, 0.15 * s, top - 0.02), 0.035);
                }
                Lantern(0, 0, top - 0.05, 0.25);
            }
        }
        else if(F.st == L.Paper)
        {
            const kr = c == C.Korea, red = c == C.China, top = y0 + H, tall = c == C.Japan ? 1.25 : 1;
            if(red) paperRgb = [0.82, 0.13, 0.08]; else if(c == C.Japan) paperRgb = [0.95, 0.93, 0.86]; else paperRgb = [0.78, 0.1, 0.1];
            CForgeShape.Frustum(stone, cx, cz, 0.56, 0.56, 0.38, 0.38, y0 - 0.4, y0 + 0.3, ang);
            CForgeShape.Box(wood, cx, cz, 0.18, 0.18, y0 + 0.3, top, ang);
            CForgeShape.Box(dark, cx, cz, 0.24, 0.24, top - 0.06, top + 0.04, ang);
            for(const s of F.twin ? [1, -1] : [1])
            {
                const q = P(0.9 * s, 0), yt = top - 0.34;
                Strut(wood, V(0, 0, top - 0.1), V(0.9 * s, 0, top - 0.1), 0.09);
                Strut(wood, V(0, 0, top - 0.7), V(0.75 * s, 0, top - 0.12), 0.07);
                Strut(iron, V(0.9 * s, 0, top - 0.1), V(0.9 * s, 0, yt), 0.025);
                Light(0.9 * s, 0, yt - 0.35, 5, Mix(rgb, paperRgb));
                if(kr)
                {
                    CForgeShape.Box(lamp, q[0], q[1], 0.32, 0.32, yt - 0.04, yt, ang);
                    CForgeShape.Box(paper, q[0], q[1], 0.26, 0.26, yt - 0.42, yt - 0.04, ang);
                    CForgeShape.Box(blue, q[0], q[1], 0.26, 0.26, yt - 0.8, yt - 0.42, ang);
                    CForgeShape.Box(gold, q[0], q[1], 0.285, 0.285, yt - 0.45, yt - 0.39, ang);
                    CForgeShape.Box(gold, q[0], q[1], 0.285, 0.285, yt - 0.82, yt - 0.78, ang);
                    CForgeShape.Box(lamp, q[0], q[1], 0.3, 0.3, yt - 0.86, yt - 0.82, ang);
                    Strut(paper, [q[0], yt - 0.86, q[1]], [q[0], yt - 1.15, q[1]], 0.05);
                    continue;
                }
                const h = 0.62 * tall, yb = yt - h;
                Lathe(paper, q[0], q[1], [[0.1, yb], [0.19, yb + h * 0.12], [0.25, yb + h * 0.3], [0.27, yb + h * 0.5], [0.25, yb + h * 0.7], [0.19, yb + h * 0.88], [0.1, yt]], 14);
                for(const [f, r] of [[0.3, 0.25], [0.5, 0.27], [0.7, 0.25]]) Lathe(red ? gold : dark, q[0], q[1], [[r + 0.008, yb + h * f - 0.012], [r + 0.008, yb + h * f + 0.012]], 14);
                Lathe(lamp, q[0], q[1], [[0, yb - 0.05], [0.12, yb - 0.05], [0.12, yb + 0.01]], 12);
                Lathe(lamp, q[0], q[1], [[0.12, yt - 0.01], [0.12, yt + 0.05], [0, yt + 0.05]], 12);
                if(red)
                {
                    Strut(gold, [q[0], yb - 0.05, q[1]], [q[0], yb - 0.16, q[1]], 0.03);
                    Lathe(gold, q[0], q[1], [[0.03, yb - 0.18], [0.045, yb - 0.14], [0.03, yb - 0.1]], 8);
                    Lathe(paper, q[0], q[1], [[0.02, yb - 0.55], [0.06, yb - 0.45], [0.04, yb - 0.16]], 8);
                }
            }
        }
        else if(F.st == L.Stone)
        {
            const kr = c == C.Korea, seg = kr ? 8 : 6, y1 = y0 + H * 0.5, y2 = y1 + H * 0.2, rw = kr ? 0.58 : 0.66, rh = H * 0.18, ys = y0 + 0.34, sp = y1 - 0.22 - ys;
            Lathe(stone, cx, cz, [[0.46, y0 - 0.4], [0.46, y0 + 0.06], [0.4, y0 + 0.12], [0.4, y0 + 0.2], [0.3, y0 + 0.26], [0.2, y0 + 0.3], [0.12, ys]], seg);
            if(kr)
                Lathe(stone, cx, cz, [[0.12, ys], [0.12, ys + sp * 0.2], [0.24, ys + sp * 0.35], [0.26, ys + sp * 0.5], [0.24, ys + sp * 0.65], [0.12, ys + sp * 0.8], [0.12, ys + sp]], seg);
            else
                Lathe(stone, cx, cz, [[0.12, ys], [0.12, ys + sp * 0.45], [0.15, ys + sp * 0.5], [0.15, ys + sp * 0.58], [0.12, ys + sp * 0.63], [0.12, ys + sp]], seg);
            Lathe(stone, cx, cz, [[0.12, y1 - 0.22], [0.2, y1 - 0.18], [0.34, y1 - 0.12], [0.38, y1 - 0.06], [0.38, y1], [0, y1]], seg);
            CForgeShape.Box(glow, cx, cz, 0.36, 0.36, y1, y2, ang);
            Light(0, 0, (y1 + y2) * 0.5, 4.5);
            for(const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
            {
                const k = P(a * 0.2, b * 0.2);
                CForgeShape.Box(stone, k[0], k[1], 0.11, 0.11, y1, y2, ang);
            }
            Lathe(stone, cx, cz, [[0, y2], [rw * 0.98, y2], [rw, y2 + 0.03], [rw * 0.9, y2 + 0.07], [rw * 0.7, y2 + rh * 0.35], [rw * 0.45, y2 + rh * 0.65], [rw * 0.25, y2 + rh * 0.9], [rw * 0.2, y2 + rh]], seg);
            Lathe(stone, cx, cz, [[0.12, y2 + rh], [0.15, y2 + rh + 0.05], [0.12, y2 + rh + 0.1], [0.14, y2 + rh + 0.15], [0.07, y2 + rh + 0.25], [0, y2 + rh + 0.32]], seg);
        }
        else
        {
            const top = y0 + H, yc = y0 + H * 0.72, dy = top - yc, yb = top - 1.4, q = P(0.72, 0);
            CForgeShape.Frustum(stone, cx, cz, 0.6, 0.6, 0.5, 0.5, y0 - 0.4, y0 + 0.3, ang);
            Lathe(stone, cx, cz, [[0.24, y0 + 0.3], [0.2, y0 + 0.42], [0.17, y0 + 0.55], [0.15, y0 + 0.7], [0.15, yc - 0.15], [0.2, yc - 0.1], [0.26, yc - 0.04], [0.26, yc + 0.04], [0, yc + 0.04]], 8);
            Strut(iron, V(0, 0, yc + 0.04), V(0.06, 0, yc + dy * 0.55), 0.06);
            Strut(iron, V(0.06, 0, yc + dy * 0.55), V(0.35, 0, top - 0.04), 0.05);
            Strut(iron, V(0.35, 0, top - 0.04), V(0.72, 0, top + 0.04), 0.045);
            Strut(iron, V(0.72, 0, top + 0.04), V(0.72, 0, yb + 1.14), 0.02);
            Lathe(gold, q[0], q[1], [[0, yb - 0.12], [0.035, yb - 0.06], [0.05, yb], [0.09, yb + 0.06], [0.2, yb + 0.2]], 6);
            Lathe(glow, q[0], q[1], [[0, yb + 0.2], [0.2, yb + 0.2], [0.2, yb + 0.62], [0, yb + 0.62]], 6);
            Light(0.72, 0, yb + 0.4, 5);
            Hex(gold, q, 0.21, yb + 0.2, 0.21, yb + 0.62, 0.035);
            Lathe(gold, q[0], q[1], [[0.2, yb + 0.19], [0.235, yb + 0.2], [0.235, yb + 0.25], [0.2, yb + 0.25]], 6);
            Lathe(gold, q[0], q[1], [[0.2, yb + 0.57], [0.235, yb + 0.57], [0.235, yb + 0.62], [0.2, yb + 0.63]], 6);
            Lathe(gold, q[0], q[1], [[0.235, yb + 0.62], [0.24, yb + 0.66], [0.17, yb + 0.72], [0.18, yb + 0.76], [0.1, yb + 0.88], [0.12, yb + 0.9], [0.08, yb + 0.96], [0.035, yb + 1.05], [0, yb + 1.14]], 6);
        }

        const parts : IForgePart[] = [
            { buf : stone, rgb : T.mStone, tex : stoneTex }, { buf : wood, rgb : T.mWood, tex : CForgeTex.sWood }, { buf : iron, rgb : T.mIron },
            //등 안에 있는 점광원의 그림자를 가리지 않게, 불빛을 감싼 부품은 그림자를 드리우지 않는다(받기만 한다)
            { buf : lamp, rgb : T.mIron, noShadow : true }, { buf : glow, rgb : glowAlb, glow : true, emit : rgb, noShadow : true }, { buf : paper, rgb : paperRgb, glow : true, emit : rgb, noShadow : true },
            { buf : gold, rgb : T.mGold, noShadow : true }, { buf : dark, rgb : T.mDark }, { buf : blue, rgb : [0.1, 0.24, 0.6], noShadow : true },
        ];
        for(const l of lights) parts.push({ buf : new CForgeMeshBuf(), rgb : [1, 1, 1], light : l });
        for(const f of fires) parts.push({ buf : new CForgeMeshBuf(), rgb : [1, 1, 1], fire : f });
        return parts.filter(_p => _p.buf.mIdx.length > 0 || _p.fire != null || _p.light != null);
    }

    private static Stock(_R : CForgeRand, _P : (_a : number, _b : number) => ForgeV2, _y : number, _a : number, _b0 : number, _b1 : number, _n : number, _sack : CForgeMeshBuf, _pot : CForgeMeshBuf, _wood : CForgeMeshBuf)
    {
        for(let i = 0; i < _n; i++)
        {
            const b = _b0 + (_b1 - _b0) * (i + _R.Range(0.1, 0.9)) / _n, q = _P(_a + _R.Range(-0.12, 0.12), b), k = _R.Int(0, 2);
            if(k == 0) CForgeShape.Frustum(_sack, q[0], q[1], 0.36, 0.28, 0.16, 0.14, _y, _y + 0.34, _R.Range(0, 1));
            else if(k == 1) CForgeTowerGen.Lathe(_pot, q[0], q[1], [[0.09, _y], [0.17, _y + 0.12], [0.16, _y + 0.26], [0.09, _y + 0.34], [0.11, _y + 0.38], [0, _y + 0.36]], 10);
            else CForgeShape.Box(_wood, q[0], q[1], 0.3, 0.3, _y, _y + 0.26, _R.Range(0, 1));
        }
    }

    //문화마다 구조 자체가 다른 점포: 몽골 게르 / 사헬 진흙 점포 / 남부 아프리카 둥근 오두막 / 안데스 돌벽 이엉 점포. 정면 +u
    private static Regional(_r : IForgeMonumentR, T : CForgeTheme, _g : number, F : { st : number, W : number, D : number, Hf : number, Hr : number, goods : number }) : IForgePart[]
    {
        const S = CForgeStreetGen.eShop, { W, D } = F, [cx, cz] = _r.c, ang = _r.ang, ux = Math.cos(ang), uz = Math.sin(ang), y0 = _g;
        const wood = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), mud = new CForgeMeshBuf(), thatch = new CForgeMeshBuf(), felt = new CForgeMeshBuf(), red = new CForgeMeshBuf(), dark = new CForgeMeshBuf();
        const sack = new CForgeMeshBuf(), pot = new CForgeMeshBuf(), mat = new CForgeMeshBuf(), t = [0, 1, 2, 3].map(() => new CForgeMeshBuf());
        const R = new CForgeRand(CForgeRand.Hash(_r.seed, 939));
        const P = (_a : number, _b : number) : ForgeV2 => [cx + ux * _a - uz * _b, cz + uz * _a + ux * _b];
        const V = (_a : number, _b : number, _y : number) => { const q = P(_a, _b); return [q[0], _y, q[1]]; };
        const Two = (_buf : CForgeMeshBuf, _q : number[][], _n : number[]) => { _buf.Quad(_q, null, _n); _buf.Quad(_q, null, _n.map(_v => -_v)); };
        const TC = [[0.8, 0.2, 0.2], [0.72, 0.15, 0.42], [0.2, 0.36, 0.7], [0.92, 0.56, 0.16]];
        let stoneTex = CForgeTex.sStone, stoneRgb = T.mStone;

        if(F.st == S.Ger)
        {
            const r = W * 0.5, wh = 1.5;
            CForgeTowerGen.Lathe(felt, cx, cz, [[r, y0 - 0.1], [r, y0 + wh]], 18);
            CForgeTowerGen.Lathe(felt, cx, cz, [[r + 0.12, y0 + wh - 0.05], [r * 0.7, y0 + wh + 0.65], [r * 0.32, y0 + wh + 1.15], [r * 0.22, y0 + wh + 1.25]], 18);
            CForgeTowerGen.Lathe(red, cx, cz, [[r + 0.13, y0 + wh - 0.18], [r + 0.13, y0 + wh - 0.02]], 18);
            CForgeTowerGen.Lathe(dark, cx, cz, [[r * 0.22, y0 + wh + 1.2], [r * 0.2, y0 + wh + 1.42], [r * 0.08, y0 + wh + 1.5], [0, y0 + wh + 1.5]], 10);
            const dq = P(r + 0.02, 0);
            CForgeShape.Box(red, dq[0], dq[1], 0.14, 1.1, y0, y0 + 1.42, ang);
            CForgeShape.Box(dark, dq[0], dq[1], 0.16, 0.8, y0, y0 + 1.2, ang);
            const af = r + 1.3, yd = y0 + 1.75, yf = y0 + 1.4;
            const nl = (yd - yf) / (af - r), nn = [ux * nl, 1, uz * nl];
            for(let i = 0; i < 6; i++)
            {
                const b0 = -1.3 + 2.6 / 6 * i, b1 = b0 + 2.6 / 6;
                Two(i % 2 == 0 ? t[0] : felt, [V(r, b0, yd), V(af, b0, yf), V(af, b1, yf), V(r, b1, yd)], nn);
            }
            for(const s of [-1, 1]) { const k = P(af - 0.05, s * 1.25); CForgeShape.Box(wood, k[0], k[1], 0.1, 0.1, y0, yf + 0.05, ang); }
            const mq = P(r + 0.7, 0);
            CForgeShape.Box(mat, mq[0], mq[1], 1.3, 2.4, y0, y0 + 0.04, ang);
            CForgeStreetGen.Stock(R, P, y0 + 0.04, r + 0.7, -1.0, 1.0, F.goods, sack, pot, wood);
            for(let i = 0; i < 16; i++)
            {
                const a = Math.PI * 0.5 + Math.PI * (i + 0.5) / 16, k = P(Math.cos(a) * (r + 1.1), Math.sin(a) * (r + 1.1));
                CForgeShape.Box(wood, k[0], k[1], 0.1, 0.1, y0, y0 + 1.7 + R.Range(-0.1, 0.1), ang);
            }
        }
        else if(F.st == S.Hut)
        {
            const r = W * 0.5, wh = 1.4;
            stoneTex = CForgeTex.sDryCourse; stoneRgb = [0.55, 0.5, 0.44];
            CForgeTowerGen.Lathe(mud, cx, cz, [[r, y0 - 0.1], [r, y0 + wh]], 16);
            CForgeTowerGen.Lathe(thatch, cx, cz, [[r + 0.55, y0 + wh - 0.2], [r * 0.62, y0 + wh + 0.7], [r * 0.2, y0 + wh + 1.55], [0, y0 + wh + 2.0]], 16);
            const dq = P(r + 0.02, 0);
            CForgeShape.Box(dark, dq[0], dq[1], 0.14, 0.9, y0, y0 + 1.2, ang);
            const sq = P(r + 0.5, 0);
            CForgeShape.Box(stone, sq[0], sq[1], 0.9, 2.0, y0 - 0.2, y0 + 0.32, ang);
            CForgeStreetGen.Stock(R, P, y0 + 0.32, r + 0.5, -0.8, 0.8, F.goods, sack, pot, wood);
            for(let i = 0; i < 7; i++)
            {
                const a = Math.PI * 0.55 + Math.PI * 0.9 * i / 6, k = P(Math.cos(a) * (r + 2.1), Math.sin(a) * (r + 2.1));
                CForgeShape.Box(stone, k[0], k[1], 0.95, 0.5, y0 - 0.2, y0 + 0.75 + R.Range(-0.1, 0.1), ang + a + Math.PI * 0.5);
            }
        }
        else if(F.st == S.Sahel)
        {
            const th = 0.32, H = 2.6, a0 = -D * 0.5, a1 = D * 0.5, yt = y0 + H;
            CForgeShape.Box(mud, P(a0 + th * 0.5, 0)[0], P(a0 + th * 0.5, 0)[1], th, W, y0 - 0.1, yt, ang);
            for(const s of [-1, 1]) { const k = P(0, s * (W * 0.5 - th * 0.5)); CForgeShape.Box(mud, k[0], k[1], D, th, y0 - 0.1, yt, ang); }
            const lq = P(a1 - th * 0.5, 0);
            CForgeShape.Box(mud, lq[0], lq[1], th, W, y0 + 2.0, yt, ang);
            CForgeShape.Box(mud, cx, cz, D + 0.1, W + 0.1, yt, yt + 0.16, ang);
            for(const [a, b, w, d] of [[a0, 0, 0.16, W], [a1, 0, 0.16, W], [0, -W * 0.5, D, 0.16], [0, W * 0.5, D, 0.16]])
            {
                const k = P(a, b);
                CForgeShape.Box(mud, k[0], k[1], w, d, yt + 0.16, yt + 0.38, ang);
            }
            for(const b of [-0.8, 0, 0.8]) { const k = P(a1 + 0.15, b); CForgeShape.Box(wood, k[0], k[1], 0.5, 0.09, yt - 0.3, yt - 0.2, ang); }
            for(const s of [-1, 1]) for(const a of [a0 + 0.6, a1 - 0.6]) { const k = P(a, s * (W * 0.5 + 0.15)); CForgeShape.Box(wood, k[0], k[1], 0.09, 0.5, yt - 0.3, yt - 0.2, ang); }
            const ledge = P(a1 + 0.3, 0);
            CForgeShape.Box(mud, ledge[0], ledge[1], 0.5, W - 0.2, y0, y0 + 0.62, ang);
            const af = a1 + 1.4, yd = y0 + 2.2, yf = y0 + 1.75, nl = (yd - yf) / (af - a1), nn = [ux * nl, 1, uz * nl];
            Two(thatch, [V(a1, -W * 0.5 - 0.2, yd), V(af, -W * 0.5 - 0.2, yf), V(af, W * 0.5 + 0.2, yf), V(a1, W * 0.5 + 0.2, yd)], nn);
            for(const s of [-1, 1]) { const k = P(af - 0.05, s * (W * 0.5 + 0.1)); CForgeShape.Box(wood, k[0], k[1], 0.1, 0.1, y0, yf + 0.05, ang); }
            CForgeStreetGen.Stock(R, P, y0 + 0.62, a1 + 0.3, -W * 0.5 + 0.35, W * 0.5 - 0.35, F.goods, sack, pot, wood);
            CForgeStreetGen.Stock(R, P, y0, a1 + 1.0, -W * 0.5, W * 0.5, 3, sack, pot, wood);
        }
        else
        {
            stoneTex = CForgeTex.sInca;
            const a0 = -D * 0.5, a1 = D * 0.5, yd = y0 + 2.4, yf = y0 + 1.95;
            const bq = P(a0 + 0.2, 0);
            CForgeShape.Box(stone, bq[0], bq[1], 0.4, W, y0 - 0.2, y0 + 2.2, ang);
            for(const s of [-1, 1]) { const k = P(0, s * (W * 0.5 - 0.2)); CForgeShape.Box(stone, k[0], k[1], D, 0.4, y0 - 0.2, y0 + 1.1, ang); }
            const af = a1 + 0.5, nl = (yd - yf) / (af - a0), nn = [ux * nl, 1, uz * nl];
            Two(thatch, [V(a0 - 0.1, -W * 0.5 - 0.1, yd), V(af, -W * 0.5 - 0.1, yf), V(af, W * 0.5 + 0.1, yf), V(a0 - 0.1, W * 0.5 + 0.1, yd)], nn);
            for(const s of [-1, 1]) { const k = P(a1 - 0.1, s * (W * 0.5 - 0.1)); CForgeShape.Box(wood, k[0], k[1], 0.12, 0.12, y0, yf, ang); }
            const lq = P(a1 - 0.1, 0);
            CForgeShape.Box(wood, lq[0], lq[1], 0.1, W, yf - 0.1, yf, ang);
            const n = Math.max(5, Math.round(W / 0.4)), bw = (W - 0.3) / n;
            for(let i = 0; i < n; i++)
            {
                const b0 = -W * 0.5 + 0.15 + bw * i, hang = 0.9 + R.Range(0, 0.3);
                Two(t[(i + _r.seed) % 4], [V(a1 - 0.14, b0 + 0.02, yf - 0.1), V(a1 - 0.14, b0 + bw - 0.02, yf - 0.1), V(a1 - 0.14, b0 + bw - 0.02, yf - 0.1 - hang), V(a1 - 0.14, b0 + 0.02, yf - 0.1 - hang)], [ux, 0, uz]);
            }
            const tq = P(a1 + 0.1, 0);
            CForgeShape.Box(wood, tq[0], tq[1], 0.7, W - 0.2, y0, y0 + 0.5, ang);
            for(let i = 0; i < 4; i++) { const k = P(a1 + 0.1, -W * 0.5 + 0.4 + (W - 0.8) * i / 3); CForgeShape.Box(t[i], k[0], k[1], 0.6, 0.4, y0 + 0.5, y0 + 0.56, ang); }
            CForgeStreetGen.Stock(R, P, y0 + 0.56, a1 + 0.1, -W * 0.5 + 0.4, W * 0.5 - 0.4, 2, sack, pot, wood);
        }

        const parts : IForgePart[] = [
            { buf : wood, rgb : T.mWood, tex : CForgeTex.sWood }, { buf : stone, rgb : stoneRgb, tex : stoneTex }, { buf : mud, rgb : T.mMud[_r.seed % T.mMud.length], tex : CForgeTex.sAdobe },
            { buf : thatch, rgb : T.mThatch[0], tex : CForgeTex.sThatch }, { buf : felt, rgb : T.mFelt[0], tex : CForgeTex.sFelt }, { buf : red, rgb : [0.63, 0.2, 0.16] },
            { buf : dark, rgb : T.mDark }, { buf : sack, rgb : [0.72, 0.62, 0.45] }, { buf : pot, rgb : [0.62, 0.38, 0.26] }, { buf : mat, rgb : [0.62, 0.2, 0.16] },
            ...t.map((_b, _i) => ({ buf : _b, rgb : TC[_i] })),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    //자료 조사로 구조를 정한 점포: 중세 유럽(반목조 개방 전면·셔터 차양·위층 돌출) / 북유럽(잔디 지붕·세로 판재·엮은 울타리) / 지중해(돌 아치 개구부) /
    //근세 서유럽(벽돌·청록 목재 상점 전면·fascia·쇠 브래킷 간판) / 아랍 수크(좁고 깊은 볼트 칸·높은 단·걸린 상품·양탄자) / 고대 이집트(갈대 매트 차양·바닥 바구니·저울)
    private static Historic(_r : IForgeMonumentR, T : CForgeTheme, _g : number, F : { st : number, W : number, D : number, Hf : number, Hr : number, goods : number }) : IForgePart[]
    {
        const S = CForgeStreetGen.eShop, { W, D } = F, st = F.st, [cx, cz] = _r.c, ang = _r.ang, ux = Math.cos(ang), uz = Math.sin(ang), y0 = _g, a0 = -D * 0.5, a1 = D * 0.5;
        const nb = () => new CForgeMeshBuf();
        const wood = nb(), deck = nb(), plaster = nb(), stone = nb(), brick = nb(), roof = nb(), turf = nb(), reed = nb(), glass = nb(), iron = nb(), gold = nb(), dark = nb();
        const paint = nb(), trim = nb(), sack = nb(), pot = nb(), lat = nb(), t = [0, 1, 2, 3].map(nb);
        const R = new CForgeRand(CForgeRand.Hash(_r.seed, 940));
        const P = (_a : number, _b : number) : ForgeV2 => [cx + ux * _a - uz * _b, cz + uz * _a + ux * _b];
        const V = (_a : number, _b : number, _y : number) => { const q = P(_a, _b); return [q[0], _y, q[1]]; };
        const Bx = (_buf : CForgeMeshBuf, _a : number, _b : number, _da : number, _db : number, _ya : number, _yb : number) => { const q = P(_a, _b); CForgeShape.Box(_buf, q[0], q[1], _da, _db, y0 + _ya, y0 + _yb, ang); };
        const Two = (_buf : CForgeMeshBuf, _q : number[][], _n : number[]) => { _buf.Quad(_q, null, _n); _buf.Quad(_q, null, _n.map(_v => -_v)); };
        //맞배 지붕: 용마루가 b 방향, 앞(+a)·뒤(-a) 두 면. ya 처마 높이, yk 용마루 높이
        const Gable = (_buf : CForgeMeshBuf, _wall : CForgeMeshBuf, _af : number, _ab : number, _bh : number, _ya : number, _yk : number) =>
        {
            const ac = (_af + _ab) * 0.5, nl = (_yk - _ya) / Math.max(0.1, _af - ac);
            Two(_buf, [V(_af, -_bh, y0 + _ya), V(_af, _bh, y0 + _ya), V(ac, _bh, y0 + _yk), V(ac, -_bh, y0 + _yk)], [ux * nl, 1, uz * nl]);
            Two(_buf, [V(_ab, -_bh, y0 + _ya), V(_ab, _bh, y0 + _ya), V(ac, _bh, y0 + _yk), V(ac, -_bh, y0 + _yk)], [-ux * nl, 1, -uz * nl]);
            for(const s of [-1, 1]) _wall.Poly([V(_ab + 0.05, s * (_bh - 0.05), y0 + _ya), V(_af - 0.05, s * (_bh - 0.05), y0 + _ya), V(ac, s * (_bh - 0.05), y0 + _yk - 0.05)], [-uz * s, 0, ux * s]);
        };
        const Slope = (_buf : CForgeMeshBuf, _aw : number, _ao : number, _bh : number, _yw : number, _yo : number) =>
        {
            const nl = (_yw - _yo) / (_ao - _aw);
            Two(_buf, [V(_aw, -_bh, y0 + _yw), V(_ao, -_bh, y0 + _yo), V(_ao, _bh, y0 + _yo), V(_aw, _bh, y0 + _yw)], [ux * nl, 1, uz * nl]);
        };
        //ㄷ자 벽(뒤+양옆). 상자를 서로 겹쳐 쌓으면 모서리·윗면이 같은 평면에서 깜빡이므로 겹치지 않게 이어 붙인다. 앞(+a)은 열어 둔다
        const Shell = (_buf : CForgeMeshBuf, _th : number, _ya : number, _yb : number, _aEnd : number = a1) =>
        {
            Bx(_buf, a0 + _th * 0.5, 0, _th, W, _ya, _yb);
            for(const s of [-1, 1]) Bx(_buf, (a0 + _th + _aEnd) * 0.5, s * (W * 0.5 - _th * 0.5), _aEnd - a0 - _th, _th, _ya, _yb);
        };
        //벽에 딱 붙는 맞배 지붕: 지붕면이 벽 윗선(yw)을 지나 처마가 _over만큼 내밀고, 양끝 박공 삼각형이 벽 옆면에 이어 붙는다(벽·지붕 사이 틈 없음). 벽 앞뒤 면 aw0·aw1, 벽 반폭 bw
        const GableW = (_buf : CForgeMeshBuf, _wall : CForgeMeshBuf, _aw0 : number, _aw1 : number, _bw : number, _yw : number, _yk : number, _over : number, _side : number) =>
        {
            const ac = (_aw0 + _aw1) * 0.5, k = (_yk - _yw) / (ac - _aw0), af = _aw1 + _over, ab = _aw0 - _over, ye = _yw - k * _over, bh = _bw + _side;
            Two(_buf, [V(af, -bh, y0 + ye), V(af, bh, y0 + ye), V(ac, bh, y0 + _yk), V(ac, -bh, y0 + _yk)], [ux * k, 1, uz * k]);
            Two(_buf, [V(ab, -bh, y0 + ye), V(ab, bh, y0 + ye), V(ac, bh, y0 + _yk), V(ac, -bh, y0 + _yk)], [-ux * k, 1, -uz * k]);
            for(const s of [-1, 1]) _wall.Poly([V(_aw0, s * _bw, y0 + _yw), V(_aw1, s * _bw, y0 + _yw), V(ac, s * _bw, y0 + _yk)], [-uz * s, 0, ux * s]);
        };
        let pal = [[0.2, 0.36, 0.7], [0.8, 0.2, 0.2], [0.92, 0.88, 0.78], [0.3, 0.5, 0.3]];
        let plasterRgb = T.mPlaster[_r.seed % T.mPlaster.length], stoneRgb = T.mWallStone, stoneTex = CForgeTex.sAshlar;
        let roofRgb = T.mRoof[_r.seed % T.mRoof.length], roofTex = CForgeTex.sTile, reedRgb = [0.84, 0.74, 0.5], woodRgb = T.mWood, paintRgb = [0.55, 0.12, 0.12];
        const hang = (_buf : CForgeMeshBuf, _a : number, _b : number, _y : number, _s : number) =>
        {
            const q = P(_a, _b);
            CForgeTowerGen.Lathe(_buf, q[0], q[1], [[0.05 * _s, _y - 0.55 * _s], [0.2 * _s, _y - 0.47 * _s], [0.27 * _s, _y - 0.28 * _s], [0.2 * _s, _y - 0.09 * _s], [0.05 * _s, _y]], 14);
        };

        if(st == S.Timber)
        {
            //벽·기둥·들보는 겹치는 면이 같은 평면에 놓이지 않게 기둥·들보를 벽보다 1~4cm 내밀고, 위층 상자는 1층 벽 윗선 안으로 10cm 겹쳐 올려 틈을 없앤다
            const th = 0.3, h = 2.6, yb = h - 0.1, yt = h + 1.5, aF = a1 + 0.45, aB = a0 - 0.05, ac = (aF + aB) * 0.5;
            Shell(plaster, th, -0.1, h);
            for(const a of [a0 + 0.15, a1 - 0.1]) for(const s of [-1, 1]) Bx(wood, a + 0.015, s * (W * 0.5 - 0.1 + 0.015), 0.23, 0.23, -0.1, h);
            Bx(wood, a1 - 0.07, 0, 0.25, W + 0.08, h - 0.15, h + 0.1);
            Bx(wood, a1 + 0.45, 0, 0.5, W - 0.3, 0, 0.9);
            Bx(deck, a1 + 0.45, 0, 0.62, W - 0.15, 0.9, 0.96);
            Slope(deck, a1 + 0.04, a1 + 1.05, W * 0.5, h - 0.16, h - 0.46);
            for(const s of [-1, 1]) CForgeTowerGen.Strut(wood, V(a1 + 1.0, s * (W * 0.5 - 0.2), y0 + h - 0.45), V(a1 + 1.0, s * (W * 0.5 - 0.2), y0), 0.07);
            Bx(plaster, ac, 0, aF - aB, W + 0.2, yb, yt);
            Bx(wood, ac, 0, aF - aB + 0.06, W + 0.26, h + 0.1, h + 0.25);
            Bx(wood, ac, 0, aF - aB + 0.06, W + 0.26, h + 1.38, h + 1.46);
            for(let i = 0; i < 4; i++) Bx(wood, aF + 0.02, -W * 0.5 + W * (i + 0.5) / 4, 0.05, 0.12, h + 0.25, h + 1.38);
            Bx(wood, aF + 0.03, 0, 0.06, 0.86, h + 0.45, h + 1.15);
            Bx(glass, aF + 0.06, 0, 0.03, 0.7, h + 0.5, h + 1.1);
            GableW(roof, plaster, aB, aF, W * 0.5 + 0.1, yt, h + 2.4, 0.25, 0.15);
            Bx(dark, ac, 0, 0.14, W + 0.5, h + 2.38, h + 2.52);
            if(_r.seed % 3 == 0)
                for(let i = 0; i < 5; i++)
                {
                    const b0 = -W * 0.5 + 0.3 + (W - 0.6) * i / 5, bw = (W - 0.6) / 5 - 0.06;
                    Two(t[i % 4], [V(a1 + 0.07, b0, y0 + h - 0.2), V(a1 + 0.07, b0 + bw, y0 + h - 0.2), V(a1 + 0.07, b0 + bw, y0 + h - 1.3), V(a1 + 0.07, b0, y0 + h - 1.3)], [ux, 0, uz]);
                }
            else CForgeStreetGen.Stock(R, P, y0 + 0.96, a1 + 0.45, -W * 0.5 + 0.3, W * 0.5 - 0.3, F.goods, sack, pot, wood);
            CForgeTowerGen.Strut(iron, V(aF + 0.01, W * 0.5 - 0.1, y0 + h + 0.85), V(aF + 0.7, W * 0.5 - 0.1, y0 + h + 0.85), 0.04);
            Bx(paint, aF + 0.7, W * 0.5 - 0.1, 0.06, 0.4, h + 0.4, h + 0.8);
        }
        else if(st == S.Norse)
        {
            const hb = 0.45, ye = 1.9, yk = 3.0, ac = (a0 + a1) * 0.5;
            pal = [[0.45, 0.3, 0.2], [0.6, 0.58, 0.55], [0.5, 0.4, 0.3], [0.35, 0.25, 0.18]];
            Bx(stone, 0, 0, D + 0.3, W + 0.3, -0.3, hb);
            Shell(deck, 0.12, hb, ye);
            GableW(turf, deck, a0, a1, W * 0.5, ye, yk, 0.6, 0.2);
            for(const s of [-1, 1])
            {
                CForgeTowerGen.Strut(wood, V(ac - 0.55, s * (W * 0.5 + 0.25), y0 + yk - 0.15), V(ac + 0.55, s * (W * 0.5 + 0.25), y0 + yk + 0.55), 0.08);
                CForgeTowerGen.Strut(wood, V(ac + 0.55, s * (W * 0.5 + 0.25), y0 + yk - 0.15), V(ac - 0.55, s * (W * 0.5 + 0.25), y0 + yk + 0.55), 0.08);
                Bx(wood, a1 + 0.5, s * (W * 0.5 - 0.1), 0.14, 0.14, hb, 1.45);
            }
            Bx(deck, a1 + 0.4, 0, 0.7, W - 0.8, 0.88, 0.94);
            for(const s of [-1, 1]) Bx(wood, a1 + 0.4, s * (W * 0.5 - 0.6), 0.5, 0.08, 0, 0.88);
            const n = 13;
            for(let i = 0; i < n; i++)
            {
                const b = -W * 0.5 + W * i / (n - 1);
                if(Math.abs(b) < 0.55) continue;
                Bx(wood, a1 + 1.1, b, 0.05, 0.05, 0, 0.9);
            }
            for(const s of [-1, 1]) for(const y of [0.3, 0.6]) Bx(reed, a1 + 1.1, s * (0.55 + W * 0.5) * 0.5, 0.04, W * 0.5 - 0.55, y, y + 0.04);
            for(let i = 0; i < 3; i++)
            {
                const b0 = -W * 0.5 + 0.5 + (W - 1.0) * i / 3, bw = (W - 1.0) / 3 - 0.1;
                Two(t[i % 2], [V(a0 + 0.25, b0, y0 + 1.7), V(a0 + 0.25, b0 + bw, y0 + 1.7), V(a0 + 0.25, b0 + bw, y0 + 0.7), V(a0 + 0.25, b0, y0 + 0.7)], [ux, 0, uz]);
            }
            CForgeStreetGen.Stock(R, P, y0 + 0.94, a1 + 0.4, -W * 0.5 + 0.6, W * 0.5 - 0.6, F.goods, sack, pot, wood);
        }
        else if(st == S.Arch)
        {
            const h = 3.4, ra = (W - 1.5) * 0.5, yc = 2.2, n = 10, pw = W * 0.5 - ra;
            pal = [[0.93, 0.89, 0.78], [0.76, 0.4, 0.24], [0.2, 0.36, 0.55], [0.4, 0.5, 0.3]];
            Shell(stone, 0.4, -0.2, h, a1 - 0.4);
            for(const s of [-1, 1]) Bx(stone, a1 - 0.2, s * (W * 0.5 - pw * 0.5), 0.4, pw, -0.2, h);
            Bx(stone, a1 - 0.2, 0, 0.4, ra * 2, yc + ra, h);
            const arc = Array.from({ length : n + 1 }, (_v, k) => [ra * Math.cos(Math.PI * k / n), yc + ra * Math.sin(Math.PI * k / n)]);
            for(let k = 0; k < n; k++) CForgeTowerGen.Strut(stone, V(a1 - 0.02, arc[k][0], y0 + arc[k][1]), V(a1 - 0.02, arc[k + 1][0], y0 + arc[k + 1][1]), 0.3);
            for(const s of [-1, 1])
            {
                stone.Poly([V(a1, s * ra, y0 + yc + ra), ...arc.slice(0, n / 2 + 1).map(_p => V(a1, s * _p[0], y0 + _p[1]))], [ux, 0, uz]);
            }
            GableW(roof, stone, a0, a1, W * 0.5, h, h + 0.55, 0.4, 0.2);
            Bx(stone, a1 - 0.7, 0, 0.5, ra * 2, 0, 0.9);
            for(const y of [1.25, 1.85]) Bx(wood, a0 + 0.5, 0, 0.3, W - 0.9, y, y + 0.06);
            const af = a1 + 1.2, yd = 2.95, yf = 2.5, nl = (yd - yf) / (af - a1), nn = [ux * nl, 1, uz * nl];
            Two(t[0], [V(a1, -W * 0.5 - 0.1, y0 + yd), V(af, -W * 0.5 - 0.1, y0 + yf), V(af, W * 0.5 + 0.1, y0 + yf), V(a1, W * 0.5 + 0.1, y0 + yd)], nn);
            for(const s of [-1, 1]) CForgeTowerGen.Strut(wood, V(af - 0.05, s * (W * 0.5 + 0.05), y0 + yf), V(af - 0.05, s * (W * 0.5 + 0.05), y0), 0.09);
            CForgeStreetGen.Stock(R, P, y0 + 0.9, a1 - 0.7, -ra + 0.3, ra - 0.3, F.goods, sack, pot, wood);
            CForgeStreetGen.Stock(R, P, y0 + 1.31, a0 + 0.5, -W * 0.5 + 0.7, W * 0.5 - 0.7, 3, sack, pot, wood);
        }
        else if(st == S.Front)
        {
            const hg = 3.0, he = 5.4, yk = 6.5, ac = (a0 + a1) * 0.5;
            Bx(brick, 0, 0, D, W, -0.1, he);
            for(const s of [-1, 1]) Bx(paint, a1 + 0.08, s * (W * 0.5 - 0.2), 0.16, 0.4, 0, hg);
            Bx(paint, a1 + 0.1, 0, 0.2, W, hg - 0.55, hg);
            Bx(paint, a1 + 0.08, 0, 0.14, W - 0.8, 0, 0.8);
            const pc = (0.5 + W * 0.5 - 0.4) * 0.5, pwid = W * 0.5 - 0.9;
            for(const s of [-1, 1])
            {
                Bx(glass, a1 + 0.03, s * pc, 0.03, pwid, 0.8, hg - 0.6);
                for(let i = 0; i <= 3; i++) Bx(paint, a1 + 0.09, s * (pc - pwid * 0.5 + pwid * i / 3), 0.05, 0.04, 0.8, hg - 0.6);
                for(const y of [1.5, 2.1]) Bx(paint, a1 + 0.09, s * pc, 0.05, pwid, y, y + 0.04);
            }
            Bx(wood, a1 + 0.05, 0, 0.1, 1.0, 0, hg - 0.6);
            Bx(glass, a1 + 0.11, 0, 0.02, 0.6, 1.0, hg - 0.7);
            for(const s of [-1, 1])
            {
                Bx(trim, a1 + 0.03, s * W * 0.25, 0.06, 0.8, hg + 0.5, hg + 1.9);
                Bx(glass, a1 + 0.06, s * W * 0.25, 0.03, 0.62, hg + 0.62, hg + 1.78);
                Bx(trim, a1 + 0.08, s * W * 0.25, 0.04, 0.04, hg + 0.62, hg + 1.78);
                Bx(trim, a1 + 0.08, s * W * 0.25, 0.04, 0.62, hg + 1.18, hg + 1.22);
            }
            GableW(roof, brick, a0, a1, W * 0.5, he, yk, 0.5, 0.12);
            Bx(brick, a0 + 0.7, W * 0.25, 0.6, 0.6, he - 0.2, yk + 0.9);
            Bx(dark, ac, 0, 0.14, W + 0.2, yk - 0.02, yk + 0.12);
            const bb = -W * 0.5 + 0.35;
            CForgeTowerGen.Strut(iron, V(a1 + 0.12, bb, y0 + hg + 1.0), V(a1 + 1.4, bb, y0 + hg + 1.0), 0.05);
            for(const s of [-1, 1]) CForgeTowerGen.Strut(iron, V(a1 + 1.3, bb + s * 0.4, y0 + hg + 1.0), V(a1 + 1.3, bb + s * 0.4, y0 + hg + 0.78), 0.02);
            Bx(paint, a1 + 1.3, bb, 0.06, 0.95, hg + 0.1, hg + 0.78);
            Bx(gold, a1 + 1.34, bb, 0.03, 0.8, hg + 0.55, hg + 0.62);
        }
        else if(st == S.Souk)
        {
            const r = W * 0.5, sp = 2.2, n = 8;
            plasterRgb = T.mWallBody; pal = [[0.66, 0.12, 0.12], [0.1, 0.3, 0.55], [0.1, 0.45, 0.35], [0.76, 0.5, 0.14]];
            Shell(plaster, 0.3, -0.1, sp);
            Bx(plaster, a0 + 0.15, 0, 0.3, W, sp, sp + r);
            for(let k = 0; k < n; k++)
            {
                const th0 = Math.PI * k / n, th1 = Math.PI * (k + 1) / n, thm = (th0 + th1) * 0.5;
                Two(plaster, [V(a0, r * Math.cos(th0), y0 + sp + r * Math.sin(th0)), V(a1, r * Math.cos(th0), y0 + sp + r * Math.sin(th0)), V(a1, r * Math.cos(th1), y0 + sp + r * Math.sin(th1)), V(a0, r * Math.cos(th1), y0 + sp + r * Math.sin(th1))],
                    [-uz * Math.cos(thm), Math.sin(thm), ux * Math.cos(thm)]);
                CForgeTowerGen.Strut(trim, V(a1 + 0.02, r * Math.cos(th0), y0 + sp + r * Math.sin(th0)), V(a1 + 0.02, r * Math.cos(th1), y0 + sp + r * Math.sin(th1)), 0.3);
            }
            Bx(stone, a1 + 0.5, 0, 1.0, W - 0.1, -0.1, 0.8);
            for(const y of [1.0, 1.7]) Bx(wood, a0 + 0.4, 0, 0.35, W - 0.7, y, y + 0.06);
            for(const s of [-1, 1]) for(let i = 0; i < 2; i++)
            {
                const am = -0.6 + i * 1.3;
                Two(t[(i + (s > 0 ? 0 : 2) + _r.seed) % 4], [V(am - 0.55, s * (W * 0.5 - 0.31), y0 + 0.9), V(am + 0.55, s * (W * 0.5 - 0.31), y0 + 0.9), V(am + 0.55, s * (W * 0.5 - 0.31), y0 + 2.0), V(am - 0.55, s * (W * 0.5 - 0.31), y0 + 2.0)], [-uz * s, 0, ux * s]);
            }
            for(let i = 0; i < 9; i++)
            {
                const a = R.Range(a0 + 0.5, a1 - 0.2), b = R.Range(-r * 0.75, r * 0.75), yv = y0 + sp + Math.sqrt(Math.max(0.01, r * r - b * b)) - 0.04, q = P(a, b), len = R.Range(0.4, 0.9);
                CForgeTowerGen.Strut(iron, [q[0], yv, q[1]], [q[0], yv - len, q[1]], 0.02);
                const y = yv - len;
                if(i % 2 == 0) CForgeTowerGen.Lathe(gold, q[0], q[1], [[0.02, y - 0.38], [0.1, y - 0.28], [0.13, y - 0.16], [0.08, y - 0.04], [0, y]], 8);
                else CForgeTowerGen.Lathe(pot, q[0], q[1], [[0.07, y - 0.32], [0.14, y - 0.2], [0.12, y - 0.06], [0.04, y]], 8);
            }
            CForgeStreetGen.Stock(R, P, y0 + 0.8, a1 + 0.5, -r + 0.3, r - 0.3, F.goods, sack, pot, wood);
            CForgeStreetGen.Stock(R, P, y0 + 1.06, a0 + 0.4, -r + 0.3, r - 0.3, 3, sack, gold, wood);
        }
        else if(st == S.Reed)
        {
            const hf = 1.85, hr = 1.95;
            for(const [a, b, h] of [[a1 - 0.1, -1, hf], [a1 - 0.1, 1, hf], [a0 + 0.1, -1, hr], [a0 + 0.1, 1, hr]]) Bx(wood, a, b * (W * 0.5 - 0.1), 0.1, 0.1, 0, h);
            Two(reed, [V(a0 - 0.2, -W * 0.5 - 0.2, y0 + hr), V(a1 + 0.3, -W * 0.5 - 0.2, y0 + hf), V(a1 + 0.3, W * 0.5 + 0.2, y0 + hf), V(a0 - 0.2, W * 0.5 + 0.2, y0 + hr)], [ux * (hr - hf) / (D + 0.5), 1, uz * (hr - hf) / (D + 0.5)]);
            CForgeTowerGen.Strut(wood, V(a1 + 0.3, -W * 0.5 - 0.2, y0 + hf), V(a1 + 0.3, W * 0.5 + 0.2, y0 + hf), 0.06);
            CForgeTowerGen.Strut(wood, V(a0 - 0.2, -W * 0.5 - 0.2, y0 + hr), V(a0 - 0.2, W * 0.5 + 0.2, y0 + hr), 0.06);
            Bx(reed, 0, 0, D, W, 0, 0.04);
            for(let i = 0; i < 6; i++)
            {
                const q = P(R.Range(a1 - 1.0, a1 + 0.05), -W * 0.5 + 0.3 + (W - 0.6) * (i + R.Range(0.1, 0.9)) / 6), y = y0 + 0.04, k = R.Chance(0.5);
                CForgeTowerGen.Lathe(pot, q[0], q[1], k ? [[0.16, y], [0.26, y + 0.14], [0.22, y + 0.3], [0.13, y + 0.33], [0, y + 0.3]] : [[0.12, y], [0.2, y + 0.12], [0.17, y + 0.26], [0.1, y + 0.3], [0, y + 0.28]], 10);
            }
            CForgeStreetGen.Stock(R, P, y0 + 0.04, a0 + 0.7, -W * 0.5 + 0.3, W * 0.5 - 0.3, 3, sack, pot, wood);
            const sb = W * 0.5 - 0.35, sa = a1 - 0.15;
            Bx(wood, sa, sb, 0.06, 0.06, 0.04, 1.3);
            CForgeTowerGen.Strut(wood, V(sa, sb - 0.4, y0 + 1.3), V(sa, sb + 0.4, y0 + 1.3), 0.05);
            for(const s of [-1, 1])
            {
                const q = P(sa, sb + s * 0.4);
                CForgeTowerGen.Strut(iron, [q[0], y0 + 1.3, q[1]], [q[0], y0 + 0.95, q[1]], 0.015);
                CForgeTowerGen.Lathe(gold, q[0], q[1], [[0, y0 + 0.93], [0.13, y0 + 0.95], [0.14, y0 + 0.98]], 10);
            }
        }
        else if(st == S.Jumak)
        {
            //김홍도 〈주막〉: 두꺼운 초가에 낮은 처마, 거친 통나무 기둥, 사방이 트인 마루, 흙 부뚜막 카운터와 가마솥, 갈대 바람막이, 장대 끝 용수
            reedRgb = [0.7, 0.58, 0.38]; plasterRgb = [0.67, 0.55, 0.43]; woodRgb = [0.35, 0.29, 0.24];
            const ye = 2.0, yk = 3.4, side = _r.seed % 2 ? 1 : -1;
            for(const a of [a1 - 0.1, a0 + 0.1]) for(const s of [-1, 1]) Bx(wood, a, s * (W * 0.5 - 0.15), 0.18, 0.18, -0.1, ye + 0.15);
            Bx(wood, a1 - 0.1, 0, 0.14, W - 0.2, ye - 0.1, ye + 0.1);
            Gable(reed, reed, a1 + 0.9, a0 - 0.6, W * 0.5 + 0.5, ye + 0.05, yk);
            Bx(deck, 0, 0, D - 0.3, W - 0.5, -0.1, 0.3);
            Bx(plaster, a1 - 0.55, 0, 0.8, W - 1.2, 0, 0.85);
            const cq = P(a1 - 0.55, -0.7), cy = y0 + 0.85;
            CForgeTowerGen.Lathe(dark, cq[0], cq[1], [[0.18, cy], [0.3, cy + 0.12], [0.35, cy + 0.3], [0.3, cy + 0.4], [0.22, cy + 0.38]], 12);
            CForgeStreetGen.Stock(R, P, y0 + 0.85, a1 - 0.55, 0.1, W * 0.5 - 0.8, 3, sack, pot, wood);
            Bx(reed, 0, side * (W * 0.5 + 0.1), D, 0.1, 0, 1.8);
            Bx(reed, a0 - 0.15, 0, 0.1, W * 0.6, 0, 1.7);
            for(const b of [-0.9, 0.9])
            {
                Bx(deck, a0 + 0.9, b, 0.5, 0.5, 0.58, 0.63);
                for(const [da, db] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) Bx(wood, a0 + 0.9 + da * 0.2, b + db * 0.2, 0.06, 0.06, 0.3, 0.58);
            }
            const pb = -side * (W * 0.5 + 0.4), py = 3.7;
            Bx(wood, a1 - 0.1, pb, 0.1, 0.1, 0, 4.4);
            const yq = P(a1 - 0.1, pb);
            CForgeTowerGen.Lathe(reed, yq[0], yq[1], [[0.14, y0 + py], [0.2, y0 + py + 0.18], [0.2, y0 + py + 0.55], [0.12, y0 + py + 0.7]], 10);
            hang(trim, a1 + 0.05, 0.9, y0 + ye - 0.15, 0.6);
        }
        else if(st == S.Janglang)
        {
            //개경 시전 장랑: 낮은 마루 위에 기둥이 늘어선 단층 기와 점포. 간판은 높은 곳에 건다
            roofTex = CForgeTex.sGiwa; roofRgb = [0.33, 0.36, 0.4];
            const ye = 2.9, yk = 3.8, ac = (a1 + 0.9 + a0 - 0.7) * 0.5;
            Bx(deck, 0, 0, D, W, -0.1, 0.45);
            for(const a of [a1 - 0.15, a0 + 0.15]) { for(const s of [-1, 1]) Bx(lat, a, s * (W * 0.5 - 0.2), 0.2, 0.2, 0.45, ye); Bx(lat, a, 0, 0.18, W, ye - 0.2, ye); }
            Bx(deck, a0 + 0.1, 0, 0.1, W - 0.3, 0.45, ye - 0.2);
            for(const s of [-1, 1]) Bx(deck, 0, s * (W * 0.5 - 0.1), D - 0.4, 0.06, 0.45, ye - 0.3);
            Gable(roof, plaster, a1 + 0.9, a0 - 0.7, W * 0.5 + 0.4, ye, yk);
            Bx(dark, ac, 0, 0.16, W + 0.8, yk - 0.02, yk + 0.14);
            Bx(dark, a1 - 0.12, 0, 0.06, 1.1, ye - 1.0, ye - 0.25);
            Bx(gold, a1 - 0.09, 0, 0.02, 1.1, ye - 0.3, ye - 0.25);
            CForgeStreetGen.Stock(R, P, y0 + 0.45, a1 - 0.5, -W * 0.5 + 0.5, W * 0.5 - 0.5, F.goods, sack, pot, wood);
        }
        else if(st == S.Machiya)
        {
            //에도 마치야: 어두운 목재 벽, 가는 세로 격자(고시), 입구의 흰 노렌, 얇은 기와 처마(히사시), 갈대발(스다레) 달린 2층, 입간판
            roofTex = CForgeTex.sKawara; roofRgb = [0.27, 0.28, 0.31]; plasterRgb = [0.93, 0.91, 0.86];
            pal = [[0.12, 0.16, 0.35], [0.65, 0.18, 0.15], [0.93, 0.9, 0.82], [0.2, 0.3, 0.25]];
            const h1 = 2.7, h2 = 4.1, cb = (0.15 + W * 0.5 - 0.3) * 0.5, wl = W * 0.5 - 0.45;
            Shell(lat, 0.3, -0.1, h2);
            for(const s of [-1, 1]) Bx(lat, a1 - 0.1, s * (W * 0.5 - 0.12 + 0.015), 0.23, 0.23, -0.1, h1);
            Bx(lat, a1 - 0.1, 0, 0.2, W + 0.06, h1 - 0.2, h1 + 0.05);
            Bx(lat, a1 - 0.15, 0, 0.3, W - 0.6, h1 + 0.05, h2);
            for(let i = 0; i < 12; i++) Bx(lat, a1 - 0.05, 0.15 + wl * i / 11, 0.05, 0.05, 0.35, 2.3);
            for(const y of [0.3, 2.3]) Bx(lat, a1 - 0.05, cb, 0.06, wl, y, y + 0.08);
            Bx(lat, a1 - 0.08, cb, 0.1, wl, 0, 0.35);
            Bx(dark, a1 - 0.2, -W * 0.25, 0.05, W * 0.4, 0, 2.3);
            const nw = (W * 0.5 - 0.4) / 3;
            for(let i = 0; i < 3; i++)
            {
                const b0 = -W * 0.5 + 0.3 + i * (nw + 0.04);
                Two(trim, [V(a1 + 0.02, b0, y0 + 2.45), V(a1 + 0.02, b0 + nw, y0 + 2.45), V(a1 + 0.02, b0 + nw, y0 + 1.5), V(a1 + 0.02, b0, y0 + 1.5)], [ux, 0, uz]);
            }
            Bx(dark, a1 + 0.04, -W * 0.5 + 0.3 + 1.5 * (nw + 0.04) - 0.02, 0.02, 0.3, 1.85, 2.15);
            Slope(roof, a1 - 0.1, a1 + 0.95, W * 0.5 + 0.1, h1 + 0.25, h1 - 0.05);
            for(const s of [-1, 1]) Bx(reed, a1 - 0.0, s * W * 0.25, 0.04, 1.0, h1 + 0.5, h1 + 1.3);
            GableW(roof, plaster, a0, a1, W * 0.5, h2, h2 + 0.9, 0.5, 0.15);
            const sb = W * 0.5 + 0.35;
            Bx(wood, a1 + 1.1, sb, 0.1, 0.1, 0, 1.8);
            Bx(trim, a1 + 1.1, sb, 0.08, 0.75, 1.0, 1.8);
            Bx(dark, a1 + 1.15, sb, 0.02, 0.35, 1.2, 1.6);
            Bx(deck, a1 + 0.45, W * 0.25, 0.5, 1.2, 0, 0.45);
            for(let i = 0; i < 4; i++) Bx(t[i], a1 + 0.45, W * 0.25 - 0.4 + i * 0.27, 0.18, 0.2, 0.45, 0.8);
        }
        else if(st == S.Cart)
        {
            //에도 야타이: 상자형 몸체 위에 얇은 널지붕과 이치마쓰 천, 처마 아래 노렌, 사각 행등, 스시 쟁반
            roofRgb = [0.78, 0.63, 0.35];
            pal = [[0.12, 0.16, 0.35], [0.85, 0.5, 0.45], [0.93, 0.9, 0.82], [0.2, 0.3, 0.25]];
            const yw = 2.0, yo = 1.9, nl = (yw - yo) / (D + 0.4);
            Slope(deck, a0 - 0.1, a1 + 0.3, W * 0.5 + 0.15, yw, yo);
            for(let i = 0; i < 6; i++) for(let j = 0; j < 4; j++)
            {
                const a2 = a0 - 0.1 + (D + 0.4) * i / 6, a3 = a0 - 0.1 + (D + 0.4) * (i + 1) / 6, b2 = -W * 0.5 - 0.15 + (W + 0.3) * j / 4, b3 = b2 + (W + 0.3) / 4;
                const yAt = (_a : number) => yw - (yw - yo) * (_a - a0 + 0.1) / (D + 0.4) + 0.02, y2 = yAt(a2), y3 = yAt(a3);
                ((i + j) % 2 == 0 ? t[0] : trim).Quad([V(a2, b2, y0 + y2), V(a3, b2, y0 + y3), V(a3, b3, y0 + y3), V(a2, b3, y0 + y2)], null, [ux * nl, 1, uz * nl]);
            }
            for(const a of [a1 - 0.1, a0 + 0.1]) for(const s of [-1, 1]) Bx(lat, a, s * (W * 0.5 - 0.08), 0.1, 0.1, 0, yw);
            Bx(lat, 0, 0, D - 0.3, W - 0.1, 0.3, 0.95);
            Bx(deck, a1 - 0.3, 0, 0.5, W, 0.95, 1.0);
            for(let i = 0; i < 3; i++)
            {
                const b0 = -W * 0.5 + 0.1 + i * (W - 0.2) / 3;
                Two(trim, [V(a1 + 0.12, b0, y0 + 1.9), V(a1 + 0.12, b0 + (W - 0.2) / 3 - 0.04, y0 + 1.9), V(a1 + 0.12, b0 + (W - 0.2) / 3 - 0.04, y0 + 1.35), V(a1 + 0.12, b0, y0 + 1.35)], [ux, 0, uz]);
            }
            const lb = W * 0.5 + 0.25;
            Bx(trim, a1, lb, 0.28, 0.28, 1.2, 1.65);
            Bx(dark, a1, lb, 0.32, 0.32, 1.65, 1.7);
            Bx(dark, a1, lb, 0.32, 0.32, 1.15, 1.2);
            Bx(dark, a1 + 0.15, lb, 0.02, 0.16, 1.3, 1.55);
            for(let i = 0; i < 6; i++) { const b = -W * 0.5 + 0.3 + (W - 0.6) * i / 5; Bx(trim, a1 - 0.3, b, 0.1, 0.16, 1.0, 1.07); Bx(t[1], a1 - 0.3, b, 0.1, 0.16, 1.07, 1.1); }
        }
        else if(st == S.Open)
        {
            //일편상인회전의 시장: 벽 없이 기둥만 선 길고 낮은 검은 널지붕 가설 점포, 바닥에 앉아 파는 좌판, 깃발 하나
            roofTex = CForgeTex.sShingle; roofRgb = [0.24, 0.22, 0.21];
            pal = [[0.2, 0.3, 0.25], [0.7, 0.15, 0.12], [0.93, 0.9, 0.82], [0.12, 0.16, 0.35]];
            for(const a of [a1 - 0.1, 0, a0 + 0.1]) for(const s of [-1, 1]) Bx(lat, a, s * (W * 0.5 - 0.15), 0.16, 0.16, 0, 2.7);
            Gable(roof, deck, a1 + 0.7, a0 - 0.5, W * 0.5 + 0.4, 2.7, 3.7);
            Bx(reed, 0, 0, D, W, 0, 0.1);
            CForgeStreetGen.Stock(R, P, y0 + 0.1, a1 - 0.6, -W * 0.5 + 0.6, W * 0.5 - 0.6, F.goods + 2, sack, pot, wood);
            CForgeStreetGen.Stock(R, P, y0 + 0.1, 0, -W * 0.5 + 0.6, W * 0.5 - 0.6, 3, sack, pot, wood);
            const fb = W * 0.5 + 0.5;
            Bx(wood, a1 + 0.3, fb, 0.07, 0.07, 0, 4.2);
            Two(t[1], [V(a1 + 0.3, fb, y0 + 4.1), V(a1 + 0.3, fb + 0.9, y0 + 4.1), V(a1 + 0.3, fb + 0.9, y0 + 2.9), V(a1 + 0.3, fb, y0 + 2.9)], [ux, 0, uz]);
        }
        else if(st == S.Qing)
        {
            //청대 북방 점포: 회색 벽돌 파사드, 붉은 기둥, 격자 입구 둘, 금띠 처마보와 남색 차양, 검은 바탕 금자 편액 셋, 지붕 위로 솟은 세로 간판(충천초패)과 붉은 등롱(호자)
            stoneRgb = [0.62, 0.62, 0.66]; stoneTex = CForgeTex.sQingzhuan; roofRgb = [0.45, 0.46, 0.5]; paintRgb = [0.65, 0.1, 0.1];
            pal = [[0.7, 0.1, 0.1], [0.1, 0.14, 0.3], [0.93, 0.9, 0.82], [0.76, 0.5, 0.14]];
            const hg = 3.2;
            Bx(stone, (a0 + a1 - 0.25) * 0.5, 0, D - 0.25, W - 0.1, -0.1, 4.2);
            Bx(stone, a1 - 0.1, 0, 0.3, W, -0.1, 5.4);
            GableW(roof, stone, a0, a1 - 0.25, W * 0.5 - 0.05, 4.2, 5.2, 0.3, 0.15);
            for(const b of [-W * 0.5 + 0.2, -W / 6, W / 6, W * 0.5 - 0.2]) Bx(paint, a1 + 0.12, b, 0.24, 0.24, 0, hg);
            for(const s of [-1, 1])
            {
                Bx(dark, a1 + 0.05, s * W * 0.33, 0.04, 1.0, 0, 2.5);
                Bx(lat, a1 + 0.1, s * W * 0.33, 0.05, 1.0, 1.5, 2.5);
            }
            Bx(lat, a1 + 0.08, 0, 0.05, W * 0.2, 0.9, 2.3);
            Bx(paint, a1 + 0.3, 0, 0.5, W + 0.3, hg, hg + 0.3);
            Bx(gold, a1 + 0.56, 0, 0.03, W + 0.2, hg + 0.08, hg + 0.2);
            Slope(t[1], a1 + 0.1, a1 + 1.2, W * 0.5, hg - 0.1, hg - 0.55);
            for(const b of [-W * 0.33, 0, W * 0.33])
            {
                Bx(dark, a1 + 0.1, b, 0.06, W * 0.3, hg + 0.7, hg + 1.9);
                Bx(gold, a1 + 0.13, b, 0.02, W * 0.18, hg + 1.05, hg + 1.55);
            }
            const sb = W * 0.5 - 0.1;
            Bx(paint, a1 + 1.6, sb, 0.14, 0.7, 0, 5.6);
            Bx(gold, a1 + 1.68, sb, 0.02, 0.5, 3.0, 4.8);
            Bx(stone, a1 + 1.6, sb, 0.5, 1.0, -0.1, 0.3);
            for(const s of [-1, 1]) hang(paint, a1 + 0.9, s * (W * 0.5 - 0.8), y0 + hg - 0.6, 1);
        }
        else if(st == S.Water)
        {
            //강남 수향 점포: 흰 회벽에 어두운 기와, 나무 문짝을 접어 연 가게 앞, 수변 돌계단, 붉은 등롱
            plasterRgb = [0.93, 0.92, 0.88]; roofRgb = [0.3, 0.31, 0.34]; paintRgb = [0.7, 0.12, 0.1];
            const h = 3.3;
            Shell(plaster, 0.3, -0.1, h);
            for(const b of [-W * 0.5 + 0.15, -W / 6, W / 6, W * 0.5 - 0.15]) Bx(wood, a1 - 0.085, b + Math.sign(b) * 0.015, 0.23, 0.23, -0.1, h);
            Bx(wood, a1 - 0.07, 0, 0.25, W + 0.08, h - 0.25, h + 0.05);
            for(const s of [-1, 1]) Bx(deck, a1 - 0.16, s * W * 0.33, 0.05, W / 3 - 0.3, 0.1, h - 0.4);
            Bx(deck, a1 + 0.2, 0, 0.5, W - 0.8, 0, 0.9);
            CForgeStreetGen.Stock(R, P, y0 + 0.9, a1 + 0.2, -W * 0.5 + 0.6, W * 0.5 - 0.6, F.goods, sack, pot, wood);
            GableW(roof, plaster, a0, a1, W * 0.5, h, h + 1.2, 0.5, 0.25);
            Bx(stone, a1 + 0.9, 0, 0.8, W, -0.3, 0.15);
            Bx(stone, a1 + 1.5, 0, 0.5, W - 0.5, -0.3, 0.0);
            hang(paint, a1 + 0.6, W * 0.5 - 0.1, y0 + h - 0.1, 1);
        }
        else
        {
            //송대(청명상하도) 노점: 대나무 기둥 작은 맞배 가게와 탁자, 대나무 장대 위 둥근 일산 아래 노점, 높은 깃대의 주기(酒旗), 매단 등
            pal = [[0.9, 0.85, 0.7], [0.75, 0.15, 0.12], [0.93, 0.9, 0.82], [0.2, 0.3, 0.25]]; paintRgb = [0.75, 0.12, 0.1];
            for(const a of [a1 - 0.1, a0 + 0.1]) for(const s of [-1, 1]) Bx(wood, a, s * (W * 0.5 - 0.1), 0.09, 0.09, 0, 2.4);
            Gable(roof, deck, a1 + 0.5, a0 - 0.3, W * 0.5 + 0.3, 2.4, 3.2);
            Bx(deck, 0, 0, 0.8, W - 0.8, 0.7, 0.75);
            for(const s of [-1, 1]) Bx(wood, 0, s * (W * 0.5 - 0.5), 0.6, 0.07, 0, 0.7);
            Bx(deck, a1 - 0.55, 0, 0.3, W - 0.8, 0.4, 0.44);
            const pu = P(a1 + 1.3, -W * 0.5 + 0.3), py = y0 + 2.6;
            Bx(wood, a1 + 1.3, -W * 0.5 + 0.3, 0.07, 0.07, 0, 2.6);
            CForgeTowerGen.Lathe(t[1], pu[0], pu[1], [[1.0, py - 0.5], [0.8, py - 0.3], [0.35, py - 0.1], [0, py]], 14);
            Bx(deck, a1 + 1.3, -W * 0.5 + 0.3, 0.7, 0.7, 0.7, 0.75);
            const bb = W * 0.5 + 0.4;
            Bx(wood, a1 + 0.3, bb, 0.09, 0.09, 0, 5.2);
            Two(t[1], [V(a1 + 0.3, bb, y0 + 5.0), V(a1 + 0.8, bb, y0 + 5.0), V(a1 + 0.8, bb, y0 + 3.0), V(a1 + 0.3, bb, y0 + 3.0)], [-uz, 0, ux]);
            hang(paint, a1 + 0.5, -0.8, y0 + 2.3, 1);
        }

        const parts : IForgePart[] = [
            { buf : wood, rgb : woodRgb, tex : CForgeTex.sWood }, { buf : deck, rgb : st == S.Norse ? [0.63, 0.36, 0.17] : T.mFenceWood, tex : CForgeTex.sPlank },
            { buf : plaster, rgb : plasterRgb, tex : CForgeTex.sPlaster }, { buf : stone, rgb : stoneRgb, tex : stoneTex }, { buf : brick, rgb : T.mBrick, tex : CForgeTex.sBrickWall },
            { buf : roof, rgb : roofRgb, tex : roofTex }, { buf : turf, rgb : T.mTurf[0], tex : CForgeTex.sTurf }, { buf : lat, rgb : [0.2, 0.15, 0.12], tex : CForgeTex.sWood },
            { buf : reed, rgb : reedRgb, tex : CForgeTex.sThatch }, { buf : glass, rgb : [0.5, 0.58, 0.72], tex : CForgeTex.sGlass, glow : true },
            { buf : iron, rgb : T.mIron }, { buf : gold, rgb : T.mGold }, { buf : dark, rgb : T.mDark }, { buf : paint, rgb : st == S.Front ? [0.12, 0.3, 0.32] : paintRgb },
            { buf : trim, rgb : st == S.Souk ? [0.62, 0.55, 0.42] : [0.92, 0.9, 0.85] }, { buf : sack, rgb : [0.72, 0.62, 0.45] }, { buf : pot, rgb : [0.62, 0.38, 0.26] },
            ...t.map((_b, _i) => ({ buf : _b, rgb : pal[_i] })),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }

    private static Shop(_r : IForgeMonumentR, T : CForgeTheme, _g : number) : IForgePart[]
    {
        const C = CForgeTheme.eCulture, S = CForgeStreetGen.eShop, F = CForgeStreetGen.ShopSpec(_r, T), { W, D, Hf, Hr } = F, [cx, cz] = _r.c, ang = _r.ang, ux = Math.cos(ang), uz = Math.sin(ang);
        if(F.st >= S.Timber) return CForgeStreetGen.Historic(_r, T, _g, F);
        if(F.st >= S.Ger) return CForgeStreetGen.Regional(_r, T, _g, F);
        const wood = new CForgeMeshBuf(), deck = new CForgeMeshBuf(), post = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), c0 = new CForgeMeshBuf(), c1 = new CForgeMeshBuf(), board = new CForgeMeshBuf();
        const iron = new CForgeMeshBuf(), mud = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), gold = new CForgeMeshBuf();
        const R = new CForgeRand(CForgeRand.Hash(_r.seed, 938)), c = T.mCulture, y0 = _g, modern = T.mEra == CForgeTheme.eEra.Modern;
        const P = (_a : number, _b : number) : ForgeV2 => [cx + ux * _a - uz * _b, cz + uz * _a + ux * _b];
        const V = (_a : number, _b : number, _y : number) => { const q = P(_a, _b); return [q[0], _y, q[1]]; };
        const Two = (_buf : CForgeMeshBuf, _q : number[][], _n : number[]) => { _buf.Quad(_q, null, _n); _buf.Quad(_q, null, _n.map(_v => -_v)); };
        const cream = [0.91, 0.88, 0.78];
        let cloth = T.mCloth[_r.seed % T.mCloth.length], cloth2 = F.bright ? cream : T.mCloth[(_r.seed + 1) % T.mCloth.length];
        if(c == C.Egypt) { cloth = [0.84, 0.74, 0.52]; cloth2 = cream; }
        else if(c == C.Africa) { cloth = [0.72, 0.4, 0.22]; cloth2 = [0.9, 0.8, 0.55]; }
        else if(c == C.Andes) { cloth = [0.78, 0.25, 0.2]; cloth2 = [0.92, 0.78, 0.3]; }
        else if(c == C.Mongol) { cloth = T.mFelt[0]; cloth2 = T.mCloth[0]; }
        let roofRgb = T.mRoof[_r.seed % T.mRoof.length], roofTex = CForgeTex.sTile, postRgb = T.mWood, postTex = CForgeTex.sWood;
        if(modern) { postRgb = T.mIron; postTex = undefined; }
        else if(c == C.China) postRgb = T.mPillar;

        CForgeShape.Box(deck, cx, cz, D + 0.2, W + 0.2, y0 - 0.3, y0 + 0.12, ang);
        const cq = P(D * 0.5 - 0.35, 0);
        CForgeShape.Box(wood, cq[0], cq[1], 0.6, W - 0.1, y0 + 0.12, y0 + 0.92, ang);
        CForgeShape.Box(deck, cq[0], cq[1], 0.74, W + 0.08, y0 + 0.92, y0 + 0.97, ang);
        for(const [a, b, h] of [[1, -1, Hf], [1, 1, Hf], [-1, -1, Hr], [-1, 1, Hr]])
        {
            const k = P(a * (D * 0.5 - 0.12), b * (W * 0.5 - 0.1));
            CForgeShape.Box(post, k[0], k[1], 0.12, 0.12, y0 + 0.1, y0 + h, ang);
        }

        if(F.st == S.Cloth)
        {
            const n = Math.max(4, Math.round(W / 0.32) & ~1), bw = W / n, af = D * 0.5 + 0.35, ar = -D * 0.5 - 0.05, yr = y0 + Hr, yf = y0 + Hf - 0.05;
            const len = Math.hypot(af - ar, yf - yr), nl = (yr - yf) / len, ny = (af - ar) / len, nn = [ux * nl, ny, uz * nl];
            for(let i = 0; i < n; i++)
            {
                const b0 = -W * 0.5 - 0.1 + (W + 0.2) / n * i, b1 = b0 + (W + 0.2) / n, buf = i % 2 == 0 ? c0 : c1;
                Two(buf, [V(ar, b0, yr), V(af, b0, yf), V(af, b1, yf), V(ar, b1, yr)], nn);
                const bm = (b0 + b1) * 0.5;
                const fl = i % 2 == 0 ? c1 : c0, tri = [V(af, b0, yf), V(af, b1, yf), V(af, bm, yf - 0.24)];
                fl.Poly(tri, [ux, 0, uz]);
                fl.Poly(tri, [-ux, 0, -uz]);
            }
            if(c == C.Europe && !modern)
            {
                CForgeShape.Box(deck, P(-D * 0.5 + 0.05, 0)[0], P(-D * 0.5 + 0.05, 0)[1], 0.06, W, y0 + 0.12, yr - 0.15, ang);
                CForgeShape.Box(wood, P(-D * 0.5 + 0.16, 0)[0], P(-D * 0.5 + 0.16, 0)[1], 0.26, W - 0.2, y0 + 1.3, y0 + 1.36, ang);
            }
            else
            {
                Two(c1, [V(-D * 0.5 + 0.02, -W * 0.5, yr - 0.05), V(-D * 0.5 + 0.02, W * 0.5, yr - 0.05), V(-D * 0.5 + 0.02, W * 0.5, y0 + 0.5), V(-D * 0.5 + 0.02, -W * 0.5, y0 + 0.5)], [-ux, 0, -uz]);
            }
        }

        const sq = P(D * 0.5 + 0.2, 0), sw = Math.min(0.9, W * 0.45), ys = y0 + Hf - (F.st == S.Cloth ? 0.5 : 0.35);
        for(const s of [-1, 1]) CForgeTowerGen.Strut(iron, V(D * 0.5 + 0.2, s * sw * 0.4, y0 + Hf - 0.03), V(D * 0.5 + 0.2, s * sw * 0.4, ys + 0.3), 0.02);
        CForgeShape.Box(board, sq[0], sq[1], 0.05, sw, ys, ys + 0.3, ang);

        const gs = Math.max(2, F.goods);
        for(let i = 0; i < gs; i++)
        {
            const b = -W * 0.5 + 0.3 + (W - 0.6) * (i + R.Range(0.1, 0.9)) / gs, q = P(D * 0.5 - 0.35 + R.Range(-0.1, 0.1), b), y = y0 + 0.97;
            const k = R.Int(0, 3);
            if(k == 0) CForgeShape.Box(wood, q[0], q[1], 0.32, 0.32, y, y + 0.28, R.Range(0, 1));
            else if(k == 1) CForgeShape.Frustum(c0, q[0], q[1], 0.34, 0.26, 0.16, 0.14, y, y + 0.32, R.Range(0, 1));
            else if(k == 2) CForgeTowerGen.Lathe(wood, q[0], q[1], [[0.12, y], [0.16, y + 0.12], [0.16, y + 0.24], [0.12, y + 0.34], [0.0, y + 0.34]], 10);
            else CForgeTowerGen.Lathe(mud, q[0], q[1], [[0.08, y], [0.15, y + 0.1], [0.14, y + 0.24], [0.08, y + 0.3], [0.1, y + 0.34], [0.0, y + 0.32]], 10);
        }

        const parts : IForgePart[] = [
            { buf : deck, rgb : T.mFenceWood, tex : CForgeTex.sPlank }, { buf : wood, rgb : T.mWood, tex : CForgeTex.sWood }, { buf : post, rgb : postRgb, tex : postTex },
            { buf : roof, rgb : roofRgb, tex : roofTex }, { buf : c0, rgb : cloth }, { buf : c1, rgb : cloth2 }, { buf : board, rgb : T.mBoard },
            { buf : iron, rgb : T.mIron }, { buf : mud, rgb : T.mMud[0] },
            { buf : dark, rgb : T.mDark }, { buf : gold, rgb : T.mGold },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
}
