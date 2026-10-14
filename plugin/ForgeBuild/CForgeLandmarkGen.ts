import { ForgeV2 } from "./CForgeScene.js";
import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { IForgeMonumentR } from "./CForgeAdjust.js";
import { CForgeArabGen } from "./CForgeArabGen.js";
import { CForgeMongolGen } from "./CForgeMongolGen.js";
import { CForgeAdobeGen } from "./CForgeAdobeGen.js";
import { CForgeAfricaGen } from "./CForgeAfricaGen.js";
import { CForgeStreetGen } from "./CForgeStreetGen.js";

//아랍·이집트·남미·아프리카·몽골 조형물(CForgeTheme.eMonument 11~). 바닥 폭 _r.size(s), 정면 방향 _r.ang
//피라미드 · 스핑크스 · 분수정(맘루크·마그레브 열린 수반, 오스만 지붕 덮인 분수정) · 인티와타나 · 오보 · 흰 스투파 · 새 조각 돌기둥 · 아스키아 묘(흙 계단 피라미드) · 돌무더기
export class CForgeLandmarkGen
{
    static Height(_r : IForgeMonumentR, T : CForgeTheme) : number
    {
        const s = _r.size, M = CForgeTheme.eMonument, k = T.mMonument;
        if(k == M.Lamp || k == M.Shop) return CForgeStreetGen.Height(_r, T);
        if(k == M.Pyramid) return s * 1.45;
        if(k == M.Sphinx) return s * 0.82;
        if(k == M.Fountain) return CForgeLandmarkGen.Canopy(_r, T) ? 1.0 + s * 1.9 : 1.3 + s * 0.5;
        if(k == M.PlazaFountain) return CForgeLandmarkGen.FountainSpec(_r).h;
        if(k == M.Intihuatana) return s * 1.25;
        if(k == M.Ovoo) return s * 1.6;
        if(k == M.Stupa) return s * 1.1 * CForgeMongolGen.sStupaH;
        if(k == M.BirdPillar) return s * 1.7;
        if(k == M.MudTomb) return s * 1.9;
        return s * 0.6;
    }
    static Half(_r : IForgeMonumentR, T : CForgeTheme) : number[]
    {
        const s = _r.size, M = CForgeTheme.eMonument, k = T.mMonument;
        if(k == M.Lamp || k == M.Shop) return CForgeStreetGen.Half(_r, T);
        if(k == M.Pyramid) return [s * 1.1, s * 1.1];
        if(k == M.Sphinx) return [s * 1.0, s * 0.32];
        if(k == M.BirdPillar) return [s * 0.3, s * 0.3];
        if(k == M.MudTomb) return [s * 0.75, s * 0.75];
        if(k == M.PlazaFountain) return [s + 0.3, s + 0.3];
        return [s * 0.6, s * 0.6];
    }
    //광장 분수 치수. 시드로 수반 모양(원·8각·12각)·접시 단 수(2~3)·꼭대기(공·뾰족 장식·물줄기)·기둥 모양이 정해진다. 높이·충돌체·생성기가 같이 쓴다
    static FountainSpec(_r : IForgeMonumentR)
    {
        const R = new CForgeRand(CForgeRand.Hash(_r.seed, 913)), s = _r.size;
        const sides = R.Pick([0, 8, 12]), tiers = s >= 2.4 && R.Chance(0.6) ? 3 : 2, top = R.Int(0, 2), baluster = R.Chance(0.5);
        const rim = 0.8, pillar = 0.7 + s * 0.28, bowl = 0.55;
        const h = rim + tiers * (pillar + bowl) + (top == 2 ? 1.0 + s * 0.15 : top == 1 ? 0.9 : 0.5);
        return { sides, tiers, top, baluster, rim, pillar, bowl, h };
    }
    //지붕 덮인 분수정은 오스만 타입만(맘루크·마그레브는 열린 수반)
    static Canopy(_r : IForgeMonumentR, T : CForgeTheme) : boolean { return T.mMosque == 1; }

    static Build(_r : IForgeMonumentR, T : CForgeTheme, _g : number) : IForgePart[]
    {
        const M = CForgeTheme.eMonument, k = T.mMonument, [cx, cz] = _r.c, s = _r.size, a = _r.ang, ux = Math.cos(a), uz = Math.sin(a);
        if(k == M.Lamp || k == M.Shop) return CForgeStreetGen.Build(_r, T, _g);
        const stone = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), gold = new CForgeMeshBuf(), water = new CForgeMeshBuf(), wood = new CForgeMeshBuf(), mud = new CForgeMeshBuf(), glaze = new CForgeMeshBuf();
        const cloth = T.mCloth.map(() => new CForgeMeshBuf());
        const P = (_a : number, _b : number) : ForgeV2 => [cx + ux * _a - uz * _b, cz + uz * _a + ux * _b];
        let tex = CForgeTex.sAshlar;
        if(k == M.Pyramid)
        {
            CForgeShape.Box(trim, cx, cz, s * 2.3, s * 2.3, _g - 0.5, _g + 0.1, a);
            CForgeShape.Frustum(stone, cx, cz, s * 2.2, s * 2.2, s * 0.14, s * 0.14, _g + 0.1, _g + s * 1.33, a);
            CForgeShape.Frustum(gold, cx, cz, s * 0.14 + 0.01, s * 0.14 + 0.01, 0, 0, _g + s * 1.33 - 0.01, _g + s * 1.45, a);
        }
        else if(k == M.Sphinx)
        {
            //누운 사자 몸(머리 쪽이 ang 방향), 앞으로 뻗은 두 앞발, 뒤 엉덩이 둥근 덩이, 네메스 두건을 쓴 사람 머리(양옆 늘어진 자락)
            const y = _g + s * 0.12;
            CForgeShape.Box(trim, cx, cz, s * 2.2, s * 0.85, _g - 0.5, y, a);
            const bc = P(-s * 0.2, 0);
            CForgeShape.Frustum(stone, bc[0], bc[1], s * 1.3, s * 0.52, s * 1.2, s * 0.4, y, y + s * 0.34, a);
            const hc = P(-s * 0.75, 0);
            CForgeTowerGen.Lathe(stone, hc[0], hc[1], [[s * 0.28, y], [s * 0.29, y + s * 0.15], [s * 0.22, y + s * 0.3], [s * 0.05, y + s * 0.36]], 12);
            for(const sd of [-1, 1])
            {
                const pc = P(s * 0.55, sd * s * 0.14);
                CForgeShape.Box(stone, pc[0], pc[1], s * 0.75, s * 0.13, y, y + s * 0.12, a);
                const tc = P(-s * 0.65, sd * s * 0.27);
                CForgeShape.Box(stone, tc[0], tc[1], s * 0.5, s * 0.06, y, y + s * 0.06, a);
            }
            const ch = P(s * 0.32, 0);
            CForgeShape.Frustum(stone, ch[0], ch[1], s * 0.42, s * 0.46, s * 0.3, s * 0.36, y, y + s * 0.45, a);
            const hd = P(s * 0.36, 0), hy = y + s * 0.42;
            CForgeShape.Box(stone, hd[0], hd[1], s * 0.24, s * 0.2, hy, hy + s * 0.25, a);
            CForgeShape.Frustum(trim, hd[0] - ux * s * 0.04, hd[1] - uz * s * 0.04, s * 0.26, s * 0.36, s * 0.2, s * 0.18, hy + s * 0.12, hy + s * 0.31, a);
            for(const sd of [-1, 1]) { const lp = P(s * 0.38, sd * s * 0.15); CForgeShape.Box(trim, lp[0], lp[1], s * 0.08, s * 0.07, hy - s * 0.1, hy + s * 0.18, a); }
            const fc = P(s * 0.485, 0);
            CForgeShape.Decal(dark, fc[0], hy + s * 0.16, fc[1], -uz, ux, ux, uz, s * 0.1, s * 0.025);
            CForgeShape.Decal(dark, fc[0], hy + s * 0.05, fc[1], -uz, ux, ux, uz, s * 0.07, s * 0.015);
        }
        else if(k == M.Fountain)
        {
            //팔각 수반(가장자리에 유약 타일 띠) 안 물, 가운데 기둥 위 두 단 접시와 물줄기 끝. 오스만은 여덟 기둥 위 넓은 처마 팔각 지붕(납)과 작은 돔
            tex = CForgeTex.sAshlar;
            const R = s * 0.9, oct = (_r2 : number) => Array.from({ length : 8 }, (_v, _k) => [cx + Math.cos(a + (_k + 0.5) * Math.PI / 4) * _r2, cz + Math.sin(a + (_k + 0.5) * Math.PI / 4) * _r2] as ForgeV2);
            CForgeShape.Extrude(trim, oct(R + 0.25), _g - 0.4, _g + 0.15);
            CForgeShape.Cap(trim, oct(R + 0.25), _g + 0.15);
            CForgeShape.Parapet(stone, oct(R), 0.2, _g + 0.15, _g + 0.75);
            CForgeShape.Extrude(glaze, oct(R + 0.01), _g + 0.45, _g + 0.65);
            CForgeShape.Cap(water, oct(R - 0.2), _g + 0.6);
            CForgeTowerGen.Lathe(stone, cx, cz, [[0.16, _g + 0.5], [0.12, _g + 1.0], [s * 0.35, _g + 1.05], [s * 0.36, _g + 1.12], [0.1, _g + 1.12], [0.08, _g + 1.35], [s * 0.18, _g + 1.38], [s * 0.18, _g + 1.42], [0.05, _g + 1.42], [0, _g + 1.6]], 16);
            CForgeShape.Cap(water, Array.from({ length : 12 }, (_v, _k) => [cx + Math.cos(_k / 12 * Math.PI * 2) * s * 0.33, cz + Math.sin(_k / 12 * Math.PI * 2) * s * 0.33] as ForgeV2), _g + 1.1);
            if(CForgeLandmarkGen.Canopy(_r, T))
            {
                const ch = 1.0 + s * 1.0, re = R + 0.9;
                for(let i = 0; i < 8; i++) { const ang = a + (i + 0.5) * Math.PI / 4; CForgeTowerGen.Lathe(stone, cx + Math.cos(ang) * (R + 0.1), cz + Math.sin(ang) * (R + 0.1), [[0.12, _g + 0.75], [0.09, _g + ch - 0.2], [0.16, _g + ch]], 8); }
                CForgeShape.Extrude(trim, oct(R + 0.25), _g + ch, _g + ch + 0.3);
                CForgeShape.Cap(wood, oct(re), _g + ch + 0.05, false);
                CForgeShape.Pyramid(glaze, oct(re), _g + ch + 0.05, s * 0.45, 0);
                CForgeArabGen.Dome(glaze, cx, cz, s * 0.32, _g + ch + s * 0.4, s * 0.3, 0, Math.PI * 2, 12);
                CForgeArabGen.Finial(gold, cx, cz, _g + ch + s * 0.7, 0.8, 1);
            }
        }
        else if(k == M.PlazaFountain)
        {
            //바닥 수반(테두리 띠·난간벽·수면) 가운데 기둥 위로 접시를 2~3단 쌓고 꼭대기에 공·장식·물줄기. 접시는 위로 갈수록 작고 물이 가득 찬다
            tex = CForgeTex.sAshlar;
            const F = CForgeLandmarkGen.FountainSpec(_r), seg = F.sides == 0 ? 24 : F.sides, rot = F.sides == 0 ? 0 : Math.PI / F.sides;
            const ring = (_r2 : number) : ForgeV2[] => Array.from({ length : seg }, (_v, _k) => [cx + Math.cos(a + rot + _k / seg * Math.PI * 2) * _r2, cz + Math.sin(a + rot + _k / seg * Math.PI * 2) * _r2] as ForgeV2);
            const Y0 = _g + F.rim;
            CForgeShape.Extrude(trim, ring(s + 0.25), _g - 0.4, _g + 0.2);
            CForgeShape.Cap(trim, ring(s + 0.25), _g + 0.2);
            CForgeShape.Parapet(stone, ring(s), 0.3, _g + 0.2, Y0);
            CForgeShape.Cap(water, ring(s - 0.3), _g + 0.62);
            let y = _g + 0.5;
            for(let t = 0; t < F.tiers; t++)
            {
                const br = s * (0.62 - t * 0.17), y1 = y + F.pillar * (1 - t * 0.12), pr = Math.max(0.12, s * 0.07);
                if(F.baluster) CForgeTowerGen.Lathe(stone, cx, cz, [[pr * 1.5, y], [pr * 0.8, y + (y1 - y) * 0.25], [pr * 1.3, y + (y1 - y) * 0.5], [pr * 0.8, y + (y1 - y) * 0.75], [pr * 1.4, y1]], 12);
                else CForgeTowerGen.Lathe(stone, cx, cz, [[pr * 1.4, y], [pr, y + (y1 - y) * 0.3], [pr, y + (y1 - y) * 0.8], [pr * 1.5, y1]], 12);
                const b = F.bowl;
                CForgeTowerGen.Lathe(stone, cx, cz, [[pr * 1.5, y1], [br * 0.4, y1 + b * 0.2], [br * 0.85, y1 + b * 0.55], [br, y1 + b], [br * 0.93, y1 + b], [br * 0.8, y1 + b * 0.75], [0, y1 + b * 0.6]], 20);
                CForgeShape.Cap(water, Array.from({ length : 16 }, (_v, _k) => [cx + Math.cos(_k / 16 * Math.PI * 2) * br * 0.88, cz + Math.sin(_k / 16 * Math.PI * 2) * br * 0.88] as ForgeV2), y1 + b * 0.88);
                y = y1 + b * 0.6;
            }
            if(F.top == 0) CForgeTowerGen.Lathe(trim, cx, cz, [[0.1, y], [0.16, y + 0.12], [0.22, y + 0.3], [0.16, y + 0.46], [0.06, y + 0.52], [0, y + 0.54]], 12);
            else if(F.top == 1) CForgeTowerGen.Lathe(gold, cx, cz, [[0.14, y], [0.1, y + 0.2], [0.18, y + 0.35], [0.08, y + 0.55], [0.03, y + 0.75], [0, y + 0.9]], 10);
            else CForgeTowerGen.Lathe(water, cx, cz, [[0.07, y], [0.05, y + 0.5], [0.03, y + 0.9], [0.01, y + 1.0 + s * 0.15], [0, y + 1.05 + s * 0.15]], 8);
        }
        else if(k == M.Intihuatana)
        {
            //세 단 돌 기단 위에 깎아 다듬은 바위(비스듬한 덩이)와 해를 묶는 네모 돌기둥
            tex = CForgeTex.sInca;
            let y = _g;
            for(const w of [1.5, 1.15, 0.8]) { CForgeShape.Box(stone, cx, cz, s * w, s * w, y == _g ? _g - 0.5 : y, y + s * 0.2, a); y += s * 0.2; }
            CForgeShape.Frustum(trim, cx, cz, s * 0.7, s * 0.45, s * 0.6, s * 0.36, y, y + s * 0.3, a + 0.25, s * 0.03);
            const pc = P(s * 0.08, -s * 0.04);
            CForgeShape.Frustum(trim, pc[0], pc[1], s * 0.17, s * 0.12, s * 0.13, s * 0.1, y + s * 0.29, y + s * 0.65, a + 0.4);
        }
        else if(k == M.Ovoo)
        {
            //돌을 원뿔로 쌓아 올린 무더기 가운데 긴 장대, 둘레에 비스듬히 꽂은 가지와 묶은 파랑·흰·노랑 천(하닥)
            tex = CForgeTex.sDoldam;
            CForgeTowerGen.Lathe(stone, cx, cz, [[s * 0.8, _g - 0.3], [s * 0.72, _g + s * 0.15], [s * 0.45, _g + s * 0.45], [s * 0.18, _g + s * 0.7], [0, _g + s * 0.78]], 12);
            CForgeTowerGen.Lathe(wood, cx, cz, [[0.07, _g], [0.05, _g + s * 1.6]], 6);
            const R = new CForgeRand(_r.seed);
            for(let i = 0; i < 7; i++)
            {
                const ang = a + i / 7 * Math.PI * 2 + R.Range(-0.2, 0.2), lean = R.Range(0.25, 0.45), len = s * R.Range(0.8, 1.15), bx = cx + Math.cos(ang) * s * 0.25, bz = cz + Math.sin(ang) * s * 0.25, y0 = _g + s * 0.55;
                const tip = [bx + Math.cos(ang) * len * lean, y0 + len, bz + Math.sin(ang) * len * lean];
                CForgeTowerGen.Strut(wood, [bx, y0 - 0.2, bz], tip, 0.05);
                for(let j = 0; j < 3; j++)
                {
                    const t = 0.55 + j * 0.15, x = bx + (tip[0] - bx) * t, yy = y0 + (tip[1] - y0) * t, z = bz + (tip[2] - bz) * t;
                    CForgeShape.Box(cloth[(i + j) % cloth.length], x + Math.cos(ang + 1.3) * 0.12, z + Math.sin(ang + 1.3) * 0.12, 0.26, 0.02, yy - 0.45, yy, ang + 1.3);
                }
            }
            for(let j = 0; j < 5; j++) { const yy = _g + s * (1.0 + j * 0.1); CForgeShape.Box(cloth[j % cloth.length], cx + Math.cos(a + j) * 0.15, cz + Math.sin(a + j) * 0.15, 0.3, 0.02, yy - 0.5, yy, a + j); }
        }
        else if(k == M.Stupa)
        {
            const S = { white : stone, gold, dark };
            CForgeMongolGen.Stupa(S, cx, cz, s * 1.1, _g, a);
            tex = CForgeTex.sPlaster;
        }
        else if(k == M.BirdPillar)
        {
            //건식 돌 받침 위 활석 돌기둥, 꼭대기에 부리가 짧고 날개를 접은 새(다리가 받침에 붙는다)
            tex = CForgeTex.sDryCourse;
            CForgeShape.Frustum(stone, cx, cz, s * 0.8, s * 0.8, s * 0.65, s * 0.65, _g - 0.4, _g + s * 0.3, a);
            CForgeShape.Box(trim, cx, cz, s * 0.2, s * 0.16, _g + s * 0.3, _g + s * 1.2, a);
            const by = _g + s * 1.2;
            CForgeShape.Box(trim, cx, cz, s * 0.24, s * 0.2, by, by + s * 0.05, a);
            CForgeShape.Box(trim, cx - ux * s * 0.03, cz - uz * s * 0.03, s * 0.05, s * 0.05, by + s * 0.05, by + s * 0.16, a);
            const bc = P(-s * 0.02, 0);
            CForgeShape.Frustum(trim, bc[0], bc[1], s * 0.3, s * 0.13, s * 0.18, s * 0.1, by + s * 0.15, by + s * 0.38, a + 0.25);
            const hc = P(s * 0.1, 0);
            CForgeShape.Box(trim, hc[0], hc[1], s * 0.1, s * 0.08, by + s * 0.36, by + s * 0.47, a);
            const bk = P(s * 0.17, 0);
            CForgeShape.Frustum(trim, bk[0], bk[1], s * 0.06, s * 0.04, 0.01, 0.01, by + s * 0.4, by + s * 0.44, a);
        }
        else if(k == M.MudTomb)
        {
            //흙 계단 피라미드(가오 아스키아 묘): 네 단이 위로 좁아지고 단마다 토론 막대가 사방으로 박힌다. 꼭대기 첨두
            tex = CForgeTex.sAdobe;
            let y = _g - 0.5, w = s * 1.5;
            for(let i = 0; i < 4; i++)
            {
                const h = s * (i == 0 ? 0.6 : 0.42), w1 = w - h * 0.25;
                CForgeShape.Frustum(mud, cx, cz, w, w, w1, w1, y, y + h, a);
                for(const [fu, fv] of [[1, 0], [0, 1], [-1, 0], [0, -1]])
                {
                    const nx = ux * fu - uz * fv, nz = uz * fu + ux * fv, d = (w + w1) * 0.25, ys = [y + h * 0.5];
                    CForgeAfricaGen.Toron(wood, cx + nx * d + nz * w * 0.4, cz + nz * d - nx * w * 0.4, -nz, nx, nx, nz, 0, w * 0.8, ys, 0.6);
                }
                y += h; w = w1 * 0.8;
            }
            CForgeAdobeGen.Pinnacle(mud, cx, cz, y, w * 0.4, s * 0.3);
        }
        else
        {
            tex = CForgeTex.sDoldam;
            CForgeTowerGen.Lathe(stone, cx, cz, [[s * 0.65, _g - 0.3], [s * 0.6, _g + s * 0.15], [s * 0.38, _g + s * 0.42], [s * 0.12, _g + s * 0.58], [0, _g + s * 0.6]], 10);
            const R = new CForgeRand(_r.seed);
            for(let i = 0; i < 6; i++) { const ang = R.Range(0, Math.PI * 2), d = s * R.Range(0.7, 0.95), r = s * R.Range(0.08, 0.16); CForgeShape.Box(stone, cx + Math.cos(ang) * d, cz + Math.sin(ang) * d, r * 1.4, r, _g - 0.2, _g + r * 0.8, ang); }
        }
        const parts : IForgePart[] = [
            { buf : stone, rgb : k == M.Stupa ? T.mTowerBody : T.mStone, tex }, { buf : trim, rgb : k == M.BirdPillar ? [0.6, 0.62, 0.56] : T.mStone.map(_v => Math.min(1, _v * 1.05)), tex : k == M.BirdPillar || k == M.Intihuatana ? CForgeTex.sPlaster : tex },
            { buf : dark, rgb : T.mDark }, { buf : gold, rgb : T.mGold }, { buf : water, rgb : [0.22, 0.38, 0.44] }, { buf : wood, rgb : T.mWood, tex : CForgeTex.sWood },
            { buf : mud, rgb : T.mWallBody, tex : CForgeTex.sAdobe }, { buf : glaze, rgb : T.mMosque == 1 ? T.mMetal : T.mGlaze, tex : T.mMosque == 1 ? CForgeTex.sPlaster : CForgeTex.sTile },
            ...cloth.map((_b, _i) => ({ buf : _b, rgb : T.mCloth[_i] })),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
}
