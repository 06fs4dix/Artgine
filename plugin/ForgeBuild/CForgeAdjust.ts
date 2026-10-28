import { CForgeScene, ForgeV2, IForgeBridge, IForgeBuilding, IForgeInterior, IForgeChurch, IForgeDock, IForgeFence, IForgeMonument, IForgePath, IForgeStair, IForgeTower, IForgeWall } from "./CForgeScene.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeTempleGen } from "./CForgeTempleGen.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeCurve, CForgeSpline } from "./CForgeSpline.js";

export interface IForgeGate { s : number; w : number; }
export interface IForgeOptR { theme? : string; style? : number; wall? : number; roofKind? : number; over? : Record<string, any>; interior? : IForgeInterior; }
//curve : 생성기가 그대로 쓰는 샘플 곡선 [x, z, 높이]. out : 바깥쪽이 왼쪽 법선이면 1, 오른쪽이면 -1
//lands : 계단 층계참이 닿는 구간(벽 위 안쪽 턱을 비운다)
export interface IForgeWallR extends IForgeOptR { id : number; seed : number; pts : number[][]; closed : boolean; thick : number; style : number; endTower : number[]; curve : number[][]; gates : IForgeGate[]; out : number; lands : IForgeGate[]; }
//attach : 벽이 붙는 방향(라디안, 창을 피한다). door : 문 방향(없으면 null). flat : 평지붕+총안
export interface IForgeTowerR extends IForgeOptR { id : number; seed : number; c : ForgeV2; r : number; height : number; roof : number; roofH : number; shape : number; floors : number; flat : boolean; attach : number[]; door : number; }
//o·u : 건물 로컬 축(원점, 길이 방향). local : 로컬 좌표 외곽선. rects : 지붕용 사각형 [u0, v0, u1, v1](직교가 아니면 null).
//door : 문이 날 변과 변 위 위치(0~1). others : 맞닿은 건물 외곽선(그 안으로 들어간 벽엔 창을 내지 않는다)
export interface IForgeBuildingR extends IForgeOptR { id : number; seed : number; poly : ForgeV2[]; height : number; roof : number; roofH : number; floors : number; pitch : number;
    o : ForgeV2; u : ForgeV2; local : ForgeV2[]; rects : number[][]; door : { edge : number, t : number }; others : ForgeV2[][]; leanWall : boolean; }
export interface IForgeLineR extends IForgeOptR { id : number; seed : number; pts : ForgeV2[]; width : number; h? : number; }
//y : 아래 끝·위 끝 디딤 높이(m). 위 끝이 더 높게 정렬돼 있다
//land : 위 끝이 공중이면(성벽 위 등) 진행 방향으로 이어 붙이는 층계참 길이(m)
//o : 중심, u : 긴 축(교회 종탑 쪽 끝), L·W : 길이·폭(m), fs : 정문이 난 긴 면(1이면 u의 왼쪽 법선 v = [-u.z, u.x] 쪽)
export interface IForgeChurchR extends IForgeOptR { id : number; seed : number; o : ForgeV2; u : ForgeV2; L : number; W : number; fs : number; }
//pts : 물가 → 물 쪽 끝, deck : 갑판 높이(m)
export interface IForgeDockR extends IForgeOptR { id : number; seed : number; pts : ForgeV2[]; width : number; deck : number; }
//c : 실제 세울 자리(교회·사찰 부지 안이면 앞마당·마당 중심으로 옮긴 값), floors : 층수, ang : 정면 방향(라디안)
export interface IForgeMonumentR extends IForgeOptR { id : number; seed : number; c : ForgeV2; size : number; floors : number; ang : number; }
export interface IForgeStairR extends IForgeOptR { id : number; seed : number; pts : ForgeV2[]; width : number; y : number[]; land : number; }

//자동 조정: 거친 의도 데이터를 보기 좋은 형태로 다듬는다. 의도 데이터는 건드리지 않고 생성기가 쓸 결과만 만든다.
//이웃(벽-탑 등)을 참고하므로, 한쪽이 바뀌면 다른 쪽도 다시 조정해야 한다(CForgeBuild가 범위로 묶어서 처리)
export class CForgeAdjust
{
    static sWallH = [1.2, 12];
    static sBuildingH = [2.5, 14];
    static sTowerH = [3, 30];
    static sTowerR = [1.2, 5];
    static sSnap = 1.5;
    static sTowerOver = 2.5;

    static Run(_kind : string, _e : any, _scene : CForgeScene) : any
    {
        const K = CForgeScene.eKind;
        let r : any = null;
        if(_kind == K.Wall) r = CForgeAdjust.Wall(_e, _scene);
        else if(_kind == K.Tower) r = CForgeAdjust.Tower(_e, _scene);
        else if(_kind == K.Building) r = CForgeAdjust.Building(_e, _scene);
        else if(_kind == K.Path) r = CForgeAdjust.Line(_e, (_e as IForgePath).width);
        else if(_kind == K.Fence) r = { ...CForgeAdjust.Line(_e, 0.12), h : (_e as IForgeFence).height ?? 1.05 };
        else if(_kind == K.Bridge) r = CForgeAdjust.Line(_e, Math.min(6, Math.max(1.2, (_e as IForgeBridge).width)));
        else if(_kind == K.Stair) r = CForgeAdjust.Stair(_e);
        else if(_kind == K.Church) r = CForgeAdjust.Church(_e, _scene);
        else if(_kind == K.Dock) r = CForgeAdjust.Dock(_e);
        else if(_kind == K.Monument) r = CForgeAdjust.Monument(_e, _scene);
        if(r != null) { r.theme = _e.theme; r.over = _e.over ?? null; r.wall = _e.wall ?? -1; r.roofKind = _e.roofKind ?? -1; if(_kind != K.Wall) r.style = _e.style ?? 0; }
        return r;
    }

    static Dedupe<T extends number[]>(_p : T[], _min : number) : T[]
    {
        const out : T[] = [];
        for(const q of _p)
        {
            const l = out[out.length - 1];
            if(l == null || Math.hypot(q[0] - l[0], q[1] - l[1]) >= _min) out.push(q.slice() as T);
        }
        return out;
    }

    //벽 끝이 탑 근처면 탑 중심까지 끌어다 붙인다(탑 몸통이 이음매를 가린다)
    static SnapTower(_x : number, _z : number, _scene : CForgeScene) : IForgeTower | null
    {
        let best : IForgeTower = null, bd = Infinity;
        for(const t of _scene.List<IForgeTower>(CForgeScene.eKind.Tower))
        {
            const d = Math.hypot(t.c[0] - _x, t.c[1] - _z);
            if(d < t.r + CForgeAdjust.sSnap && d < bd) { bd = d; best = t; }
        }
        return best;
    }

    static Wall(_e : IForgeWall, _scene : CForgeScene) : IForgeWallR
    {
        const [h0, h1] = CForgeAdjust.sWallH;
        //네 번째 값(바닥 높이)이 있으면 그대로 실어 보낸다 — 샘플 곡선에서 함께 보간되어 생성기가 지면으로 쓴다
        let p = CForgeAdjust.Dedupe(_e.pts.map(_q => [_q[0], _q[1], Math.min(h1, Math.max(h0, _q[2])), ..._q.slice(3, 4)]), 0.4);
        let closed = CForgeSpline.IsClosed(_e.pts);
        if(!closed && p.length >= 3 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 2) closed = true;
        if(closed)
        {
            if(Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 2) p.pop();
            p.push(p[0].slice());
        }
        const endTower = [0, 0];
        if(!closed && p.length >= 2)
        {
            for(const k of [0, 1])
            {
                const q = p[k == 0 ? 0 : p.length - 1];
                const t = CForgeAdjust.SnapTower(q[0], q[1], _scene);
                if(t == null) continue;
                q[0] = t.c[0]; q[1] = t.c[1];
                endTower[k] = t.id;
            }
        }
        const curve = CForgeSpline.Sample(p, CForgeAdjust.sWallStep);
        const out = closed && CForgePoly.Area(curve.slice(0, -1).map(_q => [_q[0], _q[1]] as ForgeV2)) > 0 ? -1 : closed ? 1 : -1;
        //두께가 자동(0)이면 높이에 비례시킨다: 낮은 담은 얇게, 높은 성벽은 두껍게
        let maxH = 0;
        for(const q of p) maxH = Math.max(maxH, q[2]);
        const thick = _e.thick > 0 ? Math.min(2, Math.max(0.25, _e.thick)) : Math.min(1.6, Math.max(0.35, 0.3 + maxH * 0.14));
        return { id : _e.id, seed : _e.seed, pts : p, closed, thick, style : _e.style ?? 0, endTower, curve, gates : CForgeAdjust.Gates(curve, closed, _scene), out,
            lands : CForgeAdjust.Lands(curve, thick, _scene) };
    }

    //층계참(위 끝 ~ 층계참 끝)이 벽 옆에 붙어 있으면 그 두 점을 벽 곡선에 내린 구간
    static Lands(_curve : number[][], _thick : number, _scene : CForgeScene) : IForgeGate[]
    {
        const c = new CForgeCurve(_curve), out : IForgeGate[] = [];
        const Near = (_x : number, _z : number) =>
        {
            let d = Infinity, s = 0;
            for(let i = 0; i < _curve.length; i++) { const e = Math.hypot(_curve[i][0] - _x, _curve[i][1] - _z); if(e < d) { d = e; s = c.mCum[i]; } }
            return [d, s];
        };
        for(const st of _scene.List<IForgeStair>(CForgeScene.eKind.Stair))
        {
            const r = CForgeAdjust.Stair(st);
            if(r == null || r.land <= 0) continue;
            const a = r.pts[0], b = r.pts[1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / l, tz = (b[1] - a[1]) / l;
            const [d0, s0] = Near(b[0], b[1]), [d1, s1] = Near(b[0] + tx * r.land, b[1] + tz * r.land), reach = _thick * 0.5 + r.width + 0.6;
            if(d0 > reach || d1 > reach || Math.abs(s1 - s0) > c.mLen * 0.5) continue;
            out.push({ s : (s0 + s1) * 0.5, w : Math.abs(s1 - s0) + 0.3 });
        }
        return out;
    }

    static sWallStep = 0.35;
    static sGateW = [1.6, 4.5];

    //길이 벽을 지나는 자리마다 문을 낸다. 문 위치는 벽 곡선의 호 길이, 폭은 길 폭에 맞춘다. 겹치는 문은 하나로 합친다
    static Gates(_curve : number[][], _closed : boolean, _scene : CForgeScene) : IForgeGate[]
    {
        const c = new CForgeCurve(_curve), out : IForgeGate[] = [];
        for(const path of _scene.List<IForgePath>(CForgeScene.eKind.Path))
        {
            const ps = CForgeSpline.Sample(path.pts.map(_q => [_q[0], _q[1]]), 0.5);
            const w = Math.min(CForgeAdjust.sGateW[1], Math.max(CForgeAdjust.sGateW[0], path.width + 0.6));
            let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
            for(const q of ps) { x0 = Math.min(x0, q[0]); z0 = Math.min(z0, q[1]); x1 = Math.max(x1, q[0]); z1 = Math.max(z1, q[1]); }
            for(let i = 0; i + 1 < _curve.length; i++)
            {
                const a = _curve[i], b = _curve[i + 1];
                if(Math.max(a[0], b[0]) < x0 || Math.min(a[0], b[0]) > x1 || Math.max(a[1], b[1]) < z0 || Math.min(a[1], b[1]) > z1) continue;
                for(let j = 0; j + 1 < ps.length; j++)
                {
                    const r = CForgePoly.SegInter([a[0], a[1]], [b[0], b[1]], [ps[j][0], ps[j][1]], [ps[j + 1][0], ps[j + 1][1]]);
                    if(r == null || r.t < 0 || r.t > 1 || r.u < 0 || r.u > 1) continue;
                    const s = c.mCum[i] + (c.mCum[i + 1] - c.mCum[i]) * r.t;
                    if(!_closed && (s < w * 0.5 + 0.8 || s > c.mLen - w * 0.5 - 0.8)) continue;
                    out.push({ s, w });
                }
            }
        }
        out.sort((_a, _b) => _a.s - _b.s);
        const merged : IForgeGate[] = [];
        for(const g of out)
        {
            const l = merged[merged.length - 1];
            if(l != null && g.s - l.s < (g.w + l.w) * 0.5 + 1.2) { l.s = (l.s + g.s) * 0.5; l.w = Math.max(l.w, g.w); }
            else merged.push({ ...g });
        }
        return merged;
    }

    //탑은 붙은 벽보다 확실히 높아야 탑처럼 보인다. 지붕 높이는 반지름에 맞춘 비율로 묶는다
    //붙은 벽보다 높게, 벽 두께보다 굵게. 층 수는 높이로, 창은 벽이 붙는 방향을 피하고, 가까운 길 쪽으로 문을 낸다
    static Tower(_e : IForgeTower, _scene : CForgeScene) : IForgeTowerR
    {
        const cx = _e.c[0], cz = _e.c[1], reach = _e.r + CForgeAdjust.sSnap;
        let wallTop = 0, wallThick = 0;
        const attach : number[] = [];
        const AddAngle = (_x : number, _z : number) =>
        {
            if(Math.hypot(_x - cx, _z - cz) < 0.3) return;
            const a = Math.atan2(_z - cz, _x - cx);
            if(!attach.some(_b => Math.abs(Math.atan2(Math.sin(a - _b), Math.cos(a - _b))) < 0.2)) attach.push(a);
        };
        for(const w of _scene.List<IForgeWall>(CForgeScene.eKind.Wall))
        {
            for(let i = 0; i + 1 < w.pts.length; i++)
            {
                const a = w.pts[i], b = w.pts[i + 1];
                const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
                const t = l2 > 0 ? Math.min(1, Math.max(0, ((cx - a[0]) * dx + (cz - a[1]) * dz) / l2)) : 0;
                if(Math.hypot(cx - a[0] - dx * t, cz - a[1] - dz * t) > reach) continue;
                wallTop = Math.max(wallTop, Math.min(CForgeAdjust.sWallH[1], a[2] + (b[2] - a[2]) * t));
                wallThick = Math.max(wallThick, w.thick);
                AddAngle(a[0], a[1]);
                AddAngle(b[0], b[1]);
            }
        }
        const r = Math.min(CForgeAdjust.sTowerR[1], Math.max(CForgeAdjust.sTowerR[0], _e.r, wallThick * 1.4));
        const height = Math.min(CForgeAdjust.sTowerH[1], Math.max(_e.height, wallTop + CForgeAdjust.sTowerOver, r * 2.2));
        const roofH = Math.min(r * 2.6, Math.max(r * 1.3, _e.roofH > 0 ? _e.roofH : r * 1.9));
        const R = CForgeScene.eRoof;
        const flat = _e.roof == R.Flat || (_e.roof == R.Auto && r >= 3.4);

        let door : number = null, best = r + 4;
        for(const p of _scene.List<IForgePath>(CForgeScene.eKind.Path))
        {
            for(let i = 0; i + 1 < p.pts.length; i++)
            {
                const a = p.pts[i], b = p.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
                const t = l2 > 0 ? Math.min(1, Math.max(0, ((cx - a[0]) * dx + (cz - a[1]) * dz) / l2)) : 0;
                const px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(cx - px, cz - pz);
                if(d < best && d > r * 0.5) { best = d; door = Math.atan2(pz - cz, px - cx); }
            }
        }
        if(door != null && attach.some(_b => Math.abs(Math.atan2(Math.sin(door - _b), Math.cos(door - _b))) < 0.6)) door = null;
        return { id : _e.id, seed : _e.seed, c : [cx, cz], r, height, roof : _e.roof, roofH, shape : _e.shape ?? 0,
            floors : Math.max(1, Math.round(height / 3.2)), flat, attach, door };
    }

    static sOrthoTol = 12 * Math.PI / 180;
    static sAlignTol = 20 * Math.PI / 180;

    //건물 자동 조정:
    //1) 방향: 지나가는 성벽 → 맞닿은 건물 → 자기 최소 외접 사각형 순으로 축을 정한다
    //2) 그 축 기준으로 거의 직각인 변을 직각으로 맞춘다
    //3) 성벽과 겹치면 벽 선에서 잘라 벽에 기대 선 건물로 만든다
    //4) 직교 다각형이면 사각형으로 나눠 사각형마다 지붕을 올린다(같은 경사라 만나는 곳에 골이 생긴다)
    //5) 문은 가장 가까운 길 쪽 변에, 다른 건물 속으로 들어간 벽에는 창을 내지 않는다(others)
    static Building(_e : IForgeBuilding, _scene : CForgeScene) : IForgeBuildingR
    {
        let poly = CForgePoly.Clean(_e.poly, 0.3, 0.05);
        if(poly.length < 3) poly = CForgePoly.Orient(_e.poly);
        const own = CForgePoly.OBB(poly);
        let u : ForgeV2 = own.u;
        const c0 = CForgePoly.Centroid(poly);

        let wallLine : { p : ForgeV2, t : ForgeV2, half : number } = null;
        let bestWall = Infinity;
        for(const w of _scene.List<IForgeWall>(CForgeScene.eKind.Wall))
        {
            const s = CForgeSpline.Sample(w.pts, 1);
            for(let i = 0; i + 1 < s.length; i++)
            {
                const a : ForgeV2 = [s[i][0], s[i][1]], b : ForgeV2 = [s[i + 1][0], s[i + 1][1]];
                let hit = CForgePoly.InPoly(a[0], a[1], poly) || CForgePoly.InPoly(b[0], b[1], poly);
                for(let k = 0; k < poly.length && !hit; k++)
                {
                    const r = CForgePoly.SegInter(a, b, poly[k], poly[(k + 1) % poly.length]);
                    if(r != null && r.t >= 0 && r.t <= 1 && r.u >= 0 && r.u <= 1) hit = true;
                }
                if(!hit) continue;
                const d = Math.hypot((a[0] + b[0]) * 0.5 - c0[0], (a[1] + b[1]) * 0.5 - c0[1]);
                if(d >= bestWall) continue;
                const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
                bestWall = d;
                wallLine = { p : [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5], t : [(b[0] - a[0]) / l, (b[1] - a[1]) / l], half : w.thick * 0.5 };
            }
        }
        const others : ForgeV2[][] = [];
        const bb = CForgeScene.Bounds(CForgeScene.eKind.Building, _e);
        let alignTo : ForgeV2 = null;
        for(const o of _scene.List<IForgeBuilding>(CForgeScene.eKind.Building))
        {
            if(o.id == _e.id || !CForgeScene.Overlap(bb, CForgeScene.Bounds(CForgeScene.eKind.Building, o))) continue;
            const op = CForgePoly.Orient(o.poly);
            if(CForgePoly.Union(poly, CForgePoly.Offset(op, 0.8)) == null) continue;
            others.push(op);
            if(alignTo == null && o.id < _e.id) alignTo = CForgePoly.OBB(op).u;
        }
        const Ang = (_a : ForgeV2, _b : ForgeV2) => { const d = Math.abs(Math.atan2(_a[0] * _b[1] - _a[1] * _b[0], _a[0] * _b[0] + _a[1] * _b[1])) % (Math.PI / 2); return Math.min(d, Math.PI / 2 - d); };
        if(wallLine != null) u = wallLine.t;
        else if(alignTo != null && Ang(alignTo, own.u) < CForgeAdjust.sAlignTol) u = alignTo;

        //축을 벽·이웃에 맞출 때는 집을 그 방향으로 돌려 세운다(자기 축을 90° 단위로 돌려 가장 가까운 쪽을 고른다)
        let srcU : ForgeV2 = own.u, bestDot = -Infinity;
        for(let k = 0; k < 4; k++)
        {
            const a = Math.atan2(own.u[1], own.u[0]) + k * Math.PI / 2, cand : ForgeV2 = [Math.cos(a), Math.sin(a)];
            const d = cand[0] * u[0] + cand[1] * u[1];
            if(d > bestDot) { bestDot = d; srcU = cand; }
        }
        let local = CForgePoly.Clean(CForgePoly.Orthogonalize(CForgePoly.ToLocal(poly, c0, srcU), CForgeAdjust.sOrthoTol), 0.2, 0.02);
        if(wallLine != null)
        {
            const wl = CForgePoly.ToLocal([wallLine.p], c0, u)[0][1];
            const side = wl > 0 ? -1 : 1, edge = wl + side * (wallLine.half + 0.05);
            const cut = CForgePoly.Clean(CForgePoly.Clip(local, q => side * (q[1] - edge)), 0.2, 0.02);
            if(cut.length >= 3 && Math.abs(CForgePoly.Area(cut)) > 4) local = cut;
        }
        let rects = CForgePoly.IsRectilinear(local, 1e-4) ? CForgePoly.Rectangles(local) : null;
        if(rects != null && (rects.length == 0 || rects.length > 5)) rects = null;
        const world = CForgePoly.ToWorld(local, c0, u);

        const ow = CForgePoly.OBB(world), wid = Math.max(1, ow.vMax - ow.vMin);
        const pitch = Math.min(1.3, Math.max(0.6, _e.roofH > 0 ? _e.roofH / (wid * 0.5) : 0.9));
        const height = Math.min(CForgeAdjust.sBuildingH[1], Math.max(CForgeAdjust.sBuildingH[0], _e.height));

        let door : { edge : number, t : number } = null, best = 25;
        for(const p of _scene.List<IForgePath>(CForgeScene.eKind.Path))
        {
            const ps = CForgeSpline.Sample(p.pts.map(_q => [_q[0], _q[1]]), 1);
            for(let k = 0; k < world.length; k++)
            {
                const a = world[k], b = world[(k + 1) % world.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
                if(l < 1.8) continue;
                const nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l;
                for(const q of ps)
                {
                    const t = ((q[0] - a[0]) * (b[0] - a[0]) + (q[1] - a[1]) * (b[1] - a[1])) / (l * l);
                    const tt = Math.min(1 - 0.9 / l, Math.max(0.9 / l, t));
                    const px = a[0] + (b[0] - a[0]) * tt, pz = a[1] + (b[1] - a[1]) * tt;
                    if((q[0] - px) * nx + (q[1] - pz) * nz <= 0) continue;
                    const d = Math.hypot(q[0] - px, q[1] - pz);
                    if(d < best) { best = d; door = { edge : k, t : tt }; }
                }
            }
        }
        if(door == null)
        {
            let lmax = 0;
            world.forEach((_a, _k) => { const b = world[(_k + 1) % world.length], l = Math.hypot(b[0] - _a[0], b[1] - _a[1]); if(l > lmax) { lmax = l; door = { edge : _k, t : 0.5 }; } });
        }
        return { id : _e.id, seed : _e.seed, poly : world, height, roof : _e.roof, roofH : pitch * wid * 0.5,
            floors : Math.max(1, Math.round(height / 2.8)), pitch, o : c0, u, local, rects, door, others, leanWall : wallLine != null, interior : _e.interior };
    }

    static Line(_e : IForgePath | IForgeFence | IForgeBridge, _width : number) : IForgeLineR
    {
        return { id : _e.id, seed : _e.seed, pts : CForgeAdjust.Dedupe(_e.pts, 0.3), width : _width };
    }

    static sChurchL = [10, 26];
    static sChurchW = [6, 12];

    //정문은 긴 면 가운데(길에 더 가까운 쪽 긴 면). 긴 축 방향 u는 길에 더 가까운 끝 쪽(교회 종탑이 선다)
    static Church(_e : IForgeChurch, _scene : CForgeScene) : IForgeChurchR
    {
        if(_e.poly.length < 3) return null;
        const ob = CForgePoly.OBB(CForgePoly.Orient(_e.poly)), cu = (ob.uMin + ob.uMax) * 0.5, cv = (ob.vMin + ob.vMax) * 0.5;
        const o : ForgeV2 = [ob.u[0] * cu + ob.v[0] * cv, ob.u[1] * cu + ob.v[1] * cv];
        const L = Math.min(CForgeAdjust.sChurchL[1], Math.max(CForgeAdjust.sChurchL[0], ob.uMax - ob.uMin));
        const W = Math.min(CForgeAdjust.sChurchW[1], L * 0.6, Math.max(CForgeAdjust.sChurchW[0], ob.vMax - ob.vMin));
        let u : ForgeV2 = [ob.u[0], ob.u[1]];
        const At = (_a : number, _b : number) => [o[0] + u[0] * _a - u[1] * _b, o[1] + u[1] * _a + u[0] * _b];
        const ends = [At(L * 0.5, 0), At(-L * 0.5, 0)], sides = [At(0, W * 0.5), At(0, -W * 0.5)], de = [Infinity, Infinity], ds = [Infinity, Infinity];
        for(const p of _scene.List<IForgePath>(CForgeScene.eKind.Path))
            for(const q of CForgeSpline.Sample(p.pts.map(_q => [_q[0], _q[1]]), 1))
                for(let i = 0; i < 2; i++)
                {
                    de[i] = Math.min(de[i], Math.hypot(q[0] - ends[i][0], q[1] - ends[i][1]));
                    ds[i] = Math.min(ds[i], Math.hypot(q[0] - sides[i][0], q[1] - sides[i][1]));
                }
        let fs = ds[1] < ds[0] ? -1 : 1;
        if(de[1] < de[0]) { u = [-u[0], -u[1]]; fs = -fs; }
        return { id : _e.id, seed : _e.seed, o, u, L, W, fs };
    }

    //교회·사찰 부지(조정된 L×W 사각형) 안에 두면 붙인다: 사찰은 마당 중심(마당 크기에 맞춰 줄인다), 교회는 정문 앞마당 옆
    static Monument(_e : IForgeMonument, _scene : CForgeScene) : IForgeMonumentR
    {
        let c : ForgeV2 = [_e.c[0], _e.c[1]], size = Math.min(4, Math.max(0.8, _e.size)), ang = 0, best = Infinity, face = ang;
        const M = CForgeTheme.eMonument, mk = (_e as any).over?.mMonument, street = mk == M.Lamp || mk == M.Shop;
        //부지 밖이면 가장 가까운 길과 나란히 돌려 세운다. 가로등·상점은 정면(+u)이 그 길을 향하게 하고 교회 부지로 끌려가지 않는다
        for(const p of _scene.List<IForgePath>(CForgeScene.eKind.Path))
        {
            const s = CForgeSpline.Sample(p.pts.map(_q => [_q[0], _q[1]]), 1);
            for(let i = 1; i < s.length; i++)
            {
                const mx = (s[i][0] + s[i - 1][0]) * 0.5, mz = (s[i][1] + s[i - 1][1]) * 0.5, d = Math.hypot(mx - c[0], mz - c[1]);
                if(d < best) { best = d; ang = Math.atan2(s[i][1] - s[i - 1][1], s[i][0] - s[i - 1][0]); face = d > 0.05 ? Math.atan2(mz - c[1], mx - c[0]) : ang + Math.PI * 0.5; }
            }
        }
        if(street) return { id : _e.id, seed : _e.seed, c, size, floors : 3, ang : _e.ang ?? face };
        for(const ch of _scene.List<IForgeChurch>(CForgeScene.eKind.Church))
        {
            const r = CForgeAdjust.Church(ch, _scene);
            if(r == null) continue;
            const dx = c[0] - r.o[0], dz = c[1] - r.o[1], a = dx * r.u[0] + dz * r.u[1], b = -dx * r.u[1] + dz * r.u[0];
            if(Math.abs(a) > r.L * 0.5 || Math.abs(b) > r.W * 0.5) continue;
            ang = Math.atan2(r.u[1], r.u[0]);
            if(CForgeTheme.Of(ch).Temple())
            {
                const Y = CForgeTempleGen.Layout(r);
                c = Y.P(Y.court[0], 0);
                size = Math.min(size, Y.courtL * 0.4, Y.courtW * 0.3);
            }
            else
            {
                const q = r.L * 0.5 + 2.6, s = -r.W * 0.35;
                c = [r.o[0] + r.u[0] * q - r.u[1] * s, r.o[1] + r.u[1] * q + r.u[0] * s];
                size = Math.min(size, 2.2);
            }
            break;
        }
        return { id : _e.id, seed : _e.seed, c, size, floors : _e.style == 2 ? 5 : 3, ang : _e.ang ?? ang };
    }

    static Dock(_e : IForgeDock) : IForgeDockR
    {
        if(_e.pts.length < 2) return null;
        const n = _e.pts.length - 1, a = _e.pts[0], b = _e.pts[n];
        if(Math.hypot(b[0] - a[0], b[1] - a[1]) < 1) return null;
        const deck = _e.hy?.[0] ?? _e.deck ?? (_e.gy?.[0] ?? 0) + 0.15;
        return { id : _e.id, seed : _e.seed, pts : [[a[0], a[1]], [b[0], b[1]]], width : Math.min(5, Math.max(1.2, _e.width)), deck };
    }

    //두 점만 쓴다(중간 점은 무시). 낮은 쪽을 아래 끝으로 돌리고, 너무 짧으면 null
    static Stair(_e : IForgeStair) : IForgeStairR
    {
        if(_e.pts.length < 2) return null;
        const n = _e.pts.length - 1, a = _e.pts[0], b = _e.pts[n];
        if(Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.4) return null;
        let y0 = _e.hy?.[0] ?? _e.gy?.[0] ?? 0, y1 = _e.hy?.[n] ?? (_e.gy?.[n] ?? 0) + (_e.top ?? 0);
        let pts : ForgeV2[] = [[a[0], a[1]], [b[0], b[1]]], g1 = _e.gy?.[n] ?? y1;
        if(y1 < y0) { pts = [pts[1], pts[0]]; [y0, y1] = [y1, y0]; g1 = _e.gy?.[0] ?? y1; }
        const width = Math.min(4, Math.max(0.8, _e.width));
        return { id : _e.id, seed : _e.seed, pts, width, y : [y0, y1], land : y1 - g1 > 1.2 ? width : 0 };
    }
}
