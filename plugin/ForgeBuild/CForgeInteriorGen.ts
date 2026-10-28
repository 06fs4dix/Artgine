import { ForgeV2 } from "./CForgeScene.js";
import { CForgeMeshBuf, IForgePart, IForgeAnim } from "./CForgeMeshBuf.js";
import { CForgeShape, ForgeGround } from "./CForgeShape.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { IForgeBuildingR } from "./CForgeAdjust.js";
import { CForgeHouseGen } from "./CForgeHouseGen.js";

export interface IForgeHole { s0 : number; s1 : number; y0 : number; y1 : number; }
export interface IForgeWin { edge : number; s : number; w : number; y0 : number; y1 : number; }
interface IConcept { floor : number[]; tex : string; wall : number[]; wood : number[]; cloth : number[]; low : boolean; }
interface IRoom { r : number[]; kind : string; walled : boolean; keep? : boolean; }
interface IPart { axis : number; pos : number; a0 : number; a1 : number; door : number; }
interface IFurn { kind : string; c : ForgeV2; phi : number; w : number; d : number; level : number; h : number; }
export interface IForgeBox { c : ForgeV2; t : ForgeV2; hl : number; hw : number; y0 : number; y1 : number; }
interface IStair { axis : number; dir : number; xs : number; b0 : number; sw : number; n : number; run : number; }
export interface IForgePlan
{
    floor : number; top : number; levels : number; y : number[]; slab : number[]; ceil : number[]; ds : number; ang : number;
    rooms : IRoom[]; parts : IPart[]; stairs : IStair[]; holes : number[][]; host : number;
    furn : IFurn[]; steps : { c : ForgeV2; top : number }[]; boxes : IForgeBox[]; wedges : number[][][]; concept : IConcept; entry : ForgeV2;
}

//실내 생성기. 로컬(u, v) 좌표의 사각형(IForgeBuildingR.rects)을 방으로 쪼개고 가구를 놓는다.
//바깥 벽은 한 면짜리라 안에서는 보이지 않으므로 안쪽 벽을 따로 세우고, 문·창 자리는 구멍을 뚫는다
export class CForgeInteriorGen
{
    static sDoorW = 1.05;
    static sDoorH = 2.0;
    static sSill = 0.3;
    static sThick = 0.1;
    static sMin = 2.0;
    static sConcept : Record<string, IConcept> = {
        modern : { floor : [0.66, 0.5, 0.34], tex : CForgeTex.sPlank, wall : [0.94, 0.93, 0.9], wood : [0.5, 0.36, 0.24], cloth : [0.34, 0.44, 0.58], low : false },
        hanok : { floor : [0.82, 0.66, 0.38], tex : CForgeTex.sPlank, wall : [0.96, 0.94, 0.88], wood : [0.42, 0.28, 0.17], cloth : [0.72, 0.28, 0.26], low : true },
        machiya : { floor : [0.8, 0.76, 0.5], tex : null, wall : [0.9, 0.86, 0.76], wood : [0.45, 0.33, 0.2], cloth : [0.3, 0.4, 0.35], low : true },
        medieval : { floor : [0.5, 0.43, 0.35], tex : CForgeTex.sStone, wall : [0.86, 0.82, 0.72], wood : [0.32, 0.21, 0.13], cloth : [0.58, 0.22, 0.2], low : false },
    };
    private static sCache = new WeakMap<IForgeBuildingR, IForgePlan>();

    static On(_b : IForgeBuildingR, _wall : number) : boolean
    {
        const I = _b.interior;
        return I != null && I.enable && _b.rects != null && _b.rects.length > 0 && _b.door != null && (_wall <= 3 || _wall == 10 || _wall == 11);
    }

    static Plan(_b : IForgeBuildingR, _g : ForgeGround) : IForgePlan
    {
        let p = CForgeInteriorGen.sCache.get(_b);
        if(p == null) { p = CForgeInteriorGen.Make(_b, _g); CForgeInteriorGen.sCache.set(_b, p); }
        return p;
    }

    static DoorCut(_b : IForgeBuildingR, _floor : number) : { edge : number, holes : IForgeHole[] }
    {
        const ds = CForgeHouseGen.DoorPos(_b), y = _floor + CForgeInteriorGen.sSill, hw = CForgeInteriorGen.sDoorW * 0.5;
        return { edge : _b.door.edge, holes : [{ s0 : ds - hw, s1 : ds + hw, y0 : y, y1 : y + CForgeInteriorGen.sDoorH }] };
    }

    //_in = true면 안쪽을 향한 면. 구멍(_holes)은 변을 따라 겹치지 않아야 한다
    static Cut(_b : CForgeMeshBuf, _a : ForgeV2, _c : ForgeV2, _u : number, _y0 : number, _y1 : number, _holes : IForgeHole[], _in : boolean)
    {
        const l = Math.hypot(_c[0] - _a[0], _c[1] - _a[1]);
        if(l < 1e-6) return;
        const tx = (_c[0] - _a[0]) / l, tz = (_c[1] - _a[1]) / l, sg = _in ? -1 : 1, n = [tz * sg, 0, -tx * sg];
        const Q = (_s0 : number, _s1 : number, _ya : number, _yb : number) =>
        {
            if(_s1 - _s0 < 1e-4 || _yb - _ya < 1e-4) return;
            const P = (_s : number, _y : number) => [_a[0] + tx * _s, _y, _a[1] + tz * _s];
            _b.Quad([P(_s0, _ya), P(_s1, _ya), P(_s1, _yb), P(_s0, _yb)], [[_u + _s0, _ya], [_u + _s1, _ya], [_u + _s1, _yb], [_u + _s0, _yb]], n);
        };
        let cur = 0;
        for(const h of _holes.slice().sort((_p, _q) => _p.s0 - _q.s0))
        {
            const s0 = Math.min(l, Math.max(cur, h.s0)), s1 = Math.min(l, Math.max(s0, h.s1));
            Q(cur, s0, _y0, _y1);
            Q(s0, s1, _y0, Math.min(_y1, Math.max(_y0, h.y0)));
            Q(s0, s1, Math.max(_y0, Math.min(_y1, h.y1)), _y1);
            cur = s1;
        }
        Q(cur, l, _y0, _y1);
    }

    //변마다 따로 구멍을 낸다(_holes[i]가 i번째 변의 구멍)
    static ExtrudeMap(_b : CForgeMeshBuf, _poly : ForgeV2[], _y0 : number, _y1 : number, _holes : IForgeHole[][], _in : boolean)
    {
        let u = 0;
        for(let i = 0; i < _poly.length; i++)
        {
            const a = _poly[i], c = _poly[(i + 1) % _poly.length];
            CForgeInteriorGen.Cut(_b, a, c, u, _y0, _y1, _holes[i], _in);
            u += Math.hypot(c[0] - a[0], c[1] - a[1]);
        }
    }

    static Extrude(_b : CForgeMeshBuf, _poly : ForgeV2[], _y0 : number, _y1 : number, _cut : number, _holes : IForgeHole[], _in : boolean)
    {
        let u = 0;
        for(let i = 0; i < _poly.length; i++)
        {
            const a = _poly[i], c = _poly[(i + 1) % _poly.length];
            CForgeInteriorGen.Cut(_b, a, c, u, _y0, _y1, i == _cut ? _holes : [], _in);
            u += Math.hypot(c[0] - a[0], c[1] - a[1]);
        }
    }

    private static Ov(_a : number[], _b : number[]) : boolean { return _a[0] < _b[2] && _a[2] > _b[0] && _a[1] < _b[3] && _a[3] > _b[1]; }
    private static Dist(_p : ForgeV2, _r : number[]) : number { return Math.hypot(Math.max(_r[0] - _p[0], 0, _p[0] - _r[2]), Math.max(_r[1] - _p[1], 0, _p[1] - _r[3])); }
    private static Area(_r : number[]) : number { return (_r[2] - _r[0]) * (_r[3] - _r[1]); }
    private static Grow(_r : number[], _d : number) : number[] { return [_r[0] - _d, _r[1] - _d, _r[2] + _d, _r[3] + _d]; }

    private static SubRect(_r : number[], _h : number[]) : number[][]
    {
        if(_h == null || !CForgeInteriorGen.Ov(_r, _h)) return [_r];
        const x0 = Math.max(_r[0], _h[0]), x1 = Math.min(_r[2], _h[2]), y0 = Math.max(_r[1], _h[1]), y1 = Math.min(_r[3], _h[3]);
        return [[_r[0], _r[1], x0, _r[3]], [x1, _r[1], _r[2], _r[3]], [x0, _r[1], x1, y0], [x0, y1, x1, _r[3]]].filter(_q => _q[2] - _q[0] > 0.01 && _q[3] - _q[1] > 0.01);
    }

    //윗면 없는 상자(칸막이 윗면은 천장·슬래브에 가려 보이지 않고, 칸막이끼리 만나는 곳에서 서로 겹쳐 깜빡인다)
    private static Sides(_b : CForgeMeshBuf, _cx : number, _cz : number, _w : number, _d : number, _y0 : number, _y1 : number, _a : number)
    {
        const cs = Math.cos(_a), sn = Math.sin(_a), hw = _w * 0.5, hd = _d * 0.5;
        const P = (_x : number, _z : number, _y : number) => [_cx + _x * cs - _z * sn, _y, _cz + _x * sn + _z * cs];
        const c = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
        for(let i = 0; i < 4; i++)
        {
            const a = c[i], d = c[(i + 1) % 4], ex = d[0] - a[0], ez = d[1] - a[1], l = Math.hypot(ex, ez), nx = ez / l, nz = -ex / l;
            _b.Quad([P(a[0], a[1], _y0), P(d[0], d[1], _y0), P(d[0], d[1], _y1), P(a[0], a[1], _y1)], null, [nx * cs - nz * sn, 0, nx * sn + nz * cs]);
        }
    }

    //변의 일부만 다른 사각형과 맞닿으면 바깥 벽인 구간에도 안쪽 여유를 못 줘서 바닥이 외벽 평면까지 나간다. 맞닿는 구간 끝에서 쪼갠다
    private static Pieces(_rs : number[][]) : number[][]
    {
        const out = _rs.map(_r => _r.slice());
        for(let guard = 0; guard < 16; guard++)
        {
            let split = false;
            for(let i = 0; i < out.length && !split; i++)
                for(let j = 0; j < out.length && !split; j++)
                {
                    if(i == j) continue;
                    const r = out[i], o = out[j], cuts : number[][] = [[], []];
                    if(Math.abs(r[0] - o[2]) < 0.01 || Math.abs(r[2] - o[0]) < 0.01) cuts[1].push(Math.max(r[1], o[1]), Math.min(r[3], o[3]));
                    if(Math.abs(r[1] - o[3]) < 0.01 || Math.abs(r[3] - o[1]) < 0.01) cuts[0].push(Math.max(r[0], o[0]), Math.min(r[2], o[2]));
                    for(const ax of [0, 1])
                    {
                        const lo = r[ax], hi = r[ax + 2], cs = [...new Set(cuts[ax].filter(_c => _c > lo + 0.01 && _c < hi - 0.01))].sort((_a, _b) => _a - _b);
                        if(cuts[ax].length == 0 || cs.length == 0) continue;
                        const edge = [lo, ...cs, hi], parts : number[][] = [];
                        for(let k = 0; k + 1 < edge.length; k++) parts.push(ax == 0 ? [edge[k], r[1], edge[k + 1], r[3]] : [r[0], edge[k], r[2], edge[k + 1]]);
                        out.splice(i, 1, ...parts);
                        split = true;
                        break;
                    }
                }
            if(!split) break;
        }
        return out;
    }

    private static Shared(_rs : number[][], _i : number, _side : number) : boolean
    {
        const r = _rs[_i];
        for(let j = 0; j < _rs.length; j++)
        {
            if(j == _i) continue;
            const o = _rs[j], ov = _side < 2 ? Math.min(r[3], o[3]) - Math.max(r[1], o[1]) : Math.min(r[2], o[2]) - Math.max(r[0], o[0]);
            const gap = _side == 0 ? o[2] - r[0] : _side == 1 ? o[0] - r[2] : _side == 2 ? o[3] - r[1] : o[1] - r[3];
            if(Math.abs(gap) < 0.01 && ov > 0.3) return true;
        }
        return false;
    }

    //_ev : 정문 안쪽 입구 공간. 칸막이가 이 사각형을 가로지르면 문을 열자마자 벽이 막으므로 그 위치를 피해 자른다(피할 수 없으면 다른 방·다른 축을 본다)
    private static Split(_rooms : IRoom[], _parts : IPart[], _R : CForgeRand, _ev : number[] = null) : boolean
    {
        const M = CForgeInteriorGen.sMin, lim = M * 2 + CForgeInteriorGen.sThick;
        const order = _rooms.map((_m, _i) => _i).filter(_i => !_rooms[_i].keep && Math.max(_rooms[_i].r[2] - _rooms[_i].r[0], _rooms[_i].r[3] - _rooms[_i].r[1]) >= lim)
            .sort((_p, _q) => CForgeInteriorGen.Area(_rooms[_q].r) - CForgeInteriorGen.Area(_rooms[_p].r));
        for(const bi of order)
        {
            const [u0, v0, u1, v1] = _rooms[bi].r, pref = u1 - u0 >= v1 - v0 ? 0 : 1;
            for(const axis of [pref, 1 - pref])
            {
                const a0 = axis == 0 ? u0 : v0, a1 = axis == 0 ? u1 : v1, o0 = axis == 0 ? v0 : u0, o1 = axis == 0 ? v1 : u1;
                if(a1 - a0 < lim) continue;
                let pos = Math.min(a1 - M, Math.max(a0 + M, a0 + (a1 - a0) * _R.Range(0.4, 0.6)));
                if(_ev != null)
                {
                    const e0 = (axis == 0 ? _ev[0] : _ev[1]) - 0.1, e1 = (axis == 0 ? _ev[2] : _ev[3]) + 0.1, s0 = axis == 0 ? _ev[1] : _ev[0], s1 = axis == 0 ? _ev[3] : _ev[2];
                    if(o1 > s0 && o0 < s1 && pos > e0 && pos < e1)
                    {
                        const opt : number[] = [];
                        if(e0 >= a0 + M) opt.push(e0);
                        if(e1 <= a1 - M) opt.push(e1);
                        if(opt.length == 0) continue;
                        pos = opt.sort((_p, _q) => Math.abs(_p - pos) - Math.abs(_q - pos))[0];
                    }
                }
                const lo = o0 + 0.7, hi = o1 - 0.7, door = hi > lo ? _R.Range(lo, hi) : (o0 + o1) * 0.5;
                _parts.push({ axis, pos, a0 : o0, a1 : o1, door });
                const A : IRoom = { r : axis == 0 ? [u0, v0, pos, v1] : [u0, v0, u1, pos], kind : "", walled : true };
                const B : IRoom = { r : axis == 0 ? [pos, v0, u1, v1] : [u0, pos, u1, v1], kind : "", walled : true };
                _rooms.splice(bi, 1, A, B);
                return true;
            }
        }
        return false;
    }

    //걷는 몸(반지름 0.3m)이 입구에서 각 목표(문 양쪽·다음 계단 앞)까지 닿는지 격자 길찾기로 본다. 닿지 못하는 목표 번호를 돌려준다.
    //_targets[i]는 후보 점들이고 하나라도 닿으면 닿은 것이다. _items는 막는 가구, _voids는 걸어 들어가면 떨어지는 구멍
    private static Unreached(_rooms : IRoom[], _parts : IPart[], _items : number[][], _voids : number[][], _entry : ForgeV2, _targets : ForgeV2[][]) : number[]
    {
        const C = CForgeInteriorGen, res = 0.2, rad = 0.3;
        let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
        for(const m of _rooms) { x0 = Math.min(x0, m.r[0]); z0 = Math.min(z0, m.r[1]); x1 = Math.max(x1, m.r[2]); z1 = Math.max(z1, m.r[3]); }
        const W = Math.ceil((x1 - x0) / res) + 1, H = Math.ceil((z1 - z0) / res) + 1;
        const inU = (_u : number, _v : number) => _rooms.some(_m => _u >= _m.r[0] - 0.01 && _u <= _m.r[2] + 0.01 && _v >= _m.r[1] - 0.01 && _v <= _m.r[3] + 0.01);
        const blocks : number[][] = [], t = 0.05 + rad;
        for(const p of _parts)
        {
            if(p.axis == 0) blocks.push([p.pos - t, p.a0 - 0.1, p.pos + t, p.door - 0.45 + rad], [p.pos - t, p.door + 0.45 - rad, p.pos + t, p.a1 + 0.1]);
            else blocks.push([p.a0 - 0.1, p.pos - t, p.door - 0.45 + rad, p.pos + t], [p.door + 0.45 - rad, p.pos - t, p.a1 + 0.1, p.pos + t]);
        }
        for(const q of _items) blocks.push(C.Grow(q, rad));
        for(const q of _voids) blocks.push(C.Grow(q, 0.2));
        const g = new Uint8Array(W * H), ring = [[rad, 0], [-rad, 0], [0, rad], [0, -rad], [rad * 0.7, rad * 0.7], [-rad * 0.7, rad * 0.7], [rad * 0.7, -rad * 0.7], [-rad * 0.7, -rad * 0.7]];
        for(let j = 0; j < H; j++) for(let i = 0; i < W; i++)
        {
            const u = x0 + i * res, v = z0 + j * res;
            if(!inU(u, v) || ring.some(([_a, _b]) => !inU(u + _a, v + _b)) || blocks.some(_q => u > _q[0] && u < _q[2] && v > _q[1] && v < _q[3])) continue;
            g[j * W + i] = 1;
        }
        const Cell = (_p : ForgeV2) : number =>
        {
            const ci = Math.round((_p[0] - x0) / res), cj = Math.round((_p[1] - z0) / res);
            let best = -1, bd = Infinity;
            for(let dj = -4; dj <= 4; dj++) for(let di = -4; di <= 4; di++)
            {
                const i = ci + di, j = cj + dj;
                if(i < 0 || j < 0 || i >= W || j >= H || !g[j * W + i]) continue;
                if(di * di + dj * dj < bd) { bd = di * di + dj * dj; best = j * W + i; }
            }
            return best;
        };
        const s0 = Cell(_entry);
        if(s0 < 0) return [];
        const seen = new Uint8Array(W * H), q = [s0];
        seen[s0] = 1;
        while(q.length > 0)
        {
            const c = q.pop(), i = c % W, j = (c - i) / W;
            for(const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
            {
                const ni = i + di, nj = j + dj;
                if(ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
                const n = nj * W + ni;
                if(g[n] && !seen[n]) { seen[n] = 1; q.push(n); }
            }
        }
        const bad : number[] = [];
        _targets.forEach((_c, _i) => { if(!_c.some(_p => { const k = Cell(_p); return k >= 0 && seen[k] == 1; })) bad.push(_i); });
        return bad;
    }

    //층 _k에서 걸어서 닿아야 하는 곳: 출발점(정문 안쪽, 위층이면 올라온 계단 끝)과 목표(칸막이 문 양쪽, 다음 층 계단 앞)
    private static Goals(_parts : IPart[], _stairs : IStair[], _k : number, _entry : ForgeV2) : { from : ForgeV2, targets : ForgeV2[][] }
    {
        const P = (_s : IStair, _x : number, _b : number) : ForgeV2 => _s.axis == 0 ? [_x, _b] : [_b, _x];
        let from = _entry;
        if(_k > 0 && _stairs[_k - 1] != null) { const s = _stairs[_k - 1]; from = P(s, s.xs + s.dir * s.run + s.dir * 0.55, s.b0 + s.sw * 0.5); }
        const targets : ForgeV2[][] = [];
        for(const p of _parts) for(const sg of [-1, 1]) targets.push([p.axis == 0 ? [p.pos + sg * 0.55, p.door] : [p.door, p.pos + sg * 0.55]]);
        const s = _stairs[_k];
        if(s != null) targets.push([P(s, s.xs - s.dir * 0.5, s.b0 + s.sw * 0.5), P(s, s.xs + s.dir * 0.3, s.b0 - 0.45), P(s, s.xs + s.dir * 0.3, s.b0 + s.sw + 0.45)]);
        return { from, targets };
    }

    //정문 안쪽 입구 공간(정문 앞 약 2.2m 사각형)을 칸막이가 가로지르는지(시험용). 문 구멍 자리는 뺀다
    static EntryWalled(_p : IForgePlan) : boolean
    {
        const e = _p.entry, z = [e[0] - 1.1, e[1] - 1.1, e[0] + 1.1, e[1] + 1.1], t = CForgeInteriorGen.sThick * 0.5;
        for(const p of _p.parts)
        {
            const s = p.axis == 0 ? [[p.pos - t, p.a0, p.pos + t, p.door - 0.45], [p.pos - t, p.door + 0.45, p.pos + t, p.a1]] : [[p.a0, p.pos - t, p.door - 0.45, p.pos + t], [p.door + 0.45, p.pos - t, p.a1, p.pos + t]];
            if(s.some(_q => CForgeInteriorGen.Ov(_q, z))) return true;
        }
        return false;
    }

    //완성된 계획에서 층마다 입구·계단 끝에서 모든 문·계단에 닿는지 확인해 닿지 못하는 목표 수를 돌려준다(시험용)
    static Verify(_p : IForgePlan) : number
    {
        let bad = 0;
        for(let k = 0; k < _p.levels; k++)
        {
            const G = CForgeInteriorGen.Goals(_p.parts, _p.stairs, k, _p.entry);
            const items = _p.furn.filter(_f => _f.level == k && _f.kind != "chair" && _f.h > 0).map(_f => { const v = Math.abs(Math.sin(_f.phi)) > 0.5, eu = (v ? _f.w : _f.d) * 0.5, ev = (v ? _f.d : _f.w) * 0.5; return [_f.c[0] - eu, _f.c[1] - ev, _f.c[0] + eu, _f.c[1] + ev]; });
            bad += CForgeInteriorGen.Unreached(_p.rooms, _p.parts, items, k >= 1 ? [_p.holes[k - 1]] : [], G.from, G.targets).length;
        }
        return bad;
    }

    //여러 층 계단이 들어갈 만큼 긴 방을 현관 쪽에 떼어 둔다(남은 쪽이 너무 좁으면 통째로 쓴다). 떼어 낸 방은 더 쪼개지 않는다
    private static Carve(_rooms : IRoom[], _parts : IPart[], _i : number, _len : number, _e : ForgeV2, _R : CForgeRand)
    {
        const [u0, v0, u1, v1] = _rooms[_i].r, axis = u1 - u0 >= v1 - v0 ? 0 : 1;
        const a0 = axis == 0 ? u0 : v0, a1 = axis == 0 ? u1 : v1, o0 = axis == 0 ? v0 : u0, o1 = axis == 0 ? v1 : u1, e = axis == 0 ? _e[0] : _e[1];
        //홀은 정문 위치를 품어야 하고 칸막이 선은 정문에서 1.3m 이상 떨어져야 한다. 그렇게 못 하면 방을 통째로 홀로 쓴다
        const M = CForgeInteriorGen.sMin, lowPos = Math.max(a0 + _len, e + 1.3), highPos = Math.min(a1 - _len, e - 1.3);
        const lowOk = a1 - lowPos >= M, highOk = highPos - a0 >= M, preferLow = e - a0 <= a1 - e;
        if(!lowOk && !highOk) { _rooms[_i].keep = true; return; }
        const low = lowOk && (preferLow || !highOk), pos = low ? lowPos : highPos, lo = o0 + 0.7, hi = o1 - 0.7, door = hi > lo ? _R.Range(lo, hi) : (o0 + o1) * 0.5;
        _parts.push({ axis, pos, a0 : o0, a1 : o1, door });
        const A : IRoom = { r : axis == 0 ? [u0, v0, pos, v1] : [u0, v0, u1, pos], kind : "", walled : true };
        const B : IRoom = { r : axis == 0 ? [pos, v0, u1, v1] : [u0, pos, u1, v1], kind : "", walled : true };
        (low ? A : B).keep = true;
        _rooms.splice(_i, 1, A, B);
    }

    private static Make(_b : IForgeBuildingR, _g : ForgeGround) : IForgePlan
    {
        const I = _b.interior, R = new CForgeRand(CForgeRand.Hash(_b.seed, 7919)), C = CForgeInteriorGen;
        const poly = _b.poly, n = poly.length, ang = Math.atan2(_b.u[1], _b.u[0]);
        let gmin = Infinity, gmax = -Infinity;
        for(const q of poly) { const g = _g(q[0], q[1]); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
        const floor = gmax + 0.25, top = floor + _b.height, floors = Math.max(1, _b.floors), fhE = (_b.height - 0.3) / floors;
        const LevelY = (_k : number) => floor + C.sSill + fhE * _k, SlabTop = (_j : number) => _j < floors ? LevelY(_j) : top - 0.1;
        const W = (_u : number, _v : number) => CForgePoly.ToWorld([[_u, _v]], _b.o, _b.u)[0];
        const stairOk = floors >= 2 && fhE - 0.2 >= 2.1, sn = Math.ceil(fhE / 0.2), run = sn * 0.22, sw = 0.95, lane = 0.1, margin2 = 0.8;

        let cname = I.concept;
        if(cname == null || C.sConcept[cname] == null)
        {
            const cu = CForgeTheme.Of(_b).mCulture;
            cname = cu == CForgeTheme.eCulture.Korea ? "hanok" : cu == CForgeTheme.eCulture.Japan ? "machiya" : "modern";
        }
        const concept = C.sConcept[cname], dens = Math.min(1, Math.max(0, I.density ?? 0.6));

        const total = _b.rects.reduce((_s, _r) => _s + C.Area(_r), 0);
        const kOn = I.kitchen === true || (I.kitchen !== false && total >= 18), bOn = I.bath === true || (I.bath !== false && total >= 26);

        const rooms : IRoom[] = [], parts : IPart[] = [];
        let target = 0;
        const pcs = C.Pieces(_b.rects);
        pcs.forEach((_r, _i) =>
        {
            const m = 0.12, r = [_r[0] + (C.Shared(pcs, _i, 0) ? 0 : m), _r[1] + (C.Shared(pcs, _i, 2) ? 0 : m), _r[2] - (C.Shared(pcs, _i, 1) ? 0 : m), _r[3] - (C.Shared(pcs, _i, 3) ? 0 : m)];
            if(r[2] - r[0] < 0.4 || r[3] - r[1] < 0.4) return;
            rooms.push({ r, kind : "", walled : false });
            target += Math.min(5, Math.max(1, Math.round(C.Area(r) / 14)));
        });
        if(rooms.length == 0)
        {
            let big = _b.rects[0];
            for(const r of _b.rects) if(C.Area(r) > C.Area(big)) big = r;
            rooms.push({ r : [big[0] + 0.12, big[1] + 0.12, big[2] - 0.12, big[3] - 0.12], kind : "", walled : false });
        }
        const ew = poly[_b.door.edge], ec = poly[(_b.door.edge + 1) % n], el = Math.hypot(ec[0] - ew[0], ec[1] - ew[1]) || 1;
        const etx = (ec[0] - ew[0]) / el, etz = (ec[1] - ew[1]) / el, enx = etz, enz = -etx, ds = CForgeHouseGen.DoorPos(_b);
        const entry = CForgePoly.ToLocal([[ew[0] + etx * ds - enx * 0.7, ew[1] + etz * ds - enz * 0.7]], _b.o, _b.u)[0];
        const multi = floors >= 3 && stairOk, hallLen = run + 0.9 + margin2 + 0.2;
        if(multi)
        {
            const fit = (_m : IRoom) => { const du = _m.r[2] - _m.r[0] - 0.14, dv = _m.r[3] - _m.r[1] - 0.14; return Math.max(du, dv) >= hallLen && Math.min(du, dv) >= 2 * sw + lane + 0.3; };
            const hi = rooms.map((_m, _i) => _i).filter(_i => fit(rooms[_i])).sort((_p, _q) => C.Dist(entry, rooms[_p].r) - C.Dist(entry, rooms[_q].r))[0];
            if(hi != null) C.Carve(rooms, parts, hi, hallLen, entry, R);
        }
        const need = 1 + (kOn ? 1 : 0) + (bOn ? 1 : 0) + (total >= 16 ? 1 : 0);
        while(rooms.length < Math.max(target, need) && C.Split(rooms, parts, R, [entry[0] - 1.1, entry[1] - 1.1, entry[0] + 1.1, entry[1] + 1.1])) {}
        //칸막이 문 옆면이 수직으로 만나는 다른 칸막이 면과 몇 mm 차이로 겹치면 깜빡이므로, 문을 그 칸막이가 붙는 자리에서 띄운다
        for(const p of parts)
        {
            const joints = parts.filter(_q => _q.axis != p.axis && _q.pos > p.a0 && _q.pos < p.a1 && (Math.abs(_q.a0 - p.pos) < 0.01 || Math.abs(_q.a1 - p.pos) < 0.01)).map(_q => _q.pos);
            if(joints.every(_j => Math.abs(_j - p.door) >= 0.7)) continue;
            let best = p.door, bd = Infinity;
            for(let c = p.a0 + 0.7; c <= p.a1 - 0.7 + 1e-6; c += 0.05)
                if(joints.every(_j => Math.abs(_j - c) >= 0.7) && Math.abs(c - p.door) < bd) { bd = Math.abs(c - p.door); best = c; }
            p.door = best;
        }

        let li = 0, ld = Infinity;
        rooms.forEach((_m, _i) => { const d = C.Dist(entry, _m.r); if(d < ld) { ld = d; li = _i; } });
        rooms[li].kind = "living";
        const cen = (_m : IRoom) : ForgeV2 => [(_m.r[0] + _m.r[2]) * 0.5, (_m.r[1] + _m.r[3]) * 0.5];
        const lc = cen(rooms[li]), others = rooms.map((_m, _i) => _i).filter(_i => _i != li).sort((_p, _q) => Math.hypot(cen(rooms[_p])[0] - lc[0], cen(rooms[_p])[1] - lc[1]) - Math.hypot(cen(rooms[_q])[0] - lc[0], cen(rooms[_q])[1] - lc[1]));
        let kitchenette = false;
        if(kOn)
        {
            const ki = others.find(_i => rooms[_i].kind == "" && C.Area(rooms[_i].r) >= 5);
            if(ki != null) rooms[ki].kind = "kitchen"; else kitchenette = true;
        }
        if(bOn)
        {
            const cand = others.filter(_i => rooms[_i].kind == "" && rooms[_i].walled && C.Area(rooms[_i].r) >= 3).sort((_p, _q) => C.Area(rooms[_p].r) - C.Area(rooms[_q].r));
            if(cand.length > 0) rooms[cand[0]].kind = "bath";
        }
        for(const m of rooms) if(m.kind == "") m.kind = C.Area(m.r) >= 6 ? "bed" : "storage";

        const zones : number[][] = [[entry[0] - 1.0, entry[1] - 1.0, entry[0] + 1.0, entry[1] + 1.0]];
        for(const p of parts) zones.push(p.axis == 0 ? [p.pos - 0.9, p.door - 0.65, p.pos + 0.9, p.door + 0.65] : [p.door - 0.65, p.pos - 0.9, p.door + 0.65, p.pos + 0.9]);

        //계단: 층마다 한 줄씩. 두 줄(A·B)을 나란히 두고 A줄은 짝수 층, B줄은 홀수 층을 반대 방향으로 오른다.
        //올라간 곳(xe)에서 옆줄로 건너 다음 층을 오르기 때문에 위층 계단이 아래층 계단 위에 겹치지 않는다
        const stairs : IStair[] = [], holes : number[][] = [];
        let host = -1, wedge : number[][][] = [], lanes = 1;
        if(stairOk)
        {
            let bestScore = Infinity, found : { axis : number, dir : number, xs : number, b0 : number[] } = null;
            for(const L of multi ? [2, 1] : [1])
            {
                const margin = L == 2 ? margin2 : 0, need2 = L * sw + (L - 1) * lane + 0.3;
                for(const hi of [li, ...others])
                {
                    const hr = [rooms[hi].r[0] + 0.07, rooms[hi].r[1] + 0.07, rooms[hi].r[2] - 0.07, rooms[hi].r[3] - 0.07], du = hr[2] - hr[0], dv = hr[3] - hr[1], axis = du >= dv ? 0 : 1;
                    const Lg = axis == 0 ? du : dv, Wd = axis == 0 ? dv : du;
                    if(Lg < run + 0.9 + margin || Wd < need2) continue;
                    const A0 = axis == 0 ? hr[0] : hr[1], A1 = axis == 0 ? hr[2] : hr[3], B0 = axis == 0 ? hr[1] : hr[0], B1 = axis == 0 ? hr[3] : hr[2];
                    for(const dir of [1, -1]) for(const side of [0, 1])
                    {
                        const xs = dir > 0 ? A0 + margin : A1 - margin, xe = xs + dir * run, lo = Math.min(xs, xe) - 0.8, hi2 = Math.max(xs, xe) + 0.8;
                        const b0 = [side == 0 ? B0 : B1 - sw, ...(L == 2 ? [side == 0 ? B0 + sw + lane : B1 - 2 * sw - lane] : [])], bl = Math.min(...b0), bh = Math.max(...b0) + sw;
                        const E = axis == 0 ? [lo, bl, hi2, bh] : [bl, lo, bh, hi2];
                        if(zones.some(_z => C.Ov(_z, E))) continue;
                        const sp : ForgeV2 = axis == 0 ? [xs, (bl + bh) * 0.5] : [(bl + bh) * 0.5, xs], score = Math.hypot(sp[0] - entry[0], sp[1] - entry[1]) + (hi == li ? 0 : 100);
                        if(score >= bestScore) continue;
                        bestScore = score; host = hi; lanes = L;
                        found = { axis, dir, xs, b0 };
                    }
                    if(found != null) break;
                }
                if(found != null) break;
            }
            if(found != null)
            {
                const flights = lanes == 2 ? floors - 1 : 1;
                for(let j = 0; j < flights; j++)
                {
                    const odd = j % 2 == 1, dir = odd ? -found.dir : found.dir, xs = odd ? found.xs + found.dir * run : found.xs, b0 = found.b0[odd ? 1 : 0];
                    const xe = xs + dir * run, xh = xs + dir * run * Math.max(0, fhE - 2.55) / fhE, h0 = Math.min(xh, xe), h1 = Math.max(xh, xe);
                    stairs.push({ axis : found.axis, dir, xs, b0, sw, n : sn, run });
                    holes.push(found.axis == 0 ? [h0, b0 - 0.03, h1, b0 + sw + 0.03] : [b0 - 0.03, h0, b0 + sw + 0.03, h1]);
                }
            }
        }
        const levels = stairs.length > 0 ? stairs.length + 1 : 1;
        //층고가 낮아 슬래브를 넣으면 머리가 닿는 집은 층을 나누지 않고 지붕 밑까지 한 층으로 쓴다
        const tall = floors >= 2 && !stairOk;
        const slab : number[] = [0], thick : number[] = [0], ceil : number[] = [];
        for(let j = 1; j <= levels; j++) { slab.push(tall ? top - 0.1 : SlabTop(j)); thick.push(!tall && j < floors ? 0.2 : 0); }
        for(let k = 0; k < levels; k++) ceil.push(slab[k + 1] - thick[k + 1]);
        const y : number[] = [];
        for(let k = 0; k < levels; k++) y.push(LevelY(k));

        const boxes : IForgeBox[] = [];
        const BoxL = (_r : number[], _y0 : number, _y1 : number) => boxes.push({ c : W((_r[0] + _r[2]) * 0.5, (_r[1] + _r[3]) * 0.5), t : _b.u, hl : (_r[2] - _r[0]) * 0.5, hw : (_r[3] - _r[1]) * 0.5, y0 : _y0, y1 : _y1 });
        const dw = C.sDoorW * 0.5, sill = floor + C.sSill;
        for(let i = 0; i < n; i++)
        {
            const a = poly[i], c = poly[(i + 1) % n], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
            if(l < 1e-6) continue;
            const tx = (c[0] - a[0]) / l, tz = (c[1] - a[1]) / l, nx = tz, nz = -tx;
            const Seg = (_s0 : number, _s1 : number, _y0 : number, _y1 : number) =>
            {
                if(_s1 - _s0 < 0.02) return;
                const m = (_s0 + _s1) * 0.5;
                boxes.push({ c : [a[0] + tx * m - nx * 0.15, a[1] + tz * m - nz * 0.15], t : [tx, tz], hl : (_s1 - _s0) * 0.5, hw : 0.15, y0 : _y0, y1 : _y1 });
            };
            if(i == _b.door.edge)
            {
                Seg(0, ds - dw, gmin - 0.5, top); Seg(ds + dw, l, gmin - 0.5, top);
                Seg(ds - dw, ds + dw, sill + C.sDoorH, top);
                boxes.push({ c : [a[0] + tx * ds + nx * 0.25, a[1] + tz * ds + nz * 0.25], t : [tx, tz], hl : dw + 0.175, hw : 0.25, y0 : sill - 1.6, y1 : sill + 0.02 });
            }
            else Seg(0, l, gmin - 0.5, top);
        }
        //현관 앞 계단: 경사지에서는 바닥이 지형보다 한참 높아 디딤돌 한 칸으로는 올라갈 수 없다. 지형에 닿을 때까지 20cm씩 내려간다
        const steps : { c : ForgeV2; top : number }[] = [], stepW = C.sDoorW + 0.35;
        {
            const px = ew[0] + etx * ds, pz = ew[1] + etz * ds;
            for(let i = 1; i <= 8; i++)
            {
                const off = 0.5 + 0.3 * (i - 0.5), st = sill + 0.02 - 0.2 * i;
                steps.push({ c : [px + enx * off, pz + enz * off], top : st });
                boxes.push({ c : [px + enx * off, pz + enz * off], t : [etx, etz], hl : stepW * 0.5, hw : 0.15, y0 : st - 0.6, y1 : st });
                if(st <= _g(px + enx * (off + 0.15), pz + enz * (off + 0.15)) + 0.12) break;
            }
        }
        for(const r of _b.rects) BoxL(r, gmin - 0.5, sill + 0.02);
        for(let j = 1; j < levels; j++) for(const r of _b.rects) for(const q of C.SubRect(r, holes[j - 1])) BoxL(q, ceil[j - 1], slab[j] + 0.02);
        if(thick[levels] > 0) for(const r of _b.rects) BoxL(r, ceil[levels - 1], slab[levels]);

        for(let k = 0; k < levels; k++)
            for(const p of parts)
            {
                const y0 = y[k], y1 = ceil[k], t = C.sThick * 0.5;
                const Piece = (_s0 : number, _s1 : number, _ya : number, _yb : number) =>
                {
                    if(_s1 - _s0 < 0.02 || _yb - _ya < 0.02) return;
                    BoxL(p.axis == 0 ? [p.pos - t, _s0, p.pos + t, _s1] : [_s0, p.pos - t, _s1, p.pos + t], _ya, _yb);
                };
                Piece(p.a0, p.door - 0.45, y0, y1); Piece(p.door + 0.45, p.a1, y0, y1); Piece(p.door - 0.45, p.door + 0.45, y0 + C.sDoorH, y1);
            }

        stairs.forEach((s, j) =>
        {
            const yb = y[j] - 0.3, y0 = y[j], y1 = y[j] + fhE, xe = s.xs + s.dir * s.run, b1 = s.b0 + s.sw, tri : number[][][] = [];
            const V = (_a : number, _bb : number, _y : number) => { const w = s.axis == 0 ? W(_a, _bb) : W(_bb, _a); return [w[0], _y, w[1]]; };
            const Qd = (..._q : number[][]) => { tri.push([_q[0], _q[1], _q[2], _q[0], _q[2], _q[3]]); };
            Qd(V(s.xs, s.b0, yb), V(xe, s.b0, yb), V(xe, b1, yb), V(s.xs, b1, yb));
            Qd(V(s.xs, s.b0, yb), V(s.xs, b1, yb), V(s.xs, b1, y0), V(s.xs, s.b0, y0));
            Qd(V(xe, s.b0, yb), V(xe, s.b0, y1), V(xe, b1, y1), V(xe, b1, yb));
            Qd(V(s.xs, s.b0, yb), V(s.xs, s.b0, y0), V(xe, s.b0, y1), V(xe, s.b0, yb));
            Qd(V(s.xs, b1, yb), V(xe, b1, yb), V(xe, b1, y1), V(s.xs, b1, y0));
            Qd(V(s.xs, s.b0, y0), V(s.xs, b1, y0), V(xe, b1, y1), V(xe, s.b0, y1));
            wedge.push(tri.flat());
        });

        const furn : IFurn[] = [];
        let stairZone : number[] = null;
        if(stairs.length > 0)
        {
            const s0 = stairs[0], al = Math.min(s0.xs, s0.xs + s0.dir * s0.run) - 0.8, ah = Math.max(s0.xs, s0.xs + s0.dir * s0.run) + 0.8;
            const bl = Math.min(...stairs.map(_s => _s.b0)) - 0.1, bh = Math.max(...stairs.map(_s => _s.b0 + _s.sw)) + 0.1;
            stairZone = s0.axis == 0 ? [al, bl, ah, bh] : [bl, al, bh, ah];
        }
        for(let k = 0; k < levels; k++)
        {
            const RL = new CForgeRand(CForgeRand.Hash(_b.seed, 7919, k + 1)), Y = y[k];
            const placed : { f : IFurn; fp : number[]; parent : number; gone : boolean }[] = [];
            let lastIdx = -1;
            rooms.forEach((rm, ri) =>
            {
                const kind = k == 0 ? rm.kind : ri == host ? "hall" : C.Area(rm.r) >= 6 ? "bed" : "storage";
                const r = [rm.r[0] + 0.07, rm.r[1] + 0.07, rm.r[2] - 0.07, rm.r[3] - 0.07], obs : number[][] = [...zones];
                if(stairZone != null) obs.push(stairZone);
                //현관에서 마주 보이는 벽에 큰 가구를 놓아 문틈으로도 보이게 한다
                const near = [Math.abs(entry[0] - r[0]), Math.abs(r[2] - entry[0]), Math.abs(entry[1] - r[1]), Math.abs(r[3] - entry[1])];
                let ns = 0;
                near.forEach((_d, _i) => { if(_d < near[ns]) ns = _i; });
                const facing = [ns ^ 1, ns < 2 ? entry[1] : entry[0]];
                const chance = (_p : number) => RL.Chance(_p * (0.35 + 0.65 * dens));
                const Add = (_kind : string, _w : number, _d : number, _h : number, _wall : boolean, _pref? : number[]) : number[] =>
                {
                    for(let t = 0; t < 16; t++)
                    {
                        let cu : number, cv : number, phi : number;
                        if(_wall)
                        {
                            const first = t == 0 && _pref != null, side = first ? _pref[0] : RL.Int(0, 3);
                            phi = side == 0 ? 0 : side == 1 ? Math.PI : side == 2 ? Math.PI * 0.5 : -Math.PI * 0.5;
                            if(side < 2) { if(r[3] - r[1] < _w) continue; cu = side == 0 ? r[0] + _d * 0.5 : r[2] - _d * 0.5; cv = first ? Math.min(r[3] - _w * 0.5, Math.max(r[1] + _w * 0.5, _pref[1])) : RL.Range(r[1] + _w * 0.5, r[3] - _w * 0.5); }
                            else { if(r[2] - r[0] < _w) continue; cv = side == 2 ? r[1] + _d * 0.5 : r[3] - _d * 0.5; cu = first ? Math.min(r[2] - _w * 0.5, Math.max(r[0] + _w * 0.5, _pref[1])) : RL.Range(r[0] + _w * 0.5, r[2] - _w * 0.5); }
                        }
                        else
                        {
                            phi = RL.Int(0, 3) * Math.PI * 0.5;
                            if(r[2] - r[0] < _w + 1 || r[3] - r[1] < _d + 1) continue;
                            cu = RL.Range(r[0] + 0.5 + _w * 0.5, r[2] - 0.5 - _w * 0.5); cv = RL.Range(r[1] + 0.5 + _d * 0.5, r[3] - 0.5 - _d * 0.5);
                        }
                        const vert = Math.abs(Math.sin(phi)) > 0.5, eu = (vert ? _w : _d) * 0.5, ev = (vert ? _d : _w) * 0.5, fp = [cu - eu, cv - ev, cu + eu, cv + ev];
                        if(fp[0] < r[0] - 0.01 || fp[1] < r[1] - 0.01 || fp[2] > r[2] + 0.01 || fp[3] > r[3] + 0.01) continue;
                        if(obs.some(_o => C.Ov(_o, fp))) continue;
                        obs.push(C.Grow(fp, 0.22));
                        lastIdx = placed.length;
                        placed.push({ f : { kind : _kind, c : [cu, cv], phi, w : _w, d : _d, level : k, h : _h }, fp, parent : -1, gone : false });
                        return fp;
                    }
                    return null;
                };
                const Chairs = (_t : number[], _n : number, _par : number = lastIdx) =>
                {
                    const cx = (_t[0] + _t[2]) * 0.5, cz = (_t[1] + _t[3]) * 0.5, hu = (_t[2] - _t[0]) * 0.5, hv = (_t[3] - _t[1]) * 0.5, sp = concept.low ? 0.4 : 0.3;
                    const sides : [number, number, number][] = [[cx - hu - sp, cz, 0], [cx + hu + sp, cz, Math.PI], [cx, cz - hv - sp, Math.PI * 0.5], [cx, cz + hv + sp, -Math.PI * 0.5]];
                    let cnt = 0;
                    const table = obs.length - 1;
                    for(const [u, v, phi] of sides)
                    {
                        if(cnt >= _n) break;
                        const fp = [u - 0.25, v - 0.25, u + 0.25, v + 0.25];
                        if(fp[0] < r[0] || fp[1] < r[1] || fp[2] > r[2] || fp[3] > r[3] || obs.some((_o, _i) => _i != table && C.Ov(_o, fp))) continue;
                        placed.push({ f : { kind : "chair", c : [u, v], phi, w : 0.45, d : 0.45, level : k, h : 0 }, fp, parent : _par, gone : false });
                        obs.push(C.Grow(fp, 0.05));
                        cnt++;
                    }
                };
                const low = concept.low;
                if(kind == "living")
                {
                    if(low) { Add("chest", 1.0, 0.5, 0.9, true); const t = Add("table", 1.1, 0.7, 0.38, false); if(t != null) Chairs(t, 4); }
                    else
                    {
                        Add("sofa", 1.9, 0.85, 0.85, true, facing);
                        const t = Add("table", 1.4, 0.9, 0.75, false); if(t != null) Chairs(t, 2 + (dens > 0.5 ? 2 : 0));
                    }
                    if(cname == "medieval") Add("hearth", 1.6, 0.7, 1.1, true);
                    if(chance(0.9)) Add("shelf", 1.0, 0.3, 1.8, true);
                    if(kitchenette) { Add("counter", 2.4, 0.65, 0.9, true); Add("stove", 0.65, 0.65, 0.9, true); }
                }
                else if(kind == "kitchen")
                {
                    Add("counter", 2.4, 0.65, 0.9, true); Add("stove", 0.65, 0.65, 0.9, true);
                    if(cname == "medieval") Add("hearth", 1.6, 0.7, 1.1, true);
                    if(C.Area(r) >= 8) { const t = Add("table", low ? 1.1 : 1.4, low ? 0.7 : 0.9, low ? 0.38 : 0.75, false); if(t != null) Chairs(t, 2); }
                    if(chance(0.8)) Add("shelf", 1.0, 0.3, 1.8, true);
                }
                else if(kind == "bath")
                {
                    Add("toilet", 0.4, 0.7, 0.4, true); Add("sink", 0.55, 0.45, 0.85, true);
                    if(C.Area(r) >= 4.5) Add("tub", 0.75, 1.6, 0.5, true);
                }
                else if(kind == "bed")
                {
                    Add("bed", low ? 1.1 : 1.4, 2.0, low ? 0.15 : 0.55, true);
                    Add("wardrobe", low ? 1.0 : 1.2, low ? 0.5 : 0.55, low ? 0.9 : 2.0, true);
                    if(chance(0.8)) Add("chest", 0.5, 0.4, 0.5, true);
                    if(C.Area(r) >= 16 && chance(0.8)) Add("bed", low ? 1.1 : 1.0, 2.0, low ? 0.15 : 0.55, true);
                }
                else if(kind == "storage") { for(let q = 0, m = RL.Int(2, 3); q < m; q++) Add("crate", 0.6, 0.6, 0.6, true); }
                else if(kind == "hall") { if(chance(0.7)) Add("shelf", 1.0, 0.3, 1.8, true); }
            });
            //동선 검증: 입구(위층이면 올라온 계단 끝)에서 모든 문 양쪽과 다음 계단 앞까지 닿아야 한다. 닿지 못하면 길을 막는 가구를 하나씩 치운다
            const G = C.Goals(parts, stairs, k, entry), voids = k >= 1 ? [holes[k - 1]] : [];
            const Block = (_skip : number) => placed.filter((_p, _i) => _i != _skip && !_p.gone && _p.f.kind != "chair" && _p.f.h > 0).map(_p => _p.fp);
            let left = C.Unreached(rooms, parts, Block(-1), voids, G.from, G.targets);
            for(let guard = 0; left.length > 0 && guard < 16; guard++)
            {
                let best = -1, bl = left.length;
                placed.forEach((_p, _i) =>
                {
                    if(_p.gone || _p.f.kind == "chair" || _p.f.h <= 0) return;
                    const n = C.Unreached(rooms, parts, Block(_i), voids, G.from, G.targets).length;
                    if(n < bl) { bl = n; best = _i; }
                });
                if(best < 0)
                {
                    //하나만 치워서는 안 풀리면 막힌 목표에 가장 가까운 가구를 치운다
                    const tp = G.targets[left[0]][0];
                    let bd = Infinity;
                    placed.forEach((_p, _i) =>
                    {
                        if(_p.gone || _p.f.kind == "chair" || _p.f.h <= 0) return;
                        const d = Math.hypot(_p.f.c[0] - tp[0], _p.f.c[1] - tp[1]);
                        if(d < bd) { bd = d; best = _i; }
                    });
                    if(best < 0) break;
                }
                placed[best].gone = true;
                placed.forEach(_p => { if(_p.parent == best) _p.gone = true; });
                left = C.Unreached(rooms, parts, Block(-1), voids, G.from, G.targets);
            }
            for(const p of placed)
            {
                if(p.gone) continue;
                furn.push(p.f);
                if(p.f.h > 0) BoxL(p.fp, Y, Y + p.f.h);
            }
        }

        return { floor, top, levels, y, slab, ceil, ds, ang, rooms, parts, stairs, holes, host, furn, steps, boxes, wedges : wedge, concept, entry };
    }

    static Parts(_p : IForgePlan, _b : IForgeBuildingR, _win : IForgeWin[], _glass? : IForgePart) : IForgePart[]
    {
        const C = CForgeInteriorGen, K = _p.concept, poly = _b.poly, n = poly.length, A = _p.ang;
        const F = new CForgeMeshBuf(), Wl = new CForgeMeshBuf(), Wd = new CForgeMeshBuf(), Cl = new CForgeMeshBuf(), Wh = new CForgeMeshBuf(), Dk = new CForgeMeshBuf(), St = new CForgeMeshBuf();
        const W = (_u : number, _v : number) => CForgePoly.ToWorld([[_u, _v]], _b.o, _b.u)[0];
        const WP = (_r : number[]) => CForgePoly.ToWorld([[_r[0], _r[1]], [_r[2], _r[1]], [_r[2], _r[3]], [_r[0], _r[3]]], _b.o, _b.u);
        const LB = (_buf : CForgeMeshBuf, _r : number[], _y0 : number, _y1 : number, _top : boolean = true) => { const c = W((_r[0] + _r[2]) * 0.5, (_r[1] + _r[3]) * 0.5); if(_top) CForgeShape.Box(_buf, c[0], c[1], _r[2] - _r[0], _r[3] - _r[1], _y0, _y1, A); else CForgeInteriorGen.Sides(_buf, c[0], c[1], _r[2] - _r[0], _r[3] - _r[1], _y0, _y1, A); };

        let inner = CForgePoly.Offset(poly, -0.04);
        if(inner.length != n) inner = poly;
        for(let k = 0; k < _p.levels; k++)
        {
            const y0 = _p.y[k], y1 = _p.slab[k + 1];
            let u = 0;
            for(let i = 0; i < n; i++)
            {
                const a = inner[i], c = inner[(i + 1) % n], l = Math.hypot(c[0] - a[0], c[1] - a[1]), lo = Math.hypot(poly[(i + 1) % n][0] - poly[i][0], poly[(i + 1) % n][1] - poly[i][1]) || 1, sc = l / lo;
                const holes : IForgeHole[] = [];
                if(k == 0 && i == _b.door.edge) holes.push({ s0 : (_p.ds - C.sDoorW * 0.5) * sc, s1 : (_p.ds + C.sDoorW * 0.5) * sc, y0 : y0, y1 : y0 + C.sDoorH });
                for(const w of _win) if(w.edge == i && (w.y0 + w.y1) * 0.5 > y0 && (w.y0 + w.y1) * 0.5 < y1) holes.push({ s0 : (w.s - w.w * 0.5) * sc, s1 : (w.s + w.w * 0.5) * sc, y0 : w.y0, y1 : w.y1 });
                C.Cut(Wl, a, c, u, y0, y1, holes, true);
                u += l;
            }
        }

        _p.rooms.forEach((rm, ri) =>
        {
            for(let k = 0; k < _p.levels; k++)
            {
                const Y = _p.y[k], ceil = _p.ceil[k], pieces = k < _p.levels - 1 && ri == _p.host ? C.SubRect(rm.r, _p.holes[k]) : [rm.r];
                const fl = k >= 1 && ri == _p.host ? C.SubRect(rm.r, _p.holes[k - 1]) : [rm.r];
                for(const q of fl) CForgeShape.Cap(F, WP(q), Y + 0.02);
                for(const q of pieces) CForgeShape.Cap(Wl, WP(q), ceil, false);
            }
        });

        for(let k = 0; k < _p.levels; k++)
            for(const p of _p.parts)
            {
                const y0 = _p.y[k], y1 = _p.ceil[k], t = C.sThick * 0.5;
                const Piece = (_s0 : number, _s1 : number, _ya : number, _yb : number) =>
                {
                    if(_s1 - _s0 < 0.02 || _yb - _ya < 0.02) return;
                    LB(Wl, p.axis == 0 ? [p.pos - t, _s0, p.pos + t, _s1] : [_s0, p.pos - t, _s1, p.pos + t], _ya, _yb, false);
                };
                const In =(_u : number, _v : number) => _p.rooms.some(_m => _u >= _m.r[0] && _u <= _m.r[2] && _v >= _m.r[1] && _v <= _m.r[3]);
                const lo = p.axis == 0 ? In(p.pos, p.a0 - 0.15) : In(p.a0 - 0.15, p.pos), hi = p.axis == 0 ? In(p.pos, p.a1 + 0.15) : In(p.a1 + 0.15, p.pos);
                const e0 = p.a0 + (lo ? 0.01 : -0.1), e1 = p.a1 + (hi ? -0.01 : 0.1);
                Piece(e0, p.door - 0.45, y0, y1); Piece(p.door + 0.45, e1, y0, y1); Piece(p.door - 0.45, p.door + 0.45, y0 + C.sDoorH, y1);
            }

        _p.stairs.forEach((s, j) =>
        {
            const rise = _p.y[j + 1] - _p.y[j], tread = s.run / s.n, riser = rise / s.n;
            for(let i = 0; i < s.n; i++)
            {
                const x0 = s.xs + s.dir * tread * i, x1 = x0 + s.dir * tread, a0 = Math.min(x0, x1), a1 = Math.max(x0, x1);
                LB(Wd, s.axis == 0 ? [a0, s.b0, a1, s.b0 + s.sw] : [s.b0, a0, s.b0 + s.sw, a1], _p.y[j], _p.y[j] + riser * (i + 1));
            }
            const h = _p.holes[j], y1 = _p.slab[j + 1], y0 = _p.ceil[j];
            const Face = (_u0 : number, _v0 : number, _u1 : number, _v1 : number, _nu : number, _nv : number) =>
            {
                const a = W(_u0, _v0), c = W(_u1, _v1), nw = [_nu * _b.u[0] - _nv * _b.u[1], 0, _nu * _b.u[1] + _nv * _b.u[0]];
                Wl.Quad([[a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], y1, c[1]], [a[0], y1, a[1]]], null, nw);
            };
            Face(h[0], h[1], h[0], h[3], 1, 0); Face(h[2], h[1], h[2], h[3], -1, 0); Face(h[0], h[1], h[2], h[1], 0, 1); Face(h[0], h[3], h[2], h[3], 0, -1);
        });

        {
            const n = _b.poly.length, a = _b.poly[_b.door.edge], c = _b.poly[(_b.door.edge + 1) % n], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, tx = (c[0] - a[0]) / l, tz = (c[1] - a[1]) / l;
            for(const s of _p.steps) CForgeShape.Box(St, s.c[0], s.c[1], C.sDoorW + 0.35, 0.3, s.top - 0.6, s.top, Math.atan2(tz, tx));
        }
        for(const f of _p.furn) if(f.kind != "chair" || _b.interior.anim?.chair === false) C.Furn(_b, f, _p.y[f.level], A, { Wd, Cl, Wh, Dk, St }, K.low, _p.ceil[f.level] - _p.y[f.level] - 0.02);

        const mk = (_buf : CForgeMeshBuf, _rgb : number[], _tex? : string) : IForgePart => ({ buf : _buf, rgb : _rgb, tex : _tex ?? undefined, interior : true });
        return [mk(F, K.floor, K.tex), mk(Wl, K.wall, CForgeTex.sPlaster), mk(Wd, K.wood, CForgeTex.sWood), mk(Cl, K.cloth), mk(Wh, [0.92, 0.92, 0.9]), mk(Dk, [0.18, 0.17, 0.18]), mk(St, [0.55, 0.52, 0.48], CForgeTex.sStone)].filter(_q => _q.buf.mIdx.length > 0).concat(C.Anims(_p, _b, _win, _glass));
    }

    //ForgeAction으로 움직이는 부품: 정문·방 문(경첩 축 회전)과 의자(뒤로 빼기). 메시는 피벗이 원점인 상대 좌표다.
    //회전 방향 부호(sYaw)는 엔진의 Y축 회전 방향에 맞춘 값이다
    static sYaw = 1;
    static sDoorOpen = 1.7;
    static Anims(_p : IForgePlan, _b : IForgeBuildingR, _win : IForgeWin[] = [], _glass? : IForgePart) : IForgePart[]
    {
        const C = CForgeInteriorGen, K = _p.concept, out : IForgePart[] = [], u = _b.u;
        const WV = (_a : number, _c : number) : ForgeV2 => [_a * u[0] - _c * u[1], _a * u[1] + _c * u[0]];
        const WP = (_a : number, _c : number) : ForgeV2 => CForgePoly.ToWorld([[_a, _c]], _b.o, _b.u)[0];
        const Hull = (_c : ForgeV2[], _y0 : number, _y1 : number) : number[][] =>
        {
            const n = _c.length, r : number[][] = [], B = (_i : number) => [_c[_i % n][0], _y0, _c[_i % n][1]], T = (_i : number) => [_c[_i % n][0], _y1, _c[_i % n][1]];
            for(let i = 0; i < n; i++) r.push(B(i), B(i + 1), T(i + 1), B(i), T(i + 1), T(i));
            for(let i = 1; i + 1 < n; i++) r.push(B(0), B(i + 1), B(i), T(0), T(i), T(i + 1));
            return r;
        };
        const Leaf = (_key : string, _kind : string, _pv : number[], _T : ForgeV2, _N : ForgeV2, _w : number, _h : number, _th : number, _dur : number) =>
        {
            const wood = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), ang = Math.atan2(_T[1], _T[0]);
            CForgeShape.Box(wood, _T[0] * _w * 0.5, _T[1] * _w * 0.5, _w, _th, 0, _h, ang);
            for(const sg of [1, -1]) CForgeShape.Box(dark, _T[0] * (_w - 0.12) + _N[0] * sg * (_th * 0.5 + 0.015), _T[1] * (_w - 0.12) + _N[1] * sg * (_th * 0.5 + 0.015), 0.12, 0.03, 0.95, 1.02, ang);
            const turn = (_N[0] * _T[1] - _N[1] * _T[0] > 0 ? 1 : -1) * C.sYaw, ht = 0.04;
            const corner = (_s : number, _t : number) : ForgeV2 => [_T[0] * _s + _N[0] * _t, _T[1] * _s + _N[1] * _t];
            const hull = Hull([corner(0, -ht), corner(_w, -ht), corner(_w, ht), corner(0, ht)], 0, _h);
            const anim : IForgeAnim = { key : _key, kind : _kind, pivot : _pv, axis : [0, 1, 0], angle : turn * C.sDoorOpen, slide : [0, 0, 0], dur : _dur, hull };
            out.push({ buf : wood, rgb : K.wood.map(_v => _v * 0.9), tex : CForgeTex.sPlank, anim }, { buf : dark, rgb : [0.18, 0.17, 0.18], anim });
        };

        //정문: 문 구멍 왼쪽 문설주에 경첩, 집 안쪽으로 열린다
        {
            const n = _b.poly.length, a = _b.poly[_b.door.edge], c = _b.poly[(_b.door.edge + 1) % n], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
            const T : ForgeV2 = [(c[0] - a[0]) / l, (c[1] - a[1]) / l], N : ForgeV2 = [-T[1], T[0]], dw = C.sDoorW * 0.5, s = _p.ds - dw + 0.01;
            Leaf("door", "door", [a[0] + T[0] * s + N[0] * 0.02, _p.y[0] + 0.03, a[1] + T[1] * s + N[1] * 0.02], T, N, C.sDoorW - 0.02, C.sDoorH - 0.04, 0.03, 0.9);
        }
        //방 문: 칸막이 문 자리마다 한 장. 층·칸막이 번호가 키다
        for(let k = 0; k < _p.levels; k++)
            _p.parts.forEach((q, i) =>
            {
                const T = q.axis == 0 ? WV(0, 1) : WV(1, 0), N = q.axis == 0 ? WV(1, 0) : WV(0, 1), h = q.door - 0.44, pw = q.axis == 0 ? WP(q.pos, h) : WP(h, q.pos);
                Leaf(`door:${k}:${i}`, "door", [pw[0], _p.y[k] + 0.03, pw[1]], T, N, 0.88, C.sDoorH - 0.06, 0.04, 0.8);
            });
        //창: 유리 한 장(창짝)이 창틀 안쪽에서 왼쪽 경첩으로 집 안쪽으로 열린다. 외벽에는 창 구멍이 나 있다
        _win.forEach((w, i) =>
        {
            const n = _b.poly.length, a = _b.poly[w.edge], c = _b.poly[(w.edge + 1) % n], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
            const T : ForgeV2 = [(c[0] - a[0]) / l, (c[1] - a[1]) / l], N : ForgeV2 = [-T[1], T[0]], h = w.y1 - w.y0, buf = new CForgeMeshBuf();
            CForgeShape.Box(buf, T[0] * w.w * 0.5, T[1] * w.w * 0.5, w.w, 0.02, 0, h, Math.atan2(T[1], T[0]));
            const s = w.s - w.w * 0.5, turn = (N[0] * T[1] - N[1] * T[0] > 0 ? 1 : -1) * C.sYaw;
            const anim : IForgeAnim = { key : `window:${i}`, kind : "window", pivot : [a[0] + T[0] * s - N[0] * 0.01, w.y0, a[1] + T[1] * s - N[1] * 0.01], axis : [0, 1, 0], angle : turn * 1.5, slide : [0, 0, 0], dur : 0.7, focus : [T[0] * w.w * 0.5, h * 0.5, T[1] * w.w * 0.5] };
            out.push({ buf, rgb : _glass?.rgb ?? [0.82, 0.78, 0.7], tex : _glass?.tex ?? CForgeTex.sGlass, glow : _glass?.glow ?? true, anim });
        });
        //의자: ForgeAction 값이 커질수록 식탁에서 뒤로 빠진다
        _p.furn.forEach((f, i) =>
        {
            if(f.kind != "chair") return;
            const wood = new CForgeMeshBuf(), cloth = new CForgeMeshBuf(), cw = WP(f.c[0], f.c[1]), fw = WV(Math.cos(f.phi), Math.sin(f.phi)), Y = _p.y[f.level];
            C.Furn(_b, f, Y, _p.ang, { Wd : wood, Cl : cloth, Wh : new CForgeMeshBuf(), Dk : new CForgeMeshBuf(), St : new CForgeMeshBuf() }, K.low, _p.ceil[f.level] - Y - 0.02, [cw[0], Y, cw[1]]);
            const anim : IForgeAnim = { key : `chair:${f.level}:${i}`, kind : "chair", pivot : [cw[0], Y, cw[1]], axis : [0, 0, 0], angle : 0, slide : [-fw[0] * 0.35, 0, -fw[1] * 0.35], dur : 0.6 };
            out.push({ buf : wood, rgb : K.wood, tex : CForgeTex.sWood, anim, interior : true }, { buf : cloth, rgb : K.cloth, anim, interior : true });
        });
        const AN = (_b.interior.anim ?? {}) as Record<string, boolean>;
        return out.filter(_q => _q.buf.mIdx.length > 0 && AN[_q.anim.kind] !== false);
    }

    private static Furn(_b : IForgeBuildingR, _f : IFurn, _y : number, _a : number, _B : { Wd : CForgeMeshBuf, Cl : CForgeMeshBuf, Wh : CForgeMeshBuf, Dk : CForgeMeshBuf, St : CForgeMeshBuf }, _low : boolean, _hmax : number, _org : number[] = [0, 0, 0])
    {
        const fx = Math.cos(_f.phi), fz = Math.sin(_f.phi), rx = -fz, rz = fx, ang = _a + _f.phi + Math.PI * 0.5;
        const X = (_buf : CForgeMeshBuf, _dx : number, _dz : number, _w : number, _d : number, _y0 : number, _y1 : number) =>
        {
            const w = CForgePoly.ToWorld([[_f.c[0] + rx * _dx + fx * _dz, _f.c[1] + rz * _dx + fz * _dz]], _b.o, _b.u)[0];
            if(_y0 < _hmax) CForgeShape.Box(_buf, w[0] - _org[0], w[1] - _org[2], _w, _d, _y + _y0 - _org[1], _y + Math.min(_y1, _hmax) - _org[1], ang);
        };
        const w = _f.w, d = _f.d, K = _f.kind;
        if(K == "bed")
        {
            if(_low) { X(_B.Cl, 0, 0, w, d, 0.02, 0.14); X(_B.Wh, 0, -d * 0.5 + 0.3, w * 0.6, 0.35, 0.14, 0.2); }
            else
            {
                X(_B.Wd, 0, 0, w, d, 0.12, 0.4); X(_B.Wh, 0, 0.05, w - 0.1, d - 0.2, 0.4, 0.55); X(_B.Cl, 0, 0.45, w - 0.2, d * 0.55, 0.5, 0.58);
                X(_B.Wh, 0, -d * 0.5 + 0.3, w * 0.75, 0.35, 0.55, 0.64); X(_B.Wd, 0, -d * 0.5 + 0.04, w, 0.08, 0.4, 0.95);
            }
        }
        else if(K == "sofa")
        {
            X(_B.Cl, 0, 0, w, d, 0.05, 0.45); X(_B.Cl, 0, -d * 0.5 + 0.12, w, 0.24, 0.45, 0.85);
            for(const sg of [-1, 1]) X(_B.Cl, sg * (w * 0.5 - 0.1), 0.05, 0.2, d - 0.3, 0.45, 0.62);
        }
        else if(K == "table")
        {
            const h = _low ? 0.38 : 0.75;
            X(_B.Wd, 0, 0, w, d, h - 0.05, h);
            for(const sx of [-1, 1]) for(const sz of [-1, 1]) X(_B.Wd, sx * (w * 0.5 - 0.07), sz * (d * 0.5 - 0.07), 0.08, 0.08, 0, h - 0.05);
        }
        else if(K == "chair")
        {
            if(_low) X(_B.Cl, 0, 0, 0.5, 0.5, 0, 0.06);
            else
            {
                X(_B.Wd, 0, 0, 0.45, 0.45, 0.42, 0.47); X(_B.Wd, 0, -0.2, 0.45, 0.05, 0.47, 0.9);
                for(const sx of [-1, 1]) for(const sz of [-1, 1]) X(_B.Wd, sx * 0.19, sz * 0.19, 0.05, 0.05, 0, 0.42);
            }
        }
        else if(K == "wardrobe") { X(_B.Wd, 0, 0, w, d, 0, _low ? 0.9 : 2.0); X(_B.Dk, 0, d * 0.5 + 0.005, 0.03, 0.01, 0.4, _low ? 0.7 : 1.5); }
        else if(K == "chest") { X(_B.Wd, 0, 0, w, d, 0, w > 0.9 ? 0.9 : 0.5); X(_B.Dk, 0, d * 0.5 + 0.005, 0.12, 0.02, w > 0.9 ? 0.6 : 0.3, w > 0.9 ? 0.68 : 0.38); }
        else if(K == "shelf")
        {
            X(_B.Wd, 0, 0, w, d, 0, 1.8);
            for(let q = 0; q < 4; q++) X(_B.Dk, 0, d * 0.5 + 0.004, w - 0.1, 0.01, 0.35 + q * 0.4, 0.37 + q * 0.4);
        }
        else if(K == "counter")
        {
            X(_B.Wd, 0, 0, w, d, 0, 0.86); X(_B.Wh, 0, 0, w + 0.02, d + 0.02, 0.86, 0.9); X(_B.Dk, -w * 0.25, 0, 0.5, 0.4, 0.9, 0.915); X(_B.Dk, -w * 0.25, -0.15, 0.04, 0.04, 0.9, 1.05);
        }
        else if(K == "stove")
        {
            X(_B.Dk, 0, 0, w, d, 0, 0.88); X(_B.Wh, 0, d * 0.5 + 0.005, w - 0.1, 0.01, 0.15, 0.55);
            for(const sx of [-1, 1]) for(const sz of [-1, 1]) X(_B.Wh, sx * 0.15, sz * 0.15, 0.14, 0.14, 0.88, 0.9);
        }
        else if(K == "hearth") { X(_B.St, 0, 0, w, d, 0, 1.1); X(_B.Dk, 0, d * 0.5 + 0.005, w * 0.5, 0.02, 0.1, 0.6); X(_B.St, 0, -d * 0.5 + 0.2, w * 0.5, 0.4, 1.1, 2.4); }
        else if(K == "toilet") { X(_B.Wh, 0, 0.1, 0.38, 0.5, 0, 0.4); X(_B.Wh, 0, -0.28, 0.38, 0.18, 0, 0.8); }
        else if(K == "sink") { X(_B.Wh, 0, -0.05, 0.2, 0.2, 0, 0.7); X(_B.Wh, 0, 0, w, d, 0.7, 0.85); X(_B.Dk, 0, -0.15, 0.04, 0.04, 0.85, 1.0); }
        else if(K == "tub") { X(_B.Wh, 0, 0, w, d, 0, 0.5); X(_B.Dk, 0, 0, w - 0.12, d - 0.12, 0.505, 0.52); }
        else if(K == "crate") X(_B.Wd, 0, 0, w, d, 0, 0.6);
    }
}
